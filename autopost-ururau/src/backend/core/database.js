/**
 * AutoPost Ururau — Database Core
 * SQLite wrapper com schema completo, migrations e backup
 * Fase 1 — Core
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.URURAU_DB_PATH || join(__dirname, '../../database/autopost.db');

// ============================================================
// SCHEMA COMPLETO
// ============================================================
const SCHEMA = `
-- Tabela principal: fila de notícias para processamento
CREATE TABLE IF NOT EXISTS posts_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    image_url TEXT,
    category TEXT DEFAULT 'geral',
    published_at TEXT,
    status TEXT DEFAULT 'pending', -- pending | generating | scheduled | published | failed | rolled_back | ignored
    priority INTEGER DEFAULT 0, -- 0=normal, 1=alta, 2=urgente
    manual_only INTEGER DEFAULT 0, -- 0=autoblog pode pegar, 1=só manual
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    processed_at TEXT,
    error_log TEXT,
    rollback_data TEXT,
    metadata TEXT -- JSON livre para extensões
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_queue_status ON posts_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_hash ON posts_queue(hash);
CREATE INDEX IF NOT EXISTS idx_queue_source ON posts_queue(source);
CREATE INDEX IF NOT EXISTS idx_queue_created ON posts_queue(created_at);

-- Tabela: publicações realizadas em cada plataforma
CREATE TABLE IF NOT EXISTS publications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    queue_id INTEGER NOT NULL,
    platform TEXT NOT NULL, -- instagram | facebook | twitter | linkedin | threads | tiktok | whatsapp
    post_id TEXT,
    post_url TEXT,
    status TEXT DEFAULT 'pending', -- pending | published | failed | deleted | rolled_back
    published_at TEXT,
    error_log TEXT,
    screenshot_path TEXT,
    media_paths TEXT, -- JSON array com caminhos das artes usadas
    caption TEXT, -- legenda usada
    engagement_data TEXT, -- JSON: likes, comments, shares
    FOREIGN KEY (queue_id) REFERENCES posts_queue(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pub_queue ON publications(queue_id);
CREATE INDEX IF NOT EXISTS idx_pub_platform ON publications(platform);
CREATE INDEX IF NOT EXISTS idx_pub_status ON publications(status);

-- Tabela: agendamentos manuais
CREATE TABLE IF NOT EXISTS scheduled_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    queue_id INTEGER NOT NULL,
    scheduled_for TEXT NOT NULL,
    platforms TEXT NOT NULL, -- JSON array
    template TEXT DEFAULT 'ururau-classic',
    custom_caption TEXT,
    custom_title TEXT,
    status TEXT DEFAULT 'scheduled', -- scheduled | published | cancelled | failed
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (queue_id) REFERENCES posts_queue(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sched_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_sched_time ON scheduled_posts(scheduled_for);

-- Tabela: log de auditoria (rollback, publicações, erros)
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL, -- publish | rollback | schedule | delete | error | generate | ignore
    queue_id INTEGER,
    platform TEXT,
    details TEXT,
    performed_by TEXT DEFAULT 'system',
    timestamp TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(timestamp);

-- Tabela: cache de legendas geradas (economia de tokens IA)
CREATE TABLE IF NOT EXISTS caption_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT UNIQUE NOT NULL, -- hash do conteúdo da notícia
    captions TEXT NOT NULL, -- JSON com legendas por plataforma
    model_used TEXT,
    generated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_caption_hash ON caption_cache(hash);

-- Tabela: configurações do sistema
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Seed de configurações padrão
INSERT OR IGNORE INTO system_config (key, value) VALUES
('autoblog_enabled', 'false'),
('max_posts_per_day', '25'),
('max_posts_per_hour', '4'),
('default_template', 'ururau-reels'),
('timezone', 'America/Sao_Paulo'),
('version', '1.0.0');
`;

// ============================================================
// CLASSE DATABASE
// ============================================================
class Database {
    constructor() {
        this.db = null;
    }

    async connect() {
        if (this.db) return this.db;

        // Garantir que o diretório existe
        const dbDir = dirname(DB_PATH);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        });

        // Habilitar WAL mode para melhor performance e concorrência
        await this.db.run('PRAGMA journal_mode = WAL;');
        await this.db.run('PRAGMA foreign_keys = ON;');

        return this.db;
    }

    async init() {
        const db = await this.connect();
        await db.exec(SCHEMA);
        console.log('✅ Database inicializado em:', DB_PATH);
        return db;
    }

    async migrate() {
        const db = await this.connect();
        // Aqui entram migrations futuras
        console.log('✅ Migrations aplicadas');
        return db;
    }

    async close() {
        if (this.db) {
            await this.db.close();
            this.db = null;
        }
    }

    // ============================================================
    // OPERACOES posts_queue
    // ============================================================

    async insertPost(post) {
        const db = await this.connect();
        const sql = `
            INSERT INTO posts_queue 
            (hash, source, url, title, summary, content, image_url, category, published_at, priority, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(hash) DO NOTHING
        `;
        const result = await db.run(sql, [
            post.hash,
            post.source,
            post.url,
            post.title,
            post.summary || null,
            post.content || null,
            post.image_url || null,
            post.category || 'geral',
            post.published_at || null,
            post.priority || 0,
            post.metadata ? JSON.stringify(post.metadata) : null
        ]);

        if (result.changes === 0) {
            return { inserted: false, reason: 'duplicate_hash' };
        }

        return { inserted: true, id: result.lastID };
    }

    async getPostByHash(hash) {
        const db = await this.connect();
        return db.get('SELECT * FROM posts_queue WHERE hash = ?', [hash]);
    }

    async getPostById(id) {
        const db = await this.connect();
        return db.get('SELECT * FROM posts_queue WHERE id = ?', [id]);
    }

    async getPendingPosts(limit = 50) {
        const db = await this.connect();
        return db.all(`
            SELECT * FROM posts_queue 
            WHERE status = 'pending' AND manual_only = 0
            ORDER BY priority DESC, created_at ASC
            LIMIT ?
        `, [limit]);
    }

    async updatePostStatus(id, status, errorLog = null) {
        const db = await this.connect();
        const sql = `
            UPDATE posts_queue 
            SET status = ?, processed_at = datetime('now', 'localtime'), error_log = ?
            WHERE id = ?
        `;
        return db.run(sql, [status, errorLog, id]);
    }

    async ignorePost(id, reason = 'manual_ignore') {
        const db = await this.connect();
        await db.run(
            "UPDATE posts_queue SET status = 'ignored', error_log = ? WHERE id = ?",
            [reason, id]
        );
        await this.logAudit('ignore', id, null, `Motivo: ${reason}`);
    }

    async getQueueStats() {
        const db = await this.connect();
        return db.get(`
            SELECT 
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
                COUNT(CASE WHEN status = 'rolled_back' THEN 1 END) as rolled_back,
                COUNT(*) as total
            FROM posts_queue
        `);
    }

    // ============================================================
    // OPERACOES publications
    // ============================================================

    async insertPublication(pub) {
        const db = await this.connect();
        const result = await db.run(`
            INSERT INTO publications 
            (queue_id, platform, post_id, post_url, status, screenshot_path, media_paths, caption)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            pub.queue_id,
            pub.platform,
            pub.post_id || null,
            pub.post_url || null,
            pub.status || 'pending',
            pub.screenshot_path || null,
            pub.media_paths ? JSON.stringify(pub.media_paths) : null,
            pub.caption || null
        ]);
        return result.lastID;
    }

    async getPublicationsByQueueId(queueId) {
        const db = await this.connect();
        return db.all('SELECT * FROM publications WHERE queue_id = ? ORDER BY published_at DESC', [queueId]);
    }

    async updatePublicationStatus(id, status, errorLog = null) {
        const db = await this.connect();
        return db.run(`
            UPDATE publications 
            SET status = ?, published_at = datetime('now', 'localtime'), error_log = ?
            WHERE id = ?
        `, [status, errorLog, id]);
    }

    // ============================================================
    // AUDIT LOG
    // ============================================================

    async logAudit(action, queueId = null, platform = null, details = '') {
        const db = await this.connect();
        return db.run(`
            INSERT INTO audit_log (action, queue_id, platform, details)
            VALUES (?, ?, ?, ?)
        `, [action, queueId, platform, details]);
    }

    async getAuditLog(limit = 100, action = null) {
        const db = await this.connect();
        if (action) {
            return db.all(
                'SELECT * FROM audit_log WHERE action = ? ORDER BY timestamp DESC LIMIT ?',
                [action, limit]
            );
        }
        return db.all('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?', [limit]);
    }

    // ============================================================
    // CAPTION CACHE
    // ============================================================

    async getCachedCaption(hash) {
        const db = await this.connect();
        return db.get('SELECT * FROM caption_cache WHERE hash = ?', [hash]);
    }

    async cacheCaption(hash, captions, modelUsed) {
        const db = await this.connect();
        return db.run(`
            INSERT OR REPLACE INTO caption_cache (hash, captions, model_used)
            VALUES (?, ?, ?)
        `, [hash, JSON.stringify(captions), modelUsed]);
    }

    // ============================================================
    // CONFIG
    // ============================================================

    async getConfig(key) {
        const db = await this.connect();
        const row = await db.get('SELECT value FROM system_config WHERE key = ?', [key]);
        return row ? row.value : null;
    }

    async setConfig(key, value) {
        const db = await this.connect();
        return db.run(`
            INSERT INTO system_config (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now', 'localtime')
        `, [key, value]);
    }

    // ============================================================
    // BACKUP
    // ============================================================

    async backup() {
        const backupPath = DB_PATH.replace('.db', `_backup_${new Date().toISOString().slice(0,10)}.db`);
        const db = await this.connect();
        await db.run(`VACUUM INTO '${backupPath}'`);
        return backupPath;
    }
}

// Singleton
const database = new Database();
export default database;
export { Database };

// CLI: node database.js --init
if (process.argv.includes('--init')) {
    await database.init();
    process.exit(0);
}
if (process.argv.includes('--migrate')) {
    await database.migrate();
    process.exit(0);
}
