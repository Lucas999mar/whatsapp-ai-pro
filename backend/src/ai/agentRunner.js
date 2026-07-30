/**
 * ══════════════════════════════════════════════════════════════
 *  AGENT RUNNER - Motor ReAct do Agente Autônomo
 *  
 *  Implementa o padrão:
 *    Pensamento → Ação (tool call) → Observação → ...loop... → Conclusão
 *  
 *  O agente recebe uma tarefa em linguagem natural, decide quais
 *  ferramentas usar, executa cada uma em sequência, e reporta 
 *  o resultado final.
 *  
 *  Persiste tarefas na tabela "agent_tasks" do Supabase com 
 *  fallback transparente para memória local.
 *  
 *  IMPORTANTE: Módulo 100% isolado. Não altera nada existente.
 * ══════════════════════════════════════════════════════════════
 */

const { getToolDefinitions, executeTool } = require('./tools');
const { resolveAIConfig } = require('./pipeline');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

const MAX_STEPS = 12;       // Máximo de iterações do loop para evitar loop infinito
const MAX_RETRIES = 2;      // Retentativas em caso de erro de API

// Armazena tarefas em execução (in-memory fallback)
const runningTasks = new Map();

/**
 * Retorna o cliente Supabase de maneira segura (try/catch)
 */
function getSupabaseClient() {
    try {
        const { getSupabase } = require('../db/supabase');
        return getSupabase();
    } catch (err) {
        console.warn('⚠️ [AgentRunner] Supabase Client não disponível:', err.message);
        return null;
    }
}

/**
 * Salva ou atualiza o estado de uma tarefa no banco de dados com fallback para memória
 */
async function persistTaskState(taskState, context = {}) {
    // Salva no estado em memória primeiro
    runningTasks.set(taskState.id, taskState);

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const tenantId = context.tenantId || 'default';
    const agentId = context.agentId || 'default';

    try {
        const payload = {
            id: taskState.id,
            tenant_id: tenantId,
            agent_id: agentId,
            prompt: taskState.prompt,
            status: taskState.status,
            steps: taskState.steps, // JSONB compatível (array de objetos)
            result: taskState.result,
            error: taskState.error,
            completed_at: taskState.completedAt || null,
        };

        // Só adiciona started_at no insert
        if (taskState.startedAt && !taskState.completedAt && taskState.steps.length === 0) {
            payload.started_at = taskState.startedAt;
        }

        const { error } = await supabase
            .from('agent_tasks')
            .upsert(payload, { onConflict: 'id' });

        if (error) {
            // Ignora erro se for tabela inexistente, para manter compatibilidade
            if (error.code !== 'P0001' && !error.message.includes('relation "agent_tasks" does not exist')) {
                console.warn('⚠️ [AgentRunner] Erro ao persistir tarefa no Supabase:', error.message);
            }
        }
    } catch (e) {
        // Silencia erros de banco para manter resiliência completa
    }
}

/**
 * Gera o System Prompt do Agente Autônomo
 */
function buildAgentSystemPrompt(agentName = 'Hermes') {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return `Você é ${agentName}, um agente de IA autônomo avançado integrado ao WhatsApp AI Pro.

CAPACIDADES EXTERNAS:
- Ler e enviar e-mails via Gmail
- Verificar e criar compromissos no Google Calendar
- Enviar mensagens no WhatsApp
- Buscar informações na internet
- Consultar a base de conhecimento/memória

CAPACIDADES INTERNAS DO SISTEMA:
- Listar e consultar contratos da empresa (system_list_contracts)
- Listar e criar cards no CRM/Kanban (system_list_crm, system_create_crm_card)
- Consultar agenda de reuniões do sistema (system_list_agenda)
- Listar ordens de serviço (system_list_service_orders)
- Ver conversas recentes do WhatsApp (system_list_conversations)
- Obter estatísticas gerais do sistema (system_get_stats)
- Adicionar informações à base de conhecimento (system_add_knowledge)
- Buscar na base de conhecimento existente (search_knowledge_base)

EVOLUÇÃO AUTÔNOMA:
- Ao aprender informações novas e importantes durante a execução de tarefas, considere salvá-las na base de conhecimento usando system_add_knowledge para que possam ser usadas em futuras consultas.
- Sempre que possível, forneça insights e sugestões proativas baseadas nos dados que encontrar no sistema.

REGRAS OBRIGATÓRIAS:
1. Sempre analise a tarefa antes de agir. PENSE passo a passo.
2. Use as ferramentas disponíveis para executar cada passo.
3. Após concluir TODOS os passos, SEMPRE chame "task_completed" com um resumo.
4. Se uma ferramenta falhar, tente contornar ou informe no resumo final.
5. NUNCA invente dados. Se precisar de uma informação, use uma ferramenta.
6. Responda SEMPRE em português brasileiro.
7. Seja conciso e objetivo nas suas ações.
8. Os dados são ISOLADOS por empresa. Você só acessa dados da empresa atual.

CONTEXTO TEMPORAL:
- Data atual: ${dateStr}
- Hora atual: ${timeStr}
- Fuso horário: América/São Paulo (UTC-3)`;
}

