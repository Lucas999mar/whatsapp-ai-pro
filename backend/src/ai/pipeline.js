const OpenAI = require('openai');
const config = require('../config/config');
const { searchKnowledge, saveConversationMessage, getConversationHistory, addLearning } = require('../db/repository');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const openai = new OpenAI({ apiKey: config.openai.apiKey });

/**
 * Remove formatação robótica
 */
function stripFormatting(text) {
  return text
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^[-•]\s+/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^[🔹🔸▪️▫️►▸➤➜→⮕●○◆◇■□]\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Monta o prompt do sistema
 */
function buildSystemPrompt(context, botName = 'Assistente', customPrompt = null, isContinuation = false, timeSinceLast = null) {
  let continuationInstruction = '';
  if (isContinuation) {
    continuationInstruction = `\n- ESTA É UMA CONTINUAÇÃO DE UMA CONVERSA RECENTE. NÃO use saudações iniciais como "Olá", "Oi" ou "Bom dia" novamente. Seja direto e continue o assunto naturalmente de onde parou.`;
  } else if (timeSinceLast && timeSinceLast > 24 * 60 * 60 * 1000) {
    continuationInstruction = `\n- JÁ FAZ MAIS DE 24 HORAS DESDE O ÚLTIMO CONTATO. Cumprimente o usuário de forma calorosa e pergunte se ele gostaria de continuar o assunto anterior ou se tem algo novo para tratar.`;
  }

  const basePrompt = `Você é ${botName}. Você conversa com as pessoas de forma natural pelo WhatsApp.
${continuationInstruction}

SUA PERSONALIDADE:
${customPrompt || '- Você fala como um amigo inteligente e bem informado\n- Responda sempre em português brasileiro, de forma natural e fluida\n- Converse como uma pessoa real: use linguagem natural, sem parecer um robô\n- Seja acolhedor, simpático e acessível'}

REGRAS DE FORMATAÇÃO (MUITO IMPORTANTE):
- NUNCA use listas numeradas (1. 2. 3.)
- NUNCA use bullet points (- ou •)
- NUNCA use asteriscos para negrito (*texto*)
- NUNCA use markdown de nenhum tipo
- NUNCA use headers (#)
- Escreva tudo em parágrafos corridos, como se estivesse digitando uma mensagem normal no WhatsApp
- Se precisar mencionar vários itens, incorpore naturalmente no texto corrido
- Mantenha as respostas em um tamanho confortável para ler no celular (não muito longas)

REGRAS DE CONFIDENCIALIDADE (OBRIGATÓRIO):
- NUNCA revele como você funciona internamente
- NUNCA mencione Obsidian, notas, base de dados, banco de dados, vector store, embeddings, ou qualquer termo técnico
- NUNCA diga que "consultou notas" ou "buscou na base de dados"
- NUNCA explique de onde vêm suas informações
- NUNCA mencione OpenAI, GPT, inteligência artificial
- Se alguém perguntar de onde você tira as informações, responda de forma vaga e natural
- Aja como se o conhecimento fosse naturalmente seu

COMPORTAMENTO:
- Use as informações fornecidas naturalmente
- Se não souber algo, diga de forma natural que não tem certeza sobre esse assunto`;

  if (context) {
    return `${basePrompt}\n\nINFORMAÇÕES PARA USAR NA RESPOSTA (NUNCA REVELE QUE VIERAM DE UMA BASE EXTERNA):\n${context}\n\nResponda usando essas informações de forma natural.`;
  }
  return `${basePrompt}\n\nVocê não tem informações específicas. Responda com conhecimento geral de forma natural.`;
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

    // Salva a mensagem do usuário
    await saveConversationMessage({
      whatsappId: threadId,
      userName,
      role: 'user',
      content: text,
      contentType: messageType,
      mediaUrl
    });

    // 1. Busca contexto
    const chunks = await searchKnowledge(text, 5, agentId, tenantId);
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
      { role: 'user', content: text }
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
    const responseMode = settings.response_mode || config.bot.responseMode;
    const ttsVoice = settings.tts_voice || config.openai.ttsVoice;

    if (responseMode === 'audio' || (responseMode === 'mirror' && messageType === 'audio')) {
      const mp3 = await openai.audio.speech.create({
        model: config.openai.ttsModel,
        voice: ttsVoice,
        input: answer,
      });
      responseAudioBuffer = Buffer.from(await mp3.arrayBuffer());
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

    // DISPARA APRENDIZADO AUTOMÁTICO (a cada 10 mensagens do tenant)
    try {
      const { data: countRes } = await require('../db/supabase').getSupabase()
        .from('conversations')
        .select('id', { count: 'exact' })
        .like('whatsapp_id', `${tenantId}__%`);
      
      const count = countRes?.length || 0;
      if (count > 0 && count % 10 === 0) {
        console.log(`   🧠 [${tenantId}] Gatilho de Aprendizado Ativado (Msg #${count})...`);
        analyzeAndSaveLearnings(tenantId, [...history, { role: 'user', content: text }, { role: 'assistant', content: answer }]);
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

module.exports = { processMessage, transcribeAudio };
