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
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  auditProducerConsumerContract,
  extractCallExpressions,
} from './master-required-gate-workflow-contract.mjs';

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

// LINE-ENDING NORMALIZATION — load-bearing, not cosmetic. Mutations are applied
// as exact text edits, and several of them span a line boundary. Git may check
// these files out with CRLF (Windows) or LF (the Linux runner), so a mutation
// written against `\n` silently becomes a NO-OP on a CRLF checkout. A no-op
// mutation is the worst possible outcome for this suite: it either aborts the
// run or, without the `requireChanged` guard, reports a mutant as "caught" when
// nothing was ever mutated. Normalizing here makes every mutation deterministic
// on both platforms; the audit is pure text-in and behaves identically.
const normalizeEol = (text) => text.replace(/\r\n/g, '\n');
const baseWorkflow = normalizeEol(readFileSync(WORKFLOW, 'utf8'));
const baseClassifier = normalizeEol(readFileSync(CLASSIFY_SCRIPT, 'utf8'));
const baseValidator = normalizeEol(readFileSync(VALIDATE_SCRIPT, 'utf8'));

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
check(
  'CONTROL: mutation base sources are line-ending normalized (mutations cannot silently no-op)',
  !baseWorkflow.includes('\r') && !baseClassifier.includes('\r') && !baseValidator.includes('\r'),
);

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

