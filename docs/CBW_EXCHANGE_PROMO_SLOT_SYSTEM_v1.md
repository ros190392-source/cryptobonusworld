# CBW Exchange Promo Slot System — v1.1
**Status:** CANONICAL — BYBIT-BASED  
**Date:** 2026-06-23  
**Scope:** All exchange visual packs + all exchange page promo blocks on cryptobonusworld.com  
**Supersedes:** `CBW_EXCHANGE_LOGO_SLOT_SYSTEM_v1.md` (deprecated — do not use)  
**Master reference:** Bybit Golden Pack (pixel-scanned 2026-06-23, verified with Sharp raw buffer)

---

## 1. Concept

Every exchange page on CBW has two outputs that must look like they belong to the same system:

1. **Three visual pack images** — distributed as social cards, OG meta tags, and article thumbnails.
2. **Two page promo blocks** — the hero (top) and the bottom CTA section on the exchange page itself.

Both outputs share one rigid layout grammar: three vertically stacked slots, center-aligned, with fixed proportional anchors. Only brand-specific tokens (logo, color, glow) change per exchange. Everything else is frozen.

**This document is derived from direct pixel measurement of the approved Bybit Golden Pack images.** All percentages and pixel values in this document were measured from `bybit-card-final-v1-1200x800.jpg`, `bybit-og-final-v1-1200x630.jpg`, and `bybit-article-final-v1-1200x675.jpg` using raw buffer sampling.

---

## 2. System Architecture — Three Slots

Every promo composition contains exactly three content zones, stacked vertically:

```
┌─────────────────────────────────────────┐
│                                         │
│         ┌─────────────────────┐         │  ← SLOT 1: Logo       (centerY 28.5%)
│         │   Official Logo     │         │
│         └─────────────────────┘         │
│                                         │
│         ┌─────────────────────┐         │  ← SLOT 2: Descriptor (centerY 55.0%)
│         │   REFERRAL CODE     │         │
│         └─────────────────────┘         │
│                                         │
│         ┌─────────────────────┐         │  ← SLOT 3: CTA Button (centerY 75.5%)
│         │   CLICK TO CLAIM  🖱 │         │
│         └─────────────────────┘         │
│                                         │
└─────────────────────────────────────────┘
```

**What changes per exchange:** logo asset, descriptor text, button fill color, button glow color, background accent colors / orbs / planets.

**What never changes:** slot Y-center percentages, slot proportions, gap ratios, font family, font weight, cursor asset, border radius logic, text treatment.

---

## 3. Vertical Slot System — Percentage Anchors

These are the master Y-center anchors as a fraction of canvas height. **Measured directly from Bybit Golden Pack pixels.**

| Slot | Center Y (%) | Bybit Card px | Bybit OG px | Bybit Article px |
|---|---|---|---|---|
| Logo | **28.5%** | 228 | 180 | 192 |
| Descriptor | **55.0%** | 440 | 347 | 371 |
| CTA Button | **75.5%** | 604 | 476 | 510 |

These values are invariant. Do not deviate. Do not eyeball.

---

## 4. Slot Dimensions — Bybit Master Values

### 4.1 Logo Slot

**Bybit measured values:**

| Property | Percentage | Card px | OG px | Article px |
|---|---|---|---|---|
| Height | **17.0%** of canvas H | 136 | 107 | 115 |
| Y range (top→bot) | — | 160–296 | 126–233 | 134–249 |
| Center X | 50% | 600 | 600 | 600 |

Additional rules:
- Fit: contain — no distortion, no recolor
- Horizontal position: centered on canvas
- Dark-bg safety: if logo has dark text on dark bg, mount on white plaque (see §7)
- Plaque border radius: 14px
- Logo/plaque must never extend beyond this slot

### 4.2 Descriptor Slot

**Bybit measured values:**

