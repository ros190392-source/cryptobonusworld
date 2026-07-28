# Claude execution prompt — CMI Architecture V1 Owner Audit Correction 026

## Task

`CBW-CONTINUOUS-EXCHANGE-MARKET-INTELLIGENCE-ARCHITECTURE-V1-OWNER-AUDIT-CORRECTION-026`

Work only in:

```text
C:\projects\CryptoBonusWorld
```

Governing Issue: **#80**  
Source Architecture Issue / PR: **#78 / #79**  
Existing Binance pilot PR: **#69**  
Expected branch: `correction/researchops-factory-v1-1-continuous-market-intelligence-owner-audit-026`  
Exact approved stacked base: `6d5a06b3ec3992b2760a2ca352d62f66d49ca82e`  
Underlying `main`: `babe80fe2bdcb7891dddf63aa8064532626a8fba`  
Protected `master`: `998fcedd7d9febbec5b130d4765dfeaafc40960b`

Owner authorization:

```text
AUTHORIZE CBW-CONTINUOUS-EXCHANGE-MARKET-INTELLIGENCE-ARCHITECTURE-V1-OWNER-AUDIT-CORRECTION-026
```

This is a bounded pre-approval correction of the existing Architecture V1 package. It is not a new Factory version and does not authorize runtime implementation, research execution, merge, import, publication or production.

## Phase 0 — read completely and stop rules

Read completely before editing:

1. Issue #80.
2. `CONTINUOUS_MARKET_INTELLIGENCE_OWNER_AUDIT_CORRECTION_CONTRACT.md`.
3. `CONTINUOUS_MARKET_INTELLIGENCE_OWNER_AUDIT_CORRECTION_STATE.json`.
4. This prompt.
5. Source Issue #78 and PR #79, including owner-audit comment `5105174964`.
6. Issue #78 owner-audit comment `5105179961`.
7. All fifteen Architecture V1 artifacts at approved base `6d5a06b...`.
8. `research-ops-pilot/protocols/CBW_SUBSCRIPTION_RESEARCH_HANDOFF_V1.md`.
9. `research-ops/factory-v1-1/schemas/research-package.schema.json`.
10. `research-ops/factory-v1-1/lib/package.mjs`.
11. Existing Binance generated `00-contract/DEEP_RESEARCH_PROMPT.md` in PR #69, read-only.
12. Relevant Factory V1.1 governance, role and boundary files, read-only.

Stop before any worker edit with:

```text
CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_V1_OWNER_AUDIT_CORRECTION_BLOCKED
```

if any of these differ:

```text
origin/main   = babe80fe2bdcb7891dddf63aa8064532626a8fba
origin/master = 998fcedd7d9febbec5b130d4765dfeaafc40960b
PR #79 head   = 6d5a06b3ec3992b2760a2ca352d62f66d49ca82e
PR #69 head   = 6ce489ff10655f65e62a76d1a5635aa80e73b44a
```

Also stop if:

- PR #79 or PR #69 is no longer open/draft/unmerged;
- branch/base identity differs;
- setup triple differs;
- the correction cannot be completed using exactly the fifteen existing architecture files plus two result files;
- any Factory implementation/workflow/README change would be required;
- a live affiliate URL, account, proxy or research execution would be required.

Do not broaden scope to repair unrelated issues.

## Phase 1 — isolated worktree and frozen setup

Use an isolated worktree for the existing correction branch. Do not create another branch.

Verify owner setup added exactly:

```text
research-ops/factory-v1-1/continuous-market-intelligence-owner-audit-correction-026/CONTINUOUS_MARKET_INTELLIGENCE_OWNER_AUDIT_CORRECTION_CONTRACT.md
research-ops/factory-v1-1/continuous-market-intelligence-owner-audit-correction-026/CONTINUOUS_MARKET_INTELLIGENCE_OWNER_AUDIT_CORRECTION_STATE.json
research-ops/factory-v1-1/continuous-market-intelligence-owner-audit-correction-026/CLAUDE_CONTINUOUS_MARKET_INTELLIGENCE_OWNER_AUDIT_CORRECTION_PROMPT.md
```

Verify:

- role = `correction`;
- baseBranch = source Architecture branch;
- approvedBaseSha = exact `6d5a06b...`;
- all eighteen authorizations false;
- exact fifteen allowed implementation files;
- exact two required result files.

Freeze the setup boundary and do not modify the setup files.

## Phase 2 — exact worker inventory

Modify every one of these fifteen existing files:

### Markdown

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

### JSON

