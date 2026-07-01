require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const webpush = require('web-push');
const crypto  = require('crypto');
const db      = require('./db');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ── VAPID setup ──────────────────────────────────────────────────────────
if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.error('ERROR: VAPID keys are missing. Copy .env.example to .env and add your keys.');
  process.exit(1);
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ══════════════════════════════════════════════════════════════════════════
// SUBSCRIPTIONS
// ══════════════════════════════════════════════════════════════════════════

app.get('/api/subscriptions/public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

app.post('/api/subscribe', (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Invalid subscription object.' });
  }

  db.prepare(`
    INSERT INTO subscriptions (endpoint, p256dh, auth)
    VALUES (?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth
  `).run(endpoint, keys.p256dh, keys.auth);

  const row = db.prepare('SELECT id FROM subscriptions WHERE endpoint = ?').get(endpoint);
  res.json({ subscriptionId: row.id });
});

// ══════════════════════════════════════════════════════════════════════════
// TIMERS
// ══════════════════════════════════════════════════════════════════════════

app.get('/api/timers', (req, res) => {
  const rows = db.prepare('SELECT * FROM timers ORDER BY created_at DESC').all();
  res.json(rows.map(timerToView));
});

app.post('/api/timers', (req, res) => {
  const { name, durationSeconds, subscriptionId } = req.body;
  if (!name || !durationSeconds || Number(durationSeconds) <= 0) {
    return res.status(400).json({ error: 'name and durationSeconds are required.' });
  }

  const endTime = Math.floor(Date.now() / 1000) + Number(durationSeconds);
  const result = db.prepare(`
    INSERT INTO timers (name, end_time, subscription_id) VALUES (?, ?, ?)
  `).run(name, endTime, subscriptionId ?? null);

  const timer = db.prepare('SELECT * FROM timers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(timerToView(timer));
});

app.patch('/api/timers/:id', (req, res) => {
  const { adjustSeconds } = req.body;
  if (typeof adjustSeconds !== 'number') {
    return res.status(400).json({ error: 'adjustSeconds (number) is required.' });
  }

  const timer = db.prepare('SELECT * FROM timers WHERE id = ?').get(req.params.id);
  if (!timer) return res.status(404).json({ error: 'Timer not found.' });
  if (timer.completed) return res.status(400).json({ error: 'Cannot modify a completed timer.' });

  const now = Math.floor(Date.now() / 1000);
  const newEnd = Math.max(now + 1, timer.end_time + adjustSeconds);
  db.prepare('UPDATE timers SET end_time = ? WHERE id = ?').run(newEnd, timer.id);

  const updated = db.prepare('SELECT * FROM timers WHERE id = ?').get(timer.id);
  res.json(timerToView(updated));
});

app.delete('/api/timers/:id', (req, res) => {
  db.prepare('DELETE FROM timers WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

function timerToView(t) {
  return {
    id: t.id,
    name: t.name,
    endTime: t.end_time,
    completed: !!t.completed,
    subscriptionId: t.subscription_id,
    createdAt: t.created_at,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// RECORD COLUMNS
// ══════════════════════════════════════════════════════════════════════════

app.get('/api/record-columns', (req, res) => {
  const rows = db.prepare('SELECT * FROM record_columns ORDER BY sort_order ASC').all();
  res.json(rows.map((r) => ({
    id: r.id,
    name: { en: r.name_en, zh: r.name_zh },
    type: r.type,
  })));
});

app.put('/api/record-columns', (req, res) => {
  const columns = req.body;
  if (!Array.isArray(columns)) {
    return res.status(400).json({ error: 'Body must be an array of columns.' });
  }

  const replaceAll = db.transaction((cols) => {
    db.prepare('DELETE FROM record_columns').run();
    const insert = db.prepare('INSERT INTO record_columns (id, name_en, name_zh, type, sort_order) VALUES (?, ?, ?, ?, ?)');
    cols.forEach((col, i) => {
      insert.run(col.id, col.name?.en || '', col.name?.zh || '', col.type || 'text', i);
    });
  });
  replaceAll(columns);

  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════
// RECORDS (rows)
// ══════════════════════════════════════════════════════════════════════════

app.get('/api/records', (req, res) => {
  const rows = db.prepare('SELECT * FROM records ORDER BY created_at DESC').all();
  res.json(rows.map(recordToView));
});

app.post('/api/records', (req, res) => {
  const { data, customFields, reminder, dueDate, subscriptionId } = req.body;
  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO records (id, data, custom_fields, reminder, due_date, subscription_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    JSON.stringify(data || {}),
    JSON.stringify(customFields || []),
    reminder || '',
    dueDate || '',
    subscriptionId ?? null
  );

  const record = db.prepare('SELECT * FROM records WHERE id = ?').get(id);
  res.status(201).json(recordToView(record));
});

app.patch('/api/records/:id', (req, res) => {
  const record = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ error: 'Record not found.' });

  const { data, customFields, reminder, dueDate } = req.body;

  const newData = data !== undefined ? JSON.stringify(data) : record.data;
  const newCustom = customFields !== undefined ? JSON.stringify(customFields) : record.custom_fields;
  const newReminder = reminder !== undefined ? reminder : record.reminder;
  const newDueDate = dueDate !== undefined ? dueDate : record.due_date;

  // Reset notified flag if reminder or due date changed
  let notified = record.notified;
  if (reminder !== undefined || dueDate !== undefined) {
    notified = 0;
  }

  db.prepare(`
    UPDATE records SET data = ?, custom_fields = ?, reminder = ?, due_date = ?, notified = ?
    WHERE id = ?
  `).run(newData, newCustom, newReminder, newDueDate, notified, req.params.id);

  const updated = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id);
  res.json(recordToView(updated));
});

app.delete('/api/records/:id', (req, res) => {
  db.prepare('DELETE FROM records WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.delete('/api/records', (req, res) => {
  db.prepare('DELETE FROM records').run();
  res.json({ success: true });
});

function recordToView(r) {
  return {
    id: r.id,
    data: JSON.parse(r.data),
    customFields: JSON.parse(r.custom_fields),
    reminder: r.reminder,
    dueDate: r.due_date,
    notified: !!r.notified,
    subscriptionId: r.subscription_id,
    createdAt: r.created_at,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// BACKGROUND WORKERS
// ══════════════════════════════════════════════════════════════════════════

// Timer expiry check — every 5 seconds
async function checkExpiredTimers() {
  const now = Math.floor(Date.now() / 1000);
  const expired = db.prepare(`
    SELECT t.*, s.endpoint, s.p256dh, s.auth
    FROM timers t
    JOIN subscriptions s ON s.id = t.subscription_id
    WHERE t.end_time <= ? AND t.completed = 0
  `).all(now);

  for (const timer of expired) {
    db.prepare('UPDATE timers SET completed = 1 WHERE id = ?').run(timer.id);
    await sendPush(timer, {
      title: 'Timer done!',
      body: `"${timer.name}" has finished.`,
    });
  }
}

// Record reminder check — every 60 seconds
const REMINDER_MINUTES = { '15m': 15, '1h': 60, '1d': 1440 };

async function checkRecordReminders() {
  const now = Date.now();
  const records = db.prepare(`
    SELECT r.*, s.endpoint, s.p256dh, s.auth
    FROM records r
    JOIN subscriptions s ON s.id = r.subscription_id
    WHERE r.due_date != '' AND r.reminder != '' AND r.notified = 0
  `).all();

  for (const record of records) {
    const dueMs = new Date(record.due_date + 'T23:59:59').getTime();
    const minutes = REMINDER_MINUTES[record.reminder];
    if (!minutes) continue;

    const alertAt = dueMs - minutes * 60 * 1000;
    if (now >= alertAt) {
      db.prepare('UPDATE records SET notified = 1 WHERE id = ?').run(record.id);
      const data = JSON.parse(record.data);
      const label = data.name || data.address || 'Record';
      await sendPush(record, {
        title: 'Reminder',
        body: `"${label}" is due soon.`,
      });
    }
  }
}

async function sendPush(row, { title, body }) {
  const subscription = {
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth },
  };
  const payload = JSON.stringify({ title, body });

  try {
    await webpush.sendNotification(subscription, payload);
    console.log(`[push] Sent: "${title}" — ${body}`);
  } catch (err) {
    if (err.statusCode === 410) {
      db.prepare('DELETE FROM subscriptions WHERE endpoint = ?').run(row.endpoint);
      console.log(`[push] Subscription expired, removed.`);
    } else {
      console.error(`[push] Error:`, err.message);
    }
  }
}

setInterval(checkExpiredTimers, 5000);
setInterval(checkRecordReminders, 60000);

// ── Start ────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
