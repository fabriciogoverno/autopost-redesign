const crypto = require('crypto');

function generateHash(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(str).digest('hex');
}

function checkDuplicate(db, hash) {
  const row = db.prepare('SELECT id, status FROM posts WHERE hash = ?').get(hash);
  return row || null;
}

module.exports = { generateHash, checkDuplicate };
