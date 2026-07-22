# CBW — Kazakhstan × MEXC P0-B Source Truth Review Package Audit v1 (READ-ONLY)

| Field | Value |
|---|---|
| **Audit ID** | `CBW-KZ-MEXC-P0B-SOURCE-TRUTH-REVIEW-PACKAGE-AUDIT-v1` |
| **Task** | `CBW-KZ-MEXC-P0-B-SOURCE-TRUTH-REVIEW-PACKAGE-AUDIT-004` |
| **Project** | CryptoBonusWorld · branch `master` · baseline HEAD `2d1e94904491861a69f35329691514bb148407dd` |
| **Country × Exchange** | Kazakhstan (`KZ`) × MEXC · batch `KZ-P0-B` |
| **Mode** | Read-only Source Truth Review package audit (no web, no import, no commit/push/deploy) |
| **Date** | 2026-07-22 |
| **Package status** | RECOVERED / UNVERIFIED |

Companion machine-readable record: [CBW_KZ_MEXC_P0B_SOURCE_TRUTH_REVIEW_PACKAGE_AUDIT_v1.json](CBW_KZ_MEXC_P0B_SOURCE_TRUTH_REVIEW_PACKAGE_AUDIT_v1.json). Recovered STR ZIP audited from disk (`_handoff/mexc-p0b-source-truth-result/`); temporary extraction deleted after validation. No official URLs verified online.

## Overall recommendation: **APPROVE** for owner decision · **NOT** for import

The recovered Source Truth Review package is structurally intact, identity-correct, complete (16/16 sources, 24/24 claims, 7/7 conflicts, 15/15 correction-required claims), ID-unique, reference-complete in both directions, report/JSON/exported-report coherent, and internally coherent toward **RESTRICTED / HIGH / publication BLOCKED**. It remains **RECOVERED / UNVERIFIED** and supports an owner decision; import stays blocked.

## 0. Input provenance note (documented deviation)

The audited local inputs were present on disk under their delivery filenames, not the task's canonical names:

- `CBW_KZ_MEXC_P0B_SOURCE_TRUTH_REVIEW_v1.zip` (27,833 B, SHA-256 `f7658b5f7bddc29d24fd09a2c06de09d2dcfe65e6de64cc40e91c0399a380c5f`) — **byte-identical** (exact size + full SHA-256 match) to the declared recovered artifact `CBW_KZ_MEXC_P0B_SOURCE_TRUTH_REVIEW_v1_RECOVERED.zip`; audited on that cryptographic identity after owner task reissue.
- `deep-research-report (5).md` (9,450 B, SHA-256 `91b60e023da21387c53fb8bc1786e028ad68c3bc33c95a7ebc19bb78b974cc09`) — the exported Deep Research report, audited as `CBW_KZ_MEXC_P0B_SOURCE_TRUTH_REVIEW_EXPORTED_REPORT_v1.md`; no expected hash was declared for it, so identification rests on directory placement and content match.

Neither input was modified. The handoff ZIP entries use the canonical names.

## 1. Inputs reviewed

Recovered STR ZIP + exported report (above); recovered research package `_handoff/mexc-p0b-source-review/CBW_KZ_MEXC_P0B_RESEARCH_PACKAGE_v1_RECOVERED.zip` (30,728 B, `aa4ee0a0…`, for original-set comparison); committed recovered-package audit (MD+JSON); MEXC dedicated queue; Kazakhstan master queue; MIGRATION_4 owner decision; Bybit closeout; authorities (MI Brain, Reconciliation Standard, Deep Passport Standard); 4 MI schemas; NO-PROXY rules; read-only legacy `research/geo/kazakhstan/exchanges/mexc.json`, `config/geo/kazakhstan.json`, `src/data/geoRankings.ts`. Nothing modified.

## 2. Outputs created

