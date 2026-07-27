// ResearchOps Factory V1.1 — canonical state/evidence derivation.
// One source of truth shared by `validate` and `status`. Fail-closed.

import { join } from 'node:path';
import { exists } from './util.mjs';
import { STATES, isState } from './model.mjs';
import { researchPackagePresent, isPackageValid } from './package.mjs';
import {
  REVIEW_MARKER, CORRECTION_MARKER, VALIDATION_MARKER, CLOSEOUT_MARKER, MERGE_MARKER,
  validateMarkers,
} from './markers.mjs';

// Conservative artifact requirements per declared state.
// requiresPackage: a complete, valid eleven-file package must exist.
// markers: V2-C10 — a CUMULATIVE list of identity-bound stage markers, each of which
//   must be a regular, canonical-UTF-8, parseable, task-ID-bound file carrying a
//   recognized outcome/state (or a valid owner receipt). Later states retain earlier
//   stage evidence.
// requiresBlockedReason: TASK_STATE.blockedReason must be a non-empty string.
export const STATE_REQUIREMENTS = {
  PREPARED: { requiresPackage: false, markers: [] },
  RESEARCH_CAPTURED: { requiresPackage: true, markers: [] },
  PACKAGE_VALIDATED: { requiresPackage: true, markers: [] },
  SOURCE_TRUTH_REVIEWED: { requiresPackage: true, markers: [REVIEW_MARKER] },
  CORRECTION_REQUIRED: { requiresPackage: true, markers: [REVIEW_MARKER] },
  CORRECTED: { requiresPackage: true, markers: [REVIEW_MARKER, CORRECTION_MARKER] },
  VALIDATED: { requiresPackage: true, markers: [REVIEW_MARKER, VALIDATION_MARKER] },
  OWNER_CLOSEOUT_REQUIRED: { requiresPackage: true, markers: [REVIEW_MARKER, VALIDATION_MARKER] },
  RESEARCH_RECORD_MERGE_AUTHORIZED: { requiresPackage: true, markers: [REVIEW_MARKER, VALIDATION_MARKER, CLOSEOUT_MARKER] },
  RESEARCH_RECORD_MERGED_TO_MAIN: { requiresPackage: true, markers: [REVIEW_MARKER, VALIDATION_MARKER, CLOSEOUT_MARKER, MERGE_MARKER] },
  BLOCKED: { requiresBlockedReason: true, markers: [] },
};

export function deriveEvidence(taskDir) {
  const outDir = join(taskDir, '20-research-output');
  const packagePresent = researchPackagePresent(outDir);
  const pkg = packagePresent ? isPackageValid(outDir) : { ok: false, checks: [] };
  const packageValid = packagePresent && pkg.ok;
  return { taskDir, packagePresent, packageValid, packageChecks: pkg.checks };
}

// Return { consistent, reason } for a declared state against on-disk evidence.
export function checkStateConsistency(declaredState, taskState, evidence, taskDir) {
  if (!isState(declaredState)) return { consistent: false, reason: `state ${JSON.stringify(declaredState)} is not canonical` };
  const req = STATE_REQUIREMENTS[declaredState];
  if (req.requiresBlockedReason) {
    const r = taskState && typeof taskState.blockedReason === 'string' && taskState.blockedReason.trim() !== '';
    return { consistent: !!r, reason: r ? '' : 'BLOCKED requires a non-empty blockedReason' };
  }
  if (req.requiresPackage && !evidence.packageValid) {
    return { consistent: false, reason: evidence.packagePresent ? 'declared state requires a valid eleven-file package, but package validation failed' : 'declared state requires a research package, but 20-research-output/ is empty' };
  }
  // V2-C10 — cumulative identity-bound stage markers.
  if (req.markers && req.markers.length) {
    const taskId = taskState && taskState.taskId;
    if (!taskId) return { consistent: false, reason: 'declared state requires identity-bound markers but TASK_STATE.taskId is missing' };
    const m = validateMarkers(taskDir, req.markers, taskId);
    if (!m.ok) return { consistent: false, reason: m.reason };
  }
  return { consistent: true, reason: '' };
}

// Highest state whose requirements are satisfied by current evidence (the ceiling).
export function evidenceCeiling(taskState, evidence, taskDir) {
  let ceiling = 'PREPARED';
  for (const s of STATES) {
    if (s === 'BLOCKED') continue;
    if (checkStateConsistency(s, taskState, evidence, taskDir).consistent) ceiling = s;
  }
  return ceiling;
}
