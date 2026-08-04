# CBW-SPLIT3-P0-COUNTRY-AWARE-COMMERCIAL-GATE-001

## Status
Prepared for execution on `feat/cbw-split3-country-aware-commercial-gate-001`.

## Canonical base
- `master` merge SHA: `158ef8407daea1c01303dfeb20794aaed005429c`
- Branch must start identical to `master`.
- Split 2 is already merged and must not be reimplemented.

## Confirmed current defect
`src/data/homepageTop10Cta.ts` currently derives all three gate facts from `offer.status`:

- `verified` → `availability: available`
- `verified` → `offerEligibility: approved`
- `verified` → `approval: approved`

The homepage does not supply an explicit country, does not resolve a canonical Exchange × Country `MarketProfile`, and does not enforce `offer.restrictedCountries` before a production `/go/*` action can be emitted.

## Execution rules
Authorized:
- implementation on the existing Split-3 branch;
- focused commits;
- tests, build and Chromium QA;
- push and Draft PR only after all local gates pass.

Not authorized:
- no merge;
- no deploy;
- no Cloudflare production publication;
- no environment or secret changes;
- do not set `PUBLIC_CBW_CTA_MODE=production`;
- do not modify affiliate destinations;
- do not commit or delete owner-authored untracked files;
- do not fabricate country availability or regulatory facts.

## Required implementation

### 1. Explicit country input contract
Create a deterministic country-selection input used by the CTA resolver.

Requirements:
- country code is passed explicitly to the resolver;
- accept normalized uppercase two-letter codes only;
- distinguish malformed, missing and unsupported country inputs;
- never read IP, browser locale, cookies, headers or global state inside a validator;
- `global` is not proof of country eligibility and cannot authorize a live affiliate CTA;
- locale must not alter the resolved country or factual decision.

### 2. Canonical MarketProfile lookup
Use the existing `MarketProfile` contract as the factual Exchange × Country source.

Add a resolver/registry API equivalent to:

```ts
resolveMarketProfile(exchangeId, countryCode, profiles)
```

Required fail-closed outcomes:
- exact approved profile found;
- profile missing;
- country/profile mismatch;
- exchange/profile mismatch;
- profile under review;
- profile rejected/stale;
- availability unknown;
- availability restricted/unavailable;
- duplicate/conflicting profiles;
- malformed profile.

Do not promote legacy prose from `countries.json`, `localNotes`, popularity, ranking position or offer status into an approved MarketProfile.

If the repository does not yet contain evidence-backed approved public MarketProfile records, keep the public registry empty or non-approved. Use clearly test-only synthetic fixtures for production-mode simulations. Public homepage behavior must remain fail-closed.

### 3. Independent offer restriction check
Wire `offer.restrictedCountries` into the decision independently of MarketProfile availability.

Requirements:
- normalize and validate every restricted country code;
- a matching restricted country always blocks the affiliate CTA;
- missing `restrictedCountries` means no restriction claim from this field, not proof of market availability;
- malformed restriction data fails closed for commercial authorization;
- offer status controls offer eligibility only; it must never create country availability or profile approval.

### 4. Compose a country-aware commercial decision
Introduce a composed resolver rather than duplicating the existing CTA contract. An equivalent shape is acceptable:

```ts
resolveCountryAwareCommercialCta({
  intent,
  locale,
  mode,
  countryCode,
  entry,
  offer,
  marketProfiles,
  now,
})
```

A `/go/*` action is allowed only when all conditions are true:
- explicit production mode;
- commercial intent;
- valid supported country;
- exactly one valid Exchange × Country MarketProfile;
- profile approval is `approved`;
- profile availability is `available` or `limited`;
- profile offerEligibility is `approved`;
- profile evidence timestamp is present and fresh using the canonical freshness policy;
- offer exists and its status authorizes the offer itself;
- selected country is not in `offer.restrictedCountries`;
- affiliate slug/destination passes existing `/go/*` safety rules.

No individual input may imply the others.

### 5. Honest fail-closed UX
Resolve factual states into existing CTA behavior:
- preview mode → internal `Read review`;
- missing/unsupported country → internal review with localized reason;
- missing/under-review/stale/conflicting profile → internal review/evidence with localized reason;
- restricted/unavailable → genuine disabled control with no href;
- live approved pair → localized commercial label and `/go/*` anchor.

Add localized reasons for `en`, `ru`, and `kk` without changing facts by locale.

### 6. Homepage integration
Update the real Homepage Top-10 binding.

Requirements:
- remove `deriveGateFacts(offer.status)` as the source of availability/profile approval;
- require an explicit homepage country context;
- no hidden default country may authorize production actions;
- current static homepage may use an explicit unresolved/global review context until real country routing exists;
- preview build must emit zero `/go/*` links;
- public production simulation with no approved real profiles must also emit zero `/go/*` links;
- test-only production simulation may emit links only when a synthetic approved profile is injected explicitly;
- secondary actions and disclosures remain intact.

Do not claim that `countries.json` proves exchange availability.

### 7. Tests
Extend `scripts/portal/contracts-test.mjs` and focused integration QA.

Required cases:
1. approved exact country/profile + eligible offer + fresh evidence + production → live `/go/*`;
2. same input in preview → no `/go/*`;
3. offer verified but profile missing → no `/go/*`;
4. offer verified but country malformed → no `/go/*`;
5. unsupported country → no `/go/*`;
6. restrictedCountries match → disabled/no href;
7. MarketProfile restricted → disabled/no href;
8. MarketProfile unavailable → disabled/no href;
9. MarketProfile under review → internal review;
10. profile approval stale/rejected → no `/go/*`;
11. stale evidence → no `/go/*`;
12. profile country mismatch → no `/go/*`;
13. profile exchange mismatch → no `/go/*`;
14. duplicate/conflicting profiles → no `/go/*`;
15. malformed restrictedCountries data → no `/go/*`;
16. `global`/missing country → no `/go/*`;
17. offer status alone can never authorize availability;
18. en/ru/kk produce identical factual authorization;
19. homepage preview emits zero `/go/*`;
20. public homepage production simulation without approved registry emits zero `/go/*`;
21. explicit test fixture production simulation emits only approved exact pairs;
22. no unsupported row gains a `/go/*` anchor.

### 8. Gates
Run:
- `npm run portal:contracts:test`;
- `npm run ai-ops:validate:fixtures`;
- contracts TypeScript check;
- `npm run build`;
- route/publication tests;
- focused Chromium desktop/mobile/keyboard QA;
- preview simulation;
- explicit production simulation using test-only fixtures;
- working-tree/diff audit.

## Commit discipline
Suggested separate commits:
1. country + MarketProfile resolution contract and tests;
2. offer restriction composition and localized reasons;
3. homepage integration and Chromium QA;
4. documentation/CI coverage if needed.

A failed attempt or remediation does not count as a completed increment.

## Draft PR acceptance
Only after every gate is green:
- push the current branch;
- open a Draft PR against `master`;
- link Issue #248;
- report exact commits, changed files, test counts, build pages, Chromium cases, preview/production simulation results and remaining blockers;
- do not merge or deploy.

## Remaining later blockers
Not part of this task:
- real evidence-backed MarketProfile population for target countries;
- machine-readable `evidenceCheckedAt` across all real homepage records;
- migration of legacy exchange/directory/promo CTA surfaces;
- real localized homepage routes;
- production activation or deployment.