```
owner-ops/market-intelligence/research-audits/CBW_KZ_MEXC_P0B_SOURCE_TRUTH_REVIEW_PACKAGE_AUDIT_v1.md
owner-ops/market-intelligence/research-audits/CBW_KZ_MEXC_P0B_SOURCE_TRUTH_REVIEW_PACKAGE_AUDIT_v1.json
_handoff/CBW_KZ_MEXC_P0B_SOURCE_TRUTH_REVIEW_AUDIT_HANDOFF_v1.zip  (untracked, 6 flat entries)
```

## 3. Package structure — PASS

ZIP opens; **exactly 8** entries (`review-run.json`, `source-verification.json`, `claim-verdicts.json`, `conflict-resolution.json`, `offer-eligibility-review.json`, `schema-normalization-notes.json`, `import-readiness.json`, `source-truth-review-report.md`); 0 duplicates, 0 traversal, 0 hidden, 0 zero-byte, 0 temp, 0 unexpected; all 8 decode UTF-8; all 7 JSON parse.

## 4. Project and task identity — PASS

`review-run.json`: project CryptoBonusWorld · branch master · project baseline `2d1e9490…` · research-package baseline `67bdca32…` · Kazakhstan/KZ · MEXC/mexc · KZ-P0-B · task `CBW-KZ-MEXC-P0-B-SOURCE-TRUTH-REVIEW-001` · mode Official-source/evidence-first/NO-PROXY (`noProxyMode: true`, `manifestGate: MATCHED`) · `liveVerificationState: NOT_LIVE_VERIFIED` · `packageStatus: RECOVERED / UNVERIFIED`. Zero identity conflicts.

## 5. Source review — PASS (complete)

**16/16 original reviewed · 0 supplemental · 16 total.** All IDs use `src-kz-mexc-`; unique; each appears once; every source has `verificationStatus`, `verifiedUrl`, `title`, `checkedDate` (2026-07-22), `pageStatus`; no source silently removed; original/supplemental distinguishable via `sourceOrigin` + separate arrays.

Original-source distribution — **matches expected exactly, 0 mismatches**:
| Status | Expected | Actual |
|---|---|---|
| VERIFIED_CURRENT | 9 | **9** |
| VERIFIED_WITH_LIMITS | 6 | **6** |
| OUTDATED | 1 | **1** (`src-kz-mexc-cis-bonus-001`, ended campaign) |

## 6. Claim verdicts — PASS (complete)

**24/24 original claims reviewed**; IDs unique and set-identical to the original claim ledger. Every claim carries all 14 required fields (claimId, originalStatement, verdict, verifiedStatement, verifiedSourceIds, contradictingSourceIds, confidence, limitations, correctionRequired, correctionNote, publicationUse, rankingUse, ctaUse, promoUse) — 0 missing.

Verdict distribution — **matches expected exactly**:
| Verdict | Expected | Actual |
|---|---|---|
| CONFIRMED | 11 | **11** |
| CONFIRMED_WITH_LIMITS | 11 | **11** |
| UNVERIFIED | 2 | **2** (both direct-fiat claims, LOW confidence) |

- Claims missing a verdict: **0**. Claims with unresolved references: **0**.
- Empty `verifiedSourceIds`: **1** — `clm-kz-mexc-publication-002` (task-authority boundary statement; same acceptable exception as the prior audit).
- **Correction-required: 15/15 explicitly reviewed** — the STR's correction set is ID-identical to the original package's 15; every one carries an explicit correctionNote ("Original correction flag was explicitly reviewed and remains required…"). None silently preserved.
- **Note (non-blocking):** all 15 correction-required claims have `originalStatement` == `verifiedStatement`. This is coherent, not defective: the verdicts CONFIRM the package statements, and per the correctionNotes the correction targets **earlier positive/ambiguous repository wording** (legacy GEO data), not the claim text itself.
- Publication/ranking/CTA/promo boundaries: no conflicts — every restrictive claim carries `rankingUse/ctaUse/promoUse: BLOCK` with `publicationUse` RESTRICTION_ONLY or BLOCK variants.

## 7. P0 claim audit — PASS

