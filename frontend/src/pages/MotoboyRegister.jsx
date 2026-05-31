import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bike, User, Mail, Lock, Phone, CreditCard, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../api/api';

export default function MotoboyRegister() {
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        vehicle_type: 'moto',
        vehicle_plate: '',
        tenant_id: '' // O código da empresa/inquilino
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await api.post('/delivery/motoboy/register', form);
            // Salva token e user no session/localStorage para login automático
            sessionStorage.setItem('wa_pro_token', res.data.token);
            sessionStorage.setItem('wa_pro_user', JSON.stringify(res.data.user));
            setSuccess(true);
            setTimeout(() => navigate('/motoboy'), 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao realizar cadastro');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-6">
                <div className="bg-[#1E293B] border border-white/10 p-8 rounded-3xl text-center max-w-sm w-full animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-[#25D366]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="text-[#25D366]" size={48} />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">Bem-vindo ao Time!</h2>
                    <p className="text-slate-400">Seu cadastro foi realizado com sucesso. Redirecionando para o painel...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#25D366]/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex p-4 bg-[#25D366]/10 rounded-2xl mb-4">
                        <Bike className="text-[#25D366]" size={48} />
                    </div>
                    <h1 className="text-3xl font-black text-white">Seja um Entregador</h1>
                    <p className="text-slate-500 mt-2">Cadastre-se para começar a aceitar corridas em tempo real.</p>
                </div>

                <div className="bg-[#1E293B] border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold flex items-center gap-3">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="relative group">
                                <User className="absolute left-4 top-4 text-slate-500 group-focus-within:text-[#25D366] transition-colors" size={18} />
                                <input
                                    required
                                    className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 pl-12 text-white focus:outline-none focus:border-[#25D366]/30 focus:bg-black/40 transition-all"
                                    placeholder="Nome Completo"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </div>

                            <div className="relative group">
                                <Mail className="absolute left-4 top-4 text-slate-500 group-focus-within:text-[#25D366] transition-colors" size={18} />
                                <input
                                    required
                                    type="email"
                                    className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 pl-12 text-white focus:outline-none focus:border-[#25D366]/30 focus:bg-black/40 transition-all"
                                    placeholder="Email de Login"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-4 text-slate-500 group-focus-within:text-[#25D366] transition-colors" size={18} />
                                    <input
                                        required
                                        className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 pl-12 text-white focus:outline-none focus:border-[#25D366]/30 focus:bg-black/40 transition-all"
                                        placeholder="Telefone"
                                        value={form.phone}
                                        onChange={e => setForm({ ...form, phone: e.target.value })}
                                    />
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-4 text-slate-500 group-focus-within:text-[#25D366] transition-colors" size={18} />
                                    <input
                                        required
                                        type="password"
                                        className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 pl-12 text-white focus:outline-none focus:border-[#25D366]/30 focus:bg-black/40 transition-all"
                                        placeholder="Senha"
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <select
                                        className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-[#25D366]/30 transition-all appearance-none cursor-pointer"
                                        value={form.vehicle_type}
                                        onChange={e => setForm({ ...form, vehicle_type: e.target.value })}
                                    >
                                        <option value="moto">🚲 Moto</option>
                                        <option value="bicicleta">🚲 Bicicleta</option>
                                        <option value="carro">🚗 Carro</option>
                                    </select>
                                </div>
                                <div className="relative group">
                                    <CreditCard className="absolute left-4 top-4 text-slate-500 group-focus-within:text-[#25D366] transition-colors" size={18} />
                                    <input
                                        className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 pl-12 text-white focus:outline-none focus:border-[#25D366]/30 focus:bg-black/40 transition-all"
                                        placeholder="Placa (Opcional)"
                                        value={form.vehicle_plate}
                                        onChange={e => setForm({ ...form, vehicle_plate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="relative group">
                                <ArrowRight className="absolute left-4 top-4 text-slate-500 group-focus-within:text-[#25D366] transition-colors" size={18} />
                                <input
                                    required
                                    className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 pl-12 text-white focus:outline-none focus:border-[#21c25e]/30 focus:bg-black/40 transition-all font-mono placeholder:font-sans"
                                    placeholder="Código da Empresa (Tenant ID)"
                                    value={form.tenant_id}
                                    onChange={e => setForm({ ...form, tenant_id: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex items-start gap-3 px-2">
                            <input
                                type="checkbox"
                                id="terms"
                                required
                                className="mt-1 w-4 h-4 rounded border-white/10 bg-black/20 text-[#25D366] focus:ring-[#25D366]"
                            />
                            <label htmlFor="terms" className="text-xs text-slate-400 leading-relaxed cursor-pointer">
                                Li e aceito os <span className="text-[#25D366] font-bold">termos de uso</span> e a
                                política de privacidade da plataforma de entregas.
                            </label>
                        </div>

                        <button
                            disabled={loading}
                            className="w-full bg-[#25D366] text-black font-black py-5 rounded-2xl mt-6 flex items-center justify-center gap-3 shadow-xl shadow-[#25D366]/20 active:scale-95 transition-all hover:brightness-110 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={24} /> : (
                                <>CADASTRAR E COMEÇAR <ArrowRight size={20} /></>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-slate-500 text-sm mt-8">
                        Já tem uma conta? <Link to="/login" className="text-[#25D366] font-bold hover:underline">Fazer Login</Link>
                    </p>
                </div>

                <p className="text-center text-slate-600 text-[10px] uppercase font-black tracking-widest mt-8">
                    WhatsApp AI Pro • Delivery System v1.0
                </p>
            </div>
        </div>
    );
}
