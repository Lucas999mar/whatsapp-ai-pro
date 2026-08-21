const { getSupabase } = require('./src/db/supabase');
require('dotenv').config();

async function check() {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('whatsapp_opt_ins').select('id').limit(1);
    if (error) {
        console.error('❌ Table check failed:', error);
    } else {
        console.log('✅ Table exists, query returned:', data);
    }
    process.exit(0);
}

check();
