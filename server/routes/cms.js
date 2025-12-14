const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, checkCountryPermission, checkPermission } = require('../middleware/auth');

const router = express.Router();
const dataDir = path.join(__dirname, '../../public/data');
const pendingFile = path.join(__dirname, '../data/pending-changes.json');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading JSON:', filePath, e);
  }
  return null;
}

function writeJSON(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getPendingChanges() {
  return readJSON(pendingFile) || { changes: [] };
}

function savePendingChange(change) {
  const data = getPendingChanges();
  data.changes.push({
    id: uuidv4(),
    ...change,
    createdAt: new Date().toISOString(),
    status: 'pending'
  });
  writeJSON(pendingFile, data);
}

router.get('/countries', authenticateToken, (req, res) => {
  const lang = req.query.lang || 'es';
  const langDir = path.join(dataDir, lang);
  
  if (!fs.existsSync(langDir)) {
    return res.json({ countries: [] });
  }

  const countries = [];
  const entries = fs.readdirSync(langDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== 'terminology') {
      const metaPath = path.join(langDir, entry.name, 'meta.json');
      const meta = readJSON(metaPath) || { name: entry.name };
      countries.push({
        code: entry.name,
        name: meta.name || entry.name,
        sections: meta.sections || []
      });
    }
  }

  res.json({ countries });
});

router.post('/countries', authenticateToken, checkPermission('create'), (req, res) => {
  const { code, name, lang = 'es' } = req.body;

  if (!code || !name) {
    return res.status(400).json({ error: 'Código y nombre son requeridos' });
  }

  const countryDir = path.join(dataDir, lang, code);
  
  if (fs.existsSync(countryDir)) {
    return res.status(400).json({ error: 'El país ya existe' });
  }

  ensureDir(countryDir);
  ensureDir(path.join(countryDir, 'timeline'));
  ensureDir(path.join(countryDir, 'testimonies'));
  ensureDir(path.join(countryDir, 'analysts'));
  ensureDir(path.join(countryDir, 'media', 'images'));
  ensureDir(path.join(countryDir, 'resistance'));

  const meta = {
    name,
    sections: [
      { id: 'description', label: 'Descripción del conflicto' },
      { id: 'timeline', label: 'Timeline' },
      { id: 'testimonies', label: 'Testimonios' },
      { id: 'resistance', label: 'Resistencia' },
      { id: 'media-gallery', label: 'Fototeca' }
    ]
  };

  writeJSON(path.join(countryDir, 'meta.json'), meta);
  writeJSON(path.join(countryDir, 'description.json'), { chapters: [] });
  writeJSON(path.join(countryDir, 'timeline', 'timeline.index.json'), { items: [] });
  writeJSON(path.join(countryDir, 'testimonies', 'testimonies.index.json'), { items: [] });
  writeJSON(path.join(countryDir, 'analysts', 'analysts.index.json'), { items: [] });
  writeJSON(path.join(countryDir, 'resistance', 'resistance.index.json'), { items: [] });
  writeJSON(path.join(countryDir, 'media', 'images.json'), { images: [] });
  writeJSON(path.join(countryDir, 'media', 'videos.json'), { videos: [] });

  res.json({ success: true, country: { code, name } });
});

router.get('/countries/:countryCode/description', authenticateToken, (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';
  const descPath = path.join(dataDir, lang, countryCode, 'description.json');
  
  const data = readJSON(descPath) || { title: 'Descripción del Conflicto', chapters: [] };
  res.json(data);
});

router.put('/countries/:countryCode/description', authenticateToken, checkCountryPermission, checkPermission('edit'), (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';
  const { title, chapters } = req.body;

  const descPath = path.join(dataDir, lang, countryCode, 'description.json');

  if (req.requiresApproval) {
    savePendingChange({
      type: 'edit',
      section: 'description',
      countryCode,
      lang,
      data: { title, chapters },
      userId: req.user.id,
      userName: req.user.name
    });
    return res.json({ success: true, pending: true, message: 'Cambio enviado para aprobación' });
  }

  const descData = {
    title: title || 'Descripción del Conflicto',
    chapters: chapters || []
  };
  writeJSON(descPath, descData);

  res.json({ success: true, data: descData });
});

router.get('/countries/:countryCode/timeline', authenticateToken, (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';
  const indexPath = path.join(dataDir, lang, countryCode, 'timeline', 'timeline.index.json');
  
  const data = readJSON(indexPath) || { items: [] };
  res.json(data);
});

router.get('/countries/:countryCode/timeline/:itemId', authenticateToken, (req, res) => {
  const { countryCode, itemId } = req.params;
  const lang = req.query.lang || 'es';
  const detailPath = path.join(dataDir, lang, countryCode, 'timeline', `${itemId}.json`);
  
  const data = readJSON(detailPath);
  if (!data) {
    return res.status(404).json({ error: 'Evento no encontrado' });
  }
  res.json(data);
});

