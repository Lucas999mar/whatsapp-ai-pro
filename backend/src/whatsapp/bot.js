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
const pendingMessages = new Map(); // Buffer para junção de mensagens picotadas

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
    id: agentId,
    name: agentName,
    socket: sock,
    status: 'connecting',
    qr: null,
    settings: agentSettings || defaultSettings,
    tenantId: tenantId || 'default',
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
      } catch (e) { }
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
      } catch (e) { }

      if (shouldReconnect) {
        const delay = statusCode === DisconnectReason.restartRequired ? 1000 : 10000;
        console.log(`⚠️ Conexão perdida para [${agentName}]. Tentando reconectar em ${delay / 1000}s...`);
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
      } catch (e) { }
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
      let sender = msg.key.remoteJid;

      // Tenta resolver LID para Telefone (PN) se for o caso
      if (sender.endsWith('@lid')) {
        try {
          // Alguns eventos trazem o JID alternativo (com o telefone) diretamente
          if (msg.key.remoteJidAlt) {
            sender = msg.key.remoteJidAlt;
          } else {
            // Tenta buscar no mapeamento interno do Baileys
            const pn = await sock.signalRepository.lidMapping.getPNForLID(sender);
            if (pn) sender = pn;
          }
        } catch (e) {
          console.log('⚠️ Não foi possível resolver LID para Telefone:', e.message);
        }
      }

      const senderName = msg.pushName || sender.split('@')[0];

      let userPhoto = null;
      try {
        userPhoto = await sock.profilePictureUrl(sender, 'image').catch(() => null);
      } catch (e) { }

      const msgType = getMessageType(msg);

      if (msgType.type === 'unknown') continue;

      if (!settings.respond_all && msgType.type === 'text') {
        const prefix = settings.prefix || '!ia';
        if (!msgType.text.toLowerCase().startsWith(prefix.toLowerCase())) continue;
        msgType.text = msgType.text.slice(prefix.length).trim();
      }

      // Não envia 'composing' imediatamente para não bugar durante a espera do debounce

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
          const key = `${tenantId}_${agentId}_${sender}`;

          if (!pendingMessages.has(key)) {
            pendingMessages.set(key, {
              texts: [],
              timer: null,
              hasAudio: false,
              userPhoto: userPhoto,
              senderName: senderName
            });
          }

          const pending = pendingMessages.get(key);
          pending.texts.push(textToProcess);
          if (msgType.type === 'audio') pending.hasAudio = true;
          if (userPhoto) pending.userPhoto = userPhoto;

          if (pending.timer) clearTimeout(pending.timer);

          pending.timer = setTimeout(async () => {
            const finalContext = pending.texts.join(' \n');
            const wasAudio = pending.hasAudio;
            const photo = pending.userPhoto;
            const name = pending.senderName;

            pendingMessages.delete(key);

            // 🤖 [NOVO] Verifica se a IA está ativada para este ticket
            try {
              const threadId = `${tenantId}__${sender}__${agentId}`;
              const supabase = getSupabase();
              const { data: ticket } = await supabase.from('crm_tickets').select('ai_enabled').eq('whatsapp_id', threadId).single();

              if (ticket && ticket.ai_enabled === false) {
                console.log(`🔕 IA Desativada para ${sender}. Apenas registrando mensagem.`);
                const { saveConversationMessage } = require('../db/repository');
                await saveConversationMessage({
                  whatsappId: threadId,
                  userName: name,
                  role: 'user',
                  content: finalContext,
                  contentType: wasAudio ? 'audio' : 'text',
                  userPhoto: photo
                });
                return;
              }
            } catch (e) {
              console.warn('⚠️ Erro ao verificar status da IA, procedendo normalmente:', e.message);
            }

            // Só avisa que está "digitando/gravando" agora que vai processar de verdade
            await sock.sendPresenceUpdate(wasAudio ? 'recording' : 'composing', sender);

            try {
              const result = await processMessage(
                sender, name, finalContext, wasAudio ? 'audio' : 'text', null, settings.bot_name, agentId, tenantId, photo
              );

              if (result.audioBuffer) {
                await sock.sendMessage(sender, {
                  audio: result.audioBuffer,
                  mimetype: 'audio/ogg; codecs=opus',
                  ptt: true
                });
              } else {
                await sock.sendMessage(sender, { text: result.text });
              }
            } catch (err) {
              console.error(`Erro [${agentName}]:`, err.message);
            } finally {
              await sock.sendPresenceUpdate('paused', sender);
            }
          }, 6000); // Aguarda 6 segundos de silêncio para juntar tudo
        }
      } catch (err) {
        console.error(`Erro extraindo media [${agentName}]:`, err.message);
      }
    }
  });

  return sock;
}