/**
 * Converte tool definitions do formato OpenAI para Anthropic
 */
function convertToolsForAnthropic(tools) {
    return tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters,
    }));
}

/**
 * Executa uma tarefa autônoma com o loop ReAct
 */
async function runAgentTask(taskId, userPrompt, context = {}, onStepUpdate = null) {
    const taskState = {
        id: taskId,
        status: 'running',
        prompt: userPrompt,
        steps: [],
        result: null,
        startedAt: new Date().toISOString(),
        completedAt: null,
        error: null,
    };

    // Persiste estado inicial
    await persistTaskState(taskState, context);

    const { settings = {} } = context;
    const aiConfig = resolveAIConfig(settings);
    const { provider, apiKey, model } = aiConfig;
    const agentName = settings.agent_name || settings.bot_name || 'Hermes';

    const systemPrompt = buildAgentSystemPrompt(agentName);
    const tools = getToolDefinitions();

    console.log(`\n🤖 ══════════════════════════════════════════════════`);
    console.log(`🤖 AGENTE AUTÔNOMO INICIADO [${taskId}]`);
    console.log(`🤖 Provedor: ${provider} | Modelo: ${model}`);
    console.log(`🤖 Tarefa: "${userPrompt.substring(0, 80)}..."`);
    console.log(`🤖 ══════════════════════════════════════════════════\n`);

    try {
        const isOpenRouter = provider === 'openrouter' || (apiKey && apiKey.startsWith('sk-or-'));

        if (provider === 'anthropic' && !isOpenRouter) {
            return await runAnthropicLoop(taskState, systemPrompt, userPrompt, tools, aiConfig, context, onStepUpdate);
        } else {
            return await runOpenAILoop(taskState, systemPrompt, userPrompt, tools, aiConfig, context, onStepUpdate);
        }

    } catch (err) {
        console.error(`❌ [Agente ${taskId}] Erro fatal:`, err.message);
        taskState.status = 'error';
        taskState.error = err.message;
        taskState.completedAt = new Date().toISOString();
        await persistTaskState(taskState, context);
        return taskState;
    }
}

/**
 * Loop ReAct para Anthropic
 */
