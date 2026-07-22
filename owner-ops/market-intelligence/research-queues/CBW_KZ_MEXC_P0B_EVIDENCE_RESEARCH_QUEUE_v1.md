# CBW — Kazakhstan × MEXC P0-B Evidence Research Queue v1

| Field | Value |
|---|---|
| **Queue ID** | `CBW-KZ-MEXC-P0B-EVIDENCE-RESEARCH-QUEUE-v1` |
| **Task** | `CBW-KZ-MEXC-P0-B-EVIDENCE-RESEARCH-QUEUE-001` |
| **Project** | CryptoBonusWorld · branch `master` · baseline HEAD `67bdca323928a4a26aaa4cbe48ec18200fdc1d1d` |
| **Country × Exchange** | Kazakhstan (`KZ`) × MEXC · batch `KZ-P0-B` · priority **P0** |
| **Mode** | Repository inventory + research queue + handoff package only (no research, no web, no commit/push/deploy) |
| **Date** | 2026-07-22 |

Companion machine-readable record: [CBW_KZ_MEXC_P0B_EVIDENCE_RESEARCH_QUEUE_v1.json](CBW_KZ_MEXC_P0B_EVIDENCE_RESEARCH_QUEUE_v1.json). No research was performed; no factual determination requiring new web research was made.

## Recommendation: **APPROVE** — research queue prepared; research not started
Bybit KZ-P0-A is formally closed (commit `67bdca3`); the Kazakhstan queue may advance; MEXC is the approved next exchange; batch is **KZ-P0-B**. No MEXC canonical package, staging pipeline, or MIGRATION_5 preview exists (safe state).

## 1. Inputs reviewed
Bybit closeout (`…CLOSEOUT_v1`); Kazakhstan master research queue; MIGRATION_4 Kazakhstan owner decision; authorities (MI Brain v1, MI↔GEO Reconciliation Standard v1, Country×Exchange Deep Passport Standard v1 — at `owner-ops/country-exchange/`); schemas (`exchange-market-cell`, `market-source`, `restriction-event`, `mi-geo-binding`); NO-PROXY research rules; `config/geo/kazakhstan.json`; legacy `research/geo/kazakhstan/exchanges/mexc.json`; production `src/data/geoRankings.ts` (MANUAL_OVERRIDES.kazakhstan.mexc). Nothing modified.

## 2. Current MEXC repository inventory (committed truth only)
- **Legacy GEO passport** (`research/geo/kazakhstan/exchanges/mexc.json`): `research_status: not_started`; availability + products all **UNKNOWN**; legal entity null; affiliate `/go/mexc` + `mexc-CryptoBonus` (geo_eligible UNKNOWN, bonus not_checked); scores null; `cta: not_decided`, `index_eligible: false`; evidence `ev-kz-mexc-terms-111`, `ev-kz-afsa-warning-003`; conflict `cf-kz-mexc-terms-vs-regulator`; unknown `kz-mexc-bonus-availability-004`; last checked 2026-07-14.
- **Production** (`geoRankings.ts`): availability **unknown** · bonusAvailability **unknown** · rank/position **2** (snapshot; unpublished) · route `/go/mexc` · code `mexc-CryptoBonus` (implementation facts only) · stored offer none (bonus unknown) · confidence **partial** · state **under review** (regulator caution note) · publication **blocked** (`homepage_eligible: false`, `blocked_by_missing_evidence`); evidence `mexc.com/terms`, 2026-07-03.
- **Master queue item**: priority P0 · batch KZ-P0-B · currentMiAvailability **CONFLICTING** · discrepancyState **INCOMPARABLE** · shadowOutcome **HOLD_CONFLICTING** · knownConflict `cf-kz-mexc-terms-vs-regulator` · ownerReviewRequired true. **Matches expected direction — no mismatches.**
- **MEXC canonical MI / staging / MIGRATION_5 preview: none exist.**

*Production and legacy data are implementation truth only, not verified research truth. Routes/codes are implementation facts, not eligibility evidence.*

## 3. Research-priority decision
**P0 · KZ-P0-B · evidence state CONFLICTING** (`cf-kz-mexc-terms-vs-regulator`, critical, unresolved) · owner action = **additional tiered dated official-source research** to resolve or explicitly retain CONFLICTING. Rationale: KZ is absent from MEXC's own prohibited-jurisdictions terms (partial positive signal) while the AFSA regulator warning of 2026-04-29 names MEXC as unlicensed toward Kazakhstan citizens (Tier-A regulator). Per MI Brain source hierarchy, regulator/sanctions outranks exchange terms; resolve with a decisive higher-tier dated source or explicitly retain. **Do not resolve in this queue task.**