| Property | Percentage | Card px | OG px | Article px |
|---|---|---|---|---|
| Slot height zone | **16.0%** of canvas H | 128 | 101 | 108 |
| Approx font size | ~88% of slot height | ~113 | ~89 | ~95 |
| Text width ("REFERRAL CODE") | **~60–65%** of canvas W | ~960 (est) | 721 | 761 |
| Y center | 55.0% | 440 | 347 | 371 |

Typography (matching Bybit visual pack):
- Font family: `'Arial Black', 'Arial', 'Helvetica Neue', sans-serif`
- Font weight: 900 / Black
- Case: UPPERCASE
- Letter spacing: 3px
- Text anchor: middle (horizontally centered)
- Fill: `#ffffff` (white)
- Drop shadow: `dy=3, stdDeviation=4, flood-color=#000, opacity=0.75`
- Font size formula: `Math.round(slotHeight * 0.88)` where `slotHeight = 0.16 × H`

**Note on font family:** The Bybit golden pack uses a wide heavy sans-serif consistent with Arial Black. Do NOT switch to Bebas Neue or Anton without owner approval — those are condensed fonts and will change the visual weight.

Descriptor text examples by exchange:
- Bybit → `REFERRAL CODE`
- MEXC → `REFERRAL CODE`
- Binance → `REFERRAL CODE`
- Gate.io → `REFERRAL CODE`

Use the same text for all exchanges with a referral code. Only change if exchange uses a fundamentally different promo mechanism (invite code, promo code, etc.).

### 4.3 CTA Button Slot

**Bybit measured values:**

| Property | Percentage | Card px | OG px | Article px |
|---|---|---|---|---|
| Width | **40.0%** of canvas W | 480 | 480 | 480 |
| Height | **13.0%** of canvas H | 104 | 82 | 88 |
| X range (left→right) | — | 360–839 | 360–839 | 360–839 |
| Y center | 75.5% | 604 | 476 | 510 |
| Border radius | height / 2 (pill) | 52 | 41 | 44 |

Additional rules:
- Button text: `CLICK TO CLAIM`
- Button text font: `'Arial Black'`, weight 900, uppercase
- Button text size: `Math.round(buttonH × 0.40)`
- Button text X position: offset left to leave room for cursor icon
- Cursor: white hand at right edge of button (see §8)
- What changes per exchange: button fill gradient, glow color only
- Bybit button color: amber/gold gradient (top: `#ffe9a0`, center: `#f19d00`)

---

## 5. Fixed Vertical Gaps

Gaps between slot centers are enforced by the Y-anchor system. For reference:

| Gap | Percentage of H | Card px | OG px | Article px |
|---|---|---|---|---|
| Logo center → Descriptor center | **26.5%** | 212 | 167 | 179 |
| Descriptor center → Button center | **20.5%** | 164 | 129 | 139 |

These are implicit — if Y anchors are correct, gaps are correct. Do not compute them independently.

---

## 6. Pixel Maps — Master Reference Tables

### A) Card — 1200 × 800

| Element | Pixel value | % of canvas |
|---|---|---|
| Logo center Y | **228 px** | 28.5% |
| Logo slot Y range | 160–296 px | 20%–37% |
| Logo slot height | **136 px** | **17.0%** |
| Descriptor center Y | **440 px** | 55.0% |
| Descriptor slot height | 128 px | 16.0% |
| Descriptor font size | ~113 px | — |
| Descriptor text width | ~960 px | ~80% |
| Button center Y | **604 px** | 75.5% |
| Button slot Y range | 552–656 px | 69%–82% |
| Button height | **104 px** | **13.0%** |
| Button width | **480 px** | **40.0%** |
| Button X range | 360–839 px | 30%–70% |
| Button border radius | 52 px | pill |

### B) OG — 1200 × 630

