-- ══════════════════════════════════════════════════════════════
-- AUTONOMOUS AGENT ACTIONS & TASKS SCHEMA
-- Execute este script SQL no Editor de Consultas SQL do seu Supabase
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_tasks (
  id text PRIMARY KEY,                   -- Identificador único (ex: task_169485...)
  tenant_id text NOT NULL,               -- Identificador de locatário ou empresa
  agent_id text NOT NULL,                -- WhatsApp Agent vinculado
  prompt text NOT NULL,                  -- Texto do comando recebido
  status text NOT NULL DEFAULT 'running', -- running, completed, failed, timeout, error
  steps jsonb DEFAULT '[]'::jsonb,       -- Log de passos no loop ReAct (Pensamento, Ação, Observação)
  result text,                           -- Resumo/Resultado final da execução
  error text,                            -- Mensagem de erro caso venha a falhar
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_agent_tasks_tenant_id ON agent_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);

-- Habilita políticas de segurança Row Level Security (RLS)
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

-- Política simples que autoriza bypass pelo Backend usando a API key de serviço
CREATE POLICY "Allow service_role access" ON agent_tasks
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE agent_tasks IS 'Tabela que rastreia execuções e o log de pensamento passo-a-passo (ReAct Loop) do Agente Hermes';
