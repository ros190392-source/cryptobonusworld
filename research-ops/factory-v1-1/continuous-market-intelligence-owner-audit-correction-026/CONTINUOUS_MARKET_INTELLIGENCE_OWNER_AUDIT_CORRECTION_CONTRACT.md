# CBW Continuous Market Intelligence Architecture V1 — Owner Audit Correction 026 Contract

**Task:** `CBW-CONTINUOUS-EXCHANGE-MARKET-INTELLIGENCE-ARCHITECTURE-V1-OWNER-AUDIT-CORRECTION-026`  
**Governing Issue:** #80  
**Role:** correction / pre-approval architecture reconciliation  
**Source Architecture Issue / PR:** #78 / #79  
**Approved stacked base:** `6d5a06b3ec3992b2760a2ca352d62f66d49ca82e`  
**Underlying main:** `babe80fe2bdcb7891dddf63aa8064532626a8fba`  
**Protected master:** `998fcedd7d9febbec5b130d4765dfeaafc40960b`

## Owner receipt

The owner issued exactly:

```text
AUTHORIZE CBW-CONTINUOUS-EXCHANGE-MARKET-INTELLIGENCE-ARCHITECTURE-V1-OWNER-AUDIT-CORRECTION-026
```

This authorizes only a bounded correction of the fifteen existing Architecture V1 artifacts and creation of exactly two correction result records. It grants no merge, research execution, import, production, affiliate-route, CTA, ranking, publication, deploy or `master` authority.

All eighteen active authorization flags remain false.

## Purpose

Reconcile the existing Architecture V1 package with the owner-approved semantics for:

- real public affiliate-link and offer observation;
- safe data classification and redaction;
- exact Deep Research inline handoff;
- claim-type-specific source authority;
- freshness, verification, source-health and offer-status separation;
- deterministic pipeline stages and terminal outcomes;
- complete monitoring SLAs;
- answer-first SEO contracts;
- complete bounded roadmap phase contracts.

This task does not create Architecture V2 and does not modify Factory V1.1 behavior.

## Exact source identity

Before any worker edit, require:

```text
origin/main   = babe80fe2bdcb7891dddf63aa8064532626a8fba
origin/master = 998fcedd7d9febbec5b130d4765dfeaafc40960b
PR #79 head   = 6d5a06b3ec3992b2760a2ca352d62f66d49ca82e
PR #69 head   = 6ce489ff10655f65e62a76d1a5635aa80e73b44a
```

PR #79 and PR #69 must remain open, draft and unmerged.

Any mismatch blocks the task.

## Frozen setup

The owner setup phase creates exactly:

```text
CONTINUOUS_MARKET_INTELLIGENCE_OWNER_AUDIT_CORRECTION_CONTRACT.md
CONTINUOUS_MARKET_INTELLIGENCE_OWNER_AUDIT_CORRECTION_STATE.json
CLAUDE_CONTINUOUS_MARKET_INTELLIGENCE_OWNER_AUDIT_CORRECTION_PROMPT.md
```

These files become immutable after the setup freeze.

## Exact worker write set

The worker must modify all fifteen existing Architecture V1 artifacts and create exactly two result records.

No other path may be added, modified, deleted, renamed or copied.

### Existing Markdown standards to modify

```text
research-ops/factory-v1-1/templates/continuous-market-intelligence-v1/CBW_CONTINUOUS_EXCHANGE_MARKET_INTELLIGENCE_SYSTEM_V1.md
research-ops/factory-v1-1/templates/continuous-market-intelligence-v1/CBW_EXCHANGE_COUNTRY_MARKET_PASSPORT_STANDARD_V1.md
research-ops/factory-v1-1/templates/continuous-market-intelligence-v1/CBW_AFFILIATE_OFFER_VERIFICATION_STANDARD_V1.md
research-ops/factory-v1-1/templates/continuous-market-intelligence-v1/CBW_SOURCE_MONITORING_STANDARD_V1.md
research-ops/factory-v1-1/templates/continuous-market-intelligence-v1/CBW_AUTONOMOUS_CONTENT_UPDATE_POLICY_V1.md
research-ops/factory-v1-1/templates/continuous-market-intelligence-v1/CBW_AGENT_ROLES_AND_STATE_MACHINE_V1.md
research-ops/factory-v1-1/templates/continuous-market-intelligence-v1/CBW_SEO_QUICK_ANSWER_AND_SEARCH_INTENT_STANDARD_V1.md
research-ops/factory-v1-1/templates/continuous-market-intelligence-v1/CBW_IMPLEMENTATION_ROADMAP_V1.md
research-ops/factory-v1-1/templates/continuous-market-intelligence-v1/CBW_DEEP_RESEARCH_MARKET_PASSPORT_COMPANION_V1.md
```

