# Execution prompt — Source Truth Review Dual-Output Correction 035

## Task

`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-SOURCE-TRUTH-REVIEW-DUAL-OUTPUT-CORRECTION-035`

Governing Issue: #96  
Expected branch: `correction/researchops-subscription-factory-v1-1-source-truth-review-dual-output-035`  
Approved base: `59cafe8179cde29e248025738c465a7c676cc8e5`  
Protected PR #69: `bac9bb74956d44e12a4119edf4590844bc506e00`  
Protected master: `998fcedd7d9febbec5b130d4765dfeaafc40960b`

Read the governing Issue, frozen contract/state, current `stage.mjs`, `markers.mjs`, `fixtures/run.mjs`, generated review contract and blocked Issue #95 before editing.

Modify only:

- `research-ops/factory-v1-1/lib/stage.mjs`
- `research-ops/factory-v1-1/lib/markers.mjs`
- `research-ops/factory-v1-1/fixtures/run.mjs`

Required implementation:

1. Exact JSON + Markdown review pair on `PACKAGE_VALIDATED -> SOURCE_TRUTH_REVIEWED`.
2. JSON-only, Markdown-only and extra review artifact fail closed.
3. Marker validation requires a canonical Markdown companion and exact review-stage inventory (`.gitkeep`, JSON, Markdown).
4. Empty, BOM, CR, forbidden-control, symlink, executable or non-regular Markdown fails.
5. `SOURCE_TRUTH_REVIEWED -> CORRECTION_REQUIRED` remains state-only.
6. `RESEARCH_CAPTURED -> PACKAGE_VALIDATED` remains state-only.
7. Preserve all existing transition, history, package, identity and authorization guarantees.

Add deterministic fixtures and keep all existing fixtures green. Create one implementation commit, then exactly two result records in one recording commit.

Do not modify PR #69, run Source Truth Review, publish to main, import, deploy or touch production.

Return exactly:

- `SOURCE_TRUTH_REVIEW_DUAL_OUTPUT_CORRECTION_READY_FOR_OWNER_APPROVAL`
- `SOURCE_TRUTH_REVIEW_DUAL_OUTPUT_CORRECTION_BLOCKED`
