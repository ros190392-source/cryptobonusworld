# CBW Exchange Logo Slot Standard — v1.0
**Status:** CANONICAL  
**Date:** 2026-06-23  
**Scope:** All exchange logo placement across visual pack images and page promo blocks  
**Related:** `docs/CBW_EXCHANGE_PROMO_SLOT_SYSTEM_v1.md` (slot system overview)

---

## 1. Purpose

This document defines the exact pixel dimensions and placement rules for the Logo Slot in every exchange promo composition.

The Logo Slot is the first of three vertical slots in the Exchange Promo Slot System. It must use fixed dimensions — not percentage-of-canvas approximations — so that every exchange logo fits consistently regardless of logo aspect ratio.

---

## 2. Fixed Logo Slot Dimensions

### A) OG Image — 1200 × 630

| Property | Value |
|---|---|
| Slot center X | 600 px |
| Slot center Y | 180 px |
| Slot width | 520 px |
| Slot height | 120 px |
| Slot X range | 340–860 px |
| Slot Y range | 120–240 px |
| Max logo width | 460 px |
| Max logo height | 85 px |
| Logo fit | contain — no distortion |
| Logo horizontal alignment | centered within slot |
| Logo vertical alignment | centered within slot |

### B) Article Image — 1200 × 675

| Property | Value |
|---|---|
| Slot center X | 600 px |
| Slot center Y | 192 px |
| Slot width | 520 px |
| Slot height | 125 px |
| Slot X range | 340–860 px |
| Slot Y range | 130–255 px |
| Max logo width | 460 px |
| Max logo height | 90 px |
| Logo fit | contain — no distortion |

### C) Card Image — 1200 × 800

| Property | Value |
|---|---|
| Slot center X | 600 px |
| Slot center Y | 228 px |
| Slot width | 520 px |
| Slot height | 135 px |
| Slot X range | 340–860 px |
| Slot Y range | 161–296 px |
| Max logo width | 460 px |
| Max logo height | 95 px |
| Logo fit | contain — no distortion |

### D) Page Top Promo Block

| Property | Desktop (≥640px) | Mobile (<640px) | Mini (<360px) |
|---|---|---|---|
| `.bh-wordmark` CSS width | **300px** | **240px** | **200px** |
| Rendered height (AR 3.538) | ~85px | ~68px | ~57px |
| Spec range (width) | 260–320px | 210–250px | — |
| Spec range (height) | 80–95px | 65–80px | — |
| object-fit | contain (height: auto) | contain (height: auto) | — |
| margin-bottom to descriptor | via `.bh-promo-label` margin-top | — | — |

### E) Page Bottom Promo Block

Identical to the top promo block — same `.bh-wordmark` CSS class, same `exchange.wordmarkImg` asset.

---

## 3. Logo Asset Rules

### 3.1 Required Canonical Files Per Exchange

```
public/media/exchanges/{slug}/logo/{slug}-logo-official-source.png
public/media/exchanges/{slug}/logo/{slug}-logo-official-trimmed.png
public/media/exchanges/{slug}/logo/{slug}-logo-on-light-plaque.png
```

| File | Description | Usage |
|---|---|---|
| `*-official-source.png` | Raw file from exchange press kit; preserve original | Archive only |
| `*-official-trimmed.png` | Same logo, transparent bg, tight trim to bounding box | Used by pack script |
| `*-logo-on-light-plaque.png` | Trimmed logo centered on white rounded rect, for page blocks | `wordmarkImg` in page |

### 3.2 Prohibited Actions

- Do not AI-generate exchange logos
- Do not recolor logos
- Do not distort logos
- Do not use outdated branding unless owner explicitly approves
- Do not use "MEXC Global" — use "MEXC" only
- Do not use a different logo in the visual pack vs the page block

### 3.3 Dark-Background Safety

If the official wordmark uses dark text on transparent background, it must be mounted on a white plaque before compositing onto dark hero backgrounds.

**Plaque rules:**
- Background: `white` (RGB 255,255,255)
- Shape: rounded rectangle, `rx=14` (matches plaque aesthetic)
- Size: fills the slot (slot width × slot height for visual packs)
- Internal logo: fitted via contain-scale within (maxLogoW × maxLogoH)
- No shadow, no border, no visible hard edge
- No `border-radius` CSS on the `<img>` tag in page HTML — the plaque graphic has its own baked-in corners

---

## 4. MEXC Logo Assets

```
Source:   public/media/exchanges/mexc/logo/mexc-logo-official-source.png
          252×160 px, RGBA (original download — has transparency padding)

Trimmed:  public/media/exchanges/mexc/logo/mexc-logo-official-trimmed.png
          242×47 px, RGBA, AR 5.149
          (horizontal wordmark: "MEXC" text only, transparent background)

Plaque:   public/media/exchanges/mexc/logo/mexc-logo-on-light-plaque.png
          322×91 px, RGBA, AR 3.538
          (trimmed logo centered on white rounded rect, rx=14)
          → used as wordmarkImg in page promo blocks
```

