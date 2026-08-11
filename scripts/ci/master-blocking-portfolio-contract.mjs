#!/usr/bin/env node
// Blocking-portfolio contract engine for product branch `master` (issue #366,
// Stage 2 / S2-02).
//
// PURPOSE
// -------
// S2-01 delivered ONE stable, always-reporting required context
// ("Master required gate"). Before any further gate logic can be unified into
// it, the repository needs a machine-readable, drift-proof statement of WHICH
// checks exist today, which of them can actually fail a pull request, and which
// of them could legitimately become a directly-required GitHub context.
//
// This module is that statement's engine. It is a PURE text-in function set so
// that scripts/ci/master-blocking-portfolio-discovery-test.mjs can feed it
// deliberately mutated workflow inventories and prove each rule really fails.
// The validator (scripts/ci/master-blocking-portfolio-validator.mjs) feeds it
// the real files.
//
// DESIGN RULES
// ------------
//   * Nothing is classified by FILENAME. `cbw-noindex-product-preview-advisory.yml`
//     and `cbw-pr-advisory-gate.yml` both say "advisory" and both are
//     BLOCKING-capable; `cbw-route-inventory-artifact.yml` says neither "gate"
//     nor "hard" and is a hard gate. Classification is derived from YAML
//     semantics only: PR trigger, target branches, job-level `if`, job-level
//     `continue-on-error`.
//   * Every field of every portfolio entry that CAN be derived from repository
//     truth IS derived and compared byte-for-byte against the stored snapshot.
//     The stored file is therefore a frozen assertion, not a parallel opinion:
//     any workflow edit that changes semantics makes derivation disagree with
//     the snapshot and fails the validator until a human re-classifies.
//   * Fail closed on anything unrecognised. An unparseable workflow, an
//     unmodelled job-level `if`, a `paths-ignore` filter, an unknown
//     classification value or a malformed portfolio file is a FAILURE, never a
//     skipped check.
//   * This module NEVER migrates, weakens or repairs anything. Trigger gaps are
//     recorded as facts; closing them is a later, explicit task.

import yaml from 'js-yaml';

// --- closed vocabularies ------------------------------------------------------

export const CLASSIFICATIONS = Object.freeze([
  'BLOCKING',
  'ADVISORY',
  'CONDITIONAL_PRODUCTION_ONLY',
  'NON_PR',
]);

export const MIGRATION_STATES = Object.freeze([
  // Every legacy check starts here. It reports independently of the unified
  // required gate and has not been migrated into it.
  'LEGACY_EXTERNAL',
  // The single S2-01 unified gate itself. Not "migrated" — it is the target.
  'UNIFIED_GATE_HOST',
  // Cannot participate in a PR-required portfolio at all (never runs on PRs).
  'NOT_APPLICABLE',
]);

export const GAP_CODES = Object.freeze([
  // Reporting-availability gaps
  'PATH_FILTERED_NOT_ALWAYS_REPORTING',
  'NO_BRANCH_FILTER',
  // Trigger / self-bypass gaps
  'TRIGGER_GAP_OWN_WORKFLOW_FILE',
  'TRIGGER_GAP_SCRIPT',
  'TRIGGER_GAP_SHARED_CONFIG',
  'TRIGGER_COVERAGE_UNRESOLVABLE',
  // Naming gaps — a human reading the repo is actively misled
  'MISLEADING_ADVISORY_FILENAME',
  'MISLEADING_NON_BLOCKING_JOB_NAME',
  // Fail-closed catch-alls
  'UNRECOGNIZED_JOB_IF',
]);

// Config files that every `npm`-running job materially depends on but that no
// path filter in this repository currently lists. Enumerated here so the audit
// derives the SAME set for every job instead of relying on per-entry prose.
export const SHARED_CONFIG_ALWAYS = Object.freeze(['package.json', 'package-lock.json']);
export const SHARED_CONFIG_BUILD = Object.freeze(['astro.config.mjs', 'tsconfig.json']);

// Command lines that count as "a command this job executes". Prefix-matched at
// line start after backslash-continuations are folded, so a multi-line `tsc`
// invocation is captured whole rather than truncated at the first line.
const COMMAND_PREFIXES = Object.freeze(['npm ', 'npx ', 'node ', 'node_modules/.bin/']);

