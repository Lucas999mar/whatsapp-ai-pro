-- ══════════════════════════════════════════════════════════════
-- WhatsApp AI Pro - Módulo Field Service (OS)
-- Execute este script no Painel do Supabase > SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Clientes do Módulo OS
CREATE TABLE IF NOT EXISTS os_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    lat FLOAT8,
    lng FLOAT8,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Técnicos de Campo
CREATE TABLE IF NOT EXISTS os_technicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    password TEXT, -- Senha decriptada (adicionado na v2)
    status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'em_servico')),
    lat FLOAT8,
    lng FLOAT8,
    last_location_at TIMESTAMPTZ,
    color TEXT DEFAULT '#25D366',
    device_info JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tipos de Tarefas (ex: Instalação, Manutenção, Venda)
CREATE TABLE IF NOT EXISTS os_task_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    estimated_duration INTEGER DEFAULT 60, -- minutos
    checklist JSONB DEFAULT '[]'
);

-- 4. Ordens de Serviço (Tarefas)
CREATE TABLE IF NOT EXISTS os_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES os_clients(id) ON DELETE SET NULL,
    technician_id UUID REFERENCES os_technicians(id) ON DELETE SET NULL,
    task_type_id UUID REFERENCES os_task_types(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'agendada', 'em_deslocamento', 'em_execucao', 'concluida', 'cancelada')),
    priority TEXT DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
    scheduled_date DATE,
    scheduled_time TIME,
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    checkin_at TIMESTAMPTZ,
    checkout_at TIMESTAMPTZ,
    location_at_checkin JSONB,
    location_at_checkout JSONB,
    photos_at_checkout TEXT[], -- URLs de fotos no storage
    signature_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Logs de GPS (Histórico de deslocamento)
CREATE TABLE IF NOT EXISTS os_gps_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES os_technicians(id) ON DELETE CASCADE,
    lat FLOAT8 NOT NULL,
    lng FLOAT8 NOT NULL,
    accuracy FLOAT8,
    battery_level INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE os_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_gps_logs ENABLE ROW LEVEL SECURITY;

-- Políticas Simples (Permitir tudo por enquanto como solicitado)
CREATE POLICY "Public OS Access" ON os_clients FOR ALL USING (true);
CREATE POLICY "Public OS Access" ON os_technicians FOR ALL USING (true);
CREATE POLICY "Public OS Access" ON os_tasks FOR ALL USING (true);
CREATE POLICY "Public OS Access" ON os_gps_logs FOR ALL USING (true);
