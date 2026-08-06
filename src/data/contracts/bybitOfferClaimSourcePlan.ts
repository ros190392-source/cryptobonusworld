/**
 * BYBIT_OFFER_CLAIM_SOURCE_PLAN — code-owned claim/source plan + deterministic evidence
 * assessment for the Bybit offer (Issue #260).
 *
 * The RAW packet must not declare which evidence is enough to support its own claims.
 * This module is the single code-owned authority that decides, per target claim:
 *   * the exact current CBW assertion under test and its MATERIAL components;
 *   * which official source SCOPES may prove which components, and which scopes are
 *     insufficient (a general account-wide rule can NOT prove a promotion-specific
 *     assertion — fail closed on scope mismatch);
 *   * the preferred capture method, expected evidence type, freshness/currency rule,
 *     contradiction behaviour and whether one source suffices or multiple are required.
 *
 * `assessOfferClaimEvidence` is deterministic and fail-closed: it upgrades a claim to
 * `supported` ONLY when every material component is proven by an admissible fragment on
 * an official, current, accepted-scope `content` source with valid integrity, no
 * contradiction, and the multi-source rule satisfied. Otherwise it returns
 * `partially_supported`, `not_found`, `contradicted` or `inaccessible` honestly.
 *
 * `bybit.promo_code` (confirmation-gated) and `bybit.realistic_value` (editorial) are
 * EXCLUDED from source-based support and are refused by the assessment.
 */
import {
  type OfficialSourceCapture,
  type OfficialSourceScope,
  validateOfficialSourceCapture,
  sourceMaySupportClaims,
} from './officialSourceCapture';
import {
  BYBIT_OFFER_CLAIM_INVENTORY,
  BYBIT_OFFER_REQUIRED_CLAIMS,
} from './offerEvidencePacket';
import { parseExactIsoDateTime } from './evidenceMetadata';

export type ClaimRequirement = 'required' | 'optional';
export type MultiSourceRule = 'single_sufficient' | 'multiple_required';

/** Claims excluded from source-based support (handled by other authorities). */
export const SOURCE_PLAN_EXCLUDED_CLAIMS: readonly string[] = Object.freeze(['bybit.promo_code', 'bybit.realistic_value']);

export interface AssertionComponent {
  componentId: string;
  description: string;
  /** Scopes that may prove THIS component (subset of the entry's accepted scopes). */
  acceptedScopes: readonly OfficialSourceScope[];
}

export interface ClaimSourcePlanEntry {
  claimId: string;
  requirement: ClaimRequirement;
  /** The exact current CBW assertion under test. */
  currentAssertion: string;
  assertionComponents: readonly AssertionComponent[];
  /** Union of scopes that may prove any component (a source outside this can't count). */
  acceptedScopes: readonly OfficialSourceScope[];
  /** Scopes explicitly insufficient for this claim (e.g. account-wide for promo-specific). */
  insufficientScopes: readonly OfficialSourceScope[];
  preferredCaptureMethod: string;
  expectedEvidenceType: string;
  freshnessRule: { requiresCurrent: boolean; maxAgeDays: number };
  contradictionRule: string;
  sourceRule: MultiSourceRule;
}

const PROMO = ['promotion_specific', 'campaign_terms'] as const;

