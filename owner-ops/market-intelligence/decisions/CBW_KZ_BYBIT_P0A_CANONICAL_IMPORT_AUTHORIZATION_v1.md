# CBW — Kazakhstan × Bybit P0-A Canonical Import Authorization v1 (AUTHORIZATION RECORD ONLY)

| Field | Value |
|---|---|
| **Decision ID** | `CBW-KZ-BYBIT-P0A-CANONICAL-IMPORT-AUTHORIZATION-v1` |
| **Task** | `CBW-KZ-BYBIT-P0A-CANONICAL-IMPORT-AUTHORIZATION-006` |
| **Project** | CryptoBonusWorld · branch `master` · baseline HEAD `59f96dc123e199d5331670e2cfc816a6ef7da1e6` |
| **Country × Exchange** | Kazakhstan (`KZ`) × Bybit · batch `KZ-P0-A` |
| **Mode** | Owner authorization decision record only (no commit/push/deploy; no write; no directory created) |
| **Date** | 2026-07-21 |
| **Package status** | RECOVERED / UNVERIFIED |

Companion machine-readable record: [CBW_KZ_BYBIT_P0A_CANONICAL_IMPORT_AUTHORIZATION_v1.json](CBW_KZ_BYBIT_P0A_CANONICAL_IMPORT_AUTHORIZATION_v1.json). **This record performs no write.** It authorizes only a future deterministic, atomic write of six non-production canonical research files.

## Recommendation: **APPROVE** (authorization only)
Grants the explicit owner authorization required before writing the Bybit × Kazakhstan canonical research package. It does **not** authorize production integration, legacy GEO replacement, ranking/CTA/promo/affiliate activation, MI-GEO binding activation, or MIGRATION_5.

## 1. Files reviewed
Canonical storage-path owner decision (`…CANONICAL_PATHS_OWNER_DECISION_v1.md/.json`, commit `59f96dc`); canonical import-prep (`…CANONICAL_IMPORT_PREP_v1.md/.json`); owner decisions (owner-decision+import-prep, candidate-owner-review); canonical previews (`exchange-market-cell.preview.json`, `mi-geo-binding.preview.json`, `projection-report.md`); committed staging package (manifest, normalized-sources, claim-source-links, qa-provenance, normalized-conflicts, candidate, transform-report); schemas (`exchange-market-cell`, `market-source`, `mi-geo-binding`) + authorities (MI Brain v1, MI↔GEO Reconciliation Standard v1); and — read-only for verification — `research/geo/kazakhstan/exchanges/bybit.json`, `src/data/geoRankings.ts`, `config/geo/kazakhstan.json`. None modified.

## 2. Files created (exactly two)
```
owner-ops/market-intelligence/decisions/CBW_KZ_BYBIT_P0A_CANONICAL_IMPORT_AUTHORIZATION_v1.md
owner-ops/market-intelligence/decisions/CBW_KZ_BYBIT_P0A_CANONICAL_IMPORT_AUTHORIZATION_v1.json
```

## 3. Canonical write authorization summary
A future deterministic, atomic write of the **six-file** canonical research package for KZ × bybit under `data/market-intelligence/` is **AUTHORIZED**. Non-production. This task **performs no write** and creates no directory. Bound to the approved paths/contracts in `CBW-KZ-BYBIT-P0A-CANONICAL-PATHS-OWNER-DECISION-v1` (commit `59f96dc`).

## 4. Exact six authorized paths
```
1. data/market-intelligence/cells/by-country/kz/bybit.json
2. data/market-intelligence/sources/by-country/kz/bybit.json
3. data/market-intelligence/linkages/by-country/kz/bybit.json
4. data/market-intelligence/provenance/by-country/kz/bybit.json
5. data/market-intelligence/conflicts/by-country/kz/bybit.json
6. data/market-intelligence/bindings/by-country/kz/bybit.json
```
**No other canonical path is authorized** — not `cells/by-exchange/**`, duplicate copies, generated indexes, production adapters, runtime consumers, or any legacy GEO change.

## 5. Atomic-write contract
All-or-none. The future execute task must: (1) generate all six outputs in an OS temp dir; (2) validate all six before touching canonical paths; (3) validate cell vs `exchange-market-cell.schema.json`, every source vs `market-source.schema.json`, binding vs `mi-geo-binding.schema.json`, plus source/link/conflict IDs+counts, package envelopes, provenance completeness; (4) confirm the canonical root and all six targets are **absent** before the first import; (5) **refuse overwrite** unless a separate future owner authorization permits replacement; (6) create the directory tree only after all temp outputs pass; (7) promote the six as one controlled operation; (8) on any final write failure **remove every file created, leave no partial package, report failure, don't touch staging/legacy GEO**; (9) re-validate the six files after writing; (10) no commit/push/deploy during execution unless separately authorized.

