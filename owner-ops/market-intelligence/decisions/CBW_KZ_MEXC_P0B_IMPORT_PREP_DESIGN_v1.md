# CBW — Kazakhstan × MEXC P0-B Import Preparation Design v1 (DESIGN-ONLY)

| Field | Value |
|---|---|
| **Design ID** | `CBW-KZ-MEXC-P0B-IMPORT-PREP-DESIGN-v1` |
| **Task** | `CBW-KZ-MEXC-P0-B-IMPORT-PREP-DESIGN-002` |
| **Project** | CryptoBonusWorld · branch `master` · baseline HEAD `6f922cdff5caf0a6fb0f5eeff7618ea895234c73` |
| **Country × Exchange** | Kazakhstan (`KZ`) × MEXC · batch `KZ-P0-B` |
| **Mode** | Design-only import preparation (no transform executed, no staging written, no schema modified, no commit/push/deploy) |
| **Date** | 2026-07-22 |
| **Package status** | RECOVERED / UNVERIFIED |

Companion machine-readable record: [CBW_KZ_MEXC_P0B_IMPORT_PREP_DESIGN_v1.json](CBW_KZ_MEXC_P0B_IMPORT_PREP_DESIGN_v1.json). Source-truth input: `_handoff/mexc-p0b-source-truth-result/CBW_KZ_MEXC_P0B_SOURCE_TRUTH_REVIEW_v1.zip` (27,833 B, SHA-256 `f7658b5f7bddc29d24fd09a2c06de09d2dcfe65e6de64cc40e91c0399a380c5f` — the cryptographically identical fallback path explicitly allowed by the task; the `_RECOVERED`-named path is absent). Temporary extraction inspected in the OS temp directory and deleted. Baseline facts preserved throughout: RESTRICTED / HIGH / NOT_LIVE_VERIFIED / RECOVERED-UNVERIFIED / publication BLOCKED / RED "Restricted in Kazakhstan" / technicalSiteReachability NOT_DETERMINED. RESTRICTED is never reinterpreted as confirmed technical inaccessibility.

## 1. Schema Decision 1 — scope cardinality: **RESOLVED**

`schemas/market-intelligence/market-source.schema.json` was inspected directly (`additionalProperties: false`):

- **`productScope` — exact schema type: `array` of `string`** (unconstrained tokens). → **Sorted unique arrays approved.**
- **`countryScope` — the schema has NO `countryScope` field.** The only country field is scalar **`countryCode`** (`string | null`). Arrays are not representable and any extra field is rejected by `additionalProperties: false`.

Resolution:

| Aspect | Rule |
|---|---|
| countryCode | Constant `"KZ"` for all 16 normalized sources (every source was reviewed for the KZ cell). Deterministic; no invention. |
| Review countryScope arrays | The review's array values (e.g. `["Global","Kazakhstan explicitly named"]`, `["38 supported countries","Kazakhstan absent"]`) are **not representable** in the source record → preserved **verbatim per-source in qa-provenance** (non-lossy linkage-side solution; no arbitrary primary value chosen). |
| productScope derivation | `productScope(source) = sorted unique set of claim categories of every claim linked to the source via a SUPPORTS or CONTRADICTS link`, where claim category is the token parsed deterministically from the claimId (`clm-kz-mexc-<category>-NNN` → `<category>`, e.g. `restrictions`, `kyc`, `p2p`, `direct-fiat-deposit`). Scope derives **only** from verified claim-source relationships — never from URL, title or publisher. Multi-product sources (e.g. `src-kz-mexc-terms-001` linked to 16 claims) keep every applicable category; nothing is flattened to one lossy product. |
| Ordering | Lexicographic ascending (byte-wise on ASCII tokens). |
| Duplicate removal | Set semantics before sort; duplicates impossible in output. |
| Empty scope | A normalized source with zero links → **rejection** (every reviewed source must justify inclusion via at least one relationship; all 16 currently have ≥1). |
| Rejection condition | Unparseable claimId (no category token) → stop without writing. |

Schema not modified.

## 2. Schema Decision 2 — claim-source linkage placement: **RESOLVED**

