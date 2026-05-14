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
const { saveConversationMessage } = require('../db/repository');

const logger = pino({ level: 'silent' });
const BASE_AUTH_DIR = path.resolve(__dirname, '../../auth_info');

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
      qr: running ? running.qr : (saved.qr || null),
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
  if (message.audioMessage) return { type: 'audio', mimetype: message.audioMessage.mimetype || 'audio/ogg' };
  if (message.imageMessage) return { type: 'image', mimetype: message.imageMessage.mimetype || 'image/jpeg', caption: message.imageMessage.caption || '' };
  if (message.documentMessage) return { type: 'document', filename: message.documentMessage.fileName || '', caption: message.documentMessage.caption || '' };
  return { type: 'unknown' };
}

const initializingAgents = new Set();

async function startWhatsAppBot(agentId = 'default', agentName = 'Assistente Principal', agentSettings = null, tenantId = 'default') {
  if (initializingAgents.has(agentId)) {
    console.log(`⏳ Agente ${agentId} já está inicializando. Bloqueando tentativa duplicada.`);
    return;
  }
  
  const existing = agents.get(agentId);
  if (existing && existing.status === 'connected') return existing.sock;

  initializingAgents.add(agentId);
  const authDir = `${BASE_AUTH_DIR}_${agentId}`;
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
  
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();
  
  const sock = makeWASocket({
    version,
    logger,
    auth: state,
    printQRInTerminal: false,
    browser: ['WA Pro', 'Chrome', '126.0.0'],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
  });
  
  const defaultSettings = {
    bot_name: agentName,
    system_prompt: 'Você é um assistente amigável.',
    response_mode: 'mirror',
    tts_voice: 'nova',
    prefix: '!ia',
    respond_all: true
  };

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
      agentData.qr = qr;
      agentData.status = 'waiting_qr';
      agents.set(agentId, agentData);
      
      try {
        const supabase = getSupabase();
        await supabase.from('agents').update({ qr_code: qr, status: 'waiting_qr' }).eq('id', agentId);
      } catch (e) {}
    }
    
    if (connection === 'close') {
      initializingAgents.delete(agentId);
      agentData.qr = null;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      agentData.status = 'disconnected';
      agents.set(agentId, agentData);
      
      try {
        const supabase = getSupabase();
        await supabase.from('agents').update({ qr_code: null, status: 'disconnected' }).eq('id', agentId);
      } catch (e) {}

      if (shouldReconnect) {
        const delay = statusCode === DisconnectReason.restartRequired ? 1000 : 10000;
        console.log(`⚠️ Conexão perdida para [${agentName}]. Tentando reconectar em ${delay/1000}s...`);
        setTimeout(() => startWhatsAppBot(agentId, agentName, agentData.settings, agentData.tenantId), delay);
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
      console.log(`✅ [${agentName}] WhatsApp Conectado com Sucesso!`);
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
          const buffer = await downloadMediaMessage(msg, 'buffer', {});
          textToProcess = await transcribeAudio(buffer, msgType.mimetype);
        } else if (msgType.type === 'image' || msgType.type === 'document') {
          textToProcess = msgType.caption || 'Arquivo recebido';
        } else {
          textToProcess = msgType.text;
        }

        if (textToProcess) {
          const threadId = `${tenantId}__${sender}__${agentId}`;
          
          // Salva mensagem recebida
          await saveConversationMessage({
            whatsappId: threadId,
            userName: senderName,
            role: 'user',
            content: textToProcess,
            contentType: msgType.type
          }).catch(e => console.error('Erro ao salvar msg user:', e.message));

          const result = await processMessage(sender, senderName, textToProcess, msgType.type, null, settings.bot_name, agentId, tenantId);
          
          if (result.audioBuffer) {
            await sock.sendMessage(sender, { audio: result.audioBuffer, mimetype: 'audio/mp4', ptt: true });
          } else {
            await sock.sendMessage(sender, { text: result.text });
          }

          // Salva resposta da IA
          await saveConversationMessage({
            whatsappId: threadId,
            userName: settings.bot_name,
            role: 'assistant',
            content: result.text,
            contentType: result.audioBuffer ? 'audio' : 'text'
          }).catch(e => console.error('Erro ao salvar msg bot:', e.message));
        }
      } catch (err) {
        console.error(`Erro [${agentName}]:`, err.message);
      } finally {
        await sock.sendPresenceUpdate('paused', sender);
      }
    }
  });
  
  return sock;
}

async function restartWhatsAppBot(agentId) {
  const agentData = agents.get(agentId);
  if (agentData && agentData.sock) {
    try { agentData.sock.ws.close(); } catch (e) {}
  }
  
  const authDir = `${BASE_AUTH_DIR}_${agentId}`;
  if (fs.existsSync(authDir)) {
    try { fs.rmSync(authDir, { recursive: true, force: true }); } catch (e) {}
  }
  
  setTimeout(() => {
    if (agentData) startWhatsAppBot(agentId, agentData.name, agentData.settings, agentData.tenantId);
  }, 2000);
}

async function startFleet() {
  const { listAgents } = require('../db/repository');
  const savedAgents = await listAgents();
  for (const agent of savedAgents) {
    startWhatsAppBot(agent.id, agent.name, agent.settings, agent.tenantId || 'default');
  }
}

async function addAgent(name, tenantId = 'default') {
  const newId = `agent_${Date.now()}`;
  const supabase = getSupabase();
  await supabase.from('agents').upsert({
    id: newId,
    tenant_id: tenantId,
    name,
    status: 'disconnected',
    settings: { bot_name: name, system_prompt: 'Você é um assistente amigável.', response_mode: 'mirror', tts_voice: 'nova', prefix: '!ia', respond_all: true }
  });
  startWhatsAppBot(newId, name, null, tenantId);
  return newId;
}

async function removeAgent(agentId) {
  const agentData = agents.get(agentId);
  if (agentData && agentData.sock) {
    try { agentData.sock.ws.close(); } catch (e) {}
  }
  agents.delete(agentId);
  const authDir = `${BASE_AUTH_DIR}_${agentId}`;
  if (fs.existsSync(authDir)) fs.rmSync(authDir, { recursive: true, force: true });
  const supabase = getSupabase();
  await supabase.from('agents').delete().eq('id', agentId);
}

async function updateAgentSettings(agentId, newSettings) {
  const supabase = getSupabase();
  await supabase.from('agents').update({ settings: newSettings, name: newSettings.bot_name || undefined }).eq('id', agentId);
  const agentData = agents.get(agentId);
  if (agentData) {
    agentData.settings = { ...agentData.settings, ...newSettings };
    agentData.name = newSettings.bot_name || agentData.name;
  }
}

module.exports = { startWhatsAppBot, getAgentsStatus, restartWhatsAppBot, startFleet, addAgent, removeAgent, updateAgentSettings };
