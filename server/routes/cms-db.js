const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { authenticateToken, checkCountryPermission, checkPermission } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const PREDEFINED_COUNTRIES = [
  // Oriente Medio y Norte de África
  { code: 'algeria', name: 'Argelia', region: 'Norte de África' },
  { code: 'bahrain', name: 'Bahréin', region: 'Oriente Medio' },
  { code: 'comoros', name: 'Comoras', region: 'África Oriental' },
  { code: 'egypt', name: 'Egipto', region: 'Norte de África' },
  { code: 'iraq', name: 'Irak', region: 'Oriente Medio' },
  { code: 'israel', name: 'Israel', region: 'Oriente Medio' },
  { code: 'jordan', name: 'Jordania', region: 'Oriente Medio' },
  { code: 'kuwait', name: 'Kuwait', region: 'Oriente Medio' },
  { code: 'lebanon', name: 'Líbano', region: 'Oriente Medio' },
  { code: 'libya', name: 'Libia', region: 'Norte de África' },
  { code: 'mauritania', name: 'Mauritania', region: 'Norte de África' },
  { code: 'morocco', name: 'Marruecos', region: 'Norte de África' },
  { code: 'oman', name: 'Omán', region: 'Oriente Medio' },
  { code: 'qatar', name: 'Catar', region: 'Oriente Medio' },
  { code: 'saudi-arabia', name: 'Arabia Saudita', region: 'Oriente Medio' },
  { code: 'sudan', name: 'Sudán', region: 'Norte de África' },
  { code: 'south-sudan', name: 'Sudán del Sur', region: 'África Oriental' },
  { code: 'syria', name: 'Siria', region: 'Oriente Medio' },
  { code: 'tunisia', name: 'Túnez', region: 'Norte de África' },
  { code: 'uae', name: 'Emiratos Árabes Unidos', region: 'Oriente Medio' },
  { code: 'yemen', name: 'Yemen', region: 'Oriente Medio' },
  { code: 'western-sahara', name: 'Sáhara Occidental', region: 'Norte de África' },
  { code: 'palestine', name: 'Palestina', region: 'Oriente Medio' },
  { code: 'iran', name: 'Irán', region: 'Oriente Medio' },
  // Europa
  { code: 'albania', name: 'Albania', region: 'Europa' },
  { code: 'andorra', name: 'Andorra', region: 'Europa' },
  { code: 'austria', name: 'Austria', region: 'Europa' },
  { code: 'belarus', name: 'Bielorrusia', region: 'Europa' },
  { code: 'belgium', name: 'Bélgica', region: 'Europa' },
  { code: 'bosnia', name: 'Bosnia y Herzegovina', region: 'Europa' },
  { code: 'bulgaria', name: 'Bulgaria', region: 'Europa' },
  { code: 'croatia', name: 'Croacia', region: 'Europa' },
  { code: 'czechia', name: 'República Checa', region: 'Europa' },
  { code: 'denmark', name: 'Dinamarca', region: 'Europa' },
  { code: 'estonia', name: 'Estonia', region: 'Europa' },
  { code: 'france', name: 'Francia', region: 'Europa' },
  { code: 'germany', name: 'Alemania', region: 'Europa' },
  { code: 'greece', name: 'Grecia', region: 'Europa' },
  { code: 'hungary', name: 'Hungría', region: 'Europa' },
  { code: 'ireland', name: 'Irlanda', region: 'Europa' },
  { code: 'italy', name: 'Italia', region: 'Europa' },
  { code: 'kosovo', name: 'Kosovo', region: 'Europa' },
  { code: 'latvia', name: 'Letonia', region: 'Europa' },
  { code: 'liechtenstein', name: 'Liechtenstein', region: 'Europa' },
  { code: 'lithuania', name: 'Lituania', region: 'Europa' },
  { code: 'luxembourg', name: 'Luxemburgo', region: 'Europa' },
  { code: 'malta', name: 'Malta', region: 'Europa' },
  { code: 'moldova', name: 'Moldavia', region: 'Europa' },
  { code: 'monaco', name: 'Mónaco', region: 'Europa' },
  { code: 'montenegro', name: 'Montenegro', region: 'Europa' },
  { code: 'netherlands', name: 'Países Bajos', region: 'Europa' },
  { code: 'north-macedonia', name: 'Macedonia del Norte', region: 'Europa' },
  { code: 'poland', name: 'Polonia', region: 'Europa' },
  { code: 'portugal', name: 'Portugal', region: 'Europa' },
  { code: 'romania', name: 'Rumanía', region: 'Europa' },
  { code: 'san-marino', name: 'San Marino', region: 'Europa' },
  { code: 'serbia', name: 'Serbia', region: 'Europa' },
  { code: 'slovakia', name: 'Eslovaquia', region: 'Europa' },
  { code: 'slovenia', name: 'Eslovenia', region: 'Europa' },
  { code: 'spain', name: 'España', region: 'Europa' },
  { code: 'switzerland', name: 'Suiza', region: 'Europa' },
  { code: 'ukraine', name: 'Ucrania', region: 'Europa' },
  { code: 'united-kingdom', name: 'Reino Unido', region: 'Europa' },
  { code: 'vatican', name: 'Vaticano', region: 'Europa' },
  // África
  { code: 'angola', name: 'Angola', region: 'África' },
  { code: 'benin', name: 'Benín', region: 'África' },
  { code: 'botswana', name: 'Botsuana', region: 'África' },
  { code: 'burkina-faso', name: 'Burkina Faso', region: 'África' },
  { code: 'burundi', name: 'Burundi', region: 'África' },
  { code: 'cameroon', name: 'Camerún', region: 'África' },
  { code: 'cape-verde', name: 'Cabo Verde', region: 'África' },
  { code: 'central-african-republic', name: 'República Centroafricana', region: 'África' },
  { code: 'chad', name: 'Chad', region: 'África' },
  { code: 'congo', name: 'República del Congo', region: 'África' },
  { code: 'drc', name: 'Rep. Dem. del Congo', region: 'África' },
  { code: 'djibouti', name: 'Yibuti', region: 'África' },
  { code: 'equatorial-guinea', name: 'Guinea Ecuatorial', region: 'África' },
  { code: 'eritrea', name: 'Eritrea', region: 'África' },
  { code: 'ethiopia', name: 'Etiopía', region: 'África' },
  { code: 'gabon', name: 'Gabón', region: 'África' },
  { code: 'gambia', name: 'Gambia', region: 'África' },
  { code: 'ghana', name: 'Ghana', region: 'África' },
  { code: 'guinea', name: 'Guinea', region: 'África' },
  { code: 'guinea-bissau', name: 'Guinea-Bisáu', region: 'África' },
  { code: 'ivory-coast', name: 'Costa de Marfil', region: 'África' },
  { code: 'kenya', name: 'Kenia', region: 'África' },
  { code: 'lesotho', name: 'Lesoto', region: 'África' },
  { code: 'liberia', name: 'Liberia', region: 'África' },
  { code: 'madagascar', name: 'Madagascar', region: 'África' },
  { code: 'malawi', name: 'Malaui', region: 'África' },
  { code: 'mali', name: 'Malí', region: 'África' },
  { code: 'mauritius', name: 'Mauricio', region: 'África' },
  { code: 'mozambique', name: 'Mozambique', region: 'África' },
  { code: 'namibia', name: 'Namibia', region: 'África' },
  { code: 'niger', name: 'Níger', region: 'África' },
  { code: 'nigeria', name: 'Nigeria', region: 'África' },
  { code: 'rwanda', name: 'Ruanda', region: 'África' },
  { code: 'sao-tome', name: 'Santo Tomé y Príncipe', region: 'África' },
  { code: 'senegal', name: 'Senegal', region: 'África' },
  { code: 'seychelles', name: 'Seychelles', region: 'África' },
  { code: 'sierra-leone', name: 'Sierra Leona', region: 'África' },
  { code: 'somalia', name: 'Somalia', region: 'África' },
  { code: 'south-africa', name: 'Sudáfrica', region: 'África' },
  { code: 'eswatini', name: 'Esuatini', region: 'África' },
  { code: 'tanzania', name: 'Tanzania', region: 'África' },
  { code: 'togo', name: 'Togo', region: 'África' },
  { code: 'uganda', name: 'Uganda', region: 'África' },
  { code: 'zambia', name: 'Zambia', region: 'África' },
  { code: 'zimbabwe', name: 'Zimbabue', region: 'África' },
  { code: 'reunion', name: 'Reunión', region: 'África' },
  { code: 'mayotte', name: 'Mayotte', region: 'África' },
  // Asia
  { code: 'afghanistan', name: 'Afganistán', region: 'Asia' },
  { code: 'armenia', name: 'Armenia', region: 'Asia' },
  { code: 'azerbaijan', name: 'Azerbaiyán', region: 'Asia' },
  { code: 'bangladesh', name: 'Bangladés', region: 'Asia' },
  { code: 'bhutan', name: 'Bután', region: 'Asia' },
  { code: 'brunei', name: 'Brunéi', region: 'Asia' },
  { code: 'cambodia', name: 'Camboya', region: 'Asia' },
  { code: 'china', name: 'China', region: 'Asia' },
  { code: 'georgia', name: 'Georgia', region: 'Asia' },
  { code: 'india', name: 'India', region: 'Asia' },
  { code: 'indonesia', name: 'Indonesia', region: 'Asia' },
  { code: 'japan', name: 'Japón', region: 'Asia' },
  { code: 'kazakhstan', name: 'Kazajistán', region: 'Asia' },
  { code: 'kyrgyzstan', name: 'Kirguistán', region: 'Asia' },
  { code: 'laos', name: 'Laos', region: 'Asia' },
  { code: 'malaysia', name: 'Malasia', region: 'Asia' },
  { code: 'maldives', name: 'Maldivas', region: 'Asia' },
  { code: 'mongolia', name: 'Mongolia', region: 'Asia' },
  { code: 'myanmar', name: 'Myanmar', region: 'Asia' },
  { code: 'nepal', name: 'Nepal', region: 'Asia' },
  { code: 'north-korea', name: 'Corea del Norte', region: 'Asia' },
  { code: 'pakistan', name: 'Pakistán', region: 'Asia' },
  { code: 'philippines', name: 'Filipinas', region: 'Asia' },
  { code: 'singapore', name: 'Singapur', region: 'Asia' },
  { code: 'south-korea', name: 'Corea del Sur', region: 'Asia' },
  { code: 'sri-lanka', name: 'Sri Lanka', region: 'Asia' },
  { code: 'taiwan', name: 'Taiwán', region: 'Asia' },
  { code: 'tajikistan', name: 'Tayikistán', region: 'Asia' },
  { code: 'thailand', name: 'Tailandia', region: 'Asia' },
  { code: 'turkmenistan', name: 'Turkmenistán', region: 'Asia' },
  { code: 'uzbekistan', name: 'Uzbekistán', region: 'Asia' },
  { code: 'vietnam', name: 'Vietnam', region: 'Asia' },
  { code: 'papua-new-guinea', name: 'Papúa Nueva Guinea', region: 'Asia' },
  { code: 'kashmir', name: 'Cachemira', region: 'Asia' },
  { code: 'uyghur', name: 'Uigures (Xinjiang)', region: 'Asia' },
  { code: 'tibet', name: 'Tíbet', region: 'Asia' },
  // América
  { code: 'brazil', name: 'Brasil', region: 'América del Sur' },
  { code: 'argentina', name: 'Argentina', region: 'América del Sur' },
  { code: 'colombia', name: 'Colombia', region: 'América del Sur' },
  { code: 'chile', name: 'Chile', region: 'América del Sur' },
  { code: 'peru', name: 'Perú', region: 'América del Sur' },
  { code: 'venezuela', name: 'Venezuela', region: 'América del Sur' },
  { code: 'bolivia', name: 'Bolivia', region: 'América del Sur' },
  { code: 'paraguay', name: 'Paraguay', region: 'América del Sur' },
  { code: 'uruguay', name: 'Uruguay', region: 'América del Sur' },
  { code: 'ecuador', name: 'Ecuador', region: 'América del Sur' },
  { code: 'trinidad-tobago', name: 'Trinidad y Tobago', region: 'Caribe' },
  { code: 'costa-rica', name: 'Costa Rica', region: 'Centroamérica' },
  { code: 'panama', name: 'Panamá', region: 'Centroamérica' },
  { code: 'cuba', name: 'Cuba', region: 'Caribe' },
  { code: 'guyana', name: 'Guyana', region: 'América del Sur' },
  { code: 'suriname', name: 'Surinam', region: 'América del Sur' },
  { code: 'mexico', name: 'México', region: 'América del Norte' },
  { code: 'haiti', name: 'Haití', region: 'Caribe' }
];

