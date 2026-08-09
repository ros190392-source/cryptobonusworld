#!/usr/bin/env node
import { build } from 'esbuild';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const TMP = mkdtempSync(join(tmpdir(), 'cbw-promotion-gate-'));
const OUT = join(TMP, 'promotion.mjs');

let checks = 0;
const failures = [];
function check(name, condition, detail = '') {
  checks += 1;
  if (!condition) failures.push(detail ? `${name}: ${detail}` : name);
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }

try {
  await build({
    stdin: {
      contents: [
        `export * from ${JSON.stringify(join(ROOT, 'src/data/contracts/researchToMarketProfileV1Bridge.ts'))};`,
        `export * from ${JSON.stringify(join(ROOT, 'src/data/contracts/marketProfileCandidateReview.ts'))};`,
        `export * from ${JSON.stringify(join(ROOT, 'src/data/contracts/marketProfilePromotionGate.ts'))};`,
        `export { PUBLIC_MARKET_PROFILES } from ${JSON.stringify(join(ROOT, 'src/data/contracts/marketProfileRegistry.ts'))};`,
      ].join('\n'),
      resolveDir: ROOT,
      loader: 'ts',
      sourcefile: 'promotion-gate-test-entry.ts',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile: OUT,
    logLevel: 'silent',
  });
  const m = await import(`${pathToFileURL(OUT).href}?v=${Date.now()}`);

  const artifactBindings = [{
    path: 'research-ops/tasks/example/60-correction/20-corrected-output/MANIFEST.txt',
    digest: `sha256:${'b'.repeat(64)}`,
  }];
  const falseAuth = {
    researchImportAuthorized: false,
    stagingImportAuthorized: false,
    canonicalImportAuthorized: false,
    productionChangeAuthorized: false,
    productionBindingAuthorized: false,
    publicationAuthorized: false,
    masterChangeAuthorized: false,
  };
  const trueAuth = Object.fromEntries(Object.keys(falseAuth).map((key) => [key, true]));

  function researchPacket(authorizations) {
    return {
      schemaVersion: 1,
      provenance: {
        repository: 'ros190392-source/cryptobonusworld',
        sourceBranch: 'main',
        sourceCommitSha: 'cccccccccccccccccccccccccccccccccccccccc',
        taskId: 'CBW-PROMOTION-GATE-TEST-001',
        exchangeId: 'binance',
        countryCode: 'KZ',
        researchState: 'RESEARCH_RECORD_MERGED_TO_MAIN',
        importReadiness: 'CANDIDATE_REVIEWABLE',
        overallRecommendation: 'AVAILABLE_WITH_LIMITS_CANDIDATE',
        confidence: 'medium',
        lastCheckedAt: '2026-08-09T00:00:00Z',
        nextReviewAt: '2026-09-09T00:00:00Z',
        artifactBindings,
        authorizations,
      },
      signals: {
        availability: { signal: 'under_review', claimIds: ['CLM001'], limitations: ['Promotion still requires separate authority.'] },
        regulation: { signal: 'under_review', legalEntityClaimIds: [], licenseClaimIds: [], limitations: [] },
        kyc: { signal: 'under_review', claimIds: [], limitations: [] },
        deposits: { signal: 'under_review', claimIds: [], limitations: [] },
        withdrawals: { signal: 'under_review', claimIds: [], limitations: [] },
        fiatPayments: { signal: 'under_review', claimIds: [], limitations: [], methods: [] },
        products: { signal: 'under_review', claimIds: [], limitations: [] },
        bonusAvailability: { signal: 'under_review', claimIds: [], limitations: [] },
        restrictions: { signal: 'under_review', claimIds: [], limitations: [] },
      },
    };
  }

  function expectedBridge(packet) {
    return {
      repository: packet.provenance.repository,
      sourceCommitSha: packet.provenance.sourceCommitSha,
      taskId: packet.provenance.taskId,
      exchangeId: packet.provenance.exchangeId,
      countryCode: packet.provenance.countryCode,
      artifactBindings,
    };
  }

  function reviewFor(candidate, decision = 'ready_for_promotion_review') {
    const scope = {
      candidateDigest: candidate.candidateDigest,
      sourceCommitSha: candidate.source.sourceCommitSha,
      taskId: candidate.source.taskId,
      exchangeId: candidate.source.exchangeId,
      countryCode: candidate.source.countryCode,
    };
    const result = m.createMarketProfileCandidateReview({
      expected: scope,
      candidate,
      reviewerId: 'owner-reviewer',
      reviewedAt: '2026-08-09T19:45:00Z',
      decision,
      notes: ['Review record only; no import/publication authority.'],
    });
    if (!result.ok) throw new Error(`review fixture failed: ${result.issues.join(',')}`);
    return { packet: result.packet, scope };
  }

  function receiptFor(candidate, review, authorizations = trueAuth, overrides = {}) {
    const base = {
      schemaVersion: 1,
      authorizationType: 'MARKETPROFILE_SEPARATE_IMPORT_REVIEW',
      receiptId: 'OWNER-PROMOTION-TEST-001',
      issuer: 'owner',
      candidateDigest: candidate.candidateDigest,
      reviewDigest: review.reviewDigest,
      sourceCommitSha: candidate.source.sourceCommitSha,
      taskId: candidate.source.taskId,
      exchangeId: candidate.source.exchangeId,
      countryCode: candidate.source.countryCode,
      issuedAt: '2026-08-09T19:50:00Z',
      expiresAt: '2026-08-10T19:50:00Z',
      decision: 'approved',
      authorizations: clone(authorizations),
      ...overrides,
    };
    return { ...base, receiptDigest: m.computeMarketProfilePromotionReceiptDigest(base) };
  }

  function expectedPromotion(candidate, review, receipt) {
    return {
      candidateDigest: candidate.candidateDigest,
      reviewDigest: review.reviewDigest,
      receiptDigest: receipt.receiptDigest,
      sourceCommitSha: candidate.source.sourceCommitSha,
      taskId: candidate.source.taskId,
      exchangeId: candidate.source.exchangeId,
      countryCode: candidate.source.countryCode,
    };
  }

  const falsePacket = researchPacket(falseAuth);
  const falseCandidate = m.buildCountryMarketProfileV1Candidate({ expected: expectedBridge(falsePacket), packet: falsePacket });
  check('all-false source fixture produces candidate', falseCandidate.state === 'candidate');
  check('all-false source ceiling recorded false', falseCandidate.authorizationCeilingAllowsLaterPromotion === false);
  const falseReview = reviewFor(falseCandidate);
  const perfectReceiptOnFalseSource = receiptFor(falseCandidate, falseReview.packet);
  const falseExpected = expectedPromotion(falseCandidate, falseReview.packet, perfectReceiptOnFalseSource);
  const blockedBySource = m.evaluateMarketProfilePromotionGate({
    candidate: falseCandidate,
    review: falseReview.packet,
    receipt: perfectReceiptOnFalseSource,
    expected: falseExpected,
    now: Date.parse('2026-08-09T20:00:00Z'),
  });
  check('perfect receipt cannot override all-false source ceiling', blockedBySource.state === 'blocked' && blockedBySource.reasons.includes('SOURCE_AUTHORIZATION_CEILING_INCOMPLETE'), JSON.stringify(blockedBySource));
  check('blocked decision has no side effects', blockedBySource.readyForSeparateImport === false && blockedBySource.importPerformed === false && blockedBySource.registryMutation === false && blockedBySource.publicAuthority === false);

  const truePacket = researchPacket(trueAuth);
  const trueCandidate = m.buildCountryMarketProfileV1Candidate({ expected: expectedBridge(truePacket), packet: truePacket });
  check('all-true synthetic source fixture produces candidate', trueCandidate.state === 'candidate');
  check('all-true source ceiling recorded true', trueCandidate.authorizationCeilingAllowsLaterPromotion === true);
  const readyReview = reviewFor(trueCandidate);
  const readyReceipt = receiptFor(trueCandidate, readyReview.packet);
  const readyExpected = expectedPromotion(trueCandidate, readyReview.packet, readyReceipt);
  const ready = m.evaluateMarketProfilePromotionGate({
    candidate: trueCandidate,
    review: readyReview.packet,
    receipt: readyReceipt,
    expected: readyExpected,
    now: Date.parse('2026-08-09T20:00:00Z'),
  });
  check('all ceilings + exact review + exact receipt => ready for separate import', ready.state === 'ready_for_separate_import' && ready.readyForSeparateImport === true, JSON.stringify(ready));
  check('ready decision still performs no import/registry/publication', ready.importPerformed === false && ready.registryMutation === false && ready.publicAuthority === false);
  check('ready decision binds exact digests', ready.candidateDigest === trueCandidate.candidateDigest && ready.reviewDigest === readyReview.packet.reviewDigest && ready.receiptDigest === readyReceipt.receiptDigest);

  const readyAgain = m.evaluateMarketProfilePromotionGate({
    candidate: clone(trueCandidate), review: clone(readyReview.packet), receipt: clone(readyReceipt), expected: clone(readyExpected), now: Date.parse('2026-08-09T20:00:00Z'),
  });
  check('equivalent input is deterministic', JSON.stringify(readyAgain) === JSON.stringify(ready));
  const localeDecorated = {
    candidate: clone(trueCandidate), review: clone(readyReview.packet), receipt: clone(readyReceipt), expected: clone(readyExpected), now: Date.parse('2026-08-09T20:00:00Z'), locale: 'pl',
  };
  check('locale decoration cannot alter decision', JSON.stringify(m.evaluateMarketProfilePromotionGate(localeDecorated)) === JSON.stringify(ready));

  for (const decision of ['needs_research', 'rejected']) {
    const review = reviewFor(trueCandidate, decision);
    const receipt = receiptFor(trueCandidate, review.packet);
    const expected = expectedPromotion(trueCandidate, review.packet, receipt);
    const result = m.evaluateMarketProfilePromotionGate({ candidate: trueCandidate, review: review.packet, receipt, expected, now: Date.parse('2026-08-09T20:00:00Z') });
    check(`review ${decision} blocks promotion`, result.state === 'blocked' && result.reasons.includes('REVIEW_NOT_READY_FOR_PROMOTION'));
  }

  const tamperedReview = clone(readyReview.packet);
  tamperedReview.notes[0] = 'tampered';
  check('tampered review => invalid gate', m.evaluateMarketProfilePromotionGate({ candidate: trueCandidate, review: tamperedReview, receipt: readyReceipt, expected: readyExpected, now: Date.parse('2026-08-09T20:00:00Z') }).state === 'invalid');

  const blockedCandidate = clone(trueCandidate);
  blockedCandidate.state = 'blocked';
  blockedCandidate.proposedProfile = null;
  check('blocked candidate => invalid gate', m.evaluateMarketProfilePromotionGate({ candidate: blockedCandidate, review: readyReview.packet, receipt: readyReceipt, expected: readyExpected, now: Date.parse('2026-08-09T20:00:00Z') }).state === 'invalid');
  const invalidCandidate = clone(trueCandidate);
  invalidCandidate.state = 'invalid';
  invalidCandidate.proposedProfile = null;
  check('invalid candidate => invalid gate', m.evaluateMarketProfilePromotionGate({ candidate: invalidCandidate, review: readyReview.packet, receipt: readyReceipt, expected: readyExpected, now: Date.parse('2026-08-09T20:00:00Z') }).state === 'invalid');

  const badExpectedCandidate = clone(readyExpected);
  badExpectedCandidate.candidateDigest = 'fnv1a64:1111111111111111';
  check('expected candidate digest mismatch => invalid', m.evaluateMarketProfilePromotionGate({ candidate: trueCandidate, review: readyReview.packet, receipt: readyReceipt, expected: badExpectedCandidate, now: Date.parse('2026-08-09T20:00:00Z') }).state === 'invalid');
  const badExpectedReview = clone(readyExpected);
  badExpectedReview.reviewDigest = 'fnv1a64:2222222222222222';
  check('expected review digest mismatch => invalid', m.evaluateMarketProfilePromotionGate({ candidate: trueCandidate, review: readyReview.packet, receipt: readyReceipt, expected: badExpectedReview, now: Date.parse('2026-08-09T20:00:00Z') }).state === 'invalid');
  const badExpectedReceipt = clone(readyExpected);
  badExpectedReceipt.receiptDigest = 'fnv1a64:3333333333333333';
  check('expected receipt digest mismatch => invalid', m.evaluateMarketProfilePromotionGate({ candidate: trueCandidate, review: readyReview.packet, receipt: readyReceipt, expected: badExpectedReceipt, now: Date.parse('2026-08-09T20:00:00Z') }).state === 'invalid');

  for (const [field, value] of [['sourceCommitSha', 'dddddddddddddddddddddddddddddddddddddddd'], ['taskId', 'OTHER'], ['exchangeId', 'okx'], ['countryCode', 'PL']]) {
    const expected = clone(readyExpected);
    expected[field] = value;
    check(`expected ${field} mismatch => invalid`, m.evaluateMarketProfilePromotionGate({ candidate: trueCandidate, review: readyReview.packet, receipt: readyReceipt, expected, now: Date.parse('2026-08-09T20:00:00Z') }).state === 'invalid');
  }

  function mutatedReceipt(mutate) {
    const receipt = clone(readyReceipt);
    delete receipt.receiptDigest;
    mutate(receipt);
    receipt.receiptDigest = m.computeMarketProfilePromotionReceiptDigest(receipt);
    return receipt;
  }
  for (const [label, mutate] of [
    ['issuer', (r) => { r.issuer = 'worker'; }],
    ['decision', (r) => { r.decision = 'pending'; }],
    ['authorization type', (r) => { r.authorizationType = 'IMPORT_NOW'; }],
    ['candidate binding', (r) => { r.candidateDigest = 'fnv1a64:4444444444444444'; }],
    ['review binding', (r) => { r.reviewDigest = 'fnv1a64:5555555555555555'; }],
    ['source binding', (r) => { r.sourceCommitSha = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'; }],
  ]) {
    const receipt = mutatedReceipt(mutate);
    const expected = clone(readyExpected);
    expected.receiptDigest = receipt.receiptDigest;
    check(`receipt ${label} mismatch => invalid`, m.evaluateMarketProfilePromotionGate({ candidate: trueCandidate, review: readyReview.packet, receipt, expected, now: Date.parse('2026-08-09T20:00:00Z') }).state === 'invalid');
  }

  const tamperedReceiptDigest = clone(readyReceipt);
  tamperedReceiptDigest.receiptDigest = 'fnv1a64:0000000000000000';
  check('tampered receipt digest => invalid', m.evaluateMarketProfilePromotionGate({ candidate: trueCandidate, review: readyReview.packet, receipt: tamperedReceiptDigest, expected: readyExpected, now: Date.parse('2026-08-09T20:00:00Z') }).state === 'invalid');

  const incompleteReceipt = mutatedReceipt((r) => { r.authorizations.publicationAuthorized = false; });
  const incompleteExpected = expectedPromotion(trueCandidate, readyReview.packet, incompleteReceipt);
  const incompleteResult = m.evaluateMarketProfilePromotionGate({ candidate: trueCandidate, review: readyReview.packet, receipt: incompleteReceipt, expected: incompleteExpected, now: Date.parse('2026-08-09T20:00:00Z') });
  check('receipt false authority => blocked', incompleteResult.state === 'blocked' && incompleteResult.reasons.includes('RECEIPT_AUTHORIZATION_INCOMPLETE'));

  const missingAuthReceipt = clone(readyReceipt);
  delete missingAuthReceipt.authorizations.publicationAuthorized;
  delete missingAuthReceipt.receiptDigest;
  missingAuthReceipt.receiptDigest = m.computeMarketProfilePromotionReceiptDigest(missingAuthReceipt);
  const missingAuthExpected = expectedPromotion(trueCandidate, readyReview.packet, missingAuthReceipt);
  check('receipt missing authority key => invalid', m.evaluateMarketProfilePromotionGate({ candidate: trueCandidate, review: readyReview.packet, receipt: missingAuthReceipt, expected: missingAuthExpected, now: Date.parse('2026-08-09T20:00:00Z') }).state === 'invalid');

  const expired = receiptFor(trueCandidate, readyReview.packet, trueAuth, { issuedAt: '2026-08-08T19:50:00Z', expiresAt: '2026-08-09T19:50:00Z' });
  check('expired receipt => blocked', m.evaluateMarketProfilePromotionGate({ candidate: trueCandidate, review: readyReview.packet, receipt: expired, expected: expectedPromotion(trueCandidate, readyReview.packet, expired), now: Date.parse('2026-08-09T20:00:00Z') }).state === 'blocked');
  const future = receiptFor(trueCandidate, readyReview.packet, trueAuth, { issuedAt: '2026-08-10T19:50:00Z', expiresAt: '2026-08-11T19:50:00Z' });
  check('not-yet-valid receipt => blocked', m.evaluateMarketProfilePromotionGate({ candidate: trueCandidate, review: readyReview.packet, receipt: future, expected: expectedPromotion(trueCandidate, readyReview.packet, future), now: Date.parse('2026-08-09T20:00:00Z') }).state === 'blocked');
  check('NaN clock => invalid', m.evaluateMarketProfilePromotionGate({ candidate: trueCandidate, review: readyReview.packet, receipt: readyReceipt, expected: readyExpected, now: NaN }).state === 'invalid');
  check('Infinity clock => invalid', m.evaluateMarketProfilePromotionGate({ candidate: trueCandidate, review: readyReview.packet, receipt: readyReceipt, expected: readyExpected, now: Infinity }).state === 'invalid');

  const badCalendarReceipt = clone(readyReceipt);
  badCalendarReceipt.issuedAt = '2026-02-31T19:50:00Z';
  delete badCalendarReceipt.receiptDigest;
  badCalendarReceipt.receiptDigest = m.computeMarketProfilePromotionReceiptDigest(badCalendarReceipt);
  check('impossible calendar receipt date => invalid', m.evaluateMarketProfilePromotionGate({ candidate: trueCandidate, review: readyReview.packet, receipt: badCalendarReceipt, expected: expectedPromotion(trueCandidate, readyReview.packet, badCalendarReceipt), now: Date.parse('2026-08-09T20:00:00Z') }).state === 'invalid');

  const tamperedCeiling = clone(falseCandidate);
  tamperedCeiling.authorizationCeilingAllowsLaterPromotion = true;
  const tamperedCeilingReview = reviewFor(tamperedCeiling);
  const tamperedCeilingReceipt = receiptFor(tamperedCeiling, tamperedCeilingReview.packet);
  const tamperedCeilingExpected = expectedPromotion(tamperedCeiling, tamperedCeilingReview.packet, tamperedCeilingReceipt);
  check('source ceiling boolean tamper => invalid', m.evaluateMarketProfilePromotionGate({ candidate: tamperedCeiling, review: tamperedCeilingReview.packet, receipt: tamperedCeilingReceipt, expected: tamperedCeilingExpected, now: Date.parse('2026-08-09T20:00:00Z') }).state === 'invalid');

  check('PUBLIC_MARKET_PROFILES remains frozen empty', Object.isFrozen(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0);
  const gateSource = readFileSync(join(ROOT, 'src/data/contracts/marketProfilePromotionGate.ts'), 'utf8');
  check('promotion contract does not import registry', !gateSource.includes('marketProfileRegistry') && !gateSource.includes('PUBLIC_MARKET_PROFILES'));
  check('promotion contract contains no import executor', !/function\s+.*import|performImport|writeRegistry|mutateRegistry/i.test(gateSource));
  check('promotion output hardcodes no side effects', gateSource.includes('importPerformed: false') && gateSource.includes('registryMutation: false') && gateSource.includes('publicAuthority: false'));

  if (failures.length) {
    console.error(`CBW MARKETPROFILE PROMOTION GATE: FAIL (${failures.length}/${checks})`);
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`CBW MARKETPROFILE PROMOTION GATE: PASS (${checks}/${checks})`);
  }
} catch (error) {
  console.error('CBW MARKETPROFILE PROMOTION GATE: ERROR');
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
