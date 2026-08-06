/**
 * ISOLATED test-support harness (Issue #258 R8, hardened for Issue #262).
 *
 * Proves the synthetic-positive path at COMPONENT level using ONLY production
 * non-authorizing primitives (the generic confirmation evaluator, the source-plan
 * assessment, packet readiness validation and EvidenceMetadata validation) plus the
 * synthetic fixtures under `scripts/portal/test-support/**`. It NEVER calls a production
 * test resolver or test adapter (both were removed from `src/**` in #262), and it never
 * duplicates the full production adapter as a second authorizing implementation. The
 * ONLY EvidenceMetadata-producing path is the production `adaptBybitOfferToEvidence`,
 * which this harness asserts is non-authorizing over real product data.
 *
 * `runResolutionHarness(m, nowMs)` receives the already-bundled contracts module `m` and
 * returns a pass/fail report.
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  makeSyntheticPromoPolicy,
  makeSyntheticPartnerConfirmation,
  makeSyntheticCompletePacket,
  makeSyntheticOfficialSources,
} from './synthetic-confirmation-fixtures.mjs';

export function runResolutionHarness(m, nowMs) {
  const results = [];
  let fail = 0;
  const ok = (name, cond) => { if (!cond) fail++; results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}`); };

  const CAND = m.BYBIT_PROMO_CODE_CONFIRMATION_POLICY.candidateValue;
  const syntheticPolicy = makeSyntheticPromoPolicy(m);
  const partner = makeSyntheticPartnerConfirmation(m, CAND);
  const sources = makeSyntheticOfficialSources(m);
  const packet = makeSyntheticCompletePacket(m, nowMs);
  const requiredNonPromo = m.BYBIT_OFFER_REQUIRED_CLAIMS.filter((c) => c !== 'bybit.promo_code' && c !== 'bybit.source_identity');

  // Component 1 — the synthetic policy confirms the EXACT synthetic value (generic
  // evaluator; no EvidenceMetadata produced). A wrong value must NOT confirm.
  const ev = m.evaluatePromoCodeConfirmations([partner], nowMs, syntheticPolicy);
  const evWrong = m.evaluatePromoCodeConfirmations([makeSyntheticPartnerConfirmation(m, 'OTHERCODE9', { sourceAssertion: { exchangeId: 'bybit', claimId: 'bybit.promo_code', assertionType: 'exact_referral_code_assignment', assignmentState: 'active', assertedValue: 'OTHERCODE9' } })], nowMs, syntheticPolicy);
  ok('harness/1: synthetic policy confirms the exact synthetic value; wrong value does not', ev.state === 'confirmed' && ev.value === CAND && evWrong.state !== 'confirmed');

  // Component 2 — synthetic source-plan evidence resolves every required non-promo claim.
  const run = m.buildOfficialSourceEvidenceRun(sources, nowMs, 'harness-run');
  const allResolved = run.ok && requiredNonPromo.every((id) => m.assessOfferClaimEvidence(id, run, nowMs).result === 'supported');
  ok('harness/2: synthetic source-plan evidence resolves all required non-promo claims supported', allResolved);

  // Component 3 — synthetic packet readiness inputs are structurally valid.
  ok('harness/3: synthetic complete packet is structurally valid', m.validateOfferEvidencePacket(packet).ok === true);

  // Component 4 — the expected EvidenceMetadata SHAPE passes validateEvidenceMetadata.
  const expectedEvidence = { evidenceCheckedAt: packet.capturedAt, nextReviewAt: packet.nextReviewAt, sourceUrl: packet.sourceUrl, exchangeId: 'bybit' };
  ok('harness/4: expected EvidenceMetadata shape passes validateEvidenceMetadata', m.validateEvidenceMetadata(expectedEvidence).ok === true);

  // Component 5 — the REAL production adapter is non-authorizing over real product data
  // (empty confirmation set) AND rejects the synthetic partner set (empty production
  // trust). There is no production test adapter to route around this.
  const prodEmpty = m.adaptBybitOfferToEvidence(packet, [], nowMs);
  const prodSynthetic = m.adaptBybitOfferToEvidence(packet, [partner], nowMs);
  ok('harness/5: production adapter rejects the real empty set and the synthetic partner set', prodEmpty.ok === false && prodSynthetic.ok === false);

  return { pass: results.length - fail, fail, results };
}

/* Standalone runner: `node scripts/portal/test-support/offer-packet-resolution-harness.mjs`.
 * Bundles the exact production primitives and drives the component-level synthetic proof.
 * This harness is never imported by product code and is not part of production exports. */
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const { build } = await import('esbuild');
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join, resolve } = await import('node:path');
  const ROOT = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
  const tmp = mkdtempSync(join(tmpdir(), 'cbw-harness-'));
  const outfile = join(tmp, 'c.mjs');
  await build({
    stdin: {
      contents:
        `export * from ${JSON.stringify(join(ROOT, 'src/data/contracts/claimConfirmation.ts'))};\n` +
        `export { adaptBybitOfferToEvidence, resolveBybitOfferPacketClaims } from ${JSON.stringify(join(ROOT, 'src/data/contracts/offerPacketResolution.ts'))};\n` +
        `export { validateEvidenceMetadata } from ${JSON.stringify(join(ROOT, 'src/data/contracts/evidenceMetadata.ts'))};\n` +
        `export { computeOfficialFragmentDigest, computeOfficialSourceDigest } from ${JSON.stringify(join(ROOT, 'src/data/contracts/officialSourceCapture.ts'))};\n` +
        `export { BYBIT_OFFICIAL_SOURCE_CANDIDATES, BYBIT_SOURCE_PLAN_ID, BYBIT_SOURCE_PLAN_DIGEST, assessOfferClaimEvidence, buildOfficialSourceEvidenceRun, SOURCE_PLAN_TARGET_CLAIMS } from ${JSON.stringify(join(ROOT, 'src/data/contracts/bybitOfferClaimSourcePlan.ts'))};\n` +
        `export { validateOfferEvidencePacket, BYBIT_OFFER_CLAIM_INVENTORY, BYBIT_OFFER_REQUIRED_CLAIMS, computeCaptureManifestDigest } from ${JSON.stringify(join(ROOT, 'src/data/contracts/offerEvidencePacket.ts'))};`,
      resolveDir: ROOT, loader: 'ts',
    },
    bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent',
  });
  const m = await import(pathToFileURL(outfile).href);
  const report = runResolutionHarness(m, Date.parse('2026-08-06T00:00:00Z'));
  rmSync(tmp, { recursive: true, force: true });
  console.log(report.results.join('\n'));
  console.log(`\nresolution harness: ${report.pass} passed, ${report.fail} failed`);
  process.exit(report.fail ? 1 : 0);
}
