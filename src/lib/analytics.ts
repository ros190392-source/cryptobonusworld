/**
 * analytics.ts — CryptoBonusWorld central analytics utility.
 *
 * Single source of truth for ALL conversion/goal tracking.
 * Dispatches every event to three layers simultaneously:
 *   1. Yandex Metrika  → window.cbwTrackYM()   (counter 109562447)
 *   2. GA4 / GTM       → window.dataLayer[]     (when GTM_ID or GA4_ID is set)
 *   3. CBW internal    → window.cbw.events[]    (in-page event log)
 *
 * Usage (TypeScript):
 *   import { analytics } from '$lib/analytics';
 *   analytics.trackExchangeClick({ exchange: 'bybit', placement: 'hero' });
 *
 * Usage (inline / non-module script):
 *   window.cbwAnalytics.trackExchangeClick({ exchange: 'bybit', placement: 'hero' });
 *
 * Debug mode: in dev, every dispatch logs to console with gold label.
 * No cookies. No PII. No cross-site tracking.
 */

// ── Event parameter interfaces ────────────────────────────────────────────────

/** Primary affiliate CTA click — covers hero, sticky, card, table, compare, alternatives */
export interface ExchangeClickParams {
  exchange:  string;
  placement: string;
  page?:     string;
}

/** Every outbound affiliate navigation */
export interface AffiliateOutboundParams {
  exchange:  string;
  url:       string;
  placement: string;
}

/** User copied a promo/referral code */
export interface BonusCopyParams {
  exchange: string;   // exchange slug
  code:     string;   // the code that was copied
}

/** User opened an FAQ accordion item */
export interface FAQExpandParams {
  question:  string;   // first 80 chars of question text
  exchange?: string;   // exchange slug if on exchange page
}

/** Click anywhere inside the ExchangeVerdictBlock */
export interface VerdictInteractionParams {
  exchange: string;
  section:  'best-for' | 'avoid-if' | 'limitation' | 'verdict';
}

/** Scroll depth milestone */
export interface ScrollDepthParams {
  depth: 50 | 90;
}

// ── Core dispatch engine ──────────────────────────────────────────────────────

type EventParams = Record<string, unknown>;

/** Dev-only: structured console group for each dispatched event */
const IS_DEV = import.meta.env.DEV;

function debug(eventName: string, params: EventParams): void {
  if (!IS_DEV) return;
  console.groupCollapsed(
    `%c[CBW Analytics] ${eventName}`,
    'color:#F5C542;font-weight:700;font-family:monospace'
  );
  console.table(params);
  console.groupEnd();
}

/**
 * Core dispatcher — fires synchronously to all three providers.
 * Wrapped in individual try/catch so one failing provider never blocks others.
 */
function dispatch(eventName: string, params: EventParams = {}): void {
  debug(eventName, params);

  // 1. Yandex Metrika
  try {
    if (typeof (window as any).cbwTrackYM === 'function') {
      (window as any).cbwTrackYM(eventName, params);
    }
  } catch (_) {}

  // 2. GA4 / GTM dataLayer
  try {
    const dl = (window as any).dataLayer;
    if (Array.isArray(dl)) {
      dl.push({ event: eventName, ...params });
    }
  } catch (_) {}

  // 3. CBW internal event log (for PostHog, Plausible, A/B experiments)
  try {
    if (typeof (window as any).cbw?.track === 'function') {
      (window as any).cbw.track(eventName, params);
    }
  } catch (_) {}
}

// ── Named tracking functions ──────────────────────────────────────────────────

export const analytics = {
  /**
   * Affiliate CTA clicked.
   * Goal: exchange_click
   * Fires on: hero, sticky, card, table, compare, alternatives placements.
   */
  trackExchangeClick(p: ExchangeClickParams): void {
    dispatch('exchange_click', {
      exchange:  p.exchange,
      placement: p.placement,
      page:      p.page ?? (typeof window !== 'undefined' ? window.location.pathname : ''),
    });
  },

  /**
   * Any outbound affiliate navigation.
   * Goal: affiliate_outbound
   * Fires alongside exchange_click — captures the destination URL.
   */
  trackAffiliateOutbound(p: AffiliateOutboundParams): void {
    dispatch('affiliate_outbound', {
      exchange:  p.exchange,
      url:       p.url,
      placement: p.placement,
    });
  },

  /**
   * Promo/referral code copied.
   * Goal: bonus_copy
   */
  trackBonusCopy(p: BonusCopyParams): void {
    dispatch('bonus_copy', {
      exchange: p.exchange,
      code:     p.code,
    });
  },

  /**
   * FAQ accordion opened by user.
   * Goal: faq_expand
   * Note: only fires on user-initiated opens, not the pre-opened first item.
   */
  trackFAQExpand(p: FAQExpandParams): void {
    dispatch('faq_expand', {
      question: p.question,
      exchange: p.exchange ?? '',
      page:     typeof window !== 'undefined' ? window.location.pathname : '',
    });
  },

  /**
   * Scroll milestone reached.
   * Goals: scroll_50 | scroll_90
   * Each fires at most once per page load (deduplicated by Analytics.astro).
   */
  trackScrollDepth(p: ScrollDepthParams): void {
    dispatch(p.depth === 50 ? 'scroll_50' : 'scroll_90', {
      depth: p.depth,
      page:  typeof window !== 'undefined' ? window.location.pathname : '',
    });
  },

  /**
   * Click inside the Quick Verdict block.
   * Goal: verdict_interaction
   */
  trackVerdictInteraction(p: VerdictInteractionParams): void {
    dispatch('verdict_interaction', {
      exchange: p.exchange,
      section:  p.section,
    });
  },

  // NOTE: trackCompareClick / trackCountryPageVisit / trackCoinPageVisit were
  // removed with Legacy Sections Retirement v1 (2026-07-14) — the /compare/,
  // /countries/ and /coins/ routes that produced those events no longer exist.
};

// Attach to window so non-module inline scripts can call it:
//   window.cbwAnalytics.trackBonusCopy({ exchange: 'bybit', code: 'CRYPTO' })
if (typeof window !== 'undefined') {
  (window as any).cbwAnalytics = analytics;
}

export default analytics;
