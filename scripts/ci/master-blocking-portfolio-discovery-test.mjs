#!/usr/bin/env node
// Deterministic discovery/coverage test for the master blocking-portfolio
// contract (issue #366, Stage 2 / S2-02).
//
// Three obligations, all offline:
//
//   A. LIVE — the real repository inventory agrees with
//      scripts/ci/master-blocking-portfolio.json today. A drifted job name, a
//      flipped continue-on-error, a widened path filter or a brand-new
//      blocking-capable PR workflow fails here.
//
//   B. SEMANTICS — every valid GitHub trigger / `continue-on-error` /
//      job-level `if` shape this engine claims to handle is probed directly,
//      and every shape it does NOT model is proved to fail closed into the
//      explicit UNMODELED state rather than being guessed permissively.
//
//   C. MUTATION — the audit is proved CAPABLE of failing. A coverage test that
//      silently matches nothing looks exactly like a coverage test that passes,
//      so every rule is exercised against a deliberately mutated inventory or a
//      deliberately mutated portfolio and must produce a NAMED failure. The real
//      files are never touched; every mutation is applied to an in-memory copy.
//
//      Crucially, section G re-runs the dangerous mutations against a portfolio
//      snapshot that has been FULLY SYNCHRONISED to the mutated derivation.
//      Synchronising the snapshot must NOT buy a pass.
//
// Discovery is SEMANTIC, never filename-based. The probes below deliberately
// include a workflow whose filename says "advisory" while its job is blocking,
// and a workflow whose filename says nothing at all — both must be discovered
// and both must demand explicit classification.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AUTHORITY_RULE,
  BLOCKING_AUTHORITY_CLASSIFICATIONS,
  CLASSIFICATIONS,
  ENFORCEMENT_BLOCKING_GAP_CODES,
  FAIL_CLOSED_GAP_CODES,
  GAP_CODES,
  MIGRATION_STATES,
  ROOT_KEYS,
  SCHEMA_VERSION,
  SUPPORTED_SHELL_MODEL,
  UNMODELED,
  auditPortfolio,
  deriveDependencyClosure,
  deriveInventory,
  deriveJobFacts,
  derivePullRequestTrigger,
  deriveStage2Candidacy,
  evaluateContinueOnError,
  evaluateEnforcementReadiness,
  participatesInBlockingAuthority,
  evaluateGithubExpression,
  evaluateJobIfForPullRequest,
  extractCommands,
  lexJavaScript,
  matchesPathPattern,
  matchesRefPattern,
  matchesShellGlob,
  parseWorkflow,
  summarizeUnresolvedDependencies,
  tokenizeShell,
} from './master-blocking-portfolio-contract.mjs';
import {
  loadWorkflowFiles,
  loadPackageScripts,
  loadRepoFiles,
  makeRepoReader,
  PORTFOLIO_PATH,
} from './master-blocking-portfolio-validator.mjs';

const ROOT = resolve(process.cwd());

let checks = 0;
const failures = [];
function check(label, ok, detail = '') {
  checks += 1;
  if (!ok) failures.push(detail ? `${label}: ${detail}` : label);
}

const files = loadWorkflowFiles();
const packageScripts = loadPackageScripts();
const repoFiles = loadRepoFiles();
const readFile = makeRepoReader();
const portfolioText = readFileSync(resolve(ROOT, PORTFOLIO_PATH), 'utf8');
const exists = (path) => existsSync(resolve(ROOT, path));

const run = (overrides = {}) =>
  auditPortfolio({
    portfolioText,
    files,
    packageScripts,
    exists,
    repoFiles,
    readFile,
    ...overrides,
  });

// A named failure is one whose label matches `pattern`. Requiring the LABEL to
// match, rather than merely counting failures, keeps a probe from being
// satisfied by some unrelated rule that happened to trip.
function expectFailure(label, results, pattern) {
  const named = results.filter((result) => !result.ok && pattern.test(result.label));
  check(label, named.length > 0, `no failure matched ${pattern}`);
  return named;
}

function expectNoFailure(label, results, pattern) {
  const named = results.filter((result) => !result.ok && pattern.test(result.label));
  check(label, named.length === 0, named.map((result) => `${result.label}: ${result.detail}`).join(' | '));
}

// Derive the facts of a single synthetic one-job workflow.
function probeFacts(text, { workflowFile = 'probe.yml', jobId = 'probe' } = {}) {
  return deriveJobFacts({
    workflowFile,
    workflowDoc: parseWorkflow(text),
    jobId,
    packageScripts,
    repoFiles,
    readFile,
  });
}

// ============================================================================
// A. LIVE INVENTORY
// ============================================================================

check('workflow inventory is non-empty', files.length > 0);
// R6: the two contracts are SEPARATE. A truthfully recorded unresolved
// dependency is integrity DATA; it disqualifies ENFORCEMENT READINESS instead.
check(
  'R6 SEPARATION: DEPENDENCY_UNRESOLVABLE is NOT an integrity fail-closed code',
  !FAIL_CLOSED_GAP_CODES.includes('DEPENDENCY_UNRESOLVABLE'),
  JSON.stringify(FAIL_CLOSED_GAP_CODES),
);
check(
  'R6 SEPARATION: DEPENDENCY_UNRESOLVABLE IS an enforcement-blocking code',
  ENFORCEMENT_BLOCKING_GAP_CODES.includes('DEPENDENCY_UNRESOLVABLE'),
  JSON.stringify(ENFORCEMENT_BLOCKING_GAP_CODES),
);
check(
  'R6 SEPARATION: unprovable SEMANTICS remain integrity fail-closed codes',
  ['UNMODELED_TRIGGER', 'UNMODELED_JOB_IF', 'UNMODELED_CONTINUE_ON_ERROR', 'DEPENDENCY_UNREADABLE'].every((code) =>
    FAIL_CLOSED_GAP_CODES.includes(code),
  ),
  JSON.stringify(FAIL_CLOSED_GAP_CODES),
);
check(
  'R6 AUTHORITY RULE: integrity success never implies enforcement authority',
  AUTHORITY_RULE.integrityImpliesEnforcementAuthority === false && /confers no branch-protection/.test(AUTHORITY_RULE.statement),
  JSON.stringify(AUTHORITY_RULE),
);

const live = run();
const liveFailures = live.filter((result) => !result.ok);
// DISCOVERY A: the current truthful baseline is integrity PASS.
check(
  'R6 DISCOVERY A: the live repository passes PORTFOLIO INTEGRITY with no failure at all',
  liveFailures.length === 0,
  liveFailures.map((result) => `${result.label}${result.detail ? `: ${result.detail}` : ''}`).join(' | '),
);
const livePortfolio = JSON.parse(portfolioText);
const liveReadiness = evaluateEnforcementReadiness(livePortfolio);
// DISCOVERY A: ... and enforcement readiness FAILS on that same baseline.
check(
  'R6 DISCOVERY A: the same truthful baseline is NOT enforcement-ready',
  liveReadiness.enforcementReady === false &&
    liveReadiness.unresolvedBlockingRows > 0 &&
    liveReadiness.affectedBlockingEntries > 0,
  JSON.stringify({
    enforcementReady: liveReadiness.enforcementReady,
    unresolvedBlockingRows: liveReadiness.unresolvedBlockingRows,
    affectedBlockingEntries: liveReadiness.affectedBlockingEntries,
  }),
);
check(
  'R6 DISCOVERY A: readiness reports the exact blocking rows, entries and reason/origin summaries',
  liveReadiness.rows.length === liveReadiness.unresolvedBlockingRows &&
    new Set(liveReadiness.rows.map((row) => row.entryId)).size === liveReadiness.affectedBlockingEntries &&
    liveReadiness.reasonSummary.reduce((total, bucket) => total + bucket.rows, 0) === liveReadiness.unresolvedBlockingRows &&
    liveReadiness.originSummary.reduce((total, bucket) => total + bucket.rows, 0) === liveReadiness.unresolvedBlockingRows &&
    liveReadiness.blockers.length > 0,
  JSON.stringify({
    rows: liveReadiness.rows.length,
    reasonRows: liveReadiness.reasonSummary.reduce((total, bucket) => total + bucket.rows, 0),
    originRows: liveReadiness.originSummary.reduce((total, bucket) => total + bucket.rows, 0),
  }),
);
check(
  'R6 DISCOVERY A: every unresolved row is partitioned into exactly one of blocking / non-blocking authority',
  liveReadiness.unresolvedBlockingRows + liveReadiness.outsideBlockingAuthority.unresolvedRows ===
    summarizeUnresolvedDependencies(livePortfolio).unresolvedRows,
  JSON.stringify({
    blocking: liveReadiness.unresolvedBlockingRows,
    outside: liveReadiness.outsideBlockingAuthority.unresolvedRows,
    total: summarizeUnresolvedDependencies(livePortfolio).unresolvedRows,
  }),
);
check(
  'R6 DISCOVERY A: every entry carrying blocking authority is BLOCKING or UNMODELED',
  livePortfolio.entries
    .filter((entry) => participatesInBlockingAuthority(entry).participates)
    .every((entry) => BLOCKING_AUTHORITY_CLASSIFICATIONS.includes(entry.classification)),
  JSON.stringify(
    livePortfolio.entries
      .filter((entry) => participatesInBlockingAuthority(entry).participates)
      .map((entry) => entry.classification),
  ),
);

const { entries: derived, parseErrors } = deriveInventory({ files, packageScripts, repoFiles, readFile });
check('every tracked workflow parses', parseErrors.length === 0, JSON.stringify(parseErrors));
check('every discovered job carries a classification', derived.every((entry) => CLASSIFICATIONS.includes(entry.classification)));
check(
  'no live job derives as UNMODELED (repository semantics are fully provable today)',
  derived.every((entry) => entry.classification !== 'UNMODELED'),
  derived.filter((entry) => entry.classification === 'UNMODELED').map((entry) => entry.workflowFile).join(','),
);
check(
  'at least one BLOCKING and one ADVISORY job exist (the audit is not vacuous)',
  derived.some((entry) => entry.classification === 'BLOCKING') &&
    derived.some((entry) => entry.classification === 'ADVISORY'),
);
check(
  'exactly one PR-blocking job is always-reporting AND is the unified gate host',
  derived.filter((entry) => entry.classification === 'BLOCKING' && !entry.pathFiltered).length >= 1,
);

// The two semantic traps this contract exists to catch must actually be caught
// by the LIVE derivation — not merely described in prose.
const noindex = derived.find((entry) => entry.workflowFile === 'cbw-noindex-product-preview-advisory.yml');
check(
  'a workflow whose FILENAME says "advisory" is still derived as BLOCKING when its YAML is blocking',
  noindex?.classification === 'BLOCKING',
  String(noindex?.classification),
);
check(
  'that filename/semantics mismatch is recorded as an explicit gap',
  (noindex?.knownGaps ?? []).some((gap) => gap.code === 'MISLEADING_ADVISORY_FILENAME'),
);
const prAdvisory = derived.find((entry) => entry.workflowFile === 'cbw-pr-advisory-gate.yml');
check(
  'a job whose NAME says "(non-blocking)" is still derived as BLOCKING when it has no job-level continue-on-error',
  prAdvisory?.classification === 'BLOCKING',
  String(prAdvisory?.classification),
);
check(
  'that job-name/semantics mismatch is recorded as an explicit gap',
  (prAdvisory?.knownGaps ?? []).some((gap) => gap.code === 'MISLEADING_NON_BLOCKING_JOB_NAME'),
);
const routeInventory = derived.find((entry) => entry.workflowFile === 'cbw-route-inventory-artifact.yml');
check(
  'a hard gate whose filename contains neither "gate" nor "advisory" is still derived as BLOCKING',
  routeInventory?.classification === 'BLOCKING',
  String(routeInventory?.classification),
);
check(
  'every recorded gap code is in the closed vocabulary',
  derived.every((entry) => entry.knownGaps.every((gap) => GAP_CODES.includes(gap.code))),
);

// The production release job is guarded by `github.event_name != 'pull_request'`
// and must never be reported as a PR gate or as directly requirable.
const productionRelease = derived.find(
  (entry) => entry.workflowFile === 'cbw-production-safe-batch-autodeploy.yml' && entry.jobId === 'deploy',
);
check(
  'the production release job never derives as a PR-blocking job',
  productionRelease?.classification === 'CONDITIONAL_PRODUCTION_ONLY' && productionRelease?.directRequiredSafe === false,
  `${productionRelease?.classification}/${productionRelease?.directRequiredSafe}`,
);

// ============================================================================
// B. PRIMITIVES
// ============================================================================

check("matchesPathPattern: 'src/pages/**' matches a nested file", matchesPathPattern('src/pages/a/b.astro', 'src/pages/a/b.astro'));
check("matchesPathPattern: '**' crosses directory separators", matchesPathPattern('src/pages/**', 'src/pages/a/b.astro'));
check("matchesPathPattern: '*' does NOT cross separators", !matchesPathPattern('scripts/*.mjs', 'scripts/ui/x.mjs'));
check("matchesPathPattern: '*' matches within a segment", matchesPathPattern('scripts/portal/marketprofile-pipeline-*.mjs', 'scripts/portal/marketprofile-pipeline-a.mjs'));
check('matchesPathPattern: an exact path matches only itself', matchesPathPattern('package.json', 'package.json') && !matchesPathPattern('package.json', 'package-lock.json'));
check('matchesPathPattern: a dot is literal, not a wildcard', !matchesPathPattern('package.json', 'packageXjson'));
check('matchesPathPattern: is anchored at both ends', !matchesPathPattern('src/pages/**', 'other/src/pages/a.astro'));

check('matchesRefPattern: an exact branch name matches itself', matchesRefPattern('master', 'master') === true);
check('matchesRefPattern: an exact branch name does not match another', matchesRefPattern('main', 'master') === false);
check("matchesRefPattern: 'mast*' matches master", matchesRefPattern('mast*', 'master') === true);
check("matchesRefPattern: '*' matches a top-level branch", matchesRefPattern('*', 'master') === true);
check("matchesRefPattern: '*' does NOT cross a slash", matchesRefPattern('*', 'release/master') === false);
check("matchesRefPattern: '**' crosses a slash", matchesRefPattern('**', 'release/master') === true);
check("matchesRefPattern: 'releases/**' does not match master", matchesRefPattern('releases/**', 'master') === false);
check('matchesRefPattern: unmodelled glob syntax is null, never a guess', matchesRefPattern('mast[er]', 'master') === null);
check('matchesRefPattern: negation is unmodelled, never a guess', matchesRefPattern('!master', 'master') === null);

// --- R2 HIGH: GitHub `?` is "zero or one of the PRECEDING character" ---------
//
// It is NOT "one arbitrary character". Reading it as a single-character
// wildcard makes `maste?` look like a filter that targets master, which is
// exactly how a workflow that never gates master could be reported as a master
// gate. Each probe below is the literal GitHub semantics.
check("matchesRefPattern: 'maste?' does NOT match master (`?` is not one-arbitrary-char)", matchesRefPattern('maste?', 'master') === false);
check("matchesRefPattern: 'maste?' matches 'maste' (one of the preceding 'e')", matchesRefPattern('maste?', 'maste') === true);
check("matchesRefPattern: 'maste?' matches 'mast' (ZERO of the preceding 'e')", matchesRefPattern('maste?', 'mast') === true);
check("matchesRefPattern: 'master?' DOES match master", matchesRefPattern('master?', 'master') === true);
check("matchesRefPattern: 'master?' also matches 'maste'", matchesRefPattern('master?', 'maste') === true);
check("matchesRefPattern: 'master?' does not match 'masterly'", matchesRefPattern('master?', 'masterly') === false);
check("matchesRefPattern: 'mast*' matches master (a `*` really is a wildcard)", matchesRefPattern('mast*', 'master') === true);
check("matchesRefPattern: 'ma?ster' matches master and 'mster'", matchesRefPattern('ma?ster', 'master') === true && matchesRefPattern('ma?ster', 'mster') === true);
check("matchesRefPattern: a leading '?' has nothing to quantify and is UNMODELED", matchesRefPattern('?master', 'master') === null);
check("matchesRefPattern: '?' applied to a wildcard is UNMODELED", matchesRefPattern('mast*?', 'master') === null);
check("matchesRefPattern: '+' is a valid GitHub form this engine does not model", matchesRefPattern('mast+er', 'master') === null);
check(
  'matchesPathPattern: the same `?` semantics apply to path filters',
  matchesPathPattern('docs/OVERVIEW.md?', 'docs/OVERVIEW.md') === true && matchesPathPattern('docs/OVERVIEW.m?', 'docs/OVERVIEW.md') === false,
);

// --- R2 HIGH: `**/` matches ZERO or more whole path segments -----------------
check("matchesPathPattern: 'docs/**/*.md' matches docs/OVERVIEW.md (ZERO segments)", matchesPathPattern('docs/**/*.md', 'docs/OVERVIEW.md') === true);
check("matchesPathPattern: 'docs/**/*.md' matches a nested docs path", matchesPathPattern('docs/**/*.md', 'docs/ci/gates/OVERVIEW.md') === true);
check("matchesPathPattern: 'docs/**/*.md' matches a one-level docs path", matchesPathPattern('docs/**/*.md', 'docs/ci/OVERVIEW.md') === true);
check("matchesPathPattern: 'docs/**/*.md' does not escape the docs root", matchesPathPattern('docs/**/*.md', 'src/OVERVIEW.md') === false);
check("matchesPathPattern: 'docs/**/*.md' still respects the extension", matchesPathPattern('docs/**/*.md', 'docs/ci/README.txt') === false);
check("matchesPathPattern: a leading '**/' matches a root-level file", matchesPathPattern('**/OVERVIEW.md', 'OVERVIEW.md') === true);
check("matchesPathPattern: a leading '**/' also matches a nested file", matchesPathPattern('**/OVERVIEW.md', 'docs/ci/OVERVIEW.md') === true);
check("matchesPathPattern: '**' mid-segment still crosses separators", matchesPathPattern('src/**.astro', 'src/pages/a/b.astro') === true);
check("matchesPathPattern: unmodelled path glob syntax is null, never a guess", matchesPathPattern('docs/[abc].md', 'docs/a.md') === null);

// --- R2 HIGH: shell globs are a DIFFERENT language ---------------------------
check("matchesShellGlob: '?' in a shell glob IS one arbitrary character", matchesShellGlob('maste?', 'master') === true);
check("matchesShellGlob: 'dir/**/*.ts' matches a DIRECT child", matchesShellGlob('dir/**/*.ts', 'dir/direct.ts') === true);
check("matchesShellGlob: 'dir/**/*.ts' matches a NESTED child", matchesShellGlob('dir/**/*.ts', 'dir/nested/file.ts') === true);
check("matchesShellGlob: 'dir/**/*.ts' respects the extension", matchesShellGlob('dir/**/*.ts', 'dir/nested/file.json') === false);
check('matchesShellGlob: an unmodelled brace form is null, never a guess', matchesShellGlob('dir/{a,b}.ts', 'dir/a.ts') === null);

// --- the bounded expression evaluator ---------------------------------------
const prContext = { event_name: 'pull_request' };
check('expression: `true` is true', evaluateGithubExpression('true', prContext) === true);
check('expression: `${{ true }}` is true', evaluateGithubExpression('${{ true }}', prContext) === true);
check('expression: `${{ false }}` is false', evaluateGithubExpression('${{ false }}', prContext) === false);
check(
  "expression: github.event_name == 'pull_request' is true in PR context",
  evaluateGithubExpression("github.event_name == 'pull_request'", prContext) === true,
);
check(
  "expression: github.event_name == 'push' is FALSE in PR context",
  evaluateGithubExpression("github.event_name == 'push'", prContext) === false,
);
check(
  'expression: boolean algebra is evaluated, not pattern-matched',
  evaluateGithubExpression("github.event_name == 'pull_request' && !(github.event_name == 'push')", prContext) === true,
);
check('expression: always() is true', evaluateGithubExpression('always()', prContext) === true);

