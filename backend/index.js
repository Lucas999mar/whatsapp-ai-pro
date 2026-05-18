require('dotenv').config();
const { startServer } = require('./src/api/server');
const { startFleet } = require('./src/whatsapp/bot');
const { startLearningEngine } = require('./src/ai/learning');
const { startObsidianWatcher } = require('./src/obsidian/watcher');
const { startScheduler } = require('./src/whatsapp/scheduler');
const { startTelegramFleet } = require('./src/telegram/bot');

async function main() {
  console.log('🚀 Iniciando WhatsApp AI Pro...\n');
  
  // Inicia API (sempre)
  startServer();
  
  // Inicia Learning Engine (Jobs em background)
  try {
    startLearningEngine();
  } catch (e) {
    console.warn('⚠️ Learning Engine não iniciou:', e.message);
  }
  
  // Inicia sincronização do Obsidian (apenas se houver paths configurados e existirem)
  try {
    startObsidianWatcher();
  } catch (e) {
    console.warn('⚠️ Obsidian Watcher não iniciou:', e.message);
  }
  
  // Inicia Frota de Bots WhatsApp
  try {
    await startFleet();
  } catch (e) {
    console.error('⚠️ Fleet não iniciou:', e.message);
  }

  // Inicia Frota de Bots Telegram
  try {
    await startTelegramFleet();
  } catch (e) {
    console.error('⚠️ Telegram Fleet não iniciou:', e.message);
  }

  // Inicia Scheduler de Follow-up
  try {
    startScheduler();
  } catch (e) {
    console.warn('⚠️ Follow-up Scheduler não iniciou:', e.message);
  }
}

process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));

main();
