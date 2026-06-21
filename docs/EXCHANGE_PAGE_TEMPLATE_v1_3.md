# Exchange Page Template v1.3

**Status:** FROZEN — ready for cloning  
**Source page:** `src/pages/bybit/index.astro`  
**Frozen:** 2026-06-20  
**P1 fixes applied:** 2026-06-21  
**Latest build:** Clean — 216 pages, 0 errors  
**Supersedes:** `docs/GOLD_STANDARD_EXCHANGE_TEMPLATE.md` (Sprint 01 specification)

---

## 1. Template Status

### Why it is ready for cloning

The Bybit page has passed a full 18-role audit (Overall: 80/100) and a complete parameterization pass. Every field that varies between exchanges now comes from either the `exchange` object or the `offer` object defined in the Astro frontmatter. Hardcoded Bybit-specific strings have been removed from all prose, headings, CTA text, data attributes, and date fields. The page builds clean and renders identically to the pre-parameterization version.

**Parameterization state — confirmed 2026-06-21 (post P1 fixes):**

| Metric | Count | Status |
|---|---|---|
| Literal `"June 2026"` in source | 0 | ✓ |
| Literal `"CRYPTOBONUSW"` in prose | 0 | ✓ |
| `const alternatives` dead array | 0 | ✓ |
| `cbw_vote_bybit_code` hardcoded | 0 | ✓ |
| `offer.lastChecked` usages | 12 | ✓ |
| `offer.promoCode` usages | 25 | ✓ |
| `offer.sourceUrl` in bh-source hrefs | 2 | ✓ |
| `exchange.name` usages | 105 | ✓ |
| `exchange.officialDomain` in facts table + bh-source text | 3 | ✓ |
| `exchange.supportUrl` in support link | 1 | ✓ |
| `exchange.feeUrl` in fee section links | 3 | ✓ |
| `exchange.fees.*` usages | 11 | ✓ |
| `exchange.affiliateUrl` CTA hrefs (trailing slash) | 8 | ✓ |
| Hardcoded `/go/bybit` hrefs (no slash) | 0 | ✓ |
| `toLocaleString()` without `'en-US'` locale | 0 | ✓ |
| `aria-label` on wordmark CTAs | 2 | ✓ |
| Evidence img declared 1080×1947 | ✓ | ✓ |

### Non-blocking backlog (post-next-exchange cleanup)

| ID | Item | Priority |
|---|---|---|
| B1 | Add `<link rel="preload">` for LCP wordmark in `CleanLayout.astro` | P1 |
| B2 | ~~Reduce Inter from 6 to 4 font weights in `CleanLayout.astro`~~ | ✅ Done 2026-06-21 — `wght@500;700;800;900` |
| B3 | Add `WebPage` schema with `dateModified` to JSON-LD | P2 |
| B4 | Add visible "Last Updated" dateline to page body | P2 |
| B5 | Remove rating block (5 grey stars, "No ratings yet") | P2 |
| B6 | Verification table sticky first column at 390px | P2 |
| B7 | Add `hreflang` tags for future localization | P2 |
| B8 | Clean up unused Bybit images in `/share/`, `/cards/` | P3 |
| B9 | Move `source/bybit-visual-master.png` out of `/public/` | P3 |

None of the above block the next exchange clone.

---

## 2. Required Data Fields — Exchange Object

Every exchange page must define the following `exchange` object in the Astro frontmatter.

```ts
const exchange = {
  // Identity
  name:            'ExchangeName',        // Display name, e.g. 'MEXC', 'Bitget'
  slug:            'exchange-slug',       // URL slug, e.g. 'mexc', 'bitget'
  officialDomain:  'exchange.com',        // Root domain only, e.g. 'bybit.com', 'mexc.com'

  // Routing
  affiliateUrl:    '/go/exchange-slug/',  // ALWAYS internal /go/ route WITH trailing slash

  // External URLs — parameterized per exchange
  supportUrl:      'https://help.exchange.com',                    // Official help/support URL
  feeUrl:          'https://www.exchange.com/en/announcement-info/fee-rate', // Official fee page URL

  // Bonus data
  bonusMax:        10000,                 // Numeric, e.g. 8000 (no USDT suffix here)
  currency:        'USDT',               // Currency string, e.g. 'USDT', 'USD'

  // Exchange facts (for About section + facts table)
  minDeposit:      100,                   // Minimum deposit in USD (used in prose)
  founded:         2018,                  // Founding year (integer)
  users:           '30M+',               // Registered user count (string, from official source)
  headquarters:    'Dubai, UAE',          // City, Country
  licence:         'Dubai VARA',          // Primary regulatory licence

  // Images — all paths relative to /public/
  wordmarkImg:     '/logos/{slug}-wordmark-official.png', // Dark-background wordmark
  logoImg:         '/logos/{slug}.png',                   // Square/brand logo
  articleImg:      '/media/exchanges/{slug}/article/{slug}-article-1200x675.jpg',
  cardImg:         '/media/exchanges/{slug}/cards/{slug}-card-1200x800.jpg',
  // ogImage is set directly in CleanLayout props (see section 7)

  // Fees (non-VIP standard rates, verified from official fee page)
  fees: {
    spot:    { maker: '0.1%',   taker: '0.1%'   },
    futures: { maker: '0.02%',  taker: '0.055%' },
    options: { maker: '0.02%',  taker: '0.03%'  },
  },
};
```

