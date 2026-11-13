-- ================================================================
-- TABELAS DO MÓDULO DE GESTÃO DE ANÚNCIOS & PERFORMANCE (META & GOOGLE ADS)
-- WhatsApp AI Pro
-- ================================================================

-- 1. CONTAS DE ANÚNCIOS CONECTADAS
CREATE TABLE IF NOT EXISTS ads_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    platform TEXT NOT NULL,            -- 'meta' | 'google'
    account_id TEXT NOT NULL,          -- ex: 'act_123456789' ou '123-456-7890'
    account_name TEXT NOT NULL,        -- Nome descritivo da conta
    access_token TEXT,                 -- Token de acesso Graph API / OAuth
    refresh_token TEXT,
    developer_token TEXT,
    pixel_id TEXT,
    currency TEXT DEFAULT 'BRL',
    timezone TEXT DEFAULT 'America/Sao_Paulo',
    status TEXT DEFAULT 'active',      -- 'active', 'paused', 'error'
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ads_accounts_tenant ON ads_accounts(tenant_id);

-- 2. CACHE DE MÉTRICAS & CAMPANHAS SINCRONIZADAS
CREATE TABLE IF NOT EXISTS ads_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    campaign_id TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',       -- 'ACTIVE', 'PAUSED', 'ARCHIVED'
    objective TEXT,                    -- 'OUTCOME_LEADS', 'OUTCOME_SALES', 'TRAFFIC', etc.
    daily_budget NUMERIC(12,2) DEFAULT 0,
    spend NUMERIC(12,2) DEFAULT 0,
    impressions INT DEFAULT 0,
    reach INT DEFAULT 0,
    clicks INT DEFAULT 0,
    link_clicks INT DEFAULT 0,
    ctr NUMERIC(6,2) DEFAULT 0,
    cpc NUMERIC(10,2) DEFAULT 0,
    cpm NUMERIC(10,2) DEFAULT 0,
    frequency NUMERIC(5,2) DEFAULT 1,
    leads INT DEFAULT 0,
    cpl NUMERIC(10,2) DEFAULT 0,
    purchases INT DEFAULT 0,
    cac NUMERIC(10,2) DEFAULT 0,
    revenue NUMERIC(12,2) DEFAULT 0,
    roas NUMERIC(8,2) DEFAULT 0,
    whatsapp_conversations INT DEFAULT 0,
    cost_per_whatsapp NUMERIC(10,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ads_campaigns_account ON ads_campaigns(account_id);
CREATE INDEX IF NOT EXISTS idx_ads_campaigns_tenant ON ads_campaigns(tenant_id);

-- 3. DIAGNÓSTICOS & RECOMENDAÇÕES DA IA
CREATE TABLE IF NOT EXISTS ads_ai_diagnostics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    health_score INT DEFAULT 85,        -- 0 a 100
    recommendations JSONB DEFAULT '[]'::jsonb, -- Array de ações sugeridas
    audience_suggestions JSONB DEFAULT '[]'::jsonb,
    creative_suggestions JSONB DEFAULT '[]'::jsonb,
    budget_actions JSONB DEFAULT '[]'::jsonb,
    summary_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ads_ai_diag_account ON ads_ai_diagnostics(account_id);

