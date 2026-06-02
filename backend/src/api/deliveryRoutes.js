// ══════════════════════════════════════════════════════════════
// Delivery Routes - Plataforma de Entregas (Estilo Uber)
// ══════════════════════════════════════════════════════════════
const express = require('express');
const crypto = require('crypto');
const { getSupabase } = require('../db/supabase');
const { generateToken, authMiddleware } = require('./auth');
const { emitDeliveryEvent } = require('./socketManager');

const router = express.Router();

// Helper: Gerar tracking code único (6 chars)
// Obter configurações do Super Admin (Preços Globais e Taxa)
// Nota: Em um sistema multi-tenant real, isso estaria em uma tabela 'system_config' ou no perfil do root tenant
router.get('/super-settings', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        // Buscamos as configurações do usuário logado (assumindo que o Super Admin as salva em seu perfil ou tenant)
        const { data } = await supabase.from('delivery_settings').select('*').eq('tenant_id', 'SYSTEM_GLOBAL').single();

        if (!data) {
            return res.json({
                base_price: 7.00,
                km_price: 1.50,
                system_tax: 0.20 // 20% default
            });
        }
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/super-settings', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { base_price, km_price, system_tax } = req.body;

        const { data, error } = await supabase
            .from('delivery_settings')
            .upsert({
                tenant_id: 'SYSTEM_GLOBAL',
                base_price: parseFloat(base_price),
                km_price: parseFloat(km_price),
                system_tax: parseFloat(system_tax),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Helper: Calcular Preços Globais com Divisão
async function calculateGlobalPrice(km) {
    const supabase = getSupabase();
    const { data: config } = await supabase.from('delivery_settings').select('*').eq('tenant_id', 'SYSTEM_GLOBAL').single();

    const base = config?.base_price || 7.00;
    const kmRate = config?.km_price || 1.50;
    const tax = config?.system_tax || 0.20;

    const totalPrice = parseFloat(base) + (km * parseFloat(kmRate));
    const systemFee = totalPrice * tax;
    const motoboyAmount = totalPrice - systemFee;

    return {
        total_price: +totalPrice.toFixed(2),
        system_fee: +systemFee.toFixed(2),
        motoboy_amount: +motoboyAmount.toFixed(2)
    };
}

// Helper: Calcular distância entre dois pontos em km (Haversine)
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Helper: Obter rota via OSRM (gratuito)
async function getOSRMRoute(fromLat, fromLng, toLat, toLng) {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            return {
                distance_km: +(route.distance / 1000).toFixed(2),
                duration_min: +(route.duration / 60).toFixed(1),
                geometry: route.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }))
            };
        }
        return null;
    } catch (err) {
        console.error('❌ OSRM Error:', err.message);
        return null;
    }
}

