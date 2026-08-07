# CBW-SPLIT3-P0-GLOBAL-UNVERIFIED-OFFER-PUBLIC-TRUTH-GATE-010

## Status
Prepared owner task. Not implemented. Not merged. Not deployed.

## Governing issue
GitHub Issue #266.

## Canonical base
- Repository: `ros190392-source/cryptobonusworld`
- Base branch: `master`
- Required base SHA: `f7c9699240e9c76caeff1262359678d07eeace49`
- Feature branch: `fix/cbw-split3-global-public-truth-gate-010`

## Objective
Generalize the evidence-driven public-truth gate from Bybit to every current offer-bearing exchange. A raw offer candidate may remain internally, but no promo code, bonus claim, verified badge, affiliate link, `/go/` redirect or rich promo page may be public-commercial without an explicit exchange-specific machine-authoritative evidence path.

## Current affected exchanges
- Bybit — already governed by the claim-level packet/confirmation projection; preserve it unchanged.
- MEXC — current `Offer.evidence = null`; no dedicated authorizing packet/adapter.
- Bitget — current `Offer.evidence = null`; no dedicated authorizing packet/adapter.
- OKX — current `Offer.evidence = null`; no dedicated authorizing packet/adapter.
- KuCoin — current `Offer.evidence = null`; no dedicated authorizing packet/adapter.
- BingX — current `Offer.evidence = null`; no dedicated authorizing packet/adapter.

## Required architecture
1. Introduce one code-owned public-offer authority registry/dispatcher.
2. Keep Bybit on its existing exact-value/confirmation/source-plan path.
3. Exchanges without a dedicated authorizing adapter resolve to `under_re_verification`, hide claim-bearing fields, and set `isCommercial=false` regardless of raw `Offer.status`.
4. Do not treat bare `EvidenceMetadata`, month-only `lastChecked`, `verified`/`public-preview` strings, raw affiliate destinations, or owner/editorial copy as a generic authorization shortcut.
5. `resolvePublicOfferView(slug, nowMs)` must be the one shared render-safe projection for every current offer-bearing exchange.
6. Dedicated rich promo pages must gate through this projection and render a neutral status surface while non-authoritative.
7. `/go/[exchange]/` must gate through the same public-commercial state; every current non-authoritative `/go/<slug>/` route is internal/non-commercial and serializes no affiliate destination/code/geo links.
8. Preserve raw `offers.ts` and `exchanges.json` candidate/affiliate values unchanged.
9. Generalize the rendered-output audit to every current offer-bearing exchange and include each `/go/<slug>/` route.
10. Public ordering/badging/trust copy must use public state, never raw `Offer.status`.

## Current required public state
All six current offer-bearing exchanges must be non-commercial unless their dedicated authority says otherwise. In the current repository state this means Bybit, MEXC, Bitget, OKX, KuCoin and BingX all resolve publicly to `under_re_verification`; all raw promo codes and offer claims are hidden; every direct `/go/<slug>/` is internal/non-commercial.

## Invariants
- Bybit packet, confirmation, source-plan, exact-value bindings and 8 official-source artifacts unchanged.
- All raw affiliate URLs/geo links in `exchanges.json` unchanged.
- All raw offer candidates in `offers.ts` unchanged.
- `PUBLIC_MARKET_PROFILES` remains frozen empty.
- No evidence capture or claim upgrade.
- Test-authority guard remains PASS.
- Bybit exact-value/future-reactivation tests remain PASS.
- Preview homepage `/go/* = 0` and production-simulation homepage `/go/* = 0`.

## Mandatory verification
- current public views for all six exchanges are neutral/non-commercial;
- raw status cannot promote a public view;
- current public models contain no latent affiliate destinations;
- dedicated pages emit neutral metadata/content;
- global output audit finds no exchange-scoped raw promo code/affiliate target/unique commercial claim on public surfaces;
- all six `/go/<slug>/` outputs contain only safe internal transitions;
- desktop/mobile factual posture matches;
- other non-offer/research rows regress neither ranking nor CTA contracts.

## Gates
Run test-authority guard, portal contracts, AI-ops fixtures, strict TypeScript, build, resolution harness, Bybit offline evidence replay, generalized public-output audit, preview/production simulations, homepage Chromium desktop/mobile/keyboard and direct `/go/` checks for all six exchanges. Inspect exact-head GitHub Actions.

## Integration
Create a Draft PR with `Closes #266` after all gates pass. Leave Draft for owner review. Do not merge or deploy.

## Prohibited
No new evidence capture, claim support, trusted partner/receipt, packet approval, MarketProfile population, raw affiliate destination change, deploy/Cloudflare/env/secret change, unrelated ranking/content redesign, or owner-authored file mutation/deletion.