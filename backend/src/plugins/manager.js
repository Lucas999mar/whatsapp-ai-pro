/**
 * ══════════════════════════════════════════════════════════════
 *  PLUGIN MANAGER - Gerenciador de Conexões OAuth
 *  
 *  Responsável por:
 *  - Gerar URLs de autorização OAuth
 *  - Trocar authorization codes por tokens
 *  - Renovar tokens expirados
 *  - Gerenciar conexões no banco de dados (tenant_plugins)
 *  - Executar tools de plugins conectados
 * ══════════════════════════════════════════════════════════════
 */

const { getPlugin, findPluginByToolName } = require('./registry');
const config = require('../config/config');

/**
 * Retorna o cliente Supabase
 */
function getSupabase() {
    const { getSupabase: getSb } = require('../db/supabase');
    return getSb();
}

/**
 * Gera a URL de autorização OAuth para um plugin específico
 */
function generateAuthUrl(pluginId, tenantId, customBackendUrl = null) {
    const plugin = getPlugin(pluginId);
    if (!plugin || plugin.authType !== 'oauth2') {
        throw new Error(`Plugin "${pluginId}" não suporta OAuth`);
    }

    const backendUrl = customBackendUrl || process.env.BACKEND_URL || `http://localhost:${config.server.port}`;
    const redirectUri = `${backendUrl}/api/plugins/callback/${pluginId}`;

    const params = new URLSearchParams();

    // Google, Notion, HubSpot, GitHub, Asana, Slack usam OAuth 2.0 padrão
    if (pluginId === 'google') {
        params.set('client_id', process.env.GOOGLE_CLIENT_ID || '');
        params.set('redirect_uri', redirectUri);
        params.set('response_type', 'code');
        params.set('scope', plugin.oauth.scopes.join(' '));
        params.set('access_type', 'offline');
        params.set('prompt', 'consent');
        params.set('state', tenantId);
    } else if (pluginId === 'notion') {
        params.set('client_id', process.env.NOTION_CLIENT_ID || '');
        params.set('redirect_uri', redirectUri);
        params.set('response_type', 'code');
        params.set('owner', 'user');
        params.set('state', tenantId);
    } else if (pluginId === 'github') {
        params.set('client_id', process.env.GITHUB_CLIENT_ID || '');
        params.set('redirect_uri', redirectUri);
        params.set('scope', plugin.oauth.scopes.join(' '));
        params.set('state', tenantId);
    } else if (pluginId === 'hubspot') {
        params.set('client_id', process.env.HUBSPOT_CLIENT_ID || '');
        params.set('redirect_uri', redirectUri);
        params.set('scope', plugin.oauth.scopes.join(' '));
        params.set('state', tenantId);
    } else if (pluginId === 'asana') {
        params.set('client_id', process.env.ASANA_CLIENT_ID || '');
        params.set('redirect_uri', redirectUri);
        params.set('response_type', 'code');
        params.set('state', tenantId);
    } else if (pluginId === 'slack') {
        params.set('client_id', process.env.SLACK_CLIENT_ID || '');
        params.set('redirect_uri', redirectUri);
        params.set('scope', plugin.oauth.scopes.join(','));
        params.set('state', tenantId);
    } else if (pluginId === 'trello') {
        // Trello usa um flow ligeiramente diferente
        params.set('key', process.env.TRELLO_API_KEY || '');
        params.set('name', 'WhatsApp AI Pro');
        params.set('scope', plugin.oauth.scopes.join(','));
        params.set('expiration', 'never');
        params.set('callback_method', 'fragment');
        params.set('return_url', `${backendUrl}/api/plugins/callback/trello?state=${tenantId}`);
        params.set('response_type', 'token');
    } else {
        // Genérico OAuth2
        const clientIdEnvKey = `${pluginId.toUpperCase()}_CLIENT_ID`;
        params.set('client_id', process.env[clientIdEnvKey] || '');
        params.set('redirect_uri', redirectUri);
        params.set('response_type', 'code');
        if (plugin.oauth.scopes.length > 0) {
            params.set('scope', plugin.oauth.scopes.join(' '));
        }
        params.set('state', tenantId);
    }

    return `${plugin.oauth.authUrl}?${params.toString()}`;
}

