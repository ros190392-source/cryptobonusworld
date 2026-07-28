# ResearchOps Factory V1.1 — PREPARED output-directory validation Correction 022

**Task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-PREPARED-OUTPUT-DIR-VALIDATION-CORRECTION-022`
**Governing Issue:** #72 · **Correction PR:** #73 · **Source routing correction:** Issue #70 / PR #71 · **Blocked pilot:** Issue #68 / PR #69
**Role:** correction · **Decision:** **`PREPARED_OUTPUT_DIR_VALIDATION_CORRECTION_READY_FOR_OWNER_MERGE`**

## Summary

Narrow validator-ordering fix in `lib/validate.mjs`: `TASK_STATE.json` is now parsed and
structurally validated **before** deciding whether the physical `20-research-output/` directory is
mandatory. A Git-empty (absent) `20-research-output/` is accepted **only** for a genuine fresh
`PREPARED` checkout with no evidence; every other case fails closed exactly as before. This resolves
the second defect found in Correction 021 (git cannot track the empty output directory, so a
committed `PREPARED` task legitimately lacks it on checkout). No `.gitkeep` was added and no directory
is created during validation or CI.

## Frozen setup

| Field | Value |
| --- | --- |
| Approved base | `correction/researchops-factory-v1-1-research-task-ci-021@8f6b1e635cca28e7dce6ca160ae7b68d7f258f0f` |
| Branch | `correction/researchops-factory-v1-1-prepared-output-dir-validation-022` |
| Frozen setup HEAD | `0605575c1e2037d241c2ad6b9cde28a5343649ad` |

Setup phase = exactly the canonical triple (contract/state/prompt), additions-only; the three setup
files were not modified. This correction is **stacked on Correction 021**, inheriting the RESEARCH_TASK
routing.

## Implementation semantics (`lib/validate.mjs` only)

An absent `20-research-output/` passes **only when all** hold: task dir exists; `TASK_STATE.json`
exists, parses, and passes structural shape (C9); `state` is canonical and exactly `PREPARED`;
`stages["20-research-output"] === "EMPTY"`; `--require-package` inactive; no research-package
evidence present; and every **other** stage directory physically exists. The permitted case uses a
distinct check name — `stage dir present or Git-empty PREPARED output: 20-research-output` — separating
it from an actually-present output directory.

Fails closed for: missing/malformed/structurally-invalid `TASK_STATE`; noncanonical or non-`PREPARED`
state; stage marker not exactly `EMPTY`; `--require-package`; partial/complete evidence; any later
lifecycle state; any other stage directory absent.

**Not weakened:** exact eleven-file package inventory/manifest/IDs/references/shapes; state/evidence
consistency (C2); authorization floor; append-only boundary; required presence of every other stage
directory.

## Tests

- Fixtures: **235 passed / 0 failed** (was 222; **+13** for Correction 022).
- New coverage: PREPARED git-empty output valid; `--require-package` fails; RESEARCH_CAPTURED / later
  states fail; wrong stage marker fails; missing / malformed / structurally-invalid `TASK_STATE` fail;
  another missing stage dir fails; partial evidence fails; complete 11-file package valid; canonical
  `create` output valid; noncanonical state fails. Correction 021 routing and governance/bootstrap
  fixtures remain green.
- `node --check` clean; `git diff --check` clean; frozen setup untouched; only the two impl worker
  files changed.

## Exact pilot reproduction (base `f62c1fb`, head `bf0a093`, `research/kz-binance-kz-p0-d` → `main`)

Reproduced with the corrected factory (021 routing + 022 validator) as the protected-base policy,
against a fresh checkout of pilot head `bf0a093` (empty `20-research-output/` **absent**):

- `ENFORCEMENT: RESEARCH_TASK (protected base policy)` ✅
- `BOUNDARY mode=RESEARCH_TASK taskRoots=[research-ops/tasks/CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001]` ✅
- `RESULT: BOUNDARY OK` ✅
- `validate … => 19/19 checks passed, RESULT: VALID` ✅ · `status`: PREPARED, consistent

All four required targets reached.

## Non-regression

Governance **DESCENDANT** and pinned V4 **BOOTSTRAP** behavior unchanged (fixtures 021-9/021-10 green);
the Correction 022 PR itself validates under DESCENDANT.

## Correction PR own workflow

<!-- CORRECTION_PR_RUN -->

## Decision

**`PREPARED_OUTPUT_DIR_VALIDATION_CORRECTION_READY_FOR_OWNER_MERGE`.**

**Recommended next owner command:** merge Corrections 021 and 022 to `main` (in stack order), then
re-run the Binance pilot `CBW-KZ-BINANCE-P0-D-FACTORY-PILOT-020` so PR #69 (or its re-created head)
carries both corrections and its GitHub workflow reaches RESEARCH_TASK → BOUNDARY OK → successful
task-root validation end-to-end.

## Authorizations

All 18 authorizations **false**. No merge, no `main`/`master` change, no PR #69 modification, no
Binance research, no `20-research-output` population, no deploy/import, no V5.
