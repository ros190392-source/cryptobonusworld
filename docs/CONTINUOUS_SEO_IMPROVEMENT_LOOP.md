# CBW Continuous SEO Improvement Loop

**Project:** CryptoBonusWorld  
**Version:** 1.0  
**Created:** 2026-06-05  
**Status:** ACTIVE — permanent operating loop for site-wide SEO quality

---

## 1. Purpose

This is not a one-time audit. This is the permanent, always-on improvement loop that keeps CryptoBonusWorld content the strongest in the crypto exchange bonus niche.

Every week, the loop runs. Every month, it deepens. Every sprint, it produces concrete improvements: better pages, fresher evidence, stronger screenshots, cleaner schema, sharper internal linking, and higher AI answer readiness.

The goal is simple: **every important page on CryptoBonusWorld should be the best available answer on the internet for its target query** — across Google, Yandex, Bing, and AI answer engines.

This document defines the recurring process. It sits above the Page Factory (which handles individual page production) and the SEO Intelligence system (which handles weekly monitoring). This loop connects them into a continuous improvement engine.

**What makes this different from a one-time audit:**
- It never ends
- It treats every page as a living document that needs regular care
- It catches SEO algorithm changes before they cause ranking drops
- It proactively improves pages before competitors do
- It maintains evidence accuracy so schema and claims never go stale
- It ensures screenshots are always current and trustworthy
- It keeps AI answer readiness at maximum so AI Overviews and answer engines cite CBW

---

## 2. Weekly Monitoring Inputs

Every Monday, scan all active signals. Record findings in `reports/weekly-seo-intelligence-{YYYY-MM-DD}.md`.

**Additional input (Sprint 05+):** The **Gold Page Specialist Squad Weekly Update**
(`reports/weekly-specialist-update-{YYYY-MM-DD}.md`) feeds into this loop every Tuesday.
Specialist notes from ROLES 14–36 are reviewed by the Chief Project Owner and Chief SEO
Architect, then converted into concrete sprint tasks. See
`docs/GOLD_PAGE_WAR_ROOM_AND_WEEKLY_TRAINING.md` for the full specialist protocol.

**Additional input (Sprint 05+):** The **Exchange Availability Watcher Daily Report**
(`reports/exchange-availability-watch-{YYYY-MM-DD}.md`) feeds into this loop whenever a
`review_required` or `change_detected` event is reported. ROLE 36 monitors official exchange
restricted-country and service availability pages daily and alerts the project owner when
changes are detected. Detected changes may require content updates on exchange pages, FAQ
blocks, and future country pages. No page update is applied without ROLE 0 approval.
See `docs/EXCHANGE_AVAILABILITY_AND_RESTRICTED_COUNTRIES_WATCHER.md` for the full system.

### Search Engine Signals

| Source | Signal to capture | Owner action needed? |
|--------|------------------|---------------------|
| Google Search Central Blog | New algorithm updates, schema changes, spam policy, helpful content guidance | No — AI scans |
| Google Search Status Dashboard | Active ranking incidents | No — AI scans |
| Google Search Console | Manual actions, coverage issues, Core Web Vitals, schema errors | **Yes — owner checks** |
| Google Structured Data docs | Requirement changes for Product, ReviewPage, FAQPage, HowTo | No — AI scans |
| Google AI Overviews | Whether CBW is cited; what format is favoured; competitors cited | No — AI checks SERPs |
| Yandex Webmaster | Crawl errors, indexing problems, manual messages, favicon status | **Yes — owner checks** |
| Yandex Metrika (counter 109562447) | Bounce rate spikes, session changes, zero-click patterns | **Yes — owner checks** |
| Bing Webmaster Tools | Crawl errors, index coverage, manual actions | No — AI checks |
| IndexNow submission log (`logs/indexnow-submissions.jsonl`) | Failed submissions, rejected URLs | No — auto-logged on deploy |

### AI Search Signals

| Source | Signal to capture |
|--------|------------------|
| Google AI Overviews | Citation patterns for `crypto exchange bonus`, `Binance bonus 2026`, `Bybit review` |
| ChatGPT Search | Citation frequency, content format preferences for crypto exchange queries |
| Perplexity AI | Which domains are cited for bonus/exchange queries; fact extraction format |
| Bing Copilot | AI-generated answers for tracked queries; source attribution |
| GEO research | New findings on what makes pages citeable by generative AI |

### Competitor Signals

| Query cluster | What to check |
|--------------|--------------|
| `[exchange] bonus 2026` | CBW position vs competitors; featured snippet holder |
| `best crypto exchange bonus` | SERP features; which comparison format dominates |
| `crypto exchange no KYC` | Position; whether KYC policy pages surface |
| `[exchange] fees 2026` | Fee snippet format; table vs paragraph |
| `[exchange] review 2026` | Review snippet holders; AggregateRating display |

