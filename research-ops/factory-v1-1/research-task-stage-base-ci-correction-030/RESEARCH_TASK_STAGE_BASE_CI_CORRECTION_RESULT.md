# Research-Task Stage-Base CI Correction 030 — Result

**Task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-STAGE-BASE-CI-CORRECTION-030`
**Governing Issue:** #86 · **Role:** correction
**Decision:** **`RESEARCH_TASK_STAGE_BASE_CI_CORRECTION_READY_FOR_OWNER_APPROVAL`**

> READY does not authorize merge. The correction PR is left draft/open/unmerged for
> independent owner audit.

## Defect (from blocked capture 029 / PR #69 run 30446016864)

The research-task boundary evaluated the stage transition from the trusted PR base
(`main`). The Binance task root is **absent** at that base, so `stage.mjs`
`checkStageTransition` set `isCreation = !taskExistsAtBase = true` and required head state
`PREPARED`, rejecting `RESEARCH_CAPTURED` and every populated `20-research-output/*` file
as "not part of the deterministic factory skeleton". Cumulative diff base was
`babe80f… → 923c2b5…`; the real capture segment is `6ce489f… → 923c2b5…`.

## Fix — two simultaneous layers

**Layer A (unchanged).** Cumulative trusted `PR base → head` path scope: exactly one
governed task root, no factory/workflow/application/other-root escape, forbidden-area and
deletion/rename guards, task identity and branch binding. No path-scope check was removed
or narrowed to the last commit.

**Layer B (new).** When the task root is absent at the PR base, the CLI resolves the
task's real mutation chain from **trusted Git objects only**: it walks the trusted head's
**complete first-parent ancestry** and records only commits whose task-root **tree object**
changes. Each such edge is a mutation segment; the introduction is the edge with a null
base tree. The pure `checkStageTransition` / `checkHistoryAppendOnly` rules (unchanged) then
validate the introduction as `ABSENT → PREPARED` and every later segment separately.

Fails closed on: root-changing merge, task-root deletion, more than one introduction
(re-introduction / parallel history), earliest edge not an introduction, non-contiguous
tree, head tree ≠ final segment head tree, and any skipped/rewritten/earlier-stage/extra/
missing/two-root/mixed-path/identity/branch violation. A main-sync merge whose task-root
tree equals its first parent produces no segment and is ignored. Never trusts commit
messages, authors, timestamps, comments, PR body, mutable task fields, environment SHAs, or
`HEAD^` as a shortcut.

## Modified files (all within allowlist; minimal)

- `research-ops/factory-v1-1/lib/taskhistory.mjs` — **new**, pure/dependency-free
  (`resolveMutationChain` with injected Git accessors + `gitAccessors`).
- `research-ops/factory-v1-1/lib/boundary.mjs` — validate a CLI-resolved mutation chain
  per segment when present; cumulative path otherwise (unchanged).
- `research-ops/factory-v1-1/bin/researchops.mjs` — resolve/enrich the chain from Git and
  emit `TASK_CHAIN` / `TRANSITION` / `TRANSITION_BASE_SHA` / `TRANSITION_HEAD_SHA`.
- `research-ops/factory-v1-1/fixtures/run.mjs` — 25 regression fixtures.

`stage.mjs` and `.github/workflows/cbw-researchops-factory-validate.yml` were **not**
modified. `stage.mjs`'s canonical transition/inventory/history rules are reused verbatim.

## Exact pilot reproduction (real commits, read-only)

```text
BOUNDARY mode=RESEARCH_TASK taskRoots=[research-ops/tasks/CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001]
TASK_CHAIN root=research-ops/tasks/CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001
TRANSITION ABSENT -> PREPARED base=f62c1fb3fc2a66e57e6b023b8eb5b91f2f34500a head=bf0a0932325be00aad08ec3db31aef1af9df2384
TRANSITION PREPARED -> RESEARCH_CAPTURED base=6ce489ff10655f65e62a76d1a5635aa80e73b44a head=923c2b58406f84b4355094f2e71f20a1931f70ea
TRANSITION_BASE_SHA=6ce489ff10655f65e62a76d1a5635aa80e73b44a
TRANSITION_HEAD_SHA=923c2b58406f84b4355094f2e71f20a1931f70ea
RESULT: BOUNDARY OK
```

Trusted PR base `babe80f…`, head `923c2b5…`, branch `research/kz-binance-kz-p0-d`, base
`main`; one task root; first-parent depth walked = 71; validate `--require-package` at
`923c2b5…` = **30/30 VALID**.

## Fixtures

**260 passed / 0 failed** (was 235; **+25**). Topology (`030-1..8`): creation, capture,
unchanged main-sync merge ignored, root-changing merge fails, `HEAD^` not authority,
re-introduction fails, absent-at-head fails, unrelated commits skipped. Boundary
(`030-9..25`): capture passes, creation passes, and failures for skipped state, rewritten/
truncated history, earlier-stage mutation, twelfth output file, non-PREPARED introduction,
incomplete skeleton, head-tree mismatch, unresolved chain, branch mismatch, id/root
mismatch, two roots, mixed research/factory, missing output file, authorization floor.

## Validation & unchanged evidence

`node --check` clean; fixtures 260/0; pilot reproduction `BOUNDARY OK`; `--require-package`
30/30 VALID; `git diff --check` clean; 4 changed files, all in the allowlist. `main`
`dcc8069…`, `master` `998fced…`, pilot **PR #69 `923c2b5…` unchanged**; Issues #84/#85/#86
open. **All 18 authorizations false.**

## Commits

- Implementation: `4d8db189683e49cdde6e4d227d67d8206e76696f` (4 allowlist files).
- Recording: this commit (the two result records). Real correction-PR workflow evidence is
  in the external final report.

## Limitations & next step

Control-plane Factory CI logic only. It does not re-run/modify/merge PR #69, capture the
Binance research, or begin Source Truth Review. After independent owner audit and approval,
a **separate** authorization merges this correction to `main`; the KZ-Binance inline-handoff
capture (029) can then be re-run against the corrected workflow so PR #69 validates
`PREPARED → RESEARCH_CAPTURED`.
