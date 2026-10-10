# Event Log

A dated record of what happened on this project from September 21, 2026
(the technical plan) onward, including the post-deadline UI/UX revamp.
Sourced from git history in both repos this project has lived in
(`financial-os-ng`, then renamed to `bizledger`) plus the build and
deployment record.

## September 21 — Technical plan, stack and product specification

- Reviewed the product blueprint
  (`Financial_Operating_System_for_Nigerian_Informal_Businesses.pdf`) —
  concept, MVP scope, architecture, monetization and regulatory
  considerations for a financial operating system for Nigerian informal
  businesses — and turned it into a concrete technical plan.
- **Stack decided**: NestJS + TypeORM on PostgreSQL (Supabase-hosted) for
  the backend, with JWT authentication; Expo Router + React Native +
  Zustand + Axios for the mobile app.
- **Product specification drafted** from the blueprint's MVP module table:
  auth/business registration, products/inventory, sales, expenses,
  customers with debt tracking, and a dashboard — plus two design
  decisions that shaped everything built afterward:
  - An **event-sourced ledger** (`ledger_events`) as the system of record
    for every financial action, per the blueprint's "design around events,
    not screens" principle.
  - **Sale status and payment status kept separate** — a sale being
    entered and a sale being paid for are different concerns, needed to
    express "goods left the shop but the customer still owes money".
- Planned the initial target vertical (phone/accessories retailers, per
  the blueprint) and the freemium monetization path (Stage 1 free, paid
  tiers from Stage 2 onward) as the product framing for later work.

## September 22 — Built the MVP, then hardened it

- **Built the MVP** against the Sept 21 plan: business registration and
  JWT login; products/inventory; sales (stock deducted automatically,
  cash/credit split, ledger events written); expenses; customers with
  debt tracking and repayments; and a dashboard summarizing revenue,
  profit, cash, inventory value, debt and low-stock items. Mobile app
  (Expo Router) covering the same areas: Dashboard, Sales/New Sale,
  Inventory, Customers (with debt/repayment detail), Expenses.
  Verified end-to-end against a live Supabase database — register, seed,
  login, record a sale, check the dashboard math.
- Reviewed six real gaps found while building the MVP (insecure `JWT_SECRET`
  default, wide-open CORS, `synchronize: true` instead of migrations, no
  deployment target, thin test coverage, no CI/backup/NDPA review) and
  planned fixes for them, explicitly leaving CI out of scope.
- **JWT_SECRET**: the app now refuses to start in production without a real
  secret set, instead of falling back to a guessable default.
- **CORS**: closed by default in production, permissive in development.
- **Performance**: responses gzip-compressed; sale creation and repayment
  allocation batched into a fixed number of DB round trips instead of one
  per line item; connection pool size and timeout made configurable;
  connection-retry added for the flaky dev network.
- **Point-of-sale price override**: a cart line's price can be edited at the
  point of sale, independent of the catalogue price, without changing the
  cost basis used for profit reporting.
- **Two checklists reviewed against the actual codebase**:
  added a required 18+ confirmation at registration (the one real gap found:
  a missing age gate), and replaced emoji tab-bar icons with proper icons
  (Ionicons). The rest of both checklists were confirmed not applicable and
  documented as such rather than ignored.
- **Test coverage**: added unit tests for sale creation, `derivePaymentStatus`,
  and FIFO repayment allocation — the money-math paths that had none.
  Caught and fixed a real bug: a sale with both an upfront payment and
  remaining credit could never show as "partially paid".
- **Migrations adopted**: hand-authored a baseline migration for all 9 owned
  tables (the Supabase database is shared with an unrelated project),
  verified `up()`/`down()` in a scratch schema against the live connection,
  then recorded it as already-applied without touching the live schema.
  `synchronize` switched off.
- **Row Level Security** enabled on all 9 tables via a second migration.
  No policies were added — the backend connects as the table owner and
  bypasses RLS regardless — so this closes Supabase's default public REST
  exposure without changing app behavior.
