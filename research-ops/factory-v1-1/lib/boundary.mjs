// ResearchOps Factory V1.1 — changed-file discovery + append-only boundary.
// V2-C2 strict source+destination name-status; V2/V3-C3 trusted PR mode + research
// head<->plan binding; V3-C2 exact factory lineage; V3-C4 frozen governance/history +
// workflow protection; V2/V3-C5/C9 stage-aware transitions + history append-only;
// V3-C10 strict name-status grammar (scores 0-100, NUL-delimited). Pure and testable.

import { checkStageTransition, checkHistoryAppendOnly } from './stage.mjs';
import {
  factoryLineageEntry, FROZEN_FACTORY_PREFIXES, FACTORY_IMPL_PREFIXES,
  FACTORY_IMPL_FILES, FACTORY_WORKFLOW_PATH,
} from './lineage.mjs';

const TASK_ROOT_RE = /^research-ops\/tasks\/([A-Z0-9][A-Z0-9-]*)\//;
const FORBIDDEN_PREFIXES = ['research-ops-pilot/tasks/', 'src/', 'public/', 'data/market-intelligence/'];
const FACTORY_CODE_PREFIX = 'research-ops/factory-v1-1/';
const RESEARCH_BRANCH_RE = /^research\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

function norm(p) { return String(p).replace(/\\/g, '/').trim(); }

// V3-C10 — validate one status code + path arity. Returns a normalized record with a
// `malformed` reason when invalid. R/C scores must be integers in 0..100.
function makeRecord(code, fields, raw) {
  const letter = code[0];
  const quoted = (p) => typeof p === 'string' && p.startsWith('"');
  if (letter === 'A' || letter === 'M' || letter === 'D' || letter === 'T') {
    if (code !== letter) return { status: letter, paths: [], malformed: `unsupported status code ${code}` };
    const p = norm(fields[1] || '');
    if (fields.length !== 2 || p === '') return { status: letter, paths: [], malformed: `malformed ${letter} record: ${JSON.stringify(raw)}` };
    if (quoted(fields[1])) return { status: letter, paths: [], malformed: `quoted/escaped path not accepted (use NUL-delimited): ${fields[1]}` };
    return { status: letter, dst: p, paths: [p] };
  }
  if (letter === 'R' || letter === 'C') {
    const m = /^[RC](\d{1,3})$/.exec(code);
    if (!m) return { status: letter, paths: [], malformed: `malformed rename/copy score: ${code}` };
    const score = Number(m[1]);
    if (score < 0 || score > 100) return { status: letter, paths: [], malformed: `rename/copy score out of range 0-100: ${code}` };
    if (fields.length !== 3) return { status: letter, paths: [], malformed: `malformed ${letter} record arity: ${JSON.stringify(raw)}` };
    const src = norm(fields[1] || ''); const dst = norm(fields[2] || '');
    if (src === '' || dst === '') return { status: letter, paths: [], malformed: `empty rename/copy path: ${JSON.stringify(raw)}` };
    if (quoted(fields[1]) || quoted(fields[2])) return { status: letter, paths: [], malformed: `quoted/escaped path not accepted (use NUL-delimited)` };
    return { status: letter, score, src, dst, paths: [src, dst] };
  }
  return { status: code || '(empty)', paths: [], malformed: `unknown status: ${JSON.stringify(code)}` };
}

// Tab-delimited `git diff --name-status`. Kept for library/fixture use.
export function parseNameStatus(text) {
  const out = [];
  for (const raw of String(text).split(/\r?\n/)) {
    if (raw.trim() === '') continue;
    const fields = raw.split('\t');
    out.push(makeRecord(fields[0].trim(), fields, raw));
  }
  return out;
}

// V3-C10 — NUL-delimited `git -c core.quotePath=false diff -z --name-status`. Records
// are: <status>\0<path>[\0<path2>]. Unambiguous for paths with tabs/newlines/quotes.
export function parseNameStatusZ(text) {
  const toks = String(text).split('\0');
  const out = [];
  for (let i = 0; i < toks.length;) {
    const code = (toks[i] || '').trim();
    if (code === '') { i += 1; continue; }
    const letter = code[0];
    if (letter === 'R' || letter === 'C') {
      const fields = [code, toks[i + 1], toks[i + 2]];
      out.push(makeRecord(code, fields, code));
      i += 3;
    } else if (letter === 'A' || letter === 'M' || letter === 'D' || letter === 'T') {
      out.push(makeRecord(code, [code, toks[i + 1]], code));
      i += 2;
    } else { out.push({ status: code, paths: [], malformed: `unknown status: ${JSON.stringify(code)}` }); i += 1; }
  }
  return out;
}

function taskRootOf(path) {
  const m = TASK_ROOT_RE.exec(norm(path));
  return m ? `research-ops/tasks/${m[1]}` : null;
}
function taskIdOf(root) { const m = /^research-ops\/tasks\/([A-Z0-9][A-Z0-9-]*)$/.exec(root); return m ? m[1] : null; }
function isFactoryPath(p) { return p.startsWith(FACTORY_CODE_PREFIX) || p === FACTORY_WORKFLOW_PATH; }

export function classifyChangeMode(paths) {
  const p = paths.map(norm);
  const anyTask = p.some((x) => taskRootOf(x));
  const anyFactory = p.some(isFactoryPath);
  if (anyTask && !anyFactory) return 'RESEARCH_TASK';
  if (anyFactory && !anyTask) return 'FACTORY_GOVERNANCE';
  return 'AMBIGUOUS';
}

