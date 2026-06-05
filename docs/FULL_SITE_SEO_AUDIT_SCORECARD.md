# CBW Full Site SEO Audit Scorecard

**Project:** CryptoBonusWorld  
**Version:** 1.0  
**Created:** 2026-06-05  
**Usage:** Run a full site audit periodically (recommended: monthly) and save output to `reports/full-site-seo-audit-{YYYY-MM-DD}.md`

---

## Instructions

1. Copy this file to `reports/full-site-seo-audit-{date}.md`
2. Run all QA commands listed in each section
3. Fill in scores for all 14 exchange pages
4. Identify top 5 priorities for next sprint
5. Do NOT commit the filled-in report (reports/ is gitignored)

---

## Part 1: Technical Health

### 1.1 Build and Scripts

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| Build pages count | `npm run build` | {207 or N} | ✅/❌ |
| Build errors | `npm run build` | {0} | ✅/❌ |
| Schema check | `npm run schema:check` | {CI errors: 0} | ✅/❌ |
| Evidence validation | `npm run validate:evidence` | {pass} | ✅/❌ |
| Evidence governance | `npm run evidence:governance` | {pass} | ✅/❌ |
| Screenshot audit P1 errors | `npm run audit:screenshots` | {🚨 0} | ✅/❌ |
| Production audit | `npm run audit:production` | {pass} | ✅/❌ |
| Affiliate audit | `npm run affiliate:audit:strict` | {0 violations} | ✅/❌ |
| SEO check | `npm run seo:check` | {pass} | ✅/❌ |

### 1.2 Core Files

| File | URL | HTTP Status | Notes |
|------|-----|------------|-------|
| Homepage | `https://cryptobonusworld.com/` | {200} | |
| Favicon | `https://cryptobonusworld.com/favicon.ico` | {200} | |
| Sitemap | `https://cryptobonusworld.com/sitemap.xml` | {200} | |
| Robots.txt | `https://cryptobonusworld.com/robots.txt` | {200} | |
| 404 page | `https://cryptobonusworld.com/does-not-exist/` | {404} | Custom 404 page? |
| IndexNow key | `https://cryptobonusworld.com/a1b2c3d4e5f6789012345678901234ab.txt` | {200} | |

### 1.3 Sitemap Check

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Total URLs | ~171 | {n} | ✅/❌ |
| All 14 exchange pages present | Yes | {yes/no} | ✅/❌ |
| All 14 bonus pages present | Yes | {yes/no} | ✅/❌ |
| Sitemap referenced in robots.txt | Yes | {yes/no} | ✅/❌ |
| Submitted to Yandex Webmaster | Yes | {yes/no} | ✅/❌ |
| Submitted to GSC | Yes | {yes/no} | ✅/❌ |

### 1.4 Robots.txt Check

| Directive | Expected | Present | Notes |
|-----------|----------|---------|-------|
| `User-agent: *` | Yes | {yes/no} | |
| `Sitemap:` directive | Yes | {yes/no} | |
| `/go/` blocked | Yes | {yes/no} | Affiliate redirect — should not be indexed |
| `User-agent: Yandex` | Yes | {yes/no} | Yandex-specific crawl-delay |
| `Host:` directive for Yandex | Yes | {yes/no} | |

### 1.5 Placeholder Check

```bash
grep -r "Screenshot in preparation" dist/exchanges/ | wc -l   # expected: 0
grep -r "Screenshot in preparation" dist/bonuses/ | wc -l     # expected: 0
```

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Placeholders in exchange pages | 0 | {n} | ✅/❌ |
| Placeholders in bonus pages | 0 | {n} | ✅/❌ |

---

## Part 2: Exchange Page Scores (14 pages)

### Scoring Guide

Apply the Page Quality Model from `docs/SEO_INTELLIGENCE_AND_AI_SEARCH_OPS.md §3`.

