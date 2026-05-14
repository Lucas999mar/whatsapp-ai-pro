const { 
  makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const { processMessage, transcribeAudio } = require('../ai/pipeline');
const { getSupabase } = require('../db/supabase');
const config = require('../config/config');

const logger = pino({ level: 'silent' });
const BASE_AUTH_DIR = path.resolve(config.authDir);

// Map to store multiple bot sessions: { [id]: { sock, status, qr, name, settings, tenantId } }
const agents = new Map();

async function getAgentsStatus(tenantId = null) {
  const { listAgents } = require('../db/repository');
  const savedAgents = await listAgents(tenantId);
  
  return savedAgents.map(saved => {
    const running = agents.get(saved.id);
    return {
      id: saved.id,
      name: saved.name,
      status: running ? running.status : (saved.status || 'disconnected'),
      qr: running ? (running.qr || saved.qr) : (saved.qr || null),
      settings: running ? running.settings : (saved.settings || {}),
      tenantId: saved.tenantId || saved.tenant_id
    };
  });
}

function getMessageType(msg) {
  const message = msg.message;
  if (!message) return { type: 'unknown' };
  
  if (message.conversation) return { type: 'text', text: message.conversation };
  if (message.extendedTextMessage) return { type: 'text', text: message.extendedTextMessage.text };
  
  if (message.audioMessage) {
    return { type: 'audio', mimetype: message.audioMessage.mimetype || 'audio/ogg' };
  }
  if (message.imageMessage) {
    return { type: 'image', mimetype: message.imageMessage.mimetype || 'image/jpeg', caption: message.imageMessage.caption || '' };
  }
  if (message.documentMessage) {
    return { type: 'document', filename: message.documentMessage.fileName || '', caption: message.documentMessage.caption || '' };
  }
  
  return { type: 'unknown' };
}

// Set to track agents currently initializing to prevent race conditions
const initializingAgents = new Set();

async function startWhatsAppBot(agentId = 'default', agentName = 'Assistente Principal', agentSettings = null, tenantId = 'default') {
  if (initializingAgents.has(agentId)) {
    console.log(`⏳ Agente ${agentId} já está inicializando. Aguardando...`);
    return;
  }

  const existing = agents.get(agentId);
  if (existing && existing.status === 'connected') {
    console.log(`✅ Agente ${agentId} já está conectado. Ignorando.`);
    return existing.sock;
  }

  if (existing && existing.sock) {
    try { 
      existing.sock.ev.removeAllListeners();
      existing.sock.ws.close(); 
    } catch (e) {}
  }

  initializingAgents.add(agentId);
  console.log(`🚀 Iniciando conexão única para: ${agentName} (${agentId})`);

  const authDir = path.resolve(`/tmp/auth_${agentId}`);
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  // 1. Tenta restaurar creds do Supabase para o disco local
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('whatsapp_auth').select('data').eq('id', `${agentId}:creds`).single();
    if (data && !fs.existsSync(path.join(authDir, 'creds.json'))) {
      fs.writeFileSync(path.join(authDir, 'creds.json'), JSON.stringify(data.data));
      console.log(`📥 Sessão restaurada do Supabase para ${agentId}`);
    }
  } catch (e) {}

  const defaultSettings = {
    bot_name: agentName,
    system_prompt: 'Você é um assistente amigável. Responda em português de forma natural.',
    response_mode: 'mirror',
    tts_voice: 'nova',
    prefix: '!ia',
    respond_all: true
  };

  try {
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
      version,
      logger,
      auth: state,
      printQRInTerminal: false,
      browser: [`WA Pro - ${agentName}`, 'Chrome', '126.0.0'],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
    });
    
    agents.set(agentId, { 
      sock, 
      status: 'connecting', 
      qr: null, 
      name: agentName, 
      tenantId: tenantId || 'default',
      settings: agentSettings || defaultSettings 
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      const agentData = agents.get(agentId);
      if (!agentData) return;

      if (qr) {
        agentData.qr = qr; // Envia o texto PURO para o QRCodeSVG do Frontend
        agentData.status = 'waiting_qr';
        agents.set(agentId, agentData);

        try {
          const supabase = getSupabase();
          // Salva o texto bruto no banco para o Frontend ler via API se precisar
          await supabase.from('agents').update({ qr_code: qr, status: 'waiting_qr' }).eq('id', agentId);
          console.log(`📱 [${agentName}] QR-Code pronto para leitura no painel.`);
        } catch (e) {
          console.error('⚠️ Erro ao persistir QR:', e.message);
        }
      }

      if (connection === 'open') {
        initializingAgents.delete(agentId);
        agentData.qr = null;
        agentData.status = 'connected';
        agents.set(agentId, agentData);

        try {
          const supabase = getSupabase();
          await supabase.from('agents').update({ qr_code: null, status: 'connected' }).eq('id', agentId);
        } catch (e) {}

        console.log(`✅ [${agentName} | ${agentData.tenantId}] WhatsApp Conectado!`);
      }
      
      if (connection === 'close') {
        initializingAgents.delete(agentId);
        agentData.qr = null;
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        agentData.status = 'disconnected';
        agents.set(agentId, agentData);

        try {
          const supabase = getSupabase();
          await supabase.from('agents').update({ qr_code: null, status: 'disconnected' }).eq('id', agentId);
        } catch (e) {}

        if (shouldReconnect) {
          setTimeout(() => startWhatsAppBot(agentId, agentName, agentData.settings, agentData.tenantId), 3000);
        }
      }
    });

    sock.ev.on('creds.update', async () => {
      await saveCreds();
      try {
        const supabase = getSupabase();
        const credsPath = path.join(authDir, 'creds.json');
        if (fs.existsSync(credsPath)) {
          const credsData = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
          await supabase.from('whatsapp_auth').upsert({ 
            id: `${agentId}:creds`, 
            data: credsData, 
            updated_at: new Date().toISOString() 
          });
        }
      } catch (e) {
        console.error('❌ Erro ao sincronizar credenciais com Supabase:', e.message);
      }
    });
    
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      
      const agentData = agents.get(agentId);
      if (!agentData) return;
      const { settings, tenantId } = agentData;

      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        
        const sender = msg.key.remoteJid;
        const senderName = msg.pushName || sender.split('@')[0];
        const msgType = getMessageType(msg);
        
        if (msgType.type === 'unknown') continue;
        
        if (!settings.respond_all && msgType.type === 'text') {
          const prefix = settings.prefix || '!ia';
          if (!msgType.text.toLowerCase().startsWith(prefix.toLowerCase())) continue;
          msgType.text = msgType.text.slice(prefix.length).trim();
        }
        
        await sock.sendPresenceUpdate('composing', sender);
        
        try {
          let textToProcess = '';
          if (msgType.type === 'audio') {
            await sock.sendPresenceUpdate('recording', sender);
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            textToProcess = await transcribeAudio(buffer, msgType.mimetype);
          } else if (msgType.type === 'image' || msgType.type === 'document') {
            textToProcess = msgType.caption || `Usuário enviou arquivo: ${msgType.filename || 'Imagem'}`;
          } else {
            textToProcess = msgType.text;
          }

          if (textToProcess) {
            const result = await processMessage(sender, senderName, textToProcess, msgType.type, null, settings.bot_name, agentId, tenantId);
            
            if (result.audioBuffer) {
              await sock.sendMessage(sender, { audio: result.audioBuffer, mimetype: 'audio/mp4', ptt: true });
            } else {
              await sock.sendMessage(sender, { text: result.text });
            }
          }
        } catch (err) {
          console.error(`Erro [${agentName} | ${tenantId}]:`, err.message);
        } finally {
          await sock.sendPresenceUpdate('paused', sender);
        }
      }
    });

    return sock;
  } catch (err) {
    initializingAgents.delete(agentId);
    console.error(`❌ Erro ao iniciar bot ${agentId}:`, err.message);
  }
}

