# CBW — Kazakhstan × Bybit Owner Decision + Import-Preparation Design v1

| Field | Value |
|---|---|
| **Decision ID** | `CBW-KZ-BYBIT-P0A-OWNER-DECISION-AND-IMPORT-PREP-v1` |
| **Task** | `CBW-KZ-BYBIT-P0A-OWNER-DECISION-AND-IMPORT-PREP-001` |
| **Project** | CryptoBonusWorld · branch `master` · HEAD `9e21dce7cc59f22da31321b70ac6a6bfb2bf9e57` |
| **Country × Exchange** | Kazakhstan (`KZ`) × Bybit · batch `KZ-P0-A` |
| **Status** | `OWNER_APPROVED_DECISION_RECORD` |
| **Mode** | Owner decision record + deterministic transform **design only** (not executed) |
| **Date** | 2026-07-21 |

Based on the source-truth review audit ([json](../research-audits/CBW_KZ_BYBIT_P0A_SOURCE_TRUTH_REVIEW_PACKAGE_AUDIT_v1.json), committed `9e21dce`). Review package remains **RECOVERED / UNVERIFIED**. Companion machine-readable record: [CBW_KZ_BYBIT_P0A_OWNER_DECISION_AND_IMPORT_PREP_v1.json](CBW_KZ_BYBIT_P0A_OWNER_DECISION_AND_IMPORT_PREP_v1.json)

## 1. Owner availability decision
- **overallAvailability: `AVAILABLE_WITH_LIMITS`** · **confidence: `MEDIUM`** · **liveVerificationState: `NOT_LIVE_VERIFIED`** — accepted.
- Bybit is **overall available in Kazakhstan**; the primary presentation state is **positive/green**; exact limitations must remain visible; `AVAILABLE_WITH_LIMITS` is **not** presented as restricted or unavailable; ranking/CTA/promo are separate decisions.
- **Primary public-facing concept:** *"Available in Kazakhstan"*
- **Secondary limitation concept:** *"Some eligibility and service-routing limits apply"*

**Required visible limitation areas:**
1. registration/residency/citizenship rules remain partially resolved;
2. `bybit.kz` is the confirmed local route for core trading and KZT rails, but some `bybit.com` / card / referral routing remains partially resolved;
3. global referral-code compatibility remains unverified;
4. Kazakhstan promotional eligibility is narrower than platform availability;
5. local promotional amounts exist, but must **not** be confused with a globally advertised maximum;
6. `liveVerificationState` remains `NOT_LIVE_VERIFIED`.

## 2. Presentation-color decision (canonical)
| Availability | Primary color | Label | Secondary |
|---|---|---|---|
| AVAILABLE | **GREEN** | Available | — |
| **AVAILABLE_WITH_LIMITS** | **GREEN** | Available | **AMBER** "Some limits apply" + exact limitations; ranking-considerable when the limit doesn't block the core use case |
| CONFLICTING / UNDER_REVIEW | **AMBER** | — | no definitive positive commercial claim |
| UNKNOWN / STALE | **GRAY** | — | — |
| RESTRICTED / UNAVAILABLE | **RED** | — | no commercial CTA |

**Invariant:** amber is **never** the primary color for `AVAILABLE_WITH_LIMITS`. For Bybit × Kazakhstan: **primary = GREEN**, secondary limitation indicator = AMBER.

## 3. Ranking / CTA / promo separation
| Field | Value |
|---|---|
| availability | `AVAILABLE_WITH_LIMITS` |
| futureRankingCandidate | **true** |
| rankingEligibilityAuthorized | **false** |
| ctaEligibilityAuthorized | **false** |
| promoEligibilityAuthorized | **false** |
| productionChangeAuthorized | **false** |
| migration5Authorized | **false** |

`AVAILABLE_WITH_LIMITS` must **not** automatically activate a ranking, CTA, or promo. Future ranking review *may consider* Bybit (registration and core product access are supported), but ranking activation is a separate owner-gated task. Affiliate value never influences ranking.

## 4. Corrected-claim decisions (exactly four)
- **`clm-kz-bybit-entity-003`** — the Bybit Limited entity finding applies to the **core local trading platform** and must not automatically apply to every ancillary `bybit.kz` program.
- **`clm-kz-bybit-registration-002`** — the resident-only wording cannot be presented as the complete current rule without the newer foreign-national announcement and an explicit conflict note.
- **`clm-kz-bybit-offer-001`** — referral-code entry exists, but compatibility of a global referral code with Bybit Kazakhstan remains **unverified**.
- **`clm-kz-bybit-offer-002`** — replace the old "no Kazakhstan-specific amount verified" claim. Current reviewed evidence reports **two separate local programs**:
  - up to **1,032 USDT** on a local referral page;
  - a separate **2,500 USDT** Kazakhstan campaign prize pool.
  These are **different local programs** — **do not combine them**, **do not present them as one bonus**, **do not infer the global advertised maximum applies locally**, and **do not authorize a promo or CTA**.

