/**
 * ══════════════════════════════════════════════════════════════
 *  AGENT TOOLS REGISTRY
 *  Catálogo central de ferramentas disponíveis para o Agente Autônomo.
 *  Cada tool tem: name, description, parameters (JSON Schema), execute(args).
 *  IMPORTANTE: Este módulo é ISOLADO e não altera nenhum arquivo existente.
 * ══════════════════════════════════════════════════════════════
 */

const gmailTool = require('./gmailTool');
const calendarTool = require('./calendarTool');
const whatsappTool = require('./whatsappTool');
const webSearchTool = require('./webSearchTool');
const knowledgeTool = require('./knowledgeTool');
const systemTools = require('./systemTools');

/**
 * Retorna a lista completa de ferramentas no formato OpenAI Function Calling
 * (que também é convertido para Anthropic internamente pelo pipeline).
 */
function getToolDefinitions() {
    return [
        // ── Gmail ──────────────────────────────────
        {
            type: 'function',
            function: {
                name: 'gmail_read_emails',
                description: 'Lê os últimos e-mails não lidos da caixa de entrada do Gmail. Retorna remetente, assunto e trecho do corpo.',
                parameters: {
                    type: 'object',
                    properties: {
                        max_results: { type: 'number', description: 'Quantidade máxima de e-mails a retornar (padrão: 5)' },
                        query: { type: 'string', description: 'Filtro de busca do Gmail (ex: "from:joao@email.com", "subject:proposta", "is:unread")' }
                    },
                    required: []
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'gmail_send_email',
                description: 'Envia um e-mail pelo Gmail do usuário.',
                parameters: {
                    type: 'object',
                    properties: {
                        to: { type: 'string', description: 'Endereço de e-mail do destinatário' },
                        subject: { type: 'string', description: 'Assunto do e-mail' },
                        body: { type: 'string', description: 'Corpo do e-mail em texto simples' }
                    },
                    required: ['to', 'subject', 'body']
                }
            }
        },

        // ── Google Calendar ────────────────────────
        {
            type: 'function',
            function: {
                name: 'calendar_list_events',
                description: 'Lista os próximos compromissos do Google Calendar do usuário.',
                parameters: {
                    type: 'object',
                    properties: {
                        days_ahead: { type: 'number', description: 'Quantos dias no futuro buscar (padrão: 1, ou seja, hoje)' },
                        max_results: { type: 'number', description: 'Máximo de eventos a retornar (padrão: 10)' }
                    },
                    required: []
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'calendar_create_event',
                description: 'Cria um novo evento no Google Calendar.',
                parameters: {
                    type: 'object',
                    properties: {
                        summary: { type: 'string', description: 'Título do evento' },
                        date_time: { type: 'string', description: 'Data e hora no formato ISO (ex: 2026-07-31T14:00:00)' },
                        duration_minutes: { type: 'number', description: 'Duração em minutos (padrão: 60)' },
                        description: { type: 'string', description: 'Descrição/notas do evento (opcional)' }
                    },
                    required: ['summary', 'date_time']
                }
            }
        },

        // ── WhatsApp ───────────────────────────────
        {
            type: 'function',
            function: {
                name: 'whatsapp_send_message',
                description: 'Envia uma mensagem de WhatsApp para um número específico usando o bot conectado.',
                parameters: {
                    type: 'object',
                    properties: {
                        phone_number: { type: 'string', description: 'Número do telefone com DDD e código do país (ex: 5511999999999)' },
                        message: { type: 'string', description: 'Texto da mensagem a enviar' }
                    },
                    required: ['phone_number', 'message']
                }
            }
        },

        // ── Web Search ─────────────────────────────
        {
            type: 'function',
            function: {
                name: 'web_search',
                description: 'Faz uma busca na internet e retorna os resultados mais relevantes. Use quando precisar de informações atualizadas que você não possui.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'O que buscar na internet' }
                    },
                    required: ['query']
                }
            }
        },

        // ── Knowledge Base ─────────────────────────
        {
            type: 'function',
            function: {
                name: 'search_knowledge_base',
                description: 'Busca informações na base de conhecimento interna da empresa (documentos, FAQs, etc). Use para consultar dados que a empresa guardou na memória do agente.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'O que buscar na base de conhecimento' }
                    },
                    required: ['query']
                }
            }
        },

        // ══════════════════════════════════════════════════════
        //  FERRAMENTAS DO SISTEMA (Internas)
        //  Permitem ao agente consultar e agir no sistema
        // ══════════════════════════════════════════════════════

        // ── Contratos ──────────────────────────────
        {
            type: 'function',
            function: {
                name: 'system_list_contracts',
                description: 'Lista os contratos da empresa no sistema. Pode filtrar por status: draft, sent, signed, cancelled.',
                parameters: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', description: 'Filtrar por status do contrato (draft, sent, signed, cancelled). Deixe vazio para todos.' },
                        limit: { type: 'number', description: 'Número máximo de resultados (padrão: 10)' }
                    },
                    required: []
                }
            }
        },

        // ── CRM / Kanban ──────────────────────────
        {
            type: 'function',
            function: {
                name: 'system_list_crm',
                description: 'Lista os cards do CRM/Kanban da empresa. Pode filtrar por status: lead, contact, proposal, negotiation, won, lost.',
                parameters: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', description: 'Filtrar por status (lead, contact, proposal, negotiation, won, lost). Vazio para todos.' },
                        limit: { type: 'number', description: 'Número máximo de resultados (padrão: 15)' }
                    },
                    required: []
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'system_create_crm_card',
                description: 'Cria um novo card/lead no CRM/Kanban da empresa.',
                parameters: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', description: 'Título do card/lead' },
                        contact_name: { type: 'string', description: 'Nome do contato/cliente' },
                        contact_phone: { type: 'string', description: 'Telefone do contato' },
                        value: { type: 'number', description: 'Valor estimado em reais' },
                        status: { type: 'string', description: 'Status inicial (padrão: lead)' },
                        notes: { type: 'string', description: 'Observações adicionais' }
                    },
                    required: ['title']
                }
            }
        },

        // ── Agenda / Reuniões ──────────────────────
        {
            type: 'function',
            function: {
                name: 'system_list_agenda',
                description: 'Lista os compromissos/reuniões da agenda interna do sistema.',
                parameters: {
                    type: 'object',
                    properties: {
                        days_ahead: { type: 'number', description: 'Quantos dias no futuro consultar (padrão: 7)' },
                        limit: { type: 'number', description: 'Número máximo de resultados (padrão: 20)' }
                    },
                    required: []
                }
            }
        },

        // ── Ordens de Serviço (OS) ─────────────────
        {
            type: 'function',
            function: {
                name: 'system_list_service_orders',
                description: 'Lista as ordens de serviço (OS) da empresa. Pode filtrar por status: open, in_progress, completed, cancelled.',
                parameters: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', description: 'Filtrar por status da OS (open, in_progress, completed, cancelled). Vazio para todas.' },
                        limit: { type: 'number', description: 'Número máximo de resultados (padrão: 10)' }
                    },
                    required: []
                }
            }
        },

        // ── Conversas do WhatsApp ───────────────────
        {
            type: 'function',
            function: {
                name: 'system_list_conversations',
                description: 'Lista as conversas mais recentes do WhatsApp gerenciadas pelo sistema.',
                parameters: {
                    type: 'object',
                    properties: {
                        limit: { type: 'number', description: 'Número máximo de conversas (padrão: 10)' }
                    },
                    required: []
                }
            }
        },

        // ── Estatísticas do Sistema ────────────────
        {
            type: 'function',
            function: {
                name: 'system_get_stats',
                description: 'Retorna estatísticas gerais do sistema: total de conversas, mensagens hoje, itens de conhecimento, agentes ativos, etc.',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            }
        },

        // ── Adicionar à Base de Conhecimento ───────
        {
            type: 'function',
            function: {
                name: 'system_add_knowledge',
                description: 'Adiciona uma nova informação/aprendizado à base de conhecimento (memória) do agente. Use para guardar informações importantes que o agente aprendeu durante as interações.',
                parameters: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', description: 'Título curto e descritivo da informação' },
                        content: { type: 'string', description: 'O conteúdo/texto completo a ser memorizado' }
                    },
                    required: ['title', 'content']
                }
            }
        },

        // ── Task Complete (Obrigatória) ────────────
        {
            type: 'function',
            function: {
                name: 'task_completed',
                description: 'Chame esta ferramenta OBRIGATORIAMENTE quando a tarefa estiver concluída. Forneça um resumo do que foi feito.',
                parameters: {
                    type: 'object',
                    properties: {
                        summary: { type: 'string', description: 'Resumo claro e conciso do que foi realizado' },
                        success: { type: 'boolean', description: 'true se a tarefa foi concluída com sucesso, false se houve falha' }
                    },
                    required: ['summary', 'success']
                }
            }
        }
    ];
}

