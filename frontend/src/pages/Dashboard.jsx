import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import {
  Bot, MessageSquare, Database, TrendingUp, CheckCircle2,
  Activity, QrCode, Smartphone, Plus, Trash2, RefreshCw,
  Clock, MapPin, ClipboardList, CheckCircle, Users, Timer, Zap,
  Calendar, AlertCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Link, Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const { user } = useAuth();
  const features = user?.features || {};
  const hasCrm = features.crm !== false;
  const hasKnowledge = features.knowledge !== false;
  const hasLearning = features.learning !== false;
  const niche = user?.niche || 'generic';

  if (user?.role === 'motoboy') return <Navigate to="/" />;
  const [stats, setStats] = useState({
    knowledge: { total: 0 },
    conversations: { total: 0, uniqueUsers: 0 },
    learnings: { total: 0 },
    os: { pending: 0, in_progress: 0, completed: 0 }
  });
  const [crmStats, setCrmStats] = useState({ today: 0, aguardando: 0, atendendo: 0, resolvidos: 0 });

  const [agents, setAgents] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [newAgentName, setNewAgentName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'technician') {
      fetchStatus();
      const interval = setInterval(fetchStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, osStatsRes] = await Promise.all([
          api.get('/stats'),
          api.get('/os/stats')
        ]);
        setStats({ ...statsRes.data, os: osStatsRes.data });

        // Fetch CRM stats
        try {
          const crmRes = await api.get('/crm/stats');
          setCrmStats(crmRes.data);
        } catch (e) { /* CRM tables may not exist yet */ }

        if (user?.role === 'technician') {
          const tasksRes = await api.get('/os/tasks');
          setMyTasks(tasksRes.data.filter(t => t.status !== 'concluida'));
        }
      } catch (err) {
        console.error('Data Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/whatsapp/status');
      setAgents(res.data.agents || []);
    } catch (err) {
      console.error('API Error:', err);
    }
  };

  const handleUpdateStatus = async (taskId, status, extra = {}) => {
    try {
      if (status === 'em_deslocamento') {
        await api.post(`/os/tasks/${taskId}/status`, { status });
      } else if (status === 'em_execucao') {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
        await api.post(`/os/tasks/${taskId}/checkin`, { lat: pos.coords.latitude, lng: pos.coords.longitude });
      } else if (status === 'concluida') {
        const pos = await new Promise((res) => navigator.geolocation.getCurrentPosition(res, () => res({ coords: {} })));
        await api.post(`/os/tasks/${taskId}/checkout`, { lat: pos.coords.latitude, lng: pos.coords.longitude });
      }

      const [statsRes, osStatsRes, tasksRes] = await Promise.all([
        api.get('/stats'),
        api.get('/os/stats'),
        api.get('/os/tasks')
      ]);
      setStats({ ...statsRes.data, os: osStatsRes.data });
      setMyTasks(tasksRes.data.filter(t => t.status !== 'concluida'));
    } catch (err) {
      alert('Erro ao atualizar status: ' + (err.response?.data?.error || err.message));
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddAgent = async () => {
    if (!newAgentName.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post('/whatsapp/agents', { name: newAgentName });
      setNewAgentName('');
      setIsAdding(false);
      await fetchStatus();
    } catch (err) {
      alert('Erro ao adicionar agente: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestartAgent = async (agentId) => {
    try {
      await api.post('/whatsapp/restart', { agentId });
    } catch (err) {
      alert('Erro ao reiniciar agente.');
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!window.confirm('Tem certeza que deseja deletar este agente?')) return;
    try {
      await api.delete(`/whatsapp/agents/${agentId}`);
      await fetchStatus();
    } catch (err) {
      alert('Erro ao deletar agente.');
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><RefreshCw className="animate-spin text-[#25D366]" size={40} /></div>;

  // ─── TECHNICIAN VIEW ───────────────────────────────────────
  if (user?.role === 'technician') {
    return (
      <div className="space-y-8 animate-fade-in pb-10">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tight">Olá, {user.name} 👋</h2>
            <p className="text-slate-400 mt-2 text-lg">Aqui estão suas tarefas pendentes para hoje.</p>
          </div>
          <Link to="/os" className="bg-[#25D366] text-black px-6 py-3 rounded-2xl font-black shadow-lg shadow-[#25D366]/20 flex items-center gap-2">
            <ClipboardList size={20} /> VER TODAS
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard icon={<Clock className="text-yellow-400" />} title="Minhas Pendentes" value={myTasks.length} subtext="Aguardando início" />
          <StatCard icon={<Activity className="text-[#25D366]" />} title="Em Execução" value={myTasks.filter(t => t.status === 'em_execucao').length} subtext="No momento" />
          <StatCard icon={<CheckCircle className="text-blue-400" />} title="Concluídas" value={stats.os?.completed || 0} subtext="Total acumulado" />
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Próximas Tarefas</h3>
          {myTasks.length === 0 ? (
            <div className="glass-panel p-10 text-center border-dashed border-2 border-white/5">
              <p className="text-slate-500 text-lg font-bold">🎉 Nenhuma tarefa pendente!</p>
              <p className="text-slate-600 text-sm">Aproveite o tempo livre ou aguarde novos chamados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {myTasks.map(task => (
                <div key={task.id} className="glass-panel p-6 border border-white/5 hover:border-[#25D366]/30 transition-all group relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${task.status === 'em_execucao' ? 'bg-[#25D366]' : 'bg-slate-700'}`}></div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${task.status === 'em_execucao' ? 'bg-[#25D366] text-black shadow-lg shadow-[#25D366]/20' : 'bg-white/5 text-slate-400'
                      }`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-500 font-bold flex items-center gap-1 group-hover:text-white transition-colors">
                      <Clock size={12} /> {task.scheduled_time?.slice(0, 5)}
                    </span>
                  </div>
                  <h4 className="text-2xl font-black text-white mb-2">{task.title}</h4>
                  <div className="space-y-2 mb-6">
                    <p className="text-sm text-slate-400 flex items-center gap-2"><MapPin size={16} className="text-[#25D366]" /> {task.address || 'Endereço não informado'}</p>
                  </div>
                  {task.status === 'pendente' || task.status === 'agendada' ? (
                    <button onClick={() => handleUpdateStatus(task.id, 'em_deslocamento')} className="w-full block text-center py-4 bg-blue-500 text-white hover:bg-blue-600 rounded-2xl font-black text-sm transition-all shadow-xl">
                      🚗 INICIAR DESLOCAMENTO
                    </button>
                  ) : task.status === 'em_deslocamento' ? (
                    <button onClick={() => handleUpdateStatus(task.id, 'em_execucao')} className="w-full block text-center py-4 bg-yellow-400 text-black hover:bg-yellow-500 rounded-2xl font-black text-sm transition-all shadow-xl">
                      📌 FAZER CHECK-IN
                    </button>
                  ) : task.status === 'em_execucao' ? (
                    <button onClick={() => handleUpdateStatus(task.id, 'concluida')} className="w-full block text-center py-4 bg-[#25D366] text-black hover:bg-[#25D366]/80 rounded-2xl font-black text-sm transition-all shadow-xl">
                      ✅ CONCLUIR SERVIÇO
                    </button>
                  ) : (
                    <Link to="/os" className="w-full block text-center py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-sm transition-all">
                      VER DETALHES
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── ADMIN / COMPANY VIEW ──────────────────────────────────
  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            {niche === 'automotivo' ? 'Painel Automotivo' :
              niche === 'varejo' ? 'Dashboard de Vendas' :
                niche === 'servicos' ? 'Controle de Serviços' : 'Dashboard'}
          </h2>
          <p className="text-slate-500 text-sm font-medium">Visão geral do seu negócio em tempo real.</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-slate-400">
            <Calendar size={14} />
            {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
          </div>
          {!isAdding ? (
            <button onClick={() => setIsAdding(true)} className="bg-[#25D366] hover:bg-[#128C7E] text-slate-900 font-bold flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-[#25D366]/20">
              <Plus size={18} /> Novo Agente
            </button>
          ) : (
            <div className="flex items-center gap-2 glass-panel p-2">
              <input
                type="text"
                value={newAgentName}
                onChange={e => setNewAgentName(e.target.value)}
                placeholder="Ex: Suporte, Vendas..."
                className="bg-transparent border border-white/10 rounded-lg px-3 py-1.5 text-white outline-none"
                autoFocus
              />
              <button
                onClick={handleAddAgent}
                disabled={isSubmitting}
                className="bg-[#25D366] text-slate-900 px-3 py-1.5 rounded-lg font-bold disabled:opacity-50"
              >
                {isSubmitting ? 'Criando...' : 'Criar'}
              </button>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 px-2">Cancelar</button>
            </div>
          )}
        </div>
      </div>

      {/* ── CRM METRICS (Tempo Real) ────────────────────────── */}
      {hasCrm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          <CRMMetricCard title="Total Hoje" value={crmStats.today} desc="conversas" icon={<MessageSquare size={20} />} color="blue" />
          <CRMMetricCard title="Aguardando" value={crmStats.aguardando} desc={crmStats.aguardando > 10 ? 'Alta demanda' : 'Normal'} icon={<Clock size={20} />} color="yellow" alert={crmStats.aguardando > 10} />
          <CRMMetricCard title="Em Atendimento" value={crmStats.atendendo} desc="Ativos agora" icon={<Activity size={20} />} color="green" />
          <CRMMetricCard title="Finalizados" value={crmStats.resolvidos} desc={`${Math.round((crmStats.resolvidos / (crmStats.today || 1)) * 100)}% concluído`} icon={<CheckCircle2 size={20} />} color="purple" />
        </div>
      )}

      {/* ── MULTI-AGENT GRID (QR Code + Status) ─────────────── */}
      <div>
        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Agentes WhatsApp</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {agents.map(agent => (
            <div key={agent.id} className="glass-panel p-5 relative overflow-hidden group border border-white/5 hover:border-white/10 transition-all">
              <div className={`absolute top-0 left-0 w-1 h-full ${agent.status === 'connected' ? 'bg-[#25D366]' :
                agent.status === 'waiting_qr' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>

              <div className="flex justify-between items-start mb-4 pl-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${agent.status === 'connected' ? 'bg-[#25D366]/20 text-[#25D366]' : 'bg-white/5 text-slate-400'
                    }`}>
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{agent.name}</h3>
                    <p className={`text-xs font-semibold ${agent.status === 'connected' ? 'text-[#25D366]' :
                      agent.status === 'waiting_qr' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                      {agent.status === 'connected' ? 'Online' :
                        agent.status === 'waiting_qr' ? 'Aguardando QR' : 'Desconectado'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleRestartAgent(agent.id)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded text-slate-400 hover:text-white">
                    <RefreshCw size={14} />
                  </button>
                  {agent.id !== 'default' && (
                    <button onClick={() => handleDeleteAgent(agent.id)} className="p-1.5 bg-white/5 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {agent.status === 'waiting_qr' && agent.qr && (
                <div className="mt-4 flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-inner">
                  {agent.qr.startsWith('data:') ? (
                    <img src={agent.qr} alt="QR Code" className="w-40 h-40" />
                  ) : (
                    <QRCodeSVG value={agent.qr} size={160} />
                  )}
                  <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">Escaneie para conectar</p>
                </div>
              )}

              {agent.status === 'disconnected' && (
                <div className="mt-4 flex justify-center">
                  <button onClick={() => handleRestartAgent(agent.id)} className="w-full text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2 rounded-lg transition-colors flex justify-center items-center gap-2 font-medium">
                    <QrCode size={16} /> Conectar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── SECONDARY METRICS ROW ──────────────────────────── */}
      <div className={`grid grid-cols-1 ${hasCrm ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6`}>
        {/* Atendentes Online */}
        <div className="p-8 bg-[#0F172A] border border-white/5 rounded-[32px] space-y-6 shadow-2xl">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-black text-white uppercase tracking-widest">Atendentes Online</h4>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-[#25D366]/10 rounded-full">
              <div className="w-1.5 h-1.5 bg-[#25D366] rounded-full animate-pulse"></div>
              <span className="text-[10px] text-[#25D366] font-black uppercase">Ao vivo</span>
            </div>
          </div>
          <div className="flex items-end gap-3 px-2">
            <h3 className="text-6xl font-black text-white">{agents.filter(a => a.status === 'connected').length}</h3>
            <p className="text-sm text-slate-500 font-bold mb-2">de {agents.length} atendentes</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <span>Equipe online</span>
              <span>{agents.length > 0 ? Math.round((agents.filter(a => a.status === 'connected').length / agents.length) * 100) : 0}%</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#25D366] to-emerald-400 rounded-full transition-all" style={{ width: `${agents.length > 0 ? (agents.filter(a => a.status === 'connected').length / agents.length) * 100 : 0}%` }}></div>
            </div>
          </div>
        </div>

        {/* Tempo Médio de Espera */}
        {hasCrm && (
          <div className="p-8 bg-[#0F172A] border border-white/5 rounded-[32px] space-y-6 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Tempo Médio Espera</h4>
              <span className={`text-[10px] px-2 py-1 rounded-full font-black ${crmStats.aguardando > 5 ? 'bg-red-500/10 text-red-500' : 'bg-[#25D366]/10 text-[#25D366]'}`}>
                {crmStats.aguardando > 5 ? 'ALTO' : 'NORMAL'}
              </span>
            </div>
            <div className="flex items-end gap-1 px-2">
              <h3 className="text-6xl font-black text-white">--</h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
              <Timer size={14} />
              <span>Meta: menos de 1 min</span>
            </div>
          </div>
        )}

        {/* TMA */}
        {hasCrm && (
          <div className="p-8 bg-[#0F172A] border border-white/5 rounded-[32px] space-y-6 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-black text-white uppercase tracking-widest">TMA (Médio)</h4>
              <span className="text-[10px] bg-[#25D366]/10 text-[#25D366] px-2 py-1 rounded-full font-black">EFICIENTE</span>
            </div>
            <div className="flex items-end gap-1 px-2">
              <h3 className="text-6xl font-black text-white">--</h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
              <Activity size={14} />
              <span>Meta: menos de 5 min</span>
            </div>
          </div>
        )}
      </div>

      {/* ── ORIGINAL STATS CARDS ───────────────────────────── */}
      <div>
        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Estatísticas do Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={<Bot size={24} className="text-[#25D366]" />}
            title="Agentes Ativos"
            value={agents.filter(a => a.status === 'connected').length}
            subtext={`de ${agents.length} configurados`}
          />
          <StatCard
            icon={<MessageSquare size={24} className="text-blue-400" />}
            title="Conversas"
            value={stats.conversations?.total || 0}
            subtext={`${stats.conversations?.uniqueUsers || 0} contatos únicos`}
          />
          {hasKnowledge && (
            <StatCard
              icon={<Database size={24} className="text-purple-400" />}
              title="Conhecimento"
              value={stats.knowledge?.total || 0}
              subtext="Documentos e notas"
            />
          )}
          {hasLearning && (
            <StatCard
              icon={<TrendingUp size={24} className="text-yellow-400" />}
              title="Aprendizados"
              value={stats.learnings?.total || 0}
              subtext="Extraídos via IA"
            />
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div className="text-center">
        <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em]">Dados atualizados automaticamente a cada 10 segundos</p>
      </div>
    </div>
  );
}

function CRMMetricCard({ title, value, desc, icon, color, alert }) {
  const colors = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: 'text-blue-500' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: 'text-yellow-500' },
    green: { bg: 'bg-[#25D366]/10', border: 'border-[#25D366]/20', icon: 'text-[#25D366]' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: 'text-purple-500' },
  };
  const c = colors[color] || colors.blue;

  return (
    <div className={`p-6 rounded-3xl border ${c.border} ${c.bg} relative overflow-hidden group hover:scale-[1.02] transition-all`}>
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
          <h3 className="text-4xl font-black text-white">{value}</h3>
        </div>
        <div className={`p-3 rounded-2xl bg-black/20 ${c.icon}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {alert && <TrendingUp size={14} className="text-red-500 animate-bounce" />}
        <span className={`text-[10px] font-black uppercase tracking-wider ${alert ? 'text-red-500' : 'text-slate-500'}`}>
          {desc}
        </span>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, subtext }) {
  return (
    <div className="glass-panel p-6 flex flex-col justify-between group hover:border-[#25D366]/30 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-white/5 rounded-xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>
      <div>
        <h3 className="text-4xl font-black text-white tracking-tight">{value}</h3>
        <p className="text-white/80 font-medium mt-1">{title}</p>
        <p className="text-sm text-slate-500 mt-1">{subtext}</p>
      </div>
    </div>
  );
}
