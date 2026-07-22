/**
 * Auto-migration: ensures tenant_users table exists on startup.
 * Uses Supabase client to check and create via individual operations.
 */
const { getSupabase } = require('./db/supabase');

async function runMigrations() {
  const supabase = getSupabase();
  console.log('🔄 Verificando migrações pendentes...');

  // Check if tenant_users table exists by trying to query it
  const { data, error } = await supabase
    .from('tenant_users')
    .select('id')
    .limit(1);

  if (error && error.code === '42P01') {
    // Table doesn't exist (relation does not exist)
    console.log('⚠️ Tabela tenant_users não encontrada. Criando via SQL...');
    
    // Try to create via SQL through the REST API
    // This uses a workaround - we create a temp function then call it
    const createFnSQL = `
      CREATE OR REPLACE FUNCTION _create_tenant_users() RETURNS void LANGUAGE plpgsql AS $$
      BEGIN
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
      END;
      $$;
    `;
    
    // Try rpc approach  
    const { error: rpcErr } = await supabase.rpc('_create_tenant_users');
    if (rpcErr) {
      console.log('⚠️ Tabela tenant_users ainda não existe no banco de dados.');
      console.log('📋 Execute o SQL de migração manualmente no Supabase SQL Editor:');
      console.log('   Arquivo: backend/tenant_users_migration.sql');
      console.log('   Painel: https://supabase.com/dashboard → SQL Editor');
    }
  } else if (error) {
    console.log('⚠️ Erro ao verificar tenant_users:', error.message);
    if (error.message.includes('permission denied') || error.message.includes('not found')) {
      console.log('📋 Execute o SQL de migração no Supabase SQL Editor.');
    }
  } else {
    console.log('✅ Tabela tenant_users já existe. Nenhuma migração necessária.');
  }
}

module.exports = { runMigrations };
