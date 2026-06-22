# CBW Logo System v1

**Project:** CryptoBonusWorld.com  
**Version:** 1.0  
**Date:** 2026-06-22  
**Status:** Active — applies to all production components

---

## Overview

This document is the single source of truth for logo architecture on CryptoBonusWorld.com.

Two entirely separate logo systems coexist on the site:

| System | Covers | Canonical component |
|--------|--------|---------------------|
| **Site brand** | CryptoBonusWorld identity | `SiteHeader.astro`, `Footer.astro`, `seo.ts` |
| **Exchange logos** | Bybit, MEXC, OKX, etc. | `ExchangeLogo.astro` + `logoConfig.ts` |

These must never be mixed. Exchange logos are not site brand assets. Site brand is not an exchange logo.

---

## Part 1 — Site Brand Logo System

### 1.1 Canonical Assets

| Role | Canonical path | Format | Notes |
|------|---------------|--------|-------|
| **Header mark** | `/brand/cbw-header-mark-final.png` | PNG | 1× source. Used in `<img srcset>` |
| **Header mark @1x** | `/brand/cbw-header-mark-final@1x.png` | PNG | srcset 1x descriptor |
| **Header mark @2x** | `/brand/cbw-header-mark-final@2x.png` | PNG | srcset 2x descriptor |
| **Footer mark** | Inline SVG in `Footer.astro` | SVG (inline) | Circle orbit mark, gold gradient |
| **Schema.org logo** | `/brand/cryptobonusworld-logo.svg` | SVG | Used in JSON-LD only |
| **Image overlay source** | `/brand/cbw-header-mark-transparent.png` | PNG 512×512 | Alpha channel; used by overlay scripts only |
| **Favicon source** | `/brand/cbw-favicon-master-final.svg` | SVG | Source for favicon generation |

### 1.2 Brand Asset Architecture

```
public/brand/
├── cbw-header-mark-final.png       ← ACTIVE: header img src
├── cbw-header-mark-final@1x.png    ← ACTIVE: srcset 1x
├── cbw-header-mark-final@2x.png    ← ACTIVE: srcset 2x
├── cbw-header-mark-transparent.png ← ACTIVE: overlay pipeline source
├── cryptobonusworld-logo.svg       ← ACTIVE: schema.org JSON-LD
├── cbw-favicon-master-final.svg    ← ACTIVE: favicon generation source
└── [all other files]               ← ARCHIVED / generation artifacts
```

> **Warning:** `public/brand/` contains ~54 files including generation artifacts, rejected candidates, and old iterations. Only the 6 files above are active in production. Do not reference any other file from `public/brand/` in component code.

### 1.3 Site Logo Contexts

#### A) Header
- **Component:** `src/components/layout/SiteHeader.astro`
- **Mark:** `<img src="/brand/cbw-header-mark-final.png" srcset="...@1x 1x, ...@2x 2x">`
- **Wordmark:** Inline HTML with CSS gradient text (`ph-wm-c`/`ph-wm-b`/`ph-wm-w` spans)
- **Rendered size:** 54×54px container (mark) + responsive wordmark text
- **Do NOT replace** the inline wordmark with an image asset — it is intentionally text for SEO + accessibility

#### B) Footer
- **Component:** `src/components/Footer.astro`
- **Mark:** Inline `<svg>` (circle orbit, 20×20px viewport, `viewBox="0 0 32 32"`)
- **Wordmark:** Inline HTML with inline gradient style on `<strong>Bonus</strong>`
- **Do NOT replace** with external image assets

#### C) Schema.org (JSON-LD)
- **File:** `src/utils/seo.ts` line 665
- **Asset:** `/brand/cryptobonusworld-logo.svg`
- **Purpose:** Google rich results, social graph `logo` property only
- **Do NOT use** for visible UI rendering

#### D) Image Overlay Pipeline
- **Asset:** `/brand/cbw-header-mark-transparent.png` (512×512, alpha)
- **Used by:** `scripts/visual-pack-overlay.mjs`, `scripts/visual-pack-overlay-v2.mjs`
- **Do NOT generate** this mark with AI. Only use the canonical file.

### 1.4 Site Brand Size Tokens

