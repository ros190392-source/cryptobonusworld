#!/usr/bin/env node
// S2-04 R1 / M1 — WORKFLOW-LEVEL BEHAVIOURAL PROOF of the blocker result emitter
// (issue #366).
//
// WHY THIS SUITE EXISTS.
//
// The parity suite already drives `evaluateGateResult()` directly and proves that
// a failed build maps to FAIL. That proves the FUNCTION is right. It says nothing
// about whether the STEP that calls the function ever runs — and it did not:
// every emitter carried no `if`, which is GitHub's implicit `if: success()`, so a
// failed build or a failed hard-gate script SKIPPED the emitter and the blocker
// job published no result at all. "The emitter would have published FAIL if it had
// run" is not the published closed-result contract.
//
// So this suite tests one level up. It reads the REAL workflow file, simulates
// GitHub's documented step-execution semantics over the real blocker jobs, and
// EXECUTES the real emitter script as a subprocess with the env the workflow
// actually declares — interpolated from the simulated step outcomes. The value it
// asserts on is the one the aggregator really consumes: the text the emitter
// appended to GITHUB_OUTPUT, read back through the job's own `outputs:` mapping.
//
// The simulated semantics, from the GitHub Actions documentation:
//   * a step with no `if` behaves as `if: success()` — it runs only while no
//     earlier step in the job has failed;
//   * `always()` runs regardless of earlier failure/cancellation;
//   * a step whose condition is false is SKIPPED, and `steps.<id>.outcome` for it
//     is the literal string `skipped`;
//   * `steps.<id>.outcome` for a step that does not exist at all resolves to the
//     empty string;
//   * a failing step that is not `continue-on-error` sets the job status to
//     `failure`, and the job conclusion is that status.
// Anything the evaluator has not been taught to model THROWS rather than
// defaulting — an unmodelled condition must abort this suite, never quietly
// evaluate to something convenient.
//
// WHAT IS PROVED, per registered blocker:
//   1. honest success                => emitter runs => PASS  => aggregator PASSES
//   2. honest NOT_APPLICABLE         => emitter runs => NOT_APPLICABLE
//   3. BUILD failure                 => emitter STILL runs => FAIL => job RED
//   4. GATE-SCRIPT failure           => emitter STILL runs => FAIL => job RED
//   5. install failure               => emitter STILL runs => FAIL => job RED
//   6. the published FAIL reaches the REAL aggregator, which fails closed.
//
// And, as mutation coverage, that each of the following is BEHAVIOURALLY
// observable — the mutant publishes something the real workflow does not:
//   * remove the emitter's `if: always()`
//   * replace it with `if: success()`
//   * delete the emitter step
//   * delete the job's `result` output
//   * hard-code PASS in the emitter script
//   * hard-code NOT_APPLICABLE in the emitter script
//   * stop publishing after a FAIL evaluation
//
// Runs with no network and no GitHub. Depends on js-yaml (the classifier job has
// already installed dependencies before this suite runs).

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import yaml from 'js-yaml';
import { GATES, GATE_IDS, applicabilityDigest } from './master-required-gate-gates.mjs';
import { GATE_RESULT_COMMAND } from './master-required-gate-workflow-contract.mjs';

const ROOT = resolve(process.cwd());
const WORKFLOW = resolve(ROOT, '.github/workflows/cbw-master-required-gate.yml');
const GATE_RESULT_SCRIPT = resolve(ROOT, 'scripts/ci/master-required-gate-gate-result.mjs');
const GATES_SCRIPT = resolve(ROOT, 'scripts/ci/master-required-gate-gates.mjs');
const AGGREGATE_SCRIPT = resolve(ROOT, 'scripts/ci/master-required-gate-aggregate.mjs');

let checks = 0;
const failures = [];
function check(label, ok, detail = '') {
  checks += 1;
  if (!ok) failures.push(detail ? `${label}: ${detail}` : label);
}

const hasIf = (node) => Object.prototype.hasOwnProperty.call(node ?? {}, 'if');

