const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_izintakip_key_2026';

// ── 1. LOGIN ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Hem username hem email destekleyelim (Superadmin için username "admin" olabilir)
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email, email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre.' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Hesabınız pasif durumdadır.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre.' });
    }

    // Token oluştur
    const tokenPayload = {
      id: user.id,
      companyId: user.company_id,
      role: user.role,
      name: user.name,
      email: user.email
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token,
      user: tokenPayload
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Sunucu hatası oluştu.' });
  }
});

// ── 2. REGISTER (Firma Kur) ───────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { companyName, username, email, password } = req.body;

    if (!companyName || !username || !email || !password) {
      return res.status(400).json({ error: 'Lütfen tüm alanları doldurun.' });
    }

    // 1. E-posta kullanımda mı?
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Bu e-posta veya kullanıcı adı zaten kullanımda.' });
    }

    const companyId = 'c_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const userId = 'u_' + Date.now().toString(36);
    const companyCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 haneli

    // Şifreyi Hashle
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Transaction başlat
    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
      // 1. Şirketi oluştur
      await conn.execute(
        'INSERT INTO companies (id, code, name, admin_id) VALUES (?, ?, ?, ?)',
        [companyId, companyCode, companyName, userId]
      );

      // 2. Yöneticiyi oluştur
      await conn.execute(
        `INSERT INTO users (id, company_id, username, email, password, role, name, department)
         VALUES (?, ?, ?, ?, ?, 'admin', 'Yönetici', 'Yönetim')`,
        [userId, companyId, username, email, hashedPassword]
      );

      // 3. Varsayılan İzin Türleri (Yıllık, Mazeret vb.)
      const defaultTypes = [
        [companyId, 'annual', 'Yıllık İzin', 14, true],
        [companyId, 'excuse', 'Mazeret İzni', 2, true],
        [companyId, 'sick', 'Hastalık İzni', 0, true] // Belgesiz olmasın diye kurgulanabilir
      ];
      
      for (const dt of defaultTypes) {
         const typeId = 'lt_' + Date.now().toString(36) + Math.random().toString(36).substring(2,5);
         await conn.execute(
           'INSERT INTO leave_types (id, company_id, type_key, label, max_days, requires_approval) VALUES (?, ?, ?, ?, ?, ?)',
           [typeId, ...dt]
         );
      }

      await conn.commit();
      conn.release();

      // Direkt giriş yaptır
      const tokenPayload = {
        id: userId,
        companyId: companyId,
        role: 'admin',
        name: 'Yönetici',
        email: email
      };
      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });

      res.status(201).json({
        message: 'Firma başarıyla oluşturuldu.',
        token,
        user: tokenPayload
      });

    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Kayıt işlemi sırasında bir hata oluştu.' });
  }
});

module.exports = router;
