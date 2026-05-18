import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { Blocks, Save, Loader2, Send, MessageCircle, Calendar, Link2, Info } from 'lucide-react';

export default function IntegrationsPage() {
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('default');
  
  const [settings, setSettings] = useState({
    telegram_token: '',
    instagram_token: '',
    google_calendar_key: ''
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
        const res = await api.get('/whatsapp/status');
        const freshAgent = (res.data.agents || []).find(a => a.id === selectedAgentId);
        if (freshAgent && freshAgent.settings) {
          setSettings(prev => ({
            ...prev,
            telegram_token: freshAgent.settings.telegram_token || '',
            instagram_token: freshAgent.settings.instagram_token || '',
            google_calendar_key: freshAgent.settings.google_calendar_key || ''
          }));
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
      // Buscar settings atuais para não sobrescrever o resto
      const res = await api.get('/whatsapp/status');
      const agent = (res.data.agents || []).find(a => a.id === selectedAgentId);
      const currentSettings = agent?.settings || {};

      await api.post(`/whatsapp/agents/${selectedAgentId}/settings`, {
        settings: {
          ...currentSettings,
          telegram_token: settings.telegram_token,
          instagram_token: settings.instagram_token,
          google_calendar_key: settings.google_calendar_key
        }
      });
      alert('Integrações salvas com sucesso!');
    } catch (err) {
      alert('Erro ao salvar integrações: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-20">
      
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
            <Blocks className="text-[#25D366]" size={36} />
            Integrações & API
          </h2>
          <p className="text-slate-400 mt-2 text-lg">
            Conecte o cérebro da Inteligência Artificial aos principais canais e plataformas.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[#0F172A] px-4 py-3 rounded-xl border border-white/10 shadow-inner">
          <Link2 size={18} className="text-[#25D366]" />
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 className="animate-spin mb-4" size={40} />
          <p>Carregando integrações do agente...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* TELEGRAM */}
          <div className="glass-panel p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Send size={120} />
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-[#0088cc] rounded-xl flex items-center justify-center shadow-lg shadow-[#0088cc]/20">
                <Send size={24} className="text-white ml-1" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Telegram Bot</h3>
                <span className="text-xs font-semibold text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 rounded-full mt-1 inline-block">Ativo</span>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed relative z-10">
              Transforme seu agente em um bot oficial do Telegram. Ele compartilhará a mesma base de conhecimento do WhatsApp.
            </p>
            <div className="relative z-10">
              <label className="block text-sm font-medium text-slate-400 mb-2">Bot Token (BotFather)</label>
              <input 
                type="text" 
                placeholder="Ex: 123456789:ABCdefGHIjklMNO..."
                value={settings.telegram_token} 
                onChange={(e) => handleChange('telegram_token', e.target.value)} 
                className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#25D366]/50 transition-colors" 
              />
            </div>
          </div>

          {/* INSTAGRAM */}
          <div className="glass-panel p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <MessageCircle size={120} />
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] rounded-xl flex items-center justify-center shadow-lg shadow-[#bc1888]/20">
                <MessageCircle size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Instagram DMs</h3>
                <span className="text-xs font-semibold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full mt-1 inline-block">Requer Webhook</span>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed relative z-10">
              Atenda Direct Messages e comentários automaticamente. Conecte sua conta Business ao Meta Graph API.
            </p>
            <div className="relative z-10">
              <label className="block text-sm font-medium text-slate-400 mb-2">Meta Webhook Token</label>
              <input 
                type="text" 
                placeholder="Sua chave secreta para validar o Webhook"
                value={settings.instagram_token} 
                onChange={(e) => handleChange('instagram_token', e.target.value)} 
                className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#25D366]/50 transition-colors" 
              />
            </div>
          </div>

          {/* GOOGLE CALENDAR */}
          <div className="glass-panel p-8 relative overflow-hidden group lg:col-span-2">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Calendar size={150} />
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-white/10">
                <Calendar size={24} className="text-blue-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Google Agenda (Function Calling)</h3>
                <span className="text-xs font-semibold text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 rounded-full mt-1 inline-block">Habilidade de IA</span>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed max-w-3xl relative z-10">
              Dê autonomia para a Inteligência Artificial agendar, consultar e cancelar reuniões. Quando ativado, o robô percebe quando o cliente solicita uma data e executa a ação sozinho na sua agenda corporativa.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Google API Key / Client Secret JSON</label>
                <textarea 
                  rows={4}
                  placeholder="Cole as credenciais do Google Cloud Console aqui..."
                  value={settings.google_calendar_key} 
                  onChange={(e) => handleChange('google_calendar_key', e.target.value)} 
                  className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#25D366]/50 transition-colors custom-scrollbar resize-none" 
                />
              </div>
              <div className="bg-[#020617]/50 rounded-xl border border-white/5 p-5 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-slate-300 font-bold mb-2">
                  <Info size={16} className="text-blue-400" /> Como funciona?
                </div>
                <ul className="text-sm text-slate-400 space-y-2 list-disc list-inside marker:text-blue-500">
                  <li>O agente passa a "escutar" datas e horários na conversa.</li>
                  <li>Ele verifica o conflito de agenda antes de confirmar.</li>
                  <li>O link do Google Meet é gerado e enviado ao cliente.</li>
                </ul>
              </div>
            </div>
          </div>
          
        </div>
      )}

      {/* FOOTER BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0F172A]/90 backdrop-blur-md border-t border-white/10 p-4 lg:pl-64 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-4">
          <div className="text-sm text-slate-400 font-medium">
            Módulos Independentes. O salvamento afeta apenas o agente selecionado.
          </div>
          <button 
            onClick={handleSave} 
            disabled={saving || loading} 
            className="bg-[#25D366] hover:bg-[#1DA851] text-slate-900 px-8 py-3 rounded-xl font-bold shadow-[0_0_15px_rgba(37,211,102,0.2)] flex items-center gap-2 transition-all disabled:opacity-70"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {saving ? 'Aplicando Integrações...' : 'Salvar Módulos'}
          </button>
        </div>
      </div>

    </div>
  );
}