async function restartWhatsAppBot(agentId) {
  const agentData = agents.get(agentId);
  if (agentData && agentData.socket) {
    try { agentData.socket.ws.close(); } catch (e) { }
  }

  const authDir = `${BASE_AUTH_DIR}_${agentId}`;
  if (fs.existsSync(authDir)) {
    try { fs.rmSync(authDir, { recursive: true, force: true }); } catch (e) { }
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
    settings: {
      bot_name: name,
      system_prompt: 'Você é um assistente amigável.',
      response_mode: 'mirror',
      tts_voice: 'nova',
      prefix: '!ia',
      respond_all: true
    }
  });
  startWhatsAppBot(newId, name, null, tenantId);
  return newId;
}

async function removeAgent(agentId) {
  const agentData = agents.get(agentId);
  if (agentData && agentData.socket) {
    try { agentData.socket.ws.close(); } catch (e) { }
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

async function sendDirectMessage(agentId, number, text, media = null) {
  const agent = agents.get(agentId);
  if (!agent || !agent.socket) throw new Error('Agente não está conectado ou não existe');

  console.log(`📡 [DirectMessage] Preparando envio para ${number} via agente ${agentId}`);

  // Limpa o número e garante que tenha o formato de JID básico
  let cleanNumber = number.replace(/\D/g, '');

  // Se for número do Brasil e não tiver o 55, adiciona
  if (cleanNumber.length >= 10 && cleanNumber.length <= 11 && !cleanNumber.startsWith('55')) {
    cleanNumber = '55' + cleanNumber;
  }

  let testJid = cleanNumber.includes('@') ? cleanNumber : `${cleanNumber}@s.whatsapp.net`;
  let finalJid = testJid;

  // 🛡️ [MELHORIA] Tenta resolver o JID correto (com ou sem o 9) via WhatsApp
  try {
    console.log(`🔍 [DirectMessage] Verificando existência de ${testJid}...`);
    const results = await agent.socket.onWhatsApp(testJid);
    if (results && results.length > 0 && results[0].exists) {
      finalJid = results[0].jid;
      console.log(`✅ [DirectMessage] Número validado: ${finalJid}`);
    } else {
      console.warn(`⚠️ [DirectMessage] Número ${testJid} não encontrado pelo WhatsApp. Prosseguindo com JID padrão.`);
    }
  } catch (e) {
    console.error(`❌ [DirectMessage] Erro na verificação onWhatsApp para ${testJid}:`, e.message);
  }

  const tenantId = agent.tenantId || 'default';
  const whatsappId = `${tenantId}__${finalJid}__${agentId}`;

  // Envia a mensagem
  try {
    if (media && media.url) {
      console.log(`📂 [DirectMessage] Enviando mídia (${media.type}) para ${finalJid}`);
      const options = {};
      const type = media.type;

      if (type === 'image') options.image = { url: media.url };
      else if (type === 'video') options.video = { url: media.url };
      else if (type === 'audio') {
        options.audio = { url: media.url };
        options.mimetype = 'audio/ogg; codecs=opus';
        options.ptt = true;
      } else {
        options.document = { url: media.url };
        options.mimetype = media.mimetype || 'application/pdf';
        options.fileName = media.fileName || 'Arquivo';

        if (!media.fileName && media.url.includes('.')) {
          const parts = media.url.split('.');
          const ext = parts[parts.length - 1].split('?')[0];
          options.fileName = `Arquivo.${ext}`;
        }
      }

      if (text) options.caption = text;
      await agent.socket.sendMessage(finalJid, options);
    } else {
      console.log(`💬 [DirectMessage] Enviando texto para ${finalJid}`);
      await agent.socket.sendMessage(finalJid, { text });
    }
    console.log(`✅ [DirectMessage] Mensagem entregue ao WhatsApp para ${finalJid}`);
  } catch (err) {
    console.error(`❌ [DirectMessage] Erro fatal ao enviar para ${finalJid}:`, err.message);
    throw err; // Repassa para o loop de broadcast tratar
  }

  // 💾 [NOVO] Salva no histórico do CRM para aparecer no painel
  try {
    const { saveConversationMessage } = require('../db/repository');
    await saveConversationMessage({
      whatsappId,
      userName: agent.settings?.bot_name || agent.name,
      role: 'assistant',
      content: text || (media ? `Arquivo ${media.type}` : ''),
      contentType: media ? media.type : 'text',
      mediaUrl: media?.url
    });
  } catch (e) {
    console.error('⚠️ Erro ao salvar mensagem manual no histórico:', e.message);
  }
}

module.exports = { startWhatsAppBot, getAgentsStatus, restartWhatsAppBot, startFleet, addAgent, removeAgent, updateAgentSettings, sendDirectMessage };
