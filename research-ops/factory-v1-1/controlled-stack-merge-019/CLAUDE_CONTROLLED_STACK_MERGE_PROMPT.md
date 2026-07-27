# Claude execution prompt — Controlled Stack Merge 019

## Task

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CONTROLLED-STACK-MERGE-019`

Work only in repository:

```text
C:\projects\CryptoBonusWorld
```

Governing Issue: **#66**  
Source Owner Closeout PR: **#65**  
Expected task branch: `closeout/researchops-factory-v1-1-controlled-stack-merge-019`  
Exact approved base: `3bc4b5e400cb292d73d5f1b77edd356ace02547d`

Read Issue #66, this prompt, `CONTROLLED_STACK_MERGE_CONTRACT.md`, and `CONTROLLED_STACK_MERGE_STATE.json` completely before acting.

## Owner authority

The exact owner command is:

```text
AUTHORIZE CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CONTROLLED-STACK-MERGE-019
```

It authorizes only the exact two-stage fast-forward publication to control-plane `main` described below. It grants no `master`, production, deployment, import, activation, application/design/page or Binance authority.

## Non-negotiable stop rules

Stop with `CONTROLLED_STACK_MERGE_BLOCKED` before any write if:

- the task branch/setup identity differs;
- `origin/main` is not exactly `04157b9dfb140918a8569a5026da747b429e5ed3` at Stage-1 preflight;
- `origin/master` is not exactly `998fcedd7d9febbec5b130d4765dfeaafc40960b`;
- closed stack head is not exactly `3bc4b5e400cb292d73d5f1b77edd356ace02547d`;
- ancestry/order/protected-path checks fail;
- any setup file is modified;
- any unapproved file is present in the worker diff;
- the real factory workflow is not green;
- a non-force push is rejected;
- a force/admin/bypass/rewrite would be required.

Never weaken a check to make the task pass.

## Phase 1 — frozen setup verification

1. Fetch origin without changing refs.
2. Verify the branch is based exactly on `3bc4b5e...`.
3. Discover and freeze the owner setup boundary.
4. Verify the setup phase added exactly:

```text
CONTROLLED_STACK_MERGE_CONTRACT.md
CONTROLLED_STACK_MERGE_STATE.json
CLAUDE_CONTROLLED_STACK_MERGE_PROMPT.md
```

5. Verify setup files are additions-only, canonical, immutable and contain exactly one temporary true authorization:

```text
factoryMergeToMainAuthorized = true
```

All other 17 authorization flags must be false.

Do not edit the setup files.

## Phase 2 — exhaustive preflight

Verify independently:

### Protected refs

```text
origin/main   = 04157b9dfb140918a8569a5026da747b429e5ed3
origin/master = 998fcedd7d9febbec5b130d4765dfeaafc40960b
```

### Closed stack

```text
3bc4b5e400cb292d73d5f1b77edd356ace02547d
```

must be a descendant of the exact `main` baseline.

Each exact commit below must exist and be an ancestor of the next and ultimately of `3bc4b5e...`:

```text
#44  02997bb63be39012015486ecf55da707a3738f6b
#46  2f95f8a373e21204548e6c61433677d009943b26
#49  2b9fecd8540070c92f1d1ba382ba05b64597a7e6
#51  a958f0c7d7ce2d707e4d79e5eafdd984fc851d2d
#53  d3ed1128497cf682863c438d47eb65d26ebb536b
#55  acd83d1d4e854db26ec1054b03c6e9cfd42bd2da
#57  9352e59e168c2b084491c829579bf3e4fb187480
#59  07d0e38a540355244b2bcab0258d3eb5463ed1af
#61  1e7c35526edc9e251d87cbd741ce1cc4acc09293
#63  71ad9aecf772a0885e88e78e1f55bec82f376d8b
#65  3bc4b5e400cb292d73d5f1b77edd356ace02547d
```

Verify the current PR metadata matches these exact heads or document any transparent tree-identical recovery commit. An unexpected material head is a blocker.

### Cumulative diff

Inspect exact baseline-to-stack diff and prove it changes only:

- `.github/workflows/cbw-researchops-factory-validate.yml`;
- `research-ops/factory-v1-1/**`.

Explicitly reject any change under:

```text
src/**
public/**
data/**
owner-ops/**
research-ops/tasks/**
research-ops-pilot/**
```

and any page/design/production/canonical/OKX surface.

Run:

- `node --check` on every factory `.mjs`;
- complete fixtures, expected `206 passed / 0 failed`;
- `git diff --check`;
- read-only status/validation smoke;
- verify Closeout-018 and Final-Acceptance decisions and workflow evidence.

Do not execute Stage 1 until every preflight check passes.

## Phase 3 — Stage 1 fast-forward

Perform one ordinary non-force update equivalent to:

```text
git push origin 3bc4b5e400cb292d73d5f1b77edd356ace02547d:refs/heads/main
```

Do not use `--force`, `--force-with-lease`, admin bypass or any alternate publication method.

Immediately fetch and verify:

```text
origin/main   = 3bc4b5e400cb292d73d5f1b77edd356ace02547d
origin/master = 998fcedd7d9febbec5b130d4765dfeaafc40960b
```

If the push fails or the remote ref differs, stop and report the exact partial state. Do not continue to Stage 2.

## Phase 4 — result records

After Stage 1 succeeds, create exactly:

```text
research-ops/factory-v1-1/controlled-stack-merge-019/CONTROLLED_STACK_MERGE_RESULT.json
research-ops/factory-v1-1/controlled-stack-merge-019/CONTROLLED_STACK_MERGE_RESULT.md
```

Record:

- exact owner receipt and temporary authorization;
- setup identity and frozen setup SHA;
- preflight and ancestry evidence;
- exact cumulative diff inventory;
- Stage 1 command/result and resulting main SHA;
- unchanged master evidence;
- ordered PR inventory;
- intended Stage 2 procedure;
- no production/Binance/deploy authority.

Commit and push only the two result files to the task branch.

Wait for the real GitHub factory workflow on that result commit. Require every step to execute and succeed using `ENFORCEMENT: DESCENDANT`, unique frozen setup, protected-base policy and boundary success.

If the workflow is not green, stop before Stage 2. Do not repair implementation in this task.

## Phase 5 — Stage 2 fast-forward

Let `<FINAL_RESULT_SHA>` be the exact green result commit.

Re-fetch and require:

```text
origin/main = 3bc4b5e400cb292d73d5f1b77edd356ace02547d
```

Then perform one ordinary non-force update equivalent to:

```text
git push origin <FINAL_RESULT_SHA>:refs/heads/main
```

No force or bypass.

Fetch and verify:

```text
origin/main   = <FINAL_RESULT_SHA>
origin/master = 998fcedd7d9febbec5b130d4765dfeaafc40960b
```

Verify the final main tree contains the complete factory stack and the Merge-019 setup/result records, with no unrelated changes.

## Phase 6 — consume authority and close the stack

Update the two result records only if required to record actual Stage-2 evidence. Any recording commit must itself be published to `main` by another ordinary fast-forward from the exact current `main`; do not create an unrecorded final state.

The final result must state:

- decision `FACTORY_V1_1_STACK_PUBLISHED_TO_MAIN`;
- one-time merge authorization consumed;
- all 18 active authorizations false;
- final `origin/main` SHA;
- unchanged `origin/master` SHA;
- no deploy/production/Binance.

After final main verification:

1. add a completion comment to PRs #44, #46, #49, #51, #53, #55, #57, #59, #61, #63 and #65;
2. close them as **superseded by controlled fast-forward publication to main**;
3. do not delete branches;
4. do not claim an individual PR was merged by GitHub;
5. close the Merge-019 audit PR only after its exact final head is present on `main`.

Close Issue #66 only after every verification succeeds.

## Final output

Return a complete report titled:

```text
CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CONTROLLED-STACK-MERGE-019 — Final Report
```

Include exact SHAs, commands, workflow run IDs/steps, PR closures, authorization consumption, final ref states and any limitations.

## Hard stop after completion

Do not create or run the Binance pilot. Do not deploy. Do not modify `master` or production. The next task requires a separate owner command.