router.post('/countries/:countryCode/timeline', authenticateToken, checkCountryPermission, checkPermission('create'), (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';
  const { id, date, year, month, title, summary, image, video, paragraphs, contentBlocks, sources } = req.body;

  if (!id || !title || !date) {
    return res.status(400).json({ error: 'ID, título y fecha son requeridos' });
  }

  const timelineDir = path.join(dataDir, lang, countryCode, 'timeline');
  ensureDir(timelineDir);

  const indexPath = path.join(timelineDir, 'timeline.index.json');
  const indexData = readJSON(indexPath) || { items: [] };

  const newItem = { id, date, year: year || null, month: month || null, title, summary: summary || '', image: image || null };
  
  if (req.requiresApproval) {
    savePendingChange({
      type: 'create',
      section: 'timeline',
      countryCode,
      lang,
      data: { ...newItem, video, paragraphs, contentBlocks, sources },
      userId: req.user.id,
      userName: req.user.name
    });
    return res.json({ success: true, pending: true, message: 'Cambio enviado para aprobación' });
  }

  indexData.items.push(newItem);
  writeJSON(indexPath, indexData);

  const detailData = {
    id,
    date,
    year: year || null,
    month: month || null,
    title,
    image: image || null,
    video: video || null,
    paragraphs: paragraphs || [],
    contentBlocks: contentBlocks || [],
    sources: sources || []
  };
  writeJSON(path.join(timelineDir, `${id}.json`), detailData);

  res.json({ success: true, item: newItem });
});

router.put('/countries/:countryCode/timeline/:itemId', authenticateToken, checkCountryPermission, checkPermission('edit'), (req, res) => {
  const { countryCode, itemId } = req.params;
  const lang = req.query.lang || 'es';
  const updates = req.body;

  const timelineDir = path.join(dataDir, lang, countryCode, 'timeline');
  const indexPath = path.join(timelineDir, 'timeline.index.json');
  const detailPath = path.join(timelineDir, `${itemId}.json`);

  const indexData = readJSON(indexPath);
  if (!indexData) {
    return res.status(404).json({ error: 'Timeline no encontrado' });
  }

  const itemIndex = indexData.items.findIndex(i => i.id === itemId);
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Evento no encontrado' });
  }

  if (req.requiresApproval) {
    savePendingChange({
      type: 'edit',
      section: 'timeline',
      countryCode,
      lang,
      itemId,
      data: updates,
      userId: req.user.id,
      userName: req.user.name
    });
    return res.json({ success: true, pending: true, message: 'Cambio enviado para aprobación' });
  }

  Object.assign(indexData.items[itemIndex], {
    date: updates.date,
    year: updates.year,
    month: updates.month,
    title: updates.title,
    summary: updates.summary,
    image: updates.image
  });
  writeJSON(indexPath, indexData);

  const detailData = readJSON(detailPath) || {};
  Object.assign(detailData, updates);
  writeJSON(detailPath, detailData);

  res.json({ success: true, item: indexData.items[itemIndex] });
});

router.delete('/countries/:countryCode/timeline/:itemId', authenticateToken, checkCountryPermission, checkPermission('delete'), (req, res) => {
  const { countryCode, itemId } = req.params;
  const lang = req.query.lang || 'es';

  const timelineDir = path.join(dataDir, lang, countryCode, 'timeline');
  const indexPath = path.join(timelineDir, 'timeline.index.json');
  const detailPath = path.join(timelineDir, `${itemId}.json`);

  if (req.requiresApproval) {
    savePendingChange({
      type: 'delete',
      section: 'timeline',
      countryCode,
      lang,
      itemId,
      userId: req.user.id,
      userName: req.user.name
    });
    return res.json({ success: true, pending: true, message: 'Eliminación enviada para aprobación' });
  }

  const indexData = readJSON(indexPath);
  if (indexData) {
    indexData.items = indexData.items.filter(i => i.id !== itemId);
    writeJSON(indexPath, indexData);
  }

  if (fs.existsSync(detailPath)) {
    fs.unlinkSync(detailPath);
  }

  res.json({ success: true });
});

router.get('/countries/:countryCode/testimonies', authenticateToken, (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';
  const indexPath = path.join(dataDir, lang, countryCode, 'testimonies', 'testimonies.index.json');
  
  const data = readJSON(indexPath) || { items: [] };
  res.json(data);
});

