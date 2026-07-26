# ResearchOps Subscription Factory V1.1 — Correction Contract 010

## Identity

- Task: `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-010`
- Governing Issue: `#47`
- Implementation PR: `#44`
- Implementation head: `02997bb63be39012015486ecf55da707a3738f6b`
- Validation PR: `#46`
- Validation head: `2f95f8a373e21204548e6c61433677d009943b26`
- Validation outcome: `VALIDATED_WITH_CORRECTIONS_REQUIRED`
- Correction branch: `correction/researchops-subscription-factory-v1-1-010`
- Base branch: `validation/researchops-subscription-factory-v1-1-009`

## Objective

Apply all nine corrections required by Validation 009 without redesign, merge, deployment, Binance task creation, or any `main`/`master`/production/canonical mutation.

## Required corrections

1. Wire `--require-package` to `opts.requirePackage`.
2. Enforce state-to-evidence consistency in `validate` using canonical shared logic.
3. Remove fail-open workflow handling for fetch/diff discovery.
4. Reject deleted or absent governed task roots.
5. Wire changed-file and append-only enforcement into CI.
6. Confine canonical CLI task creation below `research-ops/tasks/`; keep OS temp roots library-test-only.
7. Reject nested entries below `20-research-output/`.
8. Reject non-array/null reference fields and non-string references.
9. Enforce minimum task/identity/GitHub-plan/authorization/package structural shapes.

## Required result records

Create:

- `CORRECTION_RESULT.json`
- `CORRECTION_RESULT.md`

inside this directory.

## Mutable implementation paths

- `.github/workflows/cbw-researchops-factory-validate.yml`
- `research-ops/factory-v1-1/bin/**`
- `research-ops/factory-v1-1/lib/**`
- `research-ops/factory-v1-1/fixtures/**`
- `research-ops/factory-v1-1/schemas/**`
- `research-ops/factory-v1-1/README.md`
- `research-ops/factory-v1-1/correction-010/**`

## Immutable paths

Do not modify:

- `research-ops/factory-v1-1/governance/**`
- `research-ops/factory-v1-1/validation-009/**`
- `research-ops-pilot/tasks/**`
- `research-ops/tasks/**`
- `main`
- `master`
- production or canonical data/code/configuration.

## Required next task

On PASS:

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-VALIDATION-011`

No owner merge review is permitted before that independent validation passes.
