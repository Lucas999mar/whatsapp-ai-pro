/**
 * ══════════════════════════════════════════════════════════════
 *  SYSTEM TOOLS - Ferramentas internas do sistema
 *  
 *  Permite ao agente autônomo consultar e executar comandos
 *  dentro do próprio sistema WhatsApp AI Pro, com isolamento
 *  por tenant (empresa).
 *  
 *  Cada tool opera SOMENTE nos dados do tenant que está usando.
 *  IMPORTANTE: Módulo 100% isolado. Não altera nada existente.
 * ══════════════════════════════════════════════════════════════
 */

function getSupabaseClient() {
    try {
        const { getSupabase } = require('../../db/supabase');
        return getSupabase();
    } catch (err) {
        return null;
    }
}

// ── CONTRATOS ──────────────────────────────────────────────────

async function listContracts(args, context) {
    const supabase = getSupabaseClient();
    if (!supabase) return 'Banco de dados não disponível.';

    const tenantId = context.tenantId || 'default';
    const status = args.status || null;

    try {
        let query = supabase
            .from('contracts')
            .select('id, title, status, client_name, client_email, created_at, signed_at')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(args.limit || 10);

        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) return 'Nenhum contrato encontrado para esta empresa.';

        const formatted = data.map((c, i) => {
            const statusLabel = {
                draft: '📝 Rascunho',
                sent: '📨 Enviado',
                signed: '✅ Assinado',
                cancelled: '❌ Cancelado'
            }[c.status] || c.status;
            return `${i + 1}. ${c.title} | ${statusLabel} | Cliente: ${c.client_name || 'N/A'} | Criado: ${new Date(c.created_at).toLocaleDateString('pt-BR')}`;
        });

        return `Encontrados ${data.length} contrato(s):\n\n${formatted.join('\n')}`;
    } catch (err) {
        return `Erro ao listar contratos: ${err.message}`;
    }
}

// ── CRM / KANBAN ──────────────────────────────────────────────

async function listCrmCards(args, context) {
    const supabase = getSupabaseClient();
    if (!supabase) return 'Banco de dados não disponível.';

    const tenantId = context.tenantId || 'default';
    const status = args.status || null;

    try {
        let query = supabase
            .from('crm_cards')
            .select('id, title, status, contact_name, contact_phone, value, notes, created_at')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(args.limit || 15);

        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) return 'Nenhum card CRM encontrado.';

        const formatted = data.map((c, i) => {
            const value = c.value ? `R$ ${Number(c.value).toFixed(2)}` : 'N/A';
            return `${i + 1}. ${c.title} | Status: ${c.status} | Contato: ${c.contact_name || 'N/A'} | Valor: ${value}`;
        });

        return `Encontrados ${data.length} card(s) no CRM:\n\n${formatted.join('\n')}`;
    } catch (err) {
        return `Erro ao listar CRM: ${err.message}`;
    }
}

async function createCrmCard(args, context) {
    const supabase = getSupabaseClient();
    if (!supabase) return 'Banco de dados não disponível.';

    const tenantId = context.tenantId || 'default';

    try {
        const { data, error } = await supabase
            .from('crm_cards')
            .insert({
                tenant_id: tenantId,
                title: args.title,
                status: args.status || 'lead',
                contact_name: args.contact_name || null,
                contact_phone: args.contact_phone || null,
                value: args.value || null,
                notes: args.notes || null,
            })
            .select()
            .single();

        if (error) throw error;
        return `✅ Card CRM criado com sucesso!\nID: ${data.id}\nTítulo: ${data.title}\nStatus: ${data.status}`;
    } catch (err) {
        return `Erro ao criar card CRM: ${err.message}`;
    }
}

// ── AGENDA / REUNIÕES ────────────────────────────────────────

async function listAgenda(args, context) {
    const supabase = getSupabaseClient();
    if (!supabase) return 'Banco de dados não disponível.';

    const tenantId = context.tenantId || 'default';

    try {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + (args.days_ahead || 7));

        const { data, error } = await supabase
            .from('agenda_events')
            .select('id, title, description, start_time, end_time, status, client_name')
            .eq('tenant_id', tenantId)
            .gte('start_time', now.toISOString())
            .lte('start_time', futureDate.toISOString())
            .order('start_time', { ascending: true })
            .limit(args.limit || 20);

        if (error) throw error;
        if (!data || data.length === 0) return `Nenhum compromisso encontrado para os próximos ${args.days_ahead || 7} dia(s).`;

        const formatted = data.map((e, i) => {
            const dt = new Date(e.start_time);
            return `${i + 1}. 📅 ${e.title} | ${dt.toLocaleDateString('pt-BR')} ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} | ${e.client_name || ''} | ${e.status || 'agendado'}`;
        });

        return `Encontrados ${data.length} compromisso(s):\n\n${formatted.join('\n')}`;
    } catch (err) {
        return `Erro ao listar agenda: ${err.message}`;
    }
}

