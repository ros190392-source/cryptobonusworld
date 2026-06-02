/**
 * Content Operations Utilities — CryptoBonusWorld
 * =================================================
 *
 * Provides:
 *  1. Status evaluation — is this content ready to publish?
 *  2. Freshness checks — which fields need re-verification?
 *  3. Review scheduling — what is overdue and what is next?
 *  4. Affiliate link status — which links are due for checking?
 *  5. Ops reporting — generate a full content ops summary
 *
 * Design:
 *  - Pure functions — no side effects, no framework imports
 *  - All dates handled as ISO strings; no Date mutation
 *  - Used at build-time for logging and CI checks
 *  - Complements qualityUtils.ts (which scores content richness)
 *
 * Usage:
 *   import { getOverdueItems, getAffiliatesDue } from '../utils/contentOps';
 *   const overdue = getOverdueItems(contentRecords);
 */

import {
  type ContentRecord,
  type ReviewSchedule,
  type AffiliateLinkRecord,
  REVIEW_SCHEDULE,
  HOLD_STATUSES,
  PUBLISHABLE_STATUSES,
  NEEDS_ACTION_STATUSES,
} from '../data/content-status';
import { daysSince } from './qualityUtils';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FreshnessIssue {
  field: 'bonusAmount' | 'conditions' | 'geo' | 'promoCodes' | 'general';
  lastChecked: string | null | undefined;
  daysSince: number;
  maxDays: number;
  overdueDays: number;
  severity: 'critical' | 'warning' | 'info';
}

export interface ContentReviewReport {
  id: string;
  pageType: string;
  status: string;
  priority: string;
  /** Whether this item can be safely published */
  isPublishable: boolean;
  /** Whether this item needs immediate attention */
  needsAction: boolean;
  /** Specific freshness issues found */
  freshnessIssues: FreshnessIssue[];
  /** Next review due date (ISO) */
  nextReviewDue: string | null;
  /** Overall staleness level */
  stalenessLevel: 'fresh' | 'acceptable' | 'stale' | 'critical';
  /** Actionable summary */
  summary: string;
}

export interface AffiliateReviewItem {
  exchangeSlug: string;
  exchangeName: string;
  affiliateUrl: string;
  lastCheckedAt: string | undefined;
  daysSinceCheck: number;
  checkFrequencyDays: number;
  overdueDays: number;
  isDue: boolean;
  isOverdue: boolean;
  severity: 'critical' | 'warning' | 'info';
}

export interface ContentOpsReport {
  generatedAt: string;
  totalItems: number;
  byStatus: Record<string, number>;
  publishable: number;
  onHold: number;
  needsAction: number;
  overdueReviews: ContentReviewReport[];
  affiliatesDue: AffiliateReviewItem[];
  criticalIssues: string[];
  summary: string;
}

// ── Schedule lookup ───────────────────────────────────────────────────────────

function getSchedule(pageType: string): ReviewSchedule | null {
  return REVIEW_SCHEDULE.find(s => s.pageType === pageType) ?? null;
}

// ── Freshness evaluation ──────────────────────────────────────────────────────

/**
 * Evaluate freshness issues for a content record against its schedule.
 * Returns a list of fields that are overdue or approaching their deadline.
 */
export function evaluateFreshness(record: ContentRecord): FreshnessIssue[] {
  const schedule = getSchedule(record.pageType);
  if (!schedule) return [];

  const issues: FreshnessIssue[] = [];

  function check(
    field: FreshnessIssue['field'],
    lastChecked: string | null | undefined,
    maxDays: number,
  ) {
    const days = daysSince(lastChecked);
    if (days > maxDays) {
      const overdueDays = days - maxDays;
      issues.push({
        field,
        lastChecked: lastChecked ?? null,
        daysSince: days,
        maxDays,
        overdueDays,
        severity: overdueDays > 30 ? 'critical' : overdueDays > 7 ? 'warning' : 'info',
      });
    }
  }

  check('bonusAmount', record.bonusVerifiedAt ?? record.updatedAt, schedule.bonusVerifyDays);
  check('conditions', record.lastReviewedAt ?? record.updatedAt, schedule.conditionsVerifyDays);
  check('geo', record.geoVerifiedAt ?? record.lastReviewedAt ?? record.updatedAt, schedule.geoVerifyDays);
  check('promoCodes', record.promoCodesCheckedAt ?? record.bonusVerifiedAt ?? record.updatedAt, schedule.promoCodeVerifyDays);

  // General inactivity check
  const lastActivity = record.updatedAt ?? record.publishedAt;
  const inactivityDays = daysSince(lastActivity);
  if (inactivityDays > schedule.inactivityThresholdDays) {
    issues.push({
      field: 'general',
      lastChecked: lastActivity ?? null,
      daysSince: inactivityDays,
      maxDays: schedule.inactivityThresholdDays,
      overdueDays: inactivityDays - schedule.inactivityThresholdDays,
      severity: inactivityDays > schedule.inactivityThresholdDays + 30 ? 'critical' : 'warning',
    });
  }

  return issues;
}

