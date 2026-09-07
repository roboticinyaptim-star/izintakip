const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

// Bağlantı konfigürasyonu — URL varsa onu kullan, yoksa tek tek değişkenler
const DB_URL = process.env.MYSQL_URL || process.env.DATABASE_URL || null;

// URL mysql:// ile başlıyorsa doğrudan kullan
const connectionConfig = (DB_URL && DB_URL.startsWith('mysql'))
  ? DB_URL
  : {
      host:     process.env.MYSQLHOST     || process.env.DB_HOST || 'localhost',
      user:     process.env.MYSQLUSER     || process.env.DB_USER || 'root',
      password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
      database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'izintakip',
      port:     parseInt(process.env.MYSQLPORT || process.env.DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };

console.log('[DB] Bağlantı modu:', typeof connectionConfig === 'string' ? 'URL' : `${connectionConfig.host}:${connectionConfig.port}/${connectionConfig.database}`);

const pool = mysql.createPool(connectionConfig);

// Bağlantıyı test et
pool.getConnection()
  .then(conn => {
    console.log('MySQL veritabanına başarıyla bağlanıldı.');
    conn.release();
  })
  .catch(err => {
    console.error('MySQL bağlantı hatası:', err.message);
  });

module.exports = pool;
