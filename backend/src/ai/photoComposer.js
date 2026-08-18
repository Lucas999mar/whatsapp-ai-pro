const OpenAI = require('openai');
const config = require('../config/config');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { createCanvas, loadImage } = require('canvas');

/**
 * Photo Composer — Motor de composição de fotos com candidato
 * 
 * Nova Abordagem (Fidelidade Máxima & Zero Hallucination):
 * 1. Analisa a cena (candidato) via OpenAI Vision para segmentação lógica (esquerda/direita).
 * 2. Remove o background do eleitor utilizando o modelo Inspyrenet-Rembg/BRIA-RMBG-2.0 via API do Gradio
 *    (com retentativas automáticas e 3 níveis de fallback escalonados).
 * 3. Com a biblioteca Canvas, gera uma composição onde o eleitor é inserido com drop shadow realista.
 * 4. Copia a faixa inferior do template por cima para garantir que rodapés e textos fiquem totalmente preservados.
 * 5. Bypassa totalmente o DALL-E para garantir que Nilton César e o eleitor tenham suas faces 100% originais.
 */

// ── AUXILIAR: REMOÇÃO DE BACKGROUND ──────────────────────────
/**
 * Remove o fundo de uma imagem usando servidores Gradio públicos (Inspyrenet / BRIA)
 * com 3 retentativas automatizadas e 3 tiers escalonados para resolver oscilações da imagem.
 */
async function removeVoterBackground(voterBuffer) {
    console.log('   🤖 [PhotoComposer] Executando remoção de fundo da foto do eleitor...');
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        // TIER 1: briaai/BRIA-RMBG-2.0 (Mais rápido, mais novo, oficial e estável)
        try {
            const { Client } = await import('@gradio/client');
            const blob = new Blob([voterBuffer], { type: 'image/png' });

            console.log(`   🤖 Tentativa ${attempt}/${maxRetries} usando briaai/BRIA-RMBG-2.0...`);
            const client = await Client.connect('briaai/BRIA-RMBG-2.0');
            const result = await client.predict('/image', {
                image: blob
            });

            const resultUrl = result?.data?.[1]?.url || result?.data?.[0]?.[0]?.url;
            if (resultUrl) {
                console.log('   🤖 Remoção concluída via BRIA RMBG 2.0. Fazendo download...');
                const fetch = (await import('node-fetch')).default;
                const resp = await fetch(resultUrl);
                const arrayBuffer = await resp.arrayBuffer();
                return Buffer.from(arrayBuffer);
            }
            throw new Error('Retorno inválido do BRIA 2.0.');
        } catch (err) {
            console.warn(`   ⚠️ Tentativa ${attempt} com BRIA 2.0 falhou:`, err.message);

            // TIER 2: gokaygokay/Inspyrenet-Rembg
            try {
                const { Client } = await import('@gradio/client');
                const blob = new Blob([voterBuffer], { type: 'image/png' });

                console.log(`   🤖 Tentativa ${attempt}/${maxRetries} usando gokaygokay/Inspyrenet-Rembg...`);
                const client = await Client.connect('gokaygokay/Inspyrenet-Rembg');
                const result = await client.predict('/predict', {
                    input_image: blob,
                    output_type: 'Default'
                });

                if (result && result.data && result.data[0] && result.data[0].url) {
                    const resultUrl = result.data[0].url;
                    console.log('   🤖 Remoção concluída via Inspyrenet. Fazendo download...');
                    const fetch = (await import('node-fetch')).default;
                    const resp = await fetch(resultUrl);
                    const arrayBuffer = await resp.arrayBuffer();
                    return Buffer.from(arrayBuffer);
                }
                throw new Error('Retorno inválido do Inspyrenet.');
            } catch (inspErr) {
                console.warn(`   ⚠️ Tentativa ${attempt} com Inspyrenet falhou:`, inspErr.message);

                // TIER 3: briaai/BRIA-RMBG-1.4
                try {
                    const { Client } = await import('@gradio/client');
                    const blob = new Blob([voterBuffer], { type: 'image/png' });
                    console.log(`   🤖 Tentativa ${attempt}/${maxRetries} usando briaai/BRIA-RMBG-1.4...`);
                    const client = await Client.connect('briaai/BRIA-RMBG-1.4');
                    const result = await client.predict('/image', {
                        image: blob
                    });

                    const resultUrl = result?.data?.[0]?.url;
                    if (resultUrl) {
                        console.log('   🤖 Remoção concluída via BRIA RMBG 1.4. Fazendo download...');
                        const fetch = (await import('node-fetch')).default;
                        const resp = await fetch(resultUrl);
                        const arrayBuffer = await resp.arrayBuffer();
                        return Buffer.from(arrayBuffer);
                    }
                    throw new Error('Retorno inválido do BRIA 1.4.');
                } catch (bria14Err) {
                    console.warn(`   ⚠️ Tentativa ${attempt} com BRIA 1.4 falhou:`, bria14Err.message);
                }
            }

            if (attempt < maxRetries) {
                console.log('   ⏳ Aguardando 2 segundos para tentar novamente...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    throw new Error('Erro ao remover o fundo da foto do eleitor nos servidores de IA. Favor tentar novamente.');
}

// ── ANÁLISE DE CENA ──────────────────────────────────────────
/**
 * Analisa a imagem template do candidato para extrair informações de cena
 */
async function analyzeTemplateScene(imageBase64, apiKey = null) {
    const key = apiKey || config.openai.apiKey;
    if (!key) throw new Error('Chave da API OpenAI não configurada.');

    const client = new OpenAI({ apiKey: key });

    const response = await client.chat.completions.create({
        model: config.openai.visionModel || 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: `You are a professional photographer and image composition expert. Analyze this image and provide a detailed technical description in JSON format:
{
  "scene_description": "Brief description of the scene",
  "lighting": "Lighting direction, type (natural/studio/mixed), intensity, color temperature",
  "camera_angle": "Eye level, low angle, high angle, etc.",
  "background": "Detailed background description",
  "person_position": "Where the main person is positioned (left, center, right)",
  "available_space": "Where there is space to add another person (left side, right side)",
  "color_palette": "Dominant colors in the image",
  "mood": "Overall mood/atmosphere",
  "style": "Photo style (formal, casual, campaign, rally, etc.)",
  "suggested_placement": "Best position and pose for adding a second person naturally"
}
Respond ONLY with valid JSON. Be extremely precise about lighting and positioning.`
            },
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'Analyze this campaign photo template for composition:' },
                    { type: 'image_url', image_url: { url: imageBase64 } }
                ]
            }
        ],
        max_tokens: 800,
        temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    try {
        let cleanContent = content.trim();
        if (cleanContent.startsWith('```json')) {
            cleanContent = cleanContent.substring(7);
        }
        if (cleanContent.endsWith('```')) {
            cleanContent = cleanContent.substring(0, cleanContent.length - 3);
        }
        cleanContent = cleanContent.trim();
        return JSON.parse(cleanContent);
    } catch {
        return { scene_description: content, lighting: 'unknown', available_space: 'right side', person_position: 'left' };
    }
}

