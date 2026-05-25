/**
 * Exchange Media Registry
 * Central registry of all media assets for exchanges.
 * Add entries as real screenshots are captured.
 *
 * File naming convention:
 *   /media/exchanges/{slug}/{type}-{variant}-{YYYY-MM}.webp
 *
 * Example:
 *   /media/exchanges/bybit/ui-desktop-home-2026-05.webp
 *   /media/exchanges/bybit/bonus-desktop-reward-hub-2026-05.webp
 *   /media/exchanges/bybit/p2p-mobile-buy-2026-05.webp
 */

export type MediaType =
  | 'ui'          // trading interface
  | 'bonus'       // bonus/rewards page
  | 'p2p'         // P2P marketplace
  | 'futures'     // futures trading screen
  | 'kyc'         // KYC flow
  | 'deposit'     // deposit flow
  | 'withdraw'    // withdrawal flow
  | 'app'         // mobile app
  | 'signup'      // registration screen
  | 'thumbnail';  // general card/thumbnail

export type MediaDevice = 'desktop' | 'mobile' | 'tablet';

export interface ExchangeMediaAsset {
  type: MediaType;
  device: MediaDevice;
  src?: string;           // if undefined = placeholder (not yet captured)
  alt: string;
  caption?: string;
  capturedAt?: string;    // "YYYY-MM"
  width?: number;
  height?: number;
  label: string;          // fallback label for placeholder
}

export interface ExchangeMedia {
  slug: string;
  name: string;
  assets: ExchangeMediaAsset[];
}

