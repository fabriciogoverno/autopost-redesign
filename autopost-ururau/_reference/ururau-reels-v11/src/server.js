require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const { generateReelsImage } = require('./generator');
const { generateCaption } = require('./caption');
const { publishToInstagram } = require('./instagram');
const { generateHash, checkDuplicate } = require('./hash');
const { initScheduler } = require('./scheduler');
const { scrapeNews } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Media endpoint
app.get('/api/media', (req, res) => {
  const filePath = req.query.path;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).send('Media not found');
  }
  res.sendFile(path.resolve(filePath));
});

// Dashboard stats
app.get('/api/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM posts').get().c;
  const today = db.prepare('SELECT COUNT(*) as c FROM posts WHERE date(created_at) = date("now")').get().c;
  const week = db.prepare('SELECT COUNT(*) as c FROM posts WHERE created_at >= datetime("now", "-7 days")').get().c;
  const pending = db.prepare('SELECT COUNT(*) as c FROM posts WHERE status = ?').get('pending').c;
  const published = db.prepare('SELECT COUNT(*) as c FROM posts WHERE status = ?').get('published').c;
  const errors = db.prepare('SELECT COUNT(*) as c FROM posts WHERE status = ?').get('error').c;

  res.json({ total, today, week, pending, published, errors });
});

// Recent posts
app.get('/api/posts', (req, res) => {
  const posts = db.prepare('SELECT * FROM posts ORDER BY created_at DESC LIMIT 50').all();
  res.json(posts);
});

// Create post
app.post('/api/posts', async (req, res) => {
  try {
    const { url, title, summary, category, imageUrl } = req.body;

    if (!title) return res.status(400).json({ error: 'Title required' });

    const hash = generateHash(url || title);
    const dup = checkDuplicate(db, hash);
    if (dup && dup.status !== 'error') {
      return res.status(409).json({ error: 'Duplicate content', existing: dup });
    }

    const mediaPath = await generateReelsImage({ title, summary, category, imageUrl });
    const caption = await generateCaption(title, summary, category || 'GERAL');

    const result = db.prepare(`
      INSERT INTO posts (url, title, summary, category, image_path, caption, hash, status, media_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(url || '', title, summary || '', category || 'GERAL', imageUrl || '', caption, hash, 'pending', mediaPath);

    res.json({ id: result.lastInsertRowid, mediaPath, caption, hash });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Publish post
app.post('/api/posts/:id/publish', async (req, res) => {
  try {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });

    const result = await publishToInstagram(post.media_path, post.caption);

    db.prepare('UPDATE posts SET status = ?, published_at = datetime("now") WHERE id = ?')
      .run('published', post.id);

    res.json({ success: true, result });
  } catch (err) {
    db.prepare('UPDATE posts SET status = ?, error_message = ? WHERE id = ?')
      .run('error', err.message, req.params.id);
    res.status(500).json({ error: err.message });
  }
});

// Schedule post
app.post('/api/posts/:id/schedule', (req, res) => {
  const { scheduledAt } = req.body;
  if (!scheduledAt) return res.status(400).json({ error: 'scheduledAt required' });

  db.prepare('UPDATE posts SET status = ?, scheduled_at = ? WHERE id = ?')
    .run('scheduled', scheduledAt, req.params.id);
  res.json({ success: true });
});

// Rollback post
app.post('/api/posts/:id/rollback', (req, res) => {
  db.prepare('UPDATE posts SET status = ?, published_at = NULL WHERE id = ?')
    .run('pending', req.params.id);
  res.json({ success: true });
});

// Delete post
app.delete('/api/posts/:id', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (post && post.media_path && fs.existsSync(post.media_path)) {
    try { fs.unlinkSync(post.media_path); } catch(e){}
  }
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Settings
app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  res.json(settings);
});

app.post('/api/settings', (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'key required' });

  db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime("now")`)
    .run(key, value || '');
  res.json({ success: true });
});

// Logs
app.get('/api/logs', (req, res) => {
  const logs = db.prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT 100').all();
  res.json(logs);
});

app.delete('/api/logs', (req, res) => {
  db.prepare('DELETE FROM logs').run();
  res.json({ success: true });
});

// Scrape URL
app.post('/api/scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    const data = await scrapeNews(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Autoblog trigger manual
app.post('/api/autoblog', async (req, res) => {
  const { runAutoblog } = require('./scheduler');
  try {
    await runAutoblog();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});





// ===== TEMPLATE ENDPOINTS =====
const { loadTemplate, saveTemplate, resetTemplate, getBackups, restoreBackup } = require('./template');

app.get('/api/template', (req, res) => {
  try {
    const tpl = loadTemplate();
    res.json(tpl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/template', (req, res) => {
  try {
    const current = loadTemplate();
    const updates = req.body;

    if (updates.layers) {
      Object.keys(updates.layers).forEach(key => {
        if (current.layers[key]) {
          Object.assign(current.layers[key], updates.layers[key]);
        }
      });
    }
    if (updates.categoryColors) {
      Object.assign(current.categoryColors, updates.categoryColors);
    }

    saveTemplate(current);
    res.json({ success: true, template: current });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/template/reset', (req, res) => {
  try {
    const tpl = resetTemplate();
    res.json({ success: true, template: tpl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/template/preview', async (req, res) => {
  try {
    const { title, summary, category } = req.body;
    const { generateReelsImage } = require('./generator');
    const mediaPath = await generateReelsImage({
      title: title || 'Preview Titulo',
      summary: summary || 'Preview resumo da noticia para teste do template.',
      category: category || 'GERAL',
      imageUrl: ''
    });
    res.json({ mediaPath, previewUrl: `/api/media?path=${encodeURIComponent(mediaPath)}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/template/backups', (req, res) => {
  try {
    const backups = getBackups();
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/template/restore', (req, res) => {
  try {
    const { backupName } = req.body;
    if (!backupName) return res.status(400).json({ error: 'backupName required' });

    const tpl = restoreBackup(backupName);
    res.json({ success: true, template: tpl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== EDITOR VISUAL v8 =====
const editorRoutes = require('./routes/editor');
app.use('/', editorRoutes);
// =============================

app.listen(PORT, () => {
  console.log('========================================');
  console.log('  URURAU REELS - Server running');
  console.log('  http://localhost:' + PORT);
  console.log('========================================');
  initScheduler();
});

