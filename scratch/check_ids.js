const path = require('path');
const supabasePath = path.resolve(__dirname, '../backend/src/db/supabase.js');
const { getSupabase } = require(supabasePath);

async function check() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('conversations').select('whatsapp_id').limit(5);
  if (error) console.error(error);
  else console.log('IDs in DB:', data.map(d => d.whatsapp_id));
}

check();