**Logo contains:** "MEXC" wordmark only — NOT "MEXC Global"

### MEXC Logo Fit Calculation (AR = 5.149)

| Format | Max W | Max H | Fit result | Logo rendered dims |
|---|---|---|---|---|
| OG 1200×630 | 460 | 85 | height-constrained (85×5.149=437<460) | 437 × 85 px |
| Article 1200×675 | 460 | 90 | width-constrained (460/5.149=89<90) | 460 × 89 px |
| Card 1200×800 | 460 | 95 | width-constrained (460/5.149=89<95) | 460 × 89 px |
| Page desktop | display 300px wide → AR auto → 85px tall | | |
| Page mobile | display 240px wide → AR auto → 68px tall | | |

---

## 5. Compositing Instructions for Script

Use these exact values in pack generation scripts:

```javascript
// ── LOGO SLOT STANDARD — DO NOT MODIFY ───────────────────────────────
const LOGO_SLOT = {
  // [format]: { slotW, slotH, maxLogoW, maxLogoH, centerY, centerX }
  card:    { slotW: 520, slotH: 135, maxLogoW: 460, maxLogoH:  95, centerY: 228, centerX: 600 },
  og:      { slotW: 520, slotH: 120, maxLogoW: 460, maxLogoH:  85, centerY: 180, centerX: 600 },
  article: { slotW: 520, slotH: 125, maxLogoW: 460, maxLogoH:  90, centerY: 192, centerX: 600 },
};

// Compute from slot:
// slotLeft  = centerX - slotW / 2  = 600 - 260 = 340
// slotTop   = centerY - slotH / 2
// Logo: fit trimmedLogo (AR) inside maxLogoW × maxLogoH using contain
// Logo x within plaque: (slotW - logoW) / 2
// Logo y within plaque: (slotH - logoH) / 2
```

---

## 6. Page Block CSS Standard

Apply to every exchange page (per-page `<style>` block):

```css
/* Logo slot — fixed dimensions per CBW_EXCHANGE_LOGO_SLOT_STANDARD_v1 */
/* Mobile: 240px → ~68px height | Desktop: 300px → ~85px height */
.bh-wordmark {
  display: block;
  width: 240px;
  height: auto;
  margin: 0 auto 10px;
  filter: none;
  opacity: 1;
  /* NO border-radius — the plaque graphic has its own baked-in corners */
}
@media (min-width: 640px) { .bh-wordmark { width: 300px; } }
@media (max-width: 359px) { .bh-wordmark { width: 200px; } }
```

**Note:** The heights above assume a plaque with AR ≈ 3.538 (MEXC plaque). Bybit wordmark has AR ≈ 2.692, which at 300px → 112px — consider adjusting if Bybit applies this standard.

---

## 7. QA Checklist

### Visual Pack Images

- [ ] Logo slot center X = 600px (centered on 1200px canvas)
- [ ] Logo slot center Y matches format spec (180 / 192 / 228 px)
- [ ] Logo slot dimensions match format spec (520 × 120/125/135 px)
- [ ] Logo fits within max logo area (460 × 85/90/95 px)
- [ ] No logo distortion (contain scaling only)
- [ ] Logo says "MEXC" not "MEXC Global"
- [ ] Plaque has no visible dark patch
- [ ] Plaque has no oversized rectangle bleeding outside slot

### Page Promo Block

- [ ] `.bh-wordmark` width: 240px mobile / 300px desktop / 200px mini
- [ ] `.bh-wordmark` has NO `border-radius`
- [ ] Both top and bottom promo blocks use same `wordmarkImg`
- [ ] Logo readable at mobile size (240px = ~68px height)
- [ ] Logo readable at desktop size (300px = ~85px height)

---

## 8. Forbidden Deviations

| # | Violation |
|---|---|
| LS-01 | Logo slot center Y deviates from spec by more than 3px |
| LS-02 | Logo slot width deviates from 520px by more than 5px |
| LS-03 | Logo slot height deviates from format spec by more than 5px |
| LS-04 | Logo stretched or distorted (not contain) |
| LS-05 | "MEXC Global" text in logo |
| LS-06 | AI-generated logo used |
| LS-07 | `border-radius` on `.bh-wordmark` CSS rule |
| LS-08 | Different logo asset in visual pack vs page block |
| LS-09 | Plaque extends beyond slot boundaries |

---

*Document maintained at `docs/CBW_EXCHANGE_LOGO_SLOT_STANDARD_v1.md`*
