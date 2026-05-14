const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const ws = require('ws');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
  global: { headers: { 'x-my-custom-header': 'my-app' } },
  realtime: { transport: ws }
});

async function sync() {
  console.log('🚀 Iniciando sincronização para Supabase...');

  // 1. Sync Tenants
  const tenantsFile = path.resolve(__dirname, '../api/tenants.json');
  if (fs.existsSync(tenantsFile)) {
    const tenants = JSON.parse(fs.readFileSync(tenantsFile, 'utf8'));
    console.log(`📦 Sincronizando ${tenants.length} empresas...`);
    for (const t of tenants) {
      const { error } = await supabase.from('tenants').upsert({
        id: t.id,
        name: t.name,
        password: t.password,
        role: t.role || 'company',
        status: t.status || 'active',
        logo: t.logo || null
      });
      if (error) console.error(`❌ Erro no tenant ${t.id}:`, error.message);
    }
  }

  // 2. Sync Agents
  const agentsFile = path.resolve(__dirname, '../../agents.json');
  if (fs.existsSync(agentsFile)) {
    const agents = JSON.parse(fs.readFileSync(agentsFile, 'utf8'));
    console.log(`📦 Sincronizando ${agents.length} agentes...`);
    for (const a of agents) {
      const { error } = await supabase.from('agents').upsert({
        id: a.id,
        tenant_id: a.tenantId || 'default',
        name: a.name,
        settings: a.settings || {
          bot_name: a.name,
          system_prompt: 'Você é um assistente amigável.',
          response_mode: 'mirror',
          tts_voice: 'nova',
          prefix: '!ia',
          respond_all: true
        }
      });
      if (error) console.error(`❌ Erro no agente ${a.id}:`, error.message);
    }
  }

  console.log('✅ Sincronização concluída!');
}

sync().catch(console.error);