/** The immutable Bybit offer claim/source plan (7 required + 3 optional). */
export const BYBIT_OFFER_CLAIM_SOURCE_PLAN: readonly ClaimSourcePlanEntry[] = Object.freeze(([
  {
    claimId: 'bybit.bonus_headline',
    requirement: 'required',
    currentAssertion: 'Up to 30,000 USDT Welcome Package',
    assertionComponents: Object.freeze([
      { componentId: 'max-reward-figure', description: 'The maximum welcome reward figure "Up to 30,000 USDT".', acceptedScopes: PROMO },
      { componentId: 'reward-is-welcome-package', description: 'The reward is the current new-user welcome package.', acceptedScopes: PROMO },
    ]),
    acceptedScopes: Object.freeze(['promotion_specific', 'campaign_terms']),
    insufficientScopes: Object.freeze(['account_wide_general', 'historical_campaign', 'reward_mechanics', 'identity_verification_general', 'jurisdiction_specific', 'legal_restrictions', 'ambiguous']),
    preferredCaptureMethod: 'anonymous_https_probe_then_ephemeral_render',
    expectedEvidenceType: 'current promotion-specific headline / campaign terms',
    freshnessRule: { requiresCurrent: true, maxAgeDays: 30 },
    contradictionRule: 'An official current figure differing from "Up to 30,000 USDT" contradicts the claim.',
    sourceRule: 'single_sufficient',
  },
  {
    claimId: 'bybit.kyc_required',
    requirement: 'required',
    currentAssertion: 'KYC required to withdraw',
    assertionComponents: Object.freeze([
      { componentId: 'identity-verification-exists', description: 'Bybit performs identity verification (KYC) generally.', acceptedScopes: Object.freeze(['identity_verification_general', 'account_wide_general', 'promotion_specific', 'campaign_terms']) },
      { componentId: 'kyc-required-for-this-promo', description: 'KYC is required to participate in / claim this welcome offer.', acceptedScopes: PROMO },
      { componentId: 'kyc-required-to-withdraw-reward', description: 'KYC is required to withdraw this reward specifically.', acceptedScopes: PROMO },
    ]),
    acceptedScopes: Object.freeze(['promotion_specific', 'campaign_terms', 'identity_verification_general', 'account_wide_general']),
    insufficientScopes: Object.freeze(['historical_campaign', 'jurisdiction_specific', 'legal_restrictions', 'reward_mechanics', 'ambiguous']),
    preferredCaptureMethod: 'anonymous_https_probe',
    expectedEvidenceType: 'campaign terms (promo KYC) + identity-verification help article (general KYC)',
    freshnessRule: { requiresCurrent: true, maxAgeDays: 60 },
    contradictionRule: 'Official terms stating no KYC is required for this offer contradict the claim.',
    sourceRule: 'single_sufficient',
  },
  {
    claimId: 'bybit.deposit_required',
    requirement: 'required',
    currentAssertion: 'A deposit is required for this welcome offer (depositRequired = true).',
    assertionComponents: Object.freeze([
      { componentId: 'deposit-task-in-this-promo', description: 'The current welcome offer includes a deposit task/requirement.', acceptedScopes: PROMO },
    ]),
    acceptedScopes: Object.freeze(['promotion_specific', 'campaign_terms']),
    insufficientScopes: Object.freeze(['account_wide_general', 'reward_mechanics', 'identity_verification_general', 'jurisdiction_specific', 'legal_restrictions', 'historical_campaign', 'ambiguous']),
    preferredCaptureMethod: 'anonymous_https_probe_then_ephemeral_render',
    expectedEvidenceType: 'current promotion task list / campaign terms',
    freshnessRule: { requiresCurrent: true, maxAgeDays: 30 },
    contradictionRule: 'Official current terms showing no deposit is required contradict the claim.',
    sourceRule: 'single_sufficient',
  },
  {
    claimId: 'bybit.availability',
    requirement: 'required',
    currentAssertion: 'Global (excluding restricted regions)',
    assertionComponents: Object.freeze([
      { componentId: 'offer-active', description: 'The welcome offer is currently active/available.', acceptedScopes: PROMO },
      { componentId: 'global-with-exclusions', description: 'Availability is global except restricted regions.', acceptedScopes: Object.freeze(['promotion_specific', 'campaign_terms', 'jurisdiction_specific', 'legal_restrictions']) },
    ]),
    acceptedScopes: Object.freeze(['promotion_specific', 'campaign_terms', 'jurisdiction_specific', 'legal_restrictions']),
    insufficientScopes: Object.freeze(['account_wide_general', 'reward_mechanics', 'identity_verification_general', 'historical_campaign', 'ambiguous']),
    preferredCaptureMethod: 'anonymous_https_probe_then_ephemeral_render',
    expectedEvidenceType: 'current promotion availability scope + jurisdiction terms',
    freshnessRule: { requiresCurrent: true, maxAgeDays: 30 },
    contradictionRule: 'Official evidence that the offer is discontinued or region-limited beyond the stated scope contradicts the claim.',
    sourceRule: 'single_sufficient',
  },
  {
    claimId: 'bybit.restricted_countries',
    requirement: 'required',
    currentAssertion: 'Restricted: US, UK, CA, SG, NL',
    assertionComponents: Object.freeze([
      { componentId: 'restricted-list-matches', description: 'The official restricted list matches the CBW list (US, UK, CA, SG, NL) exactly.', acceptedScopes: Object.freeze(['promotion_specific', 'campaign_terms', 'jurisdiction_specific', 'legal_restrictions']) },
    ]),
    acceptedScopes: Object.freeze(['promotion_specific', 'campaign_terms', 'jurisdiction_specific', 'legal_restrictions']),
    insufficientScopes: Object.freeze(['account_wide_general', 'reward_mechanics', 'identity_verification_general', 'historical_campaign', 'ambiguous']),
    preferredCaptureMethod: 'anonymous_https_probe',
    expectedEvidenceType: 'official restricted-jurisdiction / legal terms',
    freshnessRule: { requiresCurrent: true, maxAgeDays: 90 },
    contradictionRule: 'An official list that is a superset, subset or materially different from (US, UK, CA, SG, NL) is not an exact match — partial or contradicted, never supported.',
    sourceRule: 'single_sufficient',
  },
  {
    claimId: 'bybit.reward_type',
    requirement: 'required',
    currentAssertion: 'Reward is issued as vouchers with withdrawal/conversion limitations.',
    assertionComponents: Object.freeze([
      { componentId: 'reward-instrument-form', description: 'The reward instrument form (cash / bonus / coupon / voucher) for this campaign.', acceptedScopes: Object.freeze(['promotion_specific', 'campaign_terms', 'reward_mechanics']) },
      { componentId: 'withdrawal-conversion-limits', description: 'Withdrawal or conversion limitations on the reward.', acceptedScopes: Object.freeze(['promotion_specific', 'campaign_terms', 'reward_mechanics']) },
    ]),
    acceptedScopes: Object.freeze(['promotion_specific', 'campaign_terms', 'reward_mechanics']),
    insufficientScopes: Object.freeze(['account_wide_general', 'identity_verification_general', 'jurisdiction_specific', 'legal_restrictions', 'historical_campaign', 'ambiguous']),
    preferredCaptureMethod: 'anonymous_https_probe',
    expectedEvidenceType: 'campaign reward mechanics / voucher documentation for this campaign',
    freshnessRule: { requiresCurrent: true, maxAgeDays: 60 },
    contradictionRule: 'Official evidence that the reward is withdrawable cash contradicts the voucher claim.',
    sourceRule: 'single_sufficient',
  },
  {
    claimId: 'bybit.terms_summary',
    requirement: 'required',
    currentAssertion: 'New accounts only. KYC required to withdraw. Trading volume conditions apply to higher tiers. Vouchers expire 7–30 days after issuance.',
    assertionComponents: Object.freeze([
      { componentId: 'new-accounts-only', description: 'The offer is for new accounts only.', acceptedScopes: PROMO },
      { componentId: 'kyc-to-withdraw', description: 'KYC is required to withdraw.', acceptedScopes: PROMO },
      { componentId: 'volume-conditions-higher-tiers', description: 'Trading-volume conditions apply to higher tiers.', acceptedScopes: Object.freeze(['promotion_specific', 'campaign_terms', 'reward_mechanics']) },
      { componentId: 'voucher-expiry-window', description: 'Vouchers expire 7–30 days after issuance.', acceptedScopes: Object.freeze(['promotion_specific', 'campaign_terms', 'reward_mechanics']) },
    ]),
    acceptedScopes: Object.freeze(['promotion_specific', 'campaign_terms', 'reward_mechanics']),
    insufficientScopes: Object.freeze(['account_wide_general', 'identity_verification_general', 'jurisdiction_specific', 'legal_restrictions', 'historical_campaign', 'ambiguous']),
    preferredCaptureMethod: 'anonymous_https_probe',
    expectedEvidenceType: 'current campaign terms & conditions',
    freshnessRule: { requiresCurrent: true, maxAgeDays: 30 },
    contradictionRule: 'Any material subclaim contradicted by official terms contradicts the summary.',
    sourceRule: 'multiple_required',
  },
  {
    claimId: 'bybit.fee_discount',
    requirement: 'optional',
    currentAssertion: 'Up to 50% fee discount on select trading pairs',
    assertionComponents: Object.freeze([
      { componentId: 'fee-discount-figure', description: 'The "up to 50%" fee-discount figure for this campaign.', acceptedScopes: PROMO },
    ]),
    acceptedScopes: Object.freeze(['promotion_specific', 'campaign_terms']),
    insufficientScopes: Object.freeze(['account_wide_general', 'reward_mechanics', 'identity_verification_general', 'jurisdiction_specific', 'legal_restrictions', 'historical_campaign', 'ambiguous']),
    preferredCaptureMethod: 'anonymous_https_probe_then_ephemeral_render',
    expectedEvidenceType: 'current promotion fee-discount terms',
    freshnessRule: { requiresCurrent: true, maxAgeDays: 30 },
    contradictionRule: 'A different official fee-discount figure contradicts the claim.',
    sourceRule: 'single_sufficient',
  },
  {
    claimId: 'bybit.min_deposit',
    requirement: 'optional',
    currentAssertion: 'Minimum deposit varies by bonus tier',
    assertionComponents: Object.freeze([
      { componentId: 'min-deposit-tiered', description: 'The minimum deposit varies by bonus tier.', acceptedScopes: PROMO },
    ]),
    acceptedScopes: Object.freeze(['promotion_specific', 'campaign_terms']),
    insufficientScopes: Object.freeze(['account_wide_general', 'reward_mechanics', 'identity_verification_general', 'jurisdiction_specific', 'legal_restrictions', 'historical_campaign', 'ambiguous']),
    preferredCaptureMethod: 'anonymous_https_probe',
    expectedEvidenceType: 'current promotion deposit-tier terms',
    freshnessRule: { requiresCurrent: true, maxAgeDays: 30 },
    contradictionRule: 'A fixed official minimum-deposit figure contradicts the "varies by tier" wording.',
    sourceRule: 'single_sufficient',
  },
  {
    claimId: 'bybit.expiry',
    requirement: 'optional',
    currentAssertion: 'Vouchers expire 7–30 days after issuance',
    assertionComponents: Object.freeze([
      { componentId: 'voucher-expiry-window', description: 'Vouchers expire 7–30 days after issuance.', acceptedScopes: Object.freeze(['promotion_specific', 'campaign_terms', 'reward_mechanics']) },
    ]),
    acceptedScopes: Object.freeze(['promotion_specific', 'campaign_terms', 'reward_mechanics']),
    insufficientScopes: Object.freeze(['account_wide_general', 'identity_verification_general', 'jurisdiction_specific', 'legal_restrictions', 'historical_campaign', 'ambiguous']),
    preferredCaptureMethod: 'anonymous_https_probe',
    expectedEvidenceType: 'current campaign expiry terms',
    freshnessRule: { requiresCurrent: true, maxAgeDays: 30 },
    contradictionRule: 'A different official expiry window contradicts the claim.',
    sourceRule: 'single_sufficient',
  },
]) as ClaimSourcePlanEntry[]);

