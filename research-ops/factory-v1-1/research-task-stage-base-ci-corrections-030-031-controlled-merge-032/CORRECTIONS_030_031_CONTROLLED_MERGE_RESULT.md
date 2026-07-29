# Corrections 030 + 031 Controlled Merge 032 — Canonical Recovery Result

**Task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-STAGE-BASE-CI-CORRECTIONS-030-031-CONTROLLED-MERGE-032`  
**Governing Issue:** #90  
**Decision:** **`CORRECTIONS_030_031_PUBLISHED_TO_MAIN`**

> This immutable result is written after successful Stage 1 and before the replacement result workflow and Stage 2. The decision becomes final only after the exact replacement result commit receives a green governance workflow and `main` is fast-forwarded to that commit. This file is not amended afterward.

## Accepted source stack

```text
main baseline:
dcc8069d0028bf1bf2b1cdc5d79f7e6b96897bd1

Correction 030:
15c3c65a0b7578a1c64ebda2ce6e924ed97df31c

Remediation 031 / cumulative source head:
70526b5c53266cfc9639ffe60962846f9701ce38
```

The source stack was verified as exactly 10 commits ahead, zero behind, with merge base equal to the exact baseline. Its changed paths are restricted to the accepted Factory implementation files and governed records for tasks 030 and 031. No research-task, application, production, canonical data, ranking, CTA, promo, affiliate, publication, sitemap, indexability, MIGRATION_5 or deploy change is present.

## Source validation

- PR #87 and PR #89 were open, draft and unmerged at their accepted exact heads before publication.
- Correction 030 workflow `30451912255`: success.
- Remediation 031 workflow `30462993550`: success.
- Fixtures: `301 passed / 0 failed`.
- Source task authorizations: all 18 false.
- Protected PR #69: `923c2b58406f84b4355094f2e71f20a1931f70ea`, unchanged.
- Protected `master`: `998fcedd7d9febbec5b130d4765dfeaafc40960b`, unchanged.

## Stage 1 — complete

`main` was updated by ordinary non-force fast-forward only:

```text
dcc8069d0028bf1bf2b1cdc5d79f7e6b96897bd1
→
70526b5c53266cfc9639ffe60962846f9701ce38
```

No PR merge button, force, reset, rebase, squash, cherry-pick, synthetic replacement tree, admin bypass or branch-protection change was used.

## First closeout setup — rejected and preserved

The first audit PR #91 was closed without merge. Workflow `30472518061` rejected its setup because the prompt was named `OWNER_..._PROMPT.md`, while Factory requires `CLAUDE_<PREFIX>_PROMPT.md`.

Its exact head remains immutable evidence:

```text
20d94b926adac4000dd7945aad08408dfe9d9d17
```

It is not part of `main`, was not amended or force-pushed, and grants no authority.

## Canonical replacement setup

Replacement PR #92 starts from exact Stage-1/source head `70526b5…` and introduces exactly:

- `CORRECTIONS_030_031_CONTROLLED_MERGE_CONTRACT.md`
- `CORRECTIONS_030_031_CONTROLLED_MERGE_STATE.json`
- `CLAUDE_CORRECTIONS_030_031_CONTROLLED_MERGE_PROMPT.md`

Frozen setup head:

```text
e7b7b9ab3e53de88d0996f7a222a1016ef1c60af
```

Those three files are immutable.

## Replacement result commit

This audit commit adds exactly:

- `CORRECTIONS_030_031_CONTROLLED_MERGE_RESULT.json`
- `CORRECTIONS_030_031_CONTROLLED_MERGE_RESULT.md`

No third audit commit is permitted.

## Stage 2 — pending at record creation

Required next actions inside this already authorized task:

1. require the real workflow on this exact result commit to succeed with all steps executed;
2. require `ENFORCEMENT: DESCENDANT`, `BOUNDARY mode=FACTORY_GOVERNANCE`, `RESULT: BOUNDARY OK`, and `301/0` fixtures;
3. ordinary non-force fast-forward `main` from `70526b5…` to this exact result commit;
4. verify final refs, cumulative allowlist, unchanged `master` and unchanged PR #69;
5. consume `factoryMergeToMainAuthorized`;
6. close PRs #87/#89 and Issues #86/#88/#90 as published by controlled fast-forward;
7. close replacement PR #92 without merge after its exact head is reachable from `main`;
8. leave Issues #84/#85 and PR #69 open.

## Authorization boundary

Only `factoryMergeToMainAuthorized` is temporarily true during Controlled Merge 032. All other authorizations remain false. After successful Stage 2 the temporary authority is consumed and all 18 active authorizations are false.

No Source Truth Review, research rewrite, import, production change, deploy, ranking, CTA, promo, affiliate, publication, sitemap, indexability or MIGRATION_5 action is part of this task.
