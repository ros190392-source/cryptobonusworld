/**
 * screenshot-registry.ts — Screenshot Registry v1
 * ─────────────────────────────────────────────────
 * Single source of truth for every screenshot slot in CryptoBonusWorld.
 * One entry per (exchange × category × region × device) combination.
 *
 * Consumed by:
 *   - scripts/audit-screenshot-registry.mjs  (health checks + reports)
 *   - scripts/harvest-exchange-screenshots.mjs (capture pipeline)
 *   - scripts/approve-screenshots.mjs          (approval queue)
 *   - src/utils/exchangeScreenshots.ts         (Astro components)
 *
 * ID convention:  {exchange}-{category}-{region.toLowerCase()}-{device}
 * Path convention: /screenshots/{exchange}/{category}/{region.lower}-{device}-{YYYY-MM}.webp
 */

import { getExchangeEvidence, getAllEvidenceSlugs } from './evidence/index.js';
import type { ScreenshotCategory, ScreenshotStatus } from './evidence/_schema.js';

// ── Extended category type ────────────────────────────────────────────────────

/** All supported screenshot categories (standard + extended route-map categories). */
export type RegistryCategory =
  | ScreenshotCategory               // 10 canonical categories from evidence schema
  | 'bonus_referral_landing'         // affiliate landing page with ref-code
  | 'registration_mobile'            // registration at mobile viewport
  | 'kyc_status_safe'                // KYC level page (auth, blurred)
  | 'kyc_info';                      // Public KYC help/FAQ page

// ── Safety levels ─────────────────────────────────────────────────────────────

export type RegistrySafetyLevel =
  | 'PUBLIC'
  | 'AFFILIATE_PUBLIC'
  | 'AUTH_SAFE'
  | 'AUTH_SENSITIVE'
  | 'AUTHED'
  | 'SKIP'
  | 'MANUAL';

// ── SEO importance ────────────────────────────────────────────────────────────

export type SeoImportance = 'high' | 'medium' | 'low';

// ── Main entry interface ──────────────────────────────────────────────────────

export interface ScreenshotRegistryEntry {
  /**
   * Globally unique identifier.
   * Format: {exchange}-{category}-{region.toLowerCase()}-{device}
   * Example: binance-registration-global-desktop
   */
  id: string;

  /** Exchange slug — matches exchanges.json */
  exchange: string;

  /** Screenshot category */
  category: RegistryCategory;

  /** Geographic region code (GLOBAL | PL | DE | …) */
  region: string;

  /** BCP-47 locale used during capture */
  locale: string;

  /** Device type used for capture */
  device: 'desktop' | 'mobile-web' | 'mobile-app';

  /** URL to navigate to for this capture. null = not yet defined or SKIP/MANUAL. */
  captureUrl: string | null;

  /** Whether a saved auth session is required */
  requiresAuth: boolean;

  /** Safety classification — determines automation eligibility */
  safetyLevel: RegistrySafetyLevel;

  /** CSS selector to wait for before capturing (confirms page loaded) */
  selector: string | null;

  /** Annotation preset name from assets/annotations/ */
  annotationPreset: string | null;

  /**
   * Expected output path relative to /public.
   * null until first capture.
   * Follows: /screenshots/{exchange}/{category}/{region.lower}-{device}-{YYYY-MM}.webp
   */
  outputPath: string | null;

  /** Current lifecycle status */
  status: ScreenshotStatus;

  /**
   * Capture priority.
   * 1 = must-have (P1 exchanges, high-traffic categories)
   * 2 = should-have
   * 3 = nice-to-have
   */
  priority: 1 | 2 | 3;

  /** Editorial SEO importance of this screenshot for content quality */
  seoImportance: SeoImportance;

  /**
   * Whether this entry should be automatically recaptured when a bonus
   * mismatch or screenshot hash change is detected.
   */
  autoRefresh: boolean;

  /** ISO timestamp of last successful capture (YYYY-MM or full ISO) */
  lastCapturedAt: string | null;

