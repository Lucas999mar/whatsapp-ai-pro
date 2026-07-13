-- ══════════════════════════════════════════════════════════════
-- WhatsApp AI Pro - Módulo Planejador de Conteúdos (Trello)
-- Execute este script no Painel do Supabase > SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Quadros de Planejamento (Content Boards)
CREATE TABLE IF NOT EXISTS content_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE DEFAULT 'default',
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Colunas do Quadro (Content Columns)
CREATE TABLE IF NOT EXISTS content_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID REFERENCES content_boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    color TEXT DEFAULT '#25D366',
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Cards do Planejador (Content Cards)
CREATE TABLE IF NOT EXISTS content_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    column_id UUID REFERENCES content_columns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    position INTEGER DEFAULT 0,
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE content_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_cards ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Livre (assim como os outros módulos do app)
CREATE POLICY "Public Content Board Access" ON content_boards FOR ALL USING (true);
CREATE POLICY "Public Content Column Access" ON content_columns FOR ALL USING (true);
CREATE POLICY "Public Content Card Access" ON content_cards FOR ALL USING (true);
