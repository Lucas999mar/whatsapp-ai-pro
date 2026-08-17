-- ═══════════════════════════════════════════════════════════════
-- MÓDULO: Foto com Candidato (Photo Campaign)
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Tabela de Campanhas
CREATE TABLE IF NOT EXISTS photo_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    candidate_name TEXT DEFAULT '',
    share_token TEXT UNIQUE NOT NULL,
    active BOOLEAN DEFAULT true,
    templates JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_photo_campaigns_tenant ON photo_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_photo_campaigns_token ON photo_campaigns(share_token);

-- 2. Tabela de Submissões (fotos enviadas pelos eleitores)
CREATE TABLE IF NOT EXISTS photo_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES photo_campaigns(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    template_id TEXT NOT NULL,
    voter_name TEXT DEFAULT 'Anônimo',
    voter_photo_url TEXT,
    result_url TEXT,
    status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'error')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_photo_submissions_campaign ON photo_submissions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_photo_submissions_status ON photo_submissions(status);

-- 3. RLS (Row Level Security) - Opcional mas recomendado
-- Descomente se quiser ativar RLS
-- ALTER TABLE photo_campaigns ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE photo_submissions ENABLE ROW LEVEL SECURITY;

-- Policy para leitura pública de campanhas ativas (para o link público)
-- CREATE POLICY "Campanhas ativas são públicas" ON photo_campaigns
--   FOR SELECT USING (active = true);

-- Policy para CRUD apenas do tenant dono
-- CREATE POLICY "Tenants gerenciam suas campanhas" ON photo_campaigns
--   FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true));

-- 4. Bucket Storage (execute no Supabase Dashboard > Storage)
-- Certifique-se que o bucket "uploads" existe e é PÚBLICO
-- Se não existir, crie: Storage > New Bucket > "uploads" > Public

SELECT 'Tabelas photo_campaigns e photo_submissions criadas com sucesso!' AS status;
