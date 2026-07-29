# Corrections 030 + 031 Controlled Merge 032 Contract

**Task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-STAGE-BASE-CI-CORRECTIONS-030-031-CONTROLLED-MERGE-032`  
**Governing Issue:** #90  
**Role:** closeout / one-time control-plane publication

## Owner authorization

The owner issued exactly:

```text
AUTHORIZE CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-STAGE-BASE-CI-CORRECTIONS-030-031-CONTROLLED-MERGE-032
```

Only `factoryMergeToMainAuthorized` may be temporarily true during this task. It is consumed after successful Stage 2. Every other authorization remains false.

## Exact refs

```text
underlying main baseline:
dcc8069d0028bf1bf2b1cdc5d79f7e6b96897bd1

Correction 030 head:
15c3c65a0b7578a1c64ebda2ce6e924ed97df31c

Correction 031 cumulative head / approved stacked base:
70526b5c53266cfc9639ffe60962846f9701ce38

protected master:
998fcedd7d9febbec5b130d4765dfeaafc40960b

protected PR #69 head:
923c2b58406f84b4355094f2e71f20a1931f70ea
```

## Publication procedure

### Stage 1

After full preflight, update `refs/heads/main` by ordinary non-force fast-forward only:

```text
dcc8069d0028bf1bf2b1cdc5d79f7e6b96897bd1
→
70526b5c53266cfc9639ffe60962846f9701ce38
```

### Stage 2

After Stage 1 succeeds:

1. Add exactly two result records in this directory.
2. Wait for the real workflow on the exact result commit to succeed.
3. Update `refs/heads/main` by ordinary non-force fast-forward from `70526b5...` to that exact result commit.
4. Verify final `main`, unchanged `master`, unchanged PR #69, and exact cumulative allowlist.
5. Consume the temporary merge authorization.
6. Close PRs #87/#89 and Issues #86/#88/#90 as completed by controlled fast-forward, without deleting branches.
7. Leave Issues #84/#85 and PR #69 open.

## Setup immutability

After creation, the following three setup files are immutable:

- `CORRECTIONS_030_031_CONTROLLED_MERGE_CONTRACT.md`
- `CORRECTIONS_030_031_CONTROLLED_MERGE_STATE.json`
- `OWNER_CORRECTIONS_030_031_CONTROLLED_MERGE_PROMPT.md`

The worker/audit phase may add exactly:

- `CORRECTIONS_030_031_CONTROLLED_MERGE_RESULT.json`
- `CORRECTIONS_030_031_CONTROLLED_MERGE_RESULT.md`

No third result commit is permitted.

## Required preflight

- source PRs #87/#89 open, draft, unmerged at exact heads;
- source workflow runs `30451912255` and `30462993550` successful;
- `main` and `master` at exact expected SHAs;
- cumulative source stack exactly 10 commits ahead, zero behind, merge base exact `dcc8069...`;
- cumulative diff limited to five Factory implementation files and governed records for tasks 030/031;
- no task-root, application, production, canonical, ranking, CTA, promo, affiliate, publication, sitemap, indexability, MIGRATION_5 or deploy changes;
- all source authorizations false;
- PR #69 exact head unchanged.

Any mismatch blocks before the relevant write.

## Prohibitions

No force, reset, rebase, squash, cherry-pick, PR merge button, synthetic replacement tree, admin bypass, protection change, branch deletion, `master` write, production/deploy/import action, PR #69 mutation, research rewrite, Source Truth Review, ranking/CTA/promo/affiliate/publication/sitemap/indexability/MIGRATION_5 change, or V5.

## Decision

Exactly one:

- `CORRECTIONS_030_031_PUBLISHED_TO_MAIN`
- `CORRECTIONS_030_031_CONTROLLED_MERGE_BLOCKED`