router.post('/countries/:countryCode/testimonies', authenticateToken, checkCountryPermission, checkPermission('create'), (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';
  const { id, name, image, bio, social } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: 'ID y nombre son requeridos' });
  }

  const testimoniesDir = path.join(dataDir, lang, countryCode, 'testimonies');
  ensureDir(testimoniesDir);
  ensureDir(path.join(testimoniesDir, id));

  const indexPath = path.join(testimoniesDir, 'testimonies.index.json');
  const indexData = readJSON(indexPath) || { items: [] };

  if (req.requiresApproval) {
    savePendingChange({
      type: 'create',
      section: 'testimonies',
      countryCode,
      lang,
      data: { id, name, image, bio, social },
      userId: req.user.id,
      userName: req.user.name
    });
    return res.json({ success: true, pending: true, message: 'Cambio enviado para aprobación' });
  }

  const newIndexItem = { id, name, image: image || null };
  indexData.items.push(newIndexItem);
  writeJSON(indexPath, indexData);

  const witnessData = {
    id,
    name,
    bio: bio || '',
    image: image || null,
    social: social || {},
    testimonies: []
  };
  writeJSON(path.join(testimoniesDir, `${id}.json`), witnessData);

  res.json({ success: true, item: newIndexItem });
});

router.get('/countries/:countryCode/testimonies/:witnessId', authenticateToken, (req, res) => {
  const { countryCode, witnessId } = req.params;
  const lang = req.query.lang || 'es';
  const witnessPath = path.join(dataDir, lang, countryCode, 'testimonies', `${witnessId}.json`);
  
  const data = readJSON(witnessPath);
  if (!data) {
    return res.status(404).json({ error: 'Testigo no encontrado' });
  }
  res.json(data);
});

router.put('/countries/:countryCode/testimonies/:witnessId', authenticateToken, checkCountryPermission, checkPermission('edit'), (req, res) => {
  const { countryCode, witnessId } = req.params;
  const lang = req.query.lang || 'es';
  const updates = req.body;

  const testimoniesDir = path.join(dataDir, lang, countryCode, 'testimonies');
  const indexPath = path.join(testimoniesDir, 'testimonies.index.json');
  const witnessPath = path.join(testimoniesDir, `${witnessId}.json`);

  if (req.requiresApproval) {
    savePendingChange({
      type: 'edit',
      section: 'testimonies',
      countryCode,
      lang,
      itemId: witnessId,
      data: updates,
      userId: req.user.id,
      userName: req.user.name
    });
    return res.json({ success: true, pending: true, message: 'Cambio enviado para aprobación' });
  }

  const indexData = readJSON(indexPath);
  if (indexData) {
    const itemIndex = indexData.items.findIndex(i => i.id === witnessId);
    if (itemIndex !== -1) {
      if (updates.name) indexData.items[itemIndex].name = updates.name;
      if (updates.image) indexData.items[itemIndex].image = updates.image;
      writeJSON(indexPath, indexData);
    }
  }

  const witnessData = readJSON(witnessPath) || { id: witnessId };
  Object.assign(witnessData, updates);
  writeJSON(witnessPath, witnessData);

  res.json({ success: true, item: witnessData });
});

router.post('/countries/:countryCode/testimonies/:witnessId/testimony', authenticateToken, checkCountryPermission, checkPermission('create'), (req, res) => {
  const { countryCode, witnessId } = req.params;
  const lang = req.query.lang || 'es';
  const { id, title, summary, date, paragraphs, contentBlocks, media } = req.body;

  if (!id || !title) {
    return res.status(400).json({ error: 'ID y título son requeridos' });
  }

  const testimoniesDir = path.join(dataDir, lang, countryCode, 'testimonies');
  const witnessPath = path.join(testimoniesDir, `${witnessId}.json`);
  const witnessDir = path.join(testimoniesDir, witnessId);
  ensureDir(witnessDir);

  if (req.requiresApproval) {
    savePendingChange({
      type: 'create',
      section: 'testimony',
      countryCode,
      lang,
      witnessId,
      data: { id, title, summary, date, paragraphs, contentBlocks, media },
      userId: req.user.id,
      userName: req.user.name
    });
    return res.json({ success: true, pending: true, message: 'Cambio enviado para aprobación' });
  }

  const witnessData = readJSON(witnessPath);
  if (!witnessData) {
    return res.status(404).json({ error: 'Testigo no encontrado' });
  }

  const newTestimonyRef = { id, title, summary: summary || '', date: date || '', media: media || [] };
  witnessData.testimonies = witnessData.testimonies || [];
  witnessData.testimonies.push(newTestimonyRef);
  writeJSON(witnessPath, witnessData);

  const testimonyData = {
    id,
    title,
    paragraphs: paragraphs || [],
    contentBlocks: contentBlocks || [],
    media: media || []
  };
  writeJSON(path.join(witnessDir, `${id}.json`), testimonyData);

  res.json({ success: true, item: newTestimonyRef });
});

