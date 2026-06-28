# CBW Visual Pack Prompt Template v1

**Version:** 1.0  
**Date:** 2026-06-28  
**Status:** Active — use for all exchange visual pack generation  
**Authority:** CBW_EXCHANGE_PAGE_VISUAL_EVIDENCE_STANDARD_v1.md §20.8

---

## Purpose

This template provides the exact prompt rules to use when generating visual assets for each new exchange page. All generated assets must conform to the CBW visual system to ensure a consistent premium fintech look across all exchange pages.

---

## Asset Inventory per Exchange Pack

Each exchange requires **6 assets** before the live route can launch:

| Asset | Dimensions | Format | Filename pattern |
|---|---|---|---|
| Hero background | 2172×724 | PNG | `{exchange}-hero-v1.png` |
| OG image | 1200×630 | JPG | `{exchange}-og-v1-1200x630.jpg` |
| Article image | 1200×675 | JPG | `{exchange}-article-v1-1200x675.jpg` |
| Card image (homepage) | 1200×800 | JPG | `{exchange}-card-v1-1200x800.jpg` |
| Wordmark (dark hero) | 320×96 | PNG (RGBA) | `{exchange}-wordmark-v1.png` |
| Tile logo (light bg) | 320×96 | PNG (RGBA) | `{exchange}.png` |

Asset paths:
- Hero: `public/media/hero-backgrounds/{exchange}-hero-v1.png`
- OG / Article / Card: `public/media/exchanges/{exchange}/final/`
- Logos: `public/logos/`

---

## Global Rules — All Assets

These rules apply to **every asset** in a visual pack:

### Never bake:
- Actual promo/referral code value (e.g. `CRYPTOBONUSW`)
- Bonus amount (e.g. `30,000 USDT`)
- Date (e.g. `2026`, `June 2026`)
- Fine print or terms text
- URL or domain name

> **Why:** These values change. A baked code becomes wrong when the offer updates. Keep assets evergreen — text is overlaid by HTML.

### Always include:
- Exchange logo / wordmark
- Exchange name (optional if logo includes text)
- Visual family consistency with all other assets in the same pack

---

## Asset-Specific Prompt Rules

### 1. Hero Background (2172×724 PNG)

```
Create a 2172×724 premium fintech exchange landing page hero background image for [EXCHANGE NAME].
- Dark, cinematic composition. No white or light backgrounds.
- Brand color palette: [BRAND_COLOR_NOTES]
- Abstract geometric, cosmic, or financial data visualization background.
- Leave clear center space for overlaid text (promo code, CTA button, logo).
- Do NOT include: promo code text, bonus amounts, dates, people, faces, real UI screenshots.
- Do NOT include any CTA button, arrow, or interactive element.
- No watermarks. Deliver as PNG with full 2172×724 dimensions.
```

### 2. OG Image (1200×630 JPG)

```
Create a 1200×630 Open Graph social share image for [EXCHANGE NAME].
- Use the same visual family as the hero background (colors, style, atmosphere).
- Include exchange logo/wordmark clearly.
- Include the label "REFERRAL CODE" or "PROMO CODE" (text label only — no actual code value).
- Premium, shareable fintech aesthetic. Works as a preview card in Twitter/LinkedIn/Telegram.
- Do NOT include: actual promo code, bonus amounts, dates, arrows, hand icons.
- Deliver as JPG, 1200×630.
```

### 3. Article Image (1200×675 JPG)

```
Create a 1200×675 article header image for [EXCHANGE NAME].
- Same visual family as hero and OG image.
- Include exchange logo/wordmark clearly.
- Clean editorial style — this appears at the top of a long-form article.
- Slightly wider/more detailed composition than the OG image.
- Do NOT include: promo code, bonus amounts, dates, people.
- Deliver as JPG, 1200×675.
```

### 4. Card Image / Homepage Card (1200×800 JPG)

**⚠ IMPORTANT — Read the full CTA button rule before generating.**

