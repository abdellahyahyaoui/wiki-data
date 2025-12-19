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
    console.log('Seeding data...');

    // 1. Get or Create a country
    let [countries] = await connection.query('SELECT id, code FROM countries LIMIT 1');
    if (countries.length === 0) {
      await connection.query('INSERT INTO countries (code, name, lang) VALUES (?, ?, ?)', ['palestine', 'Palestina', 'es']);
      [countries] = await connection.query('SELECT id, code FROM countries LIMIT 1');
    }
    const country = countries[0];
    const countryId = country.id;

    // 2. Seed Witness (Check if ID is numeric)
    const [columns] = await connection.query('SHOW COLUMNS FROM witnesses LIKE "id"');
    const isIdNumeric = columns[0].Type.includes('int');
    const witnessId = isIdNumeric ? 1 : 'w1';

    await connection.query(
      'INSERT INTO witnesses (id, country_id, name, bio, image, social) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)',
      [witnessId, countryId, 'Testigo de Prueba', 'Esta es una biografía de prueba.', 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg', '{}']
    );

    // 3. Seed Testimony
    const testimonyId = isIdNumeric ? 1 : uuidv4();
    await connection.query(
      'INSERT INTO testimonies (id, witness_id, title, summary, date, content_blocks, media) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title)',
      [testimonyId, witnessId, 'Mi Historia', 'Resumen del testimonio', '2025-12-19', JSON.stringify([{type:'text', content:'Contenido de prueba'}]), '[]']
    );

    // 4. Seed Fototeca
    await connection.query(
      'INSERT INTO fototeca (item_id, country_id, title, description, date, type, url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), countryId, 'Imagen de Prueba', 'Descripción', '2025-12-19', 'image', 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg']
    );

    console.log('Seed completed successfully');
    connection.release();
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    process.exit();
  }
}
seed();
