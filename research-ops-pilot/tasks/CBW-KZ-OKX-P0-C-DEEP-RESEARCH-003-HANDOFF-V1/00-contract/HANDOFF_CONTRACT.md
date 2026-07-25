# OKX Kazakhstan subscription research handoff contract

## Identity

- Project: `CryptoBonusWorld`
- Task ID: `CBW-KZ-OKX-P0-C-DEEP-RESEARCH-003-HANDOFF-V1`
- Country: Kazakhstan (`KZ`)
- Exchange: OKX (`okx`)
- Batch: `KZ-P0-C`
- Research issue: `#28`
- Automation issue: `#26`
- Receiver setup issue: `#29`
- Source mode: ChatGPT subscription Deep Research
- Transfer protocol: `CBW_HANDOFF_ENVELOPE_V1`

## Inputs

Use the six prepared File Library inputs validated by `MANIFEST.txt`:

1. `MANIFEST.txt`
2. `CBW_KZ_OKX_P0C_RESEARCH_QUEUE_v1.json`
3. `CBW_KZ_OKX_P0C_RESEARCH_QUEUE_v1.md`
4. `deep-research-prompt.md`
5. `source-seed-inventory.json`
6. `repository-context-report.md`

The inputs are research leads and repository context only. They assert zero research conclusions and zero eligibility statuses.

## Required output

The research run must create exactly eleven complete files and include all of them inline in one `CBW_HANDOFF_ENVELOPE_V1` before reporting PASS.

Target directory after publication:

`research-ops-pilot/tasks/CBW-KZ-OKX-P0-C-DEEP-RESEARCH-003-HANDOFF-V1/20-research-output/`

Required files:

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

## Hard transfer rule

A downloadable ZIP is optional and non-canonical. The run is incomplete unless the full inline envelope is present in the research conversation.

If the envelope cannot be produced, the only valid terminal result is:

`BLOCKED — HANDOFF_ENVELOPE_MISSING`

No narrative summary may substitute for the exact file contents.

## Safety boundaries

- no mutation of `master`;
- no production mutation;
- no merge;
- no deploy;
- no canonical import;
- no ranking, CTA, promo or affiliate activation;
- no publication, sitemap or indexability change;
- no MIGRATION_5;
- no automatic next exchange.

Every authorization remains false until a separate owner decision.
