/**
 * CryptoBonusWorld — Evidence Engine
 *
 * Core fact-checking logic:
 *  - Confidence scoring (based on source quality + recency)
 *  - Staleness detection (field-specific max ages)
 *  - Conflict flagging (official vs secondary disagreement)
 *  - Aggregate exchange health scoring
 *  - Audit report generation
 *
 * All functions are pure — no side effects, no external calls.
 * Run server-side at build time or in a Node audit script.
 */

import type {
  ExchangeEvidence,
  EvidenceFact,
  ConflictStatus,
  SourceType,
  ScreenshotCategory,
  ScreenshotEntry,
  ScreenshotRegistry,
} from '../data/evidence/_schema';
import { CHECK_SCHEDULE } from '../data/evidence/_schema';

// ── Confidence scoring ────────────────────────────────────────────────────────

/**
 * Quality score per source type — reflects how authoritative the source is.
 * Official exchange sources always score ≥ 0.80.
 */
const SOURCE_QUALITY: Record<SourceType, number> = {
  'official-promo':    0.90,
  'official-fees':     0.95,
  'official-kyc':      0.95,
  'official-legal':    0.95,
  'official-reserves': 0.95,
  'official-p2p':      0.90,
  'official-app':      0.85,
  'official-blog':     0.85,
  'official-help':     0.90,
  'official-affiliate':0.85,
  'official-other':    0.80,
  'secondary-news':    0.65,
  'secondary-review':  0.55,
  'secondary-reddit':  0.35,
  'internal-test':     0.80,
};

/**
 * Recency multiplier — more recent checks get higher scores.
 * Uses field-specific max age from CHECK_SCHEDULE.
 */
function recencyMultiplier(lastChecked: string, fieldName: string): number {
  const schedule = (CHECK_SCHEDULE as Record<string, { maxAgeDays: number }>)[fieldName];
  const maxAge = schedule?.maxAgeDays ?? 30;

  const checked = new Date(lastChecked + (lastChecked.length === 10 ? 'T00:00:00' : ''));
  const now = new Date();
  const ageDays = (now.getTime() - checked.getTime()) / (1000 * 60 * 60 * 24);

  if (ageDays <= maxAge * 0.25)  return 1.0;   // Within 25% of max age — full freshness
  if (ageDays <= maxAge * 0.5)   return 0.95;
  if (ageDays <= maxAge * 0.75)  return 0.88;
  if (ageDays <= maxAge * 1.0)   return 0.80;
  if (ageDays <= maxAge * 1.5)   return 0.65;
  if (ageDays <= maxAge * 3.0)   return 0.50;
  return 0.30; // Very stale
}

/**
 * Calculate a fact's confidence score from source quality and recency.
 *
 * Formula: quality_score × recency_multiplier
 *
 * The stored confidenceScore in the evidence JSON is the MANUAL editorial value.
 * This function RECALCULATES it dynamically at runtime to reflect current staleness.
 */
export function calculateConfidence(fact: EvidenceFact, exchangeEvidence: ExchangeEvidence): number {
  const sources = exchangeEvidence.sources;
  const sourceKey = fact.officialSourceKey;

  // Find the source type for quality scoring
  let sourceQuality = 0.70; // default if no source
  if (sourceKey && sources[sourceKey]) {
    sourceQuality = SOURCE_QUALITY[sources[sourceKey]!.type] ?? 0.70;
  } else if (fact.officialSourceUrl) {
    sourceQuality = 0.80; // unknown type but has URL
  }

  // If no source at all, cap at 0.35
  if (!sourceKey && !fact.officialSourceUrl) {
    sourceQuality = 0.35;
  }

  // Secondary source corroboration bonus (+0.05, capped at 1.0)
  const secondaryBonus = fact.secondarySourceUrl ? 0.05 : 0;

  const quality = Math.min(1.0, sourceQuality + secondaryBonus);
  const recency = recencyMultiplier(fact.lastChecked, fact.field);

  return Math.round(quality * recency * 100) / 100;
}

