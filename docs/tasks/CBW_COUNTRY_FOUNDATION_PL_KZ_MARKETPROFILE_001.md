# CBW-COUNTRY-FOUNDATION-PL-KZ-MARKETPROFILE-001

## Status
Implementation and Owner Review remediations #299 and #300 are complete on Draft PR #273. Not merged. Not deployed. Public PL/KZ country facts remain fail-closed.

## Dependency status
The production dependency is cleared:
- Issue #271 production rollout: **COMPLETE / GREEN**.
- Issue #287 safe batch auto-deploy: **COMPLETE / GREEN**.
- PR #298 live-smoke scope fix: **MERGED / GREEN**.
- Production auto-deploy run #15 for `master @ 460183766f6f4f1e6b5196e3c09098f7345cf6d7`: **SUCCESS**.

Clearing the production dependency does not authorize this Country Foundation PR to merge or deploy. PR #273 remains Draft until explicit owner merge authorization.

## Canonical integration state
- Repository: `ros190392-source/cryptobonusworld`
- Base branch: `master`
- Current master used for final synchronization: `721c13c76c6ec0dc6986ff49414f9f8a4d3ea692`
- Original architecture base: `cc7c25baf05652727e57aa29e21c9e72c7854e88`
- Feature branch: `feat/cbw-country-foundation-pl-kz-001`
- Governing issue: #272
- Cross-dimension remediation: #299
- Atomic-registry remediation: #300
- Original reviewed head: `48ecb6bc8bda07ce9ac7613f0ad7f3386b869ae7`
- #299 remediation head before master sync: `0da98391c9b18f931bc2ccc229d1e35527e31f5d`
- #300 exact code/test head before this docs-only closeout: `ea29e78697db73b8b176de148b34b9bec01c04bb`

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
`countryContext.ts` defines a pure deterministic context resolver:

`explicit persisted/manual override > valid proposal > global`

An explicitly-present malformed/unsupported override fails closed to global and never silently falls through to a different proposal.

Persistence contract:
- key: `cbw_country_context_v1`
- JSON version: `1`
- only normalized supported country codes or `global` may serialize
- malformed JSON, unknown versions, extra fields or unsupported values fail closed

The module never reads IP, headers, cookies, browser locale or localStorage directly.

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

Factual positive/negative states require claim references. Dimension claim refs must also be bound into base `claimIds`. Approved country profiles require `high` or `medium` confidence.

### 4. Cross-dimension fail-closed policy — remediation #299
Owner Review found that positive base `availability` / `offerEligibility` could contradict richer V1 dimensions.

Structural consistency now requires:
- approved positive base availability => `regulation = licensed|registered`;
- approved positive base availability => `restrictions = clear`;
- approved local offer eligibility => every material dimension explicitly `supported|limited`;
- negative, unknown or under-review material dimensions cannot be promoted by positive base fields.

Runtime defense-in-depth:
- `evaluateCountryMarketProfileV1CommercialReadiness()` independently composes V1 dimensions;
- `restricted` => disabled restricted decision;
- `prohibited` / unavailable => disabled unavailable decision;
- `under_review` / `unknown` => internal review;
- only coherent explicit positive V1 readiness may continue toward `/go/*`.

Material dimensions covered:
- regulation
- restrictions
- KYC
- deposits
- withdrawals
- fiat/local payment methods
- products
- bonus availability

### 5. Atomic V1 registry policy — remediation #300
Final Owner Review found a second fail-closed gap: the selected profile was V1-validated, while sibling registry entries were previously checked only by the legacy base schema.

`validateCountryFoundationRegistry()` now runs before exact-pair resolution in strict `country_v1` mode and atomically requires:
- registry is an array;
- every entry passes `validateCountryMarketProfileV1()`;
- no legacy/base-only sibling exists;
- no malformed/V1-invalid/contradictory sibling exists;
- every `(exchangeId,countryCode)` pair is globally unique across the complete registry.

Decision behavior:
- invalid sibling => `PROFILE_REGISTRY_INVALID`;
- duplicate sibling for another pair => `PROFILE_REGISTRY_INVALID`;
- duplicate selected pair => `PROFILE_CONFLICT`;
- empty valid registry => selected lookup returns `PROFILE_MISSING`;
- two distinct valid V1 pairs may coexist and exact selected resolution remains deterministic.

The legacy `resolveCountryAwareCommercialCta()` compatibility path is unchanged; strict atomic V1 preflight is applied only to the Country Foundation `country_v1` path.

### 6. Strict public CTA boundary
All new Country Foundation public work must enter through:

`resolveCountryFoundationCommercialCta()`

which pins `profileContract: 'country_v1'`.

A live `/go/*` result requires:
1. atomically valid V1 registry;
2. unique exact approved pair;
3. coherent positive V1 commercial readiness;
4. valid/fresh profile review window;
5. independently authoritative identity-bound offer evidence;
6. explicit non-restricted country state;
7. canonical base CTA gate success.

Global owner-confirmed link/code authority remains independent and cannot substitute for country authority.

### 7. Public registry
`PUBLIC_MARKET_PROFILES` remains `Object.freeze([])`.

No PL/KZ production facts are populated from memory, editorial prose, `countries.json`, affiliate destinations or research artifacts automatically.

Existing PL/KZ research remains control-plane evidence and requires a separate governed research-to-MarketProfile bridge/import/approval task.

## Final PR scope
Against current `master`, PR #273 contains exactly 8 Country Foundation files:
1. `.github/workflows/cbw-portal-contracts-advisory.yml`
2. `docs/tasks/CBW_COUNTRY_FOUNDATION_PL_KZ_MARKETPROFILE_001.md`
3. `scripts/portal/country-foundation-test.mjs`
4. `src/data/contracts/countryAwareCta.ts`
5. `src/data/contracts/countryContext.ts`
6. `src/data/contracts/countryInput.ts`
7. `src/data/contracts/marketProfileV1.ts`
8. `src/data/contracts/portalCtaI18n.ts`

No production deploy/live-smoke files, raw offer values, affiliate values, public MarketProfile data, rankings, SEO/canonical/sitemap files or research records are part of the PR diff.

## Verification — #300 exact code/test head `ea29e78...`
Fresh exact-head GitHub CI:
- Country Foundation regression: **81/81 PASS**
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
- CBW Portal Contracts Advisory run #77: **SUCCESS**
- CBW PR Advisory Gate run #291: **SUCCESS**

The 81-check Country Foundation suite includes both remediation classes:
- #299 cross-dimension mutation/fail-closed cases;
- #300 V1-invalid/legacy/contradictory/duplicate sibling atomic-registry cases;
- distinct valid sibling and empty-registry controls;
- legacy compatibility control;
- locale and owner-link/GEO separation checks;
- public registry frozen-empty check.

## Prohibited / unchanged
- no production PL/KZ availability claims
- no auto-import of research records into public authority
- no `countries.json` editorial text as authority
- no public registry population
- no affiliate URL/code changes
- no offer-claim upgrades
- no ranking changes
- no new indexable country URL scheme
- no sitemap/canonical changes
- no production deploy from this task

## Integration
Keep Draft PR #273 unmerged until:
1. fresh exact-head CI after this docs-only closeout is green;
2. final Owner Review closeout is recorded;
3. owner explicitly authorizes merge.

No merge/deploy authorization is implied by this document.
