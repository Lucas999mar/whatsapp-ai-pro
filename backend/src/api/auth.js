const jwt = require('jsonwebtoken');

const SECRET = 'wa-pro-secret-key-123';

function generateToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '24h' });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { generateToken, authMiddleware };