router.get('/countries/:countryCode/testimonies/:witnessId/testimony/:testimonyId', authenticateToken, (req, res) => {
  const { countryCode, witnessId, testimonyId } = req.params;
  const lang = req.query.lang || 'es';
  const testimonyPath = path.join(dataDir, lang, countryCode, 'testimonies', witnessId, `${testimonyId}.json`);
  
  const data = readJSON(testimonyPath);
  if (!data) {
    return res.status(404).json({ error: 'Testimonio no encontrado' });
  }
  res.json(data);
});

router.put('/countries/:countryCode/testimonies/:witnessId/testimony/:testimonyId', authenticateToken, checkCountryPermission, checkPermission('edit'), (req, res) => {
  const { countryCode, witnessId, testimonyId } = req.params;
  const lang = req.query.lang || 'es';
  const { title, summary, date, paragraphs, contentBlocks, media } = req.body;

  const testimoniesDir = path.join(dataDir, lang, countryCode, 'testimonies');
  const witnessPath = path.join(testimoniesDir, `${witnessId}.json`);
  const witnessDir = path.join(testimoniesDir, witnessId);
  const testimonyPath = path.join(witnessDir, `${testimonyId}.json`);

  if (req.requiresApproval) {
    savePendingChange({
      type: 'edit',
      section: 'testimony',
      countryCode,
      lang,
      witnessId,
      testimonyId,
      data: { title, summary, date, paragraphs, contentBlocks, media },
      userId: req.user.id,
      userName: req.user.name
    });
    return res.json({ success: true, pending: true, message: 'Cambio enviado para aprobación' });
  }

  const witnessData = readJSON(witnessPath);
  if (witnessData && witnessData.testimonies) {
    const idx = witnessData.testimonies.findIndex(t => t.id === testimonyId);
    if (idx !== -1) {
      witnessData.testimonies[idx] = {
        ...witnessData.testimonies[idx],
        title: title || witnessData.testimonies[idx].title,
        summary: summary !== undefined ? summary : witnessData.testimonies[idx].summary,
        date: date !== undefined ? date : witnessData.testimonies[idx].date,
        media: media || witnessData.testimonies[idx].media || []
      };
      writeJSON(witnessPath, witnessData);
    }
  }

  const testimonyData = readJSON(testimonyPath) || { id: testimonyId };
  Object.assign(testimonyData, {
    title: title || testimonyData.title,
    paragraphs: paragraphs || testimonyData.paragraphs,
    contentBlocks: contentBlocks || testimonyData.contentBlocks || [],
    media: media || testimonyData.media || []
  });
  writeJSON(testimonyPath, testimonyData);

  res.json({ success: true, item: testimonyData });
});

router.get('/countries/:countryCode/resistance', authenticateToken, (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';
  const indexPath = path.join(dataDir, lang, countryCode, 'resistance', 'resistance.index.json');
  
  const data = readJSON(indexPath) || { items: [] };
  res.json(data);
});

router.post('/countries/:countryCode/resistance', authenticateToken, checkCountryPermission, checkPermission('create'), (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';
  const { id, name, image, bio, social } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: 'ID y nombre son requeridos' });
  }

  const resistanceDir = path.join(dataDir, lang, countryCode, 'resistance');
  ensureDir(resistanceDir);
  ensureDir(path.join(resistanceDir, id));

  const indexPath = path.join(resistanceDir, 'resistance.index.json');
  const indexData = readJSON(indexPath) || { items: [] };

  if (req.requiresApproval) {
    savePendingChange({
      type: 'create',
      section: 'resistance',
      countryCode,
      lang,
      data: { id, name, image, bio, social },
      userId: req.user.id,
      userName: req.user.name
    });
    return res.json({ success: true, pending: true, message: 'Cambio enviado para aprobación' });
  }

  const newIndexItem = { id, name, image: image || null };
  indexData.items.push(newIndexItem);
  writeJSON(indexPath, indexData);

  const resistorData = {
    id,
    name,
    bio: bio || '',
    image: image || null,
    social: social || {},
    entries: []
  };
  writeJSON(path.join(resistanceDir, `${id}.json`), resistorData);

  res.json({ success: true, item: newIndexItem });
});

router.get('/countries/:countryCode/resistance/:resistorId', authenticateToken, (req, res) => {
  const { countryCode, resistorId } = req.params;
  const lang = req.query.lang || 'es';
  const resistorPath = path.join(dataDir, lang, countryCode, 'resistance', `${resistorId}.json`);
  
  const data = readJSON(resistorPath);
  if (!data) {
    return res.status(404).json({ error: 'Entrada no encontrada' });
  }
  res.json(data);
});