### Internal Production Signals

| Source | Signal |
|--------|--------|
| Production Monitor workflow | CI failures, schema errors, broken builds |
| `npm run audit:screenshots` | P1 errors (new orphans, broken paths) |
| `npm run validate:evidence` | Evidence validation failures |
| `npm run audit:production` | Content quality regressions |
| Evidence JSON `lastChecked` dates | Facts approaching 90-day staleness threshold |

---

## 3. Weekly Page Monitoring

Every week, the following pages are actively checked — not just built and deployed, but evaluated for quality and improvement opportunity.

### Tier 1 — Always Check (Every Week)

| Page | What to check |
|------|--------------|
| Homepage (`/`) | Exchange order; QuickPicks; BonusTable; CTA coverage; mobile layout |
| `/exchanges/binance/` | Gallery count; placeholder check; verdict block; schema; evidence freshness |
| `/exchanges/bybit/` | Gallery; walkthrough; bonus confidence; offers schema status |
| `/exchanges/okx/` | Gallery; evidence health; schema |
| `/exchanges/mexc/` | Evidence confidence; screenshot coverage; schema |
| `/bonuses/binance-bonus/` | Bonus amount accuracy; claim steps current; CTA works |
| `/bonuses/bybit-bonus/` | Same as above |

### Tier 2 — Check Every 2 Weeks

| Pages | Focus |
|-------|-------|
| Bitget, BingX | Screenshot coverage; evidence freshness |
| Gate.io, KuCoin | Evidence confidence; internal links |
| `/bonuses/okx-bonus/`, `/bonuses/mexc-bonus/` | Bonus accuracy; promo code current |

### Tier 3 — Check Monthly

| Pages | Focus |
|-------|-------|
| HTX, CoinEx, Phemex, Bitunix, LBank, Coinbase | Evidence health; minimum screenshots; schema |
| All comparison pages | Accuracy; internal links; table format |
| All country pages | Exchange availability accuracy |
| All guide pages | Steps still accurate; screenshots current |

### Weekly Page Health Flags

Flag any page that meets one or more conditions:

| Flag | Condition | Action |
|------|-----------|--------|
| 🔴 EVIDENCE STALE | `bonus_amount.lastChecked` > 90 days OR `conflictStatus = outdated` | Evidence refresh task |
| 🔴 SCHEMA SUPPRESSED | `offers` suppressed due to low confidence when page is Tier 1 | Owner bonus verification task |
| 🟠 SCREENSHOT MISSING | Tier 1 exchange has < 4 `available` screenshots | Screenshot capture task |
| 🟠 PLACEHOLDER RENDERS | Any `needs_manual_capture` slot rendering visibly | Fix status in evidence |
| 🟠 KYC CLAIM UNSAFE | `kyc_required: false` claim with confidence < 0.70 | Remove claim or gate it |
| 🟡 WEAK FAQ | FAQ < 8 items | Content expansion task |
| 🟡 NO VERDICT BLOCK | Top 8 exchange missing `verdict` in content-overrides | Editorial task |
| 🟡 INTERNAL LINK GAP | Exchange page missing bonus page link or compare links | Linking task |
| 🟡 AI ANSWER WEAK | No direct answer in first 200 words | Content rewrite task |

---

## 4. Page Improvement Types

Every improvement is categorised. This controls what kind of review it requires before going live.

### A. Content Improvements

| Type | Description | Owner approval needed? |
|------|-------------|----------------------|
| Content expansion | Add missing sections (verdict, experience grid, bonus tiers, P2P section) | No |
| Quick answer blocks | Add direct answer paragraph to first 200 words | No |
| FAQ improvements | Add, rewrite, or reorder FAQ items | No |
| Long description rewrite | Improve quality, add specifics, remove padding | No |
| Editor note update | Update editorial opinion | No |
| Comparison block | Add side-by-side exchange comparison table | No |
| Title / meta improvements | Improve CTR; update year; sharpen keyword | No |

### B. Evidence Improvements

| Type | Description | Owner approval needed? |
|------|-------------|----------------------|
| Evidence refresh | Re-verify facts from official sources; update `lastChecked` | No (AI can update from official sources) |
| Bonus amount verification | Confirm current bonus maximum from exchange promo page | **Yes — owner visits URL** |
| KYC claim update | Change `kyc_required` value; update `conflictStatus` | **Yes if claim changes** |
| Confidence score increase | Only when source is verified | No (with source) |
| `manualReviewRequired` resolution | Clear flag after owner confirms | **Yes** |

### C. Screenshot Improvements

