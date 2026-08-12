#!/usr/bin/env node
// Deterministic contract test for the stable master required gate (issue #366).
//
// Proves, without network access and without invoking GitHub, that:
//   1. the required workflow has no pull_request.paths / paths-ignore filter;
//   2. the required check context name is stable and unique;
//   3. the required job cannot be skipped, softened or made advisory;
//   4. classification is fail-closed by construction: only the exact paths in
//      NON_MATERIAL_PATHS are non-material, everything else (including every
//      unknown/new path and every header hard-gate trigger) is MATERIAL;
//   5. allowlisted-only changes do not deadlock and still report the context;
//   6. a header-gate failure propagates to the required job conclusion;
//   7. advisory (continue-on-error) jobs cannot satisfy the required gate;
//   8. the exact PR head SHA is checked out;
//   9. permissions stay minimal / read-only;
//  10. the producer/consumer sidecar binding is structural — the classifier is
//      proved to PERFORM the sidecar write with the classification payload, not
//      merely to mention the path helper;
//  11. the sidecar directory is RUNNER_TEMP with NO process-global fallback, and
//      a sidecar that does not name this exact run is rejected as STALE;
//  12. raw Git filenames are never trimmed onto the allowlist;
//  13. the NON_MATERIAL allowlist is re-proved inert against the currently
//      tracked build/test/runtime/gate surface (dependency-drift guard).

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import yaml from 'js-yaml';
import {
  NON_MATERIAL_PATHS,
  isMaterialPath,
  isNonMaterialPath,
  classifyChangedPaths,
  classifierResultFilePath,
  isConsistentClassification,
  resolveRunIdentity,
  REASON_MATERIALITY,
  RUN_IDENTITY_ENV,
  SIDECAR_BASENAME,
  VALID_REASONS,
} from './master-required-gate-classify.mjs';
import { validateClassifierOutput } from './master-required-gate-validate-output.mjs';
import { auditProducerConsumerContract } from './master-required-gate-workflow-contract.mjs';
import {
  ACCEPTED_GATE_OUTCOMES,
  APPLICABILITY_REASONS,
  APPLICABILITY_VALUES,
  FINAL_CHECK_CONTEXT,
  FINAL_JOB_ID,
  GATES,
  GATE_IDS,
  GATE_OUTCOMES,
  UNIVERSALLY_INERT_PATHS,
  VALID_APPLICABILITY_REASONS,
  applicabilityDigest,
  checkApplicabilityMaterialityConsistency,
  classifyAllGates,
  classifyGateApplicability,
  gateCommands,
  isConsistentApplicability,
} from './master-required-gate-gates.mjs';
import { computeApplicability } from './master-required-gate-applicability.mjs';
import { validateApplicabilityOutput } from './master-required-gate-validate-applicability.mjs';
import { evaluateGateResult } from './master-required-gate-gate-result.mjs';
import { aggregate } from './master-required-gate-aggregate.mjs';
import { deriveJobFacts, parseWorkflow } from './master-blocking-portfolio-contract.mjs';
import {
  auditAllowlistDependencyDrift,
  auditTypeCoverage,
  selectScannedFiles,
  EXCLUDED_PATHS as DRIFT_EXCLUDED_PATHS,
  SCANNED_EXTENSIONS as DRIFT_SCANNED_EXTENSIONS,
} from './master-required-gate-allowlist-drift.mjs';

const ROOT = resolve(process.cwd());
const WORKFLOW_DIR = resolve(ROOT, '.github/workflows');
const REQUIRED_WORKFLOW = resolve(WORKFLOW_DIR, 'cbw-master-required-gate.yml');
const HEADER_WORKFLOW = resolve(WORKFLOW_DIR, 'cbw-global-header-interaction.yml');
const REQUIRED_CONTEXT = FINAL_CHECK_CONTEXT;
const HEADER_GATE_SCRIPT = 'scripts/ui/global-header-interaction-browser-smoke.mjs';
const CLASSIFY_SCRIPT = 'scripts/ci/master-required-gate-classify.mjs';
const VALIDATE_SCRIPT = 'scripts/ci/master-required-gate-validate-output.mjs';
const GATES_SCRIPT = 'scripts/ci/master-required-gate-gates.mjs';
const APPLICABILITY_SCRIPT = 'scripts/ci/master-required-gate-applicability.mjs';
const VALIDATE_APPLICABILITY_SCRIPT = 'scripts/ci/master-required-gate-validate-applicability.mjs';
const GATE_RESULT_SCRIPT = 'scripts/ci/master-required-gate-gate-result.mjs';
const AGGREGATE_SCRIPT = 'scripts/ci/master-required-gate-aggregate.mjs';

let checks = 0;
const failures = [];
function check(label, ok, detail = '') {
  checks += 1;
  if (!ok) failures.push(detail ? `${label}: ${detail}` : label);
}

function loadWorkflow(path) {
  // `on:` is YAML 1.1 truthy; js-yaml CORE_SCHEMA keeps it as the string key.
  return yaml.load(readFileSync(path, 'utf8'), { schema: yaml.CORE_SCHEMA });
}

// --- 1. no path filter on the required workflow ------------------------------
check('required workflow exists', existsSync(REQUIRED_WORKFLOW));
const required = loadWorkflow(REQUIRED_WORKFLOW);
const triggers = required?.on ?? required?.true;
const pr = triggers?.pull_request;
check('required workflow triggers on pull_request', Boolean(pr));
check(
  'required workflow targets master',
  Array.isArray(pr?.branches) && pr.branches.includes('master'),
  JSON.stringify(pr?.branches),
);
check(
  'required workflow has NO pull_request.paths filter',
  !Object.prototype.hasOwnProperty.call(pr ?? {}, 'paths'),
  'a paths filter would create a permanent Expected/Waiting required status',
);
check(
  'required workflow has NO pull_request.paths-ignore filter',
  !Object.prototype.hasOwnProperty.call(pr ?? {}, 'paths-ignore'),
);
check(
  'required workflow declares no other blocking trigger',
  Object.keys(triggers ?? {}).every((key) => key === 'pull_request'),
  Object.keys(triggers ?? {}).join(','),
);

// --- 2. stable, unique check context ----------------------------------------
//
// S2-03: the workflow is now a bounded DAG, so "exactly one job" became "exactly
// one job whose visible name is the stable required context, and that job is the
// FINAL aggregator". The full DAG shape is asserted by
// auditProducerConsumerContract in section 10; these are the direct assertions a
// reader should be able to find without following a call.
const jobIds = Object.keys(required?.jobs ?? {});
const namedRequired = jobIds.filter((id) => required.jobs[id]?.name === REQUIRED_CONTEXT);
check(
  'the stable required check context appears EXACTLY once in this workflow',
  namedRequired.length === 1,
  `found ${namedRequired.length}: ${namedRequired.join(',')}`,
);
check(
  'the stable required check context belongs to the FINAL aggregator job',
  namedRequired.length === 1 && namedRequired[0] === FINAL_JOB_ID,
  namedRequired.join(','),
);
const job = required?.jobs?.[FINAL_JOB_ID];
const classifyJob = required?.jobs?.classify;
check('required check context name is stable', job?.name === REQUIRED_CONTEXT, `actual=${job?.name}`);
check('required job declares no matrix (context name cannot fan out)', !job?.strategy);
// THE ALWAYS-REPORTING PROPERTY, stated directly. Without `if: always()` the
// aggregator is skipped whenever an upstream job fails, reports no conclusion at
// all, and a branch-protection rule naming it waits forever.
check(
  'the final required job carries `if: always()` so the context is ALWAYS reported',
  String(job?.if ?? '').trim() === 'always()',
  `actual=${JSON.stringify(job?.if)}`,
);
const requiredNeeds = job?.needs ? (Array.isArray(job.needs) ? job.needs : [job.needs]) : [];
check(
  'the final required job depends on the classifier and on every registered blocker',
  JSON.stringify([...requiredNeeds].sort()) ===
    JSON.stringify(['classify', ...GATE_IDS.map((gateId) => GATES[gateId].jobId)].sort()),
  JSON.stringify(requiredNeeds),
);
for (const gateId of GATE_IDS) {
  check(
    `the final required job has a needs edge on blocker "${gateId}"`,
    requiredNeeds.includes(GATES[gateId].jobId),
  );
  const blocker = required?.jobs?.[GATES[gateId].jobId];
  check(`blocker job "${gateId}" exists in the unified workflow`, Boolean(blocker));
  // A path-irrelevant blocker must still INSTANTIATE. A job-level `if` would make
  // it `skipped`, and skipped is indistinguishable from an upstream failure.
  check(
    `blocker job "${gateId}" carries no job-level if (it always instantiates)`,
    !Object.prototype.hasOwnProperty.call(blocker ?? {}, 'if'),
    JSON.stringify(blocker?.if),
  );
  check(`blocker job "${gateId}" is not continue-on-error`, blocker?.['continue-on-error'] !== true);
}

// Context uniqueness across every workflow that can run on pull_request.
const workflowFiles = execFileSync('git', ['ls-files', '.github/workflows'], { encoding: 'utf8' })
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.endsWith('.yml') || line.endsWith('.yaml'));
const allJobs = [];
for (const file of workflowFiles) {
  const doc = loadWorkflow(resolve(ROOT, file));
  const on = doc?.on ?? doc?.true;
  const runsOnPr = Boolean(on && typeof on === 'object' && 'pull_request' in on);
  for (const [id, def] of Object.entries(doc?.jobs ?? {})) {
    allJobs.push({ file, id, name: def?.name ?? id, def, runsOnPr });
  }
}
const contextCollisions = allJobs.filter(
  (entry) => entry.name === REQUIRED_CONTEXT && entry.file !== '.github/workflows/cbw-master-required-gate.yml',
);
check(
  'required check context is not reused by another workflow',
  contextCollisions.length === 0,
  contextCollisions.map((entry) => entry.file).join(','),
);

// --- 3. no job in the DAG can be softened ------------------------------------
check('required job is not continue-on-error', job?.['continue-on-error'] !== true);
check('required job has a timeout', typeof job?.['timeout-minutes'] === 'number');
check('classifier job exists', Boolean(classifyJob));
check('classifier job has no job-level if', !Object.prototype.hasOwnProperty.call(classifyJob ?? {}, 'if'));
check('classifier job is the DAG root (no needs)', !classifyJob?.needs);