  /** ISO timestamp of last human approval */
  lastApprovedAt: string | null;

  /** SHA-256 hash of the last approved screenshot file */
  lastApprovedHash: string | null;

  /**
   * Relative path to the evidence JSON file that tracks this exchange.
   * Format: src/data/evidence/{exchange}.json
   */
  evidencePath: string | null;

  /** Human-readable notes about this entry */
  notes: string;
}

// ── Static category metadata ──────────────────────────────────────────────────

interface CategoryMeta {
  safetyLevel: RegistrySafetyLevel;
  seoImportance: SeoImportance;
  autoRefresh: boolean;
  device: 'desktop' | 'mobile-web' | 'mobile-app';
  requiresAuth: boolean;
  selector: string | null;
  annotationPreset: string | null;
  priority: 1 | 2 | 3;
}

const CATEGORY_META: Record<RegistryCategory, CategoryMeta> = {
  registration: {
    safetyLevel:     'PUBLIC',
    seoImportance:   'high',
    autoRefresh:     false,
    device:          'desktop',
    requiresAuth:    false,
    selector:        'input[type="email"], input[name="email"]',
    annotationPreset:'registration-flow',
    priority:        1,
  },
  bonus: {
    safetyLevel:     'PUBLIC',
    seoImportance:   'high',
    autoRefresh:     true,
    device:          'desktop',
    requiresAuth:    false,
    selector:        '[class*="bonus"], [class*="campaign"], [class*="activity"], h1',
    annotationPreset:'bonus-highlight',
    priority:        1,
  },
  fees: {
    safetyLevel:     'PUBLIC',
    seoImportance:   'high',
    autoRefresh:     false,
    device:          'desktop',
    requiresAuth:    false,
    selector:        'table',
    annotationPreset:'fee-table',
    priority:        1,
  },
  spot: {
    safetyLevel:     'PUBLIC',
    seoImportance:   'medium',
    autoRefresh:     false,
    device:          'desktop',
    requiresAuth:    false,
    selector:        '[class*="chart"]',
    annotationPreset:'trading-interface',
    priority:        2,
  },
  futures: {
    safetyLevel:     'PUBLIC',
    seoImportance:   'medium',
    autoRefresh:     false,
    device:          'desktop',
    requiresAuth:    false,
    selector:        '[class*="chart"]',
    annotationPreset:'futures-interface',
    priority:        2,
  },
  p2p: {
    safetyLevel:     'PUBLIC',
    seoImportance:   'medium',
    autoRefresh:     false,
    device:          'desktop',
    requiresAuth:    false,
    selector:        '[class*="p2p"], [class*="merchant"]',
    annotationPreset:null,
    priority:        3,
  },
  proof_of_reserves: {
    safetyLevel:     'PUBLIC',
    seoImportance:   'medium',
    autoRefresh:     false,
    device:          'desktop',
    requiresAuth:    false,
    selector:        '[class*="reserve"]',
    annotationPreset:null,
    priority:        2,
  },
  mobile_app: {
    safetyLevel:     'PUBLIC',
    seoImportance:   'low',
    autoRefresh:     false,
    device:          'mobile-app',
    requiresAuth:    false,
    selector:        '[class*="app-header"], h1',
    annotationPreset:null,
    priority:        3,
  },
  kyc: {
    safetyLevel:     'SKIP',
    seoImportance:   'low',
    autoRefresh:     false,
    device:          'desktop',
    requiresAuth:    true,
    selector:        null,
    annotationPreset:null,
    priority:        3,
  },
  deposit: {
    safetyLevel:     'AUTHED',
    seoImportance:   'low',
    autoRefresh:     false,
    device:          'desktop',
    requiresAuth:    true,
    selector:        '[class*="deposit"]',
    annotationPreset:null,
    priority:        2,
  },
  // Extended categories
  bonus_referral_landing: {
    safetyLevel:     'AFFILIATE_PUBLIC',
    seoImportance:   'high',
    autoRefresh:     true,
    device:          'desktop',
    requiresAuth:    false,
    selector:        'h1, [class*="referral"], [class*="bonus"], [class*="register"], input[type="email"]',
    annotationPreset:'bonus-highlight',
    priority:        1,
  },
  registration_mobile: {
    safetyLevel:     'PUBLIC',
    seoImportance:   'medium',
    autoRefresh:     false,
    device:          'mobile-web',
    requiresAuth:    false,
    selector:        'input[type="email"], input[type="text"], h1',
    annotationPreset:'registration-flow',
    priority:        2,
  },
  kyc_status_safe: {
    safetyLevel:     'AUTH_SAFE',
    seoImportance:   'low',
    autoRefresh:     false,
    device:          'desktop',
    requiresAuth:    true,
    selector:        '[class*="verification"], [class*="kyc-level"], h1',
    annotationPreset:null,
    priority:        2,
  },
  kyc_info: {
    safetyLevel:     'PUBLIC',
    seoImportance:   'low',
    autoRefresh:     false,
    device:          'desktop',
    requiresAuth:    false,
    selector:        'h1, [class*="article"], [class*="faq"], [class*="help"]',
    annotationPreset:null,
    priority:        3,
  },
};

