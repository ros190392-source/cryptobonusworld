# Claude execution prompt — Factory V1.1 Validation 009

## Task

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-VALIDATION-009`

Act as an independent adversarial validator of the implementation at:

`02997bb63be39012015486ecf55da707a3738f6b`

Do not repair implementation defects during this task.

## Phase 0 — baseline and isolated worktree

From `C:\projects\CryptoBonusWorld`:

1. Run and report `git status --short`, current branch, HEAD, remotes and `git worktree list`.
2. `git fetch origin --prune`.
3. Require:
   - `origin/feat/researchops-subscription-factory-v1-1 = 02997bb63be39012015486ecf55da707a3738f6b`;
   - `origin/main = 04157b9dfb140918a8569a5026da747b429e5ed3`;
   - `origin/master = 998fcedd7d9febbec5b130d4765dfeaafc40960b`.
4. Require the validation branch to descend exactly from the implementation head.
5. Create or safely reuse an isolated worktree:

`C:\projects\CryptoBonusWorld-validation-researchops-factory-v1-1-009`

checked out on:

`validation/researchops-subscription-factory-v1-1-009`

Do not reset, force-push, rewrite history, delete another worktree, modify `main`, or modify `master`.

Stop with `VALIDATION BASELINE MISMATCH` on any identity mismatch.

## Phase 1 — mandatory reads

Read completely:

- GitHub Issue #45;
- GitHub Issue #43;
- PR #44 metadata, changed-file inventory and workflow result;
- `research-ops/factory-v1-1/validation-009/VALIDATION_CONTRACT.md`;
- `research-ops/factory-v1-1/validation-009/VALIDATION_STATE.json`;
- all four files under `research-ops/factory-v1-1/governance/`;
- every implementation file changed by PR #44;
- `.github/workflows/cbw-researchops-factory-validate.yml`.

Do not begin conclusions before all required material is read.

## Phase 2 — independent rerun

Run independently:

- Node version check, require Node 20-compatible execution;
- `node --check` for every factory `.mjs` file;
- `node research-ops/factory-v1-1/fixtures/run.mjs`;
- `git diff --check 02997bb63be39012015486ecf55da707a3738f6b` after your output is created;
- inspect the successful PR workflow run but do not treat it as sufficient validation.

Use OS temporary directories for generated tasks and adversarial probes. Do not create a tracked Binance task.

## Phase 3 — execute Issue #45 adversarial matrix

Execute every probe in Issue #45, not merely source-review it.

At minimum prove or disprove:

1. `--require-package` forces an empty skeleton to fail.
2. Every evidence-bearing state fails when required artifacts are absent.
3. Workflow changed-file discovery is truly fail-closed despite `|| true` constructs.
4. Workflow rejects deletion of a task root.
5. Workflow actually enforces append-only changed-file boundaries.
6. An immutable earlier stage cannot be changed and re-manifested without CI rejection.
7. The canonical CLI cannot escape the repository through `--tasks-dir`.
8. The JSON schemas are actively enforced or clearly classified as documentation-only; malformed required shapes must not pass.
9. Unknown or nested authorization privileges cannot bypass the floor.
10. A temporary generated task is complete, deterministic and has no unresolved tokens.
11. `status` human and JSON modes agree across all canonical states and inconsistent artifact combinations.
12. Package validation rejects all deeper malformed encodings, entries, IDs, references and MANIFEST cases listed in Issue #45.
13. Workflow permissions and side effects are read-only and bounded.

For each probe record:

- exact command or simulation method;
- expected result;
- observed exit code/result;
- PASS, CORRECTION_REQUIRED or BLOCKING;
- supporting implementation path/line when relevant.

## Phase 4 — decision rules

Use exactly one outcome:

- `VALIDATED_FOR_OWNER_MERGE_REVIEW` only when no material fail-open behavior or unsafe path exists;
- `VALIDATED_WITH_CORRECTIONS_REQUIRED` when the core architecture is usable but one or more correctable safety/completeness defects exist;
- `VALIDATION_BLOCKED` when the factory cannot safely govern tasks without redesign or validation cannot be completed.

The following may never be treated as a clean-pass note:

- broken `--require-package` enforcement;
- evidence-bearing states passing with absent artifacts;
- swallowed workflow diff/fetch failure;
- task deletion silently passing;
- absent append-only enforcement in CI;
- canonical CLI path escape;
- authorization privilege escape.

## Phase 5 — write exactly two files

Create exactly:

- `research-ops/factory-v1-1/validation-009/FACTORY_VALIDATION.json`
- `research-ops/factory-v1-1/validation-009/FACTORY_VALIDATION.md`

Do not modify the contract, state, prompt, implementation, workflow, governance, completed OKX records, `main`, or `master`.

The JSON must contain all fields required by Issue #45, an explicit probe matrix and every authorization false.

The Markdown must contain:

- executive outcome;
- independent test summary;
- implementation strengths;
- material defects;
- workflow findings;
- CLI/state/path/schema/authorization findings;
- required corrections;
- nonblocking notes;
- merge-readiness judgment;
- explicit confirmation that Binance, production and deploy remain unauthorized.

## Phase 6 — self-validation and diff boundary

Validate `FACTORY_VALIDATION.json` parses.

Run:

`git diff --name-only <INITIAL_VALIDATION_HEAD>`

Require exactly the two output files above. No other file may change.

Run `git diff --check`.

## Phase 7 — commit and push

Commit only the two output files with:

`validate(factory): independently assess ResearchOps V1.1`

Push only:

`git push origin validation/researchops-subscription-factory-v1-1-009`

Do not merge PR #44 or the validation PR. Do not mark either ready. Do not deploy. Do not create the Binance pilot.

## Final report

Return:

1. PASS or BLOCKED execution result;
2. initial validation HEAD;
3. final validation commit SHA;
4. exact two files created;
5. validationOutcome;
6. fixture rerun result;
7. result of every mandatory adversarial category;
8. blocking findings;
9. corrections required with count;
10. nonblocking notes;
11. implementation report/count reconciliation;
12. merge-readiness judgment;
13. confirmation all production/activation authorizations remain false;
14. confirmation PR #44 and validation PR remain draft/unmerged;
15. confirmation `main`, `master`, completed OKX records and production were not modified;
16. next recommended task.

Stop after the final report.
