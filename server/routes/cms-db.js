const express = require('express');
const router = express.Router();
const pool = require('../db').pool;
const { authenticateToken, checkCountryPermission, checkPermission } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// ==================== HELPERS ====================
async function getCountryId(code) {
  const [rows] = await pool.query('SELECT id FROM countries WHERE code = ? LIMIT 1', [code]);
  return rows.length > 0 ? rows[0].id : null;
}

async function savePendingChange(change) {
  const { pool: dbPool } = require('../db');
  try {
    const connection = await dbPool.getConnection();
    await connection.query(
      `INSERT INTO pending_changes (change_id, type, section, country_code, lang, item_id, data, user_id, user_name, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [uuidv4(), change.type, change.section, change.countryCode || null, change.lang || 'es', 
       change.itemId || change.articleId || change.termId || null, JSON.stringify(change.data), 
       change.userId, change.userName]
    );
    connection.release();
  } catch (error) {
    console.error('Error saving pending change:', error);
  }
}

// ==================== COUNTRIES ====================
router.get('/countries', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT code, name FROM countries ORDER BY name');
    res.json({ 
      countries: rows.map(c => ({ 
        ...c, 
        sections: [
          {id:'description',label:'Descripción'},
          {id:'timeline',label:'Timeline'},
          {id:'testimonies',label:'Testimonios'},
          {id:'resistance',label:'Resistencia'},
          {id:'media-gallery',label:'Fototeca'}
        ] 
      })) 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/countries', authenticateToken, checkPermission('create'), async (req, res) => {
  try {
    const { code, name, lang = 'es' } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'Código y nombre requeridos' });
    
    const [existing] = await pool.query('SELECT id FROM countries WHERE code = ? LIMIT 1', [code]);
    if (existing.length > 0) return res.status(400).json({ error: 'El país ya existe' });
    
    await pool.query('INSERT INTO countries (code, name, lang) VALUES (?, ?, ?)', [code, name, lang]);
    res.json({ success: true, country: { code, name } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/predefined-countries', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT code, name_es as name, region FROM predefined_countries ORDER BY region, name_es');
    res.json({ countries: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== DESCRIPTION ====================
router.get('/countries/:countryCode/description', authenticateToken, async (req, res) => {
  try {
    const countryId = await getCountryId(req.params.countryCode);
    if (!countryId) return res.json({ title: '', chapters: [] });
    const [rows] = await pool.query('SELECT title, chapters FROM descriptions WHERE country_id = ?', [countryId]);
    if (rows.length === 0) return res.json({ title: '', chapters: [] });
    res.json({ 
      title: rows[0].title, 
      chapters: typeof rows[0].chapters === 'string' ? JSON.parse(rows[0].chapters) : rows[0].chapters || [] 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/countries/:countryCode/description', authenticateToken, checkCountryPermission, checkPermission('create'), async (req, res) => {
  try {
    const { countryCode } = req.params;
    const { title, chapters } = req.body;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'create',
        section: 'description',
        countryCode,
        data: { title, chapters },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      'INSERT INTO descriptions (country_id, title, chapters) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE title = VALUES(title), chapters = VALUES(chapters)',
      [countryId, title, JSON.stringify(chapters)]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/countries/:countryCode/description', authenticateToken, checkCountryPermission, checkPermission('edit'), async (req, res) => {
  try {
    const { countryCode } = req.params;
    const { title, chapters } = req.body;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'edit',
        section: 'description',
        countryCode,
        data: { title, chapters },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      'INSERT INTO descriptions (country_id, title, chapters) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE title = VALUES(title), chapters = VALUES(chapters)',
      [countryId, title, JSON.stringify(chapters)]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/countries/:countryCode/description', authenticateToken, checkCountryPermission, checkPermission('delete'), async (req, res) => {
  try {
    const { countryCode } = req.params;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'delete',
        section: 'description',
        countryCode,
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query('DELETE FROM descriptions WHERE country_id = ?', [countryId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TIMELINE ====================
router.get('/countries/:countryCode/timeline', authenticateToken, async (req, res) => {
  try {
    const countryId = await getCountryId(req.params.countryCode);
    if (!countryId) return res.json({ items: [] });
    const [rows] = await pool.query(
      'SELECT event_id as id, date, title, summary, image, video, year, month FROM timeline_events WHERE country_id = ? ORDER BY year DESC, month DESC',
      [countryId]
    );
    res.json({ items: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/countries/:countryCode/timeline/:itemId', authenticateToken, async (req, res) => {
  try {
    const { countryCode, itemId } = req.params;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });
    const [rows] = await pool.query(
      'SELECT event_id as id, date, title, summary, image, video, year, month, paragraphs, content_blocks, sources FROM timeline_events WHERE country_id = ? AND event_id = ?',
      [countryId, itemId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Evento no encontrado' });
    const event = rows[0];
    res.json({
      ...event,
      paragraphs: typeof event.paragraphs === 'string' ? JSON.parse(event.paragraphs) : event.paragraphs || [],
      contentBlocks: typeof event.content_blocks === 'string' ? JSON.parse(event.content_blocks) : event.content_blocks || [],
      sources: typeof event.sources === 'string' ? JSON.parse(event.sources) : event.sources || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/countries/:countryCode/timeline', authenticateToken, checkCountryPermission, checkPermission('create'), async (req, res) => {
  try {
    const { countryCode } = req.params;
    const { id, date, year, month, title, summary, image, video, paragraphs, contentBlocks, sources } = req.body;
    if (!id || !title || !date) return res.status(400).json({ error: 'ID, título y fecha requeridos' });

    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'create',
        section: 'timeline',
        countryCode,
        itemId: id,
        data: { id, date, year, month, title, summary, image, video, paragraphs, contentBlocks, sources },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      `INSERT INTO timeline_events (country_id, event_id, date, year, month, title, summary, image, video, paragraphs, content_blocks, sources)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [countryId, id, date, year || null, month || null, title, summary || '', image || null, video || null,
       JSON.stringify(paragraphs || []), JSON.stringify(contentBlocks || []), JSON.stringify(sources || [])]
    );
    res.json({ success: true, item: { id, date, year, month, title, summary, image } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/countries/:countryCode/timeline/:itemId', authenticateToken, checkCountryPermission, checkPermission('edit'), async (req, res) => {
  try {
    const { countryCode, itemId } = req.params;
    const { date, year, month, title, summary, image, video, paragraphs, contentBlocks, sources } = req.body;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'edit',
        section: 'timeline',
        countryCode,
        itemId,
        data: { date, year, month, title, summary, image, video, paragraphs, contentBlocks, sources },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      `UPDATE timeline_events SET date = ?, year = ?, month = ?, title = ?, summary = ?, image = ?, video = ?, paragraphs = ?, content_blocks = ?, sources = ?
       WHERE country_id = ? AND event_id = ?`,
      [date, year, month, title, summary || '', image, video, JSON.stringify(paragraphs || []), JSON.stringify(contentBlocks || []),
       JSON.stringify(sources || []), countryId, itemId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/countries/:countryCode/timeline/:itemId', authenticateToken, checkCountryPermission, checkPermission('delete'), async (req, res) => {
  try {
    const { countryCode, itemId } = req.params;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'delete',
        section: 'timeline',
        countryCode,
        itemId,
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query('DELETE FROM timeline_events WHERE country_id = ? AND event_id = ?', [countryId, itemId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TESTIMONIES ====================
router.get('/countries/:countryCode/testimonies', authenticateToken, async (req, res) => {
  try {
    const countryId = await getCountryId(req.params.countryCode);
    if (!countryId) return res.json({ items: [] });
    const [rows] = await pool.query('SELECT witness_id as id, name, bio, image, social FROM witnesses WHERE country_id = ? ORDER BY name', [countryId]);
    res.json({ items: rows.map(r => ({ ...r, social: typeof r.social === 'string' ? JSON.parse(r.social) : r.social || {} })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/countries/:countryCode/testimonies', authenticateToken, checkCountryPermission, checkPermission('create'), async (req, res) => {
  try {
    const { countryCode } = req.params;
    const { id, name, image, bio, social } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'ID y nombre requeridos' });

    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'create',
        section: 'testimonies',
        countryCode,
        itemId: id,
        data: { id, name, image, bio, social },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      'INSERT INTO witnesses (country_id, witness_id, name, bio, image, social) VALUES (?, ?, ?, ?, ?, ?)',
      [countryId, id, name, bio || '', image || null, JSON.stringify(social || {})]
    );
    res.json({ success: true, item: { id, name, image } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/countries/:countryCode/testimonies/:witnessId', authenticateToken, async (req, res) => {
  try {
    const { countryCode, witnessId } = req.params;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });
    const [witnesses] = await pool.query('SELECT * FROM witnesses WHERE country_id = ? AND witness_id = ?', [countryId, witnessId]);
    if (witnesses.length === 0) return res.status(404).json({ error: 'Testigo no encontrado' });
    const [testimonies] = await pool.query('SELECT * FROM testimonies WHERE witness_id = ?', [witnesses[0].id]);
    res.json({
      ...witnesses[0],
      social: typeof witnesses[0].social === 'string' ? JSON.parse(witnesses[0].social) : witnesses[0].social || {},
      testimonies: testimonies.map(t => ({
        ...t,
        paragraphs: typeof t.paragraphs === 'string' ? JSON.parse(t.paragraphs) : t.paragraphs || [],
        contentBlocks: typeof t.content_blocks === 'string' ? JSON.parse(t.content_blocks) : t.content_blocks || [],
        media: typeof t.media === 'string' ? JSON.parse(t.media) : t.media || []
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/countries/:countryCode/testimonies/:witnessId', authenticateToken, checkCountryPermission, checkPermission('edit'), async (req, res) => {
  try {
    const { countryCode, witnessId } = req.params;
    const { name, bio, image, social } = req.body;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'edit',
        section: 'testimonies',
        countryCode,
        itemId: witnessId,
        data: { name, bio, image, social },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      'UPDATE witnesses SET name = ?, bio = ?, image = ?, social = ? WHERE country_id = ? AND witness_id = ?',
      [name, bio || '', image, JSON.stringify(social || {}), countryId, witnessId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/countries/:countryCode/testimonies/:witnessId', authenticateToken, checkCountryPermission, checkPermission('delete'), async (req, res) => {
  try {
    const { countryCode, witnessId } = req.params;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'delete',
        section: 'testimonies',
        countryCode,
        itemId: witnessId,
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query('DELETE FROM witnesses WHERE country_id = ? AND witness_id = ?', [countryId, witnessId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/countries/:countryCode/testimonies/:witnessId/testimony', authenticateToken, checkCountryPermission, checkPermission('create'), async (req, res) => {
  try {
    const { countryCode, witnessId } = req.params;
    const { id, title, summary, date, paragraphs, contentBlocks, media } = req.body;
    if (!id || !title) return res.status(400).json({ error: 'ID y título requeridos' });

    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    const [witnesses] = await pool.query('SELECT id FROM witnesses WHERE country_id = ? AND witness_id = ?', [countryId, witnessId]);
    if (witnesses.length === 0) return res.status(404).json({ error: 'Testigo no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'create',
        section: 'testimony',
        countryCode,
        itemId: id,
        data: { id, title, summary, date, paragraphs, contentBlocks, media },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      'INSERT INTO testimonies (witness_id, testimony_id, title, summary, date, paragraphs, content_blocks, media) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [witnesses[0].id, id, title, summary || '', date || '', JSON.stringify(paragraphs || []), JSON.stringify(contentBlocks || []), JSON.stringify(media || [])]
    );
    res.json({ success: true, item: { id, title, summary, date } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/countries/:countryCode/testimonies/:witnessId/testimony/:testimonyId', authenticateToken, checkCountryPermission, checkPermission('edit'), async (req, res) => {
  try {
    const { countryCode, witnessId, testimonyId } = req.params;
    const { title, summary, date, paragraphs, contentBlocks, media } = req.body;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    const [witnesses] = await pool.query('SELECT id FROM witnesses WHERE country_id = ? AND witness_id = ?', [countryId, witnessId]);
    if (witnesses.length === 0) return res.status(404).json({ error: 'Testigo no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'edit',
        section: 'testimony',
        countryCode,
        itemId: testimonyId,
        data: { title, summary, date, paragraphs, contentBlocks, media },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      'UPDATE testimonies SET title = ?, summary = ?, date = ?, paragraphs = ?, content_blocks = ?, media = ? WHERE witness_id = ? AND testimony_id = ?',
      [title, summary || '', date || '', JSON.stringify(paragraphs || []), JSON.stringify(contentBlocks || []), JSON.stringify(media || []), witnesses[0].id, testimonyId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/countries/:countryCode/testimonies/:witnessId/testimony/:testimonyId', authenticateToken, async (req, res) => {
  try {
    const { countryCode, witnessId, testimonyId } = req.params;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    const [witnesses] = await pool.query('SELECT id FROM witnesses WHERE country_id = ? AND witness_id = ?', [countryId, witnessId]);
    if (witnesses.length === 0) return res.status(404).json({ error: 'Testigo no encontrado' });

    const [testimonies] = await pool.query('SELECT * FROM testimonies WHERE witness_id = ? AND testimony_id = ?', [witnesses[0].id, testimonyId]);
    if (testimonies.length === 0) return res.status(404).json({ error: 'Testimonio no encontrado' });

    const t = testimonies[0];
    res.json({
      id: t.testimony_id,
      title: t.title,
      summary: t.summary,
      date: t.date,
      paragraphs: typeof t.paragraphs === 'string' ? JSON.parse(t.paragraphs) : t.paragraphs || [],
      contentBlocks: typeof t.content_blocks === 'string' ? JSON.parse(t.content_blocks) : t.content_blocks || [],
      media: typeof t.media === 'string' ? JSON.parse(t.media) : t.media || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/countries/:countryCode/testimonies/:witnessId/testimony/:testimonyId', authenticateToken, checkCountryPermission, checkPermission('delete'), async (req, res) => {
  try {
    const { countryCode, witnessId, testimonyId } = req.params;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    const [witnesses] = await pool.query('SELECT id FROM witnesses WHERE country_id = ? AND witness_id = ?', [countryId, witnessId]);
    if (witnesses.length === 0) return res.status(404).json({ error: 'Testigo no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'delete',
        section: 'testimony',
        countryCode,
        itemId: testimonyId,
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query('DELETE FROM testimonies WHERE witness_id = ? AND testimony_id = ?', [witnesses[0].id, testimonyId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== RESISTANCE ====================
router.get('/countries/:countryCode/resistance', authenticateToken, async (req, res) => {
  try {
    const countryId = await getCountryId(req.params.countryCode);
    if (!countryId) return res.json({ items: [] });
    const [rows] = await pool.query('SELECT resistor_id as id, name, bio, image, social FROM resistors WHERE country_id = ? ORDER BY name', [countryId]);
    res.json({ items: rows.map(r => ({ ...r, social: typeof r.social === 'string' ? JSON.parse(r.social) : r.social || {} })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/countries/:countryCode/resistance', authenticateToken, checkCountryPermission, checkPermission('create'), async (req, res) => {
  try {
    const { countryCode } = req.params;
    const { id, name, image, bio, social } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'ID y nombre requeridos' });

    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'create',
        section: 'resistance',
        countryCode,
        itemId: id,
        data: { id, name, image, bio, social },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      'INSERT INTO resistors (country_id, resistor_id, name, bio, image, social) VALUES (?, ?, ?, ?, ?, ?)',
      [countryId, id, name, bio || '', image || null, JSON.stringify(social || {})]
    );
    res.json({ success: true, item: { id, name, image } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/countries/:countryCode/resistance/:resistorId', authenticateToken, async (req, res) => {
  try {
    const { countryCode, resistorId } = req.params;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });
    const [resistors] = await pool.query('SELECT * FROM resistors WHERE country_id = ? AND resistor_id = ?', [countryId, resistorId]);
    if (resistors.length === 0) return res.status(404).json({ error: 'Resistor no encontrado' });
    const [entries] = await pool.query('SELECT * FROM resistance_entries WHERE resistor_id = ?', [resistors[0].id]);
    res.json({
      ...resistors[0],
      social: typeof resistors[0].social === 'string' ? JSON.parse(resistors[0].social) : resistors[0].social || {},
      entries: entries.map(e => ({
        ...e,
        paragraphs: typeof e.paragraphs === 'string' ? JSON.parse(e.paragraphs) : e.paragraphs || [],
        contentBlocks: typeof e.content_blocks === 'string' ? JSON.parse(e.content_blocks) : e.content_blocks || [],
        media: typeof e.media === 'string' ? JSON.parse(e.media) : e.media || []
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/countries/:countryCode/resistance/:resistorId', authenticateToken, checkCountryPermission, checkPermission('edit'), async (req, res) => {
  try {
    const { countryCode, resistorId } = req.params;
    const { name, bio, image, social } = req.body;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'edit',
        section: 'resistance',
        countryCode,
        itemId: resistorId,
        data: { name, bio, image, social },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      'UPDATE resistors SET name = ?, bio = ?, image = ?, social = ? WHERE country_id = ? AND resistor_id = ?',
      [name, bio || '', image, JSON.stringify(social || {}), countryId, resistorId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/countries/:countryCode/resistance/:resistorId', authenticateToken, checkCountryPermission, checkPermission('delete'), async (req, res) => {
  try {
    const { countryCode, resistorId } = req.params;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'delete',
        section: 'resistance',
        countryCode,
        itemId: resistorId,
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query('DELETE FROM resistors WHERE country_id = ? AND resistor_id = ?', [countryId, resistorId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/countries/:countryCode/resistance/:resistorId/entry', authenticateToken, checkCountryPermission, checkPermission('create'), async (req, res) => {
  try {
    const { countryCode, resistorId } = req.params;
    const { id, title, summary, date, paragraphs, contentBlocks, media } = req.body;
    if (!id || !title) return res.status(400).json({ error: 'ID y título requeridos' });

    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    const [resistors] = await pool.query('SELECT id FROM resistors WHERE country_id = ? AND resistor_id = ?', [countryId, resistorId]);
    if (resistors.length === 0) return res.status(404).json({ error: 'Resistor no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'create',
        section: 'resistance-entry',
        countryCode,
        itemId: id,
        data: { id, title, summary, date, paragraphs, contentBlocks, media },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      'INSERT INTO resistance_entries (resistor_id, entry_id, title, summary, date, paragraphs, content_blocks, media) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [resistors[0].id, id, title, summary || '', date || '', JSON.stringify(paragraphs || []), JSON.stringify(contentBlocks || []), JSON.stringify(media || [])]
    );
    res.json({ success: true, item: { id, title, summary, date } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/countries/:countryCode/resistance/:resistorId/entry/:entryId', authenticateToken, checkCountryPermission, checkPermission('edit'), async (req, res) => {
  try {
    const { countryCode, resistorId, entryId } = req.params;
    const { title, summary, date, paragraphs, contentBlocks, media } = req.body;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    const [resistors] = await pool.query('SELECT id FROM resistors WHERE country_id = ? AND resistor_id = ?', [countryId, resistorId]);
    if (resistors.length === 0) return res.status(404).json({ error: 'Resistor no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'edit',
        section: 'resistance-entry',
        countryCode,
        itemId: entryId,
        data: { title, summary, date, paragraphs, contentBlocks, media },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      'UPDATE resistance_entries SET title = ?, summary = ?, date = ?, paragraphs = ?, content_blocks = ?, media = ? WHERE resistor_id = ? AND entry_id = ?',
      [title, summary || '', date || '', JSON.stringify(paragraphs || []), JSON.stringify(contentBlocks || []), JSON.stringify(media || []), resistors[0].id, entryId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/countries/:countryCode/resistance/:resistorId/entry/:entryId', authenticateToken, async (req, res) => {
  try {
    const { countryCode, resistorId, entryId } = req.params;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    const [resistors] = await pool.query('SELECT id FROM resistors WHERE country_id = ? AND resistor_id = ?', [countryId, resistorId]);
    if (resistors.length === 0) return res.status(404).json({ error: 'Resistor no encontrado' });

    const [entries] = await pool.query('SELECT * FROM resistance_entries WHERE resistor_id = ? AND entry_id = ?', [resistors[0].id, entryId]);
    if (entries.length === 0) return res.status(404).json({ error: 'Entrada no encontrada' });

    const e = entries[0];
    res.json({
      id: e.entry_id,
      title: e.title,
      summary: e.summary,
      date: e.date,
      paragraphs: typeof e.paragraphs === 'string' ? JSON.parse(e.paragraphs) : e.paragraphs || [],
      contentBlocks: typeof e.content_blocks === 'string' ? JSON.parse(e.content_blocks) : e.content_blocks || [],
      media: typeof e.media === 'string' ? JSON.parse(e.media) : e.media || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/countries/:countryCode/resistance/:resistorId/entry/:entryId', authenticateToken, checkCountryPermission, checkPermission('delete'), async (req, res) => {
  try {
    const { countryCode, resistorId, entryId } = req.params;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    const [resistors] = await pool.query('SELECT id FROM resistors WHERE country_id = ? AND resistor_id = ?', [countryId, resistorId]);
    if (resistors.length === 0) return res.status(404).json({ error: 'Resistor no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'delete',
        section: 'resistance-entry',
        countryCode,
        itemId: entryId,
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query('DELETE FROM resistance_entries WHERE resistor_id = ? AND entry_id = ?', [resistors[0].id, entryId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ANALYSTS ====================
router.get('/countries/:countryCode/analysts', authenticateToken, async (req, res) => {
  try {
    const countryId = await getCountryId(req.params.countryCode);
    if (!countryId) return res.json({ items: [] });
    const [rows] = await pool.query('SELECT analyst_id as id, name, bio, image, social FROM analysts WHERE country_id = ? ORDER BY name', [countryId]);
    res.json({ items: rows.map(r => ({ ...r, social: typeof r.social === 'string' ? JSON.parse(r.social) : r.social || {} })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/countries/:countryCode/analysts', authenticateToken, checkCountryPermission, checkPermission('create'), async (req, res) => {
  try {
    const { countryCode } = req.params;
    const { id, name, image, bio, social } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'ID y nombre requeridos' });

    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'create',
        section: 'analysts',
        countryCode,
        itemId: id,
        data: { id, name, image, bio, social },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      'INSERT INTO analysts (country_id, analyst_id, name, bio, image, social) VALUES (?, ?, ?, ?, ?, ?)',
      [countryId, id, name, bio || '', image || null, JSON.stringify(social || {})]
    );
    res.json({ success: true, item: { id, name, image } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/countries/:countryCode/analysts/:analystId', authenticateToken, async (req, res) => {
  try {
    const { countryCode, analystId } = req.params;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });
    const [analysts] = await pool.query('SELECT * FROM analysts WHERE country_id = ? AND analyst_id = ?', [countryId, analystId]);
    if (analysts.length === 0) return res.status(404).json({ error: 'Analista no encontrado' });
    const [analyses] = await pool.query('SELECT * FROM analyses WHERE analyst_id = ?', [analysts[0].id]);
    res.json({
      ...analysts[0],
      social: typeof analysts[0].social === 'string' ? JSON.parse(analysts[0].social) : analysts[0].social || {},
      analyses: analyses.map(a => ({
        ...a,
        paragraphs: typeof a.paragraphs === 'string' ? JSON.parse(a.paragraphs) : a.paragraphs || [],
        contentBlocks: typeof a.content_blocks === 'string' ? JSON.parse(a.content_blocks) : a.content_blocks || [],
        media: typeof a.media === 'string' ? JSON.parse(a.media) : a.media || []
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/countries/:countryCode/analysts/:analystId', authenticateToken, checkCountryPermission, checkPermission('edit'), async (req, res) => {
  try {
    const { countryCode, analystId } = req.params;
    const { name, bio, image, social } = req.body;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'edit',
        section: 'analysts',
        countryCode,
        itemId: analystId,
        data: { name, bio, image, social },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      'UPDATE analysts SET name = ?, bio = ?, image = ?, social = ? WHERE country_id = ? AND analyst_id = ?',
      [name, bio || '', image, JSON.stringify(social || {}), countryId, analystId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/countries/:countryCode/analysts/:analystId', authenticateToken, checkCountryPermission, checkPermission('delete'), async (req, res) => {
  try {
    const { countryCode, analystId } = req.params;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'delete',
        section: 'analysts',
        countryCode,
        itemId: analystId,
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query('DELETE FROM analysts WHERE country_id = ? AND analyst_id = ?', [countryId, analystId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/countries/:countryCode/analysts/:analystId/analysis', authenticateToken, checkCountryPermission, checkPermission('create'), async (req, res) => {
  try {
    const { countryCode, analystId } = req.params;
    const { id, title, summary, date, paragraphs, contentBlocks, media } = req.body;
    if (!id || !title) return res.status(400).json({ error: 'ID y título requeridos' });

    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    const [analysts] = await pool.query('SELECT id FROM analysts WHERE country_id = ? AND analyst_id = ?', [countryId, analystId]);
    if (analysts.length === 0) return res.status(404).json({ error: 'Analista no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'create',
        section: 'analysis',
        countryCode,
        itemId: id,
        data: { id, title, summary, date, paragraphs, contentBlocks, media },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      'INSERT INTO analyses (analyst_id, analysis_id, title, summary, date, paragraphs, content_blocks, media) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [analysts[0].id, id, title, summary || '', date || '', JSON.stringify(paragraphs || []), JSON.stringify(contentBlocks || []), JSON.stringify(media || [])]
    );
    res.json({ success: true, item: { id, title, summary, date } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/countries/:countryCode/analysts/:analystId/analysis/:analysisId', authenticateToken, checkCountryPermission, checkPermission('edit'), async (req, res) => {
  try {
    const { countryCode, analystId, analysisId } = req.params;
    const { title, summary, date, paragraphs, contentBlocks, media } = req.body;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    const [analysts] = await pool.query('SELECT id FROM analysts WHERE country_id = ? AND analyst_id = ?', [countryId, analystId]);
    if (analysts.length === 0) return res.status(404).json({ error: 'Analista no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'edit',
        section: 'analysis',
        countryCode,
        itemId: analysisId,
        data: { title, summary, date, paragraphs, contentBlocks, media },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      'UPDATE analyses SET title = ?, summary = ?, date = ?, paragraphs = ?, content_blocks = ?, media = ? WHERE analyst_id = ? AND analysis_id = ?',
      [title, summary || '', date || '', JSON.stringify(paragraphs || []), JSON.stringify(contentBlocks || []), JSON.stringify(media || []), analysts[0].id, analysisId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/countries/:countryCode/analysts/:analystId/analysis/:analysisId', authenticateToken, checkCountryPermission, checkPermission('delete'), async (req, res) => {
  try {
    const { countryCode, analystId, analysisId } = req.params;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    const [analysts] = await pool.query('SELECT id FROM analysts WHERE country_id = ? AND analyst_id = ?', [countryId, analystId]);
    if (analysts.length === 0) return res.status(404).json({ error: 'Analista no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'delete',
        section: 'analysis',
        countryCode,
        itemId: analysisId,
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query('DELETE FROM analyses WHERE analyst_id = ? AND analysis_id = ?', [analysts[0].id, analysisId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== FOTOTECA ====================
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

// ==================== VELUM ====================
router.get('/velum', authenticateToken, async (req, res) => {
  try {
    const [articles] = await pool.query(
      'SELECT article_id as id, title, subtitle, author, author_image as authorImage, cover_image as coverImage, date, abstract, keywords FROM velum_articles ORDER BY date DESC'
    );
    res.json({ items: articles.map(a => ({ ...a, keywords: typeof a.keywords === 'string' ? JSON.parse(a.keywords) : a.keywords || [] })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/velum', authenticateToken, checkPermission('create'), async (req, res) => {
  try {
    const { id, title, subtitle, author, authorImage, coverImage, date, abstract, keywords, sections, bibliography } = req.body;
    if (!id || !title) return res.status(400).json({ error: 'ID y título requeridos' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'create',
        section: 'velum',
        articleId: id,
        data: { id, title, subtitle, author, authorImage, coverImage, date, abstract, keywords, sections, bibliography },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      'INSERT INTO velum_articles (article_id, title, subtitle, author, author_image, cover_image, date, abstract, keywords, sections, bibliography) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, subtitle || '', author || '', authorImage || null, coverImage || null, date || null, abstract || '', JSON.stringify(keywords || []), JSON.stringify(sections || []), JSON.stringify(bibliography || [])]
    );
    res.json({ success: true, item: { id, title, subtitle, author, coverImage, date, abstract } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/velum/:articleId', authenticateToken, async (req, res) => {
  try {
    const [articles] = await pool.query('SELECT * FROM velum_articles WHERE article_id = ?', [req.params.articleId]);
    if (articles.length === 0) return res.status(404).json({ error: 'Artículo no encontrado' });
    const a = articles[0];
    res.json({
      id: a.article_id,
      title: a.title,
      subtitle: a.subtitle,
      author: a.author,
      authorImage: a.author_image,
      coverImage: a.cover_image,
      date: a.date,
      abstract: a.abstract,
      keywords: typeof a.keywords === 'string' ? JSON.parse(a.keywords) : a.keywords || [],
      sections: typeof a.sections === 'string' ? JSON.parse(a.sections) : a.sections || [],
      bibliography: typeof a.bibliography === 'string' ? JSON.parse(a.bibliography) : a.bibliography || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/velum/:articleId', authenticateToken, checkPermission('edit'), async (req, res) => {
  try {
    const { title, subtitle, author, authorImage, coverImage, date, abstract, keywords, sections, bibliography } = req.body;

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'edit',
        section: 'velum',
        articleId: req.params.articleId,
        data: { title, subtitle, author, authorImage, coverImage, date, abstract, keywords, sections, bibliography },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      'UPDATE velum_articles SET title = ?, subtitle = ?, author = ?, author_image = ?, cover_image = ?, date = ?, abstract = ?, keywords = ?, sections = ?, bibliography = ? WHERE article_id = ?',
      [title, subtitle || '', author || '', authorImage, coverImage, date, abstract || '', JSON.stringify(keywords || []), JSON.stringify(sections || []), JSON.stringify(bibliography || []), req.params.articleId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/velum/:articleId', authenticateToken, checkPermission('delete'), async (req, res) => {
  try {
    if (req.requiresApproval) {
      await savePendingChange({
        type: 'delete',
        section: 'velum',
        articleId: req.params.articleId,
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query('DELETE FROM velum_articles WHERE article_id = ?', [req.params.articleId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TERMINOLOGY ====================
router.get('/terminology', authenticateToken, async (req, res) => {
  try {
    const [terms] = await pool.query(
      'SELECT term_id as id, term, definition, category, related_terms as relatedTerms, sources FROM terminology ORDER BY term'
    );
    res.json({ items: terms.map(t => ({ ...t, relatedTerms: typeof t.relatedTerms === 'string' ? JSON.parse(t.relatedTerms) : t.relatedTerms || [], sources: typeof t.sources === 'string' ? JSON.parse(t.sources) : t.sources || [] })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/terminology', authenticateToken, checkPermission('create'), async (req, res) => {
  try {
    const { term, definition, category, relatedTerms, sources } = req.body;
    if (!term || !definition) return res.status(400).json({ error: 'Término y definición requeridos' });

    const id = term.toLowerCase().replace(/[^a-z0-9áéíóúñü]/g, '-').slice(0, 50);

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'create',
        section: 'terminology',
        termId: id,
        data: { id, term, definition, category, relatedTerms, sources },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      'INSERT INTO terminology (term_id, term, definition, category, related_terms, sources) VALUES (?, ?, ?, ?, ?, ?)',
      [id, term, definition, category || 'general', JSON.stringify(relatedTerms || []), JSON.stringify(sources || [])]
    );
    res.json({ success: true, item: { id, term, definition, category, relatedTerms, sources } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/terminology/:termId', authenticateToken, async (req, res) => {
  try {
    const [terms] = await pool.query('SELECT * FROM terminology WHERE term_id = ?', [req.params.termId]);
    if (terms.length === 0) return res.status(404).json({ error: 'Término no encontrado' });
    const t = terms[0];
    res.json({
      id: t.term_id,
      term: t.term,
      definition: t.definition,
      category: t.category,
      relatedTerms: typeof t.related_terms === 'string' ? JSON.parse(t.related_terms) : t.related_terms || [],
      sources: typeof t.sources === 'string' ? JSON.parse(t.sources) : t.sources || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/terminology/:termId', authenticateToken, checkPermission('edit'), async (req, res) => {
  try {
    const { term, definition, category, relatedTerms, sources } = req.body;

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'edit',
        section: 'terminology',
        termId: req.params.termId,
        data: { term, definition, category, relatedTerms, sources },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      'UPDATE terminology SET term = ?, definition = ?, category = ?, related_terms = ?, sources = ? WHERE term_id = ?',
      [term, definition, category || 'general', JSON.stringify(relatedTerms || []), JSON.stringify(sources || []), req.params.termId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/terminology/:termId', authenticateToken, checkPermission('delete'), async (req, res) => {
  try {
    if (req.requiresApproval) {
      await savePendingChange({
        type: 'delete',
        section: 'terminology',
        termId: req.params.termId,
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query('DELETE FROM terminology WHERE term_id = ?', [req.params.termId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== GALLERY ====================
router.get('/gallery/images', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT url, title as name FROM fototeca WHERE type = "image" ORDER BY created_at DESC LIMIT 50');
    res.json({ images: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PENDING CHANGES ====================
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo admin' });
    const [rows] = await pool.query('SELECT * FROM pending_changes WHERE status = "pending" ORDER BY created_at DESC');
    res.json({ changes: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/pending/:changeId/approve', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo admin' });
    await pool.query('UPDATE pending_changes SET status = "approved" WHERE change_id = ?', [req.params.changeId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/pending/:changeId/reject', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo admin' });
    await pool.query('UPDATE pending_changes SET status = "rejected" WHERE change_id = ?', [req.params.changeId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SECTION HEADERS ====================
router.get('/countries/:countryCode/section-headers/:section', authenticateToken, async (req, res) => {
  try {
    const { countryCode, section } = req.params;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.json({ title: '', description: '' });
    const [rows] = await pool.query('SELECT title, description FROM section_headers WHERE country_id = ? AND section_id = ?', [countryId, section]);
    if (rows.length === 0) return res.json({ title: '', description: '' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/countries/:countryCode/section-headers/:section', authenticateToken, checkCountryPermission, async (req, res) => {
  try {
    const { countryCode, section } = req.params;
    const { title, description } = req.body;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });
    await pool.query(
      'INSERT INTO section_headers (country_id, section_id, title, description) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description)',
      [countryId, section, title, description]
    );
    res.json({ success: true, data: { title, description } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== AI LABORATORY ====================
router.get('/ai/history/:countryCode', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, content, created_at FROM ai_raw_data WHERE country_code = ? AND status = "pending" ORDER BY created_at DESC',
      [req.params.countryCode]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/ai/save', authenticateToken, async (req, res) => {
  try {
    const { countryCode, content } = req.body;
    await pool.query(
      'INSERT INTO ai_raw_data (country_code, content) VALUES (?, ?)',
      [countryCode, content]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

router.post('/ai/process/:countryCode', authenticateToken, async (req, res) => {
  try {
    const { countryCode } = req.params;
    const lang = req.query.lang || 'es';
    
    // 1. Obtener textos acumulados
    const [rawRows] = await pool.query(
      'SELECT content FROM ai_raw_data WHERE country_code = ? AND status = "pending"',
      [countryCode]
    );
    if (rawRows.length === 0) return res.status(400).json({ error: 'No hay datos nuevos para procesar' });
    const fullText = rawRows.map(r => r.content).join('\n\n');

    // 2. Obtener terminología existente para evitar duplicados
    const [existingTerms] = await pool.query('SELECT term FROM terminology WHERE lang = ?', [lang]);
    const termList = existingTerms.map(t => t.term.toLowerCase());

    // 3. Prompt Detallado
    const prompt = `
      Actúa como un experto historiador y analista de conflictos. 
      Analiza el siguiente contenido sobre el conflicto en ${countryCode}.
      
      OBJETIVOS:
      1. TRADUCCIÓN Y ORGANIZACIÓN TOTAL: No resumas. Extrae y organiza TODA la información relevante al español.
      2. TERMINOLOGÍA: Identifica términos clave (Personajes, Organizaciones, Conceptos). 
         NO INCLUYAS estos términos si ya existen: ${termList.join(', ')}.
      3. CRONOLOGÍA (Timeline): Extrae todos los eventos con fecha, título y descripción detallada.
      4. TESTIMONIOS Y RESISTENCIA: Identifica relatos de testigos o acciones de movimientos de resistencia.
         Crea perfiles completos (Nombre, Bio, Relato/Acción).
      5. SIN DUPLICIDAD: Si la información se repite en los textos de entrada, únala en una sola entrada coherente.
      
      Responde EXCLUSIVAMENTE en formato JSON con la siguiente estructura:
      {
        "terminology": [{"term": "...", "definition": "...", "category": "..."}],
        "timeline": [{"date": "...", "title": "...", "summary": "..."}],
        "testimonies": [{"name": "...", "bio": "...", "testimony": "..."}],
        "resistance": [{"name": "...", "bio": "...", "action": "..."}],
        "description": "..."
      }

      TEXTO DE ENTRADA:
      ${fullText}
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Eres un asistente que extrae datos históricos estructurados en JSON." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const processedResult = JSON.parse(completion.choices[0].message.content);

    // Marcar como procesado
    await pool.query('UPDATE ai_raw_data SET status = "processed" WHERE country_code = ?', [countryCode]);

    res.json(processedResult);
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
