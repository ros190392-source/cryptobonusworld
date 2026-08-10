#!/usr/bin/env node
// Mutation suite for the master required gate producer/consumer contract
// (issue #366).
//
// A contract test that passes is only evidence if it would FAIL when the thing
// it claims to protect is broken. Round-2 review demonstrated the opposite:
// renaming `id: classify` still passed 300/300, and deleting the classifier
// step still passed 298/298. This suite makes that class of regression
// impossible to reintroduce silently.
//
// Two families:
//   A. STATIC — feed deliberately mutated workflow/classifier/validator TEXT to
//      auditProducerConsumerContract() and require every mutant to be caught.
//      The real files are never modified; mutation happens on in-memory copies.
//   B. BEHAVIOURAL — execute the real validator, and a deliberately softened
//      copy of it, as real subprocesses against the runtime shapes review asked
//      to be simulated (missing producer, renamed id, `material=yes`,
//      `material=`, `material=true `).

import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { auditProducerConsumerContract } from './master-required-gate-workflow-contract.mjs';

const ROOT = resolve(process.cwd());
const WORKFLOW = resolve(ROOT, '.github/workflows/cbw-master-required-gate.yml');
const CLASSIFY_SCRIPT = resolve(ROOT, 'scripts/ci/master-required-gate-classify.mjs');
const VALIDATE_SCRIPT = resolve(ROOT, 'scripts/ci/master-required-gate-validate-output.mjs');
const SIDECAR_NAME = 'cbw-master-required-gate-classification.json';

let checks = 0;
const failures = [];
function check(label, ok, detail = '') {
  checks += 1;
  if (!ok) failures.push(detail ? `${label}: ${detail}` : label);
}

const baseWorkflow = readFileSync(WORKFLOW, 'utf8');
const baseClassifier = readFileSync(CLASSIFY_SCRIPT, 'utf8');
const baseValidator = readFileSync(VALIDATE_SCRIPT, 'utf8');

const audit = (overrides = {}) =>
  auditProducerConsumerContract({
    workflowText: baseWorkflow,
    classifierSource: baseClassifier,
    validatorSource: baseValidator,
    ...overrides,
  });

// --- control: the real, unmutated files must pass cleanly --------------------
const baseline = audit();
const baselineFailures = baseline.filter((entry) => !entry.ok);
check(
  'CONTROL: unmutated producer/consumer contract passes',
  baselineFailures.length === 0,
  baselineFailures.map((entry) => entry.label).join(' | '),
);
check('CONTROL: the audit actually asserts something', baseline.length >= 40, String(baseline.length));

// --- workflow text mutation helpers -----------------------------------------
// Removes a step block: from its `- name:` line up to the next step or comment
// block at the same indentation.
function removeStep(text, stepName) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.trim() === `- name: ${stepName}`);
  if (start === -1) throw new Error(`mutation setup failed: step "${stepName}" not found`);
  let end = start + 1;
  while (end < lines.length && !/^ {6}(- name:|#)/.test(lines[end])) end += 1;
  lines.splice(start, end - start);
  return lines.join('\n');
}

function insertAfterStepName(text, stepName, insertedLine) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.trim() === `- name: ${stepName}`);
  if (start === -1) throw new Error(`mutation setup failed: step "${stepName}" not found`);
  lines.splice(start + 1, 0, insertedLine);
  return lines.join('\n');
}

function requireChanged(label, before, after) {
  if (before === after) throw new Error(`mutation setup failed (no-op): ${label}`);
  return after;
}

const CLASSIFY_STEP = 'Classify changed files (fail-closed)';
const VALIDATE_STEP = 'Validate classifier output';