```
Create a 1200×800 premium fintech exchange referral-code card image for [EXCHANGE NAME].
- Use the same visual family (colors, background style, typography) as the hero/article/OG pack.
- Include the exchange logo/wordmark.
- Include the label "PROMO CODE" or "REFERRAL CODE" (text only — do NOT include the actual code value).
- Include exactly one decorative CTA pill button with text: CLICK TO CLAIM
- CTA button: dark/black semi-transparent pill, white uppercase text, centered.
- Do NOT include: hand pointer, cursor icon, arrow (inside or outside button), clicking animation, glitched button, pressed state.
- Do NOT include: actual promo code value, bonus amount, dates.
- Composition must work legibly at 400px display width (compact homepage grid).
- Deliver as JPG, 1200×800.
```

#### CTA Button Forbidden List (card image only):

| Forbidden | Why |
|---|---|
| Hand pointer icon | False interactive affordance |
| Cursor icon | Same |
| Click spark / animation | Not a real UI element |
| Yellow button | Bybit legacy — inconsistent |
| Blue button | MEXC legacy — inconsistent |
| Any per-exchange button color | All cards must use the same dark button |
| Arrow inside button (→) | OKX legacy — creates visual noise |
| Arrow outside button | Same |
| Fake pressed state | Misleading |
| Actual promo code in image | Becomes stale when offer changes |
| Bonus amount in image | Becomes stale when offer changes |
| Date in image | Becomes stale |

### 5. Wordmark PNG — White on Transparent (320×96, RGBA)

```
Create a 320×96 PNG exchange wordmark for [EXCHANGE NAME].
- White on fully transparent background (RGBA, ColorType 6).
- Combine the official [EXCHANGE NAME] icon/symbol on the left and bold "[EXCHANGE NAME]" text on the right.
- Clean pixel-sharp rendering. No blur, no shadow, no glow baked in.
- Must be visible when composited on a dark background (#0a0a0a to #1c1c28).
- Deliver as PNG RGBA, 320×96.
- Filename: [exchange]-wordmark-v1.png
```

### 6. Tile Logo — Brand Color on Transparent (any standard size)

```
Create a [WIDTH]×[HEIGHT] PNG tile logo for [EXCHANGE NAME].
- Brand color or black on fully transparent background.
- Intended for light-background tile cards (homepage grid, exchange directory).
- Official brand icon/symbol only — or icon + name if the exchange uses a full wordmark on tiles.
- Deliver as PNG RGBA.
- Filename: [exchange].png
```

---

## Exchange-Specific Overrides

### Bybit
- Brand colors: gold/yellow (`#f7a600`), dark navy
- Hero style: dark cosmic with gold accent
- Note: CTA button on card must be **dark**, not yellow (yellow was the legacy mistake)

### MEXC
- Brand colors: teal/cyan (`#0BCDFF`), black
- Hero style: dark with teal glow
- Note: CTA button on card must be **dark**, not blue (blue was the legacy mistake)

### OKX
- Brand colors: near-black, white, grey
- Hero style: dark cosmic (okx-hero-custom-v2.png is the approved V2)
- Note: Next card refresh should remove the arrow from the button

### Bitget (pending visual pack V1)
- Brand colors: teal (`#00C9E0`), dark navy (`#020e1c`)
- Hero style: dark navy with teal/turquoise accent
- Wordmark needed: white on transparent, horizontal (current `bitget-wordmark-dark.png` is portrait icon, dark, not suitable for dark hero)
- Card CTA: dark pill, `CLICK TO CLAIM`, no arrow, no hand

---

## Generation Checklist

After generating a full visual pack, verify each asset:

- [ ] Hero PNG: correct dimensions, no baked code/amount/date, dark background
- [ ] OG JPG: 1200×630, exchange logo visible, no baked code/amount/date
- [ ] Article JPG: 1200×675, editorial style
- [ ] Card JPG: 1200×800, `CLICK TO CLAIM` dark pill, no hand/cursor/arrow
- [ ] Wordmark PNG: white on transparent, composites cleanly on dark bg
- [ ] Tile logo PNG: brand color on transparent, works on light bg
- [ ] All assets belong to the same visual family
- [ ] No asset is a crop/resize of another (each is purpose-built for its ratio)
- [ ] File sizes reasonable (hero: < 500KB, JPGs: < 200KB each, PNGs: < 100KB)

---

## Version History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-06-28 | Initial version; card CTA standard added per homepage audit |
