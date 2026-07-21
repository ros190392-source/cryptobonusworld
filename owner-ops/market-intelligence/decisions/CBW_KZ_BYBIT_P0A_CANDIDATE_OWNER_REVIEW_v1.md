# CBW — Kazakhstan × Bybit P0-A Staging Candidate Owner Review v1

| Field | Value |
|---|---|
| **Decision ID** | `CBW-KZ-BYBIT-P0A-CANDIDATE-OWNER-REVIEW-v1` |
| **Task** | `CBW-KZ-BYBIT-P0A-CANDIDATE-OWNER-REVIEW-001` |
| **Project** | CryptoBonusWorld · branch `master` · HEAD `0fa0791b4a5255b662ed67cf6df6033ed53a55cd` |
| **Country × Exchange** | Kazakhstan (`KZ`) × Bybit · batch `KZ-P0-A` |
| **Mode** | Read-only review + owner decision record (staging files **not** modified) |
| **Date** | 2026-07-21 |
| **Staging** | `research/market-intelligence/staging/kz/bybit/p0a-v1` — reproducible (`--check` OK); RECOVERED / UNVERIFIED |

Companion machine-readable record: [CBW_KZ_BYBIT_P0A_CANDIDATE_OWNER_REVIEW_v1.json](CBW_KZ_BYBIT_P0A_CANDIDATE_OWNER_REVIEW_v1.json)

## Overall recommendation: **NEEDS FIXES** · STAGING_COMMIT_DECISION: **APPROVE_AFTER_FIXES**
The staging import is internally correct and reproducible. The **only** required fix before commit is the **OPTION A candidate-shape restructure** (the current candidate carries 11 fields beyond `exchange-market-cell.schema.json`, which is `additionalProperties:false`, so it does not validate). All other records are approved as-is. Canonical import, MI cell, ranking/CTA/promo, and MIGRATION_5 remain blocked.

## 1. Files reviewed
Owner decision (`…OWNER_DECISION_AND_IMPORT_PREP_v1.md/.json`), source-truth audit (`…SOURCE_TRUTH_REVIEW_PACKAGE_AUDIT_v1.md/.json`), transform script (`import-kz-bybit-p0a.mjs`), all seven staging records, and schemas (`exchange-market-cell`, `market-source`, `mi-geo-binding`) + MI Brain + reconciliation standard.

## 2. Files created
```
owner-ops/market-intelligence/decisions/CBW_KZ_BYBIT_P0A_CANDIDATE_OWNER_REVIEW_v1.md
owner-ops/market-intelligence/decisions/CBW_KZ_BYBIT_P0A_CANDIDATE_OWNER_REVIEW_v1.json
```

## 3. Source review — PASS
43 sources · Tier A 8 / B 32 / C 3 · 0 duplicate IDs · status `ACTIVE` only · captureType `HTML` only · **no fields beyond `market-source.schema.json`** (additionalProperties respected) · confidence, limitations, and verificationState **preserved in QA/provenance** (not discarded) · 4 supplemental sources flagged (`isSupplemental`) and distinguishable from the original 39 · `ACTIVE` derived from source-truth `currentStatus`, **not** blindly from `REVIEWED`.

## 4. Linkage review — PASS
77 links · 0 duplicate `linkId` · every claim & source ID resolves · relationships valid (SUPPORTS/LIMITS/CONTRADICTS/CONTEXT) · the **4 CONTRADICTS links are all for `clm-kz-bybit-offer-002`** (sources `src-011, src-031, sup-001, sup-003`) — intentional and accurate · the 3 CONTEXT links (`derivatives-001→src-025`, `kyc-001→src-013`, `kyc-002→src-013`) are correctly **not** treated as direct support · corrected claims retain original provenance in QA.

## 5. Correction review — PASS
Exactly 4 corrections applied (`entity-003`, `registration-002`, `offer-001`, `offer-002`). Original text preserved in provenance (`originalProposedStatus`, `correctionNote`); corrected intent separately represented. `offer-002`: original `UNKNOWN` → CONTRADICTED; **1,032 USDT and 2,500 USDT kept separate** (`combined:false`, `isGlobalMaximum:false`). `promoEligibility` and `ctaEligibility` remain **false**.

## 6. Conflict review — PASS
`cf-kz-bybit-001` **PARTIALLY_RESOLVED** (`autoResolved:false`, `ownerReviewRequired:true`, unresolved evidence visible; a *segment* conflict — its per-segment `reviewedResolution` is preserved, so no routingMatrix is expected here). `cf-kz-bybit-002` **PARTIALLY_RESOLVED** (`autoResolved:false`, `ownerReviewRequired:true`, **full `routingMatrix` preserved**, unresolved evidence visible). Neither conflict flattened into AVAILABLE.

## 7. Per-product owner decisions (all APPROVED)
| Product | Status | Verdict |
|---|---|---|
| registration | AVAILABLE_WITH_LIMITS | APPROVED |
| kyc | AVAILABLE_WITH_LIMITS | APPROVED |
| spot | AVAILABLE | APPROVED |
| derivatives | AVAILABLE_WITH_LIMITS | APPROVED |
| margin | AVAILABLE_WITH_LIMITS | APPROVED |
| p2p | AVAILABLE_WITH_LIMITS | APPROVED (KYC-required; conservative vs ECF AVAILABLE) |
| kzt_p2p | AVAILABLE | APPROVED |
| direct_kzt_deposit | AVAILABLE_WITH_LIMITS | APPROVED (identity-bound; conservative) |
| direct_kzt_withdrawal | AVAILABLE_WITH_LIMITS | APPROVED (identity-bound; conservative) |
| bank_card_purchase | CONFLICTING | APPROVED (cf-002 routing unresolved) |
| bybit_card | AVAILABLE_WITH_LIMITS | APPROVED |
| referral | UNKNOWN | APPROVED (offer-001 compatibility unverified) |
| promotions | AVAILABLE_WITH_LIMITS | APPROVED (campaign-specific) |

