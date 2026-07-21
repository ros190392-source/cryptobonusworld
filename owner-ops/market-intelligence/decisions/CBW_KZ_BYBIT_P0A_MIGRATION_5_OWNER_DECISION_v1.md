# CBW — Kazakhstan × Bybit P0-A MIGRATION_5 Owner Scope Decision v1

| Field | Value |
|---|---|
| **Decision ID** | `CBW-KZ-BYBIT-P0A-MIGRATION-5-OWNER-DECISION-v1` |
| **Task** | `CBW-KZ-BYBIT-P0A-MIGRATION-5-OWNER-DECISION-010` |
| **Project** | CryptoBonusWorld · branch `master` · baseline HEAD `8d5284d4c8870effe3b0fd25a3c2353e2182ac7b` |
| **Country × Exchange** | Kazakhstan (`KZ`) × Bybit · batch `KZ-P0-A` |
| **Mode** | Owner decision record only (no commit/push/deploy; no data/production change) |
| **Date** | 2026-07-21 |

Companion machine-readable record: [CBW_KZ_BYBIT_P0A_MIGRATION_5_OWNER_DECISION_v1.json](CBW_KZ_BYBIT_P0A_MIGRATION_5_OWNER_DECISION_v1.json). This authorizes **only** a future non-production migration preview + adapter design; it does **not** execute the migration or authorize any runtime/production change.

## Recommendation: **APPROVE** · MIGRATION_5 scope: **APPROVED_WITH_LIMITS**

## 1. Files reviewed
Six canonical MI files (`data/market-intelligence/…/kz/bybit.json`); discrepancy review + canonical-package review; canonical owner decisions (import authorization, paths, owner-decision+import-prep); legacy GEO passport + `config/geo/kazakhstan.json`; production `src/data/geoRankings.ts`; authorities (MI Brain v1, Reconciliation Standard v1). Nothing modified.

## 2. Files created (exactly two)
```
owner-ops/market-intelligence/decisions/CBW_KZ_BYBIT_P0A_MIGRATION_5_OWNER_DECISION_v1.md
owner-ops/market-intelligence/decisions/CBW_KZ_BYBIT_P0A_MIGRATION_5_OWNER_DECISION_v1.json
```

## 3. MIGRATION_5 scope decision
- `MIGRATION_5_SCOPE_DECISION` = **APPROVED_WITH_LIMITS**
- `MIGRATION_5_PREPARATION_AUTHORIZED` = **true**
- `MIGRATION_5_EXECUTION_AUTHORIZED` = **false**
- `MIGRATION_5_PRODUCTION_ACTIVATION_AUTHORIZED` = **false**

Authorizes only a future non-production migration **preview + adapter design**.

## 4. Approved migration-preparation fields
Future non-production projection is approved for: overall availability · confidence · live-verification state · primary + secondary presentation semantics · exact limitation disclosure · product-level availability statuses · reason codes · conflict references · provenance references · ownership + discrepancy metadata. Preserved: overall **AVAILABLE_WITH_LIMITS** · **MEDIUM** · **NOT_LIVE_VERIFIED** · presentation **GREEN "Available" primary + AMBER "Some limits apply" secondary**. Not reinterpreted as restricted.

## 5. Blocked migration fields
`rankingEligibility` / `ctaEligibility` / `promoEligibility` stay **false**. Do **not** migrate or activate: production ranking position · recommendation status · affiliate route · referral code · CTA · bonus claim · promotional amount · global referral interoperability · production eligibility · publication eligibility. The preview may display these as blocked/unresolved but must not activate them.

## 6. Product-state decision (unchanged)
registration/kyc/derivatives/margin/p2p/direct_kzt_deposit/direct_kzt_withdrawal/bybit_card/promotions = AVAILABLE_WITH_LIMITS · spot/kzt_p2p = AVAILABLE · bank_card_purchase = CONFLICTING · referral = UNKNOWN. **No upgrade or downgrade.**

## 7. Limitation and conflict decision
Must remain visible: (1) residency/citizenship/foreign-national scope partial; (2) bybit.kz/bybit.com + legal-entity routing partial; (3) bank-card purchase CONFLICTING; (4) global referral-code compatibility UNVERIFIED; (5) local promo eligibility narrower than platform availability; (6) NOT_LIVE_VERIFIED; (7) package RECOVERED/UNVERIFIED. Conflicts `cf-kz-bybit-001` + `cf-kz-bybit-002` remain **PARTIALLY_RESOLVED** — not resolved or hidden.

