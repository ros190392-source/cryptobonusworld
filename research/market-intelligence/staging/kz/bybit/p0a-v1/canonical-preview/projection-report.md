# CBW KZ × Bybit P0-A — Canonical Projection Report (PREVIEW ONLY)

- **Task:** `CBW-KZ-BYBIT-P0A-CANONICAL-IMPORT-PREP-004`
- **Source staging commit:** `1dfbadfb58ebc444fa502d1445f36745481723f7`
- **Package status:** RECOVERED / UNVERIFIED · **Mode:** preview only (no commit / push / deploy; no canonical write)
- **Staging `--check`:** CHECK OK (inputs re-extracted to OS temp, hashes verified, extraction deleted)

This report describes the **future** projection of the committed staging candidate into canonical MI records. Nothing here is canonical, production, ranking, CTA, or promo. GEO remains frozen production truth.

## 1. Inputs projected
- `exchange-market-cell.candidate.json` → **`candidate.cell`** only (candidateMetadata dropped).
- Committed owner decisions + source-truth / recovered-package audits (provenance).
- Schemas `exchange-market-cell.schema.json`, `mi-geo-binding.schema.json` (structural contract validation; no third-party JSON-Schema engine committed; schemas unmodified).

## 2. Preview files in this directory
| File | Purpose | Schema result |
|---|---|---|
| `exchange-market-cell.preview.json` | Canonical MI cell projection = exact `candidate.cell` | **PASS** — schema-valid; byte-equal in meaning to `candidate.cell`; no staging metadata |
| `mi-geo-binding.preview.json` | Non-active MI↔GEO binding | **PASS** — schema-valid; `canonicalRecord=GEO_LEGACY`; `ownerApproved=false`; `productionStable=true` |
| `projection-report.md` | This report | — |

## 3. Cell projection (no semantic change)
overall **AVAILABLE_WITH_LIMITS** · confidence **MEDIUM** · liveVerificationState **NOT_LIVE_VERIFIED** · rankingEligibility **false** · ctaEligibility **false** · promoEligibility **false**. Presentation semantics (GREEN primary "Available" + AMBER secondary "Some limits apply") live in the **decision layer** (candidateMetadata / decision record), not inside the schema cell. Confidence not upgraded; no conflict resolved; no status altered.

Product statuses (unchanged; kept separate from overall): registration/kyc/derivatives/margin/p2p/direct_kzt_deposit/direct_kzt_withdrawal/bybit_card/promotions = AVAILABLE_WITH_LIMITS · spot/kzt_p2p = AVAILABLE · bank_card_purchase = CONFLICTING · referral = UNKNOWN.

## 4. Binding projection (non-active)
`bind-kz-bybit` · `canonicalRecord = GEO_LEGACY` (GEO stays canonical production truth) · `migrationPhase = MIGRATION_4` (highest owner-approved phase; MIGRATION_5 not reached) · `eligibility` availability AVAILABLE_WITH_LIMITS, ranking/CTA/promo false, `affiliateInfluencesRanking = false` · `conflictResolution` LIVE_VERIFICATION_UNAVAILABLE / OWNER_REVIEW_REQUIRED with CTA + ranking suppressed and `productionRouteUnchanged = true` · `ownerApproved = false` · `reviewStatus = PROPOSED`. `miCellRef` points at the cell preview (future canonical `data/market-intelligence/cells/by-country/kz/bybit.json`); `legacyGeoPassportRef` = `research/geo/kazakhstan/exchanges/bybit.json`; `deepPassportRef = null`.

## 5. Proposed canonical paths (none written)
- Sources → `data/market-intelligence/sources/`
- Cell → `data/market-intelligence/cells/by-country/kz/bybit.json` (mirror `cells/by-exchange/bybit/kz.json`)
- Binding → `data/market-intelligence/bindings/bind-kz-bybit.json` *(bindings/ not authority-named — owner confirm)*
- Conflicts → `data/market-intelligence/conflicts/`; linkage/QA-provenance → `sources/` or `provenance/` *(owner confirm)*

`data/market-intelligence/` does not exist and is read by no production consumer.

## 6. Corrections & conflicts preserved
Four corrections (`entity-003`, `registration-002`, `offer-001`, `offer-002`) carried; 1,032 USDT and 2,500 USDT kept separate (not a global maximum); global referral compatibility UNVERIFIED; promo/CTA false. Both conflicts remain PARTIALLY_RESOLVED with routing unflattened.

## 7. Readiness
- Canonical cell creation: **READY_WITH_LIMITS**
- MI↔GEO binding creation: **READY_WITH_LIMITS** (non-active)
- Production migration: **NOT_READY**

## 8. Next gate
`CBW-KZ-BYBIT-P0A-CANONICAL-IMPORT-EXECUTE-005` — separate owner authorization to write these previews into an owner-confirmed `data/market-intelligence/` path. Ranking/CTA/promo (MIGRATION_5+) remain separate later owner-gated tasks.
