import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/api';
import {
    Calendar as CalendarIcon, MapPin, Plus, Clock, User, ChevronLeft, ChevronRight,
    CheckCircle2, AlertTriangle, Loader2, X, Trash2, Play, Square, Navigation,
    Users, Briefcase, Filter, List, Grid3X3, Eye, Edit2, Phone, Mail, Building2
} from 'lucide-react';

const PRIORITY_COLORS = {
    baixa: 'bg-blue-500', media: 'bg-yellow-500', alta: 'bg-orange-500', urgente: 'bg-red-500'
};
const STATUS_LABELS = {
    pendente: 'Pendente', agendada: 'Agendada', em_deslocamento: 'Em Deslocamento',
    em_execucao: 'Em Execução', concluida: 'Concluída', cancelada: 'Cancelada'
};
const STATUS_COLORS = {
    pendente: 'text-slate-400', agendada: 'text-blue-400', em_deslocamento: 'text-yellow-400',
    em_execucao: 'text-orange-400', concluida: 'text-green-400', cancelada: 'text-red-400'
};
const DAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function getDaysInMonth(year, month) {
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);
    return days;
}

// ── MODAL: Nova Tarefa ──────────────────────────────────────────
function TaskModal({ isOpen, onClose, onSave, task, clients, technicians, taskTypes }) {
    const [form, setForm] = useState({
        title: '', description: '', priority: 'media', client_id: '', technician_id: '',
        task_type_id: '', scheduled_date: '', scheduled_time: '', estimated_duration: 60,
        address: '', lat: null, lng: null, financial_category: ''
    });
    const [tab, setTab] = useState('geral');

    useEffect(() => {
        if (task) setForm({ ...form, ...task, client_id: task.client_id || '', technician_id: task.technician_id || '', task_type_id: task.task_type_id || '' });
        else setForm({ title: '', description: '', priority: 'media', client_id: '', technician_id: '', task_type_id: '', scheduled_date: '', scheduled_time: '', estimated_duration: 60, address: '', lat: null, lng: null, financial_category: '' });
    }, [task, isOpen]);

    const handleClientSelect = (clientId) => {
        const client = clients.find(c => c.id === clientId);
        if (client) {
            setForm(f => ({ ...f, client_id: clientId, address: client.address || '', lat: client.lat, lng: client.lng }));
        } else {
            setForm(f => ({ ...f, client_id: clientId }));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-3xl bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#1E293B]">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Briefcase size={20} className="text-[#25D366]" />
                        {task ? 'Editar Tarefa' : 'Nova Tarefa'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X size={20} className="text-slate-400" /></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    {['geral', 'localização'].map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-6 py-3 text-sm font-semibold capitalize transition-colors ${tab === t ? 'text-[#25D366] border-b-2 border-[#25D366]' : 'text-slate-400 hover:text-white'}`}>
                            {t}
                        </button>
                    ))}
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                    {tab === 'geral' && (<>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-xs text-slate-400 font-semibold uppercase mb-1 block">Título da Tarefa *</label>
                                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#25D366]/50" placeholder="Ex: Instalação de aquecedor" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-semibold uppercase mb-1 block">Cliente</label>
                                <select value={form.client_id} onChange={e => handleClientSelect(e.target.value)}
                                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#25D366]/50">
                                    <option value="">Selecione...</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-semibold uppercase mb-1 block">Técnico Responsável</label>
                                <select value={form.technician_id} onChange={e => setForm({ ...form, technician_id: e.target.value })}
                                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#25D366]/50">
                                    <option value="">Selecione...</option>
                                    {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-semibold uppercase mb-1 block">Tipo de Tarefa</label>
                                <select value={form.task_type_id} onChange={e => setForm({ ...form, task_type_id: e.target.value })}
                                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#25D366]/50">
                                    <option value="">Selecione...</option>
                                    {taskTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-semibold uppercase mb-1 block">Prioridade</label>
                                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#25D366]/50">
                                    <option value="baixa">Baixa</option>
                                    <option value="media">Média</option>
                                    <option value="alta">Alta</option>
                                    <option value="urgente">Urgente</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-semibold uppercase mb-1 block">Data</label>
                                <input type="date" value={form.scheduled_date || ''} onChange={e => setForm({ ...form, scheduled_date: e.target.value })}
                                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#25D366]/50" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-semibold uppercase mb-1 block">Horário</label>
                                <input type="time" value={form.scheduled_time || ''} onChange={e => setForm({ ...form, scheduled_time: e.target.value })}
                                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#25D366]/50" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-semibold uppercase mb-1 block">Duração (min)</label>
                                <input type="number" value={form.estimated_duration} onChange={e => setForm({ ...form, estimated_duration: parseInt(e.target.value) || 60 })}
                                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#25D366]/50" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-semibold uppercase mb-1 block">Categoria Financeira</label>
                                <input value={form.financial_category || ''} onChange={e => setForm({ ...form, financial_category: e.target.value })}
                                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#25D366]/50" placeholder="Ex: Receita" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 font-semibold uppercase mb-1 block">Descrição / Orientação</label>
                            <textarea rows={3} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })}
                                className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#25D366]/50 resize-none" placeholder="Instruções para o técnico..." />
                        </div>
                    </>)}

                    {tab === 'localização' && (<>
                        <div>
                            <label className="text-xs text-slate-400 font-semibold uppercase mb-1 block">Endereço Completo</label>
                            <input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })}
                                className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#25D366]/50" placeholder="Rua, número, cidade..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-slate-400 font-semibold uppercase mb-1 block">Latitude</label>
                                <input type="number" step="any" value={form.lat || ''} onChange={e => setForm({ ...form, lat: parseFloat(e.target.value) || null })}
                                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#25D366]/50" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-semibold uppercase mb-1 block">Longitude</label>
                                <input type="number" step="any" value={form.lng || ''} onChange={e => setForm({ ...form, lng: parseFloat(e.target.value) || null })}
                                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#25D366]/50" />
                            </div>
                        </div>
                        {form.address && (
                            <div className="bg-[#1E293B] border border-white/10 rounded-xl p-4 flex items-center gap-3">
                                <MapPin size={20} className="text-[#25D366]" />
                                <span className="text-slate-300 text-sm">{form.address}</span>
                            </div>
                        )}
                    </>)}
                </div>

                <div className="p-5 border-t border-white/10 flex justify-between">
                    <button onClick={onClose} className="px-6 py-2.5 bg-white/5 text-slate-300 rounded-xl hover:bg-white/10 transition-colors font-semibold">Fechar</button>
                    <button onClick={() => onSave(form)} disabled={!form.title}
                        className="px-8 py-2.5 bg-[#25D366] text-slate-900 rounded-xl hover:bg-[#20BD5A] transition-colors font-bold disabled:opacity-30">
                        {task ? 'Salvar' : 'Criar Tarefa'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── MODAL: Detalhes da OS ────────────────────────────────────────
function TaskDetailModal({ task, onClose, onCheckin, onCheckout, onStatusChange }) {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        if (task) {
            api.get(`/os/tasks/${task.id}/events`).then(r => setEvents(r.data)).catch(() => { });
        }
    }, [task]);

    if (!task) return null;

    const duration = task.checkin_at && task.checkout_at
        ? Math.round((new Date(task.checkout_at) - new Date(task.checkin_at)) / 60000)
        : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-2xl bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-5 border-b border-white/10 bg-[#1E293B] flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Detalhes da OS #{task.id?.slice(0, 8)}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg"><X size={20} className="text-slate-400" /></button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#1E293B] p-4 rounded-xl border border-white/5">
                            <span className="text-xs text-slate-500 uppercase">Cliente</span>
                            <p className="text-white font-semibold">{task.client?.name || '—'}</p>
                        </div>
                        <div className="bg-[#1E293B] p-4 rounded-xl border border-white/5">
                            <span className="text-xs text-slate-500 uppercase">Técnico</span>
                            <p className="text-white font-semibold">{task.technician?.name || '—'}</p>
                        </div>
                        <div className="bg-[#1E293B] p-4 rounded-xl border border-white/5">
                            <span className="text-xs text-slate-500 uppercase">Status</span>
                            <p className={`font-bold ${STATUS_COLORS[task.status]}`}>{STATUS_LABELS[task.status]}</p>
                        </div>
                        <div className="bg-[#1E293B] p-4 rounded-xl border border-white/5">
                            <span className="text-xs text-slate-500 uppercase">Prioridade</span>
                            <div className="flex items-center gap-2 mt-1">
                                <div className={`w-3 h-3 rounded-full ${PRIORITY_COLORS[task.priority]}`} />
                                <span className="text-white font-semibold capitalize">{task.priority}</span>
                            </div>
                        </div>
                    </div>

                    {task.address && (
                        <div className="bg-[#1E293B] p-4 rounded-xl border border-white/5">
                            <span className="text-xs text-slate-500 uppercase">Endereço</span>
                            <p className="text-white mt-1 flex items-center gap-2"><MapPin size={14} className="text-[#25D366]" />{task.address}</p>
                        </div>
                    )}

                    {task.description && (
                        <div className="bg-[#1E293B] p-4 rounded-xl border border-white/5">
                            <span className="text-xs text-slate-500 uppercase">Orientação</span>
                            <p className="text-slate-300 mt-1 text-sm whitespace-pre-wrap">{task.description}</p>
                        </div>
                    )}

                    {/* Timeline de Monitoramento */}
                    <div className="bg-[#1E293B] p-4 rounded-xl border border-white/5">
                        <span className="text-xs text-slate-500 uppercase mb-3 block">Monitoramento</span>
                        <div className="space-y-3">
                            {events.map((ev, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#25D366] mt-1.5 shrink-0" />
                                    <div>
                                        <p className="text-white text-sm font-semibold">{ev.description}</p>
                                        <p className="text-slate-500 text-xs">{new Date(ev.created_at).toLocaleString('pt-BR')}</p>
                                    </div>
                                </div>
                            ))}
                            {events.length === 0 && <p className="text-slate-500 text-sm">Nenhum evento registrado</p>}
                        </div>
                    </div>

                    {duration && (
                        <div className="bg-[#25D366]/10 border border-[#25D366]/20 p-4 rounded-xl text-center">
                            <span className="text-[#25D366] font-bold text-lg">⏱️ Duração real: {duration} minutos</span>
                        </div>
                    )}

                    {/* Ações */}
                    <div className="flex gap-3 flex-wrap">
                        {task.status === 'agendada' && (
                            <button onClick={() => onCheckin(task.id)} className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-500 transition-colors">
                                <Play size={16} /> Check-in
                            </button>
                        )}
                        {task.status === 'em_execucao' && (
                            <button onClick={() => onCheckout(task.id)} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-500 transition-colors">
                                <Square size={16} /> Check-out
                            </button>
                        )}
                        {task.status !== 'concluida' && task.status !== 'cancelada' && (
                            <button onClick={() => onStatusChange(task.id, 'cancelada')} className="flex items-center gap-2 px-5 py-2.5 bg-red-600/20 text-red-400 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-colors">
                                <X size={16} /> Cancelar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── MODAL: Cadastros (Clientes/Técnicos/Tipos) ─────────────────
function CadastroModal({ isOpen, onClose, type, onSave }) {
    const [form, setForm] = useState({});

    useEffect(() => { setForm({}); }, [isOpen, type]);

    if (!isOpen) return null;

    const fields = type === 'client'
        ? [{ k: 'name', l: 'Nome *' }, { k: 'phone', l: 'Telefone' }, { k: 'email', l: 'Email' }, { k: 'address', l: 'Endereço' }, { k: 'city', l: 'Cidade' }, { k: 'state', l: 'Estado' }]
        : type === 'technician'
            ? [{ k: 'name', l: 'Nome *' }, { k: 'phone', l: 'Telefone' }, { k: 'email', l: 'Email' }, { k: 'color', l: 'Cor (hex)', placeholder: '#25D366' }]
            : [{ k: 'name', l: 'Nome *' }, { k: 'color', l: 'Cor (hex)', placeholder: '#3B82F6' }, { k: 'estimated_duration', l: 'Duração estimada (min)', type: 'number' }];

    const title = type === 'client' ? 'Novo Cliente' : type === 'technician' ? 'Novo Técnico' : 'Novo Tipo de Tarefa';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl">
                <div className="p-5 border-b border-white/10 bg-[#1E293B] flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg"><X size={18} className="text-slate-400" /></button>
                </div>
                <div className="p-5 space-y-3">
                    {fields.map(f => (
                        <div key={f.k}>
                            <label className="text-xs text-slate-400 font-semibold uppercase mb-1 block">{f.l}</label>
                            <input type={f.type || 'text'} value={form[f.k] || ''} placeholder={f.placeholder || ''}
                                onChange={e => setForm({ ...form, [f.k]: f.type === 'number' ? parseInt(e.target.value) : e.target.value })}
                                className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#25D366]/50" />
                        </div>
                    ))}
                </div>
                <div className="p-5 border-t border-white/10 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2 bg-white/5 text-slate-300 rounded-xl hover:bg-white/10 font-semibold">Cancelar</button>
                    <button onClick={() => { onSave(form); onClose(); }} disabled={!form.name}
                        className="px-6 py-2 bg-[#25D366] text-slate-900 rounded-xl font-bold disabled:opacity-30 hover:bg-[#20BD5A]">Salvar</button>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// ── COMPONENTE PRINCIPAL ─────────────────────────────────────
// ══════════════════════════════════════════════════════════════

export default function OSPage() {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [view, setView] = useState('calendar');
    const [tasks, setTasks] = useState([]);
    const [unscheduled, setUnscheduled] = useState([]);
    const [clients, setClients] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [taskTypes, setTaskTypes] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editTask, setEditTask] = useState(null);
    const [detailTask, setDetailTask] = useState(null);
    const [cadastroModal, setCadastroModal] = useState({ open: false, type: '' });
    const [showUnscheduled, setShowUnscheduled] = useState(false);

    const fetchAll = useCallback(async () => {
        try {
            const [tasksR, unschR, clientsR, techsR, typesR, statsR] = await Promise.all([
                api.get(`/os/tasks?month=${currentMonth + 1}&year=${currentYear}`),
                api.get('/os/tasks/unscheduled'),
                api.get('/os/clients'),
                api.get('/os/technicians'),
                api.get('/os/task-types'),
                api.get('/os/stats')
            ]);
            setTasks(tasksR.data);
            setUnscheduled(unschR.data);
            setClients(clientsR.data);
            setTechnicians(techsR.data);
            setTaskTypes(typesR.data);
            setStats(statsR.data);
        } catch (err) { console.error('OS fetch error:', err); }
        finally { setLoading(false); }
    }, [currentMonth, currentYear]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleSaveTask = async (form) => {
        try {
            if (editTask) {
                await api.put(`/os/tasks/${editTask.id}`, form);
            } else {
                await api.post('/os/tasks', form);
            }
            setShowTaskModal(false);
            setEditTask(null);
            fetchAll();
        } catch (err) { alert('Erro: ' + err.message); }
    };

    const handleCheckin = async (taskId) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                await api.post(`/os/tasks/${taskId}/checkin`, { lat: pos.coords.latitude, lng: pos.coords.longitude });
                setDetailTask(null);
                fetchAll();
            }, () => { api.post(`/os/tasks/${taskId}/checkin`, { lat: null, lng: null }).then(() => { setDetailTask(null); fetchAll(); }); });
        }
    };

    const handleCheckout = async (taskId) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                await api.post(`/os/tasks/${taskId}/checkout`, { lat: pos.coords.latitude, lng: pos.coords.longitude });
                setDetailTask(null);
                fetchAll();
            }, () => { api.post(`/os/tasks/${taskId}/checkout`, { lat: null, lng: null }).then(() => { setDetailTask(null); fetchAll(); }); });
        }
    };

    const handleStatusChange = async (taskId, status) => {
        await api.post(`/os/tasks/${taskId}/status`, { status });
        setDetailTask(null);
        fetchAll();
    };

    const handleSaveCadastro = async (form) => {
        const endpoint = cadastroModal.type === 'client' ? '/os/clients' : cadastroModal.type === 'technician' ? '/os/technicians' : '/os/task-types';
        await api.post(endpoint, form);
        fetchAll();
    };

    const handleDeleteTask = async (taskId) => {
        if (!confirm('Excluir esta tarefa?')) return;
        await api.delete(`/os/tasks/${taskId}`);
        fetchAll();
    };

    const days = getDaysInMonth(currentYear, currentMonth);
    const getTasksForDay = (day) => {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return tasks.filter(t => t.scheduled_date === dateStr);
    };

    const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); };
    const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); };

    if (loading) return (
        <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 size={40} className="text-[#25D366] animate-spin" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Carregando OS...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
                        <CalendarIcon size={32} className="text-[#25D366]" /> Ordens de Serviço
                    </h2>
                    <p className="text-slate-400 mt-1">Gerencie tarefas, técnicos e acompanhe em tempo real.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={() => setCadastroModal({ open: true, type: 'client' })}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 font-semibold text-sm transition-all">
                        <Users size={16} /> Clientes ({clients.length})
                    </button>
                    <button onClick={() => setCadastroModal({ open: true, type: 'technician' })}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 font-semibold text-sm transition-all">
                        <User size={16} /> Técnicos ({technicians.length})
                    </button>
                    <button onClick={() => setCadastroModal({ open: true, type: 'taskType' })}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 font-semibold text-sm transition-all">
                        <Briefcase size={16} /> Tipos
                    </button>
                    <button onClick={() => { setEditTask(null); setShowTaskModal(true); }}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#25D366] text-slate-900 rounded-xl font-bold hover:bg-[#20BD5A] transition-all shadow-lg shadow-[#25D366]/20">
                        <Plus size={18} /> Nova Tarefa
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Hoje', value: stats.today_total || 0, sub: `${stats.today_completed || 0} concluídas`, color: 'from-blue-500/20 to-blue-600/5' },
                    { label: 'Pendentes', value: stats.pending || 0, color: 'from-yellow-500/20 to-yellow-600/5' },
                    { label: 'Em Execução', value: stats.in_progress || 0, color: 'from-orange-500/20 to-orange-600/5' },
                    { label: 'Concluídas', value: stats.completed || 0, color: 'from-green-500/20 to-green-600/5' },
                ].map((s, i) => (
                    <div key={i} className={`bg-gradient-to-br ${s.color} border border-white/5 rounded-2xl p-5`}>
                        <p className="text-slate-400 text-xs font-semibold uppercase">{s.label}</p>
                        <p className="text-3xl font-black text-white mt-1">{s.value}</p>
                        {s.sub && <p className="text-slate-500 text-xs mt-1">{s.sub}</p>}
                    </div>
                ))}
            </div>

            {/* Tarefas sem agendamento */}
            {unscheduled.length > 0 && (
                <button onClick={() => setShowUnscheduled(!showUnscheduled)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-4 flex items-center justify-between hover:bg-[#253247] transition-colors">
                    <span className="text-white font-bold">{unscheduled.length} Tarefas sem agendamento</span>
                    <ChevronRight size={18} className={`text-slate-400 transition-transform ${showUnscheduled ? 'rotate-90' : ''}`} />
                </button>
            )}
            {showUnscheduled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {unscheduled.map(t => (
                        <div key={t.id} onClick={() => setDetailTask(t)} className="bg-[#1E293B] border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-[#253247] transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${PRIORITY_COLORS[t.priority]}`} />
                                <span className="text-white font-semibold text-sm truncate">{t.title}</span>
                            </div>
                            <p className="text-slate-500 text-xs">{t.client?.name || 'Sem cliente'} • {t.technician?.name || 'Sem técnico'}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Calendário */}
            <div className="bg-[#0F172A] border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#1E293B]">
                    <div className="flex items-center gap-4">
                        <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><ChevronLeft size={20} className="text-slate-300" /></button>
                        <h3 className="text-xl font-bold text-white min-w-[200px] text-center">{MONTHS[currentMonth]} {currentYear}</h3>
                        <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><ChevronRight size={20} className="text-slate-300" /></button>
                    </div>
                </div>

                {/* Grid dos dias da semana */}
                <div className="grid grid-cols-7 border-b border-white/5">
                    {DAYS.map(d => (
                        <div key={d} className="p-3 text-center text-xs font-bold text-slate-500 uppercase">{d}</div>
                    ))}
                </div>

                {/* Grid do calendário */}
                <div className="grid grid-cols-7">
                    {days.map((day, i) => {
                        const dayTasks = day ? getTasksForDay(day) : [];
                        const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

                        return (
                            <div key={i} className={`min-h-[120px] border-b border-r border-white/5 p-2 ${!day ? 'bg-[#0B0F19]' : 'hover:bg-white/[0.02]'}`}>
                                {day && (
                                    <>
                                        <div className={`text-xs font-bold mb-1 ${isToday ? 'text-[#25D366] bg-[#25D366]/10 w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-500'}`}>
                                            {day}
                                        </div>
                                        <div className="space-y-1">
                                            {dayTasks.slice(0, 3).map(t => (
                                                <div key={t.id} onClick={() => setDetailTask(t)}
                                                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#1E293B] hover:bg-[#253247] cursor-pointer transition-colors group border border-white/5">
                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLORS[t.priority]}`} />
                                                    <span className="text-[11px] text-slate-300 truncate font-medium">
                                                        {t.scheduled_time?.slice(0, 5)} {t.client?.name || t.title}
                                                    </span>
                                                </div>
                                            ))}
                                            {dayTasks.length > 3 && (
                                                <span className="text-[10px] text-[#25D366] font-bold px-2">+{dayTasks.length - 3} mais</span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modais */}
            <TaskModal isOpen={showTaskModal} onClose={() => { setShowTaskModal(false); setEditTask(null); }}
                onSave={handleSaveTask} task={editTask} clients={clients} technicians={technicians} taskTypes={taskTypes} />

            <TaskDetailModal task={detailTask} onClose={() => setDetailTask(null)}
                onCheckin={handleCheckin} onCheckout={handleCheckout} onStatusChange={handleStatusChange} />

            <CadastroModal isOpen={cadastroModal.open} type={cadastroModal.type}
                onClose={() => setCadastroModal({ open: false, type: '' })} onSave={handleSaveCadastro} />
        </div>
    );
}
