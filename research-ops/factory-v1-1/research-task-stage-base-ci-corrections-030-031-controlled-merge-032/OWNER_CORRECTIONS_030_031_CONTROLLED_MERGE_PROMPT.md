# Owner execution prompt — Corrections 030 + 031 Controlled Merge 032

## Task

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-STAGE-BASE-CI-CORRECTIONS-030-031-CONTROLLED-MERGE-032`

Governing Issue: **#90**  
Source PRs: **#87** and **#89**  
Protected pilot: **#69**  
Expected branch: `closeout/researchops-subscription-factory-v1-1-research-task-stage-base-ci-corrections-030-031-controlled-merge-032`

## Owner authority

The owner authorized only the exact two-stage ordinary non-force fast-forward publication in the contract. Only `factoryMergeToMainAuthorized` is temporarily true. No `master`, production, deploy, import, research-record merge, Binance task mutation, Source Truth Review, ranking, CTA, promo, affiliate, publication, sitemap, indexability or MIGRATION_5 authority exists.

## Required execution

1. Verify the frozen setup triple and exact branch/base identity.
2. Revalidate refs, source PR heads, source workflow runs, source ancestry, cumulative allowlist, source authorizations and protected PR #69.
3. Stage 1: ordinary non-force fast-forward `main` from `dcc8069d...` to `70526b5c...`.
4. Create exactly the two result records declared by the contract. They must record Stage 1 as complete and Stage 2 as pending, while setting decision `CORRECTIONS_030_031_PUBLISHED_TO_MAIN` contingent on the green result workflow and final fast-forward.
5. Wait for the real workflow on the exact result commit and require complete success under `DESCENDANT / FACTORY_GOVERNANCE / BOUNDARY OK`.
6. Stage 2: ordinary non-force fast-forward `main` from `70526b5...` to the exact result commit.
7. Verify final refs and cumulative allowlist; consume temporary authority.
8. Comment and close PRs #87/#89 and Issues #86/#88/#90 as completed by controlled fast-forward, without deleting branches.
9. Leave Issues #84/#85 and PR #69 open and unchanged.

## Hard stops

Stop fail-closed on any ref, ancestry, diff, workflow, authorization, branch, setup, protected-pilot or push mismatch. Never force, reset, rebase, squash, cherry-pick, use a PR merge button, rewrite setup/result history, create a third audit commit, modify `master`, mutate PR #69, begin Source Truth Review, import or deploy.

## Final decision

Exactly one:

- `CORRECTIONS_030_031_PUBLISHED_TO_MAIN`
- `CORRECTIONS_030_031_CONTROLLED_MERGE_BLOCKED`
