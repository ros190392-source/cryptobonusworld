# CryptoBonusWorld — Content Rules v1.0

**Status:** Active  
**Last updated:** May 2026  
**Enforcement:** Applied at content review, automated flags via qualityUtils.ts

---

## Quality Thresholds

These are minimum requirements for content to be considered publishable.

### Exchange pages (`/exchanges/[slug]/`)

| Metric | Minimum | Preferred |
|---|---|---|
| Word count (body) | 500 | 800+ |
| FAQ items | 4 | 6 |
| Structured bonus tiers | 1 | 3+ |
| Verified bonus amount | Required | — |
| Last-verified date | Required | Within 30 days |
| KYC flag | Required | — |
| Deposit requirement | Required | — |
| Country list | Required | — |
| Editor note | Recommended | — |

### Category pages (`/categories/[slug]/`)

| Metric | Minimum | Preferred |
|---|---|---|
| Exchange count | 2 | 5+ |
| Intro paragraph | Required | — |
| FAQ items | 3 | 5 |
| AnswerBox | Required | — |

### Country pages (`/countries/[slug]/`)

| Metric | Minimum | Preferred |
|---|---|---|
| Exchange count | 1 | 5+ |
| Payment methods listed | Required | — |
| Regulatory status | Required | — |
| FAQ items | 4 | 6 |
| AnswerBox | Required | — |

### Coin pages (`/coins/[slug]/`)

| Metric | Minimum | Preferred |
|---|---|---|
| Exchange count | 3 | 8+ |
| Network list | Required (1+) | — |
| Quick facts | 4 | 6 |
| FAQ items | 3 | 5 |
| Intro paragraph | Required | — |

### Use-case pages (`/use-cases/[slug]/`)

| Metric | Minimum | Preferred |
|---|---|---|
| Exchange count | 3 | 8+ |
| AnswerBox | Required | — |
| Quick facts | 3 | 5 |
| FAQ items | 3 | 5 |
| Why-it-matters paragraph | Required | — |

### Bonus code pages (`/bonus-codes/[slug]/`)

| Metric | Minimum | Preferred |
|---|---|---|
| At least 1 code OR "via link" notice | Required | — |
| How-to steps | Required (4+) | — |
| Verified date | Required | — |
| Terms URL or note | Required | — |
| FAQ items | 2 | 4 |

### Guide pages (`/guides/[slug]/`)

| Metric | Minimum | Preferred |
|---|---|---|
| Word count | 800 | 1,500+ |
| FAQ items | 3 | 6 |
| Sections (H2) | 3 | 6+ |
| Related exchange links | 2 | 4 |
| Risk disclaimer | Required | — |

---

## Anti-Thin-Content Rules

The following patterns flag a page as thin content and require remediation before publishing:

### RED FLAGS — page must be held or revised

1. **Duplicate lead paragraphs** — if the lead paragraph uses identical or near-identical wording to another page on the site, rewrite it.

2. **No specific facts** — a page that contains only generic statements ("This exchange is great for beginners") with no verifiable numbers (bonus amounts, fees, user counts, dates) is thin. Every page needs at least 3 specific claims.

3. **FAQ with one-sentence answers** — FAQ answers under 40 words are considered thin. Each answer must explain why, not just what.

4. **Unverified bonus amount** — any exchange page where the bonus amount has not been manually verified in the last 30 days must display "Needs Review" status. Publishing stale data harms credibility and user trust.

5. **Zero editorial differentiation** — a use-case or category page that simply lists exchanges with no scoring rationale, no differentiation, and no editorial context is thin. Include why each exchange was selected for this specific context.

6. **Missing structured data** — pages without JSON-LD structured data are incomplete. All exchange, category, FAQ, and comparison pages require their respective schema blocks.

### YELLOW FLAGS — acceptable but should be improved

1. **Short exchange descriptions** — `shortDescription` under 100 characters should be expanded for richer content signals.

2. **Missing `editorNote`** — exchange pages without an editorial note lack the human voice layer. Add a genuine observation about why this exchange is or isn't recommended.

3. **No internal links to related content** — every page should link to at least 2 related pages using semantic anchor text.

4. **Generic FAQ answers** — FAQ answers that don't reference the specific exchange, coin, or country by name are less useful. Always include the entity name.

---

## Duplicate Content Prevention

### Canonical enforcement

- Every page must have a `<link rel="canonical">` pointing to its own URL
- Pagination (if added) must use canonical + rel="next"/"prev" correctly
- The `/go/[exchange]/` redirect pages must include `noindex` or a canonical pointing to the exchange review

### URL structure rules

- Each exchange must have exactly one canonical page: `/exchanges/[slug]/`
- Bonus-code pages (`/bonus-codes/[slug]/`) must not duplicate exchange review content — they focus on the code mechanic, not the full review
- Country pages, category pages, and use-case pages may overlap in exchange listings but must have unique intro copy and unique structured context (country-specific FAQ ≠ global FAQ)

### Internal anchor text

Follow the anchor diversity rules in `src/utils/internalLinks.ts`. Never repeat the same anchor text for the same destination more than twice on a single page.

---

## Content Ownership

| Page type | Content owner | Update cadence |
|---|---|---|
| Exchange reviews | Editorial team | Monthly (data), Quarterly (prose) |
| Bonus code pages | Editorial team | Bi-weekly |
| Country pages | Editorial team | Quarterly |
| Category pages | Editorial team | Quarterly |
| Use-case pages | Editorial team | Semi-annual |
| Coin pages | Editorial team | Semi-annual |
| Guides | Editorial team | Quarterly |
| FAQ items | contentEngine.ts + editorial overrides | Monthly |

---

## Writing Checklist

Before publishing any piece of content, verify:

- [ ] Verified bonus amount matches official exchange promotion page
- [ ] Last-verified date is set to today or within 30 days
- [ ] Affiliate disclosure is present
- [ ] Risk disclaimer is present
- [ ] All affiliate links have `rel="noopener noreferrer nofollow sponsored"`
- [ ] No guaranteed-returns language
- [ ] No urgency fabrication
- [ ] All country exclusions are listed
- [ ] JSON-LD structured data is present
- [ ] Canonical URL is correct
- [ ] At least 2 internal cross-links
- [ ] FAQ section contains 4+ items with substantive answers
- [ ] Editor note or human observation is present (exchange pages)
