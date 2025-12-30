const express = require("express");
const router = express.Router();
const pool = require("../db").pool;
const { authenticateToken } = require("../middleware/auth");
const OpenAI = require("openai");

const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
let openai = null;
if (apiKey) {
  openai = new OpenAI({ apiKey });
}

async function getCountryId(code) {
  const [rows] = await pool.query(
    "SELECT id FROM countries WHERE code = ? LIMIT 1",
    [code],
  );
  return rows.length > 0 ? rows[0].id : null;
}

// ==================== AI LABORATORY ====================
router.get("/history/:countryCode", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, content, created_at FROM ai_raw_data WHERE country_code = ? AND status = "pending" ORDER BY created_at DESC',
      [req.params.countryCode],
    );
    res.json({ history: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/save", authenticateToken, async (req, res) => {
  try {
    const { countryCode, content } = req.body;
    if (!content) return res.status(400).json({ error: "Contenido vacío" });

    await pool.query(
      'INSERT INTO ai_raw_data (country_code, content, status) VALUES (?, ?, "pending")',
      [countryCode, content],
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete(
  "/history/:countryCode/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { countryCode, id } = req.params;
      await pool.query(
        "DELETE FROM ai_raw_data WHERE country_code = ? AND id = ?",
        [countryCode, id],
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.delete(
  "/history/clear/:countryCode",
  authenticateToken,
  async (req, res) => {
    try {
      await pool.query(
        'DELETE FROM ai_raw_data WHERE country_code = ? AND status = "pending"',
        [req.params.countryCode],
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post("/process/:countryCode", authenticateToken, async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: "OpenAI API key not configured" });
    }
    const { countryCode } = req.params;
    const lang = req.query.lang || "es";

    const [rawRows] = await pool.query(
      'SELECT content FROM ai_raw_data WHERE country_code = ? AND status = "pending"',
      [countryCode],
    );
    if (rawRows.length === 0)
      return res
        .status(400)
        .json({ error: "No hay datos nuevos para procesar" });
    const fullText = rawRows.map((r) => r.content).join("\n\n");

    const [existingTerms] = await pool.query(
      "SELECT term FROM terminology WHERE lang = ?",
      [lang],
    );
    const termList = existingTerms.map((t) => t.term.toLowerCase());

    const prompt = `
      Actúa como un experto historiador y analista de conflictos. 
      Analiza el siguiente contenido sobre el conflicto en ${countryCode}.
      
      REGLAS CRÍTICAS DE CONTENIDO:
      1. PRESERVACIÓN HISTÓRICA: Tu deber es transmitir la información tal cual, sin importar lo dura o cruda que sea. NO puedes quitar, eliminar ni suavizar textos políticos o históricos. La precisión es obligatoria.
      2. TRADUCCIONES DEL CORÁN: Si el texto contiene versos del Corán, DEBES utilizar obligatoriamente la traducción de la "Universidad del Rey Fahd en Arabia Saudí".
      
      OBJETIVOS:
      1. TRADUCCIÓN Y ORGANIZACIÓN TOTAL: Traduce TODA la información al español de forma natural y profesional. No resumas excesivamente, mantén los detalles importantes.
      2. TERMINOLOGÍA: Identifica términos clave (Personajes, Organizaciones, Conceptos). 
         NO INCLUYAS estos términos si ya existen: ${termList.join(", ")}.
      3. CRONOLOGÍA (Timeline): Extrae todos los eventos con fecha, título y descripción detallada en español.
      4. TESTIMONIOS Y RESISTENCIA: Identifica relatos de testigos o acciones de movimientos de resistencia.
      5. SIN DUPLICIDAD: Une la información repetida en una sola entrada coherente.
      
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
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres un asistente que extrae datos históricos estructurados en JSON.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const processedResult = JSON.parse(completion.choices[0].message.content);
    await pool.query(
      'UPDATE ai_raw_data SET status = "processed" WHERE country_code = ?',
      [countryCode],
    );
    res.json(processedResult);
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
