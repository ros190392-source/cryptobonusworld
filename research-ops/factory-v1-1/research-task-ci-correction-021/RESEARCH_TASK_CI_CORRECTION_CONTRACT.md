# ResearchOps Factory V1.1 — Research-task CI Correction 021

TASK: `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-RESEARCH-TASK-CI-CORRECTION-021`

## Purpose

Correct only the published workflow routing defect exposed by Binance × Kazakhstan Pilot 020. A canonical `research/**` PR must use the protected-base validator over the trusted `BASE_SHA → HEAD_SHA` diff and must not require a factory-governance setup boundary.

This is a surgical correction, not V5 and not a factory redesign.

## Approved baseline

- base branch: `main`
- exact approved base SHA: `f62c1fb3fc2a66e57e6b023b8eb5b91f2f34500a`
- correction branch: `correction/researchops-factory-v1-1-research-task-ci-021`
- governing issue: `#70`
- blocked pilot: Issue `#68`, PR `#69`, head `bf0a0932325be00aad08ec3db31aef1af9df2384`
- failing run: `30340518853`

## Required behavior

For a trusted canonical research branch:

1. execute `researchops` from a detached worktree of the protected base;
2. set the enforcement diff to exact trusted `BASE_SHA → HEAD_SHA`;
3. do not run `discover-setup-boundary`;
4. let existing `check-boundary` select `RESEARCH_TASK` mode;
5. validate every emitted task root.

For factory-governance branches, preserve the existing descendant frozen-setup path. Preserve the pinned V4 bootstrap path. Unknown, spoofed or mixed-mode changes must fail closed.

## Exact allowed implementation files

Only these implementation files may change:

- `.github/workflows/cbw-researchops-factory-validate.yml`
- `research-ops/factory-v1-1/fixtures/run.mjs`

After the frozen setup boundary, create exactly:

- `RESEARCH_TASK_CI_CORRECTION_RESULT.json`
- `RESEARCH_TASK_CI_CORRECTION_RESULT.md`

No `bin/**`, `lib/**`, schemas, templates, README or unrelated file may change. If this narrow scope is technically impossible, stop with `RESEARCH_TASK_CI_CORRECTION_BLOCKED`.

## Required proof

- existing 206 fixtures remain green and new regression cases increase the total;
- canonical research branch selects research-task routing;
- research diff base is the trusted PR base SHA;
- research routing does not require a setup triple;
- canonical Binance PREPARED skeleton reaches `BOUNDARY mode=RESEARCH_TASK`, `RESULT: BOUNDARY OK`, and task-root validation;
- research workflow modification, mixed task/factory roots and spoof branches fail closed;
- factory-governance descendant routing and pinned bootstrap behavior remain intact;
- real correction PR workflow completes successfully.

## Decision

Use exactly one:

- `RESEARCH_TASK_CI_CORRECTION_READY_FOR_OWNER_MERGE`
- `RESEARCH_TASK_CI_CORRECTION_BLOCKED`

A successful correction does not authorize merge to `main`.

## Safety

Do not modify PR #69 or its generated skeleton. Do not merge, deploy, touch `master`, perform Binance research, populate `20-research-output`, delete branches, or change production/import/ranking/CTA/promo/affiliate/publication/sitemap/indexability/MIGRATION_5 state. All active authorizations remain false.
