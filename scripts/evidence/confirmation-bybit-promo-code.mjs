#!/usr/bin/env node
/**
 * Manual, OFFLINE Bybit promo-code confirmation intake helper (Issue #256).
 *
 * Default: writes a NON-AUTHORIZING draft confirmation TEMPLATE to a transient,
 * gitignored path. It never authenticates to GitHub/Bybit/email, never reads
 * secrets or private profiles, never scrapes accounts, never marks anything
 * `confirmed`, never touches the real packet / offers.ts / approver metadata, and
 * never commits. If the generated template fails contract validation it writes
 * nothing and exits non-zero.
 *
 *   npm run evidence:confirmation:bybit:promo-code -- --candidate CRYPTOBONUSW
 *
 * Explicit offline validation of a user-supplied normalized receipt (never written
 * into product data):
 *
 *   npm run evidence:confirmation:bybit:promo-code -- --validate path/to/receipt.json
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
const OUT = join(ROOT, 'scripts/evidence/out-bybit-promo-code-confirmation.json');

async function loadContract() {
  const tmp = mkdtempSync(join(tmpdir(), 'cbw-confirm-'));
  const outfile = join(tmp, 'c.mjs');
  await build({
    stdin: { contents: `export * from ${JSON.stringify(join(ROOT, 'src/data/contracts/claimConfirmation.ts'))};`, resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent',
  });
  const m = await import(pathToFileURL(outfile).href);
  return { m, cleanup: () => rmSync(tmp, { recursive: true, force: true }) };
}

function buildDraftTemplate(m, candidate) {
  const norm = m.normalizeReferralCode(candidate);
  if (!norm.ok) return { error: `candidate value is not a valid referral code (${norm.reason})` };
  const value = norm.value;
  const P = m.BYBIT_PROMO_CODE_CONFIRMATION_POLICY;
  const statement = `DRAFT TEMPLATE (UNCONFIRMED) — bybit promo referral code ${value}: no trusted source attached; do not treat as proof.`;
  const a = {
    confirmationId: 'bybit-promo-code-draft-template',
    exchangeId: P.exchangeId,
    claimId: P.claimId,
    assertionType: P.assertionType,
    assertedValue: value,
    assertedValueDigest: '',
    confirmedBy: 'ros190392-source',
    confirmationRole: 'owner',
    confirmedAt: '2026-01-01T00:00:00Z',
    validUntil: '2026-01-08T00:00:00Z',
    sourceEventAt: '2026-01-01T00:00:00Z',
    sourceKind: 'github_issue_comment',
    sourceUrl: null,
    sourceId: 'UNCONFIRMED-TEMPLATE',
    sourceStatement: statement,
    sourceStatementDigest: '',
    status: 'draft',
    replacesConfirmationId: null,
    revokesConfirmationId: null,
    limitations: 'Non-authorizing draft template. Attach a trusted owner/partner source and set status only after real verification.',
    note: null,
    artifactDigest: '',
  };
  a.assertedValueDigest = m.computeAssertedValueDigest(a);
  a.sourceStatementDigest = m.computeSourceStatementDigest(a.sourceStatement);
  a.artifactDigest = m.computeConfirmationArtifactDigest(a);
  return { artifact: a };
}

async function main() {
  const { m, cleanup } = await loadContract();
  try {
    if (VALIDATE) {
      const p = isAbsolute(VALIDATE) ? VALIDATE : join(ROOT, VALIDATE);
      const raw = JSON.parse(readFileSync(p, 'utf8'));
      const list = Array.isArray(raw) ? raw : [raw];
      let bad = 0;
      list.forEach((a, i) => {
        const v = m.validateClaimConfirmation(a);
        const adm = v.ok ? m.bybitPromoAdmissibilityIssues(v.value) : [];
        console.log(`\n[${i}] structural: ${v.ok ? 'OK' : 'INVALID'}`);
        if (!v.ok) { bad++; console.log(`     issues: ${JSON.stringify(v.issues)}`); }
        else if (adm.length) console.log(`     policy: NOT ADMISSIBLE ${JSON.stringify(adm)}`);
        else console.log('     policy: admissible (still non-authorizing until the evaluator confirms the set)');
      });
      const evalRes = m.evaluateBybitPromoCodeConfirmations(list, Date.parse('2026-08-06T12:00:00Z'));
      console.log(`\nOFFLINE evaluator state (informational only, NOT written to product data): ${evalRes.state}`);
      console.log('This command never writes into the real packet, offers.ts or approver metadata.');
      process.exitCode = bad ? 1 : 0;
      return;
    }

    const built = buildDraftTemplate(m, CANDIDATE);
    if (built.error) { console.error(`Cannot build template: ${built.error}`); process.exitCode = 1; return; }
    const v = m.validateClaimConfirmation(built.artifact);
    if (!v.ok) { console.error('Generated template FAILED contract validation — NOT writing.'); console.error(JSON.stringify(v.issues, null, 2)); process.exitCode = 1; return; }
    // A draft must be non-authorizing.
    const evalRes = m.evaluateBybitPromoCodeConfirmations([built.artifact], Date.parse('2026-08-06T12:00:00Z'));
    if (evalRes.state === 'confirmed') { console.error('Draft template unexpectedly evaluated as confirmed — refusing to write.'); process.exitCode = 1; return; }
    writeFileSync(OUT, JSON.stringify(built.artifact, null, 2));
    console.log('Wrote NON-AUTHORIZING draft confirmation template (transient, gitignored):');
    console.log(`  ${OUT}`);
    console.log(`  candidate value: ${built.artifact.assertedValue}  (UNCONFIRMED)`);
    console.log(`  status: ${built.artifact.status}   evaluator state for this draft alone: ${evalRes.state}`);
    console.log('\nThis is a template only. It attaches NO trusted source and proves nothing.');
    console.log('It does not modify the real packet, offers.ts or approver metadata, and must not be committed.');
    console.log('A real confirmation requires a separately-supplied factual owner/partner receipt.');
  } finally {
    cleanup();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
