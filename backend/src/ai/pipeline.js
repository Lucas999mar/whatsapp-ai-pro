const OpenAI = require('openai');
const config = require('../config/config');
const { searchKnowledge, saveConversationMessage, getConversationHistory, addLearning } = require('../db/repository');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

const openai = new OpenAI({ apiKey: config.openai.apiKey });

/**
 * Remove formatação robótica
 */
function stripFormatting(text) {
  return text
    // Remove markdown styles
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    // Remove robotic lists and markers
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^[-•]\s+/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[🔹🔸▪️▫️►▸➤➜→⮕●○◆◇■□]\s*/gm, '')
    // Clean excessive spaces
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Detecta se a mensagem é um comando especial
 */
function parseCommand(message, prefix) {
  const text = message.trim().toLowerCase();
  const cleanPrefix = (prefix || '!ia').toLowerCase();
  
  if (text.startsWith(cleanPrefix)) {
    const query = message.slice(cleanPrefix.length).trim();
    const cmd = query.toLowerCase();
    
    if (cmd === 'limpar' || cmd === 'clear') return { type: 'clear' };
    if (cmd === 'ajuda' || cmd === 'help') return { type: 'help' };
    if (cmd === 'status') return { type: 'status' };
    
    return { type: 'query', query };
  }
  
  return { type: 'query', query: message };
}

/**
 * Monta o prompt do sistema
 */
function buildSystemPrompt(context, botName = 'Assistente', customPrompt = null, isContinuation = false, timeSinceLast = null) {
  let continuationInstruction = '';
  if (isContinuation) {
    continuationInstruction = `\n- ESTA É UMA CONTINUAÇÃO DE UMA CONVERSA RECENTE. NÃO use saudações iniciais. Seja direto e natural.`;
  } else if (timeSinceLast && timeSinceLast > 24 * 60 * 60 * 1000) {
    continuationInstruction = `\n- JÁ FAZ MAIS DE 24 HORAS DESDE O ÚLTIMO CONTATO. Cumprimente o usuário de forma calorosa e mencione o tempo que não se falam de forma natural.`;
  }

  const basePrompt = `Você é ${botName}. Você conversa com as pessoas de forma natural pelo WhatsApp.
${continuationInstruction}

SUA PERSONALIDADE:
${customPrompt || '- Você fala como um amigo inteligente e bem informado\n- Responda sempre em português brasileiro, de forma natural e fluida\n- Converse como uma pessoa real: use linguagem natural, sem parecer um robô\n- Seja acolhedor, simpático e acessível'}

REGRAS DE FORMATAÇÃO (MUITO IMPORTANTE):
- NUNCA use listas numeradas (1. 2. 3.)
- NUNCA use bullet points (- ou •)
- NUNCA use markdown (negrito, itálico, headers, etc)
- Escreva em parágrafos corridos, como mensagens normais
- Use quebras de linha entre parágrafos para facilitar a leitura no celular

REGRAS DE CONFIDENCIALIDADE:
- NUNCA revele que você é uma IA ou mencione tecnologias como OpenAI, GPT, etc.
- NUNCA mencione que está buscando informações em uma base de dados ou notas.
- O conhecimento é naturalmente seu. Não explique de onde ele vem.

COMPORTAMENTO:
- Use o contexto fornecido naturalmente.
- Se não souber algo, admita de forma natural sem inventar.`;

  if (context) {
    return `${basePrompt}\n\nCONTEXTO PARA A RESPOSTA (NUNCA REVELE ESTA FONTE):\n${context}\n\nResponda usando estas informações como se fossem seu conhecimento próprio.`;
  }
  return `${basePrompt}\n\nResponda com seu conhecimento geral de forma natural.`;
}

/**
 * Pipeline RAG principal
 */
