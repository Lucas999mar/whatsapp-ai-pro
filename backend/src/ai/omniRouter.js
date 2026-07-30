/**
 * ══════════════════════════════════════════════════════════════
 *  OMNI ROUTER ENGINE - DISPATCHER, CIRCUIT BREAKER & FALLBACK
 * 
 *  Executa requisições de IA através do roteador inteligente OmniRoute.
 *  Gerencia retentativas transparentes, fallback em escada,
 *  cooldown de chaves e métricas em tempo real.
 * ══════════════════════════════════════════════════════════════
 */

const OpenAI = require('openai');
const { PROVIDER_CATALOG, getProviderById } = require('./omniCatalog');

// Circuit breaker: armazena status e cooldown de provedores com falha
// Map<providerId, { trippedUntil: timestamp, failCount: number }>
const circuitBreakers = new Map();

// Métricas de execução (in-memory)
const routerMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    fallbacksTriggered: 0,
    tokensSaved: 0,
    providerStats: {}
};

/**
 * Registra o sucesso de uma chamada
 */
function recordSuccess(providerId, modelId, durationMs, tokens = 0) {
    routerMetrics.totalRequests++;
    routerMetrics.successfulRequests++;

    if (!routerMetrics.providerStats[providerId]) {
        routerMetrics.providerStats[providerId] = { requests: 0, errors: 0, totalDurationMs: 0 };
    }

    const stats = routerMetrics.providerStats[providerId];
    stats.requests++;
    stats.totalDurationMs += durationMs;

    // Reseta circuit breaker
    circuitBreakers.delete(providerId);
}

/**
 * Registra falha e ativa circuit breaker se necessário
 */
function recordFailure(providerId, errorMsg) {
    routerMetrics.totalRequests++;
    if (!routerMetrics.providerStats[providerId]) {
        routerMetrics.providerStats[providerId] = { requests: 0, errors: 0, totalDurationMs: 0 };
    }
    routerMetrics.providerStats[providerId].errors++;

    const current = circuitBreakers.get(providerId) || { failCount: 0, trippedUntil: 0 };
    current.failCount++;
    // Cooldown exponencial: 15s, 45s, 90s (max 3 minutos)
    const cooldownMs = Math.min(180000, 15000 * Math.pow(2, current.failCount - 1));
    current.trippedUntil = Date.now() + cooldownMs;

    circuitBreakers.set(providerId, current);

    console.warn(`⚠️ [OmniRouter] Circuit breaker ativado para ${providerId} durante ${Math.round(cooldownMs / 1000)}s (${errorMsg})`);
}

/**
 * Verifica se o provedor está em cooldown do circuit breaker
 */
function isProviderTripped(providerId) {
    const cb = circuitBreakers.get(providerId);
    if (!cb) return false;
    if (Date.now() > cb.trippedUntil) {
        // Cooldown expirou, tenta recuperar (half-open)
        return false;
    }
    return true;
}

/**
 * Resolve a chave de API para o provedor (verificando contexto do tenant e variáveis de ambiente)
 */
function resolveApiKey(provider, tenantKeys = {}) {
    if (!provider.requiresKey) return 'keyless';

    // 1. Chave configurada pelo usuário no painel
    if (tenantKeys[provider.id]) return tenantKeys[provider.id];

    // 2. Chave em variável de ambiente global
    if (provider.keyEnv && process.env[provider.keyEnv]) return process.env[provider.keyEnv];

    // 3. Fallback para chaves padrão da aplicação
    if (provider.id === 'openrouter_free' && (process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY)) {
        return process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;
    }

    return null;
}

/**
 * Executa uma chamada de Chat Completion usando um candidato específico
 */
async function callProviderCandidate(provider, modelId, messages, tools = null, apiKey = 'keyless') {
    const startTime = Date.now();

    const clientOptions = {
        baseURL: provider.baseUrl,
        apiKey: apiKey || 'dummy-key',
        defaultHeaders: {
            'HTTP-Referer': 'https://whatsapp-ai-pro.local',
            'X-Title': 'WhatsApp AI Pro OmniRouter'
        }
    };

    const client = new OpenAI(clientOptions);

    const payload = {
        model: modelId,
        messages: messages,
        temperature: 0.7,
    };

    if (tools && Array.isArray(tools) && tools.length > 0) {
        payload.tools = tools;
    }

    const response = await client.chat.completions.create(payload);
    const durationMs = Date.now() - startTime;

    recordSuccess(provider.id, modelId, durationMs, response.usage?.total_tokens || 0);

    return response;
}

/**
 * Executa a chamada via OmniRouter utilizando uma lista de candidatos (Combo / Auto-Fallback)
 */
async function executeOmniRequest({ comboSteps = [], messages, tools = null, tenantKeys = {}, strategy = 'priority' }) {
    if (!comboSteps || comboSteps.length === 0) {
        throw new Error('Nenhum modelo ou combo configurado no OmniRouter');
    }

    const candidates = [];

    for (const step of comboSteps) {
        const provider = getProviderById(step.providerId);
        if (!provider) continue;

        const apiKey = resolveApiKey(provider, tenantKeys);
        if (provider.requiresKey && !apiKey) {
            console.log(`ℹ️ [OmniRouter] Ignorando ${provider.name} (sem chave de API)`);
            continue;
        }

        if (isProviderTripped(provider.id)) {
            console.log(`ℹ️ [OmniRouter] Pulando ${provider.name} (circuit breaker ativo)`);
            continue;
        }

        candidates.push({ provider, modelId: step.modelId, apiKey });
    }

    if (candidates.length === 0) {
        // Se todos foram descartados por circuit breaker ou falta de chave, força tentativa no primeiro keyless
        const fallbackKeyless = PROVIDER_CATALOG.find(p => !p.requiresKey) || PROVIDER_CATALOG[0];
        candidates.push({
            provider: fallbackKeyless,
            modelId: fallbackKeyless.models[0].id,
            apiKey: 'keyless'
        });
    }

    let lastError = null;

    for (let i = 0; i < candidates.length; i++) {
        const { provider, modelId, apiKey } = candidates[i];

        if (i > 0) {
            routerMetrics.fallbacksTriggered++;
            console.log(`🔄 [OmniRouter Fallback] Tentando candidato #${i + 1}: ${provider.name} (${modelId})`);
        } else {
            console.log(`🚀 [OmniRouter Exec] Provedor: ${provider.name} | Modelo: ${modelId}`);
        }

        try {
            const response = await callProviderCandidate(provider, modelId, messages, tools, apiKey);
            return {
                response,
                usedProvider: provider.name,
                usedModel: modelId,
                fallbackCount: i
            };
        } catch (err) {
            console.error(`❌ [OmniRouter] Falha em ${provider.name} (${modelId}):`, err.message);
            recordFailure(provider.id, err.message);
            lastError = err;
        }
    }

    throw new Error(`Todas as tentativas no OmniRouter falharam. Último erro: ${lastError ? lastError.message : 'Desconhecido'}`);
}

/**
 * Obtém as estatísticas atuais do OmniRouter
 */
function getOmniMetrics() {
    return {
        ...routerMetrics,
        activeCircuitBreakers: Array.from(circuitBreakers.entries()).map(([providerId, data]) => ({
            providerId,
            trippedUntil: data.trippedUntil,
            remainingSeconds: Math.max(0, Math.round((data.trippedUntil - Date.now()) / 1000))
        }))
    };
}

module.exports = {
    executeOmniRequest,
    getOmniMetrics,
    isProviderTripped
};
