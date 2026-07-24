# CBW KZ × MEXC P0-B — Canonical Import Prep Decision (v1)

- **Decision ID:** `CBW-KZ-MEXC-P0B-CANONICAL-IMPORT-PREP-v1`
- **Task:** `CBW-KZ-MEXC-P0-B-CANONICAL-OWNER-DECISIONS-007A` · **Issue:** #13
- **Baseline HEAD:** `a88ed799fb5c12de1e7f0f2424b2b4df0ac1aba1`
- **Mode:** IMPORT_PREPARATION_DECISION_RECORD_ONLY · **Status:** OWNER_APPROVED_NON_CANONICAL_PREVIEWS
- **Package:** RECOVERED / UNVERIFIED · **Path decision:** `CBW-KZ-MEXC-P0B-CANONICAL-PATHS-OWNER-DECISION-v1`

## Scope

Approves the two **non-canonical previews** as accurate projections of the tracked KZ × MEXC P0-B staging package. Grants **no** canonical-import authorization and performs **no** write.

## Cell preview

`research/market-intelligence/staging/kz/mexc/p0b-v1/canonical-preview/exchange-market-cell.preview.json`

- Exact extraction of `exchange-market-cell.candidate.json#/cell`; only `candidateMetadata` dropped; **no factual value changed** (`cellPreviewEqualsCandidateCell = true`).
- Validates against `schemas/market-intelligence/exchange-market-cell.schema.json`.
- Preserves RESTRICTED / HIGH / UNDER_REVIEW / NOT_LIVE_VERIFIED; ranking/CTA/promo eligibility false; 16 sourceIds; 7 conflictIds.

## Binding preview (non-active)

`research/market-intelligence/staging/kz/mexc/p0b-v1/canonical-preview/mi-geo-binding.preview.json`

- Full `mi-geo-binding.schema.json` instance; `bind-kz-mexc`; `canonicalRecord = GEO_LEGACY`; `migrationPhase = MIGRATION_4`.
- `legacyGeoPassportRef = research/geo/kazakhstan/exchanges/mexc.json` (exists, read-only).
- `eligibility.availability = RESTRICTED`; ranking/CTA/promo false; `affiliateInfluencesRanking = false`.
- `conflictResolution`: OFFICIAL_SOURCES_DISAGREE → OWNER_REVIEW_REQUIRED; CTA & ranking suppressed; `productionRouteUnchanged = true`; notes preserve RECOVERED/UNVERIFIED, NOT_LIVE_VERIFIED and all 7 unresolved conflicts.
- `ownerApproved = false`; `reviewStatus = PROPOSED`; `productionStable = true`.
- No schema-unsupported fields (`active`, `promoSuppressed`, `existingGeoRemainsProductionTruth`) added.

## Conflict preservation

All 7 conflicts preserved and `ownerReviewRequired`; no auto-resolution.

## Authorization boundary (all withheld / false)

canonical import · canonical six-file write · binding write · binding activation · production integration · legacy-GEO replacement · publication · ranking / CTA / promo / affiliate activation · MIGRATION_5 · deploy.

## Next task

`CBW-KZ-MEXC-P0-B-CANONICAL-WRITE-AUTHORIZATION-007B`.
