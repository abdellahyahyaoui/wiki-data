const express = require('express');
const { pool, testConnection } = require('../db');
const fs = require('fs');
const path = require('path');

const router = express.Router();

async function isDbConnected() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    return true;
  } catch {
    return false;
  }
}

function loadJsonFallback(filePath) {
  try {
    const fullPath = path.join(__dirname, '../../public', filePath);
    if (fs.existsSync(fullPath)) {
      return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    }
  } catch (err) {
    console.error('JSON fallback error:', err.message);
  }
  return null;
}

router.get('/countries', async (req, res) => {
  const lang = req.query.lang || 'es';
  
  if (await isDbConnected()) {
    try {
      const [countries] = await pool.query(
        'SELECT code, name FROM countries WHERE lang = ? ORDER BY name',
        [lang]
      );
      return res.json({ countries });
    } catch (error) {
      console.error('DB error:', error.message);
    }
  }
  
  const fallback = loadJsonFallback(`/data/${lang}/countries.json`);
  res.json(fallback || { countries: [] });
});

router.get('/countries/:code/meta', async (req, res) => {
  const { code } = req.params;
  const lang = req.query.lang || 'es';
  
  if (await isDbConnected()) {
    try {
      const [countries] = await pool.query(
        'SELECT id, code, name FROM countries WHERE code = ? AND lang = ?',
        [code, lang]
      );
      
      if (countries.length > 0) {
        const country = countries[0];
        const [sections] = await pool.query(
          'SELECT section_id as id, label FROM sections WHERE country_id = ? ORDER BY sort_order',
          [country.id]
        );
        
        // Ensure VELUM is included if not in DB
        const hasVelum = sections.some(s => s.id === 'velum');
        if (!hasVelum) {
          sections.push({ id: 'velum', label: 'VELUM' });
        }

        return res.json({
          code: country.code,
          name: country.name,
          sections: sections
        });
      }
    } catch (error) {
      console.error('DB error:', error.message);
    }
  }
  
  const fallback = loadJsonFallback(`/data/${lang}/${code}/meta.json`);
  if (fallback) {
    const hasVelum = fallback.sections.some(s => s.id === 'velum');
    if (!hasVelum) {
      fallback.sections.push({ id: 'velum', label: 'VELUM' });
    }
  }
  res.json(fallback || { code, name: code, sections: [{ id: 'velum', label: 'VELUM' }] });
});

router.get('/countries/:code/description', async (req, res) => {
  const { code } = req.params;
  const lang = req.query.lang || 'es';
  
  if (await isDbConnected()) {
    try {
      const [countries] = await pool.query(
        'SELECT id FROM countries WHERE code = ? AND lang = ?',
        [code, lang]
      );
      
      if (countries.length > 0) {
        const [descriptions] = await pool.query(
          'SELECT title, chapters FROM descriptions WHERE country_id = ?',
          [countries[0].id]
        );
        
        if (descriptions.length > 0) {
          const desc = descriptions[0];
          return res.json({
            title: desc.title,
            chapters: typeof desc.chapters === 'string' ? JSON.parse(desc.chapters) : desc.chapters || []
          });
        }
        return res.json({ title: 'Descripción del Conflicto', chapters: [] });
      }
    } catch (error) {
      console.error('DB error:', error.message);
    }
  }
  
  const fallback = loadJsonFallback(`/data/${lang}/${code}/description.json`);
  res.json(fallback || { title: '', chapters: [] });
});

router.get('/countries/:code/timeline', async (req, res) => {
  const { code } = req.params;
  const lang = req.query.lang || 'es';
  
  if (await isDbConnected()) {
    try {
      const [countries] = await pool.query(
        'SELECT id FROM countries WHERE code = ? AND lang = ?',
        [code, lang]
      );
      
      if (countries.length > 0) {
        const [events] = await pool.query(
          'SELECT event_id as id, date, year, month, title, summary, image FROM timeline_events WHERE country_id = ? ORDER BY date DESC',
          [countries[0].id]
        );
        return res.json({ items: events });
      }
    } catch (error) {
      console.error('DB error:', error.message);
    }
  }
  
  const fallback = loadJsonFallback(`/data/${lang}/${code}/timeline/timeline.index.json`);
  res.json(fallback || { items: [] });
});

