# Claude execution prompt — CMI Architecture V1 Controlled Stack Merge 027

## Task

`CBW-CONTINUOUS-EXCHANGE-MARKET-INTELLIGENCE-ARCHITECTURE-V1-CONTROLLED-STACK-MERGE-027`

Work only in:

```text
C:\projects\CryptoBonusWorld
```

Governing Issue: **#82**  
Source Architecture Issue / PR: **#78 / #79**  
Source Correction Issue / PR: **#80 / #81**  
Protected Binance pilot PR: **#69**  
Expected audit branch: `closeout/researchops-factory-v1-1-cmi-architecture-controlled-stack-merge-027`  
Exact approved cumulative head: `272ffa266647a899684954ed04a1eb09803d3b2b`  
Expected main before Stage 1: `babe80fe2bdcb7891dddf63aa8064532626a8fba`  
Protected master: `998fcedd7d9febbec5b130d4765dfeaafc40960b`

Owner authorization:

```text
AUTHORIZE CBW-CONTINUOUS-EXCHANGE-MARKET-INTELLIGENCE-ARCHITECTURE-V1-CONTROLLED-STACK-MERGE-027
```

This authorizes only the two-stage ordinary non-force fast-forward described below. Only `factoryMergeToMainAuthorized` is temporarily true. No `master`, production, deploy, import, runtime implementation, Binance research or PR #69 mutation is authorized.

## Phase 0 — read and stop rules

Read completely before acting:

1. Issue #82.
2. `CMI_ARCHITECTURE_CONTROLLED_STACK_MERGE_CONTRACT.md`.
3. `CMI_ARCHITECTURE_CONTROLLED_STACK_MERGE_STATE.json`.
4. This prompt.
5. Issue #78, PR #79 and its accepted final head.
6. Issue #80, PR #81 and its accepted final head.
7. PR #69 metadata read-only.
8. Architecture result/correction result records and owner-audit comments read-only.

Stop with:

```text
CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_V1_CONTROLLED_STACK_MERGE_BLOCKED
```

if any identity, ref, ancestry, workflow, inventory, validation or authorization condition differs.

Do not broaden scope or weaken validation.

## Phase 1 — locate the audit worktree and verify frozen setup

Run:

```bash
git fetch --prune origin
git worktree list --porcelain
```

Use an existing clean worktree for the expected audit branch, or create an isolated worktree using the existing branch without creating another branch.

Verify the audit branch started exactly at:

```text
272ffa266647a899684954ed04a1eb09803d3b2b
```

Discover the unique frozen setup boundary and require it added exactly:

```text
research-ops/factory-v1-1/cmi-architecture-controlled-stack-merge-027/CMI_ARCHITECTURE_CONTROLLED_STACK_MERGE_CONTRACT.md
research-ops/factory-v1-1/cmi-architecture-controlled-stack-merge-027/CMI_ARCHITECTURE_CONTROLLED_STACK_MERGE_STATE.json
research-ops/factory-v1-1/cmi-architecture-controlled-stack-merge-027/CLAUDE_CMI_ARCHITECTURE_CONTROLLED_STACK_MERGE_PROMPT.md
```

Require additions-only and exact STATE identity:

- role `closeout`;
- base branch `correction/researchops-factory-v1-1-continuous-market-intelligence-owner-audit-026`;
- approved base SHA `272ffa...`;
- exact two required result files;
- no allowed implementation files;
- exactly one true authorization: `factoryMergeToMainAuthorized`;
- all other 17 authorizations false.

Freeze and record the setup HEAD. Do not modify setup files.

## Phase 2 — exhaustive preflight before any main write

Fetch without changing refs and require:

```text
origin/main   = babe80fe2bdcb7891dddf63aa8064532626a8fba
origin/master = 998fcedd7d9febbec5b130d4765dfeaafc40960b
```

Require PR #79:

