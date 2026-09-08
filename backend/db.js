const path = require('path');
const sql = require('mssql');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

// Azure SQL / MSSQL bağlantı konfigürasyonu (TCP/IP)
const config = {
  server:   process.env.DB_HOST     || 'localhost',
  database: process.env.DB_NAME     || 'izintakip',
  user:     process.env.DB_USER     || 'sa',
  password: process.env.DB_PASSWORD || '',
  port:     parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT !== 'false', // Azure için true, lokal için false
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  }
};

console.log(`[DB] ${config.server}:${config.port}/${config.database}`);

let pool = null;

async function getPool() {
  if (pool) return pool;
  pool = await sql.connect(config);
  console.log('✅ MSSQL veritabanına bağlanıldı.');
  return pool;
}

// MSSQL execute arayüzü: const [rows] = await db.execute(sql, params)
const db = {
  sql,

  async execute(query, params = []) {
    const p = await getPool();
    const req = p.request();

    // ? → @p0, @p1, ...
    let i = 0;
    const mssqlQuery = query.replace(/\?/g, () => `@p${i++}`);

    params.forEach((val, j) => {
      if (val === null || val === undefined) {
        req.input(`p${j}`, sql.NVarChar, null);
      } else if (typeof val === 'boolean') {
        req.input(`p${j}`, sql.Bit, val ? 1 : 0);
      } else if (Number.isInteger(val)) {
        req.input(`p${j}`, sql.Int, val);
      } else if (typeof val === 'number') {
        req.input(`p${j}`, sql.Decimal(10, 2), val);
      } else {
        req.input(`p${j}`, sql.NVarChar, String(val));
      }
    });

    const result = await req.query(mssqlQuery);
    return [result.recordset || []];
  },

  async getConnection() {
    const p = await getPool();
    const tx = new sql.Transaction(p);
    await tx.begin();
    return {
      execute: async (query, params = []) => {
        const req = new sql.Request(tx);
        let i = 0;
        const mssqlQuery = query.replace(/\?/g, () => `@p${i++}`);
        params.forEach((val, j) => {
          if (val === null || val === undefined) {
            req.input(`p${j}`, sql.NVarChar, null);
          } else if (typeof val === 'boolean') {
            req.input(`p${j}`, sql.Bit, val ? 1 : 0);
          } else if (Number.isInteger(val)) {
            req.input(`p${j}`, sql.Int, val);
          } else if (typeof val === 'number') {
            req.input(`p${j}`, sql.Decimal(10, 2), val);
          } else {
            req.input(`p${j}`, sql.NVarChar, String(val));
          }
        });
        const result = await req.query(mssqlQuery);
        return [result.recordset || []];
      },
      beginTransaction: async () => {},
      commit:   async () => tx.commit(),
      rollback: async () => tx.rollback(),
      release:  () => {},
    };
  },
};

module.exports = db;
