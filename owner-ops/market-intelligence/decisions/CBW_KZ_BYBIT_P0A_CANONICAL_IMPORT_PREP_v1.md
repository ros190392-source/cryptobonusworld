# CBW — Kazakhstan × Bybit P0-A Canonical Import Preparation v1 (PREVIEW ONLY)

| Field | Value |
|---|---|
| **Decision ID** | `CBW-KZ-BYBIT-P0A-CANONICAL-IMPORT-PREP-v1` |
| **Task** | `CBW-KZ-BYBIT-P0A-CANONICAL-IMPORT-PREP-004` |
| **Project** | CryptoBonusWorld · branch `master` · source staging commit `1dfbadfb58ebc444fa502d1445f36745481723f7` |
| **Country × Exchange** | Kazakhstan (`KZ`) × Bybit · batch `KZ-P0-A` |
| **Mode** | Read-only architecture review + non-canonical preview outputs (no commit/push/deploy) |
| **Date** | 2026-07-21 |
| **Package status** | RECOVERED / UNVERIFIED |

Companion machine-readable record: [CBW_KZ_BYBIT_P0A_CANONICAL_IMPORT_PREP_v1.json](CBW_KZ_BYBIT_P0A_CANONICAL_IMPORT_PREP_v1.json). This record **prepares** a future canonical import; it does **not** grant canonical-import authorization.

## Overall recommendation: **APPROVE** (preparation only)
Staging re-verified (`--check` OK); the `candidate.cell` projects cleanly to a schema-valid canonical `exchange-market-cell` preview with **no semantic change**; a **non-active** `mi-geo-binding` preview validates against the committed schema. Canonical write, binding activation, production migration, ranking/CTA/promo, and MIGRATION_5 remain **blocked**.

## 1. Files reviewed
Committed staging import (script + 7 records @ `1dfbadf`), committed owner decisions (owner-decision+import-prep, candidate-owner-review), committed audits (source-truth-review, recovered-package), authorities (MI Brain v1, MI↔GEO Reconciliation Standard v1), schemas (`exchange-market-cell`, `market-source`, `mi-geo-binding`, `restriction-event`), and — read-only for comparison — `research/geo/kazakhstan/exchanges/bybit.json`, `config/geo/kazakhstan.json`, `src/data/geoRankings.ts`.

## 2. Files created (exactly five)
```
owner-ops/market-intelligence/decisions/CBW_KZ_BYBIT_P0A_CANONICAL_IMPORT_PREP_v1.md
owner-ops/market-intelligence/decisions/CBW_KZ_BYBIT_P0A_CANONICAL_IMPORT_PREP_v1.json
research/market-intelligence/staging/kz/bybit/p0a-v1/canonical-preview/exchange-market-cell.preview.json
research/market-intelligence/staging/kz/bybit/p0a-v1/canonical-preview/mi-geo-binding.preview.json
research/market-intelligence/staging/kz/bybit/p0a-v1/canonical-preview/projection-report.md
```

## 3. Staging integrity — PASS
`--check` = **CHECK OK** (inputs re-extracted to OS temp, hashes verified, extraction deleted). 43 sources · tiers **A 8 / B 32 / C 3** · 77 links · 4 correction claims · 2 PARTIALLY_RESOLVED conflicts · candidate keys exactly `[candidateMetadata, cell]` · `candidate.cell` structurally valid · 13 product statuses unchanged.

## 4. Canonical path discovery (proposed; none written)
Authorities: MI Brain §2/§20 (`data/market-intelligence/` tree) + Reconciliation Standard §2 (MI cell canonical; one binding per pair). `data/market-intelligence/` **does not exist**; **no** production consumer reads it (`src/**` has no MI reference).

| Record | Proposed canonical path | Precedent | Exists | Prod. consumer |
|---|---|---|---|---|
| Normalized market-sources | `data/market-intelligence/sources/` | MI Brain §2/§20 | no | none |
| Canonical MI cell | `data/market-intelligence/cells/by-country/kz/bybit.json` (mirror `cells/by-exchange/bybit/kz.json`) | MI Brain §2 | no | none |
| mi-geo-binding | `data/market-intelligence/bindings/bind-kz-bybit.json` | **derived** from `data/market-intelligence/` root — **no authority names a `bindings/` subdir** (owner confirm) | no | none |
| Linkage + QA provenance | conflicts → `data/market-intelligence/conflicts/`; linkage/QA → `sources/` or `provenance/` (owner confirm) | MI Brain §20 (conflicts only) | no | none |

Two **authority gaps** (bindings/, linkage-QA placement) require owner path confirmation before any canonical write.

