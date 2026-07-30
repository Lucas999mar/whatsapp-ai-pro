/**
 * ══════════════════════════════════════════════════════════════
 *  AGENT ROUTES - API REST para o Agente Autônomo
 *  
 *  POST /api/agent/run    - Dispara uma tarefa autônoma
 *  GET  /api/agent/status/:id  - Consulta o status de uma tarefa
 *  GET  /api/agent/tasks   - Lista todas as tarefas
 *  
 *  Módulo 100% isolado, plugado ao routes.js via router.use().
 * ══════════════════════════════════════════════════════════════
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const { runAgentTask, getTaskStatus, listTasks } = require('../ai/agentRunner');
const { getBotSettings, listAgents } = require('../db/repository');
const { getIO } = require('./socketManager');

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

module.exports = router;
