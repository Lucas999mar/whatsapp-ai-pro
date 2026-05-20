import React, { useState, useEffect } from 'react';
import api from '../api/api';
import {
    Users, UserPlus, Download, Upload, Search,
    Filter, MoreHorizontal, MessageSquare, Phone,
    RefreshCw, CheckCircle2, XCircle, X, Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[#1E293B] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-xl font-black text-white">{title}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-all"><X size={20} /></button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

export default function ContatosPage() {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newContact, setNewContact] = useState({ name: '', phone: '', email: '' });

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        try {
            setLoading(true);
            const res = await api.get('/crm/tickets');
            setContacts(res.data);
        } catch (err) {
            console.error('Erro ao buscar contatos:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (whatsappId) => {
        let number = whatsappId.split('__')[1]?.split('@')[0] || whatsappId.split('@')[0];
        let cleaned = number.replace(/\D/g, '');
        if (cleaned.length > 11 && cleaned.startsWith('27')) cleaned = cleaned.substring(2);
        if (cleaned.length === 11 || cleaned.length === 10) cleaned = '55' + cleaned;
        return '+' + cleaned;
    };

    const handleExport = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Nome,Telefone,Email\n"
            + contacts.map(c => `${c.contact_name || 'Sem Nome'},${c.whatsapp_id},${c.email || ''}`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "contatos_crm.csv");
        document.body.appendChild(link);
        link.click();
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.onchange = e => {
            alert('Funcionalidade de importação de arquivos em lote em processamento.');
        };
        input.click();
    };

    const handleSaveContact = async () => {
        if (!newContact.phone) return alert('Telefone é obrigatório');
        try {
            const cleanPhone = newContact.phone.replace(/\D/g, '');
            // Garante 55 se for Brasil
            const finalPhone = (cleanPhone.length === 11 || cleanPhone.length === 10) ? '55' + cleanPhone : cleanPhone;

            await api.post('/crm/kanban/cards', {
                name: newContact.name,
                whatsapp_id: finalPhone + '@s.whatsapp.net',
                column_id: 'default'
            });
            alert('Contato adicionado com sucesso!');
            setIsAddModalOpen(false);
            setNewContact({ name: '', phone: '', email: '' });
            fetchContacts();
        } catch (err) { alert('Erro ao salvar contato'); }
    };

    const filteredContacts = contacts.filter(c =>
        (c.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.whatsapp_id.includes(searchTerm)
    );

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-2">
                        <Users className="text-[#25D366]" /> Contatos
                    </h1>
                    <p className="text-slate-500 text-sm">Gerencie todos os contatos da sua empresa em um só lugar.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleExport} className="flex items-center gap-2 bg-white/5 text-slate-300 px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/10 transition-all border border-white/5">
                        <Download size={18} /> Exportar
                    </button>
                    <button onClick={handleImport} className="flex items-center gap-2 bg-white/5 text-slate-300 px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/10 transition-all border border-white/5">
                        <Upload size={18} /> Importar
                    </button>
                    <button onClick={fetchContacts} className="p-2 text-slate-400 hover:text-white transition-all"><RefreshCw size={20} /></button>
                    <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-[#6366F1] text-white px-4 py-2 rounded-xl text-sm font-black hover:brightness-110 shadow-lg shadow-indigo-500/20 transition-all">
                        <UserPlus size={18} /> Adicionar
                    </button>
                </div>
            </div>

            {/* MODAL ADICIONAR */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Novo Contato">
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Nome</label>
                        <input
                            type="text"
                            placeholder="Nome do contato"
                            className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-[#6366F1] outline-none transition-all"
                            value={newContact.name}
                            onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Telefone *</label>
                        <input
                            type="text"
                            placeholder="(62) 99999-9999"
                            className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-[#6366F1] outline-none transition-all"
                            value={newContact.phone}
                            onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Email</label>
                        <input
                            type="email"
                            placeholder="email@exemplo.com"
                            className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-[#6366F1] outline-none transition-all"
                            value={newContact.email}
                            onChange={e => setNewContact({ ...newContact, email: e.target.value })}
                        />
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest text-[10px]">Cancelar</button>
                        <button onClick={handleSaveContact} className="flex-1 py-3 bg-[#6366F1] text-white rounded-xl text-sm font-black hover:brightness-110 shadow-lg shadow-indigo-500/20 uppercase tracking-widest text-[10px]">Salvar</button>
                    </div>
                </div>
            </Modal>

            {/* STATS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total de Contatos', value: contacts.length, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
                    { label: 'Ativos', value: contacts.filter(c => c.status !== 'resolvido').length, icon: CheckCircle2, color: 'text-[#25D366]', bg: 'bg-[#25D366]/10' },
                    { label: 'Bloqueados', value: 0, icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' }
                ].map((stat, i) => (
                    <div key={i} className="bg-[#0F172A] border border-white/5 rounded-2xl p-6 flex items-center gap-4 shadow-xl">
                        <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shadow-inner`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                            <h3 className="text-2xl font-black text-white">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* TABLE SECTION */}
            <div className="bg-[#0F172A] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative flex-1 w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou telefone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-[#25D366] outline-none transition-all shadow-inner"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 text-slate-400 text-sm font-bold border border-white/10 px-4 py-2 rounded-xl hover:bg-white/5 transition-all">
                            <Filter size={18} /> Filtros
                        </button>
                        <select className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-400 outline-none focus:border-[#25D366]">
                            <option>10 por página</option>
                            <option>20 por página</option>
                            <option>50 por página</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <th className="px-6 py-4">Contato</th>
                                <th className="px-6 py-4">Telefone</th>
                                <th className="px-6 py-4">Etiquetas</th>
                                <th className="px-6 py-4">Criado em</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-20 text-center"><div className="w-8 h-8 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>
                            ) : filteredContacts.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500 italic">Nenhum contato encontrado.</td></tr>
                            ) : (
                                filteredContacts.map((contact) => (
                                    <tr key={contact.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-all group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center overflow-hidden shadow-lg">
                                                    {contact.contact_photo ? <img src={contact.contact_photo} className="w-full h-full object-cover" /> : <div className="font-black text-slate-500">{(contact.contact_name || 'C').charAt(0)}</div>}
                                                </div>
                                                <div>
                                                    <p className="font-black text-white text-sm group-hover:text-[#25D366] transition-colors">{contact.contact_name || 'Sem Nome'}</p>
                                                    <p className="text-[10px] text-slate-600 font-bold">{contact.whatsapp_id.split('@')[0]}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-black text-[#25D366]">
                                            {formatNumber(contact.whatsapp_id)}
                                        </td>
                                        <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-800 text-[10px] font-bold rounded-lg text-slate-400 border border-white/5">Geral</span></td>
                                        <td className="px-6 py-4 text-xs text-slate-400">{format(new Date(contact.created_at), 'dd/MM/yyyy')}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-2.5 py-1 bg-[#25D366]/10 text-[#25D366] text-[10px] font-black rounded-lg border border-[#25D366]/20 inline-flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#25D366]"></div>Ativo
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 hover:bg-white/5 rounded-lg text-slate-500 transition-all"><MoreHorizontal size={18} /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
