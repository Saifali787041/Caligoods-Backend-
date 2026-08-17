# Caligoods Enterprise Platform — Backend

Phase 1: Project setup + Authentication (Node.js · Express · MySQL · Sequelize · JWT).

## Stack
Express 4 · Sequelize 6 (MySQL) · JWT (access + rotating refresh tokens) · bcryptjs ·
Zod validation · Helmet · CORS · express-rate-limit · Winston · Swagger (OpenAPI 3).

## Prerequisites
- Node.js >= 18
- MySQL 8 running locally (or reachable via env)

## Setup
```bash
cp .env.example .env
# Generate two secrets and paste them into .env:
openssl rand -hex 32   # -> JWT_ACCESS_SECRET
openssl rand -hex 32   # -> JWT_REFRESH_SECRET

# Create the database (once):
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS caligoods CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'caligoods_user'@'localhost' IDENTIFIED BY 'CaligoodsLocal2026';
ALTER USER 'caligoods_user'@'localhost' IDENTIFIED BY 'CaligoodsLocal2026';
GRANT ALL PRIVILEGES ON caligoods.* TO 'caligoods_user'@'localhost';"
FLUSH PRIVILEGES;
EXIT;

npm install
npm install           # dev: auto-sync models + seed roles + nodemon reload
# or
npm run dev               # production-style start
```
Server: http://localhost:4000 — Swagger UI: http://localhost:4000/api/docs

In development, the six roles are auto-seeded and models auto-sync.
If `SMTP_*` is left blank, verification/reset emails are logged to the console instead of sent.

## Endpoints (Phase 1)
| Method | Path                        | Auth | Purpose                         |
|--------|-----------------------------|------|---------------------------------|
| GET    | /api/health                 | —    | Health check                    |
| POST   | /api/auth/register          | —    | Create customer account         |
| POST   | /api/auth/login             | —    | Login (returns access+refresh)  |
| POST   | /api/auth/refresh           | —    | Rotate tokens                   |
| POST   | /api/auth/logout            | —    | Revoke a refresh token          |
| POST   | /api/auth/forgot-password   | —    | Send reset email                |
| POST   | /api/auth/reset-password    | —    | Reset password via token        |
| POST   | /api/auth/verify-email      | —    | Verify email via token          |
| GET    | /api/auth/me                | JWT  | Current user                    |

## Quick test (curl)
```bash
# Register
curl -s -X POST localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Jane","lastName":"Doe","email":"jane@example.com","password":"Str0ngPass"}'

# Login -> copy accessToken from the response
curl -s -X POST localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"jane@example.com","password":"Str0ngPass"}'

# Authenticated request
curl -s localhost:4000/api/auth/me -H "Authorization: Bearer <accessToken>"
```

## Security notes
- Passwords hashed with bcrypt (cost 12).
- Refresh tokens are random, stored **hashed** (SHA-256), rotated on every refresh, and revocable.
- `forgot-password` never reveals whether an email exists.
- Access tokens are short-lived (15m default); refresh tokens long-lived (7d default).
- All secrets live in `.env` (git-ignored). Never expose Zoho credentials to the frontend.

## What's next
- Phase 2: Zoho OAuth service — auto access-token generation/refresh, org-scoped client.
- Roles beyond `customer` (admin/staff) are created via an admin-only user-management
  endpoint added in Phase 8; the seeder only guarantees the role rows exist.

---

## Phase 2 — Zoho OAuth Integration

Server-side Zoho Inventory integration. Client secret and refresh token stay in
`.env` and are **never** sent to the frontend.

### How the token lifecycle works
- On the first Zoho call, the backend exchanges the **refresh token** for a
  1-hour **access token** at `{ZOHO_ACCOUNTS_URL}/oauth/v2/token`.
- The access token is cached in memory (and best-effort in the `zoho_tokens`
  table) and reused until ~2 minutes before expiry — respecting Zoho's
  10-tokens / 10-minutes limit.
