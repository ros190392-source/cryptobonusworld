// ResearchOps Factory V1.1 — create-only task skeleton generator.

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText, writeCanonical, writeJson, ensureDir, exists } from './util.mjs';
import {
  FACTORY_VERSION, STAGE_DIRS, RESEARCH_FILES, RESEARCH_JSON_FILES,
  freshAuthorizations, isValidTaskId, validateIdentityValues, deterministicBranch,
  GITKEEP_STAGES,
} from './model.mjs';
import { requireScriptBoundWorktreeRoot } from './worktree.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = join(HERE, '..', 'templates');

function fill(text, tokens) {
  return text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, key) => {
    if (!(key in tokens)) throw new Error(`template token not provided: ${key}`);
    return String(tokens[key]);
  });
}

function renderTemplate(name, tokens) {
  return fill(readText(join(TEMPLATE_DIR, name)), tokens);
}

// opts: { taskId, countryCode, countryName, exchangeId, exchangeName, batchId, priority,
//         repoRoot?, testRoot?, createdAt? }
//
// C6 — output confinement: the canonical output root is ALWAYS repository-relative
// `research-ops/tasks/`. No user-controlled path is accepted. `testRoot` is a
// LIBRARY-ONLY escape used exclusively by fixtures/tests; it is never wired to the
// canonical CLI (the CLI exposes no `--tasks-dir`/`--test-root` flag), so production
// task creation can never write outside `research-ops/tasks/`.
export function createTask(opts) {
  const errors = [];
  const required = ['taskId', 'countryCode', 'countryName', 'exchangeId', 'exchangeName', 'batchId', 'priority'];
  for (const k of required) if (!opts[k] || String(opts[k]).trim() === '') errors.push(`missing ${k}`);
  if (errors.length) throw new Error(`create failed: ${errors.join('; ')}`);

  if (!isValidTaskId(opts.taskId)) throw new Error(`invalid task id: ${opts.taskId}`);
  // V2-C7 — validate identity grammar/types (not merely presence) at create time.
  const idErrors = validateIdentityValues(opts);
  if (idErrors.length) throw new Error(`invalid identity: ${idErrors.join('; ')}`);

  // taskId is validated (no slashes, no `..`), so it is a safe single path segment.
  // V2-C1 — canonical output root is ALWAYS the real Git worktree root; `testRoot`
  // and `repoRoot` are LIBRARY-ONLY injections never wired to the CLI. Invoked
  // outside a worktree (e.g. an external cwd), requireWorktreeRoot throws and nothing
  // is created.
  // V3-C1 — the canonical output root is the worktree that CONTAINS this factory
  // script, and the current directory must resolve to that same worktree; invoked by
  // absolute path from a foreign Git repo, this throws and nothing is created there.
  const baseRoot = opts.testRoot !== undefined
    ? opts.testRoot                                        // library/test-only injected root
    : opts.repoRoot !== undefined
      ? join(opts.repoRoot, 'research-ops', 'tasks')       // library-only injected repo root
      : join(requireScriptBoundWorktreeRoot(fileURLToPath(import.meta.url), process.cwd()), 'research-ops', 'tasks'); // canonical
  const taskDir = join(baseRoot, opts.taskId);

  // Create-only: fail closed if the task path already exists.
  if (exists(taskDir)) throw new Error(`task already exists: ${taskDir}`);

  const createdAt = opts.createdAt || new Date().toISOString().slice(0, 10);
  const tokens = {
    TASK_ID: opts.taskId,
    COUNTRY_CODE: opts.countryCode,
    COUNTRY_NAME: opts.countryName,
    EXCHANGE_ID: opts.exchangeId,
    EXCHANGE_NAME: opts.exchangeName,
    BATCH_ID: opts.batchId,
    PRIORITY: opts.priority,
    CREATED_AT: createdAt,
    FACTORY_VERSION,
  };

  // V4-C5 — write from the single canonical skeleton renderer so on-disk bytes are
  // byte-identical to what the deterministic skeleton validator recomputes.
  const skeleton = renderSkeleton(opts);
  for (const d of STAGE_DIRS) ensureDir(join(taskDir, d));
  for (const [rel, content] of Object.entries(skeleton)) {
    const abs = join(taskDir, rel);
    ensureDir(dirname(abs));
    writeCanonical(abs, content);
  }

  return { taskDir, createdAt, files: RESEARCH_FILES.length };
}

