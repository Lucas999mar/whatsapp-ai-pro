const { getSupabase } = require('./src/db/supabase');

(async () => {
    const supabase = getSupabase();
    console.log("Adding incompleta to check constraint...");
    // Unfortunately, Supabase JS client doesn't support raw SQL easily unless we use rpc.
    // However, this constraint might only exist in the SQL file but not actually strictly enforced. Let's see if we can insert 'incompleta'.
    const { data: user, error: err } = await supabase.from('os_tasks').update({ status: 'incompleta' }).eq('id', '00000000-0000-0000-0000-000000000000');
    console.log(err);
})();
