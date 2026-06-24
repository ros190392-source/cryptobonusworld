# CBW Exchange Visual Pack Factory Standard — v1.3

**Status:** CANONICAL  
**Date:** 2026-06-24 (v1.3 — logo color-lock rule)  
**Scope:** All exchange 3-image visual packs on cryptobonusworld.com  
**Related docs:**
- `docs/CBW_EXCHANGE_PROMO_SLOT_SYSTEM_v1.md` — slot geometry (frozen)
- `docs/CBW_EXCHANGE_LOGO_SLOT_STANDARD_v1.md` — logo slot pixel dimensions
- `docs/CBW_HERO_BACKGROUND_STANDARD_v1.md` — page hero background system
- `docs/CBW_PAGE_PROMO_LOGO_SLOT_STANDARD_v1.md` — page component logo slot

---

## 1. What a Visual Pack Is

Every exchange page produces a 3-image visual pack:

| Image | Dimensions | Purpose |
|---|---|---|
| OG | 1200 × 630 | Open Graph, social share, meta tag |
| Article | 1200 × 675 | Article thumbnail, editorial feed |
| Card | 1200 × 800 | Exchange card, comparison tiles |

All three images share the same slot system, the same logo, and the same **glow family**. Only proportional scaling differs between formats. The slot anchors are defined in `CBW_EXCHANGE_PROMO_SLOT_SYSTEM_v1.md` and must not be changed per-exchange.

---

## 2. Per-Exchange Tokens

The following tokens change per exchange. Everything else is frozen.

| Token | Description |
|---|---|
| `logo-asset` | Official logo, transparent PNG, from `public/media/exchanges/{slug}/logo/` |
| `glow-family` | `no_glow`, `soft_glow`, or `strong_glow` — applies to ALL surfaces (see §3) |
| `glow-color` | rgba value, neutral white-ish for most exchanges |
| `bg-gradient-from` | Brand background start color |
| `bg-gradient-to` | Brand background end color |
| `button-fill` | CTA button background color |
| `button-glow` | CTA button ambient glow color |
| `descriptor-text` | e.g. `REFERRAL CODE` or `PROMO CODE` |
| `code-value` | The actual promo/referral code string |

### Shared Token Rule — glow-family

The `glow-family` token is the **single source of truth** for glow intensity across the entire system for a given exchange. It applies identically to:

- Exchange page top promo hero block
- Exchange page bottom promo hero block
- OG image (1200 × 630)
- Article image (1200 × 675)
- Card / homepage image (1200 × 800)

**The same exchange must use the same glow family everywhere.** No per-surface overrides.

---

## 3. Glow Family Standard

### Overview

Three glow families are defined. Choose exactly one per exchange at page creation time and apply it across all surfaces.

| Family | Old name | Use case |
|---|---|---|
| `no_glow` | `clean` | Exchange logo is white/light and readable on dark background without support |
| `soft_glow` | `glow-assisted` | Exchange logo has a dark/black wordmark that needs moderate readability support |
| `strong_glow` | *(new)* | Dark wordmark that remains low-contrast even with `soft_glow`, especially on mobile |

---

### 3A. `no_glow` Family

**Use when:** the exchange logo is already readable on a dark background without any support layer.

**Example:** Bybit (white/yellow logo on dark)

**Page hero:** `cbw-hero-neutral-no-glow-v2.png` — background-position `left center`  
**Component mode:** `mode="clean"` on `ExchangePromoLogoSlot`  
**Image pack glow:** none

**Rules:**
- No glow behind logo
- No white plaque
- No background card, oval, or rounded rectangle
- Official logo inserted directly into the fixed logo slot
- Logo alpha channel used as-is

---

### 3B. `soft_glow` Family

**Use when:** the exchange logo has dark or black wordmark elements that lose contrast against the dark hero background, but the logo remains broadly visible.

**Example:** MEXC (dark wordmark on transparent background)