// V4-C5 — deterministic canonical skeleton content. Returns { <task-root-relative
// path>: <pre-canonical text> }. `writeCanonical` normalization (LF + trailing newline)
// is applied identically on write and in the skeleton validator, so a SHA-256 over the
// written bytes equals a SHA-256 over the canonicalized render for the same identity.
export function renderSkeleton(opts) {
  const createdAt = opts.createdAt || new Date().toISOString().slice(0, 10);
  const tokens = {
    TASK_ID: opts.taskId, COUNTRY_CODE: opts.countryCode, COUNTRY_NAME: opts.countryName,
    EXCHANGE_ID: opts.exchangeId, EXCHANGE_NAME: opts.exchangeName, BATCH_ID: opts.batchId,
    PRIORITY: opts.priority, CREATED_AT: createdAt, FACTORY_VERSION,
  };
  const branchName = deterministicBranch(opts);
  const jsonText = (o) => JSON.stringify(o, null, 2);
  const out = {};

  for (const d of GITKEEP_STAGES) out[`${d}/.gitkeep`] = `# ${d} — append-only stage; populated by a later governed step.\n`;

  out['00-contract/IDENTITY.json'] = jsonText({
    schemaVersion: '1.0.0', factoryVersion: FACTORY_VERSION, taskId: opts.taskId, project: 'CryptoBonusWorld',
    countryCode: opts.countryCode, countryName: opts.countryName, exchangeId: opts.exchangeId, exchangeName: opts.exchangeName,
    batchId: opts.batchId, priority: opts.priority, createdAt, handoffProtocol: 'CBW_HANDOFF_ENVELOPE_V1',
    deliveryMode: 'ONE_BRANCH_ONE_DRAFT_PR', requiredResearchInventory: RESEARCH_FILES,
  });
  out['00-contract/DEEP_RESEARCH_PROMPT.md'] = renderTemplate('DEEP_RESEARCH_PROMPT.md', tokens);
  out['00-contract/SOURCE_TRUTH_REVIEW_CONTRACT.md'] = renderTemplate('SOURCE_TRUTH_REVIEW_CONTRACT.md', tokens);
  out['00-contract/CORRECTION_CONTRACT.md'] = renderTemplate('CORRECTION_CONTRACT.md', tokens);
  out['00-contract/VALIDATION_CONTRACT.md'] = renderTemplate('VALIDATION_CONTRACT.md', tokens);
  out['00-contract/OWNER_CLOSEOUT_CONTRACT.md'] = renderTemplate('OWNER_CLOSEOUT_CONTRACT.md', tokens);
  out['00-contract/RESEARCH_INVENTORY.json'] = jsonText({
    schemaVersion: '1.0.0', taskId: opts.taskId, outputDirectory: '20-research-output',
    exactFileCount: RESEARCH_FILES.length, jsonFileCount: RESEARCH_JSON_FILES.length,
    files: RESEARCH_FILES, jsonFiles: RESEARCH_JSON_FILES, manifestFile: 'MANIFEST.txt', reportFile: 'source-truth-review-report.md',
  });
  out['00-contract/GITHUB_PLAN.json'] = jsonText({
    schemaVersion: '1.0.0', taskId: opts.taskId, model: 'ONE_BRANCH_ONE_DRAFT_PR', baseBranch: 'main', taskBranch: branchName,
    pullRequest: { draft: true, base: 'main', head: branchName, title: `research(${opts.countryCode.toLowerCase()}-${opts.exchangeId}): ${opts.exchangeName} × ${opts.countryName} deep-research record`, autoMerge: false },
    appendOnly: true, mergeAuthorized: false, ownerGatedMerge: true,
  });
  out['TASK_STATE.json'] = jsonText({
    schemaVersion: '1.0.0', factoryVersion: FACTORY_VERSION, taskId: opts.taskId, project: 'CryptoBonusWorld',
    countryCode: opts.countryCode, exchangeId: opts.exchangeId, batchId: opts.batchId, priority: opts.priority,
    state: 'PREPARED', createdAt, stages: Object.fromEntries(STAGE_DIRS.map((d) => [d, d === '00-contract' ? 'PRESENT' : 'EMPTY'])),
    requiredResearchInventory: RESEARCH_FILES, branch: branchName, pullRequest: null,
    authorizations: freshAuthorizations(), history: [{ state: 'PREPARED', at: createdAt }],
  });
  return out;
}
