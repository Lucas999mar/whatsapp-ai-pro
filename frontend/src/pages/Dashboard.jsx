import React, { useState, useEffect } from 'react';
import api from '../api/api';
import {
  Users, MessageSquare, Clock, CheckCircle,
  TrendingUp, AlertCircle, Calendar, ArrowRight,
  UserCheck, Activity, Timer, Zap, LayoutDashboard
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const [stats, setStats] = useState({
    today: 0,
    aguardando: 0,
    atendendo: 0,
    resolvidos: 0,
    percent: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/crm/stats');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      title: 'Total Hoje',
      value: stats.today,
      desc: 'conversas',
      icon: <MessageSquare className="text-blue-500" />,
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20'
    },
    {
      title: 'Aguardando',
      value: stats.aguardando,
      desc: stats.aguardando > 10 ? 'Alta demanda' : 'Normal',
      icon: <Clock className="text-yellow-500" />,
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      alert: stats.aguardando > 10
    },
    {
      title: 'Em Atendimento',
      value: stats.atendendo,
      desc: 'Ativos agora',
      icon: <Activity className="text-[#25D366]" />,
      bg: 'bg-[#25D366]/10',
      border: 'border-[#25D366]/20'
    },
    {
      title: 'Finalizados',
      value: stats.resolvidos,
      desc: `${Math.round((stats.resolvidos / (stats.today || 1)) * 100)}% concluído`,
      icon: <CheckCircle className="text-purple-500" />,
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Dashboard</h2>
          <p className="text-slate-500 text-sm font-medium">Visão geral do atendimento em tempo real.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-slate-400">
            <Calendar size={14} />
            {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
          </div>
          <button onClick={fetchStats} className="bg-[#25D366] text-black px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:brightness-110 transition-all">
            <Zap size={14} /> ATUALIZAR
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={i} className={`p-6 rounded-3xl border ${card.border} ${card.bg} relative overflow-hidden group hover:scale-[1.02] transition-all`}>
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{card.title}</p>
                <h3 className="text-4xl font-black text-white">{card.value}</h3>
              </div>
              <div className="p-3 rounded-2xl bg-black/20">
                {card.icon}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {card.alert && <TrendingUp size={14} className="text-red-500 animate-bounce" />}
              <span className={`text-[10px] font-black uppercase tracking-wider ${card.alert ? 'text-red-500' : 'text-slate-500'}`}>
                {card.desc}
              </span>
            </div>

            {/* Decoration */}
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all"></div>
          </div>
        ))}
      </div>

      {/* SECONDARY METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ATENDENTES ONLINE */}
        <div className="p-8 bg-[#0F172A] border border-white/5 rounded-[32px] space-y-6 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-black text-white uppercase tracking-widest">Atendentes Online</h4>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-[#25D366]/10 rounded-full">
              <div className="w-1.5 h-1.5 bg-[#25D366] rounded-full animate-pulse"></div>
              <span className="text-[10px] text-[#25D366] font-black uppercase">Ao vivo</span>
            </div>
          </div>
          <div className="flex items-end gap-3 px-2">
            <h3 className="text-6xl font-black text-white">3</h3>
            <p className="text-sm text-slate-500 font-bold mb-2">de 6 atendentes</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <span>Equipe online</span>
              <span>50%</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="w-1/2 h-full bg-gradient-to-r from-[#25D366] to-emerald-400 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* TEMPO MEDIO ESPERA */}
        <div className="p-8 bg-[#0F172A] border border-white/5 rounded-[32px] space-y-6 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-black text-white uppercase tracking-widest">Tempo Médio Espera</h4>
            <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-1 rounded-full font-black">ALTO</span>
          </div>
          <div className="flex items-end gap-1 px-2">
            <h3 className="text-6xl font-black text-white">49m</h3>
            <h3 className="text-4xl font-black text-slate-500 mb-1">11s</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
            <Timer size={14} />
            <span>Meta: menos de 1 min</span>
          </div>
        </div>

        {/* TEMPO MEDIO ATENDIMENTO */}
        <div className="p-8 bg-[#0F172A] border border-white/5 rounded-[32px] space-y-6 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-black text-white uppercase tracking-widest">TMA (Médio)</h4>
            <span className="text-[10px] bg-[#25D366]/10 text-[#25D366] px-2 py-1 rounded-full font-black">EFICIENTE</span>
          </div>
          <div className="flex items-end gap-1 px-2">
            <h3 className="text-6xl font-black text-white">0s</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
            <Activity size={14} />
            <span>Meta: menos de 5 min</span>
          </div>
        </div>
      </div>

      {/* FOOTER NOTE */}
      <div className="text-center">
        <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em]">Dados atualizados automaticamente a cada 10 segundos</p>
      </div>
    </div>
  );
}
