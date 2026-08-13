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
//   * the classifier's OWN digest claim does not reproduce from the canonical
//     decision and this run's identity (see "NO TRUSTED DIGEST" below)
//   * a blocker's evidence digest does not match the digest the aggregator
//     INDEPENDENTLY RECOMPUTED
//   * this run's identity (PR head SHA + run id + run attempt) is missing, empty
//     or does not reproduce the digest that was claimed
//   * a blocker declared in the registry has no result at all (a `needs` entry or
//     a whole job was removed)
//   * a result arrives for a gate the registry does not declare
//   * the materiality/applicability contract is internally inconsistent
//
// NO TRUSTED DIGEST — the aggregator RECOMPUTES, it never believes.
//
// The applicability digest is the evidence token that binds every blocker's
// published outcome to one exact classification of one exact change set in one
// exact run. An aggregator that merely checks "the classifier's digest is
// non-empty, and the blockers echoed the same string" verifies nothing about
// WHAT that string is: any value at all, forged and echoed consistently by the
// upstream jobs, satisfies a same-value comparison. The evidence chain is then
// self-referential — it proves the claims agree with each other, not that they
// agree with reality.
//
// So this script derives the expected digest ITSELF, from canonical inputs, with
// the SAME pure deterministic function the producer used
// (`applicabilityDigest` in scripts/ci/master-required-gate-gates.mjs — imported,
// never re-implemented here, so the two can never drift):
//
//   canonical decision  the applicability JSON the classifier published
//                       (gates, reasons, changedPaths, material, materialReason,
//                       canonicalized against the closed registry)
//   run identity        THIS run's PR head SHA + run id + run attempt, resolved
//                       by the aggregator from its OWN environment
//
// The classifier's digest, the validator's digest and every blocker's evidence
// digest are then CLAIMS, compared against the recomputed value. None of them is
// authority. A forged digest fails because it cannot be reproduced; a digest from
// a stale head, an earlier run, or an earlier re-run attempt fails because this
// run's identity does not reproduce it; a decision tampered with after it was
// digested fails because the recomputation moves and the claim does not.
//
// "The upstream validator already recomputes it" is deliberately NOT relied on.
// The validator runs inside the job whose output is under suspicion; the final
// aggregator is the one job whose conclusion becomes the required context, so it
// must bind the evidence itself.
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

import { RUN_IDENTITY_ENV, resolveRunIdentity } from './master-required-gate-classify.mjs';
import {
  ACCEPTED_GATE_OUTCOMES,
  APPLICABILITY_VALUES,
  GATES,
  GATE_IDS,
  GATE_OUTCOMES,
  applicabilityDigest,
  checkApplicabilityMaterialityConsistency,
} from './master-required-gate-gates.mjs';

// The ONLY job result that means "this job ran to completion successfully".
export const REQUIRED_JOB_RESULT = 'success';

// The run-identity fields that are part of the digest contract, paired with the
// environment variable each one is resolved from. Derived from the classifier's
// own RUN_IDENTITY_ENV so the aggregator can never bind to a different identity
// than the producer digested.
export const IDENTITY_FIELDS = Object.freeze([
  Object.freeze(['headSha', RUN_IDENTITY_ENV[0]]),
  Object.freeze(['runId', RUN_IDENTITY_ENV[1]]),
  Object.freeze(['runAttempt', RUN_IDENTITY_ENV[2]]),
]);

// A sha-256 hex digest and nothing else. A digest claim that is not even shaped
// like the function's output is named as such rather than merely failing the
// comparison, so the log says "forged", not "stale".
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;

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
 * @param {string|undefined} input.digest `needs.classify.outputs.digest` — a CLAIM, never authority
 * @param {Record<string, {jobResult: string|undefined, result: string|undefined, evidence: string|undefined}>} input.gates
 * @param {{headSha: string, runId: string, runAttempt: string}|null|undefined} input.identity THIS
 *   run's execution identity, resolved by the AGGREGATOR from its own environment
 * @returns {{ok: boolean, errors: string[], expectedDigest: string|null,
 *   summary: {gateId: string, jobResult: string, result: string}[]}}
 */
