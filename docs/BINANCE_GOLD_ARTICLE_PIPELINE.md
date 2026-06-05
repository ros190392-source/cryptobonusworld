# Binance Gold Article Pipeline

**Version:** 1.0
**Created:** 2026-06-05
**Sprint:** Sprint 04
**Status:** ACTIVE — governing reference for all Binance content operations
**Branch:** `master`

> This document defines the mandatory production pipeline for all Binance content on CryptoBonusWorld.
> Binance is the first exchange targeted for Gold Standard status following Bybit.
> Every content change, screenshot update, schema edit, or visual asset must pass through this pipeline.
> Ad-hoc edits to the Binance page are prohibited — all changes must follow the stages below.

---

## 1. Purpose

Binance is the world's largest cryptocurrency exchange by trading volume. It is also the highest-traffic
target keyword cluster on CryptoBonusWorld. A poorly executed Binance page:

- Misleads users with wrong bonus amounts (100 USD vs the CBW partner offer of 19,800 USDT)
- Destroys affiliate conversion if the wrong offer is shown
- Creates legal/compliance risk if unverified claims appear in schema
- Signals low quality to search engines if screenshots show error pages or stale content

The Binance Gold Article Pipeline exists because:

1. **Content must be produced systematically** — not through one-off prompt responses
2. **Every claim must have evidence** — screenshots, official source URLs, checkedBy, lastChecked
3. **Every screenshot must be classified** — proof / contextual / rejected / needs-owner-approval
4. **Every schema element must be safe** — no Product price without verified bonus, no HowTo image
   without an approved screenshot showing the correct offer
5. **Every deploy must be verified live** — automation alone is insufficient for a page claiming
   "Up to 19,800 USDT" with partner code CRYPTOBONUSW

The pipeline has nine stages. Each stage has defined inputs, outputs, automation level, and
approval requirements. Stages must be executed in order; a blocked stage blocks all downstream stages.

---

## 2. Pipeline Stages

---

### Stage 0 — Chief SEO Architect Brief

**Goal:** Define the complete page architecture before any content, screenshots, or schema work begins.

**Governance reference:** `docs/CHIEF_SEO_ARCHITECT_ROLE.md`

**Blocking rule:** Stages 1–10 are blocked until this brief is approved.

**Deliverable:** `reports/binance-chief-seo-architect-brief.md` + `.json`

The brief must contain:
- Page goal, primary keyword cluster, search intent map
- Target reader + conversion goal
- Page blueprint (H1→H2→H3 tree with section annotations)
- Evidence map (claim → source → confidence → lastChecked → owner approval needed)
- Screenshot request map (section → slot → proof/contextual/rejected/awaiting → placement)
- Visual asset plan (hero/OG specs; AI-generated vs real screenshot distinction)
- Schema plan (permitted types, blocked types, safety rules)
- QA gate definitions (automated + manual, page-specific)
- Owner approval gates list

**Status (Sprint 04):** ✅ Approved — `reports/binance-chief-seo-architect-brief.md` v1.0

---

### Stage 1 — SEO Intelligence

**Goal:** Understand the search landscape before writing a single word.

**Inputs:** Google Search Console data, competitor SERPs, AI-generated answer snapshots, PAA clusters

**Outputs:** Keyword map, SERP analysis report, AI answer opportunity list, FAQ seed set

#### 1.1 Target Keywords

| Intent | Primary Keyword | Secondary / LSI |
|--------|----------------|-----------------|
| Bonus-first | binance bonus 2026 | binance welcome bonus, binance signup bonus |
| Offer amount | binance 19800 usdt bonus | binance new user reward, binance referral code bonus |
| Promo code | binance promo code | binance referral code CRYPTOBONUSW, binance coupon code |
| Review | binance review | binance exchange review, is binance safe |
| Registration | how to create binance account | binance register, open binance account |
| KYC | binance kyc verification | binance identity verification, binance kyc required |
| Fees | binance fees | binance trading fees, binance spot fees 2026 |
| P2P | binance p2p | binance p2p trading, binance p2p payment methods |
| Comparison | binance vs bybit | coinbase vs binance, binance vs okx |

#### 1.2 SERP Analysis Checklist

- [ ] Top 10 organic results for `binance bonus 2026` — note structure, offer amounts, schema usage
- [ ] Featured snippet capture — what question/format triggers the snippet?
- [ ] People Also Ask clusters — collect all questions (typically 8–15 unique PAA nodes)
- [ ] Competitor bonus claim audit — do competitor pages show 100 USD or 19,800 USDT? Which affiliate?
- [ ] AI Overview presence — does Google AI Overview cite any page for the Binance bonus? Which?
- [ ] Bing/Copilot answer — does Bing pull the correct 19,800 USDT figure? Which source?

