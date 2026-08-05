-- ══════════════════════════════════════════════════════════════
-- WhatsApp AI Pro - Gerador de Contratos: Schema Adicional
-- Execute este script no Painel do Supabase > SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Perfil do Prestador de Serviço (dados da empresa/profissional)
CREATE TABLE IF NOT EXISTS contract_provider_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  
  -- Dados da Empresa / Prestador
  company_name VARCHAR(255) NOT NULL,
  cnpj_cpf VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  phone VARCHAR(30),
  email VARCHAR(255),
  website VARCHAR(255),
  
  -- Dados do Representante Legal
  representative_name VARCHAR(255),
  representative_cpf VARCHAR(20),
  representative_role VARCHAR(100), -- Ex: "Sócio-Administrador", "Diretor"
  
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_provider_profiles_tenant ON contract_provider_profiles(tenant_id);

-- 2. Catálogo de Serviços (serviços que o prestador oferece)
CREATE TABLE IF NOT EXISTS contract_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(12,2) DEFAULT 0,
  price_type VARCHAR(30) DEFAULT 'fixed', -- 'fixed', 'monthly', 'hourly', 'per_project'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contract_services_tenant ON contract_services(tenant_id);
