const OpenAI = require('openai');
const config = require('../config/config');
const { getSupabase } = require('./supabase');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({ apiKey: config.openai.apiKey });

/**
 * Gera embeddings usando OpenAI
 */
async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.replace(/\n/g, ' '),
  });
  return response.data[0].embedding;
}

/**
 * Lista itens da base de conhecimento (filtrando por tenantId)
 */
async function listKnowledgeItems(type = null, agentId = null, tenantId = 'default') {
  const supabase = getSupabase();
  let query = supabase
    .from('knowledge_items')
    .select('id, title, type, file_name, file_url, file_size, metadata, created_at')
    .order('created_at', { ascending: false });

  if (type) query = query.eq('type', type);

  const { data, error } = await query;
  if (error) throw error;
  
  let results = data || [];
  
  // Filtra por tenantId e agentId no metadata
  results = results.filter(item => {
    const itemTenantId = item.metadata?.tenantId || 'default';
    if (itemTenantId !== tenantId) return false;
    
    if (agentId && agentId !== 'all') {
      const itemAgentId = item.metadata?.agentId || 'global';
      return itemAgentId === 'global' || itemAgentId === agentId;
    }
    return true;
  });
  
  return results;
}

/**
 * Adiciona item à base de conhecimento (com tenantId)
 */