router.put('/countries/:countryCode/resistance/:resistorId', authenticateToken, checkCountryPermission, checkPermission('edit'), (req, res) => {
  const { countryCode, resistorId } = req.params;
  const lang = req.query.lang || 'es';
  const updates = req.body;

  const resistanceDir = path.join(dataDir, lang, countryCode, 'resistance');
  const indexPath = path.join(resistanceDir, 'resistance.index.json');
  const resistorPath = path.join(resistanceDir, `${resistorId}.json`);

  if (req.requiresApproval) {
    savePendingChange({
      type: 'edit',
      section: 'resistance',
      countryCode,
      lang,
      itemId: resistorId,
      data: updates,
      userId: req.user.id,
      userName: req.user.name
    });
    return res.json({ success: true, pending: true, message: 'Cambio enviado para aprobación' });
  }

  const indexData = readJSON(indexPath);
  if (indexData) {
    const itemIndex = indexData.items.findIndex(i => i.id === resistorId);
    if (itemIndex !== -1) {
      if (updates.name) indexData.items[itemIndex].name = updates.name;
      if (updates.image) indexData.items[itemIndex].image = updates.image;
      writeJSON(indexPath, indexData);
    }
  }

  const resistorData = readJSON(resistorPath) || { id: resistorId };
  Object.assign(resistorData, updates);
  writeJSON(resistorPath, resistorData);

  res.json({ success: true, item: resistorData });
});

router.post('/countries/:countryCode/resistance/:resistorId/entry', authenticateToken, checkCountryPermission, checkPermission('create'), (req, res) => {
  const { countryCode, resistorId } = req.params;
  const lang = req.query.lang || 'es';
  const { id, title, summary, date, paragraphs, contentBlocks, media } = req.body;

  if (!id || !title) {
    return res.status(400).json({ error: 'ID y título son requeridos' });
  }

  const resistanceDir = path.join(dataDir, lang, countryCode, 'resistance');
  const resistorPath = path.join(resistanceDir, `${resistorId}.json`);
  const resistorFolder = path.join(resistanceDir, resistorId);
  ensureDir(resistorFolder);

  if (req.requiresApproval) {
    savePendingChange({
      type: 'create',
      section: 'resistance-entry',
      countryCode,
      lang,
      resistorId,
      data: { id, title, summary, date, paragraphs, contentBlocks, media },
      userId: req.user.id,
      userName: req.user.name
    });
    return res.json({ success: true, pending: true, message: 'Cambio enviado para aprobación' });
  }

  const resistorData = readJSON(resistorPath);
  if (!resistorData) {
    return res.status(404).json({ error: 'Entrada de resistencia no encontrada' });
  }

  const newEntryRef = { id, title, summary: summary || '', date: date || '', media: media || [] };
  resistorData.entries = resistorData.entries || [];
  resistorData.entries.push(newEntryRef);
  writeJSON(resistorPath, resistorData);

  const entryData = {
    id,
    title,
    paragraphs: paragraphs || [],
    contentBlocks: contentBlocks || [],
    media: media || []
  };
  writeJSON(path.join(resistorFolder, `${id}.json`), entryData);

  res.json({ success: true, item: newEntryRef });
});

router.get('/countries/:countryCode/resistance/:resistorId/entry/:entryId', authenticateToken, (req, res) => {
  const { countryCode, resistorId, entryId } = req.params;
  const lang = req.query.lang || 'es';
  const entryPath = path.join(dataDir, lang, countryCode, 'resistance', resistorId, `${entryId}.json`);
  
  const data = readJSON(entryPath);
  if (!data) {
    return res.status(404).json({ error: 'Entrada no encontrada' });
  }
  res.json(data);
});

router.put('/countries/:countryCode/resistance/:resistorId/entry/:entryId', authenticateToken, checkCountryPermission, checkPermission('edit'), (req, res) => {
  const { countryCode, resistorId, entryId } = req.params;
  const lang = req.query.lang || 'es';
  const { title, summary, date, paragraphs, contentBlocks, media } = req.body;

  const resistanceDir = path.join(dataDir, lang, countryCode, 'resistance');
  const resistorPath = path.join(resistanceDir, `${resistorId}.json`);
  const resistorFolder = path.join(resistanceDir, resistorId);
  const entryPath = path.join(resistorFolder, `${entryId}.json`);

  if (req.requiresApproval) {
    savePendingChange({
      type: 'edit',
      section: 'resistance-entry',
      countryCode,
      lang,
      resistorId,
      entryId,
      data: { title, summary, date, paragraphs, contentBlocks, media },
      userId: req.user.id,
      userName: req.user.name
    });
    return res.json({ success: true, pending: true, message: 'Cambio enviado para aprobación' });
  }

  const resistorData = readJSON(resistorPath);
  if (resistorData && resistorData.entries) {
    const idx = resistorData.entries.findIndex(e => e.id === entryId);
    if (idx !== -1) {
      resistorData.entries[idx] = {
        ...resistorData.entries[idx],
        title: title || resistorData.entries[idx].title,
        summary: summary !== undefined ? summary : resistorData.entries[idx].summary,
        date: date !== undefined ? date : resistorData.entries[idx].date,
        media: media || resistorData.entries[idx].media || []
      };
      writeJSON(resistorPath, resistorData);
    }
  }

  const entryData = readJSON(entryPath) || { id: entryId };
  Object.assign(entryData, {
    title: title || entryData.title,
    paragraphs: paragraphs || entryData.paragraphs,
    contentBlocks: contentBlocks || entryData.contentBlocks || [],
    media: media || entryData.media || []
  });
  writeJSON(entryPath, entryData);

  res.json({ success: true, item: entryData });
});

