# Correction V4 Contract

## Task

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V4-016`

## Governing authority

- Issue: #60
- Source Validation 015 commit: `07d0e38a540355244b2bcab0258d3eb5463ed1af`
- Base branch: `validation/researchops-factory-v1-1-v3-015`
- Correction branch: `correction/researchops-factory-v1-1-v4-016`

## Final-cycle boundary

This is the final broad correction pass for Factory V1.1. Implement only V4-C1 through V4-C7 from Issue #60:

1. task-role capability profiles;
2. trusted enforcement root that cannot self-authorize;
3. commit/ancestry-bound governed task identity;
4. no future-task preauthorization;
5. canonical skeleton byte verification;
6. real merge proof reachable from `main`;
7. checkout/event/workspace integrity.

Accepted V1.1 backlog limitations: D, H and K from Validation 015 unless a critical correction necessarily touches them.

## Immutable layers

Do not modify any prior governance, validation or correction directory, `research-ops-pilot/**`, real `research-ops/tasks/**`, `main`, `master`, production or canonical data.

## Allowed implementation paths

Only paths explicitly authorized by Issue #60 may change, plus exactly:

- `correction-v4-016/CORRECTION_V4_RESULT.json`
- `correction-v4-016/CORRECTION_V4_RESULT.md`

The setup contract, state and prompt become immutable once the implementation starts.

## Safety

No merge, deploy, Binance pilot, production mutation, `master` mutation, import, publication, ranking, CTA, promo, affiliate, sitemap or indexability action is authorized.

All authorization flags remain false.

## Delivery

- isolated worktree;
- commit and push only the V4 branch;
- keep every PR draft and unmerged;
- next task: `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-FINAL-ACCEPTANCE-VALIDATION-017`.
