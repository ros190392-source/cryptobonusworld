// ResearchOps Factory V1.1 — create-only task skeleton generator.

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText, writeCanonical, writeJson, ensureDir, exists } from './util.mjs';
import {
  FACTORY_VERSION, STAGE_DIRS, RESEARCH_FILES, RESEARCH_JSON_FILES,
  freshAuthorizations, isValidTaskId,
} from './model.mjs';

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

// opts: { taskId, countryCode, countryName, exchangeId, exchangeName, batchId, priority, tasksDir, createdAt }
export function createTask(opts) {
  const errors = [];
  const required = ['taskId', 'countryCode', 'countryName', 'exchangeId', 'exchangeName', 'batchId', 'priority'];
  for (const k of required) if (!opts[k] || String(opts[k]).trim() === '') errors.push(`missing ${k}`);
  if (errors.length) throw new Error(`create failed: ${errors.join('; ')}`);

  if (!isValidTaskId(opts.taskId)) throw new Error(`invalid task id: ${opts.taskId}`);
  if (!/^[A-Z]{2}$/.test(opts.countryCode)) throw new Error(`invalid country code: ${opts.countryCode}`);
  if (!/^[a-z0-9-]+$/.test(opts.exchangeId)) throw new Error(`invalid exchange id: ${opts.exchangeId}`);

  const tasksDir = opts.tasksDir || 'research-ops/tasks';
  const taskDir = join(tasksDir, opts.taskId);

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

  ensureDir(taskDir);
  for (const d of STAGE_DIRS) {
    const p = join(taskDir, d);
    ensureDir(p);
    // Represent otherwise-empty stage dirs safely so they are tracked and visible.
    // Skip 00-contract (always populated) and 20-research-output (must contain the
    // exact eleven-file inventory with no stray files).
    if (d !== '00-contract' && d !== '20-research-output') {
      writeCanonical(join(p, '.gitkeep'), `# ${d} — append-only stage; populated by a later governed step.\n`);
    }
  }

  const contract = join(taskDir, '00-contract');

  // IDENTITY.json
  writeJson(join(contract, 'IDENTITY.json'), {
    schemaVersion: '1.0.0',
    factoryVersion: FACTORY_VERSION,
    taskId: opts.taskId,
    project: 'CryptoBonusWorld',
    countryCode: opts.countryCode,
    countryName: opts.countryName,
    exchangeId: opts.exchangeId,
    exchangeName: opts.exchangeName,
    batchId: opts.batchId,
    priority: opts.priority,
    createdAt,
    handoffProtocol: 'CBW_HANDOFF_ENVELOPE_V1',
    deliveryMode: 'ONE_BRANCH_ONE_DRAFT_PR',
    requiredResearchInventory: RESEARCH_FILES,
  });

  // Contract markdown templates.
  writeCanonical(join(contract, 'DEEP_RESEARCH_PROMPT.md'), renderTemplate('DEEP_RESEARCH_PROMPT.md', tokens));
  writeCanonical(join(contract, 'SOURCE_TRUTH_REVIEW_CONTRACT.md'), renderTemplate('SOURCE_TRUTH_REVIEW_CONTRACT.md', tokens));
  writeCanonical(join(contract, 'CORRECTION_CONTRACT.md'), renderTemplate('CORRECTION_CONTRACT.md', tokens));
  writeCanonical(join(contract, 'VALIDATION_CONTRACT.md'), renderTemplate('VALIDATION_CONTRACT.md', tokens));
  writeCanonical(join(contract, 'OWNER_CLOSEOUT_CONTRACT.md'), renderTemplate('OWNER_CLOSEOUT_CONTRACT.md', tokens));

  // RESEARCH_INVENTORY.json — exact eleven-file output inventory.
  writeJson(join(contract, 'RESEARCH_INVENTORY.json'), {
    schemaVersion: '1.0.0',
    taskId: opts.taskId,
    outputDirectory: '20-research-output',
    exactFileCount: RESEARCH_FILES.length,
    jsonFileCount: RESEARCH_JSON_FILES.length,
    files: RESEARCH_FILES,
    jsonFiles: RESEARCH_JSON_FILES,
    manifestFile: 'MANIFEST.txt',
    reportFile: 'source-truth-review-report.md',
  });

  // GITHUB_PLAN.json — one branch, one draft PR to main; never a merge.
  const branchName = `research/${opts.countryCode.toLowerCase()}-${opts.exchangeId}-${opts.batchId.toLowerCase()}`;
  writeJson(join(contract, 'GITHUB_PLAN.json'), {
    schemaVersion: '1.0.0',
    taskId: opts.taskId,
    model: 'ONE_BRANCH_ONE_DRAFT_PR',
    baseBranch: 'main',
    taskBranch: branchName,
    pullRequest: {
      draft: true,
      base: 'main',
      head: branchName,
      title: `research(${opts.countryCode.toLowerCase()}-${opts.exchangeId}): ${opts.exchangeName} × ${opts.countryName} deep-research record`,
      autoMerge: false,
    },
    appendOnly: true,
    mergeAuthorized: false,
    ownerGatedMerge: true,
  });

  // TASK_STATE.json — PREPARED, all authorizations false.
  writeJson(join(taskDir, 'TASK_STATE.json'), {
    schemaVersion: '1.0.0',
    factoryVersion: FACTORY_VERSION,
    taskId: opts.taskId,
    project: 'CryptoBonusWorld',
    countryCode: opts.countryCode,
    exchangeId: opts.exchangeId,
    batchId: opts.batchId,
    priority: opts.priority,
    state: 'PREPARED',
    createdAt,
    stages: Object.fromEntries(STAGE_DIRS.map((d) => [d, d === '00-contract' ? 'PRESENT' : 'EMPTY'])),
    requiredResearchInventory: RESEARCH_FILES,
    branch: branchName,
    pullRequest: null,
    authorizations: freshAuthorizations(),
    history: [{ state: 'PREPARED', at: createdAt }],
  });

  return { taskDir, createdAt, files: RESEARCH_FILES.length };
}
