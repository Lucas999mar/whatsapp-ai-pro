const { getSupabase } = require('./src/db/supabase');
require('dotenv').config();

const supabase = getSupabase();

async function checkUsers() {
    const tenantId = 'Lucas';
    const { data, error } = await supabase
        .from('os_technicians')
        .select('id, name, email, role, vehicle_type')
        .eq('tenant_id', tenantId);

    if (error) {
        console.error('Error fetching users:', error.message);
    } else {
        data.forEach(u => {
            console.log(`- ${u.name} | ${u.email} | ${u.role} | ${u.vehicle_type}`);
        });
    }
}

checkUsers();
