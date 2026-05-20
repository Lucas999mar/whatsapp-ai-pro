require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    console.log('Fetching technicians...');
    const { data, error } = await supabase
        .from('os_technicians')
        .select('*')
        .ilike('email', '%lucasmariano%');

    console.log('Result:', data);
    console.log('Error:', error);

    console.log('\nFetching tasks with relations...');
    const { data: tasks, error: taskErr } = await supabase
        .from('os_tasks')
        .select(`
        id,
        title,
        client:os_clients(id, name),
        technician:os_technicians(id, name),
        task_type:os_task_types(id, name)
    `);

    console.log('Tasks error:', taskErr);
    if (tasks) console.log('Tasks fetched:', tasks.length);
})();
