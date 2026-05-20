const express = require('express');
const { getSupabase } = require('../db/supabase');
const { authMiddleware } = require('./auth');

const router = express.Router();

// ══════════════════════════════════════════════════════════════
// ── CLIENTES ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

router.get('/clients', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const { data, error } = await supabase
            .from('os_clients')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('name');
        if (error) throw error;
        res.json(data || []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/clients', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('os_clients')
            .insert({ ...req.body, tenant_id: req.user.id })
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/clients/import', authMiddleware, async (req, res) => {
    try {
        const { clients } = req.body;
        if (!clients || !Array.isArray(clients)) return res.status(400).json({ error: 'Array de clientes obrigatório' });

        const supabase = getSupabase();
        const preparedClients = clients.map(c => ({
            ...c,
            tenant_id: req.user.id,
            created_at: new Date().toISOString()
        }));

        const { data, error } = await supabase
            .from('os_clients')
            .insert(preparedClients)
            .select();

        if (error) throw error;
        res.json({ success: true, count: data.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/clients/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('os_clients')
            .update({ ...req.body, updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .eq('tenant_id', req.user.id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/clients/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from('os_clients')
            .delete()
            .eq('id', req.params.id)
            .eq('tenant_id', req.user.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// ── TÉCNICOS ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

router.get('/technicians', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('os_technicians')
            .select('*')
            .eq('tenant_id', req.user.id)
            .order('name');
        if (error) throw error;
        res.json(data || []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/technicians', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const techData = { ...req.body, tenant_id: req.user.id };

        console.log('👷 Tentando criar técnico:', techData);

        const { data, error } = await supabase
            .from('os_technicians')
            .insert(techData)
            .select()
            .single();

        if (error) {
            console.error('❌ Erro Supabase (Técnicos):', error);
            throw error;
        }

        res.json(data);
    } catch (err) {
        console.error('❌ Erro ao criar técnico:', err.message);
        res.status(500).json({ error: err.message, details: 'Verifique se a tabela os_technicians possui campos como email e password.' });
    }
});

router.put('/technicians/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('os_technicians')
            .update({ ...req.body, updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .eq('tenant_id', req.user.id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/technicians/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from('os_technicians')
            .delete()
            .eq('id', req.params.id)
            .eq('tenant_id', req.user.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GPS update (chamado pelo técnico via web)
router.post('/technicians/:id/location', authMiddleware, async (req, res) => {
    try {
        const { lat, lng, accuracy, battery_level } = req.body;
        const supabase = getSupabase();

        // Atualiza posição atual do técnico
        await supabase
            .from('os_technicians')
            .update({
                lat, lng,
                status: 'online',
                last_location_at: new Date().toISOString(),
                device_info: { accuracy, battery_level, userAgent: req.headers['user-agent'] }
            })
            .eq('id', req.params.id);

        // Registra no log de GPS
        await supabase
            .from('os_gps_logs')
            .insert({
                tenant_id: req.user.id,
                technician_id: req.params.id,
                lat, lng, accuracy, battery_level
            });

        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// ── TIPOS DE TAREFA ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

router.get('/task-types', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('os_task_types')
            .select('*')
            .eq('tenant_id', req.user.id)
            .order('name');
        if (error) throw error;
        res.json(data || []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/task-types', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('os_task_types')
            .insert({ ...req.body, tenant_id: req.user.id })
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/task-types/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from('os_task_types')
            .delete()
            .eq('id', req.params.id)
            .eq('tenant_id', req.user.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// ── TAREFAS / ORDENS DE SERVIÇO ──────────────────────────────
// ══════════════════════════════════════════════════════════════

router.get('/tasks', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { month, year, status } = req.query;
        let { technician_id } = req.query;

        const tenantId = req.user.tenant_id || req.user.id;

        // Se for técnico logado, só vê as dele
        if (req.user.role === 'technician') {
            technician_id = req.user.id;
        }

        let query = supabase
            .from('os_tasks')
            .select('*, client:os_clients(*), technician:os_technicians(*), task_type:os_task_types(*)')
            .eq('tenant_id', tenantId)
            .order('scheduled_date', { ascending: true })
            .order('scheduled_time', { ascending: true });

        if (month && year) {
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
            const endYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
            const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
            query = query.gte('scheduled_date', startDate).lt('scheduled_date', endDate);
        }

        if (status) query = query.eq('status', status);
        if (technician_id) query = query.eq('technician_id', technician_id);

        const { data, error } = await query;
        if (error) throw error;
        res.json(data || []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tarefas sem agendamento
router.get('/tasks/unscheduled', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('os_tasks')
            .select('*, client:os_clients(*), technician:os_technicians(*), task_type:os_task_types(*)')
            .eq('tenant_id', req.user.id)
            .is('scheduled_date', null)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/tasks', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const taskData = { ...req.body, tenant_id: req.user.id };

        const { data, error } = await supabase
            .from('os_tasks')
            .insert(taskData)
            .select('*, client:os_clients(*), technician:os_technicians(*), task_type:os_task_types(*)')
            .single();
        if (error) throw error;

        // Registra evento de criação
        await supabase.from('os_task_events').insert({
            task_id: data.id,
            event_type: 'created',
            description: 'Tarefa criada'
        });

        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('os_tasks')
            .update({ ...req.body, updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .eq('tenant_id', req.user.id)
            .select('*, client:os_clients(*), technician:os_technicians(*), task_type:os_task_types(*)')
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from('os_tasks')
            .delete()
            .eq('id', req.params.id)
            .eq('tenant_id', req.user.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── AÇÕES DA OS (Check-in / Check-out / Status) ──────────────

router.post('/tasks/:id/checkin', authMiddleware, async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const supabase = getSupabase();
        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from('os_tasks')
            .update({
                status: 'em_execucao',
                checkin_at: now,
                checkin_lat: lat,
                checkin_lng: lng,
                updated_at: now
            })
            .eq('id', req.params.id)
            .select()
            .single();
        if (error) throw error;

        await supabase.from('os_task_events').insert({
            task_id: req.params.id,
            event_type: 'checkin',
            description: 'Técnico fez check-in no local',
            lat, lng
        });

        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/tasks/:id/checkout', authMiddleware, async (req, res) => {
    try {
        const { lat, lng, notes, checklist_answers, photos } = req.body;
        const supabase = getSupabase();
        const now = new Date().toISOString();

        const updateData = {
            status: 'concluida',
            checkout_at: now,
            checkout_lat: lat,
            checkout_lng: lng,
            updated_at: now
        };
        if (notes) updateData.notes = notes;
        if (checklist_answers) updateData.checklist_answers = checklist_answers;
        if (photos) updateData.photos = photos;

        const { data, error } = await supabase
            .from('os_tasks')
            .update(updateData)
            .eq('id', req.params.id)
            .select()
            .single();
        if (error) throw error;

        await supabase.from('os_task_events').insert({
            task_id: req.params.id,
            event_type: 'checkout',
            description: 'Técnico finalizou o serviço',
            lat, lng
        });

        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/tasks/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('os_tasks')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .select()
            .single();
        if (error) throw error;

        await supabase.from('os_task_events').insert({
            task_id: req.params.id,
            event_type: 'status_change',
            description: `Status alterado para: ${status}`
        });

        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Timeline de eventos da OS
router.get('/tasks/:id/events', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('os_task_events')
            .select('*')
            .eq('task_id', req.params.id)
            .order('created_at', { ascending: true });
        if (error) throw error;
        res.json(data || []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// ── MAPA & GPS ───────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

// Posições atuais de todos os técnicos (para o mapa admin)
router.get('/map/technicians', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('os_technicians')
            .select('id, name, phone, color, status, lat, lng, last_location_at, device_info')
            .eq('tenant_id', req.user.id)
            .not('lat', 'is', null);
        if (error) throw error;
        res.json(data || []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Todas as tarefas do dia com coordenadas (para markers no mapa)
router.get('/map/tasks', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('os_tasks')
            .select('id, title, status, scheduled_time, address, lat, lng, priority, client:os_clients(name, phone), technician:os_technicians(name, color)')
            .eq('tenant_id', req.user.id)
            .eq('scheduled_date', targetDate)
            .not('lat', 'is', null);
        if (error) throw error;
        res.json(data || []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// ── DASHBOARD / STATS OS ─────────────────────────────────────
// ══════════════════════════════════════════════════════════════

router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.id;
        const today = new Date().toISOString().split('T')[0];

        const [tasksRes, clientsRes, techsRes, todayRes] = await Promise.all([
            supabase.from('os_tasks').select('id, status').eq('tenant_id', tenantId),
            supabase.from('os_clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
            supabase.from('os_technicians').select('id, status').eq('tenant_id', tenantId),
            supabase.from('os_tasks').select('id, status').eq('tenant_id', tenantId).eq('scheduled_date', today)
        ]);

        const tasks = tasksRes.data || [];
        const todayTasks = todayRes.data || [];
        const techs = techsRes.data || [];

        res.json({
            total_tasks: tasks.length,
            pending: tasks.filter(t => t.status === 'pendente').length,
            in_progress: tasks.filter(t => t.status === 'em_execucao').length,
            completed: tasks.filter(t => t.status === 'concluida').length,
            today_total: todayTasks.length,
            today_completed: todayTasks.filter(t => t.status === 'concluida').length,
            total_clients: clientsRes.count || 0,
            total_technicians: techs.length,
            online_technicians: techs.filter(t => t.status === 'online').length
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
