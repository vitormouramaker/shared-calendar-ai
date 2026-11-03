require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ensureSchema } = require('./server/ensure-schema');
const { postgres } = require('./server/connect');
const app = express();

// O app mobile não depende de CORS (não é navegador). A lista só importa para
// clientes de navegador; vazia = qualquer origem (a API usa Bearer token, sem cookies).
const corsOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(cors(corsOrigins.length > 0 ? { origin: corsOrigins } : undefined));
// Limite alto porque a foto de perfil chega como data URI em base64.
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));
app.set('trust proxy', 1);

// Rotas
const auth      = require('./routes/auth');
const events    = require('./routes/events');
const users     = require('./routes/users');
const access    = require('./routes/access');
const categories    = require('./routes/categories');
const dashboard     = require('./routes/dashboard');
const notifications = require('./routes/notifications');
const ai = require('./routes/ai');

app.get('/health', async (req, res) => {
  try {
    await postgres.query('SELECT 1');
    return res.json({ success: true, data: { status: 'ok', db: 'ok' }, message: 'OK' });
  } catch {
    return res.status(503).json({ success: false, data: { status: 'degraded', db: 'down' }, message: 'Banco indisponível.' });
  }
});

app.use('/auth',          auth);
app.use('/events',        events);
app.use('/users',         users);
app.use('/access',        access);
app.use('/categories',    categories);
app.use('/dashboard',     dashboard);
app.use('/notifications', notifications);
app.use('/ai',            ai);

const PORT = process.env.PORT || 4444;
const HOST = process.env.HOST || "0.0.0.0";

async function startServer() {
  try {
    await ensureSchema();
    app.listen(PORT, HOST, () => {
      console.log(`Calendo API rodando em http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error('[bootstrap] failed to ensure schema', {
      message: error.message,
      code: error.code,
      detail: error.detail,
    });
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
