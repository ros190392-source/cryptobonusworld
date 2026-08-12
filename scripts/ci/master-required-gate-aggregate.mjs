#!/usr/bin/env node
// S2-03 FINAL AGGREGATOR for the unified master required gate (issue #366).
//
// This is the body of the ONE job whose visible check context is exactly
// "Master required gate" — the single stable context branch protection may ever
// name. The job carries `if: always()` so the context is reported on every pull
// request to master no matter what happened upstream, and this script decides
// the conclusion.
//
// THE AGGREGATION IS FAIL-CLOSED BY CONSTRUCTION. It succeeds ONLY when every
// expected blocker is provably PASS or provably, evidentially NOT_APPLICABLE.
// Every other state is a failure, including states that look like nothing
// happened:
//
//   * classifier job failed, was cancelled, or was skipped
//   * classifier emitted an invalid / missing / unparseable applicability decision
//   * a blocker job failed
//   * a blocker job was cancelled
//   * a blocker job was SKIPPED (never accepted as success — see below)
//   * a blocker job result is missing, empty, or outside the closed vocabulary
//   * a blocker published FAIL
//   * a blocker's NOT_APPLICABLE is not backed by the classifier's own decision
//   * a blocker's evidence digest does not match the classifier's digest
//   * a blocker declared in the registry has no result at all (a `needs` entry or
//     a whole job was removed)
//   * a result arrives for a gate the registry does not declare
//   * the materiality/applicability contract is internally inconsistent
//
// NO IMPLICIT "SKIPPED = PASS". This is the single most important rule in the
// file. GitHub reports `skipped` for an upstream failure, for a cancelled run,
// and for a job-level `if` that evaluated to the empty string because the
// expression it referenced no longer exists. All three are indistinguishable
// from outside, and all three would silently remove blocking coverage. A blocker
// that does not need to do work must still INSTANTIATE and publish
// NOT_APPLICABLE with evidence; `skipped` proves nothing and is rejected.
//
// This job deliberately does not run `npm ci` — it must be able to report even
// when dependency installation is what broke — so this script depends on node
// builtins only.

import {
  ACCEPTED_GATE_OUTCOMES,
  APPLICABILITY_VALUES,
  GATES,
  GATE_IDS,
  GATE_OUTCOMES,
  checkApplicabilityMaterialityConsistency,
} from './master-required-gate-gates.mjs';

// The ONLY job result that means "this job ran to completion successfully".
export const REQUIRED_JOB_RESULT = 'success';

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Pure, exported so the contract test and the mutation suite can drive the whole
 * fail-closed matrix without a runner.
 *
 * @param {object} input
 * @param {string|undefined} input.classifyResult `needs.classify.result`
 * @param {string|undefined} input.material `needs.classify.outputs.material`
 * @param {string|undefined} input.applicabilityRaw `needs.classify.outputs.applicability`
 * @param {string|undefined} input.digest `needs.classify.outputs.digest`
 * @param {Record<string, {jobResult: string|undefined, result: string|undefined, evidence: string|undefined}>} input.gates
 * @returns {{ok: boolean, errors: string[], summary: {gateId: string, jobResult: string, result: string}[]}}
 */
