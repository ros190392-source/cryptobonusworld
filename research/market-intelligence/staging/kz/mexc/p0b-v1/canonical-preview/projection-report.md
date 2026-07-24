# CBW KZ × MEXC P0-B — Canonical Projection Report (non-canonical preview)

- **Task:** `CBW-KZ-MEXC-P0-B-CANONICAL-OWNER-DECISIONS-007A`
- **Source Issue:** #13 · **Resolver:** #10 · **EOL prerequisite:** #11 / PR #12 (merged `a88ed799fb5c12de1e7f0f2424b2b4df0ac1aba1`)
- **Baseline HEAD:** `a88ed799fb5c12de1e7f0f2424b2b4df0ac1aba1`
- **Country/Exchange/Batch:** KZ / mexc / KZ-P0-B
- **Package status:** RECOVERED / UNVERIFIED · **Live verification:** NOT_LIVE_VERIFIED

This report describes two **non-canonical previews** assembled for owner review. It creates **no** canonical record and authorizes **no** production, publication, ranking, CTA, promo, affiliate, binding-activation, MIGRATION_5 or deploy action. The existing GEO passport `research/geo/kazakhstan/exchanges/mexc.json` remains production truth.

## Inputs (tracked staging package, read-only)

- `research/market-intelligence/staging/kz/mexc/p0b-v1/exchange-market-cell.candidate.json` (candidate, wrapped `{candidateMetadata, cell}`)
- `.../import-manifest.json`, `normalized-sources.json`, `claim-source-links.json`, `claim-review.json`, `qa-provenance.json`, `normalized-conflicts.json`, `transform-report.md`
- Importer: `scripts/market-intelligence/import-kz-mexc-p0b.mjs`
- Manifest posture (verified): 16 sources, 24 claim reviews, 15 correction-required, 7 conflicts (all `ownerReviewRequired`), 55 links (41 SUPPORTS / 14 CONTRADICTS).

## Cell preview

`exchange-market-cell.preview.json` is an **exact extraction** of `exchange-market-cell.candidate.json#/cell`. Only the wrapper key `candidateMetadata` was dropped; **no factual value was changed**. It validates against `schemas/market-intelligence/exchange-market-cell.schema.json`.

Preserved verbatim:

- `overallAvailability`: RESTRICTED · `registrationStatus`: RESTRICTED
- `confidence`: HIGH · `freshness`: UNDER_REVIEW · `liveVerificationState`: NOT_LIVE_VERIFIED
- `rankingEligibility`: false · `ctaEligibility`: false · `promoEligibility`: false
- 13 product statuses (incl. CONFLICTING `p2p`/`kzt_p2p`/`mobile_application`/`earn`, UNKNOWN direct KZT rails, UNAVAILABLE `bank_card_purchase`, `copy_trading` RESTRICTED_WITH_PRODUCT_DETAIL_UNVERIFIED)
- 16 `sourceIds`, 7 `conflictIds`, 7 `reasonCodes`, 5 `limitations`, empty `alternativeExchangeIds`.

## Binding preview (non-active)

`mi-geo-binding.preview.json` is a full instance of `schemas/market-intelligence/mi-geo-binding.schema.json`, **non-active**:

- `bindingId`: bind-kz-mexc · `canonicalRecord`: GEO_LEGACY · `migrationPhase`: MIGRATION_4
- `miCellRef`: the cell preview path plus the future canonical cell path
- `legacyGeoPassportRef`: `research/geo/kazakhstan/exchanges/mexc.json` (read-only; never overwritten) · `deepPassportRef`: null
- `ownership`: mirrors the valid Bybit precedent (one owner per field)
- `eligibility`: availability RESTRICTED; ranking/CTA/promo eligibility false; `affiliateInfluencesRanking` false
- `conflictResolution`: case OFFICIAL_SOURCES_DISAGREE, outcome OWNER_REVIEW_REQUIRED, `ctaSuppressed`/`rankingSuppressed` true, `productionRouteUnchanged` true, notes preserving RECOVERED/UNVERIFIED, NOT_LIVE_VERIFIED and all 7 unresolved conflicts
- `liveVerificationState`: NOT_LIVE_VERIFIED · `productionStable`: true · `ownerApproved`: false · `reviewStatus`: PROPOSED

No schema-unsupported field was added (no top-level `active`, `promoSuppressed`, or `existingGeoRemainsProductionTruth`).

## Future canonical package (approved paths only — NOT written here)

Atomic all-six-or-none, first-write-only, non-production:

1. `data/market-intelligence/cells/by-country/kz/mexc.json`
2. `data/market-intelligence/sources/by-country/kz/mexc.json`
3. `data/market-intelligence/linkages/by-country/kz/mexc.json`
4. `data/market-intelligence/provenance/by-country/kz/mexc.json`
5. `data/market-intelligence/conflicts/by-country/kz/mexc.json`
6. `data/market-intelligence/bindings/by-country/kz/mexc.json`

No duplicate under `cells/by-exchange/**`; no generated index in this phase; no runtime consumer reads these paths automatically.

## Authorization boundary (all withheld)

canonical six-file write, binding activation, production integration, legacy-GEO replacement, publication, ranking/CTA/promo/affiliate activation, MIGRATION_5 and deploy all remain **false / owner-gated**. The canonical write is a separate task: `CBW-KZ-MEXC-P0-B-CANONICAL-WRITE-AUTHORIZATION-007B`.
