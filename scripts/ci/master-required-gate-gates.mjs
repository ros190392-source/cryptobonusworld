#!/usr/bin/env node
// Stage-2 (S2-03) BLOCKER REGISTRY and per-gate APPLICABILITY model for the
// unified master required gate (issue #366).
//
// WHAT THIS FILE IS. S2-01/S2-02 delivered ONE always-reporting required check
// context ("Master required gate") that executed the material work in a single
// job. S2-03 turns that single job into a bounded DAG:
//
//     classify -> { global-header-interaction, public-seo-metadata } -> Master required gate
//
// Every blocker job in that DAG is declared HERE, once, in a closed registry.
// The workflow, the contract test, the mutation suite and the aggregator all read
// the SAME registry, so a gate cannot be added to one of them and silently
// forgotten by the others.
//
// THE NOT_APPLICABLE CONTRACT — why it is a negative allowlist.
//
// A blocker job that does not need to run must still produce a DETERMINISTIC,
// MACHINE-READABLE outcome. GitHub's `skipped` conclusion is NOT that outcome:
// a job skips for many reasons (an upstream failure, a cancelled run, a job-level
// `if` that silently evaluated to the empty string) and every one of them looks
// identical from the aggregator's side. "Skipped" is therefore never accepted as
// proof of anything; NOT_APPLICABLE must be JUSTIFIED by exact changed-file
// classification.
//
// The justification model mirrors the S2-01 classifier exactly, and for the same
// reason. A POSITIVE "these paths make the gate relevant" list is fail-OPEN:
// every input nobody thought to enumerate — a new build-time module, a new data
// file, a future config — would classify the gate NOT_APPLICABLE and skip real
// blocking work under a SUCCESS conclusion. So the model is the opposite:
//
//   * a changed path is IRRELEVANT to a gate ONLY if it appears verbatim in that
//     gate's `irrelevantPaths`
//   * every other path, including every unknown/new path            -> RELEVANT
//   * one relevant path anywhere in the change set                  -> APPLICABLE
//   * an unresolvable or empty change set                           -> APPLICABLE
//   * a malformed / traversing / absolute path                      -> RELEVANT
//
// So NOT_APPLICABLE is only ever reached when EVERY changed file is provably
// inert for that gate. Both gates run a full `astro build`, so their inert sets
// are necessarily tiny: the four root governance documents already proven inert
// by the S2-01 allowlist (and re-proved inert on every run by the dependency
// drift scanner), plus the OTHER gate's exclusive legacy workflow file and
// exclusive gate script. Nothing else is claimed to be inert, and the contract
// test re-proves on every run that each inert entry really is outside this
// gate's S2-02 dependency closure.
//
// This file has NO main(). It is pure so the contract test, the mutation suite,
// the producer, the per-gate result emitter and the aggregator can all drive it
// with hostile inputs. It imports only node builtins (transitively too), because
// the aggregator and the result emitter run in jobs that deliberately do NOT run
// `npm ci` when their gate is not applicable.

import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { NON_MATERIAL_PATHS, normalizePath, runnerTempDir } from './master-required-gate-classify.mjs';

// The closed set of applicability values a gate may be assigned by the
// classifier. There is deliberately no third "unknown" value: an unprovable
// applicability is APPLICABLE, which runs the work.
export const APPLICABILITY_VALUES = Object.freeze(['APPLICABLE', 'NOT_APPLICABLE']);

// The reason -> applicability mapping, in the same shape and for the same reason
// as REASON_MATERIALITY in the classifier: a reason PINS its applicability, so a
// contradictory pair (`NOT_APPLICABLE` justified by `relevant-path-changed`) is
// structurally impossible rather than merely unlikely. Both fail-closed reasons
// pin APPLICABLE; only the one affirmative reason pins NOT_APPLICABLE.
export const APPLICABILITY_REASONS = Object.freeze({
  'unresolved-or-empty-change-set': 'APPLICABLE',
  'relevant-path-changed': 'APPLICABLE',
  'only-gate-irrelevant-paths': 'NOT_APPLICABLE',
});

export const VALID_APPLICABILITY_REASONS = Object.freeze(Object.keys(APPLICABILITY_REASONS));

// True when the (applicability, reason) pair is semantically possible.
export function isConsistentApplicability(applicability, reason) {
  if (!APPLICABILITY_VALUES.includes(applicability)) return false;
  if (!Object.prototype.hasOwnProperty.call(APPLICABILITY_REASONS, reason)) return false;
  return APPLICABILITY_REASONS[reason] === applicability;
}

