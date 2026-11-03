const utils = require('../utils/templates');

/**
 * Limitador simples em memória (janela fixa por IP + rota). Suficiente para
 * uma instância única; com várias instâncias, trocar por um store
 * compartilhado (Redis, por exemplo).
 */
function createRateLimit({ windowMs, max, message }) {
  const hits = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) {
        hits.delete(key);
      }
    }
  }, windowMs);
  cleanup.unref();

  return (req, res, next) => {
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;

    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json(utils.fail(message));
    }

    return next();
  };
}

module.exports = { createRateLimit };
