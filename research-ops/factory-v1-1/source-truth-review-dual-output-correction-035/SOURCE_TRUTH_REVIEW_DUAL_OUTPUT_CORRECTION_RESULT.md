# Source Truth Review Dual-Output Correction 035 — Result

**Task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-SOURCE-TRUTH-REVIEW-DUAL-OUTPUT-CORRECTION-035`  
**Governing Issue:** #96  
**Decision:** `SOURCE_TRUTH_REVIEW_DUAL_OUTPUT_CORRECTION_READY_FOR_OWNER_APPROVAL`

> This immutable result is recorded before its own final governance workflow. READY becomes owner-auditable only after the exact recording commit passes protected-base enforcement. The file is not amended afterward.

## Defect closed

The generated Binance Source Truth Review contract requires both:

```text
50-source-truth-review/SOURCE_TRUTH_REVIEW.json
50-source-truth-review/SOURCE_TRUTH_REVIEW.md
```

The prior Factory stage allowlist and marker validator required only the JSON marker. That mismatch made the generated contract impossible to execute without either violating the contract or failing CI.

## Implementation

Exact implementation commit:

```text
51b227b42177b93ee48370731a8d9250c8412877
```

Modified implementation files:

- `research-ops/factory-v1-1/lib/stage.mjs`
- `research-ops/factory-v1-1/lib/markers.mjs`
- `research-ops/factory-v1-1/fixtures/run.mjs`

### Stage boundary

`PACKAGE_VALIDATED -> SOURCE_TRUTH_REVIEWED` now requires one atomic addition group:

```text
SOURCE_TRUTH_REVIEW.json
SOURCE_TRUTH_REVIEW.md
```

Together with the required `TASK_STATE.json` state/history modification, the exact pair passes. JSON-only, Markdown-only and any third review artifact fail closed.

`SOURCE_TRUTH_REVIEWED -> CORRECTION_REQUIRED` remains a state-only transition after the pair already exists. `RESEARCH_CAPTURED -> PACKAGE_VALIDATED` remains a pure state transition.

### Canonical marker validation

The review JSON marker cannot raise state unless its Markdown companion is present at the same historical head. The Markdown must be:

- non-empty;
- regular and non-symlink;
- non-executable;
- valid UTF-8 with LF line endings;
- free of BOM, CR and forbidden control bytes.

The review-stage directory may contain only:

```text
.gitkeep
SOURCE_TRUTH_REVIEW.json
SOURCE_TRUTH_REVIEW.md
```

### Historical protection

The existing Correction 030/031 historical validator invokes the canonical task validator at every mutation head. Therefore an incomplete JSON-only review head cannot be repaired later by a same-state commit and hidden from the final tree.

## Fixtures

Transport code-test workflow:

```text
30478927153
```

Results:

```text
new Correction 035 fixtures: 16 passed / 0 failed
existing suite:              301 passed / 0 failed
total:                       317 passed / 0 failed
```

The temporary transport branch was expected to fail governance after code tests because it was not the governed correction branch. Syntax and fixture steps were green. The three files were then transferred to the governed branch by one exact-head-guarded squash commit, preserving the contract requirement of one implementation commit.

## Protected state

At result creation:

```text
main:   59cafe8179cde29e248025738c465a7c676cc8e5
master: 998fcedd7d9febbec5b130d4765dfeaafc40960b
PR #69: bac9bb74956d44e12a4119edf4590844bc506e00
```

PR #69 and its eleven-file package were not modified or rerun. Source Truth Review 034 was not executed. All 18 active authorizations remain false.

## Not authorized

No publication to `main`, PR #69 synchronization, Source Truth Review execution, correction/validation lifecycle, import, production, deployment, ranking, CTA, promo, affiliate binding, sitemap, indexability or MIGRATION_5 action is authorized by this result.

## Pending final gate

The exact recording commit must pass:

```text
ENFORCEMENT: DESCENDANT
BOUNDARY mode=FACTORY_GOVERNANCE
RESULT: BOUNDARY OK
FIXTURES TOTAL: 317 passed, 0 failed
```

Only then may the owner accept Correction 035 and separately authorize controlled publication.
