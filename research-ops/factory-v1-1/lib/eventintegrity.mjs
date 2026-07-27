// ResearchOps Factory V1.1 — checkout/event/workspace integrity (V4-C7) and V3
// recovery reconciliation (V4-C3). Pure and deterministic; the workflow/CLI collect the
// Git facts with fixed-argument subprocess calls and pass them here as data.

// facts: {
//   checkedOutHead, trustedHeadSha,           // must be equal when head content is read
//   workspace, resolvedРoot,                  // normalized paths must be equal
//   baseExists, headExists,                   // both commit objects present
//   headDescendsBase,                         // ancestry: head descends approved base
//   shallow,                                  // repository must not be shallow
//   diffBaseSha, diffHeadSha,                 // the evaluated diff endpoints
//   approvedBaseSha, expectedHeadSha,         // trusted endpoints
// }
export function checkEventIntegrity(facts = {}) {
  const v = [];
  const norm = (p) => String(p == null ? '' : p).replace(/\\/g, '/').replace(/\/+$/, '');
  if (facts.checkedOutHead !== undefined && facts.checkedOutHead !== facts.trustedHeadSha) {
    v.push(`checked-out HEAD (${facts.checkedOutHead}) != trusted event head SHA (${facts.trustedHeadSha})`);
  }
  if (facts.workspace !== undefined && norm(facts.workspace) !== norm(facts.resolvedRoot)) {
    v.push(`GITHUB_WORKSPACE (${facts.workspace}) != resolved worktree root (${facts.resolvedRoot})`);
  }
  if (facts.baseExists === false) v.push('trusted base commit object is missing');
  if (facts.headExists === false) v.push('trusted head commit object is missing');
  if (facts.shallow === true) v.push('shallow repository — full history required, fail closed');
  if (facts.headDescendsBase === false) v.push('head commit does not descend from the approved base SHA');
  if (facts.diffBaseSha !== undefined && facts.approvedBaseSha !== undefined && facts.diffBaseSha !== facts.approvedBaseSha) {
    v.push(`evaluated diff base (${facts.diffBaseSha}) != approved base SHA (${facts.approvedBaseSha})`);
  }
  if (facts.diffHeadSha !== undefined && facts.expectedHeadSha !== undefined && facts.diffHeadSha !== facts.expectedHeadSha) {
    v.push(`evaluated diff head (${facts.diffHeadSha}) != trusted head SHA (${facts.expectedHeadSha})`);
  }
  return { ok: v.length === 0, violations: v };
}

// V4-C3 — explicit reconciliation of transparent no-op recovery commits. A recovery
// range must be a bounded number of commits with an identical resulting tree.
// facts: { commitCount, baseTree, headTree, maxCommits? }
export function reconcileRecovery(facts = {}) {
  const v = [];
  const max = facts.maxCommits ?? 2;
  if (typeof facts.commitCount !== 'number' || facts.commitCount < 0) v.push('recovery commit count unknown');
  else if (facts.commitCount > max) v.push(`recovery range has ${facts.commitCount} commits (> ${max}) — not a transparent no-op`);
  if (!facts.baseTree || !facts.headTree || facts.baseTree !== facts.headTree) {
    v.push(`recovery range changes the tree (${facts.baseTree} -> ${facts.headTree}) — not a no-op`);
  }
  return { ok: v.length === 0, violations: v };
}
