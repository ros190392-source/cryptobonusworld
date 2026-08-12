#!/usr/bin/env node
// S2-03 PER-BLOCKER RESULT EMITTER for the unified master required gate
// (issue #366).
//
// Every blocker job in the DAG ends with this step, UNCONDITIONALLY. It converts
// "what actually happened in this job" into the closed machine-readable outcome
// vocabulary the aggregator consumes:
//
//     PASS               the gate was applicable and every blocking command ran
//                        and succeeded
//     NOT_APPLICABLE     the gate was proven irrelevant to this exact change set,
//                        and every blocking command is proven to have been skipped
//     FAIL               anything else
//
// WHY STEP OUTCOMES ARE INSPECTED, NOT ASSUMED. A blocker job whose heavy steps
// are gated on `needs.classify.outputs.gate_x == 'APPLICABLE'` reports SUCCESS
// when that expression silently resolves to the empty string — the exact
// fail-open shape the S2-01 validator exists to close, reproduced one level up.
// So this emitter is handed the OUTCOME of every blocking step and refuses to
// publish PASS unless each one is literally `success`, and refuses to publish
// NOT_APPLICABLE unless each one is literally `skipped`. A job cannot claim to
// have done work it skipped, and cannot claim irrelevance while having run.
//
// The APPLICABILITY it was launched under, and the DIGEST of the decision that
// applicability came from, are echoed into the job outputs as EVIDENCE. The
// aggregator requires that digest to match the classifier's own, so a blocker
// whose applicability came from anywhere other than this run's validated
// classifier cannot have its NOT_APPLICABLE accepted.
//
// This script runs in a job that deliberately does NOT `npm ci` when its gate is
// not applicable, so it must depend on node builtins only.

import { appendFileSync } from 'node:fs';
import { APPLICABILITY_VALUES, GATE_IDS, gateCommands } from './master-required-gate-gates.mjs';

// The literal GitHub step-outcome strings this emitter accepts, per applicability.
export const REQUIRED_OUTCOME_WHEN_APPLICABLE = 'success';
export const REQUIRED_OUTCOME_WHEN_NOT_APPLICABLE = 'skipped';

/**
 * Pure, exported so the contract test and the mutation suite can drive every
 * combination without a runner.
 *
 * @param {object} input
 * @param {string|undefined} input.gateId
 * @param {string|undefined} input.applicability the value the job was launched under
 * @param {string|undefined} input.digest the evidence token from the classifier
 * @param {{name: string, outcome: string|undefined}[]} input.stepOutcomes every blocking step
 * @returns {{result: string, errors: string[]}}
 */
export function evaluateGateResult({ gateId, applicability, digest, stepOutcomes }) {
  const errors = [];
  const fail = (message) => {
    errors.push(message);
    return { result: 'FAIL', errors };
  };

  if (!GATE_IDS.includes(gateId)) {
    return fail(`gate id ${JSON.stringify(gateId)} is not in the closed registry ${JSON.stringify([...GATE_IDS])}`);
  }
  if (!APPLICABILITY_VALUES.includes(applicability)) {
    return fail(
      `applicability ${JSON.stringify(applicability)} is not exactly one of ` +
        `${JSON.stringify([...APPLICABILITY_VALUES])} — a missing or renamed classifier output resolves to the ` +
        'empty string and must never be read as "not applicable"',
    );
  }
  if (typeof digest !== 'string' || digest.length === 0) {
    return fail(`applicability evidence digest is missing (received ${JSON.stringify(digest)})`);
  }
  if (!Array.isArray(stepOutcomes) || stepOutcomes.length === 0) {
    return fail('no blocking step outcomes were supplied — the job cannot prove what it did');
  }

  // The blocking command surface declared for this gate must be fully accounted
  // for. A step quietly deleted from the job is a reduction in blocking coverage,
  // so the emitter refuses to publish an outcome it cannot back.
  const declared = gateCommands(gateId).length;
  if (stepOutcomes.length !== declared) {
    return fail(
      `gate ${gateId} declares ${declared} blocking command(s) but ${stepOutcomes.length} step outcome(s) were ` +
        'supplied — the unified job no longer matches its declared blocking surface',
    );
  }

  const expected =
    applicability === 'APPLICABLE' ? REQUIRED_OUTCOME_WHEN_APPLICABLE : REQUIRED_OUTCOME_WHEN_NOT_APPLICABLE;
  for (const step of stepOutcomes) {
    const outcome = step?.outcome;
    if (typeof outcome !== 'string' || outcome.length === 0) {
      errors.push(`blocking step "${step?.name}" reported no outcome (received ${JSON.stringify(outcome)})`);
      continue;
    }
    if (outcome !== expected) {
      errors.push(
        `blocking step "${step?.name}" reported outcome ${JSON.stringify(outcome)} but applicability ` +
          `${applicability} requires ${JSON.stringify(expected)}`,
      );
    }
  }
  if (errors.length > 0) return { result: 'FAIL', errors };

  return { result: applicability === 'APPLICABLE' ? 'PASS' : 'NOT_APPLICABLE', errors };
}

function main() {
  const gateId = process.env.GATE_ID;
  const applicability = process.env.GATE_APPLICABILITY;
  const digest = process.env.APPLICABILITY_DIGEST;

  // Step outcomes arrive as a JSON array of {name, outcome}. It is built in the
  // workflow from `steps.<id>.outcome` expressions, one per declared blocking
  // command, so a deleted step becomes a missing entry rather than a silent pass.
  let stepOutcomes = null;
  const errors = [];
  try {
    stepOutcomes = JSON.parse(process.env.STEP_OUTCOMES ?? 'null');
  } catch {
    errors.push('STEP_OUTCOMES is not valid JSON');
  }

  const evaluation = evaluateGateResult({ gateId, applicability, digest, stepOutcomes });
  errors.push(...evaluation.errors);

  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) {
    console.error('master-required-gate: GITHUB_OUTPUT is not set');
    process.exit(1);
  }
  // The outcome is ALWAYS published, including FAIL. The aggregator rejects FAIL,
  // but publishing it means the aggregator sees a named, closed-vocabulary
  // failure instead of an absent output it would have to interpret.
  appendFileSync(
    outputFile,
    `result=${evaluation.result}\nevidence=${JSON.stringify({ gateId, applicability, digest })}\n`,
  );

  if (errors.length > 0 || evaluation.result === 'FAIL') {
    console.error(`CBW MASTER REQUIRED GATE: blocker "${gateId}" result FAIL — failing closed`);
    for (const error of errors) console.error(` - ${error}`);
    process.exit(1);
  }

  console.log(
    `CBW MASTER REQUIRED GATE: blocker "${gateId}" result=${evaluation.result} ` +
      `applicability=${applicability} digest=${digest}`,
  );
}

if (process.argv[1]?.endsWith('master-required-gate-gate-result.mjs')) main();
