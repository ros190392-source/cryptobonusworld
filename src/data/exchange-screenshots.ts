/**
 * CryptoBonusWorld — Exchange Screenshot Registry
 * ──────────────────────────────────────────────────────────────────────────────
 * Centralised screenshot management layer. Extends the base ScreenshotEntry
 * (from evidence/_schema.ts) with operational metadata: priority, sourceUrl,
 * locale, expiresAt, and verified flag.
 *
 * The registry is derived at module load time by merging:
 *   1. Screenshot status/path data from evidence JSON files (source of truth)
 *   2. Static operational metadata defined in CAPTURE_URLS / PRIORITY_RANK
 *
 * Import helpers from src/utils/exchangeScreenshots.ts — do NOT query
 * SCREENSHOT_REGISTRY directly in components.
 *
 * Screenshot path convention:
 *   /screenshots/{exchange}/{category}/{geo}-{device}-{yyyy-mm}.webp
 *   e.g. /screenshots/bybit/registration/global-desktop-2026-06.webp
 */

import type { ScreenshotCategory, ScreenshotStatus } from './evidence/_schema';
import { getExchangeEvidence, getAllEvidenceSlugs } from './evidence';

// ── Types ─────────────────────────────────────────────────────────────────────

export type { ScreenshotCategory, ScreenshotStatus };

/** Capture-priority band — drives the recommended capture queue */
export type ScreenshotPriority = 'P1' | 'P2' | 'P3' | 'P4';

/** Supported locale codes (en-only active; others reserved for future) */
export type ScreenshotLocale = 'en' | 'ru' | 'pl' | 'tr' | 'es' | 'pt' | 'id' | 'hi';

/**
 * Extended screenshot entry — combines evidence file fields with operational metadata.
 * One entry per (exchange × category × geo × locale × device) combination.
 * Currently every exchange has exactly one entry per category (the GLOBAL/en/desktop variant).
 */
export interface ExtendedScreenshotEntry {
  /** Exchange slug — matches exchanges.json */
  exchange: string;
  /** Screenshot category */
  category: ScreenshotCategory;
  /** Current capture status */
  status: ScreenshotStatus;
  /** Path relative to /public — null until screenshot is on disk */
  path: string | null;
  /** ISO YYYY-MM when this screenshot was captured */
  capturedAt: string | null;
  /**
   * ISO YYYY-MM when this screenshot expires (capturedAt + 90 days).
   * null if not yet captured. After this date the screenshot should be recaptured.
   */
  expiresAt: string | null;
  /** Geographic variant: "GLOBAL" | "US" | "EU" | "ASIA" | "PL" | etc. */
  geo: string;
  /** Device form factor */
  device: 'desktop' | 'mobile';
  /** Locale this screenshot targets */
  locale: ScreenshotLocale;
  /** True if a human has verified the screenshot reflects the current UI */
  verified: boolean;
  /** Capture priority derived from exchange tier */
  priority: ScreenshotPriority;
  /** URL to visit when capturing this screenshot */
  sourceUrl: string | null;
  /** Editorial notes (e.g. "only visible after login") */
  notes?: string;
}

/**
 * All screenshot entries for one exchange.
 */
export interface ExchangeScreenshotRecord {
  slug: string;
  priority: ScreenshotPriority;
  /** Flat list of all entries for this exchange (one per category/variant) */
  entries: ExtendedScreenshotEntry[];
}

/**
 * Options for screenshot resolution helpers.
 */
export interface ScreenshotOptions {
  geo?: string;
  locale?: ScreenshotLocale;
  device?: 'desktop' | 'mobile';
  /** Only return entries with status = 'available' */
  availableOnly?: boolean;
}

/**
 * Result of a screenshot lookup — includes fallback source information.
 */
export interface ResolvedScreenshot {
  entry: ExtendedScreenshotEntry;
  /** How the match was found */
  matchSource:
    | 'exact'           // geo + locale + device all matched
    | 'geo_device'      // geo + device matched (locale ignored)
    | 'locale_device'   // locale + device matched (geo ignored)
    | 'global_default'  // GLOBAL + en + desktop fallback
    | 'any_available';  // First available entry (last resort)
}

// ── Priority ranking ──────────────────────────────────────────────────────────

const PRIORITY_RANK: Readonly<Record<string, number>> = {
  binance:  1,
  okx:      2,
  mexc:     3,
  bitget:   4,
  coinbase: 5,
  bingx:    6,
  bybit:    7,
  'gate-io':8,
  kucoin:   9,
  htx:      10,
  coinex:   11,
  phemex:   12,
  bitunix:  13,
  lbank:    14,
};

