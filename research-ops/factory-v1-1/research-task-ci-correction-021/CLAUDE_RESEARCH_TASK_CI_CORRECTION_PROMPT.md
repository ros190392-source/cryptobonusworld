# Claude execution prompt — Research-task CI Correction 021

Execute task:

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-CI-CORRECTION-021`

## Governing sources

Read completely before changing anything:

- GitHub Issue #70
- this prompt
- `RESEARCH_TASK_CI_CORRECTION_CONTRACT.md`
- `RESEARCH_TASK_CI_CORRECTION_STATE.json`
- the current workflow on approved base `f62c1fb3fc2a66e57e6b023b8eb5b91f2f34500a`
- blocked Pilot Issue #68 and PR #69
- workflow run `30340518853`

## Exact branch and baseline

- repository: `C:\projects\CryptoBonusWorld`
- branch: `correction/researchops-factory-v1-1-research-task-ci-021`
- approved base branch: `main`
- approved base SHA: `f62c1fb3fc2a66e57e6b023b8eb5b91f2f34500a`
- protected master SHA: `998fcedd7d9febbec5b130d4765dfeaafc40960b`

Create or use an isolated worktree for the exact correction branch. Verify the frozen owner setup before implementation. Do not modify the three setup files.

## Verified defect to correct

The workflow currently uses `BASE_HAS_V4=true` as sufficient reason to run `discover-setup-boundary`. That is valid for factory-governance branches but invalid for a genuine `research/**` task PR, which intentionally has no factory result directory.

The correction must introduce explicit trusted routing:

### Research task path

For a canonical trusted `research/**` head branch:

- print `ENFORCEMENT: RESEARCH_TASK (protected base policy)`;
- create/use the detached protected-base worktree;
- execute `researchops` from the protected base;
- use exact trusted `BASE_SHA` as `DIFF_BASE` and `APPROVED_BASE_SHA`;
- never call `discover-setup-boundary`;
- preserve exact trusted event/checkout/ancestry verification;
- generate the NUL-delimited diff from exact trusted base to exact trusted head;
- run existing protected-base `check-boundary`;
- require `BOUNDARY mode=RESEARCH_TASK` and `RESULT: BOUNDARY OK`;
- validate every emitted task root.

### Factory-governance path

For authorized factory governance branch families, preserve the existing V4 descendant path:

- protected-base policy;
- unique frozen setup discovery;
- governed state from frozen setup;
- worker diff frozen setup to head.

Preserve the exact pinned one-time V4 bootstrap behavior for its existing anchor.

Unknown, spoofed, mixed or malformed modes must fail closed.

## Write boundary

You may modify only:

1. `.github/workflows/cbw-researchops-factory-validate.yml`
2. `research-ops/factory-v1-1/fixtures/run.mjs`
3. `research-ops/factory-v1-1/research-task-ci-correction-021/RESEARCH_TASK_CI_CORRECTION_RESULT.json`
4. `research-ops/factory-v1-1/research-task-ci-correction-021/RESEARCH_TASK_CI_CORRECTION_RESULT.md`

Do not modify `bin/**`, `lib/**`, schemas, templates, README, the setup files, prior records, any real `research-ops/tasks/**`, PR #69, application code, owner-ops, production files or other workflows.

If the correction cannot be completed within those exact paths, stop with `RESEARCH_TASK_CI_CORRECTION_BLOCKED`. Do not broaden scope.

## Required tests

Keep all existing fixtures and add deterministic regression tests. The final total must be greater than 206 with zero failures.

Prove at minimum:

1. canonical `research/kz-binance-kz-p0-d` selects the research-task path;
2. research routing uses the trusted PR base SHA as diff base;
3. research routing does not call or depend on setup-boundary discovery;
4. the exact PR #69 base/head diff is accepted by protected-base `check-boundary` as `RESEARCH_TASK`;
5. the exact Binance task root validates successfully;
6. a research branch attempting to modify the factory workflow fails closed;
7. a research branch with mixed factory-governance/result files fails closed;
8. a spoof or noncanonical research branch fails closed;
9. factory-governance branches still require a unique frozen setup boundary;
10. the V4 bootstrap anchor behavior remains unchanged.

Use real temporary Git repositories/worktrees where needed. Do not weaken tests to make them pass.

## Required verification

Run and record:

- `node --check` on every factory `.mjs`;
- complete fixtures;
- `git diff --check`;
- exact changed-file inventory;
- local reproduction of PR #69 trusted event inputs using:
  - base `f62c1fb3fc2a66e57e6b023b8eb5b91f2f34500a`;
  - head `bf0a0932325be00aad08ec3db31aef1af9df2384`;
  - head branch `research/kz-binance-kz-p0-d`;
  - base branch `main`;
- governance descendant regression;
- bootstrap regression.

## Result files

Create exactly:

- `RESEARCH_TASK_CI_CORRECTION_RESULT.json`
- `RESEARCH_TASK_CI_CORRECTION_RESULT.md`

Record:

- task identity and frozen setup SHA;
- exact implementation diff;
- regression fixture totals;
- PR #69 reproduction evidence;
- governance and bootstrap non-regression evidence;
- real correction PR workflow run and every step status;
- blocking findings;
- decision;
- recommended next owner command;
- complete all-false 18-authorization matrix.

Use exactly one decision:

- `RESEARCH_TASK_CI_CORRECTION_READY_FOR_OWNER_MERGE`
- `RESEARCH_TASK_CI_CORRECTION_BLOCKED`

## Commit and PR

Commit only the allowed files. Push only the correction branch. Open one draft PR targeting `main`, reference Issue #70 and PR #69, and do not mark it ready or merge it.

Wait for the real correction PR workflow. A pass requires every workflow step to execute successfully under the existing factory-governance descendant path.

## Prohibitions

No merge to `main`; no modification of PR #69; no Binance research; no `20-research-output`; no `master`; no deploy; no production/import/ranking/CTA/promo/affiliate/publication/sitemap/indexability/MIGRATION_5 change; no branch deletion; no V5; no new broad validation cycle.

Return:

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-CI-CORRECTION-021 — Final Report`
