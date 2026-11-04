# Daily Planner & Progress Tracker

A full-stack planner app: daily time-blocked task planning, automatic rollover
of incomplete tasks, notifications, permanent progress history, and a
lifetime overall progress score. Built as a PWA so it installs on mobile.

## Stack
- **Backend:** Node.js, Express, PostgreSQL, JWT auth, node-cron
- **Frontend:** React (Vite), react-router, installable PWA

## Project Structure
```
planner-app/
├── backend/
│   ├── src/
│   │   ├── db/            # schema.sql, connection pool, migration runner
│   │   ├── middleware/     # auth, account-lock check
│   │   ├── routes/         # auth, users, plans, tasks, progress, notifications
│   │   ├── jobs/            # rollover, missed-task reminders, plan-not-revised check
│   │   ├── utils/           # content safety filter, scoring logic
│   │   └── server.js
│   ├── uploads/             # profile photos land here
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/            # Login, Register, Planner, Progress, Profile
    │   ├── components/        # Navbar, TaskItem
    │   ├── context/            # AuthContext
    │   └── api/client.js
    └── vite.config.js
```

## Setup

### 1. Database
Install PostgreSQL, then create a database:
```bash
createdb planner_db
```

### 2. Backend
```bash
cd backend
cp .env.example .env      # then edit .env with your DB credentials + a JWT secret
npm install
npm run migrate           # applies schema.sql (tables + seed keywords)
npm run dev                # starts on http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                # starts on http://localhost:5173, proxies /api to backend
```

Open `http://localhost:5173`, register an account, and start planning.

### 4. Installing as a mobile app (PWA)
Run `npm run build && npm run preview` (or deploy the built frontend to any
static host over HTTPS), then open the site on a phone browser and choose
"Add to Home Screen." You'll want two square PNG icons at
`frontend/public/icons/icon-192.png` and `icon-512.png` for the install
prompt to look right — placeholders aren't included.

## How the key logic works

- **Rollover:** a cron job runs just after midnight, finds yesterday's
  incomplete tasks, and copies them into today's plan (`carried_over = true`).
  Users can edit or delete these like any other task.
- **Scoring:** a task counts toward the day it was actually marked complete
  (`completed_date`), not the day it was originally scheduled. Daily score =
  70% completion rate + 30% on-time rate (see `utils/scoring.js` — both
  weights are easy to tune).
- **Overall progress:** a lifetime average across all `daily_progress` rows,
  recalculated on every task update. It never resets; monthly views are just
  a filtered slice of the same permanent history.
- **Plan-not-revised nudge:** a daily cron job at a configurable cutoff hour
  checks whether each user touched today's plan; if not, sends a notification.
- **Content safety:** task text is checked against an editable
  `unlawful_keywords` table (crime-related terms only — robbery, theft,
  assault, drug dealing, etc.). A match blocks that task from being saved
  and logs the attempt. Three flagged attempts within 10 minutes triggers a
  1-hour account lock — a single flagged task does not lock the account,
  since keyword matching produces false positives on ordinary tasks (e.g.
  history homework). All thresholds are configurable in `.env`.

## Notes / next steps
- Push notifications currently just create rows in the `notifications`
  table (viewable via `/api/notifications`); the frontend doesn't yet poll
  or use browser push. Wiring up the Notifications page + Web Push /
  Firebase Cloud Messaging is the natural next step.
- The keyword-based content filter is intentionally simple for a project
  scope — a production system would want proper NLP-based moderation.
- No test suite is included yet; add Jest/Supertest for the backend routes
  before treating this as production-ready.
