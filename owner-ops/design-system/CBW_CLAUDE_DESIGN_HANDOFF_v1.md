# CBW — Claude Design Handoff Brief — v1

**Status:** Owner-facing design handoff · documentation only (no component, token, asset, route, or page change)
**Date:** 2026-07-20
**Authoritative design source:** [CBW_SITE_DESIGN_SYSTEM_v2.md](CBW_SITE_DESIGN_SYSTEM_v2.md)
**Purpose:** the complete, ready-to-send package for Claude Design to produce a full site visual master — **prototypes only** — that systematizes the existing, owner-approved CryptoBonusWorld design.

---

## 1. Claude Design mission

- **Preserve the current CryptoBonusWorld visual DNA** (navy / amber / green, Inter + Barlow, light fintech chrome).
- **Systematize the entire future website around the approved exchange-page factory** — one coherent product across homepage, directory, passports, GEO surfaces, comparisons, guides, methodology/research, datasets, trust/legal, and system states.
- **Create prototypes only** — external mockups and specs.
- **Do not authorize or produce** code, routes, deployment, assets, or any production change.
- **Do not invent a new brand** and do not redesign the exchange factory from scratch.

---

## 2. Current brand DNA (exact, cite these)

| Element | Value | Source · lines |
|---|---|---|
| Navy — page/footer | `#080F18` | src/styles/tokens.css:9 |
| Navy — header/hero band | `#13233E` | tokens.css:10; PageHero.astro:44 |
| Amber brand accent | `#F7931A` (hover `#F9B841`) | tokens.css:12-13; CBW_BRANDBOOK_v1.md:15 |
| Green commercial CTA | `#16A34A` (hover `#15803D`) | tokens.css:16-17 |
| Light page bg / white | `#F7F8F4` / `#ffffff` | tokens.css:21-22 |
| Inter typography | UI, weights 500/700/800/900 | tokens.css:34; brandbook:31 |
| Barlow Condensed | hero labels + visual assets, 700/800 | brandbook:32 |
| Mono promo-code | SFMono/Consolas; 20→22px, weight 800, uppercase, `-webkit-text-fill-color` locked | tokens.css:35; ExchangePromoPage.astro:135-146 |
| Border radii | sm 6 / md 10 / lg 12 / xl 16 / pill 100 | tokens.css:38-42 |
| Shadows | card `0 2px 6px/.06` → hover `0 6px 20px/.11`; sm/md/lg | tokens.css:44-76 |
| Spacing rhythm | pad 20/24/32; section 24-48 | CleanLayout.astro:81-93 |
| Container widths | 1180 page / 1120 wide / 800 prose; article 760/720/540 | tokens.css:79; CleanLayout.astro:81-93; bybit/index.astro:66,102,177 |
| Logo-well treatment | slot 320×96 desktop / 250×76 mobile; contain; `visualScale` only | ExchangePromoLogoSlot.astro:88-100 |
| Exchange hero grammar | `.brand-hero` image `cover` over `linear-gradient(160deg,bgFrom,bgTo)` + logo well + label + code + CTA + source | ExchangePromoPage.astro:100-140 |
| Responsive | breakpoints 479 / 640 / 960; Samsung forced-dark re-lock | ExchangePromoPage.astro:451-512 |

**Brand rule:** exchange-brand colors appear **only inside generated visual assets**, never in site chrome (brandbook:24-25).

---

## 3. Reference specimens

