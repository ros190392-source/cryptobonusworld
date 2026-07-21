# CBW — Kazakhstan × Bybit P0-A MI ↔ GEO ↔ Production Discrepancy Review v1 (READ-ONLY)

| Field | Value |
|---|---|
| **Audit ID** | `CBW-KZ-BYBIT-P0A-MI-GEO-DISCREPANCY-REVIEW-v1` |
| **Task** | `CBW-KZ-BYBIT-P0A-MI-GEO-DISCREPANCY-REVIEW-009` |
| **Project** | CryptoBonusWorld · branch `master` · baseline HEAD `8a51bf21a5abf69b71593923ad681d3c7e95b099` |
| **Country × Exchange** | Kazakhstan (`KZ`) × Bybit |
| **Mode** | Read-only three-layer discrepancy review (no modification, no commit/push/deploy) |
| **Date** | 2026-07-21 |

Companion machine-readable record: [CBW_KZ_BYBIT_P0A_MI_GEO_DISCREPANCY_REVIEW_v1.json](CBW_KZ_BYBIT_P0A_MI_GEO_DISCREPANCY_REVIEW_v1.json). No compared data file was modified.

**Availability semantics (owner rule):** `AVAILABLE` and `AVAILABLE_WITH_LIMITS` are **both** positive primary availability (GREEN). Production `available` vs canonical `AVAILABLE_WITH_LIMITS` is **PRIMARY_MATCH_MI_MORE_PRECISE**, not a conflict. A true CONFLICT requires available-vs-restricted or a materially different core scenario.

## Overall recommendation: **APPROVE** · Primary availability: **MATCH_WITH_MI_LIMITATIONS** · MIGRATION_5 readiness: **READY_WITH_LIMITS**

## 1. Files reviewed
Six canonical MI files; canonical-package review; canonical authorization + paths + import-prep + owner-decision records; legacy GEO passport `research/geo/kazakhstan/exchanges/bybit.json` + `config/geo/kazakhstan.json`; production `src/data/geoRankings.ts` (MANUAL_OVERRIDES.kazakhstan.bybit) + committed production snapshot; schemas + authorities (MI Brain, Reconciliation Standard). Nothing modified.

## 2. Files created (exactly two)
```
owner-ops/market-intelligence/research-audits/CBW_KZ_BYBIT_P0A_MI_GEO_DISCREPANCY_REVIEW_v1.md
owner-ops/market-intelligence/research-audits/CBW_KZ_BYBIT_P0A_MI_GEO_DISCREPANCY_REVIEW_v1.json
```

## 3. Canonical MI summary (Layer 1)
overall **AVAILABLE_WITH_LIMITS** · MEDIUM · NOT_LIVE_VERIFIED · ranking/CTA/promo **false** · reasonCodes `LOCAL_AIFC_LICENSED, REGISTRATION_SCOPE_PARTIAL, ROUTING_PARTIAL, OFFER_ELIGIBILITY_UNVERIFIED, NOT_LIVE_VERIFIED` · conflicts `cf-kz-bybit-001` + `cf-kz-bybit-002` (both PARTIALLY_RESOLVED) · **43** sources (A 8/B 32/C 3) · **77** links · **4** corrections · entity Bybit Limited (AIFC) core + Bybit Technology Limited affiliate · offer 1,032 + 2,500 USDT (separate) · global referral compat **UNVERIFIED** · package RECOVERED/UNVERIFIED · binding **non-active** (GEO_LEGACY, PROPOSED, MIGRATION_4).

## 4. Legacy GEO summary (Layer 2)
`research_status: in_progress`. availability.* all **UNKNOWN** (website/registration/country_selector/kyc/local_documents/apps). products: p2p **PARTIAL**, all others UNKNOWN. local_fit KZT supported (Halyk Bank). affiliate `/go/bybit` + `CRYPTOBONUSW`, geo_eligible UNKNOWN, bonus not_checked. scores null; cta not_decided; index_eligible false. **conflict_ids empty** (omits both MI conflicts). unknown_claim_ids: registration/bonus/affiliate-geo. last_checked 2026-07-14. Models a partial product set only.

