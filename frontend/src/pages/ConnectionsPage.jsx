import React, { useState, useEffect, useCallback } from 'react';
import { Plug, Search, ExternalLink, Trash2, CheckCircle2, XCircle, Loader2, Settings2, Key, ArrowRight, Zap, ChevronDown, X, Shield } from 'lucide-react';
import api from '../api/api';

// ══════════════════════════════════════════════════════════════
//  CATEGORIAS / CORES VISUAIS
// ══════════════════════════════════════════════════════════════
const CATEGORY_LABELS = {
    productivity: { label: 'Produtividade', color: '#3B82F6' },
    crm: { label: 'CRM', color: '#F59E0B' },
    project_management: { label: 'Gerenciamento', color: '#8B5CF6' },
    development: { label: 'Desenvolvimento', color: '#6366F1' },
    ecommerce: { label: 'E-commerce', color: '#10B981' },
    communication: { label: 'Comunicação', color: '#EC4899' },
    custom: { label: 'Custom', color: '#6C5CE7' },
};

const PLUGIN_LOGOS = {
    google: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/120px-Google_%22G%22_logo.svg.png',
    notion: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png',
    trello: 'https://cdn.worldvectorlogo.com/logos/trello.svg',
    hubspot: 'https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png',
    github: 'https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png',
    asana: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Asana_logo.svg/120px-Asana_logo.svg.png',
    shopify: 'https://cdn.worldvectorlogo.com/logos/shopify.svg',
    slack: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Slack_icon_2019.svg/120px-Slack_icon_2019.svg.png',
    webhook: null,
};

