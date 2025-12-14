const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { authenticateToken, checkCountryPermission, checkPermission } = require('../middleware/auth');

const router = express.Router();

router.get('/predefined-countries', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT code, name_es as name, region FROM predefined_countries ORDER BY region, name_es');
    res.json({ countries: rows });
  } catch (error) {
    console.error('Error fetching predefined countries:', error);
    res.status(500).json({ error: 'Error al obtener países' });
  }
});

router.get('/countries', authenticateToken, async (req, res) => {
  const lang = req.query.lang || 'es';
  try {
    const [countries] = await pool.query(
      'SELECT id, code, name FROM countries WHERE lang = ? ORDER BY name',
      [lang]
    );

    for (let country of countries) {
      const [sections] = await pool.query(
        'SELECT section_id as id, label FROM sections WHERE country_id = ? ORDER BY sort_order',
        [country.id]
      );
      country.sections = sections;
    }

    res.json({ countries });
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Error al obtener países' });
  }
});

router.post('/countries', authenticateToken, checkPermission('create'), async (req, res) => {
  const { code, name, lang = 'es' } = req.body;

  if (!code || !name) {
    return res.status(400).json({ error: 'Código y nombre son requeridos' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [code, lang]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'El país ya existe' });
    }

    const [result] = await connection.query(
      'INSERT INTO countries (code, name, lang) VALUES (?, ?, ?)',
      [code, name, lang]
    );

    const countryId = result.insertId;

    const defaultSections = [
      { id: 'description', label: 'Descripción del conflicto', order: 1 },
      { id: 'timeline', label: 'Timeline', order: 2 },
      { id: 'testimonies', label: 'Testimonios', order: 3 },
      { id: 'resistance', label: 'Resistencia', order: 4 },
      { id: 'media-gallery', label: 'Fototeca', order: 5 }
    ];

    for (const section of defaultSections) {
      await connection.query(
        'INSERT INTO sections (country_id, section_id, label, sort_order) VALUES (?, ?, ?, ?)',
        [countryId, section.id, section.label, section.order]
      );
    }

    await connection.query(
      'INSERT INTO descriptions (country_id, title, chapters) VALUES (?, ?, ?)',
      [countryId, 'Descripción del Conflicto', JSON.stringify([])]
    );

    await connection.commit();
    res.json({ success: true, country: { code, name } });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating country:', error);
    res.status(500).json({ error: 'Error al crear país' });
  } finally {
    connection.release();
  }
});

router.get('/countries/:countryCode/description', authenticateToken, async (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.json({ title: 'Descripción del Conflicto', chapters: [] });
    }

    const [descriptions] = await pool.query(
      'SELECT title, chapters FROM descriptions WHERE country_id = ?',
      [countries[0].id]
    );

    if (descriptions.length === 0) {
      return res.json({ title: 'Descripción del Conflicto', chapters: [] });
    }

    const desc = descriptions[0];
    res.json({
      title: desc.title,
      chapters: typeof desc.chapters === 'string' ? JSON.parse(desc.chapters) : desc.chapters
    });
  } catch (error) {
    console.error('Error fetching description:', error);
    res.status(500).json({ error: 'Error al obtener descripción' });
  }
});

router.put('/countries/:countryCode/description', authenticateToken, checkCountryPermission, checkPermission('edit'), async (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';
  const { title, chapters } = req.body;

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }

    await pool.query(
      `INSERT INTO descriptions (country_id, title, chapters) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE title = VALUES(title), chapters = VALUES(chapters)`,
      [countries[0].id, title || 'Descripción del Conflicto', JSON.stringify(chapters || [])]
    );

    res.json({ success: true, data: { title, chapters } });
  } catch (error) {
    console.error('Error updating description:', error);
    res.status(500).json({ error: 'Error al guardar descripción' });
  }
});

router.get('/countries/:countryCode/timeline', authenticateToken, async (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.json({ items: [] });
    }

    const [events] = await pool.query(
      'SELECT event_id as id, date, year, month, title, summary, image FROM timeline_events WHERE country_id = ? ORDER BY date DESC',
      [countries[0].id]
    );

    res.json({ items: events });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Error al obtener timeline' });
  }
});

