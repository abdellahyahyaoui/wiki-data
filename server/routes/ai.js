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
    switch(section) {
      case 'description':
        sectionInstructions = "Formatea para sección DESCRIPCIÓN: Genera un TÍTULO y el CONTENIDO principal dividido en párrafos limpios.";
        break;
      case 'timeline':
        sectionInstructions = "Formatea para sección CRONOLOGÍA: Extrae FECHA (día/mes/año si existe), TÍTULO del evento y RESUMEN detallado.";
        break;
      case 'testimonies':
        sectionInstructions = "Formatea para sección TESTIMONIOS: Extrae NOMBRE del testigo, su BIO (si existe) y el RELATO/TESTIMONIO completo.";
        break;
      case 'resistance':
        sectionInstructions = "Formatea para sección RESISTENCIA: Extrae NOMBRE del grupo o persona, su BIO y la ACCIÓN o historia de resistencia.";
        break;
      case 'velum':
        sectionInstructions = "Formatea para sección VELUM: Genera un TÍTULO, SUBTÍTULO, RESUMEN y el CUERPO completo del artículo.";
        break;
      default:
        sectionInstructions = "Traduce y limpia el texto de forma general.";
    }

    const prompt = `
      Actúa como un TRADUCTOR Y ANALISTA HISTÓRICO ULTRA-FIEL para el CMS de WikiConflicts. 
      Tu misión es procesar este texto sobre ${countryCode} para la sección específica: ${section.toUpperCase()}.
      
      REGLAS DE ORO INNEGOCIABLES:
      1. FIDELIDAD ABSOLUTA: No inventes nada. No suavices nada. No elimines información por ser "cruda" o "grave". Si el texto original relata un hecho violento o político, DEBES mantenerlo exactamente igual en la traducción.
      2. TRADUCCIONES DEL CORÁN: Si el texto contiene versos del Corán, DEBES utilizar obligatoriamente la traducción de la "Universidad del Rey Fahd en Arabia Saudí".
      3. LIMPIEZA TÉCNICA: Elimina emoticonos, basura visual, caracteres de control y signos de puntuación innecesarios.
      4. IDIOMA: Traduce todo al español de forma profesional y seria.
      
      INSTRUCCIONES POR SECCIÓN:
      - ${sectionInstructions}
      
      5. EXTRACCIÓN DE TERMINOLOGÍA: Al final, si detectas nombres de líderes, organizaciones o conceptos clave, lístalos bajo el encabezado === TERMINOLOGÍA === (Término: Definición corta traducida).

      FORMATO DE SALIDA (Para copiar y pegar):
      ${section === 'timeline' ? '=== FECHA ===\n=== TÍTULO ===\n=== RESUMEN ===' : 
        section === 'testimonies' || section === 'resistance' ? '=== NOMBRE ===\n=== BIO ===\n=== CONTENIDO ===' :
        section === 'velum' ? '=== TÍTULO ===\n=== SUBTÍTULO ===\n=== RESUMEN ===\n=== CUERPO ===' :
        '=== TÍTULO ===\n=== CONTENIDO ==='}
      
      === TERMINOLOGÍA ===
      (Si hay términos nuevos)

      TEXTO DE ENTRADA:
      ${fullText}
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Eres un experto en extracción de datos para CMS. Devuelves texto plano estructurado." },
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