#### 1.3 AI Answer Opportunities

Focus on questions where CBW can become the cited source:

- "What is the Binance signup bonus?" → target: 19,800 USDT mention with CRYPTOBONUSW code
- "What is the Binance referral code?" → target: CRYPTOBONUSW as answer
- "How do I claim the Binance welcome bonus?" → target: walkthrough with bonus_referral_landing proof
- "Is Binance available in [country]?" → target: geo-specific answer (US restriction, EU availability)
- "What are Binance trading fees?" → target: 0.10% spot / 0.02% futures maker

#### 1.4 Snippet Opportunities

| Format | Target query | Required page element |
|--------|-------------|----------------------|
| Definition | "what is binance bonus" | `<p>` first paragraph with direct answer |
| Table | "binance fees" | Fee table with `<table>` markup |
| Numbered list | "how to create binance account" | HowTo structured steps |
| Paragraph | "binance promo code" | PromoCodeBox + nearby `<p>` |
| FAQ accordion | "binance kyc required" | FAQPage schema with visible `<details>` |

---

### Stage 2 — Page Brief

**Goal:** Define the intent, audience, and conversion goal before content is written.

**Inputs:** Stage 1 keyword map + SERP analysis

**Outputs:** Written page brief, approved by content lead before drafting begins

#### 2.1 Primary Intent

A user arrives from the query `binance bonus 2026` or `binance promo code`. They want to know:

1. What is the current Binance signup bonus?
2. Is there a promo code that unlocks more than the standard offer?
3. How do they claim it?

The page must answer these three questions above the fold.

#### 2.2 Secondary Intents

| Intent | User signal | Page section |
|--------|-------------|--------------|
| Safety research | "is binance safe" | Proof of Reserves + KYC + licences block |
| Fee comparison | "binance fees cheap" | Fee table + BNB discount note |
| Country eligibility | "binance available in [country]" | Geo restriction block |
| Registration help | "how to register on binance" | Registration walkthrough |
| Alternative seeking | "binance not available in my country" | AlternativesBlock |

#### 2.3 Target Reader

**Primary:** Crypto-curious user, 18–35, has heard of Binance, wants to know if the bonus is real
and how to claim it. Has not registered yet.

**Secondary:** Existing trader comparing Binance vs Bybit for futures; wants fees/leverage data.

**Excluded:** US resident (page should acknowledge the restriction; do not mislead).

#### 2.4 Conversion Goal

1. User clicks "Claim Binance Bonus" → lands on Binance via CBW referral link → registers
2. User copies promo code CRYPTOBONUSW → registers manually with code → qualifies for 19,800 USDT
3. User reaches walkthrough → completes all steps → activates bonus

#### 2.5 Risk / Compliance Notes

- **Never claim a specific bonus amount without current evidence.** The 19,800 USDT figure is valid
  as of 2026-06-04 per `bonus_amount.lastChecked`. Set a re-check reminder for 60 days.
- **US restriction.** Binance.com is not available to US residents. The page must include a visible
  geo restriction note, especially in the registration walkthrough.
- **Screenshot rule.** Only `bonus_referral_landing` may be shown near the 19,800 USDT claim.
  `registration/global-desktop-2026-06.webp` (shows 100 USD) is permanently rejected.
- **Affiliate link is immutable.** The MEXC affiliate link rule applies equivalently here —
  the Binance affiliate URL in `affiliate-links-registry.json` is immutable without explicit owner approval.

---

### Stage 3 — Evidence Plan

**Goal:** Map every factual claim on the page to a verified evidence source.

**Inputs:** `src/data/evidence/binance.json`, official Binance pages, prior fact-check sessions

**Outputs:** Updated evidence JSON, lastChecked dates, confidence scores, conflictStatus values

#### 3.1 Core Claims and Evidence Requirements

