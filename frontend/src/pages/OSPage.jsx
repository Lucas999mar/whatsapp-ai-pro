import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
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

// ── COMPONENTE: Gerenciamento de Clientes ──────────────────────
function ClientManager({ clients, onRefresh }) {
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', address: '', email: '', cep: '', lat: null, lng: null });
    const [searchingCep, setSearchingCep] = useState(false);

    const handleCepSearch = async (cep) => {
        const cleanCep = cep.replace(/\D/g, '');
        setForm(f => ({ ...f, cep: cleanCep }));

        if (cleanCep.length === 8) {
            setSearchingCep(true);
            try {
                // 1. Busca Endereço (ViaCEP)
                const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await res.json();

                if (!data.erro) {
                    const fullAddress = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;

                    // 2. Geocodificação (Nominatim)
                    const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`);
                    const geoData = await geoRes.json();

                    setForm(f => ({
                        ...f,
                        address: fullAddress,
                        lat: geoData[0]?.lat ? parseFloat(geoData[0].lat) : null,
                        lng: geoData[0]?.lon ? parseFloat(geoData[0].lon) : null
                    }));
                }
            } catch (e) { console.error("Erro CEP:", e); }
            finally { setSearchingCep(false); }
        }
    };

    const handleSave = async () => {
        try {
            await api.post('/os/clients', form);
            setForm({ name: '', phone: '', address: '', email: '', cep: '', lat: null, lng: null });
            setShowModal(false);
            onRefresh();
        } catch (e) { alert("Erro ao salvar cliente: " + (e.response?.data?.error || e.message)); }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const text = evt.target.result;
            const rows = text.split('\n').slice(1); // Pula cabeçalho
            const prepared = rows.map(row => {
                const [name, phone, email, address] = row.split(',');
                return { name, phone, email, address };
            }).filter(c => c.name);
            await api.post('/os/clients/import', { clients: prepared });
            onRefresh();
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Clientes ({clients.length})</h3>
                <div className="flex gap-2">
                    <label className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl cursor-pointer hover:bg-blue-500/30 transition-all font-bold">
                        Importar CSV
                        <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
                    </label>
                    <button onClick={() => setShowModal(true)} className="px-6 py-2 bg-[#25D366] text-black font-bold rounded-xl">Novo Cliente</button>
                </div>
            </div>

            <div className="bg-[#1E293B] rounded-2xl border border-white/5 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-black/20 text-slate-500 text-xs uppercase">
                        <tr>
                            <th className="p-4">Nome</th>
                            <th className="p-4">Telefone</th>
                            <th className="p-4">Endereço</th>
                            <th className="p-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {clients.map(c => (
                            <tr key={c.id} className="hover:bg-white/[0.02]">
                                <td className="p-4 font-bold text-white">{c.name}</td>
                                <td className="p-4 text-slate-400">{c.phone}</td>
                                <td className="p-4 text-slate-400 text-sm truncate max-w-md">{c.address}</td>
                                <td className="p-4">
                                    <button onClick={async () => { if (confirm('Excluir?')) { await api.delete(`/os/clients/${c.id}`); onRefresh(); } }} className="text-red-500 hover:scale-110 transition-all"><X size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#0F172A] p-6 rounded-2xl border border-white/10">
                        <h4 className="text-xl font-bold text-white mb-4">Cadastrar Cliente</h4>
                        <div className="space-y-3">
                            <div className="relative">
                                <input className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 text-white" placeholder="CEP (Busca automática)" value={form.cep} onChange={e => handleCepSearch(e.target.value)} maxLength={8} />
                                {searchingCep && <Loader2 className="absolute right-3 top-3 animate-spin text-[#25D366]" size={20} />}
                            </div>
                            <input className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 text-white" placeholder="Nome completo" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            <input className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 text-white" placeholder="WhatsApp" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                            <input className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 text-white" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            <textarea className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 text-white min-h-[80px]" placeholder="Endereço (Rua, Nº, Bairro)" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                            {form.lat && (
                                <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg text-[10px] text-green-400 font-mono">
                                    Localização capturada: {form.lat}, {form.lng}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-white/5 rounded-xl">Cancelar</button>
                            <button onClick={handleSave} className="flex-1 py-3 bg-[#25D366] text-black font-bold rounded-xl">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── COMPONENTE: Gerenciamento de Técnicos ─────────────────────
function TechnicianManager({ technicians, onRefresh }) {
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', color: '#25D366' });

    const handleSave = async () => {
        try {
            await api.post('/os/technicians', form);
            setForm({ name: '', phone: '', email: '', password: '', color: '#25D366' });
            setShowModal(false);
            onRefresh();
        } catch (e) {
            console.error(e);
            alert("Erro ao criar técnico: " + (e.response?.data?.error || e.message));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Técnicos ({technicians.length})</h3>
                <button onClick={() => setShowModal(true)} className="px-6 py-2 bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20">Novo Técnico</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {technicians.map(t => (
                    <div key={t.id} className="bg-[#1E293B] p-5 rounded-2xl border border-white/5 flex items-center gap-4 relative group">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg" style={{ backgroundColor: t.color || '#25D366' }}>
                            {t.name.charAt(0)}
                        </div>
                        <div>
                            <p className="font-bold text-white">{t.name}</p>
                            <p className="text-xs text-slate-500">{t.email || t.phone}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`w-2 h-2 rounded-full ${t.status === 'online' ? 'bg-green-500' : 'bg-slate-500'}`}></span>
                                <span className="text-[10px] uppercase font-bold text-slate-400">{t.status || 'offline'}</span>
                            </div>
                        </div>
                        <button onClick={async () => { if (confirm('Excluir?')) { await api.delete(`/os/technicians/${t.id}`); onRefresh(); } }} className="absolute top-4 right-4 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><X size={18} /></button>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#0F172A] p-6 rounded-2xl border border-white/10">
                        <h4 className="text-xl font-bold text-white mb-4">Cadastrar Técnico</h4>
                        <p className="text-xs text-slate-500 mb-4 uppercase font-bold tracking-wider">Acesso ao Sistema</p>
                        <div className="space-y-3">
                            <input className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 text-white" placeholder="Nome do Técnico" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            <input className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 text-white" placeholder="Login (Email)" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            <input className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 text-white" type="password" placeholder="Senha de Acesso" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                <span className="text-sm text-slate-400">Cor no Mapa:</span>
                                <input type="color" className="bg-transparent border-none w-10 h-10 cursor-pointer" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-white/5 rounded-xl">Cancelar</button>
                            <button onClick={handleSave} className="flex-1 py-3 bg-blue-500 text-white font-bold rounded-xl">Criar Login</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function OSPage() {
    const [view, setView] = useState('calendar'); // calendar, map, clients, technicians
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

    const { user } = useAuth();

    const renderContent = () => {
        switch (view) {
            case 'map': return <OSMap technicians={technicians} tasks={tasks} onTaskClick={setDetailTask} />;
            case 'clients': return <ClientManager clients={clients} onRefresh={fetchAll} />;
            case 'technicians': return <TechnicianManager technicians={technicians} onRefresh={fetchAll} />;
            default: return (
                <div className="bg-[#0F172A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#1E293B]">
                        <button onClick={() => setCurrentMonth(m => m === 0 ? 11 : m - 1)} className="p-2 hover:bg-white/5 rounded-full transition-all"><ChevronLeft /></button>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2"><CalendarIcon className="text-[#25D366]" size={20} /> {MONTHS[currentMonth]} 2026</h3>
                        <button onClick={() => setCurrentMonth(m => m === 11 ? 0 : m + 1)} className="p-2 hover:bg-white/5 rounded-full transition-all"><ChevronRight /></button>
                    </div>
                    <div className="grid grid-cols-7 bg-[#0F172A]">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d} className="p-3 text-center text-xs font-black text-slate-600 uppercase border-b border-white/5">{d}</div>)}
                        {Array.from({ length: 31 }).map((_, i) => (
                            <div key={i} className="min-h-[120px] border-r border-b border-white/5 p-2 hover:bg-white/[0.02] transition-colors">
                                <div className="text-xs font-bold text-slate-700 mb-1">{i + 1}</div>
                                <div className="space-y-1">
                                    {tasks.filter(t => t.scheduled_date?.endsWith(`-${String(i + 1).padStart(2, '0')}`)).map(t => (
                                        <div key={t.id} onClick={() => setDetailTask(t)} className="px-2 py-1 bg-[#1E293B] border-l-2 border-[#25D366] text-[10px] text-slate-300 rounded cursor-pointer truncate hover:brightness-125 transition-all">
                                            <span className="font-bold text-white mr-1">{t.scheduled_time?.slice(0, 5)}</span> {t.client?.name || t.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h2 className="text-4xl font-black text-white flex items-center gap-4">
                        <div className="p-3 bg-[#25D366]/10 rounded-2xl"><ClipboardList className="text-[#25D366]" size={36} /></div>
                        Módulo OS
                    </h2>
                    <p className="text-slate-400 mt-1">Gestão inteligente de serviços em campo.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <div className="bg-[#1E293B] p-1.5 rounded-2xl flex border border-white/5">
                        {[
                            { id: 'calendar', label: 'Agenda', icon: <CalendarIcon size={16} />, public: true },
                            { id: 'map', label: 'Mapa', icon: <MapIcon size={16} />, public: true },
                            { id: 'clients', label: 'Clientes', icon: <Briefcase size={16} />, public: false },
                            { id: 'technicians', label: 'Técnicos', icon: <Users size={16} />, public: false }
                        ].filter(t => t.public || user?.role !== 'technician').map(t => (
                            <button
                                key={t.id}
                                onClick={() => setView(t.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${view === t.id ? 'bg-[#25D366] text-black shadow-lg shadow-[#25D366]/20' : 'text-slate-400 hover:text-white'}`}
                            >
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>
                    {user?.role !== 'technician' && (
                        <button onClick={() => setShowTaskModal(true)} className="px-8 py-3 bg-[#25D366] text-black font-black rounded-2xl shadow-xl shadow-[#25D366]/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                            <Plus size={20} /> NOVA TAREFA
                        </button>
                    )}
                </div>
            </div>

            {view !== 'clients' && view !== 'technicians' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { l: 'Pendentes', v: stats.pending, c: 'text-white', i: <Clock size={20} /> },
                        { l: 'Em Execução', v: stats.in_progress, c: 'text-[#25D366]', i: <Play size={20} /> },
                        { l: 'Técnicos Online', v: stats.online_technicians, c: 'text-blue-400', i: <User size={20} /> },
                        { l: 'Concluídas Hoje', v: stats.today_completed, c: 'text-slate-400', i: <Square size={20} /> }
                    ].map((s, i) => (
                        <div key={i} className="bg-[#1E293B] p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">{s.i}</div>
                            <p className="text-xs text-slate-500 font-black uppercase tracking-widest">{s.l}</p>
                            <p className={`text-4xl font-black ${s.c} mt-2`}>{s.v || 0}</p>
                        </div>
                    ))}
                </div>
            )}

            {renderContent()}

            {detailTask && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="w-full max-w-xl bg-[#0F172A] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                        <div className="h-24 bg-gradient-to-r from-blue-600 to-[#25D366] p-6 flex justify-between items-start">
                            <h3 className="text-2xl font-black text-white leading-tight">{detailTask.title}</h3>
                            <button onClick={() => setDetailTask(null)} className="p-2 bg-black/20 text-white rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex gap-4">
                                <div className="p-4 bg-white/5 rounded-2xl flex-1">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cliente</p>
                                    <p className="font-bold text-white mt-1">{detailTask.client?.name || 'Venda Direta'}</p>
                                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><MapPin size={12} /> {detailTask.address || 'Sem endereço'}</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl flex-1">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Técnico Atribuído</p>
                                    <p className="font-bold text-white mt-1">{detailTask.technician?.name || 'Aguardando Técnico'}</p>
                                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Clock size={12} /> {detailTask.scheduled_time?.slice(0, 5)}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-xs font-bold text-slate-500 uppercase">Ações Rápidas</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <button className="py-3 bg-[#25D366] text-black font-black rounded-xl hover:brightness-110 transition-all">Iniciar Check-in</button>
                                    <button className="py-3 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all">Editar OS</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <TaskModal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} onSave={async (f) => { await api.post('/os/tasks', f); fetchAll(); }} clients={clients} technicians={technicians} />
        </div>
    );
}
