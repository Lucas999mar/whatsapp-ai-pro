-- ══════════════════════════════════════════════════════════════
-- WhatsApp AI Pro - Tabela de Contratos e Assinaturas Online
-- Execute este script no Painel do Supabase > SQL Editor
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT, -- Conteúdo em texto/HTML do contrato se editado no sistema
  file_url TEXT, -- Link do PDF carregado (caso subam um contrato pronto)
  status VARCHAR(50) DEFAULT 'draft', -- 'draft' (rascunho), 'pending' (pendente de assinatura), 'signed' (assinado), 'canceled' (cancelado)
  
  -- Dados do signatário (cliente)
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  client_document VARCHAR(50), -- CPF ou CNPJ
  
  -- Info da Assinatura
  signature_url TEXT, -- Imagem PNG da assinatura salva no Storage do Supabase
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_ip VARCHAR(45),
  signed_user_agent TEXT,
  signed_hash VARCHAR(255), -- hash/código de autenticidade (audit trail)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para busca rápida e isolamento de tenant
CREATE INDEX IF NOT EXISTS idx_contracts_tenant ON contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
