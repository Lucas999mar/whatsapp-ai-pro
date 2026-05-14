const { createClient } = require('@supabase/supabase-js');
const config = require('../config/config');

let supabase = null;

function getSupabase() {
  if (!supabase) {
    if (!config.supabase.url || !config.supabase.serviceKey) {
      throw new Error('Supabase não configurado! Adicione SUPABASE_URL e SUPABASE_SERVICE_KEY no .env');
    }

    // Polyfill WebSocket for Node.js
    if (typeof globalThis !== 'undefined' && !globalThis.WebSocket) {
      globalThis.WebSocket = require('ws');
    }

    supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
      auth: { persistSession: false }
    });
  }
  return supabase;
}

module.exports = { getSupabase };