| Token name | Context | Current value | Constraint |
|------------|---------|---------------|------------|
| `site-mark-header` | Header `<img>` container | 54×54px | Fixed (frozen header) |
| `site-mark-footer` | Footer inline SVG | 20×20px rendered | Fixed (inline) |
| `site-overlay-source` | Overlay pipeline input | 512×512px | Always resized by script |

### 1.5 What Not to Do — Site Brand

| Rule | Reason |
|------|--------|
| ❌ Do not reference `/brand/cbw-header-mark-v2.png` | Old iteration, superseded |
| ❌ Do not reference `/brand/cbw-favicon-master-512.png` as UI image | It is a favicon source artifact |
| ❌ Do not put AI-drawn CBW logo in any image | AI hallucination of brand mark |
| ❌ Do not replace header wordmark with a static image | Loses SEO + accessibility |
| ❌ Do not create new files in `/brand/` without owner approval | Directory already oversized |

---

## Part 2 — Exchange Logo System

### 2.1 Canonical Asset Structure

Exchange logo assets live in `/public/logos/`. One folder, one file per type per exchange.

```
public/logos/
├── {slug}.png           ← PRIMARY: square mark, CoinGecko-style
├── {slug}.svg           ← FALLBACK: SVG version of square mark
└── {slug}-wordmark.svg  ← WORDMARK: horizontal brand name (where available)
```

### 2.2 Exchange Canonical Asset Registry

| Exchange | Slug | Mark PNG | Mark SVG | Wordmark | Wordmark format | Dark variant |
|----------|------|---------|---------|----------|----------------|-------------|
| Bybit | `bybit` | ✅ | ✅ | ✅ `bybit-wordmark.svg` | SVG | ✅ `bybit-wordmark-light.svg` |
| MEXC | `mexc` | ✅ | ✅ | ✅ `mexc-wordmark-dark.png` | PNG | — |
| Binance | `binance` | ✅ | ✅ | ✅ `binance-wordmark.png` | PNG | — |
| BingX | `bingx` | ✅ | ✅ | ✅ `bingx-wordmark.png` | PNG | — |
| Bitget | `bitget` | ✅ | ✅ | ✅ `bitget-wordmark-dark.png` | PNG | — |
| KuCoin | `kucoin` | ✅ | ✅ | ✅ `kucoin-wordmark.png` | PNG | — |
| Phemex | `phemex` | ✅ | ✅ | ✅ `phemex-wordmark.png` | PNG | — |
| OKX | `okx` | ✅ | ✅ | ❌ missing | — | — |
| Gate.io | `gate-io` | ✅ | ✅ | ❌ missing | — | — |
| HTX | `htx` | ✅ | ✅ | ❌ missing | — | — |
| CoinEx | `coinex` | ✅ | ✅ | ❌ missing | — | — |
| Coinbase | `coinbase` | ✅ | ✅ | ❌ missing | — | — |
| Bitunix | `bitunix` | ✅ | ❌ missing | ❌ missing | — | — |
| LBank | `lbank` | ✅ | ✅ | ❌ missing | — | — |

**Missing wordmarks:** OKX, Gate.io, HTX, CoinEx, Coinbase, Bitunix, LBank. These exchanges can only display square marks until wordmarks are sourced from official brand kits.

### 2.3 Asset Types — When to Use Each

#### Mark (Square/Tile)
Path: `/logos/{slug}.png`  
Use in:
- Exchange cards on homepage
- Related exchange cards (sidebar/bottom)
- BonusTable rows
- Navigation dropdowns
- Comparison tables
- Mobile compact list views

#### Wordmark (Horizontal)
Path: `/logos/{slug}-wordmark.svg` or `/logos/{slug}-wordmark.png`  
Use in:
- Top exchange hero block (where brand prominence matters)
- Bottom CTA hero section
- Page header context (exchange-specific landing pages)

> **Important:** Marketing images (OG/Article/Card JPGs) bake the exchange wordmark into the image itself as part of the composition. That baked wordmark is **not a UI asset** — it is part of the image file. Do not control it with CSS or tokens.

### 2.4 The Central Component: ExchangeLogo.astro

