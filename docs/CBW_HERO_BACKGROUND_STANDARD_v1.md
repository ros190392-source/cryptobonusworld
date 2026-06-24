# CBW Hero Background Standard — v1.1

**Status:** CANONICAL  
**Date:** 2026-06-24 (v1.1 — 3-level glow taxonomy)  
**Scope:** Exchange page promo hero backgrounds on cryptobonusworld.com  
**Related:** `docs/CBW_PAGE_PROMO_LOGO_SLOT_STANDARD_v1.md` — logo slot dimensions  
**Related:** `docs/CBW_EXCHANGE_VISUAL_PACK_FACTORY_STANDARD_v1.md` — shared glow token system

---

## 1. Approved Hero Background Variants

Three canonical hero background variants are defined for exchange promo blocks.
Each maps to a `glow-family` token that must be consistent across all surfaces for that exchange
(page top hero, page bottom hero, OG image, article image, card image).

### Variant 1: `no_glow`

| Property | Value |
|---|---|
| Canonical path | `/media/hero-backgrounds/cbw-hero-neutral-no-glow-v2.png` |
| Source file | `public/media/hero-backgrounds/cbw-hero-neutral-no-glow-v2.png` |
| Background-position | `left center` |
| Description | Dark space scene — graphite planet bottom-left, stars, orbit lines. No center glow. |
| Status | **LIVE** |

### Variant 2: `soft_glow`

| Property | Value |
|---|---|
| Canonical path | `/media/hero-backgrounds/cbw-hero-neutral-logo-glow-v2.png` |
| Source file | `public/media/hero-backgrounds/cbw-hero-neutral-logo-glow-v2.png` |
| Alias | `cbw-hero-neutral-soft-glow-v2.png` (same file, legacy name kept for compatibility) |
| Background-position | `center center` |
| Description | Same dark space scene with a soft white radial glow in the upper-center area. Supports readability of dark-text logos. |
| Status | **LIVE** |

### Variant 3: `strong_glow`

| Property | Value |
|---|---|
| Canonical path | `/media/hero-backgrounds/cbw-hero-neutral-strong-glow-v1.png` |
| Source file | `public/media/hero-backgrounds/cbw-hero-neutral-strong-glow-v1.png` |
| Background-position | `center center` |
| Description | `soft_glow` with stronger intensity and slightly wider radius. Same glow center, same composition — only brightness/spread increased. |
| Generator | `scripts/gen-strong-glow-hero-v1.mjs` — composites SVG radial overlay on **soft_glow base** at detected center (cx=1089, cy=221) |
| Glow center | cx=1089 (50.1%), cy=221 (30.5%) — **same as soft_glow**, auto-detected |
| Status | **LIVE** (geometry-fixed 2026-06-24, 707 KB) |

**Geometry inheritance rule:**
`strong_glow` always uses `soft_glow` as base. The glow center is not changed. Regenerating from `no_glow` base is forbidden — it creates a separate glow placement that does not match `soft_glow`.

**Forbidden for `strong_glow`:**
- Generating from `no_glow` base
- Moving the glow center upward or to a different position
- Creating a large round spotlight (circle, not ellipse)
- Any visual composition change relative to `soft_glow`

---

## 2. Per-Exchange Assignment

| Exchange | Glow Family | Hero PNG | Reason |
|---|---|---|---|
| Bybit | `no_glow` | `cbw-hero-neutral-no-glow-v2.png` | White/yellow wordmark — fully readable on dark without support |
| MEXC | `soft_glow` | `cbw-hero-neutral-logo-glow-v2.png` | Dark wordmark — soft glow provides sufficient contrast support |

---

## 3. Factory Rule: Default Assignment for New Exchanges

```
STEP 1: Test exchange logo on #0C1118 (standard hero dark).
STEP 2:
  - Logo wordmark fully readable at 100% opacity? → no_glow
  - Logo wordmark partially readable / some elements faint? → soft_glow
  - Logo wordmark still low-contrast after soft_glow? → strong_glow

CONSTRAINT: strong_glow requires the cbw-hero-neutral-strong-glow-v1.png asset.
  If not yet created, commission it before launching the exchange page.

RULE: glow-family is per-exchange, not per-surface.
  The same family is used across: page top hero, page bottom hero, OG, article, card.
```

Do not use `soft_glow` or `strong_glow` for exchanges with white/light logos — unnecessary glow breaks visual consistency.

---

## 4. CSS Usage Patterns

Both top and bottom promo blocks share the `.brand-hero` CSS class. One URL change covers both.

### `no_glow`

```css
.brand-hero {
  background:
    url('/media/hero-backgrounds/cbw-hero-neutral-no-glow-v2.png') left center / cover no-repeat,
    linear-gradient(160deg, var(--bh-bgFrom) 0%, var(--bh-bgTo) 100%);
}
```

### `soft_glow`

```css
.brand-hero {
  background:
    url('/media/hero-backgrounds/cbw-hero-neutral-logo-glow-v2.png') center center / cover no-repeat,
    linear-gradient(160deg, var(--bh-bgFrom) 0%, var(--bh-bgTo) 100%);
}
```

### `strong_glow` *(pending asset)*

```css
.brand-hero {
  background:
    url('/media/hero-backgrounds/cbw-hero-neutral-strong-glow-v1.png') center center / cover no-repeat,
    linear-gradient(160deg, var(--bh-bgFrom) 0%, var(--bh-bgTo) 100%);
}
```

---

## 5. Component Mode Mapping

When the hero background provides the glow (baked into the PNG), the component uses `mode="clean"` — no CSS glow layer is added on top.

When the `strong_glow` family is assigned and the glow is also applied via the CSS component layer (e.g. in image-pack generators without a background image), use `mode="strong-glow"` on `ExchangePromoLogoSlot`.

| Glow Family | Hero PNG glow baked | Component mode (page) | Component mode (image pack) |
|---|---|---|---|
| `no_glow` | no | `clean` | `clean` |
| `soft_glow` | yes (soft) | `clean` | `soft-glow` |
| `strong_glow` | yes (strong) | `clean` | `strong-glow` |

---

## 6. Forbidden Patterns

| Forbidden | Reason |
|---|---|
| Per-exchange custom hero backgrounds | Breaks visual consistency |
| AI-generated per-exchange backgrounds | Only approved factory variants allowed |
| Adding CSS glow on top of a glow-baked hero PNG | Creates double-glow |
| Using glow variant on a white-logo exchange | Unnecessary |
| Different glow family on page hero vs image pack | Violates shared token rule |
| Different backgrounds for top vs bottom block | Both must be identical |
| Using `strong_glow` without owner approval | Escalated glow requires explicit sign-off |

---

## 7. Version History

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-06-24 | Initial — 2 variants: no-glow + logo-glow (v2 PNGs, exchange-neutral) |
| v1.1 | 2026-06-24 | 3-level glow taxonomy: `no_glow` / `soft_glow` / `strong_glow`; shared token rule; strong_glow hero PNG pending; component mode mapping added |
| v1.2 | 2026-06-24 | strong_glow hero PNG generated and confirmed LIVE; all 3 variants now have assets |
| v1.3 | 2026-06-24 | strong_glow geometry fixed: now inherits soft_glow as base (not no_glow); glow center detected and locked to cx=1089, cy=221; forbidden cases added |

---

*To add the strong_glow hero PNG: generate the space background with a stronger radial glow (opacity 0.82 at center vs 0.65 for soft), save as `cbw-hero-neutral-strong-glow-v1.png`, place in `public/media/hero-backgrounds/`, update this document, update §8 in the Visual Pack Factory Standard.*