router.get('/countries/:code/timeline/:eventId', async (req, res) => {
  const { code, eventId } = req.params;
  const lang = req.query.lang || 'es';
  
  if (await isDbConnected()) {
    try {
      const [countries] = await pool.query(
        'SELECT id FROM countries WHERE code = ? AND lang = ?',
        [code, lang]
      );
      
      if (countries.length > 0) {
        const [events] = await pool.query(
          'SELECT * FROM timeline_events WHERE country_id = ? AND event_id = ?',
          [countries[0].id, eventId]
        );
        
        if (events.length > 0) {
          const event = events[0];
          return res.json({
            id: event.event_id,
            date: event.date,
            year: event.year,
            month: event.month,
            title: event.title,
            summary: event.summary,
            image: event.image,
            video: event.video,
            paragraphs: typeof event.paragraphs === 'string' ? JSON.parse(event.paragraphs) : event.paragraphs || [],
            contentBlocks: typeof event.content_blocks === 'string' ? JSON.parse(event.content_blocks) : event.content_blocks || [],
            sources: typeof event.sources === 'string' ? JSON.parse(event.sources) : event.sources || []
          });
        }
      }
    } catch (error) {
      console.error('DB error:', error.message);
    }
  }
  
  const fallback = loadJsonFallback(`/data/${lang}/${code}/timeline/${eventId}.json`);
  res.json(fallback || null);
});

router.get('/countries/:code/testimonies', async (req, res) => {
  const { code } = req.params;
  const lang = req.query.lang || 'es';
  
  if (await isDbConnected()) {
    try {
      const [countries] = await pool.query(
        'SELECT id FROM countries WHERE code = ? AND lang = ?',
        [code, lang]
      );
      
      if (countries.length > 0) {
        const [witnesses] = await pool.query(
          'SELECT witness_id as id, name, image FROM witnesses WHERE country_id = ? ORDER BY name',
          [countries[0].id]
        );
        return res.json({ items: witnesses });
      }
    } catch (error) {
      console.error('DB error:', error.message);
    }
  }
  
  const fallback = loadJsonFallback(`/data/${lang}/${code}/testimonies.index.json`);
  res.json(fallback || { items: [] });
});

router.get('/countries/:code/testimonies/:witnessId', async (req, res) => {
  const { code, witnessId } = req.params;
  const lang = req.query.lang || 'es';
  
  if (await isDbConnected()) {
    try {
      const [countries] = await pool.query(
        'SELECT id FROM countries WHERE code = ? AND lang = ?',
        [code, lang]
      );
      
      if (countries.length > 0) {
        const [witnesses] = await pool.query(
          'SELECT * FROM witnesses WHERE country_id = ? AND witness_id = ?',
          [countries[0].id, witnessId]
        );
        
        if (witnesses.length > 0) {
          const witness = witnesses[0];
          const [testimonies] = await pool.query(
            'SELECT testimony_id as id, title, summary, date, paragraphs, content_blocks, media FROM testimonies WHERE witness_id = ?',
            [witness.id]
          );
          
          return res.json({
            id: witness.witness_id,
            name: witness.name,
            bio: witness.bio,
            image: witness.image,
            social: typeof witness.social === 'string' ? JSON.parse(witness.social) : witness.social || {},
            testimonies: testimonies.map(t => ({
              id: t.id,
              title: t.title,
              summary: t.summary,
              date: t.date,
              paragraphs: typeof t.paragraphs === 'string' ? JSON.parse(t.paragraphs) : t.paragraphs || [],
              contentBlocks: typeof t.content_blocks === 'string' ? JSON.parse(t.content_blocks) : t.content_blocks || [],
              media: typeof t.media === 'string' ? JSON.parse(t.media) : t.media || []
            }))
          });
        }
      }
    } catch (error) {
      console.error('DB error:', error.message);
    }
  }
  
  const fallback = loadJsonFallback(`/data/${lang}/${code}/testimonies/${witnessId}.json`);
  res.json(fallback || null);
});

