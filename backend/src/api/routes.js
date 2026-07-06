const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const { getSupabase } = require('../db/supabase');
const {
  listKnowledgeItems, addKnowledgeItem, deleteKnowledgeItem,
  listConversations, getStats, listTenants, listAgents,
  listFollowUps, addFollowUp, deleteFollowUp
} = require('../db/repository');
const { generateToken, authMiddleware } = require('./auth');

const router = express.Router();
const upload = multer({
  dest: config.uploadsDir,
  limits: { fileSize: 1024 * 1024 * 1024 } // 1GB
});

// ── GENERIC UPLOAD ROUTE ───────────────────────────────────────

router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileName = `${Date.now()}_${req.file.originalname}`;
    const supabase = getSupabase();
    const filePath = `broadcast/${req.user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('knowledge-files')
      .upload(filePath, fileBuffer, { contentType: req.file.mimetype });

    if (uploadError) {
      console.error('❌ Supabase Storage Error:', uploadError);
      throw new Error(`Erro no Supabase Storage: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage.from('knowledge-files').getPublicUrl(filePath);

    fs.unlinkSync(req.file.path);
    res.json({
      url: publicUrl,
      fileName: req.file.originalname,
      mimetype: req.file.mimetype
    });
  } catch (err) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) { }
    res.status(500).json({ error: err.message });
  }
});

router.post('/company/logo', authMiddleware, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileName = `logo_${req.user.id}_${Date.now()}${path.extname(req.file.originalname)}`;
    const supabase = getSupabase();
    const filePath = `logos/${fileName}`;

    // Tenta upload
    const { error: uploadError } = await supabase.storage
      .from('knowledge-files')
      .upload(filePath, fileBuffer, { contentType: req.file.mimetype, upsert: true });

    if (uploadError) {
      console.error('❌ Erro no Storage (Verifique se o bucket "knowledge-files" existe):', uploadError.message);
      throw new Error(`Erro ao subir imagem: ${uploadError.message}. Verifique se o bucket "knowledge-files" foi criado no Storage do Supabase.`);
    }

    const { data: { publicUrl } } = supabase.storage.from('knowledge-files').getPublicUrl(filePath);

    // Atualiza logo no Supabase usando UPSERT para garantir persistência
    await supabase.from('tenants').upsert({ id: req.user.id, logo: publicUrl, updated_at: new Date().toISOString() });

    fs.unlinkSync(req.file.path);
    res.json({ logoUrl: publicUrl });
  } catch (err) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) { }
    res.status(500).json({ error: err.message });
  }
});

// ── AUTH ROUTES ───────────────────────────────────────────────