**Page hero:** `cbw-hero-neutral-soft-glow-v2.png` (= `cbw-hero-neutral-logo-glow-v2.png` — same asset, alias)  
**Background-position:** `center center`  
**Component mode:** `mode="clean"` (hero WebP/PNG provides the glow — no CSS glow layer added)  
**Image pack glow:** radial feathered ellipse — `soft_glow` token values below

**Rules:**
- Same fixed logo slot as `no_glow` — no positional difference
- Same logo scale rules — no size change to compensate for glow
- No hard rectangle, white plaque, grey card, or pill shape
- Glow must not compete with the descriptor text slot or CTA button slot
- Glow must not extend to canvas edges
- Glow appearance must be consistent across all 3 image formats (scaled proportionally)

---

### 3C. `strong_glow` Family

**Use when:** `soft_glow` is not sufficient — the dark wordmark still has poor contrast, particularly on mobile viewports or when the hero scene is especially dark. Use this as a deliberate escalation, not a default.

**Page hero:** `cbw-hero-neutral-strong-glow-v1.png` (LIVE — generated 2026-06-24)  
**Background-position:** `center center`  
**Component mode:** `mode="strong-glow"` on `ExchangePromoLogoSlot`  
**Image pack glow:** radial feathered ellipse — `strong_glow` token values below  
**Generator:** `scripts/gen-strong-glow-hero-v1.mjs`

**Geometry inheritance rule (CRITICAL):**

> `strong_glow` is NOT a new glow placement. It is `soft_glow` with stronger intensity and slightly larger spread.
> The glow center X and Y are identical to `soft_glow`. Only opacity and radius change.

**Rules:**
- Same glow center position as `soft_glow` (detected: cx=50.1%, cy=30.5% of image)
- Same visual composition, same logo readability zone
- Same overall atmosphere — strong_glow must look like "soft_glow but brighter"
- No new light blob, no separate light source, no change in glow direction
- The glow must still read as natural illumination — not a visible effect
- Strong glow does not mean "visible glow" — it means "more opacity at center, slightly wider radius"

**Forbidden (strong_glow-specific):**
- Large top spotlight separate from the soft_glow zone
- Circular lamp / round bright blob
- Glow center not aligned with soft_glow center
- Any change to visual composition relative to soft_glow
- Generating from no_glow base instead of soft_glow base

---

### 3D. Glow Token Table

All glow values are proportional — derived from the logo slot dimensions and canvas height.
Generator scripts must not hardcode pixel values; they must compute from slot × scale factor.

| Token | `no_glow` | `soft_glow` | `strong_glow` |
|---|---|---|---|
| `glow-type` | — | radial ellipse, fully feathered | radial ellipse, fully feathered |
| `glow-color` | — | `rgba(235, 245, 255)` | `rgba(235, 245, 255)` |
| `glow-opacity-center` | 0.0 | 0.65 | 0.78–0.82 |
| `glow-opacity-edge` | 0.0 | 0.0 | 0.0 |
| `glow-width` | — | 145% of logo slot width | 160% of logo slot width |
| `glow-height` | — | 125% of logo slot height | 140% of logo slot height |
| `glow-center-X` | — | Logo slot center X | **Same as soft_glow** |
| `glow-center-Y` | — | Slot center Y − 3% canvas | **Same as soft_glow** |
| `glow-blend` | — | normal (alpha under logo) | normal (alpha under logo) |
| `glow-shape` | — | ellipse | ellipse |
| `glow-hard-edge` | — | forbidden | forbidden |
| `glow-base` | — | space scene (no glow) | soft_glow base (inherits glow) |

---

### 3E. Per-Format Derived Pixel Values

#### `soft_glow` (MEXC, confirmed 2026-06-23)

| Format | Slot Center X | Slot Center Y | Glow W | Glow H | Glow Center Y |
|---|---|---|---|---|---|
| OG 1200×630 | 600 | 180 | 754 px | 150 px | 161 px |
| Article 1200×675 | 600 | 192 | 754 px | 156 px | 172 px |
| Card 1200×800 | 600 | 228 | 754 px | 169 px | 204 px |

