# CBW Exchange Visual Pack Factory Standard — v1.0

**Status:** CANONICAL  
**Date:** 2026-06-23  
**Scope:** All exchange 3-image visual packs on cryptobonusworld.com  
**Related docs:**
- `docs/CBW_EXCHANGE_PROMO_SLOT_SYSTEM_v1.md` — slot geometry (frozen)
- `docs/CBW_EXCHANGE_LOGO_SLOT_STANDARD_v1.md` — logo slot pixel dimensions
- `docs/CBW_EXCHANGE_PROMO_HERO_SYSTEM_v1.md` — page hero background system

---

## 1. What a Visual Pack Is

Every exchange page produces a 3-image visual pack:

| Image | Dimensions | Purpose |
|---|---|---|
| OG | 1200 × 630 | Open Graph, social share, meta tag |
| Article | 1200 × 675 | Article thumbnail, editorial feed |
| Card | 1200 × 800 | Exchange card, comparison tiles |

All three images share the same slot system, the same logo, and the same glow mode. Only proportional scaling differs between formats. The slot anchors are defined in `CBW_EXCHANGE_PROMO_SLOT_SYSTEM_v1.md` and must not be changed per-exchange.

---

## 2. Per-Exchange Tokens

The following tokens change per exchange. Everything else is frozen.

| Token | Description |
|---|---|
| `logo-asset` | Official logo, transparent PNG, from `public/media/exchanges/{slug}/logo/` |
| `logo-slot-mode` | `clean` or `glow-assisted` (see Section 3) |
| `glow-color` | rgba value, neutral white-ish for most exchanges |
| `glow-opacity` | 0.0 for clean mode; 0.55–0.70 for glow-assisted |
| `bg-gradient-from` | Brand background start color |
| `bg-gradient-to` | Brand background end color |
| `button-fill` | CTA button background color |
| `button-glow` | CTA button ambient glow color |
| `descriptor-text` | e.g. `REFERRAL CODE` or `PROMO CODE` |
| `code-value` | The actual promo/referral code string |

---

## 3. Logo Slot Glow Standard

### Purpose

The glow is not decorative. It is a controlled readability layer applied only when an exchange logo has dark or black wordmark elements that would be invisible against the dark hero background without support.

The glow must be invisible as a shape. It must read only as "the logo is easier to see" — not as "there is a glow effect on the logo."

---

### 3A. Clean Logo Slot Mode

**Use when:** the exchange logo is already readable on a dark background without any support layer.

**Example:** Bybit (white/yellow logo on dark)

**Rules:**

- No glow behind logo
- No white plaque
- No background card, oval, or rounded rectangle
- Official logo inserted directly into the fixed logo slot
- Logo alpha channel used as-is

---

### 3B. Glow-Assisted Logo Slot Mode

**Use when:** the exchange logo has dark or black wordmark elements that lose contrast against the dark hero background.

**Example:** MEXC (dark wordmark on transparent background)

**Rules:**

- Same fixed logo slot as clean mode — no positional difference
- Same logo scale rules — no size change to compensate for glow
- Same logo asset as the exchange page — no special "glow version" of the logo
- Soft radial/feathered glow placed behind the logo, centered on the logo slot
- No hard rectangle
- No white plaque
- No grey card or pill shape
- Glow must not compete with the descriptor text slot or CTA button slot
- Glow must not extend to the edges of the canvas
- Glow must look identical across all 3 image formats (scaled proportionally)

---

### 3C. Glow Token Standard

#### Default Glow-Assisted Values

| Token | Value | Notes |
|---|---|---|
| `glow-type` | radial ellipse, fully feathered | No hard boundary at any opacity |
| `glow-color` | `rgba(235, 245, 255)` | Neutral icy white — not warm, not blue-tinted |
| `glow-opacity-center` | 0.65 | Peak opacity at ellipse center |
| `glow-opacity-edge` | 0.0 | Must reach full transparency before hitting slot boundary |
| `glow-width` | 145% of logo slot width | Scales with each image format |
| `glow-height` | 125% of logo slot height | Scales with each image format |
| `glow-center-X` | Logo slot center X | Horizontally centered on slot |
| `glow-center-Y` | Logo slot center Y − 3% of canvas height | Slightly above slot center |
| `glow-blend` | normal (alpha-composited under logo) | Screen or soft-light only if SVG fallback required |
| `glow-shape` | ellipse | Never a circle, rectangle, or pill |

#### Per-Format Derived Pixel Values (Default MEXC)

| Format | Slot Center X | Slot Center Y | Glow W | Glow H | Glow Center Y |
|---|---|---|---|---|---|
| OG 1200×630 | 600 | 180 | 754 px | 150 px | 161 px |
| Article 1200×675 | 600 | 192 | 754 px | 156 px | 172 px |
| Card 1200×800 | 600 | 228 | 754 px | 169 px | 204 px |

*(Glow W = 520 × 1.45 = 754; Glow H = slot height × 1.25; Glow center Y = slot center Y − 3% canvas height)*

#### MEXC Confirmed Values

These values were visually approved by the site owner on 2026-06-23 and are the reference implementation for the Glow-Assisted mode.

