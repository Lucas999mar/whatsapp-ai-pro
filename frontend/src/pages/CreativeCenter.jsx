import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Bot, Briefcase, PenTool, Search, 
  Megaphone, Scale, Send, User, ChevronRight,
  MoreVertical, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NATIVE_AGENTS = [
  {
    id: 'business',
    name: 'Consultor de Negócios',
    role: 'Estratégia & Gestão',
    icon: <Briefcase size={22} />,
    color: 'from-blue-500 to-cyan-500',
    description: 'Analisa métricas, sugere modelos de receita e desenha planos de expansão para a empresa.',
    welcomeMsg: 'Olá! Sou seu Consultor de Negócios. Quer discutir nossa expansão de franquias, reduzir custos ou estruturar um novo braço comercial hoje?'
  },
  {
    id: 'copywriter',
    name: 'Escritor Criativo',
    role: 'Copywriting & Social Media',
    icon: <PenTool size={22} />,
    color: 'from-purple-500 to-pink-500',
    description: 'Cria posts para Instagram, roteiros de Reels, copies de anúncios e e-mails que convertem.',
    welcomeMsg: 'Pronto para viralizar! Sobre qual produto ou campanha você quer que eu escreva o roteiro do Instagram de hoje?'
  },
  {
    id: 'seo',
    name: 'Especialista em SEO',
    role: 'Tráfego Orgânico',
    icon: <Search size={22} />,
    color: 'from-green-500 to-emerald-500',
    description: 'Otimiza títulos, descrições e palavras-chave para fazer o seu site dominar o Google.',
    welcomeMsg: 'Vamos dominar o Google! Qual é o artigo, página ou vídeo que vamos otimizar para ranquear em primeiro lugar hoje?'
  },
  {
    id: 'marketing',
    name: 'Mestre do Tráfego',
    role: 'Anúncios & Planejamento',
    icon: <Megaphone size={22} />,
    color: 'from-orange-500 to-red-500',
    description: 'Estrutura campanhas de Facebook Ads, Google Ads e define ângulos de anúncios de alto ROI.',
    welcomeMsg: 'O ROI é o que importa. Quer estruturar nossa próxima campanha de Black Friday ou montar um funil de captação de Leads perpétuo?'
  },
  {
    id: 'sales',
    name: 'Closer de Vendas',
    role: 'Prospecção & B2B',
    icon: <Sparkles size={22} />,
    color: 'from-amber-400 to-orange-500',
    description: 'Cria scripts de vendas, quebra de objeções e roteiros de cold call impossíveis de ignorar.',
    welcomeMsg: 'Dinheiro na mesa! Precisa de um script para quebrar a objeção "tá muito caro" ou quer um roteiro de abordagem fria (Cold Call)?'
  },
  {
    id: 'legal',
    name: 'Consultor Jurídico',
    role: 'Análise de Contratos',
    icon: <Scale size={22} />,
    color: 'from-slate-500 to-gray-600',
    description: 'Ajuda a entender termos complexos, esboçar cláusulas padrão e mitigar riscos em negociações.',
    welcomeMsg: 'Segurança em primeiro lugar. O que vamos revisar hoje? Um contrato de prestação de serviços ou uma política de privacidade?'
  }
];

