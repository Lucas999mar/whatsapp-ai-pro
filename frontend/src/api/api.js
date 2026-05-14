import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001'
});

// Interceptor para adicionar o token JWT automaticamente
api.interceptors.request.use(config => {
  const token = sessionStorage.getItem('wa_pro_token') || localStorage.getItem('wa_pro_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
