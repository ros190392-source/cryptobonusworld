# ResearchOps Factory V1.1 — Research-Task Stage-Base CI Correction 030 Contract

## Identity

- Task: `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-STAGE-BASE-CI-CORRECTION-030`
- Governing Issue: #86
- Role: correction
- Branch: `correction/researchops-subscription-factory-v1-1-research-task-stage-base-ci-030`
- Base branch: `main`
- Approved base SHA: `dcc8069d0028bf1bf2b1cdc5d79f7e6b96897bd1`
- Protected production authority: `master@998fcedd7d9febbec5b130d4765dfeaafc40960b`
- Owner authorization: `AUTHORIZE CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-STAGE-BASE-CI-CORRECTION-030`

## Verified blocker

The accepted Binance × Kazakhstan capture is locally valid at:

```text
PR #69 head:
923c2b58406f84b4355094f2e71f20a1931f70ea

Trusted prior task-state boundary:
6ce489ff10655f65e62a76d1a5635aa80e73b44a

Transition:
PREPARED → RESEARCH_CAPTURED
```

The worker diff between those two commits is exactly twelve task-root paths: one modified `TASK_STATE.json` and eleven added files in `20-research-output/`.

Workflow run `30446016864` instead enforced the cumulative PR-base diff from `babe80fe2bdcb7891dddf63aa8064532626a8fba`, where the task root does not exist. The current stage checker therefore treated the full root as a new creation and correctly rejected `RESEARCH_CAPTURED`.

The defect is the trusted stage-base resolution model. The stage rules, package bytes, TASK_STATE transition, and capture commit are not defective.

## Objective

Correct Factory V1.1 so a long-lived main-based `research/**` PR can advance through governed task stages while preserving cumulative PR path-scope enforcement and fail-closed state-transition validation.

The correction must separately preserve and verify:

1. trusted PR base and head ancestry;
2. protected-base policy execution;
3. cumulative `PR base → head` path scope;
4. the task-root introduction boundary;
5. every task-root mutation boundary on trusted branch history;
6. the final head task-root tree and state.

## Required trust model

The implementation must use Git commit/tree facts obtained from the checked-out full repository history. No transition SHA may be trusted because it appears in a task file, comment, user message, mutable PR-head implementation, or arbitrary environment variable.

For a research-task PR whose root is absent at the PR base:

- validate cumulative changed-path scope from trusted PR base to trusted head;
- resolve the task-root mutation chain from trusted first-parent history;
- identify the unique root introduction from absent to the exact `PREPARED` skeleton;
- identify every later commit where the task-root tree changes;
- validate each segment with canonical state, exact stage inventory, and append-only history rules;
- require all root-changing commits to form one linear ancestry chain;
- require the head task-root tree to equal the final resolved mutation tree;
- ignore main-sync merge commits only when the task-root tree is byte-identical to their first parent;
- fail closed on root-changing merge ambiguity, parallel mutation history, missing predecessor, skipped state, identity mismatch, or unresolved tree history.

A safe implementation may reject every merge commit that changes the task-root tree.

## Explicit non-solution

The correction must not simply set `DIFF_BASE=HEAD^` or validate only the most recent commit. A direct parent is not authority by itself. The entire task mutation chain must be proven.

## Exact implementation allowlist

The worker may modify only the minimum necessary subset of these paths:

```text
.github/workflows/cbw-researchops-factory-validate.yml
research-ops/factory-v1-1/bin/researchops.mjs
research-ops/factory-v1-1/lib/boundary.mjs
research-ops/factory-v1-1/lib/stage.mjs
research-ops/factory-v1-1/lib/taskhistory.mjs
research-ops/factory-v1-1/fixtures/run.mjs
```

`taskhistory.mjs` is an optional new helper. `stage.mjs` may be modified only to expose or reuse existing strict transition semantics; canonical states, transition map, stage inventory, and append-only rules may not be weakened.

No README, schema, template, architecture, task-root, application, production, other workflow, or unrelated Factory file is authorized.

## Frozen setup

This directory contains exactly three owner setup records:

```text
RESEARCH_TASK_STAGE_BASE_CI_CORRECTION_CONTRACT.md
RESEARCH_TASK_STAGE_BASE_CI_CORRECTION_STATE.json
CLAUDE_RESEARCH_TASK_STAGE_BASE_CI_CORRECTION_PROMPT.md
```

After the third setup commit, all three are immutable.

## Worker result records

The worker must add exactly:

```text
RESEARCH_TASK_STAGE_BASE_CI_CORRECTION_RESULT.json
RESEARCH_TASK_STAGE_BASE_CI_CORRECTION_RESULT.md
```

No third result or auxiliary file is authorized in the result directory.

## Mandatory regression coverage

The worker must preserve all existing fixtures and add deterministic positive and negative coverage for:

1. exact new task creation at `PREPARED`;
2. `PREPARED → RESEARCH_CAPTURED` with the exact eleven-file inventory;
3. exact PR #69 history resolving `6ce489f… → 923c2b5…`;
4. no-task-change main-sync merge after a stage transition;
5. arbitrary `HEAD^` rejection as an authority source;
6. skipped state transition;
7. rewritten, reordered, shortened, or removed prior history;
8. earlier-stage modification or deletion;
9. extra twelfth output file;
10. missing required output file;
11. multiple task roots;
12. mixed task and Factory/workflow paths;
13. task root / taskId mismatch;
14. trusted head branch / declared task branch mismatch;
15. parallel or incomparable task mutation histories;
16. root-changing merge ambiguity;
17. head task tree differing from the last resolved task mutation tree;
18. unchanged authorization floor.

Record the new fixture total. Do not require the old total `235` after adding tests.

## Exact pilot reproduction

PR #69, Issues #84/#85, and the task root are read-only regression evidence.

The corrected implementation must reproduce, without mutating them:

```text
BOUNDARY mode=RESEARCH_TASK
TASK_CHAIN root=research-ops/tasks/CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001
TRANSITION PREPARED -> RESEARCH_CAPTURED
TRANSITION_BASE_SHA=6ce489ff10655f65e62a76d1a5635aa80e73b44a
TRANSITION_HEAD_SHA=923c2b58406f84b4355094f2e71f20a1931f70ea
RESULT: BOUNDARY OK
```

Equivalent deterministic machine-readable wording is acceptable only when the root, states, and both exact SHAs are present.

## Required validation

Before returning READY:

- setup triple unchanged;
- worker diff contains only allowed implementation paths plus the two result records;
- protected-base enforcement remains intact;
- all Factory `.mjs` files pass `node --check`;
- all old and new fixtures pass;
- exact pilot reproduction passes;
- `git diff --check` passes;
- real correction PR workflow passes with every validation step executed;
- `main`, `master`, PR #69, Issues #84/#85, and production remain unchanged.

## Authorization floor

All 18 active authorization flags remain false. This task does not authorize:

- publishing the correction to `main`;
- modifying, syncing, force-pushing, or rerunning PR #69;
- Source Truth Review;
- research-record merge;
- import, staging, canonicalization, or publication;
- ranking, CTA, promo, affiliate route, sitemap, indexability, or MIGRATION_5;
- `master`, production, or deploy.

## Allowed decisions

Exactly one:

```text
RESEARCH_TASK_STAGE_BASE_CI_CORRECTION_READY_FOR_OWNER_APPROVAL
RESEARCH_TASK_STAGE_BASE_CI_CORRECTION_BLOCKED
```

READY means only that the correction PR may undergo independent owner audit. It does not authorize merge or publication.