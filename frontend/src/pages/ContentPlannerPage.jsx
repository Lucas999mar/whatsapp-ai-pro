import React, { useState, useEffect } from 'react';
import api from '../api/api';
import {
  Plus, Trash2, Edit2, Calendar, Tag, Clock, X,
  GripVertical, FileText, Layout, CheckCircle, AlertCircle, Save
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';

export default function ContentPlannerPage() {
  const { user } = useAuth();
  
  // State de Quadros
  const [boards, setBoards] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [newBoardName, setNewBoardName] = useState('');
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);

  // State do Quadro Atual (Colunas e Cards)
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modais de Criação/Edição
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [cardForm, setCardForm] = useState({
    id: '',
    column_id: '',
    title: '',
    description: '',
    due_date: '',
    tags: []
  });
  
  // Nova tag input temporária
  const [newTagInput, setNewTagInput] = useState('');

  // Carregar lista de quadros ao iniciar
  useEffect(() => {
    fetchBoards();
  }, []);

  // Carregar dados toda vez que o quadro selecionado mudar
  useEffect(() => {
    if (selectedBoardId) {
      fetchBoardData(selectedBoardId);
    } else {
      setColumns([]);
      setCards([]);
    }
  }, [selectedBoardId]);

  const fetchBoards = async () => {
    try {
      const res = await api.get('/content/boards');
      setBoards(res.data);
      if (res.data.length > 0 && !selectedBoardId) {
        setSelectedBoardId(res.data[0].id);
      }
    } catch (err) {
      console.error('Erro ao buscar quadros:', err);
    }
  };

  const fetchBoardData = async (boardId) => {
    setLoading(true);
    try {
      const res = await api.get(`/content/boards/${boardId}/data`);
      setColumns(res.data.columns || []);
      setCards(res.data.cards || []);
    } catch (err) {
      console.error('Erro ao buscar dados do quadro:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;

    try {
      const res = await api.post('/content/boards', { name: newBoardName });
      setBoards(prev => [res.data, ...prev]);
      setSelectedBoardId(res.data.id);
      setNewBoardName('');
      setShowNewBoardModal(false);
    } catch (err) {
      alert('Erro ao criar quadro: ' + err.message);
    }
  };

  const handleDeleteBoard = async () => {
    if (!selectedBoardId) return;
    const board = boards.find(b => b.id === selectedBoardId);
    if (!window.confirm(`Tem certeza que deseja apagar o quadro "${board?.name}" e todos os seus conteúdos?`)) return;

    try {
      await api.delete(`/content/boards/${selectedBoardId}`);
      const updated = boards.filter(b => b.id !== selectedBoardId);
      setBoards(updated);
      setSelectedBoardId(updated.length > 0 ? updated[0].id : '');
    } catch (err) {
      alert('Erro ao deletar quadro');
    }
  };

  const handleAddColumn = async () => {
    const title = window.prompt('Título da nova coluna:');
    if (!title || !title.trim()) return;

    try {
      const position = columns.length;
      const colors = ['#3b82f6', '#eab308', '#a855f7', '#25d366', '#ef4444', '#ec4899'];
      const randomColor = colors[position % colors.length];

      const res = await api.post('/content/columns', {
        board_id: selectedBoardId,
        title: title.trim(),
        color: randomColor,
        position
      });
      setColumns(prev => [...prev, res.data]);
    } catch (err) {
      alert('Erro ao criar coluna');
    }
  };

  const handleDeleteColumn = async (columnId) => {
    if (!window.confirm('Excluir esta coluna apagará todos os seus cards de conteúdo. Continuar?')) return;
    try {
      await api.delete(`/content/columns/${columnId}`);
      setColumns(prev => prev.filter(c => c.id !== columnId));
      setCards(prev => prev.filter(c => c.column_id !== columnId));
    } catch (err) {
      alert('Erro ao deletar coluna');
    }
  };

  // Drag and Drop de Cards
  const handleDragStart = (e, cardId) => {
    e.dataTransfer.setData('cardId', cardId);
  };

  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    if (!cardId) return;

    // Atualização otimista
    const oldCards = [...cards];
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, column_id: columnId } : c));

    try {
      await api.put(`/content/cards/${cardId}`, { column_id: columnId });
    } catch (err) {
      setCards(oldCards);
      alert('Erro ao mover card');
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  // Abrir Modal de Novo Card
  const handleOpenNewCardModal = (columnId) => {
    setSelectedCard(null);
    setCardForm({
      id: '',
      column_id: columnId,
      title: '',
      description: '',
      due_date: '',
      tags: []
    });
    setNewTagInput('');
    setShowCardModal(true);
  };

  // Abrir Modal de Edição de Card existente
  const handleOpenEditCardModal = (card) => {
    setSelectedCard(card);
    setCardForm({
      id: card.id,
      column_id: card.column_id,
      title: card.title,
      description: card.description || '',
      due_date: card.due_date ? format(new Date(card.due_date), "yyyy-MM-dd'T'HH:mm") : '',
      tags: Array.isArray(card.tags) ? card.tags : []
    });
    setNewTagInput('');
    setShowCardModal(true);
  };

  const handleSaveCard = async (e) => {
    e.preventDefault();
    if (!cardForm.title.trim()) return;

    try {
      const payload = {
        column_id: cardForm.column_id,
        title: cardForm.title.trim(),
        description: cardForm.description,
        due_date: cardForm.due_date ? new Date(cardForm.due_date).toISOString() : null,
        tags: cardForm.tags
      };

      if (selectedCard) {
        // Atualizar card existente
        const res = await api.put(`/content/cards/${cardForm.id}`, payload);
        setCards(prev => prev.map(c => c.id === cardForm.id ? res.data : c));
      } else {
        // Criar novo card
        const res = await api.post('/content/cards', payload);
        setCards(prev => [...prev, res.data]);
      }
      setShowCardModal(false);
    } catch (err) {
      alert('Erro ao salvar card');
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm('Tem certeza que deseja deletar este planejamento de conteúdo?')) return;
    try {
      await api.delete(`/content/cards/${cardId}`);
      setCards(prev => prev.filter(c => c.id !== cardId));
      setShowCardModal(false);
    } catch (err) {
      alert('Erro ao deletar card');
    }
  };

  const handleAddTag = () => {
    const tag = newTagInput.trim().toUpperCase();
    if (tag && !cardForm.tags.includes(tag)) {
      setCardForm(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setCardForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  const getDueDateStatus = (dueDateStr) => {
    if (!dueDateStr) return null;
    const dueDate = new Date(dueDateStr);
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    
    if (diff < 0) return { label: 'Atrasado', color: 'text-red-400 bg-red-400/10 border-red-500/20' };
    if (diff < 24 * 60 * 60 * 1000) return { label: 'Hoje', color: 'text-amber-400 bg-amber-400/10 border-amber-500/20' };
    return { label: format(dueDate, 'dd/MM/yyyy HH:mm'), color: 'text-slate-400 bg-white/5 border-white/5' };
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-6 animate-fade-in">
      
      {/* HEADER DO QUADRO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Layout className="text-[#25D366]" size={32} />
            Planejador de Conteúdos
          </h2>
          <p className="text-slate-500 text-sm">
            Gerencie ideias de posts, criativos e cronograma de publicação de mídias sociais.
          </p>
        </div>

        {/* CONTROLES DE QUADROS */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {boards.length > 0 && (
            <div className="flex items-center gap-2 bg-[#0F172A] px-3 py-2.5 rounded-xl border border-white/5 shadow-inner">
              <Layout size={16} className="text-[#25D366]" />
              <select
                className="outline-none bg-transparent text-slate-200 font-bold text-sm cursor-pointer"
                value={selectedBoardId}
                onChange={(e) => setSelectedBoardId(e.target.value)}
              >
                {boards.map(b => (
                  <option key={b.id} value={b.id} className="bg-slate-950 text-slate-200 font-bold">{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setShowNewBoardModal(true)}
            className="flex items-center justify-center p-2.5 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 rounded-xl hover:bg-[#25D366]/20 transition-all active:scale-95"
            title="Novo Quadro"
          >
            <Plus size={18} />
          </button>

          {selectedBoardId && (
            <button
              onClick={handleDeleteBoard}
              className="flex items-center justify-center p-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all active:scale-95"
              title="Excluir Quadro"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* QUADRO TRELLO */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : !selectedBoardId ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#0F172A]/30 border border-white/5 rounded-2xl">
          <Layout className="text-slate-600 mb-4 animate-bounce" size={64} />
          <h3 className="text-xl font-bold text-white mb-2">Nenhum Quadro Ativo</h3>
          <p className="text-slate-500 max-w-sm text-sm mb-6">
            Crie um novo quadro estilo Trello para organizar a produção de criativos e textos para a empresa.
          </p>
          <button
            onClick={() => setShowNewBoardModal(true)}
            className="bg-[#25D366] text-black px-6 py-3 rounded-xl font-black hover:brightness-110 active:scale-95 transition-all text-sm uppercase tracking-wider shadow-lg shadow-[#25D366]/10"
          >
            Criar Primeiro Quadro
          </button>
        </div>
      ) : (
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar snap-x items-start">
          {columns.map(col => {
            const colCards = cards.filter(c => c.column_id === col.id);

            return (
              <div
                key={col.id}
                onDrop={(e) => handleDrop(e, col.id)}
                onDragOver={handleDragOver}
                className="flex-none w-80 max-h-full flex flex-col bg-[#0F172A]/50 border border-white/5 rounded-2xl overflow-hidden snap-center group"
              >
                {/* CABEÇALHO DA COLUNA */}
                <div className="p-4 flex justify-between items-center bg-white/5 border-b border-white/5">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }}></div>
                    <h3 className="font-black text-sm text-white uppercase tracking-widest truncate">{col.title}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] bg-white/5 text-slate-500 px-2 py-0.5 rounded-full font-black">
                      {colCards.length}
                    </span>
                    <button
                      onClick={() => handleDeleteColumn(col.id)}
                      className="p-1 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Excluir Coluna"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>

                {/* CONTAINER DOS CARDS */}
                <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar min-h-[150px]">
                  {colCards.map(card => {
                    const dueStatus = getDueDateStatus(card.due_date);

                    return (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, card.id)}
                        onClick={() => handleOpenEditCardModal(card)}
                        className="bg-[#1E293B] hover:bg-[#253247] p-4 rounded-xl border border-white/5 shadow-xl cursor-grab active:cursor-grabbing transition-all hover:border-[#25D366]/30 group/card relative space-y-3"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-sm font-black text-white leading-snug group-hover:text-[#25D366] transition-colors line-clamp-2">
                            {card.title}
                          </h4>
                          <Edit2 size={12} className="text-slate-600 shrink-0 mt-0.5 group-hover:text-slate-400" />
                        </div>

                        {card.description && (
                          <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed opacity-80">
                            {card.description}
                          </p>
                        )}

                        {/* Informações Inferiores */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                          {/* Tags */}
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(card.tags) && card.tags.slice(0, 2).map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 bg-indigo-500/10 text-[8px] text-indigo-400 border border-indigo-500/20 rounded-md font-bold tracking-tighter uppercase"
                              >
                                {tag}
                              </span>
                            ))}
                            {Array.isArray(card.tags) && card.tags.length > 2 && (
                              <span className="px-1.5 py-0.5 bg-white/5 text-[8px] text-slate-500 rounded-md font-bold">
                                +{card.tags.length - 2}
                              </span>
                            )}
                          </div>

                          {/* Vencimento */}
                          {dueStatus && (
                            <div className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md border font-black truncate max-w-full ${dueStatus.color}`}>
                              <Clock size={10} />
                              {dueStatus.label}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {colCards.length === 0 && (
                    <div className="h-20 border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center text-slate-700 text-xs font-bold uppercase tracking-widest">
                      Vazio
                    </div>
                  )}

                  {/* ADICIONAR CARD */}
                  <button
                    onClick={() => handleOpenNewCardModal(col.id)}
                    className="w-full py-2 bg-white/5 hover:bg-[#25D366]/10 text-slate-500 hover:text-[#25D366] border border-dashed border-white/10 hover:border-[#25D366]/30 rounded-xl flex items-center justify-center gap-2 transition-all text-xs font-black uppercase tracking-wider active:scale-95"
                  >
                    <Plus size={14} /> Novo Card
                  </button>
                </div>
              </div>
            );
          })}

          {/* ADICIONAR COLUNA */}
          <button
            onClick={handleAddColumn}
            className="flex-none w-80 h-32 border-2 border-dashed border-white/10 hover:border-[#25D366]/30 bg-[#0F172A]/20 hover:bg-[#0F172A]/50 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:text-[#25D366] transition-all gap-2 font-black uppercase text-xs tracking-widest active:scale-[0.98]"
          >
            <Plus size={24} /> Adicionar Coluna
          </button>
        </div>
      )}

      {/* MODAL NOVO QUADRO */}
      {showNewBoardModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateBoard}
            className="w-full max-w-md bg-[#0F172A] border border-white/10 rounded-2xl p-6 shadow-2xl relative space-y-4"
          >
            <button
              type="button"
              onClick={() => setShowNewBoardModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Layout className="text-[#25D366]" size={20} /> Novo Quadro
            </h3>

            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Nome do Quadro</label>
              <input
                type="text"
                placeholder="Ex: Campanhas do Instagram, Blog lucas.ai..."
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#25D366] transition-colors"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#25D366] text-black font-black py-3 rounded-xl hover:brightness-110 active:scale-95 transition-all text-sm uppercase tracking-widest"
            >
              Criar Quadro
            </button>
          </form>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE CARD */}
      {showCardModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCard}
            className="w-full max-w-lg bg-[#0F172A] border border-white/10 rounded-2xl p-6 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <button
              type="button"
              onClick={() => setShowCardModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="text-[#25D366]" size={20} />
              {selectedCard ? 'Editar Card' : 'Novo Planejamento'}
            </h3>

            {/* TÍTULO */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Título do Conteúdo</label>
              <input
                type="text"
                placeholder="Ex: Post de lançamento do produto..."
                value={cardForm.title}
                onChange={(e) => setCardForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#25D366] transition-colors font-bold"
                required
              />
            </div>

            {/* DESCRIÇÃO */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Legenda / Briefing do Criativo</label>
              <textarea
                rows={4}
                placeholder="Escreva aqui o copy do post, briefing para o designer ou notas sobre a publicação..."
                value={cardForm.description}
                onChange={(e) => setCardForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#25D366] transition-colors custom-scrollbar resize-none text-sm leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* DATA DE VENCIMENTO */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar size={14} /> Data de Entrega
                </label>
                <input
                  type="datetime-local"
                  value={cardForm.due_date}
                  onChange={(e) => setCardForm(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#25D366] transition-colors text-sm"
                />
              </div>

              {/* COLUNA (SE FOR EDIÇÃO) */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Layout size={14} /> Coluna Atual
                </label>
                <select
                  value={cardForm.column_id}
                  onChange={(e) => setCardForm(prev => ({ ...prev, column_id: e.target.value }))}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-slate-300 focus:outline-none focus:border-[#25D366] transition-colors text-sm font-bold cursor-pointer"
                >
                  {columns.map(col => (
                    <option key={col.id} value={col.id} className="bg-slate-900 text-white">{col.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* TAGS */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Tag size={14} /> Etiquetas (Redes Sociais, Formatos)
              </label>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="EX: INSTAGRAM, BIO, YOUTUBE, STORIES"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                  className="flex-1 bg-[#1E293B] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#25D366] transition-colors text-xs uppercase"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="bg-[#25D366] text-black font-black px-4 rounded-xl text-xs uppercase hover:brightness-110 active:scale-95 transition-all"
                >
                  Adicionar
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {cardForm.tags.map(tag => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 text-[10px] text-indigo-400 border border-indigo-500/20 rounded-md font-black uppercase"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-indigo-400 hover:text-red-400"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* BOTÕES DE SALVAMENTO / EXCLUSÃO */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/5 justify-between">
              {selectedCard ? (
                <button
                  type="button"
                  onClick={() => handleDeleteCard(cardForm.id)}
                  className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-6 py-3 rounded-xl font-bold transition-all text-sm uppercase tracking-wider order-2 sm:order-1 active:scale-95"
                >
                  <Trash2 size={16} /> Excluir Card
                </button>
              ) : <div />}

              <div className="flex flex-col sm:flex-row gap-3 order-1 sm:order-2">
                <button
                  type="button"
                  onClick={() => setShowCardModal(false)}
                  className="bg-white/5 hover:bg-white/10 text-slate-400 px-6 py-3 rounded-xl font-bold transition-all text-sm uppercase tracking-wider active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 bg-[#25D366] text-black px-8 py-3 rounded-xl font-black transition-all text-sm uppercase tracking-wider shadow-lg shadow-[#25D366]/10 hover:brightness-110 active:scale-95"
                >
                  <Save size={16} /> Salvar Conteúdo
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
