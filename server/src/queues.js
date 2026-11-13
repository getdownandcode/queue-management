const express = require('express');
const db = require('./db');
const { requireAuth } = require('./auth');
const router = express.Router();
router.use(requireAuth);

function ownedQueue(req, res, next) {
  const id = Number(req.params.queueId || req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid queue id.' });
  const queue = db.prepare('SELECT id, name, created_at FROM queues WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!queue) return res.status(404).json({ error: 'Queue not found.' });
  req.queue = queue;
  next();
}

router.get('/queues', (req, res) => {
  res.json(db.prepare('SELECT q.id, q.name, q.created_at, (SELECT COUNT(*) FROM tokens t WHERE t.queue_id = q.id AND t.status = \'waiting\') AS waiting_count FROM queues q WHERE q.user_id = ? ORDER BY q.created_at DESC').all(req.user.id));
});
router.post('/queues', (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name) return res.status(400).json({ error: 'Queue name is required.' });
  if (name.length > 50) return res.status(400).json({ error: 'Queue name must be 50 characters or fewer.' });
  try {
    const result = db.prepare('INSERT INTO queues (user_id, name) VALUES (?, ?)').run(req.user.id, name);
    res.status(201).json(db.prepare('SELECT id, name, created_at FROM queues WHERE id = ?').get(result.lastInsertRowid));
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'You already have a queue with that name.' });
    throw error;
  }
});
router.get('/queues/:id', ownedQueue, (req, res) => {
  const waiting = db.prepare("SELECT id, token_number, name, status, position, created_at, started_at FROM tokens WHERE queue_id = ? AND status = 'waiting' ORDER BY position").all(req.queue.id);
  const serving = db.prepare("SELECT id, token_number, name, status, position, created_at, started_at FROM tokens WHERE queue_id = ? AND status = 'serving' ORDER BY started_at LIMIT 1").get(req.queue.id) || null;
  res.json({ ...req.queue, waiting, serving });
});
router.post('/queues/:queueId/tokens', ownedQueue, (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name) return res.status(400).json({ error: 'Person name is required.' });
  if (name.length > 100) return res.status(400).json({ error: 'Person name must be 100 characters or fewer.' });
  const add = db.transaction(() => {
    const max = db.prepare('SELECT COALESCE(MAX(token_number), 0) AS number FROM tokens WHERE queue_id = ?').get(req.queue.id).number;
    const pos = db.prepare("SELECT COUNT(*) AS count FROM tokens WHERE queue_id = ? AND status = 'waiting'").get(req.queue.id).count;
    const result = db.prepare("INSERT INTO tokens (queue_id, token_number, name, status, position) VALUES (?, ?, ?, 'waiting', ?)").run(req.queue.id, max + 1, name, pos);
    return db.prepare('SELECT id, token_number, name, status, position, created_at FROM tokens WHERE id = ?').get(result.lastInsertRowid);
  });
  res.status(201).json(add());
});
router.patch('/queues/:queueId/tokens/:tokenId/move', ownedQueue, (req, res) => {
  const direction = req.body.direction;
  if (direction !== 'up' && direction !== 'down') return res.status(400).json({ error: 'Direction must be up or down.' });
  const tokenId = Number(req.params.tokenId);
  const move = db.transaction(() => {
    const token = db.prepare("SELECT id, position FROM tokens WHERE id = ? AND queue_id = ? AND status = 'waiting'").get(tokenId, req.queue.id);
    if (!token) return { error: 'Waiting token not found.', status: 404 };
    const adjacentPosition = token.position + (direction === 'up' ? -1 : 1);
    const other = db.prepare("SELECT id FROM tokens WHERE queue_id = ? AND status = 'waiting' AND position = ?").get(req.queue.id, adjacentPosition);
    if (!other) return { error: 'Token is already at that end of the queue.', status: 400 };
    db.prepare('UPDATE tokens SET position = ? WHERE id = ?').run(token.position, other.id);
    db.prepare('UPDATE tokens SET position = ? WHERE id = ?').run(adjacentPosition, token.id);
    return { ok: true };
  });
  const result = move();
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json({ ok: true });
});
router.post('/queues/:queueId/serve', ownedQueue, (req, res) => {
  const serve = db.transaction(() => {
    const token = db.prepare("SELECT * FROM tokens WHERE queue_id = ? AND status = 'waiting' ORDER BY position LIMIT 1").get(req.queue.id);
    if (!token) return null;
    db.prepare("UPDATE tokens SET status = 'serving', started_at = datetime('now'), position = -1 WHERE id = ?").run(token.id);
    db.prepare("UPDATE tokens SET position = position - 1 WHERE queue_id = ? AND status = 'waiting' AND position > ?").run(req.queue.id, token.position);
    return db.prepare('SELECT id, token_number, name, status, position, created_at, started_at FROM tokens WHERE id = ?').get(token.id);
  });
  const token = serve();
  if (!token) return res.status(400).json({ error: 'There is no one waiting.' });
  res.json(token);
});
router.post('/queues/:queueId/tokens/:tokenId/done', ownedQueue, (req, res) => {
  const result = db.prepare("UPDATE tokens SET status = 'done', finished_at = datetime('now') WHERE id = ? AND queue_id = ? AND status = 'serving'").run(Number(req.params.tokenId), req.queue.id);
  if (!result.changes) return res.status(400).json({ error: 'Only a serving token can be marked done.' });
  res.json({ ok: true });
});
router.post('/queues/:queueId/tokens/:tokenId/cancel', ownedQueue, (req, res) => {
  const cancel = db.transaction(() => {
    const token = db.prepare("SELECT id, position FROM tokens WHERE id = ? AND queue_id = ? AND status = 'waiting'").get(Number(req.params.tokenId), req.queue.id);
    if (!token) return false;
    db.prepare("UPDATE tokens SET status = 'cancelled', cancelled_at = datetime('now'), position = -1 WHERE id = ?").run(token.id);
    db.prepare("UPDATE tokens SET position = position - 1 WHERE queue_id = ? AND status = 'waiting' AND position > ?").run(req.queue.id, token.position);
    return true;
  });
  if (!cancel()) return res.status(400).json({ error: 'Only a waiting token can be cancelled.' });
  res.json({ ok: true });
});
module.exports = router;
