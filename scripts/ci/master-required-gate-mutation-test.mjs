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
  EXPECTED_STAGE2_CANDIDATES,
  auditProducerConsumerContract,
  auditRegistryPortfolioAlignment,
  extractCallExpressions,
} from './master-required-gate-workflow-contract.mjs';
import { GATES, GATE_IDS, applicabilityDigest } from './master-required-gate-gates.mjs';
import { evaluateEnforcementReadiness } from './master-blocking-portfolio-contract.mjs';

const ROOT = resolve(process.cwd());
const WORKFLOW = resolve(ROOT, '.github/workflows/cbw-master-required-gate.yml');
const CLASSIFY_SCRIPT = resolve(ROOT, 'scripts/ci/master-required-gate-classify.mjs');
const VALIDATE_SCRIPT = resolve(ROOT, 'scripts/ci/master-required-gate-validate-output.mjs');
const GATES_SCRIPT = resolve(ROOT, 'scripts/ci/master-required-gate-gates.mjs');
const PORTFOLIO_PATH = resolve(ROOT, 'scripts/ci/master-blocking-portfolio.json');
const APPLICABILITY_SCRIPT = resolve(ROOT, 'scripts/ci/master-required-gate-applicability.mjs');
const VALIDATE_APPLICABILITY_SCRIPT = resolve(ROOT, 'scripts/ci/master-required-gate-validate-applicability.mjs');
const GATE_RESULT_SCRIPT = resolve(ROOT, 'scripts/ci/master-required-gate-gate-result.mjs');
const AGGREGATE_SCRIPT = resolve(ROOT, 'scripts/ci/master-required-gate-aggregate.mjs');
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
const baseGates = normalizeEol(readFileSync(GATES_SCRIPT, 'utf8'));
const baseApplicability = normalizeEol(readFileSync(APPLICABILITY_SCRIPT, 'utf8'));
const baseApplicabilityValidator = normalizeEol(readFileSync(VALIDATE_APPLICABILITY_SCRIPT, 'utf8'));
const baseGateResult = normalizeEol(readFileSync(GATE_RESULT_SCRIPT, 'utf8'));
const baseAggregate = normalizeEol(readFileSync(AGGREGATE_SCRIPT, 'utf8'));

