const mysql = require('mysql2/promise');

async function check() {
  const pool = mysql.createPool({
    host: 'sldk595.piensasolutions.com',
    user: 'qapb973',
    password: 'X@3991491wadam',
    database: 'qapb973'
  });

  try {
    const conn = await pool.getConnection();
    const [users] = await conn.query('SELECT email, role FROM users LIMIT 5');
    console.log('Users in DB:', users);
    conn.release();
  } catch (e) {
    console.error('Error:', e.message);
  }
  await pool.end();
}

check();
