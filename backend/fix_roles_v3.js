const { getSupabase } = require('./src/db/supabase');
require('dotenv').config();

const supabase = getSupabase();

async function fixRoles() {
    console.log('=== Corrigindo roles individualmente ===');

    // 1. Primeiro, buscar TODOS os cadastros para ver o que temos
    const { data: all, error } = await supabase
        .from('os_technicians')
        .select('id, name, email, role, vehicle_type, vehicle_plate')
        .eq('tenant_id', 'Lucas');

    if (error) { console.error('Erro:', error.message); return; }

    console.log('Total de registros:', all.length);
    all.forEach(u => console.log(`  - ${u.name} | ${u.email} | role=${u.role} | vehicle=${u.vehicle_type} | plate=${u.vehicle_plate}`));

    // 2. Definir quem é técnico e quem é motoboy com base no email
    // lucasmariano@gmail.com = TECNICO
    // lucasmarisf2@gmail.com = MOTOBOY
    // MAMA = verificar

    for (const user of all) {
        let newRole;

        // Se tem placa de veículo E se cadastrou via rota de motoboy = motoboy
        if (user.vehicle_plate && user.vehicle_plate.length > 0) {
            newRole = 'motoboy';
        } else {
            newRole = 'technician';
        }

        // Override específico para o email do técnico (sem placa = técnico)
        if (user.email && user.email.toLowerCase() === 'lucasmariano@gmail.com') {
            newRole = 'technician';
        }

        if (user.role !== newRole) {
            const { error: e2 } = await supabase
                .from('os_technicians')
                .update({ role: newRole })
                .eq('id', user.id);

            if (e2) console.error(`  Erro ao atualizar ${user.name}:`, e2.message);
            else console.log(`  ✅ ${user.name} -> ${newRole}`);
        } else {
            console.log(`  ⏭️ ${user.name} já é ${newRole}`);
        }
    }

    console.log('=== Concluído ===');
}

fixRoles();
