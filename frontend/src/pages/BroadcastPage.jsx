import React, { useState, useEffect } from 'react';
import api from '../api/api';
import {
  Megaphone, Users, Clock, Send, AlertTriangle, CheckCircle2,
  Loader2, FileUp, Hash, PhoneCall, History, Sparkles, Plus,
  Settings, Play, Trash2, Volume2, Info, ChevronRight, X, FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function BroadcastPage() {
  // ── GENERAL STATES ──
  const [activeTab, setActiveTab] = useState('whatsapp'); // 'whatsapp' | 'voice'

  // ── WHATSAPP BROADCAST STATES ──
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [numbersText, setNumbersText] = useState('');
  const [message, setMessage] = useState('');
  const [delay, setDelay] = useState(10);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'idle' | 'sending' | 'finished'
  const [stats, setStats] = useState({ total: 0, sent: 0, errors: 0 });
  const [media, setMedia] = useState(null); // { url, type }
  const [uploading, setUploading] = useState(false);

  // ── AI VOICE CALLS STATES ──
  const [voiceCampaigns, setVoiceCampaigns] = useState([]);
  const [loadingVoice, setLoadingVoice] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  // Modals voice
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);

  // Form voice campaign
  const [voiceCampName, setVoiceCampName] = useState('');
  const [voiceScript, setVoiceScript] = useState('');
  const [voiceVoice, setVoiceVoice] = useState('female-pt-br');
  const [voiceNumbersText, setVoiceNumbersText] = useState('');

  // Config Telnyx Form
  const [telnyxApiKey, setTelnyxApiKey] = useState('');
  const [telnyxSipDomain, setTelnyxSipDomain] = useState('');
  const [telnyxFromNumber, setTelnyxFromNumber] = useState('');

  // ── LIFE CYCLE ──
  useEffect(() => {
    fetchAgents();
    fetchVoiceCampaigns();
    fetchTelnyxConfig();
  }, []);

  // Poll progress for active running campaigns
  useEffect(() => {
    let interval = null;
    const hasRunning = voiceCampaigns.some(c => c.status === 'running');
    if (hasRunning) {
      interval = setInterval(() => {
        fetchVoiceCampaigns();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [voiceCampaigns]);

  // ── HANDLERS: DATA & API ──
  const fetchAgents = async () => {
    try {
      const res = await api.get('/whatsapp/status');
      const connectedAgents = (res.data.agents || []).filter(a => a.status === 'connected');
      setAgents(connectedAgents);
      if (connectedAgents.length > 0) setSelectedAgent(connectedAgents[0].id);
    } catch (err) {
      console.error('Error fetching agents:', err);
    }
  };

  const fetchVoiceCampaigns = async () => {
    try {
      const res = await api.get('/voice');
      setVoiceCampaigns(res.data || []);
      // Auto-update selected campaign stats if open
      if (selectedCampaign) {
        const updated = (res.data || []).find(c => c.id === selectedCampaign.id);
        if (updated) setSelectedCampaign(updated);
      }
    } catch (err) {
      console.error('Error fetching voice campaigns:', err);
    }
  };

  const fetchTelnyxConfig = async () => {
    try {
      const res = await api.get('/voice/config');
      if (res.data) {
        setTelnyxApiKey(res.data.apiKey || '');
        setTelnyxSipDomain(res.data.sipDomain || '');
        setTelnyxFromNumber(res.data.fromNumber || '');
      }
    } catch (err) {
      console.error('Error fetching telnyx config:', err);
    }
  };

  const handleSaveTelnyxConfig = async () => {
    try {
      await api.post('/voice/config', {
        apiKey: telnyxApiKey,
        sipDomain: telnyxSipDomain,
        fromNumber: telnyxFromNumber
      });
      alert('Configurações do Telnyx salvas com sucesso!');
      setVoiceSettingsOpen(false);
    } catch (err) {
      alert('Erro ao salvar configurações: ' + err.message);
    }
  };

  const handleCreateVoiceCampaign = async (e) => {
    e.preventDefault();
    if (!voiceCampName.trim() || !voiceScript.trim() || !voiceNumbersText.trim()) {
      return alert('Por favor, preencha todos os campos.');
    }

    const numbers = voiceNumbersText.split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 5);

    if (numbers.length === 0) {
      return alert('Insira pelo menos um número de telefone válido.');
    }

    setLoadingVoice(true);
    try {
      const { data } = await api.post('/voice', {
        name: voiceCampName,
        script: voiceScript,
        voice: voiceVoice,
        numbers
      });
      setVoiceCampaigns(prev => [data, ...prev]);
      setVoiceModalOpen(false);

      // Reset form
      setVoiceCampName('');
      setVoiceScript('');
      setVoiceNumbersText('');
      alert('Campanha de Voz criada! Clique em "Iniciar" para disparar de forma inteligente.');
    } catch (err) {
      alert('Erro ao criar campanha: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingVoice(false);
    }
  };

  const handleStartVoiceCampaign = async (campaignId, e) => {
    e?.stopPropagation();
    try {
      await api.post(`/voice/${campaignId}/start`);
      // Toast/Alert amigável
      alert('Disparo de ligações iniciado em segundo plano!');
      fetchVoiceCampaigns();
    } catch (err) {
      alert('Erro ao iniciar ligações: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteVoiceCampaign = async (campaignId, e) => {
    e?.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir esta campanha de ligações?')) return;
    try {
      await api.delete(`/voice/${campaignId}`);
      setVoiceCampaigns(prev => prev.filter(c => c.id !== campaignId));
      if (selectedCampaign?.id === campaignId) setSelectedCampaign(null);
    } catch (err) {
      alert('Erro ao excluir campanha: ' + err.message);
    }
  };

  // ── WHATSAPP SPECIFIC UPLOAD & ACTIONS ──
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/upload', formData);
      const type = file.type.split('/')[0];
      setMedia({
        url: res.data.url,
        type: type === 'application' ? 'document' : type,
        fileName: res.data.fileName,
        mimetype: res.data.mimetype
      });
    } catch (err) {
      console.error('Upload error:', err);
      alert('Erro ao enviar arquivo: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleImportContacts = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();
    const targetSetter = activeTab === 'whatsapp' ? setNumbersText : setVoiceNumbersText;

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          const loadedNumbers = [];
          const seen = new Set();

          for (const cellAddress in worksheet) {
            if (/^[A-Z]+\d+$/.test(cellAddress)) {
              const cell = worksheet[cellAddress];
              if (cell && (cell.v !== undefined || cell.w !== undefined)) {
                const val = cell.w || String(cell.v);
                const cleaned = val.replace(/\D/g, '');

                if (cleaned.length >= 8 && cleaned.length <= 15) {
                  if (!seen.has(cleaned)) {
                    seen.add(cleaned);
                    loadedNumbers.push(cleaned);
                  }
                }
              }
            }
          }

          if (loadedNumbers.length === 0) {
            alert('Nenhum número de telefone válido foi encontrado nas colunas do Excel.');
            return;
          }

          targetSetter(prev => (prev ? prev + '\n' : '') + loadedNumbers.join('\n'));
        } catch (err) {
          console.error('Erro ao processar arquivo Excel:', err);
          alert('Erro ao processar o arquivo Excel.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        const loadedNumbers = [];
        const seen = new Set();

        lines.forEach(line => {
          const cells = line.includes(';') ? line.split(';') : line.split(',');
          cells.forEach(cell => {
            const cleaned = cell.trim().replace(/\D/g, '');
            if (cleaned.length >= 8 && cleaned.length <= 15) {
              if (!seen.has(cleaned)) {
                seen.add(cleaned);
                loadedNumbers.push(cleaned);
              }
            }
          });
        });

        if (loadedNumbers.length === 0) {
          alert('Nenhum telefone identificado na lista.');
          return;
        }

        targetSetter(prev => (prev ? prev + '\n' : '') + loadedNumbers.join('\n'));
      };
      reader.readAsText(file);
    }
  };

  const handleStartBroadcast = async () => {
    const numbers = numbersText.split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 5);

    if (numbers.length === 0) return alert('Insira pelo menos um número válido.');
    if (!message.trim() && !media) return alert('Insira uma mensagem ou anexe um arquivo.');
    if (!selectedAgent) return alert('Selecione um agente conectado.');

    if (!window.confirm(`Você está prestes a enviar mensagens para ${numbers.length} contatos.\n\nO processo rodará em background no servidor.\n\nDeseja continuar?`)) return;

    setLoading(true);
    setStatus('sending');
    setStats({ total: numbers.length, sent: 0, errors: 0 });

    try {
      const res = await api.post('/whatsapp/broadcast', {
        agentId: selectedAgent,
        numbers,
        message,
        delay,
        media
      });

      setStatus('finished');
      setStats(prev => ({ ...prev, total: res.data.total || numbers.length }));
    } catch (err) {
      alert('Erro ao iniciar disparo: ' + (err.response?.data?.error || err.message));
      setStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-20">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
            <Megaphone className="text-[#a855f7]" size={36} />
            Central de Contato em Massa
          </h2>
          <p className="text-slate-400 mt-2 text-lg">
            Envie campanhas por WhatsApp ou inicie ligações automáticas de Voz com IA.
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'voice' && (
            <button
              onClick={() => setVoiceSettingsOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 border border-white/10 transition-all font-semibold"
            >
              <Settings size={16} />
              Configurar Telnyx
            </button>
          )}
          <label className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-xl cursor-pointer border border-purple-500/20 transition-all font-semibold">
            <FileUp size={18} />
            Importar Excel/TXT
            <input type="file" accept=".txt,.csv,.xlsx,.xls" onChange={handleImportContacts} className="hidden" />
          </label>
        </div>
      </div>

      {/* ── NAVIGATION NAVIGATION TABS ── */}
      <div className="flex gap-2 p-1.5 bg-[#0F172A] border border-white/5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center gap-2.5 ${activeTab === 'whatsapp'
              ? 'bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 shadow-md shadow-[#25D366]/5'
              : 'text-slate-400 hover:text-white'
            }`}
        >
          <Send size={16} />
          💬 Disparo WhatsApp
        </button>
        <button
          onClick={() => setActiveTab('voice')}
          className={`px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center gap-2.5 ${activeTab === 'voice'
              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-md shadow-purple-500/5'
              : 'text-slate-400 hover:text-white'
            }`}
        >
          <PhoneCall size={16} />
          📞 Ligações de IA
        </button>
      </div>

      {/* ── TAB CONTENT: DISPARO WHATSAPP ── */}
      {activeTab === 'whatsapp' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* CONFIGURATION */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-8 space-y-6 border border-white/5">
              <div className="space-y-4">
                <label className="text-slate-300 font-semibold flex items-center gap-2">
                  <Users size={18} className="text-[#25D366]" />
                  Lista de Contatos WhatsApp
                </label>
                <textarea
                  className="w-full h-48 bg-[#0F172A] border border-white/10 rounded-xl p-4 text-slate-200 outline-none focus:border-[#25D366]/50 transition-all resize-none font-mono text-sm"
                  placeholder="Insira um número por linha (ex: 5511999999999)"
                  value={numbersText}
                  onChange={e => setNumbersText(e.target.value)}
                />
                <p className="text-xs text-slate-500 italic">Total identificado: {numbersText.split('\n').filter(n => n.trim().length > 5).length} números.</p>
              </div>

              <div className="space-y-4">
                <label className="text-slate-300 font-semibold flex items-center gap-2">
                  <Send size={18} className="text-[#25D366]" />
                  Legenda da Mensagem
                </label>
                <textarea
                  className="w-full h-32 bg-[#0F172A] border border-white/10 rounded-xl p-4 text-slate-200 outline-none focus:border-[#25D366]/50 transition-all resize-none"
                  placeholder="Digite o texto que será enviado (opcional se houver mídia)..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <label className="text-slate-300 font-semibold flex items-center gap-2">
                  <FileUp size={18} className="text-[#25D366]" />
                  Mídia do Disparo (Opcional)
                </label>

                {!media ? (
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-all">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FileUp className="w-8 h-8 text-slate-500 mb-2" />
                        <p className="text-sm text-slate-400">
                          {uploading ? 'Enviando...' : 'Clique para anexar Imagem, Vídeo ou Áudio'}
                        </p>
                      </div>
                      <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                    </label>
                  </div>
                ) : (
                  <div className="relative p-4 bg-white/5 rounded-xl border border-[#25D366]/30 flex items-center gap-4">
                    <div className="w-16 h-16 bg-[#0F172A] rounded-lg flex items-center justify-center text-[#25D366]">
                      <FileUp size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white font-bold uppercase tracking-wider">{media.type}</p>
                      <p className="text-xs text-slate-400 truncate max-w-xs">{media.url}</p>
                    </div>
                    <button
                      onClick={() => setMedia(null)}
                      className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SETTINGS & ACTION */}
          <div className="space-y-6">
            <div className="glass-panel p-8 space-y-6 border border-white/5">
              <div className="space-y-4">
                <label className="text-slate-300 font-semibold block text-sm">Agente Emissor</label>
                <select
                  className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-white outline-none"
                  value={selectedAgent}
                  onChange={e => setSelectedAgent(e.target.value)}
                >
                  {agents.length === 0 && <option>Nenhum agente online</option>}
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                <label className="text-slate-300 font-semibold block text-sm flex justify-between">
                  Intervalo Médio <span>{delay}s</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={delay}
                  onChange={e => setDelay(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#25D366]"
                />
                <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <AlertTriangle size={14} className="text-yellow-500 mt-0.5" />
                  <p className="text-[10px] text-yellow-200/70 leading-tight">
                    Intervalos maiores reduzem drasticamente o risco de banimento pelo WhatsApp. Recomendamos pelo menos 15-20s.
                  </p>
                </div>
              </div>

              <button
                onClick={handleStartBroadcast}
                disabled={loading || agents.length === 0}
                className="w-full bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-50 text-slate-900 font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-[#25D366]/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                {loading ? 'Iniciando Campanha...' : 'Iniciar Disparo'}
              </button>
            </div>

            <div className="glass-panel p-6 bg-blue-500/5 border-blue-500/20">
              <h4 className="text-white font-bold flex items-center gap-2 mb-2">
                <Hash size={16} className="text-blue-400" />
                Dicas de Disparo
              </h4>
              <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
                <li>Evite links externos na primeira mensagem.</li>
                <li>Use nomes variados se possível.</li>
                <li>O processo roda em background no servidor.</li>
                <li>Lotes de 50 contatos com pausa automática de 30s.</li>
              </ul>
            </div>

            {status === 'finished' && (
              <div className="glass-panel p-6 bg-[#25D366]/5 border-[#25D366]/20 animate-fade-in">
                <h4 className="text-white font-bold flex items-center gap-2 mb-3">
                  <CheckCircle2 size={18} className="text-[#25D366]" />
                  Campanha em Andamento
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total de contatos:</span>
                    <span className="text-white font-bold">{stats.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Estimativa:</span>
                    <span className="text-white font-bold">~{Math.ceil((stats.total * (delay + 3)) / 60)} min</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-[#25D366] font-bold flex items-center gap-1">
                      <span className="w-2 h-2 bg-[#25D366] rounded-full animate-pulse"></span>
                      Enviando no servidor
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-3 italic">
                  O envio continua mesmo se você fechar esta página. Acompanhe os logs do servidor para detalhes.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: AI VOICE LIGAÇÕES ── */}
      {activeTab === 'voice' && (
        <div className="space-y-6">

          {/* TOP CONTROLS */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <PhoneCall className="text-purple-400 animate-pulse" size={22} />
              Campanhas de Ligação Telefônica por IA
            </h3>
            <button
              onClick={() => setVoiceModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-purple-500 hover:bg-purple-600 rounded-xl text-white font-bold shadow-lg shadow-purple-500/25 transition-all"
            >
              <Plus size={18} />
              Criar Nova Campanha de Voz
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* CAMPAIGN LIST */}
            <div className="lg:col-span-1 space-y-4">
              {voiceCampaigns.length === 0 ? (
                <div className="glass-panel p-8 text-center border-purple-500/10">
                  <Volume2 size={36} className="text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-sm">Nenhuma campanha de voz cadastrada.</p>
                  <button
                    onClick={() => setVoiceModalOpen(true)}
                    className="mt-4 text-xs font-bold text-purple-400 hover:underline"
                  >
                    Criar a primeira agora →
                  </button>
                </div>
              ) : (
                voiceCampaigns.map(camp => (
                  <div
                    key={camp.id}
                    onClick={() => setSelectedCampaign(camp)}
                    className={`glass-panel p-5 cursor-pointer border transition-all relative overflow-hidden group ${selectedCampaign?.id === camp.id
                        ? 'border-purple-500/50 bg-purple-500/5 shadow-md shadow-purple-500/5'
                        : 'border-white/5 hover:border-purple-500/25 hover:bg-white/5'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-white text-base group-hover:text-purple-300 transition-colors">
                          {camp.name}
                        </h4>
                        <span className="text-[10px] text-slate-500">
                          {new Date(camp.created_at).toLocaleDateString()} às {new Date(camp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {camp.status === 'pending' && (
                          <button
                            onClick={(e) => handleStartVoiceCampaign(camp.id, e)}
                            className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all"
                            title="Iniciar Ligações"
                          >
                            <Play size={14} />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteVoiceCampaign(camp.id, e)}
                          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all"
                          title="Excluir Campanha"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 mb-3 bg-[#0F172A]/50 p-2 rounded-lg italic">
                      "{camp.script}"
                    </p>

                    <div className="flex justify-between items-center text-xs mt-3 pt-3 border-t border-white/5">
                      <span className={`px-2 py-0.5 rounded-full font-bold scale-90 ${camp.status === 'finished' ? 'bg-green-500/10 text-green-400' :
                          camp.status === 'running' ? 'bg-blue-500/10 text-blue-400 animate-pulse' :
                            'bg-slate-500/10 text-slate-400'
                        }`}>
                        {camp.status === 'finished' ? 'Finalizada' :
                          camp.status === 'running' ? 'Executando' : 'Aguardando'}
                      </span>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400">
                          👥 <strong>{camp.stats?.completed || 0}</strong>/{camp.stats?.total || 0}
                        </span>
                        <span className="text-[11px] text-green-400">
                          🎯 <strong>{camp.stats?.interested || 0}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* DETAILS & CALL LOGS */}
            <div className="lg:col-span-2 space-y-6">
              {selectedCampaign ? (
                <div className="glass-panel p-8 space-y-6 border-white/10">
                  <div className="flex justify-between items-start border-b border-white/5 pb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-white">{selectedCampaign.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">ID da Campanha: {selectedCampaign.id}</p>
                    </div>
                    {selectedCampaign.status === 'pending' && (
                      <button
                        onClick={() => handleStartVoiceCampaign(selectedCampaign.id)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 rounded-lg text-slate-900 font-bold transition-all shadow-md"
                      >
                        <Play size={16} />
                        Disparar Agora
                      </button>
                    )}
                  </div>

                  {/* STATS BOARD */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
                      <span className="text-2xl font-black text-white block">
                        {selectedCampaign.stats?.total || 0}
                      </span>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contatos</span>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/10 rounded-xl p-4 text-center">
                      <span className="text-2xl font-black text-green-400 block">
                        {selectedCampaign.stats?.interested || 0}
                      </span>
                      <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Interessados 🎯</span>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/5 rounded-xl p-4 text-center">
                      <span className="text-2xl font-black text-yellow-500 block">
                        {selectedCampaign.stats?.no_answer || 0}
                      </span>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Caixa Postal</span>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/5 rounded-xl p-4 text-center">
                      <span className="text-2xl font-black text-purple-400 block">
                        {Math.round(((selectedCampaign.stats?.interested || 0) / (selectedCampaign.stats?.completed || 1)) * 100)}%
                      </span>
                      <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Aproveitamento</span>
                    </div>
                  </div>

                  {/* PROMPT SCRIPT BOX */}
                  <div className="bg-purple-700/5 border border-purple-500/10 rounded-xl p-4 space-y-2">
                    <h5 className="text-[11px] font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={12} />
                      Script e Prompt Conversacional da IA
                    </h5>
                    <p className="text-sm text-slate-300 italic leading-relaxed">
                      "{selectedCampaign.script}"
                    </p>
                  </div>

                  {/* CALLS HISTORY TABLE */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                      <History size={16} />
                      Histórico e Transcrições das Ligações
                    </h4>

                    <div className="overflow-x-auto max-h-96 border border-white/5 rounded-xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/5 text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-white/5">
                            <th className="p-4">Telefone</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Retorno IA</th>
                            <th className="p-4">Duração</th>
                            <th className="p-4">WhatsApp</th>
                            <th className="p-4">Conversa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {(selectedCampaign.calls || []).length === 0 ? (
                            <tr>
                              <td colSpan="6" className="p-8 text-center text-xs text-slate-500 italic">
                                Nenhuma ligação registrada para esta campanha ainda.
                              </td>
                            </tr>
                          ) : (
                            (selectedCampaign.calls || []).map(call => (
                              <tr key={call.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 text-xs font-mono text-slate-200">
                                  {call.phone_number}
                                </td>
                                <td className="p-4 text-xs">
                                  <span className={`px-2 py-0.5 rounded-full block text-center font-bold text-[10px] uppercase w-fit ${call.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                                      call.status === 'calling' ? 'bg-blue-500/10 text-blue-400 animate-pulse' :
                                        call.status === 'no_answer' ? 'bg-yellow-500/10 text-yellow-500' :
                                          'bg-red-500/10 text-red-500'
                                    }`}>
                                    {call.status}
                                  </span>
                                </td>
                                <td className="p-4 text-xs">
                                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${call.outcome === 'interested' ? 'bg-green-500/20 text-green-300 border border-green-500/20' :
                                      call.outcome === 'not_interested' ? 'bg-slate-500/20 text-slate-400' :
                                        'bg-[#0F172A] text-slate-500'
                                    }`}>
                                    {call.outcome === 'interested' ? 'Interessado 🎯' :
                                      call.outcome === 'not_interested' ? 'Recusou' : 'Nenhum'}
                                  </span>
                                </td>
                                <td className="p-4 text-xs font-mono text-slate-400">
                                  {call.duration_seconds}s
                                </td>
                                <td className="p-4 text-xs">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${call.whatsapp_followup_sent ? 'bg-[#25D366]/20 text-[#25D366]' : 'bg-slate-800 text-slate-500'
                                    }`}>
                                    {call.whatsapp_followup_sent ? 'Enviado' : 'Sem envio'}
                                  </span>
                                </td>
                                <td className="p-4 text-xs">
                                  {call.transcription ? (
                                    <button
                                      onClick={() => alert(`DURAÇÃO: ${call.duration_seconds}s\n\nTRANSCRIÇÃO:\n${call.transcription}`)}
                                      className="text-purple-400 hover:text-purple-300 font-bold hover:underline flex items-center gap-1"
                                    >
                                      <FileText size={12} />
                                      Ver Transcrição
                                    </button>
                                  ) : (
                                    <span className="text-slate-600">-</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-panel p-12 text-center border-white/5 h-full flex flex-col justify-center items-center">
                  <PhoneCall size={48} className="text-slate-600 mb-4 animate-bounce" />
                  <h4 className="text-white font-bold text-lg">Selecione uma Campanha</h4>
                  <p className="text-slate-400 text-sm max-w-sm mt-2">
                    Clique em alguma campanha de voz ao lado esquerdo para monitorar o andamento, verificar estatísticas e ler transcrições em tempo real.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL: NOVA CAMPANHA DE VOZ ── */}
      {voiceModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-xl border-purple-500/20 overflow-hidden animate-scale-in">
            <div className="flex justify-between items-center p-6 border-b border-white/5 bg-purple-500/5">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="text-purple-400" size={20} />
                Nova Campanha de Voz
              </h3>
              <button
                onClick={() => setVoiceModalOpen(false)}
                className="p-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateVoiceCampaign} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">Nome do Campanha</label>
                <input
                  type="text"
                  value={voiceCampName}
                  onChange={e => setVoiceCampName(e.target.value)}
                  className="w-full bg-[#0F172A] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500/50 transition-colors"
                  placeholder="Ex: Campanha Retenção Pro"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">Voz da IA</label>
                  <select
                    value={voiceVoice}
                    onChange={e => setVoiceVoice(e.target.value)}
                    className="w-full bg-[#0F172A] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500/50"
                  >
                    <option value="female-pt-br">Feminina (Francisca-BR - Natural)</option>
                    <option value="male-pt-br">Masculino (Antonio-BR - Comercial)</option>
                    <option value="female-en-us">Feminina Comercial (US - English)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block flex justify-between">
                    Lista de Telefones
                  </label>
                  <textarea
                    value={voiceNumbersText}
                    onChange={e => setVoiceNumbersText(e.target.value)}
                    className="w-full h-12 bg-[#0F172A] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500/50 resize-none text-xs font-mono"
                    placeholder="Um por linha. Ex: 5511999999999"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider block flex justify-between">
                  Diretrizes & Script da IA
                  <span className="normal-case text-purple-400 font-semibold flex items-center gap-1 text-[10px]">
                    <Info size={10} /> Consome a base de conhecimento
                  </span>
                </label>
                <textarea
                  value={voiceScript}
                  onChange={e => setVoiceScript(e.target.value)}
                  className="w-full h-28 bg-[#0F172A] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500/50 resize-none text-sm leading-relaxed"
                  placeholder="Instrua a IA sobre a persona, o que falar e como deve reagir se o cliente estiver interessado. Ex: 'Se apresente como Julia. Explique a oferta de verão. Se interessar, avise que vai enviar o cupom via WhatsApp.'"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setVoiceModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingVoice}
                  className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold flex items-center gap-2 transition-all text-sm"
                >
                  {loadingVoice ? <Loader2 className="animate-spin" size={16} /> : null}
                  {loadingVoice ? 'Salvando...' : 'Salvar Campanha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIGURAÇÃO TELNYX ── */}
      {voiceSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md border-white/10 overflow-hidden animate-scale-in">
            <div className="flex justify-between items-center p-6 border-b border-white/5 bg-slate-900">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="text-slate-400" size={18} />
                Credenciais Telefonia VoIP
              </h3>
              <button
                onClick={() => setVoiceSettingsOpen(false)}
                className="p-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3 text-xs text-blue-200/90 leading-tight">
                <Info size={24} className="text-blue-400 shrink-0" />
                <div>
                  <h6 className="font-bold mb-1 text-white text-xs">Por que Telnyx?</h6>
                  A Telnyx fornece o serviço de terminação de chamadas SIP (VoIP) de baixo custo (~R$0,02/min de saída). As chamadas de voz Pipecat se conectam através dela para ligar para números reais.
                </div>
              </div>

              <div className="space-y-4 text-xs text-slate-400 leading-normal bg-purple-500/5 border border-purple-500/10 p-4 rounded-xl">
                💡 <strong>Pronto para uso:</strong> Já incluímos o **simulador integrado** da IA conversacional. Você pode visualizar o fluxo imediatamente. Após configurar as credenciais reais abaixo, a ponte com o SIP físico é ativada.
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">Telnyx API Key</label>
                  <input
                    type="password"
                    value={telnyxApiKey}
                    onChange={e => setTelnyxApiKey(e.target.value)}
                    className="w-full bg-[#0F172A] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500/50 transition-colors text-sm"
                    placeholder="KEY_telnyx_..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">Domínio SIP Telnyx</label>
                  <input
                    type="text"
                    value={telnyxSipDomain}
                    onChange={e => setTelnyxSipDomain(e.target.value)}
                    className="w-full bg-[#0F172A] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500/50 transition-colors text-sm"
                    placeholder="sip.telnyx.com ou o domínio do connection"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">Número Originador (From)</label>
                  <input
                    type="text"
                    value={telnyxFromNumber}
                    onChange={e => setTelnyxFromNumber(e.target.value)}
                    className="w-full bg-[#0F172A] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500/50 transition-colors text-sm"
                    placeholder="+5511999999999"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                <button
                  onClick={() => setVoiceSettingsOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-all text-sm"
                >
                  Fechar
                </button>
                <button
                  onClick={handleSaveTelnyxConfig}
                  className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-slate-900 font-bold transition-all text-sm"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
