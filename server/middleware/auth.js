const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const secretFile = path.join(__dirname, '../data/jwt-secret.key');
function getJWTSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  
  if (fs.existsSync(secretFile)) {
    return fs.readFileSync(secretFile, 'utf8').trim();
  }
  
  const secret = crypto.randomBytes(64).toString('hex');
  const dir = path.dirname(secretFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(secretFile, secret, { mode: 0o600 });
  return secret;
}

const JWT_SECRET = getJWTSecret();

function authenticateToken(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Se requieren permisos de administrador' });
  }
  next();
}

function checkCountryPermission(req, res, next) {
  const { countryCode } = req.params;
  const user = req.user;

  if (user.role === 'admin' || user.countries.includes('all') || user.countries.includes(countryCode)) {
    next();
  } else {
    return res.status(403).json({ error: 'No tienes permiso para este país' });
  }
}

function checkPermission(action) {
  return (req, res, next) => {
    const user = req.user;
    
    if (user.role === 'admin') {
      return next();
    }

    const permissions = user.permissions || {};
    
    switch(action) {
      case 'create':
        if (!permissions.canCreate) {
          return res.status(403).json({ error: 'No tienes permiso para crear contenido' });
        }
        break;
      case 'edit':
        if (!permissions.canEdit) {
          return res.status(403).json({ error: 'No tienes permiso para editar contenido' });
        }
        break;
      case 'delete':
        if (!permissions.canDelete) {
          return res.status(403).json({ error: 'No tienes permiso para eliminar contenido' });
        }
        break;
    }
    
    if (permissions.requiresApproval && action !== 'read') {
      req.requiresApproval = true;
    }
    
    next();
  };
}

module.exports = {
  authenticateToken,
  requireAdmin,
  checkCountryPermission,
  checkPermission,
  JWT_SECRET
};
