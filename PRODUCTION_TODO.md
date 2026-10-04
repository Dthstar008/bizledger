# Production Readiness TODO

This project is a NestJS API + an Expo/React Native mobile app.

Status key: ✅ done · ⚠️ todo · ➖ not applicable to this product shape

## The 20-item checklist, translated

| # | Generic item | For this project | Status |
|---|---|---|---|
| 1 | Privacy policy page | Required for App Store/Play Store submission, and for NDPA (Nigeria Data Protection Act) compliance since this handles financial data — see blueprint's "Regulatory Architecture" section | ⚠️ Not written |
| 2 | Terms & conditions | Same — required before real users, before app store submission | ⚠️ Not written |
| 3 | Secrets off the frontend | `backend/.env` is gitignored and never committed; mobile has no secrets baked in (only a public API URL). Verified no `.env` files are tracked in git (`git ls-files \| grep .env` → nothing) | ✅ Done |
| 4 | Force HTTPS | The API is hosted on Render, which terminates TLS. Release builds of the app (`app.config.ts`) refuse to build without a public HTTPS API URL | ✅ Done |
| 5 | Cookie consent banner | No web frontend, no cookies | ➖ N/A |
| 6 | Meta titles + descriptions | No web pages | ➖ N/A |
| 7 | Social preview image | No web pages to share links to | ➖ N/A |
| 8 | Favicon | Mobile app icon/splash assets already exist (`mobile/assets/`, wired in `app.json`) | ✅ Done |
| 9 | Sitemap + robots.txt | No public web pages to crawl | ➖ N/A |
| 10 | Alt text on images | Mobile equivalent is `accessibilityLabel`. Icon-only buttons now require one (`IconButton` won't compile without it), list rows and buttons are labelled by their text, product images say whose photo they are (or that there is none), charts carry a label, and the decorative brand mark is hidden from screen readers. Not yet tried with TalkBack/VoiceOver on a device | ✅ Labels done · ⚠️ screen-reader pass not done |
| 11 | Compress your images | API responses are gzip-compressed (see README "Performance"). Product photos are resized to 800 px JPEG (quality 0.7) on the phone before upload and capped at 2 MB server-side. App icon assets are the standard Expo-generated sizes, not separately optimized | ✅ API and photos done · ⚠️ icon assets not audited |
| 12 | Check page load speed | Mobile equivalent: app startup time and API latency. API round-trip count and connection pooling tuned (see README "Performance"). Render's free tier sleeps when idle; the app detects this, shows a "waking up the server" banner and retries. Screens show skeletons while loading | ✅ API done · ⚠️ app cold-start not measured on a device |
| 13 | Fix color contrast | Measured `mobile/src/theme.ts` against WCAG AA (4.5:1 for normal text). Pass: body text 16.6:1, `textMuted` 5.2:1, brand green 5.0:1, white on green buttons 5.4:1, danger 5.1:1, danger badge 4.7:1. **Fail:** `warning` `#B7791F` is 3.4:1 on the background and 3.3:1 in its badge — used for "Part paid"/"On credit" badges and the dashboard debt amount; `textSubtle` `#8A94A2` is 2.9:1 — used for input placeholders and 10 px chart axis labels | ⚠️ Darken `warning` (≈`#8F5E12`) and `textSubtle` (≈`#6B7584`), then re-check |
| 14 | Make it mobile friendly | It already is the mobile app | ➖ N/A |
| 15 | Custom 404 page | NestJS returns its default JSON 404 for unknown routes (the bare `/` URL now returns a small status message instead); Expo Router has its own default not-found screen. Neither is customized, but neither is broken | ⚠️ Default, not customized |
| 16 | Fix broken links | No web pages | ➖ N/A |
| 17 | Form validation | Every DTO across every endpoint uses `class-validator` with `whitelist`/`forbidNonWhitelisted` enabled globally | ✅ Done |
| 18 | Spam protection | Mobile equivalent: rate limiting on `/auth/register` and `/auth/login` so they can't be hammered | ⚠️ Not implemented |
| 19 | Set up analytics | No crash/error reporting (e.g. Sentry) and no usage analytics wired into either the API or the app | ⚠️ Not implemented |
| 20 | One clear call to action | Not a marketing site | ➖ N/A |

## Real gaps found while building this (not on the generic list)

Roughly in priority order. Status as of 2026-09-25:

1. ✅ **`JWT_SECRET` insecure default** — fixed. In production the app
   refuses to start without `JWT_SECRET` (`backend/src/config/configuration.ts`);
   the dev-only fallback remains for local work.
2. ✅ **CORS wide open** — fixed. Unset `CORS_ORIGINS` is permissive in
   development and closed in production; set it to an allowlist if a web
   client is ever added. Native mobile clients aren't subject to CORS.
3. ✅ **`synchronize: true`** — fixed. The schema is now managed by versioned
   migrations that run on boot (`src/database/migrations/`), each verified in
   a scratch schema before being applied.
4. ✅ **No deployment target** — fixed. The API runs on Render from
   `backend/Dockerfile` (blueprint in `render.yaml`) against Supabase.
5. ⚠️ **Test coverage is partial** — 59 unit tests cover sale creation,
   FIFO repayment allocation, payment-status transitions, roles, branch
   context, employees, analytics buckets, ledger filters, and the ledger
   event written by every product/customer/expense edit and delete. There are
   no committed integration tests against a real database and no mobile
   tests. During the revamp a throwaway end-to-end script exercised every
   write against the live API and checked each produced exactly one matching
   ledger event (55/55); it caught a SQL type error the mocked tests couldn't,
   which is the argument for committing something like it.
6. ➖ **CI** — deliberately skipped for now (decision, not an oversight).
   Build, typecheck and tests are run manually before each push.
7. ⚠️ **No backup/disaster-recovery plan** for the database beyond whatever
   Supabase does by default on the current plan tier. Note the free tier may
   not include point-in-time recovery.
8. **NDPA compliance review** — the blueprint itself flags this (see
   "Regulatory Architecture" and "Sources and Further Reading" in the PDF):
   privacy, security, access controls, audit logging, consent, data
   minimization, retention and incident-response all need review against
   the Nigeria Data Protection Act with a qualified professional before
   handling real users' financial data — not something to self-certify.
9. **App store submission requirements** if this ships as a real app:
   developer accounts (Apple/Google), screenshots, age rating, the privacy
   policy from item 1 linked in both store listings, and — specific to a
   financial app — likely additional review scrutiny from both stores.
10. **Rate limiting isn't just an auth concern** — item 18 above calls out
    auth specifically, but sale/expense/product creation are also
    unthrottled per-user, worth a general look once there's real traffic.

## Stage 2 additions to keep in mind

- Roles are enforced server-side (`RolesGuard`), but only the routes listed in
  the README access table are restricted. New routes default to "any signed-in
  user", so give each new route an explicit `@Roles(...)` decision.
- Staff cost redaction (`RedactCostsInterceptor`) matches field names
  (`costPrice`, `costTotal`, `unitCostPrice`). A new cost-like field needs
  adding to that list.
- Row Level Security is enabled with no policies on every table. Tenant
  isolation is enforced in application code, not by the database.
- The camera and photo-library permission text is in `mobile/app.json`
  (`expo-camera` and `expo-image-picker` plugins); store listings will need a
  matching privacy-policy disclosure (item 1), including that product photos
  are uploaded and stored on the server.

## Security review (2026-09-28)

Checked dependencies (`npm audit`), authentication, authorization/IDOR,
injection risk in every raw SQL query, secrets handling, and mobile-specific
storage. No committed secrets, no SQL injection (every raw query — sale
stock updates, analytics — uses parameterized placeholders, never string-
concatenated values), and no cross-business data access: every lookup,
including repayments and employee removal, is scoped by `businessId` from
the JWT, never from client input.

| # | Finding | Status |
|---|---|---|
| 1 | No rate limiting on `/auth/login` or `/auth/register` — open to credential stuffing/brute force | ⚠️ Same as item 18 above, not yet implemented |
| 2 | Weak password policy — `MinLength(6)`, no complexity requirement, on both registration and staff account creation | ⚠️ Not implemented |
| 3 | JWT stored in plain `AsyncStorage` on the phone, not the OS keychain (`expo-secure-store`) — readable on a rooted/compromised device, sandboxed like any other app data on a normal one | ⚠️ Not implemented |
| 4 | No security response headers (`helmet`) | ⚠️ Not implemented — low impact for a JSON API with no browser rendering |
| 5 | RLS has no policies (see README) — closes Supabase's default public REST exposure, but tenant isolation is enforced entirely in application code, not the database, since the backend connects as the table owner | ➖ Accepted trade-off, already documented |
| 6 | `npm audit`: 14 backend / 13 mobile advisories, all in build-time tooling (`bcrypt`'s native installer via `node-pre-gyp`/`tar`, `uuid` via TypeORM, Expo's CLI chain) — none of it ships in the running app or is reachable by a user request | ➖ Not urgent |
| 7 | The Render database password was pasted into this chat's history on 2026-09-25 (not committed to the repo) | ⚠️ Rotate it in Render after the hackathon |

## Reviewed against legal-exposure checklist

A checklist listed six specific statutory-damages traps for
web SaaS apps. Checked each against this actual codebase (grepped for the
relevant code, didn't assume):

| Claim | Checked | Result |
|---|---|---|
| No age question on signup (COPPA, $53k/kid) | `register.dto.ts` had no age field | ⚠️ **Real gap — fixed.** Added a required `confirmedAdult` self-attestation (not a collected birthdate — data minimization) to `RegisterDto`, validated server-side (`@Equals(true)`), recorded as `User.ageConfirmedAt` for an actual audit trail rather than just a UI gate. Mobile registration screen has the checkbox; both "missing" and "false" are rejected, verified live. |
| Google Fonts loaded from Google (Munich court, GDPR) | Grepped for `fonts.googleapis`/`@expo-google-fonts` across the codebase | ➖ **N/A.** The only hit is a transitive lockfile entry from Expo Router's own dev tooling (a locally-bundled font file, not a live browser call to Google's CDN). This is a compiled native app, not a website — there's no runtime request to Google's servers for the Munich ruling to apply to. |
| Session replay on by default (CA wiretapping) | Grepped for FullStory/Hotjar/LogRocket/PostHog/Mixpanel/Amplitude/Sentry | ➖ **N/A.** No analytics or session-replay SDK is integrated anywhere yet (see item 19 above — "set up analytics" is still just a todo). Nothing to turn off. **When analytics does get added, come back to this and default it off with masked inputs.** |
| Marketing email with no unsubscribe/address (CAN-SPAM) | Grepped for nodemailer/SendGrid/Mailgun/SMTP | ➖ **N/A.** The app sends no email at all — email is only a login identifier, never a send target. **Revisit if/when transactional or marketing email is added.** |
| Stripe subscription with no renewal terms (CA ARL) | Grepped for Stripe/subscription/billing | ➖ **N/A.** No billing or subscription system exists yet — the blueprint's freemium model (README/PDF) is unimplemented. **Revisit when monetization ships — renewal terms and cancel instructions need to sit right next to the subscribe button, not buried in ToS.** |
| No DMCA designated agent ($150k/stolen image) | Grepped for Multer/`FileInterceptor`/image upload | ⚠️ **Revisit now.** Product photos were added on 2026-09-29 (`PUT /products/:id/image`). They're private to the uploading business (only its own signed-in users can fetch them) and never published, which keeps the exposure low, but this is now user-uploaded content. Decide on a takedown contact and cover it in the terms (item 2) before public launch. |

Honest summary (as of 2026-09-28): 5 of the 6 items describe risk surfaces (marketing email,
billing, session-replay analytics, user-uploaded images) this app simply
didn't have yet — user-uploaded images have since arrived, see the DMCA row, so they're not fixable — there's nothing to fix. The one
that was real (no age gate) is fixed. The other 5 are now written down as
"come back to this when X ships" rather than silently forgotten, which is
the actual point even where its specific examples didn't apply
here. The underlying theme — undisclosed compliance debt accumulating
silently — is exactly what items 1, 2, and 8 above (privacy policy, terms,
NDPA review) already exist to catch for this specific app.

## Reviewed against a second checklist

A second checklist lists 30 visual/design tells of a generic AI-generated marketing site — gradients, icon libraries, pricing tiers, bento grids, fake testimonials, hover animations, specific fonts. Checked each against the actual mobile app (grepped for the relevant code):
| Claim | Checked | Result |
|---|---|---|
| Emojis (#7) | Tab bar icons in `mobile/app/(tabs)/_layout.tsx` | ⚠️ **Real hit — fixed.** All five tab icons (🏠🧾📦👥💸) were literal emoji characters — the exact low-effort placeholder pattern this flags. Swapped for `@expo/vector-icons` (Ionicons, ships with Expo — no new dependency to speak of), filled when active/outline when inactive, matching the existing active/inactive tint colors. Verified: type-checks, and the app bundles clean with the new icon font. |
| Harsh gradients, drop shadows (#1, #5) | Grepped for `LinearGradient`/`shadowColor`/`shadowOffset`/`elevation`/`boxShadow` across `mobile/src` | ➖ **N/A.** No gradients. Since the revamp, cards, stat cards and toasts use one soft shadow token (`shadow.card`/`shadow.raised` in `theme.ts`) alongside a hairline border — subtle, not harsh. |
| Lucide icons, Inter/Geist/Space Grotesk fonts (#2, #10) | Grepped for `lucide`/`fontFamily`/`Geist`/`Space Grotesk`/`@expo-google-fonts` | ➖ **N/A.** No icon library was in use before this fix (hence the emoji), and no custom font is configured anywhere — the app renders in the OS's native system font, not one of the generic "AI SaaS" font picks. |
| Pure white background, rainbow/neon/purple-black coloring (#3, #4, #20, #29) | `mobile/src/theme.ts` | ➖ **N/A.** Background is a soft off-white (`#F5F7FA`), and the palette is a single deliberate brand accent (green, `#0F7A4B`) plus muted grays/red/amber for status — not a multi-color or neon scheme. |
| 3 feature cards in a row, bento grids, terminal window, fake testimonials, 3 pricing tiers, "it's not x it's y" copy, checkmark-bullet feature lists, no real product demos (#6, #13, #14, #12, #17, #15, #16, #18) | N/A by construction | ➖ **N/A.** These are all marketing-landing-page patterns. There is no marketing site — the app *is* the product, there's no separate page selling it. |
| No skeleton loaders, radial orbs, dot grids, sparkle icons, animated arrows, hover animations, "liquid glass" (#19, #21–25, #28) | Loading states since the revamp | ✅ **Skeleton loaders added** (`Skeleton`, `SkeletonList`, `SkeletonStats` in `Feedback.tsx`) on every data screen. The rest are web-only decoration patterns (hover doesn't exist on a touchscreen) or effects never used here. |
| No TOS, no privacy policy (#26, #27) | Cross-checked against this doc | ⚠️ **Already tracked** — items 1 and 2 in "Real gaps" above (privacy policy, terms & conditions). Not new work, just confirms those two are the genuinely relevant items from this list too. |

Honest summary: 1 of 30 was a real, fixable issue specific to this app
(emoji icons) and is now fixed; 2 more are already-tracked items shared
with the first checklist; the remaining 27 describe a marketing website
this product doesn't have and isn't building right now. Same pattern as
the first review — check before claiming, fix what's real, don't invent
work to look thorough.

## UI/UX revamp follow-ups (2026-10-04)

What the revamp added that needs watching, and what's still open:

| # | Item | Status |
|---|---|---|
| 1 | **Set `DB_POOL_MAX=5` on Render.** The code default is now 5, but an env var set on Render overrides it. Supabase's free session pooler allows 15 connections across every server using the database; going over returns `EMAXCONNSESSION` and the dashboard fails with a 500 | ⚠️ Check the Render env var |
| 2 | **Product photos on a real device.** Picking from camera/library, resizing and uploading need the native build; the web preview can't open a file chooser for automated testing. The server side (type check by file signature, 2 MB cap, owner-only writes, business-scoped reads) was tested live | ⚠️ Test on the new APK |
| 3 | **Photos are stored in Postgres** (`product_images`, `bytea`). Fine at this scale (≈100 KB each after resizing), but they count against the database size limit (500 MB on Supabase's free tier) and are included in every backup. Move to object storage (Supabase Storage/S3) if photo counts grow | ⚠️ Revisit with real usage |
| 4 | **Deletes are guarded but permanent.** Products and customers with history can't be deleted (409). An expense delete removes the row; the `EXPENSE_DELETED` event keeps its amount, category and note, but there's no undo or restore screen | ➖ Accepted for now |
| 5 | **Upload endpoint and rate limiting.** `PUT /products/:id/image` is owner-only and size-capped, but like every other route it isn't rate-limited (see security finding 1) | ⚠️ Same as security finding 1 |
| 6 | **Colour contrast** for the warning colour and subtle text fails AA (checklist item 13 above has the measured ratios) | ⚠️ Not fixed |
| 7 | **Expo web isn't a supported target.** It's used only to test layouts during development (checked at 360, 768 and 1024 px). The camera and image picking are native-only | ➖ By design |
| 8 | **Time zone handling** — `timestamp` columns are read and written as UTC regardless of the server's time zone (`backend/src/database/pg-types.ts`). Before this, a server running on Lagos time showed every event an hour old and shifted date-range filters by an hour | ✅ Fixed |
| 9 | **Ledger history indexes** — expression indexes on `metadata->>'productId'`, `'customerId'` and `'saleId'` keep product, customer and sale history fast. Expense history (`entity=expense`) has no index yet; fine while one business has few expense events, but add one if it slows down, and give any new entity type its own | ⚠️ Expense index missing |

## Explicitly out of scope for "production-ready MVP"

Per the blueprint's own roadmap, these are later-stage and shouldn't block
an initial launch: suppliers and purchases, offline mode, exports and PDF
receipts, per-branch stock, draft/cancel/refund sale workflows (schema-ready, no UI/endpoint yet), and
Level 2/3 payment verification (a real payment-provider integration — see
README "The app is a ledger, not a payment rail").
