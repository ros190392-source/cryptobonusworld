# ResearchOps Factory V1.1 — Correction 010 Result

- **Correction task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-010`
- **Governing issue:** #47 · **Impl PR:** #44 · **Validation PR:** #46 · **Correction PR:** #49
- **Validated implementation:** `02997bb…` · **Validation commit:** `2f95f8a…`
- **Initial correction HEAD:** `289d6471b6dec95d8e1d98c2c36aa031293d2bbe`
- **Corrected at:** 2026-07-26 · Node 20-compatible, dependency-free

## Outcome

**`CORRECTED_READY_FOR_INDEPENDENT_VALIDATION`.** All nine Validation-009 corrections were
applied and tested. The fixture suite grew to **63 checks, 0 failures**; `node --check` is clean;
direct CLI smoke tests confirm the fixes; `git diff --check` is clean; the changed set is entirely
within the authorized correction boundary. No merge, deploy, Binance pilot, `main`/`master` or
production change was performed; every authorization remains false.

## Nine-correction matrix

| # | Correction | What changed | Proof |
|---|---|---|---|
| C1 | force-package flag | `args.mjs` boolean aliases; `bin` maps `--require-package`→`requirePackage`; `validate` forces the package check and fails on empty. Dead no-op removed. | CLI `validate --require-package` on empty → exit 1; fixtures C1/C1b/C1c |
| C2 | state/evidence consistency | New `lib/evidence.mjs` (one shared derivation); `validate` fails closed when declared state exceeds artifacts; `status` uses the same logic. | fixtures C2 (all 8 evidence states empty → fail in both), C2b–C2d |
| C3 | workflow discovery fail-closed | Removed both `\|\| true`; verify non-empty base/head + `git cat-file -e`; `git diff --name-status` not swallowed; empty changed set refused. | workflow steps; CLI `check-boundary` empty → exit 1 |
| C4 | task-root deletion | `boundary.mjs` flags `D` records under a task root; check-boundary + validate step fail on a missing referenced root. | CLI `check-boundary` on `D` → exit 1; fixture C4 |
| C5 | CI append-only | New `lib/boundary.mjs` + `check-boundary` CLI wired into the workflow; one task root per research PR; factory paths only in governance PRs; pilot/src/public/MI/top-level/traversal rejected. | fixtures C5–C5i; CLI modes |
| C6 | `--tasks-dir` confinement | `--tasks-dir` removed from the CLI; `create` always writes `<cwd>/research-ops/tasks/`; library-only `testRoot` for tests. | CLI `--tasks-dir` → unknown flag exit 2; fixtures C6/C6b; README |
| C7 | nested package entries | `scanPackageEntries` requires exactly eleven flat regular files; rejects nested dir/file, hidden, symlink, exec, non-regular. | fixtures C7/C7b/C7c |
| C8 | reference typing | `checkRefArray` rejects null/string/object/number ref fields; arrays of unique non-empty resolved strings; required `claim.supportedSourceIds`, `rail.sourceIds`. | fixtures C8–C8g |
| C9 | structural/schema | New `lib/schema.mjs` enforces `TASK_STATE` (keys, taskId, state, full boolean auth matrix), `IDENTITY` (presence + taskId/identity consistency + canonical inventory), `GITHUB_PLAN` (taskId/model/base/draft/autoMerge/mergeAuthorized). | fixtures C9–C9g |

## Independent test summary

- `node --check` on all factory `.mjs`: **clean**.
- Fixtures: **63 passed / 0 failed** (positive and negative coverage per correction).
- CLI smoke: create (confined) PASS · validate 19/19 · status consistent · `--require-package`
  empty → exit 1 · `--tasks-dir` → exit 2 · `check-boundary` governance→OK, deletion→exit 1,
  empty→exit 1.
- `git diff --check`: clean.

## Workflow findings (corrected)

Fail-closed discovery (verified base/head, no `|| true`), append-only enforcement via
`check-boundary`, task-root deletion/absence rejected, single-task-root rule for research PRs,
factory-governance mode for factory PRs. Still read-only: `permissions: contents: read`,
`persist-credentials: false`, Node 20, time-bounded, no AI call, no branch/issue/PR creation, no
merge, no deploy, no `master` mutation.

## Remaining limitations

- Authorization detection stays heuristic for arbitrary non-canonical names, but `TASK_STATE`
  now requires the exact canonical boolean matrix and rejects unknown `*Authorized` set true.
- CI cross-stage immutability relies on the append-only boundary + per-file MANIFEST hashing over
  GitHub-provided base/head SHAs, which the workflow now verifies before use.
- Higher declared states require a conservative stage marker file; deep semantic validation of
  those stage artifacts remains with the corresponding governed review/validation tasks.

## Boundary and authorization confirmation

Changed files are limited to the workflow and `research-ops/factory-v1-1/{bin,lib,fixtures,README,
correction-010}` — `governance/**`, `validation-009/**`, `research-ops-pilot/tasks/**`,
`research-ops/tasks/**`, `main`, `master` and production were **not** modified. Every merge,
Binance-pilot, canonical, production, activation and deploy authorization remains **false**.

**Next task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-VALIDATION-011` (independent
validation). No owner merge review is permitted before that passes.