// --- R3 HIGH: SHORT-CIRCUIT MUST NOT HIDE UNMODELLED SUBEXPRESSIONS ----------
//
// Regression for the R3 Codex finding. The pre-remediation evaluator decided
// truthiness AS IT PARSED, so a provably-false `&&` left operand (or a
// provably-true `||` left operand) discarded the other side WITHOUT EVER
// CHECKING whether that side was inside the model. `github.ref` is outside the
// expression model, yet
//
//     false && github.ref == 'refs/heads/master'
//     true  || github.ref == 'refs/heads/master'
//
// were accepted as MODELLED (false / true), laundering unsupported governance
// surface into a "provable" classification. Modelability is now decided over the
// WHOLE token stream before any truthiness is computed, so every one of these is
// UNMODELED — and `github.ref` stays deliberately unmodelled rather than being
// over-modelled just to make a probe pass.
const SHORT_CIRCUIT_LAUNDERING_PROBES = [
  ['false && unsupported (the exact Codex case)', "false && github.ref == 'refs/heads/master'"],
  ['true || unsupported (the exact Codex case)', "true || github.ref == 'refs/heads/master'"],
  ['supported && unsupported', "github.event_name == 'pull_request' && github.ref == 'refs/heads/master'"],
  ['supported || unsupported', "github.event_name == 'pull_request' || github.ref == 'refs/heads/master'"],
  ['unsupported on the LEFT of &&', "github.ref == 'refs/heads/master' && false"],
  ['unsupported on the LEFT of ||', "github.ref == 'refs/heads/master' || true"],
  ['unsupported on the RIGHT of &&', 'false && vars.ENABLE_GATE'],
  ['unsupported on the RIGHT of ||', 'true || vars.ENABLE_GATE'],
  ['nested parentheses hide nothing', "(false && (github.ref == 'refs/heads/master'))"],
  ['nested parentheses on the || side', "((true) || ((github.ref == 'refs/heads/master')))"],
  ['a chain of &&', "false && true && github.ref == 'x' && true"],
  ['a chain of ||', "true || false || github.ref == 'x' || false"],
  ['a mixed &&/|| chain', "false && true || github.ref == 'x'"],
  ['unsupported inside an equality LEFT operand', "github.ref == 'x' == true"],
  ['unsupported inside an equality RIGHT operand', 'false && true == github.ref'],
  ['unsupported behind a negation', "!(false && github.ref == 'x')"],
  ['an unmodelled FUNCTION behind a short-circuit', "false && contains(github.ref, 'master')"],
  ['a modelled function name used as a bare value', 'false && always'],
  ['a modelled function name given arguments', "false && always('x')"],
];
for (const [label, expression] of SHORT_CIRCUIT_LAUNDERING_PROBES) {
  check(
    `R3 HIGH: short-circuit does not launder ${label}`,
    evaluateGithubExpression(expression, prContext) === UNMODELED,
    `${expression} => ${String(evaluateGithubExpression(expression, prContext))}`,
  );
  check(
    `R3 HIGH: job-level \`if\` fails closed for ${label}`,
    evaluateJobIfForPullRequest(expression) === 'UNMODELED',
    `${expression} => ${evaluateJobIfForPullRequest(expression)}`,
  );
}
// The counterpart obligation: short-circuiting still WORKS inside the model, so
// this fix costs no modelling power it previously had.
check(
  'R3 HIGH: `false && <modelled>` still short-circuits to false',
  evaluateGithubExpression("false && github.event_name == 'pull_request'", prContext) === false,
);
check(
  'R3 HIGH: `true || <modelled>` still short-circuits to true',
  evaluateGithubExpression("true || github.event_name == 'push'", prContext) === true,
);
check(
  'R3 HIGH: `github.ref` is NOT over-modelled to make the probes pass',
  evaluateGithubExpression("github.ref == 'refs/heads/master'", prContext) === UNMODELED,
);

// --- R2 HIGH: GitHub `==` is LOOSE and case-INSENSITIVE ----------------------
//
// Strict JavaScript equality disagrees with GitHub here. A workflow author who
// writes 'PULL_REQUEST' gets a job that really does run on pull requests, so
// modelling it as "not equal" would classify a live PR gate as a non-PR job.
check(
  "expression: github.event_name == 'PULL_REQUEST' is TRUE (case-insensitive)",
  evaluateGithubExpression("github.event_name == 'PULL_REQUEST'", prContext) === true,
);
check(
  "expression: github.event_name == 'Pull_Request' is TRUE (mixed case)",
  evaluateGithubExpression("github.event_name == 'Pull_Request'", prContext) === true,
);
check(
  "expression: github.event_name != 'PULL_REQUEST' is FALSE (case-insensitive)",
  evaluateGithubExpression("github.event_name != 'PULL_REQUEST'", prContext) === false,
);
check(
  "expression: github.event_name == 'PUSH' is FALSE in PR context",
  evaluateGithubExpression("github.event_name == 'PUSH'", prContext) === false,
);
check(
  'expression: two literal strings compare case-insensitively',
  evaluateGithubExpression("'Master' == 'master'", prContext) === true,
);
check(
  'expression: a genuinely different string is still not equal',
  evaluateGithubExpression("'master' == 'main'", prContext) === false,
);
check('expression: loose equality casts a boolean against a string', evaluateGithubExpression("true == 'true'", prContext) === false);
check("expression: loose equality casts '1' to a number against true", evaluateGithubExpression("true == '1'", prContext) === true);
check("expression: loose equality casts '' to zero against false", evaluateGithubExpression("false == ''", prContext) === true);
check('expression: loose equality on booleans is unchanged', evaluateGithubExpression('true == true', prContext) === true);
check(
  'expression: a non-empty string is truthy',
  evaluateGithubExpression("github.event_name", prContext) === true,
);
check('expression: `!` uses GitHub truthiness', evaluateGithubExpression("!''", prContext) === true);
check(
  'expression: case-insensitive equality composes with boolean algebra',
  evaluateGithubExpression("github.event_name == 'PULL_REQUEST' && !(github.event_name == 'PUSH')", prContext) === true,
);
for (const stillUnmodelled of [
  "github.event_name === 'pull_request'", // not a GitHub operator at all
  "github.event_name > 'pull_request'",
  "startsWith(github.event_name, 'pull')",
  "github.event.action == 'opened'",
  "toJSON(github.event_name) == 'pull_request'",
]) {
  check(
    `expression: ${JSON.stringify(stillUnmodelled)} stays UNMODELED after the loose-equality fix`,
    evaluateGithubExpression(stillUnmodelled, prContext) === UNMODELED,
    String(evaluateGithubExpression(stillUnmodelled, prContext)),
  );
}
check(
  "evaluateJobIfForPullRequest: an UPPERCASE PR guard is RUNNABLE, not UNMODELED",
  evaluateJobIfForPullRequest("github.event_name == 'PULL_REQUEST'") === 'RUNNABLE',
);
check(
  "evaluateJobIfForPullRequest: an UPPERCASE push guard NEVER runs on a PR",
  evaluateJobIfForPullRequest("github.event_name == 'PUSH'") === 'NEVER',
);
check(
  "continue-on-error: `${{ github.event_name == 'PULL_REQUEST' }}` is MODELED true",
  evaluateContinueOnError("${{ github.event_name == 'PULL_REQUEST' }}").value === true,
);
for (const dynamic of [
  'github.run_attempt',
  "github.ref == 'refs/heads/master'",
  'vars.ENABLE_GATE',
  'success()',
  '${{ github.event.pull_request.draft }}',
  '${{ true }} ${{ false }}',
  'prefix-${{ true }}',
  "contains(github.event.pull_request.labels.*.name, 'skip')",
  '',
]) {
  check(
    `expression: ${JSON.stringify(dynamic)} is UNMODELED (never guessed)`,
    evaluateGithubExpression(dynamic, prContext) === UNMODELED,
    String(evaluateGithubExpression(dynamic, prContext)),
  );
}

// --- job-level `if` ----------------------------------------------------------
check('evaluateJobIfForPullRequest: absent if is RUNNABLE', evaluateJobIfForPullRequest(undefined) === 'RUNNABLE');
check(
  'evaluateJobIfForPullRequest: the PR-only guard is RUNNABLE',
  evaluateJobIfForPullRequest("github.event_name == 'pull_request'") === 'RUNNABLE',
);
check(
  'evaluateJobIfForPullRequest: the non-PR guard NEVER runs on a PR',
  evaluateJobIfForPullRequest("github.event_name != 'pull_request'") === 'NEVER',
);
check(
  "evaluateJobIfForPullRequest: `github.event_name == 'push'` NEVER runs on a PR",
  evaluateJobIfForPullRequest("github.event_name == 'push'") === 'NEVER',
);
check(
  'evaluateJobIfForPullRequest: a wrapped PR guard is RUNNABLE',
  evaluateJobIfForPullRequest("${{ github.event_name == 'pull_request' }}") === 'RUNNABLE',
);
check(
  'evaluateJobIfForPullRequest: `always()` is RUNNABLE',
  evaluateJobIfForPullRequest('always()') === 'RUNNABLE',
);
for (const expression of [
  "github.ref == 'refs/heads/master'",
  "github.actor != 'dependabot[bot]'",
  'success()',
  "contains(github.event.head_commit.message, 'skip ci')",
  '${{ vars.ENABLE_GATE }}',
  '',
]) {
  check(
    `evaluateJobIfForPullRequest: unmodelled if ${JSON.stringify(expression)} is UNMODELED (fail closed)`,
    evaluateJobIfForPullRequest(expression) === 'UNMODELED',
    evaluateJobIfForPullRequest(expression),
  );
}

// --- job-level `continue-on-error` --------------------------------------------
check('continue-on-error: absent is MODELED false', JSON.stringify(evaluateContinueOnError(undefined)) === JSON.stringify({ state: 'MODELED', value: false, source: null }));
check('continue-on-error: boolean true is MODELED true', evaluateContinueOnError(true).value === true);
check('continue-on-error: boolean false is MODELED false', evaluateContinueOnError(false).value === false);
check("continue-on-error: the string 'true' is MODELED true", evaluateContinueOnError('true').value === true);
check("continue-on-error: the string 'false' is MODELED false", evaluateContinueOnError('false').value === false);
check('continue-on-error: `${{ true }}` is MODELED true', evaluateContinueOnError('${{ true }}').value === true);
check('continue-on-error: `${{ false }}` is MODELED false', evaluateContinueOnError('${{ false }}').value === false);
check(
  "continue-on-error: `${{ github.event_name == 'pull_request' }}` is MODELED true",
  evaluateContinueOnError("${{ github.event_name == 'pull_request' }}").value === true,
);
for (const dynamic of ['${{ vars.SOFT_FAIL }}', '${{ github.event.pull_request.draft }}', '${{ inputs.soft }}', 'maybe']) {
  const evaluated = evaluateContinueOnError(dynamic);
  check(
    `continue-on-error: ${JSON.stringify(dynamic)} is UNMODELED (never assumed blocking OR advisory)`,
    evaluated.state === 'UNMODELED' && evaluated.value === null,
    JSON.stringify(evaluated),
  );
}

check(
  'extractCommands folds backslash continuations into one command',
  extractCommands({ steps: [{ run: 'node_modules/.bin/tsc --noEmit \\\n  a.ts \\\n  b.ts' }] })[0] ===
    'node_modules/.bin/tsc --noEmit a.ts b.ts',
);
check(
  'extractCommands ignores shell scaffolding and keeps only real invocations',
  JSON.stringify(extractCommands({ steps: [{ run: 'set -euo pipefail\necho hi\nnpm ci' }] })) === JSON.stringify(['npm ci']),
);
check('extractCommands ignores `uses:` steps', extractCommands({ steps: [{ uses: 'actions/checkout@v4' }] }).length === 0);

// ============================================================================
// D. TRIGGER SYNTAX — every valid GitHub shape is handled or explicitly rejected
// ============================================================================

const TRIGGER_PROBES = [
  // [label, `on:` block, expected hasPullRequest, expected targetsMaster, expected modeled]
  ['scalar `on: pull_request`', 'on: pull_request', true, true, true],
  ['sequence `on: [pull_request]`', 'on: [pull_request]', true, true, true],
  ['sequence `on: [push, pull_request]`', 'on: [push, pull_request]', true, true, true],
  ['sequence without pull_request', 'on: [push]', false, false, true],
  ['scalar non-PR trigger', 'on: workflow_dispatch', false, false, true],
  ['mapping with an EMPTY pull_request value', 'on:\n  pull_request:', true, true, true],
  ['mapping with exact branches', "on:\n  pull_request:\n    branches:\n      - master", true, true, true],
  ['mapping with a non-matching exact branch', "on:\n  pull_request:\n    branches:\n      - develop", true, false, true],
  ['mapping with a matching branch GLOB', "on:\n  pull_request:\n    branches:\n      - 'mast*'", true, true, true],
  ['mapping with a non-matching branch GLOB', "on:\n  pull_request:\n    branches:\n      - 'releases/**'", true, false, true],
  ["mapping with a '**' branch glob", "on:\n  pull_request:\n    branches:\n      - '**'", true, true, true],
  ['mapping with NO branches filter (every branch)', "on:\n  pull_request:\n    paths:\n      - 'src/**'", true, true, true],
  ['mapping with branches-ignore that spares master', "on:\n  pull_request:\n    branches-ignore:\n      - 'docs/**'", true, true, true],
  ['mapping with branches-ignore that excludes master', "on:\n  pull_request:\n    branches-ignore:\n      - master", true, false, true],
  ['mapping with paths', "on:\n  pull_request:\n    branches: [master]\n    paths:\n      - 'src/**'", true, true, true],
  ['mapping with paths-ignore', "on:\n  pull_request:\n    branches: [master]\n    paths-ignore:\n      - 'docs/**'", true, true, true],
  ['mapping with default activity types', "on:\n  pull_request:\n    branches: [master]\n    types: [opened, synchronize, reopened]", true, true, true],
  // --- fail-closed rejections -------------------------------------------------
  ['no `on:` block at all', '# no trigger block', false, false, false],
  ['pull_request whose value is a sequence', "on:\n  pull_request:\n    - master", false, false, false],
  ['pull_request whose value is a scalar', 'on:\n  pull_request: master', false, false, false],
  ['branches AND branches-ignore together', "on:\n  pull_request:\n    branches: [master]\n    branches-ignore: [docs]", false, false, false],
  ['paths AND paths-ignore together', "on:\n  pull_request:\n    paths: ['src/**']\n    paths-ignore: ['docs/**']", false, false, false],
  ['an unmodelled pull_request filter key', "on:\n  pull_request:\n    branches: [master]\n    tags: ['v*']", false, false, false],
  ['a narrowed activity-type list', "on:\n  pull_request:\n    branches: [master]\n    types: [closed]", false, false, false],
  ['an unmodelled branch glob (character class)', "on:\n  pull_request:\n    branches: ['mast[er]']", false, false, false],
  ['an unmodelled branch glob (negation)', "on:\n  pull_request:\n    branches: ['!master']", false, false, false],
  ['an unmodelled path glob (negation)', "on:\n  pull_request:\n    branches: [master]\n    paths: ['!docs/**']", false, false, false],
  ['a non-string branch entry', "on:\n  pull_request:\n    branches: [1]", false, false, false],
];

for (const [label, onBlock, expectPr, expectMaster, expectModeled] of TRIGGER_PROBES) {
  const doc = parseWorkflow(`name: Probe\n${onBlock}\njobs:\n  probe:\n    name: Probe job\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm ci\n`);
  const trigger = derivePullRequestTrigger(doc);
  check(
    `trigger: ${label} -> modeled=${expectModeled}`,
    trigger.modeled === expectModeled,
    `${trigger.modeled} (${trigger.reason})`,
  );
  check(`trigger: ${label} -> hasPullRequest=${expectPr}`, trigger.hasPullRequest === expectPr, String(trigger.hasPullRequest));
  check(`trigger: ${label} -> targetsMaster=${expectMaster}`, trigger.targetsMaster === expectMaster, String(trigger.targetsMaster));
}

// A rejected trigger must produce the explicit UNMODELED classification and the
// UNMODELED_TRIGGER gap — never a permissive BLOCKING or a quiet NON_PR.
for (const [label, onBlock, , , expectModeled] of TRIGGER_PROBES.filter((probe) => probe[4] === false)) {
  const facts = probeFacts(`name: Probe\n${onBlock}\njobs:\n  probe:\n    name: Probe job\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm ci\n`);
  check(`trigger: ${label} classifies UNMODELED (fail closed)`, facts.classification === 'UNMODELED', facts.classification);
  check(
    `trigger: ${label} raises UNMODELED_TRIGGER`,
    facts.knownGaps.some((gap) => gap.code === 'UNMODELED_TRIGGER'),
    JSON.stringify(facts.knownGaps),
  );
  check(`trigger: ${label} is never directRequiredSafe`, facts.directRequiredSafe === false);
  check(`trigger: ${label} is never canFailPullRequest`, facts.blockingSemantics.canFailPullRequest === false);
  void expectModeled;
}

// A scalar / sequence trigger is a REAL pull_request gate. The previous model
// only understood the mapping form and would have called these NON_PR.
for (const [label, onBlock] of [
  ['scalar', 'on: pull_request'],
  ['sequence', 'on: [pull_request]'],
]) {
  const facts = probeFacts(`name: Probe\n${onBlock}\njobs:\n  probe:\n    name: Probe job\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm ci\n`);
  check(`trigger: a ${label} pull_request trigger derives BLOCKING, not NON_PR`, facts.classification === 'BLOCKING', facts.classification);
  check(`trigger: a ${label} pull_request trigger with no path filter is directRequiredSafe`, facts.directRequiredSafe === true);
  check(
    `trigger: a ${label} pull_request trigger raises NO_BRANCH_FILTER`,
    facts.knownGaps.some((gap) => gap.code === 'NO_BRANCH_FILTER'),
  );
}

// ============================================================================
// E. JOB SEMANTICS — `if` and `continue-on-error` at job level
// ============================================================================

const jobProbe = (jobBody) =>
  probeFacts(`name: Probe
on:
  pull_request:
    branches:
      - master
jobs:
  probe:
    name: Probe job
    runs-on: ubuntu-latest
${jobBody}    steps:
      - run: npm ci
`);

{
  const facts = jobProbe("    if: github.event_name == 'push'\n");
  check(
    "job if: `github.event_name == 'push'` is NEVER a PR blocking job",
    facts.classification === 'CONDITIONAL_PRODUCTION_ONLY',
    facts.classification,
  );
  check("job if: `github.event_name == 'push'` is never directRequiredSafe", facts.directRequiredSafe === false);
  check("job if: `github.event_name == 'push'` cannot fail a PR", facts.blockingSemantics.canFailPullRequest === false);
}
{
  const facts = jobProbe("    if: github.event_name == 'pull_request'\n");
  check("job if: `github.event_name == 'pull_request'` stays BLOCKING", facts.classification === 'BLOCKING', facts.classification);
}
{
  const facts = jobProbe("    if: github.event_name != 'pull_request'\n");
  check("job if: `github.event_name != 'pull_request'` is production-only", facts.classification === 'CONDITIONAL_PRODUCTION_ONLY');
}
for (const expression of [
  "github.actor != 'dependabot[bot]'",
  "github.ref == 'refs/heads/master'",
  '${{ vars.ENABLE_GATE }}',
  "contains(github.event.pull_request.labels.*.name, 'skip-gate')",
]) {
  const facts = jobProbe(`    if: ${JSON.stringify(expression)}\n`);
  check(
    `job if: ${JSON.stringify(expression)} classifies UNMODELED (fail closed, NOT blocking)`,
    facts.classification === 'UNMODELED',
    facts.classification,
  );
  check(
    `job if: ${JSON.stringify(expression)} raises UNMODELED_JOB_IF`,
    facts.knownGaps.some((gap) => gap.code === 'UNMODELED_JOB_IF'),
    JSON.stringify(facts.knownGaps),
  );
  check(`job if: ${JSON.stringify(expression)} is never directRequiredSafe`, facts.directRequiredSafe === false);
}
{
  const facts = jobProbe('    continue-on-error: ${{ true }}\n');
  check('continue-on-error `${{ true }}` derives ADVISORY, not BLOCKING', facts.classification === 'ADVISORY', facts.classification);
  check('continue-on-error `${{ true }}` is never directRequiredSafe', facts.directRequiredSafe === false);
}
{
  const facts = jobProbe('    continue-on-error: ${{ false }}\n');
  check('continue-on-error `${{ false }}` derives BLOCKING', facts.classification === 'BLOCKING', facts.classification);
}
{
  const facts = jobProbe("    continue-on-error: 'true'\n");
  check("continue-on-error quoted 'true' derives ADVISORY", facts.classification === 'ADVISORY', facts.classification);
}
for (const dynamic of ['${{ vars.SOFT_FAIL }}', '${{ github.event.pull_request.draft }}']) {
  const facts = jobProbe(`    continue-on-error: ${dynamic}\n`);
  check(
    `continue-on-error ${dynamic} classifies UNMODELED (neither blocking nor advisory)`,
    facts.classification === 'UNMODELED',
    facts.classification,
  );
  check(
    `continue-on-error ${dynamic} raises UNMODELED_CONTINUE_ON_ERROR`,
    facts.knownGaps.some((gap) => gap.code === 'UNMODELED_CONTINUE_ON_ERROR'),
    JSON.stringify(facts.knownGaps),
  );
  check(`continue-on-error ${dynamic} is never directRequiredSafe`, facts.directRequiredSafe === false);
}