// ── Exchange priority ranking ─────────────────────────────────────────────────

const EXCHANGE_PRIORITY_RANK: Record<string, number> = {
  binance:  1, okx:      2, mexc:     3, bitget:   4,
  bybit:    5, bingx:    6, kucoin:   7, htx:      8,
  'gate-io':9, coinex:  10, phemex:  11, bitunix: 12,
  lbank:   13, coinbase:14,
};

function exchangePriorityTier(slug: string): 1 | 2 | 3 {
  const rank = EXCHANGE_PRIORITY_RANK[slug] ?? 99;
  if (rank <= 4)  return 1;
  if (rank <= 9)  return 2;
  return 3;
}

// ── Capture URL map (canonical, covers all 14 exchanges × all categories) ────

/** Canonical capture URLs per exchange × category. */
export const REGISTRY_CAPTURE_URLS: Record<string, Partial<Record<RegistryCategory, string | null>>> = {
  binance: {
    registration:          'https://accounts.binance.com/en/register',
    bonus:                 'https://www.binance.com/en/activity/referral-entry',
    fees:                  'https://www.binance.com/en/fee/schedule',
    spot:                  'https://www.binance.com/en/trade/BTC_USDT',
    futures:               'https://www.binance.com/en/futures/BTCUSDT',
    p2p:                   'https://p2p.binance.com/en/trade/all-payments/USDT',
    proof_of_reserves:     'https://www.binance.com/en/proof-of-reserves',
    mobile_app:            'https://apps.apple.com/us/app/binance-buy-bitcoin-crypto/id1436799971',
    kyc:                   null,
    deposit:               'https://www.binance.com/en/my/wallet/account/main/deposit/crypto/BTC',
    bonus_referral_landing:'https://www.binance.com/join?ref=CRYPTOBONW',
    registration_mobile:   'https://accounts.binance.com/en/register',
    kyc_status_safe:       'https://www.binance.com/en/my/settings/profile',
    kyc_info:              'https://www.binance.com/en/support/faq/how-to-complete-identity-verification-360027287111',
  },
  okx: {
    registration:          'https://www.okx.com/join',
    bonus:                 'https://www.okx.com/campaigns/new-user',
    fees:                  'https://www.okx.com/fees',
    spot:                  'https://www.okx.com/trade-spot/btc-usdt',
    futures:               'https://www.okx.com/trade-futures/btc-usdt-swap',
    p2p:                   null,
    proof_of_reserves:     'https://www.okx.com/proof-of-reserves',
    mobile_app:            'https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470',
    kyc:                   null,
    deposit:               'https://www.okx.com/balance/recharge',
    bonus_referral_landing:'https://okx.com/join/CRYPTOBONUSW',
    registration_mobile:   'https://www.okx.com/join',
    kyc_status_safe:       'https://www.okx.com/account/identity-verification',
    kyc_info:              'https://www.okx.com/help/section/faq-kyc',
  },
  mexc: {
    registration:          'https://www.mexc.com/register',
    bonus:                 'https://www.mexc.com/en-US/activity',
    fees:                  'https://www.mexc.com/fee',
    spot:                  'https://www.mexc.com/exchange/BTC_USDT',
    futures:               'https://futures.mexc.com/exchange/BTC_USDT',
    p2p:                   'https://www.mexc.com/p2p',
    proof_of_reserves:     null,
    mobile_app:            'https://apps.apple.com/us/app/mexc-buy-sell-crypto-bitcoin/id1581119500',
    kyc:                   null,
    deposit:               'https://www.mexc.com/assets/deposit',
    bonus_referral_landing:'https://www.mexc.com/acquisition/custom-sign-up?shareCode=mexc-CryptoBonus',
    registration_mobile:   'https://www.mexc.com/register',
    kyc_status_safe:       null,
    kyc_info:              'https://www.mexc.com/support/articles/20244',
  },
  bybit: {
    registration:          'https://www.bybit.com/en/register',
    bonus:                 'https://www.bybit.com/en/activity/',
    fees:                  'https://www.bybit.com/en/help-center/article/Trading-Fee-Structure',
    spot:                  'https://www.bybit.com/en/trade/spot/BTC/USDT',
    futures:               'https://www.bybit.com/trade/usdt/BTCUSDT',
    p2p:                   'https://www.bybit.com/en/p2p/',
    proof_of_reserves:     'https://www.bybit.com/en/proof-of-reserves/',
    mobile_app:            'https://apps.apple.com/app/bybit/id1488296980',
    kyc:                   null,
    deposit:               'https://www.bybit.com/user/assets/home',
    bonus_referral_landing:null,
    registration_mobile:   null,
    kyc_status_safe:       null,
    kyc_info:              null,
  },
  bitget: {
    registration:          'https://www.bitget.com/register',
    bonus:                 'https://www.bitget.com/en/activity',
    fees:                  'https://www.bitget.com/rate',
    spot:                  'https://www.bitget.com/spot/BTCUSDT',
    futures:               'https://www.bitget.com/futures/usdt/BTCUSDT',
    p2p:                   null,
    proof_of_reserves:     'https://www.bitget.com/en/proof-of-reserves',
    mobile_app:            'https://apps.apple.com/app/bitget/id1488296980',
    kyc:                   null,
    deposit:               'https://www.bitget.com/asset/recharge',
    bonus_referral_landing:null,
    registration_mobile:   null,
    kyc_status_safe:       null,
    kyc_info:              null,
  },
  bingx: {
    registration:          'https://bingxdao.com/partner/CRYPTOBONUSWORLD/',
    bonus:                 'https://bingx.com/en-us/activity/',
    fees:                  'https://bingx.com/en-us/support/fee/',
    spot:                  'https://bingx.com/en-us/spot/BTCUSDT/',
    futures:               'https://bingx.com/en-us/perpetual/BTC-USDT/',
    p2p:                   null,
    proof_of_reserves:     null,
    mobile_app:            'https://apps.apple.com/app/bingx/id1498241566',
    kyc:                   null,
    deposit:               'https://bingx.com/en-us/asset/',
    bonus_referral_landing:null,
    registration_mobile:   null,
    kyc_status_safe:       null,
    kyc_info:              null,
  },
  'gate-io': {
    registration:          'https://www.gate.io/signup',
    bonus:                 'https://www.gate.io/activity',
    fees:                  'https://www.gate.io/fee',
    spot:                  'https://www.gate.io/trade/BTC_USDT',
    futures:               'https://www.gate.io/futures_trade/usdt/btc_usdt',
    p2p:                   'https://www.gate.io/p2p',
    proof_of_reserves:     'https://www.gate.io/proof_of_assets',
    mobile_app:            'https://apps.apple.com/app/gate-io/id1294980941',
    kyc:                   null,
    deposit:               'https://www.gate.io/myaccount/deposit',
    bonus_referral_landing:null,
    registration_mobile:   null,
    kyc_status_safe:       null,
    kyc_info:              null,
  },
  kucoin: {
    registration:          'https://www.kucoin.com/ucenter/signup',
    bonus:                 'https://www.kucoin.com/activity',
    fees:                  'https://www.kucoin.com/vip/level',
    spot:                  'https://www.kucoin.com/trade/BTC-USDT',
    futures:               'https://www.kucoin.com/futures/trade/XBTUSDTM',
    p2p:                   'https://www.kucoin.com/otc',
    proof_of_reserves:     'https://www.kucoin.com/legal/proof-of-reserves',
    mobile_app:            'https://apps.apple.com/app/kucoin/id1378956601',
    kyc:                   null,
    deposit:               'https://www.kucoin.com/assets/main',
    bonus_referral_landing:null,
    registration_mobile:   null,
    kyc_status_safe:       null,
    kyc_info:              null,
  },
  htx: {
    registration:          'https://www.htx.com/en-us/register',
    bonus:                 'https://www.htx.com/en-us/topic/newbie/',
    fees:                  'https://www.htx.com/en-us/about/fee/',
    spot:                  'https://www.htx.com/en-us/trade/btc_usdt',
    futures:               'https://futures.htx.com/en-us/linear_swap/exchange/',
    p2p:                   'https://otc.htx.com/en-us/trade/buy/usdt',
    proof_of_reserves:     null,
    mobile_app:            'https://apps.apple.com/app/htx/id1023263449',
    kyc:                   null,
    deposit:               'https://www.htx.com/en-us/finance/deposit/',
    bonus_referral_landing:null,
    registration_mobile:   null,
    kyc_status_safe:       null,
    kyc_info:              null,
  },
  coinex: {
    registration:          'https://www.coinex.com/register',
    bonus:                 'https://www.coinex.com/activity',
    fees:                  'https://www.coinex.com/fees',
    spot:                  'https://www.coinex.com/exchange/BTC-USDT',
    futures:               'https://www.coinex.com/futures/BTC-USDT',
    p2p:                   null,
    proof_of_reserves:     'https://www.coinex.com/proof-of-reserves',
    mobile_app:            'https://apps.apple.com/app/coinex/id1378251936',
    kyc:                   null,
    deposit:               'https://www.coinex.com/asset/deposit',
    bonus_referral_landing:null,
    registration_mobile:   null,
    kyc_status_safe:       null,
    kyc_info:              null,
  },
  phemex: {
    registration:          'https://phemex.com/register',
    bonus:                 'https://phemex.com/activity',
    fees:                  'https://phemex.com/rate-limits',
    spot:                  'https://phemex.com/spot/trade/BTC-USDT',
    futures:               'https://phemex.com/trade/BTCUSD',
    p2p:                   null,
    proof_of_reserves:     'https://phemex.com/proof-of-reserves',
    mobile_app:            'https://apps.apple.com/app/phemex/id1436830174',
    kyc:                   null,
    deposit:               'https://phemex.com/assets/deposit',
    bonus_referral_landing:null,
    registration_mobile:   null,
    kyc_status_safe:       null,
    kyc_info:              null,
  },
  bitunix: {
    registration:          'https://www.bitunix.com/register',
    bonus:                 'https://www.bitunix.com/activity',
    fees:                  'https://www.bitunix.com/fee-rate',
    spot:                  'https://www.bitunix.com/trade/BTCUSDT',
    futures:               'https://www.bitunix.com/futures/BTC',
    p2p:                   null,
    proof_of_reserves:     null,
    mobile_app:            'https://apps.apple.com/app/bitunix/id6472929966',
    kyc:                   null,
    deposit:               'https://www.bitunix.com/assets',
    bonus_referral_landing:null,
    registration_mobile:   null,
    kyc_status_safe:       null,
    kyc_info:              null,
  },
  lbank: {
    registration:          'https://www.lbank.com/en-US/register/',
    bonus:                 'https://www.lbank.com/en-US/activity/',
    fees:                  'https://www.lbank.com/en-US/docs/index.html#fees',
    spot:                  'https://www.lbank.com/en-US/trade/btc_usdt/',
    futures:               'https://futures.lbank.com/trade/btcusdt',
    p2p:                   null,
    proof_of_reserves:     null,
    mobile_app:            'https://apps.apple.com/app/lbank/id1443638925',
    kyc:                   null,
    deposit:               'https://www.lbank.com/en-US/finance/',
    bonus_referral_landing:null,
    registration_mobile:   null,
    kyc_status_safe:       null,
    kyc_info:              null,
  },
  coinbase: {
    registration:          'https://www.coinbase.com/signup',
    bonus:                 'https://www.coinbase.com/earn',
    fees:                  'https://www.coinbase.com/legal/fees',
    spot:                  'https://www.coinbase.com/advanced-trade/spot/BTC-USD',
    futures:               null,
    p2p:                   null,
    proof_of_reserves:     null,
    mobile_app:            'https://apps.apple.com/app/coinbase/id886427730',
    kyc:                   null,
    deposit:               'https://www.coinbase.com/assets',
    bonus_referral_landing:null,
    registration_mobile:   null,
    kyc_status_safe:       null,
    kyc_info:              null,
  },
};

