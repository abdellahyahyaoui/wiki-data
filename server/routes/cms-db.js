const express = require('express');
const router = express.Router();
const pool = require('../db').pool;
const { authenticateToken, checkCountryPermission, checkPermission } = require('../middleware/auth');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// --- HELPER FOR COUNTRIES ---
async function getCountryId(code) {
  const [rows] = await pool.query('SELECT id FROM countries WHERE code = ? LIMIT 1', [code]);
  return rows.length > 0 ? rows[0].id : null;
}

// --- FOTOTECA ---
router.get('/countries/:countryCode/fototeca', async (req, res) => {
  try {
    const countryId = await getCountryId(req.params.countryCode);
    if (!countryId) return res.json({ items: [] });
    const [items] = await pool.query('SELECT item_id as id, title, description, date, type, url FROM fototeca WHERE country_id = ? ORDER BY created_at DESC', [countryId]);
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/countries/:countryCode/fototeca', authenticateToken, async (req, res) => {
  const { title, description, date, type, url } = req.body;
  try {
    const countryId = await getCountryId(req.params.countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });
    const itemId = uuidv4();
    await pool.query(
      "INSERT INTO fototeca (item_id, country_id, title, description, date, type, url) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [itemId, countryId, title, description || '', date || '', type || 'image', url]
    );
    res.json({ success: true, item: { id: itemId, title, url } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/countries/:countryCode/fototeca/:itemId', authenticateToken, async (req, res) => {
  const { title, description, date, type, url } = req.body;
  try {
    const countryId = await getCountryId(req.params.countryCode);
    await pool.query(
      'UPDATE fototeca SET title = ?, description = ?, date = ?, type = ?, url = ? WHERE item_id = ? AND country_id = ?',
      [title, description, date, type, url, req.params.itemId, countryId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/countries/:countryCode/fototeca/:itemId', authenticateToken, async (req, res) => {
  try {
    const countryId = await getCountryId(req.params.countryCode);
    await pool.query('DELETE FROM fototeca WHERE item_id = ? AND country_id = ?', [req.params.itemId, countryId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- TESTIMONIES ---
router.get('/countries/:countryCode/testimonies', async (req, res) => {
  try {
    const countryId = await getCountryId(req.params.countryCode);
    if (!countryId) return res.json({ items: [] });
    const [rows] = await pool.query('SELECT id, name, bio, image, social FROM witnesses WHERE country_id = ?', [countryId]);
    res.json({ items: rows.map(r => ({ ...r, social: typeof r.social === 'string' ? JSON.parse(r.social) : r.social || {} })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/countries/:countryCode/testimonies/:witnessId', async (req, res) => {
  try {
    const [witnesses] = await pool.query('SELECT * FROM witnesses WHERE id = ?', [req.params.witnessId]);
    if (witnesses.length === 0) return res.status(404).json({ error: 'No encontrado' });
    const [testimonies] = await pool.query('SELECT id, title, summary, date, content_blocks as contentBlocks, media FROM testimonies WHERE witness_id = ?', [req.params.witnessId]);
    res.json({
      ...witnesses[0],
      social: typeof witnesses[0].social === 'string' ? JSON.parse(witnesses[0].social) : witnesses[0].social || {},
      testimonies: testimonies.map(t => ({
        ...t,
        contentBlocks: typeof t.contentBlocks === 'string' ? JSON.parse(t.contentBlocks) : t.contentBlocks || [],
        media: typeof t.media === 'string' ? JSON.parse(t.media) : t.media || []
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- TIMELINE ---
router.get('/countries/:countryCode/timeline', async (req, res) => {
  try {
    const countryId = await getCountryId(req.params.countryCode);
    if (!countryId) return res.json({ items: [] });
    const [rows] = await pool.query('SELECT event_id as id, date, title, summary, image, video, year, month FROM timeline_events WHERE country_id = ? ORDER BY year DESC, month DESC', [countryId]);
    res.json({ items: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- RESISTANCE ---
router.get('/countries/:countryCode/resistance', async (req, res) => {
  try {
    const countryId = await getCountryId(req.params.countryCode);
    if (!countryId) return res.json({ items: [] });
    const [rows] = await pool.query('SELECT id, name, bio, image, social FROM resistors WHERE country_id = ?', [countryId]);
    res.json({ items: rows.map(r => ({ ...r, social: typeof r.social === 'string' ? JSON.parse(r.social) : r.social || {} })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- DESCRIPTION ---
router.get('/countries/:countryCode/description', async (req, res) => {
  try {
    const countryId = await getCountryId(req.params.countryCode);
    if (!countryId) return res.json({ title: '', chapters: [] });
    const [rows] = await pool.query('SELECT title, chapters FROM descriptions WHERE country_id = ?', [countryId]);
    if (rows.length === 0) return res.json({ title: '', chapters: [] });
    res.json({ title: rows[0].title, chapters: typeof rows[0].chapters === 'string' ? JSON.parse(rows[0].chapters) : rows[0].chapters || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/countries/:countryCode/description', authenticateToken, async (req, res) => {
  try {
    const countryId = await getCountryId(req.params.countryCode);
    await pool.query(
      'INSERT INTO descriptions (country_id, title, chapters) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE title = VALUES(title), chapters = VALUES(chapters)',
      [countryId, req.body.title, JSON.stringify(req.body.chapters)]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- GALLERY ---
router.get('/gallery/images', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT url, title as name FROM fototeca WHERE type = "image" ORDER BY created_at DESC LIMIT 50');
    res.json({ images: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- COMMON CMS ROUTES ---
router.get('/countries', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT code, name FROM countries ORDER BY name');
    res.json({ countries: rows.map(c => ({ ...c, sections: [{id:'description',label:'Descripción'},{id:'timeline',label:'Timeline'},{id:'testimonies',label:'Testimonios'},{id:'resistance',label:'Resistencia'},{id:'media-gallery',label:'Fototeca'}] })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;