### Field notes

**`slug`:** Must match the key in `offers.ts`, the `/go/[exchange].astro` route, and the media directory name under `public/media/exchanges/`. All three must be identical.

**`affiliateUrl`:** Always `/go/{slug}/` with a trailing slash — never `https://partner.exchange.com/...`. Trailing slash required: the Astro static build generates `/go/{slug}/index.html`; omitting the slash causes a 301 redirect on every CTA click. Direct partner URLs are forbidden in any CTA or link that a user clicks.

**`officialDomain`:** Root domain only, no protocol, no `www` prefix — e.g. `'bybit.com'`, `'mexc.com'`. Do not derive from `exchange.name` because some exchange domains do not match the brand name (Gate.io → `'gate.io'`, BingX → `'bingx.com'`). Rendered in the compact facts table and the `bh-source` verified line in both heroes.

**`supportUrl`:** Full HTTPS URL to the exchange's official help/support center, e.g. `'https://help.bybit.com'`. Used in the About › Support paragraph as a link. Do not invent support pages — verify the URL exists before adding it.

**`feeUrl`:** Full HTTPS URL to the exchange's official fee schedule page, e.g. `'https://www.bybit.com/en/announcement-info/fee-rate'`. Used in three places in the fees section (intro link, footnote, disclaimer). Always link to the official schedule, not a third-party fee comparison.

**`bonusMax`:** Integer only. The rendered value uses `.toLocaleString('en-US')` to add US-format thousands separators (comma). Always pass `'en-US'` — omitting the locale argument produces locale-dependent output (e.g. `30 000` with a thin space on non-US build environments). Do not include "USDT" here — that comes from `exchange.currency`.

**`wordmarkImg`:** Must be a dark-background version of the official exchange logo. The hero background is always dark (`#0d1117` → `#1a1f2e`). A logo designed for light backgrounds will be invisible.

**`fees`:** All values are strings (e.g. `'0.1%'`). If the exchange does not offer a product category (e.g. no options), omit that key and remove the corresponding table row from the fees section.

### Related exchanges block

At the top of the file, define the 4 exchanges shown in the "More Verified Bonuses" section. Exclude the current exchange. Choose 4 from the active CBW exchange roster.

```ts
const relatedExchanges = [
  { slug: 'bybit',  name: 'Bybit',  logo: '/logos/bybit.png',  bonus: 'Up to 30,000 USDT', tag: 'Derivatives leader', tileBg: '#F0F4FF' },
  { slug: 'bitget', name: 'Bitget', logo: '/logos/bitget.png', bonus: 'Up to 6,200 USDT',  tag: 'Copy trading',       tileBg: '#ECFDF5' },
  { slug: 'bingx',  name: 'BingX',  logo: '/logos/bingx.png',  bonus: 'Up to 5,125 USDT',  tag: 'Social trading',     tileBg: '#EFF6FF' },
  { slug: 'okx',    name: 'OKX',    logo: '/logos/okx.png',    bonus: 'Up to 10,000 USDT', tag: 'CEX + Web3',         tileBg: '#F3F4F6' },
];
```

### Brand hero design tokens

These control the hero background gradient and accent colours. Bybit uses dark navy + gold. Each exchange should use its own brand palette.

```ts
const brandHeroTokens = {
  'bh-bgFrom':     '#0d1117',              // Dark gradient start
  'bh-bgTo':       '#1a1f2e',              // Dark gradient end
  'bh-text':       '#ffffff',
  'bh-text2':      'rgba(255,255,255,0.65)',
  'bh-accent':     '#f7a600',              // Exchange accent colour
  'bh-codeBg':     'rgba(247,166,0,0.10)',
  'bh-codeBorder': 'rgba(247,166,0,0.40)',
  'bh-note':       'rgba(255,255,255,0.38)',
};
```

