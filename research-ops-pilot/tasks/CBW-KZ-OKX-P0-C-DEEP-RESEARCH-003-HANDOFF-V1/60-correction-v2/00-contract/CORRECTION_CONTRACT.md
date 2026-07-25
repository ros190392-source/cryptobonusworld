# OKX × Kazakhstan research package correction v2

## Identity

- Task: `CBW-KZ-OKX-P0-C-RESEARCH-CORRECTION-V2-005`
- Governing issue: `#36`
- Project: `CryptoBonusWorld`
- Country: Kazakhstan (`KZ`)
- Exchange: OKX (`okx`)
- Batch: `KZ-P0-C`
- Source package: `20-research-output/` at evidence head `1b7b477fd2efa4783b42cb8435b6ba7837951585`
- Source review: `50-claude-review/` at review head `15d6367bc56162bf7584c3011cd4db545091a724`
- Review outcome: `ACCEPT_WITH_CORRECTIONS_REQUIRED`

## Immutability

The source package and review are immutable for this task. Do not edit:

- `20-research-output/`
- `50-claude-review/`
- task-root `TASK_STATE.json`
- protocol or prior contract files

Create the corrected package only under:

`60-correction-v2/20-corrected-output/`

## Required six corrections

1. Set `prod-spot` to `CONFLICTING` with conservative confidence; no direct Kazakhstan spot source exists and spot cannot exceed the `CONFLICTING` registration gate.
2. Replace the HTTP-404 `src-okx-p2p-kzt` URL with a currently resolving official OKX KZT P2P URL verified during correction.
3. Set `clm-kz-reviewed-register-pages-no-obvious-okx` confidence to `LOW` and clearly describe it as a non-executed page observation, not a negative determination.
4. Keep the KZT P2P surface-existence claim strongly supported, but set the P2P/KZT-P2P product and payment-rail eligibility confidence to `MEDIUM` because the regulatory conflict remains.
5. Set `rail-crypto-transfer` to `UNKNOWN` for the Kazakhstan-specific verdict.
6. Remove or explicitly qualify the unconfirmed exact AFSA warning date while retaining the independently verified substance that AFSA names OKX as unlicensed.

## Output inventory

Create exactly eleven flat files under `20-corrected-output/`:

1. `research-run.json`
2. `source-verification.json`
3. `claim-verdicts.json`
4. `conflict-resolution.json`
5. `product-availability.json`
6. `payment-rails.json`
7. `offer-eligibility-review.json`
8. `schema-normalization-notes.json`
9. `import-readiness.json`
10. `source-truth-review-report.md`
11. `MANIFEST.txt`

All nine JSON files must parse. All IDs and cross-references must remain valid. Update all affected prose, notes, confidence fields, byte sizes and SHA-256 values consistently.

## Result boundary

Preserve:

- overall recommendation: `CONFLICTING`
- overall confidence: `MEDIUM`
- import readiness: `BLOCKED`
- ops recommendation: `HOLD_CONFLICTING`
- live verification: `NOT_LIVE_VERIFIED`
- every authorization: `false`

## Write boundary

May create or modify only files below `60-correction-v2/` on branch `correction/okx-kz-p0c-v2-005`.

No merge, canonical import, production change, ranking, CTA, promo, affiliate, publication, sitemap, indexability, MIGRATION_5 or deploy is authorized.
