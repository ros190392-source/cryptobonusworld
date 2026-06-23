# CBW Exchange Promo Hero System v1

**Status:** LIVE (source only — not deployed)  
**Approved:** 2026-06-23  
**Option:** Option 2 — Neutral Graphite + Logo Glow  
**Scope:** All exchange pages (`/bybit/`, `/mexc/`, and all future exchange pages)

---

## Decision

One unified neutral hero background across all exchange pages. Per-exchange colored hero backgrounds are banned. Per-exchange images (OG, article cards, promo packs) may remain colorful and brand-specific.

---

## Base Gradient

```css
linear-gradient(160deg, #0C1118 0%, #141B25 100%)
```

CSS custom properties (set in `brandHeroTokens` → `bhStyle` on `.brand-hero`):
- `--bh-bgFrom: #0C1118`
- `--bh-bgTo: #141B25`

---

## Component

**File:** `src/components/NeutralHeroBg.astro`

Shared SVG overlay component. Insert as first child of `.brand-hero`.

### Usage

```astro
import NeutralHeroBg from '../../components/NeutralHeroBg.astro';

<section class="brand-hero" style={bhStyle}>
  <NeutralHeroBg />
  <div class="bh-inner">
    ...
  </div>
</section>
```

### Required parent CSS

```css
.brand-hero {
  position: relative;
  overflow: hidden;
}
.bh-inner {
  position: relative;
  z-index: 1;
}
```

### SVG anatomy

| Element | Purpose | Coordinates |
|---|---|---|
| Graphite planet (circle r=46) | Depth anchor, lower-left | cx=158 cy=258 |
| Orbit ring 1 (ellipse) | Silver, rx=113 ry=29, rotated -20° | same center |
| Orbit ring 2 (dashed) | Silver faint, rx=173 ry=44, rotated -20° | same center |
| Logo glow (ellipse) | White radial, rx=268 ry=100 | cx=720 cy=115 |
| Stars (21 dots) | r=1.0–1.5, opacity 0.50–0.72 | scattered in 3 rows |

ViewBox: `0 0 1440 400`, preserveAspectRatio: `xMinYMin slice`

The logo glow at cy=115 serves two functions:
1. **MEXC** (black wordmark): provides light backdrop for dark text readability — no DOM plaque needed
2. **Bybit** (white wordmark): silver halo adds premium depth

---

## Applied pages

### `/bybit/`

File: `src/pages/bybit/index.astro`

- `bh-bgFrom` → `#0C1118`
- `bh-bgTo` → `#141B25`
- `<NeutralHeroBg />` in top hero block (line ~558)
- `<NeutralHeroBg />` in bottom CTA block
- `.brand-hero`: `position:relative; overflow:hidden`
- `.bh-inner`: `position:relative; z-index:1`

### `/mexc/`

File: `src/pages/mexc/index.astro`

- `bh-bgFrom` → `#0C1118` (was `#060E1A`)
- `bh-bgTo` → `#141B25` (was `#0A2038`)
- Removed: cyan overlay gradient (`linear-gradient(to bottom, rgba(140,210,255,0.42)…)`)
- Removed: white logo plaque (DOM wrapper)
- Kept: transparent MEXC logo 2517-trimmed (250×60), `filter:none opacity:1`
- `<NeutralHeroBg />` in top hero block
- `<NeutralHeroBg />` in bottom CTA block
- `.brand-hero`: `position:relative; overflow:hidden`
- `.bh-inner`: `position:relative; z-index:1`

---

## Exchange-specific tokens (unchanged)

The following are per-exchange and must NOT be unified:
- `--bh-accent` — code field outline color
- `--bh-codeBg` — code field background
- `--bh-codeBorder` — code field border
- `--bh-text` — body text
- Logo images, wordmark sizes, promo code labels
- Visual packs: OG images, article images, promo cards

---

## Adding a new exchange page

1. Import component: `import NeutralHeroBg from '../../components/NeutralHeroBg.astro';`
2. Set tokens: `'bh-bgFrom': '#0C1118', 'bh-bgTo': '#141B25'`
3. CSS `.brand-hero`: include `position: relative; overflow: hidden;`
4. CSS `.bh-inner`: include `position: relative; z-index: 1;`
5. Insert `<NeutralHeroBg />` as first child of each `.brand-hero` section

Do NOT add per-exchange gradient overrides in `.brand-hero` CSS.

---

## Screenshots

`reports/visual/exchange-neutral-hero-system-final-v1/`

| File | Description |
|---|---|
| `01-bybit-top-desktop.png` | Bybit top hero, 1440px |
| `02-bybit-bottom-desktop.png` | Bybit bottom CTA, 1440px |
| `03-mexc-top-desktop.png` | MEXC top hero, 1440px |
| `04-mexc-bottom-desktop.png` | MEXC bottom CTA, 1440px |
| `05-bybit-mexc-desktop-comparison.png` | Side-by-side board |
| `06-bybit-top-mobile.png` | Bybit top hero, 390px |
| `07-mexc-top-mobile.png` | MEXC top hero, 390px |
| `08-bybit-mexc-mobile-comparison.png` | Mobile side-by-side |
| `index.html` | Visual review page |

---

## Retired

- MEXC cyan/blue hero exception (`rgba(140,210,255,0.42)` overlay)
- Per-exchange `bh-bgFrom`/`bh-bgTo` color palettes
- White logo plaque (DOM wrapper for MEXC logo readability)