export function getExchangePriority(slug: string): ScreenshotPriority {
  const rank = PRIORITY_RANK[slug] ?? 99;
  if (rank <= 3)  return 'P1';
  if (rank <= 6)  return 'P2';
  if (rank <= 10) return 'P3';
  return 'P4';
}

// ── Capture source URLs ───────────────────────────────────────────────────────

/**
 * Canonical URL to visit when capturing a screenshot for each exchange × category.
 * null means either the category is not_applicable or the URL is not yet defined.
 */
export const CAPTURE_URLS: Readonly<Record<string, Partial<Record<ScreenshotCategory, string | null>>>> = {
  bybit: {
    registration:       'https://www.bybit.com/en/register',
    kyc:                'https://www.bybit.com/user/identity/personal',
    bonus:              'https://www.bybit.com/en/activity/',
    deposit:            'https://www.bybit.com/user/assets/home',
    p2p:                'https://www.bybit.com/en/p2p/',
    spot:               'https://www.bybit.com/en/trade/spot/BTC/USDT',
    futures:            'https://www.bybit.com/trade/usdt/BTCUSDT',
    fees:               'https://www.bybit.com/en/help-center/article/Trading-Fee-Structure',
    mobile_app:         'https://apps.apple.com/app/bybit/id1488296980',
    proof_of_reserves:  'https://www.bybit.com/en/proof-of-reserves/',
  },
  binance: {
    registration:       'https://www.binance.com/en/register',
    kyc:                'https://www.binance.com/en/my/settings/profile',
    bonus:              'https://www.binance.com/en/activity/',
    deposit:            'https://www.binance.com/en/my/wallet/account/main',
    p2p:                'https://p2p.binance.com/en',
    spot:               'https://www.binance.com/en/trade/BTC_USDT',
    futures:            'https://www.binance.com/en/futures/BTCUSDT',
    fees:               'https://www.binance.com/en/fee/schedule',
    mobile_app:         'https://apps.apple.com/app/binance/id1436799971',
    proof_of_reserves:  'https://www.binance.com/en/proof-of-reserves',
  },
  mexc: {
    registration:       'https://www.mexc.com/register',
    kyc:                null,
    bonus:              'https://www.mexc.com/en-US/activity',
    deposit:            'https://www.mexc.com/assets/deposit',
    p2p:                'https://www.mexc.com/p2p',
    spot:               'https://www.mexc.com/exchange/BTC_USDT',
    futures:            'https://futures.mexc.com/exchange/BTC_USDT',
    fees:               'https://www.mexc.com/fee',
    mobile_app:         'https://apps.apple.com/app/mexc/id1581119500',
    proof_of_reserves:  null,
  },
  okx: {
    registration:       'https://www.okx.com/join',
    kyc:                'https://www.okx.com/account/kyc',
    bonus:              'https://www.okx.com/campaigns/new-user',
    deposit:            'https://www.okx.com/balance/recharge',
    p2p:                null,
    spot:               'https://www.okx.com/trade-spot/btc-usdt',
    futures:            'https://www.okx.com/trade-futures/btc-usdt-swap',
    fees:               'https://www.okx.com/fees',
    mobile_app:         'https://apps.apple.com/app/okx/id1327268470',
    proof_of_reserves:  'https://www.okx.com/proof-of-reserves',
  },
  bitget: {
    registration:       'https://www.bitget.com/register',
    kyc:                'https://www.bitget.com/account/verify',
    bonus:              'https://www.bitget.com/en/activity',
    deposit:            'https://www.bitget.com/asset/recharge',
    p2p:                null,
    spot:               'https://www.bitget.com/spot/BTCUSDT',
    futures:            'https://www.bitget.com/futures/usdt/BTCUSDT',
    fees:               'https://www.bitget.com/rate',
    mobile_app:         'https://apps.apple.com/app/bitget/id1488296980',
    proof_of_reserves:  'https://www.bitget.com/en/proof-of-reserves',
  },
  bingx: {
    registration:       'https://bingxdao.com/partner/CRYPTOBONUSWORLD/',
    kyc:                'https://bingx.com/account/kyc',
    bonus:              'https://bingx.com/en-us/activity/',
    deposit:            'https://bingx.com/en-us/asset/',
    p2p:                null,
    spot:               'https://bingx.com/en-us/spot/BTCUSDT/',
    futures:            'https://bingx.com/en-us/perpetual/BTC-USDT/',
    fees:               'https://bingx.com/en-us/support/fee/',
    mobile_app:         'https://apps.apple.com/app/bingx/id1498241566',
    proof_of_reserves:  null,
  },
  'gate-io': {
    registration:       'https://www.gate.io/signup',
    kyc:                'https://www.gate.io/settings/kyc',
    bonus:              'https://www.gate.io/activity',
    deposit:            'https://www.gate.io/myaccount/deposit',
    p2p:                'https://www.gate.io/p2p',
    spot:               'https://www.gate.io/trade/BTC_USDT',
    futures:            'https://www.gate.io/futures_trade/usdt/btc_usdt',
    fees:               'https://www.gate.io/fee',
    mobile_app:         'https://apps.apple.com/app/gate-io/id1294980941',
    proof_of_reserves:  'https://www.gate.io/proof_of_assets',
  },
  kucoin: {
    registration:       'https://www.kucoin.com/ucenter/signup',
    kyc:                null,
    bonus:              'https://www.kucoin.com/activity',
    deposit:            'https://www.kucoin.com/assets/main',
    p2p:                'https://www.kucoin.com/otc',
    spot:               'https://www.kucoin.com/trade/BTC-USDT',
    futures:            'https://www.kucoin.com/futures/trade/XBTUSDTM',
    fees:               'https://www.kucoin.com/vip/level',
    mobile_app:         'https://apps.apple.com/app/kucoin/id1378956601',
    proof_of_reserves:  'https://www.kucoin.com/legal/proof-of-reserves',
  },
  htx: {
    registration:       'https://www.htx.com/en-us/register',
    kyc:                'https://www.htx.com/en-us/pro/user-center/auth',
    bonus:              'https://www.htx.com/en-us/topic/newbie/',
    deposit:            'https://www.htx.com/en-us/finance/deposit/',
    p2p:                'https://otc.htx.com/en-us/trade/buy/usdt',
    spot:               'https://www.htx.com/en-us/trade/btc_usdt',
    futures:            'https://futures.htx.com/en-us/linear_swap/exchange/',
    fees:               'https://www.htx.com/en-us/about/fee/',
    mobile_app:         'https://apps.apple.com/app/htx/id1023263449',
    proof_of_reserves:  null,
  },
  coinex: {
    registration:       'https://www.coinex.com/register',
    kyc:                null,
    bonus:              'https://www.coinex.com/activity',
    deposit:            'https://www.coinex.com/asset/deposit',
    p2p:                null,
    spot:               'https://www.coinex.com/exchange/BTC-USDT',
    futures:            'https://www.coinex.com/futures/BTC-USDT',
    fees:               'https://www.coinex.com/fees',
    mobile_app:         'https://apps.apple.com/app/coinex/id1378251936',
    proof_of_reserves:  'https://www.coinex.com/proof-of-reserves',
  },
  phemex: {
    registration:       'https://phemex.com/register',
    kyc:                null,
    bonus:              'https://phemex.com/activity',
    deposit:            'https://phemex.com/assets/deposit',
    p2p:                null,
    spot:               'https://phemex.com/spot/trade/BTC-USDT',
    futures:            'https://phemex.com/trade/BTCUSD',
    fees:               'https://phemex.com/rate-limits',
    mobile_app:         'https://apps.apple.com/app/phemex/id1436830174',
    proof_of_reserves:  'https://phemex.com/proof-of-reserves',
  },
  bitunix: {
    registration:       'https://www.bitunix.com/register',
    kyc:                'https://www.bitunix.com/account/kyc',
    bonus:              'https://www.bitunix.com/activity',
    deposit:            'https://www.bitunix.com/assets',
    p2p:                null,
    spot:               'https://www.bitunix.com/trade/BTCUSDT',
    futures:            'https://www.bitunix.com/futures/BTC',
    fees:               'https://www.bitunix.com/fee-rate',
    mobile_app:         'https://apps.apple.com/app/bitunix/id6472929966',
    proof_of_reserves:  null,
  },
  lbank: {
    registration:       'https://www.lbank.com/en-US/register/',
    kyc:                'https://www.lbank.com/en-US/user/auth/',
    bonus:              'https://www.lbank.com/en-US/activity/',
    deposit:            'https://www.lbank.com/en-US/finance/',
    p2p:                null,
    spot:               'https://www.lbank.com/en-US/trade/btc_usdt/',
    futures:            'https://futures.lbank.com/trade/btcusdt',
    fees:               'https://www.lbank.com/en-US/docs/index.html#fees',
    mobile_app:         'https://apps.apple.com/app/lbank/id1443638925',
    proof_of_reserves:  null,
  },
  coinbase: {
    registration:       'https://www.coinbase.com/signup',
    kyc:                'https://www.coinbase.com/verify',
    bonus:              'https://www.coinbase.com/earn',
    deposit:            'https://www.coinbase.com/assets',
    p2p:                null,
    spot:               'https://www.coinbase.com/advanced-trade/spot/BTC-USD',
    futures:            null,
    fees:               'https://www.coinbase.com/legal/fees',
    mobile_app:         'https://apps.apple.com/app/coinbase/id886427730',
    proof_of_reserves:  null,
  },
};