router.get('/countries/:countryCode/analysts', authenticateToken, (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';
  const indexPath = path.join(dataDir, lang, countryCode, 'analysts', 'analysts.index.json');
  
  const data = readJSON(indexPath) || { items: [] };
  res.json(data);
});

router.post('/countries/:countryCode/analysts', authenticateToken, checkCountryPermission, checkPermission('create'), (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';
  const { id, name, image, bio } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: 'ID y nombre son requeridos' });
  }

  const analystsDir = path.join(dataDir, lang, countryCode, 'analysts');
  ensureDir(analystsDir);
  ensureDir(path.join(analystsDir, id));

  const indexPath = path.join(analystsDir, 'analysts.index.json');
  const indexData = readJSON(indexPath) || { items: [] };

  if (req.requiresApproval) {
    savePendingChange({
      type: 'create',
      section: 'analysts',
      countryCode,
      lang,
      data: { id, name, image, bio },
      userId: req.user.id,
      userName: req.user.name
    });
    return res.json({ success: true, pending: true, message: 'Cambio enviado para aprobación' });
  }

  const newIndexItem = { id, name, image: image || null };
  indexData.items.push(newIndexItem);
  writeJSON(indexPath, indexData);

  const analystData = {
    id,
    name,
    bio: bio || '',
    image: image || null,
    analyses: []
  };
  writeJSON(path.join(analystsDir, `${id}.json`), analystData);

  res.json({ success: true, item: newIndexItem });
});

router.get('/pending', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo el administrador puede ver cambios pendientes' });
  }
  
  const data = getPendingChanges();
  res.json(data);
});

router.post('/pending/:changeId/approve', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo el administrador puede aprobar cambios' });
  }

  const { changeId } = req.params;
  const data = getPendingChanges();
  const changeIndex = data.changes.findIndex(c => c.id === changeId);

  if (changeIndex === -1) {
    return res.status(404).json({ error: 'Cambio no encontrado' });
  }

  const change = data.changes[changeIndex];
  
  data.changes.splice(changeIndex, 1);
  writeJSON(pendingFile, data);

  res.json({ success: true, message: 'Cambio aprobado' });
});

router.post('/pending/:changeId/reject', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo el administrador puede rechazar cambios' });
  }

  const { changeId } = req.params;
  const data = getPendingChanges();
  const changeIndex = data.changes.findIndex(c => c.id === changeId);

  if (changeIndex === -1) {
    return res.status(404).json({ error: 'Cambio no encontrado' });
  }

  data.changes.splice(changeIndex, 1);
  writeJSON(pendingFile, data);

  res.json({ success: true, message: 'Cambio rechazado' });
});

router.get('/countries/:countryCode/fototeca', authenticateToken, (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';
  const indexPath = path.join(dataDir, lang, countryCode, 'fototeca', 'fototeca.index.json');
  
  const data = readJSON(indexPath) || { items: [] };
  res.json(data);
});

router.post('/countries/:countryCode/fototeca', authenticateToken, checkCountryPermission, checkPermission('create'), (req, res) => {
  const { countryCode } = req.params;
  const lang = req.query.lang || 'es';
  const { title, date, description, type, url } = req.body;

  if (!title || !url) {
    return res.status(400).json({ error: 'Título y URL son requeridos' });
  }

  const fototecaDir = path.join(dataDir, lang, countryCode, 'fototeca');
  ensureDir(fototecaDir);

  const indexPath = path.join(fototecaDir, 'fototeca.index.json');
  const indexData = readJSON(indexPath) || { items: [] };

  const id = uuidv4();

  if (req.requiresApproval) {
    savePendingChange({
      type: 'create',
      section: 'fototeca',
      countryCode,
      lang,
      data: { id, title, date, description, type, url },
      userId: req.user.id,
      userName: req.user.name
    });
    return res.json({ success: true, pending: true, message: 'Cambio enviado para aprobación' });
  }

  const newItem = { id, title, date: date || '', description: description || '', type: type || 'image', url };
  indexData.items.push(newItem);
  writeJSON(indexPath, indexData);

  res.json({ success: true, item: newItem });
});

