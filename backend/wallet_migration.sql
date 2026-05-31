-- ══════════════════════════════════════════════════════════════
-- Wallet & Financial System - Module Delivery
-- ══════════════════════════════════════════════════════════════

-- 1. Saldo do Motoboy
ALTER TABLE os_technicians ADD COLUMN IF NOT EXISTS balance NUMERIC(10,2) DEFAULT 0;

-- 2. Tabela de Transações (Histórico Financeiro)
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

-- 3. Índices para performance financeira
CREATE INDEX IF NOT EXISTS idx_transactions_tech ON os_transactions(technician_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON os_transactions(tenant_id);

-- 4. Função para atualizar saldo automaticamente ao inserir transação
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