// ── Exchanges that have extended route-map categories ─────────────────────────

/** Which exchanges have bonus_referral_landing + extended categories in their route map. */
const EXTENDED_CATEGORY_EXCHANGES = new Set(['binance', 'okx', 'mexc']);

// ── Standard categories from evidence schema ──────────────────────────────────

const STANDARD_CATEGORIES: ScreenshotCategory[] = [
  'registration', 'kyc', 'bonus', 'deposit', 'p2p',
  'spot', 'futures', 'fees', 'mobile_app', 'proof_of_reserves',
];

const EXTENDED_CATEGORIES: RegistryCategory[] = [
  'bonus_referral_landing',
  'registration_mobile',
  'kyc_status_safe',
  'kyc_info',
];

// ── Registry builder ──────────────────────────────────────────────────────────

function buildId(exchange: string, category: RegistryCategory, region: string, device: string): string {
  return `${exchange}-${category}-${region.toLowerCase()}-${device}`.replace(/_/g, '-');
}

function buildOutputPath(
  exchange: string,
  category: RegistryCategory,
  region: string,
  device: 'desktop' | 'mobile-web' | 'mobile-app',
  capturedAt: string | null,
): string | null {
  if (!capturedAt) return null;
  const deviceTag = device === 'desktop' ? 'desktop' : 'mobile';
  const dateTag   = capturedAt.slice(0, 7); // YYYY-MM
  return `/screenshots/${exchange}/${category}/${region.toLowerCase()}-${deviceTag}-${dateTag}.webp`;
}

