require('dotenv').config();
const { getSupabase } = require('./src/db/supabase');

async function migrate() {
    const supabase = getSupabase();
    console.log('🚀 Iniciando migração de preços (v2)...');

    try {
        const { error } = await supabase.rpc('run_sql', {
            sql: `
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS delivery_base_price NUMERIC(10,2) DEFAULT 7.00;
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS delivery_km_price NUMERIC(10,2) DEFAULT 1.50;
      `
        });

        if (error) {
            console.warn('⚠️ Erro ao executar SQL:', error.message);
        } else {
            console.log('✅ SQL executado com sucesso via RPC.');
        }
    } catch (err) {
        console.warn('⚠️ Erro ao tentar RPC:', err.message);
    }

    console.log('✅ Migração de preços concluída!');
}

migrate();