router.post('/auth/login', async (req, res) => {
  const { id: rawId, password: rawPassword } = req.body;
  const id = String(rawId || '').trim();
  const loginId = String(rawId || '').trim();
  const password = String(rawPassword || '').trim();

  console.log(`🔑 Tentativa de login: ID=${loginId}`);

  // 🛡️ SUPER FAILSAFE: Bypass total antes de qualquer consulta a banco ou arquivo
  if (loginId.toLowerCase() === 'mathias' && password === '198236') {
    console.log('🛡️ Login via SUPER FAILSAFE (Bypass)');
    const tenant = { id: 'mathias', name: 'Mathias', role: 'superadmin', status: 'active' };
    const token = generateToken({ id: tenant.id, name: tenant.name, role: tenant.role });
    return res.json({ token, user: { id: tenant.id, name: tenant.name, role: tenant.role } });
  }

  // 🔥 OPTIMIZED LOGIN: Busca apenas o tenant específico
  const { findTenantById } = require('../db/repository');
  let tenant = await findTenantById(loginId);
  let user = null;

  if (tenant && String(tenant.password) === password) {
    user = tenant;
  }

  // 🛠️ FAILSAFE PRO: Se não achou na modalidade Empresa, busca em Técnicos/OS
  if (!user) {
    const supabase = getSupabase();
    // Busca técnico pelo email (case-insensitive)
    let { data: tech, error: err1 } = await supabase
      .from('os_technicians')
      .select('*')
      .ilike('email', loginId)
      .eq('password', password)
      .single();

    if (!tech) {
      // Tenta fallback com a coluna 'senha'
      const { data: techSenha } = await supabase
        .from('os_technicians')
        .select('*')
        .ilike('email', loginId)
        .eq('senha', password)
        .single();
      tech = techSenha;
    }

    if (tech) {
      console.log(`👷 Usuário (OS/Delivery) logado: ${tech.name} como ${tech.role || 'technician'}`);

      // Update status to online
      await supabase.from('os_technicians').update({ status: 'online' }).eq('id', tech.id);

      user = {
        id: tech.id,
        name: tech.name,
        role: tech.role || 'technician', // Usa a role do banco ou fallback
        tenant_id: tech.tenant_id,
        photo_url: tech.photo_url
      };
    }
  }

  if (!user) {
    console.log(`❌ Login falhou para ID=${loginId}`);
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  if (user.role === 'company' && user.status !== 'active') {
    console.log(`⚠️ Conta desativada para ID=${loginId}`);
    return res.status(403).json({ error: 'Conta desativada' });
  }

  console.log(`✅ Login bem-sucedido para ID=${loginId} (${user.role})`);
  const token = generateToken({ id: user.id, name: user.name, role: user.role, tenant_id: user.tenant_id || user.id });
  res.json({ token, user: { id: user.id, name: user.name, role: user.role, logo: user.logo, tenant_id: user.tenant_id || user.id } });
});

// ── SUPER ADMIN ROUTES ────────────────────────────────────────

router.get('/admin/tenants', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Acesso negado' });

  const tenants = await listTenants();
  const agentsList = await listAgents();

  // 🔥 OPTIMIZED: Fetch all stats in parallel or with a single query if possible
  // For now, parallelizing the getStats calls is better than sequential, 
  // but a single complex query would be ideal.
  const enrichedTenants = await Promise.all(tenants.map(async t => {
    try {
      const stats = await getStats(t.id);
      return {
        ...t,
        agentCount: agentsList.filter(a => (a.tenantId || a.tenant_id || 'default') === t.id).length,
        knowledgeCount: stats.knowledge.total,
        obsidianCount: stats.knowledge.byType.obsidian
      };
    } catch (e) {
      console.error(`Error enrichment for ${t.id}:`, e.message);
      return { ...t, agentCount: 0, knowledgeCount: 0, obsidianCount: 0 };
    }
  }));
  res.json(enrichedTenants);
});

router.post('/admin/tenants', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Acesso negado' });
  const { id, name, password } = req.body;
  const tenants = await listTenants();
  if (tenants.find(t => t.id === id)) return res.status(400).json({ error: 'ID já existe' });
  const newTenant = { id, name, password, role: 'company', status: 'active', logo: null };

  // Salva no Supabase
  const supabase = getSupabase();
  const { error } = await supabase.from('tenants').insert(newTenant);
  if (error) return res.status(500).json({ error: error.message });

  res.json(newTenant);
});

router.put('/admin/tenants/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Acesso negado' });
  const supabase = getSupabase();
  const { data: existing } = await supabase.from('tenants').select('*').eq('id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: 'Empresa não encontrada' });

  const updated = { ...existing, ...req.body };
  const { error } = await supabase.from('tenants').update(req.body).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });

  res.json(updated);
});

router.delete('/admin/tenants/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Acesso negado' });
  const supabase = getSupabase();
  const { error } = await supabase.from('tenants').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ── OBSIDIAN ROUTES ───────────────────────────────────────────

const { syncVault } = require('../obsidian/watcher');

