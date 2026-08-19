const OpenAI = require('openai');
const config = require('../config/config');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

/**
 * Photo Composer — Motor de composição de fotos com candidato
 * 
 * Abordagem (Fidelidade Máxima & Zero Hallucination):
 * 1. Remove o background do eleitor via APIs gratuitas do HuggingFace.
 * 2. Posiciona o eleitor ATRÁS do candidato (mesma altura).
 * 3. Usa Chroma Key no template para tornar o fundo transparente,
 *    permitindo que o eleitor apareça por detrás.
 * 4. Toda manipulação é feita com sharp (sem canvas nativo).
 */

// ── AUXILIAR: REMOÇÃO DE BACKGROUND ──────────────────────────
async function removeVoterBackground(voterBuffer) {
    console.log('   🤖 [PhotoComposer] Executando remoção de fundo da foto do eleitor...');

    const pngInput = await sharp(voterBuffer).png().toBuffer();
    const maxRetries = 2;
    let lastError = null;

    async function uploadToGradio(spaceUrl, buffer) {
        const boundary = '----FormBoundary' + Date.now().toString(36);
        const header = `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="voter.png"\r\nContent-Type: image/png\r\n\r\n`;
        const footer = `\r\n--${boundary}--\r\n`;
        const body = Buffer.concat([Buffer.from(header), buffer, Buffer.from(footer)]);

        const resp = await fetch(`${spaceUrl}/gradio_api/upload`, {
            method: 'POST',
            headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
            body,
            signal: AbortSignal.timeout(30000),
        });
        if (!resp.ok) throw new Error(`Upload falhou: ${resp.status} ${resp.statusText}`);
        const paths = await resp.json();
        return paths[0];
    }

    async function callGradioApi(spaceUrl, apiName, data) {
        const callResp = await fetch(`${spaceUrl}/gradio_api/call${apiName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data }),
            signal: AbortSignal.timeout(30000),
        });
        if (!callResp.ok) throw new Error(`Call falhou: ${callResp.status} ${callResp.statusText}`);
        const { event_id } = await callResp.json();
        if (!event_id) throw new Error('Sem event_id na resposta.');

        const resultResp = await fetch(`${spaceUrl}/gradio_api/call${apiName}/${event_id}`, {
            signal: AbortSignal.timeout(90000),
        });
        const text = await resultResp.text();

        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('event: complete') || lines[i].startsWith('event:complete')) {
                const dataLine = lines[i + 1];
                if (dataLine && dataLine.startsWith('data:'))
                    return JSON.parse(dataLine.replace(/^data:\s*/, ''));
            }
            if (lines[i].startsWith('event: error') || lines[i].startsWith('event:error')) {
                throw new Error('Gradio retornou erro: ' + (lines[i + 1] || 'desconhecido'));
            }
        }
        throw new Error('Nenhum evento complete encontrado na resposta SSE.');
    }

    async function downloadAndConvertToPng(imageUrl) {
        const resp = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
        if (!resp.ok) throw new Error(`Download falhou: ${resp.status}`);
        const rawBuffer = Buffer.from(await resp.arrayBuffer());
        const pngBuffer = await sharp(rawBuffer).png().toBuffer();
        console.log(`   ✅ Imagem convertida para PNG (${pngBuffer.length} bytes)`);
        return pngBuffer;
    }

    function extractResultUrl(spaceUrl, resultData) {
        if (!resultData) return null;
        const items = Array.isArray(resultData) ? resultData : [resultData];
        for (const item of items) {
            if (item && typeof item === 'object') {
                if (Array.isArray(item)) {
                    for (const sub of item) {
                        if (sub?.url) return sub.url.startsWith('http') ? sub.url : `${spaceUrl}${sub.url}`;
                        if (sub?.path) return `${spaceUrl}/gradio_api/file=${sub.path}`;
                    }
                }
                if (item.url) return item.url.startsWith('http') ? item.url : `${spaceUrl}${item.url}`;
                if (item.path) return `${spaceUrl}/gradio_api/file=${item.path}`;
            }
        }
        return null;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        // ── TIER 1: leonelhs/rembg ──
        try {
            const spaceUrl = 'https://leonelhs-rembg.hf.space';
            console.log(`   🤖 Tentativa ${attempt}/${maxRetries} — leonelhs/rembg (CPU)...`);
            const uploadedPath = await uploadToGradio(spaceUrl, pngInput);
            const result = await callGradioApi(spaceUrl, '/predict', [{ path: uploadedPath }, 'u2net']);
            const imageUrl = extractResultUrl(spaceUrl, result);
            if (imageUrl) {
                console.log('   ✅ Remoção concluída via leonelhs/rembg.');
                return await downloadAndConvertToPng(imageUrl);
            }
            throw new Error('Retorno inválido.');
        } catch (err) {
            lastError = err;
            console.warn(`   ⚠️ Tier 1 falhou:`, err.message);
        }

        // ── TIER 2: BRIA-RMBG-2.0 ──
        try {
            const spaceUrl = 'https://briaai-bria-rmbg-2-0.hf.space';
            console.log(`   🤖 Tentativa ${attempt}/${maxRetries} — BRIA-RMBG-2.0...`);
            const uploadedPath = await uploadToGradio(spaceUrl, pngInput);
            const result = await callGradioApi(spaceUrl, '/image', [{ path: uploadedPath }]);
            const imageUrl = extractResultUrl(spaceUrl, result);
            if (imageUrl) {
                console.log('   ✅ Remoção concluída via BRIA RMBG 2.0.');
                return await downloadAndConvertToPng(imageUrl);
            }
            throw new Error('Retorno inválido.');
        } catch (briaErr) {
            lastError = briaErr;
            console.warn(`   ⚠️ Tier 2 falhou:`, briaErr.message);
        }

        // ── TIER 3: Inspyrenet ──
        try {
            const spaceUrl = 'https://gokaygokay-inspyrenet-rembg.hf.space';
            console.log(`   🤖 Tentativa ${attempt}/${maxRetries} — Inspyrenet...`);
            const uploadedPath = await uploadToGradio(spaceUrl, pngInput);
            const result = await callGradioApi(spaceUrl, '/predict', [{ path: uploadedPath }, 'Default']);
            const imageUrl = extractResultUrl(spaceUrl, result);
            if (imageUrl) {
                console.log('   ✅ Remoção concluída via Inspyrenet.');
                return await downloadAndConvertToPng(imageUrl);
            }
            throw new Error('Retorno inválido.');
        } catch (inspErr) {
            lastError = inspErr;
            console.warn(`   ⚠️ Tier 3 falhou:`, inspErr.message);
        }

        if (attempt < maxRetries) {
            console.log('   ⏳ Aguardando 3s antes da próxima rodada...');
            await new Promise(r => setTimeout(r, 3000));
        }
    }

    throw new Error('Não foi possível remover o fundo da foto. Tente novamente em alguns segundos. (' + (lastError?.message || '') + ')');
}

// ── CHROMA KEY VIA SHARP (pixel-level) ───────────────────────
/**
 * Torna transparente o fundo sólido do template (Chroma Key),
 * preservando o candidato, banner inferior e elementos gráficos.
 * Funciona processando os pixels raw via Buffer.
 */
async function chromaKeyTemplate(templateBuffer, bgR, bgG, bgB) {
    const meta = await sharp(templateBuffer).metadata();
    const W = meta.width;
    const H = meta.height;

    // Extrair pixels raw RGBA
    const rawBuffer = await sharp(templateBuffer)
        .ensureAlpha()
        .raw()
        .toBuffer();

    const pixels = Buffer.from(rawBuffer); // cópia mutável
    const bannerStart = H - Math.round(H * 0.25); // proteger 25% inferior (banner)

    const threshLow = 35;
    const threshHigh = 70;

    for (let y = 0; y < bannerStart; y++) {
        for (let x = 0; x < W; x++) {
            const idx = (y * W + x) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            const a = pixels[idx + 3];

            if (a === 0) continue;

            const dR = r - bgR;
            const dG = g - bgG;
            const dB = b - bgB;
            const dist = Math.sqrt(dR * dR + dG * dG + dB * dB);

            if (dist < threshLow) {
                pixels[idx + 3] = 0; // totalmente transparente
            } else if (dist < threshHigh) {
                const ratio = (dist - threshLow) / (threshHigh - threshLow);
                pixels[idx + 3] = Math.round(ratio * a);
            }
        }
    }

    return sharp(pixels, { raw: { width: W, height: H, channels: 4 } })
        .png()
        .toBuffer();
}

// ── ANÁLISE DE CENA ──────────────────────────────────────────
async function analyzeTemplateScene(imageBase64, apiKey = null) {
    const key = apiKey || config.openai.apiKey;
    if (!key) return { person_position: 'center', available_space: 'left' };

    try {
        const client = new OpenAI({ apiKey: key });
        const response = await client.chat.completions.create({
            model: config.openai.visionModel || 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You analyze campaign photos. Return ONLY valid JSON:
{"person_position":"left","available_space":"right side"}
Where person_position = where the main person is (left/center/right).`
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Where is the main person in this photo?' },
                        { type: 'image_url', image_url: { url: imageBase64 } }
                    ]
                }
            ],
            max_tokens: 150,
            temperature: 0.1,
        });

        let c = response.choices[0].message.content.trim();
        if (c.startsWith('```json')) c = c.substring(7);
        if (c.startsWith('```')) c = c.substring(3);
        if (c.endsWith('```')) c = c.substring(0, c.length - 3);
        return JSON.parse(c.trim());
    } catch (err) {
        console.log('   ⚠️ Análise de cena falhou, usando defaults:', err.message);
        return { person_position: 'center', available_space: 'left' };
    }
}

