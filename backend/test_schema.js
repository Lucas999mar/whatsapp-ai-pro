require('dotenv').config();
const { getSupabase } = require('./src/db/supabase');

(async () => {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('os_tasks')
        .select('*')
        .limit(1);

    console.log('Tasks Error:', error);
    console.log('Tasks Data:', data);

    const { data: clients, error: cErr } = await supabase
        .from('os_clients')
        .select('*')
        .limit(1);

    console.log('Clients Data:', clients);
})();