// ── Next review date ──────────────────────────────────────────────────────────

/**
 * Calculate the next review due date for a content record.
 * Returns the earliest expiry across all freshness dimensions.
 */
export function getNextReviewDue(record: ContentRecord): string | null {
  const schedule = getSchedule(record.pageType);
  if (!schedule) return null;

  const candidates: Date[] = [];

  function addCandidate(lastChecked: string | null | undefined, addDays: number) {
    if (!lastChecked) return;
    try {
      const d = new Date(lastChecked);
      d.setDate(d.getDate() + addDays);
      candidates.push(d);
    } catch { /* skip invalid dates */ }
  }

  addCandidate(record.bonusVerifiedAt ?? record.updatedAt, schedule.bonusVerifyDays);
  addCandidate(record.lastReviewedAt ?? record.updatedAt, schedule.conditionsVerifyDays);
  addCandidate(record.geoVerifiedAt ?? record.updatedAt, schedule.geoVerifyDays);
  addCandidate(record.promoCodesCheckedAt ?? record.updatedAt, schedule.promoCodeVerifyDays);

  if (candidates.length === 0) return null;

  const earliest = candidates.reduce((min, d) => (d < min ? d : min));
  return earliest.toISOString().split('T')[0];
}

// ── Staleness level ───────────────────────────────────────────────────────────

function resolveStalenessLevel(
  issues: FreshnessIssue[],
): ContentReviewReport['stalenessLevel'] {
  if (issues.some(i => i.severity === 'critical')) return 'critical';
  if (issues.some(i => i.severity === 'warning')) return 'stale';
  if (issues.length > 0) return 'acceptable';
  return 'fresh';
}

// ── Single item review report ─────────────────────────────────────────────────

/**
 * Generate a review report for a single content record.
 */
export function reviewContent(record: ContentRecord): ContentReviewReport {
  const freshnessIssues = evaluateFreshness(record);
  const nextReviewDue = getNextReviewDue(record);
  const stalenessLevel = resolveStalenessLevel(freshnessIssues);
  const isPublishable = PUBLISHABLE_STATUSES.includes(record.status as any);
  const needsAction = NEEDS_ACTION_STATUSES.includes(record.status as any) ||
    stalenessLevel === 'critical';

  const parts: string[] = [];
  if (!isPublishable && HOLD_STATUSES.includes(record.status as any)) {
    parts.push(`Status: ${record.status} — not publishable`);
  }
  if (freshnessIssues.length > 0) {
    const top = freshnessIssues[0];
    parts.push(`${top.field} overdue by ${top.overdueDays}d`);
  }
  if (nextReviewDue) {
    const daysUntil = -daysSince(nextReviewDue);
    parts.push(daysUntil < 0
      ? `Review was due ${Math.abs(daysUntil)}d ago`
      : `Next review in ${daysUntil}d`
    );
  }

  const statusIcon = stalenessLevel === 'critical' ? '⛔'
    : stalenessLevel === 'stale' ? '⚠️'
    : '✅';

  const summary = `${statusIcon} [${record.pageType}/${record.id}] ${parts.join(' · ') || 'OK'}`;

  return {
    id: record.id,
    pageType: record.pageType,
    status: record.status,
    priority: record.priority,
    isPublishable,
    needsAction,
    freshnessIssues,
    nextReviewDue,
    stalenessLevel,
    summary,
  };
}

// ── Batch operations ──────────────────────────────────────────────────────────

/**
 * Find all items that are overdue for review from a list of records.
 * Sorted by severity (critical first), then priority.
 */
export function getOverdueItems(records: ContentRecord[]): ContentReviewReport[] {
  return records
    .map(reviewContent)
    .filter(r => r.freshnessIssues.length > 0 || r.needsAction)
    .sort((a, b) => {
      const severityOrder = { critical: 0, stale: 1, acceptable: 2, fresh: 3 };
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const sA = severityOrder[a.stalenessLevel];
      const sB = severityOrder[b.stalenessLevel];
      if (sA !== sB) return sA - sB;
      const pA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3;
      const pB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3;
      return pA - pB;
    });
}

/**
 * Find all items that are on hold (not publishable) from a list of records.
 */
export function getHeldItems(records: ContentRecord[]): ContentRecord[] {
  return records.filter(r => HOLD_STATUSES.includes(r.status as any));
}

/**
 * Find items due for review in the next N days.
 */
export function getUpcomingReviews(records: ContentRecord[], withinDays = 14): ContentReviewReport[] {
  return records
    .map(r => ({ record: r, report: reviewContent(r) }))
    .filter(({ report }) => {
      if (!report.nextReviewDue) return false;
      const daysUntil = -daysSince(report.nextReviewDue);
      return daysUntil >= 0 && daysUntil <= withinDays;
    })
    .map(({ report }) => report)
    .sort((a, b) => {
      const aDate = a.nextReviewDue ?? '9999-12-31';
      const bDate = b.nextReviewDue ?? '9999-12-31';
      return aDate.localeCompare(bDate);
    });
}

