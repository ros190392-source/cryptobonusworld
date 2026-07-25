# Subscription Deep Research handoff pilot

## Identity

- Project: `CryptoBonusWorld`
- Task ID: `CBW-KZ-OKX-P0-C-DEEP-RESEARCH-002`
- Country: Kazakhstan (`KZ`)
- Exchange: OKX (`okx`)
- Batch: `KZ-P0-C`
- Source issue: `#24`
- Automation issue: `#26`
- Source mode: ChatGPT subscription Deep Research
- Handoff mode: direct source-chat publication to a task-scoped GitHub branch

## Source result already reported

- Execution: `PASS`
- Recommendation: `CONFLICTING`
- Confidence: `MEDIUM`
- Live verification: `NOT_LIVE_VERIFIED`
- Sources: `32`
- Claims: `25`
- Conflicts: `5`
- Import readiness: `BLOCKED`
- ZIP bytes reported: `22047`
- ZIP SHA-256 reported: `68da843593c017b46026a38f947e8db65efb38d43f1bf25188d3d814d32ef05b`

These values are metadata only. They do not substitute for the original eleven files from the source Deep Research conversation.

## Required direct publication

The source Deep Research conversation must publish the exact generated contents of these eleven files under `20-research-output/`:

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

## Integrity rules

- Do not regenerate or summarize the files from memory.
- Use the exact generated file contents available in the source conversation.
- Every JSON file must parse.
- Preserve all source, claim and conflict IDs.
- Preserve cross-references.
- Preserve all authorization flags as `false`.
- Do not modify `master`, production code, routes, rankings, CTA, promo, affiliate bindings, sitemap, indexability, `MIGRATION_5`, or deployment.
- Do not merge this branch.
- Do not continue to another exchange.

## State transition

On successful publication, update `TASK_STATE.json` from `AWAITING_SOURCE_CHAT_PUBLISH` to `SOURCE_FILES_PUBLISHED`, recording the final commit SHA and the exact eleven-file inventory.

The next governed task remains:

`CBW-KZ-OKX-P0-C-SOURCE-TRUTH-REVIEW-003`
