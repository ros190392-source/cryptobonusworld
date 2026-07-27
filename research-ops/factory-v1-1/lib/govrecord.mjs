// ResearchOps Factory V1.1 — owner-created governed task records (V4-C3/C4).
// Authorization no longer comes from a mutable branch list in implementation code.
// Instead each governed task is authorized by its OWNER-CREATED setup record (its
// `*_STATE.json`), which exists on the APPROVED BASE tree before the task head changes.
// The boundary reads that record from the trusted base (never the PR head), so a task
// cannot self-authorize, a future task with no base record is not authorized, and a
// spoof branch without an owner record fails closed. The record binds task id, exact
// head/base branches and the approved base SHA; ancestry is verified separately.

// Fields that may carry the approved base SHA the task stacks on.
const BASE_SHA_FIELDS = ['approvedBaseSha', 'sourceValidationCommitSha', 'sourceCorrectionCommitSha', 'sourceValidationCommitSha'];

export function recordBaseSha(record) {
  for (const k of BASE_SHA_FIELDS) if (typeof record[k] === 'string' && record[k].length >= 7) return record[k];
  return null;
}

// Validate an owner governed record against trusted context.
// ctx: { headBranch, baseBranch, approvedBaseSha, expectedTaskId? }
// Returns { ok, errors, taskId, role }.
export function validateGovernedRecord(record, ctx = {}) {
  const e = [];
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { ok: false, errors: ['no owner-created governed record on the approved base'], taskId: null };
  }
  if (typeof record.taskId !== 'string' || record.taskId.length < 3) e.push('governed record taskId missing/invalid');
  if (ctx.expectedTaskId && record.taskId !== ctx.expectedTaskId) e.push(`governed record taskId (${record.taskId}) != ${ctx.expectedTaskId}`);
  if (record.branch !== ctx.headBranch) e.push(`governed record branch (${record.branch}) != trusted head branch (${ctx.headBranch})`);
  if (record.baseBranch !== ctx.baseBranch) e.push(`governed record baseBranch (${record.baseBranch}) != trusted base branch (${ctx.baseBranch})`);
  const recBase = recordBaseSha(record);
  if (!recBase) e.push('governed record does not pin an approved base SHA');
  else if (ctx.approvedBaseSha && recBase !== ctx.approvedBaseSha) e.push(`governed record approved base SHA (${recBase}) != trusted base SHA (${ctx.approvedBaseSha})`);
  return { ok: e.length === 0, errors: e, taskId: record.taskId || null };
}
