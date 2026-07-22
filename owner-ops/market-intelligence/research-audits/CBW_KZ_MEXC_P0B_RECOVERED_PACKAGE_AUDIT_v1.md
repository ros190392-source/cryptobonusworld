# CBW — Kazakhstan × MEXC P0-B Recovered Package Audit v1 (READ-ONLY)

| Field | Value |
|---|---|
| **Audit ID** | `CBW-KZ-MEXC-P0B-RECOVERED-PACKAGE-AUDIT-v1` |
| **Task** | `CBW-KZ-MEXC-P0-B-RECOVERED-PACKAGE-AUDIT-002` |
| **Project** | CryptoBonusWorld · branch `master` · baseline HEAD `682e19e48d24a5c72aa89e2fd479dc6854d07047` |
| **Country × Exchange** | Kazakhstan (`KZ`) × MEXC · batch `KZ-P0-B` |
| **Mode** | Read-only recovered package audit (no web, no import, no commit/push/deploy) |
| **Date** | 2026-07-22 |
| **Package status** | RECOVERED / UNVERIFIED |

Companion machine-readable record: [CBW_KZ_MEXC_P0B_RECOVERED_PACKAGE_AUDIT_v1.json](CBW_KZ_MEXC_P0B_RECOVERED_PACKAGE_AUDIT_v1.json). Recovered ZIP audited from disk (`_handoff/mexc-p0b-source-review/`); temporary extraction deleted after validation. No official URLs verified online.

## Overall recommendation: **APPROVE** for source-truth review · **NOT** for import
The recovered package is structurally intact, identity-correct, count-correct, ID-unique, reference-complete, report/JSON coherent, and internally coherent toward **RESTRICTED / HIGH / BLOCKED**. It remains **RECOVERED / UNVERIFIED** and is **READY for independent source-truth review only**.

## 1. Files reviewed
Recovered ZIP (`CBW_KZ_MEXC_P0B_RESEARCH_PACKAGE_v1_RECOVERED.zip`, 30,728 B, sha `aa4ee0a0…`) + supplied integrity audit (`…INTEGRITY_AUDIT_v1.md`); MEXC dedicated queue; Kazakhstan master queue; MIGRATION_4 owner decision; Bybit closeout; authorities (MI Brain, Reconciliation Standard, Deep Passport Standard at `owner-ops/country-exchange/`); schemas; NO-PROXY rules; read-only legacy `research/geo/kazakhstan/exchanges/mexc.json`, `config/geo/kazakhstan.json`, `src/data/geoRankings.ts`. Nothing modified.

## 2. Outputs created
```
owner-ops/market-intelligence/research-audits/CBW_KZ_MEXC_P0B_RECOVERED_PACKAGE_AUDIT_v1.md
owner-ops/market-intelligence/research-audits/CBW_KZ_MEXC_P0B_RECOVERED_PACKAGE_AUDIT_v1.json
_handoff/CBW_KZ_MEXC_P0B_RECOVERED_PACKAGE_AUDIT_HANDOFF_v1.zip  (untracked, 5 flat entries)
```

## 3. Package identity — PASS
project CryptoBonusWorld · country Kazakhstan (KZ) · exchange MEXC (mexc) · batch KZ-P0-B · task `CBW-KZ-MEXC-P0-B-DEEP-RESEARCH-001` · package baseline `67bdca3…` · mode Official-source/NO-PROXY · liveVerificationState NOT_LIVE_VERIFIED. (Repo HEAD `682e19e` is newer because the MEXC queue was committed — not a mismatch.)

## 4. Package structure — PASS
ZIP opens; **exactly 8** entries; 0 duplicate/traversal/hidden/zero-byte/temp/unexpected; UTF-8 decodes for all 8; all 7 JSON parse. Files: `research-run.json`, `source-registry.json`, `claim-ledger.json`, `exchange-country-findings.json`, `conflicts.json`, `unknowns.json`, `publication-blockers.json`, `research-report.md`.

## 5. Actual counts and distributions
**sources 16 · claims 24 · conflicts 7 · unknowns 11 · publication-blockers 8** — all match the supplied integrity audit (0 mismatches).
- Source tiers: **A 5 / B 11** · source language: English 16.
- Claim categories: entity 1, routing 1, regulation 1, restrictions 1, registration 1, kyc 2, spot 1, derivatives 1, margin 1, other 2, p2p 1, kzt 1, direct-fiat 2, card-purchase 1, mobile-app 1, referral 2, promotions 2, publication 2.
- Claim confidence: **HIGH 17 / MEDIUM 5 / LOW 2**.
- Conflict status: RESOLVED_RESTRICTIVE 1 / RESOLVED_BY_SPECIFICITY 1 / **OPEN 4** / OPEN_POLICY_GATED 1.
- correctionRequired claims: **15** · contradicted-status claims: 0 · claims with no supportedSourceIds: **1** (`clm-kz-mexc-publication-002`, a task-authority boundary statement — acceptable).

## 6. ID and cross-reference — PASS
Source/claim/conflict/unknown/blocker IDs all unique · prefixes valid (`src-kz-mexc-`/`sup-kz-mexc-`/`clm-kz-mexc-`; 0 bad) · **0 dangling references, 0 duplicates, 0 references to absent records, 0 malformed IDs** across claim↔source, source↔claim, conflict↔source/claim, and findings references.