// ── ORDENS DE SERVIÇO (OS) ────────────────────────────────────

async function listServiceOrders(args, context) {
    const supabase = getSupabaseClient();
    if (!supabase) return 'Banco de dados não disponível.';

    const tenantId = context.tenantId || 'default';
    const status = args.status || null;

    try {
        let query = supabase
            .from('os_orders')
            .select('id, title, status, priority, client_name, technician_name, created_at')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(args.limit || 10);

        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) return 'Nenhuma ordem de serviço encontrada.';

        const formatted = data.map((os, i) => {
            return `${i + 1}. OS #${os.id?.substring(0, 8)} | ${os.title} | Status: ${os.status} | Prioridade: ${os.priority || 'normal'} | Técnico: ${os.technician_name || 'N/A'}`;
        });

        return `Encontradas ${data.length} OS:\n\n${formatted.join('\n')}`;
    } catch (err) {
        return `Erro ao listar ordens de serviço: ${err.message}`;
    }
}

// ── CONVERSAS DO WHATSAPP ────────────────────────────────────

async function listRecentConversations(args, context) {
    const supabase = getSupabaseClient();
    if (!supabase) return 'Banco de dados não disponível.';

    const tenantId = context.tenantId || 'default';

    try {
        const { listConversations } = require('../../db/repository');
        const conversations = await listConversations(args.limit || 10, tenantId);

        if (!conversations || conversations.length === 0) {
            return 'Nenhuma conversa recente encontrada.';
        }

        const formatted = conversations.map((c, i) => {
            const name = c.user_name || c.userName || c.whatsapp_id || 'Desconhecido';
            const lastMsg = c.last_message || c.content || '';
            const time = c.updated_at || c.created_at || '';
            return `${i + 1}. 💬 ${name} | Última msg: "${lastMsg.substring(0, 50)}..." | ${time ? new Date(time).toLocaleDateString('pt-BR') : ''}`;
        });

        return `Últimas ${conversations.length} conversa(s):\n\n${formatted.join('\n')}`;
    } catch (err) {
        return `Erro ao listar conversas: ${err.message}`;
    }
}

// ── ESTATÍSTICAS DO SISTEMA ──────────────────────────────────

async function getSystemStats(args, context) {
    const tenantId = context.tenantId || 'default';

    try {
        const { getStats } = require('../../db/repository');
        const stats = await getStats(tenantId);

        return `📊 Estatísticas do Sistema:
- Total de conversas: ${stats.totalConversations || 0}
- Mensagens hoje: ${stats.messagesToday || 0}
- Conhecimento base: ${stats.knowledgeItems || 0} itens
- Agentes ativos: ${stats.activeAgents || 0}
- Follow-ups pendentes: ${stats.pendingFollowUps || 0}`;
    } catch (err) {
        return `Erro ao buscar estatísticas: ${err.message}`;
    }
}

// ── BASE DE CONHECIMENTO (MEMÓRIA DO AGENTE) ──────────────────

async function addToKnowledgeBase(args, context) {
    const tenantId = context.tenantId || 'default';
    const agentId = context.agentId || 'global';

    try {
        const { addKnowledgeItem } = require('../../db/repository');

        const item = await addKnowledgeItem({
            title: args.title,
            type: 'text',
            content: args.content,
            agentId,
            tenantId,
        });

        // Grava no log de evolução autônoma
        try {
            const supabase = getSupabaseClient();
            if (supabase) {
                await supabase.from('agent_memory_log').insert({
                    tenant_id: tenantId,
                    agent_id: agentId,
                    source_task_id: context.taskId || null,
                    knowledge_id: item.id || null,
                    title: args.title,
                    content: args.content
                });
            }
        } catch (dbErr) {
            console.warn('⚠️ [SystemTools] Não foi possível logar evolução da memória:', dbErr.message);
        }

        return `✅ Conhecimento adicionado com sucesso à memória!\nID: ${item.id}\nTítulo: ${args.title}\nO agente agora pode usar essa informação em futuras consultas.`;
    } catch (err) {
        return `Erro ao adicionar à base de conhecimento: ${err.message}`;
    }
}

module.exports = {
    listContracts,
    listCrmCards,
    createCrmCard,
    listAgenda,
    listServiceOrders,
    listRecentConversations,
    getSystemStats,
    addToKnowledgeBase,
};