/** All claim IDs the plan targets, in plan order. */
export const SOURCE_PLAN_TARGET_CLAIMS: readonly string[] = Object.freeze(BYBIT_OFFER_CLAIM_SOURCE_PLAN.map((e) => e.claimId));

export function getSourcePlanEntry(claimId: string): ClaimSourcePlanEntry | undefined {
  return BYBIT_OFFER_CLAIM_SOURCE_PLAN.find((e) => e.claimId === claimId);
}

/* ─────────────────────────── code-owned source candidates ───────────────────── */

export interface OfficialSourceCandidate {
  sourceId: string;
  url: string;
  declaredScope: OfficialSourceScope;
  targetClaimIds: readonly string[];
  title: string;
}

/**
 * The code-owned inventory of OFFICIAL source URLs the capture command may probe. The
 * raw packet never declares its own sources; the command reads this list. Third-party
 * search results may help discover a URL but must never be added here as authorizing
 * evidence — only official Bybit hosts.
 */
export const BYBIT_OFFICIAL_SOURCE_CANDIDATES: readonly OfficialSourceCandidate[] = Object.freeze([
  { sourceId: 'promo-new-user', url: 'https://www.bybit.com/en/promo/new-user/', declaredScope: 'promotion_specific', targetClaimIds: Object.freeze(['bybit.bonus_headline', 'bybit.deposit_required', 'bybit.availability', 'bybit.reward_type', 'bybit.terms_summary', 'bybit.fee_discount', 'bybit.min_deposit', 'bybit.expiry']), title: 'New User Promotion' },
  { sourceId: 'promo-welcome-gifts', url: 'https://www.bybit.com/en/promo/global/welcome-gifts/', declaredScope: 'promotion_specific', targetClaimIds: Object.freeze(['bybit.bonus_headline', 'bybit.availability', 'bybit.reward_type', 'bybit.terms_summary']), title: 'Global Welcome Gifts' },
  { sourceId: 'help-kyc-identity', url: 'https://www.bybit.com/en/help-center/article/How-to-Complete-Identity-Verification-KYC', declaredScope: 'identity_verification_general', targetClaimIds: Object.freeze(['bybit.kyc_required']), title: 'How to Complete Identity Verification (KYC)' },
]);

