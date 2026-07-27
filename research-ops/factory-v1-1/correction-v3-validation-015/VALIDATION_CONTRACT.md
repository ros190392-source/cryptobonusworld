# Correction V3 Validation 015 Contract

Task: `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V3-VALIDATION-015`

Governing Issue: #58.

Authoritative implementation commit: `69d8d564ebe1b5f277fe771a3e7769020522bd60`.

Source branch recovery tip: `9352e59e168c2b084491c829579bf3e4fb187480`.

The recovery range `69d8d564...9352e59e` must contain zero changed files and must be reported separately from the implementation result.

## Objective

Independently and adversarially validate Correction V3, all V3-C1 through V3-C12 corrections, and every mandatory probe A-N in Issue #58.

Do not trust the correction report, fixture count, green workflow, branch names, validator code from the PR head, or syntactically valid marker/merge identities without independent evidence.

## Allowed output

Create exactly:

- `FACTORY_CORRECTION_V3_VALIDATION.json`
- `FACTORY_CORRECTION_V3_VALIDATION.md`

inside this directory.

The three setup files in this directory are immutable during validation.

## Decision

Use exactly one:

- `VALIDATED_FOR_OWNER_MERGE_REVIEW`
- `VALIDATED_WITH_CORRECTIONS_REQUIRED`
- `VALIDATION_BLOCKED`

## Safety

No merge, PR-ready transition, deployment, Binance task, canonical import, production change, `main` mutation or `master` mutation is authorized. All merge/import/production/activation authorizations remain false.
