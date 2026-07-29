// ResearchOps Factory V1.1 — trusted task-root mutation-chain resolution (Correction 030).
//
// Layer B of research-task boundary enforcement. When a task root is absent at the
// trusted PR base, its cumulative diff misclassifies the whole root as a fresh
// creation. This helper instead derives the task's ACTUAL mutation history from
// trusted Git objects by walking the trusted head's FIRST-PARENT ancestry and
// recording only the commits whose task-root TREE object changes.
//
// Pure and dependency-free: all Git access is injected as accessor callbacks so the
// same logic is exercised by synthetic deterministic graphs in fixtures and by real
// Git objects in the CLI. No commit messages, authors, timestamps, comments, PR body,
// mutable task fields or environment SHAs are ever trusted — only tree identity and
// first-parent topology.
//
// Accessors (all take a commit SHA):
//   firstParentOf(sha)  -> first-parent SHA, or null when sha is a root commit
//   parentCountOf(sha)  -> number of parents (>1 marks a merge commit)
//   treeOidAt(sha)      -> the task-root tree OID at sha, or null when the root is absent
//
// Returns { ok, segments, violations, headTreeMatchesFinal } where each segment is
//   { baseSha, headSha, introduction, baseTree, headTree }
// ordered chronologically (introduction first). A segment with introduction=true has a
// null baseTree (ABSENT -> introduced); every later segment mutates an existing root.

export function resolveMutationChain({ headSha, firstParentOf, parentCountOf, treeOidAt, maxDepth = 1000000 }) {
  const violations = [];
  if (!headSha) return { ok: false, segments: [], violations: ['no trusted head SHA supplied'], headTreeMatchesFinal: false };

  const headTree = treeOidAt(headSha);
  if (headTree == null) {
    return { ok: false, segments: [], violations: ['task root is absent at the trusted head'], headTreeMatchesFinal: false };
  }

  // Walk the COMPLETE trusted first-parent history and record every edge across which
  // the task-root tree object changes. Walking the whole chain (not stopping at the
  // first ABSENT boundary) is required to fail closed on a deletion + re-introduction or
  // any parallel/incomparable history. `treeC` is carried across iterations so each
  // commit's tree is read at most once.
  const edgesHeadFirst = [];
  let c = headSha;
  let treeC = headTree;
  let steps = 0;

  while (c && steps < maxDepth) {
    steps += 1;
    const p = firstParentOf(c);
    const treeP = p ? treeOidAt(p) : null;
    if (treeC !== treeP) {
      if ((parentCountOf(c) || 1) > 1) {
        // A merge commit that changes the task-root tree has no deterministic unique
        // predecessor here — fail closed (rejecting root-changing merges is preferred).
        violations.push(`root-changing merge commit ${c}: ambiguous task predecessor — fail closed`);
        return { ok: false, segments: [], violations, headTreeMatchesFinal: false };
      }
      edgesHeadFirst.push({ baseSha: p, headSha: c, baseTree: treeP, headTree: treeC });
    }
    if (!p) break;
    c = p; treeC = treeP;
  }
  if (steps >= maxDepth) return { ok: false, segments: [], violations: ['first-parent walk exceeded maxDepth — fail closed'], headTreeMatchesFinal: false };

  const edges = edgesHeadFirst.reverse();
  if (edges.length === 0) { violations.push('no task-root mutation found in trusted first-parent history'); return { ok: false, segments: [], violations, headTreeMatchesFinal: false }; }
  // A deletion (root present -> absent) of a governed task record is never valid.
  const deletions = edges.filter((e) => e.headTree == null);
  if (deletions.length) { violations.push(`task-root deletion/removal in trusted history at ${deletions[0].headSha} — fail closed`); return { ok: false, segments: [], violations, headTreeMatchesFinal: false }; }
  // Exactly one introduction (ABSENT -> present), and it must be the earliest edge.
  const introductions = edges.filter((e) => e.baseTree == null);
  if (introductions.length !== 1) { violations.push(`expected exactly one task-root introduction, found ${introductions.length} — re-introduction/parallel history, fail closed`); return { ok: false, segments: [], violations, headTreeMatchesFinal: false }; }
  if (edges[0].baseTree != null) { violations.push('earliest task-root edge is not an ABSENT -> introduction — fail closed'); return { ok: false, segments: [], violations, headTreeMatchesFinal: false }; }
  // Tree continuity: each later edge's base tree equals the previous edge's head tree.
  for (let i = 1; i < edges.length; i += 1) {
    if (edges[i].baseTree !== edges[i - 1].headTree) { violations.push(`non-contiguous task-root tree between ${edges[i - 1].headSha} and ${edges[i].headSha} — fail closed`); return { ok: false, segments: [], violations, headTreeMatchesFinal: false }; }
  }
  const headTreeMatchesFinal = edges[edges.length - 1].headTree === headTree;
  if (!headTreeMatchesFinal) violations.push('trusted head task-root tree does not equal the final mutation segment head tree');

  const segments = edges.map((e) => ({ baseSha: e.baseSha, headSha: e.headSha, introduction: e.baseTree == null, baseTree: e.baseTree, headTree: e.headTree }));
  return { ok: violations.length === 0, segments, violations, headTreeMatchesFinal };
}

// Convenience: build the three Git accessors from a single synchronous `git` runner
// `run(args) -> string|null` (null on non-zero exit). Used by the CLI; fixtures inject
// their own in-memory accessors instead.
export function gitAccessors(run, root) {
  const firstParentOf = (sha) => {
    const out = run(['rev-parse', '--verify', '--quiet', `${sha}^1`]);
    return out ? out.trim() : null;
  };
  const parentCountOf = (sha) => {
    const out = run(['rev-list', '--parents', '-n', '1', sha]);
    if (!out) return 1;
    const toks = out.trim().split(/\s+/);
    return Math.max(1, toks.length - 1);
  };
  const treeOidAt = (sha) => {
    const out = run(['rev-parse', '--verify', '--quiet', `${sha}:${root}`]);
    return out ? out.trim() : null;
  };
  return { firstParentOf, parentCountOf, treeOidAt };
}
