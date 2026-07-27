# ResearchOps Subscription Factory V1.1 — Correction V2 Contract

## Identity

- Task: `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V2-012`
- Governing Issue: #52
- Source validation task: `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-VALIDATION-011`
- Source validation commit: `a958f0c7d7ce2d707e4d79e5eafdd984fc851d2d`
- Source correction commit: `2b9fecd8540070c92f1d1ba382ba05b64597a7e6`
- Target branch: `correction/researchops-factory-v1-1-v2-012`
- Target PR base: `validation/researchops-factory-v1-1-correction-011`
- Control-plane baseline: `main@04157b9dfb140918a8569a5026da747b429e5ed3`
- Protected production authority: `master@998fcedd7d9febbec5b130d4765dfeaafc40960b`

## Objective

Apply exactly the ten required corrections from Issue #52 and Correction Validation 011. Preserve all successful behavior from Correction 010, the one-branch/one-draft-PR architecture, dependency-free Node 20 ESM execution, read-only CI, and the all-false production/activation authorization boundary.

## Required corrections

1. Resolve the real Git worktree root and fail closed outside it.
2. Strictly parse and validate both source and destination of rename/copy name-status records.
3. Bind research-task versus factory-governance mode to trusted PR/branch metadata.
4. Restrict workflow changes to the factory validation workflow only.
5. Enforce stage-aware append-only transitions from trusted base/head Git state.
6. Fully cross-bind TASK_STATE and GITHUB_PLAN branch/head/base/task identity.
7. Enforce safe grammar/types for country, exchange, batch, priority and branch identity.
8. Validate governed top-level structures for all nine research JSON files.
9. Reject invalid UTF-8 bytes before text/JSON parsing.
10. Require parseable, regular, identity-bound cumulative stage markers and exact owner/merge records.

Issue #52 is the authoritative detailed specification and required test matrix.

## Write boundary

May modify only:

- `.github/workflows/cbw-researchops-factory-validate.yml`;
- `research-ops/factory-v1-1/bin/**`;
- `research-ops/factory-v1-1/lib/**`;
- `research-ops/factory-v1-1/fixtures/**`;
- `research-ops/factory-v1-1/schemas/**` when required;
- `research-ops/factory-v1-1/README.md`;
- `research-ops/factory-v1-1/correction-v2-012/**`.

All prior governance, validation, correction, OKX records and real research tasks are immutable.

## Required result records

Create exactly:

- `research-ops/factory-v1-1/correction-v2-012/CORRECTION_V2_RESULT.json`
- `research-ops/factory-v1-1/correction-v2-012/CORRECTION_V2_RESULT.md`

## Hard prohibitions

- no merge;
- no `main` or `master` mutation;
- no production/canonical/import/ranking/CTA/promo/affiliate/publication/sitemap/indexability/MIGRATION_5/deploy action;
- no real Binance task, branch, issue or PR;
- no third-party runtime dependency;
- no force-push, reset or history rewrite.

## Completion state

On PASS, recommend only:

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V2-VALIDATION-013`
