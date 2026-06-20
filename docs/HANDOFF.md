# New-CMS — Deployment & Handoff Notes

> Audience: a developer taking over the deployment of New-CMS.
> This document describes what exists, what was changed, and how to operate it.
> Last updated as part of the "deployment & CI/CD" change.

---

## 1. What this app is

Construction Management System. Three tiers:

| Tier | Tech | Port (local/server) |
|------|------|---------------------|
| **Frontend** | Next.js 16 (App Router, React 19) | 3000 |
| **Backend** | Express 5 (ESM), Mongoose | 5000 |
| **Database** | MongoDB | 27017 |
| **Auth** | **Keycloak** (OIDC) — all auth delegated here | 9090 (internal only) |

Key architectural facts:
- **The browser never talks to Keycloak directly.** The frontend calls the backend (`/api/v1/auth/login`); the backend talks to Keycloak server-side (admin REST + password grant). So Keycloak only needs to be reachable from the backend — it stays on `localhost`, never publicly exposed.
- The frontend is almost entirely **client-rendered** ("use client") and fetches everything from the backend API at runtime. There is no SSG/ISR benefit.
- Users live in **both** Keycloak (credentials + attributes) and MongoDB (linked by `keycloakId`). The `company/register` → `company/verifyOtp` flow provisions both. The signup OTP is **printed to the backend log** for non-email testing.

---

## 2. What changed in this change-set

