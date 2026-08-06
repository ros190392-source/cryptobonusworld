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
import { createHash } from 'node:crypto';
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

const sha256 = (s: string): string => 'sha256:' + createHash('sha256').update(s, 'utf8').digest('hex');

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

export type CaptureMethodPreference = 'http_only' | 'http_then_rendered';

export interface OfficialSourceCandidate {
  candidateId: string;
  url: string;
  declaredScope: OfficialSourceScope;
  targetClaimIds: readonly string[];
  title: string;
  /** Whether the runner may fall back to an ephemeral render (R6). */
  captureMethod: CaptureMethodPreference;
  /** Optional alias of another candidate URL (declared duplicate). */
  aliasOf?: string;
  candidateDigest: string;
}

function candidateCore(c: Omit<OfficialSourceCandidate, 'candidateDigest'>): string {
  return JSON.stringify({ candidateId: c.candidateId, url: c.url, declaredScope: c.declaredScope, targetClaimIds: [...c.targetClaimIds].sort(), captureMethod: c.captureMethod, aliasOf: c.aliasOf ?? null });
}
export function computeCandidateDigest(c: Omit<OfficialSourceCandidate, 'candidateDigest'>): string { return sha256(candidateCore(c)); }
const withDigest = (c: Omit<OfficialSourceCandidate, 'candidateDigest'>): OfficialSourceCandidate => ({ ...c, candidateDigest: computeCandidateDigest(c) });

/**
 * The code-owned inventory of OFFICIAL source URLs the capture command may probe. The
 * raw packet never declares its own sources; the command reads this list. Third-party
 * search results may help discover a URL but must never be added here as authorizing
 * evidence — only official Bybit hosts. Every URL below was confirmed to resolve on an
 * official Bybit host by anonymous probe.
 */
export const BYBIT_OFFICIAL_SOURCE_CANDIDATES: readonly OfficialSourceCandidate[] = Object.freeze([
  withDigest({ candidateId: 'promo-new-user', url: 'https://www.bybit.com/en/promo/new-user/', declaredScope: 'promotion_specific', captureMethod: 'http_then_rendered', targetClaimIds: Object.freeze(['bybit.bonus_headline', 'bybit.kyc_required', 'bybit.deposit_required', 'bybit.availability', 'bybit.reward_type', 'bybit.terms_summary', 'bybit.fee_discount', 'bybit.min_deposit', 'bybit.expiry']), title: 'New User Promotion' }),
  withDigest({ candidateId: 'promo-welcome-gifts', url: 'https://www.bybit.com/en/promo/global/welcome-gifts/', declaredScope: 'promotion_specific', captureMethod: 'http_then_rendered', targetClaimIds: Object.freeze(['bybit.bonus_headline', 'bybit.kyc_required', 'bybit.availability', 'bybit.reward_type', 'bybit.terms_summary']), title: 'Global Welcome Gifts' }),
  withDigest({ candidateId: 'help-kyc-identity', url: 'https://www.bybit.com/en/help-center/article/How-to-Complete-Identity-Verification-KYC', declaredScope: 'identity_verification_general', captureMethod: 'http_then_rendered', targetClaimIds: Object.freeze(['bybit.kyc_required']), title: 'How to Complete Identity Verification (KYC)' }),
  withDigest({ candidateId: 'help-restricted-jurisdictions', url: 'https://www.bybit.com/en/help-center/article/Restricted-Jurisdictions', declaredScope: 'legal_restrictions', captureMethod: 'http_then_rendered', targetClaimIds: Object.freeze(['bybit.restricted_countries', 'bybit.availability']), title: 'Restricted Jurisdictions' }),
  withDigest({ candidateId: 'help-restricted-countries', url: 'https://www.bybit.com/en/help-center/article/Bybit-Restricted-Countries-and-Regions', declaredScope: 'jurisdiction_specific', captureMethod: 'http_then_rendered', targetClaimIds: Object.freeze(['bybit.restricted_countries', 'bybit.availability']), title: 'Bybit Restricted Countries and Regions' }),
  withDigest({ candidateId: 'legal-platform-terms', url: 'https://www.bybit.com/en/legal/terms-of-service/Bybit-Platform-Terms-and-Conditions', declaredScope: 'legal_restrictions', captureMethod: 'http_then_rendered', targetClaimIds: Object.freeze(['bybit.restricted_countries', 'bybit.availability']), title: 'Bybit Platform Terms and Conditions' }),
  withDigest({ candidateId: 'help-what-is-bonus', url: 'https://www.bybit.com/en/help-center/article/What-is-Bonus', declaredScope: 'reward_mechanics', captureMethod: 'http_then_rendered', targetClaimIds: Object.freeze(['bybit.reward_type', 'bybit.terms_summary', 'bybit.expiry']), title: 'What is Bonus' }),
  withDigest({ candidateId: 'help-use-bonus', url: 'https://www.bybit.com/en/help-center/article/How-to-Use-Bonus', declaredScope: 'reward_mechanics', captureMethod: 'http_then_rendered', targetClaimIds: Object.freeze(['bybit.reward_type', 'bybit.expiry']), title: 'How to Use Bonus' }),
]);

