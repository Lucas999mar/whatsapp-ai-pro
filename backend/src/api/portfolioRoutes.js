const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getSupabase } = require('../db/supabase');
const { authMiddleware } = require('./auth');

// Diretório local para fallback quando tabelas ainda não existirem no Supabase
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) { }
}

function getLocalDataPath(tenantId) {
    const safeTenant = tenantId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(DATA_DIR, `portfolio_${safeTenant}.json`);
}

function readLocalData(tenantId) {
    const file = getLocalDataPath(tenantId);
    if (!fs.existsSync(file)) {
        // Dados iniciais de boas-vindas
        return {
            niches: [
                { id: 'niche_1', name: 'Saúde & Clínicas', description: 'Médicos, dentistas, clínicas e consultórios', icon: 'HeartPulse', created_at: new Date().toISOString() },
                { id: 'niche_2', name: 'Imobiliárias & Corretores', description: 'Venda e locação de imóveis de médio e alto padrão', icon: 'Building', created_at: new Date().toISOString() },
                { id: 'niche_3', name: 'E-commerce & Varejo', description: 'Lojas virtuais, moda, cosméticos e produtos físicos', icon: 'ShoppingBag', created_at: new Date().toISOString() },
                { id: 'niche_4', name: 'Advocacia & Serviços', description: 'Escritórios jurídicos, contabilidade e consultorias', icon: 'Scale', created_at: new Date().toISOString() }
            ],
            services: [
                { id: 'serv_1', name: 'Automação de WhatsApp com IA', category: 'Automação', description: 'Atendimento inteligente 24/7, qualificação de leads e agendamentos automáticos.', price_estimate: 1500, created_at: new Date().toISOString() },
                { id: 'serv_2', name: 'Gestão de Tráfego Pago (Meta & Google)', category: 'Marketing', description: 'Campanhas de alta conversão focadas em geração de oportunidades.', price_estimate: 2000, created_at: new Date().toISOString() },
                { id: 'serv_3', name: 'Landing Pages & Sites de Alta Conversão', category: 'Desenvolvimento', description: 'Páginas rápidas, responsivas e otimizadas para conversão.', price_estimate: 1800, created_at: new Date().toISOString() },
                { id: 'serv_4', name: 'CRM & Funil de Vendas Automatizado', category: 'Vendas', description: 'Organização do time comercial com pipeline Kanban e lembretes automáticos.', price_estimate: 1200, created_at: new Date().toISOString() }
            ],
            items: [],
            proposals: []
        };
    }
    try {
        const raw = fs.readFileSync(file, 'utf8');
        return JSON.parse(raw);
    } catch {
        return { niches: [], services: [], items: [], proposals: [] };
    }
}

function saveLocalData(tenantId, data) {
    const file = getLocalDataPath(tenantId);
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error('Erro ao salvar local portfolio data:', e);
    }
}

function decodeShareToken(token) {
    try {
        return Buffer.from(token, 'base64url').toString('utf8');
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
// 1. NICHOS DE ATUAÇÃO CRUD
// ─────────────────────────────────────────────────────────────

// Listar nichos
router.get('/niches', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('portfolio_niches')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return res.json(data || []);
    } catch (err) {
        // Fallback local se a tabela não existir
        const local = readLocalData(tenantId);
        return res.json(local.niches || []);
    }
});

// Criar nicho
router.post('/niches', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    const { name, description, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome do nicho é obrigatório' });

    const newNiche = {
        id: crypto.randomUUID ? crypto.randomUUID() : `niche_${Date.now()}`,
        tenant_id: tenantId,
        name,
        description: description || '',
        icon: icon || 'Briefcase',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('portfolio_niches')
            .insert(newNiche)
            .select()
            .single();

        if (error) throw error;
        return res.json(data);
    } catch (err) {
        // Fallback local
        const local = readLocalData(tenantId);
        local.niches.unshift(newNiche);
        saveLocalData(tenantId, local);
        return res.json(newNiche);
    }
});

// Atualizar nicho
router.put('/niches/:id', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    const { id } = req.params;
    const { name, description, icon } = req.body;

    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('portfolio_niches')
            .update({ name, description, icon, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error) throw error;
        return res.json(data);
    } catch (err) {
        const local = readLocalData(tenantId);
        const idx = local.niches.findIndex(n => n.id === id);
        if (idx >= 0) {
            local.niches[idx] = { ...local.niches[idx], name, description, icon, updated_at: new Date().toISOString() };
            saveLocalData(tenantId, local);
            return res.json(local.niches[idx]);
        }
        return res.status(404).json({ error: 'Nicho não encontrado' });
    }
});