// ── Affiliate link tracking ───────────────────────────────────────────────────

/**
 * Evaluate which affiliate links are due for re-checking.
 */
export function getAffiliatesDue(links: AffiliateLinkRecord[]): AffiliateReviewItem[] {
  return links
    .map(link => {
      const days = daysSince(link.lastCheckedAt);
      const overdueDays = Math.max(0, days - link.checkFrequencyDays);
      const isDue = days >= link.checkFrequencyDays;
      const isOverdue = overdueDays > 0;

      return {
        exchangeSlug: link.exchangeSlug,
        exchangeName: link.exchangeName,
        affiliateUrl: link.affiliateUrl,
        lastCheckedAt: link.lastCheckedAt,
        daysSinceCheck: days,
        checkFrequencyDays: link.checkFrequencyDays,
        overdueDays,
        isDue,
        isOverdue,
        severity: (overdueDays > 14 ? 'critical' : overdueDays > 0 ? 'warning' : 'info') as AffiliateReviewItem['severity'],
      };
    })
    .filter(item => item.isDue)
    .sort((a, b) => b.overdueDays - a.overdueDays);
}

// ── Status transition guard ───────────────────────────────────────────────────

import { STATUS_TRANSITIONS } from '../data/content-status';
import type { ContentStatus } from '../data/content-status';

/**
 * Check if a status transition is valid.
 */
export function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Determine what status a content record should have based on freshness.
 * Call this at build time to flag items that need status updates.
 */
export function deriveStatusFromFreshness(record: ContentRecord): ContentStatus {
  if (!PUBLISHABLE_STATUSES.includes(record.status as any)) {
    return record.status; // Don't change non-published items
  }

  const issues = evaluateFreshness(record);
  const hasCritical = issues.some(i => i.severity === 'critical');
  const hasWarning = issues.some(i => i.severity === 'warning');

  if (hasCritical) return 'needs-review';
  if (hasWarning) return 'needs-update';
  return 'published';
}

// ── Full ops report ───────────────────────────────────────────────────────────

/**
 * Generate a full content operations report for a set of records and affiliate links.
 * Use at build time or in CI to catch issues before publishing.
 */
export function generateContentOpsReport(
  records: ContentRecord[],
  affiliateLinks: AffiliateLinkRecord[],
): ContentOpsReport {
  const byStatus: Record<string, number> = {};
  for (const r of records) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  }

  const publishable = records.filter(r => PUBLISHABLE_STATUSES.includes(r.status as any)).length;
  const onHold = records.filter(r => HOLD_STATUSES.includes(r.status as any)).length;
  const needsAction = records.filter(r => NEEDS_ACTION_STATUSES.includes(r.status as any)).length;

  const overdueReviews = getOverdueItems(records);
  const affiliatesDue = getAffiliatesDue(affiliateLinks);
  const criticalIssues: string[] = [];

  overdueReviews
    .filter(r => r.stalenessLevel === 'critical')
    .forEach(r => criticalIssues.push(r.summary));

  affiliatesDue
    .filter(a => a.severity === 'critical')
    .forEach(a => criticalIssues.push(`⛔ Affiliate link overdue: ${a.exchangeName} (${a.overdueDays}d overdue)`));

  const hasCritical = criticalIssues.length > 0;
  const summary = hasCritical
    ? `⛔ CRITICAL — ${criticalIssues.length} critical issue(s) require immediate attention`
    : overdueReviews.length > 0 || affiliatesDue.length > 0
    ? `⚠️ REVIEW — ${overdueReviews.length} items overdue, ${affiliatesDue.length} affiliate links due`
    : `✅ All content is within freshness thresholds`;

  return {
    generatedAt: new Date().toISOString().split('T')[0],
    totalItems: records.length,
    byStatus,
    publishable,
    onHold,
    needsAction,
    overdueReviews,
    affiliatesDue,
    criticalIssues,
    summary,
  };
}

// ── Build-time content gate ───────────────────────────────────────────────────

/**
 * Returns true if a content item should be excluded from the build.
 * Used in getStaticPaths() to prevent unpublished/broken content from being rendered.
 */
export function shouldExcludeFromBuild(record: ContentRecord): boolean {
  return HOLD_STATUSES.includes(record.status as any);
}

/**
 * Format a change log entry for display or audit export.
 */
export function formatChangeLogEntry(entry: {
  date: string;
  field: string;
  oldValue?: string;
  newValue?: string;
  source?: string;
  notes?: string;
  changedBy?: string;
}): string {
  const parts = [`[${entry.date}] ${entry.field}:`];
  if (entry.oldValue !== undefined && entry.newValue !== undefined) {
    parts.push(`${entry.oldValue} → ${entry.newValue}`);
  }
  if (entry.source) parts.push(`(source: ${entry.source})`);
  if (entry.notes) parts.push(`— ${entry.notes}`);
  if (entry.changedBy) parts.push(`by ${entry.changedBy}`);
  return parts.join(' ');
}