router.get('/countries/:countryCode/timeline/:itemId', authenticateToken, async (req, res) => {
  const { countryCode, itemId } = req.params;
  const lang = req.query.lang || 'es';

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }

    const [events] = await pool.query(
      'SELECT * FROM timeline_events WHERE country_id = ? AND event_id = ?',
      [countries[0].id, itemId]
    );

    if (events.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    const event = events[0];
    res.json({
      id: event.event_id,
      date: event.date,
      year: event.year,
      month: event.month,
      title: event.title,
      image: event.image,
      video: event.video,
      paragraphs: typeof event.paragraphs === 'string' ? JSON.parse(event.paragraphs) : event.paragraphs || [],
      contentBlocks: typeof event.content_blocks === 'string' ? JSON.parse(event.content_blocks) : event.content_blocks || [],
      sources: typeof event.sources === 'string' ? JSON.parse(event.sources) : event.sources || []
    });
  } catch (error) {
    console.error('Error fetching timeline event:', error);
    res.status(500).json({ error: 'Error al obtener evento' });
  }
});

router.post('/countries/:countryCode/timeline', authenticateToken, checkCountryPermission, checkPermission('create'), async (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';
  const { id, date, year, month, title, summary, image, video, paragraphs, contentBlocks, sources } = req.body;

  if (!id || !title || !date) {
    return res.status(400).json({ error: 'ID, título y fecha son requeridos' });
  }

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }

    await pool.query(
      `INSERT INTO timeline_events (country_id, event_id, date, year, month, title, summary, image, video, paragraphs, content_blocks, sources)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [countries[0].id, id, date, year || null, month || null, title, summary || '', image || null, video || null,
       JSON.stringify(paragraphs || []), JSON.stringify(contentBlocks || []), JSON.stringify(sources || [])]
    );

    res.json({ success: true, item: { id, date, year, month, title, summary, image } });
  } catch (error) {
    console.error('Error creating timeline event:', error);
    res.status(500).json({ error: 'Error al crear evento' });
  }
});

router.put('/countries/:countryCode/timeline/:itemId', authenticateToken, checkCountryPermission, checkPermission('edit'), async (req, res) => {
  const { countryCode, itemId } = req.params;
  const lang = req.query.lang || 'es';
  const updates = req.body;

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }

    await pool.query(
      `UPDATE timeline_events SET 
       date = ?, year = ?, month = ?, title = ?, summary = ?, image = ?, video = ?,
       paragraphs = ?, content_blocks = ?, sources = ?
       WHERE country_id = ? AND event_id = ?`,
      [updates.date, updates.year, updates.month, updates.title, updates.summary, updates.image, updates.video,
       JSON.stringify(updates.paragraphs || []), JSON.stringify(updates.contentBlocks || []), JSON.stringify(updates.sources || []),
       countries[0].id, itemId]
    );

    res.json({ success: true, item: { id: itemId, ...updates } });
  } catch (error) {
    console.error('Error updating timeline event:', error);
    res.status(500).json({ error: 'Error al actualizar evento' });
  }
});

router.delete('/countries/:countryCode/timeline/:itemId', authenticateToken, checkCountryPermission, checkPermission('delete'), async (req, res) => {
  const { countryCode, itemId } = req.params;
  const lang = req.query.lang || 'es';

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }

    await pool.query(
      'DELETE FROM timeline_events WHERE country_id = ? AND event_id = ?',
      [countries[0].id, itemId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting timeline event:', error);
    res.status(500).json({ error: 'Error al eliminar evento' });
  }
});

router.get('/countries/:countryCode/testimonies', authenticateToken, async (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.json({ items: [] });
    }

    const [witnesses] = await pool.query(
      'SELECT witness_id as id, name, image FROM witnesses WHERE country_id = ? ORDER BY name',
      [countries[0].id]
    );

    res.json({ items: witnesses });
  } catch (error) {
    console.error('Error fetching testimonies:', error);
    res.status(500).json({ error: 'Error al obtener testimonios' });
  }
});

router.post('/countries/:countryCode/testimonies', authenticateToken, checkCountryPermission, checkPermission('create'), async (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';
  const { id, name, image, bio, social } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: 'ID y nombre son requeridos' });
  }

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }

    await pool.query(
      'INSERT INTO witnesses (country_id, witness_id, name, bio, image, social) VALUES (?, ?, ?, ?, ?, ?)',
      [countries[0].id, id, name, bio || '', image || null, JSON.stringify(social || {})]
    );

    res.json({ success: true, item: { id, name, image } });
  } catch (error) {
    console.error('Error creating witness:', error);
    res.status(500).json({ error: 'Error al crear testigo' });
  }
});

router.get('/countries/:countryCode/testimonies/:witnessId', authenticateToken, async (req, res) => {
  const { countryCode, witnessId } = req.params;
  const lang = req.query.lang || 'es';

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }

    const [witnesses] = await pool.query(
      'SELECT * FROM witnesses WHERE country_id = ? AND witness_id = ?',
      [countries[0].id, witnessId]
    );

    if (witnesses.length === 0) {
      return res.status(404).json({ error: 'Testigo no encontrado' });
    }

    const witness = witnesses[0];
    const [testimonies] = await pool.query(
      'SELECT testimony_id as id, title, summary, date, media FROM testimonies WHERE witness_id = ?',
      [witness.id]
    );

    res.json({
      id: witness.witness_id,
      name: witness.name,
      bio: witness.bio,
      image: witness.image,
      social: typeof witness.social === 'string' ? JSON.parse(witness.social) : witness.social || {},
      testimonies: testimonies.map(t => ({
        ...t,
        media: typeof t.media === 'string' ? JSON.parse(t.media) : t.media || []
      }))
    });
  } catch (error) {
    console.error('Error fetching witness:', error);
    res.status(500).json({ error: 'Error al obtener testigo' });
  }
});

router.put('/countries/:countryCode/testimonies/:witnessId', authenticateToken, checkCountryPermission, checkPermission('edit'), async (req, res) => {
  const { countryCode, witnessId } = req.params;
  const lang = req.query.lang || 'es';
  const updates = req.body;

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }

    await pool.query(
      'UPDATE witnesses SET name = ?, bio = ?, image = ?, social = ? WHERE country_id = ? AND witness_id = ?',
      [updates.name, updates.bio, updates.image, JSON.stringify(updates.social || {}), countries[0].id, witnessId]
    );

    res.json({ success: true, item: updates });
  } catch (error) {
    console.error('Error updating witness:', error);
    res.status(500).json({ error: 'Error al actualizar testigo' });
  }
});

router.post('/countries/:countryCode/testimonies/:witnessId/testimony', authenticateToken, checkCountryPermission, checkPermission('create'), async (req, res) => {
  const { countryCode, witnessId } = req.params;
  const lang = req.query.lang || 'es';
  const { id, title, summary, date, paragraphs, contentBlocks, media } = req.body;

  if (!id || !title) {
    return res.status(400).json({ error: 'ID y título son requeridos' });
  }

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }

    const [witnesses] = await pool.query(
      'SELECT id FROM witnesses WHERE country_id = ? AND witness_id = ?',
      [countries[0].id, witnessId]
    );

    if (witnesses.length === 0) {
      return res.status(404).json({ error: 'Testigo no encontrado' });
    }

    await pool.query(
      `INSERT INTO testimonies (witness_id, testimony_id, title, summary, date, paragraphs, content_blocks, media)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [witnesses[0].id, id, title, summary || '', date || '', 
       JSON.stringify(paragraphs || []), JSON.stringify(contentBlocks || []), JSON.stringify(media || [])]
    );

    res.json({ success: true, item: { id, title, summary, date, media } });
  } catch (error) {
    console.error('Error creating testimony:', error);
    res.status(500).json({ error: 'Error al crear testimonio' });
  }
});