// ============================================================================
// F. DEPENDENCY CLOSURE — the specific omissions Codex named must be detected
// ============================================================================

const goTransition = derived.find((entry) => entry.workflowFile === 'cbw-go-transition.yml');
const GO_TRANSITION_REQUIRED_INPUTS = [
  'src/data/contracts/publicOfferAuthority.ts',
  'src/data/publicOfferView.ts',
  'src/data/homepageTop10.ts',
  'src/data/homepageTop10Cta.ts',
  'src/data/exchanges.json',
  'src/components/exchange/GovernedExchangePage.astro',
  'src/components/exchange/ExchangePromoPageV2.astro',
  'src/components/exchange/ExchangeUnverifiedNotice.astro',
  'src/components/home/HomepageTop10.astro',
  'src/components/site-standard/ExchangeDirectoryCard.astro',
  'src/pages/promo-codes/index.astro',
];
for (const path of GO_TRANSITION_REQUIRED_INPUTS) {
  check(
    `dependency closure: go-transition reads "${path}" through owner-confirmed-authority-split-test.mjs`,
    goTransition?.dependencies.readInputs.includes(path),
    JSON.stringify(goTransition?.dependencies.readInputs),
  );
  check(
    `trigger gap: go-transition records "${path}" as uncovered by its path filter`,
    goTransition?.knownGaps.some((gap) => gap.code === 'TRIGGER_GAP_INPUT' && gap.detail === path),
  );
}
check(
  'dependency closure: go-transition executes the authority split test itself',
  goTransition?.dependencies.executed.includes('scripts/portal/owner-confirmed-authority-split-test.mjs'),
);

check(
  'dependency closure: the noindex product-preview gate reads FirstViewport.astro',
  noindex?.dependencies.readInputs.includes('src/components/site-standard/FirstViewport.astro'),
  JSON.stringify(noindex?.dependencies.readInputs),
);

const marketprofile = derived.find((entry) => entry.workflowFile === 'cbw-marketprofile-pipeline-advisory.yml');
const trackedPipelineTests = repoFiles
  .filter((path) => /^scripts\/portal\/marketprofile-pipeline-[^/]+\.mjs$/.test(path))
  .sort();
check('the repository really tracks marketprofile pipeline tests (the probe is not vacuous)', trackedPipelineTests.length > 0);
check(
  'dependency closure: the shell glob `scripts/portal/marketprofile-pipeline-*.mjs` expands to the concrete tracked set',
  trackedPipelineTests.every((path) => marketprofile?.dependencies.executed.includes(path)),
  `${JSON.stringify(trackedPipelineTests)} vs ${JSON.stringify(marketprofile?.dependencies.executed)}`,
);
check(
  'dependency closure: `find src/data/candidates -name \'*.ts\'` expands to tracked candidate files',
  marketprofile?.dependencies.readInputs.some((path) => path.startsWith('src/data/candidates/') && path.endsWith('.ts')),
);
check(
  'dependency closure: npm-script indirection is recursive (portal:contracts:test -> contracts-test.mjs)',
  marketprofile?.dependencies.executed.includes('scripts/portal/contracts-test.mjs'),
);

// --- closure primitives, probed directly -------------------------------------
{
  // The lexer boundary: code embedded in a fixture STRING is data, not code.
  const source = [
    "import { readFileSync } from 'node:fs';",
    "import { join } from 'node:path';",
    "// import x from './commented-out.mjs';",
    "const QUOTE_RE = /['\"]/;",
    "const real = readFileSync(join(ROOT, 'src/data/real.json'), 'utf8');",
    "const fixture = { path: 'src/data/fixture-only.json', text: \"import y from './ghost.mjs';\" };",
    'const tmpl = `${ROOT}/src/data/expanded/${name}.ts`;',
    'export { real, fixture, tmpl, QUOTE_RE };',
  ].join('\n');
  const closure = deriveDependencyClosure({
    job: { steps: [{ run: 'node scripts/probe.mjs' }] },
    packageScripts: {},
    repoFiles: [
      'scripts/probe.mjs',
      'src/data/real.json',
      'src/data/fixture-only.json',
      'src/data/expanded/a.ts',
      'src/data/expanded/b.ts',
    ],
    readFile: (path) => (path === 'scripts/probe.mjs' ? source : null),
  });
  check(
    'lexer: a literal in a path/IO position IS a read input',
    closure.readInputs.includes('src/data/real.json'),
    JSON.stringify(closure.readInputs),
  );
  check(
    'lexer: a tracked path that is only fixture DATA is NOT a read input',
    !closure.readInputs.includes('src/data/fixture-only.json'),
    JSON.stringify(closure.readInputs),
  );
  check(
    'lexer: an import that exists only inside a fixture string is not resolved as code',
    !closure.unresolvable.some((entry) => entry.includes('./ghost.mjs')),
    JSON.stringify(closure.unresolvable),
  );
  check(
    'lexer: a commented-out import is not resolved as code',
    !closure.unresolvable.some((entry) => entry.includes('./commented-out.mjs')),
    JSON.stringify(closure.unresolvable),
  );
  check(
    "lexer: a regex literal containing quotes does not desynchronise the scan",
    closure.readInputs.includes('src/data/expanded/a.ts') && closure.readInputs.includes('src/data/expanded/b.ts'),
    JSON.stringify(closure.readInputs),
  );
}
{
  const { skeleton, strings } = lexJavaScript("const a = 'x/y'; /* c */ const b = /['\"]/; // 'z/w'\n");
  check('lexJavaScript: string literals are extracted', strings.some((token) => token.value === 'x/y'));
  check('lexJavaScript: a comment-only literal is not extracted', !strings.some((token) => token.value === 'z/w'));
  check('lexJavaScript: the skeleton keeps code and drops comments', skeleton.includes('const b =') && !skeleton.includes('// '));
}
// --- R2 MEDIUM 1: no executed dependency form may SILENTLY disappear ---------
//
// Every probe below is a form the bounded extractor cannot deterministically
// resolve. The requirement is not that the engine guess: it is that the form is
// recorded as DEPENDENCY_UNRESOLVABLE against the exact script that contains it,
// so it reaches the frozen snapshot and can be reviewed.
{
  const source = [
    "import { readFileSync, readFile, createReadStream } from 'node:fs';",
    "import { join } from 'node:path';",
    "const name = process.argv[2];",
    'const bare = await import(`./${name}.mjs`);',
    'const viaExpr = await import(pathExpr);',
    'const required = require(dynamicSpecifier);',
    'const computed = readFileSync(target, "utf8");',
    'const joined = readFileSync(join(DYNAMIC_DIR, name), "utf8");',
    'readFile(candidatePath, "utf8", () => {});',
    'const streamed = createReadStream(whicheverFile);',
    'export { bare, viaExpr, required, computed, joined, streamed };',
  ].join('\n');
  const closure = deriveDependencyClosure({
    job: { steps: [{ run: 'node scripts/dynamic-probe.mjs' }] },
    packageScripts: {},
    repoFiles: ['scripts/dynamic-probe.mjs', 'scripts/real.mjs'],
    readFile: (path) => (path === 'scripts/dynamic-probe.mjs' ? source : null),
  });
  const recorded = (needle) => closure.unresolvable.some((entry) => entry.includes(needle));
  const attributed = (needle) =>
    closure.unresolvable.some((entry) => entry.startsWith('scripts/dynamic-probe.mjs :: ') && entry.includes(needle));
  check('dependency closure: `import(`./${name}.mjs`)` is recorded, never dropped', recorded('interpolated module specifier'), JSON.stringify(closure.unresolvable));
  check('dependency closure: `import(pathExpr)` is recorded, never dropped', recorded('import(pathExpr'), JSON.stringify(closure.unresolvable));
  check('dependency closure: `require(dynamic)` is recorded, never dropped', recorded('require(dynamicSpecifier'), JSON.stringify(closure.unresolvable));
  check('dependency closure: `readFileSync(variable)` is recorded, never dropped', recorded('computed readFileSync'), JSON.stringify(closure.unresolvable));
  check(
    'dependency closure: `readFileSync(join(...dynamic...))` is recorded, never dropped',
    recorded('join(DYNAMIC_DIR'),
    JSON.stringify(closure.unresolvable),
  );
  check('dependency closure: a computed `readFile` is recorded, never dropped', recorded('computed readFile(…)'), JSON.stringify(closure.unresolvable));
  check(
    'dependency closure: a computed `createReadStream` is recorded, never dropped',
    recorded('computed createReadStream'),
    JSON.stringify(closure.unresolvable),
  );
  check(
    'dependency closure: every unresolvable form names its ORIGINATING script',
    closure.unresolvable.every((entry) => entry.startsWith('scripts/dynamic-probe.mjs :: ')) && attributed('computed readFileSync'),
    JSON.stringify(closure.unresolvable),
  );
}
{
  // An import or a read written INSIDE a template expression is code that really
  // runs. Before R2 the lexer swallowed the whole template as a string and the
  // dependency vanished.
  const source = [
    "import { readFileSync } from 'node:fs';",
    'const banner = `loaded ${(await import("./inner.mjs")).name}`;',
    'const body = `size ${readFileSync(mysteryPath, "utf8").length}`;',
    'export { banner, body };',
  ].join('\n');
  const closure = deriveDependencyClosure({
    job: { steps: [{ run: 'node scripts/template-probe.mjs' }] },
    packageScripts: {},
    repoFiles: ['scripts/template-probe.mjs', 'scripts/inner.mjs'],
    readFile: (path) => (path === 'scripts/template-probe.mjs' ? source : 'const name = 1;\n'),
  });
  check(
    'dependency closure: an import inside a template EXPRESSION is followed, not swallowed',
    closure.executed.includes('scripts/inner.mjs'),
    JSON.stringify(closure.executed),
  );
  check(
    'dependency closure: a computed read inside a template EXPRESSION is recorded',
    closure.unresolvable.some((entry) => entry.includes('computed readFileSync') && entry.includes('mysteryPath')),
    JSON.stringify(closure.unresolvable),
  );
}
{
  // The other half of the rule: a form the engine CAN resolve deterministically
  // must resolve, and must NOT be parked in the unresolvable list as noise.
  const source = [
    "import { readFileSync } from 'node:fs';",
    "import { dirname, join, resolve } from 'node:path';",
    "import { fileURLToPath } from 'node:url';",
    'const HERE = dirname(fileURLToPath(import.meta.url));',
    'const ROOT = resolve(HERE, "..");',
    'const CONFIG = join(ROOT, "src", "data", "config.json");',
    'const a = readFileSync(CONFIG, "utf8");',
    'const b = readFileSync(join(ROOT, "src", "data", "other.json"), "utf-8");',
    'const c = readFileSync(join(HERE, "sibling.json"), "utf8");',
    'export { a, b, c };',
  ].join('\n');
  const closure = deriveDependencyClosure({
    job: { steps: [{ run: 'node scripts/deterministic-probe.mjs' }] },
    packageScripts: {},
    repoFiles: [
      'scripts/deterministic-probe.mjs',
      'scripts/sibling.json',
      'src/data/config.json',
      'src/data/other.json',
    ],
    readFile: (path) => (path === 'scripts/deterministic-probe.mjs' ? source : null),
  });
  for (const path of ['src/data/config.json', 'src/data/other.json', 'scripts/sibling.json']) {
    check(`dependency closure: the deterministic read "${path}" resolves`, closure.readInputs.includes(path), JSON.stringify(closure.readInputs));
  }
  check(
    'dependency closure: a deterministic read is NOT parked as unresolvable noise',
    closure.unresolvable.length === 0,
    JSON.stringify(closure.unresolvable),
  );
}
{
  // `find dir -name '*.ts'` searches RECURSIVELY: the direct child and the
  // nested child are BOTH inputs. Translating it to a pattern that only matched
  // nested files silently dropped every direct child.
  const closure = deriveDependencyClosure({
    job: { steps: [{ run: "find src/data/candidates -name '*.ts' | xargs node scripts/check.mjs" }] },
    packageScripts: {},
    repoFiles: [
      'scripts/check.mjs',
      'src/data/candidates/direct.ts',
      'src/data/candidates/nested/file.ts',
      'src/data/candidates/nested/deeper/file.ts',
      'src/data/candidates/ignored.json',
    ],
    readFile: () => 'const x = 1;\n',
  });
  check(
    'dependency closure: `find dir -name` resolves the DIRECT child',
    closure.readInputs.includes('src/data/candidates/direct.ts'),
    JSON.stringify(closure.readInputs),
  );
  check(
    'dependency closure: `find dir -name` resolves the NESTED child',
    closure.readInputs.includes('src/data/candidates/nested/file.ts') &&
      closure.readInputs.includes('src/data/candidates/nested/deeper/file.ts'),
    JSON.stringify(closure.readInputs),
  );
  check(
    'dependency closure: `find dir -name` still respects the name pattern',
    !closure.readInputs.includes('src/data/candidates/ignored.json'),
    JSON.stringify(closure.readInputs),
  );
}
{
  const closure = deriveDependencyClosure({
    job: {
      steps: [
        { run: "find src/data -maxdepth 1 -name '*.ts'" },
        { run: 'find src/data -newer package.json -name "*.json"' },
        { run: 'find src/data -type f' },
        { run: 'cat scripts/{alpha,beta}.mjs' },
      ],
    },
    packageScripts: {},
    repoFiles: ['src/data/a.ts', 'scripts/alpha.mjs', 'scripts/beta.mjs'],
    readFile: () => 'const x = 1;\n',
  });
  for (const [label, needle] of [
    ['a `-maxdepth` find', 'maxdepth'],
    ['a `-newer` find', 'newer'],
    ['a find with no -name pattern', 'no -name pattern'],
    ['a brace-expansion shell glob', 'shell glob form outside the supported subset'],
  ]) {
    check(
      `dependency closure: ${label} is recorded as UNRESOLVABLE, never approximated`,
      closure.unresolvable.some((entry) => entry.includes(needle)),
      JSON.stringify(closure.unresolvable),
    );
  }
}
{
  const cycleScripts = { a: 'npm run b', b: 'npm run a' };
  const closure = deriveDependencyClosure({
    job: { steps: [{ run: 'npm run a' }] },
    packageScripts: cycleScripts,
    repoFiles: [],
    readFile: () => null,
  });
  check('dependency closure: a package.json script cycle terminates', JSON.stringify(closure.npmScripts) === JSON.stringify(['a', 'b']));
}
{
  const closure = deriveDependencyClosure({
    job: { steps: [{ run: 'bash scripts/x.sh' }] },
    packageScripts: {},
    repoFiles: ['scripts/x.sh', 'scripts/y.mjs', 'src/data/z.json'],
    readFile: (path) => (path === 'scripts/x.sh' ? "node scripts/y.mjs\ncat src/data/z.json\n" : 'const x = 1;\n'),
  });
  check(
    'dependency closure: a shell script invoking repository-local commands is followed',
    closure.executed.includes('scripts/x.sh') && closure.executed.includes('scripts/y.mjs'),
    JSON.stringify(closure.executed),
  );
  check('dependency closure: a data file named by a shell script is a read input', closure.readInputs.includes('src/data/z.json'));
}
{
  const closure = deriveDependencyClosure({
    job: { steps: [{ uses: './.github/actions/probe' }] },
    packageScripts: {},
    repoFiles: ['.github/actions/probe/action.yml', '.github/actions/probe/main.mjs', 'scripts/from-action.mjs'],
    readFile: (path) =>
      path === '.github/actions/probe/action.yml'
        ? "name: Probe\nruns:\n  using: node20\n  main: main.mjs\n"
        : path === '.github/actions/probe/main.mjs'
          ? "import './x.mjs';\n"
          : 'x',
  });
  check(
    'dependency closure: a local `uses: ./…` action is NOT treated as dependency-free',
    closure.localActions.includes('./.github/actions/probe') &&
      closure.readInputs.includes('.github/actions/probe/action.yml') &&
      closure.executed.includes('.github/actions/probe/main.mjs'),
    JSON.stringify(closure),
  );
  check(
    'dependency closure: an unresolvable relative import inside a local action is reported, not dropped',
    closure.unresolvable.some((entry) => entry.includes('./x.mjs')),
    JSON.stringify(closure.unresolvable),
  );
}
{
  const closure = deriveDependencyClosure({
    job: { steps: [{ uses: './.github/actions/missing' }] },
    packageScripts: {},
    repoFiles: ['scripts/a.mjs'],
    readFile: () => null,
  });
  check(
    'dependency closure: a local `uses: ./…` with no tracked manifest FAILS CLOSED',
    closure.unresolvable.some((entry) => entry.includes('resolves to no tracked action manifest')),
    JSON.stringify(closure.unresolvable),
  );
}
{
  const closure = deriveDependencyClosure({
    job: { steps: [{ run: 'node scripts/a.mjs' }] },
    packageScripts: {},
    repoFiles: ['scripts/a.mjs'],
    readFile: () => null,
  });
  check(
    'dependency closure: an UNREADABLE executed dependency fails closed',
    closure.unreadable.length === 1,
    JSON.stringify(closure.unreadable),
  );
}
{
  // The closure is BOUNDED. Exceeding the bound is reported, never a silent
  // truncation that would understate the dependency set.
  const closure = deriveDependencyClosure({
    job: { steps: Array.from({ length: 1200 }, (unused, index) => ({ run: `echo step-${index}` })) },
    packageScripts: {},
    repoFiles: [],
    readFile: () => null,
  });
  check(
    'dependency closure: exceeding the node bound is reported, not silently truncated',
    closure.unresolvable.some((entry) => entry.includes('bounded dependency closure exceeded')),
    JSON.stringify(closure.unresolvable.slice(0, 2)),
  );
}
expectFailure(
  'audit FAILS when an executed dependency cannot be read at all',
  run({ readFile: () => null }),
  /raises no fail-closed modelling gap|has PROVABLE pull_request semantics/,
);

// ============================================================================
// F2. R3 REGRESSION — shell command position, shell globs, JS lexer, quoting
// ============================================================================
//
// Every probe below reproduces a form Codex demonstrated on the PREVIOUS head
// and asserts the new behaviour. The obligation is uniform: a dependency-bearing
// construct either RESOLVES deterministically or is RECORDED as
// DEPENDENCY_UNRESOLVABLE. Silent omission is never an acceptable outcome.

// A fixed synthetic repository so each probe's expectation is exact.
const R3_REPO_FILES = Object.freeze([
  'scripts/probe.mjs',
  'scripts/alpha.mjs',
  'scripts/beta.mjs',
  'src/data/direct.ts',
  'src/data/nested/deep.ts',
  'src/data/notes.md',
]);

