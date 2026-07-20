# CBW Site Design System — v2

**Status:** Owner-facing design authority · documentation only (no component, token, asset, route, or page change)
**Date:** 2026-07-20
**Consolidates:** the read-only audit `CBW-SITE-DESIGN-SYSTEM-004-CURRENT-STATE`.
**Supersedes for site-wide scope:** [CBW_DESIGN_SYSTEM_v1.md](CBW_DESIGN_SYSTEM_v1.md) (v1 is 2026-06-25, exchange-card scoped, and partly stale — it still references a removed `Layout.astro`).

---

## 1. Purpose and authority

- This is the **site-wide design authority** for every future CryptoBonusWorld page family (homepage, exchange directory, global exchange passport, GEO surfaces, comparisons, guides, methodology, research, datasets, trust/legal, and system states).
- **Existing machine/runtime sources remain authoritative for implemented values.** This document consolidates and explains them; where a value here and a value in code disagree, **the code wins** and this doc is corrected. Runtime authorities: [src/styles/tokens.css](../../src/styles/tokens.css), [src/layouts/CleanLayout.astro](../../src/layouts/CleanLayout.astro), [src/components/exchange/ExchangePromoPage.astro](../../src/components/exchange/ExchangePromoPage.astro).
- This document **does not authorize any production change.** It systematizes the **already-approved** exchange-page/card factory; it does **not** invent a new brand or redesign the project.
- **Batch 01, Batch 02 and the live exchange pages remain frozen** (see §20).

---

## 2. Current design DNA

Values below are recorded from the runtime token sheet and the brandbook; cite these, do not re-key them.

| Element | Value | Source · lines |
|---|---|---|
| Navy — page/footer | `#080F18` | tokens.css:9 |
| Navy — sticky header | `#13233E` | tokens.css:10 (matches PageHero navy, PageHero.astro:44) |
| Navy — dropdown | `#1a2e4a` | tokens.css:11 |
| Amber brand accent | `#F7931A` (hover `#F9B841`) | tokens.css:12-13; brandbook:15 |
| Green CTA | `#16A34A` (hover `#15803D`) | tokens.css:16-17 |
| Light page bg | `#F7F8F4`; white `#ffffff` | tokens.css:21-22 |
| Gray scale | `#F9FAFB … #111827` (50–900) | tokens.css:23-31 |
| Semantic status | verified green / public-preview amber / check-hub blue triads | ExchangePromoPage.astro:440-448 |
| Coupon/code | bg `#FFFBF5`, border `#FCD34D`, code text `#C2410C`, label `#92400E` | tokens.css:52-59 |
| Typography | Inter (500/700/800/900) UI; Barlow Condensed (700/800) hero labels + assets; mono SFMono/Consolas for code | tokens.css:34-35; brandbook:31-33 |
| Heading hierarchy | H1 hero `clamp(28px,5vw,44px)`/900; H2 `clamp(24px,4vw,36px)`/800; label 11px/700/0.1em | brandbook:36-41 |
| Body hierarchy | 16px / 1.65, weight 400–500 | brandbook:38 |
| Code typography | promo code 20→22px, weight 800, uppercase, `-webkit-text-fill-color` locked | ExchangePromoPage.astro:135-146 |
| Borders | card border gray-200 `#E5E7EB`, hover `#C7D2FE` | tokens.css:46,50 |
| Radii | sm 6 / md 10 / lg 12 / xl 16 / pill 100 | tokens.css:38-42 |
| Shadows | sm `0 1px 4px/.08`, md `0 4px 12px/.10`, lg `0 8px 24px/.14`; card `0 2px 6px/.06` → hover `0 6px 20px/.11` | tokens.css:44-76 |
| Motion | `150ms ease` / `200ms ease`; hover translateY(-1/-3px) | tokens.css:82-83 |
| Logo wells | page slot 320×96 desktop / 250×76 mobile; `visualScale` only | ExchangePromoLogoSlot.astro:88-100 |
| Responsive | breakpoints 479 / 640 / 960; Samsung forced-dark re-lock | ExchangePromoPage.astro:451-512 |

