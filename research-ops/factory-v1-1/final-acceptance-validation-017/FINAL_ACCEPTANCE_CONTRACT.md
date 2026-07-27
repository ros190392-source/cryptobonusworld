# ResearchOps Factory V1.1 — Final Acceptance Validation 017 Contract

## Identity

- Task ID: `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-FINAL-ACCEPTANCE-VALIDATION-017`
- Project: `CryptoBonusWorld`
- Governing Issue: `#62`
- Source V4 Issue / PR: `#60 / #61`
- Validation branch: `validation/researchops-factory-v1-1-final-acceptance-017`
- Base branch: `correction/researchops-factory-v1-1-v4-016`
- Approved base SHA: `1e7c35526edc9e251d87cbd741ce1cc4acc09293`
- Role: `validation`

## Purpose

Perform the final acceptance validation of ResearchOps Subscription Factory V1.1 after Correction V4 and CI Remediations R1/R2.

This is not a new discovery or hardening cycle. The only valid outcomes are:

- `VALIDATED_FOR_OWNER_CLOSEOUT`
- `FINAL_ACCEPTANCE_BLOCKED`

No V5 task is authorized or expected.

## Acceptance scope

Validate the critical security and governance surfaces only:

1. real generic DESCENDANT owner-setup path;
2. validation-role exact two-result-file capability;
3. trusted-base policy execution and no self-authorization;
4. setup, branch, commit, ancestry, checkout and workspace integrity;
5. exact canonical research-task skeleton bytes and safety constraints;
6. repository-backed merge proof reachable from `main`;
7. all-false authorization and production isolation.

The accepted V1.1 backlog items D/H/K are nonblocking unless they produce a critical authority/write/merge-proof escape.

## Required setup boundary

This directory's owner setup phase consists of exactly:

- `FINAL_ACCEPTANCE_CONTRACT.md`
- `FINAL_ACCEPTANCE_STATE.json`
- `CLAUDE_FINAL_ACCEPTANCE_PROMPT.md`

These setup files are immutable after the frozen setup boundary.

## Required validation outputs

Create exactly:

- `FACTORY_FINAL_ACCEPTANCE.json`
- `FACTORY_FINAL_ACCEPTANCE.md`

No third result file is permitted.

## Write boundary

After setup, the validation worker may create only the two output files above in this directory.

It may not modify:

- these setup records;
- factory implementation or workflow;
- any prior governance, validation or correction record;
- `research-ops/tasks/**` or `research-ops-pilot/**`;
- OKX records;
- `main`, `master`, production or canonical data.

## Safety and authorization boundary

No merge, deploy, Binance pilot, import, publication, ranking, CTA, promo, affiliate route, sitemap, indexability, MIGRATION_5, production or `master` change is authorized.

All 18 authorization flags remain false.

## Delivery

- isolated worktree;
- branch based exactly on the approved base SHA;
- stacked draft PR targeting the source V4 branch;
- commit only the two result files during validation execution;
- stop after the final report.