async function runAnthropicLoop(taskState, systemPrompt, userPrompt, tools, aiConfig, context, onStepUpdate) {
    const { apiKey, model } = aiConfig;
    const anthropic = new Anthropic({ apiKey });
    const anthropicTools = convertToolsForAnthropic(tools);

    let messages = [{ role: 'user', content: userPrompt }];
    let step = 0;

    while (step < MAX_STEPS) {
        step++;
        console.log(`\n🔄 [Agente] ── Passo ${step}/${MAX_STEPS} ──`);

        const stepLog = {
            step,
            type: 'thinking',
            timestamp: new Date().toISOString(),
            thought: null,
            action: null,
            observation: null,
        };

        const response = await anthropic.messages.create({
            model,
            system: systemPrompt,
            messages,
            tools: anthropicTools,
            max_tokens: 2048,
            temperature: 0.3,
        });

        let hasToolUse = false;
        const assistantContent = response.content;

        for (const block of assistantContent) {
            if (block.type === 'text' && block.text) {
                stepLog.thought = block.text;
                console.log(`💭 [Pensamento] ${block.text.substring(0, 150)}...`);
            }

            if (block.type === 'tool_use') {
                hasToolUse = true;
                const toolName = block.name;
                const toolArgs = block.input || {};
                const toolUseId = block.id;

                stepLog.action = { tool: toolName, args: toolArgs };
                console.log(`⚡ [Ação] ${toolName}(${JSON.stringify(toolArgs).substring(0, 100)})`);

                if (toolName === 'task_completed') {
                    stepLog.observation = toolArgs.summary;
                    stepLog.type = 'completed';
                    taskState.steps.push(stepLog);

                    taskState.status = toolArgs.success ? 'completed' : 'failed';
                    taskState.result = toolArgs.summary;
                    taskState.completedAt = new Date().toISOString();

                    await persistTaskState(taskState, context);
                    if (onStepUpdate) onStepUpdate(stepLog);

                    console.log(`\n✅ [Agente] Tarefa FINALIZADA: ${toolArgs.summary}`);
                    return taskState;
                }

                const observation = await executeTool(toolName, toolArgs, context);
                stepLog.observation = observation;
                console.log(`👁️ [Observação] ${observation.substring(0, 150)}...`);

                messages.push({ role: 'assistant', content: assistantContent });
                messages.push({
                    role: 'user',
                    content: [{
                        type: 'tool_result',
                        tool_use_id: toolUseId,
                        content: observation,
                    }],
                });
            }
        }

        stepLog.type = hasToolUse ? 'action' : 'thinking';
        taskState.steps.push(stepLog);
        await persistTaskState(taskState, context);
        if (onStepUpdate) onStepUpdate(stepLog);

        if (!hasToolUse && response.stop_reason === 'end_turn') {
            console.log(`⏹️ [Agente] IA encerrou sem chamar ferramentas. Finalizando.`);
            taskState.status = 'completed';
            taskState.result = stepLog.thought || 'Tarefa processada.';
            taskState.completedAt = new Date().toISOString();
            await persistTaskState(taskState, context);
            return taskState;
        }
    }

    console.warn(`⚠️ [Agente] Limite de ${MAX_STEPS} passos atingido.`);
    taskState.status = 'timeout';
    taskState.result = 'O agente atingiu o limite de passos sem concluir a tarefa.';
    taskState.completedAt = new Date().toISOString();
    await persistTaskState(taskState, context);
    return taskState;
}

/**
 * Loop ReAct para OpenAI
 */
