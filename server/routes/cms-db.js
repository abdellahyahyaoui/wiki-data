const express = require('express');
const router = express.Router();
const pool = require('../db').pool;
const { authenticateToken, checkCountryPermission, checkPermission } = require('../middleware/auth');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// GET fototeca items for a country
router.get('/countries/:countryCode/fototeca', async (req, res) => {
  const { countryCode } = req.params;
  const connection = await pool.getConnection();
  try {
    const [countries] = await connection.query('SELECT id FROM countries WHERE code = ? LIMIT 1', [countryCode]);
    if (countries.length === 0) {
      return res.json({ items: [] });
    }
    const [items] = await connection.query(
      'SELECT id, title, description, date, type, url FROM fototeca WHERE country_id = ? ORDER BY created_at DESC',
      [countries[0].id]
    );
    res.json({ items });
  } catch (error) {
    console.error('Error fetching fototeca:', error);
    res.status(500).json({ error: 'Error al obtener fototeca' });
  } finally {
    connection.release();
  }
});

// POST new fototeca item
router.post('/countries/:countryCode/fototeca', async (req, res) => {
  const { countryCode } = req.params;
  const { title, description, date, type, url } = req.body;
  
  if (!title || !url) {
    return res.status(400).json({ error: 'Título y URL son requeridos' });
  }

  const connection = await pool.getConnection();
  try {
    const [countries] = await connection.query('SELECT id FROM countries WHERE code = ? LIMIT 1', [countryCode]);
    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }

    const itemId = uuidv4();
    await connection.query(
      "INSERT INTO fototeca (item_id, country_id, title, description, date, type, url) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [itemId, countries[0].id, title, description || '', date || '', type || 'image', url]
    );

    res.json({ success: true, item: { id: itemId, title, description, date, type, url } });
  } catch (error) {
    console.error('Error creating fototeca item:', error);
    res.status(500).json({ error: 'Error al crear elemento' });
  } finally {
    connection.release();
  }
});

// PUT update fototeca item
router.put('/countries/:countryCode/fototeca/:itemId', async (req, res) => {
  const { countryCode, itemId } = req.params;
  const { title, description, date, type, url } = req.body;

  const connection = await pool.getConnection();
  try {
    const [countries] = await connection.query('SELECT id FROM countries WHERE code = ? LIMIT 1', [countryCode]);
    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }

    await connection.query(
      'UPDATE fototeca SET title = ?, description = ?, date = ?, type = ?, url = ? WHERE item_id = ? AND country_id = ?',
      [title, description, date, type, url, itemId, countries[0].id]
    );

    res.json({ success: true, item: { id: itemId, title, description, date, type, url } });
  } catch (error) {
    console.error('Error updating fototeca item:', error);
    res.status(500).json({ error: 'Error al actualizar elemento' });
  } finally {
    connection.release();
  }
});

// DELETE fototeca item
router.delete('/countries/:countryCode/fototeca/:itemId', async (req, res) => {
  const { countryCode, itemId } = req.params;

  const connection = await pool.getConnection();
  try {
    const [countries] = await connection.query('SELECT id FROM countries WHERE code = ? LIMIT 1', [countryCode]);
    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }

    await connection.query('DELETE FROM fototeca WHERE item_id = ? AND country_id = ?', [itemId, countries[0].id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting fototeca item:', error);
    res.status(500).json({ error: 'Error al eliminar elemento' });
  } finally {
    connection.release();
  }
});

// Get gallery images (no auth needed)
router.get('/gallery/images', async (req, res) => {
  try {
    const files = fs.readdirSync('public/imagenes').filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f));
    res.json({ 
      images: files.map(f => ({
        name: f,
        url: `/imagenes/${f}`
      }))
    });
  } catch (error) {
    console.error('Error reading gallery:', error);
    res.status(500).json({ error: 'Error al leer galería' });
  }
});

// ===== OTROS ENDPOINTS (CON AUTENTICACIÓN) =====

router.get('/pending', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'No autorizado' });
  }
  const connection = await pool.getConnection();
  try {
    const [changes] = await connection.query(
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
  } finally {
    connection.release();
  }
});

