/**
 * Canonical Exchange × Country MarketProfile resolution.
 *
 * The MarketProfile contract (portalFactory) is the ONLY factual source of
 * per-country exchange availability + approval. This resolver finds the single
 * approved, valid, available profile for an exact exchange × country pair, and
 * fails closed for every other case.
 *
 * Nothing here promotes legacy prose (countries.json, localNotes, popularity,
 * ranking position or offer status) into an approved geo fact.
 *
 * The PUBLIC registry is intentionally EMPTY: no evidence-backed approved public
 * MarketProfile records exist yet, so public homepage behaviour stays fully
 * fail-closed. Positive production cases are demonstrated only with explicit,
 * clearly test-only synthetic fixtures passed into the resolver.
 */
import type { MarketProfile } from './portalFactory';
import { validateMarketProfile } from './portalFactory';

export type MarketProfileFailReason =
  | 'PROFILE_MISSING'       // no profile for this exact pair
  | 'PROFILE_CONFLICT'      // more than one profile for this exact pair
  | 'PROFILE_INVALID'       // profile fails canonical validation
  | 'PROFILE_NOT_APPROVED'    // approval is not 'approved' (draft/validated/rejected/stale)
  | 'PROFILE_RESTRICTED'      // approved but availability restricted
  | 'PROFILE_UNAVAILABLE'     // approved but availability unavailable/unknown
  | 'PROFILE_REGISTRY_INVALID'; // the registry itself is not a usable array

export type MarketProfileResolution =
  | { ok: true; profile: MarketProfile }
  | { ok: false; reason: MarketProfileFailReason };

/**
 * The public, evidence-backed approved MarketProfile registry.
 * Empty by design until real records are populated (a later Split-3 task).
 */
export const PUBLIC_MARKET_PROFILES: readonly MarketProfile[] = Object.freeze([]);

/** Exact-match, fail-closed resolution of one approved available profile. */
export function resolveMarketProfile(
  exchangeId: string,
  countryCode: string,
  profiles: unknown,
): MarketProfileResolution {
  // R6: a malformed registry must fail closed, never throw — and it must be
  // ATOMIC. The whole registry is proven structurally valid BEFORE resolving an
  // exact pair, so a corrupted sibling entry can never be silently discarded to
  // let a matching profile authorize a CTA. Non-array, or ANY null / primitive /
  // structurally-invalid entry, invalidates the entire registry.
  if (!Array.isArray(profiles)) return { ok: false, reason: 'PROFILE_REGISTRY_INVALID' };
  for (const entry of profiles) {
    if (typeof entry !== 'object' || entry === null) return { ok: false, reason: 'PROFILE_REGISTRY_INVALID' };
    if (!validateMarketProfile(entry).ok) return { ok: false, reason: 'PROFILE_REGISTRY_INVALID' };
  }
  const valid = profiles as MarketProfile[]; // every entry is a valid MarketProfile

  // Exact exchange AND country match — no fuzzy/regional promotion. Valid
  // profiles for other pairs coexist without blocking resolution.
  const matches = valid.filter((p) => p.exchangeId === exchangeId && p.countryCode === countryCode);

  if (matches.length === 0) return { ok: false, reason: 'PROFILE_MISSING' };
  if (matches.length > 1) return { ok: false, reason: 'PROFILE_CONFLICT' };

  const profile = matches[0]!; // already structurally valid

  // Approval must be explicitly 'approved' (under-review / rejected / stale fail).
  if (profile.approval !== 'approved') return { ok: false, reason: 'PROFILE_NOT_APPROVED' };

  // Availability gate: only available / limited may proceed.
  if (profile.availability === 'restricted') return { ok: false, reason: 'PROFILE_RESTRICTED' };
  if (profile.availability !== 'available' && profile.availability !== 'limited') {
    return { ok: false, reason: 'PROFILE_UNAVAILABLE' };
  }

  return { ok: true, profile };
}
