# CBW Clean Rebuild Plan

**Status: DRAFT — awaiting owner approval before any action**

Created: 2026-06-17
Backup branch: `backup-before-clean-promo-reset` (commit 53834e8)

---

## 1. Backup Status

| Item | Status |
|---|---|
| Backup branch created | ✅ `backup-before-clean-promo-reset` |
| All modified tracked files committed | ✅ 330 files |
| All untracked approved assets committed | ✅ Reference/, brand/, favicons/, media/ |
| Backup state notes saved | ✅ `CryptoBonusWorld_backups/before-clean-promo-reset/STATE_NOTES.md` |
| All 21 approved foundation files verified | ✅ All OK |
| Back on master branch | ✅ |

---

## 2. Approved Assets Protection List

**Never delete or overwrite during rebuild:**

| Asset | Path | Status |
|---|---|---|
| Header mark | `public/brand/cbw-header-mark-final.png` | FROZEN |
| Favicon pack | `public/favicons/` (16 files) | FROZEN |
| Bybit OG | `public/media/exchanges/bybit/share/bybit-og-1200x630.png` | FROZEN |
| Bybit article | `public/media/exchanges/bybit/article/bybit-article-1200x675.png` | FROZEN |
| Bybit card | `public/media/exchanges/bybit/cards/bybit-card-1200x800.png` | FROZEN |
| Reference source | `Reference/bybit-visual-pack-v1/` | FROZEN |
| Checkpoint doc | `Reference/CBW_APPROVED_FOUNDATION_CHECKPOINT.md` | FROZEN |
| Visual standard | `Reference/VISUAL_PACK_STANDARD_v1.md` | FROZEN |
| Image prompts | `Reference/VISUAL_IMAGE_PROMPTS_v1.md` | FROZEN |

**Restore commands if accidentally deleted:**

```
copy Reference\bybit-visual-pack-v1\bybit-og-1200x630-approved.png      public\media\exchanges\bybit\share\bybit-og-1200x630.png
copy Reference\bybit-visual-pack-v1\bybit-article-1200x675-approved.png  public\media\exchanges\bybit\article\bybit-article-1200x675.png
copy Reference\bybit-visual-pack-v1\bybit-card-1200x800-approved.png     public\media\exchanges\bybit\cards\bybit-card-1200x800.png
```

---

## 3. New Route Map

### MVP routes (build first)

| Route | Priority | Notes |
|---|---|---|
| `/` | P0 | Clean homepage with exchange card grid |
| `/exchanges/bybit/` | P0 | First clean promo page |
| `/prototype/bybit-light/` | P0 | Prototype — already exists, keep noindex |
| `/prototype/visual-assets-bybit/` | P0 | QA page — keep noindex |
| `/go/[exchange]` | P0 | Redirect system — keep as is, no change needed |
| `/privacy-policy` | P1 | Legal — simplify |
| `/terms` | P1 | Legal — simplify |
| `/affiliate-disclosure` | P1 | Legal — simplify |

### Phase 2 routes

| Route | Priority | Notes |
|---|---|---|
| `/exchanges/` | P2 | Exchange directory |
| `/promo-codes/` | P2 | Promo code listing (replaces /bonus-codes/) |
| `/countries/[slug]` | P2 | Simple geo pages |
| `/compare/` | P3 | Optional later |
| `/guides/` | P3 | Optional later |
| `/contact` | P2 | Simple page |
| `/sitemap.xml` | P1 | Auto-generated |
| `/robots.txt` | P1 | Already exists |

### Archive later (current routes to redirect or remove)

| Route | Action |
|---|---|
| `/bonuses/` and `/bonuses/[slug]` | Archive → redirect to `/exchanges/[slug]` |
| `/coins/` and `/coins/[slug]` | Archive — not part of promo code DB concept |
| `/categories/` | Archive — replace with tag/filter system |
| `/use-cases/` | Archive or redirect to exchanges |
| `/best-exchanges-for/[slug]` | Keep or redirect to exchanges |
| `/reviewers/` | Archive — new site won't have reviewer system |
| `/methodology` | Simplify or replace with trust page |
| `/editorial-policy` | Simplify |
| `/update-policy` | Simplify |
| `/disclaimer` | Keep or merge with terms |
| `/compare/[pair]` | Archive or rebuild later |

---

## 4. New Component Map

### Keep and reuse (minimal edit)

- `Header.astro` — FROZEN, keep exactly as is
- `Footer.astro` — simplify
- `SeoHead.astro` — keep, minor updates
- `Analytics.astro` — keep
- `ProtoLayout.astro` — keep for prototype pages
- `Breadcrumbs.astro` — keep
- `FAQBlock.astro` — keep
- `RiskDisclaimer.astro` — keep
- `AffiliateDisclosure.astro` — keep
- `ExchangeLogo.astro` — keep