async function runOpenAILoop(taskState, systemPrompt, userPrompt, tools, aiConfig, context, onStepUpdate) {
    const { apiKey, model } = aiConfig;
    const isOpenRouter = aiConfig.provider === 'openrouter' || (apiKey && apiKey.startsWith('sk-or-'));

    const clientConfig = isOpenRouter
        ? {
            apiKey,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': 'https://whatsapp-ai-pro.vercel.app',
                'X-Title': 'WhatsApp AI Pro Agent'
            }
        }
        : { apiKey };

    const openaiClient = new OpenAI(clientConfig);

    let resolvedModel = model;
    if (isOpenRouter && !model.includes('/')) {
        if (model.startsWith('claude')) resolvedModel = `anthropic/${model}`;
        else if (model.startsWith('gpt')) resolvedModel = `openai/${model}`;
    }

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
    ];

    let step = 0;

    while (step < MAX_STEPS) {
        step++;
        console.log(`\n🔄 [Agente] ── Passo ${step}/${MAX_STEPS} ──`);

        const stepLog = {
            step,
            type: 'thinking',
            timestamp: new Date().toISOString(),
            thought: null,
            action: null,
            observation: null,
        };

        const response = await openaiClient.chat.completions.create({
            model: resolvedModel,
            messages,
            tools,
            tool_choice: 'auto',
            max_tokens: 2048,
            temperature: 0.3,
        });

        const msg = response.choices[0].message;

        if (msg.content) {
            stepLog.thought = msg.content;
            console.log(`💭 [Pensamento] ${msg.content.substring(0, 150)}...`);
        }

        if (msg.tool_calls && msg.tool_calls.length > 0) {
            messages.push(msg);

            for (const toolCall of msg.tool_calls) {
                const toolName = toolCall.function.name;
                let toolArgs = {};
                try {
                    toolArgs = JSON.parse(toolCall.function.arguments || '{}');
                } catch { }

                stepLog.action = { tool: toolName, args: toolArgs };
                console.log(`⚡ [Ação] ${toolName}(${JSON.stringify(toolArgs).substring(0, 100)})`);

                if (toolName === 'task_completed') {
                    stepLog.observation = toolArgs.summary;
                    stepLog.type = 'completed';
                    taskState.steps.push(stepLog);

                    taskState.status = toolArgs.success ? 'completed' : 'failed';
                    taskState.result = toolArgs.summary;
                    taskState.completedAt = new Date().toISOString();

                    await persistTaskState(taskState, context);
                    if (onStepUpdate) onStepUpdate(stepLog);

                    console.log(`\n✅ [Agente] Tarefa FINALIZADA: ${toolArgs.summary}`);
                    return taskState;
                }

                const observation = await executeTool(toolName, toolArgs, context);
                stepLog.observation = observation;
                console.log(`👁️ [Observação] ${observation.substring(0, 150)}...`);

                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: observation,
                });
            }

            stepLog.type = 'action';
            taskState.steps.push(stepLog);
            await persistTaskState(taskState, context);
            if (onStepUpdate) onStepUpdate(stepLog);

        } else {
            stepLog.type = 'thinking';
            taskState.steps.push(stepLog);
            await persistTaskState(taskState, context);
            if (onStepUpdate) onStepUpdate(stepLog);

            if (response.choices[0].finish_reason === 'stop') {
                console.log(`⏹️ [Agente] IA encerrou sem chamar ferramentas. Finalizando.`);
                taskState.status = 'completed';
                taskState.result = msg.content || 'Tarefa processada.';
                taskState.completedAt = new Date().toISOString();
                await persistTaskState(taskState, context);
                return taskState;
            }
        }
    }

    console.warn(`⚠️ [Agente] Limite de ${MAX_STEPS} passos atingido.`);
    taskState.status = 'timeout';
    taskState.result = 'O agente atingiu o limite de passos sem concluir a tarefa.';
    taskState.completedAt = new Date().toISOString();
    await persistTaskState(taskState, context);
    return taskState;
}

/**
 * Retorna o estado atual de uma tarefa
 */
async function getTaskStatus(taskId) {
    const local = runningTasks.get(taskId);
    if (local) return local;

    const supabase = getSupabaseClient();
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('agent_tasks')
                .select('*')
                .eq('id', taskId)
                .single();

            if (!error && data) {
                // Normaliza as propriedades de snake_case para camelCase
                return {
                    id: data.id,
                    status: data.status,
                    prompt: data.prompt,
                    steps: data.steps || [],
                    result: data.result,
                    error: data.error,
                    startedAt: data.started_at,
                    completedAt: data.completed_at,
                };
            }
        } catch (e) {
            // Ignora erro
        }
    }
    return null;
}

/**
 * Lista todas as tarefas (histórico)
 */
async function listTasks(tenantId = 'default') {
    const supabase = getSupabaseClient();
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('agent_tasks')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('started_at', { ascending: false });

            if (!error && data && data.length > 0) {
                return data.map(item => ({
                    id: item.id,
                    status: item.status,
                    prompt: item.prompt,
                    steps: item.steps || [],
                    result: item.result,
                    error: item.error,
                    startedAt: item.started_at,
                    completedAt: item.completed_at,
                }));
            }
        } catch (e) {
            // Ignora erro
        }
    }

    // Fallback in-memory
    return Array.from(runningTasks.values())
        .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
}

/**
 * Limpa tarefas antigas
 */
function cleanupOldTasks(maxAge = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    for (const [id, task] of runningTasks) {
        if (task.completedAt && now - new Date(task.completedAt).getTime() > maxAge) {
            runningTasks.delete(id);
        }
    }
}

module.exports = {
    runAgentTask,
    getTaskStatus,
    listTasks,
    cleanupOldTasks,
};