| Element | Pixel value | % of canvas |
|---|---|---|
| Logo center Y | **180 px** | 28.6% |
| Logo slot Y range | 126–233 px | 20%–37% |
| Logo slot height | **107 px** | **17.0%** |
| Descriptor center Y | **347 px** | 55.1% |
| Descriptor slot height | 101 px | 16.0% |
| Descriptor font size | ~89 px | — |
| Descriptor text width | **721 px** | **60%** ← most reliable |
| Button center Y | **476 px** | 75.6% |
| Button slot Y range | 435–517 px | 69%–82% |
| Button height | **82 px** | **13.0%** |
| Button width | **480 px** | **40.0%** |
| Button X range | 360–839 px | 30%–70% |
| Button border radius | 41 px | pill |

### C) Article — 1200 × 675

| Element | Pixel value | % of canvas |
|---|---|---|
| Logo center Y | **192 px** | 28.4% |
| Logo slot Y range | 134–249 px | 20%–37% |
| Logo slot height | **115 px** | **17.0%** |
| Descriptor center Y | **371 px** | 55.0% |
| Descriptor slot height | 108 px | 16.0% |
| Descriptor font size | ~95 px | — |
| Descriptor text width | **761 px** | **63%** |
| Button center Y | **510 px** | 75.6% |
| Button slot Y range | 466–554 px | 69%–82% |
| Button height | **88 px** | **13.0%** |
| Button width | **480 px** | **40.0%** |
| Button X range | 360–839 px | 30%–70% |
| Button border radius | 44 px | pill |

---

## 7. Page Promo Block Standard

The same three-slot logic governs both the top hero block and the bottom CTA block on every exchange page.

Page blocks are responsive, so absolute pixels differ from the visual pack. The reference container is `max-width: 540px`, centered.

### 7.1 Page Block Structure (matching Bybit golden reference)

```
.brand-hero
  .bh-inner  (max-width: 540px, centered, text-align: center)
    img.bh-wordmark       ← Logo Slot
    span.bh-promo-label   ← Descriptor Slot  
    .bh-promo-row         ← Code box (exchange-specific)
    a.bh-cta-btn          ← CTA Button Slot
    p.bh-source           ← Attribution footnote
```

### 7.2 Page Block CSS Tokens (Bybit golden reference = standard)

| Token | Desktop (≥640px) | Mobile (<640px) | Mini (<360px) |
|---|---|---|---|
| `.brand-hero` padding | `42px 0 46px` | `35px 0 54px` | — |
| `.bh-inner` max-width | `540px` | `540px` | `540px` |
| `.bh-wordmark` width | `210px` | `165px` | `140px` |
| `.bh-wordmark` border-radius | **none — FORBIDDEN** | **none — FORBIDDEN** | **none — FORBIDDEN** |
| `.bh-wordmark` mix-blend-mode | **none — FORBIDDEN** | **none — FORBIDDEN** | **none — FORBIDDEN** |
| `.bh-wordmark` filter | `none` | `none` | `none` |
| `.bh-wordmark` opacity | `1` | `1` | `1` |
| `.bh-promo-label` font-size | `18px` | `22px` | — |
| `.bh-promo-label` font-weight | `700` | `700` | — |
| `.bh-promo-label` letter-spacing | `0.10em` | `0.09em` | — |
| `.bh-promo-label` text-transform | `uppercase` | `uppercase` | — |
| `.bh-promo-row` max-width | `298px` | `298px` | — |
| `.bh-promo-row` height | `56px` | `56px` | — |
| `.bh-cta-btn` max-width | `320px` | `320px` | — |
| `.bh-cta-btn` height | `68px` | `68px` | — |
| `.bh-cta-btn` border-radius | `6px` | `6px` | — |

### 7.3 Page Block Field Width

The dark promo field (`.brand-hero`) must be full page width. The inner container is `max-width: 540px` centered. No exchange may use a narrower or shorter hero block than Bybit.

### 7.4 Forbidden Page Alterations

- Do NOT add `border-radius` to `.bh-wordmark`
- Do NOT add `mix-blend-mode` to `.bh-wordmark`
- Do NOT add breadcrumb strips above the hero
- Do NOT add navigation rows above the hero  
- Do NOT set `.brand-hero` to a fixed height that is shorter than the Bybit reference