const SCRIPT_PATH_RE = /(?:^|[\s'"=])((?:scripts|tools|server)\/[A-Za-z0-9._/-]+\.(?:mjs|cjs|js|ts))/g;

// --- small deterministic helpers ---------------------------------------------

export function parseWorkflow(text) {
  // `on:` is YAML 1.1 truthy; CORE_SCHEMA keeps it as the string key `on`.
  return yaml.load(text, { schema: yaml.CORE_SCHEMA });
}

// GitHub path-filter glob -> anchored RegExp. `**` crosses `/`, `*` does not.
export function matchesPathPattern(pattern, path) {
  const source = String(pattern ?? '');
  let out = '';
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '*') {
      if (source[i + 1] === '*') {
        out += '.*';
        i += 1;
      } else {
        out += '[^/]*';
      }
      continue;
    }
    if (ch === '?') {
      out += '[^/]';
      continue;
    }
    out += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${out}$`).test(String(path ?? ''));
}

// Folds `\`-continuations, then collects every command line by prefix.
// Order-preserving, first-occurrence deduped.
export function extractCommands(job) {
  const seen = new Set();
  const commands = [];
  for (const step of Array.isArray(job?.steps) ? job.steps : []) {
    if (typeof step?.run !== 'string') continue;
    // Collapse `\`-continuations (and the indentation around them) so a
    // multi-line invocation is captured as ONE canonical command line.
    const folded = step.run.replace(/[ \t]*\\\r?\n[ \t]*/g, ' ');
    for (const rawLine of folded.split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;
      if (!COMMAND_PREFIXES.some((prefix) => line.startsWith(prefix))) continue;
      if (seen.has(line)) continue;
      seen.add(line);
      commands.push(line);
    }
  }
  return commands;
}

// `npm run foo -- --bar` / `npm run foo` -> 'foo'.
export function extractNpmScriptNames(commands) {
  const names = [];
  for (const command of commands) {
    const match = /^npm run ([A-Za-z0-9:._-]+)/.exec(command);
    if (match && !names.includes(match[1])) names.push(match[1]);
    // `a || b` fallbacks carry a second invocation on the same line.
    for (const alt of String(command).matchAll(/\|\|\s*npm run ([A-Za-z0-9:._-]+)/g)) {
      if (!names.includes(alt[1])) names.push(alt[1]);
    }
  }
  return names;
}

function collectScriptPaths(text, into) {
  for (const match of String(text ?? '').matchAll(SCRIPT_PATH_RE)) into.add(match[1]);
}

// Repository script files this job really executes: those named directly in a
// command, plus those reached through one level of `npm run <name>` indirection
// resolved via package.json. Without the indirection, `npm run portal:contracts:test`
// would look dependency-free and its trigger gap would go unrecorded.
export function deriveScriptDependencies(commands, packageScripts) {
  const paths = new Set();
  for (const command of commands) collectScriptPaths(command, paths);
  for (const name of extractNpmScriptNames(commands)) {
    const definition = packageScripts?.[name];
    if (typeof definition === 'string') collectScriptPaths(definition, paths);
  }
  return [...paths].sort();
}

export function deriveSharedConfigDependencies(commands) {
  const usesNpm = commands.some((command) => command.startsWith('npm ') || command.startsWith('npx '));
  const builds = commands.some((command) => command.includes('npm run build'));
  const typechecks = commands.some((command) => command.includes('tsc'));
  const out = [];
  if (usesNpm) out.push(...SHARED_CONFIG_ALWAYS);
  if (builds) out.push('astro.config.mjs');
  if (builds || typechecks) out.push('tsconfig.json');
  return [...new Set(out)].sort();
}

// Only two job-level `if` shapes are modelled. Anything else is UNKNOWN and is
// treated as PR-runnable (fail closed: it must be explicitly classified) while
// also raising UNRECOGNIZED_JOB_IF.
export function evaluateJobIfForPullRequest(expression) {
  if (expression === undefined || expression === null) return 'RUNNABLE';
  const text = String(expression).trim();
  if (text === "github.event_name == 'pull_request'") return 'RUNNABLE';
  if (text === "github.event_name != 'pull_request'") return 'NEVER';
  return 'UNKNOWN';
}

// --- per-job derivation -------------------------------------------------------

export function deriveJobFacts({ workflowFile, workflowDoc, jobId, packageScripts }) {
  const job = workflowDoc?.jobs?.[jobId];
  const triggers = workflowDoc?.on ?? workflowDoc?.true ?? {};
  const hasPullRequest =
    triggers && typeof triggers === 'object' && Object.prototype.hasOwnProperty.call(triggers, 'pull_request');
  const pr = hasPullRequest ? triggers.pull_request ?? {} : null;
  const branches = Array.isArray(pr?.branches) ? pr.branches : null;
  // No `branches` key means EVERY target branch, master included.
  const targetsMaster = hasPullRequest ? branches === null || branches.includes('master') : false;
  const paths = Array.isArray(pr?.paths) ? pr.paths : null;
  const pathsIgnore = Array.isArray(pr?.['paths-ignore']) ? pr['paths-ignore'] : null;
  const pathFiltered = Boolean(paths || pathsIgnore);

  const jobIf = Object.prototype.hasOwnProperty.call(job ?? {}, 'if') ? String(job.if) : null;
  const ifState = evaluateJobIfForPullRequest(job?.if);
  const jobContinueOnError = job?.['continue-on-error'] === true;

  let classification;
  if (!hasPullRequest || !targetsMaster) classification = 'NON_PR';
  else if (ifState === 'NEVER') classification = 'CONDITIONAL_PRODUCTION_ONLY';
  else if (jobContinueOnError) classification = 'ADVISORY';
  else classification = 'BLOCKING';

  const steps = Array.isArray(job?.steps) ? job.steps : [];
  const softenedSteps = steps.filter((step) => step?.['continue-on-error'] === true).length;
  const commands = extractCommands(job);
  const scripts = deriveScriptDependencies(commands, packageScripts);
  const sharedConfig = deriveSharedConfigDependencies(commands);
  const npmScripts = extractNpmScriptNames(commands);

  // Path-filtered => the context is NOT reported on every PR to master, so a
  // branch-protection rule naming it deadlocks on "Expected — Waiting for
  // status to be reported" for any PR that touches none of its paths.
  const directRequiredSafe = classification === 'BLOCKING' && !pathFiltered;

  // --- trigger coverage -------------------------------------------------------
  const ownWorkflowPath = `.github/workflows/${workflowFile}`;
  const covers = (candidate) => {
    if (!pathFiltered) return true;
    if (pathsIgnore) return null; // unresolvable by this model — fail closed
    return paths.some((pattern) => matchesPathPattern(pattern, candidate));
  };

  const coveredInputs = [];
  const uncoveredInputs = [];
  const unresolvableInputs = [];
  const classify = (candidate) => {
    const result = covers(candidate);
    if (result === null) unresolvableInputs.push(candidate);
    else if (result) coveredInputs.push(candidate);
    else uncoveredInputs.push(candidate);
  };
  for (const candidate of [...scripts, ...sharedConfig]) classify(candidate);
  const ownWorkflowCoverage = covers(ownWorkflowPath);

  const triggerCoverage = {
    pathFiltered,
    paths: paths ?? [],
    pathsIgnore: pathsIgnore ?? [],
    branches: branches ?? [],
    targetsMaster,
    selfTriggersOnOwnWorkflowFile: ownWorkflowCoverage === true,
    coveredInputs: coveredInputs.sort(),
    uncoveredInputs: uncoveredInputs.sort(),
    unresolvableInputs: unresolvableInputs.sort(),
  };

  // --- gaps (fully derived; the snapshot must reproduce this set exactly) ------
  //
  // Trigger/reporting gaps are only meaningful for a job that can actually run
  // on a pull request. Deriving them for a job that never runs on PRs (the
  // production release job, the scheduled monitors) would fill the contract
  // with findings nobody can act on and dilute the ones that matter.
  const knownGaps = [];
  const gap = (code, detail) => knownGaps.push({ code, detail });
  const runsOnPullRequests = classification === 'BLOCKING' || classification === 'ADVISORY';

  if (classification === 'BLOCKING' && pathFiltered) {
    gap(
      'PATH_FILTERED_NOT_ALWAYS_REPORTING',
      'pull_request path filter means this context is not reported on every PR to master; naming it directly in branch protection would deadlock on "Expected - Waiting for status to be reported"',
    );
  }
  if (runsOnPullRequests && branches === null) {
    gap('NO_BRANCH_FILTER', 'pull_request trigger declares no branches filter, so it runs on PRs to every branch');
  }
  if (runsOnPullRequests && pathFiltered && ownWorkflowCoverage !== true) {
    gap('TRIGGER_GAP_OWN_WORKFLOW_FILE', ownWorkflowPath);
  }
  if (runsOnPullRequests) {
    for (const path of triggerCoverage.uncoveredInputs) {
      const shared = sharedConfig.includes(path);
      gap(shared ? 'TRIGGER_GAP_SHARED_CONFIG' : 'TRIGGER_GAP_SCRIPT', path);
    }
    for (const path of triggerCoverage.unresolvableInputs) {
      gap('TRIGGER_COVERAGE_UNRESOLVABLE', path);
    }
  }
  if (classification === 'BLOCKING' && /advisory/i.test(workflowFile)) {
    gap('MISLEADING_ADVISORY_FILENAME', workflowFile);
  }
  if (classification === 'BLOCKING' && /non-blocking/i.test(String(job?.name ?? ''))) {
    gap('MISLEADING_NON_BLOCKING_JOB_NAME', String(job?.name ?? ''));
  }
  if (ifState === 'UNKNOWN') {
    gap('UNRECOGNIZED_JOB_IF', String(job?.if));
  }
  knownGaps.sort((a, b) => (a.code + a.detail).localeCompare(b.code + b.detail));

  return {
    workflowFile,
    workflowName: workflowDoc?.name ?? null,
    jobId,
    checkContext: job?.name ?? jobId,
    classification,
    directRequiredSafe,
    pathFiltered,
    blockingSemantics: {
      canFailPullRequest: classification === 'BLOCKING',
      jobContinueOnError,
      jobIf,
      jobIfPullRequestState: ifState,
      needs: job?.needs ? (Array.isArray(job.needs) ? job.needs : [job.needs]) : [],
      totalSteps: steps.length,
      softenedSteps,
      failableSteps: steps.length - softenedSteps,
      timeoutMinutes: typeof job?.['timeout-minutes'] === 'number' ? job['timeout-minutes'] : null,
    },
    commands,
    dependencies: { scripts, npmScripts, sharedConfig },
    triggerCoverage,
    knownGaps,
  };
}

// Every job of every workflow file, in a stable order.
export function deriveInventory({ files, packageScripts }) {
  const entries = [];
  const parseErrors = [];
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    let doc = null;
    try {
      doc = parseWorkflow(file.text);
    } catch (error) {
      parseErrors.push({ path: file.path, message: String(error.message) });
      continue;
    }
    if (!doc || typeof doc !== 'object') {
      parseErrors.push({ path: file.path, message: 'workflow did not parse to an object' });
      continue;
    }
    const workflowFile = file.path.split('/').pop();
    for (const jobId of Object.keys(doc.jobs ?? {})) {
      entries.push(deriveJobFacts({ workflowFile, workflowDoc: doc, jobId, packageScripts }));
    }
  }
  return { entries, parseErrors };
}

// --- portfolio-side derived fields -------------------------------------------

// Stage-2 candidacy is a DERIVED statement about today, not a plan: a check is
// a candidate exactly when it can fail a PR, still reports outside the unified
// gate, and cannot be required directly (because its path filter means it does
// not report on every PR). Those are precisely the gates whose enforcement is
// unreachable from branch protection as things stand.
export function deriveStage2Candidacy(entry, migrationState) {
  const candidate =
    entry.classification === 'BLOCKING' &&
    migrationState === 'LEGACY_EXTERNAL' &&
    entry.directRequiredSafe === false;
  const reason = candidate
    ? 'blocking-capable, still external to the unified gate, and not directly requirable because it is path-filtered'
    : entry.classification !== 'BLOCKING'
      ? `not blocking-capable (${entry.classification})`
      : migrationState !== 'LEGACY_EXTERNAL'
        ? `not external to the unified gate (${migrationState})`
        : 'already always-reporting, so it can be required directly without migration';
  return { candidate, reason };
}

// --- the audit ----------------------------------------------------------------

const IDENTITY_FIELDS = Object.freeze([
  'workflowFile',
  'workflowName',
  'jobId',
  'checkContext',
  'classification',
  'directRequiredSafe',
  'pathFiltered',
]);

const DERIVED_DEEP_FIELDS = Object.freeze([
  'blockingSemantics',
  'commands',
  'dependencies',
  'triggerCoverage',
  'knownGaps',
]);

const REQUIRED_ENTRY_FIELDS = Object.freeze([
  'id',
  ...IDENTITY_FIELDS,
  ...DERIVED_DEEP_FIELDS,
  'migrationState',
  'stage2MigrationCandidate',
  'stage2MigrationCandidateReason',
]);

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function stable(value) {
  return JSON.stringify(value);
}

/**
 * @param {object} input
 * @param {string} input.portfolioText raw contents of the portfolio JSON
 * @param {{path: string, text: string}[]} input.files every tracked workflow file
 * @param {Record<string,string>} input.packageScripts package.json `scripts`
 * @param {(path: string) => boolean} input.exists existence probe for dependency paths
 * @returns {{label: string, ok: boolean, detail: string}[]}
 */
export function auditPortfolio({ portfolioText, files, packageScripts, exists }) {
  const results = [];
  const check = (label, ok, detail = '') => results.push({ label, ok: Boolean(ok), detail: String(detail) });

  // --- 0. the machine-readable file parses STRICTLY --------------------------
  let portfolio = null;
  try {
    portfolio = JSON.parse(portfolioText);
  } catch (error) {
    check('portfolio file parses as strict JSON', false, String(error.message));
    return results;
  }
  check('portfolio file parses as strict JSON', true);
  check(
    'portfolio root is a non-null, non-array object',
    portfolio !== null && typeof portfolio === 'object' && !Array.isArray(portfolio),
    stable(portfolio).slice(0, 120),
  );
  if (portfolio === null || typeof portfolio !== 'object' || Array.isArray(portfolio)) return results;

  check('portfolio declares a schemaVersion', typeof portfolio.schemaVersion === 'number');
  check('portfolio declares its vocabularies', Array.isArray(portfolio.classifications) && Array.isArray(portfolio.migrationStates));
  check(
    'portfolio classification vocabulary matches the closed engine vocabulary',
    stable(portfolio.classifications) === stable(CLASSIFICATIONS),
    stable(portfolio.classifications),
  );
  check(
    'portfolio migration-state vocabulary matches the closed engine vocabulary',
    stable(portfolio.migrationStates) === stable(MIGRATION_STATES),
    stable(portfolio.migrationStates),
  );
  check(
    'portfolio gap-code vocabulary matches the closed engine vocabulary',
    stable(portfolio.gapCodes) === stable(GAP_CODES),
    stable(portfolio.gapCodes),
  );

  const stored = portfolio.entries;
  check('portfolio declares an entries array', Array.isArray(stored));
  if (!Array.isArray(stored)) return results;
  check('portfolio entries array is non-empty', stored.length > 0);

  // --- 1. structural integrity of every stored entry -------------------------
  const seenIds = new Set();
  const contextOwners = new Map();
  for (const [index, entry] of stored.entries()) {
    const label = entry?.id ?? `#${index}`;
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      check(`entry ${label} is a JSON object`, false, stable(entry));
      continue;
    }
    for (const field of REQUIRED_ENTRY_FIELDS) {
      check(
        `entry ${label} declares required field "${field}"`,
        Object.prototype.hasOwnProperty.call(entry, field),
      );
    }
    const unknownFields = Object.keys(entry).filter(
      (key) => !REQUIRED_ENTRY_FIELDS.includes(key) && key !== 'notes' && key !== 'contextCollisionJustification',
    );
    check(`entry ${label} declares no unknown fields`, unknownFields.length === 0, unknownFields.join(','));

    check(`entry ${label} has a kebab-case id`, typeof entry.id === 'string' && ID_RE.test(entry.id), String(entry.id));
    check(`entry ${label} id is unique`, !seenIds.has(entry.id), 'duplicate portfolio id');
    seenIds.add(entry.id);

    check(
      `entry ${label} classification is in the closed vocabulary`,
      CLASSIFICATIONS.includes(entry.classification),
      String(entry.classification),
    );
    check(
      `entry ${label} migrationState is in the closed vocabulary`,
      MIGRATION_STATES.includes(entry.migrationState),
      String(entry.migrationState),
    );
    for (const gapEntry of Array.isArray(entry.knownGaps) ? entry.knownGaps : []) {
      check(
        `entry ${label} gap code "${gapEntry?.code}" is in the closed vocabulary`,
        GAP_CODES.includes(gapEntry?.code),
        String(gapEntry?.code),
      );
    }

    // Duplicate stable contexts are only tolerable with an explicit written
    // justification — two jobs reporting the same context name make a required
    // status ambiguous.
    const context = entry.checkContext;
    if (contextOwners.has(context)) {
      const justified =
        typeof entry.contextCollisionJustification === 'string' &&
        entry.contextCollisionJustification.trim().length > 0;
      check(
        `duplicate check context "${context}" carries an explicit justification`,
        justified,
        `also claimed by ${contextOwners.get(context)}`,
      );
    } else {
      contextOwners.set(context, entry.id);
      check(
        `entry ${label} declares no unnecessary context-collision justification`,
        !Object.prototype.hasOwnProperty.call(entry, 'contextCollisionJustification'),
        'no collision exists for this context',
      );
    }
  }

  // --- 2. derive repository truth -------------------------------------------
  const { entries: derived, parseErrors } = deriveInventory({ files, packageScripts });
  check('every workflow file parses as YAML', parseErrors.length === 0, stable(parseErrors));
  check('workflow inventory is non-empty (fail closed on an empty scan)', derived.length > 0);

  const keyOf = (entry) => `${entry.workflowFile}#${entry.jobId}`;
  const derivedByKey = new Map(derived.map((entry) => [keyOf(entry), entry]));
  const storedByKey = new Map();
  for (const entry of stored) {
    if (entry && typeof entry === 'object') storedByKey.set(`${entry.workflowFile}#${entry.jobId}`, entry);
  }
  check(
    'no two portfolio entries claim the same workflow/job pair',
    storedByKey.size === stored.length,
    `${stored.length} entries, ${storedByKey.size} distinct workflow#job keys`,
  );

  // --- 3. COVERAGE: every discovered job is classified ------------------------
  for (const entry of derived) {
    const key = keyOf(entry);
    check(
      `discovered job ${key} is represented in the portfolio`,
      storedByKey.has(key),
      `classification would be ${entry.classification}; add an explicit portfolio entry`,
    );
  }
  // Blocking-capable jobs get their own, louder assertion so a coverage failure
  // is never mistaken for a cosmetic bookkeeping miss.
  for (const entry of derived.filter((candidate) => candidate.classification === 'BLOCKING')) {
    check(
      `BLOCKING-capable job ${keyOf(entry)} is explicitly classified`,
      storedByKey.has(keyOf(entry)),
      'a new blocking-capable PR workflow requires explicit classification',
    );
  }

  // --- 4. NO SILENT DISAPPEARANCE --------------------------------------------
  for (const entry of stored) {
    if (!entry || typeof entry !== 'object') continue;
    const key = `${entry.workflowFile}#${entry.jobId}`;
    const match = derivedByKey.get(key);
    const known = files.some((file) => file.path === `.github/workflows/${entry.workflowFile}`);
    check(`portfolio entry ${entry.id} points at an existing workflow file`, known, entry.workflowFile);
    check(
      `portfolio entry ${entry.id} points at an existing job (${key})`,
      Boolean(match),
      match ? '' : 'workflow/job no longer exists — a blocking entry must never silently disappear',
    );
    if (entry.classification === 'BLOCKING') {
      check(
        `BLOCKING portfolio entry ${entry.id} has not silently vanished from the repository`,
        Boolean(match) && match.classification === 'BLOCKING',
        match ? `now derives as ${match.classification}` : 'job no longer exists',
      );
    }
    if (!match) continue;

    // --- 5. NO SILENT DRIFT in any derivable field ---------------------------
    for (const field of IDENTITY_FIELDS) {
      check(
        `portfolio entry ${entry.id} field "${field}" matches the workflow YAML`,
        stable(entry[field]) === stable(match[field]),
        `stored=${stable(entry[field])} actual=${stable(match[field])}`,
      );
    }
    for (const field of DERIVED_DEEP_FIELDS) {
      check(
        `portfolio entry ${entry.id} field "${field}" matches the workflow YAML`,
        stable(entry[field]) === stable(match[field]),
        `stored=${stable(entry[field])} actual=${stable(match[field])}`,
      );
    }

    // --- 6. migrationState / candidacy consistency ---------------------------
    if (match.classification === 'NON_PR' || match.classification === 'CONDITIONAL_PRODUCTION_ONLY') {
      check(
        `portfolio entry ${entry.id} is NOT_APPLICABLE for migration (it cannot run as a PR gate)`,
        entry.migrationState === 'NOT_APPLICABLE',
        String(entry.migrationState),
      );
    } else {
      check(
        `portfolio entry ${entry.id} does not claim NOT_APPLICABLE while running on PRs`,
        entry.migrationState !== 'NOT_APPLICABLE',
        String(entry.migrationState),
      );
    }
    const candidacy = deriveStage2Candidacy(match, entry.migrationState);
    check(
      `portfolio entry ${entry.id} stage-2 candidacy is derived, not asserted`,
      entry.stage2MigrationCandidate === candidacy.candidate,
      `stored=${entry.stage2MigrationCandidate} derived=${candidacy.candidate}`,
    );
    check(
      `portfolio entry ${entry.id} stage-2 candidacy reason matches the derivation`,
      entry.stage2MigrationCandidateReason === candidacy.reason,
      `stored=${stable(entry.stage2MigrationCandidateReason)}`,
    );

    // --- 7. declared dependencies really exist -------------------------------
    if (typeof exists === 'function') {
      for (const path of entry.dependencies?.scripts ?? []) {
        check(`portfolio entry ${entry.id} dependency "${path}" exists on disk`, exists(path), path);
      }
      for (const path of entry.dependencies?.sharedConfig ?? []) {
        check(`portfolio entry ${entry.id} shared config "${path}" exists on disk`, exists(path), path);
      }
    }
    for (const name of entry.dependencies?.npmScripts ?? []) {
      check(
        `portfolio entry ${entry.id} npm script "${name}" is defined in package.json`,
        Object.prototype.hasOwnProperty.call(packageScripts ?? {}, name),
        name,
      );
    }
  }

  // --- 8. the recorded totals must match the derivation ----------------------
  const totals = {};
  for (const value of CLASSIFICATIONS) {
    totals[value] = derived.filter((entry) => entry.classification === value).length;
  }
  totals.total = derived.length;
  totals.directRequiredSafe = derived.filter((entry) => entry.directRequiredSafe).length;
  check(
    'portfolio totals match the derived inventory',
    stable(portfolio.totals) === stable(totals),
    `stored=${stable(portfolio.totals)} derived=${stable(totals)}`,
  );
  check(
    'portfolio entry count matches the discovered job count',
    stored.length === derived.length,
    `${stored.length} stored vs ${derived.length} discovered`,
  );

  // --- 9. exactly one always-reporting unified gate host ----------------------
  const hosts = stored.filter((entry) => entry?.migrationState === 'UNIFIED_GATE_HOST');
  check('exactly one entry is the unified gate host', hosts.length === 1, `found ${hosts.length}`);
  check(
    'the unified gate host is BLOCKING and directly requirable',
    hosts.length === 1 && hosts[0].classification === 'BLOCKING' && hosts[0].directRequiredSafe === true,
    hosts.length === 1 ? `${hosts[0].classification}/${hosts[0].directRequiredSafe}` : '',
  );

  return results;
}
