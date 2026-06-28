# CBW Exchange Page + Visual Evidence Standard v1

**Version:** 1.0  
**Date:** 2026-06-27  
**Status:** Active — required for all future exchange pages  
**Applies to:** Bitget, Binance, KuCoin, Gate.io, BingX, HTX, and every subsequent exchange  

---

## 0. Executive Summary

CryptoBonusWorld has three live exchange pages: Bybit, MEXC, and OKX.

**OKX is the reference implementation.** It uses the config-driven template (`ExchangePromoPage.astro` + `ExchangePromoPageConfig`). Every future exchange must follow the OKX pattern — not the Bybit/MEXC inline pattern.

Bybit and MEXC were built as large (~1,100–1,200 line) standalone Astro files before the template existed. They are legacy. Do not replicate them. Do not migrate them unless specifically tasked.

---

## 1. Purpose of Exchange Pages

Exchange pages at `/{exchange}/` serve one primary purpose: convert a visitor into a registered affiliate referral using the canonical promo code embedded in the `/go/{exchange}/` route.

Secondary purposes:
- Establish trust via verified evidence screenshots
- Provide accurate fee and KYC information
- Rank for `{exchange} referral code` and `{exchange} promo code` queries
- Cross-link to related exchanges

Exchange pages are **not**:
- Reviews comparing multiple exchanges
- General crypto education pages
- Exchange listing pages (that is `/exchanges/`)

---

## 2. Page Architecture Standard

### 2.1 File locations

| File | Path |
|---|---|
| Config | `src/data/exchangePages/{exchange}.ts` |
| Live page | `src/pages/{exchange}/index.astro` |
| Preview page | `src/pages/preview/exchange-template/{exchange}.astro` |
| Evidence data | `src/data/evidence/{exchange}.json` |

### 2.2 Page wrapper (live route)

The live page must be a minimal 17-line wrapper. The OKX pattern is canonical:

```astro
---
import CleanLayout from '../../layouts/CleanLayout.astro';
import ExchangePromoPage from '../../components/exchange/ExchangePromoPage.astro';
import { {exchange}Config } from '../../data/exchangePages/{exchange}';
---

<CleanLayout
  title={{exchange}Config.pageTitle}
  description={{exchange}Config.pageDescription}
  canonical={{exchange}Config.canonicalUrl}
  ogImage={{exchange}Config.ogImage}
  ogTitle={{exchange}Config.ogTitle}
  ogDescription={{exchange}Config.ogDescription}
>
  <ExchangePromoPage config={{exchange}Config} />
</CleanLayout>
```

**Never replicate the Bybit/MEXC 1,100+ line inline pattern for new exchanges.** Those files exist as legacy — they are not the pattern to follow.

### 2.3 Required page blocks (rendered by ExchangePromoPage.astro)

Every exchange page must contain these blocks in order:

| # | Block | Purpose |
|---|---|---|
| 1 | Title bar | Browser tab / SEO H1 label |
| 2 | Hero section | Primary CTA conversion block |
| 3 | Quick facts table | Scannable exchange identity |
| 4 | Intro paragraphs | Context, affiliate disclosure |
| 5 | How to claim steps | Conversion funnel |
| 6 | Registration evidence screenshot | Trust signal |
| 7 | Bonus level table | Structured offer info |
| 8 | Bonus extra sections | Realistic caveats, voucher rules |
| 9 | About paragraphs | Exchange identity, market position |
| 10 | Fee table | Decision factor |
| 11 | Fee evidence screenshot(s) | Trust signal |
| 12 | KYC + availability | Legal/access info |
| 13 | Verification table | Evidence-backed claim summary |
| 14 | Verification evidence screenshot | Trust signal |
| 15 | FAQ | Long-tail SEO |
| 16 | Related exchanges | Internal linking |
| 17 | Final/closing CTA | Last conversion attempt |

**Hero section required sub-elements:**
- Dark visual background image (not a plain color gradient unless hero PNG is pending)
- Separate HTML logo/wordmark slot (`ExchangePromoLogoSlot.astro`)
- Promo/referral code box (copy button included)
- Primary CTA button → `/go/{exchange}/`
- Verified/source line (`class="bh-source"`) — styled as subdued text, NOT a CTA

---

## 3. Config System Standard

### 3.1 Use ExchangePromoPageConfig exclusively

All new exchanges must implement `ExchangePromoPageConfig` from `src/data/exchangePages/types.ts`. Do not add custom fields outside the type without first updating the type definition.

### 3.2 Required fields checklist

All fields in `ExchangePromoPageConfig` are required unless marked optional in `types.ts`. The following fields are critical and must never be left as placeholder values on a live page:

