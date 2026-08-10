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

    // ══════════════════════════════════════════════════════════
    //  INSTAGRAM
    // ══════════════════════════════════════════════════════════
    instagram: {
        id: 'instagram',
        name: 'Instagram Business',
        description: 'Gerencie postagens, responda directs e obtenha insights de alcance do Instagram via IA.',
        icon: '📸',
        color: '#E1306C',
        category: 'communication',
        authType: 'oauth2',
        oauth: {
            authUrl: 'https://api.instagram.com/oauth/authorize',
            tokenUrl: 'https://api.instagram.com/oauth/access_token',
            scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_comments', 'instagram_manage_messages'],
        },
        tools: [
            {
                name: 'instagram_get_info',
                description: 'Obtém dados básicos do perfil do Instagram.',
                parameters: { type: 'object', properties: {}, required: [] }
            },
            {
                name: 'instagram_publish_photo',
                description: 'Publica uma foto com legenda no feed do Instagram.',
                parameters: {
                    type: 'object',
                    properties: {
                        image_url: { type: 'string', description: 'URL pública da imagem' },
                        caption: { type: 'string', description: 'Legenda da foto' }
                    },
                    required: ['image_url']
                }
            }
        ]
    },

    // ══════════════════════════════════════════════════════════
    //  FACEBOOK
    // ══════════════════════════════════════════════════════════
    facebook: {
        id: 'facebook',
        name: 'Facebook Pages',
        description: 'Publique posts e interaja com seguidores da sua página do Facebook.',
        icon: '📘',
        color: '#1877F2',
        category: 'communication',
        authType: 'oauth2',
        oauth: {
            authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
            tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
            scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'publish_to_groups'],
        },
        tools: [
            {
                name: 'facebook_publish_post',
                description: 'Cria uma postagem na página conectada do Facebook.',
                parameters: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', description: 'Texto da publicação' },
                        link: { type: 'string', description: 'Link opcional para postar junto' }
                    },
                    required: ['message']
                }
            }
        ]
    },

    // ══════════════════════════════════════════════════════════
    //  LINKEDIN
    // ══════════════════════════════════════════════════════════
    linkedin: {
        id: 'linkedin',
        name: 'LinkedIn',
        description: 'Compartilhe posts e artigos corporativos diretamente no LinkedIn.',
        icon: '🔗',
        color: '#0A66C2',
        category: 'communication',
        authType: 'oauth2',
        oauth: {
            authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
            tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
            scopes: ['w_member_social', 'r_liteprofile'],
        },
        tools: [
            {
                name: 'linkedin_create_post',
                description: 'Publica um compartilhamento de texto ou URL no LinkedIn do usuário.',
                parameters: {
                    type: 'object',
                    properties: {
                        text: { type: 'string', description: 'Texto do post' },
                        title: { type: 'string', description: 'Título compartilhado (se houver link)' },
                        url: { type: 'string', description: 'URL a ser compartilhada no post' }
                    },
                    required: ['text']
                }
            }
        ]
    },

    // ══════════════════════════════════════════════════════════
    //  CLICKUP
    // ══════════════════════════════════════════════════════════
    clickup: {
        id: 'clickup',
        name: 'ClickUp',
        description: 'Conecte espaços e listas no ClickUp para gerenciar tarefas e produtividade corporativa.',
        icon: '⚡',
        color: '#7B68EE',
        category: 'project_management',
        authType: 'oauth2',
        oauth: {
            authUrl: 'https://app.clickup.com/api',
            tokenUrl: 'https://app.clickup.com/api/v2/oauth/token',
            scopes: [],
        },
        tools: [
            {
                name: 'clickup_list_tasks',
                description: 'Retorna cards e tarefas sob uma lista específica.',
                parameters: {
                    type: 'object',
                    properties: {
                        list_id: { type: 'string', description: 'ID da lista do ClickUp' }
                    },
                    required: ['list_id']
                }
            },
            {
                name: 'clickup_create_task',
                description: 'Adiciona uma tarefa em uma lista do ClickUp.',
                parameters: {
                    type: 'object',
                    properties: {
                        list_id: { type: 'string', description: 'ID da lista do ClickUp' },
                        name: { type: 'string', description: 'Título da tarefa' },
                        description: { type: 'string', description: 'Descrição da tarefa' }
                    },
                    required: ['list_id', 'name']
                }
            }
        ]
    },

    // ══════════════════════════════════════════════════════════
    //  JIRA
    // ══════════════════════════════════════════════════════════
    jira: {
        id: 'jira',
        name: 'Jira Software',
        description: 'Gerencie issues, sprints e tarefas de desenvolvimento no Jira Cloud.',
        icon: '💙',
        color: '#0052CC',
        category: 'project_management',
        authType: 'oauth2',
        oauth: {
            authUrl: 'https://auth.atlassian.com/authorize',
            tokenUrl: 'https://auth.atlassian.com/oauth/token',
            scopes: ['read:jira-work', 'write:jira-work', 'read:jira-user'],
        },
        tools: [
            {
                name: 'jira_create_issue',
                description: 'Cria uma nova issue/tarefa no projeto do Jira.',
                parameters: {
                    type: 'object',
                    properties: {
                        project_key: { type: 'string', description: 'Chave do projeto (ex: PROJ)' },
                        summary: { type: 'string', description: 'Título/resumo do bug ou tarefa' },
                        description: { type: 'string', description: 'Descrição detalhada' },
                        issue_type: { type: 'string', description: 'Tipo do item (ex: Task, Bug, Story)' }
                    },
                    required: ['project_key', 'summary']
                }
            }
        ]
    },

    // ══════════════════════════════════════════════════════════
    //  PIPEDRIVE
    // ══════════════════════════════════════════════════════════
    pipedrive: {
        id: 'pipedrive',
        name: 'Pipedrive CRM',
        description: 'Sincronize metas comerciais, funil de vendas, leads e negócios no Pipedrive.',
        icon: '💚',
        color: '#22A363',
        category: 'crm',
        authType: 'oauth2',
        oauth: {
            authUrl: 'https://oauth.pipedrive.com/oauth/authorize',
            tokenUrl: 'https://oauth.pipedrive.com/oauth/token',
            scopes: ['deals:read', 'deals:write', 'contacts:read', 'contacts:write'],
        },
        tools: [
            {
                name: 'pipedrive_create_deal',
                description: 'Cria um novo negócio no funil de vendas do Pipedrive.',
                parameters: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', description: 'Título do negócio' },
                        value: { type: 'number', description: 'Valor estimado' },
                        currency: { type: 'string', description: 'Moeda (ex: BRL, USD)' }
                    },
                    required: ['title']
                }
            }
        ]
    },

    // ══════════════════════════════════════════════════════════
    //  DISCORD
    // ══════════════════════════════════════════════════════════
    discord: {
        id: 'discord',
        name: 'Discord',
        description: 'Envie atualizações, mensagens e alertas para canais do Discord via bots ou webhooks.',
        icon: '👾',
        color: '#5865F2',
        category: 'communication',
        authType: 'oauth2',
        oauth: {
            authUrl: 'https://discord.com/api/oauth2/authorize',
            tokenUrl: 'https://discord.com/api/oauth2/token',
            scopes: ['identify', 'connections', 'guilds', 'webhook.incoming'],
        },
        tools: [
            {
                name: 'discord_send_message',
                description: 'Envia mensagens para um canal do Discord usando a conexão ativa.',
                parameters: {
                    type: 'object',
                    properties: {
                        channel_id: { type: 'string', description: 'ID do canal' },
                        content: { type: 'string', description: 'Mensagem com formatação rich-text/markdown' }
                    },
                    required: ['channel_id', 'content']
                }
            }
        ]
    },

    // ══════════════════════════════════════════════════════════
    //  RD STATION
    // ══════════════════════════════════════════════════════════
    rdstation: {
        id: 'rdstation',
        name: 'RD Station',
        description: 'Envie leads, crie conversões e gerencie eventos de marketing no funil do RD Station.',
        icon: '🚀',
        color: '#363E48',
        category: 'crm',
        authType: 'oauth2',
        oauth: {
            authUrl: 'https://api.rd.services/auth/dialog',
            tokenUrl: 'https://api.rd.services/auth/token',
            scopes: [],
        },
        tools: [
            {
                name: 'rd_create_lead',
                description: 'Registra um lead e atualiza informações no funil do RD Station.',
                parameters: {
                    type: 'object',
                    properties: {
                        email: { type: 'string', description: 'E-mail do lead' },
                        name: { type: 'string', description: 'Nome completo' },
                        job_title: { type: 'string', description: 'Cargo profissional' }
                    },
                    required: ['email']
                }
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
