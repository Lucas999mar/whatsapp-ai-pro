import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, MapPin, Navigation, Package, CheckCircle2, XCircle, Power, User, Clock, DollarSign, Map as MapIcon, ChevronRight, Loader2, Play, Square, Hash } from 'lucide-react';
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

// Custom Map center component
function ChangeView({ center, zoom }) {
    const map = useMap();
    map.setView(center, zoom);
    return null;
}

export default function MotoboyApp() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isOnline, setIsOnline] = useState(false);
    const [availableDeliveries, setAvailableDeliveries] = useState([]);
    const [activeDelivery, setActiveDelivery] = useState(null);
    const [stats, setStats] = useState({ total_km: 0, total_earnings: 0, completed: 0 });
    const [loading, setLoading] = useState(true);
    const [myPos, setMyPos] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [showWallet, setShowWallet] = useState(false);
    const [history, setHistory] = useState([]);
    const [walletHistory, setWalletHistory] = useState([]);
    const [withdrawModal, setWithdrawModal] = useState({ open: false, amount: '', pix_key: '' });

    const socketRef = useRef(null);
    const watchId = useRef(null);
    const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

    // 1. Initial Data Fetch
    const fetchData = useCallback(async () => {
        try {
            const [statsRes, availRes, historyRes, walletRes] = await Promise.all([
                api.get('/delivery/motoboy/stats'),
                api.get('/delivery/available'),
                api.get('/delivery/motoboy/my-deliveries'),
                api.get('/delivery/wallet/history')
            ]);
            setStats(statsRes.data);
            setAvailableDeliveries(availRes.data);
            setHistory(historyRes.data);
            setWalletHistory(walletRes.data);

            // Check for active delivery (accepted but not completed)
            const active = historyRes.data.find(d => ['aceita', 'coletando', 'em_rota', 'em_deslocamento'].includes(d.status));
            if (active) {
                // Fetch full details of active delivery
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
    }, [fetchData]);

    // 2. GPS Tracking & Socket.IO
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
            // Play sound and Vibrate
            audioRef.current.play().catch(e => console.log('Audio play failed:', e));
            if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);

            if (Notification.permission === 'granted') {
                new Notification('Nova Entrega Disponível!', { body: `R$ ${data.delivery.estimated_price} - ${data.delivery.delivery_address}` });
            }
        });

        socket.on('delivery:status_change', (data) => {
            if (data.status === 'entregue') fetchData();
        });

        // Start GPS Watcher
        if (navigator.geolocation) {
            watchId.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude, accuracy } = pos.coords;
                    setMyPos({ lat: latitude, lng: longitude });

                    // Send to server periodically if online
                    if (isOnline) {
                        api.post('/delivery/location', {
                            lat: latitude,
                            lng: longitude,
                            accuracy,
                            trackingCode: activeDelivery?.tracking_code
                        }).catch(console.error);

                        // Also emit via socket for instant admin update
                        socket.emit('motoboy:location', {
                            tenantId: user.tenant_id,
                            motoboyId: user.id,
                            trackingCode: activeDelivery?.tracking_code,
                            lat: latitude,
                            lng: longitude,
                            accuracy
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
    }, [user, isOnline, activeDelivery]);

    // Actions
    const toggleOnline = async () => {
        try {
            const res = await api.put('/delivery/motoboy/toggle-online');
            setIsOnline(res.data.is_available);
        } catch (e) { alert('Erro ao mudar status'); }
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
        } catch (e) { alert('Erro ao finalizar entrega'); }
    };

    const handleWithdraw = async () => {
        if (!withdrawModal.amount || !withdrawModal.pix_key) return alert('Preencha os campos');
        try {
            await api.post('/delivery/wallet/withdraw', {
                amount: parseFloat(withdrawModal.amount),
                pix_key: withdrawModal.pix_key
            });
            alert('Solicitação enviada com sucesso!');
            setWithdrawModal({ open: false, amount: '', pix_key: '' });
            fetchData();
        } catch (e) { alert(e.response?.data?.error || 'Erro ao processar saque'); }
    };

    const openNavigation = (lat, lng, address) => {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        let url = '';
        if (lat && lng) {
            url = isMobile ? `google.navigation:q=${lat},${lng}` : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        } else {
            url = isMobile ? `google.navigation:q=${encodeURIComponent(address)}` : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
        }
        window.open(url, isMobile ? '_self' : '_blank');
    };

    if (loading && !activeDelivery && availableDeliveries.length === 0) {
        return (
            <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#25D366]" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col font-sans pb-24 lg:pb-0 lg:pl-64">
            {/* Header Fixo */}
            <div className="bg-[#1E293B] p-4 border-b border-white/10 sticky top-0 z-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#25D366] to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-[#25D366]/20">
                        <Bike className="text-black" size={24} />
                    </div>
                    <div>
                        <h2 className="font-bold text-sm leading-tight">{user?.name}</h2>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{isOnline ? 'Online • Disponível' : 'Offline • Indisponível'}</p>
                    </div>
                </div>
                <button
                    onClick={toggleOnline}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border ${isOnline ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-[#25D366]/10 border-[#25D366]/20 text-[#25D366]'
                        }`}
                >
                    <Power size={14} /> {isOnline ? 'FICAR OFF' : 'FICAR ON'}
                </button>
            </div>

            {/* Grid de Stats (Mobily Friendly) */}
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

            {/* Conteúdo Principal */}
            <div className="flex-1 p-4 space-y-6">

                {/* 🏍️ CORRIDA ATIVA */}
                {activeDelivery ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-[#25D366] text-black p-4 rounded-3xl shadow-xl shadow-[#25D366]/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Play size={64} /></div>
                            <h3 className="text-lg font-black flex items-center gap-2 mb-1">
                                {activeDelivery.status === 'aceita' ? '👉 Vá para a Coleta' :
                                    activeDelivery.status === 'coletando' ? '📦 Coletando Pedido' :
                                        '🏁 Vá para o Destino'}
                            </h3>
                            <p className="text-sm font-bold opacity-70">Pedido #{activeDelivery.tracking_code}</p>

                            <div className="mt-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-black/10 rounded-full flex items-center justify-center font-bold">1</div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-[10px] text-black/50 font-black uppercase">Coletar em:</p>
                                        <p className="text-sm font-bold truncate">{activeDelivery.pickup_address}</p>
                                    </div>
                                    <button
                                        onClick={() => openNavigation(activeDelivery.pickup_lat, activeDelivery.pickup_lng, activeDelivery.pickup_address)}
                                        className="p-2 bg-black/10 rounded-xl hover:bg-black/20"
                                    >
                                        <Navigation size={18} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-black/10 rounded-full flex items-center justify-center font-bold">2</div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-[10px] text-black/50 font-black uppercase">Entregar em:</p>
                                        <p className="text-sm font-bold truncate">{activeDelivery.delivery_address}</p>
                                    </div>
                                    <button
                                        onClick={() => openNavigation(activeDelivery.delivery_lat, activeDelivery.delivery_lng, activeDelivery.delivery_address)}
                                        className="p-2 bg-black/10 rounded-xl hover:bg-black/20"
                                    >
                                        <Navigation size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Mapa da Corrida Ativa */}
                        <div className="h-[250px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl z-10 relative">
                            <MapContainer center={myPos ? [myPos.lat, myPos.lng] : [-23.55, -46.63]} zoom={15} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                {myPos && (
                                    <Marker position={[myPos.lat, myPos.lng]} icon={L.divIcon({
                                        className: 'bg-none',
                                        html: `<div style="width:24px;height:24px;border-radius:50%;background:#25D366;border:3px solid white;box-shadow:0 0 10px #25D366"></div>`,
                                        iconSize: [24, 24], iconAnchor: [12, 12]
                                    })} />
                                )}
                                {activeDelivery.delivery_lat && (
                                    <Marker position={[activeDelivery.delivery_lat, activeDelivery.delivery_lng]} />
                                )}
                                {myPos && activeDelivery.delivery_lat && (
                                    <Polyline positions={[[myPos.lat, myPos.lng], [activeDelivery.delivery_lat, activeDelivery.delivery_lng]]} color="#25D366" dashArray="5,5" />
                                )}
                                {myPos && <ChangeView center={[myPos.lat, myPos.lng]} zoom={15} />}
                            </MapContainer>
                            <div className="absolute bottom-4 left-4 right-4 z-20 flex gap-2">
                                {activeDelivery.status === 'aceita' ? (
                                    <button onClick={confirmPickup} className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2">
                                        <Package size={20} /> CONFIRMAR COLETA
                                    </button>
                                ) : (
                                    <button onClick={confirmDelivery} className="flex-1 bg-green-600 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2">
                                        <Square size={20} /> FINALIZAR ENTREGA
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* 🔍 LISTA DE DISPONÍVEIS */
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black flex items-center gap-2">
                                <MapIcon className="text-blue-500" size={20} /> Corridas Disponíveis
                            </h3>
                            <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold">{availableDeliveries.length} PERTO</span>
                        </div>

                        {availableDeliveries.length === 0 ? (
                            <div className="text-center py-12 bg-[#1E293B]/50 rounded-3xl border border-dashed border-white/10">
                                <div className="text-4xl mb-3">📡</div>
                                <p className="text-slate-400 font-bold">Procurando entregas na sua região...</p>
                                {!isOnline && <p className="text-xs text-red-400 mt-2">Você precisa estar ONLINE para ver pedidos.</p>}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {availableDeliveries.map(d => (
                                    <div key={d.id} className="bg-[#1E293B] border border-white/5 rounded-3xl p-5 hover:border-[#25D366]/30 transition-all active:scale-[0.98]">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="font-bold text-white mb-1">R$ {d.estimated_price}</h4>
                                                <p className="text-[10px] text-slate-500 font-black uppercase flex items-center gap-1">
                                                    <Navigation size={10} /> {d.estimated_km} KM • {d.customer_name}
                                                </p>
                                            </div>
                                            <div className="p-2 bg-blue-500/10 rounded-xl">
                                                <Package className="text-blue-500" size={18} />
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-5">
                                            <div className="flex items-start gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5"></div>
                                                <p className="text-xs text-slate-400 truncate"><span className="font-bold text-slate-300">De:</span> {d.pickup_address}</p>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5"></div>
                                                <p className="text-xs text-slate-400 truncate"><span className="font-bold text-slate-300">Para:</span> {d.delivery_address}</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => acceptDelivery(d.id)}
                                            className="w-full bg-[#25D366]/10 text-[#25D366] font-black py-3 rounded-2xl border border-[#25D366]/20 hover:bg-[#25D366] hover:text-black transition-all flex items-center justify-center gap-2"
                                        >
                                            ACEITAR CORRIDA <ChevronRight size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Menu Inferior (PWA Style) */}
            <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-[#1E293B] border-t border-white/10 grid grid-cols-4 p-2 z-[60]">
                <button onClick={() => { navigate('/motoboy'); setShowWallet(false); setShowHistory(false); }} className={`flex flex-col items-center gap-1 p-2 ${!showWallet && !showHistory ? 'text-[#25D366]' : 'text-slate-400'}`}>
                    <Play size={20} />
                    <span className="text-[9px] font-black uppercase">Início</span>
                </button>
                <button onClick={() => { setShowWallet(true); setShowHistory(false); }} className={`flex flex-col items-center gap-1 p-2 ${showWallet ? 'text-yellow-500' : 'text-slate-400'}`}>
                    <DollarSign size={20} />
                    <span className="text-[9px] font-black uppercase">Carteira</span>
                </button>
                <button onClick={() => { setShowHistory(true); setShowWallet(false); }} className={`flex flex-col items-center gap-1 p-2 ${showHistory ? 'text-blue-500' : 'text-slate-400'}`}>
                    <Clock size={20} />
                    <span className="text-[9px] font-black uppercase">Histórico</span>
                </button>
                <button onClick={logout} className="flex flex-col items-center gap-1 p-2 text-red-500/50">
                    <Power size={20} />
                    <span className="text-[9px] font-black uppercase">Sair</span>
                </button>
            </div>

            {/* Modal de Histórico */}
            {showHistory && (
                <div className="fixed inset-0 z-[100] bg-[#0B0F19] flex flex-col animate-in slide-in-from-right duration-300 pb-20">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#1E293B]">
                        <h3 className="font-black flex items-center gap-2"><Clock /> Meu Histórico</h3>
                        <button onClick={() => setShowHistory(false)} className="p-2 bg-white/5 rounded-full"><XCircle /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {history.map(h => (
                            <div key={h.id} className="bg-[#1E293B] p-4 rounded-2xl border border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-400 font-mono">#{h.tracking_code}</span>
                                    <span className={`text-[10px] font-black uppercase ${h.status === 'entregue' ? 'text-[#25D366]' : 'text-slate-500'}`}>{h.status}</span>
                                </div>
                                <p className="text-sm font-bold text-white truncate">{h.delivery_address}</p>
                                <div className="flex justify-between mt-2">
                                    <span className="text-xs text-slate-500">{new Date(h.created_at).toLocaleDateString()}</span>
                                    <span className="text-xs font-bold text-yellow-500">R$ {h.estimated_price}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal da Carteira */}
            {showWallet && (
                <div className="fixed inset-0 z-[100] bg-[#0B0F19] flex flex-col animate-in slide-in-from-right duration-300 pb-20">
                    <div className="p-6 bg-gradient-to-br from-[#1E293B] to-[#0F172A] border-b border-white/10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-1">Saldo Disponível</p>
                                <h3 className="text-4xl font-black text-[#25D366]">R$ {stats.total_earnings}</h3>
                            </div>
                            <button onClick={() => setShowWallet(false)} className="p-2 bg-white/5 rounded-full"><XCircle /></button>
                        </div>
                        <button
                            onClick={() => setWithdrawModal({ ...withdrawModal, open: true })}
                            className="w-full mt-6 bg-yellow-500 text-black font-black py-4 rounded-2xl shadow-xl shadow-yellow-500/20 active:scale-95 transition-all"
                        >
                            SACAR VIA PIX
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1 mb-2">Extrato Detalhado</h4>
                        {walletHistory.length === 0 ? (
                            <p className="text-center text-slate-600 py-10 font-bold">Nenhuma transação ainda.</p>
                        ) : walletHistory.map(w => (
                            <div key={w.id} className="bg-[#1E293B] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${w.type === 'credit' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {w.type === 'credit' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{w.description}</p>
                                        <p className="text-[10px] text-slate-500 font-mono">{new Date(w.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                                <p className={`font-black ${w.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                                    {w.type === 'credit' ? '+' : '-'} R$ {w.amount}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal de Saque */}
            {withdrawModal.open && (
                <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-6 backdrop-blur-md">
                    <div className="bg-[#1E293B] w-full max-w-sm rounded-3xl p-8 border border-white/10 shadow-2xl">
                        <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2"><DollarSign className="text-yellow-500" /> Solicitar Saque</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase ml-1">Valor do Saque</label>
                                <input
                                    type="number"
                                    className="w-full mt-1 bg-black/20 border border-white/5 rounded-2xl p-4 text-white font-black"
                                    placeholder="0.00"
                                    value={withdrawModal.amount}
                                    onChange={e => setWithdrawModal({ ...withdrawModal, amount: e.target.value })}
                                />
                                <p className="text-[10px] text-slate-500 mt-2">Saldo disponível: R$ {stats.total_earnings}</p>
                            </div>

                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase ml-1">Chave PIX (CPF/E-mail/Celular)</label>
                                <input
                                    className="w-full mt-1 bg-black/20 border border-white/5 rounded-2xl p-4 text-white font-bold"
                                    placeholder="Sua chave aqui"
                                    value={withdrawModal.pix_key}
                                    onChange={e => setWithdrawModal({ ...withdrawModal, pix_key: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-8">
                            <button onClick={() => setWithdrawModal({ ...withdrawModal, open: false })} className="py-4 bg-white/5 rounded-2xl font-black text-slate-400">CANCELAR</button>
                            <button onClick={handleWithdraw} className="py-4 bg-[#25D366] text-black font-black rounded-2xl shadow-xl shadow-[#25D366]/10">SOLICITAR</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Estilos Globais Animados */}
            <style>{`
        .leaflet-container { width: 100%; height: 100%; z-index: 1; }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(37, 211, 102, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
        }
      `}</style>
        </div>
    );
}
