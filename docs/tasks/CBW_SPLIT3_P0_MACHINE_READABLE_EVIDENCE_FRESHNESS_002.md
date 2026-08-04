# CBW-SPLIT3-P0-MACHINE-READABLE-EVIDENCE-FRESHNESS-002

## Status
Prepared for execution on `feat/cbw-split3-machine-readable-evidence-freshness-002`.

## Governing issue
- Issue: #250
- Base: `master` at merge commit `8b2d90bcf2507f75a13e298089b05420813e765a`
- Previous stage: PR #249 merged; country-aware gate is preview-only and `PUBLIC_MARKET_PROFILES` remains empty.

## Objective
Replace human-only freshness strings on real offer/homepage records with one canonical, machine-readable evidence timestamp and provenance chain.

Values such as `June 2026`, `May 2026`, and `Recheck in progress` may remain presentation or editorial status text, but they must never authorize freshness, publication, MarketProfile creation, or a commercial CTA.

## Non-negotiable safety state
- No deploy.
- No production publication.
- No environment or secret changes.
- Do not set `PUBLIC_CBW_CTA_MODE=production`.
- Do not populate `PUBLIC_MARKET_PROFILES`.
- Do not modify affiliate destinations.
- Do not fabricate exact verification timestamps from month-only strings.
- Do not fabricate evidence, country availability, approval, or offer eligibility.
- Do not commit or delete owner-authored untracked files.

## Required implementation

### 1. Exact timestamp contract
Create or reuse one canonical evidence metadata contract containing the factual equivalents of:

```ts
interface EvidenceMetadata {
  evidenceCheckedAt: string;
  nextReviewAt: string;
  sourceUrl: string;
}
```

The exact shape may include stable IDs or evidence references when already available.

Required validation:
- exact ISO-8601 datetime with explicit `Z` or numeric timezone offset;
- reject date-only input;
- reject timezone-less datetime;
- reject malformed input;
- reject missing values;
- require HTTPS source URL;
- require `nextReviewAt > evidenceCheckedAt`;
- require a finite explicit clock for time-sensitive authorization;
- use the existing central freshness policy;
- reject future-beyond-skew, stale, and overdue states;
- do not duplicate freshness thresholds.

### 2. Real offer migration
Audit every non-expired record in `src/data/offers.ts`.

Each record must have one of two honest states:

1. Exact repository-supported evidence metadata; or
2. Explicitly unverified/re-verification-required, incapable of authorizing freshness.

Rules:
- never derive an exact day/time from `June 2026` or `May 2026`;
- never use a human display string as a fallback timestamp;
- `status: verified` cannot override missing machine evidence;
- missing evidence must fail closed;
- preserve display text only when clearly presentation/editorial, or derive it from exact metadata.

The final report must list:
- records migrated with exact supported evidence;
- records intentionally left under review because exact evidence was not found in the repository.

### 3. Homepage model
Remove parallel manually-maintained factual freshness strings from Homepage Top-10.

Required behavior:
- homepage factual freshness comes from canonical evidence metadata;
- visible last-checked text is derived deterministically;
- semantic `<time datetime="...">` may be used;
- rows without exact evidence show an honest review/recheck state;
- a locale may change formatting only;
- locale must not change timestamp, evidence state, approval, availability, or CTA decision;
- public homepage remains `global` and emits zero `/go/*` links in preview and public production simulation.

### 4. Disclosure and provenance
Connect disclosure state to:
- source identity/URL;
- exact checked-at timestamp;
- review deadline;
- freshness/overdue state;
- limitations.

Rules:
- no invented source metadata;
- invalid/missing provenance fails closed;
- stale/overdue/invalid evidence must be visibly non-current;
- do not expose internal paths, scratchpad references, unpublished payloads, or raw private notes.

### 5. Future MarketProfile adapter
Provide a deterministic adapter or documented mapping to future:
- `MarketProfile.lastCheckedAt`;
- `MarketProfile.nextReviewAt`.

The adapter must accept only validated exact evidence metadata. It must reject display strings and missing provenance.

This task must not add anything to `PUBLIC_MARKET_PROFILES`.

## Required tests
At minimum:

1. exact UTC timestamp accepted;
2. exact offset timestamp accepted and normalized deterministically;
3. date-only rejected;
4. timezone-less datetime rejected;
5. malformed timestamp rejected;
6. missing timestamp rejected;
7. NaN/Infinity/-Infinity clock rejected;
8. future beyond skew rejected;
9. stale evidence rejected;
10. exact freshness boundary covered;
11. `nextReviewAt <= evidenceCheckedAt` rejected;
12. `nextReviewAt == now` overdue;
13. `nextReviewAt < now` overdue;
14. fresh checked-at + future review accepted;
15. `June 2026` cannot authorize freshness;
16. `Recheck in progress` cannot authorize freshness;
17. verified offer without machine evidence cannot become live;
18. missing/non-HTTPS/malformed source URL fails closed;
19. visible date derived from machine timestamp;
20. en/ru/kk formatting differs while factual state is identical;
21. homepage preview `/go/*` count is zero;
22. public production simulation `/go/*` count is zero;
23. test-only fully approved evidence/profile fixture remains possible only with every country-aware invariant;
24. `PUBLIC_MARKET_PROFILES` remains `Object.freeze([])`.

## Gates
Run and report:
- `npm run portal:contracts:test`;
- `npm run ai-ops:validate:fixtures`;
- contracts TypeScript check;
- `npm run build`;
- route/publication tests;
- preview build;
- public production simulation;
- focused Chromium desktop/mobile/keyboard QA;
- en/ru/kk date/disclosure checks;
- working-tree and diff audit.

## Execution sequence
Inspect → implement → test → fix → Chromium QA → re-test → commit.

Use an isolated worktree. Preserve owner-authored files in the main working tree.

After all gates pass:
- push only this feature branch;
- open a Draft PR against `master`;
- link `Closes #250`;
- inspect every GitHub Actions step;
- leave the PR Draft;
- do not merge or deploy.

## Acceptance criteria
- no production-authorizing code reads human freshness strings;
- real records contain exact validated metadata or fail closed honestly;
- display text is derived, not a second factual source;
- stale/missing/invalid/future/overdue evidence cannot authorize a CTA;
- public homepage remains zero `/go/*` in both modes;
- public MarketProfile registry remains empty;
- no owner files enter the diff;
- final report includes exact commits, changed files, migrated/unmigrated records, tests, Chromium evidence, PR and CI state.

## Remaining later blockers
- evidence-backed population of approved Exchange × Country MarketProfiles;
- migration of legacy exchange/directory/promo CTA surfaces;
- real localized per-country homepage routes;
- production activation/deployment.
