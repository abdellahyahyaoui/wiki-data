const mysql = require('mysql2/promise');
require('dotenv').config();

async function cleanDatabase() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    const connection = await pool.getConnection();

    console.log('🧹 Iniciando limpieza de base de datos...\n');

    // 1. Eliminar registros con URL nula/vacía
    const [nullResult] = await connection.query(
      "SELECT COUNT(*) as count FROM fototeca WHERE url IS NULL OR url = '' OR url = 'null' OR url = 'undefined'"
    );
    if (nullResult[0].count > 0) {
      await connection.query(
        "DELETE FROM fototeca WHERE url IS NULL OR url = '' OR url = 'null' OR url = 'undefined'"
      );
      console.log(`✅ Eliminados ${nullResult[0].count} registros con URL vacía`);
    }

    // 2. Encontrar y eliminar duplicados (mantener el más reciente)
    const [duplicates] = await connection.query(`
      SELECT url, COUNT(*) as count 
      FROM fototeca 
      WHERE url IS NOT NULL AND url != '' 
      GROUP BY url 
      HAVING COUNT(*) > 1
    `);

    let duplicateCount = 0;
    for (const dup of duplicates) {
      const [items] = await connection.query(
        "SELECT id FROM fototeca WHERE url = ? ORDER BY created_at DESC LIMIT 1 OFFSET 1",
        [dup.url]
      );
      
      if (items.length > 0) {
        const idsToDelete = items.map(i => i.id);
        await connection.query(
          `DELETE FROM fototeca WHERE url = ? AND id IN (${idsToDelete.map(() => '?').join(',')})`,
          [dup.url, ...idsToDelete]
        );
        duplicateCount += items.length;
      }
    }
    if (duplicateCount > 0) {
      console.log(`✅ Eliminados ${duplicateCount} registros duplicados`);
    }

    // 3. Actualizar URLs de Cloudinary mal formadas
    const [badUrls] = await connection.query(
      "SELECT COUNT(*) as count FROM fototeca WHERE url LIKE '%cloudinary%' AND url NOT LIKE 'https://%'"
    );
    if (badUrls[0].count > 0) {
      await connection.query(`
        UPDATE fototeca 
        SET url = CONCAT('https://', url) 
        WHERE url LIKE '%cloudinary%' AND url NOT LIKE 'https://%'
      `);
      console.log(`✅ Corregidas ${badUrls[0].count} URLs de Cloudinary`);
    }

    // 4. Remover registros sin título y sin descripción (fantasma)
    const [ghostItems] = await connection.query(
      "SELECT COUNT(*) as count FROM fototeca WHERE (title IS NULL OR title = '') AND (description IS NULL OR description = '') AND url IS NOT NULL"
    );
    if (ghostItems[0].count > 0) {
      const maxGhost = Math.min(ghostItems[0].count, 50); // Limitar a 50
      const [itemsToDelete] = await connection.query(
        "SELECT id FROM fototeca WHERE (title IS NULL OR title = '') AND (description IS NULL OR description = '') AND url IS NOT NULL LIMIT ?",
        [maxGhost]
      );
      
      if (itemsToDelete.length > 0) {
        await connection.query(
          `DELETE FROM fototeca WHERE id IN (${itemsToDelete.map(() => '?').join(',')})`,
          itemsToDelete.map(i => i.id)
        );
        console.log(`✅ Eliminados ${itemsToDelete.length} registros fantasma`);
      }
    }

    // Mostrar estadísticas finales
    const [finalStats] = await connection.query(
      "SELECT COUNT(*) as total, COUNT(DISTINCT url) as unique_urls FROM fototeca WHERE url IS NOT NULL"
    );
    console.log(`\n📊 Estadísticas finales:`);
    console.log(`   Total de registros: ${finalStats[0].total}`);
    console.log(`   URLs únicas: ${finalStats[0].unique_urls}`);

    connection.release();
    console.log('\n✨ ¡Limpieza completada!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error en limpieza:', error);
    process.exit(1);
  }
}

cleanDatabase();
