import {
  validateMarketProfile,
  validateNormalizedClaim,
  validateSourcePacket,
  type MarketProfile,
  type NormalizedClaim,
  type SourcePacket,
} from '../../contracts/portalFactory';

const geoRowDigest =
  'sha256:6282974877d1f5865167444fe3bb6f8f14efa0f5b55854b081d8bbd8f32dbadb';

const geoRowRef = 'src/data/geoRankings.ts#MANUAL_OVERRIDES.kazakhstan.bybit';

export const bybitKazakhstanSourcePackets: SourcePacket[] = [
  {
    packetId: 'src:kz:bybit:afsa-license:geo-row',
    sourceUrl: 'https://publicreg.myafsa.com/licence_details/AFSA-A-LA-2024-0027/',
    sourceClass: 'regulator',
    publisher: 'AFSA Public Register',
    accessedAt: '2026-07-03T00:00:00Z',
    countryCode: 'KZ',
    exchangeId: 'bybit',
    topics: ['licensing', 'availability'],
    rawCaptureRef: geoRowRef,
    rawCaptureDigest: geoRowDigest,
    parserVersion: 'cbw-portal-factory-mapper/0.1.0',
    extractionWarnings: [
      'The tracked repository contains a dated verified summary and official URL, but the standalone raw AFSA HTML capture is stored outside the tracked tree.',
    ],
  },
  {
    packetId: 'src:kz:bybit:owner-geo-decision:2026-07-03',
    sourceUrl: 'https://github.com/ros190392-source/cryptobonusworld/blob/master/src/data/geoRankings.ts',
    sourceClass: 'other',
    publisher: 'CryptoBonusWorld governed GEO data model',
    accessedAt: '2026-07-03T00:00:00Z',
    countryCode: 'KZ',
    exchangeId: 'bybit',
    topics: ['availability', 'offer-boundary', 'evidence-summary'],
    rawCaptureRef: geoRowRef,
    rawCaptureDigest: geoRowDigest,
    parserVersion: 'cbw-portal-factory-mapper/0.1.0',
    extractionWarnings: [
      'This packet records the governed repository decision layer and must not replace the underlying regulator source.',
      'The composite legacy note also mentions P2P launch and numeric limits; those facts are excluded from this validated core until separately mapped evidence is available.',
    ],
  },
];

const packetIds = Object.fromEntries(
  bybitKazakhstanSourcePackets.map(packet => [packet.packetId, packet.packetId]),
);

export const bybitKazakhstanClaims: NormalizedClaim[] = [
  {
    claimId: 'claim:kz:bybit:current-license',
    subjectId: 'market-profile:bybit:kz',
    predicate: 'current-license-number',
    value: 'AFSA-A-LA-2024-0027',
    countryCode: 'KZ',
    exchangeId: 'bybit',
    effectiveAt: '2024-09-25T00:00:00Z',
    supportingPacketIds: [packetIds['src:kz:bybit:afsa-license:geo-row']],
    contradictingPacketIds: [],
    confidence: 'high',
    limitations: [
      'The licence must be rechecked against the live AFSA register before public publication.',
      'A licence record does not prove universal account or product eligibility.',
    ],
    approval: 'validated',
  },
  {
    claimId: 'claim:kz:bybit:country-availability',
    subjectId: 'market-profile:bybit:kz',
    predicate: 'country-availability-state',
    value: 'available',
    countryCode: 'KZ',
    exchangeId: 'bybit',
    effectiveAt: '2026-07-03T00:00:00Z',
    expiresAt: '2026-08-03T00:00:00Z',
    supportingPacketIds: [
      packetIds['src:kz:bybit:afsa-license:geo-row'],
      packetIds['src:kz:bybit:owner-geo-decision:2026-07-03'],
    ],
    contradictingPacketIds: [],
    confidence: 'high',
    limitations: [
      'Availability is a country-level evidence verdict, not proof that every service, asset or product is enabled for every resident.',
      'No account creation, KYC approval or product-entitlement testing was performed.',
    ],
    approval: 'validated',
  },
  {
    claimId: 'claim:kz:bybit:global-offer-kz-confirmed',
    subjectId: 'market-profile:bybit:kz',
    predicate: 'tracked-global-welcome-package-kz-eligibility-confirmed',
    value: false,
    countryCode: 'KZ',
    exchangeId: 'bybit',
    effectiveAt: '2026-07-03T00:00:00Z',
    supportingPacketIds: [packetIds['src:kz:bybit:owner-geo-decision:2026-07-03']],
    contradictingPacketIds: [],
    confidence: 'high',
    limitations: [
      'False means no affirmative Kazakhstan eligibility evidence was mapped; it does not mean the offer is proven unavailable.',
      'The global bybit.com offer and the licensed Kazakhstan product may have different terms.',
    ],
    approval: 'validated',
  },
];

export const bybitKazakhstanMarketProfile: MarketProfile = {
  profileId: 'market-profile:bybit:kz',
  exchangeId: 'bybit',
  countryCode: 'KZ',
  availability: 'available',
  offerEligibility: 'under_review',
  claimIds: bybitKazakhstanClaims.map(claim => claim.claimId),
  limitations: [
    'Review-only profile; no public country route, ranking or affiliate activation is authorized.',
    'P2P launch, payment methods and numeric KZT limits remain excluded until separately mapped source packets exist.',
    'No account creation, KYC approval, deposit, withdrawal or product-entitlement testing was performed.',
    'The tracked global welcome offer is not confirmed for Kazakhstan users.',
  ],
  lastCheckedAt: '2026-07-03T00:00:00Z',
  nextReviewAt: '2026-08-03T00:00:00Z',
  approval: 'validated',
};

export const bybitKazakhstanReviewResults = [
  ...bybitKazakhstanSourcePackets.map(packet => ({
    name: `Bybit KZ source packet · ${packet.packetId}`,
    expected: 'PASS' as const,
    result: validateSourcePacket(packet),
  })),
  ...bybitKazakhstanClaims.map(claim => ({
    name: `Bybit KZ normalized claim · ${claim.claimId}`,
    expected: 'PASS' as const,
    result: validateNormalizedClaim(claim),
  })),
  {
    name: 'Bybit KZ review market profile',
    expected: 'PASS' as const,
    result: validateMarketProfile(bybitKazakhstanMarketProfile),
  },
] as const;

export const bybitKazakhstanReviewPass = bybitKazakhstanReviewResults.every(
  item => item.result.ok,
);

if (!bybitKazakhstanReviewPass) {
  throw new Error('Bybit Kazakhstan review dataset failed Portal Factory validation.');
}
