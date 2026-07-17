import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import {
  Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock,
  MapPin, Phone, User, Trash2, Edit3, X, Save, CheckCircle,
  AlertCircle, ExternalLink, CalendarDays, Loader2, Share2, Link, Copy, Check
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AgendaPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contact_name: '',
    contact_phone: '',
    appointment_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '10:00',
    location: '',
    status: 'scheduled'
  });
  const [saving, setSaving] = useState(false);

  // Share States
  const [shareToken, setShareToken] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMode, setShareMode] = useState('month'); // 'month', 'day', 'single'
  const [shareAppointmentId, setShareAppointmentId] = useState(null);
  const [shareSelectedMonths, setShareSelectedMonths] = useState([]);
  const [copied, setCopied] = useState(false);

  const availableMonths = React.useMemo(() => {
    const monthsSet = new Set();
    monthsSet.add(format(currentMonth, 'yyyy-MM'));
    monthsSet.add(format(new Date(), 'yyyy-MM'));
    const now = new Date();
    for (let i = 1; i <= 4; i++) {
      monthsSet.add(format(addMonths(now, i), 'yyyy-MM'));
    }
    appointments.forEach(app => {
      if (app.appointment_date) {
        monthsSet.add(app.appointment_date.substring(0, 7));
      }
    });
    return Array.from(monthsSet).sort();
  }, [appointments, currentMonth]);

  const formatMonthName = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    const formatted = format(date, "MMMM 'de' yyyy", { locale: ptBR });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const toggleShareMonth = (monthStr) => {
    setShareSelectedMonths(prev => {
      if (prev.includes(monthStr)) {
        return prev.filter(m => m !== monthStr);
      } else {
        return [...prev, monthStr];
      }
    });
    setCopied(false);
  };

  const parseDescription = (desc) => {
    if (!desc) return { text: '', author: '' };
    const authorMatch = desc.match(/\[(?:Criado|Atualizado) por: ([^\]]+)\]/);
    if (authorMatch) {
      const author = authorMatch[1];
      const text = desc.replace(/\[(?:Criado|Atualizado) por: [^\]]+\]\s*/g, '').trim();
      return { text, author };
    }
    return { text: desc, author: '' };
  };

  useEffect(() => {
    fetchAppointments();
  }, [currentMonth]);

  useEffect(() => {
    fetchShareToken();
  }, []);

  const fetchShareToken = async () => {
    try {
      const res = await api.get('/agenda/share-token');
      setShareToken(res.data.token);
    } catch (err) {
      console.error('Erro ao buscar token de compartilhamento:', err);
    }
  };

  const getShareUrl = () => {
    if (!shareToken) return '';
    const base = window.location.origin;
    let url = `${base}/agenda/share/${shareToken}`;
    const params = new URLSearchParams();

    if (shareMode === 'day') {
      params.set('mode', 'day');
      params.set('date', format(selectedDate, 'yyyy-MM-dd'));
    } else if (shareMode === 'single' && shareAppointmentId) {
      params.set('mode', 'single');
      params.set('id', shareAppointmentId);
    } else {
      params.set('mode', 'month');
      if (shareSelectedMonths.length > 0) {
        params.set('months', shareSelectedMonths.join(','));
      }
    }

    return `${url}?${params.toString()}`;
  };

  const copyShareLink = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const openShareModal = (mode, appointmentId = null) => {
    setShareMode(mode);
    setShareAppointmentId(appointmentId);
    setCopied(false);
    if (mode === 'month') {
      const currentViewStr = format(currentMonth, 'yyyy-MM');
      setShareSelectedMonths([currentViewStr]);
    }
    setShowShareModal(true);
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      // Lista todos os compromissos para exibição no calendário do mês
      const res = await api.get('/agenda');
      setAppointments(res.data || []);
    } catch (err) {
      console.error('Erro ao buscar agenda:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Calendar logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const dateInterval = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Dias em branco no início do grid (para alinhar com o dia da semana correto)
  const startDayOfWeek = getDay(monthStart); // 0 = Domingo, 1 = Segunda, etc.
  const emptyDays = Array.from({ length: startDayOfWeek }, (_, i) => null);

  const allDays = [...emptyDays, ...dateInterval];

  const getAppointmentsForDate = (date) => {
    return appointments.filter(app => isSameDay(new Date(app.appointment_date + 'T00:00:00'), date));
  };

  const openNewModal = (date = selectedDate) => {
    setEditingAppointment(null);
    setFormData({
      title: '',
      description: '',
      contact_name: '',
      contact_phone: '',
      appointment_date: format(date, 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: '10:00',
      location: '',
      status: 'scheduled'
    });
    setShowModal(true);
  };

  const openEditModal = (app) => {
    setEditingAppointment(app);
    setFormData({
      title: app.title,
      description: app.description || '',
      contact_name: app.contact_name || '',
      contact_phone: app.contact_phone || '',
      appointment_date: app.appointment_date,
      start_time: app.start_time.slice(0, 5),
      end_time: app.end_time ? app.end_time.slice(0, 5) : '',
      location: app.location || '',
      status: app.status
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingAppointment) {
        await api.put(`/agenda/${editingAppointment.id}`, formData);
      } else {
        await api.post('/agenda', formData);
      }
      setShowModal(false);
      fetchAppointments();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar agendamento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Realmente deseja excluir este compromisso?')) return;
    try {
      await api.delete(`/agenda/${id}`);
      fetchAppointments();
    } catch (err) {
      alert('Erro ao excluir compromisso');
    }
  };

  const updateStatus = async (app, newStatus) => {
    try {
      await api.put(`/agenda/${app.id}`, { status: newStatus });
      fetchAppointments();
    } catch (err) {
      alert('Erro ao atualizar status');
    }
  };

  const selectedDayAppointments = getAppointmentsForDate(selectedDate);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <span className="bg-[#25D366]/10 text-[#25D366] text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-[#25D366]/20">Confirmado</span>;
      case 'canceled':
        return <span className="bg-red-500/10 text-red-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-red-500/20">Cancelado</span>;
      case 'completed':
        return <span className="bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-blue-500/20">Concluído</span>;
      default:
        return <span className="bg-yellow-500/10 text-yellow-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-yellow-500/20">Agendado</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <CalendarIcon className="text-[#25D366]" size={36} />
            Agenda de Reuniões
          </h2>
          <p className="text-slate-400 mt-2 text-lg">Marque e acompanhe reuniões e compromissos.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => openShareModal('month')}
            className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-5 py-3.5 rounded-xl font-bold flex items-center gap-2 transition-all transform hover:-translate-y-1"
          >
            <Share2 size={18} /> Compartilhar
          </button>
          <button
            onClick={() => openNewModal(selectedDate)}
            className="bg-[#25D366] hover:bg-[#1DA851] text-slate-900 px-6 py-3.5 rounded-xl font-bold shadow-[0_0_15px_rgba(37,211,102,0.3)] flex items-center gap-2 transition-all transform hover:-translate-y-1"
          >
            <Plus size={20} /> Novo Compromisso
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* CALENDÁRIO */}
        <div className="lg:col-span-2 glass-panel p-8 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black text-white capitalize italic tracking-tighter">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            <div className="flex gap-2">
              <button onClick={handlePrevMonth} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors">
                <ChevronLeft size={18} />
              </button>
              <button onClick={handleNextMonth} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Dias da Semana */}
          <div className="grid grid-cols-7 gap-2 mb-4 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          {/* Grid dos Dias */}
          <div className="grid grid-cols-7 gap-2 flex-1">
            {allDays.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="aspect-square bg-transparent"></div>;

              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const dayApps = getAppointmentsForDate(day);

              return (
                <button
                  key={day.toString()}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square relative rounded-2xl flex flex-col items-center justify-center border font-bold text-base transition-all ${isSelected
                    ? 'bg-gradient-to-br from-[#25D366]/20 to-transparent border-[#25D366] text-[#25D366] shadow-[inset_0_0_15px_rgba(37,211,102,0.15)] scale-[1.03]'
                    : isToday
                      ? 'bg-white/5 border-blue-500 text-blue-400'
                      : 'bg-black/20 border-white/5 hover:border-white/15 text-slate-300 hover:bg-white/5'
                    }`}
                >
                  <span>{format(day, 'd')}</span>

                  {/* Bolinhas de status */}
                  {dayApps.length > 0 && (
                    <div className="absolute bottom-2.5 flex gap-1 justify-center w-full">
                      {dayApps.slice(0, 3).map((app) => (
                        <div
                          key={app.id}
                          className={`w-2.5 h-2.5 rounded-full shadow-[0_0_6px_currentColor] ${app.status === 'confirmed' ? 'bg-[#25D366] text-[#25D366]' :
                            app.status === 'canceled' ? 'bg-red-500 text-red-500' :
                              app.status === 'completed' ? 'bg-blue-500 text-blue-500' : 'bg-yellow-500 text-yellow-500'
                            }`}
                        />
                      ))}
                      {dayApps.length > 3 && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white opacity-40" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* DETALHES DO DIA SELECIONADO */}
        <div className="lg:col-span-1 glass-panel p-8 flex flex-col min-h-[500px]">
          <div className="border-b border-white/5 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Compromissos para</span>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mt-1">
                  {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </h3>
              </div>
              <button
                onClick={() => openShareModal('day')}
                title="Compartilhar agenda deste dia"
                className="p-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl transition-all"
              >
                <Share2 size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                <Loader2 className="animate-spin text-[#25D366] mb-3" size={28} />
                <p className="text-xs uppercase tracking-wider font-black">Carregando compromissos...</p>
              </div>
            ) : selectedDayAppointments.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl p-6 text-center">
                <CalendarDays className="text-slate-600 mb-3" size={32} />
                <p className="text-sm text-slate-400 font-bold">Nenhum compromisso marcado</p>
                <p className="text-xs text-slate-600 mt-1">Clique em "Novo Compromisso" para agendar.</p>
              </div>
            ) : (
              selectedDayAppointments.map((app) => {
                const parsed = parseDescription(app.description);
                const descText = parsed.text;
                const author = app.updated_by_name || parsed.author;

                return (
                  <div key={app.id} className="p-5 bg-black/20 border border-white/5 hover:border-white/10 rounded-2xl space-y-4 transition-all relative group">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="font-bold text-white text-lg tracking-tight">{app.title}</h4>
                        {descText && <p className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">{descText}</p>}
                        {author && (
                          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            <User size={12} className="text-slate-500" />
                            <span>Por: {author}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openShareModal('single', app.id)} title="Compartilhar esta reunião" className="p-2 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 rounded-xl transition-all"><Share2 size={14} /></button>
                        <button onClick={() => openEditModal(app)} className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all"><Edit3 size={14} /></button>
                        <button onClick={() => handleDelete(app.id)} className="p-2 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-xl transition-all"><Trash2 size={14} /></button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-xs text-slate-400 border-t border-white/5 pt-3">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-[#25D366]" />
                        <span>{app.start_time.slice(0, 5)} {app.end_time ? `às ${app.end_time.slice(0, 5)}` : ''}</span>
                      </div>

                      {app.contact_name && (
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-blue-400" />
                          <span className="font-medium">Reunião com {app.contact_name}</span>
                          {app.contact_phone && <span className="text-slate-500">• {app.contact_phone}</span>}
                        </div>
                      )}

                      {app.location && (
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-purple-400" />
                          <span className="truncate">{app.location}</span>
                          {app.location.startsWith('http') && (
                            <a href={app.location} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-0.5">
                              Abrir <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center border-t border-white/5 pt-3">
                      {getStatusBadge(app.status)}

                      <div className="flex gap-1 flex-wrap justify-end">
                        {app.status !== 'scheduled' && (
                          <button onClick={() => updateStatus(app, 'scheduled')} className="text-[10px] bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 px-2 py-1 rounded-lg font-bold transition-all">Agendar</button>
                        )}
                        {app.status !== 'confirmed' && (
                          <button onClick={() => updateStatus(app, 'confirmed')} className="text-[10px] bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/20 px-2 py-1 rounded-lg font-bold transition-all">Confirmar</button>
                        )}
                        {app.status !== 'completed' && (
                          <button onClick={() => updateStatus(app, 'completed')} className="text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-lg font-bold transition-all">Concluir</button>
                        )}
                        {app.status !== 'canceled' && (
                          <button onClick={() => updateStatus(app, 'canceled')} className="text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-1 rounded-lg font-bold transition-all">Cancelar</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* FORM MODAL (CRIAR / EDITAR) */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowModal(false)}></div>
          <div className="bg-[#0F172A] border border-white/10 rounded-[32px] p-8 w-full max-w-lg z-10 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">

            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white bg-white/5 rounded-xl transition-all">
              <X size={18} />
            </button>

            <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3 tracking-tighter uppercase italic">
              <CalendarIcon className="text-[#25D366]" size={28} />
              {editingAppointment ? 'Editar Compromisso' : 'Agendar Reunião'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Título do Compromisso</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Alinhamento de Contrato, Apresentação..."
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-[#25D366] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Descrição</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes ou pauta da reunião..."
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#25D366] transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Responsável</label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                    placeholder="Nome de quem estará na reunião"
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-[#25D366] transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">WhatsApp/Telefone</label>
                  <input
                    type="text"
                    value={formData.contact_phone}
                    onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="Ex: 11999998888"
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-[#25D366] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Localização da Reunião</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Endereço, sala, Google Meet, Zoom..."
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-4 pl-11 text-white font-bold outline-none focus:border-[#25D366] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Data do Compromisso</label>
                <input
                  type="date"
                  required
                  value={formData.appointment_date}
                  onChange={e => setFormData({ ...formData, appointment_date: e.target.value })}
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-[#25D366] transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hora de Início</label>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-[#25D366] transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hora de Fim (Opcional)</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-[#25D366] transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-4 rounded-xl transition-all uppercase tracking-widest text-xs">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-gradient-to-r from-[#25D366] to-green-600 text-black font-black py-4 rounded-xl shadow-xl flex items-center justify-center gap-2 uppercase tracking-widest text-xs transition-all disabled:opacity-50">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowShareModal(false)}></div>
          <div className="bg-[#0F172A] border border-white/10 rounded-[32px] p-8 w-full max-w-md z-10 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">

            <button onClick={() => setShowShareModal(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white bg-white/5 rounded-xl transition-all">
              <X size={18} />
            </button>

            <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-3 tracking-tighter uppercase italic">
              <Share2 className="text-blue-400" size={28} />
              Compartilhar Agenda
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              {shareMode === 'single' ? 'Compartilhe esta reunião específica.' :
                shareMode === 'day' ? `Compartilhe a agenda de ${format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}.` :
                  'Selecione os meses da agenda que deseja compartilhar.'}
            </p>

            {/* Mode selector */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => { setShareMode('month'); setCopied(false); }}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${shareMode === 'month'
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                  }`}
              >
                📅 Mês
              </button>
              <button
                onClick={() => { setShareMode('day'); setCopied(false); }}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${shareMode === 'day'
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                  }`}
              >
                📆 Dia
              </button>
              {shareAppointmentId && (
                <button
                  onClick={() => { setShareMode('single'); setCopied(false); }}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${shareMode === 'single'
                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                    }`}
                >
                  📌 Reunião
                </button>
              )}
            </div>

            {/* Month selection (only in month mode) */}
            {shareMode === 'month' && availableMonths.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Selecionar Meses</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (shareSelectedMonths.length === availableMonths.length) {
                        setShareSelectedMonths([]);
                      } else {
                        setShareSelectedMonths([...availableMonths]);
                      }
                      setCopied(false);
                    }}
                    className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors"
                  >
                    {shareSelectedMonths.length === availableMonths.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {availableMonths.map(month => {
                    const isSelected = shareSelectedMonths.includes(month);
                    return (
                      <button
                        key={month}
                        type="button"
                        onClick={() => toggleShareMonth(month)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all border ${isSelected
                            ? 'bg-blue-500/10 border-blue-500/30 text-white'
                            : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                          }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${isSelected
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-slate-600'
                          }`}>
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                        <CalendarIcon size={14} className={isSelected ? 'text-blue-400' : 'text-slate-600'} />
                        <span className="text-sm font-bold truncate">{formatMonthName(month)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Link display */}
            <div className="bg-black/30 border border-white/10 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Link size={14} className="text-blue-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Link de Compartilhamento</span>
              </div>
              <p className="text-xs text-slate-300 font-mono break-all leading-relaxed">
                {shareToken ? getShareUrl() : 'Gerando link...'}
              </p>
            </div>

            {/* Info box */}
            <div className="bg-[#25D366]/5 border border-[#25D366]/10 rounded-xl p-4 mb-6">
              <p className="text-xs text-slate-400 leading-relaxed">
                <span className="text-[#25D366] font-bold">✨ Atualização automática:</span> Qualquer alteração feita na agenda será refletida automaticamente no link compartilhado. As pessoas que acessarem verão sempre a versão mais atualizada.
              </p>
            </div>

            {/* Copy button */}
            <button
              onClick={copyShareLink}
              disabled={!shareToken || (shareMode === 'month' && shareSelectedMonths.length === 0)}
              className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all ${copied
                ? 'bg-[#25D366] text-black'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-xl'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {copied ? (
                <><Check size={18} /> Link Copiado!</>
              ) : (
                <><Copy size={18} /> Copiar Link</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
