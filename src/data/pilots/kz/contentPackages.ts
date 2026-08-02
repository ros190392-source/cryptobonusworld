import {
  validateContentPackage,
  type ContentPackage,
  type NormalizedClaim,
  type SourcePacket,
  type ValidationIssue,
} from '../../contracts/portalFactory';
import {
  binanceKazakhstanClaims,
  binanceKazakhstanMarketProfile,
  binanceKazakhstanSourcePackets,
} from './binanceReview';
import {
  bybitKazakhstanClaims,
  bybitKazakhstanMarketProfile,
  bybitKazakhstanSourcePackets,
} from './bybitReview';
import {
  okxKazakhstanClaims,
  okxKazakhstanMarketProfile,
  okxKazakhstanSourcePackets,
} from './okxReview';
import { kazakhstanDraftRankingSnapshot } from './rankingSnapshotDraft';

export type KazakhstanReviewPackageKind = 'country_hub' | 'market_passport';
export type KazakhstanReviewRankingUsage = 'none' | 'readiness_state_only';

export interface KazakhstanReviewContentPackage extends ContentPackage {
  packageKind: KazakhstanReviewPackageKind;
  candidateClaimIds: string[];
  marketProfileIds: string[];
  rankingUsage: KazakhstanReviewRankingUsage;
  conflictPreserving: boolean;
  recommendationAuthorized: false;
  publicationAuthorized: false;
  rankingRowsAuthorized: false;
  affiliateCtaAuthorized: false;
  indexabilityAuthorized: false;
}

const allClaims = [
  ...binanceKazakhstanClaims,
  ...bybitKazakhstanClaims,
  ...okxKazakhstanClaims,
];

const allPackets = [
  ...binanceKazakhstanSourcePackets,
  ...bybitKazakhstanSourcePackets,
  ...okxKazakhstanSourcePackets,
];

const claimsById = new Map<string, NormalizedClaim>(
  allClaims.map(claim => [claim.claimId, claim]),
);
const packetsById = new Map<string, SourcePacket>(
  allPackets.map(packet => [packet.packetId, packet]),
);

const unique = (values: string[]) => [...new Set(values)];

const packetIdsForClaims = (claims: NormalizedClaim[]) =>
  unique(claims.flatMap(claim => claim.supportingPacketIds));

export const kazakhstanCountryHubReviewPackage: KazakhstanReviewContentPackage = {
  packageId: 'content:kz:country-hub:review-051i',
  packageKind: 'country_hub',
  countryCode: 'KZ',
  rankingSnapshotId: kazakhstanDraftRankingSnapshot.snapshotId,
  approvedClaimIds: [],
  candidateClaimIds: allClaims.map(claim => claim.claimId),
  marketProfileIds: [
    binanceKazakhstanMarketProfile.profileId,
    bybitKazakhstanMarketProfile.profileId,
    okxKazakhstanMarketProfile.profileId,
  ],
  editorialBlocks: [
    'market-overview',
    'profile-readiness',
    'local-authorization-status',
    'kyc-and-account-access',
    'kzt-fiat-and-p2p-status',
    'comparative-evidence-completeness',
    'open-evidence-gaps',
    'methodology-and-draft-snapshot-boundary',
    'material-change-history-placeholder',
  ],
  sourcePacketIds: unique(allPackets.map(packet => packet.packetId)),
  localeReadiness: { en: 'draft', ru: 'none' },
  previewRoute: '/__design/cbw-v2/country/',
  approval: 'draft',
  rankingUsage: 'readiness_state_only',
  conflictPreserving: true,
  recommendationAuthorized: false,
  publicationAuthorized: false,
  rankingRowsAuthorized: false,
  affiliateCtaAuthorized: false,
  indexabilityAuthorized: false,
};

