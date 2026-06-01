import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bike, MapPin, Navigation, Package, CheckCircle2, XCircle,
    Power, User, Clock, DollarSign, Map as MapIcon, ChevronRight,
    Loader2, Play, Square, Hash, Camera, Upload, LogOut, Bell, BellOff,
    X, AlertTriangle, Search, Compass, GitBranch, Volume2, CornerUpRight, Trash2
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

function ChangeView({ center, zoom, active }) {
    const map = useMap();
    useEffect(() => {
        if (center && active) {
            map.setView(center, zoom, { animate: true, duration: 1 });
        }
    }, [center, zoom, active, map]);
    return null;
}

// 📍 FollowMe: Mantém o motoboy no centro em "Primeira Pessoa"
function FollowMe({ pos, heading, active, zoom, onManualMove, onRecenter }) {
    const map = useMap();
    const isMovingManually = useRef(false);

    useEffect(() => {
        const onDragStart = () => {
            isMovingManually.current = true;
            onManualMove();
        };
        map.on('dragstart', onDragStart);
        return () => map.off('dragstart', onDragStart);
    }, [map, onManualMove]);

    // Quando o usuário clica em Recentralizar, resetamos o flag manual
    useEffect(() => {
        if (active) {
            isMovingManually.current = false;
        }
    }, [active]);

    useEffect(() => {
        if (pos && active && !isMovingManually.current) {
            map.setView([pos.lat, pos.lng], zoom, { animate: true, duration: 1 });
        }
    }, [pos?.lat, pos?.lng, active, zoom, map]);

    return null;
}

// 🔭 ZoomHandler: Aplica mudanças de zoom dinamicamente
function ZoomHandler({ zoom }) {
    const map = useMap();
    useEffect(() => {
        map.setZoom(zoom);
    }, [zoom, map]);
    return null;
}