- Concurrent requests share a single in-flight refresh (no thundering herd).
- If Zoho ever returns `401`, the client invalidates the token, refreshes once,
  and retries the request a single time.

### Configure
Fill these in `.env` (use the **data-center-specific** URLs — `.com`, `.eu`,
`.in`, `.com.au`, `.jp`, `.ca`, `.sa`):
```
ZOHO_CLIENT_ID=...
ZOHO_CLIENT_SECRET=...
ZOHO_REFRESH_TOKEN=...          # generate with full scopes, e.g. ZohoInventory.FullAccess.all
ZOHO_ORGANIZATION_ID=...        # from GET /organizations
ZOHO_ACCOUNTS_URL=https://accounts.zoho.com
ZOHO_API_DOMAIN=https://www.zohoapis.com
```

### Test the connection
```bash
npm run zoho:ping        # CLI: acquires a token and lists your organizations (no server needed)
```
Or via the API (admin / super-admin JWT required):
```bash
curl localhost:4000/api/zoho/health  -H "Authorization: Bearer <accessToken>"   # config + token state, no external call
curl localhost:4000/api/zoho/status  -H "Authorization: Bearer <accessToken>"   # live call to Zoho /organizations
```

### New in Phase 2
| File | Purpose |
|------|---------|
| `src/config/zoho.js` | Zoho config + `isConfigured()` / `assertConfigured()` |
| `src/services/zohoToken.service.js` | Access-token cache, mutex refresh, DB persistence |
| `src/services/zohoClient.service.js` | REST client: auth+org injection, 401 retry, error mapping, `getAll()` pagination |
| `src/models/zohoToken.model.js` | Shared single-row token cache |
| `src/controllers/zoho.controller.js`, `src/routes/zoho.routes.js` | `/api/zoho/health` + `/api/zoho/status` |
| `src/scripts/zohoPing.js` | `npm run zoho:ping` connectivity check |

> Phase 3 will build the Inventory modules (items, composite items, categories,
> brands, units) on top of `zohoClient` — the client's `get/post/put/del/getAll`
> helpers are the foundation every later phase uses.

---

## Phase 3 — Inventory APIs

CRUD for the resources Zoho exposes, plus derived read-only metadata. Everything
proxies live Zoho data through the Phase 2 client — no local copies.

### Endpoints
| Method | Path | Roles | Zoho resource |
|--------|------|-------|---------------|
| GET | `/api/items` | all staff | `/items` (paginated, filterable) |
| POST | `/api/items` | admin/super/warehouse | `/items` |
| GET | `/api/items/:id` | all staff | `/items/{id}` |
| PUT | `/api/items/:id` | admin/super/warehouse | `/items/{id}` |
| DELETE | `/api/items/:id` | admin/super/warehouse | `/items/{id}` |
| PATCH | `/api/items/:id/status` | admin/super/warehouse | `/items/{id}/active` \| `/inactive` |
| GET/POST | `/api/composite-items` | staff / write | `/compositeitems` |
| GET/PUT/DELETE | `/api/composite-items/:id` | staff / write | `/compositeitems/{id}` |
| GET | `/api/categories` | all staff | derived from items |
| GET | `/api/brands` | all staff | derived from items |
| GET | `/api/units` | all staff | derived from items |

### List filtering & search
`GET /api/items` forwards a whitelist of Zoho params: `page`, `per_page` (max 200),
`search_text`, `sku`, `name`, `filter_by` (e.g. `Status.Active`), `sort_column`,
`sort_order` (`A`/`D`). Zoho's `page_context` is returned in the response `meta`.
Examples:
```bash
curl "localhost:4000/api/items?search_text=widget&per_page=25" -H "Authorization: Bearer <t>"
curl "localhost:4000/api/items?sku=WIDG-A" -H "Authorization: Bearer <t>"
curl "localhost:4000/api/items?filter_by=Status.Active&sort_column=name&sort_order=A" -H "Authorization: Bearer <t>"
```

