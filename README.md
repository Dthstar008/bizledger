# BizLedger — a financial operating system for Nigerian informal businesses

Digital back office for Nigerian microbusinesses: sales, inventory, expenses,
customer debt and a dashboard, built on an event-sourced ledger. See
[`Financial_Operating_System_for_Nigerian_Informal_Businesses.pdf`](Financial_Operating_System_for_Nigerian_Informal_Businesses.pdf)
for the full product blueprint this build follows.

## Status

Live API: <https://bizledger-api-iitk.onrender.com> (`/health` for a status check).

**Stage 1 – Merchant MVP (built)**

- [x] Auth (register/login, JWT, 18+ confirmation recorded at sign-up)
- [x] Products / inventory
- [x] Sales (auto-deducts stock, splits cash/credit, per-line price override,
      writes ledger events)
- [x] Expenses
- [x] Customers + debt tracking + repayments (allocated oldest-first)
- [x] Dashboard summary (revenue, profit, cash, inventory value, debt, insights)
- [x] Append-only ledger event log
- [x] Mobile app (React Native / Expo Router)

**Stage 2 – Business management (built)**

- [x] Employees and roles: owners create staff accounts; staff can sell and
      manage customers but never see costs, profit, expenses or analytics
- [x] Multiple branches: sales and expenses are tagged to a branch, owners
      filter the dashboard and analytics by branch (stock stays one shared pool)
- [x] Barcode scanning at point of sale and when adding stock
- [x] Analytics: daily sales trend, top products and customers, payment mix
- [x] WhatsApp receipts and debt reminders (deep links, no API account)

**UI/UX revamp (built)**

- [x] Design system: shared type scale, spacing, buttons, cards, form fields
      (with password reveal), chips, badges, skeleton loaders, empty and error
      states, and confirmation toasts
- [x] Onboarding (3 slides) and redesigned login/registration
- [x] Every record is editable: products (with photos), customers and
      expenses; deletes are safe (see "Deleting records" below)
- [x] Stock adjustments with a reason, and history screens for products,
      customers and expenses read straight from the ledger
- [x] Analytics by day/week/month: sales, expenses by category, best sellers
      and slow movers, customer insights, stock movement
- [x] Activity feed: every business event in plain language, grouped by day

**Not built yet:** suppliers and purchases, offline mode, exports and PDF
receipts, per-branch stock, password reset, payment-provider integrations.

## Running the backend

This project currently runs against **Supabase** (hosted Postgres). Supabase
is just standard Postgres, so any of these work as `DB_HOST`/etc. in step 2:

