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
      [uuidv4(), change.type, change.section, change.country_code || null, change.lang || 'es', 
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
    const lang = req.query.lang || 'es';
    const [rows] = await pool.query('SELECT * FROM countries WHERE lang = ? ORDER BY name', [lang]);
    res.json({ countries: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/countries', authenticateToken, checkPermission('create'), async (req, res) => {
  try {
    const { code, name, lang } = req.body;
    await pool.query('INSERT INTO countries (code, name, lang) VALUES (?, ?, ?)', [code, name, lang || 'es']);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/predefined-countries', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT code, name_es as name, region FROM predefined_countries ORDER BY name_es');
    res.json({ countries: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

// ==================== AI LABORATORY ====================
router.get('/ai/history/:countryCode', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, content, created_at FROM ai_raw_data WHERE country_code = ? AND status = "pending" ORDER BY created_at DESC',
      [req.params.countryCode]
    );
    res.json({ history: rows });
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
  apiKey: process.env.OPENAI_API_KEY,
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
      1. TRADUCCIÓN Y ORGANIZACIÓN TOTAL: Traduce TODA la información al español de forma natural y profesional. No resumas excesivamente, mantén los detalles importantes.
      2. TERMINOLOGÍA: Identifica términos clave (Personajes, Organizaciones, Conceptos). 
         NO INCLUYAS estos términos si ya existen: ${termList.join(', ')}.
      3. CRONOLOGÍA (Timeline): Extrae todos los eventos con fecha, título y descripción detallada en español.
      4. TESTIMONIOS Y RESISTENCIA: Identifica relatos de testigos o acciones de movimientos de resistencia.
         Crea perfiles completos (Nombre, Bio, Relato/Acción) traducidos al español.
      5. SIN DUPLICIDAD: Si la información se repite en los textos de entrada, únala en una sola entrada coherente y bien redactada.
      
      Responde EXCLUSIVAMENTE en formato JSON con la siguiente estructura:
      {
        "terminology": [{"term": "...", "definition": "...", "category": "..."}],
        "timeline": [{"date": "...", "title": "...", "summary": "..."}],
        "testimonies": [{"name": "...", "bio": "...", "testimony": "..."}],
        "resistance": [{"name": "...", "bio": "...", "action": "..."}],
        "description": "..."
      }

      TEXTO DE ENTRADA (Puede estar en inglés u otros idiomas):
      ${fullText}
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
