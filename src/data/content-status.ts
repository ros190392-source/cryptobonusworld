/**
 * Content Status Registry — CryptoBonusWorld Editorial Workflow
 * ==============================================================
 *
 * Defines the editorial lifecycle for all content types:
 *  - Status taxonomy (draft → review → published → archived)
 *  - Review schedule definitions per page type
 *  - Affiliate link verification schedule
 *  - Content ownership map (who is accountable per type)
 *
 * Design:
 *  - Pure data — no runtime logic in this file
 *  - Used by contentOps.ts utilities and build-time QA checks
 *  - All dates are ISO 8601 strings (YYYY-MM-DD)
 *
 * Usage:
 *   import { REVIEW_SCHEDULE, ContentStatus } from '../data/content-status';
 */

// ── Status types ──────────────────────────────────────────────────────────────

export type ContentStatus =
  | 'draft'          // In progress — not indexable
  | 'review'         // Awaiting editorial sign-off
  | 'published'      // Live and verified
  | 'needs-update'   // Published but data freshness expired
  | 'needs-review'   // Published but flagged for re-verification
  | 'archived'       // Removed from index, kept for reference
  | 'redirected';    // Replaced by another page

export type ContentPriority = 'critical' | 'high' | 'medium' | 'low';

export type ContentOwner =
  | 'editorial'       // Editorial team owns this content type
  | 'data-ops'        // Data accuracy team
  | 'affiliate-ops';  // Affiliate link + code verification

// ── Review schedule definitions ───────────────────────────────────────────────

export interface ReviewSchedule {
  /** Page type this schedule applies to */
  pageType: string;
  /** Days after which bonus amount must be re-verified */
  bonusVerifyDays: number;
  /** Days after which KYC/conditions must be re-verified */
  conditionsVerifyDays: number;
  /** Days after which geographic availability must be re-verified */
  geoVerifyDays: number;
  /** Days after which promo codes must be re-verified */
  promoCodeVerifyDays: number;
  /** Days of total inactivity before page is flagged for review */
  inactivityThresholdDays: number;
  /** Content owner responsible for this type */
  owner: ContentOwner;
}

/**
 * Review cadences aligned with REVIEW_STANDARDS.md.
 * These are the maximum acceptable staleness windows per page type.
 */
export const REVIEW_SCHEDULE: ReviewSchedule[] = [
  {
    pageType: 'exchange',
    bonusVerifyDays: 30,
    conditionsVerifyDays: 60,
    geoVerifyDays: 60,
    promoCodeVerifyDays: 14,
    inactivityThresholdDays: 45,
    owner: 'editorial',
  },
  {
    pageType: 'bonus-code',
    bonusVerifyDays: 14,
    conditionsVerifyDays: 30,
    geoVerifyDays: 60,
    promoCodeVerifyDays: 7,
    inactivityThresholdDays: 14,
    owner: 'affiliate-ops',
  },
  {
    pageType: 'category',
    bonusVerifyDays: 30,
    conditionsVerifyDays: 60,
    geoVerifyDays: 90,
    promoCodeVerifyDays: 30,
    inactivityThresholdDays: 60,
    owner: 'editorial',
  },
  {
    pageType: 'country',
    bonusVerifyDays: 30,
    conditionsVerifyDays: 60,
    geoVerifyDays: 30,
    promoCodeVerifyDays: 30,
    inactivityThresholdDays: 60,
    owner: 'data-ops',
  },
  {
    pageType: 'coin',
    bonusVerifyDays: 60,
    conditionsVerifyDays: 90,
    geoVerifyDays: 90,
    promoCodeVerifyDays: 60,
    inactivityThresholdDays: 90,
    owner: 'data-ops',
  },
  {
    pageType: 'use-case',
    bonusVerifyDays: 45,
    conditionsVerifyDays: 60,
    geoVerifyDays: 90,
    promoCodeVerifyDays: 30,
    inactivityThresholdDays: 60,
    owner: 'editorial',
  },
  {
    pageType: 'guide',
    bonusVerifyDays: 60,
    conditionsVerifyDays: 90,
    geoVerifyDays: 90,
    promoCodeVerifyDays: 60,
    inactivityThresholdDays: 90,
    owner: 'editorial',
  },
  {
    pageType: 'compare',
    bonusVerifyDays: 30,
    conditionsVerifyDays: 60,
    geoVerifyDays: 60,
    promoCodeVerifyDays: 30,
    inactivityThresholdDays: 45,
    owner: 'data-ops',
  },
];

// ── Content item record ───────────────────────────────────────────────────────

/**
 * A record for tracking the editorial lifecycle of a single content item.
 * These are typically embedded in data files (exchanges.json etc.) and
 * passed to contentOps utilities for status evaluation.
 */
