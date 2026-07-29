# CBW Implementation Roadmap V1

> Architecture standard: bounded, owner-gated phases. Non-production. **Owner Audit Correction 026:**
> every phase lists all nine labelled contract fields; a separately governed capture Phase 2b writes
> the eleven files before source-truth review. Back to
> [master system](./CBW_CONTINUOUS_EXCHANGE_MARKET_INTELLIGENCE_SYSTEM_V1.md).

Each phase contains all nine fields: **Objective · Prerequisites · Entry criteria · Allowed writes ·
Deliverables · Exit criteria · Owner gates · Non-goals · Rollback / stop rule**. Phases are ordered;
no phase begins before the prior phase's exit criteria and owner gate are met.

**Anti-sprawl rule.** No new open-ended infrastructure cycle begins before the Binance × Kazakhstan
vertical slice (through Phase 9) produces visible, owner-approved value.

## Phase 1 — Architecture freeze
- **Objective:** freeze these standards/models.
- **Prerequisites:** Corrections 021/022 on `main`; pilot PR #69 PREPARED; audit correction 026 applied.
- **Entry criteria:** owner authorization 025/026.
- **Allowed writes:** this package only (15 artifacts + 2 result records).
- **Deliverables:** approved architecture package.
- **Exit criteria:** owner approval of this package.
- **Owner gates:** architecture approval.
- **Non-goals:** any runtime code.
- **Rollback / stop rule:** if the package cannot be completed within 15+2 files, return BLOCKED.

## Phase 2 — Binance × Kazakhstan Deep Research (inline envelope only)
- **Objective:** run subscription Deep Research and emit one complete inline `CBW_HANDOFF_ENVELOPE_V1`.
- **Prerequisites:** Phase 1 approved.
- **Entry criteria:** separate owner authorization to execute Deep Research.
- **Allowed writes:** **none in the repository** (Deep Research emits the inline envelope only).
- **Deliverables:** complete inline eleven-file envelope with per-file SHA-256 and byte size.
- **Exit criteria:** envelope complete, all JSON parse inline, all IDs/refs resolve.
- **Owner gates:** none for capture of research; publication remains gated later.
- **Non-goals:** writing repository files; publishing; account testing.
- **Rollback / stop rule:** stop on unresolved critical conflict (`CONFLICT_UNRESOLVED`).

## Phase 2b — Governed capture (separate authorized step)
- **Objective:** write the exact eleven files from the validated envelope into the pilot `20-research-output/`.
- **Prerequisites:** Phase 2 envelope; separate capture authorization.
- **Entry criteria:** envelope validates against the Factory package shape.
- **Allowed writes:** the pilot task's eleven `20-research-output/` files only.
- **Deliverables:** eleven files written; `researchops validate` VALID.
- **Exit criteria:** package validates; hashes match the envelope.
- **Owner gates:** capture authorization.
- **Non-goals:** publishing; editing the immutable prompt.
- **Rollback / stop rule:** stop if any file hash/byte size mismatches the envelope.

## Phase 3 — Source-truth review and correction
- **Objective:** review and correct captured claims.
- **Prerequisites:** valid Phase 2b capture.
- **Entry criteria:** package VALID.
- **Allowed writes:** review/correction layers of the pilot task.
- **Deliverables:** source-truth review + corrections.
- **Exit criteria:** validation VALID after correction.
- **Owner gates:** none; still non-production.
- **Non-goals:** publishing.
- **Rollback / stop rule:** stop on unresolved critical conflict.

## Phase 4 — Canonical non-production Market Passport snapshot
- **Objective:** materialize a non-production passport from validated claims.
- **Prerequisites:** Phase 3 exit.
- **Entry criteria:** corrected claims available.
- **Allowed writes:** non-production canonical store fixtures only.
- **Deliverables:** passport rendered from claims with freshness/verification indicators.
- **Exit criteria:** passport reproducible from claims.
- **Owner gates:** factual review.
- **Non-goals:** live pages, CTAs, rankings.
- **Rollback / stop rule:** stop if claims cannot render without unbound facts.

