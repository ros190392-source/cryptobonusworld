# CBW Homepage V2 Design Plan v1

- Task: CBW-UNIFIED-SITE-DESIGN-RESET-001 · 2026-07-22
- Status: **OWNER_APPROVED_UNIFIED_DESIGN_DIRECTION** — approved by the owner
  (CBW-UNIFIED-SITE-DESIGN-RESET-001-COMMIT, 2026-07-22)
- Homepage prototype v1 disposition (owner decision):
  `homepagePrototypeV1Status: SUPERSEDED_AS_DESIGN_DIRECTION_REFERENCE` ·
  `homepagePrototypeV1CommitAuthorized: false` ·
  `homepagePrototypeV1ProductionCandidate: false` — v1 remains uncommitted
  historical visual evidence; its validated first-screen budgets, row mechanics
  and scenario semantics carry over as engineering baseline only.
- Relationship to V1 prototype: the validated first-screen engineering (budgets,
  row mechanics, scenario/state logic, never-padded rule) carries over; the page
  composition, hero, and country browsing are **reconceived** under
  `CBW_UNIFIED_DESIGN_DIRECTION_v1`. The homepage is the platform's front door,
  not a list with a header.

## 1. Exact section order

1. **S1 — Platform hero (navy band).** Kicker "Crypto bonus intelligence" ·
   H1 (country-aware: "Best Crypto Exchanges in {Country}") · one-line value
   proposition · verification/trust line (evidence-based wording) · **country
   intelligence control** (see §3). Compact: the hero exists to hand off to S2.
2. **S2 — Primary commercial area (light surface, visually docked to the hero
   band).** Top-ranking `RANKING_ROW` list — Top-3 visually emphasized, rows
   4–10 continue in the same surface. Coverage/eligibility notice system renders
   here when applicable (low coverage, limited mix). First-screen rule applies (§2).
3. **S3 — "How CBW works / How we verify" (navy-tint system band).** 3-step
   verification model (evidence gathering → eligibility decision → continuous
   monitoring) + link to Methodology family. This is the trust engine of the page.
4. **S4 — Browse by country (light-alt).** Region-grouped browsing system (§3),
   no flag grid.
5. **S5 — Popular exchange reviews (light).** Wordmark-well cards (M slot),
   status badge, one-line verdict — informational, no codes/CTAs in cards.
6. **S6 — Guides & education (light-alt).** Editorial cards from the Guide family.
7. **S7 — Restricted or under review in {Country} (light, clearly separated).**
   `RESTRICTED_NOTICE` rows — red/gray badges, explanation, View Alternatives /
   View Details only. Never adjacent to S2 without S3–S6 between them.
8. **S8 — FAQ (light-alt).** Country-aware entries.
9. **S9 — Conversion recap (navy band).** Top-3 as compact `RANKING_ROW`s
   (permitted states only) — last commercial touch before the footer.
10. **Footer.**

## 2. First-screen structure (absolute rule, carried budgets)

Validated V1 budgets are the baseline and remain the gate:

- **Desktop (1440×900 / 1366×768 / 1280×720):** 56px header + hero ≤ ~190px +
  Top-3 rows fully commercial (wordmark, status, complete code + Copy, CTA
  bottom edge, note) inside the viewport. V1 measured row-3 CTA bottoms
  460–536/720 — V2 hero may spend at most that slack and must re-pass the gate.
- **Mobile (390×844 / 360×800 / 320×700):** compact hero (≤ ~120px incl.
  country chip) + Top-2 rows fully commercial. V1 worst case 681/700 — V2 must
  stay ≤ viewport with the same Playwright validation (in-viewport, no overlay
  coverage, ≥44px touch, no overflow-x).
- State rules in the first screen: AVAILABLE / AVAILABLE_WITH_LIMITS (refCompat
  verified) rows show full commercial controls; no restricted/unknown content
  ever appears in S2.

## 3. Country browsing concept — "country intelligence switcher", no flag spam

- **In-hero control:** a single search-select ("Change country · {Country}") —
  typeahead over covered countries; selecting re-scopes the page. One small flag
  glyph inside the control is acceptable; flags are never a browsing grid.
- **S4 browsing section:** text-first region groups (Europe · Asia · Americas ·
  Africa & Middle East · CIS) as columns of country links with coverage signal
  per country (e.g. "12 verified offers"), plus a "Popular" strip of 6–8 pill
  chips. Tiny inline flag glyph allowed at link level; typography carries the
  design, not flags.
- Coverage honesty: countries without verified coverage link to an under-review
  state page, never to a padded ranking.

## 4. Commercial row concept

`RANKING_ROW` variant of the OfferSurface family (single shared state machine):

- rank numeral (condensed, amber circle top-3) · **logo-slot M well v2**
  (per `CBW_LOGO_SLOT_UPGRADE_PROPOSAL_v1`) · name + status badge · one-line
  reason + bonus label · complete promo code + Copy (44px) · green CTA (44px) ·
  concise eligibility/limit note.
- Top-3 emphasized (border/shadow accent); ranks 4–10 identical grammar, calmer.
- Scenario behavior (validated in V1, retained): STANDARD_TOP10 · LIMITED_MIX
  (amber limit chips, controls retained) · LOW_COVERAGE (short honest list +
  transparent coverage message + Browse All / View Research Status; **never
  padded** with restricted or under-review exchanges).
- Mobile: stacked single-surface variant, full-width code row + CTA (44px+).

## 5. Below-the-fold architecture

- Band alternation per unified direction: S2 light → S3 navy-tint → S4 light-alt
  → S5 light → S6 light-alt → S7 light → S8 light-alt → S9 navy. Every section
  uses the shared kicker/h2/support header grammar.
- S3/S4/S5/S6 are shared section-library components (reused by Country,
  Directory, Methodology families) — built once in the foundation prototype.
- S7 separation rules: distinct section header naming the country, no green
  anywhere in the section, informational actions only.
- S9 recap consumes the same `RANKING_ROW` component (compact density), not a
  re-implementation.

## 6. Validation gates for the V2 prototype

1. First-screen Playwright matrix (3 scenarios × 6 required viewports + extras)
   — all-pass, header included, overlay-coverage checked.
2. Logo-slot gate from the upgrade proposal (fill band, height floor, no distortion).
3. Semantics: LOW_COVERAGE never padded; restricted section zero commercial
   controls; copy success + inert CTA + keyboard focus.
4. Build: noindex route under `/__design/`, sitemap-absent, zero `/go/**`,
   production untouched.
