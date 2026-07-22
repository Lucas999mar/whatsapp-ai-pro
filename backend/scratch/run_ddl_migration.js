const { getSupabase } = require('../src/db/supabase');
require('dotenv').config();

const sql = `
CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'operator',
  features JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_users_email ON tenant_users(email);

ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Tenant Users Access" ON tenant_users;
CREATE POLICY "Public Tenant Users Access" ON tenant_users FOR ALL USING (true);
`;

async function execute() {
  const supabase = getSupabase();
  console.log('🚀 Tentando executar migração SQL...');

  // 1. Tenta rpc 'run_sql'
  try {
    const { data, error } = await supabase.rpc('run_sql', { sql });
    if (error) {
      console.log('❌ rpc run_sql falhou:', error.message);
    } else {
      console.log('✅ rpc run_sql executado com sucesso!', data);
      return;
    }
  } catch (err) {
    console.log('❌ rpc run_sql erro capturado:', err.message);
  }

  // 2. Tenta rpc 'apply_sql'
  try {
    const { data, error } = await supabase.rpc('apply_sql', { sql_query: sql });
    if (error) {
      console.log('❌ rpc apply_sql falhou:', error.message);
    } else {
      console.log('✅ rpc apply_sql executado com sucesso!', data);
      return;
    }
  } catch (err) {
    console.log('❌ rpc apply_sql erro capturado:', err.message);
  }

  console.log('⚠️ Nenhum dos RPCs padrão conseguiu criar a tabela.');
}

execute();
