const OpenAI = require('openai');
const config = require('../config/config');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { createCanvas, loadImage } = require('canvas');

/**
 * Photo Composer — Motor de composição de fotos com candidato
 * Usa gpt-image-1 (melhor modelo da OpenAI) para composição realista
 * 
 * Fluxo:
 * 1. Analisa a imagem base (candidato) via Vision para entender iluminação, ângulo, cenário
 * 2. Com a biblioteca Canvas, gera uma colagem e máscara transparentes
 * 3. Usa images.edit() com gpt-image-1 para compor de forma perfeita
 * 4. Retorna a imagem finalizada
 */

// ── ANÁLISE DE CENA ──────────────────────────────────────────
/**
 * Analisa a imagem template do candidato para extrair informações de cena
 * que serão usadas no prompt de composição
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
        return { scene_description: content, lighting: 'unknown', available_space: 'right side' };
    }
}

// ── COMPOSIÇÃO DE FOTO ───────────────────────────────────────
/**
 * Compõe a foto do eleitor com a foto template do candidato
 * usando gpt-image-1 edit
 */
async function composePhoto({
    templateBuffer,    // Buffer da imagem template (candidato)
    voterBuffer,       // Buffer da imagem do eleitor
    sceneAnalysis,     // Análise prévia da cena (opcional, será feita se não fornecida)
    templateBase64,    // Base64 do template para análise via vision
    size = '1024x1024',
    apiKey = null,
}) {
    const key = apiKey || config.openai.apiKey;
    if (!key) throw new Error('Chave da API OpenAI não configurada.');

    const client = new OpenAI({ apiKey: key });

    console.log('📸 [PhotoComposer] Iniciando composição de foto...');

    // 1. Analisar cena se necessário
    let analysis = sceneAnalysis;
    if (!analysis && templateBase64) {
        console.log('   🔍 Analisando cena do template...');
        try {
            analysis = await analyzeTemplateScene(templateBase64, key);
            console.log('   ✅ Análise da cena concluída');
        } catch (err) {
            console.log('   ⚠️ Análise falhou, usando defaults:', err.message);
            analysis = { lighting: 'natural light', available_space: 'left side', style: 'campaign photo' };
        }
    }

    // Certificar de que temos dados de posicionamento válidos
    const spaceText = String(analysis?.available_space || 'left side').toLowerCase();
    const isVoterOnLeft = spaceText.includes('left') || spaceText.includes('esquerda');

    console.log(`   👉 Posicionando eleitor à: ${isVoterOnLeft ? 'ESQUERDA' : 'DIREITA'}`);

    // 2. Carregar imagens no Canvas
    let templateImg, voterImg;
    try {
        templateImg = await loadImage(templateBuffer);
        voterImg = await loadImage(voterBuffer);
    } catch (loadErr) {
        console.error('   ❌ Erro ao decodificar imagens com canvas:', loadErr.message);
        throw new Error('Falha ao decodificar os arquivos de imagem.');
    }

    // 3. Criar colagem (Base Image para o Edit)
    const collageCanvas = createCanvas(1024, 1024);
    const ctx = collageCanvas.getContext('2d');

    // Desenhar template do candidato esticado/ajustado para 1024x1024
    ctx.drawImage(templateImg, 0, 0, 1024, 1024);

    // Definir área do eleitor (deixando margens e preservando o rodapé para banners)
    const vw = 450;
    const vh = 650;
    const vy = 150; // Centralizado verticalmente, sem tocar a base
    const vx = isVoterOnLeft ? 50 : 524; // Posição X dependendo do espaço livre

    // Desenhar a foto do eleitor
    ctx.drawImage(voterImg, vx, vy, vw, vh);

    const collageBuffer = collageCanvas.toBuffer('image/png');

    // 4. Criar Máscara transparente (indica pra IA qual área reescrever)
    const maskCanvas = createCanvas(1024, 1024);
    const maskCtx = maskCanvas.getContext('2d');

    // Fundo preto (opaco = preservar área original do candidato/banners)
    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, 1024, 1024);

    // Área transparente (alpha 0 = IA vai redefinir e harmonizar esta área)
    maskCtx.clearRect(vx, vy, vw, vh);

    const maskBuffer = maskCanvas.toBuffer('image/png');

    // 5. Construir prompt de composição
    const compositionPrompt = buildCompositionPrompt(analysis);

    console.log('   🎨 Gerando composição com gpt-image-1...');

    let response;
    try {
        // Criar arquivos do File API nativo requeridos pela API da OpenAI
        const imageFile = new File([collageBuffer], 'collage.png', { type: 'image/png' });
        const maskFile = new File([maskBuffer], 'mask.png', { type: 'image/png' });

        response = await client.images.edit({
            model: 'gpt-image-1',
            image: imageFile,
            mask: maskFile,
            prompt: compositionPrompt,
            n: 1,
            size: size,
        });

        console.log('   ✅ Composição finalizada com gpt-image-1');
    } catch (editErr) {
        console.warn('   ⚠️ Edição com gpt-image-1 falhou. Detalhes:', editErr.message);

        // Se a chamada de IA falhar, usamos a colagem do Canvas como último fallback para não travar a aplicação!
        console.log('   ♻️ Usando colagem do Canvas como fallback seguro');
        return {
            url: `data:image/png;base64,${collageBuffer.toString('base64')}`,
            base64: collageBuffer.toString('base64'),
            revisedPrompt: 'Canvas Collage Fallback',
        };
    }

    // 6. Processar resultado da IA
    const imageData = response.data[0];

    if (imageData.b64_json) {
        const dataUrl = `data:image/png;base64,${imageData.b64_json}`;
        return {
            url: dataUrl,
            base64: imageData.b64_json,
            revisedPrompt: imageData.revised_prompt || '',
        };
    }

    return {
        url: imageData.url,
        revisedPrompt: imageData.revised_prompt || '',
    };
}

