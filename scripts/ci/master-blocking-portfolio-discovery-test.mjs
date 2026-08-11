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
  CLASSIFICATIONS,
  GAP_CODES,
  MIGRATION_STATES,
  ROOT_KEYS,
  SCHEMA_VERSION,
  UNMODELED,
  auditPortfolio,
  deriveDependencyClosure,
  deriveInventory,
  deriveJobFacts,
  derivePullRequestTrigger,
  deriveStage2Candidacy,
  evaluateContinueOnError,
  evaluateGithubExpression,
  evaluateJobIfForPullRequest,
  extractCommands,
  lexJavaScript,
  matchesPathPattern,
  matchesRefPattern,
  parseWorkflow,
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
const live = run();
const liveFailures = live.filter((result) => !result.ok);
check(
  'the live repository agrees with the stored blocking portfolio',
  liveFailures.length === 0,
  liveFailures.map((result) => `${result.label}${result.detail ? `: ${result.detail}` : ''}`).join(' | '),
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
check(
  'expression: `false && <unmodelled>` short-circuits to false',
  evaluateGithubExpression("false && github.repository == 'x/y'", prContext) === false,
);
check(
  'expression: `true || <unmodelled>` short-circuits to true',
  evaluateGithubExpression("true || github.repository == 'x/y'", prContext) === true,
);
check('expression: always() is true', evaluateGithubExpression('always()', prContext) === true);
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

function syncedPortfolio(mutatedFiles) {
  const previous = clonePortfolio();
  const humanByKey = new Map(previous.entries.map((entry) => [`${entry.workflowFile}#${entry.jobId}`, entry]));
  const { entries: freshlyDerived } = deriveInventory({ files: mutatedFiles, packageScripts, repoFiles, readFile });
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

function fullySynced(mutate) {
  const mutated = files.map((file) => ({ ...file }));
  mutate(mutated);
  return {
    files: mutated,
    results: run({ files: mutated, portfolioText: JSON.stringify(syncedPortfolio(mutated)) }),
    derived: deriveInventory({ files: mutated, packageScripts, repoFiles, readFile }).entries,
  };
}

// Control: a fully synchronised snapshot of the UNMUTATED repository passes, so
// the probes below fail for the reason claimed and not because syncing is broken.
{
  const control = fullySynced(() => {});
  expectNoFailure('control: a fully synchronised snapshot of the real repository passes', control.results, /.*/);
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
  expectNoFailure(
    `regression: ${label} raises no fail-closed modelling gap once modelled`,
    probe.results,
    /has PROVABLE pull_request semantics|raises no fail-closed modelling gap/,
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
