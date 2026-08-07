/**
 * ISOLATED synthetic confirmation fixtures (Issue #262).
 *
 * The synthetic trusted-partner policy, synthetic partner identity/domain and synthetic
 * confirmation artifacts used to prove the positive algorithmic path live ONLY here,
 * under `scripts/portal/test-support/**`. They are NEVER exported from a production
 * `src/**` module and NEVER enter product data or a production bundle. Consumers pass in
 * the already-bundled contracts module `m` so these fixtures reuse the EXACT production
 * validators / digest functions.
 */

/** Synthetic partner trust — test-only; must never appear in `src/**` or product data. */
export const SYNTHETIC_PARTNER_IDENTITY = 'test-partner-fixture';
export const SYNTHETIC_PARTNER_DOMAIN = 'partner.test';

/**
 * Build the synthetic trusted-partner policy from the PRODUCTION policy (adds only a
 * synthetic trusted partner identity/domain). This is the former
 * `TEST_ONLY_PROMO_CODE_POLICY`, now confined to test support.
 */
export function makeSyntheticPromoPolicy(m) {
  return Object.freeze({
    ...m.BYBIT_PROMO_CODE_CONFIRMATION_POLICY,
    trustedPartnerIdentities: Object.freeze([SYNTHETIC_PARTNER_IDENTITY]),
    trustedPartnerDomains: Object.freeze([SYNTHETIC_PARTNER_DOMAIN]),
  });
}

export function finalizeConfirmation(m, a) {
  a.assertedValueDigest = m.computeAssertedValueDigest(a);
  a.sourceStatementDigest = m.computeSourceStatementDigest(a.sourceStatement);
  if (a.partnerReceipt) {
    a.partnerReceipt.normalizedAssertion = m.canonicalSourceAssertion(a.sourceAssertion);
    a.partnerReceipt.normalizedReceiptDigest = m.computeReceiptDigest(a.partnerReceipt);
  }
  a.artifactDigest = m.computeConfirmationArtifactDigest(a);
  return a;
}

/** A synthetic, structurally-valid partner confirmation for the candidate value. */
export function makeSyntheticPartnerConfirmation(m, candidate, over = {}) {
  const sa = { exchangeId: 'bybit', claimId: 'bybit.promo_code', assertionType: 'exact_referral_code_assignment', assignmentState: 'active', assertedValue: candidate };
  const base = {
    confirmationId: 'harness-partner', exchangeId: 'bybit', claimId: 'bybit.promo_code', assertionType: 'exact_referral_code_assignment',
    assertedValue: candidate, assertedValueDigest: '', confirmedBy: SYNTHETIC_PARTNER_IDENTITY, confirmationRole: 'partner',
    confirmedAt: '2026-08-05T00:00:00Z', validUntil: '2026-10-01T00:00:00Z', sourceEventAt: '2026-08-04T00:00:00Z',
    artifactIntent: 'attestation', sourceAssertion: sa, sourceKind: 'partner_dashboard_receipt', sourceUrl: null, sourceId: 'harness-receipt',
    partnerReceipt: { issuerId: SYNTHETIC_PARTNER_IDENTITY, issuerDomain: SYNTHETIC_PARTNER_DOMAIN, receiptKind: 'partner_dashboard_receipt', receiptId: 'harness-receipt', issuedAt: '2026-08-04T00:00:00Z', normalizedAssertion: '', normalizedReceiptDigest: '', redactionVersion: 'v1' },
    sourceStatement: 'Synthetic test partner receipt attests active referral code assignment.', sourceStatementDigest: '', status: 'confirmed',
    replacesConfirmationId: null, revokesConfirmationId: null, limitations: 'Synthetic test fixture; never product data.', note: null, artifactDigest: '',
  };
  return finalizeConfirmation(m, { ...base, ...over });
}

