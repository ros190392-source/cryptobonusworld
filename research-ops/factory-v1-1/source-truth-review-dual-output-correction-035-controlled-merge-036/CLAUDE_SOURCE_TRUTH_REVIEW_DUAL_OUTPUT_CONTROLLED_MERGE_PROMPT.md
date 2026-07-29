# Execution prompt — Source Truth Review Dual-Output Controlled Merge 036

## Task

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-SOURCE-TRUTH-REVIEW-DUAL-OUTPUT-CORRECTION-035-CONTROLLED-MERGE-036`

Governing Issue: #100  
Source Issue / PR: #96 / #97  
Exact source head: `f07d55be6562a40aad15fa7f3a125f028efbf5fb`  
Main before Stage 1: `59cafe8179cde29e248025738c465a7c676cc8e5`  
Protected master: `998fcedd7d9febbec5b130d4765dfeaafc40960b`  
Protected PR #69: `bac9bb74956d44e12a4119edf4590844bc506e00`

Owner authorization:

```text
AUTHORIZE CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-SOURCE-TRUTH-REVIEW-DUAL-OUTPUT-CORRECTION-035-CONTROLLED-MERGE-036
```

Stage 1 is complete only after `main` is confirmed at the exact source head.

Then:

1. verify this directory contains exactly the canonical setup triple before result creation;
2. create exactly two immutable result files in one recording commit;
3. require the real workflow on the exact result commit to pass with `317/0`, `DESCENDANT`, `FACTORY_GOVERNANCE`, `BOUNDARY OK`;
4. ordinary non-force fast-forward `main` from the source head to the result commit;
5. verify unchanged `master` and PR #69;
6. consume `factoryMergeToMainAuthorized`;
7. close PR #97 and Issues #96/#100 as controlled-fast-forward publication records;
8. leave Issue #95 open and PR #69 open/draft for the separately authorized resume.

Do not merge PR #97 with the GitHub merge button. Do not modify source correction files, PR #69, research package, `master` or production. Do not run Source Truth Review, import or deploy.
