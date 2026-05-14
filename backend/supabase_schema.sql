-- ============================================================
-- WhatsApp AI Pro - Schema Supabase
-- Execute este SQL no editor SQL do Supabase
-- ============================================================

-- Habilita extensão de vetores
CREATE EXTENSION IF NOT EXISTS vector;

-- ── TENANTS (EMPRESAS) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,             -- ex: 'default', 'lucas'
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'company' CHECK (role IN ('superadmin', 'company')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  logo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── AGENTS (BOTS) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,             -- JID do WhatsApp ou UUID
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'disconnected',
  qr_code TEXT,
  settings JSONB DEFAULT '{
    "bot_name": "Assistente",
    "system_prompt": "",
    "response_mode": "mirror",
    "tts_voice": "nova"
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── KNOWLEDGE BASE ────────────────────────────────────────────
-- Armazena todos os itens da base de conhecimento
CREATE TABLE IF NOT EXISTS knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('document', 'image', 'audio', 'video', 'obsidian', 'learning')),
  content TEXT,                    -- texto extraído / transcrição / descrição
  file_url TEXT,                   -- URL do arquivo no Supabase Storage
  file_name TEXT,
  file_size INTEGER,
  metadata JSONB DEFAULT '{}',     -- info extra (páginas, duração, vault, etc)
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id TEXT,                   -- 'unassigned' ou ID do agente
  embedding VECTOR(1536),          -- embedding do conteúdo
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca vetorial
CREATE INDEX IF NOT EXISTS knowledge_embedding_idx 
  ON knowledge_items USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ── CONVERSATIONS ─────────────────────────────────────────────
-- Armazena todas as conversas do WhatsApp
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_id TEXT NOT NULL,       -- JID do usuário (número@s.whatsapp.net)
  user_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'audio', 'image', 'document')),
  media_url TEXT,                  -- se for mídia, URL no storage
  knowledge_used JSONB,            -- quais itens da KB foram usados
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversations_whatsapp_id_idx ON conversations(whatsapp_id);
CREATE INDEX IF NOT EXISTS conversations_created_at_idx ON conversations(created_at DESC);

-- ── LEARNINGS ─────────────────────────────────────────────────
-- Conhecimentos extraídos automaticamente das conversas
CREATE TABLE IF NOT EXISTS learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,           -- o aprendizado em si
  source TEXT DEFAULT 'conversation', -- de onde veio
  conversations_batch INTEGER,     -- qual lote de conversas gerou isso
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── BOT SETTINGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bot_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  bot_name TEXT DEFAULT 'Assistente',
  system_prompt TEXT,
  response_mode TEXT DEFAULT 'mirror',
  tts_voice TEXT DEFAULT 'nova',
  active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO bot_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── FUNÇÃO DE BUSCA VETORIAL ──────────────────────────────────
CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding VECTOR(1536),
  match_count INTEGER DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  type TEXT,
  content TEXT,
  file_url TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.title,
    k.type,
    k.content,
    k.file_url,
    k.metadata,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM knowledge_items k
  WHERE k.embedding IS NOT NULL
    AND (k.tenant_id = p_tenant_id OR p_tenant_id IS NULL)
    AND (k.agent_id = 'global' OR k.agent_id = p_agent_id OR k.agent_id IS NULL)
    AND 1 - (k.embedding <=> query_embedding) > similarity_threshold
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ── STORAGE BUCKETS ──────────────────────────────────────────
-- Execute no painel do Supabase > Storage > Buckets:
-- Criar bucket "knowledge-files" com acesso público
