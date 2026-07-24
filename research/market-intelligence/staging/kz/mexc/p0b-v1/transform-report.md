# CBW KZ×MEXC P0-B — Staging Transform Report (kz-mexc-p0b-v1)

- Task: CBW-KZ-MEXC-P0-B-STAGING-IMPORT-003 · baseline HEAD 0198d9fe05ca7c8425c61d56fd85de475f5df8fc
- Input: CBW_KZ_MEXC_P0B_SOURCE_TRUTH_REVIEW_v1_RECOVERED.zip (delivered as CBW_KZ_MEXC_P0B_SOURCE_TRUTH_REVIEW_v1.zip), 27833 bytes, sha256 f7658b5f7bddc29d24fd09a2c06de09d2dcfe65e6de64cc40e91c0399a380c5f
- Recovery boundary: original ZIP unavailable (37001 B, 3f0e10d231efc2ce33f77fac85182809197c11bf5b0cf400f32c77bad4774281); recovered delivery differs; package status RECOVERED / UNVERIFIED; byte-identical originality not established.
- Identity gate: PASS (project/country/exchange/batch/task/baselines/live-state/status all matched; manifest gate MATCHED).

## Results
- Normalized sources: 16/16 · review distribution VERIFIED_CURRENT 9 / VERIFIED_WITH_LIMITS 6 / OUTDATED 1 · schema statuses ACTIVE 15 / STALE 1 (design status table applied; no blind ACTIVE mapping; VERIFIED_WITH_LIMITS requires live-current pageStatus and keeps limits in links/provenance).
- productScope: derived only from claim-source relationships (sorted unique claim-category arrays); no scope inferred from URL/title/publisher; no empty scope; scalar countryCode "KZ"; review country-scope arrays preserved in qa-provenance.
- Claim-source links: 55 derived (SUPPORTS 41 / CONTRADICTS 14); deterministic linkId claimId|sourceId|relationship; 0 duplicates; 0 dangling; forward/reverse symmetry PASS (claim-side vs source-side reference sets identical).
- Claim reviews: 24/24 (CONFIRMED 11 / CONFIRMED_WITH_LIMITS 11 / UNVERIFIED 2); all 15 correction decisions recorded, not applied; original and verified statements preserved separately; ranking/CTA/promo uses all non-permissive (BLOCK/NONE).
- Conflicts: 7/7 preserved (RESOLVED_RESTRICTIVE 2 / PARTIALLY_RESOLVED 4 / RESOLVED_BY_SPECIFICITY 1); ownerReviewRequired true on all; no auto-resolution; restriction-event schema not applied (records do not conform).
- Candidate: OPTION A wrapper; cell structurally conforms to exchange-market-cell.schema.json; RESTRICTED / HIGH / NOT_LIVE_VERIFIED; RED "Restricted in Kazakhstan"; ranking/CTA/promo false; 13 owner-approved product statuses verbatim; no staging metadata inside cell.
- Terms-page flip: preserved in qa-provenance, conflict unresolvedEvidence, candidate reasonCodes/metadata, and deterministic recheck metadata (nextReviewDate 2026-08-21 = reviewDate + 30 days). Not collapsed into a bare restriction flag; earlier captures retained.
- Schema validation: market-source structural validation PASS for all 16 records; cell structural validation PASS; additionalProperties respected (no prohibited fields).
- Determinism: no wall-clock (all dates from package data); stable ordering and serialization; repeated generation is byte-identical (verified via --check / double --write-staging).

## Authorization boundary (all blocked)
canonicalImport, legacyGeoUpdate, productionChange, rankingChange, ctaChange, promoChange, affiliateRouteChange, referralCodeActivation, publication, migration5, deploy — all remain false/blocked. No canonical, legacy, production or public path was written; output confined to research/market-intelligence/staging/kz/mexc/p0b-v1/.