async function restartWhatsAppBot(agentId) {
  const agentData = agents.get(agentId);
  if (!agentData) return;
  
  console.log(`🔄 Reiniciando agente: ${agentData.name} (${agentData.tenantId})...`);
  agentData.status = 'disconnected';
  agentData.qr = null;
  
  try {
    if (agentData.sock) agentData.sock.ws.close();
  } catch (e) {}
  
  // Limpa estado de autenticação no Supabase
  try {
    const supabase = getSupabase();
    await supabase.from('whatsapp_auth').delete().like('id', `${agentId}:%`);
    console.log(`🧹 Cache de autenticação limpo para ${agentId}`);
  } catch (e) {
    console.error('Erro ao limpar auth no Supabase:', e);
  }
  
  // Atualiza status no Supabase
  try {
    const supabase = getSupabase();
    await supabase.from('agents').update({ qr_code: null, status: 'disconnected' }).eq('id', agentId);
  } catch (e) {}

  setTimeout(() => startWhatsAppBot(agentId, agentData.name, agentData.settings, agentData.tenantId), 2000);
}

async function startFleet() {
  const { listAgents } = require('../db/repository');
  const savedAgents = await listAgents();
  
  if (savedAgents.length === 0) {
    console.log('⚠️ Nenhum agente encontrado para iniciar.');
    // Inicia o padrão se não houver nada (apenas para garantir)
    await startWhatsAppBot('default', 'Assistente Principal', null, 'default');
    return;
  }
  
  for (const agent of savedAgents) {
    try {
      await startWhatsAppBot(agent.id, agent.name, agent.settings, agent.tenantId || 'default');
    } catch (err) {
      console.error(`❌ Erro ao iniciar agente ${agent.name} (${agent.id}):`, err.message);
    }
  }
}

