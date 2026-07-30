# Corrected Package Enforcement Correction 038A

Task: `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTED-PACKAGE-ENFORCEMENT-038A`

Governing Issue: #107

Approved base: `main@31bd0451c75d76f1da6c5e20818825f33b9d043d`

## Objective

Make the executable Factory enforce the generated correction contract: an atomic `CORRECTION_REQUIRED -> CORRECTED` transition must add exactly `CORRECTION_STATE.json`, the canonical eleven-file corrected package under `60-correction/20-corrected-output/`, and `TASK_STATE.json`.

The corrected package must receive the same inventory, encoding, JSON shape, manifest, ID and cross-reference validation as the original package. The strict correction marker must bind the review and corrected package. Legacy `CORRECTION_RESULT.json` may remain readable, but new stage transitions cannot create it.

## Allowed implementation

- `research-ops/factory-v1-1/lib/stage.mjs`
- `research-ops/factory-v1-1/lib/markers.mjs`
- `research-ops/factory-v1-1/lib/evidence.mjs`
- `research-ops/factory-v1-1/lib/validate.mjs`
- `research-ops/factory-v1-1/fixtures/run.mjs`

No workflow, template, schema, research task, application, import, production or deployment change.

## Required result

Exactly:

- `CORRECTED_PACKAGE_ENFORCEMENT_CORRECTION_RESULT.json`
- `CORRECTED_PACKAGE_ENFORCEMENT_CORRECTION_RESULT.md`

## Validation

All existing 317 fixtures plus deterministic corrected-package fixtures must pass. Governance must pass under protected-base policy.

## Authority

All authorizations remain false. Publication to `main` is separately recorded inside the owner-preauthorized bounded recovery and may only use ordinary non-force fast-forward. `master` and production remain protected.
