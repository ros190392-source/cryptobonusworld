# Claude execution prompt — Corrections 021 + 022 Controlled Merge 023

## Task

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTIONS-021-022-CONTROLLED-MERGE-023`

Work only in:

```text
C:\projects\CryptoBonusWorld
```

Governing Issue: **#75**  
Source correction PRs: **#71** and **#73**  
Blocked pilot: Issue **#68**, PR **#69**  
Expected audit branch: `closeout/researchops-factory-v1-1-corrections-021-022-controlled-merge-023`  
Exact approved base: `0ba2ff77acd1b107bde47609269184ab5d167fc5`

Read Issue #75, this prompt, `CORRECTIONS_CONTROLLED_MERGE_CONTRACT.md`, and `CORRECTIONS_CONTROLLED_MERGE_STATE.json` completely before acting.

## Owner authority

The exact owner command is:

```text
AUTHORIZE CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTIONS-021-022-CONTROLLED-MERGE-023
```

It authorizes only the two-stage ordinary non-force fast-forward publication described here. Only `factoryMergeToMainAuthorized` is temporarily true. No `master`, production, deployment, import, research-record merge, Binance research, or PR #69 mutation is authorized.

## Stop rules

Stop with `CORRECTIONS_021_022_CONTROLLED_MERGE_BLOCKED` before or during execution if:

- branch/setup identity differs;
- `origin/main` is not exactly `f62c1fb3fc2a66e57e6b023b8eb5b91f2f34500a` before Stage 1;
- `origin/master` is not exactly `998fcedd7d9febbec5b130d4765dfeaafc40960b`;
- PR #71 or #73 metadata/head differs;
- `0ba2ff7...` does not descend the main baseline with merge base equal to it;
- cumulative diff escapes the exact allowlist;
- fixtures, syntax, diff check, or source workflow evidence fails;
- setup files are modified;
- worker diff contains anything except the two result records;
- a normal non-force push is rejected;
- force, bypass, rewrite, PR merge, or a third audit push would be required.

Never weaken validation to continue.

## Phase 1 — frozen setup verification

1. Fetch origin without changing refs.
2. Verify the audit branch started at exact `0ba2ff77acd1b107bde47609269184ab5d167fc5`.
3. Discover the unique frozen owner setup boundary.
4. Verify setup added exactly:

```text
CORRECTIONS_CONTROLLED_MERGE_CONTRACT.md
CORRECTIONS_CONTROLLED_MERGE_STATE.json
CLAUDE_CORRECTIONS_CONTROLLED_MERGE_PROMPT.md
```

5. Verify additions-only and exactly one temporary true authorization:

```text
factoryMergeToMainAuthorized = true
```

All other 17 flags must be false.

Do not edit setup files.

## Phase 2 — exhaustive preflight

Require exact refs:

```text
origin/main   = f62c1fb3fc2a66e57e6b023b8eb5b91f2f34500a
origin/master = 998fcedd7d9febbec5b130d4765dfeaafc40960b
```

Require source PRs:

```text
#71 open / draft / unmerged / head 8f6b1e635cca28e7dce6ca160ae7b68d7f258f0f
#73 open / draft / unmerged / head 0ba2ff77acd1b107bde47609269184ab5d167fc5
```

Verify exact ancestry:

```text
f62c1fb... -> 8f6b1e6... -> 0ba2ff7...
```

Verify final source runs:

```text
Correction 021 final run 30343390597 = success
Correction 022 final run 30346959530 = success
```

At `0ba2ff7...` run:

- `node --check` for every factory `.mjs`;
- complete fixtures, expected **235 passed / 0 failed**;
- `git diff --check`;
- exact pilot reproduction or equivalent read-only smoke proving RESEARCH_TASK routing and PREPARED fresh-checkout validation.

Inspect `f62c1fb...0ba2ff7...` and allow only:

```text
.github/workflows/cbw-researchops-factory-validate.yml
research-ops/factory-v1-1/fixtures/run.mjs
research-ops/factory-v1-1/lib/validate.mjs
research-ops/factory-v1-1/research-task-ci-correction-021/**
research-ops/factory-v1-1/prepared-output-dir-validation-correction-022/**
```

Reject any `research-ops/tasks/**`, `src/**`, `public/**`, data/canonical, owner-ops, production, page/design, OKX, or Binance task change.

Do not perform Stage 1 until every check passes.

## Phase 3 — Stage 1 publication

Perform exactly one ordinary non-force fast-forward equivalent to:

```text
git push origin 0ba2ff77acd1b107bde47609269184ab5d167fc5:refs/heads/main
```

No force, force-with-lease, reset, rebase, squash, cherry-pick, PR merge, admin bypass, or protection change.

Immediately fetch and require:

```text
origin/main   = 0ba2ff77acd1b107bde47609269184ab5d167fc5
origin/master = 998fcedd7d9febbec5b130d4765dfeaafc40960b
```

If Stage 1 fails, stop and report exact partial state. Do not create misleading success records.

## Phase 4 — create the audit result commit

After Stage 1 succeeds, create exactly:

```text
research-ops/factory-v1-1/corrections-021-022-controlled-merge-023/CORRECTIONS_CONTROLLED_MERGE_RESULT.json
research-ops/factory-v1-1/corrections-021-022-controlled-merge-023/CORRECTIONS_CONTROLLED_MERGE_RESULT.md
```

Record:

- owner receipt and one-time scope;
- frozen setup identity;
- exact preflight refs, ancestry, PR heads, runs, fixtures and diff inventory;
- Stage 1 command/result and resulting main SHA;
- intended Stage 2 procedure;
- unchanged master;
- all prohibitions and the next task;
- no blockers.

The files must set decision `CORRECTIONS_021_022_PUBLISHED_TO_MAIN`, while clearly stating Stage 2 is pending the green workflow and ordinary final fast-forward. The final external report supplies post-Stage-2 and closure evidence; do not amend the records afterward.

Commit and push only those two files to the audit branch.

Wait for the real GitHub workflow on that exact result commit. Require all steps to execute and succeed under:

```text
ENFORCEMENT: DESCENDANT (protected base policy)
BOUNDARY mode=FACTORY_GOVERNANCE
RESULT: BOUNDARY OK
```

If not green, stop before Stage 2.

## Phase 5 — Stage 2 publication

Let `<AUDIT_RESULT_SHA>` be the exact green commit containing only the two result records after the frozen setup.

Re-fetch and require:

```text
origin/main = 0ba2ff77acd1b107bde47609269184ab5d167fc5
```

Then perform exactly one ordinary non-force fast-forward equivalent to:

```text
git push origin <AUDIT_RESULT_SHA>:refs/heads/main
```

Fetch and verify:

```text
origin/main   = <AUDIT_RESULT_SHA>
origin/master = 998fcedd7d9febbec5b130d4765dfeaafc40960b
```

Verify final main contains Corrections 021/022 plus Merge-023 setup/result records and no unrelated change.

Do not create, amend, or publish another audit commit. No third `main` push is allowed.

## Phase 6 — consume authority and close correction records

After final ref verification:

1. treat `factoryMergeToMainAuthorized` as consumed and report all 18 active authorizations false;
2. add completion comments to PRs #71 and #73 saying their exact heads were published by controlled fast-forward, not individual PR merge;
3. close PRs #71 and #73 without merge and without deleting branches;
4. close Issue #70 as completed; Issue #72 is already closed;
5. add the final completion comment to Issue #75 and close it as completed;
6. close the Merge-023 audit PR only after its exact final head is present on `main`;
7. leave Issue #68 and PR #69 open and unchanged;
8. document the accidentally created and already closed PR #74 as a non-mutating owner setup mistake only; do not reopen it.

## Final report

Return:

```text
CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTIONS-021-022-CONTROLLED-MERGE-023 — Final Report
```

Include exact Stage 1 and Stage 2 ref updates, final main/master SHAs, audit workflow run and steps, fixtures, PR/Issue closures, authorization consumption, PR #69 unchanged evidence, and limitations.

## Hard stop

Do not update or rerun PR #69. Do not conduct Binance research. The next separately authorized task is:

```text
CBW-KZ-BINANCE-P0-D-FACTORY-PILOT-RESUME-024
```
