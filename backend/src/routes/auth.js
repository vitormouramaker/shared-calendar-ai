const crypto = require('crypto');
const express = require('express');
const rota = express.Router();
const execute = require('../services/execute');
const security = require('../security/auth');
const emailService = require('../server/email');
const utils = require('../utils/templates');
const { createRateLimit } = require('../middleware/rate-limit');

const RESET_CODE_TTL_MINUTES = 15;
const RESET_CODE_MAX_ATTEMPTS = 5;

const loginLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
});

const registerLimit = createRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Muitos cadastros a partir deste endereço. Tente mais tarde.',
});

const passwordResetLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Muitas tentativas de recuperação. Aguarde alguns minutos.',
});

// Código de 6 dígitos gerado com fonte criptográfica (não Math.random).
function createResetCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

// POST /auth/register
rota.post('/register', registerLimit, async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    const username = String(req.body?.username ?? '')
      .trim()
      .replace(/^@/, '')
      .toLowerCase();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password ?? '');

    if (!name || !username || !email || !password) {
      return res.status(400).json(utils.fail('Preencha todos os campos.'));
    }

    if (password.length < 6) {
      return res.status(400).json(utils.fail('A senha deve ter pelo menos 6 caracteres.'));
    }

    const existingEmail = await execute.find_by_email(email);
    if (existingEmail.length > 0) {
      return res.status(409).json(utils.fail('Email já cadastrado.'));
    }

    const existingUsername = await execute.find_by_username(username);
    if (existingUsername.length > 0) {
      return res.status(409).json(utils.fail('Username já em uso.'));
    }

    const passwordHash = security.hashPassword(password);
    const user = await execute.register(name, username, email, passwordHash);
    const token = security.generateToken({ id: user.id });

    console.log('[auth/register] register success', { userId: user.id });

    return res.status(201).json(utils.ok({ user, token }, 'Cadastro realizado com sucesso!'));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, '/auth/register'));
  }
});

// POST /auth/login
rota.post('/login', loginLimit, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password ?? '');

    if (!email || !password) {
      return res.status(400).json(utils.fail('Email e senha são obrigatórios.'));
    }

    const rows = await execute.find_by_email(email);
    if (rows.length === 0) {
      return res.status(401).json(utils.fail('Email ou senha incorretos.'));
    }

    const user = rows[0];
    const valid = security.comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json(utils.fail('Email ou senha incorretos.'));
    }

    const token = security.generateToken({ id: user.id });
    const { password_hash, ...safeUser } = user;

    return res.json(utils.ok({ user: safeUser, token }, 'Bem-vindo!'));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, '/auth/login'));
  }
});

// POST /auth/forgot-password
rota.post('/forgot-password', passwordResetLimit, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json(utils.fail('Informe o e-mail.'));
    }

    const user = await execute.find_user_id_by_email(email);
    const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000);

    // Mesma resposta exista ou não a conta: não revela quais e-mails estão cadastrados.
    if (!user) {
      return res.json(
        utils.ok(
          { expires_at: expiresAt.toISOString() },
          'Se existir uma conta com esse e-mail, enviaremos um codigo de recuperacao.'
        )
      );
    }

    const code = createResetCode();
    const codeHash = security.hashPassword(code);

    // O código fica preso à conta (user_id) e invalida qualquer código anterior.
    await execute.create_password_reset_token(user.id, codeHash, expiresAt.toISOString());
    await emailService.sendPasswordResetCode(user.email, code);

    return res.json(
      utils.ok(
        { expires_at: expiresAt.toISOString() },
        'Se existir uma conta com esse e-mail, enviaremos um codigo de recuperacao.'
      )
    );
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, '/auth/forgot-password'));
  }
});

// POST /auth/reset-password
rota.post('/reset-password', passwordResetLimit, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code ?? '').trim();
    const password = String(req.body?.password ?? '');

    if (!email || !code || !password) {
      return res.status(400).json(utils.fail('Informe e-mail, codigo e nova senha.'));
    }

    if (password.length < 6) {
      return res.status(400).json(utils.fail('A senha deve ter pelo menos 6 caracteres.'));
    }

    const user = await execute.find_user_id_by_email(email);

    if (!user) {
      return res.status(400).json(utils.fail('Codigo invalido ou expirado.'));
    }

    const activeToken = await execute.get_active_password_reset_token(user.id);

    if (!activeToken) {
      return res.status(400).json(utils.fail('Codigo invalido ou expirado.'));
    }

    const isValidCode = security.comparePassword(code, activeToken.code_hash);

    if (!isValidCode) {
      // Depois de N erros o código é invalidado: impede força bruta nos 6 dígitos.
      await execute.register_failed_password_reset_attempt(
        activeToken.id,
        RESET_CODE_MAX_ATTEMPTS,
      );
      return res.status(400).json(utils.fail('Codigo invalido ou expirado.'));
    }

    const passwordHash = security.hashPassword(password);
    await execute.reset_password(user.id, passwordHash, activeToken.id);

    return res.json(utils.ok(null, 'Senha redefinida com sucesso.'));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, '/auth/reset-password'));
  }
});

module.exports = rota;