## 8. Ranking decision
`currentProductionRankingSafety` = **SAFE_WITH_DISCLOSED_GAP** · `futureRankingDecisionReadiness` = **READY_WITH_LIMITS** · `rankingChangeAuthorized` = **false**. Production data places Bybit at position 1, but Kazakhstan is publication-blocked and canonical `rankingEligibility=false`. No ranking change this phase.

## 9. CTA / referral decision
`currentProductionCtaSafety` = **SAFE_WITH_DISCLOSED_GAP** · `ctaChangeAuthorized` / `affiliateRouteChangeAuthorized` / `referralCodeActivationAuthorized` = **false**. Existing global `/go/bybit` + `CRYPTOBONUSW` must not be treated as verified for Kazakhstan until global referral compatibility is resolved. Route + code unchanged.

## 10. Promo decision
`currentProductionPromoSafety` = **SAFE_WITH_DISCLOSED_GAP** · `promoChangeAuthorized` = **false**. Do not publish/activate 1,032 USDT, 2,500 USDT, a combined amount, or the global advertised maximum.

## 11. Binding decision
`miGeoBindingWriteState` = **WRITTEN_NON_ACTIVE** · `miGeoBindingActivationAuthorized` = **false**. Preserve `ownerApproved=false`, `reviewStatus=PROPOSED`, `canonicalRecord=GEO_LEGACY`, `productionStable=true`, `productionRouteUnchanged=true`, `migrationPhase=MIGRATION_4`. Existing GEO remains production truth; do not change the binding to `MI_CELL`.

## 12. Legacy GEO decision
`legacyGeoReplacementAuthorized` / `legacyGeoUpdateAuthorized` / `productionRankingUpdateAuthorized` / `configGeoUpdateAuthorized` = **false**. Legacy passport may be compared in future previews but not rewritten by this task.

## 13. Production / publication decision
`productionIntegrationAuthorized` / `productionChangeAuthorized` / `publicationAuthorized` / `pageOrRouteChangeAuthorized` / `deployAuthorized` = **false**. Kazakhstan remains `homepage_eligible: false`, `publication_status: blocked_by_missing_evidence`. Do not publish the Kazakhstan page.

**No-duplicate-truth:** canonical MI research truth `data/market-intelligence/**`; staging evidence `research/market-intelligence/staging/**`; current production truth `research/geo/**` + `src/data/geoRankings.ts`; non-active binding `data/market-intelligence/bindings/**`. No automatic synchronization; no canonical value may silently overwrite legacy/production.

## 14. Authorization flags
**True:** `canonicalResearchStorageEligible` · `canonicalImportCompleted` · `migration5PreparationAuthorized`.
**False:** `migration5ExecutionAuthorized` · `migration5ProductionActivationAuthorized` · `miGeoBindingActivationAuthorized` · `legacyGeoReplacementAuthorized` · `legacyGeoUpdateAuthorized` · `productionIntegrationAuthorized` · `productionChangeAuthorized` · `rankingChangeAuthorized` · `ctaChangeAuthorized` · `promoChangeAuthorized` · `affiliateRouteChangeAuthorized` · `referralCodeActivationAuthorized` · `publicationAuthorized` · `pageOrRouteChangeAuthorized` · `deployAuthorized`.

## 15. Validation results (20/20)
1 scope APPROVED_WITH_LIMITS ✓ · 2 preparation authorized ✓ · 3 execution not authorized ✓ · 4 production activation not authorized ✓ · 5 overall AVAILABLE_WITH_LIMITS ✓ · 6 GREEN+AMBER ✓ · 7 13 product statuses unchanged ✓ · 8 two conflicts PARTIALLY_RESOLVED ✓ · 9 global referral compat UNVERIFIED ✓ · 10 ranking unauthorized ✓ · 11 CTA unauthorized ✓ · 12 promo unauthorized ✓ · 13 binding activation unauthorized ✓ · 14 legacy GEO replacement unauthorized ✓ · 15 KZ publication blocked ✓ · 16 next preview task recorded ✓ · 17 MD/JSON agree ✓ · 18 JSON parses ✓ · 19 exactly two files ✓ · 20 no production/runtime file changed ✓.

## 16. Next task
**`CBW-KZ-BYBIT-P0A-MIGRATION-5-PREVIEW-IMPLEMENTATION-011`** — owner-gated creation of a deterministic, non-production migration preview (field-level legacy-to-MI mapping + shadow comparison + proposed non-active adapter output + validation reports). Must not modify legacy GEO / production ranking, activate the binding, enable CTA/promo, publish Kazakhstan, or deploy.