---

## 8. Cursor Asset Standard

A single shared cursor asset is used in all visual pack images.

**Measured from Bybit Golden Pack:**

| Format | Cursor width | Cursor height | Cursor X range | Cursor centerX |
|---|---|---|---|---|
| Card | ~48 px | ~34 px | 820–867 | 844 (70.3%) |
| OG | ~39 px | ~15 px | 795–833 | 814 (67.8%) |
| Article | ~40 px | ~25 px | 777–816 | 797 (66.4%) |

Cursor is positioned at the right edge of the CTA button, slightly overlapping the button border.

**Cursor SVG spec (current CBW implementation):**
- Viewbox: `24 × 32`
- Shape: white hand, single unified `<path>` — index finger up, thumb left bump, fist/palm base
- Fill: `white`
- Stroke: `#1a1a1a`, stroke-width `1.4`
- Drop shadow: `dx=1 dy=2 stdDeviation=2 flood-opacity=0.55`
- Click energy lines: 3 diagonal lines radiating upper-right from fingertip, stroke white, opacity 0.9
- Cursor height ratio: `h = round(sz × 32/24)` — must match viewBox exactly

**Forbidden cursor patterns:**
- Two-rect construction — creates bottle/cylinder artifact
- Any `mix-blend-mode` override on cursor layer
- Legacy `72/56` or `38/22` height ratio (old viewBox values)

**Position formula:**
```javascript
const curSz  = Math.round(btnH * 0.90);
const curH   = Math.round(curSz * 32 / 24);
const curX   = btnX + btnW - Math.round(curSz * 0.5) + 4;
const curY   = btnY + Math.round((btnH - curH) * 0.4);
```

---

## 9. T-Token System

All visual pack generation scripts must use these T-token constants:

```javascript
const T = {
  logo: { centerY: 0.285, h: 0.170 },  // 17% height — measured from Bybit golden pack
  text: { centerY: 0.550, h: 0.160 },  // 16% height — measured from Bybit golden pack
  btn:  { centerY: 0.755, h: 0.130 },  // 13% height — measured from Bybit golden pack
  btnW: 0.40,                           // 40% width  — measured from Bybit golden pack
};
```

These are locked values derived from Bybit's actual pixel layout. Do not change without measuring a new Bybit golden pack and re-deriving.

**Font size derivation:**
```javascript
const textH    = Math.round(T.text.h * H);
const fontSize = Math.round(textH * 0.88);  // ≈90% of slot height
```

**Button dimensions derivation:**
```javascript
const btnH  = Math.round(T.btn.h * H);
const btnW2 = Math.round(T.btnW * W);    // use T.btnW, not a local var named btnW
const btnR  = Math.round(btnH / 2);      // pill shape
```

---

## 10. Logo Asset Rules

### 10.1 Required Files Per Exchange

Each exchange must have these canonical files before any visual pack generation:

| File | Description |
|---|---|
| `*-logo-official-source.png` | Raw official logo as downloaded from exchange press kit |
| `*-logo-official-trimmed.png` | Transparent bg, trimmed to bounding box |
| `*-logo-on-light-plaque.png` | (If dark-text logo) trimmed logo centered on white rounded rect |

Files live at: `public/media/exchanges/{slug}/logo/`

### 10.2 Same Asset in Visual Pack and Page Block

The same approved logo file must be used in:
- All 3 visual pack images
- Top page promo block
- Bottom page promo block

No unofficial variants. No recolored versions.

### 10.3 Dark-Background Safety

If the official wordmark uses dark text on transparent background, it must be mounted on a white plaque before compositing onto any dark background image.

Plaque spec:
- Background: `white`
- Border radius: `14px` (this is the plaque, NOT the wordmark img tag in CSS)
- Internal padding: min `22px` vertical, `24px` horizontal
- Plaque width: scaled to fit logo slot width
- Plaque height: scaled proportionally from WORDMARK_AR
- Logo inside: contain-scaled, centered

