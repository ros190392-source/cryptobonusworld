# CBW Kazakhstan Pilot Data Freeze Review — 051

Status: OWNER-FACING REVIEW / NO PUBLICATION AUTHORITY  
Parent roadmap: #130  
Pilot issue: #136  
Working PR: #139

## 1. Purpose and authority boundary

This review freezes the current evidence-to-data boundary for the first CryptoBonusWorld Portal Factory country pilot.

It records what is technically validated, what remains conflict-blocked, and what the current data must **not** be used to publish.

This document does not authorize:

- a public Kazakhstan country hub;
- a numbered Kazakhstan ranking;
- localized indexable routes;
- a Binance, Bybit or OKX Kazakhstan affiliate CTA;
- a promo code or bonus claim;
- merging draft PR #139;
- production deployment.

## 2. Validated market profiles

### Binance × Kazakhstan

- profile: `market-profile:binance:kz`;
- approval: `validated`;
- availability: `limited`;
- offer eligibility: `under_review`;
- 8 SourcePackets;
- 8 NormalizedClaims;
- EN/RU immutable fact parity;
- build-blocking runtime validation.

Validated core:

- active local entity record;
- current AFSA licence;
- Future/Option licence-scope signal with account-level limitations;
- regulator-described P2P legal route;
- Kazakhstan-targeted public surface;
- visible but untested registration path;
- personal KYC requirement;
- absent owner-approved CBW campaign binding.

Excluded:

- current operational status of KZT fiat rails;
- active P2P methods, directions and resident eligibility;
- dynamic referral amounts or Kazakhstan campaign eligibility;
- account creation, KYC approval, deposit, withdrawal or entitlement testing.

### Bybit × Kazakhstan

- profile: `market-profile:bybit:kz`;
- approval: `validated`;
- availability: `available`;
- offer eligibility: `under_review`;
- 2 SourcePackets;
- 3 NormalizedClaims;
- build-blocking runtime validation.

Validated core:

- current AFSA licence `AFSA-A-LA-2024-0027`;
- governed country-availability state;
- absence of affirmative Kazakhstan eligibility evidence for the tracked global welcome package.

Source limitation:

- the repository contains a dated governed summary and official AFSA URL;
- the standalone raw AFSA HTML capture is outside the tracked tree;
- the SourcePacket carries an explicit warning and protects the governed summary with a SHA-256 digest;
- composite legacy P2P launch and numeric-limit statements remain excluded.

### OKX × Kazakhstan

- profile: `market-profile:okx:kz`;
- approval: `validated`;
- availability: `unknown`;
- offer eligibility: `under_review`;
- 7 SourcePackets;
- 6 NormalizedClaims;
- build-blocking runtime validation;
- ranking eligibility: **blocked by retained conflict**.

Validated corrected-research outcome:

- overall recommendation: `CONFLICTING`;
- confidence: `MEDIUM`;
- platform availability: `AVAILABLE_WITH_LIMITS`;
- local authorization: `RESTRICTED`;
- technical reachability: `AVAILABLE_WITH_LIMITS`;
- offer eligibility: `UNKNOWN`;
- import readiness: `BLOCKED`;
- ops recommendation: `HOLD_CONFLICTING`.

Mapped core:

- Kazakhstan absent from the reviewed OKX restricted-locations list, with an explicit non-eligibility limitation;
- registration is residence/jurisdiction gated;
- official KZT/USDT P2P surface is technically visible;
- AFSA names OKX among unlicensed platforms;
- regulated P2P framework requires an AIFC-licensed DATF;
- no affirmative Kazakhstan-specific referral entitlement was established.

The profile is valid as a conflict-preserving evidence object. It is not a recommendation, availability approval, ranking row or CTA authority.

## 3. Evidence and decision gap register

Current open gaps: **9**

- P0: **8**
- P1: **1**

P0 categories:

1. Binance current KZT rail status.
2. Binance active P2P methods and directions.
3. Binance CBW campaign binding.
4. Bybit P2P launch/limit source separation.
5. Bybit local offer eligibility.
6. OKX retained platform-reachability versus local-authorization conflict.
7. Kazakhstan ranking methodology freeze.
8. Owner approval of a non-empty RankingSnapshot.

P1 category:

1. Dedicated Bybit Kazakhstan KYC source packet.

Executable register:

`src/data/pilots/kz/readiness.ts`

## 4. Ranking readiness

Required validated review profiles: **3**  
Current validated review profiles: **3**  
Current ranking state: **BLOCKED**

| Gate | State |
|---|---|
| Profile count | PASS — 3/3 |
| Profile validation | PASS |
| Evidence freshness | PASS at review timestamp |
| Conflict resolution | FAIL — OKX conflict retained |
| Methodology freeze | FAIL |
| Affiliate independence | PASS |
| Owner snapshot approval | FAIL |
| Public indexability | FAIL |

Three complete evidence profiles are not the same as three eligible ranking rows. The ranking route must continue to display blank positions, conflict status and open gates.

## 5. Locale freeze

Current locale pilot pair:

- source presentation: English;
- first review translation: Russian.

The EN/RU layer stores localized labels and summaries only. Both variants reference the same immutable Binance claim and profile objects.

The parity validator compares:

- claim IDs and order;
- predicate and value;
- effective and expiry dates;
- confidence and approval state;
- supporting and contradicting packet IDs.

A divergence stops the build.

## 6. Review routes

All routes remain `noindex`:

- `/__design/cbw-v2/market-passport/` — real Binance × KZ profile with EN/RU toggle;
- `/__design/cbw-v2/country-ranking/` — 3/3 profiles, retained OKX conflict and executable gates;
- `/__design/cbw-v2/contracts/` — contracts and failure fixtures;
- `/__design/cbw-v2/country/` — country template;
- `/__design/cbw-v2/homepage/` — Homepage v2 concept.

## 7. Next controlled sequence

1. Pass advisory CI and updated Chromium QA for the three-profile state.
2. Keep temporary QA PRs closed without merge.
3. Prepare a Kazakhstan methodology proposal with explicit conflict exclusion rules.
4. Map missing P0 local-payment and P2P evidence.
5. Prepare a draft, non-approved RankingSnapshot proposal only after methodology review.
6. Keep ranking, indexability, locale activation, affiliate actions, merge and deploy disabled until separate owner decisions.