router.put('/countries/:countryCode/fototeca/:itemId', authenticateToken, checkCountryPermission, checkPermission('edit'), (req, res) => {
  const { countryCode, itemId } = req.params;
  const lang = req.query.lang || 'es';
  const { title, date, description, type, url } = req.body;

  const indexPath = path.join(dataDir, lang, countryCode, 'fototeca', 'fototeca.index.json');
  const indexData = readJSON(indexPath);

  if (!indexData) {
    return res.status(404).json({ error: 'Fototeca no encontrada' });
  }

  const itemIndex = indexData.items.findIndex(i => i.id === itemId);
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Elemento no encontrado' });
  }

  if (req.requiresApproval) {
    savePendingChange({
      type: 'edit',
      section: 'fototeca',
      countryCode,
      lang,
      itemId,
      data: { title, date, description, type, url },
      userId: req.user.id,
      userName: req.user.name
    });
    return res.json({ success: true, pending: true, message: 'Cambio enviado para aprobación' });
  }

  indexData.items[itemIndex] = {
    ...indexData.items[itemIndex],
    title: title || indexData.items[itemIndex].title,
    date: date !== undefined ? date : indexData.items[itemIndex].date,
    description: description !== undefined ? description : indexData.items[itemIndex].description,
    type: type || indexData.items[itemIndex].type,
    url: url || indexData.items[itemIndex].url
  };

  writeJSON(indexPath, indexData);
  res.json({ success: true, item: indexData.items[itemIndex] });
});

router.delete('/countries/:countryCode/fototeca/:itemId', authenticateToken, checkCountryPermission, checkPermission('delete'), (req, res) => {
  const { countryCode, itemId } = req.params;
  const lang = req.query.lang || 'es';

  const indexPath = path.join(dataDir, lang, countryCode, 'fototeca', 'fototeca.index.json');
  const indexData = readJSON(indexPath);

  if (!indexData) {
    return res.status(404).json({ error: 'Fototeca no encontrada' });
  }

  const itemIndex = indexData.items.findIndex(i => i.id === itemId);
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Elemento no encontrado' });
  }

  if (req.requiresApproval) {
    savePendingChange({
      type: 'delete',
      section: 'fototeca',
      countryCode,
      lang,
      itemId,
      data: indexData.items[itemIndex],
      userId: req.user.id,
      userName: req.user.name
    });
    return res.json({ success: true, pending: true, message: 'Cambio enviado para aprobación' });
  }

  indexData.items.splice(itemIndex, 1);
  writeJSON(indexPath, indexData);

  res.json({ success: true, message: 'Elemento eliminado' });
});

router.get('/countries/:countryCode/section-headers/:section', authenticateToken, (req, res) => {
  const { countryCode, section } = req.params;
  const lang = req.query.lang || 'es';
  const headersPath = path.join(dataDir, lang, countryCode, 'section-headers.json');
  
  const data = readJSON(headersPath) || {};
  res.json(data[section] || { title: '', description: '' });
});

router.put('/countries/:countryCode/section-headers/:section', authenticateToken, checkCountryPermission, (req, res) => {
  const { countryCode, section } = req.params;
  const lang = req.query.lang || 'es';
  const { title, description } = req.body;

  const headersPath = path.join(dataDir, lang, countryCode, 'section-headers.json');
  const data = readJSON(headersPath) || {};
  
  data[section] = { title, description };
  writeJSON(headersPath, data);

  res.json({ success: true, data: data[section] });
});

router.get('/velum', authenticateToken, (req, res) => {
  const lang = req.query.lang || 'es';
  const indexPath = path.join(dataDir, lang, 'velum', 'velum.index.json');
  
  const data = readJSON(indexPath) || { items: [] };
  res.json(data);
});

router.post('/velum', authenticateToken, checkPermission('create'), (req, res) => {
  const lang = req.query.lang || 'es';
  const { id, title, subtitle, author, authorImage, coverImage, date, abstract, keywords, sections, bibliography } = req.body;

  if (!id || !title) {
    return res.status(400).json({ error: 'ID y título son requeridos' });
  }

  const velumDir = path.join(dataDir, lang, 'velum');
  ensureDir(velumDir);

  const indexPath = path.join(velumDir, 'velum.index.json');
  const indexData = readJSON(indexPath) || { items: [] };

  if (req.requiresApproval) {
    savePendingChange({
      type: 'create',
      section: 'velum',
      lang,
      data: { id, title, subtitle, author, authorImage, coverImage, date, abstract, keywords, sections, bibliography },
      userId: req.user.id,
      userName: req.user.name
    });
    return res.json({ success: true, pending: true, message: 'Cambio enviado para aprobación' });
  }

  const newIndexItem = { 
    id, 
    title,
    subtitle: subtitle || '',
    author: author || '',
    coverImage: coverImage || '',
    date: date || '',
    abstract: abstract || '',
    keywords: keywords || []
  };
  indexData.items.push(newIndexItem);
  writeJSON(indexPath, indexData);

  const articleData = {
    id,
    title,
    subtitle: subtitle || '',
    author: author || '',
    authorImage: authorImage || '',
    coverImage: coverImage || '',
    date: date || '',
    abstract: abstract || '',
    keywords: keywords || [],
    sections: sections || [],
    bibliography: bibliography || []
  };
  writeJSON(path.join(velumDir, `${id}.json`), articleData);

  res.json({ success: true, item: newIndexItem });
});

