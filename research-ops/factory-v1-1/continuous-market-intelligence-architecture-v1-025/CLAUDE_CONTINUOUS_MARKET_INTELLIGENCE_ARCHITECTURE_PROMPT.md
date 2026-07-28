# Claude execution prompt — CBW Continuous Market Intelligence Architecture V1 — 025

## Task

`CBW-CONTINUOUS-EXCHANGE-MARKET-INTELLIGENCE-ARCHITECTURE-V1-025`

Work only in:

```text
C:\projects\CryptoBonusWorld
```

Governing Issue: **#78**  
Expected branch: `feat/researchops-factory-v1-1-continuous-market-intelligence-architecture-v1-025`  
Approved base: `main@babe80fe2bdcb7891dddf63aa8064532626a8fba`  
Protected production authority: `master@998fcedd7d9febbec5b130d4765dfeaafc40960b`  
Existing Binance pilot PR: **#69** at `6ce489ff10655f65e62a76d1a5635aa80e73b44a`

Owner authorization:

```text
AUTHORIZE CBW-CONTINUOUS-EXCHANGE-MARKET-INTELLIGENCE-ARCHITECTURE-V1-025
```

This is an architecture-only task. It does not authorize research execution, runtime implementation, merge, import, production, deploy or modification of the Binance task.

## Phase 0 — read and stop rules

Read completely before editing:

1. Issue #78.
2. `CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_CONTRACT.md`.
3. `CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_STATE.json`.
4. This prompt.
5. `research-ops/factory-v1-1/README.md`.
6. The current Factory V1.1 schema, template, boundary and package contracts relevant to research output.
7. PR #69 and its immutable generated `00-contract/DEEP_RESEARCH_PROMPT.md` read-only.
8. Existing repository market-intelligence, SEO, affiliate and monitoring architecture documents that are directly relevant, read-only.

Stop with:

```text
CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_V1_BLOCKED
```

before any worker edit if:

- `origin/main` is not exactly `babe80fe2bdcb7891dddf63aa8064532626a8fba`;
- `origin/master` is not exactly `998fcedd7d9febbec5b130d4765dfeaafc40960b`;
- branch or approved base differs;
- PR #69 no longer remains open/draft/unmerged at `6ce489f...`;
- the frozen setup triple differs;
- any architecture file already exists with conflicting identity;
- the exact task cannot be completed within the allowed files;
- runtime code, workflow or existing-file modification would be required.

Do not broaden scope to fix unrelated repository issues.

## Phase 1 — worktree and frozen setup

Use an isolated worktree for the existing expected branch. Do not create another branch.

Verify the owner setup phase added exactly:

```text
research-ops/factory-v1-1/continuous-market-intelligence-architecture-v1-025/CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_CONTRACT.md
research-ops/factory-v1-1/continuous-market-intelligence-architecture-v1-025/CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_STATE.json
research-ops/factory-v1-1/continuous-market-intelligence-architecture-v1-025/CLAUDE_CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_PROMPT.md
```

The setup files are additions-only and immutable. Do not modify them.

Verify the STATE record:

- role = `implementation`;
- baseBranch = `main`;
- approvedBaseSha = exact `babe80f...`;
- branch identity matches;
- exact fifteen allowed implementation files;
- exact two result files;
- all eighteen active authorizations false.

## Phase 2 — architecture principles

The package must encode these non-negotiable principles consistently:

1. `Exchange × Country` is the primary market entity.
2. `Exchange × Country × Affiliate Campaign` is the monitored affiliate-offer entity.
3. Global exchange facts are stored once; market-specific facts are not duplicated into global records.
4. Canonical fact/claim records are not prose and are not owned by a page.
5. Every material claim has evidence, confidence, limitations, effective dates, freshness, next-check scheduling and immutable history.
6. Source snapshots are preserved with hashes and timestamps.
7. Search/vector indexes aid retrieval but never become the source of truth.
8. One changed source fans out through a dependency graph to affected claims, market profiles and publication bindings.
9. Agents propose and validate changes; they never directly mutate production authority.
10. Historical facts are superseded, never destructively overwritten.
11. High-risk regulatory, security, ranking, affiliate-route, referral-code, CTA and production changes are owner-gated.
12. Public affiliate verification defaults to anonymous L0–L3 only. L4 requires separate authorization.
13. No fake identity, proxy, location spoofing, account automation, KYC submission or financial transaction.
14. Binance × Kazakhstan is the first vertical slice, not a reason to hard-code Binance-specific architecture.
15. The architecture must scale through dependency-based monitoring rather than full daily re-research of all market profiles.
16. The immutable Factory V1.1 eleven-file package remains the current governed research envelope.

Use normative terms consistently: **MUST**, **MUST NOT**, **SHOULD**, **MAY**.

## Phase 3 — create exactly nine Markdown standards

