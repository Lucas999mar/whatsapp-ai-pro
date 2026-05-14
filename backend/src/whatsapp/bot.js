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
const config = require('../config/config');

const logger = pino({ level: 'silent' });
const BASE_AUTH_DIR = path.resolve(config.authDir);

// Map to store multiple bot sessions: { [id]: { sock, status, qr, name, settings, tenantId } }
const agents = new Map();

function getAgentsStatus(tenantId = null) {
  let entries = Array.from(agents.entries());
  if (tenantId) {
    entries = entries.filter(([id, data]) => data.tenantId === tenantId);
  }
  
  return entries.map(([id, data]) => ({
    id,
    name: data.name,
    status: data.status,
    qr: data.qr,
    settings: data.settings,
    tenantId: data.tenantId
  }));
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

async function startWhatsAppBot(agentId = 'default', agentName = 'Assistente Principal', agentSettings = null, tenantId = 'default') {
  const authDir = `${BASE_AUTH_DIR}_${agentId}`;
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
  
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
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
      agentData.qr = qr;
      agentData.status = 'waiting_qr';
    }
    
    if (connection === 'close') {
      agentData.qr = null;
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      agentData.status = 'disconnected';
      if (shouldReconnect) {
        setTimeout(() => startWhatsAppBot(agentId, agentName, agentData.settings, agentData.tenantId), 3000);
      } else {
        console.log(`[${agentName} | ${agentData.tenantId}] Sessão encerrada.`);
      }
    }
    
    if (connection === 'open') {
      agentData.qr = null;
      agentData.status = 'connected';
      console.log(`✅ [${agentName} | ${agentData.tenantId}] WhatsApp Conectado!`);
    }
    
    agents.set(agentId, agentData);
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
  
  const authDir = `${BASE_AUTH_DIR}_${agentId}`;
  try {
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
    }
  } catch (e) {
    console.error('Erro ao deletar auth_info:', e);
  }
  
  setTimeout(() => startWhatsAppBot(agentId, agentData.name, agentData.settings, agentData.tenantId), 2000);
}

async function startFleet() {
  const fleetFile = path.resolve('./agents.json');
  let savedAgents = [{ id: 'default', name: 'Assistente Principal', tenantId: 'default' }];
  
  if (fs.existsSync(fleetFile)) {
    try {
      savedAgents = JSON.parse(fs.readFileSync(fleetFile, 'utf8'));
    } catch(e){}
  } else {
    fs.writeFileSync(fleetFile, JSON.stringify(savedAgents));
  }
  
  for (const agent of savedAgents) {
    await startWhatsAppBot(agent.id, agent.name, agent.settings, agent.tenantId || 'default');
  }
}

async function addAgent(name, tenantId = 'default') {
  const newId = `agent_${Date.now()}`;
  const fleetFile = path.resolve('./agents.json');
  let savedAgents = [];
  if (fs.existsSync(fleetFile)) {
    savedAgents = JSON.parse(fs.readFileSync(fleetFile, 'utf8'));
  }
  const newAgent = { id: newId, name, tenantId };
  savedAgents.push(newAgent);
  fs.writeFileSync(fleetFile, JSON.stringify(savedAgents));
  
  await startWhatsAppBot(newId, name, null, tenantId);
  return newId;
}

async function removeAgent(agentId) {
  if (agentId === 'default') throw new Error("Não é possível remover o agente principal");
  
  const agentData = agents.get(agentId);
  if (agentData && agentData.sock) {
    try { agentData.sock.ws.close(); } catch(e){}
  }
  agents.delete(agentId);
  
  const authDir = `${BASE_AUTH_DIR}_${agentId}`;
  if (fs.existsSync(authDir)) fs.rmSync(authDir, { recursive: true, force: true });
  
  const fleetFile = path.resolve('./agents.json');
  if (fs.existsSync(fleetFile)) {
    let savedAgents = JSON.parse(fs.readFileSync(fleetFile, 'utf8'));
    savedAgents = savedAgents.filter(a => a.id !== agentId);
    fs.writeFileSync(fleetFile, JSON.stringify(savedAgents));
  }
}

async function updateAgentSettings(agentId, newSettings) {
  const fleetFile = path.resolve('./agents.json');
  if (!fs.existsSync(fleetFile)) return;
  
  let savedAgents = JSON.parse(fs.readFileSync(fleetFile, 'utf8'));
  const index = savedAgents.findIndex(a => a.id === agentId);
  if (index === -1) return;
  
  savedAgents[index].settings = { ...savedAgents[index].settings, ...newSettings };
  savedAgents[index].name = newSettings.bot_name || savedAgents[index].name;
  
  fs.writeFileSync(fleetFile, JSON.stringify(savedAgents));
  
  // Update running instance
  const agentData = agents.get(agentId);
  if (agentData) {
    agentData.settings = savedAgents[index].settings;
    agentData.name = savedAgents[index].name;
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
