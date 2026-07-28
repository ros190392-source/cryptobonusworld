# PREPARED output-directory validation correction — 022

TASK: `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-PREPARED-OUTPUT-DIR-VALIDATION-CORRECTION-022`

## Purpose

Correct one fresh-checkout validation defect while preserving the Research-task CI routing correction from PR #71.

A canonical `PREPARED` task may be checked out without a physical `20-research-output/` directory because Git does not retain empty directories. Validation may treat that single missing directory as an empty PREPARED output stage only under the exact fail-closed conditions below.

## Approved stack

- base branch: `correction/researchops-factory-v1-1-research-task-ci-021`
- approved base SHA: `8f6b1e635cca28e7dce6ca160ae7b68d7f258f0f`
- governing Issue: #72
- blocked pilot: Issue #68 / PR #69 at `bf0a0932325be00aad08ec3db31aef1af9df2384`

## Exact behavior

Missing `20-research-output/` is acceptable only when:

- `TASK_STATE.json` exists, parses and passes structural validation;
- state equals `PREPARED`;
- `TASK_STATE.stages["20-research-output"]` equals `EMPTY`;
- `--require-package` is not active;
- no research-package evidence is present;
- every other stage directory exists.

All other cases fail closed. Full package validation, exact eleven-file inventory and append-only rules remain unchanged.

## Forbidden remediation

Do not add `20-research-output/.gitkeep`, fabricate a directory in CI, skip task-root validation or weaken package inventory rules.

## Frozen setup

The owner-created setup files are immutable after setup:

- `PREPARED_OUTPUT_DIR_VALIDATION_CORRECTION_CONTRACT.md`
- `PREPARED_OUTPUT_DIR_VALIDATION_CORRECTION_STATE.json`
- `CLAUDE_PREPARED_OUTPUT_DIR_VALIDATION_CORRECTION_PROMPT.md`

## Worker write boundary

The worker may modify or create exactly:

- `research-ops/factory-v1-1/lib/validate.mjs`
- `research-ops/factory-v1-1/fixtures/run.mjs`
- `research-ops/factory-v1-1/prepared-output-dir-validation-correction-022/PREPARED_OUTPUT_DIR_VALIDATION_CORRECTION_RESULT.json`
- `research-ops/factory-v1-1/prepared-output-dir-validation-correction-022/PREPARED_OUTPUT_DIR_VALIDATION_CORRECTION_RESULT.md`

No other file may change.

## Decision

Use exactly one:

- `PREPARED_OUTPUT_DIR_VALIDATION_CORRECTION_READY_FOR_OWNER_MERGE`
- `PREPARED_OUTPUT_DIR_VALIDATION_CORRECTION_BLOCKED`

A passing correction grants no merge, production, deployment, import or Binance research authority.