const steps = classifyJob?.steps ?? [];
for (const id of jobIds) {
  for (const step of required.jobs[id]?.steps ?? []) {
    const label = `${id}/${step.name ?? step.uses ?? step.run ?? '<unnamed>'}`;
    check(`step "${label}" is not continue-on-error`, step['continue-on-error'] !== true);
    if (typeof step.run === 'string') {
      check(
        `step "${label}" does not swallow failures`,
        !/\|\|\s*(true|exit\s+0|:)\b/.test(step.run) && !/set\s+\+e/.test(step.run),
        step.run,
      );
    }
  }
}

// --- 6. blocker failure propagates to the required context -------------------
//
// The header hard gate now lives in its own blocker job. Its failure reaches the
// stable context through the aggregator, which rejects any blocker job result
// other than `success`. Both halves are asserted: the step really runs inside the
// unified DAG, and the aggregator really refuses to pass without it.
const headerJob = required?.jobs?.[GATES['global-header-interaction'].jobId];
const headerSteps = headerJob?.steps ?? [];
const headerStep = headerSteps.find((step) => String(step.run ?? '').includes(HEADER_GATE_SCRIPT));
check('the unified DAG runs the header hard-gate script itself', Boolean(headerStep));
check(
  'header hard-gate step failure propagates to its blocker job',
  headerStep?.['continue-on-error'] !== true && !/\|\|/.test(String(headerStep?.run ?? '')),
);
// The gate script itself must fail-closed on a failed check.
const headerScriptSource = readFileSync(resolve(ROOT, HEADER_GATE_SCRIPT), 'utf8');
check(
  'header hard-gate script sets a non-zero exit code on failure',
  /process\.exitCode\s*=\s*1/.test(headerScriptSource),
);
check(
  'the header blocker runs the production build before the header matrix',
  headerSteps.findIndex((step) => String(step.run ?? '').includes('npm run build')) <
    headerSteps.findIndex((step) => String(step.run ?? '').includes(HEADER_GATE_SCRIPT)),
);
check(
  'the required workflow executes the blocking work ITSELF and never queries another workflow status',
  !readFileSync(REQUIRED_WORKFLOW, 'utf8').includes('workflow_run') &&
    !readFileSync(REQUIRED_WORKFLOW, 'utf8').includes('github-script'),
);

// --- 4. fail-closed classification: default MATERIAL -------------------------
//
// The model is a negative allowlist. Anything not literally present in
// NON_MATERIAL_PATHS must be MATERIAL — including paths nobody enumerated.

// 4a. The allowlist itself stays tiny, exact-path only, and inert.
check('NON_MATERIAL_PATHS is non-empty', NON_MATERIAL_PATHS.length > 0);
check(
  'NON_MATERIAL_PATHS stays intentionally narrow (<= 8 entries)',
  NON_MATERIAL_PATHS.length <= 8,
  String(NON_MATERIAL_PATHS.length),
);
for (const entry of NON_MATERIAL_PATHS) {
  check(
    `non-material entry "${entry}" is an exact path, not a prefix/glob`,
    !entry.includes('*') && !entry.endsWith('/'),
    entry,
  );
  check(`non-material entry "${entry}" classifies non-material`, isNonMaterialPath(entry));
  check(
    `non-material entry "${entry}" is a root-level governance document`,
    !entry.includes('/') && entry.endsWith('.md'),
    entry,
  );
}

// 4b. No workflow trigger may intersect the allowlist. This is what makes the
// allowlist provable rather than asserted: if anyone makes an allowlisted file
// load-bearing for CI/CD (as docs/tasks/**.md already is for the autodeploy
// workflow), this gate fails instead of silently skipping the matrix.
for (const file of workflowFiles) {
  const doc = loadWorkflow(resolve(ROOT, file));
  const on = doc?.on ?? doc?.true;
  const triggerPatterns = [];
  for (const event of Object.values(on ?? {})) {
    if (event && typeof event === 'object') {
      for (const key of ['paths', 'paths-ignore']) {
        if (Array.isArray(event[key])) triggerPatterns.push(...event[key]);
      }
    }
  }
  for (const pattern of triggerPatterns) {
    const prefix = pattern.replace(/\*+.*$/, '');
    const hits = NON_MATERIAL_PATHS.filter(
      (entry) => entry === pattern || (pattern.includes('*') && entry.startsWith(prefix)),
    );
    check(
      `workflow trigger "${pattern}" (${file}) does not intersect NON_MATERIAL_PATHS`,
      hits.length === 0,
      hits.join(','),
    );
  }
}

// 4b-2. DEPENDENCY DRIFT. A workflow trigger is only one of the ways an
// allowlisted file can become load-bearing. A script that reads it, a package
// manifest that ships it, or a page that imports it makes it a real
// build/test/runtime input while no trigger pattern ever mentions it. The
// bounded, deterministic scan below re-proves inertness against the CURRENTLY
// TRACKED build/test/runtime/gate surface on every run; any direct reference
// fails the gate instead of letting the file keep non-material status.
//
// The scan is bounded by FILE TYPE rather than by directory prefix: an
// enumerated prefix list was stale on arrival (it missed server/** and
// tools/**) and every future top-level runtime directory would have fallen
// outside it silently. Type classification is proved TOTAL below, so a new file
// type fails the contract instead of quietly going unscanned.

// GIT INVENTORY — a failure here is fail-closed, never an empty scan.
let trackedPaths = null;
let trackedInventoryError = null;
try {
  const raw = execFileSync('git', ['ls-files', '-z'], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 256,
  }).split('\0');
  if (raw[raw.length - 1] === '') raw.pop();
  trackedPaths = raw;
} catch (error) {
  trackedInventoryError = String(error.message);
}
check(
  'git tracked-file inventory resolved for the allowlist drift scan',
  trackedInventoryError === null,
  String(trackedInventoryError),
);
check(
  'git tracked-file inventory is non-empty',
  Array.isArray(trackedPaths) && trackedPaths.length > 0,
);
const trackedInventory = Array.isArray(trackedPaths) ? trackedPaths : [];

// Type classification must be TOTAL over the inventory — this is what keeps the
// claimed scope and the actual scope identical as the repository grows.
for (const result of auditTypeCoverage(trackedInventory)) {
  check(result.label, result.ok, result.detail);
}

const scannedPaths = selectScannedFiles(trackedInventory);
const scannedFiles = [];
for (const path of scannedPaths) {
  const full = resolve(ROOT, path);
  // A tracked path that cannot be read is not silently skipped: an unreadable
  // file is an unproven file, so it enters the scan as an explicit failure and
  // is carried into the audit with a non-string body so the audit fails too.
  let text = null;
  try {
    text = readFileSync(full, 'utf8');
  } catch (error) {
    check(
      `tracked scanned file "${path}" is readable for the allowlist drift scan`,
      false,
      String(error.message),
    );
  }
  scannedFiles.push({ path, text });
}
for (const result of auditAllowlistDependencyDrift({
  files: scannedFiles,
  allowlist: NON_MATERIAL_PATHS,
  tracked: trackedInventory,
})) {
  check(result.label, result.ok, result.detail);
}
// The scan's own exclusion set must stay honest: every excluded path is one of
// the gate's own files and must actually exist, so a stale exclusion cannot
// quietly cover a file that was renamed into the build surface.
for (const excluded of DRIFT_EXCLUDED_PATHS) {
  check(
    `allowlist drift exclusion "${excluded}" is a real gate file`,
    existsSync(resolve(ROOT, excluded)) && excluded.startsWith('scripts/ci/master-required-gate-'),
    excluded,
  );
}
check(
  'allowlist drift exclusions are exact paths, never prefixes or globs',
  DRIFT_EXCLUDED_PATHS.every((path) => !path.includes('*') && !path.endsWith('/')),
);
// The extension list is matched by exact suffix, so a malformed entry would
// silently never match and shrink the scan without any visible failure.
check(
  'drift scan extensions are normalized (dot-prefixed, lowercase, no globs)',
  DRIFT_SCANNED_EXTENSIONS.every(
    (extension) =>
      extension.startsWith('.') &&
      extension === extension.toLowerCase() &&
      !extension.includes('*') &&
      !extension.includes('/'),
  ),
  DRIFT_SCANNED_EXTENSIONS.join(','),
);
check(
  'drift scan extensions are unique',
  new Set(DRIFT_SCANNED_EXTENSIONS).size === DRIFT_SCANNED_EXTENSIONS.length,
);
// The executable/runtime types the review named must be scanned by name.
for (const extension of ['.mjs', '.js', '.cjs', '.ts', '.sh', '.service', '.json', '.yml', '.py']) {
  check(`drift scan covers the "${extension}" runtime/build type`, DRIFT_SCANNED_EXTENSIONS.includes(extension));
}
// And the guard must be demonstrably capable of failing. A scan that silently
// matches nothing looks identical to a scan that proves inertness, so each
// runtime surface is probed with a synthetic referencing file — including the
// two surfaces the reviewed prefix model missed entirely.
const DRIFT_PROBES = [
  ['src/**', { path: 'src/pages/probe.astro', text: "import x from '../../README.md';" }],
  ['scripts/**', { path: 'scripts/probe.mjs', text: "readFileSync('AUDIT_REPORT.md', 'utf8');" }],
  [
    'server/** (.mjs)',
    { path: 'server/votes/probe.mjs', text: "const doc = readFileSync('README.md');" },
  ],
  [
    'server/** (.sh)',
    { path: 'server/votes/probe.sh', text: '#!/bin/sh\ncp README.md /var/backups/\n' },
  ],
  [
    'server/** (.service)',
    {
      path: 'server/votes/probe.service',
      text: '[Service]\nExecStart=/usr/bin/node /srv/app/render.mjs AUDIT_REPORT.md\n',
    },
  ],
  [
    'tools/** (.mjs)',
    {
      path: 'tools/evidence-capture/probe.mjs',
      text: "import spec from '../../CryptoBonusWorld_Master_Architecture.md';",
    },
  ],
  [
    'tools/** (.json)',
    {
      path: 'tools/evidence-capture/probe.json',
      text: '{"inputs":["SCREENSHOT_PROCESSING_CONSTITUTION_v1.md"]}',
    },
  ],
  ['root manifest', { path: 'package.json', text: '{"files":["README.md"]}' }],
  ['.github/CODEOWNERS', { path: '.github/CODEOWNERS', text: 'README.md @owner\n' }],
];
for (const [surface, probe] of DRIFT_PROBES) {
  const probeResults = auditAllowlistDependencyDrift({
    files: [...scannedFiles.filter((file) => file.path !== probe.path), probe],
    allowlist: NON_MATERIAL_PATHS,
    tracked: trackedInventory,
  });
  const referenceFailures = probeResults.filter(
    (result) => !result.ok && /is referenced by NO tracked/.test(result.label),
  );
  check(
    `allowlist drift scan DETECTS an allowlist reference in ${surface}`,
    referenceFailures.length > 0,
  );
  check(
    `allowlist drift scan NAMES the offending ${surface} file`,
    referenceFailures.some((result) => String(result.detail).includes(probe.path)),
    referenceFailures.map((result) => result.detail).join(' | '),
  );
  // The probe path must be one the selector would really have picked up, or the
  // probe proves nothing about the live scan.
  check(
    `drift probe path "${probe.path}" is inside the real scan selection`,
    selectScannedFiles([probe.path]).length === 1,
  );
}