## 5. Production summary (Layer 3)
`geoRankings.ts` MANUAL_OVERRIDES.kazakhstan.bybit: availability **available** · bonusAvailability **unknown** · KYC required · restrictionNote (AFSA license, first regulated P2P Nov 2025, not on global exclusion list) · bonusNote (global welcome package not confirmed for KZ) · affiliate `/go/bybit` + `CRYPTOBONUSW` · confidence 'verified' (license only). Snapshot: **available / position 1**. **`config/geo/kazakhstan.json`: `homepage_eligible: false`, `publication_status: blocked_by_missing_evidence`** → KZ is **not live-published**; the ranking/CTA/bonus data exists but is not shown to users.

## 6. Full discrepancy classification summary
30 fields compared (see JSON `fieldComparison`), each with exactly one classification + reason + materiality. Distribution: **PRIMARY_MATCH_MI_MORE_PRECISE** (overall availability, presentation, KYC, P2P, KZT P2P, global referral compat, promotions, legal-entity routing, domain routing, provenance depth, freshness), **LEGACY_MORE_CONSERVATIVE** (spot, derivatives, direct KZT deposit/withdrawal, Bybit Card), **MI_MORE_CONSERVATIVE** (registration, bank-card purchase), **MI_ONLY** (margin, live verification, conflict handling, bonus amounts, consumer behavior), **MATCH** (referral-code, CTA eligibility, promo eligibility, binding activation, production ownership), **PRODUCTION_MORE_PERMISSIVE** (ranking eligibility), **NOT_COMPARABLE** (confidence). **No `CONFLICT` classification** — no user-facing availability contradiction exists.

## 7. Primary availability alignment: **MATCH_WITH_MI_LIMITATIONS**
Production `available` and MI `AVAILABLE_WITH_LIMITS` express the same positive primary availability; MI adds visible limitations. Legacy passport is evidence-blocked UNKNOWN (conservatism, not contradiction). LEGACY_GEO_ALIGNMENT = **ALIGNED_WITH_PRECISION_GAPS**; PRODUCTION_ALIGNMENT = **ALIGNED_WITH_PRECISION_GAPS**.

## 8. Product-status comparison result
All **13** compared (not flattened into overall). Strongest cross-layer alignment: **P2P / KZT P2P** (legacy PARTIAL + production regulated-P2P == MI AWL). Legacy-conservative precision gaps: spot, derivatives, direct KZT deposit/withdrawal, Bybit Card (legacy UNKNOWN/unmodeled). MI-only: margin. MI-more-conservative: registration (citizenship scope), bank_card_purchase (CONFLICTING). MATCH: referral (all UNKNOWN). Migration would add limitations/precision but not contradict production's positive availability.

## 9. Ranking review result
Bybit is ranked **#1 in production data** but KZ is **publication-blocked** (not shown live). MI `rankingEligibility=false`. Production data is more permissive than MI eligibility. **CURRENT_PRODUCTION_RANKING_SAFETY: SAFE_WITH_DISCLOSED_GAP** (availability aligns; nothing live; disclosed gap = MI limitations + NOT_LIVE_VERIFIED + 2 conflicts + eligibility not MI-authorized). **FUTURE_RANKING_DECISION_READINESS: READY_WITH_LIMITS.** Ranking unchanged.

## 10. CTA review result
No live CTA (KZ unpublished; bonusAvailability unknown). A global `/go/bybit` + `CRYPTOBONUSW` code exist in data; MI `ctaEligibility=false` and global referral compatibility **UNVERIFIED**. **CURRENT_PRODUCTION_CTA_SAFETY: SAFE_WITH_DISCLOSED_GAP** — safe now (no live claim); any future KZ CTA activation **needs owner review**. CTA unchanged.

## 11. Promo review result
No live promo. MI `promoEligibility=false`; local programs (1,032 USDT referral; 2,500 USDT campaign) documented in MI only, kept **separate**, neither the global maximum. **CURRENT_PRODUCTION_PROMO_SAFETY: SAFE_WITH_DISCLOSED_GAP** — any future promo needs owner review and must keep amounts separate. Promo unchanged.