**Quick score formula:**
- Search intent fit (max 15): title has keyword (+4), meta ≤ 160 (+2), URL matches (+2), featured snippet target (+2), intent matches (+2), canonical correct (+3)
- Content depth (max 15): all sections present (+5), original editorial (+4), no padding (+3), fact density (+3)
- Evidence/trust (max 15): bonus confidence ≥ 0.85 (+6), fees from official source (+4), KYC gated (+3), no open manualReviewRequired (+2)
- AI answer readiness (max 10): direct answer in 200 words (+3), fact table present (+3), dates on claims (+2), entity clarity (+2)
- Snippet/FAQ readiness (max 10): FAQ ≥ 8 (+4), how-to steps (+3), comparison table (+3)
- Visual/screenshots (max 10): ≥ 4 clean screenshots (+5), near supporting claims (+3), 0 placeholders (+2)
- UX/conversion (max 10): CTA above fold (+3), sticky sidebar (+3), mobile ok (+2), no dead ends (+2)
- Schema (max 10): schema:check pass (+3), Product correct (+2), FAQ schema (+2), canonical (+2), OG image (+1)
- Internal linking (max 5): bonus linked (+1), 2+ compare (+1), alternatives (+1), guide (+1), coins (+1)

---

### Binance (`/exchanges/binance/`)

| Dimension | Score | Max | Notes |
|-----------|-------|-----|-------|
| Search intent fit | {14} | 15 | |
| Content depth | {15} | 15 | Verdict block missing in Sprint 03 |
| Evidence/trust | {13} | 15 | Expiry/deposit confidence 0.27 |
| AI answer readiness | {8} | 10 | |
| Snippet/FAQ readiness | {8} | 10 | |
| Visual/screenshots | {13} | 10→15 (use 10) | 6 curated, mobile_app pending |
| UX/conversion | {9} | 10 | |
| Schema | {10} | 10 | offers live, schema:check pass |
| Internal linking | {4} | 5 | |
| **TOTAL** | **87** | **100** | **🥈 Strong** |

**Top 3 gaps:**
1. Verdict block not yet added to content-overrides (−3 Content)
2. mobile_app screenshot pending recapture (−2 Visual)
3. Bonus expiry/deposit confidence 0.27 (−2 Evidence)

**Next action:** PAGE-FACTORY-BINANCE-GOLD-01 (add verdict block)

---

### Bybit (`/exchanges/bybit/`)

| Dimension | Score | Max | Notes |
|-----------|-------|-----|-------|
| Search intent fit | {} | 15 | |
| Content depth | {} | 15 | |
| Evidence/trust | {} | 15 | bonus confidence 0.27 |
| AI answer readiness | {} | 10 | |
| Snippet/FAQ readiness | {} | 10 | |
| Visual/screenshots | {} | 10 | Legacy walkthrough screenshots active |
| UX/conversion | {} | 10 | |
| Schema | {} | 10 | offers suppressed (confidence 0.27) |
| Internal linking | {} | 5 | |
| **TOTAL** | **{}** | **100** | **{}** |

**Top gap:** Bonus amount verification (T01-BYBIT-BONUS-OWNER-VERIFY)

---

### OKX (`/exchanges/okx/`)

| Dimension | Score | Max | Notes |
|-----------|-------|-----|-------|
| Search intent fit | {} | 15 | |
| Content depth | {} | 15 | |
| Evidence/trust | {} | 15 | bonus confidence 0.85 → offers live |
| AI answer readiness | {} | 10 | |
| Snippet/FAQ readiness | {} | 10 | |
| Visual/screenshots | {} | 10 | |
| UX/conversion | {} | 10 | |
| Schema | {} | 10 | |
| Internal linking | {} | 5 | |
| **TOTAL** | **{}** | **100** | **{}** |

---

### MEXC (`/exchanges/mexc/`)

| Dimension | Score | Max | Notes |
|-----------|-------|-----|-------|
| Search intent fit | {} | 15 | |
| Content depth | {} | 15 | |
| Evidence/trust | {} | 15 | most facts outdated |
| AI answer readiness | {} | 10 | |
| Snippet/FAQ readiness | {} | 10 | |
| Visual/screenshots | {} | 10 | no screenshots |
| UX/conversion | {} | 10 | |
| Schema | {} | 10 | offers suppressed |
| Internal linking | {} | 5 | |
| **TOTAL** | **{}** | **100** | **{}** |

---

### Bitget (`/exchanges/bitget/`)

