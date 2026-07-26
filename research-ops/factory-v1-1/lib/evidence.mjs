// ResearchOps Factory V1.1 — canonical state/evidence derivation.
// One source of truth shared by `validate` and `status`. Fail-closed.

import { join } from 'node:path';
import { exists } from './util.mjs';
import { STATES, isState } from './model.mjs';
import { researchPackagePresent, isPackageValid } from './package.mjs';

// Conservative artifact requirements per declared state.
// requiresPackage: a complete, valid eleven-file package must exist.
// stage: an append-only stage output file (any of) must exist.
// requiresBlockedReason: TASK_STATE.blockedReason must be a non-empty string.
export const STATE_REQUIREMENTS = {
  PREPARED: { requiresPackage: false },
  RESEARCH_CAPTURED: { requiresPackage: true },
  PACKAGE_VALIDATED: { requiresPackage: true },
  SOURCE_TRUTH_REVIEWED: { requiresPackage: true, stage: { dir: '50-source-truth-review', anyOf: ['SOURCE_TRUTH_REVIEW.json'] } },
  CORRECTION_REQUIRED: { requiresPackage: true, stage: { dir: '50-source-truth-review', anyOf: ['SOURCE_TRUTH_REVIEW.json'] } },
  CORRECTED: { requiresPackage: true, stage: { dir: '60-correction', anyOf: ['CORRECTION_STATE.json', 'CORRECTION_RESULT.json'] } },
  VALIDATED: { requiresPackage: true, stage: { dir: '70-validation', anyOf: ['VALIDATION.json', 'FACTORY_VALIDATION.json', 'CORRECTION_V2_VALIDATION.json'] } },
  OWNER_CLOSEOUT_REQUIRED: { requiresPackage: true, stage: { dir: '70-validation', anyOf: ['VALIDATION.json', 'FACTORY_VALIDATION.json', 'CORRECTION_V2_VALIDATION.json'] } },
  RESEARCH_RECORD_MERGE_AUTHORIZED: { requiresPackage: true, stage: { dir: '80-closeout', anyOf: ['OWNER_CLOSEOUT_RECEIPT.json'] } },
  RESEARCH_RECORD_MERGED_TO_MAIN: { requiresPackage: true, stage: { dir: '80-closeout', anyOf: ['OWNER_CLOSEOUT_RECEIPT.json'] } },
  BLOCKED: { requiresBlockedReason: true },
};

export function deriveEvidence(taskDir) {
  const outDir = join(taskDir, '20-research-output');
  const packagePresent = researchPackagePresent(outDir);
  const pkg = packagePresent ? isPackageValid(outDir) : { ok: false, checks: [] };
  const packageValid = packagePresent && pkg.ok;
  return { taskDir, packagePresent, packageValid, packageChecks: pkg.checks };
}

function stageSatisfied(taskDir, stage) {
  if (!stage) return true;
  return stage.anyOf.some((f) => exists(join(taskDir, stage.dir, f)));
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
  if (req.stage && !stageSatisfied(taskDir, req.stage)) {
    return { consistent: false, reason: `declared state requires ${req.stage.dir}/{${req.stage.anyOf.join(' | ')}}` };
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