/**
 * Explicit discovery blockers (R1): a material component for which no official candidate
 * could be located. Empty here — every component is covered by at least one candidate
 * whose DECLARED scope intersects it (observed content may still be unavailable to an
 * anonymous capture, which the evidence-run manifest records honestly).
 */
export interface DiscoveryBlocker { claimId: string; componentId: string; reason: string; }
export const BYBIT_SOURCE_DISCOVERY_BLOCKERS: readonly DiscoveryBlocker[] = Object.freeze([]);

/* ─────────────────────────── plan + candidate identity/digests (R2) ──────────── */

export const BYBIT_SOURCE_PLAN_ID = 'cbw:bybit:offer-claim-source-plan:v1';

function planCore(): string {
  return JSON.stringify({
    planId: BYBIT_SOURCE_PLAN_ID,
    entries: BYBIT_OFFER_CLAIM_SOURCE_PLAN.map((e) => ({
      claimId: e.claimId, requirement: e.requirement, currentAssertion: e.currentAssertion,
      components: e.assertionComponents.map((c) => ({ componentId: c.componentId, description: c.description, acceptedScopes: [...c.acceptedScopes].sort() })),
      acceptedScopes: [...e.acceptedScopes].sort(), insufficientScopes: [...e.insufficientScopes].sort(),
      preferredCaptureMethod: e.preferredCaptureMethod, expectedEvidenceType: e.expectedEvidenceType,
      freshnessRule: e.freshnessRule, contradictionRule: e.contradictionRule, sourceRule: e.sourceRule,
    })),
    candidates: [...BYBIT_OFFICIAL_SOURCE_CANDIDATES].map((c) => c.candidateDigest).sort(),
    discoveryBlockers: BYBIT_SOURCE_DISCOVERY_BLOCKERS.map((b) => `${b.claimId}/${b.componentId}`).sort(),
  });
}
/** Digest over the complete plan + candidate set. Changing either invalidates it (R2). */
export const BYBIT_SOURCE_PLAN_DIGEST = sha256(planCore());

export function getCandidate(candidateId: string): OfficialSourceCandidate | undefined {
  return BYBIT_OFFICIAL_SOURCE_CANDIDATES.find((c) => c.candidateId === candidateId);
}

/* ─────────────────────────── deterministic assessment ───────────────────────── */

export type ClaimAssessmentResult = 'supported' | 'partially_supported' | 'not_found' | 'contradicted' | 'inaccessible' | 'incomplete' | 'invalid';

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

/* ─────────────────────────── code-owned extraction plan (R3) ─────────────────── */

export type ExtractionType = 'visible_text' | 'meta' | 'json_ld' | 'http_header_note';

export interface ExtractionStrategy {
  claimId: string;
  assertionComponentId: string;
  /** The source class (scope) this strategy is intended to read from. */
  sourceClass: OfficialSourceScope;
  extractionType: ExtractionType;
  /** Narrow selector / semantic locator / metadata path. */
  locator: string;
  /** Bounded regex source string, or null for a structured/manual strategy. */
  pattern: string | null;
  positiveConditions: readonly string[];
  negativeConditions: readonly string[];
  limitation: string;
  /** True when a match still requires bounded human review before it can support. */
  manualReviewRequired: boolean;
}

