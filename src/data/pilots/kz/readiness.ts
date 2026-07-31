import { binanceKazakhstanMarketProfile } from './binanceReview';
import { bybitKazakhstanMarketProfile } from './bybitReview';

export type EvidenceGapStatus = 'required' | 'blocked' | 'mapped';
export type EvidenceGapSeverity = 'P0' | 'P1' | 'P2';

export interface KazakhstanEvidenceGap {
  gapId: string;
  exchangeId: 'binance' | 'bybit' | 'okx' | 'country';
  topic: string;
  status: EvidenceGapStatus;
  severity: EvidenceGapSeverity;
  currentState: string;
  requiredEvidence: string;
  nextAction: string;
  publicationImpact: string;
}

export const kazakhstanEvidenceGaps: KazakhstanEvidenceGap[] = [
  {
    gapId: 'gap:kz:binance:kzt-rails-current-status',
    exchangeId: 'binance',
    topic: 'KZT fiat rails',
    status: 'required',
    severity: 'P0',
    currentState: 'Official guides document historical Freedom Bank and Kazakhstan Mastercard flows; current operational status is not mapped into the validated profile.',
    requiredEvidence: 'Current official provider/exchange evidence with date, direction, eligibility and operational status.',
    nextAction: 'Run a source-only current-status review and map separate deposit/withdrawal claims.',
    publicationImpact: 'Blocks public local-payment claims; does not invalidate the core licence/availability profile.',
  },
  {
    gapId: 'gap:kz:binance:p2p-active-market',
    exchangeId: 'binance',
    topic: 'P2P methods and directions',
    status: 'required',
    severity: 'P0',
    currentState: 'Marketplace and named payment-method surfaces exist, but active offers, buy/sell directions and resident eligibility were not tested.',
    requiredEvidence: 'Dated official/current marketplace evidence identifying KZT, payment methods, directions and limitations.',
    nextAction: 'Map P2P surface claims separately from AFSA legal-route claims.',
    publicationImpact: 'Blocks specific P2P-method statements and local guide publication.',
  },
  {
    gapId: 'gap:kz:binance:cbw-campaign-binding',
    exchangeId: 'binance',
    topic: 'Affiliate offer eligibility',
    status: 'blocked',
    severity: 'P0',
    currentState: 'No owner-approved CBW Binance campaign URL or referral code exists for Kazakhstan.',
    requiredEvidence: 'Owner-supplied campaign binding plus current Kazakhstan eligibility and terms evidence.',
    nextAction: 'Keep offerEligibility under_review and CTA disabled.',
    publicationImpact: 'Blocks Binance affiliate CTA and promo-code publication for Kazakhstan.',
  },
  {
    gapId: 'gap:kz:bybit:p2p-source-separation',
    exchangeId: 'bybit',
    topic: 'Regulated P2P launch and numeric limits',
    status: 'required',
    severity: 'P0',
    currentState: 'Legacy GEO summary mentions a 2025 P2P launch and numeric KZT limits, but the tracked row cites only the AFSA licence page.',
    requiredEvidence: 'Separate official source packet for launch date, current status and any numeric limits.',
    nextAction: 'Do not copy the composite legacy note into the validated market profile.',
    publicationImpact: 'Blocks Bybit-specific P2P and limit claims.',
  },
  {
    gapId: 'gap:kz:bybit:local-kyc-source',
    exchangeId: 'bybit',
    topic: 'KYC requirements',
    status: 'required',
    severity: 'P1',
    currentState: 'The legacy row references tracked offer terms but no dedicated source packet is mapped into the Portal Factory profile.',
    requiredEvidence: 'Current official Bybit/Bybit Kazakhstan KYC documentation with date and local applicability limitations.',
    nextAction: 'Create a dedicated KYC source packet before rendering local KYC detail.',
    publicationImpact: 'Blocks detailed KYC copy; does not block the licence-based availability verdict.',
  },
  {
    gapId: 'gap:kz:bybit:local-offer-eligibility',
    exchangeId: 'bybit',
    topic: 'Welcome offer eligibility',
    status: 'required',
    severity: 'P0',
    currentState: 'Global welcome offer availability for Kazakhstan-registered users is not affirmatively confirmed.',
    requiredEvidence: 'Current local/global terms proving Kazakhstan eligibility and the correct product/entity path.',
    nextAction: 'Keep offerEligibility under_review and avoid CTA activation from the country profile.',
    publicationImpact: 'Blocks local offer CTA and bonus claim.',
  },
  {
    gapId: 'gap:kz:okx:source-truth-lifecycle',
    exchangeId: 'okx',
    topic: 'Source-truth resolution',
    status: 'blocked',
    severity: 'P0',
    currentState: 'Existing OKX Kazakhstan research is CONFLICTING with MEDIUM confidence and import readiness BLOCKED.',
    requiredEvidence: 'Completed source-truth review, correction if required and independent validation.',
    nextAction: 'Do not create a validated OKX market profile from the current conflicting package.',
    publicationImpact: 'Blocks the third required market profile and all ranking readiness.',
  },
  {
    gapId: 'gap:kz:country:ranking-methodology',
    exchangeId: 'country',
    topic: 'Ranking methodology',
    status: 'required',
    severity: 'P0',
    currentState: 'No Kazakhstan-specific methodology version is frozen for Portal Factory rankings.',
    requiredEvidence: 'Approved methodology defining eligibility, exclusions, scoring/rationale and freshness thresholds.',
    nextAction: 'Prepare methodology proposal only after at least three reviewable profiles exist.',
    publicationImpact: 'Blocks any numbered Top-3 or Top-10 snapshot.',
  },
  {
    gapId: 'gap:kz:country:owner-ranking-approval',
    exchangeId: 'country',
    topic: 'Owner ranking approval',
    status: 'blocked',
    severity: 'P0',
    currentState: 'No non-empty Kazakhstan RankingSnapshot has owner approval.',
    requiredEvidence: 'Owner-approved snapshot referencing validated market profiles and rationale claims.',
    nextAction: 'Keep country ranking route in noindex fail-closed state.',
    publicationImpact: 'Blocks ranking rows, indexability and production publication.',
  },
];

