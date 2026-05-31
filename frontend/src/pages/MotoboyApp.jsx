import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bike, MapPin, Navigation, Package, CheckCircle2, XCircle,
    Power, User, Clock, DollarSign, Map as MapIcon, ChevronRight,
    Loader2, Play, Square, Hash, Camera, Upload, LogOut, Bell, BellOff
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

// Leaflet markers fix
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function ChangeView({ center, zoom }) {
    const map = useMap();
    if (center) map.setView(center, zoom);
    return null;
}

export default function MotoboyApp({ initialMode = 'deliveries' }) {
    const { user, logout, updateUser } = useAuth();
    const navigate = useNavigate();
    const [isOnline, setIsOnline] = useState(false);
    const [availableDeliveries, setAvailableDeliveries] = useState([]);
    const [activeDelivery, setActiveDelivery] = useState(null);
    const [stats, setStats] = useState({ total_km: 0, total_earnings: 0, completed: 0, balance: 0 });
    const [loading, setLoading] = useState(true);
    const [myPos, setMyPos] = useState(null);
    const [showHistory, setShowHistory] = useState(initialMode === 'history');
    const [showWallet, setShowWallet] = useState(initialMode === 'wallet');
    const [showProfile, setShowProfile] = useState(initialMode === 'profile');
    const [showOverview, setShowOverview] = useState(initialMode === 'overview');
    const [history, setHistory] = useState([]);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [uploading, setUploading] = useState(false);

    const socketRef = useRef(null);
    const watchId = useRef(null);
    const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

    const requestNotificationPermission = useCallback(async () => {
        if (!('Notification' in window)) return;
        const permission = await Notification.requestPermission();
        setNotificationsEnabled(permission === 'granted');
    }, []);

    const sendBrowserNotification = useCallback((title, body) => {
        if (Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: '/logo192.png',
                vibrate: [200, 100, 200]
            });
        }
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, availRes, historyRes, profileRes] = await Promise.all([
                api.get('/delivery/motoboy/stats'),
                api.get('/delivery/available'),
                api.get('/delivery/motoboy/my-deliveries'),
                api.get('/delivery/motoboy/profile')
            ]);
            setStats(statsRes.data);
            setAvailableDeliveries(availRes.data);
            setHistory(historyRes.data);
            setIsOnline(!!profileRes.data?.is_available);

            const active = (historyRes.data || []).find(d => ['aceita', 'coletando', 'em_rota', 'em_deslocamento'].includes(d.status));
            if (active) {
                const fullRes = await api.get(`/delivery/track/${active.tracking_code}`);
                setActiveDelivery(fullRes.data);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        if ('Notification' in window) {
            setNotificationsEnabled(Notification.permission === 'granted');
        }
    }, [fetchData]);

    useEffect(() => {
        if (!user) return;
        const wsUrl = API_BASE.replace('/api', '');
        const socket = io(wsUrl, { transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('motoboy:join', { tenantId: user.tenant_id, motoboyId: user.id });
        });

        socket.on('delivery:new', (data) => {
            setAvailableDeliveries(prev => [data.delivery, ...prev]);
            audioRef.current.play().catch(e => console.log('Audio play failed:', e));
            sendBrowserNotification('Nova Entrega Disponível! 🚀', `R$ ${data.delivery.estimated_price} - De: ${data.delivery.pickup_address} Para: ${data.delivery.delivery_address}`);
            if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
        });

        if (navigator.geolocation) {
            watchId.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude, accuracy } = pos.coords;
                    setMyPos({ lat: latitude, lng: longitude });
                    if (isOnline) {
                        api.post('/delivery/location', {
                            lat: latitude, lng: longitude, accuracy,
                            trackingCode: activeDelivery?.tracking_code
                        }).catch(console.error);

                        socket.emit('motoboy:location', {
                            tenantId: user.tenant_id, motoboyId: user.id,
                            trackingCode: activeDelivery?.tracking_code,
                            lat: latitude, lng: longitude, accuracy
                        });
                    }
                },
                (err) => console.error('GPS Watch Error:', err),
                { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
            );
        }

        return () => {
            socket.disconnect();
            if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
        };
    }, [user, isOnline, activeDelivery, sendBrowserNotification]);

    const toggleOnline = async () => {
        try {
            const res = await api.put('/delivery/motoboy/toggle-online');
            setIsOnline(res.data.is_available);
            if (res.data.is_available && !notificationsEnabled) {
                requestNotificationPermission();
            }
        } catch (e) { alert('Erro ao mudar status'); }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/upload', formData);
            const photoUrl = res.data.url;
            await api.put('/delivery/motoboy/profile-photo', { photo_url: photoUrl });
            alert('Foto atualizada com sucesso!');
            window.location.reload();
        } catch (err) {
            alert('Erro ao subir foto');
        } finally {
            setUploading(false);
        }
    };

    const acceptDelivery = async (id) => {
        try {
            setLoading(true);
            const res = await api.post(`/delivery/accept/${id}`);
            setActiveDelivery(res.data);
            setAvailableDeliveries(prev => prev.filter(d => d.id !== id));
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || 'Erro ao aceitar corrida');
        } finally {
            setLoading(false);
        }
    };

    const confirmPickup = async () => {
        try {
            if (!myPos) return alert('Aguardando sinal de GPS...');
            const res = await api.post(`/delivery/pickup/${activeDelivery.id}`, { lat: myPos.lat, lng: myPos.lng });
            setActiveDelivery(res.data);
        } catch (e) { alert('Erro ao confirmar coleta'); }
    };

    const confirmDelivery = async () => {
        if (!confirm('Deseja confirmar a entrega finalizada?')) return;
        try {
            if (!myPos) return alert('Aguardando sinal de GPS...');
            const notes = prompt('Observações da entrega (opcional):');
            await api.post(`/delivery/complete/${activeDelivery.id}`, { lat: myPos.lat, lng: myPos.lng, notes });
            setActiveDelivery(null);
            fetchData();
            sendBrowserNotification('Entrega Concluída! 🏁', 'Bom trabalho! O valor foi adicionado à sua carteira.');
        } catch (e) { alert('Erro ao finalizar entrega'); }
    };

    const openNavigation = (lat, lng, address) => {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        let url = lat && lng
            ? (isMobile ? `google.navigation:q=${lat},${lng}` : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`)
            : (isMobile ? `google.navigation:q=${encodeURIComponent(address)}` : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`);
        window.open(url, isMobile ? '_self' : '_blank');
    };

    if (loading && !activeDelivery && availableDeliveries.length === 0) {
        return (
            <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#25D366]" size={48} />
            </div>
        );
    }

    if (showOverview) {
        return (
            <div className="space-y-6 animate-fade-in pb-20">
                <div className="bg-gradient-to-br from-[#25D366] to-[#128C7E] p-8 rounded-[32px] text-black shadow-xl">
                    <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-2">Meu Saldo</p>
                    <h2 className="text-5xl font-black mb-6">R$ {parseFloat(stats.balance || 0).toFixed(2)}</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                            <p className="text-[10px] font-black uppercase opacity-70">Total Coletado</p>
                            <p className="text-xl font-black">R$ {parseFloat(stats.total_earnings || 0).toFixed(2)}</p>
                        </div>
                        <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                            <p className="text-[10px] font-black uppercase opacity-70">Km Rodados</p>
                            <p className="text-xl font-black">{(stats.total_km || 0).toFixed(1)} km</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass-panel p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-[#25D366]/10 rounded-xl text-[#25D366]">
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white">Desempenho</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{stats.completed || 0} Entregas Concluídas</p>
                            </div>
                        </div>
                        {/* Gráfico ou Barra de Progresso Simples */}
                        <div className="w-full h-2 bg-white/5 rounded-full mt-4 overflow-hidden">
                            <div className="h-full bg-[#25D366] rounded-full" style={{ width: `${Math.min((stats.completed || 0) * 10, 100)}%` }}></div>
                        </div>
                    </div>

                    <div className="glass-panel p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-500">
                                <DollarSign size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white">Solicitar Saque</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Mínimo R$ 50,00</p>
                            </div>
                        </div>
                        <button onClick={() => setShowWallet(true)} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold text-sm transition-all border border-white/5">
                            ACESSAR CARTEIRA
                        </button>
                    </div>
                </div>

                <div className="glass-panel p-6">
                    <h3 className="text-lg font-black text-white mb-4">Dicas de Segurança</h3>
                    <div className="space-y-3">
                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-3">
                            <Clock size={20} className="text-blue-400 shrink-0" />
                            <p className="text-sm text-blue-100 italic">"Mantenha o GPS ativo durante toda a corrida para garantir o pagamento correto."</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col font-sans pb-24 lg:pb-0 lg:pl-64">
            {/* Header Fixo */}
            <div className="bg-[#1E293B] p-4 border-b border-white/10 sticky top-0 z-50 flex items-center justify-between">
                <div
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 active:scale-95 transition-all"
                    onClick={() => setShowProfile(true)}
                >
                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-[#25D366]/10 flex items-center justify-center bg-slate-700">
                        {user?.photo_url ? (
                            <img src={user.photo_url} className="w-full h-full object-cover" alt="Perfil" />
                        ) : (
                            <User className="text-slate-400" size={24} />
                        )}
                    </div>
                    <div>
                        <h2 className="font-bold text-sm leading-tight">{user?.name}</h2>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isOnline ? 'text-[#25D366]' : 'text-slate-500'}`}>
                            {isOnline ? 'Online • Disponível' : 'Offline • Indisponível'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={requestNotificationPermission} className={`p-2 rounded-xl transition-all ${notificationsEnabled ? 'text-[#25D366] bg-[#25D366]/10' : 'text-slate-500 bg-white/5'}`}>
                        {notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
                    </button>
                    <button
                        onClick={toggleOnline}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border ${isOnline ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-[#25D366]/10 border-[#25D366]/20 text-[#25D366]'}`}
                    >
                        <Power size={14} /> {isOnline ? 'FICAR OFF' : 'FICAR ON'}
                    </button>
                </div>
            </div>

            <div className="p-4 grid grid-cols-3 gap-3">
                <div className="bg-[#1E293B] p-3 rounded-2xl border border-white/5 text-center">
                    <Clock className="mx-auto text-blue-400 mb-1" size={18} />
                    <p className="text-xl font-black">{stats.completed}</p>
                    <p className="text-[9px] text-slate-500 uppercase font-black">Entregas</p>
                </div>
                <div className="bg-[#1E293B] p-3 rounded-2xl border border-white/5 text-center">
                    <Navigation className="mx-auto text-[#25D366] mb-1" size={18} />
                    <p className="text-xl font-black">{stats.total_km}</p>
                    <p className="text-[9px] text-slate-500 uppercase font-black">KM Totais</p>
                </div>
                <div className="bg-[#1E293B] p-3 rounded-2xl border border-white/5 text-center">
                    <DollarSign className="mx-auto text-yellow-500 mb-1" size={18} />
                    <p className="text-xl font-black">R${stats.total_earnings}</p>
                    <p className="text-[9px] text-slate-500 uppercase font-black">Ganhos</p>
                </div>
            </div>

            <div className="flex-1 p-4 space-y-6">
                {activeDelivery ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-[#25D366] text-black p-4 rounded-3xl shadow-xl shadow-[#25D366]/10 relative overflow-hidden">
                            <h3 className="text-lg font-black flex items-center gap-2 mb-1 uppercase tracking-tighter">
                                {activeDelivery.status === 'aceita' ? '🚀 Vá para a Coleta' :
                                    activeDelivery.status === 'coletando' ? '📦 Coletando Pedido' :
                                        '🏁 Vá para o Destino'}
                            </h3>
                            <p className="text-sm font-bold opacity-70">Pedido #{activeDelivery.tracking_code}</p>
                            <div className="mt-4 space-y-3">
                                <div className="flex items-center gap-3 bg-black/5 p-3 rounded-2xl">
                                    <div className="w-8 h-8 bg-black/10 rounded-full flex items-center justify-center font-bold text-xs">1</div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-[9px] text-black/50 font-black uppercase">Coleta:</p>
                                        <p className="text-xs font-bold truncate leading-tight">{activeDelivery.pickup_address}</p>
                                    </div>
                                    <button onClick={() => openNavigation(activeDelivery.pickup_lat, activeDelivery.pickup_lng, activeDelivery.pickup_address)} className="p-2 bg-black/10 rounded-xl"><Navigation size={16} /></button>
                                </div>
                                <div className="flex items-center gap-3 bg-black/5 p-3 rounded-2xl">
                                    <div className="w-8 h-8 bg-black/10 rounded-full flex items-center justify-center font-bold text-xs">2</div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-[9px] text-black/50 font-black uppercase">Entrega:</p>
                                        <p className="text-xs font-bold truncate leading-tight">{activeDelivery.delivery_address}</p>
                                    </div>
                                    <button onClick={() => openNavigation(activeDelivery.delivery_lat, activeDelivery.delivery_lng, activeDelivery.delivery_address)} className="p-2 bg-black/10 rounded-xl"><Navigation size={16} /></button>
                                </div>
                            </div>
                        </div>

                        <div className="h-[300px] rounded-[40px] overflow-hidden border border-white/10 shadow-2xl relative z-10">
                            <MapContainer center={myPos ? [myPos.lat, myPos.lng] : [-23.55, -46.63]} zoom={15} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                {myPos && <Marker position={[myPos.lat, myPos.lng]} icon={L.divIcon({ className: 'bg-none', html: `<div style="width:20px;height:20px;border-radius:50%;background:#25D366;border:3px solid white;box-shadow:0 0 15px #25D366"></div>` })} />}
                                {activeDelivery.delivery_lat && <Marker position={[activeDelivery.delivery_lat, activeDelivery.delivery_lng]} />}
                                {myPos && <ChangeView center={[myPos.lat, myPos.lng]} zoom={15} />}
                            </MapContainer>
                            <div className="absolute bottom-6 left-6 right-6 z-20 flex gap-2">
                                {activeDelivery.status === 'aceita' ? (
                                    <button onClick={confirmPickup} className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 uppercase text-sm tracking-widest"><Package size={20} /> Coletei</button>
                                ) : (
                                    <button onClick={confirmDelivery} className="flex-1 bg-green-600 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 uppercase text-sm tracking-widest"><Square size={20} /> Entreguei</button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-lg font-black flex items-center gap-2">Corridas Disponíveis</h3>
                            <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">{availableDeliveries.length} Perto</span>
                        </div>
                        {availableDeliveries.length === 0 ? (
                            <div className="text-center py-20 bg-[#1E293B]/30 rounded-[40px] border border-dashed border-white/5 mx-2">
                                <div className="text-5xl mb-4 animate-bounce">📡</div>
                                <p className="text-slate-400 font-bold">Buscando novas rotas...</p>
                                {!isOnline && <p className="text-[10px] text-red-500/60 mt-4 uppercase font-black tracking-widest">Fique Online para receber</p>}
                            </div>
                        ) : (
                            <div className="space-y-3 mx-2">
                                {availableDeliveries.map(d => (
                                    <div key={d.id} className="bg-[#1E293B] border border-white/5 rounded-3xl p-5 hover:border-[#25D366]/30 transition-all active:scale-[0.98]">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="text-xl font-black text-[#25D366]">R$ {d.estimated_price}</h4>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1 mt-1 opacity-60">
                                                    <Navigation size={10} /> {d.estimated_km} KM • {d.customer_name}
                                                </p>
                                            </div>
                                            <div className="p-3 bg-blue-500/10 rounded-2xl"><Package className="text-blue-500" size={20} /></div>
                                        </div>
                                        <div className="space-y-2 mb-5">
                                            <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div><p className="text-[11px] text-slate-400 truncate tracking-tight">{d.pickup_address}</p></div>
                                            <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div><p className="text-[11px] text-slate-400 truncate tracking-tight">{d.delivery_address}</p></div>
                                        </div>
                                        <button onClick={() => acceptDelivery(d.id)} className="w-full bg-[#25D366] text-black font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest text-xs"> ACEITAR CORRIDA <ChevronRight size={18} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal de Perfil */}
            {showProfile && (
                <div className="fixed inset-0 z-[100] bg-[#0B0F19] flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#1E293B]">
                        <h3 className="font-black flex items-center gap-2"><User /> Meu Perfil</h3>
                        <button onClick={() => setShowProfile(false)} className="p-2 bg-white/5 rounded-full"><XCircle /></button>
                    </div>
                    <div className="flex-1 p-8 flex flex-col items-center">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-[40px] overflow-hidden bg-slate-800 border-4 border-[#25D366]/20 shadow-2xl relative">
                                {user?.photo_url ? (
                                    <img src={user.photo_url} className="w-full h-full object-cover" alt="Perfil" />
                                ) : (
                                    <User className="w-full h-full p-8 text-slate-600" />
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <Loader2 className="animate-spin text-white" />
                                    </div>
                                )}
                            </div>
                            <label className="absolute bottom-[-10px] right-[-10px] p-3 bg-[#25D366] text-black rounded-2xl cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-xl">
                                <Camera size={20} />
                                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                            </label>
                        </div>

                        <div className="mt-10 w-full space-y-6">
                            <div className="bg-[#1E293B] p-6 rounded-3xl border border-white/5">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Nome Completo</p>
                                <p className="text-xl font-bold">{user?.name}</p>
                            </div>
                            <div className="bg-[#1E293B] p-6 rounded-3xl border border-white/5">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Veículo Atual</p>
                                <p className="text-xl font-bold uppercase">{user?.vehicle_type || 'Moto'}</p>
                            </div>
                            <button onClick={logout} className="w-full py-5 bg-red-500/10 text-red-500 font-black rounded-3xl flex items-center justify-center gap-3 uppercase tracking-widest transition-all hover:bg-red-500/20 active:scale-95">
                                <LogOut size={20} /> Sair do Aplicativo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Menu Inferior */}
            <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-[#1E293B]/80 backdrop-blur-xl border-t border-white/10 grid grid-cols-4 p-2 z-[60]">
                <button onClick={() => { navigate('/motoboy'); setShowWallet(false); setShowHistory(false); setShowProfile(false); }} className={`flex flex-col items-center gap-1 p-2 ${!showWallet && !showHistory && !showProfile ? 'text-[#25D366]' : 'text-slate-500'}`}>
                    <Play size={22} /><span className="text-[8px] font-black uppercase tracking-tighter">Início</span>
                </button>
                <button onClick={() => { setShowWallet(true); setShowHistory(false); setShowProfile(false); }} className={`flex flex-col items-center gap-1 p-2 ${showWallet ? 'text-yellow-500' : 'text-slate-500'}`}>
                    <DollarSign size={22} /><span className="text-[8px] font-black uppercase tracking-tighter">Carteira</span>
                </button>
                <button onClick={() => { setShowHistory(true); setShowWallet(false); setShowProfile(false); }} className={`flex flex-col items-center gap-1 p-2 ${showHistory ? 'text-blue-500' : 'text-slate-500'}`}>
                    <Clock size={22} /><span className="text-[8px] font-black uppercase tracking-tighter">Histórico</span>
                </button>
                <button onClick={() => { setShowProfile(true); setShowWallet(false); setShowHistory(false); }} className={`flex flex-col items-center gap-1 p-2 ${showProfile ? 'text-purple-500' : 'text-slate-500'}`}>
                    <User size={22} /><span className="text-[8px] font-black uppercase tracking-tighter">Perfil</span>
                </button>
            </div>

            <style>{`
                .leaflet-container { width: 100%; height: 100%; z-index: 1; filter: grayscale(1) invert(1) brightness(0.7) contrast(1.2); }
                .leaflet-control-zoom { display: none; }
                .leaflet-control-attribution { display: none; }
            `}</style>
        </div>
    );
}
