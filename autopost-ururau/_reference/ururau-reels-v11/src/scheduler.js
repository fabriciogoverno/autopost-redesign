const cron = require('node-cron');
const db = require('./db');
const { generateReelsImage } = require('./generator');
const { generateCaption } = require('./caption');
const { publishToInstagram } = require('./instagram');
const { generateHash, checkDuplicate } = require('./hash');

let tasks = [];

function initScheduler() {
  tasks.forEach(t => t.stop());
  tasks = [];

  const enabled = db.prepare('SELECT value FROM settings WHERE key = ?').get('autoblog_enabled')?.value === '1';
  if (!enabled) {
    console.log('[Scheduler] Autoblog disabled');
    return;
  }

  const timesStr = db.prepare('SELECT value FROM settings WHERE key = ?').get('autoblog_times')?.value || '07:00,09:00,12:00,15:00,18:00,21:00';
  const times = timesStr.split(',').map(t => t.trim()).filter(t => t);

  times.forEach(time => {
    const parts = time.split(':');
    if (parts.length !== 2) return;
    const [hour, minute] = parts;
    const cronExpr = `${minute} ${hour} * * *`;
    const task = cron.schedule(cronExpr, async () => {
      console.log(`[Autoblog] Triggered at ${time}`);
      await runAutoblog();
    }, { scheduled: true, timezone: 'America/Sao_Paulo' });
    tasks.push(task);
  });

  console.log(`[Scheduler] ${tasks.length} jobs active: ${times.join(', ')}`);
}

async function runAutoblog() {
  const pending = db.prepare('SELECT * FROM posts WHERE status = ? AND scheduled_at <= datetime("now")').all('scheduled');

  for (const post of pending) {
    try {
      const result = await publishToInstagram(post.media_path, post.caption);
      db.prepare('UPDATE posts SET status = ?, published_at = datetime("now") WHERE id = ?').run('published', post.id);
      db.prepare('INSERT INTO logs (level, message) VALUES (?, ?)').run('info', `Published post ${post.id} to Instagram`);
    } catch (err) {
      db.prepare('UPDATE posts SET status = ?, error_message = ? WHERE id = ?').run('error', err.message, post.id);
      db.prepare('INSERT INTO logs (level, message) VALUES (?, ?)').run('error', `Failed to publish ${post.id}: ${err.message}`);
    }
  }
}

module.exports = { initScheduler, runAutoblog };