function buildRegistryEntry(
  exchange: string,
  category: RegistryCategory,
  overrides: Partial<ScreenshotRegistryEntry> = {},
): ScreenshotRegistryEntry {
  const meta       = CATEGORY_META[category];
  const evidenceData = getExchangeEvidence(exchange);
  const screenshotEntry = (evidenceData?.screenshots as Record<string, {
    status: ScreenshotStatus; path: string | null; capturedAt: string | null; geo?: string; device?: string; notes?: string;
  } | undefined>)?.[category];

  const region        = 'GLOBAL';
  const locale        = 'en-US';
  const device        = meta.device;
  const status        = screenshotEntry?.status ?? (meta.safetyLevel === 'SKIP' ? 'not_applicable' : 'missing');
  const capturedAt    = screenshotEntry?.capturedAt ?? null;
  const captureUrl    = REGISTRY_CAPTURE_URLS[exchange]?.[category] ?? null;
  const exchangeTier  = exchangePriorityTier(exchange);
  const priority      = Math.min(meta.priority, exchangeTier === 1 ? 1 : exchangeTier === 2 ? 2 : 3) as 1 | 2 | 3;
  const evidencePath  = `src/data/evidence/${exchange}.json`;
  const outputPath    = buildOutputPath(exchange, category, region, device, capturedAt);

  return {
    id:               buildId(exchange, category, region, device),
    exchange,
    category,
    region,
    locale,
    device,
    captureUrl,
    requiresAuth:     meta.requiresAuth,
    safetyLevel:      meta.safetyLevel,
    selector:         meta.selector,
    annotationPreset: meta.annotationPreset,
    outputPath:       outputPath ?? (screenshotEntry?.path ?? null),
    status,
    priority,
    seoImportance:    meta.seoImportance,
    autoRefresh:      meta.autoRefresh,
    lastCapturedAt:   capturedAt,
    lastApprovedAt:   null,
    lastApprovedHash: null,
    evidencePath,
    notes:            screenshotEntry?.notes ?? '',
    ...overrides,
  };
}