## 6. Binding-write vs activation decision
`miGeoBindingWriteAuthorized = **true**`, applying **only** to the approved **non-active** binding: `ownerApproved=false`, `reviewStatus=PROPOSED`, `canonicalRecord=GEO_LEGACY`, `productionStable=true`, `productionRouteUnchanged=true`, `migrationPhase=MIGRATION_4`, `affiliateInfluencesRanking=false`, ranking/CTA/promo suppressed, GEO remains production truth. **`miGeoBindingActivationAuthorized = false`** — writing the binding file must not activate it.

## 7. Canonical-vs-production separation
Canonical MI research truth = `data/market-intelligence/cells/by-country/**`; staging evidence = `research/market-intelligence/staging/**`; current production truth = `research/geo/**` + `src/data/geoRankings.ts`. No automatic synchronization; **no production consumer reads the canonical files yet**; no canonical value may silently overwrite legacy GEO; promotion to production requires a separate discrepancy review, owner decision, and MIGRATION_5 authorization.

## 8. All authorization flags
**Authorized (true):** `canonicalResearchStorageEligible` · `canonicalImportAuthorized` · `canonicalCellWriteAuthorized` · `canonicalSourcesWriteAuthorized` · `canonicalLinkagesWriteAuthorized` · `canonicalProvenanceWriteAuthorized` · `canonicalConflictsWriteAuthorized` · `miGeoBindingWriteAuthorized`.

**Must remain false:** `miGeoBindingActivationAuthorized` · `productionChangeAuthorized` · `productionIntegrationAuthorized` · `legacyGeoReplacementAuthorized` · `rankingEligibilityAuthorized` · `ctaEligibilityAuthorized` · `promoEligibilityAuthorized` · `affiliateRoutingActivationAuthorized` · `migration5Authorized` · `pageOrRouteChangeAuthorized` · `deployAuthorized`.

## 9. Preserved cell / product state
overall **AVAILABLE_WITH_LIMITS** · confidence **MEDIUM** · liveVerificationState **NOT_LIVE_VERIFIED** · rankingEligibility/ctaEligibility/promoEligibility **false** · presentation **GREEN primary + AMBER secondary** · futureRankingCandidate **true**. 13 product statuses unchanged: registration/kyc/derivatives/margin/p2p/direct_kzt_deposit/direct_kzt_withdrawal/bybit_card/promotions = AVAILABLE_WITH_LIMITS · spot/kzt_p2p = AVAILABLE · bank_card_purchase = CONFLICTING · referral = UNKNOWN. No upgrade/downgrade. Not reinterpreted as restricted.

**Offer boundaries:** up to **1,032 USDT** local referral program and separate **2,500 USDT** Kazakhstan campaign prize pool kept **separate**; neither is the global maximum; `globalReferralCodeCompatibility = UNVERIFIED`; promo + CTA remain false.

## 10. Corrections and conflicts
Four corrections preserved: `clm-kz-bybit-entity-003`, `clm-kz-bybit-registration-002`, `clm-kz-bybit-offer-001`, `clm-kz-bybit-offer-002`. Two conflicts preserved: `cf-kz-bybit-001` **PARTIALLY_RESOLVED** · `cf-kz-bybit-002` **PARTIALLY_RESOLVED** — neither auto-resolved.

**Provenance requirements:** the canonical provenance file must preserve RECOVERED/UNVERIFIED + NOT_LIVE_VERIFIED state, original/recovered/source-truth package hashes, staging import commit `1dfbadf…`, canonical path decision commit `59f96dc…`, all owner-decision refs, original+corrected claim text, source+claim confidence, limitations, unresolved evidence, entity/domain routing, this authorization reference, and every withheld production authorization. **No provenance silently discarded.**

## 11. Validation results (30/30)
Branch/HEAD match ✓ · path decision committed ✓ · `data/market-intelligence/` absent ✓ · six target paths recorded ✓ · atomic all-or-none ✓ · first-write no-overwrite ✓ · rollback-on-failure ✓ · `canonicalImportAuthorized=true` ✓ · six record-type write authorizations true ✓ · `miGeoBindingWriteAuthorized=true` ✓ · binding activation false ✓ · production integration false ✓ · legacy GEO replacement false ✓ · ranking/CTA/promo/affiliate/MIGRATION_5 false ✓ · RECOVERED/UNVERIFIED ✓ · MEDIUM ✓ · NOT_LIVE_VERIFIED ✓ · overall AVAILABLE_WITH_LIMITS ✓ · 13 statuses unchanged ✓ · 4 corrections ✓ · 2 conflicts PARTIALLY_RESOLVED ✓ · GEO production truth ✓ · MD/JSON agree ✓ · JSON parses ✓ · exactly two files ✓ · no production/runtime file changed ✓.

## 12. Next task
**`CBW-KZ-BYBIT-P0A-CANONICAL-IMPORT-EXECUTE-007`** — owner-gated deterministic execution of the atomic six-file write per this authorization + the canonical-paths decision (temp-generate → validate all six → confirm absence → promote as one operation → re-validate → rollback on any failure). Commit/push of the written package and any production/ranking/CTA/promo/MIGRATION_5 step remain separate later owner-gated tasks.
