const jwt = require('jsonwebtoken');

// Token kontrolü
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Yetkilendirme reddedildi. Lütfen giriş yapın.' });

  jwt.verify(token, process.env.JWT_SECRET || 'supersecret_izintakip_key_2026', (err, user) => {
    if (err) return res.status(403).json({ error: 'Geçersiz veya süresi dolmuş token.' });
    req.user = user;
    next();
  });
};

// Rol yetki kontrolü
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz bulunmamaktadır.' });
    }
    next();
  };
};

module.exports = { authenticateToken, requireRole };
