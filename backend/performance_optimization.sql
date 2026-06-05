-- ══════════════════════════════════════════════════════════════
-- WhatsApp AI Pro - Performance Optimization (v2 - Fail-Safe)
-- Execute este script no Painel do Supabase > SQL Editor
-- ══════════════════════════════════════════════════════════════

DO $$ 
BEGIN
    -- 1. Adicionar colunas faltantes para melhor performance
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='tenant_id') THEN
        ALTER TABLE conversations ADD COLUMN tenant_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='learnings' AND column_name='tenant_id') THEN
        ALTER TABLE learnings ADD COLUMN tenant_id TEXT;
        ALTER TABLE learnings ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;

    -- 2. Criar Índices de tenant_id apenas se a coluna existir
    -- knowledge_items
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='knowledge_items' AND column_name='tenant_id') THEN
        CREATE INDEX IF NOT EXISTS knowledge_items_tenant_id_idx ON knowledge_items(tenant_id);
    END IF;

    -- agents
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agents' AND column_name='tenant_id') THEN
        CREATE INDEX IF NOT EXISTS agents_tenant_id_idx ON agents(tenant_id);
    END IF;

    -- os_clients
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='os_clients' AND column_name='tenant_id') THEN
        CREATE INDEX IF NOT EXISTS os_clients_tenant_id_idx ON os_clients(tenant_id);
    END IF;

    -- os_tasks
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='os_tasks' AND column_name='tenant_id') THEN
        CREATE INDEX IF NOT EXISTS os_tasks_tenant_id_idx ON os_tasks(tenant_id);
    END IF;

    -- os_technicians
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='os_technicians' AND column_name='tenant_id') THEN
        CREATE INDEX IF NOT EXISTS os_technicians_tenant_id_idx ON os_technicians(tenant_id);
    END IF;

    -- os_task_types
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='os_task_types' AND column_name='tenant_id') THEN
        CREATE INDEX IF NOT EXISTS os_task_types_tenant_id_idx ON os_task_types(tenant_id);
    END IF;

    -- os_gps_logs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='os_gps_logs' AND column_name='tenant_id') THEN
        CREATE INDEX IF NOT EXISTS os_gps_logs_tenant_id_idx ON os_gps_logs(tenant_id);
    END IF;

    -- conversations
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='tenant_id') THEN
        CREATE INDEX IF NOT EXISTS conversations_tenant_id_idx ON conversations(tenant_id);
    END IF;

    -- learnings
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='learnings' AND column_name='tenant_id') THEN
        CREATE INDEX IF NOT EXISTS learnings_tenant_id_idx ON learnings(tenant_id);
    END IF;

END $$;

-- 3. Índices GIN para busca em metadados (JSONB)
CREATE INDEX IF NOT EXISTS knowledge_items_metadata_idx ON knowledge_items USING GIN (metadata);
CREATE INDEX IF NOT EXISTS learnings_metadata_idx ON learnings USING GIN (metadata) WHERE metadata IS NOT NULL;

-- 4. Índice para busca de técnicos por email e senha (Login)
CREATE INDEX IF NOT EXISTS os_technicians_email_idx ON os_technicians(email);
CREATE INDEX IF NOT EXISTS os_technicians_login_idx ON os_technicians(email, password);

-- 5. Índice para busca de tenants por password
CREATE INDEX IF NOT EXISTS tenants_password_idx ON tenants(id, password);

-- 6. Otimização de busca de conversas por prefixo de tenant (caso tenant_id ainda não esteja populado)
CREATE INDEX IF NOT EXISTS conversations_tenant_prefix_idx ON conversations (whatsapp_id text_pattern_ops);