function r3Closure(run, { sources = {}, repoFiles = R3_REPO_FILES, packageScripts = {} } = {}) {
  return deriveDependencyClosure({
    job: { steps: [{ run }] },
    packageScripts,
    repoFiles,
    readFile: (path) => sources[path] ?? null,
  });
}

// --- R3 MEDIUM 1: `find` must be recognised at EVERY command position --------
//
// The previous detector anchored on "start of line, `;`, `|`, `&` or `(`", so a
// `find` introduced by `if`, `then`, `do`, `{` or a control keyword was silently
// omitted — the dependency simply vanished from the portfolio.
const FIND_COMMAND_POSITION_PROBES = [
  ['start of script', "find src/data -name '*.ts'"],
  ['an `if` head', "if find src/data -name '*.ts'; then echo hit; fi"],
  ['a `then` branch', "if true; then find src/data -name '*.ts'; fi"],
  ['an `elif` head', "if false; then echo a; elif find src/data -name '*.ts'; then echo b; fi"],
  ['an `else` branch', "if false; then echo a; else find src/data -name '*.ts'; fi"],
  ['a `while` head', "while find src/data -name '*.ts'; do echo x; done"],
  ['an `until` head', "until find src/data -name '*.ts'; do echo x; done"],
  ['a `do` body', "for f in a b; do find src/data -name '*.ts'; done"],
  ['a `{ …; }` group', "{ find src/data -name '*.ts'; }"],
  ['a `(...)` subshell', "( find src/data -name '*.ts' )"],
  ['after `&&`', "npm ci && find src/data -name '*.ts'"],
  ['after `||`', "npm ci || find src/data -name '*.ts'"],
  ['after a pipeline `|`', "echo x | find src/data -name '*.ts'"],
  ['after `;` with no space', "echo x;find src/data -name '*.ts'"],
  ['after a newline', "echo x\nfind src/data -name '*.ts'"],
  ['inside a `$(…)` substitution', "COUNT=$(find src/data -name '*.ts' | wc -l)"],
  ['inside a backtick substitution', "COUNT=`find src/data -name '*.ts'`"],
  ['after a `VAR=value` prefix', "LC_ALL=C find src/data -name '*.ts'"],
  ['a `case` arm', "case $x in a) find src/data -name '*.ts';; esac"],
];
for (const [label, run] of FIND_COMMAND_POSITION_PROBES) {
  const closure = r3Closure(run);
  // BOTH the direct child and the nested descendant must resolve: `find` is
  // recursive, so a model that only saw one of them would be wrong.
  check(
    `R3 MEDIUM: \`find\` at ${label} resolves the DIRECT file`,
    closure.readInputs.includes('src/data/direct.ts'),
    JSON.stringify({ read: closure.readInputs, unresolvable: closure.unresolvable }),
  );
  check(
    `R3 MEDIUM: \`find\` at ${label} resolves the NESTED file`,
    closure.readInputs.includes('src/data/nested/deep.ts'),
    JSON.stringify({ read: closure.readInputs, unresolvable: closure.unresolvable }),
  );
  check(
    `R3 MEDIUM: \`find\` at ${label} does not over-match a non-\`.ts\` file`,
    !closure.readInputs.includes('src/data/notes.md'),
    JSON.stringify(closure.readInputs),
  );
}

// A `find` whose structure is outside the supported subset is RECORDED.
const FIND_UNSUPPORTED_PROBES = [
  ['-maxdepth', "find src/data -maxdepth 1 -name '*.ts'"],
  ['-exec', "find src/data -name '*.ts' -exec rm {} +"],
  ['-regex', "find src/data -regex '.*[.]ts'"],
  ['-prune', "find src/data -path node_modules -prune -o -name '*.ts'"],
  ['no -name pattern', 'find src/data -type f'],
  ['a computed search root', 'find "$DIR" -name \'*.ts\''],
  ['a glob search root', "find src/*/ -name '*.ts'"],
];
for (const [label, run] of FIND_UNSUPPORTED_PROBES) {
  const closure = r3Closure(run);
  check(
    `R3 MEDIUM: unsupported \`find\` form (${label}) is recorded, never silently ignored`,
    closure.unresolvable.length > 0,
    JSON.stringify({ read: closure.readInputs, unresolvable: closure.unresolvable }),
  );
}

// --- R3 LOW: quoted shell text is DATA, not an executed command ---------------
{
  const closure = r3Closure("echo '(find src/data -maxdepth 1 -name \"*.ts\")'");
  check(
    'R3 LOW: `find` inside single-quoted text creates NO dependency row',
    closure.readInputs.length === 0 && closure.unresolvable.length === 0,
    JSON.stringify({ read: closure.readInputs, unresolvable: closure.unresolvable }),
  );
}
{
  const closure = r3Closure('echo "a find src/data -name pattern is only text here"');
  check(
    'R3 LOW: `find` inside double-quoted text creates NO dependency row',
    closure.unresolvable.length === 0,
    JSON.stringify(closure.unresolvable),
  );
}
{
  const closure = r3Closure("echo \\(find src/data -name '*.ts'\\)");
  check(
    'R3 LOW: an ESCAPED `find` is text, not a command',
    closure.readInputs.length === 0,
    JSON.stringify(closure.readInputs),
  );
}
{
  // The symmetric obligation: a REAL command substitution still executes.
  const closure = r3Closure('echo "count=$(find src/data -name \'*.ts\' | wc -l)"');
  check(
    'R3 LOW: a `$(find …)` substitution inside DOUBLE quotes still executes',
    closure.readInputs.includes('src/data/direct.ts') && closure.readInputs.includes('src/data/nested/deep.ts'),
    JSON.stringify(closure.readInputs),
  );
}
{
  const closure = r3Closure("node 'scripts/alpha.mjs'");
  check(
    'R3 LOW: a quoted PATH is still a real executed dependency',
    closure.executed.includes('scripts/alpha.mjs'),
    JSON.stringify(closure.executed),
  );
}
{
  const closure = r3Closure("echo 'scripts/*.mjs'");
  check(
    'R3 LOW: a quoted `*` is a literal asterisk, not a glob to expand',
    closure.executed.length === 0 && closure.unresolvable.length === 0,
    JSON.stringify({ executed: closure.executed, unresolvable: closure.unresolvable }),
  );
}

// --- R3 MEDIUM 2: unsupported executed shell globs must not disappear --------
//
// `./scripts/{alpha,beta}.mjs` and `./scripts/[ab].mjs` previously vanished:
// the reporting rule tested the FIRST path segment against the tracked
// top-level directories, and for a `./`-relative word that segment is `.`,
// which is never a tracked directory. Both are now recorded.
const UNSUPPORTED_GLOB_PROBES = [
  ['brace expansion, `./`-relative (the exact Codex case)', 'node ./scripts/{alpha,beta}.mjs'],
  ['brace expansion, repo-rooted', 'node scripts/{alpha,beta}.mjs'],
  ['character class, `./`-relative (the exact Codex case)', 'node ./scripts/[ab].mjs'],
  ['character class, repo-rooted', 'node scripts/[ab].mjs'],
  ['negated character class', 'node scripts/[!a]lpha.mjs'],
  ['a `+` quantifier form', 'node scripts/alpha+.mjs'],
  ['a malformed/unclosed class', 'node scripts/[ab.mjs'],
  ['a nested brace form', 'node ./scripts/{alpha,{beta,gamma}}.mjs'],
];
for (const [label, run] of UNSUPPORTED_GLOB_PROBES) {
  const closure = r3Closure(run);
  check(
    `R3 MEDIUM: unsupported shell glob (${label}) is recorded as unresolvable`,
    closure.unresolvable.some((entry) => entry.includes('shell glob form outside the supported subset')),
    JSON.stringify({ executed: closure.executed, unresolvable: closure.unresolvable }),
  );
}
{
  // The symmetric obligation: an ORDINARY supported glob stays deterministic
  // and produces NO unresolvable row.
  const closure = r3Closure('node scripts/*.mjs');
  check(
    'R3 MEDIUM: an ordinary supported glob still expands deterministically',
    ['scripts/alpha.mjs', 'scripts/beta.mjs', 'scripts/probe.mjs'].every((path) => closure.executed.includes(path)),
    JSON.stringify(closure.executed),
  );
  check(
    'R3 MEDIUM: an ordinary supported glob raises NO unresolvable row',
    closure.unresolvable.length === 0,
    JSON.stringify(closure.unresolvable),
  );
}
{
  const closure = r3Closure('node ./scripts/*.mjs');
  check(
    'R3 MEDIUM: a `./`-relative supported glob also expands deterministically',
    closure.executed.includes('scripts/alpha.mjs') && closure.executed.includes('scripts/beta.mjs'),
    JSON.stringify(closure.executed),
  );
}
{
  const closure = r3Closure('node scripts/missing-*.mjs');
  check(
    'R3 MEDIUM: a supported glob matching nothing is recorded, not silently empty',
    closure.unresolvable.some((entry) => entry.includes('expands to no tracked file')),
    JSON.stringify(closure.unresolvable),
  );
}

// --- R3 MEDIUM: shell STRUCTURE outside the model is reported ----------------
const UNMODELED_SHELL_STRUCTURE_PROBES = [
  ['a here-document', "node <<'EOF'\nreadFileSync(x);\nEOF"],
  ['a process substitution', 'diff <(node scripts/alpha.mjs) scripts/beta.mjs'],
  ['an unterminated command substitution', 'echo $(node scripts/alpha.mjs'],
];
for (const [label, run] of UNMODELED_SHELL_STRUCTURE_PROBES) {
  const closure = r3Closure(run);
  check(
    `R3 MEDIUM: ${label} emits DEPENDENCY_UNRESOLVABLE rather than being ignored`,
    closure.unresolvable.some((entry) => entry.includes('shell structure outside the supported model')),
    JSON.stringify(closure.unresolvable),
  );
}

// --- R3 MEDIUM 3: the JS lexer must not swallow executable code --------------
//
// The previous regex heuristic keyed on the previous CHARACTER, so `return`
// left `n` behind and `return /['"]/.test(x)` was read as division — which made
// the `'` inside the regex open a bogus string literal that swallowed every
// dependency-bearing call after it. Each probe asserts the call AFTER the
// ambiguous construct is still found.
const LEXER_PROBES = [
  [
    'a regex literal after `return`',
    "export function f(x) { return /['\"]/.test(x); }\nreadFileSync('src/data/direct.ts', 'utf8');",
  ],
  [
    'a regex literal after `)` of an `if` head',
    "if (flag) /['\"]/.test(x);\nreadFileSync('src/data/direct.ts', 'utf8');",
  ],
  [
    'division after `)` of a grouping expression',
    "const ratio = (a + b) / c;\nreadFileSync('src/data/direct.ts', 'utf8');",
  ],
  [
    'division after `)` of a call expression',
    "const ratio = size(a) / count(b);\nreadFileSync('src/data/direct.ts', 'utf8');",
  ],
  [
    'division after an identifier',
    "const ratio = total / count;\nreadFileSync('src/data/direct.ts', 'utf8');",
  ],
  [
    'division after a number',
    "const half = 10 / 2;\nreadFileSync('src/data/direct.ts', 'utf8');",
  ],
  [
    'division after `++`',
    "let i = 0;\nconst half = i++ / 2;\nreadFileSync('src/data/direct.ts', 'utf8');",
  ],
  [
    'a regex containing an escaped slash',
    "const re = /a\\/b['\"]/g;\nreadFileSync('src/data/direct.ts', 'utf8');",
  ],
  [
    'a regex literal after `typeof`',
    "const t = typeof /['\"]/;\nreadFileSync('src/data/direct.ts', 'utf8');",
  ],
  [
    'a regex literal after `case`',
    "switch (k) { case /['\"]/.source: break; }\nreadFileSync('src/data/direct.ts', 'utf8');",
  ],
  [
    'a template literal, then a regex, then a computed read',
    "const t = `x${y}`;\nconst re = /['\"]/g;\nreadFileSync('src/data/direct.ts', 'utf8');",
  ],
  [
    'a quote inside a regex inside a template expression (the R3 desync case)',
    "const q = `'${String(v).replace(/'/g, `'\\\\''`)}'`;\nreadFileSync('src/data/direct.ts', 'utf8');",
  ],
  [
    'a comment mentioning a regex and an apostrophe',
    "// a /regex/ and an apostrophe: don't desync\nreadFileSync('src/data/direct.ts', 'utf8');",
  ],
  [
    'a string literal containing regex-looking text',
    "const s = \"a /re/ b\";\nreadFileSync('src/data/direct.ts', 'utf8');",
  ],
];
for (const [label, source] of LEXER_PROBES) {
  const closure = r3Closure('node scripts/probe.mjs', { sources: { 'scripts/probe.mjs': source } });
  check(
    `R3 MEDIUM: no executable read disappears behind ${label}`,
    closure.readInputs.includes('src/data/direct.ts'),
    JSON.stringify({ read: closure.readInputs, unresolvable: closure.unresolvable }),
  );
}
{
  // Comments and string literals are still IGNORED as code: a path that only
  // appears inside them must not become a dependency.
  const closure = r3Closure('node scripts/probe.mjs', {
    sources: {
      'scripts/probe.mjs': [
        "// readFileSync('src/data/notes.md', 'utf8');",
        "const fixture = { text: \"readFileSync('src/data/notes.md')\" };",
        "readFileSync('src/data/direct.ts', 'utf8');",
        'export { fixture };',
      ].join('\n'),
    },
  });
  check(
    'R3 MEDIUM: a path that only appears in a comment is NOT a dependency',
    !closure.readInputs.includes('src/data/notes.md'),
    JSON.stringify(closure.readInputs),
  );
  check(
    'R3 MEDIUM: the real read alongside it IS still a dependency',
    closure.readInputs.includes('src/data/direct.ts'),
    JSON.stringify(closure.readInputs),
  );
}
{
  // The EXACT R3 desync, isolated. On the previous head the lexer's
  // `${…}` reader did not know about regex literals, so the `'` inside
  // `.replace(/'/g, …)` opened a bogus string literal that swallowed the rest
  // of the line — and the `readFileSync` after it produced NEITHER a dependency
  // NOR an unresolvable row. It disappeared completely.
  const desync = "const q = `'${String(v).replace(/'/g, `'\\\\''`)}'`; const t = readFileSync(target, 'utf8');";
  const closure = r3Closure('node scripts/probe.mjs', { sources: { 'scripts/probe.mjs': desync } });
  check(
    'R3 MEDIUM: a COMPUTED read after the desyncing template/regex construct is still recorded',
    closure.unresolvable.some((entry) => entry.includes('computed readFileSync(…) input')),
    JSON.stringify({ read: closure.readInputs, unresolvable: closure.unresolvable }),
  );
}
{
  const desync =
    "const q = `'${String(v).replace(/'/g, `'\\\\''`)}'`; const t = readFileSync('src/data/direct.ts', 'utf8');";
  const closure = r3Closure('node scripts/probe.mjs', { sources: { 'scripts/probe.mjs': desync } });
  check(
    'R3 MEDIUM: a LITERAL read after the desyncing template/regex construct still resolves',
    closure.readInputs.includes('src/data/direct.ts'),
    JSON.stringify({ read: closure.readInputs, unresolvable: closure.unresolvable }),
  );
}
{
  // Fail closed: a construct the lexer cannot disambiguate is REPORTED.
  const closure = r3Closure('node scripts/probe.mjs', {
    sources: { 'scripts/probe.mjs': "const s = 'unterminated\nreadFileSync(dynamic);" },
  });
  check(
    'R3 MEDIUM: a construct the lexer cannot disambiguate emits DEPENDENCY_UNRESOLVABLE',
    closure.unresolvable.some((entry) => entry.includes('could not be lexed unambiguously')),
    JSON.stringify(closure.unresolvable),
  );
}
// The lexer's own contract, probed directly.
check(
  'R3 MEDIUM: lexJavaScript reports a lexing ambiguity instead of guessing',
  lexJavaScript("const s = 'unterminated\nmore();").unmodeled.length > 0,
);
check(
  'R3 MEDIUM: lexJavaScript reports NO ambiguity for ordinary code',
  lexJavaScript("const re = /a\\/b/g;\nconst q = (a + b) / c;\nreturn /['\"]/.test(x);").unmodeled.length === 0,
  JSON.stringify(lexJavaScript("const re = /a\\/b/g;\nconst q = (a + b) / c;\nreturn /['\"]/.test(x);").unmodeled),
);

// --- the tokenizer's own contract, probed directly ---------------------------
check(
  'R3 MEDIUM: tokenizeShell puts `find` in command position after `if`',
  tokenizeShell("if find src -name '*.ts'; then echo x; fi").commands.some((command) => command.name === 'find'),
);
check(
  'R3 LOW: tokenizeShell never puts quoted text in command position',
  tokenizeShell("echo '(find src -name x)'").commands.every((command) => command.name !== 'find'),
);
check(
  'R3 MEDIUM: tokenizeShell keeps a brace-expansion word intact',
  tokenizeShell('node ./scripts/{alpha,beta}.mjs').commands[0].argv[0].value === './scripts/{alpha,beta}.mjs',
  JSON.stringify(tokenizeShell('node ./scripts/{alpha,beta}.mjs').commands),
);
check(
  'R3 MEDIUM: tokenizeShell still treats a standalone `{ … }` as a group',
  tokenizeShell('{ find src -name x; }').commands.some((command) => command.name === 'find'),
);

// ============================================================================
// F3. R4 REGRESSION — command wrappers, and quoted shell OPERATORS
// ============================================================================
//
// R4 MEDIUM: a wrapper is a command whose ARGUMENTS are a command. Reading only
// the head word made `command find …`, `env LC_ALL=C find …` and
// `bash -c "find …"` resolve to NOTHING AT ALL — no dependency and no
// unresolvable row — which is precisely the silent omission this contract
// forbids. Every wrapper form must now either unwrap deterministically or be
// recorded as DEPENDENCY_UNRESOLVABLE.

const WRAPPER_RESOLVING_PROBES = [
  ['`command`', "command find src/data -name '*.ts'"],
  ['`command -p`', "command -p find src/data -name '*.ts'"],
  ['`env` with one assignment', "env LC_ALL=C find src/data -name '*.ts'"],
  ['`env` with several assignments', "env FOO=bar BAR=baz LC_ALL=C find src/data -name '*.ts'"],
  ['`env` with a quoted assignment', "env 'LC_ALL=C' find src/data -name '*.ts'"],
  ['`bash -c` with a double-quoted program', 'bash -c "find src/data -name \'*.ts\'"'],
  ['`sh -c` with a single-quoted program', 'sh -c \'find src/data -name "*.ts"\''],
  ['a single-quoted `bash` executable', '\'bash\' -c "find src/data -name \'*.ts\'"'],
  ['a double-quoted `bash` executable', '"bash" -c "find src/data -name \'*.ts\'"'],
  ['a path-qualified `bash` executable', '/bin/bash -c "find src/data -name \'*.ts\'"'],
  ['a path-qualified `sh` executable', '/bin/sh -c "find src/data -name \'*.ts\'"'],
  ['an inner quoted `find` executable', 'bash -c "\'find\' src/data -name \'*.ts\'"'],
  ['a path-qualified `env` and `find`', "/usr/bin/env FOO=x /usr/bin/find src/data -name '*.ts'"],
  ['a quoted command operand', "command 'find' src/data -name '*.ts'"],
  ['a nested `bash -c` inside a `bash -c`', 'bash -c "bash -c \'find src/data -name *.ts\'"'],
  ['`exec`', "exec find src/data -name '*.ts'"],
  ['`nohup`', "nohup find src/data -name '*.ts'"],
  ['`time`', "time find src/data -name '*.ts'"],
  ['`time -p`', "time -p find src/data -name '*.ts'"],
  ['a wrapper in an `if` head', "if env LC_ALL=C find src/data -name '*.ts'; then echo hit; fi"],
  ['a wrapper inside a `$(…)` substitution', "COUNT=$(command find src/data -name '*.ts' | wc -l)"],
];
for (const [label, run] of WRAPPER_RESOLVING_PROBES) {
  const closure = r3Closure(run);
  check(
    `R4 MEDIUM: a wrapped \`find\` behind ${label} resolves the DIRECT file`,
    closure.readInputs.includes('src/data/direct.ts'),
    JSON.stringify({ read: closure.readInputs, unresolvable: closure.unresolvable }),
  );
  check(
    `R4 MEDIUM: a wrapped \`find\` behind ${label} resolves the NESTED file`,
    closure.readInputs.includes('src/data/nested/deep.ts'),
    JSON.stringify({ read: closure.readInputs, unresolvable: closure.unresolvable }),
  );
  check(
    `R4 MEDIUM: a wrapped \`find\` behind ${label} does not over-match a non-\`.ts\` file`,
    !closure.readInputs.includes('src/data/notes.md'),
    JSON.stringify(closure.readInputs),
  );
  check(
    `R4 MEDIUM: a fully modelled wrapper (${label}) raises NO unresolvable row`,
    closure.unresolvable.length === 0,
    JSON.stringify(closure.unresolvable),
  );
}