async function addKnowledgeItem({ title, type, content, fileUrl, fileName, fileSize, metadata, agentId = 'global', tenantId = 'default' }) {
  const supabase = getSupabase();
  
  let embedding = null;
  if (content && content.trim().length > 10) {
    try {
      embedding = await generateEmbedding(`${title}\n\n${content}`);
    } catch (err) {
      console.warn('Aviso: não foi possível gerar embedding:', err.message);
    }
  }

  const finalMetadata = { ...(metadata || {}), agentId, tenantId };

  const { data, error } = await supabase
    .from('knowledge_items')
    .insert({
      title,
      type,
      content,
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
      metadata: finalMetadata,
      embedding,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Busca itens relevantes (com tenantId e agentId)
 */
async function searchKnowledge(query, topK = 5, agentId = 'global', tenantId = 'default') {
  const supabase = getSupabase();
  const embedding = await generateEmbedding(query);

  const { data: allItems, error: fetchErr } = await supabase
    .from('knowledge_items')
    .select('id, title, type, content, file_url, metadata, embedding')
    .not('embedding', 'is', null);
    
  if (fetchErr) throw fetchErr;

  const dotProduct = (a, b) => a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitude = (v) => Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
  const cosineSimilarity = (a, b) => dotProduct(a, b) / (magnitude(a) * magnitude(b));

  const results = allItems.map(item => {
    const itemEmbedding = typeof item.embedding === 'string' ? JSON.parse(item.embedding) : item.embedding;
    return {
      ...item,
      similarity: cosineSimilarity(itemEmbedding, embedding)
    };
  })
  .filter(item => {
    const itemTenantId = item.metadata?.tenantId || 'default';
    if (itemTenantId !== tenantId) return false;

    const itemAgentId = item.metadata?.agentId || 'global';
    const isOwner = itemAgentId === 'global' || itemAgentId === agentId;
    return isOwner && item.similarity > 0.3;
  })
  .sort((a, b) => b.similarity - a.similarity)
  .slice(0, topK);

  return results;
}

/**
 * Deleta item
 */
async function deleteKnowledgeItem(id, tenantId) {
  const supabase = getSupabase();
  
  // Primeiro busca para validar o tenant
  const { data: item } = await supabase
    .from('knowledge_items')
    .select('metadata')
    .eq('id', id)
    .single();

  if (!item) throw new Error('Item não encontrado');
  if ((item.metadata?.tenantId || 'default') !== tenantId) {
    throw new Error('Acesso negado: este item não pertence à sua empresa');
  }

  const { error } = await supabase.from('knowledge_items').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Salva mensagem (com tenantId no whatsappId)
 */
async function saveConversationMessage({ whatsappId, userName, role, content, contentType = 'text', mediaUrl, knowledgeUsed, tokensUsed }) {
  const supabase = getSupabase();
  
  // whatsappId aqui já deve vir como tenantId__phone__agentId
  const insertData = {
    whatsapp_id: whatsappId,
    user_name: userName,
    role,
    content,
    content_type: contentType,
    media_url: mediaUrl,
    knowledge_used: knowledgeUsed,
    tokens_used: tokensUsed || 0,
  };

  let { error } = await supabase.from('conversations').insert(insertData);
  
  if (error && error.message.includes("Could not find the 'user_name' column")) {
    delete insertData.user_name;
    const retry = await supabase.from('conversations').insert(insertData);
    error = retry.error;
  }

  if (error) console.error('Erro ao salvar conversa:', error.message);
}

/**
 * Busca histórico (isolado por tenantId já no threadId)
 */
async function getConversationHistory(threadId, limit = 20) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('whatsapp_id', threadId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Lista conversas (filtrando por tenantId)
 */
async function listConversations(limit = 100, tenantId = 'default') {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .like('whatsapp_id', `${tenantId}__%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Stats do dashboard (filtrado por tenantId)
 */
async function getStats(tenantId = 'default') {
  const supabase = getSupabase();

  const [knowledgeRes, conversationsRes, learnRes] = await Promise.all([
    supabase.from('knowledge_items').select('id, type, metadata'),
    supabase.from('conversations').select('id, whatsapp_id').like('whatsapp_id', `${tenantId}__%`),
    supabase.from('learnings').select('id, metadata'),
  ]);

  const knowledgeFiltered = (knowledgeRes.data || []).filter(k => (k.metadata?.tenantId || 'default') === tenantId);
  const learnFiltered = (learnRes.data || []).filter(l => (l.metadata?.tenantId || 'default') === tenantId);

  const typeCounts = {
    document: 0,
    obsidian: 0,
    image: 0,
    audio: 0,
    video: 0
  };
  
  knowledgeFiltered.forEach(item => {
    typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
  });

  const uniqueUsers = new Set((conversationsRes.data || []).map(c => c.whatsapp_id)).size;

  return {
    knowledge: {
      total: knowledgeFiltered.length,
      byType: typeCounts,
    },
    conversations: {
      total: conversationsRes.data?.length || 0,
      uniqueUsers,
    },
    learnings: {
      total: learnFiltered.length
    }
  };
}

/**
 * Adiciona um aprendizado extraído à base de dados
 */
async function addLearning({ title, content, type = 'auto', metadata = {} }) {
  const supabase = getSupabase();
  const tenantId = metadata.tenantId || 'default';
  
  let embedding = null;
  try {
    embedding = await generateEmbedding(content);
  } catch (err) {
    console.warn('Aviso: falha ao gerar embedding para aprendizado:', err.message);
  }

  // Salva na tabela dedicada
  const { data: learningData, error: learnErr } = await supabase
    .from('learnings')
    .insert({
      content,
      embedding,
      metadata: { ...metadata, tenantId }
    })
    .select()
    .single();

  if (learnErr) throw learnErr;

  // Também adiciona à base de conhecimento geral para que o RAG possa usar
  await addKnowledgeItem({
    title: title || 'Aprendizado Automático',
    type: 'learning',
    content,
    metadata: { ...metadata, tenantId, learningId: learningData.id },
    tenantId
  });

  return learningData;
}

/**
 * Lista aprendizados extraídos
 */
async function listLearnings(tenantId = 'default') {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('learnings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Filtro manual por tenantId se não estiver no nível da query
  return (data || []).filter(l => (l.metadata?.tenantId || 'default') === tenantId);
}

/**
 * Lista Empresas/Tenants (Prioriza Supabase, fallback JSON)
 */
async function listTenants() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('tenants').select('*');
  
  if (!error && data && data.length > 0) {
    return data;
  }

  // Fallback para arquivo local se banco estiver vazio ou der erro
  const tenantsFile = path.resolve(__dirname, '../api/tenants.json');
  if (fs.existsSync(tenantsFile)) {
    return JSON.parse(fs.readFileSync(tenantsFile, 'utf8'));
  }
  return [];
}

/**
 * Lista Agentes (Prioriza Supabase, fallback JSON)
 */
async function listAgents(tenantId = null) {
  const supabase = getSupabase();
  let query = supabase.from('agents').select('*');
  if (tenantId) query = query.eq('tenant_id', tenantId);
  
  const { data, error } = await query;
  
  if (!error && data && data.length > 0) {
    // Mapeia snake_case do banco para camelCase do app
    return data.map(a => ({
      id: a.id,
      name: a.name,
      tenantId: a.tenant_id,
      status: a.status,
      settings: a.settings,
      qr: a.qr_code
    }));
  }

  // Fallback para arquivo local
  const fleetFile = path.resolve(__dirname, '../api/agents.json');
  if (fs.existsSync(fleetFile)) {
    const agents = JSON.parse(fs.readFileSync(fleetFile, 'utf8'));
    if (tenantId) return agents.filter(a => (a.tenantId || 'default') === tenantId);
    return agents;
  }
  return [];
}

/**
 * Bot Settings (Multi-Tenant)
 */
async function getBotSettings(agentId = 'default', tenantId = 'default') {
  const agents = await listAgents(tenantId);
  const agent = agents.find(a => a.id === agentId);
  if (agent && agent.settings) return agent.settings;

  return {
    bot_name: 'Assistente',
    system_prompt: 'Você é um assistente amigável.',
    response_mode: config.bot.responseMode,
    tts_voice: config.openai.ttsVoice,
    prefix: '!ia',
    respond_all: true
  };
}

module.exports = {
  generateEmbedding,
  searchKnowledge,
  addKnowledgeItem,
  listKnowledgeItems,
  deleteKnowledgeItem,
  saveConversationMessage,
  getConversationHistory,
  listConversations,
  getStats,
  getBotSettings,
  addLearning,
  listLearnings,
  listTenants,
  listAgents
};
