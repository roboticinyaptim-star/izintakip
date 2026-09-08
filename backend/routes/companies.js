const express = require('express');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

// Şirket ayarlarını getir
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT telegram_bot_token, telegram_chat_id FROM companies WHERE id = ?', [req.user.companyId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Şirket bulunamadı.' });
    res.json({
      telegramBotToken: rows[0].telegram_bot_token || '',
      telegramChatId: rows[0].telegram_chat_id || ''
    });
  } catch (err) {
    console.error('Company settings GET error:', err);
    res.status(500).json({ error: 'Ayarlar alınamadı.' });
  }
});

// Şirket ayarlarını güncelle
router.put('/settings', authenticateToken, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { telegramBotToken, telegramChatId } = req.body;
    await db.execute(
      'UPDATE companies SET telegram_bot_token = ?, telegram_chat_id = ? WHERE id = ?',
      [telegramBotToken !== undefined ? telegramBotToken : null, telegramChatId !== undefined ? telegramChatId : null, req.user.companyId]
    );
    res.json({ message: 'Şirket ayarları güncellendi.' });
  } catch (err) {
    console.error('Company settings PUT error:', err);
    res.status(500).json({ error: 'Ayarlar kaydedilemedi.' });
  }
});

// Tüm şirketleri listele
router.get('/', authenticateToken, requireRole(['superadmin']), async (req, res) => {
  try {
    const [companies] = await db.execute("SELECT * FROM companies WHERE id != 'system' ORDER BY created_at DESC");
    
    // Şirket istatistiklerini hesapla
    for (let c of companies) {
      const [staff] = await db.execute("SELECT COUNT(*) as cnt FROM users WHERE company_id = ? AND role='staff'", [c.id]);
      const [leaves] = await db.execute('SELECT COUNT(*) as cnt FROM leaves WHERE company_id = ?', [c.id]);
      const [pending] = await db.execute("SELECT COUNT(*) as cnt FROM leaves WHERE company_id = ? AND status='pending'", [c.id]);
      
      c.staffCount = staff[0] ? staff[0].cnt : 0;
      c.leaveCount = leaves[0] ? leaves[0].cnt : 0;
      c.pendingCount = pending[0] ? pending[0].cnt : 0;
    }
    
    res.json(companies);
  } catch (err) {
    console.error('Companies GET error:', err);
    res.status(500).json({ error: 'Veri çekilirken hata oluştu.' });
  }
});

// Şirketi sil
router.delete('/:id', authenticateToken, requireRole(['superadmin']), async (req, res) => {
  try {
    if (req.params.id === 'system') return res.status(400).json({ error: 'Sistem silinemez.' });
    
    await db.execute('DELETE FROM companies WHERE id = ?', [req.params.id]);
    res.json({ message: 'Kurum ve tüm verileri silindi.' });
  } catch (err) {
    console.error('Companies DELETE error:', err);
    res.status(500).json({ error: 'Silme işleminde hata oluştu.' });
  }
});

module.exports = router;