// ── COMPOSIÇÃO DE FOTO (ELEITOR ATRÁS DO CANDIDATO) ──────────
/**
 * Camadas (de baixo para cima):
 *   1. Fundo sólido (cor amostrada do template)
 *   2. Eleitor (sem fundo, com drop shadow) — mesma altura do candidato
 *   3. Template com Chroma Key (fundo transparente, candidato opaco = eleitor fica "atrás")
 *   4. Banner inferior original do template (sobrepõe tudo para preservar textos/logos)
 */
async function composePhoto({
    templateBuffer,
    voterBuffer,
    voterPhotoUrl = null,
    sceneAnalysis,
    templateBase64,
    size = '1024x1024',
    apiKey = null,
    voterName = null,
}) {
    console.log('📸 [PhotoComposer] Iniciando composição (eleitor ATRÁS do candidato)...');

    // 1. Analisar cena
    let analysis = sceneAnalysis;
    if (!analysis && templateBase64) {
        console.log('   🔍 Analisando cena do template...');
        analysis = await analyzeTemplateScene(templateBase64, apiKey);
        console.log('   ✅ Análise:', JSON.stringify(analysis));
    }

    const candidatePos = String(analysis?.person_position || 'center').toLowerCase();
    let isVoterOnLeft;
    if (candidatePos.includes('right') || candidatePos.includes('direita')) {
        isVoterOnLeft = true; // candidato à direita → eleitor à esquerda
    } else {
        // Candidato left/center → eleitor vai para a DIREITA (padrão mais natural)
        isVoterOnLeft = false;
    }
    console.log(`   👉 Eleitor: ${isVoterOnLeft ? 'ESQUERDA' : 'DIREITA'} (atrás do candidato)`);

    // 2. Remover fundo do eleitor
    const processedVoterBuffer = await removeVoterBackground(voterBuffer);

    // 3. Metadados do template
    // Converter template para PNG com alpha para garantir composição correta
    const templatePng = await sharp(templateBuffer).ensureAlpha().png().toBuffer();
    const templateMeta = await sharp(templatePng).metadata();
    const W = templateMeta.width;
    const H = templateMeta.height;
    console.log(`   📐 Template: ${W}x${H}`);

    // 4. Trimmar transparência do eleitor
    let trimmedVoter;
    try {
        trimmedVoter = await sharp(processedVoterBuffer).trim().png().toBuffer();
    } catch {
        trimmedVoter = processedVoterBuffer; // se trim falhar, usa original
    }
    const voterMeta = await sharp(trimmedVoter).metadata();
    console.log(`   📐 Eleitor (trimmed): ${voterMeta.width}x${voterMeta.height}`);

    // 5. Amostrar cor de fundo do template
    const sampleX = Math.max(0, W - 10);
    const sampleY = Math.min(10, H - 1);
    const samplePixel = await sharp(templatePng)
        .extract({ left: sampleX, top: sampleY, width: 1, height: 1 })
        .raw()
        .toBuffer();
    const bgR = samplePixel[0], bgG = samplePixel[1], bgB = samplePixel[2];
    console.log(`   🎨 Cor de fundo: rgb(${bgR},${bgG},${bgB})`);

    // 6. Calcular dimensões do eleitor — MESMA ALTURA que o candidato
    const bannerHeight = Math.round(H * 0.25); // banner inferior (textos, logos)
    const usableHeight = H - bannerHeight;

    // Eleitor ocupa ~103% da área útil em altura para coincidir com a mesma altura visual
    const targetVoterH = Math.round(usableHeight * 1.03);
    const voterAspect = voterMeta.width / voterMeta.height;
    let finalVoterH = targetVoterH;
    let finalVoterW = Math.round(finalVoterH * voterAspect);

    // Limitar largura a 60% do template para manter proporção mas permitir escala natural
    const maxW = Math.round(W * 0.60);
    if (finalVoterW > maxW) {
        finalVoterW = maxW;
        finalVoterH = Math.round(finalVoterW / voterAspect);
    }

    const resizedVoter = await sharp(trimmedVoter)
        .resize(finalVoterW, finalVoterH, { fit: 'fill' })
        .png()
        .toBuffer();

    // Deslocamento do candidato para a esquerda (para abrir espaço e enquadrar melhor)
    const candidateShiftX = -Math.round(W * 0.08);

    // Posição horizontal do eleitor
    let voterX;
    if (isVoterOnLeft) {
        voterX = -Math.round(finalVoterW * 0.05); // levemente para fora ou alinhado à esquerda
    } else {
        // Encaixado na direita, mas deslocado para a esquerda para overlap natural
        voterX = W - finalVoterW - Math.round(W * 0.04);
    }
    // Base do eleitor alinhada com o topo do banner (pés tocam o banner)
    const voterY = Math.max(0, usableHeight - finalVoterH);
    console.log(`   📍 Eleitor: (${voterX}, ${voterY}) → ${finalVoterW}x${finalVoterH}`);

    // 7. Chroma Key no template (tornar fundo transparente)
    console.log('   🎯 Aplicando Chroma Key no template...');
    const chromaTemplate = await chromaKeyTemplate(templatePng, bgR, bgG, bgB);

    // 8. Extrair banda inferior (banner) do template ORIGINAL para cobrir cortes
    const bannerBuffer = await sharp(templatePng)
        .extract({ left: 0, top: H - bannerHeight, width: W, height: bannerHeight })
        .png()
        .toBuffer();

    // 9. Criar sombra para o eleitor
    const shadowBlur = Math.max(1, Math.round(W * 0.008));
    const shadowOffset = Math.round(W * 0.004);
    let shadowBuffer;
    try {
        shadowBuffer = await sharp(resizedVoter)
            .composite([{
                input: Buffer.from([0, 0, 0, 90]),
                raw: { width: 1, height: 1, channels: 4 },
                tile: true,
                blend: 'in'
            }])
            .blur(shadowBlur)
            .png()
            .toBuffer();
    } catch {
        shadowBuffer = null; // sem sombra se falhar
    }

    // 10. Composição final
    const composites = [];

    // Sombra
    if (shadowBuffer) {
        const sx = voterX + shadowOffset;
        const sy = voterY + shadowOffset;
        if (sx >= -finalVoterW && sy >= 0 && sx <= W && sy + finalVoterH <= H) {
            composites.push({ input: shadowBuffer, left: sx, top: sy, blend: 'over' });
        }
    }

    // Eleitor sem fundo (Layer 2 - Atrás)
    composites.push({
        input: resizedVoter,
        left: voterX,
        top: Math.max(0, voterY),
        blend: 'over',
    });

    // Template com Chroma Key deslocado para a esquerda (Layer 3 - Frente)
    composites.push({ input: chromaTemplate, left: candidateShiftX, top: 0, blend: 'over' });

    // Banner inferior original (Layer 4 — fixo em 0 para não mover a identificação visual)
    composites.push({
        input: bannerBuffer,
        left: 0,
        top: H - bannerHeight,
        blend: 'over',
    });

    const finalBuffer = await sharp({
        create: {
            width: W,
            height: H,
            channels: 4,
            background: { r: bgR, g: bgG, b: bgB, alpha: 255 },
        }
    })
        .composite(composites)
        .png()
        .toBuffer();

    const base64Str = finalBuffer.toString('base64');
    console.log('   ✅ Composição concluída com sucesso!');

    return {
        url: `data:image/png;base64,${base64Str}`,
        base64: base64Str,
        revisedPrompt: 'Sharp composition – voter behind candidate',
    };
}

