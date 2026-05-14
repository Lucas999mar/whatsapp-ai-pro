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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado' });

  // GET - listar tenants com estatísticas completas
  if (req.method === 'GET') {
    if (user.role !== 'superadmin') return res.status(403).json({ error: 'Acesso negado' });
    
    const { data: tenants, error } = await supabase.from('tenants').select('*').order('created_at');
    if (error) return res.status(500).json({ error: error.message });
    
    // Buscar todos os agentes de uma vez
    const { data: allAgents } = await supabase.from('agents').select('id, tenant_id');
    
    // Buscar contagens de conhecimento
    const { data: allKnowledge } = await supabase
      .from('knowledge_items')
      .select('id, type, metadata');

    const enriched = (tenants || []).map(t => {
      const tenantAgents = (allAgents || []).filter(a => a.tenant_id === t.id);
      const tenantKnowledge = (allKnowledge || []).filter(k => {
        const meta = k.metadata || {};
        return meta.tenantId === t.id || (!meta.tenantId && t.id === 'default');
      });
      const obsidianCount = tenantKnowledge.filter(k => k.type === 'obsidian').length;

      return {
        ...t,
        agentCount: tenantAgents.length,
        knowledgeCount: tenantKnowledge.length,
        obsidianCount: obsidianCount
      };
    });

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