**Identity:**
- `slug` — matches directory name and `/go/` route
- `name` — official exchange name
- `affiliateUrl` — must be `/go/{exchange}/` (internal route, no direct affiliate link)
- `promoCode` — canonical code, immutable after owner approval

**Media:**
- `wordmarkImg` — `/logos/{exchange}-wordmark.png` or versioned `-v2.png`
- `heroBackgroundImg` — `/media/hero-backgrounds/{exchange}-hero-custom-v1.png`
- `ogImage` — `/media/exchanges/{exchange}/final/{exchange}-og-final-v1-1200x630.jpg`
- `articleImg` — `/media/exchanges/{exchange}/final/{exchange}-article-final-v1-1200x675.jpg`
- `logoImg` — `/logos/{exchange}.png` (used in related exchange tiles)

**Commercial:**
- `bonusMax` — numeric, matches current offer
- `realisticValue` — plain-language caveat (required — see §13)
- `lastChecked` — month + year string

**Evidence:**
- `evidenceRegistration` — `src`, `alt`, `width`, `height`, `caption`
- `verificationEvidence` — separate screenshot for verification block
- `verificationRows` — at least 4 rows with honest status values

### 3.3 Dual data files

Two separate files serve different consumers:

| File | Consumer | Update when |
|---|---|---|
| `src/data/exchanges.ts` | Homepage cards, `/exchanges/` directory, `ExchangeCard.astro` | Adding new live exchange |
| `src/data/exchanges.json` | `/go/[exchange].astro` redirect handler | Adding new affiliate route |

Both files must be updated when launching a new exchange. Updating only one will cause the live page to work but the `/go/` redirect to fail, or vice versa.

---

## 4. Visual Pack Standard

Every exchange requires exactly 4 core visual assets before a live page can be launched.

### 4A. Hero background

**Path:** `public/media/hero-backgrounds/{exchange}-hero-custom-v1.png`  
**Dimensions:** 2172 × 724 px (match existing standard)  
**Format:** PNG

**Required:**
- Dark background suitable for white HTML overlay
- Sufficient negative space in center for logo slot + code box + CTA
- Exchange identity visible (brand colors, abstract brand elements acceptable)

**Forbidden — do not bake into the hero image:**
- Promo code or referral code text
- Bonus amount (e.g. "up to 30,000 USDT")
- Dates or "June 2026" labels
- Fake UI (account dashboards, balance displays, trade history)
- CTA buttons
- Ratings or star counts
- Any text that will become stale

The exchange logo/wordmark is rendered as a **separate HTML element** on top of the hero image. It must NOT be baked into the hero PNG unless specifically approved as a brand identity element that will not change.

### 4B. OG / social image

**Path:** `public/media/exchanges/{exchange}/final/{exchange}-og-final-v1-1200x630.jpg`  
**Dimensions:** 1200 × 630 px  
**Format:** JPG

Allowed text in image:
- Exchange name or logo
- `REFERRAL CODE` or `PROMO CODE` (generic label)
- `CLICK TO CLAIM`
- `CryptoBonusWorld.com` attribution

**Forbidden:**
- Actual promo code value
- Bonus amount
- Dates
- Guaranteed claim language
- Fake ratings or star counts

### 4C. Article image

**Path:** `public/media/exchanges/{exchange}/final/{exchange}-article-final-v1-1200x675.jpg`  
**Dimensions:** 1200 × 675 px  
**Format:** JPG  
**Use:** Rendered inside exchange page article content area.

**Forbidden:** actual code, bonus amount, dates, fake UI.

### 4D. Homepage / card image

**Path:** `public/media/exchanges/{exchange}/final/{exchange}-card-final-v1-1200x800.jpg`  
**Dimensions:** 1200 × 800 px  
**Format:** JPG  
**Use:** Homepage card grid and `/exchanges/` directory card.

Must work at compact card sizes (grid: 3 desktop / 2 tablet / 1 mobile).

---

## 5. Logo Slot Standard

The exchange logo slot and the hero background image are **two separate systems**. The hero provides the dark background. The logo is rendered as an HTML `<img>` element inside `ExchangePromoLogoSlot.astro`.

### 5.1 Logo assets required

| Asset | Path | Used in |
|---|---|---|
| Wordmark (for dark backgrounds) | `public/logos/{exchange}-wordmark.png` | Hero logo slots (top + bottom) |
| Tile logo (for light backgrounds) | `public/logos/{exchange}.png` | Related exchange tiles |

If a CDN cache issue is discovered with the wordmark, use a versioned filename:  
`public/logos/{exchange}-wordmark-v2.png`  
and update `wordmarkImg` in the config accordingly.  
**Do not overwrite the same filename repeatedly if CDN caching is observed** — this was the OKX lesson (the CDN served a 2119-byte invisible white-on-white file for multiple deploy cycles because the URL never changed).

