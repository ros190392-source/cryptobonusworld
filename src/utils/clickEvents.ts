/**
 * clickEvents.ts — CryptoBonusWorld Normalized Affiliate Click Events
 *
 * Provides a single structured click event format that can be forwarded
 * to any analytics provider without lock-in:
 *
 *   Provider adapters (all noop until the provider is configured):
 *   - PostHog         → window.posthog.capture()
 *   - GA4             → window.dataLayer.push() (gtag format)
 *   - ClickHouse      → fetch() to /api/events (future endpoint)
 *   - Custom BI       → CustomEvent 'cbw:click' on document
 *   - GTM dataLayer   → window.dataLayer.push()
 *
 * Pure TypeScript — no DOM types imported here; DOM calls are in the
 * client-side inline script in Analytics.astro, which calls emitClickEvent().
 *
 * Schema versioned at v1 — bump SCHEMA_VERSION when adding required fields.
 */

export const SCHEMA_VERSION = 1;

// ── Click event schema ────────────────────────────────────────────────────────

export interface AffiliateClickEvent {
  /** Schema version — allows downstream consumers to handle migrations */
  schema_version: number;
  /** Event name — always 'cbw_affiliate_click' */
  event: 'cbw_affiliate_click';
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Unix milliseconds (for ClickHouse / low-latency consumers) */
  ts: number;

  // ── Exchange context ────────────────────────────────────────────────────────
  exchange: string;           // exchange slug e.g. 'bybit'
  exchange_name?: string;     // display name e.g. 'Bybit'
  bonus_amount?: number;      // USDT amount at time of click
  bonus_currency?: string;    // e.g. 'USDT'

  // ── Click placement ─────────────────────────────────────────────────────────
  placement: string;          // e.g. 'table-featured', 'hero', 'requirements-cta'
  page_type: string;          // 'homepage' | 'exchange' | 'compare' | 'category' | 'country'
  path: string;               // window.location.pathname at click time

  // ── Visitor context ─────────────────────────────────────────────────────────
  geo_code: string;           // 'tr' | 'in' | ... | 'unknown'
  device_type: string;        // 'mobile' | 'tablet' | 'desktop'
  session_id: string;         // sessionStorage cbw_sid
  ab_variant?: string;        // A/B experiment variant
  ab_experiment?: string;     // A/B experiment name

  // ── Link provenance ─────────────────────────────────────────────────────────
  link_source?: 'geo' | 'default' | 'fallback-page';  // from ResolvedLink
  href: string;               // final URL clicked (after GEO swap)
  is_go_redirect: boolean;    // true if href is /go/{exchange}/

  // ── Ranking context ─────────────────────────────────────────────────────────
  contextual_rank?: number;   // position in recommendation engine output (1-indexed)
  compare_pair?: string;      // 'bybit-vs-mexc' if on a compare page

  // ── Content context ─────────────────────────────────────────────────────────
  exchange_slug?: string;     // page exchange slug (for exchange pages)
}

// ── Builder ───────────────────────────────────────────────────────────────────

/**
 * Build a normalised AffiliateClickEvent from raw click data.
 * Safe to call with partial data — uses safe defaults throughout.
 */
export function buildClickEvent(params: Partial<AffiliateClickEvent> & {
  exchange: string;
  placement: string;
}): AffiliateClickEvent {
  const now = Date.now();
  return {
    schema_version:  SCHEMA_VERSION,
    event:           'cbw_affiliate_click',
    timestamp:       new Date(now).toISOString(),
    ts:              now,
    exchange:        params.exchange,
    exchange_name:   params.exchange_name,
    bonus_amount:    params.bonus_amount,
    bonus_currency:  params.bonus_currency ?? 'USDT',
    placement:       params.placement,
    page_type:       params.page_type       ?? 'unknown',
    path:            params.path            ?? '/',
    geo_code:        params.geo_code        ?? 'unknown',
    device_type:     params.device_type     ?? 'unknown',
    session_id:      params.session_id      ?? 'unknown',
    ab_variant:      params.ab_variant,
    ab_experiment:   params.ab_experiment,
    link_source:     params.link_source,
    href:            params.href            ?? '#',
    is_go_redirect:  params.is_go_redirect  ?? false,
    contextual_rank: params.contextual_rank,
    compare_pair:    params.compare_pair,
    exchange_slug:   params.exchange_slug,
  };
}

