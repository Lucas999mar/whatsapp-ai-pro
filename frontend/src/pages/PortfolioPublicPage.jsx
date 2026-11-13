import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Briefcase, MessageSquare, Send, ExternalLink, Image as ImageIcon,
  Video, TrendingUp, Sparkles, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import api from '../api/api';

export default function PortfolioPublicPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  // Filtros públicos
  const [selectedNiche, setSelectedNiche] = useState('ALL');
  const [selectedMediaPreview, setSelectedMediaPreview] = useState(null);

  useEffect(() => {
    async function loadPortfolio() {
      try {
        setLoading(true);
        const res = await api.get(`/portfolio/public/showcase/${token}`);
        setData(res.data);
      } catch (err) {
        setError('Portfólio não encontrado ou link expirado.');
      } finally {
        setLoading(false);
      }
    }
    if (token) loadPortfolio();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">
            Carregando Portfólio de Serviços...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 text-center">
        <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-md w-full space-y-4">
          <span className="text-4xl block">🔍</span>
          <h2 className="text-xl font-bold text-white">Portfólio não encontrado</h2>
          <p className="text-slate-400 text-xs">{error || 'O link de acesso pode estar incorreto.'}</p>
        </div>
      </div>
    );
  }

  const { company, niches = [], services = [], items = [] } = data;

  const filteredItems = items.filter(item => {
    if (selectedNiche === 'ALL') return true;
    return item.niche_name === selectedNiche || item.niche_id === selectedNiche;
  });

  const openWhatsApp = (customMsg = '') => {
    const phone = company.phone ? company.phone.replace(/\D/g, '') : '';
    const defaultMsg = `Olá! Vi o portfólio da *${company.name}* e gostaria de solicitar uma proposta comercial.`;
    const msg = encodeURIComponent(customMsg || defaultMsg);
    const url = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 font-sans selection:bg-emerald-500/30">
      {/* ── BARRA SUPERIOR FIXA / HEADER ── */}
      <header className="sticky top-0 z-40 bg-[#0B0F19]/80 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {company.logo ? (
              <img src={company.logo} alt={company.name} className="w-10 h-10 rounded-full object-cover border border-emerald-500/30" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                {company.name?.charAt(0) || 'P'}
              </div>
            )}
            <div>
              <span className="text-xs uppercase font-bold text-emerald-400 block tracking-wider">Portfólio Oficial</span>
              <h1 className="text-base font-black text-white tracking-tight leading-none">{company.name}</h1>
            </div>
          </div>

          <button
            onClick={() => openWhatsApp()}
            className="px-4 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
          >
            <Send size={15} />
            <span className="hidden sm:inline">Falar no WhatsApp</span>
            <span className="sm:hidden">WhatsApp</span>
          </button>
        </div>
      </header>

      {/* ── HERO BANNER ── */}
      <section className="relative overflow-hidden py-16 px-4 sm:px-8 bg-gradient-to-b from-slate-900 via-slate-900/60 to-transparent border-b border-white/5">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles size={14} />
            Trabalhos Realizados & Resultados Comprovados
          </span>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Nossos Serviços & Cases de Sucesso
          </h2>

          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Conheça abaixo alguns dos projetos, automações e campanhas que já entregamos para empresas de diversos nichos de mercado.
          </p>

          {/* Nichos Atendidos */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
            <span className="text-xs text-slate-500 font-bold mr-2">Nichos atendidos:</span>
            {niches.map(n => (
              <span key={n.id} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/5 text-slate-300 border border-white/10">
                ✓ {n.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FILTROS POR NICHO ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-4">
          <button
            onClick={() => setSelectedNiche('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedNiche === 'ALL'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-white/10'
            }`}
          >
            Todos os Nichos ({items.length})
          </button>

          {niches.map(n => {
            const count = items.filter(i => i.niche_name === n.name || i.niche_id === n.id).length;
            return (
              <button
                key={n.id}
                onClick={() => setSelectedNiche(n.name)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedNiche === n.name
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                {n.name} ({count})
              </button>
            );
          })}
        </div>

        {/* ── GRID DE CASES ── */}
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center bg-slate-900/40 rounded-3xl border border-white/5 space-y-2">
            <span className="text-3xl block">📁</span>
            <p className="text-slate-400 text-sm">Nenhum case cadastrado neste nicho ainda.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-xl group"
              >
                <div>
                  {/* Capa com fotos / vídeo */}
                  <div
                    onClick={() => {
                      if (item.media && item.media.length > 0) {
                        setSelectedMediaPreview(item.media[0]);
                      }
                    }}
                    className="h-52 bg-slate-950 relative overflow-hidden cursor-pointer"
                  >
                    {item.media && item.media.length > 0 ? (
                      item.media[0].type === 'video' ? (
                        <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
                          <video src={item.media[0].url} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="w-12 h-12 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-lg shadow-lg">
                              ▶
                            </span>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={item.media[0].url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <ImageIcon size={32} />
                      </div>
                    )}

                    {/* Badges sobrepostas */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      {item.niche_name && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-950/80 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm">
                          {item.niche_name}
                        </span>
                      )}
                      {item.service_name && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-950/80 text-blue-400 border border-blue-500/30 backdrop-blur-sm">
                          {item.service_name}
                        </span>
                      )}
                    </div>

                    {item.media && item.media.length > 1 && (
                      <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 text-white backdrop-blur-sm">
                        +{item.media.length - 1} foto(s)
                      </span>
                    )}
                  </div>

                  {/* Informações */}
                  <div className="p-6 space-y-3">
                    {item.client_name && (
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                        Cliente: {item.client_name}
                      </span>
                    )}
                    <h3 className="font-bold text-white text-lg leading-snug">{item.title}</h3>

                    {item.description && (
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                        {item.description}
                      </p>
                    )}

                    {item.results_metric && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-400 font-bold">
                        <TrendingUp size={16} />
                        <span>{item.results_metric}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-950/60 border-t border-white/5 flex items-center justify-between">
                  <button
                    onClick={() => openWhatsApp(`Olá! Vi o case *${item.title}* no portfólio de vocês e gostaria de algo semelhante para minha empresa.`)}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-all"
                  >
                    <span>Quero um resultado assim</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── SERVIÇOS QUE OFERECEMOS ── */}
      {services.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 py-16 border-t border-white/5">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <h3 className="text-2xl font-black text-white">Todos os Nossos Serviços</h3>
            <p className="text-xs text-slate-400">Soluções completas com metodologia comprovada.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map(s => (
              <div key={s.id} className="bg-slate-900 border border-white/10 p-5 rounded-2xl space-y-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {s.category || 'Serviço'}
                </span>
                <h4 className="font-bold text-white text-sm">{s.name}</h4>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{s.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── BANNER FINAL DE CONTATO ── */}
      <footer className="bg-slate-900 border-t border-white/10 py-12 px-4 sm:px-8 text-center space-y-4">
        <h3 className="text-2xl font-black text-white">Pronto para acelerar os resultados do seu negócio?</h3>
        <p className="text-slate-400 text-xs max-w-md mx-auto">
          Converse diretamente conosco no WhatsApp e solicite um diagnóstico personalizado.
        </p>
        <button
          onClick={() => openWhatsApp()}
          className="px-6 py-3 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-black rounded-2xl text-sm inline-flex items-center gap-2 shadow-xl"
        >
          <Send size={18} />
          <span>Falar com um Especialista Agora</span>
        </button>
      </footer>

      {/* ── MODAL DE VISUALIZAÇÃO DE MÍDIA / LIGHTBOX ── */}
      {selectedMediaPreview && (
        <div
          onClick={() => setSelectedMediaPreview(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedMediaPreview(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 font-bold p-2 text-sm flex items-center gap-1"
            >
              <X size={20} />
              <span>Fechar</span>
            </button>
            {selectedMediaPreview.type === 'video' ? (
              <video src={selectedMediaPreview.url} controls autoPlay className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl" />
            ) : (
              <img src={selectedMediaPreview.url} alt="" className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