### 5.2 Wordmark requirements

- Transparent background
- White fill for use on dark hero backgrounds (wordmark asset)
- Black or brand-color fill for light tile backgrounds (tile logo asset)  
- Official-looking — must match the exchange's actual brand identity
- Full wordmark (icon + text) preferred over icon-only, unless the exchange's official identity is icon-only and owner approves
- Not cropped, not blurry, not distorted
- Sized so that at `logoVisualScale: 1.0` (default), the slot renders cleanly at 300×86 px desktop / 235×68 px mobile

### 5.3 Logo slot config fields

```typescript
wordmarkImg: '/logos/{exchange}-wordmark.png',  // dark-bg version
logoImg:     '/logos/{exchange}.png',            // light-bg tile version
logoVisualScale: 1.0,  // reduce to 0.70–0.80 for oversized wordmarks
```

### 5.4 Visual weight across exchanges

Bybit, MEXC, and OKX wordmarks should have comparable visual weight in the hero slot. Future exchanges should match this level — not significantly smaller or larger.

---

## 6. Evidence Screenshot Standard

Evidence screenshots prove that claims on the page are real. They are **not** marketing visuals.

---

### 6.0 Screenshot Slot System

Every exchange article uses a **2-slot default** with an optional 3rd slot.

#### Slot A — Mobile Signup / Referral Proof (mandatory)

| Property | Requirement |
|---|---|
| Viewport | Mobile (390–430px width) |
| Entry method | Via our affiliate link |
| Content | Registration / signup / welcome page |
| Code visibility | Promo or referral code field must be visible |
| Highlight | Required — see §6.0.1 Highlight Treatment |
| Allowed labels | "Promo code applied" / "Referral code applied" / "Bonus code auto-filled" |
| Personal data | None — blur or crop any name, email, phone, or address |
| Format | `.webp` preferred |

**If a mobile screenshot with visible code field is not yet available**, use the best available affiliate landing page screenshot and mark the caption with `[Mobile screenshot pending]`. Do not promote a desktop screenshot to Slot A without noting this.

#### Slot B — Desktop Bonus Proof (mandatory)

| Property | Requirement |
|---|---|
| Viewport | Desktop (1280–1440px) |
| Content | Official bonus / rewards / referral program / welcome page |
| Code visibility | Not required — focus on bonus offer existence |
| Purpose | Proves the bonus offer is real and publicly visible |
| Personal data | None |
| Must differ from Slot A | Yes — Slot B must add unique proof value |

#### Slot C — Additional Evidence (optional, only if unique)

Use Slot C only when it adds proof value that Slot A and Slot B do not provide.

Allowed Slot C subjects:
- Fee schedule (proves fee claims)
- KYC / identity verification page (proves KYC requirement claim)
- Restricted countries / service availability page (proves restriction claims)
- Proof of Reserves page (proves reserve/transparency claims)
- Security / compliance page

**Do not include Slot C if it shows a page already covered by Slot A or Slot B.**  
**Default article standard = 2 screenshots.** 3 screenshots only when the third adds unique proof.

#### Duplicate-removal rule

Before adding any screenshot to a config:
1. Compare SHA256 hashes of all screenshots for the exchange
2. If two or more screenshots are byte-identical → keep only the one that fits its slot best, remove the rest
3. If two screenshots show the same page/state but are different files → keep the higher-quality capture
4. **Never render the same screenshot twice on the same page** — this was confirmed in the OKX audit (registration/bonus/bonus_referral_landing were identical, all SHA256 `284b230899d0...`)

In `ExchangePromoPageConfig`:
- `evidenceBonusPage` is optional (`evidenceBonusPage?`) — remove it rather than using a duplicate
- `verificationEvidence` is required — must be a unique screenshot not already used elsewhere on the page

#### Mobile-first evidence rule

Slot A captures should be taken from a mobile viewport. This serves two purposes:
1. **Conversion relevance** — most users converting on affiliate bonus pages are on mobile
2. **Differentiation** — mobile and desktop captures of the same flow look different enough to add distinct proof value

When both mobile and desktop captures are available showing different parts of the same flow, use:
- Mobile → Slot A (registration/code entry)
- Desktop → Slot B (official bonus page)

---

#### 6.0.1 Highlight Treatment (Slot A)

All Slot A screenshots must include a highlight treatment identifying the promo/referral code field. Unified CBW style:

| Element | Specification |
|---|---|
| Outline | Rounded rectangle, 2–3px stroke |
| Color | White with soft inner glow, OR brand accent color |
| Glow | `box-shadow` style: soft outward blur 6–12px, 30–50% opacity |
| Arrow | Pointing to the highlighted field |
| Label | Short text label placed near the arrow tip |
| Label style | Small chip/pill, same accent color, white text |