function buildFullRegistry(): ScreenshotRegistryEntry[] {
  const slugs   = getAllEvidenceSlugs();
  const entries: ScreenshotRegistryEntry[] = [];

  for (const exchange of slugs) {
    // Standard categories (all exchanges)
    for (const category of STANDARD_CATEGORIES) {
      entries.push(buildRegistryEntry(exchange, category));
    }

    // Extended categories (only exchanges with route maps)
    if (EXTENDED_CATEGORY_EXCHANGES.has(exchange)) {
      for (const category of EXTENDED_CATEGORIES) {
        entries.push(buildRegistryEntry(exchange, category));
      }
    }
  }

  // Sort: by exchange priority, then category priority, then category name
  entries.sort((a, b) => {
    const ea = EXCHANGE_PRIORITY_RANK[a.exchange] ?? 99;
    const eb = EXCHANGE_PRIORITY_RANK[b.exchange] ?? 99;
    if (ea !== eb) return ea - eb;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.category.localeCompare(b.category);
  });

  return entries;
}

// ── Exports ───────────────────────────────────────────────────────────────────

/** Complete screenshot registry — single source of truth. */
export const SCREENSHOT_REGISTRY: ScreenshotRegistryEntry[] = buildFullRegistry();

/** Fast id → entry lookup. */
export const SCREENSHOT_REGISTRY_MAP: ReadonlyMap<string, ScreenshotRegistryEntry> =
  new Map(SCREENSHOT_REGISTRY.map(e => [e.id, e]));

