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
    const { section } = req.body; // Recibimos la sección seleccionada

    const [rawRows] = await pool.query(
      'SELECT content FROM ai_raw_data WHERE country_code = ? AND status = "pending"',
      [countryCode],
    );
    if (rawRows.length === 0)
      return res
        .status(400)
        .json({ error: "No hay datos nuevos para procesar" });
    const fullText = rawRows.map((r) => r.content).join("\n\n");

    let sectionInstructions = "";
    let formatFields = "";
    switch(section) {
      case 'description':
        sectionInstructions = "Formatea para sección DESCRIPCIÓN: Genera un TÍTULO y el CONTENIDO principal dividido en párrafos limpios.";
        formatFields = '{ "titulo": "...", "contenido": "..." }';
        break;
      case 'timeline':
        sectionInstructions = "Formatea para sección CRONOLOGÍA: Extrae FECHA (día/mes/año si existe), TÍTULO del evento y RESUMEN detallado.";
        formatFields = '{ "fecha": "...", "titulo": "...", "resumen": "..." }';
        break;
      case 'testimonies':
      case 'resistance':
        sectionInstructions = `Formatea para sección ${section.toUpperCase()}: Extrae NOMBRE del protagonista, su BIO (si existe) y el CONTENIDO principal.`;
        formatFields = '{ "nombre": "...", "bio": "...", "contenido": "..." }';
        break;
      case 'velum':
        sectionInstructions = "Formatea para sección VELUM: Genera un TÍTULO, SUBTÍTULO, RESUMEN y el CUERPO completo del artículo.";
        formatFields = '{ "titulo": "...", "subtitulo": "...", "resumen": "...", "cuerpo": "..." }';
        break;
      case 'terminology':
        sectionInstructions = "Formatea para sección TERMINOLOGÍA: Extrae todos los conceptos, personajes y organizaciones clave con sus definiciones.";
        formatFields = '{ "terminos": [ { "termino": "...", "definicion": "..." } ] }';
        break;
      default:
        sectionInstructions = "Traduce y limpia el texto de forma general.";
        formatFields = '{ "titulo": "...", "contenido": "..." }';
    }

    const prompt = `
      Actúa como un TRADUCTOR Y ANALISTA para el CMS de WikiConflicts.
      Tu misión es procesar este texto sobre ${countryCode} para la sección específica: ${section.toUpperCase()}.

      REGLAS DE ORO:
      1. FIDELIDAD ABSOLUTA: No inventes nada. No suavices nada. Mantén la crudeza histórica.
      2. TRADUCCIONES DEL CORÁN: Usa la traducción de la "Universidad del Rey Fahd en Arabia Saudí".
      3. LIMPIEZA: Elimina emoticonos y basura visual.
      
      FORMATO DE RESPUESTA (JSON OBLIGATORIO):
      Debes responder ÚNICAMENTE con un objeto JSON que contenga EXACTAMENTE estas llaves:
      
      Estructura para esta sección: ${formatFields}
      
      Y SIEMPRE incluye esta llave adicional:
      "terminologia": [ { "termino": "...", "definicion": "..." } ]

      IMPORTANTE: No añadas llaves adicionales. Solo las especificadas.

      TEXTO DE ENTRADA:
      ${fullText}
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Eres un experto en extracción de datos que responde EXCLUSIVAMENTE en JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const processedResult = JSON.parse(completion.choices[0].message.content);
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
