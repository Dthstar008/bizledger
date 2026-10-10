# BizLedger — Production UI/UX Design Prompt

> Paste everything below the line into your design tool or AI designer (Figma AI, v0, Galileo, Claude, a human designer's brief). It is self-contained.

---

## 1. Role and deliverable

You are a senior product designer (mobile-first fintech, emerging-market focus). Design the complete, production-ready UI/UX for **BizLedger**, a mobile app that is the digital back office for Nigerian informal businesses (shops, market traders, phone-accessory sellers, provision stores, salons, food vendors). Deliver:

1. A design system (tokens, components, states) in a **green + gold** palette
2. High-fidelity screens for every flow in section 7, light and dark mode
3. Interaction, motion, empty/loading/error/offline states for every screen
4. Handoff notes mapped to React Native (Expo Router) — tokens named so they can replace `mobile/src/theme.ts` directly

Primary device: low-to-mid Android (360×800 baseline, 5.5–6.5"), often on 3G/flaky data, in bright daylight, used one-handed by someone mid-conversation with a customer. Secondary: iOS, large phones, tablet/web preview (max content width 640px, centered).

## 2. Product truth (design to this, don't invent beyond it)

BizLedger is a **ledger, not a payment rail**. The merchant records what happened; the app never pretends to move money. Core objects:

- **Products/inventory**: name, cost price, selling price, stock, low-stock threshold
- **Sales**: cart of items, per-line price override (haggling), payment method (cash, bank transfer, POS, OPay, PalmPay, credit, split), amount paid now, optional reference
- **Customers + debt**: each customer has outstanding balance; repayments allocate oldest-sale-first (FIFO) across their unpaid sales
- **Expenses**: categorized spend
- **Dashboard**: revenue, profit, cash, inventory value, outstanding debt, insights, for a chosen period
- **Ledger events** (append-only): SALE_CREATED, INVENTORY_DECREASED, PAYMENT_RECEIVED, CUSTOMER_CREDIT_CREATED, etc.
- **Payment status** per sale: `paid`, `partially_paid`, `credit`; **verified** only for cash; others are "merchant-entered" and must be honestly labeled, never shown as bank-confirmed
- Stage 2 (design now, mark as "coming soon" where not built): suppliers, offline mode, receipts

## 3. Brand identity (keep it exactly)

**Logo**: a rounded-square deep-green app tile; a white ledger book with cream spine (`#F4F1E8`), a bold green "B", three faint green ruled lines, and a **gold circular check badge** at the lower right. Keep proportions, the cream spine, and the gold badge as the single brand "stamp". Do not redraw or recolor the logo; on dark surfaces use the tile as-is (it already has its own green field).

**Personality**: trustworthy like a bank, warm like a market. Plain, confident, never corporate. A ledger that quietly says "your books are right."

**Brand motif**: the **gold check badge = confirmation**. Reuse it for every "recorded / settled / verified" moment (sale saved, debt cleared, cash verified). Gold means *money confirmed or something to notice*, never decoration.

**Voice**: short, direct, Nigerian-English friendly. ₦ always. Examples: "Sale recorded", "Chinedu owes ₦60,000", "Only 3 Oraimo Chargers left". Optional light Pidgin touches in empty states and success toasts, user-switchable ("Well done, oga!" off by default in formal contexts like receipts). No jargon: say "Money owed to you", not "Accounts receivable".

## 4. Color system (green + gold)

Existing brand hexes are fixed: green `#0B6E4F`, deep green `#084C37`, gold `#F5B800`, cream `#F4F1E8`.

### Light mode tokens
| Token | Hex | Use |
|---|---|---|
| `primary` | `#0B6E4F` | Primary buttons, active tab, links, key numbers |
| `primaryPressed` | `#084C37` | Pressed state, headers on dark hero cards |
| `primaryMuted` | `#E6F2EC` | Tinted chips, selected rows, icon backgrounds |
| `primarySoft` | `#BFDCCF` | Borders on selected items, progress track |
| `gold` | `#F5B800` | Brand accent, confirmation badge, FAB highlight, "attention" fills |
| `goldDeep` | `#8A6500` | Gold used as **text/icon on light** (5.3:1 on white) |
| `goldMuted` | `#FFF6D6` | Gold-tinted callouts, insight cards, low-stock banners |
| `onGold` | `#084C37` | Text/icons placed on gold fills |
| `background` | `#F7F6F1` | App background (warm, cream-leaning) |
| `surface` | `#FFFFFF` | Cards, sheets |
| `surfaceAlt` | `#F4F1E8` | Brand cream: ledger-paper areas, receipt, secondary fills |
| `border` | `#E3E1D6` | Dividers, card outlines |
| `text` | `#1B2B25` | Primary text (green-black, not pure black) |
| `textMuted` | `#5E6F68` | Secondary text (≥4.5:1 on background) |
| `danger` / `dangerMuted` | `#C0392B` / `#FBEAE8` | Debt overdue, destructive, errors |
| `success` | `#0B6E4F` | Same as primary: green *is* success; do not introduce a second green |
| `info` | `#2F6F8F` / `#E4F0F6` | Neutral notices, syncing |

### Dark mode tokens
`background #0E1A15`, `surface #15251E`, `surfaceAlt #1C2F26`, `border #274137`, `text #EAF2EE`, `textMuted #9DB4A9`, `primary #3FB58A` (lifted for contrast), `primaryMuted #1B3A2E`, `gold #F5B800` (unchanged, it pops on dark), `goldMuted #3A3010`, `danger #FF7B6B`. Dark mode is not an inversion: keep the green-black hue, never neutral gray.

### Color rules
- **Gold fill + deep-green text/icon only.** Never white text on gold, never gold text on white (use `goldDeep`).
- 60/30/10: ~60% neutrals (cream/white), ~30% green, ~10% gold. Gold appears at most once or twice per screen.
- Money semantics: money in = green, money owed to you = gold-deep, money out/overdue = red. Never rely on color alone: pair with ↑/↓ icons and +/− or labels.
- All text meets WCAG AA (4.5:1; 3:1 for ≥18px bold and UI components). Test in direct sunlight simulation (reduce contrast 20%) — status must still be distinguishable.
- Hero surfaces (dashboard balance card, onboarding) use a `primary → #084C37` vertical gradient with a faint cream ledger-line texture (3 horizontal rules, 6% opacity) echoing the logo.

## 5. Typography, spacing, shape, elevation

- **Typeface**: Plus Jakarta Sans (fallback: Inter → system). Brand assets currently use Arial; Jakarta keeps the friendly geometric "B" feel and has strong numerals. Enable **tabular lining numerals** for all money.
- **Scale** (sp): Display 32/38 bold · Title 22/28 bold · Heading 18/24 semibold · Body 16/24 regular · Label 14/20 medium · Caption 12/16 regular. Minimum body 16; never below 12. Respect system font scaling to 200% — layouts must reflow, not truncate money.
- **Money format**: `₦1,250,000.00` — ₦ at 80% size and baseline-aligned, whole naira by default, kobo only on detail/receipt. Large totals abbreviate only on charts/tiles (`₦1.25M`), never in tables or receipts. Negative = `−₦5,000`.
- **Spacing**: 4-pt grid (4, 8, 12, 16, 24, 32, 48). Screen gutter 16. Card padding 16. Minimum touch target **48×48dp**, 8dp between targets.
- **Radius**: 8 (inputs/chips), 12 (cards), 16 (sheets/hero), 999 (pills/FAB), 28 (app tile echo on onboarding illustrations).
- **Elevation**: cards use 1px `border` + very soft shadow (0 1 2 rgba(8,76,55,.06)); sheets 0 -8 24 rgba(8,76,55,.12). Shadows tinted green, not gray.
- **Iconography**: 24px, 2px rounded stroke, filled variant for active tab. Custom icons for: sale, stock, customer-debt, expense, repayment, verified (gold check badge), unverified (hollow circle). Channel marks (cash, transfer, POS, OPay, PalmPay) as neutral monochrome glyphs, not third-party logos.

## 6. Component library (design every one with all states)

States for each: default, pressed, focused (2px gold `#F5B800` focus ring + 2px offset for keyboard/switch access), disabled, loading, error.

- **Buttons**: Primary (green fill, white label), Gold (gold fill, deep-green label, reserved for the single most important positive action per screen: e.g. "Record sale"), Secondary (outlined green), Tertiary (text), Destructive (red outline → red fill on confirm). Height 52, full-width on forms; pill FAB 56 with gold fill and a "+" in deep green.
- **Inputs**: Floating-label text field, 56 high; money input with ₦ prefix, large numeric keypad and quick-amount chips (₦500, ₦1,000, ₦5,000, "Full amount"); quantity stepper (− 1 +, 48dp targets, long-press to repeat); search with barcode-scan affordance; phone field with +234 handling; PIN/OTP boxes. Inline validation text under the field, never only a red border.
- **Cards**: Stat tile (label, big number, delta chip), Hero balance card, List row (leading icon/avatar, title, subtitle, trailing amount + status), Insight card (gold-muted, lightbulb/check icon, one sentence, one action), Customer debt card, Product card (name, stock bar, price).
- **Chips/badges**: Payment status — `Paid` (green), `Part-paid` (gold-muted/deep-gold), `Credit` (red-muted); Channel chip; **Verified** (gold check badge, cash only) vs **Merchant-entered** (hollow outline, tooltip: "You recorded this. Not confirmed by a bank."); Low stock (gold-muted), Out of stock (red-muted).
- **Navigation**: 5-tab bottom bar (Home, Sales, Stock, Customers, Expenses) with active pill indicator in `primaryMuted` and a small gold dot for items needing attention (e.g. low stock). Center-docked or floating gold "New sale" FAB on Home/Sales. Top app bar: business name + sync status dot.
- **Sheets & dialogs**: Bottom sheets for pickers/confirmations (drag handle, 16 radius); full dialogs only for destructive confirmation.
- **Feedback**: Toast/snackbar (bottom, above tabs, with Undo for 6s on deletes/edits), inline banners (offline, sync failed, low stock), skeleton loaders in the shape of the content (cream shimmer, no spinners over 400ms), pull-to-refresh with gold progress arc.
- **Charts**: Revenue/profit bar chart (green bars, gold for the selected/"today" bar), expense donut (green tints + gold + neutral, max 5 slices, direct labels), sparkline in stat tiles. Always include a data-table fallback and text summary for screen readers.
- **Date range selector**: segmented chips Today · 7 days · This month · Custom, plus a calendar sheet.
- **Receipt component**: cream "ledger paper" card with perforated edge, business logo, itemized lines, totals, payment status, gold check stamp when settled; share-ready at 1080×1920 (WhatsApp status ratio) and 80mm thermal print layout.

## 7. Screens and flows (design all, mobile first)

### 7.1 Onboarding & auth
1. **Splash**: green field, logo tile fades up, gold check badge pops in with a 300ms spring.
2. **Welcome carousel (3 cards)**: "Know your real profit", "Never forget who owes you", "Your shop in your pocket". Illustrations in the brand's flat style (cream/green/gold), skip always visible, language toggle (English / Pidgin; Yoruba/Hausa/Igbo hooks in the layout).
3. **Register**: name, phone, business name, business type (picker with common Nigerian types + "Other"), password. Progressive: one question per step with a progress bar, because informal merchants distrust long forms. Reassurance microcopy: "Your records are private and stay yours."
4. **Login**: phone/email + password, biometric prompt, "Forgot password", error states (wrong credentials, locked, offline).
5. **First-run setup**: optional "Add your first product" and "Add opening cash" with skip; a 3-step checklist card persisting on Home until done.
6. **Permissions** (camera for barcode, contacts for customers, notifications): value-first pre-prompt sheets before the system dialog.

### 7.2 Home / Dashboard
- Greeting + business name, period selector, sync indicator.
- **Hero card**: Revenue (big), Profit and Cash beneath, delta vs previous period with ↑/↓.
- **Stat grid (2×2)**: Cash in hand, Inventory value, Money owed to you, Expenses.
- **Insights carousel** (gold-muted cards): low stock, top debtor, best-selling item, profit margin tip. Max 3, dismissible.
- **Quick actions row**: New sale, Add expense, Add stock, Record repayment.
- **Recent activity** list (ledger events rendered humanly: "Sold 2× Oraimo Charger — ₦14,000 — Chinedu (credit ₦9,000)").
- Empty state: hero card shows ₦0 with a coach-mark "Record your first sale" pointing at the gold FAB.

### 7.3 Sales
- **Sales list**: grouped by day with day totals, filter chips (All, Paid, Part-paid, Credit), search by customer/item.
- **New sale** (the most critical flow; optimized to finish in ≤ 4 taps for a repeat item):
  1. Product picker: search + recent/favorites grid, tap to add, barcode scan.
  2. Cart: lines with qty stepper; **tap price to override** (show catalog price struck through beside the haggled price and the margin impact in a subtle line, red if below cost: "Below cost price").
  3. Payment sheet: segmented method (Cash / Transfer / POS / OPay / PalmPay / Credit / Split). Amount paid now (defaults to full); if less, auto-shows "Customer owes ₦X" and requires a customer (search or quick-add). Optional reference field.
  4. Review & confirm: summary, big gold **"Record sale"** button.
  5. **Success**: gold check badge animation, receipt preview, actions: Share on WhatsApp, Print, New sale, Done. Undo window.
- **Sale detail**: items, totals, payment timeline (each Transaction: channel, amount, date, verified/merchant-entered chip, reference), repayments applied, cancel/refund (marked "coming soon" until built).
- Edge states: out-of-stock item (blocked with "Only 2 left, sell 2?"), offline (saves locally with "Waiting to sync" chip), duplicate-tap protection.

### 7.4 Inventory (Stock)
- **List**: search, filter (All, Low stock, Out), sort; each row has name, stock count with a thin stock-level bar (green → gold → red), selling price, margin %.
- **Product detail**: price/cost/margin, stock history (from ledger events), sales velocity, "Restock" action.
- **Add/Edit product**: name, photo (camera/gallery, compressed), cost price, selling price (live margin readout), stock, low-stock threshold, barcode, category.
- **Restock/adjust stock** sheet with reason (restock, damaged, counted).
- Bulk add via a fast "add many" spreadsheet-like mode.

### 7.5 Customers & debt
- **List**: toggle "All / Owing", total owed pinned at top in a gold-muted banner, sorted by amount owed or oldest debt; avatar initials in green tints.
- **Customer detail**: balance hero (red-muted if overdue, gold-muted if open), unpaid sales list with age ("12 days"), **Record repayment** primary action, call/WhatsApp buttons, **Send reminder** with a pre-written polite message (editable template).
- **Record repayment sheet**: amount (quick chips incl. "Full ₦X"), channel, reference; **FIFO preview** showing which sales it will clear ("Clears Sale #1042 ₦40,000, part-pays #1051"); success state with gold check and updated balance.
- **Add customer**: name, phone, notes, optional credit limit.
- Empty state: "No one owes you money. 🎉" (illustration, no guilt).

### 7.6 Expenses
- **List** grouped by day with category icon and total for the period; category filter chips.
- **Add expense**: amount-first big input, category grid (Transport, Rent, Stock purchase, Electricity, Data/Airtime, Salary, Other + custom), payment channel, note, receipt photo, date (default today), recurring toggle.
- **Insights**: category donut, biggest spend, trend vs last month.

### 7.7 Reports & ledger (Stage 1.5 surface)
- **Ledger / Activity log**: append-only event timeline with filters; entries are read-only and visually "ruled paper" (cream with faint lines) to reinforce immutability. Locked icon, tooltip: "Records can't be edited, only corrected with a new entry."
- **Reports**: Daily summary, Profit & loss, Debt ageing, Stock valuation. Each exports PDF/CSV and shares to WhatsApp. Period selector, comparison toggle.

### 7.8 Suppliers (Stage 2, design now, "Coming soon" gating in build)
Supplier list, supplier detail with money you owe them, purchase order/restock record, pay-supplier flow mirroring repayments (inverse direction, red/gold semantics swapped consistently).

### 7.9 Settings & account
Business profile (logo upload, name, address, phone, receipt footer), team/staff roles (owner vs cashier, hide cost/profit from cashiers), language, currency display, receipt template picker, notifications (low stock, debt reminders, daily summary at 8pm), security (PIN/biometric lock, session devices), data export/backup, offline/sync status, help (WhatsApp support chat), legal (Privacy, Terms, NDPA notice), logout, delete account (guarded). Theme: System/Light/Dark.

### 7.10 System & edge screens
- **Offline mode** (first-class): persistent slim banner "Offline — your sales are saved and will sync". Per-record sync chips (Waiting / Syncing / Synced / Failed with retry). Conflict-free messaging; never block selling.
- **Error states**: network, server, session expired (re-auth sheet preserving the in-progress sale), validation, permission denied.
- **404 / not found**: custom, on-brand ("This page isn't in your books").
- **Maintenance / force-update** screen.
- **Skeletons** for every list and the dashboard.
- **App lock** screen (PIN/biometric) with logo tile.

## 8. Interaction & motion

- 150–250ms ease-out for UI, 300–400ms spring for celebratory moments. Respect "reduce motion": replace with fades.
- Signature moment: **gold check badge stamp** (scale 0.6→1.1→1, subtle ring pulse) on sale recorded, repayment saved, debt cleared. Haptic success tap on Android/iOS.
- Number changes count up/down (300ms) on dashboard refresh; never animate money in forms.
- Swipe actions on list rows (call, remind, delete with undo). Pull-to-refresh. Long-press to multi-select.
- Optimistic updates everywhere with rollback toasts. Destructive actions need confirm; reversible ones use Undo instead of confirm.
- Forms preserve draft state if the app is killed mid-sale.

## 9. Accessibility & inclusion

- WCAG 2.2 AA minimum; targets ≥ 48dp; visible focus; screen-reader labels on every icon-only control (`accessibilityLabel` + role), logical focus order, money read as "five thousand naira".
- Never convey status by color alone. Support 200% font scale, bold-text setting, RTL-safe layout, one-handed reach (primary actions in the bottom 40% of screen).
- Low-literacy friendly: icon + label pairs, numeric-first inputs, minimal reading. Voice input on search and notes.
- Performance budget: first meaningful paint < 2s on a ₦50k Android; images compressed (WebP), lists virtualized, no layout shift; works on 360px width and 1GB RAM devices.
- Data-cost aware: no auto-playing media, small illustrations (SVG), "Data saver" toggle.

## 10. Trust, security & compliance UX

- Plain-language privacy reassurance at registration and in settings (NDPA-aligned consent, no dark patterns, decline-by-default for analytics).
- Never imply bank verification that doesn't exist: the Verified/Merchant-entered distinction is a core trust feature, show it consistently on sales, transactions, receipts and reports.
- Sensitive values (profit, cash) can be masked with an eye toggle; app lock blurs the task-switcher preview.
- Destructive/financial confirmations restate amount and party ("Clear ₦40,000 for Chinedu Okafor?").

## 11. Deliverables checklist

1. Token file (JSON/TS) matching section 4–5, drop-in for `mobile/src/theme.ts`
2. Component sheet with every state, light + dark
3. All screens in 7.1–7.10 at 360×800, plus key screens at 390×844 and tablet 768
4. Clickable prototype of: onboarding → first sale (cash) → credit sale → repayment → dashboard update
5. Empty / loading / error / offline variants for each list screen
6. Motion spec for the gold-check stamp, sheet transitions, count-up numbers
7. Accessibility annotations (focus order, labels, contrast ratios)
8. Copy deck (English + Pidgin) for all microcopy, toasts, empty states, errors
9. Asset exports: app icon (adaptive + monochrome), splash, notification icon, store screenshots (5, brand green background with gold callouts), receipt share template
10. A one-page "Do / Don't" brand usage guide for green + gold

## 12. Anti-patterns to avoid

Generic purple-blue fintech look; pure black/white or gray-neutral surfaces; gold used for body text or large fills everywhere; decorative gradients beyond the hero card; stock illustration people; dense tables on mobile; tiny close icons; modal-on-modal stacks; spinners with no skeleton; jargon (receivables, reconciliation, COGS); claiming bank-level verification; hiding the ₦ or abbreviating money in confirmations.
