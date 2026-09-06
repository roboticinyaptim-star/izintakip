const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
const path = require('path');

// Frontend dosyalarını (HTML, CSS, JS) sun (Klasör yapısına uygun olarak ../frontend klasöründen)
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const companyRoutes = require('./routes/companies');
const leaveRoutes = require('./routes/leaves');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/leaves', leaveRoutes);

const initDb = require('./initDb');

// Sunucu başlarken DB tablolarını kontrol et ve hazırla
initDb();

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'İzin Takip Sistemi API çalışıyor.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor.`);
});
