# ResearchOps Factory V1.1 — Correction V3 Independent Validation (Task 015)

- **Validation task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V3-VALIDATION-015`
- **Governing issue:** #58 · **Correction V3 PR:** #57 · **Validation PR:** #59
- **Authoritative implementation commit:** `69d8d564ebe1b5f277fe771a3e7769020522bd60`
- **Source recovery tip:** `9352e59e…` (tree-identical) · **Frozen initial correction head:** `78c56177…`
- **Control-plane:** `main@04157b9…` · **Production authority:** `master@998fced…`
- **Validated at:** 2026-07-27 · Node v24 (Node 20-compatible)

## Executive verdict

**`VALIDATED_WITH_CORRECTIONS_REQUIRED`.**

Correction V3 genuinely closed the twelve findings from Validation 013 — script-worktree
confinement, exact lineage, research head↔plan binding, frozen layers + workflow protection, exact
skeleton filenames, per-stage inventory, marker enums, cumulative correction, history integrity,
strict NUL-delimited name-status (verified against real `git diff -z`), non-vacuous minima and
control-byte rejection all pass and are regression-green (145/0 fixtures; read-only PR #57 runs on
the authoritative and recovery tips). The authorization floor is intact.

The mandatory new probes A–N, however, surfaced **ten reproducible residual gaps**, several of which
Issue #58 names as explicit disqualifiers for a clean owner-merge verdict: **validation-role
implementation write** (A), a **self-authorizing validator** (B), **branch-name (not commit-ancestry)
lineage** (C), **future-task lineage preauthorization** (E), **unsafe skeleton content substitution**
(F), and a **fabricated/unreachable merge record** (I). Correction V3 is therefore **not**
owner-merge-ready and requires a fourth correction pass.

## Recovery and baseline verification

- `69d8d56…9352e59` = **2 commits, 0 changed files**; trees identical (`11aedba…`). PR #57's current
  tree equals the authoritative implementation commit.
- Correction diff `78c5617…69d8d56` = exactly the reported **17 files**; all prior governance/
  validation/correction/pilot/task layers unchanged; `origin/main`/`origin/master` frozen; PR #57
  draft/unmerged.
- `node --check` CLEAN · fixtures **145/0** · `git diff --check` clean · CLI smoke (foreign-worktree
  create → exit 2, validate/status → exit 0, require-package → exit 1, check-boundary frozen/deletion/
  R101 → exit 1) all as expected.

## V3-C1–V3-C12 matrix

All **PASS** (regressions closed and independently verified). Residuals surfaced by the new probes:
C2→(C,E), C4→(A,D), C5→(F), C7→(H,I), C9→(K). C10 verified against **real** `git diff -z` (probe L).

## A–N adversarial probe matrix

| Probe | Verdict | Finding |
|---|---|---|
| A capability profiles | **CORRECTION_REQUIRED** | validation-role branch may modify boundary/lineage/workflow |
| B self-modifying validator | **CORRECTION_REQUIRED** | PR head can weaken boundary/lineage and be checked by its own code |
| C commit ancestry | **CORRECTION_REQUIRED** | governance from branch-name pair only; no SHA ancestry; recovery no-ops trusted |
| D current-record immutability | **CORRECTION_REQUIRED** | own setup contract mutable; arbitrary extra result files (prefix-only auth) |
| E future preauthorization | **CORRECTION_REQUIRED** | lineage pre-authorizes future validation-015; branch-string entries only |
| F skeleton content | **CORRECTION_REQUIRED** | filename-only; unsafe content substitution passes |
| G transition completeness | **PASS_WITH_NOTE** | jointly gated; OWNER_CLOSEOUT_REQUIRED has no marker-add inventory |
| H marker protocol | **CORRECTION_REQUIRED** | enum omits governed outcomes; identity via non-root task-id fallback |
| I merge record | **CORRECTION_REQUIRED** | all-zero/fabricated 40-hex accepted; no existence/reachability/receipt-hash |
| J receipt lifecycle | **PASS_WITH_NOTE** | floor holds; no all-false-matrix requirement / post-merge immutability |
| K history semantics | **CORRECTION_REQUIRED** | lexicographic timestamps; duplicate same-state; no event schema |
| L real NUL parser | **PASS** | matches real `git diff -z` (spaces, renames); rejects R101/truncated |
| M filesystem identity | **PASS_WITH_NOTE** | symlink/exec caught; Unicode/reserved-name unnormalized |
| N workflow/checkout | **CORRECTION_REQUIRED** | runs PR-head code; no HEAD==head.sha/workspace check; recovery no-op run failed |

## Material weaknesses

1. **Authorization architecture is role-blind and self-authorizing (A, B, HIGH).** Every factory
   lineage entry — including validation tasks — carries full implementation-write privilege, and the
   boundary/lineage/workflow the PR is validated by can be modified in that same PR head.
2. **Governance identity is branch-name-based and pre-seeds the future (C, E, HIGH).** No commit
   ancestry binding; the future validation branch is already authorized; entries lack task/role/
   inventory identity.
3. **Content and evidence integrity are shallow (F, I, H, K, HIGH/MEDIUM).** Skeleton content is not
   canonical-byte-verified; merge records need not reference a real reachable commit; marker enums
   diverge from the governed protocol; history timestamps are lexicographic.
4. **Current-record and workflow-checkout integrity are incomplete (D, N, MEDIUM).** Setup files are
   mutable via prefix auth; the workflow does not verify checkout HEAD against the trusted event SHA.

None breached the authorization floor — these are governance-architecture and validation-completeness
gaps, not privilege escalations.

## Workflow judgment

The workflow is read-only and fail-closed at discovery, and its actual PR #57 runs on the
authoritative (`69d8d56`) and recovery (`9352e59`) tips succeeded; the intermediate no-op commit
`2d82b87` produced a **failed** run, showing recovery is not cleanly reconciled. **A green run is not
sufficient:** the workflow runs boundary/lineage code the PR head can itself modify (B) and does not
verify checkout/metadata integrity (N).

## Merge-readiness judgment

**Not ready for owner-merge review.** Reproducible disqualifiers A, B, C, E, F, I (and N) are
present. The correct next step is a fourth correction pass, then re-validation.

**Next task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V4-016`.

## Authorization confirmation

This validation authorizes **no** merge, import, activation, production change, deploy or Binance
pilot. Every authorization in `FACTORY_CORRECTION_V3_VALIDATION.json` is **false**. `main`, `master`,
completed governance/validation/correction/OKX records and production were **not** modified. PRs #44,
#46, #49, #51, #53, #55, #57 and #59 remain draft/unmerged; none was marked ready.
