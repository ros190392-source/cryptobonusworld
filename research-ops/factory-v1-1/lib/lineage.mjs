// ResearchOps Factory V1.1 — exact governed factory lineage and frozen-layer policy.
// V3-C2 replaces the broad factory branch-prefix regex with an EXACT allowlist of the
// governed factory task stack (each entry pins head->base). V3-C4 freezes every prior
// governance/history layer and maps the current authorized task branch to the single
// result directory it may write.

// Exact governed factory stack. Each factory PR head branch is paired with the exact
// base it stacks onto, plus the single result directory that task may create/update.
export const FACTORY_LINEAGE = [
  { head: 'feat/researchops-subscription-factory-v1-1', base: 'main', resultDir: null },
  { head: 'validation/researchops-subscription-factory-v1-1-009', base: 'feat/researchops-subscription-factory-v1-1', resultDir: 'research-ops/factory-v1-1/validation-009/' },
  { head: 'correction/researchops-subscription-factory-v1-1-010', base: 'validation/researchops-subscription-factory-v1-1-009', resultDir: 'research-ops/factory-v1-1/correction-010/' },
  { head: 'validation/researchops-factory-v1-1-correction-011', base: 'correction/researchops-subscription-factory-v1-1-010', resultDir: 'research-ops/factory-v1-1/correction-validation-011/' },
  { head: 'correction/researchops-factory-v1-1-v2-012', base: 'validation/researchops-factory-v1-1-correction-011', resultDir: 'research-ops/factory-v1-1/correction-v2-012/' },
  { head: 'validation/researchops-factory-v1-1-v2-013', base: 'correction/researchops-factory-v1-1-v2-012', resultDir: 'research-ops/factory-v1-1/correction-v2-validation-013/' },
  { head: 'correction/researchops-factory-v1-1-v3-014', base: 'validation/researchops-factory-v1-1-v2-013', resultDir: 'research-ops/factory-v1-1/correction-v3-014/' },
  { head: 'validation/researchops-factory-v1-1-v3-015', base: 'correction/researchops-factory-v1-1-v3-014', resultDir: 'research-ops/factory-v1-1/correction-v3-validation-015/' },
];

// Exactly matched (head, base) pair -> lineage entry, or null.
export function factoryLineageEntry(headBranch, baseBranch) {
  const h = String(headBranch || '').trim();
  const b = String(baseBranch || '').trim();
  return FACTORY_LINEAGE.find((e) => e.head === h && e.base === b) || null;
}

// Frozen prior governance/history layers — immutable in every factory PR. The CURRENT
// task's own result directory is intentionally excluded by the caller.
export const FROZEN_FACTORY_PREFIXES = [
  'research-ops/factory-v1-1/governance/',
  'research-ops/factory-v1-1/validation-009/',
  'research-ops/factory-v1-1/correction-010/',
  'research-ops/factory-v1-1/correction-validation-011/',
  'research-ops/factory-v1-1/correction-v2-012/',
  'research-ops/factory-v1-1/correction-v2-validation-013/',
];

// Factory implementation paths a governed factory task MAY modify.
export const FACTORY_IMPL_PREFIXES = [
  'research-ops/factory-v1-1/bin/',
  'research-ops/factory-v1-1/lib/',
  'research-ops/factory-v1-1/fixtures/',
  'research-ops/factory-v1-1/schemas/',
  'research-ops/factory-v1-1/templates/',
];
export const FACTORY_IMPL_FILES = ['research-ops/factory-v1-1/README.md'];
export const FACTORY_WORKFLOW_PATH = '.github/workflows/cbw-researchops-factory-validate.yml';
