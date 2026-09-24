# BizLedger — a financial operating system for Nigerian informal businesses

Digital back office for Nigerian microbusinesses: sales, inventory, expenses,
customer debt and a dashboard, built on an event-sourced ledger. See
[`Financial_Operating_System_for_Nigerian_Informal_Businesses.pdf`](Financial_Operating_System_for_Nigerian_Informal_Businesses.pdf)
for the full product blueprint this build follows.

## Status

Stage 1 of the roadmap (Merchant MVP):

- [x] Auth (register/login, JWT, one business per account)
- [x] Products / inventory
- [x] Sales (auto-deducts stock, splits cash/credit, writes ledger events)
- [x] Expenses
- [x] Customers + debt tracking + repayments
- [x] Dashboard summary (revenue, profit, cash, inventory value, debt, insights)
- [x] Append-only ledger event log
- [x] Mobile app (React Native / Expo Router) — Dashboard, Sales, Inventory,
      Customers (with debt/repayment detail), Expenses
- [x] Verified end-to-end against a live Supabase Postgres database (register
      → seed → login → sale → dashboard math all checked out)
- [ ] Suppliers, offline mode, receipts (Stage 2)

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
   The API listens on `http://localhost:3000`. Tables are auto-created from
   entities in development (`synchronize: true` — switch to migrations before
   production).
4. Optional: seed a demo merchant (mirrors the blueprint's examples —
   Oraimo Charger, customer Chinedu Okafor, a cash sale, a credit sale and a
   part-repayment):
   ```bash
   npm run seed
   ```
   Logs in as `demo@bizledger.ng` / `password123`.

## API overview

All routes except `/auth/*` and `/health` require `Authorization: Bearer <token>`
from `/auth/login` or `/auth/register`. Every resource is scoped to the
authenticated user's business — there is no cross-business access.

| Area | Routes |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login` |
| Business | `GET/PATCH /business/me` |
| Products | `GET/POST /products`, `GET/PATCH/DELETE /products/:id`, `GET /products/low-stock` |
| Sales | `GET/POST /sales`, `GET /sales/:id` |
| Expenses | `GET/POST /expenses` |
| Customers | `GET/POST /customers`, `GET /customers/:id`, `POST /customers/:id/repayments` |
| Ledger | `GET /ledger/events` |
| Dashboard | `GET /dashboard/summary?from=&to=` |

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
   - Web preview or iOS simulator: `http://localhost:3000` (the default) works.
   - Physical device or Android emulator: set `EXPO_PUBLIC_API_URL` in `.env`
     to your machine's LAN IP, e.g. `http://192.168.1.50:3000` — the device
     can't resolve `localhost` as your dev machine.
2. Start Expo:
   ```bash
   npm start
   ```
   Then press `a` (Android), `i` (iOS simulator, macOS only), `w` (web), or
   scan the QR code with Expo Go on a physical device.
3. Register a business from the app, or log in with the seeded demo account
   (`demo@bizledger.ng` / `password123`) if you ran `npm run seed` in `backend/`.

The app is built with Expo Router (file-based routing under `mobile/app/`),
Zustand for the persisted auth token, and Axios for the API client
(`mobile/src/api/`). Screens: Dashboard, Sales (+ New Sale), Inventory,
Customers (+ debt detail/repayment), Expenses — matching the MVP module table
in the blueprint.

## Design notes

- **Event-sourced ledger** (`ledger_events` table): every financial action
  also writes an append-only event, per the blueprint's "design around events,
  not screens" philosophy. Useful for audit, reconciliation and future
  integrations even though today's reads go through the relational tables.
- **Money** is stored as `decimal(14,2)` Naira (not kobo-integers) for
  readability at this stage; revisit if precision issues show up.
- **Multi-tenancy** is per-business, enforced by scoping every query to the
  `businessId` on the authenticated user's JWT — there's no shared data
  between merchants.

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
- **Connection pool size is configurable** via `DB_POOL_MAX` (default 20) —
  node-postgres's own default of 10 becomes the bottleneck before Postgres
  does once requests are concurrent. Keep it under your Postgres/pooler's
  own connection cap.
- **Indexes** exist on every foreign key used in a lookup or join
  (`sale_items.saleId`/`productId`, `transactions.saleId`, plus the
  existing `businessId` composites) so those queries don't degrade as
  table size grows.
- **Not done**: `synchronize: true` (schema auto-sync from entities) is a
  real production risk at this scale — it can run schema-altering DDL on
  every boot, which is unsafe with concurrent writers. Fine for this MVP's
  single-instance dev setup; switch to versioned migrations
  (`npm run migration:generate`/`migration:run`, already wired up in
  `package.json`) before running this with real concurrent traffic.
