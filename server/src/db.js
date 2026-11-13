const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'queue-manager.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS queues (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, name)
  );
  CREATE TABLE IF NOT EXISTS tokens (
    id INTEGER PRIMARY KEY,
    queue_id INTEGER NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    token_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('waiting', 'serving', 'done', 'cancelled')),
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    started_at TEXT,
    finished_at TEXT,
    cancelled_at TEXT,
    UNIQUE(queue_id, token_number)
  );
  CREATE INDEX IF NOT EXISTS tokens_queue_status_position ON tokens(queue_id, status, position);
`);
module.exports = db;
