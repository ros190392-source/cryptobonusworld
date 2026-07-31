import { binanceKazakhstanMarketProfile } from './binanceReview';
import { bybitKazakhstanMarketProfile } from './bybitReview';
import { okxKazakhstanMarketProfile } from './okxReview';

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
    currentState: 'Official guides document historical Freedom Bank and Kazakhstan Mastercard flows; current direct deposit/withdrawal operational status remains unconfirmed.',
    requiredEvidence: 'Current official provider/exchange evidence with date, direction, eligibility and operational status.',
    nextAction: 'Run a source-only current-status review and map separate deposit/withdrawal claims.',
    publicationImpact: 'Blocks public direct-fiat deposit/withdrawal claims; does not invalidate the core licence/availability profile.',
  },
  {
    gapId: 'gap:kz:binance:p2p-active-market',
    exchangeId: 'binance',
    topic: 'Active P2P methods and directions',
    status: 'required',
    severity: 'P0',
    currentState: 'Freedom Bank and localized sell-route surfaces are mapped as visible, but no active advertiser, executable KZT order, complete buy/sell coverage or resident eligibility was confirmed.',
    requiredEvidence: 'Dated current marketplace evidence identifying active advertisements, KZT, payment methods, direction and limitations without relying on route existence alone.',
    nextAction: 'Keep the new surface claims while leaving active-market conclusions and guide-level method lists disabled.',
    publicationImpact: 'Allows cautious surface-status copy; still blocks active-market, method-availability and transaction guidance claims.',
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
    topic: 'Regulated P2P launch, fees and numeric limits',
    status: 'mapped',
    severity: 'P0',
    currentState: 'Dedicated official Bybit Kazakhstan packets now support a dated P2P launch signal, 0% platform transaction fee statement and published 900–22,000,000 KZT per-ad range.',
    requiredEvidence: 'Mapped in `bybitReview.ts` with date-bound limitations and source-map digest.',
    nextAction: 'Recheck before publication and never present the published range as proof of a currently active advertisement.',
    publicationImpact: 'Review-only dated P2P facts may render; active-ad and universal-eligibility claims remain prohibited.',
  },
  {
    gapId: 'gap:kz:bybit:local-kyc-source',
    exchangeId: 'bybit',
    topic: 'KYC requirements',
    status: 'mapped',
    severity: 'P1',
    currentState: 'A dedicated official Bybit Kazakhstan KYC packet now states that at least Standard verification is mandatory for all products and services.',
    requiredEvidence: 'Mapped in `bybitReview.ts` with product/region and account-level limitations.',
    nextAction: 'Recheck documentation freshness before public publication; do not infer approval for a specific user.',
    publicationImpact: 'Review-only KYC requirement copy may render; account approval and document acceptance remain untested.',
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
    gapId: 'gap:kz:okx:retained-authorization-conflict',
    exchangeId: 'okx',
    topic: 'Platform reachability versus local authorization',
    status: 'blocked',
    severity: 'P0',
    currentState: 'The independently validated corrected package retains CONFLICTING / MEDIUM: platform and KZT P2P surfaces are visible while AFSA names OKX among unlicensed platforms and regulated P2P requires a licensed DATF.',
    requiredEvidence: 'A later dated official change that resolves local authorization, or an owner methodology decision that keeps OKX excluded/under review.',
    nextAction: 'Keep the validated OKX profile availability unknown, offer under review and ranking eligibility false.',
    publicationImpact: 'Does not block profile completeness, but blocks OKX ranking inclusion, recommendation and affiliate CTA.',
  },
  {
    gapId: 'gap:kz:country:ranking-methodology',
    exchangeId: 'country',
    topic: 'Ranking methodology',
    status: 'required',
    severity: 'P0',
    currentState: 'Methodology proposal v0.1 exists but has not been owner-frozen for a draft RankingSnapshot.',
    requiredEvidence: 'Owner decision on eligibility, conflict exclusions, scoring/rationale and freshness thresholds in Issue #144.',
    nextAction: 'Keep every position null until the methodology outcome is recorded.',
    publicationImpact: 'Blocks any numbered Top-3 or Top-10 snapshot.',
  },
  {
    gapId: 'gap:kz:country:owner-ranking-approval',
    exchangeId: 'country',
    topic: 'Owner ranking approval',
    status: 'blocked',
    severity: 'P0',
    currentState: 'No non-empty Kazakhstan RankingSnapshot has owner approval.',
    requiredEvidence: 'Owner-approved snapshot referencing validated, methodology-eligible market profiles and rationale claims.',
    nextAction: 'Keep country ranking route in noindex fail-closed state.',
    publicationImpact: 'Blocks ranking rows, indexability and production publication.',
  },
];

