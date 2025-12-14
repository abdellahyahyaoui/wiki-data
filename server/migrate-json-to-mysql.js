const fs = require('fs');
const path = require('path');
const { pool, testConnection, initDatabase } = require('./db');

const dataDir = path.join(__dirname, '../public/data');

function readJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading JSON:', filePath, e.message);
  }
  return null;
}

async function migrateCountry(connection, lang, countryCode) {
  const countryDir = path.join(dataDir, lang, countryCode);
  const metaPath = path.join(countryDir, 'meta.json');
  const meta = readJSON(metaPath);
  
  if (!meta) {
    console.log(`  Skipping ${countryCode} - no meta.json`);
    return;
  }

  console.log(`  Migrating ${countryCode}...`);

  const [existing] = await connection.query(
    'SELECT id FROM countries WHERE code = ? AND lang = ?',
    [countryCode, lang]
  );

  let countryId;
  if (existing.length > 0) {
    countryId = existing[0].id;
    console.log(`    Country exists with id ${countryId}`);
  } else {
    const [result] = await connection.query(
      'INSERT INTO countries (code, name, lang) VALUES (?, ?, ?)',
      [countryCode, meta.name || countryCode, lang]
    );
    countryId = result.insertId;
    console.log(`    Created country with id ${countryId}`);
  }

  if (meta.sections) {
    for (let i = 0; i < meta.sections.length; i++) {
      const section = meta.sections[i];
      await connection.query(
        `INSERT INTO sections (country_id, section_id, label, sort_order) 
         VALUES (?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE label = VALUES(label), sort_order = VALUES(sort_order)`,
        [countryId, section.id, section.label, i]
      );
    }
    console.log(`    Migrated ${meta.sections.length} sections`);
  }

  const descPath = path.join(countryDir, 'description.json');
  const desc = readJSON(descPath);
  if (desc) {
    await connection.query(
      `INSERT INTO descriptions (country_id, title, chapters) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE title = VALUES(title), chapters = VALUES(chapters)`,
      [countryId, desc.title || 'Descripción', JSON.stringify(desc.chapters || [])]
    );
    console.log(`    Migrated description`);
  }

  const timelineIndexPath = path.join(countryDir, 'timeline', 'timeline.index.json');
  const timelineIndex = readJSON(timelineIndexPath);
  if (timelineIndex?.items) {
    for (const item of timelineIndex.items) {
      const detailPath = path.join(countryDir, 'timeline', `${item.id}.json`);
      const detail = readJSON(detailPath) || {};
      
      await connection.query(
        `INSERT INTO timeline_events (country_id, event_id, date, year, month, title, summary, image, video, paragraphs, content_blocks, sources)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title), summary = VALUES(summary)`,
        [countryId, item.id, item.date || '', item.year || null, item.month || null, 
         item.title, item.summary || '', item.image || null, detail.video || null,
         JSON.stringify(detail.paragraphs || []), JSON.stringify(detail.contentBlocks || []), 
         JSON.stringify(detail.sources || [])]
      );
    }
    console.log(`    Migrated ${timelineIndex.items.length} timeline events`);
  }

  const testimoniesIndexPath = path.join(countryDir, 'testimonies', 'testimonies.index.json');
  const testimoniesIndex = readJSON(testimoniesIndexPath);
  if (testimoniesIndex?.items) {
    for (const item of testimoniesIndex.items) {
      const witnessPath = path.join(countryDir, 'testimonies', `${item.id}.json`);
      const witness = readJSON(witnessPath) || {};
      
      const [existingWitness] = await connection.query(
        'SELECT id FROM witnesses WHERE country_id = ? AND witness_id = ?',
        [countryId, item.id]
      );

      let witnessDbId;
      if (existingWitness.length > 0) {
        witnessDbId = existingWitness[0].id;
      } else {
        const [result] = await connection.query(
          'INSERT INTO witnesses (country_id, witness_id, name, bio, image, social) VALUES (?, ?, ?, ?, ?, ?)',
          [countryId, item.id, item.name || witness.name, witness.bio || '', 
           item.image || witness.image || null, JSON.stringify(witness.social || {})]
        );
        witnessDbId = result.insertId;
      }

      if (witness.testimonies) {
        for (const t of witness.testimonies) {
          const testimonyPath = path.join(countryDir, 'testimonies', item.id, `${t.id}.json`);
          const testimonyDetail = readJSON(testimonyPath) || {};
          
          await connection.query(
            `INSERT INTO testimonies (witness_id, testimony_id, title, summary, date, paragraphs, content_blocks, media)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE title = VALUES(title)`,
            [witnessDbId, t.id, t.title, t.summary || '', t.date || '',
             JSON.stringify(testimonyDetail.paragraphs || []), 
             JSON.stringify(testimonyDetail.contentBlocks || []),
             JSON.stringify(t.media || [])]
          );
        }
      }
    }
    console.log(`    Migrated ${testimoniesIndex.items.length} witnesses`);
  }

  const resistanceIndexPath = path.join(countryDir, 'resistance', 'resistance.index.json');
  const resistanceIndex = readJSON(resistanceIndexPath);
  if (resistanceIndex?.items) {
    for (const item of resistanceIndex.items) {
      const resistorPath = path.join(countryDir, 'resistance', `${item.id}.json`);
      const resistor = readJSON(resistorPath) || {};
      
      const [existingResistor] = await connection.query(
        'SELECT id FROM resistors WHERE country_id = ? AND resistor_id = ?',
        [countryId, item.id]
      );

      let resistorDbId;
      if (existingResistor.length > 0) {
        resistorDbId = existingResistor[0].id;
      } else {
        const [result] = await connection.query(
          'INSERT INTO resistors (country_id, resistor_id, name, bio, image, social) VALUES (?, ?, ?, ?, ?, ?)',
          [countryId, item.id, item.name || resistor.name, resistor.bio || '',
           item.image || resistor.image || null, JSON.stringify(resistor.social || {})]
        );
        resistorDbId = result.insertId;
      }

      if (resistor.entries) {
        for (const e of resistor.entries) {
          const entryPath = path.join(countryDir, 'resistance', item.id, `${e.id}.json`);
          const entryDetail = readJSON(entryPath) || {};
          
          await connection.query(
            `INSERT INTO resistance_entries (resistor_id, entry_id, title, summary, date, paragraphs, content_blocks, media)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE title = VALUES(title)`,
            [resistorDbId, e.id, e.title, e.summary || '', e.date || '',
             JSON.stringify(entryDetail.paragraphs || []),
             JSON.stringify(entryDetail.contentBlocks || []),
             JSON.stringify(e.media || [])]
          );
        }
      }
    }
    console.log(`    Migrated ${resistanceIndex.items.length} resistors`);
  }

  const fototecaIndexPath = path.join(countryDir, 'fototeca', 'fototeca.index.json');
  const fototecaIndex = readJSON(fototecaIndexPath);
  if (fototecaIndex?.items) {
    for (const item of fototecaIndex.items) {
      await connection.query(
        `INSERT INTO fototeca (country_id, item_id, title, description, date, type, url)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title)`,
        [countryId, item.id, item.title, item.description || '', item.date || '',
         item.type || 'image', item.url]
      );
    }
    console.log(`    Migrated ${fototecaIndex.items.length} fototeca items`);
  }
}