// A wrapper also carries EXEC edges through, including a glob that only becomes
// visible once the `-c` program string is parsed as the shell program it is.
{
  const closure = r3Closure('bash -c "node scripts/alpha.mjs"');
  check(
    'R4 MEDIUM: `bash -c` carries an EXEC edge for the wrapped script',
    closure.executed.includes('scripts/alpha.mjs'),
    JSON.stringify({ executed: closure.executed, unresolvable: closure.unresolvable }),
  );
}
{
  // On the previous head the whole program string was QUOTED DATA, so its glob
  // was never expanded and both scripts disappeared without a trace.
  const closure = r3Closure('bash -c "node scripts/*.mjs"');
  check(
    'R4 MEDIUM: a glob inside a `-c` program string is expanded, not silently dropped',
    ['scripts/alpha.mjs', 'scripts/beta.mjs', 'scripts/probe.mjs'].every((path) => closure.executed.includes(path)),
    JSON.stringify({ executed: closure.executed, unresolvable: closure.unresolvable }),
  );
}

// Every wrapper form OUTSIDE the modelled subset is recorded, and resolves
// nothing — silence is never the outcome.
const WRAPPER_UNRESOLVABLE_PROBES = [
  ['an unsupported `command` option', "command -x find src/data -name '*.ts'"],
  ['`command -v` (which does not execute the wrapped command)', "command -v find src/data -name '*.ts'"],
  ['an unsupported `env` flag', "env -i find src/data -name '*.ts'"],
  ['an `env` assignment computed at run time', 'env FOO=$DYNAMIC find src/data -name \'*.ts\''],
  ['an `env` value from a command substitution', "env FOO=$(id -u) find src/data -name '*.ts'"],
  ['an unsupported `time` option', "time -v find src/data -name '*.ts'"],
  ['a `bash -c` program held in a variable', 'bash -c "$CMD"'],
  ['a bare dynamic `bash -c` program', 'bash -c $CMD'],
  ['a `bash -c` program from a command substitution', 'bash -c "$(cat script.sh)"'],
  ['`bash` shell options before `-c`', 'bash -euo pipefail -c "find src/data -name \'*.ts\'"'],
  ['a `bash -c` with no program argument', 'bash -c'],
  ['a wrapper whose command name is dynamic', "command $TOOL src/data -name '*.ts'"],
  ['`builtin` applied to external `find`', "builtin find src/data -name '*.ts'"],
  ['an external `env` context applied to shell-only `command`', "env FOO=x command find src/data -name '*.ts'"],
  ['an external `nohup` context applied to shell-only `command`', "nohup command find src/data -name '*.ts'"],
  ['the deliberately unsupported `sudo` wrapper', "sudo find src/data -name '*.ts'"],
  ['an unknown absolute executable path', "/custom/tool find src/data -name '*.ts'"],
  ['a dynamic executable path', '"$SHELL" -c "find src/data -name \'*.ts\'"'],
  ['a wrapper around an UNSUPPORTED `find`', "command find src/data -maxdepth 1 -name '*.ts'"],
  ['an `env` wrapper around an UNSUPPORTED `find`', "env LC_ALL=C find src/data -regex '.*[.]ts'"],
  ['a `bash -c` around an UNSUPPORTED `find`', 'bash -c "find src/data -name \'*.ts\' -exec rm {} +"'],
  ['a wrapper chain deeper than the bound', "command command command command command find src/data -name '*.ts'"],
  [
    'a `-c` shell program nested deeper than the bound',
    'bash -c "bash -c \\"bash -c \'bash -c \\\\\\"find src/data -name x\\\\\\"\'\\""',
  ],
];
for (const [label, run] of WRAPPER_UNRESOLVABLE_PROBES) {
  const closure = r3Closure(run);
  check(
    `R4 MEDIUM: ${label} is recorded as unresolvable, never silently dropped`,
    closure.unresolvable.length > 0,
    JSON.stringify({ read: closure.readInputs, executed: closure.executed, unresolvable: closure.unresolvable }),
  );
  check(
    `R4 MEDIUM: ${label} never invents a resolved dependency`,
    !closure.readInputs.includes('src/data/direct.ts') || closure.unresolvable.length > 0,
    JSON.stringify({ read: closure.readInputs, unresolvable: closure.unresolvable }),
  );
}

// The tokenizer contract, probed directly: the wrapped command really occupies a
// command position of its own.
check(
  'R4 MEDIUM: tokenizeShell puts a `command`-wrapped word in command position',
  tokenizeShell("command find src -name '*.ts'").commands.some((command) => command.name === 'find'),
  JSON.stringify(tokenizeShell("command find src -name '*.ts'").commands.map((command) => command.name)),
);
check(
  'R4 MEDIUM: tokenizeShell puts an `env`-wrapped word in command position',
  tokenizeShell("env LC_ALL=C find src -name '*.ts'").commands.some((command) => command.name === 'find'),
  JSON.stringify(tokenizeShell("env LC_ALL=C find src -name '*.ts'").commands.map((command) => command.name)),
);
check(
  'R4 MEDIUM: tokenizeShell parses a literal `-c` program as a nested shell program',
  tokenizeShell('bash -c "find src -name x && node scripts/alpha.mjs"').commands.some(
    (command) => command.name === 'node',
  ),
  JSON.stringify(tokenizeShell('bash -c "find src -name x && node scripts/alpha.mjs"').commands.map((c) => c.name)),
);
check(
  'R4 MEDIUM: `bash script.sh` is NOT treated as an unsupported wrapper form',
  tokenizeShell('bash scripts/alpha.mjs').unmodeled.length === 0,
  JSON.stringify(tokenizeShell('bash scripts/alpha.mjs').unmodeled),
);
const derivedWithUnresolvedDependencies = derived.filter((entry) =>
  entry.knownGaps.some((gapEntry) => gapEntry.code === 'DEPENDENCY_UNRESOLVABLE'),
);
// R6 replaces the R5 assertion that every live carrier FAILED the audit. The
// obligation is now split: integrity demands the carrier be recorded FAITHFULLY
// (so no fact can vanish), and readiness demands every carrier that holds
// blocking authority be listed as a blocker.
check(
  'R6 DISCOVERY A: every live DEPENDENCY_UNRESOLVABLE carrier is recorded faithfully in the snapshot',
  derivedWithUnresolvedDependencies.every((entry) => {
    const stored = livePortfolio.entries.find(
      (candidate) => candidate.workflowFile === entry.workflowFile && candidate.jobId === entry.jobId,
    );
    const unresolvedOf = (source) =>
      (source?.knownGaps ?? [])
        .filter((gapEntry) => gapEntry.code === 'DEPENDENCY_UNRESOLVABLE')
        .map((gapEntry) => gapEntry.detail)
        .sort();
    return JSON.stringify(unresolvedOf(stored)) === JSON.stringify(unresolvedOf(entry));
  }),
  JSON.stringify({ carrierCount: derivedWithUnresolvedDependencies.length }),
);
check(
  'R6 DISCOVERY A: every live carrier holding BLOCKING authority is an enforcement-readiness blocker',
  derivedWithUnresolvedDependencies
    .filter((entry) => BLOCKING_AUTHORITY_CLASSIFICATIONS.includes(entry.classification))
    .every((entry) =>
      liveReadiness.rows.some((row) => row.workflowFile === entry.workflowFile && row.jobId === entry.jobId),
    ),
  JSON.stringify({
    carriers: derivedWithUnresolvedDependencies.length,
    blockingCarriers: derivedWithUnresolvedDependencies.filter((entry) =>
      BLOCKING_AUTHORITY_CLASSIFICATIONS.includes(entry.classification),
    ).length,
    affected: liveReadiness.affectedBlockingEntries,
  }),
);

// --- R5 M1/M2: literal `-c` text and executable identity stay separate -------
// Previous head e2dfd68903653aaa0eb57c462cae6aae91485ef5 rebuilt a
// `-c` program from `word.value`. That had already erased outer quoting and
// backslash semantics, so dependency-bearing commands could disappear.
// Reproduced directly from that immutable blob before this fix:
//   M1 escaped quote: readInputs=[]; unresolvable=[]
//   M2 /bin/bash and quoted 'bash': readInputs=[]; unresolvable=[]
//   M3 FAIL_CLOSED_GAP_CODES omitted DEPENDENCY_UNRESOLVABLE
//   L1 escaped <<: false here-document unresolved row
//   L2 builtin/env-command/nohup-command: both tracked .ts files invented cleanly
const R5_LITERAL_C_FIND_PROBES = [
  [
    'an escaped quote before a later `find`',
    String.raw`bash -c "echo \'; find src/data -name '*.ts'; echo \'"`,
  ],
  ['a literal single-quoted `-c` program', `bash -c 'find src/data -name "*.ts"'`],
  ['a literal double-quoted `-c` program', `bash -c "find src/data -name '*.ts'"`],
  [
    'nested single/double quote combinations',
    String.raw`bash -c 'echo "\"quoted\""; "find" src/data -name "*.ts"'`,
  ],
  [
    'an escaped backslash whose later semicolon remains executable',
    String.raw`bash -c "echo \\\\; find src/data -name '*.ts'"`,
  ],
  ['an actual later command after quoted data', `bash -c "echo 'find is data'; find src/data -name '*.ts'"`],
];
for (const [label, run] of R5_LITERAL_C_FIND_PROBES) {
  const closure = r3Closure(run);
  check(
    `R5 M1: ${label} exposes the later DIRECT dependency`,
    closure.readInputs.includes('src/data/direct.ts'),
    JSON.stringify({ read: closure.readInputs, unresolvable: closure.unresolvable }),
  );
  check(
    `R5 M1: ${label} exposes the later NESTED dependency`,
    closure.readInputs.includes('src/data/nested/deep.ts'),
    JSON.stringify({ read: closure.readInputs, unresolvable: closure.unresolvable }),
  );
  check(
    `R5 M1: ${label} is exactly modelled`,
    closure.unresolvable.length === 0,
    JSON.stringify(closure.unresolvable),
  );
}

{
  const source = String.raw`bash -c "echo \<\<"`;
  const outer = tokenizeShell(source).commands.find((command) => command.name === 'bash');
  const program = outer?.argv?.[1];
  check(
    'R5 M1: a `-c` token preserves exact raw spelling separately from its literal program text',
    program?.raw === String.raw`"echo \<\<"` && program?.literalText === String.raw`echo \<\<`,
    JSON.stringify(program ?? null),
  );
}

{
  const quoted = tokenizeShell(`'find' src/data -name '*.ts'`).commands.find((command) => command.name === 'find');
  check(
    'R5 M2: a quoted executable normalises to `find` while preserving quote provenance',
    quoted?.nameQuoted === true && quoted?.rawName === "'find'",
    JSON.stringify(quoted ?? null),
  );
  const qualified = tokenizeShell(`/usr/bin/find src/data -name '*.ts'`).commands.find(
    (command) => command.name === 'find',
  );
  check(
    'R5 M2: a literal path-qualified executable normalises only by its modelled basename',
    qualified?.pathQualified === true && qualified?.rawName === '/usr/bin/find',
    JSON.stringify(qualified ?? null),
  );
}

// --- R6 M2: path-qualified executables use a CLOSED EXACT-PATH allowlist -----
// The R5 model normalised any absolute path whose BASENAME matched a modelled
// tool, so `/custom/bash` and `/evil/find` were silently treated as the shell
// and the finder this engine models — dependency facts invented for programs it
// has never seen. Only the exact literal paths in the allowlist may be modelled;
// every other path is DEPENDENCY_UNRESOLVABLE and resolves NO dependency.
{
  const identityOf = (source) => {
    const { commands, unmodeled } = tokenizeShell(source);
    return { command: commands[0] ?? null, unmodeled };
  };

  // Modelled: exact allowlisted paths.
  const R6_MODELED_PATHS = [
    ['/bin/bash', 'bash', `/bin/bash -c "find src/data -name '*.ts'"`],
    ['/usr/bin/bash', 'bash', `/usr/bin/bash -c "find src/data -name '*.ts'"`],
    ['/bin/sh', 'sh', `/bin/sh -c "find src/data -name '*.ts'"`],
    ['/usr/bin/sh', 'sh', `/usr/bin/sh -c "find src/data -name '*.ts'"`],
    ['/bin/find', 'find', `/bin/find src/data -name '*.ts'`],
    ['/usr/bin/find', 'find', `/usr/bin/find src/data -name '*.ts'`],
    ['/usr/bin/env', 'env', `/usr/bin/env find src/data -name '*.ts'`],
    ['/bin/env', 'env', `/bin/env find src/data -name '*.ts'`],
  ];
  for (const [path, expected, source] of R6_MODELED_PATHS) {
    const { command, unmodeled } = identityOf(source);
    check(
      `R6 M2: allowlisted \`${path}\` is modelled as \`${expected}\` with its raw spelling preserved`,
      command?.name === expected && command?.pathQualified === true && command?.rawName === path && unmodeled.length === 0,
      JSON.stringify({ command, unmodeled }),
    );
  }

  // NOT modelled: an arbitrary path whose basename merely imitates a modelled
  // tool. Each must be unresolved AND must resolve no dependency at all.
  const R6_UNRESOLVED_PATHS = [
    ['/custom/bash', `/custom/bash -c "find src/data -name '*.ts'"`],
    ['/evil/find', `/evil/find src/data -name '*.ts'`],
    ['/custom/env', `/custom/env find src/data -name '*.ts'`],
    ['/usr/local/bin/bash', `/usr/local/bin/bash -c "find src/data -name '*.ts'"`],
    ['/opt/homebrew/bin/find', `/opt/homebrew/bin/find src/data -name '*.ts'`],
    ['/bin/../custom/bash', `/bin/../custom/bash -c "find src/data -name '*.ts'"`],
    ['/usr/bin/./find', `/usr/bin/./find src/data -name '*.ts'`],
  ];
  for (const [path, source] of R6_UNRESOLVED_PATHS) {
    const { command, unmodeled } = identityOf(source);
    check(
      `R6 M2: arbitrary \`${path}\` is NEVER modelled by basename`,
      command?.name === null &&
        command?.dependencyScan === false &&
        unmodeled.some((detail) => detail.includes(path)),
      JSON.stringify({ command, unmodeled }),
    );
    const closure = r3Closure(source);
    check(
      `R6 M2: arbitrary \`${path}\` records DEPENDENCY_UNRESOLVABLE and invents no dependency`,
      closure.unresolvable.some((detail) => /path-qualified executable is outside the supported model/.test(detail)) &&
        closure.readInputs.length === 0 &&
        closure.executed.length === 0,
      JSON.stringify(closure),
    );
  }

  // A path computed at run time can never be checked against any allowlist.
  {
    const { command, unmodeled } = identityOf(`$CBW_TOOL src/data -name '*.ts'`);
    check(
      'R6 M2: a dynamically computed executable path is unresolved',
      command?.name === null && command?.dependencyScan === false && unmodeled.length > 0,
      JSON.stringify({ command, unmodeled }),
    );
    const substituted = identityOf(`$(which find) src/data -name '*.ts'`);
    check(
      'R6 M2: a command-substituted executable path is unresolved',
      substituted.command?.name === null || substituted.unmodeled.length > 0,
      JSON.stringify(substituted),
    );
  }

  // The allowlist is a CLOSED, machine-readable contract of exact paths.
  check(
    'R6 M2: the path-qualified allowlist is a closed set of exact literal paths',
    Array.isArray(SUPPORTED_SHELL_MODEL.pathQualifiedCommandPaths) &&
      SUPPORTED_SHELL_MODEL.pathQualifiedCommandPaths.every((path) => /^\/(bin|usr\/bin)\/[a-z]+$/.test(path)) &&
      ['/bin/bash', '/usr/bin/bash', '/bin/sh', '/usr/bin/sh', '/usr/bin/env', '/bin/find', '/usr/bin/find'].every(
        (path) => SUPPORTED_SHELL_MODEL.pathQualifiedCommandPaths.includes(path),
      ) &&
      !SUPPORTED_SHELL_MODEL.pathQualifiedCommandPaths.some((path) => /custom|evil|local|opt/.test(path)) &&
      SUPPORTED_SHELL_MODEL.pathQualifiedCommandBasenames === undefined,
    JSON.stringify(SUPPORTED_SHELL_MODEL.pathQualifiedCommandPaths),
  );
}

const R5_ESCAPED_C_DATA_PROBES = [
  ['an escaped semicolon', String.raw`bash -c "echo \; find src/data -name '*.ts'"`],
  ['escaped operator text', String.raw`bash -c "echo \&\& find src/data -name '*.ts'"`],
  ['escaped here-document text', String.raw`bash -c "echo \<\<"`],
  ['quoted process-substitution text', `bash -c "echo '<(text)'"`],
  ['escaped process-substitution text', String.raw`bash -c "echo \<\(text\)"`],
];
for (const [label, run] of R5_ESCAPED_C_DATA_PROBES) {
  const closure = r3Closure(run);
  check(
    `R5 M1/L1: ${label} remains data, with no invented dependency or modelling gap`,
    closure.readInputs.length === 0 && closure.executed.length === 0 && closure.unresolvable.length === 0,
    JSON.stringify(closure),
  );
}

{
  const closure = r3Closure(`bash -c 'echo "$(find src/data -name \'*.ts\')"'`);
  check(
    'R5 L1: an actual command substitution inside a literal `-c` program is analysed',
    closure.readInputs.includes('src/data/direct.ts') && closure.readInputs.includes('src/data/nested/deep.ts'),
    JSON.stringify(closure),
  );
}
{
  const closure = r3Closure(`bash -c 'diff <(find src/data -name \'*.ts\') scripts/beta.mjs'`);
  check(
    'R5 L1: actual process substitution is analysed and remains explicitly unresolved',
    closure.readInputs.includes('src/data/direct.ts') &&
      closure.unresolvable.some((detail) => /process substitution/.test(detail)),
    JSON.stringify(closure),
  );
}
{
  const closure = r3Closure("bash -c 'node <<EOF\ntext\nEOF'");
  check(
    'R5 L1: an actual here-document remains outside the bounded model',
    closure.unresolvable.some((detail) => /here-document/.test(detail)),
    JSON.stringify(closure),
  );
}

