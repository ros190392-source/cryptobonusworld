import type { MarketProfile } from '../../contracts/portalFactory';
import { binanceKazakhstanMarketProfile } from './binanceReview';
import { bybitKazakhstanMarketProfile } from './bybitReview';
import { okxKazakhstanMarketProfile } from './okxReview';
import { kazakhstanRankingReadiness } from './readiness';

export type RankingEligibilityState = 'eligible_candidate' | 'excluded' | 'under_review';

export interface KazakhstanMethodologyProposal {
  methodologyId: string;
  version: string;
  status: 'frozen_for_draft_snapshot';
  ownerDecision: 'METHODOLOGY_FREEZE_APPROVED_FOR_DRAFT_SNAPSHOT';
  ownerDecisionIssue: 144;
  frozenAt: string;
  countryCode: 'KZ';
  evidenceAsOf: string;
  rankingOrderAuthorized: false;
  affiliateWeight: 0;
  eligibilityRules: string[];
  exclusionRules: string[];
  orderingDimensions: Array<{
    id: string;
    status: 'mapped' | 'incomplete';
    description: string;
  }>;
}

export interface KazakhstanEligibilityDecision {
  marketProfileId: string;
  exchangeId: string;
  state: RankingEligibilityState;
  reasons: string[];
  rankingPosition: null;
  affiliateInfluence: false;
}

export const kazakhstanMethodologyProposal: KazakhstanMethodologyProposal = {
  methodologyId: 'methodology:kz:exchange-ranking:0.1',
  version: 'cbw-kz-review-0.1',
  status: 'frozen_for_draft_snapshot',
  ownerDecision: 'METHODOLOGY_FREEZE_APPROVED_FOR_DRAFT_SNAPSHOT',
  ownerDecisionIssue: 144,
  frozenAt: '2026-07-31T16:30:00Z',
  countryCode: 'KZ',
  evidenceAsOf: '2026-07-31T16:30:00Z',
  rankingOrderAuthorized: false,
  affiliateWeight: 0,
  eligibilityRules: [
    'The market profile must pass the Portal Factory contract with approval=validated.',
    'The profile must be before its nextReviewAt timestamp.',
    'Availability must be available or limited; unknown does not qualify for a ranked row.',
    'Country availability and local offer eligibility remain separate dimensions.',
    'A profile may be eligible as a candidate while its offer remains under_review.',
  ],
  exclusionRules: [
    'Profiles with availability restricted, unavailable or unknown are excluded from ranking rows.',
    'Profiles named in conflictBlockedProfileIds are excluded until the conflict gate passes or an owner-approved methodology explicitly retains exclusion.',
    'Missing evidence cannot be replaced by global product visibility, affiliate terms or absence from a restricted list.',
    'Affiliate availability, promo code, commission, CTA state and commercial value have zero ranking weight.',
    'Expired evidence moves a profile back to under_review before ranking assembly.',
  ],
  orderingDimensions: [
    {
      id: 'local-authorization-and-availability',
      status: 'mapped',
      description: 'Country authorization evidence and the validated availability state.',
    },
    {
      id: 'evidence-confidence-and-conflicts',
      status: 'mapped',
      description: 'Confidence, retained contradictions and material limitations.',
    },
    {
      id: 'kyc-and-account-access',
      status: 'incomplete',
      description: 'Country-specific KYC is partly mapped, but no account-level approval testing exists and OKX remains generic-only.',
    },
    {
      id: 'local-fiat-and-p2p',
      status: 'incomplete',
      description: 'Bybit dated P2P evidence and Binance route surfaces are mapped; active Binance orders and current direct KZT rails remain unconfirmed.',
    },
    {
      id: 'product-coverage',
      status: 'incomplete',
      description: 'Country-specific product availability with eligibility limitations.',
    },
    {
      id: 'fees-and-limits',
      status: 'incomplete',
      description: 'Bybit P2P fees and limits are mapped, but comparable cross-exchange fees and limits are incomplete.',
    },
  ],
};

