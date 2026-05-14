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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado' });

  const tenantId = user.id;

  // Contagem de conhecimento
  const { count: knowledgeTotal } = await supabase
    .from('knowledge_items')
    .select('*', { count: 'exact', head: true })
    .or(`metadata->>tenantId.eq.${tenantId},metadata->>tenantId.is.null`);

  // Contagem de conversas
  const { count: conversationTotal } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .like('whatsapp_id', `${tenantId}__%`);

  // Contagem de aprendizados
  const { count: learningTotal } = await supabase
    .from('learnings')
    .select('*', { count: 'exact', head: true });

  return res.status(200).json({
    knowledge: {
      total: knowledgeTotal || 0,
      byType: { document: 0, obsidian: 0 }
    },
    conversations: {
      total: conversationTotal || 0,
      today: 0,
      activeThreads: 0
    },
    learning: {
      total: learningTotal || 0,
      lastRun: null
    },
    agents: {
      total: 0,
      active: 0
    }
  });
}