const audit = (overrides = {}) =>
  auditProducerConsumerContract({
    workflowText: baseWorkflow,
    classifierSource: baseClassifier,
    validatorSource: baseValidator,
    gatesSource: baseGates,
    applicabilitySource: baseApplicability,
    applicabilityValidatorSource: baseApplicabilityValidator,
    gateResultSource: baseGateResult,
    aggregateSource: baseAggregate,
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

// Removes an entire job block: from its `  <job-id>:` line up to the next
// top-level job or the next job-level comment banner. Deleting a whole blocker
// is the mutation that matters most for a widening DAG — it is the shape a
// "temporarily disable this gate" change actually takes.
function removeJob(text, jobId) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line === `  ${jobId}:`);
  if (start === -1) throw new Error(`mutation setup failed: job "${jobId}" not found`);
  // Walk back over the comment banner that introduces the job, so the removal
  // does not leave a header describing a job that no longer exists.
  let from = start;
  while (from > 0 && /^ {2}#/.test(lines[from - 1])) from -= 1;
  let end = start + 1;
  while (end < lines.length && !/^ {2}(#|[A-Za-z0-9_-]+:)/.test(lines[end])) end += 1;
  lines.splice(from, end - from);
  const mutated = lines.join('\n');
  if (mutated === text) throw new Error(`mutation setup failed (no-op): remove job "${jobId}"`);
  return mutated;
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

// Mutant sources shared by the STATIC audit and the BEHAVIOURAL execution
// proofs, so "the contract catches it" and "it really is a fail-open mutant"
// are two facts about the SAME text rather than about two similar strings.
//
// `mutate` fails closed: a replacement that does not change the source, or a
// mutant that does not differ from the original, aborts the suite instead of
// being reported as caught. A mutation that never applied is worse than a
// failing one — it looks like evidence and is not.
function mutate(label, source, replacements) {
  let mutant = source;
  for (const [from, to] of replacements) {
    const next = mutant.replace(from, to);
    if (next === mutant) {
      throw new Error(`mutation setup failed (no-op): ${label} — "${String(from).slice(0, 60)}"`);
    }
    mutant = next;
  }
  return mutant;
}

// HARNESS ACCOMMODATIONS — applied AFTER a mutation, never as part of one.
// A mutant copy runs from the sandbox rather than from scripts/ci, so two
// things must be rewritten for it to execute at all: its sibling import (a bare
// `c:\...` path is not a legal ESM specifier on Windows) and its filename-based
// entry guard. Both are asserted below not to restore anything the mutation
// removed, so an accommodation can never be mistaken for a fix.
function asRunnableValidator(source) {
  return mutate('validator harness accommodation', source, [
    [
      "from './master-required-gate-classify.mjs'",
      `from ${JSON.stringify(pathToFileURL(CLASSIFY_SCRIPT).href)}`,
    ],
    ["process.argv[1]?.endsWith('master-required-gate-validate-output.mjs')", 'true'],
  ]);
}

function asRunnableClassifier(source) {
  return mutate('classifier harness accommodation', source, [
    ["process.argv[1]?.endsWith('master-required-gate-classify.mjs')", 'true'],
  ]);
}

const MUTANT_SOURCES = Object.freeze({
  // LOW 1 replacement: runnable, because the `node:os` import comes back too.
  tmpdirFallback: mutate('restore tmpdir fallback with its import', baseClassifier, [
    ["import { isAbsolute, join } from 'node:path';", "import { tmpdir } from 'node:os';\nimport { isAbsolute, join } from 'node:path';"],
    ['  const runnerTemp = process.env.RUNNER_TEMP;', '  const runnerTemp = process.env.RUNNER_TEMP || tmpdir();'],
  ]),
  // LOW 1 replacement: the empty-value fail-open is REACHED, because the
  // mutant returns before the absolute-path guard can reject it.
  emptyRunnerTempCwd: mutate('empty RUNNER_TEMP resolves against cwd', baseClassifier, [
    [
      "  if (runnerTemp.length === 0) {\n    throw new Error('master-required-gate: RUNNER_TEMP is empty');\n  }",
      '  if (runnerTemp.length === 0) {\n    return process.cwd();\n  }',
    ],
  ]),
  // MEDIUM 1: the exact reviewed bypass — one variable serving as both the
  // parsed value and the parse-failure sentinel.
  nullSentinelValidator: mutate('null-as-parse-sentinel', baseValidator, [
    ['    let parsed;\n    let parseOk = false;', '    let parsed = null;\n    let parseOk = false;'],
    ['      parseOk = true;\n', ''],
    [
      "    if (parseOk && (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) {\n      errors.push(\n        `classifier result sidecar must be a JSON object, got ${describeJsonValue(parsed)}`,\n      );\n    } else if (parseOk) {",
      '    if (false) {\n      errors.push("unreachable");\n    } else if (parsed !== null) {',
    ],
  ]),
  // MEDIUM 2: per-field vocabularies only, which is what accepted every
  // contradictory cross-product.
  noPairConsistencyValidator: mutate('drop step-output pair consistency', baseValidator, [
    ['    !isConsistentClassification(material, reason)', '    false'],
  ]),
  // Both halves removed. Needed for the BEHAVIOURAL demonstration: with only
  // the step-output check gone, the sidecar's own consistency check still
  // rejects the contradictory pair, so the fail-open shape never becomes
  // observable. Softening both is what exposes it — which is itself the
  // evidence that the two checks are independent lines of defence.
  noAnyPairConsistencyValidator: mutate('drop both pair-consistency checks', baseValidator, [
    ['    !isConsistentClassification(material, reason)', '    false'],
    [
      'if (!isConsistentClassification(String(sidecar.material), sidecar.reason)) {',
      'if (false) {',
    ],
  ]),
});

// --- A. static mutations -----------------------------------------------------
const MUTATIONS = [
  {
    id: 1,
    killedBy: /exactly one step carries the producer id/,
    label: 'remove the classifier producer step entirely',
    apply: () => ({ workflowText: removeStep(baseWorkflow, CLASSIFY_STEP) }),
  },
  {
    id: 2,
    killedBy: /exactly one step carries the producer id/,
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
    killedBy: /exactly one step runs the exact classifier command/,
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
    killedBy: /producer BASE_SHA is bound exactly to the PR base sha/,
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
    killedBy: /producer HEAD_SHA is bound exactly to the PR head sha/,
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
    killedBy: /producer BASE_SHA does not point at the head sha/,
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
    killedBy: /producer HEAD_SHA does not point at the base sha/,
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
    killedBy: /exactly one step runs the exact classifier-output validator command/,
    label: 'remove the unconditional validator step',
    apply: () => ({ workflowText: removeStep(baseWorkflow, VALIDATE_STEP) }),
  },
  {
    id: 9,
    killedBy: /validator step is UNCONDITIONAL/,
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
    killedBy: /validator compares the material output to the exact literal/,
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
    killedBy: /validator never trims or case-folds the material value/,
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
    killedBy: /targets an existing step id/,
    label: 'repoint a classification consumer at a nonexistent step id',
    apply: () => ({
      workflowText: requireChanged(
        'consumer -> bad id',
        baseWorkflow,
        baseWorkflow.replaceAll('${{ steps.classify.outputs.material }}', '${{ steps.classifyX.outputs.material }}'),
      ),
    }),
  },
  {
    id: '11b',
    killedBy: /names an emitted output/,
    label: 'repoint a classification consumer at a nonexistent output name',
    apply: () => ({
      workflowText: requireChanged(
        'consumer -> bad output',
        baseWorkflow,
        baseWorkflow.replaceAll('${{ steps.classify.outputs.material }}', '${{ steps.classify.outputs.materialX }}'),
      ),
    }),
  },
  {
    id: 12,
    killedBy: /classifier source appends the material\+reason pair to GITHUB_OUTPUT/,
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
    killedBy: /classifier performs exactly ONE writeFileSync/,
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
    killedBy: /classifier performs exactly ONE writeFileSync/,
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
    killedBy: /the sidecar write carries the classification material value/,
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
    killedBy: /classifier performs exactly ONE writeFileSync/,
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
    killedBy: /the sidecar write stamps the run identity field/,
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
    // REPLACED after review. The previous 12i inserted `|| tmpdir()` WITHOUT
    // restoring the `node:os` import, so the mutant was a ReferenceError, not a
    // fail-open classifier — it would have "died" of its own broken syntax
    // rather than of the contract. This version restores the import too, so the
    // mutant is genuinely runnable and its fail-open behaviour is reachable:
    // with RUNNER_TEMP unset it silently writes the sidecar into the
    // process-global temp directory. Section B9 proves both facts by execution.
    id: '12i',
    killedBy: /classifier (does not import os.tmpdir|never falls back when RUNNER_TEMP is unset)/,
    label: 'reintroduce the os.tmpdir() fallback for RUNNER_TEMP (with its import, runnable)',
    apply: () => ({ classifierSource: MUTANT_SOURCES.tmpdirFallback }),
  },
  {
    // REPLACED after review. The previous 12j deleted the empty-RUNNER_TEMP
    // throw, but execution then fell into the NEXT guard (`isAbsolute('')` is
    // false) and died there — killed by an unrelated rule, so it proved nothing
    // about the empty-value rule. This version makes the intended weakened
    // behaviour actually reachable: an empty RUNNER_TEMP silently resolves the
    // sidecar against the current working directory, the absolute-path guard is
    // never reached, and the producer succeeds. Section B9 proves it.
    id: '12j',
    killedBy: /classifier fails closed on an empty RUNNER_TEMP/,
    label: 'silently resolve an empty RUNNER_TEMP against cwd (reachable fail-open)',
    apply: () => ({ classifierSource: MUTANT_SOURCES.emptyRunnerTempCwd }),
  },
  {
    id: 16,
    killedBy: /validator (tracks JSON parse SUCCESS separately|requires the parsed sidecar to be a non-null)/,
    label: 'reintroduce null as the JSON parse-failure sentinel (the `null` sidecar bypass)',
    apply: () => ({ validatorSource: MUTANT_SOURCES.nullSentinelValidator }),
  },
  {
    id: 17,
    killedBy: /validator requires the parsed sidecar to be a non-null, non-array object/,
    label: 'drop the non-null-object requirement on the parsed sidecar',
    apply: () => ({
      validatorSource: requireChanged(
        'drop object requirement',
        baseValidator,
        baseValidator.replace(
          "if (parseOk && (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) {",
          'if (parseOk && false) {',
        ),
      ),
    }),
  },
  {
    id: 18,
    killedBy: /validator checks the STEP OUTPUT pair for consistency/,
    label: 'drop material/reason pair-consistency validation on the step outputs',
    apply: () => ({ validatorSource: MUTANT_SOURCES.noPairConsistencyValidator }),
  },
  {
    id: 19,
    killedBy: /validator enforces pair consistency on the sidecar/,
    label: 'drop material/reason pair-consistency validation on the sidecar',
    apply: () => ({
      validatorSource: requireChanged(
        'drop sidecar pair consistency',
        baseValidator,
        baseValidator.replace('contradicts its own', 'is fine alongside'),
      ),
    }),
  },
  {
    id: 20,
    killedBy: /the reason -> materiality mapping pins both fail-closed reasons to MATERIAL/,
    label: 'flip a fail-closed reason to imply NON-material in REASON_MATERIALITY',
    apply: () => ({
      classifierSource: requireChanged(
        'flip reason materiality',
        baseClassifier,
        baseClassifier.replace(
          "'unresolved-or-empty-change-set': true,",
          "'unresolved-or-empty-change-set': false,",
        ),
      ),
    }),
  },
  {
    id: 21,
    killedBy: /classifier derives the reason vocabulary from that mapping/,
    label: 'hand-maintain VALID_REASONS instead of deriving it from the mapping',
    apply: () => ({
      classifierSource: requireChanged(
        'undo derived vocabulary',
        baseClassifier,
        baseClassifier.replace(
          'export const VALID_REASONS = Object.freeze(Object.keys(REASON_MATERIALITY));',
          "export const VALID_REASONS = Object.freeze(['unresolved-or-empty-change-set', 'material-path-changed', 'only-allowlisted-non-material-paths']);",
        ),
      ),
    }),
  },
  {
    id: '12k',
    killedBy: /classifier fails closed on a malformed\/unusable RUNNER_TEMP/,
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
    killedBy: /validator step receives the exact PR head sha for staleness binding/,
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
    killedBy: /validator compares run identity against its OWN environment/,
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
    killedBy: /validator surfaces BOTH the sidecar-path and run-identity resolution failures/,
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
    killedBy: /classifier source rejects a duplicate material= emission/,
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
    killedBy: /classifier source fails closed when GITHUB_OUTPUT is unset/,
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

// --- A2. S2-03 DAG / aggregator mutations -----------------------------------
//
// Every one of these is a way to silently remove blocking coverage from the
// matrix while the stable required context still reports SUCCESS. They are the
// S2-03 equivalents of "delete the producer and stay green", and each declares
// the assertion that must be the one to kill it.
const replaceOnce = (label, source, from, to) => requireChanged(label, source, source.replace(from, to));

const DAG_MUTATIONS = [
  {
    id: 'S3-1',
    killedBy: /the final job carries `if: always\(\)`/,
    label: 'remove `if: always()` from the final aggregator (the context stops reporting)',
    // Anchored at line start for the same reason as S3-2 below, and now doubly
    // so: since S2-04 R1 every blocker emitter also carries an 8-space-indented
    // `if: always()`, and an unanchored substring match would have silently
    // mutated the FIRST emitter instead of the aggregator.
    apply: () => ({
      workflowText: replaceOnce('drop always()', baseWorkflow, /^ {4}if: always\(\)\n/m, ''),
    }),
  },
  {
    id: 'S3-2',
    killedBy: /the final job carries `if: always\(\)`/,
    label: 'soften the aggregator condition to `success()`',
    // Anchored at line start: an unanchored '    if: always()' also matches the
    // tail of the 8-space-indented `        if: always() && …` step condition,
    // which would mutate a completely different rule and "kill" this mutant for
    // the wrong reason.
    apply: () => ({
      workflowText: replaceOnce('always -> success', baseWorkflow, /^ {4}if: always\(\)$/m, '    if: success()'),
    }),
  },
  {
    id: 'S3-3',
    killedBy: /depends on the classifier AND on every registered blocker/,
    label: 'drop a `needs` edge from the aggregator (a blocker stops being aggregated)',
    apply: () => ({
      workflowText: replaceOnce(
        'drop needs edge',
        baseWorkflow,
        '      - global-header-interaction\n      - public-first-screen-budget\n',
        '      - global-header-interaction\n',
      ),
    }),
  },
  {
    id: 'S3-4',
    killedBy: /exactly one job carries the stable check context/,
    label: 'rename the final job so the stable required context disappears',
    apply: () => ({
      workflowText: replaceOnce('rename context', baseWorkflow, '    name: Master required gate\n', '    name: Master gate\n'),
    }),
  },
  {
    id: 'S3-5',
    killedBy: /declares EXACTLY the expected DAG jobs/,
    label: 'rename the final JOB ID (branch protection would follow a different job)',
    apply: () => ({
      workflowText: replaceOnce('rename final job id', baseWorkflow, '\n  master-required-gate:\n', '\n  master-gate-final:\n'),
    }),
  },
  {
    id: 'S3-6',
    killedBy: /publishes its result output bound to the emitter step/,
    label: 'delete a blocker result output (the aggregator would see nothing)',
    apply: () => ({
      workflowText: replaceOnce(
        'drop result output',
        baseWorkflow,
        '      result: ${{ steps.gate-result.outputs.result }}\n',
        '',
      ),
    }),
  },
  {
    id: 'S3-7',
    killedBy: /runs the result emitter exactly once/,
    label: 'delete a blocker result emitter step entirely',
    apply: () => ({ workflowText: removeStep(baseWorkflow, 'Publish global header blocker result') }),
  },
  {
    id: 'S3-8',
    killedBy: /carries NO job-level `if`/,
    label: 'give a blocker a job-level `if` so an irrelevant change SKIPS it',
    apply: () => ({
      workflowText: replaceOnce(
        'blocker job-level if',
        baseWorkflow,
        '  global-header-interaction:\n    name:',
        "  global-header-interaction:\n    if: needs.classify.outputs.gate_global_header_interaction == 'APPLICABLE'\n    name:",
      ),
    }),
  },
  {
    id: 'S3-9',
    killedBy: /exactly one step carries the applicability producer id/,
    label: 'delete the applicability producer step',
    apply: () => ({ workflowText: removeStep(baseWorkflow, 'Decide blocker applicability (fail-closed)') }),
  },
  {
    id: 'S3-10',
    killedBy: /applicability validator step is UNCONDITIONAL/,
    label: 'make the applicability validator conditional on the very output it validates',
    apply: () => ({
      workflowText: insertAfterStepName(
        baseWorkflow,
        'Validate blocker applicability',
        "        if: steps.applicability.outputs.digest != ''",
      ),
    }),
  },
  {
    id: 'S3-11',
    killedBy: /runs "node scripts\/seo\/site-indexability-inventory\.mjs" exactly once/,
    label: 'delete the indexability inventory from a blocker (silent coverage reduction)',
    apply: () => ({ workflowText: removeStep(baseWorkflow, 'Indexability inventory for the public SEO blocker') }),
  },
  {
    id: 'S3-12',
    killedBy: /is gated on the exact derived condition/,
    label: 'repoint a blocking step at a nonexistent classifier output',
    apply: () => ({
      workflowText: requireChanged(
        'repoint blocker condition',
        baseWorkflow,
        baseWorkflow.replaceAll(
          "needs.classify.outputs.gate_global_header_interaction == 'APPLICABLE'",
          "needs.classify.outputs.gate_global_header == 'APPLICABLE'",
        ),
      ),
    }),
  },
  {
    id: 'S3-13',
    killedBy: /result emitter observes EXACTLY the declared blocking steps/,
    label: 'drop one step outcome from a result emitter (a deleted step would go unnoticed)',
    apply: () => ({
      workflowText: replaceOnce(
        'drop an observed outcome',
        baseWorkflow,
        '            {"name":"node scripts/seo/site-indexability-inventory.mjs","outcome":"${{ steps.indexability.outcome }}"}]\n        run: node scripts/ci/master-required-gate-gate-result.mjs\n\n  # --- 2b.',
        '            {"name":"node scripts/seo/site-indexability-inventory.mjs","outcome":"success"}]\n        run: node scripts/ci/master-required-gate-gate-result.mjs\n\n  # --- 2b.',
      ),
    }),
  },
  {
    id: 'S3-14',
    killedBy: /receives the classifier JOB RESULT/,
    label: 'unwire the aggregator from the classifier JOB RESULT (a failed classifier becomes invisible)',
    apply: () => ({
      workflowText: replaceOnce(
        'drop CLASSIFY_JOB_RESULT',
        baseWorkflow,
        '          CLASSIFY_JOB_RESULT: ${{ needs.classify.result }}\n',
        '',
      ),
    }),
  },
  {
    id: 'S3-15',
    killedBy: /receives blocker "global-header-interaction" JOB RESULT/,
    label: 'unwire the aggregator from a blocker JOB RESULT',
    apply: () => ({
      workflowText: replaceOnce(
        'drop blocker job result',
        baseWorkflow,
        '          GATE_GLOBAL_HEADER_INTERACTION_JOB_RESULT: ${{ needs.global-header-interaction.result }}\n',
        '',
      ),
    }),
  },
  {
    id: 'S3-16',
    killedBy: /receives blocker "public-seo-metadata" evidence/,
    label: 'unwire the aggregator from a blocker evidence output',
    apply: () => ({
      workflowText: replaceOnce(
        'drop blocker evidence',
        baseWorkflow,
        '          GATE_PUBLIC_SEO_METADATA_EVIDENCE: ${{ needs.public-seo-metadata.outputs.evidence }}\n',
        '',
      ),
    }),
  },
  {
    id: 'S3-17',
    killedBy: /the aggregator accepts only PASS and NOT_APPLICABLE/,
    label: 'widen the accepted result vocabulary to include FAIL',
    apply: () => ({
      aggregateSource: replaceOnce(
        'widen vocabulary',
        baseAggregate,
        'ACCEPTED_GATE_OUTCOMES.includes(result)',
        'GATE_OUTCOMES.includes(result)',
      ),
    }),
  },
  {
    id: 'S3-18',
    killedBy: /rejects a blocker job that did not succeed/,
    label: 'let the aggregator accept a skipped/cancelled/failed blocker job',
    apply: () => ({
      aggregateSource: replaceOnce('accept any job result', baseAggregate, 'jobResult !== REQUIRED_JOB_RESULT', 'false'),
    }),
  },
  {
    id: 'S3-19',
    killedBy: /never treats `skipped` as a pass/,
    label: 'make the aggregator treat GitHub `skipped` as a pass',
    apply: () => ({
      aggregateSource: replaceOnce(
        'skipped => pass',
        baseAggregate,
        "          `${JSON.stringify(REQUIRED_JOB_RESULT)} — failed, cancelled and skipped are all rejected; a blocker ` +",
        "          `${JSON.stringify(REQUIRED_JOB_RESULT)} — but a skipped blocker is fine; a blocker ` +",
      ),
    }),
  },
  {
    id: 'S3-20',
    killedBy: /rejects a classifier job that did not succeed/,
    label: 'let the aggregator ignore a failed classifier job',
    apply: () => ({
      aggregateSource: replaceOnce(
        'ignore classifier failure',
        baseAggregate,
        'classifyResult !== REQUIRED_JOB_RESULT',
        'false',
      ),
    }),
  },
  {
    id: 'S3-21',
    killedBy: /fails when an expected blocker produced no result at all/,
    label: 'let a missing blocker result pass unnoticed',
    apply: () => ({
      aggregateSource: replaceOnce(
        'ignore missing blocker',
        baseAggregate,
        'produced NO result at all',
        'is optional',
      ),
    }),
  },
  {
    id: 'S3-22',
    killedBy: /requires the blocker evidence digest to match its RECOMPUTED digest/,
    label: 'stop checking the blocker evidence digest (a stale decision would be laundered through)',
    apply: () => ({
      aggregateSource: replaceOnce('ignore digest', baseAggregate, 'evidence.digest !== expectedDigest', 'false'),
    }),
  },
  // --- H1: the independent recomputation, mutated every way it could be lost --
  {
    id: 'S3-22a',
    killedBy: /INDEPENDENTLY recomputes the canonical applicability digest/,
    label: 'delete the aggregator\'s independent recomputation and trust the supplied digest instead',
    apply: () => ({
      aggregateSource: replaceOnce(
        'trust the supplied digest',
        baseAggregate,
        'decision !== null && boundIdentity !== null ? applicabilityDigest(decision, boundIdentity) : null;',
        'digest ?? null;',
      ),
    }),
  },
  {
    id: 'S3-22b',
    killedBy: /INDEPENDENTLY recomputes the canonical applicability digest/,
    label: 'disable the recomputation entirely (expectedDigest becomes a constant)',
    apply: () => ({
      aggregateSource: replaceOnce(
        'constant expected digest',
        baseAggregate,
        'decision !== null && boundIdentity !== null ? applicabilityDigest(decision, boundIdentity) : null;',
        'null;',
      ),
    }),
  },
  {
    id: 'S3-22c',
    killedBy: /treats the CLASSIFIER digest as a claim checked against its own recomputation/,
    label: 'let the classifier\'s own digest claim go unverified against the recomputation',
    apply: () => ({
      aggregateSource: replaceOnce(
        'unverified classifier digest',
        baseAggregate,
        '} else if (digest !== expectedDigest) {',
        '} else if (false) {',
      ),
    }),
  },
  {
    id: 'S3-22d',
    killedBy: /never compares blocker evidence against the supplied digest alone/,
    label: 'repoint the blocker evidence check back at the SUPPLIED digest (the original H1 defect)',
    apply: () => ({
      aggregateSource: replaceOnce(
        'compare claim to claim',
        baseAggregate,
        'evidence.digest !== expectedDigest',
        'evidence.digest !== digest',
      ),
    }),
  },
  {
    id: 'S3-22e',
    killedBy: /fails closed when it cannot recompute the canonical digest/,
    label: 'accept an evidence chain the aggregator could not verify at all',
    apply: () => ({
      aggregateSource: replaceOnce(
        'accept unverifiable chain',
        baseAggregate,
        '  if (expectedDigest === null) {',
        '  if (false) {',
      ),
    }),
  },
  {
    id: 'S3-22f',
    killedBy: /fails closed when the run identity is missing or incomplete/,
    label: 'stop requiring a complete run identity (the digest stops being bound to this execution)',
    apply: () => ({
      aggregateSource: replaceOnce(
        'drop identity binding',
        baseAggregate,
        'gate run identity is incomplete',
        'gate run identity is fine',
      ),
    }),
  },
  {
    id: 'S3-22g',
    killedBy: /resolves THIS run identity from its own environment/,
    label: 'take the aggregator run identity from somewhere other than its own environment',
    apply: () => ({
      aggregateSource: replaceOnce(
        'unresolve identity',
        baseAggregate,
        '    identity = resolveRunIdentity();',
        '    identity = JSON.parse(process.env.SUPPLIED_IDENTITY ?? "null");',
      ),
    }),
  },
  {
    id: 'S3-22h',
    killedBy: /rejects a digest claim that is not even a sha-256 hex digest/,
    label: 'accept a digest claim of any shape at all',
    apply: () => ({
      aggregateSource: replaceOnce(
        'any digest shape',
        baseAggregate,
        '!DIGEST_PATTERN.test(digest)',
        'false',
      ),
    }),
  },
  {
    id: 'S3-22i',
    killedBy: /imports the canonical digest function rather than reimplementing hashing/,
    label: 'reimplement the hashing inside the aggregator instead of using the canonical function',
    apply: () => ({
      aggregateSource: replaceOnce(
        'duplicate hashing',
        baseAggregate,
        "import { RUN_IDENTITY_ENV, resolveRunIdentity } from './master-required-gate-classify.mjs';",
        "import { createHash } from 'node:crypto';\n" +
          "import { RUN_IDENTITY_ENV, resolveRunIdentity } from './master-required-gate-classify.mjs';",
      ),
    }),
  },
  {
    id: 'S3-22j',
    killedBy: /binds HEAD_SHA to the PR head sha \(run identity is part of the digest contract\)/,
    label: 'unbind the aggregator HEAD_SHA from the PR head sha',
    apply: () => ({
      workflowText: replaceOnce(
        'aggregator head sha',
        baseWorkflow,
        '          HEAD_SHA: ${{ github.event.pull_request.head.sha }}\n          CLASSIFY_JOB_RESULT:',
        '          CLASSIFY_JOB_RESULT:',
      ),
    }),
  },
  {
    id: 'S3-23',
    killedBy: /requires NOT_APPLICABLE to be backed by the classifier decision/,
    label: 'accept an unjustified NOT_APPLICABLE',
    apply: () => ({
      aggregateSource: replaceOnce(
        'unjustified NOT_APPLICABLE',
        baseAggregate,
        "result === 'NOT_APPLICABLE' && decided !== 'NOT_APPLICABLE'",
        'false',
      ),
    }),
  },
  {
    id: 'S3-24',
    killedBy: /requires PASS to be backed by an APPLICABLE decision/,
    label: 'accept a PASS from a gate the classifier never made applicable',
    apply: () => ({
      aggregateSource: replaceOnce(
        'unjustified PASS',
        baseAggregate,
        "result === 'PASS' && decided !== 'APPLICABLE'",
        'false',
      ),
    }),
  },
  {
    id: 'S3-25',
    killedBy: /iterates the closed registry/,
    label: 'aggregate whatever results arrive instead of the closed registry',
    apply: () => ({
      aggregateSource: replaceOnce(
        'iterate observed gates',
        baseAggregate,
        '  for (const gateId of GATE_IDS) {\n    const observed = gates?.[gateId];',
        '  for (const gateId of Object.keys(gates ?? {})) {\n    const observed = gates?.[gateId];',
      ),
    }),
  },
  {
    id: 'S3-26',
    killedBy: /requires literal `success` for every step of an APPLICABLE gate/,
    label: 'let a blocker publish PASS on skipped work',
    apply: () => ({
      gateResultSource: replaceOnce(
        'accept skipped as success',
        baseGateResult,
        "REQUIRED_OUTCOME_WHEN_APPLICABLE = 'success'",
        "REQUIRED_OUTCOME_WHEN_APPLICABLE = 'skipped'",
      ),
    }),
  },
  {
    id: 'S3-27',
    killedBy: /proves the job ran every declared blocking command/,
    label: 'stop proving the blocker ran every declared blocking command',
    apply: () => ({
      gateResultSource: replaceOnce('drop arity proof', baseGateResult, 'stepOutcomes.length !== declared', 'false'),
    }),
  },
  {
    id: 'S3-28',
    killedBy: /rejects an applicability outside the closed vocabulary/,
    label: 'let a blocker read an empty applicability as NOT_APPLICABLE',
    apply: () => ({
      gateResultSource: replaceOnce(
        'widen applicability',
        baseGateResult,
        'APPLICABILITY_VALUES.includes(applicability)',
        'true',
      ),
    }),
  },
  {
    id: 'S3-29',
    killedBy: /recomputes the evidence digest rather than trusting it/,
    label: 'let the applicability validator trust the digest it was handed',
    apply: () => ({
      applicabilityValidatorSource: replaceOnce(
        'trust digest',
        baseApplicabilityValidator,
        'applicabilityDigest(parsed, expectedIdentity)',
        'digest',
      ),
    }),
  },
  {
    id: 'S3-30',
    killedBy: /rejects a STALE sidecar/,
    label: 'let the applicability validator accept a STALE sidecar',
    apply: () => ({
      applicabilityValidatorSource: requireChanged(
        'accept stale',
        baseApplicabilityValidator,
        baseApplicabilityValidator.replaceAll('sidecar is STALE', 'sidecar is fine'),
      ),
    }),
  },
  {
    id: 'S3-31',
    killedBy: /performs exactly ONE writeFileSync to applicabilityResultFilePath/,
    label: 'remove the applicability producer sidecar write',
    apply: () => ({
      applicabilitySource: requireChanged(
        'drop applicability sidecar write',
        baseApplicability,
        baseApplicability.replaceAll('applicabilityResultFilePath()', 'undefined'),
      ),
    }),
  },
  {
    id: 'S3-32',
    killedBy: /applicability model treats an unnormalizable path as RELEVANT/,
    label: 'let a malformed path count as inert (fail-open applicability)',
    apply: () => ({
      gatesSource: replaceOnce(
        'malformed path inert',
        baseGates,
        'normalized === null || !inert.has(normalized)',
        '!inert.has(normalized)',
      ),
    }),
  },
  {
    id: 'S3-33',
    killedBy: /pins reason -> applicability as the single source of truth/,
    label: 'flip a fail-closed applicability reason to imply NOT_APPLICABLE',
    apply: () => ({
      gatesSource: replaceOnce(
        'flip applicability reason',
        baseGates,
        "'unresolved-or-empty-change-set': 'APPLICABLE'",
        "'unresolved-or-empty-change-set': 'NOT_APPLICABLE'",
      ),
    }),
  },
  {
    id: 'S3-34',
    killedBy: /applicability model treats an unresolved or empty change set as APPLICABLE/,
    label: 'let an unresolved change set skip every blocker',
    apply: () => ({
      gatesSource: replaceOnce(
        'unresolved => skip',
        baseGates,
        '  if (!Array.isArray(paths) || paths.length === 0) {\n    return { applicability: \'APPLICABLE\', reason: \'unresolved-or-empty-change-set\', relevant: [] };\n  }',
        '  if (!Array.isArray(paths)) {\n    return { applicability: \'NOT_APPLICABLE\', reason: \'only-gate-irrelevant-paths\', relevant: [] };\n  }',
      ),
    }),
  },
  {
    id: 'S3-35',
    killedBy: /derives its universally-inert paths from the S2-01 allowlist/,
    label: 'hand-maintain the universally-inert set instead of deriving it',
    apply: () => ({
      gatesSource: replaceOnce(
        'hand-maintain inert set',
        baseGates,
        'export const UNIVERSALLY_INERT_PATHS = Object.freeze([...NON_MATERIAL_PATHS]);',
        "export const UNIVERSALLY_INERT_PATHS = Object.freeze(['README.md', 'AUDIT_REPORT.md']);",
      ),
    }),
  },
  {
    id: 'S3-36',
    killedBy: /self-proving suite "node scripts\/ci\/master-required-gate-parity-test\.mjs" runs exactly once/,
    label: 'remove the legacy/unified parity suite from the gate',
    apply: () => ({ workflowText: removeStep(baseWorkflow, 'Legacy/unified parity suite') }),
  },
  {
    id: 'S3-37',
    killedBy: /the final job never runs `npm ci`/,
    label: 'make the aggregator depend on a successful `npm ci`',
    apply: () => ({
      workflowText: replaceOnce(
        'aggregator npm ci',
        baseWorkflow,
        '      - name: Aggregate blocker outcomes (fail-closed)',
        '      - name: Install for aggregation\n        run: npm ci\n\n      - name: Aggregate blocker outcomes (fail-closed)',
      ),
    }),
  },
];

// =============================================================================
// S2-04 BATCH 01 — the two blockers added to the DAG are bound just as tightly
// =============================================================================
//
// Widening a DAG is exactly the moment invariants quietly stop applying to the
// new members: the suite stays green because it still proves everything it used
// to prove, about the jobs it used to prove it about. Every mutation below is an
// S3 mutation RE-AIMED at Public Navigation Boundary or Public First Screen
// Budget, so "the new jobs are as bound as the old ones" is demonstrated rather
// than assumed. They are additions, not replacements — the S3 mutations above
// still run against their original targets.
const S2_04_MUTATIONS = [
  {
    id: 'S4-1',
    killedBy: /declares EXACTLY the expected DAG jobs/,
    label: 'delete the Public Navigation blocker job entirely',
    apply: () => ({ workflowText: removeJob(baseWorkflow, 'public-navigation') }),
  },
  {
    id: 'S4-2',
    killedBy: /declares EXACTLY the expected DAG jobs/,
    label: 'delete the Public First Screen Budget blocker job entirely',
    apply: () => ({ workflowText: removeJob(baseWorkflow, 'public-first-screen-budget') }),
  },
  {
    id: 'S4-3',
    killedBy: /declares EXACTLY the expected DAG jobs/,
    label: 'rename the Public Navigation blocker job without updating the registry',
    apply: () => ({
      workflowText: replaceOnce(
        'rename navigation job',
        baseWorkflow,
        '\n  public-navigation:\n',
        '\n  public-nav:\n',
      ),
    }),
  },
  {
    id: 'S4-4',
    killedBy: /declares EXACTLY the expected DAG jobs/,
    label: 'rename the First Screen Budget blocker job without updating the registry',
    apply: () => ({
      workflowText: replaceOnce(
        'rename first screen job',
        baseWorkflow,
        '\n  public-first-screen-budget:\n',
        '\n  public-first-screen:\n',
      ),
    }),
  },
  {
    id: 'S4-5',
    killedBy: /the final job has a `needs` edge on blocker "public-navigation"/,
    label: 'drop the aggregator `needs` edge on Public Navigation (it stops being aggregated)',
    apply: () => ({
      workflowText: replaceOnce('drop navigation needs', baseWorkflow, '      - public-navigation\n', ''),
    }),
  },
  {
    id: 'S4-6',
    killedBy: /the final job has a `needs` edge on blocker "public-first-screen-budget"/,
    label: 'drop the aggregator `needs` edge on First Screen Budget (it stops being aggregated)',
    apply: () => ({
      workflowText: replaceOnce('drop first screen needs', baseWorkflow, '      - public-first-screen-budget\n', ''),
    }),
  },
  {
    id: 'S4-7',
    killedBy: /carries NO job-level `if`/,
    label: 'give Public Navigation a job-level `if` so an irrelevant change SKIPS it',
    apply: () => ({
      workflowText: replaceOnce(
        'navigation job-level if',
        baseWorkflow,
        '  public-navigation:\n    name:',
        "  public-navigation:\n    if: needs.classify.outputs.gate_public_navigation == 'APPLICABLE'\n    name:",
      ),
    }),
  },
  {
    id: 'S4-8',
    killedBy: /carries NO job-level `if`/,
    label: 'give First Screen Budget a job-level `if` so an irrelevant change SKIPS it',
    apply: () => ({
      workflowText: replaceOnce(
        'first screen job-level if',
        baseWorkflow,
        '  public-first-screen-budget:\n    name:',
        "  public-first-screen-budget:\n    if: needs.classify.outputs.gate_public_first_screen_budget == 'APPLICABLE'\n    name:",
      ),
    }),
  },
  {
    id: 'S4-9',
    killedBy: /runs "node scripts\/seo\/public-navigation-boundary-test\.mjs" exactly once/,
    label: 'delete the navigation boundary hard-gate step (silent coverage reduction)',
    apply: () => ({ workflowText: removeStep(baseWorkflow, 'Public navigation boundary') }),
  },
  {
    id: 'S4-10',
    killedBy: /runs "node scripts\/ui\/public-first-screen-budget-browser-smoke\.mjs" exactly once/,
    label: 'delete the first-screen Chromium matrix step (silent coverage reduction)',
    apply: () => ({ workflowText: removeStep(baseWorkflow, 'Public first-screen Chromium matrix') }),
  },
  {
    id: 'S4-11',
    killedBy: /"public-navigation" runs "npm run build" exactly once/,
    label: 'drop the production build from Public Navigation (its gate script would run against a stale tree)',
    apply: () => ({ workflowText: removeStep(baseWorkflow, 'Production build for the public navigation blocker') }),
  },
  {
    id: 'S4-12',
    killedBy: /"public-first-screen-budget" runs "npm run build" exactly once/,
    label: 'drop the production build from First Screen Budget',
    apply: () => ({ workflowText: removeStep(baseWorkflow, 'Production build for the first-screen budget blocker') }),
  },
  {
    id: 'S4-13',
    killedBy: /is gated on the exact derived condition/,
    label: 'repoint a Public Navigation step at a nonexistent classifier output',
    apply: () => ({
      workflowText: requireChanged(
        'repoint navigation condition',
        baseWorkflow,
        baseWorkflow.replaceAll(
          "needs.classify.outputs.gate_public_navigation == 'APPLICABLE'",
          "needs.classify.outputs.gate_navigation == 'APPLICABLE'",
        ),
      ),
    }),
  },
  {
    id: 'S4-14',
    killedBy: /is gated on the exact derived condition/,
    label: 'repoint a First Screen Budget step at a nonexistent classifier output',
    apply: () => ({
      workflowText: requireChanged(
        'repoint first screen condition',
        baseWorkflow,
        baseWorkflow.replaceAll(
          "needs.classify.outputs.gate_public_first_screen_budget == 'APPLICABLE'",
          "needs.classify.outputs.gate_first_screen == 'APPLICABLE'",
        ),
      ),
    }),
  },
  {
    id: 'S4-15',
    killedBy: /receives blocker "public-navigation" JOB RESULT/,
    label: 'unwire the aggregator from the Public Navigation JOB RESULT',
    apply: () => ({
      workflowText: replaceOnce(
        'drop navigation job result',
        baseWorkflow,
        '          GATE_PUBLIC_NAVIGATION_JOB_RESULT: ${{ needs.public-navigation.result }}\n',
        '',
      ),
    }),
  },
  {
    id: 'S4-16',
    killedBy: /receives blocker "public-first-screen-budget" published result/,
    label: 'unwire the aggregator from the First Screen Budget published result',
    apply: () => ({
      workflowText: replaceOnce(
        'drop first screen result',
        baseWorkflow,
        '          GATE_PUBLIC_FIRST_SCREEN_BUDGET_RESULT: ${{ needs.public-first-screen-budget.outputs.result }}\n',
        '',
      ),
    }),
  },
  {
    id: 'S4-17',
    killedBy: /receives blocker "public-navigation" evidence/,
    label: 'unwire the aggregator from the Public Navigation evidence (the digest chain goes unchecked)',
    apply: () => ({
      workflowText: replaceOnce(
        'drop navigation evidence',
        baseWorkflow,
        '          GATE_PUBLIC_NAVIGATION_EVIDENCE: ${{ needs.public-navigation.outputs.evidence }}\n',
        '',
      ),
    }),
  },
  {
    id: 'S4-18',
    killedBy: /receives blocker "public-first-screen-budget" evidence/,
    label: 'unwire the aggregator from the First Screen Budget evidence',
    apply: () => ({
      workflowText: replaceOnce(
        'drop first screen evidence',
        baseWorkflow,
        '          GATE_PUBLIC_FIRST_SCREEN_BUDGET_EVIDENCE: ${{ needs.public-first-screen-budget.outputs.evidence }}\n',
        '',
      ),
    }),
  },
  {
    id: 'S4-19',
    killedBy: /result emitter observes EXACTLY the declared blocking steps/,
    label: 'hard-code a step outcome in the Public Navigation emitter (a deleted step would go unnoticed)',
    apply: () => ({
      workflowText: replaceOnce(
        'hardcode navigation outcome',
        baseWorkflow,
        '{"name":"node scripts/seo/public-navigation-boundary-test.mjs","outcome":"${{ steps.navigation.outcome }}"}]',
        '{"name":"node scripts/seo/public-navigation-boundary-test.mjs","outcome":"success"}]',
      ),
    }),
  },
  {
    id: 'S4-20',
    killedBy: /result emitter observes EXACTLY the declared blocking steps/,
    label: 'hard-code a step outcome in the First Screen Budget emitter',
    apply: () => ({
      workflowText: replaceOnce(
        'hardcode first screen outcome',
        baseWorkflow,
        '{"name":"node scripts/ui/public-first-screen-budget-browser-smoke.mjs","outcome":"${{ steps.first-screen.outcome }}"}]',
        '{"name":"node scripts/ui/public-first-screen-budget-browser-smoke.mjs","outcome":"success"}]',
      ),
    }),
  },
  {
    id: 'S4-21',
    killedBy: /"public-navigation" publishes its result output bound to the emitter step/,
    label: 'delete the Public Navigation result output (the aggregator would see nothing)',
    apply: () => ({
      workflowText: replaceOnce(
        'drop navigation result output',
        baseWorkflow,
        '  public-navigation:\n    name: Public navigation boundary (unified blocker)\n' +
          '    needs: classify\n    runs-on: ubuntu-latest\n    timeout-minutes: 30\n    outputs:\n' +
          '      result: ${{ steps.gate-result.outputs.result }}\n',
        '  public-navigation:\n    name: Public navigation boundary (unified blocker)\n' +
          '    needs: classify\n    runs-on: ubuntu-latest\n    timeout-minutes: 30\n    outputs:\n',
      ),
    }),
  },
  {
    id: 'S4-22',
    killedBy: /"public-first-screen-budget" runs the result emitter exactly once/,
    label: 'delete the First Screen Budget result emitter step',
    apply: () => ({ workflowText: removeStep(baseWorkflow, 'Publish first-screen budget blocker result') }),
  },
  {
    id: 'S4-23',
    killedBy: /"public-navigation" result emitter condition is EXACTLY `always\(\)`/,
    label: 'condition the Public Navigation emitter on applicability (an irrelevant change would publish nothing)',
    apply: () => ({
      workflowText: replaceOnce(
        'navigation emitter conditional',
        baseWorkflow,
        '      - name: Publish public navigation blocker result\n        id: gate-result\n        if: always()\n',
        '      - name: Publish public navigation blocker result\n        id: gate-result\n' +
          "        if: needs.classify.outputs.gate_public_navigation == 'APPLICABLE'\n",
      ),
    }),
  },
  {
    id: 'S4-24',
    killedBy: /"public-navigation" result emitter declares its own gate id/,
    label: 'make the Public Navigation emitter publish under ANOTHER gate\'s id',
    apply: () => ({
      workflowText: replaceOnce(
        'swap navigation gate id',
        baseWorkflow,
        '          GATE_ID: public-navigation\n',
        '          GATE_ID: public-seo-metadata\n',
      ),
    }),
  },
  {
    id: 'S4-25',
    killedBy: /"public-first-screen-budget" result emitter carries the classifier evidence digest/,
    label: 'strip the evidence digest from the First Screen Budget emitter (its outcome becomes unbindable)',
    apply: () => ({
      workflowText: replaceOnce(
        'drop first screen digest',
        baseWorkflow,
        '          GATE_APPLICABILITY: ${{ needs.classify.outputs.gate_public_first_screen_budget }}\n' +
          '          APPLICABILITY_DIGEST: ${{ needs.classify.outputs.digest }}\n',
        '          GATE_APPLICABILITY: ${{ needs.classify.outputs.gate_public_first_screen_budget }}\n',
      ),
    }),
  },
  {
    id: 'S4-26',
    killedBy: /"public-navigation" checks out the EXACT PR head sha/,
    label: 'check out the merge ref instead of the exact PR head in Public Navigation',
    apply: () => ({
      workflowText: replaceOnce(
        'navigation loose checkout',
        baseWorkflow,
        '      - name: Checkout exact PR head for the public navigation blocker\n' +
          '        uses: actions/checkout@v4\n        with:\n' +
          '          ref: ${{ github.event.pull_request.head.sha }}\n',
        '      - name: Checkout exact PR head for the public navigation blocker\n' +
          '        uses: actions/checkout@v4\n        with:\n' +
          '          ref: ${{ github.ref }}\n',
      ),
    }),
  },
  {
    id: 'S4-27',
    killedBy: /classifier job publishes output "gate_public_navigation" bound to its producer step/,
    label: 'delete the Public Navigation applicability output from the classifier job',
    apply: () => ({
      workflowText: replaceOnce(
        'drop navigation classify output',
        baseWorkflow,
        '      gate_public_navigation: ${{ steps.applicability.outputs.gate_public_navigation }}\n',
        '',
      ),
    }),
  },
  {
    id: 'S4-28',
    killedBy: /re-checks the per-gate convenience output for "public-first-screen-budget"/,
    label: 'stop re-validating the First Screen Budget applicability output',
    apply: () => ({
      workflowText: replaceOnce(
        'drop first screen validation',
        baseWorkflow,
        '          GATE_PUBLIC_FIRST_SCREEN_BUDGET_APPLICABILITY: ${{ steps.applicability.outputs.gate_public_first_screen_budget }}\n',
        '',
      ),
    }),
  },
  // --- the DERIVED inert set is itself a trust boundary ----------------------
  //
  // S2-04 replaced four hand-written cross-gate inert entries with a derivation.
  // A derivation is only an improvement while it is CORRECT, so the two ways it
  // could silently go fail-open are mutated directly.
  {
    id: 'S4-29',
    killedBy: /derived inert set EXCLUDES the gate's own exclusive surface/,
    label: 'let a gate treat its OWN exclusive surface as inert (it would skip its own change)',
    apply: () => ({
      gatesSource: replaceOnce(
        'self-inert',
        baseGates,
        '    .filter((otherId) => otherId !== gateId)\n',
        '',
      ),
    }),
  },
  {
    id: 'S4-30',
    killedBy: /derived inert set is exactly the allowlist plus FOREIGN exclusive surfaces/,
    label: 'add the SHARED indexability inventory to every inert set (two gates would skip a real dependency)',
    apply: () => ({
      gatesSource: replaceOnce(
        'shared script inert',
        baseGates,
        '  return Object.freeze([...UNIVERSALLY_INERT_PATHS, ...foreign]);',
        "  return Object.freeze([...UNIVERSALLY_INERT_PATHS, ...foreign, 'scripts/seo/site-indexability-inventory.mjs']);",
      ),
    }),
  },
];

// =============================================================================
// S2-04 R1 / M1 — THE EMITTER MUST ALWAYS RUN, FOR EVERY REGISTERED BLOCKER
// =============================================================================
//
// The reviewed MEDIUM was generic: no blocker's emitter carried `if: always()`,
// so a failed build or a failed hard-gate script SKIPPED the step that publishes
// the blocker's outcome. The mutants below are therefore GENERATED FROM THE
// REGISTRY, one set per gate — a fix applied to the two new blockers and not the
// two older ones would leave half of these red, and a fifth gate registered
// without an always-running emitter is caught the moment it is added.
//
// The emitter step name is not derivable from the registry (it is prose), so it
// is located by the step's unique `id: gate-result` line inside the gate's own
// job block, which IS derivable.
const EMITTER_MUTANTS = [];
for (const gateId of GATE_IDS) {
  const gate = GATES[gateId];
  // The emitter block of THIS gate: everything from its job id to its `if`.
  const jobStart = baseWorkflow.indexOf(`\n  ${gate.jobId}:\n`);
  if (jobStart === -1) throw new Error(`mutation setup failed: job "${gate.jobId}" not found`);
  const emitterAt = baseWorkflow.indexOf('        id: gate-result\n        if: always()\n', jobStart);
  if (emitterAt === -1) throw new Error(`mutation setup failed: emitter of "${gateId}" not found`);
  const nameLineStart = baseWorkflow.lastIndexOf('      - name: ', emitterAt);
  const EMITTER_BLOCK = baseWorkflow.slice(nameLineStart, emitterAt + '        id: gate-result\n        if: always()\n'.length);

  EMITTER_MUTANTS.push(
    {
      id: `M1-${gateId}-no-if`,
      killedBy: new RegExp(`"${gateId}" result emitter carries an explicit \`if\``),
      label: `remove \`if: always()\` from the "${gateId}" emitter (implicit success() skips it after a failure)`,
      apply: () => ({
        workflowText: replaceOnce(
          `${gateId} emitter loses always()`,
          baseWorkflow,
          EMITTER_BLOCK,
          EMITTER_BLOCK.replace('        if: always()\n', ''),
        ),
      }),
    },
    {
      id: `M1-${gateId}-success`,
      killedBy: new RegExp(`"${gateId}" result emitter is NOT conditioned on success`),
      label: `replace the "${gateId}" emitter condition with \`if: success()\``,
      apply: () => ({
        workflowText: replaceOnce(
          `${gateId} emitter success()`,
          baseWorkflow,
          EMITTER_BLOCK,
          EMITTER_BLOCK.replace('if: always()', 'if: success()'),
        ),
      }),
    },
    {
      id: `M1-${gateId}-not-cancelled`,
      killedBy: new RegExp(`"${gateId}" result emitter condition is EXACTLY \`always\\(\\)\``),
      label: `weaken the "${gateId}" emitter condition to \`!cancelled()\``,
      apply: () => ({
        workflowText: replaceOnce(
          `${gateId} emitter !cancelled()`,
          baseWorkflow,
          EMITTER_BLOCK,
          EMITTER_BLOCK.replace('if: always()', 'if: "!cancelled()"'),
        ),
      }),
    },
    // THE continue-on-error FAMILY (S2-04 R2 / 3). One mutant per FORM the field
    // can take, because the R1 rule (`!== true`) killed only the first of them:
    // the expression form parses as a STRING, and GitHub still evaluates it as
    // truthy at runtime. The contract now forbids the KEY, so all three die on the
    // same assertion — including `false`, which is harmless in itself and is
    // rejected anyway so that no value this contract cannot evaluate is ever one
    // edit away from being admitted.
    ...[
      ['literal', 'true', 'let the emitter continue-on-error with the literal boolean'],
      ['expression', '${{ true }}', 'let the emitter continue-on-error via an EXPRESSION that evaluates truthy'],
      ['expression-context', "${{ github.event_name == 'pull_request' }}", 'let the emitter continue-on-error via a context expression'],
      ['quoted', "'true'", 'let the emitter continue-on-error via a quoted truthy string'],
      ['false', 'false', 'give the emitter an explicit continue-on-error: false (the field must be ABSENT)'],
    ].map(([form, value, what]) => ({
      id: `M1-${gateId}-continue-on-error-${form}`,
      killedBy: new RegExp(`"${gateId}" result emitter declares NO continue-on-error at all`),
      label: `${what} on "${gateId}" (a published FAIL would stop failing the job)`,
      apply: () => ({
        workflowText: replaceOnce(
          `${gateId} emitter continue-on-error ${form}`,
          baseWorkflow,
          EMITTER_BLOCK,
          `${EMITTER_BLOCK}        continue-on-error: ${value}\n`,
        ),
      }),
    })),
    {
      id: `M1-${gateId}-delete-emitter`,
      killedBy: new RegExp(`"${gateId}" runs the result emitter exactly once`),
      label: `delete the "${gateId}" result emitter step entirely`,
      apply: () => ({
        workflowText: requireChanged(
          `${gateId} emitter deleted`,
          baseWorkflow,
          baseWorkflow.replace(
            new RegExp(
              `${EMITTER_BLOCK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:.*\\n)*?        run: node scripts/ci/master-required-gate-gate-result\\.mjs\\n`,
            ),
            '',
          ),
        ),
      }),
    },
    {
      id: `M1-${gateId}-delete-result-output`,
      killedBy: new RegExp(`"${gateId}" publishes its result output bound to the emitter step`),
      label: `delete the "${gateId}" job \`result\` output (the emitter would publish into nothing)`,
      apply: () => {
        const outputsBlock =
          `  ${gate.jobId}:\n    name: ${gate.jobName}\n`;
        const at = baseWorkflow.indexOf(outputsBlock);
        if (at === -1) throw new Error(`mutation setup failed: job header of "${gateId}" not found`);
        const resultLine = '      result: ${{ steps.gate-result.outputs.result }}\n';
        const lineAt = baseWorkflow.indexOf(resultLine, at);
        if (lineAt === -1) throw new Error(`mutation setup failed: result output of "${gateId}" not found`);
        return {
          workflowText: baseWorkflow.slice(0, lineAt) + baseWorkflow.slice(lineAt + resultLine.length),
        };
      },
    },
  );
}

// The emitter SCRIPT itself: the same defect relocated from the workflow into the
// code. `if: always()` guarantees the step instantiates; these guarantee that,
// having instantiated, it publishes the evaluated result rather than a constant
// or nothing at all.
const EMITTER_SOURCE_MUTANTS = [
  {
    id: 'M1-src-hardcode-pass',
    killedBy: /result emitter publishes the EVALUATED result, not a constant|does not hard-code PASS/,
    label: 'hard-code PASS in the result emitter',
    apply: () => ({
      gateResultSource: replaceOnce(
        'hardcode PASS',
        baseGateResult,
        '`result=${evaluation.result}\\n',
        '`result=PASS\\n',
      ),
    }),
  },
  {
    id: 'M1-src-hardcode-na',
    killedBy: /result emitter publishes the EVALUATED result, not a constant|does not hard-code NOT_APPLICABLE/,
    label: 'hard-code NOT_APPLICABLE in the result emitter',
    apply: () => ({
      gateResultSource: replaceOnce(
        'hardcode NOT_APPLICABLE',
        baseGateResult,
        '`result=${evaluation.result}\\n',
        '`result=NOT_APPLICABLE\\n',
      ),
    }),
  },
  {
    id: 'M1-src-silent-on-fail',
    killedBy: /publishes UNCONDITIONALLY \(the write is not behind any branch\)/,
    label: 'stop publishing FAIL after a failed blocking step (publish only on the happy path)',
    apply: () => ({
      gateResultSource: replaceOnce(
        'publish only when not FAIL',
        baseGateResult,
        '  appendFileSync(\n',
        "  if (evaluation.result !== 'FAIL')\n    appendFileSync(\n",
      ),
    }),
  },
  {
    id: 'M1-src-no-write',
    killedBy: /performs exactly one output write/,
    label: 'delete the emitter output write entirely (an implicit/missing result)',
    apply: () => ({
      gateResultSource: mutate('delete the emitter write', baseGateResult, [
        [
          '  appendFileSync(\n    outputFile,\n    `result=${evaluation.result}\\n' +
            'evidence=${JSON.stringify({ gateId, applicability, digest })}\\n`,\n  );\n',
          '',
        ],
      ]),
    }),
  },
  {
    id: 'M1-src-suppress-exit',
    killedBy: /result emitter exits non-zero on FAIL/,
    label: 'make the emitter swallow its own FAIL (publication as failure suppression)',
    apply: () => ({
      gateResultSource: replaceOnce(
        'suppress the failing exit',
        baseGateResult,
        "  if (errors.length > 0 || evaluation.result === 'FAIL') {\n    console.error(",
        "  if (false) {\n    console.error(",
      ),
    }),
  },
];

MUTATIONS.push(...DAG_MUTATIONS, ...S2_04_MUTATIONS, ...EMITTER_MUTANTS, ...EMITTER_SOURCE_MUTANTS);

// =============================================================================
// REGISTRY <-> PORTFOLIO ALIGNMENT, MUTATED
// =============================================================================
//
// These rules are what stop the migration bookkeeping from drifting away from
// what the workflow actually executes — and bookkeeping rules are exactly the
// kind that get written once and never exercised. Each mutation below corrupts
// the portfolio in a way a careless S2-05 could plausibly produce, and asserts
// the alignment audit rejects it FOR THE INTENDED REASON. The real portfolio is
// never touched: every mutant is a deep copy.
{
  const realPortfolio = JSON.parse(readFileSync(PORTFOLIO_PATH, 'utf8'));
  const realReadiness = evaluateEnforcementReadiness(realPortfolio);
  const alignmentAudit = (portfolio, readiness = evaluateEnforcementReadiness(portfolio)) =>
    auditRegistryPortfolioAlignment({
      portfolio,
      readiness,
      expectedStage2Candidates: EXPECTED_STAGE2_CANDIDATES,
    });
  const clone = () => JSON.parse(JSON.stringify(realPortfolio));
  const entryById = (portfolio, id) => portfolio.entries.find((entry) => entry.id === id);

  const baselineAlignment = alignmentAudit(realPortfolio, realReadiness).filter((entry) => !entry.ok);
  check(
    'CONTROL: the real portfolio is ALIGNED with the gate registry',
    baselineAlignment.length === 0,
    baselineAlignment.map((entry) => entry.label).join(' | '),
  );

  const PORTFOLIO_MUTATIONS = [
    {
      id: 'P-1',
      killedBy: /records legacy "cbw-public-navigation-boundary\.yml" as MIGRATED_UNIFIED_SHADOW/,
      label: 'migrate Public Navigation in the workflow but leave its portfolio entry LEGACY_EXTERNAL',
      apply: () => {
        const portfolio = clone();
        entryById(portfolio, 'public-navigation-boundary').migrationState = 'LEGACY_EXTERNAL';
        return portfolio;
      },
    },
    {
      id: 'P-2',
      killedBy: /records legacy "cbw-public-first-screen-budget\.yml" as MIGRATED_UNIFIED_SHADOW/,
      label: 'leave the First Screen Budget portfolio entry LEGACY_EXTERNAL after migrating it',
      apply: () => {
        const portfolio = clone();
        entryById(portfolio, 'public-first-screen-budget').migrationState = 'LEGACY_EXTERNAL';
        return portfolio;
      },
    },
    {
      id: 'P-3',
      killedBy: /portfolio components are EXACTLY the classifier plus one job per registered gate/,
      label: 'delete a unified blocker entry from the portfolio (the DAG grows unrecorded)',
      apply: () => {
        const portfolio = clone();
        portfolio.entries = portfolio.entries.filter(
          (entry) => entry.id !== 'master-gate-blocker-public-navigation',
        );
        return portfolio;
      },
    },
    {
      id: 'P-4',
      killedBy: /records unified blocker "public-first-screen-budget" as UNIFIED_GATE_COMPONENT/,
      label: 'mis-state a unified blocker as an external legacy check',
      apply: () => {
        const portfolio = clone();
        entryById(portfolio, 'master-gate-blocker-public-first-screen-budget').migrationState = 'LEGACY_EXTERNAL';
        return portfolio;
      },
    },
    {
      id: 'P-5',
      killedBy: /stage-2 migration candidates are exactly 9/,
      label: 'let the stage-2 candidate count drift (enforcement scope changes unannounced)',
      apply: () => {
        const portfolio = clone();
        // The shape a quiet retirement takes: a still-blocking legacy workflow
        // reclassified so it stops counting as outstanding work.
        const victim = portfolio.entries.find(
          (entry) => entry.migrationState === 'LEGACY_EXTERNAL' && entry.stage2MigrationCandidate === true,
        );
        victim.stage2MigrationCandidate = false;
        return portfolio;
      },
    },
    {
      id: 'P-6',
      killedBy: /legacy "cbw-public-navigation-boundary\.yml" is still BLOCKING/,
      label: 'downgrade a migrated legacy workflow to advisory (a silent weakening)',
      apply: () => {
        const portfolio = clone();
        entryById(portfolio, 'public-navigation-boundary').classification = 'ADVISORY';
        return portfolio;
      },
    },
    {
      id: 'P-7',
      killedBy: /portfolio declares exactly one unified gate host/,
      label: 'claim a second unified gate host (the stable required context becomes ambiguous)',
      apply: () => {
        const portfolio = clone();
        entryById(portfolio, 'master-gate-blocker-public-navigation').migrationState = 'UNIFIED_GATE_HOST';
        return portfolio;
      },
    },
    {
      id: 'P-8',
      killedBy: /enforcement readiness remains false at this stage/,
      label: 'declare enforcement readiness at a stage that confers no authority',
      apply: () => clone(),
      readiness: { ...realReadiness, enforcementReady: true },
    },
  ];

  for (const mutation of PORTFOLIO_MUTATIONS) {
    const mutant = mutation.apply();
    const caught = alignmentAudit(mutant, mutation.readiness).filter((entry) => !entry.ok);
    check(
      `PORTFOLIO MUTATION ${mutation.id} (${mutation.label}) is CAUGHT`,
      caught.length > 0,
      'mutant survived — the registry/portfolio alignment does not bind this property',
    );
    check(
      `PORTFOLIO MUTATION ${mutation.id} is caught for its INTENDED reason`,
      caught.some((entry) => mutation.killedBy.test(entry.label)),
      caught.map((entry) => entry.label).join(' | ').slice(0, 240),
    );
  }
}

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
  // KILLED FOR THE INTENDED REASON — reviewed LOW. A mutant that dies of a
  // broken import, a syntax error or an unrelated downstream guard is not
  // evidence that the rule it targets is bound. Every mutation therefore
  // declares which contract assertion must be the one that fails, and a
  // mutation with no declaration aborts the suite rather than counting.
  if (!mutation.killedBy) {
    throw new Error(`MUTATION ${mutation.id} declares no killedBy assertion`);
  }
  check(
    `MUTATION ${mutation.id} is killed for its INTENDED reason`,
    caught.some((entry) => mutation.killedBy.test(entry.label)),
    `intended ${mutation.killedBy} | actual: ${caught.map((entry) => entry.label).join(' | ').slice(0, 300)}`,
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
      expect: /sidecar must be a JSON object/,
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
    asRunnableValidator(
      mutate('soften every independent rule', baseValidator, [
        ["material !== 'true' && material !== 'false'", 'false'],
        ['String(sidecar.material) !== material', 'false'],
        ['sidecar[field] !== expectedIdentity[field]', 'false'],
        ['    !isConsistentClassification(material, reason)', '    false'],
      ]),
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

  // B8. MEDIUM 1 — no JSON shape may route around the sidecar checks.
  //
  // The reviewed bypass: `null` PARSES successfully, and the validator used
  // null as its parse-failure sentinel, so the classification, agreement and
  // staleness checks were skipped and the gate PASSED on a sidecar that
  // asserted nothing. Proved here by execution, against the real validator.
  const NON_OBJECT_SIDECAR_BODIES = [
    ['null (the exact reviewed bypass)', 'null'],
    ['an empty array', '[]'],
    ['a JSON string', '"string"'],
    ['the number 0', '0'],
    ['boolean false', 'false'],
    ['boolean true', 'true'],
  ];
  for (const [label, body] of NON_OBJECT_SIDECAR_BODIES) {
    const run = runScenario({
      setup: () => writeRawSidecar(body),
      input: { material: 'true', reason: 'material-path-changed' },
    });
    check(`RUNTIME: a sidecar of ${label} FAILS the gate`, run.status !== 0, `exit=${run.status}`);
    check(
      `RUNTIME: a sidecar of ${label} is rejected as a non-object, not incidentally`,
      /sidecar must be a JSON object/.test(`${run.stdout ?? ''}${run.stderr ?? ''}`),
      (run.stderr ?? '').slice(0, 200),
    );
  }
  // And the fix is load-bearing: a validator with the null sentinel restored
  // ACCEPTS the `null` sidecar that the real one rejects.
  const nullSentinelPath = join(sandbox, 'null-sentinel-validator.mjs');
  writeFileSync(nullSentinelPath, asRunnableValidator(MUTANT_SOURCES.nullSentinelValidator), 'utf8');
  clearSidecar();
  writeRawSidecar('null');
  const nullSentinelRun = runValidator(nullSentinelPath, {
    material: 'true',
    reason: 'material-path-changed',
  });
  clearSidecar();
  writeRawSidecar('null');
  const realNullRun = runValidator(VALIDATE_SCRIPT, {
    material: 'true',
    reason: 'material-path-changed',
  });
  check(
    'MUTATION 16 is behaviourally observable: null-sentinel validator ACCEPTS a `null` sidecar',
    nullSentinelRun.status === 0,
    `exit=${nullSentinelRun.status} ${nullSentinelRun.stderr ?? ''}`,
  );
  check(
    'MUTATION 16 is behaviourally observable: the real validator REJECTS a `null` sidecar',
    realNullRun.status !== 0,
    `exit=${realNullRun.status}`,
  );

  // B8b. MEDIUM 2 — contradictory material/reason pairs, by execution.
  const VALID_PAIRS = [
    ['true', 'material-path-changed'],
    ['true', 'unresolved-or-empty-change-set'],
    ['false', 'only-allowlisted-non-material-paths'],
  ];
  const CONTRADICTORY_PAIRS = [
    ['false', 'material-path-changed'],
    ['false', 'unresolved-or-empty-change-set'],
    ['true', 'only-allowlisted-non-material-paths'],
  ];
  for (const [materialValue, reason] of VALID_PAIRS) {
    const run = runScenario({
      setup: () => writeSidecar(materialValue === 'true', reason),
      input: { material: materialValue, reason },
    });
    check(
      `RUNTIME: valid mapping material=${materialValue} reason=${reason} PASSES`,
      run.status === 0,
      `exit=${run.status} ${run.stderr ?? ''}`,
    );
  }
  for (const [materialValue, reason] of CONTRADICTORY_PAIRS) {
    const run = runScenario({
      setup: () => writeSidecar(materialValue === 'true', reason),
      input: { material: materialValue, reason },
    });
    check(
      `RUNTIME: contradictory pair material=${materialValue} reason=${reason} FAILS`,
      run.status !== 0,
      `exit=${run.status}`,
    );
    check(
      `RUNTIME: contradictory pair material=${materialValue} reason=${reason} is named as a contradiction`,
      /contradicts/.test(`${run.stdout ?? ''}${run.stderr ?? ''}`),
      (run.stderr ?? '').slice(0, 200),
    );
  }
  // Load-bearing: a validator without pair consistency accepts the fail-open
  // shape (a MATERIAL change reported as non-material) that the real one kills.
  const noPairPath = join(sandbox, 'no-pair-consistency-validator.mjs');
  writeFileSync(
    noPairPath,
    asRunnableValidator(MUTANT_SOURCES.noAnyPairConsistencyValidator),
    'utf8',
  );
  clearSidecar();
  writeSidecar(false, 'material-path-changed');
  const noPairRun = runValidator(noPairPath, { material: 'false', reason: 'material-path-changed' });
  check(
    'MUTATIONS 18+19 are behaviourally observable: the softened validator ACCEPTS material=false + material-path-changed',
    noPairRun.status === 0,
    `exit=${noPairRun.status} ${noPairRun.stderr ?? ''}`,
  );
  // With ONLY the step-output check softened, the sidecar's own consistency
  // rule still kills it — the two checks are independent lines of defence.
  const stepOnlyPath = join(sandbox, 'no-step-pair-consistency-validator.mjs');
  writeFileSync(
    stepOnlyPath,
    asRunnableValidator(MUTANT_SOURCES.noPairConsistencyValidator),
    'utf8',
  );
  clearSidecar();
  writeSidecar(false, 'material-path-changed');
  const stepOnlyRun = runValidator(stepOnlyPath, {
    material: 'false',
    reason: 'material-path-changed',
  });
  check(
    'the sidecar pair-consistency rule is an INDEPENDENT defence (still rejects when only the step-output rule is softened)',
    stepOnlyRun.status !== 0 && /contradicts its own/.test(`${stepOnlyRun.stderr ?? ''}`),
    `exit=${stepOnlyRun.status}`,
  );
  clearSidecar();

  // B9. LOW 1 — the replacement 12i / 12j mutants are BEHAVIOURALLY VALID.
  //
  // The previous 12i/12j did not qualify as mutants at all: 12i referenced an
  // unimported `tmpdir` (a ReferenceError, killed by its own broken syntax), and
  // 12j fell through to the NEXT guard (`isAbsolute('')`) and was killed by an
  // unrelated rule. Neither ever reached the fail-open behaviour it claimed to
  // model. Each replacement is proved on three axes: it parses, its weakened
  // behaviour is genuinely reached, and the hardened classifier under the same
  // conditions fails closed.
  const BEHAVIOURAL_MUTANTS = [
    {
      id: '12i',
      label: 'os.tmpdir() fallback restored with its import',
      source: MUTANT_SOURCES.tmpdirFallback,
      env: { RUNNER_TEMP: undefined },
      // Where the sidecar lands when the fallback is taken.
      landsIn: () => tmpdir(),
      killedBy: /classifier (does not import os\.tmpdir|never falls back when RUNNER_TEMP is unset)/,
    },
    {
      id: '12j',
      label: 'empty RUNNER_TEMP silently resolved against cwd',
      source: MUTANT_SOURCES.emptyRunnerTempCwd,
      env: { RUNNER_TEMP: '' },
      landsIn: () => repo,
      killedBy: /classifier fails closed on an empty RUNNER_TEMP/,
    },
  ];
  for (const mutant of BEHAVIOURAL_MUTANTS) {
    const mutantPath = join(sandbox, `mutant-${mutant.id}.mjs`);
    writeFileSync(mutantPath, asRunnableClassifier(mutant.source), 'utf8');

    // (a) syntactically runnable — not killed by a parse/import error.
    const syntax = spawnSync(process.execPath, ['--check', mutantPath], { encoding: 'utf8' });
    check(
      `MUTANT ${mutant.id} (${mutant.label}) is syntactically valid`,
      syntax.status === 0,
      (syntax.stderr ?? '').slice(0, 200),
    );

    // (b) the intended weakened behaviour is REACHED: the producer succeeds and
    //     writes its sidecar outside RUNNER_TEMP.
    const strayPath = join(mutant.landsIn(), SIDECAR_NAME);
    if (existsSync(strayPath)) rmSync(strayPath);
    clearSidecar();
    const mutantOut = join(sandbox, `github-output-${mutant.id}.txt`);
    writeFileSync(mutantOut, '', 'utf8');
    const mutantRunResult = runProducer(mutantPath, { GITHUB_OUTPUT: mutantOut, ...mutant.env });
    check(
      `MUTANT ${mutant.id} reaches its fail-open behaviour (producer SUCCEEDS where the real one must not)`,
      mutantRunResult.status === 0,
      `exit=${mutantRunResult.status} ${(mutantRunResult.stderr ?? '').slice(0, 200)}`,
    );
    check(
      `MUTANT ${mutant.id} writes its sidecar OUTSIDE RUNNER_TEMP (the fail-open is observable)`,
      existsSync(strayPath),
      strayPath,
    );
    check(
      `MUTANT ${mutant.id} did not write into the job-scoped RUNNER_TEMP`,
      !existsSync(sidecarPath),
    );
    check(
      `MUTANT ${mutant.id} is not killed by a runtime error (no ReferenceError/TypeError)`,
      !/(ReferenceError|TypeError|SyntaxError)/.test(`${mutantRunResult.stderr ?? ''}`),
      (mutantRunResult.stderr ?? '').slice(0, 200),
    );
    if (existsSync(strayPath)) rmSync(strayPath);

    // (c) the hardened classifier under the SAME conditions fails closed — so
    //     the difference is the hardening, not the environment.
    const realOut = join(sandbox, `github-output-real-${mutant.id}.txt`);
    writeFileSync(realOut, '', 'utf8');
    const realResult = runProducer(CLASSIFY_SCRIPT, { GITHUB_OUTPUT: realOut, ...mutant.env });
    check(
      `MUTANT ${mutant.id}: the REAL classifier fails closed under the same environment`,
      realResult.status !== 0,
      `exit=${realResult.status}`,
    );

    // (d) and the static contract kills the mutant for its intended reason.
    const staticFailures = audit({ classifierSource: mutant.source }).filter((entry) => !entry.ok);
    check(
      `MUTANT ${mutant.id} is caught by the static contract`,
      staticFailures.length > 0,
    );
    check(
      `MUTANT ${mutant.id} is caught for its INTENDED reason`,
      staticFailures.some((entry) => mutant.killedBy.test(entry.label)),
      staticFailures.map((entry) => entry.label).join(' | ').slice(0, 240),
    );
  }
  clearSidecar();

  // B10. THE S2-03 AGGREGATOR, BEHAVIOURALLY.
  //
  // The static mutations above prove the CONTRACT binds "a skipped blocker is
  // never a pass". This block proves the property is real at runtime and that the
  // rule is load-bearing: a deliberately softened aggregator ACCEPTS the exact
  // input the real one rejects. Without the softened counterpart, "the real
  // aggregator exits non-zero" could be an artefact of the harness rather than a
  // property of its logic.
  const GATES_MODULE_URL = JSON.stringify(pathToFileURL(GATES_SCRIPT).href);
  const CLASSIFY_MODULE_URL = JSON.stringify(pathToFileURL(CLASSIFY_SCRIPT).href);
  const asRunnableAggregator = (source) =>
    mutate('aggregator harness accommodation', source, [
      ["from './master-required-gate-gates.mjs'", `from ${GATES_MODULE_URL}`],
      ["from './master-required-gate-classify.mjs'", `from ${CLASSIFY_MODULE_URL}`],
      ["process.argv[1]?.endsWith('master-required-gate-aggregate.mjs')", 'true'],
    ]);

  // Derived from the CLOSED REGISTRY, never hand-listed. When S2-04 added two
  // blockers, a hand-listed decision here would have kept describing a two-gate
  // world: the aggregator iterates GATE_IDS, so the happy path would simply have
  // failed, and the tempting fix — adding the two names by hand — leaves the same
  // trap set for the next gate. Deriving it means every runtime rejection case
  // below is automatically exercised against every registered blocker.
  const APP_DECISION = {
    gates: Object.fromEntries(GATE_IDS.map((gateId) => [gateId, 'APPLICABLE'])),
    reasons: Object.fromEntries(GATE_IDS.map((gateId) => [gateId, 'relevant-path-changed'])),
    changedPaths: ['src/pages/index.astro'],
    material: 'true',
    materialReason: 'material-path-changed',
  };
  // The run identity the aggregator resolves from its OWN environment, and the
  // digest that — and only that — reproduces from this decision under it.
  //
  // H1 HISTORY, kept explicit because it is the whole point of this block: this
  // constant used to be `'deadbeef'.repeat(8)`, an arbitrary value that is the
  // digest of nothing, echoed verbatim by both blockers. The aggregator accepted
  // it, because it only ever compared the claims to each other. The suite's own
  // happy path was therefore the exploit. It is now a REAL recomputation, and the
  // forged variants below are asserted to be rejected.
  const AGG_IDENTITY = Object.freeze({ headSha: 'ab'.repeat(20), runId: '778899', runAttempt: '1' });
  const APP_DIGEST = applicabilityDigest(APP_DECISION, AGG_IDENTITY);
  const aggregatorEnv = (overrides = {}) => ({
    ...process.env,
    HEAD_SHA: AGG_IDENTITY.headSha,
    GITHUB_RUN_ID: AGG_IDENTITY.runId,
    GITHUB_RUN_ATTEMPT: AGG_IDENTITY.runAttempt,
    CLASSIFY_JOB_RESULT: 'success',
    CLASSIFIER_MATERIAL: 'true',
    APPLICABILITY_JSON: JSON.stringify(APP_DECISION),
    APPLICABILITY_DIGEST: APP_DIGEST,
    // One passing blocker per registered gate, built from the registry's own env
    // var names so a renamed or added gate cannot leave a hole here.
    ...Object.fromEntries(
      GATE_IDS.flatMap((gateId) => [
        [GATES[gateId].jobResultEnv, 'success'],
        [GATES[gateId].resultEnv, 'PASS'],
        [
          GATES[gateId].evidenceEnv,
          JSON.stringify({ gateId, applicability: 'APPLICABLE', digest: APP_DIGEST }),
        ],
      ]),
    ),
    ...overrides,
  });
  // A forged/stale evidence chain is only a meaningful test if EVERY blocker
  // echoes it consistently — a chain that disagrees with itself is caught by a
  // weaker rule. Built per gate so the "whole chain agrees" exploit really does
  // cover the whole chain.
  const chainEchoing = (digest) =>
    Object.fromEntries(
      GATE_IDS.map((gateId) => [
        GATES[gateId].evidenceEnv,
        JSON.stringify({ gateId, applicability: 'APPLICABLE', digest }),
      ]),
    );
  const runAggregator = (scriptPath, overrides = {}) =>
    spawnSync(process.execPath, [scriptPath], { env: aggregatorEnv(overrides), encoding: 'utf8', cwd: ROOT });

  check(
    'RUNTIME: the aggregator PASSES when both blockers proved PASS',
    runAggregator(AGGREGATE_SCRIPT).status === 0,
    runAggregator(AGGREGATE_SCRIPT).stderr ?? '',
  );

  const AGGREGATOR_RUNTIME_REJECTIONS = [
    [
      'a SKIPPED blocker job',
      {
        GATE_GLOBAL_HEADER_INTERACTION_JOB_RESULT: 'skipped',
        GATE_GLOBAL_HEADER_INTERACTION_RESULT: '',
        GATE_GLOBAL_HEADER_INTERACTION_EVIDENCE: '',
      },
      /job result is "skipped"/,
    ],
    [
      'a CANCELLED blocker job',
      { GATE_PUBLIC_SEO_METADATA_JOB_RESULT: 'cancelled' },
      /job result is "cancelled"/,
    ],
    ['a FAILED blocker job', { GATE_PUBLIC_SEO_METADATA_JOB_RESULT: 'failure' }, /job result is "failure"/],
    ['a FAILED classifier job', { CLASSIFY_JOB_RESULT: 'failure' }, /classifier job result is "failure"/],
    ['a CANCELLED classifier job', { CLASSIFY_JOB_RESULT: 'cancelled' }, /classifier job result is "cancelled"/],
    ['a SKIPPED classifier job', { CLASSIFY_JOB_RESULT: 'skipped' }, /classifier job result is "skipped"/],
    ['a MISSING blocker result output', { GATE_PUBLIC_SEO_METADATA_RESULT: '' }, /published NO result/],
    ['an UNKNOWN blocker result', { GATE_PUBLIC_SEO_METADATA_RESULT: 'GREEN' }, /outside the closed outcome vocabulary/],
    ['a blocker publishing FAIL', { GATE_PUBLIC_SEO_METADATA_RESULT: 'FAIL' }, /accepts only/],
    ['an INVALID classifier decision', { APPLICABILITY_JSON: '{' }, /not valid JSON/],
    ['a MISSING classifier decision', { APPLICABILITY_JSON: '' }, /applicability output is missing/],
    [
      'a STALE blocker evidence digest',
      {
        GATE_PUBLIC_SEO_METADATA_EVIDENCE: JSON.stringify({
          gateId: 'public-seo-metadata',
          applicability: 'APPLICABLE',
          digest: 'c0ffee00'.repeat(8),
        }),
      },
      /does not match the canonical applicability digest the aggregator independently recomputed/,
    ],
    // --- H1: forged and stale evidence chains, end to end --------------------
    [
      'a FORGED non-hash digest echoed consistently by the whole chain (Codex exploit)',
      {
        APPLICABILITY_DIGEST: 'forged-applicability-digest',
        ...chainEchoing('forged-applicability-digest'),
      },
      /not a sha-256 hex digest|independently recomputed/,
    ],
    [
      'a FORGED sha-256-shaped digest echoed consistently by the whole chain',
      {
        APPLICABILITY_DIGEST: 'a'.repeat(64),
        ...chainEchoing('a'.repeat(64)),
      },
      /independently recomputed/,
    ],
    [
      'a FORGED classifier digest alone',
      { APPLICABILITY_DIGEST: 'a'.repeat(64) },
      /independently recomputed/,
    ],
    [
      'a STALE head sha (the digest belongs to another PR head)',
      { HEAD_SHA: 'cd'.repeat(20) },
      /independently recomputed/,
    ],
    ['a STALE run id (the digest belongs to another run)', { GITHUB_RUN_ID: '424242' }, /independently recomputed/],
    [
      'a STALE run attempt (the digest belongs to an earlier attempt)',
      { GITHUB_RUN_ATTEMPT: '2' },
      /independently recomputed/,
    ],
    ['a MISSING head sha (no resolvable run identity)', { HEAD_SHA: '' }, /HEAD_SHA is missing or empty/],
    ['a MISSING run id', { GITHUB_RUN_ID: '' }, /GITHUB_RUN_ID is missing or empty/],
    ['a MISSING run attempt', { GITHUB_RUN_ATTEMPT: '' }, /GITHUB_RUN_ATTEMPT is missing or empty/],
    [
      'a TAMPERED decision replayed under the digest it had before the edit',
      {
        APPLICABILITY_JSON: JSON.stringify({
          ...APP_DECISION,
          changedPaths: ['src/pages/index.astro', 'src/pages/injected.astro'],
        }),
      },
      /independently recomputed/,
    ],
    [
      'an UNJUSTIFIED NOT_APPLICABLE',
      {
        GATE_PUBLIC_SEO_METADATA_RESULT: 'NOT_APPLICABLE',
        GATE_PUBLIC_SEO_METADATA_EVIDENCE: JSON.stringify({
          gateId: 'public-seo-metadata',
          applicability: 'NOT_APPLICABLE',
          digest: APP_DIGEST,
        }),
      },
      /must be justified by exact changed-file classification|the classifier decided/,
    ],
  ];

  // ==========================================================================
  // THE COMPLETE PER-GATE REJECTION MATRIX (S2-04 R1 / L1)
  // ==========================================================================
  //
  // The cases above single out one or two gates by name, which proves the
  // aggregator's rules EXIST but not that they reach every member of the DAG —
  // precisely the coverage that silently fails to extend when the DAG widens.
  // Round 1 review found the remainder still global: a stale head SHA, a forged
  // classifier digest, a tampered decision and an unjustified PASS were each
  // proved once, for the whole run, so a gate-specific exception could have
  // hidden behind another failing gate.
  //
  // Every case below is therefore GENERATED PER GATE and, wherever the case has a
  // per-gate rendering at all, MUTATES ONLY THAT GATE'S evidence or result while
  // every other blocker stays honest. Each one additionally asserts that the
  // aggregator NAMES THAT GATE in its rejection, so a rejection produced by
  // collateral damage elsewhere cannot be mistaken for coverage of this gate.
  //
  // The three chain-level cases (a forged classifier digest, and a forgery echoed
  // consistently by the whole chain) cannot be confined to one gate by
  // construction — the classifier claim is one value for the whole run. They are
  // still generated per gate, and what is asserted per gate is that THIS gate's
  // own evidence is independently rejected under them: no blocker rides a forged
  // classifier claim, and none is exempted from the recomputation.
  const decisionWith = (gateId, applicability) => ({
    ...APP_DECISION,
    gates: { ...APP_DECISION.gates, [gateId]: applicability },
    reasons: {
      ...APP_DECISION.reasons,
      [gateId]: applicability === 'NOT_APPLICABLE' ? 'only-gate-irrelevant-paths' : 'relevant-path-changed',
    },
  });
  // An honest chain for an ALTERNATIVE decision: every gate echoes the digest that
  // decision really produces, so the only anomaly left is the one the case names.
  const honestChainFor = (decision) => {
    const digest = applicabilityDigest(decision, AGG_IDENTITY);
    return {
      digest,
      env: {
        APPLICABILITY_JSON: JSON.stringify(decision),
        APPLICABILITY_DIGEST: digest,
        ...Object.fromEntries(
          GATE_IDS.flatMap((id) => [
            [GATES[id].resultEnv, decision.gates[id] === 'APPLICABLE' ? 'PASS' : 'NOT_APPLICABLE'],
            [
              GATES[id].evidenceEnv,
              JSON.stringify({ gateId: id, applicability: decision.gates[id], digest }),
            ],
          ]),
        ),
      },
    };
  };
  // A digest that is REAL — produced by the canonical function — but for a
  // different execution. This is what "stale" actually looks like, as opposed to
  // "forged": the value is well-formed and reproducible, just not from THIS run.
  const digestUnder = (identityOverrides) =>
    applicabilityDigest(APP_DECISION, { ...AGG_IDENTITY, ...identityOverrides });

  // The closed list of rejection KINDS. Named, so the coverage assertions below
  // can prove the cross-product is complete rather than merely large.
  const PER_GATE_REJECTION_KINDS = Object.freeze([
    'skipped-job',
    'cancelled-job',
    'failed-job',
    'missing-result',
    'unknown-result',
    'explicit-FAIL',
    'malformed-evidence',
    'forged-classifier-digest',
    'forged-blocker-digest',
    'matching-forged-digest-chain',
    'stale-head-sha',
    'stale-run-id',
    'stale-run-attempt',
    'missing-identity',
    'tampered-applicability-decision',
    'unjustified-NOT_APPLICABLE',
    'unjustified-PASS',
  ]);

  const perGateCases = [];
  for (const gateId of GATE_IDS) {
    const gate = GATES[gateId];
    const evidenceOf = (overrides) => JSON.stringify({ gateId, applicability: 'APPLICABLE', ...overrides });
    // The unjustified-PASS case needs a decision in which THIS gate — and only
    // this gate — is NOT_APPLICABLE, with every other blocker still honest under
    // the digest that decision really produces.
    const inertHere = honestChainFor(decisionWith(gateId, 'NOT_APPLICABLE'));
    const FORGED_CHAIN_DIGEST = 'f'.repeat(64);

    const cases = {
      'skipped-job': [{ [gate.jobResultEnv]: 'skipped', [gate.resultEnv]: '', [gate.evidenceEnv]: '' }, /job result is "skipped"/],
      'cancelled-job': [{ [gate.jobResultEnv]: 'cancelled' }, /job result is "cancelled"/],
      'failed-job': [{ [gate.jobResultEnv]: 'failure' }, /job result is "failure"/],
      'missing-result': [{ [gate.resultEnv]: '' }, /published NO result/],
      'unknown-result': [{ [gate.resultEnv]: 'GREEN' }, /outside the closed outcome vocabulary/],
      'explicit-FAIL': [{ [gate.resultEnv]: 'FAIL' }, /accepts only/],
      'malformed-evidence': [{ [gate.evidenceEnv]: '{not json' }, /evidence is not valid JSON/],
      // Chain-level, asserted per gate: the classifier claim is forged and THIS
      // gate is the one blocker that echoes it. Every other blocker stays honest,
      // so the rejection naming this gate is this gate's own.
      'forged-classifier-digest': [
        {
          APPLICABILITY_DIGEST: FORGED_CHAIN_DIGEST,
          [gate.evidenceEnv]: evidenceOf({ digest: FORGED_CHAIN_DIGEST }),
        },
        /independently recomputed/,
      ],
      'forged-blocker-digest': [{ [gate.evidenceEnv]: evidenceOf({ digest: 'b'.repeat(64) }) }, /independently recomputed/],
      // THE SELF-CONSISTENT FORGED CHAIN, ISOLATED TO THIS ONE GATE (S2-04 R2 / 1).
      //
      // R1 rendered this case with `chainEchoing()`, which forged the classifier
      // claim and every blocker at once: all four gates were invalid in every
      // cell, so a rule that reached only three of them would still have produced
      // a rejection naming the fourth — via the fourth's own echoed forgery, not
      // via any rule specific to it. The case was global wearing a per-gate label.
      //
      // It is now confined. The classifier's decision and digest stay HONEST, and
      // the other three blockers keep echoing the canonical digest, so they are
      // fully valid. Only THIS gate publishes a forged chain — and it is forged in
      // the shape that matters: `digest` is a genuine output of the canonical
      // digest function over a DIFFERENT decision (this gate flipped to
      // NOT_APPLICABLE), and `applicability` is the value that alternative
      // decision assigns. The gate's own classifier↔blocker chain therefore MATCHES
      // ITSELF perfectly — an aggregator that verified the blocker's evidence
      // against the blocker's own claimed decision would accept it. Only the
      // independent recomputation from the CANONICAL decision catches it.
      'matching-forged-digest-chain': [
        {
          [gate.resultEnv]: 'NOT_APPLICABLE',
          [gate.evidenceEnv]: JSON.stringify({
            gateId,
            applicability: 'NOT_APPLICABLE',
            digest: applicabilityDigest(decisionWith(gateId, 'NOT_APPLICABLE'), AGG_IDENTITY),
          }),
        },
        /independently recomputed/,
      ],
      'stale-head-sha': [
        { [gate.evidenceEnv]: evidenceOf({ digest: digestUnder({ headSha: 'cd'.repeat(20) }) }) },
        /independently recomputed/,
      ],
      'stale-run-id': [
        { [gate.evidenceEnv]: evidenceOf({ digest: digestUnder({ runId: '424242' }) }) },
        /independently recomputed/,
      ],
      'stale-run-attempt': [
        { [gate.evidenceEnv]: evidenceOf({ digest: digestUnder({ runAttempt: '2' }) }) },
        /independently recomputed/,
      ],
      // No identity in the evidence at all: the blocker published an outcome it
      // cannot bind to any run.
      'missing-identity': [{ [gate.evidenceEnv]: JSON.stringify({ gateId, applicability: 'APPLICABLE' }) }, /independently recomputed/],
      // The applicability this blocker claims to have run under is not the one the
      // classifier decided for it.
      'tampered-applicability-decision': [
        { [gate.evidenceEnv]: evidenceOf({ applicability: 'NOT_APPLICABLE', digest: APP_DIGEST }) },
        /ran under applicability/,
      ],
      'unjustified-NOT_APPLICABLE': [
        {
          [gate.resultEnv]: 'NOT_APPLICABLE',
          [gate.evidenceEnv]: evidenceOf({ applicability: 'NOT_APPLICABLE', digest: APP_DIGEST }),
        },
        /must be justified by exact changed-file classification|the classifier decided/,
      ],
      // The classifier proved this ONE gate irrelevant; the gate claims to have
      // passed blocking work it never ran. Everything else in the chain is honest
      // under the alternative decision's own digest.
      'unjustified-PASS': [
        { ...inertHere.env, [gate.resultEnv]: 'PASS' },
        /published PASS but the classifier decided/,
      ],
    };

    for (const kind of PER_GATE_REJECTION_KINDS) {
      const [overrides, expected] = cases[kind];
      perGateCases.push({ gateId, kind, overrides, expected });
    }
  }

  // COVERAGE OF THE GENERATED LOOP ITSELF. A generated matrix is only evidence if
  // it provably covers the registry; a loop that silently omitted a gate would
  // look exactly as green as one that did not.
  check(
    'PER-GATE MATRIX: the cross-product is complete',
    perGateCases.length === GATE_IDS.length * PER_GATE_REJECTION_KINDS.length,
    `${perGateCases.length} != ${GATE_IDS.length} x ${PER_GATE_REJECTION_KINDS.length}`,
  );
  check(
    'PER-GATE MATRIX: every REGISTERED gate appears',
    JSON.stringify([...new Set(perGateCases.map((entry) => entry.gateId))].sort()) === JSON.stringify([...GATE_IDS]),
    [...new Set(perGateCases.map((entry) => entry.gateId))].sort().join(','),
  );
  for (const gateId of GATE_IDS) {
    const kinds = perGateCases.filter((entry) => entry.gateId === gateId).map((entry) => entry.kind).sort();
    check(
      `PER-GATE MATRIX: "${gateId}" is exercised by EVERY rejection kind`,
      JSON.stringify(kinds) === JSON.stringify([...PER_GATE_REJECTION_KINDS].sort()),
      kinds.join(','),
    );
  }
  // The matrix must be derived from the registry, not from a list someone
  // maintains. Proved by construction: a hand-written pair — the S2-03 world —
  // provably fails to describe the registry as it stands today.
  const HAND_LISTED_S2_03_GATES = ['global-header-interaction', 'public-seo-metadata'];
  check(
    'PER-GATE MATRIX: a hand-listed gate set would OMIT registered blockers (which is why this one is derived)',
    GATE_IDS.some((gateId) => !HAND_LISTED_S2_03_GATES.includes(gateId)),
    GATE_IDS.join(','),
  );

  for (const [label, overrides, expected] of AGGREGATOR_RUNTIME_REJECTIONS) {
    const run = runAggregator(AGGREGATE_SCRIPT, overrides);
    check(`RUNTIME: the aggregator FAILS CLOSED on ${label}`, run.status !== 0, `exit=${run.status}`);
    check(
      `RUNTIME: the aggregator names ${label} as the reason`,
      expected.test(`${run.stdout ?? ''}${run.stderr ?? ''}`),
      (run.stderr ?? '').slice(0, 240),
    );
  }

  // THE PER-GATE MATRIX, EXECUTED. Three assertions per cell: the aggregator
  // fails, it fails for the stated reason, and it names THIS gate — the last one
  // being what makes the cell about this gate rather than about the run.
  for (const { gateId, kind, overrides, expected } of perGateCases) {
    const run = runAggregator(AGGREGATE_SCRIPT, overrides);
    const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
    check(`PER-GATE: "${gateId}" / ${kind} FAILS the required gate`, run.status !== 0, `exit=${run.status}`);
    check(
      `PER-GATE: "${gateId}" / ${kind} fails for its OWN stated reason`,
      expected.test(output),
      (run.stderr ?? '').slice(0, 240),
    );
    check(
      `PER-GATE: "${gateId}" / ${kind} names the gate itself (no hiding behind another blocker)`,
      new RegExp(`blocker ${gateId} `).test(output),
      (run.stderr ?? '').slice(0, 240),
    );
  }

  // AND THE LOOP CANNOT SILENTLY OMIT A GATE. For each registered blocker, an
  // aggregator carrying a hard-coded exemption for exactly that gate is built and
  // proved to ACCEPT the input the real aggregator rejects. That is the mutation
  // the per-gate matrix exists to kill: a rule that reaches three of four gates.
  const exemptingAggregators = new Map();
  for (const gateId of GATE_IDS) {
    const gate = GATES[gateId];
    const exemptPath = join(sandbox, `aggregator-exempting-${gateId}.mjs`);
    exemptingAggregators.set(gateId, exemptPath);
    writeFileSync(
      exemptPath,
      asRunnableAggregator(
        mutate(`exempt ${gateId} from aggregation`, baseAggregate, [
          [
            '  for (const gateId of GATE_IDS) {\n    const observed = gates?.[gateId];',
            `  for (const gateId of GATE_IDS) {\n    if (gateId === ${JSON.stringify(gateId)}) continue;\n    const observed = gates?.[gateId];`,
          ],
        ]),
      ),
      'utf8',
    );
    const tainted = { [gate.resultEnv]: 'FAIL' };
    check(
      `PER-GATE: an aggregator exempting "${gateId}" ACCEPTS that gate's FAIL (the mutation is real)`,
      runAggregator(exemptPath, tainted).status === 0,
      (runAggregator(exemptPath, tainted).stderr ?? '').slice(0, 240),
    );
    check(
      `PER-GATE: the exempting aggregator is still a real aggregator (it accepts the honest chain)`,
      runAggregator(exemptPath).status === 0,
    );
    check(
      `PER-GATE: the REAL aggregator REJECTS the same "${gateId}" FAIL`,
      runAggregator(AGGREGATE_SCRIPT, tainted).status !== 0,
    );
  }

  // ==========================================================================
  // THE ISOLATED FORGED-CHAIN CASE, PROVED ISOLATED (S2-04 R2 / 1)
  // ==========================================================================
  //
  // "matching-forged-digest-chain" is only per-gate coverage if the other three
  // blockers are demonstrably VALID while it runs. A case in which every gate is
  // invalid passes its own per-gate assertion for the wrong reason — the
  // rejection naming this gate could be produced by any rule at all. So for each
  // registered blocker three things are bound explicitly:
  //
  //   (a) the case perturbs THIS gate's environment and nothing else;
  //   (b) the aggregator's rejection names THIS gate and no other blocker;
  //   (c) restoring THIS gate's honest values — and changing nothing else —
  //       makes the entire chain PASS, which is only possible if the other three
  //       blockers were valid throughout;
  //
  // and then (d) the case is proved gate-specific by mutation: an aggregator
  // carrying a hard-coded exemption for exactly this gate ACCEPTS the very input
  // the real one rejects, so a rule that reached three gates out of four could
  // not leave this suite green.
  for (const gateId of GATE_IDS) {
    const gate = GATES[gateId];
    const isolated = perGateCases.find(
      (entry) => entry.gateId === gateId && entry.kind === 'matching-forged-digest-chain',
    );
    const others = GATE_IDS.filter((id) => id !== gateId);
    const perturbed = Object.keys(isolated.overrides).sort();

    // (a) STRUCTURAL: only this gate's env vars are touched. The classifier's
    // decision and digest are untouched, so the recomputation anchor is honest.
    check(
      `ISOLATED FORGED CHAIN: "${gateId}" perturbs ONLY its own environment`,
      JSON.stringify(perturbed) === JSON.stringify([gate.evidenceEnv, gate.resultEnv].sort()),
      perturbed.join(','),
    );
    const env = aggregatorEnv(isolated.overrides);
    check(
      `ISOLATED FORGED CHAIN: "${gateId}" leaves the classifier claim honest`,
      env.APPLICABILITY_DIGEST === APP_DIGEST && env.APPLICABILITY_JSON === JSON.stringify(APP_DECISION),
      env.APPLICABILITY_DIGEST,
    );
    // (b) THE OTHER THREE BLOCKERS ARE VALID BEFORE AGGREGATION — asserted on the
    // exact environment this case runs under, not on the honest baseline.
    for (const otherId of others) {
      const other = GATES[otherId];
      check(
        `ISOLATED FORGED CHAIN: while "${gateId}" is forged, "${otherId}" is still an honest PASS`,
        env[other.jobResultEnv] === 'success' &&
          env[other.resultEnv] === 'PASS' &&
          env[other.evidenceEnv] ===
            JSON.stringify({ gateId: otherId, applicability: 'APPLICABLE', digest: APP_DIGEST }),
        `${env[other.resultEnv]} ${env[other.evidenceEnv]}`,
      );
    }
    const run = runAggregator(AGGREGATE_SCRIPT, isolated.overrides);
    const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
    const errorLines = output.split('\n').filter((line) => line.trim().startsWith('- '));
    check(`ISOLATED FORGED CHAIN: "${gateId}" is REJECTED`, run.status !== 0, `exit=${run.status}`);
    for (const otherId of others) {
      check(
        `ISOLATED FORGED CHAIN: rejecting "${gateId}" names NO other blocker ("${otherId}" is clean)`,
        !errorLines.some((line) => line.includes(`blocker ${otherId} `)),
        errorLines.filter((line) => line.includes(`blocker ${otherId} `)).join(' | ').slice(0, 240),
      );
    }
    // (c) …and the ONLY thing wrong with the chain is this gate.
    const restored = runAggregator(AGGREGATE_SCRIPT, {
      ...isolated.overrides,
      [gate.resultEnv]: 'PASS',
      [gate.evidenceEnv]: JSON.stringify({ gateId, applicability: 'APPLICABLE', digest: APP_DIGEST }),
    });
    check(
      `ISOLATED FORGED CHAIN: restoring ONLY "${gateId}" makes the whole chain PASS (the rest was valid)`,
      restored.status === 0,
      `exit=${restored.status} ${(restored.stderr ?? '').slice(0, 240)}`,
    );
    // (d) MUTATION: the case cannot survive this gate being dropped.
    const exempt = runAggregator(exemptingAggregators.get(gateId), isolated.overrides);
    check(
      `ISOLATED FORGED CHAIN: an aggregator OMITTING "${gateId}" ACCEPTS its forged chain (the case is gate-specific)`,
      exempt.status === 0,
      `exit=${exempt.status} ${(exempt.stderr ?? '').slice(0, 240)}`,
    );
  }

  // The rule is load-bearing, not decorative.
  const softenedAggregatorPath = join(sandbox, 'softened-aggregator.mjs');
  writeFileSync(
    softenedAggregatorPath,
    asRunnableAggregator(
      mutate('accept any blocker job result', baseAggregate, [
        ['jobResult !== REQUIRED_JOB_RESULT', 'false'],
        [
          "    if (typeof result !== 'string' || result.length === 0) {",
          "    if (false) {",
        ],
        ['if (!GATE_OUTCOMES.includes(result)) {', 'if (false) {'],
        ['if (!ACCEPTED_GATE_OUTCOMES.includes(result)) {', 'if (false) {'],
        // Synthesize the evidence the vanished blocker never published — the
        // shape a "just make it green" softening would actually take.
        [
          "      evidence = JSON.parse(observed.evidence ?? 'null');",
          '      evidence = { gateId, applicability: decision?.gates?.[gateId], digest };',
        ],
      ]),
    ),
    'utf8',
  );
  const softenedRun = runAggregator(softenedAggregatorPath, {
    GATE_GLOBAL_HEADER_INTERACTION_JOB_RESULT: 'skipped',
    GATE_GLOBAL_HEADER_INTERACTION_RESULT: '',
    GATE_GLOBAL_HEADER_INTERACTION_EVIDENCE: '',
  });
  const realSkippedRun = runAggregator(AGGREGATE_SCRIPT, {
    GATE_GLOBAL_HEADER_INTERACTION_JOB_RESULT: 'skipped',
    GATE_GLOBAL_HEADER_INTERACTION_RESULT: '',
    GATE_GLOBAL_HEADER_INTERACTION_EVIDENCE: '',
  });
  check(
    'the "skipped is never a pass" rule is LOAD-BEARING: a softened aggregator ACCEPTS a skipped blocker',
    softenedRun.status === 0,
    `exit=${softenedRun.status} ${(softenedRun.stderr ?? '').slice(0, 240)}`,
  );
  check(
    'the "skipped is never a pass" rule is LOAD-BEARING: the real aggregator REJECTS the same input',
    realSkippedRun.status !== 0,
    `exit=${realSkippedRun.status}`,
  );

  // B10b. H1 — THE INDEPENDENT RECOMPUTATION IS LOAD-BEARING.
  //
  // The static mutants above prove the CONTRACT would notice the recomputation
  // being deleted. This proves the runtime property, and — critically — proves it
  // is the recomputation doing the work: an aggregator with the recomputation
  // removed, restored to exactly the pre-fix behaviour (trust the supplied
  // digest, compare the blockers to that same supplied value), ACCEPTS the forged
  // chain the real one rejects. This IS the Codex exploit, executed.
  const FORGED = 'forged-applicability-digest';
  // EVERY blocker echoes the forgery, derived from the registry. A chain that
  // only forged the gates someone remembered would be rejected by the ordinary
  // digest-mismatch rule, and this block would then "pass" while demonstrating
  // nothing about the recomputation.
  const forgedChain = { APPLICABILITY_DIGEST: FORGED, ...chainEchoing(FORGED) };
  const trustingAggregatorPath = join(sandbox, 'trusting-aggregator.mjs');
  writeFileSync(
    trustingAggregatorPath,
    asRunnableAggregator(
      mutate('trust the supplied digest (pre-H1 aggregator)', baseAggregate, [
        [
          'decision !== null && boundIdentity !== null ? applicabilityDigest(decision, boundIdentity) : null;',
          'digest ?? null;',
        ],
        ['} else if (!DIGEST_PATTERN.test(digest)) {', '} else if (false) {'],
      ]),
    ),
    'utf8',
  );
  const trustingForgedRun = runAggregator(trustingAggregatorPath, forgedChain);
  const realForgedRun = runAggregator(AGGREGATE_SCRIPT, forgedChain);
  check(
    'H1 EXPLOIT REPRODUCED: an aggregator that TRUSTS the supplied digest accepts a forged chain',
    trustingForgedRun.status === 0,
    `exit=${trustingForgedRun.status} ${(trustingForgedRun.stderr ?? '').slice(0, 240)}`,
  );
  check(
    'H1 FIXED: the real aggregator REJECTS the exact same forged chain',
    realForgedRun.status !== 0,
    `exit=${realForgedRun.status}`,
  );
  // The same softened aggregator must still accept the HONEST chain — otherwise
  // "the trusting one accepts the forgery" would be uninformative.
  check(
    'H1: the softened aggregator is a real aggregator (it still accepts the honest chain)',
    runAggregator(trustingAggregatorPath).status === 0,
  );
  // Stale identity, behaviourally: same forgery-free chain, wrong execution.
  for (const [label, override] of [
    ['head sha', { HEAD_SHA: 'cd'.repeat(20) }],
    ['run id', { GITHUB_RUN_ID: '424242' }],
    ['run attempt', { GITHUB_RUN_ATTEMPT: '2' }],
  ]) {
    const trustingStale = runAggregator(trustingAggregatorPath, override);
    const realStale = runAggregator(AGGREGATE_SCRIPT, override);
    check(
      `H1: a stale ${label} slips past an aggregator that does not recompute`,
      trustingStale.status === 0,
      `exit=${trustingStale.status}`,
    );
    check(
      `H1: the real aggregator REJECTS a stale ${label}`,
      realStale.status !== 0,
      `exit=${realStale.status}`,
    );
  }
  // And the aggregator must print the value it derived, so a human reading a red
  // check can see the two digests side by side.
  const honestRun = runAggregator(AGGREGATE_SCRIPT);
  check(
    'H1: the aggregator logs the digest it independently recomputed',
    new RegExp(`independently recomputed digest: ${APP_DIGEST}`).test(honestRun.stdout ?? ''),
    (honestRun.stdout ?? '').slice(0, 400),
  );

  // B11. THE RESULT EMITTER, BEHAVIOURALLY. A blocker whose applicability output
  // resolved to the empty string (deleted/renamed classifier output) must not be
  // able to publish anything the aggregator would accept.
  const emitterOutput = join(sandbox, 'gate-result-output.txt');
  const runEmitter = (overrides = {}) => {
    writeFileSync(emitterOutput, '', 'utf8');
    const env = {
      ...process.env,
      GITHUB_OUTPUT: emitterOutput,
      GATE_ID: 'global-header-interaction',
      GATE_APPLICABILITY: 'APPLICABLE',
      APPLICABILITY_DIGEST: APP_DIGEST,
      STEP_OUTCOMES: JSON.stringify([
        { name: 'npm ci', outcome: 'success' },
        { name: 'npm run build', outcome: 'success' },
        { name: 'node scripts/ui/global-header-interaction-browser-smoke.mjs', outcome: 'success' },
        { name: 'node scripts/seo/site-indexability-inventory.mjs', outcome: 'success' },
      ]),
      ...overrides,
    };
    const run = spawnSync(process.execPath, [GATE_RESULT_SCRIPT], { env, encoding: 'utf8', cwd: ROOT });
    return { run, output: readFileSync(emitterOutput, 'utf8') };
  };
  const emitterHappy = runEmitter();
  check(
    'RUNTIME: the result emitter publishes PASS for a fully-executed applicable gate',
    emitterHappy.run.status === 0 && /^result=PASS$/m.test(emitterHappy.output),
    `${emitterHappy.run.status} ${emitterHappy.output}`,
  );
  const emitterSkippedAll = runEmitter({
    GATE_APPLICABILITY: 'NOT_APPLICABLE',
    STEP_OUTCOMES: JSON.stringify([
      { name: 'npm ci', outcome: 'skipped' },
      { name: 'npm run build', outcome: 'skipped' },
      { name: 'node scripts/ui/global-header-interaction-browser-smoke.mjs', outcome: 'skipped' },
      { name: 'node scripts/seo/site-indexability-inventory.mjs', outcome: 'skipped' },
    ]),
  });
  check(
    'RUNTIME: the result emitter publishes NOT_APPLICABLE for a fully-skipped inapplicable gate',
    emitterSkippedAll.run.status === 0 && /^result=NOT_APPLICABLE$/m.test(emitterSkippedAll.output),
    `${emitterSkippedAll.run.status} ${emitterSkippedAll.output}`,
  );
  const EMITTER_RUNTIME_REJECTIONS = [
    ['an EMPTY applicability (deleted/renamed classifier output)', { GATE_APPLICABILITY: '' }],
    ['an out-of-vocabulary applicability', { GATE_APPLICABILITY: 'skipped' }],
    ['a MISSING evidence digest', { APPLICABILITY_DIGEST: '' }],
    ['malformed step outcomes', { STEP_OUTCOMES: '{' }],
    [
      'an APPLICABLE gate whose work was SKIPPED',
      {
        STEP_OUTCOMES: JSON.stringify([
          { name: 'npm ci', outcome: 'skipped' },
          { name: 'npm run build', outcome: 'skipped' },
          { name: 'node scripts/ui/global-header-interaction-browser-smoke.mjs', outcome: 'skipped' },
          { name: 'node scripts/seo/site-indexability-inventory.mjs', outcome: 'skipped' },
        ]),
      },
    ],
  ];
  for (const [label, overrides] of EMITTER_RUNTIME_REJECTIONS) {
    const { run, output } = runEmitter(overrides);
    check(`RUNTIME: the result emitter FAILS CLOSED on ${label}`, run.status !== 0, `exit=${run.status}`);
    check(
      `RUNTIME: the result emitter publishes FAIL (never silence) on ${label}`,
      /^result=FAIL$/m.test(output),
      output,
    );
  }
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
