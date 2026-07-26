# ResearchOps Subscription Factory V1.1 — Independent Adversarial Validation

- **Validation task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-VALIDATION-009`
- **Implementation task:** `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-008`
- **Governing issue:** #45 · **Impl PR:** #44 · **Validation PR:** #46
- **Validated implementation commit:** `02997bb63be39012015486ecf55da707a3738f6b`
- **Base:** `main@04157b9…` · **Protected:** `master@998fced…`
- **Validated at:** 2026-07-26 · **Role:** Independent adversarial validator

## Executive outcome

**`VALIDATED_WITH_CORRECTIONS_REQUIRED`.**

The Factory V1.1 architecture is sound and usable — a dependency-free Node CLI, a broad and mostly-correct package validator, a real authorization floor, and a read-only CI workflow. Independent reruns reproduce the 24/0 fixture result and clean `node --check`. **However, adversarial execution confirmed nine correctable defects, several of which the decision rules forbid treating as a clean pass**: a non-functional `--require-package` flag, a `validate` command that does not enforce state-to-evidence consistency, a fail-open CI workflow (swallowed diff/fetch failures and silently-skipped task deletions), an append-only boundary that exists in the library but is **not wired into CI**, and a canonical CLI `--tasks-dir` that escapes the repository. None require redesign; all are correctable. This is therefore **not** ready for owner merge review and **not** blocked.

**Binance pilot, canonical import, production and deploy remain unauthorized. Every authorization is false.**

## Independent test summary

- Node: v24 (Node 20-compatible ESM/built-ins). `node --check` on all 10 factory `.mjs`: **clean**.
- Fixtures: `node …/fixtures/run.mjs` → **24 passed, 0 failed** (independently reproduced).
- Advisory PR #44 workflow run observed (pass, 13s) but **not** treated as sufficient — probes executed independently.

## Implementation strengths

- Standalone `create`/`validate`/`status` run directly with Node built-ins; **no root `package.json` introduced**; strict arg parsing rejects unknown/duplicate/missing-value flags.
- Package validator correctly rejects: BOM, raw CRLF, missing/extra inventory, malformed JSON, MANIFEST byte/hash/absent-row/extra-row/malformed-row, duplicate IDs, numeric IDs, non-string-in-array references, dangling source/claim references, symlinks and executable bits.
- Authorization floor catches deeply nested forbidden `true` and every `*Authorized` key; the owner receipt correctly rejects `taskId` mismatch, `targetBranch=master`, unknown privileges and any nested escalation.
- `checkAppendOnlyBoundary` library logic is correct in isolation (rejects pilot/`src`/MI/top-level/traversal).
- Generated task is deterministic and complete: 0 unresolved `{{tokens}}`, all seven stages, `autoMerge=false`, draft PR to `main`, all authorizations false, and a Deep Research prompt that preserves the `CBW_HANDOFF_ENVELOPE_V1` flow and the eleven-file inventory.
- No `research-ops-pilot/tasks/**` mutation; no Binance pilot; `master` untouched.

## Material defects (correction required)

| # | Defect | Evidence | Probe |
|---|---|---|---|
| P1 | `--require-package` never forces the package (parser stores `require-package`; `validateTask` reads `requirePackage`) — empty skeleton passes with the flag | `bin/researchops.mjs` booleans; `lib/validate.mjs` opts.requirePackage | 1 |
| P2 | `validate` does not enforce state↔evidence; all 8 evidence states pass with empty `20-research-output/` (only `status` catches it, exit 1) | `lib/validate.mjs` (no gate); `lib/status.mjs` (gate) | 2 |
| P3 | Workflow fail-open: `git fetch/diff … \|\| true` → empty changed set → PASS | workflow L52–57 | 3 |
| P4 | Workflow silently skips deleted/absent task roots (`if [ -d "$t" ]`) → deletion passes CI | workflow L63 | 4 |
| P5 | Workflow never runs `validate --changed-files`; the append-only boundary is not enforced in CI | workflow (missing); `lib/validate.mjs` (unused fn) | 5 |
| P6 | Canonical CLI `--tasks-dir` accepts absolute and `..` paths → `create` writes outside `research-ops/tasks/` | `lib/create.mjs` (no `safeSubpath` on tasksDir) | 7 |
| P7 | Package validator does not reject nested subdirectories/files under `20-research-output/` | `lib/validate.mjs` `listFlatFiles` top-level only | 12 |
| P8 | Non-array/null reference fields are treated as empty rather than flagged | `lib/validate.mjs` `Array.isArray(x)?x:[]` | 12 |
| P9 | Schemas are documentation-only; missing `taskId` and IDENTITY/TASK_STATE `taskId` mismatch pass validation | `lib/validate.mjs` (no required-key/identity check) | 8 |

## Workflow findings

Read-only and bounded — `permissions: contents: read`, `persist-credentials: false`, `timeout-minutes: 10`, no write token, **no AI-provider call, no branch/issue/PR creation, no merge, no deploy**. But it is **not fail-closed**: `|| true` on fetch/diff swallows discovery failures into a green run, deleted task roots are skipped, and no append-only enforcement is invoked. A workflow advertised as fail-closed must fail on discovery errors and reject governed-record deletion.

## CLI / state / path / schema / authorization findings

- **CLI:** create/status solid; `validate` misses the state/evidence gate and the `--require-package` alias.
- **State/evidence:** enforced only by `status`, not by `validate` (the gate CI relies on).
- **Path safety:** `--tasks-dir` escapes via absolute and `..` paths — the `safeSubpath` helper exists but is not applied to `tasksDir`.
- **Schema:** documentation-only; malformed required shapes pass.
- **Authorization:** floor and owner-receipt escalation resistance hold; only a heuristic gap remains for arbitrary non-canonical key names (no real authorization key escapes) — nonblocking.

## Required corrections

1. Wire `--require-package` → `opts.requirePackage`.
2. Make `validate` fail closed on declared-state-vs-evidence inconsistency.
3. Remove/handle `|| true` so workflow fetch/diff failures fail the job.
4. Make the workflow reject deletion/absence of a governed task root.
5. Build the PR changed-file list and run `validate --changed-files` in CI to enforce append-only.
6. Confine `--tasks-dir` to `research-ops/tasks/` (apply `safeSubpath`; reject absolute and `..`).
7. Reject unexpected subdirectories/files under `20-research-output/`.
8. Flag non-array/null reference fields as invalid.
9. Add minimal required-key + IDENTITY/TASK_STATE `taskId` consistency enforcement (or bind the schema files).

## Nonblocking notes

- Authorization detection is heuristic; recommend a canonical key enumeration. No recognized authorization escapes.
- `FACTORY_STATE.implementationCommitSha=null` and `exactImplementationFileCount=20` are traceability notes; counts reconcile (20 new impl files + `FACTORY_STATE` update = 21 vs impl start; 24 in PR includes 3 pre-existing governance files). Validated commit is unambiguously `02997bb`.
- `status` does not verify 50/60/70/80 stage artifacts for higher declared states when a valid package exists.
- Empty `20-research-output/` is not git-tracked until populated.

## Merge-readiness judgment

**Not ready for owner merge review.** The architecture can become the canonical one-branch/one-draft-PR mechanism after the nine corrections — principally closing the fail-open workflow behavior, fixing `--require-package`, adding the `validate` state/evidence gate, wiring CI append-only enforcement, and confining `--tasks-dir`.

## Authorization statement

This validation grants **no** authorization. Binance pilot creation, canonical import, production change/binding, ranking, CTA, promo, affiliate, publication, sitemap, indexability, MIGRATION_5, deploy and any `master`/`main` mutation remain **false** and owner-gated. Recommended next task: **`CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-010`**.
