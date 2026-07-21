const express = require('express');
const { getSupabase } = require('../db/supabase');
const { authMiddleware } = require('./auth');

const router = express.Router();

// ── TEMPLATES DE MAPA MENTAL ──────────────────────────────────
const MINDMAP_TEMPLATES = {
    blank: {
        name: 'Mapa em Branco',
        description: 'Comece do zero com um nó central',
        icon: '🧠',
        nodes: [
            { id: 'root', text: 'Ideia Central', x: 400, y: 300, color: '#25D366', size: 'lg', shape: 'rounded' }
        ],
        edges: []
    },
    brainstorming: {
        name: 'Brainstorming',
        description: 'Organize ideias em categorias',
        icon: '💡',
        nodes: [
            { id: 'root', text: 'Tema Principal', x: 400, y: 300, color: '#25D366', size: 'lg', shape: 'rounded' },
            { id: 'cat1', text: '💡 Ideias', x: 150, y: 150, color: '#F59E0B', size: 'md', shape: 'rounded' },
            { id: 'cat2', text: '🎯 Objetivos', x: 650, y: 150, color: '#3B82F6', size: 'md', shape: 'rounded' },
            { id: 'cat3', text: '⚡ Ações', x: 150, y: 450, color: '#EF4444', size: 'md', shape: 'rounded' },
            { id: 'cat4', text: '📊 Métricas', x: 650, y: 450, color: '#8B5CF6', size: 'md', shape: 'rounded' },
            { id: 'idea1', text: 'Ideia 1', x: 50, y: 80, color: '#FBBF24', size: 'sm', shape: 'pill' },
            { id: 'idea2', text: 'Ideia 2', x: 250, y: 60, color: '#FBBF24', size: 'sm', shape: 'pill' },
            { id: 'obj1', text: 'Objetivo 1', x: 550, y: 80, color: '#60A5FA', size: 'sm', shape: 'pill' },
            { id: 'obj2', text: 'Objetivo 2', x: 750, y: 60, color: '#60A5FA', size: 'sm', shape: 'pill' },
            { id: 'act1', text: 'Ação 1', x: 50, y: 520, color: '#F87171', size: 'sm', shape: 'pill' },
            { id: 'act2', text: 'Ação 2', x: 250, y: 540, color: '#F87171', size: 'sm', shape: 'pill' },
            { id: 'met1', text: 'KPI 1', x: 550, y: 520, color: '#A78BFA', size: 'sm', shape: 'pill' },
            { id: 'met2', text: 'KPI 2', x: 750, y: 540, color: '#A78BFA', size: 'sm', shape: 'pill' },
        ],
        edges: [
            { from: 'root', to: 'cat1' }, { from: 'root', to: 'cat2' },
            { from: 'root', to: 'cat3' }, { from: 'root', to: 'cat4' },
            { from: 'cat1', to: 'idea1' }, { from: 'cat1', to: 'idea2' },
            { from: 'cat2', to: 'obj1' }, { from: 'cat2', to: 'obj2' },
            { from: 'cat3', to: 'act1' }, { from: 'cat3', to: 'act2' },
            { from: 'cat4', to: 'met1' }, { from: 'cat4', to: 'met2' },
        ]
    },
    flowchart: {
        name: 'Fluxograma',
        description: 'Diagrama de processos e decisões',
        icon: '🔄',
        nodes: [
            { id: 'start', text: '▶ Início', x: 400, y: 50, color: '#25D366', size: 'md', shape: 'pill' },
            { id: 'step1', text: 'Etapa 1', x: 400, y: 170, color: '#3B82F6', size: 'md', shape: 'rounded' },
            { id: 'decision', text: '◇ Decisão?', x: 400, y: 300, color: '#F59E0B', size: 'md', shape: 'diamond' },
            { id: 'yes', text: '✅ Sim', x: 200, y: 430, color: '#25D366', size: 'md', shape: 'rounded' },
            { id: 'no', text: '❌ Não', x: 600, y: 430, color: '#EF4444', size: 'md', shape: 'rounded' },
            { id: 'end', text: '⏹ Fim', x: 400, y: 550, color: '#6B7280', size: 'md', shape: 'pill' },
        ],
        edges: [
            { from: 'start', to: 'step1', label: '' },
            { from: 'step1', to: 'decision', label: '' },
            { from: 'decision', to: 'yes', label: 'Sim' },
            { from: 'decision', to: 'no', label: 'Não' },
            { from: 'yes', to: 'end', label: '' },
            { from: 'no', to: 'end', label: '' },
        ]
    },
    retrospective: {
        name: 'Retrospectiva de Equipe',
        description: 'O que foi bem, o que melhorar e ações',
        icon: '🔍',
        nodes: [
            { id: 'root', text: '🔍 Sprint Retrospectiva', x: 400, y: 50, color: '#8B5CF6', size: 'lg', shape: 'rounded' },
            { id: 'good', text: '😊 O que foi BEM', x: 130, y: 200, color: '#25D366', size: 'md', shape: 'rounded' },
            { id: 'improve', text: '🔧 O que MELHORAR', x: 400, y: 200, color: '#F59E0B', size: 'md', shape: 'rounded' },
            { id: 'action', text: '🚀 AÇÕES', x: 670, y: 200, color: '#3B82F6', size: 'md', shape: 'rounded' },
            { id: 'g1', text: 'Ponto positivo 1', x: 50, y: 340, color: '#34D399', size: 'sm', shape: 'pill' },
            { id: 'g2', text: 'Ponto positivo 2', x: 210, y: 340, color: '#34D399', size: 'sm', shape: 'pill' },
            { id: 'i1', text: 'Ponto a melhorar 1', x: 320, y: 340, color: '#FBBF24', size: 'sm', shape: 'pill' },
            { id: 'i2', text: 'Ponto a melhorar 2', x: 480, y: 340, color: '#FBBF24', size: 'sm', shape: 'pill' },
            { id: 'a1', text: 'Ação concreta 1', x: 590, y: 340, color: '#60A5FA', size: 'sm', shape: 'pill' },
            { id: 'a2', text: 'Ação concreta 2', x: 750, y: 340, color: '#60A5FA', size: 'sm', shape: 'pill' },
        ],
        edges: [
            { from: 'root', to: 'good' }, { from: 'root', to: 'improve' }, { from: 'root', to: 'action' },
            { from: 'good', to: 'g1' }, { from: 'good', to: 'g2' },
            { from: 'improve', to: 'i1' }, { from: 'improve', to: 'i2' },
            { from: 'action', to: 'a1' }, { from: 'action', to: 'a2' },
        ]
    },
    swot: {
        name: 'Análise SWOT',
        description: 'Forças, Fraquezas, Oportunidades e Ameaças',
        icon: '📊',
        nodes: [
            { id: 'root', text: '📊 Análise SWOT', x: 400, y: 300, color: '#8B5CF6', size: 'lg', shape: 'rounded' },
            { id: 's', text: '💪 Forças', x: 150, y: 120, color: '#25D366', size: 'md', shape: 'rounded' },
            { id: 'w', text: '⚠️ Fraquezas', x: 650, y: 120, color: '#EF4444', size: 'md', shape: 'rounded' },
            { id: 'o', text: '🌟 Oportunidades', x: 150, y: 480, color: '#3B82F6', size: 'md', shape: 'rounded' },
            { id: 't', text: '🔥 Ameaças', x: 650, y: 480, color: '#F59E0B', size: 'md', shape: 'rounded' },
            { id: 's1', text: 'Força 1', x: 50, y: 50, color: '#34D399', size: 'sm', shape: 'pill' },
            { id: 's2', text: 'Força 2', x: 250, y: 50, color: '#34D399', size: 'sm', shape: 'pill' },
            { id: 'w1', text: 'Fraqueza 1', x: 550, y: 50, color: '#F87171', size: 'sm', shape: 'pill' },
            { id: 'w2', text: 'Fraqueza 2', x: 750, y: 50, color: '#F87171', size: 'sm', shape: 'pill' },
            { id: 'o1', text: 'Oportunidade 1', x: 50, y: 550, color: '#60A5FA', size: 'sm', shape: 'pill' },
            { id: 'o2', text: 'Oportunidade 2', x: 250, y: 550, color: '#60A5FA', size: 'sm', shape: 'pill' },
            { id: 't1', text: 'Ameaça 1', x: 550, y: 550, color: '#FBBF24', size: 'sm', shape: 'pill' },
            { id: 't2', text: 'Ameaça 2', x: 750, y: 550, color: '#FBBF24', size: 'sm', shape: 'pill' },
        ],
        edges: [
            { from: 'root', to: 's' }, { from: 'root', to: 'w' },
            { from: 'root', to: 'o' }, { from: 'root', to: 't' },
            { from: 's', to: 's1' }, { from: 's', to: 's2' },
            { from: 'w', to: 'w1' }, { from: 'w', to: 'w2' },
            { from: 'o', to: 'o1' }, { from: 'o', to: 'o2' },
            { from: 't', to: 't1' }, { from: 't', to: 't2' },
        ]
    },
    projectPlan: {
        name: 'Planejamento de Projeto',
        description: 'Fases, tarefas e entregáveis',
        icon: '📋',
        nodes: [
            { id: 'root', text: '📋 Projeto', x: 400, y: 50, color: '#8B5CF6', size: 'lg', shape: 'rounded' },
            { id: 'phase1', text: '1️⃣ Planejamento', x: 130, y: 180, color: '#3B82F6', size: 'md', shape: 'rounded' },
            { id: 'phase2', text: '2️⃣ Execução', x: 400, y: 180, color: '#F59E0B', size: 'md', shape: 'rounded' },
            { id: 'phase3', text: '3️⃣ Entrega', x: 670, y: 180, color: '#25D366', size: 'md', shape: 'rounded' },
            { id: 'p1t1', text: 'Escopo', x: 50, y: 310, color: '#60A5FA', size: 'sm', shape: 'pill' },
            { id: 'p1t2', text: 'Cronograma', x: 210, y: 310, color: '#60A5FA', size: 'sm', shape: 'pill' },
            { id: 'p2t1', text: 'Desenvolvimento', x: 320, y: 310, color: '#FBBF24', size: 'sm', shape: 'pill' },
            { id: 'p2t2', text: 'Testes', x: 480, y: 310, color: '#FBBF24', size: 'sm', shape: 'pill' },
            { id: 'p3t1', text: 'Deploy', x: 590, y: 310, color: '#34D399', size: 'sm', shape: 'pill' },
            { id: 'p3t2', text: 'Feedback', x: 750, y: 310, color: '#34D399', size: 'sm', shape: 'pill' },
        ],
        edges: [
            { from: 'root', to: 'phase1' }, { from: 'root', to: 'phase2' }, { from: 'root', to: 'phase3' },
            { from: 'phase1', to: 'p1t1' }, { from: 'phase1', to: 'p1t2' },
            { from: 'phase2', to: 'p2t1' }, { from: 'phase2', to: 'p2t2' },
            { from: 'phase3', to: 'p3t1' }, { from: 'phase3', to: 'p3t2' },
        ]
    },
    userJourney: {
        name: 'Jornada do Usuário',
        description: 'Mapeie a experiência do cliente',
        icon: '🗺️',
        nodes: [
            { id: 'root', text: '🗺️ Jornada do Cliente', x: 400, y: 50, color: '#8B5CF6', size: 'lg', shape: 'rounded' },
            { id: 'discover', text: '🔍 Descoberta', x: 100, y: 200, color: '#3B82F6', size: 'md', shape: 'rounded' },
            { id: 'consider', text: '🤔 Consideração', x: 280, y: 200, color: '#F59E0B', size: 'md', shape: 'rounded' },
            { id: 'purchase', text: '💳 Compra', x: 460, y: 200, color: '#25D366', size: 'md', shape: 'rounded' },
            { id: 'retain', text: '🤝 Retenção', x: 640, y: 200, color: '#EF4444', size: 'md', shape: 'rounded' },
            { id: 'd1', text: 'Redes sociais', x: 40, y: 340, color: '#60A5FA', size: 'sm', shape: 'pill' },
            { id: 'd2', text: 'Indicação', x: 160, y: 340, color: '#60A5FA', size: 'sm', shape: 'pill' },
            { id: 'c1', text: 'Comparação', x: 220, y: 340, color: '#FBBF24', size: 'sm', shape: 'pill' },
            { id: 'c2', text: 'Free trial', x: 340, y: 340, color: '#FBBF24', size: 'sm', shape: 'pill' },
            { id: 'p1', text: 'Checkout', x: 400, y: 340, color: '#34D399', size: 'sm', shape: 'pill' },
            { id: 'p2', text: 'Onboarding', x: 520, y: 340, color: '#34D399', size: 'sm', shape: 'pill' },
            { id: 'r1', text: 'Suporte', x: 580, y: 340, color: '#F87171', size: 'sm', shape: 'pill' },
            { id: 'r2', text: 'Upsell', x: 700, y: 340, color: '#F87171', size: 'sm', shape: 'pill' },
        ],
        edges: [
            { from: 'root', to: 'discover' }, { from: 'root', to: 'consider' },
            { from: 'root', to: 'purchase' }, { from: 'root', to: 'retain' },
            { from: 'discover', to: 'd1' }, { from: 'discover', to: 'd2' },
            { from: 'consider', to: 'c1' }, { from: 'consider', to: 'c2' },
            { from: 'purchase', to: 'p1' }, { from: 'purchase', to: 'p2' },
            { from: 'retain', to: 'r1' }, { from: 'retain', to: 'r2' },
        ]
    }
};

