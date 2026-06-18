import React, { useState, useEffect } from 'react';
import api from '../api/api';
import {
  User, Bot, Clock, Sparkles, Database, MessageSquare,
  X, GripVertical, Edit2, Plus, Filter, Search, MoreHorizontal,
  ChevronRight, Calendar
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';

export default function CRMPage() {
  const { user } = useAuth();
  const niche = user?.niche || 'generic';
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/crm/kanban');
      // Garante colunas únicas por título (Prevenção de duplicatas visual)
      const uniqueCols = [];
      const titles = new Set();
      (res.data.columns || []).forEach(col => {
        if (!titles.has(col.title)) {
          titles.add(col.title);
          uniqueCols.push(col);
        }
      });
      setColumns(uniqueCols);
      setCards(res.data.cards);
    } catch (err) {
      console.error('Erro ao carregar Kanban:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = async () => {
    const name = window.prompt('Nome do Cliente:');
    if (!name) return;
    const phone = window.prompt('Número do WhatsApp (com DDD):');
    if (!phone) return;

    try {
      const firstCol = columns[0]?.id;
      await api.post('/crm/kanban/cards', {
        name,
        whatsapp_id: phone,
        column_id: firstCol
      });
      fetchData();
      alert('Lead criado com sucesso!');
    } catch (err) { alert('Erro ao criar lead'); }
  };

  const formatNumber = (whatsappId) => {
    let number = whatsappId.split('__')[1]?.split('@')[0] || whatsappId.split('@')[0];
    let cleaned = number.replace(/\D/g, '');
    if (cleaned.length > 11 && cleaned.startsWith('27')) cleaned = cleaned.substring(2);
    if (cleaned.length === 11 || cleaned.length === 10) cleaned = '55' + cleaned;
    if (cleaned.length === 13 && cleaned.startsWith('55')) return '+' + cleaned;
    return '+' + cleaned;
  };

  const handleDragStart = (e, cardId) => {
    e.dataTransfer.setData('cardId', cardId);
  };

  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    if (!cardId) return;

    // Otimista
    const oldCards = [...cards];
    setCards(cards.map(c => c.id === cardId ? { ...c, column_id: columnId } : c));

    try {
      await api.put(`/crm/kanban/cards/${cardId}`, { column_id: columnId });
    } catch (err) {
      setCards(oldCards);
      alert('Erro ao mover card');
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-6 animate-fade-in">
      {/* HEADER */}
      <div>
        <h2 className="text-3xl font-black text-white tracking-tight">
          {niche === 'automotivo' ? 'Fila de Veículos' :
            niche === 'varejo' ? 'Funil de Vendas' :
              niche === 'servicos' ? 'Gestão de Projetos' : 'CRM Kanban'}
        </h2>
        <p className="text-slate-500 text-sm">
          {niche === 'automotivo' ? 'Acompanhe veículos em orçamento e serviço.' :
            niche === 'varejo' ? 'Gestão de leads e conversão de vendas.' :
              niche === 'servicos' ? 'Acompanhamento de contratos e entregas.' : 'Gestão de funil de vendas e leads qualificados.'}
        </p>
      </div>
      <div className="flex gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-[#25D366] outline-none"
          />
        </div>
        <button
          onClick={handleAddLead}
          className="flex items-center gap-2 bg-[#25D366] text-black px-4 py-2 rounded-xl text-sm font-black hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus size={18} /> {niche === 'automotivo' ? 'NOVO VEÍCULO' : 'NOVO LEAD'}
        </button>
      </div>

      {/* KANBAN BOARD */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar snap-x">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          columns.map(col => {
            const colCards = cards.filter(c => c.column_id === col.id && (c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.whatsapp_id.includes(searchTerm)));

            return (
              <div
                key={col.id}
                onDrop={(e) => handleDrop(e, col.id)}
                onDragOver={handleDragOver}
                className="flex-none w-80 flex flex-col bg-[#0F172A]/50 border border-white/5 rounded-2xl overflow-hidden snap-center group"
              >
                {/* COLUMN HEADER */}
                <div className="p-4 flex justify-between items-center bg-white/5 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }}></div>
                    <h3 className="font-black text-sm text-white uppercase tracking-widest">{col.title}</h3>
                  </div>
                  <span className="text-[10px] bg-white/5 text-slate-500 px-2 py-0.5 rounded-full font-black">{colCards.length}</span>
                </div>

                {/* CARDS CONTAINER */}
                <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar min-h-[100px]">
                  {colCards.map(card => (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, card.id)}
                      className="bg-[#1E293B] hover:bg-[#253247] p-4 rounded-xl border border-white/5 shadow-xl cursor-grab active:cursor-grabbing transition-all hover:border-[#25D366]/30 group/card relative"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border-2 border-[#25D366]/20 flex items-center justify-center overflow-hidden shadow-lg shadow-black/40 group-hover:border-[#25D366]/50 transition-all">
                            {card.contact_photo ? (
                              <img src={card.contact_photo} className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-sm font-black text-slate-500 uppercase">
                                {(card.name || 'L').charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white group-hover:text-[#25D366] transition-colors leading-tight">
                              {(card.name || 'Sem Nome').split('_')[0].trim()} {niche === 'automotivo' && card.plate && <span className="text-[10px] text-slate-500 ml-1">({card.plate})</span>}
                            </h4>
                            <p className="text-[10px] text-[#25D366] font-black tracking-tighter mt-0.5">
                              +{formatNumber(card.whatsapp_id)}
                            </p>
                          </div>
                        </div>
                        <button className="p-1 hover:bg-white/5 rounded-lg text-slate-500"><MoreHorizontal size={14} /></button>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 italic mb-4 opacity-70 group-hover:opacity-100 transition-opacity">
                        "{card.last_message || 'Nenhuma mensagem recente'}"
                      </p>

                      <div className="flex items-center justify-between border-t border-white/5 pt-3">
                        <div className="flex -space-x-1.5">
                          {/* Tags Rendering */}
                          {Array.isArray(card.tags) && card.tags.map((tag, idx) => (
                            <div key={idx} className="px-2 py-0.5 bg-indigo-500/10 text-[7px] text-indigo-400 border border-indigo-500/20 rounded-md uppercase font-black tracking-tighter mr-1 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                              {tag}
                            </div>
                          ))}
                          {!card.tags?.length && <div className="p-1 bg-white/5 rounded-lg border border-white/10 text-[8px] text-slate-600 font-bold px-2">SEM ETIQUETAS</div>}
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold group-hover:text-slate-300 transition-colors">
                          <Calendar size={10} />
                          {formatDistanceToNow(new Date(card.updated_at), { locale: ptBR, addSuffix: true })}
                        </div>
                      </div>

                      {/* Quick Hover Action */}
                      <button className="absolute -right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#25D366] text-black rounded-lg shadow-xl opacity-0 translate-x-4 group-hover/card:opacity-100 group-hover/card:translate-x-0 transition-all flex items-center justify-center">
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  ))}

                  {colCards.length === 0 && (
                    <div className="h-20 border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center text-slate-700 text-xs font-bold uppercase tracking-widest">
                      Vazio
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  );
}
