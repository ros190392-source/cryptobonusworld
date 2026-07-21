# CBW — Kazakhstan × Bybit Source-Truth Review Package Audit v1

| Field | Value |
|---|---|
| **Audit ID** | `CBW-KZ-BYBIT-P0A-SOURCE-TRUTH-REVIEW-PACKAGE-AUDIT-v1` |
| **Task** | `CBW-KZ-BYBIT-P0A-SOURCE-TRUTH-REVIEW-PACKAGE-AUDIT-001` |
| **Project** | CryptoBonusWorld · branch `master` · HEAD `9581d69425395f9ccedbf4cac3a627c37dcab3e3` |
| **Country × Exchange** | Kazakhstan (`KZ`) × Bybit · batch `KZ-P0-A` |
| **Date** | 2026-07-21 · Mode: read-only, no web browsing, no import |
| **Package status** | **RECOVERED / UNVERIFIED** |

Companion machine-readable audit: [CBW_KZ_BYBIT_P0A_SOURCE_TRUTH_REVIEW_PACKAGE_AUDIT_v1.json](CBW_KZ_BYBIT_P0A_SOURCE_TRUTH_REVIEW_PACKAGE_AUDIT_v1.json)

## Verdicts

| Dimension | Verdict |
|---|---|
| PACKAGE_INTEGRITY | **PASS** |
| CLAIM_REVIEW_COMPLETENESS | **PASS** |
| CROSS_REFERENCE_INTEGRITY | **PASS** |
| SOURCE_TRUTH_REVIEW_COHERENCE | **PASS** |
| SCHEMA_NORMALIZATION_READINESS | **PASS** |
| OWNER_DECISION_READINESS | **READY** |
| IMPORT_PREPARATION_READINESS | **READY** |
| IMPORT_AUTHORIZATION | **false** |
| PRODUCTION_CHANGE_AUTHORIZATION | **false** |
| MIGRATION_5_AUTHORIZATION | **false** |

**Recommendation: APPROVE** — for **owner decision** and **import preparation (transform design) only**. Import, production change, CTA/promo, canonical MI-cell creation, legacy-passport update, source-registry normalization writes, and MIGRATION_5 remain blocked and owner-gated. The package remains RECOVERED / UNVERIFIED.

## 1. Inputs reviewed (read-only, local; not modified)
- `_handoff/source-truth-review-input/CBW_KZ_BYBIT_P0A_SOURCE_TRUTH_REVIEW_v1_RECOVERED.zip` — 23339 bytes, sha256 `a6d7d262c47018b55fe07cf42837d69c1d3f14e6e9650ebcdedda328962a4234`.
- `_handoff/source-truth-review-input/CBW_KZ_BYBIT_P0A_SOURCE_TRUTH_REVIEW_RECOVERY_AUDIT_v1.md`
- `_handoff/source-truth-review-input/deep-research-report (4).md`
- Repository authorities read in full: MI Brain, reconciliation standard, KZ research queue (.md/.json), MIGRATION_4 owner decision (.md/.json), recovered-package audit (.md/.json), 4 MI schemas, legacy `research/geo/kazakhstan/exchanges/bybit.json`, `config/geo/kazakhstan.json`, NO-PROXY mode.

Extracted only to an OS temp directory for inspection; the temp extraction is deleted after the audit.

## 2. Package integrity — PASS
ZIP opens; `testzip()` clean (not corrupt). **Exactly the eight** required files present: `review-run.json`, `source-verification.json`, `claim-verdicts.json`, `conflict-resolution.json`, `offer-eligibility-review.json`, `schema-normalization-notes.json`, `import-readiness.json`, `source-truth-review-report.md`. 0 duplicate entries, 0 path-traversal, 0 hidden/temp files, 0 zero-byte files, no truncation. All 7 JSON parse; all 8 files decode as UTF-8.

