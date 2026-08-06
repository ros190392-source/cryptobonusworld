#!/usr/bin/env node
/**
 * Manual, OFFLINE Bybit promo-code confirmation intake helper (Issue #256, R8).
 *
 * Modes:
 *   (default)              write a NON-AUTHORIZING draft template (transient, gitignored)
 *   --structural <file>    structural validation only (no lifecycle evaluation, no clock)
 *   --validate <file> --evaluate-at <ISO>   full offline evaluation at an explicit clock
 *
 * It never authenticates to GitHub/Bybit/email, reads secrets or private profiles,
 * scrapes accounts, marks anything `confirmed`, adds approver metadata, or modifies
 * the real packet / offers.ts. There is NO `Date.now()` fallback for authorizing
 * evaluation — `--validate` requires an explicit strict `--evaluate-at`. Invalid
 * output exits non-zero and is never written into product data.
 *
 *   npm run evidence:confirmation:bybit:promo-code -- --candidate CRYPTOBONUSW
 *   npm run evidence:confirmation:bybit:promo-code -- --validate receipt.json --evaluate-at 2026-08-06T12:00:00Z
 */
import { build } from 'esbuild';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const getFlag = (name) => { const i = argv.indexOf(name); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null; };
const CANDIDATE = getFlag('--candidate') || 'CRYPTOBONUSW';
const VALIDATE = getFlag('--validate');
const STRUCTURAL = getFlag('--structural');
const EVALUATE_AT = getFlag('--evaluate-at');
const OUT = join(ROOT, 'scripts/evidence/out-bybit-promo-code-confirmation.json');

async function loadContract() {
  const tmp = mkdtempSync(join(tmpdir(), 'cbw-confirm-'));
  const outfile = join(tmp, 'c.mjs');
  await build({ stdin: { contents: `export * from ${JSON.stringify(join(ROOT, 'src/data/contracts/claimConfirmation.ts'))};`, resolveDir: ROOT, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
  return { m: await import(pathToFileURL(outfile).href), cleanup: () => rmSync(tmp, { recursive: true, force: true }) };
}

function buildDraftTemplate(m, candidate) {
  const norm = m.normalizeReferralCode(candidate);
  if (!norm.ok) return { error: `candidate value is not a valid referral code (${norm.reason})` };
  const value = norm.value;
  const P = m.BYBIT_PROMO_CODE_CONFIRMATION_POLICY;
  const stmt = m.normalizeStatement(`DRAFT TEMPLATE (UNCONFIRMED) — bybit promo referral code ${value}: no trusted source attached; do not treat as proof.`);
  const a = {
    confirmationId: 'bybit-promo-code-draft-template', exchangeId: P.exchangeId, claimId: P.claimId, assertionType: P.assertionType,
    assertedValue: value, assertedValueDigest: '', confirmedBy: 'ros190392-source', confirmationRole: 'owner',
    confirmedAt: '2026-01-01T00:00:00Z', validUntil: '2026-01-08T00:00:00Z', sourceEventAt: '2026-01-01T00:00:00Z',
    artifactIntent: 'attestation',
    sourceAssertion: { exchangeId: P.exchangeId, claimId: P.claimId, assertionType: P.assertionType, assignmentState: 'active', assertedValue: value },
    sourceKind: 'github_issue_comment', sourceUrl: null, sourceId: 'UNCONFIRMED-TEMPLATE', partnerReceipt: null,
    sourceStatement: stmt.value, sourceStatementDigest: '', status: 'draft', replacesConfirmationId: null, revokesConfirmationId: null,
    limitations: 'Non-authorizing draft template. Attach a trusted owner/partner source and set status only after real verification.', note: null, artifactDigest: '',
  };
  a.assertedValueDigest = m.computeAssertedValueDigest(a);
  a.sourceStatementDigest = m.computeSourceStatementDigest(a.sourceStatement);
  a.artifactDigest = m.computeConfirmationArtifactDigest(a);
  return { artifact: a };
}

function readArtifacts(pathArg) {
  const p = isAbsolute(pathArg) ? pathArg : join(ROOT, pathArg);
  const raw = JSON.parse(readFileSync(p, 'utf8'));
  return Array.isArray(raw) ? raw : [raw];
}

async function main() {
  const { m, cleanup } = await loadContract();
  try {
    if (STRUCTURAL) {
      const list = readArtifacts(STRUCTURAL);
      let bad = 0;
      list.forEach((a, i) => { const v = m.validateClaimConfirmation(a); console.log(`[${i}] structural: ${v.ok ? 'OK' : 'INVALID'}`); if (!v.ok) { bad++; console.log(`     ${JSON.stringify(v.issues)}`); } });
      console.log('Structural-only mode: no lifecycle evaluation performed (no clock).');
      process.exitCode = bad ? 1 : 0;
      return;
    }
    if (VALIDATE) {
      if (!EVALUATE_AT) { console.error('--validate requires an explicit --evaluate-at <ISO> (no Date.now fallback).'); process.exitCode = 1; return; }
      // Reuse the contract's strict calendar-valid parser via the evaluator: an
      // invalid clock yields a non-finite value that we reject here explicitly.
      const evalMs = Date.parse(EVALUATE_AT);
      const strictOk = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(EVALUATE_AT) && Number.isFinite(evalMs);
      if (!strictOk) { console.error(`--evaluate-at is not a strict calendar-valid ISO datetime: ${EVALUATE_AT}`); process.exitCode = 1; return; }
      const list = readArtifacts(VALIDATE);
      let bad = 0;
      list.forEach((a, i) => { const v = m.validateClaimConfirmation(a); console.log(`[${i}] structural: ${v.ok ? 'OK' : 'INVALID'}`); if (!v.ok) { bad++; console.log(`     ${JSON.stringify(v.issues)}`); } else { const adm = m.promoAdmissibilityIssues(v.value, m.BYBIT_PROMO_CODE_CONFIRMATION_POLICY); if (adm.length) console.log(`     production policy: NOT ADMISSIBLE ${JSON.stringify(adm)}`); } });
      const res = m.evaluateBybitPromoCodeConfirmations(list, evalMs);
      console.log(`\nEvaluation clock (--evaluate-at): ${EVALUATE_AT}`);
      console.log(`Production evaluator state (informational only, NOT written to product data): ${res.state}${res.value ? ` (value ${res.value})` : ''}`);
      console.log('This command never writes into the real packet, offers.ts or approver metadata.');
      process.exitCode = bad ? 1 : 0;
      return;
    }

    const built = buildDraftTemplate(m, CANDIDATE);
    if (built.error) { console.error(`Cannot build template: ${built.error}`); process.exitCode = 1; return; }
    const v = m.validateClaimConfirmation(built.artifact);
    if (!v.ok) { console.error('Generated template FAILED contract validation — NOT writing.'); console.error(JSON.stringify(v.issues, null, 2)); process.exitCode = 1; return; }
    writeFileSync(OUT, JSON.stringify(built.artifact, null, 2));
    console.log('Wrote NON-AUTHORIZING draft confirmation template (transient, gitignored):');
    console.log(`  ${OUT}`);
    console.log(`  candidate value: ${built.artifact.assertedValue}  (UNCONFIRMED)`);
    console.log(`  status: ${built.artifact.status}  intent: ${built.artifact.artifactIntent}  (no trusted source attached)`);
    console.log('\nThis is a template only. It proves nothing and must not be committed.');
    console.log('A real confirmation requires a separately-supplied factual owner/partner receipt.');
    console.log('To evaluate a receipt offline: --validate <file> --evaluate-at <ISO>.');
  } finally {
    cleanup();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
