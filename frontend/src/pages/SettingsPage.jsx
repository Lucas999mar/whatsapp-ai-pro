import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Settings, Save, Bot, Volume2, Shield, Loader2, Building2, Image as ImageIcon, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('default');
  
  // Company Branding
  const [companyName, setCompanyName] = useState(user?.name || '');
  const [companyLogo, setCompanyLogo] = useState(user?.logo || '');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const fileInputRef = useRef(null);

  const [settings, setSettings] = useState({
    bot_name: '',
    prefix: '!ia',
    system_prompt: '',
    response_mode: 'mirror',
    tts_voice: 'nova',
    respond_all: true
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await axios.get('http://localhost:3001/api/whatsapp/status');
        const agentsList = res.data.agents || [];
        setAgents(agentsList);
        if (agentsList.length > 0 && !selectedAgentId) {
          setSelectedAgentId(agentsList[0].id);
        }
      } catch (err) {
        console.error('Erro ao buscar agentes:', err);
      }
    };
    fetchAgents();
  }, []);

  useEffect(() => {
    if (!selectedAgentId) return;
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const agent = agents.find(a => a.id === selectedAgentId);
        if (agent && agent.settings) {
          setSettings(agent.settings);
        }
      } catch (err) {
        console.error('Erro ao buscar configurações:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [selectedAgentId, agents]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`http://localhost:3001/api/whatsapp/agents/${selectedAgentId}/settings`, {
        settings
      });
      alert('Configurações salvas com sucesso!');
      const res = await axios.get('http://localhost:3001/api/whatsapp/status');
      setAgents(res.data.agents || []);
    } catch (err) {
      alert('Erro ao salvar configurações: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('logo', file);

    try {
      const res = await axios.post('http://localhost:3001/api/company/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setCompanyLogo(res.data.logoUrl);
      updateProfile({ logo: res.data.logoUrl });
      alert('Logo carregada com sucesso!');
    } catch (err) {
      alert('Erro ao carregar logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    try {
      await axios.put('http://localhost:3001/api/company/settings', {
        name: companyName,
        logo: companyLogo
      });
      updateProfile({ name: companyName, logo: companyLogo });
      alert('Perfil da empresa atualizado!');
    } catch (err) {
      alert('Erro ao salvar perfil');
    } finally {
      setSavingCompany(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
            <Settings className="text-[#25D366]" size={36} />
            Configurações
          </h2>
          <p className="text-slate-400 mt-2 text-lg">Ajuste o comportamento do sistema e sua marca.</p>
        </div>

        <div className="flex items-center gap-3 bg-[#0F172A] px-4 py-3 rounded-xl border border-white/10 shadow-inner">
          <Bot size={18} className="text-[#25D366]" />
          <select 
            className="outline-none bg-transparent text-slate-200 font-medium cursor-pointer" 
            value={selectedAgentId} 
            onChange={(e) => setSelectedAgentId(e.target.value)}
          >
            {agents.map(a => (
              <option key={a.id} value={a.id} className="bg-slate-800">Agente: {a.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-6">
        {/* BRANDING */}
        <div className="glass-panel p-8">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
            <Building2 className="text-[#25D366]" /> Perfil da Empresa (Branding)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Nome da Empresa</label>
                <input 
                  type="text" 
                  value={companyName} 
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none" 
                />
              </div>
              <button 
                onClick={handleSaveCompany}
                disabled={savingCompany}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                {savingCompany ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Salvar Nome da Empresa
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-6 bg-[#0F172A] rounded-2xl border border-dashed border-white/10 relative group overflow-hidden">
              {uploadingLogo ? (
                <Loader2 className="animate-spin text-[#25D366]" size={48} />
              ) : companyLogo ? (
                <div className="relative w-32 h-32">
                  <img src={companyLogo} className="w-full h-full object-cover rounded-2xl" alt="Logo" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl cursor-pointer" onClick={() => fileInputRef.current.click()}>
                    <Upload className="text-white" size={24} />
                  </div>
                </div>
              ) : (
                <div className="text-center cursor-pointer" onClick={() => fileInputRef.current.click()}>
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3 text-slate-500">
                    <ImageIcon size={32} />
                  </div>
                  <p className="text-sm text-slate-400">Clique para enviar logo</p>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleLogoUpload} 
                className="hidden" 
                accept="image/*"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p>Carregando configurações do agente...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="glass-panel p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                <Bot className="text-[#25D366]" /> Identidade do Agente
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Nome do Bot</label>
                  <input type="text" value={settings.bot_name} onChange={(e) => handleChange('bot_name', e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Gatilho (Prefixo)</label>
                  <input type="text" value={settings.prefix} onChange={(e) => handleChange('prefix', e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none" />
                </div>
              </div>
              <div className="mt-6">
                <label className="block text-sm font-medium text-slate-400 mb-2">Prompt do Sistema</label>
                <textarea rows="6" className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none" value={settings.system_prompt} onChange={(e) => handleChange('system_prompt', e.target.value)}></textarea>
              </div>
            </div>

            <div className="glass-panel p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                <Volume2 className="text-[#25D366]" /> Voz e Respostas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Modo de Resposta</label>
                  <select value={settings.response_mode} onChange={(e) => handleChange('response_mode', e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                    <option value="mirror">Espelhar (Texto/Áudio)</option>
                    <option value="text">Sempre Texto</option>
                    <option value="audio">Sempre Áudio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Voz TTS</label>
                  <select value={settings.tts_voice} onChange={(e) => handleChange('tts_voice', e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                    <option value="nova">Nova</option>
                    <option value="alloy">Alloy</option>
                    <option value="echo">Echo</option>
                    <option value="shimmer">Shimmer</option>
                    <option value="onyx">Onyx</option>
                    <option value="fable">Fable</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="glass-panel p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                <Shield className="text-[#25D366]" /> Operação
              </h3>
              <div className="flex items-center justify-between p-4 bg-[#0F172A] border border-white/5 rounded-xl">
                <div><h4 className="font-bold text-white">Responder TODAS</h4><p className="text-sm text-slate-400 mt-1">O bot ignora o prefixo.</p></div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={settings.respond_all} onChange={(e) => handleChange('respond_all', e.target.checked)} className="sr-only peer" />
                  <div className="w-14 h-7 bg-slate-700 rounded-full peer peer-checked:bg-[#25D366] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button onClick={handleSave} disabled={saving} className="bg-[#25D366] hover:bg-[#1DA851] text-slate-900 px-8 py-3.5 rounded-xl font-bold shadow-[0_0_15px_rgba(37,211,102,0.3)] flex items-center gap-2 transition-all disabled:opacity-70">
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
