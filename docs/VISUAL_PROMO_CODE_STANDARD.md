# Visual Promo Code Standard

**Project:** CryptoBonusWorld.com  
**Status:** Active — applies to all exchange pages  
**Version:** 2.0  
**Last updated:** 2026-06-22

---

## The Core Rule

**Promo codes, bonus amounts, and dated claims must never be embedded in static image files.**

Static images are baked at build time and cached by CDNs, social platforms, messaging apps, and search crawlers. Once a cached version circulates, there is no way to update it. If a promo code changes, an image showing the old code continues spreading — creating broken expectations and trust damage.

Live offer data belongs in HTML. HTML can be changed in seconds. Images cannot.

---

## Dimensions Standard (Locked)

Every exchange visual pack consists of exactly **3 images**. Dimensions are fixed and must not deviate.

| Image | Purpose | Dimensions | Output path |
|-------|---------|-----------|-------------|
| **OG / Social preview** | Shown when page URL is shared on Telegram, Twitter, WhatsApp | **1200 × 630 px** | `public/media/exchanges/{slug}/share/{slug}-og-1200x630.jpg` |
| **Article image** | Inline illustration in article body | **1200 × 675 px** | `public/media/exchanges/{slug}/article/{slug}-article-1200x675.jpg` |
| **Card / Homepage** | Exchange card on homepage / listing | **1200 × 800 px** | `public/media/exchanges/{slug}/cards/{slug}-card-1200x800.jpg` |

**Format:** JPEG, quality 90. **Max file size:** 400 KB per image.

---

## CBW Brand Asset (Master Source)

The real CryptoBonusWorld favicon/logo mark must be overlaid in post-processing. **AI image generators must not draw the CBW logo.**

| Asset | Path | Dimensions | Alpha |
|-------|------|-----------|-------|
| **Master mark for overlay** | `public/brand/cbw-header-mark-transparent.png` | 512 × 512 | ✅ transparent |
| Header mark @2x | `public/brand/cbw-header-mark-final@2x.png` | 512 × 512 | no alpha |
| Flat/SVG mark | `public/brand/logo-mark.svg` | vector | — |
| Header logo (full horizontal) | `public/brand/cbw-header-logo-on-navy.png` | — | no alpha |

**Use `cbw-header-mark-transparent.png` for all image overlays.** It has a transparent background, enabling clean composition on any exchange image.

---

## Post-Processing Pipeline

```
[AI-generated base image]  ──→  scripts/visual-pack-overlay.mjs  ──→  [Final JPG with CBW mark]
```

### Script

```bash
node scripts/visual-pack-overlay.mjs \
  --slug    mexc \
  --og      path/to/base-og.jpg \
  --article path/to/base-article.jpg \
  --card    path/to/base-card.jpg \
  --accent  "#0BCDFF"
```

The `--accent` flag sets the exchange accent color used in the OG "CrytoBonusWorld.com" text highlight.

### What the script does

1. Resizes/crops each base image to exact locked dimensions (cover crop, center position — no distortion)
2. Resizes CBW mark (`cbw-header-mark-transparent.png`) to 56 × 56 px
3. Composites mark in bottom-right corner (20 px safe margin from edges)
4. For OG image only: adds `CryptoBonusWorld.com` text to the left of the mark
5. Exports as JPEG quality 90

### Exchange accent colors

| Exchange | Accent | Flag |
|----------|--------|------|
| Bybit | `#F5A623` | `--accent "#F5A623"` |
| MEXC | `#0BCDFF` | `--accent "#0BCDFF"` |
| Binance | `#F0B90B` | `--accent "#F0B90B"` |
| Bitget | `#00F0FF` | `--accent "#00F0FF"` |
| OKX | `#E9F0F5` | `--accent "#E9F0F5"` |
| BingX | `#00C0FF` | `--accent "#00C0FF"` |
| KuCoin | `#23AF91` | `--accent "#23AF91"` |
| Gate.io | `#2354E6` | `--accent "#2354E6"` |

---

## Overlay Rules by Image Type

### OG (1200 × 630)

- CBW mark: bottom-right, 56 × 56 px, 20 px from edges
- Text `CryptoBonusWorld.com` to the left of the mark:
  - `"Crypto"` — white `#FFFFFF`
  - `"Bonus"` — exchange accent color
  - `"World.com"` — `rgba(255,255,255,0.72)` (light gray)
- Text shadow: subtle drop shadow for legibility on any background

### Article (1200 × 675)

