const fs = require('fs');
const path = require('path');
const pdfImg = require('pdf-img-convert');
const { OpenAI } = require('openai');
const { addKnowledgeItem } = require('./src/db/repository');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TENANT_ID = 'Gustavo Lopes';
const BASE_DIR = path.join('C:', 'Users', 'lucas', 'Downloads', 'opencl', 'lorenzetti_vistas_explodidas');

async function extractCodesWithVision(imageBuffer, modelName) {
    console.log(`🧠 IA analisando imagem de ${modelName}...`);
    const base64Image = imageBuffer.toString('base64');
    
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Modelo com visão
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: `Liste todos os códigos e nomes de peças presentes nesta vista explodida do produto ${modelName}. Retorne em formato de lista clara.` },
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                ],
            },
        ],
    });
    return response.choices[0].message.content;
}

async function processScannedPDFs(dirPath, categoryName) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            await processScannedPDFs(filePath, file);
        } else if (file.toLowerCase().endsWith('.pdf')) {
            // Só processa se for um dos que sabemos que são imagem (ou se quiser reprocessar todos)
            if (file.includes('JET_TURBO') || file.includes('MASTER') || file.includes('BLIND')) {
                console.log(`\n📸 Iniciando OCR Vision em: ${file}`);
                try {
                    const pdfArray = await pdfImg.convert(filePath, { width: 1200 });
                    for (let i = 0; i < pdfArray.length; i++) {
                        const extractedText = await extractCodesWithVision(Buffer.from(pdfArray[i]), file);
                        
                        await addKnowledgeItem({
                            title: `Códigos Extraídos: ${file} (Página ${i+1})`,
                            type: 'document',
                            content: `DETALHAMENTO TÉCNICO (EXTRAÍDO POR VISÃO):\nProduto: ${file}\n\n${extractedText}`,
                            fileName: file,
                            agentId: 'global',
                            tenantId: TENANT_ID,
                            metadata: { categoria: categoryName, modelo: file, source: 'vision_ocr', page: i+1 }
                        });
                        console.log(`✅ Página ${i+1} processada e códigos salvos.`);
                        await new Promise(r => setTimeout(r, 1000)); // Evita rate limit
                    }
                } catch (e) {
                    console.error(`❌ Erro no Vision para ${file}:`, e.message);
                }
            }
        }
    }
}

async function start() {
    console.log('🚀 Iniciando extração de códigos via Visão Computacional...');
    await processScannedPDFs(BASE_DIR, 'Geral');
    console.log('🎉 Fim do processamento de visão!');
    process.exit(0);
}

start();
