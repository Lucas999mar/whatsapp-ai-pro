import React, { useState, useEffect } from 'react';
import { 
  Bot, MessageSquare, Shield, Zap, Sparkles, CheckCircle2, 
  ArrowRight, Brain, Search, Cpu, Calendar, Clock, ChevronDown, 
  Play, Check, HelpCircle, Send, Smartphone, Network, Database, Menu, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import heroImage from '../assets/hero.png';
import logoImage from '../assets/logo.png';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('vendas');
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  // Simulated conversations data
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

  // Run chat typing simulation when tab changes
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

        // 1. Wait a bit before showing typing indicator
        await new Promise(resolve => {
          const id = setTimeout(resolve, 800);
          timeoutIds.push(id);
        });
        if (!isMounted) break;

        // 2. Show typing indicator
        setIsTyping(true);

        // 3. Keep typing indicator for a realistic duration
        await new Promise(resolve => {
          const id = setTimeout(resolve, 1200);
          timeoutIds.push(id);
        });
        if (!isMounted) break;

        // 4. Add the message and hide typing indicator
        setIsTyping(false);
        setChatMessages(prev => {
          if (!messages[i]) return prev;
          return [...prev, messages[i]];
        });

        // 5. Wait before the next message
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
      
      {/* Dynamic Sticky Header */}
      <nav className="fixed top-0 w-full z-50 bg-[#020617]/85 backdrop-blur-lg border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 flex items-center justify-center overflow-hidden rounded-full">
              <img src={logoImage} className="w-full h-full object-cover scale-110" alt="Evoluir Mais Logo" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white uppercase">
              Evoluir <span className="gradient-text">Mais</span>
            </span>
          </div>
          
          <div className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <a href="#como-funciona" className="hover:text-[#25D366] transition-colors">Como funciona</a>
            <a href="#recursos" className="hover:text-[#25D366] transition-colors">Recursos IA</a>
            <a href="#integracoes" className="hover:text-[#25D366] transition-colors">Integrações</a>
            <a href="#planos" className="hover:text-[#25D366] transition-colors">Planos e Preços</a>
            <a href="#faq" className="hover:text-[#25D366] transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-4 ml-auto lg:ml-10">
            <Link to="/login" className="hidden sm:inline-flex bg-white/5 hover:bg-white/10 text-white px-5 py-2.5 rounded-xl font-bold transition-all border border-white/10 text-sm whitespace-nowrap">
              Entrar
            </Link>
            <a href="https://wa.me/5522999093710?text=Olá,%20gostaria%20de%20fazer%20um%20teste%20grátis%20do%20Evoluir%20Mais" target="_blank" rel="noopener noreferrer" className="bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:brightness-110 text-slate-900 px-6 py-2.5 rounded-xl font-black text-sm transition-all shadow-[0_0_20px_rgba(37,211,102,0.2)] pulse-active whitespace-nowrap">
              Teste Grátis
            </a>
            <Link to="/marketing" className="hidden md:inline-flex bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:brightness-110 text-slate-900 px-6 py-2.5 rounded-xl font-black text-sm transition-all shadow-[0_0_20px_rgba(37,211,102,0.2)] whitespace-nowrap">
              Assessoria de Marketing
            </Link>
            <button 
              className="lg:hidden p-2 text-white hover:text-[#25D366] transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#020617] border-b border-white/5 absolute top-20 left-0 w-full px-6 py-6 flex flex-col gap-4 shadow-2xl">
            <a href="#como-funciona" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#25D366] font-bold text-lg">Como funciona</a>
            <a href="#recursos" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#25D366] font-bold text-lg">Recursos IA</a>
            <a href="#integracoes" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#25D366] font-bold text-lg">Integrações</a>
            <a href="#planos" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#25D366] font-bold text-lg">Planos e Preços</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#25D366] font-bold text-lg border-b border-white/10 pb-4">FAQ</a>
            
            <Link to="/login" className="sm:hidden text-white hover:text-[#25D366] font-bold text-lg">
              Entrar no Painel
            </Link>
            <Link to="/marketing" className="md:hidden text-[#25D366] font-black text-lg">
              Assessoria de Marketing
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden">
        {/* Colorful glowing structural backgrounds */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[600px] bg-gradient-to-br from-[#25D366]/10 to-[#128C7E]/5 rounded-full blur-[140px] -z-10 opacity-70"></div>
        <div className="absolute top-20 right-[-10%] w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[120px] -z-10 animate-pulse"></div>

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          {/* Left Column: Copywriting & High Impact Value Proposal */}
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

            {/* Quick trust metrics */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-8 border-t border-white/5 text-xs text-slate-500 font-bold uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#25D366]" /> Sem cartão de crédito
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#25D366]" /> Setup em menos de 5 min
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#25D366]" /> 7 dias grátis
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Dashboard Simulation Mockup */}
          <div className="flex-1 w-full lg:w-auto relative animate-fade-in">
            <div className="glass-panel p-4 min-h-[420px] lg:aspect-[4/3] bg-gradient-to-br from-[#25D366]/5 via-[#0F172A]/80 to-blue-500/5 border border-white/10 relative overflow-hidden flex flex-col shadow-2xl">
              
              {/* Header inside mock dashboard */}
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4 text-xs font-semibold text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                  <span className="ml-2 font-mono text-[10px] text-slate-500 hidden sm:inline">evoluir-mais.io/painel</span>
                </div>
                <span className="bg-[#25D366]/10 text-[#25D366] px-2 py-0.5 rounded-md font-bold">● Live Dashboard</span>
              </div>

              {/* Grid content inside mock dashboard */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <div className="bg-[#0B0F19]/90 border border-white/5 p-3 rounded-xl text-left">
                  <span className="text-[10px] text-slate-500 font-black uppercase block tracking-wider">Conversas Hoje</span>
                  <div className="text-lg font-black text-white mt-1">1.482</div>
                  <span className="text-[9px] text-[#25D366] font-bold block mt-0.5">↑ 24% vs ontem</span>
                </div>
                <div className="bg-[#0B0F19]/90 border border-white/5 p-3 rounded-xl text-left">
                  <span className="text-[10px] text-slate-500 font-black uppercase block tracking-wider">Automação IA</span>
                  <div className="text-lg font-black text-[#25D366] mt-1">94.6%</div>
                  <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Sem intervenção</span>
                </div>
                <div className="bg-[#0B0F19]/90 border border-white/5 p-3 rounded-xl text-left col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 font-black uppercase block tracking-wider">Tempo de Reação</span>
                  <div className="text-lg font-black text-blue-400 mt-1">1.8s</div>
                  <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Resposta Instantânea</span>
                </div>
              </div>

              {/* RAG file search visualizer representation */}
              <div className="flex-1 bg-[#0B0F19]/90 border border-white/5 rounded-xl p-3 sm:p-4 flex flex-col justify-between overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-white/5 mb-2 gap-2">
                  <div className="flex items-center gap-2.5">
                    <Database size={16} className="text-[#25D366] shrink-0" />
                    <span className="text-xs font-bold text-slate-300 line-clamp-1">Base de Conhecimento RAG Ativa</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold shrink-0">5 Manuais Carregados</span>
                </div>
                
                <div className="space-y-2 flex-1 overflow-y-auto py-2 text-xs pr-1">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/5 p-2 rounded-lg border border-white/5 gap-1">
                    <span className="font-semibold text-slate-300 break-all w-full">📄 manual_pecas_lorenzetti.pdf</span>
                    <span className="text-[10px] text-[#25D366] font-bold whitespace-nowrap w-full text-left sm:text-right">Processado (148 págs)</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/5 p-2 rounded-lg border border-white/5 gap-1">
                    <span className="font-semibold text-slate-300 break-all w-full">📄 tabela_precos_maio2026.xlsx</span>
                    <span className="text-[10px] text-[#25D366] font-bold whitespace-nowrap w-full text-left sm:text-right">Processado (500 itens)</span>
                  </div>
                  <div className="flex items-center justify-between bg-[#25D366]/5 p-2 rounded-lg border border-[#25D366]/20">
                    <span className="font-semibold text-slate-200 line-clamp-1">🤖 AI buscando: "codigo do reparo advanced..."</span>
                    <div className="w-4 h-4 border-2 border-[#25D366]/30 border-t-[#25D366] rounded-full animate-spin"></div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Segurança SSL habilitada</span>
                  <span className="text-[#25D366] font-bold">Sincronizado com Supabase</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Three Pillars Section (Core Capabilities) */}
      <section id="como-funciona" className="py-24 px-6 bg-[#020617] relative">
        <div className="absolute top-1/2 left-[-10%] w-[300px] h-[300px] bg-[#128C7E]/5 rounded-full blur-[100px] -z-10"></div>
        
        <div className="max-w-7xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#128C7E]/10 border border-[#128C7E]/20 text-[#25D366] text-xs font-black uppercase tracking-wider">
            COMO FUNCIONA
          </div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            Três pilares vitais em um só <span className="gradient-text">Agente Virtual</span>.
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-base">
            Deixe o trabalho repetitivo e o suporte técnico na mão de agentes inteligentes altamente instruídos e focados em gerar valor contínuo para o seu cliente.
          </p>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="glass-card p-8 space-y-6 group hover:border-[#25D366]/40">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-slate-900 shadow-xl group-hover:scale-110 transition-transform">
              <Zap size={28} className="text-white" />
            </div>
            <h3 className="text-2xl font-black text-white">Vendedor Inteligente</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              Seu novo vendedor atende contatos frios instantaneamente, qualifica leads de campanhas, contorna objeções de preço de forma sutil e envia links seguros de pagamento diretamente no WhatsApp para aumentar a conversão.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-card p-8 space-y-6 group hover:border-blue-500/40">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
              <Calendar size={28} />
            </div>
            <h3 className="text-2xl font-black text-white">Agendamento de Visitas</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              Sincronização completa em tempo real com as agendas da sua equipe técnica ou comercial. O agente gerencia horários disponíveis, marca consultas, realiza reagendamentos e dispara lembretes automáticos para reduzir faltas.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-card p-8 space-y-6 group hover:border-purple-500/40">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
              <Brain size={28} />
            </div>
            <h3 className="text-2xl font-black text-white">Suporte Técnico RAG</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              Chega de respostas imprecisas. Integre manuais complexos de manutenção, esquemas de peças e arquivos técnicos. A IA pesquisa o conteúdo de forma semântica em segundos e responde com exatidão cirúrgica.
            </p>
          </div>
        </div>
      </section>

      {/* Dynamic Simulated Interactive Chat Showcase */}
      <section id="recursos" className="py-24 px-6 bg-[#030712] relative border-y border-white/5">
        <div className="absolute top-0 right-1/4 w-[350px] h-[350px] bg-[#25D366]/5 rounded-full blur-[140px] -z-10"></div>
        
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          
          {/* Left Column: Selector pills for simulation */}
          <div className="flex-1 text-left space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-xs font-black uppercase tracking-wider">
              SIMULADOR DE AGENTE EM TEMPO REAL
            </div>
            
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
              Veja o seu agente conversando <span className="gradient-text">ao vivo</span>.
            </h2>
            
            <p className="text-slate-400 text-base">
              Selecione uma das especialidades abaixo para simular no painel do celular como o agente de IA da <strong>Evoluir Mais</strong> interage de forma natural, ágil e focada em resultados.
            </p>

            {/* Selector Buttons */}
            <div className="space-y-4 pt-4">
              <button 
                onClick={() => setActiveTab('vendas')}
                className={`w-full text-left p-5 rounded-2xl border transition-all flex items-center justify-between ${
                  activeTab === 'vendas' 
                    ? 'bg-[#25D366]/10 border-[#25D366]/30 text-white shadow-[0_0_15px_rgba(37,211,102,0.1)]' 
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${activeTab === 'vendas' ? 'bg-[#25D366] text-slate-900' : 'bg-white/5'}`}>
                    <Zap size={20} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base">Vendas e Recomendações</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">Qualificação de leads e fechamentos com links seguros.</p>
                  </div>
                </div>
                <ArrowRight size={18} className={activeTab === 'vendas' ? 'text-[#25D366]' : 'text-slate-600'} />
              </button>

              <button 
                onClick={() => setActiveTab('agendamento')}
                className={`w-full text-left p-5 rounded-2xl border transition-all flex items-center justify-between ${
                  activeTab === 'agendamento' 
                    ? 'bg-[#25D366]/10 border-[#25D366]/30 text-white shadow-[0_0_15px_rgba(37,211,102,0.1)]' 
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${activeTab === 'agendamento' ? 'bg-[#25D366] text-slate-900' : 'bg-white/5'}`}>
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base">Agendamento de Consultas</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">Reserva de técnicos, lembretes de visitas e cancelamentos.</p>
                  </div>
                </div>
                <ArrowRight size={18} className={activeTab === 'agendamento' ? 'text-[#25D366]' : 'text-slate-600'} />
              </button>

              <button 
                onClick={() => setActiveTab('suporte')}
                className={`w-full text-left p-5 rounded-2xl border transition-all flex items-center justify-between ${
                  activeTab === 'suporte' 
                    ? 'bg-[#25D366]/10 border-[#25D366]/30 text-white shadow-[0_0_15px_rgba(37,211,102,0.1)]' 
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${activeTab === 'suporte' ? 'bg-[#25D366] text-slate-900' : 'bg-white/5'}`}>
                    <Brain size={20} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base">Suporte RAG e Manuais Técnicos</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">Consulta a esquemas elétricos, guias PDF e resoluções.</p>
                  </div>
                </div>
                <ArrowRight size={18} className={activeTab === 'suporte' ? 'text-[#25D366]' : 'text-slate-600'} />
              </button>
            </div>
          </div>

          {/* Right Column: Realistic iPhone Chat Simulator */}
          <div className="flex-1 w-full flex justify-center">
            <div className="w-full max-w-[360px] aspect-[9/18] bg-[#090D1A] rounded-[48px] border-[8px] border-slate-800 shadow-2xl relative overflow-hidden flex flex-col">
              
              {/* iPhone Notch/Island */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-800 rounded-full z-20 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-black mr-2"></div>
                <div className="w-10 h-1 bg-slate-700 rounded-full"></div>
              </div>

              {/* Simulated WhatsApp Header */}
              <div className="bg-[#0F172A] pt-8 pb-3 px-4 flex items-center gap-3 border-b border-white/5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center overflow-hidden border border-white/10">
                  <img src={logoImage} className="w-full h-full object-cover" alt="Agente Avatar" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-black text-white">Agente Evoluir Mais</h4>
                    <span className="bg-[#25D366] w-1.5 h-1.5 rounded-full animate-ping"></span>
                  </div>
                  <span className="text-[9px] text-[#25D366] font-semibold block">online • respondendo imediato</span>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#070A13] flex flex-col justify-end min-h-[300px]">
                {chatMessages.map((msg, idx) => {
                  if (!msg || !msg.sender) return null;
                  return (
                    <div 
                      key={idx} 
                      className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed animate-fade-in ${
                        msg.sender === 'user'
                          ? 'bg-[#1E293B] text-slate-200 self-end rounded-tr-none'
                          : 'bg-[#25D366]/10 border border-[#25D366]/15 text-[#25D366] self-start rounded-tl-none font-medium'
                      }`}
                      style={{ whiteSpace: 'pre-line' }}
                    >
                      {msg.text}
                    </div>
                  );
                })}

                {/* Animated Typing Indicator */}
                {isTyping && (
                  <div className="bg-[#25D366]/10 border border-[#25D366]/15 text-[#25D366] self-start rounded-2xl rounded-tl-none p-3 max-w-[60%] flex items-center gap-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                )}
              </div>

              {/* Chat Input Footer */}
              <div className="p-3 bg-[#0F172A] border-t border-white/5 flex items-center gap-2">
                <div className="flex-1 bg-white/5 rounded-full px-4 py-2 text-[10px] text-slate-500 font-medium">
                  Mensagem respondida por IA...
                </div>
                <div className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center text-slate-900">
                  <Send size={12} className="fill-current" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Statistics Grid */}
      <section className="py-24 px-6 bg-[#020617] border-b border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="glass-panel p-6 border border-white/5 hover:border-[#25D366]/20 transition-all">
            <div className="text-4xl sm:text-5xl font-black text-[#25D366] mb-2">99.8%</div>
            <div className="text-slate-400 font-extrabold uppercase tracking-widest text-[10px]">Acurácia de Resposta (RAG)</div>
          </div>
          <div className="glass-panel p-6 border border-white/5 hover:border-[#25D366]/20 transition-all">
            <div className="text-4xl sm:text-5xl font-black text-[#25D366] mb-2">&lt; 2s</div>
            <div className="text-slate-400 font-extrabold uppercase tracking-widest text-[10px]">Tempo Médio de Reação</div>
          </div>
          <div className="glass-panel p-6 border border-white/5 hover:border-[#25D366]/20 transition-all">
            <div className="text-4xl sm:text-5xl font-black text-[#25D366] mb-2">+320k</div>
            <div className="text-slate-400 font-extrabold uppercase tracking-widest text-[10px]">Conversas Automatizadas</div>
          </div>
          <div className="glass-panel p-6 border border-white/5 hover:border-[#25D366]/20 transition-all">
            <div className="text-4xl sm:text-5xl font-black text-[#25D366] mb-2">70%</div>
            <div className="text-slate-400 font-extrabold uppercase tracking-widest text-[10px]">Redução de Custo de Equipe</div>
          </div>
        </div>
      </section>

      {/* Omnichannel Integrations System (Interactive Map) */}
      <section id="integracoes" className="py-24 px-6 bg-[#030712] relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-[#25D366]/5 to-[#128C7E]/5 rounded-full blur-[160px] -z-10"></div>
        
        <div className="max-w-7xl mx-auto text-center space-y-4 mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-xs font-black uppercase tracking-wider">
            CONEXÕES INTEGRALIZADAS
          </div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            Atendimento Omnichannel <span className="gradient-text">Sem Barreiras</span>.
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            O seu agente inteligente interage diretamente nos canais que seus clientes já amam usar diariamente, unificando os dados no painel da <strong className="font-extrabold text-white">Evoluir Mais</strong>.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="glass-panel p-6 text-center border border-white/5 hover:border-[#25D366]/30 transition-all group">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Smartphone size={24} className="text-[#25D366]" />
            </div>
            <h4 className="font-black text-sm">WhatsApp Business</h4>
            <span className="text-[10px] text-slate-500 font-bold uppercase block mt-1">Conexão Oficial</span>
          </div>

          <div className="glass-panel p-6 text-center border border-white/5 hover:border-purple-500/30 transition-all group">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <MessageSquare size={24} className="text-purple-400" />
            </div>
            <h4 className="font-black text-sm">Instagram DM</h4>
            <span className="text-[10px] text-slate-500 font-bold uppercase block mt-1">Direct Automatizado</span>
          </div>

          <div className="glass-panel p-6 text-center border border-white/5 hover:border-blue-500/30 transition-all group">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Calendar size={24} className="text-blue-400" />
            </div>
            <h4 className="font-black text-sm">Google Calendar</h4>
            <span className="text-[10px] text-slate-500 font-bold uppercase block mt-1">Reserva Direta</span>
          </div>

          <div className="glass-panel p-6 text-center border border-white/5 hover:border-blue-400/30 transition-all group">
            <div className="w-12 h-12 rounded-full bg-blue-400/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Network size={24} className="text-blue-300" />
            </div>
            <h4 className="font-black text-sm">Telegram Bot</h4>
            <span className="text-[10px] text-slate-500 font-bold uppercase block mt-1">Suporte no App</span>
          </div>
        </div>
      </section>

      {/* Premium Rebuilt Pricing & Plans (Interactive Toggle) */}
      <section id="planos" className="py-24 px-6 bg-[#020617] border-t border-white/5 relative">
        <div className="absolute bottom-[-10%] right-[-10%] w-[350px] h-[350px] bg-[#25D366]/5 rounded-full blur-[140px] -z-10 animate-pulse"></div>
        
        <div className="max-w-7xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-xs font-black uppercase tracking-wider">
            PLANOS EXCLUSIVOS
          </div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            Planos sob medida para o seu <span className="gradient-text">crescimento</span>.
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            Comece grátis por 7 dias em qualquer modalidade. Sem burocracia e sem cartão de crédito exigido.
          </p>

          {/* Monthly / Annual Billing Cycle Switch */}
          <div className="flex items-center justify-center gap-4 pt-6">
            <span className={`text-sm font-extrabold ${!isAnnual ? 'text-[#25D366]' : 'text-slate-500'}`}>Mensal</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="w-14 h-7 rounded-full bg-[#1E293B] border border-white/10 p-1 flex items-center transition-all focus:outline-none"
            >
              <div className={`w-5 h-5 rounded-full bg-gradient-to-r from-[#25D366] to-[#128C7E] transition-all transform ${isAnnual ? 'translate-x-7' : 'translate-x-0'}`}></div>
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-extrabold ${isAnnual ? 'text-[#25D366]' : 'text-slate-500'}`}>Faturamento Anual</span>
              <span className="bg-[#25D366]/10 text-[#25D366] text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-[#25D366]/20">-20% OFF</span>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: Start */}
          <div className="glass-panel p-8 bg-[#0F172A]/40 border border-white/5 rounded-3xl flex flex-col justify-between hover:border-slate-800 transition-all relative">
            <div>
              <span className="text-xs text-[#25D366] font-black uppercase tracking-widest block mb-1">Para Iniciar</span>
              <h3 className="text-3xl font-black text-white">Plano Start</h3>
              <p className="text-xs text-slate-500 mt-2">Perfeito para profissionais autônomos ou lojas locais iniciais.</p>
              
              <div className="my-8">
                <span className="text-5xl font-black text-white">
                  R$ {isAnnual ? '71' : '89'}
                </span>
                <span className="text-slate-500 text-xs font-semibold"> / mês</span>
              </div>

              <div className="space-y-4 border-t border-white/5 pt-6 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <Check size={16} className="text-[#25D366]" />
                  <span>2.000 interações de IA /mês</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check size={16} className="text-[#25D366]" />
                  <span>2 Números de WhatsApp ativos</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check size={16} className="text-[#25D366]" />
                  <span>3 Agentes virtuais dedicados</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check size={16} className="text-[#25D366]" />
                  <span>Suporte Semântico RAG básico</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check size={16} className="text-[#25D366]" />
                  <span>Web Widget para site incluso</span>
                </div>
              </div>
            </div>
            
            <a href="https://wa.me/5522999093710?text=Olá,%20gostaria%20de%20fazer%20um%20teste%20grátis%20do%20Plano%20Start" target="_blank" rel="noopener noreferrer" className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold h-12.5 rounded-xl flex items-center justify-center mt-8 transition-all">
              Começar Teste Grátis
            </a>
          </div>

          {/* Card 2: Pro (Recommended) */}
          <div className="glass-panel p-8 bg-[#0F172A]/70 border-2 border-[#25D366]/40 rounded-3xl flex flex-col justify-between hover:border-[#25D366]/70 transition-all relative shadow-2xl">
            <div className="absolute top-0 right-8 -translate-y-1/2 bg-gradient-to-r from-[#25D366] to-[#128C7E] text-slate-900 text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-[0_0_20px_rgba(37,211,102,0.3)]">
              RECOMENDADO ⭐
            </div>

            <div>
              <span className="text-xs text-[#25D366] font-black uppercase tracking-widest block mb-1">Mais Popular</span>
              <h3 className="text-3xl font-black text-white">Plano Pro</h3>
              <p className="text-xs text-slate-400 mt-2">Perfeito para empresas em aceleração de vendas e suporte robusto.</p>
              
              <div className="my-8">
                <span className="text-5xl font-black text-white">
                  R$ {isAnnual ? '311' : '389'}
                </span>
                <span className="text-slate-400 text-xs font-semibold"> / mês</span>
              </div>

              <div className="space-y-4 border-t border-[#25D366]/10 pt-6 text-sm text-slate-200">
                <div className="flex items-center gap-3">
                  <Check size={16} className="text-[#25D366]" />
                  <span className="font-medium">12.000 interações de IA /mês</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check size={16} className="text-[#25D366]" />
                  <span>5 Números de WhatsApp ativos</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check size={16} className="text-[#25D366]" />
                  <span className="font-medium">10 Agentes virtuais dedicados</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check size={16} className="text-[#25D366]" />
                  <span>Advanced RAG (manuais ilimitados)</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check size={16} className="text-[#25D366]" />
                  <span>Integrações via Webhook & APIs</span>
                </div>
              </div>
            </div>
            
            <a href="https://wa.me/5522999093710?text=Olá,%20gostaria%20de%20fazer%20um%20teste%20grátis%20do%20Plano%20Pro" target="_blank" rel="noopener noreferrer" className="w-full bg-[#25D366] hover:bg-[#1DA851] text-slate-900 font-black h-12.5 rounded-xl flex items-center justify-center mt-8 transition-all shadow-[0_0_20px_rgba(37,211,102,0.3)]">
              Começar Teste Grátis
            </a>
          </div>

          {/* Card 3: Enterprise */}
          <div className="glass-panel p-8 bg-[#0F172A]/40 border border-white/5 rounded-3xl flex flex-col justify-between hover:border-slate-800 transition-all relative">
            <div>
              <span className="text-xs text-[#25D366] font-black uppercase tracking-widest block mb-1">Alta Escala</span>
              <h3 className="text-3xl font-black text-white">Plano Corporate</h3>
              <p className="text-xs text-slate-500 mt-2">Para centrais de atendimento de alta demanda e equipes integradas.</p>
              
              <div className="my-8">
                <span className="text-5xl font-black text-white">
                  R$ {isAnnual ? '791' : '989'}
                </span>
                <span className="text-slate-500 text-xs font-semibold"> / mês</span>
              </div>

              <div className="space-y-4 border-t border-white/5 pt-6 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <Check size={16} className="text-[#25D366]" />
                  <span>35.000 interações de IA /mês</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check size={16} className="text-[#25D366]" />
                  <span>Canais de WhatsApp Ilimitados</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check size={16} className="text-[#25D366]" />
                  <span>Agentes virtuais Ilimitados</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check size={16} className="text-[#25D366]" />
                  <span>Treinamento de IA personalizado</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check size={16} className="text-[#25D366]" />
                  <span>Gerente de contas dedicado + SLA</span>
                </div>
              </div>
            </div>
            
            <Link to="/login" className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold h-12.5 rounded-xl flex items-center justify-center mt-8 transition-all">
              Falar com Comercial
            </Link>
          </div>

        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-24 px-6 bg-[#030712] border-t border-white/5 relative">
        <div className="absolute top-1/2 left-1/4 w-[350px] h-[350px] bg-blue-500/5 rounded-full blur-[140px] -z-10"></div>
        
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#128C7E]/10 border border-[#128C7E]/20 text-[#25D366] text-xs font-black uppercase tracking-wider">
              DÚVIDAS FREQUENTES
            </div>
            <h2 className="text-4xl font-black tracking-tight text-white leading-tight">
              Alguma dúvida? <span className="gradient-text">Nós respondemos</span>.
            </h2>
            <p className="text-slate-400 text-sm">
              Encontre respostas rápidas para as principais perguntas sobre a configuração e ativação dos nossos agentes de IA.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="glass-panel border border-white/5 hover:border-slate-800 transition-all overflow-hidden"
              >
                <button 
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-5.5 text-left flex items-center justify-between text-base font-extrabold text-white focus:outline-none"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle size={18} className="text-[#25D366]" />
                    {faq.q}
                  </span>
                  <ChevronDown 
                    size={18} 
                    className={`text-slate-500 transition-transform duration-300 ${openFaq === index ? 'transform rotate-180 text-[#25D366]' : ''}`} 
                  />
                </button>
                
                {openFaq === index && (
                  <div className="px-6 pb-6 pt-1 text-slate-400 text-sm leading-relaxed border-t border-white/5 font-medium animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="py-20 px-6 border-t border-white/5 bg-[#020617] text-center relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[150px] bg-[#25D366]/5 rounded-full blur-[80px] -z-10"></div>
        
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-10 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center overflow-hidden rounded-full">
                <img src={logoImage} className="w-full h-full object-cover scale-110" alt="Evoluir Mais Logo" />
              </div>
              <span className="text-xl font-black tracking-tight text-white uppercase">
                Evoluir <span className="gradient-text">Mais</span>
              </span>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <a href="#como-funciona" className="hover:text-[#25D366] transition-colors">Como funciona</a>
              <a href="#recursos" className="hover:text-[#25D366] transition-colors">Recursos</a>
              <a href="#integracoes" className="hover:text-[#25D366] transition-colors">Integrações</a>
              <a href="#planos" className="hover:text-[#25D366] transition-colors">Planos</a>
              <a href="#faq" className="hover:text-[#25D366] transition-colors">FAQ</a>
            </div>
          </div>

          <p className="text-slate-500 max-w-md mx-auto text-xs leading-relaxed font-medium">
            Transformando o WhatsApp na maior ferramenta de inteligência, fechamento comercial e suporte técnico da sua empresa de forma automatizada e escalável.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-widest gap-4">
            <div>
              © 2026 Evoluir Mais • Todos os direitos reservados.
            </div>
            <div className="flex items-center gap-6">
              <a href="#politica" className="hover:text-slate-400 transition-colors">Políticas de privacidade</a>
              <a href="#termos" className="hover:text-slate-400 transition-colors">Termos de uso</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