export function aggregate({ classifyResult, material, applicabilityRaw, digest, gates, identity }) {
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

  // --- 1b. THIS run's execution identity --------------------------------------
  // Part of the digest contract, and therefore checked before anything is
  // compared: without a complete identity the aggregator cannot reproduce the
  // canonical digest, and an unreproducible digest is never accepted.
  let boundIdentity = null;
  if (!isPlainObject(identity)) {
    errors.push(
      `gate run identity is missing (received ${JSON.stringify(identity)}) — the aggregator cannot ` +
        'independently recompute the canonical applicability digest and must fail closed',
    );
  } else {
    const incomplete = [];
    for (const [field, envName] of IDENTITY_FIELDS) {
      if (typeof identity[field] !== 'string' || identity[field].length === 0) {
        incomplete.push(`${field} (${envName})=${JSON.stringify(identity[field])}`);
      }
    }
    if (incomplete.length > 0) {
      errors.push(`gate run identity is incomplete: ${incomplete.join(', ')}`);
    } else {
      boundIdentity = identity;
    }
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
  // --- 2b. INDEPENDENT RECOMPUTATION OF THE CANONICAL DIGEST -------------------
  // The one place the evidence chain is anchored to something nobody upstream
  // could choose. `applicabilityDigest` is the producer's own pure function,
  // imported rather than reimplemented, and it is fed CANONICAL inputs only: the
  // decision the classifier published, and the identity THIS job resolved from
  // its own environment. Everything downstream compares against this value.
  const expectedDigest =
    decision !== null && boundIdentity !== null ? applicabilityDigest(decision, boundIdentity) : null;

  if (typeof digest !== 'string' || digest.length === 0) {
    errors.push(`classifier applicability digest is missing (received ${JSON.stringify(digest)})`);
  } else if (!DIGEST_PATTERN.test(digest)) {
    errors.push(
      `classifier applicability digest ${JSON.stringify(digest)} is not a sha-256 hex digest — no run of the ` +
        'canonical digest function can ever produce it',
    );
  }
  if (expectedDigest === null) {
    errors.push(
      'the aggregator could not independently recompute the canonical applicability digest (the decision or ' +
        'this run\'s identity is unusable) — an unverifiable evidence chain is never accepted',
    );
  } else if (digest !== expectedDigest) {
    // The CLASSIFIER's own claim is checked against the recomputation exactly
    // like a blocker's is. It is a claim, not authority.
    errors.push(
      `classifier applicability digest ${JSON.stringify(digest)} does not match the digest the aggregator ` +
        `independently recomputed from the canonical decision and this run's identity ` +
        `(headSha=${JSON.stringify(boundIdentity.headSha)} runId=${JSON.stringify(boundIdentity.runId)} ` +
        `runAttempt=${JSON.stringify(boundIdentity.runAttempt)}): expected ${JSON.stringify(expectedDigest)} — ` +
        'the decision, the run identity or the digest itself was forged, tampered with or is stale',
    );
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
    // The evidence must come from THIS run's canonical classifier decision, and
    // it is checked against the digest the AGGREGATOR RECOMPUTED — never against
    // the digest the classifier or the blocker supplied. Comparing two supplied
    // claims to each other only proves they agree; comparing each to the
    // recomputation proves both describe the decision and the run identity this
    // job independently derived. A mismatch means the blocker acted on a decision
    // the aggregator is not looking at — forged, stale, re-run, or hand-edited.
    if (evidence.digest !== expectedDigest) {
      errors.push(
        `blocker ${gateId} evidence digest ${JSON.stringify(evidence.digest)} does not match the canonical ` +
          `applicability digest the aggregator independently recomputed ${JSON.stringify(expectedDigest)} — ` +
          'its applicability came from a different decision, a different run, or from no real decision at all',
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

  return { ok: errors.length === 0, errors, expectedDigest, summary };
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

  // THIS job's own environment, never a value handed down the DAG. A missing or
  // empty identity variable throws, and the throw becomes a named aggregation
  // error rather than an unverified pass.
  const identityErrors = [];
  let identity = null;
  try {
    identity = resolveRunIdentity();
  } catch (error) {
    identityErrors.push(String(error.message));
  }

  const outcome = aggregate({
    classifyResult: process.env.CLASSIFY_JOB_RESULT,
    material: process.env.CLASSIFIER_MATERIAL,
    applicabilityRaw: process.env.APPLICABILITY_JSON,
    digest: process.env.APPLICABILITY_DIGEST,
    gates,
    identity,
  });
  const errors = [...identityErrors, ...outcome.errors];

  console.log('CBW MASTER REQUIRED GATE — aggregation');
  console.log(` classifier job result: ${process.env.CLASSIFY_JOB_RESULT}`);
  console.log(` claimed applicability digest: ${process.env.APPLICABILITY_DIGEST}`);
  console.log(` independently recomputed digest: ${outcome.expectedDigest}`);
  for (const row of outcome.summary) {
    console.log(` blocker ${row.gateId}: job=${row.jobResult} result=${row.result}`);
  }

  if (errors.length > 0) {
    console.error('CBW MASTER REQUIRED GATE: FAIL — failing closed');
    for (const error of errors) console.error(` - ${error}`);
    process.exit(1);
  }

  console.log(
    `CBW MASTER REQUIRED GATE: PASS (${GATE_IDS.length}/${GATE_IDS.length} expected blockers proved PASS or ` +
      'evidentially NOT_APPLICABLE)',
  );
}

if (process.argv[1]?.endsWith('master-required-gate-aggregate.mjs')) main();
