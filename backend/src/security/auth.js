const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const DEV_JWT_SECRET = 'segredo-local-somente-para-desenvolvimento-0001';

function resolveJwtSecret() {
  const configured = String(process.env.JWT_SECRET || '').trim();

  if (configured) {
    return configured;
  }

  // Em produção o segredo é obrigatório: sem ele qualquer um poderia assinar
  // tokens com o valor padrão publicado no repositório.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET não configurado. Defina um segredo forte antes de subir em produção.');
  }

  console.warn('[auth] JWT_SECRET vazio: usando segredo local de desenvolvimento.');
  return DEV_JWT_SECRET;
}

const JWT_SECRET = resolveJwtSecret();

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

function comparePassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
};