router.get('/countries/:countryCode/testimonies/:witnessId/testimony/:testimonyId', authenticateToken, async (req, res) => {
  const { countryCode, witnessId, testimonyId } = req.params;
  const lang = req.query.lang || 'es';

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }

    const [witnesses] = await pool.query(
      'SELECT id FROM witnesses WHERE country_id = ? AND witness_id = ?',
      [countries[0].id, witnessId]
    );

    if (witnesses.length === 0) {
      return res.status(404).json({ error: 'Testigo no encontrado' });
    }

    const [testimonies] = await pool.query(
      'SELECT * FROM testimonies WHERE witness_id = ? AND testimony_id = ?',
      [witnesses[0].id, testimonyId]
    );

    if (testimonies.length === 0) {
      return res.status(404).json({ error: 'Testimonio no encontrado' });
    }

    const t = testimonies[0];
    res.json({
      id: t.testimony_id,
      title: t.title,
      paragraphs: typeof t.paragraphs === 'string' ? JSON.parse(t.paragraphs) : t.paragraphs || [],
      contentBlocks: typeof t.content_blocks === 'string' ? JSON.parse(t.content_blocks) : t.content_blocks || [],
      media: typeof t.media === 'string' ? JSON.parse(t.media) : t.media || []
    });
  } catch (error) {
    console.error('Error fetching testimony:', error);
    res.status(500).json({ error: 'Error al obtener testimonio' });
  }
});

