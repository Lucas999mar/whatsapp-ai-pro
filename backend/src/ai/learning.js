const { getSupabase } = require('../db/supabase');
const { generateEmbedding } = require('../db/repository');
const OpenAI = require('openai');
const config = require('../config/config');

const openai = new OpenAI({ apiKey: config.openai.apiKey });

/**
 * Extrai aprendizados de um lote de conversas
 */
async function extractLearnings() {
  const supabase = getSupabase();
  console.log('🧠 Executando Learning Engine...');

  try {
    // 1. Busca as últimas conversas não processadas (simplificado para pegar as últimas N)
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('user_name, role, content, created_at')
      .order('created_at', { ascending: false })
      .limit(config.learning.batchSize);

    if (error) throw error;
    if (!conversations || conversations.length < 5) {
      console.log('   ℹ️ Poucas conversas para analisar no momento.');
      return;
    }

    // Ordena cronologicamente para o prompt
    const chronoConvs = conversations.reverse();
    const transcript = chronoConvs.map(c => `${c.role === 'user' ? 'Usuário' : 'Assistente'}: ${c.content}`).join('\n');

    // 2. Pede para a OpenAI extrair conhecimentos
    const systemPrompt = `Você é um analista de dados e engenheiro de conhecimento.
Analise o seguinte trecho de conversas do WhatsApp entre usuários e um assistente.
Identifique fatos novos, preferências de usuários, correções feitas pelo usuário, ou informações relevantes que o assistente deveria "aprender" para o futuro.
Retorne uma lista JSON com os aprendizados extraídos. Se não houver nada relevante, retorne um array vazio [].
Formato esperado: [ "Aprendizado 1", "Aprendizado 2" ]`;

    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `CONVERSAS:\n${transcript}` }
      ],
      response_format: { type: "json_object" },
      // Forçando output como { learnings: [...] }
      functions: [{
        name: "save_learnings",
        parameters: {
          type: "object",
          properties: {
            learnings: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["learnings"]
        }
      }],
      function_call: { name: "save_learnings" }
    });

    const funcCall = response.choices[0].message.function_call;
    if (!funcCall) return;

    const args = JSON.parse(funcCall.arguments);
    const learnings = args.learnings || [];

    if (learnings.length === 0) {
      console.log('   ℹ️ Nenhum novo aprendizado extraído neste lote.');
      return;
    }

    console.log(`   💡 Extraídos ${learnings.length} novos aprendizados.`);

    // 3. Salva os aprendizados como knowledge_items e na tabela learnings
    for (const learning of learnings) {
      const embedding = await generateEmbedding(learning);
      
      // Salva na tabela dedicada
      await supabase.from('learnings').insert({
        content: learning,
        embedding
      });

      // Salva na base de conhecimento geral
      await supabase.from('knowledge_items').insert({
        title: 'Auto-Aprendizado: Conversas',
        type: 'learning',
        content: learning,
        embedding
      });
    }

    console.log('   ✅ Aprendizados adicionados à base de conhecimento!');

  } catch (err) {
    console.error('❌ Erro no Learning Engine:', err.message);
  }
}

// Inicia um job agendado simples (ex: roda a cada hora)
function startLearningEngine() {
  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(extractLearnings, ONE_HOUR);
  console.log('⚙️ Learning Engine iniciado (roda a cada 1 hora).');
}

module.exports = { extractLearnings, startLearningEngine };