// ============================================================================
// 1. A DELIBERATELY SMALL, DELIBERATELY STRICT GitHub EXPRESSION EVALUATOR
// ============================================================================

/** Resolves ONE operand: a single-quoted literal, or a context path. */
export function resolveOperand(token, ctx) {
  const text = String(token).trim();
  const literal = /^'([^']*)'$/.exec(text);
  if (literal) return literal[1];

  let match = /^needs\.([A-Za-z0-9_-]+)\.outputs\.([A-Za-z0-9_-]+)$/.exec(text);
  if (match) return String(ctx.needs?.[match[1]]?.outputs?.[match[2]] ?? '');
  match = /^needs\.([A-Za-z0-9_-]+)\.result$/.exec(text);
  if (match) return String(ctx.needs?.[match[1]]?.result ?? '');
  match = /^steps\.([A-Za-z0-9_-]+)\.outcome$/.exec(text);
  // An absent step resolves to the EMPTY STRING, exactly as GitHub does — this is
  // the fail-open shape the whole gate exists to close, so it is modelled, not
  // approximated.
  if (match) return String(ctx.outcomes?.[match[1]] ?? '');
  match = /^steps\.([A-Za-z0-9_-]+)\.outputs\.([A-Za-z0-9_-]+)$/.exec(text);
  if (match) return String(ctx.stepOutputs?.[match[1]]?.[match[2]] ?? '');
  match = /^github\.event\.pull_request\.(head|base)\.sha$/.exec(text);
  if (match) return String(ctx.github?.[`${match[1]}Sha`] ?? '');

  throw new Error(`emitter-behaviour: unmodelled expression operand ${JSON.stringify(text)}`);
}

/**
 * Evaluates a step `if` under GitHub's semantics. Supports exactly the shapes
 * this workflow is permitted to contain; everything else throws.
 */
export function evaluateCondition(expression, ctx) {
  const text = String(expression).trim();
  if (text.length === 0) {
    throw new Error('emitter-behaviour: an empty `if` is not a modelled condition');
  }
  // THE IMPLICIT `success() &&`. GitHub inserts it into any `if` that contains no
  // status-check function at all, which is why a plain applicability condition is
  // NOT enough to keep a step alive after an earlier failure — and why the emitter
  // needs the literal `always()` rather than merely "some condition".
  const hasStatusFunction = /\b(?:always|success|failure|cancelled)\s*\(\s*\)/.test(text);
  if (!hasStatusFunction && ctx.jobStatus !== 'success') return false;
  return text.split('&&').every((raw) => {
    const term = raw.trim();
    if (term === 'always()') return true;
    if (term === 'success()') return ctx.jobStatus === 'success';
    if (term === 'failure()') return ctx.jobStatus === 'failure';
    if (term === 'cancelled()') return ctx.jobStatus === 'cancelled';
    const comparison = /^(.+?)(==|!=)(.+)$/.exec(term);
    if (!comparison) {
      throw new Error(`emitter-behaviour: unmodelled condition term ${JSON.stringify(term)}`);
    }
    const left = resolveOperand(comparison[1], ctx);
    const right = resolveOperand(comparison[3], ctx);
    return comparison[2] === '==' ? left === right : left !== right;
  });
}

/** Substitutes every `${{ … }}` in a workflow string with its resolved value. */
export function interpolate(text, ctx) {
  return String(text).replace(/\$\{\{([^}]*)\}\}/g, (_, expression) => resolveOperand(expression, ctx));
}

/**
 * Simulates ONE job's step sequence.
 *
 * @param {object} input
 * @param {object} input.job the job node straight out of the parsed workflow
 * @param {object} input.needs the `needs` context available to it
 * @param {object} input.github the `github` context available to it
 * @param {(step: object, ctx: object) => {outcome: string, outputs?: object}} input.execute
 *   runs one step that the condition admitted, and reports its outcome
 * @returns {{conclusion: string, outcomes: Record<string,string>,
 *   stepOutputs: Record<string,object>, ran: string[], skipped: string[],
 *   outputs: Record<string,string>}}
 */
