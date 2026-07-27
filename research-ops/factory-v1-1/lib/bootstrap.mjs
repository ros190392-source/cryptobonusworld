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

// Verify the one-time BOOTSTRAP owner setup phase (approvedBase -> frozenSetup)
// introduced EXACTLY the anchored setup files, additions only. records: parsed
// name-status of that range.
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

// ---------------------------------------------------------------------------
// R2 — GENERIC descendant owner-setup phase. A normal new governed factory task is
// created on a protected base that already carries the V4 policy. Its owner setup phase
// introduces exactly three role-specific setup records (a contract, a state and a Claude
// prompt) under the task's result directory, before any implementation/result commit.
// These functions derive that expected inventory from canonical naming rules and locate
// the UNIQUE frozen owner-setup boundary commit deterministically. Pure — the CLI feeds
// the per-commit Git name-status data.
// ---------------------------------------------------------------------------

const norm = (p) => String(p).replace(/\\/g, '/');

// Canonical setup-record naming rule for a task result directory: exactly one
// `<PREFIX>_CONTRACT.md`, one `<PREFIX>_STATE.json`, one `CLAUDE_<PREFIX>_PROMPT.md`,
// directly under the result directory.
export function classifyCanonicalSetupBase(base) {
  if (/^CLAUDE_[A-Z0-9_]+_PROMPT\.md$/.test(base)) return 'prompt';
  if (/^[A-Z0-9_]+_CONTRACT\.md$/.test(base)) return 'contract';
  if (/^[A-Z0-9_]+_STATE\.json$/.test(base)) return 'state';
  return null;
}
export function isCanonicalSetupPath(path, resultDir) {
  const p = norm(path);
  if (!p.startsWith(resultDir)) return false;
  const rest = p.slice(resultDir.length);
  return !rest.includes('/') && classifyCanonicalSetupBase(rest) !== null;
}

// Verify a descendant setup-phase diff added EXACTLY the canonical setup triple under the
// task result directory, additions only, and nothing else. records: name-status of
// approvedBase -> frozenSetup.
export function checkDescendantSetupPhase(records, resultDir) {
  const v = [];
  const kinds = { contract: 0, state: 0, prompt: 0 };
  let total = 0;
  for (const r of records) {
    if (r.malformed) { v.push(`setup phase: ${r.malformed}`); continue; }
    if (r.status !== 'A') v.push(`${(r.dst || (r.paths || []).join(','))}: setup phase must be additions only (got ${r.status})`);
    for (const p of (r.paths || [])) {
      total += 1;
      const np = norm(p);
      if (!np.startsWith(resultDir)) { v.push(`${np}: outside the task result directory in the setup phase`); continue; }
      const rest = np.slice(resultDir.length);
      if (rest.includes('/')) { v.push(`${np}: nested path not allowed in the setup phase`); continue; }
      const k = classifyCanonicalSetupBase(rest);
      if (!k) { v.push(`${np}: not a canonical owner setup record (expected *_CONTRACT.md / *_STATE.json / CLAUDE_*_PROMPT.md)`); continue; }
      kinds[k] += 1;
    }
  }
  for (const k of ['contract', 'state', 'prompt']) if (kinds[k] !== 1) v.push(`expected exactly one canonical ${k} setup record, found ${kinds[k]}`);
  if (total !== 3) v.push(`setup phase must add exactly 3 governed setup records, found ${total}`);
  return { ok: v.length === 0, violations: v };
}

// Locate the UNIQUE frozen owner-setup boundary commit in a range. commits is the
// ordered list (approvedBase..head, oldest first) of { sha, records } where records is
// the parsed name-status of that commit. A setup-only commit adds only canonical setup
// records under resultDir. The frozen setup boundary is the last commit of the maximal
// initial run of setup-only commits; the setup records must not be touched afterward and
// no implementation/result file may appear before it. Returns { ok, frozenSetupSha, violations }.
export function discoverFrozenSetupBoundary(commits, resultDir) {
  const v = [];
  const isSetupOnly = (c) => Array.isArray(c.records) && c.records.length > 0
    && c.records.every((r) => !r.malformed && r.status === 'A' && (r.paths || []).length > 0
      && (r.paths || []).every((p) => isCanonicalSetupPath(p, resultDir)));

  let i = 0;
  while (i < commits.length && isSetupOnly(commits[i])) i += 1;
  if (i === 0) {
    // Either the first commit mixes worker/impl files, or there is no setup commit.
    v.push('no unique owner setup-only boundary at the start of the range (implementation/result file before the frozen setup, or missing setup)');
    return { ok: false, frozenSetupSha: null, violations: v };
  }
  const frozenSetupSha = commits[i - 1].sha;

  // Aggregate the setup-phase additions and validate the exact canonical triple.
  const setupRecords = [];
  for (const c of commits.slice(0, i)) for (const r of c.records) setupRecords.push(r);
  const phase = checkDescendantSetupPhase(setupRecords, resultDir);
  for (const e of phase.violations) v.push(e);

  // No setup record may be created/modified/deleted after the boundary (freeze), and no
  // second setup boundary may appear later (ambiguity / multiple candidates).
  for (const c of commits.slice(i)) {
    for (const r of (c.records || [])) {
      for (const p of (r.paths || [])) {
        if (isCanonicalSetupPath(p, resultDir)) v.push(`${norm(p)}: owner setup record changed after the frozen setup boundary (${c.sha.slice(0, 12)})`);
      }
    }
  }
  return { ok: v.length === 0, frozenSetupSha, violations: v };
}