| Token | Value |
|---|---|
| Logo asset | `public/media/exchanges/mexc/logo/mexc-logo-transparent-2517-trimmed.png` |
| Glow color | `rgba(235, 245, 255)` |
| Glow opacity | 0.65 at center → 0.0 at edge |
| Glow width | 145% of logo slot width |
| Glow height | 125% of logo slot height |
| Glow center X | Slot center X |
| Glow center Y | Slot center Y − 3% canvas height |
| Glow hard edge | None |
| White plaque | Forbidden |

---

### 3D. Readability Rule

The glow must improve readability of:

- The exchange logo
- Dark wordmark text within the logo
- The descriptor area immediately below the logo slot

The glow must **not** overpower:

- Descriptor text (must remain fully readable without the glow's help)
- CTA button (must remain the dominant visual element)
- CLICK TO CLAIM button (conversion focus must stay on the button)
- Overall image composition

If the glow is strong enough to be recognized as a "glow effect", it is too strong. Reduce opacity or tighten the radius until it reads as natural illumination.

---

### 3E. Forbidden Glow Cases

The following are strictly forbidden in all visual pack images:

| Forbidden | Reason |
|---|---|
| Solid white plaque behind logo | Looks like a card insert, breaks composition |
| Grey rounded rectangle | Same as plaque — hard shape destroys the layered look |
| Hard-edged oval/ellipse | Any visible boundary at any opacity is forbidden |
| Glow that mimics an input or button shape | Confuses users about what is clickable |
| Glow that differs between OG / Article / Card | Creates brand inconsistency across social formats |
| Glow that shifts the logo visually out of its slot | Logo must appear at the same position in all formats |
| Glow that covers or weakens the CTA/button area | Conversion element must remain dominant |
| Using a different logo asset than the page | Logo must be identical to what the page renders |

---

## 4. Logo Asset Rule

The visual pack must use the **same logo asset** as the exchange page.

The logo file is the single source of truth. If the page uses the transparent trimmed version, the visual pack uses the same file. No "print version," no custom crops for the image pack.

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

The three images in a pack must produce the same visual impression of the logo, descriptor, and CTA at every viewport. A user who sees the OG card on Twitter, then visits the article thumbnail on the site, then sees the exchange card — must perceive the same composition.

This means:
- Same logo asset
- Same glow mode (clean or glow-assisted)
- Same glow appearance (scaled proportionally, not a different look)
- Same slot Y-center percentages
- Same descriptor text
- Same CTA button text
- Same font, same weight

---

## 6. QA Checklist — Per Image

Run for each of the 3 images before marking a pack complete:

**Logo**
- [ ] Logo is readable without any white plaque or card
- [ ] Dark wordmark is readable (if glow-assisted mode)
- [ ] Logo uses the same asset as the exchange page
- [ ] Logo is within the fixed slot boundaries (not scaled up to fill canvas)

**Glow (glow-assisted mode only)**
- [ ] Glow is soft — no visible hard edge at any opacity
- [ ] Glow does not look like a card, plaque, or button
- [ ] Glow does not extend to the canvas edges
- [ ] Glow center is at or slightly above logo slot center
- [ ] Glow appearance is consistent across OG / Article / Card

**Composition**
- [ ] Descriptor text is fully readable
- [ ] CTA button is the dominant element in the lower half
- [ ] No element competes with or weakens the CTA button
- [ ] No layout shift between the 3 formats — slot positions match

**Cross-format**
- [ ] Same glow logic across all 3 images
- [ ] Same logo asset in all 3 images
- [ ] Same descriptor text in all 3 images
- [ ] Same slot position across all exchange pages

---

## 7. Implementation Notes for Generator Scripts

When building a visual pack generator:

1. Load the logo asset from `public/media/exchanges/{slug}/logo/`
2. Determine mode: `clean` or `glow-assisted` (stored in exchange token config)
3. If `glow-assisted`:
   - Compute glow dimensions from slot dimensions × glow scale factors (1.45w, 1.25h)
   - Compute glow center Y = slot center Y − 0.03 × canvas height
   - Render a fully feathered radial gradient ellipse at computed position
   - Composite glow layer under the logo layer
4. Composite logo into slot using `contain` fit within max logo dimensions
5. Render descriptor and CTA at their respective slot centers

Generator must parametrize all glow values — no hardcoded pixel values specific to one image format.

---

## 8. Exchange Registry — Logo Slot Mode

| Exchange | Mode | Logo Asset | Notes |
|---|---|---|---|
| Bybit | `clean` | `bybit-logo-*.png` | White/yellow logo, readable on dark |
| MEXC | `glow-assisted` | `mexc-logo-transparent-2517-trimmed.png` | Dark wordmark, owner-approved glow 2026-06-23 |
| All others | TBD at pack creation time | — | Determine mode by testing logo on `#0C1118` background |

**Decision rule for new exchanges:** render the logo on `#0C1118` (the standard hero background dark). If the wordmark is readable at 100% opacity, use `clean`. If any text element is invisible or near-invisible, use `glow-assisted` with default tokens.

---

*This document is the master standard for CBW exchange visual pack production. It supersedes any ad-hoc decisions made during individual pack creation. Update this document when a new glow variant is owner-approved.*