Create exactly the following files under:

```text
research-ops/factory-v1-1/templates/continuous-market-intelligence-v1/
```

Do not create an index, README or any additional file.

### 1. `CBW_CONTINUOUS_EXCHANGE_MARKET_INTELLIGENCE_SYSTEM_V1.md`

This is the master architecture document and cross-link hub.

It must include:

- purpose, scope and non-goals;
- architectural context and component diagram in Mermaid or plain text;
- canonical operational store, evidence object store, Git governance and search index;
- event-driven and scheduled flows;
- trust boundaries and authority boundaries;
- source-to-publication end-to-end flow;
- data ownership by component;
- queues, locks, idempotency, deduplication, retries and dead-letter handling;
- auditability, versioning, rollback and disaster recovery;
- security, secrets and privacy rules;
- scaling model for exchanges × countries;
- observability, SLO categories and alert severities;
- cross-links to every other standard and model in this package.

### 2. `CBW_EXCHANGE_COUNTRY_MARKET_PASSPORT_STANDARD_V1.md`

Define the complete `Exchange × Country` passport.

Include:

- global exchange core versus country market profile ownership;
- legal entities, leadership and global history;
- country legal availability, local authorization and warnings;
- registration and KYC;
- per-product availability;
- P2P and direct fiat/payment rails;
- fees and limits as snapshots;
- security incidents, proof-of-reserves and outages;
- restrictions and sanctions;
- affiliate/referral offer status;
- confidence, freshness and limitations;
- public market-facts table;
- direct answer block;
- market timeline;
- source methodology and visible change history;
- compact Top-10 card contract;
- required versus optional fields;
- publication suppression rules for stale, conflicted or unsupported critical claims.

### 3. `CBW_AFFILIATE_OFFER_VERIFICATION_STANDARD_V1.md`

Define:

- managed internal redirect identity without live route implementation;
- source URL, redirect chain, final destination and campaign/referral identifiers;
- visible offer versus applicable terms;
- GEO and new-user eligibility;
- L0 `UNVERIFIED` through L4 `ACCOUNT_CONFIRMED`;
- L0–L3 anonymous evidence procedures;
- L4 separate authorization boundary;
- evidence artifacts: HTML, screenshot, URL chain, content hash and timestamp;
- all required offer statuses and CTA behavior;
- exact language rules such as “up to” versus guaranteed reward;
- change detection, broken-link handling and emergency CTA suppression;
- privacy, ToS and anti-circumvention rules.

### 4. `CBW_SOURCE_MONITORING_STANDARD_V1.md`

Define:

- source registry identity and source tiers;
- fetch modes for HTML, PDF, RSS, API and regulator registers;
- snapshot and hash policy;
- normalized extraction targets;
- change classification and materiality;
- monitoring frequencies by source/claim type;
- dependency graph and fan-out;
- source removal, blocking, robots/ToS and rate-limit behavior;
- duplicate source resolution;
- stale-source and unavailable-source handling;
- alert severities and escalation;
- examples for global restricted list, Kazakhstan regulator event and affiliate landing-page change.

### 5. `CBW_AUTONOMOUS_CONTENT_UPDATE_POLICY_V1.md`

Define:

- Green, Amber and Red lanes;
- exact entry criteria and examples for every lane;
- two-source or primary-source requirements where appropriate;
- conflict and freshness gates;
- generated patch and preview requirements;
- semantic versus formatting changes;
- owner approvals;
- publication authority separation;
- live verification and rollback;
- emergency safe states such as `UNDER_REVIEW` and CTA disabled;
- prohibited fully automatic changes, including regulatory verdicts, sanctions, security incidents, ratings, Top-10 membership, affiliate URL/code, CTA, production binding and deploy.

### 6. `CBW_AGENT_ROLES_AND_STATE_MACHINE_V1.md`

Define each specialized agent’s:

- purpose;
- trusted inputs;
- outputs;
- forbidden actions;
- retry policy;
- idempotency key;
- escalation behavior.

Agents:

- Source Watcher;
- Evidence Capture;
- Extraction Agent;
- Claim Validator;
- Conflict Resolver;
- Freshness Engine;
- Impact Analyzer;
- Content Patch Generator;
- QA Agent;
- Publication Controller;
- Live Verification / Rollback Agent.

Define the full state machine and terminal states. Include concurrency locks for source, claim, market profile and publication target.

### 7. `CBW_SEO_QUICK_ANSWER_AND_SEARCH_INTENT_STANDARD_V1.md`

Define:

- search-intent clusters for availability, legality, restrictions, KYC, payments, P2P, fees, products, security, bonus and alternatives;
- keyword/question research output contract;
- page information architecture;
- short answer-first format;
- tables, procedures, timelines, comparisons and FAQ roles;
- title/meta rules;
- country hub, global exchange profile, market passport and supporting guide relationships;
- internal-link and canonicalization principles;
- visible freshness/evidence requirements;
- structured-data discipline and prohibitions on false aggregate rating or guaranteed rich results;
- exact compact Top-10 card fields bound to canonical claims;
- cannibalization controls and rules for when a separate guide deserves its own route.

Do not claim any search engine guarantees.

### 8. `CBW_IMPLEMENTATION_ROADMAP_V1.md`

Define bounded phases with:

- objective;
- allowed writes;
- prerequisites;
- entry criteria;
- deliverables;
- exit criteria;
- owner gates;
- non-goals;
- rollback/stop rule.

Required phases:

1. Architecture freeze.
2. Binance × Kazakhstan Deep Research.
3. Source-truth review and correction.
4. Canonical non-production Market Passport snapshot.
5. Affiliate L1–L3 verification.
6. Monitoring registry plus one read-only watcher.
7. Publication bindings plus preview-only page/card generation.
8. Owner factual/visual approval.
9. Controlled publication.
10. Kazakhstan Top-10 expansion.
11. Second-country scalability proof.

Explicitly prevent another open-ended infrastructure cycle before the Binance vertical slice produces visible value.

### 9. `CBW_DEEP_RESEARCH_MARKET_PASSPORT_COMPANION_V1.md`

This document must preserve the immutable current Factory V1.1 prompt and exact eleven-file inventory.

Map richer requirements into:

1. `research-run.json`;
2. `source-verification.json`;
3. `claim-verdicts.json`;
4. `conflict-resolution.json`;
5. `product-availability.json`;
6. `payment-rails.json`;
7. `offer-eligibility-review.json`;
8. `schema-normalization-notes.json`;
9. `import-readiness.json`;
10. `source-truth-review-report.md`;
11. `MANIFEST.txt`.

Explain where to encode:

- global and country history;
- regulatory claims;
- KYC, products, payments, fees and restrictions;
- public affiliate L1–L3 evidence;
- search-intent findings and quick-answer candidates;
- source-monitor candidates and freshness recommendations;
- unresolved gaps, conflicts and limitations;
- architecture import mapping.

The companion MUST NOT require extra package files, repository mutation, account testing, proxy or unsupported facts.

## Phase 4 — create exactly six JSON models

Create exactly the following files under:

```text
research-ops/factory-v1-1/schemas/continuous-market-intelligence-v1/
```

Every file must be strict JSON, UTF-8/LF, no comments, no trailing commas and use:

```json
"schemaVersion": "1.0.0"
```

These are architecture models, not deployed database migrations and not fake live records. Use example IDs and placeholder domains that cannot be mistaken for active credentials or offers.

### 10. `CBW_MARKET_INTELLIGENCE_DATA_SCHEMA_V1.json`

Define entity catalogs and key fields for:

- ExchangeCore;
- ExchangeLegalEntity;
- ExchangeHistoryEvent;
- Country;
- ExchangeCountryMarketProfile;
- RegulatoryStatus;
- License;
- Restriction;
- RegistrationEligibility;
- KycRequirement;
- ProductAvailability;
- PaymentRail;
- FeeSnapshot;
- LimitSnapshot;
- SecurityIncident;
- RankingSnapshot;
- PageVersion.

Include ownership scope, primary keys, foreign keys, temporal fields and invariants.

### 11. `CBW_CLAIM_EVIDENCE_FRESHNESS_MODEL_V1.json`

Define:

- Claim;
- EvidenceSource;
- EvidenceSnapshot;
- ClaimEvidenceEdge;
- Conflict;
- ClaimVersion;
- FreshnessPolicy;
- VerificationEvent.

Include source tiers, support/contradiction relationship types, confidence levels, freshness states, effective dates, supersession and critical-claim stale behavior.

### 12. `CBW_PUBLICATION_BINDING_MODEL_V1.json`

Define mappings between claim IDs and:

- route;
- page ID;
- block ID;
- ranking card;
- answer block;
- comparison table;
- FAQ;
- title/meta;
- structured data;
- affiliate CTA.

Include impact status, patch proposal, preview, validation, publication version, live verification and rollback references.

### 13. `CBW_AFFILIATE_CAMPAIGN_OFFER_MODEL_V1.json`

Define:

- AffiliateCampaign;
- AffiliateLink;
- RedirectObservation;
- OfferSnapshot;
- OfferTerm;
- GeoEligibility;
- VerificationLevel;
- VerificationEvent;
- CTAState.

Include L0–L4, required statuses, safe example data and explicit account-confirmed authorization requirements.

### 14. `CBW_SOURCE_REGISTRY_AND_MONITORING_MODEL_V1.json`

Define:

- SourceRegistryEntry;
- FetchPolicy;
- SchedulePolicy;
- ParserProfile;
- SourceDependency;
- FetchRun;
- SnapshotChange;
- SourceHealth;
- MonitorAlert.

