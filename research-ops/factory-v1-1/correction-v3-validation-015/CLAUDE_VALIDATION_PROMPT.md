# Claude Code Execution Prompt — Correction V3 Validation 015

## Task

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V3-VALIDATION-015`

## Repository

`C:\projects\CryptoBonusWorld`

## GitHub

- Governing Issue: #58
- Source Correction V3 PR: #57
- Validation PR: resolve after setup; expected head branch `validation/researchops-factory-v1-1-v3-015`

## Exact source identities

- authoritative Correction V3 implementation commit: `69d8d564ebe1b5f277fe771a3e7769020522bd60`
- source branch recovery tip: `9352e59e168c2b084491c829579bf3e4fb187480`
- source branch: `correction/researchops-factory-v1-1-v3-014`
- source Validation 013 commit: `acd83d1d4e854db26ec1054b03c6e9cfd42bd2da`
- control-plane `main`: `04157b9dfb140918a8569a5026da747b429e5ed3`
- protected `master`: `998fcedd7d9febbec5b130d4765dfeaafc40960b`

## Worktree

Use only:

`C:\projects\CryptoBonusWorld-validation-factory-v3-015`

Do not modify the current repository working tree.

## Phase 0 — baseline and recovery

1. Run `git fetch origin --prune`.
2. Resolve the validation PR and its current remote head after setup. Freeze that SHA as the initial validation HEAD.
3. Verify the validation branch is based on source recovery tip `9352e59e...`.
4. Verify `69d8d564...9352e59e` contains exactly two recovery commits and zero changed files.
5. Verify the trees of `69d8d564...` and `9352e59e...` are identical.
6. Verify PR #57 remains draft/unmerged and document its current head separately from the authoritative implementation commit.
7. Verify `origin/main` and `origin/master` exact SHAs.
8. Stop with `VALIDATION BASELINE MISMATCH` on any mismatch.

Never reset, force-push, rewrite history, merge, deploy, or modify `main`/`master`.

## Phase 1 — read completely

Read Issue #58 in full, PR #57, Correction V3 result JSON/Markdown, prior Validation 013, all modified implementation files, and all three files in this validation directory.

## Phase 2 — independent diff and immutability

Verify independently:

- `78c56177...69d8d564` contains exactly the reported 17 Correction V3 files;
- the recovery range contains zero files;
- all prior governance, validation, correction, pilot, real task, production and canonical records are unchanged;
- all authorization flags remain false.

## Phase 3 — reruns

Execute independently:

- `node --check` on every factory `.mjs`;
- full fixture suite, expected `145 passed / 0 failed`;
- direct CLI create/validate/status/check-boundary smoke;
- `git diff --check`;
- actual GitHub Actions workflow-run inspection for the authoritative implementation and recovery tips.

Do not treat the correction report or green workflow as independent evidence.

## Phase 4 — V3-C1 through V3-C12

Execute positive and negative probes for every Correction V3 item in Issue #56. Record an individual verdict for every item.

## Phase 5 — mandatory probes A–N

Execute every probe A–N in Issue #58 separately. Do not collapse them into narrative-only conclusions.

Mandatory emphasis:

- validation-role versus correction-role write capabilities;
- self-modifying workflow/lineage/boundary behavior;
- exact commit ancestry rather than branch-name identity;
- current setup contract/state/prompt immutability;
- future lineage preauthorization;
- exact skeleton bytes and safety content;
- complete transition state/history/artifact combinations;
- protocol compatibility of controlled marker enums;
- repository existence/reachability of merge commits and exact receipt linkage;
- strict owner receipt lifecycle;
- real NUL-delimited Git output from temporary repositories;
- Windows path, reparse-point and linked-worktree behavior;
- checkout HEAD versus trusted GitHub event SHA.

Use OS temporary directories and temporary Git repositories for destructive probes. Never create a tracked real task or Binance task.

## Phase 6 — decision

Use exactly one:

- `VALIDATED_FOR_OWNER_MERGE_REVIEW`
- `VALIDATED_WITH_CORRECTIONS_REQUIRED`
- `VALIDATION_BLOCKED`

A clean pass is forbidden if any Issue #58 disqualifier is reproducible.

## Phase 7 — create exactly two files

Create only:

- `research-ops/factory-v1-1/correction-v3-validation-015/FACTORY_CORRECTION_V3_VALIDATION.json`
- `research-ops/factory-v1-1/correction-v3-validation-015/FACTORY_CORRECTION_V3_VALIDATION.md`

The JSON must contain:

- authoritative implementation commit;
- recovery lineage verification;
- initial validation HEAD;
- baseline/diff/immutability results;
- syntax and fixture reruns;
- V3-C1–V3-C12 matrix;
- A–N matrix;
- workflow result;
- blocking findings;
- correction-required findings;
- nonblocking notes;
- validation outcome;
- required corrections;
- next task;
- complete all-false authorization matrix.

Do not modify the three setup files or any implementation/prior record.

## Phase 8 — self-validation

Require:

- JSON parses;
- diff from frozen initial validation HEAD contains exactly the two result files;
- `git diff --check` clean;
- no setup, implementation or prior record changed.

## Phase 9 — commit and push

Commit only the two result files.

Commit message:

`validate(researchops): verify Factory V1.1 Correction V3`

Push only:

`validation/researchops-factory-v1-1-v3-015`

Do not merge or mark any PR ready. Do not deploy. Do not create Binance.

## Final report

Return:

1. PASS or BLOCKED execution result;
2. frozen initial validation HEAD;
3. final validation commit SHA;
4. exact two files created;
5. validation outcome;
6. Correction V3 diff verification;
7. recovery lineage verification;
8. immutability result;
9. syntax and fixture counts;
10. V3-C1–V3-C12 verdicts;
11. A–N verdicts;
12. workflow result;
13. blocking findings;
14. correction-required findings;
15. nonblocking notes;
16. merge-readiness judgment;
17. next task;
18. all authorizations false confirmation;
19. PR statuses;
20. `main`/`master`/production/Binance unchanged confirmation.

Stop after the report.