Allowed label text:
- `Promo code applied`
- `Referral code applied`  
- `Bonus code auto-filled`

Forbidden in highlight treatment:
- Annotation marks in orange or red (CBW uses white/brand accent)
- Covering any part of the code itself
- Multiple overlapping highlights on the same screenshot

This treatment is applied during screenshot post-processing (PIL, Sharp, or Figma), NOT by the browser or CSS.

---

### 6.1 Minimum evidence set per exchange

| Slot | Subject | Status | Config field |
|---|---|---|---|
| A | Mobile registration / code proof | Mandatory | `evidenceRegistration` |
| B | Desktop official bonus / rewards page | Mandatory | `evidenceBonusPage` (if different from A) or implied by `verificationEvidence` |
| C | Fees / KYC / restrictions / proof of reserves | Optional (only if unique) | `evidenceFeeScreenshots[]` |
| — | Verification section evidence | Required (must be unique) | `verificationEvidence` |

`verificationEvidence` must NOT be a duplicate of `evidenceRegistration` or `evidenceBonusPage`. Use a unique screenshot (fees, proof of reserves, KYC page, or a different state of the bonus flow).

### 6.2 File paths

Evidence screenshots follow two conventions (both are in use):

```
public/screenshots/{exchange}/registration/global-desktop-2026-06.webp
public/screenshots/{exchange}/bonus/global-desktop-2026-06.webp
public/screenshots/{exchange}/fees/global-desktop-2026-06.webp
public/screenshots/{exchange}/bonus_referral_landing/global-desktop-2026-06.webp
```

or, for processed/curated evidence:

```
public/media/exchanges/{exchange}/evidence/global-en/{name}.png
```

Use `.webp` for Playwright-captured screenshots. Use `.jpg` or `.png` for edited/annotated versions.

### 6.3 Metadata (src/data/evidence/{exchange}.json)

Each evidence entry should record:

```json
{
  "src": "/screenshots/{exchange}/fees/global-desktop-2026-06.webp",
  "sourceUrl": "https://www.{exchange}.com/fees",
  "captureDate": "2026-06-XX",
  "viewport": "desktop-1440",
  "geo": "global",
  "claimSupported": "spot maker fee 0.08%",
  "confidenceScore": 0.9,
  "status": "verified",
  "reviewerNote": ""
}
```

Valid status values: `verified` | `public-preview` | `pending` | `outdated`

### 6.4 Forbidden in evidence

- Personal data (name, email, phone, address)
- Account balances or portfolio values
- Logged-in private account screens unless blurred/cropped
- AI-generated or fabricated screenshots
- Screenshots taken from competitor sites

If evidence is missing: show the block with a `pending` state or omit the block entirely. Never fake it.

### 6.5 Evidence captions

Every evidence screenshot must have a `caption` field that states:
1. What the screenshot is from
2. What claim it supports
3. Date captured

Example:  
`OKX fee schedule (desktop) — showing standard spot and futures rates. Screenshot captured June 2026.`

---

## 7. CTA and Link Standard

### 7.1 Hard rule

**All commercial CTAs must route through `/go/{exchange}/`.**

```
/go/bybit/    → https://partner.bybit.com/b/CRYPTOBONUSW
/go/mexc/     → https://www.mexc.com/acquisition/custom-sign-up?shareCode=mexc-CryptoBonus
/go/okx/      → https://okx.com/join/CRYPTOBONUSW
```

The `/go/` route:
- Fires the `cbw_affiliate_click` analytics event
- Handles GEO-aware URL resolution from localStorage
- Returns a static HTML page with `<meta http-equiv="refresh">` fallback for JS-disabled environments
- Is noindex (excluded from sitemap)
- Has canonical pointing to the exchange detail page

### 7.2 Allowed CTA labels

- `Get Bonus`
- `Get {Exchange} Bonus`
- `Get {Exchange} Bonus Now`
- `Claim Bonus →`
- `Claim Bonus`
- `Use Code`
- `Join`

### 7.3 CTA links must never point to

- Official help pages (`/help/...`)
- Official learn pages (`/learn/...`)
- Fee pages
- Terms pages
- Blog posts
- Any non-affiliate URL on the official exchange domain

### 7.4 Source/evidence links

Source links (in `class="bh-source"` or verification tables) may point to official exchange pages:
- Fee schedules
- Terms and conditions
- Rewards center
- Help center articles
- Proof of reserves
- Restricted regions list

**Source links must be visually distinct from CTA buttons** — small grey text, not green buttons.

The `bh-source` element below the hero CTA is `rel="noopener noreferrer nofollow"` and opens in a new tab. It must not be confused with a CTA by visual styling.

### 7.5 /bonus-codes/{exchange}/ gap