/** A code-owned extraction strategy for EVERY material component of every plan claim. */
export const BYBIT_OFFER_EXTRACTION_PLAN: readonly ExtractionStrategy[] = Object.freeze([
  { claimId: 'bybit.bonus_headline', assertionComponentId: 'max-reward-figure', sourceClass: 'promotion_specific', extractionType: 'visible_text', locator: 'h1, [class*="reward"], [data-testid*="reward"]', pattern: '\\bup to\\s*[\\d,]+\\s*USDT\\b', positiveConditions: ['figure matches the current CBW maximum'], negativeConditions: ['a different maximum figure'], limitation: 'Figure is region/tier-dependent; exact CBW wording needs review.', manualReviewRequired: false },
  { claimId: 'bybit.bonus_headline', assertionComponentId: 'reward-is-welcome-package', sourceClass: 'promotion_specific', extractionType: 'visible_text', locator: 'h1, h2', pattern: '\\bwelcome (?:package|bonus|gifts?)\\b', positiveConditions: ['names the current welcome package'], negativeConditions: ['a historical/other campaign'], limitation: 'Campaign identity needs human confirmation.', manualReviewRequired: true },
  { claimId: 'bybit.kyc_required', assertionComponentId: 'identity-verification-exists', sourceClass: 'identity_verification_general', extractionType: 'visible_text', locator: 'main, article', pattern: '\\b(identity verification|kyc)\\b', positiveConditions: ['describes general identity verification'], negativeConditions: [], limitation: 'General KYC only; proves nothing promo-specific.', manualReviewRequired: false },
  { claimId: 'bybit.kyc_required', assertionComponentId: 'kyc-required-for-this-promo', sourceClass: 'campaign_terms', extractionType: 'visible_text', locator: '[class*="terms"], [class*="rule"]', pattern: '\\bkyc\\b|\\bidentity verification\\b', positiveConditions: ['campaign terms require KYC to participate'], negativeConditions: ['no-KYC statement'], limitation: 'Promo KYC requirement needs campaign terms + review.', manualReviewRequired: true },
  { claimId: 'bybit.kyc_required', assertionComponentId: 'kyc-required-to-withdraw-reward', sourceClass: 'campaign_terms', extractionType: 'visible_text', locator: '[class*="terms"], [class*="rule"]', pattern: '(kyc|identity verification)[^.]{0,80}withdraw|withdraw[^.]{0,80}(kyc|identity verification)', positiveConditions: ['KYC required to withdraw the reward'], negativeConditions: [], limitation: 'Withdrawal-KYC wording needs campaign terms + review.', manualReviewRequired: true },
  { claimId: 'bybit.deposit_required', assertionComponentId: 'deposit-task-in-this-promo', sourceClass: 'promotion_specific', extractionType: 'visible_text', locator: '[class*="task"], [class*="deposit"]', pattern: '\\bdeposit\\b', positiveConditions: ['a deposit task in the current campaign'], negativeConditions: ['no deposit required'], limitation: 'Deposit requirement is promo-specific; needs review.', manualReviewRequired: true },
  { claimId: 'bybit.availability', assertionComponentId: 'offer-active', sourceClass: 'promotion_specific', extractionType: 'visible_text', locator: 'main', pattern: null, positiveConditions: ['the campaign page renders active offer content'], negativeConditions: ['ended/expired banner'], limitation: 'Active availability needs live campaign content + review.', manualReviewRequired: true },
  { claimId: 'bybit.availability', assertionComponentId: 'global-with-exclusions', sourceClass: 'legal_restrictions', extractionType: 'visible_text', locator: 'main, article', pattern: '\\b(global|excluding|restricted region)\\b', positiveConditions: ['global except restricted regions'], negativeConditions: ['region-limited beyond stated scope'], limitation: 'Availability scope needs jurisdiction/legal content + review.', manualReviewRequired: true },
  { claimId: 'bybit.restricted_countries', assertionComponentId: 'restricted-list-matches', sourceClass: 'legal_restrictions', extractionType: 'visible_text', locator: 'main, article, table', pattern: '\\b(United States|United Kingdom|Canada|Singapore|Netherlands)\\b', positiveConditions: ['official list equals US, UK, CA, SG, NL exactly'], negativeConditions: ['superset/subset/different list'], limitation: 'Exact list match needs the full official list + review.', manualReviewRequired: true },
  { claimId: 'bybit.reward_type', assertionComponentId: 'reward-instrument-form', sourceClass: 'reward_mechanics', extractionType: 'visible_text', locator: 'main, article', pattern: '\\b(voucher|coupon|bonus|cash)\\b', positiveConditions: ['reward instrument named'], negativeConditions: [], limitation: 'Reward form needs reward-mechanics content + review.', manualReviewRequired: true },
  { claimId: 'bybit.reward_type', assertionComponentId: 'withdrawal-conversion-limits', sourceClass: 'reward_mechanics', extractionType: 'visible_text', locator: 'main, article', pattern: 'withdraw|convert|redeem', positiveConditions: ['withdrawal/conversion limits described'], negativeConditions: ['freely withdrawable cash'], limitation: 'Withdrawal limits need reward-mechanics content + review.', manualReviewRequired: true },
  { claimId: 'bybit.terms_summary', assertionComponentId: 'new-accounts-only', sourceClass: 'promotion_specific', extractionType: 'visible_text', locator: '[class*="terms"]', pattern: '\\bnew (?:user|account)s?\\b', positiveConditions: ['new accounts only'], negativeConditions: [], limitation: 'Needs campaign terms + review.', manualReviewRequired: true },
  { claimId: 'bybit.terms_summary', assertionComponentId: 'kyc-to-withdraw', sourceClass: 'promotion_specific', extractionType: 'visible_text', locator: '[class*="terms"]', pattern: '(kyc|identity verification)[^.]{0,80}withdraw', positiveConditions: ['KYC to withdraw'], negativeConditions: [], limitation: 'Needs campaign terms + review.', manualReviewRequired: true },
  { claimId: 'bybit.terms_summary', assertionComponentId: 'volume-conditions-higher-tiers', sourceClass: 'reward_mechanics', extractionType: 'visible_text', locator: '[class*="terms"], main', pattern: 'trading volume|higher tier', positiveConditions: ['volume conditions for higher tiers'], negativeConditions: [], limitation: 'Needs reward-mechanics content + review.', manualReviewRequired: true },
  { claimId: 'bybit.terms_summary', assertionComponentId: 'voucher-expiry-window', sourceClass: 'reward_mechanics', extractionType: 'visible_text', locator: '[class*="terms"], main', pattern: 'expire[sd]?\\b|expiry', positiveConditions: ['7–30 day expiry window'], negativeConditions: ['different window'], limitation: 'Needs reward-mechanics content + review.', manualReviewRequired: true },
  { claimId: 'bybit.fee_discount', assertionComponentId: 'fee-discount-figure', sourceClass: 'promotion_specific', extractionType: 'visible_text', locator: '[class*="fee"]', pattern: '\\b\\d{1,3}%[^.]{0,40}(?:fee|trading fee)\\b', positiveConditions: ['up to 50% fee discount'], negativeConditions: ['different figure'], limitation: 'Promo-specific; needs review.', manualReviewRequired: false },
  { claimId: 'bybit.min_deposit', assertionComponentId: 'min-deposit-tiered', sourceClass: 'promotion_specific', extractionType: 'visible_text', locator: '[class*="deposit"]', pattern: 'minimum deposit', positiveConditions: ['varies by tier'], negativeConditions: ['fixed minimum'], limitation: 'Needs campaign terms + review.', manualReviewRequired: true },
  { claimId: 'bybit.expiry', assertionComponentId: 'voucher-expiry-window', sourceClass: 'reward_mechanics', extractionType: 'visible_text', locator: 'main, article', pattern: 'expire[sd]?\\b|expiry', positiveConditions: ['7–30 day expiry window'], negativeConditions: ['different window'], limitation: 'Needs reward-mechanics content + review.', manualReviewRequired: false },
]);

