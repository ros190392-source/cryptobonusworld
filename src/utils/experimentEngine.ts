/**
 * experimentEngine.ts — CryptoBonusWorld Lightweight A/B Experiment Engine
 *
 * Architecture:
 *  - Pure TypeScript (no DOM, no framework) — usable server + client
 *  - Deterministic assignment: djb2 hash of "{experimentId}:{sessionId}"
 *  - Stable per session: result cached in localStorage `cbw_exp_{id}`
 *  - Weighted variants: weights sum to 100, bucket selection is reproducible
 *  - URL override: ?exp_{id}={variantId} for QA / stakeholder previews
 *
 * SEO guarantee:
 *  - Server HTML is NEVER modified by experiments
 *  - Experiments only run client-side
 *  - Crawlers always see the control variant (editorial / stable markup)
 *
 * Privacy:
 *  - Only localStorage is used (no cookies, no fingerprinting)
 *  - No PII stored — only variant IDs keyed to anonymous session IDs
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExperimentVariantDef {
  /** Unique variant ID within this experiment. 'control' = baseline. */
  id: string;
  /** Human-readable label for dashboards / debug UI */
  label: string;
  /** Allocation weight 0–100. All variants in an experiment must sum to 100. */
  weight: number;
  /** Optional: short description of what this variant changes */
  description?: string;
}

export interface ExperimentDefinition {
  /** Unique experiment ID — used as localStorage key suffix */
  id: string;
  /** Human-readable description of the hypothesis being tested */
  description: string;
  /** Whether this experiment is currently running */
  active: boolean;
  /**
   * Pages where this experiment applies.
   * Values match pageType from Analytics.astro: 'homepage' | 'bonuses' | 'exchange'
   * | 'compare' | 'compare-hub' | 'category' | 'country' | 'other'
   * Use ['all'] to run on every page.
   */
  targetPages: string[];
  /**
   * Optional GEO restriction — only assign if visitor geo matches.
   * Undefined = run for all GEOs.
   */
  targetGeos?: string[];
  /**
   * Optional device restriction — only assign on matching device types.
   * Undefined = run for all devices.
   */
  targetDevices?: string[];
  /** ISO 8601 start date — experiment won't run before this date */
  startDate?: string;
  /** ISO 8601 end date — experiment won't run after this date */
  endDate?: string;
  /** Ordered variant list. First = control (baseline). */
  variants: ExperimentVariantDef[];
}

export interface ExperimentAssignment {
  experimentId: string;
  variantId: string;
  variantLabel: string;
  source: 'url-override' | 'localStorage' | 'new-assignment';
  assignedAt: number;
}

export interface ExperimentContext {
  sessionId: string;
  geo?: string;
  device?: string;
  pageType?: string;
}

// ── Hash function ─────────────────────────────────────────────────────────────

/**
 * djb2 hash: deterministic, fast, well-distributed for short strings.
 * Returns an unsigned 32-bit integer (0 to 4294967295).
 *
 * Seeding with experimentId ensures each experiment gets independent buckets
 * even when run simultaneously for the same session.
 */
export function hashDjb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return hash;
}

/**
 * Map a session+experiment to a stable bucket 0–99 (inclusive).
 * Concatenating experimentId ensures experiments are independent.
 */
export function getBucket(experimentId: string, sessionId: string): number {
  return hashDjb2(`${experimentId}:${sessionId}`) % 100;
}

// ── Variant selection ─────────────────────────────────────────────────────────

/**
 * Select a variant based on cumulative weight buckets.
 * Variants are processed in definition order (control first).
 *
 * Example: weights [50, 30, 20], bucket 65 → second variant (50+30 > 65)
 */
export function selectVariant(
  variants: ExperimentVariantDef[],
  bucket: number,
): ExperimentVariantDef {
  let cumulative = 0;
  for (const v of variants) {
    cumulative += v.weight;
    if (bucket < cumulative) return v;
  }
  // Fallback (should never reach here if weights sum to 100)
  return variants[0];
}

// ── Date range check ──────────────────────────────────────────────────────────

function isInDateRange(exp: ExperimentDefinition): boolean {
  const now = Date.now();
  if (exp.startDate && new Date(exp.startDate).getTime() > now) return false;
  if (exp.endDate   && new Date(exp.endDate).getTime()   < now) return false;
  return true;
}

// ── Eligibility check ─────────────────────────────────────────────────────────

/**
 * Returns true if an experiment should run for the given context.
 */
