# Corrections 030 + 031 Controlled Merge 032 — Replacement Contract

**Task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-STAGE-BASE-CI-CORRECTIONS-030-031-CONTROLLED-MERGE-032`  
**Governing Issue:** #90  
**Role:** closeout / Stage-2 recovery after non-authoritative setup naming failure

## Owner authorization

The owner issued exactly:

```text
AUTHORIZE CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-STAGE-BASE-CI-CORRECTIONS-030-031-CONTROLLED-MERGE-032
```

This replacement setup remains inside that exact authorization. It does not create a new source correction or expand authority.

Only `factoryMergeToMainAuthorized` may be temporarily true. Every other authorization remains false. The temporary authority is consumed after successful Stage 2.

## Recovery identity

Stage 1 already completed successfully:

```text
main:
dcc8069d0028bf1bf2b1cdc5d79f7e6b96897bd1
→
70526b5c53266cfc9639ffe60962846f9701ce38
```

The first closeout PR #91 is closed without merge. Its branch/head `20d94b926adac4000dd7945aad08408dfe9d9d17` remains immutable and non-authoritative because its prompt filename did not match the canonical `CLAUDE_*_PROMPT.md` setup rule. It must never be amended, reset, force-pushed, merged or deleted.

## Exact protected refs

```text
approved stacked base / current main / Stage-2 source:
70526b5c53266cfc9639ffe60962846f9701ce38

Correction 030 head:
15c3c65a0b7578a1c64ebda2ce6e924ed97df31c

protected master:
998fcedd7d9febbec5b130d4765dfeaafc40960b

protected PR #69 head:
923c2b58406f84b4355094f2e71f20a1931f70ea
```

## Canonical setup

This replacement branch must introduce exactly three additions under this result directory:

- `CORRECTIONS_030_031_CONTROLLED_MERGE_CONTRACT.md`
- `CORRECTIONS_030_031_CONTROLLED_MERGE_STATE.json`
- `CLAUDE_CORRECTIONS_030_031_CONTROLLED_MERGE_PROMPT.md`

After the third setup commit, those files are frozen and immutable.

The audit phase may then add exactly:

- `CORRECTIONS_030_031_CONTROLLED_MERGE_RESULT.json`
- `CORRECTIONS_030_031_CONTROLLED_MERGE_RESULT.md`

Both result files must be created in one commit. No third audit commit is permitted.

## Required validation

Before Stage 2:

- `main` remains exactly `70526b5...`;
- `master` and PR #69 remain exact and unchanged;
- source PRs #87/#89 retain their accepted heads;
- source workflow runs `30451912255` and `30462993550` remain successful;
- replacement setup diff is exactly the canonical three-file additions;
- result diff from frozen setup is exactly the two result-file additions;
- the real workflow on the exact result commit succeeds with all steps executed under `DESCENDANT / FACTORY_GOVERNANCE / BOUNDARY OK`;
- fixtures remain `301 passed / 0 failed`;
- no task-root, application, production, canonical, ranking, CTA, promo, affiliate, publication, sitemap, indexability, MIGRATION_5 or deploy changes exist.

## Stage 2

Only after the exact result workflow succeeds, ordinary non-force fast-forward:

```text
main:
70526b5c53266cfc9639ffe60962846f9701ce38
→
<EXACT_GREEN_REPLACEMENT_RESULT_COMMIT>
```

Then verify final refs, consume temporary authority, close PRs #87/#89 and Issues #86/#88/#90 as published by controlled fast-forward, close the replacement audit PR without merge, and leave Issues #84/#85 and PR #69 open.

## Prohibitions

No force, reset, rebase, squash, cherry-pick, PR merge button, synthetic replacement tree, admin bypass, branch deletion, `master` write, production/deploy/import action, PR #69 mutation, research rewrite, Source Truth Review, ranking/CTA/promo/affiliate/publication/sitemap/indexability/MIGRATION_5 change, or V5.

## Decision

Exactly one:

- `CORRECTIONS_030_031_PUBLISHED_TO_MAIN`
- `CORRECTIONS_030_031_CONTROLLED_MERGE_BLOCKED`
