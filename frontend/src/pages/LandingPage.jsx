import React from 'react';
import { Bot, MessageSquare, Shield, Zap, Sparkles, CheckCircle2, ArrowRight, Brain, Search, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroImage from '../assets/hero.png';
import logoImage from '../assets/logo.png';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-[#25D366]/30 overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#020617]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center overflow-hidden">
              <img src={logoImage} className="w-full h-full object-cover" alt="Logo" />
            </div>
            <span className="text-2xl font-black tracking-tighter">Evoluir <span className="text-[#25D366]">Mais</span></span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-[#25D366] transition-colors">Funcionalidades</a>
            <a href="#ai" className="hover:text-[#25D366] transition-colors">Inteligência Artificial</a>
            <a href="#security" className="hover:text-[#25D366] transition-colors">Segurança</a>
          </div>

          <Link to="/login" className="bg-white/5 hover:bg-white/10 text-white px-6 py-2.5 rounded-full font-bold transition-all border border-white/10">
            Acessar Painel
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[600px] bg-[#25D366]/10 rounded-full blur-[120px] -z-10 opacity-50"></div>
        
        <div className="max-w-7xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-xs font-black uppercase tracking-widest animate-pulse">
            <Sparkles size={14} /> Nova Era do Atendimento
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9] max-w-4xl mx-auto">
            Sua Empresa com <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#25D366] to-blue-400">Super Poderes.</span>
          </h1>
          
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            A única plataforma de WhatsApp que integra Busca Semântica e Aprendizado Contínuo para transformar conversas em resultados reais.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Link to="/login" className="bg-[#25D366] text-slate-900 px-10 py-5 rounded-2xl font-black text-xl flex items-center gap-3 shadow-[0_0_30px_rgba(37,211,102,0.4)] hover:shadow-[0_0_50px_rgba(37,211,102,0.6)] transition-all transform hover:-translate-y-1">
              Começar Agora <ArrowRight size={24} />
            </Link>
            <button className="bg-white/5 border border-white/10 text-white px-10 py-5 rounded-2xl font-black text-xl hover:bg-white/10 transition-all">
              Ver Demonstração
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6 bg-[#03081c]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-panel p-10 space-y-6 hover:border-[#25D366]/50 transition-all group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <Brain size={32} />
              </div>
              <h3 className="text-2xl font-black">Aprendizado Autônomo</h3>
              <p className="text-slate-400 leading-relaxed">Nossa IA analisa cada interação para aprender preferências dos clientes, horários e dores, criando um perfil de atendimento único para seu negócio.</p>
            </div>

            <div className="glass-panel p-10 space-y-6 hover:border-blue-500/50 transition-all group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <Cpu size={32} />
              </div>
              <h3 className="text-2xl font-black">Agentes Ilimitados</h3>
              <p className="text-slate-400 leading-relaxed">Cada empresa pode gerenciar múltiplos números de WhatsApp com personalidades e funções únicas.</p>
            </div>

            <div className="glass-panel p-10 space-y-6 hover:border-purple-500/50 transition-all group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <Search size={32} />
              </div>
              <h3 className="text-2xl font-black">Busca Semântica (RAG)</h3>
              <p className="text-slate-400 leading-relaxed">Injete manuais técnicos, PDFs e notas. A IA entende o contexto e responde com precisão absoluta, como um técnico sênior da sua empresa.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quality Section */}
      <section id="ai" className="py-32 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
            <h2 className="text-5xl font-black tracking-tight">Qualidade que seu cliente <span className="text-[#25D366]">sente na hora.</span></h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="mt-1 text-[#25D366]"><CheckCircle2 size={20} /></div>
                <div>
                  <h4 className="font-bold text-lg">Respostas Multimodais</h4>
                  <p className="text-slate-400 text-sm">Transcreve áudios recebidos e responde com voz humana nativa (OGG Opus).</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="mt-1 text-[#25D366]"><CheckCircle2 size={20} /></div>
                <div>
                  <h4 className="font-bold text-lg">Praticidade Operacional</h4>
                  <p className="text-slate-400 text-sm">Deixe a IA resolver dúvidas técnicas complexas enquanto você foca no fechamento.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 glass-panel p-2 aspect-video bg-gradient-to-br from-[#25D366]/20 to-blue-500/20 relative overflow-hidden flex items-center justify-center">
             <img src={heroImage} alt="Evoluir Mais AI Dashboard" className="w-full h-full object-cover rounded-xl opacity-90 hover:opacity-100 transition-opacity duration-300" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-32 px-6 border-y border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          <div>
            <div className="text-5xl font-black text-[#25D366] mb-2">99.9%</div>
            <div className="text-slate-500 font-bold uppercase tracking-widest text-xs">Acurácia de Resposta</div>
          </div>
          <div>
            <div className="text-5xl font-black text-[#25D366] mb-2">&lt; 3s</div>
            <div className="text-slate-500 font-bold uppercase tracking-widest text-xs">Tempo de Reação</div>
          </div>
          <div>
            <div className="text-5xl font-black text-[#25D366] mb-2">+100k</div>
            <div className="text-slate-500 font-bold uppercase tracking-widest text-xs">Itens de Conhecimento</div>
          </div>
          <div>
            <div className="text-5xl font-black text-[#25D366] mb-2">∞</div>
            <div className="text-slate-500 font-bold uppercase tracking-widest text-xs">Evolução Contínua</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5 text-center">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#25D366] flex items-center justify-center overflow-hidden">
              <img src={logoImage} className="w-full h-full object-cover" alt="Logo" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">Evoluir Mais</span>
          </div>
          <p className="text-slate-500 max-w-md mx-auto">
            Transformando o WhatsApp na ferramenta de inteligência suprema para o seu negócio.
          </p>
          <div className="pt-8 text-xs font-bold text-slate-600 uppercase tracking-widest">
            © 2026 Evoluir Mais • All Rights Reserved
          </div>
        </div>
      </footer>
    </div>
  );
}
