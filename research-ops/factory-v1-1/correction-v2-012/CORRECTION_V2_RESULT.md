# ResearchOps Factory V1.1 — Correction V2 012 Result

- **Task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V2-012`
- **Governing issue:** #52 · **Correction V2 PR:** #53
- **Source validation:** `CBW-…-CORRECTION-VALIDATION-011` / #51 @ `a958f0c…` (`VALIDATED_WITH_CORRECTIONS_REQUIRED`)
- **Source correction:** Correction 010 @ `2b9fecd…`
- **Initial correction head:** `de5601c7083b33c1c885c7184d9f22d70a4d9e8f`
- **Control-plane:** `main@04157b9…` · **Production authority:** `master@998fced…`
- **Corrected at:** 2026-07-27 · Node 20-compatible, dependency-free (built-ins + the `git` SCM binary via fixed-argument `execFileSync`)

## Outcome

**`CORRECTED_READY_FOR_INDEPENDENT_VALIDATION`.** All ten corrections required by Correction
Validation 011 (findings A, B, C, D, E, F, G, H, J, K) are implemented and independently tested.
The fixture suite grew from **63 to 108 checks, 0 failures** (all 63 prior checks retained, two
upgraded in place to meet the stricter V2-C3/V2-C10 rules). `node --check` is clean; `git diff
--check` is clean; direct CLI and adversarial probes confirm each fix; the changed set is entirely
within the authorized write boundary. No merge, deploy, Binance pilot, `main`/`master` or
production change was performed; every authorization remains false.

## Ten-correction matrix

| # | Finding | Correction | Proof |
|---|---|---|---|
| V2-C1 | A | Real Git worktree-root confinement (`lib/worktree.mjs`); create resolves the worktree root, fails closed outside one. | CLI create from root & subdir → repo-root tasks; external cwd → exit 2, nothing created; fixtures V2-C1/b/c |
| V2-C2 | B | Strict `A/M/D/T/R/C` name-status; both source and destination retained and evaluated. | fixtures V2-C2..g; CLI rename-from-pilot & malformed rejected |
| V2-C3 | C | Change mode bound to trusted PR head/base branch metadata, not paths. | fixtures V2-C3..d; CLI mode-confusion & no-metadata rejected |
| V2-C4 | D | Only the factory validation workflow is allowlisted. | fixtures V2-C4/b; CLI deploy workflow rejected, factory accepted |
| V2-C5 | E | Stage-aware append-only from trusted base/head Git blobs (`lib/stage.mjs`). | fixtures V2-C5..h; end-to-end git-blob CLI rejects 00-contract mutation |
| V2-C6 | F | Full `TASK_STATE`↔`GITHUB_PLAN` branch/head/base/task cross-binding. | fixtures V2-C6/b/c |
| V2-C7 | G | Identity grammar/type validation and deterministic branch. | fixtures V2-C7..e; CLI malformed identity rejected |
| V2-C8 | H | Governed top-level structure for all nine research JSON files. | fixtures V2-C8/b/c |
| V2-C9 | J | Fatal UTF-8 decoding of all eleven files before parsing. | fixtures V2-C9..d |
| V2-C10 | K | Identity-bound, parseable, cumulative higher-stage markers; owner receipt for closeout. | fixtures V2-C10..f |

## Independent test summary

- `node --check` on every factory `.mjs`: **clean**.
- Fixtures: **108 passed / 0 failed** (63 retained + 45 new V2 checks).
- `git diff --check`: **clean**.
- **CLI / adversarial smoke (all as expected):** create root→repo-root · create subdir→repo-root ·
  create external cwd→exit 2 (nothing created) · validate/status ok · `--require-package` empty→exit 1 ·
  `--tasks-dir`→unknown flag · owner receipt valid→ok · check-boundary: deploy workflow→reject,
  factory workflow→accept, rename-from-pilot→reject, malformed status→reject, research-branch-touching-factory→reject,
  factory-without-metadata→reject · stage-aware end-to-end (Git blobs): 00-contract mutation→reject.

## Workflow hardening

The workflow now passes trusted `base.sha`/`head.sha` **and** `head.ref`/`base.ref` from the
GitHub event into `check-boundary` (`--head-branch`/`--base-branch`/`--base-sha`/`--head-sha`/
`--repo-root`), and fails on missing/inconsistent metadata. The validator binds mode to the trusted
branch (never repository files) and derives per-root stage transitions from Git blobs. It remains
read-only (`contents: read`, `persist-credentials: false`), Node 20, time-bounded, and performs no
AI call, branch/PR/issue creation, merge, deploy or `master` mutation. Only
`.github/workflows/cbw-researchops-factory-validate.yml` was changed.

## Remaining limitations

- Worktree-root resolution and CLI stage-state derivation use the `git` binary (already required by
  the SCM/CI); absent `git`, those paths **fail closed** rather than degrade.
- Cross-commit stage transitions are enforced in CI (trusted base/head SHAs) and unit-tested as a
  pure function; a local `validate` without SHAs still enforces single-root/forbidden/workflow rules.
- Research-JSON validation enforces governed top-level collections/objects (compatible with the
  proven OKX shape); deep field semantics remain the review/validation stages' responsibility.

## Boundary and authorization confirmation

Changed files are limited to the factory validation workflow and
`research-ops/factory-v1-1/{bin,lib,fixtures,README,correction-v2-012}` — `governance/**`,
`validation-009/**`, `correction-010/**`, `correction-validation-011/**`,
`research-ops-pilot/**`, real `research-ops/tasks/**`, `main`, `master` and production were **not**
modified. The correction-v2-012 contract, state and prompt files were left unchanged. Every merge,
Binance-pilot, canonical, production, activation and deploy authorization remains **false**; owner
receipt privilege escalation remains rejected.

**Next task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V2-VALIDATION-013` (independent
validation). No owner merge review is permitted before that passes.