| Type | Description | Owner approval needed? |
|------|-------------|----------------------|
| Screenshot recapture | Recapture outdated or error-state slot | No (capture and register) |
| Gallery curation | Change `status` to `outdated` / reorder JSON keys | No |
| New slot capture | Capture a slot not yet in evidence | No |
| Mobile screenshot | Capture `mobile_app` slot | No |
| Walkthrough screenshot | Authenticated flow — must not show private data | **Requires manual review** |

### D. Visual Improvements

| Type | Description | Owner approval needed? |
|------|-------------|----------------------|
| OG image generation | Create or refresh `public/og/exchange-{slug}.png` | **Yes — visual approval** |
| Hero visual concept | Visual direction for exchange hero | **Yes — visual approval** |
| Screenshot caption improvement | Clean up user-facing notes | No |

### E. Technical SEO Improvements

| Type | Description | Owner approval needed? |
|------|-------------|----------------------|
| Schema fix | Fix broken schema field; add missing type | No |
| Canonical correction | Fix wrong canonical | No |
| Sitemap update | Add missing URLs; fix priorities | No |
| robots.txt update | Add/remove rules | **Yes** |
| Internal link additions | Add missing links to existing pages | No |
| CTA URL fix | Fix broken affiliate links | **Yes — immutable links** |
| Title / meta update | Improve for CTR | No |

### F. Mobile / UX Improvements

| Type | Description | Owner approval needed? |
|------|-------------|----------------------|
| Sticky card fix | Fix broken sticky sidebar behaviour | No |
| Mobile CTA fix | Fix mobile layout issues | No |
| Gallery layout | Adjust grid for mobile | No |

---

## 5. Weekly Task Queue

Every Tuesday (site audit day), produce the weekly task queue. Save to `reports/weekly-page-improvement-queue-{YYYY-MM-DD}.md`.

### Queue Structure

**Top 10 SEO Opportunities** (ranked by traffic × conversion impact):
```
1. {task} — {page} — {expected impact} — {effort estimate}
2. ...
```

**Top 10 Risks** (ranked by urgency):
```
1. {risk} — {page} — {severity} — {deadline}
2. ...
```

**Top 5 Pages to Improve This Week:**
```
1. {page} — {current score} → {target score} — {key action}
2. ...
```

**Top 5 Screenshot / Visual Tasks:**
```
1. {exchange} — {slot} — {reason} — {effort}
2. ...
```

**Top 5 Evidence Verification Tasks:**
```
1. {exchange} — {field} — {current confidence} — {action}
2. ...
```

**Top 5 Schema / Technical Tasks:**
```
1. {page} — {issue} — {fix} — {priority}
2. ...
```

**Owner Decisions Needed:**
```
1. {decision} — {context} — {by when}
2. ...
```

**Claude Code Prompt Queue** (ready-to-execute tasks):
```
TASK-ID: {id}
DESC: {one-line description}
FILES: {affected files}
SCOPE: {what to do}
```

---

## 6. Implementation Rules

No improvement goes live without passing all of these gates:

### Before Starting Work

- [ ] Page Brief defined (keyword, intent, primary CTA, evidence/screenshot needs)
- [ ] Evidence safety confirmed (no unsupported claims to be added)
- [ ] KYC claim safety checked (per `docs/KYC_ACCESS_CLAIMS_POLICY.md`)
- [ ] Screenshot plan reviewed (no private/authenticated data)
- [ ] Owner approval confirmed for any items flagged above

### Before Staging for Deploy

- [ ] `npm run validate:evidence` — no errors
- [ ] `npm run evidence:governance` — no violations
- [ ] `npm run audit:screenshots` — P1 errors: 0
- [ ] `npm run schema:check` — CI errors: 0
- [ ] `npm run build` — 207 pages (or current page count), 0 errors
- [ ] `npm run audit:production` — no critical failures
- [ ] Built HTML spot-checked: no placeholders, no dev notes in captions
- [ ] No affiliate links modified
- [ ] `git diff --cached --name-only` — only intended files staged

### After Deploy

- [ ] All 6 core URLs return 200
- [ ] Affected pages render correctly
- [ ] No new placeholders visible
- [ ] IndexNow returns `{"success":true}`
- [ ] Yandex and Bing IndexNow accepted

### Compliance Hard Rules

These can never be bypassed at any stage:

| Rule | Detail |
|------|--------|
| MEXC affiliate link is IMMUTABLE | Never change `affiliateUrl` for MEXC under any circumstances |
| Bybit affiliate link is IMMUTABLE | Never change `affiliateUrl` for Bybit under any circumstances |
| KYC false claim gate | `kycRequired: false` only publishable when confidence ≥ 0.70 + conflictStatus ok |
| Offers schema gate | `offers` only emitted when `bonus_amount.confidenceScore ≥ 0.5` + `conflictStatus: ok` |
| No error-state screenshots | Any screenshot < 20KB or containing error text → `needs_manual_capture`, not displayed |
| No reports/ commits | `reports/` is gitignored — never stage or commit audit outputs |
| No browser-profiles/ commits | `.browser-profiles/` contains auth state — never commit |

