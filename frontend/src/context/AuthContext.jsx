import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(sessionStorage.getItem('wa_pro_token') || localStorage.getItem('wa_pro_token'));
  const [loading, setLoading] = useState(true);

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

  const login = async (id, password, remember = false) => {
    const res = await axios.post('http://localhost:3001/api/auth/login', { id, password });
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
    sessionStorage.removeItem('wa_pro_token');
    sessionStorage.removeItem('wa_pro_user');
    localStorage.removeItem('wa_pro_token');
    localStorage.removeItem('wa_pro_user');
  };

  const updateProfile = (data) => {
    const newUser = { ...user, ...data };
    setUser(newUser);
    sessionStorage.setItem('wa_pro_user', JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