router.get('/countries/:code/testimonies/:witnessId/:testimonyId', async (req, res) => {
  const { code, witnessId, testimonyId } = req.params;
  const lang = req.query.lang || 'es';
  
  if (await isDbConnected()) {
    try {
      const [countries] = await pool.query(
        'SELECT id FROM countries WHERE code = ? AND lang = ?',
        [code, lang]
      );
      
      if (countries.length > 0) {
        const [witnesses] = await pool.query(
          'SELECT id FROM witnesses WHERE country_id = ? AND witness_id = ?',
          [countries[0].id, witnessId]
        );
        
        if (witnesses.length > 0) {
          const [testimonies] = await pool.query(
            'SELECT testimony_id as id, title, summary, date, paragraphs, content_blocks, media FROM testimonies WHERE witness_id = ? AND testimony_id = ?',
            [witnesses[0].id, testimonyId]
          );
          
          if (testimonies.length > 0) {
            const t = testimonies[0];
            return res.json({
              id: t.id,
              title: t.title,
              summary: t.summary,
              date: t.date,
              paragraphs: typeof t.paragraphs === 'string' ? JSON.parse(t.paragraphs) : t.paragraphs || [],
              contentBlocks: typeof t.content_blocks === 'string' ? JSON.parse(t.content_blocks) : t.content_blocks || [],
              media: typeof t.media === 'string' ? JSON.parse(t.media) : t.media || []
            });
          }
        }
      }
    } catch (error) {
      console.error('DB error:', error.message);
    }
  }
  
  const fallback = loadJsonFallback(`/data/${lang}/${code}/testimonies/${witnessId}/${testimonyId}.json`);
  res.json(fallback || null);
});

router.get('/countries/:code/resistance', async (req, res) => {
  const { code } = req.params;
  const lang = req.query.lang || 'es';
  
  if (await isDbConnected()) {
    try {
      const [countries] = await pool.query(
        'SELECT id FROM countries WHERE code = ? AND lang = ?',
        [code, lang]
      );
      
      if (countries.length > 0) {
        const [resistors] = await pool.query(
          'SELECT resistor_id as id, name, image FROM resistors WHERE country_id = ? ORDER BY name',
          [countries[0].id]
        );
        return res.json({ items: resistors });
      }
    } catch (error) {
      console.error('DB error:', error.message);
    }
  }
  
  const fallback = loadJsonFallback(`/data/${lang}/${code}/resistance/resistance.index.json`);
  res.json(fallback || { items: [] });
});

router.get('/countries/:code/resistance/:resistorId', async (req, res) => {
  const { code, resistorId } = req.params;
  const lang = req.query.lang || 'es';
  
  if (await isDbConnected()) {
    try {
      const [countries] = await pool.query(
        'SELECT id FROM countries WHERE code = ? AND lang = ?',
        [code, lang]
      );
      
      if (countries.length > 0) {
        const [resistors] = await pool.query(
          'SELECT * FROM resistors WHERE country_id = ? AND resistor_id = ?',
          [countries[0].id, resistorId]
        );
        
        if (resistors.length > 0) {
          const resistor = resistors[0];
          const [entries] = await pool.query(
            'SELECT entry_id as id, title, summary, date, paragraphs, content_blocks, media FROM resistance_entries WHERE resistor_id = ?',
            [resistor.id]
          );
          
          return res.json({
            id: resistor.resistor_id,
            name: resistor.name,
            bio: resistor.bio,
            image: resistor.image,
            social: typeof resistor.social === 'string' ? JSON.parse(resistor.social) : resistor.social || {},
            entries: entries.map(e => ({
              id: e.id,
              title: e.title,
              summary: e.summary,
              date: e.date,
              paragraphs: typeof e.paragraphs === 'string' ? JSON.parse(e.paragraphs) : e.paragraphs || [],
              contentBlocks: typeof e.content_blocks === 'string' ? JSON.parse(e.content_blocks) : e.content_blocks || [],
              media: typeof e.media === 'string' ? JSON.parse(e.media) : e.media || []
            }))
          });
        }
      }
    } catch (error) {
      console.error('DB error:', error.message);
    }
  }
  
  const fallback = loadJsonFallback(`/data/${lang}/${code}/resistance/${resistorId}.json`);
  res.json(fallback || null);
});