---

## 7. Monthly Deep Audit

On the first Monday of each month, run the full-site deep audit using `docs/FULL_SITE_SEO_AUDIT_SCORECARD.md`.

### Monthly Audit Checklist

```bash
# Run complete QA suite
npm run build
npm run schema:check
npm run validate:evidence
npm run evidence:governance
npm run audit:screenshots
npm run audit:production

# Check placeholders site-wide
grep -r "Screenshot in preparation" dist/exchanges/ | wc -l  # must be 0
grep -r "Screenshot in preparation" dist/bonuses/ | wc -l   # must be 0

# Check OG images
ls public/og/exchange-*.png | wc -l  # expected: 14

# Check evidence freshness (bonus_amount lastChecked > 90 days)
node -e "
const ev = require('./src/data/evidence/index.ts');
// Check each exchange for stale bonus facts
"
```

### Monthly Score Review

For each of the 14 exchange pages, record:

| Metric | This month | Last month | Delta |
|--------|-----------|------------|-------|
| Page quality score | {n} | {n} | {+/-} |
| Tier | {Gold/Strong/etc.} | {tier} | |
| bonus_amount confidence | {n} | {n} | |
| Screenshots available | {n} | {n} | |
| offers schema active | Y/N | Y/N | |

### Monthly Priorities Decision

After scoring, classify all 14 exchange pages:

- **Gold (90+):** Monitor only. No action needed this month.
- **Close to Gold (85–89):** Identify the 1–2 improvements needed to cross 90. Schedule for the month.
- **Strong (75–84):** Schedule 2–3 improvements. Push toward 85+.
- **Acceptable (70–74):** Schedule at least one major improvement this month.
- **Needs improvement (60–69):** Block as urgent. Immediate improvement sprint required.
- **Urgent rebuild (< 60):** Rebuild before next deploy.

### Monthly Report Output

Save to `reports/monthly-seo-audit-{YYYY-MM}.md`:
- Site average score
- Gold page count
- Exchange ranking table with scores
- Screenshot coverage matrix (filled)
- Evidence health matrix (filled)
- Month-over-month delta
- Top 5 priorities for next month
- Owner decisions needed this month

---

## 8. AI Answer Optimization

Every page improvement cycle must include an AI answer readiness pass. This ensures pages are cited by Google AI Overviews, ChatGPT Search, Perplexity, and other generative engines.

### The AI Answer Readiness Framework

**Level 1 — Basic (required for all pages):**
- [ ] Direct answer in first 200 words: states the primary fact the page is about
- [ ] Exchange name is the first or second word in `h1`
- [ ] Page has a clear, unambiguous topic
- [ ] All claims have at least a year reference (`in 2026`, `as of June 2026`)

**Level 2 — Structured (required for Tier 1 exchange pages):**
- [ ] Structured fact table present (ex-fact-box or equivalent)
- [ ] FAQ with ≥ 8 items and 1–3 sentence answers
- [ ] Bonus conditions listed as a scannable grid (not buried in prose)
- [ ] Fees stated as explicit numbers (not "competitive fees")
- [ ] KYC requirement explicitly stated with verification level

**Level 3 — Gold-standard (required for Gold-tier pages):**
- [ ] Comparison table with competitor data (at least 3 alternatives)
- [ ] Step-by-step how-to structure for the primary user action
- [ ] Dated evidence: `Last checked: {date}` on bonus amount
- [ ] Source links visible (`View official terms ↗`)
- [ ] Entity disambiguation: exchange name, operator, licence holder, headquarters all explicit
- [ ] Author with real name, title, and profile URL (E-E-A-T signal for AI citation)

### AI Citation Blockers (Things That Prevent Citation)

| Blocker | Fix |
|---------|-----|
| Vague bonus claim: "up to big bonuses" | Replace with specific: "Up to 19,800 USDT (as of June 2026)" |
| Undated fact: "spot fee is 0.10%" | Add date: "Spot fee: 0.10% maker/taker (last verified June 2026)" |
| No reviewer attribution | Add ReviewerBlock with real name + profile |
| No methodology link | Ensure `/methodology/` is linked from trust block |
| Schema mismatch: page says X, schema says Y | Align schema with visible content exactly |
| Contradictory claims on same page | Resolve before deploy — AI will detect and avoid citing |
| Thin intro paragraph | Rewrite to include direct answer + key entity + primary fact |

### AI Answer Improvement Workflow

