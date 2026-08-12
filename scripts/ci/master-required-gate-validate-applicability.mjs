#!/usr/bin/env node
// UNCONDITIONAL runtime validator for the S2-03 applicability producer
// (issue #366).
//
// WHY THIS STEP EXISTS — exactly the reason its S2-01 sibling exists. A step
// output reference for a step that does not exist, was renamed, or never emitted
// resolves to the EMPTY STRING. `'' == 'APPLICABLE'` is false, so every blocker's
// heavy steps would SKIP while each blocker job — and therefore the final
// aggregator — still reported SUCCESS. Deleting the applicability producer would
// turn the whole matrix green.
//
// This step therefore runs with NO `if` at all, and the workflow contract asserts
// that it is unconditional, that it sits immediately after the producer, and that
// it precedes every consumer.
//
// It fails closed on: a missing/empty/malformed decision, a decision outside the
// closed applicability vocabulary, a contradictory (applicability, reason) pair,
// a per-gate convenience output that disagrees with the authoritative decision, a
// gate set that is not exactly the registry's, a missing/unusable RUNNER_TEMP, a
// missing or malformed producer sidecar, a sidecar that disagrees with the step
// outputs, a STALE sidecar, a digest that does not reproduce from the decision it
// claims to summarise, and any inconsistency with the S2-01 materiality
// classification of the same diff.

import { readFileSync, existsSync } from 'node:fs';
import { resolveRunIdentity, RUN_IDENTITY_ENV } from './master-required-gate-classify.mjs';
import {
  APPLICABILITY_VALUES,
  GATE_IDS,
  GATES,
  applicabilityDigest,
  applicabilityResultFilePath,
  checkApplicabilityMaterialityConsistency,
  isConsistentApplicability,
} from './master-required-gate-gates.mjs';

