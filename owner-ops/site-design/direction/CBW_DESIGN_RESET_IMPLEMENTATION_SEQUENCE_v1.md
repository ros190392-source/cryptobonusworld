# CBW Design Reset — Implementation Sequence v1

- Task: CBW-UNIFIED-SITE-DESIGN-RESET-001 · 2026-07-22
- Status: **OWNER_APPROVED_UNIFIED_DESIGN_DIRECTION** — approved by the owner
  (CBW-UNIFIED-SITE-DESIGN-RESET-001-COMMIT, 2026-07-22) ·
  `foundationFirstRequired: true` · next task: **CBW-DESIGN-FOUNDATION-PROTOTYPE-001**
- Scope: prototyping order **inside the design worktree only** — no production
  changes, no merges, no deploys, no canonical MI binding at any step. Each step
  is a separately owner-gated task with its own report and commit decision.

## Step 1 — CBW-DESIGN-FOUNDATION-PROTOTYPE-001  ⟵ recommended next task

**Owner-recorded environment and boundary for this next task** (created only by
that task, not before): clean separate worktree
`C:\projects\CryptoBonusWorld-design-v2`, branch `feat/cbw-unified-design-v2`,
starting from the committed unified reset direction. It must build an isolated
noindex foundation specimen implementing Logo Slot System v2, the OfferSurface
prototype family and the section grammar — mock data only, repository assets
only, no real affiliate navigation, production untouched, and it remains
uncommitted until owner visual review.

Build the shared foundation everything else consumes:

- **Logo-Slot System v2**: `logo-slot-registry.ts` (measured content boxes, AR
  classes, optical nudges), `LogoSlot.astro` (5 slot sizes × light/dark wells,
  lockup fallback), specimen page at `/__design/foundation/` rendering every
  repository identity in every slot.
- **OfferSurface family**: one state machine + the 5 variants (`HERO_FULL`,
  `COMPACT_BOTTOM`, `RANKING_ROW`, `COMPARISON_CELL`, `RESTRICTED_NOTICE`),
  refactoring the proven ExchangeOfferBlock/ExchangeRankingRow logic into the
  unified family without changing state behavior.
- **Section grammar**: section header (kicker/h2/support), band system
  (navy / light / light-alt / navy-tint), shared card grammar.
- Playwright gates: logo-slot fill band + no-distortion; state rules per variant.

Exit: specimen page + all-pass gates → owner review of the foundation.

## Step 2 — CBW-HOMEPAGE-V2-PROTOTYPE-001

Rebuild `/__design/homepage-template/` (or `/__design/homepage-v2/`) per
`CBW_HOMEPAGE_V2_DESIGN_PLAN_v1` on the Step-1 foundation: S1–S9 section order,
country intelligence switcher, 3 scenarios, first-screen matrix all-pass,
screenshots + preview notes. Exit: owner review.

## Step 3 — CBW-EXCHANGE-REVIEW-V2-ALIGNMENT-001

Realign the approved review template to the unified language: top block →
`HERO_FULL` (XL slot), bottom block → `COMPACT_BOTTOM` (L slot), section
grammar/bands for article, tables, facts. Commercial logic and first-screen
behavior unchanged — this is a visual-system alignment, re-validated by the
existing review-template gates. Exit: owner review.

## Step 4 — CBW-COUNTRY-PAGE-PROTOTYPE-001

First fully new family on the system: country hero + coverage stats,
country-filtered `RANKING_ROW` list, restricted section, methodology band.
Largely composition of Step-1/2 parts — this step proves the system scales.

## Step 5 — CBW-COMPARISON-PAGE-PROTOTYPE-001

`COMPARISON_CELL` variant + versus hero (two wells) + comparison table grammar.

## Step 6 — CBW-INFO-FAMILIES-PROTOTYPE-001

Directory, Guide, Restricted/Alternatives, Methodology families as one batch —
mostly section-library composition with the two remaining light variants
(dense directory rows, guide contextual `COMPACT_BOTTOM`).

## Step 7 — CBW-SITE-TEMPLATE-ARCHITECTURE-V2-AUTHORITY-001

Fold the validated system back into authority: revise
`CBW_SITE_TEMPLATE_ARCHITECTURE` to v2 (+ logo-slot standard as its own
authority file), promote on owner GO. Only after this does any
production-implementation planning start (separate future decision).

## Sequencing rules

- No step starts without explicit owner GO; every step ends with a stop-and-report.
- Steps 2–6 must not fork the foundation: changes to shared parts flow through
  Step-1 files, keeping one system.
- Commits remain per-task, owner-gated, on design branches only.
