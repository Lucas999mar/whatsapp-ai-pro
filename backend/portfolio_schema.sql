-- ================================================================
-- TABELAS DO MÓDULO DE PORTFÓLIO E PROPOSTAS COMERCIAIS
-- WhatsApp AI Pro
-- ================================================================

-- 1. NICHOS DE ATUAÇÃO
CREATE TABLE IF NOT EXISTS portfolio_niches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'Briefcase',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_niches_tenant ON portfolio_niches(tenant_id);

-- 2. SERVIÇOS PRESTADOS
CREATE TABLE IF NOT EXISTS portfolio_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    price_estimate NUMERIC(12,2) DEFAULT 0,
    deliverables JSONB DEFAULT '[]'::jsonb,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_services_tenant ON portfolio_services(tenant_id);

-- 3. ITENS DE PORTFÓLIO (CASES DE SUCESSO COM FOTOS E VÍDEOS)
CREATE TABLE IF NOT EXISTS portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    client_name TEXT,
    niche_id TEXT,
    niche_name TEXT,
    service_id TEXT,
    service_name TEXT,
    description TEXT,
    media JSONB DEFAULT '[]'::jsonb, -- Array de objetos: [{ type: 'image'|'video', url: '...', thumbnail: '...', caption: '...' }]
    results_metric TEXT,             -- Ex: "+340% de conversão", "1.200 leads"
    testimonial TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    featured BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_items_tenant ON portfolio_items(tenant_id);

-- 4. PROPOSTAS COMERCIAIS PERSONALIZADAS
CREATE TABLE IF NOT EXISTS portfolio_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_company TEXT,
    client_phone TEXT,
    client_email TEXT,
    title TEXT NOT NULL,
    niche_name TEXT,
    selected_services JSONB DEFAULT '[]'::jsonb,       -- Lista dos tipos de serviços incluídos
    selected_portfolio_ids JSONB DEFAULT '[]'::jsonb,   -- IDs dos cases demonstrados na proposta
    intro_text TEXT,
    scope_text TEXT,
    investment_value NUMERIC(12,2) DEFAULT 0,
    payment_terms TEXT,
    timeline TEXT,
    status TEXT DEFAULT 'sent',                        -- 'draft', 'sent', 'viewed', 'approved', 'declined'
    share_token TEXT UNIQUE NOT NULL,
    views INT DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_proposals_tenant ON portfolio_proposals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_proposals_token ON portfolio_proposals(share_token);

