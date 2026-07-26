# Claude execution prompt — ResearchOps Factory V1.1 Correction 010

## Role

Act as the governed correction executor for:

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-010`

This is an implementation task. Do not merely review, summarize or propose changes. Apply and test all nine corrections, commit, push, and stop before merge.

## Repository and branches

- Repository: `C:\projects\CryptoBonusWorld`
- Correction branch: `correction/researchops-subscription-factory-v1-1-010`
- Correction base: `validation/researchops-subscription-factory-v1-1-009`
- Exact validation commit: `2f95f8a373e21204548e6c61433677d009943b26`
- Implementation commit validated: `02997bb63be39012015486ecf55da707a3738f6b`
- Implementation PR: `#44`
- Validation PR: `#46`
- Governing Issue: `#47`
- Protected `main`: `04157b9dfb140918a8569a5026da747b429e5ed3`
- Protected `master`: `998fcedd7d9febbec5b130d4765dfeaafc40960b`
- Isolated worktree: `C:\projects\CryptoBonusWorld-factory-correction-010`

The invoking owner instruction supplies the expected current correction-branch HEAD. Verify it exactly before mutation.

## Phase 0 — safety verification

Do not modify the currently open working tree.

Run:

```text
git status --short
git branch --show-current
git rev-parse HEAD
git remote -v
git worktree list
git fetch origin --prune
```

Verify:

- `origin/validation/researchops-subscription-factory-v1-1-009` = `2f95f8a373e21204548e6c61433677d009943b26`;
- `origin/feat/researchops-subscription-factory-v1-1` still contains implementation commit `02997bb63be39012015486ecf55da707a3738f6b` in its ancestry/current stack;
- `origin/main` = `04157b9dfb140918a8569a5026da747b429e5ed3`;
- `origin/master` = `998fcedd7d9febbec5b130d4765dfeaafc40960b`;
- `origin/correction/researchops-subscription-factory-v1-1-010` equals the exact expected current correction HEAD supplied by the invoking instruction.

If any baseline differs, stop with:

`CORRECTION BASELINE MISMATCH`

Never reset, force-push or rewrite history.

Create or safely reuse an isolated worktree at:

`C:\projects\CryptoBonusWorld-factory-correction-010`

When the local correction branch does not exist:

```text
git worktree add --track -b correction/researchops-subscription-factory-v1-1-010 "C:\projects\CryptoBonusWorld-factory-correction-010" origin/correction/researchops-subscription-factory-v1-1-010
```

When it exists and is not attached elsewhere:

```text
git worktree add "C:\projects\CryptoBonusWorld-factory-correction-010" correction/researchops-subscription-factory-v1-1-010
```

If already attached, inspect rather than deleting it.

All later work must occur only inside the isolated worktree. Require clean working tree and the correction branch.

## Phase 1 — mandatory reads

Read completely before editing:

- GitHub Issue #47;
- PR #44 metadata and changed files;
- PR #46 metadata and validation files;
- `research-ops/factory-v1-1/correction-010/CORRECTION_CONTRACT.md`;
- `research-ops/factory-v1-1/correction-010/CORRECTION_STATE.json`;
- `research-ops/factory-v1-1/validation-009/FACTORY_VALIDATION.json`;
- `research-ops/factory-v1-1/validation-009/FACTORY_VALIDATION.md`;
- every current implementation file under `research-ops/factory-v1-1/bin/`, `lib/`, `fixtures/`, `schemas/`, `templates/`;
- `research-ops/factory-v1-1/README.md`;
- `.github/workflows/cbw-researchops-factory-validate.yml`.

Do not alter the validation record or original governance files.

## Phase 2 — correction C1: force-package flag

Fix canonical CLI plumbing so:

```text
node research-ops/factory-v1-1/bin/researchops.mjs validate --task-dir <EMPTY_TASK> --require-package
```

returns non-zero and reports absence/incompleteness of the exact eleven-file package.

The boolean parser must map `--require-package` to `requirePackage`, or the CLI must explicitly normalize it. Remove dead/no-op code.

Test both:

- empty task + no force: valid only when state permits no package;
- empty task + `--require-package`: invalid;
- complete package + `--require-package`: valid.

## Phase 3 — correction C2: state/evidence consistency

Create one canonical evidence-state derivation shared by `validate` and `status`; do not duplicate contradictory logic.

Minimum required semantics:

