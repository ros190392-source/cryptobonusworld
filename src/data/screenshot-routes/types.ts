/**
 * Screenshot route map type definitions
 * Canonical source for orchestrate-screenshot-capture.mjs and future Astro components
 */

/**
 * Safety classification for each route.
 *
 *   PUBLIC           — no login needed, no sensitive content possible
 *   AFFILIATE_PUBLIC — navigate via affiliate URL; track ref-code survival + bonus visibility
 *   AUTH_SAFE        — requires saved session; content is safe with blur applied;
 *                      forbiddenSelectors checked at runtime — abort if triggered
 *   AUTH_SENSITIVE   — NEVER automate; sensitive content that cannot be safely blurred
 *                      (withdrawal, API keys, security settings, identity docs, QR codes)
 *   AUTHED           — legacy alias for AUTH_SAFE (requires session + blur)
 *   SKIP             — never automate; document upload, KYC identity, etc.
 *   MANUAL           — too complex/region-restricted/unreliable for automation
 */
export type SafetyLevel =
  | 'PUBLIC'
  | 'AFFILIATE_PUBLIC'
  | 'AUTH_SAFE'
  | 'AUTH_SENSITIVE'
  | 'AUTHED'
  | 'SKIP'
  | 'MANUAL';

/** Capture priority: 1 = highest, 3 = lowest */
export type Priority = 1 | 2 | 3;

export interface Viewport {
  width: number;
  height: number;
}

/**
 * Route configuration for a single exchange category screenshot.
 *
 * Safety levels:
 *   PUBLIC  — no login needed, no sensitive content possible
 *   AUTHED  — requires saved session; safe with blur applied
 *   SKIP    — never automate (KYC, withdrawals, API keys, 2FA, identity docs)
 *   MANUAL  — too complex/region-restricted/unreliable for automation
 */
export interface RouteConfig {
  /** Page URL to navigate to for capture */
  url?: string;
  /** Safety classification — determines if automation is allowed */
  safety: SafetyLevel;
  /** Reason for SKIP/MANUAL classification */
  skipReason?: string;
  /** Requires a loaded auth session from .auth/{exchange}.json */
  requiresAuth?: boolean;
  /** Browser viewport dimensions */
  viewport?: Viewport;
  /** Capture full scrollable page height (default: false) */
  fullPage?: boolean;
  /** CSS selector to wait for before capturing (confirms page loaded) */
  waitForSelector?: string;
  /** Extra wait time after selector found, in ms (for charts/animations) */
  waitForTimeout?: number;
  /** Additional page-specific CSS selectors to blur */
  blurSelectors?: string[];
  /** Capture priority (1 = must have, 2 = should have, 3 = nice to have) */
  priority?: Priority;
  /** ISO-3166 region codes where this route is available (undefined = all) */
  allowedRegions?: string[];
  /** CSS selectors that must be present for quality validation to pass */
  expectedSelectors?: string[];
  /** CSS selectors that must NOT be present (triggers safety abort) */
  forbiddenSelectors?: string[];
  /** Annotation preset name to apply from assets/annotations/ */
  annotationPreset?: string;
  /**
   * Capture device type.
   *   desktop    — 1440×900, desktop Chrome UA (default)
   *   mobile-web — 390×844, iPhone Safari UA, isMobile+touch enabled
   *   mobile-app — App Store / Play Store listing at mobile viewport
   */
  device?: 'desktop' | 'mobile-web' | 'mobile-app';
  /** Human notes about this route */
  notes?: string;
}

/** Exchange route map: category slug → RouteConfig */
export type RouteMap = Record<string, RouteConfig>;

/** All exchanges route map */
export type AllRouteMaps = Record<string, RouteMap>;