---

## 3. Offer Fields — `src/data/offers.ts`

Every exchange page calls `getOffer('slug')` to get volatile offer data. Add a new entry to `offers.ts`:

```ts
{
  exchangeSlug:        'mexc',
  promoCode:           'MEXC-CODE-HERE',
  bonusHeadline:       'Up to 8,000 USDT Welcome Package',
  realisticValue:      'New users typically earn $X–$Y depending on deposit size and trading activity',
  feeDiscount:         'Up to X% fee discount on select trading pairs',   // optional
  lastChecked:         'June 2026',          // Month Year — updated on each re-verification
  sourceUrl:           'https://www.mexc.com/...', // Official promo/welcome page URL
  kycRequired:         true,
  depositRequired:     true,
  minDeposit:          'Minimum deposit varies by bonus tier',
  availability:        'Global (excluding restricted regions)',
  restrictedCountries: ['US', 'GB', ...],   // ISO 3166-1 alpha-2
  status:              'verified',
  termsSummary:        'New accounts only. KYC required to withdraw. ...',
}
```

### Field rules

| Field | Rule |
|---|---|
| `promoCode` | The actual active referral/promo code. Never `BYBONUS` or a stale code. |
| `lastChecked` | Must be updated on every re-verification. Format: `'Month YYYY'`. |
| `sourceUrl` | The official exchange page where the bonus was verified. Public page only. |
| `restrictedCountries` | ISO codes. Used in FAQ and page body for GEO compliance. |
| `status` | Only `'verified'` entries appear on pages (`getOffer` filters out `'expired'`). |
| `bonusHeadline` | Short string for card and hero use. Must not be a guaranteed amount. |
| `realisticValue` | For internal use / trust copy. Not rendered in hero. |

---

## 4. Required Image Pack

For each new exchange, create the following files before launching the page. All images must be **evergreen** (no code, no amount, no date, no temporary terms).

### Directory structure

```
public/media/exchanges/{slug}/
├── share/
│   └── {slug}-og-1200x630.jpg       ← OG / social preview
├── article/
│   └── {slug}-article-1200x675.jpg  ← Article body banner
├── cards/
│   └── {slug}-card-1200x800.jpg     ← Homepage exchange card
├── evidence/
│   └── global-en/
│       ├── {slug}-signup-code-applied-mobile.png   ← Sign-up evidence
│       ├── {slug}-public-welcome-rewards.png        ← Public bonus page evidence
│       └── manifest.json
└── source/
    └── {slug}-visual-master.png     ← Source file (NOT in /public/ — move before launch)
```

### Image specifications

| Asset | Dimensions | Format | Max size | Colour profile |
|---|---|---|---|---|
| OG / social preview | 1200×630 | JPG Q90 | 400 KB | sRGB |
| Article banner | 1200×675 | JPG Q90 | 200 KB | sRGB |
| Homepage card | 1200×800 | JPG Q90 | 200 KB | sRGB |

### Evergreen content rule

**Allowed in static images:**
- Exchange name and logo
- Generic label: "Referral Code" or "Bonus Code" (label only, no value)
- Generic CTA: "Claim Bonus", "Get Bonus", "Sign Up"
- CryptoBonusWorld branding
- Exchange brand colours and visual identity

**Banned in static images:**
- Actual promo/referral code string (e.g. `CRYPTOBONUSW`)
- Bonus amount (e.g. "Up to $30,000 USDT", "$30K+")
- Date or validity period (e.g. "June 2026")
- Verification status claim (e.g. "Verified ✓")
- Any text that would become false if the offer changes

See `docs/VISUAL_PROMO_CODE_STANDARD.md` for full enforcement rules.

### Resize workflow

Use `scripts/optimize-bybit-images.mjs` as the template for a new `scripts/optimize-{slug}-images.mjs`. Key settings:
- `sharp` from project `node_modules` (via `createRequire`)
- `kernel: 'lanczos3'`
- `fit: 'cover', position: 'centre'`
- `jpeg({ quality: 90, mozjpeg: true })`
- Check output size; if > 400 KB retry at quality 82

---

## 5. Required Evidence Pack

Evidence is not the same as illustrations. Evidence files document a specific verification at a point in time.

### Minimum required evidence files

| File | Required | Notes |
|---|---|---|
| `{slug}-signup-code-applied-mobile.png` | Yes | Registration page showing code pre-filled in referral field |
| `{slug}-public-welcome-rewards.png` | Yes if public page exists | Official exchange public bonus/welcome page |
| Fees source screenshot | Recommended | Official fee page if fees are displayed on exchange page |
| Restricted countries source | Recommended if quoted | Official page or help article |

