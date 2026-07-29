// ResearchOps Factory V1.1 — trusted task-root mutation-chain resolution.
// Correction 030 (topology) + Owner-Audit Remediation 031 (typed Git access, explicit
// segment-diff result). Layer B of research-task boundary enforcement: when a task root
// is absent at the trusted PR base the cumulative diff misclassifies the whole root as a
// fresh creation, so the task's ACTUAL mutation history is derived from trusted Git
// objects by walking the head's FIRST-PARENT ancestry and recording only the commits
// whose task-root TREE object changes.
//
// Pure and dependency-free: all Git access is injected as typed accessor callbacks so the
// same logic runs over synthetic deterministic graphs in fixtures and real Git objects in
// the CLI. Only tree identity and first-parent topology are trusted — never commit
// messages, authors, timestamps, comments, PR body, mutable task fields, environment SHAs,
// or `HEAD^` as a shortcut.
//
// R031-B — typed accessors distinguish VALUE / LEGITIMATE_ABSENCE / ACCESS_ERROR so a Git
// command failure can never masquerade as a root commit, an absent task root, or a
// non-merge. Any accessor error fails the chain closed.
//
//   commitParents(sha) -> { ok:true, parents:[<sha>...] } | { ok:false, error }
//     parents.length === 0 is a TRUE root commit; >1 is a merge. A failure is ok:false.
//   treeOid(sha)       -> { ok:true, present:true, oid } | { ok:true, present:false }
//                         | { ok:false, error }
//     present:false is a TRUE missing path; a lookup failure is ok:false.
//
// Returns { ok, segments, violations, headTreeMatchesFinal }; each segment is
//   { baseSha, headSha, introduction, baseTree, headTree } in chronological order.

export function resolveMutationChain({ headSha, commitParents, treeOid, maxDepth = 1000000 }) {
  const done = (violations, extra = {}) => ({ ok: violations.length === 0, segments: extra.segments || [], violations, headTreeMatchesFinal: extra.headTreeMatchesFinal ?? false });
  if (!headSha) return done(['no trusted head SHA supplied']);

  const th = treeOid(headSha);
  if (!th.ok) return done([`git access error reading task-root tree at head ${headSha}: ${th.error || 'unknown'}`]);
  if (!th.present) return done(['task root is absent at the trusted head']);
  const headTree = th.oid;

  // Walk the COMPLETE trusted first-parent history and record every edge across which the
  // task-root tree changes. Walking the whole chain (not stopping at the first ABSENT
  // boundary) is required to fail closed on a deletion + re-introduction or any parallel
  // history. `treeC` is carried across iterations so each commit's tree is read once.
  const edgesHeadFirst = [];
  let c = headSha; let treeC = headTree; let steps = 0;

  while (c && steps < maxDepth) {
    steps += 1;
    const cp = commitParents(c);
    if (!cp.ok) return done([`git access error reading parents of ${c}: ${cp.error || 'unknown'}`]);
    const parents = Array.isArray(cp.parents) ? cp.parents : null;
    if (parents === null) return done([`git access error: malformed parent list for ${c}`]);
    const p = parents.length > 0 ? parents[0] : null;
    let treeP = null;
    if (p) {
      const tp = treeOid(p);
      if (!tp.ok) return done([`git access error reading task-root tree at ${p}: ${tp.error || 'unknown'}`]);
      treeP = tp.present ? tp.oid : null;
    }
    if (treeC !== treeP) {
      if (parents.length > 1) {
        // A merge commit that changes the task-root tree has no deterministic unique
        // predecessor here — fail closed (rejecting root-changing merges is preferred).
        return done([`root-changing merge commit ${c}: ambiguous task predecessor — fail closed`]);
      }
      edgesHeadFirst.push({ baseSha: p, headSha: c, baseTree: treeP, headTree: treeC });
    }
    if (!p) break;
    c = p; treeC = treeP;
  }
  if (steps >= maxDepth) return done(['first-parent walk exceeded maxDepth — fail closed']);

  const edges = edgesHeadFirst.reverse();
  if (edges.length === 0) return done(['no task-root mutation found in trusted first-parent history']);
  const deletions = edges.filter((e) => e.headTree == null);
  if (deletions.length) return done([`task-root deletion/removal in trusted history at ${deletions[0].headSha} — fail closed`]);
  const introductions = edges.filter((e) => e.baseTree == null);
  if (introductions.length !== 1) return done([`expected exactly one task-root introduction, found ${introductions.length} — re-introduction/parallel history, fail closed`]);
  if (edges[0].baseTree != null) return done(['earliest task-root edge is not an ABSENT -> introduction — fail closed']);
  for (let i = 1; i < edges.length; i += 1) {
    if (edges[i].baseTree !== edges[i - 1].headTree) return done([`non-contiguous task-root tree between ${edges[i - 1].headSha} and ${edges[i].headSha} — fail closed`]);
  }
  const headTreeMatchesFinal = edges[edges.length - 1].headTree === headTree;
  const violations = [];
  if (!headTreeMatchesFinal) violations.push('trusted head task-root tree does not equal the final mutation segment head tree');
  const segments = edges.map((e) => ({ baseSha: e.baseSha, headSha: e.headSha, introduction: e.baseTree == null, baseTree: e.baseTree, headTree: e.headTree }));
  return { ok: violations.length === 0, segments, violations, headTreeMatchesFinal };
}

