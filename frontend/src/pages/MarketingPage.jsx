import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logoImage from '../assets/logo.png';
import { 
  Sparkles, CheckCircle2, ArrowRight, Play, ChevronDown, Check, 
  Target, Cpu, Users, BarChart3, Star, Quote, ShieldCheck, Mail, Phone,
  User, Globe, Coins, GraduationCap, Laptop, Landmark, CheckSquare, Menu, X
} from 'lucide-react';

export default function MarketingPage() {
  const [activeServiceTab, setActiveServiceTab] = useState('trafego');
  const [openFaq, setOpenFaq] = useState(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Lead form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [revenue, setRevenue] = useState('');
  const [website, setWebsite] = useState('');

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Build WhatsApp message with lead details
    const text = `Olá, gostaria de agendar meu diagnóstico gratuito de marketing na Evoluir Mais!\n\n*Nome:* ${name}\n*E-mail:* ${email}\n*WhatsApp:* ${phone}\n*Faturamento:* ${revenue}${website ? `\n*Site:* ${website}` : ''}`;
    const url = `https://wa.me/5522999093710?text=${encodeURIComponent(text)}`;

    setTimeout(() => {
      setLoading(false);
      setFormSubmitted(true);
      window.open(url, '_blank');
    }, 800);
  };

  const testimonials = [
    {
      title: "Preocupação em entregar venda",
      quote: "Antes, a gente trabalhava com uma agência, e essa agência estava preocupada em entregar lead apenas e com a Evoluir Mais isso mudou um pouco, porque há uma preocupação em entregar a venda, o resultado final lá na ponta.",
      author: "Max Constâncio",
      role: "Sócio-diretor MAXMD Movelaria e Design",
      category: "Indústria & Design"
    },
    {
      title: "A Evoluir Mais veste a camisa do seu negócio",
      quote: "O que eu vejo da Evoluir Mais, o escritório que atende a gente, eles vestem a camisa, então isso me dá uma confiança. E outra, são muito rápidos, estão sempre disponíveis e isso dá uma segurança muito boa.",
      author: "André Vieira",
      role: "CEO | Venum Brasil",
      category: "Varejo & E-commerce"
    },
    {
      title: "ROI de 9,5 em vendas",
      quote: "A gente vendeu, através da Evoluir Mais, 45 unidades imobiliárias. Nós temos um investimento considerável e o nosso ROI está estabilizado na casa de 9,5.",
      author: "Jonas Esteves",
      role: "Diretor de Marketing da Lugano Chocolates",
      category: "Franquias & Alimentos"
    },
    {
      title: "De pequenas empresas até multinacionais",
      quote: "A dor que a Evoluir Mais atende pega desde uma empresa com 5 colaboradores, até uma multinacional de consumo em busca de canais eficientes.",
      author: "Sandro Magaldi",
      role: "CEO | Gestão do Amanhã",
      category: "Educação & Corporativo"
    },
    {
      title: "Crescimento de 70% no ano a ano",
      quote: "Se a gente comparar ano x ano, a gente cresceu 70%. Isso mostra que as decisões, e a Evoluir Mais entre essas decisões, estão gerando o resultado comercial real que a gente espera.",
      author: "Diego Lopes",
      role: "Head de DTC | MAX Titanium",
      category: "Suplementos & Distribuição"
    }
  ];

  const services = {
    trafego: {
      title: "Tráfego Pago",
      headline: "Gestão profissional nos maiores canais de aquisição do mundo.",
      desc: "Gestão de alta performance em Meta Ads (Facebook/Instagram), Google Ads, TikTok Ads e YouTube com foco obsessivo em ROI. Atraímos o público altamente qualificado e pronto para comprar, garantindo que cada centavo investido retorne como receita real direto para o seu caixa."
    },
    dados: {
      title: "Dashboards & Dados",
      headline: "Relatórios e monitoramento de conversão em tempo real.",
      desc: "Criação de relatórios automatizados integrados aos seus canais. Analisamos detalhadamente cada canal de tráfego, custo por clique (CPC), custo de aquisição de cliente (CAC), taxa de conversão comercial e LTV para você tomar decisões de negócios sempre baseadas em dados consolidados."
    },
    criativos: {
      title: "Criativos & LPs",
      headline: "Páginas de alta conversão e anúncios projetados para vender.",
      desc: "Desenvolvimento de Landing Pages de alta performance com design premium e redação persuasiva (copywriting) focadas na conversão imediata de visitantes em leads qualificados e vendas diretas, além de roteirização e produção de peças de anúncios de altíssimo engajamento."
    },
    growth: {
      title: "Growth Strategy",
      headline: "Modelagem completa do funil de vendas e atração previsível.",
      desc: "Mapeamento minucioso de toda a jornada do seu cliente, desde a primeira visualização do anúncio, passando por funis automáticos inteligentes no WhatsApp, até a recompra e retenção pós-venda. Escalamos a receita acelerando o crescimento previsível da empresa."
    },
    comercial: {
      title: "Consultoria Comercial",
      headline: "Estruturação de funis de fechamento, CRM e IA de vendas.",
      desc: "Nós estruturamos a sua equipe de pré-vendas e vendas (SDR/Inside Sales), configuramos ferramentas de CRM profissionais e implementamos agentes de Inteligência Artificial com RAG para acelerar o processo de resposta rápida e qualificação no WhatsApp, transformando leads em faturamento líquido."
    }
  };

  const faqs = [
    {
      q: "Para qual tamanho de empresa a assessoria da Evoluir Mais é indicada?",
      a: "A assessoria é desenhada sob medida para empresas que faturam acima de R$ 100 mil por mês e que buscam profissionalizar e escalar seus canais de vendas na internet de forma previsível e altamente lucrativa."
    },
    {
      q: "Já tenho uma equipe de marketing interna. Por que contratar a Evoluir Mais?",
      a: "Nós não competimos com o seu marketing interno; nós o potencializamos. Trazemos para a sua mesa a nossa metodologia proprietária validada, ferramentas de inteligência artificial de última geração e especialistas certificados em tráfego, dados e processos comerciais que dificilmente um time interno isolado domina em toda a sua amplitude."
    },
    {
      q: "Como saber se a assessoria funciona para o meu segmento específico?",
      a: "Já estruturamos funis de vendas para os mais diversos setores da economia — desde indústrias tradicionais, franquias, prestadores de serviços qualificados, corretoras, e-commerces, concessionárias até startups de software. Nossa metodologia foca nos quatro pilares universais de vendas online que se aplicam a qualquer negócio."
    },
    {
      q: "O que diferencia a assessoria da Evoluir Mais de uma agência de marketing comum?",
      a: "Agências comuns estão focadas apenas em entregar 'likes', postagens decorativas em redes sociais ou leads desqualificados. Nós somos obcecados por vendas reais, receita líquida e retorno financeiro sobre o investimento (ROI). Implementamos os processos comerciais e a tecnologia necessária para converter cada real investido em novos clientes."
    },
    {
      q: "Quanto tempo leva para os primeiros resultados de vendas aparecerem?",
      a: "A partir do momento do setup inicial da estratégia e conexão das ferramentas, os primeiros leads qualificados começam a chegar nas primeiras semanas. O processo de estabilização do ROI e escala acelerada de faturamento costuma se consolidar em média de 60 a 90 dias de operação contínua."
    },
    {
      q: "Vocês dão garantia absoluta de resultados comerciais e vendas?",
      a: "Nenhum marketing sério pode dar garantia absoluta de vendas, pois o fechamento final depende também de fatores como a qualidade do seu produto, competitividade de preço, estoque e eficácia de atendimento comercial interno. O que nós garantimos contratualmente é a aplicação rígida da nossa metodologia de performance, especialistas altamente qualificados e a melhor tecnologia de IA do mercado para maximizar as suas chances de conversão."
    }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-[#25D366]/30 overflow-x-hidden">
      
      {/* Sticky Premium Navigation Header */}
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
          
          <div className="hidden xl:flex items-center justify-center flex-1 gap-4 lg:gap-8 text-sm font-semibold text-slate-300 whitespace-nowrap px-4">
            <a href="#depoimentos" className="hover:text-[#25D366] transition-colors">Depoimentos</a>
            <a href="#nossa-entrega" className="hover:text-[#25D366] transition-colors">Nossa Entrega</a>
            <a href="#servicos" className="hover:text-[#25D366] transition-colors">Serviços</a>
            <a href="#faq" className="hover:text-[#25D366] transition-colors">Perguntas Frequentes</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 ml-auto xl:ml-10 flex-shrink-0">
            <Link to="/" className="hidden md:inline-flex bg-white/5 hover:bg-white/10 text-white px-6 py-2.5 rounded-xl font-black text-sm transition-all border border-white/10 whitespace-nowrap">
              Inteligência Artificial
            </Link>
            <a href="#formulario" className="bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:brightness-110 text-slate-900 px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl font-black text-[12px] sm:text-sm transition-all shadow-[0_0_20px_rgba(37,211,102,0.2)] whitespace-nowrap">
              Diagnóstico Gratuito
            </a>
            <button 
              className="xl:hidden p-1.5 sm:p-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all flex-shrink-0 ml-1"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-[#020617] border-b border-white/5 absolute top-20 left-0 w-full px-6 py-6 flex flex-col gap-4 shadow-2xl">
            <a href="#depoimentos" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#25D366] font-bold text-lg">Depoimentos</a>
            <a href="#nossa-entrega" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#25D366] font-bold text-lg">Nossa Entrega</a>
            <a href="#servicos" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#25D366] font-bold text-lg">Serviços</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#25D366] font-bold text-lg border-b border-white/10 pb-4">FAQ</a>
            
            <Link to="/" className="md:hidden text-[#25D366] font-black text-lg">
              Sistema de Inteligência Artificial
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden border-b border-white/5">
        {/* Glowing atmospheric nodes */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[550px] bg-gradient-to-br from-[#25D366]/10 to-[#128C7E]/5 rounded-full blur-[140px] -z-10 opacity-70"></div>
        <div className="absolute top-40 right-[-10%] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[120px] -z-10 animate-pulse"></div>

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          
          {/* Left Column: Copywriting Pitch and Bullet Points */}
          <div className="flex-1 text-left space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-xs font-black uppercase tracking-wider">
              🏆 PARA EMPRESAS QUE FATURAM ACIMA DE R$ 100 MIL/MÊS
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] text-white">
              Faça de 2026 o ano <span className="gradient-text">mais lucrativo</span> da sua empresa.
            </h1>
            
            <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-medium">
              Agende seu diagnóstico gratuito e descubra como podemos transformar seu marketing em uma máquina previsível e automática de geração de receita com especialistas dedicados e Inteligência Artificial.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#25D366]/10 flex items-center justify-center border border-[#25D366]/20 mt-1 shrink-0">
                  <Check size={14} className="text-[#25D366]" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-base">Marketing e Comercial focados no seu ROI</h4>
                  <p className="text-xs text-slate-500 font-medium">Não entregamos curtidas, entregamos novos clientes em carteira e faturamento real.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#25D366]/10 flex items-center justify-center border border-[#25D366]/20 mt-1 shrink-0">
                  <Check size={14} className="text-[#25D366]" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-base">Tecnologia e I.A. aplicadas à sua operação</h4>
                  <p className="text-xs text-slate-500 font-medium">Implementamos funis automáticos inteligentes com RAG e bases de conhecimento personalizadas.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#25D366]/10 flex items-center justify-center border border-[#25D366]/20 mt-1 shrink-0">
                  <Check size={14} className="text-[#25D366]" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-base">Especialistas dedicados com soluções sob medida</h4>
                  <p className="text-xs text-slate-500 font-medium">Trafego pago, criação, dashboards de dados e processos comerciais integrados para sua escala.</p>
                </div>
              </div>
            </div>

            {/* Verification badges/icons */}
            <div className="pt-6 border-t border-white/5 space-y-3">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Certificados pelas maiores companhias:</span>
              <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400 font-black tracking-wider uppercase">
                <span className="bg-white/5 px-3 py-1 rounded-md border border-white/5 flex items-center gap-1.5"><Star size={12} className="text-[#25D366]" /> Meta Business Partner</span>
                <span className="bg-white/5 px-3 py-1 rounded-md border border-white/5 flex items-center gap-1.5"><Star size={12} className="text-[#25D366]" /> Google Partner Premier</span>
                <span className="bg-white/5 px-3 py-1 rounded-md border border-white/5 flex items-center gap-1.5"><Star size={12} className="text-[#25D366]" /> TikTok Ads Certified</span>
              </div>
            </div>
          </div>

          {/* Right Column: Lead Capture Form */}
          <div id="formulario" className="flex-1 w-full lg:w-auto relative">
            <div className="glass-panel p-8 bg-gradient-to-br from-[#25D366]/5 via-[#0F172A]/90 to-blue-500/5 border border-white/10 rounded-3xl shadow-2xl relative overflow-hidden text-left">
              
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#25D366] to-transparent opacity-50"></div>

              {formSubmitted ? (
                <div className="py-12 text-center space-y-6 animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-[#25D366]/20 border border-[#25D366] flex items-center justify-center mx-auto text-[#25D366] shadow-[0_0_20px_rgba(37,211,102,0.3)]">
                    <CheckCircle2 size={36} />
                  </div>
                  <h3 className="text-2xl font-black text-white">Solicitação Recebida!</h3>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
                    Olá <strong className="text-white">{name}</strong>, seu diagnóstico gratuito de marketing foi agendado. Em até 24 horas um de nossos consultores seniores de growth entrará em contato via WhatsApp para prosseguir com a análise comercial da sua empresa.
                  </p>
                  <div className="pt-4">
                    <a href="/" className="inline-flex items-center gap-2 text-xs font-black text-[#25D366] uppercase hover:underline">
                      Retornar à página principal <ArrowRight size={14} />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-black text-white">Agendar Diagnóstico Gratuito</h3>
                    <p className="text-xs text-slate-500 mt-1.5 font-medium">Deixe seus dados e analise gratuitamente o marketing e comercial do seu negócio.</p>
                  </div>

                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Nome Completo</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <User size={16} />
                        </div>
                        <input 
                          type="text" 
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-[#070A13] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#25D366]/50 transition-all placeholder-slate-700" 
                          placeholder="Ex: João da Silva"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">E-mail Corporativo</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Mail size={16} />
                        </div>
                        <input 
                          type="email" 
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-[#070A13] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#25D366]/50 transition-all placeholder-slate-700" 
                          placeholder="Ex: joao@empresa.com.br"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">WhatsApp (Celular)</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                            <Phone size={16} />
                          </div>
                          <input 
                            type="tel" 
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-[#070A13] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#25D366]/50 transition-all placeholder-slate-700" 
                            placeholder="(11) 99999-9999"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Faturamento Mensal</label>
                        <div className="relative">
                          <select 
                            required
                            value={revenue}
                            onChange={(e) => setRevenue(e.target.value)}
                            className="w-full bg-[#070A13] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 focus:outline-none focus:border-[#25D366]/50 transition-all appearance-none"
                          >
                            <option value="" disabled>Selecione...</option>
                            <option value="ate-20k">Até R$ 20.000 / mês</option>
                            <option value="20k-50k">R$ 20.000 a R$ 50.000 / mês</option>
                            <option value="50k-100k">R$ 50.000 a R$ 100.000 / mês</option>
                            <option value="acima-100k">Acima de R$ 100.000 / mês</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                            <ChevronDown size={16} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Site da Empresa (Opcional)</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Globe size={16} />
                        </div>
                        <input 
                          type="url" 
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          className="w-full bg-[#070A13] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#25D366]/50 transition-all placeholder-slate-700" 
                          placeholder="Ex: www.suaempresa.com.br"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-[#25D366] hover:bg-[#1DA851] text-slate-900 h-13 rounded-xl font-black text-sm shadow-[0_0_20px_rgba(37,211,102,0.2)] hover:shadow-[0_0_30px_rgba(37,211,102,0.4)] flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 mt-2"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>Agendar Meu Diagnóstico Gratuito <ArrowRight size={16} /></>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials/Cases Section */}
      <section id="depoimentos" className="py-24 px-6 bg-[#030712]/50 relative">
        <div className="max-w-7xl mx-auto space-y-4 text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-xs font-black uppercase tracking-wider">
            DEPOIMENTOS & RESULTADOS
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            As empresas que mais crescem no Brasil passam pela <span className="gradient-text">Evoluir Mais</span>.
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            Saiba o que os tomadores de decisão dizem sobre a nossa obsessão por conversão comercial e retorno de investimento.
          </p>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <div key={idx} className="glass-panel p-6 border border-white/5 hover:border-[#25D366]/20 transition-all flex flex-col justify-between text-left group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#25D366] font-black uppercase tracking-wider">{t.category}</span>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => <Star key={i} size={12} className="fill-[#25D366] text-[#25D366]" />)}
                  </div>
                </div>
                <h4 className="text-base font-extrabold text-white leading-tight group-hover:text-[#25D366] transition-colors">
                  "{t.title}"
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  {t.quote}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-6 mt-6 border-t border-white/5">
                <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366] shrink-0 font-black text-sm">
                  {t.author.charAt(0)}
                </div>
                <div>
                  <h5 className="text-xs font-black text-white">{t.author}</h5>
                  <span className="text-[10px] text-slate-500 font-semibold">{t.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Slogan Metrics Pillars Section */}
      <section id="nossa-entrega" className="py-24 px-6 bg-[#020617] border-t border-white/5 relative">
        <div className="absolute top-1/2 left-[-10%] w-[300px] h-[300px] bg-[#128C7E]/5 rounded-full blur-[100px] -z-10"></div>
        
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#128C7E]/10 border border-[#128C7E]/20 text-[#25D366] text-xs font-black uppercase tracking-wider">
              LIDERANÇA ABSOLUTA
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              A maior assessoria de Marketing e Vendas baseada em <span className="gradient-text">IA</span>.
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed font-medium">
              Profissionalizando marketing e vendas com Inteligência Artificial corporativa e RAG avançado em todo o Brasil. Atuamos como o seu departamento externo de marketing e vendas completo feito sob medida.
            </p>
            <p className="text-xs text-slate-500 font-medium">
              Nós alocamos os especialistas multidisciplinares que você precisa, focados na sua estratégia de conversão, eliminando os seus custos com contratação tradicional e encargos de equipe.
            </p>
            <div className="pt-4">
              <a href="#formulario" className="inline-flex items-center gap-2 bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-[#25D366]/20 transition-all">
                Agendar Diagnóstico Comercial <ArrowRight size={14} />
              </a>
            </div>
          </div>

          <div className="flex-1 w-full grid grid-cols-2 gap-6">
            <div className="glass-panel p-6 border border-white/5 hover:border-[#25D366]/20 transition-all text-left">
              <div className="text-3xl sm:text-4xl font-black text-[#25D366] mb-2">+200</div>
              <div className="text-white font-extrabold text-sm mb-1">Escritórios Parceiros</div>
              <div className="text-[10px] text-slate-500 font-medium">Parcerias estratégicas em todo o território nacional.</div>
            </div>

            <div className="glass-panel p-6 border border-white/5 hover:border-[#25D366]/20 transition-all text-left">
              <div className="text-3xl sm:text-4xl font-black text-[#25D366] mb-2">+R$ 16 Bi</div>
              <div className="text-white font-extrabold text-sm mb-1">Receita Gerada</div>
              <div className="text-[10px] text-slate-500 font-medium">Faturamento real gerado para a carteira de nossos clientes.</div>
            </div>

            <div className="glass-panel p-6 border border-white/5 hover:border-[#25D366]/20 transition-all text-left">
              <div className="text-3xl sm:text-4xl font-black text-[#25D366] mb-2">+5 Mil</div>
              <div className="text-white font-extrabold text-sm mb-1">Assessores de Growth & IA</div>
              <div className="text-[10px] text-slate-500 font-medium">Especialistas certificados operando nas estratégias de escala.</div>
            </div>

            <div className="glass-panel p-6 border border-white/5 hover:border-[#25D366]/20 transition-all text-left">
              <div className="text-3xl sm:text-4xl font-black text-[#25D366] mb-2">+30 Mil</div>
              <div className="text-white font-extrabold text-sm mb-1">Empresas Atendidas</div>
              <div className="text-[10px] text-slate-500 font-medium font-semibold">Casos em todos os setores comerciais e industriais do país.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Tabs Grid Section */}
      <section id="servicos" className="py-24 px-6 bg-[#030712] border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto space-y-4 text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-xs font-black uppercase tracking-wider">
            ATENDEMOS TODAS AS DEMANDAS
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Tenha uma operação completa sem <span className="gradient-text">gerenciar pessoas</span>.
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            Alocamos os melhores serviços e estratégias que seu negócio precisa no marketing digital e comercial.
          </p>

          {/* Sizing Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-6">
            {Object.keys(services).map((key) => (
              <button
                key={key}
                onClick={() => setActiveServiceTab(key)}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all ${
                  activeServiceTab === key
                    ? 'bg-[#25D366]/10 border-[#25D366] text-[#25D366]'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {services[key].title}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content display card */}
        <div className="max-w-4xl mx-auto glass-panel p-8 bg-[#0F172A]/40 border border-white/5 rounded-3xl text-left relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 space-y-6">
            <div className="w-12 h-12 rounded-xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366] border border-[#25D366]/20 shadow-[0_0_15px_rgba(37,211,102,0.1)]">
              {activeServiceTab === 'trafego' && <Target size={24} />}
              {activeServiceTab === 'dados' && <BarChart3 size={24} />}
              {activeServiceTab === 'criativos' && <Sparkles size={24} />}
              {activeServiceTab === 'growth' && <Coins size={24} />}
              {activeServiceTab === 'comercial' && <Users size={24} />}
            </div>
            
            <div className="space-y-3">
              <h3 className="text-2xl font-black text-white">{services[activeServiceTab].headline}</h3>
              <p className="text-xs text-[#25D366] font-bold uppercase tracking-wider">Serviço Integrado Evoluir Mais • {services[activeServiceTab].title}</p>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">
                {services[activeServiceTab].desc}
              </p>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <a href="#formulario" className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1DA851] text-slate-900 px-6 py-3 rounded-xl font-black text-xs uppercase shadow-[0_0_20px_rgba(37,211,102,0.2)]">
                Falar com um consultor <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Artificial Intelligence and Tech Curadoria Section */}
      <section className="py-24 px-6 bg-[#020617] border-t border-white/5 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-gradient-to-br from-[#25D366]/5 to-[#128C7E]/5 rounded-full blur-[140px] -z-10"></div>
        
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-xs font-black uppercase tracking-wider">
              INOVAÇÃO & TECNOLOGIA
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Inteligência Artificial & <span className="gradient-text">Tecnologia Aplicada</span>.
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed font-medium">
              Nós fazemos a curadoria avançada e a implementação ágil das tecnologias e inteligências certas para o seu negócio enquanto você foca no lucro operacional bruto.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <Cpu size={20} />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-base">Identificação de soluções de IA</h4>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Mapeamento para automatizar processos operacionais, triagem e qualificação inteligente, reduzindo drasticamente custos de atendimento interno.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center text-[#25D366] shrink-0">
                  <Laptop size={20} />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-base">Implementação rápida de tecnologia</h4>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Conexão fluida de IA no CRM e campanhas de marketing de alta performance para coletar e agir sobre insights de conversão em tempo real.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-base">Análise contínua com algoritmos</h4>
                  <p className="text-xs text-slate-400 mt-1 font-medium font-semibold">Refinamento constante de anúncios e funis com automação para otimizar a aquisição de novos clientes e turbinar as margens líquidas.</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <a href="#formulario" className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1DA851] text-slate-900 px-6 py-3 rounded-xl font-black text-xs uppercase">
                Falar com Especialista de IA <ArrowRight size={14} />
              </a>
            </div>
          </div>

          <div className="flex-1 w-full flex justify-center">
            {/* Structural Graphic Representation */}
            <div className="w-full max-w-[400px] aspect-square bg-[#090D1A]/90 border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-2xl">
              <div className="absolute top-[-10%] right-[-10%] w-[150px] h-[150px] bg-[#25D366]/10 rounded-full blur-[40px] -z-10"></div>
              
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="bg-purple-500/25 text-purple-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">Tecnologia IA</span>
                  <span className="text-[10px] text-slate-500 font-bold">RAG Pipeline</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                </div>
              </div>

              <div className="flex-1 py-6 flex flex-col justify-center space-y-4">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-left text-xs space-y-1">
                  <span className="text-slate-500 font-bold uppercase text-[9px]">Input de Conversa (Lead)</span>
                  <p className="text-slate-200">"Quero saber o preço do plano pro e se fazem integração com meu CRM."</p>
                </div>

                <div className="flex items-center justify-center">
                  <div className="h-6 w-0.5 bg-gradient-to-b from-[#25D366] to-transparent"></div>
                </div>

                <div className="bg-[#25D366]/5 p-3 rounded-xl border border-[#25D366]/20 text-left text-xs space-y-1">
                  <span className="text-[#25D366] font-bold uppercase text-[9px]">Consulta RAG e Contextualização</span>
                  <p className="text-slate-300">Analisando base: <strong className="text-white">tabela_servicos.pdf</strong></p>
                  <p className="text-[11px] text-[#25D366] font-medium">✓ IA respondendo com 99.8% de precisão baseada em dados reais</p>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-500 uppercase tracking-widest font-black">
                <span>Evoluir Mais RAG Engine</span>
                <span className="text-[#25D366]">Status: Ativo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-24 px-6 bg-[#030712]/50 border-t border-white/5 relative">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-xs font-black uppercase tracking-wider">
              RESOLVA SUAS DÚVIDAS
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Tire suas dúvidas antes de <span className="gradient-text">começar</span>.
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Tudo o que você precisa saber sobre a nossa assessoria completa de marketing, processos de vendas e inteligência artificial aplicada.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="bg-[#0F172A]/40 border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="font-extrabold text-slate-200 text-sm sm:text-base pr-4">
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
              <a href="#depoimentos" className="hover:text-[#25D366] transition-colors">Depoimentos</a>
              <a href="#nossa-entrega" className="hover:text-[#25D366] transition-colors">Nossa Entrega</a>
              <a href="#servicos" className="hover:text-[#25D366] transition-colors">Serviços</a>
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
