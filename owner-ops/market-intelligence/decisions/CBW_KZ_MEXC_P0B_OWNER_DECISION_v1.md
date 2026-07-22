# CBW — Kazakhstan × MEXC P0-B Owner Decision v1

| Field | Value |
|---|---|
| **Decision ID** | `CBW-KZ-MEXC-P0B-OWNER-DECISION-v1` |
| **Task** | `CBW-KZ-MEXC-P0-B-OWNER-DECISION-001` |
| **Project** | CryptoBonusWorld · branch `master` · baseline HEAD `5aa41f01b8d899223be925faaea01093c3125b6e` |
| **Country × Exchange** | Kazakhstan (`KZ`) × MEXC · batch `KZ-P0-B` |
| **Mode** | Owner decision record only (no import, no normalization, no production change, no commit/push/deploy in this task) |
| **Date** | 2026-07-22 |
| **Package status** | RECOVERED / UNVERIFIED |

Companion machine-readable record: [CBW_KZ_MEXC_P0B_OWNER_DECISION_v1.json](CBW_KZ_MEXC_P0B_OWNER_DECISION_v1.json). Based on the committed Source Truth Review package audit (`CBW_KZ_MEXC_P0B_SOURCE_TRUTH_REVIEW_PACKAGE_AUDIT_v1`, all PASS except RECOVERY_INTEGRITY: WARN) and the recovered-package audit. No web verification performed for this decision.

## 1. Owner availability decision — **ACCEPT_SOURCE_TRUTH_REVIEW**

```
OWNER_DECISION:              ACCEPT_SOURCE_TRUTH_REVIEW
overallAvailability:         RESTRICTED
confidence:                  HIGH
liveVerificationState:       NOT_LIVE_VERIFIED
packageStatus:               RECOVERED / UNVERIFIED
publicationPosture:          BLOCKED
legalAvailability:           RESTRICTED
technicalSiteReachability:   NOT_DETERMINED
```

The owner accepts the current official-source conclusion that Kazakhstan is expressly listed as a prohibited jurisdiction in the reviewed current MEXC User Agreement (`src-kz-mexc-terms-001`, lastUpdated 2025-05-29, checked 2026-07-22), which states MEXC does not provide services, accept user registration, or accept trade applications in prohibited jurisdictions. **RESTRICTED is a legal/eligibility conclusion — it is not proof that the website is technically inaccessible from Kazakhstan.** Technical site reachability was not determined (NO-PROXY mode; no live in-country verification).

## 2. Presentation decision

```
primaryVisualState:  RED
primaryLabel:        Restricted in Kazakhstan
secondaryLabel:      MEXC’s current terms list Kazakhstan as a prohibited jurisdiction
```

Required presentation meaning: RED is the primary state; GREEN must not be used; AVAILABLE_WITH_LIMITS must not be used; visible app, P2P or KZT pages must not be represented as positive country eligibility; the exact restriction reasoning (terms clause + AFSA warning) must be available in the evidence/detail layer.

## 3. Terms-page flip decision (owner-attention item — preserved)

Earlier repository captures dated **2026-07-03** and **2026-07-14** reportedly found Kazakhstan **absent** from the prohibited-jurisdiction list. The Source Truth Review checked the current page on **2026-07-22** and found Kazakhstan **expressly present**, while the document continued to display the same **2025-05-29** update date.

```
termsPageFlipState:                       CURRENT_RESTRICTIVE_SOURCE_ACCEPTED_WITH_MONITORING
termsPageFlipOwnerAttentionRequired:      true
sourceChangeOrPriorMisreadUnresolved:     true
productionPublicationRecheckRequired:     true
restrictionMonitoringRequired:            true
```

The current restrictive source controls the research decision. The earlier captures remain preserved in provenance (legacy passport `prior_findings`, evidence IDs) and must not be silently discarded. Whether the page changed without a date bump or the earlier captures misread remains unresolved and must be re-checked before any production publication.

