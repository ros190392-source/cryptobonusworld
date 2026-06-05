# Chief SEO Architect Role

**Version:** 1.0
**Created:** 2026-06-05
**Sprint:** Sprint 04
**Status:** ACTIVE — governing role definition for all important page production
**Supersedes:** Ad-hoc page production without upfront architecture
**Branch:** `master`

> The Chief SEO Architect is the first person in every page production workflow.
> No content is written, no screenshots are captured, no schema is generated, and no
> implementation begins until the Chief SEO Architect brief is complete and approved.
> This role is not optional for important pages (exchange reviews, bonus pages, comparison pages).

---

## 1. Title and Mission

**Title:** Chief SEO Architect

**Mission:**
Design every important CryptoBonusWorld page as a search-first, AI-answer-ready,
evidence-backed, conversion-focused asset before implementation begins.

The Chief SEO Architect does not write content.
The Chief SEO Architect does not capture screenshots.
The Chief SEO Architect does not write schema.
The Chief SEO Architect designs the architecture that all other roles must implement correctly.

---

## 2. Mandate

The Chief SEO Architect owns the answer to eight questions for every important page:

1. **Who is searching?** — exact intent, user state, conversion readiness
2. **What will they find?** — SERP landscape, AI answers, competitor angles
3. **What should we say?** — page structure, headings, short answer, FAQ, tables
4. **What do we claim and can we prove it?** — evidence map, confidence levels, source URLs
5. **What screenshots are needed and which are safe?** — claim-to-screenshot map, classification
6. **What visual assets support the page?** — hero, OG, section illustrations, real vs AI split
7. **What schema do we emit?** — safe types, blocked types, image safety rules
8. **How do we verify it all before deploy?** — QA gate definitions, owner approval gates

If any of these eight questions cannot be answered before implementation begins, implementation is blocked.

---

## 3. Responsibilities

### 3.1 Search Intent Ownership

The Chief SEO Architect defines and documents every intent a user arriving at the page might have:

- **Primary intent** — the single most common reason a user lands on this page
- **Secondary intents** — 3–5 additional intents the page should serve (even if not the primary)
- **Commercial intent** — what the user is trying to buy/use/register for
- **Informational intent** — what the user wants to understand or verify
- **Comparison intent** — which alternatives the user is evaluating
- **User objections** — what might stop the user from converting (geo restriction, KYC friction, distrust)
- **User journey** — the path from landing → consuming content → clicking CTA → registering

**Output:** Intent map section of the page brief (see §6 Brief Template).

**Hard rule:** No important page enters production without a documented primary intent.

---

### 3.2 SERP and AI Search Strategy

The Chief SEO Architect maps the search result landscape before writing a word:

- **Target organic results** — which position is realistic? What does the current top result look like?
- **Featured snippet analysis** — what format triggers the snippet for the primary keyword?
- **People Also Ask** — collect 8–15 PAA questions; these become the FAQ seed set
- **AI Overview presence** — does Google's AI Overview currently cite a source for this query?
- **Bing/Copilot answer** — what does Bing AI answer for the primary query? Is our data cited?
- **Competitor angles** — top 5 competitor pages: what offer amounts do they show? What schema?
- **Gap analysis** — what do competitors get wrong or omit that we can do better?
- **Freshness signal** — does the SERP reward recent updates? (Yes for bonus/promo queries.)

**Output:** SERP + AI landscape section of the page brief.

**Hard rule:** Do not assume search volume or ranking difficulty without checking GSC or a SERP snapshot.

---

### 3.3 Page Architecture

The Chief SEO Architect defines the exact page structure before content is drafted:

- **H1** — primary keyword + offer hook (must include key figures for bonus pages)
- **H2 / H3 tree** — full section structure in ranked order (most important intent first)
- **Short answer block** — 2–3 sentence direct answer for featured snippet targeting
- **Quick verdict** — assessment of the exchange in one table row: best for / avoid if / rating
- **Bonus block position** — for exchange pages: high in page structure, near offer proof screenshot
- **Tables** — fee table, comparison table, bonus tier table — defined before content draft
- **FAQ structure** — minimum item count, question sources, schema eligibility
- **CTA locations** — hero sidebar, post-verdict, mid-walkthrough, post-FAQ, footer
- **Internal linking map** — outgoing links to /compare/, /coins/, /guides/, /best-exchanges-for/
- **Content depth target** — word count range per section type (not keyword stuffing; genuine depth)

