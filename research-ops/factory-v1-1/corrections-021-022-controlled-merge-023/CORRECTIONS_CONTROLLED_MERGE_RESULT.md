# ResearchOps Factory V1.1 — Corrections 021 + 022 Controlled Merge 023

**Task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTIONS-021-022-CONTROLLED-MERGE-023`
**Governing Issue:** #75 · **Audit PR:** #76 · **Source corrections:** PR #71 (Issue #70) + PR #73 (Issue #72)
**Role:** closeout / one-time controlled publication · **Decision:** **`CORRECTIONS_021_022_PUBLISHED_TO_MAIN`**

> Two-stage ordinary non-force fast-forward. Only `factoryMergeToMainAuthorized` is temporarily true;
> it is consumed after Stage 2. Stage 2 is **pending** the green audit workflow and one final
> fast-forward; the external Final Report supplies the post-Stage-2 evidence.

## Owner receipt
`AUTHORIZE CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTIONS-021-022-CONTROLLED-MERGE-023` — type `FACTORY_CONTROLLED_MERGE_TO_MAIN_ONCE`, fast-forward-only, force not allowed. No `master`/production/deploy/import/research-record-merge/Binance/PR #69 authority.

## Frozen setup
| Field | Value |
| --- | --- |
| Approved base (cumulative head) | `0ba2ff77acd1b107bde47609269184ab5d167fc5` |
| Audit branch | `closeout/researchops-factory-v1-1-corrections-021-022-controlled-merge-023` |
| Frozen setup HEAD | `686e77765d49e07055264f9713f93b423eca0a9c` |

Setup added exactly the canonical triple (contract/state/prompt), additions-only, with exactly one true authorization (`factoryMergeToMainAuthorized`) and 17 false. Setup files unmodified.

## Preflight (all passed before any write)
- `origin/main` = `f62c1fb…` (baseline); `origin/master` = `998fced…`.
- Ancestry `f62c1fb → 8f6b1e6 → 0ba2ff7`; `merge-base(main, 0ba2ff7)` = `f62c1fb` (pure fast-forward).
- PR #71 OPEN/draft/unmerged head `8f6b1e6`; PR #73 OPEN/draft/unmerged head `0ba2ff7`.
- Source runs: Correction 021 `30343390597` **success**; Correction 022 `30346959530` **success**.
- At cumulative head: `node --check` clean; fixtures **235 passed / 0 failed**; `git diff --check` clean.
- Pilot read-only smoke: `ENFORCEMENT: RESEARCH_TASK (protected base policy)` → `BOUNDARY mode=RESEARCH_TASK` → `RESULT: BOUNDARY OK` → task-root `RESULT: VALID`.
- Cumulative diff `f62c1fb…0ba2ff7` = **13 files**, only workflow + `fixtures/run.mjs` + `lib/validate.mjs` + `research-task-ci-correction-021/**` + `prepared-output-dir-validation-correction-022/**`. No `research-ops/tasks/**`, `src/**`, `public/**`, data/canonical, owner-ops, production, page/design, OKX or Binance change.

## Stage 1 — publish the cumulative corrections (COMPLETE)
- Method: ordinary **non-force fast-forward**. No force/reset/rebase/squash/cherry-pick/PR-merge/admin-bypass/protection change.
- Command: `git push origin 0ba2ff77acd1b107bde47609269184ab5d167fc5:refs/heads/main`
- Ref update: `f62c1fb..0ba2ff7  0ba2ff77acd1b107bde47609269184ab5d167fc5 -> main`
- After: `origin/main` = `0ba2ff77acd1b107bde47609269184ab5d167fc5`; `origin/master` = `998fcedd7d9febbec5b130d4765dfeaafc40960b` (unchanged).

## Stage 2 — publish the audit result commit (pending green workflow)
After the audit workflow on this result commit is green under DESCENDANT protected-base enforcement
(`ENFORCEMENT: DESCENDANT (protected base policy)`, `BOUNDARY mode=FACTORY_GOVERNANCE`,
`RESULT: BOUNDARY OK`), `origin/main` is fast-forwarded once from `0ba2ff7` to the exact audit result
commit. No third audit-recording commit or third `main` push is created. Final `main` SHA and closures
are in the external Final Report.

## Authorization consumption
On successful Stage 2 the one-time `factoryMergeToMainAuthorized` is **consumed**; all 18 active authorizations are `false`.

## Prohibitions honored
`master` unchanged; no deploy/import; no production/page/design/canonical change; no Binance research or `20-research-output` population; no force/rewrite/PR-merge/branch-protection change/branch deletion; PR #69 not updated or rerun; no V5. The accidentally created PR #74 is already closed (a non-mutating owner setup mistake) and is not reopened.
