import React, { useState, useEffect, useRef } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import {
    Brain, Play, RefreshCw, Clock, CheckCircle2, XCircle, AlertTriangle,
    Mail, Calendar, MessageSquare, Search, Database, ListTodo, ChevronRight, HelpCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function AgentDashboard() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [prompt, setPrompt] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const socketRef = useRef(null);

    // Busca lista de tarefas do histórico
    const fetchTasks = async () => {
        try {
            const res = await api.get('/agent/tasks');
            setTasks(res.data || []);
            // Atualiza a tarefa selecionada se ela estiver no estado ativo
            if (selectedTask) {
                const updatedSelected = (res.data || []).find(t => t.id === selectedTask.id);
                if (updatedSelected) {
                    setSelectedTask(updatedSelected);
                }
            }
        } catch (err) {
            console.error('Erro ao buscar histórico de tarefas:', err);
        } finally {
            setLoadingTasks(false);
        }
    };

    useEffect(() => {
        fetchTasks();
        const interval = setInterval(fetchTasks, 15000); // Polling opcional a cada 15s

        // Conexão Socket.IO para updates em tempo real
        const socket = io(API_BASE);
        socketRef.current = socket;

        const tenantId = user?.tenant_id || user?.id || 'default';

        // Ouve updates de etapas da tarefa autônoma
        socket.on(`agent:step:${tenantId}`, (data) => {
            console.log('⚡ Recebido evento agent:step:', data);
            setTasks(prev => prev.map(t => {
                if (t.id === data.taskId) {
                    const stepsCopy = [...(t.steps || [])];
                    // Evita duplicados
                    if (!stepsCopy.some(s => s.step === data.step.step)) {
                        stepsCopy.push(data.step);
                    }
                    return { ...t, status: 'running', steps: stepsCopy };
                }
                return t;
            }));

            setSelectedTask(prev => {
                if (prev && prev.id === data.taskId) {
                    const stepsCopy = [...(prev.steps || [])];
                    if (!stepsCopy.some(s => s.step === data.step.step)) {
                        stepsCopy.push(data.step);
                    }
                    return { ...prev, status: 'running', steps: stepsCopy };
                }
                return prev;
            });
        });

        // Ouve resposta completa
        socket.on(`agent:complete:${tenantId}`, (data) => {
            console.log('✅ Recebido evento agent:complete:', data);
            setTasks(prev => prev.map(t => {
                if (t.id === data.taskId) {
                    return { ...t, status: data.status, result: data.result, steps: data.steps, completedAt: new Date().toISOString() };
                }
                return t;
            }));

            setSelectedTask(prev => {
                if (prev && prev.id === data.taskId) {
                    return { ...prev, status: data.status, result: data.result, steps: data.steps, completedAt: new Date().toISOString() };
                }
                return prev;
            });
        });

        // Ouve erros
        socket.on(`agent:error:${tenantId}`, (data) => {
            console.warn('❌ Recebido evento agent:error:', data);
            setTasks(prev => prev.map(t => {
                if (t.id === data.taskId) {
                    return { ...t, status: 'error', error: data.error, completedAt: new Date().toISOString() };
                }
                return t;
            }));

            setSelectedTask(prev => {
                if (prev && prev.id === data.taskId) {
                    return { ...prev, status: 'error', error: data.error, completedAt: new Date().toISOString() };
                }
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

            // Cria uma tarefa placeholder no estado local imediato
            const newPlaceholder = {
                id: newTaskId,
                status: 'running',
                prompt,
                steps: [],
                startedAt: new Date().toISOString(),
            };

            setTasks(prev => [newPlaceholder, ...prev]);
            setSelectedTask(newPlaceholder);
            setPrompt('');
        } catch (err) {
            console.error('Erro ao disparar tarefa:', err);
            alert('Erro ao disparar tarefa do agente: ' + (err.response?.data?.error || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    // Ícones correspondentes a ferramentas
    const getToolIcon = (toolName) => {
        if (!toolName) return <Brain size={18} className="text-purple-400" />;
        if (toolName.includes('gmail')) return <Mail size={18} className="text-red-400" />;
        if (toolName.includes('calendar')) return <Calendar size={18} className="text-blue-400" />;
        if (toolName.includes('whatsapp')) return <MessageSquare size={18} className="text-green-400" />;
        if (toolName.includes('web_search')) return <Search size={18} className="text-yellow-400" />;
        if (toolName.includes('knowledge')) return <Database size={18} className="text-[#25D366]" />;
        return <ListTodo size={18} className="text-indigo-400" />;
    };

    return (
        <div className="space-y-8 animate-fade-in min-h-[calc(100vh-6rem)] flex flex-col focus:outline-none text-white">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold flex items-center gap-3 tracking-tight">
                        <div className="p-3 bg-gradient-to-br from-[#25D366] to-[#0F172A] rounded-2xl shadow-xl shadow-[#25D366]/10">
                            <Brain className="text-[#25D366] animate-pulse" size={32} />
                        </div>
                        Agente Autônomo
                    </h1>
                    <p className="text-slate-400 mt-2 text-md">
                        Designar tarefas complexas em linguagem natural para o loop de pensamento Hermes (ReAct).
                    </p>
                </div>
                <button
                    onClick={fetchTasks}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 transition-all flex items-center gap-2 border border-white/10 self-start"
                >
                    <RefreshCw size={18} className={loadingTasks ? 'animate-spin' : ''} />
                    <span className="font-semibold text-sm">Atualizar Histórico</span>
                </button>
            </div>

            {/* Grid Principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">

                {/* Painel Esquerdo: Input de Prompt & Lista de Tarefas */}
                <div className="lg:col-span-1 space-y-6 flex flex-col h-[calc(100vh-14rem)]">
                    {/* Caixa de Texto do Comando */}
                    <div className="bg-[#1E293B] border border-white/5 p-6 rounded-[32px] shadow-xl">
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                            <Play size={18} className="text-[#25D366]" /> Nova Instrução
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Ex: Leia meus últimos e-mails, veja o calendário para amanhã, verifique se tenho espaço e crie um evento de Almoço de Negócios às 13h."
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
                                    <>
                                        <RefreshCw className="animate-spin" size={16} /> Processando...
                                    </>
                                ) : (
                                    <>
                                        <Play size={16} fill="black" /> Executar Agente
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Histórico de Comandos */}
                    <div className="bg-[#1E293B]/60 border border-white/5 rounded-[32px] p-6 flex flex-col flex-1 overflow-hidden">
                        <h3 className="text-lg font-black tracking-tight text-white mb-4">
                            Histórico de Execuções
                        </h3>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scroll-hide">
                            {loadingTasks && tasks.length === 0 ? (
                                <div className="flex justify-center py-10">
                                    <div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : tasks.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <HelpCircle size={48} className="mx-auto opacity-10 mb-2 text-slate-400" />
                                    <p className="text-sm font-semibold">Nenhuma execução encontrada.</p>
                                </div>
                            ) : (
                                tasks.map((task) => {
                                    const isSelected = selectedTask && selectedTask.id === task.id;
                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => setSelectedTask(task)}
                                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${isSelected
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
                                                    {formatDistanceToNow(new Date(task.startedAt), { addSuffix: true, locale: ptBR })}
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex items-center">
                                                {task.status === 'running' && (
                                                    <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-pulse" title="Executando..." />
                                                )}
                                                {task.status === 'completed' && (
                                                    <CheckCircle2 size={16} className="text-[#25D366]" title="Concluído com Sucesso" />
                                                )}
                                                {task.status === 'failed' && (
                                                    <XCircle size={16} className="text-red-400" title="Falha" />
                                                )}
                                                {task.status === 'error' && (
                                                    <AlertTriangle size={16} className="text-red-500" title="Erro Crítico" />
                                                )}
                                                {task.status === 'timeout' && (
                                                    <Clock size={16} className="text-orange-400" title="Parada por Excesso de Passos" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                </div>

                {/* Painel Direito: Console de Pensamento / Visualização dos Logs ReAct */}
                <div className="lg:col-span-2 bg-[#1E293B] border border-white/5 rounded-[40px] p-8 flex flex-col h-[calc(100vh-14rem)] shadow-2xl">
                    {selectedTask ? (
                        <div className="flex flex-col h-full overflow-hidden">
                            {/* Header da Tarefa Selecionada */}
                            <div className="border-b border-white/5 pb-6 mb-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <span className="text-[9px] font-black bg-[#25D366]/10 text-[#25D366] px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                                            Cod: {selectedTask.id}
                                        </span>
                                        <h2 className="text-xl font-bold mt-3 text-white">
                                            {selectedTask.prompt}
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider ${selectedTask.status === 'running' ? 'bg-yellow-500/10 text-yellow-500 animate-pulse' :
                                                selectedTask.status === 'completed' ? 'bg-[#25D366]/10 text-[#25D366]' :
                                                    'bg-red-500/10 text-red-500'
                                            }`}>
                                            {selectedTask.status === 'running' ? 'Executando' :
                                                selectedTask.status === 'completed' ? 'Concluído' :
                                                    selectedTask.status === 'timeout' ? 'Timeout' : 'Falhou'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Corpo da Tarefa: Passos do Loop ReAct */}
                            <div className="flex-1 overflow-y-auto space-y-6 pr-2 scroll-hide">

                                {/* Visualização de Erros Críticos */}
                                {selectedTask.error && (
                                    <div className="p-5 bg-red-500/15 border border-red-500/30 rounded-2xl flex items-start gap-3">
                                        <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <h4 className="text-sm font-black text-red-400 uppercase tracking-wider">Erro de Execução</h4>
                                            <p className="text-sm text-red-100/90 mt-1">{selectedTask.error}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Exibição se estiver Executando e sem nenhum passo ainda */}
                                {selectedTask.status === 'running' && (!selectedTask.steps || selectedTask.steps.length === 0) && (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                                        <div className="w-12 h-12 border-4 border-[#25D366]/20 border-t-[#25D366] rounded-full animate-spin"></div>
                                        <p className="text-sm font-bold uppercase tracking-widest text-[#25D366] animate-pulse">Agente está Pensando...</p>
                                    </div>
                                )}

                                {/* Lista de Passos de Execução */}
                                {selectedTask.steps && selectedTask.steps.map((stepItem, idx) => (
                                    <div key={idx} className="bg-black/25 rounded-3xl border border-white/5 overflow-hidden transition-all duration-300">

                                        {/* Header do Passo */}
                                        <div className="bg-black/45 p-4 px-6 border-b border-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-black bg-white/10 text-white w-6 h-6 rounded-full flex items-center justify-center">
                                                    {stepItem.step}
                                                </span>
                                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                                                    Passo do Loop ReAct
                                                </h4>
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-medium">
                                                {new Date(stepItem.timestamp).toLocaleTimeString('pt-BR')}
                                            </span>
                                        </div>

                                        {/* Conteúdo do Passo */}
                                        <div className="p-6 space-y-4">

                                            {/* Thought (Pensamento) */}
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

                                            {/* Action (Ação - Tool Call) */}
                                            {stepItem.action && (
                                                <div className="space-y-2 bg-[#25D366]/5 p-4 rounded-2xl border border-[#25D366]/15">
                                                    <div className="flex items-center gap-2 text-xs font-black uppercase text-[#25D366]">
                                                        {getToolIcon(stepItem.action.tool)} Chamada de Ferramenta
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs font-mono bg-black/30 p-2.5 rounded-lg text-slate-200">
                                                        <span className="text-[#25D366] font-bold">{stepItem.action.tool}</span>
                                                        <span>(</span>
                                                        <span className="text-slate-400">{JSON.stringify(stepItem.action.args)}</span>
                                                        <span>)</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Observation (Observação - Tool Result) */}
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

                                {/* Resumo Final se finalizado */}
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
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center">
                            <Brain size={80} className="opacity-15 mb-4 text-[#25D366]" />
                            <h3 className="text-xl font-bold text-white">Pronto para Agir</h3>
                            <p className="text-sm text-slate-400 max-w-sm mt-2 leading-relaxed">
                                Selecione uma tarefa fictícia ou em andamento no histórico lateral para acompanhar os passos de execução em tempo real, ou digite uma nova instrução à esquerda.
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