**Output:** Page blueprint section of the brief (H1→H2→H3 tree + annotated section outlines).

**Hard rule:** The H1 must contain the primary keyword AND the bonus amount or key value proposition for bonus/review pages.

---

### 3.4 Evidence Architecture

The Chief SEO Architect maps every factual claim to a required evidence source before writing:

- **Bonus claims** — amount, currency, expiry, minimum deposit, task requirements
- **KYC claims** — required/not required, which tier, time to complete, document types
- **Fee claims** — spot maker/taker, futures maker/taker, P2P, withdrawal fees
- **Proof-of-reserves claims** — auditor, frequency, Merkle tree or not
- **P2P claims** — fee, payment methods, availability
- **Availability / geo claims** — restricted countries, required licenses, alternatives for restricted users
- **Risk disclaimers** — what cannot be verified must be disclaimed, not asserted
- **lastChecked dates** — every claim must have a verification timestamp

**Evidence map format:**

| Claim | Evidence source | Evidence field | Confidence | lastChecked | Owner approval needed | Page section |
|-------|----------------|----------------|------------|-------------|----------------------|-------------|

**Output:** Evidence map section of the brief + required updates to `evidence/{exchange}.json`.

**Hard rule:** Claims with `confidenceScore < 0.5` must not appear as primary assertions — they must be hedged or excluded until evidence is strengthened.

---

### 3.5 Screenshot Architecture

The Chief SEO Architect maps every screenshot requirement before capture begins.

#### Classification System

**PROOF screenshots** — directly prove a specific factual claim visible as text in the screenshot.
Only a proof screenshot may be placed adjacent to the claim it proves.

**CONTEXTUAL screenshots** — show the UI for a page section without proving a specific amount.
They illustrate, not prove.

**WALKTHROUGH screenshots** — illustrate a specific step in a user flow.
Must show the correct offer at the step where offer proof is expected.

**REJECTED screenshots** — must never appear on any production page.
Reasons for rejection: wrong offer amount shown, captured without affiliate link, error page,
sensitive data visible, owner rejected after review.

**AWAITING-CAPTURE screenshots** — slot defined, screenshot not yet taken.
Page section renders without screenshot until capture is complete.

#### Screenshot Request Map Format

| Claim or section | Screenshot needed | Public/Auth/Manual | Risk level | Priority | Owner approval | Current status | Planned placement |
|-----------------|-------------------|--------------------|------------|----------|----------------|----------------|------------------|

#### Screenshot Classification Rules

1. A screenshot showing the wrong bonus amount must be classified **REJECTED** — never contextual.
2. An authenticated screenshot must go to `reports/authenticated-screenshots/` first and must receive
   owner approval before moving to `public/screenshots/`.
3. A screenshot showing account closure, withdrawal confirmation, API keys, QR codes, or
   personal data must be classified **REJECTED** regardless of content quality.
4. No screenshot may be registered in evidence with `status: "available"` unless it has been
   visually inspected and does not show misleading amounts or sensitive data.

**Output:** Screenshot request map in the brief.

**Hard rule:** The Chief SEO Architect's screenshot plan defines which screenshots are allowed to be placed near which claims. Any deviation requires brief update + re-approval.

---

### 3.6 Visual Architecture

The Chief SEO Architect defines the visual layer separately from the screenshot layer.

**Two distinct visual categories:**

| Category | Examples | Factual proof value | Placement rule |
|----------|---------|---------------------|---------------|
| **Branding/editorial assets** | Hero image, OG image, section illustrations | None — decoration only | Header, social cards, section breaks |
| **Evidence assets** | Real screenshots, screencaptured evidence | High — source of truth | Adjacent to the claim they prove |

**Rules:**
- AI-generated images are always Category 1 (branding). They must never be placed adjacent to
  factual claims as if they are evidence.
