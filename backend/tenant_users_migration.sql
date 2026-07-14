-- ══════════════════════════════════════════════════════════════
-- WhatsApp AI Pro - Tabela de Usuários / Colaboradores por Empresa
-- Execute este script no Painel do Supabase > SQL Editor
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'operator', -- ex: 'Gerente', 'Vendedor', 'Suporte'
  features JSONB DEFAULT '{}', -- Permissões customizadas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para busca rápida e isolamento de tenant
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_users_email ON tenant_users(email);

-- Habilitar RLS (Row Level Security) - Como o projeto usa acesso aberto para as tabelas por política pública por enquanto:
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Tenant Users Access" ON tenant_users FOR ALL USING (true);