```text
research-ops/factory-v1-1/schemas/continuous-market-intelligence-v1/CBW_MARKET_INTELLIGENCE_DATA_SCHEMA_V1.json
research-ops/factory-v1-1/schemas/continuous-market-intelligence-v1/CBW_CLAIM_EVIDENCE_FRESHNESS_MODEL_V1.json
research-ops/factory-v1-1/schemas/continuous-market-intelligence-v1/CBW_PUBLICATION_BINDING_MODEL_V1.json
research-ops/factory-v1-1/schemas/continuous-market-intelligence-v1/CBW_AFFILIATE_CAMPAIGN_OFFER_MODEL_V1.json
research-ops/factory-v1-1/schemas/continuous-market-intelligence-v1/CBW_SOURCE_REGISTRY_AND_MONITORING_MODEL_V1.json
research-ops/factory-v1-1/schemas/continuous-market-intelligence-v1/CBW_CHANGE_EVENT_AND_IMPACT_MODEL_V1.json
```

Create exactly:

```text
research-ops/factory-v1-1/continuous-market-intelligence-owner-audit-correction-026/CONTINUOUS_MARKET_INTELLIGENCE_OWNER_AUDIT_CORRECTION_RESULT.json
research-ops/factory-v1-1/continuous-market-intelligence-owner-audit-correction-026/CONTINUOUS_MARKET_INTELLIGENCE_OWNER_AUDIT_CORRECTION_RESULT.md
```

Final worker diff from the frozen setup must contain exactly seventeen paths. No additional file, index, README, migration or fixture may be created.

## Phase 3 — canonical vocabulary reconciliation

All fifteen artifacts must use exact canonical vocabularies.

### Freshness

```text
FRESH
DUE_SOON
STALE
EXPIRED
```

### Claim verification

```text
SUPPORTED
CONFLICTED
UNDER_REVIEW
UNSUPPORTED
```

### Source health

```text
HEALTHY
DEGRADED
UNAVAILABLE
BLOCKED
RETIRED
```

### Affiliate verification

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

Separate these concepts structurally. Do not reuse one enum to stand for another.

Remove old canonical values such as `AGING`, generic `ACTIVE`, `CHANGED`, `EXPIRED` offer status, `GEO_RESTRICTED`, `BROKEN_LINK`, `SUSPENDED`, and the previous agent terminal-state vocabulary. They may appear only in one explicit `legacyMappings` structure or a labelled migration note, not as current values.

All six JSON models must repeat shared enums byte-identically or reference one clear canonical catalog without contradictions.

## Phase 4 — correct source authority semantics

The architecture must not claim that a universal tier number always wins.

Define authority by claim type:

| Claim type | Primary authority |
| --- | --- |
| Law, license, prohibition, regulatory status | regulator, legislation, court, official register |
| Exchange terms, product availability, KYC, fee schedule | official exchange documents |
| Payment rail supplied by a bank/provider | that official bank/provider plus exchange evidence where needed |
| Security incident | official incident notice plus independent security reporting where available |
| Market context | reputable secondary sources |
| Community reports | leads/signals only until corroborated |

The source model may still classify source families, but conflict resolution must use a predicate-specific authority matrix.

All evidence is retained. An unresolved critical conflict produces `CONFLICT_UNRESOLVED`; no agent silently drops contradictory evidence.

## Phase 5 — correct affiliate operational model

Architecture examples remain fake and use `example.invalid`, but schema field names must be operational, not placeholder-only.

`CBW_AFFILIATE_CAMPAIGN_OFFER_MODEL_V1.json` must support at minimum:

```text
sourceAffiliateUrl
internalRedirectRoute
campaignIdentifier
referralCode
redirectHopUrl
redirectHopHttpStatus
finalDestinationUrl
finalDestinationDomain
offerHeadline
advertisedMaximumValue
advertisedCurrency
rewardType
termsUrl
termText
geoEligibility
newUserEligibility
kycRequired
depositConditions
tradingConditions
timeWindow
observedAt
contentHash
evidenceSnapshotId
screenshotEvidenceId
dataClassification
redactionPolicy
```

Do not suffix operational fields with `Placeholder`.

Use fake example instances or field descriptions, but make it explicit that runtime records may contain real observed public values.

Define data classes such as:

```text
PUBLIC_OBSERVED
INTERNAL_COMMERCIAL
SENSITIVE_SECRET
PERSONAL_DATA
```

At minimum:

- public landing URLs, public codes and visible offer values may be `PUBLIC_OBSERVED`;
- private affiliate dashboard links, credentials, cookies and access tokens are `SENSITIVE_SECRET` and must never be committed to Git;
- personal account data must not be collected in L0–L3.

### Verification levels

- L1 proves the complete redirect resolves.
- L2 proves the visible offer is captured.
- L3 proves public terms and GEO eligibility are supported.
- L4 is separate owner-authorized account confirmation only.

### CTA mapping

Define exact behavior for every offer status:

