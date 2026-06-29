# Timers — PWA with Push Notifications

A full-stack timer PWA. Add timers, get push notifications when they finish — even when the tab is closed.

## Project Structure

```
Timers/
├── backend/
│   ├── server.js        Express API + background push worker
│   ├── db.js            SQLite setup
│   ├── .env             Your secrets (create from .env.example)
│   └── .env.example
└── frontend/
    ├── public/
    │   ├── sw.js        Service worker (receives push, shows notification)
    │   ├── manifest.json
    │   ├── icon-192.png  Add your own icons here
    │   └── icon-512.png
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── api.js                      Backend fetch helpers
    │   ├── usePushNotifications.js     SW registration + subscribe logic
    │   ├── index.css
    │   └── components/
    │       ├── AddTimerForm.jsx        h/m/s form
    │       ├── TimerCard.jsx           Live countdown
    │       └── InstallInstructions.jsx iOS install guide
    ├── index.html
    ├── vite.config.js
    ├── .env                            Create from .env.example
    └── .env.example
```

---

## Local Setup

### 1. Generate VAPID keys (run once)

VAPID keys let your backend prove to Google/Mozilla push services that notifications come from you.

```bash
cd backend
npx web-push generate-vapid-keys
```

Copy the output — you'll need it in the next step.

### 2. Configure environment variables

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env: paste your VAPID keys and set FRONTEND_URL=http://localhost:5173

# Frontend
cd ../frontend
cp .env.example .env
# .env already defaults to http://localhost:3001 for local dev — no changes needed
```

### 3. Install dependencies

```bash
cd backend  && npm install
cd ../frontend && npm install
```

### 4. Run the app

Open two terminals:

```bash
# Terminal 1 — backend
cd backend
npm run server

# Terminal 2 — frontend
cd frontend
npm run dev
```

Open **http://localhost:5173**.

---

## Using the App

1. Click **Enable Notifications** and allow when the browser asks.
2. Fill in a timer name and duration, then tap **Start Timer**.
3. The backend checks every 5 seconds for expired timers and sends a push notification.
4. You'll receive the notification even if the tab is closed.

---

## iPhone / iOS

Push notifications on iOS require the app to be installed to the Home Screen.

> The app shows these steps automatically when opened on an iPhone.

1. Open the app in **Safari** (not Chrome or Firefox — they can't install PWAs on iOS).
2. Tap the **Share** button (⬆).
3. Choose **Add to Home Screen**.
4. Open the app from your **Home Screen**.
5. Tap **Enable Notifications**.

Requires iOS 16.4+.

---

## Deploying to Production

### Backend → Render

1. Push the `backend/` folder to a GitHub repo (or a monorepo).
2. Create a new **Web Service** on [Render](https://render.com).
3. Set the build command to `npm install` and start command to `node server.js`.
4. Add environment variables in the Render dashboard:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT`
   - `FRONTEND_URL` — your Vercel/Netlify URL, e.g. `https://your-app.vercel.app`
   - `PORT` — Render sets this automatically; you can omit it.

> **Note:** Render's free tier spins down after inactivity. The background timer checker stops while the server is asleep. Use a paid tier or a keep-alive service (e.g. UptimeRobot) if you need reliable notifications.

### Frontend → Vercel or Netlify

1. Push the `frontend/` folder to GitHub.
2. Import the repo on [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
3. Set the environment variable:
   - `VITE_API_URL` = your Render backend URL, e.g. `https://timers-api.onrender.com`
4. Deploy. Vercel/Netlify will run `npm run build` automatically.

---

## How It Works

```
Browser                        Backend
  │                               │
  │── POST /api/subscribe ────────▶  Stores push subscription in SQLite
  │                               │
  │── POST /api/timers ───────────▶  Stores timer with endTime = now + duration
  │                               │
  │                          [every 5s]
  │                               │  SELECT expired timers
  │                               │  webpush.sendNotification()
  │                               │  UPDATE timers SET completed = 1
  │                               │
  │◀── push event ────────────────│  Browser push infrastructure delivers it
  │                               │
[sw.js]                           │
  │  showNotification()           │
  ▼                               │
User sees notification (even with tab closed)
```
# Timer