// Helper: Geocodificação via Nominatim (Gratuito) - Otimizado para endereços BR
async function geocodeAddress(address) {
    if (!address || address.trim().length < 3) return null;
    const headers = { 'User-Agent': 'WhatsAppAIPro/1.0', 'Accept-Language': 'pt-BR,pt;q=0.9' };

    console.log(`🔍 Iniciando Busca Estruturada para: "${address}"`);

    // Função interna para busca estruturada (mais precisa)
    async function tryStructured(street, city, state, postalcode) {
        try {
            let url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&limit=1`;
            if (street) url += `&street=${encodeURIComponent(street)}`;
            if (city) url += `&city=${encodeURIComponent(city)}`;
            if (state) url += `&state=${encodeURIComponent(state)}`;
            if (postalcode) url += `&postalcode=${encodeURIComponent(postalcode)}`;

            const res = await fetch(url, { headers });
            const data = await res.json();
            if (data && data.length > 0) {
                console.log(`✅ Sucesso na busca de [${street}] em [${city}]: [${data[0].lat}, ${data[0].lon}]`);
                return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            }
            return null;
        } catch (err) {
            return null;
        }
    }

    // 1. Extrair Componentes através de padrões comuns brasileiros
    // Extrai o CEP limpando caracteres não-numéricos
    const cepMatch = address.match(/(\d{5}-?\d{3})|(\d{8})/);
    let cep = cepMatch ? cepMatch[0].replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2') : null;

    // Limpar endereço para extrair rua e cidade
    let cleanAddr = address.replace(/,?\s*(\d{5}-?\d{3})|(\d{8})/g, '').trim();
    const parts = cleanAddr.split(',').map(p => p.trim());

    let street = parts[0];
    let city = "Macaé"; // Valor padrão para o contexto atual
    let state = "RJ";

    // Tentar extrair cidade/estado se houver "Cidade - UF" no texto
    const geoMatch = cleanAddr.match(/([^,-]+)\s*-\s*([A-Z]{2})/);
    if (geoMatch) {
        city = geoMatch[1].trim();
        state = geoMatch[2].trim();
    }

    // 2. TENTATIVA 1: Rua + CEP + Cidade (Máxima precisão)
    let result = await tryStructured(street, city, state, cep);
    if (result) return result;

    // 3. TENTATIVA 2: Apenas Rua + Cidade (Fallback caso o CEP falhe)
    result = await tryStructured(street, city, state, null);
    if (result) return result;

    // 4. TENTATIVA 3: Apenas o CEP (Último recurso geográfico)
    if (cep) {
        result = await tryStructured(null, city, state, cep);
        if (result) return result;
    }

    // 5. TENTATIVA 4: Busca Geral (Legado)
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=br&limit=1`;
        const res = await fetch(url, { headers });
        const data = await res.json();
        if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch (e) { }

    console.log(`❌ Falha ao localizar endereço.`);
    return null;
}

// ══════════════════════════════════════════════════════════════
// ── MOTOBOY AUTH (Auto-cadastro + Login)
// ══════════════════════════════════════════════════════════════

// 🛡️ [NOVO] Listar motoboys da empresa (para o dashboard de delivery)
router.get('/motoboys', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const { data, error } = await supabase
            .from('os_technicians')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('role', 'motoboy')
            .order('name');
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Registro público de motoboy
router.post('/motoboy/register', async (req, res) => {
    try {
        const { name, email, password, phone, vehicle_type, vehicle_plate, tenant_id } = req.body;
        if (!name || !email || !password || !tenant_id) {
            return res.status(400).json({ error: 'Nome, email, senha e código da empresa são obrigatórios' });
        }

        const supabase = getSupabase();

        // Verifica se tenant existe
        const { data: tenant } = await supabase.from('tenants').select('id, name').eq('id', tenant_id).single();
        if (!tenant) return res.status(404).json({ error: 'Código da empresa não encontrado' });

        // Verifica se email já existe
        const { data: existing } = await supabase.from('os_technicians').select('id').ilike('email', email).single();
        if (existing) return res.status(409).json({ error: 'Email já cadastrado' });

        const { data: motoboy, error } = await supabase
            .from('os_technicians')
            .insert({
                name,
                email: email.toLowerCase(),
                password,
                phone,
                vehicle_type: vehicle_type || 'moto',
                vehicle_plate,
                tenant_id,
                role: 'motoboy', // <--- IMPORTANTE
                status: 'offline',
                is_available: false,
                terms_accepted_at: new Date().toISOString(),
                color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
            })
            .select()
            .single();

        if (error) throw error;

        const token = generateToken({
            id: motoboy.id,
            name: motoboy.name,
            role: 'motoboy',
            tenant_id
        });

        res.json({
            token,
            user: { id: motoboy.id, name: motoboy.name, role: 'motoboy', tenant_id }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mudar status de disponibilidade (Online/Offline)
router.put('/motoboy/toggle-online', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data: tech } = await supabase.from('os_technicians').select('is_available').eq('id', req.user.id).single();
        const newStatus = !tech.is_available;

        await supabase.from('os_technicians').update({
            is_available: newStatus,
            status: newStatus ? 'online' : 'offline'
        }).eq('id', req.user.id);

        res.json({ is_available: newStatus });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Atualizar foto de perfil
router.put('/motoboy/profile-photo', authMiddleware, async (req, res) => {
    try {
        const { photo_url } = req.body;
        const supabase = getSupabase();
        await supabase.from('os_technicians').update({ photo_url }).eq('id', req.user.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obter perfil atual do motoboy
router.get('/motoboy/profile', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('os_technicians').select('*').eq('id', req.user.id).single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login de motoboy
router.post('/motoboy/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios' });

        const supabase = getSupabase();
        const { data: motoboy } = await supabase
            .from('os_technicians')
            .select('*')
            .ilike('email', email)
            .eq('password', password)
            .single();

        if (!motoboy) {
            // Tenta com campo 'senha'
            const { data: motoboy2 } = await supabase
                .from('os_technicians')
                .select('*')
                .ilike('email', email)
                .eq('senha', password)
                .single();

            if (!motoboy2) return res.status(401).json({ error: 'Credenciais inválidas' });

            await supabase.from('os_technicians').update({ status: 'online' }).eq('id', motoboy2.id);

            const token = generateToken({
                id: motoboy2.id,
                name: motoboy2.name,
                role: 'motoboy',
                tenant_id: motoboy2.tenant_id
            });

            return res.json({
                token,
                user: { id: motoboy2.id, name: motoboy2.name, role: 'motoboy', tenant_id: motoboy2.tenant_id, vehicle_type: motoboy2.vehicle_type }
            });
        }

        await supabase.from('os_technicians').update({ status: 'online' }).eq('id', motoboy.id);

        const token = generateToken({
            id: motoboy.id,
            name: motoboy.name,
            role: 'motoboy',
            tenant_id: motoboy.tenant_id
        });

        res.json({
            token,
            user: { id: motoboy.id, name: motoboy.name, role: 'motoboy', tenant_id: motoboy.tenant_id, vehicle_type: motoboy.vehicle_type }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle online/offline
router.put('/motoboy/toggle-online', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data: current } = await supabase.from('os_technicians').select('is_available, status').eq('id', req.user.id).single();
        if (!current) return res.status(404).json({ error: 'Motoboy não encontrado' });

        const newAvail = !current.is_available;
        await supabase.from('os_technicians').update({
            is_available: newAvail,
            status: newAvail ? 'online' : 'offline',
            updated_at: new Date().toISOString()
        }).eq('id', req.user.id);

        emitDeliveryEvent(newAvail ? 'motoboy:online' : 'motoboy:offline', {
            tenantId: req.user.tenant_id,
            motoboyId: req.user.id,
            name: req.user.name
        });

        res.json({ is_available: newAvail });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Histórico de entregas do motoboy
router.get('/motoboy/my-deliveries', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('os_tasks')
            .select('id, title, status, pickup_address, delivery_address, estimated_km, estimated_price, tracking_code, customer_name, customer_phone, created_at, delivered_at, accepted_at')
            .eq('technician_id', req.user.id)
            .in('delivery_type', ['entrega', 'coleta'])
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Stats do motoboy
router.get('/motoboy/stats', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data: deliveries } = await supabase
            .from('os_tasks')
            .select('status, estimated_km, estimated_price, actual_km')
            .eq('technician_id', req.user.id);

        const all = deliveries || [];
        const completed = all.filter(d => d.status === 'entregue' || d.status === 'concluida');

        const { data: tech } = await supabase.from('os_technicians').select('balance').eq('id', req.user.id).single();

        res.json({
            total: all.length,
            completed: completed.length,
            total_km: +(completed.reduce((s, d) => s + (d.actual_km || d.estimated_km || 0), 0)).toFixed(1),
            total_earnings: +(completed.reduce((s, d) => s + (parseFloat(d.motoboy_amount || d.estimated_price) || 0), 0)).toFixed(2),
            balance: tech?.balance || 0,
            active: all.filter(d => ['aceita', 'coletando', 'em_rota', 'em_deslocamento', 'em_execucao'].includes(d.status)).length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Atualizar foto de perfil do motoboy
router.put('/motoboy/profile-photo', authMiddleware, async (req, res) => {
    try {
        const { photo_url } = req.body;
        if (!photo_url) return res.status(400).json({ error: 'URL da foto é obrigatória' });

        const supabase = getSupabase();
        const { error } = await supabase
            .from('os_technicians')
            .update({ photo_url })
            .eq('id', req.user.id);

        if (error) throw error;
        res.json({ success: true, photo_url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DRE Detalhado do Motoboy (Filtro por período)
router.get('/motoboy/earnings', authMiddleware, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id; // Para empresa ver, mas aqui é para o motoboy logado

        let query = supabase
            .from('os_tasks')
            .select('id, title, status, estimated_price, motoboy_amount, created_at, delivered_at, customer_name')
            .eq('technician_id', req.user.id)
            .in('status', ['entregue', 'concluida']);

        if (startDate) query = query.gte('created_at', startDate);
        if (endDate) query = query.lte('created_at', endDate);

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        // Agrupamento para DRE (Usa motoboy_amount se existir, senão estimated_price para legado)
        const total = data.reduce((sum, item) => sum + (parseFloat(item.motoboy_amount || item.estimated_price) || 0), 0);
        const count = data.length;

        res.json({
            items: data.map(i => ({ ...i, display_price: i.motoboy_amount || i.estimated_price })),
            summary: {
                total: +total.toFixed(2),
                count: count,
                average: count > 0 ? +(total / count).toFixed(2) : 0
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// ── GESTÃO DE MOTOBOYS PELA EMPRESA
// ══════════════════════════════════════════════════════════════

// Editar Motoboy
router.put('/motoboy-management/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const { name, email, vehicle_type, active } = req.body;

        const updateData = { updated_at: new Date().toISOString() };
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (vehicle_type) updateData.vehicle_type = vehicle_type;
        if (active !== undefined) {
            updateData.is_available = active;
            updateData.status = active ? 'online' : 'offline';
        }

        const { data, error } = await supabase
            .from('os_technicians')
            .update(updateData)
            .eq('id', req.params.id)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Excluir Motoboy
router.delete('/motoboy-management/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;

        const { error } = await supabase
            .from('os_technicians')
            .delete()
            .eq('id', req.params.id)
            .eq('tenant_id', tenantId);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// ── DELIVERY CRUD (Empresa cria, motoboy aceita)
// ══════════════════════════════════════════════════════════════

// Criar nova entrega
router.post('/create', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const trackingCode = generateTrackingCode();

        let {
            title, description, customer_name, customer_phone,
            pickup_address, pickup_lat, pickup_lng,
            delivery_address, delivery_lat, delivery_lng,
            estimated_price, priority, delivery_type
        } = req.body;

        // Busca configurações de preço do tenant
        const { data: tenant } = await supabase
            .from('tenants')
            .select('delivery_base_price, delivery_km_price')
            .eq('id', tenantId)
            .single();

        const basePrice = tenant?.delivery_base_price || 7.00;
        const kmPrice = tenant?.delivery_km_price || 1.50;

        // Geocodificar endereços se não fornecer coordenadas
        if (pickup_address && !pickup_lat) {
            const geo = await geocodeAddress(pickup_address);
            if (geo) { pickup_lat = geo.lat; pickup_lng = geo.lng; }
        }
        if (delivery_address && !delivery_lat) {
            const geo = await geocodeAddress(delivery_address);
            if (geo) { delivery_lat = geo.lat; delivery_lng = geo.lng; }
        }

        // Calcula km estimado e rota
        let estimated_km = null;
        let route_polyline = [];

        if (pickup_lat && pickup_lng && delivery_lat && delivery_lng) {
            const route = await getOSRMRoute(pickup_lat, pickup_lng, delivery_lat, delivery_lng);
            if (route) {
                estimated_km = route.distance_km;
                route_polyline = route.geometry;
            } else {
                estimated_km = haversineKm(pickup_lat, pickup_lng, delivery_lat, delivery_lng);
            }
        }

        // Se não informar preço, calcula com base nas regras do tenant
        let split = { total_price: estimated_price || 0, motoboy_amount: 0, system_fee: 0 };

        if (estimated_km) {
            split = await calculateGlobalPrice(estimated_km);
            estimated_price = split.total_price;
        } else {
            // Se sem KM, usa preço base
            split = await calculateGlobalPrice(0);
            estimated_price = split.total_price;
        }

        const taskData = {
            tenant_id: tenantId,
            title: title || `Entrega ${trackingCode}`,
            description,
            customer_name,
            customer_phone,
            pickup_address,
            pickup_lat,
            pickup_lng,
            delivery_address,
            delivery_lat,
            delivery_lng,
            estimated_km,
            estimated_price: split.total_price,
            motoboy_amount: split.motoboy_amount,
            system_fee: split.system_fee,
            tracking_code: trackingCode,
            delivery_type: delivery_type || 'entrega',
            status: 'aguardando_motoboy',
            priority: priority || 'media',
            route_polyline: route_polyline || [],
            scheduled_date: new Date().toISOString().split('T')[0],
            scheduled_time: new Date().toTimeString().slice(0, 5)
        };

        const { data, error } = await supabase
            .from('os_tasks')
            .insert(taskData)
            .select()
            .single();

        if (error) throw error;

        // Registra evento
        await supabase.from('os_task_events').insert({
            task_id: data.id,
            event_type: 'created',
            description: `Entrega criada - Tracking: ${trackingCode}`
        });

        // Emite evento para motoboys online
        emitDeliveryEvent('delivery:new', {
            tenantId,
            delivery: data,
            trackingCode
        });

        res.json({
            ...data,
            tracking_url: `/track/${trackingCode}`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Listar entregas disponíveis (para motoboys)
router.get('/available', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id;

        const { data, error } = await supabase
            .from('os_tasks')
            // Mostramos o 'motoboy_amount' como o 'estimated_price' para o app do motoboy
            .select('id, title, pickup_address, delivery_address, estimated_km, estimated_price:motoboy_amount, customer_name, customer_phone, tracking_code, priority, created_at, pickup_lat, pickup_lng, delivery_lat, delivery_lng')
            .is('technician_id', null)
            .eq('status', 'aguardando_motoboy')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Motoboy aceita corrida
router.post('/accept/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const now = new Date().toISOString();

        // Verifica se a entrega ainda está disponível
        const { data: delivery } = await supabase
            .from('os_tasks')
            .select('*')
            .eq('id', req.params.id)
            .eq('status', 'aguardando_motoboy')
            .single();

        if (!delivery) return res.status(409).json({ error: 'Esta entrega já foi aceita por outro motoboy' });

        // Tenta calcular a rota do motoboy até a coleta
        let routePolyline = [];
        const { data: tech } = await supabase.from('os_technicians').select('lat, lng').eq('id', req.user.id).single();
        if (tech?.lat && delivery.pickup_lat) {
            const routeData = await getOSRMRoute(tech.lat, tech.lng, delivery.pickup_lat, delivery.pickup_lng);
            if (routeData) routePolyline = routeData.geometry;
        }

        const { data, error } = await supabase
            .from('os_tasks')
            .update({
                technician_id: req.user.id,
                status: 'aceita',
                accepted_at: now,
                updated_at: now,
                route_polyline: routePolyline
            })
            .eq('id', req.params.id)
            .select(`*, technician:os_technicians(id, name, phone, vehicle_type, vehicle_plate, photo_url)`)
            .single();

        if (error) throw error;

        await supabase.from('os_task_events').insert({
            task_id: req.params.id,
            event_type: 'accepted',
            description: `Motoboy ${req.user.name} aceitou a entrega`
        });

        emitDeliveryEvent('delivery:accepted', {
            tenantId: delivery.tenant_id,
            trackingCode: delivery.tracking_code,
            delivery: data,
            motoboy: { id: req.user.id, name: req.user.name }
        });

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Motoboy confirma coleta
router.post('/pickup/:id', authMiddleware, async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const supabase = getSupabase();
        const now = new Date().toISOString();

        const { data: delivery } = await supabase.from('os_tasks').select('*').eq('id', req.params.id).single();
        if (!delivery) return res.status(404).json({ error: 'Entrega não encontrada' });

        // Calcula a rota da coleta até o destino
        let routePolyline = delivery.route_polyline || [];
        if (delivery.pickup_lat && delivery.delivery_lat) {
            const routeData = await getOSRMRoute(delivery.pickup_lat, delivery.pickup_lng, delivery.delivery_lat, delivery.delivery_lng);
            if (routeData) routePolyline = routeData.geometry;
        }

        const { data, error } = await supabase
            .from('os_tasks')
            .update({
                status: 'em_rota',
                picked_up_at: now,
                checkin_at: now,
                location_at_checkin: { lat, lng },
                updated_at: now,
                route_polyline: routePolyline
            })
            .eq('id', req.params.id)
            .eq('technician_id', req.user.id)
            .select()
            .single();

        if (error) throw error;

        await supabase.from('os_task_events').insert({
            task_id: req.params.id,
            event_type: 'picked_up',
            description: 'Pedido coletado pelo motoboy',
            lat, lng
        });

        emitDeliveryEvent('delivery:status_change', {
            tenantId: data.tenant_id,
            trackingCode: data.tracking_code,
            status: 'em_rota',
            deliveryId: data.id,
            message: 'Pedido coletado! Motoboy a caminho do destino.'
        });

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Motoboy confirma entrega
router.post('/complete/:id', authMiddleware, async (req, res) => {
    try {
        const { lat, lng, notes } = req.body;
        const supabase = getSupabase();
        const now = new Date().toISOString();

        // Busca os GPS logs para calcular km reais
        const { data: delivery } = await supabase.from('os_tasks').select('*').eq('id', req.params.id).single();
        const { data: gpsLogs } = await supabase
            .from('os_gps_logs')
            .select('lat, lng')
            .eq('technician_id', req.user.id)
            .gte('created_at', delivery.accepted_at || delivery.created_at)
            .order('created_at');

        // Calcula km real percorrido pelo GPS
        let actual_km = 0;
        if (gpsLogs && gpsLogs.length > 1) {
            for (let i = 1; i < gpsLogs.length; i++) {
                actual_km += haversineKm(gpsLogs[i - 1].lat, gpsLogs[i - 1].lng, gpsLogs[i].lat, gpsLogs[i].lng);
            }
        }

        // Salva rota percorrida
        const route_polyline = (gpsLogs || []).map(p => ({ lat: p.lat, lng: p.lng }));

        const { data, error } = await supabase
            .from('os_tasks')
            .update({
                status: 'entregue',
                delivered_at: now,
                checkout_at: now,
                location_at_checkout: { lat, lng },
                actual_km: +actual_km.toFixed(2),
                route_polyline,
                notes,
                updated_at: now
            })
            .eq('id', req.params.id)
            .eq('technician_id', req.user.id)
            .select()
            .single();

        if (error) throw error;

        // Incrementa contador de entregas do motoboy de forma segura
        try {
            await supabase.rpc('increment_delivery_count', { motoboy_id: req.user.id });
        } catch (rpcErr) {
            console.log('⚠️ RPC increment_delivery_count falhou, tentando fallback manual');
            const { data: tech } = await supabase.from('os_technicians').select('total_deliveries').eq('id', req.user.id).single();
            await supabase.from('os_technicians').update({ total_deliveries: (tech?.total_deliveries || 0) + 1 }).eq('id', req.user.id);
        }

        await supabase.from('os_task_events').insert({
            task_id: req.params.id,
            event_type: 'delivered',
            description: `Entrega concluída! KM real: ${actual_km.toFixed(1)}km`,
            lat, lng
        });

        // Credit logic: Adiciona o valor LÍQUIDO à carteira do motoboy
        const creditAmount = parseFloat(delivery.motoboy_amount || delivery.estimated_price || 0);

        if (creditAmount > 0) {
            await supabase.from('os_transactions').insert({
                tenant_id: delivery.tenant_id,
                technician_id: req.user.id,
                amount: creditAmount,
                type: 'credit',
                description: `Entrega concluída: #${delivery.tracking_code}`,
                task_id: delivery.id
            });

            // Atualiza saldo real na tabela do motoboy
            const { data: tech } = await supabase.from('os_technicians').select('balance').eq('id', req.user.id).single();
            await supabase.from('os_technicians')
                .update({ balance: (parseFloat(tech?.balance || 0) + creditAmount).toFixed(2) })
                .eq('id', req.user.id);
        }

        emitDeliveryEvent('delivery:status_change', {
            tenantId: data.tenant_id,
            trackingCode: data.tracking_code,
            status: 'entregue',
            deliveryId: data.id,
            actual_km: +actual_km.toFixed(2),
            message: 'Pedido entregue com sucesso!'
        });

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// ── WALLET & FINANCIAL
// ══════════════════════════════════════════════════════════════

// Extrato da carteira
router.get('/wallet/history', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('os_transactions')
            .select('*')
            .eq('technician_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Solicitar saque (Lógica simplificada)
router.post('/wallet/withdraw', authMiddleware, async (req, res) => {
    try {
        const { amount, pix_key } = req.body;
        const supabase = getSupabase();

        // Verifica saldo
        const { data: tech } = await supabase.from('os_technicians').select('balance').eq('id', req.user.id).single();
        if (!tech || tech.balance < amount) return res.status(400).json({ error: 'Saldo insuficiente' });

        const { data, error } = await supabase.from('os_transactions').insert({
            tenant_id: req.user.tenant_id,
            technician_id: req.user.id,
            amount: amount,
            type: 'withdrawal',
            description: `Solicitação de saque via PIX: ${pix_key}`
        }).select().single();

        if (error) throw error;
        res.json({ success: true, transaction: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Motoboy envia localização GPS contínua
router.post('/location', authMiddleware, async (req, res) => {
    try {
        const { lat, lng, accuracy, battery_level, trackingCode } = req.body;
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id;

        // Atualiza posição do motoboy
        await supabase.from('os_technicians').update({
            lat, lng,
            last_location_at: new Date().toISOString(),
            device_info: { accuracy, battery_level, userAgent: req.headers['user-agent'] }
        }).eq('id', req.user.id);

        // Grava no histórico GPS
        await supabase.from('os_gps_logs').insert({
            tenant_id: tenantId,
            technician_id: req.user.id,
            lat, lng, accuracy, battery_level
        });

        // Emite para admin e cliente
        emitDeliveryEvent('delivery:location', {
            tenantId,
            trackingCode,
            motoboyId: req.user.id,
            lat, lng, accuracy,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// ── TRACKING PÚBLICO (Sem autenticação)
// ══════════════════════════════════════════════════════════════

router.get('/track/:code', async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('os_tasks')
            .select(`
        id, title, status, tracking_code,
        pickup_address, delivery_address,
        pickup_lat, pickup_lng, delivery_lat, delivery_lng,
        estimated_km, actual_km, estimated_price,
        customer_name, customer_phone,
        created_at, accepted_at, picked_up_at, delivered_at,
        route_polyline,
        technician:os_technicians(id, name, phone, vehicle_type, vehicle_plate, photo_url, lat, lng, color, rating, total_deliveries)
      `)
            .eq('tracking_code', req.params.code.toUpperCase())
            .single();

        if (error || !data) return res.status(404).json({ error: 'Entrega não encontrada' });

        // Retorna sem dados sensíveis
        res.json({
            ...data,
            tenant_id: undefined
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rota de cálculo (OSRM) - por coordenadas
router.get('/route', async (req, res) => {
    try {
        const { from_lat, from_lng, to_lat, to_lng } = req.query;
        if (!from_lat || !from_lng || !to_lat || !to_lng) {
            return res.status(400).json({ error: 'Coordenadas de origem e destino obrigatórias' });
        }
        const route = await getOSRMRoute(from_lat, from_lng, to_lat, to_lng);
        if (!route) return res.status(404).json({ error: 'Rota não encontrada' });
        res.json(route);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// ── NOVA ROTA: Calcular rota A PARTIR DE ENDEREÇOS DE TEXTO
// ══════════════════════════════════════════════════════════════
router.post('/calculate-route', authMiddleware, async (req, res) => {
    try {
        const { pickup_address, delivery_address, base_price, km_price } = req.body;

        if (!pickup_address || !delivery_address) {
            return res.status(400).json({ error: 'Endereço de coleta e entrega são obrigatórios.' });
        }

        console.log(`📍 Geocodificando coleta: "${pickup_address}"`);
        const pickupGeo = await geocodeAddress(pickup_address);
        if (!pickupGeo) {
            return res.status(422).json({
                error: `Não foi possível localizar o endereço de coleta. Tente adicionar mais detalhes (cidade, estado).`,
                field: 'pickup_address'
            });
        }

        console.log(`📍 Geocodificando entrega: "${delivery_address}"`);
        const deliveryGeo = await geocodeAddress(delivery_address);
        if (!deliveryGeo) {
            return res.status(422).json({
                error: `Não foi possível localizar o endereço de entrega. Tente adicionar mais detalhes (cidade, estado).`,
                field: 'delivery_address'
            });
        }

        console.log(`📍 Coleta: ${pickupGeo.lat}, ${pickupGeo.lng} | Entrega: ${deliveryGeo.lat}, ${deliveryGeo.lng}`);

        // Calcula rota via OSRM
        const route = await getOSRMRoute(pickupGeo.lat, pickupGeo.lng, deliveryGeo.lat, deliveryGeo.lng);
        let distance_km, duration_min;

        if (route) {
            distance_km = route.distance_km;
            duration_min = route.duration_min;
        } else {
            // Fallback: Haversine (linha reta)
            distance_km = +haversineKm(pickupGeo.lat, pickupGeo.lng, deliveryGeo.lat, deliveryGeo.lng).toFixed(2);
            duration_min = null;
        }

        // Calcula preço
        const bPrice = parseFloat(base_price) || 7.00;
        const kPrice = parseFloat(km_price) || 1.50;
        const estimated_price = +(distance_km * kPrice + bPrice).toFixed(2);

        res.json({
            distance_km,
            duration_min,
            estimated_price,
            pickup_coords: { lat: pickupGeo.lat, lng: pickupGeo.lng },
            delivery_coords: { lat: deliveryGeo.lat, lng: deliveryGeo.lng },
            route_geometry: route?.geometry || []
        });
    } catch (err) {
        console.error('❌ calculate-route error:', err);
        res.status(500).json({ error: 'Erro interno ao calcular a rota.' });
    }
});

// Dashboard stats de delivery (admin)
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const today = new Date().toISOString().split('T')[0];

        const [allRes, todayRes, motoboyRes] = await Promise.all([
            supabase.from('os_tasks').select('id, status, estimated_km, actual_km, estimated_price, delivery_type').eq('tenant_id', tenantId).not('delivery_type', 'is', null),
            supabase.from('os_tasks').select('id, status').eq('tenant_id', tenantId).eq('scheduled_date', today).not('delivery_type', 'is', null),
            supabase.from('os_technicians').select('id, status, is_available').eq('tenant_id', tenantId).eq('role', 'motoboy')
        ]);

        const all = allRes.data || [];
        const todayD = todayRes.data || [];
        const motoboys = motoboyRes.data || [];
        const completed = all.filter(d => d.status === 'entregue' || d.status === 'concluida');

        res.json({
            total_deliveries: all.length,
            awaiting: all.filter(d => d.status === 'aguardando_motoboy').length,
            in_progress: all.filter(d => ['aceita', 'coletando', 'em_rota', 'em_deslocamento'].includes(d.status)).length,
            completed: completed.length,
            today_total: todayD.length,
            today_completed: todayD.filter(d => d.status === 'entregue' || d.status === 'concluida').length,
            total_km: +(completed.reduce((s, d) => s + (d.actual_km || d.estimated_km || 0), 0)).toFixed(1),
            // total_revenue removido por segurança do proprietário do sistema
            motoboys_online: motoboys.filter(m => m.is_available).length,
            motoboys_total: motoboys.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Relatórios de faturamento e desempenho
router.get('/reports', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const { period } = req.query; // 'day', 'week', 'month'

        let gteDate = new Date();
        if (period === 'week') gteDate.setDate(gteDate.getDate() - 7);
        else if (period === 'month') gteDate.setMonth(gteDate.getMonth() - 1);
        else gteDate.setHours(0, 0, 0, 0); // hoje

        const { data: deliveries, error } = await supabase
            .from('os_tasks')
            .select(`
                *,
                technician:os_technicians(id, name)
            `)
            .eq('tenant_id', tenantId)
            .eq('delivery_type', 'entrega')
            .gte('created_at', gteDate.toISOString());

        if (error) throw error;

        const stats = {
            total_count: deliveries.length,
            completed_count: deliveries.filter(d => d.status === 'entregue').length,
            canceled_count: deliveries.filter(d => d.status === 'cancelada').length,
            by_motoboy: {},
            daily_count: {}
        };

        deliveries.forEach(d => {
            if (d.status === 'entregue' && d.technician) {
                const name = d.technician.name;
                stats.by_motoboy[name] = (stats.by_motoboy[name] || 0) + 1; // Unidades de entrega, não R$
            }
            const date = d.created_at.split('T')[0];
            stats.daily_count[date] = (stats.daily_count[date] || 0) + 1;
        });

        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
