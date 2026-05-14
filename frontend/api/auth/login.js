import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SECRET = process.env.JWT_SECRET || 'wa-pro-secret-key-123';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, password } = req.body;

  if (!id || !password) {
    return res.status(400).json({ error: 'ID e senha são obrigatórios' });
  }

  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*')
    .ilike('id', id);

  if (error) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }

  const tenant = tenants?.find(t => String(t.password) === String(password));

  if (!tenant) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  if (tenant.status !== 'active') {
    return res.status(403).json({ error: 'Conta desativada' });
  }

  const token = jwt.sign(
    { id: tenant.id, name: tenant.name, role: tenant.role },
    SECRET,
    { expiresIn: '24h' }
  );

  return res.status(200).json({
    token,
    user: {
      id: tenant.id,
      name: tenant.name,
      role: tenant.role,
      logo: tenant.logo
    }
  });
}
