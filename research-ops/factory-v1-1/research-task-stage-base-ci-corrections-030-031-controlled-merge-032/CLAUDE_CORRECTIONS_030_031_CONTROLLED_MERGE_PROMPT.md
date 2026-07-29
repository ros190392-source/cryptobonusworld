# Claude/Owner Execution Prompt — Corrections 030 + 031 Controlled Merge 032 Recovery

## Task

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-STAGE-BASE-CI-CORRECTIONS-030-031-CONTROLLED-MERGE-032`

Governing Issue: **#90**  
Source PRs: **#87** and **#89**  
Invalid setup evidence: **PR #91**, closed without merge  
Protected pilot: **PR #69**

## Owner authority

The owner authorized the exact Controlled Merge 032. Stage 1 has already published the accepted Corrections 030+031 source stack to `main@70526b5c53266cfc9639ffe60962846f9701ce38`.

This replacement setup repairs only the noncanonical prompt filename in the first closeout setup. Only `factoryMergeToMainAuthorized` is temporarily true. No additional authority exists.

## Exact expected identity

```text
branch:
closeout/researchops-subscription-factory-v1-1-research-task-stage-base-ci-corrections-030-031-controlled-merge-032-r1

base branch:
correction/researchops-subscription-factory-v1-1-research-task-stage-base-ci-owner-audit-remediation-031

approved base / Stage-1 main:
70526b5c53266cfc9639ffe60962846f9701ce38

master:
998fcedd7d9febbec5b130d4765dfeaafc40960b

PR #69:
923c2b58406f84b4355094f2e71f20a1931f70ea
```

## Required execution

1. Verify this setup phase added exactly the canonical contract, state and `CLAUDE_*_PROMPT.md` files and nothing else.
2. Treat setup files as immutable after the frozen setup head.
3. Revalidate `main`, `master`, PR #69, source PR heads, source workflows and allowlists.
4. Add exactly the two declared result files in one commit.
5. Require the real workflow on that exact result commit to succeed with all steps executed under:

```text
ENFORCEMENT: DESCENDANT (protected base policy)
BOUNDARY mode=FACTORY_GOVERNANCE
RESULT: BOUNDARY OK
FIXTURES: 301 passed, 0 failed
```

6. Only then ordinary non-force fast-forward `main` from `70526b5...` to the exact green result commit.
7. Verify final `main`, unchanged `master`, unchanged PR #69 and exact cumulative allowlist.
8. Consume temporary authority and close source PRs/issues plus the replacement audit PR as completed by controlled fast-forward, without deleting branches.
9. Leave Issues #84/#85 and PR #69 open.

## Hard stops

Do not amend, reset, force-push, merge or delete the invalid PR #91 branch. Do not create a third result commit. Do not force, rebase, squash, cherry-pick, use a PR merge button, modify `master`, touch production, mutate PR #69, begin Source Truth Review, import research, or change ranking/CTA/promo/affiliate/publication/sitemap/indexability/MIGRATION_5.

## Decision

Exactly one:

- `CORRECTIONS_030_031_PUBLISHED_TO_MAIN`
- `CORRECTIONS_030_031_CONTROLLED_MERGE_BLOCKED`
