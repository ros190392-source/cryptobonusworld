import {
  validateContentPackage,
  validateMarketProfile,
  validateNormalizedClaim,
  validateRankingSnapshot,
  validateSourcePacket,
} from './portalFactory';
import { assertReviewStatusModel } from './portalUi';
import {
  assertPortalRouteRecord,
  resolvePortalRoute,
  type PortalRouteRecord,
} from './portalRouteGuards';

const digest = `sha256:${'b'.repeat(64)}`;

const validSourcePacket = {
  packetId: 'src:fixture:exchange:country:001',
  sourceUrl: 'https://example.com/official-source',
  sourceClass: 'exchange_official',
  publisher: 'Official source fixture',
  accessedAt: '2026-07-31T16:00:00Z',
  countryCode: 'KZ',
  exchangeId: 'fixture-exchange',
  topics: ['availability'],
  rawCaptureRef: 'fixture://portal/source-001',
  rawCaptureDigest: digest,
  parserVersion: 'fixture-1.0.0',
  extractionWarnings: [],
};

const validClaim = {
  claimId: 'claim:fixture:availability:001',
  subjectId: 'market-profile:fixture-exchange:kz',
  predicate: 'availability-state',
  value: 'under-review',
  countryCode: 'KZ',
  exchangeId: 'fixture-exchange',
  effectiveAt: '2026-07-31T16:00:00Z',
  expiresAt: '2026-08-31T16:00:00Z',
  supportingPacketIds: [validSourcePacket.packetId],
  contradictingPacketIds: [],
  confidence: 'medium',
  limitations: ['Fixture only; no production conclusion.'],
  approval: 'validated',
};

const validMarketProfile = {
  profileId: 'market-profile:fixture-exchange:kz',
  exchangeId: 'fixture-exchange',
  countryCode: 'KZ',
  availability: 'limited',
  offerEligibility: 'under_review',
  claimIds: [validClaim.claimId],
  limitations: ['Review-only fixture.'],
  lastCheckedAt: '2026-07-31T16:00:00Z',
  nextReviewAt: '2026-08-31T16:00:00Z',
  approval: 'validated',
};

const validDraftRanking = {
  snapshotId: 'ranking:fixture:kz:draft',
  countryCode: 'KZ',
  methodologyVersion: 'fixture-review-1',
  rows: [],
  excludedExchangeIds: [],
  underReviewExchangeIds: ['fixture-exchange'],
  evidenceCheckedAt: '2026-07-31T16:00:00Z',
  approval: 'draft',
};

const validDraftPackage = {
  packageId: 'content:fixture:kz:review',
  countryCode: 'KZ',
  approvedClaimIds: [],
  editorialBlocks: ['review-summary'],
  sourcePacketIds: [validSourcePacket.packetId],
  localeReadiness: { en: 'draft' },
  previewRoute: '/__design/cbw-v2/contracts/',
  approval: 'draft',
};

const invalidUnsupportedClaim = {
  ...validClaim,
  claimId: 'claim:fixture:unsupported',
  supportingPacketIds: [],
  confidence: 'unknown',
  approval: 'approved',
};

const invalidApprovedUnknownProfile = {
  ...validMarketProfile,
  profileId: 'market-profile:fixture-exchange:kz:invalid',
  availability: 'unknown',
  offerEligibility: 'approved',
  approval: 'approved',
};

const invalidApprovedEmptyRanking = {
  ...validDraftRanking,
  snapshotId: 'ranking:fixture:kz:invalid',
  approval: 'approved',
};

const invalidApprovedPackage = {
  ...validDraftPackage,
  packageId: 'content:fixture:kz:invalid',
  sourcePacketIds: [],
  localeReadiness: { en: 'draft' },
  approval: 'approved',
};

const validReviewRoute: PortalRouteRecord = {
  routeId: 'route:fixture:kz-country',
  reviewPath: '/__design/cbw-v2/contracts/',
  publicPath: '/countries/kazakhstan/',
  publicationState: 'reviewed',
  indexabilityAuthorized: false,
};

const validApprovedRoute: PortalRouteRecord = {
  routeId: 'route:fixture:approved',
  reviewPath: '/__design/cbw-v2/contracts/',
  publicPath: '/approved-example/',
  publicationState: 'approved',
  indexabilityAuthorized: true,
};

function captureResult(name: string, expected: 'PASS' | 'REJECT', fn: () => unknown) {
  try {
    fn();
    return { name, expected, accepted: true, issues: [] as string[] };
  } catch (error) {
    return {
      name,
      expected,
      accepted: false,
      issues: [error instanceof Error ? error.message : 'Unknown validation error'],
    };
  }
}

export const portalFoundationFixtureResults = [
  {
    name: 'Valid source packet',
    expected: 'PASS' as const,
    result: validateSourcePacket(validSourcePacket),
  },
  {
    name: 'Valid normalized claim',
    expected: 'PASS' as const,
    result: validateNormalizedClaim(validClaim),
  },
  {
    name: 'Valid review market profile',
    expected: 'PASS' as const,
    result: validateMarketProfile(validMarketProfile),
  },
  {
    name: 'Valid empty draft ranking',
    expected: 'PASS' as const,
    result: validateRankingSnapshot(validDraftRanking),
  },
  {
    name: 'Valid draft content package',
    expected: 'PASS' as const,
    result: validateContentPackage(validDraftPackage),
  },
  {
    name: 'Unsupported approved claim',
    expected: 'REJECT' as const,
    result: validateNormalizedClaim(invalidUnsupportedClaim),
  },
  {
    name: 'Approved unknown market profile',
    expected: 'REJECT' as const,
    result: validateMarketProfile(invalidApprovedUnknownProfile),
  },
  {
    name: 'Approved empty ranking',
    expected: 'REJECT' as const,
    result: validateRankingSnapshot(invalidApprovedEmptyRanking),
  },
  {
    name: 'Approved source-less content package',
    expected: 'REJECT' as const,
    result: validateContentPackage(invalidApprovedPackage),
  },
] as const;

export const portalFoundationBehaviorResults = [
  captureResult('Semantic verified status', 'PASS', () =>
    assertReviewStatusModel({ label: 'Verified', detail: 'Fixture detail', tone: 'verified' })),
  captureResult('Semantic missing status', 'PASS', () =>
    assertReviewStatusModel({ label: 'Insufficient evidence', tone: 'missing', compact: true })),
  captureResult('Valid review route record', 'PASS', () =>
    assertPortalRouteRecord(validReviewRoute)),
  captureResult('Review route resolves under __design', 'PASS', () => {
    if (resolvePortalRoute(validReviewRoute, 'review') !== validReviewRoute.reviewPath) {
      throw new Error('Review route did not resolve to its review path.');
    }
  }),
  captureResult('Unauthorized public route', 'REJECT', () =>
    resolvePortalRoute(validReviewRoute, 'public')),
  captureResult('Approved public route', 'PASS', () => {
    if (resolvePortalRoute(validApprovedRoute, 'public') !== validApprovedRoute.publicPath) {
      throw new Error('Approved public route did not resolve.');
    }
  }),
] as const;

const contractPass = portalFoundationFixtureResults.every(item =>
  item.expected === 'PASS' ? item.result.ok : !item.result.ok,
);
const behaviorPass = portalFoundationBehaviorResults.every(item =>
  item.expected === 'PASS' ? item.accepted : !item.accepted,
);

export const portalFoundationFixturesPass = contractPass && behaviorPass;

if (!portalFoundationFixturesPass) {
  throw new Error('Portal foundation fixtures did not produce the expected fail-closed states.');
}