// Excluir nicho
router.delete('/niches/:id', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    const { id } = req.params;

    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from('portfolio_niches')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return res.json({ success: true });
    } catch (err) {
        const local = readLocalData(tenantId);
        local.niches = local.niches.filter(n => n.id !== id);
        saveLocalData(tenantId, local);
        return res.json({ success: true });
    }
});

// ─────────────────────────────────────────────────────────────
// 2. SERVIÇOS PRESTADOS CRUD
// ─────────────────────────────────────────────────────────────

// Listar serviços
router.get('/services', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('portfolio_services')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return res.json(data || []);
    } catch (err) {
        const local = readLocalData(tenantId);
        return res.json(local.services || []);
    }
});

// Criar serviço
router.post('/services', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    const { name, category, description, price_estimate, deliverables } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome do serviço é obrigatório' });

    const newService = {
        id: crypto.randomUUID ? crypto.randomUUID() : `serv_${Date.now()}`,
        tenant_id: tenantId,
        name,
        category: category || 'Geral',
        description: description || '',
        price_estimate: parseFloat(price_estimate) || 0,
        deliverables: deliverables || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('portfolio_services')
            .insert(newService)
            .select()
            .single();

        if (error) throw error;
        return res.json(data);
    } catch (err) {
        const local = readLocalData(tenantId);
        local.services.unshift(newService);
        saveLocalData(tenantId, local);
        return res.json(newService);
    }
});

// Atualizar serviço
router.put('/services/:id', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    const { id } = req.params;
    const { name, category, description, price_estimate, deliverables } = req.body;

    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('portfolio_services')
            .update({
                name,
                category,
                description,
                price_estimate: parseFloat(price_estimate) || 0,
                deliverables: deliverables || [],
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error) throw error;
        return res.json(data);
    } catch (err) {
        const local = readLocalData(tenantId);
        const idx = local.services.findIndex(s => s.id === id);
        if (idx >= 0) {
            local.services[idx] = {
                ...local.services[idx],
                name,
                category,
                description,
                price_estimate: parseFloat(price_estimate) || 0,
                deliverables: deliverables || [],
                updated_at: new Date().toISOString()
            };
            saveLocalData(tenantId, local);
            return res.json(local.services[idx]);
        }
        return res.status(404).json({ error: 'Serviço não encontrado' });
    }
});

// Excluir serviço
router.delete('/services/:id', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    const { id } = req.params;

    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from('portfolio_services')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return res.json({ success: true });
    } catch (err) {
        const local = readLocalData(tenantId);
        local.services = local.services.filter(s => s.id !== id);
        saveLocalData(tenantId, local);
        return res.json({ success: true });
    }
});

// ─────────────────────────────────────────────────────────────
// 3. ITENS DE PORTFÓLIO (CASES, FOTOS & VÍDEOS)
// ─────────────────────────────────────────────────────────────

// Listar itens de portfólio
router.get('/items', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    const { niche, service } = req.query;

    try {
        const supabase = getSupabase();
        let query = supabase
            .from('portfolio_items')
            .select('*')
            .eq('tenant_id', tenantId);

        if (niche) query = query.eq('niche_name', niche);
        if (service) query = query.eq('service_name', service);

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return res.json(data || []);
    } catch (err) {
        const local = readLocalData(tenantId);
        let items = local.items || [];
        if (niche) items = items.filter(i => i.niche_name === niche || i.niche_id === niche);
        if (service) items = items.filter(i => i.service_name === service || i.service_id === service);
        return res.json(items);
    }
});

// Criar item de portfólio
router.post('/items', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    const {
        title,
        client_name,
        niche_id,
        niche_name,
        service_id,
        service_name,
        description,
        media,
        results_metric,
        testimonial,
        tags,
        featured
    } = req.body;

    if (!title) return res.status(400).json({ error: 'Título do trabalho é obrigatório' });

    const newItem = {
        id: crypto.randomUUID ? crypto.randomUUID() : `item_${Date.now()}`,
        tenant_id: tenantId,
        title,
        client_name: client_name || '',
        niche_id: niche_id || null,
        niche_name: niche_name || '',
        service_id: service_id || null,
        service_name: service_name || '',
        description: description || '',
        media: Array.isArray(media) ? media : [],
        results_metric: results_metric || '',
        testimonial: testimonial || '',
        tags: Array.isArray(tags) ? tags : [],
        featured: Boolean(featured),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('portfolio_items')
            .insert(newItem)
            .select()
            .single();

        if (error) throw error;
        return res.json(data);
    } catch (err) {
        const local = readLocalData(tenantId);
        local.items.unshift(newItem);
        saveLocalData(tenantId, local);
        return res.json(newItem);
    }
});

