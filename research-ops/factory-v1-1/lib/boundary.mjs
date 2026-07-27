// ResearchOps Factory V1.1 — changed-file discovery + append-only boundary.
// V2-C2 strict source+destination name-status parsing; V2-C3 trusted PR/branch mode
// binding; V2-C4 exact factory workflow allowlist; V2-C5 stage-aware transitions.
// Pure and testable. The CI workflow feeds `git diff --name-status` plus trusted
// GitHub event metadata (head/base branch, base/head TASK_STATE) here.

import { checkStageTransition } from './stage.mjs';

const TASK_ROOT_RE = /^research-ops\/tasks\/([A-Z0-9][A-Z0-9-]*)\//;
const FORBIDDEN_PREFIXES = ['research-ops-pilot/tasks/', 'src/', 'public/', 'data/market-intelligence/'];
const FACTORY_CODE_PREFIX = 'research-ops/factory-v1-1/';
// V2-C4 — the ONLY workflow path this factory lineage may change.
const FACTORY_WORKFLOW_PATH = '.github/workflows/cbw-researchops-factory-validate.yml';

// V2-C3 — trusted branch grammar. FACTORY_GOVERNANCE is granted ONLY for these.
const FACTORY_BRANCH_RE = /^(feat|correction|validation)\/researchops-(subscription-)?factory-v1-1/;
const RESEARCH_BRANCH_RE = /^research\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

function norm(p) { return String(p).replace(/\\/g, '/').trim(); }

// V2-C2 — strict `git diff --name-status` parsing. Supports exactly A, M, D, T, and
// R<score>/C<score>. Returns [{ status, score?, dst, src?, paths, malformed? }].
// Malformed, empty, unknown-status, wrong-arity and empty-path records are flagged.
export function parseNameStatus(text) {
  const out = [];
  for (const raw of String(text).split(/\r?\n/)) {
    if (raw.trim() === '') continue;
    const fields = raw.split('\t');
    const code = fields[0].trim();
    const letter = code[0];
    const mk = (o) => out.push(o);
    if (letter === 'A' || letter === 'M' || letter === 'D' || letter === 'T') {
      if (code !== letter) { mk({ status: letter, paths: [], malformed: `unsupported status code ${code}` }); continue; }
      const p = norm(fields[1] || '');
      if (fields.length !== 2 || p === '') { mk({ status: letter, paths: [], malformed: `malformed ${letter} record: ${JSON.stringify(raw)}` }); continue; }
      mk({ status: letter, dst: p, paths: [p] });
    } else if (letter === 'R' || letter === 'C') {
      if (!/^[RC]\d{1,3}$/.test(code)) { mk({ status: letter, paths: [], malformed: `malformed rename/copy score: ${code}` }); continue; }
      const src = norm(fields[1] || '');
      const dst = norm(fields[2] || '');
      if (fields.length !== 3 || src === '' || dst === '') { mk({ status: letter, paths: [], malformed: `malformed ${letter} record: ${JSON.stringify(raw)}` }); continue; }
      mk({ status: letter, score: Number(code.slice(1)), src, dst, paths: [src, dst] });
    } else {
      mk({ status: code || '(empty)', paths: [], malformed: `unknown status: ${JSON.stringify(code)}` });
    }
  }
  return out;
}

function taskRootOf(path) {
  const m = TASK_ROOT_RE.exec(norm(path));
  return m ? `research-ops/tasks/${m[1]}` : null;
}

function isFactoryPath(p) {
  return p.startsWith(FACTORY_CODE_PREFIX) || p === FACTORY_WORKFLOW_PATH;
}

// Path-derived mode hint (used only to require agreement with trusted metadata).
export function classifyChangeMode(paths) {
  const p = paths.map(norm);
  const anyTask = p.some((x) => taskRootOf(x));
  const anyFactory = p.some(isFactoryPath);
  if (anyTask && !anyFactory) return 'RESEARCH_TASK';
  if (anyFactory && !anyTask) return 'FACTORY_GOVERNANCE';
  return 'AMBIGUOUS';
}

// V2-C3 — resolve mode from TRUSTED branch metadata (never from repository files).
// Returns 'FACTORY_GOVERNANCE' | 'RESEARCH_TASK' | null (unrecognized).
export function trustedModeFromMeta(meta = {}) {
  const head = meta.headBranch ? norm(meta.headBranch) : '';
  const base = meta.baseBranch ? norm(meta.baseBranch) : '';
  if (!head || !base) return null;
  if (FACTORY_BRANCH_RE.test(head) && (base === 'main' || FACTORY_BRANCH_RE.test(base))) return 'FACTORY_GOVERNANCE';
  if (RESEARCH_BRANCH_RE.test(head) && base === 'main') return 'RESEARCH_TASK';
  return null;
}

