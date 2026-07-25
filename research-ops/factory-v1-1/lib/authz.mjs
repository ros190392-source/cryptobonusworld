// ResearchOps Factory V1.1 — authorization-floor enforcement and owner-receipt
// validation. Fail-closed. Dependency-free.

import { FORBIDDEN_TRUE_AUTH_KEYS, OWNER_MERGE_KEY } from './model.mjs';

// Recursively collect every boolean whose key looks like an authorization,
// returning [{ keyPath, key, value }].
export function collectAuthBooleans(obj, keyPath = '') {
  const out = [];
  if (obj === null || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const kp = keyPath ? `${keyPath}.${k}` : k;
    if (typeof v === 'boolean') {
      if (/Authorized$/.test(k) || /^(researchImport|stagingImport|canonicalImport|productionChange|productionBinding|ranking|cta|promo|affiliate|publication|sitemap|indexability|migration5|deploy)/i.test(k)) {
        out.push({ keyPath: kp, key: k, value: v });
      }
    } else if (v && typeof v === 'object') {
      out.push(...collectAuthBooleans(v, kp));
    }
  }
  return out;
}

// Enforce the authorization floor over an arbitrary object tree.
// ownerMergeAllowed: when true, OWNER_MERGE_KEY may be true.
// Returns { ok, violations[] }.
export function enforceAuthFloor(obj, { ownerMergeAllowed = false } = {}) {
  const violations = [];
  const bools = collectAuthBooleans(obj);
  for (const b of bools) {
    if (b.value !== true) continue;
    if (b.key === OWNER_MERGE_KEY) {
      if (!ownerMergeAllowed) violations.push(`${b.keyPath} is true but no valid owner merge receipt was provided`);
      continue;
    }
    if (FORBIDDEN_TRUE_AUTH_KEYS.includes(b.key) || /Authorized$/.test(b.key)) {
      violations.push(`forbidden authorization is true: ${b.keyPath}`);
    }
  }
  return { ok: violations.length === 0, violations };
}

// Validate an owner research-record merge receipt.
// A valid receipt authorizes ONLY research-record merge to main for this task.
// It must never authorize master/production/canonical/etc.
export function validateOwnerReceipt(receipt, taskId) {
  const errors = [];
  if (!receipt || typeof receipt !== 'object') return { ok: false, errors: ['receipt is not an object'], mergeAuthorized: false };

  if (receipt.authorizationType !== 'RESEARCH_RECORD_MERGE_TO_MAIN') {
    errors.push(`authorizationType must be RESEARCH_RECORD_MERGE_TO_MAIN, got ${JSON.stringify(receipt.authorizationType)}`);
  }
  if (taskId && receipt.taskId !== taskId) {
    errors.push(`receipt taskId ${JSON.stringify(receipt.taskId)} does not match task ${taskId}`);
  }
  if (receipt.targetBranch && receipt.targetBranch !== 'main') {
    errors.push(`receipt targetBranch must be main, got ${JSON.stringify(receipt.targetBranch)}`);
  }

  const auth = receipt.authorizations && typeof receipt.authorizations === 'object' ? receipt.authorizations : {};
  const mergeTrue = auth[OWNER_MERGE_KEY] === true;
  if (!mergeTrue) errors.push(`receipt does not set ${OWNER_MERGE_KEY} = true`);

  // Any OTHER authorization set true is a hard rejection (privilege escalation).
  const bools = collectAuthBooleans(receipt);
  for (const b of bools) {
    if (b.value === true && b.key !== OWNER_MERGE_KEY) {
      errors.push(`receipt improperly authorizes ${b.keyPath}`);
    }
  }
  // Explicit master guard.
  if (auth.masterChangeAuthorized === true || receipt.masterChangeAuthorized === true) {
    errors.push('receipt must never authorize master changes');
  }

  return { ok: errors.length === 0, errors, mergeAuthorized: errors.length === 0 && mergeTrue };
}
