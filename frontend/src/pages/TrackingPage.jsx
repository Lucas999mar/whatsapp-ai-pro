import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Package, MapPin, Clock, Phone, User, Bike, Star, CheckCircle, Navigation, Loader2 } from 'lucide-react';
import { io } from 'socket.io-client';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

const STATUS_CONFIG = {
    aguardando_motoboy: { label: 'Procurando Motoboy...', color: '#f59e0b', icon: '🔍', progress: 15 },
    aceita: { label: 'Motoboy a caminho da coleta', color: '#3b82f6', icon: '🏍️', progress: 30 },
    coletando: { label: 'Coletando seu pedido', color: '#8b5cf6', icon: '📦', progress: 50 },
    em_rota: { label: 'A caminho do destino!', color: '#10b981', icon: '🛵', progress: 75 },
    em_deslocamento: { label: 'A caminho do destino!', color: '#10b981', icon: '🛵', progress: 75 },
    entregue: { label: 'Entregue!', color: '#22c55e', icon: '✅', progress: 100 },
    concluida: { label: 'Concluída', color: '#22c55e', icon: '✅', progress: 100 },
    cancelada: { label: 'Cancelada', color: '#ef4444', icon: '❌', progress: 0 },
};

function MapAutoCenter({ positions }) {
    const map = useMap();
    useEffect(() => {
        if (positions.length > 0) {
            const bounds = L.latLngBounds(positions);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
    }, [positions, map]);
    return null;
}

function MotoboyMarker({ lat, lng, name, color }) {
    const icon = L.divIcon({
        className: 'bg-none',
        html: `<div style="width:42px;height:42px;border-radius:50%;background:${color || '#25D366'};border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 15px rgba(0,0,0,0.4);animation:pulse 2s infinite">🏍️</div>`,
        iconSize: [42, 42],
        iconAnchor: [21, 21]
    });
    return (
        <Marker position={[lat, lng]} icon={icon}>
            <Popup><b>{name}</b><br />Motoboy</Popup>
        </Marker>
    );
}

export default function TrackingPage() {
    const { code } = useParams();
    const [delivery, setDelivery] = useState(null);
    const [motoboyPos, setMotoboyPos] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const socketRef = useRef(null);

    // Fetch delivery data
    useEffect(() => {
        async function fetchTracking() {
            try {
                const res = await fetch(`${API_URL}/delivery/track/${code}`);
                if (!res.ok) throw new Error('Entrega não encontrada');
                const data = await res.json();
                setDelivery(data);
                if (data.technician?.lat) {
                    setMotoboyPos({ lat: data.technician.lat, lng: data.technician.lng });
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchTracking();
        const interval = setInterval(fetchTracking, 15000); // Refresh a cada 15s
        return () => clearInterval(interval);
    }, [code]);

    // WebSocket para posição em tempo real
    useEffect(() => {
        if (!code) return;
        const wsUrl = API_BASE.replace('/api', '');
        const socket = io(wsUrl, { transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('tracking:join', { trackingCode: code.toUpperCase() });
        });

        socket.on('delivery:location', (data) => {
            setMotoboyPos({ lat: data.lat, lng: data.lng });
        });

        socket.on('delivery:status_change', (data) => {
            setDelivery(prev => prev ? { ...prev, status: data.status } : prev);
        });

        return () => socket.disconnect();
    }, [code]);

    const statusConfig = delivery ? (STATUS_CONFIG[delivery.status] || STATUS_CONFIG.aguardando_motoboy) : {};

    const mapPositions = useMemo(() => {
        const pos = [];
        if (delivery?.pickup_lat) pos.push([delivery.pickup_lat, delivery.pickup_lng]);
        if (delivery?.delivery_lat) pos.push([delivery.delivery_lat, delivery.delivery_lng]);
        if (motoboyPos) pos.push([motoboyPos.lat, motoboyPos.lng]);
        return pos;
    }, [delivery, motoboyPos]);

    if (loading) return (
        <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-[#25D366]" size={48} />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando rastreio...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
            <div className="bg-[#1E293B] rounded-3xl p-10 text-center border border-white/10 max-w-md w-full">
                <div className="text-6xl mb-4">📦</div>
                <h2 className="text-2xl font-black text-white mb-2">Entrega não encontrada</h2>
                <p className="text-slate-400">Código <span className="font-mono text-[#25D366] font-bold">{code}</span> não existe ou expirou.</p>
            </div>
        </div>
    );

    const tech = delivery?.technician;

    return (
        <div className="min-h-screen bg-[#0B0F19] text-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] border-b border-white/10">
                <div className="max-w-2xl mx-auto p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#25D366]/20 rounded-xl flex items-center justify-center">
                            <Package className="text-[#25D366]" size={22} />
                        </div>
                        <div>
                            <h1 className="font-black text-lg leading-tight">Rastreio em Tempo Real</h1>
                            <p className="text-xs text-slate-400 font-mono">#{code?.toUpperCase()}</p>
                        </div>
                    </div>
                    <div className="text-3xl">{statusConfig.icon}</div>
                </div>
            </div>

            {/* Status Bar */}
            <div className="max-w-2xl mx-auto px-4 pt-4">
                <div className="bg-[#1E293B] rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                        <p className="font-bold text-sm" style={{ color: statusConfig.color }}>{statusConfig.label}</p>
                        <span className="text-xs text-slate-500 font-mono">{statusConfig.progress}%</span>
                    </div>
                    <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${statusConfig.progress}%`, background: `linear-gradient(90deg, ${statusConfig.color}80, ${statusConfig.color})` }}
                        />
                    </div>

                    {/* Timeline steps */}
                    <div className="grid grid-cols-4 mt-3 gap-1">
                        {[
                            { label: 'Pedido', done: true },
                            { label: 'Coletado', done: ['em_rota', 'em_deslocamento', 'entregue', 'concluida'].includes(delivery.status) },
                            { label: 'Em Rota', done: ['em_rota', 'em_deslocamento', 'entregue', 'concluida'].includes(delivery.status) },
                            { label: 'Entregue', done: ['entregue', 'concluida'].includes(delivery.status) }
                        ].map((step, i) => (
                            <div key={i} className="text-center">
                                <div className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center text-xs font-bold ${step.done ? 'bg-[#25D366] text-black' : 'bg-white/10 text-slate-500'}`}>
                                    {step.done ? '✓' : i + 1}
                                </div>
                                <p className={`text-[10px] mt-1 font-bold ${step.done ? 'text-[#25D366]' : 'text-slate-600'}`}>{step.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Map */}
            <div className="max-w-2xl mx-auto px-4 pt-4">
                <div className="h-[350px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <MapContainer
                        center={motoboyPos ? [motoboyPos.lat, motoboyPos.lng] : delivery?.delivery_lat ? [delivery.delivery_lat, delivery.delivery_lng] : [-23.55, -46.63]}
                        zoom={14}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                        <MapAutoCenter positions={mapPositions} />

                        {/* Motoboy marker */}
                        {motoboyPos && (
                            <MotoboyMarker lat={motoboyPos.lat} lng={motoboyPos.lng} name={tech?.name || 'Motoboy'} color={tech?.color} />
                        )}

                        {/* Pickup marker */}
                        {delivery?.pickup_lat && (
                            <Marker position={[delivery.pickup_lat, delivery.pickup_lng]} icon={L.divIcon({
                                className: 'bg-none',
                                html: '<div style="width:32px;height:32px;border-radius:50%;background:#3b82f6;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 4px 10px rgba(0,0,0,0.3)">📦</div>',
                                iconSize: [32, 32], iconAnchor: [16, 16]
                            })}>
                                <Popup>Coleta: {delivery.pickup_address}</Popup>
                            </Marker>
                        )}

                        {/* Delivery marker */}
                        {delivery?.delivery_lat && (
                            <Marker position={[delivery.delivery_lat, delivery.delivery_lng]} icon={L.divIcon({
                                className: 'bg-none',
                                html: '<div style="width:32px;height:32px;border-radius:50%;background:#22c55e;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 4px 10px rgba(0,0,0,0.3)">🏠</div>',
                                iconSize: [32, 32], iconAnchor: [16, 16]
                            })}>
                                <Popup>Destino: {delivery.delivery_address}</Popup>
                            </Marker>
                        )}

                        {/* Route polyline */}
                        {delivery?.route_polyline?.length > 1 && (
                            <Polyline
                                positions={delivery.route_polyline.map(p => [p.lat, p.lng])}
                                pathOptions={{ color: '#25D366', weight: 4, opacity: 0.7, dashArray: '10 6' }}
                            />
                        )}
                    </MapContainer>
                </div>
            </div>

            {/* Motoboy Card */}
            {tech && (
                <div className="max-w-2xl mx-auto px-4 pt-4">
                    <div className="bg-[#1E293B] rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg" style={{ backgroundColor: tech.color || '#25D366' }}>
                            {tech.photo_url ? (
                                <img src={tech.photo_url} className="w-full h-full rounded-full object-cover" alt="" />
                            ) : tech.name?.charAt(0)}
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-white text-lg">{tech.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <Bike size={12} /> {tech.vehicle_type === 'moto' ? 'Moto' : tech.vehicle_type === 'bicicleta' ? 'Bike' : 'Carro'}
                                    {tech.vehicle_plate && <span className="ml-1 font-mono text-slate-500">• {tech.vehicle_plate}</span>}
                                </span>
                                <span className="text-xs text-yellow-400 flex items-center gap-1">
                                    <Star size={12} /> {tech.rating || '5.0'}
                                </span>
                                <span className="text-xs text-slate-500">{tech.total_deliveries || 0} entregas</span>
                            </div>
                        </div>
                        {tech.phone && (
                            <a href={`tel:${tech.phone}`} className="w-12 h-12 bg-[#25D366]/20 rounded-full flex items-center justify-center text-[#25D366] hover:bg-[#25D366]/30 transition-all">
                                <Phone size={20} />
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* Delivery Info */}
            <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
                <div className="bg-[#1E293B] rounded-2xl p-4 border border-white/5 space-y-3">
                    {delivery?.pickup_address && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                <MapPin className="text-blue-400" size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Coleta</p>
                                <p className="text-sm text-white">{delivery.pickup_address}</p>
                            </div>
                        </div>
                    )}
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Navigation className="text-green-400" size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Destino</p>
                            <p className="text-sm text-white">{delivery?.delivery_address || 'Endereço de entrega'}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#1E293B] rounded-2xl p-4 border border-white/5 text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Distância</p>
                        <p className="text-xl font-black text-white mt-1">{delivery?.actual_km || delivery?.estimated_km || '—'} <span className="text-xs text-slate-400">km</span></p>
                    </div>
                    <div className="bg-[#1E293B] rounded-2xl p-4 border border-white/5 text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Pedido</p>
                        <p className="text-xl font-black text-white mt-1">{delivery?.created_at ? new Date(delivery.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                    </div>
                    <div className="bg-[#1E293B] rounded-2xl p-4 border border-white/5 text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Valor</p>
                        <p className="text-xl font-black text-[#25D366] mt-1">R$ {delivery?.estimated_price || '—'}</p>
                    </div>
                </div>
            </div>

            {/* CSS Animations */}
            <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.4); }
          50% { transform: scale(1.1); box-shadow: 0 0 20px 8px rgba(37, 211, 102, 0); }
        }
      `}</style>
        </div>
    );
}
