import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bot, Lock, User, Loader2, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(id, password);
    } catch (err) {
      setError('Credenciais inválidas ou conta desativada.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#25D366]/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 rounded-3xl bg-[#25D366]/10 border border-[#25D366]/20 mb-6 animate-bounce-slow">
            <Bot size={48} className="text-[#25D366]" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-3">WhatsApp <span className="text-[#25D366]">AI PRO</span></h1>
          <p className="text-slate-400 text-lg">A plataforma multi-agente definitiva para sua empresa.</p>
        </div>

        <div className="glass-panel p-8 space-y-6 border border-white/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#25D366] to-transparent opacity-50"></div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">ID da Empresa</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-[#25D366] transition-colors">
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="w-full bg-[#0F172A] border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white focus:outline-none focus:border-[#25D366]/50 transition-all placeholder-slate-600" 
                  placeholder="empresa_exemplo"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Senha de Acesso</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-[#25D366] transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0F172A] border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white focus:outline-none focus:border-[#25D366]/50 transition-all placeholder-slate-600" 
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm animate-shake">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#25D366] hover:bg-[#1DA851] text-slate-900 h-14 rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(37,211,102,0.3)] hover:shadow-[0_0_30px_rgba(37,211,102,0.5)] flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : <><Sparkles size={20} /> Entrar no Painel</>}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-slate-500 text-sm">
          Painel Administrativo v2.0 • Protegido por criptografia ponta a ponta
        </p>
      </div>
    </div>
  );
}
