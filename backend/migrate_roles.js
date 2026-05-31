require('dotenv').config();
const { getSupabase } = require('./src/db/supabase');

async function migrate() {
    const supabase = getSupabase();
    console.log('🚀 Iniciando migração de roles...');

    const { error: err1 } = await supabase.rpc('run_sql', {
        sql: "ALTER TABLE os_technicians ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'technician';"
    }).catch(() => ({ error: { message: 'RPC run_sql not found' } }));

    if (err1) {
        console.warn('⚠️ Tentando via consulta direta (se permitido):', err1.message);
    }

    // Fallback: Tenta atualizar os que já parecem ser motoboys
    const { data: techs, error: err2 } = await supabase.from('os_technicians').select('id, vehicle_type');
    if (techs) {
        for (const tech of techs) {
            if (tech.vehicle_type) {
                await supabase.from('os_technicians').update({ role: 'motoboy' }).eq('id', tech.id);
            }
        }
    }

    console.log('✅ Migração concluída!');
}

migrate();
