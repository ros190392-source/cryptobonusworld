# CBW SEO Intelligence & AI Search Operations System

**Project:** CryptoBonusWorld  
**Version:** 1.0  
**Created:** 2026-06-05  
**Status:** ACTIVE — weekly operating system for search intelligence and content operations

---

## Purpose

This document defines the weekly operating system for monitoring modern SEO, AI Search (Google AI Overviews, ChatGPT Search, Perplexity, Bing Copilot), Yandex, structured data, search appearance signals, and content quality changes — then translating every relevant signal into concrete, prioritised improvements for CryptoBonusWorld.com.

It extends the `docs/MASTER_SEO_SCREENSHOT_PAGE_FACTORY.md` with a continuous monitoring, auditing, and publishing cadence so that the site's content and technical SEO never stagnate.

---

## Table of Contents

1. [Weekly Monitoring Sources](#1-weekly-monitoring-sources)
2. [Weekly Operating Cycle](#2-weekly-operating-cycle)
3. [Page Quality Model (100 points)](#3-page-quality-model)
4. [AI Answer Readiness Checklist](#4-ai-answer-readiness-checklist)
5. [Content Type SEO Standards](#5-content-type-seo-standards)
6. [Full Site Audit Plan](#6-full-site-audit-plan)
7. [Integration with Page Factory](#7-integration-with-page-factory)
8. [Binance Pilot Plan](#8-binance-pilot-plan)
9. [Governance Reference](#9-governance-reference)

---

## 1. Weekly Monitoring Sources

Every Monday, scan each source group for changes, announcements, algorithm updates, or new SERP features that could affect CryptoBonusWorld.

---

### A. Google

| Source | What to watch for | Priority |
|--------|------------------|----------|
| Google Search Central Blog (`developers.google.com/search/blog`) | Algorithm updates, spam policy changes, new structured data types, crawling changes | P0 |
| Google Search Status Dashboard (`status.search.google.com`) | Active or resolved ranking incidents | P0 |
| Google Search Central Docs changelog | Changes to schema.org requirements, rich result eligibility, robots.txt directives | P1 |
| Google Search Console (owner must check) | Manual actions, security issues, crawl errors, Core Web Vitals, sitemap processing | P0 |
| Google Structured Data Documentation | New supported types, deprecated fields, required vs recommended changes | P1 |
| Google AI Overviews guidance | Which page types are cited, what signals drive citation, content formatting requirements | P1 |
| Google Discover | Image sizing requirements, topic authority signals, content freshness signals | P2 |
| Google Product schema guide | `offers`, `price`, `priceCurrency`, `aggregateRating` requirements for e-commerce-style pages | P1 |
| Google Review snippets guide | `author`, `datePublished`, `reviewRating` requirements for review pages | P1 |
| Google FAQ / HowTo status | Current status (FAQ and HowTo rich results have been restricted since late 2023) | P1 |

**Key Google signals for crypto/finance sites:**
- YMYL (Your Money or Your Life) updates — crypto bonus sites are YMYL by default
- Helpful Content assessment signals (E-E-A-T: Experience, Expertise, Authoritativeness, Trust)
- Product Review Updates — how well exchange reviews meet the "expert review" standard
- Spam updates — thin affiliate content, auto-generated pages
- Link spam updates — affiliate link compliance (`rel="sponsored"` enforcement)

---

### B. Yandex

| Source | What to watch for | Priority |
|--------|------------------|----------|
| Yandex Webmaster messages (owner must check) | Crawl errors, manual penalties, indexing problems, favicon status | P0 |
| Yandex Webmaster IndexNow status | Whether submitted URLs are being accepted and indexed | P1 |
| Yandex Metrika (counter 109562447) | Session signals, bounce rate spikes, zero-click patterns | P1 |
| Yandex search ranking docs | Algorithm changes (Palekh, Korolev, YATI updates) | P2 |
| Yandex structured data documentation | Supported schema.org types for Yandex rich snippets | P2 |
| Yandex crawl budget signals | Crawl frequency, crawl depth, URL exclusions | P2 |

**Key Yandex actions (owner UI — not automated):**
- Submit `https://cryptobonusworld.com/sitemap.xml` in Yandex Webmaster UI (if not done)
- Use page recrawl tool after major deploys
- Monitor "Excluded pages" for unexpected exclusions

---

### C. Bing / Microsoft

| Source | What to watch for | Priority |
|--------|------------------|----------|
| Bing Webmaster Tools | Crawl errors, manual actions, index coverage | P1 |
| IndexNow submissions (already automated in deploy) | Confirm 200 responses; monitor for rejected URLs | P1 |
| Bing search appearance for key terms | Product cards, FAQ snippets, review snippets | P2 |
| Microsoft Copilot / Bing AI search | Which sites Copilot cites for crypto exchange queries; what content format it prefers | P2 |
| Bing Webmaster Blog | Algorithm changes, new features, structured data support | P2 |

---

### D. AI Search / Generative Engine Optimization (GEO)

This is the fastest-changing segment. Monitor weekly.

| Source / Engine | What to watch for | Priority |
|----------------|------------------|----------|
| Google AI Overviews | Which exchange/bonus sites are cited; what format (list, paragraph, table); which claims get extracted | P0 |
| ChatGPT Search (`search.chatgpt.com`) | Citation patterns for "best crypto exchange bonus" type queries; what page format gets cited | P1 |
| Perplexity AI (`perplexity.ai`) | Citation frequency for crypto exchange queries; what fact format gets extracted | P1 |
| Grok (X/Twitter AI) | Social signal integration; what claims it surfaces for Binance/Bybit queries | P2 |
| Claude (`claude.ai`) | What the answer engine says about CBW exchanges; brand perception | P2 |
| GEO research papers / SEO community | New findings on what makes content citeable by generative AI | P1 |

**Key AI citation signals (what makes pages get cited):**
- Direct answers in the first 200 words
- Structured facts (tables, bullet lists with values)
- Explicit data with dates (`Last checked: 2026-06-05`)
- Evidence-backed claims (links to official sources)
- Entity clarity (clear `@type`, `name`, `description` in schema)
- Authoritative domain signals (real reviewer names, publication dates)

---

### E. Competitors / SERP Intelligence

| Monitoring target | What to track | Frequency |
|------------------|--------------|-----------|
| `crypto exchange bonus 2026` | Top 10 SERP positions, featured snippet format, FAQ boxes | Weekly |
| `Binance bonus 2026` | Position of `/exchanges/binance/` and `/bonuses/binance-bonus/`; competitor positions | Weekly |
| `Bybit bonus 2026` | Same as above for Bybit | Weekly |
| `MEXC referral bonus` | SERP positions; whether product snippet shows for competitors | Weekly |
| `best crypto exchange bonus` | SERP features — comparison tables, review snippets, AI Overviews presence | Weekly |
| `no KYC crypto exchange` | Whether KYC-policy pages surface | Monthly |
| Competitor schema | What schema types competitors use; whether they have AggregateRating, offers, reviewRating | Monthly |
| Competitor page structure | Section order, screenshot use, FAQ depth, internal linking patterns | Monthly |

**Top competitors to monitor:**
- Cryptonews.com/best-crypto-bonus-exchanges/
- CoinBureau reviews
- CoinCodex exchange reviews
- NerdWallet crypto reviews (US)
- Finder.com crypto reviews

---

## 2. Weekly Operating Cycle

---

### Monday — SEO Intelligence Scan

**Duration:** 30–60 minutes  
**Output:** Intelligence brief (saved to `reports/weekly-seo-intelligence-{YYYY-MM-DD}.md`)

Checklist:
- [ ] Check Google Search Status Dashboard — any active incidents?
- [ ] Check Google Search Central Blog — any new posts since last Monday?
- [ ] Check Google Search Console (owner) — any manual actions, coverage issues, Core Web Vitals regressions?
- [ ] Check Yandex Webmaster (owner) — any new messages, crawl errors, indexing problems?
- [ ] Check Bing Webmaster Tools — any crawl errors, index coverage issues?
- [ ] Check IndexNow submission log (`logs/indexnow-submissions.jsonl`) — any failed submissions?
- [ ] Run 5 key SERP checks: `Binance bonus 2026`, `Bybit bonus 2026`, `MEXC referral bonus`, `best crypto exchange bonus`, `crypto exchange no KYC`
- [ ] Check if any AI Overview cites CryptoBonusWorld for any query
- [ ] Check if any competitor changed their page structure significantly for a tracked keyword
- [ ] Document any algorithm/schema/AI change that requires a site response

**Output format:** Bullet list — changes found, impact assessment (P0/P1/P2/P3), recommended action.

---

### Tuesday — Site Audit and Prioritization

**Duration:** 45–90 minutes  
**Output:** Prioritized page improvement queue

Steps:
1. Run full QA script set (see §6 for commands)
2. Identify pages with QA issues (build errors, schema failures, audit failures)
3. Run Page Quality Model scores for top 5 exchange pages (see §3)
4. Identify top 3 pages where a content/screenshot/schema improvement would have the most SEO impact
5. Identify any pages with stale evidence (`lastChecked` > 90 days)
6. Identify any pages with `needs_manual_capture` screenshots for high-priority exchanges
7. Check if any pages have `manualReviewRequired: true` facts that are unresolved
8. Check if any pages have 0 screenshots (exchange tier ≥ 2 should have at least 2)
9. Queue tasks in priority order for Wednesday–Thursday execution

**Output format:** Ordered task queue — 3 urgent, 5 important, backlog.

---

### Wednesday — Page Factory Improvements

**Duration:** 2–4 hours  
**Output:** Updated content, evidence, screenshots, schema, internal links

Using the Page Factory pipeline (§4 of `docs/MASTER_SEO_SCREENSHOT_PAGE_FACTORY.md`):

Priority order for improvements:
1. Evidence updates (bonus amounts, fee changes, KYC policy changes)
2. Screenshot recaptures (focus on `needs_manual_capture` slots for Gold exchanges)
3. Content structure improvements (add missing sections, improve FAQ, add verdict blocks)
4. Schema fixes (any `schema:check` failures)
5. Internal linking additions (missing compare links, guide links)
6. AI answer block improvements (direct answer paragraphs, structured fact tables)

---

### Thursday — Content and Visual QA

**Duration:** 1–2 hours  
**Output:** Pages ready for Friday deploy

Steps:
1. Review all changes from Wednesday in built HTML
2. Check every changed page for:
   - No placeholder screenshots
   - No dev notes in captions
   - No broken images
   - No affiliate link modifications
   - Content reads naturally (not AI-bloat)
3. Run AI answer readiness checklist (§4) on any new/updated page
4. Run Page Quality Model score on updated pages — confirm score improved
5. Finalize commit messages and stage files

---

### Friday — QA, Deploy, Verify

**Duration:** 30–60 minutes  
**Output:** Live site updated, IndexNow submitted, verification passed

```bash
# QA
npm run build              # 207 pages, 0 errors
npm run schema:check       # exit 0
npm run validate:evidence  # no errors
npm run evidence:governance
npm run audit:screenshots  # P1 errors: 0
npm run audit:production

# Deploy
npm run deploy             # includes IndexNow submission (42 URLs)

# Live verification
curl -s -o /dev/null -w "%{http_code}" https://cryptobonusworld.com/
curl -s -o /dev/null -w "%{http_code}" https://cryptobonusworld.com/favicon.ico
curl -s -o /dev/null -w "%{http_code}" https://cryptobonusworld.com/sitemap.xml
```

Post-deploy:
- [ ] Verify live homepage exchange order (bybit → binance → okx...)
- [ ] Verify Binance gallery shows 6 screenshots, no placeholders
- [ ] Verify Yandex IndexNow returns `{"success":true}`
- [ ] Save deploy log to `reports/deploy-log-{YYYY-MM-DD}.md`

---

## 3. Page Quality Model

### Score Breakdown (100 points)

| Dimension | Max | Scoring rubric |
|-----------|-----|----------------|
| **Search Intent Fit** | 15 | Primary keyword targeted: +4. Title ≤ 60 chars with keyword: +3. Meta desc ≤ 160 chars, actionable: +2. URL slug matches keyword: +2. Featured snippet structure present: +2. Search intent matches page type: +2. |
| **Content Depth & Originality** | 15 | All required sections present: +5. Original analysis/editorial opinion: +4. No padding or thin filler: +3. Fact density (specific numbers, dates): +3. |
| **Evidence & Trust** | 15 | Primary bonus fact confidence ≥ 0.85: +6. All fee facts from official source: +4. KYC claim correctly gated: +3. No open `manualReviewRequired`: +2. |
| **AI Answer Readiness** | 10 | Direct answer paragraph in first 200 words: +3. Structured fact table present: +3. All claims have dates: +2. Entity clarity (who, what, amount, when): +2. |
| **Snippet / FAQ Readiness** | 10 | FAQ ≥ 8 items with concise answers: +4. How-to steps present (if applicable): +3. Table targeting comparison queries: +3. |
| **Visual / Screenshot Quality** | 10 | ≥ 4 curated screenshots, no errors: +5. Screenshots placed near supporting claims: +3. No placeholder renders: +2. |
| **UX / Conversion** | 10 | CTA above fold: +3. Sticky sidebar functional: +3. Mobile layout correct: +2. No dead ends: +2. |
| **Schema / Technical SEO** | 10 | `schema:check` exits 0: +3. Product schema correct: +2. FAQ schema correct: +2. Canonical correct: +2. OG image exists: +1. |
| **Internal Linking** | 5 | Bonus page linked: +1. 2+ compare links: +1. Alternatives block: +1. Guide/use-case: +1. Coins: +1. |

### Score Tiers

| Score | Tier | SLA |
|-------|------|-----|
| 90–100 | 🥇 **World-class / Gold** | Monitor every 30 days |
| 80–89 | 🥈 **Strong** | Improve within 2 sprints |
| 70–79 | 🥉 **Acceptable** | Improve within 4 sprints |
| 60–69 | ⚠️ **Needs improvement** | Schedule expansion immediately |
| < 60 | 🚨 **Urgent rebuild** | Block deployment, rebuild before next push |

### Current Page Scores (Sprint 03 baseline)

| Page | Score | Tier | Top gap |
|------|-------|------|---------|
| `/exchanges/binance/` | 87 | 🥈 Strong | Verdict block, mobile_app recapture |
| `/exchanges/bybit/` | ~75 | 🥉 Acceptable | Bonus confidence 0.27, many screenshots pending |
| `/exchanges/okx/` | ~72 | 🥉 Acceptable | Screenshots sparse, evidence gaps |
| `/exchanges/mexc/` | ~65 | ⚠️ Needs improvement | Evidence mostly outdated, no screenshots |
| All others | ~50–60 | 🚨 Urgent | No screenshots, outdated evidence |

---

## 4. AI Answer Readiness Checklist

Apply this checklist to every exchange review, bonus page, and comparison page before deploy.

### 4.1 Direct Answer Block

Every page must have a direct answer to its primary question in the first 200 words.

| Page type | Primary question | Direct answer requirement |
|-----------|-----------------|--------------------------|
| Exchange review | "Is [exchange] bonus legit / how much?" | State exact bonus amount, key condition, and CTA in first paragraph |
| Bonus page | "How do I claim the [exchange] bonus?" | State the bonus, the step count, and the most important condition in ≤ 60 words |
| Comparison | "[Exchange A] vs [Exchange B] — which is better?" | State the winner and 1-sentence reason before any table |
| Country page | "Is [exchange] available in [country]?" | State yes/no + one condition in ≤ 40 words |
| KYC page | "Which exchanges need no KYC?" | List top 3 exchanges with condition in first paragraph |
| Fees page | "What are [exchange] fees?" | State spot maker/taker and futures fees in first 100 words as a table or structured paragraph |

### 4.2 Structured Facts

All claims about numbers, rates, amounts, and dates must be explicitly structured:

**Required format:**
```
Bonus amount: Up to 19,800 USDT (as of June 2026)
Minimum deposit: Requires a qualifying deposit (exact minimum varies by region)
KYC required: Yes — Basic Identity Verification (Level 1)
Spot fee (maker/taker): 0.10% / 0.10% (standard rate)
Futures fee (maker/taker): 0.02% / 0.05%
Last checked: 2026-06-04
```

**Why this matters for AI answers:**
- Generative AI extracts structured data patterns
- Explicit `(as of {date})` signals freshness — AI Overviews prefer current data
- Named entities (exchange name, bonus type) help entity resolution

### 4.3 Comparison Table

Every exchange review and bonus page must include at least one structured comparison table:

**Minimum required:** Key conditions table (bonus amount, KYC, deposit, expiry, fees)

**Gold standard:** Competitor comparison table (e.g. "Binance vs Bybit vs OKX — Bonus Comparison")

### 4.4 FAQ Requirements

| Requirement | Standard |
|------------|---------|
| Minimum items | 8 per exchange review / bonus page |
| Answer length | 1–3 sentences for simple facts; 3–6 for process questions |
| Sources | Factual answers must match evidence facts |
| Real questions | Pulled from Google PAA, GSC queries, or real user intent — not invented |
| No keyword stuffing | Questions must be naturally phrased |
| Schema | `FAQPage` JSON-LD must be emitted when FAQ block is present |

### 4.5 Entity Clarity

Every page must clearly state:

```
Exchange name: [Official registered name]
Operator: [Parent company if different]
Founded: [Year]
Headquarters: [Country]
Regulator: [Licence body / "No central regulator"]
Bonus offer: [Official name of the current promotion]
```

This data lives in `exchanges.json` and renders via the key facts table. Ensure the table is present on every exchange page with `founded` + `licences` data populated.

### 4.6 Citation Signals

To be cited by AI Overviews and answer engines, pages must:

- [ ] Have a `dateModified` signal (via `modifiedTime` in Layout → drives og:updated_time)
- [ ] Have a clear `author` (ReviewerBlock with real name and profile URL)
- [ ] Have explicit source links in evidence (`officialSourceUrl` in evidence JSON)
- [ ] Have a methodology page referenced (`/methodology/`)
- [ ] Have the editorial constitution applied (no fabricated claims)
- [ ] Have no contradictions between schema data and visible page content
- [ ] Have the exchange name as the primary entity on the page (first `h1` word)

---

## 5. Content Type SEO Standards

---

### A. Exchange Review Pages (`/exchanges/{slug}/`)

**Target intent:** Transactional research — "Is this exchange worth it? How do I get the bonus?"  
**Primary keyword pattern:** `[Exchange name] bonus [year]`  
**Secondary patterns:** `[Exchange name] review`, `[Exchange name] referral code`, `[Exchange name] fees`

| Requirement | Standard |
|-------------|---------|
| Required sections | See `docs/MASTER_SEO_SCREENSHOT_PAGE_FACTORY.md §4` |
| Minimum screenshots | 4 (curated); Gold exchanges: 6 |
| Hero image | OG image at `/og/exchange-{slug}.png` |
| Evidence | All primary bonus/fee facts verified |
| Schema | Product + ReviewPage + FinancialService + BreadcrumbList + FAQPage |
| AI answer | Direct answer in first 200 words: bonus amount + key condition |
| Featured snippet target | "How to claim [exchange] bonus" — numbered list |
| Internal linking | See §8 of Page Factory doc |

---

### B. Bonus Landing Pages (`/bonuses/{slug}-bonus/`)

**Target intent:** High-intent transactional — "How do I claim this specific bonus right now?"  
**Primary keyword pattern:** `[Exchange name] bonus [year]`, `[Exchange name] referral bonus`  
**Secondary patterns:** `[Exchange name] welcome offer`, `[Exchange name] sign-up reward`

| Requirement | Standard |
|-------------|---------|
| Required sections | See `docs/MASTER_SEO_SCREENSHOT_PAGE_FACTORY.md §5` |
| Screenshots | Registration + bonus_referral_landing (if available) |
| Schema | Product + BreadcrumbList (offers only if bonus confidence ≥ 0.5) |
| AI answer | Bonus amount + CTA + claim steps in first 100 words |
| Featured snippet target | "How to claim [exchange] bonus" — 5-step numbered list |
| Freshness | `lastVerified` must be ≤ 90 days for the bonus_amount fact |

---

### C. Comparison Pages (`/compare/{pair}/`)

**Target intent:** Decisional — "Which one is better for me?"  
**Primary keyword pattern:** `[Exchange A] vs [Exchange B]`  
**Secondary patterns:** `[Exchange A] vs [Exchange B] fees`, `[Exchange A] vs [Exchange B] bonus`

| Requirement | Standard |
|-------------|---------|
| Direct answer | Winner + 1-sentence reason at top |
| Comparison table | Side-by-side: bonus, fees, KYC, countries, products |
| Individual sections | Separate review section for each exchange |
| Screenshots | 1 per exchange (registration or fees preferred) |
| Schema | 2× Product schemas + BreadcrumbList |
| AI answer | Table extractable by generative AI |
| Internal linking | Links to both exchange pages + their bonus pages |

---

### D. Country / GEO Pages (`/countries/{country}/`)

**Target intent:** Navigational + informational — "Which exchanges work in [country]?"  
**Primary keyword pattern:** `crypto exchange [country]`, `crypto bonus [country]`

| Requirement | Standard |
|-------------|---------|
| Direct answer | Available exchanges listed by name in first paragraph |
| Restrictions | Explicitly state which exchanges are blocked and why |
| Payment methods | Country-specific payment methods (local bank transfer, Revolut, etc.) |
| Legal notice | Regulatory status for that country if relevant |
| Schema | BreadcrumbList + FAQPage |
| Internal linking | Links to each listed exchange + their bonus pages |

---

### E. P2P Trading Pages

**Target intent:** Informational/transactional — "How do I buy crypto with [payment method]?"  
**Primary keyword pattern:** `P2P crypto [country]`, `buy Bitcoin with [payment method]`

| Requirement | Standard |
|-------------|---------|
| Direct answer | Top 3 P2P exchanges with 0% fee highlight |
| P2P fee table | Exchange, P2P fee, payment methods, countries |
| Screenshots | P2P interface screenshots for top exchanges |
| How-to | Step-by-step P2P purchase walkthrough |
| Schema | HowTo + FAQPage |

---

### F. KYC / No-KYC Pages

**Target intent:** Informational — "Which exchanges don't require KYC?"  
**Primary keyword pattern:** `crypto exchange no KYC`, `no KYC crypto bonus`

| Requirement | Standard |
|-------------|---------|
| Safety gate | Only list an exchange as "no KYC" when `kyc_required = false` AND evidence confidence ≥ 0.70 AND `conflictStatus = ok` |
| Direct answer | Verified no-KYC exchanges listed with withdrawal limit caveat |
| Risk disclosure | Clearly state KYC-free exchanges have lower withdrawal limits |
| No unverified claims | Per `docs/KYC_ACCESS_CLAIMS_POLICY.md` |
| Schema | FAQPage + BreadcrumbList |

---

### G. Fees Pages

**Target intent:** Informational — "What are [exchange] trading fees?"  
**Primary keyword pattern:** `[Exchange name] fees`, `[Exchange name] trading fees 2026`

| Requirement | Standard |
|-------------|---------|
| Direct answer | Spot and futures fees in first 100 words as a table |
| Fee table | Maker/taker, spot/futures/P2P, with BNB discount note where applicable |
| Screenshots | Fees slot screenshot from official fee schedule page |
| Schema | Table in structured HTML for featured snippet; FAQPage for fee comparison questions |
| Evidence source | `officialSourceUrl` pointing to official fee schedule |
| Freshness | Fee facts `lastChecked` ≤ 60 days |

---

### H. Security / Proof of Reserves Pages

**Target intent:** Informational/trust — "Is [exchange] safe? Do they have enough funds?"  
**Primary keyword pattern:** `[Exchange name] proof of reserves`, `is [Exchange name] safe`

| Requirement | Standard |
|-------------|---------|
| Direct answer | PoR status in first paragraph (yes/no/when published) |
| Screenshots | `proof_of_reserves` slot screenshot |
| Verification method | How the PoR is verified (Merkle tree, third-party auditor) |
| Cold storage | Cold vs hot wallet ratio if disclosed |
| Schema | FAQPage for safety questions |

---

### I. Guide / How-To Pages (`/guides/{slug}/`)

**Target intent:** Informational — "How do I do X with crypto?"  
**Primary keyword pattern:** `how to [action] [exchange]`, `[exchange] tutorial`

| Requirement | Standard |
|-------------|---------|
| Direct answer | Outcome statement + time estimate in intro |
| Steps | Numbered, specific, actionable |
| Screenshots | Real screenshots for key steps |
| Schema | HowTo + BreadcrumbList + FAQPage |
| Internal linking | Links to relevant exchange pages and bonus pages |
| Freshness | Steps must match current UI — verify every 90 days |

---

### J. News / Editorial Pages

**Target intent:** Informational — "What happened? What does it mean?"  
**Primary keyword pattern:** `[Exchange name] news`, `crypto bonus update`

| Requirement | Standard |
|-------------|---------|
| Dateline | Publication date prominent |
| Freshness | Must be current — no evergreen pretense for dated content |
| Schema | Article + BreadcrumbList |
| Internal linking | Links to affected exchange pages |
| Updates | If situation changes, update the page with `[Updated: date]` |

---

## 6. Full Site Audit Plan

### Scope

| Category | Page count | Audit method |
|----------|-----------|-------------|
| Exchange review pages | 14 | Automated + manual spot-check |
| Bonus pages | 14 | Automated + manual spot-check |
| Comparison pages | Variable | Automated + manual |
| Country pages | Variable | Automated |
| Guide pages | Variable | Manual |
| Homepage | 1 | Manual |
| Sitemap | 1 | Automated |
| Robots.txt | 1 | Automated |
| Global schema | All pages | `npm run schema:check` |
| Global evidence | All exchanges | `npm run validate:evidence` |
| Global screenshots | All exchanges | `npm run audit:screenshots` |

### Audit Commands

```bash
# Full QA suite
npm run build
npm run schema:check
npm run validate:evidence
npm run evidence:governance
npm run audit:screenshots
npm run audit:production
npm run affiliate:audit:strict
npm run seo:check

# Check for placeholder renders in dist
grep -r "Screenshot in preparation" dist/exchanges/ | wc -l
grep -r "Screenshot in preparation" dist/bonuses/ | wc -l

# Check for stale Offer schemas (outdated bonus evidence)
grep -r "priceCurrency" dist/exchanges/ | wc -l  # count Product+offers

# Check OG images exist for all 14 exchanges
ls public/og/exchange-*.png | wc -l  # expected: 14
```

### Per-Page Audit Fields

For each exchange page, record:

| Field | Source | Check |
|-------|--------|-------|
| Page score (0–100) | Manual assessment | ≥ 80 = strong |
| bonus_amount confidence | evidence JSON | ≥ 0.5 for offers schema |
| bonus lastChecked | evidence JSON | ≤ 90 days |
| Screenshots available count | audit:screenshots report | ≥ 4 for top 8 exchanges |
| Placeholder renders | built HTML grep | 0 |
| Schema check status | schema:check | pass |
| OG image exists | `public/og/` | yes |
| Internal links count | manual spot-check | ≥ 6 |
| FAQ count | content-overrides or generated | ≥ 8 |
| Verdict block | content-overrides | present for top 8 |
| Walkthrough present | exchange-walkthroughs.ts | yes for top 5 |

### Audit Output Files

Generated at audit time (gitignored):
```
reports/full-site-seo-audit.md    — human-readable audit report
reports/full-site-seo-audit.json  — machine-readable for tracking over time
```

Report structure per exchange:
```json
{
  "exchange": "binance",
  "auditDate": "2026-06-05",
  "pageScore": 87,
  "tier": "strong",
  "bonusConfidence": 0.85,
  "bonusLastChecked": "2026-06-04",
  "screenshotsAvailable": 6,
  "placeholderRenders": 0,
  "schemaCheckPass": true,
  "ogImageExists": true,
  "verdictBlockPresent": false,
  "walkthroughPresent": true,
  "faqCount": 10,
  "topGap": "verdict block missing (+3 content score)",
  "nextAction": "PAGE-FACTORY-BINANCE-GOLD-AUDIT-01"
}
```

---

## 7. Integration with Page Factory

This system sits on top of the Page Factory and drives its weekly execution.

```
SEO Intelligence (this doc)
        │
        ▼
Monday scan → issues, opportunities, algorithm changes
        │
        ▼
Tuesday audit → which pages need work this week
        │
        ▼
Wednesday/Thursday → Page Factory Stages 1–7 (content, evidence, screenshots, schema, links)
        │
        ▼
Friday → Page Factory Stage 8 (QA) + Stage 9 (Deploy + verify)
        │
        ▼
Weekly SEO Intelligence Report → filed in reports/
```

### Integration Points

| System | How this doc uses it |
|--------|---------------------|
| `MASTER_SEO_SCREENSHOT_PAGE_FACTORY.md` | Stages 1–9 are executed on Wednesday/Thursday as part of the weekly cycle |
| `SCREENSHOT_STANDARD.md` | Screenshot Director role uses this for all capture and registration decisions |
| `KYC_ACCESS_CLAIMS_POLICY.md` | Evidence Auditor role enforces this every time a KYC fact is updated |
| `src/data/evidence/{exchange}.json` | Source of truth for all audit scores (confidence, lastChecked, status) |
| `scripts/audit-screenshot-registry.mjs` | Run on Tuesday and Friday as part of site audit |
| `scripts/audit-schema.mjs` | Run on Friday before every deploy |
| `scripts/deploy.mjs` | Triggered on Friday; includes automatic IndexNow submission |
| `logs/indexnow-submissions.jsonl` | Checked on Monday to verify previous week's submissions landed |
| `reports/` directory | All audit outputs are saved here (gitignored) |

---

## 8. Binance Pilot Plan

Binance is the first exchange to target Gold tier (90+). It is the highest-value page (homepage position #2, bonus confidence 0.85, offers schema live).

### Current Score: 87/100 (🥈 Strong)

### Path to Gold (87 → 90+)

**Sprint 04 — Week 1:**

| Task ID | Task | Role | Score impact |
|---------|------|------|-------------|
| PAGE-FACTORY-BINANCE-GOLD-01 | Add `verdict` block to `content-overrides.json` — `quickVerdict`, `bestFor[3]`, `avoidIf[2]`, `keyLimitation` | Editorial Lead | +3 Content |
| PAGE-FACTORY-BINANCE-GOLD-02 | Add `experience` grid data to `content-overrides.json` — 6 dimensions (onboarding, mobile, beginner, withdrawals, liquidity, support) | Editorial Lead | +2 Content |
| PAGE-FACTORY-BINANCE-GOLD-03 | Recapture `mobile_app` screenshot — Binance app dashboard or trading view, WebP, > 20KB, register in evidence | Screenshot Director | +2 Visual |
| PAGE-FACTORY-BINANCE-GOLD-04 | Verify `bonus_expiry_days` and `bonus_min_deposit` facts (currently confidence 0.27 — outdated) — owner checks current terms | Evidence Auditor | +1 Evidence |
| PAGE-FACTORY-BINANCE-GOLD-05 | Add Binance bonus tier data to `exchanges.json` — `bonusTiers` array with task breakdown | Editorial Lead | +1 Content |

**Estimated score after Sprint 04 Week 1: 93–95/100 (🥇 Gold)**

### AI Answer Readiness — Binance Gaps

| Check | Status | Action |
|-------|--------|--------|
| Direct answer paragraph in first 200 words | ✅ Present (ExchangeHero + EditorSummary) | No action |
| Structured fact table | ✅ Present (ex-fact-box) | No action |
| All claims have dates | ⚠️ Bonus expiry/deposit outdated | Fix in Gold-04 |
| Entity clarity | ✅ Clear | No action |
| Comparison table | ⚠️ Available in compare pages but not on exchange page itself | Add in Sprint 04+ |
| FAQ ≥ 8 items | ✅ Present | No action |
| Reviewer attribution | ✅ Present | No action |

### Visual Director — Binance Gaps

| Check | Status | Action |
|-------|--------|--------|
| Gallery 6 screenshots, no errors | ✅ Done (Sprint 03) | No action |
| OG image | ✅ Exists at `public/og/exchange-binance.png` | Verify design is current |
| Hero renders cleanly | ✅ (assumed) | Spot-check on mobile |
| No placeholders | ✅ Done (Sprint 03) | No action |
| `mobile_app` recapture | ❌ Pending | PAGE-FACTORY-BINANCE-GOLD-03 |

### SEO Intelligence — Binance Monitoring

Weekly SERP checks for Binance:
- `binance bonus 2026`
- `binance referral code 2026`
- `binance review 2026`
- `binance fees 2026`
- `claim binance welcome bonus`

Track position of:
- `https://cryptobonusworld.com/exchanges/binance/`
- `https://cryptobonusworld.com/bonuses/binance-bonus/`

Monitor for Google AI Overview citation on `binance bonus 2026`.

---

## 9. Governance Reference

| Document | Purpose |
|----------|---------|
| `docs/SEO_INTELLIGENCE_AND_AI_SEARCH_OPS.md` | **This file** — weekly monitoring, AI answer readiness, full audit plan |
| `docs/MASTER_SEO_SCREENSHOT_PAGE_FACTORY.md` | Production pipeline — 9 stages, 9 roles, gold standards |
| `docs/SCREENSHOT_STANDARD.md` | Screenshot naming, slots, evidence registry rules |
| `docs/KYC_ACCESS_CLAIMS_POLICY.md` | KYC claim safety rules, confidence thresholds |
| `docs/WEEKLY_SEO_INTELLIGENCE_REPORT_TEMPLATE.md` | Template for Monday weekly report |
| `docs/FULL_SITE_SEO_AUDIT_SCORECARD.md` | Per-page scoring template for full site audit |
| `src/data/evidence/{exchange}.json` | Per-exchange evidence registry — source of truth |
| `src/data/content-overrides.json` | Editorial overrides (verdict, experience, FAQ) |
| `logs/indexnow-submissions.jsonl` | IndexNow submission history |
| `reports/` (gitignored) | Weekly intelligence reports, audit outputs |

---

*Document created: 2026-06-05 | Sprint 03 | CryptoBonusWorld SEO Intelligence & AI Search Operations System v1.0*
