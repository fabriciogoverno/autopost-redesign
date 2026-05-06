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
import { existsSync, statSync } from 'fs';
import { join, resolve, extname, isAbsolute, relative } from 'path';
import { readFile } from 'fs/promises';
import database from '../core/database.js';
import publisher from '../modules/publisher.js';
import generator from '../modules/generator.js';
import captionGenerator from '../modules/caption.js';
import autoblog from '../modules/autoblog.js';
import scheduler from '../modules/scheduler.js';
import rollback from '../modules/rollback.js';
import { logInfo, logSuccess, logError } from '../modules/logger.js';
import { loadActiveTemplate, saveActiveTemplate, resetActiveTemplate, listTemplateBackups, restoreTemplateBackup, fillTemplate } from '../modules/template-loader.js';
import { scrapeArticleByUrl } from '../modules/article-scraper.js';

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '25mb' }));

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

app.get('/api/media', async (req, res) => {
  try {
    const mediaPath = req.query.path;
    if (!mediaPath) return res.status(400).json({ success: false, error: 'path obrigatorio' });
    const requestedPath = String(mediaPath);
    const allowedRoots = [resolve(process.cwd(), 'output', 'artes'), resolve(process.cwd(), 'output', 'preview')];
    const absolutePath = isAbsolute(requestedPath) ? resolve(requestedPath) : resolve(process.cwd(), requestedPath);
    const isAllowed = allowedRoots.some(root => {
      const rel = relative(root, absolutePath);
      return rel === '' || (!!rel && !rel.startsWith('..') && !isAbsolute(rel));
    });
    if (!isAllowed) return res.status(403).json({ success: false, error: 'Acesso negado ao arquivo solicitado' });
    if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
      return res.status(404).json({ success: false, error: 'Arquivo de preview nao encontrado' });
    }
    const ext = extname(absolutePath).toLowerCase();
    const contentType = ext === '.png' ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
        : ext === '.webp' ? 'image/webp'
          : 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(absolutePath);
  } catch (err) {
    logError('GET /api/media', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// TEMPLATE EDITOR
// ============================================================

app.get('/api/template', async (req, res) => {
  try { res.json(loadActiveTemplate()); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/template', async (req, res) => {
  try { res.json({ success: true, template: saveActiveTemplate(req.body) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/template/reset', async (req, res) => {
  try { res.json({ success: true, template: resetActiveTemplate() }); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/template/backups', async (req, res) => {
  try { res.json({ backups: listTemplateBackups() }); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/template/restore', async (req, res) => {
  try { res.json({ success: true, template: restoreTemplateBackup(req.body.name) }); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/template/preview', async (req, res) => {
  try {
    const template = req.body.template && req.body.template.layers ? req.body.template : loadActiveTemplate();
    const articleData = template.articleData || {};
    const articleImage = req.body.imageUrl || req.body.image || template.layers?.articleImage?.src || articleData.image || '';
    logInfo(`[template-preview] payload title=${Boolean(req.body.title || articleData.title)} category=${req.body.category || articleData.category || template.defaults?.category || 'GERAL'} image=${Boolean(articleImage)} snapshot=${Boolean(req.body.template?.layers)}`);
    const mock = {
      hash: `preview_${Date.now()}`,
      title: req.body.title || articleData.title || template.defaults?.title || 'Preview',
      summary: req.body.summary || articleData.summary || template.defaults?.summary || '',
      category: req.body.category || articleData.category || template.defaults?.category || 'GERAL',
      author: req.body.author || articleData.author || '',
      date: req.body.date || articleData.date || '',
      imageUrl: articleImage,
      image_url: articleImage
    };
    const filled = fillTemplate(template, mock);
    const mediaPath = await generator.renderFromTemplate(filled, mock, 'preview', 'ururau-reels');
    const url = `/api/media?path=${encodeURIComponent(mediaPath)}`;
    logInfo(`[template-preview] generated path=${mediaPath}`);
    logInfo(`[template-preview] url=${url}`);
    res.json({ success: true, mediaPath, url });
  } catch (err) {
    logError('POST /api/template/preview', err);
    res.status(500).json({ success: false, error: err.message || 'Falha ao gerar preview' });
  }
});

function isAllowedCanvaUrl(value) {
  try {
    const parsed = new URL(String(value || ''));
    return parsed.hostname === 'canva.link' || parsed.hostname === 'www.canva.com' || parsed.hostname === 'canva.com';
  } catch (err) {
    return false;
  }
}

function extractCanvaDesignId(value) {
  const match = String(value || '').match(/\/design\/([^/?#]+)/i);
  return match ? match[1] : '';
}

function buildCanvaUseTemplateUrl(templateId) {
  if (!templateId) return '';
  const redirect = encodeURIComponent(`/design?create&template=${templateId}`);
  return `https://www.canva.com/login/?redirect=${redirect}`;
}

function numberOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampNumber(value, min, max, fallback) {
  const n = numberOr(value, fallback);
  return Math.max(min, Math.min(max, n));
}

function cleanLayerKey(value, fallback) {
  const key = String(value || fallback || 'layer')
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return key || 'layer';
}

function uniqueImportedLayerKey(layers, baseKey) {
  const cleanBase = cleanLayerKey(baseKey, 'canva_layer');
  let key = cleanBase.startsWith('canva_') ? cleanBase : `canva_${cleanBase}`;
  let i = 1;
  while (layers[key]) {
    i += 1;
    key = `${cleanBase}_${i}`;
    if (!key.startsWith('canva_')) key = `canva_${key}`;
  }
  return key;
}

function firstValue(source, keys, fallback = '') {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function normalizeCanvaElements(snapshot) {
  if (Array.isArray(snapshot?.elements)) return snapshot.elements;
  if (Array.isArray(snapshot?.layers)) return snapshot.layers;
  if (Array.isArray(snapshot?.pages) && snapshot.pages[0]) {
    const page = snapshot.pages[0];
    if (Array.isArray(page.elements)) return page.elements;
    if (Array.isArray(page.layers)) return page.layers;
  }
  return [];
}

function normalizeCanvaColorStops(value) {
  if (!Array.isArray(value) || value.length < 2) {
    return [
      { offset: 0, color: 'rgba(0,0,0,0)' },
      { offset: 1, color: 'rgba(0,0,0,0.86)' }
    ];
  }
  return value.map((stop, index) => ({
    offset: clampNumber(firstValue(stop, ['offset', 'position'], index / Math.max(1, value.length - 1)), 0, 1, index / Math.max(1, value.length - 1)),
    color: String(firstValue(stop, ['color', 'rgba', 'hex'], '#000000'))
  }));
}

function readCanvaText(element) {
  const text = firstValue(element, ['text', 'plainText', 'content', 'value'], '');
  if (typeof text === 'string') return text;
  if (Array.isArray(text)) return text.map(part => part?.text || part?.content || '').join('');
  return '';
}

function readCanvaImageSrc(element) {
  return String(
    firstValue(element, ['src', 'url', 'imageUrl', 'dataUrl', 'assetUrl'], '')
    || firstValue(element?.asset, ['src', 'url', 'imageUrl'], '')
    || firstValue(element?.fill, ['src', 'url', 'imageUrl'], '')
    || ''
  );
}

function canvaElementToLayer(element, index, layers) {
  const rawType = String(firstValue(element, ['type', 'kind', 'elementType'], 'unknown')).toLowerCase();
  const role = String(firstValue(element, ['role', 'name', 'label'], '')).toLowerCase();
  const id = firstValue(element, ['id', 'elementId', 'key'], `element_${index + 1}`);
  const x = numberOr(firstValue(element, ['x', 'left'], 120), 120);
  const y = numberOr(firstValue(element, ['y', 'top'], 120), 120);
  const width = Math.max(1, numberOr(firstValue(element, ['width', 'w'], 720), 720));
  const height = Math.max(1, numberOr(firstValue(element, ['height', 'h'], 120), 120));
  const zIndex = numberOr(firstValue(element, ['zIndex', 'z', 'order'], 70 + index), 70 + index);
  const opacity = clampNumber(firstValue(element, ['opacity'], 1), 0, 1, 1);
  const rotation = numberOr(firstValue(element, ['rotation', 'rotate'], 0), 0);
  const base = {
    id: '',
    label: firstValue(element, ['label', 'name'], `Canva ${rawType}`),
    x,
    y,
    width,
    height,
    zIndex,
    opacity,
    rotation,
    visible: element.visible !== false,
    locked: false,
    deletable: true,
    canvaImported: true,
    canva: {
      id,
      type: rawType,
      role: role || undefined,
      raw: element
    }
  };

  if (rawType.includes('text') || rawType.includes('richtext')) {
    return {
      keyBase: id,
      layer: {
        ...base,
        type: role.includes('badge') || role.includes('categoria') ? 'badge' : 'textBox',
        text: readCanvaText(element) || 'Texto Canva',
        fontFamily: 'Aileron',
        fontWeight: firstValue(element, ['fontWeight'], role.includes('title') || role.includes('titulo') ? 'bold' : 'normal'),
        fontSize: numberOr(firstValue(element, ['fontSize', 'size'], 42), 42),
        lineHeight: numberOr(firstValue(element, ['lineHeight'], 50), 50),
        letterSpacing: numberOr(firstValue(element, ['letterSpacing'], 0), 0),
        color: String(firstValue(element, ['color', 'textColor'], '#FFFFFF')),
        align: String(firstValue(element, ['align', 'textAlign'], 'left')),
        background: String(firstValue(element, ['background', 'backgroundColor'], '#af0014')),
        textColor: String(firstValue(element, ['textColor', 'color'], '#FFFFFF')),
        paddingX: numberOr(firstValue(element, ['paddingX'], 22), 22),
        paddingY: numberOr(firstValue(element, ['paddingY'], 10), 10),
        borderRadius: numberOr(firstValue(element, ['borderRadius', 'radius'], 0), 0),
        autoWidth: element.autoWidth !== false
      }
    };
  }

  if (rawType.includes('image') || rawType.includes('photo') || rawType.includes('media') || readCanvaImageSrc(element)) {
    return {
      keyBase: id,
      layer: {
        ...base,
        type: 'image',
        src: readCanvaImageSrc(element),
        fitMode: String(firstValue(element, ['fitMode', 'objectFit'], 'cover')),
        objectFit: String(firstValue(element, ['objectFit', 'fitMode'], 'cover')),
        focalPoint: {
          x: clampNumber(firstValue(element, ['focalX'], element?.focalPoint?.x ?? 0.5), 0, 1, 0.5),
          y: clampNumber(firstValue(element, ['focalY'], element?.focalPoint?.y ?? 0.5), 0, 1, 0.5)
        },
        focalX: clampNumber(firstValue(element, ['focalX'], element?.focalPoint?.x ?? 0.5), 0, 1, 0.5),
        focalY: clampNumber(firstValue(element, ['focalY'], element?.focalPoint?.y ?? 0.5), 0, 1, 0.5),
        zoom: Math.max(0.1, numberOr(firstValue(element, ['zoom'], 1), 1)),
        panX: numberOr(firstValue(element, ['panX'], 0), 0),
        panY: numberOr(firstValue(element, ['panY'], 0), 0)
      }
    };
  }

  if (rawType.includes('gradient')) {
    return {
      keyBase: id,
      layer: {
        ...base,
        type: 'gradientOverlay',
        angle: numberOr(firstValue(element, ['angle'], 90), 90),
        colorStops: normalizeCanvaColorStops(element.colorStops || element.stops)
      }
    };
  }

  if (rawType.includes('line')) {
    return {
      keyBase: id,
      layer: {
        ...base,
        type: 'shapeLine',
        height: Math.max(2, height),
        color: String(firstValue(element, ['color', 'stroke', 'fill'], '#c11f25'))
      }
    };
  }

  if (rawType.includes('shape') || rawType.includes('rect') || rawType.includes('rectangle')) {
    return {
      keyBase: id,
      layer: {
        ...base,
        type: 'shape',
        color: String(firstValue(element, ['color', 'fill', 'background'], '#000000')),
        radius: numberOr(firstValue(element, ['radius', 'borderRadius'], 0), 0)
      }
    };
  }

  return {
    unsupported: {
      id,
      type: rawType,
      reason: 'Tipo ainda nao mapeado para camada Konva editavel'
    }
  };
}

function buildTemplateFromCanvaSnapshot(body) {
  const payload = body?.snapshot && typeof body.snapshot === 'object' ? body.snapshot : body;
  const elements = normalizeCanvaElements(payload);
  if (!elements.length) throw new Error('Snapshot Canva sem elements/layers');

  const base = loadActiveTemplate();
  const next = JSON.parse(JSON.stringify(base));
  const replaceCanvaImport = body?.replaceCanvaImport !== false;
  if (!next.layers) next.layers = {};
  if (replaceCanvaImport) {
    for (const [key, layer] of Object.entries(next.layers)) {
      if (layer?.canvaImported === true) delete next.layers[key];
    }
  }

  const imported = [];
  const unsupported = [];
  elements.forEach((element, index) => {
    const mapped = canvaElementToLayer(element, index, next.layers);
    if (mapped.unsupported) {
      unsupported.push(mapped.unsupported);
      return;
    }
    const key = uniqueImportedLayerKey(next.layers, mapped.keyBase || `element_${index + 1}`);
    mapped.layer.id = key;
    mapped.layer.label = mapped.layer.label || key;
    next.layers[key] = mapped.layer;
    imported.push({ id: key, type: mapped.layer.type, label: mapped.layer.label });
  });

  next.integrations = {
    ...(next.integrations || {}),
    canva: {
      ...((next.integrations && next.integrations.canva) || {}),
      sourceUrl: body?.sourceUrl || payload.sourceUrl || '',
      finalUrl: body?.finalUrl || payload.finalUrl || '',
      designId: body?.designId || payload.designId || payload.templateId || '',
      templateId: body?.templateId || payload.templateId || payload.designId || '',
      importedAt: new Date().toISOString(),
      editableImport: true,
      importedLayerCount: imported.length,
      unsupportedLayerCount: unsupported.length
    }
  };
  next.layerOrder = Object.keys(next.layers).sort((a, b) => {
    const za = typeof next.layers[a]?.zIndex === 'number' ? next.layers[a].zIndex : 50;
    const zb = typeof next.layers[b]?.zIndex === 'number' ? next.layers[b].zIndex : 50;
    return za - zb;
  });

  return { template: next, imported, unsupported };
}

async function resolveCanvaShareUrl(inputUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    let currentUrl = inputUrl;
    for (let i = 0; i < 8; i++) {
      const response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': 'AutoPost-TemplateStudio/1.0' }
      });
      const location = response.headers.get('location');
      if (location && response.status >= 300 && response.status < 400) {
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }
      return response.url || currentUrl;
    }
    return currentUrl;
  } finally {
    clearTimeout(timeout);
  }
}

app.post('/api/canva/link-info', async (req, res) => {
  try {
    const inputUrl = String(req.body?.url || '').trim();
    if (!inputUrl) return res.status(400).json({ success: false, error: 'URL do Canva obrigatoria' });
    if (!isAllowedCanvaUrl(inputUrl)) {
      return res.status(400).json({ success: false, error: 'Informe um link canva.link ou canva.com/design' });
    }
    let finalUrl = inputUrl;
    try {
      finalUrl = await resolveCanvaShareUrl(inputUrl);
    } catch (err) {
      logInfo(`[canva-link] nao foi possivel resolver redirect: ${err.message}`);
    }
    const designId = extractCanvaDesignId(finalUrl) || extractCanvaDesignId(inputUrl);
    const useTemplateUrl = buildCanvaUseTemplateUrl(designId);
    res.json({
      success: true,
      inputUrl,
      finalUrl,
      designId,
      templateId: designId,
      useTemplateUrl,
      editableInCanva: Boolean(useTemplateUrl),
      editableImport: false,
      reason: 'O link publico permite criar uma copia editavel dentro do Canva. Para trazer camadas editaveis para o Konva sem perda, e necessario um app Canva usando Design Editing API para ler os elementos e enviar um snapshot estruturado ao AutoPost.'
    });
  } catch (err) {
    logError('POST /api/canva/link-info', err);
    res.status(500).json({ success: false, error: err.message || 'Falha ao analisar link do Canva' });
  }
});

app.post('/api/canva/import-snapshot', async (req, res) => {
  try {
    const dryRun = req.body?.dryRun === true;
    const result = buildTemplateFromCanvaSnapshot(req.body || {});
    const template = dryRun ? result.template : saveActiveTemplate(result.template);
    logInfo(`[canva-import] dryRun=${dryRun} imported=${result.imported.length} unsupported=${result.unsupported.length}`);
    res.json({
      success: true,
      dryRun,
      imported: result.imported,
      unsupported: result.unsupported,
      template
    });
  } catch (err) {
    logError('POST /api/canva/import-snapshot', err);
    res.status(400).json({ success: false, error: err.message || 'Falha ao importar snapshot Canva' });
  }
});

app.post('/api/template/scrape', async (req, res) => {
  try {
    const { url } = req.body;
    const article = await scrapeArticleByUrl(url);
    res.json(article);
  } catch (err) {
    const isBadRequest = /url invalida/i.test(err.message);
    res.status(isBadRequest ? 400 : 500).json({
      success: false,
      error: `Falha ao extrair URL: ${err.message}`
    });
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

