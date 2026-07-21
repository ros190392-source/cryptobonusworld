# CBW — Kazakhstan × Bybit P0-A Canonical Storage Paths Owner Decision v1 (ARCHITECTURE ONLY)

| Field | Value |
|---|---|
| **Decision ID** | `CBW-KZ-BYBIT-P0A-CANONICAL-PATHS-OWNER-DECISION-v1` |
| **Task** | `CBW-KZ-BYBIT-P0A-CANONICAL-PATHS-OWNER-DECISION-005` |
| **Project** | CryptoBonusWorld · branch `master` · baseline HEAD `c65a5e658f2fd1d3bdfe8a0e0195977e690e7c03` |
| **Country × Exchange** | Kazakhstan (`KZ`) × Bybit · batch `KZ-P0-A` |
| **Mode** | Architecture decision record only (no commit/push/deploy; no directory or data file created) |
| **Date** | 2026-07-21 |
| **Package status** | RECOVERED / UNVERIFIED |

Companion machine-readable record: [CBW_KZ_BYBIT_P0A_CANONICAL_PATHS_OWNER_DECISION_v1.json](CBW_KZ_BYBIT_P0A_CANONICAL_PATHS_OWNER_DECISION_v1.json). **Path approval does not authorize file creation.** No `data/market-intelligence/` directory or record is created by this task.

## Recommendation: **APPROVE** (architecture only)
Resolves the two open authority gaps from the canonical-import-prep record (the `bindings/` sub-path and linkage/QA-provenance placement) by approving one deterministic `by-country/{cc}/{exchange}.json` convention across all six record types, an atomic six-file package rule, and a no-duplicate-truth boundary.

## 1. Files reviewed
Canonical import-prep decision (`…CANONICAL_IMPORT_PREP_v1.md/.json`); canonical previews (`exchange-market-cell.preview.json`, `mi-geo-binding.preview.json`, `projection-report.md`); committed staging records (manifest, normalized-sources, claim-source-links, qa-provenance, normalized-conflicts, candidate); owner decisions (owner-decision+import-prep, candidate-owner-review); authorities (MI Brain v1, MI↔GEO Reconciliation Standard v1); schemas (`exchange-market-cell`, `market-source`, `mi-geo-binding`, `restriction-event`); existing repo directory conventions (`data/`, `research/`, `owner-ops/`). None modified.

## 2. Files created (exactly two)
```
owner-ops/market-intelligence/decisions/CBW_KZ_BYBIT_P0A_CANONICAL_PATHS_OWNER_DECISION_v1.md
owner-ops/market-intelligence/decisions/CBW_KZ_BYBIT_P0A_CANONICAL_PATHS_OWNER_DECISION_v1.json
```

## 3. Canonical root — APPROVED
**`data/market-intelligence/`** — canonical research storage; non-production by default; not consumed by runtime until a separately approved integration; separate from legacy `research/geo/**` and from `src/**` production data. Creating records here must not automatically affect production availability, ranking, CTA, promo, affiliate routing, pages, or MIGRATION_5. (Authorities: MI Brain §2/§20; Reconciliation Standard §2.)

## 4. Exact six approved paths
General convention: `data/market-intelligence/{record}/by-country/{country-code-lowercase}/{exchange-slug}.json`.

| # | Record | Approved path | Schema / envelope |
|---|---|---|---|
| 1 | Canonical cell | `data/market-intelligence/cells/by-country/kz/bybit.json` | direct instance of `exchange-market-cell.schema.json` |
| 2 | Normalized sources | `data/market-intelligence/sources/by-country/kz/bybit.json` | envelope `{schemaVersion,countryCode,exchangeId,records[]}`; each `records[]` validates `market-source.schema.json` |
| 3 | Claim-source linkages | `data/market-intelligence/linkages/by-country/kz/bybit.json` | envelope `{…,links[]}` |
| 4 | QA / provenance | `data/market-intelligence/provenance/by-country/kz/bybit.json` | non-runtime research evidence |
| 5 | Normalized conflicts | `data/market-intelligence/conflicts/by-country/kz/bybit.json` | envelope `{…,conflicts[]}` |
| 6 | MI-GEO binding | `data/market-intelligence/bindings/by-country/kz/bybit.json` | direct instance of `mi-geo-binding.schema.json` (non-active) |