## 3. Claim-review completeness — PASS
`claim-verdicts.json` reviews **41/41** claims. Verification states: **CONFIRMED 27 · CONFIRMED_WITH_LIMITS 13 · CONTRADICTED 1** — matching `review-run.json` `verificationStateCounts` exactly. `review-run` `finalRecommendation` = `AVAILABLE_WITH_LIMITS`, `confidence` = `MEDIUM`; all `authorizations` false, `ownerReviewRequired` true.

## 4. Count consistency — PASS
| Metric | Declared | Actual | OK |
|---|---:|---:|:--:|
| sources total | 43 | 43 | ✓ |
| original recovered sources | 39 | 39 | ✓ |
| supplemental official sources | 4 | 4 | ✓ |
| claims | 41 | 41 | ✓ |
| conflicts | 2 | 2 | ✓ |
| CONFIRMED | 27 | 27 | ✓ |
| CONFIRMED_WITH_LIMITS | 13 | 13 | ✓ |
| CONTRADICTED | 1 | 1 | ✓ |

## 5. Cross-reference integrity — PASS
Source / claim / conflict IDs all unique (0 duplicates). **0 dangling references** across every checked relationship: `claim.verifiedSources → sources`, `source.supportedClaimIds → claims`, `conflict.sourcesReviewed → sources`.

## 6. Correction-required claims (exact list)
**4 claims** carry `correctionRequired: true` — exactly the expected candidates:
| claimId | state | correction reason |
|---|---|---|
| `clm-kz-bybit-entity-003` | CONFIRMED_WITH_LIMITS | Clarify it holds for the core local trading platform, not automatically every ancillary program on bybit.kz. |
| `clm-kz-bybit-registration-002` | CONFIRMED_WITH_LIMITS | Do not publish the resident-only sentence as the complete current rule without the newer announcement + conflict note. |
| `clm-kz-bybit-offer-001` | CONFIRMED_WITH_LIMITS | Clarify referral-code entry exists, but cross-stack/global-code compatibility remains unverified. |
| `clm-kz-bybit-offer-002` | **CONTRADICTED** | Replace the old "no official bonus amount verified" claim: KZ-specific promotional amounts now exist, but user-segment eligibility & overlap with global maximums remain unresolved. |

**`clm-kz-bybit-offer-002` (the single CONTRADICTED claim)** — the review verifies a **Kazakhstan-local referral headline amount up to 1,032 USDT** and **a separate official Kazakhstan campaign with a 2,500 USDT prize pool**. This is **not** an authorization to display promo/CTA — `promoEligibilityAuthorized` and `ctaEligibilityAuthorized` remain **false**.

## 7. Conflict results
- **`cf-kz-bybit-001`** — residency / citizenship / foreign-national eligibility — status **PARTIALLY_RESOLVED** (MEDIUM). Kazakhstan citizens are the strongest confirmed segment (`CONFIRMED_WITH_LIMITS`); residents partially supported; foreign nationals unverified.
- **`cf-kz-bybit-002`** — `bybit.kz` vs `bybit.com` legal-entity / service-routing — status **PARTIALLY_RESOLVED** (MEDIUM). Carries a `routingMatrix` that keeps services **separate**: local platform (registration/kyc/spot/derivatives), KZT deposit & withdrawal, bank-card purchase, Bybit Card, referral stack, and promotions are each assessed individually rather than collapsed.

## 8. Offer-eligibility results
| Dimension | State |
|---|---|
| referral-code entry exists | CONFIRMED |
| global referral-code compatibility | **UNVERIFIED** |
| Kazakhstan citizens eligible | CONFIRMED_WITH_LIMITS (campaign limited to KZ citizens) |
| foreign-national offer eligibility | **UNVERIFIED** |
| official Kazakhstan promotion terms exist | CONFIRMED |
| global advertised maximum applies locally | **UNVERIFIED** |
| `promoEligibilityAuthorized` | **false** |
| `ctaEligibilityAuthorized` | **false** |

