import {
  validateMarketProfile,
  validateNormalizedClaim,
  validateSourcePacket,
  type MarketProfile,
  type NormalizedClaim,
  type SourcePacket,
} from '../../contracts/portalFactory';

const correctedRoot =
  'research-ops/tasks/CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001/60-correction/20-corrected-output';

const sourceVerificationDigest =
  'sha256:d32cbfc2049beb22cf101bcad9a68ca8fd876816136042ed853336592967dfdd';

const sourceWarning =
  'Corrected research package contains verified source metadata, but no standalone raw HTML capture digest was supplied for this source record.';

function sourcePacket(
  packetId: string,
  sourceId: string,
  sourceUrl: string,
  sourceClass: SourcePacket['sourceClass'],
  publisher: string,
  topics: string[],
): SourcePacket {
  return {
    packetId,
    sourceUrl,
    sourceClass,
    publisher,
    accessedAt: '2026-07-29T00:00:00Z',
    countryCode: 'KZ',
    exchangeId: 'binance',
    topics,
    rawCaptureRef: `${correctedRoot}/source-verification.json#${sourceId}`,
    rawCaptureDigest: sourceVerificationDigest,
    parserVersion: 'cbw-portal-factory-mapper/0.1.0',
    extractionWarnings: [sourceWarning],
  };
}

export const binanceKazakhstanSourcePackets: SourcePacket[] = [
  sourcePacket(
    'src:kz:binance:afsa-entity:src011',
    'SRC011',
    'https://publicreg.myafsa.com/details/211040900220/',
    'regulator',
    'AFSA Public Register',
    ['local-entity', 'licensing'],
  ),
  sourcePacket(
    'src:kz:binance:afsa-license:src012',
    'SRC012',
    'https://publicreg.myafsa.com/licence_details/AFSA-A-LA-2024-0028/',
    'regulator',
    'AFSA Public Register',
    ['licensing', 'products', 'derivatives'],
  ),
  sourcePacket(
    'src:kz:binance:afsa-warning:src015',
    'SRC015',
    'https://afsa.aifc.kz/afsa-warning-on-unlicensed-digital-asset-platforms/',
    'regulator',
    'AFSA',
    ['regulatory-framework', 'availability'],
  ),
  sourcePacket(
    'src:kz:binance:afsa-p2p-faq:src018',
    'SRC018',
    'https://afsa.aifc.kz/ru/frequently-asked-questions-faqs/',
    'regulator',
    'AFSA',
    ['p2p', 'limits', 'eligibility'],
  ),
  sourcePacket(
    'src:kz:binance:landing:src020',
    'SRC020',
    'https://www.binance.com/en-KZ',
    'exchange_official',
    'Binance',
    ['technical-reachability', 'products', 'local-disclosure'],
  ),
  sourcePacket(
    'src:kz:binance:registration:src022',
    'SRC022',
    'https://www.binance.com/en-KZ/support/faq/detail/08f314ad219e45fc9b7a27b67801a5c4',
    'exchange_official',
    'Binance',
    ['registration'],
  ),
  sourcePacket(
    'src:kz:binance:kyc:src023',
    'SRC023',
    'https://www.binance.com/en-KZ/support/faq/detail/360027287111',
    'exchange_official',
    'Binance',
    ['kyc'],
  ),
  sourcePacket(
    'src:kz:binance:campaign-control:src001',
    'SRC001',
    'https://github.com/ros190392-source/cryptobonusworld/issues/84',
    'other',
    'CryptoBonusWorld repository control plane',
    ['offer-boundary', 'owner-input'],
  ),
];

const packetIds = Object.fromEntries(
  binanceKazakhstanSourcePackets.map(packet => [packet.packetId, packet.packetId]),
);

