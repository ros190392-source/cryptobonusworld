# Source Truth Review Dual-Output Correction 035 — Contract

## Identity

- Task: `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-SOURCE-TRUTH-REVIEW-DUAL-OUTPUT-CORRECTION-035`
- Governing Issue: #96
- Approved base: `59cafe8179cde29e248025738c465a7c676cc8e5`
- Branch: `correction/researchops-subscription-factory-v1-1-source-truth-review-dual-output-035`
- Protected pilot: PR #69 at `bac9bb74956d44e12a4119edf4590844bc506e00`
- Protected master: `998fcedd7d9febbec5b130d4765dfeaafc40960b`

## Defect

The generated Source Truth Review contract requires both `SOURCE_TRUTH_REVIEW.json` and `SOURCE_TRUTH_REVIEW.md`, while the executable stage allowlist and marker validation require only the JSON marker.

## Required correction

1. `PACKAGE_VALIDATED -> SOURCE_TRUTH_REVIEWED` must add exactly the JSON marker, Markdown companion and modify `TASK_STATE.json`.
2. JSON-only, Markdown-only and any extra review artifact must fail.
3. The canonical marker validator must require the Markdown companion and validate it as non-empty, regular, non-symlink, non-executable canonical UTF-8/LF without BOM, CR or forbidden controls.
4. Review-stage inventory must be limited to `.gitkeep`, the JSON marker and Markdown companion.
5. State-only `SOURCE_TRUTH_REVIEWED -> CORRECTION_REQUIRED` remains valid after the review pair exists.
6. Pure `RESEARCH_CAPTURED -> PACKAGE_VALIDATED` remains valid.
7. No package, task, workflow, authorization or production guarantee may be weakened.

## Allowed implementation files

- `research-ops/factory-v1-1/lib/stage.mjs`
- `research-ops/factory-v1-1/lib/markers.mjs`
- `research-ops/factory-v1-1/fixtures/run.mjs`

## Required result files

- `SOURCE_TRUTH_REVIEW_DUAL_OUTPUT_CORRECTION_RESULT.json`
- `SOURCE_TRUTH_REVIEW_DUAL_OUTPUT_CORRECTION_RESULT.md`

## Validation

- frozen setup immutable;
- implementation and result paths limited to this contract;
- all prior fixtures remain green;
- mandatory dual-output positive/negative fixtures green;
- Node syntax clean;
- real PR workflow green under protected-base `DESCENDANT / FACTORY_GOVERNANCE / BOUNDARY OK`;
- `main`, `master` and PR #69 unchanged.

## Prohibitions

No PR #69 write or rerun, no Source Truth Review execution, no import, correction/validation lifecycle execution, merge, production, deploy, ranking, CTA, promo, affiliate binding, publication, sitemap, indexability or MIGRATION_5.

## Decisions

- `SOURCE_TRUTH_REVIEW_DUAL_OUTPUT_CORRECTION_READY_FOR_OWNER_APPROVAL`
- `SOURCE_TRUTH_REVIEW_DUAL_OUTPUT_CORRECTION_BLOCKED`
