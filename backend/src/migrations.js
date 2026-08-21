/**
 * Auto-migration: ensures required tables exist on startup.
 */
const { getSupabase } = require('./db/supabase');

async function runMigrations() {
  const supabase = getSupabase();
  console.log('🔄 Verificando migrações pendentes...');

  // 1. Tabela tenant_users
  try {
    const { error } = await supabase.from('tenant_users').select('id').limit(1);
    if (error && (error.code === '42P01' || error.message.includes('relation "tenant_users" does not exist'))) {
      console.log('⚠️ Tabela tenant_users não encontrada. Criando via SQL...');
      const sql = `
        CREATE TABLE IF NOT EXISTS tenant_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'operator',
          features JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
        ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public Tenant Users Access" ON tenant_users;
        CREATE POLICY "Public Tenant Users Access" ON tenant_users FOR ALL USING (true);
      `;
      const { error: rpcErr } = await supabase.rpc('exec_sql', { sql_query: sql });
      if (rpcErr) throw rpcErr;
      console.log('✅ Tabela tenant_users criada com sucesso.');
    } else {
      console.log('✅ Tabela tenant_users já existe.');
    }
  } catch (err) {
    console.log('⚠️ Falha ao verificar/criar tenant_users:', err.message);
  }

  // 2. Tabela whatsapp_opt_ins
  try {
    const { error } = await supabase.from('whatsapp_opt_ins').select('id').limit(1);
    if (error && (error.code === '42P01' || error.message.includes('relation "whatsapp_opt_ins" does not exist'))) {
      console.log('⚠️ Tabela whatsapp_opt_ins não encontrada. Criando via SQL...');
      const sql = `
        CREATE TABLE IF NOT EXISTS whatsapp_opt_ins (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          phone_number TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
          pending_message TEXT,
          pending_media JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT unique_tenant_phone UNIQUE (tenant_id, phone_number)
        );
        CREATE INDEX IF NOT EXISTS idx_whatsapp_opt_ins_tenant ON whatsapp_opt_ins(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_whatsapp_opt_ins_phone ON whatsapp_opt_ins(phone_number);
        
        ALTER TABLE whatsapp_opt_ins ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public WhatsApp Opt-Ins Access" ON whatsapp_opt_ins;
        CREATE POLICY "Public WhatsApp Opt-Ins Access" ON whatsapp_opt_ins FOR ALL USING (true);
      `;
      const { error: rpcErr } = await supabase.rpc('exec_sql', { sql_query: sql });
      if (rpcErr) throw rpcErr;
      console.log('✅ Tabela whatsapp_opt_ins criada com sucesso.');
    } else {
      console.log('✅ Tabela whatsapp_opt_ins já existe.');
    }
  } catch (err) {
    console.log('⚠️ Falha ao verificar/criar whatsapp_opt_ins:', err.message);
    console.log('📋 Execute o SQL de migração manualmente se necessário (whatsapp_opt_ins_migration.sql)');
  }
}

module.exports = { runMigrations };

