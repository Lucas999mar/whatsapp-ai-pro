-- ══════════════════════════════════════════════════════════════
--  PLUGINS & CONNECTIONS SCHEMA
--  Sistema de plugins/conexões OAuth do WhatsApp AI Pro
--  Execute este SQL no Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- Tabela de conexões de plugins por tenant
CREATE TABLE IF NOT EXISTS tenant_plugins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    plugin_id TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,

    -- OAuth tokens (criptografados em produção)
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,

    -- Info da conta conectada
    account_info JSONB DEFAULT '{}',
    -- Ex: { "email": "user@gmail.com", "name": "João", "avatar": "https://..." }

    -- Configuração extra do plugin (API keys, database IDs, etc)
    config JSONB DEFAULT '{}',

    -- Metadata
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Cada tenant só pode ter UMA conexão por plugin
    UNIQUE(tenant_id, plugin_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tenant_plugins_tenant ON tenant_plugins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_plugins_plugin ON tenant_plugins(plugin_id);
CREATE INDEX IF NOT EXISTS idx_tenant_plugins_enabled ON tenant_plugins(tenant_id, enabled);

-- RLS (Row Level Security) - Opcional mas recomendado
ALTER TABLE tenant_plugins ENABLE ROW LEVEL SECURITY;

-- Política: permite tudo para service_role (backend)
CREATE POLICY "Service role full access" ON tenant_plugins
    FOR ALL USING (true) WITH CHECK (true);

-- Função para auto-atualizar updated_at
CREATE OR REPLACE FUNCTION update_tenant_plugins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenant_plugins_updated_at
    BEFORE UPDATE ON tenant_plugins
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_plugins_updated_at();
