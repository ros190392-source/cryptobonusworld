/**
 * ISOLATED test-support harness (Issue #258, R8).
 *
 * Proves the synthetic-positive resolution/adaptation path WITHOUT ever using the
 * production authorizing API with real product data. It is deliberately kept out of
 * `src/`: it is NOT imported by any product code and is NOT part of production
 * exports. It builds a synthetic complete packet, a synthetic TEST-policy partner
 * confirmation and an exact synthetic promo confirmation, and drives them through the
 * TEST-only adapter (`adaptOfferToEvidenceForTest`). The production adapter must reject
 * this synthetic partner set (empty/untrusted production trust), which is asserted here.
 *
 * `runResolutionHarness(m, nowMs)` receives the already-bundled contracts module `m`
 * (so it reuses the EXACT digest/validation logic) and returns a pass/fail report.
 */

import { fileURLToPath, pathToFileURL } from 'node:url';

const CAND = 'CRYPTOBONUSW';

function finalizeConfirmation(m, a) {
  a.assertedValueDigest = m.computeAssertedValueDigest(a);
  a.sourceStatementDigest = m.computeSourceStatementDigest(a.sourceStatement);
  if (a.partnerReceipt) {
    a.partnerReceipt.normalizedAssertion = m.canonicalSourceAssertion(a.sourceAssertion);
    a.partnerReceipt.normalizedReceiptDigest = m.computeReceiptDigest(a.partnerReceipt);
  }
  a.artifactDigest = m.computeConfirmationArtifactDigest(a);
  return a;
}

function syntheticPartnerConfirmation(m) {
  const sa = { exchangeId: 'bybit', claimId: 'bybit.promo_code', assertionType: 'exact_referral_code_assignment', assignmentState: 'active', assertedValue: CAND };
  return finalizeConfirmation(m, {
    confirmationId: 'harness-partner', exchangeId: 'bybit', claimId: 'bybit.promo_code', assertionType: 'exact_referral_code_assignment',
    assertedValue: CAND, assertedValueDigest: '', confirmedBy: 'test-partner-fixture', confirmationRole: 'partner',
    confirmedAt: '2026-08-05T00:00:00Z', validUntil: '2026-10-01T00:00:00Z', sourceEventAt: '2026-08-04T00:00:00Z',
    artifactIntent: 'attestation', sourceAssertion: sa, sourceKind: 'partner_dashboard_receipt', sourceUrl: null, sourceId: 'harness-receipt',
    partnerReceipt: { issuerId: 'test-partner-fixture', issuerDomain: 'partner.test', receiptKind: 'partner_dashboard_receipt', receiptId: 'harness-receipt', issuedAt: '2026-08-04T00:00:00Z', normalizedAssertion: '', normalizedReceiptDigest: '', redactionVersion: 'v1' },
    sourceStatement: 'Synthetic test partner receipt attests active referral code assignment.', sourceStatementDigest: '', status: 'confirmed',
    replacesConfirmationId: null, revokesConfirmationId: null, limitations: 'Synthetic test fixture; never product data.', note: null, artifactDigest: '',
  });
}

// A synthetic official-source CONTENT capture bound to a real candidate, proving the
// listed claim components (Issue #260, R9: source-plan target claims are authorized only
// by the assessment over official content, never raw-supported).
function contentSource(m, candidateId, observedScope, fragSpecs, bodyDigest) {
  const c = m.BYBIT_OFFICIAL_SOURCE_CANDIDATES.find((x) => x.candidateId === candidateId);
  const fragments = fragSpecs.map((fs, i) => {
    const f = { fragmentId: `${candidateId}-f${i}`, sourceId: candidateId, extractionType: 'visible_text', locator: 'h1', text: fs.text || `synthetic official evidence ${i}`, claimIds: fs.claimIds, assertionComponentIds: fs.componentIds, stance: 'supports', limitation: 'synthetic test fixture' };
    f.textLength = f.text.length; f.fragmentDigest = m.computeOfficialFragmentDigest(f); return f;
  });
  const fragIds = fragments.map((f) => f.fragmentId);
  const s = {
    sourceId: candidateId, exchangeId: 'bybit', candidateId, planId: m.BYBIT_SOURCE_PLAN_ID, planDigest: m.BYBIT_SOURCE_PLAN_DIGEST,
    requestedUrl: c.url, finalUrl: c.url, redirectChain: [], capturedAt: '2026-08-05T00:00:00Z',
    captureMethod: 'synthetic', captureTool: 'harness/1.0', runtimeVersion: 'v24', captureMethodUsed: 'http',
    httpStatus: 200, contentType: 'text/html', declaredScope: c.declaredScope, observedScope, currency: 'current',
    scopeAssessment: { classifiedScope: observedScope, classificationRuleId: 'content-observed', evidenceRefs: fragIds, confidence: 'high', limitations: 'synthetic' },
    currencyAssessment: { currency: 'current', ruleId: 'observed-current-campaign', evidenceRefs: fragIds, observedTime: null, limitations: 'synthetic' },
    outcome: 'content', responseBytes: 2048, bodyDigest: bodyDigest || ('sha256:' + 'b'.repeat(64)),
    fragments, structuredMetadata: { pageTitle: null, description: null, canonicalUrl: null, ogTitle: null, ogDescription: null, jsonLdType: null },
    runtimeReceipt: { authenticationUsed: false, cookiesSent: false, cookiesStored: false, proxyConfigured: false, bodyPersisted: false, redirectsObserved: 0, externalRedirectsBlocked: 0 },
    warnings: [], limitations: [], sourceDigest: 'sha256:' + '0'.repeat(64),
  };
  s.sourceDigest = m.computeOfficialSourceDigest(s);
  return s;
}

