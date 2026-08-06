# CBW-SPLIT3-P0-BYBIT-OFFICIAL-MULTI-SOURCE-CLAIM-EVIDENCE-007

## Status
Prepared owner task. Not implemented. Not merged. Not deployed.

## Governing issue
GitHub Issue #260.

## Canonical base
- Repository: `ros190392-source/cryptobonusworld`
- Base branch: `master`
- Required base SHA: `d107b83b72d27b20900d307ded0185caead2776c`
- Feature branch: `feat/cbw-split3-bybit-official-multisource-evidence-007`

## Objective
Capture, validate and commit bounded official public Bybit evidence for the seven unresolved non-promo required offer claims. Use a code-owned claim/source plan, existing safe capture foundations and fully offline CI replay.

## Target required claims
- `bybit.bonus_headline`
- `bybit.kyc_required`
- `bybit.deposit_required`
- `bybit.availability`
- `bybit.restricted_countries`
- `bybit.reward_type`
- `bybit.terms_summary`

Optional claims may be re-checked when the same source directly covers them:
- `bybit.fee_discount`
- `bybit.min_deposit`
- `bybit.expiry`

Excluded from source-based support:
- `bybit.promo_code` remains confirmation-gated;
- `bybit.realistic_value` remains editorial/non-authorizing.

## Core requirements
1. Add immutable `BYBIT_OFFER_CLAIM_SOURCE_PLAN` with exact assertion, required status, accepted/disallowed source scope, preferred capture method, evidence rule, staleness and contradiction behavior.
2. Add reusable official-source capture artifacts with strict timestamps, official URL identity, source scope, bounded claim fragments, source/fragment digests and recursive safety.
3. Preserve existing HTTP probes and rendered network-error records unless a deterministic schema-only migration is required.
4. Run a manual anonymous public capture against official Bybit sources. No authentication, cookies/profile import, proxy/VPN, geo bypass, CAPTCHA bypass, forms, registration, KYC, deposit or transaction actions.
5. Keep CI fully offline. Validate committed normalized artifacts and recompute every digest.
6. Upgrade a raw claim to `supported` only when official evidence proves the complete current CBW assertion at the required scope.
7. Use `partially_supported`, `not_found`, `contradicted` or `inaccessible` honestly where exact support is absent.
8. Do not infer promotion-specific facts from general account-wide documentation.
9. Contradictions must remain fail-closed and identify the product field requiring later correction.
10. Raw promo claim stays `requires_owner_partner_confirmation`; packet stays `draft`; `offers.bybit.evidence` stays `null`.
11. Production adapter stays non-authorizing; `PUBLIC_MARKET_PROFILES` stays frozen empty; both public `/go/*` counts stay zero.
12. Create a Draft PR only and stop for owner review.

## Prohibited
- No merge.
- No deploy or Cloudflare publication.
- No env/secret changes.
- No affiliate destination changes.
- No trusted partner configuration or real promo receipt.
- No packet approval or real evidence activation.
- No MarketProfile population.
- No capture for another exchange.
- No owner-authored file mutation/deletion.
- No full HTML, page body, browser cache, HAR, videos, cookies, tokens or personal data committed.

## Mandatory gates
- `npm run portal:contracts:test`
- `npm run ai-ops:validate:fixtures`
- strict scoped TypeScript check
- `npm run build`
- source-plan and offline replay tests
- one manual public anonymous multi-source capture run
- preview simulation
- public production simulation
- focused homepage Chromium desktop/mobile/keyboard QA
- working-tree and artifact audit

## Final report
Return branch/HEAD, commits, exact changed files, every official source and scope, capture outcomes/timestamps/digests, bounded fragments, claim-by-claim before/after decision, contradiction/partial/inaccessible details, unchanged promo/packet/evidence posture, test totals, Chromium and `/go/*` counts, Draft PR state, CI step outcomes and remaining blockers.