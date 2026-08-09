import { buildMarketProfilePromotionPreflight, type MarketProfilePromotionPreflight } from '../contracts/marketProfilePromotionPreflight';
import {
  PL_KZ_MARKET_PROFILE_CANDIDATE_SOURCES,
  createPlKzMarketProfileCandidateInventory,
} from './plKzMarketProfileCandidateInventory';
import { createPlKzMarketProfileReviewPreflight } from './plKzMarketProfileReviewPreflight';

export const PL_KZ_MARKET_PROFILE_PROMOTION_PREFLIGHT_ID = 'CBW-PL-KZ-MARKETPROFILE-PROMOTION-PREFLIGHT-001' as const;

export function createPlKzMarketProfilePromotionPreflight(now: number): MarketProfilePromotionPreflight {
  if (!Number.isFinite(now)) throw new Error('Explicit finite promotion-preflight clock is required.');
  const inventory = createPlKzMarketProfileCandidateInventory(now);
  const reviewPreflight = createPlKzMarketProfileReviewPreflight(now);
  const evaluatedAt = new Date(now).toISOString().replace('.000Z', 'Z');
  return buildMarketProfilePromotionPreflight({
    preflightId: PL_KZ_MARKET_PROFILE_PROMOTION_PREFLIGHT_ID,
    inventory,
    reviewPreflight,
    sources: PL_KZ_MARKET_PROFILE_CANDIDATE_SOURCES,
    evaluatedAt,
  });
}
