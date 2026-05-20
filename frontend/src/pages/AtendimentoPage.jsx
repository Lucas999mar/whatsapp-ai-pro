import React, { useState, useEffect, useRef } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import {
    Search, Filter, MoreVertical, Send, Mic, Paperclip,
    Smile, User, Phone, Mail, MapPin, Tag, Clock,
    CheckCircle2, XCircle, ArrowRightCircle, UserPlus,
    MessageSquare, Hash, BookOpen, AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AtendimentoPage() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [tab, setTab] = useState('aguardando'); // aguardando, atendendo, resolvidos
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [isNote, setIsNote] = useState(false);
    const scrollRef = useRef();

    useEffect(() => {
        fetchChats();
        const interval = setInterval(fetchChats, 5000);
        return () => clearInterval(interval);
    }, [tab]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [activeChat?.messages]);

    const fetchChats = async () => {
        try {
            const res = await api.get('/crm/tickets', { params: { status: tab } });
            setConversations(res.data.map(t => ({
                ...t,
                id: t.whatsapp_id,
                realId: t.id,
                name: t.contact_name || t.whatsapp_id.split('__')[1],
                photo: t.contact_photo,
                lastTime: t.updated_at,
                messages: [] // Vai buscar histórico ao selecionar
            })));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeChat) {
            fetchMessages(activeChat.id);
        }
    }, [activeChat?.id]);

    const fetchMessages = async (whatsappId) => {
        try {
            const res = await api.get('/conversations');
            const messages = res.data.filter(m => m.whatsapp_id === whatsappId);
            setActiveChat(prev => ({ ...prev, messages }));
        } catch (err) { }
    };

    const handleAccept = async (ticketId) => {
        try {
            await api.post(`/crm/tickets/${ticketId}/accept`);
            setTab('atendendo');
            fetchChats();
        } catch (err) { alert('Erro ao aceitar'); }
    };

    const handleClose = async (ticketId) => {
        if (!window.confirm('Encerrar este atendimento?')) return;
        try {
            await api.post(`/crm/tickets/${ticketId}/close`);
            setActiveChat(null);
            fetchChats();
        } catch (err) { alert('Erro ao encerrar'); }
    };

    const handleSendMessage = async () => {
        if (!message.trim() || !activeChat) return;
        try {
            if (activeChat.status === 'aguardando') await api.post(`/crm/tickets/${activeChat.realId}/accept`);

            await api.post('/whatsapp/broadcast', {
                agentId: activeChat.whatsapp_id.split('__')[2] || 'default',
                numbers: [activeChat.whatsapp_id.split('__')[1]],
                message: message
            });
            setMessage('');
            setTimeout(() => fetchMessages(activeChat.id), 1000);
        } catch (err) { }
    };

    return (
        <div className="flex h-[calc(100vh-6rem)] gap-4 animate-fade-in">
            {/* LEFT COLUMN: LIST */}
            <div className="w-80 flex flex-col bg-[#0F172A] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-black text-white">Mensagens</h2>
                        <div className="flex gap-2">
                            <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400"><Filter size={18} /></button>
                            <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400"><UserPlus size={18} /></button>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Pesquisar conversas..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-[#25D366] outline-none transition-all"
                        />
                    </div>
                </div>

                {/* TABS */}
                <div className="flex border-b border-white/5 px-2">
                    {['aguardando', 'atendendo', 'resolvidos'].map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-all relative ${tab === t ? 'text-[#25D366]' : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            {t}
                            {tab === t && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#25D366] rounded-t-full"></div>}
                        </button>
                    ))}
                </div>

                {/* CHAT LIST */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-600 p-8 text-center">
                            <MessageSquare size={40} className="mb-2 opacity-20" />
                            <p className="text-sm font-bold">Nenhuma conversa em {tab}</p>
                        </div>
                    ) : (
                        conversations.map(chat => (
                            <button
                                key={chat.id}
                                onClick={() => setActiveChat(chat)}
                                className={`w-full p-4 flex gap-3 hover:bg-white/5 transition-all text-left border-b border-white/5 ${activeChat?.id === chat.id ? 'bg-white/5 border-l-4 border-l-[#25D366]' : ''
                                    }`}
                            >
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                    {chat.photo ? <img src={chat.photo} className="w-full h-full object-cover" /> : <User size={24} className="text-slate-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="text-sm font-black text-white truncate">{chat.name}</h4>
                                        <span className="text-[10px] text-slate-500">{formatDistanceToNow(new Date(chat.lastTime), { locale: ptBR })}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 truncate">{chat.lastMessage}</p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* MIDDLE COLUMN: CHAT WINDOW */}
            <div className="flex-1 flex flex-col bg-[#0F172A] border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative">
                {activeChat ? (
                    <>
                        {/* CHAT HEADER */}
                        <div className="p-4 bg-[#1E293B]/50 border-b border-white/5 flex justify-between items-center z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden">
                                    {activeChat.photo ? <img src={activeChat.photo} className="w-full h-full object-cover" /> : <User size={20} className="text-slate-500" />}
                                </div>
                                <div>
                                    <h3 className="font-black text-white">{activeChat.name}</h3>
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                        <div className={`w-1.5 h-1.5 rounded-full ${activeChat.status === 'aguardando' ? 'bg-yellow-500' : 'bg-[#25D366]'}`}></div>
                                        <span className="uppercase tracking-widest font-black">{activeChat.status}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {activeChat.status === 'aguardando' ? (
                                    <button className="flex items-center gap-2 bg-[#25D366] text-black px-4 py-2 rounded-xl text-xs font-black hover:brightness-110 transition-all">
                                        <ArrowRightCircle size={16} /> ATENDER
                                    </button>
                                ) : (
                                    <>
                                        <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400" title="Transferir"><UserPlus size={18} /></button>
                                        <button className="flex items-center gap-2 bg-red-500/20 text-red-500 px-4 py-2 rounded-xl text-xs font-black hover:bg-red-500 hover:text-white transition-all">
                                            <CheckCircle2 size={16} /> ENCERRAR
                                        </button>
                                    </>
                                )}
                                <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400"><MoreVertical size={18} /></button>
                            </div>
                        </div>

                        {/* MESSAGES */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed"
                        >
                            {[...activeChat.messages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end animate-slide-up'}`}>
                                    <div className={`max-w-[75%] px-4 py-3 rounded-2xl shadow-lg relative ${msg.role === 'user'
                                        ? 'bg-[#1E293B] text-slate-200 border border-white/5 rounded-tl-none'
                                        : 'bg-[#25D366] text-slate-900 font-medium rounded-tr-none'
                                        }`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                        <span className={`text-[9px] block text-right mt-1 opacity-50 ${msg.role === 'user' ? 'text-slate-400' : 'text-slate-800'}`}>
                                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* INPUT AREA */}
                        <div className="p-4 bg-[#1E293B]/30 border-t border-white/5 space-y-3">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setIsNote(!isNote)}
                                        className={`flex items-center gap-2 text-[10px] font-black tracking-widest transition-all ${isNote ? 'text-yellow-500' : 'text-slate-500'}`}
                                    >
                                        <Hash size={14} /> NOTA INTERNA
                                    </button>
                                    <button className="flex items-center gap-2 text-slate-500 text-[10px] font-black tracking-widest hover:text-[#25D366]">
                                        <BookOpen size={14} /> RESPOSTAS RÁPIDAS
                                    </button>
                                </div>
                                <div className="flex gap-3">
                                    <button className="text-slate-500 hover:text-white"><Smile size={20} /></button>
                                    <button className="text-slate-500 hover:text-white"><Paperclip size={20} /></button>
                                </div>
                            </div>
                            <div className="flex items-end gap-3 bg-white/5 rounded-2xl p-2 border border-white/10 focus-within:border-[#25D366]/50 transition-all">
                                <textarea
                                    rows="1"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder={isNote ? "Digite uma nota interna amarela..." : "Digite sua mensagem..."}
                                    className="flex-1 bg-transparent border-none outline-none text-white text-sm py-2 px-3 resize-none max-h-32"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!message.trim()}
                                    className={`p-3 rounded-xl transition-all ${message.trim() ? 'bg-[#25D366] text-black scale-100 hover:rotate-12' : 'bg-white/5 text-slate-600 scale-90'
                                        }`}
                                >
                                    {message.trim() ? <Send size={20} /> : <Mic size={20} />}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-12 text-center bg-gradient-to-b from-transparent to-black/20">
                        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 animate-pulse">
                            <MessageSquare size={48} className="opacity-20" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2">Selecione uma conversa</h2>
                        <p className="max-w-xs text-sm leading-relaxed">Selecione um cliente ao lado para iniciar o atendimento ou visualizar o histórico.</p>
                    </div>
                )}
            </div>

            {/* RIGHT COLUMN: DETAILS */}
            <div className="w-80 flex flex-col bg-[#0F172A] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                {activeChat ? (
                    <div className="flex flex-col h-full">
                        <div className="p-6 text-center border-b border-white/5">
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 mx-auto mb-4 flex items-center justify-center overflow-hidden shadow-xl">
                                {activeChat.photo ? <img src={activeChat.photo} className="w-full h-full object-cover" /> : <User size={48} className="text-slate-500" />}
                            </div>
                            <h3 className="text-lg font-black text-white truncate">{activeChat.name}</h3>
                            <p className="text-xs text-slate-500 font-medium">Desde {new Date(activeChat.messages[0].created_at).toLocaleDateString('pt-BR')}</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {/* INFO SECTON */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Informações</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-slate-300">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500"><Phone size={14} /></div>
                                        <span className="font-medium">{activeChat.id.split('@')[0]}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-300">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500"><Mail size={14} /></div>
                                        <span className="text-slate-600 italic">Não informado</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-300">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500"><MapPin size={14} /></div>
                                        <span className="text-slate-600 italic">Não informado</span>
                                    </div>
                                </div>
                            </div>

                            {/* TAGS SECTION */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Etiquetas</h4>
                                    <button className="text-[10px] text-[#25D366] font-bold">+ ADICIONAR</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black rounded-lg border border-blue-500/20">NOVO LEAD</span>
                                    <span className="px-2 py-1 bg-purple-500/10 text-purple-400 text-[10px] font-black rounded-lg border border-purple-500/20">INTERESSADO</span>
                                </div>
                            </div>

                            {/* LOGS / TIMELINE */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Últimas Atividades</h4>
                                <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-white/5">
                                    <div className="flex gap-4 relative">
                                        <div className="w-6 h-6 rounded-full bg-[#0F172A] border-2 border-[#25D366] flex items-center justify-center z-10 flex-shrink-0">
                                            <Clock size={10} className="text-[#25D366]" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-300 font-bold">Iniciou conversa</p>
                                            <p className="text-[10px] text-slate-500">{formatDistanceToNow(new Date(activeChat.lastTime), { locale: ptBR, addSuffix: true })}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 relative">
                                        <div className="w-6 h-6 rounded-full bg-[#0F172A] border-2 border-slate-700 flex items-center justify-center z-10 flex-shrink-0">
                                            <AlertCircle size={10} className="text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-medium">Aguardando atendimento</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-black/20">
                            <button className="w-full py-3 bg-[#25D366]/10 text-[#25D366] text-xs font-black rounded-xl hover:bg-[#25D366] hover:text-black transition-all">
                                ABRIR NO CRM (KANBAN)
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-800 p-8 text-center">
                        <Tag size={40} className="mb-2 opacity-5" />
                        <p className="text-xs font-bold uppercase tracking-widest opacity-20">Detalhes do Contato</p>
                    </div>
                )}
            </div>
        </div>
    );
}
