import React, { useState, useEffect, useCallback } from 'react';
import {
    Bike, MapPin, Navigation, Package, Clock, DollarSign,
    Users, TrendingUp, AlertCircle, Search, Filter, ChevronRight,
    Map as MapIcon, Loader2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

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
    const [activeTab, setActiveTab] = useState('active'); // 'active', 'pending', 'completed'

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, deliveriesRes, techRes] = await Promise.all([
                api.get('/delivery/stats'),
                api.get('/os/tasks'), // Pegamos todas as OS e filtramos no front ou usamos endpoint de entrega
                api.get('/os/technicians')
            ]);

            setStats(statsRes.data);
            // Filtrar apenas tarefas que são do tipo delivery e estão ativas
            const deliveryOnly = (deliveriesRes.data || []).filter(t => t.delivery_type && t.delivery_type !== 'os');
            setDeliveries(deliveryOnly);

            // Motoboys online
            setMotoboys((techRes.data || []).filter(t => t.is_available || t.status === 'online'));
        } catch (e) {
            console.error('Erro ao buscar dados do dashboard:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Auto-refresh 30s
        return () => clearInterval(interval);
    }, [fetchData]);

    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center lg:pl-64">
                <Loader2 className="animate-spin text-[#25D366]" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0B0F19] text-white p-4 lg:p-8 lg:pl-72">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black flex items-center gap-3">
                        <div className="p-2 bg-[#25D366]/20 rounded-2xl">
                            <Bike className="text-[#25D366]" size={32} />
                        </div>
                        Monitoramento de Entregas
                    </h1>
                    <p className="text-slate-400 mt-1">Visão geral em tempo real da sua frota e pedidos.</p>
                </div>
                <div className="flex bg-[#1E293B] p-1 rounded-2xl border border-white/5">
                    <button onClick={() => fetchData()} className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition-all">Atualizar Agora</button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Entregas Hoje', val: stats?.today_total || 0, icon: <Package />, color: 'text-blue-500' },
                    { label: 'Em Andamento', val: stats?.in_progress || 0, icon: <Navigation />, color: 'text-yellow-500' },
                    { label: 'Motoboys Online', val: stats?.motoboys_online || 0, icon: <Users />, color: 'text-[#25D366]' },
                    { label: 'Faturamento Estimado', val: `R$ ${stats?.total_revenue || 0}`, icon: <TrendingUp />, color: 'text-purple-500' }
                ].map((s, i) => (
                    <div key={i} className="bg-[#1E293B] p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 p-6 opacity-5 group-hover:scale-125 transition-transform duration-500 ${s.color}`}>{s.icon}</div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{s.label}</p>
                        <h3 className="text-3xl font-black">{s.val}</h3>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Mapa de Operações */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="bg-[#1E293B] rounded-[40px] overflow-hidden border border-white/5 shadow-2xl h-[550px] relative">
                        <MapContainer center={[-23.5505, -46.6333]} zoom={12} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

                            {/* Motoboys no Mapa */}
                            {motoboys.map(tech => tech.lat && (
                                <Marker key={tech.id} position={[tech.lat, tech.lng]} icon={L.divIcon({
                                    className: 'bg-none',
                                    html: `<div style="background-color: ${tech.color || '#25D366'}; width: 40px; height: 40px; border-radius: 50%; border: 4px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; box-shadow: 0 4px 15px rgba(0,0,0,0.5); animation: pulse 2s infinite">🏍️</div>`,
                                    iconSize: [40, 40], iconAnchor: [20, 20]
                                })}>
                                    <Popup>
                                        <div className="p-2">
                                            <p className="font-bold text-slate-800">{tech.name}</p>
                                            <p className="text-xs text-slate-500">Status: {tech.is_available ? 'Livre' : 'Ocupado'}</p>
                                            <p className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full mt-1 inline-block">{tech.vehicle_type}</p>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}

                            {/* Entregas Ativas (Polilinhas) */}
                            {deliveries.filter(d => ['em_rota', 'em_deslocamento'].includes(d.status) && d.route_polyline?.length > 0).map(d => (
                                <Polyline key={d.id} positions={d.route_polyline.map(p => [p.lat, p.lng])} color="#25D366" weight={3} opacity={0.5} dashArray="10, 5" />
                            ))}
                        </MapContainer>

                        <div className="absolute bottom-6 left-6 z-20 flex gap-3">
                            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-xs font-bold flex items-center gap-2">
                                <div className="w-3 h-3 bg-[#25D366] rounded-full"></div> Motoboy Disponível
                            </div>
                            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-xs font-bold flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div> Coleta Pendente
                            </div>
                        </div>
                    </div>

                    {/* Lista de Motoboys */}
                    <div className="bg-[#1E293B] rounded-[40px] p-6 border border-white/5">
                        <h3 className="text-xl font-black mb-6 flex items-center gap-2 px-2">
                            <Users className="text-[#25D366]" /> Frota Ativa ({motoboys.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {motoboys.length === 0 ? (
                                <p className="col-span-2 text-center text-slate-500 py-10">Nenhum motoboy online no momento.</p>
                            ) : motoboys.map(m => (
                                <div key={m.id} className="bg-white/5 p-4 rounded-3xl border border-white/5 flex items-center gap-4 group hover:bg-white/10 transition-all">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg" style={{ backgroundColor: m.color || '#25D366' }}>
                                        {m.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold">{m.name}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-black">{m.status} • {m.vehicle_type}</p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${m.is_available ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                        {m.is_available ? 'Livre' : 'Ocupado'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar com Lista de Pedidos */}
                <div className="space-y-6">
                    <div className="bg-[#1E293B] rounded-[40px] p-6 border border-white/5 flex flex-col h-[820px]">
                        <div className="flex items-center justify-between mb-6 px-2">
                            <h3 className="text-xl font-black">Pedidos</h3>
                            <div className="flex bg-black/20 p-1 rounded-xl">
                                <button onClick={() => setActiveTab('active')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'active' ? 'bg-blue-500 text-white' : 'text-slate-500'}`}>Ativos</button>
                                <button onClick={() => setActiveTab('completed')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'completed' ? 'bg-[#25D366] text-black' : 'text-slate-500'}`}>Fritos</button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                            {deliveries.filter(d => activeTab === 'active' ? d.status !== 'entregue' && d.status !== 'concluida' : d.status === 'entregue' || d.status === 'concluida').length === 0 ? (
                                <div className="text-center py-20 opacity-30">
                                    <Package size={48} className="mx-auto mb-4" />
                                    <p className="font-bold">Nenhum pedido aqui.</p>
                                </div>
                            ) : (
                                deliveries.filter(d => activeTab === 'active' ? d.status !== 'entregue' && d.status !== 'concluida' : d.status === 'entregue' || d.status === 'concluida').map(d => (
                                    <div key={d.id} className="bg-white/5 p-4 rounded-3xl border border-white/5 hover:border-[#25D366]/30 transition-all cursor-pointer group">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono font-bold">#{d.tracking_code}</span>
                                                <h4 className="font-bold text-white mt-1">{d.customer_name || 'Sem nome'}</h4>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-[#25D366]">R$ {d.estimated_price}</p>
                                                <p className="text-[10px] text-slate-500 font-bold">{d.estimated_km} KM</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                <p className="text-[11px] text-slate-400 truncate">{d.pickup_address}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#25D366]"></div>
                                                <p className="text-[11px] text-slate-400 truncate">{d.delivery_address}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                            <div className="flex items-center gap-2">
                                                {d.technician ? (
                                                    <>
                                                        <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: d.technician.color }}>{d.technician.name?.charAt(0)}</div>
                                                        <p className="text-[11px] text-slate-300 font-bold">{d.technician.name}</p>
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] text-yellow-500 font-black animate-pulse flex items-center gap-1">
                                                        <AlertCircle size={10} /> AGUARDANDO
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${d.status === 'entregue' ? 'bg-[#25D366]/20 text-[#25D366]' :
                                                    d.status === 'aceita' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-slate-400'
                                                }`}>
                                                {d.status?.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
            `}</style>
        </div>
    );
}