/** A synthetic official-source CONTENT capture bound to a real candidate (proves components). */
export function makeContentSource(m, candidateId, observedScope, fragSpecs, bodyDigest) {
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

/** Official content covering every target claim's material components (independent docs). */
export function makeSyntheticOfficialSources(m) {
  return [
    makeContentSource(m, 'promo-new-user', 'promotion_specific', [
      { claimIds: ['bybit.bonus_headline'], componentIds: ['max-reward-figure', 'reward-is-welcome-package'] },
      { claimIds: ['bybit.kyc_required'], componentIds: ['kyc-required-for-this-promo', 'kyc-required-to-withdraw-reward'] },
      { claimIds: ['bybit.deposit_required'], componentIds: ['deposit-task-in-this-promo'] },
      { claimIds: ['bybit.availability'], componentIds: ['offer-active'] },
      { claimIds: ['bybit.terms_summary'], componentIds: ['new-accounts-only', 'kyc-to-withdraw'] },
      { claimIds: ['bybit.fee_discount'], componentIds: ['fee-discount-figure'] },
      { claimIds: ['bybit.min_deposit'], componentIds: ['min-deposit-tiered'] },
    ], 'sha256:' + '1'.repeat(64)),
    makeContentSource(m, 'help-kyc-identity', 'identity_verification_general', [
      { claimIds: ['bybit.kyc_required'], componentIds: ['identity-verification-exists'] },
    ], 'sha256:' + '2'.repeat(64)),
    makeContentSource(m, 'help-restricted-jurisdictions', 'legal_restrictions', [
      { claimIds: ['bybit.restricted_countries'], componentIds: ['restricted-list-matches'] },
      { claimIds: ['bybit.availability'], componentIds: ['global-with-exclusions'] },
    ], 'sha256:' + '3'.repeat(64)),
    makeContentSource(m, 'help-what-is-bonus', 'reward_mechanics', [
      { claimIds: ['bybit.reward_type'], componentIds: ['reward-instrument-form', 'withdrawal-conversion-limits'] },
      { claimIds: ['bybit.terms_summary'], componentIds: ['volume-conditions-higher-tiers', 'voucher-expiry-window'] },
      { claimIds: ['bybit.expiry'], componentIds: ['voucher-expiry-window'] },
    ], 'sha256:' + '4'.repeat(64)),
  ];
}

/** A synthetic complete, approved packet whose target claims stay raw-inaccessible. */
export function makeSyntheticCompletePacket(m, nowMs) {
  const OFFICIAL = 'https://www.bybit.com/en/promo/new-user/';
  const capturedAt = new Date(nowMs - 86400000).toISOString();
  const cap = { captureId: 'probe-a', sourceUrl: OFFICIAL, capturedAt, observedStatus: 200, redirectLocation: null, responseBytes: 2048, bodyDigest: 'sha256:' + 'b'.repeat(64), contentType: 'text/html', normalizedObservation: 'synthetic official capture' };
  const claims = m.BYBIT_OFFER_CLAIM_INVENTORY.map((id) =>
    id === 'bybit.realistic_value' ? { claimId: id, label: id, result: 'not_found', observed: 'obs', sourceRefs: ['editorial:cbw'], limitation: '' }
      : id === 'bybit.promo_code' ? { claimId: id, label: id, result: 'requires_owner_partner_confirmation', observed: 'obs', sourceRefs: ['capture:probe-a'], limitation: '' }
        : id === 'bybit.source_identity' ? { claimId: id, label: id, result: 'supported', observed: 'obs', sourceRefs: ['capture:probe-a'], limitation: '' }
          : { claimId: id, label: id, result: 'inaccessible', observed: 'obs', sourceRefs: ['capture:probe-a'], limitation: '' });
  const packet = {
    packetId: 'bybit-harness-approved', exchangeId: 'bybit', capturedAt, nextReviewAt: '2026-12-31T00:00:00Z',
    sourceUrl: OFFICIAL, primaryCaptureId: 'probe-a', captureMethod: 'synthetic', captureTool: 'harness/1.0',
    captures: [cap], officialSourceCaptures: makeSyntheticOfficialSources(m), claims, warnings: [], limitations: [], approval: 'approved',
    approver: { approvedBy: 'ros190392-source', approvedAt: capturedAt, approvalRef: 'https://github.com/ros190392-source/cryptobonusworld/pull/259#pullrequestreview-1' },
  };
  packet.captureManifestDigest = m.computeCaptureManifestDigest(packet.captures);
  return packet;
}
