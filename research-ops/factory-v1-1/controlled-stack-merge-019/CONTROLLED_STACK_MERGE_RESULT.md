# ResearchOps Subscription Factory V1.1 — Controlled Stack Merge 019

**Task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CONTROLLED-STACK-MERGE-019`
**Governing Issue:** #66 · **Audit PR:** #67 · **Source Owner Closeout:** Issue #64 / PR #65
**Role:** closeout / one-time control-plane publication · **Decision:** **`FACTORY_V1_1_STACK_PUBLISHED_TO_MAIN`**

## Owner authorization

- Command: `AUTHORIZE CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CONTROLLED-STACK-MERGE-019`
- Type: `FACTORY_CONTROLLED_STACK_MERGE_TO_MAIN_ONCE` · target `main` · fast-forward-only · **force not allowed**.
- Exactly one temporary authorization is true during execution — `factoryMergeToMainAuthorized` — and is **consumed** after Stage 2. It authorizes no `master`, production, deploy, import, activation, ranking, CTA, promo, affiliate route, publication, sitemap, indexability, MIGRATION_5, research-record merge or Binance.

## Frozen setup

| Field | Value |
| --- | --- |
| Approved base (closed stack head) | `3bc4b5e400cb292d73d5f1b77edd356ace02547d` |
| Task branch | `closeout/researchops-factory-v1-1-controlled-stack-merge-019` |
| Frozen setup HEAD | `a37c0a6c0ad51d7a1ea56b0304b2efbe5eb3e474` |
| Isolated worktree | `C:\projects\CryptoBonusWorld-stack-merge-019` |

Setup added exactly the canonical triple (contract/state/prompt), additions only, with exactly one
true authorization (`factoryMergeToMainAuthorized`) and 17 false. Enforcement resolves to
**DESCENDANT**; the frozen setup boundary `a37c0a6` is uniquely discovered.

## Preflight (all passed before any write)

- `origin/main` = `04157b9dfb140918a8569a5026da747b429e5ed3` (exact baseline); `origin/master` = `998fcedd7d9febbec5b130d4765dfeaafc40960b`.
- Closed stack head `3bc4b5e` descends the main baseline; the ordered ancestry chain of all eleven PR heads is linear and verified.
- Cumulative baseline→stack diff = **88 files**, touching only `.github/workflows/cbw-researchops-factory-validate.yml` and `research-ops/factory-v1-1/**`. No `src/`, `public/`, `data/`, `owner-ops/`, `research-ops/tasks/`, `research-ops-pilot/`, OKX, page/design/production/canonical surface touched.
- `node --check` clean; fixtures **206 passed / 0 failed**; `git diff --check` clean.
- Owner Closeout 018 = `FACTORY_V1_1_CLOSED_READY_FOR_SEPARATE_MERGE_AUTHORIZATION`; Final Acceptance 017 = `VALIDATED_FOR_OWNER_CLOSEOUT`.

## Ordered factory stack (published)

| PR | Head | Head branch |
| --- | --- | --- |
| 44 | `02997bb` | feat/researchops-subscription-factory-v1-1 |
| 46 | `2f95f8a` | validation/…-009 |
| 49 | `2b9fecd` | correction/…-010 |
| 51 | `a958f0c` | validation/…-correction-011 |
| 53 | `d3ed112` | correction/…-v2-012 |
| 55 | `acd83d1` | validation/…-v2-013 |
| 57 | `9352e59` | correction/…-v3-014 |
| 59 | `07d0e38` | validation/…-v3-015 |
| 61 | `1e7c355` | correction/…-v4-016 |
| 63 | `71ad9ae` | validation/…-final-acceptance-017 |
| 65 | `3bc4b5e` | closeout/…-owner-closeout-018 |

## Stage 1 — publish the closed factory stack (COMPLETE)

- Method: ordinary **non-force fast-forward** push. No force/reset/rebase/squash/cherry-pick/admin bypass/branch-protection change.
- Command: `git push origin 3bc4b5e400cb292d73d5f1b77edd356ace02547d:refs/heads/main`
- Ref update: `04157b9..3bc4b5e  3bc4b5e400cb292d73d5f1b77edd356ace02547d -> main`
- After: `origin/main` = `3bc4b5e400cb292d73d5f1b77edd356ace02547d`; `origin/master` = `998fcedd7d9febbec5b130d4765dfeaafc40960b` (unchanged).

## Stage 2 — publish the audit result commit (pending green workflow)

After the factory workflow on this result commit is green under DESCENDANT protected-base
enforcement, `origin/main` is fast-forwarded from `3bc4b5e` to the exact Merge-019 result commit,
then re-verified. Run id, step statuses, and the final `main` SHA are recorded below and in the Final
Report.

<!-- STAGE2_OBSERVED -->

## Authorization consumption

On successful Stage 2 the one-time `factoryMergeToMainAuthorized` is **consumed**; all 18 active
authorizations are `false`.

## Prohibitions honored

`master` unchanged; no deploy; no production/application/design/page/canonical/staging change; no
Binance pilot created or run; no force/rewrite; no branch deletion; no branch-protection change; no
individual PR merge or retarget.
