const db = require('./db');

async function initDb() {
  try {
    // Şirketler tablosu
    await db.execute(`
      CREATE TABLE IF NOT EXISTS companies (
        id VARCHAR(50) PRIMARY KEY,
        code VARCHAR(50) UNIQUE,
        name VARCHAR(150) NOT NULL,
        admin_id VARCHAR(50),
        telegram_bot_token VARCHAR(255),
        telegram_chat_id VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Kullanıcılar tablosu
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        company_id VARCHAR(50) NOT NULL,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('superadmin', 'admin', 'staff') NOT NULL DEFAULT 'staff',
        name VARCHAR(150) NOT NULL,
        department VARCHAR(100),
        telegram_chat_id VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        is_registered BOOLEAN DEFAULT TRUE,
        leave_total INT DEFAULT 14,
        leave_used INT DEFAULT 0,
        leave_pending INT DEFAULT 0,
        leave_remaining INT DEFAULT 14,
        hourly_total INT DEFAULT 16,
        hourly_used INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      )
    `);

    // İzin türleri tablosu
    await db.execute(`
      CREATE TABLE IF NOT EXISTS leave_types (
        id VARCHAR(50) PRIMARY KEY,
        company_id VARCHAR(50) NOT NULL,
        type_key VARCHAR(50) NOT NULL,
        label VARCHAR(100) NOT NULL,
        max_days INT DEFAULT 0,
        requires_approval BOOLEAN DEFAULT TRUE,
        requires_document BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      )
    `);

    // İzin talepleri tablosu
    await db.execute(`
      CREATE TABLE IF NOT EXISTS leaves (
        id VARCHAR(50) PRIMARY KEY,
        company_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL,
        leave_type_key VARCHAR(50),
        start_date DATE,
        end_date DATE,
        start_time VARCHAR(10),
        end_time VARCHAR(10),
        duration DECIMAL(10,2) NOT NULL,
        description TEXT,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        approved_by VARCHAR(50),
        approved_at DATETIME,
        rejection_reason TEXT,
        document_url VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Sistem şirketi ekle
    await db.execute(`
      INSERT IGNORE INTO companies (id, code, name, admin_id) 
      VALUES ('system', 'SYS', 'Sistem Yönetimi', 'u_superadmin')
    `);

    // Sistem yöneticisi ekle
    await db.execute(`
      INSERT IGNORE INTO users (id, company_id, username, email, password, role, name, department, is_active)
      VALUES (
        'u_superadmin', 
        'system', 
        'admin', 
        'admin@sistem.com', 
        '$2a$10$WqB4Q6TqC7X0YpL2yI9W6u8aA5lJv5M7x9K3R/Fz1qN7x8A9P1O/a',
        'superadmin', 
        'Sistem Yöneticisi', 
        'Genel Yönetim', 
        TRUE
      )
    `);

    console.log('✅ Veritabanı tabloları ve başlangıç verileri hazır.');
  } catch (err) {
    console.error('⚠️ Veritabanı başlatma uyarısı:', err.message);
  }
}

module.exports = initDb;