// Enforce the append-only boundary over parsed name-status records.
// meta: { headBranch?, baseBranch?, taskStates?: { <root>: { base, head, existsAtBase } } }
// Returns { ok, mode, taskRoots, deletedTaskPaths, violations }.
export function checkChangedFileBoundary(records, meta = {}) {
  const violations = [];

  // V2-C2 — reject any malformed / unsupported-status record up front (fail closed).
  for (const r of records) {
    if (r.malformed) violations.push(`name-status: ${r.malformed}`);
  }

  // All touched paths (both source and destination of every rename/copy).
  const allPaths = [];
  for (const r of records) for (const p of (r.paths || [])) allPaths.push(norm(p));

  // Universal fail-closed guards over EVERY source and destination path.
  for (const p of allPaths) {
    if (p.includes('..')) violations.push(`${p}: path traversal`);
    if (FORBIDDEN_PREFIXES.some((fp) => p.startsWith(fp))) violations.push(`${p}: forbidden area`);
    if (!p.includes('/')) violations.push(`${p}: arbitrary top-level file`);
    // V2-C4 — any workflow file other than the exact factory workflow is rejected.
    if (p.startsWith('.github/workflows/') && p !== FACTORY_WORKFLOW_PATH) violations.push(`${p}: workflow outside the factory allowlist`);
  }

  const taskRoots = [...new Set(allPaths.map(taskRootOf).filter(Boolean))];

  // C4 — deletion of a governed task record (D), or the source side of a rename that
  // removes a governed task record, is rejected.
  const deletedTaskPaths = [];
  for (const r of records) {
    if (r.status === 'D' && r.dst && taskRootOf(r.dst)) deletedTaskPaths.push(r.dst);
    if (r.status === 'R' && r.src && taskRootOf(r.src)) deletedTaskPaths.push(r.src);
  }
  for (const d of deletedTaskPaths) violations.push(`${d}: deletion/removal of a governed task record not allowed`);

  const pathMode = classifyChangeMode(allPaths);

  // V2-C3 — bind mode to trusted metadata when provided; fail closed on factory mode
  // without trusted confirmation or on any path/metadata mismatch.
  let mode = pathMode;
  const hasMeta = !!(meta.headBranch || meta.baseBranch);
  if (hasMeta) {
    const tm = trustedModeFromMeta(meta);
    if (tm === null) violations.push(`untrusted or unrecognized PR branch metadata (head=${meta.headBranch}, base=${meta.baseBranch})`);
    else if (pathMode !== 'AMBIGUOUS' && pathMode !== tm) violations.push(`changed paths (${pathMode}) do not match trusted PR mode (${tm})`);
    mode = tm || pathMode;
  } else if (pathMode === 'FACTORY_GOVERNANCE') {
    // Never grant factory governance on path classification alone.
    violations.push('factory-governance requires trusted PR/branch metadata (head/base)');
  }

  if (mode === 'AMBIGUOUS') {
    violations.push('changed set mixes research-task and factory-governance paths (or matches neither) — fail closed');
  } else if (mode === 'RESEARCH_TASK') {
    if (taskRoots.length !== 1) violations.push(`research-task PR must touch exactly one task root, found ${taskRoots.length}`);
    const root = taskRoots[0];
    for (const p of allPaths) {
      if (isFactoryPath(p) || p.startsWith('.github/workflows/')) { violations.push(`${p}: factory/workflow change not allowed in a research-task PR`); continue; }
      if (root && !p.startsWith(`${root}/`)) violations.push(`${p}: outside the single task root ${root}`);
    }
    // V2-C5 — stage-aware append-only using trusted base/head TASK_STATE per root.
    if (root && meta.taskStates && meta.taskStates[root]) {
      const ts = meta.taskStates[root];
      const relOf = (p) => norm(p).slice(root.length + 1);
      const scoped = [];
      for (const r of records) {
        if (r.malformed) continue;
        if (r.status === 'R' || r.status === 'C') {
          if (r.dst && norm(r.dst).startsWith(`${root}/`)) scoped.push({ status: r.status, rel: relOf(r.dst), srcRel: r.src ? relOf(r.src) : undefined });
        } else if (r.dst && norm(r.dst).startsWith(`${root}/`)) {
          scoped.push({ status: r.status, rel: relOf(r.dst) });
        }
      }
      const st = checkStageTransition({ records: scoped, baseState: ts.base ?? null, headState: ts.head, taskExistsAtBase: !!ts.existsAtBase });
      for (const v of st.violations) violations.push(`stage: ${v}`);
    }
  } else { // FACTORY_GOVERNANCE
    for (const p of allPaths) {
      if (taskRootOf(p)) { violations.push(`${p}: research task change not allowed in a factory-governance PR`); continue; }
      if (!isFactoryPath(p)) violations.push(`${p}: outside the factory/workflow allowlist`);
    }
  }

  return { ok: violations.length === 0, mode, taskRoots, deletedTaskPaths, violations };
}