### Rebuild clean

- `ExchangeCard.astro` — clean card: exchange name, card image (1200×800), code, bonus, CTA
- `ExchangeHero.astro` — clean hero with code box above the fold
- `PromoCodeBox.astro` — already exists, keep/clean
- `Layout.astro` — rebuild clean: simpler, favicon wiring preserved

### New components needed

- `ExchangeCardGrid.astro` — responsive 3/2/1 col grid using approved card standard
- `OfferBlock.astro` — verified code + bonus + CTA module, above the fold
- `ProofBlock.astro` — verification/proof section
- `FactsTable.astro` — quick exchange facts table
- `HowToClaimBlock.astro` — step-by-step claim flow

### Archive (old portal components — keep in backup only)

- CompareTable, CountryCard, CoinPage-specific components, ReviewerBlock,
  WalkthroughFlow, MediaGallery, LightboxPortal, ScreenshotGallery, etc.
  (archive — not part of clean promo DB MVP)

---

## 5. Data Model Proposal

### Exchange

```typescript
interface Exchange {
  slug: string;           // "bybit"
  name: string;           // "Bybit"
  logo: string;           // "/logos/bybit-wordmark-official.png"
  status: 'active' | 'inactive' | 'pending';

  // Visual pack
  cardImage: string;      // "/media/exchanges/bybit/cards/bybit-card-1200x800.png"
  ogImage: string;        // "/media/exchanges/bybit/share/bybit-og-1200x630.png"
  articleImage: string;   // "/media/exchanges/bybit/article/bybit-article-1200x675.png"

  // SEO
  pageTitle: string;
  metaDescription: string;

  // Links
  affiliateUrl: string;   // tracked link via /go/[exchange]
}
```

### Offer

```typescript
interface Offer {
  exchangeSlug: string;
  promoCode: string;          // "CRYPTOBONUSW"
  bonusHeadline: string;      // "Up to 30,000 USDT Welcome Bonus"
  realisticValue: string;     // "Typical: $30–$100 for new users"
  bonusType: 'welcome' | 'deposit' | 'referral' | 'trading';

  lastChecked: string;        // "2026-06-17"
  sourceUrl: string;          // official source URL
  affiliateUrl: string;       // /go/bybit

  kycRequired: boolean;
  depositRequired: boolean;
  minDeposit?: string;

  availability: string[];     // ["global"] or ["US", "EU", ...]
  restrictedCountries: string[];

  status: 'active' | 'unverified' | 'expired';
}
```

**Rule:** Volatile data (code, amounts, dates) lives here — never in images.

---

## 6. Homepage Build Plan

### Structure

```
1. Header (FROZEN — reuse existing)
2. Hero
   - H1: "Crypto Promo Codes & Referral Bonuses"
   - Short value prop: "Verified codes for top exchanges"
   - Optional: search or browse CTA
3. Featured Exchange Cards
   - ExchangeCardGrid component
   - 3-col desktop / 2-col tablet / 1-col mobile
   - Card image: 1200×800 (3:2), <img> tag, no crop
   - Shows: exchange name, bonus headline, promo code badge, CTA button
4. How It Works (3 steps)
5. Trust/verification block
6. Top offers list
7. FAQ
8. Footer
```

### Homepage data source

- `src/data/exchanges.json` — simplified to new Exchange interface
- `src/data/offers.ts` — new file, Offer interface

---

## 7. Bybit Page Build Plan

**Target route:** `/exchanges/bybit/`

### Page structure

```
1. Header (FROZEN)
2. White title bar
   - Exchange name + "Referral Code" breadcrumb
3. Dark exchange hero
   - OG image: bybit-og-1200x630.png (above fold)
   - Promo code: CRYPTOBONUSW (copyable)
   - Bonus headline
   - CTA button → /go/bybit
4. Verified offer block
   - Code box
   - Bonus type
   - Last checked date
   - Source link
5. Facts table
   - Founded, HQ, license, KYC, min deposit
6. Article image
   - bybit-article-1200x675.png
   - Below conversion block, above text content
7. How to claim (step-by-step)
8. Bonus terms
9. Proof / verification screenshots
10. Restricted countries
11. FAQ
12. Final CTA
13. Footer
```

### Data

- Exchange object: bybit entry in exchanges.json
- Offer object: bybit entry in offers.ts

---

## 8. Visual Asset Reuse Plan

### Bybit (approved v1.1 — ready to use)

