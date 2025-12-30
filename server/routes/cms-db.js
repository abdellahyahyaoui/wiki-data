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
    const { id, name, bio, image, social } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'ID y nombre requeridos' });

    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'create',
        section: 'testimonies',
        countryCode,
        itemId: id,
        data: { id, name, bio, image, social },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      'INSERT INTO witnesses (country_id, witness_id, name, bio, image, social) VALUES (?, ?, ?, ?, ?, ?)',
      [countryId, id, name, bio || '', image || null, JSON.stringify(social || {})]
    );
    res.json({ success: true, item: { id, name, bio, image, social } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/countries/:countryCode/testimonies/:witnessId/testimony/:testimonyId', authenticateToken, async (req, res) => {
  try {
    const { testimonyId } = req.params;
    const [rows] = await pool.query('SELECT * FROM testimonies WHERE testimony_id = ?', [testimonyId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Testimonio no encontrado' });
    const t = rows[0];
    res.json({
      ...t,
      contentBlocks: typeof t.content_blocks === 'string' ? JSON.parse(t.content_blocks) : t.content_blocks || []
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

// ==================== RESISTANCE ====================
router.get('/countries/:countryCode/resistance', authenticateToken, async (req, res) => {
  try {
    const countryId = await getCountryId(req.params.countryCode);
    if (!countryId) return res.json({ items: [] });
    const [rows] = await pool.query('SELECT resistor_id as id, name, bio, image FROM resistors WHERE country_id = ? ORDER BY name', [countryId]);
    res.json({ items: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/countries/:countryCode/resistance', authenticateToken, checkCountryPermission, checkPermission('create'), async (req, res) => {
  try {
    const { countryCode } = req.params;
    const { id, name, bio, image } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'ID y nombre requeridos' });

    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'create',
        section: 'resistance',
        countryCode,
        itemId: id,
        data: { id, name, bio, image },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      'INSERT INTO resistors (country_id, resistor_id, name, bio, image) VALUES (?, ?, ?, ?, ?)',
      [countryId, id, name, bio || '', image || null]
    );
    res.json({ success: true, item: { id, name, bio, image } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/countries/:countryCode/resistance/:resistorId/entry/:entryId', authenticateToken, async (req, res) => {
  try {
    const { entryId } = req.params;
    const [rows] = await pool.query('SELECT * FROM resistance_entries WHERE entry_id = ?', [entryId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Entrada no encontrada' });
    const e = rows[0];
    res.json({
      ...e,
      contentBlocks: typeof e.content_blocks === 'string' ? JSON.parse(e.content_blocks) : e.content_blocks || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/countries/:countryCode/resistance/:resistorId', authenticateToken, checkCountryPermission, checkPermission('edit'), async (req, res) => {
  try {
    const { countryCode, resistorId } = req.params;
    const { name, bio, image } = req.body;
    const countryId = await getCountryId(countryCode);
    if (!countryId) return res.status(404).json({ error: 'País no encontrado' });

    if (req.requiresApproval) {
      await savePendingChange({
        type: 'edit',
        section: 'resistance',
        countryCode,
        itemId: resistorId,
        data: { name, bio, image },
        userId: req.user.id,
        userName: req.user.name
      });
      return res.json({ success: true, pending: true });
    }

    await pool.query(
      'UPDATE resistors SET name = ?, bio = ?, image = ? WHERE country_id = ? AND resistor_id = ?',
      [name, bio || '', image, countryId, resistorId]
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

// ==================== ANALYSTS ====================
router.get('/countries/:countryCode/analysts', authenticateToken, async (req, res) => {
  try {
    const countryId = await getCountryId(req.params.countryCode);
    if (!countryId) return res.json({ items: [] });
    const [rows] = await pool.query('SELECT analyst_id as id, name, bio, image FROM analysts WHERE country_id = ? ORDER BY name', [countryId]);
    res.json({ items: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TERMINOLOGY ====================
router.get('/terminology', authenticateToken, async (req, res) => {
  try {
    const lang = req.query.lang || 'es';
    const [rows] = await pool.query('SELECT * FROM terminology WHERE lang = ? ORDER BY term', [lang]);
    res.json({ items: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/terminology', authenticateToken, checkPermission('create'), async (req, res) => {
  try {
    const { id, term, definition, category, relatedTerms, sources } = req.body;
    if (!id || !term || !definition) return res.status(400).json({ error: 'ID, término y definición requeridos' });

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

module.exports = router;