### Why categories / brands / units are read-only
Zoho Inventory's v1 API has **no standalone category/brand/unit resource** — they
are fields on an item (`category_id`/`category_name`, `brand`, `unit`). These three
endpoints therefore return the **distinct values found across your items**, with an
`item_count` each, cached for 5 minutes (`?refresh=true` bypasses the cache). To
"create" a category or brand, set it on an item via `POST`/`PUT /api/items`.

### New in Phase 3
`services/inventory/{item,compositeItem,taxonomy}.service.js`,
`controllers/inventory/*`, `validations/{item,compositeItem}.validation.js`,
`routes/{item,compositeItem,inventoryMeta}.routes.js`, and `ROLE_GROUPS` in
`helpers/constants.js`.

> Phase 4 (Customers) will follow the same service/controller/route/validation
> shape on Zoho's `/contacts` resource.

---

## Phase 4 — Customer APIs

Customers, their contact persons, and their addresses — all on Zoho's `/contacts`
resource, scoped to `contact_type = customer`.

### Endpoints (base `/api/customers`)
| Method | Path | Roles | Zoho |
|--------|------|-------|------|
| GET | `/` | all staff | `/contacts?contact_type=customer` (paginated) |
| POST | `/` | super/admin/sales | `/contacts` (contact_type forced to customer) |
| GET | `/:id` | all staff | `/contacts/{id}` |
| PUT | `/:id` | super/admin/sales | `/contacts/{id}` |
| DELETE | `/:id` | super/admin/sales | `/contacts/{id}` |
| PATCH | `/:id/status` | super/admin/sales | `/contacts/{id}/active` \| `/inactive` |
| GET | `/:id/contact-persons` | all staff | `/contacts/{id}/contactpersons` |
| POST | `/:id/contact-persons` | super/admin/sales | `/contacts/contactpersons` (contact_id in body) |
| GET | `/contact-persons/:personId` | all staff | `/contacts/contactpersons/{id}` |
| PUT | `/contact-persons/:personId` | super/admin/sales | `/contacts/contactpersons/{id}` |
| DELETE | `/contact-persons/:personId` | super/admin/sales | `/contacts/contactpersons/{id}` |
| POST | `/contact-persons/:personId/primary` | super/admin/sales | `/contacts/contactpersons/{id}/primary` |
| GET | `/:id/addresses` | all staff | `/contacts/{id}/address` |
| POST | `/:id/addresses` | super/admin/sales | `/contacts/{id}/address` |
| PUT | `/:id/addresses/:addressId` | super/admin/sales | `/contacts/{id}/address/{addressId}` |
| DELETE | `/:id/addresses/:addressId` | super/admin/sales | `/contacts/{id}/address/{addressId}` |

### Notes
- **Scoping:** the list is filtered with `contact_type=customer` so vendors don't
  leak into the customers module. Vendors get their own module in a later phase.
- **Contact persons:** Zoho creates/updates/deletes them at `/contacts/contactpersons`
  with the `contact_id` in the request body (not the URL) — the service injects it
  from the `:id` route param, so the API stays RESTful (`/customers/:id/contact-persons`).
- **Addresses:** these are *additional* addresses. A contact's primary
  `billing_address` / `shipping_address` are set inline on the customer via
  `POST`/`PUT /api/customers`.
- New writes are limited to super-admin / admin / **sales_manager** (`CUSTOMER_WRITE`);
  all staff roles can read.

### New in Phase 4
`services/sales/customer.service.js` (customers + contactPersons + addresses),
`controllers/sales/customer.controller.js`, `validations/customer.validation.js`,
`routes/customer.routes.js`, and the `CUSTOMER_WRITE` role group.

> Phase 5 (Sales Orders) will build on `/salesorders`, referencing these customers
> and the Phase 3 items in line items.

