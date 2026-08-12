const express = require('express');
const { getSupabase } = require('../db/supabase');
const router = express.Router();

// Fallback em memória caso o usuário não tenha rodado o script SQL no Supabase ainda
let memoryCampaigns = [];
let memoryCalls = [];
let telnyxConfigStore = {}; // Armazena por tenant_id

// ── AUXILIAR: Verifica conexão ou usa fallback ──
const getCampaignsTable = async (tenantId) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('voice_campaigns').select('*').eq('tenant_id', tenantId);
        if (error) throw error;
        return { count: data.length, data, isDb: true };
    } catch (e) {
        // Fallback para memória filtrado por tenant
        const filtered = memoryCampaigns.filter(c => c.tenant_id === tenantId);
        return { count: filtered.length, data: filtered, isDb: false };
    }
};

// ── ROTAS DE CONFIGURAÇÃO DO TELNYX ──

// Buscar configurações
router.get('/config', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.id;
        let config = telnyxConfigStore[tenantId] || { apiKey: '', sipDomain: '', fromNumber: '' };
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Salvar configurações
router.post('/config', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.id;
        const { apiKey, sipDomain, fromNumber } = req.body;
        telnyxConfigStore[tenantId] = { apiKey, sipDomain, fromNumber };
        res.json({ success: true, message: 'Configurações salvos com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET: LISTAR CAMPANHAS ──
router.get('/', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.id;
        const result = await getCampaignsTable(tenantId);

        if (result.isDb) {
            // Se for banco, busca chamadas associadas
            const supabase = getSupabase();
            const campaigns = result.data;
            const { data: calls } = await supabase.from('voice_calls').select('*').eq('tenant_id', tenantId);

            const enriched = campaigns.map(camp => ({
                ...camp,
                calls: (calls || []).filter(c => c.campaign_id === camp.id)
            }));
            return res.json(enriched);
        } else {
            // Fallback em memória
            const enriched = result.data.map(camp => ({
                ...camp,
                calls: memoryCalls.filter(c => c.campaign_id === camp.id)
            }));
            return res.json(enriched);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST: CRIAR CAMPANHA ──
router.post('/', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.id;
        const { name, script, voice, numbers } = req.body;

        if (!name || !script || !numbers || !Array.isArray(numbers) || numbers.length === 0) {
            return res.status(400).json({ error: 'Parâmetros inválidos ou vazios' });
        }

        const campaignId = require('crypto').randomUUID();
        const cleanNumbers = numbers.map(n => n.trim().replace(/\D/g, '')).filter(n => n.length >= 8);

        const newCampaign = {
            id: campaignId,
            tenant_id: tenantId,
            name,
            script,
            voice: voice || 'female-pt-br',
            numbers: cleanNumbers,
            status: 'pending',
            stats: {
                total: cleanNumbers.length,
                completed: 0,
                interested: 0,
                no_answer: 0,
                errors: 0
            },
            telnyx_config: telnyxConfigStore[tenantId] || {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Tenta salvar no Supabase
        try {
            const supabase = getSupabase();
            const { data, error } = await supabase.from('voice_campaigns').insert(newCampaign).select().single();
            if (error) throw error;

            // Cria as chamadas iniciais pendentes
            const pendingCalls = cleanNumbers.map(num => ({
                id: require('crypto').randomUUID(),
                campaign_id: campaignId,
                tenant_id: tenantId,
                phone_number: num,
                duration_seconds: 0,
                status: 'pending',
                transcription: '',
                outcome: 'pending',
                whatsapp_followup_sent: false
            }));
            await supabase.from('voice_calls').insert(pendingCalls);

            return res.json({ ...data, calls: pendingCalls });
        } catch (e) {
            // Fallback em memória
            memoryCampaigns.push(newCampaign);

            const pendingCalls = cleanNumbers.map(num => ({
                id: require('crypto').randomUUID(),
                campaign_id: campaignId,
                tenant_id: tenantId,
                phone_number: num,
                duration_seconds: 0,
                status: 'pending',
                transcription: '',
                outcome: 'pending',
                whatsapp_followup_sent: false,
                created_at: new Date().toISOString()
            }));
            memoryCalls.push(...pendingCalls);

            return res.json({ ...newCampaign, calls: pendingCalls, warning: 'Banco de dados offline/tabela não criada. Executando em memória de fallback.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST: DISPARAR CAMPANHA (SIMULADOR DE FLUXO E INTEGRAÇÕES) ──
router.post('/:id/start', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.id;
        const campaignId = req.params.id;

        // Busca a campanha
        let campaign = null;
        let isDb = true;

        try {
            const supabase = getSupabase();
            const { data, error } = await supabase.from('voice_campaigns').select('*').eq('id', campaignId).eq('tenant_id', tenantId).single();
            if (error) throw error;
            campaign = data;
        } catch (e) {
            campaign = memoryCampaigns.find(c => c.id === campaignId && c.tenant_id === tenantId);
            isDb = false;
        }

        if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
        if (campaign.status === 'running') return res.status(400).json({ error: 'A campanha já está ativa' });

        // Atualiza status para rodando
        campaign.status = 'running';
        campaign.updated_at = new Date().toISOString();

        if (isDb) {
            const supabase = getSupabase();
            await supabase.from('voice_campaigns').update({ status: 'running', updated_at: campaign.updated_at }).eq('id', campaignId);
        }

        // Inicia fluxo de simulador em background (simula Pipecat extraindo respostas em tempo real)
        res.json({ success: true, message: 'Disparando ligações em tempo real!' });

        // Background engine
        (async () => {
            let calls = [];
            if (isDb) {
                const supabase = getSupabase();
                const { data } = await supabase.from('voice_calls').select('*').eq('campaign_id', campaignId);
                calls = data || [];
            } else {
                calls = memoryCalls.filter(c => c.campaign_id === campaignId);
            }

            // Rodando cada ligação de forma sequencial rápida ou paralela
            for (const call of calls) {
                if (call.status !== 'pending') continue;

                // Atualiza status da chamada para 'calling'
                call.status = 'calling';
                if (isDb) {
                    const supabase = getSupabase();
                    await supabase.from('voice_calls').update({ status: 'calling' }).eq('id', call.id);
                }

                // Simula 2-5 segundos de ring e conversa
                await new Promise(r => setTimeout(r, 4000));

                // Decisão randômica realista de resposta
                const rand = Math.random();
                let outcome = 'no_answer';
                let callStatus = 'no_answer';
                let duration = 0;
                let transcription = '';

                if (rand < 0.2) {
                    // Não atendeu / Caixa postal
                    outcome = 'no_answer';
                    callStatus = 'no_answer';
                    transcription = '[CAIXA POSTAL] Deixe o seu recado após o sinal...';
                } else if (rand < 0.5) {
                    // Atendeu mas recusou / não interessado
                    outcome = 'not_interested';
                    callStatus = 'completed';
                    duration = Math.floor(Math.random() * 20) + 10;
                    transcription = `Cliente: Alô, quem fala?\nIA: Olá! Aqui é a Maria do WhatsApp AI Pro. Estou ligando para te apresentar nossa plataforma.\nCliente: Ah, obrigado, mas já temos um sistema e não estamos interessados no momento. Boa tarde.\nIA: Sem problemas, entendo perfeitamente. Tenha uma ótima tarde!`;
                } else {
                    // Atendeu e ficou interessado!
                    outcome = 'interested';
                    callStatus = 'completed';
                    duration = Math.floor(Math.random() * 50) + 40;
                    transcription = `Cliente: Alô, boa tarde.\nIA: Olá! Aqui é a Maria do WhatsApp AI Pro. Estou ligando rápido para apresentar nosso novo módulo de prospecção automatizada por voz.\nCliente: Que interessante, isso é feito por IA mesmo? Quão rápido vocês conseguem ligar para uma lista?\nIA: Sim! A IA faz a ligação conversando de forma super natural, entende respostas e envia a proposta no seu WhatsApp ao desligarmos. Quer dar uma olhada na proposta completa por lá?\nCliente: Com certeza! Pode me enviar e eu dou uma olhada. Valeu!\nIA: Excelente! Acabei de solicitar o envio do link. Obrigado pela atenção e bom dia!`;
                }

                // Tenta enviar follow-up automático pelo WhatsApp usando algum bot ativo no sistema
                let whatsappFollowupSent = false;
                if (outcome === 'interested') {
                    try {
                        const supabase = getSupabase();
                        const { data: connectedAgents } = await supabase.from('agents').select('*').eq('tenant_id', tenantId).eq('status', 'connected');
                        if (connectedAgents && connectedAgents.length > 0) {
                            const activeAgentId = connectedAgents[0].id;
                            const { sendDirectMessage } = require('../whatsapp/bot');

                            const textMessage = `Olá! Conforme acabamos de conversar por ligação telefônica, segue a apresentação da novidade do WhatsApp AI Pro. Ficamos muito felizes pelo seu interesse!\n\n🔗 Acesse aqui: https://whatsapp-ai-pro-lucas.vercel.app/pricing\n\nCaso tenha alguma dúvida, pode responder essa mensagem que nossa IA te ajudará.`;
                            await sendDirectMessage(activeAgentId, call.phone_number, textMessage);
                            whatsappFollowupSent = true;
                        }
                    } catch (e) {
                        console.error('Falha ao enviar follow-up do WhatsApp:', e.message);
                    }
                }

                call.status = callStatus;
                call.outcome = outcome;
                call.duration_seconds = duration;
                call.transcription = transcription;
                call.whatsapp_followup_sent = whatsappFollowupSent;

                if (isDb) {
                    const supabase = getSupabase();
                    await supabase.from('voice_calls').update({
                        status: callStatus,
                        outcome,
                        duration_seconds: duration,
                        transcription,
                        whatsapp_followup_sent: whatsappFollowupSent
                    }).eq('id', call.id);
                }

                // Atualiza estatísticas da campanha
                const currentCalls = isDb
                    ? (await getSupabase().from('voice_calls').select('*').eq('campaign_id', campaignId)).data || []
                    : memoryCalls.filter(c => c.campaign_id === campaignId);

                const stats = {
                    total: campaign.numbers.length,
                    completed: currentCalls.filter(c => c.status === 'completed').length,
                    interested: currentCalls.filter(c => c.outcome === 'interested').length,
                    no_answer: currentCalls.filter(c => c.outcome === 'no_answer').length,
                    errors: currentCalls.filter(c => c.status === 'failed').length
                };

                campaign.stats = stats;
                if (isDb) {
                    const supabase = getSupabase();
                    await supabase.from('voice_campaigns').update({ stats }).eq('id', campaignId);
                }

                // Aguarda 1 segundo de intervalo seguro entre simulações de ligações
                await new Promise(r => setTimeout(r, 1000));
            }

            // Finaliza campanha
            campaign.status = 'finished';
            campaign.updated_at = new Date().toISOString();
            if (isDb) {
                const supabase = getSupabase();
                await supabase.from('voice_campaigns').update({ status: 'finished', updated_at: campaign.updated_at }).eq('id', campaignId);
            }
        })();

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE: EXCLUIR CAMPANHA ──
router.delete('/:id', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.id;
        const campaignId = req.params.id;

        try {
            const supabase = getSupabase();
            await supabase.from('voice_campaigns').delete().eq('id', campaignId).eq('tenant_id', tenantId);
            res.json({ success: true });
        } catch (e) {
            memoryCampaigns = memoryCampaigns.filter(c => !(c.id === campaignId && c.tenant_id === tenantId));
            memoryCalls = memoryCalls.filter(c => c.campaign_id !== campaignId);
            res.json({ success: true, warning: 'Removido apenas em memória de fallback.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
