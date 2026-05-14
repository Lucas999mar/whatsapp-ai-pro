-- ============================================================
-- MIGRAÇÃO: Criar tabela de Tenants no Supabase
-- Execute este SQL no SQL Editor do Supabase
-- ============================================================

-- Tabela de Empresas
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'company' CHECK (role IN ('superadmin', 'company')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  logo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir empresas existentes
INSERT INTO tenants (id, name, password, role, status) VALUES
  ('admin', 'Super Admin', 'admin', 'superadmin', 'active'),
  ('default', 'Minha Empresa', '123', 'company', 'active'),
  ('Lucas', 'Evoluir', '198236', 'company', 'active')
ON CONFLICT (id) DO NOTHING;
