import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { Users, FileUp, Loader2, Play, CheckCircle2, AlertTriangle, HelpCircle, Link as LinkIcon, PlusCircle, ServerCrash } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function GroupsPage() {
    const [agents, setAgents] = useState([]);
    const [selectedAgent, setSelectedAgent] = useState('');
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState('');
    const [customGroupJid, setCustomGroupJid] = useState('');
    const [numbersText, setNumbersText] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [status, setStatus] = useState('idle'); // 'idle' | 'processing' | 'success' | 'error'
    const [resultSummary, setResultSummary] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const fetchAgents = async () => {
            try {
                const res = await api.get('/whatsapp/status');
                const connectedAgents = (res.data.agents || []).filter(a => a.status === 'connected');
                setAgents(connectedAgents);
                if (connectedAgents.length > 0) {
                    setSelectedAgent(connectedAgents[0].id);
                }
            } catch (err) {
                console.error('Erro ao listar agentes:', err);
            }
        };
        fetchAgents();
    }, []);

    useEffect(() => {
        if (!selectedAgent) {
            setGroups([]);
            setSelectedGroup('');
            return;
        }

        const fetchGroups = async () => {
            setLoadingGroups(true);
            setGroups([]);
            setSelectedGroup('');
            try {
                const res = await api.get(`/whatsapp/groups/${selectedAgent}`);
                setGroups(res.data || []);
                if (res.data && res.data.length > 0) {
                    setSelectedGroup(res.data[0].id);
                }
            } catch (err) {
                console.error('Erro ao carregar grupos:', err);
            } finally {
                setLoadingGroups(false);
            }
        };

        fetchGroups();
    }, [selectedAgent]);

    const handleImportContacts = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileExtension = file.name.split('.').pop().toLowerCase();

        if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target.result);
                    // Lê o workbook sem restrições
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    const loadedNumbers = [];
                    const seen = new Set();

                    // Varre todas as células da planilha independente de range definido (!ref)
                    for (const cellAddress in worksheet) {
                        if (/^[A-Z]+\d+$/.test(cellAddress)) {
                            const cell = worksheet[cellAddress];
                            if (cell && (cell.v !== undefined || cell.w !== undefined)) {
                                // Evita notação científica (ex: 5.511e+12) usando o valor formatado .w ou convertendo de .v
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

                    setNumbersText(prev => (prev ? prev + '\n' : '') + loadedNumbers.join('\n'));
                } catch (err) {
                    console.error('Erro ao processar arquivo Excel:', err);
                    alert('Erro ao processar o arquivo Excel. Verifique se a planilha não está corrompida.');
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

                setNumbersText(prev => (prev ? prev + '\n' : '') + loadedNumbers.join('\n'));
            };
            reader.readAsText(file);
        }
    };

    const handleAddParticipants = async () => {
        const numbers = numbersText.split('\n')
            .map(n => n.trim())
            .filter(n => n.length > 5);

        const targetGroupJid = selectedGroup === 'custom' ? customGroupJid.trim() : selectedGroup;

        if (numbers.length === 0) return alert('Insira pelo menos um número válido.');
        if (!targetGroupJid) return alert('Selecione ou insira um ID de Grupo JID válido.');
        if (!selectedAgent) return alert('Selecione um agente conectado.');

        if (!window.confirm(`Você está prestes a adicionar ${numbers.length} contatos ao grupo selecionado. Deseja continuar?`)) return;

        setLoading(true);
        setStatus('processing');
        setErrorMessage('');
        setResultSummary(null);

        try {
            const res = await api.post('/whatsapp/groups/add-participants', {
                agentId: selectedAgent,
                groupJid: targetGroupJid,
                numbers
            });

            setStatus('success');
            setResultSummary({
                total: numbers.length,
                message: res.data.message || 'Processo iniciado no servidor.'
            });
        } catch (err) {
            console.error('Erro ao adicionar contatos:', err);
            setStatus('error');
            setErrorMessage(err.response?.data?.error || err.message || 'Erro interno desconhecido');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Users className="text-[#25D366]" size={36} />
                        Importar Contatos para Grupo
                    </h2>
                    <p className="text-slate-400 mt-2 text-lg">Adicione listas de contatos de uma única vez a qualquer um de seus grupos de WhatsApp.</p>
                </div>

                <label className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer text-slate-300 border border-white/10 transition-all font-semibold">
                    <FileUp size={18} />
                    Importar Contatos
                    <input type="file" accept=".txt,.csv,.xlsx,.xls" onChange={handleImportContacts} className="hidden" />
                </label>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEITOR & ENTRADA DE CONTATOS */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-panel p-8 space-y-6">
                        <div className="space-y-4">
                            <label className="text-slate-300 font-semibold flex items-center gap-2">
                                <Users size={18} className="text-[#25D366]" />
                                Lista de Contatos para Adicionar
                            </label>
                            <textarea
                                className="w-full h-64 bg-[#0F172A] border border-white/10 rounded-xl p-4 text-slate-200 outline-none focus:border-[#25D366]/50 transition-all resize-none font-mono text-sm"
                                placeholder="Insira um número de telefone com DDI e DDD por linha (ex: 5511999999999)"
                                value={numbersText}
                                onChange={e => setNumbersText(e.target.value)}
                            />
                            <p className="text-xs text-slate-500 italic">Total identificado: {numbersText.split('\n').filter(n => n.trim().length > 5).length} números.</p>
                        </div>
                    </div>
                </div>

                {/* DEFINIÇÃO DO GRUPO & AÇÕES */}
                <div className="space-y-6">
                    <div className="glass-panel p-8 space-y-6">
                        {/* Escolha do Agente */}
                        <div className="space-y-4">
                            <label className="text-slate-300 font-semibold block text-sm">Disparador (Agente WhatsApp)</label>
                            <select
                                className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-white outline-none"
                                value={selectedAgent}
                                onChange={e => setSelectedAgent(e.target.value)}
                            >
                                {agents.length === 0 && <option value="">Nenhum agente online</option>}
                                {agents.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Grupo Alvo */}
                        <div className="space-y-4">
                            <label className="text-slate-300 font-semibold block text-sm flex justify-between items-center">
                                Grupo de Destino
                                {loadingGroups && <Loader2 className="animate-spin text-[#25D366]" size={14} />}
                            </label>
                            <select
                                disabled={loadingGroups || !selectedAgent}
                                className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-white outline-none disabled:opacity-50"
                                value={selectedGroup}
                                onChange={e => setSelectedGroup(e.target.value)}
                            >
                                {!selectedAgent && <option value="">Selecione um agente primeiro</option>}
                                {selectedAgent && groups.length === 0 && !loadingGroups && (
                                    <option value="">Nenhum grupo encontrado</option>
                                )}
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.subject} ({g.participantsCount} membros)</option>
                                ))}
                                {selectedAgent && <option value="custom">+ Grupo Manual (Inserir ID JID)</option>}
                            </select>
                        </div>

                        {/* JID Customizado */}
                        {selectedGroup === 'custom' && (
                            <div className="space-y-3 animate-fade-in">
                                <label className="text-slate-300 font-semibold block text-xs">JID do Grupo (ex: 120363294320950346@g.us)</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-white outline-none text-sm placeholder:text-slate-600 focus:border-[#25D366]/50"
                                    placeholder="Cole o ID completo do grupo"
                                    value={customGroupJid}
                                    onChange={e => setCustomGroupJid(e.target.value)}
                                />
                            </div>
                        )}

                        <button
                            onClick={handleAddParticipants}
                            disabled={loading || !selectedAgent || (!selectedGroup && !customGroupJid)}
                            className="w-full bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-50 text-slate-900 font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-[#25D366]/20 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                            {loading ? 'Adicionando ao Grupo...' : 'Adicionar ao Grupo'}
                        </button>
                    </div>

                    <div className="glass-panel p-6 bg-yellow-500/5 border-yellow-500/20">
                        <h4 className="text-white font-bold flex items-center gap-2 mb-2 text-sm">
                            <AlertTriangle size={16} className="text-yellow-500" />
                            Observações Importantes
                        </h4>
                        <ul className="text-[11px] text-slate-400 space-y-2 list-disc pl-4 leading-tight">
                            <li>O WhatsApp possui limites de segurança rápidos. Evite adicionar mais de 100-150 contatos de uma única vez para evitar banimento.</li>
                            <li>Alguns contatos possuem configurações de privacidade que impedem a adição direta. O WhatsApp responderá enviando um convite nesse caso.</li>
                            <li>Seu número de emissão precisa ser administrador do grupo para adicionar pessoas.</li>
                        </ul>
                    </div>

                    {/* PAINEL DE RESULTADO */}
                    {status === 'success' && resultSummary && (
                        <div className="glass-panel p-6 bg-[#25D366]/5 border-[#25D366]/20 animate-fade-in space-y-3">
                            <h4 className="text-white font-bold flex items-center gap-2 text-sm">
                                <CheckCircle2 size={18} className="text-[#25D366]" />
                                Adição em Andamento!
                            </h4>
                            <p className="text-xs text-slate-300">
                                {resultSummary.message}
                            </p>
                            <div className="p-3 bg-black/20 rounded-lg border border-white/5 space-y-1.5 font-mono text-[11px] text-slate-400">
                                <div>Total de contatos: <span className="text-white font-bold">{resultSummary.total}</span></div>
                                <div>Tempo estimado: <span className="text-white font-bold">~{Math.ceil((resultSummary.total / 5) * 2.5)} segundos</span></div>
                                <div className="flex items-center gap-1.5 text-[#25D366] font-bold">
                                    <Loader2 className="animate-spin" size={10} />
                                    Processando no Servidor...
                                </div>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="glass-panel p-6 bg-red-500/5 border-red-500/20 animate-fade-in">
                            <h4 className="text-white font-bold flex items-center gap-2 mb-3">
                                <ServerCrash size={18} className="text-red-500" />
                                Erro ao Adicionar
                            </h4>
                            <p className="text-xs text-red-300">
                                {errorMessage}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