// ── Staleness detection ───────────────────────────────────────────────────────

/**
 * Returns true if the fact is past its max-age threshold.
 */
export function isStale(fact: EvidenceFact): boolean {
  const schedule = (CHECK_SCHEDULE as Record<string, { maxAgeDays: number }>)[fact.field];
  if (!schedule) return false;

  const checked = new Date(fact.lastChecked + (fact.lastChecked.length === 10 ? 'T00:00:00' : ''));
  const ageDays = (Date.now() - checked.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays > schedule.maxAgeDays;
}

/**
 * Returns age of a fact in days.
 */
export function factAgeDays(fact: EvidenceFact): number {
  const checked = new Date(fact.lastChecked + (fact.lastChecked.length === 10 ? 'T00:00:00' : ''));
  return (Date.now() - checked.getTime()) / (1000 * 60 * 60 * 24);
}

// ── Conflict detection ────────────────────────────────────────────────────────

/**
 * Determine conflict status based on stored value vs runtime signals.
 * Primary logic is editorial (stored in JSON), but we can override
 * to 'outdated' when the age threshold is exceeded.
 */
export function resolveConflictStatus(fact: EvidenceFact): ConflictStatus {
  // Explicit conflict or manual flag takes priority
  if (fact.conflictStatus === 'conflict') return 'conflict';
  if (fact.conflictStatus === 'unverified') return 'unverified';
  if (fact.conflictStatus === 'needs-check') return 'needs-check';
  // Runtime: if stale, override to 'outdated'
  if (isStale(fact)) return 'outdated';
  return 'ok';
}

// ── UI helpers ────────────────────────────────────────────────────────────────

export interface ConfidenceDisplay {
  score: number;          // 0–100 integer
  label: string;          // "High" | "Good" | "Moderate" | "Low" | "Unverified"
  color: string;          // CSS color for badge
  description: string;    // Tooltip / accessible description
}

/**
 * Convert a 0.0–1.0 confidence score into display values for the UI.
 */
export function getConfidenceDisplay(score: number): ConfidenceDisplay {
  const pct = Math.round(score * 100);

  if (pct >= 88) return {
    score: pct,
    label: 'High confidence',
    color: '#4ade80',
    description: 'Verified from official source, freshly checked — high confidence.',
  };
  if (pct >= 72) return {
    score: pct,
    label: 'Good confidence',
    color: '#86efac',
    description: 'From official source; verify exact amounts before claiming.',
  };
  if (pct >= 55) return {
    score: pct,
    label: 'Moderate',
    color: '#fbbf24',
    description: 'Source checked but may be approaching re-verification date. Confirm on official site.',
  };
  if (pct >= 35) return {
    score: pct,
    label: 'Low',
    color: '#fb923c',
    description: 'Stale or low-quality source. Do not rely on this value — check official site.',
  };
  return {
    score: pct,
    label: 'Unverified',
    color: '#ef4444',
    description: 'No verified source available. Manual review required.',
  };
}

// ── Aggregate health scoring ──────────────────────────────────────────────────

export interface ExchangeEvidenceHealth {
  exchange: string;
  overallScore: number;       // 0–100 aggregate
  totalFacts: number;
  staleFacts: number;
  conflictedFacts: number;
  unverifiedFacts: number;
  needsReviewFacts: number;
  criticalFieldsMissing: string[];
  lowestConfidenceFacts: EvidenceFact[];
  lastUpdated: string;
}

/** Fields that MUST be in the evidence file for it to be considered complete */
const CRITICAL_FIELDS = [
  'bonus_amount',
  'kyc_required',
  'spot_maker_fee',
  'spot_taker_fee',
  'p2p_available',
  'restricted_us',
] as const;

/**
 * Compute the overall evidence health for one exchange.
 * Used in the audit script and editorial dashboard.
 */
export function computeExchangeHealth(ev: ExchangeEvidence): ExchangeEvidenceHealth {
  const facts = ev.facts;
  const enriched = facts.map(f => ({
    ...f,
    _liveStatus: resolveConflictStatus(f),
    _liveConfidence: calculateConfidence(f, ev),
  }));

  const staleFacts      = enriched.filter(f => f._liveStatus === 'outdated').length;
  const conflictedFacts = enriched.filter(f => f._liveStatus === 'conflict').length;
  const unverifiedFacts = enriched.filter(f => f._liveStatus === 'unverified').length;
  const needsReview     = enriched.filter(f => f.manualReviewRequired).length;

  const avgConfidence = facts.length > 0
    ? enriched.reduce((sum, f) => sum + f._liveConfidence, 0) / facts.length
    : 0;

  const presentFields = new Set(facts.map(f => f.field));
  const criticalFieldsMissing = CRITICAL_FIELDS.filter(f => !presentFields.has(f));

  // Penalise for missing critical fields, stale facts, conflicts
  const penalty = (criticalFieldsMissing.length * 5) + (staleFacts * 3) + (conflictedFacts * 8);
  const overallScore = Math.max(0, Math.round(avgConfidence * 100 - penalty));

  // Lowest confidence facts (top 3 worst)
  const lowestConfidenceFacts = [...enriched]
    .sort((a, b) => a._liveConfidence - b._liveConfidence)
    .slice(0, 3)
    .map(f => facts.find(orig => orig.field === f.field)!);

  return {
    exchange: ev.exchange,
    overallScore,
    totalFacts: facts.length,
    staleFacts,
    conflictedFacts,
    unverifiedFacts,
    needsReviewFacts: needsReview,
    criticalFieldsMissing,
    lowestConfidenceFacts,
    lastUpdated: ev.updatedAt,
  };
}

// ── Fact lookup helpers ───────────────────────────────────────────────────────

/**
 * Get a specific fact by field name. Returns undefined if not in evidence file.
 */
export function getFact(ev: ExchangeEvidence, field: string): EvidenceFact | undefined {
  return ev.facts.find(f => f.field === field);
}

/**
 * Get the live confidence score for a field (recalculated from current date).
 */
export function getLiveConfidence(ev: ExchangeEvidence, field: string): number {
  const fact = getFact(ev, field);
  if (!fact) return 0;
  return calculateConfidence(fact, ev);
}

/**
 * Get a source URL for display (official first, then secondary).
 */
export function getSourceUrl(ev: ExchangeEvidence, field: string): string | null {
  const fact = getFact(ev, field);
  if (!fact) return null;
  if (fact.officialSourceUrl) return fact.officialSourceUrl;
  if (fact.officialSourceKey && ev.sources[fact.officialSourceKey]) {
    return ev.sources[fact.officialSourceKey]!.url;
  }
  return fact.secondarySourceUrl ?? null;
}

/**
 * Get source label for display.
 */
export function getSourceLabel(ev: ExchangeEvidence, field: string): string | null {
  const fact = getFact(ev, field);
  if (!fact || !fact.officialSourceKey) return null;
  return ev.sources[fact.officialSourceKey]?.label ?? null;
}

// ── Screenshot helpers ────────────────────────────────────────────────────────

/** Max age in days before a screenshot is considered outdated */
const SCREENSHOT_MAX_AGE_DAYS = 90;

/**
 * Get the screenshot entry for a specific category.
 * Returns undefined if the category is not in the registry.
 */
export function getScreenshotEntry(
  ev: ExchangeEvidence,
  category: ScreenshotCategory,
): ScreenshotEntry | undefined {
  return (ev.screenshots as ScreenshotRegistry)[category] ?? undefined;
}

/**
 * Returns true if this screenshot is suitable for rendering on the public site.
 * Only returns true for entries with status='available' and a non-null path.
 */
export function isScreenshotAvailable(entry: ScreenshotEntry | undefined): boolean {
  if (!entry) return false;
  return entry.status === 'available' && !!entry.path;
}

/**
 * Get the public-facing screenshot path if available.
 * Returns null if the screenshot should not be shown to users.
 */
export function getScreenshotPath(
  ev: ExchangeEvidence,
  category: ScreenshotCategory,
): string | null {
  const entry = getScreenshotEntry(ev, category);
  if (!isScreenshotAvailable(entry)) return null;
  return entry!.path;
}

/**
 * Derive the expected screenshot path from convention.
 * /screenshots/{exchange}/{category}/{geo}-{device}-{yyyy-mm}.webp
 * Used by the checklist generator — NOT for rendering (use entry.path for that).
 */
export function buildScreenshotPath(
  exchange: string,
  category: ScreenshotCategory,
  geo: string = 'global',
  device: 'desktop' | 'mobile' = 'desktop',
  yearMonth: string = new Date().toISOString().slice(0, 7),
): string {
  return `/screenshots/${exchange}/${category}/${geo.toLowerCase()}-${device}-${yearMonth}.webp`;
}

/**
 * Check if a screenshot entry is outdated (capturedAt older than 90 days).
 */
export function isScreenshotOutdated(entry: ScreenshotEntry): boolean {
  if (!entry.capturedAt) return false;
  const captured = new Date(entry.capturedAt + '-01');
  const ageDays = (Date.now() - captured.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays > SCREENSHOT_MAX_AGE_DAYS;
}

/**
 * Compute screenshot coverage for an exchange: how many applicable categories
 * have a real screenshot vs how many are still pending.
 */
export function computeScreenshotCoverage(ev: ExchangeEvidence): {
  total: number;
  available: number;
  pending: number;
  notApplicable: number;
  coveragePct: number;
} {
  const registry = ev.screenshots as ScreenshotRegistry;
  const entries = Object.values(registry) as ScreenshotEntry[];

  const notApplicable = entries.filter(e => e.status === 'not_applicable').length;
  const available     = entries.filter(e => e.status === 'available').length;
  const applicable    = entries.length - notApplicable;
  const pending       = applicable - available;
  const coveragePct   = applicable > 0 ? Math.round((available / applicable) * 100) : 100;

  return { total: entries.length, available, pending, notApplicable, coveragePct };
}

/**
 * Get all facts that are stale or need review — for editorial dashboard.
 */
export function getActionableItems(ev: ExchangeEvidence): Array<{
  field: string;
  issue: string;
  priority: 'critical' | 'high' | 'medium';
  lastChecked: string;
}> {
  const items: ReturnType<typeof getActionableItems> = [];

  for (const fact of ev.facts) {
    const status = resolveConflictStatus(fact);
    const conf = calculateConfidence(fact, ev);

    if (status === 'conflict') {
      items.push({ field: fact.field, issue: 'Source conflict — manual review required', priority: 'critical', lastChecked: fact.lastChecked });
    } else if (fact.manualReviewRequired) {
      items.push({ field: fact.field, issue: 'Flagged for manual review', priority: 'high', lastChecked: fact.lastChecked });
    } else if (status === 'outdated') {
      const schedule = (CHECK_SCHEDULE as Record<string, { maxAgeDays: number }>)[fact.field];
      const ageMsg = schedule ? `(max age: ${schedule.maxAgeDays}d)` : '';
      items.push({ field: fact.field, issue: `Stale — re-verify ${ageMsg}`, priority: 'high', lastChecked: fact.lastChecked });
    } else if (status === 'unverified') {
      items.push({ field: fact.field, issue: 'No verified source', priority: 'medium', lastChecked: fact.lastChecked });
    } else if (conf < 0.55) {
      items.push({ field: fact.field, issue: `Low confidence (${Math.round(conf * 100)}%)`, priority: 'medium', lastChecked: fact.lastChecked });
    }
  }

  // Sort: critical → high → medium
  const order = { critical: 0, high: 1, medium: 2 };
  return items.sort((a, b) => order[a.priority] - order[b.priority]);
}