/** Get all entries for one exchange. */
export function getRegistryEntries(exchange: string): ScreenshotRegistryEntry[] {
  return SCREENSHOT_REGISTRY.filter(e => e.exchange === exchange);
}

/** Get a single entry by id. */
export function getRegistryEntry(id: string): ScreenshotRegistryEntry | undefined {
  return SCREENSHOT_REGISTRY_MAP.get(id);
}

/** All entries that need capturing (missing / outdated / needs_manual_capture). */
export function getPendingEntries(): ScreenshotRegistryEntry[] {
  return SCREENSHOT_REGISTRY.filter(e =>
    e.status === 'missing' || e.status === 'outdated' || e.status === 'needs_manual_capture'
  );
}

/** All entries that have autoRefresh enabled. */
export function getAutoRefreshEntries(): ScreenshotRegistryEntry[] {
  return SCREENSHOT_REGISTRY.filter(e => e.autoRefresh && e.safetyLevel !== 'SKIP');
}

/** Entry count summary. */
export function getRegistrySummary() {
  const total     = SCREENSHOT_REGISTRY.length;
  const available = SCREENSHOT_REGISTRY.filter(e => e.status === 'available').length;
  const missing   = SCREENSHOT_REGISTRY.filter(e => e.status === 'missing' || e.status === 'needs_manual_capture').length;
  const outdated  = SCREENSHOT_REGISTRY.filter(e => e.status === 'outdated').length;
  const skipped   = SCREENSHOT_REGISTRY.filter(e => e.status === 'not_applicable').length;
  return { total, available, missing, outdated, skipped };
}
