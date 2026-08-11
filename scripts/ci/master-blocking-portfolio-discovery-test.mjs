#!/usr/bin/env node
// Deterministic discovery/coverage test for the master blocking-portfolio
// contract (issue #366, Stage 2 / S2-02).
//
// Two obligations, both offline:
//
//   A. LIVE — the real repository inventory agrees with
//      scripts/ci/master-blocking-portfolio.json today. A drifted job name, a
//      flipped continue-on-error, a widened path filter or a brand-new
//      blocking-capable PR workflow fails here.
//
//   B. MUTATION — the audit is proved CAPABLE of failing. A coverage test that
//      silently matches nothing looks exactly like a coverage test that passes,
//      so every rule is exercised against a deliberately mutated inventory or a
//      deliberately mutated portfolio and must produce a NAMED failure. The real
//      files are never touched; every mutation is applied to an in-memory copy.
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
  auditPortfolio,
  deriveInventory,
  deriveJobFacts,
  deriveStage2Candidacy,
  evaluateJobIfForPullRequest,
  extractCommands,
  matchesPathPattern,
  parseWorkflow,
} from './master-blocking-portfolio-contract.mjs';
import { loadWorkflowFiles, loadPackageScripts, PORTFOLIO_PATH } from './master-blocking-portfolio-validator.mjs';

const ROOT = resolve(process.cwd());

let checks = 0;
const failures = [];
function check(label, ok, detail = '') {
  checks += 1;
  if (!ok) failures.push(detail ? `${label}: ${detail}` : label);
}

const files = loadWorkflowFiles();
const packageScripts = loadPackageScripts();
const portfolioText = readFileSync(resolve(ROOT, PORTFOLIO_PATH), 'utf8');
const exists = (path) => existsSync(resolve(ROOT, path));

const run = (overrides = {}) =>
  auditPortfolio({
    portfolioText,
    files,
    packageScripts,
    exists,
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

const { entries: derived, parseErrors } = deriveInventory({ files, packageScripts });
check('every tracked workflow parses', parseErrors.length === 0, JSON.stringify(parseErrors));
check('every discovered job carries a classification', derived.every((entry) => CLASSIFICATIONS.includes(entry.classification)));
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

check('evaluateJobIfForPullRequest: absent if is RUNNABLE', evaluateJobIfForPullRequest(undefined) === 'RUNNABLE');
check(
  'evaluateJobIfForPullRequest: the PR-only guard is RUNNABLE',
  evaluateJobIfForPullRequest("github.event_name == 'pull_request'") === 'RUNNABLE',
);
check(
  'evaluateJobIfForPullRequest: the non-PR guard NEVER runs on a PR',
  evaluateJobIfForPullRequest("github.event_name != 'pull_request'") === 'NEVER',
);
for (const expression of ['github.ref == \'refs/heads/master\'', 'always()', "github.event_name == 'push'", '']) {
  check(
    `evaluateJobIfForPullRequest: unmodelled if ${JSON.stringify(expression)} is UNKNOWN (fail closed)`,
    evaluateJobIfForPullRequest(expression) === 'UNKNOWN',
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
expectFailure('audit FAILS on a portfolio with no entries array', run({ portfolioText: '{"schemaVersion":1}' }), /entries array/);
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
    'a new blocking job added to an EXISTING workflow file',
    null,
    null,
  ],
];
for (const [label, path, text] of NEW_BLOCKING_PROBES.slice(0, 2)) {
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

// --- C9. an unmodelled job-level `if` is fail-closed, not silently allowed ----
{
  const probeDoc = parseWorkflow(`name: Probe
on:
  pull_request:
    branches:
      - master
jobs:
  probe:
    name: Probe job
    if: github.actor != 'dependabot[bot]'
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
`);
  const facts = deriveJobFacts({
    workflowFile: 'probe.yml',
    workflowDoc: probeDoc,
    jobId: 'probe',
    packageScripts,
  });
  check('an unmodelled job-level if still classifies BLOCKING (fail closed)', facts.classification === 'BLOCKING');
  check(
    'an unmodelled job-level if raises UNRECOGNIZED_JOB_IF',
    facts.knownGaps.some((gap) => gap.code === 'UNRECOGNIZED_JOB_IF'),
    JSON.stringify(facts.knownGaps),
  );
}

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
}

if (failures.length) {
  console.error(`CBW MASTER BLOCKING PORTFOLIO DISCOVERY: FAIL (${failures.length}/${checks})`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`CBW MASTER BLOCKING PORTFOLIO DISCOVERY: PASS (${checks}/${checks})`);
}
