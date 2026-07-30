import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import {
    Brain, Play, RefreshCw, Clock, CheckCircle2, XCircle, AlertTriangle,
    Mail, Calendar, MessageSquare, Search, Database, ListTodo, ChevronRight, HelpCircle,
    Upload, FileText, Trash2, Plus, MessageCircle, QrCode, Wifi, WifiOff,
    Wrench, BookOpen, Send, X, Eye, BarChart3, FileSpreadsheet, UserCheck,
    Zap, Bot, Shield, Sparkles, Cpu
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function AgentDashboard() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('console'); // console, memory, channels, tools
    const [tasks, setTasks] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [prompt, setPrompt] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const socketRef = useRef(null);

    // Memory state
    const [knowledgeItems, setKnowledgeItems] = useState([]);
    const [loadingKnowledge, setLoadingKnowledge] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [newNote, setNewNote] = useState({ title: '', content: '' });
    const [showAddNote, setShowAddNote] = useState(false);

    // Channels state
    const [channels, setChannels] = useState({ whatsapp: [], telegram: { connected: false } });
    const [loadingChannels, setLoadingChannels] = useState(false);
    const [telegramToken, setTelegramToken] = useState('');
    const [showTelegramForm, setShowTelegramForm] = useState(false);

    // Tools state
    const [tools, setTools] = useState([]);
    const [loadingTools, setLoadingTools] = useState(false);

    // ════════════════════════════════════
    //  TASKS (Console)
    // ════════════════════════════════════

    const fetchTasks = async () => {
        try {
            const res = await api.get('/agent/tasks');
            setTasks(res.data || []);
            if (selectedTask) {
                const updatedSelected = (res.data || []).find(t => t.id === selectedTask.id);
                if (updatedSelected) setSelectedTask(updatedSelected);
            }
        } catch (err) {
            console.error('Erro ao buscar histórico de tarefas:', err);
        } finally {
            setLoadingTasks(false);
        }
    };

    useEffect(() => {
        fetchTasks();
        const interval = setInterval(fetchTasks, 15000);

        const socket = io(API_BASE);
        socketRef.current = socket;
        const tenantId = user?.tenant_id || user?.id || 'default';

        socket.on(`agent:step:${tenantId}`, (data) => {
            setTasks(prev => prev.map(t => {
                if (t.id === data.taskId) {
                    const stepsCopy = [...(t.steps || [])];
                    if (!stepsCopy.some(s => s.step === data.step.step)) stepsCopy.push(data.step);
                    return { ...t, status: 'running', steps: stepsCopy };
                }
                return t;
            }));
            setSelectedTask(prev => {
                if (prev && prev.id === data.taskId) {
                    const stepsCopy = [...(prev.steps || [])];
                    if (!stepsCopy.some(s => s.step === data.step.step)) stepsCopy.push(data.step);
                    return { ...prev, status: 'running', steps: stepsCopy };
                }
                return prev;
            });
        });

        socket.on(`agent:complete:${tenantId}`, (data) => {
            setTasks(prev => prev.map(t => {
                if (t.id === data.taskId) return { ...t, status: data.status, result: data.result, steps: data.steps, completedAt: new Date().toISOString() };
                return t;
            }));
            setSelectedTask(prev => {
                if (prev && prev.id === data.taskId) return { ...prev, status: data.status, result: data.result, steps: data.steps, completedAt: new Date().toISOString() };
                return prev;
            });
        });

        socket.on(`agent:error:${tenantId}`, (data) => {
            setTasks(prev => prev.map(t => {
                if (t.id === data.taskId) return { ...t, status: 'error', error: data.error, completedAt: new Date().toISOString() };
                return t;
            }));
            setSelectedTask(prev => {
                if (prev && prev.id === data.taskId) return { ...prev, status: 'error', error: data.error, completedAt: new Date().toISOString() };
                return prev;
            });
        });

        return () => {
            clearInterval(interval);
            socket.disconnect();
        };
    }, [user, selectedTask?.id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!prompt.trim()) return;
        setSubmitting(true);
        try {
            const res = await api.post('/agent/run', { prompt });
            const newTaskId = res.data.taskId;
            const newPlaceholder = { id: newTaskId, status: 'running', prompt, steps: [], startedAt: new Date().toISOString() };
            setTasks(prev => [newPlaceholder, ...prev]);
            setSelectedTask(newPlaceholder);
            setPrompt('');
        } catch (err) {
            alert('Erro ao disparar tarefa: ' + (err.response?.data?.error || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    // ════════════════════════════════════
    //  KNOWLEDGE BASE (Memória)
    // ════════════════════════════════════

    const fetchKnowledge = useCallback(async () => {
        setLoadingKnowledge(true);
        try {
            const res = await api.get('/agent/knowledge');
            setKnowledgeItems(res.data || []);
        } catch (err) {
            console.error('Erro ao buscar memória:', err);
        } finally {
            setLoadingKnowledge(false);
        }
    }, []);

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingFile(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', file.name);
            await api.post('/agent/knowledge/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            await fetchKnowledge();
        } catch (err) {
            alert('Erro ao fazer upload: ' + (err.response?.data?.error || err.message));
        } finally {
            setUploadingFile(false);
            e.target.value = '';
        }
    };

    const handleAddNote = async () => {
        if (!newNote.title.trim() || !newNote.content.trim()) return;
        try {
            await api.post('/agent/knowledge/text', newNote);
            setNewNote({ title: '', content: '' });
            setShowAddNote(false);
            await fetchKnowledge();
        } catch (err) {
            alert('Erro ao adicionar nota: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDeleteKnowledge = async (id) => {
        if (!confirm('Tem certeza que deseja remover este item da memória?')) return;
        try {
            await api.delete(`/agent/knowledge/${id}`);
            setKnowledgeItems(prev => prev.filter(k => k.id !== id));
        } catch (err) {
            alert('Erro ao remover: ' + (err.response?.data?.error || err.message));
        }
    };

    // ════════════════════════════════════
    //  CHANNELS
    // ════════════════════════════════════

    const fetchChannels = useCallback(async () => {
        setLoadingChannels(true);
        try {
            const res = await api.get('/agent/channels');
            setChannels(res.data || { whatsapp: [], telegram: { connected: false } });
        } catch (err) {
            console.error('Erro ao buscar canais:', err);
        } finally {
            setLoadingChannels(false);
        }
    }, []);

    const handleRestartWhatsApp = async (agentId) => {
        try {
            await api.post('/agent/channels/whatsapp/restart', { agentId });
            setTimeout(fetchChannels, 3000);
        } catch (err) {
            alert('Erro ao reiniciar WhatsApp: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleConnectTelegram = async (agentId) => {
        if (!telegramToken.trim()) return;
        try {
            await api.post('/agent/channels/telegram/connect', { agentId, token: telegramToken });
            setTelegramToken('');
            setShowTelegramForm(false);
            await fetchChannels();
        } catch (err) {
            alert('Erro ao conectar Telegram: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDisconnectTelegram = async (agentId) => {
        try {
            await api.post('/agent/channels/telegram/disconnect', { agentId });
            await fetchChannels();
        } catch (err) {
            alert('Erro ao desconectar Telegram: ' + (err.response?.data?.error || err.message));
        }
    };

    // ════════════════════════════════════
    //  TOOLS
    // ════════════════════════════════════

    const fetchTools = useCallback(async () => {
        setLoadingTools(true);
        try {
            const res = await api.get('/agent/tools');
            setTools(res.data || []);
        } catch (err) {
            console.error('Erro ao buscar ferramentas:', err);
        } finally {
            setLoadingTools(false);
        }
    }, []);

    // Load data when switching tabs
    useEffect(() => {
        if (activeTab === 'memory') fetchKnowledge();
        if (activeTab === 'channels') {
            fetchChannels();
            const interval = setInterval(fetchChannels, 4000);
            return () => clearInterval(interval);
        }
        if (activeTab === 'tools') fetchTools();
    }, [activeTab, fetchChannels, fetchKnowledge, fetchTools]);

    // ════════════════════════════════════
    //  TOOL ICONS HELPER
    // ════════════════════════════════════

    const getToolIcon = (toolName) => {
        if (!toolName) return <Brain size={18} className="text-purple-400" />;
        if (toolName.includes('gmail')) return <Mail size={18} className="text-red-400" />;
        if (toolName.includes('calendar')) return <Calendar size={18} className="text-blue-400" />;
        if (toolName.includes('whatsapp')) return <MessageSquare size={18} className="text-green-400" />;
        if (toolName.includes('web_search')) return <Search size={18} className="text-yellow-400" />;
        if (toolName.includes('knowledge') || toolName.includes('add_knowledge')) return <Database size={18} className="text-[#25D366]" />;
        if (toolName.includes('contract')) return <FileSpreadsheet size={18} className="text-blue-300" />;
        if (toolName.includes('crm')) return <UserCheck size={18} className="text-pink-400" />;
        if (toolName.includes('agenda')) return <Calendar size={18} className="text-cyan-400" />;
        if (toolName.includes('service_order')) return <Wrench size={18} className="text-orange-400" />;
        if (toolName.includes('conversation')) return <MessageCircle size={18} className="text-teal-400" />;
        if (toolName.includes('stats')) return <BarChart3 size={18} className="text-violet-400" />;
        if (toolName.includes('system_')) return <Cpu size={18} className="text-emerald-400" />;
        return <ListTodo size={18} className="text-indigo-400" />;
    };

    const getToolCategoryColor = (name) => {
        if (name.startsWith('system_')) return 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20';
        if (name.includes('gmail')) return 'from-red-500/20 to-red-500/5 border-red-500/20';
        if (name.includes('calendar')) return 'from-blue-500/20 to-blue-500/5 border-blue-500/20';
        if (name.includes('whatsapp')) return 'from-green-500/20 to-green-500/5 border-green-500/20';
        if (name.includes('web')) return 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/20';
        if (name.includes('knowledge')) return 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20';
        return 'from-indigo-500/20 to-indigo-500/5 border-indigo-500/20';
    };

    // ════════════════════════════════════
    //  TABS CONFIG
    // ════════════════════════════════════

    const tabs = [
        { id: 'console', label: 'Console', icon: <Brain size={16} /> },
        { id: 'memory', label: 'Memória', icon: <BookOpen size={16} /> },
        { id: 'channels', label: 'Canais', icon: <MessageCircle size={16} /> },
        { id: 'tools', label: 'Ferramentas', icon: <Wrench size={16} /> },
    ];

    // ════════════════════════════════════
    //  RENDER
    // ════════════════════════════════════

    return (
        <div className="space-y-6 animate-fade-in min-h-[calc(100vh-6rem)] flex flex-col focus:outline-none text-white">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold flex items-center gap-3 tracking-tight">
                        <div className="p-3 bg-gradient-to-br from-[#25D366] to-[#0F172A] rounded-2xl shadow-xl shadow-[#25D366]/10 relative">
                            <Brain className="text-[#25D366] animate-pulse" size={32} />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#25D366] rounded-full animate-ping" />
                        </div>
                        Agente Autônomo
                    </h1>
                    <p className="text-slate-400 mt-2 text-md">
                        Motor inteligente com acesso ao sistema, base de conhecimento e canais de comunicação.
                    </p>
                </div>
                <div className="flex gap-2 items-center">
                    <div className="flex items-center gap-1 bg-[#25D366]/10 text-[#25D366] px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <Shield size={12} /> Dados Isolados
                    </div>
                    <button
                        onClick={fetchTasks}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 transition-all flex items-center gap-2 border border-white/10"
                    >
                        <RefreshCw size={18} className={loadingTasks ? 'animate-spin' : ''} />
                        <span className="font-semibold text-sm hidden md:inline">Atualizar</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-[#1E293B]/80 p-1 rounded-2xl border border-white/5">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === tab.id
                            ? 'bg-[#25D366]/15 text-[#25D366] shadow-lg shadow-[#25D366]/5'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══ TAB: CONSOLE ═══ */}
            {activeTab === 'console' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
                    {/* Left Panel */}
                    <div className="lg:col-span-1 space-y-6 flex flex-col min-h-0 lg:h-[calc(100vh-13rem)]">
                        <div className="bg-[#1E293B] border border-white/5 p-6 rounded-[32px] shadow-xl shrink-0">
                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                                <Play size={18} className="text-[#25D366]" /> Nova Instrução
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Ex: Verifique quantos contratos tenho pendentes, liste os leads do CRM e me dê um resumo geral do sistema."
                                    rows={4}
                                    className="w-full bg-black/35 border border-white/5 p-4 rounded-2xl text-slate-200 placeholder-slate-500 font-medium text-sm focus:outline-none focus:border-[#25D366]/40 resize-none transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={submitting || !prompt.trim()}
                                    className={`w-full py-4 text-black font-black rounded-2xl uppercase text-[11px] tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${submitting || !prompt.trim()
                                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                                        : 'bg-[#25D366] hover:scale-[1.02] active:scale-95 shadow-[#25D366]/20'
                                        }`}
                                >
                                    {submitting ? (
                                        <><RefreshCw className="animate-spin" size={16} /> Processando...</>
                                    ) : (
                                        <><Zap size={16} /> Executar Agente</>
                                    )}
                                </button>
                            </form>
                        </div>

                        <div className="bg-[#1E293B]/60 border border-white/5 rounded-[32px] p-6 flex flex-col flex-1 min-h-[300px] overflow-hidden">
                            <h3 className="text-lg font-black tracking-tight text-white mb-4 shrink-0">
                                Histórico de Execuções
                            </h3>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 pb-6 min-h-0">
                                {loadingTasks && tasks.length === 0 ? (
                                    <div className="flex justify-center py-10">
                                        <div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : tasks.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500">
                                        <HelpCircle size={48} className="mx-auto opacity-10 mb-2 text-slate-400" />
                                        <p className="text-sm font-semibold">Nenhuma execução encontrada.</p>
                                    </div>
                                ) : tasks.map((task) => {
                                    const isSelected = selectedTask && selectedTask.id === task.id;
                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => setSelectedTask(task)}
                                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 shrink-0 ${isSelected
                                                ? 'bg-[#25D366]/10 border-[#25D366]/35 text-white'
                                                : 'bg-black/20 border-white/5 hover:border-white/10 hover:bg-black/30'
                                                }`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs font-black truncate ${isSelected ? 'text-[#25D366]' : 'text-slate-300'}`}>
                                                    {task.prompt}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                                                    <Clock size={10} />
                                                    {task.startedAt ? formatDistanceToNow(new Date(task.startedAt), { addSuffix: true, locale: ptBR }) : '...'}
                                                </div>
                                            </div>
                                            <div className="shrink-0 flex items-center">
                                                {task.status === 'running' && <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-pulse" />}
                                                {task.status === 'completed' && <CheckCircle2 size={16} className="text-[#25D366]" />}
                                                {task.status === 'failed' && <XCircle size={16} className="text-red-400" />}
                                                {task.status === 'error' && <AlertTriangle size={16} className="text-red-500" />}
                                                {task.status === 'timeout' && <Clock size={16} className="text-orange-400" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - ReAct Console */}
                    <div className="lg:col-span-2 bg-[#1E293B] border border-white/5 rounded-[40px] p-8 flex flex-col min-h-[500px] lg:h-[calc(100vh-13rem)] shadow-2xl overflow-hidden">
                        {selectedTask ? (
                            <div className="flex flex-col h-full overflow-hidden">
                                <div className="border-b border-white/5 pb-6 mb-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <span className="text-[9px] font-black bg-[#25D366]/10 text-[#25D366] px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                                                Cod: {selectedTask.id}
                                            </span>
                                            <h2 className="text-xl font-bold mt-3 text-white">{selectedTask.prompt}</h2>
                                        </div>
                                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 ${selectedTask.status === 'running' ? 'bg-yellow-500/10 text-yellow-500 animate-pulse' :
                                            selectedTask.status === 'completed' ? 'bg-[#25D366]/10 text-[#25D366]' :
                                                'bg-red-500/10 text-red-500'
                                            }`}>
                                            {selectedTask.status === 'running' ? 'Executando' :
                                                selectedTask.status === 'completed' ? 'Concluído' :
                                                    selectedTask.status === 'timeout' ? 'Timeout' : 'Falhou'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-6 pr-2 scroll-hide">
                                    {selectedTask.error && (
                                        <div className="p-5 bg-red-500/15 border border-red-500/30 rounded-2xl flex items-start gap-3">
                                            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                                            <div>
                                                <h4 className="text-sm font-black text-red-400">Erro de Execução</h4>
                                                <p className="text-sm text-red-100/90 mt-1">{selectedTask.error}</p>
                                            </div>
                                        </div>
                                    )}

                                    {selectedTask.status === 'running' && (!selectedTask.steps || selectedTask.steps.length === 0) && (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                                            <div className="w-12 h-12 border-4 border-[#25D366]/20 border-t-[#25D366] rounded-full animate-spin" />
                                            <p className="text-sm font-bold uppercase tracking-widest text-[#25D366] animate-pulse">Agente está Pensando...</p>
                                        </div>
                                    )}

                                    {selectedTask.steps?.map((stepItem, idx) => (
                                        <div key={idx} className="bg-black/25 rounded-3xl border border-white/5 overflow-hidden transition-all duration-300">
                                            <div className="bg-black/45 p-4 px-6 border-b border-white/5 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-black bg-white/10 text-white w-6 h-6 rounded-full flex items-center justify-center">
                                                        {stepItem.step}
                                                    </span>
                                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">Passo do Loop ReAct</h4>
                                                </div>
                                                <span className="text-[10px] text-slate-500 font-medium">
                                                    {new Date(stepItem.timestamp).toLocaleTimeString('pt-BR')}
                                                </span>
                                            </div>
                                            <div className="p-6 space-y-4">
                                                {stepItem.thought && (
                                                    <div className="space-y-1 bg-[#1E293B]/25 p-4 rounded-2xl border border-white/5">
                                                        <div className="flex items-center gap-2 text-xs font-black uppercase text-purple-400">
                                                            <Brain size={14} /> Pensamento da IA
                                                        </div>
                                                        <p className="text-sm text-slate-300 font-medium whitespace-pre-line leading-relaxed">
                                                            {stepItem.thought}
                                                        </p>
                                                    </div>
                                                )}
                                                {stepItem.action && (
                                                    <div className="space-y-2 bg-[#25D366]/5 p-4 rounded-2xl border border-[#25D366]/15">
                                                        <div className="flex items-center gap-2 text-xs font-black uppercase text-[#25D366]">
                                                            {getToolIcon(stepItem.action.tool)} Chamada de Ferramenta
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs font-mono bg-black/30 p-2.5 rounded-lg text-slate-200 flex-wrap">
                                                            <span className="text-[#25D366] font-bold">{stepItem.action.tool}</span>
                                                            <span>(</span>
                                                            <span className="text-slate-400 break-all">{JSON.stringify(stepItem.action.args)}</span>
                                                            <span>)</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {stepItem.observation && (
                                                    <div className="space-y-1 bg-black/40 p-4 rounded-2xl border border-white/5">
                                                        <div className="text-xs font-black uppercase text-blue-400">
                                                            👁️ Retorno / Observação
                                                        </div>
                                                        <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                                                            {stepItem.observation}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {selectedTask.result && (
                                        <div className="bg-[#25D366]/10 border border-[#25D366]/30 p-6 rounded-[32px] space-y-2 mt-4 shadow-xl">
                                            <h4 className="text-md font-black text-[#25D366] uppercase tracking-wider flex items-center gap-2">
                                                <CheckCircle2 size={20} /> Resultado Final da Tarefa
                                            </h4>
                                            <p className="text-sm text-slate-200 leading-relaxed font-semibold">
                                                {selectedTask.result}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <div className="relative mb-6">
                                    <Brain size={80} className="opacity-15 text-[#25D366]" />
                                    <Sparkles size={24} className="absolute -top-2 -right-2 text-[#25D366] animate-pulse" />
                                </div>
                                <h3 className="text-xl font-bold text-white">Pronto para Agir</h3>
                                <p className="text-sm text-slate-400 max-w-sm mt-2 leading-relaxed">
                                    O agente pode consultar contratos, CRM, agenda, ordens de serviço, conversas e muito mais. Digite uma instrução à esquerda.
                                </p>
                                <div className="flex flex-wrap gap-2 mt-6 justify-center">
                                    {['📊 Estatísticas', '📋 Contratos', '👥 CRM', '📅 Agenda', '🔧 OS'].map(tag => (
                                        <span key={tag} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-slate-400">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ TAB: MEMÓRIA / BASE DE CONHECIMENTO ═══ */}
            {activeTab === 'memory' && (
                <div className="flex-1 space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <BookOpen size={22} className="text-[#25D366]" />
                                Base de Conhecimento
                            </h2>
                            <p className="text-sm text-slate-400 mt-1">
                                Faça upload de arquivos ou adicione notas para o agente aprender e evoluir.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <label className="p-3 bg-[#25D366] hover:bg-[#25D366]/90 rounded-xl text-black font-black text-[11px] tracking-wider uppercase cursor-pointer flex items-center gap-2 transition-all shadow-lg shadow-[#25D366]/20">
                                <Upload size={16} /> {uploadingFile ? 'Enviando...' : 'Upload Arquivo'}
                                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile}
                                    accept=".pdf,.txt,.md,.csv,.doc,.docx,.xls,.xlsx,.json,.png,.jpg,.jpeg,.webp,.mp3,.wav"
                                />
                            </label>
                            <button
                                onClick={() => setShowAddNote(!showAddNote)}
                                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 font-black text-[11px] tracking-wider uppercase border border-white/10 flex items-center gap-2 transition-all"
                            >
                                <Plus size={16} /> Adicionar Nota
                            </button>
                        </div>
                    </div>

                    {showAddNote && (
                        <div className="bg-[#1E293B] border border-[#25D366]/20 rounded-3xl p-6 space-y-4 animate-fade-in">
                            <h3 className="text-sm font-black text-[#25D366] uppercase tracking-wider flex items-center gap-2">
                                <FileText size={16} /> Nova Nota de Conhecimento
                            </h3>
                            <input
                                value={newNote.title}
                                onChange={e => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Título da informação..."
                                className="w-full bg-black/30 border border-white/5 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-[#25D366]/40"
                            />
                            <textarea
                                value={newNote.content}
                                onChange={e => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                                placeholder="Conteúdo detalhado que o agente deve memorizar..."
                                rows={4}
                                className="w-full bg-black/30 border border-white/5 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-[#25D366]/40 resize-none"
                            />
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setShowAddNote(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm font-bold transition-all">
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAddNote}
                                    disabled={!newNote.title.trim() || !newNote.content.trim()}
                                    className="px-6 py-2 bg-[#25D366] text-black font-black text-sm rounded-xl disabled:opacity-30 transition-all hover:scale-105"
                                >
                                    Salvar na Memória
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loadingKnowledge ? (
                            <div className="col-span-full flex justify-center py-16">
                                <div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : knowledgeItems.length === 0 ? (
                            <div className="col-span-full text-center py-16">
                                <Database size={64} className="mx-auto opacity-10 mb-4 text-[#25D366]" />
                                <h3 className="text-lg font-bold text-white">Memória Vazia</h3>
                                <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                                    Faça upload de arquivos ou adicione notas para que o agente possa consultar quando precisar.
                                </p>
                            </div>
                        ) : knowledgeItems.map(item => (
                            <div key={item.id} className="bg-[#1E293B] border border-white/5 rounded-2xl p-5 hover:border-[#25D366]/20 transition-all group">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        {item.type === 'document' && <FileText size={18} className="text-blue-400" />}
                                        {item.type === 'text' && <BookOpen size={18} className="text-[#25D366]" />}
                                        {item.type === 'image' && <Eye size={18} className="text-purple-400" />}
                                        {item.type === 'audio' && <MessageSquare size={18} className="text-orange-400" />}
                                        {!item.type && <Database size={18} className="text-slate-400" />}
                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                                            {item.type || 'dados'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteKnowledge(item.id)}
                                        className="opacity-0 group-hover:opacity-100 text-red-400/70 hover:text-red-400 transition-all p-1"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <h4 className="text-sm font-bold text-white mt-3 truncate">{item.title}</h4>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                                    {item.content?.substring(0, 120)}...
                                </p>
                                {item.file_name && (
                                    <p className="text-[10px] text-slate-500 mt-2 truncate">📎 {item.file_name}</p>
                                )}
                                <p className="text-[10px] text-slate-600 mt-2">
                                    {item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : ''}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ TAB: CANAIS DE COMUNICAÇÃO ═══ */}
            {activeTab === 'channels' && (
                <div className="flex-1 space-y-6">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <MessageCircle size={22} className="text-[#25D366]" />
                            Canais de Comunicação
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Conecte WhatsApp e Telegram para receber e responder comandos diretamente.
                        </p>
                    </div>

                    {loadingChannels ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* WhatsApp Section */}
                            <div className="bg-[#1E293B] border border-white/5 rounded-[32px] p-6 space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-[#25D366]/15 rounded-2xl">
                                        <MessageSquare size={24} className="text-[#25D366]" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white">WhatsApp</h3>
                                        <p className="text-xs text-slate-400">Escaneie o QR Code para conectar</p>
                                    </div>
                                </div>

                                {channels.whatsapp.length === 0 ? (
                                    <div className="text-center py-8">
                                        <WifiOff size={40} className="mx-auto text-slate-600 mb-3" />
                                        <p className="text-sm text-slate-400">Nenhum agente WhatsApp encontrado.</p>
                                        <p className="text-xs text-slate-500 mt-1">Configure um agente na página de Visão Geral.</p>
                                    </div>
                                ) : channels.whatsapp.map(agent => (
                                    <div key={agent.id} className="bg-black/20 rounded-2xl p-4 border border-white/5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Bot size={16} className="text-[#25D366]" />
                                                <span className="text-sm font-bold text-white">{agent.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {agent.status === 'connected' ? (
                                                    <span className="flex items-center gap-1 bg-[#25D366]/15 text-[#25D366] px-2 py-1 rounded-full text-[10px] font-black">
                                                        <Wifi size={10} /> Conectado
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 bg-red-500/15 text-red-400 px-2 py-1 rounded-full text-[10px] font-black">
                                                        <WifiOff size={10} /> Desconectado
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {agent.status !== 'connected' && agent.qrCode && (
                                            <div className="flex flex-col items-center gap-3 py-4">
                                                <div className="bg-white p-4 rounded-2xl shadow-lg">
                                                    <img src={agent.qrCode} alt="QR Code WhatsApp" className="w-48 h-48 object-contain" />
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                    Escaneie com o WhatsApp
                                                </p>
                                            </div>
                                        )}

                                        {agent.status !== 'connected' && (
                                            <button
                                                onClick={() => handleRestartWhatsApp(agent.id)}
                                                className="w-full py-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] font-black text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                                            >
                                                <QrCode size={14} /> Gerar Novo QR Code
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Telegram Section */}
                            <div className="bg-[#1E293B] border border-white/5 rounded-[32px] p-6 space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-500/15 rounded-2xl">
                                        <Send size={24} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white">Telegram</h3>
                                        <p className="text-xs text-slate-400">Conecte via Bot Token do @BotFather</p>
                                    </div>
                                </div>

                                {channels.telegram.connected ? (
                                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Wifi size={14} className="text-blue-400" />
                                                <span className="text-sm font-bold text-blue-300">Bot Conectado</span>
                                            </div>
                                            <span className="bg-blue-500/15 text-blue-400 px-2 py-1 rounded-full text-[10px] font-black">
                                                ATIVO
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400">O bot está recebendo e respondendo mensagens via Telegram.</p>
                                        <button
                                            onClick={() => handleDisconnectTelegram(channels.telegram?.agentId || channels.whatsapp[0]?.id || 'default')}
                                            className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-black text-[11px] uppercase tracking-wider rounded-xl transition-all"
                                        >
                                            Desconectar
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="bg-black/20 rounded-2xl p-4 space-y-3 border border-white/5">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                                                <span className="w-5 h-5 bg-blue-500/15 rounded-full flex items-center justify-center text-blue-400 text-[9px] font-black">1</span>
                                                Abra o Telegram e busque por @BotFather
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                                                <span className="w-5 h-5 bg-blue-500/15 rounded-full flex items-center justify-center text-blue-400 text-[9px] font-black">2</span>
                                                Envie /newbot e siga as instruções
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                                                <span className="w-5 h-5 bg-blue-500/15 rounded-full flex items-center justify-center text-blue-400 text-[9px] font-black">3</span>
                                                Copie e cole o token gerado abaixo
                                            </div>
                                        </div>

                                        {showTelegramForm ? (
                                            <div className="space-y-3">
                                                <input
                                                    value={telegramToken}
                                                    onChange={e => setTelegramToken(e.target.value)}
                                                    placeholder="Cole o token do @BotFather aqui..."
                                                    className="w-full bg-black/30 border border-blue-500/20 p-3 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-blue-500/50"
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => { setShowTelegramForm(false); setTelegramToken(''); }}
                                                        className="flex-1 py-2.5 bg-white/5 text-slate-400 font-bold text-sm rounded-xl transition-all hover:bg-white/10"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        onClick={() => handleConnectTelegram(channels.telegram?.agentId || channels.whatsapp[0]?.id || 'default')}
                                                        disabled={!telegramToken.trim()}
                                                        className="flex-1 py-2.5 bg-blue-500 text-white font-black text-sm rounded-xl disabled:opacity-30 transition-all hover:bg-blue-400"
                                                    >
                                                        Conectar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setShowTelegramForm(true)}
                                                className="w-full py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-black text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                                            >
                                                <Send size={14} /> Conectar Bot do Telegram
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ TAB: FERRAMENTAS ═══ */}
            {activeTab === 'tools' && (
                <div className="flex-1 space-y-6">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Wrench size={22} className="text-[#25D366]" />
                            Ferramentas Disponíveis
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            O agente tem acesso a {tools.length} ferramenta(s) para executar comandos no sistema.
                        </p>
                    </div>

                    {loadingTools ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tools.filter(t => t.name !== 'task_completed').map(tool => (
                                <div
                                    key={tool.name}
                                    className={`bg-gradient-to-br ${getToolCategoryColor(tool.name)} border rounded-2xl p-5 hover:scale-[1.02] transition-all`}
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-black/30 rounded-xl">
                                            {getToolIcon(tool.name)}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white">{tool.name.replace(/_/g, ' ')}</h4>
                                            {tool.name.startsWith('system_') && (
                                                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                    sistema
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        {tool.description}
                                    </p>
                                    {tool.parameters?.properties && Object.keys(tool.parameters.properties).length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1">
                                            {Object.keys(tool.parameters.properties).map(param => (
                                                <span key={param} className="text-[9px] bg-black/20 text-slate-400 px-2 py-0.5 rounded font-mono">
                                                    {param}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