/**
 * Executa uma ferramenta pelo nome, com os argumentos fornecidos.
 * @param {string} toolName - Nome da ferramenta
 * @param {object} args - Argumentos parseados
 * @param {object} context - Contexto (agentId, tenantId, credentials, etc)
 * @returns {Promise<string>} Resultado da execução em texto
 */
async function executeTool(toolName, args, context = {}) {
    try {
        switch (toolName) {
            // ── Ferramentas Externas ──
            case 'gmail_read_emails':
                return await gmailTool.readEmails(args, context);
            case 'gmail_send_email':
                return await gmailTool.sendEmail(args, context);
            case 'calendar_list_events':
                return await calendarTool.listEvents(args, context);
            case 'calendar_create_event':
                return await calendarTool.createEvent(args, context);
            case 'whatsapp_send_message':
                return await whatsappTool.sendMessage(args, context);
            case 'web_search':
                return await webSearchTool.search(args, context);
            case 'search_knowledge_base':
                return await knowledgeTool.search(args, context);

            // ── Ferramentas do Sistema (Internas) ──
            case 'system_list_contracts':
                return await systemTools.listContracts(args, context);
            case 'system_list_crm':
                return await systemTools.listCrmCards(args, context);
            case 'system_create_crm_card':
                return await systemTools.createCrmCard(args, context);
            case 'system_list_agenda':
                return await systemTools.listAgenda(args, context);
            case 'system_list_service_orders':
                return await systemTools.listServiceOrders(args, context);
            case 'system_list_conversations':
                return await systemTools.listRecentConversations(args, context);
            case 'system_get_stats':
                return await systemTools.getSystemStats(args, context);
            case 'system_add_knowledge':
                return await systemTools.addToKnowledgeBase(args, context);

            // ── Finalização ──
            case 'task_completed':
                return `✅ Tarefa finalizada: ${args.summary}`;
            default:
                return `❌ Ferramenta "${toolName}" não encontrada.`;
        }
    } catch (err) {
        console.error(`❌ [Tool:${toolName}] Erro:`, err.message);
        return `Erro ao executar ${toolName}: ${err.message}`;
    }
}

module.exports = { getToolDefinitions, executeTool };
