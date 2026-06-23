# CBW Exchange Logo Slot System — v1.0

**Date:** 2026-06-22  
**Status:** Preview-only (awaiting owner approval before deploy)

---

## Purpose

Defines a canonical, reusable system for placing official exchange logos in:
1. Visual pack images (card 1200×800, OG 1200×630, article 1200×675)
2. Page hero blocks (top + bottom CTA sections)

Replaces ad-hoc per-exchange wordmark solutions with a consistent, maintainable approach.

---

## Logo Asset Rules

| Rule | Detail |
|------|--------|
| Source file | Owner-provided official logo only |
| Recoloring | NEVER recolor the logo |
| Distortion | NEVER distort (always scale proportionally) |
| Background | Use white plaque when logo has dark text (non-screen-blendable) |
| Wordmark | NEVER add "Global" suffix or obsolete variants |
| Inventory path | `public/media/exchanges/[slug]/logo/` |

---

## Canonical Asset Set — MEXC

| File | Dimensions | Use |
|------|-----------|-----|
| `mexc-logo-official-source.png` | 252×160 | Source copy (do not modify) |
| `mexc-logo-official-trimmed.png` | 242×47 | Transparent-padding removed, usable on light backgrounds |
| `mexc-logo-on-light-plaque.png` | 322×91 | White rounded-rect plaque for dark hero backgrounds |

**Plaque spec:** white fill `#ffffff`, border-radius 14px, horizontal padding 40px, vertical padding 22px.

---

## Slot Tokens — Bybit Golden Template

These proportional values are the canonical layout reference for all exchange visual packs:

| Slot | Center Y | Height | Notes |
|------|----------|--------|-------|
| Logo | 28.5% | 17.0% | White plaque centered |
| Text | 55.0% | 16.0% | "REFERRAL CODE" headline |
| Button | 75.5% | 13.0% | Pill CTA, 40% canvas width |

**Source:** Bybit card 1200×800 pixel measurement (reference image: `bybit-card-final-v1-1200x800.jpg`)

---

## Page Hero Logo Slot — MEXC

**File:** `src/pages/mexc/index.astro`

```css
/* Official logo on white plaque — no screen blend */
.bh-wordmark {
  display: block;
  width: 180px;        /* 220px on ≥640px, 150px on ≤359px */
  height: auto;
  margin: 0 auto 10px;
  mix-blend-mode: normal;
  border-radius: 10px;
}
```

**`wordmarkImg`:** `/media/exchanges/mexc/logo/mexc-logo-on-light-plaque.png`  
**Natural dimensions:** 322×91 (set as `width`/`height` attributes for CLS prevention)

---

## Visual Pack — MEXC Erase Strategy

The MEXC v2 source images contain an AI-generated logo that must be covered before placing the official logo. Composition order:

1. **erL1** — Dark rect (80% canvas width, old logo zone height, `#05101f`, opacity 0.98): kills old AI logo
2. **erL3** — Dark rect (76% canvas width, text zone): kills ghost "REFERRAL CODE" text
3. **erL2** — Dark rect (76% canvas width, old button zone): kills mispositioned CTA
4. **White plaque** — Official MEXC logo at Bybit-proportional position (`blend: 'over'`)
5. **REFERRAL CODE SVG text** — Arial Black 900, white, at 55% center Y
6. **CTA button SVG** — Cyan gradient pill at 75.5% center Y
7. **Cursor PNG** — Pointer hand at button right edge

**Script:** `scripts/pack-mexc-aligned.mjs`

---

## Preview Files (NOT deployed)

| File | Dimensions | Purpose |
|------|-----------|---------|
| `public/media/exchanges/mexc/preview/mexc-card-logo-slot-preview-v1-1200x800.jpg` | 1200×800 | Card / homepage grid |
| `public/media/exchanges/mexc/preview/mexc-og-logo-slot-preview-v1-1200x630.jpg` | 1200×630 | OG meta image |
| `public/media/exchanges/mexc/preview/mexc-article-logo-slot-preview-v1-1200x675.jpg` | 1200×675 | Article inline image |

Review page: `public/_visual-review/mexc-logo-slot-v1/index.html`

---

## Deployment Checklist (pending owner approval)

- [ ] Owner approves 3 preview images
- [ ] Copy previews to final paths (replace v2 files)
- [ ] Update `src/data/exchanges.ts` cardImage / ogImage / articleImage
- [ ] `npm run build` passes
- [ ] `git commit` with scoped message
- [ ] Deploy to production

---

## How to Extend to a New Exchange

1. Obtain official logo from exchange brand kit
2. Trim transparent padding → `[slug]-logo-official-trimmed.png`
3. If logo has dark text: generate plaque → `[slug]-logo-on-light-plaque.png`
4. Measure old visual pack zones with `scripts/_analyze_visual_pack.mjs`
5. Copy `scripts/pack-mexc-aligned.mjs` → `scripts/pack-[slug]-aligned.mjs`
6. Update FORMATS array, WORDMARK path, MEXC_COLORS, existing zone coordinates
7. Run script, inspect previews, get owner approval
8. Deploy
