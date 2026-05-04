const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', 'database');
const DB_PATH = path.join(DB_DIR, 'db.json');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    return {
      posts: [],
      settings: {
        gemini_api_key: '',
        instagram_username: '',
        instagram_password: '',
        autoblog_enabled: '0',
        autoblog_times: '07:00,09:00,12:00,15:00,18:00,21:00',
        default_category: 'GERAL'
      },
      logs: [],
      _meta: { version: 1, created: new Date().toISOString() }
    };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {
    console.error('DB load error, creating fresh:', e.message);
    return { posts: [], settings: {}, logs: [], _meta: { version: 1 } };
  }
}

function saveDB(db) {
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_PATH);
}

let db = loadDB();

const DB = {
  _data: db,

  prepare(sql) {
    return {
      run(...params) {
        // INSERT INTO posts (...) VALUES (...)
        if (sql.includes('INSERT INTO posts')) {
          const post = {
            id: db.posts.length > 0 ? Math.max(...db.posts.map(p => p.id)) + 1 : 1,
            url: params[0] || '',
            title: params[1] || '',
            summary: params[2] || '',
            category: params[3] || 'GERAL',
            image_path: params[4] || '',
            caption: params[5] || '',
            hash: params[6] || '',
            status: params[7] || 'pending',
            created_at: new Date().toISOString(),
            published_at: null,
            scheduled_at: null,
            platform: params[8] || 'instagram',
            error_message: null,
            media_path: params[9] || ''
          };
          db.posts.push(post);
          saveDB(db);
          return { lastInsertRowid: post.id, changes: 1 };
        }

        // UPDATE posts SET ... WHERE id = ?
        if (sql.includes('UPDATE posts')) {
          if (sql.includes('status = ?') && sql.includes('published_at')) {
            const id = params[2];
            const post = db.posts.find(p => p.id === id);
            if (post) {
              post.status = params[0];
              post.published_at = new Date().toISOString();
              saveDB(db);
              return { changes: 1 };
            }
          }
          if (sql.includes('status = ?') && sql.includes('error_message')) {
            const id = params[2];
            const post = db.posts.find(p => p.id === id);
            if (post) {
              post.status = params[0];
              post.error_message = params[1];
              saveDB(db);
              return { changes: 1 };
            }
          }
          if (sql.includes('status = ?') && sql.includes('scheduled_at')) {
            const id = params[2];
            const post = db.posts.find(p => p.id === id);
            if (post) {
              post.status = params[0];
              post.scheduled_at = params[1];
              saveDB(db);
              return { changes: 1 };
            }
          }
          if (sql.includes('status = ?') && sql.includes('published_at = NULL')) {
            const id = params[1];
            const post = db.posts.find(p => p.id === id);
            if (post) {
              post.status = params[0];
              post.published_at = null;
              saveDB(db);
              return { changes: 1 };
            }
          }
          return { changes: 0 };
        }

        // DELETE FROM posts WHERE id = ?
        if (sql.includes('DELETE FROM posts')) {
          const id = params[0];
          const idx = db.posts.findIndex(p => p.id === id);
          if (idx >= 0) {
            db.posts.splice(idx, 1);
            saveDB(db);
            return { changes: 1 };
          }
          return { changes: 0 };
        }

        // INSERT INTO logs
        if (sql.includes('INSERT INTO logs')) {
          db.logs.push({
            id: db.logs.length + 1,
            level: params[0] || 'info',
            message: params[1] || '',
            created_at: new Date().toISOString()
          });
          if (db.logs.length > 500) db.logs = db.logs.slice(-500);
          saveDB(db);
          return { lastInsertRowid: db.logs.length, changes: 1 };
        }

        // DELETE FROM logs
        if (sql.includes('DELETE FROM logs')) {
          db.logs = [];
          saveDB(db);
          return { changes: 1 };
        }

        // INSERT OR IGNORE / UPDATE settings
        if (sql.includes('settings')) {
          const key = params[0];
          const value = params[1];
          if (!db.settings) db.settings = {};
          db.settings[key] = value;
          saveDB(db);
          return { changes: 1 };
        }

        return { changes: 0 };
      },

      get(...params) {
        // SELECT * FROM posts WHERE hash = ?
        if (sql.includes('posts') && sql.includes('hash')) {
          return db.posts.find(p => p.hash === params[0]) || undefined;
        }
        // SELECT * FROM posts WHERE id = ?
        if (sql.includes('posts') && sql.includes('id')) {
          return db.posts.find(p => p.id === params[0]) || undefined;
        }
        // SELECT value FROM settings WHERE key = ?
        if (sql.includes('settings')) {
          const val = db.settings?.[params[0]];
          return val !== undefined ? { value: val } : undefined;
        }
        // SELECT COUNT(*) as c FROM ...
        if (sql.includes('COUNT(*)')) {
          if (sql.includes('posts')) {
            if (sql.includes('date(created_at) = date')) return { c: db.posts.filter(p => p.created_at && p.created_at.startsWith(new Date().toISOString().slice(0,10))).length };
            if (sql.includes('>= datetime') && sql.includes('-7 days')) return { c: db.posts.filter(p => p.created_at && new Date(p.created_at) >= new Date(Date.now() - 7*24*60*60*1000)).length };
            if (sql.includes('status = ?')) {
              const status = params[0];
              return { c: db.posts.filter(p => p.status === status).length };
            }
            return { c: db.posts.length };
          }
          return { c: 0 };
        }
        // SELECT 1 as test
        if (sql.includes('SELECT 1')) return { test: 1 };
        return undefined;
      },

      all(...params) {
        // SELECT * FROM posts ORDER BY created_at DESC LIMIT 50
        if (sql.includes('posts') && sql.includes('ORDER BY created_at DESC')) {
          return [...db.posts].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);
        }
        // SELECT * FROM posts WHERE status = ? AND scheduled_at <= datetime("now")
        if (sql.includes('posts') && sql.includes('status') && sql.includes('scheduled_at')) {
          const now = new Date().toISOString();
          return db.posts.filter(p => p.status === params[0] && p.scheduled_at && p.scheduled_at <= now);
        }
        // SELECT * FROM settings
        if (sql.includes('settings')) {
          return Object.entries(db.settings || {}).map(([key, value]) => ({ key, value }));
        }
        // SELECT * FROM logs ORDER BY created_at DESC LIMIT 100
        if (sql.includes('logs')) {
          return [...db.logs].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 100);
        }
        return [];
      }
    };
  }
};

if (process.argv.includes('--init')) {
  db = loadDB();
  console.log('Database initialized at', DB_PATH);
  console.log('Posts:', db.posts.length, '| Logs:', db.logs.length);
  process.exit(0);
}

module.exports = DB;