export function runJob({ job, needs, github, execute }) {
  const outcomes = {};
  const stepOutputs = {};
  const ran = [];
  const skipped = [];
  let jobStatus = 'success';

  for (const step of Array.isArray(job?.steps) ? job.steps : []) {
    const ctx = { jobStatus, outcomes, stepOutputs, needs, github };
    // NO `if` MEANS `success()`. This one line is the whole reviewed defect.
    const condition = hasIf(step) ? String(step.if) : 'success()';
    const label = step?.id ?? step?.name ?? '<unnamed>';
    if (!evaluateCondition(condition, ctx)) {
      if (step?.id) outcomes[step.id] = 'skipped';
      skipped.push(label);
      continue;
    }
    const result = execute(step, ctx);
    ran.push(label);
    if (step?.id) {
      outcomes[step.id] = result.outcome;
      stepOutputs[step.id] = result.outputs ?? {};
    }
    if (result.outcome === 'failure' && step?.['continue-on-error'] !== true) jobStatus = 'failure';
  }

  // The job's declared outputs, resolved through the SAME step-output context the
  // runner would use — so a deleted `outputs:` entry or an unbound step id shows
  // up here as the empty string, exactly as the aggregator would see it.
  const outputs = {};
  const outCtx = { jobStatus, outcomes, stepOutputs, needs, github };
  for (const [name, expression] of Object.entries(job?.outputs ?? {})) {
    outputs[name] = interpolate(expression, outCtx);
  }
  return { conclusion: jobStatus, outcomes, stepOutputs, ran, skipped, outputs };
}

// ============================================================================
// 2. THE HARNESS: real workflow, real emitter subprocess
// ============================================================================

const sandbox = mkdtempSync(join(tmpdir(), 'cbw-emitter-behaviour-'));

const loadWorkflow = (text) => yaml.load(text, { schema: yaml.CORE_SCHEMA });
const baseWorkflowText = readFileSync(WORKFLOW, 'utf8').replace(/\r\n/g, '\n');

// This run's canonical identity and the ONE digest that reproduces from it. The
// aggregator recomputes this value independently, so using anything else here
// would make every aggregator assertion below fail for the wrong reason.
const IDENTITY = Object.freeze({ headSha: 'ab'.repeat(20), runId: '991144', runAttempt: '1' });
const DECISION = {
  gates: Object.fromEntries(GATE_IDS.map((gateId) => [gateId, 'APPLICABLE'])),
  reasons: Object.fromEntries(GATE_IDS.map((gateId) => [gateId, 'relevant-path-changed'])),
  changedPaths: ['src/pages/index.astro'],
  material: 'true',
  materialReason: 'material-path-changed',
};
const DIGEST = applicabilityDigest(DECISION, IDENTITY);

const classifyNeeds = (applicabilityByGate) => ({
  classify: {
    result: 'success',
    outputs: {
      material: 'true',
      reason: 'material-path-changed',
      applicability: JSON.stringify(DECISION),
      digest: DIGEST,
      ...Object.fromEntries(
        GATE_IDS.map((gateId) => [GATES[gateId].outputName, applicabilityByGate[gateId] ?? 'APPLICABLE']),
      ),
    },
  },
});

const GITHUB_CTX = Object.freeze({ headSha: IDENTITY.headSha, baseSha: 'cd'.repeat(20) });

/**
 * Runs one blocker job of a (possibly mutated) workflow.
 *
 * Every `uses:` step is a no-op success (checkout and setup-node have no bearing
 * on what is being proved). Every `run:` step is simulated as success unless the
 * scenario names it as failing — EXCEPT the emitter, which is really executed.
 */
