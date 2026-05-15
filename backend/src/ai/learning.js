const { getSupabase } = require('../db/supabase');
const { generateEmbedding } = require('../db/repository');
const OpenAI = require('openai');
const config = require('../config/config');

const openai = new OpenAI({ apiKey: config.openai.apiKey });

/**
 * Extrai aprendizados de um lote de conversas
 */
/**
 * Extrai aprendizados de forma isolada para cada empresa (Tenant)
 */
async function extractLearnings() {
  const supabase = getSupabase();
  const { listTenants, addLearning } = require('../db/repository');
  
  console.log('🧠 [Learning Engine] Iniciando ciclo de processamento...');

  try {
    const tenants = await listTenants();
    
    for (const tenant of tenants) {
      if (tenant.id === 'admin') continue;

      console.log(`   🔎 Analisando conversas da empresa: ${tenant.name} (${tenant.id})`);

      // Busca as últimas conversas daquela empresa específica
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('user_name, role, content, created_at')
        .like('whatsapp_id', `${tenant.id}__%`)
        .order('created_at', { ascending: false })
        .limit(config.learning.batchSize || 20);

      if (error) {
        console.error(`   ❌ Erro ao buscar conversas para ${tenant.id}:`, error.message);
        continue;
      }

      if (!conversations || conversations.length < 3) {
        console.log(`   ℹ️ Poucas conversas novas para ${tenant.name}.`);
        continue;
      }

      const transcript = conversations.reverse().map(c => `${c.role === 'user' ? 'Usuário' : 'Assistente'}: ${c.content}`).join('\n');

      const systemPrompt = `Você é um analista de dados. Analise estas conversas do WhatsApp da empresa "${tenant.name}".
Extraia apenas fatos REAIS e ÚTEIS (ex: preferências de clientes, novos problemas relatados, horários citados).
Retorne um JSON com a chave "learnings" contendo um array de strings. Se não houver nada novo, retorne {"learnings": []}.`;

      const response = await openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `CONVERSAS:\n${transcript}` }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      const learnings = result.learnings || [];

      if (learnings.length > 0) {
        console.log(`   💡 ${tenant.name}: Extraídos ${learnings.length} insights.`);
        for (const content of learnings) {
          await addLearning({
            title: `Insight Automático: ${tenant.name}`,
            content,
            type: 'batch',
            metadata: { tenantId: tenant.id, source: 'learning_engine' }
          });
        }
      }
    }
  } catch (err) {
    console.error('❌ Erro crítico no Learning Engine:', err.message);
  }
}

function startLearningEngine() {
  const TEN_MINUTES = 10 * 60 * 1000;
  // Executa uma vez na partida
  setTimeout(extractLearnings, 5000);
  // Agenda execuções periódicas
  setInterval(extractLearnings, TEN_MINUTES);
  console.log('⚙️ Learning Engine iniciado (Multi-Tenant | Ciclo de 10 min).');
}

module.exports = { extractLearnings, startLearningEngine };
