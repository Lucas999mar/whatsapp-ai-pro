const { listFollowUps, updateFollowUpStatus } = require('../db/repository');
const { sendDirectMessage } = require('./bot');
const { getSupabase } = require('../db/supabase');

/**
 * Verifica e envia follow-ups pendentes
 */
async function processFollowUps() {
  try {
    const supabase = getSupabase();
    const now = new Date().toISOString();

    // Busca follow-ups pendentes que já passaram do horário
    const { data: pendings, error } = await supabase
      .from('follow_ups')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now);

    if (error) throw error;
    if (!pendings || pendings.length === 0) return;

    console.log(`⏰ [Scheduler] Processando ${pendings.length} follow-ups agendados...`);

    for (const followUp of pendings) {
      try {
        console.log(`📤 Enviando follow-up ${followUp.id} para ${followUp.contact_number}...`);
        
        await sendDirectMessage(
          followUp.agent_id, 
          followUp.contact_number, 
          followUp.message
        );

        await updateFollowUpStatus(followUp.id, 'sent');
        console.log(`✅ Follow-up ${followUp.id} enviado com sucesso.`);
      } catch (err) {
        console.error(`❌ Falha ao enviar follow-up ${followUp.id}:`, err.message);
        await updateFollowUpStatus(followUp.id, 'failed', err.message);
      }
    }
  } catch (err) {
    console.error('❌ Erro no processFollowUps:', err.message);
  }
}

/**
 * Inicia o loop do scheduler
 */
function startScheduler(intervalMs = 60000) { // Default 1 minuto
  console.log(`🚀 Scheduler de Follow-up iniciado (intervalo: ${intervalMs/1000}s)`);
  
  // Executa imediatamente e depois em intervalo
  processFollowUps();
  
  setInterval(() => {
    processFollowUps();
  }, intervalMs);
}

module.exports = { startScheduler, processFollowUps };
