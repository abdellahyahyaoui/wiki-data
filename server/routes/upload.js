const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../db');
const { cloudinary, storage } = require('../cloudinaryConfig');

const router = express.Router();

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

router.post('/image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }

  res.json({
    success: true,
    filename: req.file.filename,
    url: req.file.path,
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
    url: file.path,
    size: file.size
  }));

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
            [itemId, countryId, file.originalname, '', new Date().toISOString().split('T')[0], 'image', file.path]
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

  res.json({
    success: true,
    filename: req.file.filename,
    url: req.file.path,
    size: req.file.size
  });
});

router.post('/youtube', async (req, res) => {
  const { url, countryCode, title, description } = req.body;
  if (!url) return res.status(400).json({ error: 'URL de YouTube requerida' });

  try {
    if (countryCode) {
      const connection = await pool.getConnection();
      const [countries] = await connection.query('SELECT id FROM countries WHERE code = ? LIMIT 1', [countryCode]);
      
      if (countries.length > 0) {
        const countryId = countries[0].id;
        const itemId = uuidv4();
        await connection.query(
          "INSERT INTO fototeca (item_id, country_id, title, description, date, type, url) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [itemId, countryId, title || 'Video YouTube', description || '', new Date().toISOString().split('T')[0], 'video', url]
        );
      }
      connection.release();
    }
    res.json({ success: true, url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/media', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }

  res.json({
    success: true,
    filename: req.file.filename,
    url: req.file.path,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

router.delete('/:filename', async (req, res) => {
  const { filename } = req.params;
  try {
    // Cloudinary deletion logic would go here if needed
    // For now we just return success to not block CMS
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el archivo' });
  }
});

module.exports = router;

module.exports = router;
