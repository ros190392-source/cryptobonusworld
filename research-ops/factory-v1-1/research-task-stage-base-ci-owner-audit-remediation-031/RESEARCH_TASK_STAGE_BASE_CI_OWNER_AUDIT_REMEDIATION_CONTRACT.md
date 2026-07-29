# Research-Task Stage-Base CI Owner-Audit Remediation 031 — Contract

## Identity

- Task: `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-STAGE-BASE-CI-OWNER-AUDIT-REMEDIATION-031`
- Governing Issue: #88
- Role: governed stacked Factory correction
- Owner authorization: `AUTHORIZE CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-STAGE-BASE-CI-OWNER-AUDIT-REMEDIATION-031`
- Approved stacked base: `15c3c65a0b7578a1c64ebda2ce6e924ed97df31c`
- Underlying main: `dcc8069d0028bf1bf2b1cdc5d79f7e6b96897bd1`
- Protected master: `998fcedd7d9febbec5b130d4765dfeaafc40960b`
- Source correction: Issue #86 / PR #87
- Protected pilot: PR #69 at `923c2b58406f84b4355094f2e71f20a1931f70ea`

## Purpose

Close the three fail-closed gaps found by the independent owner audit of Correction 030 while preserving its successful trusted first-parent mutation-chain model and exact Binance pilot reproduction.

READY from this task never authorizes publication, merge, pilot mutation, Source Truth Review, import, production, or deploy.

## Frozen history

The following are immutable and must not be edited, amended, replaced, deleted, reordered, or recreated:

- all Correction 030 setup commits and records;
- Correction 030 implementation commit `4d8db189683e49cdde6e4d227d67d8206e76696f`;
- Correction 030 result commit `15c3c65a0b7578a1c64ebda2ce6e924ed97df31c`;
- PR #69 head `923c2b58406f84b4355094f2e71f20a1931f70ea` and its task-root tree;
- all eleven Binance research files and `TASK_STATE.json`;
- `main` and `master`.

## Blocking requirements

### A. Segment diff failures must block

`rootScopedRecords` or its replacement must never convert a Git diff error into an empty record set.

Required result model:

- explicit success with parsed records; or
- explicit failure carrying a bounded diagnostic;
- failure propagates into the mutation chain and boundary result;
- boundary cannot return OK when any segment diff is unresolved.

### B. Git access errors must not look like legitimate absence

Topology access must distinguish:

- a proven value;
- a proven legitimate absence such as no first parent or missing task-root path;
- an access/command/parse error.

The following must block:

- first-parent lookup error;
- parent-count lookup error;
- task-root tree lookup error;
- malformed Git output;
- unresolved commit or tree object.

Only a proven root commit may end traversal. Only a proven missing task-root path may mean absence. Only a proven parent count may classify a commit as merge/non-merge.

### C. Every historical mutation head must be fully valid

For every resolved mutation segment, validate the exact trusted segment-head Git tree, not merely the final PR head.

The validation must reuse the canonical Factory validator by materializing the exact historical commit in a temporary detached worktree or an equivalently strict read-only Git-tree adapter.

For every mutation head require:

- task directory exists;
- `TASK_STATE.json` parses and passes `validateTaskStateShape`;
- `IDENTITY.json` and `GITHUB_PLAN.json` parse and cross-bind correctly;
- task ID/root and task branch bindings hold;
- authorization floor holds at that historical commit;
- declared state is consistent with on-disk evidence at that historical commit;
- state-required package is present and valid at that same commit;
- exact stage directory/evidence rules hold;
- no unsafe entries exist;
- historical validator result is fully VALID.

In addition, compare an immutable identity projection from the introduction head against every later mutation head:

- schemaVersion;
- factoryVersion;
- taskId;
- project;
- countryCode;
- exchangeId;
- batchId;
- priority;
- createdAt;
- branch;
- requiredResearchInventory.

A transient mutation later restored must still fail.

### D. Same-state repair cannot hide an invalid transition

If a commit declares `RESEARCH_CAPTURED` with an incomplete or invalid package, that commit must fail immediately. A later same-state commit adding a missing file or fixing the manifest cannot make the chain valid.

### E. Temporary worktree safety

If temporary detached worktrees are used:

- use an OS temporary directory outside the repository;
- exact commit SHA only;
- detached/read-only validation; no tracked writes;
- no credentials persisted;
- cleanup in `finally`;
- materialization failure blocks;
- validation failure blocks;
- cleanup failure is reported and must never convert failure to success;
- no branch/ref mutation;
- no worktree path accepted from user-controlled task content.