- CBW mark only: bottom-right, 56 × 56 px, 20 px from edges
- **No text**

### Card (1200 × 800)

- CBW mark only: bottom-right, 56 × 56 px, 20 px from edges
- **No text**

---

## Safe Area

All important content in base AI-generated images must stay within the safe area:

```
┌─────────────────────────────┐
│  ←  40px padding all sides  │
│                             │
│   ┌─────────────────────┐   │
│   │   SAFE CONTENT AREA │   │
│   │                     │   │
│   │  Exchange name      │   │
│   │  Label text         │   │
│   │  CTA button         │   │
│   └─────────────────────┘   │
│                      ┌────┐ │
│                      │CBW │ │ ← mark goes here (20px from edge)
│                      └────┘ │
└─────────────────────────────┘
```

**Bottom-right corner (last 100 × 100 px) must be left empty in base images.** The CBW overlay needs this area.

---

## AI Image Generation Rules

When generating base images in ChatGPT or another AI tool:

1. **Do not ask AI to draw the CryptoBonusWorld logo.** It will hallucinate an incorrect mark. The real logo is added in post-processing.
2. **Leave the bottom-right clean.** No decorative elements in the bottom-right 100 × 100 px area.
3. **Do not include promo codes, bonus amounts, or dates.** See "What static images may contain" below.
4. The attribution zone in the AI generation prompt should say: *"Leave bottom-right corner clean — do not add any logo or text there."*

### AI prompt safe area instruction (copy-paste)

```
IMPORTANT: Leave the bottom-right corner (approximately 100×100px) completely clean — 
no text, no icons, no decorative elements. This area is reserved for post-processing overlay.
Do not draw the CryptoBonusWorld logo or any site attribution yourself.
```

---

## Label Vocabulary

When an image needs a label describing the type of code, use one of these **approved labels only** (no actual code value):

| Use case | Approved label |
|----------|---------------|
| Default / most common | **REFERRAL CODE** |
| If exchange calls it promo | **PROMO CODE** |
| If exchange uses invitation | **INVITATION CODE** |
| Platform-specific | **REFERRAL ID** |
| Less common variant | **REFERRER CODE** |
| Bonus-first framing | **SIGN UP BONUS** |

**Never include the actual code string** (e.g., `CRYPTOBONUSW`, `mexc-CryptoBonus`) in any image.

---

## Why This Matters

| Risk | What happens | Impact |
|------|-------------|--------|
| Code changes | Image still shows old code. Users enter it and fail. | Trust damage, lost conversions |
| Bonus amount changes | Image shows "$30,000"; live offer is now "$10,000". | FTC/ASA compliance risk |
| Code expiry | Image shows valid-looking code that has been revoked. | User frustration, support load |
| Social sharing | OG image shared on Telegram/Twitter/WhatsApp gets cached for months | Old data persists after page is updated |
| SEO crawlers | Google may index the text baked in an image and surface stale claims | Brand misinformation in SERPs |

---

## What Static Images May Contain

Static images (OG, article banners, card images) are **evergreen illustrations**. They represent the exchange relationship, not the current offer.

**Allowed in static images:**
- Exchange name and logo (e.g. "MEXC", "BYBIT")
- Generic label: one of the approved labels above (no actual code value)
- Generic CTA: "Claim Bonus", "Get Bonus", "Sign Up"
- CryptoBonusWorld branding added in post-processing (mark, domain)
- Exchange brand colors and visual identity
- Generic visual elements (stars, planets, geometric shapes matching exchange palette)

**Banned in static images:**
- Actual promo/referral code string (e.g. `CRYPTOBONUSW`, `mexc-CryptoBonus`)
- Bonus amount (e.g. "Up to $30,000 USDT", "$30K+")
- Date or validity period (e.g. "June 2026", "Valid until Q3 2026")
- Verification status claim (e.g. "Verified ✓")
- AI-generated imitation of the CryptoBonusWorld logo
- Any text that would become false if the offer changes

---

## Rules by Image Type

### OG / Social Preview Images (`/share/`)

Purpose: The preview image shown when a page URL is shared on Telegram, Twitter/X, WhatsApp, LinkedIn, Facebook.

| Field | Rule |
|-------|------|
| Exchange name | ✅ Allowed |
| Approved label (e.g. "Referral Code") | ✅ Allowed |
| Actual code (e.g. `CRYPTOBONUSW`) | ❌ Banned |
| Bonus amount (e.g. "$30,000") | ❌ Banned |
| Date / "Verified June 2026" | ❌ Banned |
| CBW mark + domain (added in post) | ✅ Required |
| Generic CTA ("Claim Bonus") | ✅ Allowed |