async function isDbConnected() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    return true;
  } catch {
    return false;
  }
}

router.get('/predefined-countries', authenticateToken, async (req, res) => {
  if (await isDbConnected()) {
    try {
      const [rows] = await pool.query('SELECT code, name_es as name, region FROM predefined_countries ORDER BY region, name_es');
      if (rows.length > 0) {
        return res.json({ countries: rows });
      }
    } catch (error) {
      console.error('Error fetching predefined countries from DB:', error.message);
    }
  }
  
  res.json({ countries: PREDEFINED_COUNTRIES.sort((a, b) => {
    if (a.region < b.region) return -1;
    if (a.region > b.region) return 1;
    return a.name.localeCompare(b.name);
  })});
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

// GET individual resistance entry
router.get('/countries/:countryCode/resistance/:resistorId/entry/:entryId', authenticateToken, async (req, res) => {
  const { countryCode, resistorId, entryId } = req.params;
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
      'SELECT id FROM resistors WHERE country_id = ? AND resistor_id = ?',
      [countries[0].id, resistorId]
    );

    if (resistors.length === 0) {
      return res.status(404).json({ error: 'Resistor no encontrado' });
    }

    const [entries] = await pool.query(
      'SELECT * FROM resistance_entries WHERE resistor_id = ? AND entry_id = ?',
      [resistors[0].id, entryId]
    );

    if (entries.length === 0) {
      return res.status(404).json({ error: 'Entrada no encontrada' });
    }

    const entry = entries[0];
    res.json({
      id: entry.entry_id,
      title: entry.title,
      summary: entry.summary,
      date: entry.date,
      paragraphs: typeof entry.paragraphs === 'string' ? JSON.parse(entry.paragraphs) : entry.paragraphs || [],
      contentBlocks: typeof entry.content_blocks === 'string' ? JSON.parse(entry.content_blocks) : entry.content_blocks || [],
      media: typeof entry.media === 'string' ? JSON.parse(entry.media) : entry.media || []
    });
  } catch (error) {
    console.error('Error fetching resistance entry:', error);
    res.status(500).json({ error: 'Error al obtener entrada' });
  }
});