| Claim | Evidence source | Field | Current status | Re-check interval |
|-------|----------------|-------|---------------|------------------|
| Bonus up to 19,800 USDT | `bonus_referral_landing` screenshot + Binance official page | `bonus_amount` | ✅ verified 2026-06-04 | 60 days |
| Promo code CRYPTOBONUSW | Screenshot shows code in referral header | `promoCode` | ✅ visible in screenshot | At each bonus re-check |
| Spot fees 0.10% | Binance fee schedule page | `spot_maker_fee` / `spot_taker_fee` | ✅ 2026-05-25 | 90 days |
| Futures fees 0.02%/0.05% | Binance fee schedule | `futures_maker_fee` / `futures_taker_fee` | ✅ 2026-05-25 | 90 days |
| Max futures leverage 125x | Binance futures page | `max_futures_leverage` | ✅ 2026-05-25 | 90 days |
| KYC required for withdrawals | Binance support FAQ | `kyc_required` | ✅ 2026-05-25 | 180 days |
| P2P available, 700+ methods | Binance P2P page | `p2p_available` | ✅ 2026-05-25 | 90 days |
| Proof of Reserves published | Binance PoR page | `proof_of_reserves` | ✅ 2026-05-25 | 30 days |
| Founded 2017 | Binance about page | `founded_year` | ✅ | Stable |
| HQ Cayman Islands | Binance about page | `headquarters` | ✅ | Annual check |
| US restriction | Binance restricted countries | `restricted_us` | ✅ 2026-05-25 | 90 days |
| 320M+ users | Binance homepage | `users_count` | ⚠️ Not in evidence | Add at next update |
| BNB fee discount -25% | Binance fee schedule | — | ⚠️ Text only, no evidence field | Add evidence field |

#### 3.2 Fields That Need Improvement

- `bonus_expiry_days` — `confidenceScore: 0.27`, `conflictStatus: outdated` — recapture required
- `bonus_requires_deposit` — `confidenceScore: 0.27` — verify minimum deposit amount from Binance
- `bonus_min_deposit` — 50 USDT claimed, confidence low — verify against current Binance task center
- `licences` — `manualReviewRequired: true` — compile specific jurisdiction licences list

---

### Stage 4 — Screenshot Plan

**Goal:** Assign a screenshot to each page section and classify every existing screenshot.

#### 4.1 Screenshot Classification

**PROOF SCREENSHOTS** — directly prove a factual claim. Must show visible claim text.

| Slot | Path | Proves | Status |
|------|------|--------|--------|
| `bonus_referral_landing` | `public/screenshots/binance/bonus_referral_landing/global-desktop-2026-06.webp` | 19,800 USDT + CRYPTOBONUSW code | ✅ Available |

**WALKTHROUGH SCREENSHOTS** — show the user interface for a specific step. Do not need to prove amounts.

| Slot | Used in | Current path | Status |
|------|---------|-------------|--------|
| `bonus_referral_landing` | `binance-account-creation` Step 1 | see above | ✅ Available |
| `kyc` | `binance-kyc` Step 1 | `public/screenshots/binance/kyc/global-desktop-2026-06.webp` | ✅ Available — owner-approved |
| `fees` | Fees section | `public/screenshots/binance/fees/global-desktop-2026-06.webp` | ✅ Available |
| `spot` | Trading section | `public/screenshots/binance/spot/global-desktop-2026-06.webp` | ✅ Available |
| `p2p` | P2P section | `public/screenshots/binance/p2p/global-desktop-2026-06.webp` | ✅ Available |
| `mobile_app` | Mobile section | `public/screenshots/binance/mobile_app/global-mobile-2026-06.webp` | ✅ Available |
| `proof_of_reserves` | Trust section | `public/screenshots/binance/proof_of_reserves/global-desktop-2026-06.webp` | ✅ Available |

**CONTEXTUAL SCREENSHOTS** — provide visual context for a section without proving specific amounts.

Same files as walkthrough; classification is by placement context, not file content.

**REJECTED SCREENSHOTS** — must never appear on any rendered page.

| Slot | Path | Reason | Status |
|------|------|--------|--------|
| `registration` | `public/screenshots/binance/registration/global-desktop-2026-06.webp` | Shows "Up to 100 USD" — captured without CBW referral link | ❌ `outdated` — never render |
| `bonus` | `public/screenshots/binance/bonus/global-desktop-2026-06.webp` | Shows "$1,000 fee rebates" — existing-user referral program, wrong product | ❌ `outdated` — never render |
| `reports/.../bonus_center/2026-06-04.webp` | reports only | Binance 404 error page | ❌ reports only |

**SCREENSHOTS REQUIRING OWNER APPROVAL**

| Slot | Reason |
|------|--------|
| Any `kyc` recapture | Shows authenticated KYC tier data — owner must review before publish |
| Any `security_overview` capture | Shows account security state — permanently rejected for current capture |
| Any authenticated `deposit` capture | Shows wallet data |