**Brand rule (brandbook:24-25):** exchange-brand colors (Bybit orange, MEXC cyan, etc.) appear **only inside generated visual assets**, never in site chrome, nav, or section styling.

---

## 3. Layout and container system

- **CleanLayout** ([src/layouts/CleanLayout.astro](../../src/layouts/CleanLayout.astro)) — the single light shell for all production pages; imports `tokens.css` (:4); defines container tokens (:81-93); renders `SiteHeader` + `SiteFooter`.
- **InfoLayout** ([src/layouts/InfoLayout.astro](../../src/layouts/InfoLayout.astro)) — thin wrapper that renders `CleanLayout` (:16,36) and caps content to prose width; used by legal/info pages; bridges legacy `--color-*` tokens to light values (:43-74).
- **Legacy `Layout.astro` no longer exists** — the dark→light migration is complete; it survives only in stale comments.

| Width token | Value | Intended use | Status |
|---|---|---|---|
| `--cbw-page-max` | **1180px** | shell / most sections / directory grids | permanent |
| `--cbw-wide-max` | **1120px** | wide tables, GeoBonusFinder, ranking tables | permanent |
| `--cbw-prose-max` | **800px** | legal/info prose (InfoLayout) | permanent |
| article measures | **760 / 720 / 540px** | `.bw-wrap` 760, `.cf-inner`/`.p2-inner` 720, `.bh-inner` 540 (exchange review) | permanent for review pages; **candidates for consolidation into a documented "measure scale" token set** |

Source: tokens.css:79; CleanLayout.astro:81-93; bybit/index.astro:66,102,177,200,225. The six widths are intentional but only three are tokenized — consolidating the article measures into named tokens is a future, owner-gated step.

---

## 4. Exchange-page factory contract

The repeatable factory = [ExchangePromoPage.astro](../../src/components/exchange/ExchangePromoPage.astro) (config-driven) consumed by okx/bitget/kucoin/bingx; bybit/mexc are frozen bespoke copies with identical output.

- **Content contract** — the 17-block canonical order (ExchangePromoPage.astro:515-935): title bar → brand hero → compact facts → SEO/intro/disclosure → CTA bar → what-is-the-code → how-to-claim → evidence (registration) → CTA bar → bonus levels → optional bonus-page evidence → other codes → about/support → partner offer + article banner → search variations (exactly 5) → fees → KYC/availability → verification → FAQ → related → closing hero → rating → voting.
- **Visual contract** — light, dark-locked; `.brand-hero` (image `cover` over `linear-gradient(160deg,bgFrom,bgTo)`); `.p2-inner` 720px; green CTA system; status badges; Samsung forced-dark defense (:451-512).
- **Data contract** — one `ExchangePromoPageConfig` ([src/data/exchangePages/types.ts:54-157](../../src/data/exchangePages/types.ts)): identity, media, commercial, facts, fees, kyc, `heroTokens{bgFrom,bgTo,accent,codeColor}`, SEO meta, content arrays. Volatile fields (promoCode/lastChecked/sourceUrl) may be pulled from `getOffer()` (bybit.ts:2-4).
- **Commercial contract** — `promoCode` + `/go/{slug}` are immutable inputs (from `src/data/offers.ts` / `src/data/affiliate-links.ts`); CTA text never carries a USDT amount; outbound links use `rel="noopener sponsored"`; disclosure sits near the first CTA.
- **Evidence contract** — the A/B/C/D evidence slots (see §5); figures `.p2-evidence-img` 360px default / 740px `--wide`.
- **QA contract** — `npm run build` 0 errors; code appears in built HTML; evidence images exist on disk; no forbidden claims; viewports desktop 1440×900 / mobile 390×844.
- **Preview safety** — [ExchangeReviewPreviewPage.astro](../../src/components/exchange-preview/ExchangeReviewPreviewPage.astro), `noindex`, SAFE invariants (`promoCode/bonusAmount/affiliateUrl = null`, `externalCtaEnabled/productionEligible = false`, `status:'under_review'`), `ctaMode="preview"` never routing to `/go/`.
- **Production activation gate** — owner approval + offer verification + complete evidence chain + sitemap swap; preview → live is a deliberate, owner-approved step.

