const fs = require('fs');
const path = require('path');

const TEMPLATE_JSON = path.join(__dirname, '..', 'templates', 'ururau-reels.json');
const TEMPLATE_DEFAULT = path.join(__dirname, '..', 'templates', 'ururau-reels.default.json');
const BACKUP_DIR = path.join(__dirname, '..', 'templates', 'backups');
const TEMPLATE_BASE = path.join(__dirname, '..', 'public', 'assets', 'template-base.png');
const TEMPLATE_BASE_ORIGINAL = path.join(__dirname, '..', 'public', 'assets', 'template-base.original.png');

// Garantir diretórios existem
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// Criar cópia original do PNG se ainda não existir
if (fs.existsSync(TEMPLATE_BASE) && !fs.existsSync(TEMPLATE_BASE_ORIGINAL)) {
  fs.copyFileSync(TEMPLATE_BASE, TEMPLATE_BASE_ORIGINAL);
}

function loadTemplate() {
  if (!fs.existsSync(TEMPLATE_JSON)) {
    throw new Error('Template nao encontrado: ' + TEMPLATE_JSON);
  }
  return JSON.parse(fs.readFileSync(TEMPLATE_JSON, 'utf8'));
}

function validateTemplate(tpl) {
  if (!tpl.layers) throw new Error('Template invalido: camadas ausentes');
  if (!tpl.categoryColors) throw new Error('Template invalido: cores de categoria ausentes');

  // Validar camadas obrigatórias
  const required = ['category', 'title', 'separator', 'summary', 'watermark'];
  for (const key of required) {
    if (!tpl.layers[key]) throw new Error(`Camada obrigatoria ausente: ${key}`);
  }

  return true;
}

function saveTemplate(tpl) {
  validateTemplate(tpl);

  // Criar backup antes de salvar
  createBackup();

  const tmp = TEMPLATE_JSON + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(tpl, null, 2));
  fs.renameSync(tmp, TEMPLATE_JSON);

  return tpl;
}

function createBackup() {
  if (!fs.existsSync(TEMPLATE_JSON)) return;

  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}-${String(now.getSeconds()).padStart(2,'0')}`;
  const backupPath = path.join(BACKUP_DIR, `ururau-reels-${timestamp}.json`);

  fs.copyFileSync(TEMPLATE_JSON, backupPath);

  // Manter apenas os últimos 20 backups
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('ururau-reels-') && f.endsWith('.json'))
    .map(f => ({ name: f, path: path.join(BACKUP_DIR, f), time: fs.statSync(path.join(BACKUP_DIR, f)).mtime }))
    .sort((a, b) => b.time - a.time);

  if (backups.length > 20) {
    backups.slice(20).forEach(b => {
      try { fs.unlinkSync(b.path); } catch(e){}
    });
  }

  return backupPath;
}

function resetTemplate() {
  if (!fs.existsSync(TEMPLATE_DEFAULT)) {
    throw new Error('Template padrao nao encontrado');
  }

  createBackup();

  const defaultTpl = JSON.parse(fs.readFileSync(TEMPLATE_DEFAULT, 'utf8'));
  fs.writeFileSync(TEMPLATE_JSON, JSON.stringify(defaultTpl, null, 2));

  // Restaurar PNG original também
  if (fs.existsSync(TEMPLATE_BASE_ORIGINAL)) {
    fs.copyFileSync(TEMPLATE_BASE_ORIGINAL, TEMPLATE_BASE);
  }

  return defaultTpl;
}

function getBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];

  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('ururau-reels-') && f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.toISOString()
    }))
    .sort((a, b) => new Date(b.time) - new Date(a.time));
}

function restoreBackup(backupName) {
  const backupPath = path.join(BACKUP_DIR, backupName);
  if (!fs.existsSync(backupPath)) {
    throw new Error('Backup nao encontrado: ' + backupName);
  }

  createBackup();
  fs.copyFileSync(backupPath, TEMPLATE_JSON);

  return JSON.parse(fs.readFileSync(TEMPLATE_JSON, 'utf8'));
}

module.exports = {
  loadTemplate,
  validateTemplate,
  saveTemplate,
  createBackup,
  resetTemplate,
  getBackups,
  restoreBackup,
  TEMPLATE_JSON,
  TEMPLATE_DEFAULT,
  BACKUP_DIR,
  TEMPLATE_BASE,
  TEMPLATE_BASE_ORIGINAL
};