| Claim | Verdict | Conf. | corrReq | Verified sources | Contradicting |
|---|---|---|---|---|---|
| `clm-kz-mexc-restrictions-001` | **CONFIRMED_WITH_LIMITS** | HIGH | true | `src-kz-mexc-terms-001` | app-countries, p2p-kzt-page, p2p-ad-rules, fiat-tn-policy, earn-agreement |
| `clm-kz-mexc-regulation-001` | **CONFIRMED** | HIGH | false | `src-kz-mexc-afsa-warning-001` | — |
| `clm-kz-mexc-registration-001` | **CONFIRMED** | HIGH | true | `src-kz-mexc-terms-001` | signup-flow |
| `clm-kz-mexc-kyc-001` | **CONFIRMED** | HIGH | true | kyc-eligibility, terms | p2p-ad-rules |

1. **restrictions-001** — fully recorded: source `src-kz-mexc-terms-001` (Tier A, "MEXC User Agreement", `https://www.mexc.com/terms`, published/lastUpdated **2025-05-29**, checked **2026-07-22**, `pageStatus: CURRENT_AT_CHECK`); entity "MEXC contracting platform; no Kazakhstan-specific entity identified"; scope: current terms **expressly list Kazakhstan among Prohibited Jurisdictions**, strongest for **residents and users located in Kazakhstan** (not a citizenship-only ban for Kazakhs abroad); effect: no services, no user registration, no trade applications; the earlier repository signal (KZ absent from prohibited list) is treated as superseded — correctionRequired true with explicit note.
2. **regulation-001** — AFSA warning (`src-kz-mexc-afsa-warning-001`, Tier A, published **2026-04-28**) represented as **unlicensed/unauthorized local activity** naming MEXC among platforms advertising/promoting to Kazakhstan citizens; explicitly **not** a technical-access test; held as a **separate regulatory finding** correctly scoped to its audience. Not equated with technical unavailability.
3. **registration-001** — reviewed **separately** from product-page/signup-flow visibility (signup flow is a contradicting signal, not eligibility evidence).
4. **kyc-001** — reviewed **separately** from generic accepted-document guidance (`kyc-002` handles documents); conclusion derived from country-gating rule (KYC limited to non-restricted jurisdictions) + KZ prohibition.

**Owner-attention note (non-blocking):** the legacy passport records that the same terms document (same `lastUpdated: 2025-05-29`) was captured on 2026-07-03/2026-07-14 **without** Kazakhstan in the list, while the STR (checked 2026-07-22) found Kazakhstan **present** — the package flips the signal but does not determine whether the page changed without a date bump or the earlier capture misread. The relevant conflict (`cf-kz-mexc-terms-vs-regulator`) carries `ownerReviewRequired: true`. Also minor: legacy notes date the AFSA warning 2026-04-29; the STR consistently records 2026-04-28.

## 8. P1 claim audit — PASS

| Claim | Verdict | Conf. |
|---|---|---|
| `clm-kz-mexc-p2p-001` | CONFIRMED_WITH_LIMITS | HIGH |
| `clm-kz-mexc-kzt-001` | CONFIRMED_WITH_LIMITS | HIGH |
| `clm-kz-mexc-derivatives-001` | CONFIRMED | HIGH |
| `clm-kz-mexc-direct-fiat-deposit-001` | UNVERIFIED | LOW |
| `clm-kz-mexc-direct-fiat-withdrawal-001` | UNVERIFIED | LOW |
| `clm-kz-mexc-referral-002` | CONFIRMED | HIGH |

Separation confirmed throughout `offer-eligibility-review.json`: interface visibility, KZT presence, technical product presence, registration eligibility, legal availability, product eligibility and referral compatibility are distinct fields (`p2p`/`kzt`/`mobileApp` = `CONFLICTING_*_SIGNAL_NOT_ELIGIBILITY`; `directFiat*` = UNVERIFIED; `earn` = conflicting/not publication-safe). Globally visible pages are explicitly **not** treated as country eligibility.