export function aggregate({ classifyResult, material, applicabilityRaw, digest, gates }) {
  const errors = [];
  const summary = [];

  // --- 1. the classifier itself ----------------------------------------------
  // A classifier that failed, was cancelled or was skipped cannot be hidden: its
  // job result is checked FIRST and independently of anything it did or did not
  // emit, so an aggregator run whose upstream never produced anything still fails
  // for the right reason.
  if (classifyResult !== REQUIRED_JOB_RESULT) {
    errors.push(
      `classifier job result is ${JSON.stringify(classifyResult)}, not ${JSON.stringify(REQUIRED_JOB_RESULT)} — ` +
        'a failed, cancelled, skipped or missing classifier can never be treated as a pass',
    );
  }

  // --- 2. the classifier decision --------------------------------------------
  let decision = null;
  if (typeof applicabilityRaw !== 'string' || applicabilityRaw.length === 0) {
    errors.push(
      `classifier applicability output is missing (received ${JSON.stringify(applicabilityRaw)}) — ` +
        'the aggregator cannot validate any NOT_APPLICABLE claim without it',
    );
  } else {
    let parsed;
    let parseOk = false;
    try {
      parsed = JSON.parse(applicabilityRaw);
      parseOk = true;
    } catch {
      errors.push('classifier applicability output is not valid JSON');
    }
    if (parseOk && !isPlainObject(parsed)) {
      errors.push('classifier applicability output must be a JSON object');
    } else if (parseOk && (!isPlainObject(parsed.gates) || !isPlainObject(parsed.reasons))) {
      errors.push('classifier applicability output must carry `gates` and `reasons` objects');
    } else if (parseOk) {
      decision = parsed;
      const decided = Object.keys(parsed.gates).sort();
      if (JSON.stringify(decided) !== JSON.stringify([...GATE_IDS])) {
        errors.push(
          `classifier decided applicability for ${JSON.stringify(decided)} but the registry declares ` +
            `${JSON.stringify([...GATE_IDS])}`,
        );
      }
      if (parsed.material !== material) {
        errors.push(
          `classifier applicability recorded material=${JSON.stringify(parsed.material)} but the materiality ` +
            `output is ${JSON.stringify(material)}`,
        );
      }
      errors.push(
        ...checkApplicabilityMaterialityConsistency({
          gates: parsed.gates,
          reasons: parsed.reasons,
          material: String(parsed.material),
        }),
      );
    }
  }
  if (typeof digest !== 'string' || digest.length === 0) {
    errors.push(`classifier applicability digest is missing (received ${JSON.stringify(digest)})`);
  }

  // --- 3. no result may arrive for a gate the registry does not declare -------
  for (const gateId of Object.keys(gates ?? {})) {
    if (!GATE_IDS.includes(gateId)) {
      errors.push(`a result arrived for unregistered gate ${JSON.stringify(gateId)}`);
    }
  }

  // --- 4. EVERY expected blocker, one at a time -------------------------------
  for (const gateId of GATE_IDS) {
    const observed = gates?.[gateId];
    if (!isPlainObject(observed)) {
      errors.push(
        `expected blocker ${gateId} produced NO result at all — its job or its \`needs\` edge is missing from ` +
          'the aggregator, which would remove its blocking coverage entirely',
      );
      summary.push({ gateId, jobResult: '<missing>', result: '<missing>' });
      continue;
    }
    const jobResult = observed.jobResult;
    const result = observed.result;
    summary.push({ gateId, jobResult: String(jobResult), result: String(result) });

    if (jobResult !== REQUIRED_JOB_RESULT) {
      errors.push(
        `blocker ${gateId} job result is ${JSON.stringify(jobResult)}, not ` +
          `${JSON.stringify(REQUIRED_JOB_RESULT)} — failed, cancelled and skipped are all rejected; a blocker ` +
          'that need not work must still instantiate and publish NOT_APPLICABLE with evidence',
      );
      continue;
    }

    if (typeof result !== 'string' || result.length === 0) {
      errors.push(
        `blocker ${gateId} published NO result (received ${JSON.stringify(result)}) — an absent output resolves ` +
          'to the empty string and must never be read as success',
      );
      continue;
    }
    if (!GATE_OUTCOMES.includes(result)) {
      errors.push(
        `blocker ${gateId} published ${JSON.stringify(result)}, which is outside the closed outcome vocabulary ` +
          `${JSON.stringify([...GATE_OUTCOMES])}`,
      );
      continue;
    }
    if (!ACCEPTED_GATE_OUTCOMES.includes(result)) {
      errors.push(
        `blocker ${gateId} published ${JSON.stringify(result)}; the aggregator accepts only ` +
          `${JSON.stringify([...ACCEPTED_GATE_OUTCOMES])}`,
      );
      continue;
    }

    // --- 5. the evidence behind the published outcome ------------------------
    let evidence = null;
    try {
      evidence = JSON.parse(observed.evidence ?? 'null');
    } catch {
      errors.push(`blocker ${gateId} evidence is not valid JSON`);
      continue;
    }
    if (!isPlainObject(evidence)) {
      errors.push(`blocker ${gateId} published no evidence object`);
      continue;
    }
    if (evidence.gateId !== gateId) {
      errors.push(
        `blocker ${gateId} evidence names gate ${JSON.stringify(evidence.gateId)} — a blocker's result cannot ` +
          'stand in for another gate',
      );
    }
    if (!APPLICABILITY_VALUES.includes(evidence.applicability)) {
      errors.push(
        `blocker ${gateId} evidence applicability ${JSON.stringify(evidence.applicability)} is outside the ` +
          'closed vocabulary',
      );
      continue;
    }
    // The evidence must come from THIS run's validated classifier decision. A
    // digest mismatch means the blocker acted on a decision the aggregator is not
    // looking at — stale, re-run, or hand-edited.
    if (evidence.digest !== digest) {
      errors.push(
        `blocker ${gateId} evidence digest ${JSON.stringify(evidence.digest)} does not match the classifier ` +
          `digest ${JSON.stringify(digest)} — its applicability came from a different decision`,
      );
    }

    const decided = decision?.gates?.[gateId];
    if (decided === undefined) {
      errors.push(`the classifier made no applicability decision for blocker ${gateId}`);
      continue;
    }
    if (evidence.applicability !== decided) {
      errors.push(
        `blocker ${gateId} ran under applicability ${JSON.stringify(evidence.applicability)} but the classifier ` +
          `decided ${JSON.stringify(decided)}`,
      );
    }
    // The published outcome and the classifier's decision must agree. This is
    // what makes NOT_APPLICABLE evidential rather than asserted: it is accepted
    // ONLY when the classifier independently proved, from the exact changed-file
    // set, that this gate is irrelevant.
    if (result === 'NOT_APPLICABLE' && decided !== 'NOT_APPLICABLE') {
      errors.push(
        `blocker ${gateId} published NOT_APPLICABLE but the classifier decided ${JSON.stringify(decided)} — ` +
          'NOT_APPLICABLE must be justified by exact changed-file classification',
      );
    }
    if (result === 'PASS' && decided !== 'APPLICABLE') {
      errors.push(
        `blocker ${gateId} published PASS but the classifier decided ${JSON.stringify(decided)} — a gate that ` +
          'was never applicable cannot claim to have passed its blocking work',
      );
    }
  }

  return { ok: errors.length === 0, errors, summary };
}

