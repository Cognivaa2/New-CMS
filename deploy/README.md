# deploy/

Infrastructure & deployment assets for New-CMS. Start with **[../docs/HANDOFF.md](../docs/HANDOFF.md)**.

```
deploy/
├── provision-server.sh         # one-time: bootstrap a fresh Ubuntu 24.04 box
├── server-deploy.sh            # on-server: deps + frontend build + restart (used by CD)
├── audit-case.mjs              # CI guard: fails on case-mismatched relative imports
├── nginx/newcms.conf           # reverse proxy (:80 -> frontend :3000, /api -> backend :5000)
├── systemd/                    # keycloak / newcms-backend / newcms-frontend units
├── env/                        # *.example for Backend/.env, Frontend env, /etc/newcms/keycloak.env
├── keycloak/provision-realm.sh # create realm Test_Cms + client cms-backend (+ KC26 profile fixes)
└── cloudflare/                 # OpenNext config + /api proxy + deploy steps for the edge frontend
```

## First-time server setup (manual outline)
1. `bash provision-server.sh`
2. Place env files: `Backend/.env`, `Frontend/.env.production`, `/etc/newcms/keycloak.env` (see `env/*.example`).
3. Install units + nginx:
   ```bash
   cp systemd/*.service /etc/systemd/system/ && systemctl daemon-reload
   cp nginx/newcms.conf /etc/nginx/sites-available/newcms
   ln -sf /etc/nginx/sites-available/newcms /etc/nginx/sites-enabled/newcms
   rm -f /etc/nginx/sites-enabled/default && nginx -t && systemctl reload nginx
   systemctl enable --now keycloak
   ```
4. `KC_ADMIN_PW=... bash keycloak/provision-realm.sh`  -> copy the printed secret into `Backend/.env`.
5. Put the app in `/opt/newcms`, then `bash server-deploy.sh`.
6. `systemctl enable --now newcms-backend newcms-frontend`
7. `ufw allow 22 && ufw allow 80 && ufw --force enable`
8. Create the demo company via the API (register -> read OTP from `journalctl -u newcms-backend` -> verifyOtp -> reset its KC password).

## CI/CD
- `.github/workflows/ci.yml` — case-audit + backend syntax + frontend build, on every PR.
- `.github/workflows/deploy-hetzner.yml` — rsync + rebuild + restart on push to `main`
  (needs secrets `HETZNER_HOST`, `HETZNER_SSH_KEY`).