1. Open built page HTML
2. Extract first 300 words
3. Ask: "Does this directly answer `{primary query}`?"
4. If no → rewrite intro to include direct answer
5. Check fact table presence → if missing, add or confirm rendering
6. Check FAQ → ensure 8+ items with specific, dated answers
7. Check reviewer block → real name, not placeholder
8. Verify `og:updated_time` reflects recent verification
9. Run page score → confirm AI Answer Readiness dimension improved

---

## 9. Visual + Screenshot Integration

Every page improvement cycle must also evaluate visual quality. The Screenshot Director role (per `docs/MASTER_SEO_SCREENSHOT_PAGE_FACTORY.md`) is consulted on every page touched.

### Visual Checklist Per Page

For every page being improved, answer these questions:

| Question | If NO → action |
|----------|---------------|
| Does this page have an OG image? | Generate `public/og/exchange-{slug}.png` |
| Does the OG image look current and professional? | Regenerate or update |
| Does this page have ≥ 4 curated screenshots (Tier 1) or ≥ 2 (Tier 2)? | Plan screenshot capture sprint |
| Are all gallery screenshots free of error states? | Mark bad ones `needs_manual_capture`, recapture |
| Are screenshots placed near the claims they support? | Review section placement in `[slug].astro` |
| Is the gallery showing in a logical, curated order? | Reorder evidence JSON keys |
| Does the `mobile_app` screenshot look real (> 20KB)? | Recapture if suspicious |
| Are any walkthrough steps missing screenshots where steps are complex? | Plan walkthrough screenshot sprint |
| Are captions user-facing (not developer notes)? | Update `notes` field in evidence JSON |

### Screenshot Priority by Exchange Tier

| Tier | Exchange | Target screenshots | Priority slots |
|------|----------|------------------|---------------|
| Gold | Binance | 6 | registration, bonus_referral_landing, fees, proof_of_reserves, p2p, spot |
| Gold | Bybit | 6 | registration, kyc*, fees, p2p, spot, futures |
| Strong | OKX | 4–6 | registration, bonus, fees, spot |
| Strong | MEXC | 4–6 | registration, bonus_referral_landing, fees, p2p |
| Strong | Bitget | 4 | registration, bonus, fees, spot |
| Standard | BingX, Gate.io, KuCoin, HTX | 2–4 | registration, bonus, fees |
| Basic | All others | 2 | registration, bonus or fees |

*KYC screenshots require authenticated capture and private data masking — manual only.

### Visual Standards Reference

- All new screenshots: WebP, `{scope}-{device}-{YYYY-MM}.webp`, `public/screenshots/{exchange}/{slot}/`
- Desktop: 1280×720 minimum, < 200KB
- Mobile: 390×844 minimum, < 150KB
- Suspicious file (< 20KB desktop, < 15KB mobile): reject, mark `needs_manual_capture`
- No `jpg` for new captures — convert all to WebP before registering
- Captions: user-facing short phrase (max 80 chars), not developer notes

---

## 10. Owner Review

The owner must review and approve changes in these categories before they go live.

### Always Requires Owner Approval

| Change type | Why | How to request |
|------------|-----|----------------|
| Bonus amount change | Evidence claim — owner must verify on official page | T01/T02/etc. verification tasks |
| KYC claim change (`kycRequired: false`) | Safety — must be confirmed from official policy | Manual check + evidence update |
| Affiliate link change | MEXC and Bybit links are IMMUTABLE; others require approval | Explicit instruction required |
| Homepage exchange order change | Business decision | Explicit instruction required |
| Exchange removed from site | Business decision | Explicit instruction required |
| Visual style / design changes | Brand consistency | Explicit approval |
| OG image design changes | Brand | Design review |
| New exchange addition | Business decision | Explicit instruction required |

### Never Requires Owner Approval (Can Deploy Directly)

| Change type | Condition |
|------------|-----------|
| Screenshot gallery curation | Status changes only — not new affiliate links |
| FAQ content updates | Must match evidence facts |
| Evidence `lastChecked` updates | From official sources only; no confidence increases without source |
| Internal link additions | Not changing affiliate links |
| Schema fixes | Must not add `offers` where not evidence-safe |
| Content improvements | Must not add unsupported bonus/KYC claims |
| Documentation updates | Docs only — no production code |

### Owner Communication Format

When owner approval is needed, queue it clearly:

```
OWNER ACTION REQUIRED
Task: {T01-BYBIT-BONUS-OWNER-VERIFY}
What: Visit https://www.bybit.com/en/promo/global/welcome-gifts/?affiliate_id=75062
Confirm: Is the 30,000 USDT bonus still the current offer?
If yes: Update bybit.json bonus_amount confidence 0.27 → 0.85
Impact: Bybit becomes 5th publish-safe exchange; offers schema activates
Urgency: P1 — affects schema quality and AI answer confidence
```

