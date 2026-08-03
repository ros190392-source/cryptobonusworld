/**
 * Named review-state fixtures for the Portal Factory contracts.
 *
 * Proves — at build time — that each of the six review states behaves
 * fail-closed: valid data is accepted; incomplete, stale, conflicting,
 * unavailable and malformed data is rejected and can never be promoted to an
 * approved conclusion or a commercial affiliate action. If any expectation is
 * violated this module throws on import, failing the build.
 */
import {
  validateMarketProfile,
  validateNormalizedClaim,
  validateSourcePacket,
} from './portalFactory';
import type { ReviewTone } from './portalUi';
import { resolveCommercialCta } from './portalCta';

const digest = `sha256:${'c'.repeat(64)}`;

const supportedClaim = {
  claimId: 'claim:state:availability:approved',
  subjectId: 'market-profile:state-exchange:kz',
  predicate: 'availability-state',
  value: 'available',
  countryCode: 'KZ',
  exchangeId: 'state-exchange',
  supportingPacketIds: ['src:state:official:001'],
  contradictingPacketIds: [],
  confidence: 'high',
  limitations: [],
  approval: 'approved',
};

const approvedProfile = {
  profileId: 'market-profile:state-exchange:kz',
  exchangeId: 'state-exchange',
  countryCode: 'KZ',
  availability: 'available',
  offerEligibility: 'approved',
  claimIds: [supportedClaim.claimId],
  limitations: [],
  lastCheckedAt: '2026-07-31T16:00:00Z',
  nextReviewAt: '2026-08-31T16:00:00Z',
  approval: 'approved',
};

export interface ReviewStateFixture {
  state: 'valid' | 'incomplete' | 'stale' | 'conflicting' | 'unavailable' | 'malformed';
  tone: ReviewTone;
  name: string;
  expected: 'ACCEPT' | 'REJECT';
  ok: boolean;
  detail: string;
}

function contractFixture(
  state: ReviewStateFixture['state'],
  tone: ReviewTone,
  name: string,
  expected: 'ACCEPT' | 'REJECT',
  result: { ok: boolean; issues: { code: string }[] },
): ReviewStateFixture {
  const ok = expected === 'ACCEPT' ? result.ok : !result.ok;
  const codes = result.issues.map(i => i.code).join(', ');
  return {
    state,
    tone,
    name,
    expected,
    ok,
    detail: result.ok ? 'Accepted (evidence and approval satisfied).' : `Rejected: ${codes || 'invalid'}`,
  };
}

/** A commercial CTA fixture: proves whether a /go/* affiliate target is (dis)allowed. */
function ctaFixture(
  state: ReviewStateFixture['state'],
  tone: ReviewTone,
  name: string,
  expectAffiliate: boolean,
  profile: Parameters<typeof resolveCommercialCta>[3],
): ReviewStateFixture {
  const model = resolveCommercialCta('get_bonus', 'ru', 'production', profile);
  const emittedAffiliate = model.isAffiliate && model.href.startsWith('/go/');
  const ok = emittedAffiliate === expectAffiliate;
  return {
    state,
    tone,
    name,
    expected: expectAffiliate ? 'ACCEPT' : 'REJECT',
    ok,
    detail: emittedAffiliate
      ? `Commercial CTA authorized → ${model.href}`
      : `Commercial CTA withheld (${model.gateReason ?? 'gated'}); href → ${model.href}, disabled=${model.disabled}`,
  };
}

export const reviewStateFixtures: ReviewStateFixture[] = [
  // 1. VALID — supported, approved claim/profile is accepted; commercial CTA is authorized.
  contractFixture('valid', 'verified', 'Valid approved market profile', 'ACCEPT', validateMarketProfile(approvedProfile)),
  ctaFixture('valid', 'verified', 'Approved + eligible → commercial CTA authorized', true, {
    exchangeId: 'state-exchange',
    slug: 'state-exchange',
    availability: 'available',
    offerEligibility: 'approved',
    approval: 'approved',
    reviewHref: '/exchanges/state-exchange/',
  }),

  // 2. INCOMPLETE — a factual claim with no supporting evidence is rejected.
  contractFixture('incomplete', 'missing', 'Claim without supporting evidence', 'REJECT', validateNormalizedClaim({
    ...supportedClaim,
    claimId: 'claim:state:incomplete',
    supportingPacketIds: [],
    approval: 'validated',
  })),

  // 3. STALE — a stale profile cannot back an approved local offer.
  contractFixture('stale', 'stale', 'Stale profile backing an approved offer', 'REJECT', validateMarketProfile({
    ...approvedProfile,
    profileId: 'market-profile:state-exchange:kz:stale',
    offerEligibility: 'approved',
    approval: 'stale',
  })),
  ctaFixture('stale', 'stale', 'Stale profile → no commercial CTA', false, {
    exchangeId: 'state-exchange',
    slug: 'state-exchange',
    availability: 'available',
    offerEligibility: 'approved',
    approval: 'stale',
    reviewHref: '/exchanges/state-exchange/',
  }),

  // 4. CONFLICTING — contradictory evidence blocks approval.
  contractFixture('conflicting', 'review', 'Claim with unresolved contradiction', 'REJECT', validateNormalizedClaim({
    ...supportedClaim,
    claimId: 'claim:state:conflicting',
    contradictingPacketIds: ['src:state:contradicting:001'],
    approval: 'approved',
  })),

  // 5. UNAVAILABLE / RESTRICTED — no commercial CTA for a restricted or unavailable market.
  ctaFixture('unavailable', 'restricted', 'Restricted market → commercial CTA withheld', false, {
    exchangeId: 'state-exchange',
    slug: 'state-exchange',
    availability: 'restricted',
    offerEligibility: 'not_eligible',
    approval: 'approved',
    reviewHref: '/exchanges/state-exchange/',
  }),

  // 6. MALFORMED — non-object / missing required fields is rejected outright.
  contractFixture('malformed', 'missing', 'Malformed (non-object) source packet', 'REJECT', validateSourcePacket(null)),
  contractFixture('malformed', 'missing', 'Malformed source packet (missing fields)', 'REJECT', validateSourcePacket({ packetId: 'x' })),
];

export const reviewStatesPass = reviewStateFixtures.every(f => f.ok);

if (!reviewStatesPass) {
  const failed = reviewStateFixtures.filter(f => !f.ok).map(f => f.name).join('; ');
  throw new Error(`Portal review-state fixtures failed fail-closed expectations: ${failed}`);
}