// R031-B — build typed accessors from a single Git runner `runGit(args) -> { ok, out }`
// where ok reflects a zero exit code. Distinguishes VALUE / ABSENCE / ACCESS_ERROR.
export function gitAccessors(runGit, root) {
  const commitParents = (sha) => {
    const r = runGit(['rev-list', '--parents', '-n', '1', sha]);
    if (!r || !r.ok) return { ok: false, error: `rev-list --parents failed for ${sha}` };
    const line = String(r.out || '').trim();
    if (line === '') return { ok: false, error: `empty rev-list output for ${sha}` };
    const toks = line.split(/\s+/);
    if (!/^[0-9a-f]{7,64}$/i.test(toks[0])) return { ok: false, error: `malformed rev-list output for ${sha}` };
    return { ok: true, parents: toks.slice(1) };
  };
  const treeOid = (sha) => {
    const r = runGit(['ls-tree', '--full-tree', sha, '--', root]);
    if (!r || !r.ok) return { ok: false, error: `ls-tree failed for ${sha}` };
    const out = String(r.out || '').replace(/\n$/, '');
    if (out.trim() === '') return { ok: true, present: false };
    const m = /^(\d{6})\s+(\w+)\s+([0-9a-f]{40,64})\t/.exec(out);
    if (!m) return { ok: false, error: `malformed ls-tree output for ${sha}` };
    if (m[2] !== 'tree') return { ok: false, error: `task root at ${sha} is not a tree (type=${m[2]})` };
    return { ok: true, present: true, oid: m[3] };
  };
  return { commitParents, treeOid };
}

// R031-A — pure scoping of a root-scoped NUL name-status diff into stage-transition
// records ({ status, rel, srcRel? }). Returns an EXPLICIT result so a Git failure or a
// malformed stream can never be silently converted into an empty (valid) record set. A
// genuinely empty successful diff is { ok:true, records:[] } and remains distinguishable
// from failure. `runResult` is { ok, out } from the Git runner; `parseZ` is the trusted
// NUL name-status parser (injected to keep this module dependency-free).
export function scopeSegmentDiff(runResult, root, parseZ) {
  if (!runResult || !runResult.ok) return { ok: false, errorCode: 'DIFF_FAILED', detail: `git diff failed for ${root}` };
  const relOf = (p) => String(p).replace(/\\/g, '/').slice(root.length + 1);
  const inRoot = (p) => String(p).replace(/\\/g, '/').startsWith(`${root}/`);
  const scoped = [];
  for (const r of parseZ(String(runResult.out || ''))) {
    if (r.malformed) return { ok: false, errorCode: 'MALFORMED_DIFF', detail: r.malformed };
    if (r.status === 'R' || r.status === 'C') {
      if (r.dst && inRoot(r.dst)) scoped.push({ status: r.status, rel: relOf(r.dst), srcRel: r.src ? relOf(r.src) : undefined });
    } else if (r.dst && inRoot(r.dst)) {
      scoped.push({ status: r.status, rel: relOf(r.dst) });
    }
  }
  return { ok: true, records: scoped };
}