/** Validate every source-plan component has at least one extraction strategy (R3). */
export function validateExtractionCoverage(): { ok: boolean; issues: PlanCoverageIssue[] } {
  const issues: PlanCoverageIssue[] = [];
  const strategyKeys = new Set(BYBIT_OFFER_EXTRACTION_PLAN.map((s) => `${s.claimId}/${s.assertionComponentId}`));
  for (const e of BYBIT_OFFER_CLAIM_SOURCE_PLAN) {
    for (const c of e.assertionComponents) {
      if (!strategyKeys.has(`${e.claimId}/${c.componentId}`)) issues.push({ field: `${e.claimId}.${c.componentId}`, code: 'NO_EXTRACTION_STRATEGY', message: 'Component has no code-owned extraction strategy.' });
    }
  }
  for (const s of BYBIT_OFFER_EXTRACTION_PLAN) {
    const entry = getSourcePlanEntry(s.claimId);
    if (!entry) { issues.push({ field: s.claimId, code: 'STRATEGY_UNKNOWN_CLAIM', message: 'Extraction strategy for a claim outside the plan.' }); continue; }
    if (!entry.assertionComponents.some((c) => c.componentId === s.assertionComponentId)) issues.push({ field: `${s.claimId}.${s.assertionComponentId}`, code: 'STRATEGY_UNKNOWN_COMPONENT', message: 'Extraction strategy for an unknown component.' });
  }
  return { ok: issues.length === 0, issues };
}

/* ─────────────────────────── evidence-run manifest (R7/R8/R10) ───────────────── */

export interface EvidenceRunIssue { field: string; code: string; message: string; }