These are source fixes required to build/run on **Linux** (the app previously only ran on a developer's Windows machine, whose case-insensitive filesystem hid real bugs):

1. **Case-sensitive import fixes** (would `Cannot find module` / fail `next build` on Linux):
   - `Frontend/.../Consumption/page.jsx` — imported `.../(project)/consumption/...`, real folder is `Consumption`.
   - `Backend/routes/task.routes.js` — imported `linkTaskToWO.controller.js`, real file is `linkTaskToWo.controller.js`.
   - `Backend/routes/helpDesk.routes.js` — imported `helpdesk.controller.js`, real file is `helpDesk.controller.js`.
   - `Backend/controllers/helpDesk.controller.js` — imported `helpdesk.models.js`, real file is `helpDesk.models.js`.
   - A CI step (`deploy/audit-case.mjs`) now fails the build if any case-mismatched relative import is reintroduced.

2. **`export const dynamic = "force-dynamic"` in `Frontend/src/app/layout.jsx`** — several pages use `useSearchParams()` which fails *static prerendering* during `next build`. The app is auth-gated and fully dynamic anyway, so this is the correct rendering mode and makes the production build pass.

3. **Deployment tooling added** under `deploy/`, CI/CD under `.github/workflows/`, and this doc.

No business-logic / feature code was changed.

---

## 3. Live environments

### A. Hetzner VPS — full stack (primary)

- **URL:** http://204.168.223.223  (HTTP only — see "Known issues")
- **Server:** Hetzner Cloud `cx33` (4 vCPU / 8 GB / 80 GB), Helsinki (`hel1`), Ubuntu 24.04. ~€8.99/mo.
- Everything runs natively via **systemd** (no Docker — Docker/WSL was broken on the dev machine; not needed on Linux):
  - `mongod` (apt, MongoDB 8) · `keycloak` (KC 26.6.3 on JDK 21, dev mode) · `newcms-backend` (node) · `newcms-frontend` (next start) · `nginx` (reverse proxy on :80).
- **Keycloak admin console:** http://204.168.223.223:9090/  (realm `Test_Cms`; admin user `admin`, password in the server `keycloak` unit / `Backend/.env`). Exposed on `:9090` for admin setup — see security note in §8.
- **nginx** routes: `/api/*` and `/socket.io/*` → backend :5000; everything else → frontend :3000. (`deploy/nginx/newcms.conf`)
- Firewall (ufw): only 22 + 80 open. Mongo/Keycloak are not reachable from outside.

### B. Cloudflare Workers — frontend only (HTTPS edge)

- **URL:** https://newcms-frontend.cognivaa.workers.dev
- Next.js frontend deployed to Cloudflare via the **OpenNext** adapter (`@opennextjs/cloudflare`). Account `cognivaa@gmail.com`, workers.dev subdomain `cognivaa`.
- **Mixed-content solution:** the frontend is built with `NEXT_PUBLIC_API_BASE_URL=/api/v1` (same-origin). A Next **proxy** (`deploy/cloudflare/proxy.js`, deployed as the app's middleware) forwards `/api/*` and `/socket.io/*` to the Hetzner backend **server-side** (`http://204-168-223-223.nip.io`), so the browser only ever makes HTTPS same-origin calls. This is the only way to talk HTTPS→HTTP-backend without a TLS cert on the backend.
- Build must use **webpack** (`next build --webpack`), not Turbopack — Turbopack's server chunks throw `ChunkLoadError` in the Workers runtime.
- See `deploy/cloudflare/README.md` for the exact build/deploy steps.

---

## 4. Demo accounts

All password **`Demo@12345`**, company "Demo Construction Co". Work on both URLs above.

| Email | Role | Access |
|-------|------|--------|
| `demo@cms.local` | Owner | full (the actual company owner) |
| `admin@cms.local` | Owner role | full (admin, not the owner flag) |
| `manager@cms.local` | Manager | view / create / edit / download on all modules |
| `viewer@cms.local` | Viewer | view / download only (read-only) |

Created via the app's own API (`deploy/.. create-demo-users` pattern): register → read OTP from the backend log → verify → reset the Keycloak password to a known value. Permission differences are enforced by `verifyToken` + `checkPermission` (verified: Viewer gets 403 on create).

---

## 5. Credentials & secrets (where they live — NOT stored in git)

| Secret | Location | Notes |
|--------|----------|-------|
| Keycloak admin (`admin`) password | server `/opt/newcms/Backend/.env` + the `keycloak` systemd unit | strong random; rotate by updating both + `systemctl restart keycloak newcms-backend` |
| Keycloak client secret (`cms-backend`) | server `/opt/newcms/Backend/.env` | regenerate in KC admin if leaked |
| Mongo | no auth (bound to localhost only) | add auth before exposing |
| SSH deploy key | dev machine `~/.ssh/hetzner_newcms` | used by CD; add the **private** key as the `HETZNER_SSH_KEY` GitHub secret |
| Hetzner API token | provided ad-hoc during provisioning | **ROTATE** — it was shared in plaintext during setup |
| Cloudflare | wrangler OAuth (`wrangler login`) on the dev machine | for CI, create a scoped API token (Workers Scripts: Edit) as `CLOUDFLARE_API_TOKEN` |

> Convention: real production passwords are not committed. `.env.example` files under `deploy/env/` document the required variables.

---

## 6. Running locally

See the team's local runbook. In short: MongoDB on :27017, a Keycloak instance with realm `Test_Cms` + confidential client `cms-backend` (Direct Access Grants on), `Backend/.env` + `Frontend/.env.local` (`NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1` — the `/api/v1` suffix is **required**), then `npm install` + run each tier. `deploy/keycloak/provision-realm.sh` provisions the realm/client/profile against any Keycloak.

---

## 7. Deploying

### Continuous (GitHub Actions)
- **`ci.yml`** runs on every PR/push: case-audit + `npm ci` + `next build` on Linux. This catches the class of bug listed in §2 before merge.
- **`deploy-hetzner.yml`** runs on push to `main`: rsyncs the repo to the server, installs deps, rebuilds the frontend, restarts the systemd services. Requires repo secrets `HETZNER_HOST` and `HETZNER_SSH_KEY`.

### Manual
- Hetzner: `deploy/server-deploy.sh` (run on the server) pulls the latest tree, `npm ci`, `next build`, restarts services.
- Cloudflare: `deploy/cloudflare/README.md`.

---

## 8. Known issues / things to improve

1. **No HTTPS on the Hetzner backend** (plain HTTP on a bare IP). Fine for testing; for production put it behind a domain (Cloudflare proxy / Let's Encrypt via Caddy). The Cloudflare frontend works around this with the server-side `/api` proxy.
2. **Keycloak runs in dev mode** (`start-dev`, file H2 DB). Fine for a demo; for production use `start` with a proper DB (Postgres) and a hostname.
3. **KC 26 strict user profile:** `firstName`/`lastName` were made **optional** on the `Test_Cms` realm (the app never sets them, so otherwise every user is "not fully set up" and cannot get a token). Unmanaged attributes are **enabled** (the app stores `companyId`, `roleId`, `isOwner`, etc. as user attributes). Both are applied by `deploy/keycloak/provision-realm.sh`.
4. **KC 24+ introspection audience (was a hard blocker):** `verifyToken` validates tokens via **introspection**, which on KC 24+ requires the introspecting client (`cms-backend`) to be in the token `aud`. By default it is not, so introspection returns `active=false` and **every authenticated route 401s** ("Token Expired"). Fixed with an **audience protocol-mapper** on the client (now in `provision-realm.sh`). If auth mysteriously breaks after a realm rebuild, check this first.
6. **Keycloak admin exposed over HTTP (deliberate, insecure):** to allow admin-console setup with no domain yet, Keycloak was bound to `0.0.0.0:9090` (ufw opened) and realms `master` + `Test_Cms` set to `sslRequired=NONE` (otherwise non-localhost hosts get `403 "HTTPS required"`). This means **the admin console + admin password go over plaintext HTTP**. Lock down ASAP: put it behind HTTPS (domain + Caddy/Cloudflare), restrict `:9090` to your IP (`ufw allow from <ip> to any port 9090` + delete the open rule), and set `sslRequired` back to `EXTERNAL`. The app itself uses `localhost:9090`, unaffected by these.
   - **Do NOT change these or the app breaks:** client `cms-backend` (Direct Access Grants ON + the `cms-backend-audience` mapper + secret must match `Backend/.env`); realm user profile (unmanaged attributes ENABLED, firstName/lastName optional); the `admin` account password is also used by the backend — if you change it, update `KEYCLOAK_ADMIN_PASSWORD` in `Backend/.env` + the `keycloak` unit and restart, or backend user-management breaks. Safer: make a *separate* admin user for console login.
7. **File uploads require R2 (was causing 500s):** all uploads go through `utils/uploadToR2.utils.js` → an S3 client pointed at Cloudflare R2. If the `R2_*` env vars are unset, every multipart POST/PATCH 500s with `"Resolved credential object is not valid"` (requests without a file are unaffected). Configured against R2 bucket **`newcms`** (public URL `https://pub-b684e7f0fce74db8a8d7190543413cbb.r2.dev`); the S3 keys live only in the server `Backend/.env`. See `deploy/env/backend.env.example`.
4. **Mongo has no auth** and **secrets are dev-grade.** Harden before real production.
5. **Cloudflare build must be webpack** and is currently built/deployed from a dev machine; wire `CLOUDFLARE_API_TOKEN` into CI to automate it.
