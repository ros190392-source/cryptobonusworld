// ResearchOps Factory V1.1 — identity-bound higher-stage marker integrity.
// V2-C10 identity binding; V3-C6 exactly-one candidate; V3-C7 controlled
// outcome enums; V3-C12 canonical-text rejection; Correction 035 dual-output
// review; Correction 038A strict corrected-package binding. Fail-closed.

import { join } from 'node:path';
import { lstatSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { exists, readBuf, isValidUtf8, hasBOM, hasCR, hasForbiddenControls } from './util.mjs';
import { validateOwnerReceipt, enforceAuthFloor } from './authz.mjs';
import { verifyMergeRecord } from './mergeproof.mjs';
import { isPackageValid } from './package.mjs';
import { RESEARCH_FILES, FORBIDDEN_TRUE_AUTH_KEYS, OWNER_MERGE_KEY } from './model.mjs';

const REVIEW_OUTCOMES = new Set(['SOURCE_TRUTH_REVIEWED', 'CORRECTION_REQUIRED', 'NO_CORRECTION_REQUIRED', 'PROCEED_TO_VALIDATION']);
const CORRECTION_OUTCOMES = new Set(['CORRECTED', 'CORRECTED_READY_FOR_INDEPENDENT_VALIDATION']);
const VALIDATION_OUTCOMES = new Set(['VALIDATED_FOR_OWNER_MERGE_REVIEW', 'VALIDATED_WITH_CORRECTIONS_REQUIRED', 'VALIDATION_BLOCKED', 'VALIDATED_FOR_RESEARCH_RECORD_CLOSEOUT', 'VALIDATED_WITH_NONBLOCKING_NOTES']);
const MERGE_STATES = new Set(['RESEARCH_RECORD_MERGED_TO_MAIN']);

export const REVIEW_MARKER = {
  dir: '50-source-truth-review',
  anyOf: ['SOURCE_TRUTH_REVIEW.json'],
  kind: 'json',
  outcomeKeys: ['outcome', 'reviewOutcome'],
  enum: REVIEW_OUTCOMES,
  requiredCompanions: ['SOURCE_TRUTH_REVIEW.md'],
  allowedStageFiles: ['.gitkeep', 'SOURCE_TRUTH_REVIEW.json', 'SOURCE_TRUTH_REVIEW.md'],
};
// Legacy CORRECTION_RESULT.json remains readable, but Correction 038A stage rules
// do not permit creating it on a new CORRECTED transition. New strict records use
// CORRECTION_STATE.json and must bind a complete corrected package.
export const CORRECTION_MARKER = {
  dir: '60-correction',
  anyOf: ['CORRECTION_STATE.json', 'CORRECTION_RESULT.json'],
  kind: 'correction',
  outcomeKeys: ['outcome', 'correctionOutcome'],
  enum: CORRECTION_OUTCOMES,
  allowedStageFiles: ['.gitkeep', 'CORRECTION_STATE.json', 'CORRECTION_RESULT.json', '20-corrected-output'],
};
export const VALIDATION_MARKER = { dir: '70-validation', anyOf: ['VALIDATION.json', 'FACTORY_VALIDATION.json', 'CORRECTION_V2_VALIDATION.json', 'CORRECTION_V3_VALIDATION.json'], kind: 'json', outcomeKeys: ['outcome', 'validationOutcome'], enum: VALIDATION_OUTCOMES };
export const CLOSEOUT_MARKER = { dir: '80-closeout', anyOf: ['OWNER_CLOSEOUT_RECEIPT.json'], kind: 'receipt' };
export const MERGE_MARKER = { dir: '80-closeout', anyOf: ['RESEARCH_RECORD_MERGE.json', 'MERGE_RECORD.json'], kind: 'merge' };

const HEX40 = /^[0-9a-f]{40}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const sameArray = (a, b) => Array.isArray(a) && a.length === b.length && a.every((v, i) => v === b[i]);

function tryParse(buf) { try { return [JSON.parse(buf.toString('utf8')), null]; } catch (e) { return [null, e.message]; } }

function readCanonicalBytes(p, label) {
  if (!exists(p)) return { ok: false, reason: `${label}: required file missing`, buf: null };
  let st;
  try { st = lstatSync(p); } catch (e) { return { ok: false, reason: `${label}: lstat failed (${e.message})`, buf: null }; }
  if (st.isSymbolicLink()) return { ok: false, reason: `${label}: symlink file not allowed`, buf: null };
  if (!st.isFile()) return { ok: false, reason: `${label}: non-regular file`, buf: null };
  if ((st.mode & 0o111) !== 0) return { ok: false, reason: `${label}: executable file not allowed`, buf: null };
  const buf = readBuf(p);
  if (buf.length === 0) return { ok: false, reason: `${label}: zero-byte file`, buf: null };
  if (!isValidUtf8(buf)) return { ok: false, reason: `${label}: invalid UTF-8`, buf: null };
  if (hasBOM(buf) || hasCR(buf) || hasForbiddenControls(buf)) return { ok: false, reason: `${label}: non-canonical control bytes/encoding`, buf: null };
  return { ok: true, reason: '', buf };
}

function readMarkerObject(p, label) {
  const rd = readCanonicalBytes(p, label);
  if (!rd.ok) return { ok: false, reason: rd.reason, obj: null };
  const [obj, err] = tryParse(rd.buf);
  if (err) return { ok: false, reason: `${label}: not parseable JSON (${err})`, obj: null };
  return { ok: true, reason: '', obj };
}

function validateCompanionsAndInventory(taskDir, spec) {
  for (const f of spec.requiredCompanions || []) {
    const label = `${spec.dir}/${f}`;
    const rd = readCanonicalBytes(join(taskDir, spec.dir, f), label);
    if (!rd.ok) return { ok: false, reason: rd.reason };
  }
  if (Array.isArray(spec.allowedStageFiles)) {
    let entries;
    try { entries = readdirSync(join(taskDir, spec.dir)); }
    catch (e) { return { ok: false, reason: `${spec.dir}: cannot read stage inventory (${e.message})` }; }
    const allowed = new Set(spec.allowedStageFiles);
    const extra = entries.filter((f) => !allowed.has(f)).sort();
    if (extra.length) return { ok: false, reason: `${spec.dir}: unexpected stage files [${extra.join(', ')}]` };
  }
  return { ok: true, reason: '' };
}

const markerId = (obj) => (obj && typeof obj === 'object' ? (obj.taskId ?? obj.validationTaskId ?? obj.correctionTaskId) : undefined);

function validateStrictCorrectionState(taskDir, obj, taskId) {
  const errors = [];
  const expectedOutput = '60-correction/20-corrected-output';
  if (obj.outputDirectory !== expectedOutput) errors.push(`outputDirectory must be ${expectedOutput}`);
  if (!sameArray(obj.requiredOutputFiles, RESEARCH_FILES)) errors.push('requiredOutputFiles must equal the canonical eleven-file inventory in canonical order');
  if (obj.exactOutputFileCount !== RESEARCH_FILES.length) errors.push(`exactOutputFileCount must be ${RESEARCH_FILES.length}`);
  if (!HEX40.test(String(obj.sourceReviewHeadSha || ''))) errors.push('sourceReviewHeadSha must be a 40-hex commit SHA');
  if (obj.sourceReviewOutcome !== 'ACCEPT_WITH_CORRECTIONS_REQUIRED') errors.push('sourceReviewOutcome must be ACCEPT_WITH_CORRECTIONS_REQUIRED');
  if (!HEX64.test(String(obj.reviewSha256 || ''))) errors.push('reviewSha256 must be a 64-hex SHA-256');
  if (!HEX64.test(String(obj.correctedManifestSha256 || ''))) errors.push('correctedManifestSha256 must be a 64-hex SHA-256');
  if (!Array.isArray(obj.appliedCorrectionIds) || obj.appliedCorrectionIds.length === 0 || new Set(obj.appliedCorrectionIds).size !== obj.appliedCorrectionIds.length || obj.appliedCorrectionIds.some((x) => typeof x !== 'string' || x.length === 0)) errors.push('appliedCorrectionIds must be a non-empty unique string array');
  if (obj.correctionsApplied !== undefined && obj.correctionsApplied !== obj.appliedCorrectionIds?.length) errors.push('correctionsApplied must equal appliedCorrectionIds length');

  const auth = obj.authorizations;
  const requiredAuth = [OWNER_MERGE_KEY, ...FORBIDDEN_TRUE_AUTH_KEYS];
  if (!auth || typeof auth !== 'object' || Array.isArray(auth)) errors.push('authorizations must be an object');
  else for (const k of requiredAuth) if (auth[k] !== false) errors.push(`authorizations.${k} must be explicitly false`);
  const floor = enforceAuthFloor(obj, {});
  if (!floor.ok) errors.push(...floor.violations);

  const review = readCanonicalBytes(join(taskDir, '50-source-truth-review', 'SOURCE_TRUTH_REVIEW.json'), '50-source-truth-review/SOURCE_TRUTH_REVIEW.json');
  if (!review.ok) errors.push(review.reason);
  else if (sha256(review.buf) !== obj.reviewSha256) errors.push('reviewSha256 does not match SOURCE_TRUTH_REVIEW.json');

  const correctedDir = join(taskDir, '60-correction', '20-corrected-output');
  const pkg = isPackageValid(correctedDir);
  if (!pkg.ok) {
    const bad = pkg.checks.filter((c) => !c.ok).slice(0, 8).map((c) => c.name).join(', ');
    errors.push(`corrected package invalid${bad ? ` (${bad})` : ''}`);
  }
  const manifest = readCanonicalBytes(join(correctedDir, 'MANIFEST.txt'), '60-correction/20-corrected-output/MANIFEST.txt');
  if (!manifest.ok) errors.push(manifest.reason);
  else if (sha256(manifest.buf) !== obj.correctedManifestSha256) errors.push('correctedManifestSha256 does not match corrected MANIFEST.txt');

  if (markerId(obj) !== taskId) errors.push(`correction marker taskId ${JSON.stringify(markerId(obj))} != ${taskId}`);
  return { ok: errors.length === 0, errors };
}

// Validate one stage marker. V3-C6: exactly one candidate must exist.
// opts.mergeFacts supplies read-only repository facts for merge records.
export function validateMarker(taskDir, spec, taskId, opts = {}) {
  const present = spec.anyOf.filter((f) => exists(join(taskDir, spec.dir, f)));
  if (present.length === 0) return { ok: false, reason: `missing ${spec.dir}/{${spec.anyOf.join(' | ')}}`, file: null };
  if (present.length > 1) return { ok: false, reason: `${spec.dir}: conflicting multiple marker candidates [${present.join(', ')}]`, file: null };
  const chosen = present[0];
  const label = `${spec.dir}/${chosen}`;
  const rd = readMarkerObject(join(taskDir, spec.dir, chosen), label);
  if (!rd.ok) return { ok: false, reason: rd.reason, file: chosen };

  const ci = validateCompanionsAndInventory(taskDir, spec);
  if (!ci.ok) return { ok: false, reason: ci.reason, file: chosen };

  const obj = rd.obj;
  if (spec.kind === 'receipt') {
    const v = validateOwnerReceipt(obj, taskId);
    if (!v.ok) return { ok: false, reason: `${label}: invalid owner receipt (${v.errors.join('; ')})`, file: chosen };
    return { ok: true, reason: '', file: chosen };
  }
  if (spec.kind === 'merge') {
    const v = verifyMergeRecord(obj, taskId, opts.mergeFacts || {});
    if (!v.ok) return { ok: false, reason: `${label}: ${v.errors.join('; ')}`, file: chosen };
    return { ok: true, reason: '', file: chosen };
  }

  if (markerId(obj) !== taskId) return { ok: false, reason: `${label}: marker taskId (${JSON.stringify(markerId(obj))}) != ${taskId}`, file: chosen };
  const val = (spec.outcomeKeys || []).map((k) => obj[k]).find((v) => v !== undefined);
  if (!spec.enum.has(val)) return { ok: false, reason: `${label}: outcome ${JSON.stringify(val)} is not a recognized ${spec.dir} outcome`, file: chosen };

  if (spec.kind === 'correction' && chosen === 'CORRECTION_STATE.json') {
    const strict = validateStrictCorrectionState(taskDir, obj, taskId);
    if (!strict.ok) return { ok: false, reason: `${label}: ${strict.errors.join('; ')}`, file: chosen };
  }
  // Legacy CORRECTION_RESULT.json remains readable only for pre-038A histories.
  return { ok: true, reason: '', file: chosen };
}

export function validateMarkers(taskDir, specs, taskId, opts = {}) {
  for (const spec of specs || []) {
    const r = validateMarker(taskDir, spec, taskId, opts);
    if (!r.ok) return { ok: false, reason: r.reason };
  }
  return { ok: true, reason: '' };
}
