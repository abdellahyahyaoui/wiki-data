require('dotenv').config();
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const connection = await pool.getConnection();
    console.log('Final seeding...');

    const [countries] = await connection.query('SELECT id FROM countries WHERE code = "palestine" LIMIT 1');
    let countryId;
    if (countries.length === 0) {
      const [res] = await connection.query('INSERT INTO countries (code, name, lang) VALUES ("palestine", "Palestina", "es")');
      countryId = res.insertId;
    } else {
      countryId = countries[0].id;
    }

    // Clear old sample to avoid confusion
    await connection.query('DELETE FROM witnesses WHERE country_id = ?', [countryId]);
    await connection.query('DELETE FROM resistors WHERE country_id = ?', [countryId]);
    await connection.query('DELETE FROM timeline_events WHERE country_id = ?', [countryId]);

    // Witnesses
    await connection.query('INSERT INTO witnesses (country_id, witness_id, name, bio, image, social) VALUES (?, ?, "Yara", "Bio...", "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg", "{}")', [countryId, uuidv4()]);
    
    // Timeline
    await connection.query('INSERT INTO timeline_events (country_id, event_id, date, year, month, title, summary, content_blocks, paragraphs, sources) VALUES (?, ?, "1948", 1948, 5, "Nakba", "Exilio...", "[]", "[]", "[]")', [countryId, uuidv4()]);

    // Resistance
    await connection.query('INSERT INTO resistors (country_id, resistor_id, name, bio, image, social) VALUES (?, ?, "Grupo Resistencia", "Lucha...", null, "{}")', [countryId, uuidv4()]);

    console.log('Final seed completed');
    connection.release();
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    process.exit();
  }
}
seed();