## Preserved Correction 030 model

Do not weaken:

- trusted PR event metadata and exact-head checkout;
- protected-base policy execution;
- cumulative PR-base → head path-scope enforcement;
- one-task-root rule;
- forbidden path guards;
- first-parent mutation-chain derivation;
- unchanged-task merge skipping;
- root-changing merge rejection;
- exact task creation and stage-addition allowlists;
- earlier-stage immutability;
- history append-only;
- task root/ID/branch binding;
- exact current pilot transition resolution.

## Allowed implementation files

Only the minimum necessary subset may be modified or added:

```text
research-ops/factory-v1-1/bin/researchops.mjs
research-ops/factory-v1-1/lib/taskhistory.mjs
research-ops/factory-v1-1/lib/boundary.mjs
research-ops/factory-v1-1/lib/taskhistoryvalidate.mjs
research-ops/factory-v1-1/fixtures/run.mjs
```

No other implementation file is authorized.

In particular, do not modify:

- `.github/workflows/cbw-researchops-factory-validate.yml`;
- `lib/stage.mjs`;
- `lib/package.mjs`;
- `lib/schema.mjs`;
- `lib/authz.mjs`;
- `lib/model.mjs`;
- README, schemas, templates, architecture records, or task roots.

## Required result records

After implementation create exactly:

```text
research-ops/factory-v1-1/research-task-stage-base-ci-owner-audit-remediation-031/RESEARCH_TASK_STAGE_BASE_CI_OWNER_AUDIT_REMEDIATION_RESULT.json
research-ops/factory-v1-1/research-task-stage-base-ci-owner-audit-remediation-031/RESEARCH_TASK_STAGE_BASE_CI_OWNER_AUDIT_REMEDIATION_RESULT.md
```

No third result record.

## Mandatory tests

At minimum prove:

1. segment diff command failure blocks;
2. first-parent lookup error blocks;
3. task-tree lookup error blocks;
4. parent-count lookup error blocks;
5. malformed accessor output blocks;
6. transient canonical authorization true blocks even if later false;
7. transient unknown `*Authorized=true` blocks even if later removed;
8. transient taskId mutation blocks even if restored;
9. transient branch mutation blocks even if restored;
10. transient country/exchange/batch/priority/project/createdAt mutation blocks;
11. malformed historical TASK_STATE blocks;
12. invalid historical IDENTITY binding blocks;
13. invalid historical GITHUB_PLAN binding blocks;
14. `RESEARCH_CAPTURED` with ten files blocks;
15. later same-state addition of the missing file remains blocked;
16. historical manifest/hash mismatch blocks;
17. historical authorization floor is validated before final head;
18. temporary worktree/materialization failure blocks;
19. temporary cleanup failure is reported without overriding prior failure;
20. all 030 topology and boundary fixtures remain green;
21. exact PR #69 reproduction remains green;
22. exact historical validation at `bf0a093...`, `6ce489f...`, and `923c2b5...` behaves as expected.

## Validation gates

Require:

- frozen 031 setup unchanged;
- frozen 030 setup/results unchanged;
- exact worker allowlist;
- all Factory `.mjs` syntax clean;
- all fixtures pass, zero failures;
- report new fixture total;
- exact pilot reproduction shows:

```text
TRANSITION PREPARED -> RESEARCH_CAPTURED
TRANSITION_BASE_SHA=6ce489ff10655f65e62a76d1a5635aa80e73b44a
TRANSITION_HEAD_SHA=923c2b58406f84b4355094f2e71f20a1931f70ea
RESULT: BOUNDARY OK
```

- historical validation evidence is machine-verifiable;
- `git diff --check` clean;
- real stacked PR workflow green under protected-base Factory governance;
- PR #69 unchanged;
- `main` and `master` unchanged;
- all eighteen active authorizations false.

## Stop rules

Stop with the BLOCKED decision if:

- branch/base/setup identity differs;
- any source Correction 030 record changes;
- any path escapes the allowlist;
- a Git access error remains conflated with absence;
- any historical mutation head is not fully validated;
- exact pilot reproduction fails;
- fixtures or real workflow fail;
- a merge, force, reset, rebase, pilot mutation, production action, or additional authority would be required.

## Decisions

Return exactly one:

- `RESEARCH_TASK_STAGE_BASE_CI_OWNER_AUDIT_REMEDIATION_READY_FOR_OWNER_APPROVAL`
- `RESEARCH_TASK_STAGE_BASE_CI_OWNER_AUDIT_REMEDIATION_BLOCKED`
