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

const evidenceMapRef = 'src/data/pilots/kz/evidence/2026-07-31-source-map.json';
const evidenceMapDigest =
  'sha256:a0435ee2c1675b320d176eb94c4ce9875b9fe3454520f37dfcc5e5fcfa8b2265';

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
  {
    packetId: 'src:kz:binance:p2p-freedom-surface:2026-07-31',
    sourceUrl: 'https://c2c.binance.com/en-KZ/trade/freedombank/id',
    sourceClass: 'exchange_official',
    publisher: 'Binance Kazakhstan',
    accessedAt: '2026-07-31T15:50:00Z',
    countryCode: 'KZ',
    exchangeId: 'binance',
    topics: ['p2p', 'payment-method-surface', 'technical-reachability'],
    rawCaptureRef: `${evidenceMapRef}#src-binance-kz-p2p-buy-freedom-surface-20260731`,
    rawCaptureDigest: evidenceMapDigest,
    parserVersion: 'cbw-source-map/0.1.0',
    extractionWarnings: [
      'Route existence and table structure do not prove a currently active advertiser, executable order, both directions or resident eligibility.',
    ],
  },
  {
    packetId: 'src:kz:binance:p2p-sell-surface:2026-07-31',
    sourceUrl: 'https://p2p.binance.com/en-KZ/trade/SELL/link',
    sourceClass: 'exchange_official',
    publisher: 'Binance Kazakhstan',
    accessedAt: '2026-07-31T15:50:00Z',
    countryCode: 'KZ',
    exchangeId: 'binance',
    topics: ['p2p', 'sell-surface', 'technical-reachability'],
    rawCaptureRef: `${evidenceMapRef}#src-binance-kz-p2p-sell-surface-20260731`,
    rawCaptureDigest: evidenceMapDigest,
    parserVersion: 'cbw-source-map/0.1.0',
    extractionWarnings: [
      'The public route does not establish a currently active KZT order or a specific currently supported payment method.',
      'No login, account, order, transaction, proxy or KYC test was performed.',
    ],
  },
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
  {
    claimId: 'claim:kz:binance:freedom-bank-p2p-surface-visible',
    subjectId: 'market-profile:binance:kz',
    predicate: 'freedom-bank-p2p-payment-method-route-visible',
    value: true,
    countryCode: 'KZ',
    exchangeId: 'binance',
    effectiveAt: '2026-07-31T15:50:00Z',
    expiresAt: '2026-08-07T15:50:00Z',
    supportingPacketIds: [packetIds['src:kz:binance:p2p-freedom-surface:2026-07-31']],
    contradictingPacketIds: [],
    confidence: 'medium',
    limitations: [
      'The route and advertiser-table structure do not prove an active advertiser or executable order.',
      'Current payment availability, both trade directions and resident eligibility remain unconfirmed.',
    ],
    approval: 'validated',
  },
  {
    claimId: 'claim:kz:binance:localized-p2p-sell-surface-visible',
    subjectId: 'market-profile:binance:kz',
    predicate: 'kazakhstan-localized-p2p-sell-route-visible',
    value: true,
    countryCode: 'KZ',
    exchangeId: 'binance',
    effectiveAt: '2026-07-31T15:50:00Z',
    expiresAt: '2026-08-07T15:50:00Z',
    supportingPacketIds: [packetIds['src:kz:binance:p2p-sell-surface:2026-07-31']],
    contradictingPacketIds: [],
    confidence: 'medium',
    limitations: [
      'The route does not prove a currently active KZT order or a specific supported payment method.',
      'No login, account, order, transaction, proxy or KYC test was performed.',
    ],
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
    'No account creation, KYC approval, deposit, withdrawal, P2P order or product-entitlement testing was performed.',
    'Current direct KZT fiat-rail operation and active P2P advertisers remain unconfirmed.',
    'Public route visibility does not prove active orders, universal resident eligibility or current payment-method support.',
    'Dynamic referral terms remain outside the validated core.',
  ],
  lastCheckedAt: '2026-07-31T15:50:00Z',
  nextReviewAt: '2026-08-07T15:50:00Z',
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
