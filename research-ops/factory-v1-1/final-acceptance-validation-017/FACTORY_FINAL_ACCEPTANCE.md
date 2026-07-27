# ResearchOps Subscription Factory V1.1 — Final Acceptance 017

**Task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-FINAL-ACCEPTANCE-VALIDATION-017`
**Governing Issue:** #62 · **Source V4:** Issue #60 / PR #61 · **Final Acceptance PR:** #63
**Role:** validation (independent) · **Decision:** **`VALIDATED_FOR_OWNER_CLOSEOUT`**

## Identity and frozen baseline

| Field | Value |
| --- | --- |
| Approved base SHA | `1e7c35526edc9e251d87cbd741ce1cc4acc09293` |
| Validation branch | `validation/researchops-factory-v1-1-final-acceptance-017` |
| Frozen setup HEAD | `d9677c1e04d27749e1e6148396d53a9924c7b70f` |
| Base branch | `correction/researchops-factory-v1-1-v4-016` |
| Isolated worktree | `C:\projects\CryptoBonusWorld-final-acceptance-017` |

The setup phase (approved base → frozen setup) adds exactly the canonical setup triple, additions
only, across three setup-only commits:

- `FINAL_ACCEPTANCE_CONTRACT.md`
- `FINAL_ACCEPTANCE_STATE.json`
- `CLAUDE_FINAL_ACCEPTANCE_PROMPT.md`

The governed `FINAL_ACCEPTANCE_STATE.json` binds the exact task ID, head branch, base branch,
approved base SHA (`1e7c355…`) and `role: validation`. All 18 authorizations in it are `false`.

## Baseline immutability

- PR #61 head is `1e7c355…`, draft and unmerged; PR #63 draft and unmerged; all ten open factory PRs draft.
- R2 source diff `c3c6cd1…1e7c355` contains **exactly six** files (workflow, `bin/researchops.mjs`,
  `lib/bootstrap.mjs`, `fixtures/run.mjs`, and the two V4 result records).
- Prior frozen governance/validation/correction/OKX/`research-ops/tasks/**` records unchanged by setup.
- `origin/main` `04157b9…` and `origin/master` `998fced…` remain frozen.

## R1 / R2 evidence (independently reconfirmed)

| Run | Head | Conclusion | Enforcement steps |
| --- | --- | --- | --- |
| R1 `30303380262` | `c3c6cd1` | success | all executed |
| R2 `30304979987` | `1e7c355` | success | all executed |

Every enforcement step (exact-head checkout, syntax-check, fixtures, event/checkout integrity,
enforcement-root resolution, append-only boundary, task-root validation) reported `success`.

## Independent reruns

- `node --check` on every factory `.mjs`: **clean**.
- Fixtures: **206 passed / 0 failed**.
- `git diff --check`: **clean**.
- CLI smoke: `create` → 11-file `PREPARED` skeleton; `status` consistent; `validate` **VALID 19/19**;
  `check-boundary` (research-task) → **BOUNDARY OK**.

## Critical gates A–F

| Gate | Verdict | Proof |
| --- | --- | --- |
| **A** — real DESCENDANT setup path | **PASS** | Base carries V4 policy → `ENFORCEMENT: DESCENDANT`; protected-base validator uniquely discovers frozen setup `d9677c1`; governed state read from frozen setup; worker diff frozen-setup→head accepts exactly the two result files. Reproduced in a real temporary Git graph. |
| **B** — no self-authorization | **PASS** | Validation role rejected for implementation change, workflow change, a third result file, and setup-file mutation after freeze; head-only authority fails (no governed record on the approved base); Issue #60/PR #61 bootstrap does not authorize this task. |
| **C** — identity / ancestry / checkout | **PASS** | Checked-out HEAD must equal trusted head SHA (mismatch rejected); non-descendant head rejected; wrong diff endpoint (approved base) surfaces setup files as immutable and is rejected; missing setup boundary rejected; non-shallow and workspace-root equality required. |
| **D** — canonical skeleton | **PASS** | Exact skeleton bytes accepted; safety-text/content substitution, symlink and executable entries rejected (V4-C5/b/c/d). |
| **E** — real merge proof | **PASS** | All-zero SHA rejected; only repository-backed, main-reachable, receipt-linked, task-scoped proof passes (V4-C6). |
| **F** — authorization / production isolation | **PASS** | Forbidden authorization `true`, nested forbidden `true`, owner receipt escalating to production, and target=`master` all rejected; no merge/import/production/activation/deploy/Binance/master authority exists. |

## Real temporary Git-graph proof

A throwaway repository reproduced the Validation-017 descendant structure (V4 policy at base →
three setup-only commits → one result commit with two files). From the **protected base** policy:

- `discover-setup-boundary` → `FROZEN_SETUP_SHA=<frozen>` and `SETUP BOUNDARY OK` (unique).
- Worker diff frozen-setup→head with the two result files → `BOUNDARY mode=FACTORY_GOVERNANCE` / `RESULT: BOUNDARY OK`.
- Negative controls all fail closed: implementation change, workflow change, third result file,
  post-freeze setup mutation, diff evaluated from the approved base, missing setup boundary,
  non-descendant head, and head-only authorization.

## Accepted V1.1 backlog (non-blocking)

- **D** — broader current-record lifecycle refinements.
- **H** — additional marker outcome compatibility.
- **K** — richer ISO history event/timestamp semantics.

None yields a critical write, authority, merge-proof or production escape; none is a blocker.

## Workflow run

The factory workflow runs on each pushed commit of this branch. The final acceptance run id and
per-step statuses are recorded here and in the Final Report after the workflow completes on the
final commit. A passing decision requires: conclusion `success`; `ENFORCEMENT: DESCENDANT`; unique
frozen setup boundary discovered; protected-base validator used; boundary and task-root steps
succeed.

<!-- WORKFLOW_RUN_OBSERVED -->

## Decision

**`VALIDATED_FOR_OWNER_CLOSEOUT`** — owner-closeout ready. Next task on pass:
`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-OWNER-CLOSEOUT-018`. No V5 is created or proposed. No
implementation was repaired during validation. All 18 authorizations remain `false`.
