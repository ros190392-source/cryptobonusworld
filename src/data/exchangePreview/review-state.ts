/**
 * Owner-review overlay for preview exchanges.
 *
 * Kept SEPARATE from the batch registries so review bookkeeping never touches
 * the page data or visuals. Keyed by slug; any exchange missing here defaults
 * to { ownerReviewStatus: 'pending' }.
 *
 * ownerReviewStatus:
 *   pending      — not yet reviewed by the owner
 *   pass         — owner approved as-is
 *   rework       — owner requested changes (see ownerIssueTypes/ownerNotes)
 *   owner_review — blocked on an owner decision (naming, compliance, approval)
 */
export type OwnerReviewStatus = 'pending' | 'pass' | 'rework' | 'owner_review';

export type OwnerIssueType =
  | 'hero' | 'logo' | 'article' | 'og' | 'card'
  | 'alternatives' | 'text' | 'data' | 'compliance';

export interface OwnerReviewState {
  ownerReviewStatus: OwnerReviewStatus;
  ownerIssueTypes: OwnerIssueType[];
  ownerNotes: string[];
  lastOwnerReview: string | null; // ISO date
}

export const DEFAULT_REVIEW: OwnerReviewState = {
  ownerReviewStatus: 'pending',
  ownerIssueTypes: [],
  ownerNotes: [],
  lastOwnerReview: null,
};

/** Current review state (updated after each owner session). */
export const reviewState: Record<string, Partial<OwnerReviewState>> = {
  // Batch 01 — owner-flagged decisions
  'gate-com': {
    ownerReviewStatus: 'owner_review',
    ownerIssueTypes: ['data'],
    ownerNotes: ['Gate.com naming and Gate.io deduplication decision pending.'],
    lastOwnerReview: '2026-07-17',
  },
  whitebit: {
    ownerReviewStatus: 'owner_review',
    ownerIssueTypes: ['logo'],
    ownerNotes: ['Official transparent wordmark preferred before production (current: icon extracted from white tile).'],
    lastOwnerReview: '2026-07-17',
  },
  // Batch 02 — CBW-generated heroes pending owner approval (all ten)
  htx: {
    ownerReviewStatus: 'owner_review',
    ownerIssueTypes: ['compliance', 'hero'],
    ownerNotes: ['Sanctions research flags an HTX-related entity (Huobi Global S.A.) — owner decision required before production.', 'CBW-generated hero pending approval.'],
    lastOwnerReview: '2026-07-17',
  },
  ...Object.fromEntries(
    ['crypto-com', 'coinbase', 'weex', 'zoomex', 'margex', 'bitmart', 'bitrue', 'coinw', 'xt-com'].map(s => [s, {
      ownerReviewStatus: 'owner_review' as const,
      ownerIssueTypes: ['hero' as const],
      ownerNotes: ['CBW-generated hero background pending owner approval.'],
      lastOwnerReview: '2026-07-17',
    }]),
  ),
};

export const getReview = (slug: string): OwnerReviewState => ({
  ...DEFAULT_REVIEW,
  ...(reviewState[slug] ?? {}),
});
