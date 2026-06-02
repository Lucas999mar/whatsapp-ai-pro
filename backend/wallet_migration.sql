-- ══════════════════════════════════════════════════════════════
-- Migração Completa: Marketplace de Entregas & Wallet
-- ══════════════════════════════════════════════════════════════

-- 1. SALDO E CARTEIRA DO MOTOBOY
ALTER TABLE os_technicians ADD COLUMN IF NOT EXISTS balance NUMERIC(10,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS os_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    technician_id UUID NOT NULL REFERENCES os_technicians(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'withdrawal')),
    description TEXT,
    task_id UUID REFERENCES os_tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CAMPOS DE DIVISÃO DE RECEITA NA TABELA DE PEDIDOS
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS motoboy_amount NUMERIC(10,2);
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS system_fee NUMERIC(10,2);
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'entrega';
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS global_config_used BOOLEAN DEFAULT false;

-- 3. TABELA DE CONFIGURAÇÕES GLOBAIS (SUPER ADMIN)
CREATE TABLE IF NOT EXISTS os_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT UNIQUE DEFAULT 'SYSTEM_GLOBAL',
    base_price NUMERIC(10,2) DEFAULT 7.00,
    km_price NUMERIC(10,2) DEFAULT 1.50,
    system_tax NUMERIC(10,2) DEFAULT 0.20,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. INSERIR CONFIGURAÇÃO PADRÃO (Se não existir)
INSERT INTO os_config (tenant_id, base_price, km_price, system_tax)
VALUES ('SYSTEM_GLOBAL', 7.00, 1.50, 0.20)
ON CONFLICT (tenant_id) DO NOTHING;

-- 5. TRIGGER DE SALDO AUTOMÁTICO
CREATE OR REPLACE FUNCTION update_tech_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.type = 'credit') THEN
        UPDATE os_technicians SET balance = balance + NEW.amount WHERE id = NEW.technician_id;
    ELSIF (NEW.type = 'debit' OR NEW.type = 'withdrawal') THEN
        UPDATE os_technicians SET balance = balance - NEW.amount WHERE id = NEW.technician_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_balance ON os_transactions;
CREATE TRIGGER trg_update_balance
AFTER INSERT ON os_transactions
FOR EACH ROW EXECUTE FUNCTION update_tech_balance();

-- 6. ATUALIZAR PEDIDOS ANTIGOS PARA APARECEREM NO DELIVERY (Fallback)
UPDATE os_tasks SET delivery_type = 'entrega' WHERE delivery_type IS NULL AND technician_id IS NOT NULL;