Canonical relationship model: **market-source records contain source facts only; claim relationships live in a separate linkage registry** (`claim-source-links.json`, one record per claim/source/relationship combination). This is required, not optional: the source schema's `additionalProperties: false` forbids `supportedClaimIds`/`contradictedClaimIds`, and they are never silently reinserted.

Exact future linkage record:

```json
{
  "linkId": "<claimId>|<sourceId>|<relationship>",
  "claimId": "clm-kz-mexc-…",
  "sourceId": "src-kz-mexc-…",
  "relationship": "SUPPORTS | LIMITS | CONTRADICTS | CONTEXT",
  "verificationState": "<claim verdict: CONFIRMED | CONFIRMED_WITH_LIMITS | UNVERIFIED | …>",
  "confidence": "<claim confidence: HIGH | MEDIUM | LOW>",
  "checkedDate": "<source checkedDate, YYYY-MM-DD>",
  "provenance": "claim-verdicts.verifiedSourceIds | claim-verdicts.contradictingSourceIds",
  "note": "<claim limitation or contradiction note, or null>"
}
```

Rules: `linkId` is deterministic (`claimId|sourceId|relationship` — extends the Bybit `claimId|sourceId` precedent with the relationship segment so a pair that both supports one claim and contradicts another claim's context stays unique); all claim and source IDs must resolve against the normalized sets; duplicate `linkId` → rejection; the original relationship direction from the review package is preserved verbatim; contradictory evidence remains explicit as `CONTRADICTS` records. Derivation from this package produces **41 SUPPORTS + 14 CONTRADICTS = 55 links, 0 duplicates** (derived — see §14). `LIMITS`/`CONTEXT` are legal values for future packages; this package derives 0 of each (claim limitations ride as `note` text on the derived links and in provenance).

## 3. Schema Decision 3 — verification provenance: **RESOLVED**

`qa-provenance.json` is the staging QA/provenance sidecar (no repository schema constrains it; QA-only data never enters schema-constrained source records). Exact top-level shape:

```json
{
  "transformVersion": "kz-mexc-p0b-v1",
  "packageStatus": "RECOVERED / UNVERIFIED",
  "reviewedRecommendation": "RESTRICTED",
  "confidence": "HIGH",
  "liveVerificationState": "NOT_LIVE_VERIFIED",
  "technicalSiteReachability": "NOT_DETERMINED",
  "ownerDecisionRefs": {
    "ownerDecision": "CBW-KZ-MEXC-P0B-OWNER-DECISION-v1 @ 6f922cdff5caf0a6fb0f5eeff7618ea895234c73",
    "sourceTruthReviewAudit": "CBW-KZ-MEXC-P0B-SOURCE-TRUTH-REVIEW-PACKAGE-AUDIT-v1 @ 5aa41f01b8d899223be925faaea01093c3125b6e",
    "recoveredPackageAudit": "CBW-KZ-MEXC-P0B-RECOVERED-PACKAGE-AUDIT-v1"
  },
  "inputPackages": [
    { "name": "CBW_KZ_MEXC_P0B_SOURCE_TRUTH_REVIEW_v1_RECOVERED.zip", "bytes": 27833, "sha256": "f7658b5f…", "role": "source-truth review package (recovered)" },
    { "name": "ORIGINAL (unavailable)", "bytes": 37001, "sha256": "3f0e10d2…", "role": "declared original — bytes unavailable, not certifiable" },
    { "name": "CBW_KZ_MEXC_P0B_RESEARCH_PACKAGE_v1_RECOVERED.zip", "bytes": 30728, "sha256": "aa4ee0a0…", "role": "recovered original research package" }
  ],
  "perSource": { "<sourceId>": { "sourceOrigin": "…", "verificationStatus": "…", "pageStatus": "…", "checkedDate": "…", "reviewCountryScope": ["…verbatim array…"], "legalEntityScope": "…", "limitations": ["…"], "verifiedEvidence": "…", "reviewNotes": ["…"], "statusMappingNote": "…" } },
  "perClaim": { "<claimId>": { "originalStatement": "…", "verifiedStatement": "…", "verdict": "…", "confidence": "…", "correctionRequired": true, "correctionNote": "…", "limitations": ["…"], "publicationUse": "…", "rankingUse": "…", "ctaUse": "…", "promoUse": "…" } },
  "termsPageFlip": { "state": "CURRENT_RESTRICTIVE_SOURCE_ACCEPTED_WITH_MONITORING", "…": "see §6/§11" },
  "afsaInterpretation": { "finding": "CONFIRMED", "meaning": "UNLICENSED_OR_UNAUTHORIZED_LOCAL_ACTIVITY", "technicalUnavailabilityProof": false },
  "unresolvedEvidence": ["…verbatim from PARTIALLY_RESOLVED conflicts…"],
  "authorizations": { "granted": ["ownerDecisionCompleted", "importPreparationDesignAuthorized"], "withheld": ["researchImport", "normalizationExecution", "stagingImport", "canonicalImport", "legacyGeoUpdate", "productionChange", "rankingChange", "ctaChange", "promoChange", "affiliateRouteChange", "referralCodeActivation", "publication", "migration5", "pageOrRouteChange", "deploy"] },
  "importHistory": []
}
```

Preserved at minimum (all mandated items): RECOVERED/UNVERIFIED; unavailable-original + recovered ZIP metadata; STR package metadata; per-source verification status / checked date / page status / limitations; per-claim original + verified statements, verdict, confidence, correctionRequired + correctionNote; terms-page flip monitoring state; AFSA interpretation boundary; unresolved evidence; owner-decision references; granted and withheld authorizations; import history. Provenance loss ⇒ rejection (see §15).

## 4. Schema Decision 4 — contradictory sources: **RESOLVED**

| Layer | Representation |
|---|---|
| **claim-source-links** | 14 explicit `relationship: "CONTRADICTS"` records (e.g. `clm-kz-mexc-restrictions-001|src-kz-mexc-app-countries-001|CONTRADICTS`). All original `contradictingSourceIds` preserved 1:1. |
| **Source records** | Remain factual. A source is never marked globally unreliable (status downgraded) merely because it contradicts a claim; its `status` derives only from its own verification/page status (§5). |
| **qa-provenance** | Per-claim contradicting IDs verbatim; per-source review notes; `unresolvedEvidence` verbatim. |
| **normalized-conflicts** | 7 records retain `sourcesReviewed` (resolved ones included) and `unresolvedEvidence` (all four PARTIALLY_RESOLVED keep theirs); terms-page flip stays explicit inside `cf-kz-mexc-terms-vs-regulator` plus the dedicated provenance block. |
| **Candidate reason codes** | `RESTRICTED_BY_CURRENT_TERMS_PROHIBITED_JURISDICTION`, `AFSA_UNLICENSED_WARNING_SUPPORTING`, `TERMS_PAGE_FLIP_MONITORING_REQUIRED`, `CONFLICTING_PRODUCT_SIGNALS_PRESERVED`, `DIRECT_FIAT_RAILS_UNVERIFIED`, `REFERRAL_KZ_COMPATIBILITY_UNVERIFIED`, `RECOVERED_PACKAGE_UNVERIFIED`. |

Current restrictive evidence (`src-kz-mexc-terms-001`) controls the candidate decision; earlier captures remain provenance/monitoring evidence; no contradiction is deleted after the owner decision.

## 5. Source normalization design (deterministic; not executed)

Mapping `source-verification.json.originalSources[16]` → `normalized-sources.json` (each record an exact `market-source.schema.json` instance):

| Target field | Source | Rule |
|---|---|---|
| sourceId | sourceId | verbatim |
| exchangeId | — | constant `"mexc"` |
| countryCode | — | constant `"KZ"` (Decision 1) |
| productScope | derived | Decision 1 rule (sorted unique claim categories via links) |
| claimType | — | `null` (multi-product sources; category detail lives in links) |
| url | verifiedUrl, else originalUrl | deterministic fallback; which-used recorded in provenance |
| sourceTier | sourceTier | `TIER_A→"A"`, `TIER_B→"B"` (`TIER_C→"C"`, `TIER_D→"D"` reserved); unknown token → reject |
| publisher / title | verbatim | — |
| publishedDate | publishedDate | verbatim or null |
| updatedDate | lastUpdatedDate | rename |
| effectiveFrom / effectiveTo | effectiveDate / — | rename; `effectiveTo` null |
| retrievedDate | checkedDate | rename (schema-required; all = `2026-07-22`) |
| language | language | `English→"en"`, `Russian→"ru"`, `Kazakh→"kk"`; unknown → reject |
| contentHash | — | `null` (recovered package preserves no hashes) + provenance note |
| evidenceSummary | verifiedEvidence | rename |
| quotedClaim | — | `null` |
| captureType | sourceType | deterministic table: **all 16 observed `sourceType` tokens (LEGAL_TERMS, REGULATOR_WARNING, HELP_CENTER_*, OFFICIAL_*, PRODUCT_LEGAL_TERMS, KYC_POLICY_GUIDANCE, OFFICIAL_CAMPAIGN_PAGE) → `"HTML"`** (all are live web pages reviewed without proxy); `sourceType` verbatim in provenance; unmapped token → reject |
| **status** | verificationStatus × pageStatus | table below — never a blind map to ACTIVE |

**Status decision table** (schema enum: ACTIVE, MOVED, REMOVED, SUPERSEDED, BLOCKED, STALE):

| Review verificationStatus | Mapping | Provenance note |
|---|---|---|
| VERIFIED_CURRENT | `ACTIVE` | pageStatus recorded |
| VERIFIED_WITH_LIMITS | `ACTIVE` — justified per-source: all six carry live-current pageStatus (`CURRENT_BUT_CONFLICTING`/`LIVE_PAGE_BUT_CONFLICTING`/`CURRENT_BUT_NON_DECISIVE`/`CURRENT_GLOBAL_FLOW`); the LIMITS live in links + provenance, not in the status enum | mandatory `statusMappingNote` |
| OUTDATED | `STALE` (schema has no ARCHIVED; STR's suggested `ARCHIVED` is honored as `STALE` + note) | mandatory note (`ENDED_HISTORICAL`) |
| MOVED / SUPERSEDED / REMOVED / BLOCKED | same-named enum value | note |
| NOT_VERIFIABLE | `STALE` + provenance note + ownerReview flag | mandatory |
| CONTRADICTED | `ACTIVE` if pageStatus is CURRENT_*-class, else `STALE`; contradiction expressed via CONTRADICTS links, never via source status | mandatory + ownerReview flag |

Expected output distribution for this package: **ACTIVE 15 · STALE 1** (from 9 VERIFIED_CURRENT + 6 VERIFIED_WITH_LIMITS → ACTIVE; 1 OUTDATED → STALE). Unmappable status combination → rejection. Ordering: records sorted by `sourceId` ascending.

## 6. Claim normalization design (staging-only; not canonical)

`claim-review.json` — 24 records (no repository schema applies; staging shape):

```json
{
  "claimId": "…", "category": "<parsed from claimId>",
  "originalStatement": "…verbatim…", "verifiedStatement": "…verbatim…",
  "verdict": "CONFIRMED | CONFIRMED_WITH_LIMITS | UNVERIFIED",
  "confidence": "HIGH | MEDIUM | LOW",
  "verifiedSourceIds": [...], "contradictingSourceIds": [...],
  "limitations": [...],
  "correctionRequired": true, "correctionNote": "…verbatim…",
  "publicationUse": "…", "rankingUse": "…", "ctaUse": "…", "promoUse": "…",
  "ownerReviewRequired": true
}
```

- **Preserved:** all 24 claims; all original + verified statements verbatim side-by-side; all verdicts; all source relationships; all confidence values; all limitations; all **15 correction decisions** with notes; publication/ranking/CTA/promo use boundaries verbatim.
- **Correction application policy:** corrections are **recorded, never applied** — no legacy GEO text is rewritten by staging; the corrected (verified) statement is the future editorial source of truth, the original stays for diff/audit.
- **Status enum mapping:** review verdicts kept verbatim (no coercion into any schema enum; no canonical claim record exists in this phase).
- **Owner-review flags:** `ownerReviewRequired: true` where `correctionRequired` is true or verdict is `UNVERIFIED`; plus all claims referenced by PARTIALLY_RESOLVED conflicts.
- **Rejection conditions:** ≠24 records; missing any of the 14 review fields; unknown verdict token; dangling source reference; correction count ≠ 15.
- Ordering: by `claimId` ascending.

## 7. Conflict normalization design

`normalized-conflicts.json` — 7 free-form records (Bybit-precedent shape), preserving exactly **2 RESOLVED_RESTRICTIVE · 4 PARTIALLY_RESOLVED · 1 RESOLVED_BY_SPECIFICITY** and per record: `conflictId, originalStatus, finalStatus, sourcesReviewed, claimsReviewed, currentAssessment, unresolvedEvidence, ownerReviewRequired` (all verbatim; `ownerReviewRequired: true` on all seven).

**restriction-event.schema.json is NOT applied**: it was checked per-record — its required fields (`eventId`, `eventType`, `detectedDate`, `reviewStatus`) and `additionalProperties: false` do not accommodate `conflictId/originalStatus/finalStatus/currentAssessment/unresolvedEvidence`; no record actually conforms, so none is forced into it. No remaining partial conflict is auto-resolved. Ordering: by `conflictId` ascending.

## 8. Non-production candidate design (not created)

`exchange-market-cell.candidate.json`, **OPTION A wrapper** `{ "candidateMetadata": {...}, "cell": {...} }`.

`candidateMetadata` (exact): `recordState: "CANDIDATE"` · `canonical: false` · `productionEligible: false` · `migration5Authorized: false` · `futureRankingCandidate: false` · `primaryVisualState: "RED"` · `primaryLabel: "Restricted in Kazakhstan"` · `secondaryLabel: "MEXC’s current terms list Kazakhstan as a prohibited jurisdiction"` · `packageStatus: "RECOVERED / UNVERIFIED"` · `termsPageFlipMonitoringRequired: true` · `technicalSiteReachability: "NOT_DETERMINED"` · `provenance` (owner-decision commit `6f922cd…`, STR-audit commit `5aa41f0…`, input package hashes) · `blockedAuthorizations` (the 15 withheld flags).

`cell` — designed as an exact `exchange-market-cell.schema.json` instance (schema conformance verified in design):

| Cell field | Value | Schema check |
|---|---|---|
| exchangeId / countryCode | `"mexc"` / `"KZ"` | ✅ |
| exchangeLegalEntity | `null` (no KZ-specific entity identified) | ✅ nullable |
| overallAvailability | `"RESTRICTED"` | ✅ in enum |
| registrationStatus | `"RESTRICTED"` | ✅ free string |
| productStatuses | exact owner projection — `registration: RESTRICTED`, `kyc: RESTRICTED`, `spot: RESTRICTED`, `derivatives: RESTRICTED`, `margin: RESTRICTED`, `copy_trading: RESTRICTED_WITH_PRODUCT_DETAIL_UNVERIFIED`, `p2p: CONFLICTING`, `kzt_p2p: CONFLICTING`, `direct_kzt_deposit: UNKNOWN`, `direct_kzt_withdrawal: UNKNOWN`, `bank_card_purchase: UNAVAILABLE`, `mobile_application: CONFLICTING`, `earn: CONFLICTING` | ✅ **no mismatch** — `productStatuses` accepts arbitrary string keys and string values (`additionalProperties: {type: string}`), so every dictated key and status token is representable exactly; no safe-projection fallback needed |
| rankingEligibility / ctaEligibility / promoEligibility | `false` / `false` / `false` | ✅ |
| confidence | `"HIGH"` | ✅ |
| freshness | `"UNDER_REVIEW"` (deterministic: candidate awaiting owner canonical review) | ✅ in enum |
| checkedDate | `"2026-07-22"` (from package; no wall-clock) | ✅ |
| nextReviewDate | `"2026-08-21"` (deterministic rule: checkedDate + 30 days — restriction monitoring cadence) | ✅ |
| reasonCodes | the §4 list | ✅ |
| limitations | recovered-package, flip-monitoring, fiat-unverified, referral-unverified notes | ✅ |
| sourceIds | all 16, sorted | ✅ |
| conflictIds | all 7, sorted | ✅ |
| alternativeExchangeIds | `[]` | ✅ |
| liveVerificationState | `"NOT_LIVE_VERIFIED"` | ✅ in enum |

Candidate remains non-production; RESTRICTED/HIGH/RED preserved; ranking/CTA/promo false. Schema not modified; candidate not created.

## 9. Terms-page flip preservation

`termsPageFlipState: CURRENT_RESTRICTIVE_SOURCE_ACCEPTED_WITH_MONITORING` — earlier captures 2026-07-03 and 2026-07-14 (Kazakhstan reportedly absent) vs Source Truth Review 2026-07-22 (Kazakhstan present; displayed update date still 2025-05-29). Lives in **four places**, never collapsed into a bare restriction flag:

1. **qa-provenance** `termsPageFlip` block (dates, findings, `sourceChangeOrPriorMisreadUnresolved: true`, `productionPublicationRecheckRequired: true`, `restrictionMonitoringRequired: true`);
2. **normalized-conflicts** — inside `cf-kz-mexc-terms-vs-regulator` (`unresolvedEvidence` retains the capture history);
3. **candidate reason code** `TERMS_PAGE_FLIP_MONITORING_REQUIRED` + `candidateMetadata.termsPageFlipMonitoringRequired: true`;
4. **recheck schedule metadata** — `cell.nextReviewDate = 2026-08-21` plus provenance note that any production publication requires a fresh terms recheck.

## 10. Import script design (contract only — script not created)

`scripts/market-intelligence/import-kz-mexc-p0b.mjs`, mirroring the `import-kz-bybit-p0a.mjs` precedent:

- **Modes:** `--dry-run` (full transform in memory, prints report, writes nothing) · `--write-staging` (writes only `research/market-intelligence/staging/kz/mexc/p0b-v1/`) · `--check` (regenerates in memory and byte-compares against existing staging; exit non-zero on drift).
- **Input:** `--input-dir <extracted STR package>` (and recovered research package where needed); gates on identity + SHA-256 `f7658b5f…` (27,833 B) before any work.
- **Rules:** deterministic output (stable ordering, stable JSON serialization, `\n` line endings); **no wall-clock** (all dates from package data); no network; no browser; no child processes; no git commands; Node built-ins only (`node:fs`, `node:path`, `node:crypto`); no dependency additions; `package.json` unchanged; **overwrite refusal** — if the staging dir exists and is non-empty, exit 2 unless a separately authorized explicit overwrite flag is provided.
- **Exit codes:** 0 success · 1 validation/input error · 2 unsafe mode / overwrite refusal.
- **Proposed staging root:** `research/market-intelligence/staging/kz/mexc/p0b-v1/` (not created in this task).

## 11. Future eight-file staging contract (files not created)

| # | File | Purpose · shape · input · schema applicability |
|---|---|---|
| 1 | `import-manifest.json` | Run identity: task, repo, branch, baselineHead, KZ/mexc/KZ-P0-B, transformVersion `kz-mexc-p0b-v1`, packageStatus, owner-decision commits, candidateShape `OPTION_A_WRAPPED_CANDIDATE`, cell schema-validation result, input package hashes, generated-file list + per-file sha256, counts, `stagingOnly: true`, all authorization flags false. Object; no repo schema. Rejects on any identity/hash mismatch. |
| 2 | `normalized-sources.json` | Flat sorted array of **16** `market-source.schema.json`-conformant records (§5). Input: `source-verification.json`. Direct schema validation applies per record. Rejects on count ≠16, enum violation, schema failure. |
| 3 | `claim-source-links.json` | Flat sorted array of **55** linkage records (§2). Input: `claim-verdicts.json` (forward) cross-checked against `source-verification.json` (reverse index). No repo schema (registry design). Rejects on duplicate linkId, dangling ref, forward/reverse asymmetry, count drift. |
| 4 | `claim-review.json` | Flat sorted array of **24** claim-review records (§6). Input: `claim-verdicts.json`. No repo schema (staging shape). Rejects on count ≠24, missing field, corrections ≠15. |
| 5 | `qa-provenance.json` | Provenance sidecar (§3). Inputs: review-run/import-readiness/source-verification/claim-verdicts + owner decision + audits. No repo schema. Rejects if any mandated provenance item would be absent. |
| 6 | `normalized-conflicts.json` | Flat sorted array of **7** conflict records (§7). Input: `conflict-resolution.json`. restriction-event schema NOT applied (checked; non-conformant). Rejects on count ≠7, distribution drift, missing field, auto-resolution. |
| 7 | `exchange-market-cell.candidate.json` | OPTION A wrapper (§8); `cell` validated against `exchange-market-cell.schema.json`. Inputs: owner decision + offer-eligibility/import-readiness. Rejects on schema failure or any eligibility flag ≠ false. |
| 8 | `transform-report.md` | Human-readable run report: counts, distributions, status-mapping table applications, flip preservation, rejection checks passed, authorization boundary. No repo schema. |

Deterministic ordering everywhere: sources/claims/conflicts by ID ascending; links by (claimId, sourceId, relationship).

## 12. Expected counts & derived linkage validation

| Metric | Expected |
|---|---|
| normalizedSources | **16** (VERIFIED_CURRENT 9 · VERIFIED_WITH_LIMITS 6 · OUTDATED 1 → status ACTIVE 15 · STALE 1) |
| claimReviews | **24** (CONFIRMED 11 · CONFIRMED_WITH_LIMITS 11 · UNVERIFIED 2) |
| correctionRequiredClaims | **15** |
| conflicts | **7** (RESOLVED_RESTRICTIVE 2 · PARTIALLY_RESOLVED 4 · RESOLVED_BY_SPECIFICITY 1) |
| claim-source links | **55 = 41 SUPPORTS + 14 CONTRADICTS** — **derived, not guessed** |

Linkage derivation performed in this design phase from the actual package: Σ|verifiedSourceIds| = 41, Σ|contradictingSourceIds| = 14 across the 24 claims; 0 duplicate (claimId, sourceId, relationship) triples; the forward set is **exactly symmetric** with the reverse index built from `source-verification.json` `supportedClaimIds`/`contradictedClaimIds` (set equality verified). The future implementation must recompute both directions and require set equality and count 55; any drift → rejection.

## 13. Rejection conditions (future implementation stops without writing when…)

1. package SHA-256 ≠ `f7658b5f…` or bytes ≠ 27,833; 2. package identity (project/country/exchange/batch/task/baselines) differs; 3. any JSON fails to parse; 4. source/claim/conflict ID sets differ from the audited sets; 5. any duplicate ID (source, claim, conflict, linkId); 6. any dangling reference (either direction, including forward/reverse link asymmetry); 7. a source status cannot be mapped by the §5 table; 8. a product status cannot be represented without an owner-approved mapping; 9. the candidate cell fails `exchange-market-cell.schema.json` validation; 10. any mandated provenance item would be lost; 11. terms-page flip monitoring data would be lost; 12. output path exists without overwrite authorization; 13. any write would touch production, canonical `data/market-intelligence/**`, legacy GEO, `src/**`, or schemas; 14. counts/distributions drift from §12; 15. empty derived productScope; 16. unknown enum token (tier, language, sourceType, verdict, conflict status).

## 14. Readiness verdicts

```
DESIGN_COMPLETENESS:                  PASS
SCHEMA_DECISION_1_SCOPE_CARDINALITY:  RESOLVED  (productScope = sorted unique arrays; countryScope → scalar countryCode "KZ" + provenance, non-lossy)
SCHEMA_DECISION_2_LINKAGE_PLACEMENT:  RESOLVED  (separate registry; deterministic linkId; 55 derived links)
SCHEMA_DECISION_3_PROVENANCE:         RESOLVED  (qa-provenance sidecar; complete mandated preservation)
SCHEMA_DECISION_4_CONTRADICTIONS:     RESOLVED  (CONTRADICTS links + factual sources + conflicts + reason codes)
STAGING_IMPLEMENTATION_READINESS:     READY     (all four decisions resolved without schema modification)
NORMALIZATION_EXECUTION_AUTHORIZATION: false
STAGING_IMPORT_AUTHORIZATION:          false
CANONICAL_IMPORT_AUTHORIZATION:        false
PRODUCTION_CHANGE_AUTHORIZATION:       false
MIGRATION_5_AUTHORIZATION:             false
```

## 15. Next task

**`CBW-KZ-MEXC-P0-B-STAGING-IMPORT-003`** (owner-gated): implement `scripts/market-intelligence/import-kz-mexc-p0b.mjs` per §10 and execute `--dry-run` → owner GO → `--write-staging` → `--check`, producing exactly the eight §11 files under `research/market-intelligence/staging/kz/mexc/p0b-v1/`. No canonical import, no production change, no MIGRATION_5, no Bybit reopen, no other exchange.
