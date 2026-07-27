# Claude Code Execution Prompt — ResearchOps Factory Correction V3 014

## Task

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V3-014`

## Repository

`C:\projects\CryptoBonusWorld`

## Exact source refs

- correction branch: `correction/researchops-factory-v1-1-v3-014`
- source validation branch: `validation/researchops-factory-v1-1-v2-013`
- exact source validation commit: `acd83d1d4e854db26ec1054b03c6e9cfd42bd2da`
- source Correction V2 commit: `d3ed1128497cf682863c438d47eb65d26ebb536b`
- control-plane `main`: `04157b9dfb140918a8569a5026da747b429e5ed3`
- protected `master`: `998fcedd7d9febbec5b130d4765dfeaafc40960b`

## GitHub

- governing Issue: #56
- source Validation PR: #55
- Correction V3 PR: stacked draft targeting `validation/researchops-factory-v1-1-v2-013`

## Isolated worktree

Use only:

`C:\projects\CryptoBonusWorld-correction-v3-014`

Do not modify the current repository working tree.

## Phase 0 — baseline

1. Run `git fetch origin --prune`.
2. Verify all exact source refs above.
3. Resolve the current remote head of `origin/correction/researchops-factory-v1-1-v3-014`; freeze it as `INITIAL_CORRECTION_V3_HEAD`.
4. Require that the diff from source validation commit to `INITIAL_CORRECTION_V3_HEAD` contains exactly:
   - `CORRECTION_V3_CONTRACT.md`
   - `CORRECTION_V3_STATE.json`
   - `CLAUDE_CORRECTION_V3_PROMPT.md`
5. Create or safely reuse the isolated worktree on the correction branch.
6. Require clean status and exact frozen head.
7. Stop with `CORRECTION V3 BASELINE MISMATCH` on any mismatch.

Never reset, force-push, rewrite history, modify `main`/`master`, or delete another worktree.

## Phase 1 — read completely

Read Issue #56, PR #55, Validation 013 result files, Correction V2 result files, this contract/state/prompt, and all implementation files affected by the findings.

## Phase 2 — immutable boundaries

Verify before editing:

- prior `governance/**`, `validation-009/**`, `correction-010/**`, `correction-validation-011/**`, `correction-v2-012/**`, `correction-v2-validation-013/**`, `research-ops-pilot/**` and real `research-ops/tasks/**` are untouched;
- `origin/main` and `origin/master` match the frozen SHAs;
- PRs remain draft/unmerged;
- all authorizations remain false.

## Phase 3 — implement V3-C1 through V3-C12

Apply every correction in Issue #56. Do not omit or weaken any requirement.

Mandatory design expectations:

- canonical create binds to the factory script's own resolved worktree and rejects foreign-worktree execution;
- factory mode uses an exact governed lineage, not a broad prefix regex;
- research mode binds trusted PR head to internal task branch/plan;
- current task-specific factory write boundary freezes every prior governance/history layer and protects the workflow from deletion/rename;
- initial task creation equals the exact deterministic skeleton;
- every stage has an exact permitted inventory and all marker candidates are validated;
- marker outcomes are controlled enums and merge records require exact `main` target, task ID, 40-hex SHA and receipt linkage;
- correction history is cumulative when used;
- TASK_STATE history is structurally valid and append-only across trusted base/head blobs;
- Git status parsing is unambiguous and score-bounded 0–100;
- research JSON minima are non-vacuous and collection records are objects;
- canonical text rejects NUL and forbidden control bytes.

Use Node built-ins only. Keep CI read-only.

## Phase 4 — tests

Retain all existing 108 fixtures and add deterministic coverage for every V3 correction from Issue #56.

Run:

- `node --check` on every factory `.mjs`;
- the complete fixture suite;
- direct CLI create/validate/status/check-boundary smoke tests;
- real temporary Git repositories/worktrees for foreign-worktree, branch lineage, base/head history and stage probes;
- `git diff --check`.

Do not create a real Binance task or tracked task under `research-ops/tasks/**`.

## Phase 5 — workflow

Verify the corrected workflow remains:

- `permissions: contents: read`;
- `persist-credentials: false`;
- Node 20, bounded timeout;
- no AI call, issue/branch/PR creation, merge, deploy or `master` mutation;
- exact trusted lineage metadata passed fail-closed.

## Phase 6 — write result records

Create exactly:

- `research-ops/factory-v1-1/correction-v3-014/CORRECTION_V3_RESULT.json`
- `research-ops/factory-v1-1/correction-v3-014/CORRECTION_V3_RESULT.md`

The JSON must include:

- task/source identity and frozen initial head;
- exact changed-file inventory;
- V3-C1–V3-C12 matrix;
- fixture and CLI results;
- workflow result;
- immutability verification;
- remaining limitations;
- correction outcome;
- next task `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V3-VALIDATION-015`;
- full all-false authorization matrix.

Do not modify the three existing Correction V3 governance files.

## Phase 7 — self-validation

Require:

- result JSON parses;
- diff from `INITIAL_CORRECTION_V3_HEAD` contains only authorized implementation/workflow files plus exactly the two result files;
- all prior immutable layers have zero diff;
- `git diff --check` clean;
- no real task, production, `main` or `master` mutation.

## Phase 8 — commit and push

Commit only authorized files.

Commit message:

`fix(researchops): harden Factory V1.1 correction v3`

Push only:

`correction/researchops-factory-v1-1-v3-014`

Do not merge or mark any PR ready. Do not deploy. Do not create Binance.

## Final report

Return:

1. PASS or BLOCKED execution result;
2. frozen initial Correction V3 HEAD;
3. final correction commit SHA;
4. exact changed-file inventory;
5. V3-C1–V3-C12 results;
6. final fixture counts;
7. direct CLI/adversarial smoke results;
8. workflow result;
9. history/stage/factory-boundary result;
10. package/marker/text result;
11. remaining limitations;
12. correction outcome and next task;
13. prior-record immutability;
14. all authorizations false;
15. PR status;
16. `main`/`master`/production/Binance unchanged.

Stop after the report.