export const binanceKazakhstanPassportReviewPackage: KazakhstanReviewContentPackage = {
  packageId: 'content:kz:binance:market-passport:review-051i',
  packageKind: 'market_passport',
  countryCode: 'KZ',
  exchangeId: 'binance',
  marketProfileId: binanceKazakhstanMarketProfile.profileId,
  approvedClaimIds: [],
  candidateClaimIds: binanceKazakhstanClaims.map(claim => claim.claimId),
  marketProfileIds: [binanceKazakhstanMarketProfile.profileId],
  editorialBlocks: [
    'local-entity-and-licence',
    'availability-and-limitations',
    'registration-and-kyc',
    'p2p-surface-status',
    'offer-binding-status',
    'sources-and-freshness',
  ],
  sourcePacketIds: packetIdsForClaims(binanceKazakhstanClaims),
  localeReadiness: { en: 'reviewed', ru: 'reviewed' },
  previewRoute: '/__design/cbw-v2/market-passport/',
  approval: 'draft',
  rankingUsage: 'none',
  conflictPreserving: false,
  recommendationAuthorized: false,
  publicationAuthorized: false,
  rankingRowsAuthorized: false,
  affiliateCtaAuthorized: false,
  indexabilityAuthorized: false,
};

export const bybitKazakhstanPassportReviewPackage: KazakhstanReviewContentPackage = {
  packageId: 'content:kz:bybit:market-passport:review-051i',
  packageKind: 'market_passport',
  countryCode: 'KZ',
  exchangeId: 'bybit',
  marketProfileId: bybitKazakhstanMarketProfile.profileId,
  approvedClaimIds: [],
  candidateClaimIds: bybitKazakhstanClaims.map(claim => claim.claimId),
  marketProfileIds: [bybitKazakhstanMarketProfile.profileId],
  editorialBlocks: [
    'licence-and-country-availability',
    'standard-kyc-requirement',
    'p2p-launch-fee-and-limits',
    'active-advertisement-limitation',
    'local-offer-status',
    'sources-and-freshness',
  ],
  sourcePacketIds: packetIdsForClaims(bybitKazakhstanClaims),
  localeReadiness: { en: 'draft', ru: 'none' },
  previewRoute: '/__design/cbw-v2/content-packages/',
  approval: 'draft',
  rankingUsage: 'none',
  conflictPreserving: false,
  recommendationAuthorized: false,
  publicationAuthorized: false,
  rankingRowsAuthorized: false,
  affiliateCtaAuthorized: false,
  indexabilityAuthorized: false,
};

export const okxKazakhstanPassportReviewPackage: KazakhstanReviewContentPackage = {
  packageId: 'content:kz:okx:market-passport:review-051i',
  packageKind: 'market_passport',
  countryCode: 'KZ',
  exchangeId: 'okx',
  marketProfileId: okxKazakhstanMarketProfile.profileId,
  approvedClaimIds: [],
  candidateClaimIds: okxKazakhstanClaims.map(claim => claim.claimId),
  marketProfileIds: [okxKazakhstanMarketProfile.profileId],
  editorialBlocks: [
    'platform-terms-signal',
    'registration-jurisdiction-gate',
    'kzt-p2p-surface',
    'afsa-warning-and-p2p-framework',
    'retained-authorization-conflict',
    'ranking-exclusion-and-no-recommendation',
    'offer-status',
    'sources-and-freshness',
  ],
  sourcePacketIds: packetIdsForClaims(okxKazakhstanClaims),
  localeReadiness: { en: 'draft', ru: 'none' },
  previewRoute: '/__design/cbw-v2/content-packages/',
  approval: 'draft',
  rankingUsage: 'none',
  conflictPreserving: true,
  recommendationAuthorized: false,
  publicationAuthorized: false,
  rankingRowsAuthorized: false,
  affiliateCtaAuthorized: false,
  indexabilityAuthorized: false,
};

export const kazakhstanReviewContentPackages: KazakhstanReviewContentPackage[] = [
  kazakhstanCountryHubReviewPackage,
  binanceKazakhstanPassportReviewPackage,
  bybitKazakhstanPassportReviewPackage,
  okxKazakhstanPassportReviewPackage,
];

export const kazakhstanReviewContentPackageIssues: ValidationIssue[] = [];