### Existing JSON models to modify

```text
research-ops/factory-v1-1/schemas/continuous-market-intelligence-v1/CBW_MARKET_INTELLIGENCE_DATA_SCHEMA_V1.json
research-ops/factory-v1-1/schemas/continuous-market-intelligence-v1/CBW_CLAIM_EVIDENCE_FRESHNESS_MODEL_V1.json
research-ops/factory-v1-1/schemas/continuous-market-intelligence-v1/CBW_PUBLICATION_BINDING_MODEL_V1.json
research-ops/factory-v1-1/schemas/continuous-market-intelligence-v1/CBW_AFFILIATE_CAMPAIGN_OFFER_MODEL_V1.json
research-ops/factory-v1-1/schemas/continuous-market-intelligence-v1/CBW_SOURCE_REGISTRY_AND_MONITORING_MODEL_V1.json
research-ops/factory-v1-1/schemas/continuous-market-intelligence-v1/CBW_CHANGE_EVENT_AND_IMPACT_MODEL_V1.json
```

### Result records to create

```text
research-ops/factory-v1-1/continuous-market-intelligence-owner-audit-correction-026/CONTINUOUS_MARKET_INTELLIGENCE_OWNER_AUDIT_CORRECTION_RESULT.json
research-ops/factory-v1-1/continuous-market-intelligence-owner-audit-correction-026/CONTINUOUS_MARKET_INTELLIGENCE_OWNER_AUDIT_CORRECTION_RESULT.md
```

The worker diff after the frozen setup must contain exactly seventeen paths.

## Canonical vocabulary contract

Every architecture artifact must use the following vocabularies consistently.

### Freshness state

```text
FRESH
DUE_SOON
STALE
EXPIRED
```

### Claim verification state

```text
SUPPORTED
CONFLICTED
UNDER_REVIEW
UNSUPPORTED
```

### Source health state

```text
HEALTHY
DEGRADED
UNAVAILABLE
BLOCKED
RETIRED
```

### Affiliate verification level

```text
L0_UNVERIFIED
L1_LINK_RESOLVES
L2_OFFER_VISIBLE
L3_TERMS_ELIGIBLE
L4_ACCOUNT_CONFIRMED
```

### Affiliate offer status

```text
ACTIVE_VERIFIED
ACTIVE_LIMITED
UNDER_REVIEW
CODE_NOT_APPLIED
GEO_NOT_ELIGIBLE
LINK_BROKEN
OFFER_ENDED
SOURCE_UNAVAILABLE
CONFLICTED
```

### Pipeline stage

```text
DISCOVER
CAPTURE
EXTRACT
VERIFY
RESOLVE
UPDATE_CLAIM
ANALYZE_IMPACT
PATCH
QA
POLICY_GATE
PUBLISH
LIVE_VERIFY
ROLLBACK
```

### Terminal task outcome

```text
PUBLISHED
NO_MATERIAL_CHANGE
OWNER_REVIEW_REQUIRED
BLOCKED
SOURCE_UNAVAILABLE
CONFLICT_UNRESOLVED
ROLLED_BACK
```

Old conflicting values may appear only in one clearly labelled legacy-mapping section and must not remain canonical.

## Affiliate evidence contract

Architecture examples use fake values only, but the operational model must support actual observed public data:

- source affiliate URL;
- internal managed redirect route;
- redirect-hop URLs/statuses;
- final destination URL/domain;
- public campaign/referral identifiers;
- visible offer headline;
- advertised maximum value and currency;
- reward type;
- public terms URL/text;
- GEO, new-user, KYC, deposit, trading and time-window terms;
- evidence snapshot/screenshot references, content hashes and timestamps.

