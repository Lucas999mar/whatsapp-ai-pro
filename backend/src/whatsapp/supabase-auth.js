const { proto } = require('@whiskeysockets/baileys');
const { getSupabase } = require('../db/supabase');
const { Curve, signedKeyPair } = require('@whiskeysockets/baileys/lib/Utils/crypto');
const { AuthenticationUtils } = require('@whiskeysockets/baileys/lib/Utils/auth-utils');

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
  const supabase = getSupabase();
  const table = 'whatsapp_auth';
  const localCache = new Map();

  const readData = async (type) => {
    if (localCache.has(type)) return localCache.get(type);
    
    try {
      const { data, error } = await supabase
        .from(table)
        .select('data')
        .eq('id', `${agentId}:${type}`)
        .single();
      
      if (error || !data) return null;
      const parsed = JSON.parse(JSON.stringify(data.data), BufferJSON.reviver);
      localCache.set(type, parsed);
      return parsed;
    } catch (e) {
      return null;
    }
  };

  const writeData = async (data, type) => {
    localCache.set(type, data);
    try {
      const content = JSON.parse(JSON.stringify(data, BufferJSON.replacer));
      await supabase
        .from(table)
        .upsert({ 
          id: `${agentId}:${type}`, 
          data: content,
          updated_at: new Date().toISOString() 
        });
    } catch (e) {
      console.error(`❌ Erro Supabase (${type}):`, e.message);
    }
  };

  const removeData = async (type) => {
    localCache.delete(type);
    try {
      await supabase.from(table).delete().eq('id', `${agentId}:${type}`);
    } catch (e) {}
  };

  // Initialize creds
  let creds = await readData('creds');
  if (!creds) {
    creds = AuthenticationUtils.initAuthState().creds;
    await writeData(creds, 'creds');
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              const key = `${type}-${id}`;
              let value = await readData(key);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const type in data) {
            for (const id in data[type]) {
              const value = data[type][id];
              const key = `${type}-${id}`;
              tasks.push(value ? writeData(value, key) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => writeData(creds, 'creds'),
  };
}

module.exports = { useSupabaseAuthState };
