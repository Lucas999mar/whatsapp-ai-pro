/**
 * ══════════════════════════════════════════════════════════════
 *  OMNI ROUTER - CATÁLOGO DE PROVEDORES E MODELOS (FREE & PAID)
 * 
 *  Suporta integração direta com 90+ modelos gratuitos e pagos
 *  via APIs compatíveis com OpenAI.
 * ══════════════════════════════════════════════════════════════
 */

const PROVIDER_CATALOG = [
    {
        id: 'groq',
        name: 'Groq Cloud',
        type: 'free_tier',
        badge: 'Ultra Rápido',
        baseUrl: 'https://api.groq.com/openai/v1',
        requiresKey: true,
        keyEnv: 'GROQ_API_KEY',
        signupUrl: 'https://console.groq.com',
        models: [
            { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Versatile)', tier: 'free', speed: '500+ t/s', context: 128000 },
            { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Instant)', tier: 'free', speed: '750+ t/s', context: 128000 },
            { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', tier: 'free', speed: '400+ t/s', context: 32768 },
            { id: 'gemma2-9b-it', name: 'Gemma 2 9B', tier: 'free', speed: '600+ t/s', context: 8192 },
            { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B', tier: 'free', speed: '350+ t/s', context: 128000 }
        ]
    },
    {
        id: 'cerebras',
        name: 'Cerebras AI',
        type: 'free_tier',
        badge: 'Wafer-Scale Speed',
        baseUrl: 'https://api.cerebras.ai/v1',
        requiresKey: true,
        keyEnv: 'CEREBRAS_API_KEY',
        signupUrl: 'https://cloud.cerebras.ai',
        models: [
            { id: 'llama-3.3-70b', name: 'Llama 3.3 70B (Cerebras)', tier: 'free', speed: '2100+ t/s', context: 128000 },
            { id: 'llama-3.1-8b', name: 'Llama 3.1 8B (Cerebras)', tier: 'free', speed: '2500+ t/s', context: 128000 }
        ]
    },
    {
        id: 'openrouter_free',
        name: 'OpenRouter Free Hub',
        type: 'free_keyless',
        badge: '90+ Free Models',
        baseUrl: 'https://openrouter.ai/api/v1',
        requiresKey: false,
        keyEnv: 'OPENROUTER_API_KEY',
        signupUrl: 'https://openrouter.ai/keys',
        models: [
            { id: 'openrouter/free', name: 'OpenRouter Auto Free Router', tier: 'free', speed: 'Dinâmico', context: 128000 },
            { id: 'google/gemini-2.0-flash-lite-001:free', name: 'Gemini 2.0 Flash Lite (Free)', tier: 'free', speed: 'Alto', context: 1000000 },
            { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Meta Llama 3.3 70B (Free)', tier: 'free', speed: 'Médio', context: 131072 },
            { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)', tier: 'free', speed: 'Médio', context: 64000 },
            { id: 'mistralai/mistral-small-24b-instruct-2501:free', name: 'Mistral Small 24B (Free)', tier: 'free', speed: 'Alto', context: 32000 },
            { id: 'qwen/qwen-2.5-coder-32b-instruct:free', name: 'Qwen 2.5 Coder 32B (Free)', tier: 'free', speed: 'Alto', context: 32000 }
        ]
    },
    {
        id: 'pollinations',
        name: 'Pollinations AI',
        type: 'free_keyless',
        badge: 'Zero Config / Free',
        baseUrl: 'https://gen.pollinations.ai/v1',
        requiresKey: false,
        signupUrl: 'https://pollinations.ai',
        models: [
            { id: 'openai', name: 'Pollinations GPT-4o Mini (Free)', tier: 'free', speed: 'Médio', context: 32000 },
            { id: 'mistral', name: 'Pollinations Mistral (Free)', tier: 'free', speed: 'Alto', context: 32000 },
            { id: 'llama', name: 'Pollinations Llama 3.3 (Free)', tier: 'free', speed: 'Médio', context: 32000 }
        ]
    },
    {
        id: 'siliconflow',
        name: 'SiliconFlow (SiliconCloud)',
        type: 'free_tier',
        badge: 'Sem Custo Inicial',
        baseUrl: 'https://api.siliconflow.cn/v1',
        requiresKey: true,
        keyEnv: 'SILICONFLOW_API_KEY',
        signupUrl: 'https://cloud.siliconflow.cn',
        models: [
            { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen 2.5 7B (Silicon)', tier: 'free', speed: 'Alto', context: 32000 },
            { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3 (Silicon)', tier: 'free', speed: 'Médio', context: 64000 },
            { id: 'internlm/internlm2_5-7b-chat', name: 'InternLM 2.5 7B', tier: 'free', speed: 'Alto', context: 32000 }
        ]
    },
    {
        id: 'google_gemini',
        name: 'Google AI Studio',
        type: 'free_tier',
        badge: '1.5M Quota Diária',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        requiresKey: true,
        keyEnv: 'GEMINI_API_KEY',
        signupUrl: 'https://aistudio.google.com',
        models: [
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', tier: 'free', speed: 'Muito Alto', context: 1048576 },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', tier: 'free', speed: 'Muito Alto', context: 1048576 },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tier: 'free', speed: 'Médio', context: 2097152 }
        ]
    },
    {
        id: 'nvidia_nim',
        name: 'NVIDIA NIM',
        type: 'free_tier',
        badge: 'Enterprise Performance',
        baseUrl: 'https://integrate.api.nvidia.com/v1',
        requiresKey: true,
        keyEnv: 'NVIDIA_NIM_KEY',
        signupUrl: 'https://build.nvidia.com',
        models: [
            { id: 'meta/llama-3.3-70b-instruct', name: 'NVIDIA Llama 3.3 70B', tier: 'free', speed: 'Alto', context: 128000 },
            { id: 'deepseek-ai/deepseek-r1', name: 'NVIDIA DeepSeek R1', tier: 'free', speed: 'Médio', context: 64000 }
        ]
    }
];

// Presets de Combos prontos para uso instantâneo
const PRESET_COMBOS = [
    {
        id: 'combo_free_ultra',
        name: '⚡ Combo 100% Grátis & Ultra Rápido',
        description: 'Combina Groq, Cerebras e OpenRouter Free para respostas velozes sem custo.',
        strategy: 'priority',
        steps: [
            { providerId: 'groq', modelId: 'llama-3.3-70b-versatile' },
            { providerId: 'cerebras', modelId: 'llama-3.3-70b' },
            { providerId: 'openrouter_free', modelId: 'google/gemini-2.0-flash-lite-001:free' },
            { providerId: 'pollinations', modelId: 'openai' }
        ]
    },
    {
        id: 'combo_reasoning',
        name: '🧠 Combo Raciocínio Profundo (DeepSeek & Gemini)',
        description: 'Ideal para análises complexas, código e contratos de alta exigência.',
        strategy: 'auto',
        steps: [
            { providerId: 'openrouter_free', modelId: 'deepseek/deepseek-r1:free' },
            { providerId: 'google_gemini', modelId: 'gemini-2.0-flash' },
            { providerId: 'groq', modelId: 'deepseek-r1-distill-llama-70b' }
        ]
    },
    {
        id: 'combo_cost_optimized',
        name: '💰 Combo Economia Máxima (Fallback Total)',
        description: 'Roteamento dinâmico que esgota quotas gratuitas antes de qualquer recurso pago.',
        strategy: 'cost-optimized',
        steps: [
            { providerId: 'openrouter_free', modelId: 'openrouter/free' },
            { providerId: 'pollinations', modelId: 'openai' },
            { providerId: 'groq', modelId: 'llama-3.1-8b-instant' },
            { providerId: 'siliconflow', modelId: 'Qwen/Qwen2.5-7B-Instruct' }
        ]
    }
];

function getCatalog() {
    return PROVIDER_CATALOG;
}

function getPresetCombos() {
    return PRESET_COMBOS;
}

function getProviderById(providerId) {
    return PROVIDER_CATALOG.find(p => p.id === providerId);
}

module.exports = {
    PROVIDER_CATALOG,
    PRESET_COMBOS,
    getCatalog,
    getPresetCombos,
    getProviderById
};
