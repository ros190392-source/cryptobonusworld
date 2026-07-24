# CBW KZ × MEXC P0-B — Canonical Write Authorization (v1)

- **Decision ID:** `CBW-KZ-MEXC-P0B-CANONICAL-WRITE-AUTHORIZATION-v1`
- **Task:** `CBW-KZ-MEXC-P0-B-CANONICAL-WRITE-AUTHORIZATION-007B` · **Issue:** #15 · **Resolver:** #10
- **Baseline HEAD:** `d550b43b29871169f4087c75ee2af4289a66c894`
- **Mode:** OWNER_AUTHORIZATION_DECISION_RECORD_ONLY · **Status:** OWNER_AUTHORIZED_CANONICAL_RESEARCH_WRITE
- **Country/Exchange/Batch:** KZ / mexc / KZ-P0-B · **Package:** RECOVERED / UNVERIFIED

## Scope

Records explicit owner authorization for a **future deterministic atomic first-write** of the six-file **non-production** canonical research package for KZ × MEXC. This record **performs no write** and creates no canonical file, importer, adapter, registry, index, page, route or deploy artifact. The write is a separate task: `CBW-KZ-MEXC-P0-B-CANONICAL-IMPORT-007`.

## Lineage

- Staging import: PR #9, head `96d688d4e814f25f1be5f8ef542bfbe3f604c026`, merge `40b68632b9a41118035430cf0fd4e5569f1cd8e0`
- EOL prerequisite: PR #12, merge `a88ed799fb5c12de1e7f0f2424b2b4df0ac1aba1`
- Canonical paths + import prep + previews: PR #14, head `b604168829357688a8d6651daf743d0f35826a7f`, merge `d550b43b29871169f4087c75ee2af4289a66c894`

## Authorized future paths (atomic six-file, first write only, no overwrite)

1. `data/market-intelligence/cells/by-country/kz/mexc.json`
2. `data/market-intelligence/sources/by-country/kz/mexc.json`
3. `data/market-intelligence/linkages/by-country/kz/mexc.json`
4. `data/market-intelligence/provenance/by-country/kz/mexc.json`
5. `data/market-intelligence/conflicts/by-country/kz/mexc.json`
6. `data/market-intelligence/bindings/by-country/kz/mexc.json`

## Authorization matrix

**Set true (future non-production storage only):** `canonicalResearchStorageEligible`, `canonicalImportAuthorized`, `canonicalCellWriteAuthorized`, `canonicalSourcesWriteAuthorized`, `canonicalLinkagesWriteAuthorized`, `canonicalProvenanceWriteAuthorized`, `canonicalConflictsWriteAuthorized`, `miGeoBindingWriteAuthorized`.

**Kept false:** `miGeoBindingActivationAuthorized`, `productionChangeAuthorized`, `productionIntegrationAuthorized`, `legacyGeoReplacementAuthorized`, `publicationAuthorized`, `rankingEligibilityAuthorized`, `ctaEligibilityAuthorized`, `promoEligibilityAuthorized`, `affiliateRoutingActivationAuthorized`, `pageOrRouteChangeAuthorized`, `migration5Authorized`, `deployAuthorized`.

Canonical research storage is **not** publication and **not** production activation.

## Transformation contract

- **Cell:** exact value equality with `canonical-preview/exchange-market-cell.preview.json` (hence staging candidate `.cell`); no `candidateMetadata`; preserve RESTRICTED / HIGH / UNDER_REVIEW / NOT_LIVE_VERIFIED; preserve all 13 product statuses, 16 sourceIds, 7 conflictIds, 7 reasonCodes, 5 limitations; ranking/CTA/promo eligibility false.
- **Sources:** envelope; exactly 16 records; ACTIVE 15 / STALE 1; sort by sourceId; zero duplicates; each validates `market-source.schema.json`.
- **Linkages:** envelope; exactly 55 links (41 SUPPORTS / 14 CONTRADICTS); sort by linkId; zero duplicate triples; all references resolve.
- **Conflicts:** envelope; exactly 7; sort by conflictId; all `ownerReviewRequired=true`; no auto-resolution; preserve reviewed sources, affected claims, assessments and unresolved evidence.
- **Provenance:** preserve RECOVERED/UNVERIFIED, NOT_LIVE_VERIFIED, recovered ZIP `f7658b5f…` (27833 B), unavailable original `3f0e10d2…` (37001 B), staging PR #9 head/merge, EOL PR #12 merge, owner-decisions PR #14 head/merge, source/claim confidence, 15 correction-required claims, terms-page-flip monitoring, every withheld authorization; nothing silently discarded.
- **Binding:** direct `mi-geo-binding.schema.json` instance built from the merged binding preview, with exactly **one** canonicalization change — `miCellRef` becomes `data/market-intelligence/cells/by-country/kz/mexc.json`. All other fields equivalent to the preview (`bind-kz-mexc`, GEO_LEGACY, `legacyGeoPassportRef` mexc passport, `deepPassportRef` null, MIGRATION_4, complete ownership, eligibility RESTRICTED with ranking/CTA/promo false and `affiliateInfluencesRanking` false, conflict OFFICIAL_SOURCES_DISAGREE → OWNER_REVIEW_REQUIRED, CTA/ranking suppressed, `productionRouteUnchanged` true inside `conflictResolution`, NOT_LIVE_VERIFIED, `productionStable` true, `ownerApproved` false, `reviewStatus` PROPOSED). No schema-unsupported fields (`active`, `promoSuppressed`, `existingGeoRemainsProductionTruth`, or top-level `productionRouteUnchanged`).

## Atomic write contract (future implementation)

1. Generate all six outputs in an OS temp dir outside every repository.
2. Validate all six before touching canonical paths.
3. Confirm all six target files are absent.
4. Refuse any overwrite.
5. Create all six as one controlled first-write.
6. On any failure, remove every file created by that execution.
7. Leave no partial package.
8. Revalidate all six after promotion.
9. Verify the exact file-level untracked set remains unchanged.
10. Open one PR; no merge or deploy inside the executor.

**Future implementation create scope:** `owner-ops/ai-ops/tasks/CBW-KZ-MEXC-P0-B-CANONICAL-IMPORT-007.json`, `scripts/market-intelligence/promote-kz-mexc-p0b-canonical.mjs`, plus the six canonical files. No existing tracked file modified.

## Separation

No production consumer reads `data/market-intelligence/cells/**`; current production truth remains `research/geo/kazakhstan/exchanges/mexc.json` + `src/data/geoRankings.ts`. No automatic synchronization; no silent overwrite of legacy GEO.

## Next task

`CBW-KZ-MEXC-P0-B-CANONICAL-IMPORT-007`.
