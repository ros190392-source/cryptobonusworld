# CBW Master SEO + Screenshot Page Factory

**Project:** CryptoBonusWorld  
**Version:** 1.0  
**Created:** 2026-06-05  
**Status:** ACTIVE — governing pipeline for all page production

---

## Purpose

This document is the unified operating system for producing premium exchange pages, bonus pages, comparison pages, country pages, guide pages, and future SEO landing pages on CryptoBonusWorld.

It connects SEO strategy, editorial content, evidence verification, screenshot capture, UX/conversion, schema/technical SEO, internal linking, and QA into a single repeatable production pipeline.

Every important page produced on this site must pass through this factory.

---

## Table of Contents

1. [Team Roles](#1-team-roles)
2. [Unified Page Pipeline](#2-unified-page-pipeline)
3. [Screenshot Rules](#3-screenshot-rules)
4. [Gold Standard Exchange Page](#4-gold-standard-exchange-page)
5. [Gold Standard Bonus Page](#5-gold-standard-bonus-page)
6. [Page Score System](#6-page-score-system)
7. [Schema Rules](#7-schema-rules)
8. [Internal Linking Standards](#8-internal-linking-standards)
9. [QA Checklist](#9-qa-checklist)
10. [Deploy + Live Verification](#10-deploy--live-verification)
11. [Binance Pilot Plan](#11-binance-pilot-plan)
12. [Governance Reference](#12-governance-reference)

---

## 1. Team Roles

Each role may be fulfilled by a human, an AI agent, or the owner acting in that capacity. Roles are not persons — they are responsibilities. On any given page, one person may fulfil multiple roles, but every role must be consciously checked.

---

### Role 1 — SEO Strategist

**Mission:** Define why the page will rank and for whom.

**Responsibilities:**
- Define the primary keyword and search intent (informational / transactional / navigational)
- Map the full keyword cluster (primary + secondary + long-tail)
- Define the SERP angle — what this page offers that outranks existing results
- Specify page type: exchange review / bonus landing / comparison / country / guide / use-case
- Write title and meta description direction (not final copy — strategic direction)
- Define the target user journey: what the user wants → what we show → where they go next
- Identify featured snippet opportunity (definition, table, how-to, FAQ)
- Check GSC / Yandex Webmaster for existing impressions on this URL pattern

**Key output:**  
`Page Brief` — keyword, intent, angle, title direction, meta direction, primary CTA

**Hard rule:** No page enters production without a documented keyword and intent.

---

### Role 2 — Editorial Lead

**Mission:** Make the page worth reading and worth ranking.

**Responsibilities:**
- Define page structure and section order based on user intent
- Write or brief the main editorial content (intro, core sections, verdict, FAQ)
- Ensure content depth matches the query — no thin pages, no padding
- Apply the E-E-A-T framework: Experience, Expertise, Authoritativeness, Trustworthiness
- Write in expert-style readable copy — not AI-bloat, not SEO keyword stuffing
- FAQ must answer real user questions (pulled from People Also Ask, GSC, support tickets)
- Long description must be factual, specific, and useful — not generic marketing
- Editor note must reflect genuine editorial opinion
- Reviewer block must be assigned to a real reviewer

**Key output:**  
Approved content structure + editorial draft

**Hard rule:** Any claim made in copy must be traceable to an evidence fact or a cited source.

---

### Role 3 — Evidence Auditor

**Mission:** Every factual claim on the page must be verified and tracked.

**Responsibilities:**
- Verify bonus amount, bonus currency, bonus expiry, bonus requirements
- Verify KYC requirement and access tier (checked/unchecked — per `KYC_ACCESS_CLAIMS_POLICY.md`)
- Verify spot fees, futures fees, P2P fees
- Verify deposit/withdrawal limits
- Verify geographic restrictions and supported countries
- Verify available trading products (spot, futures, P2P, staking, copy trading)
- Assign `confidenceScore` per fact (0.0–1.0)
- Set `conflictStatus`: `ok` / `outdated` / `needs-check` / `conflict`
- Set `manualReviewRequired: true` when human verification is required before publishing
- Update `lastChecked` on every fact that was actively checked
- Confirm all sources are official (exchange website, official FAQ, official fee schedule)

**Key output:**  
Updated `src/data/evidence/{exchange}.json` with all facts at correct confidence levels

**Hard rules:**
- `bonus_amount.confidenceScore < 0.5` → Product `offers` schema is suppressed automatically
- `kyc_required: false` claim requires `confidenceScore ≥ 0.70` + `conflictStatus: ok` + `manualReviewRequired: false`
- Never increase `confidenceScore` without a source or manual check

---

### Role 4 — Screenshot Director

**Mission:** Visual evidence must be present, accurate, curated, and professional.

**Responsibilities:**
- Create screenshot capture plan for the page (which slots, which device, which scope)
- Prioritize screenshots by editorial value (see §3 for priority tiers)
- Ensure all screenshots are captured from the public-facing platform (no authenticated private data)
- Inspect every screenshot before registering: no error states, no loading failures, no sensitive data
- File size check: desktop WebP < 200KB; mobile WebP < 150KB; anomalously small (< 20KB) → reject and recapture
- Register only clean, current screenshots in `src/data/evidence/{exchange}.json`
- Curate gallery display: mark `outdated` or keep `needs_manual_capture` for slots not ready
- Assign slots correctly (see `docs/SCREENSHOT_STANDARD.md`)
- Define recapture tasks for any slot that is blocked or needs refresh

**Key output:**  
Gallery-ready screenshot set registered in evidence. Recapture task list for pending slots.

**Hard rules:**
- Never commit a screenshot file without registering it in evidence
- Never register a screenshot without verifying the file exists on disk
- Never show an error-state screenshot in the gallery
- Never render "Screenshot in preparation" on a production page (suppress it via `screenshotStatus`)
- Gallery should show 4–6 curated screenshots for most pages — not all available slots

---

### Role 5 — UX Conversion Lead

**Mission:** Users who reach the page must be guided toward claiming the bonus without friction or pressure.

**Responsibilities:**
- Verify CTA button placement: above-the-fold, after verdict, after FAQ, sticky sidebar
- Verify sticky card renders correctly on desktop and mobile
- Verify bonus badge and amount are prominent without being misleading
- Verify the "Claim Guide" strip links to the bonus page
- Verify promo code is visible and copyable when applicable
- Verify mobile layout: sidebar collapses above main content, CTA is accessible
- Check for dead ends: pages must have at least one related exchange link
- Verify compare links work and are relevant
- Verify affiliate link is correct and uses the right referral parameters
- Do not add fake urgency (no "expires in 24 hours" unless true and evidenced)

**Key output:**  
UX sign-off — CTA present, mobile works, no dead ends, no false urgency

**Hard rules:**
- MEXC affiliate link is IMMUTABLE — never modify
- Bybit affiliate link is IMMUTABLE — never modify
- All CTAs must use `rel="noopener noreferrer sponsored"` on affiliate links

---

### Role 6 — Schema / Technical SEO Lead

**Mission:** Machine-readable signals must be clean, accurate, and spec-compliant.

**Responsibilities:**
- Verify Product schema emits when exchange data is sufficient
- Verify `offers` block is only present when `bonus_amount.confidenceScore ≥ 0.5`
- Verify `aggregateRating` uses real editorial rating (not fake reviews)
- Verify `FAQPage` schema when FAQ block is present
- Verify `BreadcrumbList` schema is correct
- Verify `HowTo` schema on walkthrough flows (if applicable)
- Verify `ReviewPage` schema matches actual reviewer
- Verify canonical URL is absolute and matches sitemap format
- Verify OG image exists and is accessible
- Confirm page appears in `sitemap.xml` with correct `lastmod`
- Confirm `robots.txt` does not block the page
- Run `npm run schema:check` — must exit 0

**Key output:**  
Schema sign-off — `schema:check` passing, canonical correct, OG image present

**Hard rule:** `schema:check` must exit 0 before the page can be deployed.

---

### Role 7 — Internal Linking Architect

**Mission:** Every page must be connected to the site's link graph — no dead ends, no orphans.

**Responsibilities:**
- Exchange page → its own bonus page (`/bonuses/{slug}-bonus/`)
- Bonus page → its exchange page (`/exchanges/{slug}/`)
- Exchange page → 2–3 compare pages (`/compare/{pair}/`)
- Exchange page → relevant guide pages (`/guides/`)
- Exchange page → country pages where relevant
- Bonus page → category page that matches bonus type
- Ensure AlternativesBlock renders with 3–5 alternatives
- Ensure PeopleAlsoCompare block has relevant pairs
- Ensure RelatedNextReads has at least 2 items
- Verify anchor text is natural and keyword-relevant — not "click here"
- Verify coin cross-links render for top 6 coins

**Key output:**  
Internal linking audit — all required links present, no dead ends

**Minimum internal links per exchange page:** 6 (bonus page + 2 compare + 2 alternatives + 1 guide/use-case)

---

### Role 8 — Visual Director

**Mission:** The page must look premium. Visual elements must reinforce trust, not undermine it.

**Responsibilities:**
- Verify screenshot gallery renders cleanly (correct aspect ratios, no overflow, no squished images)
- Verify OG image exists and is visually correct (not a fallback/blank)
- Verify hero section renders cleanly on desktop and mobile
- Verify bonus badge and promo code card are visually prominent
- Verify no large empty blocks on the page (no whitespace voids from placeholder components)
- Verify verdict block and experience grid render when data is present
- Verify mobile layout: sidebar collapses, images scale correctly
- Verify all card borders, shadows, and color treatments are consistent
- Flag any visual inconsistency that makes the page look unfinished

**Key output:**  
Visual sign-off — gallery clean, no empty blocks, hero/sidebar look premium

---

### Role 9 — Final QA Auditor

**Mission:** Nothing ships broken. Every signal must be verified before deploy.

**Responsibilities:**
- Run the full QA script set (see §9 for commands)
- Verify dist output: correct page count, no build errors
- Verify Binance gallery (and affected pages) renders correctly in built HTML
- Verify no "Screenshot in preparation" in built HTML
- Verify no affiliate link was modified
- Verify no file in `reports/`, `.browser-profiles/`, `.claude/` was committed
- Run live check after deploy (see §10)
- Sign off on the deploy

**Key output:**  
QA sign-off — all scripts pass, build clean, live check passes

---

## 2. Unified Page Pipeline

Every page produced on CryptoBonusWorld follows this 9-stage pipeline. Stages may be run concurrently where independent, but no stage may be skipped.

---

### Stage 1 — Page Brief

Document the following before any work begins:

| Field | Example |
|-------|---------|
| Page type | Exchange review |
| Target URL | `/exchanges/binance/` |
| Primary keyword | `Binance bonus 2026` |
| Search intent | Transactional — user wants to claim the bonus |
| User problem | "Is the Binance bonus real? How do I claim it?" |
| Monetization goal | Affiliate click-through via bonus CTA |
| Primary CTA | `Claim Binance Bonus` → affiliate URL |
| Evidence needed | bonus_amount, fees, kyc_required, restrictions |
| Screenshots needed | registration, bonus_referral_landing, fees, proof_of_reserves, p2p, spot |
| Schema type | Product + ReviewPage + FAQPage + FinancialService |
| Featured snippet target | Bonus amount table / step-by-step claim FAQ |

**Hard rule:** No page enters Stage 2 without a completed Page Brief.

---

### Stage 2 — Evidence First

Before writing copy, all claims must be verified.

**Verification priority order:**
1. `bonus_amount` — what is the current maximum? Is it the same as advertised?
2. `bonus_requires_deposit` + `bonus_min_deposit` — what does the user actually need to do?
3. `kyc_required` — is KYC mandatory? What level?
4. `spot_maker_fee` / `spot_taker_fee` — are fees correctly cited?
5. `restricted_us` + country restrictions — where is the exchange NOT available?
6. `futures_available` / `p2p_available` — are claimed features actually live?
7. `proof_of_reserves` — is PoR published and current?

**Confidence thresholds:**

| Score | Meaning | Action |
|-------|---------|--------|
| ≥ 0.85 | Human-verified, recently confirmed | Publish claim directly |
| 0.70–0.84 | Verified but not recently checked | Publish with last-checked date |
| 0.50–0.69 | Partially verified | Publish with caveat or range |
| 0.27–0.49 | Low confidence / stale | Mark `outdated`, do not publish as fact |
| < 0.27 | Unverified | Do not publish claim |

**Schema gate:**
- `bonus_amount.confidenceScore ≥ 0.5` AND `conflictStatus === 'ok'` AND `manualReviewRequired === false` → emit `offers` in Product schema
- All other cases → suppress `offers`

---

### Stage 3 — Screenshot Plan

For every page, complete the screenshot plan before capture:

| Role | Slot | Purpose | Claim it supports |
|------|------|---------|-------------------|
| Proof | `bonus_referral_landing` | Shows the bonus amount as visible on the live platform | Bonus amount is real and claimable |
| Onboarding | `registration` | Shows the actual signup form | Registration is straightforward |
| Trust | `proof_of_reserves` | Shows PoR dashboard | Exchange is transparent about reserves |
| Product | `spot` or `futures` | Shows the trading interface | Exchange is functional and professional |
| Fees | `fees` | Shows the official fee schedule | Fee claims are accurate |
| Optional | `p2p` | Shows P2P marketplace | P2P availability claim is accurate |
| Optional mobile | `mobile_app` | Shows the mobile app | Mobile UX claim is accurate |

**Pre-capture checklist for every screenshot:**
- [ ] Captured from the live public platform (not a staging or demo environment)
- [ ] No authenticated private data visible (no balance, email, UID, phone number)
- [ ] No error state, loading spinner, or empty content area
- [ ] Page has fully loaded (no skeleton screens)
- [ ] File size > 20KB (< 20KB → likely error/empty state → reject)
- [ ] Saved as WebP (not JPG, not PNG for new captures)
- [ ] Named `{scope}-{device}-{YYYY-MM}.webp`
- [ ] Placed at `public/screenshots/{exchange}/{slot}/`
- [ ] Registered in `src/data/evidence/{exchange}.json` with `status: "available"`

---

### Stage 4 — Content Structure

**Standard outline for exchange review pages:**

```
H1: {Exchange Name} Bonus {Year}: {Bonus Title}

[Hero — bonus amount, rating, CTA]
[Trust bar — last reviewed date, reviewer name]

## What Is the {Exchange} Bonus?
  [Bonus amount, type, what user gets]
  [Bonus badge + quick conditions]

## Quick Verdict
  [Best for / Not recommended if]
  [Rating + editorial note]

## Bonus Conditions
  [Max bonus, min deposit, trading volume, expiry, KYC]

## Screenshot Gallery
  [Curated 4–6 screenshots with desktop chrome]

## How to Claim the Bonus — Step by Step
  [Numbered walkthrough with real screenshots where available]

## KYC Verification Requirements
  [What documents, what tier, what limits without KYC]

## Deposit and Withdrawal
  [Methods, minimums, fees, timeframes]

## Trading Products
  [Spot / Futures / P2P / Staking — what is available]

## Fees
  [Spot maker/taker, futures maker/taker, P2P]
  [Fee snippet table for featured snippet targeting]

## Security and Proof of Reserves
  [PoR status, cold storage, 2FA, anti-phishing]

## Country Availability
  [Where available, where blocked, geo-regulatory note]

## Pros and Cons

## FAQ
  [8–12 real user questions]

## Related Pages
  [Compare vs X, bonus code page, country guide]

## Final CTA
```

---

### Stage 5 — UX Layout

**Required CTA placements:**

| Location | Desktop | Mobile |
|----------|---------|--------|
| Hero section | Primary CTA button (full width) | Primary CTA button (full width) |
| Sticky sidebar | Always visible while scrolling | Sidebar collapses to top — show before content |
| After verdict block | Secondary CTA | Inline CTA |
| After conditions grid | Mid-page CTA | Mid-page CTA |
| End of page | Final CTA | Final CTA |

**Sticky card must include:**
- Bonus amount (large, prominent)
- KYC and deposit requirements (2 lines)
- Rating
- Promo code (if applicable)
- Primary CTA button

**Mobile layout rule:**
- Below 960px: sidebar moves above main content
- Below 768px: sticky bottom CTA bar activates (80px padding-bottom on page)

---

### Stage 6 — Schema

See dedicated §7 for full schema rules.

**Quick reference:**

| Page type | Required schemas |
|-----------|-----------------|
| Exchange review | Product + ReviewPage + FinancialService + BreadcrumbList + FAQPage |
| Bonus page | Product + BreadcrumbList |
| Comparison page | Product (×2) + BreadcrumbList |
| Country page | BreadcrumbList + FAQPage |
| Guide | Article + BreadcrumbList + FAQPage |

---

### Stage 7 — Internal Linking

See §8 for full standards.

**Minimum per exchange page:**
- 1 → bonus page
- 2 → compare pages
- 2 → alternatives
- 1 → guide or use-case
- 6 → coin pages

---

### Stage 8 — QA

See §9 for full QA checklist and commands.

**Required before every deploy:**
```bash
npm run build              # 207 pages, 0 errors
npm run schema:check       # exit 0
npm run validate:evidence  # no errors
npm run evidence:governance # no violations
npm run audit:screenshots  # P1 errors: 0
npm run audit:production   # no critical failures
```

---

### Stage 9 — Deploy + Live Check

See §10 for full live verification.

**Deploy command:**
```bash
npm run deploy
```

Verify 6 URLs after every deploy (see §10).

---

## 3. Screenshot Rules

### Path Standard

```
public/screenshots/{exchange}/{slot}/{scope}-{device}-{YYYY-MM}.webp
```

### Allowed Slots

| Slot | Gallery priority | Public-safe | Notes |
|------|-----------------|-------------|-------|
| `registration` | 1 — always show | ✅ | First visual proof of onboarding |
| `bonus_referral_landing` | 2 — show when available | ✅ | Best trust signal — shows actual bonus offer |
| `bonus` | 2 — secondary to `bonus_referral_landing` | ✅ | Use if `bonus_referral_landing` unavailable |
| `fees` | 3 — show when available | ✅ | Supports fee claims |
| `proof_of_reserves` | 4 — show when available | ✅ | Strong trust signal |
| `p2p` | 5 — show when available | ✅ | Supports P2P availability claim |
| `spot` | 5 — show when available | ✅ | Supports trading product claim |
| `futures` | 6 — secondary to `spot` | ✅ | Use if spot unavailable or futures-specific content |
| `mobile_app` | 6 — optional | ✅ | Must be a real app screenshot > 20KB |
| `kyc` | Only in authenticated walkthroughs | ⚠️ Manual | Must blur any personal data |
| `deposit` | Only in authenticated walkthroughs | ⚠️ Manual | Must blur addresses and amounts |
| `withdrawal` | **FORBIDDEN in public gallery** | ❌ Hard block | SR-02 |
| `security` | Only in authenticated walkthroughs | ⚠️ Manual | Blur API keys, 2FA secrets |

### Gallery Curation Rules

| Exchange tier | Target visible screenshots |
|--------------|--------------------------|
| Gold (Binance, Bybit) | 6 curated |
| Strong (OKX, MEXC, Bitget) | 4–6 curated |
| Acceptable (BingX, Gate.io, KuCoin, HTX) | 2–4 curated |
| Pending (Phemex, Bitunix, LBank, CoinEx, Coinbase) | 0–2 — only if clean |

### Status Values and Gallery Behaviour

| Status | Gallery renders? | When to use |
|--------|-----------------|-------------|
| `available` | ✅ Yes | File on disk, clean, verified |
| `needs_manual_capture` | ❌ No | Slot exists but not yet captured |
| `not_applicable` | ❌ No | Feature does not exist on this exchange |
| `outdated` | ❌ No | Screenshot is stale, redundant, or superseded |
| `archived` | ❌ No | Replaced by newer capture |

### Error-State Detection

A screenshot is an error-state capture if any of the following are true:
- File size < 20KB (desktop) or < 15KB (mobile)
- Notes or manual inspection reveal text: "An Error Occurred", "Something went wrong", "404", "403", "Service Unavailable", "Loading...", skeleton UI
- Image shows a blank white or blank dark page
- Image shows a browser error page

**Action when error-state detected:** Set `status: "needs_manual_capture"`, set `path: null`, document in `notes` with original path for reference.

### Orphan Files

Files in `public/screenshots/` that are not registered in any evidence file and not referenced in `exchange-walkthroughs.ts` are orphans. Per `docs/SCREENSHOT_STANDARD.md §7`:
- Do not delete orphans in sprint work
- Document them
- Move to `public/screenshots/_archive/{exchange}/` in cleanup sprints

---

## 4. Gold Standard Exchange Page

A gold-standard exchange page scores 90–100 on the Page Score System.

### Required Sections — Exchange Review Page

| Section | Required | Quality gate |
|---------|----------|-------------|
| Hero (h1, bonus amount, rating, CTA) | ✅ Mandatory | Bonus amount matches evidence |
| Author/reviewer attribution | ✅ Mandatory | Real reviewer from registry |
| Trust/freshness bar | ✅ Mandatory | lastVerified date |
| "Why trust this review?" expandable | ✅ Mandatory | Lists verified claims |
| FactCheckPanel or EvidenceVerificationBlock | ✅ Mandatory | All facts traceable |
| Curated screenshot gallery | ✅ Mandatory | 4–6 screenshots, no error states |
| Quick Verdict / best-for | ✅ Mandatory for top 8 exchanges | Content override present |
| Bonus conditions icon grid | ✅ Mandatory | Amount, KYC, deposit, expiry, payment methods |
| Fee snippet table | ✅ Mandatory for top 8 exchanges | Spot + futures fees from evidence |
| Registration walkthrough | ✅ Mandatory for top 5 exchanges | Real screenshots, no placeholders |
| KYC section | ✅ Mandatory | Claim safety checked |
| Country availability | ✅ Mandatory | Correct exclusions listed |
| Pros and cons | ✅ Mandatory | At least 3+3, editorial quality |
| FAQ | ✅ Mandatory | 8+ items, real user questions |
| About exchange (review section) | ✅ Mandatory | 150+ words, factual |
| AlternativesBlock | ✅ Mandatory | 3–5 alternatives |
| Compare vs grid | ✅ Recommended | 2–4 compare pairs |
| Coin cross-links | ✅ Recommended | 6 coins |
| Related next reads | ✅ Recommended | 2–4 items |
| Final CTA + bonus guide link | ✅ Mandatory | Links to /bonuses/{slug}-bonus/ |
| Risk disclaimer | ✅ Mandatory | At bottom of page |

### Editorial Quality Gates

| Gate | Standard |
|------|---------|
| Long description | ≥ 150 words, factual, no filler, no keyword stuffing |
| Editor note | Genuine editorial opinion, not marketing |
| Reviewer | Real name from reviewers registry |
| Bonus note | Honest about conditions — not overselling |
| FAQ | Answers real user questions from PAA / GSC data |

---

## 5. Gold Standard Bonus Page

A gold-standard bonus page scores 90–100 on the Page Score System.

### Required Sections — Bonus Landing Page

| Section | Required | Quality gate |
|---------|----------|-------------|
| H1 with exchange name and bonus amount | ✅ Mandatory | Amount matches evidence |
| Hero CTA | ✅ Mandatory | Correct affiliate URL |
| Promo code callout | ✅ Mandatory (if code exists) | Code is current |
| Bonus conditions summary | ✅ Mandatory | KYC, deposit, expiry, trading volume |
| Bonus tiers breakdown | ✅ Mandatory if tiers exist | Each tier has title + condition |
| Step-by-step claim guide | ✅ Mandatory | Numbered steps, specific, accurate |
| Who can claim / restrictions | ✅ Mandatory | Geographic restrictions listed |
| What you must do (tasks) | ✅ Mandatory | Deposit tasks, trading tasks, time windows |
| Screenshot or walkthrough | ✅ Recommended | Registration screenshot or claim step screenshot |
| Common mistakes to avoid | ✅ Recommended | 3–5 real gotchas |
| Comparison strip | ✅ Recommended | 2–3 alternative bonuses |
| FAQ | ✅ Mandatory | 6+ items, real user questions |
| Trust verification block | ✅ Mandatory | Shows evidence source and last checked date |
| Final CTA | ✅ Mandatory | Correct affiliate URL |
| Risk disclaimer | ✅ Mandatory | At bottom of page |

---

## 6. Page Score System

Pages are scored out of 100. This score is used to prioritise improvement sprints.

### Score Breakdown

| Dimension | Max | How to score |
|-----------|-----|-------------|
| **SEO Intent** | 15 | Keyword targeted: +5. Title ≤ 60 chars with keyword: +3. Meta desc ≤ 160 chars: +2. Featured snippet opportunity present: +3. Canonical correct: +2. |
| **Content Depth** | 20 | All required sections present: +8. Editorial quality (no thin copy, no padding): +5. FAQ ≥ 8 items with real answers: +4. Long description ≥ 150 words: +3. |
| **Evidence Quality** | 15 | Bonus fact confidence ≥ 0.85: +6. Fees verified from official source: +4. KYC claim correctly gated: +3. No `manualReviewRequired: true` open items: +2. |
| **Screenshot / Visual Quality** | 15 | ≥ 4 curated screenshots present: +6. No error-state screenshots: +4. No "Screenshot in preparation": +3. Gallery in logical order: +2. |
| **UX / Conversion** | 10 | CTA present above fold: +3. Sticky card renders on desktop: +3. Mobile layout correct: +2. No dead ends (internal links present): +2. |
| **Schema / Technical SEO** | 10 | `schema:check` exits 0: +4. Product schema present: +2. FAQ schema present: +2. OG image exists: +2. |
| **Internal Linking** | 10 | Bonus page linked: +2. 2+ compare pages linked: +3. Alternatives present: +2. Guide or use-case linked: +2. Coins linked: +1. |
| **Compliance / Risk Safety** | 5 | No unverified KYC claims: +2. Affiliate disclosure present: +2. Risk disclaimer present: +1. |

### Score Tiers

| Score | Tier | Meaning | Action |
|-------|------|---------|--------|
| 90–100 | 🥇 Gold | Premium SEO asset, no blockers | Monitor only |
| 75–89 | 🥈 Strong | Minor gaps, competitive | Fix in next sprint |
| 60–74 | 🥉 Acceptable | Significant gaps | Schedule improvement |
| < 60 | ❌ Needs expansion | Below standard | Block deployment until improved |

---

## 7. Schema Rules

### When Product Schema Is Allowed

Product schema is always allowed on exchange review and bonus pages. It represents the exchange's bonus offer as a product.

### When `offers` Block Is Allowed

`offers` (with `price` and `priceCurrency`) is only emitted when **all three** conditions are true:

```
bonus_amount.conflictStatus === 'ok'
AND bonus_amount.manualReviewRequired !== true
AND bonus_amount.confidenceScore >= 0.5
```

If any condition fails, the `offers` block is entirely suppressed. The `schema:check` script enforces this at CI time.

**Currently `offers`-safe exchanges (Sprint 03):**

| Exchange | Confidence | Offers schema |
|----------|------------|--------------|
| Binance | 0.85 | ✅ Emitted |
| OKX | 0.85 | ✅ Emitted |
| Bybit | 0.27 | ❌ Suppressed |
| MEXC | 0.27 | ❌ Suppressed |
| All others | 0.27 | ❌ Suppressed |

### AggregateRating

- `ratingValue` = the exchange's editorial `rating` field (out of 10)
- `bestRating` = 10
- `ratingCount` = 1 (editorial review — not crowd-sourced)
- Never use fake review counts

### Currency in Offers

- Use `USDT` for USDT-denominated bonuses
- Use `USD` only for USD-denominated bonuses (e.g. Coinbase)
- Marketing pages may display "USD" — this is not the schema currency; use actual denomination

### Schema Prohibited Actions

- Never add `offers.price = 0` — this misrepresents the bonus
- Never increase `ratingValue` above the editorial rating in exchanges.json
- Never use `@type: Review` with `ratingValue` from a third-party site
- Never add keywords to `name` field in Product schema

---

## 8. Internal Linking Standards

### Required Links Per Page Type

**Exchange review page minimum links:**

| Link type | Min count | Target |
|-----------|-----------|--------|
| Own bonus page | 1 | `/bonuses/{slug}-bonus/` |
| Compare pages | 2 | `/compare/{pair}/` |
| Alternative exchanges | 3 | AlternativesBlock |
| Related guide | 1 | `/guides/{guide-slug}/` |
| Coin pages | 6 | `/coins/{coin-slug}/` |
| Bonus code page | 1 (if code exists) | `/bonus-codes/{slug}/` |

**Bonus page minimum links:**

| Link type | Min count | Target |
|-----------|-----------|--------|
| Own exchange page | 1 | `/exchanges/{slug}/` |
| Alternative bonuses | 2 | `/bonuses/{other-slug}-bonus/` |
| Category page | 1 | `/categories/{type}/` |

### Anchor Text Rules

| Rule | Example |
|------|---------|
| Use keyword-relevant anchors | "Binance referral bonus" not "click here" |
| Match user intent | "Compare Binance vs Bybit" on compare links |
| No over-optimized exact match | Vary between "Binance bonus", "claim Binance offer", "Binance referral reward" |
| CTAs use brand name | "Claim Bybit Bonus" — not generic |

### Compare Pair Priority

Top compare pairs to create (highest user demand):
1. Binance vs Bybit
2. Binance vs OKX
3. Bybit vs OKX
4. MEXC vs Bybit
5. Bitget vs Bybit
6. OKX vs MEXC

---

## 9. QA Checklist

Run all commands from project root. Every command must pass before deploy.

```bash
# 1. Evidence validation
npm run validate:evidence
# Expected: no errors

# 2. Evidence governance
npm run evidence:governance
# Expected: no violations

# 3. Screenshot registry audit
npm run audit:screenshots
# Expected: 🚨 0 (P1 errors)

# 4. Production audit
npm run audit:production
# Expected: no critical failures

# 5. Schema check
npm run schema:check
# Expected: CI errors: 0

# 6. Build
npm run build
# Expected: 207 pages (or correct page count), 0 errors, 0 warnings

# 7. Affiliate audit
npm run affiliate:audit:strict
# Expected: 0 violations

# 8. SEO check
npm run seo:check --fail-on-ci
# Expected: exit 0
```

### Pre-Commit Checklist

- [ ] `git diff --cached --name-only` — verify only intended files are staged
- [ ] No `reports/` files staged
- [ ] No `.browser-profiles/` files staged
- [ ] No `.claude/` files staged
- [ ] No `.auth/` files staged
- [ ] No raw screenshots committed (only registered screenshots in `public/screenshots/`)
- [ ] No affiliate URLs modified
- [ ] `npm run audit:screenshots` P1 errors: 0
- [ ] `npm run build` 207 pages, 0 errors

### Post-Build HTML Verification (Binance reference)

```bash
# Gallery count
grep "sg-count" dist/exchanges/binance/index.html | grep -o "[0-9]* screenshots"
# Expected: 6 screenshots

# No placeholders
grep -c "Screenshot in preparation" dist/exchanges/binance/index.html
# Expected: 0

# No dev notes in captions
grep "orphan\|Sprint 03\|standardization" dist/exchanges/binance/index.html
# Expected: 0

# Favicon
grep "favicon.ico" dist/index.html
# Expected: 1 or more (favicon link present)
```

---

## 10. Deploy + Live Verification

### Deploy Command

```bash
npm run deploy
```

**What `npm run deploy` does:**
1. Cleans `dist/`
2. Runs `astro build` (207 pages)
3. Packages `dist/` as `dist.tar.gz`
4. SCPs to `root@23.88.106.140:/tmp/`
5. SSH: extracts to `/var/www/cryptobonusworld/html/`
6. Cleans `dist.tar.gz` locally
7. Submits 42 priority URLs to IndexNow (Bing + Yandex)

**Server:** `root@23.88.106.140`  
**Web root:** `/var/www/cryptobonusworld/html/`  
**SSH key:** `~/.ssh/cryptovek_id`

**Important:** `git push` does NOT deploy. There is no GitHub Actions deploy workflow. The only way to update production is `npm run deploy`.

### Post-Deploy HTTP Verification

Check these 6 URLs after every deploy:

```bash
# Core pages
curl -o /dev/null -s -w "%{http_code}" https://cryptobonusworld.com/
curl -o /dev/null -s -w "%{http_code}" https://cryptobonusworld.com/favicon.ico
curl -o /dev/null -s -w "%{http_code}" https://cryptobonusworld.com/sitemap.xml
curl -o /dev/null -s -w "%{http_code}" https://cryptobonusworld.com/robots.txt

# Key exchange pages
curl -o /dev/null -s -w "%{http_code}" https://cryptobonusworld.com/exchanges/binance/
curl -o /dev/null -s -w "%{http_code}" https://cryptobonusworld.com/exchanges/bybit/
```

All must return `200`.

### Post-Deploy Content Spot-Check

After every deploy, manually verify (or via curl + grep):

| Check | Expected |
|-------|---------|
| Homepage exchange order | bybit, binance, okx, mexc, bitget... |
| Binance gallery | 6 screenshots visible |
| No "Screenshot in preparation" live | 0 occurrences |
| Bybit gallery renders | Yes (walkthrough steps present) |
| IndexNow Yandex response | `{"success":true}` |

---

## 11. Binance Pilot Plan

Binance is the first exchange to reach gold-standard. It is at homepage position #2 and has the highest-confidence bonus evidence on the site.

### Sprint 03 Completed (as of 2026-06-05)

| Item | Status |
|------|--------|
| Homepage position | ✅ #2 (Bybit #1, Binance #2) |
| favicon.ico | ✅ Live, 200 OK |
| Product schema offers | ✅ Emitted (confidence 0.85) |
| Schema:check | ✅ 0 errors |
| Screenshot gallery | ✅ 6 curated screenshots |
| mobile_app error-state | ✅ Hidden (needs_manual_capture) |
| bonus_referral_landing | ✅ Promoted to position 2, caption cleaned |
| "Screenshot in preparation" | ✅ 0 occurrences |
| IndexNow submission | ✅ 42 URLs to Bing + Yandex |
| Walkthrough (registration) | ✅ Real screenshots, no placeholders |

### Next Binance Tasks (Sprint 04 scope)

**P1 — Owner action required:**

| Task | Who | What |
|------|-----|------|
| T01-BYBIT-BONUS-OWNER-VERIFY | Owner | Visit Bybit promo page, confirm 30,000 USDT bonus → raise confidence 0.27 → 0.85 |
| Recapture `mobile_app` screenshot | Screenshot Director | Open Binance mobile app, capture dashboard/trading view, file > 20KB, WebP, register |

**P2 — Editorial improvements:**

| Task | Target |
|------|--------|
| Add content override for Binance verdict block | `src/data/content-overrides.json` — add `verdict.quickVerdict`, `verdict.bestFor`, `verdict.avoidIf` |
| Add experience grid data for Binance | `src/data/content-overrides.json` — add `experience` block |
| Improve Binance long description | 200+ words, factual, covers futures/P2P depth |
| Add Binance bonus tier data | `src/data/exchanges.json` — `bonusTiers` array |

**P3 — Visual / gallery:**

| Task | Target |
|------|--------|
| OG image for Binance | `public/og/exchange-binance.png` — verify design is current |
| Recapture `fees` if Binance updates fee schedule | Sprint 04+ |
| Add `kyc` screenshot to evidence | Authenticated — manual review required |

### Binance Page Score (Current estimate)

| Dimension | Score | Notes |
|-----------|-------|-------|
| SEO Intent | 14/15 | Keyword targeted, canonical correct, OG present; sitemap pending Yandex submission |
| Content Depth | 15/20 | Sections present; verdict/experience blocks missing |
| Evidence Quality | 13/15 | bonus 0.85, fees 0.76; some fields still outdated |
| Screenshot Quality | 13/15 | 6 curated, no errors; mobile_app pending recapture |
| UX / Conversion | 9/10 | CTAs present, mobile works; minor mobile polish pending |
| Schema / Technical SEO | 10/10 | Product + offers + ReviewPage + FAQ all passing |
| Internal Linking | 8/10 | Most links present; some compare pairs not yet created |
| Compliance | 5/5 | KYC gated, affiliate disclosure present, risk disclaimer present |
| **TOTAL** | **87/100** | **🥈 Strong** — target Gold (90+) in Sprint 04 |

**Path to Gold (87 → 90+):**
- Add verdict block content override (+3 Content Depth)
- Recapture `mobile_app` screenshot (+2 Screenshot Quality)
- Add experience grid data (+2 Content Depth)

---

## 12. Governance Reference

| Document | Purpose |
|----------|---------|
| `docs/MASTER_SEO_SCREENSHOT_PAGE_FACTORY.md` | **This file** — unified production pipeline |
| `docs/SCREENSHOT_STANDARD.md` | Screenshot naming, slots, evidence registry rules |
| `docs/KYC_ACCESS_CLAIMS_POLICY.md` | KYC claim safety rules, confidence thresholds |
| `docs/SCREENSHOT_COVERAGE_MATRIX.md` | Safety matrix, forbidden slots |
| `docs/screenshot-style-guide.md` | Visual standards, crop guidelines |
| `scripts/audit-screenshot-registry.mjs` | CI screenshot enforcement |
| `scripts/audit-schema.mjs` | CI schema enforcement |
| `scripts/audit-production.mjs` | CI production health check |
| `src/data/evidence/{exchange}.json` | Per-exchange evidence registry |
| `src/data/content-overrides.json` | Editorial overrides per exchange |
| `src/data/exchanges.json` | Core exchange data |
| `AI_EDITORIAL_SYSTEM_REGISTRY_v1.md` | Agent infrastructure map |

---

*Document created: 2026-06-05 | Sprint 03 | CryptoBonusWorld Master SEO + Screenshot Page Factory v1.0*
