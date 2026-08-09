# CBW-COUNTRY-FOUNDATION-PL-KZ-MARKETPROFILE-001

## Status
Implementation complete on Draft PR #273 and returned to Owner Review after remediation #299. Not merged. Not deployed. Public PL/KZ country facts remain fail-closed.

## Dependency status
The production dependency is cleared:
- Issue #271 production rollout: **COMPLETE / GREEN**.
- Issue #287 safe batch auto-deploy: **COMPLETE / GREEN**.
- PR #298 live-smoke scope fix: **MERGED / GREEN**.
- Production auto-deploy run #15 for `master @ 460183766f6f4f1e6b5196e3c09098f7345cf6d7`: **SUCCESS**.

Clearing the production dependency does not itself authorize this Country Foundation PR to merge or deploy. PR #273 remains Draft until Owner Review explicitly authorizes integration.

## Canonical integration state
- Repository: `ros190392-source/cryptobonusworld`
- Base branch: `master`
- Original architecture base: `cc7c25baf05652727e57aa29e21c9e72c7854e88`
- Feature branch: `feat/cbw-country-foundation-pl-kz-001`
- Governing issue: #272
- Remediation issue: #299
- Reviewed pre-remediation head: `48ecb6bc8bda07ce9ac7613f0ad7f3386b869ae7`
- Remediation implementation head before master sync: `0da98391c9b18f931bc2ccc229d1e35527e31f5d`
- Current-master sync merge: `28c53a3f78fc20f02137766c6d743c023ded8497`, combining feature head `0da9839...` with current `master @ 721c13c76c6ec0dc6986ff49414f9f8a4d3ea692` without force or conflict.

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

### 4. Cross-dimension fail-closed policy — remediation #299
Owner Review found that a positive base `availability` / `offerEligibility` could contradict richer V1 dimensions. Remediation #299 closes that gap with two layers.

Structural consistency:
- approved positive base availability requires `regulation = licensed|registered`;
- approved positive base availability requires `restrictions = clear`;
- approved local offer eligibility requires every material dimension to be explicitly `supported|limited`;
- negative, unknown, or under-review material dimensions cannot be silently promoted by positive base fields.

Runtime defense-in-depth:
- `evaluateCountryMarketProfileV1CommercialReadiness()` independently composes V1 dimensions;
- `restricted` maps to a disabled restricted decision;
- `prohibited` / unavailable maps to a disabled unavailable decision;
- `under_review` / `unknown` remains internal review;
- only an explicitly coherent positive V1 profile may continue toward `/go/*`.

Material commercial dimensions covered by policy:
- regulation
- restrictions
- KYC
- deposits
- withdrawals
- fiat/local payment methods
- products
- bonus availability

### 5. Strict public CTA boundary
The existing `resolveCountryAwareCommercialCta()` remains the canonical composed gate and supports compatibility mode for existing internal fixtures.

All new Country Foundation public work must enter through:

`resolveCountryFoundationCommercialCta()`

which pins `profileContract: 'country_v1'`.

A legacy, incomplete, contradictory, negative, or unresolved V1 profile cannot emit `/go/*`.

Global owner-confirmed link/code authority from Issue #269 remains independent and cannot substitute for a country MarketProfile.

### 6. Public registry
`PUBLIC_MARKET_PROFILES` remains `Object.freeze([])` in this architecture task.

No PL/KZ production facts are populated from memory, editorial prose, `countries.json`, affiliate destinations, or research artifacts automatically.

Existing KZ/PL research on the research control plane requires a separate governed evidence-to-MarketProfile bridge/import/approval task.

## Remediation diff audit
From reviewed head `48ecb6b...` to remediation head `0da9839...`, exactly three files changed:
- `src/data/contracts/marketProfileV1.ts`
- `src/data/contracts/countryAwareCta.ts`
- `scripts/portal/country-foundation-test.mjs`

No affiliate values, raw offers, public MarketProfile registry, ranking, SEO, sitemap, canonical, deployment, or production data files changed in remediation #299.

## Verification — remediation head `0da9839...`
Fresh exact-head GitHub CI completed successfully before current-master synchronization:
- Country Foundation regression: **69/69 PASS**
- owner-confirmed link/code authority regression: **319/319 PASS**
- AI-ops fixtures: **43/43 PASS**
- test-authority guard: **PASS**
- portal contracts: **712/712 PASS**
- resolution harness: **5/5 PASS**
- Bybit official-source offline replay: **8/8 PASS**
- preview build: **109 pages PASS**
- preview Bybit public-output audit: **PASS**
- preview global public-offer audit: **PASS**
- preview Chromium owner-authority smoke: **268/268 PASS**
- production-simulation build: **109 pages PASS**
- production Bybit public-output audit: **PASS**
- production global public-offer audit: **PASS**
- production Chromium owner-authority smoke: **272/272 PASS**
- CBW PR Advisory Gate run #287: **SUCCESS**
- CBW Portal Contracts Advisory run #73: **SUCCESS**

The Country Foundation regression includes mutation cases proving positive base fields cannot override restricted/prohibited/unavailable/under-review/unknown V1 dimensions.

## Prohibited / unchanged
- no production PL/KZ availability claims
- no auto-import of research records into public authority
- no `countries.json` editorial text as authority
- no public registry population
- no affiliate URL/code changes
- no ranking changes
- no new indexable country URL scheme
- no sitemap/canonical changes
- no production deploy from this task

## Integration
Keep Draft PR #273 unmerged until:
1. fresh exact-head CI after the current-master sync/docs closeout is green;
2. final independent Owner Review is green;
3. owner explicitly authorizes merge.

No merge/deploy authorization is implied by this document.
