# LALIGA FANVERSE: Concept and Execution Plan

*Don't just watch LALIGA. Play it.*

## 1. Concept Summary

**What it is.** FANVERSE is a participation layer that sits on top of the existing LALIGA match, broadcast and stadium experience and turns each match into a second game. Fans predict, vote live and battle rival fanbases, and LALIGA shows what fans *felt* against what the data *says*. It replaces nothing. It is not betting: rewards are XP, badges and rankings only, with no money, odds or deposits.

**Opportunity area.** LALIGA has huge attention for 90 minutes but little structured fan participation before, during or between matches. FANVERSE targets:
- active participation (something to do, not just watch)
- fan-to-fan interaction (rival fanbases on one scoreboard)
- recurring engagement (persistent XP and levels, plus a post-match report that brings fans back next matchday)
- belonging (one fan identity that follows the fan across matches)

**How it works: the core loop.**
1. **Predict.** Before kickoff the fan predicts the first scorer, first-15-minute control, a goal in the first 20 minutes, and the final score. Predictions lock at kickoff.
2. **Fan Pulse vote.** Timed live questions ("Who is controlling the match?") are triggered by match events. Fans answer once, and live percentages update.
3. **Fans vs. Data.** After the question closes, the fan result is shown beside the official data result. The *perception gap* is fan share minus data share, shown as one number plus both bars.
4. **Club Battle.** Fanbases compete on a live scoreboard scored by **average XP per active fan**, not raw totals, with a minimum-participation threshold. Smaller clubs can beat larger ones.
5. **XP and level-up.** An append-only XP ledger drives levels and per-match and season leaderboards. An AI-written post-match report shows predictions correct, percentile against other fans, strongest category, and level-up.

**Signature features.**
- **Fan Pulse:** a new perception-vs-reality story for broadcasters and social media.
- **Fan MVP vs. Data MVP:** "Fans say Vinícius. Data says Bellingham." Data MVP is a published composite of goals, assists, shots on target and key passes.
- **Club-vs-Club Battles:** fair by design because scores use per-fan averages.

**Scoring (transparent, documented in-app).** +10 XP per answered question; +40 for a correct answer, scaled by difficulty; a small early-answer bonus; fixed level thresholds.

## 2. Integration Plan

**Principle: additive, never a replacement.** FANVERSE consumes LALIGA data and sits beside broadcast, club apps and stadium. It does not compete with them.

| LALIGA ecosystem layer | Integration | What is required |
|---|---|---|
| Official match data | The prototype's JSON-replay simulator is swapped for the official licensed event feed. The `match_events` table is the single source of truth for "Data says". | Data licence and feed access; mapping of feed event types to the schema; latency SLA |
| Broadcast | A Fan Pulse overlay and "Fans vs. Data" graphics for broadcasters and social. The Next.js operator view already mocks the overlay. | Broadcaster agreement; graphics API/embed; broadcast-delay handling (already neutralised by server-side windows and reveals after close) |
| Clubs | Fan identity includes the chosen club. Per-club leaderboards and battles. Aggregate, privacy-conscious insights back to clubs. | Club rights/permissions, crests and brand assets; data-sharing terms |
| Official LALIGA apps / identity | Single sign-on so one fan identity follows the fan. FANVERSE can run standalone or as an embedded module. | SSO/OAuth integration; app-embedding agreement |
| Stadium (Phase 2) | QR/NFC quests for in-stadium fans. | Venue and ticketing partners; on-site connectivity |
| Sponsors (Phase 2) | Branded Fan Pulse questions and sponsor challenges. | Sponsorship framework with LALIGA; brand-safety review |

**Technical coherence.** Supabase (Auth, PostgreSQL with RLS, Realtime, Edge Functions) is managed, so no servers need running. Clients never write raw results. Votes go through an Edge Function that validates the time window and enforces one entry per user per question. Clients subscribe to **aggregates**, not individual votes, which keeps Realtime traffic small as the crowd grows. The data feed is a swappable adapter. Moving from the prototype to production means replacing the simulator, the placeholder assets and the managed-plan limits.

**What is needed to make it work:**
1. A licensed LALIGA data feed and club, player and broadcast rights.
2. A legal review for minors, GDPR and gambling-adjacent perception.
3. Capacity planning (Realtime limits, Postgres scaling) for production concurrency.
4. A named LALIGA product owner for identity/SSO and broadcast liaison.

## 3. Prototype Scope

**Built and demonstrated live at Demo Day**: a working, end-to-end simulated Clásico driven by a match-event simulator replaying a JSON timeline.
- Sign-up and login by email, club selection and an age gate (FR-1)
- Match lobby with kickoff state and a join action (FR-2)
- Three pre-match predictions, locked at kickoff (FR-3)
- A goal triggers a timed Fan Pulse question with live percentage results and auto-close (FR-4)
- Fans-vs-Data reveal with the perception gap (FR-5)
- Fan MVP vs. Data MVP comparison (FR-6)
- Club battle scoreboard shifting live (FR-7)
- XP, levels and per-match, season and per-club leaderboards (FR-8)
- AI post-match report via the Claude API from an Edge Function, with the key held server-side (FR-9)
- Web demo dashboard (Should): participants, predictions, votes, participation rate and club split, computed from real test data (FR-10)
- Stretch (Should/Could): account deletion and data export (FR-11), and badges (FR-12)

**Stack.** Expo (React Native, TypeScript) mobile client; Next.js on Vercel for the operator/overlay/metrics view; Supabase backend; Node/TypeScript simulator; Jest, a load-test script and GitHub Actions.

