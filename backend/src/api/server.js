const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const config = require('../config/config');

const app = express();

app.use(cors({ origin: config.server.frontendUrl }));
app.use(express.json());

app.use('/api', routes);

function startServer() {
  app.listen(config.server.port, () => {
    console.log(`🌐 Servidor API rodando na porta ${config.server.port}`);
  });
}

module.exports = { startServer };