| Dimension | Score | Max | Notes |
|-----------|-------|-----|-------|
| Search intent fit | {} | 15 | |
| Content depth | {} | 15 | |
| Evidence/trust | {} | 15 | |
| AI answer readiness | {} | 10 | |
| Snippet/FAQ readiness | {} | 10 | |
| Visual/screenshots | {} | 10 | |
| UX/conversion | {} | 10 | |
| Schema | {} | 10 | |
| Internal linking | {} | 5 | |
| **TOTAL** | **{}** | **100** | **{}** |

---

### BingX (`/exchanges/bingx/`)

| Dimension | Score | Max | Notes |
|-----------|-------|-----|-------|
| Search intent fit | {} | 15 | |
| Content depth | {} | 15 | |
| Evidence/trust | {} | 15 | |
| AI answer readiness | {} | 10 | |
| Snippet/FAQ readiness | {} | 10 | |
| Visual/screenshots | {} | 10 | |
| UX/conversion | {} | 10 | |
| Schema | {} | 10 | |
| Internal linking | {} | 5 | |
| **TOTAL** | **{}** | **100** | **{}** |

---

### Gate.io (`/exchanges/gate-io/`)

| Dimension | Score | Max | Notes |
|-----------|-------|-----|-------|
| Search intent fit | {} | 15 | |
| Content depth | {} | 15 | |
| Evidence/trust | {} | 15 | |
| AI answer readiness | {} | 10 | |
| Snippet/FAQ readiness | {} | 10 | |
| Visual/screenshots | {} | 10 | |
| UX/conversion | {} | 10 | |
| Schema | {} | 10 | |
| Internal linking | {} | 5 | |
| **TOTAL** | **{}** | **100** | **{}** |

---

### KuCoin (`/exchanges/kucoin/`)

| Dimension | Score | Max | Notes |
|-----------|-------|-----|-------|
| Search intent fit | {} | 15 | |
| Content depth | {} | 15 | |
| Evidence/trust | {} | 15 | |
| AI answer readiness | {} | 10 | |
| Snippet/FAQ readiness | {} | 10 | |
| Visual/screenshots | {} | 10 | |
| UX/conversion | {} | 10 | |
| Schema | {} | 10 | |
| Internal linking | {} | 5 | |
| **TOTAL** | **{}** | **100** | **{}** |

---

### HTX (`/exchanges/htx/`)

| Dimension | Score | Max | Notes |
|-----------|-------|-----|-------|
| Search intent fit | {} | 15 | |
| Content depth | {} | 15 | |
| Evidence/trust | {} | 15 | |
| AI answer readiness | {} | 10 | |
| Snippet/FAQ readiness | {} | 10 | |
| Visual/screenshots | {} | 10 | |
| UX/conversion | {} | 10 | |
| Schema | {} | 10 | |
| Internal linking | {} | 5 | |
| **TOTAL** | **{}** | **100** | **{}** |

---

### CoinEx (`/exchanges/coinex/`)

| Dimension | Score | Max | Notes |
|-----------|-------|-----|-------|
| Search intent fit | {} | 15 | |
| Content depth | {} | 15 | |
| Evidence/trust | {} | 15 | |
| AI answer readiness | {} | 10 | |
| Snippet/FAQ readiness | {} | 10 | |
| Visual/screenshots | {} | 10 | |
| UX/conversion | {} | 10 | |
| Schema | {} | 10 | |
| Internal linking | {} | 5 | |
| **TOTAL** | **{}** | **100** | **{}** |

---

### Phemex (`/exchanges/phemex/`)

| Dimension | Score | Max | Notes |
|-----------|-------|-----|-------|
| Search intent fit | {} | 15 | |
| Content depth | {} | 15 | |
| Evidence/trust | {} | 15 | |
| AI answer readiness | {} | 10 | |
| Snippet/FAQ readiness | {} | 10 | |
| Visual/screenshots | {} | 10 | |
| UX/conversion | {} | 10 | |
| Schema | {} | 10 | |
| Internal linking | {} | 5 | |
| **TOTAL** | **{}** | **100** | **{}** |

---

### Bitunix (`/exchanges/bitunix/`)

