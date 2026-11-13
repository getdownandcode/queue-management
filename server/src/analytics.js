const express = require('express');
const db = require('./db');
const { requireAuth } = require('./auth');
const router = express.Router();
router.use(requireAuth);

router.get('/queues/:queueId/analytics', (req, res) => {
  const id = Number(req.params.queueId);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid queue id.' });
  const queue = db.prepare('SELECT id FROM queues WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!queue) return res.status(404).json({ error: 'Queue not found.' });

  const summary = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM tokens WHERE queue_id = ? AND date(created_at) = date('now')) AS total_today,
      (SELECT COUNT(*) FROM tokens WHERE queue_id = ? AND status = 'waiting') AS currently_waiting,
      (SELECT COUNT(*) FROM tokens WHERE queue_id = ? AND date(cancelled_at) = date('now')) AS cancelled_today,
      COALESCE((SELECT AVG((julianday(started_at) - julianday(created_at)) * 1440) FROM tokens WHERE queue_id = ? AND started_at IS NOT NULL AND date(started_at) = date('now')), 0) AS average_wait_minutes,
      COALESCE((SELECT MAX((julianday(started_at) - julianday(created_at)) * 1440) FROM tokens WHERE queue_id = ? AND started_at IS NOT NULL AND date(started_at) = date('now')), 0) AS longest_wait_minutes
  `).get(id, id, id, id, id);

  const priorWaiting = db.prepare("SELECT COUNT(*) AS count FROM tokens WHERE queue_id = ? AND status = 'waiting' AND created_at < date('now')").get(id).count;
  const events = db.prepare(`
    SELECT strftime('%H', event_time) AS hour, SUM(delta) AS change
    FROM (
      SELECT created_at AS event_time, 1 AS delta FROM tokens WHERE queue_id = ? AND date(created_at) = date('now')
      UNION ALL
      SELECT started_at AS event_time, -1 AS delta FROM tokens WHERE queue_id = ? AND started_at IS NOT NULL AND date(started_at) = date('now')
      UNION ALL
      SELECT cancelled_at AS event_time, -1 AS delta FROM tokens WHERE queue_id = ? AND cancelled_at IS NOT NULL AND date(cancelled_at) = date('now')
    ) GROUP BY hour ORDER BY hour
  `).all(id, id, id);
  const changes = new Array(24).fill(0);
  for (const event of events) changes[Number(event.hour)] = event.change;
  let length = priorWaiting;
  const queueLengthByHour = changes.map((change, hour) => {
    length += change;
    return { hour: `${String(hour).padStart(2, '0')}:00`, length };
  });

  const waits = db.prepare(`
    SELECT strftime('%H', started_at) AS hour,
      AVG((julianday(started_at) - julianday(created_at)) * 1440) AS average_wait_minutes
    FROM tokens WHERE queue_id = ? AND started_at IS NOT NULL AND date(started_at) = date('now')
    GROUP BY hour ORDER BY hour
  `).all(id);
  const waitByHour = new Map(waits.map(row => [Number(row.hour), row.average_wait_minutes]));
  const averageWaitByHour = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    average_wait_minutes: waitByHour.get(hour) || 0
  }));
  res.json({ summary, queue_length_by_hour: queueLengthByHour, average_wait_by_hour: averageWaitByHour });
});
module.exports = router;