**File:** `src/components/ExchangeLogo.astro`

All exchange mark rendering must go through this component. Do not create parallel img tags pointing to `/logos/` anywhere else.

```astro
<ExchangeLogo
  slug="bybit"
  name="Bybit"
  size={80}
  variant="square"
/>
```

**Props contract:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `slug` | string | required | Exchange slug, maps to `/logos/{slug}.png` |
| `name` | string | required | Display name, used for `aria-label` + letter fallback |
| `size` | number | 40 | Container width = height in px |
| `variant` | `'square' \| 'pill' \| 'raw'` | `'square'` | Border-radius mode |
| `lazy` | boolean | true | Whether to lazy-load the image |

**Load chain:** PNG → SVG (onerror) → letter avatar (onerror again)

### 2.5 Configuration Source: logoConfig.ts

**File:** `src/utils/logoConfig.ts`

This file is the data source for:
- `BRAND_COLORS` — accent color per exchange (for glows, borders, letter avatars)
- `getBrandColor(slug)` — safe accessor with neutral fallback
- `getLogoPath(slug, format)` — canonical path builder (`/logos/{slug}.{format}`)
- `logoRadiusPx(size, variant)` — border-radius calculation (mirrors ExchangeLogo logic)

> Import from `logoConfig.ts` in any new component that needs exchange brand data. Do not hardcode brand colors or logo paths in component files.

---

## Part 3 — Size Token System

### 3.1 Exchange Logo Size Tokens

There is no dedicated CSS token file yet. Sizes are documented here as the canonical reference. Future token implementation should match these values.

| Token name | Context | Canonical value | Constraint axis |
|------------|---------|----------------|----------------|
| `exchange-logo-hero` | ExchangeHero top section | **64px** | height |
| `exchange-logo-hero-sticky` | ExchangeHero sticky header | **36px** | height |
| `exchange-logo-card` | Homepage ExchangeCard | via card image, not logo | N/A (card uses full image) |
| `exchange-logo-table-desktop` | BonusTable desktop row | **80px** | height = width |
| `exchange-logo-table-mobile` | BonusTable mobile row | **68px** | height = width |
| `exchange-logo-related` | RelatedGuides / related cards | **56px** | height = width |
| `exchange-logo-nav` | Navigation / dropdown | **32px** | height = width |
| `exchange-logo-chip` | Inline chips / mini badges | **24px** | height = width |
| `exchange-logo-contextual` | ContextualFeatured featured block | **72px** | height = width |

### 3.2 Site Brand Size Tokens

| Token name | Context | Value |
|------------|---------|-------|
| `site-mark-header` | Header mark `<img>` | 54×54px |
| `site-mark-footer` | Footer inline SVG | 20×20px |
| `site-overlay-source-px` | Overlay script input | 512×512px |

### 3.3 Size Rule

> **One source asset, multiple contextual sizes.**

Do NOT force the same `size` prop in every context. Each context has its own token. The component scales the same PNG source to any size via CSS `object-fit: contain`.

Do NOT hardcode arbitrary pixel values in new components without first checking the token table above. If a new context is needed, add a named token here first.

---

## Part 4 — Spacing and Alignment Rules

### 4.1 Safe-Area Padding

`ExchangeLogo.astro` manages per-exchange inner padding automatically (the `LOGO_PADDING` map). Do not add additional padding externally.

Rules:
- Logos with opaque baked-in backgrounds → `padding: 0` (the container bg matches)
- Logos with transparent fields → small percentage padding (coinbase: 2%)
- Never add external margin/padding to `.exlogo` that would break visual alignment

### 4.2 Container Background Matching

The `LOGO_CONTAINER_BG` map in `ExchangeLogo.astro` sets each container's background color to match the logo's own background, eliminating seam artifacts at the container's border-radius corners.

When adding a new exchange:
1. Inspect the PNG — does it have an opaque background?
2. If yes: add to `LOGO_CONTAINER_BG` with the matching hex
3. If yes + white/light bg: also add to `WHITE_BG_BORDER_SLUGS` for dark outline

### 4.3 Alignment Rules

