// ResearchOps Factory V1.1 — stage-aware append-only transition rules.
// V2-C5 stage immutability; V3-C5 exact initial skeleton; V3-C6 exact per-stage
// inventory; V3-C9 TASK_STATE.history append-only. Pure and deterministic. The
// CLI/workflow feed the task's base/head TASK_STATE (and history) read from trusted
// Git blobs; fixtures call directly. No Git or filesystem writes here.

import { isState, canTransition, RESEARCH_FILES, canonicalSkeletonFiles } from './model.mjs';

// Ordered append-only stage directories inside a task root.
export const STAGE_ORDER = [
  '00-contract', '10-input', '20-research-output',
  '50-source-truth-review', '60-correction', '70-validation', '80-closeout',
];

// Correction 035 — the immutable generated review contract requires this exact pair.
export const REVIEW_OUTPUT_FILES = Object.freeze([
  'SOURCE_TRUTH_REVIEW.json',
  'SOURCE_TRUTH_REVIEW.md',
]);
const REVIEW_OUTPUT_SET = new Set(REVIEW_OUTPUT_FILES);

// V3-C6 — the EXACT files a transition INTO a given head state may add. A state that
// adds nothing (a pure validation gate) is omitted. 20-research-output is captured
// only while entering RESEARCH_CAPTURED and is immutable thereafter.
const RESEARCH_FILE_SET = new Set(RESEARCH_FILES);
const STAGE_ADD_ALLOW = {
  RESEARCH_CAPTURED: { dir: '20-research-output', files: RESEARCH_FILE_SET },
  SOURCE_TRUTH_REVIEWED: {
    dir: '50-source-truth-review',
    files: REVIEW_OUTPUT_SET,
    requiredOnEntry: REVIEW_OUTPUT_SET,
    exactAdditionGroup: REVIEW_OUTPUT_SET,
  },
  // The review pair is normally created while entering SOURCE_TRUTH_REVIEWED. Keep
  // the same allowlist for defensive compatibility, but a later transition to
  // CORRECTION_REQUIRED remains state-only when the pair already exists.
  CORRECTION_REQUIRED: {
    dir: '50-source-truth-review',
    files: REVIEW_OUTPUT_SET,
    exactAdditionGroup: REVIEW_OUTPUT_SET,
  },
  CORRECTED: { dir: '60-correction', files: new Set(['CORRECTION_STATE.json', 'CORRECTION_RESULT.json']) },
  VALIDATED: { dir: '70-validation', files: new Set(['VALIDATION.json', 'FACTORY_VALIDATION.json', 'CORRECTION_V2_VALIDATION.json', 'CORRECTION_V3_VALIDATION.json']) },
  RESEARCH_RECORD_MERGE_AUTHORIZED: { dir: '80-closeout', files: new Set(['OWNER_CLOSEOUT_RECEIPT.json']) },
  RESEARCH_RECORD_MERGED_TO_MAIN: { dir: '80-closeout', files: new Set(['RESEARCH_RECORD_MERGE.json', 'MERGE_RECORD.json']) },
};

export function stageOfRelPath(rel) {
  const r = String(rel).replace(/\\/g, '/');
  const seg = r.split('/')[0];
  return STAGE_ORDER.includes(seg) ? seg : null;
}

function allowedAdd(headState, rel) {
  const spec = STAGE_ADD_ALLOW[headState];
  if (!spec) return false;
  const r = String(rel).replace(/\\/g, '/');
  const parts = r.split('/');
  return parts.length === 2 && parts[0] === spec.dir && spec.files.has(parts[1]);
}

function addedNamesForSpec(records, spec) {
  const out = new Set();
  for (const r of records || []) {
    if (r.status !== 'A' && r.status !== 'C') continue;
    const rel = String(r.rel).replace(/\\/g, '/');
    const parts = rel.split('/');
    if (parts.length === 2 && parts[0] === spec.dir) out.add(parts[1]);
  }
  return out;
}

function enforceExactAdditionGroup(records, spec, required, violations) {
  const got = addedNamesForSpec(records, spec);
  for (const f of required) if (!got.has(f)) violations.push(`${spec.dir}/${f}: required review-stage companion missing from this transition`);
  for (const f of got) if (!required.has(f)) violations.push(`${spec.dir}/${f}: unexpected file in exact review-stage addition group`);
}

