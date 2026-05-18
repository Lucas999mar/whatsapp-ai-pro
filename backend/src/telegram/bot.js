const TelegramBot = require('node-telegram-bot-api');
const { processMessage } = require('../ai/pipeline');
const { getSupabase } = require('../db/supabase');

const activeTelegramBots = new Map();

/**
 * Inicia o bot do Telegram para um Tenant e Agente específicos.
 */
async function startTelegramBot(agentId, telegramToken, tenantId, agentName = 'Assistente') {
  if (activeTelegramBots.has(agentId)) {
    // Já existe, vamos parar o anterior
    const oldBot = activeTelegramBots.get(agentId);
    oldBot.stopPolling();
    activeTelegramBots.delete(agentId);
  }

  if (!telegramToken) return;

  try {
    const bot = new TelegramBot(telegramToken, { polling: true });
    
    bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const senderName = msg.from.first_name || 'Usuário Telegram';
      
      let textToProcess = msg.text || msg.caption || '';
      
      // Para áudios (voice notes)
      let mediaType = 'text';
      if (msg.voice) {
         // Na Fase 4 completada vamos adicionar download do áudio no Telegram para transcrição.
         // Por enquanto avisamos que não está mapeado no Telegram (apenas no WhatsApp).
         bot.sendMessage(chatId, "Desculpe, ainda estou aprendendo a ouvir áudios por aqui! Mande texto por favor.");
         return;
      }
      
      if (!textToProcess) return;

      // Mostra o status "Digitando..." no Telegram
      bot.sendChatAction(chatId, 'typing');

      try {
        // Envia para o mesmo Cérebro Central que o WhatsApp usa
        const result = await processMessage(
          `TG_${chatId}`, // PrefixTG para isolar conversas do Telegram
          senderName, 
          textToProcess, 
          mediaType, 
          null, 
          agentName, 
          agentId, 
          tenantId, 
          null
        );

        if (result.audioBuffer) {
          // Se o modo for áudio, envia Voice
          await bot.sendVoice(chatId, result.audioBuffer);
        } else {
          // Resposta normal em texto
          await bot.sendMessage(chatId, result.text);
        }
        
      } catch (err) {
        console.error(`❌ Erro no Telegram [${agentId}]:`, err.message);
      }
    });

    bot.on('polling_error', (error) => {
      console.log(`⚠️ Erro de Polling Telegram [${agentId}]:`, error.message);
    });

    activeTelegramBots.set(agentId, bot);
    console.log(`✅ [Telegram] Bot conectado com sucesso para o agente: ${agentName}`);
    
  } catch (e) {
    console.error(`❌ [Telegram] Falha ao iniciar bot para ${agentName}:`, e.message);
  }
}

/**
 * Lê do banco de dados quais agentes têm token do Telegram e inicia todos.
 */
async function startTelegramFleet() {
  const { listAgents } = require('../db/repository');
  const agents = await listAgents();
  
  for (const agent of agents) {
    // Na nossa modelagem, vamos assumir que o token será salvo nas settings do agente
    const tgToken = agent.settings?.telegram_token;
    if (tgToken) {
      startTelegramBot(agent.id, tgToken, agent.tenantId || agent.tenant_id, agent.name);
    }
  }
}

module.exports = { startTelegramBot, startTelegramFleet };