## 5. Conflict decisions
**`cf-kz-bybit-001` — PARTIALLY_RESOLVED** (residency/citizenship/foreign-national):
- Kazakhstan citizens: **strongest confirmed segment**; residents: **supported with limits**; foreign nationals resident in KZ: **partially confirmed**; non-residents: **unverified**.

**`cf-kz-bybit-002` — PARTIALLY_RESOLVED** (`bybit.kz` / `bybit.com` entity & routing):
- registration / KYC / spot / derivatives / P2P / KZT deposit / KZT withdrawal → **local `bybit.kz` stack**;
- bank-card purchase → **unresolved routing**;
- Bybit Card → **local with limits**;
- referral/affiliate → **entity and interoperability unresolved**;
- promotions → **local programs exist but eligibility is campaign-specific**.

## 6. Deterministic normalization / import plan (designed, not executed)
No transform, normalized record, canonical claim record, or MI cell was created. The plan (full field-level detail in the JSON) covers four inputs:

1. **`source-verification.json` → normalized market-source records** (`market-source.schema.json`):
   - `sourceTier` `TIER_A/B/C/D → A/B/C/D` (ENUM_CONVERT); `sourceType → captureType` (`official_* → HTML`, discard original); **`currentStatus → status`** validated against `{ACTIVE,MOVED,REMOVED,SUPERSEDED,BLOCKED,STALE}` — **`REVIEWED` is never blindly mapped to `ACTIVE`**; `checkedDate → retrievedDate`; `updatedDate` from verified official page metadata only, else `null`.
   - `supportedClaimIds` → **removed** from market-source, relocated to a claim-source linkage plan; `confidence`/`limitations` → **preserved** in a QA/provenance sidecar (never silently discarded); `productScope`/`claimType` → **controlled decision required** (do not fabricate).
   - **Rejection:** any required target field (`sourceId,url,sourceTier,publisher,retrievedDate,status`) unresolved → reject the record for manual review; never force `ACTIVE`.
2. **`claim-verdicts.json` → normalized claim-review records** (structural contract; not a canonical MI-cell claim): `verifiedSources → sourceIds` (reject unresolvable id); `verificationState`/`confidence` enum-validated; **correction application** for the four claims (carry corrected text, never the superseded original; offer-002 keeps 1,032 and 2,500 USDT as two programs). Unknown/unverified stays unknown/unverified.
3. **`conflict-resolution.json` → normalized conflict records**: `status` kept `PARTIALLY_RESOLVED` for cf-001/cf-002; `routingMatrix` preserved per-service (never collapsed); never auto-resolved toward a convenient answer; production route unchanged.
4. **Reviewed findings → future `exchange-market-cell` CANDIDATE** — designed only (see §7), projected only under a separate owner-gated import task.

Plan is **deterministic** and requires **no schema modification**. Controlled decisions still required: `productScope` taxonomy, `claimType` timing, `updatedDate` source policy, entity-routing representation.

## 7. Future MI-cell candidate plan (design only — not created)
Overall: `overallAvailability: AVAILABLE_WITH_LIMITS` · `confidence: MEDIUM` · `liveVerificationState: NOT_LIVE_VERIFIED` · `rankingEligibility: false` · `ctaEligibility: false` · `promoEligibility: false`.

Product projection keeps **separate** (never flattened into the overall status): registration · KYC · spot · derivatives · margin · P2P · KZT P2P · direct KZT deposit · direct KZT withdrawal · cards · bank-card purchase · Bybit Card · referral · promotions. Each product status derives from its own claim/finding, not from `overallAvailability`.

## 8. Validation results (20/20)
1 overall `AVAILABLE_WITH_LIMITS` ✓ · 2 primary color GREEN ✓ · 3 secondary AMBER ✓ · 4 not restricted ✓ · 5 futureRankingCandidate true ✓ · 6–10 ranking/CTA/promo/production/migration5 authorized false ✓ · 11 exactly four correction claims ✓ · 12 both conflicts PARTIALLY_RESOLVED ✓ · 13 local amounts kept separate (1,032 & 2,500 USDT) ✓ · 14 global referral compatibility UNVERIFIED ✓ · 15 transform deterministic ✓ · 16 no schema modification required ✓ · 17 no records normalized/imported ✓ · 18 JSON parses ✓ · 19 MD/JSON agree ✓ · 20 production/runtime unchanged ✓.

## 9. Authorizations withheld
No import; no normalized/canonical records; no MI cell; no legacy-passport update; no production availability change; no ranking/CTA/promo activation; no page/route/translation; no MIGRATION_5; no transform execution. This record and its design are the only outputs.

## 10. Recommendation & next task
**APPROVE** — owner decision recorded, deterministic transform designed. Import, normalized-record creation, MI-cell creation, ranking/CTA/promo, legacy-passport update, and MIGRATION_5 remain blocked and owner-gated.

**Next task:** `CBW-KZ-BYBIT-P0A-IMPORT-EXECUTE-001` — owner-gated execution of the transform designed here (normalized market-source records + claim-source linkage + QA/provenance sidecar + conflict records; resolve the four controlled decisions; assemble the `exchange-market-cell` CANDIDATE, still not production). Ranking/CTA/promo activation and MIGRATION_5 remain separate later owner-gated tasks.
