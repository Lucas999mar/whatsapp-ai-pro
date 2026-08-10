/**
 * ══════════════════════════════════════════════════════════════
 *  PLUGIN EXECUTOR - Executa ferramentas de plugins conectados
 *  
 *  Este módulo é responsável por executar as tools dos plugins
 *  conectados (Google, Notion, Trello, etc.) usando os tokens
 *  OAuth armazenados no banco.
 * ══════════════════════════════════════════════════════════════
 */

const { getAccessToken } = require('./manager');
const { findPluginByToolName } = require('./registry');

/**
 * Executa uma tool de plugin conectado
 * @param {string} toolName - Nome da tool (ex: 'gmail_read_emails')
 * @param {object} args - Argumentos da tool
 * @param {object} context - { tenantId, agentId }
 * @returns {Promise<string>} Resultado em texto
 */
async function executePluginTool(toolName, args, context = {}) {
    const pluginId = findPluginByToolName(toolName);
    if (!pluginId) {
        return `❌ Tool "${toolName}" não pertence a nenhum plugin registrado.`;
    }

    const tenantId = context.tenantId || context.tenant_id || 'default';
    const accessToken = await getAccessToken(tenantId, pluginId);

    if (!accessToken) {
        return `⚠️ Plugin "${pluginId}" não está conectado ou o token expirou. Peça ao usuário para reconectar em Conexões & Plugins.`;
    }

    try {
        switch (pluginId) {
            case 'google':
                return await executeGoogleTool(toolName, args, accessToken);
            case 'notion':
                return await executeNotionTool(toolName, args, accessToken);
            case 'github':
                return await executeGitHubTool(toolName, args, accessToken);
            case 'trello':
                return await executeTrelloTool(toolName, args, accessToken);
            case 'hubspot':
                return await executeHubSpotTool(toolName, args, accessToken);
            case 'slack':
                return await executeSlackTool(toolName, args, accessToken);
            case 'asana':
                return await executeAsanaTool(toolName, args, accessToken);
            case 'shopify':
                return await executeShopifyTool(toolName, args, accessToken, context);
            case 'webhook':
                return await executeWebhookTool(toolName, args, context);
            default:
                return `❌ Executor não implementado para plugin "${pluginId}".`;
        }
    } catch (err) {
        console.error(`❌ [PluginExecutor:${toolName}] Erro:`, err.message);
        return `Erro ao executar ${toolName}: ${err.message}`;
    }
}

// ══════════════════════════════════════════════════════════════
//  GOOGLE (Gmail + Calendar)
// ══════════════════════════════════════════════════════════════
async function executeGoogleTool(toolName, args, token) {
    const headers = { Authorization: `Bearer ${token}` };

    if (toolName === 'gmail_read_emails') {
        const maxResults = args.max_results || 5;
        const query = args.query || 'is:unread';
        const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers });
        const data = await res.json();
        if (!data.messages?.length) return 'Nenhum e-mail encontrado com os filtros especificados.';

        const emails = [];
        for (const msg of data.messages.slice(0, maxResults)) {
            const detail = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`, { headers });
            const d = await detail.json();
            const from = d.payload?.headers?.find(h => h.name === 'From')?.value || 'Desconhecido';
            const subject = d.payload?.headers?.find(h => h.name === 'Subject')?.value || '(Sem assunto)';
            emails.push(`📧 De: ${from}\n   Assunto: ${subject}`);
        }
        return `📬 ${emails.length} e-mail(s) encontrado(s):\n\n${emails.join('\n\n')}`;

    } else if (toolName === 'gmail_send_email') {
        const raw = Buffer.from(
            `To: ${args.to}\r\nSubject: ${args.subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${args.body}`
        ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw }),
        });
        const data = await res.json();
        return data.id ? `✅ E-mail enviado com sucesso para ${args.to}!` : `❌ Erro: ${JSON.stringify(data)}`;

    } else if (toolName === 'calendar_list_events') {
        const now = new Date();
        const daysAhead = args.days_ahead || 1;
        const maxResults = args.max_results || 10;
        const timeMin = now.toISOString();
        const timeMax = new Date(now.getTime() + daysAhead * 86400000).toISOString();

        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`;
        const res = await fetch(url, { headers });
        const data = await res.json();
        if (!data.items?.length) return 'Nenhum evento encontrado no período.';

        const events = data.items.map(ev => {
            const start = ev.start.dateTime ? new Date(ev.start.dateTime).toLocaleString('pt-BR') : ev.start.date;
            return `📅 ${ev.summary || '(Sem título)'} - ${start}`;
        });
        return `📅 ${events.length} evento(s):\n\n${events.join('\n')}`;

    } else if (toolName === 'calendar_create_event') {
        const startTime = new Date(args.date_time);
        const endTime = new Date(startTime.getTime() + (args.duration_minutes || 60) * 60000);

        const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                summary: args.summary,
                description: args.description || '',
                start: { dateTime: startTime.toISOString() },
                end: { dateTime: endTime.toISOString() },
            }),
        });
        const data = await res.json();
        return data.id ? `✅ Evento "${args.summary}" criado com sucesso!` : `❌ Erro: ${JSON.stringify(data)}`;
    }

    return `❌ Tool "${toolName}" não encontrada no Google.`;
}