**Rationale:** OG images are aggressively cached by platforms. Telegram and Twitter/X can cache previews for 30+ days.

---

### Article / Page Banner Images (`/article/`)

| Field | Rule |
|-------|------|
| Exchange branding | ✅ Allowed |
| Generic CTA visual | ✅ Allowed |
| Actual code | ❌ Banned |
| Bonus amount | ❌ Banned |
| Date | ❌ Banned |
| CBW mark only (no text, added in post) | ✅ Required |

---

### Homepage / Listing Exchange Cards (`/cards/`)

| Field | Rule |
|-------|------|
| Exchange name / logo | ✅ Allowed |
| Generic "Bonus Code" label | ✅ Allowed |
| Actual code | ❌ Banned |
| Dollar amount | ❌ Banned |
| Date | ❌ Banned |
| CBW mark only (no text, added in post) | ✅ Required |

---

### Evidence Screenshots (`/evidence/`)

Evidence screenshots are a separate category — real captures of exchange pages used to document verification.

| Field | Rule |
|-------|------|
| Exchange page content (code visible in screenshot) | ✅ Allowed — factual record |
| Bonus tiers, reward charts | ✅ Allowed — evidence of public page state |
| Caption describing what is shown | Required |
| Evidence used as evergreen illustration | ❌ Banned |

---

## QA Checklist (per exchange visual pack)

Run after post-processing pipeline before the page is marked ready for deploy.

**Automated (script output):**
- [ ] OG: exact 1200 × 630 px
- [ ] Article: exact 1200 × 675 px
- [ ] Card: exact 1200 × 800 px
- [ ] All files ≤ 400 KB
- [ ] CBW mark overlaid from `public/brand/cbw-header-mark-transparent.png`

**Manual visual check (open each image):**
- [ ] No promo code string visible in any image
- [ ] No bonus amount visible in any image
- [ ] No date or "Verified" claim visible
- [ ] CBW mark is fully visible (not cropped at edge)
- [ ] CTA button text is not cropped
- [ ] Exchange wordmark is not cropped
- [ ] OG: "CryptoBonusWorld.com" text legible on dark background
- [ ] Article: mark only (no text)
- [ ] Card: mark only (no text)
- [ ] All 3 images look from one visual factory (same background, same style)
- [ ] CBW mark matches the real favicon (globe + Bitcoin coin orbit) — not AI-generated fake

---

## CBW_BYBIT_VISUAL_PACK_MASTER_v1

**Status:** Approved by owner 2026-06-22. Awaiting source file upload to `incoming/bybit-visual-master-v1/`.

### Visual style

| Property | Value |
|----------|-------|
| Theme | Premium dark cosmic / fintech coupon |
| Palette | Bybit black + gold/amber |
| Background | Deep black with glowing planet/orb bottom-left, amber orbital arcs top-right |
| Border | Thin rounded amber border |
| Wordmark | Large centered **BYBIT** |
| Secondary label | Centered bold **REFERRAL CODE** (broad, visually stretched) |
| CTA button | Centered amber button — text: **CLICK TO CLAIM** |
| Cursor | White click-hand on button |

### Typography / layout rules

- BYBIT wordmark = primary top block, centered
- "REFERRAL CODE" centered directly below, broad + bold (not narrow)
- Vertical spacing BYBIT → REFERRAL CODE: intentionally larger than v0 drafts
- Vertical spacing REFERRAL CODE → CTA: intentionally larger than v0 drafts
- CTA centered below label
- CTA button medium-height (not overly chunky)
- All 3 blocks on one central vertical axis

### Banned elements (non-negotiable)

No promo code · No bonus amount · No date · No fake stats · No "Verified" text · No casino elements · No AI-generated CBW logo

### Source files (ChatGPT internal paths — need manual export)

| Role | ChatGPT path | Local incoming target |
|------|-------------|----------------------|
| OG base | `a_high_contrast_ultra_clean_promotional_banner_gr_1_batch_1.png` | `incoming/bybit-visual-master-v1/base-og.png` |
| Article base | `a_wide_dark_sci_fi_promotional_graphic_poster._ov_2_batch_2.png` | `incoming/bybit-visual-master-v1/base-article.png` |
| Card base | `a_polished_promotional_graphic_advertisement_scene_3_batch_3.png` | `incoming/bybit-visual-master-v1/base-card.png` |

