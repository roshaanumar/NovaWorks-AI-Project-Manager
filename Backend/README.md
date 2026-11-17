# NovaWorks AI Project Manager — The Infinity Hack '26

**Team:** <team name> · **Live link:** <url or "local demo"> · **Demo video:** <url>

Paste a meeting transcript → AI creates projects, tasks, owners, deadlines and estimated hours → role-based views.

## Stack
Node.js + Express (signed-cookie sessions, bcrypt) · PostgreSQL (`pg` in production, embedded PGlite for local dev/tests) · Vanilla JS + Tailwind frontend (`public/`) · LLM via Gemini / Anthropic / OpenAI (set in `.env`).

## Working features
Login/logout · Admin home with all projects + **Create from Transcript** · read-only team directory · project list/detail · task rows (title, description, assignee, deadline, hours) · manager view (own projects only) · agent **My Tasks** (own tasks only) · persistent DB · all-or-nothing save · validation errors with editable draft + re-validate · double-click protection.
Access rules are enforced in the API (`db.js`), not just hidden in the UI.

## Run locally
```bash
npm install
cp .env.example .env        # put ONE API key in .env (leave DATABASE_URL empty to use the embedded local DB)
npm run seed                # creates the 10 demo users (idempotent; also runs on server start)
npm start                   # http://localhost:3000
npm test                    # backend access-control tests (stubbed AI, offline)
```
Env vars: `LLM_PROVIDER, GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, LLM_MODEL, SESSION_SECRET, DATABASE_URL, PORT, DB_PATH`.

## Demo accounts (fictional) — password `Demo123!`
admin · ayesha · bilal · hina · ali · hamza · sara · usman · zain · maryam — all `@novaworks.example`

## Test the transcript flow
1. Log in as `admin@novaworks.example` → **Create from Transcript** → paste the supplied transcript → Create.
2. Expect 3 projects / 12 tasks (UrbanCart 40h, QuickServe 46h, HelpDeskPro 38h).
3. Log in as Ayesha (only UrbanCart), Ali (3 tasks), Hamza (2 tasks across 2 projects).
4. Change a value in the transcript (e.g. QuickServe integration → 12h, 23 Oct) and re-run to show real AI conversion.

## Deployment (Vercel + Postgres)
1. Create a free Postgres database (Neon, Supabase, or Vercel Storage → Neon) and copy its connection string.
2. Vercel → **Add New → Project** → import this repo → set **Root Directory** to `Backend`, Framework **Other**, leave build/output settings as detected (`vercel.json` sets `public/` as the static output and routes `/api/*` to `api/index.js`).
3. Add Environment Variables: `DATABASE_URL`, `SESSION_SECRET` (long random string), `LLM_PROVIDER` + the matching key (`GEMINI_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`), optional `LLM_MODEL`.
4. Deploy. Tables and the 10 demo users are created automatically on the first request (idempotent). Open the URL and log in as `admin@novaworks.example` / `Demo123!`.

Sessions are signed cookies, so no server-side session store is needed. Transcript conversion may take a while; `maxDuration` is 60s in `vercel.json`.

## Known limitations
No signup/reset/user management, cost or progress tracking (out of scope). Signed-cookie sessions (a logout clears the cookie but cannot revoke an already-copied one before its 24h expiry). AI output is always validated before saving; unresolved output saves nothing.