// Atualizar item de portfólio
router.put('/items/:id', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    const { id } = req.params;
    const payload = req.body;

    const updateData = {
        title: payload.title,
        client_name: payload.client_name,
        niche_id: payload.niche_id,
        niche_name: payload.niche_name,
        service_id: payload.service_id,
        service_name: payload.service_name,
        description: payload.description,
        media: payload.media,
        results_metric: payload.results_metric,
        testimonial: payload.testimonial,
        tags: payload.tags,
        featured: payload.featured,
        updated_at: new Date().toISOString()
    };

    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('portfolio_items')
            .update(updateData)
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error) throw error;
        return res.json(data);
    } catch (err) {
        const local = readLocalData(tenantId);
        const idx = local.items.findIndex(i => i.id === id);
        if (idx >= 0) {
            local.items[idx] = { ...local.items[idx], ...updateData };
            saveLocalData(tenantId, local);
            return res.json(local.items[idx]);
        }
        return res.status(404).json({ error: 'Item não encontrado' });
    }
});

// Excluir item de portfólio
router.delete('/items/:id', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    const { id } = req.params;

    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from('portfolio_items')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return res.json({ success: true });
    } catch (err) {
        const local = readLocalData(tenantId);
        local.items = local.items.filter(i => i.id !== id);
        saveLocalData(tenantId, local);
        return res.json({ success: true });
    }
});

// ─────────────────────────────────────────────────────────────
// 4. PROPOSTAS COMERCIAIS PERSONALIZADAS
// ─────────────────────────────────────────────────────────────

// Listar propostas
router.get('/proposals', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;

    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('portfolio_proposals')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return res.json(data || []);
    } catch (err) {
        const local = readLocalData(tenantId);
        return res.json(local.proposals || []);
    }
});

// Obter detalhes de uma proposta
router.get('/proposals/:id', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    const { id } = req.params;

    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('portfolio_proposals')
            .select('*')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .single();

        if (error) throw error;
        return res.json(data);
    } catch (err) {
        const local = readLocalData(tenantId);
        const proposal = local.proposals.find(p => p.id === id);
        if (proposal) return res.json(proposal);
        return res.status(404).json({ error: 'Proposta não encontrada' });
    }
});

// Criar proposta
router.post('/proposals', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    const {
        client_name,
        client_company,
        client_phone,
        client_email,
        title,
        niche_name,
        selected_services,
        selected_portfolio_ids,
        intro_text,
        scope_text,
        investment_value,
        payment_terms,
        timeline,
        notes
    } = req.body;

    if (!client_name) {
        return res.status(400).json({ error: 'Nome do cliente é obrigatório' });
    }

    const shareToken = crypto.randomBytes(16).toString('hex');
    const newProposal = {
        id: crypto.randomUUID ? crypto.randomUUID() : `prop_${Date.now()}`,
        tenant_id: tenantId,
        client_name,
        client_company: client_company || '',
        client_phone: client_phone || '',
        client_email: client_email || '',
        title: title || `Proposta Comercial — ${client_name}`,
        niche_name: niche_name || '',
        selected_services: Array.isArray(selected_services) ? selected_services : [],
        selected_portfolio_ids: Array.isArray(selected_portfolio_ids) ? selected_portfolio_ids : [],
        intro_text: intro_text || '',
        scope_text: scope_text || '',
        investment_value: parseFloat(investment_value) || 0,
        payment_terms: payment_terms || 'À vista ou parcelado',
        timeline: timeline || 'Imediato',
        notes: notes || '',
        status: 'sent',
        share_token: shareToken,
        views: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('portfolio_proposals')
            .insert(newProposal)
            .select()
            .single();

        if (error) throw error;
        return res.json(data);
    } catch (err) {
        const local = readLocalData(tenantId);
        local.proposals.unshift(newProposal);
        saveLocalData(tenantId, local);
        return res.json(newProposal);
    }
});

