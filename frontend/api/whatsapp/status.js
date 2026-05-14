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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado' });

  const tenantId = user.id;

  // Buscar agentes deste tenant no Supabase
  const { data: agents, error } = await supabase
    .from('agents')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error fetching agents:', error);
    return res.status(200).json({ agents: [] });
  }

  // Formatar no mesmo formato que o backend local retorna
  const formattedAgents = (agents || []).map(a => ({
    id: a.id,
    name: a.name,
    status: a.status || 'disconnected',
    qr: a.qr_code || null,
    settings: a.settings || {
      bot_name: a.name,
      system_prompt: '',
      response_mode: 'mirror',
      tts_voice: 'nova'
    }
  }));

  return res.status(200).json({ agents: formattedAgents });
}