## Phase 5 — Affiliate L1–L3 verification (real public campaign)
- **Objective:** anonymous public verification of the **real owner-approved** affiliate offer.
- **Prerequisites:** Phase 4 exit; owner-approved campaign identity.
- **Entry criteria:** campaign registered.
- **Allowed writes:** affiliate evidence records (non-production).
- **Deliverables:** offer at `L3_TERMS_ELIGIBLE` or a documented lower level with limitations.
- **Exit criteria:** public evidence captured with hashes and classification `PUBLIC_OBSERVED`.
- **Owner gates:** any CTA enablement; **L4 requires a separate authorization**.
- **Non-goals:** **account creation/submission, login, proxy, fake identity, unauthorized L4 testing**
  (observing the real public campaign URL/code/offer is in-scope, not a non-goal).
- **Rollback / stop rule:** stop if verification would require an account or prohibited action.

## Phase 6 — Monitoring registry + one read-only watcher
- **Objective:** register the pilot's sources and run exactly one read-only watcher.
- **Prerequisites:** Phase 5 exit.
- **Entry criteria:** sources registered with SLA policy.
- **Allowed writes:** source registry + monitoring records.
- **Deliverables:** one watcher producing snapshots and `SnapshotChange` records.
- **Exit criteria:** watcher runs read-only with no production writes.
- **Owner gates:** none (read-only).
- **Non-goals:** fan-out to production; multiple watchers.
- **Rollback / stop rule:** stop if a source requires blocked/robots-disallowed access.

## Phase 7 — Publication bindings + preview-only page/card generation
- **Objective:** bind claims to a preview passport page and Top-10 card.
- **Prerequisites:** Phase 6 exit.
- **Entry criteria:** claims and bindings available.
- **Allowed writes:** publication bindings + preview artifacts (non-production).
- **Deliverables:** preview page + card rendered from bindings.
- **Exit criteria:** preview renders; no live route change.
- **Owner gates:** none (preview only).
- **Non-goals:** publishing; sitemap/indexability changes.
- **Rollback / stop rule:** stop if a binding would touch a live route.

## Phase 8 — Owner factual / visual approval
- **Objective:** owner reviews previews for factual and visual correctness.
- **Prerequisites:** Phase 7 previews.
- **Entry criteria:** previews complete.
- **Allowed writes:** governance approval receipt only.
- **Deliverables:** recorded owner approval.
- **Exit criteria:** explicit owner approval recorded.
- **Owner gates:** **mandatory** — the publication authorization gate.
- **Non-goals:** publishing before approval.
- **Rollback / stop rule:** stop if owner withholds approval.

## Phase 9 — Controlled publication
- **Objective:** publish the approved pilot passport + card.
- **Prerequisites:** Phase 8 approval + explicit publication authorization.
- **Entry criteria:** owner approval recorded.
- **Allowed writes:** owner-approved production binding only.
- **Deliverables:** live-verified publication with a rollback target.
- **Exit criteria:** `LIVE_VERIFY` MATCH; outcome `PUBLISHED`.
- **Owner gates:** publication, CTA enable, ranking/Top-10, structured data — each separately gated.
- **Non-goals:** unrelated production changes.
- **Rollback / stop rule:** `LIVE_VERIFY` `MISMATCH` → rollback → `ROLLED_BACK`.

## Phase 10 — Kazakhstan Top-10 expansion
- **Objective:** extend to the Kazakhstan Top-10 exchanges.
- **Prerequisites:** Phase 9 delivered visible value.
- **Entry criteria:** pilot published and stable.
- **Allowed writes:** new market profiles + bindings (owner-gated publication).
- **Deliverables:** additional market passports.
- **Exit criteria:** each new market published under its own gate.
- **Owner gates:** each ranking/Top-10 change.
- **Non-goals:** second country until scalability proven.
- **Rollback / stop rule:** stop if a market cannot be evidenced.

## Phase 11 — Second-country scalability proof
- **Objective:** prove the model scales by adding one more country via dependency edges, not global
  fact duplication.
- **Prerequisites:** Phase 10 delivered.
- **Entry criteria:** stable Kazakhstan slice.
- **Allowed writes:** a second country's market profiles + dependency edges.
- **Deliverables:** a second market profile reusing exchange cores with no duplicated global facts.
- **Exit criteria:** no global-fact duplication detected.
- **Owner gates:** publication for the new country.
- **Non-goals:** open-ended platform expansion.
- **Rollback / stop rule:** stop if scaling requires duplicating global facts.

## Global non-goals and stop rules

No phase authorizes `master`, deploy, import, promo, affiliate-route change, sitemap, indexability or
`MIGRATION_5` without an explicit, separate owner authorization. Any phase that cannot meet its exit
criteria stops and reports rather than broadening scope.
