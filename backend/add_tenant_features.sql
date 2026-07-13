-- ══════════════════════════════════════════════════════════════
-- WhatsApp AI Pro - Controle de Funcionalidades por Empresa (Tenant)
-- Execute este script no Painel do Supabase > SQL Editor
-- ══════════════════════════════════════════════════════════════

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}';
