# Source Truth Review Dual-Output Correction 035 — Controlled Merge 036

## Identity

- Task: `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-SOURCE-TRUTH-REVIEW-DUAL-OUTPUT-CORRECTION-035-CONTROLLED-MERGE-036`
- Governing Issue: #100
- Source Correction Issue / PR: #96 / #97
- Approved source head: `f07d55be6562a40aad15fa7f3a125f028efbf5fb`
- Main before Stage 1: `59cafe8179cde29e248025738c465a7c676cc8e5`
- Protected master: `998fcedd7d9febbec5b130d4765dfeaafc40960b`
- Protected Binance PR #69: `bac9bb74956d44e12a4119edf4590844bc506e00`

## Purpose

Publish the exact accepted Correction 035 stack to control-plane `main` by ordinary non-force fast-forward only, then publish exactly two immutable closeout records.

## Preconditions

- source PR #97 is open, draft and unmerged at the exact accepted head;
- source workflow `30479625911` is successful;
- source stack is five commits ahead, zero behind its exact main baseline;
- cumulative source diff is exactly the accepted eight Factory paths;
- all source authorizations are false;
- `master` and PR #69 match the protected refs.

## Publication

Stage 1:

```text
main: 59cafe8179cde29e248025738c465a7c676cc8e5
   -> f07d55be6562a40aad15fa7f3a125f028efbf5fb
```

Stage 2:

1. add exactly two result records in one recording commit;
2. require a real green governance workflow on the exact result commit;
3. fast-forward `main` from the source head to the result commit;
4. verify final refs and consume temporary authority;
5. close the source correction records as published by controlled fast-forward.

## Allowed files

Under this directory only:

- this contract;
- `SOURCE_TRUTH_REVIEW_DUAL_OUTPUT_CONTROLLED_MERGE_STATE.json`;
- `CLAUDE_SOURCE_TRUTH_REVIEW_DUAL_OUTPUT_CONTROLLED_MERGE_PROMPT.md`;
- `SOURCE_TRUTH_REVIEW_DUAL_OUTPUT_CONTROLLED_MERGE_RESULT.json`;
- `SOURCE_TRUTH_REVIEW_DUAL_OUTPUT_CONTROLLED_MERGE_RESULT.md`.

## Authorization boundary

Only `factoryMergeToMainAuthorized` may be true during execution. All other authorizations remain false. The temporary authority is consumed after successful Stage 2.

## Prohibitions

No force, reset, rebase, source squash, cherry-pick, source PR merge button, branch deletion, `master` write, PR #69 mutation, Source Truth Review execution, research rewrite, import, production, deploy, ranking, CTA, promo, affiliate, publication, sitemap, indexability, MIGRATION_5 or V5.
