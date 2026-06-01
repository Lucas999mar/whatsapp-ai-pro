const { getSupabase } = require('./src/db/supabase');
require('dotenv').config();

const supabase = getSupabase();

async function fixMotoboys() {
    console.log('Fixing motoboys role...');

    // Update users who have a vehicle_type to role 'motoboy'
    const { data, error } = await supabase
        .from('os_technicians')
        .update({ role: 'motoboy' })
        .not('vehicle_type', 'is', null);

    if (error) {
        console.error('Error fixing motoboys:', error.message);
    } else {
        console.log('Successfully updated motoboys.');
    }

    // Also fix those without vehicle_type but registered as motoboy (if possible)
    // But vehicle_type is the best filter.
}

fixMotoboys();