// Atualizar proposta
router.put('/proposals/:id', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    const { id } = req.params;
    const payload = req.body;

    const updateData = {
        client_name: payload.client_name,
        client_company: payload.client_company,
        client_phone: payload.client_phone,
        client_email: payload.client_email,
        title: payload.title,
        niche_name: payload.niche_name,
        selected_services: payload.selected_services,
        selected_portfolio_ids: payload.selected_portfolio_ids,
        intro_text: payload.intro_text,
        scope_text: payload.scope_text,
        investment_value: parseFloat(payload.investment_value) || 0,
        payment_terms: payload.payment_terms,
        timeline: payload.timeline,
        status: payload.status,
        notes: payload.notes,
        updated_at: new Date().toISOString()
    };

    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('portfolio_proposals')
            .update(updateData)
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error) throw error;
        return res.json(data);
    } catch (err) {
        const local = readLocalData(tenantId);
        const idx = local.proposals.findIndex(p => p.id === id);
        if (idx >= 0) {
            local.proposals[idx] = { ...local.proposals[idx], ...updateData };
            saveLocalData(tenantId, local);
            return res.json(local.proposals[idx]);
        }
        return res.status(404).json({ error: 'Proposta não encontrada' });
    }
});

// Excluir proposta
router.delete('/proposals/:id', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    const { id } = req.params;

    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from('portfolio_proposals')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return res.json({ success: true });
    } catch (err) {
        const local = readLocalData(tenantId);
        local.proposals = local.proposals.filter(p => p.id !== id);
        saveLocalData(tenantId, local);
        return res.json({ success: true });
    }
});

// ─────────────────────────────────────────────────────────────
// 5. COMPARTILHAMENTO & ROTAS PÚBLICAS (SEM AUTENTICAÇÃO)
// ─────────────────────────────────────────────────────────────

// Token para o portfólio geral da empresa
router.get('/share-token', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    const token = Buffer.from(tenantId, 'utf8').toString('base64url');

    let companyName = req.user.name || 'Nossa Empresa';
    let companyLogo = req.user.logo || null;
    let companyPhone = req.user.phone || '';

    try {
        const supabase = getSupabase();
        const { data } = await supabase.from('tenants').select('name, logo, whatsapp_phone').eq('id', tenantId).single();
        if (data) {
            if (data.name) companyName = data.name;
            if (data.logo) companyLogo = data.logo;
            if (data.whatsapp_phone) companyPhone = data.whatsapp_phone;
        }
    } catch { }

    return res.json({
        token,
        company_name: companyName,
        company_logo: companyLogo,
        company_phone: companyPhone
    });
});

// Rota pública: Visualização do Portfólio Geral (Qualquer cliente pode ver)
router.get('/public/showcase/:token', async (req, res) => {
    try {
        const tenantId = decodeShareToken(req.params.token);
        if (!tenantId) {
            return res.status(400).json({ error: 'Link de portfólio inválido' });
        }

        let companyName = 'Portfólio de Serviços';
        let companyLogo = null;
        let companyPhone = '';

        try {
            const supabase = getSupabase();
            const { data } = await supabase.from('tenants').select('name, logo, whatsapp_phone').eq('id', tenantId).single();
            if (data) {
                if (data.name) companyName = data.name;
                if (data.logo) companyLogo = data.logo;
                if (data.whatsapp_phone) companyPhone = data.whatsapp_phone;
            }
        } catch { }

        // Carrega dados de nichos, serviços e itens
        let niches = [];
        let services = [];
        let items = [];

        try {
            const supabase = getSupabase();
            const [nRes, sRes, iRes] = await Promise.all([
                supabase.from('portfolio_niches').select('*').eq('tenant_id', tenantId).order('name', { ascending: true }),
                supabase.from('portfolio_services').select('*').eq('tenant_id', tenantId).order('name', { ascending: true }),
                supabase.from('portfolio_items').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false })
            ]);

            niches = nRes.data || [];
            services = sRes.data || [];
            items = iRes.data || [];
        } catch {
            const local = readLocalData(tenantId);
            niches = local.niches || [];
            services = local.services || [];
            items = local.items || [];
        }

        return res.json({
            company: {
                name: companyName,
                logo: companyLogo,
                phone: companyPhone
            },
            niches,
            services,
            items
        });
    } catch (err) {
        console.error('Erro ao carregar portfólio público:', err);
        return res.status(500).json({ error: 'Erro ao carregar portfólio' });
    }
});

