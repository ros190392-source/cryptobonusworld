# ResearchOps Factory V1.1 — Controlled Stack Merge 019 Contract

**Task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CONTROLLED-STACK-MERGE-019`  
**Governing Issue:** #66  
**Role:** closeout / one-time control-plane publication  
**Approved base:** `3bc4b5e400cb292d73d5f1b77edd356ace02547d`  
**Current expected main:** `04157b9dfb140918a8569a5026da747b429e5ed3`  
**Protected master:** `998fcedd7d9febbec5b130d4765dfeaafc40960b`

## Owner receipt

The owner issued exactly:

```text
AUTHORIZE CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CONTROLLED-STACK-MERGE-019
```

This is a one-time authorization for `factoryMergeToMainAuthorized` only. It does not authorize a research-record merge, `master`, production, deployment, imports, activation, ranking, CTA, promo, affiliate routing, publication, sitemap, indexability, MIGRATION_5 or Binance.

## Preconditions

Before any `main` write, independently verify:

1. `origin/main` is exactly `04157b9dfb140918a8569a5026da747b429e5ed3`.
2. `origin/master` is exactly `998fcedd7d9febbec5b130d4765dfeaafc40960b`.
3. Closed stack head is exactly `3bc4b5e400cb292d73d5f1b77edd356ace02547d`.
4. The closed stack head descends from the expected `main` baseline.
5. Every governed PR head listed in Issue #66 is an ancestor of the closed stack head in the specified order.
6. The cumulative diff contains only Factory V1.1 workflow/code/governance/result records and does not touch application, production, OKX, real research-task or frozen design/page surfaces.
7. Owner Closeout 018 decision is `FACTORY_V1_1_CLOSED_READY_FOR_SEPARATE_MERGE_AUTHORIZATION`.
8. The Merge-019 setup triple is unchanged and the worker write set is restricted to the exact two result files.

Any mismatch blocks the task.

## Exact publication method

### Stage 1

Perform one ordinary non-force fast-forward update:

```text
origin/main:
04157b9dfb140918a8569a5026da747b429e5ed3
→
3bc4b5e400cb292d73d5f1b77edd356ace02547d
```

No force, reset, rebase, squash, cherry-pick, replacement tree, admin bypass or branch-protection change is permitted.

If the remote rejects the push, stop with `CONTROLLED_STACK_MERGE_BLOCKED`.

### Stage 2

After Stage 1:

1. create exactly `CONTROLLED_STACK_MERGE_RESULT.json` and `.md`;
2. commit and push the governed task branch;
3. wait for the real factory workflow to succeed using protected-base descendant enforcement;
4. fast-forward `origin/main` from Stage-1 head to the exact final Merge-019 result commit;
5. verify final `main`, unchanged `master`, complete audit history and consumed authorization.

A Stage-2 rejection must be reported exactly; no force or workaround is permitted.

## PR handling

After successful final publication, comment on and close PRs #44, #46, #49, #51, #53, #55, #57, #59, #61, #63 and #65 as superseded by the controlled fast-forward publication. Do not delete branches and do not claim those individual PRs were merged through GitHub.

The Merge-019 audit PR also remains draft while execution is underway and may be closed only after its final head is present on `main`.

## Required results

Create exactly:

```text
research-ops/factory-v1-1/controlled-stack-merge-019/CONTROLLED_STACK_MERGE_RESULT.json
research-ops/factory-v1-1/controlled-stack-merge-019/CONTROLLED_STACK_MERGE_RESULT.md
```

Decision must be exactly one of:

- `FACTORY_V1_1_STACK_PUBLISHED_TO_MAIN`
- `CONTROLLED_STACK_MERGE_BLOCKED`

## Authorization consumption

On successful Stage 2, the one-time merge authorization is consumed. The result record must report all 18 active authorizations as false.

## Hard prohibitions

Never modify `master`, production, application/design/page files, canonical or staging data. Never deploy. Never create or execute Binance. Never force-push, rewrite history, delete branches or mutate unrelated issues/PRs.