**SCREENSHOTS REQUIRING AUTHENTICATED SESSION**

| Slot | Capture script category | Current status |
|------|------------------------|---------------|
| `kyc` | `kyc_status` | ✅ Captured and approved |
| `bonus_center` | `bonus_center` | ❌ URL dead (Binance removed `/en/my/rewards`) — owner must find current URL |
| `deposit_methods` | `deposit_methods` | ❌ Captured wrong page (Binance Pay, not deposit methods) — recapture needed |

#### 4.2 Next Screenshot Captures Required

| Priority | Slot | URL | Type | Notes |
|----------|------|-----|------|-------|
| P1 | `deposit` | `https://www.binance.com/en/buy-sell-crypto` | Public | Replacement for auth deposit capture |
| P1 | `registration` | CBW referral URL with `?ref=CRYPTOBONUSW` | Public | Recapture showing 19,800 USD for walkthrough Step 2 |
| P2 | `bonus_center` | Owner to confirm current URL | Authenticated | Binance changed URL |

---

### Stage 5 — Visual Plan

**Goal:** Separate AI-generated branding assets from real screenshot evidence. Never mix them.

> **Critical rule:** AI-generated images are branding/SEO assets only. They must never be placed
> adjacent to factual claims or used as schema `image` objects. Real screenshots prove claims.
> Hero and OG images support brand aesthetics and social card readability only.

#### 5.1 Visual Asset Types

| Asset | Type | Used for | Proof value |
|-------|------|----------|-------------|
| Hero image | AI-generated | Page header atmosphere, social sharing | None — decoration only |
| OG image | AI-generated | Social card (Twitter/Facebook/Discord) | None — decoration only |
| Section illustrations | AI-generated | Section visual breaks | None |
| Real screenshots | Playwright capture | Proving claims, illustrating steps | High — source of truth |
| UI cards / PromoCodeBox | CSS/HTML components | Displaying promo code, bonus amount | Medium — data-driven |
| Comparison tables | HTML | Fees, features vs competitors | Medium — data-driven |

#### 5.2 Hero / OG Image Requirements

**Hero image brief:**
- Dark background, gold/amber accents (consistent with CBW brand)
- Visual motif: abstract trading chart, Binance logo-compatible (no direct logo reproduction)
- Text overlay: "Binance Bonus 2026" or "Up to 19,800 USDT" — optional
- Dimensions: 1920×640 (desktop hero), 16:9 ratio
- Format: WebP
- Path: `public/images/heroes/binance-hero-2026-06.webp`
- Generation: via image pipeline (ChatGPT/fal.ai/Midjourney) — NOT a screenshot

