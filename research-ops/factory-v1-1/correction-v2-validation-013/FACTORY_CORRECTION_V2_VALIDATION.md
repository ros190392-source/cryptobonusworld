# ResearchOps Factory V1.1 — Correction V2 Independent Validation (Task 013)

- **Validation task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V2-VALIDATION-013`
- **Governing issue:** #54 · **Correction V2 PR:** #53 · **Validation PR:** #55
- **Validated correction commit:** `d3ed1128497cf682863c438d47eb65d26ebb536b`
- **Frozen initial correction head:** `de5601c…` · **Source Validation 011:** `a958f0c…`
- **Control-plane:** `main@04157b9…` · **Production authority:** `master@998fced…`
- **Validated at:** 2026-07-27 · Node v24 (Node 20-compatible), dependency-free

## Executive verdict

**`VALIDATED_WITH_CORRECTIONS_REQUIRED`.**

Correction V2 genuinely closed the ten findings from Validation 011: the worktree-root confinement,
strict name-status, trusted-mode binding, exact workflow-change allowlist, stage-aware transitions,
plan cross-binding, identity grammar, nine-JSON structures, fatal UTF-8 and identity-bound markers
are all implemented and regression-green (108/0 fixtures, read-only PR #53 workflow success). The
authorization/security floor is intact — no probe could authorize master, canonical import,
production, deploy, Binance or any merge beyond an exact owner receipt.

However, the mandatory new adversarial probes A–N surfaced **twelve reproducible residual gaps**,
several of which Issue #54 names as explicit disqualifiers for a clean owner-merge verdict: a
**foreign-worktree write** (A), a **broad factory-branch spoof** (B), **research-branch mismatch**
(C), **frozen governance/history mutation** (D), **arbitrary creation payload** (E), **fake marker
outcome / merge record** (G), and **TASK_STATE history rewrite** (I). Correction V2 is therefore
**not** owner-merge-ready and requires a third correction pass.

## Exact rerun results

- `node --check` on every factory `.mjs`: **CLEAN**.
- Independent fixtures: **108 passed / 0 failed**.
- `git diff --check`: **clean**.
- Direct CLI: create/validate/status ok · `--require-package` empty→exit 1 · `--tasks-dir`→unknown
  flag · create from external non-git cwd→exit 2 (nothing created) · owner-receipt escalation→rejected.
- Baseline: correction diff is exactly the reported **17 files**; `validation-009/**`,
  `correction-010/**`, `correction-validation-011/**`, `governance/**`, `research-ops-pilot/**`, real
  `research-ops/tasks/**` and the correction-v2-012 CONTRACT/STATE/PROMPT are **unchanged**;
  `origin/main`/`origin/master` frozen; PR #53 draft/unmerged on `a958f0c…`.

## V2-C1–V2-C10 matrix

| # | Correction | Verdict | Residual (probe) |
|---|---|---|---|
| V2-C1 | worktree-root confinement | **PASS (note)** | foreign-worktree write (A) |
| V2-C2 | strict name-status | **PASS (note)** | score range unbounded (K) |
| V2-C3 | trusted PR mode | **PASS (note)** | broad prefix spoof (B) |
| V2-C4 | exact workflow allowlist | **PASS (note)** | deletion / frozen mutation (D, N) |
| V2-C5 | stage-aware append-only | **PASS (note)** | skeleton / inventory exactness (E, F) |
| V2-C6 | plan cross-binding | **PASS (note)** | head↔task-branch binding (C) |
| V2-C7 | identity grammar | **PASS** | — |
| V2-C8 | nine JSON structures | **PASS (note)** | vacuous `{}` minima (L) |
| V2-C9 | strict UTF-8 | **PASS (note)** | NUL/control bytes (M) |
| V2-C10 | identity-bound markers | **PASS (note)** | outcome semantics / cumulative history (G, H) |

## A–N adversarial probe matrix

| Probe | Verdict | Finding |
|---|---|---|
| A foreign Git worktree | **CORRECTION_REQUIRED** | CLI from a foreign valid repo created `<foreign>/research-ops/tasks/…`; binds to cwd's worktree, not the script's |
| B exact factory lineage | **CORRECTION_REQUIRED** | prefix regex grants FACTORY_GOVERNANCE to `…factory-v1-1-evil/-unrelated/-fake` |
| C research branch mismatch | **CORRECTION_REQUIRED** | boundary accepts a research head not bound to the task's declared branch |
| D frozen record immutability | **CORRECTION_REQUIRED** | governance/validation/correction/history records and the workflow are mutable/deletable under factory-governance |
| E initial exact skeleton | **CORRECTION_REQUIRED** | creation admits arbitrary payload (10-input/70-validation/root files) |
| F per-stage inventory | **CORRECTION_REQUIRED** | first valid marker hides a conflicting wrong-task duplicate |
| G marker outcome semantics | **CORRECTION_REQUIRED** | `outcome:'banana'` and `mergeCommit:'x'` accepted; no enum/40-hex/main/receipt linkage |
| H cumulative correction history | **CORRECTION_REQUIRED** | VALIDATED after CORRECTED omits the correction marker |
| I history integrity | **CORRECTION_REQUIRED** | head=VALIDATED with history=[PREPARED] accepted; no rewrite/canonical checks |
| J stage edge cases | **PASS_WITH_NOTE** | correct except 20-research-output writable on PACKAGE_VALIDATED same-state |
| K name-status grammar | **CORRECTION_REQUIRED** | R101/C999 (scores >100) accepted; quoted paths unhandled |
| L package minima | **CORRECTION_REQUIRED** | vacuous `{}` overallFinding/review/readiness and primitive `notes` entries accepted |
| M UTF-8 / control bytes | **CORRECTION_REQUIRED** | invalid UTF-8 rejected, but NUL/C0 control bytes accepted |
| N workflow & metadata | **CORRECTION_REQUIRED** | PR #53 run read-only ✓; but workflow deletion and frozen mutation accepted |

## Material weaknesses

1. **Path confinement escapes to a foreign worktree (A, HIGH).** V2-C1 closed the cwd-relative
   escape for the no-worktree case but resolves the *current* worktree, not the script's.
2. **Frozen governance/history is mutable under factory-governance (D, HIGH).** The
   `research-ops/factory-v1-1/**` allowlist is too broad and factory-file deletion is not rejected.
3. **Factory lineage and research binding rely on loose signals (B, C, HIGH/MEDIUM).** A prefix
   regex is spoofable; the trusted head branch is not bound to the task's plan.
4. **Evidence semantics are shallow (G, H, I, F, HIGH/MEDIUM).** Markers accept arbitrary outcomes
   and fake merge commits; correction history is not retained; TASK_STATE history is unvalidated;
   duplicate markers can hide invalid ones.
5. **Structural/encoding minima remain permissive (E, L, K, M).** Arbitrary creation payloads,
   vacuous `{}` objects, out-of-range similarity scores and NUL/control bytes are accepted.

None breached the authorization floor — these are confinement, boundary and
validation-completeness gaps, not privilege escalations.

## Workflow judgment

The factory validation workflow is read-only (`contents: read`, `persist-credentials: false`),
fail-closed at discovery, passes trusted base/head SHAs and head/base branch refs, and its actual
PR #53 run on `d3ed112` succeeded. **A green run is not sufficient:** the workflow delegates to a
boundary whose factory-governance allowlist is too broad (D) and whose stage/marker/history checks
are incomplete (E–I), so CI success does not establish the guarantees it appears to assert.

## Merge-readiness judgment

**Not ready for owner-merge review.** Seven of the disqualifiers named in Issue #54 (A, B, C, D, E,
G, I) are independently reproducible. The correct next step is a third correction pass, then
re-validation.

**Next task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V3-014`.

## Authorization confirmation

This validation authorizes **no** merge, import, activation, production change, deploy or Binance
pilot. Every authorization in `FACTORY_CORRECTION_V2_VALIDATION.json` is **false**, including
`researchRecordMergeToMainAuthorized`. `main`, `master`, completed OKX/governance/validation/
correction records and production were **not** modified. PRs #44, #46, #49, #51, #53 and #55 remain
draft/unmerged; none was marked ready.