### Capture standard

- Device: Any modern mobile (Samsung Galaxy or similar)
- Browser: Official exchange app or mobile browser
- Language: English UI
- Screenshot: Full-width mobile capture, include address bar if possible
- No annotations that include promo codes or bonus amounts
- Capture date must be recorded in `manifest.json`

### Manifest format

`public/media/exchanges/{slug}/evidence/global-en/manifest.json`:

```json
{
  "locale": "global-en",
  "exchange": "{slug}",
  "lastUpdated": "2026-06-XX",
  "items": [
    {
      "id": "signup-code-applied-mobile",
      "file": "{slug}-signup-code-applied-mobile.png",
      "type": "registration-flow",
      "capturedAt": "2026-06-XX",
      "capturedBy": "manual-mobile",
      "device": "Samsung Galaxy S21+",
      "browser": "Samsung Internet",
      "ui": "English",
      "notes": "Referral code {CODE} pre-filled on sign-up page",
      "status": "active"
    },
    {
      "id": "public-welcome-rewards",
      "file": "{slug}-public-welcome-rewards.png",
      "type": "bonus-page",
      "capturedAt": "2026-06-XX",
      "capturedBy": "manual-desktop",
      "notes": "Public welcome rewards page showing reward tiers",
      "status": "active"
    }
  ]
}
```

---

## 6. Verification Status Rules

The verification table on each exchange page uses three badge types only.

### Badge definitions

| Badge | CSS class | When to use |
|---|---|---|
| **Verified** | `status-verified` (green) | CryptoBonusWorld independently confirmed this fact from a public or account-level source. Must have a matching evidence file or a direct citation. |
| **Public preview** | `status-public-preview` (amber) | Visible on an official public page but not independently confirmed at account level (e.g. a reward tier chart). |
| **Check in Rewards Hub** | `status-check-hub` (blue) | Cannot be independently confirmed without an account. Requires the user to verify after sign-up. |

### What these badges are used for

| Claim | Correct badge |
|---|---|
| Code applied at registration | Verified (if screenshot exists) |
| Welcome offer page exists | Verified (public page screenshot) |
| Reward tiers visible publicly | Public preview |
| Identity verification / KYC unlocks reward | Verified (if official FAQ or public page confirms) |
| Deposit tasks, amounts, thresholds | Check in Rewards Hub |
| Trading tasks, volume milestones | Check in Rewards Hub |
| Claim period / expiry dates | Check in Rewards Hub |

### What is NEVER permitted in the verification table

- `status-verified` on deposit/trading/claim tasks without account-level evidence
- "Guaranteed $100 sign-up bonus" — all amounts are conditional
- "Up to $30,000 guaranteed" — amounts depend on tasks completed
- Fake star ratings (e.g. 4.8 out of 5 stars with fabricated review count)
- Fake usage statistics ("10,000 users claimed this week")

---

## 7. SEO and Schema Requirements

### Title pattern

```
{exchange.name} Referral Code 2026: {offer.promoCode} — Up to {exchange.bonusMax.toLocaleString()} {exchange.currency} Bonus
```

Example: `Bybit Referral Code 2026: CRYPTOBONUSW — Up to 30,000 USDT Bonus`

- Keep under 70 characters. If the promo code is long, abbreviate the bonus suffix.
- Include the year. Update annually.

### Meta description pattern

```
{exchange.name} promo code {offer.promoCode} — up to {exchange.bonusMax.toLocaleString('en-US')} {exchange.currency} welcome package + fee discount. Verified {offer.lastChecked}. Enter code at registration before your first deposit.
```

- Target 150–160 characters.
- Include code, bonus amount, verified date, and action instruction.

### OG tags

```ts
ogImage="/media/exchanges/{slug}/share/{slug}-og-1200x630.jpg"
ogTitle={`${exchange.name} Referral Code: ${offer.promoCode} — Claim Bonus`}
ogDescription={`Use ${exchange.name} referral code ${offer.promoCode} to claim welcome rewards up to ${exchange.bonusMax.toLocaleString('en-US')} ${exchange.currency}. Verified ${offer.lastChecked} by CryptoBonusWorld.`}
```

### H1 pattern

```astro
<h1>{exchange.name} Referral Code: {offer.promoCode}</h1>
```

- One H1 per page only.
- Must include the promo code.
- Rendered in the white title bar above the dark hero.

### H2 structure (12 sections)

