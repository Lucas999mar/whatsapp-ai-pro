-- ══════════════════════════════════════════════════════════════
-- MINDMAPS TABLE - Módulo de Mapas Mentais
-- Execute este SQL no Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mindmaps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id text NOT NULL,
  title text NOT NULL DEFAULT 'Novo Mapa',
  description text,
  template text DEFAULT 'blank',
  nodes text DEFAULT '[]',        -- JSON stringified array of nodes
  edges text DEFAULT '[]',        -- JSON stringified array of edges
  thumbnail_color text DEFAULT '#8B5CF6',
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Índice para busca rápida por tenant
CREATE INDEX IF NOT EXISTS idx_mindmaps_tenant_id ON mindmaps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mindmaps_updated_at ON mindmaps(updated_at DESC);

-- Habilita RLS (Row Level Security)
ALTER TABLE mindmaps ENABLE ROW LEVEL SECURITY;

-- Policy: permite todas as operações via service_key (backend)
CREATE POLICY "Allow all via service key" ON mindmaps
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comentário na tabela
COMMENT ON TABLE mindmaps IS 'Mapas mentais, fluxogramas, brainstorms e diagramas';
