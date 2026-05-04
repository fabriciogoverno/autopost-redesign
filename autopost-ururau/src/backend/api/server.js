/**
 * AutoPost Ururau — API REST Server
 * Servidor Express para o Dashboard consumir dados reais
 * Fase 7 — API + Rollback
 * 
 * Porta: 3001 (Dashboard roda em 3000 e proxya para cá)
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import database from '../core/database.js';
import publisher from '../modules/publisher.js';
import generator from '../modules/generator.js';
import captionGenerator from '../modules/caption.js';
import autoblog from '../modules/autoblog.js';
import scheduler from '../modules/scheduler.js';
import rollback from '../modules/rollback.js';
import { logInfo, logSuccess, logError } from '../modules/logger.js';

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// ============================================================
// HEALTH
// ============================================================
app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ============================================================
// STATS
// ============================================================
app.get('/api/stats', async (req, res) => {
  try {
    await database.init();
    const queueStats = await database.getQueueStats();

    // Stats de hoje
    const db = await database.connect();
    const today = await db.get(`
      SELECT COUNT(*) as count FROM publications 
      WHERE date(published_at) = date('now', 'localtime') AND status = 'published'
    `);

    const week = await db.get(`
      SELECT COUNT(*) as count FROM publications 
      WHERE published_at >= datetime('now', 'localtime', '-7 days') AND status = 'published'
    `);

    const successRate = queueStats.total > 0 
      ? ((queueStats.published / queueStats.total) * 100).toFixed(1) 
      : 0;

    res.json({
      pending: queueStats.pending,
      published: queueStats.published,
      failed: queueStats.failed,
      rolled_back: queueStats.rolled_back,
      today: today.count,
      week: week.count,
      success_rate: parseFloat(successRate),
      total: queueStats.total
    });
  } catch (err) {
    logError('API /stats', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats/hourly', async (req, res) => {
  try {
    await database.init();
    const db = await database.connect();

    const rows = await db.all(`
      SELECT strftime('%H', published_at) as hour, COUNT(*) as count
      FROM publications
      WHERE date(published_at) = date('now', 'localtime')
      AND status = 'published'
      GROUP BY hour
      ORDER BY hour
    `);

    const hours = ['00', '03', '06', '07', '09', '12', '15', '18', '21', '23'];
    const data = hours.map(h => ({
      hora: h + 'h',
      posts: rows.find(r => r.hour === h)?.count || 0
    }));

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats/platforms', async (req, res) => {
  try {
    await database.init();
    const db = await database.connect();

    const rows = await db.all(`
      SELECT platform, COUNT(*) as count
      FROM publications
      WHERE published_at >= datetime('now', 'localtime', '-7 days')
      AND status = 'published'
      GROUP BY platform
    `);

    const colors = {
      instagram: '#E63946', facebook: '#1877F2', whatsapp: '#25D366',
      twitter: '#1DA1F2', linkedin: '#0A66C2'
    };

    const data = rows.map(r => ({
      platform: r.platform.charAt(0).toUpperCase() + r.platform.slice(1),
      posts: r.count,
      color: colors[r.platform] || '#666'
    }));

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// QUEUE
// ============================================================
app.get('/api/queue', async (req, res) => {
  try {
    await database.init();
    const limit = parseInt(req.query.limit) || 50;
    const posts = await database.getPendingPosts(limit);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/queue/:id', async (req, res) => {
  try {
    await database.init();
    const post = await database.getPostById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/queue/:id/generate', async (req, res) => {
  try {
    await database.init();
    const post = await database.getPostById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });

    const result = await generator.generate(post, req.body.template || 'ururau-reels', req.body.formats || ['reels']);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/queue/:id/publish', async (req, res) => {
  try {
    await database.init();
    const result = await publisher.publish({
      postId: parseInt(req.params.id),
      platforms: req.body.platforms || ['instagram', 'whatsapp'],
      template: req.body.template || 'ururau-reels',
      formats: req.body.formats || ['reels']
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/queue/:id/schedule', async (req, res) => {
  try {
    await database.init();
    const result = await scheduler.schedule(
      parseInt(req.params.id),
      req.body.scheduledFor,
      req.body.platforms,
      { template: req.body.template, customCaption: req.body.customCaption }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/queue/:id', async (req, res) => {
  try {
    await database.init();
    await database.ignorePost(req.params.id, req.body.reason || 'api_ignore');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PUBLICATIONS
// ============================================================
app.get('/api/publications', async (req, res) => {
  try {
    await database.init();
    const db = await database.connect();
    const limit = parseInt(req.query.limit) || 50;
    const rows = await db.all(`
      SELECT p.*, q.title, q.source 
      FROM publications p
      JOIN posts_queue q ON p.queue_id = q.id
      ORDER BY p.published_at DESC
      LIMIT ?
    `, [limit]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/publications/recent', async (req, res) => {
  try {
    await database.init();
    const db = await database.connect();
    const rows = await db.all(`
      SELECT p.*, q.title 
      FROM publications p
      JOIN posts_queue q ON p.queue_id = q.id
      ORDER BY p.published_at DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/publications/:id/rollback', async (req, res) => {
  try {
    await database.init();
    const result = await rollback.execute(req.params.id, req.body.reason || 'api_rollback');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// AUDIT LOG
// ============================================================
app.get('/api/audit', async (req, res) => {
  try {
    await database.init();
    const limit = parseInt(req.query.limit) || 100;
    const action = req.query.action || null;
    const logs = await database.getAuditLog(limit, action);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// CONFIG
// ============================================================
app.get('/api/config', async (req, res) => {
  try {
    const db = await database.connect();
    const rows = await db.all('SELECT key, value FROM system_config');
    const config = {};
    rows.forEach(r => { config[r.key] = r.value; });
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/config', async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await database.setConfig(key, value);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// TEMPLATES
// ============================================================
app.get('/api/templates', async (req, res) => {
  try {
    const { listTemplates } = await import('../modules/template-loader.js');
    const templates = await listTemplates();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// AUTOBLOG
// ============================================================
app.post('/api/autoblog/run', async (req, res) => {
  try {
    await database.init();
    await autoblog.runCycle();
    res.json({ success: true, stats: autoblog.getStats() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/autoblog/stats', async (req, res) => {
  res.json(autoblog.getStats());
});

// ============================================================
// START
// ============================================================
export function startServer() {
  app.listen(PORT, () => {
    logSuccess(`🌐 API Server rodando em http://localhost:${PORT}`);
    logInfo(`   Endpoints disponíveis:`);
    logInfo(`   - GET  /api/health`);
    logInfo(`   - GET  /api/stats`);
    logInfo(`   - GET  /api/queue`);
    logInfo(`   - POST /api/queue/:id/generate`);
    logInfo(`   - POST /api/queue/:id/publish`);
    logInfo(`   - GET  /api/publications`);
    logInfo(`   - POST /api/publications/:id/rollback`);
    logInfo(`   - GET  /api/audit`);
    logInfo(`   - GET  /api/config`);
  });
  return app;
}

// Se executado diretamente
if (process.argv.includes('--start')) {
  startServer();
}

export default app;
