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
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado' });

  // POST - criar agente
  if (req.method === 'POST') {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome obrigatório' });

    const agentId = `agent_${Date.now()}`;
    const { error } = await supabase.from('agents').insert({
      id: agentId,
      tenant_id: user.id,
      name: name,
      status: 'disconnected',
      settings: {
        bot_name: name,
        system_prompt: '',
        response_mode: 'mirror',
        tts_voice: 'nova'
      }
    });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ id: agentId, name, status: 'disconnected' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