// Fail-closed inputs to the scan itself.
check(
  'allowlist drift scan FAILS on an empty file population',
  auditAllowlistDependencyDrift({ files: [], allowlist: NON_MATERIAL_PATHS, tracked: trackedInventory })
    .some((result) => !result.ok),
);
check(
  'allowlist drift scan FAILS when a selected file was unreadable',
  auditAllowlistDependencyDrift({
    files: [...scannedFiles, { path: 'server/votes/unreadable.mjs', text: null }],
    allowlist: NON_MATERIAL_PATHS,
    tracked: trackedInventory,
  }).some((result) => !result.ok && /readable/.test(result.label)),
);
check(
  'allowlist drift scan FAILS when a required runtime surface contributes nothing',
  auditAllowlistDependencyDrift({
    files: scannedFiles.filter((file) => !file.path.startsWith('server/')),
    allowlist: NON_MATERIAL_PATHS,
    tracked: trackedInventory,
  }).some((result) => !result.ok && /server\//.test(result.label)),
);
check(
  'allowlist drift scan FAILS when a tracked runtime file is not scanned',
  auditAllowlistDependencyDrift({
    files: scannedFiles.filter((file) => file.path !== 'server/votes/server.mjs'),
    allowlist: NON_MATERIAL_PATHS,
    tracked: trackedInventory,
  }).some((result) => !result.ok && /server\/votes\/server\.mjs/.test(result.label)),
);
// Type-coverage fail-closed: an unclassified extension and a degraded inventory.
check(
  'type coverage FAILS on an unclassified tracked extension',
  auditTypeCoverage([...trackedInventory, 'server/votes/agent.rb']).some(
    (result) => !result.ok && /extension is classified/.test(result.label),
  ),
);
check(
  'type coverage FAILS on an unclassified extensionless tracked file',
  auditTypeCoverage([...trackedInventory, 'server/votes/Makefile']).some(
    (result) => !result.ok && /extensionless/.test(result.label),
  ),
);
check(
  'type coverage FAILS on a degraded (implausibly small) git inventory',
  auditTypeCoverage(['package.json']).some((result) => !result.ok && /inventory/.test(result.label)),
);

// The reviewed MEDIUM, stated as a direct regression proof: the two surfaces the
// prefix model missed are really in the live scan today.
for (const surface of ['server/', 'tools/']) {
  const live = scannedPaths.filter((path) => path.startsWith(surface));
  check(
    `live scan actually covers tracked "${surface}**" files`,
    live.length > 0,
    `${live.length} files`,
  );
}
for (const path of ['server/votes/server.mjs', 'server/votes/backup.sh', 'server/votes/cbw-votes.service']) {
  if (!trackedInventory.includes(path)) continue;
  check(`Codex-named runtime file "${path}" is in the live scan selection`, scannedPaths.includes(path));
}

// 4c. Every path filter of the header hard gate is MATERIAL here (superset).
const header = loadWorkflow(HEADER_WORKFLOW);
const headerPaths = (header?.on ?? header?.true)?.pull_request?.paths ?? [];
check('header hard gate still declares its path filter', headerPaths.length > 0);
for (const pattern of headerPaths) {
  // Representative concrete path for each header trigger pattern.
  const probe = pattern.endsWith('/**') ? `${pattern.slice(0, -2)}__probe__.astro` : pattern;
  check(
    `header trigger "${pattern}" is MATERIAL for the required gate`,
    isMaterialPath(probe),
    probe,
  );
}

// 4d. Explicitly named fail-open regressions from independent review. Each of
// these was non-material under the previous positive-allowlist model.
const MUST_BE_MATERIAL = [
  // gate + build surface
  '.github/workflows/cbw-master-required-gate.yml',
  CLASSIFY_SCRIPT,
  'scripts/ci/master-required-gate-contract-test.mjs',
  'scripts/ci/master-required-gate-classifier-fixture-test.mjs',
  'package.json',
  'package-lock.json',
  'astro.config.mjs',
  'tsconfig.json',
  'src/components/layout/SiteHeader.astro',
  'public/robots.txt',
  // previously fail-open: unknown roots
  'unknown-root-file.mjs',
  'UNKNOWN.md',
  '.env.example',
  '.gitignore',
  '.gitattributes',
  '.github/CODEOWNERS',
  // previously fail-open: unlisted script trees
  'scripts/portal/foo.mjs',
  'scripts/deploy.mjs',
  'scripts/production-live-smoke.mjs',
  'scripts/production-origin-parity.mjs',
  'scripts/check-affiliate-integrity.mjs',
  'scripts/hard-gates/future.mjs',
  'scripts/ai-ops/validate-scope.mjs',
  // previously fail-open: unlisted config/data trees
  'config/new-config.mjs',
  'config/deploy/production.json',
  'tests/ai-ops/run-fixtures.mjs',
  'docs/tasks/CBW_PRODUCTION_P2_SAFE_BATCH_AUTODEPLOY_001.md',
  'docs/anything-else.md',
  'Reference/VISUAL_PACK_STANDARD_v1.md',
];
for (const path of MUST_BE_MATERIAL) {
  check(`"${path}" is MATERIAL`, isMaterialPath(path), path);
  check(
    `"${path}" is MATERIAL as a single-path change set`,
    classifyChangedPaths([path]).material === true,
  );
}

// 4e. Malformed / hostile path shapes are MATERIAL.
for (const bad of [undefined, null, '', '   ', 42, {}, '/abs/path.ts', '../escape.ts', 'a/../../b.ts']) {
  check(`malformed path ${JSON.stringify(bad)} is MATERIAL`, isMaterialPath(bad) === true);
}
// Case-sensitivity: a near-miss of an allowlisted name must not inherit it.
check('case-variant of an allowlisted path is MATERIAL', isMaterialPath('readme.md') === true);
check('allowlisted basename in a subdirectory is MATERIAL', isMaterialPath('docs/README.md') === true);

// --- 5. allowlisted-only changes report without deadlocking ------------------
const allowlistedOnly = classifyChangedPaths(['README.md', 'AUDIT_REPORT.md']);
check(
  'allowlisted-only change set is non-material',
  allowlistedOnly.material === false,
  allowlistedOnly.reason,
);
check(
  'single allowlisted path is non-material',
  classifyChangedPaths(['README.md']).material === false,
);
// Mixed sets: one unknown or material path poisons the whole diff.
check(
  'allowlisted + unknown path is MATERIAL',
  classifyChangedPaths(['README.md', 'scripts/portal/foo.mjs']).material === true,
);
check(
  'allowlisted + material source path is MATERIAL',
  classifyChangedPaths(['README.md', 'src/pages/index.astro']).material === true,
);
check(
  'allowlisted + unknown root file is MATERIAL',
  classifyChangedPaths(['AUDIT_REPORT.md', 'unknown-root-file.txt']).material === true,
);

// The context is still reported because the workflow has no paths filter
// (asserted above) and the job always runs the contract self-test.
const unconditionalSteps = steps.filter((step) => !Object.prototype.hasOwnProperty.call(step, 'if'));
check(
  'required job always executes at least one unconditional verification step',
  unconditionalSteps.some((step) => String(step.run ?? '').includes('master-required-gate-contract-test.mjs')),
);
check(
  'required job always executes the real-git classifier fixture suite',
  unconditionalSteps.some((step) =>
    String(step.run ?? '').includes('master-required-gate-classifier-fixture-test.mjs'),
  ),
);
check(
  'required job always executes the producer/output mutation suite',
  unconditionalSteps.some((step) =>
    String(step.run ?? '').includes('master-required-gate-mutation-test.mjs'),
  ),
);
check(
  'required job always executes the legacy/unified parity suite',
  unconditionalSteps.some((step) => String(step.run ?? '').includes('master-required-gate-parity-test.mjs')),
);

// Fail-closed resolution boundaries.
check('unresolved change set is MATERIAL', classifyChangedPaths(null).material === true);
check('empty change set is MATERIAL', classifyChangedPaths([]).material === true);
check('non-array change set is MATERIAL', classifyChangedPaths('src/x.ts').material === true);

// The classifier must not carry a positive material allowlist any more.
const classifierSource = readFileSync(resolve(ROOT, CLASSIFY_SCRIPT), 'utf8');
check(
  'classifier exposes no positive MATERIAL allowlist',
  !/export\s+const\s+MATERIAL_PATTERNS/.test(classifierSource),
);
check(
  'classifier disables rename detection when resolving changed paths',
  /'--no-renames'/.test(classifierSource),
);

// --- 7. advisory jobs cannot satisfy the required gate -----------------------
const advisoryJobs = allJobs.filter((entry) => entry.def?.['continue-on-error'] === true);
check('advisory (continue-on-error) jobs exist and remain advisory', advisoryJobs.length > 0);
check(
  'no advisory job carries the required check context',
  advisoryJobs.every((entry) => entry.name !== REQUIRED_CONTEXT),
);
check(
  'required job does not depend on any advisory workflow',
  !JSON.stringify(job).includes('continue-on-error'),
);

// --- 8. exact PR head checkout ----------------------------------------------
const checkoutStep = steps.find((step) => String(step.uses ?? '').startsWith('actions/checkout'));
check('required job checks out explicitly', Boolean(checkoutStep));
check(
  'required job checks out the exact PR head SHA',
  String(checkoutStep?.with?.ref ?? '').includes('pull_request.head.sha'),
  `actual=${checkoutStep?.with?.ref}`,
);
check(
  'required job checkout does not persist credentials',
  checkoutStep?.with?.['persist-credentials'] === false,
);
check(
  'required job checkout has full history for base..head diffing',
  checkoutStep?.with?.['fetch-depth'] === 0,
);

// --- 9. minimal permissions --------------------------------------------------
check(
  'workflow permissions are read-only',
  JSON.stringify(required?.permissions) === JSON.stringify({ contents: 'read' }),
  JSON.stringify(required?.permissions),
);
check('required job declares no elevated permissions', !job?.permissions);
check(
  'required workflow never uses the privileged pull_request_target event',
  !Object.prototype.hasOwnProperty.call(triggers ?? {}, 'pull_request_target'),
);
check(
  'required workflow references no repository secrets',
  !readFileSync(REQUIRED_WORKFLOW, 'utf8').includes('secrets.'),
);

// --- 10. producer/consumer contract ------------------------------------------
//
// Closes the reviewed fail-open: nothing previously required the classification
// PRODUCER to exist. Renaming `id: classify` or deleting the classifier step
// left this suite green while `steps.classify.outputs.material` resolved to ''
// at runtime, skipping build + header matrix + indexability under SUCCESS.
// Every assertion below is exercised against deliberate mutations by
// scripts/ci/master-required-gate-mutation-test.mjs.
const validatorSource = readFileSync(resolve(ROOT, VALIDATE_SCRIPT), 'utf8');
for (const result of auditProducerConsumerContract({
  workflowText: readFileSync(REQUIRED_WORKFLOW, 'utf8'),
  classifierSource: readFileSync(resolve(ROOT, CLASSIFY_SCRIPT), 'utf8'),
  validatorSource,
  gatesSource: readFileSync(resolve(ROOT, GATES_SCRIPT), 'utf8'),
  applicabilitySource: readFileSync(resolve(ROOT, APPLICABILITY_SCRIPT), 'utf8'),
  applicabilityValidatorSource: readFileSync(resolve(ROOT, VALIDATE_APPLICABILITY_SCRIPT), 'utf8'),
  gateResultSource: readFileSync(resolve(ROOT, GATE_RESULT_SCRIPT), 'utf8'),
  aggregateSource: readFileSync(resolve(ROOT, AGGREGATE_SCRIPT), 'utf8'),
})) {
  check(result.label, result.ok, result.detail);
}
for (const script of [
  VALIDATE_SCRIPT,
  GATES_SCRIPT,
  APPLICABILITY_SCRIPT,
  VALIDATE_APPLICABILITY_SCRIPT,
  GATE_RESULT_SCRIPT,
  AGGREGATE_SCRIPT,
]) {
  check(`gate script "${script}" exists on disk`, existsSync(resolve(ROOT, script)));
}

// --- 11. runtime validator behaviour -----------------------------------------
//
// The validator is the runtime half of the producer binding, so its acceptance
// set is asserted directly rather than inferred from its source.
const IDENTITY = Object.freeze({ headSha: 'deadbeef'.repeat(5), runId: '424242', runAttempt: '1' });
const sidecarOf = (material, reason, overrides = {}) =>
  JSON.stringify({ material, reason, ...IDENTITY, ...overrides });
const GOOD_SIDECAR = sidecarOf(true, 'material-path-changed');
const GOOD_FALSE_SIDECAR = sidecarOf(false, 'only-allowlisted-non-material-paths');
check(
  'validator ACCEPTS material=true with an agreeing, current sidecar',
  validateClassifierOutput({
    material: 'true',
    reason: 'material-path-changed',
    sidecarRaw: GOOD_SIDECAR,
    identity: IDENTITY,
  }).length === 0,
);
check(
  'validator ACCEPTS material=false with an agreeing, current sidecar',
  validateClassifierOutput({
    material: 'false',
    reason: 'only-allowlisted-non-material-paths',
    sidecarRaw: GOOD_FALSE_SIDECAR,
    identity: IDENTITY,
  }).length === 0,
);
// STALENESS — each identity field independently binds the sidecar to this run.
// A leftover file in RUNNER_TEMP carries a perfectly well-formed classification;
// only the identity distinguishes it from one this run's producer just wrote.
const STALE_SIDECARS = [
  ['a previous PR head', { headSha: 'cafebabe'.repeat(5) }],
  ['a previous workflow run', { runId: '424241' }],
  ['a previous re-run attempt', { runAttempt: '0' }],
  ['a sidecar with no identity at all (pre-hardening format)', { headSha: undefined, runId: undefined, runAttempt: undefined }],
  ['a sidecar with a null identity field', { runId: null }],
  ['a sidecar with a numeric runId instead of the raw env string', { runId: 424242 }],
];
for (const [label, overrides] of STALE_SIDECARS) {
  check(
    `validator REJECTS a STALE sidecar from ${label}`,
    validateClassifierOutput({
      material: 'true',
      reason: 'material-path-changed',
      sidecarRaw: sidecarOf(true, 'material-path-changed', overrides),
      identity: IDENTITY,
    }).length > 0,
  );
}
// A missing/unusable run identity on the VALIDATOR side is itself fail-closed:
// if this run cannot be identified, no sidecar can be proven fresh.
for (const badIdentity of [
  undefined,
  null,
  {},
  [],
  'deadbeef',
  { headSha: '', runId: '424242', runAttempt: '1' },
  { headSha: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef', runId: '', runAttempt: '1' },
  { headSha: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef', runId: '424242', runAttempt: '' },
  { headSha: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef', runId: '424242' },
]) {
  check(
    `validator REJECTS an unidentifiable run identity ${JSON.stringify(badIdentity)}`,
    validateClassifierOutput({
      material: 'true',
      reason: 'material-path-changed',
      sidecarRaw: GOOD_SIDECAR,
      identity: badIdentity,
    }).length > 0,
  );
}
// Every rejected shape. `undefined` is a deleted/renamed producer; '' is an
// unresolved expression; the rest are malformed emissions.
const REJECTED_MATERIAL_VALUES = [
  undefined,
  null,
  '',
  ' ',
  'true ',
  ' true',
  'true\n',
  'true\t',
  'True',
  'TRUE',
  'yes',
  'no',
  '1',
  '0',
  'material',
  'true,false',
  true,
  1,
];
for (const value of REJECTED_MATERIAL_VALUES) {
  check(
    `validator REJECTS material=${JSON.stringify(value)}`,
    validateClassifierOutput({
      material: value,
      reason: 'material-path-changed',
      sidecarRaw: GOOD_SIDECAR,
      identity: IDENTITY,
    }).length > 0,
  );
}
for (const value of [undefined, null, '', ' ', 'material-path-changed ', 'nonsense', 'MATERIAL-PATH-CHANGED']) {
  check(
    `validator REJECTS reason=${JSON.stringify(value)}`,
    validateClassifierOutput({
      material: 'true',
      reason: value,
      sidecarRaw: GOOD_SIDECAR,
      identity: IDENTITY,
    }).length > 0,
  );
}
check(
  'validator REJECTS a missing producer sidecar (producer step deleted)',
  validateClassifierOutput({
    material: 'true',
    reason: 'material-path-changed',
    sidecarRaw: null,
    identity: IDENTITY,
  }).length > 0,
);
check(
  'validator REJECTS an empty producer sidecar',
  validateClassifierOutput({
    material: 'true',
    reason: 'material-path-changed',
    sidecarRaw: '',
    identity: IDENTITY,
  }).length > 0,
);
check(
  'validator REJECTS an unparseable producer sidecar',
  validateClassifierOutput({
    material: 'true',
    reason: 'material-path-changed',
    sidecarRaw: '{not json',
    identity: IDENTITY,
  }).length > 0,
);
check(
  'validator REJECTS a sidecar that disagrees on material (producer id renamed)',
  validateClassifierOutput({
    material: 'false',
    reason: 'material-path-changed',
    sidecarRaw: GOOD_SIDECAR,
    identity: IDENTITY,
  }).length > 0,
);
check(
  'validator REJECTS a sidecar that disagrees on reason',
  validateClassifierOutput({
    material: 'true',
    reason: 'unresolved-or-empty-change-set',
    sidecarRaw: GOOD_SIDECAR,
    identity: IDENTITY,
  }).length > 0,
);
check(
  'validator REJECTS a non-boolean sidecar material',
  validateClassifierOutput({
    material: 'true',
    reason: 'material-path-changed',
    sidecarRaw: sidecarOf('true', 'material-path-changed'),
    identity: IDENTITY,
  }).length > 0,
);
// --- 11b. JSON shapes cannot route around the sidecar checks ------------------
//
// Reviewed MEDIUM: `sidecar` was both the parsed value and the parse-failure
// sentinel, so the four bytes `null` parsed SUCCESSFULLY to null, matched the
// `sidecar !== null` guard, and skipped the classification, agreement and
// staleness checks entirely — with valid step outputs the gate PASSED on a
// sidecar that asserted nothing. Parse success and parsed value are now
// separate facts, and the value must be a non-null, non-array object.
const NON_OBJECT_SIDECARS = [
  ['null (the exact reviewed bypass)', 'null'],
  ['an empty array', '[]'],
  ['a populated array', '[{"material":true,"reason":"material-path-changed"}]'],
  ['a JSON string', '"string"'],
  ['the number 0', '0'],
  ['the number 1', '1'],
  ['boolean false', 'false'],
  ['boolean true', 'true'],
  ['a quoted null', '"null"'],
  ['whitespace-padded null', '  null  '],
];
for (const [label, raw] of NON_OBJECT_SIDECARS) {
  const errors = validateClassifierOutput({
    material: 'true',
    reason: 'material-path-changed',
    sidecarRaw: raw,
    identity: IDENTITY,
  });
  check(`validator REJECTS a sidecar that is ${label}`, errors.length > 0, raw);
  check(
    `validator rejects ${label} as a non-object sidecar, not by accident`,
    errors.some((error) => /must be a JSON object/.test(error)),
    errors.join(' | '),
  );
}
for (const raw of ['{not json', '', '{"material":true,', 'undefined', "{'material':true}"]) {
  check(
    `validator REJECTS malformed sidecar JSON ${JSON.stringify(raw)}`,
    validateClassifierOutput({
      material: 'true',
      reason: 'material-path-changed',
      sidecarRaw: raw,
      identity: IDENTITY,
    }).length > 0,
  );
}
// An object shape still has to pass everything — no bypass was introduced.
check(
  'a non-null object sidecar still undergoes full material/reason/identity validation',
  validateClassifierOutput({
    material: 'true',
    reason: 'material-path-changed',
    sidecarRaw: '{}',
    identity: IDENTITY,
  }).length > 0,
);

// --- 11c. material/reason must be a semantically possible PAIR ----------------
//
// Reviewed MEDIUM: each field was validated against its own vocabulary, so
// every contradictory cross-product was accepted — including
// `material=false reason=material-path-changed`, a MATERIAL change reported as
// non-material, which skips build + header matrix + indexability under SUCCESS.
check(
  'REASON_MATERIALITY covers exactly the valid reason vocabulary',
  Object.keys(REASON_MATERIALITY).length === VALID_REASONS.length &&
    VALID_REASONS.every((reason) =>
      Object.prototype.hasOwnProperty.call(REASON_MATERIALITY, reason),
    ),
);
check(
  'both fail-closed reasons imply MATERIAL',
  REASON_MATERIALITY['unresolved-or-empty-change-set'] === true &&
    REASON_MATERIALITY['material-path-changed'] === true,
);
check(
  'only the affirmative allowlist reason implies non-material',
  REASON_MATERIALITY['only-allowlisted-non-material-paths'] === false,
);
// The complete cross-product: every pair is asserted, valid or not.
for (const materialValue of ['true', 'false']) {
  for (const reason of VALID_REASONS) {
    const expectedValid = REASON_MATERIALITY[reason] === (materialValue === 'true');
    check(
      `isConsistentClassification("${materialValue}", "${reason}") === ${expectedValid}`,
      isConsistentClassification(materialValue, reason) === expectedValid,
    );
    const errors = validateClassifierOutput({
      material: materialValue,
      reason,
      sidecarRaw: sidecarOf(materialValue === 'true', reason),
      identity: IDENTITY,
    });
    if (expectedValid) {
      check(
        `validator ACCEPTS the valid mapping material=${materialValue} reason=${reason}`,
        errors.length === 0,
        errors.join(' | '),
      );
    } else {
      check(
        `validator REJECTS the contradictory pair material=${materialValue} reason=${reason}`,
        errors.length > 0,
      );
      check(
        `validator names the contradiction for material=${materialValue} reason=${reason}`,
        errors.some((error) => /contradicts/.test(error)),
        errors.join(' | '),
      );
    }
  }
}
// The three combinations Codex verified as accepted must now each fail.
const CODEX_CONTRADICTIONS = [
  ['false', 'material-path-changed'],
  ['false', 'unresolved-or-empty-change-set'],
  ['true', 'only-allowlisted-non-material-paths'],
];
for (const [materialValue, reason] of CODEX_CONTRADICTIONS) {
  check(
    `reviewed contradiction material=${materialValue} reason=${reason} is REJECTED`,
    validateClassifierOutput({
      material: materialValue,
      reason,
      sidecarRaw: sidecarOf(materialValue === 'true', reason),
      identity: IDENTITY,
    }).length > 0,
  );
}
// A contradictory SIDECAR is rejected even when the step outputs agree with it.
check(
  'validator REJECTS a sidecar whose own material/reason pair is contradictory',
  validateClassifierOutput({
    material: 'false',
    reason: 'material-path-changed',
    sidecarRaw: sidecarOf(false, 'material-path-changed'),
    identity: IDENTITY,
  }).some((error) => /contradicts its own/.test(error)),
);
// And the producer itself can only ever emit consistent pairs.
const PRODUCER_PAIR_INPUTS = [
  null,
  undefined,
  [],
  'src/x.ts',
  ['README.md'],
  ['README.md', 'AUDIT_REPORT.md'],
  ['src/pages/index.astro'],
  ['README.md', 'src/pages/index.astro'],
  ['unknown-root-file.mjs'],
  ['README.md ', 'AUDIT_REPORT.md'],
];
for (const input of PRODUCER_PAIR_INPUTS) {
  const result = classifyChangedPaths(input);
  check(
    `classifier emits a consistent pair for ${JSON.stringify(input)}`,
    isConsistentClassification(String(result.material), result.reason),
    `${result.material}/${result.reason}`,
  );
}

check('VALID_REASONS is a closed, non-empty vocabulary', VALID_REASONS.length === 3);
for (const reason of VALID_REASONS) {
  check(
    `reason "${reason}" is actually produced by the classifier`,
    new RegExp(`'${reason}'`).test(readFileSync(resolve(ROOT, CLASSIFY_SCRIPT), 'utf8')),
  );
}

// --- 12. raw filenames are never trimmed -------------------------------------
//
// Reviewed fail-open: `normalizePath` trimmed, so the legal Git filename
// "README.md " (trailing space) collapsed onto the allowlisted "README.md" and
// an unreviewed material file inherited non-material status. Boundary
// whitespace is part of the name and must be compared byte-for-byte.
const WHITESPACE_VARIANTS = [
  'README.md ',
  ' README.md',
  '  README.md  ',
  'README.md\t',
  '\tREADME.md',
  'README.md\n',
  '\nREADME.md',
  'README.md\r',
  'README .md',
  'READ ME.md',
  'AUDIT_REPORT.md ',
  ' AUDIT_REPORT.md',
  'CryptoBonusWorld_Master_Architecture.md ',
  'SCREENSHOT_PROCESSING_CONSTITUTION_v1.md ',
];
for (const variant of WHITESPACE_VARIANTS) {
  check(
    `whitespace variant ${JSON.stringify(variant)} is MATERIAL (not trimmed onto the allowlist)`,
    isMaterialPath(variant) === true,
  );
  check(
    `whitespace variant ${JSON.stringify(variant)} is MATERIAL as a change set`,
    classifyChangedPaths([variant]).material === true,
  );
}
// The exact names must still be non-material, so the fix did not simply break
// the allowlist.
for (const entry of NON_MATERIAL_PATHS) {
  check(`exact "${entry}" remains non-material after the no-trim fix`, isNonMaterialPath(entry));
}
check(
  'an allowlisted path plus its trailing-space twin is MATERIAL',
  classifyChangedPaths(['README.md', 'README.md ']).material === true,
);
// Source-level guards: the two removed trims must not come back. Comment lines
// are stripped first — this file's own prose explains what must NOT appear, and
// a guard that trips on its own documentation proves nothing.
const classifierCode = readFileSync(resolve(ROOT, CLASSIFY_SCRIPT), 'utf8')
  .split('\n')
  .filter((line) => !/^\s*\/\//.test(line))
  .join('\n');
check(
  'classifier never trims a resolved path segment',
  !/\.split\('\\0'\)[\s\S]{0,200}\.trim\(\)/.test(classifierCode),
);
check('classifier never drops segments with filter(Boolean)', !/filter\(Boolean\)/.test(classifierCode));
check(
  'classifier removes only the trailing NUL terminator segment',
  /segments\[segments\.length - 1\] === ''/.test(classifierCode) &&
    /segments\.pop\(\)/.test(classifierCode),
);
check('normalizePath does not trim', !/normalized[^\n]*\.trim\(\)/.test(classifierCode));
check('classifier code contains no .trim() at all', !/\.trim\(\)/.test(classifierCode));

// --- 13. RUNNER_TEMP is required; there is no process-global temp fallback ---
//
// Reviewed LOW: `join(process.env.RUNNER_TEMP || tmpdir(), ...)`. The fallback
// is fail-open — the producer and validator could resolve to different
// directories (binding vacuous), and the process-global temp is not job-scoped
// on a reused/self-hosted runner, so a leftover file could impersonate a
// producer that never ran. RUNNER_TEMP is guaranteed present in the GitHub
// required-gate runtime, so anything else means the runtime is not the one this
// gate was proven against and the step must fail closed.
const SAVED_ENV = {
  RUNNER_TEMP: process.env.RUNNER_TEMP,
  HEAD_SHA: process.env.HEAD_SHA,
  GITHUB_RUN_ID: process.env.GITHUB_RUN_ID,
  GITHUB_RUN_ATTEMPT: process.env.GITHUB_RUN_ATTEMPT,
};
const restoreEnv = () => {
  for (const [name, value] of Object.entries(SAVED_ENV)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
};
const throwsWith = (fn) => {
  try {
    fn();
    return null;
  } catch (error) {
    return String(error.message);
  }
};
try {
  const REJECTED_RUNNER_TEMP = [
    ['unset', undefined, /RUNNER_TEMP is not set/],
    ['empty', '', /RUNNER_TEMP is empty/],
    ['relative', 'runner-temp', /not an absolute path/],
    ['dot-relative', './tmp', /not an absolute path/],
    ['nonexistent absolute', resolve(ROOT, 'no-such-runner-temp-dir-cbw'), /does not exist/],
    ['a file, not a directory', resolve(ROOT, 'package.json'), /is not a directory/],
  ];
  for (const [label, value, expected] of REJECTED_RUNNER_TEMP) {
    if (value === undefined) delete process.env.RUNNER_TEMP;
    else process.env.RUNNER_TEMP = value;
    const message = throwsWith(() => classifierResultFilePath());
    check(`classifierResultFilePath() THROWS on a ${label} RUNNER_TEMP`, message !== null, 'returned a path');
    check(
      `classifierResultFilePath() names the ${label} RUNNER_TEMP problem`,
      typeof message === 'string' && expected.test(message),
      String(message),
    );
    check(
      `classifierResultFilePath() never returns an os.tmpdir() path for a ${label} RUNNER_TEMP`,
      message !== null,
    );
  }
  // A usable RUNNER_TEMP still resolves, so "fails closed" is not vacuous.
  process.env.RUNNER_TEMP = ROOT;
  const resolvedPath = classifierResultFilePath();
  check(
    'classifierResultFilePath() resolves inside a usable RUNNER_TEMP',
    resolvedPath === resolve(ROOT, SIDECAR_BASENAME),
    resolvedPath,
  );

  // Run identity: every field is required, from the validator's own environment.
  process.env.HEAD_SHA = 'a'.repeat(40);
  process.env.GITHUB_RUN_ID = '99';
  process.env.GITHUB_RUN_ATTEMPT = '2';
  const identity = resolveRunIdentity();
  check(
    'resolveRunIdentity() reads head sha, run id and run attempt from the environment',
    identity.headSha === 'a'.repeat(40) && identity.runId === '99' && identity.runAttempt === '2',
    JSON.stringify(identity),
  );
  check('RUN_IDENTITY_ENV is the exact bound triple', RUN_IDENTITY_ENV.length === 3);
  for (const name of RUN_IDENTITY_ENV) {
    for (const bad of [undefined, '']) {
      const saved = process.env[name];
      if (bad === undefined) delete process.env[name];
      else process.env[name] = bad;
      check(
        `resolveRunIdentity() THROWS when ${name} is ${bad === undefined ? 'unset' : 'empty'}`,
        throwsWith(() => resolveRunIdentity()) !== null,
      );
      process.env[name] = saved;
    }
  }
} finally {
  restoreEnv();
}

// =============================================================================
// S2-03 — THE MATRIX FOUNDATION
// =============================================================================

// --- 14. the applicability vocabulary is closed and pinned -------------------
check('exactly two gates are migrated in S2-03', GATE_IDS.length === 2, GATE_IDS.join(','));
check(
  'the migrated gates are the two named by the stage',
  JSON.stringify([...GATE_IDS]) === JSON.stringify(['global-header-interaction', 'public-seo-metadata']),
  GATE_IDS.join(','),
);
check(
  'applicability vocabulary is exactly APPLICABLE/NOT_APPLICABLE',
  JSON.stringify([...APPLICABILITY_VALUES]) === JSON.stringify(['APPLICABLE', 'NOT_APPLICABLE']),
);
check(
  'the outcome vocabulary is closed and includes an explicit FAIL',
  JSON.stringify([...GATE_OUTCOMES]) === JSON.stringify(['PASS', 'NOT_APPLICABLE', 'FAIL']),
);
check(
  'the ACCEPTED outcome vocabulary excludes FAIL',
  JSON.stringify([...ACCEPTED_GATE_OUTCOMES]) === JSON.stringify(['PASS', 'NOT_APPLICABLE']),
);
check(
  'APPLICABILITY_REASONS covers exactly the valid reason vocabulary',
  Object.keys(APPLICABILITY_REASONS).length === VALID_APPLICABILITY_REASONS.length,
);
check(
  'both fail-closed applicability reasons imply APPLICABLE',
  APPLICABILITY_REASONS['unresolved-or-empty-change-set'] === 'APPLICABLE' &&
    APPLICABILITY_REASONS['relevant-path-changed'] === 'APPLICABLE',
);
check(
  'only the affirmative inert-paths reason implies NOT_APPLICABLE',
  APPLICABILITY_REASONS['only-gate-irrelevant-paths'] === 'NOT_APPLICABLE',
);
// The complete cross-product, valid or not.
for (const value of APPLICABILITY_VALUES) {
  for (const reason of VALID_APPLICABILITY_REASONS) {
    check(
      `isConsistentApplicability("${value}", "${reason}") === ${APPLICABILITY_REASONS[reason] === value}`,
      isConsistentApplicability(value, reason) === (APPLICABILITY_REASONS[reason] === value),
    );
  }
}
for (const bad of [undefined, null, '', 'applicable', 'APPLICABLE ', 'SKIPPED', 'PASS', 0, true]) {
  check(
    `isConsistentApplicability rejects applicability ${JSON.stringify(bad)}`,
    isConsistentApplicability(bad, 'relevant-path-changed') === false,
  );
}

// --- 15. NOT_APPLICABLE is fail-closed and evidence-backed -------------------
//
// A gate is irrelevant ONLY when every changed path is verbatim in its bounded
// inert set. Everything else — including every unknown path — is relevant.
for (const gateId of GATE_IDS) {
  const gate = GATES[gateId];
  check(
    `gate "${gateId}" inert set is bounded (<= 8 entries)`,
    gate.irrelevantPaths.length <= 8,
    String(gate.irrelevantPaths.length),
  );
  for (const entry of gate.irrelevantPaths) {
    check(
      `gate "${gateId}" inert entry "${entry}" is an exact path, not a prefix/glob`,
      !entry.includes('*') && !entry.endsWith('/'),
      entry,
    );
    // EXISTENCE IS ASSERTED ONLY FOR THE GATE-SPECIFIC ENTRIES.
    //
    // The inherited S2-01 allowlist entries are NAMES, not required files: the
    // classifier's model is "this exact path, if it ever appears in a diff, is
    // inert", and several of those governance documents are deliberately not
    // tracked. Requiring them to exist would make this contract fail on a clean
    // checkout while proving nothing — inertness is proved by the dependency
    // closure check below, not by a file being present.
    //
    // The gate-specific entries are different: each names the OTHER gate's
    // exclusive workflow file or script, and a stale name there would silently
    // widen this gate's inert set to a path nobody reviewed.
    if (!UNIVERSALLY_INERT_PATHS.includes(entry)) {
      check(
        `gate "${gateId}" gate-specific inert entry "${entry}" is a real file`,
        existsSync(resolve(ROOT, entry)),
        entry,
      );
    }
  }
  // The S2-01 allowlist is a SUBSET of every gate's inert set — that is what makes
  // "material=false implies every gate NOT_APPLICABLE" a theorem rather than a
  // coincidence, and it is why the two lists cannot be maintained independently.
  for (const entry of UNIVERSALLY_INERT_PATHS) {
    check(
      `gate "${gateId}" inherits the S2-01 non-material allowlist entry "${entry}"`,
      gate.irrelevantPaths.includes(entry),
    );
  }
  // Fail-closed inputs.
  for (const bad of [null, undefined, [], 'src/x.ts', 42, {}]) {
    check(
      `gate "${gateId}" is APPLICABLE for an unresolvable change set ${JSON.stringify(bad)}`,
      classifyGateApplicability(gateId, bad).applicability === 'APPLICABLE',
    );
  }
  for (const bad of ['/abs/path.ts', '../escape.ts', 'a/../../b.ts', '', '   ']) {
    check(
      `gate "${gateId}" treats malformed path ${JSON.stringify(bad)} as RELEVANT`,
      classifyGateApplicability(gateId, [bad]).applicability === 'APPLICABLE',
    );
  }
  // A whitespace twin of an inert entry is a DIFFERENT file and must be relevant.
  for (const entry of gate.irrelevantPaths) {
    check(
      `gate "${gateId}" treats the trailing-space twin of "${entry}" as RELEVANT`,
      classifyGateApplicability(gateId, [`${entry} `]).applicability === 'APPLICABLE',
    );
  }
  // The inert set really is inert: NOT_APPLICABLE only for exactly those paths.
  check(
    `gate "${gateId}" is NOT_APPLICABLE when only its inert paths changed`,
    classifyGateApplicability(gateId, [...gate.irrelevantPaths]).applicability === 'NOT_APPLICABLE',
  );
  check(
    `gate "${gateId}" NOT_APPLICABLE carries the affirmative justification`,
    classifyGateApplicability(gateId, [...gate.irrelevantPaths]).reason === 'only-gate-irrelevant-paths',
  );
  // One relevant path poisons the whole change set.
  check(
    `gate "${gateId}" is APPLICABLE when one unknown path joins its inert paths`,
    classifyGateApplicability(gateId, [...gate.irrelevantPaths, 'unknown-new-file.mjs']).applicability ===
      'APPLICABLE',
  );
  for (const relevant of ['src/pages/index.astro', 'package.json', 'astro.config.mjs', 'public/robots.txt']) {
    check(
      `gate "${gateId}" is APPLICABLE for build input "${relevant}"`,
      classifyGateApplicability(gateId, [relevant]).applicability === 'APPLICABLE',
    );
  }
}

// --- 15b. INERT-SET DRIFT: an inert path must be outside the gate's real
//          dependency closure, derived LIVE from the S2-02 engine.
//
// This is the S2-03 analogue of the allowlist dependency-drift scan. Claiming a
// file inert is only safe while it really is outside what the gate executes and
// reads. Both the LEGACY job and the UNIFIED blocker job are derived, so the
// moment either one starts depending on a claimed-inert file, this fails instead
// of letting the gate keep skipping on it.
const packageScripts = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).scripts ?? {};
const repoFiles = (() => {
  const raw = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 256 }).split('\0');
  if (raw[raw.length - 1] === '') raw.pop();
  return raw;
})();
const readRepoFile = (path) => {
  try {
    return readFileSync(resolve(ROOT, path), 'utf8');
  } catch {
    return null;
  }
};
const unifiedDoc = parseWorkflow(readFileSync(REQUIRED_WORKFLOW, 'utf8'));
for (const gateId of GATE_IDS) {
  const gate = GATES[gateId];
  const legacyDoc = parseWorkflow(readFileSync(resolve(ROOT, gate.legacyWorkflow), 'utf8'));
  const surfaces = [
    ['legacy', deriveJobFacts({
      workflowFile: gate.legacyWorkflow.split('/').pop(),
      workflowDoc: legacyDoc,
      jobId: gate.legacyJobId,
      packageScripts,
      repoFiles,
      readFile: readRepoFile,
    })],
    ['unified', deriveJobFacts({
      workflowFile: 'cbw-master-required-gate.yml',
      workflowDoc: unifiedDoc,
      jobId: gate.jobId,
      packageScripts,
      repoFiles,
      readFile: readRepoFile,
    })],
  ];
  for (const [which, facts] of surfaces) {
    const closure = [
      ...facts.dependencies.executed,
      ...facts.dependencies.readInputs,
      ...facts.dependencies.sharedConfig,
      ...facts.dependencies.localActions,
    ];
    for (const entry of gate.irrelevantPaths) {
      check(
        `gate "${gateId}" inert entry "${entry}" is outside its ${which} dependency closure`,
        !closure.includes(entry),
        `${which} closure: ${closure.join(',')}`,
      );
    }
    // And every real dependency must be RELEVANT — the direction that catches a
    // claimed-inert file that is actually load-bearing.
    for (const path of closure) {
      check(
        `gate "${gateId}" treats its ${which} dependency "${path}" as RELEVANT`,
        classifyGateApplicability(gateId, [path]).applicability === 'APPLICABLE',
        path,
      );
    }
  }
  // The legacy TRIGGER surface must be relevant too, or the unified gate would
  // skip work the legacy gate would have run.
  const legacyPaths = (legacyDoc?.on ?? legacyDoc?.true)?.pull_request?.paths ?? [];
  check(`legacy "${gateId}" still declares a path filter`, legacyPaths.length > 0);
  for (const pattern of legacyPaths) {
    const probe = pattern.endsWith('/**') ? `${pattern.slice(0, -2)}__probe__.astro` : pattern;
    check(
      `legacy "${gateId}" trigger "${pattern}" is RELEVANT to the unified blocker`,
      classifyGateApplicability(gateId, [probe]).applicability === 'APPLICABLE',
      probe,
    );
  }
}

// --- 15c. materiality/applicability consistency is a theorem ------------------
const applicabilityOf = (paths) =>
  classifyAllGates({
    paths,
    material: String(classifyChangedPaths(paths).material),
    materialReason: classifyChangedPaths(paths).reason,
  });
check(
  'an allowlisted-only change set makes EVERY gate NOT_APPLICABLE',
  GATE_IDS.every((gateId) => applicabilityOf([...NON_MATERIAL_PATHS]).gates[gateId] === 'NOT_APPLICABLE'),
);
check(
  'an unresolved change set makes EVERY gate APPLICABLE',
  GATE_IDS.every((gateId) => applicabilityOf(null).gates[gateId] === 'APPLICABLE'),
);
check(
  'a source change makes EVERY gate APPLICABLE',
  GATE_IDS.every((gateId) => applicabilityOf(['src/pages/index.astro']).gates[gateId] === 'APPLICABLE'),
);
// The per-gate distinction really exists: the other gate's exclusive script is
// inert here and relevant there.
const seoOnly = applicabilityOf(['scripts/seo/public-seo-metadata-schema-test.mjs']);
check(
  'a public-SEO-only change leaves the global header blocker NOT_APPLICABLE',
  seoOnly.gates['global-header-interaction'] === 'NOT_APPLICABLE',
);
check(
  'a public-SEO-only change keeps the public SEO blocker APPLICABLE',
  seoOnly.gates['public-seo-metadata'] === 'APPLICABLE',
);
const headerOnly = applicabilityOf(['scripts/ui/global-header-interaction-browser-smoke.mjs']);
check(
  'a global-header-only change keeps the global header blocker APPLICABLE',
  headerOnly.gates['global-header-interaction'] === 'APPLICABLE',
);
check(
  'a global-header-only change leaves the public SEO blocker NOT_APPLICABLE',
  headerOnly.gates['public-seo-metadata'] === 'NOT_APPLICABLE',
);
for (const paths of [null, [], ['README.md'], ['src/pages/index.astro'], ['unknown.mjs'], [...NON_MATERIAL_PATHS]]) {
  check(
    `materiality/applicability are consistent for ${JSON.stringify(paths)}`,
    checkApplicabilityMaterialityConsistency(applicabilityOf(paths)).length === 0,
    checkApplicabilityMaterialityConsistency(applicabilityOf(paths)).join(' | '),
  );
}
// A hand-forged contradictory decision is REJECTED.
check(
  'an APPLICABLE gate alongside material=false is rejected as contradictory',
  checkApplicabilityMaterialityConsistency({
    gates: Object.fromEntries(GATE_IDS.map((gateId) => [gateId, 'APPLICABLE'])),
    reasons: Object.fromEntries(GATE_IDS.map((gateId) => [gateId, 'relevant-path-changed'])),
    material: 'false',
  }).length > 0,
);
check(
  'a NOT_APPLICABLE gate justified by a relevance reason is rejected as contradictory',
  checkApplicabilityMaterialityConsistency({
    gates: Object.fromEntries(GATE_IDS.map((gateId) => [gateId, 'NOT_APPLICABLE'])),
    reasons: Object.fromEntries(GATE_IDS.map((gateId) => [gateId, 'relevant-path-changed'])),
    material: 'true',
  }).length > 0,
);

// --- 16. the applicability validator, driven with hostile inputs -------------
const APP_IDENTITY = Object.freeze({ headSha: 'ab'.repeat(20), runId: '515151', runAttempt: '1' });
const goodProduced = computeApplicability({ paths: ['src/pages/index.astro'], identity: APP_IDENTITY });
const goodDecision = goodProduced.decision;
const goodDigest = goodProduced.digest;
const goodGateOutputs = Object.fromEntries(
  GATE_IDS.map((gateId) => [GATES[gateId].outputName, goodDecision.gates[gateId]]),
);
const goodSidecar = JSON.stringify({
  gates: goodDecision.gates,
  reasons: goodDecision.reasons,
  changedPaths: goodDecision.changedPaths,
  material: goodDecision.material,
  materialReason: goodDecision.materialReason,
  digest: goodDigest,
  ...APP_IDENTITY,
});
const validateApp = (overrides = {}) =>
  validateApplicabilityOutput({
    applicabilityRaw: JSON.stringify(goodDecision),
    digest: goodDigest,
    gateOutputs: goodGateOutputs,
    material: goodDecision.material,
    sidecarRaw: goodSidecar,
    identity: APP_IDENTITY,
    ...overrides,
  });
check('applicability validator ACCEPTS a well-formed current decision', validateApp().length === 0, validateApp().join(' | '));
const APP_REJECTIONS = [
  ['a missing decision (producer deleted)', { applicabilityRaw: undefined }],
  ['an empty decision (producer id renamed)', { applicabilityRaw: '' }],
  ['unparseable JSON', { applicabilityRaw: '{not json' }],
  ['a literal null decision', { applicabilityRaw: 'null' }],
  ['an array decision', { applicabilityRaw: '[]' }],
  ['a decision with no gates object', { applicabilityRaw: '{"reasons":{}}' }],
  ['a missing digest', { digest: undefined }],
  ['an empty digest', { digest: '' }],
  ['a forged digest', { digest: 'f'.repeat(64) }],
  ['a missing sidecar', { sidecarRaw: null }],
  ['an empty sidecar', { sidecarRaw: '' }],
  ['an unparseable sidecar', { sidecarRaw: '{' }],
  ['a null sidecar', { sidecarRaw: 'null' }],
  [
    'a STALE sidecar from another run',
    { sidecarRaw: JSON.stringify({ ...JSON.parse(goodSidecar), runId: '515150' }) },
  ],
  [
    'a STALE sidecar from another PR head',
    { sidecarRaw: JSON.stringify({ ...JSON.parse(goodSidecar), headSha: 'cd'.repeat(20) }) },
  ],
  [
    'a STALE sidecar from another re-run attempt',
    { sidecarRaw: JSON.stringify({ ...JSON.parse(goodSidecar), runAttempt: '2' }) },
  ],
  ['an unidentifiable run', { identity: null }],
  ['an identity with an empty field', { identity: { ...APP_IDENTITY, runId: '' } }],
  ['a materiality output that is missing', { material: undefined }],
  ['a materiality output that disagrees with the decision', { material: 'false' }],
  [
    'a per-gate convenience output that disagrees with the decision',
    { gateOutputs: { ...goodGateOutputs, [GATES[GATE_IDS[0]].outputName]: 'NOT_APPLICABLE' } },
  ],
  [
    'a per-gate convenience output that is empty (renamed producer)',
    { gateOutputs: { ...goodGateOutputs, [GATES[GATE_IDS[0]].outputName]: '' } },
  ],
  [
    'a decision missing one registered gate',
    {
      applicabilityRaw: JSON.stringify({
        ...goodDecision,
        gates: { [GATE_IDS[0]]: goodDecision.gates[GATE_IDS[0]] },
      }),
    },
  ],
  [
    'a decision with an out-of-vocabulary applicability',
    {
      applicabilityRaw: JSON.stringify({
        ...goodDecision,
        gates: { ...goodDecision.gates, [GATE_IDS[0]]: 'SKIPPED' },
      }),
    },
  ],
  [
    'a decision with a contradictory applicability/reason pair',
    {
      applicabilityRaw: JSON.stringify({
        ...goodDecision,
        gates: { ...goodDecision.gates, [GATE_IDS[0]]: 'NOT_APPLICABLE' },
      }),
    },
  ],
];
for (const [label, overrides] of APP_REJECTIONS) {
  check(`applicability validator REJECTS ${label}`, validateApp(overrides).length > 0);
}

// --- 17. the per-blocker result emitter --------------------------------------
const emitterInput = (overrides = {}) => ({
  gateId: GATE_IDS[0],
  applicability: 'APPLICABLE',
  digest: goodDigest,
  stepOutcomes: GATES[GATE_IDS[0]].steps.map((step) => ({ name: step.command, outcome: 'success' })),
  ...overrides,
});
check(
  'result emitter publishes PASS when an applicable gate ran every step successfully',
  evaluateGateResult(emitterInput()).result === 'PASS',
);
check(
  'result emitter publishes NOT_APPLICABLE when an inapplicable gate skipped every step',
  evaluateGateResult(
    emitterInput({
      applicability: 'NOT_APPLICABLE',
      stepOutcomes: GATES[GATE_IDS[0]].steps.map((step) => ({ name: step.command, outcome: 'skipped' })),
    }),
  ).result === 'NOT_APPLICABLE',
);
const EMITTER_FAILS = [
  ['an unknown gate id', { gateId: 'nope' }],
  ['a missing gate id', { gateId: undefined }],
  ['an empty applicability (renamed classifier output)', { applicability: '' }],
  ['a missing applicability', { applicability: undefined }],
  ['an out-of-vocabulary applicability', { applicability: 'SKIPPED' }],
  ['a missing evidence digest', { digest: undefined }],
  ['an empty evidence digest', { digest: '' }],
  ['no step outcomes at all', { stepOutcomes: [] }],
  ['null step outcomes', { stepOutcomes: null }],
  [
    'a deleted blocking step (arity mismatch)',
    { stepOutcomes: GATES[GATE_IDS[0]].steps.slice(1).map((step) => ({ name: step.command, outcome: 'success' })) },
  ],
  [
    'an APPLICABLE gate whose step was SKIPPED',
    {
      stepOutcomes: GATES[GATE_IDS[0]].steps.map((step, index) => ({
        name: step.command,
        outcome: index === 0 ? 'skipped' : 'success',
      })),
    },
  ],
  [
    'an APPLICABLE gate whose step FAILED',
    {
      stepOutcomes: GATES[GATE_IDS[0]].steps.map((step, index) => ({
        name: step.command,
        outcome: index === 0 ? 'failure' : 'success',
      })),
    },
  ],
  [
    'an APPLICABLE gate whose step reported nothing',
    {
      stepOutcomes: GATES[GATE_IDS[0]].steps.map((step, index) => ({
        name: step.command,
        outcome: index === 0 ? '' : 'success',
      })),
    },
  ],
  [
    'a NOT_APPLICABLE gate that actually RAN its work',
    {
      applicability: 'NOT_APPLICABLE',
      stepOutcomes: GATES[GATE_IDS[0]].steps.map((step) => ({ name: step.command, outcome: 'success' })),
    },
  ],
];
for (const [label, overrides] of EMITTER_FAILS) {
  const evaluation = evaluateGateResult(emitterInput(overrides));
  check(`result emitter publishes FAIL for ${label}`, evaluation.result === 'FAIL');
  check(`result emitter explains its FAIL for ${label}`, evaluation.errors.length > 0);
}
check(
  'result emitter never invents a result outside the closed vocabulary',
  [
    evaluateGateResult(emitterInput()),
    evaluateGateResult(emitterInput({ applicability: 'SKIPPED' })),
  ].every((evaluation) => GATE_OUTCOMES.includes(evaluation.result)),
);

// --- 18. THE AGGREGATOR FAIL-CLOSED MATRIX -----------------------------------
//
// This is the whole point of the stage: the stable context may go green ONLY when
// every expected blocker is provably PASS or provably, evidentially
// NOT_APPLICABLE.
const evidenceFor = (gateId, applicability, digest = goodDigest) =>
  JSON.stringify({ gateId, applicability, digest });
const passingGates = Object.fromEntries(
  GATE_IDS.map((gateId) => [
    gateId,
    { jobResult: 'success', result: 'PASS', evidence: evidenceFor(gateId, 'APPLICABLE') },
  ]),
);
const agg = (overrides = {}) =>
  aggregate({
    classifyResult: 'success',
    material: goodDecision.material,
    applicabilityRaw: JSON.stringify(goodDecision),
    digest: goodDigest,
    gates: passingGates,
    ...overrides,
  });

// 8. PASS + PASS => GREEN.
check('AGGREGATOR: PASS + PASS is GREEN', agg().ok === true, agg().errors.join(' | '));

// 9. PASS + validated NOT_APPLICABLE => GREEN.
const mixedProduced = computeApplicability({
  paths: ['scripts/seo/public-seo-metadata-schema-test.mjs'],
  identity: APP_IDENTITY,
});
const mixedGates = {
  'global-header-interaction': {
    jobResult: 'success',
    result: 'NOT_APPLICABLE',
    evidence: evidenceFor('global-header-interaction', 'NOT_APPLICABLE', mixedProduced.digest),
  },
  'public-seo-metadata': {
    jobResult: 'success',
    result: 'PASS',
    evidence: evidenceFor('public-seo-metadata', 'APPLICABLE', mixedProduced.digest),
  },
};
const mixed = aggregate({
  classifyResult: 'success',
  material: mixedProduced.decision.material,
  applicabilityRaw: JSON.stringify(mixedProduced.decision),
  digest: mixedProduced.digest,
  gates: mixedGates,
});
check('AGGREGATOR: PASS + validated NOT_APPLICABLE is GREEN', mixed.ok === true, mixed.errors.join(' | '));

// Every gate NOT_APPLICABLE, on an allowlisted-only diff.
const inertProduced = computeApplicability({ paths: [...NON_MATERIAL_PATHS], identity: APP_IDENTITY });
const inertAggregate = aggregate({
  classifyResult: 'success',
  material: inertProduced.decision.material,
  applicabilityRaw: JSON.stringify(inertProduced.decision),
  digest: inertProduced.digest,
  gates: Object.fromEntries(
    GATE_IDS.map((gateId) => [
      gateId,
      {
        jobResult: 'success',
        result: 'NOT_APPLICABLE',
        evidence: evidenceFor(gateId, 'NOT_APPLICABLE', inertProduced.digest),
      },
    ]),
  ),
});
check(
  'AGGREGATOR: every gate evidentially NOT_APPLICABLE is GREEN',
  inertAggregate.ok === true,
  inertAggregate.errors.join(' | '),
);

const FIRST = GATE_IDS[0];
const withFirst = (patch) => ({ gates: { ...passingGates, [FIRST]: { ...passingGates[FIRST], ...patch } } });
const AGGREGATOR_FAILURES = [
  // 11. a classifier failure cannot be hidden.
  ['the classifier job FAILED', { classifyResult: 'failure' }],
  ['the classifier job was CANCELLED', { classifyResult: 'cancelled' }],
  ['the classifier job was SKIPPED', { classifyResult: 'skipped' }],
  ['the classifier job result is missing', { classifyResult: undefined }],
  ['the classifier job result is empty', { classifyResult: '' }],
  // classifier output invalid.
  ['the classifier applicability output is missing', { applicabilityRaw: undefined }],
  ['the classifier applicability output is empty', { applicabilityRaw: '' }],
  ['the classifier applicability output is unparseable', { applicabilityRaw: '{' }],
  ['the classifier applicability output is a literal null', { applicabilityRaw: 'null' }],
  ['the classifier digest is missing', { digest: undefined }],
  [
    'the classifier decision contradicts its own materiality',
    { material: 'false' },
  ],
  [
    'the classifier decision omits a registered gate',
    {
      applicabilityRaw: JSON.stringify({
        ...goodDecision,
        gates: { [FIRST]: goodDecision.gates[FIRST] },
        reasons: { [FIRST]: goodDecision.reasons[FIRST] },
      }),
    },
  ],
  // 4/5. blocker failure and cancellation.
  ['a blocker job FAILED', withFirst({ jobResult: 'failure' })],
  ['a blocker job was CANCELLED', withFirst({ jobResult: 'cancelled' })],
  // 12. a skipped blocker cannot silently count as success.
  ['a blocker job was SKIPPED', withFirst({ jobResult: 'skipped' })],
  ['a blocker job result is missing', withFirst({ jobResult: undefined })],
  ['a blocker job result is empty', withFirst({ jobResult: '' })],
  // 6. missing result.
  ['a blocker published NO result', withFirst({ result: undefined })],
  ['a blocker published an empty result', withFirst({ result: '' })],
  ['an expected blocker produced nothing at all', { gates: { [GATE_IDS[1]]: passingGates[GATE_IDS[1]] } }],
  ['every blocker produced nothing at all', { gates: {} }],
  // 7. unknown result.
  ['a blocker published an unknown result', withFirst({ result: 'GREEN' })],
  ['a blocker published a lowercase result', withFirst({ result: 'pass' })],
  ['a blocker published a padded result', withFirst({ result: 'PASS ' })],
  ['a blocker published GitHub\'s own `skipped`', withFirst({ result: 'skipped' })],
  ['a blocker published FAIL', withFirst({ result: 'FAIL' })],
  // 10. NOT_APPLICABLE requires valid applicability evidence.
  [
    'a blocker claimed NOT_APPLICABLE while the classifier said APPLICABLE',
    withFirst({ result: 'NOT_APPLICABLE', evidence: evidenceFor(FIRST, 'NOT_APPLICABLE') }),
  ],
  [
    'a blocker claimed PASS while the classifier said NOT_APPLICABLE',
    {
      material: inertProduced.decision.material,
      applicabilityRaw: JSON.stringify(inertProduced.decision),
      digest: inertProduced.digest,
      gates: Object.fromEntries(
        GATE_IDS.map((gateId) => [
          gateId,
          {
            jobResult: 'success',
            result: 'PASS',
            evidence: evidenceFor(gateId, 'APPLICABLE', inertProduced.digest),
          },
        ]),
      ),
    },
  ],
  ['a blocker published no evidence', withFirst({ evidence: undefined })],
  ['a blocker published unparseable evidence', withFirst({ evidence: '{' })],
  ['a blocker published null evidence', withFirst({ evidence: 'null' })],
  [
    'a blocker published evidence naming a different gate',
    withFirst({ evidence: evidenceFor(GATE_IDS[1], 'APPLICABLE') }),
  ],
  // 13. a stale applicability sidecar/result cannot be laundered through the DAG.
  [
    'a blocker echoed a STALE evidence digest',
    withFirst({ evidence: evidenceFor(FIRST, 'APPLICABLE', 'f'.repeat(64)) }),
  ],
  [
    'a blocker ran under an applicability the classifier never decided',
    withFirst({ evidence: evidenceFor(FIRST, 'NOT_APPLICABLE') }),
  ],
  ['a result arrived for an unregistered gate', { gates: { ...passingGates, 'made-up-gate': passingGates[FIRST] } }],
];
for (const [label, overrides] of AGGREGATOR_FAILURES) {
  const outcome = agg(overrides);
  check(`AGGREGATOR fails closed when ${label}`, outcome.ok === false);
  check(`AGGREGATOR explains its failure when ${label}`, outcome.errors.length > 0);
}
// And the aggregator never passes on silence: the completely empty input.
check(
  'AGGREGATOR fails closed on completely empty input',
  aggregate({
    classifyResult: undefined,
    material: undefined,
    applicabilityRaw: undefined,
    digest: undefined,
    gates: {},
  }).ok === false,
);

// --- 19. specialized path-filtered workflows are NOT queried externally -------
//
// The required gate owns its execution and its outcomes. If it ever read another
// workflow's status, a path-filtered child that never ran would present as
// "nothing failed" — the exact deadlock/fail-open this whole design avoids.
const requiredWorkflowText = readFileSync(REQUIRED_WORKFLOW, 'utf8');
for (const forbidden of [
  'workflow_run',
  'github-script',
  'gh api',
  'check-runs',
  'GITHUB_TOKEN',
  'secrets.',
  'statuses',
]) {
  check(
    `required workflow never reaches for external check status ("${forbidden}")`,
    !requiredWorkflowText.includes(forbidden),
  );
}
for (const gateId of GATE_IDS) {
  const gate = GATES[gateId];
  check(
    `the required workflow does not reference the legacy workflow "${gate.legacyWorkflow}" as a dependency`,
    !requiredWorkflowText.includes(`uses: ./${gate.legacyWorkflow}`),
  );
  // The legacy workflow is LEFT IN PLACE and still independently blocking.
  check(`legacy workflow "${gate.legacyWorkflow}" still exists`, existsSync(resolve(ROOT, gate.legacyWorkflow)));
  const legacyDoc = loadWorkflow(resolve(ROOT, gate.legacyWorkflow));
  check(
    `legacy workflow "${gate.legacyWorkflow}" job is still blocking`,
    legacyDoc?.jobs?.[gate.legacyJobId]?.['continue-on-error'] !== true,
  );
  // Command parity, restated here so a reader of the contract test sees it too.
  check(
    `unified blocker "${gateId}" declares the full legacy command sequence`,
    gateCommands(gateId).length === 4,
    JSON.stringify(gateCommands(gateId)),
  );
}

if (failures.length) {
  console.error(`CBW MASTER REQUIRED GATE CONTRACT: FAIL (${failures.length}/${checks})`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`CBW MASTER REQUIRED GATE CONTRACT: PASS (${checks}/${checks})`);
}