## 4. Known facts (from repository only)
KZ absent from mexc.com/terms prohibited list (capture 2026-07-03; terms updated 2025-05-29) — partial positive signal, not a confirmation · AFSA warning (2026-04-29) lists MEXC as unlicensed toward KZ citizens · no dedicated KZ support/KZT/AFSA-license found in prior research · legacy passport not_started (all UNKNOWN) · production unknown/partial with regulator caution, KZ publication-blocked · affiliate route/code exist as implementation facts (geo_eligible UNKNOWN) · no MEXC canonical/staging/preview.

## 5. Repository-only conflicts
- **`cf-kz-mexc-terms-vs-regulator`** — MEXC terms do not prohibit Kazakhstan, but the AFSA regulator warning (2026-04-29) names MEXC unlicensed toward KZ citizens. Status **UNRESOLVED_CRITICAL** (Tier-A regulator vs Tier-A terms; weigh recency + authority with dated sources). Do not resolve in this task.

## 6. Unknowns and evidence gaps
Legal entity/domain routing for KZ · registration eligibility (citizen/resident/foreign-national, new-registration, min age, exclusions) · KYC (documents, proof-of-address, citizenship vs residence, product/limit thresholds) · per-product availability (spot/derivatives/margin/copy-trading/earn/P2P/KZT-P2P/direct-KZT-deposit/withdrawal/bank-card/mobile-app/other) · KZT fiat rails + cards + provider/entity/jurisdiction restrictions · regulation (local authorization/claim, supported/restricted/prohibited, applicable restricted lists, product-specific + sanctions/residency/regional exclusions) · referral/affiliate compatibility + owning entity + registration-time entry + existing-user exclusions · promotions/bonus (KZ-specific, verified amount, global-max applicability, conditions, separation of programs) · conflict resolution direction · `kz-mexc-bonus-availability-004`.

## 7. Research-question coverage
Covers A legal entity & domain routing · B registration eligibility · C KYC · D product availability (13+ products, not flattened) · E fiat & KZT · F regulation & restrictions (no authorization inferred from availability) · G referral & affiliate compatibility (routes/codes = implementation only) · H promotions & bonus (never combine unrelated amounts) · I conflicts (7 contradiction axes) · J publication blockers (8 gates).

## 8. Claim & source model
Claims: prefix `clm-kz-mexc-`; 17 required groups (entity, regulation, registration, kyc, spot, derivatives, margin, p2p, kzt, direct-fiat, card-purchase, mobile-app, restrictions, referral, promotions, publication, routing); 15 required fields each; no claim confirmed solely from legacy/production. Sources: prefix `src-kz-mexc-` (supplemental `sup-kz-mexc-`); 21 required fields; Tier A (regulator/terms/restricted-lists/KYC/local notices) > B (product/help/P2P-fiat/referral-campaign/announcements) > C (app-store/support/social) > D (third-party context only — never sufficient alone).

## 9. Expected Deep Research output contract
One ZIP with exactly **8** files: `research-run.json`, `source-registry.json`, `claim-ledger.json`, `exchange-country-findings.json`, `conflicts.json`, `unknowns.json`, `publication-blockers.json`, `research-report.md`. Reproducible from a Markdown recovery appendix; all 7 JSON parse; all IDs unique; all cross-references resolve. Must distinguish platform / product / ranking / CTA / promo / publication eligibility. Recommendation enum {AVAILABLE, AVAILABLE_WITH_LIMITS, CONFLICTING, RESTRICTED, UNAVAILABLE, UNKNOWN}; confidence {HIGH, MEDIUM, LOW}; default liveVerificationState **NOT_LIVE_VERIFIED**. Deep Research authorizes **research only**.

## 10. Authorization boundaries (all false)
`researchImportAuthorized` · `canonicalImportAuthorized` · `productionChangeAuthorized` · `rankingChangeAuthorized` · `ctaChangeAuthorized` · `promoChangeAuthorized` · `affiliateRouteChangeAuthorized` · `publicationAuthorized` · `migration5Authorized` · `deployAuthorized` — **all false**. The queue authorizes research only.

## 11. Handoff package
`_handoff/CBW_KZ_MEXC_P0B_DEEP_RESEARCH_INPUT_v1.zip` — flat, **21** entries, untracked; package status **PREPARED / UNRESEARCHED**; Deep Research task `CBW-KZ-MEXC-P0-B-DEEP-RESEARCH-001`.

## 12. Next task
**`CBW-KZ-MEXC-P0-B-DEEP-RESEARCH-001`** — owner-gated ChatGPT Deep Research run (external tool) over the attached input ZIP, returning the eight-file structured output package under NO-PROXY rules for owner review. Claude Code does not conduct the research. Import, canonical MI, ranking, CTA, promo, publication, and MIGRATION_5 remain unauthorized. OKX/Bitget/KuCoin/BingX and Bybit reopening are not authorized.
