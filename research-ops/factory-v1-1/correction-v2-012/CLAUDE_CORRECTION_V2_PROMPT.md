# Claude Code Execution Prompt — ResearchOps Factory Correction V2 012

## Task

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V2-012`

## Role

Governed corrective implementation executor and security hardening engineer.

## Fixed repository identity

- Repository: `C:\projects\CryptoBonusWorld`
- Target branch: `correction/researchops-factory-v1-1-v2-012`
- Expected initial branch head: resolve from `origin/correction/researchops-factory-v1-1-v2-012` and require it to equal the branch tip containing this prompt.
- Exact source validation commit: `a958f0c7d7ce2d707e4d79e5eafdd984fc851d2d`
- Source validation PR: #51
- Governing Issue: #52
- Target correction PR: created separately by owner setup
- Protected `main`: `04157b9dfb140918a8569a5026da747b429e5ed3`
- Protected `master`: `998fcedd7d9febbec5b130d4765dfeaafc40960b`
- Isolated worktree: `C:\projects\CryptoBonusWorld-researchops-factory-correction-v2-012`

## Phase 0 — safety verification

Do not modify the current worktree.

Run and report:

```text
git status --short
git branch --show-current
git rev-parse HEAD
git remote -v
git worktree list
git fetch origin --prune
```

Require:

```text
origin/validation/researchops-factory-v1-1-correction-011
= a958f0c7d7ce2d707e4d79e5eafdd984fc851d2d
```

Resolve `origin/correction/researchops-factory-v1-1-v2-012` and freeze its current SHA as the initial correction head. If the branch is not based on the exact source validation commit, stop with:

`CORRECTION V2 BASELINE MISMATCH`

Create or safely reuse the isolated worktree for the target branch. Do not delete or overwrite another worktree automatically.

All work must occur only in the isolated worktree. Require a clean worktree and the exact target branch.

Never reset, force-push, rewrite history, modify `main`/`master`, or deploy.

## Phase 1 — read all governed material

Read completely:

- GitHub Issue #52;
- PR #51 and its final validation commit;
- `research-ops/factory-v1-1/correction-validation-011/FACTORY_CORRECTION_VALIDATION.json`;
- `research-ops/factory-v1-1/correction-validation-011/FACTORY_CORRECTION_VALIDATION.md`;
- this prompt;
- `CORRECTION_V2_CONTRACT.md`;
- `CORRECTION_V2_STATE.json`;
- the complete current factory implementation and workflow;
- prior Correction 010 result and Validation 009 record for regression context.

Do not begin edits before all required material is read.

## Phase 2 — apply exactly ten corrections

Implement every detailed requirement in Issue #52:

1. Real Git worktree-root confinement for canonical `create`.
2. Strict source-and-destination rename/copy status parsing.
3. Trusted PR/change-mode identity binding.
4. Exact factory workflow allowlist.
5. Stage-aware append-only enforcement using trusted base/head Git state.
6. Full TASK_STATE/GITHUB_PLAN branch and PR cross-binding.
7. Identity field grammar and type enforcement.
8. Governed top-level structures for all nine research JSON files.
9. Fatal invalid-UTF-8 detection for all package files.
10. Parseable, regular, identity-bound cumulative higher-stage evidence.

Preserve every previously passing C1–C9 behavior and authorization safeguard.

Use Node 20 ESM and built-in modules only. Do not add third-party dependencies or copy a production package manifest from `master`.

## Phase 3 — workflow hardening

The workflow must remain read-only and must pass trusted GitHub event metadata to the boundary validator:

- base SHA;
- head SHA;
- head branch;
- base branch;
- repository context required to distinguish factory-governance from research-task mode.

The validator must inspect trusted base/head Git blobs for stage transitions and cannot rely only on the checked-out head tree or untrusted repository files to decide PR mode.

Only this workflow path may change:

`.github/workflows/cbw-researchops-factory-validate.yml`

Do not authorize unrelated workflows.

## Phase 4 — tests

Retain all existing tests and add deterministic coverage for every correction and bypass described in Issue #52.

At minimum execute:

```text
node --check <every factory .mjs>
node research-ops/factory-v1-1/fixtures/run.mjs
git diff --check
```

Also execute direct CLI probes for:

- create from repository root;
- create from repository subdirectory;
- create by absolute script path from external CWD — must fail and create nothing;
- strict name-status parsing including R/C source+destination;
- trusted factory and research-task PR mode mismatch;
- unrelated workflow rejection;
- stage-aware closed-stage mutation/deletion/rename;
- all plan cross-bind mismatches;
- malformed identity grammar;
- wrong top-level shape for each of nine research JSON files with valid MANIFEST;
- invalid UTF-8 in JSON and Markdown with recomputed MANIFEST;
- zero-byte/malformed/wrong-task stage markers;
- valid cumulative stage evidence;
- owner-receipt privilege escalation.

No real Binance task may be created. All task-generation tests must use disposable fixtures or temporary test repositories/worktrees.

## Phase 5 — write boundary

May modify only:

- `.github/workflows/cbw-researchops-factory-validate.yml`;
- `research-ops/factory-v1-1/bin/**`;
- `research-ops/factory-v1-1/lib/**`;
- `research-ops/factory-v1-1/fixtures/**`;
- `research-ops/factory-v1-1/schemas/**` when required;
- `research-ops/factory-v1-1/README.md`;
- `research-ops/factory-v1-1/correction-v2-012/**`.

Do not modify any previous governance, validation, correction, OKX, production, canonical or real task record.

Create exactly these result records:

- `research-ops/factory-v1-1/correction-v2-012/CORRECTION_V2_RESULT.json`
- `research-ops/factory-v1-1/correction-v2-012/CORRECTION_V2_RESULT.md`

Do not modify the contract, state or prompt files created before implementation.

## Phase 6 — self-validation and commit

Compare against the frozen initial correction head. Require every changed path to fit the allowed boundary.

Validate result JSON parsing and ensure all authorizations remain false.

Commit only governed changes with message:

`fix(researchops): harden factory boundaries v2`

Push only:

`git push origin correction/researchops-factory-v1-1-v2-012`

Do not merge or mark any PR ready.

## Final report

Return:

1. PASS or BLOCKED;
2. frozen initial correction head;
3. final correction commit SHA;
4. exact changed-file inventory;
5. result for V2-C1 through V2-C10;
6. final fixture pass/fail count;
7. direct CLI and adversarial smoke results;
8. workflow metadata/boundary result;
9. stage-aware append-only result;
10. path/worktree-root result;
11. rename/copy result;
12. plan and identity result;
13. all-nine-JSON structural result;
14. UTF-8 result;
15. higher-stage evidence result;
16. remaining limitations;
17. correction outcome and next task;
18. confirmation prior records are unchanged;
19. confirmation all authorizations remain false;
20. confirmation all PRs remain draft/unmerged;
21. confirmation `main`, `master`, production and Binance were not modified.

Stop after the final report.