function buildCompositionPrompt(analysis = {}) {
    return 'Sharp Cutout Composition';
}

// ── UPLOAD PARA SUPABASE ─────────────────────────────────────
async function saveComposedImage(imageData, campaignId, submissionId) {
    const { getSupabase } = require('../db/supabase');
    const supabase = getSupabase();

    let buffer;
    if (imageData.base64) {
        buffer = Buffer.from(imageData.base64, 'base64');
    } else if (imageData.url && imageData.url.startsWith('data:')) {
        buffer = Buffer.from(imageData.url.split(',')[1], 'base64');
    } else {
        const resp = await fetch(imageData.url);
        buffer = Buffer.from(await resp.arrayBuffer());
    }

    const fileName = `photo_campaigns/${campaignId}/results/${submissionId}_${Date.now()}.png`;

    const { error } = await supabase.storage
        .from('knowledge-files')
        .upload(fileName, buffer, { contentType: 'image/png', upsert: true });

    if (error) {
        console.error('❌ [PhotoComposer] Erro ao salvar no storage:', error.message);
        throw error;
    }

    const { data: urlData } = supabase.storage.from('knowledge-files').getPublicUrl(fileName);
    return urlData.publicUrl;
}

module.exports = {
    analyzeTemplateScene,
    composePhoto,
    saveComposedImage,
    buildCompositionPrompt,
};