// --- A. static mutations -----------------------------------------------------
const MUTATIONS = [
  {
    id: 1,
    label: 'remove the classifier producer step entirely',
    apply: () => ({ workflowText: removeStep(baseWorkflow, CLASSIFY_STEP) }),
  },
  {
    id: 2,
    label: 'rename the producer step id `classify` -> `classify2`',
    apply: () => ({
      workflowText: requireChanged(
        'rename id',
        baseWorkflow,
        baseWorkflow.replace('        id: classify\n', '        id: classify2\n'),
      ),
    }),
  },
  {
    id: 3,
    label: 'change the classifier command (drop --emit-github-output)',
    apply: () => ({
      workflowText: requireChanged(
        'change command',
        baseWorkflow,
        baseWorkflow.replace(
          'node scripts/ci/master-required-gate-classify.mjs --emit-github-output',
          'node scripts/ci/master-required-gate-classify.mjs',
        ),
      ),
    }),
  },
  {
    id: 4,
    label: 'remove the BASE_SHA env wiring',
    apply: () => ({
      workflowText: requireChanged(
        'remove BASE_SHA',
        baseWorkflow,
        baseWorkflow.replace(/ {10}BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}\n/, ''),
      ),
    }),
  },
  {
    id: 5,
    label: 'remove the HEAD_SHA env wiring',
    apply: () => ({
      workflowText: requireChanged(
        'remove HEAD_SHA',
        baseWorkflow,
        baseWorkflow.replace(/ {10}HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}\n/, ''),
      ),
    }),
  },
  {
    id: 6,
    label: 'point BASE_SHA at the head sha',
    apply: () => ({
      workflowText: requireChanged(
        'BASE_SHA -> head',
        baseWorkflow,
        baseWorkflow.replace(
          '          BASE_SHA: ${{ github.event.pull_request.base.sha }}',
          '          BASE_SHA: ${{ github.event.pull_request.head.sha }}',
        ),
      ),
    }),
  },
  {
    id: 7,
    label: 'point HEAD_SHA at the base sha',
    apply: () => ({
      workflowText: requireChanged(
        'HEAD_SHA -> base',
        baseWorkflow,
        baseWorkflow.replace(
          '          HEAD_SHA: ${{ github.event.pull_request.head.sha }}',
          '          HEAD_SHA: ${{ github.event.pull_request.base.sha }}',
        ),
      ),
    }),
  },
  {
    id: 8,
    label: 'remove the unconditional validator step',
    apply: () => ({ workflowText: removeStep(baseWorkflow, VALIDATE_STEP) }),
  },
  {
    id: 9,
    label: 'make the validator conditional on the very output it validates',
    apply: () => ({
      workflowText: insertAfterStepName(
        baseWorkflow,
        VALIDATE_STEP,
        "        if: steps.classify.outputs.material == 'true'",
      ),
    }),
  },
  {
    id: 10,
    label: 'soften the validator to tolerate an empty material value',
    apply: () => ({
      validatorSource: requireChanged(
        'soften validator',
        baseValidator,
        baseValidator.replace("material !== 'true' && material !== 'false'", 'false'),
      ),
    }),
  },
  {
    id: '10b',
    label: 'soften the validator by trimming the material value',
    apply: () => ({
      validatorSource: requireChanged(
        'trim validator',
        baseValidator,
        baseValidator.replace(
          "if (typeof material !== 'string') {",
          "material = typeof material === 'string' ? material.trim() : material;\n  if (typeof material !== 'string') {",
        ),
      ),
    }),
  },
  {
    id: 11,
    label: 'repoint a heavy consumer at a nonexistent step id',
    apply: () => ({
      workflowText: requireChanged(
        'consumer -> bad id',
        baseWorkflow,
        baseWorkflow.replaceAll(
          "if: steps.classify.outputs.material == 'true'",
          "if: steps.classifyX.outputs.material == 'true'",
        ),
      ),
    }),
  },
  {
    id: '11b',
    label: 'repoint a heavy consumer at a nonexistent output name',
    apply: () => ({
      workflowText: requireChanged(
        'consumer -> bad output',
        baseWorkflow,
        baseWorkflow.replaceAll(
          "if: steps.classify.outputs.material == 'true'",
          "if: steps.classify.outputs.materialX == 'true'",
        ),
      ),
    }),
  },
  {
    id: 12,
    label: 'remove the material output emission from the classifier',
    apply: () => ({
      classifierSource: requireChanged(
        'drop material emission',
        baseClassifier,
        baseClassifier.replace('material=${result.material}\\n', ''),
      ),
    }),
  },
  {
    id: '12b',
    label: 'remove the producer sidecar write from the classifier',
    apply: () => ({
      classifierSource: requireChanged(
        'drop sidecar write',
        baseClassifier,
        baseClassifier.replaceAll('classifierResultFilePath()', 'undefined'),
      ),
    }),
  },
  {
    id: '12c',
    label: 'remove the duplicate-emission guard from the classifier',
    apply: () => ({
      classifierSource: requireChanged(
        'drop duplicate guard',
        baseClassifier,
        baseClassifier.replace('already carries a material= line (ambiguous)', 'ok'),
      ),
    }),
  },
  {
    id: '12d',
    label: 'let the classifier silently skip emission when GITHUB_OUTPUT is unset',
    apply: () => ({
      classifierSource: requireChanged(
        'drop GITHUB_OUTPUT guard',
        baseClassifier,
        baseClassifier.replace('GITHUB_OUTPUT is not set', 'no output file, continuing'),
      ),
    }),
  },
];