export interface OfficialSourceEvidenceRun {
  ok: boolean;
  runId: string;
  planId: string;
  planDigest: string;
  windowStartMs: number;
  windowEndMs: number;
  expectedCandidateIds: string[];
  attemptedCandidateIds: string[];
  missingCandidateIds: string[];
  failedCandidateIds: string[];
  captureIds: string[];
  captureDigests: string[];
  runDigest: string;
  issues: EvidenceRunIssue[];
  limitations: string[];
  /** Validated, candidate-bound captures (empty when the run is invalid). */
  sources: OfficialSourceCapture[];
}

/** Canonical document identity for independence (R10): same doc ≠ two sources. */
export function documentIdentity(s: OfficialSourceCapture): string {
  return `${s.finalUrl ?? s.requestedUrl}|${s.bodyDigest}`;
}

/**
 * Build + validate a complete evidence run from raw source artifacts (R7/R8). Fail-closed:
 * ANY structurally-invalid, digest-invalid, candidate-mismatched, plan-mismatched,
 * duplicated, unknown or unsafe artifact makes the whole run invalid (never silently
 * dropped). `runId` should be deterministic for reproducible digests.
 */
export function buildOfficialSourceEvidenceRun(sources: readonly unknown[], nowMs: number, runId = 'run'): OfficialSourceEvidenceRun {
  const issues: EvidenceRunIssue[] = [];
  const valid: OfficialSourceCapture[] = [];
  const seenSourceIds = new Set<string>();
  const attempted = new Set<string>();
  let minMs = Number.POSITIVE_INFINITY, maxMs = Number.NEGATIVE_INFINITY;

  sources.forEach((s, i) => {
    const v = validateOfficialSourceCapture(s, BYBIT_OFFER_CLAIM_INVENTORY);
    if (!v.ok || !v.value) { issues.push({ field: `sources.${i}`, code: 'INVALID_ARTIFACT', message: `Source failed contract validation: ${v.issues.map((x) => x.code).join(',')}` }); return; }
    const cap = v.value;
    if (seenSourceIds.has(cap.sourceId)) issues.push({ field: `sources.${i}`, code: 'DUPLICATE_SOURCE_ID', message: `Duplicate sourceId ${cap.sourceId}.` });
    seenSourceIds.add(cap.sourceId);
    const cand = getCandidate(cap.candidateId);
    if (!cand) { issues.push({ field: `sources.${i}`, code: 'UNKNOWN_CANDIDATE', message: `Source binds to unknown candidate ${cap.candidateId}.` }); return; }
    if (cap.requestedUrl !== cand.url) issues.push({ field: `sources.${i}`, code: 'CANDIDATE_URL_MISMATCH', message: 'requestedUrl must equal the bound candidate URL.' });
    if (cap.declaredScope !== cand.declaredScope) issues.push({ field: `sources.${i}`, code: 'CANDIDATE_SCOPE_MISMATCH', message: 'declaredScope must equal the bound candidate scope.' });
    if (cap.planId !== BYBIT_SOURCE_PLAN_ID) issues.push({ field: `sources.${i}`, code: 'PLAN_ID_MISMATCH', message: 'planId must equal the code-owned source plan id.' });
    if (cap.planDigest !== BYBIT_SOURCE_PLAN_DIGEST) issues.push({ field: `sources.${i}`, code: 'PLAN_DIGEST_MISMATCH', message: 'planDigest must equal the code-owned source plan digest.' });
    attempted.add(cap.candidateId);
    const t = parseExactIsoDateTime(cap.capturedAt);
    if (t) { minMs = Math.min(minMs, t.epochMs); maxMs = Math.max(maxMs, t.epochMs); }
    valid.push(cap);
  });

  const expected = BYBIT_OFFICIAL_SOURCE_CANDIDATES.map((c) => c.candidateId);
  const attemptedIds = [...attempted].sort();
  const missing = expected.filter((id) => !attempted.has(id));
  const failed = valid.filter((s) => !['content'].includes(s.outcome)).map((s) => s.candidateId);
  const ok = issues.length === 0;
  const captureIds = valid.map((s) => s.sourceId).sort();
  const captureDigests = valid.map((s) => s.sourceDigest).sort();

  const runDigest = sha256(JSON.stringify({
    runId, planId: BYBIT_SOURCE_PLAN_ID, planDigest: BYBIT_SOURCE_PLAN_DIGEST,
    expected: [...expected].sort(), attempted: attemptedIds, missing: [...missing].sort(),
    captureDigests, ok,
  }));

  return {
    ok, runId, planId: BYBIT_SOURCE_PLAN_ID, planDigest: BYBIT_SOURCE_PLAN_DIGEST,
    windowStartMs: Number.isFinite(minMs) ? minMs : nowMs, windowEndMs: Number.isFinite(maxMs) ? maxMs : nowMs,
    expectedCandidateIds: [...expected].sort(), attemptedCandidateIds: attemptedIds,
    missingCandidateIds: [...missing].sort(), failedCandidateIds: [...new Set(failed)].sort(),
    captureIds, captureDigests, runDigest, issues,
    limitations: ok ? [] : ['Evidence run is invalid; no claim may be authorized from it.'],
    sources: ok ? valid : [],
  };
}

