#!/usr/bin/env node
// S2-03 APPLICABILITY PRODUCER for the unified master required gate (issue #366).
//
// Runs inside the `classify` job, immediately after the S2-01 materiality
// producer/validator pair, and answers one question per registered blocker:
// given the EXACT base..head change set of this pull request, must this blocker
// execute its blocking work?
//
// It is a second PRODUCER with the same binding discipline as the first:
//
//   * it resolves the change set from the exact PR base and head SHAs, with
//     rename detection DISABLED, through the same resolver the materiality
//     classifier uses — one resolver, one set of fail-closed rules;
//   * it writes a job-scoped SIDECAR into RUNNER_TEMP (no process-global temp
//     fallback) stamped with this run's identity (PR head SHA + run id + run
//     attempt), so a file left behind by an earlier run, an earlier re-run
//     attempt or a different PR head is rejected as STALE instead of standing in
//     for a producer that never executed;
//   * an UNCONDITIONAL validator step
//     (scripts/ci/master-required-gate-validate-applicability.mjs) immediately
//     follows and fails the job closed unless the emitted decision is exactly
//     valid, agrees with its own sidecar, and is consistent with the S2-01
//     materiality classification of the same diff.
//
// It emits, to GITHUB_OUTPUT:
//   applicability=<json>                 the whole decision, for the aggregator
//   digest=<sha256>                      the evidence token every blocker echoes
//   gate_global_header_interaction=...   APPLICABLE | NOT_APPLICABLE
//   gate_public_seo_metadata=...         APPLICABLE | NOT_APPLICABLE
//
// The per-gate lines exist because a step-level `if` cannot index into a JSON
// blob. They are DERIVED from the same decision object that is digested, and the
// validator re-checks that each one matches, so the convenience form can never
// drift from the authoritative form.

import { appendFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import {
  classifyChangedPaths,
  resolveChangedPaths,
  resolveRunIdentity,
} from './master-required-gate-classify.mjs';
import {
  GATE_IDS,
  GATES,
  applicabilityDigest,
  applicabilityResultFilePath,
  checkApplicabilityMaterialityConsistency,
  classifyAllGates,
} from './master-required-gate-gates.mjs';

// Exported so the contract test and the mutation suite can drive the whole
// producer computation without a subprocess or a git repository.
export function computeApplicability({ paths, identity }) {
  const classification = classifyChangedPaths(paths);
  const decision = classifyAllGates({
    paths,
    material: String(classification.material),
    materialReason: classification.reason,
  });
  return { decision, digest: applicabilityDigest(decision, identity) };
}

function main() {
  const baseSha = process.env.BASE_SHA;
  const headSha = process.env.HEAD_SHA;
  const paths = resolveChangedPaths(baseSha, headSha);
  const identity = resolveRunIdentity();
  const { decision, digest } = computeApplicability({ paths, identity });

  // A producer that emits an internally contradictory decision must never reach
  // the validator: fail here, at the source, so the failure names the producer.
  const inconsistencies = checkApplicabilityMaterialityConsistency(decision);
  if (inconsistencies.length > 0) {
    console.error('master-required-gate: applicability decision is INTERNALLY INCONSISTENT');
    for (const error of inconsistencies) console.error(` - ${error}`);
    process.exit(1);
  }

  console.log(
    `master-required-gate: applicability material=${decision.material} reason=${decision.materialReason}`,
  );
  for (const gateId of GATE_IDS) {
    console.log(` - ${gateId}: ${decision.gates[gateId]} (${decision.reasons[gateId]})`);
  }
  console.log(`master-required-gate: applicability digest=${digest}`);

  if (!process.argv.includes('--emit-github-output')) return;

  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) {
    console.error('master-required-gate: GITHUB_OUTPUT is not set');
    process.exit(1); // fail-closed: never silently drop the applicability decision
  }
  // Duplicate/ambiguous emission guard. GitHub keeps the LAST line for a given
  // key, so a second write would silently override the decision.
  if (existsSync(outputFile) && /^applicability=/m.test(readFileSync(outputFile, 'utf8'))) {
    console.error('master-required-gate: GITHUB_OUTPUT already carries an applicability= line (ambiguous)');
    process.exit(1);
  }

  // Sidecar first, output lines second — identical ordering discipline to the
  // materiality producer. Resolving the sidecar path throws on a missing or
  // unusable RUNNER_TEMP, which fails the step closed before anything is emitted.
  writeFileSync(
    applicabilityResultFilePath(),
    `${JSON.stringify({
      gates: decision.gates,
      reasons: decision.reasons,
      changedPaths: decision.changedPaths,
      material: decision.material,
      materialReason: decision.materialReason,
      digest,
      headSha: identity.headSha,
      runId: identity.runId,
      runAttempt: identity.runAttempt,
    })}\n`,
    'utf8',
  );

  const lines = [`applicability=${JSON.stringify(decision)}`, `digest=${digest}`];
  for (const gateId of GATE_IDS) lines.push(`${GATES[gateId].outputName}=${decision.gates[gateId]}`);
  appendFileSync(outputFile, `${lines.join('\n')}\n`);
}

if (process.argv[1]?.endsWith('master-required-gate-applicability.mjs')) main();