1. What Is the `{exchange.name}` Referral Code?
2. How to Claim the `{exchange.name}` Bonus Code
3. Bonus Levels on `{exchange.name}`
4. Other `{exchange.name}` Codes People Search For
5. About `{exchange.name}`
6. `{exchange.name}` Rewards Program
7. Other `{exchange.name}` Promotions
8. The `{exchange.name}` Referral Program
9. `{exchange.name}` Bonus Offer — What We Have Verified
10. `{exchange.name}` Referral Code — FAQ
11. `{exchange.name}` Trading Fees
12. More Verified Crypto Exchange Bonuses

Adapt section names to the exchange. If the exchange uses "Invite Code" instead of "Referral Code", reflect that.

### Canonical URL

```astro
canonical="https://cryptobonusworld.com/{slug}/"
```

Always the root-level slug path (`/bybit/`, `/mexc/`), not `/exchanges/{slug}/`.

### JSON-LD schema (`<script is:inline type="application/ld+json">`)

Required: `BreadcrumbList` + `FAQPage` in a single `@graph` block.

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://cryptobonusworld.com/" },
        { "@type": "ListItem", "position": 2, "name": "{exchange.name} Referral Code", "item": "https://cryptobonusworld.com/{slug}/" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        // 6 Q&A items — see FAQ section below
      ]
    }
  ]
}
```

**Important:** The JSON-LD block uses `<script is:inline>` which bypasses Vite. Astro template variables (`{exchange.name}`) do NOT work inside this block. Write the exchange name and code as literal strings. Update manually when cloning.

**Backlog (non-blocking):** Add `WebPage` type with `dateModified`, `datePublished`, `url`, `author` after next exchange is live.

### FAQ content (6 questions, minimum)

Every exchange page must include these 6 question categories. Adapt the answers to the specific exchange:

1. Do I have to make a cryptocurrency deposit?
2. Can I get more than one `{exchange.name}` bonus?
3. What are the `{exchange.name}` fees?
4. Which currency are rewards paid in?
5. Can existing users use the referral code?
6. Is the `{exchange.name}` bonus available in every country?

FAQ answers must:
- Be substantive (2–3 sentences minimum)
- Not claim guaranteed amounts
- Reference account-level items as "check inside your account after registering"
- Match the visible HTML text exactly (JSON-LD FAQ text must mirror the `<details>` text)

---

## 8. CRO Requirements

### Hero code copy block

The top dark hero must include:
1. Exchange wordmark (clickable, links to `exchange.affiliateUrl`)
2. "PROMO CODE" label
3. Code display box with one-click copy button
4. Primary green CTA button: "Get Bonus"
5. Verified source line: `Verified {offer.lastChecked} on [Exchange.com]`

### CTA placement (8 CTAs total)

| Position | Element | Text pattern | Route |
|---|---|---|---|
| Top hero | Wordmark `<a>` | (image link) | `exchange.affiliateUrl` |
| Top hero | Green button | "Get Bonus" | `exchange.affiliateUrl` |
| After intro text | Full-width bar | "Get {exchange.name} Bonus Now" | `exchange.affiliateUrl` |
| After evidence screenshot | Full-width bar | "Get {exchange.name} Bonus Now" | `exchange.affiliateUrl` |
| Referral Program section | Full-width bar | "Use {offer.promoCode} on {exchange.name}" | `exchange.affiliateUrl` |
| Closing hero | Wordmark `<a>` | (image link) | `exchange.affiliateUrl` |
| Closing hero | Green button | "Get Bonus" | `exchange.affiliateUrl` |

**Rule:** Every `href` that a user can click for the affiliate action must go to `/go/{slug}/`. Direct partner URLs (`https://partner.exchange.com/...`) are banned in all rendered CTAs. No exceptions.

### Article banner CTA

The article banner image in the Referral Program section must be:
- Wrapped in `<a href={exchange.affiliateUrl} rel="noopener sponsored">`
- Image `src` from `exchange.articleImg`
- `alt` from `{`${exchange.name} referral code bonus illustration for CryptoBonusWorld`}`

### `/go/` redirect route

Each new exchange needs a corresponding redirect page at `src/pages/go/[exchange].astro`. This already handles all CBW exchanges. Confirm the slug exists in `exchanges.json` before launching.

### Related exchanges block

Shows 4 related exchanges at the bottom. Each card has:
- Logo + exchange name + bonus amount + tag
- "Get Bonus" button → `/go/{slug}/`
- "View details →" link → `/exchanges/{slug}/`
- `data-exchange={ex.slug}` on the button (for "Deal Activated" localStorage state)

### Vote / helpful block

At the very bottom (after the closing hero):
```html
<div data-vote-widget="code-helpfulness"
     data-exchange={exchange.slug}
     data-code={offer.promoCode}>
```