/**
 * Recorta as bordas transparentes ao redor de uma imagem (silhueta)
 * para obter a caixa delimitadora exata do eleitor e evitar miniaturização.
 */
function trimTransparentBorders(img) {
    try {
        const tempCanvas = createCanvas(img.width, img.height);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);

        const imgData = tempCtx.getImageData(0, 0, img.width, img.height);
        const data = imgData.data;
        const width = img.width;
        const height = img.height;

        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const alpha = data[(y * width + x) * 4 + 3];
                // Considerar pixels com opacidade > 15 (evita ruídos)
                if (alpha > 15) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        // Se for uma imagem vazia ou erro
        if (maxX === -1 || maxY === -1) {
            return img;
        }

        const cropWidth = maxX - minX + 1;
        const cropHeight = maxY - minY + 1;

        // Evitar recortes microscópicos por erro
        if (cropWidth < 10 || cropHeight < 10) {
            return img;
        }

        const croppedCanvas = createCanvas(cropWidth, cropHeight);
        const croppedCtx = croppedCanvas.getContext('2d');
        croppedCtx.drawImage(tempCanvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

        return croppedCanvas;
    } catch (err) {
        console.warn('   ⚠️ Erro ao recortar bordas transparentes da foto do eleitor:', err.message);
        return img;
    }
}

/**
 * Isola o candidato no template tornando transparentes todos os pixels
 * cuja cor esteja muito próxima da cor de fundo (Chroma Key dinâmico).
 */