router.get('/countries/:code/resistance/:resistorId/:entryId', async (req, res) => {
  const { code, resistorId, entryId } = req.params;
  const lang = req.query.lang || 'es';
  
  if (await isDbConnected()) {
    try {
      const [countries] = await pool.query(
        'SELECT id FROM countries WHERE code = ? AND lang = ?',
        [code, lang]
      );
      
      if (countries.length > 0) {
        const [resistors] = await pool.query(
          'SELECT id FROM resistors WHERE country_id = ? AND resistor_id = ?',
          [countries[0].id, resistorId]
        );
        
        if (resistors.length > 0) {
          const [entries] = await pool.query(
            'SELECT entry_id as id, title, summary, date, paragraphs, content_blocks, media FROM resistance_entries WHERE resistor_id = ? AND entry_id = ?',
            [resistors[0].id, entryId]
          );
          
          if (entries.length > 0) {
            const e = entries[0];
            return res.json({
              id: e.id,
              title: e.title,
              summary: e.summary,
              date: e.date,
              paragraphs: typeof e.paragraphs === 'string' ? JSON.parse(e.paragraphs) : e.paragraphs || [],
              contentBlocks: typeof e.content_blocks === 'string' ? JSON.parse(e.content_blocks) : e.content_blocks || [],
              media: typeof e.media === 'string' ? JSON.parse(e.media) : e.media || []
            });
          }
        }
      }
    } catch (error) {
      console.error('DB error:', error.message);
    }
  }
  
  const fallback = loadJsonFallback(`/data/${lang}/${code}/resistance/${resistorId}/${entryId}.json`);
  res.json(fallback || null);
});

router.get('/countries/:code/fototeca', async (req, res) => {
  const { code } = req.params;
  const lang = req.query.lang || 'es';
  
  if (await isDbConnected()) {
    try {
      const [countries] = await pool.query(
        'SELECT id FROM countries WHERE code = ? AND lang = ?',
        [code, lang]
      );
      
      if (countries.length > 0) {
        const [items] = await pool.query(
          'SELECT item_id as id, title, description, date, type, url FROM fototeca WHERE country_id = ? ORDER BY date DESC',
          [countries[0].id]
        );
        return res.json({ items });
      }
    } catch (error) {
      console.error('DB error:', error.message);
    }
  }
  
  const fallback = loadJsonFallback(`/data/${lang}/${code}/fototeca/fototeca.index.json`);
  res.json(fallback || { items: [] });
});

router.get('/countries/:code/analysts', async (req, res) => {
  const { code } = req.params;
  const lang = req.query.lang || 'es';
  
  if (await isDbConnected()) {
    try {
      const [countries] = await pool.query(
        'SELECT id FROM countries WHERE code = ? AND lang = ?',
        [code, lang]
      );
      
      if (countries.length > 0) {
        const [analysts] = await pool.query(
          'SELECT analyst_id as id, name, image FROM analysts WHERE country_id = ? ORDER BY name',
          [countries[0].id]
        );
        return res.json({ items: analysts });
      }
    } catch (error) {
      console.error('DB error:', error.message);
    }
  }
  
  const fallback = loadJsonFallback(`/data/${lang}/${code}/analysts.index.json`);
  res.json(fallback || { items: [] });
});

router.get('/countries/:code/analysts/:analystId', async (req, res) => {
  const { code, analystId } = req.params;
  const lang = req.query.lang || 'es';
  
  if (await isDbConnected()) {
    try {
      const [countries] = await pool.query(
        'SELECT id FROM countries WHERE code = ? AND lang = ?',
        [code, lang]
      );
      
      if (countries.length > 0) {
        const [analysts] = await pool.query(
          'SELECT * FROM analysts WHERE country_id = ? AND analyst_id = ?',
          [countries[0].id, analystId]
        );
        
        if (analysts.length > 0) {
          const analyst = analysts[0];
          const [analyses] = await pool.query(
            'SELECT analysis_id as id, title, summary, date, paragraphs, content_blocks, media FROM analyses WHERE analyst_id = ?',
            [analyst.id]
          );
          
          return res.json({
            id: analyst.analyst_id,
            name: analyst.name,
            bio: analyst.bio,
            image: analyst.image,
            social: typeof analyst.social === 'string' ? JSON.parse(analyst.social) : analyst.social || {},
            analyses: analyses.map(a => ({
              id: a.id,
              title: a.title,
              summary: a.summary,
              date: a.date,
              paragraphs: typeof a.paragraphs === 'string' ? JSON.parse(a.paragraphs) : a.paragraphs || [],
              contentBlocks: typeof a.content_blocks === 'string' ? JSON.parse(a.content_blocks) : a.content_blocks || [],
              media: typeof a.media === 'string' ? JSON.parse(a.media) : a.media || []
            }))
          });
        }
      }
    } catch (error) {
      console.error('DB error:', error.message);
    }
  }
  
  const fallback = loadJsonFallback(`/data/${lang}/${code}/analysts/${analystId}.json`);
  res.json(fallback || null);
});

