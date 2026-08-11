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
// unknown reason, a missing producer sidecar, or a sidecar that disagrees with
// the step output (which is what a renamed producer id looks like).

import { readFileSync, existsSync } from 'node:fs';
import { classifierResultFilePath, VALID_REASONS } from './master-required-gate-classify.mjs';

// Pure, exported so the contract test can drive it with hostile inputs.
// `material` / `reason` are the RAW env values; `sidecarRaw` is the sidecar
// file contents or null when it is absent.
export function validateClassifierOutput({ material, reason, sidecarRaw }) {
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

  // 3. the producer sidecar must exist and agree — this is the producer/consumer
  //    binding. A renamed producer id yields empty step outputs beside a
  //    populated sidecar; a removed producer yields no sidecar at all.
  if (typeof sidecarRaw !== 'string' || sidecarRaw.length === 0) {
    errors.push('classifier result sidecar is missing — the producer step did not run');
  } else {
    let sidecar = null;
    try {
      sidecar = JSON.parse(sidecarRaw);
    } catch {
      errors.push('classifier result sidecar is not valid JSON');
    }
    if (sidecar !== null) {
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
    }
  }

  return errors;
}

function main() {
  // Read raw. An unset env var is `undefined`; GitHub sets an empty string when
  // the expression resolves to nothing. Both are rejected above.
  const material = process.env.CLASSIFIER_MATERIAL;
  const reason = process.env.CLASSIFIER_REASON;
  const sidecarPath = classifierResultFilePath();
  const sidecarRaw = existsSync(sidecarPath) ? readFileSync(sidecarPath, 'utf8') : null;

  const errors = validateClassifierOutput({ material, reason, sidecarRaw });

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