### 10.4 Bybit Logo Reference

```
/logos/bybit-wordmark-official.png
Natural dims: 210 × 78 px (AR 2.692)
Color: white wordmark
Usage: directly on dark bg, no plaque needed
```

### 10.5 MEXC Logo Reference

```
/media/exchanges/mexc/logo/mexc-logo-on-light-plaque.png
Natural dims: 322 × 91 px (AR 3.538) — includes white plaque
Plaque: white, rx=14, sized to logo slot
Logo inside: mexc-logo-official-trimmed.png
```

---

## 11. Production Workflow — New Exchange

Run these steps in order for every new exchange:

1. **Save logo assets** → `public/media/exchanges/{slug}/logo/`
2. **Verify dark-bg safety** → create plaque if needed
3. **Use T tokens from §9 verbatim** — do not modify
4. **Generate 3 preview images** → `public/media/exchanges/{slug}/preview/`
5. **Verify Y anchors**: logo~28.5%, desc~55.0%, btn~75.5% (±1% tolerance)
6. **Verify button width**: ≈40% of canvas (±1%)
7. **Verify cursor**: proper hand shape, not bottle
8. **Install logo in page** top + bottom promo block (`wordmarkImg`)
9. **Verify page CSS**: no `border-radius` or `mix-blend-mode` on `.bh-wordmark`
10. **Build check**: `npm run build` → 0 errors
11. **Capture screenshots** for owner review
12. **No deployment** until owner approves screenshots

---

## 12. QA Checklist

### Visual Pack Images

- [ ] Logo center Y = 28.5% ±1% of canvas height
- [ ] Descriptor center Y = 55.0% ±1% of canvas height
- [ ] Button center Y = 75.5% ±1% of canvas height
- [ ] Logo slot height = 17% ±1% of canvas height
- [ ] Descriptor slot height = 16% ±1% of canvas height
- [ ] Button height = 13% ±1% of canvas height
- [ ] Button width = 40% ±1% of canvas width (480px for 1200px canvas)
- [ ] Button shape is pill (border-radius = height / 2)
- [ ] Cursor is proper hand shape (not bottle/cylinder)
- [ ] Cursor height ratio = `sz × 32/24` (not legacy values)
- [ ] Descriptor is UPPERCASE white with drop shadow
- [ ] All 3 formats generated from same script run
- [ ] File sizes reasonable (card ~100–140 KB, OG/article ~90–125 KB)

### Page Promo Block

- [ ] `.bh-wordmark` has NO `border-radius`
- [ ] `.bh-wordmark` has NO `mix-blend-mode`
- [ ] `.bh-wordmark` has `filter: none; opacity: 1`
- [ ] `.bh-wordmark` widths: `165px` mobile / `210px` desktop / `140px` mini
- [ ] `.bh-inner` max-width: `540px`
- [ ] `.bh-promo-row` max-width: `298px`, height: `56px`
- [ ] `.bh-cta-btn` max-width: `320px`, height: `68px`, border-radius: `6px`
- [ ] No breadcrumb row above hero
- [ ] No navigation strip above hero
- [ ] Hero padding: `35px 0 54px` mobile / `42px 0 46px` desktop
- [ ] Same logo asset in top block, bottom block, and all 3 visual pack images
- [ ] Build passes: `npm run build` → 0 errors

---

## 13. Forbidden Deviations

| # | Violation |
|---|---|
| FD-01 | Y anchor deviates from 28.5 / 55.0 / 75.5% by more than 1.5% |
| FD-02 | Button width deviates from 40% by more than 2% |
| FD-03 | Logo slot height deviates from 17% by more than 2% |
| FD-04 | Descriptor slot height deviates from 16% by more than 2% |
| FD-05 | Cursor height ratio uses legacy `72/56` or `38/22` instead of `32/24` |
| FD-06 | Cursor SVG uses two-rect construction (bottle/cylinder artifact) |
| FD-07 | `.bh-wordmark` CSS has any `border-radius` value |
| FD-08 | `.bh-wordmark` CSS has any `mix-blend-mode` value |
| FD-09 | Breadcrumb row above hero block |
| FD-10 | Logo recolored or unofficial variant used |
| FD-11 | Different logo asset used in visual pack vs page block |
| FD-12 | Manual eyeballing of slot positions instead of formula |
| FD-13 | Deployment without owner screenshot approval |