**OG image brief:**
- 1200×630 (Open Graph standard)
- Dark background, Binance yellow accent (#F0B90B)
- Text: site name + "Binance Bonus: Up to 19,800 USDT | Code: CRYPTOBONUSW"
- Logo area: CBW logo mark (top-left)
- Format: PNG or WebP
- Path: `public/images/og/binance-og-2026-06.png`
- Generation: via image pipeline

#### 5.3 Contextual Screenshot Placement Map

| Page section | Screenshot slot | Placement rule |
|-------------|----------------|---------------|
| Bonus claim (H2 level) | `bonus_referral_landing` | Must be within 200px of the 19,800 USDT text |
| Registration walkthrough Step 1 | `bonus_referral_landing` | Already implemented ✅ |
| KYC walkthrough Step 1 | `kyc` | Near "How to complete KYC" heading |
| Fees section | `fees` | Adjacent to fee table |
| P2P section | `p2p` | Adjacent to P2P description |
| Trading section | `spot` | Adjacent to trading interface description |
| Mobile section | `mobile_app` | Adjacent to app download CTA |
| Trust / PoR section | `proof_of_reserves` | Adjacent to "Proof of Reserves" claim |

---

### Stage 6 — Article Structure

**Goal:** Define the ideal page structure for the Binance gold article.

Every section must have: heading level, content purpose, screenshot assignment, and CTA presence.

#### 6.1 Full Page Structure

```
[HERO]
  H1: Binance Bonus 2026: Up to 19,800 USDT | Code CRYPTOBONUSW
  Hero image (AI-generated, branding only)
  Sidebar: BonusCard (19,800 USDT, CTA, promo code)

[ABOVE THE FOLD — PRIMARY ANSWER]
  Direct answer paragraph (2–3 sentences):
  "Binance offers new users up to 19,800 USDT in sign-up rewards via the
   CryptoBonusWorld referral link (code: CRYPTOBONUSW). The bonus is divided
   across multiple tasks — spot trading, futures trading, and deposits."

[QUICK VERDICT]
  ExchangeVerdictBlock
  Rating: X/10
  Best for: [persona]
  Avoid if: [restriction]

[WHO BINANCE IS BEST FOR]
  H2: Who Should Use Binance?
  Bullet list: high-volume traders, futures users, P2P users, BNB holders
  Internal links: use-cases pages

[WHO SHOULD AVOID BINANCE]
  US residents (Binance.com blocked), users wanting simple onboarding
  GeoRegulatoryNote component

[BONUS BLOCK — PRIMARY CONVERSION SECTION]
  H2: Binance Signup Bonus: Up to 19,800 USDT (2026)
  Contextual screenshot: bonus_referral_landing (19,800 USD visible + CRYPTOBONUSW code)
  Bonus tier table
  PromoCodeBox: CRYPTOBONUSW
  CTA: "Claim Binance Bonus"
  Offer realism note
  FactCheckPanel (evidence-verified)

[BONUS CONDITIONS]
  H2: Binance Bonus Terms and Conditions
  Minimum deposit requirement
  Task completion requirements
  Expiry window
  KYC requirement

[REGISTRATION WALKTHROUGH]
  H2: How to Create a Binance Account (Step-by-Step)
  WalkthroughFlow: binance-account-creation (5 steps)
  Step 1 screenshot: bonus_referral_landing (19,800 USD — correct CBW offer)
  Mid-walkthrough CTA: "Create Binance account"

[KYC BLOCK]
  H2: Binance Identity Verification (KYC)
  H3: What KYC tier does Binance require?
  KYC walkthrough: binance-kyc (5 steps)
  Step 1 screenshot: kyc/global-desktop-2026-06.webp (owner-approved authenticated)
  FactCheckPanel: KYC fields

[FEES BLOCK]
  H2: Binance Fees (2026)
  Fee table: spot, futures, P2P, BNB discount
  Contextual screenshot: fees/global-desktop-2026-06.webp
  FeeSnippetBlock component
  Internal link: /compare/binance-vs-bybit/

[P2P BLOCK]
  H2: Binance P2P Trading
  Description: 700+ payment methods, zero P2P fee
  Contextual screenshot: p2p/global-desktop-2026-06.webp
  Internal links: /guides/how-to-use-binance-p2p/, /best-exchanges-for/p2p/

[SPOT / FUTURES BLOCK]
  H2: Binance Spot and Futures Trading
  Leverage note: up to 125x
  Contextual screenshot: spot/global-desktop-2026-06.webp
  Internal link: /best-exchanges-for/futures/

[PROOF OF RESERVES / SECURITY BLOCK]
  H2: Is Binance Safe? Security and Proof of Reserves
  PoR description + Merkle tree audit mention
  Contextual screenshot: proof_of_reserves/global-desktop-2026-06.webp
  SAFU fund note: 1B USDC

[MOBILE APP BLOCK]
  H2: Binance Mobile App
  App Store + Google Play links
  Contextual screenshot: mobile_app/global-mobile-2026-06.webp

[COMPARISON BLOCK]
  H2: Binance vs Competitors
  AlternativesBlock
  PeopleAlsoCompare
  Compare links: binance-vs-bybit, binance-vs-okx, okx-vs-binance

[REVIEW / VERDICT]
  H2: Our Binance Review Verdict
  Summary paragraph
  Pros / Cons table

[FAQ]
  H2: Frequently Asked Questions
  12–15 FAQ items from PAA research
  FAQPage schema

[FINAL CTA]
  "Claim your Binance bonus today"
  PromoCodeBox
  CTA button
  Risk disclaimer
```

---

### Stage 7 — Schema Plan

**Goal:** Define safe, verifiable JSON-LD schema. Never use schema to assert unverified claims.

#### 7.1 Required Schema Types

| Schema type | Condition | Notes |
|-------------|-----------|-------|
| `WebPage` / `WebPageElement` | Always | Page-level metadata |
| `Organization` | Always | Binance entity data (founded, HQ) |
| `Product` | ONLY when `bonus_amount.confidenceScore ≥ 0.8` AND `conflictStatus === 'ok'` | `offers.price` suppressed until re-verified |
| `FAQPage` | When FAQs exist (always for Binance) | Use `faqAppend` items |
| `BreadcrumbList` | Always | Auto-generated by template |
| `HowTo` | When walkthrough exists | Only use screenshot `src` values that are APPROVED (not rejected) |
| `ImageObject` | Per screenshot | `contentUrl` must point to approved `public/` path only — never `reports/` |
| `FinancialService` | Always for exchange pages | Exchange entity data |
| `ReviewPage` | When `verdict` block exists | Ties to editor reviewer |

#### 7.2 Schema Safety Rules

- **HowTo steps must only reference approved screenshots.** The `bonus_referral_landing` path is safe.
  The `registration` (100 USD) path is banned from all schema.
- **Product `offers.price` requires `bonus_amount.conflictStatus === 'ok'`.** Currently it is `ok`
  (verified 2026-06-04) — but `bonusPriceSafe` flag in template controls this. Keep monitoring.
- **No `ImageObject` pointing to `reports/` paths.** Enforce in QA gate grep check.
- **`review.ratingValue` must be based on a defined scoring rubric**, not arbitrary.
- **`Organization` `sameAs` URIs must be official Binance URLs.** Do not include third-party URLs.

---

### Stage 8 — QA Gates

**Goal:** Automated and manual checks that must pass before any Binance page change is deployed.

#### 8.1 Automated Gates (block deploy if failing)

| Check | Command / method | Pass condition |
|-------|-----------------|----------------|
| Build passes | `npm run build` | 207 pages, 0 errors |
| Screenshot audit | `npm run audit:screenshots` | P1 errors = 0 |
| Misleading amounts absent | `grep "100 USD"` on built HTML | 0 occurrences |
| Misleading amounts absent | `grep "1,000 USD"` on built HTML | 0 occurrences |
| Correct offer present | `grep "19,800"` on built HTML | ≥1 occurrence |
| Promo code present | `grep "CRYPTOBONUSW"` on built HTML | ≥1 occurrence |
| rejected screenshots absent | `grep "registration/global-desktop"` on built HTML | 0 occurrences |
| reports/ paths absent | `grep "reports/"` on built HTML | 0 occurrences |
| Schema safety | `grep "reports/"` in built HTML JSON-LD blocks | 0 occurrences |
| Gallery disabled (Binance only) | `grep 'id="platform-screenshots"'` | 0 occurrences |
| Bybit gallery intact | `grep 'id="platform-screenshots"'` in bybit HTML | 1 occurrence |

#### 8.2 Manual Approval Gates

| Gate | Trigger | Who approves |
|------|---------|-------------|
| Bonus amount change | Any update to `bonus_amount.currentValue` in evidence | Owner |
| Affiliate link change | Any change to Binance link in affiliate registry | Owner (IMMUTABLE rule) |
| Authenticated screenshot | Any new `kyc`, `security_overview`, `deposit` screenshot | Owner visual review |
| KYC screenshot publish | Before `status: "available"` for any auth screenshot | Owner |
| Final visual page review | Before deploy of any major content revision | Owner |
| Schema Product price | Before enabling `bonusPriceSafe: true` | Owner after bonus re-verification |

#### 8.3 Live Verification Gates (post-deploy)

After every deploy touching Binance content:

1. `curl -I https://cryptobonusworld.com/exchanges/binance/` — must return `200`
2. Fetch HTML — run all 8.1 checks against live HTML
3. `bonus_referral_landing` path in live `<img>` tag — must be present
4. `registration` path — must be absent from live HTML
5. CTA button href — must contain CBW affiliate parameter
6. IndexNow submission — must return `200` (Bing) and `202` (Yandex)

---

### Stage 9 — Deployment

**Standard deploy sequence for any Binance content change:**

```bash
# 1. Pre-deploy checks (automated)
npm run audit:screenshots    # P1 errors must be 0
npm run build                # 207 pages, 0 errors

# 2. HTML verification (PowerShell)
$html = Get-Content 'dist/exchanges/binance/index.html' -Raw
# Run all Stage 8.1 grep checks

# 3. Stage only changed files
git add src/data/evidence/binance.json
git add src/data/exchange-walkthroughs.ts
git add src/data/content-overrides.json
git add src/pages/exchanges/[slug].astro
# etc — never git add . or git add -A

# 4. Commit
git commit -m "type(binance): description"

# 5. Push
git push origin master

# 6. Deploy
npm run deploy   # builds fresh, SCP to VPS, SERVER_DONE

# 7. Live verification
# Fetch live HTML, run Stage 8.1 checks against live source
# Confirm bonus_referral_landing visible <img> present live
# Confirm registration path absent live

# 8. IndexNow auto-submits as part of deploy script
```

---

## 3. Automation Model

### Fully Automatable (no human in the loop)

| Step | Script / method |
|------|----------------|
| Build (production) | `npm run build` |
| Schema safety grep | PowerShell grep on built HTML |
| Screenshot registry audit | `npm run audit:screenshots` |
| Misleading amount grep | PowerShell grep on built HTML |
| Evidence JSON validation | JSON schema check |
| Internal link check | Build-time Astro link validation |
| Report creation (JSON/MD) | Scripted from data files |
| IndexNow submission | `deploy.mjs` (automatic on deploy) |
| Live URL status check | `Invoke-WebRequest` |
| Affiliate link immutability check | grep on affiliate-links-registry.json |

### Semi-Automatable (human reviews output)

| Step | Automation role | Human role |
|------|----------------|------------|
| Content rewrite | AI draft generation | Human quality review, claim verification |
| SERP analysis | GSC API data pull, ranking snapshot | Human interpretation of opportunities |
| FAQ generation | AI generates from PAA clusters | Human approves and deduplicates |
| Screenshot capture | Playwright script | Human reviews output before publish |
| Hero / OG generation | AI image pipeline | Human approves visual quality |
| Evidence source re-check | Script visits official URLs | Human confirms current offer text |
| Bonus tier extraction | Vision API on screenshot | Human confirms extracted amount matches |

### Manual Approval Required (hard gates)

| Gate | Why manual | Delegate? |
|------|-----------|-----------|
| Partner bonus amount confirmation | Revenue-critical; wrong amount breaks affiliate offer | No |
| Affiliate link change | Immutable rule; any change must be intentional | No |
| Auth screenshot approval (KYC, security) | Privacy risk; personal data may be visible | No |
| Final pre-deploy visual review | Page look-and-feel; layout issues invisible to grep | Yes — to content lead |
| Schema `Product offers.price` activation | Legal/compliance; triggers rich result eligibility | No |
| New exchange evidence JSON creation | Data architecture | Yes — to content lead |

---

## 4. Binance Visual Asset Matrix

| Asset | Type | Source | Status | Owner approval required | Where used | Notes |
|-------|------|--------|--------|------------------------|------------|-------|
| Hero image | AI-generated | Image pipeline (ChatGPT/fal.ai) | **Needed** | No private data | Page header | Dark/gold, branding only, no factual claim |
| OG image | AI-generated | Image pipeline (ChatGPT/fal.ai) | **Needed** | No private data | Social/search cards | 1200×630, includes bonus amount text |
| `bonus_referral_landing` | Real screenshot | Public — Binance via CBW referral URL | ✅ Available | Not required (public page) | Walkthrough Step 1 + Bonus section | Shows 19,800 USD + CRYPTOBONUSW — PRIMARY PROOF |
| `kyc` | Real screenshot | Authenticated session | ✅ Available | ✅ Owner-approved 2026-06-05 | KYC walkthrough Step 1 | Verified Center view |
| `mobile_app` | Real screenshot | Public (app download page) | ✅ Available | Not required | Mobile section | Recaptured 2026-06 (24KB) |
| `fees` | Real screenshot | Public (Binance fee schedule) | ✅ Available | Not required | Fees section | |
| `p2p` | Real screenshot | Public (Binance P2P) | ✅ Available | Not required | P2P section | |
| `spot` | Real screenshot | Public (BTC/USDT spot) | ✅ Available | Not required | Trading section | |
| `proof_of_reserves` | Real screenshot | Public (Binance PoR) | ✅ Available | Not required | Trust/security section | |
| `registration` (100 USD) | Real screenshot | Public — plain /register URL, NO referral | ❌ **REJECTED** | **Never use** | None | Shows 100 USD — wrong offer. Recapture via CBW referral URL before any reuse |
| `bonus` ($1,000 fee rebates) | Real screenshot | Public — existing-user referral page | ❌ **REJECTED** | **Never use** | None | Wrong product (referral rebate for existing users, not new-user welcome bonus) |
| `security_overview` | Real screenshot | Authenticated — account closure visible | ❌ **REJECTED** | N/A | None | Owner rejected 2026-06-05 |
| `bonus_center` (404) | Real screenshot | Dead URL — Binance removed the page | ❌ **REJECTED** | N/A | None | Binance changed URL; recapture needed once URL confirmed |
| `deposit_methods` | Real screenshot | Wrong page captured (Binance Pay) | ⚠️ **Needs recapture** | Not required | Future deposit section | Recapture from `binance.com/en/buy-sell-crypto` |

---

## 5. Governance Rules

### 5.1 Screenshot Governance

1. Every screenshot in `public/screenshots/binance/` must have a corresponding entry in
   `src/data/evidence/binance.json` under `screenshots.{slot}`.
2. Any screenshot rendered as `<img>` in the page must have `status: "available"` in evidence.
3. `status: "outdated"` screenshots must never be rendered. The template filters by `status === 'available'`.
4. Authenticated screenshots go to `reports/authenticated-screenshots/` first.
   Only after owner approval do they move to `public/screenshots/`.
5. The Binance Platform Screenshots gallery remains disabled (`screenshotGalleryDisabled: true`)
   until contextual per-section screenshot embedding is implemented site-wide.

### 5.2 Content Governance

1. The bonus amount (19,800 USDT) may not be changed on the page without updating
   `src/data/evidence/binance.json` `bonus_amount.currentValue` and `lastChecked`.
2. The promo code (CRYPTOBONUSW) is sourced from `exchanges.json`. Changes require owner approval.
3. All FAQ items must be approved before publish; AI-generated FAQ needs human review.
4. The `registration` screenshot (100 USD) must remain `status: "outdated"` until it is
   recaptured using the CBW referral URL and re-approved.

### 5.3 Schema Governance

1. `HowTo` schema `image` fields must reference only approved screenshot paths.
2. `Product` `offers.price` is controlled by `bonusPriceSafe` flag. Do not enable manually.
3. Never include `reports/` paths in any schema field.
4. `FAQPage` schema items must match the visible FAQ on the page (no hidden schema FAQs).

### 5.4 Deploy Governance

1. Never push without a clean build (207 pages, 0 errors).
2. Never deploy without Stage 8.1 automated gates passing.
3. Always run live verification checks after deploy.
4. IndexNow submission is automatic via `deploy.mjs` — do not submit manually in addition.

---

## 6. Sprint Backlog (as of 2026-06-05)

| ID | Priority | Task | Stage | Status |
|----|----------|------|-------|--------|
| SPRINT-04-BINANCE-CONTEXTUAL-BONUS-SCREENSHOT-01 | P1 | Embed `bonus_referral_landing` contextually near 19,800 USDT claim section | Stage 5 | Pending |
| SPRINT-04-BINANCE-DEPOSIT-PUBLIC-SCREENSHOT-01 | P1 | Capture `binance.com/en/buy-sell-crypto` for `deposit` slot | Stage 4 | Pending |
| SPRINT-04-BINANCE-BONUS-CENTER-RECAPTURE-01 | P1 | Owner finds current Binance reward center URL; recapture `bonus_center` | Stage 4 | Blocked — awaiting URL |
| SPRINT-04-BINANCE-REGISTRATION-RECAPTURE-CBW-01 | P2 | Recapture `registration` slot via CBW referral link (shows 19,800 USD for walkthrough Step 2) | Stage 4 | Pending |
| SPRINT-04-BINANCE-HERO-OG-IMAGE-01 | P2 | Generate hero and OG images via image pipeline | Stage 5 | Pending |
| SPRINT-04-BINANCE-CONTENT-REWRITE-BONUS-BLOCK-01 | P1 | Rewrite bonus block to include contextual screenshot, improved claim structure | Stage 6 | Pending |
| SPRINT-04-BINANCE-FAQ-EXPANSION-01 | P2 | Expand FAQ to 15 items using PAA research | Stage 1+6 | Pending |
| SPRINT-04-BINANCE-EVIDENCE-REFRESH-BONUS-EXPIRY-01 | P2 | Re-verify `bonus_expiry_days`, `bonus_requires_deposit`, `bonus_min_deposit` | Stage 3 | Pending |
| SPRINT-04-BINANCE-SCHEMA-PRODUCT-PRICE-01 | P2 | Enable `bonusPriceSafe` once bonus amount re-verified at 90-day mark | Stage 7 | Pending — schedule 2026-09-04 |
| T01-BYBIT-BONUS-OWNER-VERIFY | P3 | Owner visits Bybit promo page, confirms 30K USDT bonus | Stage 3 | Pending |

---

*Document version 1.0 — 2026-06-05 — CryptoBonusWorld Sprint 04*
*Next review: 2026-09-05 or when Binance changes its signup bonus offer*