// ══════════════════════════════════════════════════════════════
//  NOTION
// ══════════════════════════════════════════════════════════════
async function executeNotionTool(toolName, args, token) {
    const headers = {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
    };

    if (toolName === 'notion_search') {
        const res = await fetch('https://api.notion.com/v1/search', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                query: args.query,
                page_size: args.limit || 10,
            }),
        });
        const data = await res.json();
        if (!data.results?.length) return 'Nenhuma página encontrada no Notion.';

        const results = data.results.map(r => {
            const title = r.properties?.title?.title?.[0]?.text?.content || r.properties?.Name?.title?.[0]?.text?.content || '(Sem título)';
            return `📝 ${title} (${r.object}) - ${r.url || ''}`;
        });
        return `📝 ${results.length} resultado(s):\n\n${results.join('\n')}`;

    } else if (toolName === 'notion_create_page') {
        const body = {
            parent: args.parent_id
                ? { page_id: args.parent_id }
                : { page_id: args.parent_id || '' }, // Precisaria de um ID válido
            properties: {
                title: { title: [{ text: { content: args.title } }] }
            },
        };
        if (args.content) {
            body.children = [{
                object: 'block',
                type: 'paragraph',
                paragraph: { rich_text: [{ type: 'text', text: { content: args.content } }] }
            }];
        }

        const res = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        const data = await res.json();
        return data.id ? `✅ Página "${args.title}" criada no Notion!` : `❌ Erro: ${data.message || JSON.stringify(data)}`;
    }

    return `❌ Tool "${toolName}" não encontrada no Notion.`;
}

// ══════════════════════════════════════════════════════════════
//  GITHUB
// ══════════════════════════════════════════════════════════════
async function executeGitHubTool(toolName, args, token) {
    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'WhatsAppAIPro'
    };

    if (toolName === 'github_list_repos') {
        const res = await fetch(`https://api.github.com/user/repos?sort=updated&per_page=${args.limit || 10}`, { headers });
        const data = await res.json();
        const repos = data.map(r => `📂 ${r.full_name} ⭐${r.stargazers_count} - ${r.description || 'Sem descrição'}`);
        return repos.length ? `📂 ${repos.length} repositório(s):\n\n${repos.join('\n')}` : 'Nenhum repositório encontrado.';

    } else if (toolName === 'github_list_issues') {
        const state = args.state || 'open';
        const res = await fetch(`https://api.github.com/repos/${args.repo}/issues?state=${state}&per_page=20`, { headers });
        const data = await res.json();
        const issues = data.filter(i => !i.pull_request).map(i => `🐛 #${i.number} ${i.title} [${i.state}]`);
        return issues.length ? `🐛 ${issues.length} issue(s):\n\n${issues.join('\n')}` : 'Nenhuma issue encontrada.';

    } else if (toolName === 'github_create_issue') {
        const res = await fetch(`https://api.github.com/repos/${args.repo}/issues`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: args.title, body: args.body || '' }),
        });
        const data = await res.json();
        return data.id ? `✅ Issue #${data.number} "${args.title}" criada!` : `❌ Erro: ${JSON.stringify(data)}`;
    }

    return `❌ Tool "${toolName}" não encontrada no GitHub.`;
}

