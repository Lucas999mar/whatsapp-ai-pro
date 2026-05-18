const { google } = require('googleapis');
const config = require('../config/config');

/**
 * Cria o cliente OAuth2 baseado no JSON fornecido pelo usuário
 */
function getOAuth2Client(credentialsJsonStr) {
  try {
    const credentials = JSON.parse(credentialsJsonStr);
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    
    // Pega o primeiro endereço de redirecionamento autorizado no JSON do Google
    const redirectUri = redirect_uris[0];
    
    return new google.auth.OAuth2(
      client_id,
      client_secret,
      redirectUri
    );
  } catch (error) {
    throw new Error('JSON de credenciais do Google é inválido. ' + error.message);
  }
}

/**
 * Gera a URL para o dono da empresa autorizar o bot a mexer na agenda
 */
function getGoogleAuthUrl(credentialsJsonStr, agentId) {
  const oAuth2Client = getOAuth2Client(credentialsJsonStr);
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline', // Necessário para pegar o Refresh Token (persistente)
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: agentId // Passamos o agentId no state para saber quem autorizou no callback
  });
  return authUrl;
}

/**
 * Troca o código recebido do Google por Tokens definitivos
 */
async function exchangeCodeForTokens(credentialsJsonStr, code) {
  const oAuth2Client = getOAuth2Client(credentialsJsonStr);
  const { tokens } = await oAuth2Client.getToken(code);
  return tokens;
}

/**
 * Cria o evento oficial na agenda usando a biblioteca Google APIs
 */
async function createGoogleEvent(credentialsJsonStr, tokens, summary, dateTimeStr) {
  try {
    const oAuth2Client = getOAuth2Client(credentialsJsonStr);
    oAuth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    // Extrai e converte a data fornecida pela IA para o formato ISO do Google
    // A IA é instruída a mandar datas legíveis e estruturadas.
    // Vamos fazer um pequeno ajuste de Parsing. A IA deve enviar no formato: YYYY-MM-DDTHH:mm:ss
    // Se a IA mandar texto, o ideal é o próprio prompt forçar o formato.
    
    const eventStartTime = new Date(dateTimeStr);
    const eventEndTime = new Date(eventStartTime.getTime() + 60 * 60 * 1000); // Adiciona 1 hora padrão
    
    const event = {
      summary: summary,
      description: 'Gerado automaticamente por WhatsApp AI Pro',
      start: {
        dateTime: eventStartTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: eventEndTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    return response.data.htmlLink;
  } catch (err) {
    console.error('❌ Erro ao criar evento no Google Calendar:', err);
    throw err;
  }
}

module.exports = {
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  createGoogleEvent
};