- Real screenshots are Category 2 (evidence). They prove claims.
- A hero image brief must specify: dimensions, format, style, any text overlay, and
  the explicit statement "NOT A PROOF SCREENSHOT — branding/decoration only."
- An OG image brief must include: 1200×630, brand colors, text overlay content,
  and whether any evidence amount appears (if so, that amount must be verified).

**Visual asset plan format:**

| Asset | Category | Purpose | Dimensions | Source | Text overlay | Contains factual claim? | Status |
|-------|---------|---------|------------|--------|-------------|------------------------|--------|

**Hard rule:** Never use an AI-generated image as visual proof of a bonus offer. Never embed a real screenshot into a hero/OG position as if it is a branding image.

---

### 3.7 Schema Architecture

The Chief SEO Architect pre-approves every schema type that will be emitted for the page.

#### Permitted Schema by Condition

| Schema type | Emit when | Block when |
|-------------|-----------|-----------|
| `WebPage` / `WebPageElement` | Always | — |
| `FinancialService` | Always for exchange pages | — |
| `Organization` | Always | — |
| `BreadcrumbList` | Always | — |
| `FAQPage` | FAQ section exists with ≥4 items | FAQ section absent or Q/A not visible |
| `Product` with `offers.price` | `bonus_amount.confidenceScore ≥ 0.8` AND `conflictStatus === 'ok'` | Low confidence, outdated, conflict |
| `HowTo` | Walkthrough flow with correct screenshots | Any walkthrough step using a REJECTED screenshot |
| `ImageObject` | Approved screenshot registered in evidence | `reports/` path, rejected screenshot path |
| `ReviewPage` | `verdict` block with editorial rating | No real editorial review |

#### Schema Safety Rules (all mandatory)

1. `HowTo` step `image` must point only to an approved `public/screenshots/` path.
   Never to a `reports/` path. Never to a REJECTED screenshot.
2. `Product offers.price` activation is a manual owner gate — not triggered automatically.
3. `FAQPage` Q/A must match exactly what is visible on the rendered page.
4. `ImageObject contentUrl` must be the full absolute URL of an approved screenshot.
5. `Organization sameAs` must contain only official exchange URLs.

**Output:** Schema plan section of the brief.

**Hard rule:** Do not emit `Product offers.price` for an unverified bonus amount.

---

### 3.8 QA Ownership

The Chief SEO Architect defines the QA gates required for the specific page before build begins.

**Automated gates (defined per page):**

| Check | Command | Pass condition |
|-------|---------|----------------|
| Build | `npm run build` | Defined page count, 0 errors |
| Screenshot audit | `npm run audit:screenshots` | P1 errors = 0 |
| Misleading amount X absent | grep check | 0 occurrences |
| Correct offer Y present | grep check | ≥1 occurrence |
| Promo code Z present | grep check | ≥1 occurrence |
| Rejected screenshot path absent | grep check | 0 occurrences |
| `reports/` paths absent | grep check | 0 occurrences |
| Gallery state correct | grep check | Present or absent per design |

**Manual approval gates (defined per page):**

| Gate | Trigger | Approver |
|------|---------|---------|
| Bonus amount change | Any edit to `bonus_amount.currentValue` | Owner |
| Affiliate link change | Any edit to affiliate registry | Owner (IMMUTABLE rule) |
| Authenticated screenshot | Any `kyc`, `security_overview`, `deposit` screenshot | Owner |
| Final visual review | Before any major deploy | Owner or content lead |
| Product schema price activation | Before `bonusPriceSafe: true` | Owner |

**Output:** Per-page QA gate definitions, included in the brief.

---

## 4. Mandatory Page Production Flow

This flow is mandatory for every important page (exchange reviews, bonus pages, comparison pages,
high-traffic guides). Skipping stages or reversing order is not permitted.

