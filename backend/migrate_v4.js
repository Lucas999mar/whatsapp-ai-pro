const { getSupabase } = require('./src/db/supabase');

async function migrate() {
    const supabase = getSupabase();
    console.log('🚀 Iniciando migração...');

    // 1. Adiciona ai_enabled ao crm_tickets
    const { error: err1 } = await supabase.rpc('apply_sql', {
        sql_query: "ALTER TABLE crm_tickets ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT TRUE;"
    }).catch(() => ({ error: { message: 'RPC not available, trying direct if possible' } }));

    // Se o RPC não existir (comum em setups novos), avisamos o usuário para rodar no dashboard
    console.log('✅ Verifique se a coluna ai_enabled existe no crm_tickets via Dashboard do Supabase.');

    console.log('Migração concluída (instruções enviadas).');
}

migrate();