### Production output paths (locked)

| Image | Dimensions | Output path | Usage |
|-------|-----------|-------------|-------|
| OG / social preview | 1200×630 | `public/media/exchanges/bybit/share/bybit-og-1200x630.jpg` | og:image, twitter:image, Telegram, Viber |
| Article | 1200×675 | `public/media/exchanges/bybit/article/bybit-article-1200x675.jpg` | In-article on /bybit/ |
| Card / homepage | 1200×800 | `public/media/exchanges/bybit/cards/bybit-card-1200x800.jpg` | Homepage cards, exchange grid, related cards |

### Install command (run after dropping source files into incoming/)

```bash
node scripts/visual-pack-overlay.mjs \
  --slug bybit \
  --og incoming/bybit-visual-master-v1/base-og.png \
  --article incoming/bybit-visual-master-v1/base-article.png \
  --card incoming/bybit-visual-master-v1/base-card.png \
  --accent "#F5A623"
```

### Site install map (already correct — no code changes needed)

| Reference location | Property | Path |
|-------------------|----------|------|
| `src/pages/bybit/index.astro` | `ogImage` | `/media/exchanges/bybit/share/bybit-og-1200x630.jpg` |
| `src/pages/bybit/index.astro` | `exchange.articleImg` | `/media/exchanges/bybit/article/bybit-article-1200x675.jpg` |
| `src/data/exchanges.ts` | `cardImage` | `/media/exchanges/bybit/cards/bybit-card-1200x800.jpg` |
| `src/data/exchanges.ts` | `ogImage` | `/media/exchanges/bybit/share/bybit-og-1200x630.jpg` |
| `src/data/exchanges.ts` | `articleImage` | `/media/exchanges/bybit/article/bybit-article-1200x675.jpg` |

Article image CSS: `width:100%; height:auto` — no crop.

---

## Exchange Status

### Bybit ⏳ Awaiting source files

| Asset | Status | Notes |
|-------|--------|-------|
| `bybit-og-1200x630.jpg` | ⏳ Pending | Current file is interim. Replace with CBW_BYBIT_VISUAL_PACK_MASTER_v1 via overlay script once source files uploaded to `incoming/bybit-visual-master-v1/` |
| `bybit-article-1200x675.jpg` | ⏳ Pending | Same — replace with master v1 |
| `bybit-card-1200x800.jpg` | ⏳ Pending | Same — replace with master v1 |
| Legacy PNG variants (og/article/card/social/story) | ⚠️ Unreferenced | Contain old content with banned elements; candidates for cleanup after master v1 installed |

### MEXC ⚠️ Needs overlay

| Asset | Status | Notes |
|-------|--------|-------|
| `mexc-og-1200x630.jpg` | ⚠️ Base only | 1200×630 JPG, correct dims, no CBW overlay yet — generated by Playwright HTML renderer |
| `mexc-article-1200x675.jpg` | ⚠️ Base only | 1200×675 JPG, correct dims, no CBW overlay yet |
| `mexc-card-1200x800.jpg` | ⚠️ Base only | 1200×800 JPG, correct dims, no CBW overlay yet |

**Action:** Re-generate MEXC images from ChatGPT (dark navy + MEXC cyan, no CBW mark in base), then run `visual-pack-overlay.mjs --slug mexc --accent "#0BCDFF"`.

---

## Visual Pack Asset Layers (Architecture)

Every exchange visual pack must follow a strict two-layer structure:

| Layer | Folder | Description |
|-------|--------|-------------|
| **BASE** | `public/media/exchanges/{slug}/base/` | Clean generated image. No CBW logo, no domain text, no watermark. Contains only: exchange wordmark, label, CTA button, background. |
| **FINAL** | `public/media/exchanges/{slug}/final/` | Production image created from BASE with approved overlay. Site always references FINAL. |

### Rules

1. **BASE = source of truth.** Never edit manually. Never overwrite. Recreate only from a new AI generation session.
2. **FINAL = production asset.** Generated from BASE by deterministic overlay script. May include: CBW logo mark, `CryptoBonusWorld.com` text, or no overlay (depending on approved config).
3. **Site must reference FINAL only.** Never reference BASE in production code.
4. **Do not use AI-generated fake CBW logo.** Overlay uses only `public/brand/cbw-header-mark-transparent.png`.
5. If BASE has CBW branding burned in, it is not a valid BASE — recreate from clean source.