## 5. exchange-market-cell preview — PASS
Projected from **`candidate.cell` only**: contains **no** `candidateMetadata` / staging-only fields; **byte-equal in meaning** to `candidate.cell`; structurally valid against the committed schema (`additionalProperties:false`). Preserves overall **AVAILABLE_WITH_LIMITS**, confidence **MEDIUM**, **NOT_LIVE_VERIFIED**, `rankingEligibility/ctaEligibility/promoEligibility = false`, conflict references, and all 13 product statuses. Confidence **not** upgraded; no conflict resolved; no status altered.

## 6. mi-geo-binding preview — CREATED (non-active)
The binding schema **can** represent a safe non-active preview, so a preview was created (not blocked): `canonicalRecord = GEO_LEGACY` (GEO remains canonical production truth), `productionStable = true` (schema const), `ownerApproved = false`, `reviewStatus = PROPOSED`, `migrationPhase = MIGRATION_4` (highest owner-approved phase; MIGRATION_5 not reached). `eligibility`: availability AVAILABLE_WITH_LIMITS, ranking/CTA/promo **false**, `affiliateInfluencesRanking = false`. `conflictResolution`: LIVE_VERIFICATION_UNAVAILABLE / OWNER_REVIEW_REQUIRED, CTA + ranking suppressed, production route unchanged. Ownership matches Reconciliation Standard §5. Validates structurally against the committed schema.

## 7. RECOVERED / UNVERIFIED assessment
RECOVERED/UNVERIFIED + NOT_LIVE_VERIFIED **do not prevent canonical research storage**; they constrain confidence and block production use. The six decisions are kept **distinct**:

| Decision | Result |
|---|---|
| 1 Canonical research storage | **PERMITTED_WITH_LIMITS** (research-layer record; MEDIUM confidence; explicit provenance; conflicts preserved; productionEligible false) |
| 2 Production eligibility | **false** |
| 3 Ranking eligibility | **false** |
| 4 CTA eligibility | **false** |
| 5 Promo eligibility | **false** |
| 6 MIGRATION_5 authorization | **false** |

## 8. Readiness
- **CANONICAL_CELL_CREATION_READINESS: READY_WITH_LIMITS** — may be stored as a canonical research record (RECOVERED/UNVERIFIED, NOT_LIVE_VERIFIED, conflicts preserved, not production), once the owner confirms canonical paths.
- **MI_GEO_BINDING_CREATION_READINESS: READY_WITH_LIMITS** — a non-active `GEO_LEGACY` binding can be written; activation (`MI_CELL`, ownerApproved) is a separate later gate.
- **PRODUCTION_MIGRATION_READINESS: NOT_READY** — NOT_LIVE_VERIFIED, RECOVERED/UNVERIFIED, unresolved conflicts, MIGRATION_5 not authorized.

## 9. Four corrections — PRESERVED
`entity-003`, `registration-002`, `offer-001`, `offer-002` carried into the projection. 1,032 USDT and 2,500 USDT remain **separate** programs (`combined:false`, `isGlobalMaximum:false`); global referral-code compatibility **UNVERIFIED**; promo + CTA eligibility **false**.

## 10. Two conflicts — PRESERVED
`cf-kz-bybit-001` **PARTIALLY_RESOLVED** · `cf-kz-bybit-002` **PARTIALLY_RESOLVED**. Conflict IDs referenced in the cell; routing not flattened; unresolved foreign-national scope and unresolved bank-card/referral routing remain visible; neither converted to resolved.

## 11. Legacy / production comparison (untouched)
Legacy GEO passport `research/geo/kazakhstan/exchanges/bybit.json` = availability all **UNKNOWN** (evidence-blocked run). Production ranking `src/data/geoRankings.ts` ranks bybit **#1** in KZ (snapshot available/1). MI cell = **AVAILABLE_WITH_LIMITS**. No `GEO_AVAILABLE_MI_RESTRICTED` conflict; GEO stays **frozen production truth** (`canonicalRecord = GEO_LEGACY`). Nothing in GEO/production modified.

## 12. Unresolved blockers
RECOVERED/UNVERIFIED (not byte-original) · NOT_LIVE_VERIFIED · cf-001 & cf-002 PARTIALLY_RESOLVED · global referral compatibility UNVERIFIED · no canonical `data/market-intelligence/` tree (bindings/ + linkage-QA paths not authority-named) · MIGRATION_5 not authorized.

## 13. Authorization flags (all false)
`canonicalImportAuthorized` · `miGeoBindingActivationAuthorized` · `productionChangeAuthorized` · `rankingEligibilityAuthorized` · `ctaEligibilityAuthorized` · `promoEligibilityAuthorized` · `migration5Authorized` — **all false**. This task prepares a future decision; it does not provide final canonical-import authorization.

## 14. Next gate
**`CBW-KZ-BYBIT-P0A-CANONICAL-IMPORT-EXECUTE-005`** — separate owner authorization to write the canonical MI cell + normalized sources + conflicts + non-active binding into an owner-confirmed `data/market-intelligence/` path. Ranking/CTA/promo activation and MIGRATION_5 remain separate later owner-gated tasks.
