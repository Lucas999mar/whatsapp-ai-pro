const { getSupabase } = require('./src/db/supabase');
require('dotenv').config();

const supabase = getSupabase();

async function criticalFix() {
    console.log('--- Corrigindo usuários e banco ---');

    // 1. Corrigir roles específicas
    const updates = [
        { email: 'lucasmariano@gmail.com', role: 'technician' },
        { email: 'lucasmarisf2@gmail.com', role: 'motoboy' },
        { email: 'lucasmar@gmail.com', role: 'motoboy' }
    ];

    for (const up of updates) {
        const { error } = await supabase
            .from('os_technicians')
            .update({ role: up.role })
            .ilike('email', up.email);

        if (error) console.error(`Erro ao atualizar ${up.email}:`, error.message);
        else console.log(`✅ ${up.email} marcado como ${up.role}`);
    }

    // 2. Tentar criar as colunas faltantes (se possível via SQL)
    // Como não tenho acesso direto a console SQL do Supabase agora, vou apenas garantir que o código não quebre se elas faltarem.
}

criticalFix();
