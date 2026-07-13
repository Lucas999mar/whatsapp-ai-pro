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

  // Filtra usando JSONB metadata keys (tenantId e agentId) para compatibilidade com o banco de produção
  if (tenantId !== 'admin') {
    query = query.eq('metadata->>tenantId', tenantId);
  }

  if (agentId && agentId !== 'all' && agentId !== 'global') {
    query = query.eq('metadata->>agentId', agentId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data || [];
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
      embedding
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Busca itens relevantes (com tenantId e agentId) via similaridade vetorial em memória
 */
async function searchKnowledge(query, topK = 5, agentId = 'global', tenantId = 'default') {
  const supabase = getSupabase();
  try {
    const embedding = await generateEmbedding(query);

    // Busca todos os itens com embedding pertencentes ao tenant
    let dbQuery = supabase
      .from('knowledge_items')
      .select('id, title, type, content, file_url, metadata, embedding')
      .not('embedding', 'is', null);

    if (tenantId !== 'admin') {
      dbQuery = dbQuery.eq('metadata->>tenantId', tenantId);
    }

    const { data: items, error } = await dbQuery;
    if (error) throw error;

    if (!items || items.length === 0) return [];

    // Filtra por agentId se aplicável
    let filteredItems = items;
    if (agentId && agentId !== 'all' && agentId !== 'global') {
      filteredItems = items.filter(item => {
        const itemAgentId = item.metadata?.agentId || 'global';
        return itemAgentId === 'global' || itemAgentId === agentId;
      });
    }

    // Calcula a similaridade de cosseno (produto escalar de vetores normalizados) em JavaScript
    const scored = filteredItems.map(item => {
      let emb = item.embedding;
      if (typeof emb === 'string') {
        emb = JSON.parse(emb);
      }

      if (!Array.isArray(emb) || emb.length !== embedding.length) {
        return { ...item, similarity: 0 };
      }

      let dotProduct = 0;
      for (let i = 0; i < emb.length; i++) {
        dotProduct += emb[i] * embedding[i];
      }

      return {
        id: item.id,
        title: item.title,
        type: item.type,
        content: item.content,
        file_url: item.file_url,
        metadata: item.metadata,
        similarity: dotProduct
      };
    });

    // Ordena, aplica o limiar de 0.3 e retorna os topK
    const results = scored
      .filter(item => item.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return results;
  } catch (err) {
    console.error('Vector Search Error (JS Fallback):', err.message);
    return []; // Fallback to avoid breaking the chat
  }
}

/**
 * Deleta item
 */
async function deleteKnowledgeItem(id, tenantId) {
  const supabase = getSupabase();

  // Primeiro busca para validar o tenant (usando a coluna metadata)
  const { data: item, error: findErr } = await supabase
    .from('knowledge_items')
    .select('metadata')
    .eq('id', id)
    .single();

  if (findErr || !item) throw new Error('Item não encontrado');

  const itemTenantId = item.metadata?.tenantId || 'default';
  if (itemTenantId !== tenantId && tenantId !== 'admin') {
    throw new Error('Acesso negado: este item não pertence à sua empresa');
  }

  const { error } = await supabase.from('knowledge_items').delete().eq('id', id);
  if (error) throw error;
}

async function saveConversationMessage({ whatsappId, userName, role, content, contentType = 'text', mediaUrl, userPhoto, knowledgeUsed, tokensUsed }) {
  const supabase = getSupabase();

  // whatsappId aqui já deve vir como tenantId__phone__agentId
  const tenantId = String(whatsappId).split('__')[0] || 'default';

  const insertData = {
    whatsapp_id: whatsappId,
    user_name: userName,
    role,
    content,
    content_type: contentType,
    media_url: mediaUrl,
    knowledge_used: knowledgeUsed,
    tokens_used: tokensUsed || 0,
    tenant_id: tenantId
  };

  let { error } = await supabase.from('conversations').insert(insertData);

  if (error && error.message.includes("Could not find the 'user_photo' column")) {
    console.warn('⚠️ Coluna user_photo não encontrada, salvando sem foto.');
    delete insertData.user_photo;
    const retry = await supabase.from('conversations').insert(insertData);
    error = retry.error;
  }

  if (error && error.message.includes("Could not find the 'user_name' column")) {
    delete insertData.user_name;
    const retry = await supabase.from('conversations').insert(insertData);
    error = retry.error;
  }

  if (error) console.error('Erro ao salvar conversa:', error.message);

  // 🏥 NOVO: Sincroniza com crm_tickets (O Hub de Atendimento)
  try {
    const tenantId = whatsappId.split('__')[0] || 'default';

    // Busca status atual para não sobrescrever 'atendendo'
    const { data: currentTicket } = await supabase
      .from('crm_tickets')
      .select('status')
      .eq('whatsapp_id', whatsappId)
      .single();

    let newStatus = currentTicket?.status || 'aguardando';
    if (role === 'user' && newStatus === 'resolvido') newStatus = 'aguardando';

    await supabase.from('crm_tickets').upsert({
      tenant_id: tenantId,
      whatsapp_id: whatsappId,
      contact_name: userName || undefined,
      contact_photo: userPhoto || undefined,
      last_message: content,
      status: newStatus,
      updated_at: new Date().toISOString()
    }, { onConflict: 'whatsapp_id' });
  } catch (e) {
    console.warn('⚠️ Falha ao sincronizar ticket CRM:', e.message);
  }
}

/**
 * Atualiza status e responsável de um ticket
 */
async function updateTicketStatus(ticketId, status, userId = null) {
  const supabase = getSupabase();
  const updateData = { status, updated_at: new Date().toISOString() };
  if (userId) updateData.assigned_user_id = userId;

  const { error } = await supabase
    .from('crm_tickets')
    .update(updateData)
    .eq('id', ticketId);

  if (error) throw error;
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
  let query = supabase.from('conversations').select('*').order('created_at', { ascending: false }).limit(limit);

  // Se NÃO for admin, filtra pela empresa. Se for admin, vê tudo.
  if (tenantId !== 'admin') {
    query = query.like('whatsapp_id', `${tenantId}__%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Stats do dashboard (filtrado por tenantId)
 */
async function getStats(tenantId = 'default') {
  const supabase = getSupabase();

  // 🔥 OPTIMIZED: Database-level filtering and parallel execution
  const knowledgeQuery = supabase.from('knowledge_items').select('id, type');
  const conversationsQuery = supabase.from('conversations').select('id, whatsapp_id');
  const learningsQuery = supabase.from('learnings').select('id');

  if (tenantId !== 'admin') {
    knowledgeQuery.eq('metadata->>tenantId', tenantId);
    conversationsQuery.like('whatsapp_id', `${tenantId}__%`);
    learningsQuery.contains('metadata', { tenantId });
  }

  const [knowledgeRes, conversationsRes, learnRes] = await Promise.all([
    knowledgeQuery,
    conversationsQuery,
    learningsQuery
  ]);

  const knowledgeData = knowledgeRes.data || [];
  const conversationsData = conversationsRes.data || [];
  const learningsData = learnRes.data || [];

  const typeCounts = {
    document: 0,
    obsidian: 0,
    image: 0,
    audio: 0,
    video: 0,
    learning: 0
  };

  knowledgeData.forEach(item => {
    if (typeCounts.hasOwnProperty(item.type)) {
      typeCounts[item.type]++;
    }
  });

  const uniqueUsers = new Set(conversationsData.map(c => c.whatsapp_id)).size;

  return {
    knowledge: {
      total: knowledgeData.length,
      byType: typeCounts,
    },
    conversations: {
      total: conversationsData.length,
      uniqueUsers,
    },
    learnings: {
      total: learningsData.length
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
      metadata: { ...metadata, tenantId },
      tenant_id: tenantId // 🔥 ADDED COLUMN
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
  let query = supabase
    .from('learnings')
    .select('*')
    .order('created_at', { ascending: false });

  // 🔥 OPTIMIZED: Database-level filtering via column
  if (tenantId !== 'admin') {
    query = query.eq('tenant_id', tenantId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data || [];
}

/**
 * Lista Empresas/Tenants (Prioriza Supabase, fallback JSON)
 */
async function listTenants() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, role, status, logo, features, created_at'); // ⚡ Evita puxar passwords em lista aberta
    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn('⚠️ Supabase não disponível para listTenants, usando fallback local:', err.message);
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
  try {
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
  } catch (err) {
    console.warn('⚠️ Supabase não disponível para listAgents, usando fallback local:', err.message);
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
  let agent = agents.find(a => a.id === agentId);

  // Se o agente não foi encontrado no tenant, busca na lista global
  if (!agent) {
    const allAgents = await listAgents(null);
    agent = allAgents.find(a => a.id === agentId);
  }

  const defaultSettings = {
    bot_name: 'Assistente',
    system_prompt: 'Você é um assistente amigável.',
    response_mode: config.bot.responseMode || 'mirror',
    tts_voice: config.openai.ttsVoice || 'nova',
    prefix: '!ia',
    respond_all: true,
    ai_provider: 'anthropic',
    openai_api_key: '',
    openai_model: 'gpt-4o-mini',
    anthropic_api_key: '',
    anthropic_model: 'claude-3-haiku-20240307'
  };

  if (agent && agent.settings) {
    const merged = { ...defaultSettings, ...agent.settings };

    // Herança automática de chaves do agente 'default' se o agente atual não tiver chave configurada
    if (!merged.anthropic_api_key && agentId !== 'default') {
      let defaultAgent = agents.find(a => a.id === 'default');
      if (!defaultAgent) {
        // Se não encontrar o default no mesmo tenant, busca na lista global de agentes
        const allAgents = await listAgents(null);
        defaultAgent = allAgents.find(a => a.id === 'default');
      }
      if (defaultAgent && defaultAgent.settings && defaultAgent.settings.anthropic_api_key) {
        merged.anthropic_api_key = defaultAgent.settings.anthropic_api_key;
        merged.ai_provider = defaultAgent.settings.ai_provider || merged.ai_provider;
        merged.anthropic_model = defaultAgent.settings.anthropic_model || merged.anthropic_model;
      }
    }
    return merged;
  }

  // Se o agente em si não tiver registro, tenta carregar as configurações do agente 'default'
  if (agentId !== 'default') {
    let defaultAgent = agents.find(a => a.id === 'default');
    if (!defaultAgent) {
      const allAgents = await listAgents(null);
      defaultAgent = allAgents.find(a => a.id === 'default');
    }
    if (defaultAgent && defaultAgent.settings) {
      return { ...defaultSettings, ...defaultAgent.settings };
    }
  }

  return defaultSettings;
}

/**
 * Lista follow-ups agendados
 */
async function listFollowUps(tenantId = 'default') {
  const supabase = getSupabase();
  let query = supabase.from('follow_ups').select('*').order('scheduled_at', { ascending: true });

  if (tenantId !== 'admin') {
    query = query.eq('tenant_id', tenantId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Adiciona um follow-up
 */
async function addFollowUp({ tenantId, agentId, contactNumber, contactName, message, scheduledAt }) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('follow_ups')
    .insert({
      tenant_id: tenantId,
      agent_id: agentId,
      contact_number: contactNumber,
      contact_name: contactName,
      message,
      scheduled_at: scheduledAt,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Atualiza status do follow-up
 */
async function updateFollowUpStatus(id, status, error_message = null) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('follow_ups')
    .update({ status, error_message, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Deleta follow-up
 */
async function deleteFollowUp(id, tenantId) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('follow_ups')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) throw error;
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
  listAgents,
  listFollowUps,
  addFollowUp,
  updateFollowUpStatus,
  deleteFollowUp,
  updateTicketStatus,
  findTenantById
};

/**
 * Busca uma empresa específica pelo ID (Otimizado para Login)
 */
async function findTenantById(id) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}