- OPEN;
- draft;
- unmerged;
- base `main`;
- head branch `feat/researchops-factory-v1-1-continuous-market-intelligence-architecture-v1-025`;
- head SHA `6d5a06b3ec3992b2760a2ca352d62f66d49ca82e`.

Require PR #81:

- OPEN;
- draft;
- unmerged;
- base Architecture-025 branch;
- head branch `correction/researchops-factory-v1-1-continuous-market-intelligence-owner-audit-026`;
- head SHA `272ffa266647a899684954ed04a1eb09803d3b2b`.

Require PR #69:

- OPEN;
- draft;
- unmerged;
- head SHA `6ce489ff10655f65e62a76d1a5635aa80e73b44a`;
- exactly 14 changed files;
- no auto-merge.

Require exact ancestry:

```text
babe80fe2bdcb7891dddf63aa8064532626a8fba
  -> 6d5a06b3ec3992b2760a2ca352d62f66d49ca82e
  -> 272ffa266647a899684954ed04a1eb09803d3b2b
```

Require:

- merge-base(`babe80f...`, `272ffa...`) = `babe80f...`;
- cumulative head ahead by 10 and behind by 0;
- source final workflow `30365356842 = success`;
- correction final workflow `30370715416 = success`.

## Phase 3 — exact cumulative diff and validation

Inspect:

```bash
git diff --name-status babe80fe2bdcb7891dddf63aa8064532626a8fba..272ffa266647a899684954ed04a1eb09803d3b2b
git diff --check babe80fe2bdcb7891dddf63aa8064532626a8fba..272ffa266647a899684954ed04a1eb09803d3b2b
```

Require exactly 25 changed paths, all under:

```text
research-ops/factory-v1-1/continuous-market-intelligence-architecture-v1-025/**
research-ops/factory-v1-1/continuous-market-intelligence-owner-audit-correction-026/**
research-ops/factory-v1-1/templates/continuous-market-intelligence-v1/**
research-ops/factory-v1-1/schemas/continuous-market-intelligence-v1/**
```

Exact category counts:

- 5 Architecture 025 records;
- 5 Correction 026 records;
- 9 Markdown standards;
- 6 JSON models.

Reject any other path.

At exact cumulative head run:

- `node --check` for every `research-ops/factory-v1-1/**/*.mjs`;
- `node research-ops/factory-v1-1/fixtures/run.mjs`, expected `235 passed / 0 failed`;
- parse all six CMI JSON models;
- require each `schemaVersion = "1.0.0"`;
- verify canonical vocabularies consistent;
- verify no operational field ends with `Placeholder`;
- verify examples use fake/example.invalid values and no live CBW affiliate values/secrets;
- verify all Markdown relative links resolve;
- verify every roadmap phase (1, 2, 2b, 3–11) has all nine contract fields;
- verify Deep Research companion matches the handoff protocol and Factory package shape;
- verify `git diff --check` clean.

Retain as accepted non-blocking implementation notes:

1. runtime `advertisedCurrency` must support digital-asset codes such as `USDT` in addition to fiat codes;
2. immutable prompt compatibility requires `sourceTier` in research files while canonical architecture maps it to `sourceFamily`; `sourceTier` is not a universal authority rule.

Do not edit source architecture files in this task.

Do not proceed to Stage 1 until every preflight condition passes.

## Phase 4 — Stage 1 publication

Immediately before push, fetch and re-require exact main/master/source PR heads.

Perform exactly one ordinary non-force fast-forward equivalent to:

```bash
git push origin 272ffa266647a899684954ed04a1eb09803d3b2b:refs/heads/main
```

Do not use force, force-with-lease, reset, rebase, squash, cherry-pick, GitHub PR merge, admin bypass or branch-protection changes.

Immediately fetch and require:

```text
origin/main   = 272ffa266647a899684954ed04a1eb09803d3b2b
origin/master = 998fcedd7d9febbec5b130d4765dfeaafc40960b
```

If Stage 1 fails, stop and report exact partial state. Do not create misleading success records.