function syntheticCompletePacket(m, nowMs) {
  const OFFICIAL = 'https://www.bybit.com/en/promo/new-user/';
  const capturedAt = new Date(nowMs - 86400000).toISOString();
  const cap = { captureId: 'probe-a', sourceUrl: OFFICIAL, capturedAt, observedStatus: 200, redirectLocation: null, responseBytes: 2048, bodyDigest: 'sha256:' + 'b'.repeat(64), contentType: 'text/html', normalizedObservation: 'synthetic official capture' };
  // Source-plan target claims stay inaccessible in the RAW packet; the resolver upgrades
  // them from the official-source content below. Only source_identity is raw-supported.
  const claims = m.BYBIT_OFFER_CLAIM_INVENTORY.map((id) =>
    id === 'bybit.realistic_value' ? { claimId: id, label: id, result: 'not_found', observed: 'obs', sourceRefs: ['editorial:cbw'], limitation: '' }
      : id === 'bybit.promo_code' ? { claimId: id, label: id, result: 'requires_owner_partner_confirmation', observed: 'obs', sourceRefs: ['capture:probe-a'], limitation: '' }
        : id === 'bybit.source_identity' ? { claimId: id, label: id, result: 'supported', observed: 'obs', sourceRefs: ['capture:probe-a'], limitation: '' }
          : { claimId: id, label: id, result: 'inaccessible', observed: 'obs', sourceRefs: ['capture:probe-a'], limitation: '' });
  // Official content proving every target claim's material components (independent docs
  // for the multiple_required terms_summary).
  const officialSourceCaptures = [
    contentSource(m, 'promo-new-user', 'promotion_specific', [
      { claimIds: ['bybit.bonus_headline'], componentIds: ['max-reward-figure', 'reward-is-welcome-package'] },
      { claimIds: ['bybit.kyc_required'], componentIds: ['kyc-required-for-this-promo', 'kyc-required-to-withdraw-reward'] },
      { claimIds: ['bybit.deposit_required'], componentIds: ['deposit-task-in-this-promo'] },
      { claimIds: ['bybit.availability'], componentIds: ['offer-active'] },
      { claimIds: ['bybit.terms_summary'], componentIds: ['new-accounts-only', 'kyc-to-withdraw'] },
      { claimIds: ['bybit.fee_discount'], componentIds: ['fee-discount-figure'] },
      { claimIds: ['bybit.min_deposit'], componentIds: ['min-deposit-tiered'] },
    ], 'sha256:' + '1'.repeat(64)),
    contentSource(m, 'help-kyc-identity', 'identity_verification_general', [
      { claimIds: ['bybit.kyc_required'], componentIds: ['identity-verification-exists'] },
    ], 'sha256:' + '2'.repeat(64)),
    contentSource(m, 'help-restricted-jurisdictions', 'legal_restrictions', [
      { claimIds: ['bybit.restricted_countries'], componentIds: ['restricted-list-matches'] },
      { claimIds: ['bybit.availability'], componentIds: ['global-with-exclusions'] },
    ], 'sha256:' + '3'.repeat(64)),
    contentSource(m, 'help-what-is-bonus', 'reward_mechanics', [
      { claimIds: ['bybit.reward_type'], componentIds: ['reward-instrument-form', 'withdrawal-conversion-limits'] },
      { claimIds: ['bybit.terms_summary'], componentIds: ['volume-conditions-higher-tiers', 'voucher-expiry-window'] },
      { claimIds: ['bybit.expiry'], componentIds: ['voucher-expiry-window'] },
    ], 'sha256:' + '4'.repeat(64)),
  ];
  const packet = {
    packetId: 'bybit-harness-approved', exchangeId: 'bybit', capturedAt, nextReviewAt: '2026-12-31T00:00:00Z',
    sourceUrl: OFFICIAL, primaryCaptureId: 'probe-a', captureMethod: 'synthetic', captureTool: 'harness/1.0',
    captures: [cap], officialSourceCaptures, claims, warnings: [], limitations: [], approval: 'approved',
    approver: { approvedBy: 'ros190392-source', approvedAt: capturedAt, approvalRef: 'https://github.com/ros190392-source/cryptobonusworld/pull/259#pullrequestreview-1' },
  };
  packet.captureManifestDigest = m.computeCaptureManifestDigest(packet.captures);
  return packet;
}