export const binanceKazakhstanClaims: NormalizedClaim[] = [
  {
    claimId: 'claim:kz:binance:local-entity-active',
    subjectId: 'market-profile:binance:kz',
    predicate: 'local-entity-status',
    value: 'active',
    countryCode: 'KZ',
    exchangeId: 'binance',
    effectiveAt: '2021-10-07T00:00:00Z',
    supportingPacketIds: [packetIds['src:kz:binance:afsa-entity:src011']],
    contradictingPacketIds: [],
    confidence: 'high',
    limitations: ['Status must be rechecked against the AFSA register before public publication.'],
    approval: 'validated',
  },
  {
    claimId: 'claim:kz:binance:current-license',
    subjectId: 'market-profile:binance:kz',
    predicate: 'current-license-number',
    value: 'AFSA-A-LA-2024-0028',
    countryCode: 'KZ',
    exchangeId: 'binance',
    effectiveAt: '2024-09-25T00:00:00Z',
    supportingPacketIds: [
      packetIds['src:kz:binance:afsa-entity:src011'],
      packetIds['src:kz:binance:afsa-license:src012'],
    ],
    contradictingPacketIds: [],
    confidence: 'high',
    limitations: ['A licence record does not prove universal account or product eligibility.'],
    approval: 'validated',
  },
  {
    claimId: 'claim:kz:binance:future-option-license-scope',
    subjectId: 'market-profile:binance:kz',
    predicate: 'license-permits-future-and-option-investment-types',
    value: true,
    countryCode: 'KZ',
    exchangeId: 'binance',
    effectiveAt: '2024-09-25T00:00:00Z',
    supportingPacketIds: [packetIds['src:kz:binance:afsa-license:src012']],
    contradictingPacketIds: [],
    confidence: 'high',
    limitations: [
      'Account-level appropriateness, KYC, compliance and product entitlement remain conditional.',
      'The broader activity list is attributed to the regulator register, not silently to Binance marketing pages.',
    ],
    approval: 'validated',
  },
  {
    claimId: 'claim:kz:binance:licensed-p2p-route',
    subjectId: 'market-profile:binance:kz',
    predicate: 'regulated-p2p-requires-licensed-aifc-exchange',
    value: true,
    countryCode: 'KZ',
    exchangeId: 'binance',
    effectiveAt: '2024-03-01T00:00:00Z',
    supportingPacketIds: [
      packetIds['src:kz:binance:afsa-p2p-faq:src018'],
      packetIds['src:kz:binance:afsa-warning:src015'],
    ],
    contradictingPacketIds: [],
    confidence: 'high',
    limitations: [
      'This records the regulator-described route and does not prove active P2P offers, both directions or individual eligibility.',
    ],
    approval: 'validated',
  },
  {
    claimId: 'claim:kz:binance:localized-surface-visible',
    subjectId: 'market-profile:binance:kz',
    predicate: 'kazakhstan-landing-page-visible',
    value: true,
    countryCode: 'KZ',
    exchangeId: 'binance',
    effectiveAt: '2026-07-29T00:00:00Z',
    expiresAt: '2026-08-05T00:00:00Z',
    supportingPacketIds: [packetIds['src:kz:binance:landing:src020']],
    contradictingPacketIds: [],
    confidence: 'high',
    limitations: ['Public technical reachability is not legal authorization or account-level eligibility.'],
    approval: 'validated',
  },
  {
    claimId: 'claim:kz:binance:registration-visible-untested',
    subjectId: 'market-profile:binance:kz',
    predicate: 'personal-registration-path-visible',
    value: true,
    countryCode: 'KZ',
    exchangeId: 'binance',
    effectiveAt: '2026-07-29T00:00:00Z',
    expiresAt: '2026-08-29T00:00:00Z',
    supportingPacketIds: [packetIds['src:kz:binance:registration:src022']],
    contradictingPacketIds: [],
    confidence: 'high',
    limitations: ['No account creation, approval or resident-eligibility testing was performed.'],
    approval: 'validated',
  },
  {
    claimId: 'claim:kz:binance:personal-kyc-required',
    subjectId: 'market-profile:binance:kz',
    predicate: 'personal-identity-verification-required',
    value: true,
    countryCode: 'KZ',
    exchangeId: 'binance',
    effectiveAt: '2026-07-29T00:00:00Z',
    expiresAt: '2026-08-29T00:00:00Z',
    supportingPacketIds: [packetIds['src:kz:binance:kyc:src023']],
    contradictingPacketIds: [],
    confidence: 'high',
    limitations: ['The exact checks and requested documents can vary by user and compliance review.'],
    approval: 'validated',
  },
  {
    claimId: 'claim:kz:binance:cbw-offer-binding-absent',
    subjectId: 'market-profile:binance:kz',
    predicate: 'owner-approved-cbw-campaign-input-supplied',
    value: false,
    countryCode: 'KZ',
    exchangeId: 'binance',
    effectiveAt: '2026-07-29T00:00:00Z',
    supportingPacketIds: [packetIds['src:kz:binance:campaign-control:src001']],
    contradictingPacketIds: [],
    confidence: 'high',
    limitations: ['Public Binance offer visibility cannot substitute for an owner-approved CBW campaign binding.'],
    approval: 'validated',
  },
];

export const binanceKazakhstanMarketProfile: MarketProfile = {
  profileId: 'market-profile:binance:kz',
  exchangeId: 'binance',
  countryCode: 'KZ',
  availability: 'limited',
  offerEligibility: 'under_review',
  claimIds: binanceKazakhstanClaims.map(claim => claim.claimId),
  limitations: [
    'Review-only profile; no public country route, ranking or affiliate activation is authorized.',
    'No account creation, KYC approval, deposit, withdrawal or product-entitlement testing was performed.',
    'KZT fiat rails, named P2P methods and dynamic referral terms remain outside this validated core until current operational evidence is mapped.',
    'Public reachability and licence scope do not imply universal resident eligibility.',
  ],
  lastCheckedAt: '2026-07-29T00:00:00Z',
  nextReviewAt: '2026-08-05T00:00:00Z',
  approval: 'validated',
};

export const binanceKazakhstanReviewResults = [
  ...binanceKazakhstanSourcePackets.map(packet => ({
    name: `Binance KZ source packet · ${packet.packetId}`,
    expected: 'PASS' as const,
    result: validateSourcePacket(packet),
  })),
  ...binanceKazakhstanClaims.map(claim => ({
    name: `Binance KZ normalized claim · ${claim.claimId}`,
    expected: 'PASS' as const,
    result: validateNormalizedClaim(claim),
  })),
  {
    name: 'Binance KZ review market profile',
    expected: 'PASS' as const,
    result: validateMarketProfile(binanceKazakhstanMarketProfile),
  },
] as const;

export const binanceKazakhstanReviewPass = binanceKazakhstanReviewResults.every(
  item => item.result.ok,
);

if (!binanceKazakhstanReviewPass) {
  throw new Error('Binance Kazakhstan review dataset failed Portal Factory validation.');
}