function describeJsonValue(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  return `a ${typeof value}`;
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Pure, exported so the contract test and the mutation suite can drive it with
 * hostile inputs.
 *
 * @param {object} input
 * @param {string|undefined} input.applicabilityRaw the `applicability` step output
 * @param {string|undefined} input.digest the `digest` step output
 * @param {Record<string,string|undefined>} input.gateOutputs per-gate convenience outputs
 * @param {string|undefined} input.material the S2-01 materiality step output
 * @param {string|null} input.sidecarRaw producer sidecar contents, or null
 * @param {object|null} input.identity THIS run's identity, resolved by the validator
 * @returns {string[]} errors; empty means valid
 */
export function validateApplicabilityOutput({
  applicabilityRaw,
  digest,
  gateOutputs,
  material,
  sidecarRaw,
  identity,
}) {
  const errors = [];

  // 1. this run must be identifiable, or no sidecar can be proven fresh.
  const expectedIdentity = isPlainObject(identity) ? identity : null;
  if (expectedIdentity === null) {
    errors.push('gate run identity is missing — the applicability sidecar cannot be proven fresh');
  } else {
    for (const [field, envName] of [
      ['headSha', RUN_IDENTITY_ENV[0]],
      ['runId', RUN_IDENTITY_ENV[1]],
      ['runAttempt', RUN_IDENTITY_ENV[2]],
    ]) {
      if (typeof expectedIdentity[field] !== 'string' || expectedIdentity[field].length === 0) {
        errors.push(`gate run identity field ${field} (${envName}) is missing or empty`);
      }
    }
  }

  // 2. the decision must be present and a real JSON object. Parse success and the
  //    parsed value are tracked as SEPARATE facts — a literal `null` parses
  //    successfully and must not route around every check below.
  if (typeof applicabilityRaw !== 'string' || applicabilityRaw.length === 0) {
    errors.push(
      `applicability output is missing (received ${JSON.stringify(applicabilityRaw)}) — the producer step did not run`,
    );
    return errors;
  }
  let parsed;
  let parseOk = false;
  try {
    parsed = JSON.parse(applicabilityRaw);
    parseOk = true;
  } catch {
    errors.push('applicability output is not valid JSON');
  }
  if (!parseOk) return errors;
  if (!isPlainObject(parsed)) {
    errors.push(`applicability output must be a JSON object, got ${describeJsonValue(parsed)}`);
    return errors;
  }
  if (!isPlainObject(parsed.gates) || !isPlainObject(parsed.reasons)) {
    errors.push('applicability output must carry `gates` and `reasons` objects');
    return errors;
  }

  // 3. the gate set must be EXACTLY the registry's. A gate quietly dropped from
  //    the decision would otherwise be aggregated as "not expected" and vanish.
  const decidedGates = Object.keys(parsed.gates).sort();
  if (JSON.stringify(decidedGates) !== JSON.stringify([...GATE_IDS])) {
    errors.push(
      `applicability decision covers ${JSON.stringify(decidedGates)} but the registry declares ` +
        `${JSON.stringify([...GATE_IDS])}`,
    );
  }
  const decidedReasons = Object.keys(parsed.reasons).sort();
  if (JSON.stringify(decidedReasons) !== JSON.stringify([...GATE_IDS])) {
    errors.push(
      `applicability reasons cover ${JSON.stringify(decidedReasons)} but the registry declares ` +
        `${JSON.stringify([...GATE_IDS])}`,
    );
  }

  // 4. every value is drawn from the closed vocabulary and every PAIR is
  //    semantically possible.
  for (const gateId of GATE_IDS) {
    const value = parsed.gates[gateId];
    const reason = parsed.reasons[gateId];
    if (!APPLICABILITY_VALUES.includes(value)) {
      errors.push(
        `gate ${gateId} applicability must be exactly one of ${JSON.stringify([...APPLICABILITY_VALUES])}, ` +
          `got ${JSON.stringify(value)}`,
      );
      continue;
    }
    if (!isConsistentApplicability(value, reason)) {
      errors.push(
        `gate ${gateId} applicability ${JSON.stringify(value)} contradicts its reason ${JSON.stringify(reason)}`,
      );
    }
    // 5. the per-gate convenience output the `if` expressions actually read must
    //    match the authoritative decision byte for byte. An empty value here is
    //    a deleted/renamed producer.
    const emitted = gateOutputs?.[GATES[gateId].outputName];
    if (emitted !== value) {
      errors.push(
        `gate ${gateId} step output ${GATES[gateId].outputName}=${JSON.stringify(emitted)} disagrees with ` +
          `the authoritative decision ${JSON.stringify(value)}`,
      );
    }
  }

  // 6. consistency with the S2-01 materiality classification of the SAME diff.
  if (typeof material !== 'string' || (material !== 'true' && material !== 'false')) {
    errors.push(`materiality output must be exactly "true" or "false", got ${JSON.stringify(material)}`);
  } else if (parsed.material !== material) {
    errors.push(
      `applicability decision recorded material=${JSON.stringify(parsed.material)} but the materiality ` +
        `producer emitted ${JSON.stringify(material)} — the two producers saw different change sets`,
    );
  }
  errors.push(
    ...checkApplicabilityMaterialityConsistency({
      gates: parsed.gates,
      reasons: parsed.reasons,
      material: String(parsed.material),
    }),
  );

  // 7. the digest must REPRODUCE from the decision it claims to summarise. This
  //    is what makes the evidence token meaningful downstream: a blocker echoing
  //    a digest is echoing a value nobody could have computed from a different
  //    decision or a different run.
  const recomputed = expectedIdentity === null ? null : applicabilityDigest(parsed, expectedIdentity);
  if (typeof digest !== 'string' || digest.length === 0) {
    errors.push(`applicability digest output is missing (received ${JSON.stringify(digest)})`);
  } else if (recomputed !== null && digest !== recomputed) {
    errors.push(
      `applicability digest ${JSON.stringify(digest)} does not reproduce from the emitted decision ` +
        `(expected ${JSON.stringify(recomputed)})`,
    );
  }

  // 8. the producer sidecar must exist, agree, and name THIS run.
  if (typeof sidecarRaw !== 'string' || sidecarRaw.length === 0) {
    errors.push('applicability sidecar is missing — the producer step did not run');
    return errors;
  }
  let sidecarParsed;
  let sidecarParseOk = false;
  try {
    sidecarParsed = JSON.parse(sidecarRaw);
    sidecarParseOk = true;
  } catch {
    errors.push('applicability sidecar is not valid JSON');
  }
  if (!sidecarParseOk) return errors;
  if (!isPlainObject(sidecarParsed)) {
    errors.push(`applicability sidecar must be a JSON object, got ${describeJsonValue(sidecarParsed)}`);
    return errors;
  }
  const sidecar = sidecarParsed;
  if (!isPlainObject(sidecar.gates)) {
    errors.push('applicability sidecar must carry a `gates` object');
  } else {
    for (const gateId of GATE_IDS) {
      if (sidecar.gates[gateId] !== parsed.gates[gateId]) {
        errors.push(
          `gate ${gateId} step output ${JSON.stringify(parsed.gates[gateId])} disagrees with the producer ` +
            `sidecar ${JSON.stringify(sidecar.gates[gateId])} — the consumer is not wired to the producer`,
        );
      }
    }
  }
  if (sidecar.digest !== digest) {
    errors.push(
      `applicability sidecar digest ${JSON.stringify(sidecar.digest)} disagrees with the step output ` +
        `${JSON.stringify(digest)}`,
    );
  }
  if (expectedIdentity !== null) {
    for (const [field, envName] of [
      ['headSha', RUN_IDENTITY_ENV[0]],
      ['runId', RUN_IDENTITY_ENV[1]],
      ['runAttempt', RUN_IDENTITY_ENV[2]],
    ]) {
      if (sidecar[field] !== expectedIdentity[field]) {
        errors.push(
          `applicability sidecar is STALE: ${field}=${JSON.stringify(sidecar[field])} does not match this ` +
            `run's ${envName}=${JSON.stringify(expectedIdentity[field])}`,
        );
      }
    }
  }

  return errors;
}

function main() {
  const applicabilityRaw = process.env.APPLICABILITY_JSON;
  const digest = process.env.APPLICABILITY_DIGEST;
  const material = process.env.CLASSIFIER_MATERIAL;
  const gateOutputs = {};
  for (const gateId of GATE_IDS) {
    gateOutputs[GATES[gateId].outputName] = process.env[GATES[gateId].applicabilityEnv];
  }

  let sidecarRaw = null;
  let identity = null;
  const errors = [];
  try {
    const sidecarPath = applicabilityResultFilePath();
    sidecarRaw = existsSync(sidecarPath) ? readFileSync(sidecarPath, 'utf8') : null;
  } catch (error) {
    errors.push(String(error.message));
  }
  try {
    identity = resolveRunIdentity();
  } catch (error) {
    errors.push(String(error.message));
  }

  errors.push(
    ...validateApplicabilityOutput({ applicabilityRaw, digest, gateOutputs, material, sidecarRaw, identity }),
  );

  if (errors.length > 0) {
    console.error('CBW MASTER REQUIRED GATE: applicability output INVALID — failing closed');
    for (const error of errors) console.error(` - ${error}`);
    console.error(
      'Every blocker job is conditional on this decision; an invalid decision must fail the gate rather ' +
        'than silently skip blocking work.',
    );
    process.exit(1);
  }

  console.log(`CBW MASTER REQUIRED GATE: applicability output VALID (digest=${digest})`);
}

if (process.argv[1]?.endsWith('master-required-gate-validate-applicability.mjs')) main();