export const EXCHANGE_MEDIA_REGISTRY: ExchangeMedia[] = [
  {
    slug: 'bybit',
    name: 'Bybit',
    assets: [
      {
        type: 'ui',
        device: 'desktop',
        label: 'Bybit Trading Dashboard',
        alt: 'Bybit spot trading interface showing BTC/USDT chart — May 2026',
        caption: 'Bybit spot trading interface with TradingView chart integration',
        capturedAt: undefined,
      },
      {
        type: 'bonus',
        device: 'desktop',
        label: 'Bybit Rewards Hub',
        alt: 'Bybit Rewards Hub showing welcome bonus tasks and progress',
        caption: 'Bybit Rewards Hub — track your welcome bonus completion',
        capturedAt: undefined,
      },
      {
        type: 'p2p',
        device: 'mobile',
        label: 'Bybit P2P Buy USDT',
        alt: 'Bybit P2P marketplace on mobile — buying USDT',
        caption: 'Bybit P2P on mobile — filter sellers by payment method',
        capturedAt: undefined,
      },
      {
        type: 'futures',
        device: 'desktop',
        label: 'Bybit Futures Interface',
        alt: 'Bybit BTCUSDT perpetual futures trading interface',
        caption: 'Bybit perpetual futures — order panel and position manager',
        capturedAt: undefined,
      },
    ],
  },
  {
    slug: 'binance',
    name: 'Binance',
    assets: [
      {
        type: 'ui',
        device: 'desktop',
        label: 'Binance Spot Trading',
        alt: 'Binance spot trading interface — BTC/USDT pair',
        caption: 'Binance spot market with full order book and chart',
        capturedAt: undefined,
      },
      {
        type: 'p2p',
        device: 'desktop',
        label: 'Binance P2P Marketplace',
        alt: 'Binance P2P trading page — buy USDT with local payment methods',
        caption: 'Binance P2P — the largest global P2P crypto marketplace',
        capturedAt: undefined,
      },
      {
        type: 'bonus',
        device: 'desktop',
        label: 'Binance Welcome Bonus',
        alt: 'Binance new user bonus tasks page',
        caption: 'Binance welcome offer page showing active bonus tasks',
        capturedAt: undefined,
      },
    ],
  },
  {
    slug: 'mexc',
    name: 'MEXC',
    assets: [
      {
        type: 'ui',
        device: 'desktop',
        label: 'MEXC Trading Interface',
        alt: 'MEXC spot trading interface showing altcoin market',
        caption: 'MEXC trading view — 1,500+ trading pairs available',
        capturedAt: undefined,
      },
      {
        type: 'bonus',
        device: 'desktop',
        label: 'MEXC Bonus Page',
        alt: 'MEXC welcome bonus activity page',
        caption: 'MEXC welcome bonus — no KYC required for signup tier',
        capturedAt: undefined,
      },
      {
        type: 'app',
        device: 'mobile',
        label: 'MEXC Mobile App',
        alt: 'MEXC mobile app home screen',
        caption: 'MEXC mobile app — full trading on iOS and Android',
        capturedAt: undefined,
      },
    ],
  },
  {
    slug: 'okx',
    name: 'OKX',
    assets: [
      {
        type: 'ui',
        device: 'desktop',
        label: 'OKX Trading Platform',
        alt: 'OKX spot and futures unified trading interface',
        caption: 'OKX unified trading interface — spot, futures and options',
        capturedAt: undefined,
      },
      {
        type: 'p2p',
        device: 'desktop',
        label: 'OKX P2P Trading',
        alt: 'OKX P2P marketplace showing buy offers',
        caption: 'OKX P2P — available in 100+ countries with local payment methods',
        capturedAt: undefined,
      },
    ],
  },
  {
    slug: 'kucoin',
    name: 'KuCoin',
    assets: [
      {
        type: 'ui',
        device: 'desktop',
        label: 'KuCoin Trading View',
        alt: 'KuCoin spot trading interface — altcoin markets',
        caption: 'KuCoin spot trading — 700+ trading pairs',
        capturedAt: undefined,
      },
      {
        type: 'app',
        device: 'mobile',
        label: 'KuCoin Mobile App',
        alt: 'KuCoin mobile trading app dashboard',
        caption: 'KuCoin mobile app — available on iOS and Android',
        capturedAt: undefined,
      },
    ],
  },
  {
    slug: 'bitget',
    name: 'Bitget',
    assets: [
      {
        type: 'ui',
        device: 'desktop',
        label: 'Bitget Trading Interface',
        alt: 'Bitget spot and futures trading view',
        caption: 'Bitget trading interface with copy trading integration',
        capturedAt: undefined,
      },
      {
        type: 'futures',
        device: 'desktop',
        label: 'Bitget Futures Trading',
        alt: 'Bitget perpetual futures interface',
        caption: 'Bitget futures — up to 125x leverage on major pairs',
        capturedAt: undefined,
      },
    ],
  },
  {
    slug: 'bingx',
    name: 'BingX',
    assets: [
      {
        type: 'ui',
        device: 'desktop',
        label: 'BingX Trading Dashboard',
        alt: 'BingX trading platform with grid and copy trading',
        caption: 'BingX — unified spot, futures, and copy trading',
        capturedAt: undefined,
      },
    ],
  },
  {
    slug: 'gate-io',
    name: 'Gate.io',
    assets: [
      {
        type: 'ui',
        device: 'desktop',
        label: 'Gate.io Trading Interface',
        alt: 'Gate.io spot trading with 2,000+ pairs',
        caption: 'Gate.io — one of the largest altcoin selections globally',
        capturedAt: undefined,
      },
    ],
  },
  {
    slug: 'htx',
    name: 'HTX',
    assets: [
      {
        type: 'ui',
        device: 'desktop',
        label: 'HTX Trading Platform',
        alt: 'HTX (formerly Huobi) trading interface',
        caption: 'HTX trading view — spot and derivatives markets',
        capturedAt: undefined,
      },
    ],
  },
  {
    slug: 'coinex',
    name: 'CoinEx',
    assets: [
      {
        type: 'ui',
        device: 'desktop',
        label: 'CoinEx Trading View',
        alt: 'CoinEx spot trading interface — low fee exchange',
        caption: 'CoinEx — 0% maker fee on select pairs',
        capturedAt: undefined,
      },
    ],
  },
  {
    slug: 'coinbase',
    name: 'Coinbase',
    assets: [
      {
        type: 'ui',
        device: 'desktop',
        label: 'Coinbase Trading Interface',
        alt: 'Coinbase Advanced Trade interface',
        caption: 'Coinbase Advanced Trade — professional trading for regulated markets',
        capturedAt: undefined,
      },
      {
        type: 'app',
        device: 'mobile',
        label: 'Coinbase Mobile App',
        alt: 'Coinbase mobile app on iPhone',
        caption: 'Coinbase mobile app — rated best crypto app for iOS',
        capturedAt: undefined,
      },
    ],
  },
  {
    slug: 'phemex',
    name: 'Phemex',
    assets: [
      {
        type: 'futures',
        device: 'desktop',
        label: 'Phemex Futures Interface',
        alt: 'Phemex perpetual futures trading view',
        caption: 'Phemex futures — fast execution with up to 100x leverage',
        capturedAt: undefined,
      },
    ],
  },
  {
    slug: 'bitunix',
    name: 'Bitunix',
    assets: [
      {
        type: 'futures',
        device: 'desktop',
        label: 'Bitunix Futures Trading',
        alt: 'Bitunix derivatives trading interface',
        caption: 'Bitunix — futures trading without KYC',
        capturedAt: undefined,
      },
    ],
  },
  {
    slug: 'lbank',
    name: 'LBank',
    assets: [
      {
        type: 'ui',
        device: 'desktop',
        label: 'LBank Trading View',
        alt: 'LBank spot trading interface',
        caption: 'LBank — established exchange with 10+ years in operation',
        capturedAt: undefined,
      },
    ],
  },
];

/** Get all media for a specific exchange slug */
export function getExchangeMedia(slug: string): ExchangeMedia | undefined {
  return EXCHANGE_MEDIA_REGISTRY.find(e => e.slug === slug);
}

/** Get a specific asset for an exchange */
export function getExchangeAsset(
  slug: string,
  type: MediaType,
  device: MediaDevice = 'desktop'
): ExchangeMediaAsset | undefined {
  const media = getExchangeMedia(slug);
  return media?.assets.find(a => a.type === type && a.device === device);
}

/** Count how many real (non-placeholder) assets exist for an exchange */
export function getReadyAssetCount(slug: string): number {
  const media = getExchangeMedia(slug);
  return media?.assets.filter(a => !!a.src).length ?? 0;
}

/** Get all exchanges with at least one real screenshot ready */
export function getExchangesWithMedia(): string[] {
  return EXCHANGE_MEDIA_REGISTRY
    .filter(e => e.assets.some(a => !!a.src))
    .map(e => e.slug);
}
