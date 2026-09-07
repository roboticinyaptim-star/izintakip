const db = require('./db');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    // Örnek şirket idsi
    const companyId = 'c_mtm041nwlw0j';
    const passwordHash = await bcrypt.hash('staff123', 10);
    
    // Örnek personel verileri
    const staffs = [
      { id: 'u_ptt_staff1', name: 'Ahmet Yılmaz', username: 'ahmet', email: 'ahmet@ptt.com', dept: 'Kargo', used: 3 },
      { id: 'u_ptt_staff2', name: 'Ayşe Demir', username: 'ayse', email: 'ayse@ptt.com', dept: 'İnsan Kaynakları', used: 5 },
      { id: 'u_ptt_staff3', name: 'Mehmet Kaya', username: 'mehmet', email: 'mehmet@ptt.com', dept: 'Lojistik', used: 2 }
    ];

    for (const s of staffs) {
      // Personel kaydı oluştur
      await db.execute(
        `INSERT INTO users (id, company_id, username, email, password, role, name, department, leave_total, leave_used, leave_remaining, hourly_total, hourly_used) 
          VALUES (?, ?, ?, ?, ?, 'staff', ?, ?, 14, ?, ?, 16, 0)`,
        [s.id, companyId, s.username, s.email, passwordHash, s.name, s.dept, s.used, 14 - s.used]
      );
      console.log('Eklendi personel:', s.name);
      
      // Örnek izin kaydı
      const leaveId = 'l_' + Date.now() + Math.floor(Math.random()*1000);
      await db.execute(
        `INSERT INTO leaves (id, company_id, user_id, type, leave_type_key, start_date, end_date, duration, description, status)
          VALUES (?, ?, ?, 'daily', 'annual', ?, ?, ?, ?, 'approved')`,
        [
          leaveId, companyId, s.id, 
          '2026-08-01', '2026-08-' + String(1 + s.used).padStart(2, '0'), 
          s.used, 'Yaz tatili'
        ]
      );
      console.log('Eklendi izin:', s.name, s.used, 'gün');
    }

    console.log('Basariyla eklendi!');
    process.exit(0);
  } catch (err) {
    console.error('Hata:', err);
    process.exit(1);
  }
})();
