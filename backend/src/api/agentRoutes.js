/**
 * ══════════════════════════════════════════════════════════════
 *  AGENT ROUTES - API REST para o Agente Autônomo
 *  
 *  POST /api/agent/run              - Dispara uma tarefa autônoma
 *  GET  /api/agent/status/:id       - Consulta o status de uma tarefa
 *  GET  /api/agent/tasks            - Lista todas as tarefas
 *  GET  /api/agent/knowledge        - Lista memória do agente
 *  POST /api/agent/knowledge/upload - Upload de arquivo para memória
 *  POST /api/agent/knowledge/text   - Adiciona texto à memória
 *  DELETE /api/agent/knowledge/:id  - Remove item da memória
 *  GET  /api/agent/channels         - Status dos canais (WhatsApp, Telegram)
 *  POST /api/agent/channels/whatsapp/restart - Reconectar WhatsApp
 *  POST /api/agent/channels/telegram/connect - Conectar Telegram
 *  GET  /api/agent/tools            - Lista ferramentas disponíveis
 *  
 *  Módulo 100% isolado, plugado ao routes.js via router.use().
 * ══════════════════════════════════════════════════════════════
 */

const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const { runAgentTask, getTaskStatus, listTasks } = require('../ai/agentRunner');
const { getBotSettings, listAgents, addKnowledgeItem, listKnowledgeItems, deleteKnowledgeItem } = require('../db/repository');
const { getIO } = require('./socketManager');

