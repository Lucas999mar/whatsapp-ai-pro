import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'wa-pro-secret-key-123';

function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  try { return jwt.verify(authHeader.split(' ')[1], SECRET); } catch { return null; }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado' });

  // Em produção (Vercel), o restart do WhatsApp não faz nada
  // pois o bot roda apenas no servidor VPS
  return res.status(200).json({ 
    message: 'Função disponível apenas quando o backend está rodando em uma VPS. O bot do WhatsApp requer um servidor persistente.' 
  });
}
