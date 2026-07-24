-- ══════════════════════════════════════════════════════════════
-- WhatsApp AI Pro - Tabela de Analytics de Redes Sociais
-- Execute este script no Painel do Supabase > SQL Editor
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS social_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL, -- 'instagram', 'tiktok', 'youtube', 'facebook', 'kwai'
  account_name VARCHAR(255) NOT NULL, -- ex: '@meunegocio' ou 'Nome do Canal'
  avatar_url TEXT,
  auth_type VARCHAR(50) NOT NULL, -- 'oauth' (oficial) ou 'link' (raspagem)
  auth_data JSONB DEFAULT '{}'::jsonb, -- Armazena tokens ou URLs públicas
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'error'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS social_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  connection_id UUID REFERENCES social_connections(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  followers INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  engagement_rate FLOAT DEFAULT 0.0,
  trends JSONB DEFAULT '[]'::jsonb,
  recent_posts JSONB DEFAULT '[]'::jsonb,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para busca rápida e isolamento de tenant
CREATE INDEX IF NOT EXISTS idx_social_connections_tenant ON social_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_social_metrics_connection ON social_metrics(connection_id);
CREATE INDEX IF NOT EXISTS idx_social_metrics_tenant ON social_metrics(tenant_id);
