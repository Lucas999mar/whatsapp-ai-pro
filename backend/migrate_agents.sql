-- Criar tabela de agentes (se não existir)
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
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

-- Inserir agentes existentes
INSERT INTO agents (id, tenant_id, name) VALUES
  ('default', 'default', 'Assistente Principal'),
  ('agent_1778718223571', 'default', 'vendas'),
  ('agent_1778720306293', 'Lucas', 'vendas'),
  ('agent_1778722048065', 'default', 'suporte')
ON CONFLICT (id) DO NOTHING;
