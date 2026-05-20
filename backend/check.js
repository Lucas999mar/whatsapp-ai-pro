require('dotenv').config();
const { getSupabase } = require('./src/db/supabase');

(async () => {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('os_tasks')
        .select('title, scheduled_date, tenant_id');

    console.log('Tasks Found:', data.length);
    if (data) {
        data.forEach(t => console.log(t.title, t.scheduled_date, t.tenant_id));
    }
})();
