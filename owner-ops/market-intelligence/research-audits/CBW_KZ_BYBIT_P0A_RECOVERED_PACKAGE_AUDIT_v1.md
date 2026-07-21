# CBW — Kazakhstan × Bybit Recovered Deep-Research Package Audit v1

| Field | Value |
|---|---|
| **Audit ID** | `CBW-KZ-BYBIT-P0A-RECOVERED-PACKAGE-AUDIT-v1` |
| **Task** | `CBW-KZ-BYBIT-P0A-RECOVERED-PACKAGE-AUDIT-001` |
| **Project** | CryptoBonusWorld · branch `master` · HEAD `208501012e389f850bc8433420813ac6bf4e7c99` |
| **Country × Exchange** | Kazakhstan (`KZ`) × Bybit · batch `KZ-P0-A` |
| **Date** | 2026-07-21 |
| **Mode** | Read-only recovered-package audit · no web browsing · no import |
| **Package status** | **RECOVERED / UNVERIFIED** |

Companion machine-readable audit: [CBW_KZ_BYBIT_P0A_RECOVERED_PACKAGE_AUDIT_v1.json](CBW_KZ_BYBIT_P0A_RECOVERED_PACKAGE_AUDIT_v1.json)

## Verdicts

| Dimension | Verdict |
|---|---|
| PACKAGE_INTEGRITY | **PASS** |
| SEMANTIC_COMPLETENESS | **PASS** |
| CROSS_REFERENCE_INTEGRITY | **PASS** |
| SCHEMA_COMPATIBILITY | **WARN** |
| CRYPTOGRAPHIC_ORIGINALITY | **WARN** |
| SOURCE_TRUTH_VERIFICATION | **NOT_PERFORMED** |
| **IMPORT_READINESS** | **READY_FOR_SOURCE_REVIEW** |

**Recommendation: APPROVE_FOR_SOURCE_REVIEW.** The recovered package is technically intact, structurally coherent, and internally consistent, but it is **not** ready for import: source truth is unverified, the source-registry needs schema normalization, and the archive is not byte-identical to the unavailable original.

