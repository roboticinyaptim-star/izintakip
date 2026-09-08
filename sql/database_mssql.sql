-- ============================================================
-- ADIM 1: SQL Server Authentication modunu aç + sa kullanıcısını aktif et
-- Bu bloğu çalıştırın, sonra SQL Server servisini yeniden başlatın
-- ============================================================

USE master;
GO

-- SQL Server Authentication'ı etkinleştir (Mixed Mode)
EXEC xp_instance_regwrite 
  N'HKEY_LOCAL_MACHINE', 
  N'Software\Microsoft\MSSQLServer\MSSQLServer',
  N'LoginMode', REG_DWORD, 2;
GO

-- sa kullanıcısını etkinleştir ve şifre belirle
ALTER LOGIN sa ENABLE;
GO
ALTER LOGIN sa WITH PASSWORD = 'IzinTakip2026!';
GO

PRINT 'SQL Server Authentication aktif edildi.';
PRINT 'sa kullanicisi aktif, sifre: IzinTakip2026!';
PRINT '';
PRINT 'SIMDI: SQL Server servisini yeniden baslatın!';
PRINT 'Baslatma Menüsü > Services > SQL Server (SQLEXPRESS) > Restart';
GO

-- ============================================================
-- ADIM 2: Bu bloğu servis yeniden başlatıldıktan SONRA çalıştırın
-- ============================================================

-- Veritabanı oluştur
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'izintakip')
BEGIN
  CREATE DATABASE izintakip;
  PRINT 'izintakip veritabani olusturuldu.';
END
GO

USE izintakip;
GO

-- Şirketler tablosu
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='companies' AND xtype='U')
CREATE TABLE companies (
  id NVARCHAR(50) PRIMARY KEY,
  code NVARCHAR(50) UNIQUE,
  name NVARCHAR(150) NOT NULL,
  admin_id NVARCHAR(50),
  telegram_bot_token NVARCHAR(255),
  telegram_chat_id NVARCHAR(100),
  created_at DATETIME DEFAULT GETDATE()
);
GO

-- Kullanıcılar tablosu
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
);
GO

-- İzin türleri tablosu
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
);
GO

-- İzin talepleri tablosu
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
);
GO

-- Sistem şirketi
IF NOT EXISTS (SELECT id FROM companies WHERE id = 'system')
INSERT INTO companies (id, code, name, admin_id)
VALUES ('system', 'SYS', 'Sistem Yönetimi', 'u_superadmin');
GO

-- Sistem yöneticisi (şifre: admin)
IF NOT EXISTS (SELECT id FROM users WHERE id = 'u_superadmin')
INSERT INTO users (id, company_id, username, email, password, role, name, department, is_active)
VALUES (
  'u_superadmin', 'system', 'admin', 'admin@sistem.com',
  '$2a$10$WqB4Q6TqC7X0YpL2yI9W6u8aA5lJv5M7x9K3R/Fz1qN7x8A9P1O/a',
  'superadmin', 'Sistem Yöneticisi', 'Genel Yönetim', 1
);
GO

PRINT '==============================================';
PRINT 'Tum tablolar ve baslangic verileri hazirlandi!';
PRINT 'Artik node server.js calistirilabilir.';
PRINT '==============================================';
GO
