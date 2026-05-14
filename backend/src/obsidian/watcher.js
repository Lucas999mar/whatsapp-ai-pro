const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const { processObsidianFile } = require('./processor');
const { getSupabase } = require('../db/supabase');
const { generateEmbedding } = require('../db/repository');

// Fila de processamento para evitar gargalos ao iniciar
let processingQueue = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing || processingQueue.length === 0) return;
  isProcessing = true;
  
  const supabase = getSupabase();
  
  while (processingQueue.length > 0) {
    const task = processingQueue.shift();
    const tenantId = task.tenantId || 'default';
    
    try {
      if (task.action === 'delete' || task.action === 'update') {
        // Remove chunks antigos relacionados ao arquivo E ao tenant
        const { data: items } = await supabase.from('knowledge_items').select('id, metadata');
        const itemsToDelete = (items || []).filter(item => 
          item.metadata?.tenantId === tenantId && 
          item.metadata?.fileName === task.filePath
        );
        
        if (itemsToDelete.length > 0) {
          await supabase.from('knowledge_items').delete().in('id', itemsToDelete.map(i => i.id));
        }
      }
      
      if (task.action === 'add' || task.action === 'update') {
        // PREVENÇÃO DE DUPLICIDADE: Se for 'add', verifica se já existem itens deste arquivo para este tenant
        if (task.action === 'add') {
          const { data: existing } = await supabase
            .from('knowledge_items')
            .select('id')
            .contains('metadata', { tenantId, fileName: task.filePath })
            .limit(1);
            
          if (existing && existing.length > 0) {
            continue;
          }
        }

        const chunks = processObsidianFile(task.filePath, task.vaultPath);
        
        for (const chunk of chunks) {
          const embedding = await generateEmbedding(`${chunk.title}\n\n${chunk.content}`);
          
          await supabase.from('knowledge_items').insert({
            title: chunk.title,
            type: 'obsidian',
            content: chunk.content,
            file_name: path.basename(task.filePath),
            metadata: { 
              vault: chunk.vaultName, 
              fileName: task.filePath,
              chunkIndex: chunk.chunkIndex, 
              id: chunk.id, 
              agentId: 'unassigned',
              tenantId: tenantId
            },
            embedding
          });
        }
        
        console.log(`   📝 Obsidian [${tenantId}]: Processado "${path.basename(task.filePath)}" (${chunks.length} chunks)`);
      }
    } catch (err) {
      console.error(`   ❌ Erro na fila do Obsidian para ${task.filePath}:`, err.message);
    }
  }
  
  isProcessing = false;
}

function syncVault(vaultPath, tenantId = 'default') {
  if (!fs.existsSync(vaultPath)) throw new Error('Caminho do Vault não encontrado');
  
  const files = getAllFiles(vaultPath).filter(f => f.endsWith('.md'));
  console.log(`🔄 Sincronizando Vault do Obsidian para ${tenantId}: ${files.length} arquivos...`);
  
  files.forEach(filePath => {
    processingQueue.push({ action: 'add', filePath, vaultPath, tenantId });
  });
  
  processQueue();
}

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      if (!file.startsWith('.') && file !== 'attachments' && file !== 'assets') {
        arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
}

function startObsidianWatcher() {
  const vaultPaths = config.obsidian.vaultPaths;
  if (!vaultPaths || vaultPaths.length === 0) return;
  
  vaultPaths.forEach(vaultPath => {
    syncVault(vaultPath, 'default');
    
    const watcher = chokidar.watch(vaultPath, {
      ignored: /(^|[\/\\])\..|attachments|assets|images/,
      persistent: true,
      ignoreInitial: true,
    });
    
    watcher
      .on('add', filePath => {
        if (!filePath.endsWith('.md')) return;
        processingQueue.push({ action: 'add', filePath, vaultPath, tenantId: 'default' });
        processQueue();
      })
      .on('change', filePath => {
        if (!filePath.endsWith('.md')) return;
        processingQueue.push({ action: 'update', filePath, vaultPath, tenantId: 'default' });
        processQueue();
      })
      .on('unlink', filePath => {
        if (!filePath.endsWith('.md')) return;
        processingQueue.push({ action: 'delete', filePath, vaultPath, tenantId: 'default' });
        processQueue();
      });
  });
}

module.exports = { startObsidianWatcher, syncVault };