// The closed outcome vocabulary a blocker job may publish. FAIL is present so the
// vocabulary is closed and total — a blocker that reaches its emitter in a broken
// state names FAIL explicitly instead of emitting nothing — but the aggregator
// accepts only ACCEPTED_GATE_OUTCOMES. Anything outside GATE_OUTCOMES, and
// anything inside it but outside ACCEPTED_GATE_OUTCOMES, fails the gate closed.
export const GATE_OUTCOMES = Object.freeze(['PASS', 'NOT_APPLICABLE', 'FAIL']);
export const ACCEPTED_GATE_OUTCOMES = Object.freeze(['PASS', 'NOT_APPLICABLE']);

// Paths proven inert for EVERY gate: the exact S2-01 non-material allowlist. Each
// entry is a root-level human-readable governance document, is not a workflow
// trigger anywhere, and is re-proved on every run by
// scripts/ci/master-required-gate-allowlist-drift.mjs to be referenced by no
// tracked build/test/runtime/gate file. Importing the list rather than restating
// it means the two allowlists can never drift apart.
export const UNIVERSALLY_INERT_PATHS = Object.freeze([...NON_MATERIAL_PATHS]);

// The two step-condition shapes a blocking step may carry inside a unified
// blocker job, and nothing else. Keeping this closed is what lets the workflow
// contract reject an invented condition instead of merely noticing it is
// different.
//
//   'applicability'              gated purely on this gate's validated
//                                applicability decision.
//   'applicability-after-build'  the legacy workflows guard the indexability
//                                inventory with `always() && steps.build.outcome
//                                == 'success'` so it still runs — and can still
//                                fail the job — when the step before it failed.
//                                That exact condition is preserved, conjoined
//                                with applicability, so the unified job's
//                                red/green behaviour matches the legacy job's in
//                                every reachable state.
export const STEP_CONDITIONS = Object.freeze(['applicability', 'applicability-after-build']);

/** The exact `if:` text a blocking step must carry, derived, never hand-written. */
export function stepConditionExpression(gateId, condition) {
  const output = `needs.${CLASSIFY_JOB_ID}.outputs.${GATES[gateId].outputName}`;
  if (condition === 'applicability') return `${output} == 'APPLICABLE'`;
  if (condition === 'applicability-after-build') {
    return `always() && ${output} == 'APPLICABLE' && steps.build.outcome == 'success'`;
  }
  throw new Error(`master-required-gate: unknown step condition ${JSON.stringify(condition)}`);
}

/**
 * The closed blocker registry.
 *
 * `irrelevantPaths` — EXACT repo-relative paths only. No prefixes and no globs:
 * a prefix would let a future file dropped into that directory inherit inert
 * status without anyone deciding it is inert, which is the same fail-open failure
 * in a different shape (the identical rule the S2-01 allowlist follows).
 *
 * `steps` — the exact blocking step sequence this gate must execute when it IS
 * applicable, with the step id each one carries (the ids are load-bearing: the
 * result emitter reads `steps.<id>.outcome` for every one of them) and the legacy
 * step `if` each one is reproducing.
 * scripts/ci/master-required-gate-parity-test.mjs proves the sequence is
 * command-for-command equivalent to the legacy path-filtered workflow, and that
 * the unified job really runs it.
 */
