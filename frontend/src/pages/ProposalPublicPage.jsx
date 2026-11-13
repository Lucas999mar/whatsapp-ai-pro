import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText, CheckCircle2, Send, ExternalLink, Image as ImageIcon,
  Video, TrendingUp, Sparkles, Clock, DollarSign, ShieldCheck,
  Building2, User, ChevronRight, X, AlertCircle
} from 'lucide-react';
import api from '../api/api';

export default function ProposalPublicPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    async function loadProposal() {
      try {
        setLoading(true);
        const res = await api.get(`/portfolio/public/proposal/${token}`);
        setData(res.data);
        if (res.data?.proposal?.status === 'approved') {
          setIsApproved(true);
        }
      } catch (err) {
        setError('Proposta não encontrada ou link expirado.');
      } finally {
        setLoading(false);
      }
    }
    if (token) loadProposal();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">
            Carregando Proposta Comercial...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 text-center">
        <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-md w-full space-y-4">
          <span className="text-4xl block">📄</span>
          <h2 className="text-xl font-bold text-white">Proposta não encontrada</h2>
          <p className="text-slate-400 text-xs">{error || 'O link de acesso pode estar incorreto.'}</p>
        </div>
      </div>
    );
  }

  const { proposal, portfolio_items = [], company } = data;

  const handleAcceptProposal = async () => {
    setAccepting(true);
    try {
      await api.post(`/portfolio/public/proposal/${token}/respond`, { action: 'approve' });
      setIsApproved(true);

      const phone = company.phone ? company.phone.replace(/\D/g, '') : '';
      const msg = encodeURIComponent(
        `Olá! Eu sou *${proposal.client_name}* e aprovei a proposta comercial (*${proposal.title}*)! Gostaria de avançar com os próximos passos.`
      );
      const url = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
      window.open(url, '_blank');
    } catch (err) {
      alert('Erro ao registrar aceite da proposta.');
    } finally {
      setAccepting(false);
    }
  };

  const handleAskQuestion = () => {
    const phone = company.phone ? company.phone.replace(/\D/g, '') : '';
    const msg = encodeURIComponent(
      `Olá! Eu sou *${proposal.client_name}*, estou analisando a proposta (*${proposal.title}*) e gostaria de tirar algumas dúvidas.`
    );
    const url = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 font-sans selection:bg-emerald-500/30">
      {/* ── BARRA SUPERIOR FIXA ── */}
      <header className="sticky top-0 z-40 bg-[#0B0F19]/80 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {company.logo ? (
              <img src={company.logo} alt={company.name} className="w-10 h-10 rounded-full object-cover border border-emerald-500/30" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                {company.name?.charAt(0) || 'P'}
              </div>
            )}
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">Apresentação Comercial</span>
              <h1 className="text-sm font-black text-white tracking-tight leading-none">{company.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isApproved ? (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 size={16} />
                <span>Proposta Aprovada</span>
              </span>
            ) : (
              <button
                onClick={handleAcceptProposal}
                disabled={accepting}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-all"
              >
                <CheckCircle2 size={15} />
                <span>{accepting ? 'Confirmando...' : 'Aprovar Proposta'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO DA PROPOSTA PERSONALIZADA ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10 space-y-10">
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/20 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ✨ Proposta Especialmente Preparada
              </span>
              {proposal.niche_name && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/5 text-slate-300 border border-white/10">
                  Nicho: {proposal.niche_name}
                </span>
              )}
            </div>

            <div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Cliente / Empresa:</span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-1">
                {proposal.client_name}
                {proposal.client_company && (
                  <span className="text-emerald-400 font-bold block sm:inline sm:ml-3 text-2xl sm:text-4xl">
                    ({proposal.client_company})
                  </span>
                )}
              </h2>
            </div>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl pt-2">
              {proposal.title}
            </p>

            {proposal.intro_text && (
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5 text-xs text-slate-300 leading-relaxed mt-4">
                {proposal.intro_text}
              </div>
            )}
          </div>
        </div>

        {/* ── SERVIÇOS INCLUSOS NA PROPOSTA ── */}
        {proposal.selected_services && proposal.selected_services.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                <CheckCircle2 size={20} />
              </span>
              <div>
                <h3 className="text-xl font-black text-white">Serviços Inclusos nesta Proposta</h3>
                <p className="text-xs text-slate-400">Soluções selecionadas para atender exatamente às necessidades do seu negócio.</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {proposal.selected_services.map((serviceName, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/90 border border-white/10 p-5 rounded-2xl flex items-start gap-3 hover:border-blue-500/40 transition-all"
                >
                  <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="font-bold text-white text-base">{serviceName}</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Execução completa com acompanhamento e métricas de desempenho.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── PORTFÓLIO & CASES ANEXADOS À PROPOSTA ── */}
        {portfolio_items.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Sparkles size={20} />
              </span>
              <div>
                <h3 className="text-xl font-black text-white">Nosso Portfólio & Cases de Sucesso</h3>
                <p className="text-xs text-slate-400">Resultados reais já entregues para empresas semelhantes à sua.</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolio_items.map(item => (
                <div
                  key={item.id}
                  className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden hover:border-emerald-500/40 transition-all shadow-xl group"
                >
                  <div
                    onClick={() => {
                      if (item.media && item.media.length > 0) {
                        setSelectedMedia(item.media[0]);
                      }
                    }}
                    className="h-44 bg-slate-950 relative overflow-hidden cursor-pointer"
                  >
                    {item.media && item.media.length > 0 ? (
                      item.media[0].type === 'video' ? (
                        <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
                          <video src={item.media[0].url} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
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
                        <ImageIcon size={28} />
                      </div>
                    )}

                    {item.results_metric && (
                      <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black text-[10px] shadow-md">
                        {item.results_metric}
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    {item.client_name && (
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">
                        Cliente: {item.client_name}
                      </span>
                    )}
                    <h4 className="font-bold text-white text-sm line-clamp-1">{item.title}</h4>
                    {item.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── ESCOPO & DETALHES ── */}
        {proposal.scope_text && (
          <section className="bg-slate-900 border border-white/10 p-6 sm:p-8 rounded-3xl space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText size={18} className="text-emerald-400" />
              <span>Escopo & Cronograma de Entrega</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {proposal.scope_text}
            </p>
          </section>
        )}

        {/* ── INVESTIMENTO & CONDIÇÕES ── */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-emerald-500/30 p-6 sm:p-10 rounded-3xl shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <span className="text-xs uppercase font-bold text-emerald-400 block tracking-wider">Investimento Total</span>
              <h3 className="text-3xl sm:text-4xl font-black text-white mt-1">
                {proposal.investment_value > 0
                  ? `R$ ${parseFloat(proposal.investment_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  : 'Valor sob Consulta'}
              </h3>
            </div>

            <div className="space-y-1 text-left sm:text-right">
              <span className="text-xs text-slate-400 block">Condições de Pagamento:</span>
              <span className="text-xs sm:text-sm font-bold text-white block">
                {proposal.payment_terms || 'À vista ou parcelado'}
              </span>
              {proposal.timeline && (
                <span className="text-xs text-emerald-400 font-semibold block">
                  Prazo: {proposal.timeline}
                </span>
              )}
            </div>
          </div>

          {/* Botões de Decisão */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <button
              onClick={handleAskQuestion}
              className="w-full sm:w-auto px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Send size={16} />
              <span>Tirar Dúvidas no WhatsApp</span>
            </button>

            {isApproved ? (
              <div className="w-full sm:w-auto px-6 py-3.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold rounded-2xl text-xs flex items-center justify-center gap-2">
                <CheckCircle2 size={18} />
                <span>Esta proposta já foi aprovada com sucesso!</span>
              </div>
            ) : (
              <button
                onClick={handleAcceptProposal}
                disabled={accepting}
                className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-2xl text-sm flex items-center justify-center gap-2 shadow-xl transition-all"
              >
                <CheckCircle2 size={18} />
                <span>{accepting ? 'Confirmando...' : '✓ Aceitar Proposta Agora'}</span>
              </button>
            )}
          </div>
        </section>
      </div>

      {/* ── MODAL LIGHTBOX DE MÍDIA ── */}
      {selectedMedia && (
        <div
          onClick={() => setSelectedMedia(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute -top-10 right-0 text-white font-bold text-sm flex items-center gap-1"
            >
              <X size={20} />
              <span>Fechar</span>
            </button>
            {selectedMedia.type === 'video' ? (
              <video src={selectedMedia.url} controls autoPlay className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl" />
            ) : (
              <img src={selectedMedia.url} alt="" className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