// ── Registry builder ──────────────────────────────────────────────────────────

/**
 * Compute the ISO YYYY-MM expiry date (capturedAt + 90 days).
 */
function computeExpiresAt(capturedAt: string | null): string | null {
  if (!capturedAt) return null;
  const d = new Date(capturedAt.length === 7 ? capturedAt + '-01' : capturedAt);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + 90);
  return d.toISOString().slice(0, 7);
}

/**
 * Build the full registry by merging evidence screenshot data with static metadata.
 * Called once at module initialisation.
 */
function buildRegistry(): ExchangeScreenshotRecord[] {
  const slugs = getAllEvidenceSlugs();

  return slugs
    .map(slug => {
      const ev = getExchangeEvidence(slug);
      if (!ev) return null;

      const priority = getExchangePriority(slug);
      const entries: ExtendedScreenshotEntry[] = [];

      for (const [cat, raw] of Object.entries(ev.screenshots ?? {})) {
        const category = cat as ScreenshotCategory;
        entries.push({
          exchange:   slug,
          category,
          status:     raw.status,
          path:       raw.path ?? null,
          capturedAt: raw.capturedAt ?? null,
          expiresAt:  computeExpiresAt(raw.capturedAt ?? null),
          geo:        raw.geo ?? 'GLOBAL',
          device:     raw.device ?? 'desktop',
          locale:     'en',
          verified:   false,
          priority,
          sourceUrl:  CAPTURE_URLS[slug]?.[category] ?? null,
          notes:      raw.notes,
        });
      }

      return { slug, priority, entries };
    })
    .filter((r): r is ExchangeScreenshotRecord => r !== null)
    .sort((a, b) => (PRIORITY_RANK[a.slug] ?? 99) - (PRIORITY_RANK[b.slug] ?? 99));
}

