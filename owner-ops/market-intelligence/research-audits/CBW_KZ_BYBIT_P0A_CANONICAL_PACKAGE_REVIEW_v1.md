# CBW — Kazakhstan × Bybit P0-A Canonical Package Review v1 (READ-ONLY)

| Field | Value |
|---|---|
| **Audit ID** | `CBW-KZ-BYBIT-P0A-CANONICAL-PACKAGE-REVIEW-v1` |
| **Task** | `CBW-KZ-BYBIT-P0A-CANONICAL-PACKAGE-REVIEW-008` |
| **Project** | CryptoBonusWorld · branch `master` · baseline HEAD `2080e469f58d1412680bcb15e858c07a02f0755e` |
| **Country × Exchange** | Kazakhstan (`KZ`) × Bybit · batch `KZ-P0-A` |
| **Mode** | Read-only canonical package review (no modification, no commit/push/deploy) |
| **Date** | 2026-07-21 |
| **Package status** | RECOVERED / UNVERIFIED |

Companion machine-readable record: [CBW_KZ_BYBIT_P0A_CANONICAL_PACKAGE_REVIEW_v1.json](CBW_KZ_BYBIT_P0A_CANONICAL_PACKAGE_REVIEW_v1.json). No canonical file was modified.

## Overall recommendation: **APPROVE** · Commit readiness: **READY**
All nine integrity dimensions PASS. The six canonical files are intact, schema-valid, byte-identical to committed staging/previews, provenance-complete, conflicts preserved, binding non-active, and read by no production consumer.

## 1. Files reviewed
Six canonical files (`data/market-intelligence/{cells,sources,linkages,provenance,conflicts,bindings}/by-country/kz/bybit.json`); authorization + path-decision + import-prep decisions; staging package (7 files) + canonical previews (cell/binding/projection-report); schemas (`exchange-market-cell`, `market-source`, `mi-geo-binding`, `restriction-event`); read-only production comparison (`research/geo/kazakhstan/exchanges/bybit.json`, `config/geo/kazakhstan.json`, `src/data/geoRankings.ts`, `package.json`). Nothing modified.

## 2. Files created (exactly two)
```
owner-ops/market-intelligence/research-audits/CBW_KZ_BYBIT_P0A_CANONICAL_PACKAGE_REVIEW_v1.md
owner-ops/market-intelligence/research-audits/CBW_KZ_BYBIT_P0A_CANONICAL_PACKAGE_REVIEW_v1.json
```

## 3. Package structure — PASS
Exactly **6** files; correct `by-country/kz/bybit.json` paths; no 7th file; no `cells/by-exchange/**`; no temporary import dir; no backup/manifest/report/script/hidden file; all parse as JSON; none zero-byte/truncated.

## 4. Hash verification — PASS
All six files match the expected bytes + SHA-256 exactly:

| File | Bytes | SHA-256 |
|---|---|---|
| cells/…/bybit.json | 2,887 | `5a49fad6…aac4d2` ✓ |
| sources/…/bybit.json | 30,542 | `c4080198…27e2e` ✓ |
| linkages/…/bybit.json | 24,754 | `fad231c3…438c342` ✓ |
| provenance/…/bybit.json | 57,155 | `de2550cc…644b020` ✓ |
| conflicts/…/bybit.json | 11,873 | `15aeb754…499d1f` ✓ |
| bindings/…/bybit.json | 1,881 | `a14e0e8e…a36d5ea6` ✓ |

## 5. Cell review — PASS
Byte-identical to `exchange-market-cell.preview.json`; semantically identical to `candidate.cell`; schema-valid (no candidateMetadata / staging-only fields / additional properties; all required + enums valid). overall **AVAILABLE_WITH_LIMITS** · MEDIUM · NOT_LIVE_VERIFIED · ranking/CTA/promo false · 13 product statuses unchanged (spot/kzt_p2p AVAILABLE; bank_card_purchase CONFLICTING; referral UNKNOWN; rest AVAILABLE_WITH_LIMITS); no upgrade/downgrade.

## 6. Source review — PASS
Envelope `{schemaVersion:"1",countryCode:"KZ",exchangeId:"bybit",records}`; **43** records; tiers **A 8 / B 32 / C 3**; IDs unique; sorted by `sourceId`; each independently validates `market-source.schema.json`; `productScope` sorted + duplicate-free; `claimType` omitted; `updatedDate` null on all 43; 4 supplemental (`sup-`) distinguishable; no QA fields (confidence/limitations/reviewNotes) leaked into source records. **Byte-for-byte equal to staging normalized-sources — 0 field differences.**

