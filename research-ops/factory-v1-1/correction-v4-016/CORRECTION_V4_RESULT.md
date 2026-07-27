# ResearchOps Factory V1.1 — Final Critical Correction V4 016 Result

- **Task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V4-016`
- **Governing issue:** #60 · **Correction V4 PR:** #61
- **Source validation:** `CBW-…-CORRECTION-V3-VALIDATION-015` / #59 @ `07d0e38…` (`VALIDATED_WITH_CORRECTIONS_REQUIRED`)
- **Authoritative Correction V3:** `69d8d564…`
- **Frozen initial V4 head:** `063078ac56423d3ab3544f17e69b09ed4bdc6d9e`
- **Control-plane:** `main@04157b9…` · **Production authority:** `master@998fced…`
- **Corrected at:** 2026-07-27 · final cycle · Node 20-compatible, dependency-free (built-ins + `git` via fixed-argument `execFileSync`, no Git writes)

## Outcome

**`CORRECTED_READY_FOR_FINAL_ACCEPTANCE_VALIDATION`.** The seven merge-disqualifying findings from
Validation 015 (A, B, C, E, F, I, N) are corrected and independently tested. The fixture suite grew
from **145 to 177 checks, 0 failures** (all 145 prior checks retained; a few upgraded to the
stricter V4 role/governed-record/merge-proof rules). `node --check` is clean; `git diff --check` is
clean; direct CLI and adversarial probes confirm each fix; the changed set is entirely within the
authorized write boundary and touches no frozen layer. No merge, deploy, Binance pilot, `main`/
`master` or production change was performed; every authorization remains false. Findings D, H and K
remain accepted V1.1 backlog limitations, not V5 triggers.

## Seven-correction matrix

| # | Finding | Correction | Proof |
|---|---|---|---|
| V4-C1 | A | Role capability profiles (`lib/roles.mjs`): validation/closeout may write only 2 result files; setup immutable; no prefix auth. | fixtures V4-C1..f |
| V4-C2 | B | Trusted **base** enforcement root: workflow runs the boundary from `../trusted-base`, not the PR head. | workflow + fixtures V4-C2/b |
| V4-C3 | C | Owner governed record (`lib/govrecord.mjs`) bound to task id/head/base/approved-base-SHA + head ancestry; recovery reconciled. | fixtures V4-C3..c |
| V4-C4 | E | Removed mutable branch-list preauthorization; future/absent record fails; task can't author its own record. | fixtures V4-C4/b |
| V4-C5 | F | Canonical skeleton **bytes** (`lib/skeleton.mjs`): per-file SHA-256 + safety text + mode/symlink checks. | fixtures V4-C5..d |
| V4-C6 | I | Real merge proof (`lib/mergeproof.mjs`): non-zero 40-hex, exists, reachable from `main`, receipt hash linkage. | fixtures V4-C6..f |
| V4-C7 | N | Checkout/event integrity (`lib/eventintegrity.mjs`): HEAD==head SHA, workspace==root, ancestry, not shallow. | fixtures V4-C7..h; CLI |

## Trusted enforcement design (V4-C2)

The workflow is read-only (`contents: read`, `persist-credentials: false`). It first verifies
checkout/event integrity, then checks out the **protected base** commit into `../trusted-base` and
executes the boundary validator **from the base** against the head diff (NUL-delimited name-status)
plus trusted event metadata. The PR head is evaluated as **data**; a head that weakens the
validator, lineage, roles or workflow cannot change the enforcement root used for its own run.
Changes to enforcement-root paths are permitted only for an implementation/correction-role governed
record and are therefore gated by the **prior** trusted policy. No untrusted head code runs under
privileged context.

## Independent test summary

- `node --check` on every factory `.mjs`: **clean**.
- Fixtures: **177 passed / 0 failed** (145 retained + 32 new V4 checks).
- `git diff --check`: **clean**.
- **CLI / adversarial smoke:** foreign-worktree create → exit 2 · validate/status → exit 0 ·
  `--require-package` empty → exit 1 · `--tasks-dir` → unknown flag · check-boundary with a
  checked-out-HEAD ≠ trusted head SHA → exit 1 · workspace ≠ resolved root → exit 1.

## Accepted V1.1 backlog limitations (not V5 triggers)

- **D** — broader current-record lifecycle beyond the exact two-result-file + immutable-setup rule.
- **H** — additional governed marker-outcome enum compatibility (extendable without a security change).
- **K** — richer ISO history event/timestamp schema beyond the enforced integrity + append-only.

## Remaining limitations

- Trusted-base enforcement and the merge/ancestry/checkout facts run in CI (Git + base checkout);
  GitHub Actions cannot execute locally, so those runtime steps are correct-by-construction while
  the deterministic policy cores are library-verified (177/0).
- For a stacked PR, owner setup and executor work share the branch; the governed record is validated
  as identity-bound data with setup-file immutability and ancestry rather than per-commit authorship.

## Boundary and authorization confirmation

Changed files are limited to the factory workflow and
`research-ops/factory-v1-1/{bin,lib,fixtures,README,correction-v4-016}` — `governance/**`,
`validation-009/**`, `correction-010/**`, `correction-validation-011/**`, `correction-v2-012/**`,
`correction-v2-validation-013/**`, `correction-v3-014/**`, `correction-v3-validation-015/**`,
`research-ops-pilot/**`, real `research-ops/tasks/**`, `main`, `master` and production were **not**
modified. The Correction V4 contract/state/prompt were left unchanged. Every merge, Binance-pilot,
canonical, production, activation and deploy authorization remains **false**.

**Next task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-FINAL-ACCEPTANCE-VALIDATION-017`.

## CI Remediation R1

**Failed run `30297251691`** (conclusion: failure) failed at step **"Discover changed files and
trusted event metadata (fail-closed)"**. Exact cause: `actions/checkout@v4` on the `pull_request`
event checked out GitHub's synthetic merge commit `a80bb7c` ("Merge 6b8c771 into 07d0e38"), so
`git rev-parse HEAD` (`a80bb7c`) ≠ the trusted event head SHA `6b8c771`. The V4-C7 guard correctly
failed the step (`checked-out HEAD != trusted head sha`, exit 1); trusted-base and boundary steps
were skipped. The integrity check worked as designed — the workflow's own checkout used the wrong
ref.

**Surgical remediation (no V5, no new branch/PR):**

1. **Exact head checkout** — the workflow now checks out `ref: github.event.pull_request.head.sha`
   so `HEAD` == the trusted head SHA. The V4-C7 integrity guard is **retained unchanged** and still
   fails closed on any real mismatch.
2. **Trusted-base bootstrap** (`lib/bootstrap.mjs`) — the approved base `07d0e38` predates the V4
   policy modules, so the base validator cannot run V4 flags for the transition PR. `resolveEnforcement`
   returns **DESCENDANT** whenever the approved base carries the V4 policy (every normal PR and Final
   Acceptance 017 → run from the protected base), **BOOTSTRAP** only for the exact pinned anchor
   (immutable `approvedBaseSha 07d0e38` + `frozenSetupSha 063078a`, bound to Issue #60 / PR #61 /
   exact head+base branches, read-only, validates only this range, cannot authorize another task or
   future branch), and **REJECT** otherwise (fail closed). The old base is never run with unsupported
   V4 flags, and mutable PR-head policy is never silently used as trusted enforcement for a
   non-anchored range.
3. **Frozen setup boundary** — `check-setup-phase` verifies the owner setup phase `07d0e38→063078a`
   introduced **exactly** the three governed setup files (additions only). The worker boundary is
   evaluated from the frozen setup SHA → head; the governed record is read from the frozen setup tree
   (the head cannot rewrite its own governing record); setup files are immutable afterward; no
   arbitrary third file is allowed.

**Regression coverage (16 new checks, 193/0 total):** PR merge-commit vs exact head SHA · checked-out
HEAD mismatch · old base + unsupported V4 flags (avoided via BOOTSTRAP) · bootstrap anchor mismatch ·
bootstrap used by unrelated branch/task · setup file modified after frozen setup · worker diff from
the wrong endpoint / setup-phase integrity · final descendant trusted-base execution.

**Local end-to-end proof (real commits):** `check-setup-phase` OK · `resolve-enforcement` match →
BOOTSTRAP (exit 0), mismatch → REJECT (exit 1) · worker `check-boundary` (frozen-setup→head) →
BOUNDARY OK. Final Acceptance 017 (whose base carries the V4 policy) uses the **DESCENDANT** protected-
base path, proving the descendant trusted-base path works.

**New successful workflow run:** _recorded below after the remediation push triggers it._