const profiles: MarketProfile[] = [
  binanceKazakhstanMarketProfile,
  bybitKazakhstanMarketProfile,
  okxKazakhstanMarketProfile,
];

function isFresh(profile: MarketProfile): boolean {
  return Date.parse(profile.nextReviewAt) > Date.parse(kazakhstanMethodologyProposal.evidenceAsOf);
}

export function evaluateKazakhstanRankingEligibility(
  profile: MarketProfile,
): KazakhstanEligibilityDecision {
  const reasons: string[] = [];

  if (profile.approval !== 'validated') {
    reasons.push('Market profile is not validated.');
  }

  if (!isFresh(profile)) {
    reasons.push('Evidence is beyond the next-review timestamp.');
  }

  if (kazakhstanRankingReadiness.conflictBlockedProfileIds.includes(profile.profileId)) {
    reasons.push('A material retained conflict blocks ranking eligibility.');
  }

  if (!['available', 'limited'].includes(profile.availability)) {
    reasons.push(`Availability ${profile.availability} is not ranking-eligible.`);
  }

  const hardExcluded = reasons.length > 0;
  const orderingComplete = kazakhstanMethodologyProposal.orderingDimensions.every(
    dimension => dimension.status === 'mapped',
  );

  return {
    marketProfileId: profile.profileId,
    exchangeId: profile.exchangeId,
    state: hardExcluded
      ? 'excluded'
      : orderingComplete
        ? 'eligible_candidate'
        : 'under_review',
    reasons: hardExcluded
      ? reasons
      : ['Eligibility gate passed, but ordering dimensions remain incomplete.'],
    rankingPosition: null,
    affiliateInfluence: false,
  };
}

export const kazakhstanEligibilityDecisions = profiles.map(
  evaluateKazakhstanRankingEligibility,
);

export const kazakhstanMethodologyIssues: string[] = [];

if (kazakhstanMethodologyProposal.status !== 'frozen_for_draft_snapshot') {
  kazakhstanMethodologyIssues.push('Methodology must be frozen only for draft-snapshot use.');
}

if (kazakhstanMethodologyProposal.ownerDecision !== 'METHODOLOGY_FREEZE_APPROVED_FOR_DRAFT_SNAPSHOT') {
  kazakhstanMethodologyIssues.push('Exact owner methodology decision is missing.');
}

if (kazakhstanMethodologyProposal.affiliateWeight !== 0) {
  kazakhstanMethodologyIssues.push('Affiliate weight must remain zero.');
}

if (kazakhstanMethodologyProposal.rankingOrderAuthorized !== false) {
  kazakhstanMethodologyIssues.push('Methodology freeze may not authorize ranking order.');
}

if (kazakhstanEligibilityDecisions.some(decision => decision.rankingPosition !== null)) {
  kazakhstanMethodologyIssues.push('Frozen methodology must not create ranking positions.');
}

const decisionByExchange = Object.fromEntries(
  kazakhstanEligibilityDecisions.map(decision => [decision.exchangeId, decision]),
);

if (decisionByExchange.okx?.state !== 'excluded') {
  kazakhstanMethodologyIssues.push('OKX must remain excluded while the retained conflict is open.');
}

if (decisionByExchange.binance?.state !== 'under_review') {
  kazakhstanMethodologyIssues.push('Binance should remain an unranked candidate until ordering evidence is complete.');
}

if (decisionByExchange.bybit?.state !== 'under_review') {
  kazakhstanMethodologyIssues.push('Bybit should remain an unranked candidate until ordering evidence is complete.');
}

if (kazakhstanEligibilityDecisions.some(decision => decision.affiliateInfluence !== false)) {
  kazakhstanMethodologyIssues.push('Affiliate influence must remain false for every decision.');
}

export const kazakhstanMethodologyPass = kazakhstanMethodologyIssues.length === 0;

if (!kazakhstanMethodologyPass) {
  throw new Error(`Kazakhstan methodology validation failed: ${kazakhstanMethodologyIssues.join('; ')}`);
}
