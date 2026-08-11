# CBW Master Blocking Portfolio — Stage 2 / S2-02 (issue #366)

**Status:** INVENTORY + CONTRACT ONLY.
No gate logic is migrated, no branch protection is changed, no ruleset is created,
no workflow is weakened, no path filter is removed, and no product / research /
commercial authority is altered by this artifact.

## What this is

S2-01 delivered exactly one stable, always-reporting required context for product
branch `master` — **`Master required gate`**. Before any further enforcement can be
folded into it, the repository needs a machine-readable, drift-proof statement of
which checks exist today, which of them can actually fail a pull request, and which
of them could legitimately be named directly in branch protection.

| File | Role |
|---|---|
| [`scripts/ci/master-blocking-portfolio.json`](../../scripts/ci/master-blocking-portfolio.json) | The canonical contract. One entry per GitHub Actions **job**, not per workflow file. |
| [`scripts/ci/master-blocking-portfolio-contract.mjs`](../../scripts/ci/master-blocking-portfolio-contract.mjs) | Pure, text-in derivation + audit engine. No I/O, so it can be fed mutated inventories. |
| [`scripts/ci/master-blocking-portfolio-validator.mjs`](../../scripts/ci/master-blocking-portfolio-validator.mjs) | `npm run ci:master-portfolio:validate` — re-proves the contract against the real workflow YAML. |
| [`scripts/ci/master-blocking-portfolio-discovery-test.mjs`](../../scripts/ci/master-blocking-portfolio-discovery-test.mjs) | `npm run ci:master-portfolio:discovery` — live coverage check **plus** mutation probes that prove the audit can fail. |

## Classification is semantic, never filename-based

Every field that can be derived from the workflow YAML **is** derived and compared
byte-for-byte against the stored snapshot. The stored file is a frozen assertion,
not a parallel opinion. Three live cases prove the filename heuristic would have
been wrong:

* `cbw-noindex-product-preview-advisory.yml` — filename says *advisory*; the job is
  named "Noindex Product preview gate", carries no `continue-on-error` anywhere,
  and **fails the pull request**. → `BLOCKING`.
* `cbw-pr-advisory-gate.yml` — filename **and** job name say advisory /
  non-blocking. Most steps are individually `continue-on-error`, but the
  fail-closed changed-file discovery step and the task-contract parse step are
  **not**, so either one failing fails the pull request. → `BLOCKING`.
* `cbw-route-inventory-artifact.yml` — filename contains neither "gate" nor
  "advisory" and it appeared in no prior candidate list. It runs on every PR to
  master matching its paths with no `continue-on-error` and
  `if-no-files-found: error`. → `BLOCKING`. **This is the derived twelfth product
  hard gate.**

## Closed vocabularies

`classification`: `BLOCKING` · `ADVISORY` · `CONDITIONAL_PRODUCTION_ONLY` · `NON_PR`
`migrationState`: `LEGACY_EXTERNAL` · `UNIFIED_GATE_HOST` · `NOT_APPLICABLE`

Anything outside these fails the validator. `migrationState` is `LEGACY_EXTERNAL`
for every legacy PR check; only the S2-01 unified gate is `UNIFIED_GATE_HOST`; jobs
that can never run on a pull request are `NOT_APPLICABLE`.

## Direct-required safety

`directRequiredSafe` is derived, not asserted:

```
directRequiredSafe = (classification === 'BLOCKING') && !pathFiltered
```

A path-filtered workflow does not report on every PR to master. Naming such a
context in branch protection deadlocks the PR on
*"Expected — Waiting for status to be reported"*. **Two** of the 26 jobs are
always-reporting today: `Master required gate` and `Advisory validation
(non-blocking)`. Every other blocking-capable job is path-filtered and therefore
`directRequiredSafe: false`.

## Stage-2 candidacy is a statement about today, not a plan

```
stage2MigrationCandidate =
  classification === 'BLOCKING'
  && migrationState === 'LEGACY_EXTERNAL'
  && directRequiredSafe === false
```

That is exactly the set of checks that can fail a PR, still report outside the
unified gate, and cannot be reached from branch protection as things stand. No
future intent is encoded as fact.

## Trigger / self-bypass gaps

Recorded, **not repaired**, in this task. Gap codes are a closed vocabulary; the
validator re-derives the whole gap set and fails if the snapshot disagrees.

* `PATH_FILTERED_NOT_ALWAYS_REPORTING`
* `TRIGGER_GAP_OWN_WORKFLOW_FILE`, `TRIGGER_GAP_SCRIPT`, `TRIGGER_GAP_SHARED_CONFIG`
* `TRIGGER_COVERAGE_UNRESOLVABLE` (a `paths-ignore` filter this model cannot resolve)
* `NO_BRANCH_FILTER`
* `MISLEADING_ADVISORY_FILENAME`, `MISLEADING_NON_BLOCKING_JOB_NAME`
* `UNRECOGNIZED_JOB_IF` (fail-closed catch-all — an unmodelled job-level `if` is
  still treated as PR-runnable and must be explicitly classified)

The dominant finding: **every** path-filtered PR job runs `npm ci` and most run
`npm run build`, yet **no** workflow in the repository lists `package.json`,
`package-lock.json`, `astro.config.mjs` or `tsconfig.json` in its `paths` filter
except `cbw-portal-contracts-advisory.yml` (which lists the two package files). A
dependency bump, an Astro config change or a tsconfig change therefore runs **zero**
product hard gates. Only the unified `Master required gate` — which has no path
filter — covers those changes today.

## Not wired into CI by this task

The validator and discovery test are deliberately **not** added to any workflow
here. Adding an enforcement step to `cbw-master-required-gate.yml` is a change to
the gate itself and belongs to the migration stage, not to the inventory stage.
They run locally via the two `npm` scripts above and in the S2-02 PR validation
evidence. Wiring them is the first candidate follow-up.