/**
 * Constrói o prompt de composição detalhado baseado na análise da cena
 */
function buildCompositionPrompt(analysis = {}) {
    const lighting = analysis.lighting || 'natural daylight';
    const space = analysis.available_space || 'next to the main person';
    const style = analysis.style || 'professional campaign photo';
    const mood = analysis.mood || 'friendly and approachable';
    const background = analysis.background || 'the existing background';
    const placement = analysis.suggested_placement || 'standing naturally beside the candidate';
    const palette = analysis.color_palette || 'natural tones';

    return `Create a perfectly natural and realistic photograph combining both people into a single scene.

CRITICAL COMPOSITION RULES:
- Both people must appear together in the SAME photograph as if they were physically present at the SAME location
- The second person should be positioned ${space}, ${placement}
- Match the EXACT lighting conditions: ${lighting}
- Maintain the EXACT color palette: ${palette}
- Keep the background: ${background}
- Match the photo style: ${style}
- The overall mood should be: ${mood}

SAFEGUARD OVERLAID GRAPHICS AND TEXTS:
- Absolute Rule: PRESERVE ALL overlaid graphics, text badges, campaign numbers, logos, and banners EXACTLY as they are.
- DO NOT recreate, distort, alter, blur, or write over any text (like names, numbers, or slogans) or solid colored bands (like orange or blue banners).
- The voter must be composited ONLY within the portrait/photographic area, blending naturally behind or with the candidate, leaving the campaign text and borders perfectly untouched.

REALISM REQUIREMENTS (MOST IMPORTANT):
- This must look like an AUTHENTIC photograph taken by a professional photographer
- NO artificial compositing artifacts whatsoever
- NO mismatched shadows, lighting direction, or color temperature
- NO obvious AI generation artifacts or "pasted" appearance
- PERFECT perspective matching — both people must share the same vanishing point
- Natural skin tones, realistic shadow casting, proper depth of field
- Clothing and hair must look naturally lit by the scene's light source
- Both people should appear to be naturally interacting or posing together
- The composition should look like both people were physically there when the photo was taken

POSE AND INTERACTION:
- Both people should appear comfortable and natural
- Natural body language as if they know each other
- Appropriate spacing between them — not too close, not too far
- Both should face the camera or interact naturally

OUTPUT: A single, high-quality professional photograph that is indistinguishable from a real camera photo.`;
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
        // URL externa — fazer download
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
