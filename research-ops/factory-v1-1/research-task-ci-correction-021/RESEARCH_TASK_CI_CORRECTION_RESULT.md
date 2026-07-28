# ResearchOps Factory V1.1 — Research-task CI Correction 021

**Task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-CI-CORRECTION-021`
**Governing Issue:** #70 · **Correction PR:** #71 · **Blocked pilot:** Issue #68 / PR #69 (head `bf0a093`, run `30340518853`)
**Role:** correction · **Decision:** **`RESEARCH_TASK_CI_CORRECTION_BLOCKED`**

## Summary

The research-task CI **routing** defect (Issue #70) is real and the narrow fix is implemented and
proven. However, reproducing the pilot end-to-end exposed a **separate, independent** defect that
prevents the required "successful validation of the Binance task root", and that defect can only be
fixed in `lib/` — outside this task's allowed write set. Weakening validation or fabricating task
content in CI is prohibited. Per the stored prompt, the correct outcome is
`RESEARCH_TASK_CI_CORRECTION_BLOCKED` without broadening scope.

## Frozen setup

| Field | Value |
| --- | --- |
| Approved base | `main@f62c1fb3fc2a66e57e6b023b8eb5b91f2f34500a` |
| Branch | `correction/researchops-factory-v1-1-research-task-ci-021` |
| Frozen setup HEAD | `ca0551eaa3dae795900065ffb33a0a8989071eaf` |

Setup added exactly the canonical triple (contract/state/prompt), additions only; the three setup
files were not modified.

## Implemented correction (correct and proven)

Workflow enforcement-resolution step now routes explicitly:

- **RESEARCH_TASK** — a canonical `research/**` head (regex `^research/[a-z0-9]+(-[a-z0-9]+)*$`) on
  base `main` prints `ENFORCEMENT: RESEARCH_TASK (protected base policy)`, executes the validator
  from a detached protected-base worktree, uses the exact trusted `BASE_SHA` as **both** `DIFF_BASE`
  and `APPROVED_BASE_SHA`, **never** calls `discover-setup-boundary`, runs the existing
  `check-boundary`, and validates every emitted task root.
- **DESCENDANT** (factory-governance) — unchanged.
- **BOOTSTRAP** (pinned one-time V4 anchor) — unchanged.

Fail-closed for factory/workflow/mixed escapes and spoof/noncanonical/wrong-base branches is provided
by `check-boundary`'s research-task mode (a spoof/noncanonical branch falls through to the descendant
path and still fails closed).

Changed files (exactly the four allowed):
`.github/workflows/cbw-researchops-factory-validate.yml`, `research-ops/factory-v1-1/fixtures/run.mjs`,
and the two result records.

## Tests

- Fixtures: **222 passed / 0 failed** (was 206; **+16** for Correction 021).
- Coverage includes: canonical research routing; the exact PR #69 skeleton diff accepted as
  `RESEARCH_TASK` with the task root emitted; routing independent of setup-boundary discovery;
  research branch touching the workflow / mixing factory+task / changing only a factory file all
  rejected; spoof/noncanonical/non-main branches not trusted; research head↔declared-branch binding;
  factory-governance descendant still needs a unique frozen setup boundary; V4 bootstrap
  BOOTSTRAP/REJECT/DESCENDANT preserved.
- `node --check` on every factory `.mjs`: clean. `git diff --check`: clean.

## Pilot PR #69 reproduction (base `f62c1fb`, head `bf0a093`, `research/kz-binance-kz-p0-d` → `main`)

Ran the exact corrected research-task commands from a detached protected-base worktree against a
detached head checkout:

- `ENFORCEMENT: RESEARCH_TASK (protected base policy)` ✅
- `BOUNDARY mode=RESEARCH_TASK taskRoots=[research-ops/tasks/CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001]` ✅
- `RESULT: BOUNDARY OK` (exit 0) ✅
- successful validation of the Binance task root ❌ — `validate` returns **18/19**, failing
  `stage dir present: 20-research-output`.

## Blocking finding — `20-research-output` not persisted (separate defect, out of scope)

The canonical skeleton (`canonicalSkeletonFiles()`, used by `create`) emits a `.gitkeep` for every
empty stage dir **except** `20-research-output/` (10-input, 50-source-truth-review, 60-correction,
70-validation, 80-closeout all have one). `create` makes the empty directory on disk — so local
`validate` passes 19/19 — but **git cannot track an empty directory**, so on any fresh checkout
(including real GitHub CI) the directory is absent and `lib/validate.mjs` fails the
`stage dir present: 20-research-output` check → **18/19 INVALID**.

**Effect:** even with the routing fix, the pilot PR #69 workflow would now fail at the *Validate
discovered task roots* step. **Required fix location:** `lib/create.mjs` / `lib/model.mjs` (add a
governed `20-research-output/.gitkeep` to the canonical skeleton) or `lib/validate.mjs` (do not
require the empty output dir for a committed PREPARED tree). Both are **outside** the allowed write
set (`workflow` + `fixtures` + two result files). Fabricating the directory in CI or skipping
task-root validation would weaken enforcement and is prohibited.

## Correction PR own workflow

The correction PR is a factory-governance PR on `main` and validates under the existing DESCENDANT
path (its diff contains no `research-ops/tasks/**` root). Its run id and per-step statuses are
recorded here after completion.

<!-- CORRECTION_PR_RUN -->

## Decision

**`RESEARCH_TASK_CI_CORRECTION_BLOCKED`.** The routing correction is implemented and proven, but the
full required outcome (end-to-end pilot validation) is impossible within the allowed paths due to the
separate `20-research-output` skeleton-persistence defect. Scope not broadened; validation not
weakened.

**Recommended next owner command:** authorize a separate narrow correction limited to
`lib/create.mjs` (and/or `lib/model.mjs`) to add a governed `20-research-output/.gitkeep` to the
canonical skeleton plus a regression fixture; then re-run the Binance pilot and re-run PR #69 CI to
confirm end-to-end research-task validation.

## Authorizations

All 18 authorizations are **false**. No merge, no `main`/`master` change, no deploy, no Binance
research, no `20-research-output` population, no V5.