- **Supabase** (what's configured now): Project Settings → Database →
  Connection pooling → copy the **session pooler** host (port `5432`,
  username `postgres.<project-ref>`). Use the *pooler* host, not the direct
  `db.<project-ref>.supabase.co` one — on many networks that direct host only
  resolves over IPv6 and the connection just hangs. Set `DB_SSL=true`.
- **Docker** (if installed): `docker compose up -d` — exposes Postgres on the
  standard `5432`, user/pass `postgres`/`postgres`, db `bizledger`
  (auto-created).
- **Local install**: this machine also has PostgreSQL 18 running as a Windows
  service, listening on port **4000** (not the default 5432 — see
  `postgresql.conf`). Use that service's `postgres` user password, and create
  the database first: `createdb -U postgres -p 4000 bizledger`.

1. Pick one of the above and note its host/port/user/password/database.
2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
   `backend/.env` on this machine already has working Supabase pooler
   credentials filled in — **don't run `cp .env.example .env` again**, that
   overwrites it with local placeholder values (`.env` is gitignored, so
   it's local-only and there's no repo copy to restore from if you do). If
   you want a different database, edit `.env` directly with the new
   host/port/user/password from step 1.
3. Start the API in watch mode:
   ```bash
   npm run start:dev
   ```
   The API listens on `http://localhost:3000`. The schema is managed by
   versioned migrations in `src/database/migrations/`, which run
   automatically on boot (`migrationsRun: true`). To change the schema, edit
   the entities, then `npm run migration:generate -- src/database/migrations/<Name>`
   and review the SQL before committing; `npm run migration:revert` undoes
   the latest one.
4. Optional: seed a demo merchant (mirrors the blueprint's examples —
   Oraimo Charger, customer Chinedu Okafor, a cash sale, a credit sale and a
   part-repayment), plus a second branch and a staff user:
   ```bash
   npm run seed
   ```
   Owner: `demo@bizledger.ng` / `password123`. Staff (Lekki branch):
   `staff@bizledger.ng` / `password123`.

### Deploying

`backend/Dockerfile` builds the production image (`npm ci`, build, prune dev
dependencies, `node dist/main`), and `render.yaml` is a Render blueprint for it.
Set `NODE_ENV=production`, the `DB_*` variables and a real `JWT_SECRET`
(`openssl rand -base64 48`); the app refuses to start in production without
one. `CORS_ORIGINS` is closed by default in production, which is fine for the
mobile app because native clients aren't subject to browser CORS.

`GET /health` returns `{ status, version, commit }`, so you can check which
release (and, on Render, which commit) is live.

## Releasing

The backend and the mobile app share one version number
([Semantic Versioning](https://semver.org)): **major** when a change breaks
apps already installed on phones, **minor** for new features, **patch** for
fixes. What changed in each release is in [`CHANGELOG.md`](CHANGELOG.md), and
each release is an annotated git tag (`v1.1.0`).

**Branches.** `main` is always deployable: Render deploys every push to it.
Do new work on a short-lived branch (`feature/financing-match`,
`fix/repayment-rounding`) and merge it into `main` when it's ready. There is no
CI, so before merging run `npx tsc --noEmit` and `npx jest` in `backend/`, and
`npx tsc --noEmit` in `mobile/`.

**Cutting a release.**

1. Move the notes under `## [Unreleased]` in `CHANGELOG.md` to a new
   `## [x.y.z] — YYYY-MM-DD` section and update the compare links at the bottom.
2. Set the version in all three places:
   ```bash
   cd backend && npm version x.y.z --no-git-tag-version
   ```
   ```bash
   cd mobile && npm version x.y.z --no-git-tag-version
   ```
   and `expo.version` in `mobile/app.json` (the version users see in the
   store). EAS assigns build numbers itself (`appVersionSource: remote`).
3. Commit, tag and push:
   ```bash
   git commit -am "Release x.y.z"
   ```
   ```bash
   git tag -a vx.y.z -m "BizLedger x.y.z"
   ```
   ```bash
   git push origin main --follow-tags
   ```
4. Check `GET /health` on Render reports the new version, then build the app
   (`eas build --platform android --profile preview`, or `production`).

**Compatibility.** Phones keep old app versions installed, so an API change
must not break the previous app release: add fields and routes rather than
renaming or removing them. Schema changes are new migrations; never edit one
that has already run.

## API overview

All routes except `/`, `/auth/*` and `/health` require `Authorization: Bearer <token>`
from `/auth/login` or `/auth/register`. Every resource is scoped to the
authenticated user's business — there is no cross-business access.

Accounts are either **owner** or **staff**. Owners can call everything; the
Access column shows what staff can do. Owners can also send an `X-Branch-Id`
header to work in one branch (or omit it for "all branches"); staff are pinned
to their assigned branch and the header is ignored.

| Area | Routes | Access |
| --- | --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login` | public |
| Business | `GET/PATCH /business/me` | staff: read only |
| Products | `GET/POST /products`, `GET /products/low-stock`, `GET /products/barcode/:code`, `GET /products/:id`, `GET /products/:id/image` | staff: yes, without cost fields |
| Products (edit) | `PATCH/DELETE /products/:id`, `PUT/DELETE /products/:id/image` | owner only |
| Sales | `GET/POST /sales`, `GET /sales/:id` | staff: yes, without cost fields |
| Customers | `GET/POST /customers`, `GET/PATCH /customers/:id`, `POST /customers/:id/repayments` | staff: yes |
| Customers (delete) | `DELETE /customers/:id` | owner only |
| Expenses | `GET/POST /expenses`, `GET/PATCH/DELETE /expenses/:id` | owner only |
| Dashboard | `GET /dashboard/summary?from=&to=` | owner only |
| Analytics | `GET /analytics?from=&to=&granularity=day\|week\|month` | owner only |
| Ledger | `GET /ledger/events?entity=&entityId=&types=&before=&limit=` | owner only |
| Employees | `GET/POST /employees`, `DELETE /employees/:id` | owner only |
| Branches | `GET/POST /branches`, `PATCH /branches/:id` | staff: list their own branch |

A sale looks like:

```json
POST /sales
{
  "items": [{ "productId": "...", "quantity": 2, "unitPrice": 7000 }],
  "paymentMethod": "credit",
  "customerId": "...",
  "amountPaid": 5000,
  "paymentReference": "TXN-82947291"
}
```

It atomically deducts stock, computes the credit balance (`total - amountPaid`),
and writes `SALE_CREATED`, `INVENTORY_DECREASED`, `PAYMENT_RECEIVED` and/or
`CUSTOMER_CREDIT_CREATED` events to the ledger in one transaction.

`items[].unitPrice` is optional — omit it to sell at the product's current
catalog `sellingPrice`, or set it to negotiate a price at the point of sale
(haggling, bulk discount, clearance). The line's cost basis always stays the
product's real `costPrice` regardless of what it sold for, so gross-profit
reporting reflects what the sale actually earned, not the catalog margin.
The mobile New Sale screen lets the merchant tap a cart line's price to
override it, showing the catalog price alongside when they differ.

### The event ledger

Every write records an event in `ledger_events` in the **same database
transaction** as the change itself, so the change and its history either both
commit or neither does, and a refused write leaves no event behind.

| Area | Events |
| --- | --- |
| Sales and payments | `SALE_CREATED`, `PAYMENT_RECEIVED`, `CUSTOMER_CREDIT_CREATED`, `CUSTOMER_CREDIT_REPAID` |
| Stock | `INVENTORY_DECREASED` (a sale), `INVENTORY_ADJUSTED` (a manual change: from, to, delta, reason) |
| Products | `PRODUCT_CREATED`, `PRODUCT_UPDATED` (changed fields as before → after, or photo added/replaced/removed), `PRODUCT_DELETED` |
| Customers | `CUSTOMER_CREATED`, `CUSTOMER_UPDATED`, `CUSTOMER_DELETED` |
| Expenses | `EXPENSE_CREATED`, `EXPENSE_UPDATED`, `EXPENSE_DELETED` |

Event metadata carries the entity id (`productId`, `customerId`, `saleId`,
`expenseId`) and who did it (`actorId`, plus `branchId` when there is one).
`GET /ledger/events` filters on that: `entity=product&entityId=<id>` gives a
product's stock history, `entity=customer` a customer's purchases, credit,
repayments and edits, and `before=<createdAt>` pages back through older
events. The app's activity feed and every history section read from here.

Stock changes go through `PATCH /products/:id` with a new `stockQty` and an
optional `stockAdjustmentReason` (e.g. "Restock", "Damaged or lost"); the
product row is locked for the update so it can't interleave with a sale.

### Deleting records

Deletes never orphan money history:

- **Products** with sales can't be deleted (`409`); set stock to 0 to stop
  selling one. A product with no sales can be deleted.
- **Customers** with any sales or payments can't be deleted (`409`); their
  details can still be edited.
- **Expenses** can be deleted by the owner. The `EXPENSE_DELETED` event keeps
  the amount, category and note, so the record of it survives.

### Product photos

`PUT /products/:id/image` takes a multipart `image` field (owner only, 2 MB
max). The file type is checked from its first bytes (JPEG, PNG or WebP), not
from the declared content type. Photos are stored in their own
`product_images` table so product lists never load image bytes;
`products.imageUpdatedAt` tells clients a photo exists and changes whenever it
is replaced, which the app uses to refresh its cached copy. The app resizes
photos to 800 px JPEG on the phone before uploading.

### Sale status vs. payment status

A sale being *entered* and a sale being *paid for* are tracked separately —
a single `completed` flag can't express "goods left the shop but the
customer still owes ₦60,000":

- **`status`** — did the sale itself happen: `draft` (schema-ready, no UI/flow
  built yet — the app always creates sales already-confirmed) | `confirmed` |
  `cancelled` | `refunded` (also schema-ready only, no cancel/refund endpoint yet).
- **`paymentStatus`** — current payment state, derived from
  `outstandingBalance` and mutated as repayments come in: `unpaid` (draft
  orders only) | `credit` (fully unpaid) | `partially_paid` | `paid`.

Per sale, three payment fields matter, and only one of them is mutable:

| Field | Meaning | Mutated later? |
| --- | --- | --- |
| `amountPaid` | Paid at the moment of sale | No — period-accurate cash-flow figure |
| `creditAmount` | Credit extended at the moment of sale | No — period-accurate "credit issued" figure |
| `outstandingBalance` | Current remaining debt on this sale | **Yes** — decremented as repayments are allocated to it |

**Repayments are allocated per-sale, not just tracked against the customer
in aggregate.** `POST /customers/:id/repayments` finds that customer's
outstanding sales oldest-first and applies the payment across them (FIFO),
writing one `Transaction` row per sale it touches (each with its own
`saleId`) and flipping each sale's `paymentStatus` as it clears. This is
what makes "customer pays ₦40,000 of a ₦100,000 credit sale, then pays the
remaining ₦60,000 later" resolve correctly to `paid` on that specific sale,
while `GET /dashboard/summary`'s period-based revenue/credit-issued numbers
stay accurate to when the original sale happened (not when it was
eventually paid off).

### The app is a ledger, not a payment rail

A sale being recorded and a sale being paid for don't have to happen in the
same place — a customer can pay cash, transfer, POS, OPay, PalmPay, or take
credit, and none of that requires the app to *be* the payment channel. The
`Transaction` entity (`transactions` table) is what makes that separable:
it's the record of money actually moving, independent of how the merchant
happened to enter it, and every sale is *settled* by one or more of them —
one written automatically at the point of sale (`purpose: sale_payment`),
more later as debt gets repaid (`purpose: debt_repayment`). "How was this
sale paid" is answerable the same way regardless of when or how the money
moved.

Each `Transaction` carries:

| Field | Meaning |
| --- | --- |
| `channel` | Which rail: `cash`, `bank_transfer`, `pos`, `opay`, `palmpay`, `other` |
| `source` | `merchant_entered` (the only value used today) or `provider_feed` (reserved) |
| `matchStatus` | `matched` (always true today), `unmatched`, `disputed` (reserved) |
| `verified` | `true` only for cash — physically confirmed at the point of sale |
| `reference` | Bank app reference / POS slip / provider transaction id — not proof by itself |

**This is deliberately built for three levels of maturity, and only the
first one is real right now:**

1. **Manual (built)** — the merchant records every sale and every repayment
   by hand, picking a channel and optionally a reference. This is
   everything above.
2. **Assisted (not built)** — the merchant still records the sale, but a
   connected payment provider independently confirms the amount, so
   `verified` flips to `true` without the merchant's say-so being the only
   evidence.
3. **Automated (not built)** — a connected bank/POS/wallet feed pushes
   `Transaction` rows directly (`source: provider_feed`, `matchStatus:
   unmatched`, `saleId: null`), and a reconciliation step matches them to
   sales by amount/reference/timing — the merchant may not need to enter
   the payment side at all.

Levels 2 and 3 need a real licensed payment/banking provider integration,
which doesn't exist in this codebase — the schema has the seams
(`source`, `matchStatus`, nullable `saleId`) so that integration can slot in
later without another data-model rewrite, but nothing today generates
`provider_feed` transactions or does automatic matching. Every transaction
right now is honestly labeled merchant-entered rather than pretending to be
confirmed.

## Running the mobile app

1. With the backend running (see above), configure the API URL:
   ```bash
   cd mobile
   npm install
   cp .env.example .env
   ```
   - Web preview or iOS simulator: `http://localhost:3000` (the default in
     development) works.
   - Physical device or Android emulator: set `EXPO_PUBLIC_API_URL` in `.env`
     to your machine's LAN IP, e.g. `http://192.168.1.50:3000` — the device
     can't resolve `localhost` as your dev machine.
   - Release builds (below) always use a public HTTPS URL.
2. Start Expo:
   ```bash
   npm start
   ```
   Then press `a` (Android), `i` (iOS simulator, macOS only), `w` (web), or
   scan the QR code with Expo Go on a physical device.
3. Register a business from the app, or log in with the seeded demo account
   (`demo@bizledger.ng` / `password123`) if you ran `npm run seed` in `backend/`.

The app is built with Expo Router (file-based routing under `mobile/app/`),
Zustand for the persisted session, and Axios for the API client
(`mobile/src/api/`). Screens: Onboarding, Login/Register, Dashboard, Sales
(+ New Sale), Inventory (+ product detail and form), Customers (+ detail and
form), Expenses (+ form), Analytics, Activity, and Team & branches. Owners see
all of them; staff see Sales, Inventory and Customers, without costs, history
or delete controls.

Shared UI lives in `mobile/src/components/` and design tokens in
`mobile/src/theme.ts`. The app is event-driven too: after the server confirms
a change, the screen publishes a domain event (`sale.completed`,
`payment.received`, `stock.adjusted`, `product.changed`, `customer.changed`,
`expense.changed`, `team.changed`, `branch.selected`) on a small bus in
`mobile/src/events/bus.ts`. Screens subscribe to the events that affect what
they show and reload only then (or on next focus if they were in the
background), and confirmation toasts come from the same events.

### Building an installable Android app

```bash
cd mobile
eas build --platform android --profile preview
```

The `preview` and `production` profiles in `eas.json` set
`EXPO_PUBLIC_API_URL` to the hosted API, and `app.config.ts` fails the build
if it is missing or not a public HTTPS address, so an app can't ship pointing
at a local or emulator address. Scanning barcodes and adding product photos
need a real device and a fresh build, because the camera, image picker and
chart (SVG) libraries are native modules.

## Design notes

- **Event-sourced ledger** (`ledger_events` table): every write also records
  an append-only event in the same transaction, per the blueprint's "design
  around events, not screens" philosophy (see "The event ledger" above).
  Current state still lives in the relational tables; history, the activity
  feed and stock-movement analytics read from the events.
- **Timestamps**: `createdAt`/`updatedAt` columns are `timestamp` filled by
  the database in UTC. `src/database/pg-types.ts` makes node-postgres read
  and write them as UTC too, so results don't shift with the server's time
  zone (it's loaded first in `main.ts`, the data source and the seed).
- **Money** is stored as `decimal(14,2)` Naira (not kobo-integers) for
  readability at this stage; revisit if precision issues show up.
- **Multi-tenancy** is per-business, enforced by scoping every query to the
  `businessId` on the authenticated user's JWT — there's no shared data
  between merchants. Row Level Security is also enabled on every table with
  no policies, which closes Supabase's public REST surface; the backend
  connects as the table owner and bypasses it, so isolation itself is
  enforced in application code.
- **Roles** are read from the database on each request (cached for 30 seconds),
  not trusted from the token, so removing a staff member takes effect quickly.
  Staff responses have cost fields (`costPrice`, `costTotal`, `unitCostPrice`)
  stripped by an interceptor.
- **Branches** tag sales and expenses only. Stock is one business-wide pool,
  so branch reports show where money was made but not per-branch inventory.

## Performance

- **Responses are gzip-compressed** (`compression` middleware in `main.ts`)
  above a ~1KB threshold — small payloads like `/health` stay uncompressed
  since the CPU cost isn't worth it below that size.
- **Sale creation is a fixed number of DB round trips, not one per line
  item.** `SalesService.create()` batches the product lookup, the stock
  decrement, the sale-item inserts, and the ledger-event inserts into one
  statement each — an N-item sale costs ~6 round trips instead of ~3N+5.
  Each round trip holds a pooled connection for its full network latency,
  so this is what actually limits throughput under concurrent load, not
  raw query cost. `CustomersService.addRepayment()` applies the same
  pattern for its Transaction and ledger writes; the per-sale balance
  update there stays a loop since it's bounded by one customer's
  outstanding sales, not by overall traffic.
- **Connection pool size is configurable** via `DB_POOL_MAX` (default 5).
  Supabase's free session pooler allows 15 connections in total, shared by
  every server pointed at the database (the Render API and any local dev
  server), so each one has to stay well under that. Raise it only on a
  plan or Postgres with a higher connection cap.
- **Indexes** exist on every foreign key used in a lookup or join
  (`sale_items.saleId`/`productId`, `transactions.saleId`, plus the
  existing `businessId` composites) so those queries don't degrade as
  table size grows.
- **Schema changes are versioned migrations**, not auto-sync
  (`synchronize: false`), so a deploy never alters the schema as a side
  effect of entity edits.
