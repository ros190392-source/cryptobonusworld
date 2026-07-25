# OKX × Kazakhstan source-truth review

## Corrected package v2

This is the **corrected package v2** produced by `CBW-KZ-OKX-P0-C-RESEARCH-CORRECTION-V2-005` in application of Source Truth Review 004 (`ACCEPT_WITH_CORRECTIONS_REQUIRED`). The v1 package under `20-research-output/` remains **immutable and unmodified**. All **six** required review corrections were applied:

1. `prod-spot` downgraded from `AVAILABLE_WITH_LIMITS` to **`CONFLICTING`** (confidence `LOW`) — spot cannot exceed the `CONFLICTING` registration/KYC gate and no direct Kazakhstan spot source exists.
2. The HTTP-404 `src-okx-p2p-kzt` URL was replaced with a currently resolving official OKX KZT P2P surface (`https://www.okx.com/ru/p2p-markets/kzt/buy-usdt`, HTTP 200 verified 2026-07-25).
3. `clm-kz-reviewed-register-pages-no-obvious-okx` confidence reduced to **`LOW`** and marked a non-executed page observation, not a negative register determination and not the primary basis for RESTRICTED.
4. P2P / KZT-P2P surface existence remains strongly supported, but product/rail/conflict **eligibility** confidence reduced from `HIGH` to **`MEDIUM`** (status unchanged `AVAILABLE_WITH_LIMITS`).
5. `rail-crypto-transfer` downgraded to **`UNKNOWN`** (confidence `LOW`) for the Kazakhstan-specific verdict.
6. The unconfirmed exact AFSA warning date `2026-04-29` was removed (source date set to `null`, removed from claim text) while retaining the independently confirmed substance that AFSA names OKX as unlicensed.

The overall result is **unchanged**: recommendation **`CONFLICTING`**, confidence **`MEDIUM`**, import readiness **`BLOCKED` / `HOLD_CONFLICTING`**, `liveVerificationState` **`NOT_LIVE_VERIFIED`**. **No production or activation authorization is granted; every authorization remains false.**

## Core conclusion

The correct overall result for this run is **CONFLICTING** with **MEDIUM** confidence.

Current OKX-owned surfaces provide real Kazakhstan-facing signals:
- Kazakhstan was not listed in the reviewed current restricted-locations disclosure.
- the reviewed registration flow is residence-based;
- Kazakhstan appears in the reviewed app-availability list;
- a current KZT P2P surface exists.

At the same time, AFSA provides adverse or unresolved local-authorization signals:
- AFSA warned that OKX is among unlicensed platforms targeting Kazakhstan citizens (the warning substance was independently confirmed; the exact date 2026-04-29 reported by the v1 run was not confirmed from the official page and has been removed);
- AFSA says regulated P2P is only for AIFC-licensed DATFs;
- the reviewed AFSA DASP pages did not show an obvious OKX or Aux Cayes entry — but this is a non-executed page observation only (LOW confidence), not a negative register determination, and is not the primary basis for RESTRICTED (that rests on the AFSA warning).

## Axis split

- platform availability: **AVAILABLE_WITH_LIMITS**
- local authorization: **RESTRICTED**
- technical reachability: **AVAILABLE_WITH_LIMITS**
- offer eligibility: **UNKNOWN**

## Product snapshot

- registration: **CONFLICTING**
- KYC: **UNKNOWN**
- spot: **CONFLICTING** (v2: downgraded from AVAILABLE_WITH_LIMITS; cannot exceed the CONFLICTING registration gate)
- margin: **UNKNOWN**
- derivatives: **UNKNOWN**
- copy trading: **UNKNOWN**
- earn/staking: **UNKNOWN**
- mobile app: **AVAILABLE_WITH_LIMITS**
- P2P: **AVAILABLE_WITH_LIMITS** (surface existence HIGH; eligibility confidence MEDIUM)
- KZT P2P: **AVAILABLE_WITH_LIMITS** (surface existence HIGH; eligibility confidence MEDIUM)
- direct KZT deposit: **UNKNOWN**
- direct KZT withdrawal: **UNKNOWN**
- bank-card purchase: **UNKNOWN**

## Input validation note

The requested six intake files were identified and used from repository mirrors because ChatGPT File Library access was unavailable in this runtime. Inventory validation succeeded, byte-size validation succeeded, and local SHA-256 rehash succeeded for the three text-based mirror files that the runtime allowed to persist. The two JSON mirror files matched declared byte sizes but could not be locally rehashed.

## Operational boundary

All import, canonical, production, ranking, CTA, promo, affiliate, publication, sitemap, indexability, MIGRATION_5 and deploy authorizations remain **false**.

## Recovery appendix

```json
{
  "overallRecommendation": "CONFLICTING",
  "overallConfidence": "MEDIUM",
  "mainConflictId": "cf-kz-okx-terms-vs-regulator",
  "strongestPositiveSignal": "current KZT P2P surface",
  "strongestNegativeSignal": "AFSA unlicensed-platform warning naming OKX",
  "directKztFiat": "UNKNOWN",
  "publicationAuthorized": false
}
```