- Attempted deployment to **Railway**: connected the GitHub repo, set env
  vars, generated a production JWT secret. The service returned a
  persistent `502 Application failed to respond`; the cause was never
  found (no access to Railway's deploy logs), so Railway was later
  abandoned in favor of Render.

## September 24 — Rename to BizLedger, first deploy

- Renamed the project from "Financial OS" to **BizLedger**: package names,
  app display name, deep-link scheme, database/container names, the seed
  demo email, and the README title. Copied into a fresh folder.
- Pushed the renamed project to a new GitHub repo (`Dthstar008/bizleger`).
- Fixed a real Android bug found while testing: the app's default API URL
  didn't account for the Android emulator needing `10.0.2.2` instead of
  `localhost`.
- Deployed the backend to **Render** as a Postgres database plus a web
  service, after Railway was abandoned. Migrations run and demo data
  seeded against Render's own Postgres as a first test, before switching
  the live app back to the existing Supabase database.
- Restored `.env` to point at Supabase (the project's real data) after the
  Render-Postgres test, confirmed the connection and migration state.
- Discussed publishing to the Google Play Store; concluded the review and
  closed-testing requirements don't fit before the deadline, so an EAS
  preview build (installable APK) was used for the hackathon demo instead.

## September 25 — Docker, EAS builds, Stage 2, and a real outage

- Added `backend/Dockerfile` and a Render blueprint (`render.yaml`) so the
  backend deploys as a container with a verified build path (install,
  build, prune dev dependencies, run) instead of relying on host-detected
  commands.
- Configured EAS (`eas.json`, Android package id, `expo-font` as a required
  peer dependency the build was missing).
- **Stage 2 built** (all five planned pieces, after confirming scope and
  the branch/stock design with the user first):
  - **Roles**: owner and staff accounts. Staff can sell and manage
    customers but never see costs, profit, expenses or analytics; enforced
    server-side, not just hidden in the UI. Role and branch are read from
    the database on each request (cached ~30s), so removing a staff member
    takes effect quickly rather than waiting out their token's lifetime.
  - **Branches**: sales and expenses are tagged to a branch; stock stays
    one shared pool per business (a deliberate scope decision to avoid
    touching the stock-decrement logic that protects the money math).
  - **Barcodes**: unique per business, scanned at the point of sale and
    when adding stock.
  - **Analytics**: daily revenue/profit trend, top products, top
    customers, payment-method mix, filterable by branch.
  - **WhatsApp**: receipt after a sale and a debt reminder on the customer
    screen, via deep links — no WhatsApp Business API account needed.
  - New migration for `branches`, `users.role`, and `barcode` verified in a
    scratch schema before being applied; 33 backend unit tests passing.
- Live-tested the new roles/branches/analytics against the running API
  (owner vs. staff access, cost redaction, branch-filtered dashboard
  numbers) before shipping.
- Built the first Android preview APK. It **failed to install** ("problem
  parsing the package"); a fresh download resolved it.
- The reinstalled app then showed **persistent "Network Error"** on
  registration. Diagnosis: the APK had been built without a resolvable
  production API URL and had silently fallen back to the Android-emulator
  address (`10.0.2.2`), which doesn't exist on a real phone. Fixed by
  making release builds fail loudly instead of falling back, and default
  to the hosted Render API; rebuilt and verified the new APK's bundle
  contained the correct hosted URL before sending it.
- Added a root (`/`) route to the API so opening the bare URL in a browser
  shows a status message instead of a `404`, after that response was
  mistaken for an outage.
- Reviewed the whole project for leftover "slop": stale README/production-
  checklist claims (still describing `synchronize: true`, Railway, no
  deployment), an empty stub lockfile, the unpersonalized Expo template
  licence file, an unused image asset, an unused dev dependency, and a
  stray `console.log`. Cleaned up and rewrote the README and production
  checklist to match what's actually built and deployed.

## September 28 — Confirmed working, deadline day

- Confirmed from the phone that `/health` is reachable and the app works
  end-to-end against the hosted Render API.
- Ran a security review (dependencies, auth, authorization/IDOR, every raw
  SQL query, secrets, on-device storage). No injection or cross-business
  access found; the open items (auth rate limiting, password policy, token
  storage, security headers, rotating the Render DB password) went into
  `PRODUCTION_TODO.md`.

## September 29 — Cold starts, then the revamp begins

- **Render free-tier cold starts**: the hosted API sleeps after inactivity
  and the first request took long enough to look like a failure. Fixed on
  the app side: it detects a sleeping server, shows a "waking up the
  server" banner, and retries instead of erroring.
- Started a **production-grade UI/UX revamp** from a written brief: keep
  the green identity, existing features, API contracts and security, but
  add a design system, onboarding, editable records, product photos,
  loading/empty/error states, and richer analytics. Decisions taken with
  the user up front: product photos stored in the database, customers and
  expenses editable with safe deletes, no new product description/category
  fields.
- **Course correction during planning**: the user asked to keep the app
  *event-based, not screen-based*. The plan was rewritten around that:
  every write records a ledger event in the same transaction, history
  screens read the event stream, and the mobile app gets its own event bus
  so screens refresh when something they show changes, not on every visit.
- **Backend (phase 1)**: closed every write path that recorded no event
  (customer create, product edits, stock edits) and added edit/delete for
  products, customers and expenses, each with its own event carrying the
  entity id and who did it. Added product photos (`product_images` table,
  2 MB cap, JPEG/PNG/WebP checked by file signature, not just the declared
  type), `GET /ledger/events` filters for one product/customer/expense/sale
  with paging, and analytics by day/week/month with expenses, slow movers,
  customer insights and stock movement. Migration verified in a scratch
  schema first; a live end-to-end script confirmed every write produces
  exactly one matching event and refused writes produce none (55/55
  checks). That script caught a `uuid = text` SQL error the unit tests
  couldn't. 59 backend tests passing.
- **Outage found during testing**: the dashboard returned 500
  (`EMAXCONNSESSION`). Supabase's free session pooler allows 15
  connections, and the local and Render servers each defaulted to a pool of
  20 against the same database. Default pool size lowered to 5.
- **Mobile (phases 2–4)**: a design system (type scale, spacing, buttons,
  cards, fields with password reveal, chips, badges, skeletons, empty and
  error states, toasts driven by events), a 3-slide onboarding, redesigned
  login and registration, and a new dashboard (time-based greeting with
  the user's name, key metrics, 7-day chart, insights, recent activity,
  logout behind a confirmation). Full analytics screen and an activity
  feed grouped by day.

## October 4 — Revamp finished

- **Sales**: today/this-month summary, search and filters, and a faster new
  sale screen (search, quantity steppers, scan, price edits, credit
  balance, sticky total). Screens that need a session now send signed-out
  users to login instead of showing errors.
- **Inventory**: search and stock filters, product detail with stock
  adjustments (with a reason), stock history from the ledger, edit, and a
  delete that's refused politely when the product has sales. One form for
  creating and editing, with camera/library photos resized on the phone
  before upload.
- **Customers, expenses, team**: customer detail with call/WhatsApp,
  purchase summary, repayments checked against the balance, and an
  activity history; expenses with monthly and category summaries and a
  history per expense; team and branches moved onto the new components.
- **Time zone bug found while testing**: events created seconds earlier
  showed "1 h ago". The database fills timestamps in UTC but the server
  read them as local time, so on a Lagos machine everything was an hour
  off, along with date-range filters. Fixed for any host time zone; the
  UTC Render host was unaffected.
- **Final audit** at 360, 768 and 1024 px widths in Expo web: fixed price
  fields overflowing at 360 px, names being cut off in lists, and expenses
  shown in red when zero. Added the image-picker plugin and permission
  text to `app.json`, set the Android icon background to the brand mint,
  and aligned five Expo packages with SDK 57's expected versions
  (expo-doctor 21/21).
- Built a new Android preview APK on EAS (needed because photo picking and
  charts add native modules); it finished cleanly on the first attempt.

## October 7 — Version control for releases

- Adopted one product version shared by the backend and the app (Semantic
  Versioning), a `CHANGELOG.md`, and a release process in the README
  (short-lived branches into an always-deployable `main`, annotated tags).
- Tagged the history retroactively: **v1.0.0** for the hackathon release
  (Sept 28), **v1.0.1** for the server wake-up fix (Sept 29), and **v1.1.0**
  for the UI/UX revamp. Backend, mobile and `app.json` now all say 1.1.0.
- `/health` now reports the running version and, on Render, the deployed
  commit.
