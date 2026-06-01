const { getSupabase } = require('./src/db/supabase');
require('dotenv').config();

const supabase = getSupabase();

async function auditAndFix() {
    console.log('--- Auditoria Completa de Usuários ---');

    // 1. Buscar TODOS os usuários da tabela os_technicians para analisar
    const { data: allUsers, error } = await supabase
        .from('os_technicians')
        .select('*');

    if (error) {
        console.error('Erro ao buscar usuários:', error.message);
        return;
    }

    console.log(`Total de usuários encontrados no sistema: ${allUsers.length}`);

    for (const user of allUsers) {
        let shouldBeRole = user.role;
        let needsUpdate = false;

        // Lógica de Mathias
        if (user.name && user.name.toLowerCase().includes('mathias')) {
            console.log(`📍 Encontrado Mathias: ID=${user.id}, Tenant=${user.tenant_id}, CurrentRole=${user.role}`);
            shouldBeRole = 'motoboy';

            // Garantir que o Mathias pertence ao tenant 'Lucas' se ele for o motoboy do usuário
            if (user.tenant_id !== 'Lucas') {
                console.log(`⚠️ Mathias estava no tenant ${user.tenant_id}. Movendo para Lucas.`);
                user.tenant_id = 'Lucas';
                needsUpdate = true;
            }
        }

        // Lógica Geral: Se tem placa ou tipo de veículo (carro/moto), DEVE ser motoboy
        const hasVehicle = user.vehicle_type && user.vehicle_type !== 'none' || user.vehicle_plate;

        if (hasVehicle && user.role !== 'motoboy') {
            console.log(`🔧 Corrigindo ${user.name} (${user.email}): técnico -> motoboy (baseado no veículo)`);
            shouldBeRole = 'motoboy';
            needsUpdate = true;
        }

        // Se NÃO tem email de técnico conhecido e NÃO tem veículo, mas está como motoboy? 
        // Deixamos como está para não quebrar outros.

        // Mas se for o lucasmariano@gmail.com, GARANTIR que é técnico
        if (user.email && user.email.toLowerCase() === 'lucasmariano@gmail.com' && user.role !== 'technician') {
            console.log(`🔧 Corrigindo ${user.name}: motoboy -> technician (usuário de teste técnico)`);
            shouldBeRole = 'technician';
            needsUpdate = true;
        }

        if (needsUpdate || user.role !== shouldBeRole) {
            const { error: upError } = await supabase
                .from('os_technicians')
                .update({
                    role: shouldBeRole,
                    tenant_id: user.tenant_id // Garante o vínculo com a empresa do Lucas
                })
                .eq('id', user.id);

            if (upError) console.error(`❌ Erro ao atualizar ${user.name}:`, upError.message);
            else console.log(`✅ ${user.name} atualizado com sucesso.`);
        }
    }

    console.log('--- Fim da Auditoria ---');
}

auditAndFix();
