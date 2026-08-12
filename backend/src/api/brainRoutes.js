const express = require('express');
const { getSupabase } = require('../db/supabase');
const { resolveAIConfig, callChatCompletion } = require('../ai/pipeline');
const router = express.Router();

// Fallback em memória resiliente filtrado por tenant
let memoryNotes = [];
let memoryLinks = [];

// Helper para gerenciar banco ou memória
const getNotesTable = async (tenantId) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('brain_notes').select('*').eq('tenant_id', tenantId).order('updated_at', { ascending: false });
        if (error) throw error;
        return { data, isDb: true };
    } catch (e) {
        const filtered = memoryNotes.filter(n => n.tenant_id === tenantId);
        return { data: filtered, isDb: false };
    }
};

// ── GET: LISTAR NOTAS E LINKS ──
router.get('/', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.id;
        const { data: notes, isDb } = await getNotesTable(tenantId);

        let links = [];
        if (isDb) {
            const supabase = getSupabase();
            const { data: dbLinks } = await supabase.from('brain_links').select('*').eq('tenant_id', tenantId);
            links = dbLinks || [];
        } else {
            links = memoryLinks.filter(l => l.tenant_id === tenantId);
        }

        res.json({ notes, links });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST: SALVAR OU CRIAR NOTA (COM PARSING DE [[LINKS]] E KB SYNC) ──
router.post('/', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.id;
        const { id, title, content } = req.body;

        if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

        let isDb = true;
        let savedNote = null;
        const noteId = id || require('crypto').randomUUID();

        const notePayload = {
            id: noteId,
            tenant_id: tenantId,
            title: title.trim(),
            content: content || '',
            updated_at: new Date().toISOString()
        };

        try {
            const supabase = getSupabase();

            // Upsert na tabela de notas
            if (id) {
                const { data, error } = await supabase.from('brain_notes').update({
                    title: notePayload.title,
                    content: notePayload.content,
                    updated_at: notePayload.updated_at
                }).eq('id', id).eq('tenant_id', tenantId).select().single();
                if (error) throw error;
                savedNote = data;
            } else {
                notePayload.created_at = new Date().toISOString();
                const { data, error } = await supabase.from('brain_notes').insert(notePayload).select().single();
                if (error) throw error;
                savedNote = data;
            }
        } catch (e) {
            isDb = false;
            // Fallback em memória
            const idx = memoryNotes.findIndex(n => n.id === noteId && n.tenant_id === tenantId);
            if (idx !== -1) {
                memoryNotes[idx] = { ...memoryNotes[idx], ...notePayload };
                savedNote = memoryNotes[idx];
            } else {
                notePayload.created_at = new Date().toISOString();
                memoryNotes.push(notePayload);
                savedNote = notePayload;
            }
        }

        // 🔗 PARSER DE ENLACES BIDIRECIONAIS: [[Nome da Nota]]
        const linkRegex = /\[\[(.*?)\]\]/g;
        const linksFound = [];
        let match;
        while ((match = linkRegex.exec(notePayload.content)) !== null) {
            const targetTitle = match[1].trim();
            if (targetTitle && !linksFound.includes(targetTitle)) {
                linksFound.push(targetTitle);
            }
        }

        // Processa os links encontrados
        let finalLinks = [];
        if (linksFound.length > 0) {
            // Busca todas as notas do tenant para cruzar os ids pelos títulos
            let allNotes = [];
            if (isDb) {
                const { data } = await getSupabase().from('brain_notes').select('id, title').eq('tenant_id', tenantId);
                allNotes = data || [];
            } else {
                allNotes = memoryNotes.filter(n => n.tenant_id === tenantId);
            }

            // Identifica ou cria notas vazias referenciadas automaticamente se não existirem
            const createdLinks = [];
            for (const targetName of linksFound) {
                let targetNote = allNotes.find(n => n.title.toLowerCase() === targetName.toLowerCase());

                if (!targetNote) {
                    // Cria nota órfã inicial para fechar a conexão
                    const newOrphanId = require('crypto').randomUUID();
                    const orphanPayload = {
                        id: newOrphanId,
                        tenant_id: tenantId,
                        title: targetName,
                        content: `*Esta nota foi criada automaticamente por ser citada em [[${savedNote.title}]]. Escreva algo aqui.*`,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    if (isDb) {
                        try {
                            const { data } = await getSupabase().from('brain_notes').insert(orphanPayload).select().single();
                            if (data) targetNote = data;
                        } catch (err) { }
                    } else {
                        memoryNotes.push(orphanPayload);
                        targetNote = orphanPayload;
                    }
                }

                if (targetNote && targetNote.id !== savedNote.id) {
                    createdLinks.push({
                        id: require('crypto').randomUUID(),
                        tenant_id: tenantId,
                        source_note_id: savedNote.id,
                        target_note_id: targetNote.id,
                        created_at: new Date().toISOString()
                    });
                }
            }

            // Salva ou atualiza conexões
            if (isDb && createdLinks.length > 0) {
                const supabase = getSupabase();
                // Remove links antigos em que esta nota é a origem
                await supabase.from('brain_links').delete().eq('source_note_id', savedNote.id);
                // Insere novos
                await supabase.from('brain_links').insert(createdLinks);
                finalLinks = createdLinks;
            } else {
                // Fallback memória
                memoryLinks = memoryLinks.filter(l => !(l.source_note_id === savedNote.id && l.tenant_id === tenantId));
                memoryLinks.push(...createdLinks);
                finalLinks = createdLinks;
            }
        } else {
            // Se não tem links na nota atualizada, remove os links antigos onde ela é a origem
            if (isDb) {
                await getSupabase().from('brain_links').delete().eq('source_note_id', savedNote.id);
            } else {
                memoryLinks = memoryLinks.filter(l => !(l.source_note_id === savedNote.id && l.tenant_id === tenantId));
            }
        }

        // 🤖 SYNC VETORIAL DINÂMICO COM A BASE DE CONHECIMENTO
        // Desta forma, a IA do WhatsApp ganha acesso em tempo real a todas as anotações do Segundo Cérebro!
        try {
            const supabase = getSupabase();

            // Busca item anterior da KB correspondente a esta nota
            const { data: existingKb } = await supabase.from('knowledge_items')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('file_name', `brain_note_${savedNote.id}`)
                .single();

            const kbPayload = {
                title: `[Segundo Cérebro] ${savedNote.title}`,
                type: 'learning',
                content: savedNote.content,
                file_name: `brain_note_${savedNote.id}`,
                tenant_id: tenantId,
                agent_id: 'global',
                updated_at: new Date().toISOString()
            };

            if (existingKb) {
                await supabase.from('knowledge_items').update(kbPayload).eq('id', existingKb.id);
            } else {
                await supabase.from('knowledge_items').insert({
                    ...kbPayload,
                    created_at: new Date().toISOString()
                });
            }
        } catch (e) {
            // Falha silenciosa no sync de IA se a tabela da KB estiver sob manutenção ou for em memória
        }

        res.json({ note: savedNote, links: finalLinks });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST: IA CO-PILOTO (SUGESTÕES E INSIGHTS PARA A NOTA ATUAL) ──
router.post('/copilot', async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title) return res.status(400).json({ error: 'Título é necessário para acionar o co-piloto.' });

        // Instancia configuração do resolvedor de IA carregando as chaves configuradas pelo tenant/empresa
        const { getBotSettings } = require('../db/repository');
        const tenantId = req.user?.tenant_id || req.user?.id || 'default';
        const settings = await getBotSettings('default', tenantId);
        const aiConfig = resolveAIConfig(settings || {});

        const userPrompt = `Você é o Co-piloto de Notas do Segundo Cérebro. 
Estou escrevendo uma nota com o título: "${title}".
Aqui está o conteúdo atual dela:
"""
${content || '(início da nota)'}
"""

Analise o título e o conteúdo acima e forneça:
1. Um resumo curto e extremamente afiado da nota.
2. Três tópicos ou ideias complementares/sugestões de continuação para eu escrever.
3. Sugestão de tags relevantes para esta nota.

Escreva a resposta formatada em Markdown de forma muito enxuta e bonita.`;

        const aiRes = await callChatCompletion({
            provider: aiConfig.provider,
            apiKey: aiConfig.apiKey,
            model: aiConfig.model,
            messages: [{ role: 'user', content: userPrompt }],
            maxTokens: 600,
            temperature: 0.7
        });

        res.json({ suggestions: aiRes.content || 'Sem sugestões disponíveis no momento.' });
    } catch (err) {
        res.json({ suggestions: '⚠️ Não foi possível se conectar com o Co-piloto de IA no momento. Certifique-se de configurar sua chave API nas Configurações.' });
    }
});

