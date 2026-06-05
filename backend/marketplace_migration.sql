-- ══════════════════════════════════════════════════════════════
-- Migração: Transição para Modelo Marketplace (Global + Vinculado)
-- ══════════════════════════════════════════════════════════════

-- 1. Permitir que motoboys não tenham tenant_id (serão globais)
ALTER TABLE os_technicians ALTER COLUMN tenant_id DROP NOT NULL;

-- 2. Adicionar flag de visibilidade nas entregas
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- 3. Atualizar entregas existentes para serem públicas (opcional, mas recomendado para transição)
UPDATE os_tasks SET is_public = TRUE WHERE is_public IS NULL;

-- 4. Índice para busca rápida de marketplace
CREATE INDEX IF NOT EXISTS idx_tasks_marketplace ON os_tasks(status, is_public, tenant_id) WHERE status = 'aguardando_motoboy';