// records: [{ status, rel, srcRel? }] scoped to ONE task root, root-relative.
export function checkStageTransition({ records, baseState, headState, taskExistsAtBase }) {
  const violations = [];
  const isCreation = !taskExistsAtBase || baseState === null || baseState === undefined;

  if (!isState(headState)) return { ok: false, violations: [`head TASK_STATE.state is not canonical: ${JSON.stringify(headState)}`] };

  if (isCreation) {
    // V3-C5 — exact deterministic skeleton, additions only, head PREPARED.
    if (headState !== 'PREPARED') violations.push(`new task root must be created at PREPARED, got ${headState}`);
    for (const r of records) if (r.status !== 'A') violations.push(`${r.rel}: new task creation admits additions only (got ${r.status})`);
    const expected = new Set(canonicalSkeletonFiles());
    const got = new Set(records.map((r) => String(r.rel).replace(/\\/g, '/')));
    for (const f of got) if (!expected.has(f)) violations.push(`${f}: not part of the deterministic factory skeleton`);
    for (const f of expected) if (!got.has(f)) violations.push(`${f}: required skeleton file missing from creation`);
    return { ok: violations.length === 0, violations };
  }

  if (!isState(baseState)) violations.push(`base TASK_STATE.state is not canonical: ${JSON.stringify(baseState)}`);
  else if (baseState !== headState && !canTransition(baseState, headState)) violations.push(`disallowed state transition ${baseState} -> ${headState}`);

  for (const r of records) {
    const rel = String(r.rel).replace(/\\/g, '/');
    if (rel === 'TASK_STATE.json') {
      if (r.status === 'A' || r.status === 'M') continue;
      violations.push(`TASK_STATE.json: only add/modify permitted (got ${r.status})`);
      continue;
    }
    if (r.status === 'R') { violations.push(`${r.srcRel} -> ${rel}: rename of governed content is not append-only`); continue; }
    if (r.status === 'D' || r.status === 'M' || r.status === 'T') { violations.push(`${rel}: modification/deletion of a closed/earlier stage is not permitted (${r.status})`); continue; }
    if (r.status === 'A' || r.status === 'C') {
      // V3-C6 — additions/copies must be exactly the files this transition may add.
      if (allowedAdd(headState, rel)) continue;
      violations.push(`${rel}: not an exact permitted ${r.status === 'C' ? 'copy' : 'addition'} for state ${headState}`);
      continue;
    }
    violations.push(`${rel}: unsupported change status ${r.status}`);
  }

  // Correction 035 — a review mutation is atomic. Entry into SOURCE_TRUTH_REVIEWED
  // always requires the complete pair; any later attempt to add/repair either review
  // artifact must also present the exact pair and therefore cannot hide an invalid
  // earlier historical head.
  const spec = STAGE_ADD_ALLOW[headState];
  if (spec?.exactAdditionGroup) {
    const got = addedNamesForSpec(records, spec);
    const enteringRequiredState = !!spec.requiredOnEntry && baseState !== headState;
    if (enteringRequiredState || got.size > 0) enforceExactAdditionGroup(records, spec, spec.exactAdditionGroup, violations);
  }

  return { ok: violations.length === 0, violations };
}

// V3-C9 — TASK_STATE.history must be append-only across trusted base/head blobs: the
// base history must be an exact prefix of the head history (prior entries may not be
// rewritten, deleted or reordered). Returns { ok, violations }.
export function checkHistoryAppendOnly(baseHistory, headHistory) {
  const violations = [];
  const b = Array.isArray(baseHistory) ? baseHistory : null;
  const h = Array.isArray(headHistory) ? headHistory : null;
  if (b === null) return { ok: true, violations }; // no base history to compare (creation)
  if (h === null) { violations.push('head TASK_STATE.history is missing or not an array'); return { ok: false, violations }; }
  if (h.length < b.length) { violations.push(`head history (${h.length}) shorter than base history (${b.length}) — entries removed`); return { ok: false, violations }; }
  for (let i = 0; i < b.length; i += 1) {
    if (JSON.stringify(b[i]) !== JSON.stringify(h[i])) violations.push(`history entry ${i} was rewritten/reordered`);
  }
  return { ok: violations.length === 0, violations };
}