| Dimension | Score | Max | Notes |
|-----------|-------|-----|-------|
| Search intent fit | {} | 15 | |
| Content depth | {} | 15 | |
| Evidence/trust | {} | 15 | multiple unverified Bitunix facts |
| AI answer readiness | {} | 10 | |
| Snippet/FAQ readiness | {} | 10 | |
| Visual/screenshots | {} | 10 | |
| UX/conversion | {} | 10 | |
| Schema | {} | 10 | |
| Internal linking | {} | 5 | |
| **TOTAL** | **{}** | **100** | **{}** |

---

### LBank (`/exchanges/lbank/`)

| Dimension | Score | Max | Notes |
|-----------|-------|-----|-------|
| Search intent fit | {} | 15 | |
| Content depth | {} | 15 | |
| Evidence/trust | {} | 15 | |
| AI answer readiness | {} | 10 | |
| Snippet/FAQ readiness | {} | 10 | |
| Visual/screenshots | {} | 10 | |
| UX/conversion | {} | 10 | |
| Schema | {} | 10 | |
| Internal linking | {} | 5 | |
| **TOTAL** | **{}** | **100** | **{}** |

---

### Coinbase (`/exchanges/coinbase/`)

| Dimension | Score | Max | Notes |
|-----------|-------|-----|-------|
| Search intent fit | {} | 15 | |
| Content depth | {} | 15 | |
| Evidence/trust | {} | 15 | |
| AI answer readiness | {} | 10 | |
| Snippet/FAQ readiness | {} | 10 | |
| Visual/screenshots | {} | 10 | |
| UX/conversion | {} | 10 | |
| Schema | {} | 10 | |
| Internal linking | {} | 5 | |
| **TOTAL** | **{}** | **100** | **{}** |

---

## Part 3: Exchange Summary Table

Fill after completing all 14 page scores.

| Exchange | Score | Tier | bonus confidence | Screenshots | offers schema | Top gap |
|----------|-------|------|-----------------|-------------|--------------|---------|
| Binance | 87 | 🥈 Strong | 0.85 | 6 | ✅ | Verdict block |
| Bybit | {} | {} | 0.27 | {} | ❌ | Bonus verification |
| OKX | {} | {} | 0.85 | {} | ✅ | {} |
| MEXC | {} | {} | 0.27 | {} | ❌ | {} |
| Bitget | {} | {} | {} | {} | {} | {} |
| BingX | {} | {} | {} | {} | {} | {} |
| Gate.io | {} | {} | {} | {} | {} | {} |
| KuCoin | {} | {} | {} | {} | {} | {} |
| HTX | {} | {} | {} | {} | {} | {} |
| CoinEx | {} | {} | {} | {} | {} | {} |
| Phemex | {} | {} | {} | {} | {} | {} |
| Bitunix | {} | {} | {} | {} | {} | {} |
| LBank | {} | {} | {} | {} | {} | {} |
| Coinbase | {} | {} | {} | {} | {} | {} |

**Site average score:** {}/100  
**Gold tier pages:** {n} / 14  
**Strong tier pages:** {n} / 14  
**Urgent rebuild pages (< 60):** {n} / 14

---

## Part 4: Screenshot Coverage Matrix

| Exchange | registration | bonus | bonus_ref_landing | fees | proof_of_reserves | p2p | spot | futures | mobile_app |
|----------|-------------|-------|------------------|------|------------------|-----|------|---------|-----------|
| Binance | ✅ | outdated | ✅ | ✅ | ✅ | ✅ | ✅ | outdated | ❌ needs_recapture |
| Bybit | {} | {} | {} | {} | {} | {} | {} | {} | {} |
| OKX | {} | {} | {} | {} | {} | {} | {} | {} | {} |
| MEXC | {} | {} | {} | {} | {} | {} | {} | {} | {} |
| Bitget | {} | {} | {} | {} | {} | {} | {} | {} | {} |
| BingX | {} | {} | {} | {} | {} | {} | {} | {} | {} |
| Gate.io | {} | {} | {} | {} | {} | {} | {} | {} | {} |
| KuCoin | {} | {} | {} | {} | {} | {} | {} | {} | {} |
| HTX | {} | {} | {} | {} | {} | {} | {} | {} | {} |
| CoinEx | {} | {} | {} | {} | {} | {} | {} | {} | {} |
| Phemex | {} | {} | {} | {} | {} | {} | {} | {} | {} |
| Bitunix | {} | {} | {} | {} | {} | {} | {} | {} | {} |
| LBank | {} | {} | {} | {} | {} | {} | {} | {} | {} |
| Coinbase | {} | {} | {} | {} | {} | {} | {} | {} | {} |

