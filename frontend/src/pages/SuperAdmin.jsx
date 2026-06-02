import React, { useState, useEffect } from 'react';
import api from '../api/api';
import {
  ShieldCheck, Plus, Search, Building2, Trash2,
  ToggleLeft, ToggleRight, Edit3, Loader2, X, Save,
  CheckCircle2, XCircle, Bot, Database, BrainCircuit,
  Navigation, TrendingUp, Users
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

  // Delivery Super Config
  const [deliveryConfig, setDeliveryConfig] = useState({ base_price: 7.00, km_rate: 1.50, system_tax: 0.20 });
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    fetchTenants();
    fetchSuperSettings();
  }, []);

  const fetchSuperSettings = async () => {
    try {
      const res = await api.get('/delivery/super-settings');
      setDeliveryConfig({
        base_price: res.data.base_price,
        km_rate: res.data.km_price,
        system_tax: res.data.system_tax
      });
    } catch (err) { console.error('Erro ao buscar super settings'); }
  };

  const handleSaveSuperConfig = async () => {
    setSavingConfig(true);
    try {
      await api.put('/delivery/super-settings', {
        base_price: deliveryConfig.base_price,
        km_price: deliveryConfig.km_rate,
        system_tax: deliveryConfig.system_tax
      });
      alert('✅ Configurações globais salvas!');
    } catch (err) {
      alert('Erro ao salvar configurações globais');
    } finally {
      setSavingConfig(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await api.get('/admin/tenants');
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
        await api.put(`/admin/tenants/${editingId}`, formData);
      } else {
        await api.post('/admin/tenants', formData);
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
      await api.put(`/admin/tenants/${tenant.id}`, { status: newStatus });
      fetchTenants();
    } catch (err) {
      alert('Erro ao alterar status');
    }
  };

  const handleDelete = async (id) => {
    if (id === 'admin' || id === 'default') return alert('Não é possível deletar contas padrão');
    if (!window.confirm('Deseja realmente excluir esta empresa e todos os seus agentes?')) return;
    try {
      await api.delete(`/admin/tenants/${id}`);
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
          <p className="text-slate-400 mt-2 text-lg">Gestão global do ecossistema WhatsApp AI Pro.</p>
        </div>

        <button
          onClick={() => { setEditingId(null); setFormData({ id: '', name: '', password: '', logo: '' }); setShowModal(true); }}
          className="bg-[#25D366] hover:bg-[#1DA851] text-slate-900 px-6 py-3.5 rounded-xl font-bold shadow-[0_0_15px_rgba(37,211,102,0.3)] flex items-center gap-2 transition-all transform hover:-translate-y-1"
        >
          <Plus size={20} /> Nova Empresa
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 glass-panel p-8 border border-[#25D366]/20 bg-gradient-to-br from-[#25D366]/5 to-transparent">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-6 flex items-center gap-3">
            <TrendingUp className="text-[#25D366]" size={24} /> Tarifação Global
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-8">Defina as regras de ganhos de todo o sistema.</p>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-2">Bandeirada Base (R$)</label>
              <input type="number" step="0.1" value={deliveryConfig.base_price} onChange={e => setDeliveryConfig({ ...deliveryConfig, base_price: e.target.value })} className="w-full bg-[#0F172A] border border-white/10 rounded-2xl p-5 text-2xl font-black text-[#25D366] outline-none focus:border-[#25D366]" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-2">Preço por KM (R$)</label>
              <input type="number" step="0.1" value={deliveryConfig.km_rate} onChange={e => setDeliveryConfig({ ...deliveryConfig, km_rate: e.target.value })} className="w-full bg-[#0F172A] border border-white/10 rounded-2xl p-5 text-2xl font-black text-blue-500 outline-none focus:border-blue-500" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-2">Taxa de Lucro Sistema</label>
              <div className="relative">
                <input type="number" step="0.01" value={deliveryConfig.system_tax} onChange={e => setDeliveryConfig({ ...deliveryConfig, system_tax: e.target.value })} className="w-full bg-[#0F172A] border border-white/10 rounded-2xl p-5 text-2xl font-black text-purple-500 outline-none focus:border-purple-500" />
                <span className="absolute right-5 top-5 text-[9px] font-black text-slate-500 uppercase italic">Ex: 0.20 = 20%</span>
              </div>
            </div>
            <button onClick={handleSaveSuperConfig} disabled={savingConfig} className="w-full py-5 bg-gradient-to-r from-[#25D366] to-green-600 text-black font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs transform hover:scale-[1.02] transition-all">
              {savingConfig ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Atualizar Regras Globais</>}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 glass-panel flex flex-col min-h-[500px] overflow-hidden">
          <div className="p-8 border-b border-white/5 bg-slate-800/30 flex items-center justify-between gap-4">
            <h3 className="text-xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3">
              <Building2 className="text-blue-500" /> Empresas Parceiras
            </h3>
            <div className="flex bg-[#0F172A] rounded-xl border border-white/10 overflow-hidden shadow-inner w-full max-w-xs focus-within:border-[#25D366]/50 transition-colors">
              <div className="px-4 flex items-center justify-center text-slate-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Pesquisar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="py-3 w-full bg-transparent outline-none text-slate-200 placeholder-slate-600 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 text-[10px] uppercase tracking-widest font-black">
                  <th className="px-8 py-5">Empresa</th>
                  <th className="px-8 py-5 text-center">Agentes</th>
                  <th className="px-8 py-5 text-center">Conhecimento</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-20 text-slate-600 font-black uppercase tracking-widest text-xs">Sincronizando empresas...</td>
                  </tr>
                ) : filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="group hover:bg-white/5 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-[#0F172A] border border-white/10 flex items-center justify-center text-[#25D366] overflow-hidden shadow-xl">
                          {tenant.logo ? <img src={tenant.logo} className="w-full h-full object-cover" alt="Logo" /> : <Building2 size={28} />}
                        </div>
                        <div>
                          <div className="font-black text-white text-lg tracking-tighter uppercase">{tenant.name}</div>
                          <div className="text-slate-500 text-xs font-mono lowercase">{tenant.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 font-black text-xs">
                        <Bot size={16} /> {tenant.agentCount || 0}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-center gap-4">
                        <div className="flex flex-col items-center">
                          <div className="text-xs font-black text-white">{tenant.knowledgeCount || 0}</div>
                          <span className="text-[9px] text-slate-600 uppercase font-black tracking-tighter">Files</span>
                        </div>
                        <div className="w-[1px] h-8 bg-white/5"></div>
                        <div className="flex flex-col items-center">
                          <div className="text-xs font-black text-white">{tenant.obsidianCount || 0}</div>
                          <span className="text-[9px] text-slate-600 uppercase font-black tracking-tighter">Brain</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {tenant.status === 'active' ? (
                        <span className="text-[#25D366] text-[10px] font-black flex items-center gap-2 uppercase tracking-widest bg-[#25D366]/10 px-3 py-1.5 rounded-full w-fit border border-[#25D366]/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse"></div> Ativa
                        </span>
                      ) : (
                        <span className="text-red-400 text-[10px] font-black flex items-center gap-2 uppercase tracking-widest bg-red-500/10 px-3 py-1.5 rounded-full w-fit border border-red-500/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div> Inativa
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                        <button onClick={() => toggleStatus(tenant)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all"><ToggleRight size={22} /></button>
                        <button onClick={() => openEdit(tenant)} className="p-3 bg-blue-500/5 hover:bg-blue-500/10 rounded-xl text-blue-400 transition-all"><Edit3 size={20} /></button>
                        <button onClick={() => handleDelete(tenant.id)} className="p-3 bg-red-500/5 hover:bg-red-500/10 rounded-xl text-red-500 transition-all disabled:opacity-10" disabled={tenant.id === 'admin'}><Trash2 size={20} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 animate-fade-in bg-black/90 backdrop-blur-md">
          <div className="absolute inset-0" onClick={() => setShowModal(false)}></div>
          <div className="bg-[#0F172A] border border-white/10 rounded-[40px] p-10 w-full max-w-lg z-10 shadow-2xl relative">
            <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3 tracking-tighter uppercase italic">
              <Building2 className="text-[#25D366]" size={32} />
              {editingId ? 'Editar Parceiro' : 'Novo Parceiro'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">ID da Empresa (Tenant)</label>
                <input type="text" value={formData.id} onChange={(e) => setFormData({ ...formData, id: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-[#25D366] disabled:opacity-30" disabled={!!editingId} required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Nome Comercial</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-[#25D366]" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">URL da Logo</label>
                <input type="text" value={formData.logo} onChange={(e) => setFormData({ ...formData, logo: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-[#25D366]" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Senha de Acesso</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-[#25D366]" required={!editingId} />
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs">Cancelar</button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-[#25D366] to-green-600 text-black font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
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
