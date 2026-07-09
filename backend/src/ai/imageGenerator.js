const OpenAI = require('openai');
const config = require('../config/config');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * AI Designer - Gerador de Imagens inteligente
 * Suporta: text-to-image, image-to-image (edição/variação)
 */

const STYLE_PRESETS = {
    realistic: 'Fotografia ultra-realista, resolução 8K, iluminação cinematográfica, detalhes extremos, profundidade de campo, cores naturais vibrantes',
    '3d': 'Renderização 3D profissional, iluminação de estúdio, materiais PBR realistas, raytracing, sombras suaves, octane render quality',
    digital_art: 'Arte digital profissional, pintura digital detalhada, conceito artístico de alta qualidade, cores vibrantes, composição cinematográfica',
    anime: 'Estilo anime japonês premium, traços limpos, cores vibrantes, iluminação dramática, qualidade de longa-metragem de animação',
    logo: 'Design de logo profissional e minimalista, vetorial, fundo limpo, tipografia elegante, identidade visual corporativa premium',
    poster: 'Poster cinematográfico de alta qualidade, composição dramática, tipografia impactante, gradientes ricos, design editorial premium',
    watercolor: 'Pintura em aquarela artística, tintas fluidas, texturas orgânicas, paleta de cores harmoniosa, estilo fine art',
    cyberpunk: 'Estilo cyberpunk futurístico, neon brilhante, cidade noturna, alta tecnologia, atmosfera noir sci-fi, reflexos molhados',
    minimalist: 'Design minimalista limpo, espaço negativo, paleta reduzida, tipografia moderna, composição equilibrada e elegante',
    comic: 'Estilo de história em quadrinhos/comic book, traços bold, cores chapadas vibrantes, sombreamento dramático, estilo Marvel/DC',
    product: 'Fotografia de produto profissional, fundo branco/limpo, iluminação de estúdio, detalhes precisos, qualidade e-commerce premium',
    fashion: 'Fotografia de moda editorial, iluminação de estúdio, pose elegante, cenário minimalista, estilo Vogue/Harper\'s Bazaar',
    fantasy: 'Arte fantasia épica, paisagens mágicas, iluminação etérea, detalhes intrincados, qualidade de concept art AAA',
    vintage: 'Estética vintage/retrô, tons sépia, textura de filme antigo, granulação sutil, paleta desaturada, nostálgico',
};

/**
 * Constrói o prompt enriquecido com estilo e instruções de qualidade
 */
function buildEnhancedPrompt(userPrompt, style = 'realistic', customInstructions = '') {
    const styleDesc = STYLE_PRESETS[style] || STYLE_PRESETS.realistic;

    let enhancedPrompt = `${userPrompt}

Estilo visual: ${styleDesc}`;

    if (customInstructions) {
        enhancedPrompt += `\n\nInstruções adicionais: ${customInstructions}`;
    }

    enhancedPrompt += `\n\nIMPORTANTE: Gere a imagem com a mais alta qualidade possível. Sem marcas d'água, sem texto sobreposto, sem artefatos visuais.`;

    return enhancedPrompt;
}

/**
 * Gera imagem via OpenAI (DALL-E 3 / gpt-image-1)
 */
async function generateImage({ prompt, style = 'realistic', size = '1024x1024', quality = 'high', customInstructions = '', apiKey = null }) {
    try {
        const key = apiKey || config.openai.apiKey;
        if (!key) throw new Error('Chave da API OpenAI não configurada. Configure em Configurações > API Keys.');

        const client = new OpenAI({ apiKey: key });
        const enhancedPrompt = buildEnhancedPrompt(prompt, style, customInstructions);

        console.log(`🎨 [AI Designer] Gerando imagem...`);
        console.log(`   📝 Prompt: ${prompt.substring(0, 80)}...`);
        console.log(`   🎭 Estilo: ${style}`);
        console.log(`   📐 Tamanho: ${size}`);

        // Use gpt-image-1 for best quality (falls back to dall-e-3)
        let response;
        try {
            response = await client.images.generate({
                model: 'gpt-image-1',
                prompt: enhancedPrompt,
                n: 1,
                size: size,
                quality: quality,
            });
        } catch (modelErr) {
            // Fallback to dall-e-3 if gpt-image-1 not available
            console.log('   ⚠️ gpt-image-1 indisponível, usando dall-e-3...');
            response = await client.images.generate({
                model: 'dall-e-3',
                prompt: enhancedPrompt,
                n: 1,
                size: size,
                quality: quality === 'high' ? 'hd' : 'standard',
            });
        }

        const imageData = response.data[0];

        // If we got b64_json, convert to data URL
        if (imageData.b64_json) {
            const dataUrl = `data:image/png;base64,${imageData.b64_json}`;
            console.log(`   ✅ Imagem gerada com sucesso (base64)`);
            return {
                url: dataUrl,
                revisedPrompt: imageData.revised_prompt || prompt,
                style,
                size,
            };
        }

        console.log(`   ✅ Imagem gerada com sucesso`);
        return {
            url: imageData.url,
            revisedPrompt: imageData.revised_prompt || prompt,
            style,
            size,
        };

    } catch (err) {
        console.error('❌ [AI Designer] Erro ao gerar imagem:', err.message);

        if (err.message.includes('billing') || err.message.includes('quota') || err.message.includes('exceeded')) {
            throw new Error('Limite de uso da API atingido. Verifique seu plano OpenAI ou adicione créditos.');
        }
        if (err.message.includes('content_policy')) {
            throw new Error('O conteúdo do prompt viola as políticas de uso. Por favor, reformule o pedido.');
        }
        if (err.message.includes('invalid_api_key')) {
            throw new Error('Chave da API OpenAI inválida. Verifique em Configurações.');
        }

        throw err;
    }
}

