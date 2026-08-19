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
//   2. honest NOT_APPLICABLE — where the decision is produced by the REAL
//      classifier over a REAL change set (the other gates' exclusive surfaces),
//      never hand-edited     => emitter runs => NOT_APPLICABLE
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
import {
  GATES,
  GATE_IDS,
  applicabilityDigest,
  canonicalizeDecision,
  gateExclusiveSurface,
} from './master-required-gate-gates.mjs';
import { computeApplicability } from './master-required-gate-applicability.mjs';
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

// This run's canonical identity. Every digest below is the one the aggregator
// independently recomputes under it, so using anything else here would make
// every aggregator assertion below fail for the wrong reason.
const IDENTITY = Object.freeze({ headSha: 'ab'.repeat(20), runId: '991144', runAttempt: '1' });

// The baseline change set — one real public page — put through the REAL producer
// computation: the exact classifyChangedPaths + classifyAllGates pipeline the
// classify job executes. Nothing in this suite ever writes a `gates`/`reasons`
// map by hand; every honest decision is an OUTPUT of this pipeline over a
// concrete change set.
const BASELINE_PATHS = Object.freeze(['src/pages/index.astro']);
const { decision: DECISION, digest: DIGEST } = computeApplicability({
  paths: [...BASELINE_PATHS],
  identity: IDENTITY,
});

/**
 * TRUE iff a decision is a state the REAL classifier can produce: recomputing
 * the whole decision from the decision's OWN changedPaths reproduces it exactly
 * (canonical form, which covers gates, reasons, paths and materiality).
 *
 * This predicate is load-bearing (S2-04 R3). The aggregator recomputes the
 * digest OVER the decision it is handed — it cannot re-derive the decision from
 * the diff, so a hand-edited decision with a self-consistent digest sails
 * through the runtime chain end to end. Classifier-reachability is therefore
 * exactly the property only this suite can assert, and every honest fixture
 * below is required to pass it.
 */
const isClassifierReachable = (decision) =>
  Array.isArray(decision?.changedPaths) &&
  canonicalizeDecision(
    computeApplicability({ paths: [...decision.changedPaths], identity: IDENTITY }).decision,
    IDENTITY,
  ) === canonicalizeDecision(decision, IDENTITY);

/**
 * The REAL inert fixture of one gate (S2-04 R3).
 *
 * R2 produced the "honest NOT_APPLICABLE" decision by hand-editing the baseline
 * decision: one gate flipped, the reason moved with it, the digest recomputed —
 * internally coherent, but with changedPaths still naming the baseline page, for
 * which the live classifier returns APPLICABLE for every gate. The fixture was
 * digest-consistent yet NOT classifier-reachable, so the positive case proved
 * the chain accepts a decision no classifier run can emit.
 *
 * The fixture is now DERIVED from the registry's own exclusivity model instead:
 * the change set is the EXCLUSIVE SURFACE (legacy workflow + gate script) of
 * every OTHER registered gate. By construction of deriveIrrelevantPaths those
 * paths are precisely the selected gate's cross-gate inert set — and each one is
 * relevant to the gate that owns it — so the REAL classifier, unedited, marks
 * the selected gate NOT_APPLICABLE and every other gate APPLICABLE. The
 * decision, its digest and everything downstream are outputs of
 * computeApplicability over that change set; nothing edits the decision.
 */
const inertFixtureFor = (gateId) => {
  const paths = GATE_IDS.filter((otherId) => otherId !== gateId)
    .flatMap((otherId) => gateExclusiveSurface(otherId))
    .sort();
  const { decision, digest } = computeApplicability({ paths, identity: IDENTITY });
  return { paths, decision, digest };
};

