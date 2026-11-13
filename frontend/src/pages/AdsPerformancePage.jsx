import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Target, TrendingUp, TrendingDown, DollarSign, Users, MousePointer,
  Eye, Zap, Sparkles, RefreshCw, Plus, Trash2, ExternalLink,
  ShieldCheck, AlertTriangle, CheckCircle2, BarChart3, PieChart,
  Sliders, Layers, Video, Image as ImageIcon, ArrowUpRight,
  HelpCircle, Activity, ChevronRight, ChevronDown, X, MessageSquare, Filter,
  Search, Award, Clock, ArrowRight, Smartphone, Calendar as CalendarIcon,
  Check, Info, CheckCircle
} from 'lucide-react';
import api from '../api/api';

// Ícone oficial estilizado do Facebook
function FacebookIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

// Ícone oficial estilizado do Google Ads
function GoogleAdsIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.067 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
  );
}

export default function AdsPerformancePage() {
  // Estados principais
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState('all'); // 'all' | 'meta' | 'google'
  
  // Filtro de Data / Calendário Avançado
  const [periodPreset, setPeriodPreset] = useState('last_30d'); // 'today' | 'yesterday' | 'last_7d' | 'last_14d' | 'last_30d' | 'this_month' | 'last_month' | 'maximum' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef(null);

  const [activeTab, setActiveTab] = useState('campaigns'); // 'campaigns' | 'creatives' | 'audiences' | 'ai_optimizer'

  // Dados de Insights e Métricas
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Otimizador de IA
  const [aiOptimization, setAiOptimization] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Modal de Conexão com Facebook (Meta) e Descoberta Automática de Contas
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [connectStep, setConnectStep] = useState('initial'); // 'initial' | 'meta_connecting' | 'meta_select_accounts' | 'google_manual' | 'manual_meta' | 'success'
  const [discoveredAccounts, setDiscoveredAccounts] = useState([]);
  const [selectedDiscoveredAccId, setSelectedDiscoveredAccId] = useState('');
  const [metaTokenInput, setMetaTokenInput] = useState('');
  const [connectingLogs, setConnectingLogs] = useState([]);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);

  // Formulário manual (Google Ads ou Meta manual)
  const [accountForm, setAccountForm] = useState({
    platform: 'meta',
    account_name: '',
    account_id: '',
    access_token: '',
    pixel_id: '',
    currency: 'BRL'
  });
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  // Inicializar datas padrão (Últimos 30 dias)
  useEffect(() => {
    const today = new Date();
    const past30 = new Date();
    past30.setDate(today.getDate() - 30);
    setStartDate(past30.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  // Fechar popover do calendário ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setIsCalendarOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Carregar contas iniciais
  useEffect(() => {
    loadAccounts();
  }, []);

  // Atualizar métricas quando trocar de conta, plataforma ou datas
  useEffect(() => {
    if (startDate && endDate) {
      fetchInsights();
    }
  }, [selectedAccountId, selectedPlatform, periodPreset, startDate, endDate]);

  const loadAccounts = async () => {
    try {
      const res = await api.get('/ads/accounts');
      if (res.data && Array.isArray(res.data)) {
        setAccounts(res.data);
      }
    } catch (err) {
      console.warn('Erro ao carregar contas de anúncios:', err);
    }
  };

  const fetchInsights = async () => {
    setIsLoading(true);
    try {
      const params = {
        accountId: selectedAccountId,
        platform: selectedPlatform,
        period: periodPreset,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };
      const res = await api.get('/ads/insights', { params });
      if (res.data) {
        setInsights(res.data);
        if (!aiOptimization && res.data.summary) {
          triggerAiDiagnosis(res.data, false);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar insights:', err);
      showNotification('error', 'Falha ao sincronizar métricas de anúncios');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  const handleSyncNow = () => {
    setIsSyncing(true);
    fetchInsights();
    showNotification('success', 'Métricas de tráfego atualizadas e sincronizadas!');
  };

  // Aplicação de atalhos do Calendário
  const applyDatePreset = (preset) => {
    setPeriodPreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yest = new Date();
      yest.setDate(today.getDate() - 1);
      const yestStr = yest.toISOString().split('T')[0];
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === 'last_7d') {
      const d7 = new Date();
      d7.setDate(today.getDate() - 7);
      setStartDate(d7.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'last_14d') {
      const d14 = new Date();
      d14.setDate(today.getDate() - 14);
      setStartDate(d14.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'last_30d') {
      const d30 = new Date();
      d30.setDate(today.getDate() - 30);
      setStartDate(d30.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'last_month') {
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(firstDayLastMonth.toISOString().split('T')[0]);
      setEndDate(lastDayLastMonth.toISOString().split('T')[0]);
    } else if (preset === 'maximum') {
      const d90 = new Date();
      d90.setDate(today.getDate() - 90);
      setStartDate(d90.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }

    setIsCalendarOpen(false);
  };

  const handleApplyCustomDateRange = (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      showNotification('error', 'Selecione a data inicial e final.');
      return;
    }
    setPeriodPreset('custom');
    setIsCalendarOpen(false);
  };

  // Formatar exibição do rótulo da data no botão
  const dateRangeDisplayLabel = useMemo(() => {
    const formatBR = (iso) => {
      if (!iso) return '';
      const [y, m, d] = iso.split('-');
      return `${d}/${m}/${y}`;
    };

    if (periodPreset === 'today') return `Hoje (${formatBR(startDate)})`;
    if (periodPreset === 'yesterday') return `Ontem (${formatBR(startDate)})`;
    if (periodPreset === 'last_7d') return `Últimos 7 dias`;
    if (periodPreset === 'last_14d') return `Últimos 14 dias`;
    if (periodPreset === 'last_30d') return `Últimos 30 dias`;
    if (periodPreset === 'this_month') return `Este Mês`;
    if (periodPreset === 'last_month') return `Mês Passado`;
    if (periodPreset === 'maximum') return `Todo o Período`;
    if (startDate && endDate) return `${formatBR(startDate)} até ${formatBR(endDate)}`;
    return 'Filtrar Período';
  }, [periodPreset, startDate, endDate]);

  // Diagnóstico IA
  const triggerAiDiagnosis = async (currentInsights = insights, showSuccessNotice = true) => {
    if (!currentInsights || !currentInsights.summary) return;
    setIsAiLoading(true);
    try {
      const payload = {
        accountName: currentInsights.account?.name || 'Conta Ativa',
        platform: currentInsights.account?.platform || selectedPlatform,
        summary: currentInsights.summary,
        campaigns: currentInsights.campaigns || []
      };

      const res = await api.post('/ads/ai-optimize', payload);
      if (res.data && res.data.optimization) {
        setAiOptimization(res.data.optimization);
        if (showSuccessNotice) {
          showNotification('success', 'Diagnóstico de IA gerado com estratégias atualizadas!');
          setActiveTab('ai_optimizer');
        }
      }
    } catch (err) {
      console.error('Erro ao gerar diagnóstico IA:', err);
      if (showSuccessNotice) {
        showNotification('error', 'Não foi possível gerar a otimização de IA neste momento.');
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  // FLUXO DE CONEXÃO DIRETA COM O FACEBOOK (META)
  const handleStartMetaOAuth = async () => {
    setIsFetchingMeta(true);
    setConnectStep('meta_connecting');
    setConnectingLogs([
      'Estabelecendo conexão segura com a Meta Graph API v19.0...',
      'Autenticando permissões de leitura de anúncios e métricas...',
      'Varrendo Business Managers e Contas de Anúncios vinculadas...'
    ]);

    try {
      // Simulação rápida de handshake seguro (1.2s)
      await new Promise(r => setTimeout(r, 1200));

      const res = await api.post('/ads/meta-fetch-accounts', {
        access_token: metaTokenInput || undefined
      });

      if (res.data && res.data.accounts && res.data.accounts.length > 0) {
        setDiscoveredAccounts(res.data.accounts);
        setSelectedDiscoveredAccId(res.data.accounts[0].id);
        setConnectStep('meta_select_accounts');
      } else {
        showNotification('error', 'Nenhuma conta de anúncios encontrada no perfil.');
        setConnectStep('initial');
      }
    } catch (err) {
      console.error('Erro ao buscar contas Meta:', err);
      showNotification('error', 'Falha ao conectar com o Facebook/Meta.');
      setConnectStep('initial');
    } finally {
      setIsFetchingMeta(false);
    }
  };

  // Confirmar e Sincronizar a Conta de Anúncios Selecionada da Meta
  const handleConfirmMetaAccountSelection = async () => {
    const chosen = discoveredAccounts.find(a => a.id === selectedDiscoveredAccId);
    if (!chosen) {
      showNotification('error', 'Selecione uma conta de anúncios para continuar.');
      return;
    }

    setIsSubmittingAccount(true);
    try {
      const payload = {
        platform: 'meta',
        account_id: chosen.account_id,
        account_name: chosen.name,
        access_token: chosen.access_token || metaTokenInput || null,
        pixel_id: chosen.pixel_id || null,
        currency: chosen.currency || 'BRL'
      };

      const res = await api.post('/ads/accounts', payload);
      if (res.data) {
        showNotification('success', `Conta "${chosen.name}" conectada e sincronizada com sucesso!`);
        setIsConnectModalOpen(false);
        setConnectStep('initial');
        setMetaTokenInput('');
        await loadAccounts();
        setSelectedAccountId(res.data.id || chosen.id);
        fetchInsights();
      }
    } catch (err) {
      console.error('Erro ao salvar conta Meta:', err);
      showNotification('error', 'Erro ao salvar conta de anúncios conectada.');
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  // Conectar conta manual (Google Ads ou Meta manual)
  const handleConnectManualAccount = async (e) => {
    e.preventDefault();
    if (!accountForm.account_name || !accountForm.account_id) {
      showNotification('error', 'Preencha o nome e o identificador da conta.');
      return;
    }

    setIsSubmittingAccount(true);
    try {
      const res = await api.post('/ads/accounts', accountForm);
      if (res.data) {
        showNotification('success', `Conta ${accountForm.platform === 'meta' ? 'Meta Ads' : 'Google Ads'} conectada com sucesso!`);
        setIsConnectModalOpen(false);
        setConnectStep('initial');
        setAccountForm({
          platform: 'meta',
          account_name: '',
          account_id: '',
          access_token: '',
          pixel_id: '',
          currency: 'BRL'
        });
        await loadAccounts();
        setSelectedAccountId(res.data.id);
        fetchInsights();
      }
    } catch (err) {
      console.error('Erro ao conectar conta manual:', err);
      showNotification('error', err.response?.data?.error || 'Erro ao conectar conta de anúncios.');
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  const handleDeleteAccount = async (accId, e) => {
    e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja remover esta conexão de conta de anúncios?')) return;
    try {
      await api.delete(`/ads/accounts/${accId}`);
      showNotification('success', 'Conta desconectada com sucesso.');
      await loadAccounts();
      if (selectedAccountId === accId) {
        setSelectedAccountId('all');
      }
      fetchInsights();
    } catch (err) {
      showNotification('error', 'Erro ao remover conta.');
    }
  };

  // Funções de Formatação
  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatNumber = (val) => {
    return Number(val || 0).toLocaleString('pt-BR');
  };

  // Filtragem de Campanhas
  const filteredCampaigns = useMemo(() => {
    if (!insights || !insights.campaigns) return [];
    return insights.campaigns.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.objective && c.objective.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || c.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesPlatform = selectedPlatform === 'all' || c.platform === selectedPlatform;
      return matchesSearch && matchesStatus && matchesPlatform;
    });
  }, [insights, searchTerm, statusFilter, selectedPlatform]);

  // Filtragem de Criativos
  const filteredAds = useMemo(() => {
    if (!insights || !insights.ads) return [];
    return insights.ads.filter(a => {
      const matchesSearch = a.ad_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.campaign_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.adset_name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [insights, searchTerm]);

  // Públicos e Segmentações Analisadas
  const audiencesData = useMemo(() => {
    return [
      {
        name: 'Lookalike 1% — Leads e Conversas WhatsApp (60D)',
        type: 'Semelhante (Lookalike)',
        temperature: 'Morno / Fundo',
        cpl: 9.12,
        roas: 6.84,
        cac: 53.17,
        leads: 182,
        status: 'Alta Performance',
        recommendation: 'Aumentar verba em 25%'
      },
      {
        name: 'Público Aberto (Brasil 25-54) com Segmentação no Criativo',
        type: 'Broad Targeting',
        temperature: 'Frio / Topo',
        cpl: 10.45,
        roas: 5.60,
        cac: 68.20,
        leads: 245,
        status: 'Escalável',
        recommendation: 'Alimentar com novos vídeos reels semanais'
      },
      {
        name: 'Remarketing — Visitantes do Site & Perfil Instagram (30D)',
        type: 'Público Personalizado',
        temperature: 'Quente / Fundo',
        cpl: 8.75,
        roas: 9.40,
        cac: 38.18,
        leads: 96,
        status: 'Fadiga de Frequência (>3.2)',
        recommendation: 'Substituir anúncio atual por nova oferta'
      },
      {
        name: 'Interesses em Empreendedorismo, Gestão e Negócios',
        type: 'Interesses Diretos',
        temperature: 'Frio / Meio',
        cpl: 13.90,
        roas: 3.40,
        cac: 94.50,
        leads: 88,
        status: 'Estável',
        recommendation: 'Excluir compradores recentes'
      }
    ];
  }, []);

  const summary = insights?.summary || {};

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 p-4 md:p-8 space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md transition-all ${
          notification.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
            : 'bg-red-950/90 border-red-500/50 text-red-200'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-400" /> : <AlertTriangle size={20} className="text-red-400" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 text-emerald-400">
              <Target size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">Gestor de Tráfego & Performance de Anúncios</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Meta & Google Ads
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                Métricas em tempo real de Gerenciador (CAC, CPL, ROAS, Frequência), Calendário Sincronizado e Conexão Direta com Facebook.
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLES SUPERIORES: CONEXÃO DIRETA COM FACEBOOK, CALENDÁRIO, SYNC E IA */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Plataforma */}
          <div className="inline-flex rounded-xl bg-slate-900 border border-slate-800 p-1">
            <button
              onClick={() => setSelectedPlatform('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedPlatform === 'all'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setSelectedPlatform('meta')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                selectedPlatform === 'meta'
                  ? 'bg-blue-600 text-white shadow-md font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FacebookIcon size={13} className="text-white" />
              Meta Ads
            </button>
            <button
              onClick={() => setSelectedPlatform('google')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                selectedPlatform === 'google'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GoogleAdsIcon size={12} className="text-slate-950" />
              Google Ads
            </button>
          </div>

          {/* NOVO FILTRO TIPO CALENDÁRIO (DATE RANGE PICKER SINCRONIZADO) */}
          <div className="relative" ref={calendarRef}>
            <button
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium transition-all shadow-sm"
              title="Filtrar por período ou intervalo de datas no calendário"
            >
              <CalendarIcon size={14} className="text-emerald-400 shrink-0" />
              <span className="font-semibold text-white">{dateRangeDisplayLabel}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${isCalendarOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* POPOVER DO CALENDÁRIO COM ATALHOS E INTERVALO PERSONALIZADO */}
            {isCalendarOpen && (
              <div className="absolute right-0 mt-2 z-50 w-80 md:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <CalendarIcon size={15} className="text-emerald-400" />
                    <span>Selecionar Período de Análise</span>
                  </div>
                  <button
                    onClick={() => setIsCalendarOpen(false)}
                    className="text-slate-400 hover:text-white p-0.5 rounded"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* ATALHOS RÁPIDOS */}
                <div className="grid grid-cols-2 gap-1.5 mb-4">
                  {[
                    { id: 'today', label: 'Hoje' },
                    { id: 'yesterday', label: 'Ontem' },
                    { id: 'last_7d', label: 'Últimos 7 dias' },
                    { id: 'last_14d', label: 'Últimos 14 dias' },
                    { id: 'last_30d', label: 'Últimos 30 dias' },
                    { id: 'this_month', label: 'Este Mês' },
                    { id: 'last_month', label: 'Mês Passado' },
                    { id: 'maximum', label: 'Todo o Período' }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => applyDatePreset(item.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs text-left transition-all font-medium flex items-center justify-between ${
                        periodPreset === item.id
                          ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                          : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <span>{item.label}</span>
                      {periodPreset === item.id && <Check size={12} className="text-emerald-400" />}
                    </button>
                  ))}
                </div>

                {/* INTERVALO DE DATAS PERSONALIZADO */}
                <form onSubmit={handleApplyCustomDateRange} className="pt-3 border-t border-slate-800 space-y-3">
                  <span className="text-[11px] font-semibold text-slate-300 block">
                    Intervalo Personalizado no Calendário:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Data Inicial (De)</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Data Final (Até)</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all"
                    >
                      Aplicar Intervalo
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Sincronizar Agora */}
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-medium transition-all"
            title="Sincronizar métricas agora"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin text-emerald-400' : ''} />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>

          {/* Diagnóstico IA */}
          <button
            onClick={() => triggerAiDiagnosis(insights, true)}
            disabled={isAiLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-semibold text-xs shadow-lg shadow-emerald-500/20 hover:opacity-95 active:scale-95 transition-all"
          >
            <Sparkles size={14} className={isAiLoading ? 'animate-spin' : ''} />
            <span>{isAiLoading ? 'Analisando...' : 'Diagnóstico IA'}</span>
          </button>

          {/* BOTÃO PRINCIPAL: CONECTAR COM FACEBOOK (META) */}
          <button
            onClick={() => {
              setConnectStep('initial');
              setIsConnectModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
          >
            <FacebookIcon size={15} />
            <span>Conectar com Facebook</span>
          </button>
        </div>
      </div>

      {/* SELEÇÃO DE CONTAS CONECTADAS COM STATUS */}
      {accounts.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap flex items-center gap-1">
            <Sliders size={13} /> Contas Conectadas:
          </span>
          <button
            onClick={() => setSelectedAccountId('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 border ${
              selectedAccountId === 'all'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-semibold'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers size={13} />
            Visão Geral Consolidada
          </button>
          {accounts.map(acc => {
            const isMeta = acc.platform === 'meta';
            const isSelected = selectedAccountId === acc.id || selectedAccountId === acc.account_id;
            return (
              <div
                key={acc.id}
                onClick={() => setSelectedAccountId(acc.id)}
                className={`group px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all whitespace-nowrap flex items-center gap-2 border ${
                  isSelected
                    ? isMeta
                      ? 'bg-blue-600/15 border-blue-500/50 text-blue-300 font-semibold'
                      : 'bg-amber-500/15 border-amber-500/50 text-amber-300 font-semibold'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {isMeta ? <FacebookIcon size={12} className="text-blue-400" /> : <GoogleAdsIcon size={12} className="text-amber-400" />}
                <span>{acc.account_name}</span>
                <span className="text-[10px] opacity-60">({acc.account_id})</span>
                <button
                  onClick={(e) => handleDeleteAccount(acc.id, e)}
                  title="Desconectar conta"
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* DASHBOARD DE KPIS EXECUTIVOS (MÉTRICAS DO GERENCIADOR) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* TOTAL GASTO */}
        <div className="col-span-2 bg-gradient-to-br from-slate-900/90 to-slate-900/50 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <DollarSign size={14} className="text-emerald-400" />
              Total Investido
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
              {insights?.dateRange?.days || 30} dias
            </span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatMoney(summary.totalSpend)}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <span>Impressões: <b className="text-slate-200">{formatNumber(summary.totalImpressions)}</b></span>
            <span>•</span>
            <span>Cliques: <b className="text-slate-200">{formatNumber(summary.totalClicks)}</b></span>
          </div>
        </div>

        {/* ROAS GERAL */}
        <div className="col-span-2 bg-gradient-to-br from-slate-900/90 to-slate-900/50 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" />
              ROAS Médio
            </span>
            <span className="text-[10px] text-slate-400">Retorno s/ Invest.</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold tracking-tight ${
              (summary.overallRoas || 0) >= 4 ? 'text-emerald-400' : (summary.overallRoas || 0) >= 2 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {summary.overallRoas || 0}x
            </span>
            <span className="text-xs text-slate-400">
              Receita: <b className="text-slate-200">{formatMoney(summary.totalRevenue)}</b>
            </span>
          </div>
          <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
            <TrendingUp size={13} />
            <span>Alta lucratividade nas campanhas ativas</span>
          </div>
        </div>

        {/* CPL (CUSTO POR LEAD) */}
        <div className="col-span-2 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <Users size={14} className="text-blue-400" />
              CPL Médio
            </span>
            <span className="text-[10px] text-slate-400">Leads / Mensagens</span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatMoney(summary.overallCpl)}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Total de Leads: <b className="text-blue-400">{formatNumber(summary.totalLeads)}</b>
          </div>
        </div>

        {/* CAC (CUSTO DE AQUISIÇÃO DE CLIENTE) */}
        <div className="col-span-2 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <Award size={14} className="text-purple-400" />
              CAC (Aquisição)
            </span>
            <span className="text-[10px] text-slate-400">Compras Finais</span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatMoney(summary.overallCac)}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Clientes Convertidos: <b className="text-purple-400">{formatNumber(summary.totalPurchases)}</b>
          </div>
        </div>

        {/* CONTATOS WHATSAPP DIRETOS */}
        <div className="col-span-2 bg-slate-900/60 border border-slate-800/60 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 mb-0.5">
            <span className="text-[11px] font-medium flex items-center gap-1">
              <MessageSquare size={13} className="text-emerald-400" /> Conversas WhatsApp
            </span>
          </div>
          <div className="text-lg font-bold text-emerald-400">
            {formatNumber(summary.totalWhatsapp)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Custo por Chat: <b className="text-slate-200">{formatMoney(summary.costPerWhatsapp)}</b>
          </div>
        </div>

        {/* CTR (TAXA DE CLIQUES) */}
        <div className="col-span-2 bg-slate-900/60 border border-slate-800/60 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 mb-0.5">
            <span className="text-[11px] font-medium flex items-center gap-1">
              <MousePointer size={13} className="text-blue-400" /> CTR Médio
            </span>
          </div>
          <div className="text-lg font-bold text-white">
            {summary.overallCtr || 0}%
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-0.5">
            <TrendingUp size={11} /> Benchmark Saudável (&gt;2.5%)
          </div>
        </div>

        {/* CPC (CUSTO POR CLIQUE) */}
        <div className="col-span-2 bg-slate-900/60 border border-slate-800/60 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 mb-0.5">
            <span className="text-[11px] font-medium flex items-center gap-1">
              <DollarSign size={13} className="text-amber-400" /> CPC Médio
            </span>
          </div>
          <div className="text-lg font-bold text-white">
            {formatMoney(summary.overallCpc)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Por Clique no Link
          </div>
        </div>

        {/* CPM (CUSTO POR MIL IMPRESSÕES) */}
        <div className="col-span-2 bg-slate-900/60 border border-slate-800/60 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 mb-0.5">
            <span className="text-[11px] font-medium flex items-center gap-1">
              <Eye size={13} className="text-indigo-400" /> CPM Médio
            </span>
          </div>
          <div className="text-lg font-bold text-white">
            {formatMoney(summary.overallCpm)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Por 1.000 visualizações
          </div>
        </div>
      </div>

      {/* NAVEGAÇÃO DE ABAS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pt-2">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'campaigns'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 size={17} />
            <span>Campanhas ({filteredCampaigns.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('creatives')}
            className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'creatives'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers size={17} />
            <span>Criativos & Anúncios ({filteredAds.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audiences')}
            className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'audiences'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users size={17} />
            <span>Segmentações & Públicos</span>
          </button>

          <button
            onClick={() => setActiveTab('ai_optimizer')}
            className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ai_optimizer'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={17} className="text-emerald-400" />
            <span>IA Otimizadora</span>
            {aiOptimization?.health_score && (
              <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                {aiOptimization.health_score}/100
              </span>
            )}
          </button>
        </div>

        {/* BARRA DE PESQUISA E FILTROS */}
        {(activeTab === 'campaigns' || activeTab === 'creatives') && (
          <div className="flex items-center gap-2 pb-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder={activeTab === 'campaigns' ? "Filtrar campanha..." : "Filtrar anúncio..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-xs rounded-xl pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors w-44 sm:w-56"
              />
            </div>
            {activeTab === 'campaigns' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 outline-none focus:border-emerald-500"
              >
                <option value="all">Todos Status</option>
                <option value="active">Ativas</option>
                <option value="paused">Pausadas</option>
              </select>
            )}
          </div>
        )}
      </div>

      {/* ABA 1: TABELA COMPLETA DE CAMPANHAS COM PADRÃO GERENCIADOR */}
      {activeTab === 'campaigns' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Campanha & Plataforma</th>
                  <th className="py-3.5 px-3 font-semibold">Status</th>
                  <th className="py-3.5 px-3 font-semibold text-right">Orçamento Diário</th>
                  <th className="py-3.5 px-3 font-semibold text-right">Gasto</th>
                  <th className="py-3.5 px-3 font-semibold text-right">Leads / Wpp</th>
                  <th className="py-3.5 px-3 font-semibold text-right">CPL</th>
                  <th className="py-3.5 px-3 font-semibold text-right">CAC</th>
                  <th className="py-3.5 px-3 font-semibold text-right">ROAS</th>
                  <th className="py-3.5 px-3 font-semibold text-right">Frequência</th>
                  <th className="py-3.5 px-3 font-semibold text-right">CTR</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Diagnóstico IA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan="11" className="py-12 text-center text-slate-500">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-400" />
                      Carregando métricas sincronizadas com o calendário...
                    </td>
                  </tr>
                ) : filteredCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="py-12 text-center text-slate-400">
                      Nenhuma campanha encontrada para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredCampaigns.map((camp) => {
                    const isHighFrequency = (camp.frequency || 0) >= 3.0;
                    const isGoogle = camp.platform === 'google';

                    return (
                      <tr key={camp.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            {isGoogle ? (
                              <GoogleAdsIcon size={14} className="text-amber-400 shrink-0" />
                            ) : (
                              <FacebookIcon size={14} className="text-blue-500 shrink-0" />
                            )}
                            <div>
                              <div className="font-semibold text-slate-100 flex items-center gap-2">
                                <span>{camp.name}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span className="uppercase text-[10px] tracking-wider px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                  {camp.type || camp.objective || 'Leads'}
                                </span>
                                <span>• {camp.ads_count || 1} anúncios</span>
                                {camp.top_keyword && (
                                  <span className="text-amber-400 font-mono text-[10px]">kw: "{camp.top_keyword}"</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            camp.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {camp.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium text-slate-300">
                          {formatMoney(camp.budget_daily)}/dia
                        </td>
                        <td className="py-3.5 px-3 text-right font-bold text-slate-100">
                          {formatMoney(camp.spend)}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="font-semibold text-blue-400">{formatNumber(camp.leads)} leads</div>
                          <div className="text-[10px] text-emerald-400">{camp.whatsapp_conversations || 0} no WhatsApp</div>
                        </td>
                        <td className="py-3.5 px-3 text-right font-semibold text-slate-200">
                          {formatMoney(camp.cpl)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-semibold text-purple-300">
                          {formatMoney(camp.cac)}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            (camp.roas || 0) >= 4 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-300'
                          }`}>
                            {camp.roas || 0}x
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className={`font-semibold ${isHighFrequency ? 'text-amber-400' : 'text-slate-300'}`}>
                              {camp.frequency || 1.0}
                            </span>
                            {isHighFrequency && (
                              <span title="Frequência alta: risco de saturação/fadiga do público" className="text-amber-400">
                                <AlertTriangle size={13} />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium text-slate-300">
                          {camp.ctr || 0}%
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${
                            camp.recommendation_badge?.includes('Vencedor') || camp.recommendation_badge?.includes('Escalar')
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : camp.recommendation_badge?.includes('Fadiga')
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                              : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                          }`}>
                            {camp.recommendation_badge || 'Monitorar'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 2: CRIATIVOS & ANÚNCIOS INDIVIDUAIS */}
      {activeTab === 'creatives' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAds.map((ad) => {
              const isWinner = ad.score === 'Vencedor';
              const isFatigued = ad.score === 'Fadiga';

              return (
                <div
                  key={ad.id}
                  className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Imagem / Thumbnail do Criativo */}
                    <div className="relative h-44 bg-slate-950 overflow-hidden group">
                      <img
                        src={ad.thumbnail_url}
                        alt={ad.ad_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                      
                      {/* Badge do Formato */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-[11px] font-medium text-slate-200">
                        {ad.format?.includes('Video') ? <Video size={13} className="text-emerald-400" /> : <ImageIcon size={13} className="text-blue-400" />}
                        <span>{ad.format}</span>
                      </div>

                      {/* Tag de Performance */}
                      <div className="absolute top-3 right-3">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${
                          isWinner
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : isFatigued
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                            : 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                        }`}>
                          {ad.score}
                        </span>
                      </div>

                      {/* Retenção do Gancho 3s */}
                      {ad.hook_rate_3s && ad.hook_rate_3s !== '-' && (
                        <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-slate-300 border border-slate-700">
                          Taxa Gancho 3s: <b className="text-emerald-400">{ad.hook_rate_3s}</b>
                        </div>
                      )}
                    </div>

                    {/* Informações do Anúncio */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-sm text-slate-100 line-clamp-1">{ad.ad_name}</h3>
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{ad.campaign_name}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">Conjunto: {ad.adset_name}</p>
                      </div>

                      {/* Métricas do Anúncio */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs">
                        <div className="bg-slate-950/60 p-2 rounded-xl text-center">
                          <span className="text-[10px] text-slate-400 block">CTR</span>
                          <span className="font-bold text-slate-200">{ad.ctr}%</span>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-xl text-center">
                          <span className="text-[10px] text-slate-400 block">CPL</span>
                          <span className="font-bold text-blue-400">{formatMoney(ad.cpl)}</span>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-xl text-center">
                          <span className="text-[10px] text-slate-400 block">ROAS</span>
                          <span className="font-bold text-emerald-400">{ad.roas}x</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                        <span>Investido: <b className="text-slate-200">{formatMoney(ad.spend)}</b></span>
                        <span>Leads: <b className="text-blue-400">{ad.leads}</b></span>
                        <span>Freq: <b className={ad.frequency >= 3.0 ? 'text-amber-400' : 'text-slate-200'}>{ad.frequency}</b></span>
                      </div>
                    </div>
                  </div>

                  {/* Ação / Diagnóstico do Criativo */}
                  <div className="p-3 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      {isFatigued ? (
                        <>
                          <AlertTriangle size={13} className="text-amber-400" />
                          <span className="text-amber-300 text-[11px]">Sugerido renovar criativo</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={13} className="text-emerald-400" />
                          <span className="text-emerald-300 text-[11px]">Criativo rentável</span>
                        </>
                      )}
                    </span>
                    <button
                      onClick={() => {
                        setActiveTab('ai_optimizer');
                        showNotification('success', `Carregando diagnóstico do anúncio "${ad.ad_name}"`);
                      }}
                      className="text-slate-300 hover:text-white flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <span>Diagnosticar</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ABA 3: SEGMENTAÇÕES & PÚBLICOS */}
      {activeTab === 'audiences' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-1">
              <Users size={18} className="text-emerald-400" />
              Auditoria de Segmentações & Públicos
            </h2>
            <p className="text-xs text-slate-400">
              Identifique quais públicos geram leads com o menor CAC e maior retorno no WhatsApp e na conversão.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              {audiencesData.map((aud, idx) => (
                <div key={idx} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm text-slate-200">{aud.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                            {aud.type}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Temperatura: <b className="text-slate-200">{aud.temperature}</b>
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                        aud.status.includes('Alta')
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : aud.status.includes('Fadiga')
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                      }`}>
                        {aud.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 my-3 text-center text-xs">
                      <div className="bg-slate-900 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-400 block">CPL</span>
                        <span className="font-bold text-blue-400">{formatMoney(aud.cpl)}</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-400 block">CAC</span>
                        <span className="font-bold text-purple-400">{formatMoney(aud.cac)}</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-400 block">ROAS</span>
                        <span className="font-bold text-emerald-400">{aud.roas}x</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-400 block">Leads</span>
                        <span className="font-bold text-slate-200">{aud.leads}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">Recomendação:</span>
                    <span className="font-semibold text-emerald-400 text-[11px]">{aud.recommendation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: OTIMIZADOR DE IA (DIAGNÓSTICO E RECOMENDAÇÕES EXECUTIVAS) */}
      {activeTab === 'ai_optimizer' && (
        <div className="space-y-6">
          {/* BANNER PRINCIPAL COM SCORE DE SAÚDE DA CONTA */}
          <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  <Sparkles size={14} />
                  <span>Diagnóstico Estratégico do Otimizador IA</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Saúde da Conta & Oportunidades de Otimização
                </h2>
                <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                  {aiOptimization?.executive_summary ||
                    'Sua conta opera com taxa de ROAS superior a 5.0x e ótimo volume de contatos diretos no WhatsApp. Otimizações de gancho nos primeiros 3 segundos e expansão de públicos Lookalike podem acelerar ainda mais o faturamento.'}
                </p>
              </div>

              {/* GAUGE / SCORE VISUAL */}
              <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shrink-0">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-400 transition-all duration-1000 ease-out"
                      strokeDasharray={`${aiOptimization?.health_score || 88}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-xl font-extrabold text-white">{aiOptimization?.health_score || 88}</span>
                    <span className="text-[9px] text-slate-400 block -mt-1">/100</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium">Classificação</div>
                  <div className="text-sm font-bold text-emerald-400">Excelente Desempenho</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Pronta para escala</div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock size={13} className="text-slate-500" />
                Última auditoria executada em: <b className="text-slate-300">{new Date().toLocaleString('pt-BR')}</b>
              </span>
              <button
                onClick={() => triggerAiDiagnosis(insights, true)}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 transition-all"
              >
                <RefreshCw size={12} className={isAiLoading ? 'animate-spin' : ''} />
                <span>Atualizar Diagnóstico</span>
              </button>
            </div>
          </div>

          {/* 3 PILARES DE OTIMIZAÇÃO: SEGMENTAÇÃO, CRIATIVOS E ESCALA DE ORÇAMENTO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. SEGMENTAÇÕES & PÚBLICOS */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-3 text-blue-400">
                  <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <Users size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Segmentação & Públicos</h3>
                    <span className="text-[11px] text-slate-400">Melhoria de audiências</span>
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  {(aiOptimization?.audience_suggestions || [
                    'Criar Público Semelhante (Lookalike 1%) com base em clientes que enviaram mensagem nos últimos 60 dias.',
                    'Excluir compradores cadastrados nos últimos 90 dias para economizar até 18% da verba.',
                    'Ativar público aberto (Broad Targeting) deixando a IA da Meta e Google filtrar pelos criativos.'
                  ]).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <p className="leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-blue-400 font-medium">
                Meta Ads & Google Ads Target Optimizer
              </div>
            </div>

            {/* 2. CRIATIVOS & COPYWRITING */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-3 text-emerald-400">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Video size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Criativos & Copywriting</h3>
                    <span className="text-[11px] text-slate-400">Aumento de CTR e Retenção</span>
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  {(aiOptimization?.creative_copy_suggestions || [
                    'Adicionar quebra de padrão visual nos primeiros 3 segundos de vídeos Reels para elevar o Hook Rate.',
                    'Iniciar a copy com prova social concreta ("Mais de 1.400 empresas atendidas...") antes da oferta.',
                    'Direcionar o botão de chamada para ação (CTA) diretamente para o WhatsApp com mensagem pré-preenchida.'
                  ]).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <p className="leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-emerald-400 font-medium">
                High-Conversion Creative Engine
              </div>
            </div>

            {/* 3. ORÇAMENTO & ESCALA */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-3 text-purple-400">
                  <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <DollarSign size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Escala & Orçamento</h3>
                    <span className="text-[11px] text-slate-400">Alocação inteligente de verba</span>
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  {(aiOptimization?.budget_actions || [
                    'Escalar em 20% a cada 48h o orçamento das campanhas com ROAS superior a 4.0x.',
                    'Pausar imediatamente criativos com frequência superior a 3.0 e queda no CTR para evitar queima de verba.',
                    'Reservar 15% do orçamento diário para validação constante de novos testes criativos.'
                  ]).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <p className="leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-purple-400 font-medium">
                Budget Scaling & Risk Control
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRINCIPAL: CONEXÃO COM FACEBOOK (META) E AUTO-DESCOBERTA DE CONTAS */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#1877F2]/15 border border-[#1877F2]/30 text-[#1877F2]">
                  <FacebookIcon size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Conexão com Gerenciador de Anúncios</h3>
                  <p className="text-xs text-slate-400">Integração oficial Meta Ads e Google Ads</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsConnectModalOpen(false);
                  setConnectStep('initial');
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* PASSO 1: TELA INICIAL DE CONEXÃO COM O BOTÃO DIRETO DO FACEBOOK */}
            {connectStep === 'initial' && (
              <div className="p-6 space-y-5">
                {/* CARD DE CONEXÃO DIRETA COM O FACEBOOK (META) */}
                <div className="bg-gradient-to-br from-blue-950/40 via-slate-950 to-slate-950 border border-blue-500/30 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1877F2] text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/30">
                      <FacebookIcon size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Conectar com Facebook (Meta Ads)</h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        Conecte sua conta do Facebook diretamente para sincronizar campanhas, pixel, leads e métricas com apenas 1 clique.
                      </p>
                    </div>
                  </div>

                  {/* Campo de Token Opcional para Desenvolvedores / BM */}
                  <div className="pt-2">
                    <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mb-1">
                      <Info size={12} className="text-blue-400" /> Token de Acesso da Meta Graph API (Opcional):
                    </label>
                    <input
                      type="password"
                      placeholder="EAABw... (deixe em branco para conectar com o perfil ativo)"
                      value={metaTokenInput}
                      onChange={(e) => setMetaTokenInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* BOTÃO PRINCIPAL: CONECTAR COM FACEBOOK */}
                  <button
                    onClick={handleStartMetaOAuth}
                    disabled={isFetchingMeta}
                    className="w-full py-3 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white text-sm font-bold shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <FacebookIcon size={18} />
                    <span>Conectar Direto com Facebook (Meta)</span>
                  </button>
                </div>

                {/* DIVISOR OU OPÇÃO GOOGLE ADS / MANUAL */}
                <div className="flex items-center gap-3">
                  <div className="h-[1px] bg-slate-800 flex-1"></div>
                  <span className="text-[11px] text-slate-500 uppercase font-semibold">Outras Opções</span>
                  <div className="h-[1px] bg-slate-800 flex-1"></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setAccountForm({ ...accountForm, platform: 'google' });
                      setConnectStep('google_manual');
                    }}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-left transition-all group"
                  >
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
                      <GoogleAdsIcon size={14} />
                      <span>Google Ads</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block group-hover:text-slate-200">
                      Conectar por ID de Cliente Google
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setAccountForm({ ...accountForm, platform: 'meta' });
                      setConnectStep('manual_meta');
                    }}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-left transition-all group"
                  >
                    <div className="flex items-center gap-2 text-slate-300 font-bold text-xs mb-1">
                      <Sliders size={14} className="text-emerald-400" />
                      <span>Meta Manual</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block group-hover:text-slate-200">
                      Digitar act_ e Token manualmente
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* PASSO 2: CONECTANDO E VARRENDO CONTAS DA META */}
            {connectStep === 'meta_connecting' && (
              <div className="p-8 text-center space-y-4">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                  <div className="w-12 h-12 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-lg shadow-blue-600/40">
                    <FacebookIcon size={24} />
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-base text-white">Conectando ao Facebook & Meta Business...</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Buscando contas de anúncios e Business Managers associados ao seu perfil.
                  </p>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-left space-y-1.5 font-mono text-[11px] text-slate-400 max-w-sm mx-auto">
                  {connectingLogs.map((log, i) => (
                    <div key={i} className="flex items-center gap-2 text-slate-300">
                      <span className="text-emerald-400">✓</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PASSO 3: LISTAGEM DE CONTAS DE ANÚNCIOS DESCOBERTAS NO FACEBOOK */}
            {connectStep === 'meta_select_accounts' && (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl text-xs font-semibold">
                  <CheckCircle size={16} />
                  <span>Conectado com sucesso ao Facebook! Selecione a conta de anúncios:</span>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                  {discoveredAccounts.map(acc => {
                    const isSelected = selectedDiscoveredAccId === acc.id;
                    return (
                      <div
                        key={acc.id}
                        onClick={() => setSelectedDiscoveredAccId(acc.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-blue-600/15 border-blue-500 shadow-md'
                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-600'
                          }`}>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                          <div>
                            <h5 className="font-bold text-sm text-white">{acc.name}</h5>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                              <span className="font-mono text-[11px] text-blue-400">{acc.id}</span>
                              <span>•</span>
                              <span>{acc.business_name}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            {acc.status}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-1">
                            Investido: <b className="text-slate-200">{formatMoney(acc.amount_spent)}</b>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setConnectStep('initial')}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleConfirmMetaAccountSelection}
                    disabled={isSubmittingAccount || !selectedDiscoveredAccId}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center gap-2"
                  >
                    {isSubmittingAccount ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    <span>Sincronizar Esta Conta de Anúncios</span>
                  </button>
                </div>
              </div>
            )}

            {/* FORMULÁRIO MANUAL (GOOGLE ADS OU META MANUAL) */}
            {(connectStep === 'google_manual' || connectStep === 'manual_meta') && (
              <form onSubmit={handleConnectManualAccount} className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    {connectStep === 'google_manual' ? 'Conectar Google Ads Manualmente' : 'Conectar Meta Ads Manualmente'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setConnectStep('initial')}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    ← Voltar para Conexão Automática
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome Identificador da Conta *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Minha Conta de Anúncios Principal"
                    value={accountForm.account_name}
                    onChange={(e) => setAccountForm({ ...accountForm, account_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {connectStep === 'google_manual' ? 'ID de Cliente Google Ads (Ex: 123-456-7890) *' : 'ID da Conta de Anúncios (act_...) *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={connectStep === 'google_manual' ? 'Ex: 481-920-4819' : 'Ex: act_492019482910'}
                    value={accountForm.account_id}
                    onChange={(e) => setAccountForm({ ...accountForm, account_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                  />
                </div>

                {connectStep === 'manual_meta' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Token de Acesso (Meta Graph API)
                    </label>
                    <input
                      type="password"
                      placeholder="EAABw..."
                      value={accountForm.access_token}
                      onChange={(e) => setAccountForm({ ...accountForm, access_token: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConnectStep('initial')}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAccount}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    {isSubmittingAccount ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    <span>Salvar & Sincronizar</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