function withinFreshness2(capturedAt: string, nowMs: number, maxAgeDays: number): boolean {
  return withinFreshness(capturedAt, nowMs, maxAgeDays);
}

/**
 * Deterministically assess ONE claim from an evidence run (or a raw source array, which
 * is built into a run internally). Fail-closed:
 *   * an INVALID run → `invalid` (never silently drops a damaged/tampered artifact, R8);
 *   * excluded promo/editorial claims are refused;
 *   * `supported` requires every material component proven by a `supports` fragment on an
 *     official, current, accepted-scope `content` source, no contradiction, and — for a
 *     `multiple_required` claim — INDEPENDENT documents (R10);
 *   * a mandatory candidate for the claim not attempted → `incomplete` (R7), unless a
 *     single-source sufficiency already proved the claim.
 * Throws for a claim outside the plan (unknown claim).
 */
export function assessOfferClaimEvidence(claimId: string, sourcesOrRun: readonly unknown[] | OfficialSourceEvidenceRun, nowMs: number): ClaimAssessment {
  if (SOURCE_PLAN_EXCLUDED_CLAIMS.includes(claimId)) {
    return { claimId, requirement: null, result: 'not_found', components: [], supportingRefs: [], contradictingRefs: [], acceptedScopeSourcesReachable: 0, reason: 'EXCLUDED_FROM_SOURCE_SUPPORT' };
  }
  const entry = getSourcePlanEntry(claimId);
  if (!entry) throw new Error(`UNKNOWN_SOURCE_PLAN_CLAIM: ${claimId}`);

  const run: OfficialSourceEvidenceRun = Array.isArray(sourcesOrRun)
    ? buildOfficialSourceEvidenceRun(sourcesOrRun as readonly unknown[], nowMs)
    : (sourcesOrRun as OfficialSourceEvidenceRun);

  if (!run.ok) {
    return { claimId, requirement: entry.requirement, result: 'invalid', components: entry.assertionComponents.map((c) => ({ componentId: c.componentId, proven: false, sourceId: null, fragmentId: null })), supportingRefs: [], contradictingRefs: [], acceptedScopeSourcesReachable: 0, reason: 'EVIDENCE_RUN_INVALID' };
  }
  const valid = run.sources;

  const acceptedScope = (scope: OfficialSourceScope) => entry.acceptedScopes.includes(scope) && !entry.insufficientScopes.includes(scope);
  const claimSources = valid.filter((s) => acceptedScope(s.observedScope));
  const reachable = claimSources.filter((s) => ['content', 'not_found', 'spa_shell', 'redirect_only', 'empty'].includes(s.outcome));
  const definitiveOrContent = claimSources.some((s) => s.outcome === 'content' || s.outcome === 'not_found');

  const contentSources = claimSources.filter((s) => sourceMaySupportClaims(s)
    && (!entry.freshnessRule.requiresCurrent || (s.currency === 'current' && withinFreshness2(s.capturedAt, nowMs, entry.freshnessRule.maxAgeDays))));

  const contradictingRefs: string[] = [];
  for (const s of contentSources) {
    for (const f of s.fragments) {
      if (f.stance === 'contradicts' && f.claimIds.includes(claimId)) contradictingRefs.push(`source-fragment:${s.sourceId}/${f.fragmentId}`);
    }
  }

  const supportingRefs = new Set<string>();
  const supportingDocs = new Set<string>();
  const components: ComponentAssessment[] = entry.assertionComponents.map((comp) => {
    for (const s of contentSources) {
      if (!comp.acceptedScopes.includes(s.observedScope)) continue;
      for (const f of s.fragments) {
        if (f.stance !== 'supports') continue;
        if (!f.claimIds.includes(claimId)) continue;
        if (!f.assertionComponentIds.includes(comp.componentId)) continue;
        supportingRefs.add(`source-fragment:${s.sourceId}/${f.fragmentId}`);
        supportingDocs.add(documentIdentity(s)); // R10 independence
        return { componentId: comp.componentId, proven: true, sourceId: s.sourceId, fragmentId: f.fragmentId };
      }
    }
    return { componentId: comp.componentId, proven: false, sourceId: null, fragmentId: null };
  });

  const provenCount = components.filter((c) => c.proven).length;
  const total = components.length;

  // R7 completeness: mandatory candidates for this claim that were not attempted.
  const mandatory = BYBIT_OFFICIAL_SOURCE_CANDIDATES.filter((c) => c.targetClaimIds.includes(claimId)).map((c) => c.candidateId);
  const attemptedMandatory = mandatory.filter((id) => run.attemptedCandidateIds.includes(id));
  const incompleteRun = mandatory.length > 0 && attemptedMandatory.length < mandatory.length;

  let result: ClaimAssessmentResult;
  let reason: string;
  const independentEnough = entry.sourceRule === 'single_sufficient' || supportingDocs.size >= 2;
  if (contradictingRefs.length > 0) {
    result = 'contradicted';
    reason = 'OFFICIAL_EVIDENCE_CONTRADICTS_CURRENT_ASSERTION';
  } else if (total >= 1 && provenCount === total && independentEnough) {
    result = 'supported';
    reason = 'ALL_MATERIAL_COMPONENTS_PROVEN';
  } else if (provenCount >= 1) {
    result = 'partially_supported';
    reason = entry.sourceRule === 'multiple_required' && supportingDocs.size < 2 && provenCount === total ? 'MULTI_SOURCE_RULE_UNMET' : 'SOME_COMPONENTS_UNPROVEN';
  } else if (incompleteRun) {
    result = 'incomplete';
    reason = 'MANDATORY_CANDIDATE_NOT_ATTEMPTED';
  } else if (definitiveOrContent) {
    result = 'not_found';
    reason = 'ACCEPTED_SCOPE_SOURCE_ACCESSIBLE_BUT_ASSERTION_ABSENT';
  } else {
    result = 'inaccessible';
    reason = reachable.length > 0 ? 'ACCEPTED_SCOPE_SOURCE_NOT_SERVED_TO_ANONYMOUS_CAPTURE' : 'NO_ACCEPTED_SCOPE_SOURCE_OBSERVABLE';
  }

  return {
    claimId, requirement: entry.requirement, result, components,
    supportingRefs: [...supportingRefs].sort(), contradictingRefs: contradictingRefs.sort(),
    acceptedScopeSourcesReachable: reachable.length, reason,
  };
}

