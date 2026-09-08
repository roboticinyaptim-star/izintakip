const db = require('./db');

async function initDb() {
  try {
    // Şirketler tablosu
    await db.execute(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='companies' AND xtype='U')
      CREATE TABLE companies (
        id NVARCHAR(50) PRIMARY KEY,
        code NVARCHAR(50) UNIQUE,
        name NVARCHAR(150) NOT NULL,
        admin_id NVARCHAR(50),
        telegram_bot_token NVARCHAR(255),
        telegram_chat_id NVARCHAR(100),
        created_at DATETIME DEFAULT GETDATE()
      )
    `);

    // Kullanıcılar tablosu
    await db.execute(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
      CREATE TABLE users (
        id NVARCHAR(50) PRIMARY KEY,
        company_id NVARCHAR(50) NOT NULL,
        username NVARCHAR(100) NOT NULL,
        email NVARCHAR(150) NOT NULL,
        password NVARCHAR(255) NOT NULL,
        role NVARCHAR(20) NOT NULL DEFAULT 'staff',
        name NVARCHAR(150) NOT NULL,
        department NVARCHAR(100),
        telegram_chat_id NVARCHAR(50),
        is_active BIT DEFAULT 1,
        is_registered BIT DEFAULT 1,
        leave_total INT DEFAULT 14,
        leave_used INT DEFAULT 0,
        leave_pending INT DEFAULT 0,
        leave_remaining INT DEFAULT 14,
        hourly_total INT DEFAULT 16,
        hourly_used INT DEFAULT 0,
        created_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (company_id) REFERENCES companies(id)
      )
    `);

    // İzin türleri tablosu
    await db.execute(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='leave_types' AND xtype='U')
      CREATE TABLE leave_types (
        id NVARCHAR(50) PRIMARY KEY,
        company_id NVARCHAR(50) NOT NULL,
        type_key NVARCHAR(50) NOT NULL,
        label NVARCHAR(100) NOT NULL,
        max_days INT DEFAULT 0,
        requires_approval BIT DEFAULT 1,
        requires_document BIT DEFAULT 0,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (company_id) REFERENCES companies(id)
      )
    `);

    // İzin talepleri tablosu
    await db.execute(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='leaves' AND xtype='U')
      CREATE TABLE leaves (
        id NVARCHAR(50) PRIMARY KEY,
        company_id NVARCHAR(50) NOT NULL,
        user_id NVARCHAR(50) NOT NULL,
        type NVARCHAR(50) NOT NULL,
        leave_type_key NVARCHAR(50),
        start_date DATE,
        end_date DATE,
        start_time NVARCHAR(10),
        end_time NVARCHAR(10),
        duration DECIMAL(10,2) NOT NULL,
        description NVARCHAR(MAX),
        status NVARCHAR(20) DEFAULT 'pending',
        approved_by NVARCHAR(50),
        approved_at DATETIME,
        rejection_reason NVARCHAR(MAX),
        document_url NVARCHAR(255),
        created_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (company_id) REFERENCES companies(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Varsayılan ana şirket (yoksa)
    await db.execute(`
      IF NOT EXISTS (SELECT id FROM companies WHERE id = 'c_main')
      INSERT INTO companies (id, code, name, admin_id)
      VALUES ('c_main', 'IZIN2026', 'Kurumsal İzin Takip', 'u_admin')
    `);

    // Varsayılan yönetici (admin / admin123) (yoksa)
    await db.execute(`
      IF NOT EXISTS (SELECT id FROM users WHERE username = 'admin')
      INSERT INTO users (
        id, company_id, username, email, password, role, name, department, is_active, is_registered,
        leave_total, leave_used, leave_pending, leave_remaining, hourly_total, hourly_used
      )
      VALUES (
        'u_admin',
        'c_main',
        'admin',
        'admin@kurum.com',
        '$2b$10$8zfF5oVuEG57/XB7DBqL8.Zt8qZGl1Vn2ObFg2iz.7odXmRFd16Rm',
        'admin',
        'Sistem Yöneticisi',
        'Yönetim',
        1, 1, 20, 0, 0, 20, 16, 0
      )
    `);

    // Standart izin türleri (yoksa)
    await db.execute(`
      IF NOT EXISTS (SELECT id FROM leave_types WHERE company_id = 'c_main')
      BEGIN
        INSERT INTO leave_types (id, company_id, type_key, label, max_days, requires_approval, requires_document, is_active)
        VALUES 
          ('lt_annual', 'c_main', 'annual', 'Yıllık İzin', 14, 1, 0, 1),
          ('lt_excuse', 'c_main', 'excuse', 'Mazeret İzni', 3, 1, 0, 1),
          ('lt_sick',   'c_main', 'sick',   'Hastalık İzni', 10, 1, 1, 1),
          ('lt_hourly', 'c_main', 'hourly', 'Saatlik İzin', 0, 1, 0, 1);
      END
    `);

    console.log('✅ Veritabanı tabloları ve başlangıç verileri hazır.');
  } catch (err) {
    console.error('⚠️ Veritabanı başlatma uyarısı:', err.message);
  }
}

module.exports = initDb;
