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
const evidenceMapRef = 'src/data/pilots/kz/evidence/2026-07-31-source-map.json';
const evidenceMapDigest =
  'sha256:a0435ee2c1675b320d176eb94c4ce9875b9fe3454520f37dfcc5e5fcfa8b2265';

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
      'The legacy composite note is not used as evidence for current P2P limits or KYC after dedicated source packets were mapped.',
    ],
  },
  {
    packetId: 'src:kz:bybit:individual-kyc:2026-07-31',
    sourceUrl: 'https://www.bybit.kz/ru-KAZ/help-center/article/Individual-KYC-FAQ',
    sourceClass: 'exchange_official',
    publisher: 'Bybit Kazakhstan',
    accessedAt: '2026-07-31T15:50:00Z',
    publishedAt: '2025-11-25T15:25:29Z',
    countryCode: 'KZ',
    exchangeId: 'bybit',
    topics: ['kyc', 'account-access'],
    rawCaptureRef: `${evidenceMapRef}#src-bybit-kz-individual-kyc-20251125`,
    rawCaptureDigest: evidenceMapDigest,
    parserVersion: 'cbw-source-map/0.1.0',
    extractionWarnings: [
      'Public help-center documentation does not prove approval or document acceptance for a specific user.',
    ],
  },
  {
    packetId: 'src:kz:bybit:p2p-advertiser-faq:2026-07-31',
    sourceUrl: 'https://www.bybit.kz/en-KAZ/help-center/article/FAQ-P2P-Verified-Advertisers-on-Bybit?category=437948c5d2d8c4bb0c',
    sourceClass: 'exchange_official',
    publisher: 'Bybit Kazakhstan',
    accessedAt: '2026-07-31T15:50:00Z',
    publishedAt: '2025-11-25T13:37:45Z',
    countryCode: 'KZ',
    exchangeId: 'bybit',
    topics: ['p2p', 'fees', 'limits'],
    rawCaptureRef: `${evidenceMapRef}#src-bybit-kz-p2p-advertiser-faq-20251125`,
    rawCaptureDigest: evidenceMapDigest,
    parserVersion: 'cbw-source-map/0.1.0',
    extractionWarnings: [
      'Published limits and fee statements are date-bound and do not prove a currently active advertisement.',
    ],
  },
  {
    packetId: 'src:kz:bybit:p2p-launch-index:2026-07-31',
    sourceUrl: 'https://announcements.bybit.kz/ru-KAZ/',
    sourceClass: 'exchange_official',
    publisher: 'Bybit Kazakhstan',
    accessedAt: '2026-07-31T15:50:00Z',
    publishedAt: '2025-11-10T00:00:00Z',
    countryCode: 'KZ',
    exchangeId: 'bybit',
    topics: ['p2p', 'launch-history'],
    rawCaptureRef: `${evidenceMapRef}#src-bybit-kz-announcements-p2p-20251110`,
    rawCaptureDigest: evidenceMapDigest,
    parserVersion: 'cbw-source-map/0.1.0',
    extractionWarnings: [
      'The announcements index supplies a dated launch signal; the direct article was not independently captured in this mapping.',
      'A historical launch signal does not prove current active advertisements or universal eligibility.',
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
  {
    claimId: 'claim:kz:bybit:standard-kyc-mandatory',
    subjectId: 'market-profile:bybit:kz',
    predicate: 'standard-identity-verification-mandatory-for-products-and-services',
    value: true,
    countryCode: 'KZ',
    exchangeId: 'bybit',
    effectiveAt: '2025-11-25T15:25:29Z',
    expiresAt: '2026-08-31T15:50:00Z',
    supportingPacketIds: [packetIds['src:kz:bybit:individual-kyc:2026-07-31']],
    contradictingPacketIds: [],
    confidence: 'high',
    limitations: [
      'Higher verification levels may apply by product, service or region.',
      'No specific user verification or document acceptance was tested.',
    ],
    approval: 'validated',
  },
  {
    claimId: 'claim:kz:bybit:p2p-platform-fee-zero',
    subjectId: 'market-profile:bybit:kz',
    predicate: 'p2p-platform-transaction-fee-for-buyers-and-sellers',
    value: '0%',
    countryCode: 'KZ',
    exchangeId: 'bybit',
    effectiveAt: '2025-11-25T13:37:45Z',
    expiresAt: '2026-08-31T15:50:00Z',
    supportingPacketIds: [packetIds['src:kz:bybit:p2p-advertiser-faq:2026-07-31']],
    contradictingPacketIds: [],
    confidence: 'high',
    limitations: [
      'Payment-provider or bank fees may still apply.',
      'The statement is date-bound and must be rechecked before public publication.',
    ],
    approval: 'validated',
  },
  {
    claimId: 'claim:kz:bybit:p2p-kzt-usdt-per-ad-range',
    subjectId: 'market-profile:bybit:kz',
    predicate: 'p2p-kzt-usdt-published-per-ad-order-range',
    value: '900–22,000,000 KZT',
    countryCode: 'KZ',
    exchangeId: 'bybit',
    effectiveAt: '2025-11-25T13:37:45Z',
    expiresAt: '2026-08-31T15:50:00Z',
    supportingPacketIds: [packetIds['src:kz:bybit:p2p-advertiser-faq:2026-07-31']],
    contradictingPacketIds: [],
    confidence: 'high',
    limitations: [
      'Actual tradable amount depends on the range set by an advertiser.',
      'The published range does not prove that an active advertisement exists at the current moment.',
    ],
    approval: 'validated',
  },
  {
    claimId: 'claim:kz:bybit:regulated-p2p-launch-signal',
    subjectId: 'market-profile:bybit:kz',
    predicate: 'regulated-p2p-platform-launch-date-signal',
    value: '2025-11-10',
    countryCode: 'KZ',
    exchangeId: 'bybit',
    effectiveAt: '2025-11-10T00:00:00Z',
    supportingPacketIds: [packetIds['src:kz:bybit:p2p-launch-index:2026-07-31']],
    contradictingPacketIds: [],
    confidence: 'medium',
    limitations: [
      'The source is an official announcements index rather than a separately captured article.',
      'A launch signal does not prove current active advertisements or universal account eligibility.',
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
    'No active P2P advertisement, account creation, KYC approval, deposit, withdrawal or product entitlement was tested.',
    'P2P limits and platform-fee statements are date-bound and require freshness labels before public publication.',
    'The tracked global welcome offer is not confirmed for Kazakhstan users.',
  ],
  lastCheckedAt: '2026-07-31T15:50:00Z',
  nextReviewAt: '2026-08-31T15:50:00Z',
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
