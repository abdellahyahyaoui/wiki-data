const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

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

router.post('/image', authenticateToken, upload.single('image'), (req, res) => {
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

router.post('/images', authenticateToken, upload.array('images', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No se subieron archivos' });
  }

  const uploaded = req.files.map(file => ({
    filename: file.filename,
    url: `/imagenes/${file.filename}`,
    size: file.size
  }));

  res.json({
    success: true,
    files: uploaded
  });
});

router.post('/video', authenticateToken, upload.single('video'), (req, res) => {
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

router.post('/media', authenticateToken, upload.single('file'), (req, res) => {
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

router.get('/list', authenticateToken, (req, res) => {
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

router.delete('/:filename', authenticateToken, (req, res) => {
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
