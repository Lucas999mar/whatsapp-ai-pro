const { proto } = require('@whiskeysockets/baileys');
const { getSupabase } = require('../db/supabase');
const { 
  Curve, 
  signedKeyPair, 
  generateRegistrationId 
} = require('@whiskeysockets/baileys/lib/Utils');

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
    creds = {
      noiseKey: Curve.generateKeyPair(),
      signedIdentityKey: Curve.generateKeyPair(),
      signedPreKey: signedKeyPair(Curve.generateKeyPair(), 1),
      registrationId: Math.floor(Math.random() * 16380) + 1,
      advSecretKey: Curve.generateKeyPair().private.toString('base64'),
      processedHistoryMessages: [],
      nextPreKeyId: 1,
      firstUnuploadedPreKeyId: 1,
      accountSettings: { unarchiveChats: false },
      deviceId: Buffer.from(Curve.generateKeyPair().public).toString('base64').slice(0, 6)
    };
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
