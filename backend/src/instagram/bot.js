const express = require('express');
const { processMessage } = require('../ai/pipeline');

const router = express.Router();
const VERIFY_TOKEN = 'evoluir_mais_instagram_token_seguro'; // Isso será configurado pelo tenant futuramente

/**
 * Rota GET para o Meta/Facebook verificar o Webhook
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook do Instagram Verificado!');
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }
});

/**
 * Rota POST para receber as DMs e Comentários do Instagram em tempo real
 */
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    if (body.object === 'instagram') {
      for (const entry of body.entry) {
        // Para cada mensagem que chega
        for (const messaging of entry.messaging || []) {
          const senderId = messaging.sender.id; // ID do usuário do Insta
          const recipientId = messaging.recipient.id; // ID da sua página

          // Ignora mensagens enviadas pela própria página
          if (senderId === recipientId) continue;

          // Processa mensagem de Texto
          if (messaging.message && messaging.message.text) {
            const textToProcess = messaging.message.text;

            // Envia para o Cérebro Central
            // NOTA: Como o webhook recebe mensagens de várias páginas, precisaremos de um mapa de RecipientID -> AgentID
            // Por enquanto usamos 'default' como placeholder
            
            const result = await processMessage(
              `IG_${senderId}`, // Isola o chat para o Insta
              'Usuário Instagram', 
              textToProcess, 
              'text', 
              null, 
              'Assistente', 
              'default', // Agent ID
              'default', // Tenant ID
              null
            );

            // Responde via Meta Graph API (Requer Token de Página)
            console.log(`💬 Resposta Gerada para Instagram [${senderId}]:`, result.text);
            
            // fetch(\`https://graph.facebook.com/v19.0/\${recipientId}/messages?access_token=\${PAGE_ACCESS_TOKEN}\`, { ... })
          }
        }
      }
      return res.status(200).send('EVENT_RECEIVED');
    }
    
    return res.sendStatus(404);
  } catch (err) {
    console.error('❌ Erro no Webhook Instagram:', err);
    res.sendStatus(500);
  }
});

module.exports = router;
