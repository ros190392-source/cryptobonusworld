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
//   9. permissions stay minimal / read-only.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import yaml from 'js-yaml';
import {
  NON_MATERIAL_PATHS,
  isMaterialPath,
  isNonMaterialPath,
  classifyChangedPaths,
  VALID_REASONS,
} from './master-required-gate-classify.mjs';
import { validateClassifierOutput } from './master-required-gate-validate-output.mjs';
import {
  auditProducerConsumerContract,
  ALLOWED_STEP_IF as CONTRACT_ALLOWED_STEP_IF,
} from './master-required-gate-workflow-contract.mjs';

const ROOT = resolve(process.cwd());
const WORKFLOW_DIR = resolve(ROOT, '.github/workflows');
const REQUIRED_WORKFLOW = resolve(WORKFLOW_DIR, 'cbw-master-required-gate.yml');
const HEADER_WORKFLOW = resolve(WORKFLOW_DIR, 'cbw-global-header-interaction.yml');
const REQUIRED_CONTEXT = 'Master required gate';
const HEADER_GATE_SCRIPT = 'scripts/ui/global-header-interaction-browser-smoke.mjs';
const CLASSIFY_SCRIPT = 'scripts/ci/master-required-gate-classify.mjs';
const VALIDATE_SCRIPT = 'scripts/ci/master-required-gate-validate-output.mjs';
const ALLOWED_STEP_IF = CONTRACT_ALLOWED_STEP_IF;

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
const jobIds = Object.keys(required?.jobs ?? {});
check('required workflow has exactly one job', jobIds.length === 1, jobIds.join(','));
const job = required?.jobs?.[jobIds[0]];
check(
  'required check context name is stable',
  job?.name === REQUIRED_CONTEXT,
  `actual=${job?.name}`,
);
check(
  'required job declares no matrix (context name cannot fan out)',
  !job?.strategy,
);

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

// --- 3. the required job cannot be skipped or softened -----------------------
check('required job has no job-level if', !Object.prototype.hasOwnProperty.call(job ?? {}, 'if'));
check('required job is not continue-on-error', job?.['continue-on-error'] !== true);
check('required job has no needs (not an aggregator)', !job?.needs);
check('required job has a timeout', typeof job?.['timeout-minutes'] === 'number');

const steps = job?.steps ?? [];
for (const step of steps) {
  const label = step.name ?? step.uses ?? step.run ?? '<unnamed>';
  check(`step "${label}" is not continue-on-error`, step['continue-on-error'] !== true);
  if (Object.prototype.hasOwnProperty.call(step, 'if')) {
    check(
      `step "${label}" uses only the fail-closed material condition`,
      String(step.if).trim() === ALLOWED_STEP_IF,
      `actual=${step.if}`,
    );
  }
  if (typeof step.run === 'string') {
    check(
      `step "${label}" does not swallow failures`,
      !/\|\|\s*(true|exit\s+0|:)\b/.test(step.run) && !/set\s+\+e/.test(step.run),
      step.run,
    );
  }
}

// --- 6. header-gate failure propagates --------------------------------------
const headerStep = steps.find((step) => String(step.run ?? '').includes(HEADER_GATE_SCRIPT));
check('required job runs the header hard-gate script itself', Boolean(headerStep));
check(
  'header hard-gate step failure propagates to the required job',
  headerStep?.['continue-on-error'] !== true &&
    !/\|\|/.test(String(headerStep?.run ?? '')) &&
    (!headerStep?.if || String(headerStep.if).trim() === ALLOWED_STEP_IF),
);
// The gate script itself must fail-closed on a failed check.
const headerScriptSource = readFileSync(resolve(ROOT, HEADER_GATE_SCRIPT), 'utf8');
check(
  'header hard-gate script sets a non-zero exit code on failure',
  /process\.exitCode\s*=\s*1/.test(headerScriptSource),
);
check(
  'required job runs the production build before the header matrix',
  steps.findIndex((step) => String(step.run ?? '').includes('npm run build')) <
    steps.findIndex((step) => String(step.run ?? '').includes(HEADER_GATE_SCRIPT)),
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
})) {
  check(result.label, result.ok, result.detail);
}
check('validator script exists on disk', existsSync(resolve(ROOT, VALIDATE_SCRIPT)));

// --- 11. runtime validator behaviour -----------------------------------------
//
// The validator is the runtime half of the producer binding, so its acceptance
// set is asserted directly rather than inferred from its source.
const GOOD_SIDECAR = JSON.stringify({ material: true, reason: 'material-path-changed' });
const GOOD_FALSE_SIDECAR = JSON.stringify({
  material: false,
  reason: 'only-allowlisted-non-material-paths',
});
check(
  'validator ACCEPTS material=true with an agreeing sidecar',
  validateClassifierOutput({
    material: 'true',
    reason: 'material-path-changed',
    sidecarRaw: GOOD_SIDECAR,
  }).length === 0,
);
check(
  'validator ACCEPTS material=false with an agreeing sidecar',
  validateClassifierOutput({
    material: 'false',
    reason: 'only-allowlisted-non-material-paths',
    sidecarRaw: GOOD_FALSE_SIDECAR,
  }).length === 0,
);
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
    }).length > 0,
  );
}
for (const value of [undefined, null, '', ' ', 'material-path-changed ', 'nonsense', 'MATERIAL-PATH-CHANGED']) {
  check(
    `validator REJECTS reason=${JSON.stringify(value)}`,
    validateClassifierOutput({ material: 'true', reason: value, sidecarRaw: GOOD_SIDECAR }).length > 0,
  );
}
check(
  'validator REJECTS a missing producer sidecar (producer step deleted)',
  validateClassifierOutput({
    material: 'true',
    reason: 'material-path-changed',
    sidecarRaw: null,
  }).length > 0,
);
check(
  'validator REJECTS an empty producer sidecar',
  validateClassifierOutput({ material: 'true', reason: 'material-path-changed', sidecarRaw: '' })
    .length > 0,
);
check(
  'validator REJECTS an unparseable producer sidecar',
  validateClassifierOutput({
    material: 'true',
    reason: 'material-path-changed',
    sidecarRaw: '{not json',
  }).length > 0,
);
check(
  'validator REJECTS a sidecar that disagrees on material (producer id renamed)',
  validateClassifierOutput({
    material: 'false',
    reason: 'material-path-changed',
    sidecarRaw: GOOD_SIDECAR,
  }).length > 0,
);
check(
  'validator REJECTS a sidecar that disagrees on reason',
  validateClassifierOutput({
    material: 'true',
    reason: 'unresolved-or-empty-change-set',
    sidecarRaw: GOOD_SIDECAR,
  }).length > 0,
);
check(
  'validator REJECTS a non-boolean sidecar material',
  validateClassifierOutput({
    material: 'true',
    reason: 'material-path-changed',
    sidecarRaw: JSON.stringify({ material: 'true', reason: 'material-path-changed' }),
  }).length > 0,
);
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

if (failures.length) {
  console.error(`CBW MASTER REQUIRED GATE CONTRACT: FAIL (${failures.length}/${checks})`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`CBW MASTER REQUIRED GATE CONTRACT: PASS (${checks}/${checks})`);
}