function simulateBlocker({
  workflowText = baseWorkflowText,
  gateId,
  applicability = 'APPLICABLE',
  failing = new Set(),
  emitterScript = GATE_RESULT_SCRIPT,
}) {
  const workflow = loadWorkflow(workflowText);
  const job = workflow?.jobs?.[GATES[gateId].jobId];
  if (!job) throw new Error(`emitter-behaviour: blocker job for "${gateId}" is missing from the workflow`);
  const needs = classifyNeeds(Object.fromEntries(GATE_IDS.map((id) => [id, id === gateId ? applicability : 'APPLICABLE'])));
  const outputFile = join(sandbox, `github-output-${gateId}.txt`);
  writeFileSync(outputFile, '', 'utf8');
  let emitterRan = false;
  let emitterExit = null;
  let emitterStderr = '';

  const run = runJob({
    job,
    needs,
    github: GITHUB_CTX,
    execute: (step, ctx) => {
      if (step?.uses) return { outcome: 'success' };
      const command = String(step?.run ?? '').trim();
      if (command !== GATE_RESULT_COMMAND) {
        return { outcome: failing.has(step?.id) ? 'failure' : 'success' };
      }
      // THE REAL EMITTER, as a real process, with the env the workflow declares.
      emitterRan = true;
      const env = { ...process.env, GITHUB_OUTPUT: outputFile };
      for (const [name, value] of Object.entries(step?.env ?? {})) env[name] = interpolate(value, ctx);
      const spawned = spawnSync(process.execPath, [emitterScript], { env, encoding: 'utf8', cwd: ROOT });
      emitterExit = spawned.status;
      emitterStderr = `${spawned.stdout ?? ''}${spawned.stderr ?? ''}`;
      const published = Object.fromEntries(
        readFileSync(outputFile, 'utf8')
          .split('\n')
          .filter((line) => line.includes('='))
          .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
      );
      return { outcome: spawned.status === 0 ? 'success' : 'failure', outputs: published };
    },
  });

  return { ...run, emitterRan, emitterExit, emitterStderr, publishedResult: run.outputs.result ?? '' };
}

/**
 * Runs the REAL aggregator over a full set of simulated blocker jobs.
 *
 * `forceJobResult` exists for ONE assertion: the aggregator rejects a blocker
 * whose JOB result is not `success` before it ever reads the published outcome,
 * so proving "the aggregator consumes a published FAIL" requires the state in
 * which the job went green while publishing FAIL. That state is reachable in
 * production — an emitter is the last step, and a `continue-on-error` slipped
 * onto it would produce exactly it — so it is worth binding explicitly.
 */
function runAggregator(perGate, { forceJobResult = null } = {}) {
  const env = {
    ...process.env,
    HEAD_SHA: IDENTITY.headSha,
    GITHUB_RUN_ID: IDENTITY.runId,
    GITHUB_RUN_ATTEMPT: IDENTITY.runAttempt,
    CLASSIFY_JOB_RESULT: 'success',
    CLASSIFIER_MATERIAL: 'true',
    APPLICABILITY_JSON: JSON.stringify(DECISION),
    APPLICABILITY_DIGEST: DIGEST,
  };
  for (const gateId of GATE_IDS) {
    const gate = GATES[gateId];
    const observed = perGate[gateId];
    env[gate.jobResultEnv] = forceJobResult ?? observed.conclusion;
    env[gate.resultEnv] = observed.outputs.result ?? '';
    env[gate.evidenceEnv] = observed.outputs.evidence ?? '';
  }
  return spawnSync(process.execPath, [AGGREGATE_SCRIPT], { env, encoding: 'utf8', cwd: ROOT });
}

