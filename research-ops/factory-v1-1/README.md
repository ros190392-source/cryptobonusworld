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
  --batch-id KZ-P0-D --priority P0

# create ALWAYS writes below repository-relative research-ops/tasks/ (see "Path safety").
# The canonical CLI exposes NO --tasks-dir; there is no user-controlled output path.

# Validate a task at its current state (exit 0 = valid, 1 = invalid).
node research-ops/factory-v1-1/bin/researchops.mjs validate --task-dir research-ops/tasks/<TASK_ID>
node research-ops/factory-v1-1/bin/researchops.mjs validate --task-dir <dir> --json
node research-ops/factory-v1-1/bin/researchops.mjs validate --task-dir <dir> --to-state RESEARCH_CAPTURED
node research-ops/factory-v1-1/bin/researchops.mjs validate --task-dir <dir> --require-package
node research-ops/factory-v1-1/bin/researchops.mjs validate --task-dir <dir> --owner-receipt <receipt.json>

# Deterministic status (declared vs evidence-backed state).
node research-ops/factory-v1-1/bin/researchops.mjs status --task-dir <dir>

# CI append-only boundary check over a `git diff --name-status` file (fail-closed).
node research-ops/factory-v1-1/bin/researchops.mjs check-boundary --changed-status <name-status.txt> \
  --emit-task-roots <task-roots.txt>
```

Strict argument parsing rejects unknown flags, duplicate flags, missing values, unsafe paths,
invalid task IDs and unsupported states.

### Path safety (create output confinement)

The canonical CLI `create` never accepts an absolute path or `..` traversal — it exposes no
output-path flag at all and always writes to `<cwd>/research-ops/tasks/<TASK_ID>`. Tests need OS
temp roots, so the **library** `createTask()` accepts an explicit, clearly-named
`testRoot` option that is **never** wired to CLI argument parsing. Production task creation
therefore cannot escape `research-ops/tasks/`.

### State/evidence consistency

`validate` and `status` share one canonical evidence derivation (`lib/evidence.mjs`). A declared
`TASK_STATE.state` that exceeds the on-disk artifacts (e.g. `RESEARCH_CAPTURED` or higher with an
empty/invalid package, or `VALIDATED` without a `70-validation/` result) fails closed in both
commands and in both human and JSON modes. `--require-package` forces the eleven-file package
check even on an empty skeleton.

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

Validation enforces: exactly eleven flat regular files with **no** nested directory, hidden,
symlink, executable or non-regular entry anywhere under `20-research-output/`; 9/9 JSON parse;
canonical UTF-8/LF; `MANIFEST` byte-size and SHA-256; unique source/claim/conflict/product/rail
IDs; reference fields that are **arrays of non-empty, resolved string IDs** (null/string/object/
number reference fields are rejected); minimum structural shapes for `TASK_STATE.json`,
`00-contract/IDENTITY.json` (with taskId/identity consistency) and `00-contract/GITHUB_PLAN.json`
(`draft=true`, `base=main`, `autoMerge=false`, `mergeAuthorized=false`); and the all-false
authorization floor (only an exact owner receipt may enable a single research-record merge).

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

`.github/workflows/cbw-researchops-factory-validate.yml` runs on pull requests touching
`research-ops/**`. It is **fail-closed**: it verifies the base/head SHAs, runs
`git diff --name-status` with **no** `|| true`, and feeds the result to
`researchops check-boundary` (append-only enforcement). A discovery failure, an empty changed
set, a boundary violation, deletion of a governed task root, or a referenced-but-missing task
root fails the job. A normal research-task PR may change exactly one `research-ops/tasks/<ID>/`
root and nothing else; factory/workflow paths may change only in a factory-governance PR (never
as an escape in a research-task PR). Each discovered task root is validated with
`researchops validate`. The workflow is read-only (`contents: read`,
`persist-credentials: false`), Node 20, time-bounded, and never merges, deploys, calls an AI
provider, or touches `master`.
