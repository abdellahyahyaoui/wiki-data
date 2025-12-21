const mysql = require('mysql2/promise');

async function analyze() {
  try {
    const pool = mysql.createPool({
      host: 'sldk595.piensasolutions.com',
      user: 'qapb973',
      password: 'X@3991491wadam',
      database: 'qapb973',
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0
    });

    const conn = await pool.getConnection();
    
    console.log('=== HOW BACKEND STRUCTURES TESTIMONY RESPONSE ===\n');
    
    const [witnesses] = await conn.query('SELECT id, witness_id, name FROM witnesses LIMIT 1');
    const witnessDbId = witnesses[0].id;
    const witnessApiId = witnesses[0].witness_id;
    
    console.log(`Witness DB ID: ${witnessDbId}`);
    console.log(`Witness API ID (witness_id): ${witnessApiId}`);
    
    const [testimonies] = await conn.query('SELECT testimony_id, title FROM testimonies WHERE witness_id = ?', [witnessDbId]);
    
    console.log(`\nTestimonies for witness (witness_id in DB = ${witnessDbId}):`);
    testimonies.forEach(t => {
      console.log(`  - testimony_id: "${t.testimony_id}", title: "${t.title}"`);
    });
    
    console.log('\n=== WHAT THE BACKEND RETURNS IN GET /testimonies/:witnessId ===');
    console.log('Backend code line 345-366:');
    console.log(`
    GET /countries/:countryCode/testimonies/:witnessId
    
    1. Looks up witness with witness_id = ":witnessId" (string like "omar-testimonios")
    2. Gets witness.id (numeric) from DB
    3. Gets testimonies with witness_id = numeric id
    4. Returns testimonies in this format:
       {
         ...witness_data,
         testimonies: [{
           ...t (all fields from DB),
           paragraphs: parsed JSON,
           contentBlocks: parsed JSON,
           media: parsed JSON
         }]
       }
    `);
    
    const [fullTestimony] = await conn.query('SELECT * FROM testimonies WHERE witness_id = ? LIMIT 1', [witnessDbId]);
    if (fullTestimony.length > 0) {
      const t = fullTestimony[0];
      console.log('\nActual testimony object returned:');
      console.log(JSON.stringify({
        id: t.testimony_id,
        title: t.title,
        summary: t.summary,
        date: t.date,
        'paragraphs/contentBlocks/media': '(parsed from JSON)',
        '... plus all other DB fields': t.id // the numeric id
      }, null, 2));
    }

    conn.release();
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

analyze();