---

## Phase 5 — Sales Orders

CRUD plus status transitions on Zoho's `/salesorders`, mounted at `/api/orders`.
Line items reference Phase 3 items (`item_id`) and the order references a Phase 4
customer (`customer_id`).

### Endpoints (base `/api/orders`)
| Method | Path | Roles | Zoho |
|--------|------|-------|------|
| GET | `/` | all staff | `/salesorders` (paginated, filterable) |
| POST | `/` | super/admin/sales | `/salesorders` |
| GET | `/:id` | all staff | `/salesorders/{id}` |
| PUT | `/:id` | super/admin/sales | `/salesorders/{id}` |
| DELETE | `/:id` | super/admin/sales | `/salesorders/{id}` |
| POST | `/:id/confirm` | super/admin/sales | `/salesorders/{id}/status/confirmed` |
| POST | `/:id/void` | super/admin/sales | `/salesorders/{id}/status/void` |
| POST | `/:id/open` | super/admin/sales | `/salesorders/{id}/status/open` |

### Create example
```bash
curl -X POST localhost:4000/api/orders -H "Authorization: Bearer <t>" \
  -H 'Content-Type: application/json' -d '{
    "customer_id": "4815000000044080",
    "date": "2026-01-15",
    "line_items": [
      { "item_id": "4815000000044100", "quantity": 2, "rate": 122 }
    ]
  }'
```
Validation requires `customer_id` and at least one line item, each with `item_id`
and a positive `quantity`.

### Notes
- **Status as verbs, not free text:** transitions are explicit routes
  (`/confirm`, `/void`, `/open`) that map to Zoho's `status/{confirmed|void|open}`,
  so no arbitrary status string can reach the URL.
- **Custom order numbers:** if you pass `salesorder_number`, the service
  automatically sends `ignore_auto_number_generation=true` (Zoho requires this
  when you supply your own number).
- List filters: `filter_by` (e.g. `Status.Confirmed`, `Status.Draft`, `Status.Closed`),
  `customer_id`, `search_text`, `sort_column`/`sort_order`, `page`/`per_page`.

### New in Phase 5
`services/sales/salesOrder.service.js`, `controllers/sales/salesOrder.controller.js`,
`validations/salesOrder.validation.js`, `routes/salesOrder.routes.js`, and the
`SALES_WRITE` role group.

> Phase 6 (Invoices) is next: `/invoices` with create-from-sales-order, list/get,
> and payment recording.

---

## Phase 6 — Invoices

Invoices and customer payments on Zoho's `/invoices` and `/customerpayments`.

### Invoice endpoints (base `/api/invoices`)
| Method | Path | Roles | Zoho |
|--------|------|-------|------|
| GET | `/` | all staff | `/invoices` (paginated, filterable) |
| POST | `/` | super/admin/sales | `/invoices` |
| POST | `/from-sales-order` | super/admin/sales | `/invoices/fromsalesorder?salesorder_id=` |
| GET | `/:id` | all staff | `/invoices/{id}` |
| PUT | `/:id` | super/admin/sales | `/invoices/{id}` |
| DELETE | `/:id` | super/admin/sales | `/invoices/{id}` |
| POST | `/:id/sent` | super/admin/sales | `/invoices/{id}/status/sent` |
| POST | `/:id/void` | super/admin/sales | `/invoices/{id}/status/void` |
| POST | `/:id/draft` | super/admin/sales | `/invoices/{id}/status/draft` |
| POST | `/:id/payments` | super/admin/sales | `/customerpayments` (applied to this invoice) |

### Payment endpoints (base `/api/payments`)
`GET /`, `POST /`, `GET/PUT/DELETE /:id` → Zoho `/customerpayments`.

### Highlights
- **Invoice from a sales order:** `POST /api/invoices/from-sales-order` with
  `{ "salesorder_id": "..." }` calls Zoho's convert endpoint
  (`/invoices/fromsalesorder`) — Zoho copies the line items across. Extra body
  fields are forwarded as overrides.
