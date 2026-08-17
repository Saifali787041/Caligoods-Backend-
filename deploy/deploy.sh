#!/usr/bin/env bash
# Zero-downtime-ish deploy: pull, install prod deps, ensure DB, reload PM2.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/caligoods/api}"
cd "$APP_DIR"

echo "==> Pulling latest"
git pull --ff-only

echo "==> Installing production dependencies"
npm ci --omit=dev

echo "==> Ensuring database (tables + roles)"
npm run db:init

echo "==> Reloading PM2 (graceful)"
pm2 reload ecosystem.config.js --update-env
pm2 save

echo "==> Done. Health:"
curl -fsS http://127.0.0.1:4000/api/health && echo
