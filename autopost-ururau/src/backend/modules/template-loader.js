import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, '../../../templates');
const TEMPLATE_ID = 'ururau-reels';
const TEMPLATE_FILE = join(TEMPLATES_DIR, `${TEMPLATE_ID}.json`);
const TEMPLATE_DEFAULT_FILE = join(TEMPLATES_DIR, `${TEMPLATE_ID}.default.json`);
const BACKUPS_DIR = join(TEMPLATES_DIR, 'backups');
const TEMPLATE_BASE_FILE = join(TEMPLATES_DIR, 'assets', 'template-base.png');

export function loadTemplate(templateId = TEMPLATE_ID) {
  const templatePath = join(TEMPLATES_DIR, `${templateId}.json`);
  if (!existsSync(templatePath)) throw new Error(`Template não encontrado: ${templatePath}`);
  const raw = JSON.parse(readFileSync(templatePath, 'utf-8'));
  const template = migrateTemplate(raw);
  validateTemplate(template);
  return template;
}

/**
 * Migra templates de versoes antigas para o schema atual.
 * - schemaVersion ausente => assume 1 (sem categoryStyles, sem bindings, sem layers metadata completa)
 * - categoryColors sem categoryStyles => gera categoryStyles a partir do colors
 * - bottomGradient como overlay solido => mantem como esta (compat),
 *   mas se vier sem colorStops e o frontend ja interpreta como gradient,
 *   o JSON novo (v2+) ja usa type: gradientOverlay.
 * - layers sem zIndex/visible/locked/deletable/rotation => preenche com defaults seguros.
 *
 * Idempotente: chamar 2x produz o mesmo resultado.
 */
export function migrateTemplate(template) {
  if (!template || typeof template !== 'object') return template;
  const t = JSON.parse(JSON.stringify(template));
  const version = Number(t.schemaVersion || 1);

  // 1. categoryStyles a partir de categoryColors legacy
  if (t.categoryColors && !t.categoryStyles) {
    t.categoryStyles = {};
    for (const [k, v] of Object.entries(t.categoryColors)) {
      t.categoryStyles[k] = { background: v, textColor: '#FFFFFF' };
    }
  }
  // Garante categoryColors existir (compat com codigo legado que le de la)
  if (t.categoryStyles && !t.categoryColors) {
    t.categoryColors = {};
    for (const [k, v] of Object.entries(t.categoryStyles)) {
      t.categoryColors[k] = v.background;
    }
  }

  // 2. canvas a partir de source
  if (!t.canvas && t.source?.width && t.source?.height) {
    t.canvas = { width: t.source.width, height: t.source.height, background: '#000000' };
  }

  // 3. bindings padrao se ausente
  if (!t.bindings) {
    t.bindings = {
      category: 'article.category',
      title: 'article.title',
      summary: 'article.summary',
      'articleImage.src': 'article.image',
      watermark: null
    };
  }

  // 4. fonte oficial obrigatoria
  t.fonts = {
    ...(t.fonts || {}),
    family: 'Aileron',
    weights: [400, 700],
    files: {
      ...((t.fonts && t.fonts.files) || {}),
      400: '/assets/fonts/aileron/AileronRegular.otf',
      700: '/assets/fonts/aileron/AileronBold.otf'
    },
    required: true
  };

  // 5. metadados nas layers
  if (t.layers) {
    const defaultZ = { blackBackground: 0, articleImage: 10, bottomGradient: 20, category: 40, title: 50, separator: 55, summary: 60, lockedHeader: 90, watermark: 100 };
    for (const [key, layer] of Object.entries(t.layers)) {
      if (key === 'articleImage') {
        layer.x = 0;
        layer.y = 0;
        layer.width = 1080;
        layer.height = 1920;
        layer.fitMode = 'cover';
        layer.objectFit = 'cover';
        layer.opacity = 1;
        layer.zIndex = 10;
      }
      if (!layer.id) layer.id = key;
      if (typeof layer.zIndex !== 'number') layer.zIndex = defaultZ[key] != null ? defaultZ[key] : 50;
      if (typeof layer.visible !== 'boolean') layer.visible = true;
      if (typeof layer.locked !== 'boolean') layer.locked = (key === 'blackBackground' || key === 'lockedHeader');
      if (typeof layer.deletable !== 'boolean') {
        layer.deletable = !(key === 'blackBackground' || key === 'lockedHeader' || key === 'category' || key === 'title' || key === 'separator' || key === 'summary' || key === 'watermark');
      }
      if (typeof layer.opacity !== 'number') layer.opacity = 1;
      if (typeof layer.rotation !== 'number') layer.rotation = 0;
    }
  }

  // 6. atualiza schemaVersion
  if (version < 2) t.schemaVersion = 2;
  return t;
}

