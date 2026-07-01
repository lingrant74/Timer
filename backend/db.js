const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'timers.db'));

db.pragma('journal_mode = WAL');

// Push subscriptions
db.exec(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint  TEXT    UNIQUE NOT NULL,
    p256dh    TEXT    NOT NULL,
    auth      TEXT    NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`);

// Timers
db.exec(`
  CREATE TABLE IF NOT EXISTS timers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    end_time        INTEGER NOT NULL,
    completed       INTEGER DEFAULT 0,
    subscription_id INTEGER,
    created_at      INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
  )
`);

// Record columns schema
db.exec(`
  CREATE TABLE IF NOT EXISTS record_columns (
    id         TEXT PRIMARY KEY,
    name_en    TEXT NOT NULL,
    name_zh    TEXT NOT NULL,
    type       TEXT NOT NULL DEFAULT 'text',
    sort_order INTEGER NOT NULL DEFAULT 0
  )
`);

// Records (rows)
db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id              TEXT PRIMARY KEY,
    data            TEXT NOT NULL DEFAULT '{}',
    custom_fields   TEXT NOT NULL DEFAULT '[]',
    reminder        TEXT DEFAULT '',
    due_date        TEXT DEFAULT '',
    notified        INTEGER DEFAULT 0,
    subscription_id INTEGER,
    created_at      INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
  )
`);

// Seed default columns if table is empty
const colCount = db.prepare('SELECT COUNT(*) as cnt FROM record_columns').get();
if (colCount.cnt === 0) {
  const insert = db.prepare('INSERT INTO record_columns (id, name_en, name_zh, type, sort_order) VALUES (?, ?, ?, ?, ?)');
  const defaults = [
    ['address', 'Address', '地址', 'text', 0],
    ['idNumber', 'ID', '编号', 'text', 1],
    ['name', 'Name', '姓名', 'text', 2],
    ['personInCharge', 'Person in Charge', '经办人', 'text', 3],
    ['handlerSignature', 'Handler Signature', '经手签名', 'text', 4],
    ['amount', 'Amount', '金额', 'number', 5],
    ['dueDate', 'Due Date', '到期日', 'date', 6],
    ['reminder', 'Reminder', '提醒', 'reminder', 7],
  ];
  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(...row);
  });
  insertMany(defaults);
}

module.exports = db;