The `bonus-codes/{exchange}/` pages currently link directly to the affiliate URL (e.g., `https://okx.com/join/CRYPTOBONUSW`) instead of routing through `/go/okx/`. This means the `cbw_affiliate_click` analytics event does not fire from those pages. This is a known tracking gap — code is functionally correct but analytics coverage is incomplete. Address in a separate pass if analytics coverage of the bonus-codes funnel is needed.

---

## 8. Homepage Card Standard

### 8.1 When to add

An exchange may be added to the homepage card grid only after **all** of the following are true:

- Live page `/{exchange}/` exists and is deployed
- Visual card image `{exchange}-card-final-v1-1200x800.jpg` exists
- `/go/{exchange}/` route is live and redirect is confirmed working
- Promo code is canonical and owner-approved
- Offer data is in `src/data/offers.ts` with honest values

**Never add a homepage card before the live page exists.**

### 8.2 Required fields in src/data/exchanges.ts

```typescript
{
  slug: '{exchange}',
  name: '{Exchange}',
  logoText: '{Exchange}',
  status: 'active',
  cardImage: '/media/exchanges/{exchange}/final/{exchange}-card-final-v1-1200x800.jpg',
  ogImage: '/media/exchanges/{exchange}/final/{exchange}-og-final-v1-1200x630.jpg',
  articleImage: '/media/exchanges/{exchange}/final/{exchange}-article-final-v1-1200x675.jpg',
  affiliateUrl: '/go/{exchange}',       // internal route — no trailing slash here
  officialUrl: 'https://www.{exchange}.com',
  shortDescription: '...',             // one sentence, factual, no guaranteed claims
  featured: true,
  pageUrl: '/{exchange}/',             // required if page is not at /exchanges/{exchange}/
}
```

### 8.3 Required fields in src/data/offers.ts

```typescript
{
  exchangeSlug: '{exchange}',
  promoCode: '{CODE}',
  bonusHeadline: 'Up to X USDT ...',
  realisticValue: '...',              // honest expectation for most users
  lastChecked: 'June 2026',
  sourceUrl: 'https://...',
  kycRequired: true | false,
  depositRequired: true | false,
  availability: 'Global except US',
  status: 'verified' | 'public-preview',
  termsSummary: '...',
}
```

### 8.4 Forbidden in homepage cards

- Fake star ratings
- Fake user counts ("10M+ users chose this")
- "100% working" or "verified always" claims
- Guaranteed bonus amounts
- Investment return promises

---

## 9. Exchange Directory Standard (`/exchanges/`)

`/exchanges/` uses `getFeaturedExchanges()` which filters `src/data/exchanges.ts` for `status: 'active' && featured: true`. An exchange appears automatically once added correctly.

Exchanges without a live page should remain as placeholder cards (`Coming soon`) in the directory — do not set `status: 'active'` until the live page is deployed.

---

## 10. Header Dropdown + Navigation Standard

`src/components/layout/SiteHeader.astro` is **hardcoded** — it is not data-driven. Every exchange must be manually added in two places:

### 10.1 Desktop dropdown

```astro
<a href="/{exchange}/" class="ph-dropdown-link ph-dropdown-featured">{Exchange}</a>
```

### 10.2 Mobile menu

```astro
<a href="/{exchange}/" class="ph-mobile-item ph-mobile-sub">↳ {Exchange}</a>
```

### 10.3 Active state detection

```astro
currentPath.startsWith('/{exchange}')
```

Add to the existing `||` chain in the dropdown `class:list` expression.

**Dropdown links go to `/{exchange}/` — never to `/go/{exchange}/`.**

---

## 11. Related Exchanges Standard

### 11.1 Rules

- Every live exchange page links to 2–3 related exchange pages
- `pageUrl` field in `RelatedExchange` must be the correct live route: `/{exchange}/` not `/exchanges/{exchange}/`
- CTA inside related cards routes to `/go/{exchange}/`
- No dead links — only link to exchanges with live pages

### 11.2 Current mesh

| Page | Related exchanges |
|---|---|
| `/bybit/` | MEXC, OKX |
| `/mexc/` | Bybit, OKX |
| `/okx/` | Bybit, MEXC |

When a 4th exchange goes live, update related arrays on all 4 pages to maintain full cross-linking.

### 11.3 Related tile config

```typescript
relatedExchanges: [
  {
    slug:    '{exchange}',
    name:    '{Exchange}',
    logo:    '/logos/{exchange}.png',  // light-bg tile logo
    bonus:   'Up to X USDT ...',
    tag:     'Code: {CODE}',
    tileBg:  '{hex}',                  // brand accent color for tile background
    pageUrl: '/{exchange}/',
  },
]
```

---

## 12. SEO / Meta / Schema Standard

### 12.1 Required per exchange