const packageIds = kazakhstanReviewContentPackages.map(pkg => pkg.packageId);
if (new Set(packageIds).size !== packageIds.length) {
  kazakhstanReviewContentPackageIssues.push({
    path: 'packages',
    code: 'DUPLICATE_PACKAGE_ID',
    message: 'Review content package IDs must be unique.',
  });
}

for (const pkg of kazakhstanReviewContentPackages) {
  const baseResult = validateContentPackage(pkg);
  if (!baseResult.ok) {
    kazakhstanReviewContentPackageIssues.push(
      ...baseResult.issues.map(problem => ({
        ...problem,
        path: `${pkg.packageId}.${problem.path}`,
      })),
    );
  }

  if (pkg.approval !== 'draft') {
    kazakhstanReviewContentPackageIssues.push({
      path: pkg.packageId,
      code: 'REVIEW_PACKAGE_NOT_DRAFT',
      message: 'Every 051I package must remain draft.',
    });
  }

  if (pkg.approvedClaimIds.length !== 0) {
    kazakhstanReviewContentPackageIssues.push({
      path: `${pkg.packageId}.approvedClaimIds`,
      code: 'APPROVED_CLAIMS_FORBIDDEN',
      message: 'Validated candidate claims must not be mislabeled as approved claims.',
    });
  }

  if (pkg.candidateClaimIds.length === 0) {
    kazakhstanReviewContentPackageIssues.push({
      path: `${pkg.packageId}.candidateClaimIds`,
      code: 'CANDIDATE_CLAIMS_REQUIRED',
      message: 'A review content package requires candidate claims.',
    });
  }

  if (new Set(pkg.candidateClaimIds).size !== pkg.candidateClaimIds.length) {
    kazakhstanReviewContentPackageIssues.push({
      path: `${pkg.packageId}.candidateClaimIds`,
      code: 'DUPLICATE_CANDIDATE_CLAIM',
      message: 'Candidate claim IDs must be unique within a package.',
    });
  }

  if (new Set(pkg.sourcePacketIds).size !== pkg.sourcePacketIds.length) {
    kazakhstanReviewContentPackageIssues.push({
      path: `${pkg.packageId}.sourcePacketIds`,
      code: 'DUPLICATE_SOURCE_PACKET',
      message: 'Source packet IDs must be unique within a package.',
    });
  }

  for (const claimId of pkg.candidateClaimIds) {
    const claim = claimsById.get(claimId);
    if (!claim) {
      kazakhstanReviewContentPackageIssues.push({
        path: `${pkg.packageId}.candidateClaimIds`,
        code: 'DANGLING_CANDIDATE_CLAIM',
        message: `Candidate claim ${claimId} does not resolve.`,
      });
      continue;
    }

    if (claim.approval !== 'validated') {
      kazakhstanReviewContentPackageIssues.push({
        path: `${pkg.packageId}.candidateClaimIds`,
        code: 'UNVALIDATED_CANDIDATE_CLAIM',
        message: `Candidate claim ${claimId} is not validated.`,
      });
    }

    if (pkg.packageKind === 'market_passport' && claim.exchangeId !== pkg.exchangeId) {
      kazakhstanReviewContentPackageIssues.push({
        path: `${pkg.packageId}.candidateClaimIds`,
        code: 'PASSPORT_SCOPE_MISMATCH',
        message: `Candidate claim ${claimId} belongs to another exchange.`,
      });
    }

    for (const packetId of claim.supportingPacketIds) {
      if (!pkg.sourcePacketIds.includes(packetId)) {
        kazakhstanReviewContentPackageIssues.push({
          path: `${pkg.packageId}.sourcePacketIds`,
          code: 'SUPPORTING_PACKET_OMITTED',
          message: `Supporting packet ${packetId} for ${claimId} is missing from the package.`,
        });
      }
    }
  }

  for (const packetId of pkg.sourcePacketIds) {
    const packet = packetsById.get(packetId);
    if (!packet) {
      kazakhstanReviewContentPackageIssues.push({
        path: `${pkg.packageId}.sourcePacketIds`,
        code: 'DANGLING_SOURCE_PACKET',
        message: `Source packet ${packetId} does not resolve.`,
      });
    } else if (pkg.packageKind === 'market_passport' && packet.exchangeId !== pkg.exchangeId) {
      kazakhstanReviewContentPackageIssues.push({
        path: `${pkg.packageId}.sourcePacketIds`,
        code: 'PASSPORT_SOURCE_SCOPE_MISMATCH',
        message: `Source packet ${packetId} belongs to another exchange.`,
      });
    }
  }

  if (!pkg.previewRoute.startsWith('/__design/')) {
    kazakhstanReviewContentPackageIssues.push({
      path: `${pkg.packageId}.previewRoute`,
      code: 'PUBLIC_PREVIEW_ROUTE_FORBIDDEN',
      message: 'Review packages must use a /__design/ preview route.',
    });
  }

  if (Object.values(pkg.localeReadiness).some(value => value === 'approved')) {
    kazakhstanReviewContentPackageIssues.push({
      path: `${pkg.packageId}.localeReadiness`,
      code: 'APPROVED_LOCALE_FORBIDDEN',
      message: 'No locale may be approved in a review-only package.',
    });
  }

  if (
    pkg.recommendationAuthorized !== false
    || pkg.publicationAuthorized !== false
    || pkg.rankingRowsAuthorized !== false
    || pkg.affiliateCtaAuthorized !== false
    || pkg.indexabilityAuthorized !== false
  ) {
    kazakhstanReviewContentPackageIssues.push({
      path: pkg.packageId,
      code: 'AUTHORIZATION_BOUNDARY_VIOLATION',
      message: 'Every publication, recommendation, ranking, CTA and indexability authorization must remain false.',
    });
  }

  if (pkg.rankingUsage === 'readiness_state_only') {
    if (pkg.rankingSnapshotId !== kazakhstanDraftRankingSnapshot.snapshotId) {
      kazakhstanReviewContentPackageIssues.push({
        path: `${pkg.packageId}.rankingSnapshotId`,
        code: 'DRAFT_SNAPSHOT_REFERENCE_REQUIRED',
        message: 'Readiness-state usage must reference the governed draft snapshot.',
      });
    }
    if (kazakhstanDraftRankingSnapshot.rows.length !== 0) {
      kazakhstanReviewContentPackageIssues.push({
        path: `${pkg.packageId}.rankingSnapshotId`,
        code: 'NON_EMPTY_RANKING_FORBIDDEN',
        message: 'Review content may not consume non-empty ranking rows.',
      });
    }
  } else if (pkg.rankingSnapshotId !== undefined) {
    kazakhstanReviewContentPackageIssues.push({
      path: `${pkg.packageId}.rankingSnapshotId`,
      code: 'PASSPORT_RANKING_REFERENCE_FORBIDDEN',
      message: 'Market-passport review packages must not consume a ranking snapshot.',
    });
  }

  if (pkg.exchangeId === 'okx') {
    if (!pkg.conflictPreserving || pkg.recommendationAuthorized !== false) {
      kazakhstanReviewContentPackageIssues.push({
        path: pkg.packageId,
        code: 'OKX_CONFLICT_BOUNDARY_VIOLATION',
        message: 'OKX review content must preserve the conflict and prohibit recommendation.',
      });
    }
  }
}

export const kazakhstanReviewContentPackagesPass =
  kazakhstanReviewContentPackageIssues.length === 0;

export const kazakhstanReviewContentPackagesResult = {
  ok: kazakhstanReviewContentPackagesPass,
  value: kazakhstanReviewContentPackagesPass
    ? kazakhstanReviewContentPackages
    : undefined,
  issues: kazakhstanReviewContentPackageIssues,
};

if (!kazakhstanReviewContentPackagesPass) {
  throw new Error(
    `Kazakhstan review ContentPackage validation failed: ${kazakhstanReviewContentPackageIssues
      .map(issue => `${issue.code}: ${issue.message}`)
      .join('; ')}`,
  );
}