- **Record a payment two ways:**
  - Against a specific invoice: `POST /api/invoices/:id/payments` with
    `{ customer_id, amount, payment_mode }` — the service builds the
    `invoices:[{ invoice_id, amount_applied: amount }]` array for you.
  - Standalone: `POST /api/payments` with your own `invoices[]` (or none, for an
    unapplied advance).
  - Zoho usually needs an `account_id` (the deposit-to account) — pass it in the body.
- **Status verbs:** `sent` / `void` / `draft` are explicit routes mapping to
  Zoho's `status/{...}` (no free-text status in the URL).

### Version caveat
Everything here uses `/inventory/v1/...` for consistency with the rest of the
integration. Zoho's docs occasionally reference a `/inventory/v3/invoices` path;
if your org rejects a v1 invoice call, that's the one endpoint to re-check — it's
a one-line change in `zohoClient` (or a per-call override) if needed.

### New in Phase 6
`services/sales/{invoice,payment}.service.js`,
`controllers/sales/{invoice,payment}.controller.js`,
`validations/{invoice,payment}.validation.js`,
`routes/{invoice,payment}.routes.js`.

> Phase 7 (Dashboard) will aggregate across items, orders, invoices and payments
> for the metric cards (today/week/month/year sales, top products, low stock, etc.).

---

## Phase 7 — Dashboard

Aggregated metric endpoints under `/api/dashboard`, composed from the item /
order / invoice / customer data with per-loader TTL caching. Add `?refresh=true`
to any endpoint to bypass the cache.

### Endpoints (base `/api/dashboard`, all roles read)
| Path | Returns |
|------|---------|
| `GET /summary` | Everything in one call: `sales{today,week,month,year}`, `revenue{ytd_invoiced,ytd_collected,outstanding}`, `counts{customers,pending_orders,cancelled_orders,invoices_ytd,low_stock,out_of_stock}`, `profit` (see note) |
| `GET /sales` | Sales totals for today / week / month / year |
| `GET /top-products?limit=&sample=` | Top sellers + `sampled_gross_profit` |
| `GET /recent-orders?limit=` | Latest sales orders |
| `GET /pending-orders?limit=` | Orders not closed/void |
| `GET /cancelled-orders?limit=` | Void/rejected orders |
| `GET /low-stock?limit=` | Items at/below reorder level |
| `GET /out-of-stock?limit=` | Items with no available stock |

### How each metric is derived (and its honesty caveats)
- **Sales / revenue / outstanding:** summed from invoice list rows
  (`total`, `balance`, `date`) for the current year. `ytd_collected = Σ(total − balance)`.
- **Order counts / lists:** from sales-order list rows. *Pending* = not
  `closed`/`void`; *cancelled* = `void`/`rejected`.
- **Low / out of stock:** from item list `available_stock` vs `reorder_level`
  (service/non-inventory items are excluded).
- **Customer count:** distinct active customer contacts.
- **Top-selling products:** invoice **list rows don't include line items**, so this
  samples the *N most recent invoices* (default 20, cap 50), fetches their details,
  and aggregates by item. The response states `invoices_sampled`. For exact
  all-time figures, use the Phase 9 Sales-by-Item report.
- **Profit:** returned as `null` with a note — a headline gross profit needs
  cost-of-goods per sale, which isn't in list responses. The `top-products`
  endpoint provides a **sampled** `sampled_gross_profit` (revenue − Σ qty×purchase_rate)
  for the sampled invoices, clearly labeled.

### Performance / scaling note
The year-to-date loaders page through invoices and orders (bounded to the current
year, sorted by date desc with an early stop) and through active items. Results are
cached 10–30 min, so the first hit after expiry is the expensive one. At large
catalog/transaction volumes this is the point to switch to the MySQL sync layer
flagged in Phase 1 rather than aggregating live on each cache miss.

