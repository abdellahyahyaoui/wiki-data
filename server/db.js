const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4'
});

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('MySQL connection error:', error.message);
    return false;
  }
}

async function initDatabase() {
  const connection = await pool.getConnection();
  try {
    await connection.query("SET NAMES utf8mb4");
    await connection.query("SET CHARACTER SET utf8mb4");
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS countries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        lang VARCHAR(10) DEFAULT 'es',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS sections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        country_id INT NOT NULL,
        section_id VARCHAR(50) NOT NULL,
        label VARCHAR(255) NOT NULL,
        sort_order INT DEFAULT 0,
        FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
        UNIQUE KEY unique_section (country_id, section_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS descriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        country_id INT NOT NULL,
        title VARCHAR(255),
        chapters JSON,
        FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
        UNIQUE KEY unique_desc (country_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS timeline_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        country_id INT NOT NULL,
        event_id VARCHAR(100) NOT NULL,
        date VARCHAR(50),
        year INT,
        month INT,
        title VARCHAR(255) NOT NULL,
        summary TEXT,
        image VARCHAR(500),
        video VARCHAR(500),
        paragraphs JSON,
        content_blocks JSON,
        sources JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
        UNIQUE KEY unique_event (country_id, event_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS witnesses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        country_id INT NOT NULL,
        witness_id VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        bio TEXT,
        image VARCHAR(500),
        social JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
        UNIQUE KEY unique_witness (country_id, witness_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS testimonies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        witness_id INT NOT NULL,
        testimony_id VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        summary TEXT,
        date VARCHAR(50),
        paragraphs JSON,
        content_blocks JSON,
        media JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (witness_id) REFERENCES witnesses(id) ON DELETE CASCADE,
        UNIQUE KEY unique_testimony (witness_id, testimony_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS resistors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        country_id INT NOT NULL,
        resistor_id VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        bio TEXT,
        image VARCHAR(500),
        social JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
        UNIQUE KEY unique_resistor (country_id, resistor_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS resistance_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        resistor_id INT NOT NULL,
        entry_id VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        summary TEXT,
        date VARCHAR(50),
        paragraphs JSON,
        content_blocks JSON,
        media JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resistor_id) REFERENCES resistors(id) ON DELETE CASCADE,
        UNIQUE KEY unique_entry (resistor_id, entry_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS fototeca (
        id INT AUTO_INCREMENT PRIMARY KEY,
        country_id INT NOT NULL,
        item_id VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        date VARCHAR(50),
        type ENUM('image', 'video') DEFAULT 'image',
        url VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
        UNIQUE KEY unique_item (country_id, item_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS analysts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        country_id INT NOT NULL,
        analyst_id VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        bio TEXT,
        image VARCHAR(500),
        social JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
        UNIQUE KEY unique_analyst (country_id, analyst_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS analyses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        analyst_id INT NOT NULL,
        analysis_id VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        summary TEXT,
        date VARCHAR(50),
        paragraphs JSON,
        content_blocks JSON,
        media JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (analyst_id) REFERENCES analysts(id) ON DELETE CASCADE,
        UNIQUE KEY unique_analysis (analyst_id, analysis_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS velum_articles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        article_id VARCHAR(100) UNIQUE NOT NULL,
        lang VARCHAR(10) DEFAULT 'es',
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(500),
        author VARCHAR(255),
        author_image VARCHAR(500),
        cover_image VARCHAR(500),
        date VARCHAR(50),
        abstract TEXT,
        keywords JSON,
        sections JSON,
        bibliography JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS terminology (
        id INT AUTO_INCREMENT PRIMARY KEY,
        term_id VARCHAR(100) UNIQUE NOT NULL,
        lang VARCHAR(10) DEFAULT 'es',
        term VARCHAR(255) NOT NULL,
        definition TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'general',
        related_terms JSON,
        sources JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS section_headers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        country_id INT NOT NULL,
        section_id VARCHAR(50) NOT NULL,
        title VARCHAR(255),
        description TEXT,
        FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
        UNIQUE KEY unique_header (country_id, section_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS pending_changes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        change_id VARCHAR(100) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL,
        section VARCHAR(50) NOT NULL,
        country_code VARCHAR(50),
        lang VARCHAR(10) DEFAULT 'es',
        item_id VARCHAR(100),
        data JSON,
        user_id VARCHAR(100),
        user_name VARCHAR(255),
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS cms_users (
        id VARCHAR(100) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'editor') DEFAULT 'editor',
        name VARCHAR(255),
        countries JSON,
        permissions JSON,
        must_change_password BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS predefined_countries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name_es VARCHAR(255) NOT NULL,
        name_en VARCHAR(255),
        region VARCHAR(100)
      )
    `);

    const [rows] = await connection.query('SELECT COUNT(*) as count FROM predefined_countries');
    if (rows[0].count === 0) {
      await connection.query(`
        INSERT INTO predefined_countries (code, name_es, name_en, region) VALUES
        ('palestine', 'Palestina', 'Palestine', 'Oriente Medio'),
        ('syria', 'Siria', 'Syria', 'Oriente Medio'),
        ('yemen', 'Yemen', 'Yemen', 'Oriente Medio'),
        ('iraq', 'Irak', 'Iraq', 'Oriente Medio'),
        ('lebanon', 'Líbano', 'Lebanon', 'Oriente Medio'),
        ('libya', 'Libia', 'Libya', 'Norte de África'),
        ('sudan', 'Sudán', 'Sudan', 'Norte de África'),
        ('somalia', 'Somalia', 'Somalia', 'Cuerno de África'),
        ('afghanistan', 'Afganistán', 'Afghanistan', 'Asia Central'),
        ('myanmar', 'Myanmar', 'Myanmar', 'Sudeste Asiático'),
        ('ukraine', 'Ucrania', 'Ukraine', 'Europa del Este'),
        ('congo', 'Congo', 'Congo', 'África Central'),
        ('ethiopia', 'Etiopía', 'Ethiopia', 'Cuerno de África'),
        ('sahara', 'Sáhara Occidental', 'Western Sahara', 'Norte de África'),
        ('morocco', 'Marruecos', 'Morocco', 'Norte de África'),
        ('algeria', 'Argelia', 'Algeria', 'Norte de África'),
        ('tunisia', 'Túnez', 'Tunisia', 'Norte de África'),
        ('egypt', 'Egipto', 'Egypt', 'Norte de África'),
        ('jordan', 'Jordania', 'Jordan', 'Oriente Medio'),
        ('iran', 'Irán', 'Iran', 'Oriente Medio'),
        ('kashmir', 'Cachemira', 'Kashmir', 'Asia del Sur'),
        ('uyghur', 'Uigures (Xinjiang)', 'Uyghur (Xinjiang)', 'Asia Oriental'),
        ('tibet', 'Tíbet', 'Tibet', 'Asia Oriental'),
        ('mali', 'Malí', 'Mali', 'África Occidental'),
        ('nigeria', 'Nigeria', 'Nigeria', 'África Occidental'),
        ('cameroon', 'Camerún', 'Cameroon', 'África Central'),
        ('colombia', 'Colombia', 'Colombia', 'América del Sur'),
        ('mexico', 'México', 'Mexico', 'América del Norte'),
        ('haiti', 'Haití', 'Haiti', 'Caribe'),
        ('venezuela', 'Venezuela', 'Venezuela', 'América del Sur')
      `);
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS ai_raw_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        country_code VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        status ENUM('pending', 'processed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    console.log('Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { pool, testConnection, initDatabase };
