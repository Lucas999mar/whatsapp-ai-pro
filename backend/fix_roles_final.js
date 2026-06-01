const { getSupabase } = require('./src/db/supabase');
require('dotenv').config();

const supabase = getSupabase();

async function fixAllRoles() {
    console.log('Fixing technician roles...');

    // 1. Ensure all who NOT have a role but are not motoboys get 'technician'
    const { data: d1, error: e1 } = await supabase
        .from('os_technicians')
        .update({ role: 'technician' })
        .is('role', null);

    if (e1) console.error('Error fixing tech roles:', e1.message);
    else console.log('Successfully set role=technician for null roles.');

    // 2. Double check motoboys have 'motoboy' role if they have vehicle_type
    const { data: d2, error: e2 } = await supabase
        .from('os_technicians')
        .update({ role: 'motoboy' })
        .not('vehicle_type', 'is', null);

    if (e2) console.error('Error reinforcing motoboy roles:', e2.message);
    else console.log('Successfully reinforced motoboy roles.');
}

fixAllRoles();
