const fs = require('fs');
const path = require('path');
const config = require('../config/config');

function cleanMarkdown(content) {
  return content
    .replace(/^---[\s\S]*?---\n/m, '') // Remove frontmatter
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2') // Wiki links alias
    .replace(/\[\[([^\]]+)\]\]/g, '$1') // Wiki links
    .replace(/!\[.*?\]\(.*?\)/g, '') // Images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Normal links
    .replace(/#[a-zA-Z\u00C0-\u024F][^\s]*/g, '') // Tags
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitIntoChunks(text, chunkSize = config.rag.chunkSize, chunkOverlap = config.rag.chunkOverlap) {
  const chunks = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) continue;
    
    if (paragraph.length > chunkSize) {
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if ((currentChunk + ' ' + sentence).length > chunkSize && currentChunk) {
          chunks.push(currentChunk.trim());
          const words = currentChunk.split(' ');
          const overlapWords = words.slice(Math.max(0, words.length - 30));
          currentChunk = overlapWords.join(' ') + ' ' + sentence;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
      }
    } else if ((currentChunk + '\n\n' + paragraph).length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(Math.max(0, words.length - 30));
      currentChunk = overlapWords.join(' ') + '\n\n' + paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(c => c.length > 50);
}

function processObsidianFile(filePath, vaultPath) {
  try {
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const cleanContent = cleanMarkdown(rawContent);
    
    if (cleanContent.length < 50) return [];
    
    const vaultName = path.basename(vaultPath);
    const title = path.basename(filePath, '.md');
    const relativePath = path.relative(vaultPath, filePath).replace(/\\/g, '/');
    
    const chunks = splitIntoChunks(cleanContent);
    
    return chunks.map((chunk, idx) => ({
      id: `[${vaultName}] ${relativePath}#chunk${idx}`,
      title,
      vaultName,
      filePath: relativePath,
      chunkIndex: idx,
      content: chunk,
    }));
  } catch (err) {
    console.error(`Erro ao processar ${filePath}:`, err.message);
    return [];
  }
}

module.exports = { processObsidianFile };