| Item | Requirement |
|---|---|
| `pageTitle` | Unique. Pattern: `{Exchange} Referral Code {Year}: Up to {X} USDT Bonus` |
| `pageDescription` | Unique. Include code, bonus range, verification date. Max 160 chars. |
| `canonicalUrl` | `https://cryptobonusworld.com/{exchange}/` |
| `ogImage` | 1200×630 jpg, no stale content |
| `ogTitle` | Short variant of pageTitle |
| `ogDescription` | Short variant of pageDescription |
| noindex | Must NOT be present on live pages |
| noindex | Must be present on `/preview/exchange-template/{exchange}/` |
| FAQPage schema | Required if FAQ block is rendered (auto-generated by ExchangePromoPage.astro) |
| BreadcrumbList | Required (auto-generated by ExchangePromoPage.astro) |

### 12.2 Title pattern

```
{Exchange} Referral Code {Year}: Up to {X,000} USDT {Bonus|Welcome Package|Reward}
```

Example: `OKX Referral Code 2026: Up to 5,000 USDT Welcome Bonus`

Do not use dates beyond the year in the title — months become stale quickly.

### 12.3 Sitemap

Exchange pages are included in the sitemap automatically if built as static routes. Confirm `/sitemap.xml` contains the new route after build.

---

## 13. Content + Disclaimer Standard

### 13.1 Required disclaimer language

Every exchange page must include honest caveats. Required via `realisticValue` field and `bonusExtraSections`:

- The headline bonus amount is the **maximum across all tasks**, not a guaranteed amount for every user
- Bonuses are often issued as trading fee vouchers — not withdrawable cash directly
- Futures/trading tasks carry real risk of capital loss
- Tasks typically expire (e.g. 30 days)

### 13.2 Allowed language

```
"Up to X USDT"
"The full advertised maximum requires completing all tasks within the window."
"Most users completing standard registration and a moderate deposit unlock $X–$Y."
"Bonus vouchers offset trading fees — profits from trading activity are withdrawable."
"We use affiliate links and may earn a commission."
"Offer availability can vary by country and account status."
```

### 13.3 Forbidden language

```
"Guaranteed bonus"
"100% working"
"Everyone gets the full amount"
"Earn X USDT just for signing up"
"No deposit required" (if deposit is required)
```

Never use:
- Fake ratings (star counts, "4.9/5")
- Fake user testimonials
- Competitor promo codes
- Investment outcome promises ("you will profit")
- Copied competitor copy

---

## 14. File Path Conventions

### 14.1 Canonical paths

```
Config:          src/data/exchangePages/{exchange}.ts
Live page:       src/pages/{exchange}/index.astro
Preview page:    src/pages/preview/exchange-template/{exchange}.astro
Evidence data:   src/data/evidence/{exchange}.json

Hero:            public/media/hero-backgrounds/{exchange}-hero-custom-v1.png
OG image:        public/media/exchanges/{exchange}/final/{exchange}-og-final-v1-1200x630.jpg
Article image:   public/media/exchanges/{exchange}/final/{exchange}-article-final-v1-1200x675.jpg
Card image:      public/media/exchanges/{exchange}/final/{exchange}-card-final-v1-1200x800.jpg

Wordmark:        public/logos/{exchange}-wordmark.png
Tile logo:       public/logos/{exchange}.png

Evidence shots:  public/screenshots/{exchange}/{type}/global-desktop-YYYY-MM.webp
Reports:         reports/visual/{task-name}/index.html
```

### 14.2 Versioning

If any asset at a canonical path has been deployed and is CDN-cached, do not overwrite the same file. Increment the version in the filename:

```
okx-wordmark.png  →  okx-wordmark-v2.png
{exchange}-hero-custom-v1.png  →  {exchange}-hero-custom-v2.png
```

Update all config references to point to the new path and redeploy.

### 14.3 Reports

Visual reports in `reports/visual/` must not be staged in git unless specifically owner-approved. They are working documents only.

---

## 15. QA Checklist

Run this checklist before every exchange page deploy.

### Build

- [ ] `npm run build` exits 0
- [ ] Page count matches expected total (add +1 per new exchange page)
- [ ] 0 TypeScript or Astro errors

### Routes

- [ ] `/{exchange}/` builds
- [ ] `/go/{exchange}/` builds (static redirect page)
- [ ] `/exchanges/` includes new exchange card
- [ ] `/` homepage includes new exchange card if applicable
- [ ] `/bonus-codes/{exchange}/` builds if it exists
- [ ] `/preview/exchange-template/{exchange}/` builds if preview exists

### Content

- [ ] Canonical promo code present in built HTML (≥ 3 occurrences on exchange page)
- [ ] No stale promo code from other exchanges
- [ ] No competitor promo codes
- [ ] No fake claim language
- [ ] `CRYPTOBONUSWORLD` not appearing as active promo code
- [ ] `realisticValue` caveat present

