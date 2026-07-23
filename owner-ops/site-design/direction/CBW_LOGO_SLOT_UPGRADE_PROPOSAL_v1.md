# CBW Logo-Slot Upgrade Proposal v1

- Task: CBW-UNIFIED-SITE-DESIGN-RESET-001 · 2026-07-22
- Status: **OWNER_APPROVED_UNIFIED_DESIGN_DIRECTION** — approved by the owner
  (CBW-UNIFIED-SITE-DESIGN-RESET-001-COMMIT, 2026-07-22) · `logoSlotSystemV2Required: true`
- Scope: all rectangular wordmark wells site-wide (OfferSurface family + review cards).
- Constraint: repository assets only; never stretch, clip, distort, or recolor a mark.

## 1. Exact issue diagnosis (measured, not impressionistic)

Current homepage-row well: 108×40 outer, padding 5px 8px → **usable 92×30**, CSS
contain-fit of the full PNG canvas. Measured against the actual assets
(opaque-pixel content box vs canvas; fill% = visible content area ÷ usable area):

| Asset | Canvas | Content box | Transparent trim W/H | Content AR | Rendered content | Fill % |
|---|---|---|---|---|---|---|
| bybit-wordmark-official.png | 768×285 | 758×262 | 1% / 8% | 2.89 | 79.8×27.6 | **79.7** |
| okx-wordmark-v2.png | 320×96 | 310×96 | 3% / 0% | 3.23 | 89.1×27.6 | **89.1** |
| bitget-wordmark-official-v1.png | 600×195 | 580×175 | 3% / 10% | 3.31 | 88.9×26.8 | **86.5** |
| kucoin-wordmark.png | 752×206 | 752×206 | 0% / 0% | 3.65 | 92.0×25.2 | **84.0** |
| bingx-wordmark.png | 461×176 | 428×124 | 7% / **29.5%** | 3.45 | 73.0×21.1 | **55.9** |
| binance-wordmark.png | 768×156 | 764×154 | 1% / 1% | 4.96 | 91.5×18.4 | **61.2** |
| phemex-wordmark.png | 700×190 | 700×190 | 0% / 0% | 3.68 | 92.0×25.0 | **83.2** |
| mexc-wordmark-dark.png | 768×101 | 768×101 | 0% / 0% | 7.60 | 92.0×12.1 | **40.3** |

Two distinct root causes:

1. **Transparent canvas padding.** The browser fits the *canvas*, not the visible
   mark. BingX loses 29.5% of its height to transparent padding → renders at 56%
   fill and looks like a floating sticker. (KuCoin/Phemex actually measure tight;
   their perceived weakness comes from cause 2 plus thin letterforms.)
2. **One-size contain-fit across content aspect ratios 2.89–7.60.** Wide marks
   (Binance 4.96, MEXC 7.60) are width-constrained and render 12–18px tall next
   to Bybit's 28px — inconsistent visual mass is guaranteed by the current rule,
   not by any individual asset.

## 2. Proposed fit rules (Logo-Slot System v2)

**Rule 1 — fit the content box, not the canvas.** Maintain a measured, per-asset
registry (`logo-slot-registry.ts`, design-preview data): content-box insets,
content AR, and derived class. Rendering compensates for transparent padding via
per-asset scale factors computed from the registry (assets themselves untouched;
optional later task may produce trimmed `-tight` copies as new repository assets).

**Rule 2 — aspect-ratio classes with height-first normalization** (usable area
M-slot: 96×30 — see Rule 3):

| Class | Content AR | Fit rule | Result in M slot |
|---|---|---|---|
| `COMPACT` | < 3.5 | fit to **height 28px**, cap at usable width | Bybit/OKX/Bitget ≈ 28px tall |
| `WIDE` | 3.5 – 5.0 | fit to **height 25px**, cap at usable width | KuCoin/BingX(trim-fit)/Phemex ≈ 25px; Binance width-capped ≈ 19px |
| `ULTRA_WIDE` | > 5.0 | fit to width; if resulting height < **14px floor** → **lockup fallback** (icon + name) | MEXC 7.60 → lockup fallback in row slots; acceptable as wordmark only in `HERO_FULL` XL slot |

**Rule 3 — tighter slots.** Side padding 8px → **6px**; row well 108×40 →
**112×40** (usable 100×28–30). Mobile well 90×30 → **96×32** (usable 84×24).

**Rule 4 — optical mass targets** (validation gate, measurable in Playwright):
every rendered wordmark must satisfy **content height ≥ 60% of usable height OR
content width ≥ 85% of usable width**, and fill% must land in the **62–95% band**
(lockup fallback otherwise). No mark may render < 14px content height in any slot.

**Rule 5 — integrity.** `object-fit: contain` semantics always; no non-uniform
scaling, no cropping of opaque pixels, no filters/recoloring; light marks on navy
wells, dark marks on white wells (measured luminance decides, as already practiced).

## 3. Slot variants (one system, five sizes)

| Slot | Outer (desktop) | Usable | Used by |
|---|---|---|---|
| `XL` | 220×64 | 208×52 | `HERO_FULL` |
| `L` | 160×48 | 148×38 | `COMPACT_BOTTOM`, comparison headers |
| `M` | 112×40 | 100×30 | `RANKING_ROW`, review cards |
| `S` | 88×28 | 80×22 | `COMPARISON_CELL`, dense directory, `RESTRICTED_NOTICE` |
| `LOCKUP` | slot-matching | — | any slot when wordmark missing or class/floor rules demand fallback |

All variants share the light/dark well treatment, radius 8px, 1px border.

## 4. Optical normalization rules

- Height targets per class (Rule 2) scale proportionally with slot usable height
  (28px target = 93% of M usable height; same ratio applied in XL/L/S).
- Per-asset **optical nudges** allowed only via the registry (±6% scale, ±2px
  vertical offset) to correct thin-stroke marks (KuCoin, Phemex) — never free-form
  CSS on individual pages.
- The registry is the single source of truth; a specimen page renders every
  asset in every slot for owner review, and the Playwright gate (Rule 4) runs
  against it.

## 5. Acceptance criteria for the implementing prototype

1. Specimen page shows all Top-10 identities + MEXC in all 5 slots, both wells.
2. Measured fill% for every rendered wordmark within 62–95%; no content height
   < 14px; BingX ≥ 75% fill in M (vs 55.9% today); Binance ≥ 70% via WIDE rule
   or documented as ULTRA_WIDE-adjacent decision; MEXC row slots use lockup.
3. Zero stretched/clipped marks (AR of rendered box == content AR, ±1%).
4. Homepage + review prototypes consume the same system with no local overrides.