// --- R4 LOW: a shell OPERATOR only counts where the shell would execute it ----
//
// `echo '<< is documentation text'` and `echo '<(not executable)'` are DATA.
// Detecting unsupported structure against RAW TEXT reported both as a
// here-document and a process substitution, inventing unresolvable rows for
// text that executes nothing at all.
const QUOTED_OPERATOR_CLEAN_PROBES = [
  ['single-quoted `<<` text', "echo '<< is documentation text'"],
  ['double-quoted `<<` text', 'echo "<< is documentation text"'],
  ['escaped `<<`', 'echo \\<\\<'],
  ['single-quoted escaped `<<`', "echo '\\<\\<'"],
  ['single-quoted process-substitution text', "echo '<(not executable)'"],
  ['double-quoted process-substitution text', 'echo "<(not executable)"'],
  ['single-quoted `>(` text', "echo '>(not executable)'"],
  ['a quoted here-doc marker', "echo '<<EOF'"],
  ['a quoted here-doc marker word', "echo 'EOF'"],
  ['quoted operator text in a `#` comment', "# a here-doc is written << EOF\necho ok"],
];
for (const [label, run] of QUOTED_OPERATOR_CLEAN_PROBES) {
  const closure = r3Closure(run);
  check(
    `R4 LOW: ${label} raises NO here-document/process-substitution row`,
    !closure.unresolvable.some((entry) => /here-document|process substitution/.test(entry)),
    JSON.stringify(closure.unresolvable),
  );
  check(
    `R4 LOW: ${label} raises no unresolvable row at all and no dependency`,
    closure.unresolvable.length === 0 && closure.readInputs.length === 0 && closure.executed.length === 0,
    JSON.stringify({ read: closure.readInputs, executed: closure.executed, unresolvable: closure.unresolvable }),
  );
}
{
  // A command substitution inside DOUBLE quotes really executes, so its `find`
  // is still analysed — quoting data must not become quieting execution.
  const closure = r3Closure('echo "$(find src/data -name \'*.ts\')"');
  check(
    'R4 LOW: a `$(…)` inside double quotes still has its inner `find` analysed',
    closure.readInputs.includes('src/data/direct.ts') && closure.readInputs.includes('src/data/nested/deep.ts'),
    JSON.stringify({ read: closure.readInputs, unresolvable: closure.unresolvable }),
  );
}
const REAL_OPERATOR_PROBES = [
  ['a real process substitution', 'diff <(find src/data -name \'*.ts\') scripts/beta.mjs', /process substitution/],
  ['a real `>(` process substitution', 'tee >(node scripts/alpha.mjs) < scripts/beta.mjs', /process substitution/],
  ['a real here-document', "node <<'EOF'\nreadFileSync(x);\nEOF", /here-document/],
  ['a real here-string-style `<<` redirection', 'node <<EOF\nx\nEOF', /here-document/],
];
for (const [label, run, pattern] of REAL_OPERATOR_PROBES) {
  const closure = r3Closure(run);
  check(
    `R4 LOW: ${label} is STILL recorded as unresolvable`,
    closure.unresolvable.some((entry) => pattern.test(entry)),
    JSON.stringify(closure.unresolvable),
  );
}
{
  // And a `find` that really is executed inside a process substitution is still
  // analysed, alongside the unresolvable row for the construct itself.
  const closure = r3Closure("diff <(find src/data -name '*.ts') scripts/beta.mjs");
  check(
    'R4 LOW: a `find` executed inside a real `<(…)` is still analysed',
    closure.readInputs.includes('src/data/direct.ts'),
    JSON.stringify({ read: closure.readInputs, unresolvable: closure.unresolvable }),
  );
}

// --- R3: COUNT TERMINOLOGY IS DEFINED IN CODE, NOT IN PROSE ------------------
//
// "42 distinct forms" was quoted in an R2 write-up and could not be reproduced,
// because "form" was never defined anywhere executable. The metric vocabulary
// now lives in `summarizeUnresolvedDependencies` and is asserted here against a
// hand-checkable fixture, so every number a document quotes can be regenerated.
{
  const fixture = {
    entries: [
      {
        knownGaps: [
          { code: 'DEPENDENCY_UNRESOLVABLE', detail: 'a.mjs :: reason one' },
          { code: 'DEPENDENCY_UNRESOLVABLE', detail: 'a.mjs :: reason two' },
          { code: 'DEPENDENCY_UNRESOLVABLE', detail: 'b.mjs :: reason one' },
          { code: 'TRIGGER_GAP_SCRIPT', detail: 'a.mjs :: reason one' },
        ],
      },
      {
        // The SAME fact seen by a second job: one more ROW, no new distinct fact.
        knownGaps: [{ code: 'DEPENDENCY_UNRESOLVABLE', detail: 'a.mjs :: reason one' }],
      },
      {
        // A reason that itself contains ` :: ` — the split is at the FIRST one.
        knownGaps: [{ code: 'DEPENDENCY_UNRESOLVABLE', detail: 'c.mjs :: reason :: with separator' }],
      },
    ],
  };
  const metrics = summarizeUnresolvedDependencies(fixture);
  check('R3 metrics: unresolvedRows counts one row per (entry, gap) pair', metrics.unresolvedRows === 5, JSON.stringify(metrics));
  check('R3 metrics: distinctOriginReasonFacts dedupes the repeated fact', metrics.distinctOriginReasonFacts === 4, JSON.stringify(metrics));
  check('R3 metrics: distinctReasons removes the origin prefix', metrics.distinctReasons === 3, JSON.stringify(metrics));
  check('R3 metrics: distinctOrigins counts origins', metrics.distinctOrigins === 3, JSON.stringify(metrics));
  check(
    'R3 metrics: a non-DEPENDENCY_UNRESOLVABLE gap is never counted',
    summarizeUnresolvedDependencies({ entries: [{ knownGaps: [{ code: 'TRIGGER_GAP_SCRIPT', detail: 'x :: y' }] }] })
      .unresolvedRows === 0,
  );
  check('R3 metrics: an empty portfolio yields zeroes, not NaN', summarizeUnresolvedDependencies({}).unresolvedRows === 0);
}
{
  // And the LIVE numbers are self-consistent, so a quoted figure can never
  // drift from the file it claims to describe.
  const live = summarizeUnresolvedDependencies(JSON.parse(portfolioText));
  check('R3 metrics: the live portfolio really has unresolved rows (the probe is not vacuous)', live.unresolvedRows > 0);
  check(
    'R3 metrics: distinct facts never exceed rows, and distinct reasons never exceed facts',
    live.distinctOriginReasonFacts <= live.unresolvedRows && live.distinctReasons <= live.distinctOriginReasonFacts,
    JSON.stringify(live),
  );
  check(
    'R3 metrics: distinct origins never exceed distinct facts',
    live.distinctOrigins <= live.distinctOriginReasonFacts,
    JSON.stringify(live),
  );
}

// ============================================================================
// C. MUTATION PROBES — the audit must be capable of failing
// ============================================================================

const clonePortfolio = () => JSON.parse(portfolioText);
const withPortfolio = (mutate) => {
  const portfolio = clonePortfolio();
  mutate(portfolio);
  return run({ portfolioText: JSON.stringify(portfolio) });
};
const withFiles = (mutate) => {
  const mutated = files.map((file) => ({ ...file }));
  mutate(mutated);
  return run({ files: mutated });
};

// --- C1. malformed / unknown structure --------------------------------------
expectFailure('audit FAILS on a portfolio that is not valid JSON', run({ portfolioText: '{not json' }), /parses as strict JSON/);
expectFailure('audit FAILS on a portfolio that is a JSON array', run({ portfolioText: '[]' }), /non-array object/);
expectFailure('audit FAILS on a portfolio that is JSON null', run({ portfolioText: 'null' }), /non-array object/);
expectFailure('audit FAILS on a portfolio with no entries array', run({ portfolioText: `{"schemaVersion":${SCHEMA_VERSION}}` }), /entries array/);
expectFailure(
  'audit FAILS on an empty entries array',
  withPortfolio((portfolio) => {
    portfolio.entries = [];
  }),
  /entries array is non-empty/,
);
expectFailure(
  'audit FAILS on an entry carrying an unknown field',
  withPortfolio((portfolio) => {
    portfolio.entries[0].futurePlan = 'migrate soon';
  }),
  /declares no unknown fields/,
);
expectFailure(
  'audit FAILS on an entry missing a required field',
  withPortfolio((portfolio) => {
    delete portfolio.entries[0].triggerCoverage;
  }),
  /declares required field "triggerCoverage"/,
);

// --- C1b. STRICT ROOT SCHEMA --------------------------------------------------
check('the live portfolio declares exactly the allowed root keys', JSON.stringify(Object.keys(clonePortfolio()).sort()) === JSON.stringify([...ROOT_KEYS].sort()));
expectFailure(
  'audit FAILS on an UNKNOWN root key',
  withPortfolio((portfolio) => {
    portfolio.futureNotes = 'anything';
  }),
  /declares no unknown root keys/,
);
for (const key of ROOT_KEYS) {
  expectFailure(
    `audit FAILS when required root key "${key}" is missing`,
    withPortfolio((portfolio) => {
      delete portfolio[key];
    }),
    new RegExp(`declares required root key "${key}"`),
  );
}
expectFailure(
  'audit FAILS on schemaVersion 999 (a future version is NOT silently accepted)',
  withPortfolio((portfolio) => {
    portfolio.schemaVersion = 999;
  }),
  /schemaVersion is exactly/,
);
expectFailure(
  'audit FAILS on the PREVIOUS schemaVersion (pinning is exact, not a floor)',
  withPortfolio((portfolio) => {
    portfolio.schemaVersion = SCHEMA_VERSION - 1;
  }),
  /schemaVersion is exactly/,
);
expectFailure(
  'audit FAILS on a schemaVersion of the wrong type',
  withPortfolio((portfolio) => {
    portfolio.schemaVersion = String(SCHEMA_VERSION);
  }),
  /schemaVersion is a number/,
);
expectFailure(
  'audit FAILS on a non-integer schemaVersion',
  withPortfolio((portfolio) => {
    portfolio.schemaVersion = 2.5;
  }),
  /schemaVersion is a number/,
);
for (const [key, badValue, pattern] of [
  ['issue', 'three-sixty-six', /portfolio issue is a number/],
  ['stage', '', /portfolio stage is a non-empty string/],
  ['description', 42, /portfolio description is a non-empty string/],
  ['totals', [], /portfolio totals is a non-null, non-array object/],
  ['entries', {}, /portfolio declares an entries array/],
]) {
  expectFailure(
    `audit FAILS when root key "${key}" has the wrong type`,
    withPortfolio((portfolio) => {
      portfolio[key] = badValue;
    }),
    pattern,
  );
}

// --- C2. closed vocabularies -------------------------------------------------
expectFailure(
  'audit FAILS on a classification outside the closed vocabulary',
  withPortfolio((portfolio) => {
    portfolio.entries[0].classification = 'SEMI_BLOCKING';
  }),
  /classification is in the closed vocabulary/,
);
expectFailure(
  'audit FAILS on a migrationState outside the closed vocabulary',
  withPortfolio((portfolio) => {
    portfolio.entries[0].migrationState = 'MIGRATED';
  }),
  /migrationState is in the closed vocabulary/,
);
expectFailure(
  'audit FAILS on a gap code outside the closed vocabulary',
  withPortfolio((portfolio) => {
    const target = portfolio.entries.find((entry) => entry.knownGaps.length > 0);
    target.knownGaps[0].code = 'PROBABLY_FINE';
  }),
  /gap code .* is in the closed vocabulary/,
);
expectFailure(
  'audit FAILS when the declared classification vocabulary itself drifts',
  withPortfolio((portfolio) => {
    portfolio.classifications = [...portfolio.classifications, 'SEMI_BLOCKING'];
  }),
  /classification vocabulary matches the closed engine vocabulary/,
);
expectFailure(
  'audit FAILS when the declared gap-code vocabulary itself drifts',
  withPortfolio((portfolio) => {
    portfolio.gapCodes = portfolio.gapCodes.filter((code) => code !== 'UNMODELED_JOB_IF');
  }),
  /gap-code vocabulary matches the closed engine vocabulary/,
);
check('the engine vocabulary still declares every migration state', MIGRATION_STATES.length === 3);

// --- C3. duplicates ----------------------------------------------------------
expectFailure(
  'audit FAILS on a duplicate portfolio id',
  withPortfolio((portfolio) => {
    portfolio.entries[1].id = portfolio.entries[0].id;
  }),
  /id is unique/,
);
expectFailure(
  'audit FAILS on a duplicate claimed stable context with no justification',
  withPortfolio((portfolio) => {
    portfolio.entries[1].checkContext = portfolio.entries[0].checkContext;
  }),
  /duplicate check context .* carries an explicit justification/,
);
expectFailure(
  'audit FAILS on a context-collision justification where no collision exists',
  withPortfolio((portfolio) => {
    portfolio.entries[0].contextCollisionJustification = 'because I said so';
  }),
  /declares no unnecessary context-collision justification/,
);

// --- C4. drift in derivable facts -------------------------------------------
expectFailure(
  'audit FAILS when a stored check context no longer matches the job name',
  withPortfolio((portfolio) => {
    portfolio.entries[0].checkContext = 'Renamed context';
  }),
  /field "checkContext" matches the workflow YAML/,
);
expectFailure(
  'audit FAILS when a stored workflow name no longer matches the YAML',
  withPortfolio((portfolio) => {
    portfolio.entries[0].workflowName = 'Something Else';
  }),
  /field "workflowName" matches the workflow YAML/,
);
expectFailure(
  'audit FAILS when a stored path-filter state contradicts the YAML',
  withPortfolio((portfolio) => {
    const target = portfolio.entries.find((entry) => entry.pathFiltered === true);
    target.pathFiltered = false;
  }),
  /field "pathFiltered" matches the workflow YAML/,
);
expectFailure(
  'audit FAILS when a stored path-filter LIST contradicts the YAML',
  withPortfolio((portfolio) => {
    const target = portfolio.entries.find((entry) => entry.triggerCoverage.paths.length > 0);
    target.triggerCoverage.paths = [...target.triggerCoverage.paths, 'src/**'];
  }),
  /field "triggerCoverage" matches the workflow YAML/,
);
expectFailure(
  'audit FAILS when stored commands drift from the workflow steps',
  withPortfolio((portfolio) => {
    portfolio.entries[0].commands = [];
  }),
  /field "commands" matches the workflow YAML/,
);
expectFailure(
  'audit FAILS when a derived dependency is quietly dropped from the contract',
  withPortfolio((portfolio) => {
    const target = portfolio.entries.find((entry) => entry.dependencies.readInputs.length > 0);
    target.dependencies.readInputs = [];
  }),
  /field "dependencies" matches the workflow YAML/,
);
expectFailure(
  'audit FAILS when a recorded trigger gap is quietly dropped from the contract',
  withPortfolio((portfolio) => {
    const target = portfolio.entries.find((entry) => entry.knownGaps.length > 0);
    target.knownGaps = [];
  }),
  /field "knownGaps" matches the workflow YAML/,
);
expectFailure(
  'audit FAILS when directRequiredSafe is asserted for a path-filtered blocking gate',
  withPortfolio((portfolio) => {
    const target = portfolio.entries.find(
      (entry) => entry.classification === 'BLOCKING' && entry.pathFiltered === true,
    );
    target.directRequiredSafe = true;
  }),
  /field "directRequiredSafe" matches the workflow YAML/,
);

// --- C5. blocking/advisory semantic drift in the WORKFLOW --------------------
//
// The real regression: someone softens a hard gate to continue-on-error, or
// hardens an advisory job, and nothing notices.
const softened = withFiles((mutated) => {
  const index = mutated.findIndex((file) => file.path.endsWith('cbw-global-header-interaction.yml'));
  mutated[index].text = mutated[index].text.replace(
    '    runs-on: ubuntu-latest\n',
    '    runs-on: ubuntu-latest\n    continue-on-error: true\n',
  );
});
expectFailure(
  'audit FAILS when a BLOCKING hard gate is silently softened to continue-on-error',
  softened,
  /field "classification" matches the workflow YAML/,
);
expectFailure(
  'the softening is also reported as a vanished BLOCKING entry',
  softened,
  /has not silently vanished from the repository/,
);
expectFailure(
  'audit FAILS when a BLOCKING hard gate is softened with an EXPRESSION continue-on-error',
  withFiles((mutated) => {
    const index = mutated.findIndex((file) => file.path.endsWith('cbw-global-header-interaction.yml'));
    mutated[index].text = mutated[index].text.replace(
      '    runs-on: ubuntu-latest\n',
      '    runs-on: ubuntu-latest\n    continue-on-error: ${{ true }}\n',
    );
  }),
  /field "classification" matches the workflow YAML/,
);
expectFailure(
  'audit FAILS when an ADVISORY job is silently hardened into a blocking one',
  withFiles((mutated) => {
    const index = mutated.findIndex((file) => file.path.endsWith('cbw-header-context-advisory.yml'));
    mutated[index].text = mutated[index].text.replace('    continue-on-error: true\n', '');
  }),
  /field "classification" matches the workflow YAML/,
);
expectFailure(
  'audit FAILS when a path filter is removed from a blocking gate',
  withFiles((mutated) => {
    const index = mutated.findIndex((file) => file.path.endsWith('cbw-contact-utility.yml'));
    mutated[index].text = mutated[index].text.replace(
      /    paths:\n(?:      - .*\n)+/,
      '',
    );
  }),
  /field "pathFiltered" matches the workflow YAML/,
);
expectFailure(
  'audit FAILS when a blocking gate is narrowed off master by a branch glob',
  withFiles((mutated) => {
    const index = mutated.findIndex((file) => file.path.endsWith('cbw-contact-utility.yml'));
    mutated[index].text = mutated[index].text.replace('      - master\n', "      - 'releases/**'\n");
  }),
  /field "classification" matches the workflow YAML/,
);