---

## 11. Weekly Deliverables

Every completed weekly cycle should produce these outputs (all gitignored in `reports/`):

| File | Created | Content |
|------|---------|---------|
| `reports/weekly-seo-intelligence-{date}.md` | Monday | Algorithm updates, SERP findings, AI search observations, competitor changes |
| `reports/weekly-page-improvement-queue-{date}.md` | Tuesday | Top 10 opportunities, top 10 risks, 5 pages to improve, task queue |
| `reports/seo-actions-completed-{date}.md` | Friday (post-deploy) | What was implemented, before/after scores, deploy verification |

### Weekly Deliverable Template (seo-actions-completed)

```markdown
# SEO Actions Completed — {YYYY-MM-DD}

## Pages Updated
- {page}: {change made} → score {before} → {after}

## Screenshots Updated
- {exchange}/{slot}: {old status} → {new status}

## Evidence Updated
- {exchange}/{field}: confidence {old} → {new}

## Schema Changes
- {change}: schema:check result before/after

## Deploy Result
- Build: {207 pages, 0 errors}
- Deploy: {success / time}
- IndexNow: {Bing: 200, Yandex: 202}
- Live check: {all 6 URLs 200}

## Score Changes
- {exchange}: {old score} → {new score} ({tier change if any})

## Next Week Priorities
1. {task}
2. {task}
```

---

## 12. Success Metrics

Track these metrics weekly (where automated) and monthly (full review):

### Quality Metrics

| Metric | Current baseline | Target | How to measure |
|--------|-----------------|--------|----------------|
| Site average page score | ~65 | 80 by Sprint 08 | Monthly audit scorecard |
| Gold tier pages (90+) | 0 | 2 (Binance, Bybit) by Sprint 05 | Monthly scorecard |
| Strong tier pages (80+) | 1 (Binance 87) | 5 by Sprint 06 | Monthly scorecard |
| Pages below 60 (urgent) | ~8 | 0 by Sprint 08 | Monthly scorecard |

### Evidence Metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Publish-safe exchanges (offers schema live) | 2 (Binance, OKX) | 6 by Sprint 06 | Schema check output |
| Bonus_amount confidence ≥ 0.5 count | 2 | 8 | Evidence audit |
| Stale facts (lastChecked > 90 days) | ~80% | < 20% | Weekly scan |
| Open `manualReviewRequired` flags | ~5 | 0 | Evidence governance |

### Screenshot Metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Available screenshots (site total) | 20 | 50+ by Sprint 06 | audit:screenshots |
| Exchanges with ≥ 4 screenshots | 1 (Binance) | 5 by Sprint 05 | audit:screenshots |
| Error-state screenshots displayed | 0 | Always 0 | Weekly HTML check |
| Placeholder renders | 0 | Always 0 | Weekly HTML check |

### Technical Metrics

| Metric | Current | Target | Measured by |
|--------|---------|--------|-------------|
| Schema:check CI errors | 0 | Always 0 | schema:check |
| Build errors | 0 | Always 0 | build |
| Audit:screenshots P1 errors | 0 | Always 0 | audit:screenshots |
| IndexNow URLs submitted per deploy | 42 | 42+ | deploy log |

### Search Metrics (owner monitors in GSC/Yandex)

| Metric | Baseline | Monitor |
|--------|---------|---------|
| GSC indexed pages | {n} | Weekly in GSC |
| Yandex indexed pages | {n} | Weekly in Yandex Webmaster |
| GSC impressions for tracked keywords | {n} | Weekly |
| AI Overview citations | 0 | Weekly SERP check |
| Organic clicks (if available) | {n} | Monthly GSC export |

---

## 13. Integration

This loop does not replace the existing systems — it orchestrates them.

```
CONTINUOUS SEO IMPROVEMENT LOOP (this doc)
            │
            ├─ Monday: pulls from SEO_INTELLIGENCE_AND_AI_SEARCH_OPS.md
            │          (monitoring sources, SERP checks, competitor analysis)
            │
            ├─ Tuesday: runs FULL_SITE_SEO_AUDIT_SCORECARD.md checks
            │           (per-page scores, evidence health, screenshot coverage)
            │
            ├─ Wednesday/Thursday: executes through MASTER_SEO_SCREENSHOT_PAGE_FACTORY.md
            │                      (9-stage production pipeline per page)
            │                      applying SCREENSHOT_STANDARD.md
            │                      applying KYC_ACCESS_CLAIMS_POLICY.md
            │
            ├─ Friday: deploy via scripts/deploy.mjs
            │          IndexNow auto-submitted (42 URLs)
            │          Production Monitor workflow runs on push
            │
            └─ Monthly: deep audit using FULL_SITE_SEO_AUDIT_SCORECARD.md
                        score all 14 exchanges
                        plan next month's priorities
```

