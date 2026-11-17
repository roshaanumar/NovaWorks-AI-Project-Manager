# NovaWorks AI Project Manager (Infinity Hack '26)

**NovaWorks AI Project Manager** is an autonomous, demo-ready project management CRM engineered for NovaWorks Technologies. It transforms unstructured client delivery meeting transcripts and discussion notes into fully scheduled projects and granular task workstreams with automatic project manager selection, agent skill-matching, deadline reconciliation, and rejected-scope omission.

---

## ⚡ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS (incorporating NovaWorks Stitch Design System with *Plus Jakarta Sans* & *Inter* typography, Glassmorphism, and ambient AI luminescence)
- **Backend**: Node.js, Express (RESTful JSON API)
- **Database**: SQLite with Prisma ORM
- **AI Engine**: Gemini API (`@google/generative-ai`) with structured JSON schema enforcement and deterministic fallback resilience
- **Authentication & Security**: `express-session` with persistent SQLite Prisma store, `bcryptjs` (salt cost 10), `zod` schema validation, `helmet`, CORS with credentials, and IP login rate-limiting

---

## 👥 Seeded Demo Accounts

All 10 official challenge accounts are seeded in SQLite. The universal demo password is **`Demo123!`**. Plaintext passwords and hashes are never stored in plaintext or exposed over the API.

| ID | Name | Email | Role | Specialization | Assigned Skills | Password |
|---|---|---|---|---|---|---|
| **ADMIN** | Admin | `admin@novaworks.example` | **ADMIN** | Administrator | Company overview, transcript creation | `Demo123!` |
| **PM01** | Ayesha Khan | `ayesha@novaworks.example` | **MANAGER** | Manager / Web PM | Web projects, client coordination | `Demo123!` |
| **PM02** | Bilal Ahmed | `bilal@novaworks.example` | **MANAGER** | Manager / Mobile PM | Mobile projects, delivery planning | `Demo123!` |
| **PM03** | Hina Malik | `hina@novaworks.example` | **MANAGER** | Manager / AI PM | AI projects, requirement review | `Demo123!` |
| **DEV01** | Ali Raza | `ali@novaworks.example` | **AGENT** | Agent / Full-Stack | React, frontend integration | `Demo123!` |
| **DEV02** | Hamza Shah | `hamza@novaworks.example` | **AGENT** | Agent / Full-Stack | Node.js, databases, APIs | `Demo123!` |
| **DEV03** | Sara Noor | `sara@novaworks.example` | **AGENT** | Agent / App Developer | Flutter, mobile UI | `Demo123!` |
| **DEV04** | Usman Tariq | `usman@novaworks.example` | **AGENT** | Agent / App Developer | Flutter, integration, testing | `Demo123!` |
| **DEV05** | Zain Abbas | `zain@novaworks.example` | **AGENT** | Agent / AI Developer | LLMs, extraction, prompts | `Demo123!` |
| **DEV06** | Maryam Asif | `maryam@novaworks.example` | **AGENT** | Agent / AI Developer | Retrieval, document processing | `Demo123!` |

---

## 🛡️ Role-Based Access Control (RBAC) Matrix

Authorization is strictly enforced server-side inside queries using session credentials loaded from the database on every request (`req.user`). Any caller-forged roles or user IDs in HTTP bodies or headers are disregarded.

| Endpoint | Method | ADMIN | MANAGER | AGENT | Enforcement Rule |
|---|---|:---:|:---:|:---:|---|
| `/api/auth/login` | POST | ✅ | ✅ | ✅ | Rate-limited, regenerates session, sets `httpOnly` cookie |
| `/api/auth/logout` | POST | ✅ | ✅ | ✅ | Destroys session and purges cookie |
| `/api/auth/me` | GET | ✅ | ✅ | ✅ | Returns authenticated user without password hashes |
| `/api/projects` | GET | ✅ | ⚠️ Scoped | ❌ 403 | Admin sees all projects; Manager sees only `managerId == user.id`; Agent receives 403 |
| `/api/projects/:id` | GET | ✅ | ⚠️ Scoped | ❌ 403 | Admin views any; Manager views only managed project (403 otherwise); Agent receives 403 |
| `/api/tasks/my` | GET | ✅ | ✅ | ✅ Scoped | Agent sees only tasks where `assigneeId == user.id` with limited project metadata |
| `/api/team` | GET | ✅ | ✅ | ❌ 403 | Admin and Managers view roster with skills; Agent receives 403 |
| `/api/ai/parse-transcript` | POST | ✅ | ❌ 403 | ❌ 403 | Admin only; extracts draft without saving |
| `/api/projects/create-from-transcript` | POST | ✅ | ❌ 403 | ❌ 403 | Admin only; atomic transaction with UUID idempotency |

---

## 🧠 AI Transcript Flow Architecture