Include schedule examples, content hashes, conditional requests, retry/backoff, rate-limit and source-unavailable behavior.

### 15. `CBW_CHANGE_EVENT_AND_IMPACT_MODEL_V1.json`

Define:

- ChangeEvent;
- MaterialityAssessment;
- AffectedClaim;
- AffectedMarketProfile;
- AffectedPublicationBinding;
- ContentPatchProposal;
- PolicyLaneDecision;
- QAVerdict;
- PublicationAction;
- LiveVerification;
- RollbackAction.

Include deterministic status transitions and idempotency keys.

## Phase 5 — package consistency rules

Cross-document terminology and enums must agree.

At minimum, keep these consistent across Markdown and JSON:

- claim confidence levels;
- freshness states;
- affiliate verification levels;
- affiliate offer statuses;
- monitoring health states;
- change materiality;
- Green/Amber/Red policy lanes;
- agent workflow states and terminal states;
- publication states.

Markdown files must use relative repository links to the exact companion documents. Every architecture artifact must be reachable from the master system document.

Do not write vague placeholders such as `TBD`, `etc.` or `...` where a governed field, enum or rule is required. Clearly label genuine future decisions as owner gates or implementation choices.

## Phase 6 — validation

Run and record:

1. Exact frozen setup immutability check.
2. Exact changed-file inventory from frozen setup to worker head.
3. Verify exactly fifteen architecture artifacts plus two result records and no other worker file.
4. Verify no pre-existing file was modified.
5. Parse every JSON file using Node.
6. Verify each JSON has `schemaVersion === "1.0.0"`.
7. Verify shared enums programmatically or with a deterministic one-off validation script that is not committed.
8. Verify every required Markdown relative link resolves to a file in the branch.
9. Reject secrets, credential patterns, real affiliate URLs/codes and concrete bonus amounts.
10. Run `node --check` on every Factory V1.1 `.mjs`.
11. Run full fixtures, expected exactly:

```text
235 passed
0 failed
```

12. Run `git diff --check`.
13. Verify PR #69 branch and fourteen task files are untouched.
14. Verify `main` and `master` remain unchanged.

Do not alter Factory tests merely to increase the fixture count; this task adds architecture artifacts, not new Factory behavior.

## Phase 7 — result records

Create exactly:

```text
research-ops/factory-v1-1/continuous-market-intelligence-architecture-v1-025/CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_RESULT.json
research-ops/factory-v1-1/continuous-market-intelligence-architecture-v1-025/CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_RESULT.md
```

The JSON result must record:

- task and issue identity;
- setup identity and frozen setup SHA;
- exact fifteen-file inventory;
- architecture decisions;
- cross-model enum inventory;
- validation evidence;
- limitations/non-goals;
- all eighteen authorizations false;
- exact decision;
- recommended next owner step.

The Markdown result must provide a readable architecture review summary and direct links to all fifteen artifacts.

Use one decision only:

```text
CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_V1_READY_FOR_OWNER_APPROVAL
```

or:

```text
CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_V1_BLOCKED
```

## Phase 8 — commit, push and real workflow

Commit only the exact worker files on the existing expected branch.

Push the branch with an ordinary non-force push.

Open or use exactly one draft PR to `main`. Expected PR is created by the owner setup; do not create a second PR.

Do not mark ready and do not merge.

Wait for the real Factory V1.1 governance workflow on the exact final result commit. Require every step to execute and succeed under protected-base `DESCENDANT` enforcement and `FACTORY_GOVERNANCE` boundary mode.

If workflow fails, return BLOCKED. Do not modify Factory code or workflow in this task.

## Final report

Return:

```text
CBW-CONTINUOUS-EXCHANGE-MARKET-INTELLIGENCE-ARCHITECTURE-V1-025 — Final Report
```

Include:

- decision;
- branch and final SHA;
- frozen setup SHA;
- PR number;
- exact file inventory;
- architecture summary;
- JSON parse and consistency checks;
- syntax, fixtures and diff results;
- workflow run ID and step conclusions;
- `main`, `master` and PR #69 unchanged evidence;
- limitations;
- recommended next owner command.

## Prohibitions

Do not:

- modify any setup file;
- modify any existing file;
- create more or fewer than the fifteen architecture artifacts;
- create more or fewer than the two result records;
- modify Factory V1.1 code, workflow, README or existing schemas/templates;
- modify PR #69 or its task root;
- run Binance Deep Research;
- browse or test an affiliate link;
- create a runtime database, watcher, redirect or page;
- merge to `main`;
- modify `master`;
- deploy, import or publish;
- change ranking, CTA, promo, affiliate routing, sitemap, indexability or MIGRATION_5;
- create V5;
- delete branches.
