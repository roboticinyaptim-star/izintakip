const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Ara yazılımlar
app.use(cors());
app.use(express.json());

// Statik arayüz dosyaları
app.use(express.static(path.join(__dirname, '../frontend')));

// API rotaları
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const companyRoutes = require('./routes/companies');
const leaveRoutes = require('./routes/leaves');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/leaves', leaveRoutes);

const initDb = require('./initDb');

// Veritabanını hazırla
initDb();

// Sağlık kontrolü
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'İzin Takip Sistemi API çalışıyor.' });
});

// Sunucuyu başlat
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor.`);
});