export interface KazakhstanRankingReadiness {
  requiredProfileCount: number;
  validatedProfileIds: string[];
  conflictBlockedProfileIds: string[];
  profileCountGate: boolean;
  profileValidationGate: boolean;
  evidenceFreshnessGate: boolean;
  conflictResolutionGate: boolean;
  methodologyFrozenGate: boolean;
  affiliateIndependenceGate: boolean;
  ownerApprovalGate: boolean;
  publicIndexabilityGate: boolean;
  ready: boolean;
}

const validatedProfiles = [
  binanceKazakhstanMarketProfile,
  bybitKazakhstanMarketProfile,
  okxKazakhstanMarketProfile,
];

const asOf = Date.parse('2026-07-31T16:10:00Z');
const evidenceFreshnessGate = validatedProfiles.every(profile =>
  Date.parse(profile.nextReviewAt) > asOf,
);

export const kazakhstanRankingReadiness: KazakhstanRankingReadiness = {
  requiredProfileCount: 3,
  validatedProfileIds: validatedProfiles
    .filter(profile => profile.approval === 'validated')
    .map(profile => profile.profileId),
  conflictBlockedProfileIds: [okxKazakhstanMarketProfile.profileId],
  profileCountGate: validatedProfiles.length >= 3,
  profileValidationGate: validatedProfiles.every(profile => profile.approval === 'validated'),
  evidenceFreshnessGate,
  conflictResolutionGate: false,
  methodologyFrozenGate: false,
  affiliateIndependenceGate: true,
  ownerApprovalGate: false,
  publicIndexabilityGate: false,
  ready: false,
};

export const kazakhstanOpenEvidenceGaps = kazakhstanEvidenceGaps.filter(
  gap => gap.status !== 'mapped',
);
export const kazakhstanMappedEvidenceGaps = kazakhstanEvidenceGaps.filter(
  gap => gap.status === 'mapped',
);

export const kazakhstanReadinessIssues: string[] = [];

if (new Set(kazakhstanEvidenceGaps.map(gap => gap.gapId)).size !== kazakhstanEvidenceGaps.length) {
  kazakhstanReadinessIssues.push('Duplicate Kazakhstan evidence gap IDs detected.');
}

if (kazakhstanRankingReadiness.validatedProfileIds.length !== 3) {
  kazakhstanReadinessIssues.push('Exactly three validated Kazakhstan review profiles are expected at this stage.');
}

if (!kazakhstanRankingReadiness.conflictBlockedProfileIds.includes('market-profile:okx:kz')) {
  kazakhstanReadinessIssues.push('The retained OKX authorization conflict must block ranking eligibility.');
}

if (kazakhstanOpenEvidenceGaps.filter(gap => gap.severity === 'P0').length !== 7) {
  kazakhstanReadinessIssues.push('Exactly seven open P0 Kazakhstan gaps are expected after evidence mapping 051F.');
}

if (kazakhstanOpenEvidenceGaps.filter(gap => gap.severity === 'P1').length !== 0) {
  kazakhstanReadinessIssues.push('No open P1 Kazakhstan gap is expected after Bybit KYC mapping.');
}

if (kazakhstanMappedEvidenceGaps.length !== 2) {
  kazakhstanReadinessIssues.push('Exactly two evidence gaps must be recorded as mapped after 051F.');
}

const requiredReadyGates = [
  kazakhstanRankingReadiness.profileCountGate,
  kazakhstanRankingReadiness.profileValidationGate,
  kazakhstanRankingReadiness.evidenceFreshnessGate,
  kazakhstanRankingReadiness.conflictResolutionGate,
  kazakhstanRankingReadiness.methodologyFrozenGate,
  kazakhstanRankingReadiness.affiliateIndependenceGate,
  kazakhstanRankingReadiness.ownerApprovalGate,
  kazakhstanRankingReadiness.publicIndexabilityGate,
];

if (kazakhstanRankingReadiness.ready !== requiredReadyGates.every(Boolean)) {
  kazakhstanReadinessIssues.push('Ranking ready state does not match the required gate conjunction.');
}

if (kazakhstanRankingReadiness.ready) {
  kazakhstanReadinessIssues.push('Kazakhstan ranking must remain blocked until conflict, methodology, owner and publication gates pass.');
}

export const kazakhstanReadinessPass = kazakhstanReadinessIssues.length === 0;

if (!kazakhstanReadinessPass) {
  throw new Error(`Kazakhstan readiness validation failed: ${kazakhstanReadinessIssues.join('; ')}`);
}
