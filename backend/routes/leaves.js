const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

// İzin kayıtlarını getir
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM leaves WHERE company_id = ? ORDER BY created_at DESC';
    let params = [req.user.companyId];

    // Personel kendi izinlerini görür
    if (req.user.role === 'staff') {
      query = 'SELECT * FROM leaves WHERE company_id = ? AND user_id = ? ORDER BY created_at DESC';
      params = [req.user.companyId, req.user.id];
    }

    const [leaves] = await db.execute(query, params);
    res.json(leaves);
  } catch (err) {
    console.error('Leaves GET error:', err);
    res.status(500).json({ error: 'İzinler alınamadı.' });
  }
});

// Yeni izin talebi
router.post('/', async (req, res) => {
  try {
    const { type, leaveTypeKey, startDate, endDate, startTime, endTime, duration, description } = req.body;
    
    if (duration <= 0) return res.status(400).json({ error: 'Geçersiz izin süresi.' });

    const leaveId = 'l_' + Date.now().toString(36);

    await db.execute(
      `INSERT INTO leaves (
        id, company_id, user_id, type, leave_type_key, start_date, end_date, start_time, end_time, duration, description, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        leaveId, req.user.companyId, req.user.id, type, leaveTypeKey, 
        startDate || null, endDate || null, startTime || null, endTime || null, 
        duration, description || ''
      ]
    );

    res.status(201).json({ message: 'İzin talebiniz başarıyla oluşturuldu.', id: leaveId });
  } catch (err) {
    console.error('Leaves POST error:', err);
    res.status(500).json({ error: 'Talep oluşturulamadı.' });
  }
});

// İzin durumunu güncelle
router.patch('/:id/status', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Sadece yönetici onaylayabilir.' });

    const { status, rejectionReason } = req.body;
    
    await db.execute(
      'UPDATE leaves SET status = ?, rejection_reason = ?, approved_by = ?, approved_at = NOW() WHERE id = ? AND company_id = ?',
      [status, rejectionReason || null, req.user.id, req.params.id, req.user.companyId]
    );

    res.json({ message: 'İzin durumu güncellendi.' });
  } catch (err) {
    console.error('Leaves PATCH error:', err);
    res.status(500).json({ error: 'Güncelleme hatası.' });
  }
});

module.exports = router;