- `ACTIVE_VERIFIED` — CTA may be enabled only when existing owner route/code/CTA approvals are valid;
- `ACTIVE_LIMITED` — cautious “check conditions” presentation, owner-gated CTA;
- `UNDER_REVIEW` — CTA disabled or review state;
- `CODE_NOT_APPLIED` — CTA suppressed or corrected only after owner review;
- `GEO_NOT_ELIGIBLE` — GEO suppression;
- `LINK_BROKEN` — emergency fail-safe suppression;
- `OFFER_ENDED` — disabled;
- `SOURCE_UNAVAILABLE` — under-review/disabled;
- `CONFLICTED` — disabled pending resolution.

Fail-safe suppression is allowed automatically. Enable/re-enable, route changes and referral-code changes remain RED/owner-gated.

## Phase 6 — correct Deep Research companion

The existing generated Factory prompt and eleven-file inventory are immutable.

The companion must state the actual handoff flow:

```text
Deep Research reads prompt + companion
-> conducts research without repo mutation
-> emits complete inline CBW_HANDOFF_ENVELOPE_V1
-> owner/governed capture task validates envelope
-> capture task writes exact 11 files into existing 20-research-output/
-> later source-truth review begins
```

Deep Research itself must not claim to write into the repository.

The inline envelope must contain exact UTF-8/LF content, SHA-256 and byte size for all eleven files with no omission, ellipsis or placeholder file content.

Public observed affiliate URLs, public codes and visible bonus figures may be recorded when evidence-backed and relevant. Do not prohibit them as though they were secrets.

Never include:

- credentials;
- private tokens;
- session cookies;
- private affiliate-dashboard data;
- personal account data.

### Factory shape compatibility

Respect current top-level shape requirements:

```text
research-run.json                   -> overallFinding object
source-verification.json            -> sources array
claim-verdicts.json                 -> claims array
conflict-resolution.json            -> conflicts array
product-availability.json           -> products array
payment-rails.json                  -> rails array
offer-eligibility-review.json       -> review object with sourceIds array
schema-normalization-notes.json     -> notes array
import-readiness.json               -> readiness object with at least one *Ready boolean
```

Respect current required reference arrays and ID resolution.

Do not invent incompatible required top-level fields. Encode richer findings in permitted nested properties, notes, reports and normalization notes. Any field not yet canonical must be marked for later normalization/import, not silently treated as deployed schema.

Phase 2 of the roadmap ends at a complete handoff envelope. Add a separately governed capture step before source-truth review.

## Phase 7 — complete monitoring SLA matrix

Both the Markdown standard and machine model must support minute/hour/day intervals. Do not limit schedules to integer days.

Define default and critical policies, with overrides permitted:

| Category | Default policy | Critical policy |
| --- | --- | --- |
| Outage/security incident feeds | hourly | hourly plus event-driven alert |
| Restricted-country lists | daily | every 6 hours after detected incident/regulatory alert |
| Affiliate redirect | every 6–24 hours | every 6 hours after failure/change |
| Affiliate landing/terms | daily | every 6–12 hours after change |
| P2P/payment rails | daily | every 6–12 hours after incident |
| Product availability | every 3 days | daily |
| Fees/limits | every 1–3 days | daily after detected change |
| KYC | weekly | daily after terms/compliance change |
| License register | weekly | daily during review/event |
| Regulator news | daily | event/RSS polling as available |
| Historical facts | monthly/event-driven | event-driven |

Use policy presets, durations or interval minutes. Architecture only; do not schedule a real automation.

Source availability failures must fan out to dependent claim freshness and may result in task outcome `SOURCE_UNAVAILABLE`.

## Phase 8 — correct agent state machine

Model separately:

```text
pipelineStage
taskOutcome
claimVerificationState
freshnessState
publicationState
```

The pipeline stage is non-terminal process position. The task outcome is the terminal result of one iteration.

Required examples:

- no hash/material fact change -> `NO_MATERIAL_CHANGE`;
- critical ambiguity needing owner -> `OWNER_REVIEW_REQUIRED`;
- fetch source unavailable after bounded retries -> `SOURCE_UNAVAILABLE`;
- unresolved evidence conflict -> `CONFLICT_UNRESOLVED`;
- validation or policy failure -> `BLOCKED`;
- successful live-verified publication -> `PUBLISHED`;
- mismatch followed by rollback -> `ROLLED_BACK`.

Do not call intermediate states terminal.

Keep bounded retries, idempotency keys, dead-letter behavior and locks for source, claim, market profile and publication target.

## Phase 9 — correct SEO quick-answer contract

Require direct-answer blocks to be:

- 30–60 words by default;
- direct answer in sentence one;
- one question/intent per block;
- claim-bound;
- explicit about uncertainty and limitations;
- visibly dated/freshness-labelled;
- traceable to evidence;
- suppressed or downgraded for stale, conflicted, under-review or unsupported critical claims.

