const { getSupabase } = require('./src/db/supabase');
require('dotenv').config();

const supabase = getSupabase();

async function mathiasForceFix() {
    console.log('--- FORÇANDO MATHIAS COMO MOTOBOY ---');

    // 1. Localizar por nome Mathias ou email lucasmar@gmail.com
    const { data: users, error } = await supabase
        .from('os_technicians')
        .select('id, name, email, role')
        .ilike('name', '%mathias%');

    if (error) {
        console.error('Erro:', error.message);
        return;
    }

    for (const u of users) {
        console.log(`Alterando ${u.name} (ID: ${u.id}, Email: ${u.email}) para MOTOBOY`);
        const { error: upErr } = await supabase
            .from('os_technicians')
            .update({ role: 'motoboy' })
            .eq('id', u.id);

        if (upErr) console.error('Erro no update:', upErr.message);
        else console.log('✅ Atualizado com sucesso.');
    }

    console.log('--- FIM ---');
}

mathiasForceFix();
