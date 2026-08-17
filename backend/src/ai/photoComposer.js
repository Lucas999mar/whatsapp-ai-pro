const OpenAI = require('openai');
const config = require('../config/config');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Photo Composer — Motor de composição de fotos com candidato
 * Usa gpt-image-1 (melhor modelo da OpenAI) para composição realista
 * 
 * Fluxo:
 * 1. Analisa a imagem base (candidato) via Vision para entender iluminação, ângulo, cenário
 * 2. Usa images.edit() com gpt-image-1 para compor a foto do eleitor na cena
 * 3. Retorna imagem final em alta qualidade
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
        return JSON.parse(content);
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
            analysis = { lighting: 'natural light', available_space: 'beside the person', style: 'campaign photo' };
        }
    }

    // 2. Salvar arquivos temporários para a API
    const uploadsDir = config.uploadsDir || './uploads';
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const tempCompositeId = uuidv4();
    const templatePath = path.join(uploadsDir, `compose_template_${tempCompositeId}.png`);
    const voterPath = path.join(uploadsDir, `compose_voter_${tempCompositeId}.png`);

    fs.writeFileSync(templatePath, templateBuffer);
    fs.writeFileSync(voterPath, voterBuffer);

    // 3. Construir prompt de composição ultra-detalhado
    const compositionPrompt = buildCompositionPrompt(analysis);

    console.log('   🎨 Gerando composição com gpt-image-1...');

    let response;
    try {
        // Tenta gpt-image-1 (melhor qualidade)
        response = await client.images.edit({
            model: 'gpt-image-1',
            image: [
                fs.createReadStream(templatePath),
                fs.createReadStream(voterPath),
            ],
            prompt: compositionPrompt,
            n: 1,
            size: size,
            quality: 'high',
        });
    } catch (editErr) {
        console.log('   ⚠️ Multi-image edit falhou, tentando abordagem alternativa...', editErr.message);

        // Fallback: usa apenas o template com prompt descritivo
        try {
            response = await client.images.edit({
                model: 'gpt-image-1',
                image: fs.createReadStream(templatePath),
                prompt: compositionPrompt,
                n: 1,
                size: size,
            });
        } catch (fallbackErr) {
            console.log('   ⚠️ Fallback para dall-e-2 edit...');
            response = await client.images.edit({
                model: 'dall-e-2',
                image: fs.createReadStream(templatePath),
                prompt: compositionPrompt,
                n: 1,
                size: '1024x1024',
            });
        }
    }

    // 4. Cleanup arquivos temporários
    try { fs.unlinkSync(templatePath); } catch { }
    try { fs.unlinkSync(voterPath); } catch { }

    // 5. Processar resultado
    const imageData = response.data[0];

    if (imageData.b64_json) {
        const dataUrl = `data:image/png;base64,${imageData.b64_json}`;
        console.log('   ✅ Composição finalizada com sucesso (base64)');
        return {
            url: dataUrl,
            base64: imageData.b64_json,
            revisedPrompt: imageData.revised_prompt || '',
        };
    }

    console.log('   ✅ Composição finalizada com sucesso (URL)');
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
        .from('uploads')
        .upload(fileName, buffer, {
            contentType: 'image/png',
            upsert: true,
        });

    if (error) {
        console.error('❌ [PhotoComposer] Erro ao salvar no storage:', error.message);
        throw error;
    }

    const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName);
    return urlData.publicUrl;
}

module.exports = {
    analyzeTemplateScene,
    composePhoto,
    saveComposedImage,
    buildCompositionPrompt,
};
