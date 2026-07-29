// ResearchOps Factory V1.1 — Owner-Audit Remediation 031, Remediation C.
//
// Full canonical validation of EVERY mutation-segment head (not only the final head), so a
// transient task mutation that later disappears from the cumulative tree cannot slip
// through: a segment head is materialized read-only at its exact trusted SHA and validated
// with the same canonical `validateTask` implementation used everywhere else. Plus an
// immutable identity projection frozen from the introduction head that every later head
// must match exactly.
//
// All environment access (temp dir, worktree add/remove, filesystem, the validator) is
// injected so fixtures can exercise materialization failure, validator exceptions and
// cleanup failure deterministically without a real repository. No temp path is ever taken
// from task content or user input; the CLI supplies an OS-generated path.

// The immutable identity fields frozen from the introduction segment head. Any later
// mutation head that differs on any of these is rejected at the commit where it differs,
// even if a later commit restores the original value.
export const IDENTITY_PROJECTION_FIELDS = [
  'schemaVersion', 'factoryVersion', 'taskId', 'project', 'countryCode',
  'exchangeId', 'batchId', 'priority', 'createdAt', 'branch', 'requiredResearchInventory',
];

// States that require a complete, valid eleven-file research package to be present at the
// exact commit (the same-state repair rule: a package-requiring state with an incomplete
// package is invalid even if a later same-state commit completes it).
export function stateRequiresPackage(state) {
  return state != null && state !== 'PREPARED' && state !== 'BLOCKED';
}

export function checkIdentityProjection(introState, headState, sha) {
  const violations = [];
  if (!introState || typeof introState !== 'object') { violations.push('missing introduction TASK_STATE for identity projection'); return { ok: false, violations }; }
  if (!headState || typeof headState !== 'object') { violations.push(`missing TASK_STATE at mutation head ${sha}`); return { ok: false, violations }; }
  for (const f of IDENTITY_PROJECTION_FIELDS) {
    if (JSON.stringify(introState[f]) !== JSON.stringify(headState[f])) {
      violations.push(`immutable identity field '${f}' changed at mutation head ${sha}`);
    }
  }
  return { ok: violations.length === 0, violations };
}

// Materialize the exact trusted SHA in a detached temporary worktree and run the canonical
// validator against the historical task directory. Fails closed on materialization
// failure, a missing/unreadable historical task root, a validator exception, any failed
// canonical check, or a cleanup failure. Cleanup runs in `finally`; a cleanup failure is
// recorded and (fail-closed) blocks, but can never turn an already-failed validation into
// success.
//
// deps: {
//   mkdtemp() -> tempDir (OS-generated),
//   worktreeAdd(dir, sha)  (throws on failure),
//   worktreeRemove(dir)    (throws on failure),
//   pathJoin(a, b) -> path,
//   existsFn(path) -> bool,
//   readStateFn(taskDir) -> declared state string (throws if unreadable),
//   validateTaskFn(taskDir, opts) -> report { ok, total, passed, failed, checks },
// }
export function materializeAndValidate({ sha, taskRoot, deps }) {
  const res = { ok: false, sha, violations: [], summary: null, cleanupError: null };
  let dir = null;
  let materialized = false;
  try {
    try { dir = deps.mkdtemp(); } catch { res.violations.push(`temp directory creation failed for historical head ${sha}`); return res; }
    if (!dir) { res.violations.push(`temp directory creation returned no path for ${sha}`); return res; }
    try { deps.worktreeAdd(dir, sha); materialized = true; }
    catch { res.violations.push(`historical materialization (worktree add) failed at ${sha}`); return res; }

    const taskDir = deps.pathJoin(dir, taskRoot);
    if (!deps.existsFn(taskDir)) { res.violations.push(`historical task root missing on disk at ${sha}`); return res; }

    let state;
    try { state = deps.readStateFn(taskDir); }
    catch { res.violations.push(`historical TASK_STATE unreadable at ${sha}`); return res; }

    const requirePackage = stateRequiresPackage(state);
    let report;
    try { report = deps.validateTaskFn(taskDir, { requirePackage }); }
    catch { res.violations.push(`historical validator threw at ${sha}`); return res; }

    res.summary = report ? { total: report.total, passed: report.passed, failed: report.failed, requirePackage } : null;
    if (!report || report.ok !== true) {
      const failed = (report && Array.isArray(report.checks)) ? report.checks.filter((c) => !c.ok).map((c) => c.name).slice(0, 6) : [];
      res.violations.push(`historical validation failed at ${sha}: ${failed.join('; ') || 'no report'}`);
    }
    return res;
  } finally {
    if (materialized && dir) {
      try { deps.worktreeRemove(dir); }
      catch { res.cleanupError = `temporary worktree cleanup failed at ${sha}`; res.violations.push(res.cleanupError); }
    }
    res.ok = res.violations.length === 0;
  }
}

// Validate the whole resolved chain's historical heads + identity projection. `heads` is
// [{ sha, introduction, fullState }] in chronological order (introduction first). Returns
// { ok, results, violations } where results carry per-head evidence.
export function validateHistoricalChain({ heads, taskRoot, deps }) {
  const violations = [];
  const results = [];
  const introHead = heads.find((h) => h.introduction) || heads[0];
  const introState = introHead ? introHead.fullState : null;
  for (const h of heads) {
    const mv = materializeAndValidate({ sha: h.sha, taskRoot, deps });
    for (const v of mv.violations) violations.push(v);
    if (!h.introduction) {
      const ip = checkIdentityProjection(introState, h.fullState, h.sha);
      for (const v of ip.violations) violations.push(v);
    }
    results.push({ sha: h.sha, introduction: !!h.introduction, ok: mv.ok, summary: mv.summary, cleanupError: mv.cleanupError });
  }
  return { ok: violations.length === 0, results, violations };
}
