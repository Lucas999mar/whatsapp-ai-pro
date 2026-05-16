import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  MessageCircle, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Trash2,
  ChevronRight,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/api';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function FollowUpPage() {
  const [date, setDate] = useState(new Date());
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [agents, setAgents] = useState([]);
  
  // New Follow-up State
  const [newFollowUp, setNewFollowUp] = useState({
    agentId: '',
    contactNumber: '',
    contactName: '',
    message: '',
    scheduledAt: format(new Date(), "yyyy-MM-dd'T'HH:mm")
  });

  useEffect(() => {
    fetchFollowUps();
    fetchAgents();
  }, []);

  const fetchFollowUps = async () => {
    try {
      const res = await api.get('/follow-ups');
      setFollowUps(res.data);
    } catch (err) {
      console.error('Erro ao buscar follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await api.get('/whatsapp/status');
      setAgents(res.data.agents || []);
      if (res.data.agents?.length > 0) {
        setNewFollowUp(prev => ({ ...prev, agentId: res.data.agents[0].id }));
      }
    } catch (err) {
      console.error('Erro ao buscar agentes:', err);
    }
  };

  const handleAddFollowUp = async (e) => {
    e.preventDefault();
    try {
      await api.post('/follow-ups', newFollowUp);
      setShowModal(false);
      fetchFollowUps();
      setNewFollowUp({
        agentId: agents[0]?.id || '',
        contactNumber: '',
        contactName: '',
        message: '',
        scheduledAt: format(new Date(), "yyyy-MM-dd'T'HH:mm")
      });
    } catch (err) {
      alert('Erro ao agendar follow-up: ' + err.message);
    }
  };

  const handleDeleteFollowUp = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;
    try {
      await api.delete(`/follow-ups/${id}`);
      fetchFollowUps();
    } catch (err) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const filteredFollowUps = followUps.filter(f => 
    isSameDay(parseISO(f.scheduled_at), date)
  );

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
        return <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 rounded-full border border-[#25D366]/20"><CheckCircle2 size={10} /> Enviado</span>;
      case 'failed':
        return <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20"><AlertCircle size={10} /> Falhou</span>;
      case 'pending':
        return <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20"><Clock size={10} /> Pendente</span>;
      default:
        return status;
    }
  };

  // Custom Calendar Tile Content
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const hasFollowUp = followUps.some(f => isSameDay(parseISO(f.scheduled_at), date));
      if (hasFollowUp) {
        return (
          <div className="flex justify-center mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#25D366] shadow-[0_0_8px_#25D366]"></div>
          </div>
        );
      }
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A]/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center shadow-lg shadow-[#25D366]/20">
            <CalendarIcon className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Follow-up Inteligente</h1>
            <p className="text-slate-400 text-sm font-medium">Gerencie seus agendamentos e reengajamentos</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-[#25D366] hover:bg-[#1fb355] text-[#0F172A] font-black rounded-2xl transition-all shadow-lg shadow-[#25D366]/20 active:scale-95 group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" />
          NOVO AGENDAMENTO
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Calendar Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0F172A]/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
            <style>{`
              .react-calendar {
                width: 100%;
                background: transparent;
                border: none;
                font-family: inherit;
                color: white;
              }
              .react-calendar__navigation button {
                color: white;
                font-weight: 800;
                font-size: 1.1rem;
              }
              .react-calendar__navigation button:hover {
                background: rgba(255,255,255,0.05);
                border-radius: 12px;
              }
              .react-calendar__month-view__weekdays {
                text-transform: uppercase;
                font-weight: 700;
                font-size: 0.7rem;
                color: #64748b;
                margin-bottom: 1rem;
              }
              .react-calendar__tile {
                padding: 1.2rem 0.5rem;
                border-radius: 14px;
                transition: all 0.2s;
                font-weight: 600;
                position: relative;
              }
              .react-calendar__tile:enabled:hover, .react-calendar__tile:enabled:focus {
                background: rgba(255,255,255,0.05);
              }
              .react-calendar__tile--now {
                background: rgba(37, 211, 102, 0.1) !important;
                color: #25D366 !important;
              }
              .react-calendar__tile--active {
                background: #25D366 !important;
                color: #0F172A !important;
                box-shadow: 0 8px 16px rgba(37, 211, 102, 0.3);
              }
              .react-calendar__tile--active:enabled:hover, .react-calendar__tile--active:enabled:focus {
                background: #25D366 !important;
              }
              .react-calendar__month-view__days__tile--neighboringMonth {
                color: #334155;
              }
            `}</style>
            <Calendar 
              onChange={setDate} 
              value={date} 
              locale="pt-BR"
              tileContent={tileContent}
            />
          </div>

          {/* Stats Summary */}
          <div className="bg-[#0F172A]/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
            <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-4">Resumo do Mês</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Total Pendente</p>
                <p className="text-2xl font-black text-amber-400">
                  {followUps.filter(f => f.status === 'pending').length}
                </p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Concluídos</p>
                <p className="text-2xl font-black text-[#25D366]">
                  {followUps.filter(f => f.status === 'sent').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#0F172A]/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-black text-white">
                  Agendamentos para {format(date, "dd 'de' MMMM", { locale: ptBR })}
                </h2>
                <p className="text-slate-500 text-sm">{filteredFollowUps.length} disparos programados</p>
              </div>
              <div className="p-2 bg-white/5 rounded-xl border border-white/5 text-slate-400">
                <Filter size={18} />
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#25D366]/20 border-t-[#25D366] rounded-full animate-spin"></div>
              </div>
            ) : filteredFollowUps.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-4 text-slate-700">
                  <CalendarIcon size={40} />
                </div>
                <p className="text-slate-400 font-bold">Nenhum follow-up para este dia</p>
                <p className="text-slate-600 text-sm mt-1">Que tal agendar um novo contato agora?</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFollowUps.map((item) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={item.id}
                    className="group bg-[#0B0F19]/60 p-5 rounded-2xl border border-white/5 hover:border-[#25D366]/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
                          <User size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-white group-hover:text-[#25D366] transition-colors">
                            {item.contact_name || item.contact_number}
                          </h4>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <Clock size={12} /> {format(parseISO(item.scheduled_at), "HH:mm")}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(item.status)}
                        <button 
                          onClick={() => handleDeleteFollowUp(item.id)}
                          className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-sm text-slate-300 italic">"{item.message}"</p>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Agente: {item.agent_id}</span>
                      <ChevronRight size={14} className="text-slate-700" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for New Follow-up */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-[#0F172A] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#25D366]/20 flex items-center justify-center text-[#25D366]">
                      <Plus size={24} />
                    </div>
                    <h3 className="text-xl font-black text-white">Agendar Novo Contato</h3>
                  </div>
                  <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors">
                    <Trash2 size={24} className="rotate-45" />
                  </button>
                </div>

                <form onSubmit={handleAddFollowUp} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Agente Emissor</label>
                      <select 
                        className="w-full bg-[#0B0F19] border border-white/5 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#25D366]/50 transition-colors"
                        value={newFollowUp.agentId}
                        onChange={(e) => setNewFollowUp({...newFollowUp, agentId: e.target.value})}
                        required
                      >
                        {agents.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Horário do Disparo</label>
                      <input 
                        type="datetime-local"
                        className="w-full bg-[#0B0F19] border border-white/5 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#25D366]/50 transition-colors"
                        value={newFollowUp.scheduledAt}
                        onChange={(e) => setNewFollowUp({...newFollowUp, scheduledAt: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Nome do Contato</label>
                      <input 
                        type="text"
                        placeholder="Ex: João da Silva"
                        className="w-full bg-[#0B0F19] border border-white/5 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#25D366]/50 transition-colors"
                        value={newFollowUp.contactName}
                        onChange={(e) => setNewFollowUp({...newFollowUp, contactName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Número (WhatsApp)</label>
                      <input 
                        type="text"
                        placeholder="5511999999999"
                        className="w-full bg-[#0B0F19] border border-white/5 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#25D366]/50 transition-colors"
                        value={newFollowUp.contactNumber}
                        onChange={(e) => setNewFollowUp({...newFollowUp, contactNumber: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Mensagem de Follow-up</label>
                    <textarea 
                      placeholder="Olá! Estava lembrando da nossa conversa..."
                      rows="4"
                      className="w-full bg-[#0B0F19] border border-white/5 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#25D366]/50 transition-colors resize-none"
                      value={newFollowUp.message}
                      onChange={(e) => setNewFollowUp({...newFollowUp, message: e.target.value})}
                      required
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-[#25D366] to-[#128C7E] text-[#0F172A] font-black rounded-2xl shadow-xl shadow-[#25D366]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    AGENDAR DISPARO
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