// 🎮 MapControls: Botões de Zoom Customizados
function MapControls({ onZoomIn, onZoomOut }) {
    return (
        <div className="flex flex-col gap-2">
            <button onClick={onZoomIn} className="w-12 h-12 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white active:scale-90 transition-all font-bold text-xl shadow-2xl">+</button>
            <button onClick={onZoomOut} className="w-12 h-12 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white active:scale-90 transition-all font-bold text-xl shadow-2xl">-</button>
        </div>
    );
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
    const [myHeading, setMyHeading] = useState(0);
    const [autoFollow, setAutoFollow] = useState(true);
    const [mapZoom, setMapZoom] = useState(18);
    const [activeTab, setActiveTab] = useState('home');
    const [history, setHistory] = useState([]);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [routeCoords, setRouteCoords] = useState([]);
    const [routeInfo, setRouteInfo] = useState({ distance: 0, duration: 0 });

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
                    const { latitude, longitude, accuracy, heading } = pos.coords;
                    setMyPos({ lat: latitude, lng: longitude });
                    if (heading !== null) setMyHeading(heading);

                    if (isOnline) {
                        api.post('/delivery/location', {
                            lat: latitude, lng: longitude, accuracy,
                            trackingCode: activeDelivery?.tracking_code
                        }).catch(console.error);

                        socket.emit('motoboy:location', {
                            tenantId: user.tenant_id, motoboyId: user.id,
                            trackingCode: activeDelivery?.tracking_code,
                            lat: latitude, lng: longitude, accuracy,
                            heading: heading || 0,
                            eta: routeInfo.duration,
                            remaining_km: routeInfo.distance
                        });
                    }
                },
                (err) => console.error('GPS Watch Error:', err),
                { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
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

    // 🗺️ Busca rota via OSRM (gratuito) entre dois pontos
    const fetchRoute = useCallback(async (fromLat, fromLng, toLat, toLng) => {
        if (!fromLat || !fromLng || !toLat || !toLng) return;
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.routes && data.routes[0]) {
                const route = data.routes[0];
                const coords = route.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
                setRouteCoords(coords);
                setRouteInfo({
                    distance: (route.distance / 1000).toFixed(1),
                    duration: Math.ceil(route.duration / 60)
                });
            }
        } catch (e) {
            console.error('Erro ao buscar rota:', e);
        }
    }, []);

    // 🔄 Atualiza rota automaticamente quando posição ou destino mudam
    useEffect(() => {
        if (!activeDelivery || !myPos) return;
        const destLat = activeDelivery.status === 'aceita' ? activeDelivery.pickup_lat : activeDelivery.delivery_lat;
        const destLng = activeDelivery.status === 'aceita' ? activeDelivery.pickup_lng : activeDelivery.delivery_lng;
        fetchRoute(myPos.lat, myPos.lng, destLat, destLng);
        const interval = setInterval(() => {
            if (myPos) fetchRoute(myPos.lat, myPos.lng, destLat, destLng);
        }, 30000); // Recalcula a cada 30s
        return () => clearInterval(interval);
    }, [activeDelivery?.id, activeDelivery?.status, myPos?.lat, myPos?.lng, fetchRoute]);

    const acceptDelivery = async (id) => {
        try {
            setLoading(true);
            const res = await api.post(`/delivery/accept/${id}`);
            setActiveDelivery(res.data);
            setAvailableDeliveries(prev => prev.filter(d => d.id !== id));
            setRouteCoords([]); // Limpa rota antiga
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
        const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

        let url;
        if (isiOS) {
            url = lat && lng ? `maps://?q=${lat},${lng}` : `maps://?q=${encodeURIComponent(address)}`;
        } else if (isMobile) {
            url = lat && lng ? `google.navigation:q=${lat},${lng}` : `google.navigation:q=${encodeURIComponent(address)}`;
        } else {
            url = `https://www.google.com/maps/dir/?api=1&destination=${lat && lng ? `${lat},${lng}` : encodeURIComponent(address)}`;
        }

        // No mobile, usamos _self para disparar o Deep Link do App nativo sem abrir aba
        window.open(url, isMobile ? '_self' : '_blank');
    };

    if (loading && !activeDelivery && availableDeliveries?.length === 0) {
        return (
            <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#25D366]" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col font-sans pb-24 lg:pb-0 lg:pl-64">
            {/* Header Fixo - Escondido durante Navegação para ganhar espaço */}
            {!activeDelivery && (
                <div className="bg-[#1E293B] p-4 border-b border-white/10 sticky top-0 z-50 flex items-center justify-between">
                    <div
                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 active:scale-95 transition-all"
                        onClick={() => setActiveTab('profile')}
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
            )}

            {/* Conteúdo Principal por Aba */}
            <div className={`flex-1 relative overflow-y-auto ${activeDelivery ? 'pb-0' : 'pb-24'}`}>
                {activeTab === 'home' && (
                    <>
                        {!activeDelivery && (
                            <div className="p-4 grid grid-cols-3 gap-3">
                                <div className="bg-[#1E293B] p-3 rounded-2xl border border-white/5 text-center">
                                    <Clock className="mx-auto text-blue-400 mb-1" size={18} />
                                    <p className="text-xl font-black">{stats?.completed || 0}</p>
                                    <p className="text-[9px] text-slate-500 uppercase font-black">Entregas</p>
                                </div>
                                <div className="bg-[#1E293B] p-3 rounded-2xl border border-white/5 text-center">
                                    <Navigation className="mx-auto text-[#25D366] mb-1" size={18} />
                                    <p className="text-xl font-black">{stats?.total_km || 0}</p>
                                    <p className="text-[9px] text-slate-500 uppercase font-black">KM Totais</p>
                                </div>
                                <div className="bg-[#1E293B] p-3 rounded-2xl border border-white/5 text-center">
                                    <DollarSign className="mx-auto text-yellow-500 mb-1" size={18} />
                                    <p className="text-xl font-black">R${stats?.total_earnings || 0}</p>
                                    <p className="text-[9px] text-slate-500 uppercase font-black">Ganhos</p>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 relative min-h-[400px]">
                            {activeDelivery ? (
                                <div className="h-full w-full fixed inset-0 z-0">
                                    <MapContainer
                                        center={myPos ? [myPos.lat, myPos.lng] : [-23.55, -46.63]}
                                        zoom={16}
                                        zoomControl={false}
                                        style={{ height: '100%', width: '100%' }}
                                    >
                                        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                        {myPos && (
                                            <Marker
                                                position={[myPos.lat, myPos.lng]}
                                                icon={L.divIcon({
                                                    className: 'bg-none',
                                                    html: `
                                                        <div style="transform: rotate(${myHeading}deg); transition: transform 0.5s ease-in-out; display: flex; align-items: center; justify-content: center; width: 60px; height: 60px; pointer-events: none;">
                                                            <div style="width: 45px; height: 45px; background: rgba(37, 211, 102, 0.3); border: 2.5px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 30px rgba(37, 211, 102, 0.8);">
                                                                <svg viewBox="0 0 24 24" width="28" height="28" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4))">
                                                                    <path fill="#25D366" stroke="white" stroke-width="1.5" d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    `,
                                                    iconSize: [60, 60],
                                                    iconAnchor: [30, 30]
                                                })}
                                            />
                                        )}
                                        {activeDelivery?.pickup_lat && <Marker position={[activeDelivery.pickup_lat, activeDelivery.pickup_lng]} icon={L.divIcon({ className: 'bg-none', html: `<div style="padding:8px;background:#3b82f6;color:white;border-radius:20px;border:2px solid white;box-shadow:0 0 15px rgba(0,0,0,0.5);font-weight:bold;font-size:10px;white-space:nowrap;display:flex;items-center:center;gap:4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path></svg> PONTO DE COLETA</div>` })} />}
                                        {activeDelivery?.delivery_lat && <Marker position={[activeDelivery.delivery_lat, activeDelivery.delivery_lng]} icon={L.divIcon({ className: 'bg-none', html: `<div style="padding:8px;background:#25D366;color:white;border-radius:20px;border:2px solid white;box-shadow:0 0 15px rgba(0,0,0,0.5);font-weight:bold;font-size:10px;white-space:nowrap;display:flex;items-center:center;gap:4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path></svg> CLIENTE</div>` })} />}

                                        {/* 🗺️ Rota OSRM em Tempo Real (Estilo Uber) */}
                                        {routeCoords.length > 0 && (
                                            <Polyline
                                                positions={routeCoords.map(p => [p.lat, p.lng])}
                                                color="#25D366"
                                                weight={6}
                                                opacity={0.85}
                                                lineCap="round"
                                                lineJoin="round"
                                                dashArray={null}
                                            />
                                        )}
                                        {/* Fallback: rota salva no banco */}
                                        {routeCoords.length === 0 && activeDelivery?.route_polyline && activeDelivery.route_polyline.length > 0 && (
                                            <Polyline
                                                positions={activeDelivery.route_polyline.map(p => [p.lat, p.lng])}
                                                color="#25D366"
                                                weight={5}
                                                opacity={0.6}
                                                dashArray="10 6"
                                            />
                                        )}

                                        <FollowMe
                                            pos={myPos}
                                            heading={myHeading}
                                            active={autoFollow}
                                            zoom={mapZoom}
                                            onManualMove={() => setAutoFollow(false)}
                                        />
                                        <ZoomHandler zoom={mapZoom} />
                                    </MapContainer>

                                    {/* Google Maps Style: Top Instruction Banner */}
                                    <div className="absolute top-2 left-2 right-2 z-20 flex flex-col gap-1">
                                        <div className="bg-[#004D40] rounded-[20px] shadow-2xl p-4 flex items-center gap-4 border border-white/5">
                                            <div className="flex flex-col items-center justify-center p-1">
                                                <Navigation className="text-white transform -rotate-45" size={40} strokeWidth={3} />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-white/70 text-xs font-bold leading-none mb-1">em direção a</p>
                                                <h4 className="text-2xl font-black text-white leading-tight uppercase truncate">
                                                    {activeDelivery?.status === 'aceita' ? activeDelivery?.pickup_address?.split(',')[0] : activeDelivery?.delivery_address?.split(',')[0]}
                                                </h4>
                                            </div>
                                        </div>
                                        {/* Sub-instrução "Depois" */}
                                        <div className="flex">
                                            <div className="bg-[#00332C] px-4 py-2 rounded-2xl flex items-center gap-2 border border-white/5 ml-4">
                                                <span className="text-white/60 text-[10px] font-bold">Depois,</span>
                                                <CornerUpRight className="text-white" size={14} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Floating Buttons Right (Compass, Search, Volume) */}
                                    <div className="absolute right-3 top-[35%] z-20 flex flex-col gap-3">
                                        <button onClick={() => setAutoFollow(true)} className={`w-12 h-12 rounded-full border border-white/10 flex items-center justify-center shadow-2xl transition-all ${autoFollow ? 'bg-[#1E1E1E] text-[#25D366]' : 'bg-white text-black'}`}>
                                            <Compass size={24} />
                                        </button>
                                        <button className="w-12 h-12 bg-[#1E1E1E] text-white rounded-full border border-white/10 flex items-center justify-center shadow-2xl">
                                            <Search size={22} />
                                        </button>
                                        <button className="w-12 h-12 bg-[#1E1E1E] text-white rounded-full border border-white/10 flex items-center justify-center shadow-2xl">
                                            <Volume2 size={22} />
                                        </button>
                                    </div>

                                    {/* Speedometer Left */}
                                    <div className="absolute left-4 bottom-32 z-20">
                                        <div className="w-14 h-14 bg-black border-2 border-white/20 rounded-full flex flex-col items-center justify-center shadow-2xl">
                                            <span className="text-xl font-black text-white leading-none">9</span>
                                            <span className="text-[8px] font-bold text-white/60 uppercase">km/h</span>
                                        </div>
                                    </div>

                                    {/* Report Button */}
                                    <div className="absolute right-4 bottom-32 z-20">
                                        <button className="bg-[#1E1E1E] border border-white/10 rounded-full py-2.5 px-5 flex items-center gap-2 shadow-2xl active:scale-95 transition-all">
                                            <AlertTriangle className="text-orange-500" size={18} />
                                            <span className="text-xs font-bold text-white">Reportar</span>
                                        </button>
                                    </div>

                                    {/* Google Maps Style: Bottom Navigation Panel */}
                                    <div className="absolute bottom-0 left-0 right-0 z-30 p-2">
                                        <div className="bg-[#000000] border-t border-white/5 rounded-t-[32px] shadow-2xl overflow-hidden pb-4">
                                            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto my-3"></div>

                                            <div className="flex items-center justify-between px-6 pb-4">
                                                {/* Dimiss Button */}
                                                <button onClick={() => setAutoFollow(false)} className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-white transition-all">
                                                    <X size={28} />
                                                </button>

                                                {/* ETA / Info Center */}
                                                <div className="flex flex-col items-center">
                                                    <h3 className="text-3xl font-black text-[#22C55E] tracking-tight">
                                                        {routeInfo.duration}<span className="text-xl ml-0.5">min</span>
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-sm font-bold text-white/50">{routeInfo.distance} km</span>
                                                        <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                                                        <span className="text-sm font-black text-white">
                                                            {new Date(new Date().getTime() + routeInfo.duration * 60000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Alternate Routes Button */}
                                                <button className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-white transition-all">
                                                    <GitBranch size={24} className="transform rotate-180" />
                                                </button>
                                            </div>

                                            {/* Action Button: Confirm Pickup/Delivery */}
                                            <div className="px-4 pb-4">
                                                {activeDelivery?.status === 'aceita' ? (
                                                    <button onClick={confirmPickup} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-900/20 active:scale-95 transition-all">CHEGUEI NA COLETA</button>
                                                ) : (
                                                    <button onClick={confirmDelivery} className="w-full bg-[#25D366] text-black py-4 rounded-2xl font-black text-lg shadow-xl shadow-green-900/20 active:scale-95 transition-all">FINALIZAR ENTREGA</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 pt-4">
                                    <div className="flex items-center justify-between px-4">
                                        <h3 className="text-lg font-black flex items-center gap-2">Corridas Disponíveis</h3>
                                        <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">{availableDeliveries?.length || 0} Perto</span>
                                    </div>
                                    {(availableDeliveries?.length || 0) === 0 ? (
                                        <div className="text-center py-20 bg-[#1E293B]/30 rounded-[40px] border border-dashed border-white/5 mx-4">
                                            <div className="text-5xl mb-4 animate-bounce">📡</div>
                                            <p className="text-slate-400 font-bold">Buscando novas rotas...</p>
                                            {!isOnline && <p className="text-[10px] text-red-500/60 mt-4 uppercase font-black tracking-widest">Fique Online para receber</p>}
                                        </div>
                                    ) : (
                                        <div className="space-y-3 px-4 pb-10">
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
                    </>
                )}

                {activeTab === 'wallet' && (
                    <div className="p-6 animate-in fade-in slide-in-from-right duration-300">
                        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-8 rounded-[40px] text-black shadow-2xl mb-8">
                            <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-2">Saldo Disponível</p>
                            <h2 className="text-5xl font-black tracking-tighter">R$ {stats?.balance || '0.00'}</h2>
                            <button className="mt-8 w-full py-4 bg-black text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">Solicitar Saque PIX</button>
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-widest mb-4 px-2">Histórico de Transações</h4>
                        <div className="space-y-3">
                            <div className="bg-white/5 border border-white/5 p-5 rounded-3xl text-center py-10 opacity-40">
                                <p className="text-xs font-bold">Nenhuma transação recente.</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="p-6 animate-in fade-in slide-in-from-right duration-300">
                        <h3 className="text-xl font-black mb-6 uppercase tracking-tighter">Minhas Entregas</h3>
                        <div className="space-y-4 pb-20">
                            {history?.length === 0 ? (
                                <p className="text-center text-slate-500 py-10">Nenhuma entrega realizada.</p>
                            ) : (
                                history.map(h => (
                                    <div key={h.id} className="bg-[#1E293B] border border-white/5 p-5 rounded-3xl relative overflow-hidden">
                                        <div className={`absolute top-0 right-0 px-4 py-1 text-[8px] font-black uppercase ${h.status === 'entregue' ? 'bg-[#25D366] text-black' : 'bg-slate-700 text-white'}`}>{h.status}</div>
                                        <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-widest">{h.created_at ? new Date(h.created_at).toLocaleDateString() : ''}</p>
                                        <h4 className="text-lg font-black tracking-tighter mb-3">{h.customer_name}</h4>
                                        <div className="flex justify-between items-end border-t border-white/5 pt-3">
                                            <p className="text-xs font-bold text-slate-400">{h.estimated_km} KM</p>
                                            <p className="text-lg font-black text-[#25D366]">R$ {h.estimated_price}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="p-8 flex flex-col items-center animate-in fade-in slide-in-from-right duration-300">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-[40px] overflow-hidden bg-slate-800 border-4 border-[#25D366]/20 shadow-2xl relative">
                                {user?.photo_url ? (
                                    <img src={user.photo_url} className="w-full h-full object-cover" alt="Perfil" />
                                ) : (
                                    <User className="w-full h-full p-8 text-slate-600" />
                                )}
                                {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
                            </div>
                            <label className="absolute bottom-[-10px] right-[-10px] p-3 bg-[#25D366] text-black rounded-2xl cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-xl">
                                <Camera size={20} /><input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                            </label>
                        </div>
                        <div className="mt-10 w-full space-y-6">
                            <div className="bg-[#1E293B] p-6 rounded-3xl border border-white/5">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Nome Completo</p>
                                <p className="text-xl font-bold">{user?.name || 'Carregando...'}</p>
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
                )}
            </div>

            {/* Menu Inferior Fixo - Escondido durante Navegação */}
            {!activeDelivery && (
                <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-[#1E293B]/90 backdrop-blur-2xl border-t border-white/10 grid grid-cols-4 p-3 z-[100] pb-6 shadow-2xl">
                    <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'home' ? 'text-[#25D366] scale-110' : 'text-slate-500'}`}>
                        <Play size={20} strokeWidth={activeTab === 'home' ? 3 : 2} /><span className="text-[9px] font-black uppercase tracking-tighter">Início</span>
                    </button>
                    <button onClick={() => { setActiveTab('wallet'); fetchData(); }} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'wallet' ? 'text-yellow-500 scale-110' : 'text-slate-500'}`}>
                        <DollarSign size={20} strokeWidth={activeTab === 'wallet' ? 3 : 2} /><span className="text-[9px] font-black uppercase tracking-tighter">Carteira</span>
                    </button>
                    <button onClick={() => { setActiveTab('history'); fetchData(); }} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'history' ? 'text-blue-500 scale-110' : 'text-slate-500'}`}>
                        <Clock size={20} strokeWidth={activeTab === 'history' ? 3 : 2} /><span className="text-[9px] font-black uppercase tracking-tighter">Histórico</span>
                    </button>
                    <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'profile' ? 'text-purple-500 scale-110' : 'text-slate-500'}`}>
                        <User size={20} strokeWidth={activeTab === 'profile' ? 3 : 2} /><span className="text-[9px] font-black uppercase tracking-tighter">Perfil</span>
                    </button>
                </div>
            )}

            <style>{`
                .leaflet-container { width: 100%; height: 100%; z-index: 1; filter: saturate(1.2) contrast(1.1) brightness(0.9); }
                .leaflet-tile-pane { filter: grayscale(1) invert(0.9) brightness(0.4) contrast(1.2) sepia(0.2) hue-rotate(180deg); }
                .leaflet-bar { display: none !important; }
                .leaflet-control-attribution { display: none; }
            `}</style>
        </div>
    );
}
