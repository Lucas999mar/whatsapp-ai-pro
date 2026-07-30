/**
 * ══════════════════════════════════════════════════════════════
 *  WHATSAPP TOOL - Envio de mensagens via bot conectado
 *  Reutiliza o sendDirectMessage já existente em bot.js
 * ══════════════════════════════════════════════════════════════
 */

/**
 * Envia uma mensagem via WhatsApp
 */
async function sendMessage(args, context) {
    const { phone_number, message } = args;

    if (!phone_number || !message) {
        throw new Error('Número de telefone e mensagem são obrigatórios.');
    }

    if (!context.agentId) {
        throw new Error('Nenhum agente WhatsApp configurado para esta tarefa.');
    }

    // Importa sob demanda para evitar dependência circular
    const { sendDirectMessage } = require('../../whatsapp/bot');

    await sendDirectMessage(context.agentId, phone_number, message);

    return `✅ Mensagem enviada com sucesso para ${phone_number} via WhatsApp.`;
}

module.exports = { sendMessage };
