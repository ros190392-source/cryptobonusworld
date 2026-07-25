# OKX × Kazakhstan source-truth review

## Core conclusion

The correct overall result for this run is **CONFLICTING** with **MEDIUM** confidence.

Current OKX-owned surfaces provide real Kazakhstan-facing signals:
- Kazakhstan was not listed in the reviewed current restricted-locations disclosure.
- the reviewed registration flow is residence-based;
- Kazakhstan appears in the reviewed app-availability list;
- a current KZT P2P surface exists.

At the same time, AFSA provides adverse or unresolved local-authorization signals:
- AFSA warned on 2026-04-29 that OKX is among unlicensed platforms targeting Kazakhstan citizens;
- AFSA says regulated P2P is only for AIFC-licensed DATFs;
- the reviewed AFSA DASP pages did not show an obvious OKX or Aux Cayes entry.

## Axis split

- platform availability: **AVAILABLE_WITH_LIMITS**
- local authorization: **RESTRICTED**
- technical reachability: **AVAILABLE_WITH_LIMITS**
- offer eligibility: **UNKNOWN**

## Product snapshot

- registration: **CONFLICTING**
- KYC: **UNKNOWN**
- spot: **AVAILABLE_WITH_LIMITS**
- margin: **UNKNOWN**
- derivatives: **UNKNOWN**
- copy trading: **UNKNOWN**
- earn/staking: **UNKNOWN**
- mobile app: **AVAILABLE_WITH_LIMITS**
- P2P: **AVAILABLE_WITH_LIMITS**
- KZT P2P: **AVAILABLE_WITH_LIMITS**
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
