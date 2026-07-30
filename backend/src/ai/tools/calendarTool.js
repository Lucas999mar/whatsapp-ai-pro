/**
 * ══════════════════════════════════════════════════════════════
 *  GOOGLE CALENDAR TOOL - Listar e criar eventos
 *  Reutiliza as credenciais OAuth2 do Google já configuradas.
 * ══════════════════════════════════════════════════════════════
 */

const { google } = require('googleapis');

/**
 * Constrói o cliente OAuth2 autenticado para Calendar
 */
function getCalendarClient(context) {
    if (!context.googleCredentials || !context.googleTokens) {
        throw new Error('Credenciais do Google Calendar não configuradas para este agente.');
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

    return google.calendar({ version: 'v3', auth: oAuth2Client });
}

/**
 * Lista eventos do calendário
 */
async function listEvents(args, context) {
    const calendar = getCalendarClient(context);
    const daysAhead = args.days_ahead || 1;
    const maxResults = args.max_results || 10;

    const now = new Date();
    const future = new Date(now);
    future.setDate(future.getDate() + daysAhead);

    const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: future.toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
    });

    const events = response.data.items || [];

    if (events.length === 0) {
        return `Nenhum compromisso encontrado nos próximos ${daysAhead} dia(s).`;
    }

    const results = events.map((event, i) => {
        const start = event.start.dateTime || event.start.date;
        const end = event.end.dateTime || event.end.date;
        const startDate = new Date(start);
        const hora = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const data = startDate.toLocaleDateString('pt-BR');
        return `${i + 1}. 📅 ${event.summary || '(sem título)'}\n   Data: ${data} às ${hora}\n   ${event.description ? `Notas: ${event.description.substring(0, 100)}` : ''}`;
    });

    return `Encontrados ${events.length} compromisso(s) nos próximos ${daysAhead} dia(s):\n\n${results.join('\n\n')}`;
}

/**
 * Cria um novo evento no calendário
 */
async function createEvent(args, context) {
    const calendar = getCalendarClient(context);
    const { summary, date_time, duration_minutes = 60, description = '' } = args;

    if (!summary || !date_time) {
        throw new Error('É necessário informar o título (summary) e a data/hora (date_time) do evento.');
    }

    const startTime = new Date(date_time);
    const endTime = new Date(startTime.getTime() + duration_minutes * 60 * 1000);

    const event = {
        summary,
        description: description || 'Criado pelo Agente Autônomo - WhatsApp AI Pro',
        start: {
            dateTime: startTime.toISOString(),
            timeZone: 'America/Sao_Paulo',
        },
        end: {
            dateTime: endTime.toISOString(),
            timeZone: 'America/Sao_Paulo',
        },
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'popup', minutes: 15 },
            ],
        },
    };

    const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
    });

    const data = new Date(date_time).toLocaleDateString('pt-BR');
    const hora = new Date(date_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return `✅ Evento "${summary}" criado com sucesso para ${data} às ${hora} (${duration_minutes}min).\nLink: ${response.data.htmlLink}`;
}

module.exports = { listEvents, createEvent };
