# Research-Task Stage-Base CI Owner-Audit Remediation 031 — Result

**Task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-STAGE-BASE-CI-OWNER-AUDIT-REMEDIATION-031`
**Governing Issue:** #88 · **Role:** correction (stacked on Correction 030 `15c3c65…`)
**Decision:** **`RESEARCH_TASK_STAGE_BASE_CI_OWNER_AUDIT_REMEDIATION_READY_FOR_OWNER_APPROVAL`**

> READY does not authorize merge. PR #89 is left draft/open/unmerged for independent owner audit.

## Owner-audit findings remediated (PR #87 comment `5118616501`)

**A — segment diff failure became an empty valid record set.** `scopeSegmentDiff()` now
returns an explicit `{ ok:true, records }` or `{ ok:false, errorCode, detail }`. A `git diff`
command failure (`DIFF_FAILED`) or a malformed NUL name-status stream (`MALFORMED_DIFF`)
blocks; a genuinely empty successful diff stays distinguishable (`ok:true, records:[]`); a
mutation edge that produces an empty diff is rejected. Errors propagate into the per-segment
`mutationChain` violations and the boundary result.

**B — Git accessor errors conflated with legitimate topology/absence.** Typed accessors
`commitParents(sha) → {ok,parents}|{ok:false,error}` and
`treeOid(sha) → {ok,present,oid}|{ok,present:false}|{ok:false,error}` distinguish
**VALUE / LEGITIMATE_ABSENCE / ACCESS_ERROR**. A command failure can no longer masquerade as
a true root commit, an absent task root, or a non-merge; any accessor error fails the chain
closed. Root-changing-merge rejection and unchanged-main-sync-merge behaviour are intact; no
`HEAD^` shortcut or environment transition SHA.

**C — historical segment heads not fully validated.** Every mutation-segment head is now
validated with the canonical `validateTask` against the exact historical Git tree,
materialized in a **detached temporary worktree** (OS temp path, `core.autocrlf=false`/`eol=lf`
so the tree equals the canonical LF blobs, cleanup in `finally`). This covers TASK_STATE
parse/shape/history, IDENTITY + GITHUB_PLAN shape/cross-binding, authorization floor,
declared-state/evidence consistency, state-required package presence + full
inventory/JSON/manifest/ID/reference validity, and stage/unsafe-entry checks. An **immutable
identity projection** (`schemaVersion, factoryVersion, taskId, project, countryCode,
exchangeId, batchId, priority, createdAt, branch, requiredResearchInventory`) is frozen from
the introduction head and every later head must match it exactly. The **same-state repair
rule** rejects a package-requiring state whose package is incomplete at that exact commit,
even if a later same-state commit completes it. A transient `deployAuthorized=true`, a
changed-then-restored identity/branch, or an incomplete capture is blocked at the commit
where it exists.

## Modified files (allowlist; minimal)

- `lib/taskhistory.mjs` — typed accessors + explicit `scopeSegmentDiff`.
- `lib/taskhistoryvalidate.mjs` — **new** pure helper: `materializeAndValidate`,
  `checkIdentityProjection`, `validateHistoricalChain`, `stateRequiresPackage`.
- `bin/researchops.mjs` — typed `runGit`, `segmentRecords`, historical deps (temp worktree),
  per-segment enrichment + evidence.
- `lib/boundary.mjs` — fold per-segment R031 findings (segment-diff, historical, identity).
- `fixtures/run.mjs` — 41 regression fixtures.

`stage.mjs`, `validate.mjs`, `package.mjs`, `schema.mjs`, `authz.mjs`, `model.mjs` and the
workflow are **unchanged**.

## Exact pilot reproduction (PR #69 commits, read-only)

```text
BOUNDARY mode=RESEARCH_TASK taskRoots=[research-ops/tasks/CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001]
TASK_CHAIN root=research-ops/tasks/CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001
TRANSITION ABSENT -> PREPARED base=f62c1fb… head=bf0a093…
HISTORICAL_VALIDATION head=bf0a093… ok=true passed=19/19 requirePackage=false
TRANSITION PREPARED -> RESEARCH_CAPTURED base=6ce489ff10655f65e62a76d1a5635aa80e73b44a head=923c2b58406f84b4355094f2e71f20a1931f70ea
HISTORICAL_VALIDATION head=923c2b5… ok=true passed=30/30 requirePackage=true
TRANSITION_BASE_SHA=6ce489ff10655f65e62a76d1a5635aa80e73b44a
TRANSITION_HEAD_SHA=923c2b58406f84b4355094f2e71f20a1931f70ea
RESULT: BOUNDARY OK
```

## Fixtures & validation

**301 passed / 0 failed** (260 → **+41**): Remediation A (`031-A1..4`), typed Git access
(`031-B1..9`), historical validation + identity projection + same-state + cleanup
(`031-C-id*`, `031-C1..16`), and one **real temporary-Git integration** fixture
(`031-INT`) that builds a two-commit repo and runs the historical validator across the
`PREPARED` and `RESEARCH_CAPTURED` heads. `node --check` clean; `git diff --check` clean; 5
changed files, all in the allowlist; frozen setup + Correction 030 records byte-identical.

## Unchanged evidence & authorizations

`main` `dcc8069…`, `master` `998fced…`, PR #87 `15c3c65…`, **PR #69 `923c2b5…` unchanged**;
Issues #84/#85/#86/#88 open; PR #89 draft/open/unmerged. **All 18 authorizations false.**

## Commits

- Implementation `eba1d26a39e8bb180b9728f08a0698f3ed03bc65` (5 allowlist files).
- Recording: this commit (the two result records). Real PR #89 workflow evidence is in the
  external final report.

## Limitations & next step

Control-plane Factory CI logic only — did not re-run/modify/merge PR #69, capture the Binance
research, or begin Source Truth Review. After independent owner audit and approval, a
**separate** authorization merges Corrections 030+031 to `main`; the KZ-Binance
inline-handoff capture (029) can then be re-run against the hardened workflow so PR #69
validates `PREPARED → RESEARCH_CAPTURED` with full historical validation.