*(Glow W = 520 × 1.45 = 754; Glow H = slot height × 1.25; Glow center Y = slot center Y − 3% canvas height)*

#### `strong_glow` (derived, not yet exchange-confirmed)

| Format | Slot Center X | Slot Center Y | Glow W | Glow H | Glow Center Y |
|---|---|---|---|---|---|
| OG 1200×630 | 600 | 180 | 858 px | 174 px | 161 px |
| Article 1200×675 | 600 | 192 | 858 px | 181 px | 165 px |
| Card 1200×800 | 600 | 228 | 858 px | 195 px | 196 px |

*(Glow W = 520 × 1.65 = 858; Glow H = slot height × 1.45; Glow center Y = slot center Y − 4% canvas height)*

---

### 3F. CSS Component Values (ExchangePromoLogoSlot)

| Mode | CSS glow span | Center opacity | Width | Height |
|---|---|---|---|---|
| `no_glow` → `mode="clean"` | absent | — | — | — |
| `soft_glow` → `mode="soft-glow"` | present | 0.65 | 145% slot | 125% slot |
| `strong_glow` → `mode="strong-glow"` | present | 0.82 | 165% slot | 145% slot |

Note: `mode="glow"` is an alias for `mode="soft-glow"` (backward compatibility).

---

### 3G. Readability Rule

The glow must improve readability of:
- The exchange logo
- Dark wordmark text within the logo
- The descriptor area immediately below the logo slot

The glow must **not** overpower:
- Descriptor text
- CTA button (must remain the dominant visual element)
- Overall image composition

**If the glow is recognizable as a "glow effect", it is too strong.** Reduce opacity or tighten the radius until it reads as natural illumination. This rule applies equally to `soft_glow` and `strong_glow`.

---

### 3H. Forbidden Glow Cases

| Forbidden | Reason |
|---|---|
| Solid white plaque behind logo | Looks like a card insert, breaks composition |
| Grey rounded rectangle | Hard shape destroys the layered look |
| Hard-edged oval/ellipse | Any visible boundary at any opacity is forbidden |
| Glow that mimics an input or button shape | Confuses users about what is clickable |
| Glow that differs between OG / Article / Card | Creates brand inconsistency |
| Glow that differs between page hero and image pack | Breaks shared token rule |
| Glow that covers or weakens the CTA/button area | Conversion element must remain dominant |
| Using a different logo asset than the page | Logo must be identical to what the page renders |
| Using `soft_glow` on page but `no_glow` in image pack | Forbidden — shared token, one family per exchange |

---

### 3I. Logo Color-Lock Rule (CRITICAL)

> **Logo asset is color-locked. Do not recolor logo per viewport, per glow level, or per image format.**
> If readability fails on a dark background → change the glow or the background. Never change the logo color.

**Forbidden:**
- Applying `filter: invert()` or any CSS filter that changes logo color on mobile
- Substituting a white/light version of the logo for small viewports or dark backgrounds
- Drawing a synthetic logo in SVG with different colors than the approved asset
- Using different logo assets for desktop vs mobile
- Using different logo assets for page blocks vs image pack

**Correct approach when a dark-wordmark logo is hard to read:**
1. Add `soft_glow` hero background — baked-in glow lifts the background behind the logo
2. Escalate to `strong_glow` if soft_glow is insufficient
3. Use `mode="soft-glow"` or `mode="strong-glow"` on `ExchangePromoLogoSlot` in image-pack generators

**Root cause of the MEXC desktop/mobile mismatch (2026-06-24):**
Pre-migration review scripts (`mexc-logo-treatment-options-v1`) used experimental CSS/SVG treatments that rendered the MEXC logo in white/inverted on some options. These were never deployed to any page but caused confusion in review reports. The fix is `ExchangePromoLogoSlot` with `mode="clean"` + soft_glow hero PNG on all surfaces.

---

## 4. Logo Asset Rule

The visual pack must use the **same logo asset** as the exchange page. The logo is **color-locked** — see §3I.

**Path convention:**

```
public/media/exchanges/{slug}/logo/{slug}-logo-transparent-{width}-trimmed.png
```