1. **Preview Step (`POST /api/ai/parse-transcript`)**:
   - The backend retrieves the team roster from SQLite (sanitized to `id`, `name`, `role`, `specialization`, and `skills` only; passwords and hashes are omitted).
   - The prompt instructs Gemini (or deterministic fallback) with strict system rules:
     - Assign only to provided employee IDs with best specialization match.
     - Select a user with role `MANAGER` as project manager.
     - **Honor Final Corrections**: The last agreed decision in the transcript overrides earlier statements (e.g. deadline changed from 18 to 20 October; task estimate revised from 8 to 10 hours; testing assigned to Maryam).
     - **Omit Dropped Scope**: Explicitly excludes rejected features (e.g. no real payment gateways, no inventory sync, no live maps).
   - Generates structured JSON adhering to the Zod schema. Malformed responses trigger an automatic retry.
   - **Nothing is committed to the database in this step**.
2. **Review & Confirm Step (`POST /api/projects/create-from-transcript`)**:
   - The frontend displays an editable draft allowing field adjustments and task additions/removals.
   - A client-generated UUID idempotency key is submitted with the draft.
   - **Strict Server-Side Validation**:
     - `managerId` must exist with role `MANAGER`.
     - `assigneeId` must exist with role `AGENT`.
     - Estimated hours must be numbers `> 0`.
     - Every task deadline must be on or before the project deadline (`taskDeadline <= projectDeadline`).
     - At least 1 task is required.
   - **Atomic Transaction (`prisma.$transaction`)**: All project and task records are saved together. Any failure rolls back the entire batch.
   - **Idempotency**: Repeat submissions with the same key return the previously created project rather than creating duplicates.

---

## 🚀 Setup & Execution Guide

### Prerequisites
- Node.js (v18+)
- npm

### 1. Installation
Clone the repository and install dependencies:
```bash
# Install root, server, and client dependencies
npm install --prefix server
npm install --prefix client
```

### 2. Environment Setup
Configure your environment variables in `server/.env`:
```bash
cp .env.example server/.env
```
*(If you have a Gemini API key, add it to `GEMINI_API_KEY` in `server/.env`. The application also includes an offline deterministic fallback parser for full functionality without an external key.)*

### 3. Database Migration & Seeding
```bash
# Push Prisma schema to SQLite
npm run prisma:generate --prefix server
npm run db:push --prefix server

# Seed the 10 official demo accounts
npm run prisma:seed --prefix server
```

### 4. Running the Application
Start both the backend server and frontend development client:
```bash
# Start concurrently from root
npm run dev
```
Or run separately in two terminals:
- **Server**: `npm run dev --prefix server` (runs on `http://localhost:5000`)
- **Client**: `npm run dev --prefix client` (runs on `http://localhost:5173`)

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Acceptance Test Suite

To run the automated acceptance test suite verifying all 12 core requirements (auth, session invalidation, RBAC, tamper resistance, AI corrections, invalid draft rejection, transaction rollback, and idempotency):

```bash
cd server
node test-suite.js
```
*Result: 65 passed assertions, 0 failed.*

---

## 🎬 3-Minute Demo Script

1. **Sign in as Admin** (`admin@novaworks.example` / `Demo123!`):
   - Click the "Quick Demo Account: Admin" button.
   - Notice the portfolio metrics and "Create from Transcript" button.
2. **Convert Meeting Transcript**:
   - Navigate to "AI Transcript".
   - Click the preset button **"UrbanCart (18→20 Oct, No Payment)"**.
   - Click **"Parse with AI"**.
   - Notice the AI draft automatically adopts the revised deadline (**2026-10-20** instead of 18 Oct), revised task date (**2026-10-19** instead of 17 Oct), and **excludes payment or inventory tasks**.
   - Click **"Confirm and Create Project"**. The project and all 4 tasks are atomically saved.
3. **Verify Manager Role Access**:
   - Log out and log in as **Ayesha Khan** (`ayesha@novaworks.example`).
   - Ayesha sees **UrbanCart Website** in her project list.
   - Log out and log in as **Bilal Ahmed** (`bilal@novaworks.example`).
   - Bilal's project list does NOT show UrbanCart.
4. **Verify Agent "My Tasks"**:
   - Log out and log in as **Ali Raza** (`ali@novaworks.example`).
   - The navigation switches to "My Tasks".
   - Ali sees his 3 assigned tasks (*Product catalog UI*, *Demo cart UI*, *Website integration and testing*) with project context.
   - Attempting to access `/api/projects` returns `403 Forbidden`.
5. **Persistence**:
   - Restart the server. All sessions, projects, and tasks remain fully persisted in the SQLite database.

---

## 📌 Assumptions & Decisions

1. **Session Store**: Implemented a SQLite-backed persistent session store using Prisma (`Session` table) to eliminate binary C++ compilation issues on Windows while ensuring persistence across server restarts.
2. **Seed Data**: Extracted the exact 10 challenge accounts from the official Infinity Hack '26 specification pack. A copy is stored in `server/prisma/seed-users.json`.
3. **Skills Storage**: SQLite does not support native string arrays; skills are stored as a JSON string in SQLite and parsed in the service layer.
4. **Gemini Resilience**: Built with `@google/generative-ai` with JSON schema enforcement. A deterministic fallback parser is integrated to guarantee demo availability even during offline conditions or API quota rate limits.