### Approved overlay rules (Bybit, pending final decision)

| Image | Overlay |
|-------|---------|
| OG final | CBW logo mark + `CryptoBonusWorld.com` text |
| Article final | Pending owner decision: logo only / logo + domain / no overlay |
| Card final | Pending owner decision: logo only / no overlay |

### Bybit BASE/FINAL file paths (current)

```
BASE:
  public/media/exchanges/bybit/base/bybit-og-base-v1-1200x630.jpg
  public/media/exchanges/bybit/base/bybit-article-base-v1-1200x675.jpg
  public/media/exchanges/bybit/base/bybit-card-base-v1-1200x800.jpg

FINAL (currently = BASE copy, overlay pending):
  public/media/exchanges/bybit/final/bybit-og-final-v1-1200x630.jpg
  public/media/exchanges/bybit/final/bybit-article-final-v1-1200x675.jpg
  public/media/exchanges/bybit/final/bybit-card-final-v1-1200x800.jpg
```

---

## Generation Script Rule

Any script that generates exchange images must not accept `promoCode`, `bonusAmount`, or `validDate` as parameters that get rendered into image files.

---

## Logo System

### A) CBW Site Brand Logo

The CryptoBonusWorld logo is the site's own brand asset — separate from all exchange assets.

| Context | Asset | Rule |
|---------|-------|------|
| Header | `public/brand/cbw-header-logo-on-navy.png` | Use site-brand size token (`--logo-h`) |
| Footer | Same horizontal logo or mark | Use site-brand size token |
| Favicon | `public/brand/logo-mark.svg` → favicon.ico | 32×32 / 16×16 |
| Image overlay | `public/brand/cbw-header-mark-transparent.png` | 512×512, alpha — resize in script |

**The CBW logo must never be drawn by AI generators.** It is always applied in post-processing from the canonical source file.

---

### B) Exchange Logo System

Each exchange must have **one canonical official logo** used as source-of-truth across the entire site. Two variants are required:

| Variant | Description | Use |
|---------|-------------|-----|
| **Wordmark** | Horizontal logo with exchange name text | Hero blocks, article headers, standalone brand display |
| **Square / Tile mark** | Compact square or circle logo | Cards, comparison tables, related blocks |

**Source of truth location:** `public/brand/exchanges/{slug}/`

Example for Bybit:
```
public/brand/exchanges/bybit/bybit-wordmark.svg
public/brand/exchanges/bybit/bybit-mark.svg
public/brand/exchanges/bybit/bybit-mark-dark.svg   (optional dark variant)
public/brand/exchanges/bybit/bybit-mark-light.svg  (optional light variant)
```

#### Logo Size Policy

One source asset — multiple contextual sizes. **Do not enforce one identical pixel size everywhere.**

| Context | Asset type | Size rule |
|---------|-----------|-----------|
| Exchange hero (top) | Wordmark | `--exchange-logo-hero-h` token (e.g. 48–64px height) |
| Bottom CTA hero | Wordmark | Same visual family as top hero (match weight / color) |
| Homepage exchange card | Square mark | `--exchange-logo-card-h` token (e.g. 40–48px) |
| Related exchange cards | Square mark | `--exchange-logo-card-sm-h` token (e.g. 28–36px) |
| Comparison table | Square mark | `--exchange-logo-table-h` token (e.g. 24–28px) |
| Marketing images (OG/Article/Card) | Wordmark baked into image | Part of the visual composition — not a UI asset; no size token applies |

#### Reuse rule

The **same source SVG/PNG** must be used in all UI contexts listed above. Do not create separate brand-specific files per context. Apply size via CSS `height` + `width: auto` so the exchange logo scales correctly without distortion.

#### Color variants

If an exchange provides separate logo files for dark/light backgrounds, maintain both variants:
- Use the dark-background variant on dark cards, dark hero sections, dark CTA blocks
- Use the light-background variant on white/gray cards or comparison tables

---

## Related Documents

- `docs/SCREENSHOT_STANDARD.md` — evidence screenshot capture and annotation rules
- `docs/CLAIM_EVIDENCE_LEDGER_STANDARD.md` — what claims require evidence
- `docs/GOLD_STANDARD_EXCHANGE_TEMPLATE.md` — full template spec
- `scripts/visual-pack-overlay.mjs` — post-processing pipeline
- `public/brand/cbw-header-mark-transparent.png` — master CBW mark (512×512, transparent)
