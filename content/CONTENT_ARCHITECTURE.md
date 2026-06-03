# CryptoBonusWorld — Content Architecture
**Version:** 1.0
**Effective:** 2026-06-03

---

## 1. Content Types

### 1.1 Exchange Reviews (`exchange_review` blueprint)
Full long-form exchange reviews. 14 required sections. Primary monetization page type.
- Location: src/pages/[exchange-slug].astro (current structure)
- Blueprint: `exchange_review` in src/data/article-blueprints.ts
- Required evidence: bonus verified, affiliate link tested, screenshots, regulatory status
- Freshness: 90 days max
- Schema: Review + FAQPage + BreadcrumbList

### 1.2 Bonus Guides (`bonus_review` blueprint)
Bonus-focused deep dives. When a bonus offer is complex enough to deserve its own article.
- Blueprint: `bonus_review`
- Focus: terms, wagering requirements, how to claim, expiry, promo code
- Freshness: 30 days (bonuses change frequently)
- Schema: Review + FAQPage

### 1.3 Comparisons (`comparison` blueprint)
Side-by-side exchange comparisons. High search intent, strong affiliate potential.
- Blueprint: `comparison`
- Structure: comparison_summary → key_differences_table → fees → bonus → who_wins → verdict
- Freshness: 60 days
- Schema: Article + FAQPage

### 1.4 Country Guides (`country_exchange_guide` blueprint)
Country-specific exchange availability guides. High geo-targeted search intent.
- Blueprint: `country_exchange_guide`
- Structure: country_summary → available_exchanges → legal_status → payment_methods → recommended
- Freshness: 90 days
- Schema: Article + FAQPage

### 1.5 Academy Content
Educational guides for crypto users. Low commercial intent, high trust-building value.
Includes:
- How-to guides (`how_to_guide` blueprint): step-by-step with HowTo schema
- Fee guides (`fee_guide` blueprint): fee comparison tables
- KYC guides (`kyc_guide` blueprint): verification tier explanations
- Futures guides (`futures_guide` blueprint): leverage and liquidation explanations

### 1.6 News (Future)
Market news, bonus updates, regulatory changes. Not yet active.
Planned: RSS feed, Telegram channel integration, automated freshness triggers.

---

## 2. Content Quality Gates

Before any exchange review is published:
- [ ] All 14 required sections present
- [ ] Bonus amount verified via live capture (< 30 days old)
- [ ] Affiliate link tested (redirect chain confirmed)
- [ ] Minimum 3 screenshots with placeholder fallback for missing
- [ ] FAQPage schema with minimum 5 questions
- [ ] "Last verified" block with date
- [ ] Affiliate disclosure in both positions (top + before CTA)
- [ ] Internal link to /methodology
- [ ] Minimum 2 competitor alternative mentions with internal links
- [ ] Risk disclaimer present

---

## 3. Content Priorities

### Current P1 Exchanges (require complete reviews)
binance · okx · mexc · bitget

### Current P2 Exchanges
bybit · bingx · gate-io · kucoin · htx

### Current P3 Exchanges
coinex · phemex · bitunix · lbank · coinbase

---

## 4. Multilingual Future

Planned expansion languages (not yet active):
- Russian (RU) — large crypto user base
- Polish (PL) — emerging market
- Turkish (TR) — high crypto adoption
- German (DE) — EU regulated market
- Hindi (IN) — large user base
- Hausa/English (NG) — growing African market

When multilingual is implemented:
- Content lives in content/{lang}/exchange-reviews/
- Evidence remains single-source (evidence JSON)
- Screenshots: region-aware capture (verification-regions.ts already supports this)
- Routing: /[lang]/[exchange-slug]/

---

## 5. Content Brief Workflow

1. Run: `npm run articles:brief --type exchange_review --exchange {slug}`
2. Output: `reports/content-briefs/{slug}-exchange_review.md`
3. Human reviews brief, writes content following section structure
4. Human runs: `npm run articles:audit --verbose` to check compliance
5. Human publishes to src/pages/

---

## 6. Internal Linking Strategy

Every exchange review must link to:
- At least 1 comparison page (exchange vs. competitor)
- /methodology page
- At least 1 relevant category page
- Optionally: relevant country pages

Comparison pages must link back to both exchange reviews.
Category pages must link to all relevant exchange reviews.
