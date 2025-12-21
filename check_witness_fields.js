const mysql = require('mysql2/promise');

async function check() {
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
    
    console.log('=== WITNESS FIELDS ===');
    const [witnesses] = await conn.query('SELECT * FROM witnesses LIMIT 1');
    if (witnesses.length > 0) {
      console.log('Fields:', Object.keys(witnesses[0]));
      console.log('Sample:', JSON.stringify(witnesses[0], null, 2));
    }

    console.log('\n=== RESISTOR FIELDS ===');
    const [resistors] = await conn.query('SELECT * FROM resistors LIMIT 1');
    if (resistors.length > 0) {
      console.log('Fields:', Object.keys(resistors[0]));
      console.log('Sample:', JSON.stringify(resistors[0], null, 2));
    }

    conn.release();
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

check();
