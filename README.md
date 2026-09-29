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
| `SUPABASE_SECRET_KEY` | Supabase secret key; server-side only and never expose it to the frontend. |
| `ENABLE_DEMO_MODE` | `true` uses bundled content and in-memory learner state; `false` selects the Supabase store. |
| `DEMO_PASSWORD` | Optional password required by `POST /api/auth/demo-session`. |

## Deploying to Render

1. Render → New → Blueprint → pick this repository. `render.yaml` sets the build
   (`npm ci --include=dev && npm run build`), start (`npm start`) and health check (`/health`).
2. Fill the variables marked `sync: false` (`CORS_ORIGINS`, the Supabase keys,
   `DEMO_PASSWORD`) and deploy. Copy the public URL.
3. Set `CORS_ORIGINS` to the Vercel origin(s) of the frontend and redeploy.
   Requests from unlisted origins get no CORS headers (the browser blocks them)
   and are logged as warnings.

## Connecting Supabase

1. In the Supabase SQL editor, run `supabase/schema.sql`, then `supabase/seed.sql`. The schema includes the transaction RPC used to store attempts, answers, XP, lesson progress, review items, and daily activity.
2. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SECRET_KEY` on the backend only. Set `ENABLE_DEMO_MODE=false` after applying the schema.
3. Create or sign up your admin user, then promote that account in the SQL editor:

   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

Never assign admin roles from signup metadata or browser requests.

Demo state remains per-process and in memory; restarting a demo deployment resets learner progress. Demo bearer tokens are accepted only when Supabase is not configured. Rate limiting is also per instance.
