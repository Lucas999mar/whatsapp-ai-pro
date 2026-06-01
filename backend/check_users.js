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
        console.log('Users for tenant Lucas:', JSON.stringify(data, null, 2));
    }
}

checkUsers();
