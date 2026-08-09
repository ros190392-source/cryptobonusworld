import { buildMarketProfileReviewPreflight, type MarketProfileReviewPreflight } from '../contracts/marketProfileReviewPreflight';
import {
  PL_KZ_MARKET_PROFILE_CANDIDATE_SOURCES,
  createPlKzMarketProfileCandidateInventory,
} from './plKzMarketProfileCandidateInventory';

export const PL_KZ_MARKET_PROFILE_REVIEW_PREFLIGHT_ID = 'CBW-PL-KZ-MARKETPROFILE-REVIEW-PREFLIGHT-001' as const;

export function createPlKzMarketProfileReviewPreflight(now: number): MarketProfileReviewPreflight {
  if (!Number.isFinite(now)) throw new Error('Explicit finite review-preflight clock is required.');
  const inventory = createPlKzMarketProfileCandidateInventory(now);
  const reviewedAt = new Date(now).toISOString().replace('.000Z', 'Z');
  return buildMarketProfileReviewPreflight({
    preflightId: PL_KZ_MARKET_PROFILE_REVIEW_PREFLIGHT_ID,
    inventory,
    sources: PL_KZ_MARKET_PROFILE_CANDIDATE_SOURCES,
    reviewedAt,
  });
}
