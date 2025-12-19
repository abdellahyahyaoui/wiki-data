require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const mysql = require('mysql2/promise');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const imagenesDir = path.join(__dirname, 'public/imagenes');

async function migrate() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT item_id, url FROM fototeca WHERE url LIKE '/imagenes/%'");
    console.log("Encontradas " + rows.length + " imágenes para migrar.");

    for (const row of rows) {
      const fileName = path.basename(row.url);
      const filePath = path.join(imagenesDir, fileName);

      if (fs.existsSync(filePath)) {
        console.log("Subiendo " + fileName + " a Cloudinary...");
        try {
          const result = await cloudinary.uploader.upload(filePath, {
            folder: 'wikiconflicts',
            resource_type: 'auto'
          });
          
          await connection.query("UPDATE fototeca SET url = ? WHERE item_id = ?", [result.secure_url, row.item_id]);
          console.log("Migrado: " + fileName + " -> " + result.secure_url);
        } catch (uploadError) {
          console.error("Error subiendo " + fileName + ":", uploadError.message);
        }
      } else {
        console.log("Archivo no encontrado localmente: " + fileName);
      }
    }
    connection.release();
    console.log('Migración completada.');
  } catch (error) {
    console.error('Error en migración:', error);
  } finally {
    process.exit();
  }
}

migrate();
