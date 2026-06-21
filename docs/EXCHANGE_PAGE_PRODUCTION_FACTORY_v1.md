# Exchange Page Production Factory v1.0
**CryptoBonusWorld.com — CBW Internal Standard**
**Created:** 2026-06-21 | **Status:** Active

This document is the primary operational standard for building and shipping new exchange referral code pages. It is separate from the screenshot pipeline (MASTER_SEO_SCREENSHOT_PAGE_FACTORY.md) and from the template specification (EXCHANGE_PAGE_TEMPLATE_v1_3.md). This document covers the production decision layer: what to build, how to sequence it, what to adopt from industry patterns, what to permanently reject, and how to handle locale variants.

---

## 1. Production Pipeline Overview

```
Exchange selected
    ↓
Exchange object populated (offers.ts + exchange constants)
    ↓
Clone from EXCHANGE_PAGE_TEMPLATE_v1_3.md
    ↓
Schema JSON updated (ALL hardcoded values replaced)
    ↓
Evidence screenshots captured
    ↓
Article banner created (1200×675)
    ↓
OG share image created (1200×630)
    ↓
npm run build — clean required
    ↓
SEO Architect Gate (§10 in MASTER_SEO_SCREENSHOT_PAGE_FACTORY.md)
    → SEO ≥ 85 / AI Search ≥ 85 / Template Safety ≥ 90
    ↓
Static QA (all 30+ checks)
    ↓
Deploy
    ↓
IndexNow ping (auto on deploy)
    ↓
Live QA
```

---

## 2. Exchange Page Anatomy

Every exchange page follows this section order. Section numbers are stable — do not reorder.

| Section | ID | Title pattern | Notes |
|---------|-----|---------------|-------|
| Title bar | 01 | `{exchange.name} Referral Code: {offer.promoCode}` | H1, white strip |
| Brand hero | 02 | Dark gradient, wordmark, code box, CTA | LCP anchor |
| Facts table | 03 | 4-row compact table | Color-locked |
| SEO intro | 03b | Italic phrase + 3-para intro | Parameterized |
| CTA bar | 04 | `Get {exchange.name} Bonus Now` | After intro |
| What is referral code | 05 | `What Is the {exchange.name} Referral Code?` | |
| How to claim | 06 | `How to Claim the {exchange.name} Bonus Code` | Numbered steps |
| Registration screenshot | 07 | Evidence image 1 | Real screenshot required |
| CTA bar | 07b | Second full-width CTA | After screenshot |
| Bonus levels | 08 | `Bonus Levels on {exchange.name}` | Bonus table |
| Other codes | 09 | `Other {exchange.name} Codes People Search For` | Anti-spoof section |
| About | 10 | `About {exchange.name}` | Facts + support + platform |
| Rewards program | 11 | `{exchange.name} Rewards Program` | |
| Other promotions | 12 | `Other {exchange.name} Promotions` | |
| Referral program + banner | 13 | `The {exchange.name} Referral Program` | Clickable article banner |
| Code search variations | 13b | `Code Search Variations` | SEO phrase table |
| Verification table | 14 | `{exchange.name} Bonus Offer — What We Have Verified` | Evidence + badge table |
| FAQ | 15 | `{exchange.name} Referral Code — FAQ` | 6+ questions, FAQPage schema |
| Trading fees | 16 | `{exchange.name} Trading Fees` | fees object |
| Related cards | 17a | `More Verified Crypto Exchange Bonuses` | 4 card grid |
| Looking for a bonus code | 17b-pre | `Looking for a Bonus Code?` | Lower reminder |
| Closing dark hero | 17b | Exact copy of top hero | Second conversion anchor |
| Rating block | 18 | Honest, no fake data | aria-hidden stars |
| Voting block | 19 | localStorage only | No fake global counts |

---

## 3. Competitor Pattern Research — What CBW Adopts and Rejects

**Research basis:** Analysis of cryptocurrencycodes.com (FR Bybit page, FR BitMart page), 2026-06.

---

### A — Adopted Patterns

These patterns improve product clarity, CRO, or SEO without compromising trust.

**Exchange dropdown / site architecture**
Competitor uses a dropdown to navigate across many exchange code pages. CBW adopts this at the architectural level — `/exchanges/`, `/go/`, `/bonus-codes/`, and individual `/{exchange}/` pages form the same navigable site graph. Future: a prominent exchange selector or hub nav on each page would improve cross-page navigation.

**Localized hero labels**
Competitor localizes "Referral Code", "Promo Code", "Get Bonus" copy per market. CBW adopts this principle for any locale expansion: hero labels, CTA copy, and facts table labels must be localized, not just translated (see §4 — Locale Rule).

**Hero code + CTA pattern**
Dark hero with code in a monospace input box + large CTA button below is the highest-converting above-fold pattern in this category. CBW uses it. Keep: wordmark → code box with copy button → primary CTA button → source attribution.