/**
 * Troca o authorization code por access/refresh tokens
 */
async function exchangeCodeForTokens(pluginId, code, tenantId) {
    const plugin = getPlugin(pluginId);
    if (!plugin || !plugin.oauth.tokenUrl) {
        throw new Error(`Plugin "${pluginId}" não suporta troca de tokens`);
    }

    const backendUrl = process.env.BACKEND_URL || `http://localhost:${config.server.port}`;
    const redirectUri = `${backendUrl}/api/plugins/callback/${pluginId}`;

    let tokenData;

    if (pluginId === 'google') {
        const response = await fetch(plugin.oauth.tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID || '',
                client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }).toString(),
        });
        tokenData = await response.json();

    } else if (pluginId === 'notion') {
        const credentials = Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString('base64');
        const response = await fetch(plugin.oauth.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${credentials}`,
            },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
            }),
        });
        tokenData = await response.json();

    } else if (pluginId === 'github') {
        const response = await fetch(plugin.oauth.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID || '',
                client_secret: process.env.GITHUB_CLIENT_SECRET || '',
                code,
                redirect_uri: redirectUri,
            }),
        });
        tokenData = await response.json();

    } else if (pluginId === 'hubspot') {
        const response = await fetch(plugin.oauth.tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: process.env.HUBSPOT_CLIENT_ID || '',
                client_secret: process.env.HUBSPOT_CLIENT_SECRET || '',
                redirect_uri: redirectUri,
                code,
            }).toString(),
        });
        tokenData = await response.json();

    } else if (pluginId === 'asana') {
        const response = await fetch(plugin.oauth.tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: process.env.ASANA_CLIENT_ID || '',
                client_secret: process.env.ASANA_CLIENT_SECRET || '',
                redirect_uri: redirectUri,
                code,
            }).toString(),
        });
        tokenData = await response.json();

    } else if (pluginId === 'slack') {
        const response = await fetch(plugin.oauth.tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.SLACK_CLIENT_ID || '',
                client_secret: process.env.SLACK_CLIENT_SECRET || '',
                code,
                redirect_uri: redirectUri,
            }).toString(),
        });
        tokenData = await response.json();

    } else {
        // Genérico
        const clientIdKey = `${pluginId.toUpperCase()}_CLIENT_ID`;
        const clientSecretKey = `${pluginId.toUpperCase()}_CLIENT_SECRET`;
        const response = await fetch(plugin.oauth.tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: process.env[clientIdKey] || '',
                client_secret: process.env[clientSecretKey] || '',
                redirect_uri: redirectUri,
                code,
            }).toString(),
        });
        tokenData = await response.json();
    }

    if (tokenData.error) {
        console.error(`❌ [Plugin:${pluginId}] Token exchange error:`, tokenData);
        throw new Error(tokenData.error_description || tokenData.error || 'Falha na autenticação');
    }

    // Busca informações da conta conectada
    let accountInfo = {};
    try {
        accountInfo = await fetchAccountInfo(pluginId, tokenData.access_token);
    } catch (err) {
        console.warn(`⚠️ [Plugin:${pluginId}] Não foi possível buscar info da conta:`, err.message);
    }

    // Calcula expiração do token
    const expiresAt = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null;

    // Salva no banco
    await saveConnection(tenantId, pluginId, {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_expires_at: expiresAt,
        account_info: accountInfo,
    });

    console.log(`✅ [Plugin:${pluginId}] Conectado com sucesso para tenant ${tenantId}`);
    return { success: true, accountInfo };
}

/**
 * Busca informações da conta conectada (nome, email, avatar)
 */
async function fetchAccountInfo(pluginId, accessToken) {
    let info = {};

    try {
        if (pluginId === 'google') {
            const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const data = await res.json();
            info = { email: data.email, name: data.name, avatar: data.picture };

        } else if (pluginId === 'notion') {
            const res = await fetch('https://api.notion.com/v1/users/me', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Notion-Version': '2022-06-28'
                }
            });
            const data = await res.json();
            info = { name: data.name || data.bot?.owner?.user?.name, email: data.person?.email, avatar: data.avatar_url };

        } else if (pluginId === 'github') {
            const res = await fetch('https://api.github.com/user', {
                headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'WhatsAppAIPro' }
            });
            const data = await res.json();
            info = { name: data.name || data.login, email: data.email, avatar: data.avatar_url, username: data.login };

        } else if (pluginId === 'hubspot') {
            const res = await fetch('https://api.hubapi.com/oauth/v1/access-tokens/' + accessToken);
            const data = await res.json();
            info = { email: data.user, hub_id: data.hub_id };

        } else if (pluginId === 'slack') {
            const res = await fetch('https://slack.com/api/auth.test', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const data = await res.json();
            info = { team: data.team, user: data.user, team_id: data.team_id };

        } else if (pluginId === 'asana') {
            const res = await fetch('https://app.asana.com/api/1.0/users/me', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const data = await res.json();
            info = { name: data.data?.name, email: data.data?.email, avatar: data.data?.photo?.image_128x128 };
        } else if (pluginId === 'instagram') {
            const res = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`);
            const data = await res.json();
            info = { name: data.username, username: data.username, instagram_id: data.id };
        } else if (pluginId === 'facebook') {
            const res = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`);
            const data = await res.json();
            info = { name: data.name, email: data.email, avatar: data.picture?.data?.url };
        } else if (pluginId === 'linkedin') {
            const res = await fetch('https://api.linkedin.com/v2/me', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const data = await res.json();
            info = { name: `${data.localizedFirstName} ${data.localizedLastName}`, username: data.id };
        } else if (pluginId === 'discord') {
            const res = await fetch('https://discord.com/api/users/@me', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const data = await res.json();
            info = { name: data.global_name || data.username, email: data.email, avatar: data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : null };
        } else if (pluginId === 'clickup') {
            const res = await fetch('https://api.clickup.com/api/v2/user', {
                headers: { Authorization: accessToken }
            });
            const data = await res.json();
            info = { name: data.user?.username, email: data.user?.email };
        } else {
            // Fallback genérico para outros plugins conectáveis que não possuem busca detalhada aqui
            info = { name: `Conexão ${pluginId.charAt(0).toUpperCase() + pluginId.slice(1)}`, status: 'Ativa' };
        }
    } catch (err) {
        console.warn(`⚠️ Erro ao buscar account info para ${pluginId}:`, err.message);
    }

    return info;
}

/**
 * Salva/atualiza uma conexão no banco de dados
 */
async function saveConnection(tenantId, pluginId, data) {
    const supabase = getSupabase();

    const record = {
        tenant_id: tenantId,
        plugin_id: pluginId,
        enabled: true,
        access_token: data.access_token,
        refresh_token: data.refresh_token || null,
        token_expires_at: data.token_expires_at || null,
        account_info: data.account_info || {},
        config: data.config || {},
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
        .from('tenant_plugins')
        .upsert(record, { onConflict: 'tenant_id,plugin_id' });

    if (error) {
        console.error(`❌ [Plugin:${pluginId}] Erro ao salvar conexão:`, error.message);
        throw new Error(`Falha ao salvar conexão: ${error.message}`);
    }
}

/**
 * Lista todas as conexões de um tenant
 */
async function listConnections(tenantId) {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('tenant_plugins')
        .select('id, plugin_id, enabled, account_info, config, connected_at, updated_at, token_expires_at')
        .eq('tenant_id', tenantId)
        .order('connected_at', { ascending: false });

    if (error) {
        // Se a tabela não existe ainda, retorna array vazio
        if (error.code === '42P01' || error.message.includes('does not exist')) {
            return [];
        }
        throw error;
    }

    return data || [];
}

/**
 * Remove uma conexão (desconecta um plugin)
 */
async function removeConnection(tenantId, pluginId) {
    const supabase = getSupabase();
    const { error } = await supabase
        .from('tenant_plugins')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('plugin_id', pluginId);

    if (error) throw error;
    console.log(`🔌 [Plugin:${pluginId}] Desconectado para tenant ${tenantId}`);
}

/**
 * Atualiza configuração de um plugin (para webhook/api_key plugins)
 */
async function updatePluginConfig(tenantId, pluginId, pluginConfig) {
    const supabase = getSupabase();

    const record = {
        tenant_id: tenantId,
        plugin_id: pluginId,
        enabled: true,
        config: pluginConfig,
        access_token: pluginConfig.api_key || null,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        account_info: { type: 'api_key', base_url: pluginConfig.base_url },
    };

    const { error } = await supabase
        .from('tenant_plugins')
        .upsert(record, { onConflict: 'tenant_id,plugin_id' });

    if (error) throw error;
    console.log(`🔧 [Plugin:${pluginId}] Configuração atualizada para tenant ${tenantId}`);
}

/**
 * Retorna os IDs dos plugins ativos de um tenant
 */
async function getActivePluginIds(tenantId) {
    const connections = await listConnections(tenantId);
    return connections.filter(c => c.enabled).map(c => c.plugin_id);
}

/**
 * Obtém o access_token de um plugin para um tenant (com refresh automático se expirado)
 */
async function getAccessToken(tenantId, pluginId) {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('tenant_plugins')
        .select('access_token, refresh_token, token_expires_at')
        .eq('tenant_id', tenantId)
        .eq('plugin_id', pluginId)
        .single();

    if (error || !data) return null;

    // Verifica se o token expirou
    if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
        // Tenta renovar
        if (data.refresh_token) {
            try {
                const newToken = await refreshAccessToken(pluginId, data.refresh_token);
                // Atualiza no banco
                const expiresAt = newToken.expires_in
                    ? new Date(Date.now() + newToken.expires_in * 1000).toISOString()
                    : null;

                await supabase.from('tenant_plugins').update({
                    access_token: newToken.access_token,
                    refresh_token: newToken.refresh_token || data.refresh_token,
                    token_expires_at: expiresAt,
                    updated_at: new Date().toISOString()
                }).eq('tenant_id', tenantId).eq('plugin_id', pluginId);

                return newToken.access_token;
            } catch (err) {
                console.error(`❌ [Plugin:${pluginId}] Falha ao renovar token:`, err.message);
                return null;
            }
        }
        return null;
    }

    return data.access_token;
}

/**
 * Renova um access_token usando o refresh_token
 */
async function refreshAccessToken(pluginId, refreshToken) {
    const plugin = getPlugin(pluginId);
    if (!plugin || !plugin.oauth.tokenUrl) throw new Error('Plugin sem suporte a refresh');

    let body;

    if (pluginId === 'google') {
        body = new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID || '',
            client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }).toString();
    } else {
        const clientIdKey = `${pluginId.toUpperCase()}_CLIENT_ID`;
        const clientSecretKey = `${pluginId.toUpperCase()}_CLIENT_SECRET`;
        body = new URLSearchParams({
            client_id: process.env[clientIdKey] || '',
            client_secret: process.env[clientSecretKey] || '',
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }).toString();
    }

    const response = await fetch(plugin.oauth.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error_description || data.error);
    return data;
}

module.exports = {
    generateAuthUrl,
    exchangeCodeForTokens,
    saveConnection,
    listConnections,
    removeConnection,
    updatePluginConfig,
    getActivePluginIds,
    getAccessToken,
    fetchAccountInfo,
};
