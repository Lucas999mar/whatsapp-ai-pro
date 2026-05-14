const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const config = require('../config/config');

const app = express();

// CORS: permite múltiplas origens (local + produção)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  config.server.frontendUrl,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Permite qualquer subdomínio do vercel.app e onrender.com
    if (origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) return callback(null, true);
    callback(null, true); // Em caso de dúvida, permite (segurança via JWT)
  },
  credentials: true
}));

app.use(express.json());

// Health check para o Render saber que o servidor está vivo
app.get('/healthz', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api', routes);

function startServer() {
  const port = process.env.PORT || config.server.port || 3001;
  app.listen(port, '0.0.0.0', () => {
    console.log(`🌐 Servidor API rodando na porta ${port}`);
  });
}

module.exports = { startServer };
