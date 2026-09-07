const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

// Veritabanı bağlantı ayarları — Railway MYSQL değişkenlerini kullan
const connectionConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'izintakip',
  port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

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
