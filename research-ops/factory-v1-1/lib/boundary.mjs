// ResearchOps Factory V1.1 — changed-file discovery + append-only boundary (C3/C4/C5).
// Pure and testable. The CI workflow feeds `git diff --name-status` here.

const TASK_ROOT_RE = /^research-ops\/tasks\/([A-Z0-9][A-Z0-9-]*)\//;
const FORBIDDEN_PREFIXES = ['research-ops-pilot/tasks/', 'src/', 'public/', 'data/market-intelligence/'];
const FACTORY_PREFIXES = ['research-ops/factory-v1-1/', '.github/workflows/'];

function norm(p) { return String(p).replace(/\\/g, '/').trim(); }

// Parse `git diff --name-status` output into [{ status, path }].
// Handles rename lines (R100\told\tnew) by taking the destination path.
export function parseNameStatus(text) {
  const out = [];
  for (const raw of String(text).split(/\r?\n/)) {
    if (raw.trim() === '') continue;
    const parts = raw.split('\t');
    const status = parts[0].trim()[0]; // A/M/D/R/C/T
    const path = norm(parts[parts.length - 1]);
    out.push({ status, path });
  }
  return out;
}

function taskRootOf(path) {
  const m = TASK_ROOT_RE.exec(path);
  return m ? `research-ops/tasks/${m[1]}` : null;
}

// Classify the PR intent from its changed paths. Fail-closed on mixtures.
export function classifyChangeMode(paths) {
  const p = paths.map(norm);
  const anyTask = p.some((x) => taskRootOf(x));
  const anyFactory = p.some((x) => FACTORY_PREFIXES.some((f) => x.startsWith(f)));
  if (anyTask && !anyFactory) return 'RESEARCH_TASK';
  if (anyFactory && !anyTask) return 'FACTORY_GOVERNANCE';
  return 'AMBIGUOUS';
}

// Enforce the append-only boundary over name-status records.
// Returns { ok, mode, taskRoots, deletedTaskPaths, violations }.
export function checkChangedFileBoundary(records) {
  const violations = [];
  const paths = records.map((r) => norm(r.path));

  // Universal fail-closed guards.
  for (const r of records) {
    const p = norm(r.path);
    if (p.includes('..')) violations.push(`${p}: path traversal`);
    if (FORBIDDEN_PREFIXES.some((fp) => p.startsWith(fp))) violations.push(`${p}: forbidden area`);
    if (!p.includes('/')) violations.push(`${p}: arbitrary top-level file`);
  }

  const mode = classifyChangeMode(paths);
  const taskRoots = [...new Set(paths.map(taskRootOf).filter(Boolean))];
  // C4 — deletion of any governed task record is rejected.
  const deletedTaskPaths = records.filter((r) => r.status === 'D' && taskRootOf(norm(r.path))).map((r) => norm(r.path));
  for (const d of deletedTaskPaths) violations.push(`${d}: deletion of governed task record not allowed`);

  if (mode === 'AMBIGUOUS') {
    violations.push('changed set mixes research-task and factory-governance paths (or matches neither) — fail closed');
  } else if (mode === 'RESEARCH_TASK') {
    // exactly one task root; every path under it; no factory/workflow escape.
    if (taskRoots.length !== 1) violations.push(`research-task PR must touch exactly one task root, found ${taskRoots.length}`);
    const root = taskRoots[0];
    for (const p of paths) {
      if (FACTORY_PREFIXES.some((f) => p.startsWith(f))) { violations.push(`${p}: factory/workflow change not allowed in a research-task PR`); continue; }
      if (root && !p.startsWith(`${root}/`)) violations.push(`${p}: outside the single task root ${root}`);
    }
  } else { // FACTORY_GOVERNANCE
    for (const p of paths) {
      if (taskRootOf(p)) { violations.push(`${p}: research task change not allowed in a factory-governance PR`); continue; }
      if (!FACTORY_PREFIXES.some((f) => p.startsWith(f))) violations.push(`${p}: outside the factory/workflow boundary`);
    }
  }

  return { ok: violations.length === 0, mode, taskRoots, deletedTaskPaths, violations };
}