```
STAGE 0 ── Chief SEO Architect Brief
           ↓ (approved before anything else)
STAGE 1 ── Search & AI Intelligence
           ↓
STAGE 2 ── Page Blueprint (H1/H2/H3 + section outline)
           ↓
STAGE 3 ── Evidence Map (claim → source → confidence → lastChecked)
           ↓
STAGE 4 ── Screenshot Request Map (claim → screenshot → classification → placement)
           ↓
STAGE 5 ── Content Draft / Build
           ↓
STAGE 6 ── Screenshot Capture (public → auth → manual; rejected never published)
           ↓
STAGE 7 ── Contextual Screenshot Placement (screenshot near matching claim)
           ↓
STAGE 8 ── Schema & Technical SEO (no rejected images, no unverified offers)
           ↓
STAGE 9 ── Pre-Deploy QA (automated gates + manual gates)
           ↓
STAGE 10 ─ Deploy + Live Check (push → deploy → verify → IndexNow)
```

### Stage 0 — Chief SEO Architect Brief

**Trigger:** Any new important page creation OR any major revision to an existing important page.

**Blocking:** All downstream stages are blocked until Stage 0 is complete and approved.

**Deliverable:** `reports/{exchange}-chief-seo-architect-brief.md` + `.json`

**Brief must contain:**
- Page goal (one sentence)
- Primary keyword + keyword cluster
- Search intent classification
- Target reader profile
- Conversion goal
- Evidence requirements (which claims need verified sources)
- Screenshot requirements (claim-to-screenshot map with classification)
- Visual requirements (hero/OG specs)
- Schema requirements (permitted types for this page)
- Owner approval gates list

---

### Stage 1 — Search & AI Intelligence

**Deliverable:** SERP snapshot, competitor analysis, AI answer landscape, PAA question list.

**Who:** SEO Strategist (Role 1 in MASTER_SEO_SCREENSHOT_PAGE_FACTORY.md)

**Inputs:** Stage 0 keyword cluster.

**Outputs:**
- Competitor bonus amounts visible in SERP
- Featured snippet format for primary keyword
- 8–15 PAA questions (becomes FAQ seed set)
- AI Overview / Bing Copilot answer for primary query
- Gap opportunities: what competitors miss that we include

---

### Stage 2 — Page Blueprint

**Deliverable:** Full H1→H2→H3 heading tree with annotated section outlines.

**Who:** Chief SEO Architect + Editorial Lead (Role 2)

**Rules:**
- H1 must contain primary keyword + key value proposition
- Section order must match intent priority (most important intent first)
- Tables must be defined before content is drafted (not added as afterthoughts)
- FAQ structure defined: min items, question sources, schema eligibility
- CTA locations specified: above-fold sidebar, post-verdict, mid-walkthrough, post-FAQ

---

### Stage 3 — Evidence Map

**Deliverable:** Updated `src/data/evidence/{exchange}.json` + evidence map table.

**Who:** Evidence Auditor (Role 3 in MASTER_SEO_SCREENSHOT_PAGE_FACTORY.md)

**Rules:**
- Every factual claim in the blueprint has an evidence entry with `lastChecked` and `confidenceScore`
- No claim with `confidenceScore < 0.5` may be asserted without hedging language
- `bonus_amount` must have `conflictStatus === 'ok'` for Product schema price to be enabled
- KYC claims require `confidenceScore ≥ 0.70` + `conflictStatus: ok` if claiming KYC not required

---

### Stage 4 — Screenshot Request Map

**Deliverable:** Screenshot request map table, classification of all existing screenshots.

**Who:** Chief SEO Architect (screenshot classification) + Screenshot Director (Role 4)

**Rules:**
- Every section with a factual claim must have a screenshot assignment (or explicit "none needed")
- Proof screenshots may only be placed adjacent to the claim they prove
- Rejected screenshots are listed in the brief and must never be re-classified without new capture
- Capture order: public screenshots first → authenticated screenshots with owner session → manual captures

---

### Stage 5 — Content Draft / Build

**Deliverable:** Drafted page content meeting the blueprint structure.

**Who:** Editorial Lead (Role 2)

**Rules:**
- Draft must follow the Stage 2 blueprint exactly
- No section may assert a claim that does not have a Stage 3 evidence entry
- Draft must be reviewed by Evidence Auditor before screenshots are captured
- No content goes live before Stage 6–9 complete

---

### Stage 6 — Screenshot Capture

**Deliverable:** Captured screenshots in `reports/` (authenticated) or `public/` (public, approved).

**Who:** Screenshot Director (Role 4) + Owner (for authenticated approvals)

