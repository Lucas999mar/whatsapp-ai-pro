/**
 * ══════════════════════════════════════════════════════════════
 *  PLUGIN REGISTRY - Catálogo Central de Plugins
 *  
 *  Define todos os plugins disponíveis no marketplace com:
 *  - Configuração OAuth (client_id, scopes, URLs)
 *  - Ferramentas (tools) que cada plugin expõe para a IA
 *  - Metadados visuais (ícone, cor, descrição)
 * ══════════════════════════════════════════════════════════════
 */

const PLUGINS = {
    // ══════════════════════════════════════════════════════════
    //  GOOGLE (Gmail + Calendar + Drive)
    // ══════════════════════════════════════════════════════════
    google: {
        id: 'google',
        name: 'Google',
        description: 'Conecte Gmail, Google Calendar e Google Drive. Leia e envie e-mails, gerencie compromissos e arquivos.',
        icon: '🔵',
        color: '#4285F4',
        category: 'productivity',
        authType: 'oauth2',
        oauth: {
            authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
            scopes: [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.send',
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events',
            ],
            accessType: 'offline',
            prompt: 'consent',
        },
        tools: [
            {
                name: 'gmail_read_emails',
                description: 'Lê os últimos e-mails não lidos da caixa de entrada do Gmail.',
                parameters: {
                    type: 'object',
                    properties: {
                        max_results: { type: 'number', description: 'Quantidade máxima de e-mails (padrão: 5)' },
                        query: { type: 'string', description: 'Filtro de busca do Gmail (ex: "from:joao@email.com")' }
                    },
                    required: []
                }
            },
            {
                name: 'gmail_send_email',
                description: 'Envia um e-mail pelo Gmail do usuário.',
                parameters: {
                    type: 'object',
                    properties: {
                        to: { type: 'string', description: 'E-mail do destinatário' },
                        subject: { type: 'string', description: 'Assunto do e-mail' },
                        body: { type: 'string', description: 'Corpo do e-mail' }
                    },
                    required: ['to', 'subject', 'body']
                }
            },
            {
                name: 'calendar_list_events',
                description: 'Lista os próximos compromissos do Google Calendar.',
                parameters: {
                    type: 'object',
                    properties: {
                        days_ahead: { type: 'number', description: 'Dias no futuro (padrão: 1)' },
                        max_results: { type: 'number', description: 'Máximo de eventos (padrão: 10)' }
                    },
                    required: []
                }
            },
            {
                name: 'calendar_create_event',
                description: 'Cria um novo evento no Google Calendar.',
                parameters: {
                    type: 'object',
                    properties: {
                        summary: { type: 'string', description: 'Título do evento' },
                        date_time: { type: 'string', description: 'Data/hora ISO (ex: 2026-08-15T14:00:00)' },
                        duration_minutes: { type: 'number', description: 'Duração em minutos (padrão: 60)' },
                        description: { type: 'string', description: 'Descrição do evento' }
                    },
                    required: ['summary', 'date_time']
                }
            }
        ]
    },

    // ══════════════════════════════════════════════════════════
    //  NOTION
    // ══════════════════════════════════════════════════════════
    notion: {
        id: 'notion',
        name: 'Notion',
        description: 'Conecte com o Notion para buscar, criar e organizar páginas e databases diretamente pela IA.',
        icon: '📝',
        color: '#000000',
        category: 'productivity',
        authType: 'oauth2',
        oauth: {
            authUrl: 'https://api.notion.com/v1/oauth/authorize',
            tokenUrl: 'https://api.notion.com/v1/oauth/token',
            scopes: [],
            responseType: 'code',
            ownerType: 'user',
        },
        tools: [
            {
                name: 'notion_search',
                description: 'Busca páginas e databases no Notion do usuário.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'Termo de busca' },
                        limit: { type: 'number', description: 'Máximo de resultados (padrão: 10)' }
                    },
                    required: ['query']
                }
            },
            {
                name: 'notion_create_page',
                description: 'Cria uma nova página no Notion.',
                parameters: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', description: 'Título da página' },
                        content: { type: 'string', description: 'Conteúdo em texto' },
                        parent_id: { type: 'string', description: 'ID da página pai ou database (opcional)' }
                    },
                    required: ['title']
                }
            }
        ]
    },

    // ══════════════════════════════════════════════════════════
    //  TRELLO
    // ══════════════════════════════════════════════════════════
    trello: {
        id: 'trello',
        name: 'Trello',
        description: 'Gerencie boards, listas e cards do Trello. Crie tarefas e mova cards automaticamente.',
        icon: '📋',
        color: '#0079BF',
        category: 'project_management',
        authType: 'oauth2',
        oauth: {
            authUrl: 'https://trello.com/1/authorize',
            tokenUrl: null, // Trello usa token direto no callback
            scopes: ['read', 'write'],
            expiration: 'never',
            responseType: 'token',
        },
        tools: [
            {
                name: 'trello_list_boards',
                description: 'Lista seus boards do Trello.',
                parameters: { type: 'object', properties: {}, required: [] }
            },
            {
                name: 'trello_list_cards',
                description: 'Lista cards de um board ou lista específica.',
                parameters: {
                    type: 'object',
                    properties: {
                        board_id: { type: 'string', description: 'ID do board' },
                        list_name: { type: 'string', description: 'Nome da lista (opcional)' }
                    },
                    required: ['board_id']
                }
            },
            {
                name: 'trello_create_card',
                description: 'Cria um novo card no Trello.',
                parameters: {
                    type: 'object',
                    properties: {
                        board_id: { type: 'string', description: 'ID do board' },
                        list_name: { type: 'string', description: 'Nome da lista onde criar' },
                        title: { type: 'string', description: 'Título do card' },
                        description: { type: 'string', description: 'Descrição' }
                    },
                    required: ['board_id', 'list_name', 'title']
                }
            }
        ]
    },

    // ══════════════════════════════════════════════════════════
    //  HUBSPOT
    // ══════════════════════════════════════════════════════════
    hubspot: {
        id: 'hubspot',
        name: 'HubSpot',
        description: 'Conecte seu CRM HubSpot. Gerencie contatos, deals e empresas diretamente pela IA.',
        icon: '🟠',
        color: '#FF7A59',
        category: 'crm',
        authType: 'oauth2',
        oauth: {
            authUrl: 'https://app.hubspot.com/oauth/authorize',
            tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
            scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write', 'crm.objects.deals.read', 'crm.objects.deals.write'],
        },
        tools: [
            {
                name: 'hubspot_list_contacts',
                description: 'Lista contatos do HubSpot CRM.',
                parameters: {
                    type: 'object',
                    properties: {
                        limit: { type: 'number', description: 'Máximo de contatos (padrão: 10)' },
                        query: { type: 'string', description: 'Busca por nome ou email' }
                    },
                    required: []
                }
            },
            {
                name: 'hubspot_create_contact',
                description: 'Cria um novo contato no HubSpot.',
                parameters: {
                    type: 'object',
                    properties: {
                        email: { type: 'string', description: 'E-mail do contato' },
                        firstname: { type: 'string', description: 'Primeiro nome' },
                        lastname: { type: 'string', description: 'Sobrenome' },
                        phone: { type: 'string', description: 'Telefone' }
                    },
                    required: ['email']
                }
            },
            {
                name: 'hubspot_list_deals',
                description: 'Lista deals/negócios do HubSpot.',
                parameters: {
                    type: 'object',
                    properties: {
                        limit: { type: 'number', description: 'Máximo de deals (padrão: 10)' }
                    },
                    required: []
                }
            }
        ]
    },

    // ══════════════════════════════════════════════════════════
    //  GITHUB
    // ══════════════════════════════════════════════════════════
    github: {
        id: 'github',
        name: 'GitHub',
        description: 'Gerencie repositórios, issues e pull requests do GitHub pela IA.',
        icon: '🐙',
        color: '#24292E',
        category: 'development',
        authType: 'oauth2',
        oauth: {
            authUrl: 'https://github.com/login/oauth/authorize',
            tokenUrl: 'https://github.com/login/oauth/access_token',
            scopes: ['repo', 'read:user'],
        },
        tools: [
            {
                name: 'github_list_repos',
                description: 'Lista repositórios do GitHub do usuário.',
                parameters: {
                    type: 'object',
                    properties: {
                        limit: { type: 'number', description: 'Máximo de repos (padrão: 10)' }
                    },
                    required: []
                }
            },
            {
                name: 'github_list_issues',
                description: 'Lista issues de um repositório.',
                parameters: {
                    type: 'object',
                    properties: {
                        repo: { type: 'string', description: 'Nome do repositório (owner/repo)' },
                        state: { type: 'string', description: 'Estado: open, closed, all (padrão: open)' }
                    },
                    required: ['repo']
                }
            },
            {
                name: 'github_create_issue',
                description: 'Cria uma issue em um repositório.',
                parameters: {
                    type: 'object',
                    properties: {
                        repo: { type: 'string', description: 'Nome do repositório (owner/repo)' },
                        title: { type: 'string', description: 'Título da issue' },
                        body: { type: 'string', description: 'Descrição da issue' }
                    },
                    required: ['repo', 'title']
                }
            }
        ]
    },

    // ══════════════════════════════════════════════════════════
    //  ASANA
    // ══════════════════════════════════════════════════════════
    asana: {
        id: 'asana',
        name: 'Asana',
        description: 'Gerencie projetos e tarefas do Asana. Crie, atualize e organize atividades facilmente.',
        icon: '✅',
        color: '#F06A6A',
        category: 'project_management',
        authType: 'oauth2',
        oauth: {
            authUrl: 'https://app.asana.com/-/oauth_authorize',
            tokenUrl: 'https://app.asana.com/-/oauth_token',
            scopes: ['default'],
        },
        tools: [
            {
                name: 'asana_list_tasks',
                description: 'Lista tarefas dos seus projetos no Asana.',
                parameters: {
                    type: 'object',
                    properties: {
                        project_id: { type: 'string', description: 'ID do projeto (opcional)' },
                        limit: { type: 'number', description: 'Máximo (padrão: 20)' }
                    },
                    required: []
                }
            },
            {
                name: 'asana_create_task',
                description: 'Cria uma nova tarefa no Asana.',
                parameters: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Nome da tarefa' },
                        project_id: { type: 'string', description: 'ID do projeto' },
                        notes: { type: 'string', description: 'Notas/descrição' },
                        due_on: { type: 'string', description: 'Data de entrega (YYYY-MM-DD)' }
                    },
                    required: ['name']
                }
            }
        ]
    },

    // ══════════════════════════════════════════════════════════
    //  SHOPIFY
    // ══════════════════════════════════════════════════════════
    shopify: {
        id: 'shopify',
        name: 'Shopify',
        description: 'Conecte sua loja Shopify. Gerencie produtos, pedidos e clientes via IA.',
        icon: '🛒',
        color: '#96BF48',
        category: 'ecommerce',
        authType: 'oauth2',
        oauth: {
            // authUrl é dinâmico: https://{shop}.myshopify.com/admin/oauth/authorize
            authUrl: 'https://{shop}.myshopify.com/admin/oauth/authorize',
            tokenUrl: 'https://{shop}.myshopify.com/admin/oauth/access_token',
            scopes: ['read_products', 'write_products', 'read_orders', 'read_customers'],
        },
        configSchema: [
            { key: 'shop_domain', label: 'Domínio da loja (ex: minha-loja.myshopify.com)', type: 'text', required: true }
        ],
        tools: [
            {
                name: 'shopify_list_products',
                description: 'Lista produtos da loja Shopify.',
                parameters: {
                    type: 'object',
                    properties: {
                        limit: { type: 'number', description: 'Máximo (padrão: 10)' }
                    },
                    required: []
                }
            },
            {
                name: 'shopify_list_orders',
                description: 'Lista pedidos recentes da loja.',
                parameters: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', description: 'Status: open, closed, any' },
                        limit: { type: 'number', description: 'Máximo (padrão: 10)' }
                    },
                    required: []
                }
            }
        ]
    },

    // ══════════════════════════════════════════════════════════
    //  CUSTOM WEBHOOK (API genérica)
    // ══════════════════════════════════════════════════════════
    webhook: {
        id: 'webhook',
        name: 'Webhook / API Custom',
        description: 'Conecte qualquer API externa usando uma URL personalizada, headers e autenticação por API Key.',
        icon: '🔌',
        color: '#6C5CE7',
        category: 'custom',
        authType: 'api_key',
        configSchema: [
            { key: 'base_url', label: 'URL Base da API (ex: https://api.exemplo.com)', type: 'text', required: true },
            { key: 'api_key', label: 'API Key / Token de autenticação', type: 'password', required: false },
            { key: 'header_name', label: 'Nome do header de auth (ex: Authorization, X-API-Key)', type: 'text', required: false },
        ],
        tools: [
            {
                name: 'webhook_get',
                description: 'Faz uma requisição GET para a API configurada.',
                parameters: {
                    type: 'object',
                    properties: {
                        endpoint: { type: 'string', description: 'Endpoint (ex: /users, /products)' },
                        query_params: { type: 'string', description: 'Query params (ex: ?page=1&limit=10)' }
                    },
                    required: ['endpoint']
                }
            },
            {
                name: 'webhook_post',
                description: 'Faz uma requisição POST para a API configurada.',
                parameters: {
                    type: 'object',
                    properties: {
                        endpoint: { type: 'string', description: 'Endpoint (ex: /users)' },
                        body: { type: 'string', description: 'Corpo da requisição em JSON' }
                    },
                    required: ['endpoint']
                }
            }
        ]
    },

    // ══════════════════════════════════════════════════════════
    //  SLACK
    // ══════════════════════════════════════════════════════════
    slack: {
        id: 'slack',
        name: 'Slack',
        description: 'Envie e leia mensagens no Slack. Integre canais e notificações com sua IA.',
        icon: '💬',
        color: '#4A154B',
        category: 'communication',
        authType: 'oauth2',
        oauth: {
            authUrl: 'https://slack.com/oauth/v2/authorize',
            tokenUrl: 'https://slack.com/api/oauth.v2.access',
            scopes: ['chat:write', 'channels:read', 'channels:history', 'users:read'],
        },
        tools: [
            {
                name: 'slack_send_message',
                description: 'Envia uma mensagem para um canal do Slack.',
                parameters: {
                    type: 'object',
                    properties: {
                        channel: { type: 'string', description: 'Nome ou ID do canal' },
                        text: { type: 'string', description: 'Texto da mensagem' }
                    },
                    required: ['channel', 'text']
                }
            },
            {
                name: 'slack_list_channels',
                description: 'Lista os canais disponíveis no Slack.',
                parameters: { type: 'object', properties: {}, required: [] }
            }
        ]
    },
};

