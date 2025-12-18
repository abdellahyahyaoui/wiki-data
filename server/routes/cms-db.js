ry:', error);
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
