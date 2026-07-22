# CBW Unified Design Direction v1

- Task: CBW-UNIFIED-SITE-DESIGN-RESET-001 · 2026-07-22
- Status: **OWNER_APPROVED_UNIFIED_DESIGN_DIRECTION** — this direction was explicitly
  approved by the owner (CBW-UNIFIED-SITE-DESIGN-RESET-001-COMMIT, 2026-07-22)
- Worktree: `C:\projects\CryptoBonusWorld-design` · branch `feat/cbw-homepage-template-v1` @ `b664682`
- Supersession model: this direction **extends and re-frames** — it does not revoke —
  `CBW_FIRST_SCREEN_CONVERSION_STANDARD_v1` (remains absolute) and
  `CBW_SITE_TEMPLATE_ARCHITECTURE_v1` (page families remain; composition language is reset).

## 0. Design reset decision

CryptoBonusWorld moves from "pages that share tokens" to **one platform system**:
every page is composed from the same section grammar, the same offer-surface family,
and the same logo-slot system. Nothing about eligibility logic, evidence boundaries,
or the first-screen conversion rule changes. What changes is that layout, hierarchy,
and section design stop being invented per page.

**Preserved as foundation (owner decision):**
- top hero offer block + bottom compact offer block (exchange review)
- first-screen conversion rule (desktop + mobile, all commercial surfaces)
- evidence / eligibility boundaries (canonical MI decides; design never decides)
- CBW tokens: navy `#080F18`/`#13233E`, amber `#F7931A`, green CTA `#16A34A`,
  gray scale, Inter + Barlow Condensed

**Reset (rebuilt from scratch under this direction):**
- homepage composition (no plain-list homepage, no flag-grid country browsing)
- section design language across all families
- logo-slot fitting system (see `CBW_LOGO_SLOT_UPGRADE_PROPOSAL_v1.md`)
- page-family visual variance (reduced to controlled variants of one system)

## 1. Visual language

- **Navy-anchored intelligence platform.** Navy bands (`#080F18` → `#13233E` gradient
  surfaces) open every page and carry "system" sections (verification, methodology).
  Content lives on light surfaces. The alternation navy → light → navy-tint → light
  is the site's visual signature.
- **Color is semantic, never decorative.**
  - Amber — ranking, emphasis, brand accents, focus outlines. Never a CTA color.
  - Green — exclusively permitted commercial actions (Copy / Claim). If green
    appears, the state allows registration; restricted/unknown surfaces contain zero green.
  - Red — restricted status only. Gray — under-review / evidence-pending only.
  - Blue-tint info surfaces — coverage/transparency notices only.
- **Rectangular wordmark wells** are the universal exchange identity device
  (light well for dark marks, navy well for light marks) — never square crops,
  never raw logos on arbitrary backgrounds. Governed by the logo-slot system.
- **Typography:** Barlow Condensed for display (hero H1, section kickers, rank
  numerals), Inter for everything else. Promo codes in the condensed mono-like
  treatment already proven in the prototypes.
- **Texture discipline:** flat surfaces, 1px borders, soft shadows only on
  commercial cards; no gradients except navy hero bands; no stock imagery,
  no illustration sets, no emoji in production surfaces (🧪 remains a
  preview-only marker).

## 2. Layout language

- Max content width **1160px**, 12-column mental grid, 24px gutters desktop /
  16px mobile.
- **Section rhythm:** every section = `kicker (condensed, amber, uppercase, 12px)`
  → `h2 (28–32px)` → optional one-line support sentence → body. Vertical padding
  64px desktop / 40px mobile between sections; no section invents its own header style.
- **Band system:** each section declares a surface — `navy`, `light`, `light-alt`
  (gray-50), or `navy-tint`. Adjacent sections never repeat the same non-light band.
- Cards share one grammar: radius `--cbw-r-md`, 1px border, identical padding scale;
  commercial cards additionally carry the card shadow.

## 3. Hierarchy (every page, same skeleton)

1. **Hero band (navy)** — identity + value + state context; compact by default
   (first-screen budget is owned by commerce, not by the hero).
2. **Primary commercial surface** — the family's offer variant, first-screen
   compliant whenever state allows.
3. **Intelligence sections** — evidence, verification, comparison, education.
4. **Conversion recap** — compact re-offer before the footer (permitted states only).
5. **Footer** (unchanged production component family).

## 4. Offer system — the OfferSurface family (base design primitive)

One component family, **one state machine, five layout variants**. State logic,
badges, code+Copy, CTA authorization, and notes are written once; a variant is
layout only and can never override state rules.

| Variant | Use | Layout essence |
|---|---|---|
| `HERO_FULL` | review top block | full-width band: wordmark well XL, bonus headline, code+Copy, CTA, terms note |
| `COMPACT_BOTTOM` | review/guide bottom block | single-row compact: well M, code+Copy, CTA |
| `RANKING_ROW` | homepage / country / directory rows | rank · well M · name+status · reason · code+Copy · CTA · note |
| `COMPARISON_CELL` | comparison tables | well S + status + code+Copy + CTA stacked in a column cell |
| `RESTRICTED_NOTICE` | restricted / under-review surfaces | well S grayscale-allowed, status badge, explanation, **informational actions only** |

State rules (unchanged, absolute): `AVAILABLE` → full commercial controls;
`AVAILABLE_WITH_LIMITS` (+refCompat verified) → full controls + limit chip;
`RESTRICTED` / `UNKNOWN-UNDER_REVIEW` → **no claim/registration/affiliate-style
CTA in any variant**, informational actions only (View Alternatives / View Details).
First-screen rule applies to whichever variant is the page's primary commercial surface.

