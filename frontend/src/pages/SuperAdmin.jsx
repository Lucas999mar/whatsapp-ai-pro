import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { 
  ShieldCheck, Plus, Search, Building2, Trash2, 
  ToggleLeft, ToggleRight, Edit3, Loader2, X, Save,
  CheckCircle2, XCircle, Bot, Database, BrainCircuit
} from 'lucide-react';

export default function SuperAdmin() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ id: '', name: '', password: '', logo: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const res = await api.get('/api/admin/tenants');
      setTenants(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/api/admin/tenants/${editingId}`, formData);
      } else {
        await api.post('/api/admin/tenants', formData);
      }
      setShowModal(false);
      fetchTenants();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar empresa');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (tenant) => {
    try {
      const newStatus = tenant.status === 'active' ? 'inactive' : 'active';
      await api.put(`/api/admin/tenants/${tenant.id}`, { status: newStatus });
      fetchTenants();
    } catch (err) {
      alert('Erro ao alterar status');
    }
  };

  const handleDelete = async (id) => {
    if (id === 'admin' || id === 'default') return alert('Não é possível deletar contas padrão');
    if (!window.confirm('Deseja realmente excluir esta empresa e todos os seus agentes?')) return;
    try {
      await api.delete(`/api/admin/tenants/${id}`);
      fetchTenants();
    } catch (err) {
      alert('Erro ao excluir empresa');
    }
  };

  const openEdit = (tenant) => {
    setEditingId(tenant.id);
    setFormData({ id: tenant.id, name: tenant.name, password: tenant.password, logo: tenant.logo || '' });
    setShowModal(true);
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-[#25D366]" size={36} />
            Super Admin
          </h2>
          <p className="text-slate-400 mt-2 text-lg">Gestão de empresas e acompanhamento de frota.</p>
        </div>

        <button 
          onClick={() => { setEditingId(null); setFormData({ id: '', name: '', password: '', logo: '' }); setShowModal(true); }}
          className="bg-[#25D366] hover:bg-[#1DA851] text-slate-900 px-6 py-3.5 rounded-xl font-bold shadow-[0_0_15px_rgba(37,211,102,0.3)] flex items-center gap-2 transition-all transform hover:-translate-y-1"
        >
          <Plus size={20} /> Nova Empresa
        </button>
      </div>

      <div className="glass-panel flex flex-col min-h-[600px] overflow-hidden">
        <div className="p-6 border-b border-white/5 bg-slate-800/30 flex items-center justify-between gap-4">
          <div className="flex bg-[#0F172A] rounded-xl border border-white/10 overflow-hidden shadow-inner flex-1 max-w-md focus-within:border-[#25D366]/50 transition-colors">
            <div className="px-4 flex items-center justify-center text-slate-400">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Pesquisar empresa..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="py-3.5 w-full bg-transparent outline-none text-slate-200 placeholder-slate-500" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Empresa</th>
                <th className="px-6 py-4 text-center">Agentes</th>
                <th className="px-6 py-4 text-center">Conhecimento (Itens)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-20 text-slate-500">Carregando frota...</td>
                </tr>
              ) : filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="group hover:bg-white/5 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#0F172A] border border-white/10 flex items-center justify-center text-[#25D366] overflow-hidden">
                        {tenant.logo ? <img src={tenant.logo} className="w-full h-full object-cover" alt="Logo" /> : <Building2 size={24} />}
                      </div>
                      <div>
                        <div className="font-bold text-white text-lg">{tenant.name}</div>
                        <div className="text-slate-500 text-sm font-mono">{tenant.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 font-bold">
                      <Bot size={16} /> {tenant.agentCount || 0}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-center gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                          <Database size={12} className="text-emerald-400" /> {tenant.knowledgeCount || 0}
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase font-black">Arquivos</span>
                      </div>
                      <div className="w-[1px] h-6 bg-white/10"></div>
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                          <BrainCircuit size={12} className="text-purple-400" /> {tenant.obsidianCount || 0}
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase font-black">Obsidian</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {tenant.status === 'active' ? (
                      <span className="text-[#25D366] text-xs font-black flex items-center gap-1 uppercase tracking-wider">
                        <CheckCircle2 size={14} /> Ativa
                      </span>
                    ) : (
                      <span className="text-red-400 text-xs font-black flex items-center gap-1 uppercase tracking-wider">
                        <XCircle size={14} /> Desativada
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleStatus(tenant)} className="p-2 text-slate-400 hover:text-white"><ToggleRight size={22} /></button>
                      <button onClick={() => openEdit(tenant)} className="p-2 text-blue-400 hover:text-white"><Edit3 size={20} /></button>
                      <button onClick={() => handleDelete(tenant.id)} className="p-2 text-red-400 hover:text-white disabled:opacity-20" disabled={tenant.id === 'admin'}><Trash2 size={20} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-8 w-full max-w-lg z-10 shadow-2xl relative">
            <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
              <Building2 className="text-[#25D366]" />
              {editingId ? 'Editar Empresa' : 'Nova Empresa'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">ID Único</label>
                <input type="text" value={formData.id} onChange={(e) => setFormData({...formData, id: e.target.value})} className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none disabled:opacity-50" disabled={!!editingId} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Nome Comercial</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">URL da Logo (Opcional)</label>
                <input type="text" value={formData.logo} onChange={(e) => setFormData({...formData, logo: e.target.value})} className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Senha</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none" required={!editingId} />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-800 text-white font-bold py-3.5 rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 bg-[#25D366] text-slate-900 font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

