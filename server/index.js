require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const { testConnection, initDatabase } = require('./db');
const authRoutes = require('./routes/auth');
const cmsRoutes = require('./routes/cms');
const uploadRoutes = require('./routes/upload');
const publicApiRoutes = require('./routes/public-api');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// --- Data directory ---
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const usersFile = path.join(dataDir, 'users.json');

// --- Admin creation ---
const bcrypt = require('bcryptjs');
const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin1234!';
let users = { users: [] };

if (fs.existsSync(usersFile)) {
  try {
    users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
  } catch (err) {
    console.error('Error leyendo users.json:', err.message);
  }
}

let adminUser = users.users.find(u => u.username === 'admin');

if (!adminUser) {
  // Crear admin
  adminUser = {
    id: 'admin',
    username: 'admin',
    password: bcrypt.hashSync(defaultPassword, 10),
    role: 'admin',
    name: 'Administrador',
    countries: ['all'],
    permissions: { canCreate: true, canEdit: true, canDelete: true, requiresApproval: false },
    createdAt: new Date().toISOString(),
    mustChangePassword: true
  };
  users.users.push(adminUser);
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  console.log(`\n=== ADMIN CREADO ===\nUsuario: admin\nContraseña: ${defaultPassword}\n===================\n`);
} else if (process.env.RESET_ADMIN === 'true') {
  // Resetear contraseña opcional
  adminUser.password = bcrypt.hashSync(defaultPassword, 10);
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  console.log(`\n=== ADMIN RESETEADO ===\nUsuario: admin\nContraseña: ${defaultPassword}\n====================\n`);
}

// --- Pending changes file ---
const pendingFile = path.join(dataDir, 'pending-changes.json');
if (!fs.existsSync(pendingFile)) fs.writeFileSync(pendingFile, JSON.stringify({ changes: [] }, null, 2));

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/public', publicApiRoutes);

app.use('/imagenes', express.static(path.join(__dirname, '../public/imagenes')));
app.use('/uploads', express.static(path.join(__dirname, '../public/imagenes')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Serve React SPA ---
const buildPath = path.join(__dirname, '../build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.use(express.static(path.join(__dirname, '../public')));

  app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) res.sendFile(path.join(buildPath, 'index.html'));
    else next();
  });
}

const host = '0.0.0.0';

async function startServer() {
  try {
    const dbConnected = await testConnection();
    if (dbConnected) {
      await initDatabase();
      console.log('Database initialized');
    } else {
      console.log('Warning: Running without MySQL - using JSON fallback');
    }
  } catch (error) {
    console.error('Database init error:', error.message);
    console.log('Warning: Running without MySQL - using JSON fallback');
  }

  app.listen(PORT, host, () => console.log(`CMS Server running on port ${PORT}`));
}

startServer();