// ══════════════════════════════════════════════════════════════
//  TRELLO
// ══════════════════════════════════════════════════════════════
async function executeTrelloTool(toolName, args, token) {
    const key = process.env.TRELLO_API_KEY || '';
    const base = 'https://api.trello.com/1';

    if (toolName === 'trello_list_boards') {
        const res = await fetch(`${base}/members/me/boards?key=${key}&token=${token}&fields=name,url`);
        const data = await res.json();
        const boards = data.map(b => `📋 ${b.name} — ${b.url}`);
        return boards.length ? `📋 ${boards.length} board(s):\n\n${boards.join('\n')}` : 'Nenhum board encontrado.';

    } else if (toolName === 'trello_list_cards') {
        const res = await fetch(`${base}/boards/${args.board_id}/cards?key=${key}&token=${token}&fields=name,shortUrl,idList`);
        const data = await res.json();
        const cards = data.map(c => `🃏 ${c.name} — ${c.shortUrl}`);
        return cards.length ? `🃏 ${cards.length} card(s):\n\n${cards.join('\n')}` : 'Nenhum card encontrado.';

    } else if (toolName === 'trello_create_card') {
        // First find the list ID
        const listsRes = await fetch(`${base}/boards/${args.board_id}/lists?key=${key}&token=${token}&fields=name`);
        const lists = await listsRes.json();
        const targetList = lists.find(l => l.name.toLowerCase() === args.list_name.toLowerCase());
        if (!targetList) return `❌ Lista "${args.list_name}" não encontrada no board.`;

        const res = await fetch(`${base}/cards?key=${key}&token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: args.title, desc: args.description || '', idList: targetList.id }),
        });
        const data = await res.json();
        return data.id ? `✅ Card "${args.title}" criado na lista "${args.list_name}"!` : `❌ Erro ao criar card.`;
    }

    return `❌ Tool "${toolName}" não encontrada no Trello.`;
}

// ══════════════════════════════════════════════════════════════
//  HUBSPOT
// ══════════════════════════════════════════════════════════════
async function executeHubSpotTool(toolName, args, token) {
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    if (toolName === 'hubspot_list_contacts') {
        const limit = args.limit || 10;
        const res = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts?limit=${limit}`, { headers });
        const data = await res.json();
        const contacts = (data.results || []).map(c => {
            const p = c.properties;
            return `👤 ${p.firstname || ''} ${p.lastname || ''} — ${p.email || 'Sem e-mail'}`;
        });
        return contacts.length ? `👥 ${contacts.length} contato(s):\n\n${contacts.join('\n')}` : 'Nenhum contato encontrado.';

    } else if (toolName === 'hubspot_create_contact') {
        const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                properties: {
                    email: args.email,
                    firstname: args.firstname || '',
                    lastname: args.lastname || '',
                    phone: args.phone || '',
                }
            }),
        });
        const data = await res.json();
        return data.id ? `✅ Contato "${args.email}" criado no HubSpot!` : `❌ Erro: ${JSON.stringify(data)}`;

    } else if (toolName === 'hubspot_list_deals') {
        const res = await fetch(`https://api.hubapi.com/crm/v3/objects/deals?limit=${args.limit || 10}`, { headers });
        const data = await res.json();
        const deals = (data.results || []).map(d => `💰 ${d.properties.dealname || '(Sem nome)'} — ${d.properties.amount || '0'}`);
        return deals.length ? `💰 ${deals.length} deal(s):\n\n${deals.join('\n')}` : 'Nenhum deal encontrado.';
    }

    return `❌ Tool "${toolName}" não encontrada no HubSpot.`;
}

// ══════════════════════════════════════════════════════════════
//  SLACK
// ══════════════════════════════════════════════════════════════
async function executeSlackTool(toolName, args, token) {
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    if (toolName === 'slack_send_message') {
        const res = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers,
            body: JSON.stringify({ channel: args.channel, text: args.text }),
        });
        const data = await res.json();
        return data.ok ? `✅ Mensagem enviada para #${args.channel}!` : `❌ Erro: ${data.error}`;

    } else if (toolName === 'slack_list_channels') {
        const res = await fetch('https://slack.com/api/conversations.list?types=public_channel', { headers });
        const data = await res.json();
        const channels = (data.channels || []).map(c => `#${c.name} (${c.num_members || 0} membros)`);
        return channels.length ? `💬 ${channels.length} canal(is):\n\n${channels.join('\n')}` : 'Nenhum canal encontrado.';
    }

    return `❌ Tool "${toolName}" não encontrada no Slack.`;
}

