# Binance × Poland — independent Source Truth Review

Task: `CBW-PL-BINANCE-P0-A-DEEP-RESEARCH-001`  
Evidence PR: #276  
Reviewed evidence head: `8fc3438405a1c34f4ec0157b4d065fb16c01bf96`  
Reviewed: 2026-08-08

## Verdict

**ACCEPT_AS_RESEARCH_RECORD — PROCEED_TO_VALIDATION**

No correction layer is required. The package is conservative where the evidence is incomplete and does not convert public Binance surfaces or old Polish registration into a current legal-availability claim.

## Package integrity

- 11/11 required research files present.
- 9/9 JSON files parse.
- Factory accepted the manifest, byte sizes, SHA-256 hashes and cross-references.
- IDs are unique: 15 sources, 16 claims, 4 conflicts, 6 products and 3 payment rails.
- All research/import/product/publication/deploy authorisations remain false.

## Decisive independent checks

### 1. Historical Polish registration

UKNF confirms that Binance Poland sp. z o.o. entered the former Polish virtual-currency register on 29 September 2022. The same UKNF communication explicitly states that KNF did not license, register, supervise or approve crypto exchanges under that pre-MiCA regime.

**Review result:** package treatment is correct. The historical register entry cannot be promoted into current licence authority.

### 2. MiCA transition and current legal rule

UKNF's 23 June 2026 notice confirms that the Polish Article 143(3) transition ends on 1 July 2026. ESMA Article 59 requires Article 63 authorisation or an applicable Article 60 basis to provide crypto-asset services in the Union. ESMA guidance also distinguishes grandfathered VASPs from MiCA-authorised CASPs.

**Review result:** package treatment is correct. Post-transition Poland availability needs current MiCA authority.

### 3. Current CASP register limitation

ESMA's Interim MiCA Register landing page is current to 16 July 2026 and identifies the authorised-CASP register as the primary central register. The linked CSV could not be row-parsed using the available reviewer tooling.

**Review result:** package correctly fails closed. It does not infer that Binance is absent from the register merely because the reviewer could not parse the CSV, and it does not assert a positive current licence without a bound row.

### 4. Current secondary corroboration

Reuters reported on 9 July 2026 that Binance remained in close talks with EU regulators after withdrawing the Greek MiCA application. Financial Times reported on 6 August 2026 that Binance had not received EU approval.

**Review result:** appropriate as current corroboration only. These sources do not replace the ESMA authorised-CASP register.

### 5. PLN / P2P / Polish-language surfaces

Public Binance pages expose USDT/PLN P2P, a Santander Poland payment-method surface and Polish-language trading pages.

**Review result:** package scope is correct. These pages establish public/technical reachability only and do not prove legal authorisation, successful Polish onboarding or product entitlement.

### 6. KYC

Current Binance public guidance supports identity-verification requirements for full account functionality and for P2P.

**Review result:** package correctly keeps KYC as a platform-level fact rather than Poland onboarding approval.

### 7. Poland-specific referral / bonus eligibility

No Poland-specific Binance campaign eligibility was established. CryptoBonusWorld's owner-confirmed global Binance commercial destination/code is a separate authority class.

**Review result:** `UNCONFIRMED_FOR_POLAND` is correct; no country offer claim is authorised.

## Product and rail review

- Account onboarding / ordinary services — agree `UNDER_REVIEW`.
- Spot public surface — agree visible surface only.
- P2P — agree visible surface only; KYC is documented, resident eligibility is not.
- Futures / derivatives — agree `NOT_VERIFIED` for Poland.
- Earn / staking — agree `NOT_VERIFIED` for Poland.
- Referral / promo / bonus — agree `UNCONFIRMED` for Poland.
- USDT/PLN P2P — agree public surface only.
- Santander Poland P2P — agree public surface only.
- Direct PLN bank/card deposit or withdrawal — agree `NOT_VERIFIED`.

## Remaining limitations

1. Direct row-level lookup in the current ESMA authorised-CASP dataset remains outstanding.
2. No account creation, onboarding, KYC submission, payment, referral or transaction test was performed.
3. Direct PLN bank/card rails were not independently verified.
4. Poland-specific derivatives, earn/staking and campaign eligibility remain unverified.

## Final recommendation

Accept this package as an immutable research record and proceed to independent Factory validation. Keep Binance × Poland **under review** for legal/account/product availability. Do not create an approved `available` MarketProfile, Poland country CTA, ranking uplift or country bonus claim from this record.

No research import, canonical import, production change, ranking, CTA, promo, affiliate-route, publication, sitemap, indexability or deploy authority is granted by this review.