router.get('/velum/:articleId', authenticateToken, (req, res) => {
  const { articleId } = req.params;
  const lang = req.query.lang || 'es';
  const articlePath = path.join(dataDir, lang, 'velum', `${articleId}.json`);
  
  const data = readJSON(articlePath);
  if (!data) {
    return res.status(404).json({ error: 'Artículo no encontrado' });
  }
  res.json(data);
});

router.put('/velum/:articleId', authenticateToken, checkPermission('edit'), (req, res) => {
  const { articleId } = req.params;
  const lang = req.query.lang || 'es';
  const { title, subtitle, author, authorImage, coverImage, date, abstract, keywords, sections, bibliography } = req.body;

  const velumDir = path.join(dataDir, lang, 'velum');
  const indexPath = path.join(velumDir, 'velum.index.json');
  const articlePath = path.join(velumDir, `${articleId}.json`);

  if (req.requiresApproval) {
    savePendingChange({
      type: 'edit',
      section: 'velum',
      lang,
      articleId,
      data: { title, subtitle, author, authorImage, coverImage, date, abstract, keywords, sections, bibliography },
      userId: req.user.id,
      userName: req.user.name
    });
    return res.json({ success: true, pending: true, message: 'Cambio enviado para aprobación' });
  }

  const indexData = readJSON(indexPath);
  if (indexData) {
    const itemIndex = indexData.items.findIndex(i => i.id === articleId);
    if (itemIndex !== -1) {
      indexData.items[itemIndex] = {
        ...indexData.items[itemIndex],
        title: title || indexData.items[itemIndex].title,
        subtitle: subtitle !== undefined ? subtitle : indexData.items[itemIndex].subtitle,
        author: author !== undefined ? author : indexData.items[itemIndex].author,
        coverImage: coverImage !== undefined ? coverImage : indexData.items[itemIndex].coverImage,
        date: date !== undefined ? date : indexData.items[itemIndex].date,
        abstract: abstract !== undefined ? abstract : indexData.items[itemIndex].abstract,
        keywords: keywords || indexData.items[itemIndex].keywords
      };
      writeJSON(indexPath, indexData);
    }
  }

  const articleData = readJSON(articlePath) || { id: articleId };
  Object.assign(articleData, {
    title: title || articleData.title,
    subtitle: subtitle !== undefined ? subtitle : articleData.subtitle,
    author: author !== undefined ? author : articleData.author,
    authorImage: authorImage !== undefined ? authorImage : articleData.authorImage,
    coverImage: coverImage !== undefined ? coverImage : articleData.coverImage,
    date: date !== undefined ? date : articleData.date,
    abstract: abstract !== undefined ? abstract : articleData.abstract,
    keywords: keywords || articleData.keywords,
    sections: sections || articleData.sections,
    bibliography: bibliography || articleData.bibliography
  });
  writeJSON(articlePath, articleData);

  res.json({ success: true, item: articleData });
});

router.delete('/velum/:articleId', authenticateToken, checkPermission('delete'), (req, res) => {
  const { articleId } = req.params;
  const lang = req.query.lang || 'es';

  const velumDir = path.join(dataDir, lang, 'velum');
  const indexPath = path.join(velumDir, 'velum.index.json');
  const articlePath = path.join(velumDir, `${articleId}.json`);

  const indexData = readJSON(indexPath);
  if (!indexData) {
    return res.status(404).json({ error: 'VELUM no encontrado' });
  }

  const itemIndex = indexData.items.findIndex(i => i.id === articleId);
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Artículo no encontrado' });
  }

  if (req.requiresApproval) {
    savePendingChange({
      type: 'delete',
      section: 'velum',
      lang,
      articleId,
      data: indexData.items[itemIndex],
      userId: req.user.id,
      userName: req.user.name
    });
    return res.json({ success: true, pending: true, message: 'Cambio enviado para aprobación' });
  }

  indexData.items.splice(itemIndex, 1);
  writeJSON(indexPath, indexData);

  if (fs.existsSync(articlePath)) {
    fs.unlinkSync(articlePath);
  }

  res.json({ success: true, message: 'Artículo eliminado' });
});

module.exports = router;