- `ExchangeLogo` renders `display: inline-flex` — center-aligned in both axes
- Wrap in `display: flex; align-items: center` in the parent container
- Never set `width: auto` on `.exlogo` — the container is always square (width = height = size)
- Never set `object-fit: cover` on `.exlogo-img` — always `contain` to prevent crop

### 4.4 Whitespace Pitfalls

| Exchange | Pitfall | Mitigation |
|----------|---------|-----------|
| OKX | Wide transparent margins in PNG | `LOGO_PADDING: 0` because opaque white fills edge; `WHITE_BG_BORDER_SLUGS` adds visible frame |
| CoinEx | White rounded square, looks floated | Container bg `#FFFFFF` + white border override |
| HTX | White circle, transparent corners show dark bg | Container bg `#1a1a1a` matches expected dark page surface |
| KuCoin | White rounded square bg | Container bg `#FFFFFF` + white border override |
| Gate.io | White square bg | Container bg `#FFFFFF` + white border override |

---

## Part 5 — Light / Dark Usage Rules

### 5.1 Exchange Logo on Dark Backgrounds (default)

The site uses a dark surface (`#0a0c14` / `#080F18`). Square PNG marks are designed to work on dark backgrounds out of the box. `ExchangeLogo` defaults to this correctly.

### 5.2 Exchange Logo on Light Backgrounds

When an exchange logo appears on a white or light-gray surface (e.g., comparison table with white bg):
- Exchanges with white/light baked-in backgrounds (OKX, Gate.io, KuCoin, CoinEx): render with `border: 1px solid rgba(0,0,0,0.10)` — this is already in `WHITE_BG_BORDER_SLUGS`
- Exchanges with dark baked-in backgrounds (Bybit, Binance, BingX, Bitget): visible contrast is fine, no adjustment needed
- Letter avatar fallback uses `getBrandColor(slug)` as background — always readable on dark/light

### 5.3 Wordmark on Dark/Light Backgrounds

| Exchange | Wordmark variant | On dark | On light |
|----------|----------------|---------|---------|
| Bybit | `bybit-wordmark.svg` (gold on transparent) | ✅ | ⚠️ test first |
| Bybit | `bybit-wordmark-light.svg` | ✅ (white variant) | ❌ |
| MEXC | `mexc-wordmark-dark.png` | ❌ (dark text) | ✅ |
| Bitget | `bitget-wordmark-dark.png` | ❌ (dark text) | ✅ |

> For hero blocks on dark backgrounds (default), always use the light/white wordmark variant if available. For tables or cards on white backgrounds, use the dark variant.

---

## Part 6 — Image Overlay Rule (BASE / FINAL Architecture)

### 6.1 Separation of Concerns

Exchange marketing images (OG/Article/Card) follow a strict two-layer architecture:

| Layer | Folder | Contains | UI logo relationship |
|-------|--------|----------|---------------------|
| **BASE** | `/media/exchanges/{slug}/base/` | Clean ChatGPT-generated image | Exchange wordmark is baked into composition — not a UI asset |
| **FINAL** | `/media/exchanges/{slug}/final/` | BASE + approved overlay | CBW mark may be composited post-processing |

### 6.2 Critical Rule: Marketing Image Wordmarks Are Not UI Assets

The Bybit wordmark visible in `bybit-og-final-v1-1200x630.jpg` is part of the image composition. It is painted pixels. It is **not** the same as `/logos/bybit-wordmark.svg`. Do not confuse them.

| Asset | Type | Controlled by |
|-------|------|---------------|
| `/logos/bybit-wordmark.svg` | UI asset — vector | CSS, component props |
| Bybit wordmark in OG image | Image pixels | Image generator / re-render |

### 6.3 CBW Overlay Is Not a Reason to Regenerate BASE

The overlay (`cbw-header-mark-transparent.png`) is applied post-processing by script. Changing the overlay config does not require re-generating the base image. The pipeline is:

```
AI generation → BASE → FINAL (script applies overlay) → site references FINAL
```

When bulk overlay is applied to 10 exchanges: update FINAL only. BASE stays unchanged.

### 6.4 Current Bybit Pack State