The asset must:
- Be a transparent PNG
- Be already trimmed (no excess transparent border)
- Be the version approved for the exchange page

---

## 5. Slot Consistency Rule

All 5 surfaces (page top hero, page bottom hero, OG, article, card) must produce the same visual impression of the logo, descriptor, and CTA. A user who sees the OG card on Twitter, then visits the article thumbnail, then sees the exchange card — must perceive the same composition.

This means:
- Same logo asset across all surfaces
- Same glow family (`no_glow` / `soft_glow` / `strong_glow`)
- Same glow appearance (scaled proportionally, not a different look)
- Same slot Y-center percentages
- Same descriptor text
- Same CTA button text

---

## 6. QA Checklist — Per Image

**Logo**
- [ ] Logo is readable without any white plaque or card
- [ ] Dark wordmark is readable (if `soft_glow` or `strong_glow` family)
- [ ] Logo uses the same asset as the exchange page
- [ ] Logo is within the fixed slot boundaries (not scaled up to fill canvas)

**Glow (`soft_glow` or `strong_glow` only)**
- [ ] Glow is soft — no visible hard edge at any opacity
- [ ] Glow does not look like a card, plaque, or button
- [ ] Glow does not extend to the canvas edges
- [ ] Glow center is at or slightly above logo slot center
- [ ] Glow appearance is consistent across OG / Article / Card AND page hero

**Composition**
- [ ] Descriptor text is fully readable
- [ ] CTA button is the dominant element in the lower half
- [ ] No element competes with or weakens the CTA button
- [ ] No layout shift between the 3 formats

**Cross-surface consistency (new in v1.1)**
- [ ] Page hero glow family matches image pack glow family
- [ ] Same glow family in top and bottom page hero blocks
- [ ] `glow-family` token is declared in exchange config

---

## 7. Implementation Notes for Generator Scripts

When building a visual pack generator:

1. Load the logo asset from `public/media/exchanges/{slug}/logo/`
2. Read `glow-family` from the exchange token config: `no_glow` | `soft_glow` | `strong_glow`
3. If `soft_glow` or `strong_glow`:
   - Compute glow dimensions from slot × scale factors (see §3D token table)
   - Compute glow center Y = slot center Y − (3% or 4%) × canvas height
   - Render a fully feathered radial gradient ellipse at computed position
   - Composite glow layer under the logo layer
4. If `no_glow`: skip glow step entirely
5. Composite logo into slot using `contain` fit within max logo dimensions
6. Render descriptor and CTA at their respective slot centers

Generator must parametrize all glow values — no hardcoded pixel values.

---

## 8. Exchange Registry — Audited Assignments

All live exchange surfaces audited 2026-06-24. Assignment is frozen until owner approves a change.

| Exchange | Glow Family | Hero PNG (page) | Logo Asset | Component Mode (page) | Component Mode (pack) | Status |
|---|---|---|---|---|---|---|
| Bybit | `no_glow` | `cbw-hero-neutral-no-glow-v2.png` | `bybit-wordmark-official.png` | `clean` | `clean` | ✅ LIVE |
| MEXC | `soft_glow` | `cbw-hero-neutral-logo-glow-v2.png` | `mexc-logo-transparent-2517-trimmed.png` | `clean` | `soft-glow` | ✅ LIVE |
| Future exchanges | TBD | TBD | — | See §8A | See §8A | pending |

### 8A. Decision Table for New Exchanges

Test the official logo asset on `#0C1118` (the standard hero dark). Pick the **first row** that applies:

| Test result | Glow family | Hero PNG to use |
|---|---|---|
| Wordmark fully readable, high contrast | `no_glow` | `cbw-hero-neutral-no-glow-v2.png` |
| Wordmark visible but some text is faint | `soft_glow` | `cbw-hero-neutral-logo-glow-v2.png` |
| Wordmark low-contrast even with soft glow visible | `strong_glow` | `cbw-hero-neutral-strong-glow-v1.png` |

