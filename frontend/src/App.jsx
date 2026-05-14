import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Database, MessageSquare, BrainCircuit, 
  Settings, LogOut, Sparkles, ShieldCheck, Building2 
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import KnowledgeBase from './pages/KnowledgeBase';
import Conversations from './pages/Conversations';
import LearningPage from './pages/LearningPage';
import SettingsPage from './pages/SettingsPage';
import SuperAdmin from './pages/SuperAdmin';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';

function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const navItems = [
    { path: '/', name: 'Visão Geral', icon: <LayoutDashboard size={20} /> },
    { path: '/knowledge', name: 'Base Conhecimento', icon: <Database size={20} /> },
    { path: '/conversations', name: 'Conversas', icon: <MessageSquare size={20} /> },
    { path: '/learning', name: 'Aprendizado IA', icon: <BrainCircuit size={20} /> },
    { path: '/settings', name: 'Configurações', icon: <Settings size={20} /> },
  ];

  if (user?.role === 'superadmin') {
    navItems.push({ path: '/admin', name: 'Super Admin', icon: <ShieldCheck size={20} /> });
  }

  return (
    <aside className="w-64 bg-[#0F172A] border-r border-white/5 h-screen flex flex-col fixed left-0 top-0 z-20 shadow-2xl">
      <div className="p-8 border-b border-white/5 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center shadow-xl shadow-[#25D366]/20 overflow-hidden border border-white/10">
            {user?.logo ? (
              <img src={user.logo} className="w-full h-full object-cover" alt="Logo" />
            ) : (
              <Sparkles className="text-white" size={32} />
            )}
          </div>
          <div className="text-center">
            <h1 className="text-lg font-black tracking-tight text-white leading-tight">
              {user?.name || 'Biticonia'}
            </h1>
            <span className="text-[10px] text-[#25D366] font-bold uppercase tracking-widest">{user?.role}</span>
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
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 font-medium ${
                isActive
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
  );
}

function AuthGuard({ children, adminOnly = false }) {
  const { user, token, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#25D366]/20 border-t-[#25D366] rounded-full animate-spin"></div>
    </div>
  );
  
  if (!token) return <Navigate to="/login" />;
  if (adminOnly && user?.role !== 'superadmin') return <Navigate to="/" />;
  
  return children;
}

function AppContent() {
  const { token, loading } = useAuth();
  
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

  if (!token) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] flex text-slate-200 font-sans selection:bg-[#25D366]/30">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#25D366]/5 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<AuthGuard><Dashboard /></AuthGuard>} />
            <Route path="/knowledge" element={<AuthGuard><KnowledgeBase /></AuthGuard>} />
            <Route path="/conversations" element={<AuthGuard><Conversations /></AuthGuard>} />
            <Route path="/learning" element={<AuthGuard><LearningPage /></AuthGuard>} />
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
