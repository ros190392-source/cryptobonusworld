# CBW-PRODUCTION-P2-SAFE-BATCH-AUTODEPLOY-001

Issue: #287
Base: `master @ cc7c25baf05652727e57aa29e21c9e72c7854e88`
Status: COMPLETE — production auto-deploy operational.

## Owner decision

Use automatic production deployment from the product branch `master` with burst batching/debounce.

A native GitHub cron is intentionally not used because this repository's default branch is the research control-plane `main`; scheduled workflows execute from the default branch. Production authority must remain on `master`.

## Trigger contract

- `push` to `master` only;
- optional `workflow_dispatch`, fail-closed unless dispatched from `master`;
- global production concurrency group with `cancel-in-progress: true`;
- push runs wait 5 minutes before release gates;
- after the debounce the run fetches `origin/master` and deploys only if its exact checkout SHA is still the current master head;
- a superseded run exits without deployment.

## Secret/configuration contract

Protected GitHub environment: `production`.

Required encrypted environment secrets:

- `CBW_DEPLOY_HOST`
- `CBW_DEPLOY_USER`
- `CBW_DEPLOY_PRIVATE_KEY`
- `CBW_DEPLOY_KNOWN_HOSTS`

The workflow writes the private key only to an ephemeral runner path with mode `0600`, exposes only that path to `scripts/deploy.mjs`, writes pinned known-host data to the runner SSH directory, and removes both at cleanup. No password authentication is introduced.

If any required secret is missing, the workflow must fail closed by skipping every deploy step and clearly reporting `CONFIGURATION_REQUIRED`; it must not guess a host/user/key or fall back to password authentication.

## Required exact-head gates before deploy

1. `npm ci`
2. `npm run ai-ops:validate`
3. `node scripts/portal/owner-confirmed-authority-split-test.mjs`
4. `npm run portal:guard:test-authority`
5. `npm run portal:contracts:test`
6. `npm run portal:harness:resolution`
7. `npm run validate:affiliate`
8. `PUBLIC_CBW_CTA_MODE=production npm run build`
9. `npm run seo:check`
10. `npm run portal:audit:bybit-public`
11. `npm run portal:audit:public-offers`
12. `node scripts/portal/owner-confirmed-browser-smoke.mjs production`

Any failed gate blocks SSH deployment.

## Deploy order

1. Materialize ephemeral SSH key/known-host config.
2. Run canonical `scripts/deploy.mjs --no-indexnow` in production CTA mode.
3. Run origin-parity diagnostics.
4. Run `scripts/production-live-smoke.mjs` against `https://cryptobonusworld.com`.
5. Only after live smoke passes, submit priority IndexNow.
6. Cleanup ephemeral credential files with `if: always()`.

## Live smoke contract

- `/`, `/promo-codes/`, `/exchanges/` return 2xx;
- all seven required dedicated exchange pages return 2xx: Bybit, MEXC, OKX, Bitget, BingX, KuCoin, CoinEx;
- unsupported standalone `Verified offer` UI state is absent while explanatory prose using similar words remains allowed;
- exact-case owner-confirmed promo codes expected on the featured `/promo-codes/` surface are present;
- CoinEx owner-confirmed `2my4f` is verified on `/coinex/`;
- current commercial candidates are derived from `src/data/exchanges.json` rather than a hand-maintained count;
- every meaningful current default affiliate destination is verified through `/go/<slug>/` without following the external exchange destination: a 3xx `Location` must equal the exact raw destination, or a generated 2xx route body must contain that exact destination;
- placeholder/missing destinations are not treated as deployable commercial routes.

## Completion evidence

The final smoke contract was validated read-only against live production before merge. PR #298 then merged the same verified patch into `master`. The subsequent `CBW Production Safe Batch Auto-Deploy` run #15 for `master @ 460183766f6f4f1e6b5196e3c09098f7345cf6d7` completed successfully in GitHub Actions, confirming the production auto-deploy path is operational.

## Authority boundary

This task creates deployment infrastructure only. It does not modify `src/data/exchanges.json`, `src/data/offers.ts`, evidence packets, MarketProfiles, rankings, promo values, affiliate destinations or country facts.
