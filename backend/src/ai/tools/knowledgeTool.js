/**
 * ══════════════════════════════════════════════════════════════
 *  KNOWLEDGE BASE TOOL - Busca na base de conhecimento interna
 *  Reutiliza o searchKnowledge existente em repository.js
 * ══════════════════════════════════════════════════════════════
 */

/**
 * Busca na base de conhecimento
 */
async function search(args, context) {
    const { query } = args;

    if (!query) {
        throw new Error('O campo "query" é obrigatório para busca na base de conhecimento.');
    }

    const { searchKnowledge } = require('../../db/repository');

    const results = await searchKnowledge(
        query,
        5,
        context.agentId || 'global',
        context.tenantId || 'default'
    );

    if (!results || results.length === 0) {
        return `Nenhum documento relevante encontrado na base de conhecimento para "${query}".`;
    }

    const formatted = results.map((item, i) => {
        const score = item.score ? ` (${(item.score * 100).toFixed(0)}% relevância)` : '';
        const content = typeof item.content === 'string'
            ? item.content.substring(0, 300)
            : JSON.stringify(item.content).substring(0, 300);
        return `${i + 1}. 📄 ${item.title || 'Sem título'}${score}\n   ${content}...`;
    });

    return `Encontrados ${results.length} resultado(s) na base de conhecimento:\n\n${formatted.join('\n\n')}`;
}

module.exports = { search };