router.get('/velum', authenticateToken, async (req, res) => {
  const lang = req.query.lang || 'es';
  const connection = await pool.getConnection();
  try {
    const [articles] = await connection.query(
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
  } finally {
    connection.release();
  }
});

router.get('/velum/:articleId', authenticateToken, async (req, res) => {
  const { articleId } = req.params;
  const lang = req.query.lang || 'es';
  const connection = await pool.getConnection();
  try {
    const [articles] = await connection.query(
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
  } finally {
    connection.release();
  }
});

router.post('/velum', authenticateToken, checkPermission('create'), async (req, res) => {
  const lang = req.query.lang || 'es';
  const { id, title, subtitle, author, authorImage, coverImage, date, abstract, keywords, sections, bibliography } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Título es requerido' });
  }

  const articleId = id || title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50);
  const connection = await pool.getConnection();
  try {
    await connection.query(
      `INSERT INTO velum_articles (article_id, lang, title, subtitle, author, author_image, cover_image, date, abstract, keywords, sections, bibliography)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [articleId, lang, title, subtitle || '', author || '', authorImage || null, coverImage || null, 
       date || '', abstract || '', JSON.stringify(keywords || []), JSON.stringify(sections || []), JSON.stringify(bibliography || [])]
    );
    res.json({ success: true, item: { id: articleId, title, subtitle, author, date } });
  } catch (error) {
    console.error('Error creating velum article:', error);
    res.status(500).json({ error: 'Error al crear artículo' });
  } finally {
    connection.release();
  }
});

router.put('/velum/:articleId', authenticateToken, checkPermission('edit'), async (req, res) => {
  const { articleId } = req.params;
  const lang = req.query.lang || 'es';
  const { title, subtitle, author, authorImage, coverImage, date, abstract, keywords, sections, bibliography } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.query(
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
  } finally {
    connection.release();
  }
});

router.delete('/velum/:articleId', authenticateToken, checkPermission('delete'), async (req, res) => {
  const { articleId } = req.params;
  const lang = req.query.lang || 'es';
  const connection = await pool.getConnection();
  try {
    await connection.query('DELETE FROM velum_articles WHERE article_id = ? AND lang = ?', [articleId, lang]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting velum article:', error);
    res.status(500).json({ error: 'Error al eliminar artículo' });
  } finally {
    connection.release();
  }
});

router.get('/terminology', authenticateToken, async (req, res) => {
  const lang = req.query.lang || 'es';
  const connection = await pool.getConnection();
  try {
    const [terms] = await connection.query(
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
  } finally {
    connection.release();
  }
});

router.post('/terminology', authenticateToken, checkPermission('create'), async (req, res) => {
  const lang = req.query.lang || 'es';
  const { term, definition, category, relatedTerms, sources } = req.body;
  
  if (!term || !definition) {
    return res.status(400).json({ error: 'Término y definición son requeridos' });
  }

  const termId = term.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50);
  const connection = await pool.getConnection();
  try {
    await connection.query(
      `INSERT INTO terminology (term_id, lang, term, definition, category, related_terms, sources)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [termId, lang, term, definition, category || 'general', JSON.stringify(relatedTerms || []), JSON.stringify(sources || [])]
    );
    res.json({ success: true, item: { id: termId, term, definition, category } });
  } catch (error) {
    console.error('Error creating term:', error);
    res.status(500).json({ error: 'Error al crear término' });
  } finally {
    connection.release();
  }
});

router.put('/terminology/:termId', authenticateToken, checkPermission('edit'), async (req, res) => {
  const { termId } = req.params;
  const lang = req.query.lang || 'es';
  const { term, definition, category, relatedTerms, sources } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.query(
      `UPDATE terminology SET term = ?, definition = ?, category = ?, related_terms = ?, sources = ?
       WHERE term_id = ? AND lang = ?`,
      [term, definition, category, JSON.stringify(relatedTerms || []), JSON.stringify(sources || []), termId, lang]
    );
    res.json({ success: true, item: { id: termId, term, definition, category } });
  } catch (error) {
    console.error('Error updating term:', error);
    res.status(500).json({ error: 'Error al actualizar término' });
  } finally {
    connection.release();
  }
});

router.delete('/terminology/:termId', authenticateToken, checkPermission('delete'), async (req, res) => {
  const { termId } = req.params;
  const lang = req.query.lang || 'es';
  const connection = await pool.getConnection();
  try {
    await connection.query('DELETE FROM terminology WHERE term_id = ? AND lang = ?', [termId, lang]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting term:', error);
    res.status(500).json({ error: 'Error al eliminar término' });
  } finally {
    connection.release();
  }
});

router.get('/countries/:countryCode/section-headers/:sectionId', authenticateToken, async (req, res) => {
  const { countryCode, sectionId } = req.params;
  const lang = req.query.lang || 'es';
  const connection = await pool.getConnection();
  try {
    const [countries] = await connection.query('SELECT id FROM countries WHERE code = ? AND lang = ?', [countryCode, lang]);
    if (countries.length === 0) {
      return res.json({ title: '', description: '' });
    }
    const [headers] = await connection.query(
      'SELECT title, description FROM section_headers WHERE country_id = ? AND section_id = ?',
      [countries[0].id, sectionId]
    );
    res.json(headers.length > 0 ? headers[0] : { title: '', description: '' });
  } catch (error) {
    console.error('Error fetching section header:', error);
    res.status(500).json({ error: 'Error al obtener encabezado' });
  } finally {
    connection.release();
  }
});

router.put('/countries/:countryCode/section-headers/:sectionId', authenticateToken, checkCountryPermission, checkPermission('edit'), async (req, res) => {
  const { countryCode, sectionId } = req.params;
  const lang = req.query.lang || 'es';
  const { title, description } = req.body;
  const connection = await pool.getConnection();
  try {
    const [countries] = await connection.query('SELECT id FROM countries WHERE code = ? AND lang = ?', [countryCode, lang]);
    if (countries.length === 0) {
      return res.status(404).json({ error: 'País no encontrado' });
    }
    await connection.query(
      `INSERT INTO section_headers (country_id, section_id, title, description) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description)`,
      [countries[0].id, sectionId, title || '', description || '']
    );
    res.json({ success: true, data: { title, description } });
  } catch (error) {
    console.error('Error updating section header:', error);
    res.status(500).json({ error: 'Error al guardar encabezado' });
  } finally {
    connection.release();
  }
});

module.exports = router;