### New in Phase 7
`services/dashboard/dashboard.service.js`, `controllers/dashboard/dashboard.controller.js`,
`validations/dashboard.validation.js`, `routes/dashboard.routes.js`, and
`utils/cache.js` (TTL memo).

> Phase 8 (Admin Panel) is next: platform user management (the MySQL users/roles
> from Phase 1) — invite/create staff, assign roles, activate/deactivate — plus
> an audit log of admin actions.

---

## Phase 8 — Admin Panel

Platform **user management** on the Phase 1 MySQL users/roles (this is *your app's*
data, not Zoho), plus an append-only **audit log**. Super-admin / admin only.

### Bootstrap the first admin
There are no staff accounts until you create one (public registration only makes
customers). Use the CLI:
```bash
npm run create-admin -- --email=you@caligoodsinc.com --password=Str0ngPass --firstName=Jane --lastName=Doe --role=super_admin
```

### Endpoints (base `/api/admin`, super-admin/admin only)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/users` | list (search, `role`, `isActive`, paginated) |
| POST | `/users` | create; **omit `password` to send an invite email** instead |
| GET | `/users/:id` | get |
| PUT | `/users/:id` | update name / role |
| PATCH | `/users/:id/status` | activate / deactivate |
| POST | `/users/:id/reset-password` | email a reset link |
| DELETE | `/users/:id` | **super-admin only** |
| GET | `/audit-logs` | list admin actions (filter by `action`, `actorId`) |

### Authorization & safety guards (all enforced server-side)
- Only **super-admin** can create, assign, edit, or delete accounts with the
  `super_admin` role; admins manage everyone else.
- Nobody can **change their own role** (no self-escalation).
- Nobody can **deactivate or delete their own account** (no self-lockout).
- The **last active super-admin** can't be deactivated or deleted.
- Every mutating action writes an `audit_logs` row: `actor`, `action`
  (`user.create` / `update` / `activate` / `deactivate` / `reset_password` /
  `delete`), `targetId`, `meta`, and `ip`.

### Invite vs. direct-password
`POST /users` with a `password` creates an active, verified account. Without one,
the user is created inactiveâ€‘until-setup and emailed a 72-hour invite link
(`/accept-invite?token=...`, reusing the Phase 1 reset-token machinery). In dev
(no SMTP) the link is logged to the console.

### New in Phase 8
`models/auditLog.model.js`, `services/admin/{user,auditLog}.service.js`,
`controllers/admin/{user,auditLog}.controller.js`,
`validations/adminUser.validation.js`, `routes/admin.routes.js`,
`scripts/createAdmin.js`, `sendInvitationEmail` in the email service, and the
`ADMIN_MANAGE` role group.

> Phase 9 (Reports) is next: the Zoho report endpoints (stock, sales, customer,
> inventory) — including the Sales-by-Item report that gives the exact top-seller
> and profit figures the Phase 7 dashboard sampled.

---

## Storefront Catalog (public, price-gated)

Endpoints that power the separate B2B storefront app. They use an `optionalAuth`
middleware: a valid token reveals pricing, otherwise the caller is treated as a guest.
Cost (`purchase_rate`) is never exposed.

| Method | Path | Auth | Returns |
|--------|------|------|---------|
| GET | `/api/catalog` | optional | products with live `stock_status`; `rate` only when authenticated; `meta.pricing_visible` |
| GET | `/api/catalog/filters` | none | category & brand facets for the sidebar |
| GET | `/api/catalog/:id` | optional | product detail (price only when authenticated) |

`stock_status` is derived from `available_stock` vs `reorder_level`
(`in_stock` / `limited` / `out_of_stock`). Files: `middleware/optionalAuth.middleware.js`,
`services/catalog.service.js`, `controllers/catalog.controller.js`, `routes/catalog.routes.js`.