function validateTemplate(template) {
  const isLayerSchema = !!template.layers;
  if (isLayerSchema) {
    if (!template.source?.width || !template.source?.height) throw new Error('Template layers inválido');
    return;
  }
  const required = ['id', 'name', 'dimensions', 'elements'];
  for (const key of required) if (!template[key]) throw new Error(`Template inválido: '${key}' ausente`);
}

export function listTemplates() {
  const files = readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.json') && !f.endsWith('.default.json'));
  return files.map(f => {
    const t = JSON.parse(readFileSync(join(TEMPLATES_DIR, f), 'utf-8'));
    return { id: t.id || f.replace('.json', ''), name: t.name, description: t.description, dimensions: t.dimensions || t.source };
  });
}

export function fillTemplate(template, post) {
  if (template.layers) {
    const filled = JSON.parse(JSON.stringify(template));
    filled._renderData = {
      title: post.title || filled.defaults?.title || '',
      summary: post.summary || filled.defaults?.summary || '',
      category: (post.category || filled.defaults?.category || 'GERAL').toUpperCase(),
      imageUrl: post.image_url || post.imageUrl || ''
    };
    return filled;
  }
  const filled = JSON.parse(JSON.stringify(template));
  const categoryKey = (post.category || 'geral').toLowerCase();
  const catConfig = template.categories?.[categoryKey] || template.categories?.['geral'];
  for (const el of filled.elements) {
    if (el.text && typeof el.text === 'string') {
      el.text = el.text.replace(/{{title}}/g, post.title || '').replace(/{{summary}}/g, post.summary || '').replace(/{{category}}/g, catConfig?.badgeText || categoryKey.toUpperCase());
    }
    if (el.type === 'badge' && el.id === 'category_badge' && catConfig) el.background = catConfig.badgeColor;
  }
  return filled;
}

export function loadActiveTemplate() { return loadTemplate(TEMPLATE_ID); }
export function saveActiveTemplate(nextTemplate) {
  validateTemplate(nextTemplate);
  mkdirSync(BACKUPS_DIR, { recursive: true });
  if (existsSync(TEMPLATE_FILE)) copyFileSync(TEMPLATE_FILE, join(BACKUPS_DIR, `${Date.now()}-ururau-reels.json`));
  writeFileSync(TEMPLATE_FILE, JSON.stringify(nextTemplate, null, 2));
  return nextTemplate;
}
export function resetActiveTemplate() {
  if (!existsSync(TEMPLATE_DEFAULT_FILE)) throw new Error('Template default não encontrado');
  const tpl = JSON.parse(readFileSync(TEMPLATE_DEFAULT_FILE, 'utf-8'));
  saveActiveTemplate(tpl);
  return tpl;
}
export function listTemplateBackups() {
  if (!existsSync(BACKUPS_DIR)) return [];
  return readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json')).sort().reverse();
}
export function restoreTemplateBackup(name) {
  const p = join(BACKUPS_DIR, name);
  if (!existsSync(p)) throw new Error('Backup não encontrado');
  const tpl = JSON.parse(readFileSync(p, 'utf-8'));
  saveActiveTemplate(tpl);
  return tpl;
}
export function getTemplateHash(template) { return crypto.createHash('sha1').update(JSON.stringify(template)).digest('hex'); }
export function getTemplateBasePath() { return TEMPLATE_BASE_FILE; }
export function wrapTitle(title, maxWidth, fontSize) { const avgCharWidth = fontSize * 0.55; const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth); const words = (title || '').split(' '); const lines=[]; let current=''; for (const w of words){ if((current+' '+w).trim().length<=maxCharsPerLine) current=(current+' '+w).trim(); else { if(current) lines.push(current); current=w; } } if(current) lines.push(current); return lines.length>5 ? lines.slice(0,4).concat([`${lines[4].slice(0, maxCharsPerLine-3)}...`]) : lines; }