Keep tables, procedures, timelines, comparisons, FAQ, title/meta, internal linking, canonicalization, structured-data discipline and anti-cannibalization controls.

Do not promise featured snippets, AI Overviews, rankings or rich results.

## Phase 10 — correct roadmap

Every phase 1–11 must explicitly contain these nine labelled fields:

```text
Objective
Prerequisites
Entry criteria
Allowed writes
Deliverables
Exit criteria
Owner gates
Non-goals
Rollback / stop rule
```

Add the handoff/capture separation:

- Phase 2 produces inline envelope only.
- A separately governed capture subphase or explicit Phase 2b writes and validates the exact eleven files.
- Phase 3 source-truth review begins only after valid capture.

Keep the roadmap bounded. Do not create an open-ended infrastructure cycle before visible Binance × Kazakhstan value.

Phase 5 must permit real public affiliate observations while prohibiting private credentials, account submission, proxy, fake identity and unauthorized L4 testing.

## Phase 11 — reconcile all fifteen artifacts

Update all fifteen files, even where only cross-vocabulary or cross-link changes are needed, so the package is internally consistent.

Requirements:

- all relative links resolve;
- master document exposes corrected canonical vocabularies;
- Market Passport suppression rules distinguish freshness from verification;
- autonomous policy uses canonical offer/outcome states;
- publication model maps status to safe public surfaces;
- data schema references corrected freshness/verification vocabularies;
- result is still `schemaVersion: "1.0.0"` because this is pre-approval correction of V1.

## Phase 12 — create result records

Create exactly:

```text
CONTINUOUS_MARKET_INTELLIGENCE_OWNER_AUDIT_CORRECTION_RESULT.json
CONTINUOUS_MARKET_INTELLIGENCE_OWNER_AUDIT_CORRECTION_RESULT.md
```

Record:

- task/issue/PR identity;
- source Architecture head and frozen correction setup head;
- exact seventeen-file worker inventory;
- every corrected owner-audit finding;
- canonical enum inventory;
- operational affiliate field inventory;
- source-authority matrix;
- handoff protocol evidence;
- Factory package-shape compatibility evidence;
- monitoring SLA matrix coverage;
- roadmap phase-contract coverage;
- JSON/link/secret checks;
- node/fixture/diff checks;
- PR #69 and refs unchanged;
- final decision;
- all authorizations false;
- limitations and next owner step.

Use exactly one decision:

```text
CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_V1_OWNER_AUDIT_CORRECTION_READY_FOR_OWNER_APPROVAL
CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_V1_OWNER_AUDIT_CORRECTION_BLOCKED
```

## Phase 13 — validation

Run and prove:

1. setup files unchanged;
2. source Architecture 025 setup/result records unchanged;
3. exact worker diff = fifteen modified architecture files + two added result records;
4. all six JSON parse;
5. every JSON retains `schemaVersion: "1.0.0"`;
6. canonical vocabularies consistent across all fifteen artifacts;
7. old conflicting values absent except clearly labelled legacy mapping;
8. no operational field name ends in `Placeholder`;
9. example values use `example.invalid` or clearly fake identifiers;
10. no live CBW affiliate values, credentials, tokens, cookies or secrets;
11. all relative Markdown links resolve;
12. companion matches `CBW_SUBSCRIPTION_RESEARCH_HANDOFF_V1.md`;
13. companion matches current `research-package.schema.json` and `package.mjs` top-level shape/reference rules;
14. all eleven roadmap phases contain all nine labelled contract fields;
15. monitoring model supports sub-day intervals and all required categories;
16. `node --check` on every Factory `.mjs` is clean;
17. full fixtures = `235 passed / 0 failed`;
18. `git diff --check` clean;
19. PR #69 unchanged at `6ce489f...` with 14 files;
20. `origin/main` and `origin/master` unchanged.

Commit the fifteen architecture corrections in one architecture-correction commit when practical. Commit the two result records in a separate recording commit. Do not amend or rewrite history.

Push only the existing correction branch with an ordinary non-force push.

Use one stacked draft PR targeting the source Architecture branch. Do not target `main` directly. Do not create another PR, mark ready or merge.

Wait for the real final workflow. Require every enforcement step to execute and succeed under the protected-base governance path.

## Final report

Return:

```text
CBW-CONTINUOUS-EXCHANGE-MARKET-INTELLIGENCE-ARCHITECTURE-V1-OWNER-AUDIT-CORRECTION-026 — Final Report
```

Include exact commits, workflow runs, inventory, corrected findings, validation evidence, unchanged refs/PR #69 and limitations.

## Hard stop

Do not start Binance Deep Research. Do not publish Architecture V1. A second independent owner audit and separate controlled merge authorization are required.