# Live Inventory Only — Simplest Setup (no database)

This runs ONLY the public live inventory from Zoho Inventory. No database, no
MySQL, no SQLite, no login — just Zoho.

## Backend (Caligoods-Backend)
1. `.env` me ye hona chahiye (Zoho creds + ye 2 lines):
   ```
   LIVE_INVENTORY_ONLY=true
   WAREHOUSE_NAME=NEW CASH N CARRY

   ZOHO_CLIENT_ID=...
   ZOHO_CLIENT_SECRET=...
   ZOHO_REFRESH_TOKEN=...
   ZOHO_ORGANIZATION_ID=840592741
   ZOHO_ACCOUNTS_URL=https://accounts.zoho.com
   ZOHO_API_DOMAIN=https://www.zohoapis.com
   ZOHO_AUTH_MODE=oauth
   ```
   (JWT_ACCESS_SECRET / JWT_REFRESH_SECRET rehne do — validation ke liye; use nahi hote.)

2. Install + run:
   ```
   npm install
   npm run dev
   ```
   Terminal: `⚡ LIVE_INVENTORY_ONLY: running without a database` + `🚀 Server running at http://localhost:4000`.
   (Ab DB / MySQL / SQLite ki zaroorat NAHI — Node 24 par bhi chalega.)

3. Test: http://localhost:4000/api/catalog  → products JSON.

## Frontend (caligoods-storefront)
```
npm install
npm run dev
```
→ http://localhost:5174 → Live Inventory.

## Optional toggles (in backend .env)
- `WAREHOUSE_NAME=CALI GOODS WEBSITE`  -> read stock from a different warehouse
- `SHOW_IN_STORE_ONLY=true`            -> show only Zoho "Show in Store = true" items
- `LOW_STOCK_THRESHOLD=5`              -> 1..N units = Limited, above = Available
- `LIVE_INVENTORY_ONLY=false`          -> re-enable the full app (login/orders; needs a DB)

Restart the backend after any .env change.
