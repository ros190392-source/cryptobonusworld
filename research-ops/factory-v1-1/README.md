# ResearchOps Subscription Factory V1.1

Deterministic, dependency-free factory for ChatGPT-subscription Deep Research on
CryptoBonusWorld. Each country × exchange investigation uses **one append-only task branch and
one draft PR to control-plane `main`**, with immutable research, review, correction, validation
and owner-closeout layers.

The canonical CLI runs directly with **Node 20 and built-in modules only** — no `npm install`,
no third-party packages. (The control-plane `main` branch has no root `package.json`; none is
added by this factory.)

## CLI

```bash
# Create a new task skeleton (create-only; fails if the task exists).
node research-ops/factory-v1-1/bin/researchops.mjs create \
  --task-id CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001 \
  --country-code KZ --country-name Kazakhstan \
  --exchange-id binance --exchange-name Binance \
  --batch-id KZ-P0-D --priority P0 \
  --tasks-dir research-ops/tasks

# Validate a task at its current state (exit 0 = valid, 1 = invalid).
node research-ops/factory-v1-1/bin/researchops.mjs validate --task-dir research-ops/tasks/<TASK_ID>
node research-ops/factory-v1-1/bin/researchops.mjs validate --task-dir <dir> --json
node research-ops/factory-v1-1/bin/researchops.mjs validate --task-dir <dir> --to-state RESEARCH_CAPTURED
node research-ops/factory-v1-1/bin/researchops.mjs validate --task-dir <dir> --owner-receipt <receipt.json>
node research-ops/factory-v1-1/bin/researchops.mjs validate --task-dir <dir> --changed-files <list.txt>

# Deterministic status (declared vs evidence-backed state).
node research-ops/factory-v1-1/bin/researchops.mjs status --task-dir <dir>
```

Strict argument parsing rejects unknown flags, duplicate flags, missing values, unsafe paths,
invalid task IDs and unsupported states.

## Task layout

```text
research-ops/tasks/<TASK_ID>/
  00-contract/   IDENTITY.json, DEEP_RESEARCH_PROMPT.md, *_CONTRACT.md, RESEARCH_INVENTORY.json, GITHUB_PLAN.json
  10-input/
  20-research-output/   the exact eleven research files
  50-source-truth-review/
  60-correction/
  70-validation/
  80-closeout/
  TASK_STATE.json
```

## Eleven-file research package

`research-run.json`, `source-verification.json`, `claim-verdicts.json`,
`conflict-resolution.json`, `product-availability.json`, `payment-rails.json`,
`offer-eligibility-review.json`, `schema-normalization-notes.json`, `import-readiness.json`,
`source-truth-review-report.md`, `MANIFEST.txt`.

Validation enforces: exact inventory, 9/9 JSON parse, canonical UTF-8/LF, `MANIFEST` byte-size
and SHA-256, unique source/claim/conflict/product/rail IDs, resolved cross-references, no
symlink/executable/hidden payload/path traversal, and the all-false authorization floor.

## States

`PREPARED → RESEARCH_CAPTURED → PACKAGE_VALIDATED → SOURCE_TRUTH_REVIEWED →
(CORRECTION_REQUIRED → CORRECTED →) VALIDATED → OWNER_CLOSEOUT_REQUIRED →
RESEARCH_RECORD_MERGE_AUTHORIZED → RESEARCH_RECORD_MERGED_TO_MAIN`, plus `BLOCKED`.
Transitions are explicit and fail closed.

## Authorization floor

Every generated task starts with **all** canonical/production/activation/publication/deploy
authorizations false. Only an exact owner receipt
(`authorizationType: RESEARCH_RECORD_MERGE_TO_MAIN`) may enable a single research-record merge
to `main`, and only via `researchRecordMergeToMainAuthorized`. It can never authorize `master`,
canonical import, production, ranking, CTA, promo, affiliate, publication, sitemap,
indexability, MIGRATION_5 or deploy.

## Tests

```bash
node research-ops/factory-v1-1/fixtures/run.mjs
```

Deterministic, Node-built-in fixtures using OS temp directories. They never write into tracked
`research-ops/tasks/`.

## CI

`.github/workflows/cbw-researchops-factory-validate.yml` runs the fixtures and validates any
changed task on pull requests touching `research-ops/**`. It is read-only (`contents: read`),
Node 20, invokes only the direct Node CLI/test runner, never merges, never deploys and never
calls an AI provider.
