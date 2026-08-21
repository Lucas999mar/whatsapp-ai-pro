-- ============================================================
-- WhatsApp AI Pro - Migration: WhatsApp Opt-Ins
-- Execute este SQL no editor SQL do Supabase caso a
-- migração automática falhe.
-- ============================================================

CREATE TABLE IF NOT EXISTS whatsapp_opt_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
  pending_message TEXT,
  pending_media JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_tenant_phone UNIQUE (tenant_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_opt_ins_tenant ON whatsapp_opt_ins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_opt_ins_phone ON whatsapp_opt_ins(phone_number);

-- RLS habilitada
ALTER TABLE whatsapp_opt_ins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public WhatsApp Opt-Ins Access" ON whatsapp_opt_ins;
CREATE POLICY "Public WhatsApp Opt-Ins Access" ON whatsapp_opt_ins FOR ALL USING (true);
