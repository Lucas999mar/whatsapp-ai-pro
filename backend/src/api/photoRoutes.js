const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const { getSupabase } = require('../db/supabase');
const { composePhoto, analyzeTemplateScene, saveComposedImage, removeVoterBackground } = require('../ai/photoComposer');

const router = express.Router();

// Multer config para upload de imagens
const upload = multer({
    dest: config.uploadsDir || './uploads',
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Formato de imagem não suportado. Use JPG, PNG ou WebP.'));
        }
    }
});

// Auth middleware (usa o mesmo do sistema principal)
const { authMiddleware } = require('./auth');
const requireAuth = authMiddleware;

// ═══════════════════════════════════════════════════════════════
// ROTAS ADMIN (autenticadas) — Gerenciamento de Campanhas
// ═══════════════════════════════════════════════════════════════

/**
 * POST /photo-campaigns
 * Cria uma nova campanha de foto com candidato
 */
router.post('/photo-campaigns', requireAuth, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.id;
        const { title, description, candidate_name, active } = req.body;

        if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

        const supabase = getSupabase();
        const campaignId = uuidv4();
        const shareToken = uuidv4().replace(/-/g, '').substring(0, 12);

        const campaign = {
            id: campaignId,
            tenant_id: tenantId,
            title,
            description: description || '',
            candidate_name: candidate_name || '',
            share_token: shareToken,
            active: active !== false,
            templates: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('photo_campaigns').insert(campaign);
        if (error) {
            // Se tabela não existe, cria automaticamente
            if (error.message.includes('relation') || error.code === '42P01') {
                console.log('ℹ️ Tabela photo_campaigns não existe, criando...');
                await ensureTablesExist(supabase);
                const { error: retryErr } = await supabase.from('photo_campaigns').insert(campaign);
                if (retryErr) throw retryErr;
            } else {
                throw error;
            }
        }

        console.log(`✅ [PhotoCampaign] Campanha criada: ${title} (${campaignId})`);
        res.json(campaign);
    } catch (err) {
        console.error('❌ [PhotoCampaign] Erro ao criar campanha:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /photo-campaigns
 * Lista campanhas do tenant
 */
router.get('/photo-campaigns', requireAuth, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.id;
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('photo_campaigns')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) {
            if (error.message.includes('relation') || error.code === '42P01') {
                return res.json([]);
            }
            throw error;
        }

        res.json(data || []);
    } catch (err) {
        console.error('❌ [PhotoCampaign] Erro ao listar:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * PUT /photo-campaigns/:id
 * Atualiza uma campanha
 */
router.put('/photo-campaigns/:id', requireAuth, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.id;
        const { title, description, candidate_name, active } = req.body;
        const supabase = getSupabase();

        const updates = { updated_at: new Date().toISOString() };
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (candidate_name !== undefined) updates.candidate_name = candidate_name;
        if (active !== undefined) updates.active = active;

        const { data, error } = await supabase
            .from('photo_campaigns')
            .update(updates)
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

/**
 * DELETE /photo-campaigns/:id
 * Remove uma campanha
 */
router.delete('/photo-campaigns/:id', requireAuth, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.id;
        const supabase = getSupabase();

        // Remove submissions associadas
        await supabase.from('photo_submissions').delete().eq('campaign_id', req.params.id);

        // Remove campanha
        const { error } = await supabase
            .from('photo_campaigns')
            .delete()
            .eq('id', req.params.id)
            .eq('tenant_id', tenantId);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// UPLOAD DE TEMPLATES (imagens do candidato)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /photo-campaigns/:id/templates
 * Upload de uma imagem template (foto do candidato)
 */
router.post('/photo-campaigns/:id/templates', requireAuth, upload.single('template'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.id;
        const campaignId = req.params.id;

        if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });

        const supabase = getSupabase();

        // Verificar que a campanha pertence ao tenant
        const { data: campaign, error: campErr } = await supabase
            .from('photo_campaigns')
            .select('*')
            .eq('id', campaignId)
            .eq('tenant_id', tenantId)
            .single();

        if (campErr || !campaign) {
            if (req.file) try { fs.unlinkSync(req.file.path); } catch { }
            return res.status(404).json({ error: 'Campanha não encontrada' });
        }

        // Upload para Supabase Storage
        const fileBuffer = fs.readFileSync(req.file.path);
        const ext = path.extname(req.file.originalname) || '.png';
        const fileName = `photo_campaigns/${campaignId}/templates/${uuidv4()}${ext}`;

        const { error: uploadErr } = await supabase.storage
            .from('knowledge-files')
            .upload(fileName, fileBuffer, {
                contentType: req.file.mimetype,
                upsert: true,
            });

        // Cleanup temp
        try { fs.unlinkSync(req.file.path); } catch { }

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from('knowledge-files').getPublicUrl(fileName);
        const templateUrl = urlData.publicUrl;

        // Analisar cena do template via Vision (assíncrono)
        let sceneAnalysis = null;
        try {
            const base64 = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;
            const apiKey = req.body.openai_key || config.openai.apiKey;
            sceneAnalysis = await analyzeTemplateScene(base64, apiKey);
            console.log('   ✅ Análise da cena do template concluída');
        } catch (analysisErr) {
            console.log('   ⚠️ Análise da cena falhou (continuando sem):', analysisErr.message);
        }

        // Salvar template na lista de templates da campanha
        const templates = campaign.templates || [];
        const templateId = uuidv4();
        templates.push({
            id: templateId,
            url: templateUrl,
            original_name: req.file.originalname,
            scene_analysis: sceneAnalysis,
            storage_path: fileName,
            created_at: new Date().toISOString(),
        });

        const { error: updateErr } = await supabase
            .from('photo_campaigns')
            .update({ templates, updated_at: new Date().toISOString() })
            .eq('id', campaignId);

        if (updateErr) throw updateErr;

        console.log(`✅ [PhotoCampaign] Template adicionado: ${req.file.originalname} → campanha ${campaignId}`);
        res.json({
            id: templateId,
            url: templateUrl,
            scene_analysis: sceneAnalysis,
        });
    } catch (err) {
        if (req.file) try { fs.unlinkSync(req.file.path); } catch { }
        console.error('❌ [PhotoCampaign] Erro upload template:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /photo-campaigns/:id/templates/:templateId
 * Remove um template
 */
router.delete('/photo-campaigns/:id/templates/:templateId', requireAuth, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.id;
        const { id: campaignId, templateId } = req.params;
        const supabase = getSupabase();

        const { data: campaign, error } = await supabase
            .from('photo_campaigns')
            .select('*')
            .eq('id', campaignId)
            .eq('tenant_id', tenantId)
            .single();

        if (error || !campaign) return res.status(404).json({ error: 'Campanha não encontrada' });

        const templates = (campaign.templates || []).filter(t => t.id !== templateId);

        // Remove do storage
        const toRemove = (campaign.templates || []).find(t => t.id === templateId);
        if (toRemove?.storage_path) {
            await supabase.storage.from('knowledge-files').remove([toRemove.storage_path]);
        }

        await supabase
            .from('photo_campaigns')
            .update({ templates, updated_at: new Date().toISOString() })
            .eq('id', campaignId);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// ROTAS PÚBLICAS — Acesso por link compartilhado
// ═══════════════════════════════════════════════════════════════

/**
 * GET /photo-campaigns/public/:shareToken
 * Busca campanha pelo token de compartilhamento (sem auth)
 */
router.get('/photo-campaigns/public/:shareToken', async (req, res) => {
    try {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('photo_campaigns')
            .select('id, title, description, candidate_name, templates, active, share_token')
            .eq('share_token', req.params.shareToken)
            .eq('active', true)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Campanha não encontrada ou inativa' });
        }

        // Retornar dados públicos (sem tenant info)
        res.json({
            id: data.id,
            title: data.title,
            description: data.description,
            candidate_name: data.candidate_name,
            templates: (data.templates || []).map(t => ({
                id: t.id,
                url: t.url,
                original_name: t.original_name,
            })),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /photo-campaigns/public/:shareToken/remove-bg
 * Remove fundo da imagem do eleitor e retorna a URL transparente imediatamente
 */
router.post('/photo-campaigns/public/:shareToken/remove-bg', upload.single('photo'), async (req, res) => {
    try {
        const supabase = getSupabase();

        // Buscar campanha
        const { data: campaign, error: campErr } = await supabase
            .from('photo_campaigns')
            .select('*')
            .eq('share_token', req.params.shareToken)
            .eq('active', true)
            .single();

        if (campErr || !campaign) {
            if (req.file) try { fs.unlinkSync(req.file.path); } catch { }
            return res.status(404).json({ error: 'Campanha não encontrada ou inativa' });
        }

        if (!req.file) return res.status(400).json({ error: 'Nenhuma foto enviada' });

        // Extrair o buffer da imagem carregada
        const voterBuffer = fs.readFileSync(req.file.path);

        // Chamar remoção da IA
        const noBgBuffer = await removeVoterBackground(voterBuffer);

        // Upload da foto sem fundo para o storage
        const fileId = uuidv4();
        const voterFileName = `photo_campaigns/${campaign.id}/voters/nobg_${fileId}.png`;

        await supabase.storage.from('knowledge-files').upload(voterFileName, noBgBuffer, {
            contentType: 'image/png',
            upsert: true,
        });

        const { data: voterUrlData } = supabase.storage.from('knowledge-files').getPublicUrl(voterFileName);

        // Remover temporário
        try { fs.unlinkSync(req.file.path); } catch { }

        res.json({
            voter_no_bg_url: voterUrlData.publicUrl,
        });

    } catch (err) {
        if (req.file) try { fs.unlinkSync(req.file.path); } catch { }
        console.error('❌ [PhotoCampaign] Erro no remove-bg:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /photo-campaigns/public/:shareToken/submit
 * Eleitor envia sua foto para composição (com suporte a coordenadas customizadas)
 */
router.post('/photo-campaigns/public/:shareToken/submit', upload.single('photo'), async (req, res) => {
    try {
        const supabase = getSupabase();

        // Buscar campanha
        const { data: campaign, error: campErr } = await supabase
            .from('photo_campaigns')
            .select('*')
            .eq('share_token', req.params.shareToken)
            .eq('active', true)
            .single();

        if (campErr || !campaign) {
            if (req.file) try { fs.unlinkSync(req.file.path); } catch { }
            return res.status(404).json({ error: 'Campanha não encontrada ou inativa' });
        }

        const { template_id, voter_name, voter_no_bg_url, voter_x, voter_y, voter_w, voter_h, voter_mirror } = req.body;

        if (!req.file && !voter_no_bg_url) {
            return res.status(400).json({ error: 'Nenhuma foto enviada' });
        }

        if (!template_id) {
            if (req.file) try { fs.unlinkSync(req.file.path); } catch { }
            return res.status(400).json({ error: 'Selecione uma foto modelo' });
        }

        // Encontrar template selecionado
        const template = (campaign.templates || []).find(t => t.id === template_id);
        if (!template) {
            if (req.file) try { fs.unlinkSync(req.file.path); } catch { }
            return res.status(400).json({ error: 'Modelo selecionado não encontrado' });
        }

        const submissionId = uuidv4();
        let voterPhotoUrlFinal = voter_no_bg_url;
        let voterBuffer = null;

        // Se enviou arquivo físico, faz o upload tradicional
        if (req.file) {
            voterBuffer = fs.readFileSync(req.file.path);
            const ext = path.extname(req.file.originalname) || '.png';
            const voterFileName = `photo_campaigns/${campaign.id}/voters/${submissionId}${ext}`;

            await supabase.storage.from('knowledge-files').upload(voterFileName, voterBuffer, {
                contentType: req.file.mimetype, upsert: true,
            });
            const { data: voterUrlData } = supabase.storage.from('knowledge-files').getPublicUrl(voterFileName);
            voterPhotoUrlFinal = voterUrlData.publicUrl;
            try { fs.unlinkSync(req.file.path); } catch { }
        }

        // Criar registro de submission (status: processing)
        const submission = {
            id: submissionId,
            campaign_id: campaign.id,
            tenant_id: campaign.tenant_id,
            template_id,
            voter_name: voter_name || 'Anônimo',
            voter_photo_url: voterPhotoUrlFinal,
            result_url: null,
            status: 'processing',
            created_at: new Date().toISOString(),
        };

        await supabase.from('photo_submissions').insert(submission);

        // Responder imediatamente e processar em background
        res.json({
            id: submissionId,
            status: 'processing',
            message: 'Sua foto está sendo processada! Aguarde alguns instantes...',
        });

        // Montar coordenadas customizadas se enviadas
        const customCoords = (voter_x !== undefined && voter_y !== undefined) ? {
            x: Number(voter_x),
            y: Number(voter_y),
            w: Number(voter_w),
            h: Number(voter_h),
        } : null;

        const isMirror = voter_mirror === true || voter_mirror === 'true';

        // ── PROCESSAMENTO EM BACKGROUND ──────────────────────
        processComposition(
            campaign,
            template,
            voterBuffer,
            submissionId,
            voter_name || 'Anônimo',
            voterPhotoUrlFinal,
            customCoords,
            !!voter_no_bg_url,
            isMirror
        ).catch(err => {
            console.error('❌ [PhotoComposer] Erro no processamento:', err.message);
        });

    } catch (err) {
        if (req.file) try { fs.unlinkSync(req.file.path); } catch { }
        console.error('❌ [PhotoCampaign] Erro na submissão:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /photo-campaigns/public/status/:submissionId
 * Verifica o status de uma submissão (polling)
 */
router.get('/photo-campaigns/public/status/:submissionId', async (req, res) => {
    try {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('photo_submissions')
            .select('id, status, result_url, voter_name, created_at')
            .eq('id', req.params.submissionId)
            .single();

        if (error || !data) return res.status(404).json({ error: 'Submissão não encontrada' });

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /photo-campaigns/:id/submissions
 * Admin: Lista submissões de uma campanha
 */
router.get('/photo-campaigns/:id/submissions', requireAuth, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.id;
        const supabase = getSupabase();

        // Verificar ownership
        const { data: campaign } = await supabase
            .from('photo_campaigns')
            .select('id')
            .eq('id', req.params.id)
            .eq('tenant_id', tenantId)
            .single();

        if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });

        const { data, error } = await supabase
            .from('photo_submissions')
            .select('*')
            .eq('campaign_id', req.params.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// PROCESSAMENTO DE COMPOSIÇÃO (Background)
// ═══════════════════════════════════════════════════════════════

async function processComposition(
    campaign,
    template,
    voterBuffer,
    submissionId,
    voterName,
    voterPhotoUrl = null,
    customCoords = null,
    skipRemoveBg = false,
    mirror = false
) {
    const supabase = getSupabase();

    try {
        console.log(`📸 [PhotoComposer] Processando submissão ${submissionId}...`);

        let finalVoterBuffer = voterBuffer;
        if (!finalVoterBuffer && voterPhotoUrl) {
            console.log(`   📥 Baixando imagem sem fundo do eleitor: ${voterPhotoUrl}`);
            const resp = await fetch(voterPhotoUrl);
            if (!resp.ok) throw new Error(`Falha ao carregar imagem sem fundo: ${resp.status}`);
            finalVoterBuffer = Buffer.from(await resp.arrayBuffer());
        }

        if (!finalVoterBuffer) throw new Error('Não foi possível obter imagem da foto do eleitor');

        // Baixar a imagem template
        let templateBuffer;
        if (template.url) {
            const resp = await fetch(template.url);
            if (!resp.ok) throw new Error(`Erro ao baixar template: ${resp.status}`);
            templateBuffer = Buffer.from(await resp.arrayBuffer());
        }

        if (!templateBuffer) throw new Error('Não foi possível carregar o template');

        // Compor a foto
        const result = await composePhoto({
            templateBuffer,
            voterBuffer: finalVoterBuffer,
            voterPhotoUrl,
            voterName,
            sceneAnalysis: template.scene_analysis,
            templateBase64: `data:image/png;base64,${templateBuffer.toString('base64')}`,
            customCoords,
            skipRemoveBg,
            mirror,
        });

        // Salvar resultado no Storage
        const resultUrl = await saveComposedImage(result, campaign.id, submissionId);

        // Atualizar status
        await supabase
            .from('photo_submissions')
            .update({ status: 'completed', result_url: resultUrl })
            .eq('id', submissionId);

        console.log(`✅ [PhotoComposer] Submissão ${submissionId} concluída!`);
    } catch (err) {
        console.error(`❌ [PhotoComposer] Erro processando ${submissionId}:`, err.message);

        await supabase
            .from('photo_submissions')
            .update({ status: 'error', error_message: err.message })
            .eq('id', submissionId);
    }
}

// ═══════════════════════════════════════════════════════════════
// AUTO-CRIAÇÃO DE TABELAS
// ═══════════════════════════════════════════════════════════════

async function ensureTablesExist(supabase) {
    // Tenta criar via RPC ou insert test
    console.log('ℹ️ [PhotoCampaign] Criando tabelas via SQL...');

    const sql = `
    CREATE TABLE IF NOT EXISTS photo_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        candidate_name TEXT DEFAULT '',
        share_token TEXT UNIQUE NOT NULL,
        active BOOLEAN DEFAULT true,
        templates JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_photo_campaigns_tenant ON photo_campaigns(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_photo_campaigns_token ON photo_campaigns(share_token);

    CREATE TABLE IF NOT EXISTS photo_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID REFERENCES photo_campaigns(id) ON DELETE CASCADE,
        tenant_id TEXT NOT NULL,
        template_id TEXT NOT NULL,
        voter_name TEXT DEFAULT 'Anônimo',
        voter_photo_url TEXT,
        result_url TEXT,
        status TEXT DEFAULT 'processing',
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_photo_submissions_campaign ON photo_submissions(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_photo_submissions_status ON photo_submissions(status);
    `;

    try {
        await supabase.rpc('exec_sql', { sql_query: sql });
    } catch (err) {
        console.log('   ⚠️ RPC exec_sql não disponível. Crie as tabelas manualmente no Supabase Dashboard.');
        console.log('   SQL para criar:\n', sql);
    }
}

module.exports = router;