// Configuração do upload para memória do agente
const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) { }
}
const upload = multer({
    dest: uploadDir,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

/**
 * POST /api/agent/run
 * Body: { prompt: string, agentId?: string }
 * 
 * Dispara uma tarefa autônoma em background.
 * Retorna imediatamente com o taskId para acompanhamento.
 */
router.post('/run', async (req, res) => {
    try {
        const { prompt, agentId } = req.body;

        if (!prompt || !prompt.trim()) {
            return res.status(400).json({ error: 'O campo "prompt" é obrigatório.' });
        }

        const tenantId = req.user?.tenant_id || req.user?.id || 'default';
        const taskId = `task_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        // Busca settings do agente para pegar credenciais de IA e Google
        let settings = {};
        let resolvedAgentId = agentId || 'default';

        try {
            settings = await getBotSettings(resolvedAgentId, tenantId) || {};
        } catch (e) {
            console.warn(`⚠️ [AgentRoute] Não foi possível buscar settings do agente: ${e.message}`);
        }

        // Se não informou agentId, tenta pegar o primeiro agente conectado
        if (!agentId) {
            try {
                const agents = await listAgents(tenantId);
                if (agents && agents.length > 0) {
                    resolvedAgentId = agents[0].id;
                    // Carrega settings do agente encontrado se ainda não tiver
                    if (!settings || Object.keys(settings).length === 0) {
                        settings = agents[0].settings || {};
                    }
                }
            } catch (e) { /* ignora */ }
        }

        // Monta contexto para as ferramentas
        const context = {
            taskId,
            agentId: resolvedAgentId,
            tenantId,
            googleCredentials: settings.google_calendar_key || null,
            googleTokens: settings.google_calendar_token || null,
            settings,
        };

        // Retorna imediatamente para o frontend
        res.json({
            success: true,
            taskId,
            message: 'Tarefa iniciada. Acompanhe o progresso em tempo real.',
        });

        // Executa em background com streaming de updates via Socket.IO
        const io = getIO();

        runAgentTask(taskId, prompt.trim(), context, (stepLog) => {
            // Emite cada passo para o frontend via WebSocket
            if (io) {
                io.emit(`agent:step:${tenantId}`, {
                    taskId,
                    step: stepLog,
                });
            }
        }).then((finalState) => {
            // Emite o resultado final
            if (io) {
                io.emit(`agent:complete:${tenantId}`, {
                    taskId,
                    status: finalState.status,
                    result: finalState.result,
                    steps: finalState.steps,
                });
            }
            console.log(`\n🤖 [Agente] Task ${taskId} finalizada: ${finalState.status}`);
        }).catch((err) => {
            console.error(`❌ [Agente] Task ${taskId} CRASH:`, err.message);
            if (io) {
                io.emit(`agent:error:${tenantId}`, {
                    taskId,
                    error: err.message,
                });
            }
        });

    } catch (err) {
        console.error('❌ [AgentRoute] Erro ao iniciar tarefa:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/agent/status/:taskId
 * Retorna o estado atual de uma tarefa específica.
 */
router.get('/status/:taskId', async (req, res) => {
    try {
        const task = await getTaskStatus(req.params.taskId);
        if (!task) {
            return res.status(404).json({ error: 'Tarefa não encontrada.' });
        }
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/agent/tasks
 * Lista todas as tarefas (histórico).
 */
router.get('/tasks', async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || req.user?.id || 'default';
        const tasks = await listTasks(tenantId);
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
//  BASE DE CONHECIMENTO / MEMÓRIA DO AGENTE
// ══════════════════════════════════════════════════════════════

/**
 * GET /api/agent/knowledge
 * Lista todos os itens da base de conhecimento/memória do agente.
 */
router.get('/knowledge', async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || req.user?.id || 'default';
        const items = await listKnowledgeItems(null, null, tenantId);
        res.json(items || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/agent/knowledge/upload
 * Upload de arquivo para a base de conhecimento do agente.
 * Suporta: PDF, TXT, DOCX, imagens, áudio.
 */
router.post('/knowledge/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

        const tenantId = req.user?.tenant_id || req.user?.id || 'default';
        const fileName = req.file.originalname;
        const fileBuffer = fs.readFileSync(req.file.path);

        // Tenta upload para Supabase Storage
        let fileUrl = null;
        try {
            const { getSupabase } = require('../db/supabase');
            const supabase = getSupabase();
            const filePath = `agent-memory/${tenantId}/${Date.now()}_${fileName}`;
            const { error: storageError } = await supabase.storage
                .from('knowledge-files')
                .upload(filePath, fileBuffer, { contentType: req.file.mimetype });

            if (!storageError) {
                fileUrl = supabase.storage.from('knowledge-files').getPublicUrl(filePath).data.publicUrl;
            }
        } catch (e) {
            console.warn('⚠️ [AgentKnowledge] Storage upload failed, continuing without URL:', e.message);
        }

        // Extrai texto do conteúdo para embedding
        let extractedContent = `Conteúdo do arquivo: ${fileName}`;

        // Para arquivos de texto, extraímos o conteúdo diretamente 
        if (req.file.mimetype === 'text/plain' || fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.csv')) {
            try {
                extractedContent = fileBuffer.toString('utf-8').substring(0, 50000);
            } catch (e) { /* ignora */ }
        }

        // Determina o tipo
        let type = 'document';
        if (req.file.mimetype.startsWith('image/')) type = 'image';
        else if (req.file.mimetype.startsWith('audio/')) type = 'audio';

        const item = await addKnowledgeItem({
            title: req.body.title || fileName,
            type,
            content: extractedContent,
            fileUrl,
            fileName,
            fileSize: req.file.size,
            agentId: 'global',
            tenantId,
        });

        // Limpa temp
        try { fs.unlinkSync(req.file.path); } catch (e) { }

        res.json({ success: true, item });
    } catch (err) {
        if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) { }
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/agent/knowledge/text
 * Adiciona um texto/nota diretamente à memória do agente.
 * Body: { title: string, content: string }
 */
router.post('/knowledge/text', async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });
        }

        const tenantId = req.user?.tenant_id || req.user?.id || 'default';

        const item = await addKnowledgeItem({
            title,
            type: 'text',
            content,
            agentId: 'global',
            tenantId,
        });

        res.json({ success: true, item });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /api/agent/knowledge/:id
 * Remove um item da memória do agente.
 */
router.delete('/knowledge/:id', async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || req.user?.id || 'default';
        await deleteKnowledgeItem(req.params.id, tenantId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
//  CANAIS DE COMUNICAÇÃO (WhatsApp QR + Telegram)
// ══════════════════════════════════════════════════════════════

/**
 * GET /api/agent/channels
 * Retorna o status dos canais WhatsApp e Telegram para este tenant.
 */
router.get('/channels', async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || req.user?.id || 'default';

        // WhatsApp status
        let whatsappAgents = [];
        try {
            const { getAgentsStatus } = require('../whatsapp/bot');
            whatsappAgents = await getAgentsStatus(tenantId);
        } catch (e) { }

        // Telegram status
        let telegramConnected = false;
        try {
            const agents = await listAgents(tenantId);
            for (const agent of agents) {
                if (agent.settings?.telegram_token) {
                    telegramConnected = true;
                    break;
                }
            }
        } catch (e) { }

        // WhatsApp QR codes
        const whatsappWithQR = [];
        try {
            const { getSupabase } = require('../db/supabase');
            const supabase = getSupabase();
            for (const agent of whatsappAgents) {
                let qrCode = null;
                if (agent.status !== 'connected') {
                    const { data } = await supabase.from('agents').select('qr_code').eq('id', agent.id).single();
                    if (data?.qr_code) {
                        qrCode = `data:image/png;base64,${data.qr_code}`;
                    }
                }
                whatsappWithQR.push({
                    ...agent,
                    qrCode,
                });
            }
        } catch (e) {
            // Fallback sem QR
            whatsappAgents.forEach(a => whatsappWithQR.push({ ...a, qrCode: null }));
        }

        res.json({
            whatsapp: whatsappWithQR,
            telegram: {
                connected: telegramConnected,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/agent/channels/whatsapp/restart
 * Reconecta o bot do WhatsApp (gera novo QR code).
 * Body: { agentId: string }
 */
router.post('/channels/whatsapp/restart', async (req, res) => {
    try {
        const { agentId } = req.body;
        if (!agentId) return res.status(400).json({ error: 'agentId é obrigatório.' });

        const { restartWhatsAppBot } = require('../whatsapp/bot');
        await restartWhatsAppBot(agentId);

        res.json({ success: true, message: 'Bot reiniciado. Aguarde o QR Code.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/agent/channels/telegram/connect
 * Conecta o bot do Telegram com um token.
 * Body: { agentId: string, token: string }
 */
router.post('/channels/telegram/connect', async (req, res) => {
    try {
        const { agentId, token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token do Telegram é obrigatório.' });

        const tenantId = req.user?.tenant_id || req.user?.id || 'default';

        // Atualiza settings do agente com o token do Telegram
        const { updateAgentSettings } = require('../whatsapp/bot');

        // Busca settings atuais
        const settings = await getBotSettings(agentId || 'default', tenantId) || {};
        await updateAgentSettings(agentId || 'default', {
            ...settings,
            telegram_token: token,
        });

        // Inicia bot do Telegram
        try {
            const { startTelegramBot } = require('../telegram/bot');
            const agents = await listAgents(tenantId);
            const agent = agents.find(a => a.id === agentId) || agents[0];
            if (agent) {
                await startTelegramBot(agent.id, token, tenantId, agent.name || 'Assistente');
            }
        } catch (e) {
            console.warn('⚠️ Telegram bot start failed:', e.message);
        }

        res.json({ success: true, message: 'Bot do Telegram conectado com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/agent/channels/telegram/disconnect
 * Desconecta o bot do Telegram.
 * Body: { agentId: string }
 */
router.post('/channels/telegram/disconnect', async (req, res) => {
    try {
        const { agentId } = req.body;
        const tenantId = req.user?.tenant_id || req.user?.id || 'default';

        const { updateAgentSettings } = require('../whatsapp/bot');
        const settings = await getBotSettings(agentId || 'default', tenantId) || {};
        delete settings.telegram_token;
        await updateAgentSettings(agentId || 'default', settings);

        res.json({ success: true, message: 'Bot do Telegram desconectado.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
//  FERRAMENTAS DISPONÍVEIS (para exibição no dashboard)
// ══════════════════════════════════════════════════════════════

/**
 * GET /api/agent/tools
 * Lista todas as ferramentas disponíveis para o agente.
 */
router.get('/tools', async (req, res) => {
    try {
        const { getToolDefinitions } = require('../ai/tools');
        const tools = getToolDefinitions();
        const formatted = tools.map(t => ({
            name: t.function.name,
            description: t.function.description,
            parameters: t.function.parameters,
        }));
        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