- `PREPARED`: contract/state skeleton only;
- `RESEARCH_CAPTURED`: exact eleven-file package present and structurally valid;
- `PACKAGE_VALIDATED`: package valid plus a governed package-validation artifact or explicit validation metadata that the factory defines and validates;
- `SOURCE_TRUTH_REVIEWED`: required source-truth review stage artifact present and valid;
- `CORRECTION_REQUIRED`: review explicitly requires corrections;
- `CORRECTED`: corrected-stage result present;
- `VALIDATED`: validation-stage result present;
- `OWNER_CLOSEOUT_REQUIRED`: validation passed and closeout is pending;
- `RESEARCH_RECORD_MERGE_AUTHORIZED`: valid exact owner receipt present;
- `RESEARCH_RECORD_MERGED_TO_MAIN`: closeout/merge evidence present;
- `BLOCKED`: valid terminal blocked state with a reason.

Use conservative artifact contracts. The generated skeleton/templates may need small deterministic result-file conventions. Do not invent production authorization.

Both `validate` and `status`, in human and JSON modes, must agree and return non-zero for inconsistent declared states.

At a minimum, all eight evidence-bearing states tested by Validation 009 must fail when the package/stages are empty.

## Phase 4 — corrections C3/C4/C5: workflow fail-closed and append-only

Correct `.github/workflows/cbw-researchops-factory-validate.yml`.

### Discovery

- no `|| true` on fetch or diff;
- verify base/head SHAs are non-empty and resolve;
- `git diff` failure must fail the job;
- reject malformed changed paths;
- write exact changed paths to a file, preserving one path per line;
- do not turn discovery errors into an empty set.

### Task roots

- discover every changed `research-ops/tasks/<TASK_ID>/` root;
- validate task IDs/path shape;
- reject a referenced root that no longer exists;
- reject deletion of the task root or governed append-only records;
- validate all discovered roots, not only the first.

### Changed-file boundary

Invoke the canonical validator with a changed-files file. Do not merely grep.

For a normal research-task PR:

- only the task root(s) intentionally supported by the PR may change;
- preferably require exactly one task root to enforce the one-task/one-PR model;
- factory/workflow files are not automatically allowed as an escape;
- reject another task, completed pilot records, `src`, `public`, canonical MI data, arbitrary top-level files and production paths.

For a factory-governance PR such as this correction:

- allow only the explicitly governed factory/workflow boundary;
- do not require a real `research-ops/tasks/` root;
- detect this mode fail-closed from the changed-file set or an explicit safe workflow rule, never a user-supplied untrusted bypass.

Extract pure testable changed-file discovery/boundary helpers into Node when helpful, then test them through fixtures. The workflow remains read-only.

## Phase 5 — correction C6: `--tasks-dir` confinement

Canonical CLI `create` must reject:

- absolute POSIX paths;
- absolute Windows paths;
- UNC paths;
- drive-relative paths;
- `..` segments;
- paths outside repository-relative `research-ops/tasks/`;
- alternate paths that normalize outside the allowed root.

The canonical CLI should normally not expose arbitrary `--tasks-dir`. Either remove the flag from CLI or restrict it to the exact safe root/subpath policy.

Tests still need OS temp roots. Provide an explicit library-only option such as `unsafeTestTasksDir`/`testRoot` that is never accepted by CLI parsing. Make the distinction obvious in code and README.

## Phase 6 — correction C7: nested package entries

Recursively inspect `20-research-output/`.

Require exactly eleven flat regular files at depth one and no other entries. Reject:

- nested directories even if empty;
- nested files;
- hidden files/directories;
- symlinks;
- executables;
- special/non-regular entries;
- path traversal or normalized duplicates.

Keep canonical UTF-8/no-BOM/LF and MANIFEST checks.

## Phase 7 — correction C8: reference field typing

For every CROSSREF rule:

- required reference fields must exist when the schema requires them;
- value must be an array;
- every item must be a non-empty string;
- duplicates should be rejected or deterministically flagged;
- every ID must resolve against the proper collection.

Do not treat `null`, string, object or number as an empty list.

Add tests for each invalid type and valid empty arrays where semantically allowed.

## Phase 8 — correction C9: structural/schema enforcement

Use dependency-free deterministic validation. You may bind the existing schema documents through a small built-in schema subset validator or implement equivalent explicit checks.

At minimum enforce:

### TASK_STATE

- object top level;
- required schemaVersion, factoryVersion, taskId, project, countryCode, exchangeId, batchId, priority, state, branch, authorizations, history;
- taskId valid;
- state valid;
- authorization object includes every canonical key exactly as boolean;
- no unknown true `*Authorized` privileges.

### IDENTITY

- file exists and parses;
- required identity fields;
- taskId/country/exchange/batch/priority match TASK_STATE;
- required research inventory equals canonical inventory.

### GITHUB_PLAN

- exists and parses;
- taskId exact match;
- model `ONE_BRANCH_ONE_DRAFT_PR`;
- base `main`;
- one safe task branch derived from identity;
- PR draft true;
- autoMerge false;
- mergeAuthorized false until exact owner receipt.

