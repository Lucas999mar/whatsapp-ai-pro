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
                description: 'Busca informações na base de conhecimento interna da empresa (documentos, FAQs, etc).',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'O que buscar na base de conhecimento' }
                    },
                    required: ['query']
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