### CTA routes

- [ ] Hero CTA href = `/go/{exchange}/`
- [ ] Card CTA href = `/go/{exchange}/` (in ExchangeCard)
- [ ] Final/closing CTA href = `/go/{exchange}/`
- [ ] Source/evidence links do NOT use class `bh-cta-btn` or `ec-cta`

### Visual

- [ ] `heroBackgroundImg` path resolves in built HTML
- [ ] `wordmarkImg` path resolves in built HTML
- [ ] `cardImage` path resolves in built HTML
- [ ] `articleImg` path resolves in built HTML
- [ ] `ogImage` path resolves in built HTML
- [ ] Wordmark PNG confirmed white-on-transparent (composite on dark bg to verify)
- [ ] Logo slot renders at correct scale — not icon-only, not clipped

### SEO

- [ ] canonical URL present and correct
- [ ] No `noindex` on live page
- [ ] `noindex` present on preview page
- [ ] FAQPage schema present if FAQ rendered
- [ ] BreadcrumbList schema present
- [ ] OG title + description set

### Existing pages (regression)

- [ ] `/bybit/` builds, CRYPTOBONUSW present, /go/bybit/ links intact
- [ ] `/mexc/` builds, mexc-CryptoBonus present, /go/mexc/ links intact
- [ ] `/okx/` builds, CRYPTOBONUSW present, /go/okx/ links intact
- [ ] `/` homepage builds
- [ ] `/exchanges/` builds

### Live QA (post-deploy)

- [ ] `https://cryptobonusworld.com/{exchange}/` HTTP 200
- [ ] `https://cryptobonusworld.com/logos/{exchange}-wordmark.png` HTTP 200 + correct file size
- [ ] Live HTML references correct wordmark path (not old cached path)
- [ ] `/go/{exchange}/` page HTTP 200
- [ ] Source/reference: actual affiliate redirect target confirmed in exchanges.json

---

## 16. New Exchange Launch Checklist

### Phase 1 — Data (before any file creation)

- [ ] Canonical promo code confirmed and owner-approved — IMMUTABLE once set
- [ ] Affiliate URL confirmed and tested
- [ ] `/go/{exchange}/` entry planned for `exchanges.json`
- [ ] Bonus max amount confirmed from official source
- [ ] Realistic value statement drafted (most users scenario)
- [ ] Fee data collected from official fee page with source URL
- [ ] KYC requirements confirmed
- [ ] Restricted countries confirmed (especially US, UK, Canada)
- [ ] Bonus expiry / task window confirmed
- [ ] Voucher vs. cash distinction confirmed

### Phase 2 — Evidence (before visual pack)

- [ ] Registration screenshot captured (desktop + mobile)
- [ ] Bonus/rewards page screenshot captured
- [ ] Fee schedule screenshot captured
- [ ] Restrictions/availability source documented
- [ ] Evidence metadata recorded in `src/data/evidence/{exchange}.json`
- [ ] All evidence captions drafted
- [ ] No personal data in any screenshot

### Phase 3 — Visual pack (before config creation)

- [ ] Hero background generated: 2172×724 PNG, no baked code/amount/date
- [ ] OG image generated: 1200×630 JPG, no baked code/amount/date
- [ ] Article image generated: 1200×675 JPG
- [ ] Card image generated: 1200×800 JPG
- [ ] Wordmark PNG created: white on transparent for dark hero
- [ ] Tile logo PNG created: brand color or black on transparent for light tiles
- [ ] Wordmark tested: composited on dark background to confirm it's not invisible

### Phase 4 — Preview

- [ ] `src/data/exchangePages/{exchange}.ts` created with full config
- [ ] Preview route created at `src/pages/preview/exchange-template/{exchange}.astro`
- [ ] `npm run build` passes
- [ ] Visual QA screenshots taken of preview page
- [ ] Preview page confirmed noindex
- [ ] Owner reviews visual QA report

### Phase 5 — Live route

- [ ] `src/pages/{exchange}/index.astro` created (17-line wrapper only)
- [ ] `src/data/exchanges.json` updated with new exchange entry including affiliate URL
- [ ] `npm run build` passes with +1 pages
- [ ] `/go/{exchange}/` redirect confirmed in built HTML
- [ ] Canonical URL correct
- [ ] No noindex on live page

### Phase 6 — Integration

- [ ] `src/data/exchanges.ts` updated (status: 'active', featured: true, pageUrl set)
- [ ] `src/data/offers.ts` updated
- [ ] `src/components/layout/SiteHeader.astro` updated (desktop dropdown + mobile menu + active state)
- [ ] Related exchanges arrays updated on all existing live exchange pages
- [ ] `npm run build` passes — confirm all pages
- [ ] Deploy
- [ ] Live QA per §15
- [ ] IndexNow ping confirms submission

