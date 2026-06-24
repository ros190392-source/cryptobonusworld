# CBW Page Promo Logo Slot Standard — v1.1

**Status:** CANONICAL  
**Date:** 2026-06-24 (v1.1 — 3-level glow taxonomy)  
**Scope:** Exchange page top + bottom promo blocks on cryptobonusworld.com  
**Component:** `src/components/ExchangePromoLogoSlot.astro`  
**Related:** `docs/CBW_EXCHANGE_VISUAL_PACK_FACTORY_STANDARD_v1.md` — shared glow token system  
**Related:** `docs/CBW_HERO_BACKGROUND_STANDARD_v1.md` — hero background variants per glow family

---

## 1. Purpose

Every exchange page on CBW has two promo blocks (top hero and bottom closing block). Both must render the exchange logo in an identical, fixed-dimension slot — no free-form `width` values per page, no different logo sizes between top and bottom, no drift across exchanges.

This document defines those dimensions and the rules for the `ExchangePromoLogoSlot` component.

---

## 2. Fixed Slot Dimensions

### Desktop (≥ 640px)

| Property | Value |
|---|---|
| Slot width | 320 px |
| Slot height | 96 px |
| Logo max-width | 300 px |
| Logo max-height | 86 px |
| object-fit | contain |
| object-position | center center |

### Mobile (< 640px)

| Property | Value |
|---|---|
| Slot width | 250 px |
| Slot height | 76 px |
| Logo max-width | 235 px |
| Logo max-height | 68 px |
| object-fit | contain |
| object-position | center center |

The slot dimensions are frozen. Only `visualScale` (see §4) may reduce the logo's effective max-width / max-height within the slot for optical balance.

---

## 3. Logo Source Rule

The logo asset used in both page promo blocks **must be the same asset** used in the 3-image visual pack.

**Path convention:**
```
public/media/exchanges/{slug}/logo/{slug}-logo-*-trimmed.png
```

Rules:
- Use the official horizontal wordmark wherever available
- The asset must be a transparent PNG, trimmed (no excess transparent border)
- The top promo block and bottom promo block must use the same `src`
- The OG image, Article image, and Card image must use the same `src`
- No per-block logo overrides — one asset per exchange, used everywhere

---

## 4. Optical Scale (`visualScale`)

The slot is fixed. Some logos look better at less than 100% of the slot budget.

| Exchange | `visualScale` | Effective desktop max-width |
|---|---|---|
| Bybit | 0.70 | 210 px |
| MEXC | 1.00 | 300 px |
| Default (all others) | 1.00 | 300 px |

`visualScale` must not be used to work around a wrong logo asset. Fix the asset first.

---

## 5. Glow Family and Component Mode

The glow family is a **per-exchange token** shared across all surfaces. See `CBW_EXCHANGE_VISUAL_PACK_FACTORY_STANDARD_v1.md §3` for full token definitions.

### Glow families

| Glow family | Use case | Component mode (page) | Component mode (image pack) |
|---|---|---|---|
| `no_glow` | White/light logo, readable on dark without support | `clean` | `clean` |
| `soft_glow` | Dark wordmark, moderate support needed | `clean`* | `soft-glow` |
| `strong_glow` | Dark wordmark, insufficient contrast even with soft_glow | `clean`* | `strong-glow` |

*On page promo blocks, use `mode="clean"` whenever the hero background PNG already has the glow baked in. The CSS glow modes (`soft-glow`, `strong-glow`) are for image-pack generators where no background image layer is present.

### Component mode reference

| `mode` prop | Glow layer | Center opacity | Size |
|---|---|---|---|
| `clean` | none | — | — |
| `soft-glow` | radial ellipse | 0.65 | 145% × 125% slot |
| `strong-glow` | radial ellipse | 0.82 | 165% × 145% slot |
| `glow` | alias for `soft-glow` | 0.65 | 145% × 125% slot |

---

## 6. Component Props

```astro
<ExchangePromoLogoSlot
  src={exchange.wordmarkImg}
  alt={exchange.name}
  mode="clean"            <!-- 'clean' | 'soft-glow' | 'strong-glow' | 'glow' (alias) -->
  visualScale={0.70}      <!-- optional, default 1.0 -->
  fetchpriority="high"    <!-- use 'high' for top block, omit for bottom -->
  loading="lazy"          <!-- use 'lazy' for bottom block -->
/>
```

All props except `src` and `alt` are optional.

---

## 7. Forbidden Patterns

| Forbidden | Reason |
|---|---|
| Free-form `width` on `.bh-wordmark` per page | Creates per-page drift |
| Different logo asset in top vs bottom block | Breaks slot consistency |
| Different logo asset on page vs visual pack | Breaks brand system |
| White plaque or rounded card behind logo | Not part of the slot system |
| Distorted logos (`object-fit: fill`) | Forbidden in all contexts |
| AI-generated logos | Must use official exchange assets only |
| Logo that changes between top/bottom hero | Both must be identical |
| Different glow family on page vs image pack | Violates shared token rule |

---

## 8. Exchange Registry

| Exchange | Logo Asset | Glow Family | Mode (page) | Mode (image pack) | `visualScale` |
|---|---|---|---|---|---|
| Bybit | `/logos/bybit-wordmark-official.png` | `no_glow` | `clean` | `clean` | 0.70 |
| MEXC | `/media/exchanges/mexc/logo/mexc-logo-transparent-2517-trimmed.png` | `soft_glow` | `clean`* | `soft-glow` | 1.00 |

*MEXC page uses `mode="clean"` because the hero background PNG (`cbw-hero-neutral-logo-glow-v2.png`) already provides the glow layer at the logo position.

---

## 9. QA Checklist

**Per exchange page:**
- [ ] Top promo block uses `ExchangePromoLogoSlot` component
- [ ] Bottom promo block uses `ExchangePromoLogoSlot` component
- [ ] Both blocks use the same `src`
- [ ] Both blocks use the same `mode`
- [ ] Both blocks use the same `visualScale`
- [ ] Logo is readable without white plaque or card
- [ ] No `.bh-wordmark` free-form CSS on the page
- [ ] `fetchpriority="high"` on top block, `loading="lazy"` on bottom block
- [ ] `glow-family` matches hero background PNG variant

**Cross-page:**
- [ ] Same slot dimensions across all exchange pages
- [ ] Same logo asset in visual pack and page
- [ ] Same glow family on page and in image pack

---

## 10. Version History

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-06-24 | Initial standard — `clean` / `glow` modes |
| v1.1 | 2026-06-24 | 3-level glow taxonomy: `no_glow` / `soft_glow` / `strong_glow`; `strong-glow` mode added to component; glow family column in registry; shared token rule cross-referenced |

---

*Update §8 Exchange Registry when a new exchange page is created.*
