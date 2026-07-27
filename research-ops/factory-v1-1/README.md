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
output-path flag at all. **V2-C1:** it resolves the **real Git worktree root** (`lib/worktree.mjs`,
via `git rev-parse` with fixed arguments — no shell, no injection) and always writes to
`<worktree-root>/research-ops/tasks/<TASK_ID>`, whether invoked from the repository root or any
subdirectory. Invoked outside a real worktree (e.g. an external `cwd`), it **fails closed and
creates nothing**; a bare directory that merely contains a `.git`-named file is rejected unless Git
confirms a valid worktree. Tests need OS temp roots, so the **library** `createTask()` accepts
clearly-named `testRoot`/`repoRoot` options that are **never** wired to CLI argument parsing.

### V2 boundary hardening (Correction V2 012)

- **V2-C2 strict name-status:** `parseNameStatus` accepts only `A/M/D/T` and `R<score>/C<score>`,
  retains **both** source and destination, and rejects malformed/empty/unknown-status records. A
  rename/copy from a forbidden, pilot or different-task source cannot be hidden by a safe
  destination.
- **V2-C3 trusted PR mode:** `FACTORY_GOVERNANCE` is granted only from **trusted** PR head/base
  branch metadata (never from changed paths alone). A research branch that changes only a factory
  file, or any factory change without trusted metadata, fails closed.
- **V2-C4 exact workflow allowlist:** the only workflow path this lineage may change is
  `.github/workflows/cbw-researchops-factory-validate.yml`; unrelated deploy/alert/telegram
  workflows are rejected.
- **V2-C5 stage-aware append-only:** using trusted base/head `TASK_STATE` read from Git blobs, the
  boundary requires a canonical state transition (or same-state append), makes `00-contract/**`
  and captured `20-research-output/**` immutable, and rejects modification/deletion/rename of closed
  earlier stages — a one-task-root rule alone is not sufficient.
- **V2-C6 plan cross-binding:** `TASK_STATE.branch == GITHUB_PLAN.taskBranch ==
  pullRequest.head`, `baseBranch == pullRequest.base == main`, exact task ID, canonical branch
  grammar, `draft`/`autoMerge`/`mergeAuthorized` flags all enforced.
- **V2-C7 identity grammar:** country/exchange/batch/priority/branch are validated for grammar and
  type (not merely compared), rejecting malformed-but-equal values.
- **V2-C8 nine JSON shapes:** every research JSON requires an object top level and its governed
  collection/object; arrays, null and primitives are rejected — not only the five ID collections.
- **V2-C9 strict UTF-8:** all eleven files are fatally UTF-8-decoded before parsing; invalid bytes
  are rejected even when the MANIFEST is recomputed (distinct from BOM/CR and from malformed JSON).
- **V2-C10 identity-bound markers:** higher-stage evidence must be regular, canonical-UTF-8,
  parseable, task-ID-bound and carry a recognized outcome; evidence is cumulative and owner
  closeout/merge states require an exact owner receipt / identity-bound merge record.

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
`research-ops/**`. It is **fail-closed**: it verifies the base/head SHAs **and** the head/base
branch refs from the trusted GitHub event context, runs `git diff --name-status` with **no**
`|| true`, and feeds the result — together with the trusted `--head-branch`/`--base-branch` and
`--base-sha`/`--head-sha` — to `researchops check-boundary`. The validator binds change mode to the
trusted branch metadata (V2-C3) and derives per-root stage transitions from Git blobs at the
trusted base/head commits (V2-C5). A discovery failure, missing/inconsistent event metadata, an
empty changed set, a malformed status record, a boundary or stage violation, an unrelated workflow
change (only the factory workflow is allowlisted, V2-C4), deletion/rename of a governed task
record, or a referenced-but-missing task root fails the job. Each discovered task root is validated
with `researchops validate`. The workflow is read-only (`contents: read`,
`persist-credentials: false`), Node 20, time-bounded, and never merges, deploys, calls an AI
provider, or touches `master`.
