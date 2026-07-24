import React, { useState, useEffect } from 'react';
import {
    Sparkles, BarChart2, Plus, Trash2, Key, Link as LinkIcon,
    TrendingUp, Users, Eye, Search, Brain, FolderPlus, ArrowRight,
    TrendingDown, ShieldCheck, HelpCircle, Loader2, Compass, CheckCircle2,
    Camera, Video, Globe, Share2
} from 'lucide-react';
import api from '../api/api';

const PLATFORMS_CONFIG = {
    instagram: { name: 'Instagram', color: 'from-pink-600 to-purple-600', icon: <Camera size={20} /> },
    tiktok: { name: 'TikTok', color: 'from-black to-slate-800', icon: <Video size={20} /> },
    youtube: { name: 'YouTube', color: 'from-red-600 to-red-700', icon: <Video size={20} /> },
    facebook: { name: 'Facebook', color: 'from-blue-600 to-blue-700', icon: <Share2 size={20} /> },
    kwai: { name: 'Kwai', color: 'from-orange-500 to-yellow-600', icon: <TrendingUp size={20} /> }
};

export default function SocialAnalyticsPage() {
    const [connections, setConnections] = useState([]);
    const [summary, setSummary] = useState({});
    const [platforms, setPlatforms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitLoading, setIsSubmitLoading] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);

    // States para o modal de conexão
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState('instagram');
    const [authType, setAuthType] = useState('oauth'); // 'oauth' (caminho A) ou 'link' (caminho B)
    const [accountName, setAccountName] = useState('');
    const [profileUrl, setProfileUrl] = useState('');

    // States para o login simulado (Caminho A)
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // States da Consultoria de IA
    const [goal, setGoal] = useState('Crescer Seguidores');
    const [niche, setNiche] = useState('Serviços e Consultoria B2B');
    const [aiInsights, setAiInsights] = useState(null);
    const [activePlatformDetail, setActivePlatformDetail] = useState(null);

    useEffect(() => {
        fetchMetricsAndConnections();
    }, []);

    const fetchMetricsAndConnections = async () => {
        setIsLoading(true);
        try {
            // Busca conexões e métricas em paralelo
            const [connRes, metricRes] = await Promise.all([
                api.get('/social-analytics/connections'),
                api.get('/social-analytics/metrics')
            ]);
            setConnections(connRes.data || []);
            setSummary(metricRes.data.summary || {});
            setPlatforms(metricRes.data.platforms || []);

            if (metricRes.data.platforms && metricRes.data.platforms.length > 0) {
                setActivePlatformDetail(metricRes.data.platforms[0]);
            }
        } catch (err) {
            console.error('Erro ao carregar dados de analytics:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnect = async (e) => {
        e.preventDefault();
        if (!accountName.trim()) return;

        setIsSubmitLoading(true);
        try {
            const payload = {
                platform: selectedPlatform,
                account_name: accountName.trim(),
                auth_type: authType,
                url: authType === 'link' ? profileUrl.trim() : null,
                credentials: authType === 'oauth' ? { email: loginEmail, password: loginPassword } : null
            };

            await api.post('/social-analytics/connect', payload);

            // Limpa formulário
            setAccountName('');
            setProfileUrl('');
            setLoginEmail('');
            setLoginPassword('');
            setIsModalOpen(false);

            // Recarrega dados
            await fetchMetricsAndConnections();
        } catch (err) {
            console.error('Erro ao conectar conta:', err);
            alert('Falha ao conectar conta social. Tente novamente mais tarde.');
        } finally {
            setIsSubmitLoading(false);
        }
    };

    const handleDeleteConnection = async (id) => {
        if (!confirm('Deseja realmente desconectar esta rede social?')) return;

        try {
            await api.delete(`/social-analytics/connections/${id}`);
            await fetchMetricsAndConnections();
        } catch (err) {
            console.error('Erro ao excluir conexão:', err);
        }
    };

    const handleRunAiConsultant = async () => {
        setIsAiLoading(true);
        setAiInsights(null);
        try {
            const res = await api.post('/social-analytics/analyze', { goal, niche });
            setAiInsights(res.data);
        } catch (err) {
            console.error('Erro na consultoria de IA:', err);
            alert(err.response?.data?.error || 'Certifique-se de ter pelo menos uma rede social conectada para receber insights.');
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleAddToPlanner = async (suggestion) => {
        try {
            const res = await api.post('/social-analytics/add-to-planner', {
                title: `[${PLATFORMS_CONFIG[suggestion.platform]?.name || 'Social'}] ${suggestion.title}`,
                description: `**Formato**: ${suggestion.format}\n\n**Ideia**: ${suggestion.description}\n\n**Gatilhos/CTA**: ${suggestion.cta}\n\n**Roteiro**: ${suggestion.script_bullet_points}`
            });
            alert('Idéia de conteúdo adicionada diretamente às "Ideias de Posts" no seu Planejador de Conteúdo! 🚀');
        } catch (err) {
            console.error('Erro ao agendar ideia:', err);
            alert('Erro ao enviar para o Planejador.');
        }
    };

    const formatNumber = (num) => {
        if (!num && num !== 0) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    return (
        <div className="space-y-8 animate-fade-in text-slate-200">

            {/* Top Header Card */}
            <div className="glass-panel p-6 border-l-4 border-l-[#25D366] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        <BarChart2 className="text-[#25D366]" /> Analytics & IA de Redes Sociais
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm leading-relaxed max-w-2xl">
                        Conecte suas plataformas sociais via APIs oficiais ou links públicos. Obtenha métricas de engajamento consolidadas e tenha um Assessor de Inteligência Artificial para gerar roteiros e estratégias de conteúdo em tempo real.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-5 py-3 bg-[#25D366] hover:bg-[#1DA851] text-slate-900 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 hover:scale-105"
                >
                    <Plus size={18} /> Conectar Canal
                </button>
            </div>

            {isLoading ? (
                <div className="h-[40vh] flex flex-col items-center justify-center gap-4">
                    <Loader2 className="animate-spin text-[#25D366]" size={42} />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Carregando métricas consolidadas...</p>
                </div>
            ) : (
                <>
                    {/* Métricas Consolidadas (Cards Superiores) */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="glass-panel p-4 flex flex-col relative overflow-hidden group">
                            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Seguidores Totais</span>
                            <span className="text-3xl font-black text-white mt-2 tracking-tight">
                                {formatNumber(summary.followers || 0)}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-[#25D366] mt-2 font-bold">
                                <TrendingUp size={14} /> +8.4% este mês
                            </div>
                            <Users className="absolute right-4 bottom-4 text-slate-800 opacity-20 group-hover:scale-110 transition-transform" size={40} />
                        </div>

                        <div className="glass-panel p-4 flex flex-col relative overflow-hidden group">
                            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Alcance Líquido</span>
                            <span className="text-3xl font-black text-white mt-2 tracking-tight">
                                {formatNumber(summary.reach || 0)}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-[#25D366] mt-2 font-bold">
                                <TrendingUp size={14} /> +12.3%
                            </div>
                            <Compass className="absolute right-4 bottom-4 text-slate-800 opacity-20 group-hover:scale-110 transition-transform" size={40} />
                        </div>

                        <div className="glass-panel p-4 flex flex-col relative overflow-hidden group">
                            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Impressões</span>
                            <span className="text-3xl font-black text-white mt-2 tracking-tight">
                                {formatNumber(summary.impressions || 0)}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-[#25D366] mt-2 font-bold">
                                <TrendingUp size={14} /> +19.1%
                            </div>
                            <Eye className="absolute right-4 bottom-4 text-slate-800 opacity-20 group-hover:scale-110 transition-transform" size={40} />
                        </div>

                        <div className="glass-panel p-4 flex flex-col relative overflow-hidden group">
                            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Visualizações</span>
                            <span className="text-3xl font-black text-white mt-2 tracking-tight">
                                {formatNumber(summary.views || 0)}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-[#25D366] mt-2 font-bold">
                                <TrendingUp size={14} /> +24%
                            </div>
                            <BarChart2 className="absolute right-4 bottom-4 text-slate-800 opacity-20 group-hover:scale-110 transition-transform" size={40} />
                        </div>

                        <div className="glass-panel p-4 flex flex-col relative overflow-hidden group col-span-2 lg:col-span-1">
                            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Engajamento Médio</span>
                            <span className="text-3xl font-black text-[#25D366] mt-2 tracking-tight">
                                {summary.avgEngagement ? `${summary.avgEngagement}%` : '0%'}
                            </span>
                            <div className="text-xs text-slate-400 mt-2 font-semibold">
                                Ref. a posts recentes
                            </div>
                            <Sparkles className="absolute right-4 bottom-4 text-[#25D366] opacity-20 group-hover:scale-110 transition-transform" size={40} />
                        </div>
                    </div>

                    {/* Seção Principal: Conexões de Canais e Postagens Recentes */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Col 1: Canais Conectados */}
                        <div className="glass-panel p-6 space-y-4">
                            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 border-b border-white/5 pb-4">
                                <CheckCircle2 className="text-[#25D366]" size={20} /> Canais Ativos ({connections.length})
                            </h2>

                            {connections.length === 0 ? (
                                <div className="p-8 text-center space-y-3">
                                    <Compass className="text-slate-600 mx-auto" size={32} />
                                    <p className="text-slate-400 text-sm">Nenhum canal de marketing social conectado ainda.</p>
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="text-[#25D366] hover:text-[#1DA851] text-xs font-bold uppercase tracking-wider"
                                    >
                                        Conecte o primeiro agora →
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {platforms.map((conn) => {
                                        const cfg = PLATFORMS_CONFIG[conn.platform] || { name: conn.platform, color: 'from-slate-600 to-slate-700', icon: <Compass size={20} /> };
                                        const isSelected = activePlatformDetail?.id === conn.id;
                                        return (
                                            <div
                                                key={conn.id}
                                                onClick={() => setActivePlatformDetail(conn)}
                                                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${isSelected
                                                    ? 'bg-white/10 border-white/20'
                                                    : 'bg-white/5 border-transparent hover:bg-white/10'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${cfg.color} flex items-center justify-center shadow-lg text-white`}>
                                                        {cfg.icon}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white text-sm">{conn.account_name}</div>
                                                        <div className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-widest font-semibold flex items-center gap-1">
                                                            <span>{cfg.name}</span>
                                                            <span>•</span>
                                                            <span className={conn.auth_type === 'oauth' ? 'text-[#25D366]' : 'text-cyan-400'}>
                                                                {conn.auth_type === 'oauth' ? 'oficial' : 'link'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-300">
                                                        {formatNumber(conn.metrics?.followers || 0)} seg.
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteConnection(conn.id);
                                                        }}
                                                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Col 2 & 3: Detalhes e Postagens do Canal Selecionado */}
                        <div className="lg:col-span-2 glass-panel p-6 space-y-6">
                            {activePlatformDetail ? (
                                <>
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-4 gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${PLATFORMS_CONFIG[activePlatformDetail.platform]?.color || 'from-slate-600 to-slate-700'
                                                } flex items-center justify-center text-white shadow-lg`}>
                                                {PLATFORMS_CONFIG[activePlatformDetail.platform]?.icon}
                                            </div>
                                            <div>
                                                <h3 className="font-extrabold text-white text-lg">{activePlatformDetail.account_name}</h3>
                                                <p className="text-xs text-slate-400">Desempenho da Rede e Publicações Recentes</p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-slate-300">
                                            Engajamento: <strong className="text-[#25D366]">{activePlatformDetail.metrics?.engagement_rate}%</strong>
                                        </span>
                                    </div>

                                    {/* Grid de Metrícads do Canal */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Alcance</span>
                                            <div className="text-lg font-black text-white mt-1">{formatNumber(activePlatformDetail.metrics?.reach || 0)}</div>
                                        </div>
                                        <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Impressões</span>
                                            <div className="text-lg font-black text-white mt-1">{formatNumber(activePlatformDetail.metrics?.impressions || 0)}</div>
                                        </div>
                                        <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Visualizações</span>
                                            <div className="text-lg font-black text-white mt-1">{formatNumber(activePlatformDetail.metrics?.views || 0)}</div>
                                        </div>
                                        <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Publicações</span>
                                            <div className="text-lg font-black text-white mt-1">{activePlatformDetail.metrics?.posts_count || 0}</div>
                                        </div>
                                    </div>

                                    {/* Listagem de Posts */}
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">Publicações Recentes Analisadas</h4>
                                        {activePlatformDetail.metrics?.recent_posts && activePlatformDetail.metrics.recent_posts.length > 0 ? (
                                            <div className="space-y-3">
                                                {activePlatformDetail.metrics.recent_posts.map((post, idx) => (
                                                    <div key={post.id || idx} className="p-3 bg-[#0B0F19] rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
                                                        <div className="space-y-1 flex-1">
                                                            <p className="text-sm font-medium text-slate-200 line-clamp-1 italic">
                                                                {post.caption}
                                                            </p>
                                                            <span className="text-[10px] text-slate-500 font-semibold">{post.date}</span>
                                                        </div>
                                                        <div className="flex gap-4 text-xs font-bold text-slate-400 shrink-0">
                                                            <span className="flex items-center gap-1"><Eye size={12} /> {formatNumber(post.views)}</span>
                                                            <span className="flex items-center gap-1 text-pink-500">❤️ {formatNumber(post.likes)}</span>
                                                            <span className="flex items-center gap-1 text-[#25D366]">💬 {post.comments}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-500 italic p-3">Nenhum feed capturado ainda para este perfil.</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="h-[250px] flex flex-col items-center justify-center text-center p-6 space-y-3">
                                    <BarChart2 className="text-slate-700" size={36} />
                                    <p className="text-slate-400 text-sm">Selecione uma conta social na lista para ver o detalhamento.</p>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* AI Advisor / Assessor de Redes Sociais */}
                    <div className="glass-panel p-6 space-y-6">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#25D366] to-emerald-700 flex items-center justify-center text-slate-900 shadow-lg">
                                    <Brain size={22} className="" />
                                </div>
                                <div>
                                    <h2 className="font-extrabold text-white text-lg tracking-tight">AI Social Media Advisor</h2>
                                    <p className="text-xs text-slate-400">Assessor Corporativo Inteligente em Tempo Real</p>
                                </div>
                            </div>

                            {!aiInsights && !isAiLoading && connections.length > 0 && (
                                <div className="flex gap-2">
                                    <span className="hidden md:inline px-3 py-1 bg-[#25D366]/10 text-[#25D366] text-xs font-bold rounded-lg border border-[#25D366]/20">
                                        Pronto para analisar
                                    </span>
                                </div>
                            )}
                        </div>

                        {connections.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 italic text-sm">
                                Conecte pelo menos uma conta social na plataforma para expor dados para a I.A gerar o posicionamento e os roteiros estratégicos.
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Parâmetros do Consultor */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-[#0B0F19]/40 p-4 rounded-xl border border-white/5 shadow-inner">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nicho / Público-Alvo</label>
                                        <input
                                            type="text"
                                            value={niche}
                                            onChange={(e) => setNiche(e.target.value)}
                                            placeholder="Ex: Clínicas Estéticas / Vendas B2B..."
                                            className="w-full bg-[#020617] border border-white/10 hover:border-white/20 p-3 rounded-lg text-sm text-white focus:outline-none focus:border-[#25D366]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Meta de Marketing</label>
                                        <select
                                            value={goal}
                                            onChange={(e) => setGoal(e.target.value)}
                                            className="w-full bg-[#020617] border border-white/10 p-3 rounded-lg text-sm text-white focus:outline-none focus:border-[#25D366] appearance-none"
                                        >
                                            <option>Crescer Seguidores</option>
                                            <option>Aumentar Vendas / Conversão</option>
                                            <option>Engajamento e Conexão</option>
                                            <option>Ideias de Conteúdo Viral</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={handleRunAiConsultant}
                                        disabled={isAiLoading}
                                        className="w-full p-3 bg-gradient-to-r from-[#25D366] to-[#15803D] hover:from-[#1DA851] hover:to-[#166534] text-slate-900 font-bold rounded-lg transition-all shadow-md flex items-center justify-center gap-2 hover:scale-[1.01] disabled:opacity-50"
                                    >
                                        {isAiLoading ? (
                                            <>
                                                <Loader2 className="animate-spin" size={18} />
                                                Analisando Performance...
                                            </>
                                        ) : (
                                            <>
                                                <Brain size={18} />
                                                Gerar Análise Estratégica
                                            </>
                                        )}
                                    </button>
                                </div>

                                {isAiLoading && (
                                    <div className="h-[200px] flex flex-col items-center justify-center gap-3 border border-white/5 rounded-xl border-dashed bg-white/5">
                                        <Loader2 className="animate-spin text-[#25D366]" size={36} />
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest animate-pulse">Lendo métricas, hashtags e posts...</p>
                                    </div>
                                )}

                                {/* Exibição dos Insights gerados */}
                                {aiInsights && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            {/* Análise de Performance */}
                                            <div className="lg:col-span-2 bg-[#0B0F19] border border-white/5 rounded-xl p-5 space-y-3">
                                                <h3 className="font-bold text-white text-sm uppercase tracking-widest text-[#25D366] flex items-center gap-2">
                                                    <TrendingUp size={16} /> Diagnóstico de Performance
                                                </h3>
                                                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                                                    {aiInsights.performance_analysis}
                                                </p>
                                            </div>

                                            {/* Dicas de Posicionamento & Trends */}
                                            <div className="bg-[#0B0F19] border border-white/5 rounded-xl p-5 space-y-4">
                                                <div className="space-y-2">
                                                    <h3 className="font-bold text-white text-sm uppercase tracking-widest text-emerald-400">
                                                        💡 Posicionamento Recomendado
                                                    </h3>
                                                    <p className="text-slate-350 text-xs leading-relaxed whitespace-pre-wrap">
                                                        {aiInsights.positioning_tips}
                                                    </p>
                                                </div>

                                                <div className="space-y-2 pt-2 border-t border-white/5">
                                                    <h3 className="font-bold text-white text-sm uppercase tracking-widest text-cyan-400">
                                                        🚀 Trends Recentes Detectadas
                                                    </h3>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {aiInsights.trending_topics?.map((topic, i) => (
                                                            <span key={i} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold text-slate-300 border border-white/5">
                                                                {topic}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ideias de posts de alto engajamento sugeridos */}
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
                                                Roteiros Prontos de Conteúdo Estratégico
                                            </h3>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {aiInsights.content_suggestions?.map((item, idx) => {
                                                    const cfg = PLATFORMS_CONFIG[item.platform?.toLowerCase()] || { name: item.platform, color: 'from-slate-650 to-slate-700', icon: <Compass size={18} /> };
                                                    return (
                                                        <div key={idx} className="bg-[#0D1324] border border-white/5 rounded-xl overflow-hidden shadow-xl flex flex-col justify-between">
                                                            <div className="p-5 space-y-4">
                                                                <div className="flex justify-between items-center">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.color} flex items-center justify-center text-white`}>
                                                                            {cfg.icon}
                                                                        </div>
                                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{cfg.name}</span>
                                                                    </div>
                                                                    <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] uppercase font-black text-slate-400">
                                                                        {item.format}
                                                                    </span>
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <h4 className="font-extrabold text-white text-lg">{item.title}</h4>
                                                                    <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                                                                </div>

                                                                <div className="space-y-2 bg-[#020617] p-3 rounded-lg border border-white/5 text-xs">
                                                                    <p className="text-slate-300 italic"><strong className="text-emerald-400">Roteiro Tópico:</strong> {item.script_bullet_points}</p>
                                                                    <p className="text-[10px] text-slate-500 font-semibold"><strong className="text-pink-500">CTA:</strong> {item.cta}</p>
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={() => handleAddToPlanner(item)}
                                                                className="w-full p-3 bg-white/5 hover:bg-white/10 border-t border-white/5 text-xs font-bold text-[#25D366] transition-colors flex items-center justify-center gap-1.5"
                                                            >
                                                                <FolderPlus size={14} /> Salvar no Planejador de Posts
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* MODAL DE CONEXÃO DE CANAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="w-full max-w-lg bg-[#0F172A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#090D1A]">
                            <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
                                <Plus className="text-[#25D366]" /> Conectar Novo Canal
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-white px-2 py-1 rounded-lg text-sm font-semibold transition"
                            >
                                Fechar
                            </button>
                        </div>

                        <form onSubmit={handleConnect} className="p-6 space-y-6">

                            {/* Seletor de rede */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Plataforma</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {Object.entries(PLATFORMS_CONFIG).map(([key, cfg]) => {
                                        const isSelected = selectedPlatform === key;
                                        return (
                                            <button
                                                type="button"
                                                key={key}
                                                onClick={() => setSelectedPlatform(key)}
                                                className={`py-3 rounded-lg text-xs font-bold border transition-all flex flex-col items-center gap-2 justify-center ${isSelected
                                                    ? 'bg-gradient-to-br ' + cfg.color + ' border-transparent text-white scale-105 shadow-md'
                                                    : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'
                                                    }`}
                                            >
                                                {cfg.icon}
                                                <span>{cfg.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Nome do conta / profile */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Identificador da Conta</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: @meunegocio ou NomeCanal"
                                    value={accountName}
                                    onChange={(e) => setAccountName(e.target.value)}
                                    className="w-full bg-[#020617] border border-white/10 focus:border-[#25D366] p-3 rounded-lg text-sm text-white focus:outline-none"
                                />
                            </div>

                            {/* Alternador de Caminho A (OAuth) e Caminho B (Url) */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Método de Conexão</label>
                                <div className="grid grid-cols-2 gap-2 bg-[#020617] p-1 rounded-lg border border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setAuthType('oauth')}
                                        className={`py-2 rounded-md font-bold text-xs flex justify-center items-center gap-1.5 transition ${authType === 'oauth' ? 'bg-[#25D366] text-slate-900' : 'text-slate-400'
                                            }`}
                                    >
                                        <Key size={14} /> Caminho A (Login Conexão)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAuthType('link')}
                                        className={`py-2 rounded-md font-bold text-xs flex justify-center items-center gap-1.5 transition ${authType === 'link' ? 'bg-[#25D366] text-slate-900' : 'text-slate-400'
                                            }`}
                                    >
                                        <LinkIcon size={14} /> Caminho B (Copiar Link)
                                    </button>
                                </div>
                            </div>

                            {/* Campos dinâmicos baseados no tipo de conexão */}
                            {authType === 'oauth' ? (
                                <div className="space-y-3 bg-[#020617]/50 p-4 rounded-xl border border-white/5 relative">
                                    <div className="absolute right-3 top-3 text-[10px] text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 rounded-full border border-[#25D366]/20 flex items-center gap-1">
                                        <ShieldCheck size={10} /> Conexão Integrada
                                    </div>

                                    <div className="text-slate-400 text-xs leading-relaxed pb-2 border-b border-white/5">
                                        Forneça as credenciais da conta de anúncios comercial para fazer a comunicação segura da API oficial do WhatsApp AI Pro.
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email de Acesso</label>
                                        <input
                                            type="email"
                                            value={loginEmail}
                                            onChange={(e) => setLoginEmail(e.target.value)}
                                            placeholder="seuemail@provedor.com"
                                            className="w-full bg-[#020617] border border-white/5 focus:border-[#25D366] p-2.5 rounded-lg text-xs text-white focus:outline-none"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Senha do Canal</label>
                                        <input
                                            type="password"
                                            value={loginPassword}
                                            onChange={(e) => setLoginPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-[#020617] border border-white/5 focus:border-[#25D366] p-2.5 rounded-lg text-xs text-white focus:outline-none"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3 bg-[#020617]/50 p-4 rounded-xl border border-white/5">
                                    <div className="text-slate-400 text-xs leading-relaxed pb-2">
                                        Cole a URL pública do seu perfil ou página. Faremos a leitura estruturada dos dados estáticos como seguidores e likes públicos.
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Link Completo do Perfil</label>
                                        <input
                                            type="url"
                                            value={profileUrl}
                                            onChange={(e) => setProfileUrl(e.target.value)}
                                            placeholder="https://..."
                                            className="w-full bg-[#020617] border border-white/5 focus:border-[#25D366] p-3 rounded-lg text-xs text-white focus:outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Botão de Envio */}
                            <button
                                type="submit"
                                disabled={isSubmitLoading}
                                className="w-full p-3.5 bg-[#25D366] hover:bg-[#1DA851] disabled:opacity-50 text-slate-900 font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2 hover:scale-[1.01]"
                            >
                                {isSubmitLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Validando e conectando...
                                    </>
                                ) : (
                                    <>
                                        Concluir Integração <ArrowRight size={16} />
                                    </>
                                )}
                            </button>

                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
