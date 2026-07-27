// ResearchOps Factory V1.1 — one-time V4 trusted-enforcement bootstrap anchor and the
// frozen owner-setup phase boundary (CI Remediation R1). Pure and deterministic.
//
// Problem: the approved base of the V4 transition PR (07d0e38) predates the V4 policy
// modules, so the "run the validator from the protected base" design cannot bootstrap
// itself for the exact PR that introduces V4. This module provides a documented,
// fail-closed exception:
//
//   - DESCENDANT: whenever the approved base already carries the V4 policy (every normal
//     PR after V4, including Final Acceptance 017), the validator is run from the
//     protected base — no bootstrap is used.
//   - BOOTSTRAP: used ONLY for the exact anchored remediation range (this issue/PR/head/
//     base/approved-base/frozen-setup). It is pinned to immutable commit SHAs, read-only,
//     validates only its own range, and cannot authorize any other task or future branch.
//   - REJECT: anything else fails closed.
//
// The anchor is owner-scoped data (bound to Issue #60 / PR #61). It grants no
// authorization by itself — it only selects which trusted policy source validates the
// exact remediation range.

export const BOOTSTRAP_ANCHOR = {
  taskId: 'CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTION-V4-016',
  issue: 60,
  pullRequest: 61,
  headBranch: 'correction/researchops-factory-v1-1-v4-016',
  baseBranch: 'validation/researchops-factory-v1-1-v3-015',
  approvedBaseSha: '07d0e38a540355244b2bcab0258d3eb5463ed1af',
  frozenSetupSha: '063078ac56423d3ab3544f17e69b09ed4bdc6d9e',
  // The exact owner-created setup files introduced in the setup phase (approvedBase ->
  // frozenSetup). Nothing else may change in that phase; they are immutable afterward.
  setupFiles: [
    'research-ops/factory-v1-1/correction-v4-016/CLAUDE_CORRECTION_V4_PROMPT.md',
    'research-ops/factory-v1-1/correction-v4-016/CORRECTION_V4_CONTRACT.md',
    'research-ops/factory-v1-1/correction-v4-016/CORRECTION_V4_STATE.json',
  ],
  readOnly: true,
};

// Decide the trusted enforcement source for a run. Fail closed.
// ctx: { baseHasV4Policy, issue, pullRequest, headBranch, baseBranch, approvedBaseSha,
//        frozenSetupSha, headDescendsApprovedBase, headDescendsFrozenSetup }
export function resolveEnforcement(ctx = {}) {
  if (ctx.baseHasV4Policy === true) {
    return { mode: 'DESCENDANT', reason: 'approved base carries the V4 policy; run the validator from the protected base' };
  }
  const a = BOOTSTRAP_ANCHOR;
  const v = [];
  if (Number(ctx.issue) !== a.issue) v.push(`issue ${ctx.issue} != ${a.issue}`);
  if (Number(ctx.pullRequest) !== a.pullRequest) v.push(`PR ${ctx.pullRequest} != ${a.pullRequest}`);
  if (ctx.headBranch !== a.headBranch) v.push(`head branch ${ctx.headBranch} != ${a.headBranch}`);
  if (ctx.baseBranch !== a.baseBranch) v.push(`base branch ${ctx.baseBranch} != ${a.baseBranch}`);
  if (ctx.approvedBaseSha !== a.approvedBaseSha) v.push(`approved base SHA ${ctx.approvedBaseSha} != ${a.approvedBaseSha}`);
  if (ctx.frozenSetupSha !== undefined && ctx.frozenSetupSha !== a.frozenSetupSha) v.push(`frozen setup SHA ${ctx.frozenSetupSha} != ${a.frozenSetupSha}`);
  if (ctx.headDescendsApprovedBase === false) v.push('head does not descend the approved base');
  if (ctx.headDescendsFrozenSetup === false) v.push('head does not descend the frozen setup');
  if (v.length) return { mode: 'REJECT', reason: `bootstrap anchor mismatch (fail closed): ${v.join('; ')}` };
  return { mode: 'BOOTSTRAP', reason: 'one-time V4 bootstrap anchor matched; validate only this exact remediation range from the verified head policy' };
}

// Verify the owner setup phase (approvedBase -> frozenSetup) introduced EXACTLY the
// governed setup files, additions only. records: parsed name-status of that range.
export function checkSetupPhase(records) {
  const v = [];
  const changed = [];
  for (const r of records) {
    if (r.malformed) { v.push(`setup phase: ${r.malformed}`); continue; }
    if (r.status !== 'A') v.push(`${(r.dst || (r.paths || []).join(','))}: setup phase must be additions only (got ${r.status})`);
    for (const p of (r.paths || [])) changed.push(String(p).replace(/\\/g, '/'));
  }
  const want = new Set(BOOTSTRAP_ANCHOR.setupFiles);
  for (const p of changed) if (!want.has(p)) v.push(`${p}: not a governed owner setup file`);
  for (const p of want) if (!changed.includes(p)) v.push(`${p}: required setup file missing from the setup phase`);
  return { ok: v.length === 0, violations: v };
}