### Research JSON

- top-level expected object and collection arrays;
- string ID fields;
- authorization-bearing objects use boolean canonical keys;
- reject wrong top-level types.

### Owner receipt

- required type, exact taskId, target `main`, authorization object;
- canonical merge key boolean true;
- all forbidden canonical keys present as false or absent only when policy explicitly permits; prefer complete canonical matrix;
- reject unknown true `*Authorized` keys recursively;
- reject malformed value types.

Update schema files and README if needed, but implementation must actually enforce the rules.

## Phase 9 — tests

Keep every existing test green and add adversarial tests for every correction.

The corrected suite must explicitly cover at least:

1. empty package forced failure;
2. full package forced pass;
3. all evidence-bearing declared states with missing artifacts;
4. valid state/artifact progression;
5. fetch/diff discovery failure helper;
6. deleted task root;
7. multiple/other task roots;
8. immutable earlier-stage mutation even after re-manifesting;
9. normal task changed-file boundary;
10. factory-governance changed-file boundary;
11. CLI absolute/traversal tasks-dir rejection;
12. library-only OS temp root;
13. nested package directory and file;
14. hidden nested entry;
15. non-array/null/object reference field;
16. duplicate/non-string reference item;
17. missing TASK_STATE taskId;
18. missing IDENTITY;
19. identity mismatch;
20. malformed/missing GITHUB_PLAN fields;
21. missing/non-boolean authorization key;
22. owner receipt privilege escalation;
23. status/validate human+JSON agreement;
24. existing valid package and prior 24 fixtures.

Report exact pass/fail counts. Zero failures required.

Run:

```text
node --check <every factory .mjs>
node research-ops/factory-v1-1/fixtures/run.mjs
git diff --check
```

Also execute direct CLI smoke tests for create, validate, status and `--require-package`.

## Phase 10 — write boundary

Allowed modifications only:

- `.github/workflows/cbw-researchops-factory-validate.yml`;
- `research-ops/factory-v1-1/bin/**`;
- `research-ops/factory-v1-1/lib/**`;
- `research-ops/factory-v1-1/fixtures/**`;
- `research-ops/factory-v1-1/schemas/**`;
- `research-ops/factory-v1-1/README.md`;
- `research-ops/factory-v1-1/correction-010/**`.

Do not modify:

- `research-ops/factory-v1-1/governance/**`;
- `research-ops/factory-v1-1/validation-009/**`;
- `research-ops-pilot/tasks/**`;
- tracked `research-ops/tasks/**`;
- any production/canonical/site/deployment path;
- `main` or `master`.

Before commit, compare against the exact correction setup HEAD supplied by the invoking instruction. Every changed path must be allowed.

Create exactly these correction result records:

- `research-ops/factory-v1-1/correction-010/CORRECTION_RESULT.json`
- `research-ops/factory-v1-1/correction-010/CORRECTION_RESULT.md`

Do not modify `CORRECTION_CONTRACT.md`, `CORRECTION_STATE.json` or this prompt after starting correction execution.

`CORRECTION_RESULT.json` must include:

- task identity and validated implementation/validation SHAs;
- exact changed-file inventory;
- nine-correction matrix with evidence;
- CLI smoke results;
- syntax and fixture counts;
- workflow fail-closed result;
- path-safety result;
- schema/identity result;
- authorization result;
- remaining limitations;
- correctionOutcome exactly `CORRECTED_READY_FOR_INDEPENDENT_VALIDATION` or `CORRECTION_BLOCKED`;
- nextTask `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-VALIDATION-011` on success;
- every merge, Binance, canonical, production, activation and deploy authorization false.

## Phase 11 — commit and push

Stage only allowed correction changes.

Commit message:

`fix(researchops): close Factory V1.1 validation gaps`

Push only:

```text
git push origin correction/researchops-subscription-factory-v1-1-010
```

Do not merge PR #44, #46 or the correction PR. Do not mark ready. Do not deploy or create Binance artifacts.

## Final report

Return:

1. PASS or BLOCKED;
2. initial correction HEAD;
3. final correction commit SHA;
4. exact changed-file inventory;
5. result for each C1–C9;
6. final fixture pass/fail counts;
7. direct CLI smoke results;
8. workflow fail-closed result;
9. state/evidence result;
10. append-only/task-deletion result;
11. tasks-dir/path-safety result;
12. package-depth/reference-type result;
13. structural/schema result;
14. authorization result;
15. remaining limitations;
16. correctionOutcome;
17. confirmation validation/governance/OKX records unchanged;
18. confirmation all production/activation/Binance/merge authorizations false;
19. confirmation all PRs remain draft/unmerged;
20. confirmation `main`, `master` and production unchanged.

Stop after the final report.