## 5. Logo-slot rules

Authoritative in `CBW_LOGO_SLOT_UPGRADE_PROPOSAL_v1.md`. Summary: per-asset
measured content boxes; aspect-ratio classes (COMPACT / WIDE / ULTRA-WIDE);
height-first optical normalization with fill targets; reduced slot side padding;
lockup fallback for missing/ultra-wide marks; never stretch, clip, or recolor.

## 6. Homepage concept

Authoritative in `CBW_HOMEPAGE_V2_DESIGN_PLAN_v1.md`. Summary: navy hero with
country intelligence control (search-select, no flag grid), Top-ranking rows as
the first commercial area (first-screen compliant), verification system band,
region-grouped country browsing, reviews/guides/coverage sections, separated
restricted section, conversion recap. The homepage is the front door of the
platform, not a list.

## 7. Page-family direction (8 families, one system)

Every family = hero-band variant + primary offer variant + a stack picked from
the **shared section library** (verification band, coverage notice, country
browser, review cards, guide cards, comparison table, FAQ, restricted section,
conversion recap). No family introduces private section styles.

| Family | Hero band | Primary commercial surface |
|---|---|---|
| Homepage | platform hero + country control | `RANKING_ROW` list (Top-3 desktop / Top-2 mobile first screen) |
| Country page | country hero (name, coverage stats) | `RANKING_ROW` list, country-filtered |
| Exchange review | exchange hero | `HERO_FULL` top + `COMPACT_BOTTOM` end (principle preserved) |
| Comparison | versus hero (two wells) | `COMPARISON_CELL` columns |
| Directory | directory hero + filters | `RANKING_ROW` (dense) or `RESTRICTED_NOTICE` per state |
| Guide | editorial hero | `COMPACT_BOTTOM` contextual (permitted states only) |
| Restricted / alternatives | status hero (red-accented, no green) | `RESTRICTED_NOTICE` + alternatives as `RANKING_ROW` |
| Methodology | system hero (navy-tint) | none — zero commercial controls |

## 8. Design boundaries (unchanged, restated)

- Prototypes: mock data only, visibly marked; inert CTAs; no `/go/**`; no live
  affiliate navigation; noindex + sitemap-absent design routes; repository assets only.
- Canonical / staging MI is never bound to design prototypes.
- Design never decides eligibility; it renders decided state.
- Restricted/unknown states never receive commercial CTAs — no variant, no
  exception, no "coming soon" workaround.
- Global offers are never presented as locally eligible without evidence.
- Work happens only in the design worktree; no production, merge, or deploy.

## 9. Owner decisions & authorization (recorded 2026-07-22)

The owner approves the unified site design reset direction and rejects
continuation of the current homepage prototype as the final site design direction.

- `homepagePrototypeV1Status: SUPERSEDED_AS_DESIGN_DIRECTION_REFERENCE` ·
  `homepagePrototypeV1CommitAuthorized: false` ·
  `homepagePrototypeV1ProductionCandidate: false` — the uncommitted homepage
  prototype v1 remains historical visual evidence only.
- `exchangeReviewPrototypeCommercialPattern: APPROVED` ·
  `exchangeReviewPrototypeFinalSiteVisualAuthority: PARTIAL` — preserved as
  authority: top commercial offer block, compact bottom offer block, shared
  factual and authorization state, rectangular wordmark presentation,
  first-screen conversion behavior, restricted-state behavior. The review
  prototype is not automatically the final visual design of the site; it will
  later be aligned to the unified V2 foundation.
- `foundationFirstRequired: true` · `nextImplementationLayer: UNIFIED_DESIGN_FOUNDATION`
  — no page-family V2 prototype may become the new design authority before the
  foundation specimen is owner-reviewed.
- `logoSlotSystemV2Required: true` (principles per `CBW_LOGO_SLOT_UPGRADE_PROPOSAL_v1.md`).
- OfferSurface approved as the single shared future family (5 variants); layout
  may vary, facts and authorization logic may not.
- Site-wide visual system approved: premium crypto-intelligence platform
  positioning; dark navy platform surfaces; light analytical content surfaces;
  controlled orange brand accent; green only for authorized commercial actions;
  amber for explicit limitations; red for restrictions; neutral gray for
  unknown/under-review; unified section-header, card/row, spacing and container
  grammar; no private page-family visual language; no cheap flag-grid homepage;
  no oversized promotional cards that break first-screen conversion.
- Planned clean implementation environment (to be created **only** by the next
  task): `futureDesignWorktree: C:\projects\CryptoBonusWorld-design-v2` ·
  `futureDesignBranch: feat/cbw-unified-design-v2`.
- Authorization flags — true: `UNIFIED_DESIGN_DIRECTION_APPROVED`,
  `DESIGN_FOUNDATION_PROTOTYPE_AUTHORIZED`. False: `HOMEPAGE_V1_COMMIT_AUTHORIZED`,
  `PRODUCTION_MIGRATION_AUTHORIZED`, `PRODUCTION_PAGE_CHANGE_AUTHORIZED`,
  `PRODUCTION_COMPONENT_CHANGE_AUTHORIZED`, `PRODUCTION_DATA_BINDING_AUTHORIZED`,
  `CANONICAL_MI_BINDING_AUTHORIZED`, `AFFILIATE_ROUTE_ACTIVATION_AUTHORIZED`,
  `PUBLICATION_AUTHORIZED`, `MERGE_TO_MASTER_AUTHORIZED`, `DEPLOY_AUTHORIZED`.
- Next task: **CBW-DESIGN-FOUNDATION-PROTOTYPE-001**.