function main() {
  const gates = {};
  for (const gateId of GATE_IDS) {
    const gate = GATES[gateId];
    gates[gateId] = {
      jobResult: process.env[gate.jobResultEnv],
      result: process.env[gate.resultEnv],
      evidence: process.env[gate.evidenceEnv],
    };
  }

  const outcome = aggregate({
    classifyResult: process.env.CLASSIFY_JOB_RESULT,
    material: process.env.CLASSIFIER_MATERIAL,
    applicabilityRaw: process.env.APPLICABILITY_JSON,
    digest: process.env.APPLICABILITY_DIGEST,
    gates,
  });

  console.log('CBW MASTER REQUIRED GATE — aggregation');
  console.log(` classifier job result: ${process.env.CLASSIFY_JOB_RESULT}`);
  for (const row of outcome.summary) {
    console.log(` blocker ${row.gateId}: job=${row.jobResult} result=${row.result}`);
  }

  if (!outcome.ok) {
    console.error('CBW MASTER REQUIRED GATE: FAIL — failing closed');
    for (const error of outcome.errors) console.error(` - ${error}`);
    process.exit(1);
  }

  console.log(
    `CBW MASTER REQUIRED GATE: PASS (${GATE_IDS.length}/${GATE_IDS.length} expected blockers proved PASS or ` +
      'evidentially NOT_APPLICABLE)',
  );
}

if (process.argv[1]?.endsWith('master-required-gate-aggregate.mjs')) main();