export const GATES = Object.freeze({
  'global-header-interaction': Object.freeze({
    id: 'global-header-interaction',
    jobId: 'global-header-interaction',
    jobName: 'Global header interaction (unified blocker)',
    outputName: 'gate_global_header_interaction',
    applicabilityEnv: 'GATE_GLOBAL_HEADER_INTERACTION_APPLICABILITY',
    resultEnv: 'GATE_GLOBAL_HEADER_INTERACTION_RESULT',
    jobResultEnv: 'GATE_GLOBAL_HEADER_INTERACTION_JOB_RESULT',
    evidenceEnv: 'GATE_GLOBAL_HEADER_INTERACTION_EVIDENCE',
    legacyWorkflow: '.github/workflows/cbw-global-header-interaction.yml',
    legacyJobId: 'global-header-interaction',
    steps: Object.freeze([
      Object.freeze({ id: 'install', command: 'npm ci', condition: 'applicability', legacyIf: null }),
      Object.freeze({ id: 'build', command: 'npm run build', condition: 'applicability', legacyIf: null }),
      Object.freeze({
        id: 'smoke',
        command: 'node scripts/ui/global-header-interaction-browser-smoke.mjs',
        condition: 'applicability',
        legacyIf: null,
      }),
      Object.freeze({
        id: 'indexability',
        command: 'node scripts/seo/site-indexability-inventory.mjs',
        condition: 'applicability-after-build',
        legacyIf: "always() && steps.build.outcome == 'success'",
      }),
    ]),
    irrelevantPaths: Object.freeze([
      ...UNIVERSALLY_INERT_PATHS,
      // The OTHER gate's exclusive surface. Neither file is read, imported or
      // executed by anything this gate runs (proved live by the contract test
      // against the S2-02 dependency closure).
      '.github/workflows/cbw-public-seo-metadata.yml',
      'scripts/seo/public-seo-metadata-schema-test.mjs',
    ]),
  }),
  'public-seo-metadata': Object.freeze({
    id: 'public-seo-metadata',
    jobId: 'public-seo-metadata',
    jobName: 'Public SEO metadata (unified blocker)',
    outputName: 'gate_public_seo_metadata',
    applicabilityEnv: 'GATE_PUBLIC_SEO_METADATA_APPLICABILITY',
    resultEnv: 'GATE_PUBLIC_SEO_METADATA_RESULT',
    jobResultEnv: 'GATE_PUBLIC_SEO_METADATA_JOB_RESULT',
    evidenceEnv: 'GATE_PUBLIC_SEO_METADATA_EVIDENCE',
    legacyWorkflow: '.github/workflows/cbw-public-seo-metadata.yml',
    legacyJobId: 'public-seo-metadata',
    steps: Object.freeze([
      Object.freeze({ id: 'install', command: 'npm ci', condition: 'applicability', legacyIf: null }),
      Object.freeze({ id: 'build', command: 'npm run build', condition: 'applicability', legacyIf: null }),
      Object.freeze({
        id: 'schema',
        command: 'node scripts/seo/public-seo-metadata-schema-test.mjs',
        condition: 'applicability',
        legacyIf: null,
      }),
      Object.freeze({
        id: 'indexability',
        command: 'node scripts/seo/site-indexability-inventory.mjs',
        condition: 'applicability-after-build',
        legacyIf: "always() && steps.build.outcome == 'success'",
      }),
    ]),
    irrelevantPaths: Object.freeze([
      ...UNIVERSALLY_INERT_PATHS,
      '.github/workflows/cbw-global-header-interaction.yml',
      'scripts/ui/global-header-interaction-browser-smoke.mjs',
    ]),
  }),
});

// Stable, sorted, closed. Every consumer iterates THIS, so a gate that exists in
// the workflow but not here (or here but not in the workflow) is a contract
// failure rather than a silently unaggregated job.
export const GATE_IDS = Object.freeze(Object.keys(GATES).sort());

// The blocking command sequence of a gate, DERIVED from its step list so the two
// can never disagree. Consumers that only care about "what does this gate run"
// (the parity proof, the result emitter's arity check) read this.
export function gateCommands(gateId) {
  return GATES[gateId].steps.map((step) => step.command);
}

// The stable visible check context of the final aggregator. Branch protection
// names this string and nothing else.
export const FINAL_CHECK_CONTEXT = 'Master required gate';
export const FINAL_JOB_ID = 'master-required-gate';
export const CLASSIFY_JOB_ID = 'classify';

export const APPLICABILITY_SIDECAR_BASENAME = 'cbw-master-required-gate-applicability.json';

// Resolved through the classifier's OWN fail-closed RUNNER_TEMP helper — there is
// no second copy of that logic and therefore no second place for a
// process-global temp fallback to reappear.
export function applicabilityResultFilePath() {
  return join(runnerTempDir(), APPLICABILITY_SIDECAR_BASENAME);
}

/**
 * Applicability of ONE gate against an exact changed-path set.
 *
 * @param {string} gateId
 * @param {string[]|null} paths repo-relative changed paths, or null when the
 *   changed-file resolution itself failed.
 * @returns {{applicability: string, reason: string, relevant: string[]}}
 */
export function classifyGateApplicability(gateId, paths) {
  const gate = GATES[gateId];
  if (!gate) {
    // An unknown gate is not a reason to skip work. Fail closed.
    return { applicability: 'APPLICABLE', reason: 'unresolved-or-empty-change-set', relevant: [] };
  }
  if (!Array.isArray(paths) || paths.length === 0) {
    return { applicability: 'APPLICABLE', reason: 'unresolved-or-empty-change-set', relevant: [] };
  }
  const inert = new Set(gate.irrelevantPaths);
  const relevant = [];
  for (const path of paths) {
    // A path that does not normalize (non-string, empty, absolute, traversing)
    // is never inert — the same fail-closed rule the classifier applies.
    const normalized = normalizePath(path);
    if (normalized === null || !inert.has(normalized)) relevant.push(path);
  }
  return relevant.length > 0
    ? { applicability: 'APPLICABLE', reason: 'relevant-path-changed', relevant }
    : { applicability: 'NOT_APPLICABLE', reason: 'only-gate-irrelevant-paths', relevant: [] };
}