| Specimen | Route | Source | Screenshot | Approved patterns | Reusable | Exchange-specific | Defects NOT to copy |
|---|---|---|---|---|---|---|---|
| Bybit desktop | `/bybit/` | src/pages/bybit/index.astro (bespoke, frozen) | `.tmp-full-site-audit-2026-07/shots/bybit-desktop.png`; `qa-screenshots/01-desktop-1440-hero.png` | 17-block order, hero grammar, fact/fee/verification tables, status badges, dark-lock | block order, tables, badges, hero grammar | heroTokens `#0C1118/#f7a600`, code `CRYPTOBONUSW`, bonus 30000 | inline-CSS duplication (do not replicate the fork) |
| Bybit mobile @390 | `/bybit/` | same | `qa-screenshots/05-mobile-390-first-screen.png`; `.tmp-full-site-audit-2026-07/shots/bybit-mobile.png` | code chip above fold, 1-col reflow, 360 support | mobile reflow rules | — | ~1.9–2.6MB mobile weight (design lighter) |
| OKX config page | `/okx/` | src/components/exchange/ExchangePromoPage.astro + src/data/exchangePages/okx.ts | `.tmp-full-site-audit-2026-07/shots/` (exchanges/okx set) | the canonical config-driven factory | the factory itself | okx `#0a0a0a` tokens | none — this is the template to generalize |
| Batch 01 preview | `/preview/exchanges/bydfi/` | src/components/exchange-preview/ExchangeReviewPreviewPage.astro + batch-01.ts | preview assets in `public/preview-media/exchanges/bydfi/` | Hero Brand Zone v1, editorial alternatives cards, safe "under review" states | hero-brand geometry, alt card, under-review states | accent/gradient/glow per exchange | disabled CTAs are by design — keep disabled in prototype |
| Batch 02 preview | `/preview/exchanges/htx/` | ExchangeReviewPreviewPage.astro + batch-02.ts | preview assets in `public/preview-media/exchanges/htx/` | 4-asset pack (adds CARD 1200×800) | card asset family | htx compliance hold | do not show htx as commercial |
| Homepage | `/` | src/pages/index.astro + src/components/home/HomepageGeoBonusFinder.astro | `qa-screenshots/04-desktop-1280-hero.png`; `.tmp-full-site-audit-2026-07/shots/*` | GeoBonusFinder rows, ExchangeCard, trust strip | decision-row, card, trust strip | country panel content | 4 parallel FAQ impls (design one) |
| SiteHeader | global | src/components/layout/SiteHeader.astro (FROZEN) | any desktop shot top strip | navy `#13233E`, 56px, Exchanges dropdown + Promo Codes + CTA | header pattern (do not restructure) | — | — |
| SiteFooter | global | src/components/layout/SiteFooter.astro | any shot bottom | navy `#080F18`, 4 columns, disclosure | footer pattern | — | — |

---

## 4. Exact source assets (do not copy or alter)

| Asset | Path(s) | Class |
|---|---|---|
| CBW logo (header) | `public/brand/cbw-header-mark-final.png` (+@2x), `public/brand/cbw-header-logo-on-navy.png` | tracked authority |
| Canonical exchange logos (tile) | `public/logos/{slug}.png` / `{slug}-wordmark*.png` (e.g. `bybit-wordmark-official.png`, `bitget-wordmark-official-v1.png`) | tracked authority |
| Approved HERO backgrounds | `public/media/hero-backgrounds/{bybit,mexc,okx,bitget,kucoin}-hero-custom-v1.png`, `okx-hero-custom-v2.png`, `bingx-hero-custom-v1-b012814a.png` | tracked authority |
| Approved OG | `public/media/exchanges/{slug}/final/{slug}-og-final-v{N}-1200x630.jpg` (bybit v3, okx v2, mexc v3) | tracked authority |
| Approved ARTICLE | `.../final/{slug}-article-final-v{N}-1200x675.jpg` | tracked authority |
| Approved CARD | `.../final/{slug}-card-final-v{N}-1200x800.jpg` | tracked authority |
| Batch 01 packs | `public/preview-media/exchanges/{10 slugs}/` (hero `-2172x724-v2.webp`, `-og-1200x630-v1.jpg`, `-article-inline-banner-v3.webp`, `-logo-slot-512x160.png`) | preview-only |
| Batch 02 packs | `public/preview-media/exchanges/{10 slugs}/` (adds `-card-1200x800-v1.jpg`, `-logo-lockup-512x160-v{N}.png`) | preview-only |
| Alternatives icons | `public/preview-media/alternatives/{slug}-logo-slot-512x160-v{N}.png` | preview-only |
| Desktop screenshots | `qa-screenshots/01-desktop-1440-hero.png`, `04-desktop-1280-hero.png`; `.tmp-full-site-audit-2026-07/shots/*-desktop.png` | approved owner artifact |
| Tablet screenshots | (none dedicated — Claude Design derives 1024/768 from desktop specimens) | not available |
| Mobile screenshots | `qa-screenshots/05-mobile-390-first-screen.png`, `07-mobile-360-first-screen.png`; `.tmp-full-site-audit-2026-07/shots/*-mobile.png` | approved owner artifact |
| Source AI plates | `public/media/exchanges/{slug}/source/*` | experimental — **not suitable for handoff** |
| `.tmp-*` visual packs / QA labs | `.tmp-visual-audit/`, `.tmp-hero-brand-v1/`, `.tmp-logo-well-color-audit/`, etc. | experimental — **not suitable for handoff** |