// PUT update resistance entry
router.put('/countries/:countryCode/resistance/:resistorId/entry/:entryId', authenticateToken, checkCountryPermission, checkPermission('edit'), async (req, res) => {
  const { countryCode, resistorId, entryId } = req.params;
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

    const [resistors] = await pool.query(
      'SELECT id FROM resistors WHERE country_id = ? AND resistor_id = ?',
      [countries[0].id, resistorId]
    );

    if (resistors.length === 0) {
      return res.status(404).json({ error: 'Resistor no encontrado' });
    }

    await pool.query(
      `UPDATE resistance_entries SET title = ?, summary = ?, date = ?, paragraphs = ?, content_blocks = ?, media = ?
       WHERE resistor_id = ? AND entry_id = ?`,
      [title, summary, date, JSON.stringify(paragraphs || []), JSON.stringify(contentBlocks || []), 
       JSON.stringify(media || []), resistors[0].id, entryId]
    );

    res.json({ success: true, item: { id: entryId, title, summary, date, media } });
  } catch (error) {
    console.error('Error updating resistance entry:', error);
    res.status(500).json({ error: 'Error al actualizar entrada' });
  }
});

// DELETE resistance entry
router.delete('/countries/:countryCode/resistance/:resistorId/entry/:entryId', authenticateToken, checkCountryPermission, checkPermission('delete'), async (req, res) => {
  const { countryCode, resistorId, entryId } = req.params;
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
      'SELECT id FROM resistors WHERE country_id = ? AND resistor_id = ?',
      [countries[0].id, resistorId]
    );

    if (resistors.length === 0) {
      return res.status(404).json({ error: 'Resistor no encontrado' });
    }

    await pool.query(
      'DELETE FROM resistance_entries WHERE resistor_id = ? AND entry_id = ?',
      [resistors[0].id, entryId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting resistance entry:', error);
    res.status(500).json({ error: 'Error al eliminar entrada' });
  }
});