// ══════════════════════════════════════════════════════════════
//  ASANA
// ══════════════════════════════════════════════════════════════
async function executeAsanaTool(toolName, args, token) {
    const headers = { Authorization: `Bearer ${token}` };

    if (toolName === 'asana_list_tasks') {
        const url = args.project_id
            ? `https://app.asana.com/api/1.0/projects/${args.project_id}/tasks?opt_fields=name,completed,due_on&limit=${args.limit || 20}`
            : `https://app.asana.com/api/1.0/user_task_lists/me/tasks?opt_fields=name,completed,due_on&limit=${args.limit || 20}`;
        const res = await fetch(url, { headers });
        const data = await res.json();
        const tasks = (data.data || []).map(t => `${t.completed ? '✅' : '⬜'} ${t.name}${t.due_on ? ` (até ${t.due_on})` : ''}`);
        return tasks.length ? `✅ ${tasks.length} tarefa(s):\n\n${tasks.join('\n')}` : 'Nenhuma tarefa encontrada.';

    } else if (toolName === 'asana_create_task') {
        const res = await fetch('https://app.asana.com/api/1.0/tasks', {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: {
                    name: args.name,
                    notes: args.notes || '',
                    due_on: args.due_on || null,
                    projects: args.project_id ? [args.project_id] : [],
                }
            }),
        });
        const data = await res.json();
        return data.data?.gid ? `✅ Tarefa "${args.name}" criada no Asana!` : `❌ Erro: ${JSON.stringify(data)}`;
    }

    return `❌ Tool "${toolName}" não encontrada no Asana.`;
}

// ══════════════════════════════════════════════════════════════
//  SHOPIFY
// ══════════════════════════════════════════════════════════════
async function executeShopifyTool(toolName, args, token, context) {
    // O shop domain precisa estar no config do plugin
    const { getSupabase: getSb } = require('../db/supabase');
    const supabase = getSb();
    const tenantId = context.tenantId || 'default';
    const { data: pluginData } = await supabase
        .from('tenant_plugins')
        .select('config')
        .eq('tenant_id', tenantId)
        .eq('plugin_id', 'shopify')
        .single();

    const shopDomain = pluginData?.config?.shop_domain;
    if (!shopDomain) return '❌ Domínio da loja Shopify não configurado.';

    const headers = { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' };
    const base = `https://${shopDomain}/admin/api/2024-01`;

    if (toolName === 'shopify_list_products') {
        const res = await fetch(`${base}/products.json?limit=${args.limit || 10}`, { headers });
        const data = await res.json();
        const products = (data.products || []).map(p => `🛍️ ${p.title} — R$${p.variants?.[0]?.price || '0'}`);
        return products.length ? `🛒 ${products.length} produto(s):\n\n${products.join('\n')}` : 'Nenhum produto encontrado.';

    } else if (toolName === 'shopify_list_orders') {
        const status = args.status || 'any';
        const res = await fetch(`${base}/orders.json?status=${status}&limit=${args.limit || 10}`, { headers });
        const data = await res.json();
        const orders = (data.orders || []).map(o => `📦 #${o.order_number} — ${o.financial_status} — R$${o.total_price}`);
        return orders.length ? `📦 ${orders.length} pedido(s):\n\n${orders.join('\n')}` : 'Nenhum pedido encontrado.';
    }

    return `❌ Tool "${toolName}" não encontrada no Shopify.`;
}

// ══════════════════════════════════════════════════════════════
//  WEBHOOK / CUSTOM API
// ══════════════════════════════════════════════════════════════
async function executeWebhookTool(toolName, args, context) {
    const { getSupabase: getSb } = require('../db/supabase');
    const supabase = getSb();
    const tenantId = context.tenantId || 'default';
    const { data: pluginData } = await supabase
        .from('tenant_plugins')
        .select('config, access_token')
        .eq('tenant_id', tenantId)
        .eq('plugin_id', 'webhook')
        .single();

    if (!pluginData?.config?.base_url) return '❌ URL base do webhook não configurada.';

    const baseUrl = pluginData.config.base_url.replace(/\/$/, '');
    const apiKey = pluginData.access_token || pluginData.config.api_key;
    const headerName = pluginData.config.header_name || 'Authorization';
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers[headerName] = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;

    if (toolName === 'webhook_get') {
        const url = `${baseUrl}${args.endpoint}${args.query_params || ''}`;
        const res = await fetch(url, { headers });
        const data = await res.json();
        return `📡 Resposta (${res.status}):\n\n${JSON.stringify(data, null, 2).substring(0, 2000)}`;

    } else if (toolName === 'webhook_post') {
        const url = `${baseUrl}${args.endpoint}`;
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: args.body || '{}',
        });
        const data = await res.json();
        return `📡 Resposta POST (${res.status}):\n\n${JSON.stringify(data, null, 2).substring(0, 2000)}`;
    }

    return `❌ Tool "${toolName}" não encontrada no Webhook.`;
}

module.exports = { executePluginTool };
