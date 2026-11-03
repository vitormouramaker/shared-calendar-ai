const { verifyToken } = require('../security/auth');
const utils = require('../utils/templates');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(utils.fail('Token não fornecido.'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json(utils.fail('Token inválido ou expirado.'));
  }
};