// ── DELETE: EXCLUIR NOTA ──
router.delete('/:id', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.id;
        const noteId = req.params.id;

        try {
            const supabase = getSupabase();
            await supabase.from('brain_notes').delete().eq('id', noteId).eq('tenant_id', tenantId);
            // Remove da KB
            await supabase.from('knowledge_items').delete().eq('tenant_id', tenantId).eq('file_name', `brain_note_${noteId}`);
            res.json({ success: true });
        } catch (e) {
            // Fallback em memória
            memoryNotes = memoryNotes.filter(n => !(n.id === noteId && n.tenant_id === tenantId));
            memoryLinks = memoryLinks.filter(l => !(l.source_note_id === noteId || l.target_note_id === noteId));
            res.json({ success: true, warning: 'Removido em memória de fallback.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Multer & Parsers para Documentos Prontos (PDF, DOCX, TXT)
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 } // limite de 15MB
});

// ── POST: UPLOAD DE ARQUIVOS PRONTOS (PDF, DOCX, TXT, MD) PARA CRIAR NOTAS ──
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.id;
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

        const originalName = file.originalname;
        const extension = originalName.split('.').pop().toLowerCase();

        // Limpa o título da nota a partir do nome original do arquivo
        let noteTitle = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
        noteTitle = noteTitle.replace(/[-_]/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase()); // Capitaliza palavras e remove underscores/hifens

        let extractedText = '';

        if (extension === 'pdf') {
            const data = await pdfParse(file.buffer);
            extractedText = data.text || '';
        } else if (extension === 'docx') {
            const data = await mammoth.extractRawText({ buffer: file.buffer });
            extractedText = data.value || '';
        } else if (['txt', 'md', 'markdown'].includes(extension)) {
            extractedText = file.buffer.toString('utf8');
        } else {
            return res.status(400).json({ error: 'Formato de arquivo não suportado. Envie PDF, DOCX (Word), TXT ou Markdown.' });
        }

        if (!extractedText.trim()) {
            return res.status(400).json({ error: 'Não foi possível extrair nenhum texto legível do arquivo enviado.' });
        }

        // Salva a nota no Cérebro (lógica equivalente a salvar nota)
        const noteId = require('crypto').randomUUID();
        const notePayload = {
            id: noteId,
            tenant_id: tenantId,
            title: noteTitle,
            content: `# ${noteTitle}\n\n${extractedText}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        let isDb = true;
        let savedNote = null;

        try {
            const supabase = getSupabase();
            const { data, error } = await supabase.from('brain_notes').insert(notePayload).select().single();
            if (error) throw error;
            savedNote = data;
        } catch (e) {
            isDb = false;
            // Fallback em memória
            memoryNotes.push(notePayload);
            savedNote = notePayload;
        }

        // 🔗 PARSER DE LINKS BIDIRECIONAIS
        const linkRegex = /\[\[(.*?)\]\]/g;
        const linksFound = [];
        let match;
        while ((match = linkRegex.exec(notePayload.content)) !== null) {
            const targetTitle = match[1].trim();
            if (targetTitle && !linksFound.includes(targetTitle)) {
                linksFound.push(targetTitle);
            }
        }

        if (linksFound.length > 0) {
            let allNotes = [];
            if (isDb) {
                const { data } = await getSupabase().from('brain_notes').select('id, title').eq('tenant_id', tenantId);
                allNotes = data || [];
            } else {
                allNotes = memoryNotes.filter(n => n.tenant_id === tenantId);
            }

            const createdLinks = [];
            for (const targetTitle of linksFound) {
                let targetNote = allNotes.find(n => n.title.toLowerCase() === targetTitle.toLowerCase());
                if (!targetNote) {
                    // Cria uma nota vazia de referência
                    const emptyId = require('crypto').randomUUID();
                    const emptyPayload = {
                        id: emptyId,
                        tenant_id: tenantId,
                        title: targetTitle,
                        content: `# ${targetTitle}\n\nNota criada automaticamente por referência na nota [[${noteTitle}]].`,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    if (isDb) {
                        try {
                            const { data } = await getSupabase().from('brain_notes').insert(emptyPayload).select().single();
                            if (data) targetNote = data;
                        } catch (err) {
                            console.error(err);
                        }
                    } else {
                        memoryNotes.push(emptyPayload);
                        targetNote = emptyPayload;
                    }
                }

                if (targetNote) {
                    const linkPayload = {
                        id: require('crypto').randomUUID(),
                        tenant_id: tenantId,
                        source_note_id: noteId,
                        target_note_id: targetNote.id
                    };
                    createdLinks.push(linkPayload);
                }
            }

            if (createdLinks.length > 0) {
                if (isDb) {
                    try {
                        await getSupabase().from('brain_links').insert(createdLinks);
                    } catch (e) {
                        console.error('Erro ao salvar links:', e);
                    }
                } else {
                    memoryLinks.push(...createdLinks);
                }
            }
        }

        // 🧠 VECTOR SYNC & SYNC KNOWLEDGE BASE (para o RAG)
        if (isDb) {
            try {
                // Vectoriza conteúdo para RAG
                const apiKey = process.env.OPENAI_API_KEY || ''; // Chave global fallback
                let embedding = null;

                if (apiKey) {
                    const { OpenAI } = require('openai');
                    const openai = new OpenAI({ apiKey });
                    const embRes = await openai.embeddings.create({
                        model: 'text-embedding-3-small',
                        input: notePayload.content
                    });
                    embedding = embRes.data[0].embedding;
                }

                const supabase = getSupabase();
                // Upsert na tabela de itens de conhecimento do tenant
                const kbPayload = {
                    tenant_id: tenantId,
                    type: 'obsidian',
                    content: notePayload.content,
                    title: `[Segundo Cérebro] ${noteTitle}`,
                    file_name: `brain_note_${noteId}`,
                    embedding: embedding
                };

                // Verifica se já existia na KB
                const { data: existingKB } = await supabase.from('knowledge_items').select('id').eq('tenant_id', tenantId).eq('file_name', `brain_note_${noteId}`).maybeSingle();

                if (existingKB) {
                    await supabase.from('knowledge_items').update(kbPayload).eq('id', existingKB.id);
                } else {
                    kbPayload.created_at = new Date().toISOString();
                    await supabase.from('knowledge_items').insert(kbPayload);
                }
            } catch (err) {
                console.error('Erro ao vetorizar/indexar nota na KB:', err);
            }
        }

        // Busca lista de notas e links atualizados do tenant
        const { data: freshNotes } = await getNotesTable(tenantId);
        let freshLinks = [];
        if (isDb) {
            const { data: dbLinks } = await getSupabase().from('brain_links').select('*').eq('tenant_id', tenantId);
            freshLinks = dbLinks || [];
        } else {
            freshLinks = memoryLinks.filter(l => l.tenant_id === tenantId);
        }

        res.json({
            success: true,
            note: savedNote,
            notes: freshNotes,
            links: freshLinks
        });

    } catch (err) {
        console.error('Erro no upload do cérebro:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