Logo well component: [ExchangePromoLogoSlot.astro](../../src/components/ExchangePromoLogoSlot.astro) — fixed geometry, `visualScale`/`logoBudget` only (frozen).

---

## 5. Terminology lock

### Exchange Visual Pack (named assets — NEVER call these A/B/C/D)
- **HERO** — 2172×724 (page hero background)
- **OG** — 1200×630 (social/link preview)
- **ARTICLE** — 1200×675 (16:9 article/inline)
- **CARD** — 1200×800 (homepage/directory card)

### Exchange Evidence Slots (proof screenshots — NEVER confuse with social/editorial imagery)
- **A** — mobile registration / referral-code proof (390–430px, mandatory)
- **B** — desktop bonus / rewards proof (1280–1440px, mandatory, must differ from A)
- **C** — optional additional factual evidence (fees / KYC / restricted-countries / PoR)
- **D** — unique verification-section evidence (must not duplicate A or B)

**Locked rules:**
- Visual Pack assets (HERO / OG / ARTICLE / CARD) **must never be labelled A/B/C/D.**
- Evidence Slots (A/B/C/D) **must never be confused with, or reused as, social/editorial Visual Pack imagery.**

Sources: [docs/CBW_EXCHANGE_VISUAL_PACK_FACTORY_STANDARD_v1.md](../../docs/CBW_EXCHANGE_VISUAL_PACK_FACTORY_STANDARD_v1.md) (pack), [docs/CBW_EXCHANGE_PAGE_VISUAL_EVIDENCE_STANDARD_v1.md](../../docs/CBW_EXCHANGE_PAGE_VISUAL_EVIDENCE_STANDARD_v1.md) §6 (evidence slots).

---

## 6. Canonical logo contract

- **One canonical exchange logo per exchange** — the single source for HERO, OG, ARTICLE, CARD and the page logo slot.
- **Color-locked** — never `invert()`, never arbitrary white substitution; fix readability via glow/background only.
- **Contain, not cover** — `object-fit: contain`, aspect preserved.
- **Fixed page logo-well geometry** — slot 320×96 desktop / 250×76 mobile (ExchangePromoLogoSlot.astro:88-100); logo max 300×86 / 235×68.
- **`visualScale` / `logoBudget` only** — no other geometry change (e.g. Bybit 0.70, MEXC 1.00).
- **Safe area** — ≥16px horizontal / ≥10px vertical inside the slot (Batch 01 standard); glow families `no_glow` / `soft_glow` (0.65,145%×125%) / `strong_glow` (0.82,165%×145%).
- **Reuse** — the same asset feeds all five surfaces; no redrawn or "similar" variants.
- **Versioning / cache-busting** — never overwrite a live filename (CDN immutable cache); a new capture requires an incremented `-v{N}` (or content-hash) filename plus config update.

Sources: [docs/CBW_EXCHANGE_LOGO_SLOT_STANDARD_v1.md], [docs/CBW_PAGE_PROMO_LOGO_SLOT_STANDARD_v1.md], [docs/CBW_BATCH_01_VISUAL_FACTORY_STANDARD_v1.md](../../docs/CBW_BATCH_01_VISUAL_FACTORY_STANDARD_v1.md).

---

## 7. Evergreen visual rules

**Forbidden inside evergreen Visual Pack images (HERO / OG / ARTICLE / CARD):**
- promo code
- bonus amount
- expiry date
- last-checked date
- rankings
- scores
- live/screenshot UI
- CTA buttons
- any temporary claim

**Changing facts (code, amount, dates, rating, status) must remain HTML / data overlays**, rendered as separate on-page elements (e.g. the HTML logo slot + code chip) — never baked into an image. Sources: [docs/CBW_EXCHANGE_PAGE_VISUAL_EVIDENCE_STANDARD_v1.md](../../docs/CBW_EXCHANGE_PAGE_VISUAL_EVIDENCE_STANDARD_v1.md) §4; visual pack factory standard.

---

## 8. Current component inventory