// ── Provider adapters ─────────────────────────────────────────────────────────
// All are noops until the respective provider is configured.
// They are intentionally separate functions so each can be enabled independently.

/**
 * PostHog — noop until window.posthog is installed.
 * Wire: <script>!function(t,e){...}(window, document)</script> in Layout.astro
 */
export function emitToPostHog(event: AffiliateClickEvent, win: Window): void {
  try {
    const ph = (win as any).posthog;
    if (typeof ph?.capture === 'function') {
      ph.capture(event.event, {
        exchange:         event.exchange,
        placement:        event.placement,
        page_type:        event.page_type,
        geo_code:         event.geo_code,
        device_type:      event.device_type,
        bonus_amount:     event.bonus_amount,
        link_source:      event.link_source,
        contextual_rank:  event.contextual_rank,
        compare_pair:     event.compare_pair,
        ab_variant:       event.ab_variant,
        is_go_redirect:   event.is_go_redirect,
      });
    }
  } catch { /* noop */ }
}

/**
 * GA4 — pushes to window.dataLayer in gtag event format.
 * Wire: gtag('config', 'G-XXXXXXXX') in Layout.astro or GTM.
 */
export function emitToGA4(event: AffiliateClickEvent, win: Window): void {
  try {
    const dl = (win as any).dataLayer;
    if (Array.isArray(dl)) {
      dl.push({
        event:            'cbw_affiliate_click',
        exchange:         event.exchange,
        placement:        event.placement,
        page_type:        event.page_type,
        geo_code:         event.geo_code,
        bonus_amount:     event.bonus_amount,
        contextual_rank:  event.contextual_rank,
        compare_pair:     event.compare_pair,
        ab_variant:       event.ab_variant,
        link_source:      event.link_source,
      });
    }
  } catch { /* noop */ }
}

/**
 * ClickHouse / custom BI endpoint — noop until /api/events is available.
 * When wired: POST JSON to your ingest endpoint.
 * Example endpoint: https://events.cryptobonusworld.com/v1/events
 */
export function emitToClickHouse(event: AffiliateClickEvent): void {
  // Noop placeholder — uncomment and fill endpoint when ready:
  //
  // const ENDPOINT = 'https://events.cryptobonusworld.com/v1/events';
  // try {
  //   navigator.sendBeacon(ENDPOINT, JSON.stringify(event));
  // } catch { /* noop */ }
  void event; // suppress unused-variable warning
}

/**
 * Custom BI via CustomEvent on document.
 * Always fires — allows any local listener to receive click data.
 * Use: document.addEventListener('cbw:click', e => console.log(e.detail))
 */
export function emitCustomEvent(event: AffiliateClickEvent, doc: Document): void {
  try {
    doc.dispatchEvent(new CustomEvent('cbw:click', { detail: event, bubbles: true }));
  } catch { /* noop */ }
}

/**
 * Dispatch a click event to ALL configured providers.
 * This is the single call site used by Analytics.astro and /go/ redirect pages.
 *
 * NOTE: this function is designed to be copy-pasted into an is:inline script
 * context where TypeScript types are not available. The runtime shape is identical.
 */
export function emitAllProviders(event: AffiliateClickEvent, win: Window, doc: Document): void {
  emitToPostHog(event, win);
  emitToGA4(event, win);
  emitToClickHouse(event);
  emitCustomEvent(event, doc);
}