/**
 * Edita/transforma uma imagem existente com base em instruções
 * Usa o modelo de edição para transformar a imagem do usuário
 */
async function editImage({ imageBuffer, prompt, style = 'realistic', size = '1024x1024', apiKey = null }) {
    try {
        const key = apiKey || config.openai.apiKey;
        if (!key) throw new Error('Chave da API OpenAI não configurada.');

        const client = new OpenAI({ apiKey: key });
        const enhancedPrompt = buildEnhancedPrompt(prompt, style);

        console.log(`🎨 [AI Designer] Editando imagem...`);
        console.log(`   📝 Instrução: ${prompt.substring(0, 80)}...`);
        console.log(`   🎭 Estilo: ${style}`);

        // Save temp file for the API
        const uploadsDir = config.uploadsDir;
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        const tempPath = path.join(uploadsDir, `edit_input_${Date.now()}.png`);
        fs.writeFileSync(tempPath, imageBuffer);

        let response;
        try {
            // Try gpt-image-1 edit first
            response = await client.images.edit({
                model: 'gpt-image-1',
                image: fs.createReadStream(tempPath),
                prompt: enhancedPrompt,
                n: 1,
                size: size,
            });
        } catch (editErr) {
            // Fallback to dall-e-2 edit
            console.log('   ⚠️ Fallback para dall-e-2 edit...');
            response = await client.images.edit({
                model: 'dall-e-2',
                image: fs.createReadStream(tempPath),
                prompt: enhancedPrompt,
                n: 1,
                size: '1024x1024',
            });
        }

        // Cleanup
        try { fs.unlinkSync(tempPath); } catch { }

        const imageData = response.data[0];

        if (imageData.b64_json) {
            const dataUrl = `data:image/png;base64,${imageData.b64_json}`;
            console.log(`   ✅ Imagem editada com sucesso (base64)`);
            return {
                url: dataUrl,
                revisedPrompt: imageData.revised_prompt || prompt,
                style,
                size,
            };
        }

        console.log(`   ✅ Imagem editada com sucesso`);
        return {
            url: imageData.url,
            revisedPrompt: imageData.revised_prompt || prompt,
            style,
            size,
        };

    } catch (err) {
        console.error('❌ [AI Designer] Erro ao editar imagem:', err.message);

        if (err.message.includes('billing') || err.message.includes('quota')) {
            throw new Error('Limite de uso da API atingido. Verifique seu plano OpenAI.');
        }
        if (err.message.includes('content_policy')) {
            throw new Error('O conteúdo viola as políticas de uso. Reformule o pedido.');
        }

        throw err;
    }
}

/**
 * Analisa uma imagem com IA (vision) para sugerir transformações
 */
async function analyzeImage({ imageBase64, apiKey = null }) {
    try {
        const key = apiKey || config.openai.apiKey;
        if (!key) throw new Error('Chave da API OpenAI não configurada.');

        const client = new OpenAI({ apiKey: key });

        const response = await client.chat.completions.create({
            model: config.openai.visionModel || 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Você é um diretor de arte e designer expert. Analise a imagem fornecida e forneça:
1. Uma descrição detalhada do que vê na imagem
2. 3 sugestões criativas de como transformar/melhorar esta imagem
3. O estilo artístico predominante

Responda em português brasileiro, de forma concisa e profissional. Formato JSON:
{"description": "...", "suggestions": ["...", "...", "..."], "detectedStyle": "..."}`
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Analise esta imagem e sugira transformações criativas:' },
                        { type: 'image_url', image_url: { url: imageBase64 } }
                    ]
                }
            ],
            max_tokens: 500,
            temperature: 0.7,
        });

        const content = response.choices[0].message.content;

        // Try to parse JSON, fallback to raw text
        try {
            return JSON.parse(content);
        } catch {
            return { description: content, suggestions: [], detectedStyle: 'unknown' };
        }

    } catch (err) {
        console.error('❌ [AI Designer] Erro ao analisar imagem:', err.message);
        throw err;
    }
}

module.exports = {
    generateImage,
    editImage,
    analyzeImage,
    STYLE_PRESETS,
    buildEnhancedPrompt,
};
