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
    console.log('Seeding data v2...');

    // Get Palestine
    const [countries] = await connection.query('SELECT id FROM countries WHERE code = "palestine" LIMIT 1');
    if (countries.length === 0) {
      await connection.query('INSERT INTO countries (code, name, lang) VALUES ("palestine", "Palestina", "es")');
    }
    const [country] = await connection.query('SELECT id FROM countries WHERE code = "palestine" LIMIT 1');
    const countryId = country.id;

    // Witnesses - check if ID is auto-increment or manual
    await connection.query('INSERT IGNORE INTO witnesses (id, country_id, name, bio, image, social) VALUES (100, ?, "Testigo de Prueba", "Bio de prueba", "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg", "{}")', [countryId]);

    // Testimonies
    await connection.query('INSERT IGNORE INTO testimonies (id, witness_id, title, summary, date, content_blocks, media) VALUES (100, 100, "Mi Historia", "Resumen", "2025-12-19", "[]", "[]")');

    // Fototeca
    await connection.query('INSERT INTO fototeca (item_id, country_id, title, description, date, type, url) VALUES (?, ?, "Foto de Prueba", "Desc", "2025-12-19", "image", "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg")', [uuidv4(), countryId]);
    await connection.query('INSERT INTO fototeca (item_id, country_id, title, description, date, type, url) VALUES (?, ?, "Video YouTube", "Desc", "2025-12-19", "video", "https://youtu.be/hLQl3WQQoQ0")', [uuidv4(), countryId]);

    console.log('Seed v2 completed');
    connection.release();
  } catch (err) {
    console.error('Seed v2 error:', err);
  } finally {
    process.exit();
  }
}
seed();
