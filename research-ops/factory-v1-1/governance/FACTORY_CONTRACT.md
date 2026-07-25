# ResearchOps Subscription Factory V1.1 — Build Contract

## Identity

- Task ID: `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-008`
- Governing issue: `#43`
- Project: `CryptoBonusWorld`
- Target branch: `main`
- Authorized baseline: `04157b9dfb140918a8569a5026da747b429e5ed3`
- Implementation branch: `feat/researchops-subscription-factory-v1-1`
- Production-authority branch: `master`
- Expected protected master head: `998fcedd7d9febbec5b130d4765dfeaafc40960b`

## Goal

Build a deterministic, dependency-free ResearchOps factory for ChatGPT subscription Deep Research. Each country × exchange investigation must use one append-only task branch and one draft PR to control-plane `main`.

## Mandatory foundation rule

Audit the exact `main` checkout before designing the execution surface. A root `package.json` was not available through the owner-side GitHub read path. The canonical CLI must therefore run directly with Node 20 ESM and built-in modules. Existing npm aliases may be added only if a compatible package manifest actually exists in the checked-out `main` tree.

Do not copy a package manifest or application code from `master` merely to support npm aliases.

## Required implementation roots

Implementation may create or modify only:

- `research-ops/factory-v1-1/**`
- factory-specific files under `.github/workflows/**`
- a pre-existing root `package.json` on `main`, only for additive aliases

Do not modify completed records under `research-ops-pilot/tasks/**`.

## Factory contract

The factory must provide:

1. a standalone `researchops.mjs` CLI with `create`, `validate`, and `status`;
2. deterministic task templates and schemas;
3. one-branch / one-draft-PR task metadata;
4. append-only stage directories;
5. exact eleven-file research-package validation;
6. state transition validation;
7. immutable-stage and changed-file-boundary validation;
8. owner receipt validation;
9. a read-only, fail-closed PR validation workflow;
10. deterministic Node-built-in fixtures.

## Canonical task layout

```text
research-ops/tasks/<TASK_ID>/
  00-contract/
  10-input/
  20-research-output/
  50-source-truth-review/
  60-correction/
  70-validation/
  80-closeout/
  TASK_STATE.json
```

## Canonical states

- `PREPARED`
- `RESEARCH_CAPTURED`
- `PACKAGE_VALIDATED`
- `SOURCE_TRUTH_REVIEWED`
- `CORRECTION_REQUIRED`
- `CORRECTED`
- `VALIDATED`
- `OWNER_CLOSEOUT_REQUIRED`
- `RESEARCH_RECORD_MERGE_AUTHORIZED`
- `RESEARCH_RECORD_MERGED_TO_MAIN`
- `BLOCKED`

Transitions must be explicit and fail closed.

## Required research inventory

1. `research-run.json`
2. `source-verification.json`
3. `claim-verdicts.json`
4. `conflict-resolution.json`
5. `product-availability.json`
6. `payment-rails.json`
7. `offer-eligibility-review.json`
8. `schema-normalization-notes.json`
9. `import-readiness.json`
10. `source-truth-review-report.md`
11. `MANIFEST.txt`

## Authorization floor

Every generated task starts with all canonical, production, activation, publication and deploy authorizations false.

An exact owner receipt may authorize only research-record merge to `main`. It may never implicitly authorize:

- research/staging/canonical import;
- `master` changes;
- production change or binding;
- ranking;
- CTA;
- promo;
- affiliate route;
- publication;
- sitemap;
- indexability;
- MIGRATION_5;
- deploy.

## GitHub workflow boundary

The pull-request validation workflow must use read-only permissions, invoke no AI API, perform no merge, perform no deploy, and fail closed on malformed state, invalid package content or authorization escalation.

A manual task-creation workflow is optional. If implemented, it must be owner-dispatched, create-only, target `main`, create a draft PR, and stop before merge.

## Test floor

Fixtures must cover all scenarios listed in Issue #43, including duplicate task refusal, path traversal, invalid transition, package inventory errors, JSON/hash/reference failures, immutable-stage mutation, forbidden authorizations, and valid/invalid owner receipts.

## Pilot boundary

Do not create or run `CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001` during this task. Binance is a separate owner-authorized pilot after factory validation.

## Delivery boundary

- isolated worktree;
- implementation only on `feat/researchops-subscription-factory-v1-1`;
- draft PR to `main`;
- no merge;
- no deploy;
- no `master` mutation;
- complete validation report required before owner review.