**Legend:** ✅ available | ⏰ outdated | ❌ needs_manual_capture | ➖ not_applicable

---

## Part 5: Evidence Health Matrix

| Exchange | bonus_amount confidence | bonus lastChecked (days ago) | fees confidence | kyc confidence | manualReviewRequired open |
|----------|------------------------|---------------------------|-----------------|----------------|--------------------------|
| Binance | 0.85 | {} | 0.76 | 0.76 | 1 (licences) |
| Bybit | 0.27 | {} | {} | {} | {} |
| OKX | 0.85 | {} | {} | {} | {} |
| MEXC | 0.27 | {} | {} | {} | {} |
| Bitget | {} | {} | {} | {} | {} |
| BingX | {} | {} | {} | {} | {} |
| Gate.io | {} | {} | {} | {} | {} |
| KuCoin | {} | {} | {} | {} | {} |
| HTX | {} | {} | {} | {} | {} |
| CoinEx | {} | {} | {} | {} | {} |
| Phemex | {} | {} | {} | {} | {} |
| Bitunix | {} | {} | {} | {} | {} |
| LBank | {} | {} | {} | {} | {} |
| Coinbase | {} | {} | {} | {} | {} |

---

## Part 6: Internal Linking Matrix

| Exchange page | → own bonus page | → 2+ compare | → alternatives | → guide | → coins |
|--------------|-----------------|-------------|---------------|---------|---------|
| Binance | ✅ | {} | {} | {} | {} |
| Bybit | {} | {} | {} | {} | {} |
| OKX | {} | {} | {} | {} | {} |
| MEXC | {} | {} | {} | {} | {} |
| Bitget | {} | {} | {} | {} | {} |
| BingX | {} | {} | {} | {} | {} |
| Gate.io | {} | {} | {} | {} | {} |
| KuCoin | {} | {} | {} | {} | {} |
| HTX | {} | {} | {} | {} | {} |
| CoinEx | {} | {} | {} | {} | {} |
| Phemex | {} | {} | {} | {} | {} |
| Bitunix | {} | {} | {} | {} | {} |
| LBank | {} | {} | {} | {} | {} |
| Coinbase | {} | {} | {} | {} | {} |

---

## Part 7: AI Answer Readiness Spot-Check

Sample 5 pages for full AI answer readiness check.

| Page | Direct answer ≤ 200 words | Fact table present | Claims dated | Entity clarity | Score |
|------|--------------------------|-------------------|--------------|---------------|-------|
| `/exchanges/binance/` | {} | ✅ (ex-fact-box) | ⚠️ partial | ✅ | {}/10 |
| `/exchanges/bybit/` | {} | {} | {} | {} | {}/10 |
| `/bonuses/binance-bonus/` | {} | {} | {} | {} | {}/10 |
| `/exchanges/mexc/` | {} | {} | {} | {} | {}/10 |
| `/exchanges/okx/` | {} | {} | {} | {} | {}/10 |

---

## Part 8: Sprint Priorities

### This Audit's Top 5 Priorities

Based on score gaps and impact:

| Priority | Task | Page | Score impact | Sprint |
|----------|------|------|-------------|--------|
| 1 | {task} | {page} | {+n points} | Sprint {n} |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

### Owner Actions Required

| Action | Context | Urgency |
|--------|---------|---------|
| T01-BYBIT-BONUS-OWNER-VERIFY | Visit Bybit promo URL, confirm 30K USDT — unlocks offers schema | High |
| {action} | {context} | {urgency} |

---

*Scorecard template: CBW Full Site SEO Audit Scorecard v1.0 | Created 2026-06-05*  
*Fill and save to `reports/full-site-seo-audit-{YYYY-MM-DD}.md` — this file stays as template in docs/*
