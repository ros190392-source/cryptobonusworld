# Corrected Package v2 Validation Contract

## Identity

- Task: `CBW-KZ-OKX-P0-C-CORRECTION-V2-VALIDATION-006`
- Project: `CryptoBonusWorld`
- Country: Kazakhstan (`KZ`)
- Exchange: OKX (`okx`)
- Batch: `KZ-P0-C`
- Governing issue: `#38`
- Correction PR: `#37`
- Correction head: `5dd0d14ed2bf984d0adba2e73a803b9c6b5b0215`
- Clean review PR: `#35`
- Review head: `15d6367bc56162bf7584c3011cd4db545091a724`
- Evidence PR: `#32`
- Evidence head: `1b7b477fd2efa4783b42cb8435b6ba7837951585`

## Objective

Independently validate corrected package v2. This task does not create new research conclusions, does not modify the corrected package, and does not authorize import or production.

## Required reads

Read completely:

- Issue `#38`;
- PRs `#37`, `#35`, and `#32`;
- all eleven files under `60-correction-v2/20-corrected-output/`;
- `60-correction-v2/CORRECTION_STATE.json`;
- `60-correction-v2/00-contract/CORRECTION_CONTRACT.md`;
- both Source Truth Review files under `50-claude-review/`;
- all immutable v1 files under `20-research-output/`.

## Validation requirements

Independently verify:

- exact 11-file corrected output inventory;
- 9/9 JSON parse;
- canonical UTF-8/LF byte sizes and SHA-256 values from MANIFEST;
- unique IDs and resolved references;
- correction traceability;
- all six corrections;
- preserved `CONFLICTING / MEDIUM` result;
- `BLOCKED / HOLD_CONFLICTING` import readiness;
- every authorization false;
- immutable v1 and review layers unchanged;
- correction diff boundary.

Limited official-source checking is required only for the replacement KZT P2P URL and the AFSA-date qualification. No login, proxy, VPN, account testing, KYC, payment, trade or transaction.

## Write boundary

Create exactly:

- `CORRECTION_V2_VALIDATION.json`
- `CORRECTION_V2_VALIDATION.md`

inside this directory.

Do not modify any pre-existing file.

## Outcome enum

- `VALIDATED_FOR_RESEARCH_RECORD_CLOSEOUT`
- `VALIDATED_WITH_NONBLOCKING_NOTES`
- `VALIDATION_BLOCKED`

Successful validation authorizes only an owner closeout decision and possible controlled stack merge into the control-plane `main` branch. It never authorizes canonical import, production, ranking, CTA, promo, affiliate, publication, sitemap, indexability, MIGRATION_5 or deploy.