**Rules:**
- Public screenshots → captured via Playwright script → inspected → registered in evidence
- Authenticated screenshots → captured → placed in `reports/authenticated-screenshots/` →
  owner reviews → owner approves → moved to `public/screenshots/`
- Rejected screenshots → never published regardless of capture quality
- No screenshot is registered with `status: "available"` without visual inspection

---

### Stage 7 — Contextual Placement

**Deliverable:** Screenshots embedded near the specific page sections they support.

**Rules:**
- Bonus screenshot → adjacent to bonus claim section (within visible viewport of the claim)
- KYC screenshot → adjacent to KYC walkthrough Step 1 or KYC description section
- Fees screenshot → adjacent to fee table
- P2P screenshot → adjacent to P2P description
- Proof of Reserves screenshot → adjacent to PoR/security claim
- Mobile screenshot → adjacent to app download section
- **Never** place a screenshot dump / batch gallery as a substitute for contextual placement
- The Binance Platform Screenshots gallery is disabled — contextual placement replaces it

---

### Stage 8 — Schema & Technical SEO

**Deliverable:** Validated JSON-LD schema blocks for all permitted types.

**Who:** Schema / Technical SEO Lead (Role 6 in MASTER_SEO_SCREENSHOT_PAGE_FACTORY.md)

**Rules:**
- `HowTo` step images: only approved `public/screenshots/` paths
- `Product offers.price`: only when `bonusPriceSafe` flag is true (owner gate)
- `FAQPage` Q/A: must match visible FAQ exactly
- No `reports/` paths in any schema field
- All `ImageObject contentUrl` values use full absolute URLs

---

### Stage 9 — Pre-Deploy QA

**Deliverable:** QA report with all automated and manual gates passed.

**Commands (standard for all exchange pages):**
```bash
npm run audit:screenshots   # P1 errors = 0
npm run build               # correct page count, 0 errors
```

**HTML verification (PowerShell on built HTML):**
```powershell
$html = Get-Content 'dist/exchanges/{slug}/index.html' -Raw
# Run all automated gates defined in Stage 0 brief
```

**Manual gates:** All listed in Stage 0 brief must be signed off.

---

### Stage 10 — Deploy + Live Check

**Commands:**
```bash
git push origin master
npm run deploy              # builds fresh, SCP to VPS, SERVER_DONE
```

**Live verification:**
1. All page URLs return HTTP 200
2. Live HTML passes all automated gates from Stage 0 brief
3. `bonus_referral_landing` visible `<img>` confirmed in live source
4. Rejected screenshot paths confirmed absent in live source
5. IndexNow confirms `200` (Bing) and `202` (Yandex)

---

## 5. Brief Template

Every Chief SEO Architect brief uses this template.
File naming convention: `reports/{exchange}-chief-seo-architect-brief.md` + `.json`

```markdown
# [Exchange] Chief SEO Architect Brief

**Exchange:** {exchange}
**Page type:** exchange review / bonus page / comparison / guide
**Date:** {YYYY-MM-DD}
**Status:** DRAFT / APPROVED / IN-PRODUCTION

---

## 1. Page Goal
[One sentence: what this page must achieve.]

## 2. Primary Keyword + Cluster
Primary: {keyword}
Cluster: {5–10 related queries}

## 3. Search Intent Map
| Intent type | Query | User state | Conversion path |
...

## 4. Target Reader
[2–3 sentence profile: who they are, what they know, what they need.]

## 5. Conversion Goal
[Primary CTA + secondary CTA + fallback.]

## 6. SERP + AI Landscape
[Current top result, featured snippet format, AI Overview presence, competitor angles.]

## 7. Page Blueprint (H1 → H2 → H3)
[Full heading tree with section annotations.]

## 8. Evidence Map
| Claim | Source | Field | Confidence | Last checked | Owner approval | Section |
...

## 9. Screenshot Request Map
| Section / Claim | Screenshot | Public/Auth/Manual | Risk | Priority | Owner approval | Status | Placement |
...

## 10. Visual Asset Plan
| Asset | Category | Purpose | Dimensions | Source | Contains factual claim? | Status |
...

## 11. Schema Plan
[Permitted types + conditions + blocked types.]

## 12. QA Gates
[Automated + manual, page-specific.]

## 13. Owner Approval Gates
[Explicit list of what requires owner sign-off.]
```