/** Assess every target claim against ONE shared evidence run (built once). */
export function assessAllOfferClaims(sources: readonly unknown[], nowMs: number): ClaimAssessment[] {
  const run = buildOfficialSourceEvidenceRun(sources, nowMs);
  return BYBIT_OFFER_CLAIM_SOURCE_PLAN.map((e) => assessOfferClaimEvidence(e.claimId, run, nowMs));
}

/* ─────────────────────────── plan self-validation (R1) ───────────────────────── */

export interface PlanCoverageIssue { field: string; code: string; message: string; }

const LEGAL_SCOPES: readonly OfficialSourceScope[] = Object.freeze(['legal_restrictions', 'jurisdiction_specific']);
const PROMO_SCOPES: readonly OfficialSourceScope[] = Object.freeze(['promotion_specific', 'campaign_terms']);

/**
 * Validate plan + candidate coverage is COMPLETE and coherent (R1). Fails unless every
 * target claim has a candidate, every material component has a candidate whose declared
 * scope intersects it (or an explicit discovery blocker), multi-source claims have enough
 * independent candidates, candidate ids/urls are unique (aliases excepted), promo/editorial
 * stay excluded, legal claims have legal/jurisdiction candidates and KYC has both general
 * and promotion-specific coverage.
 */
export function validateSourcePlanCoverage(): { ok: boolean; issues: PlanCoverageIssue[] } {
  const issues: PlanCoverageIssue[] = [];
  const seen = new Set<string>();
  const requiredNonPromo = BYBIT_OFFER_REQUIRED_CLAIMS.filter((c) => c !== 'bybit.promo_code' && c !== 'bybit.source_identity');
  const blocked = new Set(BYBIT_SOURCE_DISCOVERY_BLOCKERS.map((b) => `${b.claimId}/${b.componentId}`));

  // Candidate integrity: unique ids, unique urls (aliases excepted), digests recompute.
  const candIds = new Set<string>();
  const candUrls = new Map<string, string>();
  for (const cand of BYBIT_OFFICIAL_SOURCE_CANDIDATES) {
    if (candIds.has(cand.candidateId)) issues.push({ field: cand.candidateId, code: 'DUPLICATE_CANDIDATE_ID', message: 'candidateId must be unique.' });
    candIds.add(cand.candidateId);
    if (!/^https:\/\/(?:www\.|announcements\.|learn\.)?bybit\.com\//i.test(cand.url)) issues.push({ field: cand.candidateId, code: 'NON_OFFICIAL_CANDIDATE', message: 'Candidate URL must be an official Bybit host.' });
    if (candUrls.has(cand.url) && !cand.aliasOf) issues.push({ field: cand.candidateId, code: 'DUPLICATE_CANDIDATE_URL', message: 'Candidate URL must be unique unless an explicit alias is declared.' });
    candUrls.set(cand.url, cand.candidateId);
    if (cand.targetClaimIds.length === 0) issues.push({ field: cand.candidateId, code: 'CANDIDATE_NO_CLAIMS', message: 'Every candidate must target at least one claim.' });
    if (computeCandidateDigest(cand) !== cand.candidateDigest) issues.push({ field: cand.candidateId, code: 'CANDIDATE_DIGEST_MISMATCH', message: 'candidateDigest must recompute.' });
  }

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
      // R1.2 — every component needs a candidate whose declared scope intersects it, or a blocker.
      const covered = BYBIT_OFFICIAL_SOURCE_CANDIDATES.some((cand) => cand.targetClaimIds.includes(e.claimId) && c.acceptedScopes.includes(cand.declaredScope));
      if (!covered && !blocked.has(`${e.claimId}/${c.componentId}`)) issues.push({ field: `${e.claimId}.${c.componentId}`, code: 'COMPONENT_UNCOVERED', message: 'No candidate declared-scope intersects this component and no discovery blocker declared.' });
    }
    if (e.acceptedScopes.some((s) => e.insufficientScopes.includes(s))) issues.push({ field: e.claimId, code: 'SCOPE_OVERLAP', message: 'accepted and insufficient scopes must be disjoint.' });
    // R1.1 — every target claim has at least one candidate.
    const claimCandidates = BYBIT_OFFICIAL_SOURCE_CANDIDATES.filter((cand) => cand.targetClaimIds.includes(e.claimId));
    if (claimCandidates.length === 0) issues.push({ field: e.claimId, code: 'CLAIM_NO_CANDIDATE', message: 'Target claim has no candidate.' });
    // R1.3 — multi-source claims need ≥2 independent candidate URLs.
    if (e.sourceRule === 'multiple_required' && new Set(claimCandidates.map((c) => c.url)).size < 2) issues.push({ field: e.claimId, code: 'INSUFFICIENT_MULTISOURCE_CANDIDATES', message: 'multiple_required claim needs ≥2 independent candidates.' });
    // R1.9 — legal/restricted claims need a legal/jurisdiction candidate.
    if ((e.claimId === 'bybit.restricted_countries') && !claimCandidates.some((c) => LEGAL_SCOPES.includes(c.declaredScope))) issues.push({ field: e.claimId, code: 'MISSING_LEGAL_CANDIDATE', message: 'restricted_countries needs a legal/jurisdiction candidate.' });
    // R1.10 — KYC needs both general and promotion-specific coverage.
    if (e.claimId === 'bybit.kyc_required') {
      if (!claimCandidates.some((c) => c.declaredScope === 'identity_verification_general' || c.declaredScope === 'account_wide_general')) issues.push({ field: e.claimId, code: 'MISSING_GENERAL_KYC_CANDIDATE', message: 'kyc_required needs a general identity-verification candidate.' });
      if (!claimCandidates.some((c) => PROMO_SCOPES.includes(c.declaredScope))) issues.push({ field: e.claimId, code: 'MISSING_PROMO_KYC_CANDIDATE', message: 'kyc_required needs a promotion-specific candidate.' });
    }
  }

  for (const c of requiredNonPromo) {
    if (!seen.has(c)) issues.push({ field: c, code: 'REQUIRED_CLAIM_UNCOVERED', message: `Required non-promo claim ${c} is not covered by the plan.` });
  }
  for (const cand of BYBIT_OFFICIAL_SOURCE_CANDIDATES) {
    for (const t of cand.targetClaimIds) {
      if (!seen.has(t)) issues.push({ field: `${cand.candidateId}.${t}`, code: 'CANDIDATE_UNKNOWN_CLAIM', message: 'Candidate targets a claim outside the plan.' });
      if (SOURCE_PLAN_EXCLUDED_CLAIMS.includes(t)) issues.push({ field: `${cand.candidateId}.${t}`, code: 'CANDIDATE_EXCLUDED_CLAIM', message: 'Candidate targets an excluded (promo/editorial) claim.' });
    }
  }

  return { ok: issues.length === 0, issues };
}
