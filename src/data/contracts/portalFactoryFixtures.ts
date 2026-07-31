import {
  validateContentPackage,
  validateMarketProfile,
  validateNormalizedClaim,
  validateRankingSnapshot,
  validateSourcePacket,
} from './portalFactory';
import {
  binanceKazakhstanReviewPass,
  binanceKazakhstanReviewResults,
} from '../pilots/kz/binanceReview';
import {
  binanceKazakhstanFactParityIssues,
  binanceKazakhstanFactParityPass,
} from '../pilots/kz/binanceLocaleParity';
import {
  bybitKazakhstanReviewPass,
  bybitKazakhstanReviewResults,
} from '../pilots/kz/bybitReview';

const digest = `sha256:${'a'.repeat(64)}`;

export const validSourcePacket = {
  packetId: 'src:kz:binance:availability:001',
  sourceUrl: 'https://example.com/official-source',
  sourceClass: 'exchange_official',
  publisher: 'Official source fixture',
  accessedAt: '2026-07-31T10:00:00Z',
  publishedAt: '2026-07-30T10:00:00Z',
  countryCode: 'KZ',
  exchangeId: 'binance',
  topics: ['availability'],
  rawCaptureRef: 'evidence://fixture/kz/binance/availability-001',
  rawCaptureDigest: digest,
  parserVersion: 'fixture-1.0.0',
  extractionWarnings: [],
};

export const validClaim = {
  claimId: 'claim:kz:binance:availability:001',
  subjectId: 'market-profile:binance:kz',
  predicate: 'availability-state',
  value: 'under-review',
  countryCode: 'KZ',
  exchangeId: 'binance',
  effectiveAt: '2026-07-31T10:00:00Z',
  expiresAt: '2026-08-30T10:00:00Z',
  supportingPacketIds: [validSourcePacket.packetId],
  contradictingPacketIds: [],
  confidence: 'medium',
  limitations: ['Fixture only; no production conclusion.'],
  approval: 'validated',
};

export const validMarketProfile = {
  profileId: 'market-profile:binance:kz',
  exchangeId: 'binance',
  countryCode: 'KZ',
  availability: 'limited',
  offerEligibility: 'under_review',
  claimIds: [validClaim.claimId],
  limitations: ['Local publication remains disabled.'],
  lastCheckedAt: '2026-07-31T10:00:00Z',
  nextReviewAt: '2026-08-30T10:00:00Z',
  approval: 'validated',
};

export const validDraftRanking = {
  snapshotId: 'ranking:kz:2026-07-review',
  countryCode: 'KZ',
  methodologyVersion: 'cbw-review-1',
  rows: [],
  excludedExchangeIds: [],
  underReviewExchangeIds: ['binance', 'bybit', 'okx'],
  evidenceCheckedAt: '2026-07-31T10:00:00Z',
  approval: 'draft',
};

export const validDraftPackage = {
  packageId: 'content:kz:country-hub:review-001',
  countryCode: 'KZ',
  approvedClaimIds: [],
  editorialBlocks: ['review-summary', 'evidence-gaps'],
  sourcePacketIds: [validSourcePacket.packetId],
  localeReadiness: { en: 'draft', ru: 'none' },
  previewRoute: '/__design/cbw-v2/country/',
  approval: 'draft',
};

export const invalidUnsupportedClaim = {
  ...validClaim,
  claimId: 'claim:kz:binance:unsupported',
  supportingPacketIds: [],
  confidence: 'unknown',
  approval: 'approved',
};

export const invalidApprovedUnknownProfile = {
  ...validMarketProfile,
  profileId: 'market-profile:binance:kz:invalid',
  availability: 'unknown',
  offerEligibility: 'approved',
  approval: 'approved',
};

export const invalidApprovedEmptyRanking = {
  ...validDraftRanking,
  snapshotId: 'ranking:kz:invalid-empty',
  approval: 'approved',
};

export const invalidApprovedPackage = {
  ...validDraftPackage,
  packageId: 'content:kz:invalid-approved',
  sourcePacketIds: [],
  localeReadiness: { en: 'draft' },
  approval: 'approved',
};

const binanceKazakhstanFactParityResult = {
  ok: binanceKazakhstanFactParityPass,
  issues: binanceKazakhstanFactParityIssues.map(problem => ({
    path: 'locales.en-ru',
    code: problem.code,
    message: problem.message,
  })),
};

export const portalFactoryFixtureResults = [
  { name: 'Valid source packet', expected: 'PASS', result: validateSourcePacket(validSourcePacket) },
  { name: 'Valid normalized claim', expected: 'PASS', result: validateNormalizedClaim(validClaim) },
  { name: 'Valid review market profile', expected: 'PASS', result: validateMarketProfile(validMarketProfile) },
  { name: 'Valid draft ranking', expected: 'PASS', result: validateRankingSnapshot(validDraftRanking) },
  { name: 'Valid draft content package', expected: 'PASS', result: validateContentPackage(validDraftPackage) },
  { name: 'Unsupported approved claim', expected: 'REJECT', result: validateNormalizedClaim(invalidUnsupportedClaim) },
  { name: 'Approved unknown market profile', expected: 'REJECT', result: validateMarketProfile(invalidApprovedUnknownProfile) },
  { name: 'Approved empty ranking', expected: 'REJECT', result: validateRankingSnapshot(invalidApprovedEmptyRanking) },
  { name: 'Approved package without sources/locales', expected: 'REJECT', result: validateContentPackage(invalidApprovedPackage) },
  ...binanceKazakhstanReviewResults,
  {
    name: 'Binance KZ EN/RU immutable fact parity',
    expected: 'PASS',
    result: binanceKazakhstanFactParityResult,
  },
  ...bybitKazakhstanReviewResults,
] as const;

export const portalFactoryFixturesPass =
  binanceKazakhstanReviewPass &&
  binanceKazakhstanFactParityPass &&
  bybitKazakhstanReviewPass &&
  portalFactoryFixtureResults.every(item =>
    item.expected === 'PASS' ? item.result.ok : !item.result.ok,
  );

if (!portalFactoryFixturesPass) {
  throw new Error('Portal Factory contract fixtures did not produce the expected validation states.');
}
