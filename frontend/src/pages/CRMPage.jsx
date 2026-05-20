import React, { useState, useEffect } from 'react';
import api from '../api/api';
import {
  User, Bot, Clock, Sparkles, Database, MessageSquare,
  X, GripVertical, Edit2, Plus, Filter, Search, MoreHorizontal,
  ChevronRight, Calendar
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CRMPage() {
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">CRM Kanban</h2>
          <p className="text-slate-500 text-sm">Gestão de funil de vendas e leads qualificados.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-[#25D366] outline-none"
            />
          </div>
          <button
            onClick={handleAddLead}
            className="flex items-center gap-2 bg-[#25D366] text-black px-4 py-2 rounded-xl text-sm font-black hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus size={18} /> NOVO LEAD
          </button>
        </div>
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
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center text-xs font-black text-white">
                            {(card.name || 'L').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white truncate max-w-[140px]">
                              {(card.name || 'Sem Nome').split('_')[0].trim()}
                            </h4>
                            <p className="text-[10px] text-[#25D366] font-bold">
                              +{card.whatsapp_id.split('__')[1]?.split('@')[0] || card.whatsapp_id.split('@')[0]}
                            </p>
                          </div>
                        </div>
                        <button className="p-1 hover:bg-white/5 rounded-lg text-slate-500"><MoreHorizontal size={14} /></button>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 italic mb-4">"{card.last_message || 'Nenhuma mensagem recente'}"</p>

                      <div className="flex items-center justify-between border-t border-white/5 pt-3">
                        <div className="flex -space-x-2">
                          {/* Tags Rendering */}
                          {Array.isArray(card.tags) && card.tags.map((tag, idx) => (
                            <div key={idx} className="px-2 py-0.5 bg-blue-500/10 text-[8px] text-blue-400 border border-blue-500/20 rounded mr-1 uppercase font-black">
                              {tag}
                            </div>
                          ))}
                          {!card.tags?.length && <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10"></div>}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                          <Calendar size={12} />
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