## 4. Regulation decision

```
afsaFinding:                        CONFIRMED
afsaFindingMeaning:                 UNLICENSED_OR_UNAUTHORIZED_LOCAL_ACTIVITY
afsaTechnicalUnavailabilityProof:   false
```

The AFSA warning (`src-kz-mexc-afsa-warning-001`, published 2026-04-28, naming MEXC among unlicensed platforms advertising/promoting to Kazakhstan citizens) strengthens the restriction and publication-blocking decision. It is **not** treated alone as proof that MEXC is technically inaccessible.

## 5. Registration and KYC decision

```
registration:                              RESTRICTED
registrationScope:                         KAZAKHSTAN_RESIDENTS_AND_USERS_IN_KAZAKHSTAN
citizenshipOnlyRestriction:                NOT_ESTABLISHED
kyc:                                       RESTRICTED
kazakhstanSpecificKycDocumentAcceptance:   UNVERIFIED
proofOfAddressWorkflowForKazakhstan:       UNVERIFIED
```

Generic identity-document guidance (ID card / passport / driver's license / residence permit) is not treated as Kazakhstan KYC eligibility.

## 6. Product decisions (distinctions preserved — not flattened)

| Product | Owner state |
|---|---|
| spot | **RESTRICTED** |
| derivatives | **RESTRICTED** |
| margin | **RESTRICTED** |
| copyTrading | **RESTRICTED_WITH_PRODUCT_DETAIL_UNVERIFIED** |
| p2p | **CONFLICTING** |
| kztP2p | **CONFLICTING** |
| directKztDeposit | **UNKNOWN** |
| directKztWithdrawal | **UNKNOWN** |
| bankCardPurchase | **UNAVAILABLE** |
| mobileApplication | **CONFLICTING** |
| earn | **CONFLICTING** |

Required interpretation: P2P/KZT/mobile-app/Earn pages are lower-level technical or interface signals; they do not override the platform-level restriction; direct KZT fiat rails remain unverified; card purchase is unavailable under the reviewed current country-specific card guide (38 countries, Kazakhstan absent); conflicting signals remain visible and must not be deleted.

## 7. Conflict decisions (all seven preserved exactly · ownerReviewRequired: true on all)

| # | Conflict | Owner-recorded status |
|---|---|---|
| 1 | `cf-kz-mexc-terms-vs-regulator` | RESOLVED_RESTRICTIVE |
| 2 | `cf-kz-mexc-terms-vs-app-support` | PARTIALLY_RESOLVED |
| 3 | `cf-kz-mexc-terms-vs-p2p-kzt` | PARTIALLY_RESOLVED |
| 4 | `cf-kz-mexc-terms-vs-fiat-tn` | PARTIALLY_RESOLVED |
| 5 | `cf-kz-mexc-terms-vs-earn` | PARTIALLY_RESOLVED |
| 6 | `cf-kz-mexc-card-guide-scope` | RESOLVED_BY_SPECIFICITY |
| 7 | `cf-kz-mexc-global-referral-vs-kz-restriction` | RESOLVED_RESTRICTIVE |

The four partially resolved product conflicts are not resolved, flattened, removed or hidden by this decision.

## 8. Referral and affiliate decision

```
globalReferralMechanics:            VERIFIED_GLOBAL_ONLY
kazakhstanReferralCompatibility:    NOT_VERIFIED_AND_NOT_ELIGIBLE_UNDER_CURRENT_COUNTRY_PROHIBITION
repositoryRoute:                    /go/mexc
repositoryRouteStatus:              IMPLEMENTATION_FACT_ONLY
repositoryCode:                     mexc-CryptoBonus
repositoryCodeStatus:               IMPLEMENTATION_FACT_ONLY
rankingEligibility:                 false
ctaEligibility:                     false
affiliateRouteEligibility:          false
referralCodeEligibility:            false
```

The repository route and code are not Kazakhstan eligibility evidence and are not activated, published or validated for Kazakhstan by this decision.

## 9. Promo decision

```
currentKazakhstanCampaign:               NONE_VERIFIED
historicalKazakhstanRelevantCampaign:    ENDED
locallyVerifiedCurrentBonusAmount:       null
globalMaximumApplicableToKazakhstan:     UNVERIFIED
promoEligibility:                        false
```

Not publishable: the expired campaign (window 2025-08-11 → 2025-09-01), any current Kazakhstan bonus amount, any global maximum, any combined reward amount.

## 10. Ranking and publication decision

```
futureRankingCandidate:                  false
rankingEligibility:                      false
ctaEligibility:                          false
promoEligibility:                        false
publicationEligibility:                  false
publicationPosture:                      BLOCKED
restrictionOnlyPublicationCandidate:     true
restrictionOnlyPublicationAuthorized:    false
```

The future site may eventually display MEXC as restricted, but only after a separate publication decision. This owner decision does not publish MEXC or Kazakhstan.

## 11. Production decision

```
legacyGeoUpdateAuthorized:               false
productionRankingUpdateAuthorized:       false
productionAvailabilityUpdateAuthorized:  false
productionRouteUpdateAuthorized:         false
productionCodeUpdateAuthorized:          false
productionChangeAuthorized:              false
publicationAuthorized:                   false
deployAuthorized:                        false
```

Existing production MEXC data remains unchanged. Kazakhstan remains publication-blocked.

## 12. Recovery boundary (preserved)

| Artifact | Bytes | SHA-256 |
|---|---|---|
| Unavailable original | 37,001 | `3f0e10d231efc2ce33f77fac85182809197c11bf5b0cf400f32c77bad4774281` |
| Recovered delivered | 27,833 | `f7658b5f7bddc29d24fd09a2c06de09d2dcfe65e6de64cc40e91c0399a380c5f` |

```
recoveryIntegrity:                      WARN
semanticCompleteness:                   true
byteIdenticalOriginalityEstablished:    false
```

Package status must remain **RECOVERED / UNVERIFIED**.

## 13. Import-preparation decision

```
ownerDecisionReadiness:              READY
importPreparationReadiness:          READY_WITH_LIMITS
importReadiness:                     NOT_READY
importPreparationDesignAuthorized:   true
normalizationExecutionAuthorized:    false
stagingImportAuthorized:             false
canonicalImportAuthorized:           false
```

Import-preparation **design** may begin, only to resolve the four recorded schema decisions:

1. whether `countryScope` and `productScope` accept arrays;
2. whether claim links remain inside source records or use a separate linkage registry;
3. how source-verification provenance is preserved without altering canonical source facts;
4. how contradictory-source relationships are preserved.

No normalization or import may occur under this decision.

## 14. Authorization flags

True only:

```
ownerDecisionCompleted:              true
importPreparationDesignAuthorized:   true
```

False:

```
researchImportAuthorized:            false
normalizationExecutionAuthorized:    false
stagingImportAuthorized:             false
canonicalImportAuthorized:           false
legacyGeoUpdateAuthorized:           false
productionChangeAuthorized:          false
rankingChangeAuthorized:             false
ctaChangeAuthorized:                 false
promoChangeAuthorized:               false
affiliateRouteChangeAuthorized:      false
referralCodeActivationAuthorized:    false
publicationAuthorized:               false
migration5Authorized:                false
pageOrRouteChangeAuthorized:         false
deployAuthorized:                    false
```

## 15. Next task

```
NEXT_TASK: CBW-KZ-MEXC-P0-B-IMPORT-PREP-DESIGN-002
```

That task may create only: deterministic normalization design; source mapping plan; claim-source linkage plan; provenance plan; conflict-preservation plan; non-production candidate design; validation report. It must not normalize, import or modify production. Do not reopen Bybit; do not start OKX/Bitget/KuCoin/BingX.