// --- C6. DISCOVERY: a new blocking-capable PR workflow must demand classification
const NEW_BLOCKING_PROBES = [
  [
    'a plainly named new hard gate',
    '.github/workflows/cbw-brand-new-hard-gate.yml',
    `name: CBW Brand New Hard Gate
on:
  pull_request:
    branches:
      - master
permissions:
  contents: read
jobs:
  brand-new:
    name: Brand new hard gate
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
      - run: node scripts/ui/brand-new-check.mjs
`,
  ],
  [
    'a new workflow whose FILENAME claims to be advisory but whose job is blocking',
    '.github/workflows/cbw-sneaky-advisory.yml',
    `name: CBW Sneaky Advisory
on:
  pull_request:
    branches:
      - master
    paths:
      - 'src/**'
jobs:
  sneaky:
    name: Sneaky advisory (non-blocking)
    runs-on: ubuntu-latest
    steps:
      - run: node scripts/ui/sneaky.mjs
`,
  ],
  [
    'a new hard gate declared with the SCALAR `on: pull_request` form',
    '.github/workflows/cbw-scalar-trigger-gate.yml',
    `name: CBW Scalar Trigger Gate
on: pull_request
jobs:
  scalar-gate:
    name: Scalar trigger gate
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
  ],
  [
    'a new hard gate declared with the SEQUENCE `on: [pull_request]` form',
    '.github/workflows/cbw-sequence-trigger-gate.yml',
    `name: CBW Sequence Trigger Gate
on: [push, pull_request]
jobs:
  sequence-gate:
    name: Sequence trigger gate
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
  ],
  [
    'a new hard gate reaching master through a branch GLOB',
    '.github/workflows/cbw-glob-trigger-gate.yml',
    `name: CBW Glob Trigger Gate
on:
  pull_request:
    branches:
      - 'mast*'
jobs:
  glob-gate:
    name: Glob trigger gate
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
  ],
];
for (const [label, path, text] of NEW_BLOCKING_PROBES) {
  const results = withFiles((mutated) => mutated.push({ path, text }));
  expectFailure(`discovery FAILS on ${label}`, results, /is represented in the portfolio/);
  expectFailure(`discovery names ${label} as requiring explicit classification`, results, /is explicitly classified/);
}
expectFailure(
  'discovery FAILS on a new blocking job added to an EXISTING workflow file',
  withFiles((mutated) => {
    const index = mutated.findIndex((file) => file.path.endsWith('cbw-contact-utility.yml'));
    mutated[index].text += `
  smuggled-second-job:
    name: Smuggled second job
    runs-on: ubuntu-latest
    steps:
      - run: node scripts/ui/smuggled.mjs
`;
  }),
  /is explicitly classified/,
);
// A new ADVISORY workflow must also be classified — coverage is total, so an
// advisory today cannot be quietly hardened into a gate tomorrow.
expectFailure(
  'discovery FAILS on a new ADVISORY PR workflow that is not classified',
  withFiles((mutated) =>
    mutated.push({
      path: '.github/workflows/cbw-new-advisory.yml',
      text: `name: CBW New Advisory
on:
  pull_request:
    branches:
      - master
jobs:
  new-advisory:
    name: New advisory (non-blocking)
    runs-on: ubuntu-latest
    continue-on-error: true
    steps:
      - run: npm ci
`,
    }),
  ),
  /is represented in the portfolio/,
);

// --- C7. SILENT DISAPPEARANCE ------------------------------------------------
expectFailure(
  'audit FAILS when a BLOCKING portfolio entry is deleted from the contract',
  withPortfolio((portfolio) => {
    const index = portfolio.entries.findIndex((entry) => entry.id === 'route-inventory-artifact');
    portfolio.entries.splice(index, 1);
  }),
  /is represented in the portfolio/,
);
expectFailure(
  'audit FAILS when a workflow behind a BLOCKING entry is deleted from the repository',
  withFiles((mutated) => {
    const index = mutated.findIndex((file) => file.path.endsWith('cbw-redirect-family.yml'));
    mutated.splice(index, 1);
  }),
  /points at an existing workflow file/,
);
expectFailure(
  'a deleted workflow is also reported as a vanished BLOCKING entry',
  withFiles((mutated) => {
    const index = mutated.findIndex((file) => file.path.endsWith('cbw-redirect-family.yml'));
    mutated.splice(index, 1);
  }),
  /has not silently vanished from the repository/,
);
expectFailure(
  'audit FAILS when a job id behind a BLOCKING entry is renamed',
  withFiles((mutated) => {
    const index = mutated.findIndex((file) => file.path.endsWith('cbw-go-transition.yml'));
    mutated[index].text = mutated[index].text.replace('  go-transition:\n', '  go-transition-v2:\n');
  }),
  /points at an existing job/,
);

// R2 MEDIUM 1: an unresolved dependency fact must not be removable from the
// frozen snapshot. Deleting the row is exactly what "silently disappears" means.
{
  const stored = clonePortfolio();
  const carrier = stored.entries.find((entry) =>
    (entry.knownGaps ?? []).some((gapEntry) => gapEntry.code === 'DEPENDENCY_UNRESOLVABLE'),
  );
  check('the snapshot really records DEPENDENCY_UNRESOLVABLE facts (the probe is not vacuous)', Boolean(carrier));
  expectFailure(
    'audit FAILS when a DEPENDENCY_UNRESOLVABLE row is deleted from the snapshot',
    withPortfolio((portfolio) => {
      const target = portfolio.entries.find((entry) => entry.id === carrier.id);
      target.knownGaps = target.knownGaps.filter((gapEntry) => gapEntry.code !== 'DEPENDENCY_UNRESOLVABLE');
    }),
    /field "knownGaps" matches the workflow YAML/,
  );
  expectFailure(
    'audit FAILS when a DEPENDENCY_UNRESOLVABLE reason is rewritten in the snapshot',
    withPortfolio((portfolio) => {
      const target = portfolio.entries.find((entry) => entry.id === carrier.id);
      const gapEntry = target.knownGaps.find((candidate) => candidate.code === 'DEPENDENCY_UNRESOLVABLE');
      gapEntry.detail = 'resolved, honestly';
    }),
    /field "knownGaps" matches the workflow YAML/,
  );
}

// --- C8. fail-closed inputs ---------------------------------------------------
expectFailure(
  'audit FAILS on an unparseable workflow file rather than skipping it',
  withFiles((mutated) => mutated.push({ path: '.github/workflows/broken.yml', text: 'name: [unclosed\n  - :' })),
  /every workflow file parses as YAML/,
);
expectFailure('audit FAILS on an empty workflow scan', run({ files: [] }), /workflow inventory is non-empty/);
expectFailure(
  'audit FAILS when a declared dependency no longer exists on disk',
  run({ exists: () => false }),
  /exists on disk/,
);
expectFailure(
  'audit FAILS when a declared npm script is not defined in package.json',
  run({ packageScripts: {} }),
  /is defined in package\.json/,
);
expectFailure(
  'audit FAILS when the recorded totals drift from the derivation',
  withPortfolio((portfolio) => {
    portfolio.totals.BLOCKING += 1;
  }),
  /totals match the derived inventory/,
);
expectFailure(
  'audit FAILS when the unified gate host is removed',
  withPortfolio((portfolio) => {
    for (const entry of portfolio.entries) {
      if (entry.migrationState === 'UNIFIED_GATE_HOST') entry.migrationState = 'LEGACY_EXTERNAL';
    }
  }),
  /exactly one entry is the unified gate host/,
);
expectFailure(
  'audit FAILS when a second entry claims to be the unified gate host',
  withPortfolio((portfolio) => {
    portfolio.entries.find((entry) => entry.id === 'pr-advisory-gate').migrationState = 'UNIFIED_GATE_HOST';
  }),
  /exactly one entry is the unified gate host/,
);
expectFailure(
  'audit FAILS when a PR-running job claims NOT_APPLICABLE migration state',
  withPortfolio((portfolio) => {
    portfolio.entries.find((entry) => entry.id === 'contact-utility').migrationState = 'NOT_APPLICABLE';
  }),
  /does not claim NOT_APPLICABLE while running on PRs/,
);
expectFailure(
  'audit FAILS when stage-2 candidacy is asserted instead of derived',
  withPortfolio((portfolio) => {
    const target = portfolio.entries.find((entry) => entry.stage2MigrationCandidate === false);
    target.stage2MigrationCandidate = true;
  }),
  /stage-2 candidacy is derived, not asserted/,
);

// --- C10. stage-2 candidacy is a statement about today, not a plan -----------
{
  const blocking = { classification: 'BLOCKING', directRequiredSafe: false };
  check(
    'a path-filtered legacy blocking gate IS a stage-2 candidate',
    deriveStage2Candidacy(blocking, 'LEGACY_EXTERNAL').candidate === true,
  );
  check(
    'an always-reporting legacy blocking gate is NOT a stage-2 candidate',
    deriveStage2Candidacy({ classification: 'BLOCKING', directRequiredSafe: true }, 'LEGACY_EXTERNAL').candidate === false,
  );
  check(
    'the unified gate host is NOT a stage-2 candidate',
    deriveStage2Candidacy(blocking, 'UNIFIED_GATE_HOST').candidate === false,
  );
  check(
    'an advisory job is NOT a stage-2 candidate',
    deriveStage2Candidacy({ classification: 'ADVISORY', directRequiredSafe: false }, 'LEGACY_EXTERNAL').candidate === false,
  );
  check(
    'an UNMODELED job is NOT a stage-2 candidate',
    deriveStage2Candidacy({ classification: 'UNMODELED', directRequiredSafe: false }, 'LEGACY_EXTERNAL').candidate === false,
  );
}

// ============================================================================
// G. REGRESSION: SYNCHRONISING THE SNAPSHOT MUST NOT BUY A PASS
// ============================================================================
//
// The pre-remediation model could be talked into a permissive answer by valid
// GitHub syntax it did not understand, and the resulting wrong value could then
// be frozen into the snapshot so that every drift comparison agreed. Each probe
// below therefore (1) mutates the workflow inventory, (2) regenerates a
// portfolio that agrees PERFECTLY with the mutated derivation, and (3) asserts
// the audit STILL refuses to pass — or, where the semantics are now provable,
// that the derived value is the SAFE one.

function syncedPortfolio(mutatedFiles, { repoFiles: probeRepoFiles = repoFiles, readFile: probeReadFile = readFile } = {}) {
  const previous = clonePortfolio();
  const humanByKey = new Map(previous.entries.map((entry) => [`${entry.workflowFile}#${entry.jobId}`, entry]));
  const { entries: freshlyDerived } = deriveInventory({
    files: mutatedFiles,
    packageScripts,
    repoFiles: probeRepoFiles,
    readFile: probeReadFile,
  });
  const entries = freshlyDerived.map((entry, index) => {
    const human = humanByKey.get(`${entry.workflowFile}#${entry.jobId}`);
    const migrationState =
      human?.migrationState ??
      (entry.classification === 'NON_PR' || entry.classification === 'CONDITIONAL_PRODUCTION_ONLY'
        ? 'NOT_APPLICABLE'
        : 'LEGACY_EXTERNAL');
    const candidacy = deriveStage2Candidacy(entry, migrationState);
    return {
      id: human?.id ?? `synced-${index}`,
      ...entry,
      migrationState,
      stage2MigrationCandidate: candidacy.candidate,
      stage2MigrationCandidateReason: candidacy.reason,
    };
  });
  const totals = {};
  for (const value of CLASSIFICATIONS) totals[value] = freshlyDerived.filter((entry) => entry.classification === value).length;
  totals.total = freshlyDerived.length;
  totals.directRequiredSafe = freshlyDerived.filter((entry) => entry.directRequiredSafe).length;
  return { ...previous, totals, entries };
}

function fullySynced(mutate, { repoFiles: probeRepoFiles = repoFiles, readFile: probeReadFile = readFile } = {}) {
  const mutated = files.map((file) => ({ ...file }));
  mutate(mutated);
  const overrides = { repoFiles: probeRepoFiles, readFile: probeReadFile };
  const portfolio = syncedPortfolio(mutated, overrides);
  return {
    files: mutated,
    portfolio,
    // R6: a synchronised snapshot is evaluated against BOTH contracts, because
    // the whole point of the split is that they can disagree — a truthful
    // snapshot of an unresolved dependency is integrity-valid and
    // enforcement-DISQUALIFYING at the same time.
    results: run({ files: mutated, portfolioText: JSON.stringify(portfolio), ...overrides }),
    readiness: evaluateEnforcementReadiness(portfolio),
    derived: deriveInventory({ files: mutated, packageScripts, ...overrides }).entries,
  };
}

// Control: synchronisation removes every snapshot mismatch, and on the truthful
// baseline that means integrity is CLEAN — while enforcement readiness is not.
{
  const control = fullySynced(() => {});
  const controlFailures = control.results.filter((result) => !result.ok);
  check(
    'control: a fully synchronised snapshot has no INTEGRITY failure at all',
    controlFailures.length === 0,
    controlFailures.map((result) => `${result.label}: ${result.detail}`).join(' | '),
  );
  check(
    'R6 control: integrity cleanliness does NOT make the portfolio enforcement-ready',
    control.readiness.enforcementReady === false && control.readiness.unresolvedBlockingRows > 0,
    JSON.stringify({
      enforcementReady: control.readiness.enforcementReady,
      unresolvedBlockingRows: control.readiness.unresolvedBlockingRows,
    }),
  );
}

const DANGEROUS_SYNTAX_PROBES = [
  [
    'a dynamic job-level `if`',
    `name: CBW Dynamic If
on:
  pull_request:
    branches: [master]
jobs:
  dynamic-if:
    name: Dynamic if gate
    if: \${{ vars.ENABLE_GATE }}
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
  ],
  [
    'a dynamic job-level `continue-on-error`',
    `name: CBW Dynamic Soften
on:
  pull_request:
    branches: [master]
jobs:
  dynamic-soften:
    name: Dynamic soften gate
    continue-on-error: \${{ vars.SOFT_FAIL }}
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
  ],
  [
    'an unmodelled branch glob',
    `name: CBW Unmodelled Branch Glob
on:
  pull_request:
    branches: ['mast[er]']
jobs:
  glob:
    name: Unmodelled glob gate
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
  ],
  [
    // R2 HIGH: a `?` with nothing to quantify is valid GitHub syntax this
    // engine will not guess at. Synchronising the snapshot to whatever it
    // guessed must not make the audit pass.
    'a branch glob whose `?` has no preceding character',
    `name: CBW Leading Question Glob
on:
  pull_request:
    branches: ['?master']
jobs:
  leading-question:
    name: Leading question gate
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
  ],
  [
    'a `+` branch glob (valid GitHub syntax, outside the supported model)',
    `name: CBW Plus Glob
on:
  pull_request:
    branches: ['mast+er']
jobs:
  plus-glob:
    name: Plus glob gate
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
  ],
  [
    'a `+` path glob (valid GitHub syntax, outside the supported model)',
    `name: CBW Plus Path Glob
on:
  pull_request:
    branches: [master]
    paths: ['src/data+/**']
jobs:
  plus-path-glob:
    name: Plus path glob gate
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
  ],
  [
    'an expression operator GitHub has but this engine does not model',
    `name: CBW Unmodelled Operator
on:
  pull_request:
    branches: [master]
jobs:
  unmodelled-operator:
    name: Unmodelled operator gate
    if: startsWith(github.event_name, 'pull')
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
  ],
  [
    'a narrowed pull_request activity-type list',
    `name: CBW Narrowed Types
on:
  pull_request:
    branches: [master]
    types: [closed]
jobs:
  narrowed:
    name: Narrowed types gate
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
  ],
  [
    'an unmodelled pull_request filter key',
    `name: CBW Unknown Filter
on:
  pull_request:
    branches: [master]
    tags: ['v*']
jobs:
  unknown-filter:
    name: Unknown filter gate
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
  ],
  // --- R3 HIGH, end to end ---------------------------------------------------
  // The unit probes above prove the EVALUATOR refuses these. These prove the
  // whole audit does: a job-level `if` that hides `github.ref` behind a
  // short-circuit derives UNMODELED, is never BLOCKING, and STILL fails even
  // when the portfolio snapshot has been synchronised perfectly to it.
  [
    'a job-level `if` hiding `github.ref` behind `false &&`',
    `name: CBW Short Circuit And
on:
  pull_request:
    branches: [master]
jobs:
  short-circuit-and:
    name: Short circuit and gate
    if: \${{ false && github.ref == 'refs/heads/master' }}
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
  ],
  [
    'a job-level `if` hiding `github.ref` behind `true ||`',
    `name: CBW Short Circuit Or
on:
  pull_request:
    branches: [master]
jobs:
  short-circuit-or:
    name: Short circuit or gate
    if: \${{ true || github.ref == 'refs/heads/master' }}
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
  ],
  [
    'a job-level `if` hiding an unmodelled operand inside nested parentheses',
    `name: CBW Short Circuit Nested
on:
  pull_request:
    branches: [master]
jobs:
  short-circuit-nested:
    name: Short circuit nested gate
    if: \${{ (false && (github.ref == 'refs/heads/master')) || (true && vars.ENABLE) }}
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
  ],
  [
    'a `continue-on-error` hiding `github.ref` behind a short-circuit',
    `name: CBW Short Circuit Soften
on:
  pull_request:
    branches: [master]
jobs:
  short-circuit-soften:
    name: Short circuit soften gate
    continue-on-error: \${{ true || github.ref == 'refs/heads/master' }}
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
  ],
];

for (const [index, [label, text]] of DANGEROUS_SYNTAX_PROBES.entries()) {
  const probe = fullySynced((mutated) => mutated.push({ path: `.github/workflows/cbw-unmodeled-probe-${index}.yml`, text }));
  expectFailure(
    `regression: ${label} STILL fails the audit after full snapshot synchronisation`,
    probe.results,
    /has PROVABLE pull_request semantics|raises no fail-closed modelling gap/,
  );
  const entry = probe.derived.find((candidate) => candidate.workflowFile === `cbw-unmodeled-probe-${index}.yml`);
  check(`regression: ${label} derives UNMODELED, never BLOCKING`, entry?.classification === 'UNMODELED', String(entry?.classification));
  check(`regression: ${label} is never directRequiredSafe`, entry?.directRequiredSafe === false);
}

// Where the syntax IS now modelled, a synchronised snapshot legitimately passes
// — but the DERIVED value must be the safe/correct one, which is what the old
// model got wrong.
const NOW_MODELLED_PROBES = [
  [
    'a push-only job in a PR-triggered workflow is not a PR gate',
    `name: CBW Push Only
on:
  pull_request:
    branches: [master]
  push:
    branches: [master]
jobs:
  push-only:
    name: Push only job
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
    { classification: 'CONDITIONAL_PRODUCTION_ONLY', directRequiredSafe: false },
  ],
  [
    'an expression-softened job is ADVISORY, not BLOCKING',
    `name: CBW Expression Soften
on:
  pull_request:
    branches: [master]
jobs:
  expression-soften:
    name: Expression softened job
    continue-on-error: \${{ true }}
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
    { classification: 'ADVISORY', directRequiredSafe: false },
  ],
  [
    'an expression-hardened job stays BLOCKING',
    `name: CBW Expression Harden
on:
  pull_request:
    branches: [master]
jobs:
  expression-harden:
    name: Expression hardened job
    continue-on-error: \${{ false }}
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
    { classification: 'BLOCKING', directRequiredSafe: true },
  ],
  [
    // R2 HIGH: `maste?` is `mast` + an optional `e`. It does NOT target master,
    // so the job is NOT a master PR gate. Reading `?` as one-arbitrary-character
    // made this look like a BLOCKING master gate.
    "a `maste?` branch filter does NOT target master",
    `name: CBW Maste Question
on:
  pull_request:
    branches: ['maste?']
jobs:
  maste-question:
    name: Maste question job
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
    { classification: 'NON_PR', directRequiredSafe: false },
  ],
  [
    "a `master?` branch filter DOES target master",
    `name: CBW Master Question
on:
  pull_request:
    branches: ['master?']
jobs:
  master-question:
    name: Master question job
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
    { classification: 'BLOCKING', directRequiredSafe: true },
  ],
  [
    "a `mast*` branch filter targets master",
    `name: CBW Master Star
on:
  pull_request:
    branches: ['mast*']
jobs:
  master-star:
    name: Master star job
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
    { classification: 'BLOCKING', directRequiredSafe: true },
  ],
  [
    // R2 HIGH: `docs/**/*.md` covers `docs/OVERVIEW.md`, so a job whose only input
    // is a root-level docs file IS covered by its own path filter.
    'a `docs/**/*.md` path filter covers a direct docs child',
    `name: CBW Docs Globstar
on:
  pull_request:
    branches: [master]
    paths:
      - 'docs/**/*.md'
jobs:
  docs-globstar:
    name: Docs globstar job
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
    { classification: 'BLOCKING', directRequiredSafe: false },
  ],
  [
    // R2 HIGH: GitHub compares strings case-insensitively, so this job really
    // does run on pull requests and really is a blocking gate.
    'an UPPERCASE event-name guard is still a real PR gate',
    `name: CBW Uppercase Guard
on:
  pull_request:
    branches: [master]
jobs:
  uppercase-guard:
    name: Uppercase guard job
    if: github.event_name == 'PULL_REQUEST'
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
    { classification: 'BLOCKING', directRequiredSafe: true },
  ],
  [
    'an UPPERCASE push-only guard never runs on a PR',
    `name: CBW Uppercase Push
on:
  pull_request:
    branches: [master]
  push:
    branches: [master]
jobs:
  uppercase-push:
    name: Uppercase push job
    if: github.event_name == 'PUSH'
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
    { classification: 'CONDITIONAL_PRODUCTION_ONLY', directRequiredSafe: false },
  ],
  [
    'a scalar pull_request trigger is a real PR gate',
    `name: CBW Scalar Gate
on: pull_request
jobs:
  scalar:
    name: Scalar gate job
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`,
    { classification: 'BLOCKING', directRequiredSafe: true },
  ],
];

for (const [index, [label, text, expected]] of NOW_MODELLED_PROBES.entries()) {
  const path = `.github/workflows/cbw-modelled-probe-${index}.yml`;
  const probe = fullySynced((mutated) => mutated.push({ path, text }));
  const entry = probe.derived.find((candidate) => candidate.workflowFile === path.split('/').pop());
  check(
    `regression: ${label} derives ${expected.classification}`,
    entry?.classification === expected.classification,
    String(entry?.classification),
  );
  check(
    `regression: ${label} derives directRequiredSafe=${expected.directRequiredSafe}`,
    entry?.directRequiredSafe === expected.directRequiredSafe,
    String(entry?.directRequiredSafe),
  );
  const targetPrefix = `discovered job ${entry?.workflowFile}#${entry?.jobId}`;
  check(
    `regression: ${label} raises no fail-closed modelling gap once modelled`,
    !probe.results.some(
      (result) =>
        !result.ok &&
        result.label.startsWith(targetPrefix) &&
        /has PROVABLE pull_request semantics|raises no fail-closed modelling gap/.test(result.label),
    ),
  );
}

// --- R4: a WRAPPER cannot buy a pass by hiding execution semantics -----------
//
// The obligation Codex named: "a fully snapshot-synchronised mutation must still
// fail if an unsupported wrapper silently changes execution semantics". These
// probes use a tracked-but-unreadable script so the hidden EXEC edge, once it is
// no longer hidden, becomes a FAIL-CLOSED gap the snapshot cannot absorb.
const R4_HIDDEN_SCRIPT = 'scripts/ci/cbw-r4-wrapper-hidden-probe.mjs';
const R4_WRAPPER_OVERRIDES = {
  repoFiles: [...repoFiles, R4_HIDDEN_SCRIPT],
  readFile: (path) => (path === R4_HIDDEN_SCRIPT ? null : readFile(path)),
};
const r4WrapperWorkflow = (jobId, command) => `name: CBW Wrapper Probe ${jobId}
on:
  pull_request:
    branches: [master]
jobs:
  ${jobId}:
    name: Wrapper probe ${jobId}
    runs-on: ubuntu-latest
    steps:
      - run: ${command}
`;

const R4_WRAPPER_SYNC_PROBES = [
  // On the previous head the whole `-c` argument was quoted DATA, so the glob
  // inside it expanded to nothing and the executed script vanished from the
  // model entirely — a state a synchronised snapshot then blessed.
  ['a `bash -c` program string hiding a glob', 'bash -c "node scripts/ci/cbw-r4-wrapper-hidden-*.mjs"'],
  ['a `sh -c` program string hiding a glob', "sh -c 'node scripts/ci/cbw-r4-wrapper-hidden-*.mjs'"],
];
for (const [index, [label, command]] of R4_WRAPPER_SYNC_PROBES.entries()) {
  const jobId = `r4-wrapper-sync-${index}`;
  const path = `.github/workflows/cbw-r4-wrapper-sync-${index}.yml`;
  const probe = fullySynced(
    (mutated) => mutated.push({ path, text: r4WrapperWorkflow(jobId, command) }),
    R4_WRAPPER_OVERRIDES,
  );
  const entry = probe.derived.find((candidate) => candidate.workflowFile === path.split('/').pop());
  check(
    `R4 regression: ${label} exposes the hidden EXEC edge`,
    (entry?.dependencies?.executed ?? []).includes(R4_HIDDEN_SCRIPT),
    JSON.stringify(entry?.dependencies ?? null),
  );
  expectFailure(
    `R4 regression: ${label} STILL fails the audit after full snapshot synchronisation`,
    probe.results,
    /raises no fail-closed modelling gap/,
  );
}

// And an UNSUPPORTED wrapper form can never present a clean bill of health: the
// synchronised snapshot carries the DEPENDENCY_UNRESOLVABLE fact itself.
const R4_UNSUPPORTED_WRAPPER_SYNC_PROBES = [
  ['an unsupported `env` flag', "env -i find src/data -name '*.ts'"],
  ['`bash` options before `-c`', 'bash -euo pipefail -c "find src/data -name \'*.ts\'"'],
  ['a `bash -c` program held in a variable', 'bash -c "$CBW_COMMAND"'],
  ['an unsupported `command` option', "command -x find src/data -name '*.ts'"],
];
for (const [index, [label, command]] of R4_UNSUPPORTED_WRAPPER_SYNC_PROBES.entries()) {
  const jobId = `r4-unsupported-wrapper-${index}`;
  const path = `.github/workflows/cbw-r4-unsupported-wrapper-${index}.yml`;
  const probe = fullySynced((mutated) => mutated.push({ path, text: r4WrapperWorkflow(jobId, command) }));
  const entry = probe.derived.find((candidate) => candidate.workflowFile === path.split('/').pop());
  check(
    `R4 regression: ${label} is recorded as DEPENDENCY_UNRESOLVABLE in the synchronised snapshot`,
    (entry?.knownGaps ?? []).some(
      (gapEntry) => gapEntry.code === 'DEPENDENCY_UNRESOLVABLE' && /wrapper|-c/.test(gapEntry.detail),
    ),
    JSON.stringify(entry?.knownGaps ?? null),
  );
}

// --- R6 DISCOVERY C/F: a NEW unsupported dependency in a BLOCKING job --------
// R5 made every unresolved dependency an absolute audit failure. R6 splits the
// obligation, and each probe below proves BOTH halves at once on the SAME
// mutation: the workflow is a blocking PR gate, so a truthfully synchronised
// snapshot is INTEGRITY-VALID (recording the unresolved fact is a true
// statement), while ENFORCEMENT READINESS must fail because that unresolved
// dependency sits inside blocking authority. Integrity is never allowed to
// launder the debt, and readiness is never allowed to ignore it.
const R6_BLOCKING_UNRESOLVED_SYNC_PROBES = [
  ['`env -i find`', "env -i find src/data -name '*.ts'"],
  ['a dynamic `bash -c` program', 'bash -c "$CBW_COMMAND"'],
  ['the unsupported `sudo` wrapper', "sudo find src/data -name '*.ts'"],
  ['unsupported process substitution', "diff <(find src/data -name '*.ts') scripts/beta.mjs"],
  // DISCOVERY F: the R6 M2 defect itself, carried end to end through a real
  // blocking workflow entry rather than only through the tokenizer.
  ['an arbitrary `/custom/bash` executable', `/custom/bash -c "find src/data -name '*.ts'"`],
  ['an arbitrary `/evil/find` executable', `/evil/find src/data -name '*.ts'`],
];
for (const [index, [label, command]] of R6_BLOCKING_UNRESOLVED_SYNC_PROBES.entries()) {
  const jobId = `r6-blocking-unresolved-${index}`;
  const path = `.github/workflows/cbw-r6-blocking-unresolved-${index}.yml`;
  const probe = fullySynced((mutated) => mutated.push({ path, text: r4WrapperWorkflow(jobId, command) }));
  const workflowFile = path.split('/').pop();
  const entry = probe.derived.find((candidate) => candidate.workflowFile === workflowFile);
  check(
    `R6 DISCOVERY C: ${label} emits DEPENDENCY_UNRESOLVABLE`,
    (entry?.knownGaps ?? []).some((gapEntry) => gapEntry.code === 'DEPENDENCY_UNRESOLVABLE'),
    JSON.stringify(entry?.knownGaps ?? null),
  );
  check(
    `R6 DISCOVERY C: ${label} lands in a BLOCKING entry (the probe is not vacuous)`,
    entry?.classification === 'BLOCKING',
    String(entry?.classification),
  );
  check(
    `R6 DISCOVERY C: ${label} PASSES integrity once the snapshot records it truthfully`,
    probe.results.every((result) => result.ok),
    JSON.stringify(probe.results.filter((result) => !result.ok).map((result) => `${result.label}: ${result.detail}`)),
  );
  check(
    `R6 DISCOVERY C: ${label} makes enforcement readiness FAIL on that same truthful snapshot`,
    probe.readiness.enforcementReady === false &&
      probe.readiness.rows.some((row) => row.workflowFile === workflowFile && row.jobId === jobId),
    JSON.stringify({
      enforcementReady: probe.readiness.enforcementReady,
      rows: probe.readiness.rows.filter((row) => row.workflowFile === workflowFile).length,
    }),
  );
}

// --- R6 DISCOVERY B: an unresolved row may never silently disappear ----------
// Integrity treats unresolved facts as DATA, so this is the check that keeps
// that from becoming a loophole: delete, reword or invent one row on an
// otherwise perfectly synchronised snapshot and integrity must FAIL by name.
{
  const workflowFile = 'cbw-r6-integrity-fidelity.yml';
  const jobId = 'r6-integrity-fidelity';
  const path = `.github/workflows/${workflowFile}`;
  const command = "env -i find src/data -name '*.ts'";
  const mutateFiles = (mutated) => mutated.push({ path, text: r4WrapperWorkflow(jobId, command) });
  const baseline = fullySynced(mutateFiles);
  check(
    'R6 DISCOVERY B baseline: the synchronised snapshot passes integrity before mutation',
    baseline.results.every((result) => result.ok),
    JSON.stringify(baseline.results.filter((result) => !result.ok).map((result) => result.label)),
  );

  const mutateSnapshot = (mutate) => {
    const mutatedFiles = files.map((file) => ({ ...file }));
    mutateFiles(mutatedFiles);
    const portfolio = syncedPortfolio(mutatedFiles);
    const target = portfolio.entries.find(
      (candidate) => candidate.workflowFile === workflowFile && candidate.jobId === jobId,
    );
    mutate(target);
    return run({ files: mutatedFiles, portfolioText: JSON.stringify(portfolio) });
  };

  expectFailure(
    'R6 DISCOVERY B: DELETING an unresolved row from the snapshot fails integrity',
    mutateSnapshot((target) => {
      target.knownGaps = target.knownGaps.filter((gapEntry) => gapEntry.code !== 'DEPENDENCY_UNRESOLVABLE');
    }),
    /records every live unresolved dependency fact/,
  );
  expectFailure(
    'R6 DISCOVERY B: REWORDING an unresolved row fails integrity',
    mutateSnapshot((target) => {
      const gapEntry = target.knownGaps.find((candidate) => candidate.code === 'DEPENDENCY_UNRESOLVABLE');
      gapEntry.detail = `${gapEntry.detail} (reworded)`;
    }),
    /records every live unresolved dependency fact/,
  );
  expectFailure(
    'R6 DISCOVERY B: INVENTING an unresolved row the derivation never produced fails integrity',
    mutateSnapshot((target) => {
      target.knownGaps.push({ code: 'DEPENDENCY_UNRESOLVABLE', detail: 'invented.mjs :: invented reason' });
    }),
    /records no unresolved dependency fact the derivation does not produce/,
  );
  expectFailure(
    'R6 DISCOVERY B: DUPLICATING an unresolved row changes the recorded row count and fails integrity',
    mutateSnapshot((target) => {
      const gapEntry = target.knownGaps.find((candidate) => candidate.code === 'DEPENDENCY_UNRESOLVABLE');
      target.knownGaps.push({ ...gapEntry });
    }),
    /unresolved dependency row COUNT matches the derivation/,
  );
}

// --- R6 DISCOVERY D/E: readiness scope is exact -------------------------------
// D: a synthetic BLOCKING entry with NO unresolved dependency is enforcement-
//    ready, which proves the readiness verdict is capable of passing and is not
//    a constant `false`.
// E: an ADVISORY entry's unresolved dependencies are reported as OUTSIDE
//    blocking authority and never veto blocking-enforcement readiness.
{
  const blockingEntry = (overrides = {}) => ({
    id: 'synthetic-blocking',
    workflowFile: 'cbw-synthetic.yml',
    jobId: 'synthetic',
    checkContext: 'Synthetic gate',
    classification: 'BLOCKING',
    migrationState: 'LEGACY_EXTERNAL',
    stage2MigrationCandidate: true,
    knownGaps: [],
    ...overrides,
  });

  const resolved = evaluateEnforcementReadiness({ entries: [blockingEntry()] });
  check(
    'R6 DISCOVERY D: a synthetic BLOCKING entry with every dependency resolved IS enforcement-ready',
    resolved.enforcementReady === true &&
      resolved.unresolvedBlockingRows === 0 &&
      resolved.affectedBlockingEntries === 0 &&
      resolved.blockingAuthorityEntries === 1 &&
      resolved.blockers.length === 0,
    JSON.stringify(resolved),
  );

  const stillCarryingNonBlockingGaps = evaluateEnforcementReadiness({
    entries: [
      blockingEntry({
        knownGaps: [
          { code: 'TRIGGER_GAP_SCRIPT', detail: 'scripts/alpha.mjs' },
          { code: 'PATH_FILTERED_NOT_ALWAYS_REPORTING', detail: 'path filter' },
        ],
      }),
    ],
  });
  check(
    'R6 DISCOVERY D: only ENFORCEMENT_BLOCKING_GAP_CODES can block readiness',
    stillCarryingNonBlockingGaps.enforcementReady === true,
    JSON.stringify(stillCarryingNonBlockingGaps.blockers),
  );

  const oneUnresolved = evaluateEnforcementReadiness({
    entries: [
      blockingEntry({
        knownGaps: [{ code: 'DEPENDENCY_UNRESOLVABLE', detail: 'scripts/alpha.mjs :: computed input' }],
      }),
    ],
  });
  check(
    'R6 DISCOVERY D: one unresolved row inside blocking authority is enough to fail readiness',
    oneUnresolved.enforcementReady === false &&
      oneUnresolved.unresolvedBlockingRows === 1 &&
      oneUnresolved.affectedBlockingEntries === 1 &&
      oneUnresolved.reasonSummary[0]?.reason === 'computed input' &&
      oneUnresolved.originSummary[0]?.origin === 'scripts/alpha.mjs',
    JSON.stringify(oneUnresolved),
  );

  const ADVISORY_ONLY_CLASSIFICATIONS = ['ADVISORY', 'NON_PR', 'CONDITIONAL_PRODUCTION_ONLY'];
  for (const classification of ADVISORY_ONLY_CLASSIFICATIONS) {
    const readiness = evaluateEnforcementReadiness({
      entries: [
        blockingEntry(),
        {
          id: `synthetic-${classification.toLowerCase()}`,
          workflowFile: 'cbw-synthetic-other.yml',
          jobId: 'other',
          checkContext: 'Other',
          classification,
          migrationState: classification === 'ADVISORY' ? 'LEGACY_EXTERNAL' : 'NOT_APPLICABLE',
          stage2MigrationCandidate: false,
          knownGaps: [{ code: 'DEPENDENCY_UNRESOLVABLE', detail: 'scripts/other.mjs :: computed input' }],
        },
      ],
    });
    check(
      `R6 DISCOVERY E: an unresolved dependency in a ${classification} entry does NOT fail blocking-enforcement readiness`,
      readiness.enforcementReady === true &&
        readiness.unresolvedBlockingRows === 0 &&
        readiness.outsideBlockingAuthority.unresolvedRows === 1 &&
        readiness.outsideBlockingAuthority.byClassification[classification] === 1,
      JSON.stringify(readiness),
    );
    check(
      `R6 DISCOVERY E: a ${classification} entry holds no blocking authority`,
      participatesInBlockingAuthority({ classification }).participates === false,
      JSON.stringify(participatesInBlockingAuthority({ classification })),
    );
  }

  // An UNMODELED entry can never be shown to sit outside blocking authority, so
  // readiness fails closed on it rather than quietly excusing it.
  const unmodeled = evaluateEnforcementReadiness({
    entries: [
      blockingEntry({
        id: 'synthetic-unmodeled',
        classification: 'UNMODELED',
        stage2MigrationCandidate: false,
        knownGaps: [{ code: 'DEPENDENCY_UNRESOLVABLE', detail: 'scripts/alpha.mjs :: computed input' }],
      }),
    ],
  });
  check(
    'R6 DISCOVERY E: an UNMODELED entry fails closed INTO blocking authority',
    unmodeled.enforcementReady === false && unmodeled.unresolvedBlockingRows === 1,
    JSON.stringify(unmodeled),
  );

  // Fail closed on a portfolio that cannot be read at all.
  for (const [label, value] of [
    ['null', null],
    ['a non-object', 42],
    ['an object with no entries array', {}],
    ['an empty portfolio', { entries: [] }],
  ]) {
    const readiness = evaluateEnforcementReadiness(value);
    check(
      `R6 readiness fails closed on ${label}`,
      readiness.enforcementReady === false && readiness.blockers.length > 0,
      JSON.stringify(readiness),
    );
  }
}

const R5_INVALID_WRAPPER_CONTEXT_PROBES = [
  ['`builtin find`', "builtin find src/data -name '*.ts'"],
  ['`env FOO=x command find`', "env FOO=x command find src/data -name '*.ts'"],
  ['`nohup command find`', "nohup command find src/data -name '*.ts'"],
];
for (const [index, [label, command]] of R5_INVALID_WRAPPER_CONTEXT_PROBES.entries()) {
  const jobId = `r5-invalid-wrapper-${index}`;
  const path = `.github/workflows/cbw-r5-invalid-wrapper-${index}.yml`;
  const probe = fullySynced((mutated) => mutated.push({ path, text: r4WrapperWorkflow(jobId, command) }));
  const entry = probe.derived.find((candidate) => candidate.workflowFile === path.split('/').pop());
  check(
    `R5 L2: ${label} invents no resolved find dependency`,
    !(entry?.dependencies?.readInputs ?? []).includes('src/data/direct.ts') &&
      !(entry?.dependencies?.readInputs ?? []).includes('src/data/nested/deep.ts'),
    JSON.stringify(entry?.dependencies ?? null),
  );
  check(
    `R5 L2/R6: ${label} is recorded unresolved and disqualifies enforcement readiness after synchronisation`,
    (entry?.knownGaps ?? []).some((gapEntry) => gapEntry.code === 'DEPENDENCY_UNRESOLVABLE') &&
      probe.readiness.enforcementReady === false &&
      probe.readiness.rows.some((row) => row.workflowFile === entry?.workflowFile && row.jobId === entry?.jobId),
    JSON.stringify({ gaps: entry?.knownGaps ?? null, blockers: probe.readiness.blockers }),
  );
}

// Supported shell-model boundary: command positions/separators, literal words
// with quote provenance, the closed find subset, command/exec/nohup/time/env,
// and literal sh-family `-c` programs. Anything else that can conceal execution
// (here: `sudo`) must be DEPENDENCY_UNRESOLVABLE, never another parser feature.
{
  const boundary = r3Closure("sudo find src/data -name '*.ts'");
  check(
    'R5 BOUNDARY: the supported shell subset is a closed machine-readable contract',
    JSON.stringify(SUPPORTED_SHELL_MODEL.wrappers) === JSON.stringify(['command', 'exec', 'nohup', 'time', 'env']) &&
      JSON.stringify(SUPPORTED_SHELL_MODEL.shellCCommands) === JSON.stringify(['sh', 'bash', 'dash', 'ksh', 'zsh']) &&
      JSON.stringify(SUPPORTED_SHELL_MODEL.pathQualifiedCommandPaths) ===
        JSON.stringify(
          [
            '/bin/bash',
            '/bin/dash',
            '/bin/env',
            '/bin/find',
            '/bin/ksh',
            '/bin/nohup',
            '/bin/sh',
            '/bin/zsh',
            '/usr/bin/bash',
            '/usr/bin/dash',
            '/usr/bin/env',
            '/usr/bin/find',
            '/usr/bin/ksh',
            '/usr/bin/nohup',
            '/usr/bin/sh',
            '/usr/bin/zsh',
          ].sort(),
        ) &&
      SUPPORTED_SHELL_MODEL.unsupportedPolicy === 'DEPENDENCY_UNRESOLVABLE',
    JSON.stringify(SUPPORTED_SHELL_MODEL),
  );
  check(
    'R5 BOUNDARY: an execution wrapper outside the stated shell subset is unresolved and resolves no dependency',
    boundary.unresolvable.some((detail) => /outside the supported model/.test(detail)) &&
      boundary.readInputs.length === 0,
    JSON.stringify(boundary),
  );
}

// A snapshot that has been synchronised to a WRONG derived value for a real
// entry is still caught, because the audit re-derives rather than trusting.
expectFailure(
  'regression: hand-editing a stored classification cannot survive re-derivation',
  withPortfolio((portfolio) => {
    const target = portfolio.entries.find((entry) => entry.classification === 'ADVISORY');
    target.classification = 'BLOCKING';
    target.directRequiredSafe = false;
  }),
  /field "classification" matches the workflow YAML/,
);

if (failures.length) {
  console.error(`CBW MASTER BLOCKING PORTFOLIO DISCOVERY: FAIL (${failures.length}/${checks})`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`CBW MASTER BLOCKING PORTFOLIO DISCOVERY: PASS (${checks}/${checks})`);
}
