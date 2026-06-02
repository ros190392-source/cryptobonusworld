/**
 * experiments.ts — CryptoBonusWorld Experiment Registry
 *
 * Single source of truth for all A/B experiments.
 *
 * To add an experiment:
 *  1. Add a definition below with a unique id
 *  2. Set active: false initially (always launch inactive, activate when ready)
 *  3. Add the corresponding DOM transforms in ExperimentProvider.astro
 *  4. Deploy and verify with ?exp_debug=1 before activating
 *  5. Set active: true to activate
 *
 * Variant weight rules:
 *  - Weights must sum to 100 per experiment
 *  - 'control' variant always appears first (baseline for SEO / fallback)
 *  - Minimum recommended weight per variant: 10 (for statistical power)
 *
 * Naming convention:
 *  - id: "{test-target}-v{iteration}" e.g. "cta-copy-v1"
 *  - variants: 'control' always present, others descriptive
 */

import type { ExperimentDefinition } from '../utils/experimentEngine';

export const EXPERIMENTS: ExperimentDefinition[] = [

  // ── CTA Copy ──────────────────────────────────────────────────────────────
  {
    id:          'cta-copy-v1',
    description: 'Test primary CTA copy on featured table row and hero CTAs. '
                + 'Hypothesis: action-oriented copy outperforms generic "Claim".',
    active:      true,
    targetPages: ['bonuses', 'homepage', 'exchange'],
    variants: [
      {
        id:          'control',
        label:       'Claim Bonus →',
        weight:      40,
        description: 'Current copy — baseline',
      },
      {
        id:          'get-started',
        label:       'Get Started →',
        weight:      30,
        description: 'Softer entry — less commitment framing',
      },
      {
        id:          'view-offer',
        label:       'View Offer →',
        weight:      30,
        description: 'Informational framing — less pushy',
      },
    ],
  },

  // ── Trust Strip Wording ───────────────────────────────────────────────────
  {
    id:          'trust-strip-v1',
    description: 'Test trust strip variant: default factual pills vs '
                + 'social-proof-first ordering. Same facts, different emphasis.',
    active:      true,
    targetPages: ['all'],
    variants: [
      {
        id:          'control',
        label:       'Standard (Updated · 12 Reviewed · Editorial · No fake urgency)',
        weight:      50,
        description: 'Current trust pill order',
      },
      {
        id:          'social-first',
        label:       'Social-first (X+ traders · 12 Reviewed · Updated · Editorial)',
        weight:      50,
        description: 'Lead with social proof signal, editorial confirmation at end',
      },
    ],
  },

  // ── Onboarding Hint Visibility ────────────────────────────────────────────
  {
    id:          'onboarding-hint-v1',
    description: 'Test whether restricting the onboarding hint to first-session '
                + 'visitors improves engagement vs showing it to all visitors.',
    active:      true,
    targetPages: ['bonuses', 'homepage'],
    variants: [
      {
        id:          'control',
        label:       'Show for all visitors',
        weight:      50,
        description: 'Current behavior: always shown when geo matched',
      },
      {
        id:          'new-only',
        label:       'First session only (pageCount <= 2)',
        weight:      50,
        description: 'Only show hint on first 2 pageviews',
      },
    ],
  },

  // ── Sticky CTA Scroll Threshold ───────────────────────────────────────────
  {
    id:          'sticky-cta-threshold-v1',
    description: 'Test earlier sticky CTA appearance on homepage. '
                + 'Hypothesis: showing at 200px instead of 480px increases clicks.',
    active:      false, // activate after traffic ramps up
    targetPages: ['homepage'],
    targetDevices: ['mobile'],
    variants: [
      {
        id:          'control',
        label:       'Show after 480px scroll',
        weight:      50,
        description: 'Current threshold',
      },
      {
        id:          'early',
        label:       'Show after 200px scroll',
        weight:      50,
        description: 'Earlier appearance, more aggressive',
      },
    ],
  },

  // ── Compare Page Layout ───────────────────────────────────────────────────
  {
    id:          'compare-layout-v1',
    description: 'Test adding a prominent winner callout banner at the top of '
                + 'compare pages vs the current table-first layout.',
    active:      false,
    targetPages: ['compare'],
    variants: [
      {
        id:          'control',
        label:       'Current layout (table-first)',
        weight:      50,
        description: 'Existing compare page layout',
      },
      {
        id:          'winner-banner',
        label:       'Winner banner at top',
        weight:      50,
        description: 'Adds a highlighted winner callout before the comparison table',
      },
    ],
  },

  // ── Featured Exchange CTA Size ────────────────────────────────────────────
  {
    id:          'featured-cta-size-v1',
    description: 'Test whether a larger (lg) CTA on the featured table row '
                + 'improves click-through vs the current md size.',
    active:      false,
    targetPages: ['bonuses'],
    variants: [
      {
        id:          'control',
        label:       'Size md (current)',
        weight:      50,
        description: 'Current featured row CTA size',
      },
      {
        id:          'large',
        label:       'Size lg (larger tap target)',
        weight:      50,
        description: 'Larger button on featured row — more visual weight',
      },
    ],
  },

];

/**
 * Quick lookup by experiment id.
 */
export const EXPERIMENT_MAP: Record<string, ExperimentDefinition> =
  Object.fromEntries(EXPERIMENTS.map(e => [e.id, e]));

/**
 * Experiments that are currently active (ignoring date range / eligibility).
 * Used for admin dashboards and debug panels.
 */
export const ACTIVE_EXPERIMENTS = EXPERIMENTS.filter(e => e.active);
