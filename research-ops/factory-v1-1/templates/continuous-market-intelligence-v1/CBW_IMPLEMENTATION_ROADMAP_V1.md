# CBW Implementation Roadmap V1

> Architecture standard: bounded, owner-gated phases for the Binance × Kazakhstan vertical slice and
> beyond. Non-production. Back to [master system](./CBW_CONTINUOUS_EXCHANGE_MARKET_INTELLIGENCE_SYSTEM_V1.md).

Each phase lists **objective · allowed writes · prerequisites · entry criteria · deliverables · exit
criteria · owner gates · non-goals · rollback/stop rule**. Phases are strictly ordered; no phase
begins before the prior phase's exit criteria and owner gate are met.

**Anti-sprawl rule.** No new open-ended infrastructure cycle may begin before the Binance × Kazakhstan
vertical slice (through Phase 9) produces visible, owner-approved value.

## Phase 1 — Architecture freeze
- **Objective:** freeze these standards/models.
- **Allowed writes:** this package only (15 artifacts + 2 result records).
- **Prerequisites:** Corrections 021/022 on `main`; pilot PR #69 PREPARED.
- **Entry:** owner authorization 025.
- **Deliverables:** approved architecture package.
- **Exit:** owner approval of this package.
- **Owner gate:** architecture approval.
- **Non-goals:** any runtime code.
- **Rollback/stop:** if the package cannot be completed within the 15+2 files, return BLOCKED.

## Phase 2 — Binance × Kazakhstan Deep Research
- **Objective:** run the existing Factory V1.1 Deep Research for the pilot.
- **Allowed writes:** the pilot task's eleven-file package only.
- **Prerequisites:** Phase 1 approved.
- **Entry:** separate owner authorization to execute Deep Research.
- **Deliverables:** the eleven governed files, mapped per [the companion](./CBW_DEEP_RESEARCH_MARKET_PASSPORT_COMPANION_V1.md).
- **Exit:** package validates (`researchops validate`).
- **Owner gate:** none for research capture; publication remains gated later.
- **Non-goals:** publishing anything; extra package files.
- **Rollback/stop:** stop on unresolved critical conflict.

## Phase 3 — Source-truth review and correction
- **Objective:** review and correct captured claims.
- **Allowed writes:** review/correction layers of the pilot task.
- **Entry:** Phase 2 exit.
- **Deliverables:** source-truth review + corrections.
- **Exit:** validation VALID after correction.
- **Owner gate:** none; still non-production.

## Phase 4 — Canonical non-production Market Passport snapshot
- **Objective:** materialize a non-production `Exchange × Country` passport from validated claims.
- **Allowed writes:** non-production canonical store fixtures only.
- **Exit:** passport renders from claims with freshness/evidence indicators.
- **Owner gate:** factual review.
- **Non-goals:** live pages, CTAs, rankings.

## Phase 5 — Affiliate L1–L3 verification
- **Objective:** anonymous public verification of the pilot affiliate offer.
- **Allowed writes:** affiliate evidence records (non-production).
- **Entry:** Phase 4 exit.
- **Exit:** offer at `L3_TERMS_CONFIRMED` or a documented lower level with limitations.
- **Owner gate:** any CTA enablement; **L4 requires a separate authorization**.
- **Non-goals:** account creation, proxy, real codes.

## Phase 6 — Monitoring registry + one read-only watcher
- **Objective:** register the pilot's sources and run exactly one read-only watcher.
- **Allowed writes:** source registry + monitoring records.
- **Exit:** one watcher produces snapshots and `SnapshotChange` records with no writes to production.
- **Owner gate:** none (read-only).
- **Non-goals:** fan-out to production; multiple watchers.

## Phase 7 — Publication bindings + preview-only page/card generation
- **Objective:** bind claims to a preview passport page and Top-10 card.
- **Allowed writes:** publication bindings + preview artifacts (non-production).
- **Exit:** preview renders; no live route changes.
- **Owner gate:** none (preview only).
- **Non-goals:** publishing; sitemap/indexability changes.

## Phase 8 — Owner factual / visual approval
- **Objective:** owner reviews previews for factual and visual correctness.
- **Exit:** explicit owner approval recorded as a governance receipt.
- **Owner gate:** **mandatory** — this is the publication authorization gate.

## Phase 9 — Controlled publication
- **Objective:** publish the approved pilot passport + card.
- **Allowed writes:** owner-approved production binding only.
- **Entry:** Phase 8 owner approval + explicit publication authorization.
- **Exit:** live-verified publication with a rollback target.
- **Owner gate:** publication, CTA enable, ranking/Top-10, structured data — each separately gated.
- **Rollback/stop:** live-verification `MISMATCH` triggers rollback.

## Phase 10 — Kazakhstan Top-10 expansion
- **Objective:** extend to the Kazakhstan Top-10 exchanges.
- **Entry:** Phase 9 delivered visible value.
- **Owner gate:** each ranking/Top-10 change.
- **Non-goals:** second country until scalability is proven.

## Phase 11 — Second-country scalability proof
- **Objective:** prove the model scales by adding one more country via dependency edges, not global
  fact duplication.
- **Exit:** a second market profile reuses exchange cores with no duplicated global facts.
- **Owner gate:** publication for the new country.

## Global non-goals and stop rules
No phase authorizes `master`, deploy, import, promo, affiliate-route change, sitemap, indexability or
`MIGRATION_5` without an explicit, separate owner authorization. Any phase that cannot meet its exit
criteria stops and reports rather than broadening scope.