// The R2 shape, RETAINED ONLY AS A KNOWN-BAD MUTANT for the fixture-mutation
// coverage below: a hand-edited decision that flips one gate while changedPaths
// still names the baseline page. No honest scenario uses it; section 6c proves
// isClassifierReachable() rejects exactly this shape while the runtime cannot.
const handEditedDecisionWith = (gateId, applicability) => ({
  ...DECISION,
  gates: { ...DECISION.gates, [gateId]: applicability },
  reasons: {
    ...DECISION.reasons,
    [gateId]: applicability === 'NOT_APPLICABLE' ? 'only-gate-irrelevant-paths' : 'relevant-path-changed',
  },
});

/**
 * The classifier job's outputs, PROJECTED from a decision.
 *
 * `outputOverrides` exists for exactly one purpose: the negative case, which
 * tampers with a convenience output while leaving the decision and digest honest.
 * Every honest scenario passes none.
 */
const classifyNeedsFor = (decision, digest, outputOverrides = {}) => ({
  classify: {
    result: 'success',
    outputs: {
      material: decision.material,
      reason: decision.materialReason,
      applicability: JSON.stringify(decision),
      digest,
      ...Object.fromEntries(GATE_IDS.map((gateId) => [GATES[gateId].outputName, decision.gates[gateId]])),
      ...outputOverrides,
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
  decision = DECISION,
  digest = null,
  outputOverrides = {},
  failing = new Set(),
  emitterScript = GATE_RESULT_SCRIPT,
}) {
  const workflow = loadWorkflow(workflowText);
  const job = workflow?.jobs?.[GATES[gateId].jobId];
  if (!job) throw new Error(`emitter-behaviour: blocker job for "${gateId}" is missing from the workflow`);
  // The digest is RECOMPUTED from the decision under test unless the caller is
  // deliberately supplying a mismatched one, so an honest scenario cannot drift
  // from its own evidence.
  const boundDigest = digest ?? applicabilityDigest(decision, IDENTITY);
  const needs = classifyNeedsFor(decision, boundDigest, outputOverrides);
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
function runAggregator(perGate, { forceJobResult = null, decision = DECISION, digest = null } = {}) {
  const env = {
    ...process.env,
    HEAD_SHA: IDENTITY.headSha,
    GITHUB_RUN_ID: IDENTITY.runId,
    GITHUB_RUN_ATTEMPT: IDENTITY.runAttempt,
    CLASSIFY_JOB_RESULT: 'success',
    CLASSIFIER_MATERIAL: decision.material,
    // The aggregator is handed the SAME canonical decision the blockers ran
    // under, and the digest that decision really produces — it recomputes it
    // independently anyway, so anything else would fail for the wrong reason.
    APPLICABILITY_JSON: JSON.stringify(decision),
    APPLICABILITY_DIGEST: digest ?? applicabilityDigest(decision, IDENTITY),
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

  // --- 0b. the baseline decision is a REAL classifier state ------------------
  check(
    'BASELINE: the real classifier marks every registered gate APPLICABLE for the baseline page change',
    GATE_IDS.every(
      (gateId) => DECISION.gates[gateId] === 'APPLICABLE' && DECISION.reasons[gateId] === 'relevant-path-changed',
    ),
    JSON.stringify(DECISION.gates),
  );
  check(
    'BASELINE: the baseline decision is classifier-reachable from its own changedPaths',
    isClassifierReachable(DECISION),
    JSON.stringify(DECISION.changedPaths),
  );

  // --- 1..5. THE PER-GATE BEHAVIOURAL MATRIX --------------------------------
  const successRuns = {};
  const buildFailureRuns = {};
  const inertRuns = {};
  const inertFixtures = {};
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

    // 2. HONEST NOT_APPLICABLE — produced by the REAL classifier (S2-04 R3).
    //
    // The change set is the exclusive surface of every OTHER registered gate;
    // the decision over it is computed by the real producer pipeline, which
    // marks THIS gate inert with the reason that justifies it; the digest is the
    // producer's own digest of that decision; the convenience outputs the step
    // conditions read are projections of it; the blocking steps are therefore
    // skipped by the workflow's own conditions; and the evidence the emitter
    // publishes carries that same applicability and that same digest. Nothing
    // here is asserted into existence — the only input is the change set.
    const inertFixture = inertFixtureFor(gateId);
    inertFixtures[gateId] = inertFixture;
    const { paths: inertPaths, decision: inertDecision, digest: inertDigest } = inertFixture;
    const inert = simulateBlocker({ gateId, decision: inertDecision });
    inertRuns[gateId] = inert;
    // NON-VACUITY of the fixture itself, before anything downstream is trusted.
    check(
      `"${gateId}": honest NOT_APPLICABLE — the change set is non-empty and holds ONLY other gates' exclusive surfaces`,
      inertPaths.length > 0 &&
        inertPaths.every((path) =>
          GATE_IDS.some((otherId) => otherId !== gateId && gateExclusiveSurface(otherId).includes(path)),
        ),
      JSON.stringify(inertPaths),
    );
    check(
      `"${gateId}": honest NOT_APPLICABLE — the gate's OWN workflow and script are NOT in the change set`,
      gateExclusiveSurface(gateId).every((own) => !inertPaths.includes(own)),
      JSON.stringify({ own: gateExclusiveSurface(gateId), paths: inertPaths }),
    );
    check(
      `"${gateId}": honest NOT_APPLICABLE — the REAL classifier itself marks this gate inert`,
      inertDecision.gates[gateId] === 'NOT_APPLICABLE' &&
        inertDecision.reasons[gateId] === 'only-gate-irrelevant-paths',
      JSON.stringify({ gates: inertDecision.gates, reasons: inertDecision.reasons }),
    );
    check(
      `"${gateId}": honest NOT_APPLICABLE — every OTHER registered gate stays APPLICABLE on its own changed surface`,
      GATE_IDS.filter((id) => id !== gateId).every(
        (id) => inertDecision.gates[id] === 'APPLICABLE' && inertDecision.reasons[id] === 'relevant-path-changed',
      ),
      JSON.stringify(inertDecision.gates),
    );
    check(
      `"${gateId}": honest NOT_APPLICABLE — the decision is CLASSIFIER-REACHABLE from its own changedPaths`,
      isClassifierReachable(inertDecision),
      JSON.stringify(inertDecision.changedPaths),
    );
    // The path choice is load-bearing: adding this gate's own surface to the
    // SAME change set flips the real classifier back to APPLICABLE, so a fixture
    // that touched the gate's own files could never have produced the inert
    // decision above.
    const flipped = computeApplicability({
      paths: [...inertPaths, ...gateExclusiveSurface(gateId)],
      identity: IDENTITY,
    }).decision;
    check(
      `"${gateId}": honest NOT_APPLICABLE — adding the gate's OWN surface flips the real classifier to APPLICABLE`,
      flipped.gates[gateId] === 'APPLICABLE' && flipped.reasons[gateId] === 'relevant-path-changed',
      JSON.stringify(flipped.gates),
    );
    check(
      `"${gateId}": honest NOT_APPLICABLE — the digest is the producer's own digest of that decision`,
      inertDigest === applicabilityDigest(inertDecision, IDENTITY) && inertDigest !== DIGEST,
      inertDigest,
    );
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
    // The EVIDENCE CHAIN matches the decision: the emitter published the exact
    // applicability the classifier decided, bound to the exact digest of it.
    const inertEvidence = JSON.parse(inert.outputs.evidence || 'null');
    check(
      `"${gateId}": honest NOT_APPLICABLE — the published evidence matches the decision and its digest`,
      inertEvidence?.gateId === gateId &&
        inertEvidence?.applicability === 'NOT_APPLICABLE' &&
        inertEvidence?.digest === inertDigest,
      JSON.stringify(inertEvidence),
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

  // --- 6b. THE HONEST INERT CHAIN IS ACCEPTED (S2-04 R2 / 5, R3) -------------
  //
  // One gate is inert BY THE REAL CLASSIFIER'S OWN DECISION over a real change
  // set; the other three are honest APPLICABLE runs of that SAME decision, so
  // the whole chain shares one digest. The aggregator — which recomputes that
  // digest from the decision and this run's identity — must accept it. This is
  // what makes NOT_APPLICABLE an evidential outcome rather than an asserted one,
  // and since R3 the decision is additionally classifier-reachable, so the
  // accepted chain is one the production classify job can actually emit.
  for (const gateId of GATE_IDS) {
    const { decision: inertDecision } = inertFixtures[gateId];
    const chain = { [gateId]: inertRuns[gateId] };
    for (const otherId of GATE_IDS) {
      if (otherId === gateId) continue;
      chain[otherId] = simulateBlocker({ gateId: otherId, decision: inertDecision });
      check(
        `INERT CHAIN ("${gateId}"): the other blocker "${otherId}" is an honest PASS under the same decision`,
        chain[otherId].publishedResult === 'PASS' && chain[otherId].conclusion === 'success',
        chain[otherId].publishedResult,
      );
    }
    const accepted = runAggregator(chain, { decision: inertDecision });
    check(
      `INERT CHAIN ("${gateId}"): the aggregator ACCEPTS an honest NOT_APPLICABLE backed by the decision`,
      accepted.status === 0,
      `${accepted.status} ${(accepted.stderr ?? '').slice(0, 300)}`,
    );

    // THE NEGATIVE. The decision and the digest stay APPLICABLE and honest; only
    // the convenience output this gate's steps read is tampered with. That is
    // precisely the shape the R1 "honest NOT_APPLICABLE" scenario had, so it is
    // stated here as what it really is: an attack, which must be REJECTED. The
    // blocker still goes green and still publishes NOT_APPLICABLE — nothing in
    // the job can tell — and the aggregator refuses it because the classifier's
    // canonical decision never said so.
    const tampered = simulateBlocker({
      gateId,
      decision: DECISION,
      outputOverrides: { [GATES[gateId].outputName]: 'NOT_APPLICABLE' },
    });
    check(
      `TAMPERED NOT_APPLICABLE ("${gateId}"): the blocker publishes NOT_APPLICABLE and goes GREEN`,
      tampered.publishedResult === 'NOT_APPLICABLE' && tampered.conclusion === 'success',
      `${tampered.publishedResult} ${tampered.conclusion}`,
    );
    check(
      `TAMPERED NOT_APPLICABLE ("${gateId}"): the canonical decision still says APPLICABLE`,
      DECISION.gates[gateId] === 'APPLICABLE',
    );
    const rejected = runAggregator({ ...successRuns, [gateId]: tampered });
    check(
      `TAMPERED NOT_APPLICABLE ("${gateId}"): the aggregator REJECTS it`,
      rejected.status !== 0,
      String(rejected.status),
    );
    check(
      `TAMPERED NOT_APPLICABLE ("${gateId}"): rejected for the RIGHT reason (the classifier decided otherwise)`,
      new RegExp(`blocker ${gateId} published NOT_APPLICABLE but the classifier decided`).test(
        `${rejected.stdout ?? ''}${rejected.stderr ?? ''}`,
      ),
      (rejected.stderr ?? '').slice(0, 300),
    );
  }

  // --- 6c. POSITIVE-FIXTURE MUTATION COVERAGE (S2-04 R3) ---------------------
  //
  // The R2 positive fixture was a hand-edited decision, and nothing failed. This
  // section makes every forbidden shortcut in the positive chain's construction
  // SEMANTICALLY observable, so the suite regresses loudly rather than silently:
  //
  //   * hand-editing decision.gates / bypassing classifyAllGates(): the exact R2
  //     shape fails the reachability predicate every honest fixture must pass;
  //   * recomputing a digest over the invented decision: the digest is
  //     self-consistent and the whole RUNTIME chain accepts it end to end, which
  //     is precisely why digest consistency is not evidence and reachability
  //     must be asserted in this suite;
  //   * choosing a path that really makes the gate APPLICABLE: the real
  //     classifier says so, and the positive assertions above would fail;
  //   * an empty change set: the classifier fails closed to APPLICABLE, so a
  //     degenerate fixture can never fabricate NOT_APPLICABLE;
  //   * omitting a registered gate: the coverage bookkeeping counts fixtures
  //     against the registry.
  for (const gateId of GATE_IDS) {
    const handEdited = handEditedDecisionWith(gateId, 'NOT_APPLICABLE');
    check(
      `FIXTURE MUTANT ("${gateId}"): the R2 hand-edited decision is NOT classifier-reachable`,
      !isClassifierReachable(handEdited),
      JSON.stringify(handEdited.changedPaths),
    );
    check(
      `FIXTURE MUTANT ("${gateId}"): the live classifier disagrees with the hand-edited gate value`,
      computeApplicability({ paths: [...handEdited.changedPaths], identity: IDENTITY }).decision.gates[gateId] ===
        'APPLICABLE',
    );
    // The runtime chain CANNOT catch the hand-edit: the blockers project their
    // conditions from the decision they are handed, the digest is recomputed
    // over that same decision, and the aggregator accepts the lot. Green here is
    // the proof that the reachability assertions above are load-bearing.
    const handEditedChain = {};
    for (const runId of GATE_IDS) handEditedChain[runId] = simulateBlocker({ gateId: runId, decision: handEdited });
    check(
      `FIXTURE MUTANT ("${gateId}"): the runtime chain ACCEPTS the hand-edited decision — only reachability tells it apart`,
      handEditedChain[gateId].publishedResult === 'NOT_APPLICABLE' &&
        runAggregator(handEditedChain, { decision: handEdited }).status === 0,
      handEditedChain[gateId].publishedResult,
    );
    // A fixture that touches the selected gate's own surface cannot produce the
    // positive scenario at all — the real classifier calls the gate APPLICABLE.
    const ownSurface = computeApplicability({
      paths: [...gateExclusiveSurface(gateId)],
      identity: IDENTITY,
    }).decision;
    check(
      `FIXTURE MUTANT ("${gateId}"): a change set of the gate's OWN surface classifies APPLICABLE`,
      ownSurface.gates[gateId] === 'APPLICABLE' && ownSurface.reasons[gateId] === 'relevant-path-changed',
      JSON.stringify(ownSurface.gates),
    );
  }
  // An EMPTY change set fails closed to APPLICABLE for every gate, so no
  // degenerate fixture can fabricate NOT_APPLICABLE.
  const emptyChangeSet = computeApplicability({ paths: [], identity: IDENTITY }).decision;
  check(
    'FIXTURE MUTANT (empty change set): the classifier fails closed to APPLICABLE for every registered gate',
    GATE_IDS.every(
      (gateId) =>
        emptyChangeSet.gates[gateId] === 'APPLICABLE' &&
        emptyChangeSet.reasons[gateId] === 'unresolved-or-empty-change-set',
    ),
    JSON.stringify(emptyChangeSet.gates),
  );
  // Omission coverage: one REAL classifier-produced inert fixture and one
  // executed inert run per registered gate, no more and no fewer.
  check(
    'FIXTURE COVERAGE: every registered gate has a classifier-produced inert fixture and an executed inert run',
    Object.keys(inertFixtures).sort().join(',') === [...GATE_IDS].join(',') &&
      Object.keys(inertRuns).sort().join(',') === [...GATE_IDS].join(',') &&
      GATE_IDS.every((gateId) => isClassifierReachable(inertFixtures[gateId].decision)),
    `fixtures=${Object.keys(inertFixtures).sort().join(',')} runs=${Object.keys(inertRuns).sort().join(',')}`,
  );

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