// V3-C2 — resolve mode from TRUSTED metadata via the EXACT factory lineage (head+base
// must be an exact governed pair). Research mode requires research/<slug> onto main.
export function trustedModeFromMeta(meta = {}) {
  const head = meta.headBranch ? norm(meta.headBranch) : '';
  const base = meta.baseBranch ? norm(meta.baseBranch) : '';
  if (!head || !base) return null;
  if (factoryLineageEntry(head, base)) return 'FACTORY_GOVERNANCE';
  if (RESEARCH_BRANCH_RE.test(head) && base === 'main') return 'RESEARCH_TASK';
  return null;
}

// Enforce the append-only boundary. meta: { headBranch?, baseBranch?,
//   taskStates?: { <root>: { base, head, existsAtBase, headBranch?, headTaskId?, baseHistory?, headHistory? } } }
export function checkChangedFileBoundary(records, meta = {}) {
  const violations = [];
  for (const r of records) if (r.malformed) violations.push(`name-status: ${r.malformed}`);

  const allPaths = [];
  for (const r of records) for (const p of (r.paths || [])) allPaths.push(norm(p));

  for (const p of allPaths) {
    if (p.includes('..')) violations.push(`${p}: path traversal`);
    if (FORBIDDEN_PREFIXES.some((fp) => p.startsWith(fp))) violations.push(`${p}: forbidden area`);
    if (!p.includes('/')) violations.push(`${p}: arbitrary top-level file`);
    if (p.startsWith('.github/workflows/') && p !== FACTORY_WORKFLOW_PATH) violations.push(`${p}: workflow outside the factory allowlist`);
  }

  const taskRoots = [...new Set(allPaths.map(taskRootOf).filter(Boolean))];
  const deletedTaskPaths = [];
  for (const r of records) {
    if (r.status === 'D' && r.dst && taskRootOf(r.dst)) deletedTaskPaths.push(r.dst);
    if (r.status === 'R' && r.src && taskRootOf(r.src)) deletedTaskPaths.push(r.src);
  }
  for (const d of deletedTaskPaths) violations.push(`${d}: deletion/removal of a governed task record not allowed`);

  const pathMode = classifyChangeMode(allPaths);
  let mode = pathMode;
  const hasMeta = !!(meta.headBranch || meta.baseBranch);
  let lineage = null;
  if (hasMeta) {
    const tm = trustedModeFromMeta(meta);
    if (tm === null) violations.push(`untrusted or unrecognized PR branch metadata (head=${meta.headBranch}, base=${meta.baseBranch})`);
    else if (pathMode !== 'AMBIGUOUS' && pathMode !== tm) violations.push(`changed paths (${pathMode}) do not match trusted PR mode (${tm})`);
    mode = tm || pathMode;
    if (tm === 'FACTORY_GOVERNANCE') lineage = factoryLineageEntry(norm(meta.headBranch), norm(meta.baseBranch));
  } else if (pathMode === 'FACTORY_GOVERNANCE') {
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
    const ts = root && meta.taskStates && meta.taskStates[root];
    // V3-C3 — bind trusted PR head branch to the task's declared plan and identity.
    if (root && hasMeta && ts) {
      if (ts.headBranch && norm(meta.headBranch) !== norm(ts.headBranch)) violations.push(`trusted PR head (${meta.headBranch}) != task's declared branch (${ts.headBranch})`);
      const rootId = taskIdOf(root);
      if (ts.headTaskId && rootId && ts.headTaskId !== rootId) violations.push(`task root id (${rootId}) != declared TASK_STATE.taskId (${ts.headTaskId})`);
    }
    // V2/V3-C5 — stage-aware append-only.
    if (root && ts) {
      const relOf = (p) => norm(p).slice(root.length + 1);
      const scoped = [];
      for (const r of records) {
        if (r.malformed) continue;
        if (r.status === 'R' || r.status === 'C') {
          if (r.dst && norm(r.dst).startsWith(`${root}/`)) scoped.push({ status: r.status, rel: relOf(r.dst), srcRel: r.src ? relOf(r.src) : undefined });
        } else if (r.dst && norm(r.dst).startsWith(`${root}/`)) scoped.push({ status: r.status, rel: relOf(r.dst) });
      }
      const st = checkStageTransition({ records: scoped, baseState: ts.base ?? null, headState: ts.head, taskExistsAtBase: !!ts.existsAtBase, baseHistory: ts.baseHistory, headHistory: ts.headHistory });
      for (const v of st.violations) violations.push(`stage: ${v}`);
      // V3-C9 — history append-only across trusted base/head blobs.
      if (ts.existsAtBase) {
        const h = checkHistoryAppendOnly(ts.baseHistory, ts.headHistory);
        for (const v of h.violations) violations.push(`history: ${v}`);
      }
    }
  } else { // FACTORY_GOVERNANCE — V3-C4 exact task-specific write boundary.
    const currentResultDir = lineage && lineage.resultDir;
    for (const r of records) {
      for (const p of (r.paths || [])) {
        const np = norm(p);
        if (taskRootOf(np)) { violations.push(`${np}: research task change not allowed in a factory-governance PR`); continue; }
        if (FROZEN_FACTORY_PREFIXES.some((fp) => np.startsWith(fp))) { violations.push(`${np}: frozen prior governance/history layer is immutable`); continue; }
        if (np === FACTORY_WORKFLOW_PATH) {
          if (r.status === 'D' || r.status === 'R') violations.push(`${np}: factory workflow may not be deleted or renamed`);
          continue;
        }
        const isImpl = FACTORY_IMPL_PREFIXES.some((fp) => np.startsWith(fp)) || FACTORY_IMPL_FILES.includes(np);
        const isCurrentResult = currentResultDir && np.startsWith(currentResultDir);
        if (!isImpl && !isCurrentResult) violations.push(`${np}: outside the current task's authorized factory write boundary`);
      }
    }
  }

  return { ok: violations.length === 0, mode, taskRoots, deletedTaskPaths, violations };
}