Net: local offer mechanics exist, but user-segment eligibility is **narrower and less settled than platform availability**; cross-stack referral interoperability and universal resident/foreign-national eligibility are not established.

## 9. Schema-normalization readiness — PASS (deterministic; no schema change)
The proposed transform into `schemas/market-intelligence/market-source.schema.json` is **deterministic** and requires **no schema modification**:
- `sourceTier` `TIER_A/B/C/D` → `A/B/C/D` (drop `TIER_` prefix). *(Note: this recovered review file already emits `A/B/C/D`.)*
- `sourceType` → `captureType` (`official_*` → `HTML`); discard the original field.
- **`REVIEWED` must not map blindly to `ACTIVE`** — map per-source `currentStatus` and attach a limitation note for snippet-only pages.
- `supportedClaimIds` → relocate **outside** market-source records (claim-link layer).
- `confidence`, `limitations` → do not fit the target schema; relocate to a QA/provenance layer / review report.
- **Owner/schema decisions still required** (do not resolve in normalization): `productScope` taxonomy (single vs multi-value), whether `claimType` is imported per-source or derived at claim-link time, `updatedDate` derivation source, and how to represent domain/entity-routing ambiguity when one domain hosts multiple legal-program stacks.

Net instruction (from the package): do **not** modify the target schema; normalize the recovered registry through a **separate transform layer**. No normalization was performed or written in this audit.

## 10. Owner-decision readiness — READY
The package is complete, coherent, and self-consistent: recommendation `AVAILABLE_WITH_LIMITS`/`MEDIUM` is internally supported (offer narrower than availability; conflicts preserved; the one CONTRADICTED claim is handled with a corrected, narrower statement; all authorizations false). It is suitable for an owner decision.

## 11. Import-preparation readiness — READY (import itself still blocked)
All five criteria are met: package integrity passes · all correction-required claims identified (4) · conflicts and offer boundaries remain explicit · normalization plan is deterministic · no schema modification required. Therefore the package is **ready for import *preparation*** (designing the transform + `exchange-market-cell` mapping). This is **not** import authorization — `IMPORT_AUTHORIZATION`, `PRODUCTION_CHANGE_AUTHORIZATION`, and `MIGRATION_5_AUTHORIZATION` all remain **false**, and the package is RECOVERED / UNVERIFIED.

## 12. Missing or damaged data
None. All 8 files present, parse, non-zero, UTF-8, no truncation; 0 dangling references.

## 13. Hash / recovery differences
**5/8 files byte-identical** to the report's declared original hashes (`review-run.json`, `conflict-resolution.json`, `offer-eligibility-review.json`, `schema-normalization-notes.json`, `import-readiness.json`). **3/8 differ** by **serialization only** — `source-verification.json`, `claim-verdicts.json`, `source-truth-review-report.md` — consistent with the supplied recovery audit. Differences are Markdown-transport serialization, not data loss (all three parse, counts match, references resolve). Label stays **RECOVERED / UNVERIFIED**; the recovered archive is not certified as the original.

## 14. Legacy-passport note
Legacy `research/geo/kazakhstan/exchanges/bybit.json` remains `in_progress` with mostly `UNKNOWN` states. This review presents materially stronger current evidence, but the delta must go through owner decision + MIGRATION reconciliation — the package must **not** silently overwrite the legacy passport. No passport change was made.

## 15. Recommended next task
**`CBW-KZ-BYBIT-P0A-OWNER-DECISION-AND-IMPORT-PREP-001`** — owner decision on the `AVAILABLE_WITH_LIMITS` review and the 4 correction-required claims (especially `offer-002`'s 1,032 USDT / 2,500 USDT amounts and their unresolved eligibility), then design the deterministic source-registry normalization transform and the `exchange-market-cell` mapping, resolving the flagged owner schema decisions (`productScope` taxonomy, `claimType` timing, `updatedDate` source, entity-routing representation). Import, CTA/promo, canonical MI-cell creation, and MIGRATION_5 remain blocked and separately owner-gated.