async function migrate() {
  console.log('Starting migration from JSON to MySQL...\n');
  
  const connected = await testConnection();
  if (!connected) {
    console.error('Could not connect to MySQL');
    process.exit(1);
  }

  await initDatabase();
  
  const connection = await pool.getConnection();
  
  try {
    await connection.query("SET NAMES utf8mb4");
    await connection.query("SET CHARACTER SET utf8mb4");
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    
    const tables = ['countries', 'sections', 'descriptions', 'timeline_events', 'witnesses', 
                    'testimonies', 'resistors', 'resistance_entries', 'fototeca', 'analysts', 
                    'analyses', 'pending_changes', 'cms_users', 'predefined_countries'];
    
    console.log('Converting tables to utf8mb4...');
    for (const table of tables) {
      try {
        await connection.query(`ALTER TABLE ${table} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`  Converted ${table} to utf8mb4`);
      } catch (e) {
        console.log(`  Table ${table} not found or already converted`);
      }
    }
    
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    
    const langs = fs.readdirSync(dataDir).filter(f => {
      const stat = fs.statSync(path.join(dataDir, f));
      return stat.isDirectory();
    });

    for (const lang of langs) {
      console.log(`\nProcessing language: ${lang}`);
      const langDir = path.join(dataDir, lang);
      
      const countries = fs.readdirSync(langDir).filter(f => {
        const stat = fs.statSync(path.join(langDir, f));
        return stat.isDirectory() && f !== 'terminology' && f !== 'velum';
      });

      for (const countryCode of countries) {
        await migrateCountry(connection, lang, countryCode);
      }
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

migrate();
