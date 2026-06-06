# CryptoBonusWorld — Project Owner & Team Structure

**Version:** 1.0
**Created:** 2026-06-05
**Sprint:** Sprint 04
**Status:** ACTIVE — top-level governing document for the entire CryptoBonusWorld project
**Branch:** `master`

> This document defines the full leadership and team structure for CryptoBonusWorld.
> It sits above all other governance docs. Every role, pipeline, policy, and decision
> framework on this project ultimately reports to the Chief Project Owner defined here.
> When in doubt about priorities, process, or permissions — this document is the final reference.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Role Hierarchy](#2-role-hierarchy)
3. [Role Definitions (ROLE 0–13)](#3-role-definitions)
4. [Operating Model](#4-operating-model)
5. [Page Lifecycle States](#5-page-lifecycle-states)
6. [Decision Rules (Hard Gates)](#6-decision-rules)
7. [Current Active Pilot: Binance](#7-current-active-pilot-binance)
8. [Governance Reference Map](#8-governance-reference-map)
9. [Anti-Patterns This Structure Prevents](#9-anti-patterns)

---

## 1. Project Overview

**CryptoBonusWorld** is simultaneously:

- An **affiliate business** — revenue depends on users registering at exchanges via CBW referral links
- An **SEO asset** — organic traffic is the primary acquisition channel; every page must rank
- An **automated content + evidence + screenshot system** — scale requires repeatable pipelines
- A **trust product** — users must believe the bonus amounts, screenshots, and reviews are accurate
- An **AI-search answer target** — appearing in Google AI Overviews, Bing Copilot, and Perplexity answers is a strategic priority

These five product dimensions must be in balance at all times. Optimising one at the expense of
another is a failure state:

| Failure mode | Cause | Impact |
|---|---|---|
| Wrong bonus amount live | Evidence skipped, screenshot not inspected | Affiliate conversion destroyed; trust damage |
| Ranking drop | SEO architecture skipped; thin content deployed | Traffic loss |
| No conversions | UX not reviewed; CTA not placed correctly | Revenue zero despite traffic |
| Legal risk | Compliance not checked; unverified claims asserted | Affiliate program termination |
| Technical debt | DevOps skipped; deploys not verified | Broken pages, crawl errors |

---

## 2. Role Hierarchy

```
ROLE 0  ── Chief Project Owner
            │
            ├── ROLE 1  ── Chief SEO Architect
            │             (page architecture before implementation)
            │
            ├── ROLE 2  ── SEO Intelligence Lead
            │             (SERP data, GSC, AI answer monitoring)
            │
            ├── ROLE 3  ── Editorial Lead
            │             (content quality, E-E-A-T, copy)
            │
            ├── ROLE 4  ── Evidence Auditor
            │             (claims verification, confidence scoring)
            │
            ├── ROLE 5  ── Screenshot Director
            │             (capture, inspection, classification, placement)
            │
            ├── ROLE 6  ── Visual Director
            │             (hero/OG/illustration assets; AI vs real split)
            │
            ├── ROLE 7  ── UX / Conversion Lead
            │             (CTA placement, affiliate links, mobile UX)
            │
            ├── ROLE 8  ── Schema / Technical SEO Lead
            │             (structured data, canonical, sitemap, crawl)
            │
            ├── ROLE 9  ── QA / Release Manager
            │             (pre-deploy gates, sign-off, release log)
            │
            ├── ROLE 10 ── DevOps / Automation Lead
            │             (build, deploy, monitoring, scripts)
            │
            ├── ROLE 11 ── Compliance / Risk Lead
            │             (bonus claim safety, KYC policy, geo restrictions)
            │
            ├── ROLE 12 ── Analytics / Growth Lead
            │             (GSC, Yandex Webmaster, Metrika, affiliate data)
            │
            └── ROLE 13 ── Content Operations Manager
                          (lifecycle tracking, freshness, task queue)
```

**Activation model:** Most roles are not active on every page update.
The Chief Project Owner determines which roles are activated for each task.
A small bug fix (e.g., typo correction) may only activate Roles 3, 9, 10.
A new Gold Standard page production activates all 14 roles in sequence.

---

## 3. Role Definitions

---

### ROLE 0 — Chief Project Owner

**Mission:**
Own the entire CryptoBonusWorld project as a product, SEO asset, affiliate business, and
automated content/evidence/screenshot system. Set direction, sequence priorities, coordinate
roles, and make final decisions on releases, affiliate links, bonus amounts, and business strategy.

**Responsibilities:**

1. **Direction** — Decide which pages are produced, in which order, and to which standard
2. **Priority sequencing** — Maintain the active sprint backlog; move tasks between sprints
3. **Business decisions** — Affiliate program selection, partner negotiations, bonus amount approvals
4. **Role coordination** — Assign which roles are active for each task; unblock role conflicts
5. **Release authority** — Final approval before any deploy that changes bonus amounts, affiliate links,
   or authenticated screenshots
6. **Budget / resource** — Decide what to automate vs what to do manually vs what to defer
7. **Governance** — Approve new governance documents; resolve conflicts between governance docs
8. **Escalation** — All hard decisions escalate to this role; it is the final tie-breaker

**Inputs:**
- Sprint backlog and task queue
- Analytics reports (GSC, Yandex, Metrika, affiliate dashboard)
- QA/Release Manager sign-off reports
- Evidence Auditor flags (low-confidence claims, re-verification needed)
- Compliance / Risk Lead flags (risky claims, geo issues)
- All role outputs requiring final approval

**Outputs:**
- Sprint priorities (ordered task list)
- Deploy approvals
- Affiliate link authorizations
- Bonus amount approvals
- Governance doc approvals
- Escalation decisions

**Approval gates owned exclusively by this role:**
- Any change to a registered affiliate link
- Any live page claiming a specific bonus amount above a threshold (currently: any amount ≥ 5,000 USDT)
- Publishing any authenticated screenshot (KYC, security, deposit, account data)
- Enabling `Product offers.price` schema (currently: `bonusPriceSafe` flag)
- Any merge, branch restructure, or repository architecture change

**When called:**
- At the start of every sprint (priority sequencing)
- When any role escalates a decision
- Before any deploy touching bonus amounts or affiliate links
- When a compliance or legal risk is flagged
- When a new exchange is onboarded

**Key documents owned:**
- This document (`CBW_PROJECT_OWNER_AND_TEAM_STRUCTURE.md`)
- Sprint backlog
- Affiliate link registry (final approval authority)

---

### ROLE 1 — Chief SEO Architect

**Mission:**
Design every important page as a search-first, AI-answer-ready, evidence-backed,
conversion-focused asset before implementation begins.

**Responsibilities:**
- Produce the Chief SEO Architect brief for each important page (Stage 0 brief)
- Define H1→H2→H3 page architecture, short answer target, FAQ structure
- Map search intents, SERP landscape, AI answer opportunities
- Produce evidence map, screenshot request map, schema plan, QA gate definitions
- Block all downstream roles until brief is approved

**Inputs:** Chief Project Owner priority order; SEO Intelligence reports; existing evidence data

**Outputs:** `reports/{exchange}-chief-seo-architect-brief.md` + `.json`

**Approval gates:** Brief must be approved before any Stage 1–10 work begins

**When called:** For any new important page or major revision to an existing page

**Governance reference:** `docs/CHIEF_SEO_ARCHITECT_ROLE.md`

---

### ROLE 2 — SEO Intelligence Lead

**Mission:**
Supply the search data and AI answer landscape that the Chief SEO Architect and Editorial Lead
need to build pages that actually rank and get cited.

**Responsibilities:**
- Pull GSC data: impressions, clicks, CTR, position for all tracked URLs
- Monitor Yandex Webmaster for Russian/CIS market indexing and keyword data
- Capture SERP snapshots for primary keywords (top 10 results, featured snippet, PAA)
- Monitor AI Overview presence: Google AI Overviews, Bing Copilot, Perplexity answers
- Identify competitor keyword gaps: what are top-ranking pages doing that CBW doesn't?
- Collect and maintain PAA (People Also Ask) question databases per exchange
- Alert when a ranking drops more than 5 positions week-over-week
- Alert when a competitor page changes its bonus amount claim
- Maintain the weekly SEO intelligence report

**Inputs:** GSC API, Yandex Webmaster API, manual SERP snapshots, competitor page monitoring

**Outputs:**
- Weekly SEO intelligence report (`docs/WEEKLY_SEO_INTELLIGENCE_REPORT_TEMPLATE.md`)
- Per-page SERP snapshot when Chief SEO Architect brief is in progress
- PAA question list per exchange (FAQ seed set)
- Competitor bonus amount monitor log

**Approval gates:** None — this role supplies data, does not make decisions

**When called:**
- Weekly (recurring intelligence report)
- When Chief SEO Architect requests a SERP snapshot for a specific page
- When a ranking alert fires
- When a competitor changes their Binance/Bybit bonus claims

**Governance reference:** `docs/SEO_INTELLIGENCE_AND_AI_SEARCH_OPS.md`

---

### ROLE 3 — Editorial Lead

**Mission:**
Make every important page worth reading, worth trusting, and worth ranking.
Apply E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) to every word.

**Responsibilities:**
- Draft all editorial content (intro, section copy, verdict, bonus conditions, FAQ)
- Ensure content follows the Chief SEO Architect's page blueprint exactly
- Apply E-E-A-T framework: expert-style copy, no AI bloat, no keyword stuffing
- Every factual claim must trace to a Stage 3 evidence entry (no unsourced assertions)
- FAQ must answer real user questions from the PAA seed set
- Write or brief the `longDescription`, `verdict`, `editorNote`, and `faqAppend` fields
  in `src/data/content-overrides.json`
- Assign reviewer to each page (`reviewers/[slug]` entity)
- Maintain consistent editorial voice across all exchange pages

**Inputs:** Chief SEO Architect brief (Stage 2 blueprint); Evidence Auditor output (Stage 3 map);
Screenshot Director classification; SEO Intelligence PAA seeds

**Outputs:**
- Drafted page content meeting blueprint structure
- `content-overrides.json` updates: `longDescription`, `verdict`, `faqAppend`, `editorNote`
- Reviewer assignment

**Approval gates:**
- Any content draft must be reviewed against Evidence Auditor output before publish
- No claim with `confidenceScore < 0.5` may be asserted as fact without hedging language
- `verdict.rating` must be based on a defined scoring rubric

**When called:** At Stage 5 (Content Draft / Build) of the page production flow

---

### ROLE 4 — Evidence Auditor

**Mission:**
Every factual claim on every important page must be verified, tracked, and kept current.
Unverified claims do not go live.

**Responsibilities:**
- Verify bonus amounts, currencies, expiry, minimum deposit, task requirements
- Verify KYC requirements per `docs/KYC_ACCESS_CLAIMS_POLICY.md`
- Verify spot fees, futures fees, P2P fees, withdrawal fees
- Verify geographic restrictions and available countries
- Verify trading products: spot, futures, P2P, copy trading, staking
- Verify proof of reserves publication frequency and auditor
- Assign `confidenceScore` (0.0–1.0) per fact
- Set `conflictStatus`: `ok` / `outdated` / `needs-check` / `conflict`
- Set `lastChecked` and `checkedBy` on every fact that was actively verified
- Set `manualReviewRequired: true` when human verification is needed before publish
- Flag evidence that is approaching the re-check window (default: 90 days for fees; 60 days for bonus)

**Inputs:** Official exchange pages, support FAQs, official fee schedules, official T&C pages

**Outputs:** Updated `src/data/evidence/{exchange}.json` with correct confidence levels and timestamps

**Approval gates:**
- `bonus_amount.confidenceScore < 0.5` → Product `offers` schema suppressed automatically
- `kyc_required: false` claim requires `confidenceScore ≥ 0.70` + `conflictStatus: ok` + `manualReviewRequired: false`
- Any increase in `confidenceScore` requires a source URL or manual check timestamp

**When called:**
- At Stage 3 (Evidence Map) of page production
- Every 60 days for bonus amount fields (re-check window)
- Every 90 days for fee fields
- When Compliance / Risk Lead flags a potentially outdated claim

**Governance reference:** `docs/KYC_ACCESS_CLAIMS_POLICY.md`; `src/data/evidence/{exchange}.json`

---

### ROLE 5 — Screenshot Director

**Mission:**
Visual evidence must be present, accurate, classified correctly, and placed near the claims
they support. No screenshot dump. No rejected screenshots ever rendered.

**Responsibilities:**
- Produce screenshot request map (Stage 4 of page production)
- Classify every screenshot: PROOF / CONTEXTUAL / WALKTHROUGH / REJECTED / AWAITING-CAPTURE
- Define capture URL, device, scope, and authentication level for each slot
- Execute public screenshot captures via Playwright scripts
- Inspect every screenshot before registration: no error states, no sensitive data, correct content
- File size check: desktop WebP < 200KB; mobile WebP < 150KB; < 15KB → suspected error state → reject
- Register only approved screenshots in `src/data/evidence/{exchange}.json` with `status: "available"`
- Authenticated screenshots go to `reports/authenticated-screenshots/` first — never directly to `public/`
- Define contextual placement plan: which screenshot belongs near which page section
- Maintain recapture task queue for blocked or outdated slots

**Inputs:** Chief SEO Architect brief (Stage 4 screenshot request map); Evidence Auditor output

**Outputs:**
- Classified screenshot set in `public/screenshots/{exchange}/`
- Registered evidence entries with `status: "available"`
- Recapture task list for blocked slots
- Contextual placement plan per section

**Approval gates:**
- Authenticated screenshots require Chief Project Owner visual approval before `public/` publish
- Any screenshot showing account data, wallet address, API keys, QR codes, withdrawal details → REJECTED
- `registration` screenshot showing a bonus amount lower than the CBW partner offer → REJECTED, flag immediately

**When called:**
- At Stage 4 (Screenshot Request Map) and Stage 6 (Screenshot Capture) of page production
- When evidence evidence shows a screenshot slot is `outdated` or `needs_manual_capture`
- When an authenticated session is available for a priority exchange

**Governance reference:** `docs/SCREENSHOT_STANDARD.md`; `docs/AUTHENTICATED_SCREENSHOT_CAPTURE.md`

---

### ROLE 6 — Visual Director

**Mission:**
CryptoBonusWorld pages must be visually compelling at first glance.
Hero images, OG images, and section illustrations support branding and readability.
They are never used as factual proof — that is the Screenshot Director's domain.

**Responsibilities:**
- Produce hero image brief for every important page (dimensions, style, mood, negative prompts)
- Produce OG image brief (1200×630, text overlay content, brand colors)
- Define section illustration needs: which sections benefit from a visual break?
- Commission or generate hero/OG images via the image pipeline (ChatGPT/fal.ai/Midjourney)
- Review generated assets for brand consistency before publish
- Maintain `public/images/heroes/` and `public/images/og/` directories
- Ensure OG images are referenced in page `<meta>` tags correctly
- **Hard boundary:** AI-generated images must never be placed adjacent to a factual claim
  as if they are evidence. If an AI image contains text with a bonus amount, that amount
  must be verified and current — and it must be labeled as a graphic, not a screenshot

**Inputs:** Chief SEO Architect brief (Stage 5 visual asset plan); brand guidelines

**Outputs:**
- Hero image per important page (`public/images/heroes/{exchange}-hero-{YYYY-MM}.webp`)
- OG image per important page (`public/images/og/{exchange}-og-{YYYY-MM}.png`)
- Section illustration assets (optional)

**Approval gates:**
- Any AI-generated image containing a specific bonus amount must have that amount verified by Evidence Auditor
- OG image text overlay must match the current evidence-verified offer amount

**When called:**
- At Stage 5 (Visual Plan) of page production for any important page
- When a seasonal refresh or brand update is needed

---

### ROLE 7 — UX / Conversion Lead

**Mission:**
Users who reach any CBW page must be guided toward the conversion action with minimal friction,
zero false urgency, and zero broken paths.

**Responsibilities:**
- Verify CTA button placement: above-the-fold sidebar, post-verdict, mid-walkthrough, post-FAQ
- Verify sticky card renders correctly on desktop and mobile
- Verify bonus amount and promo code are prominent and accurate in the above-fold card
- Verify PromoCodeBox renders and code is copyable
- Verify mobile layout: sidebar stacks above main content, CTA is accessible without scrolling
- Verify all internal links work and are relevant
- Verify affiliate link is correct and uses the right referral parameters
- Check for dead ends: every page must have at least one related exchange link or next-step CTA
- Verify no fake urgency (no "expires soon" unless evidenced with a date)
- Audit `go/{exchange}` redirect pages for affiliate parameter integrity

**Inputs:** Deployed page HTML; device preview; Chief SEO Architect CTA location spec

**Outputs:**
- UX sign-off checklist: CTA present, mobile works, no dead ends, promo code visible, no false urgency
- Affiliate link integrity report

**Approval gates (IMMUTABLE rules):**
- **MEXC affiliate link is IMMUTABLE** — any change requires Chief Project Owner explicit approval
- **Bybit affiliate link is IMMUTABLE** — any change requires Chief Project Owner explicit approval
- All affiliate CTAs must use `rel="noopener noreferrer sponsored"`
- No fake expiry dates or countdown timers unless the bonus offer has a confirmed expiry

**When called:**
- At Stage 7 (Contextual Placement) and Stage 9 (QA) of page production
- On any deploy touching CTA components, sidebar cards, or `go/` redirect pages
- In monthly UX audit cycles

---

### ROLE 8 — Schema / Technical SEO Lead

**Mission:**
Machine-readable signals must be clean, accurate, and spec-compliant.
Incorrect schema is worse than no schema — it triggers rich result penalties.

**Responsibilities:**
- Validate `Product` schema emits only when `bonus_amount.confidenceScore ≥ 0.5`
- Validate `Product offers.price` only when `bonusPriceSafe: true` (Chief Project Owner gate)
- Validate `FAQPage` schema items match exactly what is visible on the rendered page
- Validate `HowTo` step images point only to approved `public/screenshots/` paths
- Validate `BreadcrumbList` is correct for every page type
- Validate `Organization` / `FinancialService` entity data is accurate
- Validate `aggregateRating` uses real editorial ratings, not fabricated scores
- Validate canonical URLs are absolute and match sitemap format
- Validate OG image exists and is accessible at the referenced path
- Validate no `reports/` paths appear in any schema field
- Validate no rejected screenshot paths appear in any `HowTo` step image
- Run `npm run build` checks for schema errors

**Inputs:** Built HTML; Chief SEO Architect schema plan; Evidence Auditor output; Screenshot Director classification

**Outputs:**
- Schema validation report
- List of schema errors / blocked schema types

**Approval gates:**
- `Product offers.price` → blocked unless Chief Project Owner approves `bonusPriceSafe: true`
- `HowTo` step image → blocked if referencing any REJECTED screenshot path
- `FAQPage` → blocked if any Q/A pair is not visible on the rendered page

**When called:**
- At Stage 8 (Schema & Technical SEO) of every page production
- After any content edit that changes FAQ items, walkthrough steps, or product offers
- Monthly schema audit

**Governance reference:** `docs/MASTER_SEO_SCREENSHOT_PAGE_FACTORY.md` §7 Schema Rules

---

### ROLE 9 — QA / Release Manager

**Mission:**
No page goes live without a complete QA pass. The QA Manager owns the release gate.

**Responsibilities:**
- Run all automated QA checks defined in the Chief SEO Architect brief for the page
- Verify build passes (`npm run build` — correct page count, 0 errors)
- Run `npm run audit:screenshots` — P1 errors must be 0
- Grep built HTML for: conflicting bonus amounts, rejected screenshot paths, `reports/` paths,
  "Screenshot in preparation", platform screenshots gallery, correct offer amounts
- Run live verification after deploy: HTTP status, HTML content checks
- Maintain QA release log: date, page, checks run, pass/fail, deployer
- Block deploy if any automated gate fails
- Escalate to Chief Project Owner when a manual approval gate is needed
- Verify Bybit and other exchange regression checks after every Binance-related deploy

**Inputs:** Built HTML; Chief SEO Architect QA gate definitions; manual approval gate status

**Outputs:**
- QA sign-off report (`.md` + `.json`) per deploy
- Release log entry
- Live verification checklist post-deploy

**Approval gates owned:**
- **No deploy without build passing**
- **No deploy with `audit:screenshots` P1 errors > 0**
- **No deploy with conflicting bonus amounts in HTML**
- **No deploy with rejected screenshot paths in HTML**
- **No deploy without live verification pass after deploy**

**When called:** At Stage 9 (Pre-Deploy QA) and Stage 10 (Deploy + Live Check) of every production

---

### ROLE 10 — DevOps / Automation Lead

**Mission:**
Build, deploy, monitor, and automate. CryptoBonusWorld must build cleanly, deploy reliably,
and run with zero manual intervention for routine operations.

**Responsibilities:**
- Maintain the build pipeline (`npm run build`, `npx astro build`)
- Maintain the deploy script (`scripts/deploy.mjs`) — build → package → SCP → server extract
- Maintain IndexNow submission integration (Bing + Yandex, triggered on deploy)
- Maintain Playwright screenshot capture scripts (`scripts/capture-authenticated-screenshot.mjs`)
- Maintain `npm run audit:screenshots` script
- Maintain the CI-equivalent check scripts (schema checks, affiliate link immutability checks)
- Monitor VPS server health (`root@23.88.106.140`)
- Manage `.gitignore` to ensure `reports/`, `.browser-profiles/`, `.claude/` never commit
- Maintain the two-branch structure (`master` / `main`) — never merge these branches
- Automate repetitive evidence and screenshot tasks where safe to do so

**Inputs:** QA sign-off; Chief Project Owner deploy approval; DevOps task queue

**Outputs:**
- Clean build artifacts
- Successful deploys with `SERVER_DONE` confirmation
- IndexNow submission logs (`logs/indexnow-submissions.jsonl`)
- Automation scripts for approved repetitive tasks

**Hard rules:**
- Never push to `main` branch (two-branch structure is intentional)
- Never use `git add .` or `git add -A` — always stage specific files
- Never skip build verification before deploy
- Never commit `reports/`, `.browser-profiles/`, `.auth/`, `.claude/`
- `dist.tar.gz` is cleaned up after every deploy

**When called:** At Stage 10 (Deploy + Live Check) of every production; for any automation task

---

### ROLE 11 — Compliance / Risk Lead

**Mission:**
Protect CryptoBonusWorld from legal, affiliate, and reputational risk caused by incorrect claims,
misleading screenshots, unsupported KYC statements, or geo-restriction violations.

**Responsibilities:**
- Review every bonus amount claim against evidence before it goes live
- Review every KYC claim against the KYC Access Claims Policy
- Review geo-restriction claims: no page may imply an exchange is available in a restricted country
- Review affiliate link integrity: `sponsored` attribute, disclaimer presence
- Maintain the list of banned formulations (claims that cannot be made regardless of evidence)
- Maintain the mandatory disclaimer language for bonus pages
- Review every authenticated screenshot for personal data before it goes to `public/`
- Flag any claim with `confidenceScore < 0.5` that is being asserted as certain fact
- Flag any screenshot that shows: API keys, wallet addresses, withdrawal confirmations,
  identity documents, QR codes, account balance, personal data
- Maintain the country-specific restriction warnings (US, UK, Canada, etc.)

**Inputs:** Evidence Auditor output; Screenshot Director classification; page draft; Chief SEO Architect brief

**Outputs:**
- Compliance sign-off or block
- List of required disclaimer language per page
- Banned claims list (updated as needed)
- Risk flags for escalation to Chief Project Owner

**Hard rules (all absolute — no exceptions):**
- A page may not assert `kyc_required: false` unless `confidenceScore ≥ 0.70` + `conflictStatus: ok`
- A page may not claim a specific minimum deposit amount with `confidenceScore < 0.5`
- A page may not show a screenshot of wallet addresses, identity documents, or API keys
- US availability of Binance.com must never be implied or left ambiguous
- All affiliate CTAs must include the `sponsored` relationship disclosure

**When called:**
- At Stage 5 (Content Draft) to review claims before writing is finalised
- At Stage 9 (Pre-Deploy QA) as a final compliance sign-off
- When Evidence Auditor flags a low-confidence claim being asserted as fact

**Governance reference:** `docs/KYC_ACCESS_CLAIMS_POLICY.md`; affiliate disclosure page

---

### ROLE 12 — Analytics / Growth Lead

**Mission:**
Measure what is working, identify what is not, and give every other role the data they need
to make better decisions.

**Responsibilities:**
- Monitor Google Search Console: impressions, clicks, CTR, position for all tracked pages
- Monitor Yandex Webmaster: indexing status, keyword data, CIS market performance
- Monitor Yandex Metrika: session data, scroll depth, CTA click rates, bounce rates
- Monitor IndexNow submission log for acceptance rates
- Track affiliate click-through rates per exchange page (where affiliate dashboard allows)
- Maintain the FULL_SITE_SEO_AUDIT_SCORECARD — update scores after major production runs
- Identify: which pages are gaining impressions, which are losing, which are not indexed
- Identify: which bonus pages have high traffic but low CTA click-through (UX issue)
- Identify: which FAQs are driving People Also Ask clicks
- Report weekly to Chief Project Owner: traffic trends, conversion trends, ranking movements
- Alert when a high-value page drops more than 10% in weekly clicks

**Inputs:** GSC API data, Yandex APIs, Metrika data, IndexNow logs, affiliate dashboard exports

**Outputs:**
- Weekly analytics report (summary for Chief Project Owner)
- Page-level performance cards (impressions, clicks, CTR, conversion estimate)
- Alert reports when significant changes detected
- Updated site-wide SEO scorecard

**When called:**
- Weekly (recurring report)
- When a deploy significantly changes a high-traffic page
- When SEO Intelligence Lead identifies a ranking shift needing investigation

**Governance reference:** `docs/FULL_SITE_SEO_AUDIT_SCORECARD.md`; `docs/CONTINUOUS_SEO_IMPROVEMENT_LOOP.md`

---

### ROLE 13 — Content Operations Manager

**Mission:**
Track the lifecycle state of every important page. Ensure no page stagnates, no evidence
goes stale, no screenshot stays outdated longer than its refresh window, and no task gets lost.

**Responsibilities:**
- Maintain the master page lifecycle registry (current state per page per lifecycle stage)
- Track evidence freshness: flag any `lastChecked` older than the re-check window
- Track screenshot freshness: flag any `capturedAt` older than 90 days for important slots
- Maintain the sprint backlog in coordination with Chief Project Owner
- Maintain the content task queue: which pages need refresh, which need new content, which are blocked
- Ensure every page in `src/pages/exchanges/` has an assigned lifecycle state
- Alert when a bonus expiry date is approaching or the offer amount has likely changed
- Maintain the Gold Standard page tracker: which pages are at which score tier

**Inputs:** `src/data/evidence/*.json` (lastChecked dates); screenshot registry; sprint backlog; Analytics reports

**Outputs:**
- Content lifecycle registry (page → lifecycle state → next action → owner)
- Evidence freshness report (fields approaching re-check window)
- Screenshot freshness report
- Sprint backlog updates

**Lifecycle state transitions:**
Every important page must always have exactly one lifecycle state (see §5 below).
Content Operations Manager owns the lifecycle state registry and updates it as work progresses.

**When called:**
- Weekly (freshness check)
- At sprint planning (backlog update)
- When Analytics Lead reports a page is underperforming (possible refresh needed)

---

## 4. Operating Model

The operating model defines the sequence in which roles act on any important page.
The Chief Project Owner decides when to activate this sequence and at what stage to start.

```
STEP 1 — Chief Project Owner
         Sets priority. Assigns target page. Specifies which roles to activate.

STEP 2 — Chief SEO Architect (ROLE 1)
         Produces the Stage 0 brief: page goal, keyword cluster, intent map,
         blueprint, evidence map, screenshot request map, schema plan, QA gates.
         BLOCKS all downstream steps until brief is approved.

STEP 3 — SEO Intelligence Lead (ROLE 2)
         Validates search direction. Supplies SERP snapshot, PAA questions,
         competitor bonus amount data, AI answer landscape.
         Output feeds back into Stage 0 brief refinement.

STEP 4 — Evidence Auditor (ROLE 4)
         Verifies all factual claims in the brief's evidence map.
         Updates evidence JSON. Flags low-confidence fields.
         BLOCKS content draft if critical claims are unverified.

STEP 5 — Screenshot Director (ROLE 5)
         Executes screenshot request map. Captures, inspects, classifies.
         Defines contextual placement plan.
         BLOCKS placement stage if critical proof screenshots are missing.

STEP 6 — Editorial Lead (ROLE 3)
         Drafts content following Stage 2 blueprint exactly.
         Only after evidence map and screenshot classification are complete.

STEP 7 — Visual Director (ROLE 6)
         Produces hero/OG image briefs. Commissions or generates assets.
         Verifies AI-generated images do not contain unverified claims.

STEP 8 — UX / Conversion Lead (ROLE 7)
         Reviews CTA placement, affiliate links, mobile layout.
         Checks PromoCodeBox, sticky card, dead ends.

STEP 9 — Schema Lead (ROLE 8)
         Validates JSON-LD schema: permitted types, blocked types, image safety.
         BLOCKS deploy if schema contains rejected screenshot paths or unverified offers.

STEP 10 — Compliance / Risk Lead (ROLE 11)
          Reviews all claims, screenshots, geo statements, KYC claims.
          Issues compliance sign-off or escalates to Chief Project Owner.

STEP 11 — QA / Release Manager (ROLE 9)
          Runs automated gates: build, audit:screenshots, grep checks.
          Runs manual approval gate checklist.
          Issues release sign-off. BLOCKS deploy if any gate fails.

STEP 12 — DevOps / Automation Lead (ROLE 10)
          Executes: git push → npm run deploy → SERVER_DONE.
          Runs live verification: HTTP checks, HTML checks, IndexNow.

STEP 13 — Analytics / Growth Lead (ROLE 12)
          Monitors post-deploy performance: GSC impressions, clicks, CTR.
          Alerts if page underperforms within the first 14-day window.

STEP 14 — Content Operations Manager (ROLE 13)
          Advances page lifecycle state to `live`.
          Sets next review date. Updates sprint backlog.
```

---

## 5. Page Lifecycle States

Every important page on CryptoBonusWorld has exactly one lifecycle state at any time.
The Content Operations Manager (ROLE 13) owns the lifecycle registry.

| State | Meaning | Who advances to next state |
|-------|---------|---------------------------|
| `idea` | Page concept exists; not yet prioritised | Chief Project Owner |
| `architect_brief` | Chief SEO Architect brief in progress | Chief SEO Architect |
| `blueprint` | Brief approved; H1/H2/H3 structure defined | Chief SEO Architect → Editorial Lead |
| `evidence_pending` | Evidence map defined; awaiting verification | Evidence Auditor |
| `screenshot_pending` | Evidence ready; awaiting screenshot capture/approval | Screenshot Director |
| `draft_ready` | Content drafted; awaiting review | Editorial Lead → Compliance Lead |
| `qa_pending` | Draft approved; awaiting QA gates | QA / Release Manager |
| `owner_review` | Automated QA passed; awaiting Chief Project Owner visual sign-off | Chief Project Owner |
| `deploy_ready` | All gates passed; cleared for deploy | DevOps Lead |
| `live` | Page deployed and live at production URL | Content Operations Manager |
| `monitoring` | Live; within 14-day performance watch window | Analytics / Growth Lead |
| `refresh_needed` | Evidence stale, screenshot outdated, or ranking decline detected | Content Operations Manager |

**Lifecycle flow:**
```
idea → architect_brief → blueprint → evidence_pending → screenshot_pending
     → draft_ready → qa_pending → owner_review → deploy_ready
     → live → monitoring → (refresh_needed → evidence_pending → ...)
```

**Important:** A page may jump states backwards. A `live` page that receives a compliance flag
reverts to `qa_pending` and cannot be re-deployed without passing QA again.

---

## 6. Decision Rules (Hard Gates)

These rules are absolute. They cannot be overridden by any role except Chief Project Owner.
Even then, the Chief Project Owner must record the override decision with explicit justification.

### Deploy Blockers

| Rule | Block trigger | Override authority |
|------|--------------|-------------------|
| No deploy with conflicting bonus amounts | Built HTML contains a Binance amount other than 19,800 USDT | Chief Project Owner only |
| No deploy with rejected screenshots | Built HTML contains path of any REJECTED screenshot | Chief Project Owner only |
| No deploy with unsupported KYC claims | `kyc_required: false` with `confidenceScore < 0.70` | Chief Project Owner only |
| No deploy with private data in screenshots | Any screenshot showing wallet address, API key, identity doc, QR code | None — absolute block |
| No deploy without build passing | `npm run build` errors or wrong page count | None — absolute block |
| No deploy without P1 screenshot audit pass | `npm run audit:screenshots` P1 errors > 0 | None — absolute block |
| No deploy with `reports/` paths in HTML | Built HTML contains `reports/` in any URL | None — absolute block |

### Authentication / Approval Gates

| Rule | Approval required | No exceptions |
|------|------------------|---------------|
| Authenticated screenshots (KYC, security, deposit) | Chief Project Owner visual review | Yes |
| Any affiliate link change | Chief Project Owner explicit approval | Yes |
| MEXC affiliate link | Chief Project Owner — IMMUTABLE | Yes |
| Bybit affiliate link | Chief Project Owner — IMMUTABLE | Yes |
| Bonus amount change on live page | Chief Project Owner approval + Evidence Auditor verification | Yes |
| `Product offers.price` schema activation | Chief Project Owner approval (`bonusPriceSafe` flag) | Yes |

### Content Safety Rules

| Rule | Trigger | Action |
|------|---------|--------|
| Binance registration screenshot showing 100 USD | `registration/global-desktop-2026-06.webp` rendered | BLOCK — evidence status must be `outdated` |
| Any Binance screenshot showing $1,000 fee rebates | `bonus/global-desktop-2026-06.webp` rendered | BLOCK |
| US availability implied for Binance.com | Text or content suggesting US users can use Binance.com | Compliance flag → must add restriction note |
| KYC not required implied without strong evidence | `kyc_required: false` without `confidenceScore ≥ 0.70` | Evidence Auditor block |

---

## 7. Current Active Pilot: Binance

**Lifecycle state:** `monitoring` → `refresh_needed` (evidence fields + contextual screenshots pending)

**Sprint 04 — Completed (deployed live 2026-06-05):**
- ✅ Platform Screenshots gallery disabled (`screenshotGalleryDisabled: true`)
- ✅ Registration screenshot (100 USD) → `outdated` in evidence; removed from walkthrough
- ✅ `bonus_referral_landing` (19,800 USD + CRYPTOBONUSW) placed in walkthrough Step 1
- ✅ KYC screenshot captured, owner-approved, published
- ✅ `mobile_app` screenshot recaptured (clean 24KB)
- ✅ `bonus` screenshot notes updated (NOT PARTNER OFFER)
- ✅ Chief SEO Architect brief created (`reports/binance-chief-seo-architect-brief.md` v1.0)
- ✅ Gold Article Pipeline governance created (`docs/BINANCE_GOLD_ARTICLE_PIPELINE.md`)
- ✅ Live verification: 19,800 USDT ×36, CRYPTOBONUSW ×34, all checks green

**Current Binance role assignments:**

| Role | Status |
|------|--------|
| Chief Project Owner (ROLE 0) | ✅ Active — priorities set for Sprint 05 |
| Chief SEO Architect (ROLE 1) | ✅ Brief v1.0 approved |
| SEO Intelligence Lead (ROLE 2) | ⚠️ Pending — SERP snapshot + PAA refresh needed for Sprint 05 |
| Editorial Lead (ROLE 3) | ⚠️ Pending — bonus block rewrite in Sprint 05 |
| Evidence Auditor (ROLE 4) | ⚠️ Pending — 3 low-confidence fields need re-verification |
| Screenshot Director (ROLE 5) | ⚠️ Pending — 5 contextual screenshots need placement; `deposit` needs capture |
| Visual Director (ROLE 6) | ❌ Not started — hero + OG images needed |
| UX Lead (ROLE 7) | ✅ Passed in Sprint 04 QA |
| Schema Lead (ROLE 8) | ✅ Passed in Sprint 04 (HowTo safe, Product schema active) |
| QA Manager (ROLE 9) | ✅ Sprint 04 QA passed |
| DevOps Lead (ROLE 10) | ✅ Deployed live 2026-06-05 |
| Compliance Lead (ROLE 11) | ✅ Passed in Sprint 04 (100 USD removed) |
| Analytics Lead (ROLE 12) | ⚠️ Monitoring — 14-day post-deploy window |
| Content Ops (ROLE 13) | ⚠️ Sprint 05 backlog pending |

**Next priority: Binance Gold Page — Sprint 05**

Top 6 Sprint 05 tasks (priority order):

1. **SPRINT-05-BINANCE-CONTEXTUAL-BONUS-SCREENSHOT-01**
   Embed `bonus_referral_landing` contextually near the 19,800 USDT claim section.
   Roles: Screenshot Director (5) + Editorial Lead (3) + Schema Lead (8)

2. **SPRINT-05-BINANCE-CONTEXTUAL-ALL-SCREENSHOTS-01**
   Contextual placement for `fees`, `p2p`, `spot`, `proof_of_reserves`, `mobile_app`.
   Roles: Screenshot Director (5) + Editorial Lead (3)

3. **SPRINT-05-BINANCE-FAQ-EXPANSION-01**
   Expand FAQ from 8 to 15 PAA-driven questions.
   Roles: SEO Intelligence Lead (2) + Editorial Lead (3) + Schema Lead (8)

4. **SPRINT-05-BINANCE-EVIDENCE-REFRESH-01**
   Re-verify `bonus_expiry_days`, `bonus_min_deposit`, `bonus_requires_deposit`.
   Roles: Evidence Auditor (4) + Compliance Lead (11)

5. **SPRINT-05-BINANCE-DEPOSIT-SCREENSHOT-01**
   Capture `binance.com/en/buy-sell-crypto` for `deposit` slot.
   Roles: Screenshot Director (5)

6. **SPRINT-05-BINANCE-HERO-OG-01**
   Generate hero (1920×640) and OG (1200×630) images per brief specs.
   Roles: Visual Director (6)

---

## 8. Gold Page Specialist Squad — Roles 14–35

For Gold Pages (money pages, high-value targets, pages with screenshots and affiliate offers),
the **Gold Page Specialist Squad** activates in addition to the Core Production Team (ROLES 0–13).

Full definitions, weekly duties, inputs, outputs, and approval powers for all specialist roles
are in: **`docs/GOLD_PAGE_WAR_ROOM_AND_WEEKLY_TRAINING.md`**

| Role | Title | Mission |
|------|-------|---------|
| ROLE 14 | SERP Analyst / Search Demand Researcher | Analyse SERPs, PAA clusters, competitor formats before page writing |
| ROLE 15 | AI Search / GEO / AEO Optimization Lead | Optimise for AI Overviews, ChatGPT Search, Perplexity citations |
| ROLE 16 | Offer Integrity Officer | Protect bonus amounts and promo codes from contradictions and stale screenshots |
| ROLE 17 | Screenshot Capture Operator | Capture public/auth/manual screenshots per request matrix |
| ROLE 18 | Screenshot Post-Production Editor | Crop, mask, convert, reject, and quality-gate captured screenshots |
| ROLE 19 | Brand / Logo Asset Manager | Ensure exchange logos, comparison cards, and visual assets are premium |
| ROLE 20 | Page Design Reviewer | Review final page layout, screenshot density, and visual hierarchy before deploy |
| ROLE 21 | Human Quality Reviewer | Review the page as a real user before Gold deploy |
| ROLE 22 | Conversion Copywriter | Improve CTA copy, offer framing, and benefit language |
| ROLE 23 | Financial / Crypto Domain Reviewer | Review crypto terminology, fee language, and product accuracy |
| ROLE 24 | Localization / GEO Relevance Lead | Ensure screenshots, currency, and language match the target GEO |
| ROLE 25 | Freshness / Update Editor | Ensure all claims have visible dates; flag stale content |
| ROLE 26 | Internal Linking Strategist | Design and audit the internal link graph between all page types |
| ROLE 27 | Content Differentiation Strategist | Ensure pages are not generic templates; create unique editorial value |
| ROLE 28 | Methodology / Trust Page Editor | Maintain methodology, evidence policy, and trust disclosures |
| ROLE 29 | Performance / Core Web Vitals Reviewer | Protect speed and image weight as screenshots grow |
| ROLE 30 | Legal / Terms Watcher | Monitor exchange terms and affiliate program rules |
| ROLE 31 *(optional)* | Table / Data Presentation Specialist | Make tables and fact cards scannable and snippet-ready on all devices |
| ROLE 32 *(optional)* | Mobile-First Readability Specialist | Ensure every Gold Page section works correctly at 375px viewport |
| ROLE 33 *(optional)* | Screenshot Ethics / Privacy Reviewer | Hard-veto any screenshot containing private or sensitive data before `public/` |
| ROLE 34 *(optional)* | Monetization / Affiliate CRO Strategist | Optimise CTA placement and offer explanation without damaging trust |
| ROLE 35 *(optional)* | Final Executive Editor | Final editorial approval gate before ROLE 0 owner visual review |

**Total roles: 36 (ROLE 0 through ROLE 35)**  
**Core Production Team: ROLES 0–13 (14 roles)**  
**Gold Page Specialist Squad: ROLES 14–35 (22 roles; ROLES 31–35 are optional)**

---

## 9. Governance Reference Map

| Document | Owned by role | Purpose |
|----------|--------------|---------|
| `CBW_PROJECT_OWNER_AND_TEAM_STRUCTURE.md` (this doc) | ROLE 0 | Top-level structure; supersedes all role conflicts |
| `GOLD_PAGE_WAR_ROOM_AND_WEEKLY_TRAINING.md` | ROLE 0 | Gold Page Specialist Squad (ROLES 14–35); weekly training protocol; 16-step Gold Page check chain |
| `CHIEF_SEO_ARCHITECT_ROLE.md` | ROLE 1 | Page architecture definition + Stage 0 brief template |
| `MASTER_SEO_SCREENSHOT_PAGE_FACTORY.md` | ROLE 1 + 0 | Full page production pipeline; Roles 1–6 definitions |
| `SEO_INTELLIGENCE_AND_AI_SEARCH_OPS.md` | ROLE 2 | SERP data systems; AI answer monitoring; GSC/Yandex |
| `CONTINUOUS_SEO_IMPROVEMENT_LOOP.md` | ROLE 2 + 12 | Recurring SEO improvement cadence |
| `FULL_SITE_SEO_AUDIT_SCORECARD.md` | ROLE 12 | Site-wide SEO score system |
| `KYC_ACCESS_CLAIMS_POLICY.md` | ROLE 11 | KYC claim evidence requirements |
| `KYC_ACCESS_AUDITOR_ROLE.md` | ROLE 4 + 11 | KYC auditor operational guide |
| `SCREENSHOT_STANDARD.md` | ROLE 5 | Screenshot naming, slots, quality rules (Sects. 12–13 added Sprint 05) |
| `AUTHENTICATED_SCREENSHOT_CAPTURE.md` | ROLE 5 | Authenticated capture protocol |
| `SCREENSHOT_COVERAGE_MATRIX.md` | ROLE 5 + 13 | Coverage targets per exchange |
| `GOLD_STANDARD_EXCHANGE_TEMPLATE.md` | ROLE 1 + 3 | Reference spec for Gold Standard pages |
| `BINANCE_GOLD_ARTICLE_PIPELINE.md` | ROLE 0 + 1 | Binance-specific full pipeline definition |
| `BONUS_LANDING_VERIFICATION_ARCHITECTURE.md` | ROLE 4 + 5 | Bonus landing page verification system |

---

## 10. Anti-Patterns This Structure Prevents

| Anti-pattern | Root cause | Prevention |
|---|---|---|
| Binance walkthrough showing 100 USD offer | Screenshot captured without CBW link; registered without inspection | Screenshot Director classification gate; evidence `status: "available"` requires inspection |
| $1,000 fee rebate screenshot in gallery | Wrong product screenshot placed in gallery as bonus proof | Screenshot Director REJECTED classification; gallery filters on `status: "available"` only |
| Bonus amount changed live without evidence | Ad-hoc edit bypassing Evidence Auditor | Chief Project Owner approval gate; Evidence Auditor mandatory before content draft |
| MEXC affiliate link changed | Ad-hoc edit | IMMUTABLE rule enforced by UX Lead and DevOps checks; Chief Project Owner only can override |
| Security screenshot with account closure section | Authenticated capture containing sensitive UI published without review | Authenticated screenshot gate: `reports/` first → Chief Project Owner visual review → `public/` |
| Schema HowTo step with rejected screenshot URL | Schema written before screenshot classification | Schema Lead blocks any REJECTED path from `HowTo` image fields |
| `bonus_center` 404 error page registered as available | Error not inspected; file size not checked | Screenshot Director file size check (< 15KB = suspected error); visual inspection required |
| KYC not required claimed for Binance | Low-confidence claim asserted as fact | Evidence Auditor gate: `confidenceScore ≥ 0.70` required; Compliance Lead confirms |
| Deploy without live verification | QA run only on local build | QA Manager: live verification is a mandatory gate; HTTP + HTML checks on production URL |
| Sprint backlog lost | Tasks tracked only in conversation memory | Content Operations Manager owns lifecycle registry; tasks persist in sprint backlog docs |

---

*Document version 1.2 — 2026-06-06 — Sprint 05: Extended to ROLES 14–35; added Section 11 Gold Page Check Chain reference*  
*Document version 1.1 — 2026-06-06 — Sprint 05: Added ROLES 14–30 Gold Page Specialist Squad*  
*Document version 1.0 — 2026-06-05 — CryptoBonusWorld Sprint 04*  
*Owner: Chief Project Owner (ROLE 0)*
*Next review: Sprint 05 kickoff or when a new exchange enters Gold Standard pipeline*
