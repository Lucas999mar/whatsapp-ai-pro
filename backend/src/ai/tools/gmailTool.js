/**
 * ══════════════════════════════════════════════════════════════
 *  GMAIL TOOL - Leitura e envio de e-mails via Google Gmail API
 * ══════════════════════════════════════════════════════════════
 */

const { google } = require('googleapis');

/**
 * Constrói o cliente OAuth2 autenticado para Gmail
 */
function getGmailClient(context) {
    if (!context.googleCredentials || !context.googleTokens) {
        throw new Error('Credenciais do Google não configuradas para este agente. Configure nas Configurações do Agente.');
    }

    let credentials;
    try {
        credentials = typeof context.googleCredentials === 'string'
            ? JSON.parse(context.googleCredentials)
            : context.googleCredentials;
    } catch {
        throw new Error('Formato de credenciais do Google inválido.');
    }

    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(context.googleTokens);

    return google.gmail({ version: 'v1', auth: oAuth2Client });
}

/**
 * Lê e-mails da caixa de entrada
 */
async function readEmails(args, context) {
    const gmail = getGmailClient(context);
    const maxResults = args.max_results || 5;
    const query = args.query || 'is:unread';

    const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
    });

    const messages = response.data.messages || [];

    if (messages.length === 0) {
        return 'Nenhum e-mail encontrado com os critérios especificados.';
    }

    const results = [];

    for (const msg of messages.slice(0, maxResults)) {
        const detail = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date'],
        });

        const headers = detail.data.payload.headers;
        const from = headers.find(h => h.name === 'From')?.value || 'Desconhecido';
        const subject = headers.find(h => h.name === 'Subject')?.value || '(sem assunto)';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        const snippet = detail.data.snippet || '';

        results.push(`📧 De: ${from}\n   Assunto: ${subject}\n   Data: ${date}\n   Prévia: ${snippet.substring(0, 150)}...`);
    }

    return `Encontrados ${results.length} e-mail(s):\n\n${results.join('\n\n')}`;
}

/**
 * Envia um e-mail
 */
async function sendEmail(args, context) {
    const gmail = getGmailClient(context);
    const { to, subject, body } = args;

    if (!to || !subject || !body) {
        throw new Error('Campos "to", "subject" e "body" são obrigatórios.');
    }

    // Monta o e-mail no formato RFC 2822
    const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',
        '',
        body,
    ].join('\r\n');

    // Codifica em base64url
    const encodedEmail = Buffer.from(email).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw: encodedEmail,
        },
    });

    return `✅ E-mail enviado com sucesso para ${to} com assunto "${subject}".`;
}

module.exports = { readEmails, sendEmail };
