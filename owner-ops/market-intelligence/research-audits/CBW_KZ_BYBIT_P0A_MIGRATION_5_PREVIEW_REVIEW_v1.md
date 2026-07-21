# CBW — Kazakhstan × Bybit P0-A MIGRATION_5 Preview Review v1 (READ-ONLY)

| Field | Value |
|---|---|
| **Audit ID** | `CBW-KZ-BYBIT-P0A-MIGRATION-5-PREVIEW-REVIEW-v1` |
| **Task** | `CBW-KZ-BYBIT-P0A-MIGRATION-5-PREVIEW-REVIEW-012` |
| **Project** | CryptoBonusWorld · branch `master` · baseline HEAD `ec185cd7055b4ec26f5a8fcbba9ee1a040815c6e` |
| **Mode** | Read-only MIGRATION_5 preview review (no modification, no commit/push/deploy) |
| **Date** | 2026-07-21 |

Companion machine-readable record: [CBW_KZ_BYBIT_P0A_MIGRATION_5_PREVIEW_REVIEW_v1.json](CBW_KZ_BYBIT_P0A_MIGRATION_5_PREVIEW_REVIEW_v1.json). No preview file was modified.

## Overall recommendation: **APPROVE** · Commit readiness: **READY**
All 13 integrity dimensions PASS. The seven preview files (script + six outputs) are intact, hash-matched, deterministic, path-safe, complete, semantics-preserving, non-active, and read by no production consumer.

## 1. Files reviewed
Seven preview files; MIGRATION_5 owner decision; discrepancy review; six canonical MI files; legacy GEO passport + `config/geo/kazakhstan.json`; production `src/data/geoRankings.ts` + `package.json`; authorities. Nothing modified.

## 2. Files created (exactly two)
```
owner-ops/market-intelligence/research-audits/CBW_KZ_BYBIT_P0A_MIGRATION_5_PREVIEW_REVIEW_v1.md
owner-ops/market-intelligence/research-audits/CBW_KZ_BYBIT_P0A_MIGRATION_5_PREVIEW_REVIEW_v1.json
```

## 3. Preview structure result — PASS
Seven files present (script + preview-manifest + legacy-to-mi-field-map + shadow-comparison + non-active-adapter.preview + validation-report.json + validation-report.md); no extra file.

## 4. Hash verification result — PASS
All seven files match expected bytes + SHA-256 exactly (0 mismatches): script 42,063 `529e40a8…` · manifest 3,019 `3433b7fb…` · field-map 28,210 `da973a28…` · shadow 13,705 `ee9a8b2a…` · adapter 15,956 `b8d00e48…` · validation.json 1,560 `fdaeca9a…` · validation.md 2,368 `69d25e47…`.

## 5. Script safety result — PASS
Supports `--dry-run`/`--write-preview`/`--check`; writes only the preview dir and refuses unsafe/outside paths; no network/browser/child-process/git/wall-clock; Node built-ins only; `package.json` unchanged; no writes to canonical/legacy/src/config; no runtime adapter or production import. Exit codes: no-mode **2**, unknown-arg **1**, success **0**.

## 6. Determinism result — PASS
`--check` = **CHECK OK**. Generated files match manifest hashes; manifest avoids self-referential hashing (hashes the 6 other files); no wall-clock field; deterministically sorted; no random identifier; no env-dependent absolute path embedded.

## 7. Field-mapping review — PASS
**31** rows, unique `fieldId`, sorted; every row exactly one classification (within the approved enum) and all 16 required keys; every row `approvedForExecution=false` + `approvedForProductionActivation=false`. Covers availability/confidence/live-verification/presentation, all 13 products, ranking eligibility+position, CTA, promo, affiliate route, referral code, global referral compatibility, both offer amounts, conflict IDs, binding state, legacy ownership, publication eligibility. **Missing fields: none.**

## 8. Primary availability review — PASS
canonical **AVAILABLE_WITH_LIMITS** → `legacyCompatiblePrimaryAvailability: available` + **GREEN "Available"** primary + **AMBER "Some limits apply"** secondary + `limitationDisclosureRequired: true`; confidence MEDIUM; NOT_LIVE_VERIFIED. Precision-preserving — not restricted, limitation layer not dropped, primary not downgraded to AMBER, not converted to bare AVAILABLE without disclosure.

## 9. Product-status review — PASS
All 13 present once; canonical statuses exact (spot/kzt_p2p AVAILABLE; bank_card_purchase CONFLICTING; referral UNKNOWN; rest AVAILABLE_WITH_LIMITS); `canonicalStatus == proposedShadowStatus`; no upgrade/downgrade; all `blockedFromExecution`; not flattened into overall; conflict + reason references attached.