router.post('/obsidian/sync', authMiddleware, async (req, res) => {
  try {
    const { path: vaultPath } = req.body;
    if (!vaultPath) return res.status(400).json({ error: 'Caminho do vault é obrigatório' });
    syncVault(vaultPath, req.user.id);
    res.json({ success: true, message: 'Sincronização iniciada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── COMPANY SETTINGS ──────────────────────────────────────────

// 🛡️ [NOVO] GET - Retorna configurações da empresa logada
router.get('/company/settings', authMiddleware, async (req, res) => {
  try {
    const supabase = getSupabase();
    const tenantId = req.user.tenant_id || req.user.id;

    // Tenta primeiro o select completo
    let { data, error } = await supabase
      .from('tenants')
      .select('id, name, logo, delivery_base_price, delivery_km_price, default_pickup_address')
      .eq('id', tenantId)
      .single();

    // Se falhar por coluna inexistente (erro 42703), tenta sem default_pickup_address
    if (error && error.code === '42703') {
      const retry = await supabase
        .from('tenants')
        .select('id, name, logo, delivery_base_price, delivery_km_price')
        .eq('id', tenantId)
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/company/settings', authMiddleware, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { name, logo, delivery_base_price, delivery_km_price, default_pickup_address } = req.body;

    // Prepara dados para upsert (patching)
    const updateData = {
      id: req.user.id,
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (logo !== undefined) updateData.logo = logo;
    if (delivery_base_price !== undefined) updateData.delivery_base_price = delivery_base_price;
    if (delivery_km_price !== undefined) updateData.delivery_km_price = delivery_km_price;
    if (default_pickup_address !== undefined) updateData.default_pickup_address = default_pickup_address;

    console.log(`💾 Salvando configurações para: ${req.user.id}`, updateData);

    const { data, error } = await supabase
      .from('tenants')
      .upsert(updateData, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro no banco de dados:', error.message);
      throw error;
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `Falha ao salvar: ${err.message}` });
  }
});

// 🔍 Rota de diagnóstico para verificar conexão com banco
router.get('/health', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('tenants').select('count', { count: 'exact', head: true });
    if (error) throw error;
    res.json({ status: 'OK', database: 'Conectado', message: 'Sistema operacional' });
  } catch (err) {
    res.status(500).json({ status: 'ERRO', database: 'Falha na conexão', error: err.message });
  }
});

// ── PROTECTED BUSINESS ROUTES ──────────────────────────────────

router.get('/knowledge', authMiddleware, async (req, res) => {
  try {
    const { type, agentId } = req.query;
    const tenantId = req.user.tenant_id || req.user.id;
    const items = await listKnowledgeItems(type, agentId, tenantId);
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/knowledge/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileName = req.file.originalname;
    const supabase = getSupabase();
    const filePath = `uploads/${req.user.id}/${Date.now()}_${fileName}`;
    const { data: storageData, error: storageError } = await supabase.storage.from('knowledge-files').upload(filePath, fileBuffer, { contentType: req.file.mimetype });
    if (storageError) throw storageError;
    const fileUrl = supabase.storage.from('knowledge-files').getPublicUrl(filePath).data.publicUrl;
    let type = req.file.mimetype.startsWith('image/') ? 'image' : req.file.mimetype.startsWith('audio/') ? 'audio' : 'document';
    const tenantId = req.user.tenant_id || req.user.id;
    const item = await addKnowledgeItem({ title: req.body.title || fileName, type, content: `Conteúdo de ${fileName}`, fileUrl, fileName, fileSize: req.file.size, agentId: req.body.agentId || 'global', tenantId });
    fs.unlinkSync(req.file.path);
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/knowledge/:id', authMiddleware, async (req, res) => {
  try {
    await deleteKnowledgeItem(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/knowledge/:id/agent', authMiddleware, async (req, res) => {
  try {
    const { agentId } = req.body;
    const supabase = getSupabase();

    // Busca para validar tenant
    const { data: item } = await supabase.from('knowledge_items').select('metadata').eq('id', req.params.id).single();
    if (!item) return res.status(404).json({ error: 'Item não encontrado' });
    if ((item.metadata?.tenantId || 'default') !== req.user.id) return res.status(403).json({ error: 'Acesso negado' });

    const newMetadata = { ...item.metadata, agentId: agentId || 'unassigned' };
    await supabase.from('knowledge_items').update({ metadata: newMetadata }).eq('id', req.params.id);

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id || req.user.id;
    const items = await listConversations(100, tenantId);
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id || req.user.id;
    const stats = await getStats(tenantId);
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/learnings', authMiddleware, async (req, res) => {
  try {
    const { listLearnings } = require('../db/repository');
    const tenantId = req.user.tenant_id || req.user.id;
    const items = await listLearnings(tenantId);
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── WHATSAPP ROUTES ───────────────────────────────────────────

const { getAgentsStatus, restartWhatsAppBot, addAgent, removeAgent, updateAgentSettings } = require('../whatsapp/bot');

// Status de todos os agentes do tenant
router.get('/whatsapp/status', authMiddleware, async (req, res) => {
  res.json({ agents: await getAgentsStatus(req.user.id) });
});

// QR Code de um agente específico (lê do Supabase)
router.get('/whatsapp/qr/:agentId', authMiddleware, async (req, res) => {
  const { agentId } = req.params;
  const supabase = getSupabase();
  const { data, error } = await supabase.from('agents').select('qr_code').eq('id', agentId).single();
  if (error) {
    console.error('⚠️ Erro ao buscar QR:', error.message);
    return res.status(500).json({ error: 'Não foi possível buscar QR' });
  }
  if (!data?.qr_code) return res.json({ qr: null });
  const qrDataUrl = `data:image/png;base64,${data.qr_code}`;
  res.json({ qr: qrDataUrl });
});

router.post('/whatsapp/agents', authMiddleware, async (req, res) => {
  try {
    const id = await addAgent(req.body.name, req.user.id);
    res.json({ success: true, id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/whatsapp/agents/:id/settings', authMiddleware, async (req, res) => {
  try {
    await updateAgentSettings(req.params.id, req.body.settings);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/whatsapp/agents/:id/restart', authMiddleware, async (req, res) => {
  try {
    await restartWhatsAppBot(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Alias para o dashboard que usa /whatsapp/restart no body
router.post('/whatsapp/restart', authMiddleware, async (req, res) => {
  try {
    const { agentId } = req.body;
    await restartWhatsAppBot(agentId);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/whatsapp/agents/:id', authMiddleware, async (req, res) => {
  try {
    await removeAgent(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/whatsapp/broadcast', authMiddleware, async (req, res) => {
  const { agentId, numbers, message, delay, media } = req.body;
  const tenantId = req.user.id;

  if (!agentId || !numbers || (!message && !media)) {
    return res.status(400).json({ error: 'Faltam parâmetros obrigatórios' });
  }

  // Verifica se o agente pertence ao tenant
  const { sendDirectMessage, getAgentsStatus } = require('../whatsapp/bot');
  const userAgents = await getAgentsStatus(tenantId);
  const hasAgent = userAgents.find(a => a.id === agentId);

  if (!hasAgent) return res.status(403).json({ error: 'Acesso negado ao agente' });

  // 🛡️ Verifica se o agente está realmente ativo no processo
  if (hasAgent.status !== 'connected') {
    return res.status(400).json({ error: `O agente ${hasAgent.name} não está conectado no momento. Status: ${hasAgent.status}` });
  }

  // Inicia o processo em background para não travar a requisição
  res.json({ status: 'iniciado', total: numbers.length });

  const BATCH_SIZE = 50; // Pausa maior a cada 50 mensagens
  const BATCH_PAUSE_MS = 30000; // 30s de pausa entre lotes
  const MAX_RECONNECT_WAIT = 120000; // Espera até 2min pela reconexão

  (async () => {
    let sent = 0;
    let errors = 0;
    const total = numbers.length;

    console.log(`\n📢 ══════════════════════════════════════════════════`);
    console.log(`📢 BROADCAST INICIADO [${tenantId}]`);
    console.log(`📢 Agente: ${hasAgent.name} (${agentId})`);
    console.log(`📢 Total de contatos: ${total}`);
    console.log(`📢 Delay configurado: ${delay}s`);
    console.log(`📢 ══════════════════════════════════════════════════\n`);

    for (let i = 0; i < numbers.length; i++) {
      const number = numbers[i];

      // 🛡️ Verifica se o agente ainda está conectado antes de cada envio
      const currentAgents = await getAgentsStatus(tenantId);
      const currentAgent = currentAgents.find(a => a.id === agentId);

      if (!currentAgent || currentAgent.status !== 'connected') {
        console.warn(`⚠️ Broadcast [${tenantId}]: Agente desconectou no contato ${i + 1}/${total}. Aguardando reconexão...`);

        // Espera pela reconexão com timeout
        let reconnected = false;
        const startWait = Date.now();

        while (Date.now() - startWait < MAX_RECONNECT_WAIT) {
          await new Promise(r => setTimeout(r, 5000)); // Verifica a cada 5s
          const recheck = await getAgentsStatus(tenantId);
          const recheckAgent = recheck.find(a => a.id === agentId);
          if (recheckAgent && recheckAgent.status === 'connected') {
            reconnected = true;
            console.log(`✅ Broadcast [${tenantId}]: Agente reconectado! Continuando do contato ${i + 1}/${total}...`);
            break;
          }
        }

        if (!reconnected) {
          console.error(`❌ Broadcast [${tenantId}]: Agente não reconectou após ${MAX_RECONNECT_WAIT / 1000}s. Abortando broadcast no contato ${i + 1}/${total}.`);
          console.log(`📊 Broadcast ABORTADO: ${sent} enviados, ${errors} erros de ${total} total.`);
          return;
        }
      }

      try {
        // skipValidation: true → NÃO faz onWhatsApp() para cada número (evita rate-limit)
        await sendDirectMessage(agentId, number, message, media, { skipValidation: true, retries: 2 });
        sent++;
        console.log(`📢 Broadcast [${tenantId}]: ✅ ${sent}/${total} - Enviado para ${number}`);
      } catch (err) {
        errors++;
        console.error(`📢 Broadcast [${tenantId}]: ❌ Erro no contato ${i + 1}/${total} (${number}):`, err.message);

        // Se o erro é de socket/desconexão, não desiste — volta pro verificação de reconexão
        if (err.message.includes('desconectado') || err.message.includes('Socket') || err.message.includes('not connected')) {
          console.warn(`⚠️ Broadcast: Erro de conexão detectado. Voltando para buscar reconexão...`);
          i--; // Tenta novamente este número na próxima iteração
          await new Promise(r => setTimeout(r, 10000));
          continue;
        }
      }

      // 🕐 Delay entre mensagens: base + jitter aleatório para parecer humano
      const baseDelay = (delay || 10) * 1000;
      const jitter = Math.random() * 5000; // 0-5s extras aleatórios
      const waitTime = baseDelay + jitter;

      // 📦 Pausa maior entre lotes para segurança
      if ((i + 1) % BATCH_SIZE === 0 && i + 1 < total) {
        console.log(`📢 Broadcast [${tenantId}]: 📦 Lote de ${BATCH_SIZE} concluído. Pausando ${BATCH_PAUSE_MS / 1000}s para segurança...`);
        await new Promise(r => setTimeout(r, BATCH_PAUSE_MS));
      } else {
        await new Promise(r => setTimeout(r, waitTime));
      }
    }

    console.log(`\n📢 ══════════════════════════════════════════════════`);
    console.log(`📢 BROADCAST FINALIZADO [${tenantId}]`);
    console.log(`📢 ✅ Enviados: ${sent} | ❌ Erros: ${errors} | 📊 Total: ${total}`);
    console.log(`📢 ══════════════════════════════════════════════════\n`);
  })().catch(err => {
    console.error(`❌ Broadcast CRASH [${tenantId}]:`, err.message);
  });
});

// ── FOLLOW-UP ROUTES ──────────────────────────────────────────

router.get('/follow-ups', authMiddleware, async (req, res) => {
  try {
    const items = await listFollowUps(req.user.id);
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/follow-ups', authMiddleware, async (req, res) => {
  try {
    const { agentId, contactNumber, contactName, message, scheduledAt } = req.body;
    const item = await addFollowUp({
      tenantId: req.user.id,
      agentId,
      contactNumber,
      contactName,
      message,
      scheduledAt
    });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/follow-ups/:id', authMiddleware, async (req, res) => {
  try {
    await deleteFollowUp(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── CREATIVE CENTER ROUTES ──────────────────────────────────────

const { generateCreativeChat } = require('../ai/pipeline');

router.post('/creative-chat', authMiddleware, async (req, res) => {
  try {
    const { messages, agentRole, customInstruction } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Messages array is required' });

    const reply = await generateCreativeChat(messages, agentRole || 'Consultor', customInstruction);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── INSTAGRAM ROUTES ──────────────────────────────────────────

const instagramRouter = require('../instagram/bot');
router.use('/instagram', instagramRouter);

// ── GOOGLE CALENDAR ROUTES ────────────────────────────────────

const { getGoogleAuthUrl, exchangeCodeForTokens } = require('../google/calendar');

// 1. O frontend chama essa rota para pegar o link gerado para o Google
router.get('/google/auth/:agentId', authMiddleware, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { listAgents } = require('../db/repository');

    const agents = await listAgents();
    const agent = agents.find(a => a.id === agentId);

    if (!agent || !agent.settings?.google_calendar_key) {
      return res.status(400).json({ error: 'Credenciais do Google ausentes neste agente.' });
    }

    const url = getGoogleAuthUrl(agent.settings.google_calendar_key, agentId);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. O Google redireciona de volta para esta rota após o usuário autorizar
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state: agentId } = req.query;
    if (!code || !agentId) return res.status(400).send('Dados inválidos do Google.');

    // Busca o Agente para pegar a chave
    const { listAgents } = require('../db/repository');
    const { updateAgentSettings } = require('../whatsapp/bot');

    const agents = await listAgents();
    const agent = agents.find(a => a.id === agentId);

    if (!agent) return res.status(404).send('Agente não encontrado.');

    // Troca o código temporário por tokens perenes
    const tokens = await exchangeCodeForTokens(agent.settings.google_calendar_key, code);

    // Salva o Token gerado dentro das settings do Agente
    await updateAgentSettings(agentId, {
      ...agent.settings,
      google_calendar_token: tokens
    });

    // Avisa que deu certo
    res.send('<h1>✅ Integração Concluída com Sucesso!</h1><p>Você já pode fechar esta janela e voltar ao Painel. O bot agora tem acesso à sua agenda.</p>');
  } catch (err) {
    res.status(500).send('❌ Falha na autenticação do Google: ' + err.message);
  }
});

// ── OS (ORDENS DE SERVIÇO) ROUTES ─────────────────────────────

const osRouter = require('./osRoutes');
router.use('/os', osRouter);

// ── DELIVERY (ENTREGAS EM TEMPO REAL) ─────────────────────────
const deliveryRouter = require('./deliveryRoutes');
router.use('/delivery', deliveryRouter);

// ── CRM & KANBAN ROUTES ───────────────────────────────────────
const crmRouter = require('./crmRoutes');
router.use('/crm', crmRouter);

module.exports = router;
