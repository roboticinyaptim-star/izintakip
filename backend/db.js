const mysql = require('mysql2/promise');
require('dotenv').config();

// Railway veya yerel ortam bağlantı ayarları
const connectionConfig = process.env.MYSQL_URL || process.env.DATABASE_URL
  ? (process.env.MYSQL_URL || process.env.DATABASE_URL)
  : {
      host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
      user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
      password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
      database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'izintakip',
      port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT) || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };

const pool = typeof connectionConfig === 'string'
  ? mysql.createPool(connectionConfig)
  : mysql.createPool(connectionConfig);

// Test connection
pool.getConnection()
  .then(conn => {
    console.log('MySQL veritabanına başarıyla bağlanıldı.');
    conn.release();
  })
  .catch(err => {
    console.error('MySQL bağlantı hatası:', err.message);
  });

module.exports = pool;
