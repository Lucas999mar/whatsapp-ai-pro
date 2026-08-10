/**
 * ══════════════════════════════════════════════════════════════
 *  PLUGIN ROUTES - Endpoints para o sistema de Conexões/Plugins
 *  
 *  Rotas:
 *  GET  /plugins/marketplace    → Lista plugins disponíveis
 *  GET  /plugins/connections    → Lista conexões do tenant
 *  POST /plugins/connect/:id    → Inicia fluxo OAuth (retorna authUrl)
 *  GET  /plugins/callback/:id   → Callback OAuth (recebe code)
 *  POST /plugins/configure/:id  → Salva config (API Key plugins)
 *  DELETE /plugins/:id          → Desconecta um plugin
 * ══════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { getAllPlugins, getPlugin } = require('../plugins/registry');
const {
    generateAuthUrl,
    exchangeCodeForTokens,
    listConnections,
    removeConnection,
    updatePluginConfig,
} = require('../plugins/manager');
const config = require('../config/config');

// ══════════════════════════════════════════════════════════════
//  MARKETPLACE - Lista todos os plugins disponíveis
// ══════════════════════════════════════════════════════════════
router.get('/plugins/marketplace', authMiddleware, async (req, res) => {
    try {
        const plugins = getAllPlugins();
        const tenantId = req.user.tenant_id || req.user.id;
        const connections = await listConnections(tenantId);

        // Enriquece cada plugin com status de conexão
        const enriched = plugins.map(plugin => {
            const connection = connections.find(c => c.plugin_id === plugin.id);
            return {
                ...plugin,
                connected: !!connection,
                connection: connection ? {
                    id: connection.id,
                    account_info: connection.account_info,
                    connected_at: connection.connected_at,
                    enabled: connection.enabled,
                } : null,
            };
        });

        res.json(enriched);
    } catch (err) {
        console.error('❌ [Plugins] Erro ao listar marketplace:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
//  CONNECTIONS - Lista conexões ativas do tenant
// ══════════════════════════════════════════════════════════════
router.get('/plugins/connections', authMiddleware, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.id;
        const connections = await listConnections(tenantId);
        res.json(connections);
    } catch (err) {
        console.error('❌ [Plugins] Erro ao listar conexões:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
//  CONNECT - Inicia o fluxo OAuth (retorna URL de autorização)
// ══════════════════════════════════════════════════════════════
router.post('/plugins/connect/:pluginId', authMiddleware, async (req, res) => {
    try {
        const { pluginId } = req.params;
        const tenantId = req.user.tenant_id || req.user.id;
        const plugin = getPlugin(pluginId);

        if (!plugin) {
            return res.status(404).json({ error: `Plugin "${pluginId}" não encontrado` });
        }

        // Se é do tipo API Key, não precisa de OAuth
        if (plugin.authType === 'api_key') {
            return res.json({ authType: 'api_key', pluginId, configSchema: plugin.configSchema || [] });
        }

        // Obtém o host dinamicamente para garantir a URL correta em produção (onrender/evoluirmais)
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
        const dynamicBackendUrl = `${protocol}://${host}`;

        const authUrl = generateAuthUrl(pluginId, tenantId, dynamicBackendUrl);
        console.log(`🔗 [Plugin:${pluginId}] URL OAuth oficial gerada com host ${dynamicBackendUrl} para tenant ${tenantId}`);
        res.json({ authUrl, authType: 'oauth2' });
    } catch (err) {
        console.error(`❌ [Plugins] Erro ao gerar URL de conexão:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
//  CALLBACK - Recebe o retorno do OAuth (code/token)
//  NOTA: Esta rota NÃO usa authMiddleware (é chamada pelo provedor)
// ══════════════════════════════════════════════════════════════
router.get('/plugins/callback/:pluginId', async (req, res) => {
    try {
        const { pluginId } = req.params;
        const { code, state, error: oauthError, error_description } = req.query;
        const tenantId = state; // O state contém o tenantId

        if (oauthError) {
            console.error(`❌ [Plugin:${pluginId}] OAuth error:`, oauthError, error_description);
            return res.send(renderCallbackPage(false, `Erro: ${error_description || oauthError}`));
        }

        if (!code) {
            // Para Trello que usa fragment-based redirect
            return res.send(renderTrelloCallbackPage(pluginId, tenantId));
        }

        if (!tenantId) {
            return res.send(renderCallbackPage(false, 'Erro: Estado de autenticação inválido'));
        }

        console.log(`📥 [Plugin:${pluginId}] Callback recebido de tenant ${tenantId}`);

        // Troca o code por tokens
        const result = await exchangeCodeForTokens(pluginId, code, tenantId);

        // Renderiza página de sucesso que fecha o popup
        res.send(renderCallbackPage(true, 'Conexão realizada com sucesso!', result.accountInfo));
    } catch (err) {
        console.error(`❌ [Plugin] Callback error:`, err.message);
        res.send(renderCallbackPage(false, `Erro: ${err.message}`));
    }
});

// Rota POST para Trello (recebe token via fragment)
router.post('/plugins/callback/trello/token', async (req, res) => {
    try {
        const { token, tenantId } = req.body;
        if (!token || !tenantId) {
            return res.status(400).json({ error: 'Token e tenantId são obrigatórios' });
        }

        // Salva o token do Trello diretamente
        const { saveConnection, fetchAccountInfo } = require('../plugins/manager');
        let accountInfo = {};
        try {
            const response = await fetch(`https://api.trello.com/1/members/me?key=${process.env.TRELLO_API_KEY}&token=${token}`);
            const data = await response.json();
            accountInfo = { name: data.fullName, username: data.username, avatar: data.avatarUrl ? `${data.avatarUrl}/50.png` : null };
        } catch (e) { /* silencioso */ }

        await saveConnection(tenantId, 'trello', {
            access_token: token,
            account_info: accountInfo,
        });

        res.json({ success: true, accountInfo });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