/** Full screenshot registry — one record per exchange, sorted by priority. */
export const SCREENSHOT_REGISTRY: ExchangeScreenshotRecord[] = buildRegistry();

/** Fast slug → record lookup map. */
export const SCREENSHOT_REGISTRY_MAP: ReadonlyMap<string, ExchangeScreenshotRecord> =
  new Map(SCREENSHOT_REGISTRY.map(r => [r.slug, r]));

/** All 10 canonical screenshot categories in display order. */
export const ALL_CATEGORIES: ScreenshotCategory[] = [
  'registration', 'kyc', 'bonus', 'deposit', 'p2p',
  'spot', 'futures', 'fees', 'mobile_app', 'proof_of_reserves',
];

// ── Convenience accessors ─────────────────────────────────────────────────────

/** Return all entries for a specific exchange, or [] if exchange not found. */
export function getExchangeEntries(slug: string): ExtendedScreenshotEntry[] {
  return SCREENSHOT_REGISTRY_MAP.get(slug)?.entries ?? [];
}

/** Return all available entries across all exchanges. */
export function getAllAvailableEntries(): ExtendedScreenshotEntry[] {
  return SCREENSHOT_REGISTRY.flatMap(r => r.entries.filter(e => e.status === 'available'));
}

/** Return all missing/needs_capture entries across all exchanges. */
export function getAllMissingEntries(): ExtendedScreenshotEntry[] {
  return SCREENSHOT_REGISTRY.flatMap(r =>
    r.entries.filter(e => e.status === 'missing' || e.status === 'needs_manual_capture'),
  );
}

/** Return all outdated entries across all exchanges. */
export function getAllOutdatedEntries(): ExtendedScreenshotEntry[] {
  return SCREENSHOT_REGISTRY.flatMap(r => r.entries.filter(e => e.status === 'outdated'));
}
