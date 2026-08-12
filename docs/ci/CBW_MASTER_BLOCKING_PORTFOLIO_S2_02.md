# CBW Master Blocking Portfolio — Stage 2 / S2-02 (issue #366)

**Status:** INVENTORY + CONTRACT ONLY.
No gate logic is migrated, no branch protection is changed, no ruleset is created,
no workflow is weakened, no path filter is removed, and no product / research /
commercial authority is altered by this artifact.

**Integrity: expected PASS. Enforcement readiness: expected NOT_READY.**
S2-02 is **not** enforcement-ready and nothing here may be cited as
branch-protection, merge or deploy authority. See
[Two contracts, two commands](#two-contracts-two-commands-integrity-vs-enforcement-readiness).

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
| [`scripts/ci/master-blocking-portfolio-validator.mjs`](../../scripts/ci/master-blocking-portfolio-validator.mjs) | `npm run ci:master-portfolio:validate` — **PORTFOLIO INTEGRITY**. Re-proves the contract against the real workflow YAML. |
| [`scripts/ci/master-blocking-portfolio-readiness.mjs`](../../scripts/ci/master-blocking-portfolio-readiness.mjs) | `npm run ci:master-portfolio:readiness` — **ENFORCEMENT READINESS**. May this portfolio become blocking enforcement authority? |
| [`scripts/ci/master-blocking-portfolio-discovery-test.mjs`](../../scripts/ci/master-blocking-portfolio-discovery-test.mjs) | `npm run ci:master-portfolio:discovery` — live coverage check **plus** mutation probes that prove the audit can fail. |

## Two contracts, two commands: INTEGRITY vs ENFORCEMENT READINESS

These are different questions and must never be conflated. Answering "is the
inventory truthful?" with "yes" is not, and never becomes, permission to enforce
anything.

| | **Portfolio integrity** | **Enforcement readiness** |
| --- | --- | --- |
| Command | `npm run ci:master-portfolio:validate` | `npm run ci:master-portfolio:readiness` |
| Question | Is `master-blocking-portfolio.json` a **true and internally coherent** statement about the workflows in this repository today? | May this portfolio be used as **blocking enforcement authority**? |
| Passes when | schema valid · supported `schemaVersion` · inventory complete · every current workflow/job represented · classifications match repository truth · trigger/path semantics match · dependency facts match · unresolved facts **faithfully recorded** · stored snapshot equals live derivation · no unexpected drift | **no** `DEPENDENCY_UNRESOLVABLE` row remains inside blocking authority |
| `DEPENDENCY_UNRESOLVABLE` | **DATA.** A truthful "I cannot resolve this" is a correct statement about repository truth, so its existence does not fail integrity. | **DISQUALIFYING**, for every entry that carries blocking authority. |
| **Baseline today** | **expected PASS** | **expected NOT_READY** |

**S2-02 is NOT enforcement-ready, and this document does not claim it is.** The
readiness command exits non-zero today. That non-zero exit is the *correct*
result on the current baseline — it is not a build failure, not a contract
failure, and must be reported separately from the validation suite.

### The authority rule

```
integrityValid   = true
enforcementReady = false
```

A passing integrity audit confers **no** branch-protection, merge or deploy
authority. The rule is not only prose: `AUTHORITY_RULE` is exported from
`master-blocking-portfolio-contract.mjs`, the integrity validator prints it on
its own success path next to a machine-readable
`integrityValid=… enforcementReady=… enforcementAuthority=…` line, and
`evaluateEnforcementReadiness` returns
`integrityImpliesEnforcementAuthority: false` in every result. Enforcement
authority is required only at later migration / protection-activation stages,
and is conferred only by a **passing readiness** evaluation.

### What integrity still fails on

Treating unresolved facts as data is not a loophole. Integrity fails if an
unresolved fact is **dropped**, **reworded**, **duplicated** or **invented**, if
a live unresolved fact is **missing** from the snapshot, or if live semantics the
engine cannot prove are not represented — the fidelity of the recorded set is
compared as a sorted multiset against the live derivation, entry by entry, with
its own named assertions. `UNMODELED_TRIGGER`, `UNMODELED_JOB_IF`,
`UNMODELED_CONTINUE_ON_ERROR` and `DEPENDENCY_UNREADABLE` remain absolute
integrity failures that no snapshot synchronisation can clear.

### Which entries carry blocking authority

Readiness scope is exact, and it is why an advisory job's unresolved dependency
cannot veto enforcement:

| classification | carries blocking authority? | why |
| --- | --- | --- |
| `BLOCKING` | **yes** | it can fail a pull request to master today, so enforcement would rest on its dependency surface. Stage-2 migration candidates are a strict subset (candidacy requires `BLOCKING`) and are counted separately. |
| `UNMODELED` | **yes**, fail closed | its semantics were never proven, so it cannot be shown to sit *outside* blocking authority |
| `ADVISORY` | no | `continue-on-error` means it cannot fail a PR |
| `NON_PR` | no | it never runs on a PR to master |
| `CONDITIONAL_PRODUCTION_ONLY` | no | its `if` is provably false for pull requests |

An advisory/non-PR entry that later becomes blocking is not a loophole: its
classification is re-derived from the YAML on every integrity run, so the day it
can fail a PR it enters the authority set automatically.

### Current baseline numbers

Regenerate with the two commands; they are printed, never restated as prose.

| metric | value |
| --- | --- |
| integrity result | **PASS** (2 766 / 2 766 checks) |
| enforcement readiness | **NOT_READY** |
| unresolved rows, whole portfolio | 225 |
| unresolved rows **inside blocking authority** | **74** |
| affected **BLOCKING entries** | **15** |
| entries carrying blocking authority | 15 |
| of which stage-2 migration candidates | 13 |
| unresolved rows outside blocking authority | 151 (`ADVISORY` 92, `NON_PR` 39, `CONDITIONAL_PRODUCTION_ONLY` 20) |

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

#### Short-circuit never hides an unmodelled subexpression

Modelability is decided over the **whole expression**, before any truthiness is
computed. GitHub's `&&` / `||` short-circuit at run time, but governance
modelling is a statement about *syntax*: an expression that mentions something
outside the model is unmodelled even when a run-time evaluator could decide it
without looking at that operand. So all of

```
false && github.ref == 'refs/heads/master'
true  || github.ref == 'refs/heads/master'
(false && (github.ref == 'refs/heads/master'))
false && contains(github.ref, 'master')
```

derive `UNMODELED`, not `false`/`true`. `github.ref` stays deliberately outside
the model; the fix is a modelability pass (`expressionIsFullyModeled`), not a
widening of the supported surface. Short-circuiting still works *inside* the
model, so `false && github.event_name == 'pull_request'` is still `false`.

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
  every nested descendant. It is recognised at every shell command position,
  including behind a modelled command wrapper (`command find …`,
  `env LC_ALL=C find …`, `bash -c "find …"` — see below)
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
  **integrity failure**: the derivation itself has a hole, so no snapshot claim
  about that job's dependencies can be called true.
* `DEPENDENCY_UNRESOLVABLE` — a recorded **fact**, not an integrity failure (it
  is a true statement that a form lies outside the bounded model), held to a
  fidelity standard by integrity and **disqualifying for enforcement readiness**
  wherever it sits inside blocking authority. It covers **any executed dependency form the bounded
  extractor cannot deterministically resolve**, recorded against the exact
  originating script with its reason. That is: a dynamic
  `import(pathExpr)`/`require(x)`, an interpolated module specifier
  (`` import(`./${name}.mjs`) ``), a content read whose input is computed
  (`readFileSync(target)`, `readFile(join(dir, name))`, `createReadStream(f)`), a
  directory enumeration whose directory is computed, a `find` form outside the
  supported subset (`-maxdepth`, `-path`, `-regex`, `-exec`, `-prune`, boolean
  operators, or no `-name` at all), a command-wrapper form outside the modelled
  subset (an unsupported `command`/`env`/`time` option, a computed `env`
  assignment, a non-literal `sh -c` program, a wrapper chain or `-c` nesting past
  its bound), a shell glob carrying `[]`/`{}`/`+` syntax, a
  shell glob rooted in the repository that expands to nothing, a relative
  specifier that resolves to no tracked file, a local `uses: ./…` with no tracked
  action manifest, or a closure that hit its node/depth bound. Each is recorded
  as a **fact in the frozen snapshot**, so it cannot be dropped or reworded
  without failing the `knownGaps` drift comparison.

The rule is symmetric: a form the engine *can* resolve deterministically must
resolve and must not be parked in the unresolvable list as noise, and a form it
cannot resolve must appear there. There is no third option in which the
dependency simply does not exist.

### A `run:` block is shell, so it is tokenized as shell

Command position is decided by a bounded shell tokenizer (`tokenizeShell`), not
by a regex guessing where a command "usually" starts. A regex anchored at *start
of line, `;`, `|`, `&`, `(`* silently omits every other real command position
and simultaneously mistakes quoted data for an invocation. The tokenizer
recognises an executable command position at: start of script, a newline, `;`,
`;;`, `&&`, `||`, `|`, `&`, `(`, `)` (which is also how a `case` arm introduces
its command list), a standalone `{` or `}`, after any of the control keywords
`if` / `then` / `elif` / `else` / `while` / `until` / `do` / `!`, and
after a `VAR=value` assignment prefix. It tracks single quotes, double quotes,
backslash escapes and `$(…)` / backtick command substitutions (which execute,
and are tokenized recursively, even inside double quotes).

Two consequences:

* `if find …`, `then find …`, `do find …`, `{ find …; }`, `x=$(find …)` all
  resolve their dependencies. None of them did before.
* `echo '(find src/data -maxdepth 1 …)'` creates **no** dependency and **no**
  unresolvable row: it is data, not an executed command. A quoted `*` is a
  literal asterisk, not a glob — but a quoted *path* is still a real dependency,
  because `node "scripts/x.mjs"` really runs that file.

#### Command wrappers are unwrapped, never skipped

A wrapper is a command whose *arguments* are themselves a command. Reading only
the head word made `command find …`, `env LC_ALL=C find …` and
`bash -c "find …"` resolve to nothing at all — no dependency **and** no
unresolvable row, the one outcome this contract forbids. The rule is uniform: a
wrapper is either unwrapped deterministically or recorded as
`DEPENDENCY_UNRESOLVABLE`.

| Wrapper | Modelled | Outside the model |
| --- | --- | --- |
| `command` | bare, and `command -p` | any other option, including `command -v` (which does not execute the wrapped command) |
| `env` | any number of deterministic `NAME=value` assignments, then the wrapped command | any flag (`env -i`, `env -u X`), an assignment whose value is a `$VAR` or a `$(…)` |
| `exec`, `nohup`, `builtin` | bare | any option |
| `time` | bare, and `time -p` | any other option. `time` is a **wrapper**, not a control keyword: `time -p find …` would otherwise put `-p` in command position and hide the `find` |
| `sh`/`bash`/`dash`/`ksh`/`zsh` `-c` | a **literal** program string, parsed recursively as a nested shell program (bounded to four levels, so a nesting cycle terminates in a recorded row) | a computed program (`bash -c "$CMD"`), or any option before `-c` (`bash -euo pipefail -c …`) |

#### Path-qualified executables use a closed EXACT-PATH allowlist

A modelled wrapper name is only modelled when the shell would really resolve it
to the tool this engine understands. Trusting an absolute path by its
**basename** was a trust hole: `/custom/bash`, `/evil/find` and `/custom/env` are
arbitrary programs that merely borrowed a familiar file name, and modelling them
would invent dependency facts for code the engine has never seen.

So a path-qualified executable is normalised **only** when its exact literal path
is one of the sixteen allowlisted paths — the two directories a POSIX/FHS system
installs these tools in (`/bin`, `/usr/bin`) crossed with the modelled
executables (`sh`, `bash`, `dash`, `ksh`, `zsh`, `env`, `find`, `nohup`):

```
/bin/sh    /bin/bash    /bin/dash    /bin/ksh    /bin/zsh    /bin/env    /bin/find    /bin/nohup
/usr/bin/sh /usr/bin/bash /usr/bin/dash /usr/bin/ksh /usr/bin/zsh /usr/bin/env /usr/bin/find /usr/bin/nohup
```

The set is published machine-readably as
`SUPPORTED_SHELL_MODEL.pathQualifiedCommandPaths`. Every other absolute path —
`/usr/local/bin/bash`, `/opt/homebrew/bin/find`, `/bin/../custom/bash`,
`/usr/bin/./find`, or any path computed at run time — is
`DEPENDENCY_UNRESOLVABLE`, resolves **no** dependency, and is never modelled
because a basename matched. A *relative* path in command position
(`./bin/bash`) keeps its whole spelling as the command name, which matches no
wrapper or shell list, so it cannot borrow modelled semantics either.

`bash script.sh` is not a `-c` invocation and is unaffected: the script path is a
path-shaped word and is followed as an EXEC edge exactly as before. Wrappers
chain (`env FOO=x command find …`) up to four levels; a deeper chain is
recorded. A wrapped command name that is quoted or dynamic (`command 'find' …`,
`command $TOOL …`) is recorded rather than guessed at.

#### Unsupported structure is lexical, not textual

A here-document (`<<`) and a process substitution (`<(…)`, `>(…)`) are
**operators**, so they are detected where the shell would *execute* them — in
the tokenizer's scan, which never sees the interior of `'…'` or `"…"` or a
backslash-escaped character. So `echo '<< is documentation text'`,
`echo "<(not executable)"` and `echo \<\<` are data: no dependency and no
unresolvable row. A real here-document, a real `<(…)`/`>(…)` and an unterminated
substitution still emit `DEPENDENCY_UNRESOLVABLE`, and a `find` that really is
executed inside a `<(…)` or a `"$(…)"` is still analysed.

Unmodelled glob syntax on an executed word is likewise recorded, including the
`./`-relative forms `./scripts/{alpha,beta}.mjs` and `./scripts/[ab].mjs`; an
ordinary `scripts/*.mjs` still expands deterministically and raises no row.

**Deliberately not modelled.** This is not a JavaScript interpreter and not a
speculative universal parser. Each executed file is run through a bounded
**lexer** (`lexJavaScript`) that separates code from string literals, comments,
template literals and regex literals, so an `import … from './x'` that exists
only *inside* a fixture string is never treated as a real import. Every
extraction rule then reads the resulting code skeleton.

Regex-versus-division is decided from the previous significant **token**, not
the previous character: after a keyword only `return`, `typeof`, `instanceof`,
`in`, `of`, `new`, `delete`, `void`, `throw`, `case`, `do`, `else`, `yield` and
`await` admit a regex; after `)` it depends on whether that paren closed an
`if`/`while`/`for`/`with` head; after a number, a string, a template, a regex,
`]`, `++` or `--` a `/` is division. The same rules apply *inside* a template
`${…}` expression, which is where the previous single-character heuristic
desynchronised: `` `'${String(v).replace(/'/g, `'\\''`)}'` `` contains a quote
inside a regex, and reading it as an opening string literal swallowed every
executable call after it. A construct the lexer cannot disambiguate emits
`DEPENDENCY_UNRESOLVABLE` ("source could not be lexed unambiguously") rather
than being silently skipped.

Data flow through variables is covered only because the literal scan is
variable-agnostic; a computed path with no static repository-rooted chunk is
reported as `DEPENDENCY_UNRESOLVABLE` rather than guessed at.

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

## Counting unresolved dependencies — the terms are defined in code

Every metric quoted about this contract comes from
`summarizeUnresolvedDependencies` in
`scripts/ci/master-blocking-portfolio-contract.mjs` and is printed by the
validator, so any figure in a report or a PR body can be regenerated with one
command:

```
npm run ci:master-portfolio:validate
```

Each `DEPENDENCY_UNRESOLVABLE` detail is a fact of the shape
`<origin> :: <reason>`, split at the **first** ` :: ` (a reason may itself
contain that sequence). The four defined terms are:

| term | definition |
| --- | --- |
| `unresolvedRows` | one per (portfolio entry, gap) pair — the same fact is counted once per job that depends on it |
| `distinctOriginReasonFacts` | distinct whole `<origin> :: <reason>` strings |
| `distinctReasons` | distinct `<reason>` strings, origin removed |
| `distinctOrigins` | distinct `<origin>` strings |

There is deliberately **no** "distinct forms" metric. An earlier write-up quoted
"42 distinct forms", a number nobody could reproduce because "form" was never
defined anywhere executable; prose metrics are not auditable. Do not introduce a
new count without defining it in code here first.

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
  fail-closed modelling gaps. Each one makes the **integrity** audit FAIL; none
  of them can be synchronised away.
* `DEPENDENCY_UNREADABLE` — fail-closed **integrity** failure.
* `DEPENDENCY_UNRESOLVABLE` — recorded fact. Integrity holds it to a fidelity
  standard (it may not be dropped, reworded, duplicated or invented); it
  disqualifies **enforcement readiness** inside blocking authority. This is the
  only gap code in `ENFORCEMENT_BLOCKING_GAP_CODES`.

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

## R3 regression coverage

Section **F2** of `master-blocking-portfolio-discovery-test.mjs` reproduces each
form the R3 review demonstrated on the previous head and asserts the new
behaviour. What each group pins:

| group | obligation |
| --- | --- |
| `R3 HIGH: short-circuit does not launder …` (19 forms × 2) | an unmodelled operand behind `false &&` / `true \|\|`, nested parentheses, `&&`/`\|\|` chains, either side of an equality, an unmodelled function — every one derives `UNMODELED`, and the matching job-level `if` fails closed |
| `R3 HIGH: … still short-circuits` | short-circuiting inside the model is unchanged, so nothing was traded away |
| `R3 HIGH: github.ref is NOT over-modelled` | the unsupported surface stayed unsupported |
| `R3 MEDIUM: find at <position>` (19 positions × 3) | `find` resolves both the direct and the nested match, and over-matches nothing, at every modelled command position |
| `R3 MEDIUM: unsupported find form` | `-maxdepth`, `-exec`, `-regex`, `-prune`, a missing `-name`, a computed or glob search root are all recorded |
| `R3 MEDIUM: unsupported shell glob` | brace expansion and character classes, `./`-relative and repo-rooted, plus negated and malformed forms |
| `R3 MEDIUM: an ordinary supported glob …` | the symmetric obligation — deterministic expansion, zero unresolvable rows |
| `R3 MEDIUM: shell structure outside the model` | here-documents, process substitutions and unterminated substitutions emit `DEPENDENCY_UNRESOLVABLE` |
| `R3 MEDIUM: no executable read disappears behind …` (14 constructs) | regex after `return`/`typeof`/`case`/an `if` head; division after `)`/an identifier/a number/`++`; an escaped slash; the template+regex desync case; comments and strings still ignored |
| `R3 LOW: …` | quoted, double-quoted and escaped `find` text creates no row; a real `$(find …)` still executes; a quoted path is still a dependency; a quoted `*` is a literal |
| `R3 metrics: …` | the count vocabulary above, against a hand-checkable fixture and the live file |

Section **F3** does the same for the R4 review:

| group | obligation |
| --- | --- |
| `R4 MEDIUM: a wrapped find behind <wrapper>` (16 wrappers × 4) | `command`, `command -p`, `env` with one/several/quoted assignments, `bash -c`, `sh -c`, a nested `-c`, `exec`, `nohup`, `time`, `time -p`, `builtin`, a wrapper chain, a wrapper in an `if` head and inside `$(…)` each resolve the direct *and* the nested match, over-match nothing, and raise **zero** unresolvable rows |
| `R4 MEDIUM: <unsupported wrapper form>` (18 forms × 2) | unsupported `command`/`env`/`time` options, `command -v`, a computed `env` assignment, a dynamic or substituted `-c` program, options before `-c`, a missing `-c` argument, a quoted or dynamic wrapped command name, a wrapper around an unsupported `find`, and both bounds (wrapper chain depth, `-c` nesting depth) are each recorded, never silently dropped |
| `R4 MEDIUM: a glob inside a `-c` program string …` | the program string is parsed as a shell program, so its glob expands into real EXEC edges instead of vanishing as quoted data |
| `R4 LOW: <quoted operator>` (10 forms × 2) | single-quoted, double-quoted and escaped `<<` / `<(` / `>(` text, a quoted here-doc marker and operator text in a comment raise **no** here-document or process-substitution row — and no unresolvable row at all |
| `R4 LOW: <real operator>` | a real here-document, a real `<(…)`/`>(…)` and a real `$(…)` inside double quotes are still recorded or still analysed, so the false-positive fix bought no false negative |

The fully-synchronised mutation suite (section **G**) additionally carries four
short-circuit-laundering workflows and the R4 wrapper probes. Each derives
`UNMODELED` (or, for the wrapper probes, exposes a previously hidden EXEC edge
that fails closed as `DEPENDENCY_UNREADABLE`), and **still fails the integrity
audit** after the snapshot has been regenerated to agree with it perfectly —
which is the property that makes the contract un-synchronisable out of a
fail-closed state. An unsupported wrapper form likewise carries its
`DEPENDENCY_UNRESOLVABLE` fact into the synchronised snapshot, so it can never
present a clean bill of health: integrity accepts the truthful record, and
**readiness rejects it**.

## R6 regression coverage — the two contracts, proved separately

| group | obligation |
| --- | --- |
| `R6 SEPARATION` | `DEPENDENCY_UNRESOLVABLE` is **not** an integrity fail-closed code and **is** the enforcement-blocking code; the four unprovable-semantics codes stay integrity fail-closed; `AUTHORITY_RULE` denies that integrity implies authority |
| `R6 DISCOVERY A` | the current truthful baseline: integrity PASSES with **zero** failures, and the same baseline is **NOT** enforcement-ready with a non-zero blocking row/entry count. Every unresolved row is partitioned into exactly one of blocking / non-blocking authority, and every live carrier is recorded faithfully |
| `R6 DISCOVERY B` | deleting, rewording, inventing or duplicating an unresolved row on an otherwise perfectly synchronised snapshot each fails **integrity**, by name |
| `R6 DISCOVERY C` | six new unsupported blocking dependencies (`env -i find`, a dynamic `bash -c`, `sudo`, process substitution, `/custom/bash`, `/evil/find`) each land in a `BLOCKING` entry, **pass integrity** once truthfully recorded, and each make **readiness FAIL** on that same snapshot |
| `R6 DISCOVERY D` | a synthetic `BLOCKING` entry with every dependency resolved **is** enforcement-ready — the verdict is capable of passing, not a constant `false`; a single unresolved row is enough to fail it; non-enforcement gap codes never block it |
| `R6 DISCOVERY E` | an unresolved dependency in an `ADVISORY` / `NON_PR` / `CONDITIONAL_PRODUCTION_ONLY` entry is reported as *outside* blocking authority and does **not** fail blocking-enforcement readiness; an `UNMODELED` entry fails closed *into* authority; a null/malformed/empty portfolio fails closed |
| `R6 DISCOVERY F` | an arbitrary `/custom/bash`-style executable truthfully records unresolved, keeps integrity passing when the snapshot matches, and fails readiness when it sits in a blocking entry |
| `R6 M2` | eight allowlisted exact paths are modelled with their raw spelling preserved; seven arbitrary paths (`/custom/bash`, `/evil/find`, `/custom/env`, `/usr/local/bin/bash`, `/opt/homebrew/bin/find`, `/bin/../custom/bash`, `/usr/bin/./find`) are **never** modelled by basename, record `DEPENDENCY_UNRESOLVABLE` and invent no dependency; a dynamic and a command-substituted path are unresolved; the allowlist is a closed machine-readable set of exact literal paths |

## Not wired into CI by this task

The validator, the readiness command and the discovery test are deliberately
**not** added to any workflow here. Adding an enforcement step to
`cbw-master-required-gate.yml` is a change to the gate itself and belongs to the
migration stage, not to the inventory stage. They run locally via the three
`npm` scripts above and in the S2-02 PR validation evidence. Wiring them is the
first candidate follow-up — and the readiness command in particular must not be
wired as a blocking step while it legitimately reports `NOT_READY`.
