require('dotenv').config();

function parseVaultPaths() {
  const raw = process.env.OBSIDIAN_VAULT_PATHS || process.env.OBSIDIAN_VAULT_PATH || '';
  return raw.split(';').map(p => p.trim()).filter(Boolean);
}

module.exports = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    visionModel: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
    whisperModel: process.env.OPENAI_WHISPER_MODEL || 'whisper-1',
    ttsModel: process.env.OPENAI_TTS_MODEL || 'tts-1',
    ttsVoice: process.env.OPENAI_TTS_VOICE || 'nova',
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
  obsidian: {
    vaultPaths: parseVaultPaths(),
  },
  bot: {
    name: process.env.BOT_NAME || 'Assistente',
    respondAll: process.env.RESPOND_ALL === 'true',
    responseMode: process.env.RESPONSE_MODE || 'mirror', // text | audio | mirror
  },
  learning: {
    batchSize: parseInt(process.env.LEARNING_BATCH_SIZE || '20'),
  },
  server: {
    port: parseInt(process.env.PORT || '3001'),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  authDir: './auth_info',
  uploadsDir: './uploads',
};
