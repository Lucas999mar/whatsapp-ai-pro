/**
 * ══════════════════════════════════════════════════════════════
 *  WEB SEARCH TOOL - Busca na internet via DuckDuckGo API
 *  Não requer API key — usa o endpoint público do DuckDuckGo Instant Answers.
 * ══════════════════════════════════════════════════════════════
 */

/**
 * Faz uma busca na web usando DuckDuckGo Instant Answers API
 */
async function search(args, context) {
    const { query } = args;

    if (!query) {
        throw new Error('O campo "query" é obrigatório para busca na web.');
    }

    try {
        // DuckDuckGo Instant Answer API (sem key necessária)
        const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

        const response = await fetch(url, {
            headers: { 'User-Agent': 'WhatsAppAIPro/1.0' },
            signal: AbortSignal.timeout(10000),
        });

        const data = await response.json();

        const results = [];

        // Abstract (resposta principal)
        if (data.Abstract) {
            results.push(`📝 Resumo: ${data.Abstract}`);
            if (data.AbstractURL) results.push(`   Fonte: ${data.AbstractURL}`);
        }

        // Answer (resposta direta)
        if (data.Answer) {
            results.push(`💡 Resposta: ${data.Answer}`);
        }

        // Related Topics (tópicos relacionados)
        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            const topics = data.RelatedTopics
                .filter(t => t.Text)
                .slice(0, 5)
                .map((t, i) => `${i + 1}. ${t.Text.substring(0, 200)}`);

            if (topics.length > 0) {
                results.push(`\n🔗 Resultados Relacionados:\n${topics.join('\n')}`);
            }
        }

        if (results.length === 0) {
            return `Não encontrei resultados diretos para "${query}". Tente reformular a busca com termos mais específicos.`;
        }

        return `Resultados da busca por "${query}":\n\n${results.join('\n')}`;

    } catch (err) {
        // Fallback: retorna que não conseguiu buscar mas com contexto
        return `Não foi possível completar a busca por "${query}" no momento. Erro: ${err.message}. Tente usar outra ferramenta ou fornecer as informações manualmente.`;
    }
}

module.exports = { search };
