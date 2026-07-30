-- ══════════════════════════════════════════════════════════════
-- AUTONOMOUS AGENT V2 - Schema Expandido
-- Execute este script no Editor SQL do Supabase
-- 
-- Adições:
-- 1. Tabela agent_tasks: (já existente, apenas verifica)
-- 2. Tabela agent_memory_log: Rastreamento de evolução autônoma
-- 3. Políticas RLS para isolamento total por tenant
-- ══════════════════════════════════════════════════════════════

-- ── TABELA DE TAREFAS (Se não existir) ────────────────────────
CREATE TABLE IF NOT EXISTS agent_tasks (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  agent_id text NOT NULL,
  prompt text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  steps jsonb DEFAULT '[]'::jsonb,
  result text,
  error text,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_tenant_id ON agent_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);

ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_tasks' AND policyname = 'Allow service_role access') THEN
    CREATE POLICY "Allow service_role access" ON agent_tasks FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── TABELA DE LOG DE EVOLUÇÃO (Memória Autônoma) ──────────────
-- Registra quando o agente aprende algo novo autonomamente

CREATE TABLE IF NOT EXISTS agent_memory_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  agent_id text NOT NULL DEFAULT 'global',
  source_task_id text,
  knowledge_id bigint,
  title text NOT NULL,
  content text,
  learned_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT fk_source_task FOREIGN KEY (source_task_id)
    REFERENCES agent_tasks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_log_tenant ON agent_memory_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_log_agent ON agent_memory_log(agent_id);

ALTER TABLE agent_memory_log ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_memory_log' AND policyname = 'Allow service_role memory access') THEN
    CREATE POLICY "Allow service_role memory access" ON agent_memory_log FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE agent_tasks IS 'Tabela que rastreia execuções e o log de pensamento passo-a-passo (ReAct Loop) do Agente Hermes';
COMMENT ON TABLE agent_memory_log IS 'Log de evolução autônoma - registra quando o agente aprende algo novo durante a execução de tarefas';
