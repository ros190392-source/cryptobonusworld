import {
  validateMarketProfile,
  validateNormalizedClaim,
  validateSourcePacket,
  type MarketProfile,
  type NormalizedClaim,
  type SourcePacket,
} from '../../contracts/portalFactory';

const correctedRoot =
  'research-ops-pilot/tasks/CBW-KZ-OKX-P0-C-DEEP-RESEARCH-003-HANDOFF-V1/60-correction-v2/20-corrected-output';

const sourceVerificationDigest =
  'sha256:6c2795b17ff9b7178a6083736c4f56d7fa12828761f660bac479cf984d526930';

const sourceWarning =
  'Mapped from the independently validated corrected OKX KZ package. Source metadata is tracked, but no standalone per-source raw HTML digest is present in the repository package.';

function sourcePacket(
  packetId: string,
  sourceId: string,
  sourceUrl: string,
  sourceClass: SourcePacket['sourceClass'],
  publisher: string,
  topics: string[],
  extraWarnings: string[] = [],
): SourcePacket {
  return {
    packetId,
    sourceUrl,
    sourceClass,
    publisher,
    accessedAt: '2026-07-25T00:00:00Z',
    countryCode: 'KZ',
    exchangeId: 'okx',
    topics,
    rawCaptureRef: `${correctedRoot}/source-verification.json#${sourceId}`,
    rawCaptureDigest: sourceVerificationDigest,
    parserVersion: 'cbw-portal-factory-mapper/0.1.0',
    extractionWarnings: [sourceWarning, ...extraWarnings],
  };
}

export const okxKazakhstanSourcePackets: SourcePacket[] = [
  sourcePacket(
    'src:kz:okx:risk-disclosure',
    'src-okx-risk',
    'https://www.okx.com/en-gb/help/risk-compliance-disclosure',
    'exchange_official',
    'OKX',
    ['restricted-locations', 'availability-signal'],
    ['Absence from a restricted-location list is not affirmative legal or account eligibility evidence.'],
  ),
  sourcePacket(
    'src:kz:okx:registration',
    'src-okx-registration',
    'https://www.okx.com/ru/help/how-do-i-register-for-an-okx-account',
    'exchange_official',
    'OKX',
    ['registration', 'jurisdiction-gate'],
    ['The article is generic and does not explicitly approve Kazakhstan residents.'],
  ),
  sourcePacket(
    'src:kz:okx:kzt-p2p-surface',
    'src-okx-p2p-kzt',
    'https://www.okx.com/ru/p2p-markets/kzt/buy-usdt',
    'exchange_official',
    'OKX',
    ['p2p', 'KZT', 'technical-reachability'],
    ['Surface existence does not prove lawful Kazakhstan eligibility or account-level access.'],
  ),
  sourcePacket(
    'src:kz:okx:p2p-faq',
    'src-okx-p2p-faq',
    'https://www.okx.com/help/p2p-sell-crypto-faq',
    'exchange_official',
    'OKX',
    ['p2p', 'regional-fiat-options'],
  ),
  sourcePacket(
    'src:kz:okx:afsa-warning',
    'src-afsa-warning',
    'https://afsa.aifc.kz/afsa-warning-on-unlicensed-digital-asset-platforms/',
    'regulator',
    'Astana Financial Services Authority',
    ['local-authorization', 'regulatory-warning', 'conflict'],
    [
      'The warning substance names OKX as unlicensed; the exact publication date reported by the original research was not confirmed.',
      'The warning does not prove technical blocking.',
    ],
  ),
  sourcePacket(
    'src:kz:okx:afsa-p2p-framework',
    'src-afsa-p2p',
    'https://afsa.aifc.kz/fintech/regulated-peer-to-peer-p2p-trading/',
    'regulator',
    'Astana Financial Services Authority',
    ['p2p', 'local-authorization', 'KYC-AML'],
    ['The framework page is not an OKX-specific approval.'],
  ),
  sourcePacket(
    'src:kz:okx:referral',
    'src-okx-referral',
    'https://www.okx.com/help/what-is-okx-referral-program',
    'exchange_official',
    'OKX',
    ['referral', 'offer-boundary'],
    ['No Kazakhstan-specific reward entitlement was established.'],
  ),
];

const packetIds = Object.fromEntries(
  okxKazakhstanSourcePackets.map(packet => [packet.packetId, packet.packetId]),
);

