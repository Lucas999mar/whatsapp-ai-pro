import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/api';
import {
    Calendar as CalendarIcon, MapPin, Plus, Clock, User, ChevronLeft, ChevronRight,
    Loader2, X, Play, Square, Users, Briefcase, Map as MapIcon, ClipboardList
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Correção de ícones do Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const PRIORITY_COLORS = { baixa: 'bg-blue-500', media: 'bg-yellow-500', alta: 'bg-orange-500', urgente: 'bg-red-500' };
const STATUS_LABELS = { pendente: 'Pendente', agendada: 'Agendada', em_deslocamento: 'Em Deslocamento', em_execucao: 'Em Execução', concluida: 'Concluída', cancelada: 'Cancelada' };
const STATUS_COLORS = { pendente: 'text-slate-400', agendada: 'text-blue-400', em_deslocamento: 'text-yellow-400', em_execucao: 'text-orange-400', concluida: 'text-green-400', cancelada: 'text-red-400' };
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// ── COMPONENTE: Mapa ──────────────────────────────────────────
function OSMap({ technicians, tasks, onTaskClick }) {
    const center = useMemo(() => {
        const first = technicians.find(t => t.lat) || tasks.find(t => t.lat);
        return first ? [first.lat, first.lng] : [-23.5505, -46.6333];
    }, [technicians, tasks]);

    return (
        <div className="h-[600px] w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-10">
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {technicians.filter(t => t.lat).map(tech => (
                    <Marker key={tech.id} position={[tech.lat, tech.lng]} icon={L.divIcon({
                        className: 'bg-none',
                        html: `<div style="background-color: ${tech.color || '#25D366'}; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.3)">${tech.name.charAt(0)}</div>`,
                        iconSize: [36, 36], iconAnchor: [18, 18]
                    })}>
                        <Popup>
                            <div className="p-1"><p className="font-bold text-slate-800">{tech.name}</p><p className="text-xs text-slate-500">Status: {tech.status}</p></div>
                        </Popup>
                    </Marker>
                ))}
                {tasks.filter(t => t.lat).map(task => (
                    <Marker key={task.id} position={[task.lat, task.lng]} eventHandlers={{ click: () => onTaskClick(task) }}>
                        <Popup>
                            <div className="p-1"><p className="font-bold">{task.title}</p><p className="text-xs text-slate-500">{task.client?.name}</p></div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}

// ── MODAL: Nova Tarefa ──────────────────────────────────────────
function TaskModal({ isOpen, onClose, onSave, task, clients, technicians, taskTypes }) {
    const [form, setForm] = useState({ title: '', client_id: '', technician_id: '', task_type_id: '', scheduled_date: '', scheduled_time: '', priority: 'media' });
    useEffect(() => { if (task) setForm({ ...task }); else setForm({ title: '', client_id: '', technician_id: '', task_type_id: '', scheduled_date: '', scheduled_time: '', priority: 'media' }); }, [task, isOpen]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-[#0F172A] border border-white/10 rounded-2xl p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4">{task ? 'Editar OS' : 'Nova Ordem de Serviço'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input className="md:col-span-2 bg-[#1E293B] border border-white/10 rounded-xl p-3 text-white" placeholder="Título da OS" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                    <select className="bg-[#1E293B] border border-white/10 rounded-xl p-3 text-white focus:outline-none" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                        <option value="">Cliente...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select className="bg-[#1E293B] border border-white/10 rounded-xl p-3 text-white" value={form.technician_id} onChange={e => setForm({ ...form, technician_id: e.target.value })}>
                        <option value="">Técnico...</option>
                        {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <input type="date" className="bg-[#1E293B] border border-white/10 rounded-xl p-3 text-white" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} />
                    <input type="time" className="bg-[#1E293B] border border-white/10 rounded-xl p-3 text-white" value={form.scheduled_time} onChange={e => setForm({ ...form, scheduled_time: e.target.value })} />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-6 py-2 bg-white/5 rounded-xl">Cancelar</button>
                    <button onClick={() => { onSave(form); onClose(); }} className="px-8 py-2 bg-[#25D366] text-black font-bold rounded-xl">Salvar OS</button>
                </div>
            </div>
        </div>
    );
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function OSPage() {
    const [view, setView] = useState('calendar');
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [tasks, setTasks] = useState([]);
    const [clients, setClients] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [detailTask, setDetailTask] = useState(null);

    const fetchAll = useCallback(async () => {
        try {
            const [t, c, te, s] = await Promise.all([
                api.get(`/os/tasks?month=${currentMonth + 1}&year=2026`),
                api.get('/os/clients'),
                api.get('/os/technicians'),
                api.get('/os/stats')
            ]);
            setTasks(t.data); setClients(c.data); setTechnicians(te.data); setStats(s.data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    }, [currentMonth]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#25D366]" size={40} /></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-4xl font-bold text-white flex items-center gap-3"><ClipboardList className="text-[#25D366]" size={36} /> Painel OS</h2>
                    <p className="text-slate-400">Controle total de serviços e técnicos.</p>
                </div>
                <div className="flex gap-3">
                    <div className="bg-[#1E293B] p-1 rounded-xl flex">
                        <button onClick={() => setView('calendar')} className={`px-4 py-2 rounded-lg text-sm font-bold ${view === 'calendar' ? 'bg-[#25D366] text-black' : 'text-slate-400'}`}>Calendário</button>
                        <button onClick={() => setView('map')} className={`px-4 py-2 rounded-lg text-sm font-bold ${view === 'map' ? 'bg-[#25D366] text-black' : 'text-slate-400'}`}>Mapa</button>
                    </div>
                    <button onClick={() => setShowTaskModal(true)} className="px-6 py-2 bg-[#25D366] text-black font-extrabold rounded-xl shadow-lg border-2 border-white/10 hover:scale-105 transition-all">NOVA TAREFA</button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[{ l: 'Pendentes', v: stats.pending, c: 'text-white' }, { l: 'Em Execução', v: stats.in_progress, c: 'text-[#25D366]' }, { l: 'Técnicos', v: technicians.length, c: 'text-blue-400' }, { l: 'Concluídas', v: stats.completed, c: 'text-slate-400' }].map((s, i) => (
                    <div key={i} className="bg-[#1E293B] p-5 rounded-2xl border border-white/5">
                        <p className="text-xs text-slate-500 font-bold uppercase">{s.l}</p>
                        <p className={`text-3xl font-black ${s.c} mt-1`}>{s.v || 0}</p>
                    </div>
                ))}
            </div>

            {view === 'calendar' ? (
                <div className="bg-[#0F172A] border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#1E293B]">
                        <button onClick={() => setCurrentMonth(m => m === 0 ? 11 : m - 1)}><ChevronLeft /></button>
                        <h3 className="text-xl font-bold text-white">{MONTHS[currentMonth]} 2026</h3>
                        <button onClick={() => setCurrentMonth(m => m === 11 ? 0 : m + 1)}><ChevronRight /></button>
                    </div>
                    <div className="grid grid-cols-7">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d} className="p-3 text-center text-xs font-bold text-slate-600">{d}</div>)}
                        {Array.from({ length: 31 }).map((_, i) => (
                            <div key={i} className="min-h-[100px] border border-white/5 p-2 hover:bg-white/[0.02]">
                                <div className="text-xs font-bold text-slate-700">{i + 1}</div>
                                {tasks.filter(t => t.scheduled_date?.endsWith(`-${String(i + 1).padStart(2, '0')}`)).map(t => (
                                    <div key={t.id} onClick={() => setDetailTask(t)} className="mt-1 px-2 py-1 bg-[#1E293B] border-l-2 border-[#25D366] text-[10px] text-slate-300 rounded cursor-pointer truncate">
                                        {t.scheduled_time?.slice(0, 5)} {t.client?.name || t.title}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <OSMap technicians={technicians} tasks={tasks} onTaskClick={setDetailTask} />
            )}

            {detailTask && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="w-full max-w-lg bg-[#1E293B] rounded-2xl p-6 border border-white/10">
                        <h3 className="text-2xl font-black text-white mb-2">{detailTask.title}</h3>
                        <p className="text-slate-400 mb-4">{detailTask.address || 'Sem endereço cadastrado'}</p>
                        <div className="space-y-3">
                            <div className="flex justify-between p-3 bg-white/5 rounded-xl"><span className="text-slate-500">Status</span><span className="font-bold text-[#25D366]">{detailTask.status}</span></div>
                            <div className="flex justify-between p-3 bg-white/5 rounded-xl"><span className="text-slate-500">Técnico</span><span className="font-bold">{detailTask.technician?.name || 'Não atribuído'}</span></div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setDetailTask(null)} className="flex-1 py-3 bg-white/5 font-bold rounded-xl">Fechar</button>
                            <button className="flex-1 py-3 bg-[#25D366] text-black font-black rounded-xl">Iniciar Serviço</button>
                        </div>
                    </div>
                </div>
            )}

            <TaskModal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} onSave={async (f) => { await api.post('/os/tasks', f); fetchAll(); }} clients={clients} technicians={technicians} />
        </div>
    );
}