/**
 * The whole decision for every registered gate, plus the evidence that justifies
 * it. `material` / `materialReason` are the S2-01 classification for the SAME
 * change set, carried here so the two statements can be cross-checked rather
 * than trusted independently.
 *
 * @returns {{gates: Record<string,string>, reasons: Record<string,string>,
 *   changedPaths: string[]|null, material: string, materialReason: string}}
 */
export function classifyAllGates({ paths, material, materialReason }) {
  const gates = {};
  const reasons = {};
  for (const gateId of GATE_IDS) {
    const decision = classifyGateApplicability(gateId, paths);
    gates[gateId] = decision.applicability;
    reasons[gateId] = decision.reason;
  }
  return {
    gates,
    reasons,
    changedPaths: Array.isArray(paths) ? [...paths].sort() : null,
    material: String(material),
    materialReason: String(materialReason),
  };
}

/**
 * Canonical serialization of a decision. Key order is FIXED here rather than
 * inherited from object construction order, because the digest below is the
 * evidence token every downstream job compares against — a digest that depends on
 * insertion order would differ between two identical decisions.
 */
export function canonicalizeDecision(decision, identity) {
  const gates = {};
  const reasons = {};
  for (const gateId of GATE_IDS) {
    gates[gateId] = String(decision?.gates?.[gateId]);
    reasons[gateId] = String(decision?.reasons?.[gateId]);
  }
  return JSON.stringify({
    gateIds: [...GATE_IDS],
    gates,
    reasons,
    changedPaths: Array.isArray(decision?.changedPaths) ? [...decision.changedPaths].sort() : null,
    material: String(decision?.material),
    materialReason: String(decision?.materialReason),
    headSha: String(identity?.headSha),
    runId: String(identity?.runId),
    runAttempt: String(identity?.runAttempt),
  });
}

// The EVIDENCE TOKEN. Every blocker job echoes the digest it was handed, and the
// aggregator requires an exact match against the classifier's own digest. A
// blocker that was launched from a different (stale, re-run, hand-edited)
// applicability decision therefore cannot have its NOT_APPLICABLE accepted.
export function applicabilityDigest(decision, identity) {
  return createHash('sha256').update(canonicalizeDecision(decision, identity)).digest('hex');
}

/**
 * Cross-check between the S2-01 materiality statement and the S2-03 applicability
 * statement for the SAME change set. Returns a list of human-readable
 * inconsistencies; empty means consistent.
 *
 * Two invariants, both derived from the fact that every gate's inert set is a
 * SUPERSET of the non-material allowlist:
 *
 *   1. material === 'false' means every changed path is on the non-material
 *      allowlist, which is inert for every gate, so EVERY gate must be
 *      NOT_APPLICABLE. A gate claiming APPLICABLE there means the two classifiers
 *      disagree about the same diff.
 *   2. a gate that is APPLICABLE for reason `relevant-path-changed` saw a path
 *      outside its inert set, which is therefore outside the non-material
 *      allowlist, so material MUST be 'true'.
 */
export function checkApplicabilityMaterialityConsistency({ gates, reasons, material }) {
  const errors = [];
  if (material !== 'true' && material !== 'false') {
    errors.push(`materiality ${JSON.stringify(material)} is not exactly "true" or "false"`);
    return errors;
  }
  for (const gateId of GATE_IDS) {
    const applicability = gates?.[gateId];
    const reason = reasons?.[gateId];
    if (!APPLICABILITY_VALUES.includes(applicability)) {
      errors.push(`gate ${gateId} applicability ${JSON.stringify(applicability)} is outside the closed vocabulary`);
      continue;
    }
    if (!isConsistentApplicability(applicability, reason)) {
      errors.push(
        `gate ${gateId} applicability ${JSON.stringify(applicability)} contradicts reason ${JSON.stringify(reason)}`,
      );
      continue;
    }
    if (material === 'false' && applicability !== 'NOT_APPLICABLE') {
      errors.push(
        `gate ${gateId} is ${applicability} while the change set classified NON-MATERIAL — every ` +
          'non-material path is inert for every gate, so the two classifications contradict each other',
      );
    }
    if (material === 'true' && applicability === 'NOT_APPLICABLE' && reason !== 'only-gate-irrelevant-paths') {
      errors.push(`gate ${gateId} claims NOT_APPLICABLE without the affirmative inert-paths justification`);
    }
    if (applicability === 'APPLICABLE' && reason === 'relevant-path-changed' && material !== 'true') {
      errors.push(
        `gate ${gateId} saw a relevant path while the change set classified NON-MATERIAL`,
      );
    }
  }
  return errors;
}
