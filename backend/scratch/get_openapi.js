const axios = require('axios');
require('dotenv').config();

async function getRpcFunctions() {
  const url = `${process.env.SUPABASE_URL}/rest/v1/`;
  const headers = {
    'apikey': process.env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
  };

  try {
    const res = await axios.get(url, { headers });
    const paths = Object.keys(res.data.paths || {});
    const rpcs = paths.filter(p => p.startsWith('/rpc/'));
    console.log('Available RPC Functions:', rpcs);
  } catch (err) {
    console.error('Error fetching OpenAPI spec:', err.message);
    if (err.response) {
      console.error('Response status:', err.response.status);
      console.error('Response data:', err.response.data);
    }
  }
}

getRpcFunctions();
