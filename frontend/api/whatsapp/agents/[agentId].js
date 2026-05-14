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
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado' });

  const { agentId } = req.query;

  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', agentId)
      .eq('tenant_id', user.id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: 'Agente removido' });
  }

  // POST - update settings
  if (req.method === 'POST') {
    const settings = req.body;
    const { error } = await supabase
      .from('agents')
      .update({ settings, updated_at: new Date().toISOString() })
      .eq('id', agentId)
      .eq('tenant_id', user.id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: 'Configurações salvas' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
