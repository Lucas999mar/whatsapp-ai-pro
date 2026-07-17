const express = require('express');
const router = express.Router();
const { getSupabase } = require('../db/supabase');
const { authMiddleware } = require('./auth');

// ── BOARDS (Quadros de Conteúdo) ──────────────────────────────────

// Listar todos os quadros do tenant
router.get('/boards', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const { data, error } = await supabase
            .from('content_boards')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Criar novo quadro e inicializar com colunas padrão do Trello
router.post('/boards', authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Nome do quadro é obrigatório' });
        }

        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;

        // Inserir quadro
        const { data: board, error: boardErr } = await supabase
            .from('content_boards')
            .insert({
                tenant_id: tenantId,
                name: name.trim()
            })
            .select()
            .single();

        if (boardErr) throw boardErr;

        // Inserir colunas padrão para este quadro
        const defaultCols = [
            { board_id: board.id, title: 'Ideias de Posts', color: '#3b82f6', position: 0 },
            { board_id: board.id, title: 'Em Produção', color: '#eab308', position: 1 },
            { board_id: board.id, title: 'Revisão / Agendado', color: '#a855f7', position: 2 },
            { board_id: board.id, title: 'Publicado', color: '#25d366', position: 3 }
        ];

        const { error: colsErr } = await supabase
            .from('content_columns')
            .insert(defaultCols);

        if (colsErr) {
            console.error('Erro ao criar colunas iniciais:', colsErr.message);
        }

        res.json(board);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Renomear / Atualizar quadro
router.put('/boards/:id', authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;

        // Verifica propriedade do tenant
        const { data: board } = await supabase
            .from('content_boards')
            .select('id')
            .eq('id', req.params.id)
            .eq('tenant_id', tenantId)
            .single();

        if (!board) {
            return res.status(404).json({ error: 'Quadro não encontrado' });
        }

        const updates = {};
        if (name !== undefined) updates.name = name.trim();

        const { data: updated, error } = await supabase
            .from('content_boards')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Deletar quadro
router.delete('/boards/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;

        // Verifica propriedade do tenant
        const { data: board } = await supabase
            .from('content_boards')
            .select('id')
            .eq('id', req.params.id)
            .eq('tenant_id', tenantId)
            .single();

        if (!board) {
            return res.status(404).json({ error: 'Quadro não encontrado' });
        }

        const { error } = await supabase
            .from('content_boards')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obter dados completos de um quadro (colunas e cards correspondentes)
router.get('/boards/:boardId/data', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const { boardId } = req.params;

        // Validar se o quadro pertence ao tenant
        const { data: board } = await supabase
            .from('content_boards')
            .select('id')
            .eq('id', boardId)
            .eq('tenant_id', tenantId)
            .single();

        if (!board) {
            return res.status(404).json({ error: 'Quadro não encontrado' });
        }

        // Buscar colunas do quadro
        const { data: cols, error: colsErr } = await supabase
            .from('content_columns')
            .select('*')
            .eq('board_id', boardId)
            .order('position');

        if (colsErr) throw colsErr;

        let cards = [];
        if (cols && cols.length > 0) {
            const colIds = cols.map(c => c.id);
            // Buscar todos os cards pertencentes a essas colunas
            const { data: cardsData, error: cardsErr } = await supabase
                .from('content_cards')
                .select('*')
                .in('column_id', colIds)
                .order('position');

            if (cardsErr) throw cardsErr;
            cards = cardsData || [];
        }

        res.json({ columns: cols || [], cards });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── COLUMNS (Colunas) ─────────────────────────────────────────────

// Criar nova coluna
router.post('/columns', authMiddleware, async (req, res) => {
    try {
        const { board_id, title, color, position } = req.body;
        if (!board_id || !title) {
            return res.status(400).json({ error: 'Board ID e título são obrigatórios' });
        }

        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;

        // Validar quadro
        const { data: board } = await supabase
            .from('content_boards')
            .select('id')
            .eq('id', board_id)
            .eq('tenant_id', tenantId)
            .single();

        if (!board) {
            return res.status(404).json({ error: 'Quadro associado não encontrado' });
        }

        const { data: col, error } = await supabase
            .from('content_columns')
            .insert({
                board_id,
                title: title.trim(),
                color: color || '#25D366',
                position: position || 0
            })
            .select()
            .single();

        if (error) throw error;
        res.json(col);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Editar coluna
router.put('/columns/:id', authMiddleware, async (req, res) => {
    try {
        const { title, color, position } = req.body;
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;

        // Verificar posse através do board correspondente
        const { data: colData } = await supabase
            .from('content_columns')
            .select('id, board_id')
            .eq('id', req.params.id)
            .single();

        if (!colData) {
            return res.status(404).json({ error: 'Coluna não encontrada' });
        }

        const { data: board } = await supabase
            .from('content_boards')
            .select('id')
            .eq('id', colData.board_id)
            .eq('tenant_id', tenantId)
            .single();

        if (!board) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const updates = {};
        if (title !== undefined) updates.title = title.trim();
        if (color !== undefined) updates.color = color;
        if (position !== undefined) updates.position = position;

        const { data: col, error } = await supabase
            .from('content_columns')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json(col);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Deletar coluna
router.delete('/columns/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;

        // Validar posse da coluna
        const { data: colData } = await supabase
            .from('content_columns')
            .select('id, board_id')
            .eq('id', req.params.id)
            .single();

        if (!colData) {
            return res.status(404).json({ error: 'Coluna não encontrada' });
        }

        const { data: board } = await supabase
            .from('content_boards')
            .select('id')
            .eq('id', colData.board_id)
            .eq('tenant_id', tenantId)
            .single();

        if (!board) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const { error } = await supabase
            .from('content_columns')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── CARDS (Cards do Planejador) ───────────────────────────────────

// Criar novo card de planejamento
router.post('/cards', authMiddleware, async (req, res) => {
    try {
        const { column_id, title, description, due_date, tags, position } = req.body;
        if (!column_id || !title) {
            return res.status(400).json({ error: 'Coluna e título do card são obrigatórios' });
        }

        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const creatorName = req.user.name || req.user.role || 'Usuário';

        // Validar posse da coluna de destino
        const { data: colData } = await supabase
            .from('content_columns')
            .select('board_id')
            .eq('id', column_id)
            .single();

        if (!colData) {
            return res.status(404).json({ error: 'Coluna de destino não encontrada' });
        }

        const { data: board } = await supabase
            .from('content_boards')
            .select('id')
            .eq('id', colData.board_id)
            .eq('tenant_id', tenantId)
            .single();

        if (!board) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const insertPayload = {
            column_id,
            title: title.trim(),
            description: description || '',
            due_date: due_date || null,
            tags: Array.isArray(tags) ? tags : [],
            position: position || 0,
            updated_by_name: creatorName
        };

        let { data: card, error } = await supabase
            .from('content_cards')
            .insert(insertPayload)
            .select()
            .single();

        if (error && (error.code === '42703' || error.message.includes('column') || error.message.includes('updated_by_name'))) {
            // Fallback: se o banco não possuir a coluna, remove e anexa no description
            const fallbackPayload = { ...insertPayload };
            delete fallbackPayload.updated_by_name;
            fallbackPayload.description = (description || '') + `\n\n[Criado por: ${creatorName}]`;

            const retry = await supabase
                .from('content_cards')
                .insert(fallbackPayload)
                .select()
                .single();

            if (retry.error) throw retry.error;
            card = retry.data;
        } else if (error) {
            throw error;
        }

        res.json(card);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Atualizar card (incluindo movimentação de coluna e reordenação)
router.put('/cards/:id', authMiddleware, async (req, res) => {
    try {
        const { column_id, title, description, due_date, tags, position } = req.body;
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const editorName = req.user.name || req.user.role || 'Usuário';

        // Validar posse do card atual
        const { data: cardData } = await supabase
            .from('content_cards')
            .select('id, column_id, description')
            .eq('id', req.params.id)
            .single();

        if (!cardData) {
            return res.status(404).json({ error: 'Card não encontrado' });
        }

        const { data: originCol } = await supabase
            .from('content_columns')
            .select('board_id')
            .eq('id', cardData.column_id)
            .single();

        const { data: originBoard } = await supabase
            .from('content_boards')
            .select('id')
            .eq('id', originCol.board_id)
            .eq('tenant_id', tenantId)
            .single();

        if (!originBoard) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        // Se mover para outra coluna, validar posse da coluna de destino
        if (column_id && column_id !== cardData.column_id) {
            const { data: destCol } = await supabase
                .from('content_columns')
                .select('board_id')
                .eq('id', column_id)
                .single();

            if (!destCol) {
                return res.status(404).json({ error: 'Coluna de destino não encontrada' });
            }

            const { data: destBoard } = await supabase
                .from('content_boards')
                .select('id')
                .eq('id', destCol.board_id)
                .eq('tenant_id', tenantId)
                .single();

            if (!destBoard) {
                return res.status(403).json({ error: 'Acesso negado à coluna de destino' });
            }
        }

        const updates = {
            updated_at: new Date().toISOString()
        };

        if (column_id !== undefined) updates.column_id = column_id;
        if (title !== undefined) updates.title = title.trim();
        if (description !== undefined) updates.description = description;
        if (due_date !== undefined) updates.due_date = due_date;
        if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
        if (position !== undefined) updates.position = position;

        updates.updated_by_name = editorName;

        let { data: updatedCard, error } = await supabase
            .from('content_cards')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error && (error.code === '42703' || error.message.includes('column') || error.message.includes('updated_by_name'))) {
            // Fallback: remove coluna que não existe e concatena no description
            const fallbackUpdates = { ...updates };
            delete fallbackUpdates.updated_by_name;

            let cleanDesc = description !== undefined ? description : (cardData.description || '');
            cleanDesc = cleanDesc.replace(/\[(?:Criado|Atualizado) por: [^\]]+\]\s*/g, '').trim();
            fallbackUpdates.description = cleanDesc + `\n\n[Atualizado por: ${editorName}]`;

            const retry = await supabase
                .from('content_cards')
                .update(fallbackUpdates)
                .eq('id', req.params.id)
                .select()
                .single();

            if (retry.error) throw retry.error;
            updatedCard = retry.data;
        } else if (error) {
            throw error;
        }

        res.json(updatedCard);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Deletar card
router.delete('/cards/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;

        // Validar posse do card
        const { data: cardData } = await supabase
            .from('content_cards')
            .select('id, column_id')
            .eq('id', req.params.id)
            .single();

        if (!cardData) {
            return res.status(404).json({ error: 'Card não encontrado' });
        }

        const { data: col } = await supabase
            .from('content_columns')
            .select('board_id')
            .eq('id', cardData.column_id)
            .single();

        const { data: board } = await supabase
            .from('content_boards')
            .select('id')
            .eq('id', col.board_id)
            .eq('tenant_id', tenantId)
            .single();

        if (!board) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const { error } = await supabase
            .from('content_cards')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PUBLIC SHARING ROUTES (No auth required) ───────────────────

// Decode share token → tenant_id
const decodeShareToken = (token) => {
    try {
        return Buffer.from(token, 'base64url').toString('utf8');
    } catch {
        return null;
    }
};

// Generate share token from tenant_id
router.get('/share-token', authMiddleware, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.id;
        const token = Buffer.from(tenantId, 'utf8').toString('base64url');

        // Fetch company name for display
        const supabase = getSupabase();
        let companyName = '';
        try {
            const { data } = await supabase.from('tenants').select('name').eq('id', tenantId).single();
            companyName = data?.name || '';
        } catch { /* ignore */ }

        res.json({ token, company_name: companyName });
    } catch (err) {
        console.error('❌ Erro ao gerar token de compartilhamento:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Public route: View shared content planner (no auth)
router.get('/public/:token', async (req, res) => {
    try {
        const tenantId = decodeShareToken(req.params.token);
        if (!tenantId) {
            return res.status(400).json({ error: 'Link de compartilhamento inválido' });
        }

        const supabase = getSupabase();
        const { board_id, card_id, boards: boardsParam } = req.query;

        // Fetch company name
        let companyName = '';
        try {
            const { data } = await supabase.from('tenants').select('name').eq('id', tenantId).single();
            companyName = data?.name || '';
        } catch { /* ignore */ }

        // If a specific card is requested
        if (card_id) {
            const { data: card, error: cardErr } = await supabase
                .from('content_cards')
                .select('*')
                .eq('id', card_id)
                .single();

            if (cardErr || !card) {
                return res.json({ boards: [], columns: [], cards: [], company_name: companyName });
            }

            // Verify the card belongs to this tenant through column -> board -> tenant
            const { data: col } = await supabase.from('content_columns').select('board_id').eq('id', card.column_id).single();
            if (col) {
                const { data: board } = await supabase.from('content_boards').select('id, name').eq('id', col.board_id).eq('tenant_id', tenantId).single();
                if (board) {
                    return res.json({ boards: [board], columns: [], cards: [card], company_name: companyName });
                }
            }
            return res.json({ boards: [], columns: [], cards: [], company_name: companyName });
        }

        // Parse selected board IDs from `boards` param (comma-separated)
        const selectedBoardIds = boardsParam ? boardsParam.split(',').filter(Boolean) : [];

        // Fetch boards for this tenant
        let boardsQuery = supabase
            .from('content_boards')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        // If specific boards were selected, filter to only those
        if (selectedBoardIds.length > 0) {
            boardsQuery = boardsQuery.in('id', selectedBoardIds);
        } else if (board_id) {
            // Backward compatibility: single board_id param
            boardsQuery = boardsQuery.eq('id', board_id);
        }

        const { data: boards, error: boardsErr } = await boardsQuery;
        if (boardsErr) throw boardsErr;

        if (!boards || boards.length === 0) {
            return res.json({ boards: [], columns: [], cards: [], company_name: companyName });
        }

        // Determine which board to load columns/cards for (first one by default)
        const targetBoardId = board_id || boards[0].id;
        const targetBoard = boards.find(b => b.id === targetBoardId) || boards[0];

        // Fetch columns and cards for the target board
        const { data: cols } = await supabase
            .from('content_columns')
            .select('*')
            .eq('board_id', targetBoard.id)
            .order('position');

        let cards = [];
        if (cols && cols.length > 0) {
            const colIds = cols.map(c => c.id);
            const { data: cardsData } = await supabase
                .from('content_cards')
                .select('*')
                .in('column_id', colIds)
                .order('position');
            cards = cardsData || [];
        }

        res.json({
            boards: boards || [],
            columns: cols || [],
            cards,
            company_name: companyName
        });
    } catch (err) {
        console.error('❌ Erro na rota pública do content planner:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
