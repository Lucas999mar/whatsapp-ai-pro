import React, { useState, useEffect, useRef } from 'react';
import api from '../api/api';
import { User, Bot, Clock, Sparkles, Database, MessageSquare, X, GripVertical, Edit2, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const KANBAN_COLUMNS = [
  { id: 'novos', title: 'Novo Lead', color: 'border-blue-500', bg: 'bg-blue-500/10' },
  { id: 'atendimento', title: 'Em Atendimento', color: 'border-yellow-500', bg: 'bg-yellow-500/10' },
  { id: 'qualificados', title: 'Qualificado', color: 'border-purple-500', bg: 'bg-purple-500/10' },
  { id: 'concluido', title: 'Concluído', color: 'border-[#25D366]', bg: 'bg-[#25D366]/10' },
];

function formatWhatsAppId(id) {
  // O id recebido aqui já é o número limpo ou com @s.whatsapp.net
  let number = String(id).split('@')[0];
  
  // Remove qualquer prefixo não numérico se houver
  number = number.replace(/\D/g, '');

  // Padrão Brasil (55 + DDD + Numero)
  if (number.length >= 10 && number.startsWith('55')) {
    const ddd = number.slice(2, 4);
    if (number.length === 13) { // Com o 9 extra
      return `+55 (${ddd}) ${number.slice(4, 9)}-${number.slice(9)}`;
    } else if (number.length === 12) { // Sem o 9 extra
      return `+55 (${ddd}) ${number.slice(4, 8)}-${number.slice(8)}`;
    }
  }
  
  // Fallback para outros formatos
  return number.length > 0 ? `+${number}` : number;
}

export default function Conversations() {
  const [conversations, setConversations] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('default');
  
  const [leadStatus, setLeadStatus] = useState(() => {
    const saved = localStorage.getItem('wa_lead_status');
    return saved ? JSON.parse(saved) : {};
  });
  const [customNames, setCustomNames] = useState(() => {
    const saved = localStorage.getItem('wa_custom_names');
    return saved ? JSON.parse(saved) : {};
  });
  const [activeChat, setActiveChat] = useState(null);
  
  // States para edição
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await api.get('/whatsapp/status');
        const agentList = res.data.agents || [];
        setAgents(agentList.length > 0 ? agentList : [{ id: 'default', name: 'Assistente Principal' }]);
        
        // Se estiver no 'default' mas tivermos agentes reais, seleciona o primeiro
        if (selectedAgent === 'default' && agentList.length > 0 && agentList[0].id !== 'default') {
          setSelectedAgent(agentList[0].id);
        }
      } catch (err) {
        console.error('Agents Error:', err);
      }
    };
    fetchAgents();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/conversations');
      const data = res.data;
      setConversations(data);

      const groups = {};
      data.forEach(msg => {
        const parts = msg.whatsapp_id.split('__');
        const msgAgentId = parts[2] || 'default';
        const msgPhone = parts[1] || parts[0]; // Fallback para compatibilidade
        
        if (msgAgentId !== selectedAgent) return; // Filtra por agente selecionado

        if (!groups[msg.whatsapp_id]) {
          groups[msg.whatsapp_id] = {
            id: msg.whatsapp_id,
            originalName: msg.user_name,
            formattedPhone: formatWhatsAppId(msgPhone),
            messages: [],
            lastDate: msg.created_at,
            lastMessage: msg.content
          };
        }
        groups[msg.whatsapp_id].messages.push(msg);
      });

      const leadsArray = Object.values(groups).map(lead => {
        // Applica o nome customizado se existir, senao usa o nome original, senao o telefone
        lead.name = customNames[lead.id] || lead.originalName || lead.formattedPhone;
        return lead;
      }).sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));
      
      setLeads(leadsArray);

      const newStatus = { ...leadStatus };
      let updatedStatus = false;
      leadsArray.forEach(lead => {
        if (!newStatus[lead.id]) {
          newStatus[lead.id] = 'novos';
          updatedStatus = true;
        }
      });
      if (updatedStatus) {
        setLeadStatus(newStatus);
        localStorage.setItem('wa_lead_status', JSON.stringify(newStatus));
      }

      // Update activeChat if it is open
      if (activeChat) {
        const updatedActive = leadsArray.find(l => l.id === activeChat.id);
        if (updatedActive) setActiveChat(updatedActive);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [customNames, selectedAgent]);

  const updateLeadStatus = (leadId, newStatus) => {
    const updated = { ...leadStatus, [leadId]: newStatus };
    setLeadStatus(updated);
    localStorage.setItem('wa_lead_status', JSON.stringify(updated));
  };

  const handleDragStart = (e, leadId) => {
    e.dataTransfer.setData('leadId', leadId);
  };

  const handleDrop = (e, columnId) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) {
      updateLeadStatus(leadId, columnId);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleSaveName = () => {
    if (!activeChat) return;
    const updated = { ...customNames, [activeChat.id]: editNameValue };
    setCustomNames(updated);
    localStorage.setItem('wa_custom_names', JSON.stringify(updated));
    setIsEditingName(false);
  };

  const startEditing = () => {
    setEditNameValue(activeChat.name);
    setIsEditingName(true);
  };

  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-4xl font-bold text-white tracking-tight">CRM / Conversas</h2>
          <p className="text-slate-400 mt-2 text-lg">Gerencie seus leads e atualize os perfis dos contatos.</p>
        </div>
        
        {/* AGENT FILTER */}
        <div className="flex items-center gap-3 bg-[#0F172A] px-4 py-3 rounded-xl border border-white/10 shadow-inner">
          <Bot size={18} className="text-[#25D366]" />
          <select 
            className="outline-none bg-transparent text-slate-200 font-medium cursor-pointer" 
            value={selectedAgent} 
            onChange={(e) => setSelectedAgent(e.target.value)}
          >
            {agents.map(a => (
              <option key={a.id} value={a.id} className="bg-slate-800">Agente: {a.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4 flex gap-6 snap-x">
        {loading && leads.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-slate-500">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin"></div>
              <p>Carregando CRM...</p>
            </div>
          </div>
        ) : (
          KANBAN_COLUMNS.map(col => {
            const colLeads = leads.filter(l => leadStatus[l.id] === col.id);
            
            return (
              <div 
                key={col.id} 
                className={`flex-none w-80 flex flex-col glass-panel border-t-4 ${col.color} snap-center`}
                onDrop={(e) => handleDrop(e, col.id)}
                onDragOver={handleDragOver}
              >
                <div className={`p-4 border-b border-white/5 flex justify-between items-center ${col.bg} rounded-t-xl`}>
                  <h3 className="font-bold text-white">{col.title}</h3>
                  <span className="bg-slate-800 text-slate-300 text-xs py-1 px-2.5 rounded-full font-semibold">
                    {colLeads.length}
                  </span>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {colLeads.length === 0 ? (
                    <div className="h-24 flex flex-col items-center justify-center text-slate-500 border border-dashed border-white/10 rounded-xl">
                      <p className="text-sm">Arraste leads para cá</p>
                    </div>
                  ) : (
                    colLeads.map(lead => (
                      <div 
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onClick={() => setActiveChat(lead)}
                        className="bg-[#1E293B] hover:bg-[#253247] p-4 rounded-xl border border-white/5 shadow-lg cursor-pointer transition-all hover:scale-[1.02] hover:border-white/10 group"
                      >
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <h4 className="font-bold text-white text-sm truncate flex-1">{lead.name}</h4>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const newName = prompt('Novo nome para o contato:', lead.name);
                                if (newName !== null) {
                                  const updated = { ...customNames, [lead.id]: newName };
                                  setCustomNames(updated);
                                  localStorage.setItem('wa_custom_names', JSON.stringify(updated));
                                }
                              }}
                              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-[#25D366] transition-colors"
                              title="Editar Nome"
                            >
                              <Edit2 size={12} />
                            </button>
                            <GripVertical size={14} className="text-slate-600 cursor-grab" />
                          </div>
                        </div>
                        <p className="text-[#25D366] text-[10px] font-bold mb-2 opacity-80">{lead.formattedPhone}</p>
                        <p className="text-slate-400 text-xs line-clamp-2 mb-3 leading-relaxed">
                          {lead.lastMessage}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-white/5 pt-2">
                          <span className="flex items-center gap-1">
                            <Clock size={10} /> 
                            {formatDistanceToNow(new Date(lead.lastDate), { locale: ptBR })}
                          </span>
                          <span>{lead.messages.length} msgs</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CHAT MODAL */}
      {activeChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-4xl h-[85vh] bg-[#0B0F19] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-white/10 bg-[#1E293B] flex justify-between items-center">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center shadow-lg">
                  <User size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        autoFocus
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                        className="bg-[#0F172A] border border-[#25D366]/50 text-white px-3 py-1.5 rounded-lg text-lg font-bold outline-none w-64"
                        placeholder="Nome do Contato"
                      />
                      <button onClick={handleSaveName} className="p-1.5 bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366] hover:text-slate-900 rounded-lg transition-colors">
                        <Check size={18} />
                      </button>
                      <button onClick={() => setIsEditingName(false)} className="p-1.5 bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors">
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-white text-xl">{activeChat.name}</h3>
                      <button onClick={startEditing} className="text-slate-500 hover:text-[#25D366] transition-colors" title="Editar Nome">
                        <Edit2 size={16} />
                      </button>
                    </div>
                  )}
                  <p className="text-sm text-slate-400 mt-0.5">{activeChat.formattedPhone}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setActiveChat(null);
                  setIsEditingName(false);
                }}
                className="p-2 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-slate-300 rounded-lg transition-colors ml-4"
              >
                <X size={24} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 relative bg-[#0B0F19]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#25D366]/5 blur-[100px] rounded-full pointer-events-none"></div>
              
              {[...activeChat.messages].reverse().map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-2xl p-5 shadow-lg relative ${
                    msg.role === 'user' 
                      ? 'bg-[#1E293B] border border-white/5 rounded-tl-sm' 
                      : 'bg-gradient-to-br from-[#128C7E]/90 to-[#075E54]/90 border border-[#25D366]/20 rounded-tr-sm text-white'
                  }`}>
                    <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                      {msg.role === 'user' ? (
                        <span className="text-xs font-semibold text-slate-400">Mensagem do Cliente</span>
                      ) : (
                        <span className="text-xs font-semibold text-green-200 flex items-center gap-1.5">
                          <Sparkles size={12} /> Assistente de IA
                        </span>
                      )}
                    </div>
                    
                    <p className={`text-base whitespace-pre-wrap leading-relaxed ${msg.role === 'user' ? 'text-slate-200' : 'text-white'}`}>
                      {msg.content}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                      <span className={`text-[11px] flex items-center gap-1 ${msg.role === 'user' ? 'text-slate-500' : 'text-green-200/70'}`}>
                        <Clock size={10} />
                        {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.role === 'assistant' && msg.knowledge_used && msg.knowledge_used.length > 0 && (
                        <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded text-green-100 flex items-center gap-1 border border-white/10">
                          <Database size={10} />
                          {msg.knowledge_used.length} refs
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

