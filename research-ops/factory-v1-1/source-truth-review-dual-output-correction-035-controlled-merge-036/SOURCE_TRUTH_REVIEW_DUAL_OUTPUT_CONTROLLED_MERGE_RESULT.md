# Source Truth Review Dual-Output Correction 035 — Controlled Merge 036 Result

**Task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-SOURCE-TRUTH-REVIEW-DUAL-OUTPUT-CORRECTION-035-CONTROLLED-MERGE-036`  
**Governing Issue:** #100  
**Decision:** **`SOURCE_TRUTH_REVIEW_DUAL_OUTPUT_CORRECTION_035_PUBLISHED_TO_MAIN`**

> This immutable result is written after successful Stage 1 and before this recording commit's governance workflow and Stage 2. The decision becomes final only after the exact recording commit receives a green workflow and `main` is advanced to it by ordinary non-force fast-forward. This file is not amended afterward.

## Accepted source correction

```text
main baseline:
59cafe8179cde29e248025738c465a7c676cc8e5

Correction 035 head:
f07d55be6562a40aad15fa7f3a125f028efbf5fb
```

The source correction was verified as five commits ahead, zero behind, with merge base equal to the exact baseline. The cumulative diff contains exactly eight accepted Factory paths: three frozen setup records, three implementation files and two result records.

No research task, application, production, canonical data, ranking, CTA, promo, affiliate, publication, sitemap, indexability, MIGRATION_5 or deploy path is present.

## Source validation

- Correction Issue / PR: #96 / #97.
- PR #97 was open, draft and unmerged at the exact accepted head before publication.
- Workflow `30479625911`: success.
- New dual-output fixtures: `16 passed / 0 failed`.
- Existing fixtures: `301 passed / 0 failed`.
- Total: `317 passed / 0 failed`.
- Owner audit: accepted.
- Source authorizations: all false.

## Stage 1 — complete

`main` was updated by ordinary non-force fast-forward only:

```text
59cafe8179cde29e248025738c465a7c676cc8e5
→
f07d55be6562a40aad15fa7f3a125f028efbf5fb
```

No source PR merge button, force, reset, rebase, squash, cherry-pick, admin bypass or branch-protection change was used.

## Closeout setup

Controlled Merge PR #101 starts from exact source head `f07d55b...` and introduces exactly:

- `SOURCE_TRUTH_REVIEW_DUAL_OUTPUT_CONTROLLED_MERGE_CONTRACT.md`;
- `SOURCE_TRUTH_REVIEW_DUAL_OUTPUT_CONTROLLED_MERGE_STATE.json`;
- `CLAUDE_SOURCE_TRUTH_REVIEW_DUAL_OUTPUT_CONTROLLED_MERGE_PROMPT.md`.

Frozen setup head:

```text
fb92d89ae13bd788321ddffe5eaffdfd4e3fa696
```

## Recording commit

This recording adds exactly:

- `SOURCE_TRUTH_REVIEW_DUAL_OUTPUT_CONTROLLED_MERGE_RESULT.json`;
- `SOURCE_TRUTH_REVIEW_DUAL_OUTPUT_CONTROLLED_MERGE_RESULT.md`.

No third result commit is permitted.

## Stage 2 — pending at record creation

Required remaining actions inside the already authorized task:

1. require a real green workflow on this exact recording commit;
2. require `FIXTURES TOTAL: 317 passed, 0 failed`;
3. require `ENFORCEMENT: DESCENDANT`, `BOUNDARY mode=FACTORY_GOVERNANCE`, `RESULT: BOUNDARY OK`;
4. ordinary non-force fast-forward `main` from `f07d55b...` to this exact recording commit;
5. verify unchanged `master` and unchanged PR #69;
6. consume `factoryMergeToMainAuthorized`;
7. close PR #97 and Issues #96/#100 as published by controlled fast-forward;
8. leave Issue #95 open and PR #69 open/draft for resumed Source Truth Review.

## Protected state

```text
master:
998fcedd7d9febbec5b130d4765dfeaafc40960b

PR #69 head:
bac9bb74956d44e12a4119edf4590844bc506e00
```

No Source Truth Review, research rewrite, import, production change, deploy, ranking, CTA, promo, affiliate binding, publication, sitemap, indexability or MIGRATION_5 action is part of this task.

## Authorization boundary

Only `factoryMergeToMainAuthorized` is temporarily true during Controlled Merge 036. Every other authorization remains false. After successful Stage 2 the temporary authority is consumed and all 18 active authorizations are false.