### Integration Points Detail

| System | How the loop uses it |
|--------|---------------------|
| `MASTER_SEO_SCREENSHOT_PAGE_FACTORY.md` | Wednesday/Thursday execution: all page improvements follow the 9-stage pipeline |
| `SEO_INTELLIGENCE_AND_AI_SEARCH_OPS.md` | Monday scan: uses all 5 monitoring source groups defined there |
| `WEEKLY_SEO_INTELLIGENCE_REPORT_TEMPLATE.md` | Monday output: copy, fill, save to `reports/weekly-seo-intelligence-{date}.md` |
| `FULL_SITE_SEO_AUDIT_SCORECARD.md` | Tuesday + monthly: fill the scorecard tables, track delta over time |
| `SCREENSHOT_STANDARD.md` | Any screenshot work: slot names, statuses, path format, error-state rules |
| `KYC_ACCESS_CLAIMS_POLICY.md` | Any evidence/content work touching KYC: confidence thresholds, publish safety |
| `src/data/evidence/{exchange}.json` | Every evidence update, screenshot registration, confidence change |
| `scripts/deploy.mjs` | Friday deploy: SSH to `root@23.88.106.140`, extracts to `/var/www/cryptobonusworld/html/`, runs IndexNow |
| `logs/indexnow-submissions.jsonl` | Monday: check previous week's IndexNow submissions for failures |
| `.github/workflows/production-monitor.yml` | Triggered on push: runs 8 QA checks, alerts on failure |
| `reports/` (gitignored) | All weekly/monthly reports saved here — never committed |

---

## 14. First 4 Weeks Plan

This is the recommended execution order for the first 4 weeks of the loop. Each week builds on the previous.

---

### Week 1 — Binance Gold + Bybit Verification

**Goal:** Push Binance to Gold tier (87 → 90+). Unblock Bybit offers schema.

| Day | Task | Owner | Files |
|-----|------|-------|-------|
| Monday | SEO intelligence scan + Monday SERP checks | AI | `reports/weekly-seo-intelligence-{date}.md` |
| Tuesday | Full QA suite + score Binance + Bybit + identify gaps | AI | — |
| Wednesday | PAGE-FACTORY-BINANCE-GOLD-01: Add verdict block to content-overrides | AI | `src/data/content-overrides.json` |
| Wednesday | PAGE-FACTORY-BINANCE-GOLD-02: Add Binance experience grid | AI | `src/data/content-overrides.json` |
| Wednesday | T01-BYBIT-BONUS-OWNER-VERIFY: Owner visits Bybit promo URL | **Owner** | — |
| Thursday | If Bybit verified: update `bybit.json` bonus_amount confidence 0.27 → 0.85 | AI | `src/data/evidence/bybit.json` |
| Thursday | PAGE-FACTORY-BINANCE-GOLD-03: Recapture Binance `mobile_app` screenshot | AI/Owner | `public/screenshots/binance/mobile_app/` |
| Friday | QA + deploy + live verify + IndexNow | AI | — |

**Week 1 target scores:**
- Binance: 87 → 93 (🥇 Gold)
- Bybit: ~75 → ~80 if bonus verified

---

### Week 2 — Bybit Gold + OKX/MEXC Polish + OG Image Review

**Goal:** Push Bybit to Gold tier. Polish OKX and MEXC to Strong tier.

| Day | Task | Files |
|-----|------|-------|
| Monday | Weekly intelligence scan | `reports/` |
| Tuesday | Audit Bybit, OKX, MEXC pages — gap analysis | — |
| Wednesday | PAGE-FACTORY-BYBIT-GOLD-01: Add Bybit verdict + experience overrides | `src/data/content-overrides.json` |
| Wednesday | PAGE-FACTORY-BYBIT-GOLD-02: Curate Bybit screenshot gallery (review legacy walkthrough status) | `src/data/evidence/bybit.json` |
| Wednesday | PAGE-FACTORY-OKX-STRONG-01: Add OKX verdict block + improve FAQ | `src/data/content-overrides.json` |
| Thursday | PAGE-FACTORY-MEXC-STRONG-01: MEXC evidence refresh + screenshot plan | `src/data/evidence/mexc.json` |
| Thursday | OG image audit: verify all 14 exchange OG PNGs exist and look current | `public/og/` |
| Friday | QA + deploy + live verify | — |

**Week 2 target scores:**
- Bybit: ~80 → ~88 (approaching Gold if bonus verified)
- OKX: ~72 → ~78
- MEXC: ~65 → ~70

---