/* ─────────────────────────── deterministic assessment ───────────────────────── */

export type ClaimAssessmentResult = 'supported' | 'partially_supported' | 'not_found' | 'contradicted' | 'inaccessible';

export interface ComponentAssessment {
  componentId: string;
  proven: boolean;
  sourceId: string | null;
  fragmentId: string | null;
}

export interface ClaimAssessment {
  claimId: string;
  requirement: ClaimRequirement | null;
  result: ClaimAssessmentResult;
  components: ComponentAssessment[];
  /** `source-fragment:<sourceId>/<fragmentId>` refs that support the claim. */
  supportingRefs: string[];
  /** `source-fragment:<sourceId>/<fragmentId>` refs that contradict the claim. */
  contradictingRefs: string[];
  acceptedScopeSourcesReachable: number;
  reason: string;
}

function withinFreshness(capturedAt: string, nowMs: number, maxAgeDays: number): boolean {
  const t = parseExactIsoDateTime(capturedAt);
  if (!t || !Number.isFinite(nowMs)) return false;
  if (t.epochMs > nowMs) return false; // future capture never counts
  return (nowMs - t.epochMs) <= maxAgeDays * 86400000;
}

/**
 * Deterministically assess ONE claim from the committed official-source artifacts.
 * Fail-closed. Throws for a claim outside the plan (unknown claim). Refuses the excluded
 * confirmation/editorial claims.
 */
