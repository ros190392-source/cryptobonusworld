# CBW-SPLIT3-P0-OWNER-CONFIRMED-LINK-CODE-AUTHORITY-SPLIT-011

## Status
Prepared owner task. Not implemented. Not merged. Not deployed.

## Governing issue
GitHub Issue #269.

## Canonical base
- Repository: `ros190392-source/cryptobonusworld`
- Base branch: `master`
- Required base SHA: `9e34549150a495bca790552182f3826123a282d7`
- Feature branch: `fix/cbw-split3-owner-confirmed-link-code-authority-011`
- Previous global truth gate: Issue #266 / PR #267

## Owner decision — 2026-08-08
The owner explicitly confirms that the affiliate links and promo/referral codes currently present on CBW are owned/approved current commercial values and should remain usable publicly. This confirmation is bound only to the exact current values present on canonical base `9e345491…`; future edits do not inherit authority.

## Objective
Keep current owner-confirmed affiliate links, buttons and promo/referral codes active while preserving strict evidence authority for factual offer claims.

Separate three independent authority classes:
1. `LINK_AUTHORITY` — may authorize exact current affiliate/default/GEO destinations.
2. `PROMO_CODE_AUTHORITY` — may authorize exact current promo/referral codes.
3. `OFFER_CLAIM_AUTHORITY` — remains evidence-driven for bonus amount, KYC, deposit, expiry, terms, availability, restrictions, fee discount and other factual promotion claims.

Link/code confirmation must never authorize offer claims.

## Required architecture

### R1 — immutable owner-confirmation manifest
Create one code-owned immutable manifest bound to the exact current commercial values from the canonical base. For each current commercial candidate discovered independently from `exchanges.json`, bind:
- slug;
- exact meaningful `affiliateUrl`;
- exact meaningful `affiliateLinks.default`;
- exact non-placeholder `affiliateLinks.geo` values;
- exact current non-empty promo/referral code;
- provenance `owner-confirmed 2026-08-08`;
- canonical base SHA and/or deterministic value digest.

Do not authorize by slug alone.

### R2 — exact-value authority
A link is public-authorized only if its current raw value exactly matches the owner-confirmed manifest/digest. A promo code is public-authorized only if its current raw value exactly matches the owner-confirmed manifest/digest.

Any one-character mutation, query/path mutation, replacement, new link, new GEO link, new code, unknown slug, malformed URL or missing confirmation fails closed.

### R3 — independent resolvers
Implement explicit independent resolvers/projections for link authority, promo-code authority and offer-claim authority. No resolver may infer another authority class.

### R4 — restore current buttons safely
For an exact owner-confirmed link, public registration/visit buttons and `/go/<slug>/` external redirect may be active again.

While offer claims remain under re-verification, CTA wording must be claim-neutral, e.g. `Register on Bybit`, `Visit OKX`, `Open MEXC`. Do not use a claim-bearing CTA such as `Claim 30,000 USDT` without separate claim authority.

### R5 — restore exact owner-confirmed promo codes
Current exact owner-confirmed promo/referral codes may be displayed even while offer terms remain under re-verification.

UI must distinguish code authority from offer authority, e.g.:
- `Promo/referral code — owner confirmed`
- `Offer terms — under re-verification`

Do not show `Verified offer` merely because a code is owner-confirmed.

### R6 — preserve #266/#267 truth gate
All unsupported bonus, KYC, deposit, expiry, fee, availability, country restriction and terms claims remain neutral/hidden until their existing evidence path authorizes them.

### R7 — `/go/*` behavior
For exact owner-confirmed links:
- external redirect allowed;
- affiliate analytics/tracking allowed;
- redirect target must be the exact confirmed default or exact confirmed GEO variant;
- no unsupported offer claim becomes verified by the redirect path.

For unconfirmed/mutated/missing links:
- remain internal/non-commercial.

### R8 — GEO/country safety
Existing exact owner-confirmed GEO affiliate URLs may be used, but this does not authorize a claim that the exchange/offer is available or legal in the visitor country. Country truth remains a future `Exchange × Country MarketProfile` concern.

### R9 — complete current catalog
Discover commercial candidates independently from raw catalog data. At canonical base PR #267 discovered 13:
`bybit, mexc, okx, bitget, bingx, gate-io, kucoin, htx, coinex, phemex, bitunix, binance, coinbase`.

Do not invent a Coinbase promo code; its current promo code is empty.

### R10 — no future silent authorization
Any future raw URL/code change or new exchange/GEO destination must fail closed until a new explicit owner confirmation is recorded.

## Public UX target
Example while claims remain unsupported:

Bybit
- Promo/referral code: `CRYPTOBONUSW` — owner confirmed
- Offer terms: Under re-verification
- CTA: `Register on Bybit`

Allowed: confirmed link and code.
Not allowed without evidence: bonus amount, current KYC/deposit/expiry/country claims, `Verified offer` badge.

## Mandatory verification
- exact current confirmed default links authorize;
- exact current confirmed non-placeholder GEO links authorize;
- exact current non-empty promo codes authorize;
- Coinbase empty promo code stays absent;
- URL/code mutations fail closed;
- new unconfirmed exchange/link/code fails closed;
- link/code confirmation never changes offer claim state to verified;
- unsupported bonus/KYC/deposit/expiry/terms remain neutral;
- `/go` external redirects only for exact confirmed destinations;
- public buttons remain available for confirmed links;
- CTA copy remains claim-neutral;
- promo-code UI shows only exact confirmed values;
- no raw-data shortcut bypasses confirmation manifest;
- catalog/manifest coverage is independently validated;
- raw `offers.ts` commercial values unchanged;
- raw `exchanges.json` commercial values byte-for-byte unchanged;
- Bybit packet/source plan/exact claim bindings unchanged;
- `PUBLIC_MARKET_PROFILES` remains frozen empty;
- no country availability claim introduced;
- global rendered-output audit updated to allow confirmed links/codes while still forbidding unsupported offer claims;
- desktop/mobile factual posture equal;
- test-authority guard PASS.

## Gates
Run:
- `npm run portal:guard:test-authority`
- `npm run portal:contracts:test`
- `npm run ai-ops:validate:fixtures`
- full CI-scoped strict TypeScript
- `npm run build`
- `npm run portal:harness:resolution`
- Bybit official-source offline replay
- updated global public-offer output audit
- preview simulation
- production simulation
- Chromium homepage + dedicated exchange pages desktop/mobile/keyboard
- direct `/go/*` browser matrix for every current commercial candidate
- raw commercial-value immutability audit
- fresh exact-head GitHub Actions and individual step inspection

## Integration
- Work only on `fix/cbw-split3-owner-confirmed-link-code-authority-011`.
- Draft PR against `master` with `Closes #269`.
- No deploy in this implementation PR.
- Leave Draft for owner review unless a later explicit owner instruction authorizes conditional merge.
- After merge, the next stage is the first production deploy of accumulated CBW changes.

## Prohibited
- no modification of current affiliate URLs/codes;
- no invented promo code;
- no unsupported offer claim upgrade;
- no MarketProfile population;
- no Cloudflare/deploy/env/secret changes;
- no unrelated redesign;
- no new evidence claim support in this task.
