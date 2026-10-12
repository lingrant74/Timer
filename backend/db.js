const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const databasePath = process.env.DATABASE_PATH || path.join(__dirname, 'timers.db');
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const db = new Database(databasePath);

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
    ['topCustom1', 'Top Field 1', '上方自定义 1', 'text', 2],
    ['topCustom2', 'Top Field 2', '上方自定义 2', 'text', 3],
    ['topCustom3', 'Top Field 3', '上方自定义 3', 'text', 4],
    ['topCustom4', 'Top Field 4', '上方自定义 4', 'text', 5],
    ['topCustom5', 'Top Field 5', '上方自定义 5', 'text', 6],
    ['name', 'Name', '姓名', 'text', 7],
    ['agentName', 'Agent Name', '经纪人姓名', 'text', 8],
    ['agentCompany', 'Company', '经纪人公司', 'text', 9],
    ['agentPhone', 'Phone', '电话号码', 'tel', 10],
    ['mainCustom1', 'Custom 1', '自定义 1', 'text', 11],
    ['mainCustom2', 'Custom 2', '自定义 2', 'text', 12],
    ['mainCustom3', 'Custom 3', '自定义 3', 'text', 13],
    ['mainCustom4', 'Custom 4', '自定义 4', 'text', 14],
    ['mainCustom5', 'Custom 5', '自定义 5', 'text', 15],
    ['personInCharge', 'Person in Charge', '经办人', 'text', 16],
    ['handlerSignature', 'Handler Signature', '经手签名', 'text', 17],
    ['remarks', 'Remarks', '备注', 'textarea', 18],
    ['amount', 'Amount', '金额', 'number', 19],
    ['paid', 'Paid', '已付款', 'checkbox', 20],
    ['dueDate', 'Due Date', '到期日', 'date', 21],
    ['reminder', 'Reminder', '提醒', 'reminder', 22],
  ];
  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(...row);
  });
  insertMany(defaults);
}

const paidColumn = db.prepare("SELECT id FROM record_columns WHERE id = 'paid'").get();
if (!paidColumn) {
  const addPaid = db.transaction(() => {
    db.prepare('UPDATE record_columns SET sort_order = sort_order + 1 WHERE sort_order >= 20').run();
    db.prepare(`
      INSERT INTO record_columns (id, name_en, name_zh, type, sort_order)
      VALUES ('paid', 'Paid', '已付款', 'checkbox', 20)
    `).run();
  });
  addPaid();
}

// Add the default Remarks column to existing installations without changing
// any saved record data or the user's other column customizations.
const remarksColumn = db.prepare("SELECT id FROM record_columns WHERE id = 'remarks'").get();
if (!remarksColumn) {
  const addRemarks = db.transaction(() => {
    db.prepare('UPDATE record_columns SET sort_order = sort_order + 1 WHERE sort_order >= 18').run();
    db.prepare(`
      INSERT INTO record_columns (id, name_en, name_zh, type, sort_order)
      VALUES ('remarks', 'Remarks', '备注', 'textarea', 18)
    `).run();
  });
  addRemarks();
}

module.exports = db;