export const okxKazakhstanClaims: NormalizedClaim[] = [
  {
    claimId: 'claim:kz:okx:not-listed-as-restricted',
    subjectId: 'market-profile:okx:kz',
    predicate: 'kazakhstan-listed-in-reviewed-okx-restricted-locations',
    value: false,
    countryCode: 'KZ',
    exchangeId: 'okx',
    effectiveAt: '2026-07-25T00:00:00Z',
    expiresAt: '2026-08-25T00:00:00Z',
    supportingPacketIds: [packetIds['src:kz:okx:risk-disclosure']],
    contradictingPacketIds: [packetIds['src:kz:okx:afsa-warning']],
    confidence: 'high',
    limitations: [
      'Absence from the reviewed list is only a platform-terms signal and is not proof of lawful Kazakhstan eligibility.',
      'The AFSA warning creates a retained local-authorization conflict.',
    ],
    approval: 'validated',
  },
  {
    claimId: 'claim:kz:okx:registration-jurisdiction-gated',
    subjectId: 'market-profile:okx:kz',
    predicate: 'registration-products-vary-by-jurisdiction',
    value: true,
    countryCode: 'KZ',
    exchangeId: 'okx',
    effectiveAt: '2026-07-25T00:00:00Z',
    expiresAt: '2026-08-25T00:00:00Z',
    supportingPacketIds: [packetIds['src:kz:okx:registration']],
    contradictingPacketIds: [],
    confidence: 'high',
    limitations: ['The reviewed registration article does not explicitly approve Kazakhstan.'],
    approval: 'validated',
  },
  {
    claimId: 'claim:kz:okx:kzt-p2p-surface-visible',
    subjectId: 'market-profile:okx:kz',
    predicate: 'official-kzt-usdt-p2p-surface-visible',
    value: true,
    countryCode: 'KZ',
    exchangeId: 'okx',
    effectiveAt: '2026-07-25T00:00:00Z',
    expiresAt: '2026-08-01T00:00:00Z',
    supportingPacketIds: [
      packetIds['src:kz:okx:kzt-p2p-surface'],
      packetIds['src:kz:okx:p2p-faq'],
    ],
    contradictingPacketIds: [packetIds['src:kz:okx:afsa-p2p-framework']],
    confidence: 'high',
    limitations: [
      'This proves a technical product surface only.',
      'It does not prove lawful Kazakhstan eligibility, active orders, both directions or individual account access.',
    ],
    approval: 'validated',
  },
  {
    claimId: 'claim:kz:okx:afsa-warning-unlicensed',
    subjectId: 'market-profile:okx:kz',
    predicate: 'afsa-warning-names-okx-as-unlicensed-platform',
    value: true,
    countryCode: 'KZ',
    exchangeId: 'okx',
    effectiveAt: '2026-07-25T00:00:00Z',
    expiresAt: '2026-08-25T00:00:00Z',
    supportingPacketIds: [packetIds['src:kz:okx:afsa-warning']],
    contradictingPacketIds: [
      packetIds['src:kz:okx:risk-disclosure'],
      packetIds['src:kz:okx:kzt-p2p-surface'],
    ],
    confidence: 'high',
    limitations: [
      'The warning substance was confirmed, but no explicit publication date was visible.',
      'The warning is a local-authorization signal and does not prove technical inaccessibility.',
    ],
    approval: 'validated',
  },
  {
    claimId: 'claim:kz:okx:regulated-p2p-requires-licensed-datf',
    subjectId: 'market-profile:okx:kz',
    predicate: 'regulated-p2p-requires-aifc-licensed-datf',
    value: true,
    countryCode: 'KZ',
    exchangeId: 'okx',
    effectiveAt: '2026-07-25T00:00:00Z',
    supportingPacketIds: [packetIds['src:kz:okx:afsa-p2p-framework']],
    contradictingPacketIds: [packetIds['src:kz:okx:kzt-p2p-surface']],
    confidence: 'high',
    limitations: ['The framework is not an OKX approval and is retained as part of the unresolved conflict.'],
    approval: 'validated',
  },
  {
    claimId: 'claim:kz:okx:kz-referral-entitlement-confirmed',
    subjectId: 'market-profile:okx:kz',
    predicate: 'kazakhstan-specific-referral-entitlement-confirmed',
    value: false,
    countryCode: 'KZ',
    exchangeId: 'okx',
    effectiveAt: '2026-07-25T00:00:00Z',
    supportingPacketIds: [packetIds['src:kz:okx:referral']],
    contradictingPacketIds: [],
    confidence: 'high',
    limitations: [
      'False means no affirmative Kazakhstan-specific entitlement evidence was established.',
      'It does not prove that every OKX offer is unavailable.',
    ],
    approval: 'validated',
  },
];

export const okxKazakhstanMarketProfile: MarketProfile = {
  profileId: 'market-profile:okx:kz',
  exchangeId: 'okx',
  countryCode: 'KZ',
  availability: 'unknown',
  offerEligibility: 'under_review',
  claimIds: okxKazakhstanClaims.map(claim => claim.claimId),
  limitations: [
    'Validated conflicting review profile; it is not ranking-eligible and is not a publication approval.',
    'Platform and technical signals indicate limited reachability while AFSA warning/framework evidence restricts local-authorization conclusions.',
    'No live account, KYC, deposit, withdrawal, order or product-entitlement testing was performed.',
    'Offer eligibility is unknown and no Kazakhstan affiliate CTA may be activated.',
    'Corrected research import readiness remains BLOCKED with ops recommendation HOLD_CONFLICTING.',
  ],
  lastCheckedAt: '2026-07-25T00:00:00Z',
  nextReviewAt: '2026-08-01T00:00:00Z',
  approval: 'validated',
};

export const okxKazakhstanReviewResults = [
  ...okxKazakhstanSourcePackets.map(packet => ({
    name: `OKX KZ source packet · ${packet.packetId}`,
    expected: 'PASS' as const,
    result: validateSourcePacket(packet),
  })),
  ...okxKazakhstanClaims.map(claim => ({
    name: `OKX KZ normalized claim · ${claim.claimId}`,
    expected: 'PASS' as const,
    result: validateNormalizedClaim(claim),
  })),
  {
    name: 'OKX KZ validated conflicting market profile',
    expected: 'PASS' as const,
    result: validateMarketProfile(okxKazakhstanMarketProfile),
  },
] as const;

export const okxKazakhstanReviewPass = okxKazakhstanReviewResults.every(
  item => item.result.ok,
);

if (!okxKazakhstanReviewPass) {
  throw new Error('OKX Kazakhstan conflicting review dataset failed Portal Factory validation.');
}
