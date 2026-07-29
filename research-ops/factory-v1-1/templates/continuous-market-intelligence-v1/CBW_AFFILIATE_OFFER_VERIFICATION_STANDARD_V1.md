# CBW Affiliate Offer Verification Standard V1

> Architecture standard for public affiliate-offer verification. Non-production. **Owner Audit
> Correction 026:** operational (non-placeholder) fields; corrected verification levels and offer
> statuses; public observed values are evidence, not secrets. Back to
> [master system](./CBW_CONTINUOUS_EXCHANGE_MARKET_INTELLIGENCE_SYSTEM_V1.md).
> Data structures: [affiliate campaign/offer model](../../schemas/continuous-market-intelligence-v1/CBW_AFFILIATE_CAMPAIGN_OFFER_MODEL_V1.json).

Architecture **examples** remain fake and use `example.invalid`. The **schema** is operational: at
runtime it records the actual observed public affiliate URL, referral code, redirect chain, final
destination, visible offer figures and public terms as **evidence**. Credentials, private tokens,
session cookies, private dashboard data and personal account data are excluded and never committed.

## 1. Managed internal redirect identity

Each campaign has a managed `internalRedirectRoute` (e.g. `/go/binance-kz-example`) as a stable
identity for monitoring and binding. This standard defines identity only; it creates no live route,
and route/referral-code changes are owner-gated.

## 2. Operational fields (no `Placeholder` suffix)

The model stores: `sourceAffiliateUrl`, `internalRedirectRoute`, `campaignIdentifier`, `referralCode`,
`redirectHopUrl` / `redirectHopHttpStatus`, `finalDestinationUrl` / `finalDestinationDomain`,
`offerHeadline`, `advertisedMaximumValue` / `advertisedCurrency`, `rewardType`, `termsUrl` / `termText`,
`geoEligibility`, `newUserEligibility`, `kycRequired`, `depositConditions`, `tradingConditions`,
`timeWindow`, `observedAt`, `contentHash`, `evidenceSnapshotId`, `screenshotEvidenceId`,
`dataClassification`, `redactionPolicy`.

## 3. Data classification

`PUBLIC_OBSERVED` (public landing URLs, public codes, visible offer figures — allowed as evidence);
`INTERNAL_COMMERCIAL`; `SENSITIVE_SECRET` (dashboard links, credentials, cookies, tokens — never in
Git, never collected by monitoring); `PERSONAL_DATA` (never collected in L0–L3).

## 4. Verification levels

| Level | Proves | Authorization |
| --- | --- | --- |
| `L0_UNVERIFIED` | nothing captured yet | none |
| `L1_LINK_RESOLVES` | the complete redirect chain resolves to a final destination | none |
| `L2_OFFER_VISIBLE` | the visible public offer is captured (snapshot + hash) | none |
| `L3_TERMS_ELIGIBLE` | public terms and GEO/new-user eligibility are supported | none |
| `L4_ACCOUNT_CONFIRMED` | reward confirmed via a real account | **separate owner authorization** |

## 5. L0–L3 anonymous procedures

Performed anonymously; **MUST NOT** use account creation, login, KYC submission, fake identity,
VPN/proxy, location spoofing, deposits or trades. L1 resolves and records the redirect chain; L2
captures the public offer as HTML + screenshot with a hash; L3 captures public terms, extracts
`OfferTerm` rows and cross-checks the official pages, attaching each to a `Claim`.

## 6. L4 separate authorization boundary

`L4_ACCOUNT_CONFIRMED` is a separately authorized future capability, never performed without an
explicit owner authorization and never using automation, proxy or prohibited financial actions.

## 7. Offer statuses → CTA behavior

| Offer status | CTA |
| --- | --- |
| `ACTIVE_VERIFIED` | `ENABLED` only when owner route/code/CTA approvals are valid |
| `ACTIVE_LIMITED` | cautious "check conditions"; enable owner-gated |
| `UNDER_REVIEW` | `UNDER_REVIEW` |
| `CODE_NOT_APPLIED` | `UNDER_REVIEW` until owner review |
| `GEO_NOT_ELIGIBLE` | `GEO_SUPPRESSED` |
| `LINK_BROKEN` | `FAILSAFE_SUPPRESSED` |
| `OFFER_ENDED` | `DISABLED` |
| `SOURCE_UNAVAILABLE` | `UNDER_REVIEW` |
| `CONFLICTED` | `DISABLED` pending resolution |

Fail-safe suppression (`GEO_SUPPRESSED`, `FAILSAFE_SUPPRESSED`, `UNDER_REVIEW`) MAY be automatic.
Enable/re-enable, route changes and referral-code changes are RED / owner-gated.

## 8. Language rules

Offer language **MUST** use "up to" phrasing and **MUST NOT** state a guaranteed reward or a concrete
value not captured at `L2_OFFER_VISIBLE`+. `advertisedMaximumValue` is an **observed** maximum, not a
promise.

## 9. Change detection, broken-link handling, emergency suppression

[Source monitoring](./CBW_SOURCE_MONITORING_STANDARD_V1.md) watches redirect and landing/terms; a
material change emits a `ChangeEvent`. `LINK_BROKEN` triggers immediate fail-safe CTA suppression
without waiting for an owner; re-enabling is owner-gated.

## 10. Privacy, ToS, anti-circumvention

Respect robots and ToS; do not circumvent access controls; collect no personal data; no proxy
rotation, CAPTCHA-solving or identity fabrication. `redactionPolicy` strips any accidental session
token from a captured URL before storage.