export function isEligible(exp: ExperimentDefinition, ctx: ExperimentContext): boolean {
  if (!exp.active) return false;
  if (!isInDateRange(exp)) return false;

  // Page targeting
  if (!exp.targetPages.includes('all') && ctx.pageType) {
    if (!exp.targetPages.includes(ctx.pageType)) return false;
  }

  // GEO targeting
  if (exp.targetGeos && ctx.geo && ctx.geo !== 'unknown') {
    if (!exp.targetGeos.includes(ctx.geo)) return false;
  }

  // Device targeting
  if (exp.targetDevices && ctx.device && ctx.device !== 'unknown') {
    if (!exp.targetDevices.includes(ctx.device)) return false;
  }

  return true;
}

// ── Main assignment function ──────────────────────────────────────────────────

/**
 * Assign a variant for a single experiment.
 *
 * Resolution order:
 *  1. URL parameter ?exp_{experimentId}={variantId} (QA / stakeholder override)
 *  2. Existing localStorage assignment (stability across page views)
 *  3. New deterministic assignment via hash(experimentId + sessionId)
 *
 * Does NOT write to localStorage — the caller (ExperimentProvider) handles
 * persistence so this function stays pure and testable.
 */
export function assignVariant(
  exp: ExperimentDefinition,
  ctx: ExperimentContext,
  overrides: Record<string, string> = {},
): ExperimentAssignment {
  // 1. URL / QA override
  const urlOverride = overrides[exp.id];
  if (urlOverride) {
    const v = exp.variants.find(v => v.id === urlOverride) ?? exp.variants[0];
    return {
      experimentId: exp.id,
      variantId:    v.id,
      variantLabel: v.label,
      source:       'url-override',
      assignedAt:   Date.now(),
    };
  }

  // 2. Existing localStorage value (stability)
  const stored = overrides[`__ls:${exp.id}`];
  if (stored) {
    const v = exp.variants.find(v => v.id === stored) ?? exp.variants[0];
    return {
      experimentId: exp.id,
      variantId:    v.id,
      variantLabel: v.label,
      source:       'localStorage',
      assignedAt:   Date.now(),
    };
  }

  // 3. Deterministic hash assignment
  const bucket  = getBucket(exp.id, ctx.sessionId);
  const variant = selectVariant(exp.variants, bucket);
  return {
    experimentId: exp.id,
    variantId:    variant.id,
    variantLabel: variant.label,
    source:       'new-assignment',
    assignedAt:   Date.now(),
  };
}

/**
 * Assign variants for a list of experiments that are eligible for the context.
 * Returns only experiments that are eligible + assigned.
 */
export function assignAll(
  experiments: ExperimentDefinition[],
  ctx: ExperimentContext,
  overrides: Record<string, string> = {},
): ExperimentAssignment[] {
  return experiments
    .filter(exp => isEligible(exp, ctx))
    .map(exp => assignVariant(exp, ctx, overrides));
}

// ── localStorage key helpers ──────────────────────────────────────────────────

export const EXP_LS_PREFIX = 'cbw_exp_';

export function lsKey(experimentId: string): string {
  return `${EXP_LS_PREFIX}${experimentId}`;
}

// ── Analytics event builders ──────────────────────────────────────────────────

export interface ExperimentViewEvent {
  event:         'cbw_experiment_view';
  experiment_id: string;
  variant_id:    string;
  variant_label: string;
  source:        string;
  page_type:     string;
  geo_code:      string;
  device_type:   string;
  session_id:    string;
  ts:            number;
}

export interface ExperimentConversionEvent {
  event:         'cbw_experiment_conversion';
  experiment_id: string;
  variant_id:    string;
  conversion_type: string;  // 'affiliate_click' | 'page_scroll_75' | 'cta_impression' etc.
  exchange?:     string;
  placement?:    string;
  page_type:     string;
  geo_code:      string;
  device_type:   string;
  session_id:    string;
  ts:            number;
}

export function buildExperimentViewEvent(
  assignment: ExperimentAssignment,
  ctx: ExperimentContext,
): ExperimentViewEvent {
  return {
    event:         'cbw_experiment_view',
    experiment_id: assignment.experimentId,
    variant_id:    assignment.variantId,
    variant_label: assignment.variantLabel,
    source:        assignment.source,
    page_type:     ctx.pageType ?? 'unknown',
    geo_code:      ctx.geo      ?? 'unknown',
    device_type:   ctx.device   ?? 'unknown',
    session_id:    ctx.sessionId,
    ts:            Date.now(),
  };
}
