# CBW Kazakhstan Pilot Data Freeze Review — 051

Status: OWNER-FACING REVIEW / NO PUBLICATION AUTHORITY  
Parent roadmap: #130  
Pilot issue: #136  
Working PR: #139

## 1. Purpose

This review freezes the current evidence-to-data boundary for the first CryptoBonusWorld Portal Factory country pilot.

It records what is technically validated, what remains blocked, and what the current data must **not** be used to publish.

No statement in this document authorizes:

- a public Kazakhstan country hub;
- a numbered Kazakhstan ranking;
- localized indexable routes;
- a Binance or Bybit Kazakhstan affiliate CTA;
- a promo code or bonus claim;
- merging draft PR #139;
- production deployment.

## 2. Validated market profiles

### Binance × Kazakhstan

Profile ID: `market-profile:binance:kz`  
Approval: `validated`  
Availability: `limited`  
Offer eligibility: `under_review`

Mapped dataset:

- 8 SourcePackets;
- 8 NormalizedClaims;
- 1 MarketProfile;
- EN/RU immutable fact-parity contract;
- build-blocking runtime validation.

Validated core topics:

- active local entity record;
- current AFSA licence number;
- Future/Option licence-scope signal with account-level limitations;
- regulated P2P legal route;
- Kazakhstan-targeted public surface visibility;
- visible but untested registration path;
- personal KYC requirement;
- absent owner-approved CBW campaign binding.

Excluded from the validated core:

- current operational status of KZT fiat rails;
- active P2P offers, directions and resident eligibility;
- dynamic referral amounts or Kazakhstan campaign eligibility;
- account creation, KYC approval, deposit, withdrawal or entitlement testing.

### Bybit × Kazakhstan

Profile ID: `market-profile:bybit:kz`  
Approval: `validated`  
Availability: `available`  
Offer eligibility: `under_review`

Mapped dataset:

- 2 SourcePackets;
- 3 NormalizedClaims;
- 1 MarketProfile;
- build-blocking runtime validation.

Validated core topics:

- current AFSA licence number `AFSA-A-LA-2024-0027`;
- governed country-availability state;
- no affirmative evidence that the tracked global welcome package is confirmed for Kazakhstan users.

Important source limitation:

- the repository contains a dated governed summary and official AFSA URL;
- the standalone raw AFSA HTML capture is outside the tracked tree;
- the SourcePacket therefore carries an explicit warning and protects the exact governed summary with a SHA-256 digest;
- the composite legacy note's P2P launch and numeric limits were deliberately excluded.

## 3. Blocked candidate

### OKX × Kazakhstan

Profile ID reserved: `market-profile:okx:kz`  
Current state: **BLOCKED**

Reason:

- existing research conclusion is `CONFLICTING`;
- confidence is `MEDIUM`;
- import readiness is `BLOCKED`;
- source-truth review, correction if required, and independent validation are incomplete.

No validated Portal Factory OKX × Kazakhstan profile may be created from the current package.

## 4. Evidence gap register

Current open gaps: **9**

- P0: **8**
- P1: **1**

P0 categories:

1. Binance current KZT rail status.
2. Binance active P2P methods/directions.
3. Binance CBW campaign binding.
4. Bybit P2P launch/limit source separation.
5. Bybit local offer eligibility.
6. OKX source-truth lifecycle.
7. Kazakhstan ranking methodology freeze.
8. Owner approval of a non-empty RankingSnapshot.

P1 category:

1. Dedicated Bybit Kazakhstan KYC source packet.

The executable register lives in:

`src/data/pilots/kz/readiness.ts`

## 5. Ranking readiness

Required validated profiles: **3**  
Current validated profiles: **2**  
Current ranking state: **BLOCKED**

| Gate | State |
|---|---|
| Profile count | FAIL — 2/3 |
| Existing profile validation | PASS |
| Evidence freshness | PASS at review timestamp |
| Methodology freeze | FAIL |
| Affiliate independence | PASS |
| Owner snapshot approval | FAIL |
| Public indexability | FAIL |

The ranking route must continue to display candidate readiness and gaps without numbered positions.

## 6. Locale freeze

Current locale pilot pair:

- source presentation: English;
- first review translation: Russian.

The EN/RU layer stores localized labels and summaries only. Both variants reference the same immutable claim and profile objects.

The parity validator compares:

- claim IDs and order;
- predicate;
- value;
- effective/expiry dates;
- confidence;
- approval state;
- supporting and contradicting packet IDs.

A divergence stops the build.

## 7. Current review routes

All routes remain `noindex`:

- `/__design/cbw-v2/market-passport/` — real Binance × KZ normalized profile with EN/RU toggle;
- `/__design/cbw-v2/country-ranking/` — real 2/3 readiness matrix and P0 gaps;
- `/__design/cbw-v2/contracts/` — contract and failure-state fixtures;
- `/__design/cbw-v2/country/` — country template;
- `/__design/cbw-v2/homepage/` — Homepage v2 concept.

## 8. Next controlled sequence

1. Complete Chromium browser QA for the updated KZ data routes.
2. Close temporary QA PR without merge.
3. Update draft PR #139 evidence and validation record.
4. Complete OKX source-truth lifecycle or identify another third-profile candidate with equivalent evidence quality.
5. Map missing P0 local-payment/P2P evidence.
6. Prepare a Kazakhstan methodology proposal.
7. Produce an owner-review RankingSnapshot proposal only after three profiles validate.
8. Keep ranking, indexability, locale activation and affiliate actions disabled until separate owner decisions.
