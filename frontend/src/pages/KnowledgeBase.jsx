import React, { useState, useEffect } from 'react';
import api from '../api/api';
import {
  UploadCloud, FileText, Image as ImageIcon, Mic, Video,
  Trash2, Search, Filter, Database, Bot, BrainCircuit,
  Zap, Loader2, Sparkles
} from 'lucide-react';

export default function KnowledgeBase() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('all');

  // Obsidian Sync
  const [obsidianPath, setObsidianPath] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await api.get('/whatsapp/status');
      setAgents(res.data.agents || []);
    } catch (err) {
      console.error('API Error:', err);
    }
  };

  const fetchItems = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filter !== 'all') queryParams.append('type', filter);
      if (selectedAgent !== 'all') queryParams.append('agentId', selectedAgent);

      const res = await api.get(`/knowledge?${queryParams.toString()}`);
      setItems(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [filter, selectedAgent]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    formData.append('agentId', selectedAgent === 'all' ? 'global' : selectedAgent);

    try {
      await api.post('/knowledge/upload', formData);
      fetchItems();
      alert('Arquivo enviado com sucesso!');
    } catch (err) {
      alert('Erro ao fazer upload: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleObsidianSync = async () => {
    if (!obsidianPath) return alert('Por favor, informe o caminho do seu vault.');
    setIsSyncing(true);
    try {
      await api.post('/obsidian/sync', { path: obsidianPath });
      alert('Sincronização do Obsidian iniciada! Os arquivos aparecerão em instantes.');
      setTimeout(fetchItems, 3000);
    } catch (err) {
      alert('Erro ao sincronizar Obsidian: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este item?')) return;
    try {
      await api.delete(`/knowledge/${encodeURIComponent(id)}`);
      fetchItems();
    } catch (err) {
      alert('Erro ao deletar: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleChangeAgent = async (id, newAgentId) => {
    try {
      await api.put(`/knowledge/${encodeURIComponent(id)}/agent`, { agentId: newAgentId });
      fetchItems();
    } catch (err) {
      alert('Erro ao vincular agente: ' + (err.response?.data?.error || err.message));
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'document': return <FileText className="text-blue-400" size={24} />;
      case 'image': return <ImageIcon className="text-emerald-400" size={24} />;
      case 'audio': return <Mic className="text-purple-400" size={24} />;
      case 'video': return <Video className="text-rose-400" size={24} />;
      case 'obsidian': return <Database className="text-purple-500" size={24} />;
      default: return <Database className="text-slate-400" size={24} />;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-10 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
            <Database className="text-[#25D366]" size={28} />
            Base de Conhecimento
          </h2>
          <p className="text-slate-400 mt-2 text-sm sm:text-lg">Alimente a inteligência dos seus agentes de forma independente.</p>
        </div>

        <label className="bg-[#25D366] hover:bg-[#1DA851] text-slate-900 px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl font-bold shadow-[0_0_15px_rgba(37,211,102,0.3)] flex items-center gap-2 sm:gap-3 cursor-pointer transition-all transform hover:-translate-y-1 text-sm sm:text-base flex-shrink-0">
          <UploadCloud size={20} />
          {uploading ? 'Enviando...' : 'Fazer Upload'}
          <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
        </label>
      </div>

      {/* OBSIDIAN SYNC PANEL */}
      <div className="glass-panel p-4 sm:p-6 border-l-4 border-l-purple-500 bg-purple-500/5">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/10 flex-shrink-0">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">Sincronizar Obsidian <Sparkles size={16} className="text-purple-400" /></h3>
              <p className="text-xs sm:text-sm text-slate-400">Indexe seu vault local para busca semântica.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <input
              type="text"
              placeholder="Caminho do Vault (ex: C:\Notas\MeuVault)"
              value={obsidianPath}
              onChange={(e) => setObsidianPath(e.target.value)}
              className="flex-1 bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-500/50 transition-colors w-full"
            />
            <button
              onClick={handleObsidianSync}
              disabled={isSyncing}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 sm:px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 flex-shrink-0 text-sm"
            >
              {isSyncing ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
              {isSyncing ? 'Syncing...' : 'Sincronizar'}
            </button>
          </div>
        </div>
      </div>

      <div className="glass-panel flex flex-col flex-1 overflow-hidden min-h-[400px] sm:min-h-[500px]">
        {/* Toolbar */}
        <div className="p-3 sm:p-5 border-b border-white/5 bg-slate-800/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:flex-1">
            <div className="flex bg-[#0F172A] rounded-xl border border-white/10 overflow-hidden shadow-inner w-full sm:max-w-md">
              <div className="px-3 sm:px-4 flex items-center justify-center text-slate-400">
                <Filter size={18} />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="py-3 sm:py-3.5 w-full bg-transparent outline-none text-slate-200 text-sm"
              >
                <option value="all">Todos os tipos</option>
                <option value="document">Documentos</option>
                <option value="image">Imagens</option>
                <option value="audio">Áudios</option>
                <option value="obsidian">Obsidian</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-[#0F172A] rounded-xl border border-white/10 px-3 sm:px-4 w-full sm:w-auto">
              <Bot size={18} className="text-slate-400 flex-shrink-0" />
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="py-3 sm:py-3.5 bg-transparent outline-none text-slate-200 text-sm w-full"
              >
                <option value="all">Vincular: Todos</option>
                <option value="global">Vincular: Global</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>Vincular: {a.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-500">Nenhum item encontrado.</div>
          ) : items.map((item) => (
            <div key={item.id} className="bg-[#0F172A] border border-white/5 rounded-2xl p-5 hover:border-[#25D366]/30 transition-all group relative overflow-hidden">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-white/5 rounded-xl">
                  {getIcon(item.type)}
                </div>
                <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={18} />
                </button>
              </div>
              <h4 className="font-bold text-white mb-1 truncate">{item.title}</h4>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-4">
                {item.type} • {item.metadata?.agentId === 'unassigned' ? 'Não Vinculado' : item.metadata?.agentId === 'global' ? 'Global' : 'Privado'}
              </p>

              <div className="flex items-center gap-2 bg-black/20 p-2 rounded-xl border border-white/5">
                <Bot size={14} className="text-slate-400" />
                <select
                  className="bg-transparent text-xs text-slate-300 outline-none w-full cursor-pointer"
                  value={item.metadata?.agentId || 'unassigned'}
                  onChange={(e) => handleChangeAgent(item.id, e.target.value)}
                >
                  <option value="unassigned">Sem Agente</option>
                  <option value="global">Todos (Global)</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>Apenas: {a.name}</option>
                  ))}
                </select>
              </div>

              {item.type === 'obsidian' && (
                <div className="mt-3 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[10px] text-purple-400 font-bold uppercase tracking-tighter">
                  Sincronizado via Obsidian
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

