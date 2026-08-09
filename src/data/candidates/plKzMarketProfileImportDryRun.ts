import { buildMarketProfileImportDryRun, type MarketProfileImportDryRun } from '../contracts/marketProfileImportDryRun';
import {
  PL_KZ_MARKET_PROFILE_CANDIDATE_SOURCES,
  createPlKzMarketProfileCandidateInventory,
} from './plKzMarketProfileCandidateInventory';
import { createPlKzMarketProfileReviewPreflight } from './plKzMarketProfileReviewPreflight';
import { createPlKzMarketProfilePromotionPreflight } from './plKzMarketProfilePromotionPreflight';

export const PL_KZ_MARKET_PROFILE_IMPORT_DRY_RUN_ID = 'CBW-PL-KZ-MARKETPROFILE-IMPORT-DRY-RUN-001' as const;

export function createPlKzMarketProfileImportDryRun(now: number): MarketProfileImportDryRun {
  if (!Number.isFinite(now)) throw new Error('Explicit finite import-dry-run clock is required.');
  const inventory = createPlKzMarketProfileCandidateInventory(now);
  const reviewPreflight = createPlKzMarketProfileReviewPreflight(now);
  const promotionPreflight = createPlKzMarketProfilePromotionPreflight(now);
  const generatedAt = new Date(now).toISOString().replace('.000Z', 'Z');
  return buildMarketProfileImportDryRun({
    dryRunId: PL_KZ_MARKET_PROFILE_IMPORT_DRY_RUN_ID,
    inventory,
    reviewPreflight,
    promotionPreflight,
    sources: PL_KZ_MARKET_PROFILE_CANDIDATE_SOURCES,
    generatedAt,
  });
}
