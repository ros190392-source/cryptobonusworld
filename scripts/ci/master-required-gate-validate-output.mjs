#!/usr/bin/env node
// UNCONDITIONAL runtime validator for the master required gate classifier
// output (issue #366).
//
// WHY THIS STEP EXISTS — `if: steps.classify.outputs.material == 'true'` is
// fail-OPEN on its own. A GitHub Actions step-output reference for a step that
// does not exist, was renamed, or never emitted, evaluates to the empty string.
// `'' == 'true'` is false, so every heavy step (production build, header
// matrix, indexability) SKIPS while the job — and therefore the required check
// context — still reports SUCCESS. Deleting the classifier step would turn the
// gate green.
//
// This step therefore runs with NO `if` at all. It is the only thing standing
// between "the producer vanished" and "the gate passed", so the contract test
// asserts it is unconditional, that it sits immediately after the producer, and
// that it precedes every conditional step.
//
// It fails closed on: missing output, empty output, whitespace-padded output
// (`true `), wrong casing (`True`), any non-boolean token (`yes`, `1`), an
// unknown reason, a missing/empty/unusable RUNNER_TEMP, a missing producer
// sidecar, a malformed sidecar, a sidecar that disagrees with the step output
// (which is what a renamed producer id looks like), or a STALE sidecar left by
// an earlier run, re-run attempt or PR head.

import { readFileSync, existsSync } from 'node:fs';
import {
  classifierResultFilePath,
  isConsistentClassification,
  resolveRunIdentity,
  REASON_MATERIALITY,
  RUN_IDENTITY_ENV,
  VALID_REASONS,
} from './master-required-gate-classify.mjs';

// Describes any JSON value for an error message without trusting its shape.
function describeJsonValue(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  return `a ${typeof value}`;
}