function isolateCandidate(templateImg, bgR, bgG, bgB) {
    try {
        const W = templateImg.width;
        const H = templateImg.height;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(templateImg, 0, 0);

        const imgData = ctx.getImageData(0, 0, W, H);
        const data = imgData.data;

        // O rodapé e o banner de nome (os 45% inferiores) devem permanecer intactos para não perder qualidade nem aparecer cortes
        const bannerStart = H - Math.round(H * 0.45);

        for (let y = 0; y < bannerStart; y++) {
            for (let x = 0; x < W; x++) {
                const idx = (y * W + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];

                if (a === 0) continue;

                const dR = r - bgR;
                const dG = g - bgG;
                const dB = b - bgB;
                const dist = Math.sqrt(dR * dR + dG * dG + dB * dB);

                // Sensibilidade do Chroma Key
                const threshLow = 30;
                const threshHigh = 65;

                if (dist < threshLow) {
                    data[idx + 3] = 0;
                } else if (dist < threshHigh) {
                    const ratio = (dist - threshLow) / (threshHigh - threshLow);
                    data[idx + 3] = Math.round(ratio * a);
                }
            }
        }

        ctx.putImageData(imgData, 0, 0);
        return canvas;
    } catch (err) {
        console.warn('   ⚠️ Erro ao isolar candidato do template:', err.message);
        return templateImg;
    }
}

// ── COMPOSIÇÃO DE FOTO ───────────────────────────────────────
/**
 * Compõe a foto do eleitor com a foto template do candidato
 */