**Compact facts table directly under hero**
A 4-row facts table (exchange name, code, bonus amount, verified date) immediately after the hero gives structured data for both users and crawlers. CBW adopts this.

**Bottom related bonus cards**
A grid of 3–4 competitor exchange cards at the bottom of the page captures users who are comparison-shopping. CBW adopts this with a premium card design (see §5 — Card Standard). Cards must link to internal `/go/{slug}/` routes, not directly to affiliate URLs.

**Large CTA buttons in related cards**
Competitor uses large, high-contrast "GET BONUS" buttons in the bottom cards. CBW adopts large buttons (≥ 52px height, ≥ 160px min-width, font-weight 800) while keeping the design premium and non-aggressive.

**Simple caption style**
Article banner caption matches competitor's sparse format: `{exchange.name} Referral Code: {promoCode}`. Adopted.

**Country / language offer variants after verification**
Competitor surfaces locale-specific offer data (e.g. FR Bybit may have different terms than global). CBW adopts this as a post-launch enhancement: once locale screenshots and offer data are verified, locale variants can be added.

---

### B — Rejected Patterns

These patterns are permanently excluded from CBW regardless of CRO effect.

**Casino / gaming navigation**
Competitor crosses crypto exchanges with casinos and gaming. CBW is a crypto-only bonus aggregator. No casino offers, gaming navigation, or mixed-category sections.

**Fake "100% success" claims**
Competitor displays labels like "100% success rate" or "verified working" with no evidence base. CBW never uses unverifiable success rate claims. Every claim must be traceable to an evidence screenshot or official source URL.

**Fake "Popular" ribbons without real data**
Competitor highlights certain codes as "Popular" without any disclosed traffic or usage data. CBW only adds status or highlight labels when backed by real data (e.g., offer volume, user votes). Until data is available, no popularity ribbons.

**Stale exchange offers**
Competitor pages often carry expired codes for exchanges that no longer operate or have changed their offer. CBW requires `offer.lastChecked` to reflect an actual verification date within the last 90 days. Pages outside this window are flagged for update before new traffic is sent.

**"Working codes" claims without evidence**
Phrases like "working codes", "100% working", "verified working codes" are prohibited on CBW. All offer status uses the three-tier badge system: Verified (green, evidence-backed) / Public Preview (amber, public page visible) / Check in Rewards Hub (blue, account-level).

**Competitor code usage**
Any code that belongs to a competitor's affiliate account must never appear on CBW pages. All promo codes used on CBW must be registered to the CBW affiliate account or be public standard codes.

**Displayed code that does not match final referral URL**
Competitor pages sometimes show a code that differs from the code embedded in the affiliate link. CBW requires the displayed `offer.promoCode` and the code in the `/go/{slug}/` redirect URL to match exactly. Mismatches fail the affiliate compliance audit.

**Tiny logos inside awkward empty boxes**
Competitor logo tiles often show logos at 30–40% of their container's usable area, creating an "icon in a large grey void" effect. CBW requires logos to fill ≥ 75% of the tile's usable area using `width: 100%; height: 100%; object-fit: contain` with minimal padding (≤ 6px).

---

### C — Required Future Locale Rule

**Translation is not enough.** A locale variant is not valid until all of the following are confirmed:

| Check | Requirement |
|-------|-------------|
| Localized hero labels | "Referral Code", "Promo Code", "Get Bonus", source note translated |
| Localized CTA labels | CTA button text matches locale's phrasing norms |
| Localized facts table labels | 4-row table labels (exchange, code, bonus, valid) in locale |
| Locale-specific offer data | `offer.promoCode`, `offer.bonusHeadline`, `offer.lastChecked` verified for locale |
| Final affiliate URL check | `/go/{slug}/` redirect destination confirmed to apply the code in the target locale |
| Locale screenshots | Registration screenshot and rewards screenshot captured in locale language |
| Locale source URL | `offer.sourceUrl` points to the locale-specific bonus page, not global |
| Status verdict | `match` (locale offer = global) / `mismatch` (locale offer differs) / `manual_review` (unverified) |

Locale pages must not go live until status = `match` or `mismatch` (with explicit mismatch notice on page). `manual_review` status = no deploy.

---

## 4. Clone Procedure — Quick Reference

When creating a new exchange page from the Bybit template:

```
1. cp src/pages/bybit/index.astro src/pages/{slug}/index.astro
2. Update exchange object: name, slug, affiliateUrl, officialDomain, supportUrl,
   feeUrl, bonusMax, currency, minDeposit, founded, users, headquarters,
   licence, wordmarkImg, articleImg, logoImg, fees.*
3. Update offer in offers.ts: exchangeSlug, promoCode, bonusHeadline,
   lastChecked, sourceUrl, kycRequired, depositRequired, status
4. *** MANDATORY *** Update schema JSON block (lines ~1122–1170 in Bybit template):
   - Replace all "Bybit" with new exchange name (15 occurrences)
   - Replace "CRYPTOBONUSW" with new promo code (1 occurrence)
   - Update fee values in FAQ Q3 answer (maker/taker rates)
   - Update any hardcoded bonus amounts
5. Fix evidence image alt text (line ~824 in Bybit template) — must use variables
6. Swap all evidence screenshots for new exchange
7. Create article banner (1200×675) and OG image (1200×630)
8. Update relatedExchanges[] — remove the new exchange from related list,
   add a different exchange instead
9. npm run build — must be clean
10. SEO Architect Gate (≥85/85/90)
11. Deploy
```

---

## 5. Related Exchange Card Standard

Cards in section 17a ("More Verified Crypto Exchange Bonuses") follow these specifications:

### Logo Tile
| Property | Value |
|----------|-------|
| Desktop size | 96 × 96px |
| Mobile size | 86 × 86px |
| Logo CSS | `width: 100%; height: 100%; object-fit: contain` |
| Padding | 6px (ensures minimal breathing room without creating void) |
| Border-radius | 12px |
| Background | Brand-tinted color from `ex.tileBg` (no grey fallback that conflicts with logo) |
| Border | None |
| Dark mode | `background-clip: padding-box !important` |

### CTA Button
| Property | Value |
|----------|-------|
| Desktop height | 54px |
| Desktop min-width | 170px |
| Desktop font-size | 15px |
| Font-weight | 800 |
| Border-radius | 10px |
| Background | #55C72F (CBW green) |
| Hover | #46b024 |
| Mobile height | 48px |
| Mobile width | flex: 1 (full-width) |
| Activated state | #0d9488 (teal — deals activated via localStorage) |

### Card Layout
- Desktop: `logo-tile → [name / bonus / tag] → action-column (CTA + View details)`
- Mobile: flex-wrap, logo+info in first row, then CTA+details row full-width
- Gap: 14px (card internal), 10px (between cards)
- No horizontal overflow on any viewport

### CRO Rules
- All "Get Bonus" links → `/go/{exchange.slug}/` (never direct partner URL)
- "View details →" links → `/exchanges/{exchange.slug}/`
- `rel="noopener sponsored"` on all CTA links
- `data-exchange={ex.slug}` for localStorage deal-activated state
- No fake deal counts, no "X people claimed today" copy

---

## 6. SEO Architect Gate — Summary

Minimum thresholds before any exchange page deploys:

| Metric | Minimum |
|--------|---------|
| SEO Architect Score | ≥ 85 / 100 |
| AI Search Readiness | ≥ 85 / 100 |
| Template Safety | ≥ 90 / 100 |
| Build | Clean (0 errors) |
| BYBONUS / competitor codes | 0 |
| "Working codes" language | 0 |
| "Guaranteed bonus" language | 0 |
| Account-level task marked Verified without evidence | 0 |

Full gate definition: `docs/MASTER_SEO_SCREENSHOT_PAGE_FACTORY.md §10`

---

## 7. Affiliate Compliance Checklist

Run before every deploy:

- [ ] All CTA buttons use `/go/{slug}/`
- [ ] No direct `https://exchange.com/register?...` in any CTA button
- [ ] `rel="noopener sponsored"` on all affiliate links
- [ ] `rel="noopener noreferrer nofollow"` on all source / reference links
- [ ] Affiliate disclosure linked in footer
- [ ] Risk disclaimer present
- [ ] No "free money" language
- [ ] No "guaranteed" bonus claims (allowed: "up to X — not guaranteed")
- [ ] `offer.promoCode` displayed = code embedded in `/go/{slug}/` redirect
- [ ] No competitor promo codes anywhere on page

---

## 8. Image Standards

| Image | Dimensions | Format | Notes |
|-------|-----------|--------|-------|
| OG share | 1200 × 630px | JPG | No code/amount/expiry text |
| Article banner | 1200 × 675px | JPG | No code/amount/expiry text |
| Exchange card (future) | 1200 × 800px | JPG | Not currently used |
| Registration evidence | Match device | PNG | Real screenshot, not mocked |
| Rewards evidence | Match device | PNG | Real screenshot, not mocked |
| Evidence — wide | max-width: 740px on page | — | Use `.p2-evidence-img--wide` modifier |
| Logo (related cards) | Original PNG | — | `width: 100%; height: 100%; object-fit: contain` |

Evidence screenshots must never include:
- Blurred or obscured account-sensitive data unless required for privacy
- Dates or amounts that have since changed (re-capture when data changes)
- Third-party watermarks

---

## 9. Change Log

| Date | Version | Change |
|------|---------|--------|
| 2026-06-21 | v1.0 | Initial factory doc created. Competitor pattern research (cryptocurrencycodes.com). Logo tile + CTA button standard. Clone procedure. Locale rule. |
