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

const { useSupabaseAuthState } = require('./supabase-auth');

async function startWhatsAppBot(agentId = 'default', agentName = 'Assistente Principal', agentSettings = null, tenantId = 'default') {
  const { state, saveCreds } = await useSupabaseAuthState(agentId);
  const { version } = await fetchLatestBaileysVersion();
  
  const sock = makeWASocket({
    version,
    logger,
    auth: state,
    printQRInTerminal: false,
    browser: [`WA Pro - ${agentName}`, 'Chrome', '126.0.0'],
  });
  
  const defaultSettings = {
    bot_name: agentName,
    system_prompt: 'Você é um assistente amigável. Responda em português de forma natural.',
    response_mode: 'mirror',
    tts_voice: 'nova',
    prefix: '!ia',
    respond_all: true
  };

  agents.set(agentId, { 
    sock, 
    status: 'disconnected', 
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
      // Salva QR na memória local
      agentData.qr = qr;
      agentData.status = 'waiting_qr';
      agents.set(agentId, agentData);

      // Persiste QR no Supabase para acesso em produção
      try {
        const supabase = getSupabase();
        // Baileys may provide QR as a string (base64) or Buffer
        const qrBase64 = typeof qr === 'string' ? qr : Buffer.from(qr).toString('base64');
        const { error } = await supabase.from('agents').update({ qr_code: qrBase64, status: 'waiting_qr' }).eq('id', agentId);
        if (error) console.error('⚠️ Falha ao salvar QR no Supabase:', error.message);
        else console.log(`📱 QR-Code salvo para agente ${agentId}`);
      } catch (e) {
        console.error('⚠️ Erro ao persistir QR:', e.message);
      }

      // Timeout: limpa QR expirado após 2 minutos
      setTimeout(async () => {
        const current = agents.get(agentId);
        if (current && current.status === 'waiting_qr') {
          current.qr = null;
          current.status = 'disconnected';
          agents.set(agentId, current);
          try {
            const supabase = getSupabase();
            await supabase.from('agents').update({ qr_code: null, status: 'disconnected' }).eq('id', agentId);
          } catch (e) {}
          console.log(`⏰ QR expirado para agente ${agentId}`);
        }
      }, 2 * 60 * 1000);
    }
    
    if (connection === 'close') {
      agentData.qr = null;
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      agentData.status = 'disconnected';
      agents.set(agentId, agentData);

      // Atualiza status no Supabase
      try {
        const supabase = getSupabase();
        await supabase.from('agents').update({ qr_code: null, status: 'disconnected' }).eq('id', agentId);
      } catch (e) {}

      if (shouldReconnect) {
        setTimeout(() => startWhatsAppBot(agentId, agentName, agentData.settings, agentData.tenantId), 3000);
      } else {
        console.log(`[${agentName} | ${agentData.tenantId}] Sessão encerrada.`);
      }
    }
    
    if (connection === 'open') {
      agentData.qr = null;
      agentData.status = 'connected';
      agents.set(agentId, agentData);

      // Limpa QR e atualiza status no Supabase
      try {
        const supabase = getSupabase();
        await supabase.from('agents').update({ qr_code: null, status: 'connected' }).eq('id', agentId);
      } catch (e) {}

      console.log(`✅ [${agentName} | ${agentData.tenantId}] WhatsApp Conectado!`);
    }
  });

  sock.ev.on('creds.update', saveCreds);
  
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