Overall **AVAILABLE_WITH_LIMITS**; presentation **GREEN — Available** primary + **AMBER — Some limits apply** secondary. None judged TOO_PERMISSIVE / TOO_CONSERVATIVE / NEEDS_REMAP.

## 8. Candidate-shape decision: **OPTION A — WRAPPED CANDIDATE**
The current `exchange-market-cell.candidate.json` carries 11 fields (`recordState, canonical, productionEligible, migration5Authorized, futureRankingCandidate, presentation, productStatusRationale, offerAmounts, provenance, schemaRef, schemaNote`) beyond the committed schema, which is `additionalProperties:false` — so **it does not validate; OPTION C is not permitted.** Decision: restructure into **OPTION A**:
```
{ "candidateMetadata": { recordState, canonical, productionEligible, migration5Authorized,
                         futureRankingCandidate, presentation, productStatusRationale, offerAmounts, provenance },
  "cell": { <exact exchange-market-cell.schema.json instance> } }
```
Not applied in this task (read-only). To be done by the follow-up staging re-run.

## 9. Controlled decision 1 — productScope
`market-source.schema.json productScope` is an **array of strings** (multi-value allowed). **Decision:** populate `productScope` deterministically from the **claim categories of the claims each source supports** (via claim-source links); no fabrication; multi-product sources retain all applicable tokens. Category→scope map (excerpt): `legal_entity/jurisdiction→entity`, `registration→registration`, `kyc→kyc`, `spot→spot`, `derivatives→derivatives`, `margin_and_leverage→margin`, `p2p→p2p`, `kzt_p2p→kzt_p2p`, `direct_fiat_deposit→direct_kzt_deposit`, `direct_fiat_withdrawal→direct_kzt_withdrawal`, `cards_and_bank_transfers→[cards,bank_card_purchase]`, `cards→[bybit_card,cards]`, `offer_eligibility→[referral,promotions]`, `language_and_support→language_support`, `regulation→regulation`, `applications→applications`. `productScope[source] = sorted union over its supported-claim categories`.

## 10. Controlled decision 2 — claimType
`claimType` is `string|null` on market-source. **Decision:** **do not store `claimType` on normalized market-source records** (a source supports multiple claim categories; forcing one is lossy). Represent category/relationship via the **claim-source linkage** (already carries `relationship`) and/or at later canonical claim creation. `marketSource.claimType = null`.

## 11. Controlled decision 3 — updatedDate
**Confirmed.** Use an official page update date only when explicitly verified; otherwise `null`; never substitute `checkedDate`/retrieval date; no wall-clock inference. Current staging already sets `updatedDate:null` for all 43 (no verified metadata) — compliant.

## 12. Controlled decision 4 — entity routing
**Decision (preferred representation adopted):** legal-entity + domain routing detail lives in **source/claim/conflict provenance** and the **full `routingMatrix` stays in `normalized-conflicts` + `qa-provenance`**; the **cell** stores only decision-relevant routing **status + `reasonCodes` + `conflictIds`**. Do **not** flatten multiple entities (Bybit Limited core platform vs affiliate stack vs unresolved global bank-card route vs local bybit.kz routes vs campaign-specific promo routing) into one legal entity on the cell.

## 13. Staging commit decision
**APPROVE_AFTER_FIXES.** Approve-as-is: `normalized-sources.json`, `claim-source-links.json`, `qa-provenance.json`, `normalized-conflicts.json`, `transform-report.md`, `import-manifest.json`, `import-kz-bybit-p0a.mjs`. Required fix: restructure the candidate to OPTION A (and optionally fold in the derived `productScope` arrays) via a follow-up staging re-run. **Canonical import not authorized.**

## 14. Validation results
1 source count/tiers 43/8/32/3 ✓ · 2 linkage 77 ✓ · 3 four corrections ✓ · 4 two conflicts ✓ · 5 thirteen product decisions (all APPROVED) ✓ · 6 candidate-shape decision OPTION A ✓ · 7 four controlled decisions resolved ✓ · 8 overall AVAILABLE_WITH_LIMITS ✓ · 9 GREEN primary + AMBER secondary ✓ · 10 ranking/CTA/promo false ✓ · 11 canonical false ✓ · 12 productionEligible false ✓ · 13 migration5Authorized false ✓ · 14 JSON parses ✓ · 15 MD/JSON agree ✓ · 16 no staging file modified ✓ · 17 production/runtime unchanged ✓.

## 15. Authorizations withheld
No staging commit; no canonical import; no MI cell; no legacy-passport update; no production/ranking/CTA/promo; no MIGRATION_5; no staging file modified this task.

## 16. Next task
**`CBW-KZ-BYBIT-P0A-CANDIDATE-RESHAPE-002`** — owner-gated staging re-run that (a) emits `exchange-market-cell.candidate.json` in OPTION A (candidateMetadata + schema-valid cell), (b) optionally adds derived `productScope` arrays to `normalized-sources` per the approved map (claimType stays off market-source records), then re-verifies determinism/`--check`. Still staging-only; canonical import, MI cell, ranking/CTA/promo, and MIGRATION_5 remain separate later owner-gated tasks.
