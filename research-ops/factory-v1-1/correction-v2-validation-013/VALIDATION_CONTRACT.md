# ResearchOps Factory V1.1 — Correction V2 Validation 013 Contract

## Identity

- Task: `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V2-VALIDATION-013`
- Governing Issue: #54
- Source PR: #53
- Exact source commit: `d3ed1128497cf682863c438d47eb65d26ebb536b`
- Validation branch: `validation/researchops-factory-v1-1-v2-013`
- Base branch: `correction/researchops-factory-v1-1-v2-012`
- Production authority: `master@998fcedd7d9febbec5b130d4765dfeaafc40960b`

## Purpose

Independently and adversarially validate Correction V2. The validator must execute all V2-C1–V2-C10 regressions, rerun the 108 fixtures, and execute every additional probe A–N in Issue #54.

Do not accept the correction report or a green workflow as sufficient evidence.

## Allowed writes

Create exactly:

- `FACTORY_CORRECTION_V2_VALIDATION.json`
- `FACTORY_CORRECTION_V2_VALIDATION.md`

under this directory.

No implementation, workflow, prior governance/validation/correction, task, OKX, `main`, `master`, production or canonical file may be modified.

## Decision

Use exactly one:

- `VALIDATED_FOR_OWNER_MERGE_REVIEW`
- `VALIDATED_WITH_CORRECTIONS_REQUIRED`
- `VALIDATION_BLOCKED`

## Authorization boundary

Every merge, Binance, import, production, ranking, CTA, promo, affiliate, publication, sitemap, indexability, MIGRATION_5, deploy and `master` authorization remains false.
