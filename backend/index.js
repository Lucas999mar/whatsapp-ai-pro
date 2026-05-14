require('dotenv').config();
const { startServer } = require('./src/api/server');
const { startFleet } = require('./src/whatsapp/bot');
const { startLearningEngine } = require('./src/ai/learning');
const { startObsidianWatcher } = require('./src/obsidian/watcher');

async function main() {
  console.log('🚀 Iniciando WhatsApp AI Pro...\n');
  
  // Inicia API
  startServer();
  
  // Inicia Learning Engine (Jobs em background)
  startLearningEngine();
  
  // Inicia sincronização em tempo real do Obsidian
  startObsidianWatcher();
  
  // Inicia Frota de Bots WhatsApp
  startFleet();
}

process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));

main();
