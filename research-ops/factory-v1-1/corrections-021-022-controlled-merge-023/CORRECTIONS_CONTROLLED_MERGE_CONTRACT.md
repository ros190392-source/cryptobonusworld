# ResearchOps Factory V1.1 — Corrections 021 + 022 Controlled Merge 023 Contract

**Task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTIONS-021-022-CONTROLLED-MERGE-023`  
**Governing Issue:** #75  
**Role:** closeout / one-time control-plane publication  
**Approved cumulative correction head:** `0ba2ff77acd1b107bde47609269184ab5d167fc5`  
**Expected main before Stage 1:** `f62c1fb3fc2a66e57e6b023b8eb5b91f2f34500a`  
**Protected master:** `998fcedd7d9febbec5b130d4765dfeaafc40960b`

## Owner authority

The owner issued exactly:

```text
AUTHORIZE CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTIONS-021-022-CONTROLLED-MERGE-023
```

This authorizes one controlled fast-forward publication of the stacked Corrections 021 + 022 to control-plane `main`. Only `factoryMergeToMainAuthorized` may be temporarily true during execution. The authority is consumed after successful Stage 2.

It does not authorize `master`, production, deploy, imports, research-record merge, ranking, CTA, promo, affiliate routing, publication, sitemap, indexability, MIGRATION_5, Binance research, or mutation of PR #69.

## Exact correction stack

```text
main baseline: f62c1fb3fc2a66e57e6b023b8eb5b91f2f34500a
Correction 021: 8f6b1e635cca28e7dce6ca160ae7b68d7f258f0f
Correction 022: 0ba2ff77acd1b107bde47609269184ab5d167fc5
```

The cumulative head must be a direct descendant of the exact main baseline. PR #71 and PR #73 must remain open, draft, and unmerged at their exact accepted heads before Stage 1.

## Required preflight

Before any `main` write, verify:

1. `origin/main` equals the expected baseline.
2. `origin/master` equals the protected SHA.
3. Correction 021 and 022 workflow runs are green.
4. Fixtures pass `235 / 0` at the cumulative head.
5. `node --check` and `git diff --check` are clean.
6. The cumulative diff changes only the factory workflow, fixtures, `lib/validate.mjs`, and governed records for Corrections 021/022.
7. No real research task, application, production, canonical, design/page, OKX, or Binance task file is changed.
8. The Merge-023 setup triple is unchanged and the worker diff contains only the two result records.

Any mismatch blocks publication.

## Publication

### Stage 1

Use one ordinary non-force fast-forward update of `refs/heads/main` from `f62c1fb...` to `0ba2ff7...`.

### Stage 2

After Stage 1:

1. create exactly the two Merge-023 result records;
2. commit and push only those records to the audit branch;
3. wait for the real protected-base DESCENDANT workflow to succeed;
4. use one ordinary non-force fast-forward update of `main` from `0ba2ff7...` to the green audit result commit;
5. verify final `main` and unchanged `master`;
6. consume the temporary authorization and restore the all-false authorization floor;
7. close PRs #71 and #73 as superseded by controlled fast-forward publication, without deleting branches;
8. close Issue #70 as completed and leave Issue #68 / PR #69 unchanged.

Do not create a third audit-recording push. Post-publication closure evidence belongs in GitHub comments and the final external report.

## Worker write boundary

The worker may create exactly:

```text
CORRECTIONS_CONTROLLED_MERGE_RESULT.json
CORRECTIONS_CONTROLLED_MERGE_RESULT.md
```

inside this directory. The contract, state, and prompt are immutable after setup.

## Decisions

Use exactly one:

- `CORRECTIONS_021_022_PUBLISHED_TO_MAIN`
- `CORRECTIONS_021_022_CONTROLLED_MERGE_BLOCKED`

## Hard prohibitions

No force, force-with-lease, reset, rebase, squash, cherry-pick, PR merge button, admin bypass, branch-protection change, branch deletion, `master` write, production/deploy/import mutation, Binance research, or PR #69 branch mutation.