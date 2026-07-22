import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import {
    FileText, Plus, Search, Trash2, Edit3, X, Save, Copy, Check,
    ExternalLink, FileSignature, UploadCloud, Eye, AlertCircle, Loader2, CheckCircle2, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ContractsPage() {
    const { user } = useAuth();
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedContract, setSelectedContract] = useState(null);

    // Form States
    const [isUploading, setIsUploading] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        client_name: '',
        client_email: '',
        client_document: '',
        creation_type: 'editor', // 'editor' ou 'upload'
        content: '',
        file_url: '',
        file_name: '',
        status: 'draft'
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchContracts();
    }, []);

    const fetchContracts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/contracts');
            setContracts(res.data || []);
        } catch (err) {
            console.error('Erro ao buscar contratos:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Apenas PDF ou Word para contratos
        if (file.type !== 'application/pdf' &&
            file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
            file.type !== 'application/msword') {
            alert('Por favor, envie apenas arquivos PDF ou Word (.doc, .docx).');
            return;
        }

        setIsUploading(true);
        const data = new FormData();
        data.append('file', file);

        try {
            const res = await api.post('/upload', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({
                ...prev,
                file_url: res.data.url,
                file_name: res.data.fileName
            }));
        } catch (err) {
            console.error('Erro ao subir arquivo:', err);
            alert('Falha ao subir arquivo. Verifique se o bucket existe no Supabase Storage.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (formData.creation_type === 'upload' && !formData.file_url) {
            alert('Por favor, faça o upload do PDF do contrato para continuar.');
            return;
        }
        if (formData.creation_type === 'editor' && !formData.content) {
            alert('Por favor, digite o conteúdo do contrato no editor.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                title: formData.title,
                client_name: formData.client_name,
                client_email: formData.client_email,
                client_document: formData.client_document,
                status: formData.status,
                content: formData.creation_type === 'editor' ? formData.content : null,
                file_url: formData.creation_type === 'upload' ? formData.file_url : null
            };

            await api.post('/contracts', payload);
            setShowModal(false);
            resetForm();
            fetchContracts();
        } catch (err) {
            alert(err.response?.data?.error || 'Erro ao criar contrato');
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            client_name: '',
            client_email: '',
            client_document: '',
            creation_type: 'editor',
            content: '',
            file_url: '',
            file_name: '',
            status: 'draft'
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir permanentemente este contrato?')) return;
        try {
            await api.delete(`/contracts/${id}`);
            fetchContracts();
            if (selectedContract && selectedContract.id === id) {
                setShowDetailModal(false);
            }
        } catch (err) {
            alert('Erro ao excluir contrato');
        }
    };

    const updateStatus = async (contract, newStatus) => {
        try {
            const res = await api.put(`/contracts/${contract.id}`, { status: newStatus });
            fetchContracts();
            if (selectedContract && selectedContract.id === contract.id) {
                setSelectedContract(res.data);
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Erro ao atualizar status');
        }
    };

    const copySignatureLink = (id) => {
        const url = `${window.location.origin}/contracts/sign/${id}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2500);
        }).catch(() => {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = url;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2500);
        });
    };

    const filteredContracts = contracts.filter(c => {
        const matchesSearch =
            (c.title && c.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (c.client_name && c.client_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (c.client_document && c.client_document.includes(searchQuery));

        if (statusFilter === 'all') return matchesSearch;
        return matchesSearch && c.status === statusFilter;
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case 'signed':
                return <span className="bg-[#25D366]/10 text-[#25D366] text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-[#25D366]/20">Assinado</span>;
            case 'pending':
                return <span className="bg-yellow-500/10 text-yellow-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-yellow-500/20">Aguardando Assinatura</span>;
            case 'canceled':
                return <span className="bg-red-500/10 text-red-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-red-500/20">Cancelado</span>;
            default:
                return <span className="bg-slate-500/10 text-slate-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-slate-500/20">Rascunho</span>;
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
                        <FileSignature className="text-[#25D366]" size={36} />
                        Gerenciador de Contratos
                    </h2>
                    <p className="text-slate-400 mt-2 text-lg">Crie, faça upload e envie contratos para assinatura eletrônica.</p>
                </div>

                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="bg-[#25D366] hover:bg-[#1DA851] text-slate-900 px-6 py-3.5 rounded-xl font-bold shadow-[0_0_15px_rgba(37,211,102,0.3)] flex items-center gap-2 transition-all transform hover:-translate-y-1"
                >
                    <Plus size={20} /> Novo Contrato
                </button>
            </div>

            {/* FILTROS E BUSCA */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#0F172A] p-4 rounded-2xl border border-white/5">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por título ou cliente..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white outline-none focus:border-[#25D366] transition-colors"
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto overflow-x-auto py-1">
                    {[
                        { id: 'all', name: 'Todos' },
                        { id: 'draft', name: 'Rascunho' },
                        { id: 'pending', name: 'Pendente' },
                        { id: 'signed', name: 'Assinados' },
                        { id: 'canceled', name: 'Cancelados' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border ${statusFilter === tab.id
                                    ? 'bg-[#25D366]/10 text-[#25D366] border-[#25D366]/30'
                                    : 'bg-white/5 text-slate-400 border-transparent hover:bg-white/10'
                                }`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* LISTA DE CONTRATOS */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 className="animate-spin text-[#25D366] mb-4" size={32} />
                    <p className="text-sm font-black uppercase tracking-widest">Buscando contratos...</p>
                </div>
            ) : filteredContracts.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-2xl p-8 bg-black/10">
                    <FileText className="mx-auto text-slate-600 mb-4" size={48} />
                    <h3 className="text-xl font-bold text-slate-300">Nenhum contrato encontrado</h3>
                    <p className="text-slate-500 mt-2">Clique em "Novo Contrato" para começar a criar hoje mesmo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredContracts.map(c => (
                        <div
                            key={c.id}
                            className="glass-panel p-6 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between space-y-4 group relative"
                        >
                            <div>
                                <div className="flex justify-between items-start gap-2">
                                    <h3 className="font-bold text-white text-lg tracking-tight line-clamp-1">{c.title}</h3>
                                    {getStatusBadge(c.status)}
                                </div>

                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-3">Cliente</p>
                                <p className="text-sm font-medium text-slate-300">{c.client_name || 'Não informado'}</p>

                                {c.client_document && (
                                    <p className="text-xs text-slate-400 font-mono mt-1">{c.client_document}</p>
                                )}

                                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                                    <span>Criado em:</span>
                                    <span className="font-semibold text-slate-300">
                                        {format(new Date(c.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex gap-2 w-full">
                                <button
                                    onClick={() => { setSelectedContract(c); setShowDetailModal(true); }}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold p-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                                >
                                    <Eye size={14} /> Detalhes
                                </button>

                                {c.status === 'pending' && (
                                    <button
                                        onClick={() => copySignatureLink(c.id)}
                                        className={`flex-1 font-bold p-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all ${copiedId === c.id
                                                ? 'bg-[#25D366] text-slate-900 shadow-[0_0_10px_rgba(37,211,102,0.3)]'
                                                : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20'
                                            }`}
                                    >
                                        {copiedId === c.id ? (
                                            <><Check size={14} /> Copiado</>
                                        ) : (
                                            <><Copy size={14} /> Link Assinatura</>
                                        )}
                                    </button>
                                )}

                                <button
                                    onClick={() => handleDelete(c.id)}
                                    className="p-3 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-xl transition-all"
                                    title="Excluir contrato"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* CREATE MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
                    <div className="absolute inset-0" onClick={() => setShowModal(false)}></div>
                    <div className="bg-[#0F172A] border border-white/10 rounded-[32px] p-8 w-full max-w-2xl z-10 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">

                        <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white bg-white/5 rounded-xl transition-all">
                            <X size={18} />
                        </button>

                        <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3 tracking-tighter uppercase italic">
                            <FileSignature className="text-[#25D366]" size={28} />
                            Criar Novo Contrato
                        </h3>

                        <form onSubmit={handleSave} className="space-y-6">

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Título do Contrato / Nome Identificador</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Ex: Contrato de Desenvolvimento Web - Cliente X"
                                    className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-[#25D366] transition-colors"
                                />
                            </div>

                            {/* Informações do Cliente */}
                            <div className="bg-[#0b0f19] border border-white/5 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5 col-span-1 md:col-span-3">
                                    <span className="text-[10.5px] font-black text-[#25D366] uppercase tracking-widest">Informações do Cliente (Signatário)</span>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.client_name}
                                        onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                                        placeholder="João Silva Cardoso"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white font-semibold outline-none focus:border-[#25D366] transition-colors"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.client_email}
                                        onChange={e => setFormData({ ...formData, client_email: e.target.value })}
                                        placeholder="joao@email.com"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white font-semibold outline-none focus:border-[#25D366] transition-colors"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">CPF ou CNPJ</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.client_document}
                                        onChange={e => setFormData({ ...formData, client_document: e.target.value })}
                                        placeholder="000.000.000-00"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white font-semibold outline-none focus:border-[#25D366] transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Escolha do Método */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Tipo de Contrato</label>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, creation_type: 'editor' })}
                                        className={`flex-1 py-3 px-4 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${formData.creation_type === 'editor'
                                                ? 'border-[#25D366] bg-[#25D366]/10 text-white'
                                                : 'border-white/10 bg-black/20 text-slate-400 hover:bg-white/5'
                                            }`}
                                    >
                                        📝 Digitar Contrato
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, creation_type: 'upload' })}
                                        className={`flex-1 py-3 px-4 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${formData.creation_type === 'upload'
                                                ? 'border-[#25D366] bg-[#25D366]/10 text-white'
                                                : 'border-white/10 bg-black/20 text-slate-400 hover:bg-white/5'
                                            }`}
                                    >
                                        📂 Subir Arquivo Pronto (PDF)
                                    </button>
                                </div>
                            </div>

                            {/* EDITOR DE TEXTO MANUAL */}
                            {formData.creation_type === 'editor' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cláusulas e Termos do Contrato</label>
                                    <textarea
                                        rows="8"
                                        value={formData.content}
                                        onChange={e => setFormData({ ...formData, content: e.target.value })}
                                        placeholder="Digite os termos do contrato ou copie e cole aqui..."
                                        className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white font-mono text-sm outline-none focus:border-[#25D366] transition-colors"
                                    />
                                </div>
                            )}

                            {/* UPLOAD DO PDF */}
                            {formData.creation_type === 'upload' && (
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Carregar Contrato (PDF)</label>

                                    {formData.file_url ? (
                                        <div className="bg-[#25D366]/5 border border-[#25D366]/20 p-4 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <FileText className="text-[#25D366]" size={20} />
                                                <span className="text-white text-sm font-semibold truncate max-w-xs">{formData.file_name || 'contrato_pront.pdf'}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, file_url: '', file_name: '' }))}
                                                className="text-red-400 hover:text-red-300 text-xs font-bold"
                                            >
                                                Substituir
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="w-full h-32 border-2 border-dashed border-white/10 hover:border-white/20 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all text-center">
                                            <input
                                                type="file"
                                                accept=".pdf,.doc,.docx"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                                disabled={isUploading}
                                            />
                                            {isUploading ? (
                                                <>
                                                    <Loader2 className="animate-spin text-[#25D366] mb-2" size={32} />
                                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Subindo arquivo...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <UploadCloud className="text-slate-400 mb-2" size={32} />
                                                    <span className="text-sm font-semibold text-slate-300">Clique para selecionar seu Arquivo</span>
                                                    <span className="text-xs text-slate-500 mt-1">Formatos suportados: PDF ou Word</span>
                                                </>
                                            )}
                                        </label>
                                    )}
                                </div>
                            )}

                            {/* Tipo de Publicação / Status Inicial */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Status Inicial</label>
                                <div className="flex gap-4">
                                    <label className="flex-1 bg-black/30 border border-white/10 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-white/20 transition-all">
                                        <input
                                            type="radio"
                                            name="status"
                                            checked={formData.status === 'draft'}
                                            onChange={() => setFormData({ ...formData, status: 'draft' })}
                                            className="text-[#25D366] focus:ring-0 cursor-pointer"
                                        />
                                        <div>
                                            <p className="text-xs font-bold text-white uppercase">Apenas Salvar Rascunho</p>
                                            <p className="text-[10px] text-slate-400">Você ainda pode editar os termos depois.</p>
                                        </div>
                                    </label>

                                    <label className="flex-1 bg-black/30 border border-white/10 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-border-20 transition-all">
                                        <input
                                            type="radio"
                                            name="status"
                                            checked={formData.status === 'pending'}
                                            onChange={() => setFormData({ ...formData, status: 'pending' })}
                                            className="text-[#25D366] focus:ring-0 cursor-pointer"
                                        />
                                        <div>
                                            <p className="text-xs font-bold text-white uppercase text-yellow-400">Enviar p/ Assinatura</p>
                                            <p className="text-[10px] text-slate-400">Gera o link de assinatura imediata.</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Botões do Formulário */}
                            <div className="flex gap-4 pt-4 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-4 rounded-xl transition-all uppercase tracking-widest text-xs"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || isUploading}
                                    className="flex-1 bg-gradient-to-r from-[#25D366] to-green-600 text-black font-black py-4 rounded-xl shadow-xl flex items-center justify-center gap-2 uppercase tracking-widest text-xs transition-all disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    Salvar Contrato
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

            {/* DETAIL MODAL */}
            {showDetailModal && selectedContract && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
                    <div className="absolute inset-0" onClick={() => setShowDetailModal(false)}></div>
                    <div className="bg-[#0F172A] border border-white/10 rounded-[32px] p-8 w-full max-w-3xl z-10 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">

                        <button onClick={() => setShowDetailModal(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white bg-white/5 rounded-xl transition-all">
                            <X size={18} />
                        </button>

                        <div className="mb-6 flex justify-between items-start gap-4 flex-wrap">
                            <div>
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Detalhes do Contrato</span>
                                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mt-1">{selectedContract.title}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                {getStatusBadge(selectedContract.status)}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Infos do Cliente, Assinatura, Auditoria */}
                            <div className="lg:col-span-1 space-y-4">
                                <div className="bg-[#0b0f19] border border-white/5 p-5 rounded-2xl space-y-3">
                                    <h4 className="text-xs font-black text-[#25D366] uppercase tracking-wider">Signatário (Cliente)</h4>
                                    <div className="text-sm">
                                        <p className="text-slate-500 text-[10px] font-bold uppercase">Nome</p>
                                        <p className="text-white font-medium">{selectedContract.client_name || '-'}</p>
                                    </div>
                                    <div className="text-sm">
                                        <p className="text-slate-500 text-[10px] font-bold uppercase">E-mail</p>
                                        <p className="text-white font-medium break-all">{selectedContract.client_email || '-'}</p>
                                    </div>
                                    <div className="text-sm">
                                        <p className="text-slate-500 text-[10px] font-bold uppercase">CPF / CNPJ</p>
                                        <p className="text-white font-mono font-medium">{selectedContract.client_document || '-'}</p>
                                    </div>
                                </div>

                                {selectedContract.status === 'signed' && (
                                    <div className="bg-[#25D366]/5 border border-[#25D366]/20 p-5 rounded-2xl space-y-3">
                                        <h4 className="text-xs font-black text-[#25D366] uppercase tracking-wider flex items-center gap-1.5">
                                            <CheckCircle2 size={14} /> Selo de Autenticidade
                                        </h4>

                                        <div className="text-[11px] space-y-2 text-slate-400">
                                            <div>
                                                <p className="text-slate-500 text-[9px] font-bold uppercase">Assinado em</p>
                                                <p className="text-slate-200 font-semibold">
                                                    {format(new Date(selectedContract.signed_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 text-[9px] font-bold uppercase">Endereço IP</p>
                                                <p className="text-slate-200 font-semibold font-mono">{selectedContract.signed_ip}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 text-[9px] font-bold uppercase">Assinatura Digital Hash</p>
                                                <p className="text-blue-400 font-semibold font-mono break-all leading-normal text-[10px] bg-black/40 p-2 rounded border border-white/5">
                                                    {selectedContract.signed_hash}
                                                </p>
                                            </div>
                                        </div>

                                        {selectedContract.signature_url && (
                                            <div className="pt-2">
                                                <p className="text-slate-500 text-[9px] font-bold uppercase mb-1">Rubrica Eletrônica</p>
                                                <div className="bg-white rounded-xl p-2 h-20 flex items-center justify-center border border-white/10">
                                                    <img src={selectedContract.signature_url} alt="Assinatura" className="max-h-full object-contain filter invert" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedContract.status === 'draft' && (
                                    <button
                                        onClick={() => updateStatus(selectedContract, 'pending')}
                                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-black py-3 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                                    >
                                        <RefreshCw size={14} /> Publicar P/ Assinatura
                                    </button>
                                )}

                                {selectedContract.status === 'pending' && (
                                    <button
                                        onClick={() => copySignatureLink(selectedContract.id)}
                                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg"
                                    >
                                        <Copy size={14} /> Copiar Link Assinatura
                                    </button>
                                )}

                                {selectedContract.status !== 'canceled' && selectedContract.status !== 'signed' && (
                                    <button
                                        onClick={() => updateStatus(selectedContract, 'canceled')}
                                        className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-all"
                                    >
                                        Cancelar Contrato
                                    </button>
                                )}
                            </div>

                            {/* Conteúdo do Contrato */}
                            <div className="lg:col-span-2 space-y-4">
                                <div className="bg-black/30 border border-white/10 rounded-2xl p-6 h-96 overflow-y-auto custom-scrollbar flex flex-col justify-between">
                                    <div>
                                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Visualização dos Termos</h4>

                                        {selectedContract.file_url ? (
                                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                                <FileText className="text-[#25D366] mb-4" size={48} />
                                                <p className="text-sm font-semibold text-slate-350">Contrato PDF / Arquivo Submetido</p>
                                                <p className="text-xs text-slate-500 mt-1">Este contrato foi carregado como arquivo.</p>
                                                <a
                                                    href={selectedContract.file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-4 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                                                >
                                                    Visualizar Documento Upload <ExternalLink size={12} />
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                                                {selectedContract.content || 'Nenhum termo cadastrado.'}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowDetailModal(false)}
                                        className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-3.5 rounded-xl transition-all uppercase tracking-widest text-xs"
                                    >
                                        Fechar
                                    </button>

                                    {selectedContract.status !== 'signed' && (
                                        <button
                                            type="button"
                                            onClick={() => { handleDelete(selectedContract.id); }}
                                            className="bg-red-500 hover:bg-red-600 text-white font-black px-6 py-3.5 rounded-xl transition-all uppercase tracking-widest text-xs flex items-center gap-2"
                                        >
                                            <Trash2 size={16} /> Excluir
                                        </button>
                                    )}
                                </div>
                            </div>

                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}
