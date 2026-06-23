#!/usr/bin/env bash
# Run ON the Hetzner server (invoked by the CD workflow, or manually) after the
# latest source has been placed in /opt/newcms. Installs deps, rebuilds the
# frontend, and restarts the services. Does NOT touch .env files.
set -euo pipefail
APP=/opt/newcms

echo "==> backend deps"
cd "$APP/Backend"
npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund

echo "==> frontend deps + build"
cd "$APP/Frontend"
npm ci --no-audit --no-fund || npm install --no-audit --no-fund
NODE_OPTIONS=--max-old-space-size=2048 npm run build

echo "==> restart services"
systemctl restart newcms-backend
systemctl restart newcms-frontend

echo "==> health"
sleep 4
curl -fsS http://127.0.0.1:5000/api/health && echo " backend OK"
echo "deploy done."
