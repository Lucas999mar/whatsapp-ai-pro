-- ══════════════════════════════════════════════════════════════
-- WhatsApp AI Pro - Módulo Delivery (MIGRACAO DEFINITIVA)
-- Execute este script no Painel do Supabase > SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Campos na tabela de técnicos/motoboys (os_technicians)
ALTER TABLE os_technicians ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'tecnico';
ALTER TABLE os_technicians ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'moto';
ALTER TABLE os_technicians ADD COLUMN IF NOT EXISTS vehicle_plate TEXT;
ALTER TABLE os_technicians ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT false;
ALTER TABLE os_technicians ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 5.00;
ALTER TABLE os_technicians ADD COLUMN IF NOT EXISTS total_deliveries INTEGER DEFAULT 0;
ALTER TABLE os_technicians ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE os_technicians ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE os_technicians ADD COLUMN IF NOT EXISTS balance NUMERIC(10,2) DEFAULT 0.00;

-- Garantir que quem não tem role vire 'tecnico' inicialmente
UPDATE os_technicians SET role = 'tecnico' WHERE role IS NULL;

-- 2. Campos na tabela de tarefas (os_tasks)
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'os';
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS pickup_address TEXT;
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS pickup_lat FLOAT8;
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS pickup_lng FLOAT8;
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS delivery_lat FLOAT8;
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS delivery_lng FLOAT8;
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS estimated_km FLOAT8;
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS actual_km FLOAT8;
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS estimated_price NUMERIC(10,2);
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS tracking_code TEXT;
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS route_polyline JSONB DEFAULT '[]';

-- Atualizar CHECK constraint de status
ALTER TABLE os_tasks DROP CONSTRAINT IF EXISTS os_tasks_status_check;
ALTER TABLE os_tasks ADD CONSTRAINT os_tasks_status_check 
  CHECK (status IN ('pendente', 'agendada', 'em_deslocamento', 'em_execucao', 'concluida', 'cancelada', 'aguardando_motoboy', 'aceita', 'coletando', 'em_rota', 'entregue'));

-- 3. Campos na tabela de empresas (tenants)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS delivery_base_price NUMERIC(10,2) DEFAULT 7.00;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS delivery_km_price NUMERIC(10,2) DEFAULT 1.50;

ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS checkin_at TIMESTAMPTZ;
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS checkout_at TIMESTAMPTZ;
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS location_at_checkin JSONB;
ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS location_at_checkout JSONB;

-- 5. Tabela de Eventos (Histórico da Entrega)
CREATE TABLE IF NOT EXISTS os_task_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES os_tasks(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    description TEXT,
    lat FLOAT8,
    lng FLOAT8,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabela de Logs GPS
CREATE TABLE IF NOT EXISTS os_gps_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT,
    technician_id UUID REFERENCES os_technicians(id) ON DELETE CASCADE,
    lat FLOAT8 NOT NULL,
    lng FLOAT8 NOT NULL,
    accuracy FLOAT8,
    battery_level FLOAT8,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Tabela de Transações Financeiras (Carteira)
CREATE TABLE IF NOT EXISTS os_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT,
    technician_id UUID REFERENCES os_technicians(id) ON DELETE CASCADE,
    task_id UUID REFERENCES os_tasks(id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL,
    type TEXT CHECK (type IN ('credit', 'debit', 'withdrawal')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Função para incrementar contador de entregas (RPC)
CREATE OR REPLACE FUNCTION increment_delivery_count(motoboy_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE os_technicians 
  SET total_deliveries = COALESCE(total_deliveries, 0) + 1
  WHERE id = motoboy_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_tasks_tracking ON os_tasks(tracking_code);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON os_tasks(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_techs_available ON os_technicians(is_available, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_tracking_unique ON os_tasks(tracking_code) WHERE tracking_code IS NOT NULL;
