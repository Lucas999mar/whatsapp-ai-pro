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
  const keys = {}; // Memória local para chaves temporárias (veloz)

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
    } catch (e) { console.error('❌ Erro ao salvar creds:', e.message); }
  };

  // Carrega credenciais do banco ou inicia novas
  let creds = await readCreds();
  if (!creds) {
    creds = AuthenticationUtils.initAuthState().creds;
    await writeCreds(creds);
  }

  return {
    state: {
      creds,
      keys: {
        get: (type, ids) => {
          const data = {};
          for (const id of ids) {
            data[id] = keys[`${type}-${id}`];
          }
          return data;
        },
        set: (data) => {
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
