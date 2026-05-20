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
        let query = supabase.from('crm_tickets').select('*');
        if (status) query = query.eq('status', status);

        const { data, error } = await query.order('updated_at', { ascending: false });
        if (error) throw error;
        res.json(data);
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
                assigned_user_id: req.user.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.params.id)
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
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── KANBAN ───────────────────────────────────────────────────

// Obter quadro Kanban completo
router.get('/kanban', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const [cols, cards] = await Promise.all([
            supabase.from('crm_kanban_columns').select('*').order('position'),
            supabase.from('crm_kanban_cards').select('*').order('position')
        ]);

        if (cols.error) throw cols.error;
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
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
