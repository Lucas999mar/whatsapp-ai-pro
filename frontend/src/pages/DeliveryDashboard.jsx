import React, { useState, useEffect, useCallback } from 'react';
import {
    Bike, MapPin, Navigation, Package, Clock, DollarSign,
    Users, User, TrendingUp, AlertCircle, Search, Filter, ChevronRight,
    Map as MapIcon, Loader2, X, Plus, UserPlus, Info, Copy, Settings, Save, CheckCircle, BarChart3, Calendar, PieChart, ExternalLink
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Leaflet fix
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

export default function DeliveryDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [deliveries, setDeliveries] = useState([]);
    const [motoboys, setMotoboys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('monitor'); // 'monitor', 'fleet', 'config', 'reports'
    const [deliveryTab, setDeliveryTab] = useState('active'); // 'active', 'completed'
    const [showModal, setShowModal] = useState(false);

    // Relatórios
    const [reportPeriod, setReportPeriod] = useState('day');
    const [reports, setReports] = useState(null);
    const [loadingReports, setLoadingReports] = useState(false);

    // Configurações de Preço
    const [pricing, setPricing] = useState({
        delivery_base_price: '7.00',
        delivery_km_price: '1.50',
        default_pickup_address: ''
    });
    const [savingConfig, setSavingConfig] = useState(false);

    const [newDelivery, setNewDelivery] = useState({
        title: '',
        customer_name: '',
        customer_phone: '',
        pickup_cep: '',
        pickup_address: '',
        pickup_number: '',
        pickup_complement: '',
        delivery_cep: '',
        delivery_address: '',
        delivery_number: '',
        delivery_complement: '',
        scheduled_date: new Date().toISOString().split('T')[0],
        scheduled_time: new Date().toTimeString().slice(0, 5),
        technician_id: '',
        estimated_km: 0,
        estimated_price: 0
    });
    const [calculating, setCalculating] = useState(false);

    const fetchReports = useCallback(async (period) => {
        setLoadingReports(true);
        try {
            const res = await api.get(`/delivery/reports?period=${period}`);
            setReports(res.data);
        } catch (e) {
            console.error('Erro ao buscar relatórios:', e);
        } finally {
            setLoadingReports(false);
        }
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, deliveriesRes, motoboyRes, settingsRes] = await Promise.all([
                api.get('/delivery/stats'),
                api.get('/os/tasks?module=delivery'),
                api.get('/delivery/motoboys'),
                api.get('/company/settings').catch(() => ({ data: {} }))
            ]);

            setStats(statsRes.data);
            const deliveryOnly = (deliveriesRes.data || []).filter(t => t.delivery_type && t.delivery_type !== 'os');
            setDeliveries(deliveryOnly);
            setMotoboys(motoboyRes.data || []);

            const settings = settingsRes.data || {};
            if (settings.delivery_base_price || settings.delivery_km_price) {
                setPricing({
                    delivery_base_price: settings.delivery_base_price || '7.00',
                    delivery_km_price: settings.delivery_km_price || '1.50',
                    default_pickup_address: settings.default_pickup_address || ''
                });
            }
        } catch (e) {
            console.error('Erro ao buscar dados do dashboard:', e);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (activeTab === 'reports') fetchReports(reportPeriod);
    }, [activeTab, reportPeriod, fetchReports]);

    const handleSavePricing = async () => {
        setSavingConfig(true);
        try {
            await api.put('/company/settings', pricing);
            alert('Configurações salvas com sucesso!');
            fetchData();
        } catch (e) {
            alert('Erro ao salvar as configurações: ' + (e.response?.data?.error || e.message));
        } finally {
            setSavingConfig(false);
        }
    };

    const handleAddressSearch = async (cep, type) => {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    const formatted = `${data.logradouro}${data.bairro ? ', ' + data.bairro : ''}, ${data.localidade} - ${data.uf}`;
                    setNewDelivery(prev => ({
                        ...prev,
                        [`${type}_address`]: formatted,
                        [`${type}_cep`]: cleanCep
                    }));
                }
            } catch (e) { console.error('Erro CEP:', e); }
        }
    };

    const formatFullAddress = (type) => {
        const addr = newDelivery[`${type}_address`];
        const num = newDelivery[`${type}_number`];
        const comp = newDelivery[`${type}_complement`];
        const cep = newDelivery[`${type}_cep`];

        let full = addr;
        if (num) full += `, ${num}`;
        if (comp) full += ` - ${comp}`;
        if (cep) full += `, ${cep}`;
        return full;
    };

    const calculateRoute = async () => {
        const pickup = formatFullAddress('pickup');
        const delivery = formatFullAddress('delivery');

        if (!newDelivery.pickup_address || !newDelivery.delivery_address) return alert('Informe os dois endereços!');
        setCalculating(true);
        try {
            const res = await api.post('/delivery/calculate-route', {
                pickup_address: pickup,
                delivery_address: delivery,
                base_price: pricing.delivery_base_price,
                km_price: pricing.delivery_km_price
            });

            const data = res.data;
            if (data.distance_km) {
                setNewDelivery(prev => ({
                    ...prev,
                    estimated_km: data.distance_km,
                    estimated_price: data.estimated_price
                }));
            }
        } catch (e) {
            console.error('Erro ao calcular rota:', e);
            const errorMsg = e.response?.data?.error || 'Erro ao calcular rota. Verifique sua conexão.';
            const field = e.response?.data?.field;
            if (field === 'pickup_address') {
                alert(`⚠️ Endereço de COLETA não encontrado.\n\n"${newDelivery.pickup_address}"\n\nDica: Tente adicionar a cidade e o estado. Ex: "Rua X, 123, Macaé - RJ"`);
            } else if (field === 'delivery_address') {
                alert(`⚠️ Endereço de ENTREGA não encontrado.\n\n"${newDelivery.delivery_address}"\n\nDica: Tente adicionar a cidade e o estado. Ex: "Rua Y, 456, Macaé - RJ"`);
            } else {
                alert(errorMsg);
            }
        } finally {
            setCalculating(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                title: newDelivery.title || `Entrega - ${newDelivery.customer_name}`,
                customer_name: newDelivery.customer_name,
                customer_phone: newDelivery.customer_phone,
                pickup_address: formatFullAddress('pickup'),
                delivery_address: formatFullAddress('delivery'),
                scheduled_date: newDelivery.scheduled_date,
                scheduled_time: newDelivery.scheduled_time,
                technician_id: newDelivery.technician_id || null,
                estimated_km: newDelivery.estimated_km,
                estimated_price: parseFloat(newDelivery.estimated_price) || 0,
                delivery_type: 'entrega',
                status: newDelivery.technician_id ? 'aceita' : 'aguardando_motoboy'
            };

            const res = await api.post('/delivery/create', payload);
            setShowModal(false);
            setNewDelivery({
                title: '', customer_name: '', customer_phone: '',
                pickup_address: pricing.default_pickup_address,
                delivery_address: '', estimated_km: 0, estimated_price: 0,
                scheduled_date: new Date().toISOString().split('T')[0],
                scheduled_time: new Date().toTimeString().slice(0, 5),
                technician_id: '',
                cep: ''
            });

            const km = res.data.estimated_km ? `${res.data.estimated_km} km` : 'N/A';
            const price = res.data.estimated_price ? `R$ ${parseFloat(res.data.estimated_price).toFixed(2)}` : 'N/A';
            alert(`✅ Entrega criada!\n📍 Distância: ${km}\n💰 Valor: ${price}\n📦 Código: ${res.data.tracking_code}`);
            fetchData();
        } catch (e) { alert('Erro ao criar entrega: ' + (e.response?.data?.error || e.message)); }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Fallback mais longo

        // Configuração WebSocket para Tempo Real
        const socket = io(API_BASE);

        socket.on('delivery:new', () => fetchData());
        socket.on('delivery:accepted', () => fetchData());
        socket.on('delivery:status_change', () => fetchData());

        // Atualiza apenas a posição do motoboy no mapa para ser fluido
        socket.on('delivery:motoboy_location', (data) => {
            setMotoboys(prev => prev.map(m =>
                m.id === data.motoboyId ? { ...m, lat: data.lat, lng: data.lng, heading: data.heading } : m
            ));
        });

        return () => {
            clearInterval(interval);
            socket.disconnect();
        };
    }, [fetchData]);

    const copyTenantId = () => {
        navigator.clipboard.writeText(user?.tenant_id || user?.id);
        alert('Código da empresa copiado!');
    };

    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center lg:pl-64">
                <Loader2 className="animate-spin text-[#25D366]" size={48} />
            </div>
        );
    }

    const getTechStatus = (m) => {
        const isBusy = deliveries.some(d => d.technician_id === m.id && !['entregue', 'concluida', 'cancelada'].includes(d.status));
        if (!m.is_available) return { label: 'Indisponível', color: 'bg-slate-500/10 text-slate-500' };
        if (isBusy) return { label: 'Em Entrega', color: 'bg-blue-500/10 text-blue-500' };
        return { label: 'Livre', color: 'bg-[#25D366]/10 text-[#25D366]' };
    };

    return (
        <div className="min-h-screen bg-[#0B0F19] text-white p-4 lg:p-8 lg:pl-72 focus:outline-none selection:bg-[#25D366]/30">
            {/* Header Moderno */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black flex items-center gap-4 tracking-tighter">
                        <div className="p-3 bg-gradient-to-br from-[#25D366] to-green-600 rounded-[24px] shadow-lg shadow-[#25D366]/20 rotate-3">
                            <Bike className="text-black" size={32} />
                        </div>
                        Delivery Pro
                    </h1>
                </div>
                <div className="flex items-center gap-4 overflow-x-auto pb-2 md:pb-0 scroll-hide">
                    <button
                        onClick={() => {
                            setNewDelivery(prev => ({ ...prev, pickup_address: pricing.default_pickup_address }));
                            setShowModal(true);
                        }}
                        className="whitespace-nowrap px-8 py-4 bg-[#25D366] text-black font-black rounded-[24px] shadow-2xl shadow-[#25D366]/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 uppercase text-[10px] tracking-widest"
                    >
                        <Plus size={20} strokeWidth={3} /> Criar Pedido
                    </button>
                    <div className="flex bg-[#1E293B] p-1.5 rounded-[24px] border border-white/5 shadow-inner shrink-0">
                        {[
                            { id: 'monitor', icon: <MapIcon size={16} />, label: 'Monitor' },
                            { id: 'fleet', icon: <Users size={16} />, label: 'Entregadores' },
                            { id: 'reports', icon: <BarChart3 size={16} />, label: 'Relatórios' },
                            { id: 'config', icon: <Settings size={16} />, label: 'Configurações' }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`px-4 py-2.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === t.id ? 'bg-white shadow-xl text-black' : 'text-slate-500 hover:text-white'}`}
                            >
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {activeTab === 'monitor' && (
                <>
                    {/* Botão de Cadastro Rápido se não houver motoboys */}
                    {motoboys.length === 0 && (
                        <div className="mb-12 p-10 bg-gradient-to-r from-blue-600/20 to-transparent rounded-[50px] border border-blue-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-6 text-center md:text-left">
                                <div className="p-5 bg-blue-500 rounded-3xl shadow-xl"><UserPlus className="text-white" size={32} /></div>
                                <div>
                                    <h4 className="text-2xl font-black italic tracking-tighter">Precisa de Entregadores?</h4>
                                    <p className="text-slate-400 font-medium">Você ainda não tem motoboys cadastrados. Clique no botão ao lado para ver como recrutá-los.</p>
                                </div>
                            </div>
                            <button onClick={() => setActiveTab('fleet')} className="px-10 py-5 bg-white text-black font-black rounded-3xl shadow-2xl hover:scale-105 transition-all text-xs tracking-widest uppercase">IR PARA RECRUTAMENTO</button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        {[
                            { label: 'Entregas Hoje', val: stats?.today_total || 0, icon: <Package />, color: 'from-blue-500 to-blue-700' },
                            { label: 'Em Andamento', val: stats?.in_progress || 0, icon: <Navigation />, color: 'from-orange-500 to-yellow-600' },
                            { label: 'Recursos Online', val: stats?.motoboys_online || 0, icon: <Users />, color: 'from-[#25D366] to-green-700' },
                            { label: 'Faturamento', val: `R$ ${stats?.total_revenue || 0}`, icon: <DollarSign />, color: 'from-purple-500 to-pink-700' }
                        ].map((s, i) => (
                            <div key={i} className="bg-[#1E293B] p-8 rounded-[40px] border border-white/5 shadow-2xl relative overflow-hidden group">
                                <div className={`absolute -top-4 -right-4 p-8 opacity-10 group-hover:scale-150 transition-all duration-700 bg-gradient-to-br ${s.color} rounded-full`}>
                                    {React.cloneElement(s.icon, { size: 64 })}
                                </div>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2">{s.label}</p>
                                <h3 className="text-4xl font-black tracking-tighter">{s.val}</h3>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        <div className="xl:col-span-2 space-y-8">
                            <div className="bg-[#1E293B] rounded-[60px] overflow-hidden border border-white/5 shadow-2xl h-[600px] relative z-[1]">
                                <MapContainer center={[-23.5505, -46.6333]} zoom={12} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

                                    {/* Rotas das Entregas Ativas */}
                                    {deliveries.filter(d => ['aceita', 'coletando', 'em_rota', 'em_deslocamento'].includes(d.status)).map(d => (
                                        <React.Fragment key={d.id}>
                                            {/* Ponto de Coleta (Azul) */}
                                            {d.pickup_lat && (
                                                <Marker position={[d.pickup_lat, d.pickup_lng]} icon={L.divIcon({ className: 'bg-none', html: `<div style="padding:4px;background:#3b82f6;color:white;border-radius:50%;border:2px solid white;box-shadow:0 0 10px rgba(59,130,246,0.5)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path></svg></div>` })} />
                                            )}
                                            {/* Ponto de Entrega (Verde) */}
                                            {d.delivery_lat && (
                                                <Marker position={[d.delivery_lat, d.delivery_lng]} icon={L.divIcon({ className: 'bg-none', html: `<div style="padding:4px;background:#22C55E;color:white;border-radius:50%;border:2px solid white;box-shadow:0 0 10px rgba(34,197,94,0.5)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path></svg></div>` })} />
                                            )}
                                            {/* Linha da Rota */}
                                            {d.route_polyline && d.route_polyline.length > 0 && (
                                                <Polyline
                                                    positions={d.route_polyline.map(p => [p.lat, p.lng])}
                                                    color={d.status === 'aceita' ? '#3b82f6' : '#22C55E'}
                                                    weight={3}
                                                    opacity={0.6}
                                                    dashArray={d.status === 'aceita' ? "5, 10" : "0"}
                                                />
                                            )}
                                        </React.Fragment>
                                    ))}

                                    {motoboys.map(tech => (tech.lat !== null && tech.lng !== null) && (
                                        <Marker key={tech.id} position={[tech.lat, tech.lng]} icon={L.divIcon({
                                            className: 'bg-none',
                                            html: `
                                                <div class="relative flex items-center justify-center" style="transform: rotate(${tech.heading || 0}deg); transition: transform 0.5s ease-in-out;">
                                                    <div class="absolute w-12 h-12 bg-white rounded-full animate-ping opacity-10"></div>
                                                    <div class="relative w-11 h-11 bg-white p-1 rounded-full shadow-2xl transition-transform hover:scale-125 duration-500">
                                                        <div class="w-full h-full rounded-full flex items-center justify-center text-xl overflow-hidden bg-slate-800" style="border: 3px solid ${tech.color || '#25D366'}">
                                                            ${tech.photo_url ? `<img src="${tech.photo_url}" class="w-full h-full object-cover">` : '<div style="transform: rotate(${-(tech.heading || 0)}deg)">🏍️</div>'}
                                                        </div>
                                                    </div>
                                                    <div class="absolute -top-1 -right-1 w-4 h-4 bg-[#25D366] rounded-full border-2 border-white"></div>
                                                </div>
                                            `,
                                            iconSize: [44, 44], iconAnchor: [22, 22]
                                        })}>
                                            <Popup>
                                                <div className="p-3 text-center">
                                                    <p className="font-black text-slate-800 uppercase tracking-tighter text-sm mb-1">{tech.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{getTechStatus(tech).label}</p>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}
                                </MapContainer>
                            </div>

                            <div className="bg-[#1E293B] rounded-[50px] p-8 border border-white/5">
                                <div className="flex items-center justify-between mb-8 px-2">
                                    <h3 className="text-2xl font-black tracking-tighter">Status da Frota</h3>
                                    <span className="text-[10px] font-black bg-[#25D366]/10 text-[#25D366] px-4 py-2 rounded-full uppercase tracking-widest">{motoboys.filter(m => m.is_available).length} ONLINE</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {motoboys.filter(m => m.is_available).map(m => {
                                        const st = getTechStatus(m);
                                        return (
                                            <div key={m.id} className="bg-black/20 p-5 rounded-[30px] border border-white/5 flex items-center gap-4 group transition-all hover:bg-black/40">
                                                <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-xl bg-slate-800 border-2" style={{ borderColor: m.color || '#25D366' }}>
                                                    {m.photo_url ? <img src={m.photo_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-xl italic text-slate-600">{m.name?.charAt(0) || '?'}</div>}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-black text-sm uppercase tracking-tight">{m.name}</p>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase">{m.vehicle_type} • {m.status}</p>
                                                </div>
                                                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${st.color}`}>{st.label}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar de Fluxo */}
                        <div className="bg-[#1E293B] rounded-[60px] p-8 border border-white/5 flex flex-col h-[820px] shadow-2xl">
                            <div className="flex items-center justify-between mb-8 px-2">
                                <h3 className="text-2xl font-black tracking-tighter">Pedidos</h3>
                                <div className="flex bg-black/40 p-1.5 rounded-[20px] border border-white/5">
                                    <button onClick={() => setDeliveryTab('active')} className={`px-5 py-2 rounded-[15px] text-[10px] font-black uppercase tracking-widest transition-all ${deliveryTab === 'active' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-500'}`}>Ativos</button>
                                    <button onClick={() => setDeliveryTab('completed')} className={`px-5 py-2 rounded-[15px] text-[10px] font-black uppercase tracking-widest transition-all ${deliveryTab === 'completed' ? 'bg-[#25D366] text-black shadow-lg' : 'text-slate-500'}`}>Fritos</button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                                {deliveries.filter(d => deliveryTab === 'active' ? d.status !== 'entregue' : d.status === 'entregue').map(d => (
                                    <div key={d.id} className="bg-black/20 p-5 rounded-[35px] border border-white/5 hover:border-[#25D366]/30 transition-all cursor-pointer group active:scale-95">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-3 py-1 rounded-[10px] font-mono font-black tracking-tighter border border-blue-500/20">#{d.tracking_code}</span>
                                            <p className="text-lg font-black text-[#25D366] tracking-tighter">R$ {d.estimated_price}</p>
                                        </div>
                                        <h4 className="font-black text-white text-md uppercase tracking-tight mb-3">{d.customer_name || 'Cliente'}</h4>
                                        <div className="space-y-2 mb-4 border-l-2 border-white/5 pl-4 ml-1">
                                            <p className="text-[11px] text-slate-500 truncate flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500/50 rounded-full"></div> {d.pickup_address}</p>
                                            <p className="text-[11px] text-slate-500 truncate flex items-center gap-2"><div className="w-1.5 h-1.5 bg-[#25D366]/50 rounded-full"></div> {d.delivery_address}</p>
                                        </div>
                                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                            <div className="flex items-center gap-2">
                                                {d.technician ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10" style={{ backgroundColor: d.technician.color }}>
                                                            {d.technician.photo_url ? <img src={d.technician.photo_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-black">{d.technician.name?.charAt(0)}</div>}
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{d.technician.name}</p>
                                                    </div>
                                                ) : <span className="text-[10px] text-yellow-500 font-black animate-pulse flex items-center gap-1"><AlertCircle size={10} /> BUSCANDO...</span>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const url = `${window.location.origin}/tracking/${d.tracking_code}`;
                                                        navigator.clipboard.writeText(url);
                                                        alert('Link de rastreio copiado para o cliente!');
                                                    }}
                                                    className="p-2 bg-white/5 hover:bg-[#25D366]/20 hover:text-[#25D366] rounded-xl transition-all"
                                                    title="Copiar Link de Rastreio"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                                <a
                                                    href={`/tracking/${d.tracking_code}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 bg-white/5 hover:bg-blue-500/20 hover:text-blue-400 rounded-xl transition-all"
                                                    title="Ver Rastreio"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                                <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full tracking-widest ${d.status === 'entregue' ? 'bg-[#25D366]/10 text-[#25D366]' : 'bg-blue-500/10 text-blue-400'}`}>{d.status?.replace('_', ' ')}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'fleet' && (
                /* ABA DE ENTREGADORES / RECRUTAMENTO */
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-700">
                    <div className="bg-gradient-to-br from-[#1E293B] to-[#0B0F19] p-12 rounded-[70px] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-12 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                        <div className="max-w-xl relative z-10">
                            <h2 className="text-5xl font-black mb-6 tracking-tighter italic">Recrutamento de Elite</h2>
                            <p className="text-slate-400 text-lg font-medium leading-relaxed">Sua plataforma é multi-empresa. Compartilhe seu **Código Exclusivo** abaixo para que novos entregadores se cadastrem diretamente na sua frota.</p>

                            <div className="mt-10 p-8 bg-black/40 rounded-[40px] border-2 border-dashed border-[#25D366]/30 flex items-center justify-between gap-6 group hover:border-[#25D366] transition-all">
                                <div>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mb-3">Enterprise Key (Sua Chave)</p>
                                    <p className="text-4xl font-mono font-black text-[#25D366] tracking-widest">{user?.tenant_id || user?.id}</p>
                                </div>
                                <button onClick={copyTenantId} className="p-6 bg-[#25D366] text-black rounded-3xl hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-[#25D366]/30 flex flex-col items-center gap-2">
                                    <Copy size={32} strokeWidth={3} />
                                    <span className="text-[8px] font-black uppercase">Copiar Chave</span>
                                </button>
                            </div>

                            <div className="mt-6 flex flex-col gap-3">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-4">Link para Cadastro do Motoboy:</p>
                                <div className="bg-white/5 p-5 rounded-[25px] border border-white/10 flex items-center justify-between">
                                    <code className="text-blue-400 font-bold truncate text-sm">{window.location.origin}/motoboy/register</code>
                                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/motoboy/register`); alert('Link copiado!'); }} className="text-white hover:text-blue-400 transition-all p-2"><ExternalLink size={20} /></button>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-6 w-full relative z-10">
                            <div className="bg-white/5 backdrop-blur-xl p-10 rounded-[50px] text-center border border-white/10 shadow-2xl group hover:bg-[#25D366]/10 transition-all">
                                <h4 className="text-5xl font-black text-blue-500 mb-2 tracking-tighter">{motoboys.length}</h4>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Total Squad</p>
                            </div>
                            <div className="bg-white/5 backdrop-blur-xl p-10 rounded-[50px] text-center border border-white/10 shadow-2xl group hover:bg-[#25D366]/10 transition-all">
                                <h4 className="text-5xl font-black text-[#25D366] mb-2 tracking-tighter">{motoboys.filter(m => m.is_available).length}</h4>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Prontos / Online</p>
                            </div>
                            <div className="col-span-2 bg-[#25D366]/10 p-8 rounded-[40px] border border-[#25D366]/20 flex items-center gap-6">
                                <div className="p-4 bg-[#25D366] text-black rounded-3xl"><UserPlus size={28} /></div>
                                <div className="flex-1">
                                    <p className="text-xs font-black text-white uppercase tracking-widest mb-1 italic">Dica de Gestão</p>
                                    <p className="text-[11px] text-[#25D366] font-medium leading-relaxed">Envie o Link de Cadastro + Sua Chave para os entregadores que você deseja recrutar. Eles farão o cadastro sozinhos e aparecerão aqui instantaneamente.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#1E293B] rounded-[60px] p-10 border border-white/5">
                        <div className="flex items-center justify-between mb-12 px-4">
                            <h3 className="text-3xl font-black tracking-tighter flex items-center gap-4"><Users className="text-[#25D366]" size={32} /> Squad de Atendimento</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                            {motoboys.map(m => (
                                <div key={m.id} className="bg-black/30 p-8 rounded-[50px] border border-white/5 flex flex-col items-center group relative hover:border-[#25D366]/30 transition-all duration-500">
                                    <div className="absolute top-6 right-6">
                                        <div className={`w-3 h-3 rounded-full ${m.is_available ? 'bg-[#25D366]' : 'bg-slate-600'}`}></div>
                                    </div>
                                    <div className="w-24 h-24 rounded-[35px] bg-slate-800 mb-6 overflow-hidden relative border-[6px] border-white/5 group-hover:border-[#25D366]/20 transition-all shadow-2xl flex items-center justify-center">
                                        {m.photo_url ? <img src={m.photo_url} className="w-full h-full object-cover" /> : <User className="w-12 h-12 text-slate-600" />}
                                    </div>
                                    <h4 className="font-black text-xl tracking-tighter uppercase text-center mb-1">{m.name}</h4>
                                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-6">{m.email}</p>

                                    <div className="grid grid-cols-2 gap-3 w-full">
                                        <div className="bg-white/5 p-4 rounded-3xl text-center border border-white/5">
                                            <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Carga</p>
                                            <p className="text-xs font-black uppercase text-[#25D366]">{m.vehicle_type || 'Moto'}</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-3xl text-center border border-white/5">
                                            <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Viagens</p>
                                            <p className="text-xs font-black text-blue-500">{m.total_deliveries || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'reports' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="bg-[#1E293B] p-10 rounded-[50px] border border-white/5 shadow-2xl">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-3xl font-black flex items-center gap-3 tracking-tighter uppercase italic"><BarChart3 size={32} className="text-[#25D366]" /> Relatórios de Performance</h3>
                                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1 ml-11">Análise financeira e operacional</p>
                            </div>
                            <div className="flex bg-black/40 p-1.5 rounded-[20px] border border-white/5">
                                {['day', 'week', 'month'].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setReportPeriod(p)}
                                        className={`px-6 py-2 rounded-[15px] text-[10px] font-black uppercase tracking-widest transition-all ${reportPeriod === p ? 'bg-[#25D366] text-black shadow-lg shadow-[#25D366]/20' : 'text-slate-500 hover:text-white'}`}
                                    >
                                        {p === 'day' ? 'Hoje' : p === 'week' ? '7 Dias' : '30 Dias'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {loadingReports ? (
                            <div className="py-20 flex flex-col items-center justify-center opacity-30">
                                <Loader2 className="animate-spin mb-4" size={48} />
                                <p className="font-black uppercase tracking-widest text-xs">Processando dados...</p>
                            </div>
                        ) : reports ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-blue-500/10 p-8 rounded-[40px] border border-blue-500/20 text-center">
                                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-2">Total Pedidos</p>
                                    <h4 className="text-4xl font-black">{reports.total_count}</h4>
                                </div>
                                <div className="bg-[#25D366]/10 p-8 rounded-[40px] border border-[#25D366]/20 text-center">
                                    <p className="text-[10px] text-[#25D366] font-black uppercase tracking-widest mb-2">Ganhos Período</p>
                                    <h4 className="text-4xl font-black text-[#25D366]">R$ {reports.total_revenue}</h4>
                                </div>
                                <div className="bg-orange-500/10 p-8 rounded-[40px] border border-orange-500/20 text-center">
                                    <p className="text-[10px] text-orange-400 font-black uppercase tracking-widest mb-2">Concluídos</p>
                                    <h4 className="text-4xl font-black">{reports.completed_count}</h4>
                                </div>
                                <div className="bg-red-500/10 p-8 rounded-[40px] border border-red-500/20 text-center">
                                    <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-2">Cancelados</p>
                                    <h4 className="text-4xl font-black">{reports.canceled_count}</h4>
                                </div>

                                <div className="md:col-span-2 bg-black/20 p-8 rounded-[40px] border border-white/5">
                                    <h5 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2"><PieChart size={18} className="text-[#25D366]" /> Top Motoboys (Ganhos)</h5>
                                    <div className="space-y-4">
                                        {Object.entries(reports.by_motoboy).sort(([, a], [, b]) => b - a).map(([name, val]) => (
                                            <div key={name} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                                                <p className="font-bold text-sm uppercase tracking-tight">{name}</p>
                                                <p className="font-black text-[#25D366]">R$ {val.toFixed(2)}</p>
                                            </div>
                                        ))}
                                        {Object.keys(reports.by_motoboy).length === 0 && <p className="text-center text-slate-600 text-xs py-4">Nenhuma entrega no período.</p>}
                                    </div>
                                </div>

                                <div className="md:col-span-2 bg-black/20 p-8 rounded-[40px] border border-white/5">
                                    <h5 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2"><Calendar size={18} className="text-blue-500" /> Histórico Diário (Ganhos)</h5>
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                        {Object.entries(reports.daily).sort((a, b) => b[0].localeCompare(a[0])).map(([date, val]) => (
                                            <div key={date} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                                                <p className="font-mono text-xs">{new Date(date).toLocaleDateString()}</p>
                                                <p className="font-black text-blue-500">R$ {val.toFixed(2)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {activeTab === 'config' && (
                <div className="max-w-4xl mx-auto animate-in fade-in zoom-in duration-500">
                    <div className="bg-[#1E293B] rounded-[60px] p-12 border border-white/5 shadow-2xl relative overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-2">Taxa Base (Bandeirada)</label>
                                <input type="number" step="0.01" className="w-full bg-black/20 border border-white/5 rounded-[30px] p-6 text-3xl font-black text-[#25D366] outline-none" value={pricing.delivery_base_price} onChange={e => setPricing({ ...pricing, delivery_base_price: e.target.value })} />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-2">Valor por KM Rodado</label>
                                <input type="number" step="0.01" className="w-full bg-black/20 border border-white/5 rounded-[30px] p-6 text-3xl font-black text-blue-500 outline-none" value={pricing.delivery_km_price} onChange={e => setPricing({ ...pricing, delivery_km_price: e.target.value })} />
                            </div>
                            <div className="md:col-span-2 space-y-4">
                                <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-2">Endereço de Coleta Padrão (Empresa)</label>
                                <textarea rows="2" className="w-full bg-black/20 border border-white/5 rounded-[30px] p-6 text-xl font-bold text-white outline-none" value={pricing.default_pickup_address} onChange={e => setPricing({ ...pricing, default_pickup_address: e.target.value })} placeholder="Ex: Rua das Flores, 123, Centro..." />
                                <p className="text-[9px] text-slate-500 font-bold uppercase ml-4 italic">* Use o endereço completo para que o GPS encontre a localização correta.</p>
                            </div>
                        </div>
                        <button onClick={handleSavePricing} disabled={savingConfig} className="w-full mt-10 py-6 bg-gradient-to-r from-[#25D366] to-green-600 text-black font-black rounded-[30px] flex items-center justify-center gap-4 uppercase tracking-[0.2em] transition-all">
                            {savingConfig ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Salvar Configurações</>}
                        </button>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-[#0F172A] w-full max-w-2xl rounded-[40px] border border-white/10 p-8 shadow-2xl overflow-y-auto max-h-[95vh] relative scroll-hide">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tighter">Nova Entrega / Delivery</h3>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Preencha os dados do pedido abaixo</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-3 bg-white/5 hover:bg-red-500/10 hover:text-red-500 rounded-full text-slate-400 transition-all"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Título ou Descrição</label>
                                    <input required className="w-full bg-[#1E293B] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-[#25D366]/50 transition-all" placeholder="Ex: Entrega Almoço #123" value={newDelivery.title} onChange={e => setNewDelivery({ ...newDelivery, title: e.target.value })} />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Nome do Cliente</label>
                                    <input required className="w-full bg-[#1E293B] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-[#25D366]/50 transition-all" placeholder="Quem recebe?" value={newDelivery.customer_name} onChange={e => setNewDelivery({ ...newDelivery, customer_name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">WhatsApp do Cliente</label>
                                    <input className="w-full bg-[#1E293B] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-[#25D366]/50 transition-all" placeholder="22 99999-9999" value={newDelivery.customer_phone} onChange={e => setNewDelivery({ ...newDelivery, customer_phone: e.target.value })} />
                                </div>

                                <div className="md:col-span-2 space-y-6">
                                    {/* COLETA */}
                                    <div className="p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10 space-y-4">
                                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2 mb-2"><MapPin size={14} /> Local de Coleta</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            <input className="w-full bg-[#1E293B] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500/50" placeholder="CEP" value={newDelivery.pickup_cep} onChange={e => { setNewDelivery({ ...newDelivery, pickup_cep: e.target.value }); handleAddressSearch(e.target.value, 'pickup'); }} />
                                            <input className="col-span-2 w-full bg-[#1E293B] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500/50" placeholder="Endereço / Logradouro" value={newDelivery.pickup_address} onChange={e => setNewDelivery({ ...newDelivery, pickup_address: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input className="w-full bg-[#1E293B] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500/50" placeholder="Nº (Opcional)" value={newDelivery.pickup_number} onChange={e => setNewDelivery({ ...newDelivery, pickup_number: e.target.value })} />
                                            <input className="w-full bg-[#1E293B] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500/50" placeholder="Comp. (Opcional)" value={newDelivery.pickup_complement} onChange={e => setNewDelivery({ ...newDelivery, pickup_complement: e.target.value })} />
                                        </div>
                                    </div>

                                    {/* ENTREGA */}
                                    <div className="p-6 bg-[#25D366]/5 rounded-3xl border border-[#25D366]/10 space-y-4">
                                        <label className="text-[10px] font-black text-[#25D366] uppercase tracking-widest flex items-center gap-2 mb-2"><Navigation size={14} /> Local de Entrega</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            <input className="w-full bg-[#1E293B] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-[#25D366]/50" placeholder="CEP" value={newDelivery.delivery_cep} onChange={e => { setNewDelivery({ ...newDelivery, delivery_cep: e.target.value }); handleAddressSearch(e.target.value, 'delivery'); }} />
                                            <input className="col-span-2 w-full bg-[#1E293B] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-[#25D366]/50" placeholder="Endereço / Logradouro" value={newDelivery.delivery_address} onChange={e => setNewDelivery({ ...newDelivery, delivery_address: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input className="w-full bg-[#1E293B] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-[#25D366]/50" placeholder="Nº (Opcional)" value={newDelivery.delivery_number} onChange={e => setNewDelivery({ ...newDelivery, delivery_number: e.target.value })} />
                                            <input className="w-full bg-[#1E293B] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-[#25D366]/50" placeholder="Comp. (Opcional)" value={newDelivery.delivery_complement} onChange={e => setNewDelivery({ ...newDelivery, delivery_complement: e.target.value })} />
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={calculateRoute}
                                        disabled={calculating}
                                        className="w-full py-5 bg-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3 border border-white/10 text-white"
                                    >
                                        {calculating ? <Loader2 className="animate-spin" size={18} /> : <TrendingUp size={18} />}
                                        {calculating ? 'Calculando Rota...' : 'CALCULAR KM E PREÇO SUGERIDO'}
                                    </button>
                                </div>

                                <div className="md:col-span-2 grid grid-cols-2 gap-4 p-6 bg-white/5 rounded-3xl border border-white/5">
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Distância Est.</p>
                                        <p className="text-3xl font-black text-white tracking-tighter">{newDelivery.estimated_km} <span className="text-xs text-slate-500">km</span></p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Preço Sugerido</p>
                                        <p className="text-3xl font-black text-[#25D366] tracking-tighter">R$ {newDelivery.estimated_price}</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Motoboy (Opcional)</label>
                                    <select className="w-full bg-[#1E293B] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-[#25D366]/50 appearance-none pointer-events-auto" value={newDelivery.technician_id} onChange={e => setNewDelivery({ ...newDelivery, technician_id: e.target.value })}>
                                        <option value="">Aguardando Disponível...</option>
                                        {motoboys.map(t => <option key={t.id} value={t.id} className="bg-[#0F172A]">{t.name} ({getTechStatus(t).label})</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Data</label>
                                        <input type="date" className="w-full bg-[#1E293B] border border-white/10 rounded-2xl p-4 text-white text-xs font-bold" value={newDelivery.scheduled_date} onChange={e => setNewDelivery({ ...newDelivery, scheduled_date: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Hora</label>
                                        <input type="time" className="w-full bg-[#1E293B] border border-white/10 rounded-2xl p-4 text-white text-xs font-bold" value={newDelivery.scheduled_time} onChange={e => setNewDelivery({ ...newDelivery, scheduled_time: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="w-full py-6 bg-gradient-to-r from-[#25D366] to-green-600 text-black font-black rounded-3xl text-xl tracking-tighter uppercase shadow-2xl shadow-[#25D366]/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4">
                                SOLICITAR ENTREGA AGORA
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; }
                .scroll-hide::-webkit-scrollbar { display: none; }
                .leaflet-container { width: 100%; height: 100%; z-index: 1; filter: grayscale(1) invert(1) brightness(0.7) contrast(1.2); }
            `}</style>
        </div>
    );
}
