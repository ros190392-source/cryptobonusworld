# CMI Architecture V1 Controlled Stack Merge 027 Contract

**Task:** `CBW-CONTINUOUS-EXCHANGE-MARKET-INTELLIGENCE-ARCHITECTURE-V1-CONTROLLED-STACK-MERGE-027`  
**Governing Issue:** #82  
**Role:** closeout / one-time control-plane publication  
**Approved cumulative head:** `272ffa266647a899684954ed04a1eb09803d3b2b`  
**Expected main before Stage 1:** `babe80fe2bdcb7891dddf63aa8064532626a8fba`  
**Protected master:** `998fcedd7d9febbec5b130d4765dfeaafc40960b`

## Owner authority

The owner issued exactly:

```text
AUTHORIZE CBW-CONTINUOUS-EXCHANGE-MARKET-INTELLIGENCE-ARCHITECTURE-V1-CONTROLLED-STACK-MERGE-027
```

This authorizes one two-stage ordinary non-force fast-forward publication of the accepted Architecture 025 + Correction 026 stack to control-plane `main`.

Only `factoryMergeToMainAuthorized` may be temporarily true. The authority is consumed after successful Stage 2. All other active authorizations remain false.

It does not authorize `master`, production, deployment, imports, Binance research, research-output capture, ranking, CTA, promo, affiliate routing, publication bindings, sitemap, indexability or `MIGRATION_5`.

## Exact source stack

```text
main baseline:
babe80fe2bdcb7891dddf63aa8064532626a8fba

Architecture 025 final head / PR #79:
6d5a06b3ec3992b2760a2ca352d62f66d49ca82e

Correction 026 final head / PR #81:
272ffa266647a899684954ed04a1eb09803d3b2b
```

The cumulative head must be a direct descendant of the exact main baseline, with merge-base equal to that baseline, 10 commits ahead and 0 behind.

## Exact source evidence

Before Stage 1 require:

- PR #79 open, draft, unmerged, head `6d5a06b...`;
- PR #81 open, draft, unmerged, head `272ffa2...`;
- PR #69 open, draft, unmerged, head `6ce489f...`, exactly 14 files;
- Architecture final workflow `30365356842` success;
- Correction final workflow `30370715416` success;
- fixtures `235 passed / 0 failed` at the cumulative head;
- all six architecture JSON files parse and use `schemaVersion: "1.0.0"`;
- Markdown relative links resolve;
- Factory `.mjs` syntax checks pass;
- `git diff --check` is clean;
- no secrets or live CBW affiliate values occur in architecture examples.

## Cumulative source allowlist

The diff from the main baseline to the cumulative head must contain exactly 25 paths:

```text
research-ops/factory-v1-1/continuous-market-intelligence-architecture-v1-025/**
research-ops/factory-v1-1/continuous-market-intelligence-owner-audit-correction-026/**
research-ops/factory-v1-1/templates/continuous-market-intelligence-v1/**
research-ops/factory-v1-1/schemas/continuous-market-intelligence-v1/**
```

Exact category counts:

- 5 Architecture 025 governance records;
- 5 Correction 026 governance records;
- 9 Markdown standards;
- 6 JSON models.

Reject any application, page, production, canonical runtime, Binance task, workflow, Factory implementation, route, ranking, CTA, promo, affiliate-route, sitemap, indexability, deploy or import path.

## Stage 1 publication

Perform exactly one ordinary non-force fast-forward equivalent to:

```bash
git push origin 272ffa266647a899684954ed04a1eb09803d3b2b:refs/heads/main
```

Immediately verify:

```text
origin/main   = 272ffa266647a899684954ed04a1eb09803d3b2b
origin/master = 998fcedd7d9febbec5b130d4765dfeaafc40960b
```

No force, force-with-lease, reset, rebase, squash, cherry-pick, GitHub PR merge, admin bypass, branch-protection change or synthetic replacement commit is permitted.

## Audit result commit

Only after Stage 1 succeeds, create exactly:

```text
CMI_ARCHITECTURE_CONTROLLED_STACK_MERGE_RESULT.json
CMI_ARCHITECTURE_CONTROLLED_STACK_MERGE_RESULT.md
```

The result records must include:

- owner authorization and one-time scope;
- exact source heads and workflow runs;
- preflight refs, ancestry, inventories and validation;
- Stage 1 command/result;
- unchanged master and Binance pilot;
- intended Stage 2 procedure;
- accepted implementation notes;
- decision `CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_V1_PUBLISHED_TO_MAIN`;
- all prohibitions and no blockers.

The records must clearly say Stage 2 is pending the green audit workflow. Do not amend them after Stage 2; the external final report supplies post-Stage-2 evidence.

Worker diff after the frozen setup must contain exactly these two records and no other path.

Wait for the real workflow on the exact result commit. Require all steps to execute and succeed under:

```text
ENFORCEMENT: DESCENDANT (protected base policy)
BOUNDARY mode=FACTORY_GOVERNANCE
RESULT: BOUNDARY OK
```

## Stage 2 publication

Let `<AUDIT_RESULT_SHA>` be the exact green result commit.

Immediately before Stage 2, fetch and require:

```text
origin/main = 272ffa266647a899684954ed04a1eb09803d3b2b
```

Then perform exactly one ordinary non-force fast-forward equivalent to:

```bash
git push origin <AUDIT_RESULT_SHA>:refs/heads/main
```

Verify:

```text
origin/main   = <AUDIT_RESULT_SHA>
origin/master = 998fcedd7d9febbec5b130d4765dfeaafc40960b
```

No third audit commit and no third `main` push are allowed.

## Final inventory

The final cumulative diff from `babe80f...` to final `main` must contain exactly 30 paths:

```text
25 Architecture 025 + Correction 026 paths
3 Merge 027 frozen setup records
2 Merge 027 result records
```

## Accepted implementation notes

Retain these non-blocking notes in both result records and the final report:

1. Runtime `advertisedCurrency` must support digital-asset codes such as `USDT`, not only ISO-4217 fiat.
2. The immutable Factory research prompt requires `sourceTier`; future research packages retain it for prompt compatibility while mapping to canonical `sourceFamily`. `sourceTier` never becomes a universal authority rule.

Do not modify source architecture files during this merge task.

## Completion and closures

After successful Stage 2 and final ref/inventory verification:

1. treat `factoryMergeToMainAuthorized` as consumed and report all 18 active authorizations false;
2. comment on PR #79 and PR #81 that their exact heads were published by controlled fast-forward, not individual PR merge;
3. document that GitHub may automatically show PR #79 as merged because its head became reachable from `main`;
4. close PR #81 without merge if still open;
5. do not delete source branches;
6. close Issue #78 and Issue #80 as completed;
7. add a completion comment to Issue #82 and close it as completed;
8. close the Merge 027 audit PR only after its exact final head is on `main`;
9. leave PR #69 open, draft and unchanged at `6ce489f...`.

## Decisions

Use exactly one:

```text
CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_V1_PUBLISHED_TO_MAIN
CONTINUOUS_MARKET_INTELLIGENCE_ARCHITECTURE_V1_CONTROLLED_STACK_MERGE_BLOCKED
```

## Hard prohibitions

Do not modify Factory V1.1 code/workflow/README, Architecture 025, Correction 026, PR #69, Binance task files, `master`, production, pages, ranking, CTA, promo, affiliate routes, publication bindings, sitemap, indexability or `MIGRATION_5`.

Do not conduct Deep Research, capture research output, browse affiliate links/accounts, deploy, import, delete branches or create a new Factory version.
