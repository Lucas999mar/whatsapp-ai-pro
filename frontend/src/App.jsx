import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import logoImage from './assets/logo.png';
import {
  LayoutDashboard, Database, MessageSquare, BrainCircuit,
  Settings, LogOut, Sparkles, ShieldCheck, Building2, Menu, X, Megaphone,
  Calendar as CalendarIcon, Blocks, ClipboardList, Users, Bike, Wand2, Layout
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import KnowledgeBase from './pages/KnowledgeBase';
import LearningPage from './pages/LearningPage';
import SettingsPage from './pages/SettingsPage';
import SuperAdmin from './pages/SuperAdmin';
import BroadcastPage from './pages/BroadcastPage';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import FollowUpPage from './pages/FollowUpPage';
import MarketingPage from './pages/MarketingPage';
import CreativeCenter from './pages/CreativeCenter';
import AIDesigner from './pages/AIDesigner';
import IntegrationsPage from './pages/IntegrationsPage';
import OSPage from './pages/OSPage';
import AtendimentoPage from './pages/AtendimentoPage';
import CRMPage from './pages/CRMPage';
import ContatosPage from './pages/ContatosPage';
import GroupsPage from './pages/GroupsPage';
import ContentPlannerPage from './pages/ContentPlannerPage';

// Novos componentes de Delivery
import TrackingPage from './pages/TrackingPage';
import MotoboyApp from './pages/MotoboyApp';
import MotoboyRegister from './pages/MotoboyRegister';
import DeliveryDashboard from './pages/DeliveryDashboard';

function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  let navItems = [
    { path: '/', name: 'Visão Geral', icon: <LayoutDashboard size={20} /> },
    { path: '/atendimento', name: 'Atendimento', icon: <MessageSquare size={20} /> },
    { path: '/crm', name: 'CRM Kanban', icon: <LayoutDashboard size={20} /> },
    { path: '/contacts', name: 'Contatos', icon: <Users size={20} /> },
    { path: '/groups', name: 'Gestão de Grupos', icon: <Users size={20} /> },
    { path: '/knowledge', name: 'Base Conhecimento', icon: <Database size={20} /> },
    { path: '/creative-center', name: 'Centro Criativo', icon: <Sparkles size={20} /> },
    { path: '/ai-designer', name: 'AI Designer', icon: <Wand2 size={20} /> },
    { path: '/content-planner', name: 'Planejador de Conteúdo', icon: <Layout size={20} /> },
    { path: '/learning', name: 'Aprendizado IA', icon: <BrainCircuit size={20} /> },
    { path: '/broadcast', name: 'Disparo em Massa', icon: <Megaphone size={20} /> },
    { path: '/follow-up', name: 'Follow-up', icon: <CalendarIcon size={20} /> },
    { path: '/os', name: 'Ordens de Serviço', icon: <ClipboardList size={20} /> },
    { path: '/delivery-dashboard', name: 'Monitor Delivery (Uber)', icon: <Bike size={20} /> },
    { path: '/integrations', name: 'Integrações & API', icon: <Blocks size={20} /> },
    { path: '/settings', name: 'Configurações', icon: <Settings size={20} /> },
  ];

  if (user?.role === 'technician') {
    navItems = [
      { path: '/', name: 'Visão Geral', icon: <LayoutDashboard size={20} /> },
      { path: '/os', name: 'Minhas Ordens', icon: <ClipboardList size={20} /> },
      { path: '/settings', name: 'Perfil', icon: <Settings size={20} /> },
    ];
  }

  if (user?.role === 'motoboy') {
    navItems = [
      { path: '/', name: 'Visão Geral', icon: <LayoutDashboard size={20} /> },
      { path: '/motoboy', name: 'Minhas Entregas', icon: <Bike size={20} /> },
      { path: '/settings', name: 'Perfil', icon: <Settings size={20} /> },
    ];
  }

  // Filtragem de features permitidas para empresas e técnicos
  if (user && user.role !== 'superadmin') {
    const features = user.features || {};
    const featureMap = {
      '/atendimento': 'atendimento',
      '/crm': 'crm',
      '/contacts': 'contacts',
      '/groups': 'groups',
      '/knowledge': 'knowledge',
      '/content-planner': 'contentPlanner',
      '/creative-center': 'creativeCenter',
      '/ai-designer': 'aiDesigner',
      '/learning': 'learning',
      '/broadcast': 'broadcast',
      '/follow-up': 'followUp',
      '/os': 'os',
      '/motoboy': 'delivery',
      '/delivery-dashboard': 'delivery',
      '/integrations': 'integrations'
    };

    navItems = navItems.filter(item => {
      const key = featureMap[item.path];
      if (key && features[key] === false) return false;
      return true;
    });
  }

  if (user?.role === 'superadmin') {
    navItems.push({ path: '/admin', name: 'Super Admin', icon: <ShieldCheck size={20} /> });
  }

  return (
    <>
      {/* Overlay for Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`w-64 bg-[#0F172A] border-r border-white/5 h-screen flex flex-col fixed left-0 top-0 z-40 shadow-2xl transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
        <div className="p-8 border-b border-white/5 flex flex-col items-center justify-center relative">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 text-slate-400 lg:hidden"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 flex items-center justify-center overflow-hidden rounded-full">
              {user?.logo ? (
                <img src={user.logo} className="w-full h-full object-cover rounded-full" alt="Logo" />
              ) : (
                <img src={logoImage} className="w-full h-full object-cover scale-110 animate-fade-in" alt="Logo" />
              )}
            </div>
            <div className="text-center">
              <h1 className="text-lg font-black tracking-tight text-white leading-tight">
                {user?.name || 'Evoluir Mais'}
              </h1>
              <span className="text-[10px] text-[#25D366] font-black uppercase tracking-[0.2em]">
                {user?.role === 'motoboy' ? 'ENTREGADOR' :
                  user?.role === 'technician' ? 'TÉCNICO' :
                    user?.role === 'superadmin' ? 'SUPER ADMIN' : 'ADMINISTRADOR'}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-5 space-y-2 mt-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 font-medium ${isActive
                  ? 'bg-gradient-to-r from-[#25D366]/20 to-transparent text-[#25D366] shadow-[inset_2px_0_0_#25D366]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <div className={`${isActive ? 'drop-shadow-[0_0_8px_rgba(37,211,102,0.5)]' : ''}`}>
                  {item.icon}
                </div>
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-5 border-t border-white/5 bg-[#0D1324]">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-400 transition-colors w-full rounded-xl hover:bg-red-500/10 font-bold text-sm uppercase tracking-wider"
          >
            <LogOut size={18} />
            Sair da Conta
          </button>
        </div>
      </aside>
    </>
  );
}

function AuthGuard({ children, adminOnly = false }) {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#25D366]/20 border-t-[#25D366] rounded-full animate-spin"></div>
    </div>
  );

  if (!token) return <Navigate to="/login" />;
  if (adminOnly && user?.role !== 'superadmin') return <Navigate to="/" />;

  // Bloqueio de rotas se a feature do tenant estiver desabilitada
  if (user && user.role !== 'superadmin') {
    const features = user.features || {};
    const featureMap = {
      '/atendimento': 'atendimento',
      '/crm': 'crm',
      '/contacts': 'contacts',
      '/groups': 'groups',
      '/knowledge': 'knowledge',
      '/content-planner': 'contentPlanner',
      '/creative-center': 'creativeCenter',
      '/ai-designer': 'aiDesigner',
      '/learning': 'learning',
      '/broadcast': 'broadcast',
      '/follow-up': 'followUp',
      '/os': 'os',
      '/motoboy': 'delivery',
      '/delivery-dashboard': 'delivery',
      '/integrations': 'integrations'
    };

    const currentPath = location.pathname;
    const key = featureMap[currentPath];
    if (key && features[key] === false) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

function AppContent() {
  const { token, loading, user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-[#25D366]/20 border-t-[#25D366] rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Iniciando Sistema...</p>
        </div>
      </div>
    );
  }

  if (location.pathname === '/marketing') {
    return <MarketingPage />;
  }

  if (!token) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/track/:code" element={<TrackingPage />} />
        <Route path="/motoboy/register" element={<MotoboyRegister />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }

  // Layout otimizado para Motoboy (Tela Cheia)
  if (user?.role === 'motoboy') {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white font-sans">
        <Routes>
          <Route path="/" element={<AuthGuard><MotoboyApp initialMode="overview" /></AuthGuard>} />
          <Route path="/motoboy" element={<AuthGuard><MotoboyApp initialMode="deliveries" /></AuthGuard>} />
          <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
          <Route path="/track/:code" element={<TrackingPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] flex text-slate-200 font-sans selection:bg-[#25D366]/30">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="flex-1 lg:ml-64 p-4 md:p-8 relative overflow-x-hidden min-h-screen">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between mb-6 bg-[#0F172A]/50 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center overflow-hidden rounded-full">
              {user?.logo ? (
                <img src={user.logo} className="w-full h-full object-cover rounded-full" alt="Logo" />
              ) : (
                <img src={logoImage} className="w-full h-full object-cover scale-110" alt="Logo" />
              )}
            </div>
            <span className="font-black text-white tracking-tight uppercase text-xs">
              {user?.name || 'Evoluir Mais'}
            </span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-white/5 rounded-xl text-white"
          >
            <Menu size={24} />
          </button>
        </div>

        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#25D366]/5 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<AuthGuard><Dashboard /></AuthGuard>} />
            <Route path="/atendimento" element={<AuthGuard><AtendimentoPage /></AuthGuard>} />
            <Route path="/crm" element={<AuthGuard><CRMPage /></AuthGuard>} />
            <Route path="/contacts" element={<AuthGuard><ContatosPage /></AuthGuard>} />
            <Route path="/groups" element={<AuthGuard><GroupsPage /></AuthGuard>} />
            <Route path="/knowledge" element={<AuthGuard><KnowledgeBase /></AuthGuard>} />
            <Route path="/creative-center" element={<AuthGuard><CreativeCenter /></AuthGuard>} />
            <Route path="/ai-designer" element={<AuthGuard><AIDesigner /></AuthGuard>} />
            <Route path="/content-planner" element={<AuthGuard><ContentPlannerPage /></AuthGuard>} />
            <Route path="/learning" element={<AuthGuard><LearningPage /></AuthGuard>} />
            <Route path="/broadcast" element={<AuthGuard><BroadcastPage /></AuthGuard>} />
            <Route path="/follow-up" element={<AuthGuard><FollowUpPage /></AuthGuard>} />
            <Route path="/os" element={<AuthGuard><OSPage /></AuthGuard>} />
            <Route path="/delivery-dashboard" element={<AuthGuard><DeliveryDashboard /></AuthGuard>} />
            <Route path="/track/:code" element={<TrackingPage />} />
            <Route path="/tracking/:code" element={<TrackingPage />} />
            <Route path="/integrations" element={<AuthGuard><IntegrationsPage /></AuthGuard>} />
            <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
            <Route path="/admin" element={<AuthGuard adminOnly><SuperAdmin /></AuthGuard>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