// Pure, exported so the contract test can drive it with hostile inputs.
// `material` / `reason` are the RAW env values; `sidecarRaw` is the sidecar
// file contents or null when it is absent; `identity` is this run's identity as
// resolved by the VALIDATOR from its own environment — never a value read out
// of the sidecar, which would let the sidecar vouch for itself.
export function validateClassifierOutput({ material, reason, sidecarRaw, identity }) {
  const errors = [];

  // 1. material must be present and EXACTLY one of two byte sequences.
  //    No trim, no toLowerCase — a padded value means something is wrong
  //    upstream and must not be normalized into a pass.
  if (typeof material !== 'string') {
    errors.push(`material output is missing (received ${JSON.stringify(material)})`);
  } else if (material !== 'true' && material !== 'false') {
    errors.push(`material output must be exactly "true" or "false", got ${JSON.stringify(material)}`);
  }

  // 2. reason must be present and drawn from the closed producer vocabulary.
  if (typeof reason !== 'string') {
    errors.push(`reason output is missing (received ${JSON.stringify(reason)})`);
  } else if (!VALID_REASONS.includes(reason)) {
    errors.push(`reason output is not a known classifier reason, got ${JSON.stringify(reason)}`);
  }

  // 2b. the PAIR must be semantically possible. Validating each field against
  //     its own vocabulary is not enough: every contradictory cross-product
  //     passed that way, including `material=false reason=material-path-changed`
  //     — a MATERIAL change reported as non-material, which skips every heavy
  //     step under a SUCCESS conclusion. A reason pins its materiality.
  if (
    typeof material === 'string' &&
    typeof reason === 'string' &&
    (material === 'true' || material === 'false') &&
    VALID_REASONS.includes(reason) &&
    !isConsistentClassification(material, reason)
  ) {
    errors.push(
      `step output material=${JSON.stringify(material)} contradicts reason ${JSON.stringify(reason)}, ` +
        `which implies material=${JSON.stringify(String(REASON_MATERIALITY[reason]))}`,
    );
  }

  // 3. this run must be identifiable, or "the sidecar belongs to this run" is
  //    unprovable and the sidecar must not be trusted at all.
  const expectedIdentity =
    identity && typeof identity === 'object' && !Array.isArray(identity) ? identity : null;
  if (expectedIdentity === null) {
    errors.push('gate run identity is missing — the sidecar cannot be proven fresh');
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

  // 4. the producer sidecar must exist and agree — this is the producer/consumer
  //    binding. A renamed producer id yields empty step outputs beside a
  //    populated sidecar; a removed producer yields no sidecar at all.
  if (typeof sidecarRaw !== 'string' || sidecarRaw.length === 0) {
    errors.push('classifier result sidecar is missing — the producer step did not run');
  } else {
    // PARSE SUCCESS AND PARSED VALUE ARE SEPARATE FACTS — reviewed MEDIUM.
    // `sidecar` was initialised to null and also used as the parse-failure
    // sentinel, so a sidecar containing the four bytes `null` parsed
    // SUCCESSFULLY to null, hit the `sidecar !== null` guard, and skipped every
    // classification, agreement and staleness check below. With otherwise valid
    // step outputs the error list stayed empty and the gate PASSED with a
    // sidecar that asserted nothing. `parsed` is now never conflated with
    // `parseOk`, and the parsed value must be a non-null, non-array object
    // before any field is read — so no JSON shape can route around the checks.
    let parsed;
    let parseOk = false;
    try {
      parsed = JSON.parse(sidecarRaw);
      parseOk = true;
    } catch {
      errors.push('classifier result sidecar is not valid JSON');
    }
    if (parseOk && (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) {
      errors.push(
        `classifier result sidecar must be a JSON object, got ${describeJsonValue(parsed)}`,
      );
    } else if (parseOk) {
      const sidecar = parsed;
      if (typeof sidecar.material !== 'boolean') {
        errors.push(`sidecar material must be a boolean, got ${JSON.stringify(sidecar.material)}`);
      } else if (String(sidecar.material) !== material) {
        errors.push(
          `step output material=${JSON.stringify(material)} disagrees with producer sidecar ` +
            `material=${JSON.stringify(String(sidecar.material))} — the consumer is not wired to the producer`,
        );
      }
      if (sidecar.reason !== reason) {
        errors.push(
          `step output reason=${JSON.stringify(reason)} disagrees with producer sidecar ` +
            `reason=${JSON.stringify(sidecar.reason)}`,
        );
      }

      // The sidecar's OWN pair must be consistent too. Checking only the step
      // outputs would let a contradictory sidecar through whenever the outputs
      // were made to agree with it.
      if (typeof sidecar.material === 'boolean') {
        if (!isConsistentClassification(String(sidecar.material), sidecar.reason)) {
          errors.push(
            `producer sidecar material=${JSON.stringify(sidecar.material)} contradicts its own ` +
              `reason=${JSON.stringify(sidecar.reason)}`,
          );
        }
      }

      // STALENESS. The sidecar must name THIS gate run. A file left in
      // RUNNER_TEMP by an earlier run, an earlier re-run attempt of this run, or
      // a run against a different PR head can otherwise satisfy every check
      // above by coincidence — it carries a well-formed classification that
      // happens to agree with the step outputs — while the producer for this run
      // never executed.
      if (expectedIdentity !== null) {
        for (const [field, envName] of [
          ['headSha', RUN_IDENTITY_ENV[0]],
          ['runId', RUN_IDENTITY_ENV[1]],
          ['runAttempt', RUN_IDENTITY_ENV[2]],
        ]) {
          if (sidecar[field] !== expectedIdentity[field]) {
            errors.push(
              `producer sidecar is STALE: ${field}=${JSON.stringify(sidecar[field])} does not match ` +
                `this run's ${envName}=${JSON.stringify(expectedIdentity[field])}`,
            );
          }
        }
      }
    }
  }

  return errors;
}

function main() {
  // Read raw. An unset env var is `undefined`; GitHub sets an empty string when
  // the expression resolves to nothing. Both are rejected above.
  const material = process.env.CLASSIFIER_MATERIAL;
  const reason = process.env.CLASSIFIER_REASON;

  // Resolving the sidecar path or this run's identity THROWS when RUNNER_TEMP is
  // missing/empty/unusable or the run cannot be identified. Those are hard
  // fail-closed conditions, not "no sidecar found": there is deliberately no
  // process-global temp fallback to degrade into, so they are reported as
  // validation errors and the gate fails.
  let sidecarRaw = null;
  let identity = null;
  const errors = [];
  try {
    const sidecarPath = classifierResultFilePath();
    sidecarRaw = existsSync(sidecarPath) ? readFileSync(sidecarPath, 'utf8') : null;
  } catch (error) {
    errors.push(String(error.message));
  }
  try {
    identity = resolveRunIdentity();
  } catch (error) {
    errors.push(String(error.message));
  }

  errors.push(...validateClassifierOutput({ material, reason, sidecarRaw, identity }));

  if (errors.length > 0) {
    console.error('CBW MASTER REQUIRED GATE: classifier output INVALID — failing closed');
    for (const error of errors) console.error(` - ${error}`);
    console.error(
      'The heavy gate steps are conditional on this output; an invalid output must fail the ' +
        'gate rather than silently skip them.',
    );
    process.exit(1);
  }

  console.log(
    `CBW MASTER REQUIRED GATE: classifier output VALID (material=${material} reason=${reason})`,
  );
}

if (process.argv[1]?.endsWith('master-required-gate-validate-output.mjs')) main();