## Phase 5 — create exactly two audit result records

Only after Stage 1 succeeds, create exactly:

```text
research-ops/factory-v1-1/cmi-architecture-controlled-stack-merge-027/CMI_ARCHITECTURE_CONTROLLED_STACK_MERGE_RESULT.json
research-ops/factory-v1-1/cmi-architecture-controlled-stack-merge-027/CMI_ARCHITECTURE_CONTROLLED_STACK_MERGE_RESULT.md
```

Record:

- owner authorization and one-time scope;
- frozen setup identity;
- exact source heads/PRs/workflows;
- exact refs, ancestry and cumulative 25-path inventory;
- validation results and fixtures 235/0;
- Stage 1 command/result and resulting main SHA;
- unchanged master and PR #69;
- intended Stage 2 procedure;
- the two accepted implementation notes;
- all prohibitions;
- no blockers;
- decision `CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_V1_PUBLISHED_TO_MAIN`.

State clearly that Stage 2 is pending the real green workflow and final ordinary fast-forward. The external final report supplies post-Stage-2 evidence. Do not amend the result records afterward.

Worker diff from frozen setup to result commit must contain exactly those two result files.

Commit and push only those two files to the audit branch.

## Phase 6 — real audit workflow

Wait for the real workflow on the exact result commit.

Require every step to execute and succeed, including checkout, Node setup, syntax, fixtures, event integrity, enforcement-root resolution, boundary enforcement and task-root validation.

Require runtime evidence:

```text
ENFORCEMENT: DESCENDANT (protected base policy)
BOUNDARY mode=FACTORY_GOVERNANCE
RESULT: BOUNDARY OK
Factory-governance PR: no research-task root to validate.
```

If the workflow is not green, stop before Stage 2.

## Phase 7 — Stage 2 publication

Let `<AUDIT_RESULT_SHA>` be the exact green result commit.

Re-fetch and require:

```text
origin/main = 272ffa266647a899684954ed04a1eb09803d3b2b
```

Perform exactly one ordinary non-force fast-forward equivalent to:

```bash
git push origin <AUDIT_RESULT_SHA>:refs/heads/main
```

Fetch and verify:

```text
origin/main   = <AUDIT_RESULT_SHA>
origin/master = 998fcedd7d9febbec5b130d4765dfeaafc40960b
```

Do not create/amend/publish another audit commit. No third `main` push.

Verify final diff from `babe80f...` to final main contains exactly 30 paths:

- 25 source stack paths;
- 3 Merge 027 setup records;
- 2 Merge 027 result records.

No unrelated change is allowed.

## Phase 8 — consume authority and close records

After final verification:

1. treat `factoryMergeToMainAuthorized` as consumed and report all 18 active authorizations false;
2. add completion comments to PR #79 and PR #81 stating their exact accepted heads were published via controlled fast-forward, not individual PR merge;
3. if GitHub automatically shows PR #79 as MERGED because its head is reachable from main, document that behavior; do not claim a merge-button action;
4. close PR #81 without merge if still open;
5. do not delete source branches;
6. close Issue #78 and Issue #80 as completed;
7. add completion comment to Issue #82 and close it completed;
8. close the Merge 027 audit PR only after its exact final head is on main;
9. leave PR #69 OPEN/draft/unmerged at exact `6ce489f...`, unchanged.

## Final report

Return:

```text
CBW-CONTINUOUS-EXCHANGE-MARKET-INTELLIGENCE-ARCHITECTURE-V1-CONTROLLED-STACK-MERGE-027 — Final Report
```

Include exact Stage 1/Stage 2 ref updates, audit result SHA and workflow, final main/master, inventories, source PR/issue closures, authorization consumption, PR #69 unchanged evidence, accepted implementation notes and limitations.

## Hard stop

Do not execute Binance Deep Research. The next step requires a separate owner authorization and must return a complete inline `CBW_HANDOFF_ENVELOPE_V1` from the existing PR #69 prompt plus the published companion standard.
