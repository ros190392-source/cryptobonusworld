# Claude execution prompt — Research-Task Stage-Base CI Owner-Audit Remediation 031

## Task

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-STAGE-BASE-CI-OWNER-AUDIT-REMEDIATION-031`

Work only in:

```text
C:\projects\CryptoBonusWorld
```

Governing Issue: **#88**  
Existing stacked draft PR: **#89**  
Source correction Issue / PR: **#86 / #87**  
Protected pilot PR: **#69**  
Expected branch: `correction/researchops-subscription-factory-v1-1-research-task-stage-base-ci-owner-audit-remediation-031`  
Exact approved stacked base: `15c3c65a0b7578a1c64ebda2ce6e924ed97df31c`

## Owner authority

The owner issued exactly:

```text
AUTHORIZE CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-STAGE-BASE-CI-OWNER-AUDIT-REMEDIATION-031
```

This authorizes only the bounded remediation in Issue #88 and the frozen contract/state. It does not authorize publication to `main`, any PR #69 mutation/rerun, Source Truth Review, import, production, master, deployment, or any activation change.

## Mandatory reads

Read completely before editing:

1. Issue #88.
2. PR #89.
3. Issue #86 and PR #87.
4. PR #87 owner-audit comment `5118616501`.
5. Issue #86 owner-audit comment `5118621082`.
6. The complete 031 contract, state and this prompt.
7. Correction 030 setup and result records.
8. Current implementation at exact base `15c3c65...`:
   - `bin/researchops.mjs`;
   - `lib/taskhistory.mjs`;
   - `lib/boundary.mjs`;
   - `lib/stage.mjs` read-only;
   - `lib/validate.mjs` read-only;
   - `lib/package.mjs` read-only;
   - `lib/schema.mjs` read-only;
   - `lib/authz.mjs` read-only;
   - `fixtures/run.mjs`.
9. PR #69 and exact commits `bf0a093...`, `6ce489f...`, `923c2b5...` read-only.
10. Failing capture run `30446016864` and green Correction 030 run `30451912255`.

## Frozen setup verification

Require the remediation branch to descend exact base:

```text
15c3c65a0b7578a1c64ebda2ce6e924ed97df31c
```

The setup phase must add exactly these three files:

```text
RESEARCH_TASK_STAGE_BASE_CI_OWNER_AUDIT_REMEDIATION_CONTRACT.md
RESEARCH_TASK_STAGE_BASE_CI_OWNER_AUDIT_REMEDIATION_STATE.json
CLAUDE_RESEARCH_TASK_STAGE_BASE_CI_OWNER_AUDIT_REMEDIATION_PROMPT.md
```

They are immutable. Do not edit them.

Verify exact protected refs before implementation:

```text
origin/main   = dcc8069d0028bf1bf2b1cdc5d79f7e6b96897bd1
origin/master = 998fcedd7d9febbec5b130d4765dfeaafc40960b
PR #87 head  = 15c3c65a0b7578a1c64ebda2ce6e924ed97df31c
PR #69 head  = 923c2b58406f84b4355094f2e71f20a1931f70ea
```

PR #87 and #69 must remain open/draft/unmerged.

## Allowed implementation scope

Modify only the minimum necessary subset of:

```text
research-ops/factory-v1-1/bin/researchops.mjs
research-ops/factory-v1-1/lib/taskhistory.mjs
research-ops/factory-v1-1/lib/boundary.mjs
research-ops/factory-v1-1/lib/taskhistoryvalidate.mjs
research-ops/factory-v1-1/fixtures/run.mjs
```

Do not modify workflow, `stage.mjs`, `validate.mjs`, `package.mjs`, `schema.mjs`, `authz.mjs`, `model.mjs`, README, schemas, templates, architecture, task roots, or any prior setup/result record.

## Required remediation A — explicit segment diff result

Replace the current empty-array-on-error behavior.

The root-scoped segment diff interface must return an explicit structure such as:

```text
{ ok: true, records }
```

or:

```text
{ ok: false, errorCode, detail }
```

Requirements:

- Git diff command failure blocks;
- malformed NUL name-status blocks;
- an actual successful empty diff remains distinguishable from failure;
- every segment expected to represent a task-tree change must have a non-empty proven diff;
- error propagates into `mutationChain.violations` and the boundary result;
- do not expose credentials or raw environment data in diagnostics.

## Required remediation B — typed Git access

Do not use `null` or a default parent count for both normal absence and command error.

Use typed values or exceptions handled at the chain boundary. The semantics must distinguish:

```text
VALUE
LEGITIMATE_ABSENCE
ACCESS_ERROR
```

At minimum:

- first-parent lookup proves either one parent SHA or a true root commit;
- parent-count lookup returns a proven non-negative integer;
- task-root tree lookup proves either a tree OID or a true missing path;
- malformed or missing command output is `ACCESS_ERROR`;
- any accessor error blocks the chain;
- root-changing merge rejection remains intact;
- unchanged-task merge behavior remains intact;
- no `HEAD^` shortcut or mutable transition SHA input.

## Required remediation C — full historical validation

For each mutation-segment head, validate the exact historical Git tree using the canonical `validateTask` implementation.

Preferred procedure:

1. Create an OS temporary directory outside the repository.
2. Add a detached temporary worktree at the exact trusted segment head SHA.
3. Locate the fixed task root derived by the cumulative boundary.
4. Invoke imported `validateTask` against that historical task directory.
5. Require `report.ok === true`.
6. Capture bounded check evidence for the chain.
7. Remove/prune the worktree in `finally`.

Equivalent read-only materialization is acceptable only if it reuses the same canonical validation functions and proves identical checks.

Historical validation must include:

- TASK_STATE parse/shape/history;
- IDENTITY and GITHUB_PLAN shape/cross-binding;
- authorization floor at that historical head;
- declared state/evidence consistency;
- state-required package presence and full validity;
- exact inventory/JSON/manifest/IDs/references through canonical validation;
- stage directory and unsafe-entry checks.

Do not accept a segment when historical validation is missing, incomplete, throws, or reports any failed check.

## Immutable identity projection

From the introduction segment head, freeze this projection:

```text
schemaVersion
factoryVersion
taskId
project
countryCode
exchangeId
batchId
priority
createdAt
branch
requiredResearchInventory
```

Every later mutation head must match it exactly.

A transient mutation later restored must block at the commit where it exists.

## Same-state repair rule

A segment head declaring a package-requiring state must have a complete valid package at that exact commit.

Explicitly reject:

```text
commit A: state RESEARCH_CAPTURED with 10/11 files
commit B: state still RESEARCH_CAPTURED, missing file added
```

Commit A is invalid and the chain remains blocked even if final head becomes valid.

## Temporary worktree safety

- create only under an OS-generated temp path;
- detached exact SHA;
- never accept a temp path from task content or user input;
- do not persist credentials;
- no branch/ref mutation;
- cleanup in `finally`;
- materialization failure blocks;
- validation failure blocks;
- cleanup failure must be recorded;
- cleanup failure must never turn an already failed validation into success;
- no temporary files inside the repository.

## Mandatory regression tests

Retain all 260 Correction 030 fixtures and add deterministic negative coverage for:

1. segment diff command failure;
2. malformed segment diff output;
3. first-parent access error;
4. tree lookup access error;
5. parent-count access error;
6. malformed accessor output;
7. transient `deployAuthorized=true` restored later;
8. transient unknown `*Authorized=true` removed later;
9. transient taskId mutation restored later;
10. transient branch mutation restored later;
11. transient country mutation restored later;
12. transient exchange mutation restored later;
13. transient batch/priority/project/createdAt mutation restored later;
14. malformed historical TASK_STATE;
15. invalid historical IDENTITY binding;
16. invalid historical GITHUB_PLAN binding;
17. historical `RESEARCH_CAPTURED` with ten files;
18. later same-state commit adds missing file but chain remains invalid;
19. historical manifest/hash mismatch;
20. historical authorization violation is caught before final head;
21. temporary materialization failure;
22. historical validator exception;
23. cleanup failure reporting;
24. exact PR #69 reproduction remains green;
25. all existing creation/capture/merge/topology/path-scope cases remain green.

Use synthetic pure fixtures where sufficient. Add at least one real temporary Git repository integration fixture proving historical segment validation across multiple commits.

Report the new fixture total; do not hard-code a target total in implementation.

## Exact pilot reproduction

Using PR #69 commits only as read-only Git inputs, require:

```text
BOUNDARY mode=RESEARCH_TASK
TASK_CHAIN root=research-ops/tasks/CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001
TRANSITION ABSENT -> PREPARED
TRANSITION PREPARED -> RESEARCH_CAPTURED
TRANSITION_BASE_SHA=6ce489ff10655f65e62a76d1a5635aa80e73b44a
TRANSITION_HEAD_SHA=923c2b58406f84b4355094f2e71f20a1931f70ea
RESULT: BOUNDARY OK
```

Require canonical historical validator success at the valid mutation heads and `30/30 VALID` for the captured head.

Do not hard-code Binance, Kazakhstan, PR #69 or these SHAs in production logic. They may appear only in fixtures/result evidence.

## Commit discipline

Create one implementation commit containing only allowed implementation paths.

Then create exactly two result records:

```text
research-ops/factory-v1-1/research-task-stage-base-ci-owner-audit-remediation-031/RESEARCH_TASK_STAGE_BASE_CI_OWNER_AUDIT_REMEDIATION_RESULT.json
research-ops/factory-v1-1/research-task-stage-base-ci-owner-audit-remediation-031/RESEARCH_TASK_STAGE_BASE_CI_OWNER_AUDIT_REMEDIATION_RESULT.md
```

Create one recording commit containing exactly those two files.

No third worker commit.

## Local and real validation

Require:

- frozen 031 setup byte-identical;
- Correction 030 setup/results byte-identical;
- worker diff after frozen setup contains only allowed implementation paths plus two result records;
- `node --check` clean for every Factory `.mjs`;
- all fixtures pass, zero failed;
- exact pilot reproduction passes;
- historical validation negative cases fail as intended;
- `git diff --check` clean;
- ordinary non-force push only;
- existing PR #89 remains draft/open/unmerged;
- real PR #89 workflow succeeds with all steps executed;
- `ENFORCEMENT: DESCENDANT (protected base policy)`;
- `BOUNDARY mode=FACTORY_GOVERNANCE`;
- `RESULT: BOUNDARY OK`;
- PR #69 remains exact `923c2b5...`;
- `main` remains exact `dcc8069...`;
- `master` remains exact `998fced...`;
- Issues #84/#85/#86/#88 remain open;
- all eighteen active authorizations false.

## Prohibitions

Do not:

- create another PR;
- mark PR #89 ready;
- merge or publish;
- amend/rebase/reset/squash/cherry-pick/force-push;
- modify/rerun/comment-mutate PR #69;
- edit any Binance research file or TASK_STATE;
- begin Source Truth Review;
- import/canonicalize/publish research;
- modify ranking, CTA, promo, affiliate route, publication binding, sitemap, indexability or MIGRATION_5;
- modify `main`, `master` or production;
- deploy;
- delete branches;
- create V5.

## Final decision

Return exactly one:

```text
RESEARCH_TASK_STAGE_BASE_CI_OWNER_AUDIT_REMEDIATION_READY_FOR_OWNER_APPROVAL
```

or:

```text
RESEARCH_TASK_STAGE_BASE_CI_OWNER_AUDIT_REMEDIATION_BLOCKED
```

Return the final report titled:

```text
CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-STAGE-BASE-CI-OWNER-AUDIT-REMEDIATION-031 — Final Report
```
