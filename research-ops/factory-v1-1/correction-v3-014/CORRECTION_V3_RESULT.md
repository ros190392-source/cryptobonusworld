# ResearchOps Factory V1.1 — Correction V3 014 Result

- **Task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V3-014`
- **Governing issue:** #56 · **Correction V3 PR:** #57
- **Source validation:** `CBW-…-CORRECTION-V2-VALIDATION-013` / #55 @ `acd83d1…` (`VALIDATED_WITH_CORRECTIONS_REQUIRED`)
- **Source Correction V2:** `d3ed112…`
- **Frozen initial head:** `78c56177ce569baa75c96613e0f74881078318cc`
- **Control-plane:** `main@04157b9…` · **Production authority:** `master@998fced…`
- **Corrected at:** 2026-07-27 · Node 20-compatible, dependency-free (built-ins + the `git` SCM binary via fixed-argument `execFileSync`)

## Outcome

**`CORRECTED_READY_FOR_INDEPENDENT_VALIDATION`.** All twelve corrections required by Correction V2
Validation 013 (findings A, B, C, D/N, E, F, G, H, I, K, L, M) are implemented and independently
tested. The fixture suite grew from **108 to 145 checks, 0 failures** (all 108 prior checks
retained; a few upgraded in place to satisfy the stricter V3 history/lineage/skeleton rules).
`node --check` is clean; `git diff --check` is clean; direct CLI and adversarial probes confirm each
fix; the changed set is entirely within the authorized write boundary and touches no frozen layer.
No merge, deploy, Binance pilot, `main`/`master` or production change was performed; every
authorization remains false.

## Twelve-correction matrix

| # | Finding | Correction | Proof |
|---|---|---|---|
| V3-C1 | A | Bind create to the factory-**script** worktree; reject foreign-worktree execution. | CLI from a foreign valid Git repo → exit 2, nothing created; fixtures V3-C1/b |
| V3-C2 | B | Exact governed (head, base) factory lineage (`lib/lineage.mjs`); spoofs fail. | fixtures V3-C2/b/c |
| V3-C3 | C | Bind trusted research head to the task's `TASK_STATE.branch`/taskId. | fixtures V3-C3/b; CLI mismatch rejected |
| V3-C4 | D/N | Freeze prior governance/history; protect workflow from deletion/rename; task writes only impl + own result dir. | fixtures V3-C4..e; CLI frozen/deletion → exit 1, impl+own-result → exit 0 |
| V3-C5 | E | Initial creation must equal the exact deterministic skeleton. | fixtures V3-C5/b |
| V3-C6 | F | Exact per-stage inventory; reject conflicting duplicate markers. | fixtures V3-C6/b |
| V3-C7 | G | Controlled outcome enums; 40-hex/main/receipt-linked merge record. | fixtures V3-C7..c |
| V3-C8 | H | Require the correction marker when history used the correction path. | fixtures V3-C8/b |
| V3-C9 | I | `TASK_STATE.history` integrity + append-only across base/head blobs. | fixtures V3-C9..d |
| V3-C10 | K | R/C scores 0–100; NUL-delimited `git diff -z`; reject quoted paths. | fixtures V3-C10..e; CLI R101 → exit 1 |
| V3-C11 | L | Non-vacuous `overallFinding`/`review`/`readiness` minima. | fixtures V3-C11..c |
| V3-C12 | M | Reject NUL/C0/C1 control bytes in canonical text. | fixtures V3-C12..d |

## Independent test summary

- `node --check` on every factory `.mjs`: **clean**.
- Fixtures: **145 passed / 0 failed** (108 retained + 37 new V3 checks).
- `git diff --check`: **clean**.
- **CLI / adversarial smoke:** create from a foreign Git repo → exit 2 (nothing created) ·
  validate/status → exit 0 · `--require-package` empty → exit 1 · `--tasks-dir` → unknown flag ·
  owner-receipt escalation → rejected · check-boundary: frozen-layer mutation → exit 1, factory
  workflow deletion → exit 1, impl + own result dir → exit 0, R101 score → exit 1.

## Workflow

The workflow now discovers changes with NUL-delimited, unquoted `git -c core.quotePath=false diff
-z` (V3-C10) and passes trusted `base.sha`/`head.sha`/`head.ref`/`base.ref`/`GITHUB_WORKSPACE` into
`check-boundary`, failing on missing/inconsistent metadata. The boundary binds mode to the exact
factory lineage, freezes prior layers, protects the workflow from deletion, and derives per-root
stage transitions and history from Git blobs. It remains read-only (`contents: read`,
`persist-credentials: false`), Node 20, time-bounded, and performs no AI call, branch/PR/issue
creation, merge, deploy or `master` mutation. Only
`.github/workflows/cbw-researchops-factory-validate.yml` was changed.

## Remaining limitations

- Worktree resolution and CLI stage/history derivation use the `git` binary (already required); if
  `git` is absent those paths **fail closed**.
- Cross-commit stage/history and research head↔plan binding are enforced in CI (trusted base/head
  SHAs); a local `validate` without SHAs still enforces single-root/frozen/skeleton/marker/package/
  history-shape rules.
- The factory lineage allowlist is an explicit governed constant that each authorized task extends
  (including the next validation branch); it must grow with the stack.
- Research-JSON validation enforces non-vacuous governed minima; deep semantics remain the
  review/validation stages' responsibility.

## Boundary and authorization confirmation

Changed files are limited to the factory workflow and
`research-ops/factory-v1-1/{bin,lib,fixtures,README,correction-v3-014}` — `governance/**`,
`validation-009/**`, `correction-010/**`, `correction-validation-011/**`, `correction-v2-012/**`,
`correction-v2-validation-013/**`, `research-ops-pilot/**`, real `research-ops/tasks/**`, `main`,
`master` and production were **not** modified. The Correction V3 contract/state/prompt were left
unchanged. Every merge, Binance-pilot, canonical, production, activation and deploy authorization
remains **false**; owner-receipt privilege escalation remains rejected.

**Next task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V3-VALIDATION-015` (independent
validation). No owner merge review is permitted before that passes.
