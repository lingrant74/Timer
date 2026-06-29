// server.js — Express backend: REST API + background push notification worker
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const webpush = require('web-push');
const db      = require('./db');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────────────────────
// Allow requests from the frontend URL.
// FRONTEND_URL is set in .env — http://localhost:5173 locally,
// your Vercel/Netlify URL in production.
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ── VAPID setup ───────────────────────────────────────────────────────────
// VAPID keys let the browser push service verify that notifications come from
// your server.  Generate them once with:  npx web-push generate-vapid-keys
if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.error('ERROR: VAPID keys are missing. Copy .env.example to .env and add your keys.');
  process.exit(1);
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ── Routes ────────────────────────────────────────────────────────────────

// GET /api/subscriptions/public-key
// The frontend fetches this to subscribe the browser to push.
app.get('/api/subscriptions/public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/subscribe
// Body: { endpoint, keys: { p256dh, auth } }
// Saves the browser push subscription and returns its database id.
app.post('/api/subscribe', (req, res) => {
  const { endpoint, keys } = req.body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Invalid subscription object.' });
  }

  // Upsert: update keys if the endpoint is already stored
  db.prepare(`
    INSERT INTO subscriptions (endpoint, p256dh, auth)
    VALUES (?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth
  `).run(endpoint, keys.p256dh, keys.auth);

  const row = db.prepare('SELECT id FROM subscriptions WHERE endpoint = ?').get(endpoint);
  res.json({ subscriptionId: row.id });
});

// GET /api/timers
// Returns all timers, newest first.
app.get('/api/timers', (req, res) => {
  const rows = db.prepare('SELECT * FROM timers ORDER BY created_at DESC').all();
  res.json(rows.map(toView));
});

// POST /api/timers
// Body: { name, durationSeconds, subscriptionId }
app.post('/api/timers', (req, res) => {
  const { name, durationSeconds, subscriptionId } = req.body;

  if (!name || !durationSeconds || Number(durationSeconds) <= 0) {
    return res.status(400).json({ error: 'name and durationSeconds are required.' });
  }

  const endTime = Math.floor(Date.now() / 1000) + Number(durationSeconds);

  const result = db.prepare(`
    INSERT INTO timers (name, end_time, subscription_id)
    VALUES (?, ?, ?)
  `).run(name, endTime, subscriptionId ?? null);

  const timer = db.prepare('SELECT * FROM timers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(toView(timer));
});

// DELETE /api/timers/:id
app.delete('/api/timers/:id', (req, res) => {
  db.prepare('DELETE FROM timers WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Helper ────────────────────────────────────────────────────────────────

function toView(t) {
  return {
    id:             t.id,
    name:           t.name,
    endTime:        t.end_time,       // Unix seconds
    completed:      !!t.completed,
    subscriptionId: t.subscription_id,
    createdAt:      t.created_at,
  };
}

// ── Background worker ─────────────────────────────────────────────────────
// Runs every 5 seconds, finds timers that have expired, sends a push
// notification, and marks them completed.
const CHECK_INTERVAL_MS = 5000;

async function checkExpiredTimers() {
  const now = Math.floor(Date.now() / 1000);

  const expired = db.prepare(`
    SELECT t.*, s.endpoint, s.p256dh, s.auth
    FROM   timers t
    JOIN   subscriptions s ON s.id = t.subscription_id
    WHERE  t.end_time <= ? AND t.completed = 0
  `).all(now);

  for (const timer of expired) {
    // Mark completed immediately so a slow push can't cause a double notification
    db.prepare('UPDATE timers SET completed = 1 WHERE id = ?').run(timer.id);

    const subscription = {
      endpoint: timer.endpoint,
      keys: { p256dh: timer.p256dh, auth: timer.auth },
    };

    const payload = JSON.stringify({
      title:   'Timer done!',
      body:    `"${timer.name}" has finished.`,
      timerId: timer.id,
    });

    try {
      await webpush.sendNotification(subscription, payload);
      console.log(`[push] Notified: "${timer.name}" (id ${timer.id})`);
    } catch (err) {
      if (err.statusCode === 410) {
        // 410 Gone — the user revoked permission; clean up the subscription
        console.log(`[push] Subscription expired for timer ${timer.id}. Removing.`);
        db.prepare('DELETE FROM subscriptions WHERE endpoint = ?').run(timer.endpoint);
      } else {
        console.error(`[push] Error for timer ${timer.id}:`, err.message);
      }
    }
  }
}

setInterval(checkExpiredTimers, CHECK_INTERVAL_MS);

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
  console.log(`Checking for expired timers every ${CHECK_INTERVAL_MS / 1000}s`);
});
