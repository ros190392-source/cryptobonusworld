# ResearchOps Factory V1.1 — Correction V3 Contract

## Identity

- Task: `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V3-014`
- Governing Issue: #56
- Source Validation PR: #55
- Source validation commit: `acd83d1d4e854db26ec1054b03c6e9cfd42bd2da`
- Branch: `correction/researchops-factory-v1-1-v3-014`
- Base: `validation/researchops-factory-v1-1-v2-013`

## Objective

Apply exactly V3-C1 through V3-C12 from Issue #56. Preserve all previously passing behavior and close the twelve independently reproduced gaps from Validation 013.

## Required corrections

1. Bind canonical `create` to the worktree containing the factory script; reject foreign-worktree execution.
2. Replace broad factory branch-prefix trust with exact governed lineage.
3. Bind trusted research PR head branch to the task's internal plan and identity.
4. Freeze completed factory governance/history layers and reject workflow deletion/rename.
5. Require the exact deterministic initial task skeleton.
6. Require exact per-stage inventories and reject duplicate/conflicting markers.
7. Enforce controlled marker outcomes and identity-linked 40-hex merge records targeting `main`.
8. Require correction evidence when task history uses the correction path.
9. Validate and compare `TASK_STATE.history` append-only across trusted base/head blobs.
10. Enforce strict Git name-status grammar and R/C score range 0–100.
11. Reject vacuous package objects and primitive collection entries.
12. Reject disallowed NUL/C0/C1 control bytes in canonical package text.

## Regression requirements

- Keep all 108 existing fixtures green.
- Add deterministic positive and negative coverage for every V3 correction.
- Run direct CLI create/validate/status/check-boundary smoke tests.
- Run `node --check` on every factory `.mjs` and `git diff --check`.
- Inspect the factory workflow behavior and retain read-only permissions.

## Write boundary

May modify only:

- `.github/workflows/cbw-researchops-factory-validate.yml`
- `research-ops/factory-v1-1/bin/**`
- `research-ops/factory-v1-1/lib/**`
- `research-ops/factory-v1-1/fixtures/**`
- `research-ops/factory-v1-1/schemas/**` when required
- `research-ops/factory-v1-1/README.md`
- `research-ops/factory-v1-1/correction-v3-014/**`

Every prior governance, validation, correction and OKX record is immutable. Real `research-ops/tasks/**`, `main`, `master`, production and canonical data are forbidden.

## Required outputs

Create exactly:

- `CORRECTION_V3_RESULT.json`
- `CORRECTION_V3_RESULT.md`

The result must record all twelve corrections, exact changed files, tests, workflow result, remaining limitations, an all-false authorization matrix and next task `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V3-VALIDATION-015`.

## Safety

No merge, no deploy, no Binance task, no canonical import and no production activation. All merge/import/production/activation authorizations remain false.