```
BASE (clean, no CBW):
  /media/exchanges/bybit/base/bybit-og-base-v1-1200x630.jpg       — 1200×630
  /media/exchanges/bybit/base/bybit-article-base-v1-1200x675.jpg  — 1200×675
  /media/exchanges/bybit/base/bybit-card-base-v1-1200x800.jpg     — 1200×800

FINAL (= BASE copy, overlay pending bulk decision):
  /media/exchanges/bybit/final/bybit-og-final-v1-1200x630.jpg       — referenced in og:image
  /media/exchanges/bybit/final/bybit-article-final-v1-1200x675.jpg  — referenced in article
  /media/exchanges/bybit/final/bybit-card-final-v1-1200x800.jpg     — referenced in card
```

---

## Part 7 — Do / Don't Reference

### DO

| Rule |
|------|
| ✅ Use `ExchangeLogo.astro` for all exchange mark rendering |
| ✅ Import brand colors from `logoConfig.ts` (`getBrandColor`) |
| ✅ Use `getLogoPath(slug)` from `logoConfig.ts` when building paths in non-component code |
| ✅ Add new exchanges to `BRAND_COLORS`, `LOGO_PADDING`, `LOGO_CONTAINER_BG` in `ExchangeLogo.astro` |
| ✅ Reference `/brand/cbw-header-mark-transparent.png` in overlay scripts only |
| ✅ Reference `/brand/cryptobonusworld-logo.svg` for JSON-LD schema only |
| ✅ Keep wordmarks in `/logos/{slug}-wordmark.*` |
| ✅ Document new size token in this file before hardcoding a value |

### DON'T

| Rule |
|------|
| ❌ Create inline `<img src="/logos/...">` outside of `ExchangeLogo.astro` |
| ❌ Hardcode brand colors in Astro component files (use `getBrandColor`) |
| ❌ Stretch logos (never `object-fit: fill`) |
| ❌ Clip logos (never `overflow: hidden` on the `<img>` itself; only on the container) |
| ❌ Use the 1.4MB `cbw-header-mark-final.png` without srcset (use @1x + @2x) |
| ❌ Reference any file in `/brand/` except the 6 canonical ones listed in Part 1 |
| ❌ Force one identical `size` prop across all contexts |
| ❌ Use the exchange's baked-in-image wordmark as a UI component |
| ❌ Add CBW branding to BASE images — overlay goes to FINAL only |
| ❌ Generate CBW logo with AI image tools |

---

## Part 8 — Implementation Audit (2026-06-22)

### 8.1 Component Audit Table

| Component / File | Logo reference | Canonical? | Status |
|-----------------|----------------|------------|--------|
| `SiteHeader.astro` | `/brand/cbw-header-mark-final.png` with @1x/@2x srcset | ✅ Yes | **OK** |
| `SiteHeader.astro` | Inline HTML wordmark | ✅ Yes | **OK** |
| `Footer.astro` | Inline SVG mark (20px) | ✅ Yes | **OK** |
| `Footer.astro` | Inline HTML wordmark | ✅ Yes | **OK** |
| `ExchangeLogo.astro` | `/logos/{slug}.png` → SVG fallback | ✅ Yes | **OK** |
| `ExchangeLogo.astro` | `getBrandColor` from `logoConfig.ts` | ✅ Yes | **OK** |
| `logoConfig.ts` | `getLogoPath()` canonical path builder | ✅ Yes | **OK** |
| `seo.ts` line 665 | `/brand/cryptobonusworld-logo.svg` | ✅ Yes | **OK** |
| `ProtoLayout.astro` line 272 | `/brand/cbw-header-mark-final.png` (54px, no srcset) | ⚠️ Legacy | **LEGACY — prototype only** |
| `scripts/visual-pack-overlay*.mjs` | `/brand/cbw-header-mark-transparent.png` | ✅ Yes | **OK** |
| `src/pages/bybit/index.astro` | `/media/exchanges/bybit/final/*.jpg` | ✅ Yes | **OK** |
| `src/data/exchanges.ts` | `/media/exchanges/bybit/final/*.jpg` | ✅ Yes | **OK** |
| `src/pages/index.astro` | `og:image` → `/media/exchanges/bybit/final/bybit-og-final-v1-1200x630.jpg` | ✅ Yes | **OK** |

