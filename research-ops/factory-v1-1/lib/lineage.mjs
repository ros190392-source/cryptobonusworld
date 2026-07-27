// ResearchOps Factory V1.1 — frozen-layer policy and factory path classes.
// V4-C4 REMOVES the mutable branch-name preauthorization list. A factory task is no
// longer authorized by appearing in this file; authorization now comes from an
// owner-created governed record on the approved base (see govrecord.mjs) plus a
// role/capability profile (roles.mjs) and verified commit ancestry (eventintegrity.mjs).
// This module now only declares immutable frozen layers and the factory path classes.

// Frozen prior governance/history layers — immutable in every factory PR regardless of
// role. The CURRENT task's own result directory is handled by the role/capability layer,
// which additionally keeps that task's setup files immutable.
export const FROZEN_FACTORY_PREFIXES = [
  'research-ops/factory-v1-1/governance/',
  'research-ops/factory-v1-1/validation-009/',
  'research-ops/factory-v1-1/correction-010/',
  'research-ops/factory-v1-1/correction-validation-011/',
  'research-ops/factory-v1-1/correction-v2-012/',
  'research-ops/factory-v1-1/correction-v2-validation-013/',
  'research-ops/factory-v1-1/correction-v3-014/',
  'research-ops/factory-v1-1/correction-v3-validation-015/',
];

// Factory implementation paths an implementation/correction-role task MAY modify.
export const FACTORY_IMPL_PREFIXES = [
  'research-ops/factory-v1-1/bin/',
  'research-ops/factory-v1-1/lib/',
  'research-ops/factory-v1-1/fixtures/',
  'research-ops/factory-v1-1/schemas/',
  'research-ops/factory-v1-1/templates/',
];
export const FACTORY_IMPL_FILES = ['research-ops/factory-v1-1/README.md'];
export const FACTORY_WORKFLOW_PATH = '.github/workflows/cbw-researchops-factory-validate.yml';

// The enforcement root: the trusted policy/bootstrap files that decide a PR's authority.
// V4-C2 — a PR that changes any of these can only do so under an implementation/correction
// role governed record, and the run itself must be executed from the BASE copy of these
// files, never the PR head. Used to flag enforcement-root changes for extra scrutiny.
export const ENFORCEMENT_ROOT_PATHS = [
  FACTORY_WORKFLOW_PATH,
  'research-ops/factory-v1-1/lib/boundary.mjs',
  'research-ops/factory-v1-1/lib/lineage.mjs',
  'research-ops/factory-v1-1/lib/roles.mjs',
  'research-ops/factory-v1-1/lib/govrecord.mjs',
  'research-ops/factory-v1-1/lib/eventintegrity.mjs',
  'research-ops/factory-v1-1/bin/researchops.mjs',
];
export function isEnforcementRootPath(p) {
  const np = String(p).replace(/\\/g, '/');
  return ENFORCEMENT_ROOT_PATHS.includes(np);
}
