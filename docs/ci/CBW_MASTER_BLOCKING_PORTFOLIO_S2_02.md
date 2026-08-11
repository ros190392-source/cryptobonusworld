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

`classification`: `BLOCKING` · `ADVISORY` · `CONDITIONAL_PRODUCTION_ONLY` · `NON_PR` · `UNMODELED`
`migrationState`: `LEGACY_EXTERNAL` · `UNIFIED_GATE_HOST` · `NOT_APPLICABLE`

Anything outside these fails the validator. `migrationState` is `LEGACY_EXTERNAL`
for every legacy PR check; only the S2-01 unified gate is `UNIFIED_GATE_HOST`; jobs
that can never run on a pull request are `NOT_APPLICABLE`.

## Strict root schema

The portfolio root is validated as an exact key set:

`schemaVersion` · `issue` · `stage` · `description` · `classifications` ·
`migrationStates` · `gapCodes` · `totals` · `entries`

A missing root key, an unknown root key, a root key of the wrong type, a missing
`schemaVersion`, a non-integer `schemaVersion` or **any** `schemaVersion` other
than the single value this engine supports (`SCHEMA_VERSION`, currently **2**) is
a validator failure. Pinning is exact, not a floor: a future version is a code
change in `master-blocking-portfolio-contract.mjs`, never a silently accepted
file. `schemaVersion` moved 1 → 2 when the entry shape gained the modelled
trigger state and the bounded dependency closure.

## Fail-closed semantics: valid syntax the engine cannot prove

Classification is derived by *evaluating* GitHub semantics, not by matching
literal strings. What is modelled:

| Surface | Modelled |
|---|---|
| `on:` form | scalar `on: pull_request`, sequence `on: [pull_request]`, mapping with or without a filter block |
| `branches` / `branches-ignore` | exact names and `*` / `**` / `?` globs, compiled to GitHub's filter-pattern semantics (see below) |
| `paths` / `paths-ignore` | exact paths and `*` / `**` / `?` globs; `paths-ignore` makes trigger *coverage* unresolvable, which is recorded, not guessed |
| `types` | only the default set (`opened`, `synchronize`, `reopened`) or a superset |
| job `continue-on-error` | booleans, the strings `'true'`/`'false'`, and expression forms such as `${{ true }}`, `${{ false }}`, `${{ github.event_name == 'pull_request' }}` |
| job `if` | boolean algebra (`==`, `!=`, `&&`, `\|\|`, `!`, parentheses) over boolean literals, single-quoted strings, `github.event_name` and `always()`, with GitHub's **loose, case-insensitive** comparison |

### Filter patterns are GitHub's language, not shell or regex

The wildcards are compiled to GitHub's documented filter-pattern semantics. The
distinction that matters most is `?`:

| Form | Meaning | Consequence |
|---|---|---|
| `*` | zero or more characters, never `/` | `mast*` matches `master` |
| `**` | zero or more of **any** character, including `/` | `src/**.astro` matches `src/a/b.astro` |
| `**/` | zero or more **whole path segments** | `docs/**/*.md` matches `docs/README.md` *and* `docs/ci/gates/README.md` |
| `?` | **zero or one of the PRECEDING character** | `maste?` matches `maste` and `mast` but **NOT** `master`; `master?` matches `master` |
| `+`, `[]`, `!`, `{}` | valid GitHub / shell forms outside the supported model | `UNMODELED` — the trigger fails closed |

Reading `?` as "one arbitrary character" is what would let `branches: ['maste?']`
— a filter that does not target master at all — be reported as a master PR gate.
A `?` with nothing to quantify (`?master`) or applied to a wildcard (`mast*?`) is
`UNMODELED` rather than approximated.

