# Changelog

All notable changes to BizLedger. The backend and the mobile app share one
version number, following [Semantic Versioning](https://semver.org): **major**
for changes that break apps already installed on phones, **minor** for new
features, **patch** for fixes. Each release is a git tag (`v1.1.0`) on `main`.
How to cut one is in the README, under "Releasing". Versions 1.0.0 and
1.0.1 were tagged after the fact on the commits they describe; the version
numbers inside those commits' package files predate this scheme.

## [Unreleased]

### Added
- Offline mode. Lists (dashboard, inventory, sales, customers, expenses,
  product and customer details) are saved on the phone and shown when there
  is no connection. Sales and expenses recorded offline are saved on the
  phone and sent automatically when the connection returns; stock shown on
  the phone already accounts for them. A bar at the top of each screen says
  when you're offline or have records waiting, and an "Offline records"
  screen lets you retry or discard any the server refuses (for example, not
  enough stock left). Logging out warns before unsent records are lost.
- `clientRef` and `occurredAt` on `POST /sales` and `POST /expenses`. A
  record sent twice with the same `clientRef` is stored once (unique per
  business); an offline record keeps the time it was made (trusted up to 30
  days back, never in the future) and its ledger events are marked
  `recordedOffline`. Migration `OfflineSync1790400000000` adds the columns.

### Fixed
- Product photos in lists. Each photo is now downloaded with the user's
  sign-in, kept on the phone and shown from there, so photos appear on the
  web and after the server wakes from sleep, instead of falling back to the
  placeholder for good after one failed load. They also show offline.

## [1.1.0] — 2026-10-07

The UI/UX revamp, built around the event ledger.

### Added
- `/` and `/health` report the running version and, on Render, the deployed
  commit, so you can see exactly what is live.
- Every write is recorded as a ledger event in the same transaction, with the
  entity id and who did it: product create/edit/delete, stock adjustments,
  photos, customer create/edit/delete, expense create/edit/delete, sales and
  repayments.
- `GET /ledger/events` filters by product, customer, expense or sale, by event
  type, and pages back with `before`.
- Product photos (`PUT/GET/DELETE /products/:id/image`): owner-only uploads,
  2 MB cap, JPEG/PNG/WebP checked by file signature, stored in Postgres.
- Edit for products, customers and expenses; deletes that refuse (409) when a
  product or customer has history.
- Analytics by day, week or month: expenses by category, slow movers, customer
  insights, stock movement, net profit.
- Mobile: design system, 3-slide onboarding, redesigned login and sign-up,
  dashboard with greeting and 7-day chart, analytics and activity screens,
  faster new-sale flow, product detail and form with photos, customer detail
  with repayments and history, expense history, team and branches screens.
- The app refreshes screens from domain events instead of on every visit;
  confirmation toasts come from the same events.

### Changed
- Database pool defaults to 5 connections (Supabase's free pooler allows 15
  in total across all servers).
- Expo SDK packages aligned with SDK 57's expected patch versions.

### Fixed
- Timestamps read and written as UTC whatever the server's time zone (a Lagos
  machine showed every event an hour old and shifted date filters).
- Price fields overflowing at 360 px; names cut off in lists; signed-out deep
  links showing errors instead of the login screen.

## [1.0.1] — 2026-09-29

### Fixed
- Render's free tier sleeps when idle: the app now detects a sleeping server,
  shows a "waking up" banner and retries instead of failing.

## [1.0.0] — 2026-09-28

The hackathon release: Stage 1 and Stage 2.

### Added
- Business registration with an 18+ confirmation, JWT login.
- Products and inventory, sales with automatic stock deduction and per-line
  price override, expenses, customers with credit and oldest-first repayment
  allocation, and an owner dashboard.
- Append-only ledger of financial events.
- Owner and staff roles (staff never see costs, profit, expenses or
  analytics), branches, barcode scanning, analytics, WhatsApp receipts and
  debt reminders.
- Versioned database migrations and Row Level Security on every table.
- Docker image and Render deployment; EAS builds for Android.

[Unreleased]: https://github.com/Dthstar008/bizledger/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/Dthstar008/bizledger/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/Dthstar008/bizledger/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Dthstar008/bizledger/releases/tag/v1.0.0
