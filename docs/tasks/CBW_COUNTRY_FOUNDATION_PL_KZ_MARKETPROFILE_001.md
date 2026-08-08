# CBW-COUNTRY-FOUNDATION-PL-KZ-MARKETPROFILE-001

## Status
Implementation in progress on Issue #272. Not merged. Not deployed. Public country facts remain fail-closed.

## Dependency
Production rollout Issue #271 is owner-authorized but externally blocked in the current ChatGPT runtime because operator/CI SSH deployment credentials are not injected here.

This task may implement and validate architecture in isolation. It MUST NOT publish country availability claims, merge, or deploy until #271 production smoke is green and owner review authorizes this task's integration.

## Canonical base
- Repository: `ros190392-source/cryptobonusworld`
- Base branch: `master`
- Required base SHA: `cc7c25baf05652727e57aa29e21c9e72c7854e88`
- Feature branch: `feat/cbw-country-foundation-pl-kz-001`
- Governing issue: #272

## Objective
Establish the production-grade Country Foundation around one canonical factual unit:

`Exchange × Country -> MarketProfile`

Pilot identities:
- Poland (`PL`)
- Kazakhstan (`KZ`)

Country controls factual/commercial state. Locale changes presentation only.

## Architecture

### 1. Country identity
`countryInput.ts` recognizes PL and KZ as supported identity metadata only. Recognition never implies exchange availability.

### 2. Country context
`countryContext.ts` defines a pure, deterministic context resolver:

`explicit persisted/manual override > valid proposal > global`

An explicitly-present malformed/unsupported override fails closed to global and does not silently fall through to a different proposed country.

Persistence contract:
- key: `cbw_country_context_v1`
- JSON version: `1`
- only normalized supported country codes or `global` may serialize
- malformed JSON, unknown versions, extra fields or unsupported country values fail closed

The module never reads localStorage/IP/headers/browser locale directly.

### 3. MarketProfile V1
`marketProfileV1.ts` extends the existing canonical `MarketProfile` rather than creating a second availability authority.

Structured dimensions:
- regulation / legal entity / licence refs
- KYC
- deposits
- withdrawals
- fiat/local payment methods
- products
- bonus availability
- restrictions
- confidence

Factual positive/negative states require claim references. Dimension claim references must also be bound into the base profile `claimIds`. Approved country profiles require `high` or `medium` confidence.

### 4. Strict public CTA boundary
The existing `resolveCountryAwareCommercialCta()` remains the canonical composed gate and supports a compatibility profile mode for existing internal fixtures.

All new Country Foundation public work must enter through:

`resolveCountryFoundationCommercialCta()`

which pins `profileContract: 'country_v1'`.

A legacy/incomplete profile reaching that strict boundary returns `PROFILE_FOUNDATION_INVALID` and cannot emit `/go/*`.

Global owner-confirmed link/code authority from Issue #269 remains independent and cannot substitute for a country MarketProfile.

### 5. Public registry
`PUBLIC_MARKET_PROFILES` remains `Object.freeze([])` in this architecture task.

No PL/KZ production facts are populated from memory, editorial prose, `countries.json`, affiliate destinations, or research artifacts automatically.

Existing KZ research in `research-ops/**` is control-plane evidence and requires a separate governed evidence-to-MarketProfile import/approval task.

## Verification
Dedicated suite:

`scripts/portal/country-foundation-test.mjs`

It proves at minimum:
- PL/KZ identity accepted; lowercase malformed
- explicit override precedence
- malformed explicit override cannot fall through to proposal
- proposal/global behavior
- versioned storage parse/serialize fail-closed behavior
- legacy MarketProfile cannot pass Country V1
- complete V1 profile can pass
- missing dimensions / missing evidence refs / unbound claims fail
- confidence policy
- strict CTA positive isolated fixture
- strict CTA blocks legacy/missing/wrong/duplicate/malformed/stale/overdue/restricted profiles
- locale does not alter factual decision
- public registry remains frozen empty
- confirmed global link/GEO authority cannot authorize PL availability

## CI
`CBW Portal Contracts Advisory` must include:
- strict TypeScript for `countryContext.ts` and `marketProfileV1.ts`
- Country Foundation PL/KZ regression
- existing owner-authority regression
- fixtures
- test-authority guard
- portal contracts
- resolution harness
- Bybit offline replay
- preview build/audits/Chromium
- production-simulation build/audits/Chromium

## Prohibited in this task
- no production PL/KZ availability claims
- no auto-import of research records into public authority
- no `countries.json` editorial text as authority
- no public registry population
- no affiliate URL/code changes
- no ranking changes
- no new indexable country URL scheme
- no sitemap/canonical changes
- no production deploy

## Integration
Open a Draft PR against `master`. Keep it Draft until:
1. exact-head CI is green;
2. #271 production rollout smoke is green;
3. owner review explicitly authorizes merge.
