import {
  buildMarketProfileCandidateInventory,
  type CandidateInventorySource,
  type MarketProfileCandidateInventory,
} from '../contracts/marketProfileCandidateInventory';
import { PL_P0_MARKET_PROFILE_CANDIDATE_BUNDLE } from './plP0MarketProfileCandidates';
import { KZ_P0_MARKET_PROFILE_CANDIDATE_SET } from './kzP0MarketProfileCandidates';

export const PL_KZ_MARKET_PROFILE_CANDIDATE_INVENTORY_ID = 'CBW-PL-KZ-MARKETPROFILE-CANDIDATE-INVENTORY-001' as const;

const plSources: readonly CandidateInventorySource[] = Object.freeze(
  PL_P0_MARKET_PROFILE_CANDIDATE_BUNDLE.entries.map((entry) => Object.freeze({
    exchangeId: entry.expected.exchangeId,
    countryCode: entry.expected.countryCode,
    provenanceClass: 'modern_research_main' as const,
    candidate: entry.candidate,
  })),
);

const kzSources: readonly CandidateInventorySource[] = Object.freeze(
  KZ_P0_MARKET_PROFILE_CANDIDATE_SET.entries.map((entry) => Object.freeze({
    exchangeId: entry.exchangeId,
    countryCode: entry.countryCode,
    provenanceClass: entry.provenanceClass,
    candidate: entry.candidate,
  })),
);

export const PL_KZ_MARKET_PROFILE_CANDIDATE_SOURCES: readonly CandidateInventorySource[] = Object.freeze([
  ...plSources,
  ...kzSources,
]);

export function createPlKzMarketProfileCandidateInventory(now: number): MarketProfileCandidateInventory {
  return buildMarketProfileCandidateInventory({
    inventoryId: PL_KZ_MARKET_PROFILE_CANDIDATE_INVENTORY_ID,
    now,
    sources: PL_KZ_MARKET_PROFILE_CANDIDATE_SOURCES,
  });
}