---

## 17. Anti-Patterns — Forbidden Mistakes

These are specific mistakes from the Bybit/MEXC/OKX build history. Do not repeat them.

### Visual

| Mistake | Lesson |
|---|---|
| Baked promo code in hero PNG | Code changes → image becomes stale; always overlay via HTML |
| Baked bonus amount in OG image | Amounts change; keep OG images evergreen |
| White wordmark PNG on white background | Invisible on the page; always test wordmark on dark background before committing |
| Icon-only logo when full wordmark required | Users see an abstract pixel pattern; use icon + text unless exchange identity is icon-only |
| Overwriting same CDN-cached logo filename | CDN serves old version indefinitely; use versioned filenames (`-v2.png`) when cache-busting is needed |
| Deploying a wordmark asset multiple times at the same URL | The 2nd and 3rd deployments appeared to succeed but CDN continued serving the original 2119-byte file |

### Code

| Mistake | Lesson |
|---|---|
| Official `{exchange}.com/learn/...` page as CTA link | Source links are not CTAs; CTAs must use `/go/{exchange}/` |
| Official `{exchange}.com/help/...` page as CTA link | Same rule |
| `git add .` | Stages reports, scripts, and temp files; always stage individual files by name |
| Updating `exchanges.ts` but not `exchanges.json` | The `/go/` route reads JSON; homepage reads TS; both must be in sync |
| Creating live page before visual pack exists | Page launches without working hero/OG; build still passes but page is visually broken |
| Setting `status: 'active'` in exchanges.ts before live route is deployed | Exchange card appears in directory/homepage but page 404s |
| Replicating Bybit/MEXC inline 1,100-line Astro pattern | Use OKX config pattern; inline pages are legacy |
| Using `logoVisualScale` to compensate for a wrong-sized asset | Fix the asset dimensions instead; scale is only for optical tuning |

### Content

| Mistake | Lesson |
|---|---|
| "100% working code" | Forbidden; use "verified {month} {year}" |
| Guaranteed payout language | Use "up to X USDT" with realistic value disclaimer |
| Missing `realisticValue` disclaimer | Required field — never leave as placeholder |
| Competitor promo codes on page | Any competitor code appearing on a CBW page is a critical error |

### Deployment

| Mistake | Lesson |
|---|---|
| Staging reports in git | Reports in `reports/` are working documents; never `git add reports/` |
| Staging scripts in git | Scripts in `scripts/` are development tools; never `git add scripts/` |
| Deploying without running `npm run build` first | Always build and verify page count before deploy |
| Not checking live asset file size post-deploy | `curl -w "%{size_download}"` to confirm CDN is serving the new file, not a cached version |

---

## 18. Current Implementation Gaps

Identified during audit (2026-06-27). Not blocking — informational.

| Gap | Detail | Priority |
|---|---|---|
| Bybit/MEXC use legacy inline pattern | 1,100–1,200 line inline Astro files instead of config-driven `ExchangePromoPage.astro` | Low — works correctly, migration is optional |
| `bonus-codes/{exchange}/` bypasses `/go/` route | Direct affiliate URL means `cbw_affiliate_click` event does not fire | Low — tracking gap only, affiliate attribution works |
| `bybit.ts` and `mexc.ts` exist in `exchangePages/` but may not be used by live pages | Bybit/MEXC live pages are self-contained — config files may be unused or partial | Low — verify before using for anything |
| Evidence metadata (`src/data/evidence/`) not used by Bybit/MEXC inline pages | Only OKX uses the structured evidence system | Low — evidence is still on-page, just not via JSON |
| `exchanges.json` (for `/go/`) and `exchanges.ts` (for UI) are separate files | Dual maintenance required; no single source of truth | Medium — address when adding multiple exchanges at once |

---

## 19. Recommended Next Exchange

**Recommended: Bitget**

Rationale:
- `public/logos/bitget-wordmark-dark.png` already exists
- `public/screenshots/bitget/` directory already exists
- `public/media/exchanges/bitget/` directory already exists
- `src/data/evidence/bitget.json` already exists
- No known promo code conflicts or code mismatch issues

Assets that still need creation before launch: hero PNG, OG, article, card images, light-bg tile logo, full config, evidence screenshot content.

**Do not start Binance next** — there is an open code mismatch issue: `exchanges.json` has `CRYPTOBONW` while the affiliate snapshot has `CRYPTOBONUSW`. Verify with owner before building the Binance page.

---

*Document: `docs/CBW_EXCHANGE_PAGE_VISUAL_EVIDENCE_STANDARD_v1.md`*  
*Owner: CryptoBonusWorld project*  
*Next review: when 4th live exchange is launched*