export default function CreativeCenter() {
  const { user } = useAuth();
  const [activeAgentId, setActiveAgentId] = useState(NATIVE_AGENTS[0].id);
  const [messages, setMessages] = useState({});
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const activeAgent = NATIVE_AGENTS.find(a => a.id === activeAgentId);
  const currentChat = messages[activeAgentId] || [];

  // Init welcome message
  useEffect(() => {
    if (!messages[activeAgentId]) {
      setMessages(prev => ({
        ...prev,
        [activeAgentId]: [
          { role: 'agent', content: activeAgent.welcomeMsg, id: Date.now() }
        ]
      }));
    }
  }, [activeAgentId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', content: input, id: Date.now() };
    setMessages(prev => ({
      ...prev,
      [activeAgentId]: [...(prev[activeAgentId] || []), userMsg]
    }));
    
    setInput('');
    setIsTyping(true);

    // Mock API Response (To be integrated with real backend Phase 2)
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => ({
        ...prev,
        [activeAgentId]: [
          ...(prev[activeAgentId] || []),
          { 
            role: 'agent', 
            content: `Aqui está um esboço inicial focado em conversão e com base nas melhores práticas do mercado, desenvolvido sob a ótica de um ${activeAgent.name}.\\n\\nPodemos refinar este material. O que achou dessa direção?`, 
            id: Date.now() + 1 
          }
        ]
      }));
    }, 2500);
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col xl:flex-row gap-6 animate-fade-in">
      
      {/* Sidebar Agents List */}
      <div className="w-full xl:w-96 flex flex-col gap-4">
        <div className="glass-panel p-6 border-l-4 border-l-[#25D366]">
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Sparkles className="text-[#25D366]" /> Centro Criativo
          </h1>
          <p className="text-slate-400 mt-2 text-sm leading-relaxed">
            Sua equipe de elite nativa. Especialistas de IA prontos para gerar conteúdo e escalar sua empresa de forma autônoma.
          </p>
        </div>

        <div className="flex-1 glass-panel overflow-hidden flex flex-col p-3 gap-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest p-3 pb-1">
            Seus Especialistas
          </div>
          <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 flex flex-col gap-2">
            {NATIVE_AGENTS.map(agent => (
              <button
                key={agent.id}
                onClick={() => setActiveAgentId(agent.id)}
                className={`flex items-start gap-4 p-4 rounded-xl transition-all text-left ${
                  activeAgentId === agent.id 
                    ? 'bg-white/10 shadow-lg border border-white/10 scale-[1.02]' 
                    : 'hover:bg-white/5 border border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center shadow-lg shrink-0`}>
                  {agent.icon}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="font-bold text-white text-sm truncate">{agent.name}</div>
                  <div className="text-xs text-[#25D366] font-semibold mt-0.5">{agent.role}</div>
                  <div className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {agent.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 glass-panel flex flex-col overflow-hidden relative">
        
        {/* Chat Header */}
        <div className="h-20 border-b border-white/5 bg-[#0F172A]/80 backdrop-blur-md flex items-center px-6 justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeAgent.color} flex items-center justify-center shadow-lg`}>
              {activeAgent.icon}
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">{activeAgent.name}</h2>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <div className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></div>
                Online e pronto para criar
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
              <FileText size={20} />
            </button>
            <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gradient-to-b from-transparent to-black/20">
          {currentChat.map((msg) => (
            <div key={msg.id} className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg ${
                msg.role === 'user' ? 'bg-[#25D366]/20' : 'bg-gradient-to-br ' + activeAgent.color
              }`}>
                {msg.role === 'user' ? <User size={14} className="text-[#25D366]" /> : <Bot size={14} className="text-white" />}
              </div>

              <div className={`p-4 rounded-2xl shadow-xl ${
                msg.role === 'user' 
                  ? 'bg-[#25D366] text-slate-900 rounded-tr-sm' 
                  : 'bg-[#1E293B] border border-white/10 text-slate-200 rounded-tl-sm'
              }`}>
                <p className={`text-sm whitespace-pre-wrap leading-relaxed ${msg.role === 'user' ? 'font-medium' : ''}`}>
                  {msg.content}
                </p>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex gap-4 max-w-[80%]">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br ${activeAgent.color}`}>
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-[#1E293B] border border-white/10 p-4 rounded-2xl rounded-tl-sm shadow-xl flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-[#0F172A]/80 backdrop-blur-md border-t border-white/5 shrink-0">
          <div className="flex gap-3 max-w-5xl mx-auto relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Escreva seu pedido para o ${activeAgent.name}...`}
              className="flex-1 bg-[#020617] border border-white/10 rounded-2xl p-4 pr-16 text-white text-sm focus:outline-none focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/50 resize-none h-14 custom-scrollbar transition-all shadow-inner"
              rows={1}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="absolute right-2 top-2 bottom-2 aspect-square bg-[#25D366] hover:bg-[#1DA851] disabled:opacity-50 disabled:hover:bg-[#25D366] text-slate-900 rounded-xl flex items-center justify-center transition-all shadow-lg"
            >
              <Send size={18} className={input.trim() ? 'ml-1' : ''} />
            </button>
          </div>
          <div className="text-center mt-3 text-[10px] font-medium text-slate-500 uppercase tracking-widest">
            Alimentado por GPT-4o Enterprise Edition
          </div>
        </div>
      </div>
    </div>
  );
}
