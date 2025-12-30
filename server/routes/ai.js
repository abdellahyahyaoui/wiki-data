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
  "/history/:countryCode",
  authenticateToken,
  async (req, res) => {
    try {
      const { countryCode } = req.params;
      await pool.query(
        'DELETE FROM ai_raw_data WHERE country_code = ? AND status = "pending"',
        [countryCode]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
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

    const prompt = `
      Actúa como un TRADUCTOR Y ANALISTA HISTÓRICO ULTRA-FIEL. 
      Tu misión es procesar este texto sobre el conflicto en ${countryCode}.
      
      REGLAS DE ORO:
      1. NO INVENTES NADA. Si el texto no dice algo, no lo pongas.
      2. TRADUCCIÓN FIEL: Traduce todo al español de forma profesional y seria.
      3. LIMPIEZA TOTAL: Elimina emoticonos, signos de puntuación extraños, caracteres de control o ruido visual.
      4. EXTRACCIÓN DE DATOS: Si dentro del texto hay:
         - Eventos con fecha -> Ponlos en la sección CRONOLOGÍA.
         - Testimonios o nombres -> Ponlos en la sección TESTIMONIOS.
         - Acciones de resistencia -> Ponlos en la sección RESISTENCIA.
      5. FORMATO DE SALIDA: No uses JSON. Devuelve un texto plano estructurado así:

      === TÍTULO SUGERIDO ===
      (Un título corto y descriptivo)

      === DESCRIPCIÓN PRINCIPAL ===
      (El texto principal traducido y limpio)

      === CRONOLOGÍA ===
      (Lista de eventos encontrados: Fecha - Título - Resumen)

      === TESTIMONIOS / RESISTENCIA ===
      (Nombres y lo que dicen o hacen)

      TEXTO DE ENTRADA (ÁRABE/OTROS):
      ${fullText}
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Eres un traductor experto que devuelve texto plano estructurado, no JSON.",
        },
        { role: "user", content: prompt },
      ],
    });

    const processedResult = completion.choices[0].message.content;
    await pool.query(
      'UPDATE ai_raw_data SET status = "processed" WHERE country_code = ?',
      [countryCode],
    );
    res.json({ result: processedResult });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
