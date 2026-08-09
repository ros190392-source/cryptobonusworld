# Source truth research report — OKX × Poland

Task: `CBW-PL-OKX-P0-C-DEEP-RESEARCH-003`
Checked: `2026-08-09`
Mode: official-source-first · evidence-first · no proxy · no account testing

## Executive finding

Evidence supports a **candidate `AVAILABLE_WITH_LIMITS` posture for OKX core crypto exchange/custody/transfer services in Poland**, not blanket availability.

The country-specific evidence is an OKX Poland launch statement plus an OKX Europe policy that explicitly lists Poland among permitted countries. The Poland launch names spot trading, staking, trading bots, EUR deposits/withdrawals and localized service.

Polish regulator evidence is intentionally separated by entity and regime:
- KNF records a cross-border payment-services notification for **OKX Europe Limited**, received `2026-02-12`, services `1,2,3a,3b,3c`.
- KNF separately lists **OKX Europe Markets Limited** as a notified foreign investment firm, with a scope change recorded `2026-03-09`.

Neither record is collapsed into a generic “Poland licence” claim.

## Product and rail posture

- Core exchange/custody/transfer: `AVAILABLE_WITH_LIMITS`.
- Spot: `AVAILABLE_WITH_LIMITS`.
- Staking: `AVAILABLE_WITH_LIMITS`.
- KYC/onboarding: available only with documented identity/account conditions.
- PLN P2P: `PUBLICLY_LISTED_WITH_LIMITS`; public PLN↔USDT surfaces exist, but account/KYC and live market conditions apply.
- EUR SEPA deposit/withdrawal: `SUPPORTED_WITH_LIMITS`.
- Direct PLN bank deposit/withdrawal: `NOT_VERIFIED`; P2P must not be reinterpreted as a direct bank rail.
- Leveraged investment product layer: `AVAILABLE_WITH_LIMITS` with medium confidence only when KNF investment-firm notification is combined with OKX EEA product eligibility rules; exact account access was not tested.

## Referral / CBW commercial boundary

OKX publishes an EEA referral program on Polish-language surfaces. Participation/rewards are KYC, campaign, region and user dependent.

CBW separately has an owner-confirmed global OKX destination/code. That exact-value authority is **not** Poland referral eligibility evidence.

Therefore:
- referral program existence: supported;
- exact Poland eligibility for the CBW URL/code: `UNDER_REVIEW`;
- fixed current Poland reward/bonus amount: `UNDER_REVIEW`;
- no Poland-specific bonus amount may be published from this record.

## Conflict rules retained

1. Generic EEA/MiCA context is not standalone Poland availability proof.
2. KNF payment notification is not crypto/CASP authority.
3. PLN P2P is not a direct PLN bank rail.
4. Investment-firm notification and account-level product eligibility are separate.
5. A live EEA referral program does not bind CBW’s global OKX code to Poland campaign eligibility.

## Import / publication posture

The package is ready only for deterministic package validation and independent Source Truth Review.

All import, MarketProfile publication, `master`, production, ranking, CTA, promo, affiliate-route, sitemap, indexability and deploy authorizations remain **false**.

Recommended next step: `PACKAGE_VALIDATION_THEN_SOURCE_TRUTH_REVIEW`.