## 1. Inputs reviewed (read-only, not modified)
- `C:\Users\ros19\Downloads\CBW_KZ_BYBIT_P0A_RESEARCH_PACKAGE_v2_RECOVERED.zip` — 23022 bytes, sha256 `7796d015c123e4b1c1dc39724740c13bc001399e2763f5b073d84e867eb3a854` (matches document 2's declaration).
- `C:\Users\ros19\Downloads\CBW_KZ_BYBIT_P0A_RECOVERY_INTEGRITY_AUDIT_v1.md`
- `C:\Users\ros19\Downloads\deep-research-report (3).md` (FULL PACKAGE RECOVERY APPENDIX)

Extracted only to an OS temp directory for inspection; the temp extraction is deleted after the audit. Repository authorities (research queue, MIGRATION_4 decision, MI Brain, reconciliation standard, MI schemas, `config/geo/kazakhstan.json`, legacy `research/geo/kazakhstan/exchanges/bybit.json`, NO-PROXY mode) were read in full for comparison.

## 2. Package integrity — PASS
- ZIP opens without error; extracts cleanly.
- Contains **exactly the eight** required files: `research-run.json`, `source-registry.json`, `claim-ledger.json`, `exchange-country-findings.json`, `conflicts.json`, `unknowns.json`, `publication-blockers.json`, `research-report.md`.
- No nested directory, no duplicate entry, no hidden file, no temp/executable file, no path traversal, **no zero-byte file**, no truncated file.

## 3. JSON audit — PASS
- All seven JSON files decode as UTF-8 and parse. Root types: `research-run.json` object; `source-registry.json`/`claim-ledger.json`/`conflicts.json`/`unknowns.json`/`publication-blockers.json` arrays; `exchange-country-findings.json` object.
- No accidental Markdown fences, no ellipsis/placeholder-instead-of-data, no unfinished placeholders.
- No malformed date **fields** were found. (Two `dateComparison` values in `conflicts.json` contain dates inside narrative prose — these are free-text explanation fields, not date fields, and are non-blocking.)
- Required-boolean fields present as booleans (`productionChangeAuthorized`, `migration5Authorized`, `rankingEligibilityAuthorized`, `ctaEligibilityAuthorized`, `promoEligibilityAuthorized` all `false`).

## 4. Count consistency — PASS
| Metric | Declared | Actual | OK |
|---|---:|---:|:--:|
| sourcesReviewed | 39 | 39 | ✓ |
| Tier A | 8 | 8 | ✓ |
| Tier B | 29 | 29 | ✓ |
| Tier C | 2 | 2 | ✓ |
| Tier D | 0 | 0 | ✓ |
| claimsReviewed | 41 | 41 | ✓ |
| conflictsFound | 2 | 2 | ✓ |
| unknownsRemaining | 6 | 6 | ✓ |
| publication blockers | 5 | 5 | ✓ |
| proposedOverallAvailability | AVAILABLE_WITH_LIMITS | AVAILABLE_WITH_LIMITS | ✓ |
| confidence | MEDIUM | MEDIUM | ✓ |
| liveVerificationState | NOT_LIVE_VERIFIED | NOT_LIVE_VERIFIED | ✓ |
| productionChangeAuthorized | false | false | ✓ |
| migration5Authorized | false | false | ✓ |
| ownerReviewRequired | true | true | ✓ |

## 5. ID and cross-reference integrity — PASS
- Source / claim / conflict / unknown / blocker IDs are all **unique** (0 duplicates).
- **0 dangling references** across every tested relationship: claim→source, claim→conflict, source→claim, conflict→claim, conflict→source, unknown→claim, unknown→source, blocker→claim, findings→claim, findings→source.
- Minor asymmetry (LOW): three corroborating sources — `src-kz-bybit-002` (AFSA activity guidance), `src-kz-bybit-013` (KYC how-to), `src-kz-bybit-015` (KYC failure reasons) — declare `supportedClaimIds`, but the referenced claims do not list them back in `sourceIds`. Not broken; one-directional linkage only.

## 6. Recovery-appendix comparison & hash audit — WARN (cryptographic originality)
All eight files are **semantically identical** to the recovery appendix, but **0/8 are byte-identical to the Deep Research report's declared original hashes**. All differences are serialization-only; **no substantive difference** was found in any file.

| File | ex.bytes | dec.bytes | exact? | semantic≡appendix | classification |
|---|---:|---:|:--:|:--:|---|
| research-run.json | 1401 | 1350 | no | yes | serialization-only (unreproduced) |
| source-registry.json | 29733 | 29702 | no | yes | serialization-only (unreproduced) |
| claim-ledger.json | 28854 | 28818 | no | yes | serialization-only (reproduced: indent2+unicode) |
| exchange-country-findings.json | 7538 | 7539 | no | yes | serialization-only (unreproduced) |
| conflicts.json | 3159 | 3160 | no | yes | unicode-escaping-only |
| unknowns.json | 4561 | 4562 | no | yes | serialization-only (unreproduced) |
| publication-blockers.json | 2893 | 2894 | no | yes | unicode-escaping-only |
| research-report.md | 21762 | 22007 | no | yes | serialization-only (unreproduced) |

This confirms document 2's finding independently. The recovered ZIP **cannot** be certified as the original archive; label stays **RECOVERED / UNVERIFIED**. The mismatches are consistent with JSON Unicode-escaping, indentation, and final-newline normalization during Markdown transport — not data loss.

## 7. Schema compatibility — WARN
- **`source-registry.json` does not validate against the committed `schemas/market-intelligence/market-source.schema.json`:**
  - `sourceTier` uses `TIER_A/TIER_B/TIER_C` — schema enum is `A/B/C/D`.
  - `status` uses `REVIEWED` — schema enum is `ACTIVE/MOVED/REMOVED/SUPERSEDED/BLOCKED/STALE`.
  - field-name differences: `supportedClaimIds`, `sourceType`, `publishedDate`, `effectiveFrom` vs the schema's `captureType`/`retrievedDate`. All schema-*required* fields (`sourceId,url,sourceTier,publisher,retrievedDate,status`) are present by name.
- **The other six package files have no committed schema** (`research-run`, `claim-ledger`, `exchange-country-findings`, `conflicts`, `unknowns`, `publication-blockers`, plus `research-report.md`). They were checked by **STRUCTURAL CONTRACT VALIDATION** only; no full schema validation is claimed. Repository schemas were not modified.
- `exchange-country-findings.json` is a findings shape, **not** an `exchange-market-cell` instance; mapping to `exchange-market-cell.schema.json` (with its enums) would be required to ever create a canonical MI cell — which this task does not do.

## 8. Queue coverage matrix (28 required Bybit areas)
**COMPLETE 22 · PARTIAL 2 · MISSING 2 · CONFLICTING 2 · NOT_APPLICABLE 0.**

- **CONFLICTING:** registration (KZ-resident guide vs 2026-01-26 foreign-nationals announcement, `cf-kz-bybit-001`); cards (local vs global `bybit.com` routing, `cf-kz-bybit-002`).
- **PARTIAL:** KZT spot (pairs live but exact list unrecovered, `unk-003`); support (support-language coverage unresolved, `unk-005`).
- **MISSING:** third-party payment providers (`UNKNOWN`, `unk-004`); offer eligibility (`UNKNOWN`, `blk-003`/`unk-006`).
- **COMPLETE (22):** legal entity, jurisdiction, KYC, restricted-country terms, spot, derivatives, margin/leverage, P2P, KZT P2P, direct KZT fiat deposit, direct KZT fiat withdrawal, bank transfer, iOS, Android, language, regulation, checked dates, confidence, source IDs, unknowns, publication blockers, next-review dates.

Claim count alone was **not** treated as coverage; each area was assessed on evidence quality and conflict/unknown status.

## 9. Semantic coherence — PASS
- Findings recommendation `AVAILABLE_WITH_LIMITS` matches `research-run.json`; **not** used as an unqualified `AVAILABLE`.
- `offerEligibility` = `UNKNOWN`; `rankingEligibilityAuthorized`/`ctaEligibilityAuthorized`/`promoEligibilityAuthorized` all `false`.
- KZT P2P is kept **separate** from direct KZT fiat; both routing ambiguity (`bybit.kz` vs `bybit.com`) and the registration residency/citizenship conflict are **preserved**, not hidden.
- Regulation is framed as a **regulated footprint, not a safety endorsement**; the AFSA 2025-04-17 forged-licence alert is correctly described as impersonation, not enforcement against Bybit Limited.
- Blockers reflect the recommendation (owner review pending, registration unresolved, offer unresolved, production discrepancy, routing unresolved).

## 10. Overstrong / unsupported claims
- **None overstate availability beyond the evidence.**
- Two claims rest **solely on snippet-only sources** and are appropriately hedged (MEDIUM + limitations), but require full-body reconfirmation before import: `clm-kz-bybit-registration-004` (foreign-nationals expansion → only `src-032`) and `clm-kz-bybit-restrictions-002` (global restricted list → only partially-captured `src-008`).

## 11. Source metadata — PASS (with notes)
No duplicate URLs, no malformed URLs, all `contentHash` values are 64-hex, no future-dated source relative to `completedDate` 2026-07-21. Snippet-only sources: `src-008`, `src-032`. Tier values `TIER_A/B/C`; statuses all `REVIEWED` (see schema gap). URLs were **not** opened — metadata validation only.

## 12. Legacy GEO passport comparison
Legacy `research/geo/kazakhstan/exchanges/bybit.json` (`research_status: in_progress`) preserves mostly `UNKNOWN` availability with `products.p2p = PARTIAL` and no conflicts. The package presents materially broader, newer official evidence (registration, mandatory KYC, spot, derivatives, KZT P2P, direct KZT bank-transfer rails, apps, cards). This delta must go through owner review + MIGRATION reconciliation; the package must **not** silently overwrite the legacy passport (captured as blocker `blk-kz-bybit-004`).

## 13. Additional checks required before accepting AVAILABLE_WITH_LIMITS
1. Separate **source-truth verification** of the 8 Tier A + critical Tier B URLs (not performed here; no web).
2. Full-body reconfirmation of snippet-only `src-032` and `src-008`.
3. Resolve `cf-kz-bybit-001` (residency vs citizenship) and `cf-kz-bybit-002` (bybit.kz vs bybit.com routing).
4. Verify KZ referral/promo/offer eligibility before any CTA/promo.
5. Normalize `source-registry.json` to `market-source.schema.json` enums/field names before import.
6. Owner review + MIGRATION reconciliation of legacy passport vs package evidence.

## 14. Authorizations withheld
No import; no canonical MI cell; no compiled matrix; no legacy-passport update; no Bybit production availability change; no ranking/CTA/promo; no page/route/translation; no MIGRATION_5; no commit/push/deploy performed by this audit (the two audit records + one handoff ZIP are the only outputs).

## 15. Import readiness
**READY_FOR_SOURCE_REVIEW.** A technically sound recovered package that is coherent and complete enough for source review, but is **NOT_READY** for import because: source truth is unverified, schema normalization is pending, and cryptographic originality cannot be proven (RECOVERED/UNVERIFIED).

## 16. Next task
**`CBW-KZ-BYBIT-P0A-SOURCE-TRUTH-REVIEW-001`** — owner/analyst source-truth verification of the Tier A + critical Tier B URLs, resolution of `cf-kz-bybit-001`/`002` and offer eligibility, then source-registry schema normalization. Import remains blocked until then; no MI cell, ranking, CTA, promo, route, page, translation, or MIGRATION_5 is authorized.
