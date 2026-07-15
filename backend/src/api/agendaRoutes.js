const express = require('express');
const router = express.Router();
const { getSupabase } = require('../db/supabase');
const { authMiddleware } = require('./auth');

// ── APPOINTMENTS CRUD ─────────────────────────────────────────

// 1. Listar reuniões/compromissos da empresa (filtrado por data/status se fornecido)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { date, status } = req.query;
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;

        let query = supabase
            .from('appointments')
            .select('*')
            .eq('tenant_id', tenantId);

        if (date) {
            query = query.eq('appointment_date', date);
        }
        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query.order('appointment_date', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('❌ Erro ao listar compromissos:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. Criar um novo compromisso
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { title, description, contact_name, contact_phone, appointment_date, start_time, end_time, location } = req.body;
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const creatorName = req.user.name || req.user.role || 'Usuário';

        if (!title || !appointment_date || !start_time) {
            return res.status(400).json({ error: 'Título, data e hora de início são obrigatórios' });
        }

        const insertPayload = {
            tenant_id: tenantId,
            title,
            description,
            contact_name,
            contact_phone,
            appointment_date,
            start_time,
            end_time: end_time || null,
            location,
            status: 'scheduled',
            updated_at: new Date().toISOString(),
            updated_by_name: creatorName
        };

        let { data, error } = await supabase
            .from('appointments')
            .insert(insertPayload)
            .select()
            .single();

        if (error && (error.code === '42703' || error.message.includes('column') || error.message.includes('updated_by_name'))) {
            // Fallback: se a coluna não existir no Supabase remoto do cliente, adiciona à descrição
            const fallbackPayload = { ...insertPayload };
            delete fallbackPayload.updated_by_name;
            fallbackPayload.description = (description || '') + `\n\n[Criado por: ${creatorName}]`;

            const retry = await supabase
                .from('appointments')
                .insert(fallbackPayload)
                .select()
                .single();

            if (retry.error) throw retry.error;
            data = retry.data;
        } else if (error) {
            throw error;
        }

        res.json(data);
    } catch (err) {
        console.error('❌ Erro ao criar compromisso:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 3. Atualizar um compromisso existente
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { title, description, contact_name, contact_phone, appointment_date, start_time, end_time, location, status } = req.body;
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const editorName = req.user.name || req.user.role || 'Usuário';

        // Verifica primeiro se o compromisso pertence ao tenant
        const { data: existing, error: findError } = await supabase
            .from('appointments')
            .select('id, description')
            .eq('id', req.params.id)
            .eq('tenant_id', tenantId)
            .single();

        if (findError || !existing) {
            return res.status(404).json({ error: 'Compromisso não encontrado' });
        }

        const updateData = {
            updated_at: new Date().toISOString()
        };

        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (contact_name !== undefined) updateData.contact_name = contact_name;
        if (contact_phone !== undefined) updateData.contact_phone = contact_phone;
        if (appointment_date !== undefined) updateData.appointment_date = appointment_date;
        if (start_time !== undefined) updateData.start_time = start_time;
        if (end_time !== undefined) updateData.end_time = end_time;
        if (location !== undefined) updateData.location = location;
        if (status !== undefined) updateData.status = status;

        updateData.updated_by_name = editorName;

        let { data, error } = await supabase
            .from('appointments')
            .update(updateData)
            .eq('id', req.params.id)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error && (error.code === '42703' || error.message.includes('column') || error.message.includes('updated_by_name'))) {
            // Fallback: se o banco não tem a coluna, limpa e adiciona ao final da descrição
            const fallbackUpdates = { ...updateData };
            delete fallbackUpdates.updated_by_name;

            // Remove menções antigas adicionadas no description anterior se aplicável, e concatena a nova
            let cleanDesc = description !== undefined ? description : (existing.description || '');
            cleanDesc = cleanDesc.replace(/\[(?:Criado|Atualizado) por: [^\]]+\]\s*/g, '').trim();
            fallbackUpdates.description = cleanDesc + `\n\n[Atualizado por: ${editorName}]`;

            const retry = await supabase
                .from('appointments')
                .update(fallbackUpdates)
                .eq('id', req.params.id)
                .eq('tenant_id', tenantId)
                .select()
                .single();

            if (retry.error) throw retry.error;
            data = retry.data;
        } else if (error) {
            throw error;
        }

        res.json(data);
    } catch (err) {
        console.error('❌ Erro ao atualizar compromisso:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 4. Excluir um compromisso
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;

        // Deleta garantindo o tenant_id
        const { error } = await supabase
            .from('appointments')
            .delete()
            .eq('id', req.params.id)
            .eq('tenant_id', tenantId);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Erro ao excluir compromisso:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
