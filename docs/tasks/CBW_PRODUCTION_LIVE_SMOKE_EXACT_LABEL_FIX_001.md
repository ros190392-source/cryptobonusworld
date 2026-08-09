# CBW Production Live Smoke Exact-Label Fix 001

## Trigger
Production auto-deploy reached the server successfully, but live smoke repeatedly failed on `/` with `unsupported "Verified offer" label leaked`.

## Root cause
The smoke detector used the substring regex `verified offer`, which also matches the legitimate plural phrase `Verified offers` already present in homepage editorial copy. The production build/public-output audits were green; the smoke failure was a detector false positive.

## Remediation
- Match the singular phrase as whole words: `\bverified\s+offer\b`.
- Apply the same exact-label semantics to production live smoke and origin-parity diagnostics.
- Preserve all other fail-closed release gates and exact `/go/*` destination checks.

## Safety
No site content, affiliate destination, promo code, evidence, MarketProfile, deployment credential, server path, or deploy logic is changed.