## 9. Conflict review — PASS (complete)

**7/7 reviewed**; IDs unique and set-identical to original. All 8 required fields present on every conflict; 0 dangling source/claim references; 0 silently removed; 0 unreviewed.

Final-status distribution — **matches expected exactly**: RESOLVED_RESTRICTIVE **2** (`terms-vs-regulator`, `global-referral-vs-kz-restriction`) · PARTIALLY_RESOLVED **4** (`terms-vs-app-support`, `terms-vs-p2p-kzt`, `terms-vs-fiat-tn`, `terms-vs-earn`) · RESOLVED_BY_SPECIFICITY **1** (`card-guide-scope`). No conflict is incorrectly marked fully resolved — the four open product-signal tensions remain PARTIALLY_RESOLVED with `ownerReviewRequired: true` on **all seven**. Final statuses do not contradict claim verdicts.

## 10. Offer / referral / promo — PASS

Separately evaluated: referral-code entry flow `VERIFIED_GLOBAL_ONLY`; Kazakhstan compatibility `NOT_VERIFIED_AND_NOT_ELIGIBLE_UNDER_CURRENT_COUNTRY_PROHIBITION`; repository route `/go/mexc` and code `mexc-CryptoBonus` recorded as **implementation facts only**, each `NOT_VERIFIED_FOR_KAZAKHSTAN`; new-user vs existing-user rules distinguished (registration-time code entry vs 30-day self-service referrer linking); `currentKazakhstanCampaigns: []`; the only KZ-relevant campaign (`src-kz-mexc-cis-bonus-001`) is marked **ENDED/historical** (window 2025-08-11 → 2025-09-01) and **not** presented as current; `locallyVerifiedBonusAmount: null`; `globalMaximumApplicability: NOT_VERIFIED_FOR_KAZAKHSTAN`; ranking/CTA/promo `BLOCKED`; publication `RESTRICTION_ONLY_AFTER_OWNER_AUTHORIZATION`. No unrelated reward amounts combined. All 10 authorization flags false.

## 11. Report coherence — PASS (internal) · PASS (exported)

- **Internal report vs JSON:** the recovery appendix in `source-truth-review-report.md` embeds all 7 JSON documents; each embedded object parses and is **structurally identical (deep-equality) to the corresponding ZIP JSON file**. The report body matches all counts (16/24/7/15), distributions, RESTRICTED/HIGH/NOT_LIVE_VERIFIED, publication posture, and all-false authorizations.
- **Exported report vs ZIP:** agrees on identity, recommendation RESTRICTED/HIGH, terms lastUpdated 2025-05-29 expressly naming KZ, AFSA 2026-04-28 scope, registration/KYC restricted, P2P/KZT/app/Earn conflicting-subordinate, fiat rails unverified, card unavailable under the 38-country guide, referral not verified for KZ, ended KZ campaign, all flags false, NOT_LIVE_VERIFIED, eight-file contract. **One expected artifact-metadata difference:** the exported report's download metadata (37,001 B, SHA-256 `3f0e10d2…`) describes the **original, now-unavailable** ZIP, not the recovered one — this matches the declared recovery narrative and is not an inconsistency.

## 12. Final recommendation audit — RECOMMENDATION_COHERENCE: PASS

Actual values: `overallRecommendation: RESTRICTED` · `confidence: HIGH` · publication posture **BLOCKED** (restriction-only wording permitted only after explicit owner authorization) — all as expected. Internally coherent: restriction follows from the reviewed current Tier-A terms which **explicitly name Kazakhstan**; P2P/KZT/app/Earn visibility remains subordinate (conflicts/limitations, not eligibility); AFSA strengthens the finding without being treated as technical unavailability; registration and KYC conclusions follow separately; product presence never equals legal eligibility; ranking/CTA/promo/referral/publication remain separate; unresolved product signals stay visible as PARTIALLY_RESOLVED conflicts and claim limitations. **PASS means package-internally coherent — not independently re-verified by Claude Code (no URLs opened).**

