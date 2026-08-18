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
 * 2. Remove o background do eleitor utilizando o modelo Inspyrenet-Rembg via API do Gradio
 *    (fallback para BRIA-RMBG-1.4 se falhar).
 * 3. Com a biblioteca Canvas, gera uma composição onde o eleitor é inserido com drop shadow realista.
 * 4. Copia a faixa inferior do template por cima para garantir que rodapés e textos fiquem totalmente preservados.
 * 5. Bypassa totalmente o DALL-E para garantir que Nilton César e o eleitor tenham suas faces 100% originais.
 */

// ── AUXILIAR: REMOÇÃO DE BACKGROUND ──────────────────────────
/**
 * Remove o fundo de uma imagem usando servidores Gradio públicos (Inspyrenet / BRIA)
 */
async function removeVoterBackground(voterBuffer) {
    console.log('   🤖 [PhotoComposer] Executando remoção de fundo da foto do eleitor...');
    try {
        const { Client } = await import('@gradio/client');

        // Criar o Blob do buffer
        const blob = new Blob([voterBuffer], { type: 'image/png' });

        // 1. Tentar usar gokaygokay/Inspyrenet-Rembg (melhor qualidade)
        console.log('   🤖 Conectando ao espaço gokaygokay/Inspyrenet-Rembg...');
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
        throw new Error('Retorno do Inspyrenet inválido.');
    } catch (err) {
        console.warn('   ⚠️ Remoção com Inspyrenet falhou, tentando fallback BRIA RMBG:', err.message);
        try {
            const { Client } = await import('@gradio/client');
            const blob = new Blob([voterBuffer], { type: 'image/png' });

            // 2. Tentar usar o briaai/BRIA-RMBG-1.4 como plano B
            console.log('   🤖 Conectando ao espaço briaai/BRIA-RMBG-1.4...');
            const client = await Client.connect('briaai/BRIA-RMBG-1.4');
            const result = await client.predict('/image', {
                image: blob
            });

            if (result && result.data && result.data[0] && result.data[0].url) {
                const resultUrl = result.data[0].url;
                console.log('   🤖 Remoção concluída via BRIA RMBG. Fazendo download...');
                const fetch = (await import('node-fetch')).default;
                const resp = await fetch(resultUrl);
                const arrayBuffer = await resp.arrayBuffer();
                return Buffer.from(arrayBuffer);
            }
            throw new Error('Retorno do BRIA inválido.');
        } catch (fallbackErr) {
            console.warn('   ❌ Todas as remoções de fundo falharam. Retornando imagem original do eleitor.');
            return voterBuffer;
        }
    }
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

        // O rodapé (os 22% inferiores) deve permanecer intacto para não perder qualidade
        const bannerStart = H - Math.round(H * (224 / 1024));

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

    // 2. Remover fundo do eleitor
    let processedVoterBuffer = voterBuffer;
    let isFallback = false;
    try {
        const noBgBuffer = await removeVoterBackground(voterBuffer);
        if (noBgBuffer === voterBuffer) {
            isFallback = true;
        } else {
            processedVoterBuffer = noBgBuffer;
        }
    } catch (err) {
        console.warn('   ⚠️ Erro ao remover fundo, usando fallback:', err.message);
        isFallback = true;
    }

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
    const voterImg = isFallback ? voterImgRaw : trimTransparentBorders(voterImgRaw);

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

    // Bounding Box para o eleitor (evita cobrir o candidato)
    // O eleitor deve ocupar no máximo 48% da largura e no máximo 74% da altura
    const vw = Math.round(W * 0.48);
    const vh = Math.round(H * 0.74);
    const vy = Math.round(H * 0.08);
    const vx = isVoterOnLeft ? Math.round(W * 0.04) : W - vw - Math.round(W * 0.04);

    const voterAspect = voterImg.width / voterImg.height;

    if (isFallback) {
        // Se for o fallback, manter o enquadramento do Polaroid retangular
        dw = vw;
        dh = vh;
        if (voterAspect > vw / vh) {
            dw = vw;
            dh = vw / voterAspect;
        } else {
            dh = vh;
            dw = vh * voterAspect;
        }
        dx = vx + (vw - dw) / 2;
        dy = vy + (vh - dh);
    } else {
        // Caso de sucesso (silhueta sem fundo):
        // Ajustamos para caber de maneira proporcional na Bounding Box da lateral
        if (voterAspect > vw / vh) {
            dw = vw;
            dh = Math.round(vw / voterAspect);
        } else {
            dh = vh;
            dw = Math.round(vh * voterAspect);
        }

        // Alinhamento horizontal centralizado no box lateral correspondente
        dx = vx + (vw - dw) / 2;

        // Alinhamento vertical descendo até o "chão" (topo do rodapé/banner)
        dy = vy + (vh - dh);
    }

    // Desenhar o eleitor (Layer 2) - Ele é desenhado NO FUNDO para o candidato ficar NA FRENTE
    ctx.save();
    if (isFallback) {
        // Se a remoção de fundo falhou totalmente, desenhamos com borda clássica de Polaroid para parecer intencional e limpo
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = Math.round(W * 0.01);
        ctx.shadowOffsetX = Math.round(W * 0.003);
        ctx.shadowOffsetY = Math.round(W * 0.003);

        const pad = Math.round(W * 0.01);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(dx - pad, dy - pad, dw + pad * 2, dh + pad * 2);
        ctx.strokeStyle = '#dddddd';
        ctx.lineWidth = 1;
        ctx.strokeRect(dx - pad, dy - pad, dw + pad * 2, dh + pad * 2);
    } else {
        // Se removeu o fundo, colocamos um drop-shadow realista na silhueta
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = Math.round(W * 0.015);
        ctx.shadowOffsetX = Math.round(W * 0.006);
        ctx.shadowOffsetY = Math.round(W * 0.006);
    }

    ctx.drawImage(voterImg, dx, dy, dw, dh);
    ctx.restore();

    // Desenhar template do candidato por cima (Layer 3)
    if (isFallback) {
        // Fallback: desenha o template original (o eleitor ficará coberto por trás pela polaroid branca)
        ctx.drawImage(templateImg, 0, 0, W, H);
    } else {
        // Sucesso: Isola o candidato do fundo e desenha por CIMA do eleitor (fazendo o eleitor ficar ATRÁS dele!)
        const isolatedTemplate = isolateCandidate(templateImg, bgR, bgG, bgB);
        ctx.drawImage(isolatedTemplate, 0, 0);
    }

    // Desenhar a banda inferior do template por cima do eleitor para proteger banners, logos e números (Layer 3.5)
    // O padrão é cerca de 22% do rodapé em relação ao total da tela para manter proporção e evitar distorções
    const bannerHeight = Math.round(H * (224 / 1024));
    ctx.drawImage(templateImg, 0, H - bannerHeight, W, bannerHeight, 0, H - bannerHeight, W, bannerHeight);

    // Desenhar o texto "[NOME DO ELEITOR] APOIA" no topo (Layer 4)
    if (voterName && String(voterName).trim().toLowerCase() !== 'anônimo') {
        ctx.save();
        const fontSize = Math.round(H * 0.022); // Redimensionado para ser clássico, pequeno e elegante (evita ficar em cima de cabeças)
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const cleanName = String(voterName).trim().toUpperCase();
        const text = `${cleanName}  APOIA`;
        // Desenha bem no topo (1.5% de margem Y de segurança)
        ctx.fillText(text, W / 2, Math.round(H * 0.015));
        ctx.restore();
    }

    const finalBuffer = canvas.toBuffer('image/png');
    const base64Str = finalBuffer.toString('base64');

    console.log('   ✅ Composição concluída com sucesso');
    return {
        url: `data:image/png;base64,${base64Str}`,
        base64: base64Str,
        revisedPrompt: isFallback ? 'Canvas Fallback composition with polaroid' : 'Canvas cutout composition',
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
