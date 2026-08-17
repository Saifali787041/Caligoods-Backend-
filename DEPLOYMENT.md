# Caligoods API — Deployment (Ubuntu + PM2 + Nginx + SSL)

Target: Ubuntu 22.04/24.04 LTS. The API runs under PM2 (cluster mode, auto-restart)
behind Nginx, which terminates TLS and serves the SPA.

```
Internet ──▶ Nginx :443 (TLS)
                 ├── /api, /api-docs ──▶ PM2 cluster ──▶ Node :4000 ──▶ MySQL
                 └── /*              ──▶ /var/www/caligoods/dist (SPA)
                                              │
                                              └──▶ Zoho Inventory API (outbound)
```

## 1. Provision the server
```bash
sudo apt update && sudo apt upgrade -y
# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs mysql-server nginx
sudo npm install -g pm2
# Firewall
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

## 2. MySQL database + user
```bash
sudo mysql <<'SQL'
CREATE DATABASE caligoods CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'caligoods_user'@'localhost' IDENTIFIED BY 'STRONG_DB_PASSWORD';
GRANT ALL PRIVILEGES ON caligoods.* TO 'caligoods_user'@'localhost';
FLUSH PRIVILEGES;
SQL
```

## 3. Deploy the code
```bash
sudo mkdir -p /var/www/caligoods && sudo chown -R $USER:$USER /var/www/caligoods
cd /var/www/caligoods
git clone <your-repo-url> api && cd api
cp .env.production.example .env      # then edit with real secrets
# generate JWT secrets:
echo "JWT_ACCESS_SECRET=$(openssl rand -hex 32)"; echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"
npm ci --omit=dev
npm run db:init                      # create tables + seed the 6 roles (run ONCE)
npm run create-admin -- --email=you@caligoodsinc.com --password='Str0ngPass1' --role=super_admin
npm run zoho:ping                    # verify Zoho credentials/scope before going live
```

## 4. Start under PM2 (with boot persistence = automatic restart)
```bash
pm2 start ecosystem.config.js --env production
pm2 save                             # snapshot the process list
pm2 startup systemd                  # prints a command; run it to enable start-on-boot
pm2 install pm2-logrotate            # rotate logs (prevents unbounded growth)
pm2 status
```
PM2 restarts workers on crash (`autorestart`), on >500MB memory, and on reboot
(via the systemd unit from `pm2 startup`).

## 5. Nginx + domain
```bash
sudo cp deploy/nginx/caligoods.conf /etc/nginx/sites-available/caligoods.conf
sudo ln -s /etc/nginx/sites-available/caligoods.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo mkdir -p /var/www/caligoods/dist /var/www/certbot
sudo nginx -t && sudo systemctl reload nginx
```
Point the domain's DNS A/AAAA records (`caligoodsinc.com`, `www`) at the server IP.

## 6. SSL (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d caligoodsinc.com -d www.caligoodsinc.com
# Auto-renew is installed as a systemd timer; verify:
sudo certbot renew --dry-run
```

## 7. Frontend
When the React app is built (`npm run build`), copy its `dist/` to
`/var/www/caligoods/dist`. Until then, Nginx serves API/Swagger normally and the
web root simply 404s for `/`.

## 8. Updating (redeploys)
```bash
cd /var/www/caligoods/api
APP_DIR=$(pwd) ./deploy/deploy.sh     # pull, npm ci, db:init, pm2 reload (graceful), health check
```

## Operations
- **Health:** `GET /api/health` (used by the deploy script; wire it into your monitor/LB).
- **Logs:** `pm2 logs caligoods-api`; app logs also in `logs/combined.log` / `error.log`.
- **Env:** all secrets live in `.env` (chmod 600, never committed). Rotate the JWT
  secrets and Zoho refresh token if ever exposed.
- **Cluster & Zoho tokens:** each PM2 worker keeps its own in-memory access token
  but shares the persisted one in `zoho_tokens`, so refreshes stay well within
  Zoho's 10-tokens/10-min limit even across cores.
- **Schema changes:** `db:init` only *creates* missing tables. For column changes,
  adopt sequelize-cli migrations rather than enabling `alter` in production.