// Rota pública: Visualização de Proposta Comercial Personalizada com Portfólio Integrado
router.get('/public/proposal/:shareToken', async (req, res) => {
    try {
        const { shareToken } = req.params;
        let proposal = null;
        let tenantId = null;

        try {
            const supabase = getSupabase();
            const { data, error } = await supabase
                .from('portfolio_proposals')
                .select('*')
                .eq('share_token', shareToken)
                .single();

            if (!error && data) {
                proposal = data;
                tenantId = data.tenant_id;
                // Incrementa contador de visualizações
                await supabase
                    .from('portfolio_proposals')
                    .update({
                        views: (data.views || 0) + 1,
                        last_viewed_at: new Date().toISOString(),
                        status: data.status === 'sent' ? 'viewed' : data.status
                    })
                    .eq('id', data.id);
            }
        } catch { }

        // Fallback local se não encontrou no Supabase
        if (!proposal) {
            // Procura em todos os arquivos de tenants
            const files = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('portfolio_') && f.endsWith('.json'));
            for (const file of files) {
                try {
                    const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
                    const parsed = JSON.parse(raw);
                    const found = (parsed.proposals || []).find(p => p.share_token === shareToken);
                    if (found) {
                        proposal = found;
                        tenantId = found.tenant_id;
                        found.views = (found.views || 0) + 1;
                        found.last_viewed_at = new Date().toISOString();
                        if (found.status === 'sent') found.status = 'viewed';
                        fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(parsed, null, 2));
                        break;
                    }
                } catch { }
            }
        }

        if (!proposal) {
            return res.status(404).json({ error: 'Proposta comercial não encontrada ou link expirado' });
        }

        // Buscar dados da empresa emissora
        let companyName = 'Nossa Empresa';
        let companyLogo = null;
        let companyPhone = '';

        if (tenantId) {
            try {
                const supabase = getSupabase();
                const { data } = await supabase.from('tenants').select('name, logo, whatsapp_phone').eq('id', tenantId).single();
                if (data) {
                    if (data.name) companyName = data.name;
                    if (data.logo) companyLogo = data.logo;
                    if (data.whatsapp_phone) companyPhone = data.whatsapp_phone;
                }
            } catch { }
        }

        // Buscar itens de portfólio vinculados à proposta
        let portfolioItems = [];
        const selectedIds = proposal.selected_portfolio_ids || [];

        if (tenantId) {
            try {
                const supabase = getSupabase();
                if (selectedIds.length > 0) {
                    const { data } = await supabase.from('portfolio_items').select('*').in('id', selectedIds);
                    portfolioItems = data || [];
                } else if (proposal.niche_name) {
                    // Se não tiver selecionado específico, puxa os cases daquele nicho!
                    const { data } = await supabase.from('portfolio_items').select('*').eq('tenant_id', tenantId).eq('niche_name', proposal.niche_name).limit(6);
                    portfolioItems = data || [];
                }
            } catch {
                const local = readLocalData(tenantId);
                if (selectedIds.length > 0) {
                    portfolioItems = (local.items || []).filter(i => selectedIds.includes(i.id));
                } else if (proposal.niche_name) {
                    portfolioItems = (local.items || []).filter(i => i.niche_name === proposal.niche_name).slice(0, 6);
                }
            }
        }

        return res.json({
            proposal,
            portfolio_items: portfolioItems,
            company: {
                name: companyName,
                logo: companyLogo,
                phone: companyPhone
            }
        });
    } catch (err) {
        console.error('Erro ao abrir proposta pública:', err);
        return res.status(500).json({ error: 'Erro ao carregar proposta' });
    }
});

// Rota pública: Aceitar / Responder proposta
router.post('/public/proposal/:shareToken/respond', async (req, res) => {
    try {
        const { shareToken } = req.params;
        const { action, notes } = req.body; // action: 'approve' | 'message'

        const status = action === 'approve' ? 'approved' : 'viewed';

        try {
            const supabase = getSupabase();
            const { data } = await supabase
                .from('portfolio_proposals')
                .update({
                    status,
                    approved_at: action === 'approve' ? new Date().toISOString() : undefined,
                    notes: notes || undefined
                })
                .eq('share_token', shareToken)
                .select()
                .single();

            if (data) return res.json({ success: true, proposal: data });
        } catch { }

        return res.json({ success: true, message: 'Status atualizado com sucesso' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;

