import React, { useState, useEffect } from 'react';
import api from '../api/api';
import {
    X, Save, Loader2, Building2, User, Briefcase, CreditCard, Plus, Trash2,
    ChevronRight, ChevronLeft, CheckCircle2, Sparkles, FileSignature, DollarSign,
    Shield, Clock, AlertCircle, Package
} from 'lucide-react';

const STEPS = [
    { id: 1, title: 'Prestador', icon: Building2, desc: 'Seus dados' },
    { id: 2, title: 'Cliente', icon: User, desc: 'Dados do cliente' },
    { id: 3, title: 'Serviços', icon: Briefcase, desc: 'O que vai prestar' },
    { id: 4, title: 'Pagamento', icon: CreditCard, desc: 'Valores e forma' },
    { id: 5, title: 'Gerar', icon: Sparkles, desc: 'Revisar e gerar' },
];

const PRICE_TYPES = [
    { value: 'fixed', label: 'Valor Fixo (Único)' },
    { value: 'monthly', label: 'Mensalidade' },
    { value: 'hourly', label: 'Por Hora' },
    { value: 'per_project', label: 'Por Projeto' },
];

const PAYMENT_METHODS = [
    { value: 'pix', label: '⚡ PIX' },
    { value: 'boleto', label: '📄 Boleto Bancário' },
    { value: 'cartao', label: '💳 Cartão de Crédito' },
    { value: 'transferencia', label: '🏦 Transferência Bancária' },
    { value: 'dinheiro', label: '💵 Dinheiro' },
];