export default function ConnectionsPage() {
    const [plugins, setPlugins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [connectingPlugin, setConnectingPlugin] = useState(null);
    const [configModal, setConfigModal] = useState(null);
    const [configValues, setConfigValues] = useState({});
    const [disconnecting, setDisconnecting] = useState(null);

    // ── Buscar plugins do marketplace ──
    const fetchPlugins = useCallback(async () => {
        try {
            const { data } = await api.get('/plugins/marketplace');
            setPlugins(data);
        } catch (err) {
            console.error('Erro ao buscar plugins:', err);
            // Se a tabela não existe, mostra plugins sem conexões
            try {
                const { data } = await api.get('/plugins/marketplace');
                setPlugins(data);
            } catch {
                setPlugins([]);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPlugins(); }, [fetchPlugins]);

    // ── Listener para receber callback do OAuth popup ──
    useEffect(() => {
        function handleMessage(event) {
            if (event.data?.type === 'PLUGIN_CONNECTED') {
                console.log('✅ Plugin conectado via popup!', event.data);
                setConnectingPlugin(null);
                fetchPlugins(); // Recarrega a lista
            }
        }
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [fetchPlugins]);

    // ── Conectar plugin (abre popup OAuth) ──
    const handleConnect = async (pluginId) => {
        try {
            setConnectingPlugin(pluginId);
            const { data } = await api.post(`/plugins/connect/${pluginId}`);

            if (data.authType === 'api_key') {
                // Abre modal de configuração
                setConfigModal({ pluginId, configSchema: data.configSchema });
                setConnectingPlugin(null);
                return;
            }

            if (data.authUrl) {
                // Abre popup com a tela de login do provedor
                const width = 600, height = 700;
                const left = window.screenX + (window.innerWidth - width) / 2;
                const top = window.screenY + (window.innerHeight - height) / 2;
                const popup = window.open(
                    data.authUrl,
                    `oauth_${pluginId}`,
                    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
                );

                // Monitor para detectar se o popup foi fechado manualmente
                const checkClosed = setInterval(() => {
                    if (popup?.closed) {
                        clearInterval(checkClosed);
                        setConnectingPlugin(null);
                        fetchPlugins(); // Recarrega mesmo assim para checkar estado
                    }
                }, 1000);
            }
        } catch (err) {
            console.error('Erro ao conectar plugin:', err);
            setConnectingPlugin(null);
        }
    };

    // ── Salvar configuração de API Key ──
    const handleSaveConfig = async () => {
        if (!configModal) return;
        try {
            setConnectingPlugin(configModal.pluginId);
            await api.post(`/plugins/configure/${configModal.pluginId}`, { config: configValues });
            setConfigModal(null);
            setConfigValues({});
            fetchPlugins();
        } catch (err) {
            console.error('Erro ao salvar config:', err);
        } finally {
            setConnectingPlugin(null);
        }
    };

    // ── Desconectar plugin ──
    const handleDisconnect = async (pluginId) => {
        if (!confirm('Tem certeza que deseja desconectar este plugin?')) return;
        try {
            setDisconnecting(pluginId);
            await api.delete(`/plugins/${pluginId}`);
            fetchPlugins();
        } catch (err) {
            console.error('Erro ao desconectar:', err);
        } finally {
            setDisconnecting(null);
        }
    };

    // ── Filtros ──
    const categories = ['all', ...new Set(plugins.map(p => p.category))];
    const filtered = plugins.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategory = activeCategory === 'all' || p.category === activeCategory;
        return matchSearch && matchCategory;
    });

    const connectedCount = plugins.filter(p => p.connected).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-[#25D366] animate-spin" />
                    <p className="text-slate-500 text-sm font-medium">Carregando plugins...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* ══════════ HEADER ══════════ */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-gradient-to-br from-[#25D366]/20 to-[#25D366]/5 rounded-xl border border-[#25D366]/20">
                            <Plug className="w-6 h-6 text-[#25D366]" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Conexões</h1>
                    </div>
                    <p className="text-slate-400 text-sm max-w-lg">
                        Conecte suas ferramentas favoritas ao WhatsApp AI Pro. A IA terá acesso às APIs conectadas para executar ações automaticamente.
                    </p>
                </div>

                {connectedCount > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366]/10 border border-[#25D366]/20 rounded-xl">
                        <Zap className="w-4 h-4 text-[#25D366]" />
                        <span className="text-[#25D366] font-bold text-sm">{connectedCount} conectado{connectedCount > 1 ? 's' : ''}</span>
                    </div>
                )}
            </div>

            {/* ══════════ SEARCH & FILTERS ══════════ */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar plugins..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-[#0F172A] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/20 transition-all text-sm"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {categories.map(cat => {
                        const catInfo = CATEGORY_LABELS[cat];
                        return (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeCategory === cat
                                        ? 'bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30'
                                        : 'bg-[#0F172A] text-slate-400 border border-white/5 hover:border-white/15 hover:text-slate-300'
                                    }`}
                            >
                                {cat === 'all' ? 'Todos' : catInfo?.label || cat}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ══════════ CONNECTED SECTION ══════════ */}
            {plugins.some(p => p.connected) && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-gradient-to-r from-[#25D366]/30 to-transparent" />
                        <span className="text-xs font-bold uppercase tracking-widest text-[#25D366]/70 px-2">Conectados</span>
                        <div className="h-px flex-1 bg-gradient-to-l from-[#25D366]/30 to-transparent" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {plugins.filter(p => p.connected).map(plugin => (
                            <ConnectedPluginCard
                                key={plugin.id}
                                plugin={plugin}
                                onDisconnect={handleDisconnect}
                                disconnecting={disconnecting === plugin.id}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ══════════ AVAILABLE SECTION ══════════ */}
            <div className="space-y-4">
                {plugins.some(p => p.connected) && (
                    <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-gradient-to-r from-slate-700/50 to-transparent" />
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500 px-2">Disponíveis</span>
                        <div className="h-px flex-1 bg-gradient-to-l from-slate-700/50 to-transparent" />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.filter(p => !p.connected).map(plugin => (
                        <AvailablePluginCard
                            key={plugin.id}
                            plugin={plugin}
                            onConnect={handleConnect}
                            connecting={connectingPlugin === plugin.id}
                        />
                    ))}
                </div>

                {filtered.filter(p => !p.connected).length === 0 && (
                    <div className="text-center py-16 text-slate-500">
                        <Plug className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p className="font-medium">Nenhum plugin encontrado</p>
                        <p className="text-sm mt-1">Tente outro termo de busca</p>
                    </div>
                )}
            </div>

            {/* ══════════ CONFIG MODAL (API KEY) ══════════ */}
            {configModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConfigModal(null)}>
                    <div className="bg-[#0F172A] rounded-2xl border border-white/10 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-[#6C5CE7]/20 rounded-lg">
                                        <Key className="w-5 h-5 text-[#6C5CE7]" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold">Configurar Plugin</h3>
                                        <p className="text-slate-500 text-xs">Preencha as credenciais abaixo</p>
                                    </div>
                                </div>
                                <button onClick={() => setConfigModal(null)} className="p-2 hover:bg-white/5 rounded-lg transition">
                                    <X className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            {configModal.configSchema.map(field => (
                                <div key={field.key}>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">{field.label}</label>
                                    <input
                                        type={field.type === 'password' ? 'password' : 'text'}
                                        value={configValues[field.key] || ''}
                                        onChange={e => setConfigValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                                        placeholder={field.label}
                                        className="w-full px-4 py-2.5 bg-[#1E293B] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#6C5CE7]/50 text-sm"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="p-6 border-t border-white/5 flex gap-3">
                            <button
                                onClick={() => setConfigModal(null)}
                                className="flex-1 py-2.5 px-4 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-medium text-sm transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveConfig}
                                disabled={connectingPlugin}
                                className="flex-1 py-2.5 px-4 bg-[#6C5CE7] hover:bg-[#5B4DD6] text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
                            >
                                {connectingPlugin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                Conectar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
//  CONNECTED PLUGIN CARD
// ══════════════════════════════════════════════════════════════
function ConnectedPluginCard({ plugin, onDisconnect, disconnecting }) {
    const catInfo = CATEGORY_LABELS[plugin.category];
    const logo = PLUGIN_LOGOS[plugin.id];
    const accountInfo = plugin.connection?.account_info || {};
    const connectedAt = plugin.connection?.connected_at;

    return (
        <div className="group relative bg-gradient-to-br from-[#0F172A] to-[#0F172A] border border-[#25D366]/20 rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#25D366]/40 hover:shadow-[0_0_30px_rgba(37,211,102,0.08)]">
            {/* Glow superior */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#25D366] to-transparent opacity-60" />

            <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden"
                            style={{ background: `${plugin.color}15`, border: `1px solid ${plugin.color}30` }}>
                            {logo ? (
                                <img src={logo} alt={plugin.name} className="w-6 h-6 object-contain" />
                            ) : (
                                <span className="text-xl">{plugin.icon}</span>
                            )}
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm">{plugin.name}</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <CheckCircle2 className="w-3 h-3 text-[#25D366]" />
                                <span className="text-[#25D366] text-xs font-semibold">Conectado</span>
                            </div>
                        </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
                        style={{ color: catInfo?.color, background: `${catInfo?.color}15` }}>
                        {catInfo?.label}
                    </span>
                </div>

                {/* Account info */}
                {(accountInfo.email || accountInfo.name || accountInfo.username || accountInfo.team) && (
                    <div className="bg-[#1E293B]/50 rounded-xl p-3 mb-4 border border-white/5">
                        <div className="flex items-center gap-2.5">
                            {accountInfo.avatar && (
                                <img src={accountInfo.avatar} alt="" className="w-8 h-8 rounded-full border border-white/10" />
                            )}
                            <div className="min-w-0">
                                <p className="text-white text-xs font-medium truncate">
                                    {accountInfo.name || accountInfo.username || accountInfo.team || '—'}
                                </p>
                                {accountInfo.email && (
                                    <p className="text-slate-500 text-[11px] truncate">{accountInfo.email}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tools & Meta */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" /> {plugin.toolCount} tool{plugin.toolCount > 1 ? 's' : ''}
                        </span>
                        {connectedAt && (
                            <span>desde {new Date(connectedAt).toLocaleDateString('pt-BR')}</span>
                        )}
                    </div>

                    <button
                        onClick={() => onDisconnect(plugin.id)}
                        disabled={disconnecting}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Desconectar"
                    >
                        {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
//  AVAILABLE PLUGIN CARD
// ══════════════════════════════════════════════════════════════
function AvailablePluginCard({ plugin, onConnect, connecting }) {
    const catInfo = CATEGORY_LABELS[plugin.category];
    const logo = PLUGIN_LOGOS[plugin.id];

    return (
        <div className="group relative bg-[#0F172A] border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/15 hover:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
            <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-110"
                            style={{ background: `${plugin.color}10`, border: `1px solid ${plugin.color}20` }}>
                            {logo ? (
                                <img src={logo} alt={plugin.name} className="w-6 h-6 object-contain" />
                            ) : (
                                <span className="text-xl">{plugin.icon}</span>
                            )}
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm">{plugin.name}</h3>
                            <span className="text-[10px] font-bold uppercase tracking-wider"
                                style={{ color: catInfo?.color }}>
                                {catInfo?.label}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <p className="text-slate-400 text-xs leading-relaxed mb-4 line-clamp-2">
                    {plugin.description}
                </p>

                {/* Tools preview */}
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {plugin.toolCount} ferramenta{plugin.toolCount > 1 ? 's' : ''} disponíve{plugin.toolCount > 1 ? 'is' : 'l'}
                    </span>
                    <span className="text-slate-700">•</span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        {plugin.authType === 'oauth2' ? 'OAuth 2.0' : 'API Key'}
                    </span>
                </div>

                {/* Connect Button */}
                <button
                    onClick={() => onConnect(plugin.id)}
                    disabled={connecting}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2
            bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20
            group-hover:bg-gradient-to-r group-hover:from-[#25D366]/10 group-hover:to-transparent group-hover:border-[#25D366]/30 group-hover:text-[#25D366]
            disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {connecting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Conectando...
                        </>
                    ) : (
                        <>
                            <ExternalLink className="w-4 h-4" />
                            Conectar
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