router.put('/countries/:countryCode/testimonies/:witnessId/testimony/:testimonyId', authenticateToken, checkCountryPermission, checkPermission('edit'), async (req, res) => {
  const { countryCode, witnessId, testimonyId } = req.params;
  const lang = req.query.lang || 'es';
  const { title, summary, date, paragraphs, contentBlocks, media } = req.body;

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }

    const [witnesses] = await pool.query(
      'SELECT id FROM witnesses WHERE country_id = ? AND witness_id = ?',
      [countries[0].id, witnessId]
    );

    if (witnesses.length === 0) {
      return res.status(404).json({ error: 'Testigo no encontrado' });
    }

    await pool.query(
      `UPDATE testimonies SET title = ?, summary = ?, date = ?, paragraphs = ?, content_blocks = ?, media = ?
       WHERE witness_id = ? AND testimony_id = ?`,
      [title, summary, date, JSON.stringify(paragraphs || []), JSON.stringify(contentBlocks || []), 
       JSON.stringify(media || []), witnesses[0].id, testimonyId]
    );

    res.json({ success: true, item: { id: testimonyId, title, summary, date, media } });
  } catch (error) {
    console.error('Error updating testimony:', error);
    res.status(500).json({ error: 'Error al actualizar testimonio' });
  }
});

router.get('/countries/:countryCode/resistance', authenticateToken, async (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.json({ items: [] });
    }

    const [resistors] = await pool.query(
      'SELECT resistor_id as id, name, image FROM resistors WHERE country_id = ? ORDER BY name',
      [countries[0].id]
    );

    res.json({ items: resistors });
  } catch (error) {
    console.error('Error fetching resistance:', error);
    res.status(500).json({ error: 'Error al obtener resistencia' });
  }
});

router.post('/countries/:countryCode/resistance', authenticateToken, checkCountryPermission, checkPermission('create'), async (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';
  const { id, name, image, bio, social } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: 'ID y nombre son requeridos' });
  }

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }

    await pool.query(
      'INSERT INTO resistors (country_id, resistor_id, name, bio, image, social) VALUES (?, ?, ?, ?, ?, ?)',
      [countries[0].id, id, name, bio || '', image || null, JSON.stringify(social || {})]
    );

    res.json({ success: true, item: { id, name, image } });
  } catch (error) {
    console.error('Error creating resistor:', error);
    res.status(500).json({ error: 'Error al crear entrada' });
  }
});

router.get('/countries/:countryCode/resistance/:resistorId', authenticateToken, async (req, res) => {
  const { countryCode, resistorId } = req.params;
  const lang = req.query.lang || 'es';

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }

    const [resistors] = await pool.query(
      'SELECT * FROM resistors WHERE country_id = ? AND resistor_id = ?',
      [countries[0].id, resistorId]
    );

    if (resistors.length === 0) {
      return res.status(404).json({ error: 'Entrada no encontrada' });
    }

    const resistor = resistors[0];
    const [entries] = await pool.query(
      'SELECT entry_id as id, title, summary, date, media FROM resistance_entries WHERE resistor_id = ?',
      [resistor.id]
    );

    res.json({
      id: resistor.resistor_id,
      name: resistor.name,
      bio: resistor.bio,
      image: resistor.image,
      social: typeof resistor.social === 'string' ? JSON.parse(resistor.social) : resistor.social || {},
      entries: entries.map(e => ({
        ...e,
        media: typeof e.media === 'string' ? JSON.parse(e.media) : e.media || []
      }))
    });
  } catch (error) {
    console.error('Error fetching resistor:', error);
    res.status(500).json({ error: 'Error al obtener entrada' });
  }
});

router.put('/countries/:countryCode/resistance/:resistorId', authenticateToken, checkCountryPermission, checkPermission('edit'), async (req, res) => {
  const { countryCode, resistorId } = req.params;
  const lang = req.query.lang || 'es';
  const updates = req.body;

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }

    await pool.query(
      'UPDATE resistors SET name = ?, bio = ?, image = ?, social = ? WHERE country_id = ? AND resistor_id = ?',
      [updates.name, updates.bio, updates.image, JSON.stringify(updates.social || {}), countries[0].id, resistorId]
    );

    res.json({ success: true, item: updates });
  } catch (error) {
    console.error('Error updating resistor:', error);
    res.status(500).json({ error: 'Error al actualizar entrada' });
  }
});

