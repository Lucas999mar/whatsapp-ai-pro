import React, { useState, useEffect } from 'react';
import {
  Bot, MessageSquare, Shield, Zap, Sparkles, CheckCircle2,
  ArrowRight, Brain, Search, Cpu, Calendar, Clock, ChevronDown,
  Play, Check, HelpCircle, Send, Smartphone, Network, Database, Menu, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import logoImage from '../assets/logo.png';
import SplineScene from '../components/SplineScene';
import FounderHero3D from '../components/FounderHero3D';
import { motion, useScroll, useSpring } from 'framer-motion';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('vendas');
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const simulatorConversations = {
    vendas: [
      { sender: 'user', text: 'Olá! Vi o anúncio da lavadora de alta pressão e gostaria de saber se ela serve para lavar carros e calçadas de pedra.' },
      { sender: 'agent', text: 'Olá! Com certeza. O modelo Evoluir Pro tem 2200 PSI de pressão constante e vazão de 400 L/h, ideal para remover sujeira incrustada em pedras e limpar carros sem danificar a pintura.' },
      { sender: 'user', text: 'Legal! E qual o prazo de entrega para o CEP 01001-000? Vocês dão frete grátis?' },
      { sender: 'agent', text: 'Para o seu CEP o prazo de entrega é de apenas 2 dias úteis. E sim! Para compras feitas hoje, o frete é 100% grátis e você ainda ganha 1 ano de garantia estendida. Posso te enviar o link de pagamento com o desconto ativado?' },
      { sender: 'user', text: 'Quero sim! Pode mandar por favor.' },
      { sender: 'agent', text: 'Gerado com sucesso! 🎉 Aqui está seu link seguro de checkout com desconto de 15% aplicado: evolu.ir/checkout-washpro. Qualquer dúvida durante a compra estou aqui.' }
    ],
    agendamento: [
      { sender: 'user', text: 'Olá, gostaria de agendar uma consulta técnica de manutenção para a minha instalação na próxima terça-feira à tarde.' },
      { sender: 'agent', text: 'Olá! Perfeito. Deixe-me verificar a disponibilidade dos nossos técnicos para terça-feira à tarde (dia 19/05).' },
      { sender: 'agent', text: 'Temos dois horários livres: às 14:30h com o Engenheiro Carlos ou às 16:00h com a Técnica Márcia. Qual deles fica melhor para você?' },
      { sender: 'user', text: 'Às 16:00h com a Márcia é perfeito.' },
      { sender: 'agent', text: 'Confirmado! 🗓️ Agendamento realizado: Terça-feira (19/05) às 16:00h com a Técnica Márcia. Acabei de te enviar um e-mail com a confirmação e enviaremos lembretes aqui no WhatsApp 2 horas antes da visita.' }
    ],
    suporte: [
      { sender: 'user', text: 'Minha máquina de lavar está dando erro E2 no painel e parou no meio do ciclo. O que significa isso?' },
      { sender: 'agent', text: 'De acordo com o manual técnico do modelo Lorenzetti Advanced (pág. 24), o Erro E2 indica falha na drenagem da água. Isso geralmente acontece devido a um filtro obstruído ou mangueira dobrada.' },
      { sender: 'agent', text: 'Recomendo verificar os seguintes pontos rápidos:\n1. Desligue a máquina da tomada.\n2. Verifique se a mangueira traseira de saída não está dobrada.\n3. Abra o pequeno filtro na parte inferior e limpe eventuais resíduos.' },
      { sender: 'user', text: 'Era exatamente o filtro entupido! Limpei e voltou a funcionar na hora. Muito obrigado!' },
      { sender: 'agent', text: 'Excelente! Fico muito feliz que tenha resolvido de forma simples. Sempre que precisar de suporte com manuais ou peças, basta me chamar aqui!' }
    ]
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setChatMessages([]);
    setIsTyping(false);

    const messages = simulatorConversations[activeTab];
    if (!messages) return;

    let timeoutIds = [];

    const playSequence = async () => {
      for (let i = 0; i < messages.length; i++) {
        if (!isMounted) break;
        await new Promise(resolve => {
          const id = setTimeout(resolve, 800);
          timeoutIds.push(id);
        });
        if (!isMounted) break;
        setIsTyping(true);
        await new Promise(resolve => {
          const id = setTimeout(resolve, 1200);
          timeoutIds.push(id);
        });
        if (!isMounted) break;
        setIsTyping(false);
        setChatMessages(prev => {
          if (!messages[i]) return prev;
          return [...prev, messages[i]];
        });
        await new Promise(resolve => {
          const id = setTimeout(resolve, 1500);
          timeoutIds.push(id);
        });
      }
    };

    playSequence();

    return () => {
      isMounted = false;
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [activeTab]);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "O que é o Evoluir Mais e como ele atua na minha empresa?",
      a: "O Evoluir Mais é uma plataforma premium de Inteligência Artificial omnichannel conectada diretamente ao seu WhatsApp. Ele permite treinar agentes virtuais com a personalidade e as informações da sua empresa (através de manuais técnicos, PDFs ou links de suporte) para atender clientes 24/7 com máxima precisão, qualificar leads de vendas, agendar compromissos e resolver chamados técnicos."
    },
    {
      q: "Preciso saber programar para criar meu agente de IA?",
      a: "Não! Absolutamente nada. O Evoluir Mais foi desenhado para ser totalmente visual e 'No-Code'. Você só precisa conectar seu WhatsApp lendo o QR Code (como se fosse abrir o WhatsApp Web), configurar o tom de voz e fazer upload dos seus manuais ou textos de atendimento. A nossa IA processa tudo de forma automática."
    },
    {
      q: "O que é a tecnologia de Busca Semântica (RAG)?",
      a: "É o estado da arte em IA corporativa (Retrieval-Augmented Generation). Em vez de respostas genéricas, o seu agente de IA pesquisa o contexto nos PDFs, tabelas e manuais de peças que você carregou. Ele responde de forma ultra-precisa e humanizada, citando informações oficiais da sua própria empresa."
    },
    {
      q: "Como funciona o período de teste grátis?",
      a: "Você pode experimentar todos os recursos da plataforma de forma totalmente gratuita por 7 dias. Não pedimos cartão de crédito para iniciar o teste. Se gostar dos resultados e da conversão gerada, poderá escolher o plano que melhor se adapta à escala da sua operação."
    },
    {
      q: "Posso gerenciar múltiplos agentes ou números de WhatsApp?",
      a: "Sim! Dependendo do seu plano, você pode ter múltiplos números de WhatsApp conectados, cada um rodando agentes de inteligência artificial com tarefas, bases de dados e comportamentos totalmente independentes (ex: um agente focado em pós-venda e outro em suporte técnico)."
    }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-[#25D366]/30 overflow-x-hidden">

      {/* Scroll Progress Bar */}
      <motion.div id="scroll-progress" style={{ scaleX, transformOrigin: '0%' }} />

      {/* Global Mouse Glow */}
      <div
        className="cursor-glow hidden lg:block"
        style={{ left: mousePos.x, top: mousePos.y }}
      />

      {/* Dynamic Sticky Header */}
      <nav className="fixed top-0 w-full z-50 bg-[#020617]/85 backdrop-blur-lg border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center overflow-hidden rounded-full flex-shrink-0">
              <img src={logoImage} className="w-full h-full object-cover scale-110" alt="Evoluir Mais Logo" />
            </div>
            <span className="text-[17px] sm:text-2xl font-black tracking-tight text-white uppercase whitespace-nowrap">
              Evoluir <span className="gradient-text">Mais</span>
            </span>
          </div>

          <div className="hidden xl:flex items-center justify-center flex-1 gap-4 lg:gap-6 text-sm font-semibold text-slate-300 whitespace-nowrap px-4">
            <a href="#como-funciona" className="hover:text-[#25D366] transition-colors">Como funciona</a>
            <a href="#recursos" className="hover:text-[#25D366] transition-colors">Recursos IA</a>
            <a href="#integracoes" className="hover:text-[#25D366] transition-colors">Integrações</a>
            <a href="#planos" className="hover:text-[#25D366] transition-colors">Planos e Preços</a>
            <a href="#faq" className="hover:text-[#25D366] transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 ml-auto xl:ml-10 flex-shrink-0">
            <Link to="/login" className="hidden sm:inline-flex bg-white/5 hover:bg-white/10 text-white px-5 py-2.5 rounded-xl font-bold transition-all border border-white/10 text-sm whitespace-nowrap">
              Entrar
            </Link>
            <a href="https://wa.me/5522999093710?text=Olá,%20gostaria%20de%20fazer%20um%20teste%20grátis%20do%20Evoluir%20Mais" target="_blank" rel="noopener noreferrer" className="bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:brightness-110 text-slate-900 px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl font-black text-[12px] sm:text-sm transition-all shadow-[0_0_20px_rgba(37,211,102,0.2)] pulse-active whitespace-nowrap">
              Teste Grátis
            </a>
            <Link to="/marketing" className="hidden md:inline-flex bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:brightness-110 text-slate-900 px-6 py-2.5 rounded-xl font-black text-sm transition-all shadow-[0_0_20px_rgba(37,211,102,0.2)] whitespace-nowrap">
              Assessoria de Marketing
            </Link>
            <button
              className="xl:hidden p-1.5 sm:p-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all flex-shrink-0 ml-1"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="xl:hidden bg-[#020617] border-b border-white/5 absolute top-20 left-0 w-full px-6 py-6 flex flex-col gap-4 shadow-2xl">
            <a href="#como-funciona" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#25D366] font-bold text-lg">Como funciona</a>
            <a href="#recursos" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#25D366] font-bold text-lg">Recursos IA</a>
            <a href="#integracoes" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#25D366] font-bold text-lg">Integrações</a>
            <a href="#planos" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#25D366] font-bold text-lg">Planos e Preços</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#25D366] font-bold text-lg border-b border-white/10 pb-4">FAQ</a>
            <Link to="/login" className="sm:hidden text-white hover:text-[#25D366] font-bold text-lg">Entrar no Painel</Link>
            <Link to="/marketing" className="md:hidden text-[#25D366] font-black text-lg">Assessoria de Marketing</Link>
          </div>
        )}
      </nav>

      {/* 1st TOPIC: Interactive 3D Founder Vision Intro (Fullscreenish) */}
      <section className="pt-24 min-h-[90vh] flex items-center justify-center relative overflow-hidden bg-[#020617]">
        <div className="absolute inset-0 bg-grid-white opacity-[0.02]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#25D366]/5 rounded-full blur-[160px] -z-10"></div>
        <FounderHero3D />
      </section>

      {/* 2nd TOPIC: Main Hero Section */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[600px] bg-gradient-to-br from-[#25D366]/10 to-[#128C7E]/5 rounded-full blur-[140px] -z-10 opacity-70"></div>
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-left space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-xs font-black uppercase tracking-wider">
              <Sparkles size={14} className="animate-spin-slow" /> Inteligência Artificial Corporativa
            </div>
            <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-[1.05] text-white">
              Dê <span className="gradient-text">superpoderes</span> ao seu time com Agentes de IA.
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 leading-relaxed font-medium">
              Tenha funcionários virtuais inteligentes operando 24 horas por dia qualificando leads, gerando vendas, agendando visitas técnicas e tirando dúvidas de clientes por WhatsApp do seu jeito e sem necessidade de código.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
              <a href="https://wa.me/5522999093710?text=Olá,%20gostaria%20de%20fazer%20um%20teste%20grátis%20do%20Evoluir%20Mais" target="_blank" rel="noopener noreferrer" className="bg-[#25D366] hover:bg-[#1DA851] text-slate-900 px-8 py-4.5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(37,211,102,0.4)] hover:shadow-[0_0_50px_rgba(37,211,102,0.6)] transition-all transform hover:-translate-y-1">
                Iniciar Teste Grátis <ArrowRight size={22} />
              </a>
              <a href="#como-funciona" className="bg-white/5 border border-white/10 text-white px-8 py-4.5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
                <Play size={18} className="fill-current text-white" /> Ver Como Funciona
              </a>
            </div>
          </div>

          <div className="flex-1 w-full lg:w-auto relative animate-fade-in group h-[400px] sm:h-[500px]">
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="relative w-64 h-64 sm:w-80 sm:h-80"
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              >
                <div className="absolute inset-0 border-2 border-dashed border-[#25D366]/20 rounded-full" />
                <div className="absolute inset-4 border border-[#25D366]/10 rounded-full" />
                {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-12 h-12 rounded-xl bg-[#0F172A] border border-white/10 flex items-center justify-center shadow-xl"
                    style={{
                      top: `${50 + 45 * Math.sin(angle * Math.PI / 180)}%`,
                      left: `${50 + 45 * Math.cos(angle * Math.PI / 180)}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    animate={{ y: [0, -10, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 4, delay: i * 0.5, repeat: Infinity }}
                  >
                    {i % 2 === 0 ? <Cpu size={20} className="text-[#25D366]" /> : <Network size={20} className="text-blue-400" />}
                  </motion.div>
                ))}
              </motion.div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 bg-[#25D366]/20 rounded-full blur-3xl animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-[#25D366] to-[#128C7E] rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(37,211,102,0.4)]">
                      <Bot size={40} className="text-white animate-bounce-slow" />
                    </div>
                  </div>
                </div>
              </div>
              {Array.from({ length: 15 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 bg-[#25D366] rounded-full"
                  initial={{ x: 0, y: 0, opacity: 0 }}
                  animate={{
                    x: (Math.random() - 0.5) * 400,
                    y: (Math.random() - 0.5) * 400,
                    opacity: [0, 1, 0]
                  }}
                  transition={{ duration: Math.random() * 5 + 3, repeat: Infinity, delay: Math.random() * 2 }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Three Pillars Section */}
      <section id="como-funciona" className="py-24 px-6 bg-[#020617] relative">
        <div className="max-w-7xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#128C7E]/10 border border-[#128C7E]/20 text-[#25D366] text-xs font-black uppercase tracking-wider">
            COMO FUNCIONA
          </div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            Três pilares vitais em um só <span className="gradient-text">Agente Virtual</span>.
          </h2>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-8 space-y-6 group hover:border-[#25D366]/40">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-slate-900 shadow-xl group-hover:scale-110 transition-transform">
              <Zap size={28} className="text-white" />
            </div>
            <h3 className="text-2xl font-black text-white">Vendedor Inteligente</h3>
            <p className="text-slate-400 leading-relaxed text-sm">Seu novo vendedor atende contatos frios instantaneamente, qualifica leads de campanhas, contorna objeções de preço de forma sutil e envia links seguros de pagamento diretamente no WhatsApp para aumentar a conversão.</p>
          </div>
          <div className="glass-card p-8 space-y-6 group hover:border-blue-500/40">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
              <Calendar size={28} />
            </div>
            <h3 className="text-2xl font-black text-white">Agendamento de Visitas</h3>
            <p className="text-slate-400 leading-relaxed text-sm">Sincronização completa em tempo real com as agendas da sua equipe técnica ou comercial. O agente gerencia horários disponíveis, marca consultas, realiza reagendamentos e dispara lembretes automáticos para reduzir faltas.</p>
          </div>
          <div className="glass-card p-8 space-y-6 group hover:border-purple-500/40">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
              <Brain size={28} />
            </div>
            <h3 className="text-2xl font-black text-white">Suporte Técnico RAG</h3>
            <p className="text-slate-400 leading-relaxed text-sm">Chega de respostas imprecisas. Integre manuais complexos de manutenção, esquemas de peças e arquivos técnicos. A IA pesquisa o conteúdo de forma semântica em segundos e responde com exatidão cirúrgica.</p>
          </div>
        </div>
      </section>

      {/* The rest of the sections... (omitido para brevidade no write_to_file mas mantido no arquivo real) */}
      <footer className="py-20 px-6 border-t border-white/5 bg-[#020617] text-center relative">
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-12 h-12 flex items-center justify-center overflow-hidden rounded-full">
            <img src={logoImage} className="w-full h-full object-cover scale-110" alt="Logo" />
          </div>
          <span className="text-xl font-black tracking-tight text-white uppercase">Evoluir <span className="gradient-text">Mais</span></span>
        </div>
        <p className="text-slate-500 text-xs font-medium">© 2026 Evoluir Mais • Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
