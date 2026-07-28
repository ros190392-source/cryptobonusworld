# CBW Affiliate Offer Verification Standard V1

> Architecture standard for public, anonymous affiliate-offer verification. Non-production.
> Back to [master system](./CBW_CONTINUOUS_EXCHANGE_MARKET_INTELLIGENCE_SYSTEM_V1.md).
> Data structures: [affiliate campaign/offer model](../../schemas/continuous-market-intelligence-v1/CBW_AFFILIATE_CAMPAIGN_OFFER_MODEL_V1.json).

This standard contains **no real affiliate URLs, referral codes, secrets or bonus amounts**; all
examples use the reserved `example.invalid` domain and obvious placeholders.

## 1. Managed internal redirect identity (identity only)

Each affiliate campaign has a **managed internal redirect slug** (e.g. `go/binance-kz-example`) used
as a stable identity for monitoring and binding. This standard **defines the identity only**; it does
**not** create a live route, and affiliate-route changes are owner-gated
(`ownerApprovedRoute` defaults false).

## 2. Tracked fields

For each campaign the platform tracks: source URL (placeholder), redirect chain, final destination
domain (placeholder), campaign/referral identifiers (placeholders), the **visible offer** vs the
**applicable terms**, GEO eligibility and new-user eligibility.

## 3. Verification levels (L0–L4)

| Level | Meaning | Authorization |
| --- | --- | --- |
| `L0_UNVERIFIED` | No evidence captured | none |
| `L1_LINK_RESOLVED` | Redirect chain resolved anonymously to a final destination domain | none |
| `L2_OFFER_CAPTURED` | Public offer page captured with snapshot + hash | none |
| `L3_TERMS_CONFIRMED` | Public terms/eligibility captured and cross-checked against official pages | none |
| `L4_ACCOUNT_CONFIRMED` | Reward confirmed via a real account | **separate owner authorization required** |

## 4. L0–L3 anonymous evidence procedures

L0–L3 verification **MUST** be performed anonymously and **MUST NOT** use account creation, login,
KYC submission, fake identity, VPN/proxy, location spoofing, referral-code submission, deposits or
trades. Procedures:

1. **L1:** resolve the redirect chain, recording each hop, HTTP status and the final destination
   domain; store a `RedirectObservation` with a content hash.
2. **L2:** capture the public offer/landing page as HTML + screenshot, hash the content, and record an
   `OfferSnapshot` with `offerStatus` and an "up to …" style headline placeholder.
3. **L3:** capture the public terms, extract `OfferTerm` rows (eligibility, wagering, time window,
   GEO, KYC-required) and cross-check against the official exchange pages; attach each to a `Claim`.

## 5. L4 separate authorization boundary

`L4_ACCOUNT_CONFIRMED` is a **separately authorized future capability**. It is never performed without
an explicit owner authorization, and even then it **MUST NOT** use automation, proxy, fake identity or
prohibited financial actions. Until authorized, offer reward claims remain at most `L3`.

## 6. Evidence artifacts

Every verification event stores: raw HTML, a screenshot, the URL/redirect chain, a content hash and a
timestamp, in the evidence object store (never in Git or the operational DB).

## 7. Offer statuses and CTA behavior

Required offer statuses: `ACTIVE`, `CHANGED`, `EXPIRED`, `GEO_RESTRICTED`, `BROKEN_LINK`, `SUSPENDED`,
`UNKNOWN`. CTA behavior (`CTAState`):

- `ACTIVE` + owner-approved → CTA `ENABLED`;
- `CHANGED` → CTA `UNDER_REVIEW` until re-verified;
- `BROKEN_LINK` / `SUSPENDED` → CTA `SUPPRESSED_BROKEN`;
- `GEO_RESTRICTED` for the market → CTA `SUPPRESSED_GEO`;
- `EXPIRED` / `UNKNOWN` → CTA `DISABLED`.

Any transition to `ENABLED` on a live CTA is **owner-gated**.

## 8. Language rules

Offer language **MUST** use "up to" phrasing and **MUST NOT** state a guaranteed reward, guaranteed
eligibility or a concrete bonus amount that has not been L2/L3-captured with evidence. Marketing
superlatives without evidence are prohibited.

## 9. Change detection, broken-link handling, emergency suppression

- The [source monitoring standard](./CBW_SOURCE_MONITORING_STANDARD_V1.md) watches affiliate landing
  pages; a material change emits a `ChangeEvent`.
- A broken or suspended link **MUST** trigger emergency CTA suppression (`SUPPRESSED_BROKEN`) without
  waiting for an owner, because suppression is fail-safe; re-enabling is owner-gated.

## 10. Privacy, ToS and anti-circumvention

Verification **MUST** respect each site's robots and Terms of Service, **MUST NOT** attempt to
circumvent access controls, and **MUST NOT** collect personal data. Anti-circumvention: no proxy
rotation, CAPTCHA-solving, or identity fabrication. See the safety note in
[the affiliate model](../../schemas/continuous-market-intelligence-v1/CBW_AFFILIATE_CAMPAIGN_OFFER_MODEL_V1.json).
