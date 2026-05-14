import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { Bot, MessageSquare, Database, TrendingUp, CheckCircle2, Activity, QrCode, Smartphone, Plus, Trash2, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    knowledge: { total: 0 },
    conversations: { total: 0, uniqueUsers: 0 },
    learnings: { total: 0 }
  });
  
  const [agents, setAgents] = useState([]);
  const [newAgentName, setNewAgentName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/api/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Stats Error:', err);
      }
    };
    fetchStats();
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/api/whatsapp/status');
      setAgents(res.data.agents || []);
    } catch (err) {
      console.error('API Error:', err);
    }
  };

  const handleAddAgent = async () => {
    if (!newAgentName.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post('/api/whatsapp/agents', { name: newAgentName });
      setNewAgentName('');
      setIsAdding(false);
      // Busca status imediatamente para mostrar o novo agente "desconectado" ou "iniciando"
      await fetchStatus();
    } catch (err) {
      alert('Erro ao adicionar agente: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestartAgent = async (agentId) => {
    try {
      await api.post('/api/whatsapp/restart', { agentId });
    } catch (err) {
      alert('Erro ao reiniciar agente.');
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!window.confirm('Tem certeza que deseja deletar este agente?')) return;
    try {
      await api.delete(`/api/whatsapp/agents/${agentId}`);
    } catch (err) {
      alert('Erro ao deletar agente.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-4xl font-bold text-white tracking-tight">Painel de Controle</h2>
          <p className="text-slate-400 mt-2 text-lg">Gerencie seus múltiplos Agentes e visualize estatísticas globais.</p>
        </div>
        
        <div>
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

      {/* MULTI-AGENT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {agents.map(agent => (
          <div key={agent.id} className="glass-panel p-5 relative overflow-hidden group border border-white/5 hover:border-white/10 transition-all">
            <div className={`absolute top-0 left-0 w-1 h-full ${
              agent.status === 'connected' ? 'bg-[#25D366]' : 
              agent.status === 'waiting_qr' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            
            <div className="flex justify-between items-start mb-4 pl-2">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  agent.status === 'connected' ? 'bg-[#25D366]/20 text-[#25D366]' : 'bg-white/5 text-slate-400'
                }`}>
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">{agent.name}</h3>
                  <p className={`text-xs font-semibold ${
                    agent.status === 'connected' ? 'text-[#25D366]' : 
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
                <QRCodeSVG value={agent.qr} size={160} />
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

      {/* STATS CARDS */}
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
        <StatCard 
          icon={<Database size={24} className="text-purple-400" />}
          title="Conhecimento"
          value={stats.knowledge?.total || 0}
          subtext="Documentos e notas"
        />
        <StatCard 
          icon={<TrendingUp size={24} className="text-yellow-400" />}
          title="Aprendizados"
          value={stats.learnings?.total || 0}
          subtext="Extraídos via IA"
        />
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