**Demo resilience.** Aggregate-only subscriptions, plus a local simulator and a pre-recorded fallback replay in case of network failure.

**Stays conceptual (architecture-ready, out of scope):**
- Official LALIGA feeds and licensed assets
- Stadium QR/NFC quests
- Live broadcast overlays on real feeds (mock-up only)
- Fan archetypes and the "Fan Momentum" metric
- Sponsor challenges and sponsor-facing insights
- Communities and production-scale concurrency

**Honesty rule.** All match data is labelled simulated. Placeholder assets are clearly marked.

## 4. Success Metrics

**Primary KPI: Active Participation Rate**, the share of viewers who take at least one action.
**Key habit metric: Match-to-Match Retention.**

| KPI | Definition | How evidenced |
|---|---|---|
| Active Participation Rate | Viewers with ≥1 prediction or vote ÷ viewers who joined | Live test with 50 participants watching a replayed match; read from the web dashboard (FR-10) |
| Interactions per user | Predictions + votes per participant | Counted from the `answers` table |
| Match-to-Match Retention | Participants returning for a second replayed match | Second session of the live test |
| Fan Pulse response rate | Answers ÷ viewers per question | `question_results` aggregates |
| Club battle spread | Participation split across clubs and the win rate of the smaller club | `battle_scores` |
| Report engagement | Share of participants who open their report | Event logging |

**Evidence approach.**
1. **Real measurement.** Participation, interactions and return rates come only from the live test. Report only numbers that were actually recorded, and say plainly that the sample is small.
2. **Technical verification.** Jest unit tests for scoring. The load test targets at least 1,000 simulated concurrent clients, subject to Supabase Realtime limits (check first). Targets: 95% of submissions confirmed in under 500 ms, and aggregates reaching clients within 2 s of a question closing.
3. **Modelling (clearly labelled as a model, not a result).** Project reach and engagement from the measured rates under stated assumptions (audience size, share of viewers who adopt the app, retention). Present a low/base/high range and list the assumptions explicitly.

The prototype makes no claims about millions of users.

## 5. Sustainability, Monetization and International Scalability

**Economic sustainability.** There is no consumer paywall, and no real-money mechanics are used or planned. Revenue paths:
- **Sponsor challenges and branded Fan Pulse questions** (Phase 2): the primary route.
- **Broadcast and media graphics:** "Fans vs. Data" content as a licensable package.
- **Aggregate, privacy-conscious insights for clubs and sponsors:** no personal data sold.
- **Club-level premium engagement tools** (e.g., custom club challenges).

**Cost side.** A managed backend (Supabase, Vercel) keeps fixed costs low. Costs scale with concurrency and AI report volume. Reports are cached and generated from structured stats only, which bounds the AI cost per fan.

**International scalability.**
- A club- and competition-agnostic schema (clubs, matches, events) works for other leagues and sports.
- Localisation of UI and AI reports (language is a parameter).
- Regional compliance configured per market (age of consent, GDPR-equivalent regimes).
- Aggregate-only Realtime design scales with crowd size rather than with votes.

## 6. Risk Mitigation

| Risk | Mitigation |
|---|---|
| **Deployment:** Realtime limits or network failure on demo day | Aggregate-only subscriptions; local simulator and recorded fallback replay; check Supabase plan connection limits before the load test |
| **Deployment:** Production scale beyond the prototype | Load-test, stage the rollout, capacity plan; edge functions are stateless and horizontally scalable |
| **Rights:** Use of LALIGA data, club/player/broadcast IP | Prototype uses simulated data and placeholder assets, clearly labelled. Production requires licensed feeds and rights before launch |
| **Gambling perception / regulation** | No money, deposits, withdrawals, odds or betting markets anywhere. Rewards are XP, badges and rankings only. Legal review before launch |
| **Data protection (GDPR / Spanish and EU law)** | Explicit consent at sign-up; minimisation (email, handle, club, age band); encryption in transit and at rest; account deletion and export; RLS on every table |
| **Minors** | Age gate. Under-18 accounts get no public profile, no free-text input and pseudonymous handles; parental consent where the applicable digital age of consent requires it. Legal review before production |
| **AI use** | The report prompt gets structured stats and the fan's handle only, never email or other personal data. The API key stays in the Edge Function |
| **Fairness and abuse** (bots, brigading, broadcast delay) | Server-side time windows and reveals after close; unique constraint of one answer per user per question; per-user and per-IP rate limits; CAPTCHA and email verification before counting toward a club battle; per-fan average scoring |
| **Fabricated-looking metrics** | Report only real test numbers; label simulated data as simulated; keep modelling separate and flagged |
| **Scope creep** | Phase 2 features (stadium, broadcast feeds, archetypes, sponsors) stay on the roadmap slide |

## 7. Requirements Check

| Requirement | How FANVERSE meets it |
|---|---|
| Measurable engagement | Participation rate, interactions per user and retention are measured from a live test and shown on the dashboard |
| International scalability | League-agnostic schema, localisable content, per-market compliance, aggregate-based Realtime |
| Coherent LALIGA integration | Additive layer on feed, broadcast, clubs, identity and stadium (see section 2) |
| Economic sustainability | Sponsor challenges, broadcast packages, aggregate insights, with no gambling or paywall (see section 5) |
| Technical and operational feasibility | Managed stack, a built and tested prototype, fallback plan and staged build (foundation, then predictions and Fan Pulse, then battles and XP, then reports and dashboard, then live test) |
