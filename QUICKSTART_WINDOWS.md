# Windows Quickstart (fixing the npm install error)

Your `npm install` failed because a native SQLite driver tried to COMPILE on
**Node 24** (no prebuilt binary), which needs Visual Studio C++. You do NOT need
MySQL or Visual Studio. Just use a Node LTS version.

## Why it failed
- Node 24.13.1 is too new — the SQLite driver had to build from source.
- The `mysql` command isn't installed on your PC (separate; you don't need it).

--------------------------------------------------------------------------------
## ✅ EASIEST FIX (recommended): use Node 20 or 22 LTS, run on SQLite

1) Install Node 20 LTS (or 22 LTS) from https://nodejs.org (the "LTS" button).
   Verify:
   ```
   node -v      # should print v20.x or v22.x
   ```
   (This project pins engines to Node 18–22. A `.nvmrc` with `20` is included —
   if you use nvm-windows: `nvm install 20 && nvm use 20`.)

2) Delete the half-installed folder, then install fresh:
   ```
   cd Caligoods-Backend
   rmdir /s /q node_modules        REM (Command Prompt)   — or in Git Bash: rm -rf node_modules
   del package-lock.json           REM optional
   npm install
   ```
   On Node LTS the SQLite driver installs as a prebuilt binary — no compiler
   needed. (If it still can't build, it's now OPTIONAL and install won't fail;
   the app will just need MySQL/Postgres in that case — see below.)

3) Make sure `.env` does NOT set `DB_DIALECT=mysql` or `DATABASE_URL`
   (leave them unset). The app then uses a local **SQLite file** automatically —
   no database server, no user, no password, no `mysql` command.

4) Start it:
   ```
   npm run dev
   ```
   Backend runs on http://localhost:4000. Then start the storefront in
   `caligoods-storefront` with `npm install && npm run dev` (port 5174).

That's it — no MySQL needed for local testing.

--------------------------------------------------------------------------------
## Alternative A: stay on Node 24, use a free cloud Postgres (no local DB)
1) Create a free Postgres at Supabase/Neon, copy its connection string.
2) In `Caligoods-Backend/.env` set:
   ```
   DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DBNAME
   ```
3) `npm install` (sqlite is optional now, so the native build won't block it),
   then `npm run dev`.

## Alternative B: use local MySQL
The `mysql` command wasn't found because MySQL isn't installed. Either:
- Install "MySQL Community Server" (includes the mysql client + Workbench), OR
- Use XAMPP and create the DB in phpMyAdmin.
Then create the database (via Workbench/phpMyAdmin or the mysql client):
   ```
   CREATE DATABASE caligoods CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
And in `.env`:
   ```
   DB_DIALECT=mysql
   MYSQL_HOST=127.0.0.1
   MYSQL_PORT=3306
   MYSQL_DATABASE=caligoods
   MYSQL_USER=root
   MYSQL_PASSWORD=your_password
   ```

--------------------------------------------------------------------------------
## Notes
- The "npm warn cleanup EPERM ... node_modules" happens when a program is
  locking the folder. Close your editor/terminals, then delete `node_modules`
  and run `npm install` again.
- `better-sqlite3` (unused) has been removed, and `sqlite3` is now an OPTIONAL
  dependency, so a failed native build no longer aborts the whole install.
