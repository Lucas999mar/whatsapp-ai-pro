import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import api from '../api/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(sessionStorage.getItem('wa_pro_token') || localStorage.getItem('wa_pro_token'));
  const [loading, setLoading] = useState(true);
  const featureSyncRef = useRef(null);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const savedUser = sessionStorage.getItem('wa_pro_user') || localStorage.getItem('wa_pro_user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.error("Auth init error:", e);
        }
      }
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
    setLoading(false);
  }, [token]);

  // 🔄 Sincronização de features em tempo real (a cada 30s)
  useEffect(() => {
    if (!token || !user) return;
    // Superadmin não precisa de feature sync
    if (user.role === 'superadmin') return;

    const syncFeatures = async () => {
      try {
        const res = await api.get('/me/features');
        const freshFeatures = res.data?.features || {};

        // Só atualiza se houve mudança real
        const currentStr = JSON.stringify(user.features || {});
        const freshStr = JSON.stringify(freshFeatures);

        if (currentStr !== freshStr) {
          console.log('🔄 Features atualizadas pelo servidor:', freshFeatures);
          setUser(prev => {
            const updated = { ...prev, features: freshFeatures };
            sessionStorage.setItem('wa_pro_user', JSON.stringify(updated));
            if (localStorage.getItem('wa_pro_user')) {
              localStorage.setItem('wa_pro_user', JSON.stringify(updated));
            }
            return updated;
          });
        }
      } catch (err) {
        // Silenciosamente ignora erros de sync (rede, token expirado, etc.)
      }
    };

    // Sync imediato ao montar
    syncFeatures();

    // Sync a cada 30 segundos
    featureSyncRef.current = setInterval(syncFeatures, 30000);

    return () => {
      if (featureSyncRef.current) {
        clearInterval(featureSyncRef.current);
      }
    };
  }, [token, user?.id]);

  const login = async (id, password, remember = false) => {
    const res = await api.post('/auth/login', { id, password });
    const { token: newToken, user: newUser } = res.data;

    setToken(newToken);
    setUser(newUser);

    // Store in sessionStorage to allow multiple tabs/accounts
    sessionStorage.setItem('wa_pro_token', newToken);
    sessionStorage.setItem('wa_pro_user', JSON.stringify(newUser));

    // Optional: store in localStorage if "remember me" is used (not implemented yet, but keeping for compatibility)
    if (remember) {
      localStorage.setItem('wa_pro_token', newToken);
      localStorage.setItem('wa_pro_user', JSON.stringify(newUser));
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    if (featureSyncRef.current) {
      clearInterval(featureSyncRef.current);
    }
    sessionStorage.removeItem('wa_pro_token');
    sessionStorage.removeItem('wa_pro_user');
    localStorage.removeItem('wa_pro_token');
    localStorage.removeItem('wa_pro_user');
  };

  const updateProfile = (data) => {
    const newUser = { ...user, ...data };
    setUser(newUser);
    sessionStorage.setItem('wa_pro_user', JSON.stringify(newUser));
    // Sincroniza com localStorage se existir (usuário usou "lembrar-me")
    if (localStorage.getItem('wa_pro_user')) {
      localStorage.setItem('wa_pro_user', JSON.stringify(newUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