## 12. Conflict comparison result
- **cf-001** (residency/citizenship/foreign-national): legacy **omits** (empty conflict_ids), production **omits** (silent on citizenship scope). MI formalizes. Hidden user-risk **LOW-MEDIUM** (positive availability, limitation not blocker). Not resolved.
- **cf-002** (bybit.kz/bybit.com entity + routing): legacy **partially communicates** ("global-vs-local routing key unknown"), production **partially communicates** ("separately licensed Bybit Kazakhstan product vs global"). MI formalizes with routingMatrix. Hidden user-risk **MEDIUM** (the `/go/bybit` affiliate link routes global while local compatibility unresolved). Not resolved.

## 13. Material discrepancies (HIGH/MEDIUM)
1. **HIGH** — Global referral compatibility UNVERIFIED while production carries a global `/go/bybit` + `CRYPTOBONUSW` code (CTA/PROMO/ROUTING).
2. **HIGH** — Conflict handling: MI formalizes cf-001 + cf-002; legacy omits, production narrates only part (ELIGIBILITY/ROUTING).
3. **HIGH** — Ranking: production data ranks Bybit #1 while MI `rankingEligibility=false` + NOT_LIVE_VERIFIED (RANKING) — mitigated by KZ being unpublished.
4. **MEDIUM** — bank_card_purchase CONFLICTING in MI, unmodeled elsewhere (ROUTING).
5. **MEDIUM** — Bonus amounts (1,032 / 2,500 USDT) modeled only in MI; must stay separate, never shown as global max (PROMO).

## 14. Documentation / precision-only discrepancies
Overall availability presentation (AWL vs available); spot/derivatives/margin/direct-KZT/Bybit-Card legacy UNKNOWN-or-unmodeled vs MI granular; provenance depth; freshness; KYC detail; consumer behavior / binding activation / legacy production ownership (DOCUMENTATION_ONLY).

## 15. Current production safety conclusions
| Dimension | Verdict |
|---|---|
| CURRENT_PRODUCTION_RANKING_SAFETY | **SAFE_WITH_DISCLOSED_GAP** |
| CURRENT_PRODUCTION_CTA_SAFETY | **SAFE_WITH_DISCLOSED_GAP** |
| CURRENT_PRODUCTION_PROMO_SAFETY | **SAFE_WITH_DISCLOSED_GAP** |

KZ is publication-blocked, so no false live claim exists; the gaps are disclosed for the future migration/publication decision. Nothing changed.

## 16. Migration readiness
`PRIMARY_AVAILABILITY_ALIGNMENT: MATCH_WITH_MI_LIMITATIONS` · `LEGACY_GEO_ALIGNMENT: ALIGNED_WITH_PRECISION_GAPS` · `PRODUCTION_ALIGNMENT: ALIGNED_WITH_PRECISION_GAPS` · **`MIGRATION_5_OWNER_DECISION_READINESS: READY_WITH_LIMITS`** (decision can be taken, carrying NOT_LIVE_VERIFIED + MEDIUM confidence + 2 unresolved conflicts + UNVERIFIED global referral compatibility).

## 17. All authorization flags (all false)
`MIGRATION_5_AUTHORIZATION` · `MI_GEO_BINDING_ACTIVATION_AUTHORIZATION` · `PRODUCTION_CHANGE_AUTHORIZATION` · `RANKING_CHANGE_AUTHORIZATION` · `CTA_CHANGE_AUTHORIZATION` · `PROMO_CHANGE_AUTHORIZATION` — **all false**. No migration or production change authorized by this task.

## 18. No-production-change check — PASS
Canonical package 0 production consumers; binding non-active; legacy GEO remains production truth; no runtime consumer added; no source/ranking/CTA/promo/route/sitemap/page changed; no auto-sync.

## 19. Next task
**`CBW-KZ-BYBIT-P0A-MIGRATION-5-OWNER-DECISION-010`** — owner decision (documentation only) on whether/how to proceed toward MIGRATION_5 given READY_WITH_LIMITS, carrying NOT_LIVE_VERIFIED + two unresolved conflicts + UNVERIFIED global referral compatibility. Binding activation, production integration, ranking/CTA/promo activation, and starting another exchange (e.g. MEXC) remain separate later owner-gated tasks.
