// db.js — creates the SQLite database and tables on first run.
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'timers.db'));

// WAL mode gives better read concurrency with Express
db.pragma('journal_mode = WAL');

// Push subscriptions — one row per browser/device
db.exec(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint  TEXT    UNIQUE NOT NULL,
    p256dh    TEXT    NOT NULL,
    auth      TEXT    NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`);

// Timers — each timer belongs to one subscription
db.exec(`
  CREATE TABLE IF NOT EXISTS timers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    end_time        INTEGER NOT NULL,   -- Unix timestamp (seconds)
    completed       INTEGER DEFAULT 0,
    subscription_id INTEGER,
    created_at      INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
  )
`);

module.exports = db;
