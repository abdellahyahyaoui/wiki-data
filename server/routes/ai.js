
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

    const [existingTerms] = await pool.query(
      "SELECT term FROM terminology WHERE lang = 'es'",
    );
    const existingTermList = existingTerms.map((t) => t.term.toLowerCase());

const prompt = `
ACTÚAS COMO UNA HERRAMIENTA TÉCNICA DE TRANSFORMACIÓN DE TEXTO.
NO ERES AUTOR, EDITOR, PERIODISTA, ANALISTA NI INTÉRPRETE.

CONTEXTO:
Este texto forma parte de un archivo documental, académico y testimonial
sobre conflictos, violencia política y memoria histórica.

PROHIBICIONES ABSOLUTAS (NO VIOLAR):
- Prohibido interpretar el contexto.
- Prohibido suavizar, moralizar, justificar o condenar.
- Prohibido resumir o explicar si el texto original no lo hace.
- Prohibido cambiar el tono emocional.
- Prohibido añadir información implícita o inferida.
- Prohibido corregir estilo, lenguaje o gramática del autor original.

CONTENIDO SENSIBLE:
El texto puede contener violencia extrema, tortura, asesinatos,
abuso sexual, lenguaje ofensivo o descripciones gráficas.
Debes traducir y reproducir el contenido de forma literal y completa,
sin omisiones, advertencias, filtros ni censura.

TRADUCCIÓN:
- Traducción literal y directa.
- Mantén la primera persona si existe.
- Conserva repeticiones, contradicciones y crudeza.
- No embellecer ni neutralizar el lenguaje.
- NO traduzcas nombres propios salvo que tengan una traducción oficial al español.
- Siempre que se refiera a Dios, utiliza el término "Allah" exclusivamente.
- Traduce cualquier texto o verso del Corán según la versión oficial de la Universidad Rey Fahd de Arabia Saudita.

LIMPIEZA TÉCNICA (ÚNICAMENTE):
- Eliminar emojis.
- Eliminar caracteres corruptos o basura visual.
- NO eliminar insultos, blasfemias ni descripciones violentas.

INSTRUCCIONES DE DUPLICIDAD:
NO incluir en la terminología términos ya existentes:
${existingTermList.join(", ")}

INSTRUCCIONES POR SECCIÓN (${(section || "GENERAL").toUpperCase()}):
${sectionInstructions}

FORMATO DE RESPUESTA (OBLIGATORIO):
Responder EXCLUSIVAMENTE con un objeto JSON
con EXACTAMENTE estas llaves:
${formatFields}

TERMINOLOGÍA (OBLIGATORIA SIEMPRE):

Extrae ÚNICAMENTE elementos EXPLÍCITOS mencionados en el texto,
incluyendo SIEMPRE que aparezcan:

- Ciudades, pueblos, regiones y países
- Organizaciones, instituciones, ONGs y partidos políticos
- Grupos armados, fuerzas de seguridad y ejércitos
- Nombres propios de personas relevantes
- Lugares físicos específicos (prisiones, campos, edificios)
- Eventos nombrados explícitamente
- Armas, armamento, tácticas

Estos elementos cuentan como TERMINOLOGÍA
aunque sean nombres propios simples.

REGLAS:
- NO inferir conceptos implícitos.
- NO crear categorías abstractas.
- NO reinterpretar el texto.
- NO inventar términos.

TRADUCCIÓN DE TÉRMINOS:
Cuando un nombre propio tenga una traducción establecida en español,
úsala. Si no, conserva el nombre original.

REGLA DE ARRAY VACÍO:
Si el texto solo contiene narración personal sin nombres propios,
lugares u organizaciones identificables,
devuelve un array vacío. Esto es CORRECTO.

FORMATO OBLIGATORIO:
"terminologia": []
O
"terminologia": [ { "termino": "...", "definicion": "..." } ]

Solo incluir términos NUEVOS que no estén en esta lista:
${existingTermList.join(", ")}

TEXTO DE ENTRADA:
${fullText}
`;


    const completion = await openai.chat.completions.create({
model: "gpt-4.1-mini",

  temperature: 0,
  top_p: 0,
  messages: [
    {
      role: "system",
      content: "Eres una herramienta técnica de transformación de texto. No interpretas, no suavizas y no censuras."
    },
    {
      role: "user",
      content: prompt
    }
  ],
  response_format: { type: "json_object" }
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