router.get('/countries/:code/analysts/:analystId/:analysisId', async (req, res) => {
  const { code, analystId, analysisId } = req.params;
  const lang = req.query.lang || 'es';
  
  if (await isDbConnected()) {
    try {
      const [countries] = await pool.query(
        'SELECT id FROM countries WHERE code = ? AND lang = ?',
        [code, lang]
      );
      
      if (countries.length > 0) {
        const [analysts] = await pool.query(
          'SELECT id FROM analysts WHERE country_id = ? AND analyst_id = ?',
          [countries[0].id, analystId]
        );
        
        if (analysts.length > 0) {
          const [analyses] = await pool.query(
            'SELECT analysis_id as id, title, summary, date, paragraphs, content_blocks, media FROM analyses WHERE analyst_id = ? AND analysis_id = ?',
            [analysts[0].id, analysisId]
          );
          
          if (analyses.length > 0) {
            const a = analyses[0];
            return res.json({
              id: a.id,
              title: a.title,
              summary: a.summary,
              date: a.date,
              paragraphs: typeof a.paragraphs === 'string' ? JSON.parse(a.paragraphs) : a.paragraphs || [],
              contentBlocks: typeof a.content_blocks === 'string' ? JSON.parse(a.content_blocks) : a.content_blocks || [],
              media: typeof a.media === 'string' ? JSON.parse(a.media) : a.media || []
            });
          }
        }
      }
    } catch (error) {
      console.error('DB error:', error.message);
    }
  }
  
  const fallback = loadJsonFallback(`/data/${lang}/${code}/analysts/${analystId}/${analysisId}.json`);
  res.json(fallback || null);
});

router.get('/velum', async (req, res) => {
  const lang = req.query.lang || 'es';
  
  if (await isDbConnected()) {
    try {
      const [articles] = await pool.query(
        'SELECT article_id as id, title, subtitle, author, author_image as authorImage, cover_image as coverImage, date, abstract, keywords FROM velum_articles WHERE lang = ? ORDER BY date DESC',
        [lang]
      );
      return res.json({ 
        items: articles.map(a => ({
          ...a,
          keywords: typeof a.keywords === 'string' ? JSON.parse(a.keywords) : a.keywords || []
        }))
      });
    } catch (error) {
      console.error('DB error:', error.message);
    }
  }
  
  const fallback = loadJsonFallback(`/data/${lang}/velum/velum.index.json`);
  res.json(fallback || { items: [] });
});

