import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'wa-pro-secret-key-123';

function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  try { return jwt.verify(authHeader.split(' ')[1], SECRET); } catch { return null; }
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyToken(req);
  if (!user || user.role !== 'superadmin') return res.status(403).json({ error: 'Acesso negado' });

  const { id } = req.query;

  if (req.method === 'PUT') {
    const updates = req.body;
    delete updates.id; // não alterar o ID
    const { error } = await supabase.from('tenants').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: 'Empresa atualizada' });
  }

  if (req.method === 'DELETE') {
    if (id === 'admin') return res.status(400).json({ error: 'Não é possível deletar o admin' });
    const { error } = await supabase.from('tenants').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: 'Empresa excluída' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