| Purpose | File | Status |
|---|---|---|
| og:image | `public/media/exchanges/bybit/share/bybit-og-1200x630.png` | ✅ Ready |
| Article image | `public/media/exchanges/bybit/article/bybit-article-1200x675.png` | ✅ Ready |
| Homepage card | `public/media/exchanges/bybit/cards/bybit-card-1200x800.png` | ✅ Ready |

### Other exchanges (visual packs pending)

Generate using `Reference/VISUAL_IMAGE_PROMPTS_v1.md` — Prompts 1, 2, 3.
Standard sizes: 1200×630 / 1200×675 / 1200×800.
Place approved files in `Reference/{exchange}-visual-pack-v1/` then copy to public.

### Priority queue

1. Binance — next visual pack after Bybit
2. MEXC
3. Bitget
4. OKX
5. BingX

---

## 9. SEO/Meta Plan

### Per-page meta (PromoCodePage template)

```
title: "{Exchange} Referral Code {YEAR}: {CODE} — {Bonus Headline}"
description: "{Exchange} promo code {CODE} — {Bonus}. Verified {Month} {YEAR}."
og:image: /media/exchanges/{slug}/share/{slug}-og-1200x630.png
canonical: https://cryptobonusworld.com/exchanges/{slug}/
robots: index, follow
```

### Prototype pages

```
robots: noindex, nofollow (all /prototype/* routes)
```

### Sitemap

Auto-generated from Astro SSG. Include:
- / (homepage)
- /exchanges/[slug] — all active exchanges
- /promo-codes/ and /promo-codes/[slug]
- /countries/[slug]
- Legal pages

Exclude: /prototype/*, /go/*, draft pages.

### Structured data

- Exchange page: `ItemPage` or `Product` schema with offer details
- Homepage: `ItemList` for exchange cards

---

## 10. Redirect / Cleanup Plan

| Old Route | New Route | Priority |
|---|---|---|
| `/bonuses/bybit` | `/exchanges/bybit/` | P1 |
| `/bonuses/binance` | `/exchanges/binance/` | P1 |
| `/bonuses/[slug]` | `/exchanges/[slug]/` | P1 |
| `/coins/*` | `/` (homepage) | P2 |
| `/reviewers/*` | `/` (homepage) | P3 |
| `/use-cases/*` | `/exchanges/` | P2 |
| `/categories/*` | `/exchanges/` | P2 |

Implement via `astro.config.mjs` redirects or a catch-all page.

---

## 11. QA Checklist

### Before any file deletion

- [ ] Backup branch confirmed: `backup-before-clean-promo-reset`
- [ ] All approved foundation files verified (21 files)
- [ ] Reference/ folder intact

### New homepage QA

- [ ] Exchange card grid renders 3-col desktop
- [ ] Exchange card grid renders 2-col tablet (≤900px)
- [ ] Exchange card grid renders 1-col mobile (≤560px)
- [ ] Card images: `<img>` tag, `width:100%`, `height:auto`, no crop
- [ ] All card images return 200 OK
- [ ] Header renders correctly (frozen)
- [ ] Favicon renders in browser tab (all sizes)

### Bybit page QA

- [ ] OG image wired to og:image meta tag
- [ ] Promo code CRYPTOBONUSW visible above the fold
- [ ] CTA links to /go/bybit
- [ ] Article image renders (1200×675, no crop)
- [ ] noindex NOT set (production page, should be indexed)
- [ ] Build passes: `npx astro build`

### Prototype pages QA

- [ ] /prototype/bybit-light/ — noindex/nofollow
- [ ] /prototype/visual-assets-bybit/ — noindex/nofollow
- [ ] All prototype images 200 OK

### Build QA

- [ ] `npx astro build` — 0 errors
- [ ] sitemap.xml generated
- [ ] robots.txt correct

---

## 12. Deployment Plan

**Do not deploy until owner approves this plan.**

When ready:

1. Final `npx astro build` — confirm 0 errors
2. Run full QA checklist above
3. Upload `dist/` to production server
4. Verify homepage, Bybit page, sitemap.xml, robots.txt on live domain
5. Submit sitemap to Google Search Console
6. IndexNow ping for new URLs

**Deploy command (reference only — do not run until approved):**

```
npx astro build && rsync dist/ server:/var/www/cryptobonusworld/
```

---

## Decision Required from Owner

1. **Approve Option B (Hard clean rebuild)?**
   Yes / No / Start with homepage only

2. **Bybit page route:** `/exchanges/bybit/` or `/bybit-referral-code/`?

3. **Old content:** archive as static files or redirect immediately?

4. **Start with homepage first or Bybit page first?**
   Recommendation: homepage + Bybit simultaneously (they share the card component)

5. **Other exchanges for MVP launch?**
   Recommendation: Bybit first, then Binance and MEXC after v1 approval.
