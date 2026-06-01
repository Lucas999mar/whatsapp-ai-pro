const { getSupabase } = require('./src/db/supabase');
require('dotenv').config();

const supabase = getSupabase();

async function individualFix() {
    console.log('Fixing specific users roles...');

    // Fix Technician
    const { error: e1 } = await supabase
        .from('os_technicians')
        .update({ role: 'technician' })
        .ilike('email', 'lucasmariano@gmail.com');

    if (e1) console.error('Error fixing technician:', e1.message);
    else console.log('Successfully set lucasmariano@gmail.com as technician.');

    // Fix Motoboy
    const { error: e2 } = await supabase
        .from('os_technicians')
        .update({ role: 'motoboy' })
        .ilike('email', 'lucasmar%@gmail.com'); // Using % for both lucasmar and lucasmarisf2 just in case

    if (e2) console.error('Error fixing motoboy:', e2.message);
    else console.log('Successfully set lucasmar accounts as motoboy.');
}

individualFix();
