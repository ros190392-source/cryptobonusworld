# Claude Code Execution Prompt — Correction V2 Validation 013

## Task

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V2-VALIDATION-013`

## Repository

`C:\projects\CryptoBonusWorld`

## Exact refs

- validation branch: `validation/researchops-factory-v1-1-v2-013`
- freeze the current `origin/validation/researchops-factory-v1-1-v2-013` head immediately after `git fetch`; call it `INITIAL_VALIDATION_HEAD`
- source correction branch: `correction/researchops-factory-v1-1-v2-012`
- exact source commit: `d3ed1128497cf682863c438d47eb65d26ebb536b`
- source validation commit: `a958f0c7d7ce2d707e4d79e5eafdd984fc851d2d`
- control-plane `main`: `04157b9dfb140918a8569a5026da747b429e5ed3`
- protected `master`: `998fcedd7d9febbec5b130d4765dfeaafc40960b`

## GitHub

- governing Issue: #54
- source Correction V2 PR: #53
- validation PR targets `correction/researchops-factory-v1-1-v2-012`

## Isolated worktree

Use only:

`C:\projects\CryptoBonusWorld-validation-factory-v2-013`

Do not modify the current repository working tree.

## Phase 0 — baseline

1. `git fetch origin --prune`.
2. Freeze `INITIAL_VALIDATION_HEAD=$(git rev-parse origin/validation/researchops-factory-v1-1-v2-013)` and report it.
3. Verify every other exact ref above.
4. Create or safely reuse the isolated worktree on `validation/researchops-factory-v1-1-v2-013`.
5. Require clean status and local HEAD exactly equal to `INITIAL_VALIDATION_HEAD`.
6. Stop with `VALIDATION BASELINE MISMATCH` on any mismatch.

Never reset, force-push, rewrite history, modify `main`/`master`, or delete another worktree.

## Phase 1 — read completely

Read Issue #54, PR #53, the complete Correction V2 result files, this contract/state/prompt, and all modified implementation files.

Read the prior Validation 011 result to understand the ten findings being corrected.

## Phase 2 — immutable diff boundary

Independently verify:

- `de5601c7083b33c1c885c7184d9f22d70a4d9e8f..d3ed1128497cf682863c438d47eb65d26ebb536b` contains exactly the reported 17 changed files;
- no prior governance, validation, correction, `research-ops-pilot/**`, real `research-ops/tasks/**`, production or canonical record changed;
- PR #53 remains draft/unmerged with the exact base/head;
- `origin/main` and `origin/master` remain frozen;
- all authorization flags remain false.

## Phase 3 — independent reruns

Execute independently:

- `node --check` on every factory `.mjs`;
- full fixture suite, expected `108 passed / 0 failed`;
- direct CLI create/validate/status/check-boundary smoke;
- `git diff --check`;
- actual workflow-run inspection for `d3ed112...`.

Do not count the existing workflow or correction report as independent proof.

## Phase 4 — V2-C1 through V2-C10

Execute positive and negative probes for every correction in Issue #52. Record an individual verdict for each.

## Phase 5 — mandatory new probes A–N

Execute every probe A–N in Issue #54. Do not omit or combine them into narrative-only conclusions.

Mandatory emphasis:

- absolute CBW script invoked from a different valid Git worktree;
- broad/fake factory branch-prefix spoofing;
- trusted research head branch mismatching the task's internal plan;
- mutation/deletion of frozen factory governance/history records;
- exact initial task skeleton and exact per-stage inventories;
- recognized marker outcomes rather than arbitrary non-empty values;
- real 40-hex `main` merge record with receipt linkage;
- cumulative correction history;
- append-only `TASK_STATE.history` integrity;
- Git similarity scores limited to 0–100 and ambiguous name-status input;
- invalid UTF-8 and control-byte edge cases;
- workflow event metadata and repository-root mismatch.

Use OS temporary directories and temporary Git repositories for destructive probes. Never create a real Binance task or tracked task under `research-ops/tasks/**`.

## Phase 6 — decision

Use exactly one:

- `VALIDATED_FOR_OWNER_MERGE_REVIEW`
- `VALIDATED_WITH_CORRECTIONS_REQUIRED`
- `VALIDATION_BLOCKED`

No clean pass is allowed if any Issue #54 disqualifier is reproducible.

## Phase 7 — write exactly two files

Create only:

- `research-ops/factory-v1-1/correction-v2-validation-013/FACTORY_CORRECTION_V2_VALIDATION.json`
- `research-ops/factory-v1-1/correction-v2-validation-013/FACTORY_CORRECTION_V2_VALIDATION.md`

The JSON must include:

- task identity and validated commit;
- baseline/diff/immutability verification;
- syntax and fixture reruns;
- V2-C1–V2-C10 matrix;
- probes A–N matrix;
- workflow result;
- blocking findings;
- correction-required findings;
- nonblocking notes;
- validation outcome;
- required corrections;
- next task;
- full all-false authorization matrix.

Do not modify the three existing validation governance files.

## Phase 8 — self-validation

Require:

- validation JSON parses;
- `git diff --name-only "$INITIAL_VALIDATION_HEAD"` contains exactly the two result files;
- `git diff --check` clean;
- no implementation or prior record changed.

## Phase 9 — commit and push

Commit only the two result files.

Commit message:

`validate(researchops): verify Factory V1.1 Correction V2`

Push only:

`validation/researchops-factory-v1-1-v2-013`

Do not merge or mark any PR ready. Do not deploy. Do not create Binance.

## Final report

Return:

1. PASS or BLOCKED execution result;
2. frozen initial validation HEAD;
3. final validation commit SHA;
4. exact two files created;
5. validation outcome;
6. exact Correction V2 diff verification;
7. immutability result;
8. node-check and fixture counts;
9. V2-C1–V2-C10 verdicts;
10. A–N verdicts;
11. workflow result;
12. blocking findings;
13. correction-required findings;
14. nonblocking notes;
15. merge-readiness judgment;
16. next task;
17. all authorizations false confirmation;
18. PR #53 and validation PR status;
19. `main`/`master`/production/Binance unchanged confirmation.

Stop after the report.