---

## 14. Audit: Bybit

**Status: COMPLIANT — MASTER REFERENCE ✅**

### Visual Pack — COMPLIANT ✅

All geometry in the Bybit golden pack was pixel-measured on 2026-06-23 using Sharp raw buffer sampling. The T-token constants in §9 are derived directly from these measurements.

| Metric | Bybit Actual | Spec v1.1 | Status |
|---|---|---|---|
| Logo center Y | 28.5% | 28.5% | ✅ |
| Logo slot height | 17.0% | 17.0% | ✅ MASTER |
| Descriptor center Y | 55.0% | 55.0% | ✅ |
| Descriptor slot height | 16.0% | 16.0% | ✅ MASTER |
| Button center Y | 75.5% | 75.5% | ✅ |
| Button height | 13.0% | 13.0% | ✅ MASTER |
| Button width | 40.0% | 40.0% | ✅ MASTER |
| Button shape | Pill (r=H/2) | Pill (r=H/2) | ✅ |
| Cursor position | Right of button | Right of button | ✅ |

**Additional measured Bybit facts:**
- Logo pixel color at center: `RGB(254,254,254)` — pure white wordmark
- Button fill color at center: `#f19d00` amber/gold gradient
- Button X range: 360–839px (all three formats)
- Cursor: white, ~40-48px wide, at x≈795–867 depending on format

### Page Promo Block — COMPLIANT ✅

All CSS tokens match the standard defined in §7.2 exactly.

---

## 15. Audit: MEXC

**Status: 2 REMAINING VIOLATIONS — both P1, easy fixes**

### Visual Pack (preview files) — COMPLIANT ✅

The MEXC visual pack script (`scripts/pack-mexc-aligned.mjs`) uses the same T-token values as the Bybit master. All geometry matches:

| Metric | MEXC Script | Spec v1.1 | Status |
|---|---|---|---|
| Logo center Y | 28.5% (T.logo.centerY) | 28.5% | ✅ |
| Logo slot height | 17.0% (T.logo.h) | 17.0% | ✅ |
| Descriptor center Y | 55.0% (T.text.centerY) | 55.0% | ✅ |
| Descriptor slot height | 16.0% (T.text.h) | 16.0% | ✅ |
| Button center Y | 75.5% (T.btn.centerY) | 75.5% | ✅ |
| Button height | 13.0% (T.btn.h) | 13.0% | ✅ |
| Button width | 40.0% (T.btnW) | 40.0% | ✅ |
| Cursor shape | Fixed path-based hand | Path-based hand | ✅ |
| Cursor ratio | 32/24 | 32/24 | ✅ |

### Page Promo Block — 1 VIOLATION ❌

| Check | Status | Detail |
|---|---|---|
| `.bh-wordmark` widths | ✅ | 165px / 210px / 140px |
| `.bh-wordmark` border-radius | ❌ **FD-07** | `border-radius: 10px` — must be removed |
| `.bh-wordmark` mix-blend-mode | ✅ | None present |
| `.bh-wordmark` filter | ✅ | `filter: none; opacity: 1` |
| `.bh-inner` max-width | ✅ | 540px |
| `.bh-promo-row` | ✅ | 298px × 56px |
| `.bh-cta-btn` | ✅ | 320px × 68px, radius 6px |
| Hero padding | ✅ | Matches Bybit |
| No breadcrumb | ✅ | Removed in prior session |
| Logo asset consistency | ✅ | Same plaque in both page blocks |

### Asset Files — 1 VIOLATION ❌

