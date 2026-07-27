// ResearchOps Factory V1.1 — stage-aware append-only transition rules (V2-C5).
// Pure and deterministic. The CLI/workflow feed it the task's base and head
// TASK_STATE (read from trusted Git blobs at base/head commits); fixtures call it
// directly with synthetic inputs. No Git or filesystem writes here.

import { isState, canTransition } from './model.mjs';

// Ordered append-only stage directories inside a task root.
export const STAGE_ORDER = [
  '00-contract',
  '10-input',
  '20-research-output',
  '50-source-truth-review',
  '60-correction',
  '70-validation',
  '80-closeout',
];

// The single stage a given declared state is actively writing into (its working
// stage). Additions are permitted ONLY into the working stage of the head state.
const WORKING_STAGE = {
  PREPARED: null,
  RESEARCH_CAPTURED: '20-research-output',
  PACKAGE_VALIDATED: '20-research-output',
  SOURCE_TRUTH_REVIEWED: '50-source-truth-review',
  CORRECTION_REQUIRED: '50-source-truth-review',
  CORRECTED: '60-correction',
  VALIDATED: '70-validation',
  OWNER_CLOSEOUT_REQUIRED: '70-validation',
  RESEARCH_RECORD_MERGE_AUTHORIZED: '80-closeout',
  RESEARCH_RECORD_MERGED_TO_MAIN: '80-closeout',
  BLOCKED: null,
};

// Given a task-root-relative path, return its stage dir or null (root-level file).
export function stageOfRelPath(rel) {
  const r = String(rel).replace(/\\/g, '/');
  const seg = r.split('/')[0];
  return STAGE_ORDER.includes(seg) ? seg : null;
}

// records: [{ status: 'A'|'M'|'D'|'T'|'R'|'C', rel, srcRel? }] already scoped to ONE
//   task root and made root-relative (rel = path under the root; for R/C, rel is the
//   destination and srcRel the source).
// baseState: TASK_STATE.state at base, or null when the task root did not exist at base.
// headState: TASK_STATE.state at head.
// Returns { ok, violations[] }.
export function checkStageTransition({ records, baseState, headState, taskExistsAtBase }) {
  const violations = [];
  const isCreation = !taskExistsAtBase || baseState === null || baseState === undefined;

  if (!isState(headState)) {
    return { ok: false, violations: [`head TASK_STATE.state is not canonical: ${JSON.stringify(headState)}`] };
  }

  if (isCreation) {
    // Initial task creation: create-only, one new root, head must be PREPARED, and
    // every changed record must be a pure addition.
    if (headState !== 'PREPARED') violations.push(`new task root must be created at PREPARED, got ${headState}`);
    for (const r of records) {
      if (r.status !== 'A') violations.push(`${r.rel}: new task creation admits additions only (got ${r.status})`);
    }
    return { ok: violations.length === 0, violations };
  }

  // Existing task: require a canonical transition or a same-state append.
  if (!isState(baseState)) {
    violations.push(`base TASK_STATE.state is not canonical: ${JSON.stringify(baseState)}`);
  } else if (baseState !== headState && !canTransition(baseState, headState)) {
    violations.push(`disallowed state transition ${baseState} -> ${headState}`);
  }

  const openStage = WORKING_STAGE[headState] || null;

  for (const r of records) {
    const rel = String(r.rel).replace(/\\/g, '/');
    // TASK_STATE.json at the root is the only always-mutable governed record.
    if (rel === 'TASK_STATE.json') {
      if (r.status === 'A' || r.status === 'M') continue;
      violations.push(`TASK_STATE.json: only add/modify permitted (got ${r.status})`);
      continue;
    }
    const stage = stageOfRelPath(rel);
    // Rename/copy: the SOURCE side is a removal/reference of existing governed content.
    if (r.status === 'R') {
      violations.push(`${r.srcRel} -> ${rel}: rename of governed content is not append-only`);
      continue;
    }
    if (r.status === 'C') {
      // copy: destination is a new file; still only allowed into the open stage.
      if (stage === openStage && openStage) continue;
      violations.push(`${rel}: copy destination outside the open stage ${openStage || '(none)'}`);
      continue;
    }
    if (r.status === 'D' || r.status === 'M' || r.status === 'T') {
      violations.push(`${rel}: modification/deletion of a closed/earlier stage is not permitted (${r.status})`);
      continue;
    }
    if (r.status === 'A') {
      if (stage === openStage && openStage) continue;
      violations.push(`${rel}: addition into ${stage || '(root)'} not permitted at state ${headState} (open stage: ${openStage || 'none'})`);
      continue;
    }
    violations.push(`${rel}: unsupported change status ${r.status}`);
  }

  return { ok: violations.length === 0, violations };
}