**Classification key:** tracked authority = served/committed; approved owner artifact = QA captures owner accepts; preview-only = noindex Batch assets; experimental / not-suitable = source plates + `.tmp-*` labs (reference only, never a deliverable input).

---

## 5. Frozen design rules (Claude Design must NOT change)

- SiteHeader structure; Hero Brand Zone v1 geometry; ExchangePromoLogoSlot geometry.
- Canonical logo colors (color-locked; never invert/whiten arbitrarily).
- Green = commercial-action meaning (never decorative).
- Existing exchange-page content order (the 17-block sequence).
- Batch 01; Batch 02; live exchange pages.
- Existing affiliate facts; promo codes; offer amounts; current route architecture.
- **The reverted unified-hero redesign (commit `183d555`) must not be restored.**

---

## 6. Terminology lock

### Visual Pack (named — NEVER A/B/C/D)
- **HERO** 2172×724 · **OG** 1200×630 · **ARTICLE** 1200×675 · **CARD** 1200×800

### Evidence Slots (proof screenshots — NEVER social/editorial imagery)
- **A** mobile registration/code · **B** desktop bonus/rewards · **C** optional factual · **D** unique verification

**The two systems must never be mixed or cross-labelled.**

---

## 7. Complete prototype page list (GEO + multilingual = prototypes only; no routes authorized)

1. Global homepage · 2. Exchange directory · 3. Global exchange passport · 4. Country hub · 5. Country exchange ranking · 6. Country × exchange passport · 7. Exchange comparison · 8. Category/ranking · 9. Guide/article · 10. Methodology · 11. Research hub · 12. Dataset landing · 13. About/editorial/trust · 14. Affiliate disclosure · 15. Corrections/contact · 16. 404 · 17. No-verified-ranking state.

---

## 8. Global homepage prototype

Require: compact hero; **soft country suggestion** (no forced redirect); country selector; language-selector placeholder (dormant, no active locales); horizontal exchange **decision rows**; **Top 5 featured core**; optional ranked positions **6–10** (compact); "available but weaker" section; "unavailable or restricted" section; "under review" section; methodology/trust block; editorial links; footer.

**All sample ranking values and CBW Scores must be visibly labelled** `Prototype data · Illustrative only`. No real code/amount/date/score baked into any image.

---

## 9. Exchange-directory prototype

Require: horizontal desktop rows; **mobile card fallback** (not a shrunk table); **Simple / Fees / Trading / Trust** views (UI states, not separate URLs); search; filters (client-side); status groups (recommended / available / restricted / under-review); **no-ranking state**; **stale state**; **restricted state**; **conflicting-evidence state**.

---

## 10. Required component sheet (visual states for each)

exchange decision row · featured exchange card · compact exchange row · restricted exchange row · under-review exchange row · CBW Score · score breakdown · status badge · confidence badge · checked-date label · verification badge · fact table · fee table · product matrix · availability matrix · bonus-code field · copy button · primary CTA · secondary CTA · affiliate disclosure · source citation · limitation notice · regulator warning · stale-data notice · unknown state · conflicting-evidence state · no-verified-ranking · empty state · loading state · error state.