async function composePhoto({
    templateBuffer,    // Buffer da imagem template (candidato)
    voterBuffer,       // Buffer da imagem do eleitor
    voterPhotoUrl = null, // URL pública da foto do eleitor
    sceneAnalysis,     // Análise prévia da cena (opcional)
    templateBase64,    // Base64 do template para análise
    size = '1024x1024',
    apiKey = null,
    voterName = null,  // Nome/título do apoiador
}) {
    console.log('📸 [PhotoComposer] Iniciando composição de foto baseada em remoção de fundo...');

    // 1. Analisar cena do template
    let analysis = sceneAnalysis;
    if (!analysis && templateBase64) {
        console.log('   🔍 Analisando cena do template...');
        try {
            analysis = await analyzeTemplateScene(templateBase64, apiKey);
            console.log('   ✅ Análise da cena concluída');
        } catch (err) {
            console.log('   ⚠️ Análise falhou, usando defaults:', err.message);
            analysis = { person_position: 'left', available_space: 'right side' };
        }
    }

    // Configurar lado em que o eleitor será posicionado
    const candidatePos = String(analysis?.person_position || 'left').toLowerCase();
    const spaceText = String(analysis?.available_space || 'right').toLowerCase();

    let isVoterOnLeft = false;

    if (candidatePos.includes('left') || candidatePos.includes('esquerda')) {
        isVoterOnLeft = false;
    } else if (candidatePos.includes('right') || candidatePos.includes('direita')) {
        isVoterOnLeft = true;
    } else {
        if (spaceText.includes('left') || spaceText.includes('esquerda')) {
            isVoterOnLeft = true;
        } else {
            isVoterOnLeft = false;
        }
    }

    console.log(`   👉 Posicionamento do eleitor: ${isVoterOnLeft ? 'ESQUERDA' : 'DIREITA'} (Candidato está à: ${candidatePos})`);

    // 2. Remover fundo do eleitor (se falhar definitivamente, lança erro para evitar Polaroid)
    const processedVoterBuffer = await removeVoterBackground(voterBuffer, voterPhotoUrl);

    // 3. Carregar imagens no Canvas
    let templateImg, voterImgRaw;
    try {
        templateImg = await loadImage(templateBuffer);
        voterImgRaw = await loadImage(processedVoterBuffer);
    } catch (loadErr) {
        console.error('   ❌ Erro ao decodificar imagens com canvas:', loadErr.message);
        throw new Error('Falha ao decodificar os arquivos de imagem.');
    }

    const W = templateImg.width;
    const H = templateImg.height;

    // Recorta as bordas transparentes para obter escala realista da silhueta do eleitor
    const voterImg = trimTransparentBorders(voterImgRaw);

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // 1. Amostrar a cor de fundo original do template (canto superior direito)
    const sampleCanvas = createCanvas(1, 1);
    const sampleCtx = sampleCanvas.getContext('2d');
    sampleCtx.drawImage(templateImg, W - 5, 5, 1, 1, 0, 0, 1, 1);
    const px = sampleCtx.getImageData(0, 0, 1, 1).data;
    const bgR = px[0];
    const bgG = px[1];
    const bgB = px[2];

    // 2. Preencher o fundo do novo canvas com a cor original do template
    ctx.fillStyle = `rgb(${bgR}, ${bgG}, ${bgB})`;
    ctx.fillRect(0, 0, W, H);

    // Ajustar proporção e limites do eleitor proporcionalmente ao template
    let dx, dy, dw, dh;

    // Bounding Box ajustada para o eleitor para bater exatamente no padrão do candidato (Tamanho de Estúdio)
    const vw = Math.round(W * 0.52);
    const vh = Math.round(H * 0.80);
    const vy = Math.round(H * 0.08);
    const vx = isVoterOnLeft ? Math.round(W * 0.04) : W - vw - Math.round(W * 0.04);

    const voterAspect = voterImg.width / voterImg.height;

    // Caso de sucesso (silhueta sem fundo):
    // Ajustamos para caber de maneira proporcional na Bounding Box lateral
    if (voterAspect > vw / vh) {
        dw = vw;
        dh = Math.round(vw / voterAspect);
    } else {
        dh = vh;
        dw = Math.round(vh * voterAspect);
    }

    // Alinhamento vertical principal na cabeça (alinhado com o candidato no topo)
    dy = vy;

    // Ajuste proporcional para evitar que o eleitor flutue no fundo (garantir que chegue ao rodapé/banner)
    const bannerHeight = Math.round(H * 0.45);
    const bannerStart = H - bannerHeight;
    const minHeightToReachBanner = bannerStart - vy;

    if (dh < minHeightToReachBanner) {
        // Multiplicamos largura e altura para esticar até a borda do banner, preservando aspect ratio e cabeça alinhada no topo
        const scaleFactor = minHeightToReachBanner / dh;
        dh = minHeightToReachBanner;
        dw = Math.round(dw * scaleFactor);
    }

    // Alinhamento horizontal centralizado no lado correto
    dx = vx + (vw - dw) / 2;

    // 3. Desenhar a silhueta recortada do eleitor ao fundo (Layer 2)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = Math.round(W * 0.015);
    ctx.shadowOffsetX = Math.round(W * 0.006);
    ctx.shadowOffsetY = Math.round(W * 0.006);
    ctx.drawImage(voterImg, dx, dy, dw, dh);
    ctx.restore();

    // 4. Desenhar o template do candidato filtrado por cima (Layer 3)
    const isolatedTemplate = isolateCandidate(templateImg, bgR, bgG, bgB);
    ctx.drawImage(isolatedTemplate, 0, 0);

    // Desenhar a banda inferior (rodapé) opaca para cobrir cortes do corpo (Layer 4)
    ctx.drawImage(templateImg, 0, H - bannerHeight, W, bannerHeight, 0, H - bannerHeight, W, bannerHeight);

    // O texto "[NOME] APOIA" foi removido a pedido expresso do usuário para manter o topo limpo.

    const finalBuffer = canvas.toBuffer('image/png');
    const base64Str = finalBuffer.toString('base64');

    console.log('   ✅ Composição concluída com sucesso');
    return {
        url: `data:image/png;base64,${base64Str}`,
        base64: base64Str,
        revisedPrompt: 'Canvas cutout composition',
    };
}

/**
 * Constrói o prompt (Mantido apenas por compatibilidade com a assinatura se necessário)
 */
function buildCompositionPrompt(analysis = {}) {
    return 'Canvas Cutout Composition';
}

// ── UPLOAD PARA SUPABASE ─────────────────────────────────────
/**
 * Salva a imagem composta no Supabase Storage
 */
async function saveComposedImage(imageData, campaignId, submissionId) {
    const { getSupabase } = require('../db/supabase');
    const supabase = getSupabase();

    let buffer;
    if (imageData.base64) {
        buffer = Buffer.from(imageData.base64, 'base64');
    } else if (imageData.url && imageData.url.startsWith('data:')) {
        const base64Data = imageData.url.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
    } else {
        // Redownload
        const fetch = (await import('node-fetch')).default;
        const resp = await fetch(imageData.url);
        buffer = Buffer.from(await resp.arrayBuffer());
    }

    const fileName = `photo_campaigns/${campaignId}/results/${submissionId}_${Date.now()}.png`;

    const { data, error } = await supabase.storage
        .from('knowledge-files')
        .upload(fileName, buffer, {
            contentType: 'image/png',
            upsert: true,
        });

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
