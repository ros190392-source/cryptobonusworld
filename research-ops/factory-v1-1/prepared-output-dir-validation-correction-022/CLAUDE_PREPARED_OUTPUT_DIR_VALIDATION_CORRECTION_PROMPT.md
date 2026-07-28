# Claude execution prompt — PREPARED output-directory validation correction 022

Execute task:

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-PREPARED-OUTPUT-DIR-VALIDATION-CORRECTION-022`

## Governing identity

- Issue: #72
- source routing correction: Issue #70 / PR #71
- approved base branch: `correction/researchops-factory-v1-1-research-task-ci-021`
- exact approved base SHA: `8f6b1e635cca28e7dce6ca160ae7b68d7f258f0f`
- target branch: `correction/researchops-factory-v1-1-prepared-output-dir-validation-022`
- blocked pilot: Issue #68 / PR #69
- pilot head: `bf0a0932325be00aad08ec3db31aef1af9df2384`
- protected master: `998fcedd7d9febbec5b130d4765dfeaafc40960b`

Read Issue #72 and the complete setup triple before editing anything.

## Frozen setup

Verify the setup phase contains exactly these three additions and then treat them as immutable:

- `PREPARED_OUTPUT_DIR_VALIDATION_CORRECTION_CONTRACT.md`
- `PREPARED_OUTPUT_DIR_VALIDATION_CORRECTION_STATE.json`
- `CLAUDE_PREPARED_OUTPUT_DIR_VALIDATION_CORRECTION_PROMPT.md`

Record the exact frozen setup HEAD. Never edit the setup triple after freeze.

## Exact allowed worker files

Modify/create only:

1. `research-ops/factory-v1-1/lib/validate.mjs`
2. `research-ops/factory-v1-1/fixtures/run.mjs`
3. `research-ops/factory-v1-1/prepared-output-dir-validation-correction-022/PREPARED_OUTPUT_DIR_VALIDATION_CORRECTION_RESULT.json`
4. `research-ops/factory-v1-1/prepared-output-dir-validation-correction-022/PREPARED_OUTPUT_DIR_VALIDATION_CORRECTION_RESULT.md`

Any need to touch workflow, create/model/package/boundary/schema/template/README or another path means stop with `PREPARED_OUTPUT_DIR_VALIDATION_CORRECTION_BLOCKED`.

## Required implementation

Implement a narrow validator-ordering correction.

The validator must parse and structurally validate `TASK_STATE.json` before deciding whether the physical `20-research-output/` directory is required.

A missing `20-research-output/` check may pass only when all conditions hold:

- task directory exists;
- `TASK_STATE.json` exists;
- JSON parsing succeeds;
- structural shape validation succeeds;
- state is canonical and exactly `PREPARED`;
- `taskState.stages["20-research-output"] === "EMPTY"`;
- `opts.requirePackage !== true`;
- no research-package evidence is present;
- every other stage directory exists.

Use a clear check name/detail that distinguishes the permitted Git-empty PREPARED case from an actually present output directory.

Missing output directory must fail for:

- missing/malformed/structurally invalid TASK_STATE;
- noncanonical state;
- any state other than PREPARED;
- stage marker not exactly EMPTY;
- `--require-package`;
- partial research evidence;
- any later lifecycle state.

Do not weaken:

- exact eleven-file package inventory;
- package encoding, manifest, IDs, references or shapes;
- evidence/state consistency;
- authorization floor;
- append-only boundary;
- required presence of every other stage directory.

Do not add `20-research-output/.gitkeep` and do not create the missing directory inside validation or CI.

## Regression fixtures

Increase the complete suite beyond 222 with zero failures. Add explicit positive and negative fixtures for at least:

1. canonical PREPARED fresh-checkout tree with only output dir absent — valid;
2. exact PR #69 checkout — valid task root;
3. same tree with `--require-package` — invalid;
4. RESEARCH_CAPTURED with output dir absent — invalid;
5. later states with output dir absent — invalid;
6. PREPARED but stage marker not `EMPTY` — invalid;
7. missing TASK_STATE — invalid;
8. malformed TASK_STATE — invalid;
9. structurally invalid TASK_STATE — invalid;
10. missing another stage directory — invalid;
11. partial research evidence — invalid;
12. complete exact eleven-file package — still valid;
13. canonical `create` output in the live worktree — still valid;
14. Correction 021 routing fixtures and governance/bootstrap fixtures — still pass.

Regression tests must prove the exception is state- and evidence-bound, not merely path-bound.

## Required verification

Run and record:

- `node --check` for every factory `.mjs`;
- complete fixtures with exact pass/fail total;
- `git diff --check`;
- frozen setup immutability;
- exact worker changed-file inventory;
- local task validation and status for the fresh PR #69 checkout;
- exact PR #69 event reproduction using the protected-base routing from Correction 021.

The pilot reproduction must reach all four:

- `ENFORCEMENT: RESEARCH_TASK (protected base policy)`;
- `BOUNDARY mode=RESEARCH_TASK`;
- `RESULT: BOUNDARY OK`;
- successful validation of `research-ops/tasks/CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001`.

Also prove:

- governance `DESCENDANT` still passes;
- pinned V4 `BOOTSTRAP` behavior is unchanged;
- the Correction 022 PR's real GitHub workflow executes all enforcement steps successfully.

## Result records

Create exactly:

- `PREPARED_OUTPUT_DIR_VALIDATION_CORRECTION_RESULT.json`
- `PREPARED_OUTPUT_DIR_VALIDATION_CORRECTION_RESULT.md`

JSON must include task/setup identity, exact changed files, implementation semantics, fixture inventory, fresh-checkout proofs, exact pilot reproduction evidence, non-regression evidence, workflow run evidence, blocking findings, decision, recommended next owner command and all 18 false authorizations.

Use exactly one decision:

- `PREPARED_OUTPUT_DIR_VALIDATION_CORRECTION_READY_FOR_OWNER_MERGE`
- `PREPARED_OUTPUT_DIR_VALIDATION_CORRECTION_BLOCKED`

## Delivery

- use an isolated worktree;
- commit only allowed worker files;
- push only the existing correction branch;
- use the single stacked draft PR created by the owner;
- do not create another PR;
- do not mark ready;
- do not merge;
- wait for final real workflow success before reporting READY.

## Prohibitions

Do not modify PR #69, main or master. Do not conduct Binance research or populate the research package. Do not deploy, import, publish, change rankings/CTA/promo/affiliate/indexability/MIGRATION_5, delete branches, create V5 or start another broad validation cycle. All authorizations remain false.