| Check | Status | Detail |
|---|---|---|
| `logo-slot-preview-v1` files | ✅ | All 3 formats regenerated with fixed cursor |
| `variantA` files | ❌ **FD-06** | Old bottle cursor; referenced by `articleImg`/`ogImage` in `index.astro` |
| `exchanges.ts` cardImage | ⚠️ | Still old v2 path — awaiting owner approval |

---

## 16. Violations Summary

| ID | Scope | File | Issue | Priority |
|---|---|---|---|---|
| V-01 | MEXC page CSS | `src/pages/mexc/index.astro` | `.bh-wordmark { border-radius: 10px }` — FD-07 | **P1** |
| V-02 | MEXC variantA assets | `public/media/exchanges/mexc/preview/*variantA*` | Old bottle cursor in all 3 variantA files — FD-06 | **P1** |

All previously listed violations V-02 through V-07 (logo height, text height, button width) were incorrect comparisons to theoretical spec values. They are CLEARED — MEXC's T tokens match Bybit's actual measured geometry.

---

## 17. Recommended Fix Order

### Fix V-01 — MEXC page border-radius (5 minutes)

File: `src/pages/mexc/index.astro`  
Change: Remove `border-radius: 10px` from `.bh-wordmark` CSS rule.  
Before:
```css
.bh-wordmark {
  display: block;
  width: 165px;
  height: auto;
  margin: 0 auto 10px;
  filter: none;
  opacity: 1;
  border-radius: 10px;   ← REMOVE THIS LINE
}
```
After: that line is gone. All other rules stay.

### Fix V-02 — MEXC variantA cursor (10 minutes)

**Option A (recommended — simpler):** Update `src/pages/mexc/index.astro` to point `articleImg` and `ogImage` at the already-corrected `logo-slot-preview-v1` files instead of the stale `variantA` files.

```javascript
// Change in index.astro exchange object:
articleImg: '/media/exchanges/mexc/preview/mexc-article-logo-slot-preview-v1-1200x675.jpg',
ogImage:    '/media/exchanges/mexc/preview/mexc-og-logo-slot-preview-v1-1200x630.jpg',
```

**Option B (heavier — regenerate variantA):** Write a new script that regenerates the variantA files using the fixed cursor. Not recommended — the `logo-slot-preview-v1` files are higher quality.

After both fixes: build → screenshot → await owner approval → then deploy.

---

## 18. File Registry

| Exchange | Visual Pack Script | Preview Dir | Page File | Status |
|---|---|---|---|---|
| Bybit | _(original production images, no script)_ | `public/media/exchanges/bybit/final/` | `src/pages/bybit/index.astro` | ✅ COMPLIANT |
| MEXC | `scripts/pack-mexc-aligned.mjs` | `public/media/exchanges/mexc/preview/` | `src/pages/mexc/index.astro` | ⚠️ 2 P1 violations |

---

## 19. Measurement Methodology

All Bybit geometry values in this document were derived from:

```
Tool: Node.js / Sharp raw buffer
Files: public/media/exchanges/bybit/final/bybit-{card,og,article}-final-v1-*.jpg
Scripts: scripts/measure-bybit-golden.mjs, scripts/measure-bybit-precise.mjs, scripts/measure-bybit-sample.mjs
Date: 2026-06-23
Channels: 3 (RGB, no alpha — JPEG)
```

Key sampling points used for confirmation:
- Logo: pixel at (600, logoCY) → `RGB(254,254,254)` white ✅
- Button fill: pixel at (600, 604) Card → `RGB(241,157,0)` amber ✅
- Button row: horizontal scan at button center Y → golden within x=360–839, black beyond x=900 ✅
- Descriptor: bright pixels (>180) at text Y → 721px wide at OG ✅

---

*Document maintained at `docs/CBW_EXCHANGE_PROMO_SLOT_SYSTEM_v1.md`*  
*Previous doc `docs/CBW_EXCHANGE_LOGO_SLOT_SYSTEM_v1.md` is deprecated — do not use.*