### 8.2 Violations Found

| Issue | Severity | File | Action |
|-------|---------|------|--------|
| `ExchangeLogo.astro` hardcodes `/logos/${slug}.png` instead of calling `getLogoPath()` | Low | `ExchangeLogo.astro:46` | Fixed in this session |
| `ProtoLayout.astro` references `cbw-header-mark-final.png` without srcset | Info | `ProtoLayout.astro:272` | Prototype-only file; no action needed |
| No CSS custom property file for logo size tokens | Medium | — | Documented here as canonical reference; CSS token file is a future task |
| `/public/brand/` has 54 files — unclear which are active | Medium | directory | 6 canonical files documented in Part 1 |
| Missing wordmarks for 7 exchanges | Low | `/public/logos/` | Documented in Part 2.2; source from official brand kits when needed |

---

## Part 9 — QA Checklist

Run this checklist on every release that touches header, footer, exchange pages, or logo assets.

**Site brand:**
- [ ] Header logo mark renders (check `/brand/cbw-header-mark-final.png` HTTP 200)
- [ ] Header wordmark renders (CSS gradient text — not broken)
- [ ] Footer logo mark renders (inline SVG visible)
- [ ] No broken image paths in header or footer
- [ ] Schema.org logo points to `/brand/cryptobonusworld-logo.svg` (HTTP 200)

**Exchange logos:**
- [ ] ExchangeLogo renders for all active exchanges (BonusTable, ExchangeHero)
- [ ] No letter-avatar fallback visible when real logo should show (check `/logos/*.png` 200)
- [ ] No stretched logos (check network response sizes vs rendered sizes)
- [ ] No clipped logos (verify `object-fit: contain` in devtools)
- [ ] OKX, Gate.io, KuCoin, CoinEx: dark border visible on white surface
- [ ] Bybit, Binance, BingX, Bitget, Phemex: no dark seam at container corners
- [ ] ExchangeHero sticky logo (36px) does not render blurry on retina

**Marketing images:**
- [ ] `og:image` URLs return HTTP 200 for each exchange page
- [ ] Article image `<img>` not cropped (`width: 100%; height: auto`)
- [ ] No CBW branding on BASE images (verify base/ files)
- [ ] FINAL files match production references in HTML

---

## Part 10 — Adding a New Exchange (Checklist)

When adding exchange #{11+}:

1. **Add mark assets** to `/public/logos/`:
   - `{slug}.png` — square mark 256×256 or 512×512, transparent or matched-bg PNG
   - `{slug}.svg` — SVG version (if available from official brand kit)
   - `{slug}-wordmark.svg` or `{slug}-wordmark-dark.png` — if hero wordmark is needed

2. **Update `logoConfig.ts`:**
   - Add to `BRAND_COLORS` map

3. **Update `ExchangeLogo.astro`:**
   - Add to `LOGO_PADDING` map (inspect the PNG background)
   - Add to `LOGO_CONTAINER_BG` map (pick container bg hex to match PNG)
   - If white/light-bg PNG: add to `WHITE_BG_BORDER_SLUGS`

4. **Update this document (Part 2.2):**
   - Add row to Exchange Canonical Asset Registry table

5. **Generate visual pack:**
   - Follow `docs/VISUAL_PROMO_CODE_STANDARD.md` BASE/FINAL pipeline

---

## Appendix — Brand Color Reference

From `src/utils/logoConfig.ts`:

| Exchange | Accent color | Usage |
|----------|-------------|-------|
| Bybit | `#F7A600` | amber gold |
| Binance | `#F3BA2F` | yellow |
| MEXC | `#00C0B4` | teal |
| OKX | `#EEEEEE` | light gray |
| Bitget | `#1DA2B4` | cyan |
| BingX | `#1890FF` | blue |
| Gate.io | `#2BAFCC` | sky blue |
| KuCoin | `#23AF91` | green |
| HTX | `#1352F0` | deep blue |
| CoinEx | `#00CFC5` | teal |
| Phemex | `#BE79DF` | purple |
| Bitunix | `#F97316` | orange |
| LBank | `#0052FE` | blue |
| Coinbase | `#1652F0` | blue |