export function assessOfferClaimEvidence(claimId: string, sources: readonly unknown[], nowMs: number): ClaimAssessment {
  if (SOURCE_PLAN_EXCLUDED_CLAIMS.includes(claimId)) {
    return { claimId, requirement: null, result: 'not_found', components: [], supportingRefs: [], contradictingRefs: [], acceptedScopeSourcesReachable: 0, reason: 'EXCLUDED_FROM_SOURCE_SUPPORT' };
  }
  const entry = getSourcePlanEntry(claimId);
  if (!entry) throw new Error(`UNKNOWN_SOURCE_PLAN_CLAIM: ${claimId}`);

  // Only structurally-valid official sources may participate (tampered → dropped).
  const valid: OfficialSourceCapture[] = [];
  for (const s of sources) {
    const v = validateOfficialSourceCapture(s, BYBIT_OFFER_CLAIM_INVENTORY);
    if (v.ok && v.value) valid.push(v.value);
  }

  const acceptedScope = (scope: OfficialSourceScope) => entry.acceptedScopes.includes(scope) && !entry.insufficientScopes.includes(scope);
  const claimSources = valid.filter((s) => acceptedScope(s.observedScope));
  const reachable = claimSources.filter((s) => ['content', 'not_found', 'spa_shell', 'redirect_only', 'empty'].includes(s.outcome));
  const definitiveOrContent = claimSources.some((s) => s.outcome === 'content' || s.outcome === 'not_found');

  // Content sources that may actually supply fragments (official + content + fresh).
  const contentSources = claimSources.filter((s) => sourceMaySupportClaims(s)
    && (!entry.freshnessRule.requiresCurrent || (s.currency === 'current' && withinFreshness(s.capturedAt, nowMs, entry.freshnessRule.maxAgeDays))));

  // Contradiction: any accepted-scope current content source with a contradicting fragment.
  const contradictingRefs: string[] = [];
  for (const s of contentSources) {
    for (const f of s.fragments) {
      if (f.stance === 'contradicts' && f.claimIds.includes(claimId)) contradictingRefs.push(`source-fragment:${s.sourceId}/${f.fragmentId}`);
    }
  }

  // Component proof: a supporting fragment on a content source whose observedScope is
  // accepted FOR THAT COMPONENT, listing the claim + component id.
  const supportingRefs = new Set<string>();
  const supportingSourceIds = new Set<string>();
  const components: ComponentAssessment[] = entry.assertionComponents.map((comp) => {
    for (const s of contentSources) {
      if (!comp.acceptedScopes.includes(s.observedScope)) continue;
      for (const f of s.fragments) {
        if (f.stance !== 'supports') continue;
        if (!f.claimIds.includes(claimId)) continue;
        if (!f.assertionComponentIds.includes(comp.componentId)) continue;
        supportingRefs.add(`source-fragment:${s.sourceId}/${f.fragmentId}`);
        supportingSourceIds.add(s.sourceId);
        return { componentId: comp.componentId, proven: true, sourceId: s.sourceId, fragmentId: f.fragmentId };
      }
    }
    return { componentId: comp.componentId, proven: false, sourceId: null, fragmentId: null };
  });

  const provenCount = components.filter((c) => c.proven).length;
  const total = components.length;

  let result: ClaimAssessmentResult;
  let reason: string;
  if (contradictingRefs.length > 0) {
    result = 'contradicted';
    reason = 'OFFICIAL_EVIDENCE_CONTRADICTS_CURRENT_ASSERTION';
  } else if (total >= 1 && provenCount === total && (entry.sourceRule === 'single_sufficient' || supportingSourceIds.size >= 2)) {
    result = 'supported';
    reason = 'ALL_MATERIAL_COMPONENTS_PROVEN';
  } else if (provenCount >= 1) {
    result = 'partially_supported';
    reason = entry.sourceRule === 'multiple_required' && supportingSourceIds.size < 2 && provenCount === total
      ? 'MULTI_SOURCE_RULE_UNMET'
      : 'SOME_COMPONENTS_UNPROVEN';
  } else if (definitiveOrContent) {
    result = 'not_found';
    reason = 'ACCEPTED_SCOPE_SOURCE_ACCESSIBLE_BUT_ASSERTION_ABSENT';
  } else {
    result = 'inaccessible';
    reason = reachable.length > 0 ? 'ACCEPTED_SCOPE_SOURCE_NOT_SERVED_TO_ANONYMOUS_CAPTURE' : 'NO_ACCEPTED_SCOPE_SOURCE_OBSERVABLE';
  }

  return {
    claimId,
    requirement: entry.requirement,
    result,
    components,
    supportingRefs: [...supportingRefs].sort(),
    contradictingRefs: contradictingRefs.sort(),
    acceptedScopeSourcesReachable: reachable.length,
    reason,
  };
}

