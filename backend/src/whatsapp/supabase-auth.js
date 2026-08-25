// ── Baileys v7 (ESM-only) — Dynamic import wrapper for CommonJS ──
const { getSupabase } = require('../db/supabase');
const crypto = require('crypto');

const BufferJSON = {
  replacer: (k, v) => {
    if (Buffer.isBuffer(v) || v instanceof Uint8Array || v?.type === 'Buffer') {
      return { type: 'Buffer', data: Buffer.from(v?.data || v).toString('base64') };
    }
    return v;
  },
  reviver: (k, v) => {
    if (v?.type === 'Buffer') {
      return Buffer.from(v.data, 'base64');
    }
    return v;
  }
};

async function useSupabaseAuthState(agentId) {
  const baileys = await import('@whiskeysockets/baileys');
  const proto = baileys.proto;

  const supabase = getSupabase();
  const table = 'whatsapp_auth';
  const keys = {}; // Memória local para chaves temporárias

  const readCreds = async () => {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('data')
        .eq('id', `${agentId}:creds`)
        .single();
      if (error || !data) return null;
      return JSON.parse(JSON.stringify(data.data), BufferJSON.reviver);
    } catch (e) { return null; }
  };

  const writeCreds = async (data) => {
    try {
      const content = JSON.parse(JSON.stringify(data, BufferJSON.replacer));
      await supabase.from(table).upsert({ id: `${agentId}:creds`, data: content, updated_at: new Date().toISOString() });
    } catch (e) { console.error('❌ Erro Supabase:', e.message); }
  };

  let creds = await readCreds();
  if (!creds) {
    // In v7, Curve/signedKeyPair utilities may have moved or changed.
    // Use useMultiFileAuthState to generate initial creds if needed,
    // or generate minimal creds manually.
    const { useMultiFileAuthState } = baileys;
    const path = require('path');
    const fs = require('fs');
    const tempDir = path.resolve(__dirname, `../../.temp_auth_${agentId}_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      const { state: tempState, saveCreds: tempSave } = await useMultiFileAuthState(tempDir);
      creds = tempState.creds;
      await writeCreds(creds);
    } finally {
      // Cleanup temp dir
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) { }
    }
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          for (const id of ids) {
            let value = keys[`${type}-${id}`];
            if (type === 'app-state-sync-key' && value) {
              // v7: use .create() instead of .fromObject()
              value = proto.Message.AppStateSyncKeyData.create(value);
            }
            data[id] = value;
          }
          return data;
        },
        set: async (data) => {
          for (const type in data) {
            for (const id in data[type]) {
              const value = data[type][id];
              const key = `${type}-${id}`;
              if (value) keys[key] = value;
              else delete keys[key];
            }
          }
        },
      },
    },
    saveCreds: () => writeCreds(creds),
  };
}

module.exports = { useSupabaseAuthState };