// The EXACT sidecar write statement, located structurally rather than by
// pattern-guessing, so the "delete only the write" mutations below remove the
// one operation the whole producer/consumer binding rests on — and nothing else.
const SIDECAR_WRITE_CALL = extractCallExpressions(baseClassifier, 'writeFileSync').find((call) =>
  /^writeFileSync\(\s*classifierResultFilePath\(\)\s*,/.test(call),
);
if (!SIDECAR_WRITE_CALL) {
  throw new Error('mutation setup failed: no writeFileSync(classifierResultFilePath(), ...) call found');
}
const SIDECAR_WRITE_STATEMENT = `${SIDECAR_WRITE_CALL};`;
if (!baseClassifier.includes(SIDECAR_WRITE_STATEMENT)) {
  throw new Error('mutation setup failed: the sidecar write is not a standalone statement');
}

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
    // THE reviewed LOW. `classifierResultFilePath` still appears in the import,
    // in its own definition and in the validator, so an identifier search is
    // fully satisfied while the producer no longer writes anything at all.
    id: '12e',
    label: 'remove ONLY the sidecar write STATEMENT (the path helper is still referenced)',
    apply: () => ({
      classifierSource: requireChanged(
        'drop only the sidecar write statement',
        baseClassifier,
        baseClassifier.replace(SIDECAR_WRITE_STATEMENT, ''),
      ),
    }),
    // Proves the mutation is the SUBTLE one, not mutation 12b in disguise: if
    // the identifier vanished too, catching it would prove nothing new.
    proves: {
      label: 'MUTATION 12e leaves classifierResultFilePath() referenced (an identifier search would MISS it)',
      test: (overrides) => /classifierResultFilePath\(\)/.test(overrides.classifierSource),
    },
  },
  {
    id: '12f',
    label: 'keep the sidecar write but drop the classification payload',
    apply: () => ({
      classifierSource: requireChanged(
        'empty sidecar payload',
        baseClassifier,
        baseClassifier.replace(
          SIDECAR_WRITE_STATEMENT,
          "writeFileSync(classifierResultFilePath(), '{}\\n', 'utf8');",
        ),
      ),
    }),
  },
  {
    id: '12g',
    label: 'redirect the sidecar write away from classifierResultFilePath()',
    apply: () => ({
      classifierSource: requireChanged(
        'redirect sidecar write',
        baseClassifier,
        // Derived from the real statement, so this cannot drift out of sync
        // with the classifier's formatting.
        baseClassifier.replace(
          SIDECAR_WRITE_STATEMENT,
          SIDECAR_WRITE_STATEMENT.replace(
            'classifierResultFilePath()',
            "join(process.env.RUNNER_TEMP ?? '.', 'other.json')",
          ),
        ),
      ),
    }),
  },
  {
    id: '12h',
    label: 'drop the run-identity stamp from the sidecar payload (staleness undetectable)',
    apply: () => ({
      classifierSource: requireChanged(
        'drop identity stamp',
        baseClassifier,
        baseClassifier
          .replace('        headSha: identity.headSha,\n', '')
          .replace('        runId: identity.runId,\n', '')
          .replace('        runAttempt: identity.runAttempt,\n', ''),
      ),
    }),
  },
  {
    id: '12i',
    label: 'reintroduce the os.tmpdir() fallback for RUNNER_TEMP',
    apply: () => ({
      classifierSource: requireChanged(
        'restore tmpdir fallback',
        baseClassifier,
        baseClassifier.replace(
          '  const runnerTemp = process.env.RUNNER_TEMP;',
          "  const runnerTemp = process.env.RUNNER_TEMP || tmpdir();",
        ),
      ),
    }),
  },
  {
    id: '12j',
    label: 'accept an empty RUNNER_TEMP instead of failing closed',
    apply: () => ({
      classifierSource: requireChanged(
        'drop empty RUNNER_TEMP guard',
        baseClassifier,
        baseClassifier.replace(
          "throw new Error('master-required-gate: RUNNER_TEMP is empty');",
          '/* tolerated */;',
        ),
      ),
    }),
  },
  {
    id: '12k',
    label: 'stop rejecting a malformed/unusable RUNNER_TEMP',
    apply: () => ({
      classifierSource: requireChanged(
        'drop malformed RUNNER_TEMP guards',
        baseClassifier,
        baseClassifier
          .replace('if (!isAbsolute(runnerTemp)) {', 'if (false) {')
          .replace('stats = statSync(runnerTemp);', 'stats = { isDirectory: () => true };'),
      ),
    }),
  },
  {
    id: 13,
    label: 'unwire the validator step from this run\'s head sha (staleness unbindable)',
    apply: () => ({
      workflowText: requireChanged(
        'drop validator HEAD_SHA',
        baseWorkflow,
        baseWorkflow.replace(
          '          CLASSIFIER_REASON: ${{ steps.classify.outputs.reason }}\n          HEAD_SHA: ${{ github.event.pull_request.head.sha }}\n',
          '          CLASSIFIER_REASON: ${{ steps.classify.outputs.reason }}\n',
        ),
      ),
    }),
  },
  {
    id: 14,
    label: 'soften the validator to ignore sidecar staleness',
    apply: () => ({
      validatorSource: requireChanged(
        'ignore staleness',
        baseValidator,
        baseValidator.replace('sidecar[field] !== expectedIdentity[field]', 'false'),
      ),
    }),
  },
  {
    id: 15,
    label: 'let the validator swallow a RUNNER_TEMP resolution failure',
    apply: () => ({
      validatorSource: requireChanged(
        'swallow resolution failure',
        baseValidator,
        baseValidator.replace(
          '  } catch (error) {\n    errors.push(String(error.message));\n  }\n  try {\n    identity = resolveRunIdentity();',
          '  } catch {\n    /* ignored */\n  }\n  try {\n    identity = resolveRunIdentity();',
        ),
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
    const overrides = mutation.apply();
    // Some mutations assert a property of the MUTANT itself (e.g. "the deleted
    // write left the identifier behind"), which is what makes catching them
    // meaningful rather than incidental.
    if (mutation.proves) {
      check(mutation.proves.label, mutation.proves.test(overrides));
    }
    caught = audit(overrides).filter((entry) => !entry.ok);
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
//
// SCENARIO HYGIENE — every scenario below runs through `runScenario`, which
// ALWAYS deletes the sidecar first and then creates only the state that scenario
// describes. A behavioural test must never pass because an earlier scenario left
// a valid sidecar behind: that is exactly the shape of leakage that made the
// producer/consumer binding look bound when it was not. `clearSidecar()` also
// asserts the file is really gone, so a scenario cannot silently inherit state.
const sandbox = mkdtempSync(join(tmpdir(), 'cbw-gate-mutation-'));
try {
  const runnerTemp = join(sandbox, 'runner-temp');
  mkdirSync(runnerTemp, { recursive: true });
  const sidecarPath = join(runnerTemp, SIDECAR_NAME);

  // The identity of the simulated gate run. The producer stamps it into the
  // sidecar; the validator re-derives it from its own environment.
  const RUN = Object.freeze({
    HEAD_SHA: 'f'.repeat(40),
    GITHUB_RUN_ID: '90210',
    GITHUB_RUN_ATTEMPT: '1',
  });
  const CURRENT_IDENTITY = Object.freeze({
    headSha: RUN.HEAD_SHA,
    runId: RUN.GITHUB_RUN_ID,
    runAttempt: RUN.GITHUB_RUN_ATTEMPT,
  });

  const clearSidecar = () => {
    if (existsSync(sidecarPath)) rmSync(sidecarPath);
    if (existsSync(sidecarPath)) throw new Error('scenario setup failed: sidecar could not be cleared');
  };
  // Writes a sidecar for THIS run unless the scenario overrides identity fields.
  const writeSidecar = (material, reason, overrides = {}) =>
    writeFileSync(
      sidecarPath,
      JSON.stringify({ material, reason, ...CURRENT_IDENTITY, ...overrides }),
      'utf8',
    );
  const writeRawSidecar = (raw) => writeFileSync(sidecarPath, raw, 'utf8');

  // Runs a validator script with a controlled runtime environment. `material`
  // undefined models an env var GitHub never set (deleted/renamed producer).
  // `envOverrides` may set a value or delete it by passing `undefined` — that is
  // how the RUNNER_TEMP scenarios are expressed.
  function runValidator(scriptPath, { material, reason, envOverrides = {} }) {
    const env = { ...process.env, RUNNER_TEMP: runnerTemp, ...RUN };
    delete env.CLASSIFIER_MATERIAL;
    delete env.CLASSIFIER_REASON;
    if (material !== undefined) env.CLASSIFIER_MATERIAL = material;
    if (reason !== undefined) env.CLASSIFIER_REASON = reason;
    for (const [name, value] of Object.entries(envOverrides)) {
      if (value === undefined) delete env[name];
      else env[name] = value;
    }
    return spawnSync(process.execPath, [scriptPath], { env, encoding: 'utf8', cwd: ROOT });
  }

  // Clears the sidecar, applies ONLY this scenario's state, then runs.
  function runScenario(scenario) {
    clearSidecar();
    if (typeof scenario.setup === 'function') scenario.setup();
    return runValidator(VALIDATE_SCRIPT, scenario.input ?? {});
  }

  // B1. The happy paths must actually pass, or "fails closed" is vacuous.
  const VALID_CURRENT = [
    {
      label: 'valid CURRENT sidecar, material=true',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: { material: 'true', reason: 'material-path-changed' },
    },
    {
      label: 'valid CURRENT sidecar, material=false',
      setup: () => writeSidecar(false, 'only-allowlisted-non-material-paths'),
      input: { material: 'false', reason: 'only-allowlisted-non-material-paths' },
    },
  ];
  for (const scenario of VALID_CURRENT) {
    const run = runScenario(scenario);
    check(`RUNTIME: ${scenario.label} PASSES the validator`, run.status === 0, run.stderr ?? '');
  }

  // B2. Every rejected runtime shape. Each entry states its own complete
  // precondition; none relies on a sidecar written by an earlier entry.
  const RUNTIME_REJECTIONS = [
    // --- runtime environment ---------------------------------------------
    {
      label: 'NO RUNNER_TEMP (sidecar directory unresolvable, no temp fallback)',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: {
        material: 'true',
        reason: 'material-path-changed',
        envOverrides: { RUNNER_TEMP: undefined },
      },
      expect: /RUNNER_TEMP is not set/,
    },
    {
      label: 'EMPTY RUNNER_TEMP',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: {
        material: 'true',
        reason: 'material-path-changed',
        envOverrides: { RUNNER_TEMP: '' },
      },
      expect: /RUNNER_TEMP is empty/,
    },
    {
      label: 'RELATIVE (malformed) RUNNER_TEMP',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: {
        material: 'true',
        reason: 'material-path-changed',
        envOverrides: { RUNNER_TEMP: 'runner-temp' },
      },
      expect: /not an absolute path/,
    },
    {
      label: 'NONEXISTENT (unusable) RUNNER_TEMP',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: {
        material: 'true',
        reason: 'material-path-changed',
        envOverrides: { RUNNER_TEMP: join(sandbox, 'does-not-exist') },
      },
      expect: /does not exist/,
    },
    {
      label: 'RUNNER_TEMP pointing at a FILE, not a directory',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: {
        material: 'true',
        reason: 'material-path-changed',
        envOverrides: { RUNNER_TEMP: sidecarPath },
      },
      expect: /is not a directory/,
    },
    {
      label: 'unidentifiable run (no GITHUB_RUN_ID)',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: {
        material: 'true',
        reason: 'material-path-changed',
        envOverrides: { GITHUB_RUN_ID: undefined },
      },
      expect: /GITHUB_RUN_ID is missing or empty/,
    },
    {
      label: 'unidentifiable run (empty GITHUB_RUN_ATTEMPT)',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: {
        material: 'true',
        reason: 'material-path-changed',
        envOverrides: { GITHUB_RUN_ATTEMPT: '' },
      },
      expect: /GITHUB_RUN_ATTEMPT is missing or empty/,
    },
    // --- sidecar presence / shape ----------------------------------------
    {
      label: 'MISSING sidecar with no outputs (classifier producer step deleted)',
      setup: () => {},
      input: { material: undefined, reason: undefined },
      expect: /sidecar is missing/,
    },
    {
      label: 'MISSING sidecar with otherwise valid outputs',
      setup: () => {},
      input: { material: 'true', reason: 'material-path-changed' },
      expect: /sidecar is missing/,
    },
    {
      label: 'EMPTY sidecar file',
      setup: () => writeRawSidecar(''),
      input: { material: 'true', reason: 'material-path-changed' },
      expect: /sidecar is missing/,
    },
    {
      label: 'MALFORMED JSON sidecar',
      setup: () => writeRawSidecar('{"material": true, "reason":'),
      input: { material: 'true', reason: 'material-path-changed' },
      expect: /not valid JSON/,
    },
    {
      label: 'JSON sidecar that is not an object',
      setup: () => writeRawSidecar('"material-path-changed"'),
      input: { material: 'true', reason: 'material-path-changed' },
      expect: /sidecar material must be a boolean/,
    },
    {
      label: 'sidecar whose material is a STRING, not a boolean',
      setup: () => writeRawSidecar(JSON.stringify({ material: 'true', reason: 'material-path-changed', ...CURRENT_IDENTITY })),
      input: { material: 'true', reason: 'material-path-changed' },
      expect: /sidecar material must be a boolean/,
    },
    // --- staleness --------------------------------------------------------
    {
      label: 'STALE sidecar from a previous PR head',
      setup: () => writeSidecar(true, 'material-path-changed', { headSha: 'a'.repeat(40) }),
      input: { material: 'true', reason: 'material-path-changed' },
      expect: /STALE: headSha/,
    },
    {
      label: 'STALE sidecar from a previous workflow run',
      setup: () => writeSidecar(true, 'material-path-changed', { runId: '90209' }),
      input: { material: 'true', reason: 'material-path-changed' },
      expect: /STALE: runId/,
    },
    {
      label: 'STALE sidecar from a previous re-run attempt',
      setup: () => writeSidecar(true, 'material-path-changed', { runAttempt: '0' }),
      input: { material: 'true', reason: 'material-path-changed' },
      expect: /STALE: runAttempt/,
    },
    {
      label: 'STALE sidecar in the pre-hardening format (no identity at all)',
      setup: () => writeRawSidecar(JSON.stringify({ material: true, reason: 'material-path-changed' })),
      input: { material: 'true', reason: 'material-path-changed' },
      expect: /STALE/,
    },
    // --- producer/consumer disagreement ------------------------------------
    {
      label: 'MATERIAL MISMATCH (consumer wired to a different producer)',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: { material: 'false', reason: 'only-allowlisted-non-material-paths' },
      expect: /disagrees with producer sidecar material/,
    },
    {
      label: 'MATERIAL MISMATCH the other way (sidecar false, output true)',
      setup: () => writeSidecar(false, 'only-allowlisted-non-material-paths'),
      input: { material: 'true', reason: 'material-path-changed' },
      expect: /disagrees with producer sidecar material/,
    },
    {
      label: 'REASON MISMATCH (material agrees, reason does not)',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: { material: 'true', reason: 'unresolved-or-empty-change-set' },
      expect: /disagrees with producer sidecar reason/,
    },
    // --- malformed step outputs --------------------------------------------
    {
      label: 'classifier id RENAMED (outputs resolve empty, sidecar present)',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: { material: '', reason: '' },
      expect: /must be exactly "true" or "false"/,
    },
    {
      label: 'classifier emits NO material output',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: { material: undefined, reason: 'material-path-changed' },
      expect: /material output is missing/,
    },
    {
      label: 'classifier emits `material=yes`',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: { material: 'yes', reason: 'material-path-changed' },
      expect: /must be exactly "true" or "false"/,
    },
    {
      label: 'classifier emits `material=` (empty)',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: { material: '', reason: 'material-path-changed' },
      expect: /must be exactly "true" or "false"/,
    },
    {
      label: 'classifier emits `material=true ` (trailing space)',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: { material: 'true ', reason: 'material-path-changed' },
      expect: /must be exactly "true" or "false"/,
    },
    {
      label: 'classifier emits `material=True` (wrong case)',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: { material: 'True', reason: 'material-path-changed' },
      expect: /must be exactly "true" or "false"/,
    },
    {
      label: 'classifier emits an unknown reason',
      setup: () => writeSidecar(true, 'material-path-changed'),
      input: { material: 'true', reason: 'because' },
      expect: /not a known classifier reason/,
    },
  ];
  for (const scenario of RUNTIME_REJECTIONS) {
    const run = runScenario(scenario);
    check(`RUNTIME: ${scenario.label} FAILS the gate`, run.status !== 0, `exit=${run.status}`);
    // Failing for the RIGHT reason. A scenario that failed for an unrelated
    // reason (a leaked sidecar, a typo'd env var) would otherwise count as
    // evidence for a rule it never exercised.
    check(
      `RUNTIME: ${scenario.label} fails for its OWN stated reason`,
      scenario.expect.test(`${run.stdout ?? ''}${run.stderr ?? ''}`),
      (run.stderr ?? '').slice(0, 200),
    );
  }

  // B2b. Leak proof: the scenario harness really does clear state. A valid
  // sidecar written now must NOT survive into the next scenario.
  writeSidecar(true, 'material-path-changed');
  const afterLeak = runScenario({
    label: 'leak probe',
    setup: () => {},
    input: { material: 'true', reason: 'material-path-changed' },
  });
  check(
    'RUNTIME: a sidecar left by a previous scenario does NOT survive into the next one',
    afterLeak.status !== 0 && /sidecar is missing/.test(`${afterLeak.stderr ?? ''}`),
    `exit=${afterLeak.status}`,
  );

  // B3. Prove mutation 10 is behaviourally detectable, not just textually: a
  // validator softened to tolerate an empty value accepts `material=` where the
  // real one rejects it — so "the real validator exits non-zero" is a property
  // of its logic, not an artefact of the harness.
  //
  // ALL THREE independent rules must be softened for the mutant to pass: the
  // exact 'true'/'false' comparison, the producer-sidecar cross-check, and the
  // staleness comparison. That the mutant survives only after removing all of
  // them is itself the evidence that they are genuinely independent lines of
  // defence.
  const softenedPath = join(sandbox, 'softened-validator.mjs');
  writeFileSync(
    softenedPath,
    baseValidator
      .replace("material !== 'true' && material !== 'false'", 'false')
      .replace('String(sidecar.material) !== material', 'false')
      .replace('sidecar[field] !== expectedIdentity[field]', 'false')
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
  clearSidecar();
  writeSidecar(true, 'material-path-changed');
  const softened = runValidator(softenedPath, { material: '', reason: 'material-path-changed' });
  clearSidecar();
  writeSidecar(true, 'material-path-changed');
  const realRun = runValidator(VALIDATE_SCRIPT, { material: '', reason: 'material-path-changed' });
  check(
    'MUTATION 10 is behaviourally observable: softened validator ACCEPTS empty material',
    softened.status === 0,
    `exit=${softened.status} ${softened.stderr ?? ''}`,
  );
  check(
    'MUTATION 10 is behaviourally observable: real validator REJECTS empty material',
    realRun.status !== 0,
    `exit=${realRun.status}`,
  );

  // B4. End-to-end producer against a real git repository.
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

  // The producer's HEAD_SHA is both the diff endpoint and the identity stamp, so
  // the whole end-to-end run uses the real head sha as this run's identity.
  const runProducer = (scriptPath, envOverrides = {}) => {
    const env = {
      ...process.env,
      ...RUN,
      RUNNER_TEMP: runnerTemp,
      GITHUB_OUTPUT: envOverrides.GITHUB_OUTPUT ?? join(sandbox, 'github-output.txt'),
      BASE_SHA: baseSha,
      HEAD_SHA: headSha,
    };
    for (const [name, value] of Object.entries(envOverrides)) {
      if (value === undefined) delete env[name];
      else env[name] = value;
    }
    return spawnSync(process.execPath, [scriptPath, '--emit-github-output'], {
      env,
      cwd: repo,
      encoding: 'utf8',
    });
  };
  const runValidatorForProducer = (scriptPath, { material, reason }) =>
    runValidator(scriptPath, {
      material,
      reason,
      envOverrides: { HEAD_SHA: headSha },
    });

  const outputFile = join(sandbox, 'github-output.txt');
  clearSidecar();
  writeFileSync(outputFile, '', 'utf8');
  const first = runProducer(CLASSIFY_SCRIPT);
  check('RUNTIME: producer emits successfully on first run', first.status === 0, first.stderr ?? '');
  check(
    'RUNTIME: producer emitted material=true for a material diff',
    /^material=true$/m.test(readFileSync(outputFile, 'utf8')),
    readFileSync(outputFile, 'utf8'),
  );
  check('RUNTIME: producer wrote its sidecar', existsSync(sidecarPath));
  const emittedSidecar = existsSync(sidecarPath) ? JSON.parse(readFileSync(sidecarPath, 'utf8')) : {};
  check(
    'RUNTIME: the producer sidecar carries the classification payload',
    emittedSidecar.material === true && emittedSidecar.reason === 'material-path-changed',
    JSON.stringify(emittedSidecar),
  );
  check(
    'RUNTIME: the producer sidecar is stamped with this run identity',
    emittedSidecar.headSha === headSha &&
      emittedSidecar.runId === RUN.GITHUB_RUN_ID &&
      emittedSidecar.runAttempt === RUN.GITHUB_RUN_ATTEMPT,
    JSON.stringify(emittedSidecar),
  );
  const emitted = Object.fromEntries(
    readFileSync(outputFile, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split('=')),
  );
  check(
    'RUNTIME: producer output validates end-to-end through the real validator',
    runValidatorForProducer(VALIDATE_SCRIPT, {
      material: emitted.material,
      reason: emitted.reason,
    }).status === 0,
  );

  const second = runProducer(CLASSIFY_SCRIPT);
  check(
    'RUNTIME: duplicate/ambiguous material= emission FAILS closed',
    second.status !== 0,
    `exit=${second.status}`,
  );

  // B5. Producer-side fail-closed environments.
  const PRODUCER_REJECTIONS = [
    ['GITHUB_OUTPUT unset', { GITHUB_OUTPUT: undefined }, /GITHUB_OUTPUT is not set/],
    ['RUNNER_TEMP unset', { RUNNER_TEMP: undefined }, /RUNNER_TEMP is not set/],
    ['RUNNER_TEMP empty', { RUNNER_TEMP: '' }, /RUNNER_TEMP is empty/],
    ['RUNNER_TEMP relative', { RUNNER_TEMP: 'runner-temp' }, /not an absolute path/],
    ['RUNNER_TEMP nonexistent', { RUNNER_TEMP: join(sandbox, 'nope') }, /does not exist/],
    ['GITHUB_RUN_ID unset', { GITHUB_RUN_ID: undefined }, /GITHUB_RUN_ID is missing or empty/],
    ['GITHUB_RUN_ATTEMPT empty', { GITHUB_RUN_ATTEMPT: '' }, /GITHUB_RUN_ATTEMPT is missing or empty/],
  ];
  for (const [label, envOverrides, expected] of PRODUCER_REJECTIONS) {
    clearSidecar();
    const freshOutput = join(sandbox, `github-output-${label.replace(/[^a-z0-9]+/gi, '-')}.txt`);
    writeFileSync(freshOutput, '', 'utf8');
    const run = runProducer(CLASSIFY_SCRIPT, { GITHUB_OUTPUT: freshOutput, ...envOverrides });
    check(`RUNTIME: producer fails closed when ${label}`, run.status !== 0, `exit=${run.status}`);
    check(
      `RUNTIME: producer names the ${label} failure`,
      expected.test(`${run.stdout ?? ''}${run.stderr ?? ''}`),
      (run.stderr ?? '').slice(0, 200),
    );
    check(
      `RUNTIME: producer writes NO sidecar when ${label}`,
      !existsSync(sidecarPath) || envOverrides.RUNNER_TEMP === undefined,
    );
  }

  // B6. THE REVIEWED LOW, behaviourally. A classifier with ONLY the sidecar
  // write statement removed still mentions `classifierResultFilePath()` — an
  // identifier search is satisfied — yet it emits step outputs with no sidecar
  // behind them. The real validator must reject that, and the static contract
  // must catch it (asserted as MUTATION 12e above).
  const writeDeletedPath = join(sandbox, 'classifier-without-sidecar-write.mjs');
  const writeDeletedSource = baseClassifier.replace(SIDECAR_WRITE_STATEMENT, '');
  if (writeDeletedSource === baseClassifier) {
    throw new Error('mutation setup failed: sidecar write statement not removed');
  }
  // The copy runs from outside scripts/ci, so its filename-based entry guard
  // would never fire. Rewriting the guard is a harness accommodation only — it
  // is applied AFTER the mutation and asserted not to restore the sidecar write.
  const writeDeletedRunnable = writeDeletedSource.replace(
    "process.argv[1]?.endsWith('master-required-gate-classify.mjs')",
    'true',
  );
  if (writeDeletedRunnable === writeDeletedSource) {
    throw new Error('mutation setup failed: classifier entry guard not found');
  }
  writeFileSync(writeDeletedPath, writeDeletedRunnable, 'utf8');
  check(
    'SIDECAR-WRITE MUTANT harness accommodation does not restore the sidecar write',
    !writeDeletedRunnable.includes(SIDECAR_WRITE_STATEMENT),
  );
  check(
    'SIDECAR-WRITE MUTANT still references classifierResultFilePath() (identifier search would MISS it)',
    /classifierResultFilePath\(\)/.test(writeDeletedSource),
  );
  clearSidecar();
  const mutantOutput = join(sandbox, 'github-output-mutant.txt');
  writeFileSync(mutantOutput, '', 'utf8');
  const mutantRun = runProducer(writeDeletedPath, { GITHUB_OUTPUT: mutantOutput });
  check(
    'SIDECAR-WRITE MUTANT still emits its step outputs (it looks healthy from outside)',
    mutantRun.status === 0 && /^material=true$/m.test(readFileSync(mutantOutput, 'utf8')),
    `${mutantRun.status} ${mutantRun.stderr ?? ''}`,
  );
  check('SIDECAR-WRITE MUTANT wrote NO sidecar', !existsSync(sidecarPath));
  const mutantEmitted = Object.fromEntries(
    readFileSync(mutantOutput, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split('=')),
  );
  const mutantValidation = runValidatorForProducer(VALIDATE_SCRIPT, {
    material: mutantEmitted.material,
    reason: mutantEmitted.reason,
  });
  check(
    'SIDECAR-WRITE MUTANT is REJECTED at runtime by the real validator',
    mutantValidation.status !== 0 && /sidecar is missing/.test(`${mutantValidation.stderr ?? ''}`),
    `exit=${mutantValidation.status}`,
  );

  // B7. A STALE sidecar cannot rescue that mutant either: a leftover file from a
  // previous run sitting in RUNNER_TEMP is rejected on identity, which is the
  // whole point of stamping the run into it.
  clearSidecar();
  writeFileSync(
    sidecarPath,
    JSON.stringify({
      material: true,
      reason: 'material-path-changed',
      headSha: 'b'.repeat(40),
      runId: '11111',
      runAttempt: '1',
    }),
    'utf8',
  );
  const staleRescue = runValidatorForProducer(VALIDATE_SCRIPT, {
    material: mutantEmitted.material,
    reason: mutantEmitted.reason,
  });
  check(
    'SIDECAR-WRITE MUTANT cannot be rescued by a STALE sidecar left in RUNNER_TEMP',
    staleRescue.status !== 0 && /STALE/.test(`${staleRescue.stderr ?? ''}`),
    `exit=${staleRescue.status}`,
  );
  clearSidecar();
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
