import React, { useState, useEffect, useRef } from 'react';
import api from '../api/api';
import { Settings, Save, Bot, Volume2, Shield, Loader2, Building2, Image as ImageIcon, Upload, Cpu } from 'lucide-react';
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
    respond_all: true,
    ai_provider: 'openai',
    openai_api_key: '',
    openai_model: 'gpt-4o-mini',
    anthropic_api_key: '',
    anthropic_model: 'claude-3-haiku-20240307'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await api.get('/whatsapp/status');
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
    if (!selectedAgentId || agents.length === 0) return;

    const fetchSettings = async () => {
      setLoading(true);
      try {
        // Primeiro tenta achar na lista local
        const agent = agents.find(a => a.id === selectedAgentId);
        if (agent && agent.settings && Object.keys(agent.settings).length > 5) {
          setSettings(agent.settings);
        } else {
          // Se não tiver ou for incompleto, busca status fresco do banco
          const res = await api.get('/whatsapp/status');
          const freshAgent = (res.data.agents || []).find(a => a.id === selectedAgentId);
          if (freshAgent && freshAgent.settings) {
            setSettings(freshAgent.settings);
          }
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
      await api.post(`/whatsapp/agents/${selectedAgentId}/settings`, {
        settings
      });
      alert('Configurações salvas com sucesso!');
      const res = await api.get('/whatsapp/status');
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
      const res = await api.post('/company/logo', formData, {
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

  const [niche, setNiche] = useState(user?.niche || 'generic');

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    try {
      await api.put('/company/settings', {
        name: companyName,
        logo: companyLogo,
        niche: niche
      });
      updateProfile({ name: companyName, logo: companyLogo, niche: niche });
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
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Nicho de Atuação (Multi-Niche)</label>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { id: 'automotivo', label: 'Automotivo', icon: '🚗' },
                    { id: 'varejo', label: 'Varejo', icon: '🛍️' },
                    { id: 'servicos', label: 'Serviços', icon: '💼' },
                    { id: 'generic', label: 'Geral', icon: '📦' }
                  ].map(n => (
                    <button
                      key={n.id}
                      onClick={() => setNiche(n.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-xs font-bold ${niche === n.id
                        ? 'bg-[#25D366]/20 border-[#25D366] text-[#25D366]'
                        : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'
                        }`}
                    >
                      <span>{n.icon}</span> {n.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleSaveCompany}
                disabled={savingCompany}
                className="w-full bg-[#25D366] hover:bg-[#1DA851] text-black py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#25D366]/10"
              >
                {savingCompany ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Salvar Alterações Globais
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

            {/* PROVEDOR DE IA */}
            <div className="glass-panel p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                <Cpu className="text-[#25D366]" /> Provedor de Inteligência Artificial
              </h3>
              <p className="text-sm text-slate-400 mb-6">Selecione qual cérebro de IA este agente usará para processar mensagens. Deixe a chave de API em branco para usar a chave padrão do servidor.</p>

              {/* Provider Selector */}
              <div className="flex gap-3 mb-6">
                {[
                  { id: 'openai', label: 'OpenAI', icon: '🟢', desc: 'GPT-4o, GPT-4o-mini' },
                  { id: 'anthropic', label: 'Anthropic Claude', icon: '🟠', desc: 'Claude Haiku, Sonnet, Opus' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleChange('ai_provider', p.id)}
                    className={`flex-1 flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${
                      settings.ai_provider === p.id
                        ? 'bg-[#25D366]/10 border-[#25D366] shadow-[0_0_20px_rgba(37,211,102,0.15)]'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <span className={`font-bold text-sm ${settings.ai_provider === p.id ? 'text-[#25D366]' : 'text-white'}`}>{p.label}</span>
                    <span className="text-xs text-slate-500">{p.desc}</span>
                  </button>
                ))}
              </div>

              {/* OpenAI Config */}
              {settings.ai_provider === 'openai' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-[#0F172A] rounded-xl border border-white/5 animate-fade-in">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Chave de API OpenAI</label>
                    <input
                      type="password"
                      placeholder="Usar chave padrão do servidor"
                      value={settings.openai_api_key}
                      onChange={(e) => handleChange('openai_api_key', e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#25D366]/50 transition-colors"
                    />
                    <p className="text-xs text-slate-500 mt-1">Se vazio, usa a variável OPENAI_API_KEY do servidor.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Modelo OpenAI</label>
                    <select
                      value={settings.openai_model}
                      onChange={(e) => handleChange('openai_model', e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#25D366]/50 transition-colors"
                    >
                      <option value="gpt-4o-mini">GPT-4o Mini (Rápido e Econômico)</option>
                      <option value="gpt-4o">GPT-4o (Mais Inteligente)</option>
                      <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                      <option value="gpt-4.1">GPT-4.1</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Anthropic Config */}
              {settings.ai_provider === 'anthropic' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-[#0F172A] rounded-xl border border-white/5 animate-fade-in">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Chave de API Anthropic</label>
                    <input
                      type="password"
                      placeholder="Usar chave padrão do servidor"
                      value={settings.anthropic_api_key}
                      onChange={(e) => handleChange('anthropic_api_key', e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#25D366]/50 transition-colors"
                    />
                    <p className="text-xs text-slate-500 mt-1">Se vazio, usa a variável ANTHROPIC_API_KEY do servidor.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Modelo Anthropic</label>
                    <select
                      value={settings.anthropic_model}
                      onChange={(e) => handleChange('anthropic_model', e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#25D366]/50 transition-colors"
                    >
                      <option value="claude-3-haiku-20240307">Claude 3 Haiku (Rápido e Gratuito)</option>
                      <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                      <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Recomendado)</option>
                      <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                      <option value="claude-opus-4-20250514">Claude Opus 4 (Mais Inteligente)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-amber-400 text-lg">⚠️</span>
                    <p className="text-xs text-amber-300/80">A Anthropic não oferece TTS (texto em áudio) nem Whisper (transcrição). Se o modo de resposta for "Áudio" ou "Espelhar", o sistema usará automaticamente a OpenAI para TTS/transcrição, mantendo o Claude apenas para o raciocínio textual.</p>
                  </div>
                </div>
              )}
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

