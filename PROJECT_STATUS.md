# TableForTwo — Project Status Review

_Last updated: 2026-07-21. Owner (deploy/repo): abhishek (`adonekal@gmail.com`, GitHub `abhishek-donekal`, Vercel `adonekal-3029`). Original app author: yogesh._

---

## 1. What this project is

**TableForTwo** — a dating/date-planning app. Three layers, all deployed on one Vercel project + one Supabase DB:

- **Frontend** — Expo React Native app. `npx expo export -p web` builds a static web bundle to `dist/`, which Vercel serves. Same codebase can build native iOS/Android via Expo. Frontend calls the backend using **relative `/api` paths** (same-domain), so it is domain-agnostic.
- **Backend** — Vercel serverless functions in `api/` (Node.js). Uses **Prisma** ORM against **Supabase Postgres**. Not part of the Expo build — Vercel handles them independently.
- **Database** — Supabase Postgres. 9 tables (User, DateBroadcast, DateMatch, DateCommitment, VenueBooking, TransportBooking, GiftBooking, Transaction, LiveLocation). Schema is Prisma-managed.

---

## 2. Current live state

| Item | Value |
|---|---|
| **Production URL** | https://table-for-two-seven.vercel.app |
| **Vercel project** | `table-for-two` under `abhsiheks-projects-351d4109` (account `adonekal-3029`) |
| **Canonical GitHub repo** | https://github.com/abhishek-donekal/TableForTwo-RN (abhishek's fork) |
| **Upstream repo** | https://github.com/yogesh14051998-coder/TableForTwo-RN (yogesh's original) |
| **Supabase project** | `table-for-two`, ref `nntyujhcukxdaozkfbzg`, region us-east-1 |
| **Supabase API URL** | https://nntyujhcukxdaozkfbzg.supabase.co |
| **Local clone** | `C:\tf2` — `origin`=fork, `upstream`=yogesh |
| **Frontend** | ✅ Live, verified |
| **Backend (api/)** | ✅ Live, verified (cron/purge-locations returns 200, DB connects) |
| **DB connection** | ✅ Working via Prisma pooler |
| **Auto-deploy** | ✅ Push to fork `master` → Vercel auto-builds (verified) |

---

## 3. Full evolution / decision log