## 7. Linkage review — PASS
Envelope `{…,links}`; **77** links; sorted by `linkId`; 0 duplicate linkIds; 0 dangling source IDs; 0 dangling claim IDs; relationships only SUPPORTS/LIMITS/CONTRADICTS/CONTEXT; `supportedClaimIds` not reintroduced into sources. **Byte-for-byte equal to staging claim-source-links — 0 differences.**

## 8. Provenance review — PASS
Preserves schemaVersion / KZ / bybit / RECOVERED-UNVERIFIED / NOT_LIVE_VERIFIED; recovered + source-truth **input package hashes (2)** and **per-file recovery hashes (8, declared=original + recovered)**; commits — staging import `1dfbadf…`, path-decision `59f96dc…`, authorization `2080e46…` (+ owner-decision refs); **43** source QA + **41** claim QA records with confidence + limitations; **4** correctionDetails with original state (`originalProposedStatus`) + corrected text (`correctionNote`/`correctionIntent`) distinguishable; correctionRequired state; unresolved evidence; entity/domain routing (cf-001 + cf-002 routingMatrix); import history; granted write authorizations (true) + withheld production/activation authorizations (false). **No wall-clock timestamp** (no ISO datetime-with-time). Staging QA `perSource`/`perClaim` carried **verbatim** — nothing silently discarded. **Missing elements: none.**

*Note:* verbatim source-package claim strings are not committed to the repo; "original claim text" is faithfully represented by the committed `originalProposedStatus` + `correctionNote`, and corrected text by `correctionNote`/`correctionIntent`. No field was invented.

## 9. Correction review — PASS
Exactly 4 (`entity-003`, `registration-002`, `offer-001`, `offer-002`); original vs corrected states distinguishable. 1,032 USDT and 2,500 USDT **separate** (`combined:false`); neither is the global maximum; `globalReferralCodeCompatibility=UNVERIFIED`; promo + CTA eligibility false.

## 10. Conflict review — PASS
Envelope `{…,conflicts}`; exactly `cf-kz-bybit-001` + `cf-kz-bybit-002`; both **PARTIALLY_RESOLVED**; `autoResolved:false`; `ownerReviewRequired:true`; reviewed sources + unresolved evidence + full `routingMatrix` (cf-002) preserved; neither flattened into AVAILABLE; not forced into `restriction-event.schema.json`. **Byte-for-byte equal to staging normalized-conflicts — 0 differences.**

## 11. Binding review — PASS
Byte-identical to `mi-geo-binding.preview.json`; schema-valid. `ownerApproved=false` · `reviewStatus=PROPOSED` · `canonicalRecord=GEO_LEGACY` · `productionStable=true` · `conflictResolution.productionRouteUnchanged=true` · `migrationPhase=MIGRATION_4` · `affiliateInfluencesRanking=false`. Binding **exists but is not active**; existing GEO remains production truth; ranking/CTA/promo suppressed; no production consumer references it.

## 12. No-production-consumer review — PASS
Repository search for `data/market-intelligence/` and the six canonical paths: **0 references in `src/**`**, no runtime loader, no ranking/CTA/promo consumer, no page/route consumer, no build script inclusion, no sitemap/deployment integration, no auto-sync to `research/geo/**`. All 10 matches are documentation (owner-ops decisions/authorities) or non-runtime staging previews (+ an untracked `_handoff` copy).

## 13. Final verdicts
| Dimension | Verdict |
|---|---|
| PACKAGE_STRUCTURE | **PASS** |
| HASH_INTEGRITY | **PASS** |
| CELL_SCHEMA_INTEGRITY | **PASS** |
| SOURCE_SCHEMA_INTEGRITY | **PASS** |
| LINKAGE_INTEGRITY | **PASS** |
| PROVENANCE_COMPLETENESS | **PASS** |
| CONFLICT_PRESERVATION | **PASS** |
| BINDING_NON_ACTIVATION | **PASS** |
| NO_PRODUCTION_CONSUMER | **PASS** |

## 14. Canonical package commit readiness: **READY**
All integrity dimensions PASS → READY. Binding activation, production integration, ranking/CTA/promo, and MIGRATION_5 remain blocked.

## 15. Immutability
`git diff` empty across `research/market-intelligence/staging/**`, `research/geo/**`, `config/geo/**`, `src/**`, `public/**`, `package.json`, `schemas/**`, `owner-ops/**` — all byte-identical. `data/market-intelligence/` untracked; nothing staged; HEAD unchanged `2080e46`.

## 16. Next task
**`CBW-KZ-BYBIT-P0A-CANONICAL-IMPORT-EXECUTE-007-COMMIT`** — owner-gated commit of exactly the six canonical files, push `master → origin/master`. MI-GEO binding activation, GEO-vs-MI discrepancy review, production integration, ranking/CTA/promo, and MIGRATION_5 remain separate later owner-gated tasks.
