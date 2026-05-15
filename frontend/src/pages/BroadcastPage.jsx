import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { Megaphone, Users, Clock, Send, AlertTriangle, CheckCircle2, Loader2, FileUp, Hash } from 'lucide-react';

export default function BroadcastPage() {
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

  useEffect(() => {
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
    fetchAgents();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/upload', formData);
      const type = file.type.split('/')[0];
      setMedia({ url: res.data.url, type: type === 'application' ? 'document' : type });
    } catch (err) {
      alert('Erro ao enviar arquivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleImportContacts = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 5);
      setNumbersText(prev => (prev ? prev + '\n' : '') + lines.join('\n'));
    };
    reader.readAsText(file);
  };

  const handleStartBroadcast = async () => {
    const numbers = numbersText.split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 5);

    if (numbers.length === 0) return alert('Insira pelo menos um número válido.');
    if (!message.trim() && !media) return alert('Insira uma mensagem ou anexe um arquivo.');
    if (!selectedAgent) return alert('Selecione um agente conectado.');

    if (!window.confirm(`Você está prestes a enviar mensagens para ${numbers.length} contatos. Deseja continuar?`)) return;

    setLoading(true);
    setStatus('sending');
    setStats({ total: numbers.length, sent: 0, errors: 0 });

    try {
      await api.post('/whatsapp/broadcast', {
        agentId: selectedAgent,
        numbers,
        message,
        delay,
        media
      });
      
      setStatus('finished');
      alert('O disparo em massa foi iniciado no servidor.');
    } catch (err) {
      alert('Erro ao iniciar disparo: ' + (err.response?.data?.error || err.message));
      setStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
            <Megaphone className="text-[#25D366]" size={36} />
            Disparo em Massa
          </h2>
          <p className="text-slate-400 mt-2 text-lg">Envie campanhas para múltiplos contatos com intervalos de segurança.</p>
        </div>
        
        <label className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer text-slate-300 border border-white/10 transition-all font-semibold">
          <FileUp size={18} />
          Importar Contatos
          <input type="file" accept=".txt,.csv" onChange={handleImportContacts} className="hidden" />
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CONFIGURATION */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-8 space-y-6">
            <div className="space-y-4">
              <label className="text-slate-300 font-semibold flex items-center gap-2">
                <Users size={18} className="text-[#25D366]" />
                Lista de Contatos
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
          <div className="glass-panel p-8 space-y-6">
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
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
