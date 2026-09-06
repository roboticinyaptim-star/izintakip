const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

// 1. Kullanıcıları getir (role-based)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'superadmin') {
      [rows] = await db.execute('SELECT * FROM users ORDER BY created_at DESC');
    } else if (req.user.role === 'admin') {
      [rows] = await db.execute('SELECT * FROM users WHERE company_id = ? ORDER BY created_at DESC', [req.user.companyId]);
    } else {
      // Staff kendi profilini görür
      [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
    }

    const users = rows.map(u => {
      const { password, ...safeUser } = u;
      return safeUser;
    });

    res.json(users);
  } catch (err) {
    console.error('Users GET error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// 2. Yeni kullanıcı ekle
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, department, username, email, password, role, telegramChatId, leaveTotal, hourlyTotal } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: 'Ad, kullanıcı adı, e-posta ve şifre zorunludur.' });
    }

    const [existing] = await db.execute('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Bu e-posta veya kullanıcı adı kullanımda.' });
    }

    const userId = 'u_' + Date.now().toString(36);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const total = parseInt(leaveTotal) || 14;
    const hourly = parseInt(hourlyTotal) || 16;

    await db.execute(
      `INSERT INTO users (
        id, company_id, username, email, password, role, name, department,
        telegram_chat_id, leave_total, leave_remaining, hourly_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        req.user.companyId,
        username,
        email,
        hashedPassword,
        role || 'staff',
        name,
        department || '',
        telegramChatId || '',
        total,
        total,
        hourly
      ]
    );

    res.status(201).json({ message: 'Personel başarıyla eklendi.', id: userId });
  } catch (err) {
    console.error('User POST error:', err);
    res.status(500).json({ error: 'Kayıt sırasında hata oluştu.' });
  }
});

// 3. Kullanıcı güncelle
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const targetId = req.params.id;

    // Yetki kontrolü: admin kendi şirketindekini güncelleyebilir, staff sadece kendini
    if (req.user.role === 'staff' && req.user.id !== targetId) {
      return res.status(403).json({ error: 'Yetkiniz yok.' });
    }

    const [userRows] = await db.execute('SELECT * FROM users WHERE id = ?', [targetId]);
    if (userRows.length === 0) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

    if (req.user.role === 'admin' && userRows[0].company_id !== req.user.companyId) {
      return res.status(403).json({ error: 'Yetkiniz yok.' });
    }

    const { name, department, email, username, password, role, telegramChatId, leaveTotal, hourlyTotal, isActive } = req.body;

    // Güncelleme alanlarını oluştur
    const fields = [];
    const values = [];

    if (name        !== undefined) { fields.push('name = ?');              values.push(name); }
    if (department  !== undefined) { fields.push('department = ?');        values.push(department); }
    if (email       !== undefined) { fields.push('email = ?');             values.push(email); }
    if (username    !== undefined) { fields.push('username = ?');          values.push(username); }
    if (telegramChatId !== undefined) { fields.push('telegram_chat_id = ?'); values.push(telegramChatId); }
    if (isActive    !== undefined) { fields.push('is_active = ?');         values.push(isActive ? 1 : 0); }

    // Sadece admin izin haklarını değiştirebilir
    if (req.user.role !== 'staff') {
      if (role        !== undefined) { fields.push('role = ?');              values.push(role); }
      if (leaveTotal  !== undefined) {
        const total = parseInt(leaveTotal);
        fields.push('leave_total = ?');     values.push(total);
        fields.push('leave_remaining = ?'); values.push(Math.max(0, total - (userRows[0].leave_used || 0)));
      }
      if (hourlyTotal !== undefined) { fields.push('hourly_total = ?');    values.push(parseInt(hourlyTotal)); }
    }

    // Şifre güncelleme
    if (password && password.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(password, salt);
      fields.push('password = ?');
      values.push(hashed);
    }

    if (fields.length === 0) return res.json({ message: 'Güncellenecek alan yok.' });

    values.push(targetId);
    await db.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

    res.json({ message: 'Kullanıcı başarıyla güncellendi.' });
  } catch (err) {
    console.error('User PUT error:', err);
    res.status(500).json({ error: 'Güncelleme sırasında hata oluştu.' });
  }
});

// 4. Kullanıcı sil
router.delete('/:id', authenticateToken, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const [userRows] = await db.execute('SELECT company_id FROM users WHERE id = ?', [req.params.id]);
    if (userRows.length === 0) return res.status(404).json({ error: 'Personel bulunamadı.' });

    if (req.user.role !== 'superadmin' && userRows[0].company_id !== req.user.companyId) {
      return res.status(403).json({ error: 'Yetkiniz yok.' });
    }

    await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'Personel başarıyla silindi.' });
  } catch (err) {
    console.error('User DELETE error:', err);
    res.status(500).json({ error: 'Silme işleminde hata oluştu.' });
  }
});

module.exports = router;