## 7. Report coherence — PASS
`research-report.md` reflects counts (16/24/7/11/8) and records RESTRICTED / HIGH / NOT_LIVE_VERIFIED / publication BLOCKED; the Markdown recovery appendix's embedded JSON matches the ZIP JSON (per integrity audit). No report-vs-JSON inconsistencies found.

## 8. Recommendation coherence — PASS
**RESTRICTED / HIGH / BLOCKED** follows from the package's own Tier-A restrictive claims: `clm-kz-mexc-restrictions-001` (KZ expressly listed as a Prohibited Jurisdiction in the **current** MEXC User Agreement) + `clm-kz-mexc-regulation-001` (AFSA unlicensed warning) + `registration-001` (no KZ registration) + `kyc-001` (no KZ KYC). Conflicting official app-support / P2P-KZT / fiat / Earn signals are held as **CONFLICTING claims + OPEN conflicts**, not as positive eligibility. Absence from the older prohibited list is treated as a conflict, not proof of eligibility. "Unlicensed" (regulation) is kept distinct from technical unavailability (restrictions). Global product presence is not treated as KZ eligibility (`referral-001` = SUPPORTED_GLOBAL_ONLY; `kzt-001` = CONFLICTING product signal). Legal / product / ranking / CTA / promo / publication eligibility are all separated (eligibility block: ranking/CTA/promo/publication UNAVAILABLE/BLOCKED; canonicalMiImport + migration5 NOT_AUTHORIZED). **Internally coherent — not independently source-verified.**

## 9. High-risk claims (source-truth review, most critical first)
| Claim | Priority | Note |
|---|---|---|
| `clm-kz-mexc-restrictions-001` — KZ expressly prohibited in **current** MEXC terms | **P0** | **Flips the earlier repository/production signal (KZ was ABSENT from the prohibited list).** sup 1 / contra 5 / correctionRequired. Verify exact current dated terms text. |
| `clm-kz-mexc-regulation-001` — AFSA named MEXC unlicensed toward KZ citizens | **P0** | Verify AFSA warning language/scope; "unlicensed" vs "prohibited". |
| `clm-kz-mexc-registration-001` — no KZ registration accepted | **P0** | Tied to current-terms + effective date. |
| `clm-kz-mexc-kyc-001` — KZ not eligible for KYC | **P0** | Verify dated KYC policy. |
| `clm-kz-mexc-p2p-001` / `kzt-001` — KZT P2P/currency signal (CONFLICTING) | **P1** | Product signal vs restriction. |
| `clm-kz-mexc-derivatives-001` | **P1** | Depends on restriction claim. |
| `clm-kz-mexc-direct-fiat-deposit-001` / `withdrawal-001` (UNKNOWN, LOW) | **P1** | Evidence gaps. |
| `clm-kz-mexc-referral-002` — referral-code KZ compatibility unverified | **P1** | Repo route/code = implementation only. |
| `clm-kz-mexc-promotions-001` (ended program) | **P2** | Verify dates. |
| `clm-kz-mexc-publication-001` — publication must remain blocked | **P2** | Derived; verify after P0. |

## 10. Recovery status
**RECOVERED / UNVERIFIED.** ZIP sha `aa4ee0a0…`, 30,728 B, 8 files. Original generated hashes **not available**; **no** file certifiable byte-identical to the original; all 8 reconstructed. **Semantic completeness established; byte-identical recovery NOT established.** Must remain RECOVERED / UNVERIFIED — do not promote to ORIGINAL / VERIFIED.

## 11. Final verdicts
```
PACKAGE_STRUCTURE:            PASS
JSON_PARSE_INTEGRITY:         PASS
PROJECT_TASK_IDENTITY:        PASS
COUNT_INTEGRITY:              PASS
ID_UNIQUENESS:                PASS
CROSS_REFERENCE_INTEGRITY:    PASS
REPORT_JSON_COHERENCE:        PASS
RECOMMENDATION_COHERENCE:     PASS
RECOVERY_INTEGRITY:           WARN  (semantic completeness PASS; cryptographic originality cannot be established)
SOURCE_TRUTH_REVIEW_READINESS: READY
IMPORT_READINESS:             NOT_READY
IMPORT_AUTHORIZATION:         false
PRODUCTION_CHANGE_AUTHORIZATION: false
MIGRATION_5_AUTHORIZATION:    false
```

## 12. Source-truth review readiness & import readiness
**SOURCE_TRUTH_REVIEW_READINESS: READY** (intact, coherent, all references resolve). **IMPORT_READINESS: NOT_READY** — source-truth review incomplete; package RECOVERED/UNVERIFIED.

## 13. Authorization boundaries (all false)
researchImport · canonicalImport · productionChange · rankingChange · ctaChange · promoChange · affiliateRouteChange · publication · migration5 · deploy — **all false**.

## 14. Next task
**`CBW-KZ-MEXC-P0-B-SOURCE-TRUTH-REVIEW-001`** — owner-gated independent source-truth review verifying the P0 high-risk claims (esp. `clm-kz-mexc-restrictions-001`, which flips the earlier repository signal, plus `regulation-001`, `registration-001`, `kyc-001`) against tiered dated official sources, then an owner decision. Import, canonical MI, and MIGRATION_5 remain blocked. Do not reopen Bybit; do not start OKX/Bitget/KuCoin/BingX.
