const express = require('express');
const { getSupabase } = require('../db/supabase');
const { authMiddleware } = require('./auth');
const crypto = require('crypto');

const router = express.Router();

// ── PROTECTED ROUTES (AUTH REQUIRED) ──────────────────────────

// List contracts for the tenant
router.get('/', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;

        const { data, error } = await supabase
            .from('contracts')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('❌ Erro ao listar contratos:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Get a single contract details
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const { id } = req.params;

        const { data, error } = await supabase
            .from('contracts')
            .select('*')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .single();

        if (error) {
            return res.status(404).json({ error: 'Contrato não encontrado' });
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new contract
router.post('/', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const {
            title,
            content,
            file_url,
            client_name,
            client_email,
            client_document,
            status
        } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Título é obrigatório' });
        }

        const newContract = {
            tenant_id: tenantId,
            title,
            content: content || null,
            file_url: file_url || null,
            client_name: client_name || null,
            client_email: client_email || null,
            client_document: client_document || null,
            status: status || 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('contracts')
            .insert(newContract)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('❌ Erro ao criar contrato:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Update a contract metadata/content
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const { id } = req.params;
        const {
            title,
            content,
            file_url,
            client_name,
            client_email,
            client_document,
            status
        } = req.body;

        // Garante que o contrato pertence ao tenant
        const { data: existingContract, error: fetchError } = await supabase
            .from('contracts')
            .select('id, status')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .single();

        if (fetchError || !existingContract) {
            return res.status(404).json({ error: 'Contrato não encontrado' });
        }

        // Se já estiver assinado, bloqueia modificações profundas
        if (existingContract.status === 'signed' && status !== 'canceled') {
            return res.status(400).json({ error: 'Não é possível modificar um contrato que já foi assinado.' });
        }

        const updates = {
            updated_at: new Date().toISOString()
        };

        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = content;
        if (file_url !== undefined) updates.file_url = file_url;
        if (client_name !== undefined) updates.client_name = client_name;
        if (client_email !== undefined) updates.client_email = client_email;
        if (client_document !== undefined) updates.client_document = client_document;
        if (status !== undefined) updates.status = status;

        const { data, error } = await supabase
            .from('contracts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('❌ Erro ao editar contrato:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Delete a contract
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const { id } = req.params;

        const { error } = await supabase
            .from('contracts')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Erro ao deletar contrato:', err.message);
        res.status(500).json({ error: err.message });
    }
});


// ── PUBLIC ROUTES (NO AUTH REQUIRED FOR CLIENT SIGNATURE) ──────

// Get details for public signing page
router.get('/public/:id', async (req, res) => {
    try {
        const supabase = getSupabase();
        const { id } = req.params;

        const { data, error } = await supabase
            .from('contracts')
            .select('id, title, content, file_url, status, client_name, client_email, client_document, signed_at, signature_url, signed_hash, tenant_id')
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Contrato não encontrado ou indisponível.' });
        }

        // Opcional: Busca nome/logo da empresa (tenant) para expor na página pública
        let companyName = 'WhatsApp AI Pro';
        let companyLogo = null;
        try {
            const { findTenantById } = require('../db/repository');
            const tenant = await findTenantById(data.tenant_id);
            if (tenant) {
                companyName = tenant.name || companyName;
                companyLogo = tenant.logo || companyLogo;
            }
        } catch (e) {
            // Ignora erro de fetch do tenant
        }

        res.json({
            ...data,
            company_name: companyName,
            company_logo: companyLogo
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Submit signature (online signing)
router.post('/public/:id/sign', async (req, res) => {
    try {
        const supabase = getSupabase();
        const { id } = req.params;
        const { client_name, client_document, client_email, signature_data } = req.body;

        if (!client_name || !client_document || !signature_data) {
            return res.status(400).json({ error: 'Nome, documento (CPF/CNPJ) e assinatura desenhada são obrigatórios.' });
        }

        // Busca o contrato
        const { data: contract, error: findError } = await supabase
            .from('contracts')
            .select('*')
            .eq('id', id)
            .single();

        if (findError || !contract) {
            return res.status(404).json({ error: 'Contrato não encontrado.' });
        }

        if (contract.status === 'signed') {
            return res.status(400).json({ error: 'Este contrato já foi assinado.' });
        }

        if (contract.status === 'canceled') {
            return res.status(400).json({ error: 'Este contrato foi cancelado e não pode ser assinado.' });
        }

        // Processa a imagem da assinatura base64 para Buffer
        // Exemplo de formato: "data:image/png;base64,iVBORw0KGgo..."
        const base64Data = signature_data.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const fileName = `signatures/${id}_${Date.now()}.png`;

        // Sobe a imagem de assinatura para o bucket "knowledge-files" no Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('knowledge-files')
            .upload(fileName, imageBuffer, {
                contentType: 'image/png',
                upsert: true
            });

        if (uploadError) {
            console.error('❌ Erro no Storage ao enviar assinatura:', uploadError.message);
            throw new Error(`Falha ao salvar imagem de assinatura: ${uploadError.message}`);
        }

        // Pega a URL pública da assinatura
        const { data: { publicUrl } } = supabase.storage
            .from('knowledge-files')
            .getPublicUrl(fileName);

        // Gera o Hash SHA256 de Auditoria
        const signedAt = new Date().toISOString();
        const visitorIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'IP desconhecido';
        const visitorUa = req.headers['user-agent'] || 'User-Agent desconhecido';

        const rawDataToHash = `${id}|${client_name}|${client_document}|${signedAt}|${visitorIp}`;
        const signedHash = crypto
            .createHash('sha256')
            .update(rawDataToHash)
            .digest('hex')
            .toUpperCase();

        // Atualiza contrato no Supabase
        const { data: updatedContract, error: updateError } = await supabase
            .from('contracts')
            .update({
                status: 'signed',
                client_name,
                client_document,
                client_email: client_email || contract.client_email,
                signature_url: publicUrl,
                signed_at: signedAt,
                signed_ip: visitorIp,
                signed_user_agent: visitorUa,
                signed_hash: signedHash,
                updated_at: signedAt
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        res.json({
            success: true,
            message: 'Contrato assinado com sucesso!',
            contract: updatedContract
        });

    } catch (err) {
        console.error('❌ Erro ao assinar contrato:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
