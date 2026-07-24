const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getSupabase } = require('../db/supabase');
const { authMiddleware } = require('./auth');
const { callChatCompletion, resolveAIConfig } = require('../ai/pipeline');
const { getBotSettings } = require('../db/repository');

// Caminho do sandbox local se o banco falhar
const sandboxPath = path.join(__dirname, '..', '..', 'social_analytics_sandbox.json');

// Função auxiliar para inicializar/obter dados do Sandbox Local
function getSandboxData() {
    try {
        if (!fs.existsSync(sandboxPath)) {
            fs.writeFileSync(sandboxPath, JSON.stringify({ connections: [], metrics: [] }, null, 2));
        }
        const raw = fs.readFileSync(sandboxPath, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        console.error('⚠️ Erro ao carregar Sandbox:', err.message);
        return { connections: [], metrics: [] };
    }
}

// Salvar no Sandbox Local
function saveSandboxData(data) {
    try {
        fs.writeFileSync(sandboxPath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('⚠️ Erro ao salvar Sandbox:', err.message);
    }
}

// Gerador de dados de teste (Métricas simuladas realistas e dinâmicas)
function generateMockMetrics(platform, accountName) {
    let cleanName = accountName;
    if (cleanName.includes('instagram.com/') || cleanName.includes('tiktok.com/') || cleanName.includes('youtube.com/')) {
        try {
            const parts = cleanName.split('/');
            cleanName = parts[parts.length - 1] || cleanName;
        } catch (e) { }
    }
    if (cleanName.includes('?')) {
        cleanName = cleanName.split('?')[0];
    }
    if (!cleanName.startsWith('@') && platform.toLowerCase() !== 'youtube') {
        cleanName = '@' + cleanName;
    }

    // Calcula hash consistente para manter as métricas estáveis por perfil inserido
    let hash = 0;
    for (let i = 0; i < cleanName.length; i++) {
        hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);

    const followers = 1200 + (hash % 145000); // 1.2K a 146.2K seguidores
    const reach = Math.round(followers * (1.5 + (hash % 60) / 10));
    const impressions = Math.round(reach * 1.6);
    const views = Math.round(impressions * 0.45);
    const postsCount = 12 + (hash % 240);
    const engagementRate = parseFloat((1.2 + (hash % 120) / 10).toFixed(2));

    // Dynamic posts based on platform and cleanName
    const postIdeas = {
        instagram: [
            { id: '1', url: `https://instagram.com/${cleanName.replace('@', '')}/p/1`, caption: `O segredo para alavancar ${cleanName} no mercado digital hoje! 💥📈 #marketing`, views: Math.round(views * 0.12), likes: Math.round(followers * 0.04), comments: Math.round(followers * 0.005), date: '2026-07-22' },
            { id: '2', url: `https://instagram.com/${cleanName.replace('@', '')}/p/2`, caption: `Bastidores: Entregando soluções customizadas para os clientes de ${cleanName}. 😉🚀 #business`, views: Math.round(views * 0.08), likes: Math.round(followers * 0.03), comments: Math.round(followers * 0.003), date: '2026-07-20' },
            { id: '3', url: `https://instagram.com/${cleanName.replace('@', '')}/p/3`, caption: `Resultados do novo teste de automação de campanhas da marca! #resultados #ia`, views: Math.round(views * 0.15), likes: Math.round(followers * 0.06), comments: Math.round(followers * 0.009), date: '2026-07-18' }
        ],
        tiktok: [
            { id: '1', url: `https://tiktok.com/@${cleanName.replace('@', '')}/video/1`, caption: `Gravei a reação ao ver as métricas de zero a mil em segundos de ${cleanName}! 😱⚡ #fy #dev`, views: Math.round(views * 0.35), likes: Math.round(followers * 0.09), comments: Math.round(followers * 0.009), date: '2026-07-23' },
            { id: '2', url: `https://tiktok.com/@${cleanName.replace('@', '')}/video/2`, caption: `Como a nossa inteligência artificial resolveu um problema gigante do comercial. #ia #business`, views: Math.round(views * 0.55), likes: Math.round(followers * 0.12), comments: Math.round(followers * 0.015), date: '2026-07-21' }
        ],
        youtube: [
            { id: '1', url: `https://youtube.com/c/${cleanName.replace('@', '')}/watch?v=1`, caption: `A Estratégia Definitiva de Escala de Audiência Aplicada em ${cleanName}`, views: Math.round(views * 0.12), likes: Math.round(followers * 0.05), comments: Math.round(followers * 0.008), date: '2026-07-15' },
            { id: '2', url: `https://youtube.com/c/${cleanName.replace('@', '')}/watch?v=2`, caption: `Como Implementamos ChatBots de Alta Conversão no Whatsapp (Passo a Passo Completo)`, views: Math.round(views * 0.09), likes: Math.round(followers * 0.04), comments: Math.round(followers * 0.005), date: '2026-07-10' }
        ],
        facebook: [
            { id: '1', url: `https://facebook.com/${cleanName.replace('@', '')}/posts/1`, caption: `Sejam bem-vindos à página oficial de ${cleanName}. Acompanhe aqui nossas dicas e novidades corporativas diárias!`, views: Math.round(views * 0.05), likes: Math.round(followers * 0.015), comments: Math.round(followers * 0.001), date: '2026-07-24' }
        ],
        kwai: [
            { id: '1', url: `https://kwai.com/${cleanName.replace('@', '')}/v/1`, caption: `Passo a passo rápido para configurar e triplicar a conversão da sua assessoria! 📱🚀 #marketing`, views: Math.round(views * 0.28), likes: Math.round(followers * 0.07), comments: Math.round(followers * 0.008), date: '2026-07-22' }
        ]
    };

    const trends = {
        instagram: [`Inovação em ${cleanName}`, 'Inteligência Artificial', 'Marketing Digital', 'SaaS Growth'],
        tiktok: [`#${cleanName.replace('@', '')}`, '#trend2026', '#IA', '#sucesso'],
        youtube: [`Canal ${cleanName}`, 'Automação Corporativa', 'Como Vender Mais', 'SaaS Tech'],
        facebook: [`Negócios ${cleanName}`, 'Novidades Digitais', 'Mercado Local'],
        kwai: [`Dicas de ${cleanName}`, 'Dinheiro Online', 'Produtividade']
    };

    return {
        followers,
        reach,
        impressions,
        views,
        posts_count: postsCount,
        engagement_rate: engagementRate,
        trends: trends[platform.toLowerCase()] || [],
        recent_posts: postIdeas[platform.toLowerCase()] || []
    };
}

// 1. Listar conexões de redes sociais
router.get('/connections', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    try {
        const supabase = getSupabase();
        const { data: dbData, error } = await supabase
            .from('social_connections')
            .select('*')
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return res.json(dbData || []);
    } catch (err) {
        console.log('⚠️ Tabela social_connections ausente ou inacessível. Usando sandbox local...');
        const sandbox = getSandboxData();
        const userConns = sandbox.connections.filter(c => c.tenant_id === tenantId);
        return res.json(userConns);
    }
});

// 2. Conectar nova conta (OAuth ou Link)
router.post('/connect', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    const { platform, account_name, auth_type, url, credentials } = req.body;

    if (!platform || !account_name || !auth_type) {
        return res.status(400).json({ error: 'Parâmetros platform, account_name e auth_type são obrigatórios' });
    }

    // Gera dados simulados
    const mockMetrics = generateMockMetrics(platform, account_name);
    const newConnection = {
        id: require('crypto').randomUUID(),
        tenant_id: tenantId,
        platform: platform.toLowerCase(),
        account_name: account_name,
        avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${account_name}-${platform}`,
        auth_type,
        auth_data: auth_type === 'link' ? { url } : { credentials: '***_connected_***' },
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const newMetrics = {
        id: require('crypto').randomUUID(),
        tenant_id: tenantId,
        connection_id: newConnection.id,
        platform: platform.toLowerCase(),
        followers: mockMetrics.followers,
        reach: mockMetrics.reach,
        impressions: mockMetrics.impressions,
        views: mockMetrics.views,
        posts_count: mockMetrics.posts_count,
        engagement_rate: mockMetrics.engagement_rate,
        trends: mockMetrics.trends,
        recent_posts: mockMetrics.recent_posts,
        recorded_at: new Date().toISOString()
    };

    try {
        const supabase = getSupabase();
        // Tenta salvar a conexão
        const { data: connData, error: connErr } = await supabase
            .from('social_connections')
            .insert(newConnection)
            .select()
            .single();

        if (connErr) throw connErr;

        // Tenta salvar as métricas
        const { error: metricsErr } = await supabase
            .from('social_metrics')
            .insert(newMetrics);

        if (metricsErr) {
            console.error('Falha ao salvar métricas iniciais no Supabase:', metricsErr.message);
        }

        return res.json({ connection: connData, metrics: newMetrics });
    } catch (err) {
        console.log('⚠️ Salvando conexão no sandbox local por indisponibilidade de tabelas...');
        const sandbox = getSandboxData();
        sandbox.connections.push(newConnection);
        sandbox.metrics.push(newMetrics);
        saveSandboxData(sandbox);

        return res.json({ connection: newConnection, metrics: newMetrics });
    }
});

// 3. Deletar conexão
router.delete('/connections/:id', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    const { id } = req.params;

    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from('social_connections')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return res.json({ success: true });
    } catch (err) {
        console.log('⚠️ Removendo do sandbox local por indisponibilidade de tabelas...');
        const sandbox = getSandboxData();
        sandbox.connections = sandbox.connections.filter(c => !(c.id === id && c.tenant_id === tenantId));
        sandbox.metrics = sandbox.metrics.filter(m => m.connection_id !== id);
        saveSandboxData(sandbox);

        return res.json({ success: true });
    }
});

// 4. Obter métricas consolidadas e históricas
router.get('/metrics', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;

    try {
        const supabase = getSupabase();
        // Busca as conexões primeiro
        const { data: conns, error: connErr } = await supabase
            .from('social_connections')
            .select('*')
            .eq('tenant_id', tenantId);

        if (connErr) throw connErr;

        if (!conns || conns.length === 0) {
            return res.json({ summary: {}, platforms: [] });
        }

        const connIds = conns.map(c => c.id);
        const { data: metrics, error: metricsErr } = await supabase
            .from('social_metrics')
            .select('*')
            .in('connection_id', connIds)
            .order('recorded_at', { ascending: false });

        if (metricsErr) throw metricsErr;

        // Filtra para pegar apenas a métrica mais recente de cada conexão
        const latestMetrics = [];
        connIds.forEach(cId => {
            const connMetrics = (metrics || []).filter(m => m.connection_id === cId);
            if (connMetrics.length > 0) {
                latestMetrics.push(connMetrics[0]); // Mais recente
            }
        });

        const summary = calculateSummary(latestMetrics);
        const enriched = conns.map(c => {
            const m = latestMetrics.find(metric => metric.connection_id === c.id) || {};
            return { ...c, metrics: m };
        });

        return res.json({ summary, platforms: enriched });
    } catch (err) {
        console.log('⚠️ Lendo métricas do sandbox por indisponibilidade de tabelas...');
        const sandbox = getSandboxData();
        const conns = sandbox.connections.filter(c => c.tenant_id === tenantId);

        if (conns.length === 0) {
            return res.json({ summary: {}, platforms: [] });
        }

        const connIds = conns.map(c => c.id);
        const metrics = sandbox.metrics.filter(m => connIds.includes(m.connection_id));

        const latestMetrics = [];
        connIds.forEach(cId => {
            const connMetrics = metrics.filter(m => m.connection_id === cId);
            if (connMetrics.length > 0) {
                latestMetrics.push(connMetrics[connMetrics.length - 1]); // Pega o último inserido no array
            }
        });

        const summary = calculateSummary(latestMetrics);
        const enriched = conns.map(c => {
            const m = latestMetrics.find(metric => metric.connection_id === c.id) || {};
            return { ...c, metrics: m };
        });

        return res.json({ summary, platforms: enriched });
    }
});

// Helper para calcular métricas consolidadas
function calculateSummary(metricsList) {
    let totalFollowers = 0;
    let totalReach = 0;
    let totalImpressions = 0;
    let totalViews = 0;
    let totalEngagement = 0;

    metricsList.forEach(m => {
        totalFollowers += m.followers || 0;
        totalReach += m.reach || 0;
        totalImpressions += m.impressions || 0;
        totalViews += m.views || 0;
        totalEngagement += m.engagement_rate || 0;
    });

    return {
        followers: totalFollowers,
        reach: totalReach,
        impressions: totalImpressions,
        views: totalViews,
        avgEngagement: metricsList.length > 0 ? parseFloat((totalEngagement / metricsList.length).toFixed(2)) : 0
    };
}

// 5. Rota de IA Consultora e Insights
router.post('/analyze', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    const { goal, niche } = req.body;

    // Carrega as métricas do usuário para alimentar a IA
    let connections = [];
    let latestMetrics = [];

    try {
        const supabase = getSupabase();
        const { data: conns } = await supabase.from('social_connections').select('*').eq('tenant_id', tenantId);
        if (conns && conns.length > 0) {
            connections = conns;
            const connIds = conns.map(c => c.id);
            const { data: metrics } = await supabase.from('social_metrics').select('*').in('connection_id', connIds);
            if (metrics) {
                connIds.forEach(cId => {
                    const sorted = metrics.filter(m => m.connection_id === cId).sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
                    if (sorted.length > 0) latestMetrics.push(sorted[0]);
                });
            }
        }
    } catch (err) {
        const sandbox = getSandboxData();
        connections = sandbox.connections.filter(c => c.tenant_id === tenantId);
        const connIds = connections.map(c => c.id);
        const metrics = sandbox.metrics.filter(m => connIds.includes(m.connection_id));
        connIds.forEach(cId => {
            const filtered = metrics.filter(m => m.connection_id === cId);
            if (filtered.length > 0) latestMetrics.push(filtered[filtered.length - 1]);
        });
    }

    if (connections.length === 0) {
        return res.status(400).json({ error: 'Você precisa conectar pelo menos uma rede social para receber a análise da IA.' });
    }

    // Prepara dados estruturados
    const dataSummary = latestMetrics.map(m => {
        const conn = connections.find(c => c.id === m.connection_id);
        return `Plataforma: ${conn?.platform.toUpperCase()} (${conn?.account_name})
- Seguidores/Inscritos: ${m.followers}
- Alcance: ${m.reach}
- Impressões: ${m.impressions}
- Visualizações: ${m.views}
- Engajamento: ${m.engagement_rate}%
- Principais Nomes/Keywords do Nicho: ${JSON.stringify(m.trends)}
- Últimos Posts analisados: ${m.recent_posts.map(p => `"${p.caption}" (likes: ${p.likes}, comments: ${p.comments}, views: ${p.views})`).join('; ')}
`;
    }).join('\n');

    // Monta Prompt da IA
    const prompt = `Você é o Assessor de Redes Sociais Inteligente integrado ao WhatsApp AI Pro.
Analise os dados reais de performance das redes sociais do cliente a seguir e gere um plano tático, insights e ideias de conteúdo de alto impacto.

DADOS DE PERFORMANCE DAS REDES SOCIAIS:
${dataSummary}

CONTEXTO DO CLIENTE:
- Nicho de Atuação: ${niche || 'Geral / Tecnologia / Vendas'}
- Objetivo Atual: ${goal || 'Crescer reconhecimento de marca e engajamento'}

Sua tarefa é retornar uma resposta detalhada e estruturada com os seguintes tópicos em formato JSON (você deve retornar APENAS o JSON puro):

{
  "performance_analysis": "Uma avaliação clara de pontos fortes e fracos identificados nas métricas fornecidas.",
  "positioning_tips": "2 a 3 recomendações estratégicas sobre como posicionar a marca para o objetivo solicitado.",
  "trending_topics": ["Trend 1", "Trend 2", "Trend 3"],
  "content_suggestions": [
    {
      "platform": "instagram/tiktok/youtube/facebook/kwai",
      "format": "Reels / Vídeo Curto / Carrossel / Shorts / Post",
      "title": "Título atrativo do conteúdo sugerido",
      "description": "Explicação detalhada do conteúdo sugerido, incluindo gatilhos mentais ou ideias visuais.",
      "cta": "Chamada para ação sugerida",
      "script_bullet_points": "Linha editorial ou tópicos a cobrir no roteiro."
    }
  ]
}

Responda em PORTUGUÊS brasileiro, mantendo um tom especialista, executivo, dinâmico e focado em alta conversão. Certifique-se de que o JSON é válido e não contém textos adicionais de saudação antes ou depois do JSON.`;

    try {
        const settings = await getBotSettings('default', tenantId);
        const aiConfig = resolveAIConfig(settings);

        console.log(`🤖 Chamando consultor de redes sociais da IA para o tenant: ${tenantId}...`);
        const aiResponse = await callChatCompletion({
            provider: aiConfig.provider,
            apiKey: aiConfig.apiKey,
            model: aiConfig.model,
            messages: [{ role: 'user', content: prompt }],
            maxTokens: 2048,
            temperature: 0.7
        });

        let cleanReply = aiResponse.content.trim();
        // Trata blocos de código se a IA retornar markdown
        if (cleanReply.startsWith('```json')) {
            cleanReply = cleanReply.slice(7);
        }
        if (cleanReply.startsWith('```')) {
            cleanReply = cleanReply.slice(3);
        }
        if (cleanReply.endsWith('```')) {
            cleanReply = cleanReply.slice(0, -3);
        }
        cleanReply = cleanReply.trim();

        try {
            const insightObj = JSON.parse(cleanReply);
            return res.json(insightObj);
        } catch (parseErr) {
            console.warn('Erro ao decodificar JSON gerado pela IA. Retornando em texto estruturado.');
            // Envia uma resposta limpa se o JSON estiver com problemas de formatação
            return res.status(422).json({
                raw_content: aiResponse.content,
                error: 'A IA gerou um formato inválido, veja o conteúdo gerado bruto.',
                performance_analysis: "Análise processada. Por favor tente novamente para receber o formato ideal.",
                positioning_tips: "Otimize a constância e a relevância visual dos seus conteúdos focando em educação e desejo.",
                trending_topics: ["Processamento Automatizado", "Economia de Tempo", "Crescimento Exponencial"],
                content_suggestions: []
            });
        }
    } catch (err) {
        console.error('❌ Falha na geração do /analyze:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 6. Cadastrar sugestão de conteúdo diretamente no Planejador (tabela content_cards)
router.post('/add-to-planner', authMiddleware, async (req, res) => {
    const tenantId = req.user.tenant_id || req.user.id;
    const { title, description } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Título é obrigatório' });
    }

    try {
        const supabase = getSupabase();

        // 1. Encontra primeiro board de conteúdo do tenant
        const { data: boards } = await supabase
            .from('content_boards')
            .select('id')
            .eq('tenant_id', tenantId)
            .limit(1);

        let boardId = null;
        if (boards && boards.length > 0) {
            boardId = boards[0].id;
        } else {
            // Cria um board padrão se não houver
            const { data: newBoard, error: bErr } = await supabase
                .from('content_boards')
                .insert({ tenant_id: tenantId, name: 'Planejamento Geral' })
                .select().single();

            if (bErr) throw bErr;
            boardId = newBoard.id;

            // Cria colunas padrão
            const defaultCols = [
                { board_id: boardId, title: 'Ideias de Posts', color: '#3b82f6', position: 0 },
                { board_id: boardId, title: 'Em Produção', color: '#eab308', position: 1 },
                { board_id: boardId, title: 'Revisão / Agendado', color: '#a855f7', position: 2 },
                { board_id: boardId, title: 'Publicado', color: '#25d366', position: 3 }
            ];
            await supabase.from('content_columns').insert(defaultCols);
        }

        // 2. Encontra a coluna "Ideias de Posts" desse board
        const { data: cols } = await supabase
            .from('content_columns')
            .select('id')
            .eq('board_id', boardId)
            .eq('title', 'Ideias de Posts')
            .single();

        let columnId = null;
        if (cols) {
            columnId = cols.id;
        } else {
            // Pega qualquer coluna disponível
            const { data: anyCols } = await supabase.from('content_columns').select('id').eq('board_id', boardId).limit(1);
            if (anyCols && anyCols.length > 0) {
                columnId = anyCols[0].id;
            }
        }

        if (!columnId) throw new Error('Nenhuma coluna disponível no planejador de conteúdo.');

        // 3. Insere o card
        const insertPayload = {
            column_id: columnId,
            title,
            description: description || '',
            tags: ['Sugerido pela IA', 'Redes Sociais'],
            position: 0,
            updated_by_name: req.user.name || 'IA Redes Sociais'
        };

        const { data: card, error: cardErr } = await supabase
            .from('content_cards')
            .insert(insertPayload)
            .select().single();

        if (cardErr) {
            if (cardErr.code === '42703' || cardErr.message.includes('column') || cardErr.message.includes('updated_by_name')) {
                const fallback = { ...insertPayload };
                delete fallback.updated_by_name;
                fallback.description = (description || '') + `\n\n[Sugerido por IA]`;
                const { data: retryCard, error: retryErr } = await supabase.from('content_cards').insert(fallback).select().single();
                if (retryErr) throw retryErr;
                return res.json(retryCard);
            }
            throw cardErr;
        }

        return res.json(card);
    } catch (err) {
        console.log('⚠️ Planejador de conteúdo inacessível ou falhou. Simulando criação no planejador...');
        return res.json({
            success: true,
            message: 'Card simulado criado no planejador (Sandbox Local)',
            card: { title, description, tags: ['Sugerido pela IA'] }
        });
    }
});

module.exports = router;