export interface KazakhstanRankingReadiness {
  requiredProfileCount: number;
  validatedProfileIds: string[];
  blockedCandidateIds: string[];
  profileCountGate: boolean;
  profileValidationGate: boolean;
  evidenceFreshnessGate: boolean;
  methodologyFrozenGate: boolean;
  affiliateIndependenceGate: boolean;
  ownerApprovalGate: boolean;
  publicIndexabilityGate: boolean;
  ready: boolean;
}

const validatedProfiles = [
  binanceKazakhstanMarketProfile,
  bybitKazakhstanMarketProfile,
];

const asOf = Date.parse('2026-07-31T12:25:00Z');
const evidenceFreshnessGate = validatedProfiles.every(profile =>
  Date.parse(profile.nextReviewAt) > asOf,
);

export const kazakhstanRankingReadiness: KazakhstanRankingReadiness = {
  requiredProfileCount: 3,
  validatedProfileIds: validatedProfiles
    .filter(profile => profile.approval === 'validated')
    .map(profile => profile.profileId),
  blockedCandidateIds: ['market-profile:okx:kz'],
  profileCountGate: validatedProfiles.length >= 3,
  profileValidationGate: validatedProfiles.every(profile => profile.approval === 'validated'),
  evidenceFreshnessGate,
  methodologyFrozenGate: false,
  affiliateIndependenceGate: true,
  ownerApprovalGate: false,
  publicIndexabilityGate: false,
  ready: false,
};

export const kazakhstanReadinessIssues: string[] = [];

if (new Set(kazakhstanEvidenceGaps.map(gap => gap.gapId)).size !== kazakhstanEvidenceGaps.length) {
  kazakhstanReadinessIssues.push('Duplicate Kazakhstan evidence gap IDs detected.');
}

const requiredReadyGates = [
  kazakhstanRankingReadiness.profileCountGate,
  kazakhstanRankingReadiness.profileValidationGate,
  kazakhstanRankingReadiness.evidenceFreshnessGate,
  kazakhstanRankingReadiness.methodologyFrozenGate,
  kazakhstanRankingReadiness.affiliateIndependenceGate,
  kazakhstanRankingReadiness.ownerApprovalGate,
  kazakhstanRankingReadiness.publicIndexabilityGate,
];

if (kazakhstanRankingReadiness.ready !== requiredReadyGates.every(Boolean)) {
  kazakhstanReadinessIssues.push('Ranking ready state does not match the required gate conjunction.');
}

if (kazakhstanRankingReadiness.ready) {
  kazakhstanReadinessIssues.push('Kazakhstan ranking must remain blocked until methodology, owner and publication gates pass.');
}

export const kazakhstanReadinessPass = kazakhstanReadinessIssues.length === 0;

if (!kazakhstanReadinessPass) {
  throw new Error(`Kazakhstan readiness validation failed: ${kazakhstanReadinessIssues.join('; ')}`);
}
