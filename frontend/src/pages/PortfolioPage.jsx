import React, { useState, useEffect } from 'react';
import {
  Briefcase, Plus, FolderKanban, Layers, FileText, Share2,
  Copy, ExternalLink, Image as ImageIcon, Video, Trash2, Edit3,
  CheckCircle2, Sparkles, Eye, TrendingUp, Users, Search,
  ChevronRight, Send, X, UploadCloud, MessageSquare, DollarSign,
  Calendar, Building2, Tag, ShieldCheck
} from 'lucide-react';
import api from '../api/api';
import {
  MediaCardCover,
  MediaLightboxModal,
  parseMediaUrl,
  YouTubeIcon,
  InstagramIcon
} from '../components/portfolio/MediaRenderer';

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState('cases'); // 'cases' | 'niches' | 'services' | 'proposals'
  const [loading, setLoading] = useState(true);

  // Dados principais
  const [niches, setNiches] = useState([]);
  const [services, setServices] = useState([]);
  const [items, setItems] = useState([]);
  const [proposals, setProposals] = useState([]);

  // Token público do portfólio geral
  const [shareInfo, setShareInfo] = useState({ token: '', company_name: '', company_phone: '' });
  const [copiedLink, setCopiedLink] = useState('');

  // Modais de Criação / Edição
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [caseForm, setCaseForm] = useState({
    title: '',
    client_name: '',
    niche_name: '',
    service_name: '',
    description: '',
    results_metric: '',
    testimonial: '',
    media: [],
    tags: '',
    featured: false
  });

  const [isNicheModalOpen, setIsNicheModalOpen] = useState(false);
  const [editingNiche, setEditingNiche] = useState(null);
  const [nicheForm, setNicheForm] = useState({ name: '', description: '', icon: 'Briefcase' });

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({ name: '', category: 'Automação', description: '', price_estimate: '' });

  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [proposalForm, setProposalForm] = useState({
    client_name: '',
    client_company: '',
    client_phone: '',
    client_email: '',
    title: '',
    niche_name: '',
    selected_services: [],
    selected_portfolio_ids: [],
    intro_text: '',
    scope_text: '',
    investment_value: '',
    payment_terms: '50% de entrada + 50% na entrega',
    timeline: '15 a 30 dias úteis',
    notes: ''
  });

  // Filtros de busca na lista de cases
  const [filterNiche, setFilterNiche] = useState('');
  const [filterService, setFilterService] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload de mídia temporário
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaTypeInput, setMediaTypeInput] = useState('image');
  const [lightboxMedia, setLightboxMedia] = useState(null); // { list: [], index: 0, title: '' }

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [nRes, sRes, iRes, pRes, tokenRes] = await Promise.all([
        api.get('/portfolio/niches').catch(() => ({ data: [] })),
        api.get('/portfolio/services').catch(() => ({ data: [] })),
        api.get('/portfolio/items').catch(() => ({ data: [] })),
        api.get('/portfolio/proposals').catch(() => ({ data: [] })),
        api.get('/portfolio/share-token').catch(() => ({ data: { token: '' } }))
      ]);

      setNiches(nRes.data || []);
      setServices(sRes.data || []);
      setItems(iRes.data || []);
      setProposals(pRes.data || []);
      setShareInfo(tokenRes.data || { token: '' });
    } catch (err) {
      console.error('Erro ao buscar dados do portfólio:', err);
    } finally {
      setLoading(false);
    }
  };

  // URL pública do portfólio geral
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicPortfolioUrl = `${origin}/portfolio/share/${shareInfo.token}`;

  const copyToClipboard = (text, identifier) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedLink(identifier);
    setTimeout(() => setCopiedLink(''), 2500);
  };

  const shareOnWhatsApp = (text, phone = '') => {
    const encoded = encodeURIComponent(text);
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  // ── HANDLERS DE CASOS DE PORTFÓLIO ──
  const handleSaveCase = async (e) => {
    e.preventDefault();
    if (!caseForm.title) return alert('Informe o título do trabalho');

    const payload = {
      ...caseForm,
      tags: typeof caseForm.tags === 'string' ? caseForm.tags.split(',').map(t => t.trim()).filter(Boolean) : caseForm.tags
    };

    try {
      if (editingCase) {
        const res = await api.put(`/portfolio/items/${editingCase.id}`, payload);
        setItems(prev => prev.map(i => i.id === editingCase.id ? res.data : i));
      } else {
        const res = await api.post('/portfolio/items', payload);
        setItems(prev => [res.data, ...prev]);
      }
      setIsCaseModalOpen(false);
      setEditingCase(null);
      resetCaseForm();
    } catch (err) {
      alert('Erro ao salvar case de portfólio: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteCase = async (id) => {
    if (!confirm('Deseja realmente excluir este trabalho do portfólio?')) return;
    try {
      await api.delete(`/portfolio/items/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const handleEditCase = (item) => {
    setEditingCase(item);
    setCaseForm({
      title: item.title || '',
      client_name: item.client_name || '',
      niche_name: item.niche_name || '',
      service_name: item.service_name || '',
      description: item.description || '',
      results_metric: item.results_metric || '',
      testimonial: item.testimonial || '',
      media: Array.isArray(item.media) ? item.media : [],
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
      featured: Boolean(item.featured)
    });
    setIsCaseModalOpen(true);
  };

  const resetCaseForm = () => {
    setCaseForm({
      title: '',
      client_name: '',
      niche_name: '',
      service_name: '',
      description: '',
      results_metric: '',
      testimonial: '',
      media: [],
      tags: '',
      featured: false
    });
  };

  // Upload de arquivo de mídia
  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data.url;
      const isVideo = file.type.startsWith('video');
      setCaseForm(prev => ({
        ...prev,
        media: [...prev.media, { type: isVideo ? 'video' : 'image', url, caption: file.name }]
      }));
    } catch (err) {
      alert('Erro ao fazer upload da mídia. Você também pode colar uma URL direta abaixo.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleAddMediaUrl = () => {
    if (!mediaUrlInput.trim()) return;
    const parsed = parseMediaUrl(mediaUrlInput);
    setCaseForm(prev => ({
      ...prev,
      media: [
        ...prev.media,
        {
          type: parsed.type,
          url: mediaUrlInput.trim(),
          caption: parsed.type === 'youtube'
            ? (parsed.isShorts ? 'YouTube Shorts (9:16)' : 'Vídeo YouTube')
            : parsed.type === 'instagram'
            ? 'Instagram Reel (9:16)'
            : parsed.type === 'video'
            ? 'Vídeo Direto'
            : 'Imagem'
        }
      ]
    }));
    setMediaUrlInput('');
  };

  // ── HANDLERS DE NICHOS ──
  const handleSaveNiche = async (e) => {
    e.preventDefault();
    if (!nicheForm.name) return alert('Informe o nome do nicho');

    try {
      if (editingNiche) {
        const res = await api.put(`/portfolio/niches/${editingNiche.id}`, nicheForm);
        setNiches(prev => prev.map(n => n.id === editingNiche.id ? res.data : n));
      } else {
        const res = await api.post('/portfolio/niches', nicheForm);
        setNiches(prev => [res.data, ...prev]);
      }
      setIsNicheModalOpen(false);
      setEditingNiche(null);
      setNicheForm({ name: '', description: '', icon: 'Briefcase' });
    } catch (err) {
      alert('Erro ao salvar nicho: ' + err.message);
    }
  };

  const handleDeleteNiche = async (id) => {
    if (!confirm('Deseja excluir este nicho?')) return;
    try {
      await api.delete(`/portfolio/niches/${id}`);
      setNiches(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  // ── HANDLERS DE SERVIÇOS ──
  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!serviceForm.name) return alert('Informe o nome do serviço');

    try {
      if (editingService) {
        const res = await api.put(`/portfolio/services/${editingService.id}`, serviceForm);
        setServices(prev => prev.map(s => s.id === editingService.id ? res.data : s));
      } else {
        const res = await api.post('/portfolio/services', serviceForm);
        setServices(prev => [res.data, ...prev]);
      }
      setIsServiceModalOpen(false);
      setEditingService(null);
      setServiceForm({ name: '', category: 'Automação', description: '', price_estimate: '' });
    } catch (err) {
      alert('Erro ao salvar serviço: ' + err.message);
    }
  };

  const handleDeleteService = async (id) => {
    if (!confirm('Deseja excluir este tipo de serviço?')) return;
    try {
      await api.delete(`/portfolio/services/${id}`);
      setServices(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  // ── HANDLERS DE PROPOSTAS ──
  const handleSaveProposal = async (e) => {
    e.preventDefault();
    if (!proposalForm.client_name) return alert('Informe o nome do cliente');

    try {
      const res = await api.post('/portfolio/proposals', proposalForm);
      setProposals(prev => [res.data, ...prev]);
      setIsProposalModalOpen(false);
      resetProposalForm();
      alert('🎉 Proposta Comercial criada com sucesso! O link exclusivo já está pronto para envio.');
    } catch (err) {
      alert('Erro ao criar proposta: ' + err.message);
    }
  };

  const handleDeleteProposal = async (id) => {
    if (!confirm('Deseja excluir esta proposta?')) return;
    try {
      await api.delete(`/portfolio/proposals/${id}`);
      setProposals(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const resetProposalForm = () => {
    setProposalForm({
      client_name: '',
      client_company: '',
      client_phone: '',
      client_email: '',
      title: '',
      niche_name: '',
      selected_services: [],
      selected_portfolio_ids: [],
      intro_text: '',
      scope_text: '',
      investment_value: '',
      payment_terms: '50% de entrada + 50% na entrega',
      timeline: '15 a 30 dias úteis',
      notes: ''
    });
  };

  // Filtragem dos cases de portfólio
  const filteredItems = items.filter(item => {
    if (filterNiche && item.niche_name !== filterNiche) return false;
    if (filterService && item.service_name !== filterService) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchClient = item.client_name?.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      return matchTitle || matchClient || matchDesc;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ─────────────────────────────────────────────────────────────
          CABEÇALHO & BARRA DE AÇÕES RÁPIDAS
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 bg-emerald-500/20 text-[#25D366] rounded-xl border border-emerald-500/30">
                <Briefcase size={22} />
              </span>
              <span className="text-xs uppercase font-black tracking-widest text-[#25D366]">
                Módulo Comercial Integrado
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Portfólio de Serviços & Propostas Comerciais
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
              Organize seus cases com fotos e vídeos, alimente os nichos que sua empresa atende, gerencie tipos de serviços e gere propostas personalizadas para enviar aos seus clientes via WhatsApp com 1 clique.
            </p>
          </div>

          {/* Botões de Compartilhamento do Portfólio Geral */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => copyToClipboard(publicPortfolioUrl, 'portfolio-general')}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 text-white hover:bg-white/15 border border-white/10 transition-all flex items-center gap-2 shadow-sm"
              title="Copiar link do portfólio completo"
            >
              <Copy size={16} />
              <span>{copiedLink === 'portfolio-general' ? '✓ Link Copiado!' : 'Copiar Portfólio Geral'}</span>
            </button>

            <button
              onClick={() => {
                const text = `Olá! Conheça nosso portfólio completo de serviços e cases de sucesso:\n\n${publicPortfolioUrl}\n\nFicamos à disposição para tirar qualquer dúvida!`;
                shareOnWhatsApp(text);
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#25D366] text-slate-950 hover:bg-[#20ba5a] transition-all flex items-center gap-2 shadow-md font-sans"
            >
              <Send size={16} />
              <span>Enviar no WhatsApp</span>
            </button>

            <a
              href={`/portfolio/share/${shareInfo.token}`}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl border border-white/10 transition-all"
              title="Visualizar como cliente"
            >
              <ExternalLink size={18} />
            </a>
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5">
            <span className="text-[11px] text-slate-400 uppercase font-bold block">Cases Cadastrados</span>
            <span className="text-2xl font-black text-white mt-1 block">{items.length}</span>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5">
            <span className="text-[11px] text-slate-400 uppercase font-bold block">Nichos Atendidos</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">{niches.length}</span>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5">
            <span className="text-[11px] text-slate-400 uppercase font-bold block">Tipos de Serviços</span>
            <span className="text-2xl font-black text-blue-400 mt-1 block">{services.length}</span>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5">
            <span className="text-[11px] text-slate-400 uppercase font-bold block">Propostas Enviadas</span>
            <span className="text-2xl font-black text-amber-400 mt-1 block">{proposals.length}</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          NAVEGAÇÃO POR ABAS (TABS)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        {[
          { id: 'cases', label: '📁 Portfólio & Cases (Trabalhos Feitos)', count: items.length },
          { id: 'niches', label: '🎯 Nichos de Atuação', count: niches.length },
          { id: 'services', label: '🛠️ Tipos de Serviços que Fazemos', count: services.length },
          { id: 'proposals', label: '📝 Propostas Comerciais Geradas', count: proposals.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === tab.id ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-white/10 text-slate-300'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ABA 1: PORTFÓLIO DE CASES (FOTOS, VÍDEOS & RESULTADOS)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'cases' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/70 p-4 rounded-2xl border border-white/5">
            {/* Filtros e Busca */}
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por cliente, título..."
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={filterNiche}
                onChange={(e) => setFilterNiche(e.target.value)}
                className="bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Todos os Nichos</option>
                {niches.map(n => <option key={n.id} value={n.name}>{n.name}</option>)}
              </select>

              <select
                value={filterService}
                onChange={(e) => setFilterService(e.target.value)}
                className="bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Todos os Serviços</option>
                {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>

            <button
              onClick={() => {
                resetCaseForm();
                setEditingCase(null);
                setIsCaseModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Plus size={16} />
              <span>+ Novo Case / Trabalho</span>
            </button>
          </div>

          {/* Grid de Itens do Portfólio */}
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-white/5 space-y-3">
              <span className="text-4xl block">📁</span>
              <h3 className="font-bold text-white text-base">Nenhum trabalho cadastrado no portfólio</h3>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                Adicione fotos, vídeos e resultados dos serviços que sua empresa já realizou para encantar novos clientes e anexar nas propostas.
              </p>
              <button
                onClick={() => {
                  resetCaseForm();
                  setIsCaseModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-500 text-slate-950 text-xs font-bold rounded-xl mt-2"
              >
                + Cadastrar Primeiro Case
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className="bg-slate-900/80 border border-white/10 rounded-3xl overflow-hidden hover:border-emerald-500/40 transition-all flex flex-col justify-between group shadow-lg"
                >
                  <div>
                    {/* Imagem / Mídia de Capa */}
                    <div className="h-52 bg-slate-950 relative overflow-hidden">
                      <MediaCardCover
                        media={item.media}
                        title={item.title}
                        onClick={() => {
                          if (item.media && item.media.length > 0) {
                            setLightboxMedia({
                              list: item.media,
                              index: 0,
                              title: item.title
                            });
                          }
                        }}
                      />

                      {/* Badges sobre a capa */}
                      <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap z-10 pointer-events-none">
                        {item.niche_name && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm">
                            {item.niche_name}
                          </span>
                        )}
                        {item.service_name && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 text-blue-400 border border-blue-500/30 backdrop-blur-sm">
                            {item.service_name}
                          </span>
                        )}
                      </div>

                      {item.media && item.media.length > 1 && (
                        <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 text-white backdrop-blur-sm z-10 pointer-events-none">
                          +{item.media.length - 1} mídias
                        </span>
                      )}
                    </div>

                    {/* Conteúdo do Card */}
                    <div className="p-5 space-y-3">
                      <div>
                        {item.client_name && (
                          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                            Cliente: {item.client_name}
                          </span>
                        )}
                        <h3 className="font-bold text-white text-base mt-0.5 line-clamp-1">{item.title}</h3>
                      </div>

                      {item.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      {/* Métrica / Resultado alcançado */}
                      {item.results_metric && (
                        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-400 font-bold">
                          <TrendingUp size={16} />
                          <span>{item.results_metric}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações do Card */}
                  <div className="p-4 bg-slate-950/60 border-t border-white/5 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        const text = `Confira esse case de sucesso: *${item.title}*\n${item.description || ''}\n${item.results_metric ? 'Resultado: ' + item.results_metric + '\n' : ''}\nVeja mais no nosso portfólio: ${publicPortfolioUrl}`;
                        shareOnWhatsApp(text);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-1.5 transition-all"
                      title="Compartilhar no WhatsApp"
                    >
                      <Share2 size={14} />
                      <span>WhatsApp</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditCase(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                        title="Editar"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteCase(item.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ABA 2: NICHOS DE ATUAÇÃO
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'niches' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-900/70 p-4 rounded-2xl border border-white/5">
            <div>
              <h3 className="font-bold text-white text-base">Nichos de Mercado que Trabalhamos</h3>
              <p className="text-slate-400 text-xs">Cadastre os segmentos onde sua agência/empresa atua para segmentar o portfólio e usar nas propostas.</p>
            </div>
            <button
              onClick={() => {
                setEditingNiche(null);
                setNicheForm({ name: '', description: '', icon: 'Briefcase' });
                setIsNicheModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md"
            >
              <Plus size={16} />
              <span>+ Novo Nicho</span>
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {niches.map(niche => {
              const caseCount = items.filter(i => i.niche_name === niche.name || i.niche_id === niche.id).length;
              return (
                <div key={niche.id} className="bg-slate-900/80 border border-white/10 p-5 rounded-2xl space-y-3 hover:border-emerald-500/30 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-lg">
                        🎯
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/5 text-slate-300 border border-white/10">
                        {caseCount} case(s)
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-base mt-3">{niche.name}</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{niche.description || 'Sem descrição cadastrada'}</p>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-400 font-semibold">
                      Disponível em propostas
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingNiche(niche);
                          setNicheForm({ name: niche.name, description: niche.description || '', icon: niche.icon || 'Briefcase' });
                          setIsNicheModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteNiche(niche.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ABA 3: TIPOS DE SERVIÇOS QUE FAZEMOS
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-900/70 p-4 rounded-2xl border border-white/5">
            <div>
              <h3 className="font-bold text-white text-base">Catálogo de Serviços Prestados</h3>
              <p className="text-slate-400 text-xs">Cadastre cada serviço que sua empresa faz para selecionar rapidamente ao montar uma proposta.</p>
            </div>
            <button
              onClick={() => {
                setEditingService(null);
                setServiceForm({ name: '', category: 'Automação', description: '', price_estimate: '' });
                setIsServiceModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md"
            >
              <Plus size={16} />
              <span>+ Novo Serviço</span>
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map(service => (
              <div key={service.id} className="bg-slate-900/80 border border-white/10 p-5 rounded-2xl space-y-3 hover:border-blue-500/30 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {service.category || 'Serviço'}
                    </span>
                    {service.price_estimate > 0 && (
                      <span className="text-xs font-bold text-white">
                        A partir de R$ {parseFloat(service.price_estimate).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-white text-base mt-2">{service.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{service.description || 'Sem descrição cadastrada'}</p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-blue-400 font-semibold">
                    ✓ Selecionável nas propostas
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingService(service);
                        setServiceForm({
                          name: service.name,
                          category: service.category || 'Geral',
                          description: service.description || '',
                          price_estimate: service.price_estimate || ''
                        });
                        setIsServiceModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ABA 4: PROPOSTAS COMERCIAIS PERSONALIZADAS
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'proposals' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/70 p-4 rounded-2xl border border-white/5">
            <div>
              <h3 className="font-bold text-white text-base">Propostas Comerciais Personalizadas</h3>
              <p className="text-slate-400 text-xs">Crie propostas interativas com o nome do cliente, nicho, serviços inclusos e portfólio de cases comprovados.</p>
            </div>
            <button
              onClick={() => {
                resetProposalForm();
                setIsProposalModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Plus size={16} />
              <span>+ Nova Proposta Comercial</span>
            </button>
          </div>

          {proposals.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-white/5 space-y-3">
              <span className="text-4xl block">📝</span>
              <h3 className="font-bold text-white text-base">Nenhuma proposta gerada ainda</h3>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                Crie sua primeira proposta com o Nome do Cliente, selecione o Nicho e os Serviços, e gere um link público elegante para mandar no WhatsApp!
              </p>
              <button
                onClick={() => {
                  resetProposalForm();
                  setIsProposalModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-500 text-slate-950 text-xs font-bold rounded-xl mt-2"
              >
                + Criar Minha Primeira Proposta
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {proposals.map(proposal => {
                const publicProposalUrl = `${origin}/proposta/share/${proposal.share_token}`;
                return (
                  <div
                    key={proposal.id}
                    className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 space-y-4 hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-lg"
                  >
                    <div>
                      {/* Topo do Card de Proposta */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-white">{proposal.client_name}</span>
                            {proposal.client_company && (
                              <span className="text-xs text-slate-400 font-medium">({proposal.client_company})</span>
                            )}
                          </div>
                          <p className="text-xs text-emerald-400 font-bold mt-0.5">{proposal.title}</p>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          proposal.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : proposal.status === 'viewed'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {proposal.status === 'approved' ? '✓ Aprovada' : proposal.status === 'viewed' ? '👁️ Visualizada' : '📨 Enviada'}
                        </span>
                      </div>

                      {/* Nicho & Valor */}
                      <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-white/5 text-xs">
                        {proposal.niche_name && (
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-bold">Nicho</span>
                            <span className="font-bold text-slate-300">{proposal.niche_name}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Investimento</span>
                          <span className="font-black text-white text-sm">
                            {proposal.investment_value > 0
                              ? `R$ ${parseFloat(proposal.investment_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : 'Sob Consulta'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Visualizações</span>
                          <span className="font-bold text-slate-400">{proposal.views || 0} visualização(ões)</span>
                        </div>
                      </div>

                      {/* Serviços Selecionados */}
                      {proposal.selected_services && proposal.selected_services.length > 0 && (
                        <div className="mt-3">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold mb-1.5">Serviços Inclusos:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {proposal.selected_services.map((s, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/5 text-slate-300 border border-white/10">
                                ✓ {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Botões de Compartilhamento & Ações da Proposta */}
                    <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(publicProposalUrl, `prop-${proposal.id}`)}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                          <Copy size={14} />
                          <span>{copiedLink === `prop-${proposal.id}` ? '✓ Copiado!' : 'Copiar Link'}</span>
                        </button>

                        <button
                          onClick={() => {
                            const text = `Olá, *${proposal.client_name}*! Preparamos uma proposta comercial exclusiva para você, incluindo escopo detalhado e nosso portfólio de cases comprovados no seu nicho.\n\nAcesse no link abaixo:\n${publicProposalUrl}\n\nFicamos à disposição para fecharmos essa parceria!`;
                            shareOnWhatsApp(text, proposal.client_phone);
                          }}
                          className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <Send size={14} />
                          <span>Enviar WhatsApp</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <a
                          href={`/proposta/share/${proposal.share_token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
                          title="Abrir como cliente"
                        >
                          <ExternalLink size={16} />
                        </a>
                        <button
                          onClick={() => handleDeleteProposal(proposal.id)}
                          className="p-2 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10"
                          title="Excluir proposta"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CRIAR / EDITAR CASE DE PORTFÓLIO
      ───────────────────────────────────────────────────────────── */}
      {isCaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-white text-lg">
                {editingCase ? 'Editar Case de Portfólio' : 'Novo Case de Sucesso no Portfólio'}
              </h3>
              <button onClick={() => setIsCaseModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCase} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Título do Trabalho *</label>
                  <input
                    type="text"
                    required
                    value={caseForm.title}
                    onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })}
                    placeholder="Ex: Campanha de Aquisição de Pacientes"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome do Cliente / Marca</label>
                  <input
                    type="text"
                    value={caseForm.client_name}
                    onChange={(e) => setCaseForm({ ...caseForm, client_name: e.target.value })}
                    placeholder="Ex: Dr. Roberto / Odonto Prime"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nicho de Atuação</label>
                  <select
                    value={caseForm.niche_name}
                    onChange={(e) => setCaseForm({ ...caseForm, niche_name: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white"
                  >
                    <option value="">Selecione o Nicho...</option>
                    {niches.map(n => <option key={n.id} value={n.name}>{n.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo de Serviço</label>
                  <select
                    value={caseForm.service_name}
                    onChange={(e) => setCaseForm({ ...caseForm, service_name: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white"
                  >
                    <option value="">Selecione o Serviço...</option>
                    {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descrição do Trabalho Realizado</label>
                <textarea
                  rows={3}
                  value={caseForm.description}
                  onChange={(e) => setCaseForm({ ...caseForm, description: e.target.value })}
                  placeholder="Explique o desafio do cliente, o que foi feito e os diferenciais aplicados..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Resultado / Métrica de Sucesso</label>
                  <input
                    type="text"
                    value={caseForm.results_metric}
                    onChange={(e) => setCaseForm({ ...caseForm, results_metric: e.target.value })}
                    placeholder="Ex: +320% de novos agendamentos em 30 dias"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tags (separadas por vírgula)</label>
                  <input
                    type="text"
                    value={caseForm.tags}
                    onChange={(e) => setCaseForm({ ...caseForm, tags: e.target.value })}
                    placeholder="Ex: Tráfego, WhatsApp, Alta Conversão"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* SEÇÃO DE FOTOS & VÍDEOS */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ImageIcon size={16} className="text-emerald-400" />
                    <span>Fotos & Vídeos do Portfólio</span>
                  </span>
                  <span className="text-[11px] text-slate-400">Total: {caseForm.media.length}</span>
                </div>

                {/* Lista de Mídias Já Adicionadas */}
                {caseForm.media.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {caseForm.media.map((m, idx) => {
                      const p = parseMediaUrl(m.url, m.type);
                      return (
                        <div key={idx} className="relative rounded-xl overflow-hidden border border-white/10 h-24 bg-slate-900 group shadow-md">
                          {p.type === 'youtube' ? (
                            <div className="w-full h-full relative">
                              <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <YouTubeIcon className="w-6 h-6 text-red-500" />
                              </div>
                              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/80 text-[9px] text-white rounded font-mono font-bold">
                                {p.isShorts ? 'Shorts 9:16' : '16:9'}
                              </span>
                            </div>
                          ) : p.type === 'instagram' ? (
                            <div className="w-full h-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex flex-col items-center justify-center text-white p-1 text-center">
                              <InstagramIcon className="w-6 h-6" />
                              <span className="text-[10px] font-bold mt-1">Reels 9:16</span>
                            </div>
                          ) : p.type === 'video' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-xs text-slate-400 font-bold bg-slate-950 gap-1">
                              <Video size={18} className="text-emerald-400" />
                              <span className="text-[10px]">Vídeo</span>
                            </div>
                          ) : (
                            <img
                              src={p.url}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => setCaseForm(prev => ({ ...prev, media: prev.media.filter((_, i) => i !== idx) }))}
                            className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-500 text-white rounded-md text-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow"
                            title="Remover mídia"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Opções de Upload ou URL Direta */}
                <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Upload Direto do Computador:</label>
                    <label className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-white/20 hover:border-emerald-500 cursor-pointer text-xs text-slate-300 bg-white/5">
                      <UploadCloud size={16} />
                      <span>{uploadingMedia ? 'Enviando...' : 'Escolher Foto ou Vídeo'}</span>
                      <input type="file" accept="image/*,video/*" onChange={handleUploadFile} className="hidden" />
                    </label>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Ou cole URL (YouTube, Instagram Reels, Imagem):
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="url"
                        value={mediaUrlInput}
                        onChange={(e) => setMediaUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddMediaUrl();
                          }
                        }}
                        placeholder="https://instagram.com/reel/... ou https://youtube.com/..."
                        className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-emerald-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddMediaUrl}
                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-bold transition-all shadow"
                      >
                        + Add
                      </button>
                    </div>

                    {/* Dica de detecção em tempo real */}
                    {mediaUrlInput && (
                      <div className="mt-1.5 text-[10px] flex items-center gap-1.5">
                        {(() => {
                          const p = parseMediaUrl(mediaUrlInput);
                          if (p.type === 'youtube') {
                            return (
                              <span className="text-red-400 font-bold flex items-center gap-1">
                                <YouTubeIcon className="w-3 h-3 text-red-500" />
                                <span>YouTube detectado ({p.isShorts ? 'Shorts 9:16' : 'Formato 16:9'})</span>
                              </span>
                            );
                          }
                          if (p.type === 'instagram') {
                            return (
                              <span className="text-pink-400 font-bold flex items-center gap-1">
                                <InstagramIcon className="w-3 h-3 text-pink-400" />
                                <span>Instagram {p.isReel ? 'Reel detectado (Formato 9:16)' : 'detectado'}</span>
                              </span>
                            );
                          }
                          if (p.type === 'video') {
                            return (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <Video size={12} />
                                <span>Vídeo direto detectado</span>
                              </span>
                            );
                          }
                          return (
                            <span className="text-blue-400 font-bold flex items-center gap-1">
                              <ImageIcon size={12} />
                              <span>Link de Imagem</span>
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCaseModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-md"
                >
                  Salvar Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CRIAR / EDITAR NICHO
      ───────────────────────────────────────────────────────────── */}
      {isNicheModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-white text-base">
                {editingNiche ? 'Editar Nicho de Atuação' : 'Novo Nicho de Atuação'}
              </h3>
              <button onClick={() => setIsNicheModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNiche} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome do Nicho *</label>
                <input
                  type="text"
                  required
                  value={nicheForm.name}
                  onChange={(e) => setNicheForm({ ...nicheForm, name: e.target.value })}
                  placeholder="Ex: Clínicas & Médicos, Restaurantes, Imóveis..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descrição dos diferenciais</label>
                <textarea
                  rows={3}
                  value={nicheForm.description}
                  onChange={(e) => setNicheForm({ ...nicheForm, description: e.target.value })}
                  placeholder="Por que sua empresa é especialista nesse nicho?..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsNicheModalOpen(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl"
                >
                  Salvar Nicho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CRIAR / EDITAR SERVIÇO
      ───────────────────────────────────────────────────────────── */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-white text-base">
                {editingService ? 'Editar Serviço' : 'Novo Tipo de Serviço Prestado'}
              </h3>
              <button onClick={() => setIsServiceModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome do Serviço *</label>
                <input
                  type="text"
                  required
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  placeholder="Ex: Gestão de Tráfego Pago, Automação de WhatsApp..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Categoria</label>
                  <input
                    type="text"
                    value={serviceForm.category}
                    onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                    placeholder="Ex: Marketing, Vendas"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Preço Sugerido (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={serviceForm.price_estimate}
                    onChange={(e) => setServiceForm({ ...serviceForm, price_estimate: e.target.value })}
                    placeholder="0,00"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">O que está incluso</label>
                <textarea
                  rows={3}
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  placeholder="Detalhamento do serviço para constar nas propostas..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl"
                >
                  Salvar Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CRIAR NOVA PROPOSTA COMERCIAL PERSONALIZADA
      ───────────────────────────────────────────────────────────── */}
      {isProposalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="font-bold text-white text-lg">Criar Proposta Comercial com Portfólio</h3>
                <p className="text-xs text-slate-400">Personalize para o cliente com os nichos e serviços que fazemos.</p>
              </div>
              <button onClick={() => setIsProposalModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProposal} className="space-y-4">
              {/* DADOS DO CLIENTE */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  👤 Dados do Cliente & Contato
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome do Cliente *</label>
                    <input
                      type="text"
                      required
                      value={proposalForm.client_name}
                      onChange={(e) => setProposalForm({
                        ...proposalForm,
                        client_name: e.target.value,
                        title: proposalForm.title || `Proposta Comercial — ${e.target.value}`
                      })}
                      placeholder="Ex: Rodrigo Mendonça"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Empresa / Marca</label>
                    <input
                      type="text"
                      value={proposalForm.client_company}
                      onChange={(e) => setProposalForm({ ...proposalForm, client_company: e.target.value })}
                      placeholder="Ex: Clínica Sorriso VIP"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">WhatsApp do Cliente</label>
                    <input
                      type="text"
                      value={proposalForm.client_phone}
                      onChange={(e) => setProposalForm({ ...proposalForm, client_phone: e.target.value })}
                      placeholder="Ex: 5511999999999"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nicho do Cliente</label>
                    <select
                      value={proposalForm.niche_name}
                      onChange={(e) => setProposalForm({ ...proposalForm, niche_name: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="">Selecione o Nicho correspondente...</option>
                      {niches.map(n => <option key={n.id} value={n.name}>{n.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* SELEÇÃO DOS TIPOS DE SERVIÇOS QUE FAZEMOS */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                    🛠️ Selecione os Serviços Propostos
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {proposalForm.selected_services.length} selecionado(s)
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-2 pt-1 max-h-40 overflow-y-auto pr-1">
                  {services.map(s => {
                    const isSelected = proposalForm.selected_services.includes(s.name);
                    return (
                      <label
                        key={s.id}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-blue-500/10 border-blue-500 text-white font-bold'
                            : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{s.name}</span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setProposalForm({
                                ...proposalForm,
                                selected_services: [...proposalForm.selected_services, s.name]
                              });
                            } else {
                              setProposalForm({
                                ...proposalForm,
                                selected_services: proposalForm.selected_services.filter(name => name !== s.name)
                              });
                            }
                          }}
                          className="rounded text-blue-500"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* SELEÇÃO DE CASES DE PORTFÓLIO A INCLUIR NA PROPOSTA */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                    📁 Cases do Portfólio a Anexar na Proposta
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {proposalForm.selected_portfolio_ids.length} case(s) anexado(s)
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-2 pt-1 max-h-36 overflow-y-auto pr-1">
                  {items.map(item => {
                    const isSelected = proposalForm.selected_portfolio_ids.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-purple-500/10 border-purple-500 text-white font-bold'
                            : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <span className="block truncate">{item.title}</span>
                          <span className="text-[10px] text-slate-500">{item.niche_name || 'Geral'}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setProposalForm({
                                ...proposalForm,
                                selected_portfolio_ids: [...proposalForm.selected_portfolio_ids, item.id]
                              });
                            } else {
                              setProposalForm({
                                ...proposalForm,
                                selected_portfolio_ids: proposalForm.selected_portfolio_ids.filter(id => id !== item.id)
                              });
                            }
                          }}
                          className="rounded text-purple-500"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* VALORES E PRAZOS */}
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Investimento Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={proposalForm.investment_value}
                    onChange={(e) => setProposalForm({ ...proposalForm, investment_value: e.target.value })}
                    placeholder="0,00"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Forma de Pagamento</label>
                  <input
                    type="text"
                    value={proposalForm.payment_terms}
                    onChange={(e) => setProposalForm({ ...proposalForm, payment_terms: e.target.value })}
                    placeholder="Ex: 50% entrada + 50% entrega"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Prazo Estimado</label>
                  <input
                    type="text"
                    value={proposalForm.timeline}
                    onChange={(e) => setProposalForm({ ...proposalForm, timeline: e.target.value })}
                    placeholder="Ex: 15 a 30 dias úteis"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Escopo & Detalhes da Proposta</label>
                <textarea
                  rows={3}
                  value={proposalForm.scope_text}
                  onChange={(e) => setProposalForm({ ...proposalForm, scope_text: e.target.value })}
                  placeholder="Descreva as etapas, entregáveis e cronograma de implementação..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsProposalModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-md"
                >
                  Gerar Proposta & Link Público
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DE VISUALIZAÇÃO DE MÍDIA / LIGHTBOX ── */}
      {lightboxMedia && (
        <MediaLightboxModal
          isOpen={!!lightboxMedia}
          mediaList={lightboxMedia.list}
          initialIndex={lightboxMedia.index}
          title={lightboxMedia.title}
          onClose={() => setLightboxMedia(null)}
        />
      )}
    </div>
  );
}

