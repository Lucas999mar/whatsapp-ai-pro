/**
 * ══════════════════════════════════════════════════════════════
 *  OMNI ROUTER API - ROTAS E GERENCIAMENTO DE COMBOS
 * ══════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { getCatalog, getPresetCombos, getProviderById } = require('../ai/omniCatalog');
const { getOmniMetrics, executeOmniRequest } = require('../ai/omniRouter');

function getSupabaseClient() {
    try {
        const { getSupabase } = require('../db/supabase');
        return getSupabase();
    } catch (e) {
        return null;
    }
}

// Memory fallback para configs do tenant
const tenantOmniConfigs = new Map();

/**
 * GET /api/omni/catalog
 * Retorna o catálogo de modelos, provedores e presets
 */
router.get('/catalog', authMiddleware, (req, res) => {
    res.json({
        catalog: getCatalog(),
        presetCombos: getPresetCombos()
    });
});

/**
 * GET /api/omni/metrics
 * Retorna métricas do roteador (sucessos, fallbacks, circuit breakers)
 */
router.get('/metrics', authMiddleware, (req, res) => {
    res.json(getOmniMetrics());
});

/**
 * GET /api/omni/config
 * Retorna as configurações ativas de combo e chaves do tenant
 */
router.get('/config', authMiddleware, async (req, res) => {
    const tenantId = req.user.id || 'default';

    const supabase = getSupabaseClient();
    if (supabase) {
        try {
            const { data } = await supabase
                .from('tenant_settings')
                .select('omni_config')
                .eq('tenant_id', tenantId)
                .single();

            if (data && data.omni_config) {
                return res.json(data.omni_config);
            }
        } catch (e) {
            // Segue para fallback
        }
    }

    const cached = tenantOmniConfigs.get(tenantId) || {
        selectedComboId: 'combo_free_ultra',
        activeSteps: getPresetCombos()[0].steps,
        tenantKeys: {}
    };

    res.json(cached);
});

/**
 * POST /api/omni/config
 * Salva as configurações de combo e chaves do tenant
 */
router.post('/config', authMiddleware, async (req, res) => {
    const tenantId = req.user.id || 'default';
    const { selectedComboId, activeSteps, tenantKeys } = req.body;

    const newConfig = {
        selectedComboId: selectedComboId || 'combo_free_ultra',
        activeSteps: activeSteps || getPresetCombos()[0].steps,
        tenantKeys: tenantKeys || {}
    };

    tenantOmniConfigs.set(tenantId, newConfig);

    const supabase = getSupabaseClient();
    if (supabase) {
        try {
            await supabase
                .from('tenant_settings')
                .upsert({
                    tenant_id: tenantId,
                    omni_config: newConfig,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'tenant_id' });
        } catch (e) {
            console.warn('⚠️ [OmniRoutes] Não foi possível persistir no Supabase, mantendo em memória');
        }
    }

    res.json({ success: true, config: newConfig });
});

/**
 * POST /api/omni/test
 * Testa um modelo/provedor enviando um prompt curto
 */
router.post('/test', authMiddleware, async (req, res) => {
    const { providerId, modelId, apiKey } = req.body;

    const provider = getProviderById(providerId);
    if (!provider) {
        return res.status(400).json({ error: 'Provedor não encontrado' });
    }

    // Verifica se o provedor precisa de chave e se ela foi fornecida ou existe em env
    if (provider.requiresKey) {
        const hasKey = apiKey || (provider.keyEnv && process.env[provider.keyEnv]);
        if (!hasKey) {
            return res.status(400).json({
                success: false,
                error: `O provedor "${provider.name}" requer uma API Key. Insira sua chave em "Gerenciar API Keys" ou crie uma gratuitamente em: ${provider.signupUrl}`
            });
        }
    }

    try {
        const result = await executeOmniRequest({
            comboSteps: [{ providerId, modelId: modelId || provider.models[0].id }],
            messages: [{ role: 'user', content: 'Diga "OmniRoute OK" em uma palavra.' }],
            tenantKeys: apiKey ? { [providerId]: apiKey } : {}
        });

        res.json({
            success: true,
            provider: result.usedProvider,
            model: result.usedModel,
            message: result.response.choices[0]?.message?.content || 'Sucesso'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

module.exports = router;
