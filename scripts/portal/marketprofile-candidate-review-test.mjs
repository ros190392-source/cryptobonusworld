#!/usr/bin/env node
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const TMP = mkdtempSync(join(tmpdir(), 'cbw-candidate-review-'));
const OUT = join(TMP, 'review.mjs');

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
        `export { PUBLIC_MARKET_PROFILES } from ${JSON.stringify(join(ROOT, 'src/data/contracts/marketProfileRegistry.ts'))};`,
      ].join('\n'),
      resolveDir: ROOT,
      loader: 'ts',
      sourcefile: 'candidate-review-test-entry.ts',
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
    digest: `sha256:${'a'.repeat(64)}`,
  }];
  const auth = {
    researchImportAuthorized: false,
    stagingImportAuthorized: false,
    canonicalImportAuthorized: false,
    productionChangeAuthorized: false,
    productionBindingAuthorized: false,
    publicationAuthorized: false,
    masterChangeAuthorized: false,
  };
  const packet = {
    schemaVersion: 1,
    provenance: {
      repository: 'ros190392-source/cryptobonusworld',
      sourceBranch: 'main',
      sourceCommitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      taskId: 'CBW-TEST-RESEARCH-001',
      exchangeId: 'binance',
      countryCode: 'KZ',
      researchState: 'RESEARCH_RECORD_MERGED_TO_MAIN',
      importReadiness: 'CANDIDATE_ONLY_AUTHORIZATION_FALSE',
      overallRecommendation: 'UNDER_REVIEW_CANDIDATE',
      confidence: 'medium',
      lastCheckedAt: '2026-08-09T00:00:00Z',
      nextReviewAt: '2026-09-09T00:00:00Z',
      artifactBindings,
      authorizations: auth,
    },
    signals: {
      availability: { signal: 'under_review', claimIds: ['CLM001'], limitations: ['Availability still requires promotion review.'] },
      regulation: { signal: 'under_review', legalEntityClaimIds: [], licenseClaimIds: [], limitations: ['Legal posture unresolved.'] },
      kyc: { signal: 'under_review', claimIds: [], limitations: [] },
      deposits: { signal: 'under_review', claimIds: [], limitations: [] },
      withdrawals: { signal: 'under_review', claimIds: [], limitations: [] },
      fiatPayments: { signal: 'under_review', claimIds: [], limitations: [], methods: [] },
      products: { signal: 'under_review', claimIds: [], limitations: [] },
      bonusAvailability: { signal: 'under_review', claimIds: [], limitations: [] },
      restrictions: { signal: 'under_review', claimIds: [], limitations: [] },
    },
  };
  const expectedBridge = {
    repository: packet.provenance.repository,
    sourceCommitSha: packet.provenance.sourceCommitSha,
    taskId: packet.provenance.taskId,
    exchangeId: packet.provenance.exchangeId,
    countryCode: packet.provenance.countryCode,
    artifactBindings,
  };
  const candidate = m.buildCountryMarketProfileV1Candidate({ expected: expectedBridge, packet });
  check('bridge fixture produces candidate', candidate.state === 'candidate', JSON.stringify(candidate.validationIssues));
  check('fixture remains non-authorizing', candidate.importable === false && candidate.publicAuthority === false);

  const scope = {
    candidateDigest: candidate.candidateDigest,
    sourceCommitSha: candidate.source.sourceCommitSha,
    taskId: candidate.source.taskId,
    exchangeId: candidate.source.exchangeId,
    countryCode: candidate.source.countryCode,
  };
  const request = {
    expected: scope,
    candidate,
    reviewerId: 'owner-reviewer',
    reviewedAt: '2026-08-09T19:40:00Z',
    decision: 'ready_for_promotion_review',
    notes: ['Candidate is structurally reviewable; unresolved dimensions remain explicit.'],
  };

  const result = m.createMarketProfileCandidateReview(request);
  check('ready decision creates review packet', result.ok && result.packet?.decision === 'ready_for_promotion_review');
  check('review packet validates against exact candidate', result.ok && m.validateMarketProfileCandidateReviewPacket(result.packet, candidate, scope).ok);
  check('review carries exact candidate digest', result.packet?.candidateDigest === candidate.candidateDigest);
  check('review carries exact source identity', result.packet?.sourceCommitSha === scope.sourceCommitSha && result.packet?.taskId === scope.taskId && result.packet?.exchangeId === scope.exchangeId && result.packet?.countryCode === scope.countryCode);
  check('review snapshots unresolved dimensions', JSON.stringify(result.packet?.unresolvedDimensions) === JSON.stringify(candidate.unresolvedDimensions));
  check('review snapshots limitations', JSON.stringify(result.packet?.limitations) === JSON.stringify(candidate.limitations));
  check('review has deterministic labelled digest', /^fnv1a64:[a-f0-9]{16}$/.test(result.packet?.reviewDigest ?? ''));
  check('review hard floors all authorities false', result.packet?.promotionAuthorized === false && result.packet?.importAuthorized === false && result.packet?.publicAuthority === false);

  const same = m.createMarketProfileCandidateReview(clone(request));
  check('same review input => same digest', same.ok && same.packet.reviewDigest === result.packet.reviewDigest);
  const localeDecorated = clone(request);
  localeDecorated.locale = 'pl';
  check('locale decoration cannot alter review digest', m.createMarketProfileCandidateReview(localeDecorated).packet?.reviewDigest === result.packet.reviewDigest);

  const needsResearch = clone(request);
  needsResearch.decision = 'needs_research';
  const needsResearchResult = m.createMarketProfileCandidateReview(needsResearch);
  check('needs_research is valid but non-authorizing', needsResearchResult.ok && needsResearchResult.packet.promotionAuthorized === false);
  const rejected = clone(request);
  rejected.decision = 'rejected';
  check('rejected is a valid review record', m.createMarketProfileCandidateReview(rejected).ok);
  check('different decision changes review digest', needsResearchResult.packet.reviewDigest !== result.packet.reviewDigest);

  const wrongDigest = clone(request);
  wrongDigest.expected.candidateDigest = 'fnv1a64:1111111111111111';
  check('candidate digest mismatch => invalid review', !m.createMarketProfileCandidateReview(wrongDigest).ok);
  const wrongSha = clone(request);
  wrongSha.expected.sourceCommitSha = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  check('source SHA mismatch => invalid review', !m.createMarketProfileCandidateReview(wrongSha).ok);
  const wrongTask = clone(request);
  wrongTask.expected.taskId = 'OTHER';
  check('task mismatch => invalid review', !m.createMarketProfileCandidateReview(wrongTask).ok);
  const wrongExchange = clone(request);
  wrongExchange.expected.exchangeId = 'okx';
  check('exchange mismatch => invalid review', !m.createMarketProfileCandidateReview(wrongExchange).ok);
  const wrongCountry = clone(request);
  wrongCountry.expected.countryCode = 'PL';
  check('country mismatch => invalid review', !m.createMarketProfileCandidateReview(wrongCountry).ok);

  const blocked = clone(request);
  blocked.candidate.state = 'blocked';
  blocked.candidate.proposedProfile = null;
  check('blocked candidate cannot be reviewed ready', !m.createMarketProfileCandidateReview(blocked).ok);
  const invalidState = clone(request);
  invalidState.candidate.state = 'invalid';
  invalidState.candidate.proposedProfile = null;
  check('invalid candidate cannot be reviewed', !m.createMarketProfileCandidateReview(invalidState).ok);
  const nullProfile = clone(request);
  nullProfile.candidate.proposedProfile = null;
  check('null proposed profile => invalid review', !m.createMarketProfileCandidateReview(nullProfile).ok);
  const approvedProfile = clone(request);
  approvedProfile.candidate.proposedProfile.approval = 'approved';
  check('already-approved profile => invalid review', !m.createMarketProfileCandidateReview(approvedProfile).ok);
  const approvedOffer = clone(request);
  approvedOffer.candidate.proposedProfile.offerEligibility = 'approved';
  check('already-approved offer => invalid review', !m.createMarketProfileCandidateReview(approvedOffer).ok);
  const importable = clone(request);
  importable.candidate.importable = true;
  check('importable candidate => invalid review', !m.createMarketProfileCandidateReview(importable).ok);
  const publicCandidate = clone(request);
  publicCandidate.candidate.publicAuthority = true;
  check('public-authority candidate => invalid review', !m.createMarketProfileCandidateReview(publicCandidate).ok);

  const badDecision = clone(request);
  badDecision.decision = 'auto_publish';
  check('unsupported decision => invalid review', !m.createMarketProfileCandidateReview(badDecision).ok);
  const noReviewer = clone(request);
  noReviewer.reviewerId = '';
  check('missing reviewer => invalid review', !m.createMarketProfileCandidateReview(noReviewer).ok);
  const badDate = clone(request);
  badDate.reviewedAt = 'someday';
  check('invalid reviewedAt => invalid review', !m.createMarketProfileCandidateReview(badDate).ok);
  const duplicateNotes = clone(request);
  duplicateNotes.notes = ['same', 'same'];
  check('duplicate notes => invalid review', !m.createMarketProfileCandidateReview(duplicateNotes).ok);

  const originalReview = clone(result.packet);
  const tamperedUnresolved = clone(originalReview);
  tamperedUnresolved.unresolvedDimensions.push('tampered');
  check('tampered unresolved snapshot fails validation', !m.validateMarketProfileCandidateReviewPacket(tamperedUnresolved, candidate, scope).ok);
  const tamperedLimits = clone(originalReview);
  tamperedLimits.limitations[0] = 'rewritten';
  check('tampered limitations snapshot fails validation', !m.validateMarketProfileCandidateReviewPacket(tamperedLimits, candidate, scope).ok);
  const tamperedReviewer = clone(originalReview);
  tamperedReviewer.reviewerId = 'other-reviewer';
  check('tampered reviewer without digest refresh fails', !m.validateMarketProfileCandidateReviewPacket(tamperedReviewer, candidate, scope).ok);
  const tamperedDecision = clone(originalReview);
  tamperedDecision.decision = 'rejected';
  check('tampered decision without digest refresh fails', !m.validateMarketProfileCandidateReviewPacket(tamperedDecision, candidate, scope).ok);
  const tamperedPromotion = clone(originalReview);
  tamperedPromotion.promotionAuthorized = true;
  check('promotion authority true fails validation', !m.validateMarketProfileCandidateReviewPacket(tamperedPromotion, candidate, scope).ok);
  const tamperedImport = clone(originalReview);
  tamperedImport.importAuthorized = true;
  check('import authority true fails validation', !m.validateMarketProfileCandidateReviewPacket(tamperedImport, candidate, scope).ok);
  const tamperedPublic = clone(originalReview);
  tamperedPublic.publicAuthority = true;
  check('public authority true fails validation', !m.validateMarketProfileCandidateReviewPacket(tamperedPublic, candidate, scope).ok);
  const tamperedDigest = clone(originalReview);
  tamperedDigest.reviewDigest = 'fnv1a64:0000000000000000';
  check('review digest mismatch fails validation', !m.validateMarketProfileCandidateReviewPacket(tamperedDigest, candidate, scope).ok);

  check('PUBLIC_MARKET_PROFILES remains frozen empty', Object.isFrozen(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0);

  if (failures.length) {
    console.error(`CBW MARKETPROFILE CANDIDATE REVIEW: FAIL (${failures.length}/${checks})`);
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`CBW MARKETPROFILE CANDIDATE REVIEW: PASS (${checks}/${checks})`);
  }
} catch (error) {
  console.error('CBW MARKETPROFILE CANDIDATE REVIEW: ERROR');
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
