# CBW-PRODUCTION-P2-SAFE-BATCH-AUTODEPLOY-001

Issue: #287
Base: `master @ cc7c25baf05652727e57aa29e21c9e72c7854e88`
Status: IMPLEMENTATION IN PROGRESS — no deploy from this branch.

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
8. `npm run seo:check`
9. `PUBLIC_CBW_CTA_MODE=production npm run build`
10. `npm run portal:audit:bybit-public`
11. `npm run portal:audit:public-offers`
12. `node scripts/portal/owner-confirmed-browser-smoke.mjs production`

Any failed gate blocks SSH deployment.

## Deploy order

1. Materialize ephemeral SSH key/known-host config.
2. Run canonical `scripts/deploy.mjs --no-indexnow` in production CTA mode.
3. Run `scripts/production-live-smoke.mjs` against `https://cryptobonusworld.com`.
4. Only after live smoke passes, submit priority IndexNow.
5. Cleanup ephemeral credential files with `if: always()`.

## Live smoke contract

- `/`, `/promo-codes/`, `/exchanges/` and representative exchange pages return 2xx;
- public HTML must not contain the unsupported label `Verified offer`;
- exact-case owner-confirmed promo codes are visible for representative current exchanges, including Bybit/MEXC/Bitget/CoinEx when present in raw data;
- current commercial candidates are derived from `src/data/exchanges.json` rather than a hand-maintained count;
- every meaningful current default affiliate destination is verified through `/go/<slug>/` without following the external exchange destination: a 3xx `Location` must equal the exact raw destination, or a generated 2xx route body must contain that exact destination;
- placeholder/missing destinations are not treated as deployable commercial routes.

## Authority boundary

This task creates deployment infrastructure only. It does not modify `src/data/exchanges.json`, `src/data/offers.ts`, evidence packets, MarketProfiles, rankings, promo values, affiliate destinations or country facts.

The implementation PR itself must not deploy. Auto-deploy activates only after owner-approved merge into `master` and remains inert if the protected production secrets are not configured.