for (const mutation of MUTATIONS) {
  let caught = [];
  try {
    caught = audit(mutation.apply()).filter((entry) => !entry.ok);
  } catch (error) {
    // A mutation that makes the workflow unparseable counts as caught. A setup
    // failure means the mutation never applied, which would silently turn this
    // suite into a no-op — so it is a hard error, never a pass and never a
    // "survived" verdict that hides its own cause.
    if (/mutation setup failed/.test(error.message)) {
      throw new Error(`MUTATION ${mutation.id} could not be applied: ${error.message}`);
    }
    caught = [{ label: `threw: ${error.message}` }];
  }
  check(
    `MUTATION ${mutation.id} (${mutation.label}) is CAUGHT by the contract`,
    caught.length > 0,
    'mutant survived — the contract does not bind this property',
  );
}

// --- B. behavioural validator simulations ------------------------------------
const sandbox = mkdtempSync(join(tmpdir(), 'cbw-gate-mutation-'));
try {
  const runnerTemp = join(sandbox, 'runner-temp');
  execFileSync(process.execPath, ['-e', `require('fs').mkdirSync(${JSON.stringify(runnerTemp)},{recursive:true})`]);
  const sidecarPath = join(runnerTemp, SIDECAR_NAME);

  const writeSidecar = (material, reason) =>
    writeFileSync(sidecarPath, JSON.stringify({ material, reason }), 'utf8');
  const clearSidecar = () => {
    if (existsSync(sidecarPath)) rmSync(sidecarPath);
  };

  // Runs a validator script with a controlled runtime environment. `material`
  // undefined models an env var GitHub never set (deleted/renamed producer).
  function runValidator(scriptPath, { material, reason }) {
    const env = { ...process.env, RUNNER_TEMP: runnerTemp };
    delete env.CLASSIFIER_MATERIAL;
    delete env.CLASSIFIER_REASON;
    if (material !== undefined) env.CLASSIFIER_MATERIAL = material;
    if (reason !== undefined) env.CLASSIFIER_REASON = reason;
    return spawnSync(process.execPath, [scriptPath], { env, encoding: 'utf8', cwd: ROOT });
  }

  // B1. The happy paths must actually pass, or "fails closed" is vacuous.
  writeSidecar(true, 'material-path-changed');
  check(
    'RUNTIME: valid material=true passes the validator',
    runValidator(VALIDATE_SCRIPT, { material: 'true', reason: 'material-path-changed' }).status === 0,
  );
  writeSidecar(false, 'only-allowlisted-non-material-paths');
  check(
    'RUNTIME: valid material=false passes the validator',
    runValidator(VALIDATE_SCRIPT, {
      material: 'false',
      reason: 'only-allowlisted-non-material-paths',
    }).status === 0,
  );

  // B2. The exact runtime shapes review asked to be simulated.
  writeSidecar(true, 'material-path-changed');
  const RUNTIME_REJECTIONS = [
    {
      label: 'classifier producer step MISSING (no output, no sidecar)',
      setup: clearSidecar,
      input: { material: undefined, reason: undefined },
    },
    {
      label: 'classifier id RENAMED (outputs resolve empty, sidecar present)',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: { material: '', reason: '' },
    },
    {
      label: 'classifier emits NO material output',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: { material: undefined, reason: 'material-path-changed' },
    },
    {
      label: 'classifier emits `material=yes`',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: { material: 'yes', reason: 'material-path-changed' },
    },
    {
      label: 'classifier emits `material=` (empty)',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: { material: '', reason: 'material-path-changed' },
    },
    {
      label: 'classifier emits `material=true ` (trailing space)',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: { material: 'true ', reason: 'material-path-changed' },
    },
    {
      label: 'classifier emits `material=True` (wrong case)',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: { material: 'True', reason: 'material-path-changed' },
    },
    {
      label: 'consumer wired to a different producer (sidecar disagrees)',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: { material: 'false', reason: 'only-allowlisted-non-material-paths' },
    },
  ];
  for (const scenario of RUNTIME_REJECTIONS) {
    scenario.setup();
    const run = runValidator(VALIDATE_SCRIPT, scenario.input);
    check(`RUNTIME: ${scenario.label} FAILS the gate`, run.status !== 0, `exit=${run.status}`);
  }

  // B3. Prove mutation 10 is behaviourally detectable, not just textually: a
  // validator softened to tolerate an empty value accepts `material=` where the
  // real one rejects it — so "the real validator exits non-zero" is a property
  // of its logic, not an artefact of the harness.
  //
  // BOTH independent rules must be softened for the mutant to pass: the exact
  // 'true'/'false' comparison AND the producer-sidecar cross-check. That the
  // mutant survives only after removing both is itself the evidence that the
  // two rules are genuinely independent lines of defence.
  const softenedPath = join(sandbox, 'softened-validator.mjs');
  writeFileSync(
    softenedPath,
    baseValidator
      .replace("material !== 'true' && material !== 'false'", 'false')
      .replace('String(sidecar.material) !== material', 'false')
      // The copy lives outside scripts/ci, so its sibling import must be
      // rewritten to an absolute file:// URL (a bare `c:\...` path is not a
      // legal ESM specifier on Windows).
      .replace(
        "from './master-required-gate-classify.mjs'",
        `from ${JSON.stringify(pathToFileURL(CLASSIFY_SCRIPT).href)}`,
      )
      .replace(
        "process.argv[1]?.endsWith('master-required-gate-validate-output.mjs')",
        'true',
      ),
    'utf8',
  );
  writeSidecar(true, 'material-path-changed');
  const softenedRun = runValidator(softenedPath, { material: '', reason: 'material-path-changed' });
  const realRun = runValidator(VALIDATE_SCRIPT, { material: '', reason: 'material-path-changed' });
  check(
    'MUTATION 10 is behaviourally observable: softened validator ACCEPTS empty material',
    softenedRun.status === 0,
    `exit=${softenedRun.status} ${softenedRun.stderr ?? ''}`,
  );
  check(
    'MUTATION 10 is behaviourally observable: real validator REJECTS empty material',
    realRun.status !== 0,
    `exit=${realRun.status}`,
  );

  // B4. End-to-end producer: duplicate emission into one GITHUB_OUTPUT is
  // ambiguous (GitHub keeps the last line) and must fail closed.
  const repo = join(sandbox, 'repo');
  execFileSync('git', ['init', '--initial-branch=master', repo], { stdio: 'ignore' });
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  writeFileSync(join(repo, 'README.md'), 'v1\n', 'utf8');
  git('add', '-A');
  git('-c', 'user.name=cbw', '-c', 'user.email=f@cbw.local', 'commit', '-m', 'base');
  const baseSha = git('rev-parse', 'HEAD').trim();
  writeFileSync(join(repo, 'src-file.ts'), 'export const x = 1;\n', 'utf8');
  git('add', '-A');
  git('-c', 'user.name=cbw', '-c', 'user.email=f@cbw.local', 'commit', '-m', 'material');
  const headSha = git('rev-parse', 'HEAD').trim();

  const outputFile = join(sandbox, 'github-output.txt');
  writeFileSync(outputFile, '', 'utf8');
  const producerEnv = {
    ...process.env,
    RUNNER_TEMP: runnerTemp,
    GITHUB_OUTPUT: outputFile,
    BASE_SHA: baseSha,
    HEAD_SHA: headSha,
  };
  const first = spawnSync(process.execPath, [CLASSIFY_SCRIPT, '--emit-github-output'], {
    env: producerEnv,
    cwd: repo,
    encoding: 'utf8',
  });
  check('RUNTIME: producer emits successfully on first run', first.status === 0, first.stderr ?? '');
  check(
    'RUNTIME: producer emitted material=true for a material diff',
    /^material=true$/m.test(readFileSync(outputFile, 'utf8')),
    readFileSync(outputFile, 'utf8'),
  );
  check('RUNTIME: producer wrote its sidecar', existsSync(sidecarPath));
  const second = spawnSync(process.execPath, [CLASSIFY_SCRIPT, '--emit-github-output'], {
    env: producerEnv,
    cwd: repo,
    encoding: 'utf8',
  });
  check(
    'RUNTIME: duplicate/ambiguous material= emission FAILS closed',
    second.status !== 0,
    `exit=${second.status}`,
  );
  // And the emitted pair validates end-to-end through the real validator.
  const emitted = Object.fromEntries(
    readFileSync(outputFile, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split('=')),
  );
  check(
    'RUNTIME: producer output validates end-to-end through the real validator',
    runValidator(VALIDATE_SCRIPT, { material: emitted.material, reason: emitted.reason }).status === 0,
  );

  // B5. Missing GITHUB_OUTPUT must fail closed rather than silently classify.
  const noOutputEnv = { ...producerEnv };
  delete noOutputEnv.GITHUB_OUTPUT;
  const noOutput = spawnSync(process.execPath, [CLASSIFY_SCRIPT, '--emit-github-output'], {
    env: noOutputEnv,
    cwd: repo,
    encoding: 'utf8',
  });
  check('RUNTIME: producer fails closed when GITHUB_OUTPUT is unset', noOutput.status !== 0);
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`CBW MASTER REQUIRED GATE MUTATIONS: FAIL (${failures.length}/${checks})`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`CBW MASTER REQUIRED GATE MUTATIONS: PASS (${checks}/${checks})`);
}
