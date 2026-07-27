# ResearchOps Subscription Factory V1.1 — Owner Closeout 018 Contract

## Identity

- Task ID: `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-OWNER-CLOSEOUT-018`
- Project: `CryptoBonusWorld`
- Role: `closeout`
- Governing Issue: `#64`
- Source Final Acceptance Issue / PR: `#62 / #63`
- Approved base commit: `71ad9aecf772a0885e88e78e1f55bec82f376d8b`
- Base branch: `validation/researchops-factory-v1-1-final-acceptance-017`
- Closeout branch: `closeout/researchops-factory-v1-1-owner-closeout-018`
- Owner authorization command: `AUTHORIZE CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-OWNER-CLOSEOUT-018`

## Purpose

Close Factory V1.1 after the independently verified Final Acceptance decision `VALIDATED_FOR_OWNER_CLOSEOUT`.

The closeout worker may verify the immutable stack, record the accepted V1.1 backlog, and declare the factory ready for a later separately owner-authorized controlled stack merge to control-plane `main`.

This task does not authorize or execute that merge.

## Preconditions

The worker must verify:

- PR #63 remains draft and unmerged at `71ad9aecf772a0885e88e78e1f55bec82f376d8b`;
- Final Acceptance decision is `VALIDATED_FOR_OWNER_CLOSEOUT`;
- Final Acceptance workflow runs `30306573779` and `30306739465` concluded successfully with every enforcement step executed;
- PR #61 remains draft and unmerged at accepted V4 head `1e7c35526edc9e251d87cbd741ce1cc4acc09293`;
- all completed governance, validation, correction and result records remain immutable;
- real research tasks, OKX records, production files and frozen design/page surfaces remain untouched;
- `origin/main` remains `04157b9dfb140918a8569a5026da747b429e5ed3`;
- `origin/master` remains `998fcedd7d9febbec5b130d4765dfeaafc40960b`;
- all 18 authorization flags remain false.

## Closeout decision

Use exactly one:

- `FACTORY_V1_1_CLOSED_READY_FOR_SEPARATE_MERGE_AUTHORIZATION`
- `OWNER_CLOSEOUT_BLOCKED`

A clean closeout only records readiness. It does not authorize merge, production, deployment, import, activation or Binance.

## Accepted V1.1 backlog

Record these as nonblocking:

- D — broader current-record lifecycle refinements;
- H — additional marker outcome compatibility;
- K — richer ISO history event and timestamp semantics.

Do not create V5 or reopen the validation cycle.

## Exact worker outputs

After this setup is frozen, create only:

```text
research-ops/factory-v1-1/owner-closeout-018/FACTORY_OWNER_CLOSEOUT.json
research-ops/factory-v1-1/owner-closeout-018/FACTORY_OWNER_CLOSEOUT.md
```

No third result file is permitted.

## Authorization boundary

The closeout must keep all of these false:

- factory merge to `main`;
- research-record merge to `main`;
- Binance pilot;
- research, staging or canonical import;
- production change or binding;
- ranking, CTA, promo or affiliate-route change;
- publication, sitemap or indexability;
- MIGRATION_5;
- deploy;
- `master` change.

The next controlled merge task requires a separate exact owner authorization and must not be inferred from this closeout authorization.

## Delivery boundary

- Do not modify this contract, the state record or the stored Claude prompt after the frozen setup boundary.
- Do not modify implementation, workflows, prior records, research tasks, OKX records, `main`, `master`, production or canonical data.
- Keep the PR draft and unmerged.
- Do not deploy or create the Binance pilot.