## 5. Package-envelope decisions
- **Cell** — single canonical path; **no** duplicate copy under `cells/by-exchange/**`; any future by-exchange view is a **generated index/lookup artifact, never competing truth**.
- **Sources** — `records` holds the **43** normalized sources; each item independently validates `market-source.schema.json`; sorted by `sourceId`; no duplicate IDs; the envelope is a storage wrapper, not a schema replacement; confidence/limitations stay in provenance (not forced into source records).
- **Linkages** — preserve all **77** links; sort by `linkId`; every `claimId`/`sourceId` resolves; relationships `SUPPORTS/LIMITS/CONTRADICTS/CONTEXT`; canonical relationship layer; does not influence production; **`supportedClaimIds` never returns to market-source records**.
- **Provenance** — must preserve package status RECOVERED/UNVERIFIED, original+recovered+source-truth hashes, staging import commit, owner-decision refs, source/claim confidence, limitations, `correctionRequired`, original+corrected claim text, `liveVerificationState`, unresolved evidence, entity/domain routing provenance, import history, canonical-import authorization state. **No provenance silently discarded.**
- **Conflicts** — preserve exactly `cf-kz-bybit-001` + `cf-kz-bybit-002`; both **PARTIALLY_RESOLVED**; sort by `conflictId`; preserve `routingMatrix`, reviewed sources, unresolved evidence, `ownerReviewRequired`; **never auto-resolve**; **not** a restriction-event file unless a record actually conforms to `restriction-event.schema.json` (do not force normalized conflicts into that schema).
- **Binding** — validates `mi-geo-binding.schema.json`; initial state **non-active**: `ownerApproved=false`, `reviewStatus=PROPOSED`, `canonicalRecord=GEO_LEGACY`, `productionStable=true`, `productionRouteUnchanged=true`, `migrationPhase=MIGRATION_4`, ranking/CTA/promo suppressed, `affiliateInfluencesRanking=false`, GEO remains production truth. Writing it later does **not** authorize activation.

### Path normalization rules
Lowercase ISO alpha-2 country dir (`kz`); lowercase exchange slug filename (`bybit.json`); forward-slash repo paths; **no** uppercase country dirs, spaces, duplicate orientation, symlinks, timestamp dirs, or version suffix — history via Git + provenance, never `bybit-v2.json`.

## 6. Atomic import decision
A future canonical import for one country × exchange cell is an **atomic six-file package** (the six paths in §4). The execute task must create **all six valid files or none** — no partial canonical package. On any output validation failure: **stop, write nothing, leave existing canonical data unchanged.**

## 7. No-duplicate-truth decision
- `data/market-intelligence/cells/by-country/**` = **future canonical MI truth**.
- `research/market-intelligence/staging/**` = **staging evidence**.
- `research/geo/**` = **legacy GEO production truth** (until migration).
- `src/data/geoRankings.ts` = **current production consumer**.
- No automatic synchronization yet; no canonical value may silently overwrite legacy GEO; discrepancies require explicit migration reports + owner decisions.

## 8. Canonical-vs-production separation (authorization flags)
| Flag | Value |
|---|---|
| canonicalResearchStorageEligible | **true** |
| canonicalImportAuthorized | false |
| miGeoBindingWriteAuthorized | false |
| miGeoBindingActivationAuthorized | false |
| productionChangeAuthorized | false |
| rankingEligibilityAuthorized | false |
| ctaEligibilityAuthorized | false |
| promoEligibilityAuthorized | false |
| migration5Authorized | false |

The path decision does not authorize file creation.

## 9. Bybit × Kazakhstan state (preserved)
overall **AVAILABLE_WITH_LIMITS** · confidence **MEDIUM** · liveVerificationState **NOT_LIVE_VERIFIED** · presentation **GREEN primary + AMBER secondary** · futureRankingCandidate **true** · rankingEligibility/ctaEligibility/promoEligibility **false** · package **RECOVERED / UNVERIFIED**. Not reinterpreted as restricted.

## 10. Next task
**`CBW-KZ-BYBIT-P0A-CANONICAL-IMPORT-EXECUTE-006`** — owner-gated deterministic write of the atomic six-file canonical package into `data/market-intelligence/` per these approved paths/contracts (all-or-none; each file schema-valid; binding non-active). Ranking/CTA/promo activation and MIGRATION_5 remain separate later owner-gated tasks.
