# StudyQuest API

Express 5 + TypeScript backend for StudyQuest. It owns the content, the answer
keys and the grading rules, so the browser is never trusted with a score.

| | |
| --- | --- |
| Runtime | Node 20 · Express 5 · TypeScript (strict) |
| Data | Bundled sample content + in-memory learner state, behind `src/lib/store/types.ts` |
| Auth | Verifies Supabase access tokens as `Authorization: Bearer …` |
| UI | [Ernsci/studyquest-frontend](https://github.com/Ernsci/studyquest-frontend) (Next.js on Vercel) |
| Deploy | Render — blueprint `render.yaml` in this root |

Errors are always `{ "error": { "code", "message", "fieldErrors?" } }` — never a
stack trace. Client faults (malformed JSON → `400`, oversized body → `413`,
wrong content type → `415`) are reported as such, not as `500`.

## Endpoints

- `GET /health`, `GET /api/meta` — liveness plus the scoring/session configuration
  the UI needs (pass mark, XP values, session sizes, feature flags).
- Content: `/api/subjects`, `/api/subjects/:slug`,
  `/api/subjects/:slug/lessons/:lessonSlug`, `/api/subjects/:slug/practice`.
  Responses carry prompts only; `answer`, `explanation`, `expectedOutput` and
  `starterCode` stay on the server.
- Practice: `POST /api/practice/submit` grades server-side (`src/lib/grade.ts`),
  awards XP, records the attempt, marks the lesson complete, schedules missed
  questions for review and updates the activity heatmap.
- Learner: `/api/me` (GET/PATCH/DELETE), `/api/progress`, `/api/attempts`,
  `/api/bookmarks`, `/api/review`, `/api/plan`.
- Community: `POST /api/reports`, `POST /api/feedback`, `GET /api/reports/mine`.
- Admin (role-checked): `/api/admin/overview|users|content|reports|audit`,
  `PATCH /api/admin/reports/:id`.
- Demo accounts: `POST /api/auth/demo-session`, only while Supabase is not configured.

## Local development

```powershell
npm install
Copy-Item .env.example .env
npm run dev          # tsx watch -> http://localhost:8080
```

```powershell
Invoke-RestMethod http://localhost:8080/health
Invoke-RestMethod http://localhost:8080/api/subjects | ConvertTo-Json -Depth 4

$token = (Invoke-RestMethod -Method Post http://localhost:8080/api/auth/demo-session `
  -ContentType 'application/json' -Body '{"account":"demo-learner"}').token
Invoke-RestMethod http://localhost:8080/api/me -Headers @{ Authorization = "Bearer $token" }
```

`npm run typecheck` runs `tsc --noEmit`; `npm run build` emits to `dist/`.

## Environment

Copy `.env.example` → `.env`. On Render these are Environment Vars.

| Variable | Purpose |
| --- | --- |
| `PORT` | Set by Render; defaults to `8080`. |
| `CORS_ORIGINS` | Comma-separated browser origins allowed to call this API (the Vercel URL). |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Verify learner access tokens. |
| `SUPABASE_SECRET_KEY` | Service-role key; bypasses RLS, server-side only. |
| `ENABLE_DEMO_MODE` | `true` keeps the bundled sample content available. |
| `DEMO_PASSWORD` | Optional password required by `POST /api/auth/demo-session`. |

## Deploying to Render

1. Render → New → Blueprint → pick this repository. `render.yaml` sets the build
   (`npm ci && npm run build`), start (`npm start`) and health check (`/health`).
2. Fill the variables marked `sync: false` (`CORS_ORIGINS`, the Supabase keys,
   `DEMO_PASSWORD`) and deploy. Copy the public URL.
3. Set `CORS_ORIGINS` to the Vercel origin(s) of the frontend and redeploy.
   Requests from unlisted origins get no CORS headers (the browser blocks them)
   and are logged as warnings.

## Known limitations (read before connecting Supabase)

1. **The Supabase data layer is not written yet.** `src/lib/store/` has one
   implementation: bundled sample content plus learner state in memory. Both sit
   behind `StudyQuestStore` in `src/lib/store/types.ts`, so adding
   `store/supabase-*.ts` and selecting it in `store/index.ts` is the whole
   change. Until then the API **refuses to start** when Supabase is configured
   and `ENABLE_DEMO_MODE=false`, so a half-connected deployment can never look
   healthy.
2. **Demo state is per-process and in memory.** Restarting the API (or running
   two instances) resets or splits counters. Demo ids are deterministic
   (`sub_javascript`, `les_…`, `qs_javascript_1`), so progress re-attaches
   correctly once a real database exists.
3. **Demo tokens are not signed.** `demo.<userId>` exists so the split can be
   exercised without an account system; it is only accepted while Supabase is
   unconfigured.
4. **Rate limiting is per instance** (sliding window in memory). Move the buckets
   to Postgres/Redis when more than one instance runs.