Shell globs (`find … -name`, a `run:` block's `scripts/*.mjs`) are compiled by
the same bounded engine under **shell** semantics, where `?` really is one
arbitrary character. The two flavours never share semantics.

### Expression comparison is GitHub's, not JavaScript's

`==` is **loose** and compares strings **case-insensitively**, so
`github.event_name == 'PULL_REQUEST'` is true for a pull_request event and the
job is classified as the live PR gate it really is. Mixed operand types are cast
to a number (`''` → 0, a numeric string → its value, anything else → `NaN`, which
equals nothing). `&&` / `||` return an operand, not a boolean, and a job `if`
result is resolved through GitHub truthiness (the empty string is false, any
other string is true). Operators and functions outside this set — `===`, `>`,
`startsWith(...)`, `contains(...)`, `toJSON(...)`, any context other than
`github.event_name` — remain `UNMODELED`.

Everything else — `[]`/`+`/`!` glob syntax, a narrowed `types` list, an unknown
`pull_request` filter key, `${{ vars.X }}`, `github.ref` comparisons,
`contains(...)`, a partially interpolated string — derives the explicit
**`UNMODELED`** classification plus an `UNMODELED_TRIGGER` /
`UNMODELED_JOB_IF` / `UNMODELED_CONTINUE_ON_ERROR` gap. An `UNMODELED` job is
never `BLOCKING` (so it never looks directly requirable) and never `ADVISORY`
(so it never looks harmless).

`auditPortfolio` asserts, for every discovered job, that its pull_request
semantics are provable. That assertion is **absolute** — it compares the
repository against the engine, not against the snapshot — so synchronising the
stored snapshot to an `UNMODELED` value cannot buy a pass. Explicit modelling in
the engine is the only remedy. Two consequences worth stating plainly:

* `if: github.event_name == 'push'` is *evaluated* to false under a
  `pull_request` event, so it derives `CONDITIONAL_PRODUCTION_ONLY` and can never
  be reported as a PR-blocking or direct-required-safe job.
* `continue-on-error: ${{ true }}` derives `ADVISORY` and
  `continue-on-error: ${{ false }}` derives `BLOCKING`; neither is guessed from
  the raw YAML value.

## Bounded dependency model — exact boundary

Trigger-gap analysis is load-bearing, so the dependency set is a bounded,
deterministic closure rather than a one-level command scan. The universe is
`git ls-files`: an untracked file can never become a declared dependency.

**EXEC edges** (the job really runs it; the closure recurses into it):

* a tracked `.mjs` / `.cjs` / `.js` / `.sh` path named in a `run:` block
* a shell glob in a `run:` block, expanded against the tracked file list
  (this is how `scripts/portal/marketprofile-pipeline-*.mjs` resolves to its
  concrete tracked set)
* `npm run <name>` resolved through `package.json`, **recursively**, with cycle
  detection
* a relative `import` / `export … from` / `import()` / `require()` specifier
  inside an already-executed file
* a local `uses: ./…` action: its `action.yml`/`action.yaml`, its
  `runs.main`/`pre`/`post` entrypoint, and every `runs.steps[].run`

**READ edges** (executed code names the file as data; recorded, then the closure
stops — a file read as text is not itself executed):

* a string literal in an executed file that exactly matches a tracked repository
  path **and stands in a path/IO position** — an argument to `readFileSync`,
  `readFile`, `existsSync`, `statSync`, `createReadStream`, `readdirSync`,
  `globSync`, `join`, `resolve`, `pathToFileURL` (one level of nesting, so
  `readFileSync(join(ROOT, 'src/components/…​.astro'), 'utf8')` resolves), or the
  right-hand side of a plain assignment. Position matters: a path that appears
  only as fixture *data* inside a test's case table is not a file that test reads.
* `readdirSync(<dir>)`, expanded against the tracked file list, where `<dir>` is
  a literal or a name bound to one
* a template literal whose static chunk is rooted at a tracked top-level
  directory, expanded as a deterministic prefix
* `find <dir> [-type f] -name '<pat>'` in a `run:` block. `find` searches
  **recursively**, so the expansion covers the direct children of `<dir>` *and*
  every nested descendant.
* the ordered join of a call's literal path segments — `join(ROOT, 'src',
  'data', 'x.json')` denotes `src/data/x.json`, not four unrelated strings
* a name bound to any of the above by a `const`/`let`/`var` declaration, followed
  up to four levels, plus the two deterministic directory idioms
  `dirname(fileURLToPath(import.meta.url))` (the script's own directory) and
  `process.cwd()` (the repository root)
* code inside a template `${…}` **expression**, which is scanned as code — an
  `import(…)` or a `readFileSync(…)` written inside a template literal really
  executes and must not disappear into the string

**Fail closed — recorded, never silently omitted:**

* `DEPENDENCY_UNREADABLE` — an EXEC target that cannot be read. This is an
  **audit failure**.
* `DEPENDENCY_UNRESOLVABLE` — **any executed dependency form the bounded
  extractor cannot deterministically resolve**, recorded against the exact
  originating script with its reason. That is: a dynamic
  `import(pathExpr)`/`require(x)`, an interpolated module specifier
  (`` import(`./${name}.mjs`) ``), a content read whose input is computed
  (`readFileSync(target)`, `readFile(join(dir, name))`, `createReadStream(f)`), a
  directory enumeration whose directory is computed, a `find` form outside the
  supported subset (`-maxdepth`, `-path`, `-regex`, `-exec`, `-prune`, boolean
  operators, or no `-name` at all), a shell glob carrying `[]`/`{}`/`+` syntax, a
  shell glob rooted in the repository that expands to nothing, a relative
  specifier that resolves to no tracked file, a local `uses: ./…` with no tracked
  action manifest, or a closure that hit its node/depth bound. Each is recorded
  as a **fact in the frozen snapshot**, so it cannot be dropped or reworded
  without failing the `knownGaps` drift comparison.

The rule is symmetric: a form the engine *can* resolve deterministically must
resolve and must not be parked in the unresolvable list as noise, and a form it
cannot resolve must appear there. There is no third option in which the
dependency simply does not exist.

**Deliberately not modelled.** This is not a JavaScript interpreter and not a
speculative universal parser. Each executed file is run through a bounded
string/comment **lexer** (`lexJavaScript`) that separates code from string
literals, comments and regex literals — so `/['"]/` cannot desynchronise the
scan, and an `import … from './x'` that exists only *inside* a fixture string is
never treated as a real import. Every extraction rule then reads the resulting
code skeleton. Data flow through variables is covered only because the literal
scan is variable-agnostic; a computed path with no static repository-rooted
chunk is reported as `DEPENDENCY_UNRESOLVABLE` rather than guessed at.

What this closes, concretely, versus the previous one-level model:

* `cbw-go-transition.yml` now derives the eleven repository inputs
  `owner-confirmed-authority-split-test.mjs` really reads —
  `publicOfferAuthority.ts`, `publicOfferView.ts`, `homepageTop10.ts`,
  `homepageTop10Cta.ts`, `exchanges.json`, five components and
  `src/pages/promo-codes/index.astro` — none of which its `paths` filter covers.
* `cbw-noindex-product-preview-advisory.yml` now derives
  `src/components/site-standard/FirstViewport.astro`, read by
  `product-system-foundation-test.mjs`.
* `cbw-marketprofile-pipeline-advisory.yml` now derives the concrete tracked
  `scripts/portal/marketprofile-pipeline-*.mjs` set and the
  `src/data/candidates/**/*.ts` files the strict `tsc` step enumerates with
  `find`.

## Direct-required safety

`directRequiredSafe` is derived, not asserted:

```
directRequiredSafe = (classification === 'BLOCKING') && !pathFiltered
```

Because `UNMODELED` is not `BLOCKING`, a job whose semantics cannot be proved is
never `directRequiredSafe`.

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
* `TRIGGER_GAP_OWN_WORKFLOW_FILE`, `TRIGGER_GAP_SCRIPT` (an executed script),
  `TRIGGER_GAP_INPUT` (a repository file that executed code reads),
  `TRIGGER_GAP_SHARED_CONFIG`
* `TRIGGER_COVERAGE_UNRESOLVABLE` (a `paths-ignore` filter this model cannot resolve)
* `NO_BRANCH_FILTER`
* `MISLEADING_ADVISORY_FILENAME`, `MISLEADING_NON_BLOCKING_JOB_NAME`
* `UNMODELED_TRIGGER`, `UNMODELED_JOB_IF`, `UNMODELED_CONTINUE_ON_ERROR` —
  fail-closed modelling gaps. Each one makes the audit FAIL; none of them can be
  synchronised away.
* `DEPENDENCY_UNRESOLVABLE` (recorded fact), `DEPENDENCY_UNREADABLE` (audit failure)

The dominant finding: **most** product path-filtered PR gates run `npm ci` and
`npm run build`, yet **no** workflow in the repository lists `package.json`,
`package-lock.json`, `astro.config.mjs` or `tsconfig.json` in its `paths` filter
except `cbw-portal-contracts-advisory.yml` (which lists the two package files). A
dependency bump, an Astro config change or a tsconfig change therefore runs **zero**
product hard gates. Only the unified `Master required gate` — which has no path
filter — covers those changes today.

The one exception to "runs `npm ci`" is `Validate auto-deploy contract` in
`cbw-production-safe-batch-autodeploy.yml`: it is path-filtered and blocking, but
it installs nothing and builds nothing. It performs `node --check` syntax checks
on the two production diagnostics plus an inline Node invariant check over the
workflow file itself. It is therefore not exposed to the dependency/build shared
config gap in the same way — which is a statement about that job's inputs only
and changes no classification: it remains `BLOCKING`, path-filtered and
`directRequiredSafe: false`.

## Not wired into CI by this task

The validator and discovery test are deliberately **not** added to any workflow
here. Adding an enforcement step to `cbw-master-required-gate.yml` is a change to
the gate itself and belongs to the migration stage, not to the inventory stage.
They run locally via the two `npm` scripts above and in the S2-02 PR validation
evidence. Wiring them is the first candidate follow-up.