export function runResolutionHarness(m, nowMs) {
  const results = [];
  let fail = 0;
  const ok = (name, cond) => { if (!cond) fail++; results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}`); };

  const identity = { exchangeSlug: 'bybit', promoCode: CAND };
  const TPOL = m.TEST_ONLY_PROMO_CODE_POLICY;
  const partner = syntheticPartnerConfirmation(m);
  const packet = syntheticCompletePacket(m, nowMs);

  // Positive resolved view under the TEST policy.
  const resolved = m.resolveOfferPacketClaimsForTest(packet, [partner], nowMs, identity, TPOL);
  ok('harness/resolve: TEST-policy resolution is confirmed + no blocking', !!resolved && resolved.ok && resolved.policyMode === 'test' && resolved.confirmationEvaluation.state === 'confirmed' && resolved.blockingRequiredClaims.length === 0);
  ok('harness/resolve: audit snapshot is deeply frozen', !!resolved && Object.isFrozen(resolved) && Object.isFrozen(resolved.resolvedClaims) && Object.isFrozen(resolved.resolvedClaims[0]));

  // TEST-only adapter produces an EvidenceMetadata-shaped result.
  const adapted = m.adaptOfferToEvidenceForTest(packet, [partner], nowMs, identity, TPOL);
  ok('harness/adapt: TEST adapter yields EvidenceMetadata (test-only)', adapted.ok === true && adapted.evidence.exchangeId === 'bybit' && adapted.resolution.policyMode === 'test');

  // The production adapter must REJECT the synthetic partner set (untrusted production trust).
  const prod = m.adaptBybitOfferToEvidence(packet, [partner], nowMs);
  ok('harness/isolation: production adapter rejects synthetic partner set', prod.ok === false);

  // The TEST adapter must REFUSE the production policy.
  const refused = m.adaptOfferToEvidenceForTest(packet, [partner], nowMs, identity, m.BYBIT_PROMO_CODE_CONFIRMATION_POLICY);
  ok('harness/isolation: TEST adapter refuses the production policy', refused.ok === false && refused.reason === 'USE_PRODUCT_ADAPTER');

  return { pass: results.length - fail, fail, results };
}

/* Standalone runner: `node scripts/portal/test-support/offer-packet-resolution-harness.mjs`.
 * Bundles the exact contract exports and drives the synthetic-positive proof. This
 * harness is never imported by product code and is not part of production exports. */
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
        `export * from ${JSON.stringify(join(ROOT, 'src/data/contracts/offerPacketResolution.ts'))};\n` +
        `export { computeOfficialFragmentDigest, computeOfficialSourceDigest } from ${JSON.stringify(join(ROOT, 'src/data/contracts/officialSourceCapture.ts'))};\n` +
        `export { BYBIT_OFFICIAL_SOURCE_CANDIDATES, BYBIT_SOURCE_PLAN_ID, BYBIT_SOURCE_PLAN_DIGEST } from ${JSON.stringify(join(ROOT, 'src/data/contracts/bybitOfferClaimSourcePlan.ts'))};\n` +
        `export { BYBIT_OFFER_CLAIM_INVENTORY, computeCaptureManifestDigest } from ${JSON.stringify(join(ROOT, 'src/data/contracts/offerEvidencePacket.ts'))};`,
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