---

## 11. Required responsive canvases

Complete, independent layouts at: **1440**, **1280**, **1024**, **768**, **430**, **390**, **360**. Mobile must be **designed independently, not shrunk from desktop**. Cover per canvas: header, hero, rows, cards, tables, comparison, promo-code/CTA, evidence, footer, long text, restricted/unknown/conflict states.

---

## 12. Site-wide asset requirements (visual direction only — do not generate)

homepage OG · exchange-directory OG · country HERO · country OG · comparison OG · guide ARTICLE image · methodology/research OG · dataset visual · empty-state illustration · restricted-state illustration · 404 visual. Every asset follows §13 evergreen rules and the dimension/ratio set in [CBW_SITE_DESIGN_SYSTEM_v2.md](CBW_SITE_DESIGN_SYSTEM_v2.md) §14.

---

## 13. Evergreen image rules

Never bake into permanent assets: promo code · bonus amount · expiry date · checked date · current score · current ranking · temporary legal status · CTA buttons · dynamic/screenshot UI · affiliate claim. **All changing data remains HTML / data overlay** (e.g. the HTML logo slot + code chip).

---

## 14. Required Claude Design deliverables

overall visual direction · all 17 page families · desktop variants · tablet variants · mobile variants · component sheet · state sheet · token sheet · grid/spacing sheet · typography sheet · asset inventory · image-generation prompt recommendations · accessibility notes · developer handoff notes · **explicit list of owner decisions still required**. All prototypes; no production output.

---

## 15. Forbidden visual directions (reject)

neon casino aesthetic · black-only trading-dashboard look · excessive glassmorphism · unrelated rainbow gradients · changing the navy/amber/green brand language · arbitrary logo recoloring · giant promotional images inside every exchange row · hiding factual content on mobile · fictional ratings displayed as facts · forced GEO redirect UX · rebuilding every page as a different visual concept · copying CryptoVek or any other project's design.

---

## 16. Owner approval checklist

brand consistency · homepage information density · Top 5 prominence · readability of positions 6–10 · mobile row/card behavior · CTA hierarchy · bonus-code visibility · evidence and source clarity · restricted-state honesty · no-ranking state · trust presentation · page-family completeness · visual-pack consistency · accessibility · developer feasibility.

---

## 17. Exact material package for Claude Design

**Design standards to provide:** `owner-ops/design-system/CBW_SITE_DESIGN_SYSTEM_v2.md`, `owner-ops/design-system/CBW_BRANDBOOK_v1.md`, `src/styles/tokens.css`, `docs/CBW_EXCHANGE_VISUAL_PACK_FACTORY_STANDARD_v1.md`, `docs/CBW_EXCHANGE_PAGE_VISUAL_EVIDENCE_STANDARD_v1.md`, `docs/CBW_EXCHANGE_PAGE_SEO_EVIDENCE_FACTORY_v1.md`, `docs/CBW_BATCH_01_VISUAL_FACTORY_STANDARD_v1.md`, this brief.
**Reference routes:** `/`, `/bybit/`, `/okx/`, `/exchanges/`, `/promo-codes/`, `/coinex/`, `/preview/exchanges/bydfi/`, `/preview/exchanges/htx/`.
**Screenshots:** `qa-screenshots/01-desktop-1440-hero.png`, `04-desktop-1280-hero.png`, `05-mobile-390-first-screen.png`, `07-mobile-360-first-screen.png`; `.tmp-full-site-audit-2026-07/shots/{bybit,bitget,bingx,coinex,exchanges}-{desktop,mobile}.png`.
**Logos:** `public/brand/cbw-header-mark-final.png`; `public/logos/{slug}.png` + `{slug}-wordmark*.png`.
**Approved packs:** `public/media/exchanges/{slug}/final/*` (og/article/card); `public/media/hero-backgrounds/{slug}-hero-custom-v1.png`; `public/preview-media/exchanges/{slug}/*` (Batch 01/02).
**Components to reference (read-only):** `src/layouts/CleanLayout.astro`, `src/layouts/InfoLayout.astro`, `src/components/exchange/ExchangePromoPage.astro`, `src/data/exchangePages/types.ts`, `src/components/ExchangePromoLogoSlot.astro`, `src/components/home/*`, `src/components/layout/{SiteHeader,SiteFooter}.astro`.
**EXCLUDE (must not be sent as inputs):** `public/media/exchanges/{slug}/source/*` (AI plates); all `.tmp-*` labs; `C:\projects\CryptoVek` (never inspect); any unapproved experimental variant.
*(Do not copy the files; this is a naming checklist only.)*