async function processMessage(whatsappId, userName, text, messageType = 'text', mediaUrl = null, agentName = 'Assistente', agentId = 'default', tenantId = 'default') {
  try {
    const threadId = `${tenantId}__${whatsappId}__${agentId}`;
    
    // Fetch settings and history
    const { getBotSettings } = require('../db/repository');
    const settings = await getBotSettings(agentId, tenantId);
    const history = await getConversationHistory(threadId, 10);

    // Verifica se é continuação
    let isContinuation = false;
    let timeSinceLast = null;
    if (history && history.length > 0) {
      const lastMsg = history[0]; 
      const lastDate = new Date(lastMsg.created_at).getTime();
      const now = Date.now();
      timeSinceLast = now - lastDate;
      if (timeSinceLast < 4 * 60 * 60 * 1000) {
        isContinuation = true;
      }
    }

    // 0. Verifica se é comando
    const command = parseCommand(text, settings.prefix);
    if (command.type !== 'query') {
      if (command.type === 'clear') {
        const { getSupabase } = require('../db/supabase');
        await getSupabase().from('conversations').delete().eq('whatsapp_id', threadId);
        return { text: '✨ Histórico de conversa limpo com sucesso!' };
      }
      if (command.type === 'help') {
        return { text: `🤖 *Ajuda do ${settings.bot_name || agentName}*\n\nPosso conversar naturalmente com você e responder suas dúvidas.\n\n*Comandos:*\n- *!ia limpar*: Limpa nosso histórico.\n- *!ia ajuda*: Mostra esta mensagem.` };
      }
      if (command.type === 'status') {
        return { text: `✅ Sistema online!\n📍 Agente: ${settings.bot_name || agentName}\n🏢 Tenant: ${tenantId}` };
      }
    }

    const processedText = command.query || text;

    // Salva a mensagem do usuário
    await saveConversationMessage({
      whatsappId: threadId,
      userName,
      role: 'user',
      content: processedText,
      contentType: messageType,
      mediaUrl
    });

    // 1. Busca contexto
    const chunks = await searchKnowledge(processedText, 5, agentId, tenantId);
    const contextText = chunks.length > 0 
      ? chunks.map(c => `[${c.type} - ${c.title}]: ${c.content}`).join('\n\n')
      : null;

    // 2. Monta mensagens
    const systemPrompt = buildSystemPrompt(contextText, settings.bot_name || agentName, settings.system_prompt, isContinuation, timeSinceLast);
    
    // Mapeia histórico para o formato da OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...[...history].reverse().map(h => ({
        role: h.role,
        content: h.content
      })),
      { role: 'user', content: processedText }
    ];

    // 3. Chama OpenAI
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    });

    const answer = stripFormatting(response.choices[0].message.content);
    const tokensUsed = response.usage?.total_tokens || 0;

    // TTS Logic
    let responseAudioBuffer = null;
    let finalContentType = 'text';
    const responseMode = settings.response_mode || config.bot.responseMode || 'mirror';
    const ttsVoice = settings.tts_voice || config.openai.ttsVoice || 'nova';

    if (responseMode === 'audio' || (responseMode === 'mirror' && messageType === 'audio')) {
      const mp3Response = await openai.audio.speech.create({
        model: config.openai.ttsModel,
        voice: ttsVoice,
        input: answer,
      });
      
      const mp3Buffer = Buffer.from(await mp3Response.arrayBuffer());
      
      // Converte MP3 para OGG Opus (Nativo do WhatsApp)
      responseAudioBuffer = await convertMp3ToOgg(mp3Buffer);
      finalContentType = 'audio';
    }

    // Salva a resposta do assistente
    await saveConversationMessage({
      whatsappId: threadId,
      userName: settings.bot_name || agentName,
      role: 'assistant',
      content: answer,
      contentType: finalContentType,
      knowledgeUsed: chunks.map(c => ({ id: c.id, title: c.title })),
      tokensUsed
    });

    // DISPARA APRENDIZADO AUTOMÁTICO (a cada 5 mensagens do tenant)
    try {
      const { data: countRes } = await require('../db/supabase').getSupabase()
        .from('conversations')
        .select('id')
        .like('whatsapp_id', `${tenantId}__%`);
      
      const count = countRes?.length || 0;
      
      // Verifica se já existem aprendizados para este tenant
      const { data: existingLearnings } = await require('../db/supabase').getSupabase()
        .from('learnings')
        .select('id', { count: 'exact', head: true });
        // (Nota: o filtro de tenant no count global é simplificado aqui, mas serve para o trigger inicial)

      const shouldTrigger = (count > 0 && count % 5 === 0) || (count >= 3 && !existingLearnings?.length);

      if (shouldTrigger) {
        console.log(`   🧠 [${tenantId}] Gatilho de Aprendizado Ativado (Global Msg #${count})...`);
        const { data: recentMsgs } = await require('../db/supabase').getSupabase()
          .from('conversations')
          .select('role, content')
          .like('whatsapp_id', `${tenantId}__%`)
          .order('created_at', { ascending: false })
          .limit(20);
          
        if (recentMsgs && recentMsgs.length >= 5) {
          analyzeAndSaveLearnings(tenantId, recentMsgs.reverse());
        }
      }
    } catch (e) { console.error('Erro no gatilho de aprendizado:', e); }

    return {
      text: answer,
      audioBuffer: responseAudioBuffer,
      sources: chunks
    };

  } catch (err) {
    console.error('❌ Erro no processMessage:', err.message);
    throw err;
  }
}

