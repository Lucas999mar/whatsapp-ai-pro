-- ── TICKETS (Controle de Atendimento) ──────────────────────────
CREATE TABLE IF NOT EXISTS crm_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE DEFAULT 'default',
  whatsapp_id TEXT NOT NULL,
  status TEXT DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'atendendo', 'resolvido')),
  assigned_user_id TEXT, -- ID do usuário (atendente) do backend
  last_message TEXT,
  contact_name TEXT,
  contact_photo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_tickets_whatsapp_id_idx ON crm_tickets(whatsapp_id);
CREATE INDEX IF NOT EXISTS crm_tickets_status_idx ON crm_tickets(status);

-- ── KANBAN COLUMNS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE DEFAULT 'default',
  title TEXT NOT NULL,
  color TEXT DEFAULT '#25D366',
  position INTEGER DEFAULT 0,
  is_finalized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── KANBAN CARDS (Leads) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_kanban_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE DEFAULT 'default',
  column_id UUID REFERENCES crm_kanban_columns(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES crm_tickets(id) ON DELETE SET NULL,
  whatsapp_id TEXT NOT NULL,
  name TEXT,
  last_message TEXT,
  position INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserindo colunas padrão
INSERT INTO crm_kanban_columns (title, color, position) VALUES 
('Novo Lead', '#3b82f6', 0),
('Em Qualificação', '#eab308', 1),
('Proposta Enviada', '#a855f7', 2),
('Concluido', '#25d366', 3)
ON CONFLICT DO NOTHING;
