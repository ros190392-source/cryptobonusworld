/**
 * logoConfig.ts — Single source of truth for exchange logo/brand data.
 *
 * Import this everywhere instead of duplicating brand color maps in components.
 * Keeps visual identity consistent across: BonusTable, ExchangeHero,
 * ExchangeLogo, compare pages, OG image generator, etc.
 */

/** Brand accent colour per exchange (used for glows, borders, avatars). */
export const BRAND_COLORS: Record<string, string> = {
  bybit:    '#F7A600',
  binance:  '#F3BA2F',
  mexc:     '#00C0B4',
  okx:      '#EEEEEE',
  bitget:   '#1DA2B4',
  bingx:    '#1890FF',
  'gate-io':'#2BAFCC',
  kucoin:   '#23AF91',
  htx:      '#1352F0',
  coinex:   '#00CFC5',
  phemex:   '#BE79DF',
  bitunix:  '#F97316',
  lbank:    '#0052FE',
  coinbase: '#1652F0',
};

/** Return brand colour or a neutral fallback. */
export function getBrandColor(slug: string): string {
  return BRAND_COLORS[slug] ?? '#3a3a4a';
}

/**
 * Logo path with format preference.
 * PNG first (CoinGecko square logomarks), SVG fallback.
 */
export function getLogoPath(slug: string, format: 'png' | 'svg' = 'png'): string {
  return `/logos/${slug}.${format}`;
}

/**
 * Border-radius for a given container size and variant.
 * Mirrors the logic in ExchangeLogo.astro so parent components can compute
 * identical values without a runtime component tree.
 */
export function logoRadiusPx(size: number, variant: 'square' | 'pill' | 'raw'): number {
  if (variant === 'pill') return size / 2;
  if (variant === 'square') return Math.round(size * 0.22);
  return 0;
}

/**
 * OG image path for a given exchange.
 * Returns null if no per-exchange OG image has been generated.
 */
export function getExchangeOgImage(slug: string): string {
  return `/og/exchange-${slug}.png`;
}
