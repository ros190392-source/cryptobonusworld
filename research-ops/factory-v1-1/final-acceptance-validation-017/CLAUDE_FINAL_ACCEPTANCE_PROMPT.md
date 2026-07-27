# Claude Code Execution Prompt — ResearchOps Factory V1.1 Final Acceptance 017

## Task

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-FINAL-ACCEPTANCE-VALIDATION-017`

## Repository

`C:\projects\CryptoBonusWorld`

## Governing records

- Issue: `#62`
- Source V4 Issue / PR: `#60 / #61`
- Validation PR: the stacked draft PR for branch `validation/researchops-factory-v1-1-final-acceptance-017`

## Exact source

- approved base branch: `correction/researchops-factory-v1-1-v4-016`
- approved base SHA: `1e7c35526edc9e251d87cbd741ce1cc4acc09293`
- accepted R1 workflow: `30303380262`
- accepted R2 workflow: `30304979987`
- control-plane `main`: `04157b9dfb140918a8569a5026da747b429e5ed3`
- protected `master`: `998fcedd7d9febbec5b130d4765dfeaafc40960b`

## Validation branch and worktree

- branch: `validation/researchops-factory-v1-1-final-acceptance-017`
- isolated worktree: `C:\projects\CryptoBonusWorld-final-acceptance-017`

Do not modify the normal repository working tree.

## Phase 0 — freeze and verify setup

1. `git fetch origin --prune`.
2. Verify the validation branch descends exactly from approved base SHA `1e7c355...`.
3. Record the current remote validation branch tip as `FROZEN_SETUP_HEAD` before any worker/result change.
4. Verify `approved base..FROZEN_SETUP_HEAD` contains only the canonical setup triple:
   - `FINAL_ACCEPTANCE_CONTRACT.md`
   - `FINAL_ACCEPTANCE_STATE.json`
   - `CLAUDE_FINAL_ACCEPTANCE_PROMPT.md`
5. Verify setup files are additions only and the governed state binds the exact task ID, branch, base branch and approved base SHA.
6. Require clean status and an isolated worktree.
7. Stop with `FINAL ACCEPTANCE BASELINE MISMATCH` on any mismatch.

Never reset, force-push or rewrite history.

## Phase 1 — read completely

Read Issue #62, PR #61, all V4 result files, R1/R2 code and workflow, these three setup records, and all critical enforcement modules:

- workflow;
- `bin/researchops.mjs`;
- `lib/bootstrap.mjs`;
- `lib/boundary.mjs`;
- `lib/roles.mjs`;
- `lib/govrecord.mjs`;
- `lib/eventintegrity.mjs`;
- `lib/skeleton.mjs`;
- `lib/mergeproof.mjs`;
- `lib/lineage.mjs`.

Do not accept the V4 report or green workflows as sufficient proof.

## Phase 2 — baseline and immutability

Independently verify:

- PR #61 current head is `1e7c35526edc9e251d87cbd741ce1cc4acc09293`, draft and unmerged;
- R2 diff `c3c6cd1...1e7c355` contains exactly the reported six files;
- runs `30303380262` and `30304979987` are successful with every enforcement step executed;
- all prior governance, validation, correction, pilot, OKX and real `research-ops/tasks/**` records are unchanged;
- `origin/main` and `origin/master` remain frozen;
- all 18 authorizations are false.

## Phase 3 — independent reruns

Execute independently:

- `node --check` on every factory `.mjs`;
- complete fixtures, expected `206 passed / 0 failed`;
- direct CLI create/validate/status/check-boundary smoke;
- `git diff --check`;
- negative controls in isolated temporary Git repositories.

## Phase 4 — final critical gates

### Gate A — real DESCENDANT setup path

This Validation 017 branch must itself prove the generic path:

- base carries V4/R2 policy;
- setup boundary is uniquely discovered;
- enforcement mode is `DESCENDANT`, never `BOOTSTRAP`;
- protected-base policy is executed;
- governed state is read from frozen setup;
- worker diff is frozen setup → trusted head;
- only the two result files are accepted;
- all workflow enforcement steps complete successfully.

### Gate B — no self-authorization

Prove validation role cannot modify implementation, workflow, bootstrap, boundary, lineage, roles, event-integrity, setup records or add a third result file. Head-only authority must fail. Issue #60 / PR #61 bootstrap must not authorize this task.

### Gate C — identity/ancestry/checkout

Prove exact head checkout, root/workspace equality, non-shallow repository, object existence, approved-base ancestry, unique frozen setup, and exact diff endpoints. Wrong/reused/unrelated identities must fail.

### Gate D — canonical skeleton

Re-test exact skeleton filenames and bytes, safety text, modes, symlink and unsafe same-name substitution rejection.

### Gate E — real merge proof

Re-test all-zero, nonexistent, unrelated, non-main-reachable and receipt-mismatched merge records. Only repository-backed, main-reachable, task-scoped proof may pass.

### Gate F — authorization and production isolation

Prove no merge/import/production/activation/deploy/Binance/master authority exists. Accepted D/H/K backlog items are not blockers unless they yield such a critical escape.

## Decision

Use exactly one:

- `VALIDATED_FOR_OWNER_CLOSEOUT`
- `FINAL_ACCEPTANCE_BLOCKED`

Do not use `VALIDATED_WITH_CORRECTIONS_REQUIRED`.
Do not create or propose V5.
Do not repair implementation during validation.

## Write exactly two files

Create only:

- `research-ops/factory-v1-1/final-acceptance-validation-017/FACTORY_FINAL_ACCEPTANCE.json`
- `research-ops/factory-v1-1/final-acceptance-validation-017/FACTORY_FINAL_ACCEPTANCE.md`

The JSON must include:

- setup and source identities;
- baseline/diff/immutability proof;
- R1/R2 evidence;
- syntax, fixture and smoke results;
- Gate A–F matrix;
- actual Validation 017 workflow run id and every step status;
- blocking findings;
- accepted D/H/K backlog notes;
- final decision and next task;
- complete all-false authorization matrix.

Do not modify these three setup files.

## Self-validation before commit

Require:

- JSON parses;
- `git diff --name-only FROZEN_SETUP_HEAD` contains exactly the two result files;
- `git diff --check` is clean;
- no implementation or prior record changed;
- all authorizations remain false.

## Commit and push

Commit message:

`validate(researchops): final acceptance for Factory V1.1`

Push only:

`validation/researchops-factory-v1-1-final-acceptance-017`

Wait for the actual GitHub factory workflow on the final commit. The final report cannot claim acceptance unless:

- conclusion is `success`;
- workflow reports DESCENDANT protected-base enforcement;
- setup boundary resolution succeeds;
- boundary and task-root steps execute and succeed.

Do not merge or mark any PR ready. Do not modify `main` or `master`. Do not deploy. Do not create Binance.

## Final report

Return:

1. PASS or BLOCKED execution result;
2. frozen setup HEAD;
3. final validation commit SHA;
4. exact two files created;
5. final decision;
6. R2 source diff and immutability verification;
7. node-check, fixture and smoke results;
8. Gate A–F verdicts;
9. actual Validation 017 workflow run id and full step results;
10. blocking findings;
11. accepted D/H/K backlog notes;
12. owner-closeout readiness judgment;
13. next task;
14. all authorizations false confirmation;
15. all PRs draft/unmerged confirmation;
16. `main`/`master`/production/Binance unchanged confirmation.

Stop after the report.