## 13. Recovery integrity — WARN

| Artifact | Bytes | SHA-256 |
|---|---|---|
| Original (unavailable) | 37,001 | `3f0e10d231efc2ce33f77fac85182809197c11bf5b0cf400f32c77bad4774281` |
| Recovered (delivered) | 27,833 | `f7658b5f7bddc29d24fd09a2c06de09d2dcfe65e6de64cc40e91c0399a380c5f` |

Original archive bytes are unavailable; the recovered ZIP demonstrably differs from the declared original (different size and hash). All eight files are present and semantic completeness **can** be and was assessed; byte-identical originality **cannot** be established. **No individual file is documented as byte-identical** to the unavailable original (review-run limitation states the delivery was reconstructed; nothing certifies byte identity, and none is inferred). Package status **must remain RECOVERED / UNVERIFIED**.

## 14. Schema normalization — SCHEMA_NORMALIZATION_READINESS: PASS

`schema-normalization-notes.json` targets `market-source.schema.json` with 20 field mappings, each explicitly classified (DIRECT_MAP / RENAME / ENUM_MAP / DERIVED / REQUIRES_SCHEMA_DECISION / DROP) — deterministic and lossless for critical evidence; misfitting fields (array `countryScope`/`productScope`, claim-link cardinality) are explicitly parked as **4 schemaDecisionsRequired** rather than silently coerced; claim/source linkages, contradictions, confidence and provenance handling are explicit; enum maps are declared tables (TIER_A→A…, English→en…, VERIFIED_CURRENT→VERIFIED, OUTDATED→ARCHIVED) with no silent upgrades; `normalizationStatus: PREPARED_NOT_APPLIED`, `schemaModified: false`, `importPerformed: false`; no production activation.

## 15. Final verdicts

```
PACKAGE_STRUCTURE:               PASS
JSON_PARSE_INTEGRITY:            PASS
PROJECT_TASK_IDENTITY:           PASS
SOURCE_REVIEW_COMPLETENESS:      PASS
CLAIM_REVIEW_COMPLETENESS:       PASS
CONFLICT_REVIEW_COMPLETENESS:    PASS
ID_UNIQUENESS:                   PASS
CROSS_REFERENCE_INTEGRITY:       PASS
REPORT_JSON_COHERENCE:           PASS
EXPORTED_REPORT_COHERENCE:       PASS
RECOMMENDATION_COHERENCE:        PASS  (package-internal; not re-verified online)
RECOVERY_INTEGRITY:              WARN  (semantic completeness PASS; byte-identical originality cannot be established)
SCHEMA_NORMALIZATION_READINESS:  PASS
OWNER_DECISION_READINESS:        READY
IMPORT_PREPARATION_READINESS:    READY_WITH_LIMITS  (semantically complete; RECOVERED/UNVERIFIED; 4 schema decisions open)
IMPORT_READINESS:                NOT_READY
IMPORT_AUTHORIZATION:            false
PRODUCTION_CHANGE_AUTHORIZATION: false
RANKING_CHANGE_AUTHORIZATION:    false
CTA_CHANGE_AUTHORIZATION:        false
PROMO_CHANGE_AUTHORIZATION:      false
AFFILIATE_ROUTE_CHANGE_AUTHORIZATION: false
PUBLICATION_AUTHORIZATION:       false
MIGRATION_5_AUTHORIZATION:       false
DEPLOY_AUTHORIZATION:            false
```

## 16. Next task

**`CBW-KZ-MEXC-P0-B-OWNER-DECISION-001`** — owner-gated decision on the RESTRICTED / HIGH outcome (esp. the terms-page flip documented in §7's owner-attention note, the four PARTIALLY_RESOLVED product-signal conflicts, and restriction-only publication posture), followed — only if approved — by controlled import preparation. Import, canonical MI, production, ranking, CTA, promo, publication and MIGRATION_5 remain blocked. Do not reopen Bybit; do not start OKX/Bitget/KuCoin/BingX.
