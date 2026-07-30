import React, { useState, useEffect } from 'react';
import {
    Cpu, Zap, ShieldAlert, CheckCircle2, Play, RefreshCw,
    Layers, Plus, Trash2, Key, Sparkles, ArrowRight, Activity, Server
} from 'lucide-react';
import api from '../api/api';

export default function OmniRouterTab() {
    const [catalog, setCatalog] = useState([]);
    const [presetCombos, setPresetCombos] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [config, setConfig] = useState({
        selectedComboId: 'combo_free_ultra',
        activeSteps: [],
        tenantKeys: {}
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingStep, setTestingStep] = useState(null);
    const [testResult, setTestResult] = useState(null);
    const [searchFilter, setSearchFilter] = useState('');
    const [editingKeys, setEditingKeys] = useState(false);
    const [keysForm, setKeysForm] = useState({});

    // Carrega dados iniciais do OmniRouter
    useEffect(() => {
        fetchOmniData();
        const interval = setInterval(fetchMetrics, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchOmniData = async () => {
        setLoading(true);
        try {
            const [catRes, configRes, metricsRes] = await Promise.all([
                api.get('/omni/catalog'),
                api.get('/omni/config'),
                api.get('/omni/metrics')
            ]);

            setCatalog(catRes.data.catalog || []);
            setPresetCombos(catRes.data.presetCombos || []);
            setConfig(configRes.data || { selectedComboId: 'combo_free_ultra', activeSteps: [], tenantKeys: {} });
            setKeysForm(configRes.data?.tenantKeys || {});
            setMetrics(metricsRes.data || null);
        } catch (err) {
            console.error('Erro ao carregar dados do OmniRouter:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMetrics = async () => {
        try {
            const res = await api.get('/omni/metrics');
            setMetrics(res.data);
        } catch (e) { }
    };

    // Aplica um combo preset
    const handleSelectPreset = (combo) => {
        setConfig(prev => ({
            ...prev,
            selectedComboId: combo.id,
            activeSteps: combo.steps
        }));
    };

    // Adiciona um modelo ao combo ativo
    const handleAddModelToCombo = (providerId, modelId) => {
        setConfig(prev => {
            const currentSteps = prev.activeSteps || [];
            // Evita duplicados contínuos
            return {
                ...prev,
                selectedComboId: 'custom',
                activeSteps: [...currentSteps, { providerId, modelId }]
            };
        });
    };

    // Remove um passo do combo
    const handleRemoveStep = (index) => {
        setConfig(prev => ({
            ...prev,
            selectedComboId: 'custom',
            activeSteps: prev.activeSteps.filter((_, i) => i !== index)
        }));
    };

    // Salva a configuração no backend
    const handleSaveConfig = async () => {
        setSaving(true);
        try {
            await api.post('/omni/config', {
                selectedComboId: config.selectedComboId,
                activeSteps: config.activeSteps,
                tenantKeys: keysForm
            });
            alert('✅ Configurações do OmniRouter salvas com sucesso!');
        } catch (err) {
            alert('❌ Erro ao salvar configurações: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    // Testa um provedor individual
    const handleTestCandidate = async (providerId, modelId) => {
        setTestingStep(`${providerId}:${modelId}`);
        setTestResult(null);
        try {
            const res = await api.post('/omni/test', {
                providerId,
                modelId,
                apiKey: keysForm[providerId] || null
            });
            setTestResult({
                providerId,
                modelId,
                success: true,
                message: res.data.message,
                usedModel: res.data.model
            });
        } catch (err) {
            setTestResult({
                providerId,
                modelId,
                success: false,
                message: err.response?.data?.error || err.message
            });
        } finally {
            setTestingStep(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    // Filtra provedores na busca
    const filteredCatalog = catalog.filter(p =>
        p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        p.models.some(m => m.name.toLowerCase().includes(searchFilter.toLowerCase()) || m.id.toLowerCase().includes(searchFilter.toLowerCase()))
    );

    return (
        <div className="space-y-8 animate-fade-in">
            {/* ═══ TOP HERO BANNER & METRICS ═══ */}
            <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                                <Zap size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    OmniRouter — AI Gateway & Auto-Fallback
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Acesso unificado a 90+ provedores com roteamento dinâmico e resiliência total a limites de quota.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setEditingKeys(!editingKeys)}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-white/10"
                        >
                            <Key size={16} className="text-amber-400" />
                            {editingKeys ? 'Fechar Chaves' : 'Gerenciar API Keys'}
                        </button>
                        <button
                            onClick={handleSaveConfig}
                            disabled={saving}
                            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 uppercase tracking-wider"
                        >
                            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            Salvar Configurações
                        </button>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-slate-900/80 border border-white/5 rounded-xl p-3.5">
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                            <Activity size={14} className="text-emerald-400" /> Requisições Roteadas
                        </div>
                        <div className="text-xl font-black text-white mt-1">
                            {metrics?.totalRequests || 0}
                        </div>
                    </div>

                    <div className="bg-slate-900/80 border border-white/5 rounded-xl p-3.5">
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                            <RefreshCw size={14} className="text-blue-400" /> Fallbacks Acionados
                        </div>
                        <div className="text-xl font-black text-white mt-1">
                            {metrics?.fallbacksTriggered || 0}
                        </div>
                    </div>

                    <div className="bg-slate-900/80 border border-white/5 rounded-xl p-3.5">
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                            <ShieldAlert size={14} className="text-amber-400" /> Circuit Breakers Ativos
                        </div>
                        <div className="text-xl font-black text-white mt-1">
                            {metrics?.activeCircuitBreakers?.length || 0}
                        </div>
                    </div>

                    <div className="bg-slate-900/80 border border-white/5 rounded-xl p-3.5">
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                            <Cpu size={14} className="text-purple-400" /> Modelos Disponíveis
                        </div>
                        <div className="text-xl font-black text-white mt-1">
                            90+ Free Tier
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ API KEYS MANAGER MODAL/PANEL ═══ */}
            {editingKeys && (
                <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-6 space-y-4 animate-fade-in">
                    <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                        <Key size={18} /> Chaves de API Personalizadas (Opcional)
                    </h3>
                    <p className="text-xs text-slate-400">
                        Os modelos keyless e free tiers funcionam imediatamente. Adicione suas chaves se quiser limites de quota maiores.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {catalog.filter(p => p.requiresKey).map(provider => (
                            <div key={provider.id} className="space-y-1">
                                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                                    <span>{provider.name} ({provider.keyEnv})</span>
                                    <a href={provider.signupUrl} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-400 underline">Criar chave grátis ↗</a>
                                </label>
                                <input
                                    type="password"
                                    placeholder="sk-..."
                                    value={keysForm[provider.id] || ''}
                                    onChange={(e) => setKeysForm({ ...keysForm, [provider.id]: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ SECTION: PRESET COMBOS ═══ */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers size={18} className="text-emerald-400" /> Presets de Combos Prontos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {presetCombos.map(combo => {
                        const isSelected = config.selectedComboId === combo.id;
                        return (
                            <div
                                key={combo.id}
                                onClick={() => handleSelectPreset(combo)}
                                className={`cursor-pointer rounded-2xl p-5 border transition-all duration-300 relative ${isSelected
                                        ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10'
                                        : 'bg-slate-900/60 border-white/5 hover:border-slate-700 hover:bg-slate-900'
                                    }`}
                            >
                                {isSelected && (
                                    <span className="absolute top-4 right-4 bg-emerald-500 text-slate-950 font-black text-[10px] uppercase px-2 py-0.5 rounded-full">
                                        Ativo
                                    </span>
                                )}
                                <h4 className="font-bold text-sm text-white">{combo.name}</h4>
                                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{combo.description}</p>
                                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Estratégia: <strong className="text-emerald-400 capitalize">{combo.strategy}</strong></span>
                                    <span>{combo.steps.length} modelos na escada</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══ SECTION: ACTIVE COMBO FALLBACK LADDER ═══ */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Sparkles size={18} className="text-emerald-400" /> Escada de Fallback Ativa ({config.activeSteps?.length || 0} degraus)
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Se um modelo sofrer falha ou limite de quota, a requisição passa automaticamente para o próximo.
                        </p>
                    </div>
                </div>

                {config.activeSteps?.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-white/10 rounded-xl">
                        Nenhum modelo na escada. Selecione um preset acima ou clique no botão + nos modelos do catálogo abaixo.
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {config.activeSteps?.map((step, idx) => {
                            const provider = catalog.find(p => p.id === step.providerId);
                            const modelObj = provider?.models.find(m => m.id === step.modelId);
                            const isTesting = testingStep === `${step.providerId}:${step.modelId}`;

                            return (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between bg-slate-950 border border-white/5 rounded-xl p-3.5 hover:border-slate-800 transition"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-black">
                                            #{idx + 1}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-white flex items-center gap-2">
                                                {provider?.name || step.providerId}
                                                <span className="text-[10px] text-slate-500 font-mono">({step.modelId})</span>
                                            </div>
                                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                <span>Velocidade: {modelObj?.speed || 'Alta'}</span>
                                                <span>•</span>
                                                <span>Contexto: {modelObj?.context ? `${Math.round(modelObj.context / 1000)}k` : '128k'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleTestCandidate(step.providerId, step.modelId)}
                                            disabled={isTesting}
                                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition flex items-center gap-1.5"
                                        >
                                            {isTesting ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                                            Testar
                                        </button>
                                        <button
                                            onClick={() => handleRemoveStep(idx)}
                                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Visual Test Result */}
                {testResult && (
                    <div className={`p-4 rounded-xl text-xs flex items-center justify-between border animate-fade-in ${testResult.success
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-red-500/10 border-red-500/30 text-red-300'
                        }`}>
                        <div className="flex items-center gap-2">
                            {testResult.success ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                            <span>
                                <strong>[{testResult.providerId} / {testResult.modelId}]:</strong> {testResult.message}
                            </span>
                        </div>
                        <button onClick={() => setTestResult(null)} className="text-slate-400 hover:text-white">✕</button>
                    </div>
                )}
            </div>

            {/* ═══ SECTION: PROVIDER CATALOG GRID ═══ */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Server size={18} className="text-emerald-400" /> Catálogo de Provedores ({catalog.length} Ativos)
                    </h3>
                    <input
                        type="text"
                        placeholder="Buscar modelo ou provedor..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-full md:w-64"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredCatalog.map(provider => (
                        <div key={provider.id} className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 hover:border-slate-700 transition space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                                        {provider.name}
                                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                                            {provider.badge}
                                        </span>
                                    </h4>
                                    <p className="text-[11px] text-slate-400 mt-0.5">{provider.baseUrl}</p>
                                </div>
                                {!provider.requiresKey && (
                                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                                        Keyless
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2">
                                {provider.models.map(m => (
                                    <div key={m.id} className="flex items-center justify-between bg-slate-950/70 rounded-xl p-2.5 text-xs border border-white/5">
                                        <div>
                                            <div className="font-medium text-white">{m.name}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">{m.id}</div>
                                        </div>
                                        <button
                                            onClick={() => handleAddModelToCombo(provider.id, m.id)}
                                            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition flex items-center gap-1 font-bold text-[11px]"
                                        >
                                            <Plus size={12} /> Add na Escada
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
