// ResearchOps Factory V1.1 — canonical state/evidence derivation.
// One source of truth shared by validate and status. Fail-closed.

import { join } from 'node:path';
import { exists } from './util.mjs';
import { STATES, isState } from './model.mjs';
import { researchPackagePresent, isPackageValid } from './package.mjs';
import {
  REVIEW_MARKER, CORRECTION_MARKER, VALIDATION_MARKER, CLOSEOUT_MARKER, MERGE_MARKER,
  validateMarkers,
} from './markers.mjs';

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

  const correctedDir = join(taskDir, '60-correction', '20-corrected-output');
  const correctedPackagePresent = researchPackagePresent(correctedDir);
  const correctedPkg = correctedPackagePresent ? isPackageValid(correctedDir) : { ok: false, checks: [] };
  const correctedPackageValid = correctedPackagePresent && correctedPkg.ok;
  const strictCorrectionStatePresent = exists(join(taskDir, '60-correction', 'CORRECTION_STATE.json'));

  return {
    taskDir,
    packagePresent,
    packageValid,
    packageChecks: pkg.checks,
    correctedPackagePresent,
    correctedPackageValid,
    correctedPackageChecks: correctedPkg.checks,
    strictCorrectionStatePresent,
  };
}

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

  const history = Array.isArray(taskState && taskState.history) ? taskState.history : [];
  const usedCorrection = history.some((h) => h && (h.state === 'CORRECTION_REQUIRED' || h.state === 'CORRECTED'));
  const STRICT_CORRECTED_OR_HIGHER = ['CORRECTED', 'VALIDATED', 'OWNER_CLOSEOUT_REQUIRED', 'RESEARCH_RECORD_MERGE_AUTHORIZED', 'RESEARCH_RECORD_MERGED_TO_MAIN'];
  // Correction 038A — strict correction records activate the corrected package as
  // cumulative evidence. Legacy CORRECTION_RESULT-only histories remain readable.
  if (evidence.strictCorrectionStatePresent && usedCorrection && STRICT_CORRECTED_OR_HIGHER.includes(declaredState) && !evidence.correctedPackageValid) {
    return { consistent: false, reason: evidence.correctedPackagePresent ? 'strict correction path requires a valid corrected eleven-file package, but corrected package validation failed' : 'strict correction path requires 60-correction/20-corrected-output/, but it is missing' };
  }

  let required = req.markers || [];
  const VALIDATED_OR_HIGHER = ['VALIDATED', 'OWNER_CLOSEOUT_REQUIRED', 'RESEARCH_RECORD_MERGE_AUTHORIZED', 'RESEARCH_RECORD_MERGED_TO_MAIN'];
  if (usedCorrection && VALIDATED_OR_HIGHER.includes(declaredState) && !required.includes(CORRECTION_MARKER)) {
    required = [...required, CORRECTION_MARKER];
  }
  if (required.length) {
    const taskId = taskState && taskState.taskId;
    if (!taskId) return { consistent: false, reason: 'declared state requires identity-bound markers but TASK_STATE.taskId is missing' };
    const m = validateMarkers(taskDir, required, taskId);
    if (!m.ok) return { consistent: false, reason: m.reason };
  }
  return { consistent: true, reason: '' };
}

export function evidenceCeiling(taskState, evidence, taskDir) {
  let ceiling = 'PREPARED';
  for (const s of STATES) {
    if (s === 'BLOCKED') continue;
    if (checkStateConsistency(s, taskState, evidence, taskDir).consistent) ceiling = s;
  }
  return ceiling;
}
