# Claude execution prompt — ResearchOps Factory V1.1 Owner Closeout 018

## Task

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-OWNER-CLOSEOUT-018`

## Repository

`C:\projects\CryptoBonusWorld`

## Governing records

- Issue: `#64`
- Source Final Acceptance Issue / PR: `#62 / #63`
- Source Final Acceptance head: `71ad9aecf772a0885e88e78e1f55bec82f376d8b`
- Final Acceptance decision: `VALIDATED_FOR_OWNER_CLOSEOUT`
- Accepted V4 head: `1e7c35526edc9e251d87cbd741ce1cc4acc09293`
- Closeout branch: `closeout/researchops-factory-v1-1-owner-closeout-018`
- Base branch: `validation/researchops-factory-v1-1-final-acceptance-017`
- Approved base SHA: `71ad9aecf772a0885e88e78e1f55bec82f376d8b`

## Owner authorization

The exact received command is:

`AUTHORIZE CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-OWNER-CLOSEOUT-018`

This authorizes only execution of Owner Closeout 018. It does not authorize merge, ready-for-review, `main`, `master`, production, deployment, import, activation or Binance.

## Setup verification

Before executing:

1. Fetch origin.
2. Verify the current remote closeout branch is based on exact approved base `71ad9aecf772a0885e88e78e1f55bec82f376d8b`.
3. Verify the initial branch history after the approved base contains only the canonical owner setup triple under:
   `research-ops/factory-v1-1/owner-closeout-018/`
4. Verify the triple is exactly:
   - `OWNER_CLOSEOUT_CONTRACT.md`
   - `OWNER_CLOSEOUT_STATE.json`
   - `CLAUDE_OWNER_CLOSEOUT_PROMPT.md`
5. Freeze the current setup tip before worker changes. Do not modify any setup file afterward.
6. Verify the governing state binds task ID, role `closeout`, exact head/base branches and approved base SHA, and contains all 18 authorizations as false.

Stop with `OWNER_CLOSEOUT_SETUP_MISMATCH` if identity, ancestry, inventory or authorization floor differs.

## Required closeout work

Independently verify and record:

- PR #63 is open, draft, unmerged and remains at Final Acceptance head `71ad9aecf772a0885e88e78e1f55bec82f376d8b`;
- Final Acceptance worker diff after frozen setup contains exactly:
  - `FACTORY_FINAL_ACCEPTANCE.json`
  - `FACTORY_FINAL_ACCEPTANCE.md`;
- Final Acceptance decision is `VALIDATED_FOR_OWNER_CLOSEOUT`;
- workflow runs `30306573779` and `30306739465` are successful and all enforcement steps executed;
- PR #61 is open, draft and unmerged at accepted V4 head `1e7c35526edc9e251d87cbd741ce1cc4acc09293`;
- R1/R2 workflow evidence remains intact;
- the complete Factory V1.1 PR stack is inventoried with current state, draft status, merge status, head and base;
- all prior governance, validation, correction and result records are immutable;
- real `research-ops/tasks/**`, OKX records, `research-ops-pilot/**`, production files and frozen page/design surfaces remain untouched;
- `origin/main` remains `04157b9dfb140918a8569a5026da747b429e5ed3`;
- `origin/master` remains `998fcedd7d9febbec5b130d4765dfeaafc40960b`;
- all 18 authorization flags remain false.

Rerun as appropriate:

- `node --check` on factory `.mjs` files;
- the complete fixture suite;
- `git diff --check`;
- read-only Git/GitHub baseline and workflow checks.

Do not repair or change implementation during closeout.

## Closeout decision

Use exactly one:

- `FACTORY_V1_1_CLOSED_READY_FOR_SEPARATE_MERGE_AUTHORIZATION`
- `OWNER_CLOSEOUT_BLOCKED`

A clean decision records readiness only. It does not grant merge authorization.

## Accepted backlog

Record D/H/K as accepted nonblocking V1.1 backlog:

- D — broader current-record lifecycle refinements;
- H — additional marker outcome compatibility;
- K — richer ISO history event and timestamp semantics.

Do not create V5.

## Exact outputs

Create exactly these two worker result files:

```text
research-ops/factory-v1-1/owner-closeout-018/FACTORY_OWNER_CLOSEOUT.json
research-ops/factory-v1-1/owner-closeout-018/FACTORY_OWNER_CLOSEOUT.md
```

The JSON must include:

- task identity and owner authorization receipt;
- frozen setup SHA;
- source Final Acceptance and V4 identities;
- baseline, ancestry, immutability, workflow and test verification;
- complete Factory V1.1 PR stack inventory;
- accepted D/H/K backlog;
- blocking findings;
- closeout decision;
- exact recommended next task;
- complete all-false authorization matrix.

## Worker write boundary

After the frozen setup tip, create only the two result files.

Do not modify:

- the setup contract/state/prompt;
- factory implementation, fixtures, schemas, templates, README or workflow;
- prior governance/validation/correction/result directories;
- real research tasks or OKX records;
- `main`, `master`, production or canonical data.

## Delivery

- Work only on `closeout/researchops-factory-v1-1-owner-closeout-018`.
- Use an isolated worktree.
- Commit and push only the two result files.
- Wait for the real GitHub workflow on the final head and record its run ID and per-step status.
- Keep the closeout PR draft and unmerged.
- Do not merge or mark any PR ready.
- Do not deploy or create Binance.

## Next task on clean closeout

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CONTROLLED-STACK-MERGE-019`

This next task requires a new explicit owner authorization. It must not be started, inferred or executed during Closeout 018.

## Final report

Return:

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-OWNER-CLOSEOUT-018 — Final Report`

Include exact frozen setup SHA, final commit SHA, two created files, test/workflow evidence, decision, PR states, all-false authorization confirmation and proof that `main`, `master`, production and Binance were not modified.