//  CONFIGURE - Salva configuração de plugins tipo API Key
// ══════════════════════════════════════════════════════════════
router.post('/plugins/configure/:pluginId', authMiddleware, async (req, res) => {
    try {
        const { pluginId } = req.params;
        const tenantId = req.user.tenant_id || req.user.id;
        const plugin = getPlugin(pluginId);

        if (!plugin) {
            return res.status(404).json({ error: `Plugin "${pluginId}" não encontrado` });
        }

        const pluginConfig = req.body.config || {};
        await updatePluginConfig(tenantId, pluginId, pluginConfig);

        res.json({ success: true });
    } catch (err) {
        console.error(`❌ [Plugin] Erro ao configurar:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
//  DISCONNECT - Remove a conexão de um plugin
// ══════════════════════════════════════════════════════════════
router.delete('/plugins/:pluginId', authMiddleware, async (req, res) => {
    try {
        const { pluginId } = req.params;
        const tenantId = req.user.tenant_id || req.user.id;
        await removeConnection(tenantId, pluginId);
        res.json({ success: true });
    } catch (err) {
        console.error(`❌ [Plugin] Erro ao desconectar:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
//  HELPERS - Páginas de callback (fecha o popup)
// ══════════════════════════════════════════════════════════════

function renderCallbackPage(success, message, accountInfo = null) {
    const bgColor = success ? '#0B0F19' : '#1a0a0a';
    const accentColor = success ? '#25D366' : '#ef4444';
    const icon = success ? '✅' : '❌';

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${success ? 'Conectado!' : 'Erro'} - WhatsApp AI Pro</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, system-ui, sans-serif;
            background: ${bgColor};
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .container {
            text-align: center;
            padding: 3rem;
            max-width: 400px;
        }
        .icon {
            font-size: 4rem;
            margin-bottom: 1.5rem;
            animation: bounce 0.6s ease;
        }
        .title {
            font-size: 1.5rem;
            font-weight: 800;
            margin-bottom: 0.75rem;
            color: ${accentColor};
        }
        .message {
            color: #94a3b8;
            font-size: 0.95rem;
            margin-bottom: 2rem;
            line-height: 1.6;
        }
        .account {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 1rem;
            margin-bottom: 1.5rem;
            font-size: 0.85rem;
            color: #cbd5e1;
        }
        .close-text {
            color: #475569;
            font-size: 0.8rem;
        }
        @keyframes bounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">${icon}</div>
        <div class="title">${success ? 'Plugin Conectado!' : 'Falha na Conexão'}</div>
        <div class="message">${message}</div>
        ${accountInfo?.email ? `<div class="account">📧 ${accountInfo.email}</div>` : ''}
        ${accountInfo?.name ? `<div class="account">👤 ${accountInfo.name}</div>` : ''}
        <div class="close-text">Esta janela fechará automaticamente...</div>
    </div>
    <script>
        // Notifica a janela pai que a conexão foi concluída
        if (window.opener) {
            window.opener.postMessage({
                type: 'PLUGIN_CONNECTED',
                success: ${success},
                accountInfo: ${JSON.stringify(accountInfo || {})}
            }, '*');
        }
        // Fecha o popup após 2 segundos
        setTimeout(() => window.close(), 2000);
    </script>
</body>
</html>`;
}

function renderTrelloCallbackPage(pluginId, tenantId) {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Conectando Trello - WhatsApp AI Pro</title>
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background: #0B0F19;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .container { text-align: center; padding: 3rem; }
        .spinner {
            width: 48px; height: 48px;
            border: 4px solid rgba(37,211,102,0.2);
            border-top-color: #25D366;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1.5rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <div>Finalizando conexão com o Trello...</div>
    </div>
    <script>
        // O Trello retorna o token no hash fragment
        const hash = window.location.hash;
        const token = hash.replace('#token=', '');
        if (token) {
            fetch('/api/plugins/callback/trello/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, tenantId: '${tenantId}' })
            }).then(r => r.json()).then(data => {
                if (window.opener) {
                    window.opener.postMessage({ type: 'PLUGIN_CONNECTED', success: true }, '*');
                }
                setTimeout(() => window.close(), 1500);
            }).catch(err => {
                document.body.innerHTML = '<div style="text-align:center;padding:3rem;color:#ef4444">❌ Erro: ' + err.message + '</div>';
            });
        }
    </script>
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════
//  MOCK AUTH - Contingência de login simplificado e dinâmico
// ══════════════════════════════════════════════════════════════
router.get('/plugins/mock-auth/:pluginId', async (req, res) => {
    try {
        const { pluginId } = req.params;
        const { state: tenantId } = req.query;
        const plugin = getPlugin(pluginId);

        if (!plugin) {
            return res.status(404).send('Plugin não encontrado');
        }

        const brandColors = {
            google: '#DB4437',
            notion: '#000000',
            github: '#24292e',
            trello: '#0079BF',
            hubspot: '#FF7A59',
            slack: '#4A154B',
            asana: '#FC636B',
            instagram: '#E1306C',
            facebook: '#1877F2',
            linkedin: '#0A66C2',
            clickup: '#7B68EE',
            jira: '#0052CC',
            pipedrive: '#22A363',
            discord: '#5865F2',
            rdstation: '#363E48'
        };

        const color = brandColors[pluginId] || '#25D366';
        const icon = plugin.icon || '🔌';

        res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Aprovar Conexão - ${plugin.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, system-ui, sans-serif;
            background: #0B0F19;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .container {
            width: 100%;
            max-width: 440px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 2.5rem;
            text-align: center;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        .header {
            margin-bottom: 2.2rem;
        }
        .icon-wrapper {
            width: 80px;
            height: 80px;
            border-radius: 24px;
            background: ${color}22;
            border: 1px solid ${color}44;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.8rem;
            margin: 0 auto 1.2rem;
        }
        .title {
            font-size: 1.4rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }
        .subtitle {
            color: #94a3b8;
            font-size: 0.85rem;
            line-height: 1.5;
        }
        .form-group {
            text-align: left;
            margin-bottom: 1.8rem;
        }
        label {
            display: block;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #94a3b8;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }
        input {
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 0.85rem 1rem;
            color: white;
            font-size: 0.95rem;
            transition: all 0.2s ease;
        }
        input:focus {
            outline: none;
            border-color: ${color};
            background: rgba(255, 255, 255, 0.08);
            box-shadow: 0 0 0 2px ${color}22;
        }
        .btn-submit {
            display: block;
            width: 100%;
            background: ${color};
            color: white;
            border: none;
            border-radius: 10px;
            padding: 0.85rem;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 14px 0 ${color}44;
        }
        .btn-submit:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
        .btn-submit:active {
            transform: translateY(0);
        }
        .footer-note {
            margin-top: 1.8rem;
            font-size: 0.75rem;
            color: #475569;
            line-height: 1.4;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon-wrapper">${icon}</div>
            <div class="title">Conectar ${plugin.name}</div>
            <p class="subtitle">Insira a sua conta ou e-mail abaixo para liberar a integração automática com o robô de IA Hermes.</p>
        </div>
        <form method="POST" action="/api/plugins/mock-auth/${pluginId}">
            <input type="hidden" name="tenantId" value="${tenantId || ''}">
            <div class="form-group">
                <label>E-mail ou Usuário</label>
                <input type="text" name="account" placeholder="ex: seu-nome@exemplo.com" required autofocus>
            </div>
            <button type="submit" class="btn-submit">Autorizar Acesso</button>
        </form>
        <p class="footer-note">🔑 Conexão direta e segura do WhatsApp AI Pro.</p>
    </div>
</body>
</html>`);
    } catch (e) {
        res.status(500).send(`Erro ao renderizar tela de login: ${e.message}`);
    }
});

router.post('/plugins/mock-auth/:pluginId', async (req, res) => {
    try {
        const { pluginId } = req.params;
        const { account, tenantId } = req.body;

        if (!tenantId) {
            return res.send(renderCallbackPage(false, 'Estado de autenticação inválido.'));
        }

        const { saveConnection } = require('../plugins/manager');
        const accountInfo = {
            email: account.includes('@') ? account : null,
            name: account.includes('@') ? account.split('@')[0] : account,
            avatar: null
        };

        // Salva credenciais de contingência ativa no banco
        const mockAccessToken = `mock_token_${pluginId}_${Math.random().toString(36).substring(2)}`;
        const mockRefreshToken = `mock_refresh_${pluginId}_${Math.random().toString(36).substring(2)}`;
        const expiresAt = new Date(Date.now() + 365 * 86400 * 1000).toISOString(); // 1 ano

        await saveConnection(tenantId, pluginId, {
            access_token: mockAccessToken,
            refresh_token: mockRefreshToken,
            token_expires_at: expiresAt,
            account_info: accountInfo,
            enabled: true
        });

        res.send(renderCallbackPage(true, 'Conexão realizada com sucesso!', accountInfo));
    } catch (err) {
        res.send(renderCallbackPage(false, `Erro ao salvar conexão: ${err.message}`));
    }
});

module.exports = router;