export default function ContractGeneratorModal({ onClose, onGenerated }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Provider profile
    const [provider, setProvider] = useState({
        company_name: '', cnpj_cpf: '', address: '', city: '', state: '', zip_code: '',
        phone: '', email: '', website: '', representative_name: '', representative_cpf: '', representative_role: ''
    });

    // Client data
    const [client, setClient] = useState({
        name: '', email: '', document: '', address: '', city: '', state: ''
    });

    // Services
    const [services, setServices] = useState([]);
    const [selectedServices, setSelectedServices] = useState([]);
    const [newService, setNewService] = useState({ name: '', description: '', price: '', price_type: 'fixed' });
    const [showAddService, setShowAddService] = useState(false);

    // Payment & terms
    const [payment, setPayment] = useState({
        method: 'pix', installments: 1, duration: 12, start_date: new Date().toISOString().split('T')[0],
        warranty_days: 30, additional_clauses: '', status: 'draft'
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [profileRes, servicesRes] = await Promise.all([
                api.get('/contracts/provider-profile').catch(() => ({ data: null })),
                api.get('/contracts/services').catch(() => ({ data: [] }))
            ]);
            if (profileRes.data) setProvider(profileRes.data);
            setServices(servicesRes.data || []);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const saveProvider = async () => {
        if (!provider.company_name) { alert('Nome da empresa é obrigatório!'); return false; }
        setSaving(true);
        try {
            await api.post('/contracts/provider-profile', provider);
            return true;
        } catch (err) { alert('Erro ao salvar perfil: ' + (err.response?.data?.error || err.message)); return false; }
        finally { setSaving(false); }
    };

    const addService = async () => {
        if (!newService.name) return;
        try {
            const res = await api.post('/contracts/services', { ...newService, price: parseFloat(newService.price) || 0 });
            setServices(prev => [res.data, ...prev]);
            setNewService({ name: '', description: '', price: '', price_type: 'fixed' });
            setShowAddService(false);
        } catch (err) { alert('Erro ao adicionar serviço'); }
    };

    const deleteService = async (id) => {
        try {
            await api.delete(`/contracts/services/${id}`);
            setServices(prev => prev.filter(s => s.id !== id));
            setSelectedServices(prev => prev.filter(s => s.id !== id));
        } catch (err) { alert('Erro ao excluir serviço'); }
    };

    const toggleService = (service) => {
        setSelectedServices(prev => {
            const exists = prev.find(s => s.id === service.id);
            return exists ? prev.filter(s => s.id !== service.id) : [...prev, service];
        });
    };

    const totalValue = selectedServices.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);

    const handleNext = async () => {
        if (step === 1) { const ok = await saveProvider(); if (!ok) return; }
        if (step === 2 && !client.name) { alert('Nome do cliente é obrigatório!'); return; }
        if (step === 3 && selectedServices.length === 0) { alert('Selecione pelo menos um serviço!'); return; }
        setStep(s => Math.min(s + 1, 5));
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await api.post('/contracts/generate', {
                client_name: client.name,
                client_email: client.email,
                client_document: client.document,
                client_address: client.address,
                client_city: client.city,
                client_state: client.state,
                selected_services: selectedServices,
                payment_method: payment.method,
                payment_installments: parseInt(payment.installments) || 1,
                contract_duration: parseInt(payment.duration) || 12,
                start_date: payment.start_date,
                warranty_days: parseInt(payment.warranty_days) || 30,
                additional_clauses: payment.additional_clauses,
                status: payment.status
            });
            onGenerated(res.data);
            onClose();
        } catch (err) {
            alert('Erro ao gerar contrato: ' + (err.response?.data?.error || err.message));
        } finally { setGenerating(false); }
    };

    const inputClass = "w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-semibold text-sm outline-none focus:border-[#25D366] transition-colors placeholder:text-slate-600";
    const labelClass = "text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block mb-1.5";

    if (loading) return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-[#25D366]" size={40} />
                <p className="text-sm text-slate-400 font-black uppercase tracking-widest">Carregando gerador...</p>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="absolute inset-0" onClick={onClose}></div>
            <div className="bg-[#0F172A] border border-white/10 rounded-[32px] w-full max-w-4xl z-10 shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden">

                {/* HEADER */}
                <div className="p-6 pb-4 border-b border-white/5 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-white flex items-center gap-2 uppercase italic tracking-tighter">
                            <FileSignature className="text-[#25D366]" size={24} /> Gerador de Contratos
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Preencha os dados e gere um contrato profissional automaticamente</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-xl transition-all"><X size={18} /></button>
                </div>

                {/* STEPPER */}
                <div className="px-6 py-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center justify-between gap-1">
                        {STEPS.map((s, i) => (
                            <React.Fragment key={s.id}>
                                <button onClick={() => s.id < step && setStep(s.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${step === s.id ? 'bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30' : step > s.id ? 'bg-[#25D366]/5 text-[#25D366]/60 cursor-pointer' : 'bg-white/5 text-slate-500'}`}>
                                    <s.icon size={14} />
                                    <span className="hidden md:inline">{s.title}</span>
                                </button>
                                {i < STEPS.length - 1 && <ChevronRight size={14} className="text-slate-600 shrink-0" />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">

                    {/* STEP 1: PROVIDER */}
                    {step === 1 && (
                        <div className="space-y-5 animate-fade-in">
                            <div className="flex items-center gap-2 mb-2">
                                <Building2 className="text-[#25D366]" size={20} />
                                <h4 className="text-sm font-black text-white uppercase tracking-wider">Dados do Prestador de Serviço</h4>
                            </div>
                            <p className="text-xs text-slate-400 -mt-3">Cadastre os dados da sua empresa ou perfil profissional. Será salvo para reutilizar em futuros contratos.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2"><label className={labelClass}>Razão Social / Nome *</label><input value={provider.company_name} onChange={e => setProvider({ ...provider, company_name: e.target.value })} placeholder="Minha Empresa Ltda" className={inputClass} required /></div>
                                <div><label className={labelClass}>CNPJ / CPF</label><input value={provider.cnpj_cpf || ''} onChange={e => setProvider({ ...provider, cnpj_cpf: e.target.value })} placeholder="00.000.000/0001-00" className={inputClass} /></div>
                                <div><label className={labelClass}>Telefone</label><input value={provider.phone || ''} onChange={e => setProvider({ ...provider, phone: e.target.value })} placeholder="(00) 00000-0000" className={inputClass} /></div>
                                <div><label className={labelClass}>E-mail</label><input value={provider.email || ''} onChange={e => setProvider({ ...provider, email: e.target.value })} placeholder="contato@empresa.com" className={inputClass} /></div>
                                <div><label className={labelClass}>Website</label><input value={provider.website || ''} onChange={e => setProvider({ ...provider, website: e.target.value })} placeholder="www.empresa.com" className={inputClass} /></div>
                                <div className="md:col-span-2"><label className={labelClass}>Endereço</label><input value={provider.address || ''} onChange={e => setProvider({ ...provider, address: e.target.value })} placeholder="Rua Exemplo, 123, Sala 1" className={inputClass} /></div>
                                <div><label className={labelClass}>Cidade</label><input value={provider.city || ''} onChange={e => setProvider({ ...provider, city: e.target.value })} placeholder="São Paulo" className={inputClass} /></div>
                                <div><label className={labelClass}>Estado (UF)</label><input value={provider.state || ''} onChange={e => setProvider({ ...provider, state: e.target.value })} placeholder="SP" className={inputClass} /></div>
                                <div><label className={labelClass}>CEP</label><input value={provider.zip_code || ''} onChange={e => setProvider({ ...provider, zip_code: e.target.value })} placeholder="00000-000" className={inputClass} /></div>
                            </div>

                            <div className="bg-[#0b0f19] border border-white/5 rounded-2xl p-4 space-y-4">
                                <span className="text-[10px] font-black text-[#25D366] uppercase tracking-widest">Representante Legal (Opcional)</span>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div><label className={labelClass}>Nome</label><input value={provider.representative_name || ''} onChange={e => setProvider({ ...provider, representative_name: e.target.value })} placeholder="João Silva" className={inputClass} /></div>
                                    <div><label className={labelClass}>CPF</label><input value={provider.representative_cpf || ''} onChange={e => setProvider({ ...provider, representative_cpf: e.target.value })} placeholder="000.000.000-00" className={inputClass} /></div>
                                    <div><label className={labelClass}>Cargo</label><input value={provider.representative_role || ''} onChange={e => setProvider({ ...provider, representative_role: e.target.value })} placeholder="Sócio-Administrador" className={inputClass} /></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: CLIENT */}
                    {step === 2 && (
                        <div className="space-y-5 animate-fade-in">
                            <div className="flex items-center gap-2 mb-2"><User className="text-blue-400" size={20} /><h4 className="text-sm font-black text-white uppercase tracking-wider">Dados do Cliente (Contratante)</h4></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2"><label className={labelClass}>Nome / Razão Social *</label><input value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} placeholder="Nome do cliente ou empresa" className={inputClass} required /></div>
                                <div><label className={labelClass}>CPF / CNPJ</label><input value={client.document} onChange={e => setClient({ ...client, document: e.target.value })} placeholder="000.000.000-00" className={inputClass} /></div>
                                <div><label className={labelClass}>E-mail</label><input value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} placeholder="cliente@email.com" className={inputClass} /></div>
                                <div className="md:col-span-2"><label className={labelClass}>Endereço</label><input value={client.address} onChange={e => setClient({ ...client, address: e.target.value })} placeholder="Rua, número, bairro" className={inputClass} /></div>
                                <div><label className={labelClass}>Cidade</label><input value={client.city} onChange={e => setClient({ ...client, city: e.target.value })} placeholder="São Paulo" className={inputClass} /></div>
                                <div><label className={labelClass}>Estado (UF)</label><input value={client.state} onChange={e => setClient({ ...client, state: e.target.value })} placeholder="SP" className={inputClass} /></div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: SERVICES */}
                    {step === 3 && (
                        <div className="space-y-5 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2"><Briefcase className="text-purple-400" size={20} /><h4 className="text-sm font-black text-white uppercase tracking-wider">Serviços a Prestar</h4></div>
                                <button onClick={() => setShowAddService(true)} className="bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border border-[#25D366]/20 transition-all"><Plus size={14} /> Novo Serviço</button>
                            </div>

                            {showAddService && (
                                <div className="bg-[#0b0f19] border border-[#25D366]/20 rounded-2xl p-4 space-y-3 animate-fade-in">
                                    <span className="text-[10px] font-black text-[#25D366] uppercase tracking-widest">Cadastrar Serviço</span>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                        <div className="md:col-span-2"><input value={newService.name} onChange={e => setNewService({ ...newService, name: e.target.value })} placeholder="Nome do serviço *" className={inputClass} /></div>
                                        <div><input type="number" step="0.01" value={newService.price} onChange={e => setNewService({ ...newService, price: e.target.value })} placeholder="Valor (R$)" className={inputClass} /></div>
                                        <div><select value={newService.price_type} onChange={e => setNewService({ ...newService, price_type: e.target.value })} className={inputClass}>{PRICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                                    </div>
                                    <div><input value={newService.description} onChange={e => setNewService({ ...newService, description: e.target.value })} placeholder="Descrição breve (opcional)" className={inputClass} /></div>
                                    <div className="flex gap-2">
                                        <button onClick={addService} className="bg-[#25D366] text-slate-900 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5"><Save size={14} /> Salvar</button>
                                        <button onClick={() => setShowAddService(false)} className="bg-white/5 text-white px-4 py-2 rounded-xl text-xs font-black">Cancelar</button>
                                    </div>
                                </div>
                            )}

                            {services.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl"><Package className="mx-auto text-slate-600 mb-3" size={36} /><p className="text-sm text-slate-400 font-semibold">Nenhum serviço cadastrado</p><p className="text-xs text-slate-500 mt-1">Clique em "Novo Serviço" para cadastrar</p></div>
                            ) : (
                                <div className="space-y-2">
                                    {services.map(s => {
                                        const isSelected = selectedServices.find(ss => ss.id === s.id);
                                        return (
                                            <div key={s.id} onClick={() => toggleService(s)}
                                                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-[#25D366]/10 border-[#25D366]/30 shadow-[0_0_10px_rgba(37,211,102,0.1)]' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#25D366] border-[#25D366]' : 'border-slate-600'}`}>
                                                        {isSelected && <CheckCircle2 size={12} className="text-slate-900" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{s.name}</p>
                                                        {s.description && <p className="text-xs text-slate-400">{s.description}</p>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-[#25D366]">R$ {parseFloat(s.price || 0).toFixed(2)}</p>
                                                        <p className="text-[10px] text-slate-500 uppercase">{PRICE_TYPES.find(t => t.value === s.price_type)?.label || s.price_type}</p>
                                                    </div>
                                                    <button onClick={(e) => { e.stopPropagation(); deleteService(s.id); }} className="p-1.5 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {selectedServices.length > 0 && (
                                <div className="bg-[#25D366]/5 border border-[#25D366]/20 p-4 rounded-xl flex items-center justify-between">
                                    <span className="text-xs font-black text-white uppercase tracking-wider">{selectedServices.length} serviço(s) selecionado(s)</span>
                                    <span className="text-lg font-black text-[#25D366]">R$ {totalValue.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 4: PAYMENT */}
                    {step === 4 && (
                        <div className="space-y-5 animate-fade-in">
                            <div className="flex items-center gap-2 mb-2"><CreditCard className="text-yellow-400" size={20} /><h4 className="text-sm font-black text-white uppercase tracking-wider">Condições de Pagamento e Termos</h4></div>

                            <div className="bg-[#25D366]/5 border border-[#25D366]/20 p-4 rounded-xl text-center">
                                <p className="text-xs text-slate-400 uppercase font-black tracking-wider">Valor Total do Contrato</p>
                                <p className="text-3xl font-black text-[#25D366] mt-1">R$ {totalValue.toFixed(2)}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className={labelClass}>Forma de Pagamento</label><select value={payment.method} onChange={e => setPayment({ ...payment, method: e.target.value })} className={inputClass}>{PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
                                <div><label className={labelClass}>Parcelas</label><select value={payment.installments} onChange={e => setPayment({ ...payment, installments: e.target.value })} className={inputClass}>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => <option key={n} value={n}>{n}x {n > 1 ? `de R$ ${(totalValue / n).toFixed(2)}` : '(à vista)'}</option>)}</select></div>
                                <div><label className={labelClass}>Duração do Contrato (Meses)</label><select value={payment.duration} onChange={e => setPayment({ ...payment, duration: e.target.value })} className={inputClass}>{[1, 3, 6, 12, 24, 36].map(n => <option key={n} value={n}>{n} {n === 1 ? 'mês' : 'meses'}</option>)}</select></div>
                                <div><label className={labelClass}>Data de Início</label><input type="date" value={payment.start_date} onChange={e => setPayment({ ...payment, start_date: e.target.value })} className={inputClass} /></div>
                                <div><label className={labelClass}>Garantia (Dias)</label><select value={payment.warranty_days} onChange={e => setPayment({ ...payment, warranty_days: e.target.value })} className={inputClass}><option value="15">15 dias</option><option value="30">30 dias</option><option value="60">60 dias</option><option value="90">90 dias</option></select></div>
                            </div>

                            <div><label className={labelClass}>Cláusulas Adicionais (Opcional)</label><textarea rows="3" value={payment.additional_clauses} onChange={e => setPayment({ ...payment, additional_clauses: e.target.value })} placeholder="Digite cláusulas específicas que deseja incluir no contrato..." className={inputClass} /></div>
                        </div>
                    )}

                    {/* STEP 5: REVIEW */}
                    {step === 5 && (
                        <div className="space-y-5 animate-fade-in">
                            <div className="flex items-center gap-2 mb-2"><Sparkles className="text-[#25D366]" size={20} /><h4 className="text-sm font-black text-white uppercase tracking-wider">Revisão Final</h4></div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-[#0b0f19] border border-white/5 p-4 rounded-2xl space-y-2">
                                    <h5 className="text-[10px] font-black text-[#25D366] uppercase tracking-widest flex items-center gap-1.5"><Building2 size={12} /> Contratada</h5>
                                    <p className="text-sm font-bold text-white">{provider.company_name}</p>
                                    {provider.cnpj_cpf && <p className="text-xs text-slate-400 font-mono">{provider.cnpj_cpf}</p>}
                                </div>
                                <div className="bg-[#0b0f19] border border-white/5 p-4 rounded-2xl space-y-2">
                                    <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5"><User size={12} /> Contratante</h5>
                                    <p className="text-sm font-bold text-white">{client.name}</p>
                                    {client.document && <p className="text-xs text-slate-400 font-mono">{client.document}</p>}
                                </div>
                            </div>

                            <div className="bg-[#0b0f19] border border-white/5 p-4 rounded-2xl space-y-2">
                                <h5 className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1.5"><Briefcase size={12} /> Serviços ({selectedServices.length})</h5>
                                {selectedServices.map(s => (
                                    <div key={s.id} className="flex justify-between text-sm border-b border-white/5 pb-1">
                                        <span className="text-slate-300">{s.name}</span>
                                        <span className="text-[#25D366] font-bold">R$ {parseFloat(s.price).toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-sm font-black pt-2"><span className="text-white">TOTAL</span><span className="text-[#25D366] text-lg">R$ {totalValue.toFixed(2)}</span></div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-black/30 border border-white/5 p-3 rounded-xl text-center"><DollarSign size={16} className="text-yellow-400 mx-auto mb-1" /><p className="text-[9px] text-slate-500 uppercase font-bold">Pagamento</p><p className="text-xs text-white font-bold">{PAYMENT_METHODS.find(m => m.value === payment.method)?.label}</p></div>
                                <div className="bg-black/30 border border-white/5 p-3 rounded-xl text-center"><CreditCard size={16} className="text-blue-400 mx-auto mb-1" /><p className="text-[9px] text-slate-500 uppercase font-bold">Parcelas</p><p className="text-xs text-white font-bold">{payment.installments}x</p></div>
                                <div className="bg-black/30 border border-white/5 p-3 rounded-xl text-center"><Clock size={16} className="text-purple-400 mx-auto mb-1" /><p className="text-[9px] text-slate-500 uppercase font-bold">Duração</p><p className="text-xs text-white font-bold">{payment.duration} meses</p></div>
                                <div className="bg-black/30 border border-white/5 p-3 rounded-xl text-center"><Shield size={16} className="text-green-400 mx-auto mb-1" /><p className="text-[9px] text-slate-500 uppercase font-bold">Garantia</p><p className="text-xs text-white font-bold">{payment.warranty_days} dias</p></div>
                            </div>

                            <div className="space-y-2">
                                <label className={labelClass}>Status após geração</label>
                                <div className="flex gap-3">
                                    <label className={`flex-1 p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2 ${payment.status === 'draft' ? 'border-[#25D366] bg-[#25D366]/10' : 'border-white/10 bg-black/20'}`}>
                                        <input type="radio" checked={payment.status === 'draft'} onChange={() => setPayment({ ...payment, status: 'draft' })} className="hidden" />
                                        <span className="text-xs font-bold text-white">📝 Salvar como Rascunho</span>
                                    </label>
                                    <label className={`flex-1 p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2 ${payment.status === 'pending' ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/10 bg-black/20'}`}>
                                        <input type="radio" checked={payment.status === 'pending'} onChange={() => setPayment({ ...payment, status: 'pending' })} className="hidden" />
                                        <span className="text-xs font-bold text-white">📤 Enviar p/ Assinatura</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-6 pt-4 border-t border-white/5 flex justify-between gap-4 shrink-0">
                    {step > 1 ? (
                        <button onClick={() => setStep(s => s - 1)} className="bg-white/5 hover:bg-white/10 text-white font-black py-3.5 px-6 rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 transition-all"><ChevronLeft size={16} /> Voltar</button>
                    ) : (
                        <button onClick={onClose} className="bg-white/5 hover:bg-white/10 text-white font-black py-3.5 px-6 rounded-xl text-xs uppercase tracking-widest transition-all">Cancelar</button>
                    )}

                    {step < 5 ? (
                        <button onClick={handleNext} disabled={saving} className="bg-gradient-to-r from-[#25D366] to-green-600 text-black font-black py-3.5 px-8 rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl transition-all disabled:opacity-50 hover:-translate-y-0.5">
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <>Próximo <ChevronRight size={16} /></>}
                        </button>
                    ) : (
                        <button onClick={handleGenerate} disabled={generating} className="bg-gradient-to-r from-[#25D366] to-green-600 text-black font-black py-3.5 px-8 rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-[0_0_25px_rgba(37,211,102,0.3)] transition-all disabled:opacity-50 hover:-translate-y-0.5">
                            {generating ? <><Loader2 className="animate-spin" size={16} /> Gerando...</> : <><Sparkles size={16} /> Gerar Contrato</>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