async function addAgent(name, tenantId = 'default') {
  const newId = `agent_${Date.now()}`;
  
  // Salva no Supabase
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('agents').upsert({
      id: newId,
      tenant_id: tenantId,
      name,
      status: 'disconnected',
      settings: {
        bot_name: name,
        system_prompt: 'Você é um assistente amigável.',
        response_mode: 'mirror',
        tts_voice: 'nova',
        prefix: '!ia',
        respond_all: true
      }
    });
    if (error) console.error('⚠️ Erro ao salvar agente no Supabase:', error.message);
  } catch (e) {
    console.error('⚠️ Erro ao persistir agente:', e.message);
  }

  // Fallback: salva no arquivo local também
  const fleetFile = path.resolve(__dirname, '../api/agents.json');
  try {
    let savedAgents = [];
    if (fs.existsSync(fleetFile)) {
      savedAgents = JSON.parse(fs.readFileSync(fleetFile, 'utf8'));
    }
    savedAgents.push({ id: newId, name, tenantId });
    fs.writeFileSync(fleetFile, JSON.stringify(savedAgents));
  } catch (e) {}
  
  // Inicia o bot em background (não aguarda conexão para não travar a UI)
  startWhatsAppBot(newId, name, null, tenantId).catch(err => {
    console.error(`❌ Falha ao iniciar bot para novo agente ${name}:`, err.message);
  });

  return newId;
}

async function removeAgent(agentId) {
  if (agentId === 'default') throw new Error("Não é possível remover o agente principal");
  
  const agentData = agents.get(agentId);
  if (agentData && agentData.sock) {
    try { agentData.sock.ws.close(); } catch(e){}
  }
  agents.delete(agentId);
  
  // Limpa estado de autenticação no Supabase
  try {
    const supabase = getSupabase();
    await supabase.from('whatsapp_auth').delete().like('id', `${agentId}:%`);
  } catch (e) {}
  
  // Remove do Supabase (ignore if not found)
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('agents').delete().eq('id', agentId);
    if (error) console.error('⚠️ Erro ao remover agente no Supabase:', error.message);
    else console.log(`🗑️ Agente ${agentId} removido do Supabase (se existia)`);
  } catch (e) {
    console.error('⚠️ Exceção ao remover agente no Supabase:', e.message);
  }
  // Remove do arquivo local (fallback) – safely ignore missing file
  const fleetFile = path.resolve(__dirname, '../api/agents.json');
  try {
    if (fs.existsSync(fleetFile)) {
      let savedAgents = JSON.parse(fs.readFileSync(fleetFile, 'utf8'));
      const newList = savedAgents.filter(a => a.id !== agentId);
      if (newList.length !== savedAgents.length) {
        fs.writeFileSync(fleetFile, JSON.stringify(newList));
        console.log(`🗑️ Agente ${agentId} removido do arquivo local`);
      } else {
        console.log(`ℹ️ Agente ${agentId} não estava no arquivo local`);
      }
    }
  } catch (e) {
    console.error('⚠️ Erro ao manipular arquivo local de agentes:', e.message);
  }
}

async function updateAgentSettings(agentId, newSettings) {
  // Atualiza no Supabase
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('agents').update({
      settings: newSettings,
      name: newSettings.bot_name || undefined,
      updated_at: new Date().toISOString()
    }).eq('id', agentId);
    if (error) console.error('⚠️ Erro ao atualizar settings no Supabase:', error.message);
  } catch (e) {}

  // Atualiza no arquivo local (fallback)
  const fleetFile = path.resolve(__dirname, '../api/agents.json');
  try {
    if (fs.existsSync(fleetFile)) {
      let savedAgents = JSON.parse(fs.readFileSync(fleetFile, 'utf8'));
      const index = savedAgents.findIndex(a => a.id === agentId);
      if (index !== -1) {
        savedAgents[index].settings = { ...savedAgents[index].settings, ...newSettings };
        savedAgents[index].name = newSettings.bot_name || savedAgents[index].name;
        fs.writeFileSync(fleetFile, JSON.stringify(savedAgents));
      }
    }
  } catch (e) {}
  
  // Update running instance
  const agentData = agents.get(agentId);
  if (agentData) {
    agentData.settings = { ...agentData.settings, ...newSettings };
    agentData.name = newSettings.bot_name || agentData.name;
    agents.set(agentId, agentData);
  }
}

module.exports = { 
  startWhatsAppBot, 
  getAgentsStatus, 
  restartWhatsAppBot, 
  startFleet, 
  addAgent, 
  removeAgent,
  updateAgentSettings 
};
