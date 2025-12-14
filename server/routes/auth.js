const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireAdmin, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const usersFile = path.join(__dirname, '../data/users.json');

function getUsers() {
  const data = fs.readFileSync(usersFile, 'utf8');
  return JSON.parse(data);
}

function saveUsers(data) {
  fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  const data = getUsers();
  const user = data.users.find(u => u.username === username);

  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      countries: user.countries,
      permissions: user.permissions
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  });

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      countries: user.countries,
      permissions: user.permissions
    },
    token
  });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

router.get('/users', authenticateToken, requireAdmin, (req, res) => {
  const data = getUsers();
  const usersWithoutPasswords = data.users.map(u => ({
    id: u.id,
    username: u.username,
    role: u.role,
    name: u.name,
    countries: u.countries,
    permissions: u.permissions,
    createdAt: u.createdAt
  }));
  res.json({ users: usersWithoutPasswords });
});

router.post('/users', authenticateToken, requireAdmin, (req, res) => {
  const { username, password, name, role, countries, permissions } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const data = getUsers();
  
  if (data.users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'El usuario ya existe' });
  }

  const newUser = {
    id: uuidv4(),
    username,
    password: bcrypt.hashSync(password, 10),
    name,
    role: role || 'editor',
    countries: countries || [],
    permissions: permissions || {
      canCreate: true,
      canEdit: false,
      canDelete: false,
      requiresApproval: true
    },
    createdAt: new Date().toISOString()
  };

  data.users.push(newUser);
  saveUsers(data);

  res.json({
    success: true,
    user: {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      name: newUser.name,
      countries: newUser.countries,
      permissions: newUser.permissions
    }
  });
});

router.put('/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, password, role, countries, permissions } = req.body;

  const data = getUsers();
  const userIndex = data.users.findIndex(u => u.id === id);

  if (userIndex === -1) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  if (name) data.users[userIndex].name = name;
  if (password) data.users[userIndex].password = bcrypt.hashSync(password, 10);
  if (role) data.users[userIndex].role = role;
  if (countries) data.users[userIndex].countries = countries;
  if (permissions) data.users[userIndex].permissions = permissions;

  saveUsers(data);

  res.json({
    success: true,
    user: {
      id: data.users[userIndex].id,
      username: data.users[userIndex].username,
      role: data.users[userIndex].role,
      name: data.users[userIndex].name,
      countries: data.users[userIndex].countries,
      permissions: data.users[userIndex].permissions
    }
  });
});

router.delete('/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  const data = getUsers();
  const userIndex = data.users.findIndex(u => u.id === id);

  if (userIndex === -1) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  if (data.users[userIndex].username === 'admin') {
    return res.status(400).json({ error: 'No se puede eliminar el administrador principal' });
  }

  data.users.splice(userIndex, 1);
  saveUsers(data);

  res.json({ success: true });
});

module.exports = router;
