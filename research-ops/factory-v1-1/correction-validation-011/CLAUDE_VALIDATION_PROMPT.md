# Claude Code Prompt — Factory V1.1 Correction Validation 011

## Task

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-VALIDATION-011`

Perform the independent adversarial validation defined by GitHub Issue #50.

This is a validation task, not an implementation task. Do not repair defects. Create only the two required validation-result files.

## Fixed lineage

- repository: `C:\projects\CryptoBonusWorld`
- validation branch: `validation/researchops-factory-v1-1-correction-011`
- correction branch: `correction/researchops-subscription-factory-v1-1-010`
- correction commit: `2b9fecd8540070c92f1d1ba382ba05b64597a7e6`
- correction initial head: `289d6471b6dec95d8e1d98c2c36aa031293d2bbe`
- original validation commit: `2f95f8a373e21204548e6c61433677d009943b26`
- implementation commit: `02997bb63be39012015486ecf55da707a3738f6b`
- `main`: `04157b9dfb140918a8569a5026da747b429e5ed3`
- `master`: `998fcedd7d9febbec5b130d4765dfeaafc40960b`
- correction PR: #49
- validation PR: created for this branch
- governing issue: #50

## Phase 0 — safety and worktree

Do not modify the current worktree.

Run:

```text
git status --short
git branch --show-current
git rev-parse HEAD
git remote -v
git worktree list
git fetch origin --prune
```

Verify the fixed lineage above. Also verify the validation branch remote head equals the expected initial validation head supplied in the invoking message.

If any required SHA differs, stop with:

```text
VALIDATION BASELINE MISMATCH
```

Create or safely reuse an isolated worktree:

```text
C:\projects\CryptoBonusWorld-factory-correction-validation-011
```

Use the validation branch only. Do not reset, force-push, rewrite history, delete another worktree, modify `main`, or modify `master`.

Require a clean worktree before validation.

## Phase 1 — read all governed material

Read completely:

1. GitHub Issue #50.
2. PR #49 metadata, changed files and correction report.
3. PR #46 metadata and both Validation 009 result files.
4. PR #44 metadata.
5. `correction-validation-011/VALIDATION_CONTRACT.md`.
6. `correction-validation-011/VALIDATION_STATE.json`.
7. `correction-010/CORRECTION_CONTRACT.md`.
8. `correction-010/CORRECTION_RESULT.json`.
9. `correction-010/CORRECTION_RESULT.md`.
10. Every changed implementation/workflow file from Correction 010.
11. Original factory governance files and README.

Do not begin conclusions before reading the full material.

## Phase 2 — baseline and immutable-layer verification

Independently verify:

- `git diff --name-only 289d6471b6dec95d8e1d98c2c36aa031293d2bbe 2b9fecd8540070c92f1d1ba382ba05b64597a7e6` matches the correction report's exact 14-file inventory;
- correction setup contract/state/prompt were not modified by the correction executor;
- `validation-009/**` is byte-identical across the correction range;
- `governance/**` is byte-identical across the correction range;
- `research-ops-pilot/**` is byte-identical across the correction range;
- real `research-ops/tasks/**` was not created or modified;
- `main` and `master` retain the fixed SHAs;
- PR #49 remains draft and unmerged.

Record any discrepancy.

## Phase 3 — independent reruns

Run independently:

```text
node --check
```

for every `.mjs` under the factory.

Run:

```text
node research-ops/factory-v1-1/fixtures/run.mjs
```

Expected baseline claim: `63 passed / 0 failed`.

Run direct smoke tests for:

- `create`;
- `validate` human and JSON;
- `status` human and JSON;
- `check-boundary`;
- `--require-package` on an empty skeleton;
- rejected `--tasks-dir`;
- valid and invalid owner receipts;
- `git diff --check`.

Do not treat existing fixtures as sufficient for the mandatory probes below.

## Phase 4 — verify corrections C1–C9

Execute independent positive and negative tests for every correction listed in Issue #47 and Issue #50.

Return a separate verdict for each:

- `PASS`;
- `PASS_WITH_NOTE`;
- `CORRECTION_REQUIRED`;
- `BLOCKED`.

Do not infer success from code inspection alone when an executable probe is possible.

## Phase 5 — mandatory new bypass probes

Execute every probe A–L from Issue #50.

### A — actual repository-root confinement

Test the canonical CLI by absolute path from:

- the repository root;
- a repository subdirectory;
- an OS temp directory outside the repository.

It must never create a task below an arbitrary current directory. A safe implementation must resolve the actual Git worktree root or fail closed when invoked outside a supported worktree.

Use unique temporary task IDs and clean every untracked temporary skeleton you create. Never create the real Binance pilot task.

### B — rename/copy boundary

Feed realistic `git diff --name-status` records, including `R100` and `C100`, and verify both source and destination paths are evaluated.

Test all source/destination combinations specified in Issue #50. Test malformed records and unsupported statuses. A rename must not hide deletion or cross-boundary movement.

### C — PR-mode identity

Determine whether `FACTORY_GOVERNANCE` versus `RESEARCH_TASK` is bound only to changed paths or also to trusted branch/task/PR metadata.

Demonstrate whether a research branch can change only a factory file and pass. If yes, record a correction-required mode-confusion defect.

### D — exact workflow allowlist

Test whether factory mode accepts unrelated workflow files such as deployment workflows. The factory boundary must not grant blanket authority to all `.github/workflows/**`.

### E — stage-aware append-only control

Construct realistic changed-status files and task states. Test mutation of closed earlier stages after later declared states, with MANIFEST regenerated where applicable.

A single-task-root restriction is not equivalent to append-only stage immutability. Record whether the implementation enforces the stage transition boundary.

### F — GITHUB_PLAN cross-binding

Test every mismatch among:

- `TASK_STATE.branch`;
- `GITHUB_PLAN.taskBranch`;
- `GITHUB_PLAN.pullRequest.head`;
- base branches;
- task IDs;
- draft and auto-merge flags.

### G — identity grammar/types

Test missing, null, numeric and malformed-but-equal identity fields. Validate safe grammar for fields used to generate deterministic branches and paths.

### H — all research JSON shapes

For each of the nine JSON files, create a manifest-valid package with an invalid top-level shape or missing required top-level structure. Each malformed package must fail.

### I — owner receipt shape

Test missing and wrong-type receipt fields and missing canonical false authorization keys. Only exact research-record merge to `main` for the exact task may pass.

### J — invalid UTF-8

Inject invalid UTF-8 bytes into JSON and Markdown, recompute bytes/hashes, and verify rejection. Replacement-character decoding is not valid canonical UTF-8 validation.

### K — higher-stage marker integrity

Test zero-byte, malformed, wrong-task, symlink and arbitrary marker files for `50/60/70/80` state gates. Determine whether state escalation can occur through existence-only markers.

### L — actual workflow and boundary behavior

Inspect the actual workflow run on the correction head. Independently simulate multiple roots, empty diff, malformed diff, deletion, rename/copy, factory-only, task-only and mixed changes.

## Phase 6 — security and authorization checks

Confirm recursively that no task state, package, receipt or validation output can authorize:

- `master` changes;
- research/staging/canonical import;
- production changes/bindings;
- ranking;
- CTA;
- promo;
- affiliate routing;
- publication;
- sitemap;
- indexability;
- MIGRATION_5;
- deploy;
- Binance pilot.

The only permitted exception is exact research-record merge to `main` for the exact task through a valid receipt. This validation itself must leave that flag false.

## Phase 7 — required output

Create exactly:

```text
research-ops/factory-v1-1/correction-validation-011/FACTORY_CORRECTION_VALIDATION.json
research-ops/factory-v1-1/correction-validation-011/FACTORY_CORRECTION_VALIDATION.md
```

The JSON must include:

- schemaVersion;
- validationTaskId;
- correctionTaskId;
- validatedCorrectionCommitSha;
- validatedAt;
- environment;
- baselineVerification;
- correctionDiffVerification;
- immutableLayerVerification;
- syntaxAndFixtureReruns;
- cliSmokeResults;
- correctionMatrixC1ToC9;
- newBypassProbeMatrixAtoL;
- workflowValidation;
- pathConfinementResult;
- renameCopyBoundaryResult;
- prModeIdentityResult;
- workflowAllowlistResult;
- stageAwareAppendOnlyResult;
- githubPlanBindingResult;
- identityGrammarResult;
- allResearchJsonShapeResult;
- ownerReceiptShapeResult;
- utf8ValidityResult;
- higherStageMarkerResult;
- authorizationValidation;
- blockingFindings;
- correctionRequiredFindings;
- nonblockingNotes;
- validationOutcome;
- requiredCorrections;
- nextTask;
- authorizations.

`validationOutcome` must be exactly one of:

- `VALIDATED_FOR_OWNER_MERGE_REVIEW`;
- `VALIDATED_WITH_CORRECTIONS_REQUIRED`;
- `VALIDATION_BLOCKED`.

On clean validation set:

```text
nextTask = CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-OWNER-CLOSEOUT-012
```

On corrections required set:

```text
nextTask = CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V2-012
```

Every authorization in the output must be false.

The Markdown must include an executive verdict, exact rerun results, C1–C9 matrix, A–L matrix, material weaknesses, workflow judgment, merge-readiness judgment, remaining limitations and explicit no-production/no-Binance authorization.

## Phase 8 — self-validation and diff boundary

Parse the output JSON.

Run:

```text
git status --short
git diff --name-only <INITIAL_VALIDATION_HEAD>
```

Require exactly the two result files. No contract/state/prompt or implementation file may change.

If any unauthorized file changed, revert only your own unauthorized changes and stop before commit if the boundary cannot be restored.

## Phase 9 — commit and push

Stage only the two result files.

Commit message:

```text
validate(factory): verify correction 010 adversarially
```

Push only:

```text
validation/researchops-factory-v1-1-correction-011
```

Do not merge any PR. Do not mark a PR ready. Do not modify `main` or `master`. Do not deploy. Do not create Binance.

## Final report

Return:

1. PASS or BLOCKED execution result;
2. initial validation HEAD;
3. final validation commit SHA;
4. exact two files created;
5. validationOutcome;
6. correction diff/immutability result;
7. syntax and fixture results;
8. C1–C9 verdicts;
9. A–L verdicts;
10. workflow verdict;
11. blocking findings;
12. correction-required findings;
13. nonblocking notes;
14. merge-readiness judgment;
15. next task;
16. confirmation all authorizations false;
17. confirmation PRs remain draft/unmerged;
18. confirmation `main`, `master`, completed records and production were not modified.

Stop after the report.