// DELETE resistor
router.delete('/countries/:countryCode/resistance/:resistorId', authenticateToken, checkCountryPermission, checkPermission('delete'), async (req, res) => {
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

    await pool.query(
      'DELETE FROM resistors WHERE country_id = ? AND resistor_id = ?',
      [countries[0].id, resistorId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting resistor:', error);
    res.status(500).json({ error: 'Error al eliminar resistor' });
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

router.get('/velum', authenticateToken, async (req, res) => {
  const lang = req.query.lang || 'es';
  try {
    const [articles] = await pool.query(
      'SELECT article_id as id, title, subtitle, author, author_image as authorImage, cover_image as coverImage, date, abstract, keywords FROM velum_articles WHERE lang = ? ORDER BY date DESC',
      [lang]
    );
    res.json({ 
      items: articles.map(a => ({
        ...a,
        keywords: typeof a.keywords === 'string' ? JSON.parse(a.keywords) : a.keywords || []
      }))
    });
  } catch (error) {
    console.error('Error fetching velum articles:', error);
    res.status(500).json({ error: 'Error al obtener artículos' });
  }
});

router.get('/velum/:articleId', authenticateToken, async (req, res) => {
  const { articleId } = req.params;
  const lang = req.query.lang || 'es';
  try {
    const [articles] = await pool.query(
      'SELECT * FROM velum_articles WHERE article_id = ? AND lang = ?',
      [articleId, lang]
    );
    if (articles.length === 0) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }
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
    console.error('Error fetching velum article:', error);
    res.status(500).json({ error: 'Error al obtener artículo' });
  }
});

router.post('/velum', authenticateToken, checkPermission('create'), async (req, res) => {
  const lang = req.query.lang || 'es';
  const { id, title, subtitle, author, authorImage, coverImage, date, abstract, keywords, sections, bibliography } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Título es requerido' });
  }

  const articleId = id || title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50);

  try {
    await pool.query(
      `INSERT INTO velum_articles (article_id, lang, title, subtitle, author, author_image, cover_image, date, abstract, keywords, sections, bibliography)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [articleId, lang, title, subtitle || '', author || '', authorImage || null, coverImage || null, 
       date || '', abstract || '', JSON.stringify(keywords || []), JSON.stringify(sections || []), JSON.stringify(bibliography || [])]
    );
    res.json({ success: true, item: { id: articleId, title, subtitle, author, date } });
  } catch (error) {
    console.error('Error creating velum article:', error);
    res.status(500).json({ error: 'Error al crear artículo' });
  }
});

router.put('/velum/:articleId', authenticateToken, checkPermission('edit'), async (req, res) => {
  const { articleId } = req.params;
  const lang = req.query.lang || 'es';
  const { title, subtitle, author, authorImage, coverImage, date, abstract, keywords, sections, bibliography } = req.body;

  try {
    await pool.query(
      `UPDATE velum_articles SET title = ?, subtitle = ?, author = ?, author_image = ?, cover_image = ?, 
       date = ?, abstract = ?, keywords = ?, sections = ?, bibliography = ?
       WHERE article_id = ? AND lang = ?`,
      [title, subtitle, author, authorImage, coverImage, date, abstract, 
       JSON.stringify(keywords || []), JSON.stringify(sections || []), JSON.stringify(bibliography || []),
       articleId, lang]
    );
    res.json({ success: true, item: { id: articleId, title, subtitle, author, date } });
  } catch (error) {
    console.error('Error updating velum article:', error);
    res.status(500).json({ error: 'Error al actualizar artículo' });
  }
});

router.delete('/velum/:articleId', authenticateToken, checkPermission('delete'), async (req, res) => {
  const { articleId } = req.params;
  const lang = req.query.lang || 'es';
  try {
    await pool.query('DELETE FROM velum_articles WHERE article_id = ? AND lang = ?', [articleId, lang]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting velum article:', error);
    res.status(500).json({ error: 'Error al eliminar artículo' });
  }
});

router.get('/terminology', authenticateToken, async (req, res) => {
  const lang = req.query.lang || 'es';
  try {
    const [terms] = await pool.query(
      'SELECT term_id as id, term, definition, category, related_terms as relatedTerms, sources FROM terminology WHERE lang = ? ORDER BY term',
      [lang]
    );
    res.json({ 
      items: terms.map(t => ({
        ...t,
        relatedTerms: typeof t.relatedTerms === 'string' ? JSON.parse(t.relatedTerms) : t.relatedTerms || [],
        sources: typeof t.sources === 'string' ? JSON.parse(t.sources) : t.sources || []
      }))
    });
  } catch (error) {
    console.error('Error fetching terminology:', error);
    res.status(500).json({ error: 'Error al obtener terminología' });
  }
});

router.post('/terminology', authenticateToken, checkPermission('create'), async (req, res) => {
  const lang = req.query.lang || 'es';
  const { term, definition, category, relatedTerms, sources } = req.body;
  
  if (!term || !definition) {
    return res.status(400).json({ error: 'Término y definición son requeridos' });
  }

  const termId = term.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50);

  try {
    await pool.query(
      `INSERT INTO terminology (term_id, lang, term, definition, category, related_terms, sources)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [termId, lang, term, definition, category || 'general', JSON.stringify(relatedTerms || []), JSON.stringify(sources || [])]
    );
    res.json({ success: true, item: { id: termId, term, definition, category } });
  } catch (error) {
    console.error('Error creating term:', error);
    res.status(500).json({ error: 'Error al crear término' });
  }
});

router.put('/terminology/:termId', authenticateToken, checkPermission('edit'), async (req, res) => {
  const { termId } = req.params;
  const lang = req.query.lang || 'es';
  const { term, definition, category, relatedTerms, sources } = req.body;

  try {
    await pool.query(
      `UPDATE terminology SET term = ?, definition = ?, category = ?, related_terms = ?, sources = ?
       WHERE term_id = ? AND lang = ?`,
      [term, definition, category, JSON.stringify(relatedTerms || []), JSON.stringify(sources || []), termId, lang]
    );
    res.json({ success: true, item: { id: termId, term, definition, category } });
  } catch (error) {
    console.error('Error updating term:', error);
    res.status(500).json({ error: 'Error al actualizar término' });
  }
});

router.delete('/terminology/:termId', authenticateToken, checkPermission('delete'), async (req, res) => {
  const { termId } = req.params;
  const lang = req.query.lang || 'es';
  try {
    await pool.query('DELETE FROM terminology WHERE term_id = ? AND lang = ?', [termId, lang]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting term:', error);
    res.status(500).json({ error: 'Error al eliminar término' });
  }
});

router.get('/countries/:countryCode/section-headers/:sectionId', authenticateToken, async (req, res) => {
  const { countryCode, sectionId } = req.params;
  const lang = req.query.lang || 'es';
  try {
    const [countries] = await pool.query('SELECT id FROM countries WHERE code = ? AND lang = ?', [countryCode, lang]);
    if (countries.length === 0) {
      return res.json({ title: '', description: '' });
    }
    const [headers] = await pool.query(
      'SELECT title, description FROM section_headers WHERE country_id = ? AND section_id = ?',
      [countries[0].id, sectionId]
    );
    res.json(headers.length > 0 ? headers[0] : { title: '', description: '' });
  } catch (error) {
    console.error('Error fetching section header:', error);
    res.status(500).json({ error: 'Error al obtener encabezado' });
  }
});

router.put('/countries/:countryCode/section-headers/:sectionId', authenticateToken, checkCountryPermission, checkPermission('edit'), async (req, res) => {
  const { countryCode, sectionId } = req.params;
  const lang = req.query.lang || 'es';
  const { title, description } = req.body;

  try {
    const [countries] = await pool.query('SELECT id FROM countries WHERE code = ? AND lang = ?', [countryCode, lang]);
    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }
    await pool.query(
      `INSERT INTO section_headers (country_id, section_id, title, description) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description)`,
      [countries[0].id, sectionId, title || '', description || '']
    );
    res.json({ success: true, data: { title, description } });
  } catch (error) {
    console.error('Error updating section header:', error);
    res.status(500).json({ error: 'Error al guardar encabezado' });
  }
});

module.exports = router;