### Week 3 — Tier 2 Exchange Group: BingX, Gate.io, KuCoin, HTX

**Goal:** Bring BingX, Gate.io, KuCoin, HTX from below 60 to Acceptable tier (70+).

| Day | Task | Files |
|-----|------|-------|
| Monday | Weekly intelligence scan | `reports/` |
| Tuesday | Audit BingX, Gate.io, KuCoin, HTX — score all 4, identify top gaps | — |
| Wednesday | Evidence refresh: update `lastChecked` for all 4 from official sources | `src/data/evidence/{exchange}.json` ×4 |
| Wednesday | Screenshot plan: capture `registration` + `bonus` for each (4×2 = 8 slots) | `public/screenshots/` |
| Thursday | Register all new screenshots in evidence, curate galleries | `src/data/evidence/{exchange}.json` ×4 |
| Thursday | Content: Add FAQ ≥ 8 items for each of the 4 exchanges | `src/data/content-overrides.json` |
| Friday | QA + deploy | — |

**Week 3 target scores:**
- BingX, Gate.io, KuCoin, HTX: ~50–55 → ~70 (🥉 Acceptable)

---

### Week 4 — Tail Exchanges + Comparison Pages + Monthly Score Review

**Goal:** Baseline all remaining exchanges. Launch comparison page improvements. Run first monthly audit.

| Day | Task | Files |
|-----|------|-------|
| Monday | Weekly intelligence scan + begin monthly audit data collection | `reports/` |
| Tuesday | Audit CoinEx, Phemex, Bitunix, LBank, Coinbase | — |
| Wednesday | Evidence + screenshot baseline for all 5 remaining exchanges | `src/data/evidence/{exchange}.json` ×5 |
| Wednesday | Comparison pages: audit top 3 compare pairs; add direct answer + comparison table | `src/pages/compare/` or content-overrides |
| Thursday | Country pages: verify top 5 country pages for accuracy | Country page templates |
| Thursday | Monthly score review: fill FULL_SITE_SEO_AUDIT_SCORECARD for all 14 exchanges | `reports/monthly-seo-audit-{date}.md` |
| Friday | QA + deploy + monthly audit filed | — |

**Week 4 target scores:**
- CoinEx, Phemex, LBank: ~50 → ~65
- Bitunix: ~55 → ~68 (after T08-BITUNIX-CLEANUP completes)
- Coinbase: ~60 → ~68

**Month 1 site average target:** ~65 → ~75

---

### Beyond Week 4 — Ongoing Loop

After the first 4 weeks, the loop continues indefinitely:

- **Month 2:** Focus on getting all 14 exchanges to Strong tier (80+). Launch country page SEO expansion. Add 30+ new screenshots.
- **Month 3:** First 3 exchanges reach Gold. Launch guides expansion (3–5 new how-to guides). Comparison page SEO overhaul.
- **Month 4+:** Maintain Gold pages. Continuous evidence refresh. AI answer readiness audits quarterly.

---

## Appendix: Quick Reference Commands

```bash
# Full weekly QA suite (run every Friday before deploy)
npm run build              && \
npm run schema:check       && \
npm run validate:evidence  && \
npm run evidence:governance && \
npm run audit:screenshots  && \
npm run audit:production   && \
npm run affiliate:audit:strict

# Deploy + IndexNow
npm run deploy

# Post-deploy HTTP check
curl -s -o /dev/null -w "%{http_code}\n" https://cryptobonusworld.com/
curl -s -o /dev/null -w "%{http_code}\n" https://cryptobonusworld.com/favicon.ico
curl -s -o /dev/null -w "%{http_code}\n" https://cryptobonusworld.com/sitemap.xml
curl -s -o /dev/null -w "%{http_code}\n" https://cryptobonusworld.com/exchanges/binance/

# Site-wide placeholder check
grep -r "Screenshot in preparation" dist/exchanges/ | wc -l  # must be 0
grep -r "Screenshot in preparation" dist/bonuses/ | wc -l   # must be 0

# Git: stage specific file + verify
git add src/data/evidence/{exchange}.json
git diff --cached --name-only  # verify only intended file staged

# Git: commits ahead of origin
git rev-list --count origin/master..HEAD
```

---

*Document version 1.2 — 2026-06-06 — Sprint 05: Added Exchange Availability Watcher daily report as input (Section 2); updated ROLES 14–30 reference to 14–36*
*Document version 1.1 — 2026-06-06 — Sprint 05: Added Gold Page Specialist Squad weekly update as input (Section 2)*  
*Document version 1.0 — 2026-06-05 — CryptoBonusWorld Sprint 03*

*Document created: 2026-06-05 | Sprint 03 | CryptoBonusWorld Continuous SEO Improvement Loop v1.0*
