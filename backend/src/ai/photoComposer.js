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
    let templateImg, voterImg;
    try {
        templateImg = await loadImage(templateBuffer);
        voterImg = await loadImage(processedVoterBuffer);
    } catch (loadErr) {
        console.error('   ❌ Erro ao decodificar imagens com canvas:', loadErr.message);
        throw new Error('Falha ao decodificar os arquivos de imagem.');
    }

    const canvas = createCanvas(1024, 1024);
    const ctx = canvas.getContext('2d');

    // Desenhar template do candidato (Layer 1)
    ctx.drawImage(templateImg, 0, 0, 1024, 1024);

    // Ajustar proporção e limites do eleitor
    const vw = 450;
    const vh = 650;
    const vy = 150;
    const vx = isVoterOnLeft ? 50 : 524;

    const voterAspect = voterImg.width / voterImg.height;
    let dw = vw;
    let dh = vh;
    if (voterAspect > vw / vh) {
        dw = vw;
        dh = vw / voterAspect;
    } else {
        dh = vh;
        dw = vh * voterAspect;
    }

    const dx = vx + (vw - dw) / 2;
    const dy = vy + (vh - dh);

    // Desenhar o eleitor (Layer 2)
    ctx.save();
    if (isFallback) {
        // Se a remoção de fundo falhou totalmente, desenhamos com borda clássica de Polaroid para parecer intencional e limpo
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(dx - 10, dy - 10, dw + 20, dh + 20);
        ctx.strokeStyle = '#dddddd';
        ctx.lineWidth = 1;
        ctx.strokeRect(dx - 10, dy - 10, dw + 20, dh + 20);
    } else {
        // Se removeu o fundo, colocamos um drop-shadow realista na silhueta
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 6;
        ctx.shadowOffsetY = 6;
    }

    ctx.drawImage(voterImg, dx, dy, dw, dh);
    ctx.restore();

    // Desenhar a banda inferior do template por cima do eleitor para proteger banners, logos e números (Layer 3)
    // O padrão é 220px do rodapé
    const bannerHeight = 224;
    ctx.drawImage(templateImg, 0, 1024 - bannerHeight, 1024, bannerHeight, 0, 1024 - bannerHeight, 1024, bannerHeight);

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