/** Assess every target claim in plan order. */
export function assessAllOfferClaims(sources: readonly unknown[], nowMs: number): ClaimAssessment[] {
  return BYBIT_OFFER_CLAIM_SOURCE_PLAN.map((e) => assessOfferClaimEvidence(e.claimId, sources, nowMs));
}

/* ─────────────────────────── plan self-validation ───────────────────────────── */

export interface PlanCoverageIssue { field: string; code: string; message: string; }

/**
 * Validate the plan is internally coherent: every required non-promo claim covered
 * exactly once, promo/editorial excluded, components non-empty with disjoint accepted/
 * insufficient scopes, and every candidate targets known plan claims + official URL.
 */
export function validateSourcePlanCoverage(): { ok: boolean; issues: PlanCoverageIssue[] } {
  const issues: PlanCoverageIssue[] = [];
  const seen = new Set<string>();
  const requiredNonPromo = BYBIT_OFFER_REQUIRED_CLAIMS.filter((c) => c !== 'bybit.promo_code' && c !== 'bybit.source_identity');

  for (const e of BYBIT_OFFER_CLAIM_SOURCE_PLAN) {
    if (!BYBIT_OFFER_CLAIM_INVENTORY.includes(e.claimId as (typeof BYBIT_OFFER_CLAIM_INVENTORY)[number])) issues.push({ field: e.claimId, code: 'UNKNOWN_CLAIM', message: 'Plan claim is not in the code-owned inventory.' });
    if (SOURCE_PLAN_EXCLUDED_CLAIMS.includes(e.claimId)) issues.push({ field: e.claimId, code: 'EXCLUDED_CLAIM_IN_PLAN', message: 'Excluded (promo/editorial) claim must not be in the source plan.' });
    if (seen.has(e.claimId)) issues.push({ field: e.claimId, code: 'DUPLICATE_CLAIM', message: 'Plan claim appears more than once.' });
    seen.add(e.claimId);
    if (e.assertionComponents.length === 0) issues.push({ field: e.claimId, code: 'NO_COMPONENTS', message: 'Every plan entry needs at least one material component.' });
    const compIds = new Set<string>();
    for (const c of e.assertionComponents) {
      if (compIds.has(c.componentId)) issues.push({ field: `${e.claimId}.${c.componentId}`, code: 'DUPLICATE_COMPONENT', message: 'Duplicate component id.' });
      compIds.add(c.componentId);
      if (c.acceptedScopes.length === 0) issues.push({ field: `${e.claimId}.${c.componentId}`, code: 'COMPONENT_NO_SCOPES', message: 'Component needs at least one accepted scope.' });
      if (c.acceptedScopes.some((s) => !e.acceptedScopes.includes(s))) issues.push({ field: `${e.claimId}.${c.componentId}`, code: 'COMPONENT_SCOPE_OUTSIDE_ENTRY', message: 'Component scope must be within the entry accepted scopes.' });
    }
    if (e.acceptedScopes.some((s) => e.insufficientScopes.includes(s))) issues.push({ field: e.claimId, code: 'SCOPE_OVERLAP', message: 'accepted and insufficient scopes must be disjoint.' });
  }

  for (const c of requiredNonPromo) {
    if (!seen.has(c)) issues.push({ field: c, code: 'REQUIRED_CLAIM_UNCOVERED', message: `Required non-promo claim ${c} is not covered by the plan.` });
  }

  for (const cand of BYBIT_OFFICIAL_SOURCE_CANDIDATES) {
    if (!/^https:\/\/(?:www\.|announcements\.|learn\.)?bybit\.com\//i.test(cand.url)) issues.push({ field: cand.sourceId, code: 'NON_OFFICIAL_CANDIDATE', message: 'Candidate URL must be an official Bybit host.' });
    for (const t of cand.targetClaimIds) {
      if (!seen.has(t)) issues.push({ field: `${cand.sourceId}.${t}`, code: 'CANDIDATE_UNKNOWN_CLAIM', message: 'Candidate targets a claim outside the plan.' });
    }
  }

  return { ok: issues.length === 0, issues };
}
