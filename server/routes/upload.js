const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../db');

const router = express.Router();

const imagenesDir = path.join(__dirname, '../../public/imagenes');
if (!fs.existsSync(imagenesDir)) {
  fs.mkdirSync(imagenesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imagenesDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
    const uniqueName = `${name}_${uuidv4().slice(0, 8)}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/ogg',
    'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp3', 'audio/m4a'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

router.post('/image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }

  const url = `/imagenes/${req.file.filename}`;
  res.json({
    success: true,
    filename: req.file.filename,
    url,
    size: req.file.size
  });
});

router.post('/images', upload.array('images', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No se subieron archivos' });
  }

  const countryCode = req.query.countryCode || req.body.countryCode;
  const uploaded = req.files.map(file => ({
    filename: file.filename,
    url: `/imagenes/${file.filename}`,
    size: file.size
  }));

  // Registrar en MySQL si es para un país específico
  if (countryCode) {
    try {
      const connection = await pool.getConnection();
      const [countries] = await connection.query('SELECT id FROM countries WHERE code = ? LIMIT 1', [countryCode]);
      
      if (countries.length > 0) {
        const countryId = countries[0].id;
        for (const file of req.files) {
          const itemId = uuidv4();
          await connection.query(
            "INSERT INTO fototeca (item_id, country_id, title, description, date, type, url) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [itemId, countryId, file.originalname, '', new Date().toISOString().split('T')[0], 'image', `/imagenes/${file.filename}`]
          );
        }
      }
      connection.release();
    } catch (error) {
      console.error('Error registering images in DB:', error);
    }
  }

  res.json({
    success: true,
    files: uploaded
  });
});

router.post('/video', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }

  const url = `/imagenes/${req.file.filename}`;
  res.json({
    success: true,
    filename: req.file.filename,
    url,
    size: req.file.size
  });
});

router.post('/media', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }

  const url = `/imagenes/${req.file.filename}`;
  res.json({
    success: true,
    filename: req.file.filename,
    url,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

router.get('/list', (req, res) => {
  const files = fs.readdirSync(imagenesDir);
  const images = files
    .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
    .map(f => ({
      filename: f,
      url: `/imagenes/${f}`
    }));
  
  const videos = files
    .filter(f => /\.(mp4|webm)$/i.test(f))
    .map(f => ({
      filename: f,
      url: `/imagenes/${f}`
    }));

  res.json({ images, videos });
});

router.delete('/:filename', (req, res) => {
  const { filename } = req.params;
  
  const sanitizedFilename = path.basename(filename);
  
  if (sanitizedFilename !== filename || 
      sanitizedFilename.includes('..') || 
      sanitizedFilename.includes('/') || 
      sanitizedFilename.includes('\\')) {
    return res.status(400).json({ error: 'Nombre de archivo inválido' });
  }
  
  const filePath = path.join(imagenesDir, sanitizedFilename);
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(imagenesDir);
  
  if (!resolvedPath.startsWith(resolvedDir + path.sep)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }

  try {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el archivo' });
  }
});

module.exports = router;
