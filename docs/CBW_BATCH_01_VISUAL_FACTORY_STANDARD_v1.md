# CBW Batch 01 Visual Factory Standard v1

**Status:** FROZEN (2026-07-16) · preview-only · branch `preview/exchange-batch-01`
**Scope:** exchange preview pages under `/preview/exchanges/*` and their logo/media assets.
Nothing here is deployed; production pages and `/logos/` raw files are untouched.

---

## 1. Hero logo standard

- **Asset:** `512×160` transparent PNG — `public/preview-media/exchanges/{slug}/{slug}-logo-slot-512x160.png`
- **Canonical slots (never altered):** desktop `320×96` (logo budget 300×86 → the 512×160 asset renders at 275×86), mobile `250×76` (budget 235×68 → renders 218×68)
- **Optical occupancy targets (desktop visible content):**
  - wide wordmarks / lockups: **240–275 px wide** OR height-limited **62–72 px tall**
  - square marks: **52–75 px tall** (limiting dimension wins; never fill both axes)
  - safety space: ≥16 px horizontal, ≥10 px vertical inside the slot
- **Normalization happens in the asset, not CSS:** the visible group (icon + text as ONE unit)
  is cropped to its alpha bbox and rescaled into a `472×132` optical box (square tiles capped at 139),
  centered on a fresh 512×160 canvas. Aspect preserved, lanczos3.
  In-canvas upscale is a net display downscale → no visible quality loss.
- **No CSS scaling:** `logoOpticalScale` exists as a documented registry token but is **1 for every entry**;
  any deviation must be backed by the occupancy report.
- **Top and bottom:** the bottom status card uses the **same asset and same treatment** as the hero.
- **Glow:** `logoGlow: 'soft-glow'` only for dark marks on dark backgrounds (currently Phemex only).

## 2. Icon standard (alternative list)

- **Asset:** `256×256` transparent PNG — `public/preview-media/alternatives/{slug}-icon-square-256x256-v1.png`
- **Usage:** "Verified alternatives" cards on preview pages (six live exchanges).
  Raw `/logos/*.png` are NOT used by preview pages and remain untouched for the live six.
- **Optical target:** longest visible side **180–220 px**, centered, equal padding, equal visual weight.
- **No baked plates:** background tiles/plates are removed via edge flood-fill;
  official colors preserved (no recolor, no invert). Tile color comes from the card (`tileBg`), never the asset.

## 3. Logo sourcing rules

**Allowed sources (in priority order):**
1. Official media kit / brand kit / press kit
2. Official website assets (header/nav logo, PWA/app icons)
3. Official CDN assets served by the brand's own domain

Every source URL is recorded in the registry / owner logo master `meta.json`.

**Forbidden — never, regardless of convenience:**
- AI-generated or ChatGPT-generated logos (including "clean recreations")
- generated/fabricated wordmarks or white variants
- initials or letter tiles pretending to be logos
- fake/synthetic SVG recreations
- random third-party logo repositories (unless explicitly owner-approved and marked low-confidence)

## 4. Asset pipeline

```
source (official URL, recorded)
  → normalize        (plate removal, transparency, 512×160 / 256×256 canvas)
  → optical fit      (group-level rescale into 472×132 box / 180–220 icon target)
  → QA sheet         (alpha-bbox measurement + slot-boundary sheet + verdict)
  → preview page     (/preview/exchanges/{slug}/ — noindex, no commercial data)
  → production candidate (only after owner approval + offer verification)
```

Scripts: `scripts/build-exchange-preview-pack.mjs` (OG/article/card),
QA/measurement scripts in `C:/projects/CryptoBonusWorld/.tmp-exchange-pages-batch-01/`.

## 5. Batch 01 status (frozen)

**PASS:** BYDFi (official full wordmark from bydfi.com/brand/logo5.png), Bitunix, Hyperliquid,
BloFin, EVEDEX (optical fix +38%), Vest Markets, Phemex (soft-glow), Binance, MEXC (reference —
official live-hero wordmark).

**OWNER REVIEW:** Gate.com (Gate.com naming and Gate.io deduplication require owner approval
before production) · WhiteBIT (official transparent wordmark recommended before production).

**PENDING ASSETS:**
- EVEDEX hero background — 2172×724, deep navy + teal/green, no text/logo/CTA/code/charts
- Phemex hero background — 2172×724, deep navy + restrained green/blue, no text/logo/CTA/code/charts

**Safety invariants (unchanged):** all preview pages noindex,nofollow; excluded from sitemap;
no `/go/*`; no affiliate URLs; no real codes; no bonus amounts; no active Claim/Get Bonus CTAs;
`promoCode/bonusAmount/affiliateUrl = null`, `externalCtaEnabled/productionEligible = false`.