export interface ContentRecord {
  /** Unique content identifier, usually the page slug */
  id: string;
  /** Type of page content maps to */
  pageType: string;
  /** Current editorial status */
  status: ContentStatus;
  /** Priority — affects review scheduling urgency */
  priority: ContentPriority;
  /** ISO date when content was first published */
  publishedAt?: string;
  /** ISO date when content was last fully reviewed */
  lastReviewedAt?: string;
  /** ISO date when bonus amounts were last verified */
  bonusVerifiedAt?: string;
  /** ISO date when affiliate link was last checked */
  affiliateLinkCheckedAt?: string;
  /** ISO date when promo codes were last verified */
  promoCodesCheckedAt?: string;
  /** ISO date when geographic availability was last verified */
  geoVerifiedAt?: string;
  /** ISO date content was most recently updated (any field) */
  updatedAt?: string;
  /** Free-text note from last reviewer */
  reviewNote?: string;
  /** GitHub username or initials of last reviewer */
  reviewedBy?: string;
  /** Whether affiliate link returned 200 on last check */
  affiliateLinkLive?: boolean;
  /** Tracks structured changes for E-E-A-T audit trail */
  changeLog?: ChangeLogEntry[];
}

export interface ChangeLogEntry {
  date: string;
  field: string;
  oldValue?: string;
  newValue?: string;
  source?: string;
  notes?: string;
  changedBy?: string;
}

// ── Affiliate link registry entry ─────────────────────────────────────────────

/**
 * Affiliate link tracking record.
 * Separate from ContentRecord to allow batch link-checking independently.
 */
export interface AffiliateLinkRecord {
  exchangeSlug: string;
  exchangeName: string;
  affiliateUrl: string;
  /** Date of last 200-response check */
  lastCheckedAt?: string;
  /** Whether the link was live on last check */
  isLive: boolean;
  /** Whether the URL matches the expected domain */
  domainVerified: boolean;
  /** Days between required re-checks */
  checkFrequencyDays: number;
  /** ISO date after which link must be re-checked */
  nextCheckDue?: string;
  notes?: string;
}

/**
 * Known affiliate link registry.
 * Used by contentOps to flag expired or unverified links.
 */
export const AFFILIATE_LINK_REGISTRY: AffiliateLinkRecord[] = [
  {
    exchangeSlug: 'bybit',
    exchangeName: 'Bybit',
    affiliateUrl: 'https://partner.bybit.com/b/cryptobonusworld',
    lastCheckedAt: '2026-05-24',
    isLive: true,
    domainVerified: true,
    checkFrequencyDays: 14,
  },
  {
    exchangeSlug: 'mexc',
    exchangeName: 'MEXC',
    affiliateUrl: 'https://www.mexc.com/acquisition/custom-sign-up?shareCode=mexc-CryptoBonus',
    lastCheckedAt: '2026-05-27',
    isLive: true,
    domainVerified: true,
    checkFrequencyDays: 14,
  },
  {
    exchangeSlug: 'okx',
    exchangeName: 'OKX',
    affiliateUrl: 'https://okx.com/join/CRYPTOBONUSW',
    lastCheckedAt: '2026-05-24',
    isLive: true,
    domainVerified: true,
    checkFrequencyDays: 14,
  },
  {
    exchangeSlug: 'binance',
    exchangeName: 'Binance',
    affiliateUrl: 'https://accounts.binance.com/register?ref=CRYPTOBONW',
    lastCheckedAt: '2026-05-24',
    isLive: true,
    domainVerified: true,
    checkFrequencyDays: 14,
  },
  {
    exchangeSlug: 'bitget',
    exchangeName: 'Bitget',
    affiliateUrl: 'https://partner.bitget.com/bg/CryptoBonW',
    lastCheckedAt: '2026-05-24',
    isLive: true,
    domainVerified: true,
    checkFrequencyDays: 14,
  },
  {
    exchangeSlug: 'kucoin',
    exchangeName: 'KuCoin',
    affiliateUrl: 'https://www.kucoin.com/r/af/CRYPTOBONW',
    lastCheckedAt: '2026-05-27',
    isLive: true,
    domainVerified: true,
    checkFrequencyDays: 14,
  },
];

// ── Status transition rules ───────────────────────────────────────────────────

/**
 * Defines which status transitions are valid.
 * Prevents accidental publish of unreviewed content.
 */
export const STATUS_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  draft:         ['review', 'archived'],
  review:        ['published', 'draft', 'archived'],
  published:     ['needs-update', 'needs-review', 'archived', 'redirected'],
  'needs-update': ['review', 'published', 'archived'],
  'needs-review': ['review', 'published', 'archived'],
  archived:      ['draft', 'redirected'],
  redirected:    ['archived'],
};

/**
 * Statuses that are safe to publish (indexable).
 */
export const PUBLISHABLE_STATUSES: ContentStatus[] = ['published'];

/**
 * Statuses that should be held from publishing.
 */
export const HOLD_STATUSES: ContentStatus[] = ['draft', 'review', 'archived', 'redirected'];

/**
 * Statuses that have been published but need action.
 */
export const NEEDS_ACTION_STATUSES: ContentStatus[] = ['needs-update', 'needs-review'];
