# CBW-SPLIT3-P0-BYBIT-UNVERIFIED-PUBLIC-COPY-NEUTRALIZATION-009

## Status
Prepared owner task. Not implemented. Not merged. Not deployed.

## Governing issue
GitHub Issue #264.

## Canonical base
- Repository: `ros190392-source/cryptobonusworld`
- Base branch: `master`
- Required base SHA: `b04a7d03f704e6f814df0a63ce884e90dcb54292`
- Feature branch: `fix/cbw-split3-bybit-public-copy-neutralization-009`

## Objective
Prevent unsupported Bybit commercial claims from being presented as public facts while preserving the raw/internal candidate data needed by the evidence and confirmation systems.

Current real evidence posture is fail-closed: packet `draft`; promo confirmation missing; all ten source-plan claims `inaccessible`; `offers.bybit.evidence = null`; no public `/go/*`. Public presentation must match that posture.

## Required public result
The site may show `Bybit` and a neutral re-verification state. It must not publicly expose the unconfirmed promo code or unsupported bonus amount, value estimate, fee discount, KYC/deposit requirements, availability/restricted-country list, reward mechanics, expiry or terms-summary claims as verified facts.

## Architecture
1. Preserve the raw evidence packet, confirmation candidate and official-source artifacts unchanged.
2. Derive public Bybit offer presentation from authoritative evidence/confirmation state, never from raw `Offer.status` alone.
3. Real Bybit state must resolve to `under_re_verification`.
4. Unsupported fields are hidden or replaced by concise non-claiming neutral copy.
5. `CRYPTOBONUSW` remains available internally as the unconfirmed candidate but must not leak to public HTML, metadata, structured data, aria/data attributes or client payloads.
6. Only authoritative production evidence may restore claim-bearing public copy; no manual bypass flag.
7. Audit all public surfaces and add a deterministic rendered-output forbidden-string check.

## Forbidden real-public strings/claims while current state persists
- `CRYPTOBONUSW`
- `Up to 30,000 USDT Welcome Package`
- `$30–$200` realistic-value estimate or equivalent current raw estimate
- `Up to 50% fee discount`
- promotion-specific KYC/deposit assertions
- raw minimum-deposit wording
- `Global (excluding restricted regions)`
- the asserted `US, UK, CA, SG, NL` restriction list
- raw voucher/reward/expiry wording
- raw terms summary
- verified/confirmed/current-offer labels for Bybit

## Mandatory invariants
- raw evidence packet unchanged;
- 8 official-source artifacts + digests unchanged;
- source-plan/candidate fingerprints unchanged;
- real confirmation set frozen empty;
- production partner trust empty;
- raw promo claim remains `requires_owner_partner_confirmation`;
- all ten source-plan claims remain `inaccessible`;
- packet remains `draft`;
- `offers.bybit.evidence` remains null;
- `PUBLIC_MARKET_PROFILES` remains frozen empty;
- test-authority guard remains PASS;
- preview `/go/* = 0`;
- production-simulation `/go/* = 0`.

## Gates
Run contracts, fixtures, test-authority guard, strict TypeScript, build, resolution harness, official-source offline replay, forbidden-string/public-output audit and full homepage Chromium preview/production desktop/mobile/keyboard.

## Integration
Create a Draft PR against master with `Closes #264` after all gates pass. Leave Draft for owner review. Do not merge or deploy.

## Prohibited
No evidence upgrade, receipt/trust configuration, packet approval, MarketProfile population, deploy/Cloudflare/env/secret/affiliate change, other-exchange copy work, or owner-authored file mutation/deletion.