**Reserve `strong_glow` for genuine contrast failures.** If soft_glow makes the logo readable, use soft_glow. The escalation path is one-way: do not assign `strong_glow` unless both `no_glow` and `soft_glow` have been tested and found insufficient.

---

## 9. Factory Execution Checklist

Run this checklist in full for every new exchange page before any deploy.

### Step 1: Logo asset
- [ ] Located official horizontal wordmark from exchange's brand assets page
- [ ] Saved as transparent PNG, trimmed (no excess transparent border)
- [ ] Path: `public/media/exchanges/{slug}/logo/{slug}-logo-transparent-{width}-trimmed.png`
- [ ] Same asset will be used on page AND in all 3 image pack formats

### Step 2: Glow family selection
- [ ] Rendered logo on `#0C1118` background
- [ ] Applied decision table (§8A) — recorded result: `no_glow` / `soft_glow` / `strong_glow`
- [ ] Glow family stored in exchange config / data file

### Step 3: Page hero backgrounds
- [ ] `brand-hero` CSS uses the correct hero PNG for chosen glow family
- [ ] `background-position` is `left center` for `no_glow`, `center center` for glow variants
- [ ] Same `.brand-hero` class covers BOTH top hero block and bottom hero block
- [ ] No different background on top vs bottom block

### Step 4: Logo slot
- [ ] `ExchangePromoLogoSlot` component used in top block with `mode="clean"` (page always uses clean)
- [ ] `ExchangePromoLogoSlot` component used in bottom block with `mode="clean"`
- [ ] `fetchpriority="high"` on top block, `loading="lazy"` on bottom block
- [ ] `visualScale` set for optical balance (default 1.0; use 0.70 for wide/thin wordmarks)
- [ ] Logo slot rendered at 320 × 96 px desktop, 250 × 76 px mobile

### Step 5: Visual pack (OG / Article / Card)
- [ ] Same logo asset used in all 3 image formats
- [ ] Correct glow mode for image pack: `clean` (no_glow), `soft-glow` (soft_glow), `strong-glow` (strong_glow)
- [ ] Slot proportions consistent across all 3 formats (Y-center percentages match)
- [ ] Descriptor text matches page descriptor text exactly
- [ ] CTA button is dominant element in all 3 images
- [ ] No hard edge on glow (if glow variant)

### Step 6: Cross-surface consistency
- [ ] Same logo asset: page = pack ✓
- [ ] Same glow family: page = pack ✓
- [ ] Same descriptor text: page = pack ✓
- [ ] Same code value: page = pack ✓
- [ ] Logo slot center Y matches between page and all pack formats ✓

### Step 7: Pre-deploy QA
- [ ] Local build passes (217+ pages, 0 errors)
- [ ] Preview pack screenshots captured and owner-reviewed
- [ ] DOM QA: slot renders at correct dimensions (Playwright evaluate)
- [ ] No `.bh-wordmark` free-form CSS anywhere on the page
- [ ] No white plaque, grey card, or hard shape behind logo anywhere

---

## 11. Version History

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-06-23 | Initial standard — 2-level system: `clean` + `glow-assisted` |
| v1.1 | 2026-06-24 | 3-level glow taxonomy: `no_glow` / `soft_glow` / `strong_glow`; shared token rule across all 5 surfaces; strong_glow token values defined; `clean`→`no_glow`, `glow-assisted`→`soft_glow` (renamed, backward-compatible) |
| v1.2 | 2026-06-24 | Audited all live exchange surfaces; added explicit §8 audit table with approved assignments; added §8A decision table; added §9 factory execution checklist (7 steps); strong_glow hero PNG generated and confirmed LIVE |
| v1.3 | 2026-06-24 | §3I Logo Color-Lock Rule added: logo asset is color-locked across all surfaces and viewports; recoloring forbidden; readability via glow only; root cause of MEXC desktop/mobile mismatch documented |

---

*This document is the master standard for CBW exchange visual pack production. It supersedes any ad-hoc decisions made during individual pack creation. Update §8 when a new exchange is added; update §3 when a new glow variant is owner-approved.*
