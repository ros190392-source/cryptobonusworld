/**
 * verification-regions.ts — Multi-region verification architecture
 * ─────────────────────────────────────────────────────────────────
 * Defines all supported regions for bonus verification.
 * Only GLOBAL is enabled by default; others require proxy configuration.
 *
 * Used by: scripts/verify-bonus-capture.mjs (--region / --all-regions flags)
 */

export interface VerificationRegion {
  /** ISO-like region code (GLOBAL, PL, DE, RU, TR, IN, NG) */
  code: string;
  /** Human-readable label */
  label: string;
  /** BCP-47 locale tag passed to Playwright browser context */
  locale: string;
  /** Whether this region runs in scheduled verification */
  enabled: boolean;
  /**
   * Environment variable name that holds the proxy server URL for this region.
   * null = no proxy needed (GLOBAL only).
   * If set but the env var is absent/empty → skip with status proxy_not_configured.
   */
  proxyEnvKey: string | null;
  /** Operator notes */
  notes: string;
}

export const VERIFICATION_REGIONS: VerificationRegion[] = [
  {
    code: 'GLOBAL',
    label: 'Global (no proxy)',
    locale: 'en-US',
    enabled: true,
    proxyEnvKey: null,
    notes: 'Default region — no proxy required, USD locale, UTC timezone',
  },
  {
    code: 'PL',
    label: 'Poland',
    locale: 'pl-PL',
    enabled: false,
    proxyEnvKey: 'PROXY_PL',
    notes: 'Polish region — requires PL residential proxy; zloty/euro pricing may differ',
  },
  {
    code: 'DE',
    label: 'Germany',
    locale: 'de-DE',
    enabled: false,
    proxyEnvKey: 'PROXY_DE',
    notes: 'German region — BaFin restrictions may limit bonus visibility',
  },
  {
    code: 'RU',
    label: 'Russia',
    locale: 'ru-RU',
    enabled: false,
    proxyEnvKey: 'PROXY_RU',
    notes: 'Russian region — sanctions may affect exchange availability; use with caution',
  },
  {
    code: 'TR',
    label: 'Turkey',
    locale: 'tr-TR',
    enabled: false,
    proxyEnvKey: 'PROXY_TR',
    notes: 'Turkish region — MASAK regulations; high-volume crypto market',
  },
  {
    code: 'IN',
    label: 'India',
    locale: 'en-IN',
    enabled: false,
    proxyEnvKey: 'PROXY_IN',
    notes: 'Indian region — SEBI/FIU compliance; INR pricing on some exchanges',
  },
  {
    code: 'NG',
    label: 'Nigeria',
    locale: 'en-NG',
    enabled: false,
    proxyEnvKey: 'PROXY_NG',
    notes: 'Nigerian region — SEC Nigeria rules; naira/USD pairs; P2P-heavy market',
  },
];

/** Get region config by code. Throws if not found. */
export function getRegion(code: string): VerificationRegion {
  const region = VERIFICATION_REGIONS.find(r => r.code === code);
  if (!region) {
    throw new Error(
      `Unknown region: "${code}". Available: ${VERIFICATION_REGIONS.map(r => r.code).join(', ')}`
    );
  }
  return region;
}

/** Return all regions that are currently enabled. */
export function getEnabledRegions(): VerificationRegion[] {
  return VERIFICATION_REGIONS.filter(r => r.enabled);
}