The localStorage key is generated dynamically: `'cbw_vote_' + exchangeSlug + '_code'`.  
Pass both `promoCode` and `exchangeSlug` via `<script define:vars={{ promoCode: offer.promoCode, exchangeSlug: exchange.slug }}>`.

---

## 9. Accessibility and Performance Requirements

### Wordmark CTA links (WCAG 2.4.4)

Both wordmark `<a>` elements (top hero + closing hero) must have:
```astro
aria-label={`Get ${exchange.name} bonus`}
```
Without this, screen readers announce "Bybit, link" with no link purpose described.

### LCP image hints

The hero wordmark `<img>` (first above-fold image) must have:
```html
fetchpriority="high"
```
Do NOT add `fetchpriority="high"` to the closing hero wordmark (below fold).

Backlog: Add `<link rel="preload" as="image" href={exchange.wordmarkImg} />` in `CleanLayout.astro` once the layout change is approved (affects all pages, not just exchange pages).

### Image optimization rules

- All article and card images must be JPG (not PNG)
- Article banner: ≤200 KB, exactly 1200×675
- Card image: ≤200 KB, exactly 1200×800
- OG image: ≤400 KB, exactly 1200×630
- Declared `width` and `height` attributes must match the actual file dimensions
- Evidence images: `loading="lazy"` + `decoding="async"`; declared dimensions must match actual file

### Mobile table strategy

Tables with 4+ columns will overflow at 390px. Wrap all tables in:
```html
<div class="p2-table-wrap">
  <table class="p2-table">...</table>
</div>
```

`.p2-table-wrap` has `overflow-x: auto`. This is the accepted approach. Do not attempt to collapse tables into stacked rows (design decision).

Backlog: For the verification table specifically, consider making the Status column sticky (`position: sticky; right: 0`) so users can see the verdict without scrolling.

### No horizontal document overflow

The page must have zero horizontal document scroll on 390px viewport. Verify with:
```js
document.documentElement.scrollWidth === window.innerWidth
```

If any element causes overflow, add `overflow-x: hidden` to the containing section, not to the whole document.

### Samsung dark mode override

The page uses `@media (prefers-color-scheme: dark)` overrides throughout to prevent Samsung One UI from inverting light-only components. Do not remove these overrides. The hero is intentionally dark and is excluded from the overrides.

Add `color-scheme: light; forced-color-adjust: none` to any new light-fixed component.

---

## 10. Clone Checklist

Complete these steps in order to create a new exchange page from the template.

### Pre-work (before touching any code)

- [ ] Verify the exchange is active and accepting new users
- [ ] Obtain the active referral/promo code and confirm it works at registration
- [ ] Identify the official public bonus/welcome page URL (→ `offer.sourceUrl`)
- [ ] Identify the official help/support center URL (→ `exchange.supportUrl`)
- [ ] Identify the official fee schedule page URL (→ `exchange.feeUrl`)
- [ ] Note the exchange's root domain (→ `exchange.officialDomain`)
- [ ] Check restricted countries list from the official exchange source
- [ ] Confirm fee rates from the official fee page
- [ ] Screenshot the registration flow with code applied (mobile preferred)
- [ ] Screenshot the public welcome/bonus page (desktop or mobile)
- [ ] Note the exchange founding year, headquarters, licence, user count

### Image pack

- [ ] Create `public/media/exchanges/{slug}/` directory structure (share, article, cards, evidence/global-en, source)
- [ ] Generate or obtain OG image (1200×630, evergreen — no code/amount/date)
- [ ] Generate or obtain article banner (1200×675, evergreen)
- [ ] Generate or obtain card image (1200×800, evergreen)
- [ ] Place evidence screenshots in `evidence/global-en/`
- [ ] Create `evidence/global-en/manifest.json` with capture metadata
- [ ] Run `scripts/optimize-{slug}-images.mjs` (copy from Bybit script, update paths)
- [ ] Verify no image exceeds size limits (OG ≤400 KB, article/card ≤200 KB)

### Offers data

- [ ] Add new entry to `src/data/offers.ts`
- [ ] Set `promoCode`, `lastChecked`, `sourceUrl`, `restrictedCountries`, `status: 'verified'`
- [ ] Confirm `getOffer('{slug}')` returns the new offer (it will — no build step required)

### Exchange page