---

## 18. Exact owner message for Claude Design (ready to paste)

```
You are Claude Design. Project: CryptoBonusWorld (cryptobonusworld.com) — a verified crypto promo-code / referral-bonus site.

The exchange-page factory and brand are ALREADY APPROVED. Your job is to SYSTEMATIZE the existing visual language into a
complete site visual master — PROTOTYPES ONLY. Do NOT invent a new brand and do NOT redesign the exchange factory.

Brand DNA (keep exactly): navy #080F18 / header #13233E; amber accent #F7931A; green commercial CTA #16A34A; light bg #F7F8F4;
Inter (UI) + Barlow Condensed (hero labels) + mono for promo codes; radii 6/10/12/16/100; container widths 1180/1120/800 +
article 760/720/540; logo well 320×96 desktop / 250×76 mobile (contain, color-locked logos). Exchange hero = image over a
160° navy gradient with an HTML logo well + code chip + green CTA. Exchange-brand colors appear only inside imagery, never chrome.

Deliver a complete visual master:
- Overall visual direction + token sheet + typography sheet + grid/spacing sheet.
- All 17 page families: homepage, exchange directory, global exchange passport, country hub, country ranking,
  country×exchange passport, comparison, category/ranking, guide/article, methodology, research hub, dataset landing,
  about/editorial/trust, affiliate disclosure, corrections/contact, 404, no-verified-ranking state.
- Independent responsive layouts at 1440, 1280, 1024, 768, 430, 390, 360 (mobile designed independently, not shrunk).
- Component sheet + full system-state sheet (restricted, stale, unknown, conflicting-evidence, no-ranking, empty, loading, error).
- Asset inventory + image-generation prompt recommendations following evergreen rules (never bake code/amount/date/score/
  ranking/CTA into permanent images — those stay HTML overlays). Visual Pack = HERO 2172×724 / OG 1200×630 / ARTICLE 1200×675 /
  CARD 1200×800; never label them A/B/C/D (A/B/C/D are evidence screenshots only).
- Accessibility notes + developer handoff notes + an explicit list of owner decisions still required.

Hard rules: keep navy/amber/green; no neon/casino, no black-only dashboard, no forced-GEO redirect, no fictional ratings as fact,
no arbitrary logo recoloring, no hiding factual content on mobile. GEO and multilingual pages are PROTOTYPES ONLY — no routes.
Label ALL sample rankings/scores/data as synthetic ("Prototype data · Illustrative only"). Frozen and untouchable: SiteHeader
structure, Hero Brand Zone v1 geometry, live exchange pages, Batch 01/02, canonical logo colors, promo codes / offer amounts,
existing routes; do not restore any reverted unified-hero concept. Everything you produce is an external prototype requiring
owner review before any implementation.
```

---

## 19. Non-implementation statement

- This is a **design handoff only**.
- **No route** is authorized.
- **No component implementation** is authorized.
- **No image generation** is authorized.
- **No production change** is authorized.
- All Claude Design results remain **external prototypes until owner approval**, and each implementation step is a separate owner-approved task.

---

*Handoff brief, documentation only. Built on [CBW_SITE_DESIGN_SYSTEM_v2.md](CBW_SITE_DESIGN_SYSTEM_v2.md). Date: 2026-07-20.*