// ── LISTAR TEMPLATES DISPONÍVEIS ────────────────────────────
router.get('/meta/templates', authMiddleware, async (req, res) => {
    const templates = Object.entries(MINDMAP_TEMPLATES).map(([key, val]) => ({
        id: key,
        name: val.name,
        description: val.description,
        icon: val.icon,
        nodeCount: val.nodes.length,
        edgeCount: val.edges.length
    }));
    res.json(templates);
});

// ── LISTAR MAPAS DO TENANT ──────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;

        const { data, error } = await supabase
            .from('mindmaps')
            .select('id, title, description, template, thumbnail_color, updated_at, created_at')
            .eq('tenant_id', tenantId)
            .order('updated_at', { ascending: false });

        if (error) {
            // Se a tabela não existe, retorna vazio
            if (error.code === '42P01') return res.json([]);
            throw error;
        }

        res.json(data || []);
    } catch (err) {
        console.error('❌ Erro ao listar mindmaps:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── BUSCAR MAPA POR ID ──────────────────────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;

        const { data, error } = await supabase
            .from('mindmaps')
            .select('*')
            .eq('id', req.params.id)
            .eq('tenant_id', tenantId)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Mapa não encontrado' });

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── CRIAR NOVO MAPA ────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const { title, description, template } = req.body;

        // Usa template ou mapa em branco
        const templateData = MINDMAP_TEMPLATES[template] || MINDMAP_TEMPLATES.blank;
        const colors = ['#25D366', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const newMap = {
            tenant_id: tenantId,
            title: title || templateData.name,
            description: description || templateData.description,
            template: template || 'blank',
            nodes: JSON.stringify(templateData.nodes),
            edges: JSON.stringify(templateData.edges),
            thumbnail_color: randomColor,
            created_by: req.user.id,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('mindmaps')
            .insert(newMap)
            .select()
            .single();

        if (error) throw error;

        // Parse nodes/edges de volta
        data.nodes = JSON.parse(data.nodes);
        data.edges = JSON.parse(data.edges);

        res.json(data);
    } catch (err) {
        console.error('❌ Erro ao criar mindmap:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── ATUALIZAR MAPA ──────────────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const { title, description, nodes, edges } = req.body;

        const updateData = {
            updated_at: new Date().toISOString()
        };

        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (nodes !== undefined) updateData.nodes = JSON.stringify(nodes);
        if (edges !== undefined) updateData.edges = JSON.stringify(edges);

        const { data, error } = await supabase
            .from('mindmaps')
            .update(updateData)
            .eq('id', req.params.id)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error) throw error;

        // Parse nodes/edges de volta
        if (data.nodes) data.nodes = JSON.parse(data.nodes);
        if (data.edges) data.edges = JSON.parse(data.edges);

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── DELETAR MAPA ────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;

        const { error } = await supabase
            .from('mindmaps')
            .delete()
            .eq('id', req.params.id)
            .eq('tenant_id', tenantId);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