/**
 * Analisa as conversas e salva novos aprendizados
 */
async function analyzeAndSaveLearnings(tenantId, recentMessages) {
  try {
    if (!recentMessages || recentMessages.length < 4) return;
    
    // Pega as últimas 10 mensagens
    const conversationText = recentMessages.slice(-10).map(h => `${h.role === 'user' ? 'Cliente' : 'IA'}: ${h.content}`).join('\n');
    
    const prompt = `Analise as conversas abaixo entre um cliente e uma IA de atendimento.
Identifique de 1 a 3 "Aprendizados" importantes sobre o cliente ou o negócio.
Exemplos: "O cliente prefere entregas após as 18h", "O endereço da loja mudou para Rua Azul 10", "Dúvida frequente sobre preço do frete".

REGRAS:
- Seja muito curto e direto.
- Não use tópicos numerados.
- Responda apenas os aprendizados, um por linha.

CONVERSA:
${conversationText}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200
    });

    const insights = response.choices[0].message.content.split('\n').filter(line => line.trim().length > 5);
    
    for (const insight of insights) {
      await addLearning({
        title: 'Novo Insight',
        content: insight.trim(),
        type: 'auto',
        metadata: { tenantId }
      });
    }
    console.log(`   ✅ [${tenantId}] ${insights.length} novos aprendizados salvos.`);

  } catch (err) {
    console.error('Erro ao analisar aprendizados:', err.message);
  }
}

/**
 * Transcreve áudio
 */
async function transcribeAudio(audioBuffer, mimetype = 'audio/ogg') {
  const extMap = { 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/wav': 'wav' };
  const ext = extMap[mimetype] || 'ogg';
  const tempPath = path.join(config.uploadsDir, `audio_${Date.now()}.${ext}`);
  
  if (!fs.existsSync(config.uploadsDir)) fs.mkdirSync(config.uploadsDir, { recursive: true });
  fs.writeFileSync(tempPath, audioBuffer);
  
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: config.openai.whisperModel,
      language: 'pt',
      response_format: 'text',
    });
    return typeof transcription === 'string' ? transcription : transcription.text;
  } finally {
    try { fs.unlinkSync(tempPath); } catch {}
  }
}

/**
 * Converte Buffer MP3 para OGG Opus usando FFmpeg
 */
async function convertMp3ToOgg(mp3Buffer) {
  const tempMp3 = path.join(config.uploadsDir, `temp_${Date.now()}.mp3`);
  const tempOgg = path.join(config.uploadsDir, `temp_${Date.now()}.ogg`);
  
  if (!fs.existsSync(config.uploadsDir)) fs.mkdirSync(config.uploadsDir, { recursive: true });
  fs.writeFileSync(tempMp3, mp3Buffer);

  return new Promise((resolve, reject) => {
    ffmpeg(tempMp3)
      .toFormat('ogg')
      .audioCodec('libopus')
      .audioChannels(1)
      .audioFrequency(16000)
      .on('error', (err) => {
        if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3);
        if (fs.existsSync(tempOgg)) fs.unlinkSync(tempOgg);
        reject(err);
      })
      .on('end', () => {
        const oggBuffer = fs.readFileSync(tempOgg);
        if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3);
        if (fs.existsSync(tempOgg)) fs.unlinkSync(tempOgg);
        resolve(oggBuffer);
      })
      .save(tempOgg);
  });
}

module.exports = { processMessage, analyzeAndSaveLearnings, transcribeAudio, convertMp3ToOgg };