router.get('/velum/:articleId', async (req, res) => {
  const { articleId } = req.params;
  const lang = req.query.lang || 'es';
  
  if (await isDbConnected()) {
    try {
      const [articles] = await pool.query(
        'SELECT * FROM velum_articles WHERE article_id = ? AND lang = ?',
        [articleId, lang]
      );
      
      if (articles.length > 0) {
        const a = articles[0];
        return res.json({
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
      }
    } catch (error) {
      console.error('DB error:', error.message);
    }
  }
  
  const fallback = loadJsonFallback(`/data/${lang}/velum/${articleId}.json`);
  res.json(fallback || null);
});

router.get('/terminology', async (req, res) => {
  const lang = req.query.lang || 'es';
  
  if (await isDbConnected()) {
    try {
      const [terms] = await pool.query(
        'SELECT term_id as id, term, definition, category, related_terms as relatedTerms, sources FROM terminology WHERE lang = ? ORDER BY term',
        [lang]
      );
      return res.json({ 
        items: terms.map(t => ({
          ...t,
          relatedTerms: typeof t.relatedTerms === 'string' ? JSON.parse(t.relatedTerms) : t.relatedTerms || [],
          sources: typeof t.sources === 'string' ? JSON.parse(t.sources) : t.sources || []
        }))
      });
    } catch (error) {
      console.error('DB error:', error.message);
    }
  }
  
  const fallback = loadJsonFallback(`/data/${lang}/terminology.json`);
  res.json(fallback || { items: [] });
});

router.get('/terminology/index', async (req, res) => {
  const lang = req.query.lang || 'es';
  
  const categoryMapping = {
    'personaje': 'personajes',
    'organizacion': 'organizaciones',
    'concepto': 'conceptos',
    'general': 'general',
    'lugar': 'lugares',
    'evento': 'eventos'
  };
  
  if (await isDbConnected()) {
    try {
      const [terms] = await pool.query(
        'SELECT term, category FROM terminology WHERE lang = ? ORDER BY term',
        [lang]
      );
      
      const categoriesMap = {};
      terms.forEach(t => {
        const catId = categoryMapping[t.category] || t.category;
        if (!categoriesMap[catId]) {
          categoriesMap[catId] = new Set();
        }
        const firstLetter = t.term.charAt(0).toLowerCase();
        if (/[a-z]/.test(firstLetter)) {
          categoriesMap[catId].add(firstLetter);
        }
      });
      
      const categories = Object.keys(categoriesMap).map(id => ({
        id,
        letters: Array.from(categoriesMap[id]).sort()
      }));
      
      return res.json({ categories });
    } catch (error) {
      console.error('DB error:', error.message);
    }
  }
  
  const fallback = loadJsonFallback(`/data/${lang}/terminology.index.json`);
  res.json(fallback || { categories: [] });
});

router.get('/terminology/category/:category/:letter', async (req, res) => {
  const { category, letter } = req.params;
  const lang = req.query.lang || 'es';
  
  const categoryMapping = {
    'personajes': 'personaje',
    'organizaciones': 'organizacion',
    'conceptos': 'concepto',
    'general': 'general',
    'lugares': 'lugar',
    'eventos': 'evento'
  };
  
  const dbCategory = categoryMapping[category] || category;
  
  if (await isDbConnected()) {
    try {
      const [terms] = await pool.query(
        'SELECT term_id as id, term as name, term as title, definition as content, category, related_terms as relatedTerms, sources FROM terminology WHERE lang = ? AND category = ? AND LOWER(LEFT(term, 1)) = ? ORDER BY term',
        [lang, dbCategory, letter.toLowerCase()]
      );
      
      return res.json({ 
        items: terms.map(t => ({
          ...t,
          relatedTerms: typeof t.relatedTerms === 'string' ? JSON.parse(t.relatedTerms) : t.relatedTerms || [],
          sources: typeof t.sources === 'string' ? JSON.parse(t.sources) : t.sources || []
        }))
      });
    } catch (error) {
      console.error('DB error:', error.message);
    }
  }
  
  const fallback = loadJsonFallback(`/data/${lang}/terminology/${category}/${letter.toLowerCase()}.json`);
  res.json(fallback || { items: [] });
});

router.get('/terminology/:termId', async (req, res) => {
  const { termId } = req.params;
  const lang = req.query.lang || 'es';
  
  if (await isDbConnected()) {
    try {
      const [terms] = await pool.query(
        'SELECT term_id as id, term, definition, category, related_terms as relatedTerms, sources FROM terminology WHERE term_id = ? AND lang = ?',
        [termId, lang]
      );
      
      if (terms.length > 0) {
        const t = terms[0];
        return res.json({
          id: t.id,
          term: t.term,
          definition: t.definition,
          category: t.category,
          relatedTerms: typeof t.relatedTerms === 'string' ? JSON.parse(t.relatedTerms) : t.relatedTerms || [],
          sources: typeof t.sources === 'string' ? JSON.parse(t.sources) : t.sources || []
        });
      }
    } catch (error) {
      console.error('DB error:', error.message);
    }
  }
  
  res.json(null);
});

module.exports = router;