- [ ] Copy `src/pages/bybit/index.astro` → `src/pages/{slug}/index.astro`
- [ ] Update `getOffer('{slug}')` call (line 5)
- [ ] Update the `exchange` object — ALL fields including the three new URL fields:
  - [ ] `name`, `slug`, `officialDomain` — e.g. `'mexc.com'`
  - [ ] `affiliateUrl` — `/go/{slug}/` (trailing slash required)
  - [ ] `supportUrl` — official help center URL for this exchange
  - [ ] `feeUrl` — official fee schedule page URL for this exchange
  - [ ] `bonusMax`, `currency`, `minDeposit`, `founded`, `users`, `headquarters`, `licence`
  - [ ] All image paths (`wordmarkImg`, `articleImg`, `logoImg`)
  - [ ] `fees.spot`, `fees.futures`, `fees.options` (omit rows that don't apply)
- [ ] Update `relatedExchanges` (remove the new exchange, add a different one)
- [ ] Update `brandHeroTokens` (match exchange brand colours)
- [ ] Update `CleanLayout` props: `canonical`, `ogImage`
- [ ] Update all prose sections: About, Fees, Verification table, FAQ, Referral Program
- [ ] Update JSON-LD `<script is:inline>`: BreadcrumbList name/item, FAQ text (these are literal strings — not parameterized)
- [ ] **Do NOT leave any Bybit-specific URLs**: verify `supportUrl`, `feeUrl`, `bh-source` href (`offer.sourceUrl`), fees text, and About/Support text all reference the new exchange, not Bybit
- [ ] Update verification table evidence image `src` paths and alt text
- [ ] Update evidence figure `src` paths

### Build and QA

- [ ] Run `npm run build`
- [ ] Confirm build is clean (0 errors, 0 warnings)
- [ ] Run full QA checklist (Section 11)

### Commit (do not deploy yet)

- [ ] Stage: `src/pages/{slug}/index.astro`, `src/data/offers.ts`, all new image files
- [ ] Do NOT stage `SiteHeader.astro` or unrelated files
- [ ] Commit message: `feat: add {exchange.name} referral code page`

---

## 11. QA Checklist Before Deploy

Run against the built `/dist/{slug}/index.html`.

### Code and routing

- [ ] Promo code is present and correct (search for the code in built HTML)
- [ ] BYBONUS or any stale code = 0 occurrences
- [ ] Previous exchange's promo code = 0 occurrences
- [ ] All CTA `href` values = `/go/{slug}/` with trailing slash (8 total)
- [ ] No direct partner URL (`https://partner.exchange.com/...`) in any CTA
- [ ] All CTA `href` values use `/go/` not the partner URL directly

### Content

- [ ] H1 renders `{exchange.name} Referral Code: {offer.promoCode}`
- [ ] Page title includes code, year, and bonus amount
- [ ] Bonus amount renders as `30,000` (comma), not `30 000` (thin space) — `toLocaleString('en-US')` required
- [ ] Exchange name appears throughout page body (not previous exchange name)
- [ ] No hardcoded date strings (all from `offer.lastChecked`)
- [ ] No "guaranteed $X" language
- [ ] No fake star ratings or fabricated usage counts
- [ ] Deposit/Trading/Claim tasks are `status-check-hub` (blue), not `status-verified` (green)

### Parameterized fields

- [ ] Compact facts table domain cell shows `exchange.officialDomain` value (not previous exchange's domain)
- [ ] Both `bh-source` text nodes show `exchange.officialDomain` (not a hardcoded exchange name)
- [ ] Both `bh-source` href attributes resolve to `offer.sourceUrl` (the promo/welcome page for this exchange)
- [ ] About › Support paragraph links to `exchange.supportUrl` with `{exchange.name} Help Center` link text
- [ ] Fees section: all three fee links resolve to `exchange.feeUrl` (the fee schedule for this exchange)
- [ ] No Bybit fee/support/source URLs remain unless this is the Bybit page
- [ ] No `bybit.com`, `help.bybit.com`, or `bybit.com/en/announcement-info/fee-rate` in any cloned page

### Schema

- [ ] `FAQPage` schema present in built HTML
- [ ] `BreadcrumbList` schema present in built HTML
- [ ] FAQ schema `name` and `text` match visible HTML text

### Images

- [ ] OG image path returns 200 (file exists)
- [ ] Article banner loads (check in browser)
- [ ] Card image loads on homepage
- [ ] Both evidence screenshots load
- [ ] No evidence image has `fetchpriority="high"` (evidence is below fold)
- [ ] Hero wordmark image has `fetchpriority="high"` (one instance only)

### Accessibility

- [ ] Both wordmark `<a>` elements have `aria-label="Get {exchange.name} bonus"`
- [ ] No CTA link has empty accessible text
- [ ] Evidence images have descriptive `alt` text (include code name)
- [ ] FAQ uses `<details>`/`<summary>` pattern

### Performance

- [ ] Article banner ≤200 KB
- [ ] Card image ≤200 KB
- [ ] OG image ≤400 KB
- [ ] Declared `width`/`height` on all images match actual file dimensions
- [ ] No image is PNG format in article/card/OG roles (must be JPG)

### Mobile

- [ ] No horizontal document overflow at 390px (`scrollWidth === innerWidth`)
- [ ] Hero CTA button width ≤90% of viewport
- [ ] Tables wrapped in `.p2-table-wrap` with `overflow-x: auto`

### Build

- [ ] `npm run build` exits 0
- [ ] 0 TypeScript errors
- [ ] New page appears in build output list
- [ ] Total page count incremented by 1

---

## Appendix A — Offer interface

```ts
export interface Offer {
  exchangeSlug:        string;
  promoCode:           string;
  bonusHeadline:       string;
  realisticValue:      string;
  feeDiscount?:        string;
  lastChecked:         string;    // 'Month YYYY'
  sourceUrl:           string;
  kycRequired:         boolean;
  depositRequired:     boolean;
  minDeposit?:         string;
  availability:        string;
  restrictedCountries?: string[]; // ISO 3166-1 alpha-2
  status:              'verified' | 'unverified' | 'expired';
  termsSummary:        string;
}
```

## Appendix B — Exchange object (full shape)

```ts
const exchange = {
  name:            string,   // 'MEXC'
  slug:            string,   // 'mexc'
  affiliateUrl:    string,   // '/go/mexc/' — trailing slash required
  officialDomain:  string,   // 'mexc.com' — root domain, no protocol
  supportUrl:      string,   // 'https://support.mexc.com' — official help center
  feeUrl:          string,   // 'https://www.mexc.com/fee' — official fee schedule
  bonusMax:        number,   // 8000 — render with .toLocaleString('en-US')
  currency:        string,   // 'USDT'
  minDeposit:      number,   // 100
  founded:         number,   // 2018
  users:           string,   // '30M+'
  headquarters:    string,   // 'Dubai, UAE'
  licence:         string,   // 'Dubai VARA'
  wordmarkImg:     string,   // '/logos/mexc-wordmark-official.png'
  articleImg:      string,   // '/media/exchanges/mexc/article/mexc-article-1200x675.jpg'
  logoImg:         string,   // '/logos/mexc.png'
  fees: {
    spot?:    { maker: string, taker: string },
    futures?: { maker: string, taker: string },
    options?: { maker: string, taker: string },
  },
};
```

## Appendix C — Forbidden patterns

Never include in any exchange page:

| Pattern | Why |
|---|---|
| `href="https://partner.exchange.com/..."` in a user-facing CTA | Bypasses `/go/` redirect tracking |
| `affiliateUrl: '/go/slug'` without trailing slash | Causes 301 redirect on every CTA click; use `/go/slug/` |
| `.toLocaleString()` without `'en-US'` locale | Produces `30 000` (thin space) on non-US build servers; always use `.toLocaleString('en-US')` |
| Hardcoded `bybit.com`, `help.bybit.com`, or Bybit fee URL in a cloned page | Silent cross-contamination; always update `officialDomain`, `supportUrl`, `feeUrl` |
| `"guaranteed $X"` or `"you will receive $X"` | Creates false expectation, compliance risk |
| `★★★★★` with a count (e.g. "4.8 out of 5") | Fabricated social proof |
| Code baked into a static image | OG image gets cached, code becomes stale |
| `const alternatives = [...]` array with external URLs | Dead code, tracking bypass risk if used accidentally |
| `cbw_vote_{slug}_code` hardcoded string | Must be computed from `exchangeSlug` variable |
| `'June 2026'` or any literal date in HTML | Must come from `offer.lastChecked` |

## Appendix D — Related documents

| Document | Purpose |
|---|---|
| `docs/VISUAL_PROMO_CODE_STANDARD.md` | Evergreen image enforcement rules |
| `docs/SCREENSHOT_STANDARD.md` | Evidence capture and annotation rules |
| `docs/CLAIM_EVIDENCE_LEDGER_STANDARD.md` | What claims require evidence |
| `docs/GOLD_STANDARD_EXCHANGE_TEMPLATE.md` | Original Sprint 01 specification (superseded by this doc for implementation) |
| `src/data/offers.ts` | All active offer data |
| `src/data/exchanges.ts` | Exchange index data (homepage cards) |
| `public/media/exchanges/bybit/` | Reference implementation of image directory structure |
| `src/pages/bybit/index.astro` | Reference implementation of exchange page |
