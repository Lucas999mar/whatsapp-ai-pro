require('dotenv').config();
const { getSupabase } = require('./src/db/supabase');

(async () => {
    const supabase = getSupabase();
    console.log('Fetching technicians...');
    const { data, error } = await supabase
        .from('os_technicians')
        .select('*, tenant:tenants(*)')
        .ilike('email', '%lucas%');

    console.log('Tech Error:', error);
    if (data) console.log('Tech Data len:', data.length);

    const { data: techSenha, error: errSenha } = await supabase
        .from('os_technicians')
        .select('*, tenant:tenants(*)')
        .ilike('email', '%lucasmariano%')
        .single();

    console.log('Senha fallback:', techSenha ? 'found' : 'not found', errSenha);

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