Public observations are not credentials. Private tokens, cookies, account data, secrets and personal data must never enter Git and require protected storage/redaction policies.

## Source authority contract

Source authority depends on the claim predicate:

- regulator, law, court and official registers govern legal authorization/prohibition;
- official exchange terms/help/fee/product pages govern operational exchange claims;
- official banks/payment providers govern their own rails;
- reputable secondary sources corroborate and contextualize;
- community sources are leads or incident signals until independently confirmed.

No global numeric tier may silently override evidence from the claim-authoritative source class.

## Deep Research handoff contract

Subscription Deep Research:

1. reads the immutable generated prompt plus this approved companion;
2. performs no repository mutation;
3. returns one complete inline `CBW_HANDOFF_ENVELOPE_V1` with exact UTF-8/LF bytes, SHA-256 and byte size for all eleven files;
4. does not write `20-research-output/` itself;
5. may include evidence-backed public URLs, public codes and visible bonus figures when compatible with current package shapes;
6. must exclude credentials, private tokens, cookies, private dashboard data and personal data;
7. must use existing Factory V1.1 top-level shapes and cross-reference rules;
8. places richer non-first-class information into permitted notes/report structures and normalization notes.

A later separately authorized capture task validates and writes the envelope to the existing Binance research task.

## Monitoring SLA contract

The standards and model must include policy defaults and critical intervals for:

- outages/security incidents;
- restricted-country lists;
- affiliate redirect/landing/terms;
- P2P/payment rails;
- product availability;
- fees/limits;
- KYC;
- license registers/regulator news;
- historical facts.

The schedule model must support sub-day intervals.

## SEO contract

Default direct answers are 30–60 words, answer the question in the first sentence, bind every assertion to claims, show freshness/evidence, use limitations where needed, and suppress or degrade stale/conflicted/under-review/unsupported critical claims.

No search-engine result is guaranteed.

## Roadmap contract

All eleven phases must explicitly define:

```text
objective
prerequisites
entry criteria
allowed writes
deliverables
exit criteria
owner gates
non-goals
rollback/stop rule
```

Phase 2 ends with an inline handoff envelope. A later capture task writes the eleven files before source-truth review.

Phase 5 permits recording real public affiliate observations but prohibits credentials, account submission, proxy, fake identity and unauthorized L4 testing.

## Validation requirements

The worker must prove:

1. frozen setup unchanged;
2. source Architecture 025 setup/result records unchanged;
3. exact seventeen-path worker diff;
4. all six JSON files parse and retain `schemaVersion: "1.0.0"`;
5. canonical vocabularies consistent across all fifteen artifacts;
6. old conflicting canonical values removed or isolated in a legacy mapping;
7. all relative Markdown links resolve;
8. operational affiliate field names present; placeholder-only schema field names absent;
9. fake examples only; no live CBW values or secrets;
10. companion matches the handoff protocol and Factory V1.1 package validator;
11. every roadmap phase contains all nine required contract fields;
12. `node --check` clean on every Factory `.mjs`;
13. fixtures `235 passed / 0 failed`;
14. `git diff --check` clean;
15. PR #69 unchanged;
16. `main` and `master` unchanged;
17. real correction workflow green with every enforcement step executed.

## Decisions

Use exactly one:

```text
CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_V1_OWNER_AUDIT_CORRECTION_READY_FOR_OWNER_APPROVAL
CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_V1_OWNER_AUDIT_CORRECTION_BLOCKED
```

## Safety

Forbidden:

- merge or publication;
- Factory code/workflow/README changes;
- PR #69 or Binance task mutation;
- Deep Research execution;
- live affiliate browsing or account testing;
- runtime/database/watcher/redirect implementation;
- `main`, `master`, production, deploy or import changes;
- ranking, CTA, promo, affiliate-route, sitemap, indexability or `MIGRATION_5` changes;
- branch deletion.

## Next step

On success, stop for a second independent owner audit. A separate owner authorization is required to publish the stacked Architecture 025 + Correction 026 to `main`.