/**
 * Retorna todos os plugins disponíveis (para o marketplace)
 */
function getAllPlugins() {
    return Object.values(PLUGINS).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        icon: p.icon,
        color: p.color,
        category: p.category,
        authType: p.authType,
        configSchema: p.configSchema || [],
        toolCount: p.tools.length,
        toolNames: p.tools.map(t => t.name),
    }));
}

/**
 * Retorna um plugin pelo ID
 */
function getPlugin(pluginId) {
    return PLUGINS[pluginId] || null;
}

/**
 * Retorna as tool definitions (formato OpenAI) dos plugins ativos de um tenant
 * @param {Array} activePluginIds - IDs dos plugins ativos
 */
function getToolDefinitionsForPlugins(activePluginIds = []) {
    const tools = [];
    for (const pluginId of activePluginIds) {
        const plugin = PLUGINS[pluginId];
        if (!plugin) continue;
        for (const tool of plugin.tools) {
            tools.push({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters,
                }
            });
        }
    }
    return tools;
}

/**
 * Encontra qual plugin é dono de uma tool pelo nome
 */
function findPluginByToolName(toolName) {
    for (const plugin of Object.values(PLUGINS)) {
        if (plugin.tools.find(t => t.name === toolName)) {
            return plugin.id;
        }
    }
    return null;
}

module.exports = {
    PLUGINS,
    getAllPlugins,
    getPlugin,
    getToolDefinitionsForPlugins,
    findPluginByToolName,
};