try {
  // --- 0. the evaluator itself is strict ------------------------------------
  check(
    'the step-semantics evaluator treats a missing `if` as `success()`',
    evaluateCondition('success()', { jobStatus: 'failure' }) === false &&
      evaluateCondition('success()', { jobStatus: 'success' }) === true,
  );
  check(
    'the step-semantics evaluator treats `always()` as running after failure',
    evaluateCondition('always()', { jobStatus: 'failure' }) === true,
  );
  check(
    'the step-semantics evaluator resolves an ABSENT step outcome to the empty string',
    resolveOperand('steps.nonexistent.outcome', { outcomes: {} }) === '',
  );
  let threw = false;
  try {
    evaluateCondition('someNewFunction()', { jobStatus: 'success' });
  } catch {
    threw = true;
  }
  check('the step-semantics evaluator THROWS on an unmodelled condition (never defaults)', threw);

  // --- 1..5. THE PER-GATE BEHAVIOURAL MATRIX --------------------------------
  const successRuns = {};
  const buildFailureRuns = {};
  for (const gateId of GATE_IDS) {
    const gate = GATES[gateId];
    const gateStepId = gate.steps.find((step) => step.command === `node ${gate.gateScript}`)?.id;
    check(`"${gateId}": the registry names the hard-gate step id`, Boolean(gateStepId), gate.gateScript);

    // 1. HONEST SUCCESS.
    const ok = simulateBlocker({ gateId });
    successRuns[gateId] = ok;
    check(`"${gateId}": honest success — the emitter runs`, ok.emitterRan);
    check(`"${gateId}": honest success — publishes PASS`, ok.publishedResult === 'PASS', ok.publishedResult);
    check(`"${gateId}": honest success — the job is GREEN`, ok.conclusion === 'success', JSON.stringify(ok.outcomes));
    check(`"${gateId}": honest success — the emitter exits 0`, ok.emitterExit === 0, String(ok.emitterExit));

    // 2. HONEST NOT_APPLICABLE.
    const inert = simulateBlocker({ gateId, applicability: 'NOT_APPLICABLE' });
    check(`"${gateId}": honest NOT_APPLICABLE — the emitter runs`, inert.emitterRan);
    check(
      `"${gateId}": honest NOT_APPLICABLE — publishes NOT_APPLICABLE`,
      inert.publishedResult === 'NOT_APPLICABLE',
      inert.publishedResult,
    );
    check(
      `"${gateId}": honest NOT_APPLICABLE — every blocking step really was skipped`,
      gate.steps.every((step) => inert.outcomes[step.id] === 'skipped'),
      JSON.stringify(inert.outcomes),
    );
    check(
      `"${gateId}": honest NOT_APPLICABLE — the job is GREEN`,
      inert.conclusion === 'success',
      JSON.stringify(inert.outcomes),
    );

    // 3/4/5. FAILURE OF EACH BLOCKING STEP — the emitter must still instantiate.
    for (const failingStep of gate.steps) {
      const failed = simulateBlocker({ gateId, failing: new Set([failingStep.id]) });
      if (failingStep.id === 'build') buildFailureRuns[gateId] = failed;
      check(
        `"${gateId}": after "${failingStep.id}" FAILED, the emitter STILL RUNS`,
        failed.emitterRan,
        `skipped=${failed.skipped.join(',')}`,
      );
      check(
        `"${gateId}": after "${failingStep.id}" FAILED, the published result is FAIL`,
        failed.publishedResult === 'FAIL',
        `published=${JSON.stringify(failed.publishedResult)}`,
      );
      check(
        `"${gateId}": after "${failingStep.id}" FAILED, the blocker job is still RED`,
        failed.conclusion === 'failure',
        JSON.stringify(failed.outcomes),
      );
      check(
        `"${gateId}": after "${failingStep.id}" FAILED, the emitter exits non-zero (no failure suppression)`,
        failed.emitterExit !== 0,
        String(failed.emitterExit),
      );
      check(
        `"${gateId}": after "${failingStep.id}" FAILED, nothing is published as PASS or NOT_APPLICABLE`,
        failed.publishedResult !== 'PASS' && failed.publishedResult !== 'NOT_APPLICABLE',
        failed.publishedResult,
      );
    }

    // The named build / gate-script cases, restated on their own because they are
    // the two the review asked for by name.
    const buildFailed = buildFailureRuns[gateId];
    check(
      `"${gateId}": BUILD FAILURE — emitter ran and published FAIL`,
      buildFailed.emitterRan && buildFailed.publishedResult === 'FAIL',
      buildFailed.publishedResult,
    );
    const scriptFailed = simulateBlocker({ gateId, failing: new Set([gateStepId]) });
    check(
      `"${gateId}": GATE-SCRIPT FAILURE — emitter ran and published FAIL`,
      scriptFailed.emitterRan && scriptFailed.publishedResult === 'FAIL',
      scriptFailed.publishedResult,
    );
  }

  // --- 6. THE AGGREGATOR CONSUMES WHAT WAS PUBLISHED -------------------------
  const honestAggregation = runAggregator(successRuns);
  check(
    'AGGREGATOR: an honest all-PASS chain of real emitter outputs PASSES',
    honestAggregation.status === 0,
    `${honestAggregation.status} ${(honestAggregation.stderr ?? '').slice(0, 300)}`,
  );
  for (const gateId of GATE_IDS) {
    const withFailure = { ...successRuns, [gateId]: buildFailureRuns[gateId] };
    const aggregated = runAggregator(withFailure);
    check(
      `AGGREGATOR: a real published FAIL from "${gateId}" fails the required gate`,
      aggregated.status !== 0,
      String(aggregated.status),
    );
    check(
      `AGGREGATOR: it names "${gateId}" as the reason`,
      new RegExp(`blocker ${gateId} `).test(`${aggregated.stdout ?? ''}${aggregated.stderr ?? ''}`),
      (aggregated.stderr ?? '').slice(0, 300),
    );
  }

  // ==========================================================================
  // 3. MUTATION COVERAGE — every mutation must be BEHAVIOURALLY observable
  // ==========================================================================
  const mutateText = (label, text, from, to) => {
    const next = text.replace(from, to);
    if (next === text) throw new Error(`emitter-behaviour: mutation setup failed (no-op): ${label}`);
    return next;
  };

  // --- workflow-shaped mutants ----------------------------------------------
  // Each is applied to the FIRST emitter only, and asserted against the gate that
  // owns it, so a mutant cannot be "caught" by collateral damage elsewhere.
  const FIRST_EMITTER_GATE = 'global-header-interaction';
  const EMITTER_BLOCK =
    '      - name: Publish global header blocker result\n        id: gate-result\n        if: always()\n';

  const WORKFLOW_MUTANTS = [
    {
      label: 'remove the emitter `if: always()`',
      text: mutateText('remove always()', baseWorkflowText, EMITTER_BLOCK, EMITTER_BLOCK.replace('        if: always()\n', '')),
    },
    {
      label: 'replace the emitter condition with `if: success()`',
      text: mutateText('success()', baseWorkflowText, EMITTER_BLOCK, EMITTER_BLOCK.replace('always()', 'success()')),
    },
    {
      label: 'condition the emitter on applicability only',
      text: mutateText(
        'applicability-only emitter',
        baseWorkflowText,
        EMITTER_BLOCK,
        EMITTER_BLOCK.replace(
          'if: always()',
          "if: needs.classify.outputs.gate_global_header_interaction == 'APPLICABLE'",
        ),
      ),
    },
  ];
  for (const mutant of WORKFLOW_MUTANTS) {
    const mutated = simulateBlocker({
      workflowText: mutant.text,
      gateId: FIRST_EMITTER_GATE,
      failing: new Set(['build']),
    });
    check(
      `MUTANT (${mutant.label}) is behaviourally observable: the emitter is SKIPPED after a failed build`,
      !mutated.emitterRan,
      `ran=${mutated.ran.join(',')}`,
    );
    check(
      `MUTANT (${mutant.label}) publishes NOTHING — the closed-result contract is broken`,
      mutated.publishedResult === '',
      JSON.stringify(mutated.publishedResult),
    );
    // …and the aggregator would then see an absent result rather than a FAIL. It
    // still fails closed — that is why the defect was MEDIUM and not HIGH — but
    // for "no result" rather than "this gate failed", which is the evidence loss
    // the contract forbids.
    const aggregated = runAggregator({ ...successRuns, [FIRST_EMITTER_GATE]: mutated });
    check(
      `MUTANT (${mutant.label}) degrades the aggregator's reason to an ABSENT result`,
      /published NO result|job result is "failure"/.test(`${aggregated.stdout ?? ''}${aggregated.stderr ?? ''}`),
      (aggregated.stderr ?? '').slice(0, 300),
    );
  }

  // Deleting the emitter step entirely, and deleting the job's result output.
  const deletedEmitter = mutateText(
    'delete emitter step',
    baseWorkflowText,
    /      - name: Publish global header blocker result\n(?:.*\n)*?        run: node scripts\/ci\/master-required-gate-gate-result\.mjs\n/,
    '',
  );
  const deletedRun = simulateBlocker({ workflowText: deletedEmitter, gateId: FIRST_EMITTER_GATE });
  check(
    'MUTANT (delete the emitter step) is behaviourally observable: nothing is ever published',
    !deletedRun.emitterRan && deletedRun.publishedResult === '',
    `ran=${deletedRun.emitterRan} published=${JSON.stringify(deletedRun.publishedResult)}`,
  );
  check(
    'MUTANT (delete the emitter step): the aggregator fails closed on the absent result',
    runAggregator({ ...successRuns, [FIRST_EMITTER_GATE]: deletedRun }).status !== 0,
  );

  const deletedOutput = mutateText(
    'delete result output',
    baseWorkflowText,
    '    outputs:\n      result: ${{ steps.gate-result.outputs.result }}\n      evidence: ${{ steps.gate-result.outputs.evidence }}\n',
    '    outputs:\n      evidence: ${{ steps.gate-result.outputs.evidence }}\n',
  );
  const deletedOutputRun = simulateBlocker({ workflowText: deletedOutput, gateId: FIRST_EMITTER_GATE });
  check(
    'MUTANT (delete the job result output) is behaviourally observable: the emitter runs but nothing reaches the aggregator',
    deletedOutputRun.emitterRan && deletedOutputRun.publishedResult === '',
    JSON.stringify(deletedOutputRun.outputs),
  );
  check(
    'MUTANT (delete the job result output): the aggregator fails closed',
    runAggregator({ ...successRuns, [FIRST_EMITTER_GATE]: deletedOutputRun }).status !== 0,
  );

  // --- emitter-script mutants ------------------------------------------------
  // Run from the sandbox, so two harness accommodations are needed for the file
  // to execute at all. Neither restores anything a mutation removed.
  const baseEmitter = readFileSync(GATE_RESULT_SCRIPT, 'utf8').replace(/\r\n/g, '\n');
  const asRunnableEmitter = (source) =>
    mutateText(
      'emitter harness accommodation',
      mutateText(
        'emitter import accommodation',
        source,
        "from './master-required-gate-gates.mjs'",
        `from ${JSON.stringify(pathToFileURL(GATES_SCRIPT).href)}`,
      ),
      "process.argv[1]?.endsWith('master-required-gate-gate-result.mjs')",
      'true',
    );
  const writeMutant = (name, source) => {
    const path = join(sandbox, name);
    writeFileSync(path, asRunnableEmitter(source), 'utf8');
    return path;
  };

  const hardCodedPass = writeMutant(
    'emitter-hardcoded-pass.mjs',
    mutateText('hard-code PASS', baseEmitter, '`result=${evaluation.result}\\n', '`result=PASS\\n'),
  );
  const hardCodedNa = writeMutant(
    'emitter-hardcoded-na.mjs',
    mutateText('hard-code NOT_APPLICABLE', baseEmitter, '`result=${evaluation.result}\\n', '`result=NOT_APPLICABLE\\n'),
  );
  const silentOnFail = writeMutant(
    'emitter-silent-on-fail.mjs',
    mutateText(
      'stop publishing FAIL',
      baseEmitter,
      '  appendFileSync(\n',
      "  if (evaluation.result !== 'FAIL')\n  appendFileSync(\n",
    ),
  );

  const SCRIPT_MUTANTS = [
    {
      label: 'hard-code PASS in the emitter',
      script: hardCodedPass,
      expectPublished: 'PASS',
    },
    {
      label: 'hard-code NOT_APPLICABLE in the emitter',
      script: hardCodedNa,
      expectPublished: 'NOT_APPLICABLE',
    },
    {
      label: 'stop publishing FAIL after a failed blocking step',
      script: silentOnFail,
      expectPublished: '',
    },
  ];
  for (const mutant of SCRIPT_MUTANTS) {
    const mutated = simulateBlocker({
      gateId: FIRST_EMITTER_GATE,
      failing: new Set(['build']),
      emitterScript: mutant.script,
    });
    check(
      `MUTANT (${mutant.label}) is behaviourally observable after a failed build`,
      mutated.publishedResult === mutant.expectPublished,
      `published=${JSON.stringify(mutated.publishedResult)} expected=${JSON.stringify(mutant.expectPublished)}`,
    );
    check(
      `MUTANT (${mutant.label}) differs from the REAL emitter, which publishes FAIL`,
      buildFailureRuns[FIRST_EMITTER_GATE].publishedResult === 'FAIL' &&
        mutated.publishedResult !== 'FAIL',
      `real=${buildFailureRuns[FIRST_EMITTER_GATE].publishedResult} mutant=${mutated.publishedResult}`,
    );
    check(
      `MUTANT (${mutant.label}) is rejected by the aggregator`,
      runAggregator({ ...successRuns, [FIRST_EMITTER_GATE]: mutated }).status !== 0,
    );
    // DEFENCE IN DEPTH, stated explicitly. The failed build already makes the JOB
    // red, and the aggregator rejects a non-success job result before it reads any
    // published outcome — so none of these mutants reaches a green required gate
    // by itself. What each one destroys is the EVIDENCE: with the job result
    // neutralised, a hard-coded PASS is accepted outright. That is why these are
    // killed statically by the contract rather than left to the aggregator.
    const evidenceOnly = runAggregator(
      { ...successRuns, [FIRST_EMITTER_GATE]: mutated },
      { forceJobResult: 'success' },
    );
    check(
      `MUTANT (${mutant.label}) destroys the evidence: with the job result neutralised it is ${
        mutant.expectPublished === 'PASS' ? 'ACCEPTED' : 'no longer a named FAIL'
      }`,
      mutant.expectPublished === 'PASS' ? evidenceOnly.status === 0 : evidenceOnly.status !== 0,
      `${evidenceOnly.status} ${(evidenceOnly.stderr ?? '').slice(0, 300)}`,
    );
  }

  // The real emitter, under the same failed build, is rejected by the aggregator
  // FOR THE RIGHT REASON — a published FAIL, not an absence. The job result is
  // neutralised so the assertion is about the published outcome and nothing else.
  const realFailAggregation = runAggregator(
    { ...successRuns, [FIRST_EMITTER_GATE]: buildFailureRuns[FIRST_EMITTER_GATE] },
    { forceJobResult: 'success' },
  );
  check(
    'the REAL workflow fails the required gate on a PUBLISHED FAIL (not on silence)',
    realFailAggregation.status !== 0 &&
      /published "FAIL"/.test(`${realFailAggregation.stdout ?? ''}${realFailAggregation.stderr ?? ''}`),
    (realFailAggregation.stderr ?? '').slice(0, 400),
  );
  // And with the job result honest, the required gate is red anyway.
  check(
    'the REAL workflow fails the required gate on the red blocker job as well',
    runAggregator({ ...successRuns, [FIRST_EMITTER_GATE]: buildFailureRuns[FIRST_EMITTER_GATE] }).status !== 0,
  );

  // Coverage bookkeeping: every registered gate really was exercised.
  check(
    'every registered blocker was exercised by this suite',
    GATE_IDS.every((gateId) => successRuns[gateId] && buildFailureRuns[gateId]),
    GATE_IDS.join(','),
  );
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`CBW MASTER REQUIRED GATE EMITTER BEHAVIOUR: FAIL (${failures.length}/${checks})`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`CBW MASTER REQUIRED GATE EMITTER BEHAVIOUR: PASS (${checks}/${checks})`);
}