1. **Goal** — abhishek is a collaborator on yogesh's repo; wanted the app deployed on his own Vercel. It was already deployed under yogesh's Vercel account.
2. **Transfer investigated** — Vercel project transfer requires the **owner** (yogesh) AND transfer-to-Team needs a **Pro** plan. Account is Hobby → transfer **blocked**. Decision: **fresh deploy under abhishek** instead of transfer (everything lives in git + Supabase, so nothing is truly locked in yogesh's Vercel).
3. **Repo cloned** to `C:\tf2` and inspected.
4. **Two deploy-breaking bugs found in `package.json`:**
   - `@prisma/client`, `jsonwebtoken`, `stripe` were under a **non-standard `backendDependencies` key** that npm ignores → api/ functions would crash `Cannot find module`.
   - **No `prisma generate` step** → Prisma client never built.
   - (Consequence: yogesh's original deploy backend never actually worked — it also had no DB env vars.)
5. **Fix applied** — moved those 3 into real `dependencies`, added `"postinstall": "prisma generate"`. Committed `bcb7503`.
6. **Build validated locally** — `npm install` (596 pkgs, prisma client generated), `npx expo export -p web` → `dist/` produced.
7. **Vercel CLI** installed; already authenticated as `adonekal-3029`.
8. **First production deploy** via CLI → live.
9. **Fix pushed** to yogesh's `master` (abhishek has write access as collaborator).
10. **Supabase** — a `table-for-two` project already existed with the full schema applied (9 tables). No creation/migration needed.
11. **Env vars added** to Vercel production:
    - `JWT_SECRET`, `CRON_SECRET`, `T42_SYSTEM_ADMIN_KEY` — auto-generated random secrets.
    - `DATABASE_URL` — Supabase **transaction pooler** (port 6543) + `?pgbouncer=true&connection_limit=1` (required for Prisma on serverless).
    - **Gotcha fixed:** PowerShell pipe adds a trailing newline → `CRON_SECRET` broke as an HTTP header. Re-added all via bash `printf '%s'` (no newline).
    - Note: backend uses Prisma → Postgres directly; **no supabase-js**, so SUPABASE_URL / anon key are not needed by the app.
12. **Backend verified** — `GET /api/cron/purge-locations` with the cron secret returned `200 {"purged":0}`; without auth returned `401`. Confirms functions load, Prisma client generated, DB connects, auth guard works.
13. **Git auto-deploy set up** — `vercel git connect` to yogesh's repo failed (Vercel GitHub App can't be installed on a repo abhishek doesn't own). Decision: **fork** to `abhishek-donekal/TableForTwo-RN`, repoint local `origin` to fork (yogesh → `upstream`), connect Vercel to the fork. Verified an empty commit triggered an automatic production build.

---

## 4. Environment variables (Vercel production)

| Var | Status | Source |
|---|---|---|
| `DATABASE_URL` | ✅ set | Supabase transaction pooler + pgbouncer params |
| `JWT_SECRET` | ✅ set | generated |
| `CRON_SECRET` | ✅ set | generated |
| `T42_SYSTEM_ADMIN_KEY` | ✅ set | generated |
| `STRIPE_SECRET_KEY` | ❌ pending | Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | ❌ pending | Stripe dashboard |
| `FACEBOOK_PAGE_TOKEN` / `INSTAGRAM_ACCESS_TOKEN` / `TIKTOK_ACCESS_TOKEN` / `LINKEDIN_ACCESS_TOKEN` / `PINTEREST_ACCESS_TOKEN` / `SOCIAL_HOOK_SECRET` | ❌ optional | social features (`api/social-hook.js`) |
| `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID` | ❌ optional | voice features |
| `BG_CHECK_WEBHOOK_SECRET` | ❌ optional | background-check webhook |

---

## 5. Gaps & pending work

### Blocking backend features
- **Stripe not configured** — payment routes (`api/holds/*`, `api/vendors/book.js`, `api/webhooks/stripe.js`) won't work until `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` added, then redeploy. _(User deferred; reminder saved.)_

### Security
- **RLS disabled on all 9 Supabase tables** — anyone with the anon key could read/write every row via Supabase's REST API. The app itself is unaffected (uses Prisma server-side, not the anon key), but the DB is exposed. Fix: enable RLS + add policies. Remediation SQL available; not auto-applied (enabling RLS without policies blocks all access).
- **DB password was shared in plaintext chat** during setup — consider rotating it.

### Cleanup / polish
- **Hardcoded old URL** — `src/utils/paymentCompliance.ts:129` points to old `table-for-two-sigma.vercel.app/membership`. Repoint to new domain.
- **yogesh's old Vercel project** still exists (dead, no DB vars) — safe to delete; independent of repo + this deploy.
- **Custom domain** — none attached; currently on `*.vercel.app` auto subdomain.

### Native / mobile
- **Native iOS/Android build** not done — only web is deployed. Would need `expo build` / EAS for app store distribution.

### Repo hygiene
- Fork diverges from yogesh's `upstream`. To pull yogesh's future changes: `git fetch upstream && git merge upstream/master && git push origin master`.

---

## 6. Immediate next actions (recommended order)

1. Add Stripe keys → redeploy → verify payment route.
2. Enable RLS + policies on the 9 tables.
3. Rotate the Supabase DB password (was shared in chat).
4. Fix hardcoded URL in `paymentCompliance.ts:129`.
5. Delete yogesh's stale Vercel project.
6. (Optional) attach a custom domain.
7. (Later) native build via EAS for app stores.
