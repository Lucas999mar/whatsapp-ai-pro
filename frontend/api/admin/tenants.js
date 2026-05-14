import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'wa-pro-secret-key-123';

function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado' });

  // GET - listar tenants
  if (req.method === 'GET') {
    if (user.role !== 'superadmin') return res.status(403).json({ error: 'Acesso negado' });
    const { data, error } = await supabase.from('tenants').select('*').order('created_at');
    if (error) return res.status(500).json({ error: error.message });
    
    // Enriquecer com contagens
    const enriched = await Promise.all(data.map(async (t) => {
      const { count: knowledgeCount } = await supabase
        .from('knowledge_items')
        .select('*', { count: 'exact', head: true })
        .or(`metadata->>tenantId.eq.${t.id},metadata->>tenantId.is.null`);
      
      const { count: conversationCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .like('whatsapp_id', `${t.id}__%`);

      return {
        ...t,
        agentCount: 0,
        knowledgeCount: knowledgeCount || 0,
        obsidianCount: 0,
        conversationCount: conversationCount || 0
      };
    }));

    return res.status(200).json(enriched);
  }

  // POST - criar tenant
  if (req.method === 'POST') {
    if (user.role !== 'superadmin') return res.status(403).json({ error: 'Acesso negado' });
    const { id, name, password, logo } = req.body;
    if (!id || !name || !password) return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    
    const { error } = await supabase.from('tenants').insert({
      id, name, password, role: 'company', status: 'active', logo: logo || null
    });
    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ message: 'Empresa criada com sucesso' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
