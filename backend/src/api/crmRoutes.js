const express = require('express');
const router = express.Router();
const { getSupabase } = require('../db/supabase');
const { authMiddleware } = require('./auth');

// ── TICKETS (Atendimento) ──────────────────────────────────────

// Listar tickets por status
router.get('/tickets', authMiddleware, async (req, res) => {
    try {
        const { status } = req.query;
        const supabase = getSupabase();
        let query = supabase.from('crm_tickets').select('*').eq('tenant_id', req.user.tenant_id || req.user.id);
        if (status) query = query.eq('status', status);

        const { data, error } = await query.order('updated_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Metricas do CRM para o Dashboard
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('crm_tickets')
            .select('status, created_at')
            .eq('tenant_id', req.user.tenant_id || req.user.id);
        if (error) throw error;

        const stats = {
            today: data.filter(t => new Date(t.created_at).toDateString() === new Date().toDateString()).length,
            aguardando: data.filter(t => t.status === 'aguardando').length,
            atendendo: data.filter(t => t.status === 'atendendo').length,
            resolvidos: data.filter(t => t.status === 'resolvido').length
        };

        res.json(stats);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Criar ou atualizar ticket ao receber mensagem (Mock/Internal use)
router.post('/tickets/sync', authMiddleware, async (req, res) => {
    try {
        const { whatsapp_id, last_message, contact_name, contact_photo } = req.body;
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('crm_tickets')
            .upsert({
                tenant_id: req.user.tenant_id || req.user.id,
                whatsapp_id,
                last_message,
                contact_name,
                contact_photo,
                updated_at: new Date().toISOString()
            }, { onConflict: 'whatsapp_id' })
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Aceitar atendimento (Mudar para 'atendendo')
router.post('/tickets/:id/accept', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('crm_tickets')
            .update({
                status: 'atendendo',
                assigned_user_id: req.user.tenant_id || req.user.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.params.id)
            .eq('tenant_id', req.user.tenant_id || req.user.id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Encerrar atendimento
router.post('/tickets/:id/close', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('crm_tickets')
            .update({ status: 'resolvido', updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .eq('tenant_id', req.user.tenant_id || req.user.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Toggle IA (Ativar/Desativar Agente para um contato)
router.put('/tickets/:id/toggle-ai', authMiddleware, async (req, res) => {
    try {
        const { enabled } = req.body;
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('crm_tickets')
            .update({ ai_enabled: enabled, updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .eq('tenant_id', req.user.tenant_id || req.user.id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Adicionar Etiqueta ao Card/Ticket
router.post('/tickets/:id/tags', authMiddleware, async (req, res) => {
    try {
        const { tag } = req.body;
        const supabase = getSupabase();

        // Busca o card associado ao ticket (Garantindo tenant_id)
        const { data: ticket } = await supabase.from('crm_tickets')
            .select('whatsapp_id')
            .eq('id', req.params.id)
            .eq('tenant_id', req.user.tenant_id || req.user.id)
            .single();
        if (!ticket) throw new Error('Ticket não encontrado');

        const { data: card } = await supabase.from('crm_kanban_cards').select('id, tags').eq('whatsapp_id', ticket.whatsapp_id).single();

        if (card) {
            const currentTags = Array.isArray(card.tags) ? card.tags : [];
            if (!currentTags.includes(tag)) {
                await supabase.from('crm_kanban_cards').update({
                    tags: [...currentTags, tag],
                    updated_at: new Date().toISOString()
                })
                    .eq('id', card.id)
                    .eq('tenant_id', req.user.tenant_id || req.user.id);
            }
        }

        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── KANBAN ───────────────────────────────────────────────────

// Obter quadro Kanban completo
router.get('/kanban', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;

        let cols = await supabase
            .from('crm_kanban_columns')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('position');

        if (cols.error) throw cols.error;

        // Se o tenant não tiver nenhuma coluna, cria as colunas padrão para ele
        if (!cols.data || cols.data.length === 0) {
            const defaultCols = [
                { tenant_id: tenantId, title: 'Novo Lead', color: '#3b82f6', position: 0 },
                { tenant_id: tenantId, title: 'Em Qualificação', color: '#eab308', position: 1 },
                { tenant_id: tenantId, title: 'Proposta Enviada', color: '#a855f7', position: 2 },
                { tenant_id: tenantId, title: 'Concluido', color: '#25d366', position: 3 }
            ];

            const insertResult = await supabase
                .from('crm_kanban_columns')
                .insert(defaultCols)
                .select();

            if (insertResult.error) throw insertResult.error;
            cols.data = insertResult.data;
        }

        const cards = await supabase
            .from('crm_kanban_cards')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('position');

        if (cards.error) throw cards.error;

        res.json({ columns: cols.data, cards: cards.data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mover card
router.put('/kanban/cards/:id', authMiddleware, async (req, res) => {
    try {
        const { column_id, position } = req.body;
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('crm_kanban_cards')
            .update({ column_id, position, updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .eq('tenant_id', req.user.tenant_id || req.user.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Criar Lead Manual no Kanban
router.post('/kanban/cards', authMiddleware, async (req, res) => {
    try {
        const { name, whatsapp_id, column_id } = req.body;
        const supabase = getSupabase();

        // Garante que o whatsapp_id siga o padrão tenant__phone__agent
        const tenantId = req.user.tenant_id || req.user.id;
        const cleanId = whatsapp_id.includes('__') ? whatsapp_id : `${tenantId}__${whatsapp_id.replace(/\D/g, '')}@s.whatsapp.net__default`;

        // Cria o ticket primeiro
        const { data: ticket } = await supabase.from('crm_tickets').upsert({
            tenant_id: tenantId,
            whatsapp_id: cleanId,
            contact_name: name,
            status: 'aguardando'
        }, { onConflict: 'whatsapp_id' }).select().single();

        // Cria o card no Kanban
        const { data, error } = await supabase.from('crm_kanban_cards').insert({
            tenant_id: tenantId,
            column_id: column_id,
            ticket_id: ticket.id,
            whatsapp_id: cleanId,
            name: name,
            position: 0
        }).select().single();

        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
