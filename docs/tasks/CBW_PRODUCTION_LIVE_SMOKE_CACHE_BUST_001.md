# CBW-PRODUCTION-LIVE-SMOKE-CACHE-BUST-001

Observed run: `31304513600`
Release SHA: `239230723e119babb0a0fa00d170b065babe2f8e`

## Evidence

- All exact-head pre-deploy gates passed.
- SSH upload and remote extraction succeeded (`SERVER_DONE`).
- The production build and rendered-output audits contained no unsupported `Verified offer` public label.
- Immediate public live smoke received a homepage response containing `Verified offer` and failed closed.
- Repository code search on current master contains no `Verified offer` source string.

## Remediation

Keep the same strict public truth assertion, but make every live-smoke request cache-safe:

- unique `__cbw_smoke` query token per request;
- request `Cache-Control: no-cache, no-store, max-age=0` and `Pragma: no-cache`;
- retry a stale/unsupported 200 response up to five times with a fresh token;
- report non-sensitive cache headers when a stale response is observed;
- remove only the smoke-owned query parameter before exact external `/go/*` destination comparison.

This task does not weaken the `Verified offer` prohibition, change affiliate destinations, alter promo codes, modify MarketProfiles/evidence, or change deploy credentials/server configuration.