---

## 6. Relationship to Existing Governance Docs

| Document | Relationship to Chief SEO Architect |
|----------|-------------------------------------|
| `MASTER_SEO_SCREENSHOT_PAGE_FACTORY.md` | Defines Roles 1–6 that implement the Chief SEO Architect's brief. Chief SEO Architect is Role 0. |
| `SEO_INTELLIGENCE_AND_AI_SEARCH_OPS.md` | Provides the data inputs for Stage 1 (Search & AI Intelligence). |
| `CONTINUOUS_SEO_IMPROVEMENT_LOOP.md` | Governs recurring updates; Chief SEO Architect brief is updated when major changes are needed. |
| `SCREENSHOT_STANDARD.md` | Governs screenshot capture format; Chief SEO Architect brief uses this standard for the screenshot request map. |
| `BINANCE_GOLD_ARTICLE_PIPELINE.md` | Binance-specific implementation of the Chief SEO Architect pipeline. Stage 0 brief = `binance-chief-seo-architect-brief.md`. |
| `GOLD_STANDARD_EXCHANGE_TEMPLATE.md` | Reference spec for what Gold Standard looks like; Chief SEO Architect uses it to define page score targets. |
| `KYC_ACCESS_CLAIMS_POLICY.md` | Governs KYC claim evidence requirements; Evidence Map stage follows this policy. |

---

## 7. Anti-Patterns (What This Role Prevents)

| Anti-pattern | What went wrong | Chief SEO Architect prevention |
|-------------|----------------|--------------------------------|
| Registration screenshot shows 100 USD instead of 19,800 USD | Screenshot captured without CBW referral link; classified as `available` without visual inspection | Screenshot Request Map classifies capture URL precisely; visual inspection gate before `available` |
| Bonus gallery shows $1,000 fee rebates | Screenshot of wrong Binance product placed in gallery | Screenshot classification: REJECTED before gallery registration |
| Generic batch gallery replaces contextual screenshots | Gallery shows 8 unrelated screenshots in a dump | Stage 7 (Contextual Placement) requires screenshot near matching claim |
| Schema HowTo step uses rejected screenshot | `registration` path registered in JSON-LD despite showing wrong offer | Schema plan stage blocks any rejected path from schema |
| Evidence confidence 0.27 asserted as fact | Bonus expiry claimed as 30 days without verification | Evidence Map stage hedges or excludes low-confidence claims |
| `bonus_center` 404 error screenshot in evidence | URL had changed; error page captured and registered | Screenshot inspection gate rejects `status: available` for error-state file |
| Security screenshot shows account closure section | Authenticated capture contained sensitive account management UI | Screenshot Request Map classifies `security_overview` as OWNER APPROVAL REQUIRED; owner rejected |

---

## 8. First Application: Binance

Binance is the first production page to be governed by the Chief SEO Architect pipeline.

Pilot brief: `reports/binance-chief-seo-architect-brief.md` + `.json`

The Binance brief was produced as part of Sprint 04 (2026-06-05) following completion of the
Binance screenshot cleanup and walkthrough fix.

Reference: `docs/BINANCE_GOLD_ARTICLE_PIPELINE.md` for full Binance-specific stage definitions.

---

## 9. Governance Rules

1. Every important page production run begins with a Chief SEO Architect brief.
2. The brief must be stored in `reports/` (gitignored working file) during production, then
   the key decisions promoted to the exchange-specific pipeline doc (e.g., `BINANCE_GOLD_ARTICLE_PIPELINE.md`).
3. Implementation stages may not begin until the brief is complete.
4. The brief must be updated whenever: the bonus amount changes, a screenshot is re-classified,
   a new evidence field is added, or a major content revision is planned.
5. The Chief SEO Architect is responsible for every QA gate definition on their pages.
   If a gate is not in the brief, it will not be checked.

---

*Document version 1.0 — 2026-06-05 — CryptoBonusWorld Sprint 04*
*Next review: when a new exchange page enters Gold Standard production, or quarterly*
