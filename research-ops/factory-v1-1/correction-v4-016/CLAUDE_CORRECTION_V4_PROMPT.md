# Claude Code Execution Prompt — Final Correction V4 016

## Task

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V4-016`

## Repository

`C:\projects\CryptoBonusWorld`

## GitHub

- Governing Issue: #60
- Source Validation PR: #59
- Correction V4 PR: to be opened as a draft

## Exact baseline

- source validation commit: `07d0e38a540355244b2bcab0258d3eb5463ed1af`
- branch: `correction/researchops-factory-v1-1-v4-016`
- base branch: `validation/researchops-factory-v1-1-v3-015`
- protected `main`: `04157b9dfb140918a8569a5026da747b429e5ed3`
- protected `master`: `998fcedd7d9febbec5b130d4765dfeaafc40960b`

The exact initial V4 setup HEAD is the remote branch tip after all three setup files exist. Freeze it during Phase 0 and report it.

## Objective

Perform the final critical hardening pass for ResearchOps Factory V1.1. Implement exactly V4-C1 through V4-C7 from Issue #60.

Do not start a V5 redesign. Findings D, H and K from Validation 015 are accepted V1.1 backlog limitations unless a critical correction necessarily changes them.

## Isolated worktree

Use only:

`C:\projects\CryptoBonusWorld-correction-v4-016`

Do not modify the primary repository working tree.

## Phase 0 — baseline and stop conditions

1. Run `git fetch origin --prune`.
2. Verify the V4 branch exists and is descended exactly from source validation commit `07d0e38...`.
3. Freeze the current remote V4 branch tip as `INITIAL_V4_HEAD`.
4. Create or safely reuse the isolated worktree on the exact V4 branch.
5. Require a clean worktree.
6. Verify `origin/main` and `origin/master` equal the protected SHAs.
7. Verify PR #59 remains draft/unmerged.
8. Verify there is no canonical Binance task.

Stop with `CORRECTION V4 BASELINE MISMATCH` on any mismatch.

Never reset, force-push, rewrite history, merge, deploy or modify `main`/`master`.

## Phase 1 — read completely

Read:

- Issue #60;
- Validation 015 JSON and Markdown;
- Correction V3 result and implementation;
- all current factory CLI, workflow, boundary, lineage, stage, marker, package, history and worktree code;
- all three V4 setup files.

Do not modify the V4 contract/state/prompt after implementation begins.

## Phase 2 — immutable diff boundary

Before editing, prove that no prior governance, validation, correction, pilot, real task, production or canonical layer is in the allowed write set.

Allowed edits are only those explicitly authorized by Issue #60:

- trusted enforcement workflow/bootstrap paths required by V4;
- `research-ops/factory-v1-1/bin/**`;
- `research-ops/factory-v1-1/lib/**`;
- `research-ops/factory-v1-1/fixtures/**`;
- `research-ops/factory-v1-1/schemas/**` when required;
- `research-ops/factory-v1-1/README.md`;
- exactly two V4 result files.

No other path may change.

## Phase 3 — implement V4-C1: role-specific capabilities

Create an explicit, deterministic capability model.

At minimum each governed task record must include:

- exact task ID;
- role: implementation, correction, validation or closeout;
- exact issue/PR identity where known;
- exact head/base branches and approved base SHA;
- exact allowed paths or exact allowed files;
- immutable setup files;
- exact result file inventory.

Required behavior:

- validation role may create only its exact two result files;
- validation role cannot modify workflow, bootstrap, `bin`, `lib`, fixtures, schemas, templates, README or lineage;
- correction role may modify only explicitly enumerated implementation files plus exactly two result files;
- closeout role may create only exact closeout files;
- arbitrary third files and setup-file mutation fail.

Do not use a whole-directory prefix as the only authorization rule.

## Phase 4 — implement V4-C2: trusted enforcement root

A PR must not validate itself with policy code it can weaken.

Choose and document a safe architecture. The preferred design is a base/default-branch trusted bootstrap or equivalent immutable enforcement root.

Hard requirements:

- the enforcement workflow/bootstrap used for a PR run cannot come solely from mutable PR-head code;
- never execute untrusted head scripts with elevated credentials;
- permissions remain read-only;
- head files are treated as data;
- a PR modifying workflow, bootstrap, boundary, lineage or capabilities cannot grant itself permission;
- workflow/policy changes are allowed only for an owner-governed implementation/correction role and are validated using the prior trusted policy.

If using `pull_request_target`, never execute checked-out head code and keep token permissions read-only. If using another design, prove equivalent isolation.

Add extracted deterministic tests for self-modification attempts.

## Phase 5 — implement V4-C3 and V4-C4: governed records, ancestry and no preauthorization

Replace mutable branch-name-only authorization with owner-created governed task records.

Required fields and validation:

- exact task ID and role;
- issue/PR identity;
- exact head and base branch;
- approved base SHA;
- allowed files/capabilities;
- owner-created receipt/record identity and timestamp;
- record must exist on the approved base before the task head changes;
- task head may not create or modify its own governing record;
- no duplicate, stale or future-task records;
- head commit must descend from approved base SHA;
- trusted base SHA must correspond to the approved stack lineage;
- force-moved or unrelated history fails.

Explicitly reconcile the V3 recovery range:

`69d8d564ebe1b5f277fe771a3e7769020522bd60..9352e59e168c2b084491c829579bf3e4fb187480`

It must contain exactly two commits and zero tree changes.

Do not preauthorize Validation 017 merely by adding its branch to mutable implementation code. Its future setup must be owner-created separately after V4 completes.

## Phase 6 — implement V4-C5: canonical skeleton bytes

The initial research task skeleton must match deterministic generated content, not only filenames.

Required:

- canonical rendering function for every generated setup file;
- exact bytes or SHA-256 comparison after deterministic identity substitution;
- canonical modes and regular-file checks;
- `.gitkeep` exact empty bytes where applicable;
- prompt/contracts retain official-source-first, evidence-first, no-production, no-deploy and authorization-false constraints;
- GITHUB_PLAN remains one branch, one draft PR to `main`, autoMerge false;
- reject same-filename content substitution, added production language, removed safety language, symlink, hardlink, executable or hidden payload.

Preserve legitimate deterministic country/exchange/task substitutions.

## Phase 7 — implement V4-C6: real merge proof

Strengthen merged-to-main validation using read-only Git facts.

Require:

- non-zero 40-hex commit SHA;
- commit object exists;
- commit is reachable from target `main`;
- target branch exactly `main`;
- exact governed task tree exists at that commit and current `main` as required by the record;
- merge record links to exact owner receipt by immutable hash or exact receipt ID;
- receipt validates for this task only and predates merge;
- fabricated, all-zero, unrelated and non-main-reachable commits fail.

Use fixed-argument Git subprocess calls only. No shell interpolation and no Git writes.

## Phase 8 — implement V4-C7: event, checkout and workspace integrity

Before running boundary validation require:

- checked-out `HEAD` equals trusted event head SHA whenever head content is inspected;
- resolved worktree root equals normalized `GITHUB_WORKSPACE`;
- trusted base/head commit objects exist;
- head descends from approved base;
- computed diff is exactly approved base SHA to trusted head SHA;
- shallow or missing objects fail;
- base/head branch metadata agrees with the governed task record;
- no-op recovery commits require explicit identical-tree reconciliation;
- PR-head workflow/policy changes cannot change the enforcement root used in the same run.

## Phase 9 — tests

Retain all 145 prior fixtures and add complete V4 coverage.

Mandatory independent tests:

1. validation role tries to modify `lib/boundary.mjs`;
2. validation role adds an arbitrary third result file;
3. PR weakens its own workflow/bootstrap/boundary/lineage;
4. same branch names with unrelated commit ancestry;
5. future branch without owner governance;
6. task tries to create or modify its own governing record;
7. exact skeleton filenames with unsafe altered bytes;
8. removed no-production/official-source constraints;
9. unexpected mode, symlink, hardlink or executable skeleton file;
10. all-zero, nonexistent, unrelated and non-main-reachable merge SHAs;
11. receipt hash/ID mismatch and postdated receipt;
12. checked-out HEAD != event head SHA;
13. workspace != resolved worktree root;
14. missing/shallow commit objects;
15. V3 two-commit zero-tree-diff recovery reconciliation;
16. all authorization flags remain false.

Run:

- `node --check` on every factory `.mjs`;
- complete fixture suite;
- direct CLI create/validate/status/boundary smoke;
- `git diff --check`.

## Phase 10 — acceptance policy

Create a clear V4 outcome:

- `CORRECTED_READY_FOR_FINAL_ACCEPTANCE_VALIDATION`, or
- `CORRECTION_V4_BLOCKED`.

Only critical disqualifiers are in scope. Record D/H/K as accepted backlog limitations, not triggers for V5.

## Phase 11 — write exactly two result files

Create only:

- `research-ops/factory-v1-1/correction-v4-016/CORRECTION_V4_RESULT.json`
- `research-ops/factory-v1-1/correction-v4-016/CORRECTION_V4_RESULT.md`

JSON must include:

- exact initial and final commits;
- all seven correction verdicts;
- changed-file inventory;
- trusted enforcement design;
- task capability model;
- ancestry/governance model;
- skeleton-byte validation;
- merge-proof validation;
- checkout/event integrity;
- syntax/fixture/smoke counts;
- accepted D/H/K backlog limitations;
- all-false authorization matrix;
- next task `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-FINAL-ACCEPTANCE-VALIDATION-017`.

## Phase 12 — self-validation and delivery

Require:

- result JSON parses;
- `git diff --name-only INITIAL_V4_HEAD` contains only authorized implementation files and the two result files;
- V4 contract/state/prompt unchanged;
- prior layers unchanged;
- `git diff --check` clean;
- `origin/main` and `origin/master` unchanged;
- no Binance task exists.

Commit message:

`fix(researchops): final critical hardening for Factory V1.1`

Push only:

`correction/researchops-factory-v1-1-v4-016`

Do not merge or mark any PR ready.

## Final report

Return:

1. PASS or BLOCKED;
2. frozen initial V4 head;
3. final commit SHA;
4. exact changed-file inventory;
5. V4-C1 through V4-C7 verdicts;
6. trusted enforcement design;
7. final fixture and smoke results;
8. accepted D/H/K limitations;
9. immutable-layer confirmation;
10. all authorizations false;
11. all PRs draft/unmerged;
12. `main`/`master`/production/Binance unchanged;
13. next task.

Stop after the report.