## 10. Limitation review — PASS
Exactly **7** limitations (residency/citizenship; entity/domain routing; bank-card conflict; global-referral-UNVERIFIED; narrower promo eligibility; NOT_LIVE_VERIFIED; RECOVERED/UNVERIFIED); each with all required keys; `requiredForFuturePresentation=true`; `blocksExecution=true`; `blocksProductionActivation=true`.

## 11. Conflict review — PASS
`cf-kz-bybit-001` + `cf-kz-bybit-002` both **PARTIALLY_RESOLVED**; each has canonical/legacy/production/preview representation + unresolvedEvidence + affectedFields + hiddenRiskLevel + blocksExecution/blocksProductionActivation. Neither resolved, simplified, flattened, removed, or converted to AVAILABLE.

## 12. Blocked-field review — PASS
All 11 blocked flags true (ranking, CTA, promo, affiliate route, referral code, bonus amount, publication, production integration, binding activation, legacy GEO write, production ranking write). `migration5Execution`/`ProductionActivation`/`rankingChange`/`ctaChange`/`promoChange`/`affiliateRouteChange`/`referralCodeActivation`/`publication` authorizations all **false**.

## 13. Ranking review — PASS
`currentProductionPosition: 1` · `SAFE_WITH_DISCLOSED_GAP` · `READY_WITH_LIMITS` · `canonicalRankingEligibility: false` · `proposedRankingChange: NONE` · `rankingChangeAuthorized: false`. No automatic activation recommended.

## 14. CTA / referral review — PASS
`/go/bybit` · `CRYPTOBONUSW` · global compat **UNVERIFIED** · `canonicalCtaEligibility: false` · `SAFE_WITH_DISCLOSED_GAP` · proposed CTA/route change NONE · `proposedCodeActivation: false` · all change authorizations false. Does not claim the route/code was verified for Kazakhstan.

## 15. Promo review — PASS
localReferralProgram **1032 USDT** + localCampaignPrizePool **2500 USDT**; `combined: false`; `globalMaximumVerified: false`; `canonicalPromoEligibility: false`; `SAFE_WITH_DISCLOSED_GAP`; `proposedPromoChange: NONE`; `promoChangeAuthorized: false`. Neither amount in a production-ready offer field.

## 16. Adapter non-activation result — PASS
Top-level keys exactly the 10 required. `recordState: PREVIEW`, `nonProduction: true`, `runtimeConsumed: false`, prep true / execution + production activation false. Binding `WRITTEN_NON_ACTIVE` / GEO_LEGACY / MIGRATION_4 / `proposedActivation: false`. Publication `homepageEligible: false` / `blocked_by_missing_evidence` / `proposedPublication: false`. Every safety mutation flag false.

## 17. Production-consumer search result — PASS
0 references in `src/**`; no runtime loader, ranking/CTA/promo/route/page consumer, build/deploy integration, auto-sync, or active adapter. The only external reference to `migration5-preview` is the generator script referencing its own output paths.

## 18. Final verdicts
```
PREVIEW_STRUCTURE:             PASS
HASH_INTEGRITY:                PASS
SCRIPT_SAFETY:                 PASS
DETERMINISM:                   PASS
FIELD_MAPPING_COMPLETENESS:    PASS
PRIMARY_AVAILABILITY_SEMANTICS: PASS
PRODUCT_STATUS_PRESERVATION:   PASS
LIMITATION_DISCLOSURE:         PASS
CONFLICT_PRESERVATION:         PASS
BLOCKED_FIELD_ENFORCEMENT:     PASS
ADAPTER_NON_ACTIVATION:        PASS
NO_PRODUCTION_CONSUMER:        PASS
NO_PRODUCTION_CHANGE:          PASS
```

## 19. Preview commit readiness: **READY**
All integrity dimensions PASS → READY. MIGRATION_5 execution, binding activation, production integration, ranking/CTA/promo, and Kazakhstan publication remain blocked.

## 20. Input immutability
`git diff` empty across `data/market-intelligence/**`, `research/geo/**`, `src/**`, `config/geo/**`, `package.json`, `schemas/**`, `owner-ops/**`, `public/**`, and staging outside `migration5-preview/**`. Canonical, legacy, and production inputs byte-identical; `--check` OK.

## 21. Next task
**`CBW-KZ-BYBIT-P0A-MIGRATION-5-PREVIEW-IMPLEMENTATION-011-COMMIT`** — owner-gated commit of exactly the seven preview files (script + six outputs), push `master → origin/master`. MIGRATION_5 execution, MI-GEO binding activation, production integration, ranking/CTA/promo activation, Kazakhstan publication, and starting another exchange remain separate later owner-gated tasks.