| Component | Path | Classification |
|---|---|---|
| CleanLayout | src/layouts/CleanLayout.astro | production-ready (shell) |
| InfoLayout | src/layouts/InfoLayout.astro | production-ready (prose wrapper) |
| ExchangePromoPage | src/components/exchange/ExchangePromoPage.astro | production-ready (factory) |
| ExchangeReviewPreviewPage | src/components/exchange-preview/ExchangeReviewPreviewPage.astro | preview-only / frozen |
| ExchangePromoLogoSlot | src/components/ExchangePromoLogoSlot.astro | frozen geometry |
| SiteHeader | src/components/layout/SiteHeader.astro | frozen (owner) |
| SiteFooter | src/components/layout/SiteFooter.astro | production-ready |
| PageHero | src/components/PageHero.astro | production-ready (non-exchange hero) |
| ExchangeCard | src/components/home/ExchangeCard.astro | production-ready |
| HomepageGeoBonusFinder | src/components/home/HomepageGeoBonusFinder.astro | production-ready |
| Breadcrumbs | src/components/Breadcrumbs.astro | production-ready (schema) |
| TrustStrip | src/components/TrustStrip.astro | production-ready |
| PromoCodeCopy / CTAButton / ExchangeLogo | src/components/* | production-ready primitives |
| bybit/mexc live pages | src/pages/{bybit,mexc}/index.astro | page-specific / frozen (inline-CSS twins) |
| coinex neutral status | src/pages/coinex/index.astro | page-specific |
| FAQ markup | bybit, faq/, exchanges/, promo-codes/ | duplicated → extraction candidate |
| fact/fee/comparison tables | bybit `.cf-table`/`.p2-table`, ExchangePromoPage, coinex, promo-codes | duplicated → extraction candidate |
| status badges | inline `.status-verified/-public-preview/-check-hub` | duplicated → extraction candidate |
| affiliate disclosure | inline in factory/pages | duplicated → extraction candidate |
| redirect stubs (13) | legacy routes | obsolete-intentional |
| icon set / form fields / system-state components | — | future / owner-gated (do not exist) |

---

## 9. Safe extraction candidates (document only — do not implement)

| Candidate | Current duplicate locations | Visual-parity requirement | Risk | Owner approval |
|---|---|---|---|---|
| FAQ component | bybit/index.astro `.p2-faq`, faq/index.astro, exchanges/index.astro, promo-codes/index.astro | pixel-identical `<details>` accordion + FAQPage schema | medium (schema regressions) | required |
| Fact table | bybit `.cf-table`, ExchangePromoPage compact facts, coinex status card | identical `.cf-*` styling | low | required |
| Fee table | bybit `.p2-table`, ExchangePromoPage fee table | identical `.p2-table` styling | low | required |
| Status badge | inline triads (bybit:455-464, ExchangePromoPage:440-448) | identical color triads | low | required |
| Affiliate disclosure | inline near first CTA across pages | identical wording + placement | low (compliance) | required |
| Exchange decision row | HomepageGeoBonusFinder `.gf-row` | identical row anatomy | medium | required |

Extraction must land first in a noindex Component Preview Lab (§18) with pixel-parity verification before touching any live page.

---

## 10. Site page-family matrix

Shell = CleanLayout unless noted. GEO families (4–6) are **design concepts only — no routes** (deferred per [STANDARDS-RECONCILIATION-v1.md](../../docs/geo-research/STANDARDS-RECONCILIATION-v1.md) §11 and [NO-PROXY-RESEARCH-MODE-v1.md](../../docs/geo-research/NO-PROXY-RESEARCH-MODE-v1.md)).

| # | Family | Intent | Hero | Required sections | Optional | Shared comps | Unique comps | Assets | Commercial | SEO/schema | States |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Homepage | discover bonus | GeoBonusFinder | finder, trust strip, card grid, FAQ | guide | ExchangeCard, TrustStrip | GeoBonusFinder | CARD | CTA→/go | FAQPage | empty→global; restricted→row note |
| 2 | Exchange directory | compare all | PageHero | card grid, FAQ | filters | ExchangeCard | — | CARD | per-card CTA | ItemList+FAQ | empty; stale-date |
| 3 | Global exchange passport | one-exchange facts | brand-hero | facts, products, fees, offer | evidence | LogoSlot, tables | — | HERO/OG/ARTICLE/CARD | CTA→/go | Breadcrumb (avoid Product) | restricted→no CTA |
| 4 | Country hub (concept) | market overview | PageHero | 4 status groups, payments, regulation | FAQ | rows, badges | availability matrix | country visual | gated | CollectionPage | **no-ranking** |
| 5 | Country ranking (concept) | ranked list | PageHero | ranking table, methodology | — | decision rows | — | — | gated | ItemList | **no-verified-ranking** |
| 6 | Country×exchange passport (concept) | "avail in Y?" | brand-hero | direct answer, matrix, score, sources | evidence | tables, badges | availability matrix | evidence | gated | WebPage+Breadcrumb | **conflicting-evidence** |
| 7 | Comparison | A vs B | PageHero | verdict, matrix, fees | — | tables | — | OG(2 logos) | 2 equal CTAs | ItemList | — |
| 8 | Category/ranking | best-for | PageHero | ranked rows | FAQ | rows | — | — | CTA | ItemList+FAQ | empty→noindex |
| 9 | Guide/article | how-to | PageHero/light | prose, steps, FAQ | evidence | prose, Breadcrumbs | — | ARTICLE | soft CTA | Article/HowTo | — |
| 10 | Methodology | trust | **light (fix from dark)** | prose | — | InfoLayout prose | — | — | none | Article | — |
| 11 | Research hub | authority | PageHero | report cards | — | article card | — | OG | none | CollectionPage | — |
| 12 | Dataset landing | data | light | table, download, methodology | — | dataset card | — | OG | none | Dataset | — |
| 13 | About/editorial/trust | trust | light `.page-header` | prose | — | InfoLayout prose | — | — | disclosure | Organization | — |
| 14 | Affiliate disclosure | compliance | light | prose | — | InfoLayout | — | — | disclosure | — | — |
| 15 | Corrections/contact | trust | light | form | — | contact grid | — | — | none | — | success/error |
| 16 | 404 | recover | light | message + links | — | `.nf-container` | — | — | none | noindex | — |
| 17 | No verified ranking | honesty | — | caution note | — | badge | — | — | none | — | the state itself |

Accessibility (all families): semantic headings; crawlable `<a href>` links; `object-fit: contain` logos; `color-scheme: light`; visible focus states; alt text on evidence images.

---

## 11. Future component catalog

- **Primitives:** typography, buttons, links, badges, icons (new), fields (new), dividers, surfaces.
- **Navigation:** header (frozen), desktop nav, mobile nav, breadcrumbs, country selector (from finder), language selector (dormant), footer.
- **Page shells:** marketing (CleanLayout), exchange (ExchangePromoPage), directory, GEO (concept), editorial (InfoLayout), research (concept).
- **Cards and rows:** exchange decision row, featured exchange card (ExchangeCard), compact row, restricted row, under-review row, article card (new), comparison card (new), dataset card (new).
- **Data display:** CBW Score (GEO, deferred), score breakdown (deferred), fact table, fee table, product matrix (deferred), availability matrix (deferred), source list, timeline / change log (new).
- **Commercial:** bonus-code box (PromoCodeCopy), copy control, primary CTA, secondary CTA, affiliate disclosure, offer conditions.
- **Evidence and trust:** verification badge, checked date, confidence badge (deferred), source citation, limitation alert (new), regulator warning (deferred), methodology note, author/reviewer block (new).
- **GEO:** all deferred (country selector suggestion, availability matrix, conflicting-evidence panel).
- **Editorial:** prose (InfoLayout), article header (new), HowTo block (new).
- **Feedback / system states:** loading, empty, **no verified ranking**, restricted, stale, unknown, conflicting evidence, error, 404 — the largest current gap (only 404 + the coinex "under review" pattern exist).

---

## 12. Design-token architecture (record only — do not create/modify token files)

| Group | Existing stable | Inconsistent existing | Owner decision required |
|---|---|---|---|
| color primitives | tokens.css:8-31 | 404/redirect stubs hardcode hex | new brand shades |
| semantic colors | status triads (ExchangePromoPage:440) | not in tokens.css | promote to tokens |
| surfaces | card bg/border/shadow (tokens.css:44-50) | preview navy well `#12284A` separate | well token |
| text | gray scale | InfoLayout legacy `--color-*` bridge | unify bridge |
| typography | Inter/Barlow/mono | scale lives in brandbook not tokens | promote scale |
| spacing | pad 20/24/32 | ad-hoc paddings in pages | spacing scale |
| containers | 1180/1120/800 | +760/720/540 in bespoke CSS | canonical measure set |
| grid | 1→2→3 col | — | — |
| breakpoints | 640/960 | +479/820 elsewhere | canonical breakpoints |
| borders | gray-200/hover | — | — |
| radii | 6/10/12/16/100 | — | — |
| shadows | sm/md/lg + card | — | — |
| z-index | header 200 | ad-hoc elsewhere | z-scale |
| motion | 150/200ms | — | — |
| image ratios | 3:1 / 1.905 / 16:9 / 3:2 | doc-only, not tokenized | promote |
| logo constraints | slot 320×96 / 250×76 | — (frozen) | — |
| density | — | undefined | owner |

---

## 13. Responsive standard

| Width | Header | Hero | Rows/cards | Tables | Promo/CTA | Evidence | Footer |
|---|---|---|---|---|---|---|---|
| 1440 | full nav + CTA (≥820) | brand-hero 540 inner / PageHero 400h | 3-col | full | inline | 360→740 `--wide` | 4-col |
| 1280 | full | same | 3-col | full | inline | same | 4-col |
| 1024 | full | PageHero 320h | 3→2 col | full / scroll | inline | same | 4-col |
| 768 | near-burger | shorter | 2-col | `overflow-x:auto` wrapper | inline | scaled | stacks |
| 430 | burger (<820) | stacked, code chip above fold | 1-col | horizontal scroll | full-width | scaled | stacked |
| 390 | burger | logo 250×76, label 24px | 1-col (logo 72) | scroll | full-width | scaled | stacked |
| 360 | burger | fonts shrink (≤479 rules) | 1-col | scroll | full-width | scaled | stacked |

Long text: capped at prose 800px. Restricted / unknown / conflict states: neutral caution note (coinex / preview pattern), no CTA. Samsung forced-dark defense re-locks light at every width.

---

## 14. Site-wide visual asset families (define future requirements — do not generate)

| Family | Dims | Ratio | Format | Gen/static | Logo | Allowed text | Forbidden text | Mobile crop | Version | Source→Output |
|---|---|---|---|---|---|---|---|---|---|---|
| Exchange (exists) | HERO 2172×724, OG 1200×630, ARTICLE 1200×675, CARD 1200×800 | per-asset | PNG/JPG | generated | canonical | name, "REFERRAL/PROMO CODE", "CLICK TO CLAIM" | code/amount/date/ratings | center | -v{N} | logo+hero → `.../{slug}/final/` |
| Homepage | OG 1200×630 | 1.905 | JPG | static | brand mark | tagline | live data | — | -v{N} | brand → media/site |
| Directory | OG 1200×630 | 1.905 | JPG | static | brand | "Exchanges" | — | — | -v{N} | — |
| Countries (concept) | HERO 2172×724 + OG 1200×630 | 3:1/1.905 | PNG/JPG | generated | flag + brand | country name | live availability/scores | center | -v{N} | — |
| Comparison | OG 1200×630 | 1.905 | JPG | generated | 2 logos | "A vs B" | winner claim | — | -v{N} | — |
| Guides | ARTICLE 1200×675 | 16:9 | JPG | static/gen | brand | title overlay | — | 16:9 | -v{N} | — |
| Methodology/Research | OG 1200×630 | 1.905 | JPG | static | brand | title | — | — | -v{N} | — |
| Datasets | OG 1200×630 | 1.905 | JPG | static | brand | dataset name | — | — | -v{N} | — |
| Social sharing | 1080² / 1200² / 1080×1350 / 1080×1920 | per-ratio | JPG | generated | brand | generic | code/amount/date | per-ratio | -v{N} | `.../cards/` |
| Empty/restricted/error | inline SVG | responsive | SVG | static | mark | message | — | responsive | — | — |

**Preserve:** canonical color-locked logos; existing Batch 01/02 packs; no code/amount/date baked into evergreen images; HTML overlay for all changing data.

---

## 15. Image-generation memory architecture

Permanent layers (locations to extend, not create anew):
1. **Human-readable standards** — the existing `docs/CBW_*_STANDARD_v1.md` set + this document.
2. **Machine-readable manifests** — future `owner-ops/design-system/asset-manifests/{slug}.json` (dims/paths/version/glow-family/logo-asset).
3. **Prompt templates** — `owner-ops/visual-pipeline/`.
4. **Canonical logos** — `public/media/exchanges/{slug}/logo/*-official-trimmed.png` + `public/logos/`.
5. **Generated outputs** — `public/media/exchanges/{slug}/final/`.
6. **Rejected variants** — `src/data/screenshot-factory/rejected/` + `.tmp-*` packs (untracked).
7. **QA captures** — `qa-screenshots/`.
8. **Owner approvals** — `owner-ops/design-system/`.
9. **Current ChatGPT Project design summary** — a single "current approved visual" digest in `owner-ops/design-system/`.

**Future command workflow — "Generate the complete Visual Pack for Exchange X":** load the visual-pack + logo-slot + hero-background + glow-decision standards → resolve X's tokens (canonical logo asset, glow family, gradient) → run the generator → output **HERO, OG, ARTICLE, CARD** (+ logo-slot asset where needed) at canonical sizes → run QA captures at 1440 / 768 / 390. No image is generated by this document.

---

## 16. Claude Design handoff requirements

**Supply:** reference specimens (`/bybit/`, `/okx/`, one Batch 01 preview, one Batch 02 preview, homepage, `/bybit/`@390); desktop screenshots (`qa-screenshots/` 1440/1280, `.tmp-full-site-audit-2026-07/shots/`); mobile screenshots (390/360); canonical logos (`public/logos/`, `.../{slug}/logo/`); existing packs (`.../final/`, `public/preview-media/`); header/footer (SiteHeader/SiteFooter); tokens (tokens.css + brandbook); the §10 page-family matrix; the §11 component + §11 state catalog; the §20 frozen systems; forbidden redesigns; canvas sizes (desktop 1440/1280, tablet 1024/768, mobile 430/390/360).

**Expected prototype deliverables:** all 17 page families + component sheet + state sheet + responsive variants + design tokens + asset list — **as prototypes only.**

> **Claude Design must systematize the existing CBW visual language. It must not invent a new brand.**

---

## 17. Future repository package (extend existing trees only — no parallel root)

| Artifact | Location |
|---|---|
| Design documentation | `owner-ops/design-system/` (this dir) + `docs/CBW_*` standards |
| Token config | `src/styles/tokens.css` (extend, do not fork) |
| Component manifest | extend `owner-ops/design-system/COMPONENT_REPLACEMENT_MAP.json` |
| Page-template manifest | `owner-ops/design-system/page-templates/*.json` (future) |
| Asset manifest | `owner-ops/design-system/asset-manifests/{slug}.json` (future) |
| Prompt templates | `owner-ops/visual-pipeline/` |
| Responsive rules | `docs/` + this document |
| Screenshot baselines | `qa-screenshots/` |
| Visual QA | `scripts/screenshot-*` |
| Owner approvals + version history | `owner-ops/design-system/` |

**Do not** create an `owner-ops/design/` or top-level `design-system/` root that competes with the above.

---

## 18. Design Lab recommendation

Recommend a future **noindex Design Lab** under the existing `/preview/**` convention (reuses the trusted noindex + sitemap-excluded + no-`/go/` safety of the Batch preview system). Proposed families + route naming only (no routes created here):

`/preview/lab/` → `primitives/`, `heroes/`, `rows/` (exchange decision rows), `cards/`, `tables/`, `evidence/`, `geo-states/`, `system-states/` (empty / restricted / unknown / conflict / no-ranking / error), `visual-packs/`.

All noindex, excluded from sitemap, no `/go/`, no real codes — mirroring the Batch preview invariants. This is the home for extracted primitives (§9) before they touch live pages.

---

## 19. Implementation roadmap

| Phase | Scope | Frozen | Acceptance | Desktop/Mobile QA | Owner gate | Commit | Deploy |
|---|---|---|---|---|---|---|---|
| 1 Design standard | this doc + future manifests (docs only) | all code | reviewable, 0 diff | — | approve doc | commit docs | no |
| 2 Claude Design master | full mockups | all | covers §10 | visual | approve | none | no |
| 3 Owner approval | sign-off | all | GO recorded | — | yes | none | no |
| 4 Design Lab | noindex `/preview/lab/` gallery | live/Batch | isolated, noindex | 1440/768/390 | approve | commit | no |
| 5 Component Preview Lab | extract §9 candidates into Lab | live pages | render in isolation, pixel-parity | responsive | approve | commit | no |
| 6 Shared site shell | apply comps w/o visual change; methodology→light, faq→InfoLayout | money pages | parity except intended fixes | full audit | approve | commit | yes |
| 7 Homepage preview | homepage v2 in worktree | live homepage | noindex compare | responsive | approve | none | no |
| 8 Directory preview | directory v2 decision rows | live | noindex | responsive | approve | none | no |
| 9 Information/trust pages | migrate bespoke to shared comps | money pages | parity | audit | approve | commit | yes |
| 10 Editorial templates | guide/article/research/dataset shells | all live | noindex first | audit | approve | staged | staged |
| 11 GEO visual prototypes | country/passport mockups only (routes stay deferred) | GEO configs/routes | noindex, no route | responsive | approve | none | no |
| 12 Controlled production rollout | per family, one at a time | §20 list | audit + IndexNow | full | per rollout | commit | yes+push |

---

## 20. Frozen systems (must remain untouched)

- Live exchange pages (`src/pages/{bybit,mexc,okx,bitget,kucoin,bingx}/index.astro`)
- `/coinex/` neutral status page
- Batch 01 (`preview/exchange-batch-01`, `docs/CBW_BATCH_01_VISUAL_FACTORY_STANDARD_v1.md`)
- Batch 02 (`src/data/exchangePreview/batch-02.ts` + preview pages)
- Hero Brand Zone v1 (`src/data/exchangePreview/hero-brand-tokens.ts` + ExchangeReviewPreviewPage geometry)
- SiteHeader (`src/components/layout/SiteHeader.astro`)
- Affiliate facts / codes / offers (`src/data/offers.ts`, `src/data/affiliate-links.ts`, `src/data/exchanges.json`, `IMMUTABLE_LINKS`)
- `/go/` routes (`src/pages/go/[exchange].astro`)
- Homepage (`src/pages/index.astro`, `HomepageGeoBonusFinder.astro`)
- Sitemap (`src/pages/sitemap.xml.ts`)
- Canonical (`src/layouts/CleanLayout.astro`)
- Robots (`public/robots.txt`)
- GEO schemas/config (`schemas/geo/**`, `config/geo/**`)
- Kazakhstan research data (`research/geo/kazakhstan/**`)
- Untracked owner / evidence / `.tmp-*` assets
- ExchangePromoLogoSlot geometry (`src/components/ExchangePromoLogoSlot.astro`)
- The reverted unified-hero work (commit `183d555`) **must not be restored**

---

## 21. Non-implementation statement

This file:
- creates **no components**;
- creates **no route**;
- creates **no tokens**;
- creates **no assets**;
- makes **no page changes**;
- performs **no GEO implementation**;
- changes **no production behavior**.

Every implementation derived from this standard requires a **separate task and explicit owner approval.**

---

*Design authority, documentation only. Consolidates `CBW-SITE-DESIGN-SYSTEM-004-CURRENT-STATE`. Date: 2026-07-20.*