router.post('/countries/:countryCode/resistance/:resistorId/entry', authenticateToken, checkCountryPermission, checkPermission('create'), async (req, res) => {
  const { countryCode, resistorId } = req.params;
  const lang = req.query.lang || 'es';
  const { id, title, summary, date, paragraphs, contentBlocks, media } = req.body;

  if (!id || !title) {
    return res.status(400).json({ error: 'ID y título son requeridos' });
  }

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }

    const [resistors] = await pool.query(
      'SELECT id FROM resistors WHERE country_id = ? AND resistor_id = ?',
      [countries[0].id, resistorId]
    );

    if (resistors.length === 0) {
      return res.status(404).json({ error: 'Entrada no encontrada' });
    }

    await pool.query(
      `INSERT INTO resistance_entries (resistor_id, entry_id, title, summary, date, paragraphs, content_blocks, media)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [resistors[0].id, id, title, summary || '', date || '',
       JSON.stringify(paragraphs || []), JSON.stringify(contentBlocks || []), JSON.stringify(media || [])]
    );

    res.json({ success: true, item: { id, title, summary, date, media } });
  } catch (error) {
    console.error('Error creating entry:', error);
    res.status(500).json({ error: 'Error al crear entrada' });
  }
});

router.get('/countries/:countryCode/fototeca', authenticateToken, async (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.json({ items: [] });
    }

    const [items] = await pool.query(
      'SELECT item_id as id, title, description, date, type, url FROM fototeca WHERE country_id = ? ORDER BY date DESC',
      [countries[0].id]
    );

    res.json({ items });
  } catch (error) {
    console.error('Error fetching fototeca:', error);
    res.status(500).json({ error: 'Error al obtener fototeca' });
  }
});

router.post('/countries/:countryCode/fototeca', authenticateToken, checkCountryPermission, checkPermission('create'), async (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';
  const { title, description, date, type, url } = req.body;

  if (!title || !url) {
    return res.status(400).json({ error: 'Título y URL son requeridos' });
  }

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }

    const itemId = uuidv4();
    await pool.query(
      'INSERT INTO fototeca (country_id, item_id, title, description, date, type, url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [countries[0].id, itemId, title, description || '', date || '', type || 'image', url]
    );

    res.json({ success: true, item: { id: itemId, title, description, date, type, url } });
  } catch (error) {
    console.error('Error creating fototeca item:', error);
    res.status(500).json({ error: 'Error al crear elemento' });
  }
});

router.put('/countries/:countryCode/fototeca/:itemId', authenticateToken, checkCountryPermission, checkPermission('edit'), async (req, res) => {
  const { countryCode, itemId } = req.params;
  const lang = req.query.lang || 'es';
  const { title, description, date, type, url } = req.body;

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }

    await pool.query(
      'UPDATE fototeca SET title = ?, description = ?, date = ?, type = ?, url = ? WHERE country_id = ? AND item_id = ?',
      [title, description, date, type, url, countries[0].id, itemId]
    );

    res.json({ success: true, item: { id: itemId, title, description, date, type, url } });
  } catch (error) {
    console.error('Error updating fototeca item:', error);
    res.status(500).json({ error: 'Error al actualizar elemento' });
  }
});

router.delete('/countries/:countryCode/fototeca/:itemId', authenticateToken, checkCountryPermission, checkPermission('delete'), async (req, res) => {
  const { countryCode, itemId } = req.params;
  const lang = req.query.lang || 'es';

  try {
    const [countries] = await pool.query(
      'SELECT id FROM countries WHERE code = ? AND lang = ?',
      [countryCode, lang]
    );

    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }

    await pool.query(
      'DELETE FROM fototeca WHERE country_id = ? AND item_id = ?',
      [countries[0].id, itemId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting fototeca item:', error);
    res.status(500).json({ error: 'Error al eliminar elemento' });
  }
});

router.get('/gallery/images', authenticateToken, async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const imagesDir = path.join(__dirname, '../../public/imagenes');

  try {
    if (!fs.existsSync(imagesDir)) {
      return res.json({ images: [] });
    }

    const files = fs.readdirSync(imagesDir);
    const images = files
      .filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f))
      .map(f => ({
        name: f,
        url: `/imagenes/${f}`
      }));

    res.json({ images });
  } catch (error) {
    console.error('Error reading gallery:', error);
    res.status(500).json({ error: 'Error al leer galería' });
  }
});

router.get('/pending', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  try {
    const [changes] = await pool.query(
      'SELECT * FROM pending_changes WHERE status = ? ORDER BY created_at DESC',
      ['pending']
    );

    res.json({ 
      changes: changes.map(c => ({
        ...c,
        data: typeof c.data === 'string' ? JSON.parse(c.data) : c.data
      }))
    });
  } catch (error) {
    console.error('Error fetching pending changes:', error);
    res.status(500).json({ error: 'Error al obtener cambios pendientes' });
  }
});

module.exports = router;
