# NovaWorks AI Project Manager — The Infinity Hack '26

**Team:** <team name> · **Live link:** <url or "local demo"> · **Demo video:** <url>

Paste a meeting transcript → AI creates projects, tasks, owners, deadlines and estimated hours → role-based views.

## Stack
Node.js + Express (sessions, bcrypt) · SQLite (better-sqlite3) · Vanilla JS + Tailwind frontend (`public/`) · LLM via Gemini / Anthropic / OpenAI (set in `.env`).

## Working features
Login/logout · Admin home with all projects + **Create from Transcript** · read-only team directory · project list/detail · task rows (title, description, assignee, deadline, hours) · manager view (own projects only) · agent **My Tasks** (own tasks only) · persistent DB · all-or-nothing save · validation errors with editable draft + re-validate · double-click protection.
Access rules are enforced in the API (`db.js`), not just hidden in the UI.

## Run locally
```bash
npm install
cp .env.example .env        # put ONE API key in .env
npm run seed                # creates the 10 demo users (idempotent; also runs on server start)
npm start                   # http://localhost:3000
npm test                    # backend access-control tests (stubbed AI, offline)
```
Env vars: `LLM_PROVIDER, GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, LLM_MODEL, SESSION_SECRET, PORT, DB_PATH`.

## Demo accounts (fictional) — password `Demo123!`
admin · ayesha · bilal · hina · ali · hamza · sara · usman · zain · maryam — all `@novaworks.example`

## Test the transcript flow
1. Log in as `admin@novaworks.example` → **Create from Transcript** → paste the supplied transcript → Create.
2. Expect 3 projects / 12 tasks (UrbanCart 40h, QuickServe 46h, HelpDeskPro 38h).
3. Log in as Ayesha (only UrbanCart), Ali (3 tasks), Hamza (2 tasks across 2 projects).
4. Change a value in the transcript (e.g. QuickServe integration → 12h, 23 Oct) and re-run to show real AI conversion.

## Deployment
<platform, DB provider, steps — fill in>. Note: SQLite on an ephemeral host (e.g. Render free tier) resets on restart; use a persistent disk or hosted Postgres.

## Known limitations
No signup/reset/user management, cost or progress tracking (out of scope). In-memory session store (fine for a demo). AI output is always validated before saving; unresolved output saves nothing.
