/**
 * DESIGN PREVIEW — Logo Slot System v2 fit registry (prototype-local).
 *
 * Deterministic, asset-specific presentation metadata for the unified design
 * foundation specimen (/__design/foundation/). Every ratio below was measured
 * from the repository PNG's opaque-pixel bounding box (PIL alpha bbox +
 * mean opaque luminance, 2026-07-22). Assets themselves are untouched.
 *
 * PRESENTATION METADATA ONLY — nothing here encodes or implies eligibility,
 * availability or any commercial state. Do not import from production code.
 */

export type AssetTheme = 'LIGHT_WORDMARK' | 'DARK_WORDMARK' | 'MIXED';
export type AspectClass = 'COMPACT' | 'WIDE' | 'ULTRA_WIDE';
export type WellKind = 'LIGHT' | 'DARK' | 'NEUTRAL';
export type SlotSize = 'XL' | 'L' | 'M' | 'S';
export type FallbackMode = 'NONE' | 'LOCKUP_BELOW_FLOOR' | 'LOCKUP_ALWAYS';

export interface LogoFitEntry {
  exchangeId: string;
  displayName: string;
  /** repository wordmark asset; null => no wordmark exists, lockup always */
  assetPath: string | null;
  iconPath: string;
  assetTheme: AssetTheme;
  aspectClass: AspectClass;
  preferredWell: WellKind;
  /** small per-asset optical nudge (thin-stroke compensation), 0.94–1.06 only */
  opticalScale: number;
  opticalOffsetX: number;
  opticalOffsetY: number;
  measuredCanvas: [number, number];
  measuredContentWidthRatio: number;
  measuredContentHeightRatio: number;
  measuredContentOffsetXRatio: number;
  measuredContentOffsetYRatio: number;
  /** opaque content width / height */
  contentAspectRatio: number;
  fallbackMode: FallbackMode;
  accessibleLabel: string;
  /** REQUIRED whenever any slot legitimately renders outside the fill band — no silent exceptions */
  exceptionNote?: string;
}

/** Slot geometry (outer box + inner padding → usable content area). */
export const SLOT_GEOMETRY: Record<SlotSize, { w: number; h: number; padX: number; padY: number }> = {
  XL: { w: 220, h: 64, padX: 6, padY: 6 },   // usable 208×52 — HERO_FULL
  L:  { w: 160, h: 48, padX: 6, padY: 6 },   // usable 148×36 — COMPACT_BOTTOM
  M:  { w: 112, h: 40, padX: 6, padY: 5 },   // usable 100×30 — RANKING_ROW / cards
  S:  { w: 88,  h: 28, padX: 4, padY: 3 },   // usable 80×22  — COMPARISON_CELL / notices
};

/** Height-first normalization factors (share of usable height per class). */
export const CLASS_HEIGHT_FACTOR: Record<Exclude<AspectClass, 'ULTRA_WIDE'>, number> = {
  COMPACT: 0.95,
  WIDE: 0.85,
};

/** Useful optical-fill acceptance band + opaque-content height floor. */
export const FILL_BAND = { min: 0.62, max: 0.95 };
export const MIN_CONTENT_HEIGHT_PX = 14;

export const LOGO_FIT_REGISTRY: Record<string, LogoFitEntry> = {
  bybit: {
    exchangeId: 'bybit', displayName: 'Bybit',
    assetPath: '/logos/bybit-wordmark-official.png', iconPath: '/logos/bybit.png',
    assetTheme: 'LIGHT_WORDMARK', aspectClass: 'COMPACT', preferredWell: 'DARK',
    opticalScale: 1, opticalOffsetX: 0, opticalOffsetY: 0,
    measuredCanvas: [768, 285],
    measuredContentWidthRatio: 0.987, measuredContentHeightRatio: 0.9193,
    measuredContentOffsetXRatio: 0.0065, measuredContentOffsetYRatio: 0.0246,
    contentAspectRatio: 2.893, fallbackMode: 'NONE',
    accessibleLabel: 'Bybit (design preview wordmark)',
  },
  okx: {
    exchangeId: 'okx', displayName: 'OKX',
    assetPath: '/logos/okx-wordmark-v2.png', iconPath: '/logos/okx.png',
    assetTheme: 'LIGHT_WORDMARK', aspectClass: 'COMPACT', preferredWell: 'DARK',
    opticalScale: 1, opticalOffsetX: 0, opticalOffsetY: 0,
    measuredCanvas: [320, 96],
    measuredContentWidthRatio: 0.9688, measuredContentHeightRatio: 1,
    measuredContentOffsetXRatio: 0, measuredContentOffsetYRatio: 0,
    contentAspectRatio: 3.229, fallbackMode: 'NONE',
    accessibleLabel: 'OKX (design preview wordmark)',
  },
  bitget: {
    exchangeId: 'bitget', displayName: 'Bitget',
    assetPath: '/logos/bitget-wordmark-official-v1.png', iconPath: '/logos/bitget.png',
    assetTheme: 'MIXED', aspectClass: 'COMPACT', preferredWell: 'LIGHT',
    opticalScale: 1, opticalOffsetX: 0, opticalOffsetY: 0,
    measuredCanvas: [600, 195],
    measuredContentWidthRatio: 0.9667, measuredContentHeightRatio: 0.8974,
    measuredContentOffsetXRatio: 0.0167, measuredContentOffsetYRatio: 0.0513,
    contentAspectRatio: 3.314, fallbackMode: 'NONE',
    accessibleLabel: 'Bitget (design preview wordmark)',
  },
  kucoin: {
    exchangeId: 'kucoin', displayName: 'KuCoin',
    assetPath: '/logos/kucoin-wordmark.png', iconPath: '/logos/kucoin.png',
    assetTheme: 'DARK_WORDMARK', aspectClass: 'WIDE', preferredWell: 'LIGHT',
    // thin-stroke wordmark reads optically small — approved ±6% nudge range
    opticalScale: 1.04, opticalOffsetX: 0, opticalOffsetY: 0,
    measuredCanvas: [752, 206],
    measuredContentWidthRatio: 1, measuredContentHeightRatio: 1,
    measuredContentOffsetXRatio: 0, measuredContentOffsetYRatio: 0,
    contentAspectRatio: 3.65, fallbackMode: 'NONE',
    accessibleLabel: 'KuCoin (design preview wordmark)',
  },
  bingx: {
    exchangeId: 'bingx', displayName: 'BingX',
    assetPath: '/logos/bingx-wordmark.png', iconPath: '/logos/bingx.png',
    assetTheme: 'DARK_WORDMARK', aspectClass: 'COMPACT', preferredWell: 'LIGHT',
    opticalScale: 1, opticalOffsetX: 0, opticalOffsetY: 0,
    // 29.5% of the canvas height is transparent padding — the v1 root-cause case;
    // content-box fitting below compensates without touching the asset.
    measuredCanvas: [461, 176],
    measuredContentWidthRatio: 0.9284, measuredContentHeightRatio: 0.7045,
    measuredContentOffsetXRatio: 0.0412, measuredContentOffsetYRatio: 0.1477,
    contentAspectRatio: 3.452, fallbackMode: 'NONE',
    accessibleLabel: 'BingX (design preview wordmark)',
  },
  binance: {
    exchangeId: 'binance', displayName: 'Binance',
    assetPath: '/logos/binance-wordmark.png', iconPath: '/logos/binance.png',
    assetTheme: 'LIGHT_WORDMARK', aspectClass: 'WIDE', preferredWell: 'DARK',
    opticalScale: 1, opticalOffsetX: 0, opticalOffsetY: 0,
    measuredCanvas: [768, 156],
    measuredContentWidthRatio: 0.9948, measuredContentHeightRatio: 0.9872,
    measuredContentOffsetXRatio: 0.0026, measuredContentOffsetYRatio: 0.0064,
    contentAspectRatio: 4.961, fallbackMode: 'NONE',
    accessibleLabel: 'Binance (design preview wordmark)',
  },
  phemex: {
    exchangeId: 'phemex', displayName: 'Phemex',
    assetPath: '/logos/phemex-wordmark.png', iconPath: '/logos/phemex.png',
    assetTheme: 'MIXED', aspectClass: 'WIDE', preferredWell: 'LIGHT',
    opticalScale: 1.04, opticalOffsetX: 0, opticalOffsetY: 0,
    measuredCanvas: [700, 190],
    measuredContentWidthRatio: 1, measuredContentHeightRatio: 1,
    measuredContentOffsetXRatio: 0, measuredContentOffsetYRatio: 0,
    contentAspectRatio: 3.684, fallbackMode: 'NONE',
    accessibleLabel: 'Phemex (design preview wordmark)',
  },
  mexc: {
    exchangeId: 'mexc', displayName: 'MEXC',
    assetPath: '/logos/mexc-wordmark-dark.png', iconPath: '/logos/mexc.png',
    assetTheme: 'DARK_WORDMARK', aspectClass: 'ULTRA_WIDE', preferredWell: 'LIGHT',
    opticalScale: 1, opticalOffsetX: 0, opticalOffsetY: 0,
    measuredCanvas: [768, 101],
    measuredContentWidthRatio: 1, measuredContentHeightRatio: 1,
    measuredContentOffsetXRatio: 0, measuredContentOffsetYRatio: 0,
    contentAspectRatio: 7.604, fallbackMode: 'LOCKUP_BELOW_FLOOR',
    accessibleLabel: 'MEXC (design preview wordmark)',
    exceptionNote:
      'ULTRA_WIDE (content AR 7.60): in XL/L the mark meets the 14px height floor but cannot ' +
      'reach the 62% fill minimum without clipping or distortion — documented exception. ' +
      'M/S slots fall below the height floor and use the lockup fallback. Dark wells should ' +
      'prefer the mexc-white repository variant (WIDE, fully in band).',
  },
  'mexc-white': {
    exchangeId: 'mexc-white', displayName: 'MEXC',
    assetPath: '/logos/mexc-wordmark-hero-white-v1-8fb6d655.png', iconPath: '/logos/mexc.png',
    assetTheme: 'LIGHT_WORDMARK', aspectClass: 'WIDE', preferredWell: 'DARK',
    opticalScale: 1, opticalOffsetX: 0, opticalOffsetY: 0,
    measuredCanvas: [250, 59],
    measuredContentWidthRatio: 1, measuredContentHeightRatio: 1,
    measuredContentOffsetXRatio: 0, measuredContentOffsetYRatio: 0,
    contentAspectRatio: 4.237, fallbackMode: 'NONE',
    accessibleLabel: 'MEXC (design preview wordmark, white variant)',
  },
  'gate-io': {
    exchangeId: 'gate-io', displayName: 'Gate.io',
    assetPath: null, iconPath: '/logos/gate-io.png',
    assetTheme: 'MIXED', aspectClass: 'COMPACT', preferredWell: 'NEUTRAL',
    opticalScale: 1, opticalOffsetX: 0, opticalOffsetY: 0,
    measuredCanvas: [0, 0],
    measuredContentWidthRatio: 1, measuredContentHeightRatio: 1,
    measuredContentOffsetXRatio: 0, measuredContentOffsetYRatio: 0,
    contentAspectRatio: 1, fallbackMode: 'LOCKUP_ALWAYS',
    accessibleLabel: 'Gate.io (design preview lockup)',
  },
  htx: {
    exchangeId: 'htx', displayName: 'HTX',
    assetPath: null, iconPath: '/logos/htx.png',
    assetTheme: 'MIXED', aspectClass: 'COMPACT', preferredWell: 'NEUTRAL',
    opticalScale: 1, opticalOffsetX: 0, opticalOffsetY: 0,
    measuredCanvas: [0, 0],
    measuredContentWidthRatio: 1, measuredContentHeightRatio: 1,
    measuredContentOffsetXRatio: 0, measuredContentOffsetYRatio: 0,
    contentAspectRatio: 1, fallbackMode: 'LOCKUP_ALWAYS',
    accessibleLabel: 'HTX (design preview lockup)',
  },
  coinex: {
    exchangeId: 'coinex', displayName: 'CoinEx',
    assetPath: null, iconPath: '/logos/coinex.png',
    assetTheme: 'MIXED', aspectClass: 'COMPACT', preferredWell: 'NEUTRAL',
    opticalScale: 1, opticalOffsetX: 0, opticalOffsetY: 0,
    measuredCanvas: [0, 0],
    measuredContentWidthRatio: 1, measuredContentHeightRatio: 1,
    measuredContentOffsetXRatio: 0, measuredContentOffsetYRatio: 0,
    contentAspectRatio: 1, fallbackMode: 'LOCKUP_ALWAYS',
    accessibleLabel: 'CoinEx (design preview lockup)',
  },
};

export interface SlotFit {
  mode: 'WORDMARK' | 'LOCKUP';
  /** rendered canvas box (uniform scale — proportions always preserved) */
  imgW: number; imgH: number; imgLeft: number; imgTop: number;
  /** rendered opaque-content box, relative to the slot outer box */
  contentW: number; contentH: number; contentLeft: number; contentTop: number;
  /** useful optical fill: content area / usable area */
  fill: number;
  usableW: number; usableH: number;
  exceptionApplied: boolean;
  lockupReason?: string;
}

/**
 * Deterministic fit computation (build-time): height-first normalization by
 * aspect class over the MEASURED OPAQUE CONTENT, uniform scale only (never
 * stretch), width-capped to the usable area (never clip opaque pixels),
 * lockup fallback below the content-height floor.
 */
export function computeSlotFit(entry: LogoFitEntry, slot: SlotSize): SlotFit {
  const g = SLOT_GEOMETRY[slot];
  const usableW = g.w - 2 * g.padX;
  const usableH = g.h - 2 * g.padY;
  const base: SlotFit = {
    mode: 'LOCKUP', imgW: 0, imgH: 0, imgLeft: 0, imgTop: 0,
    contentW: 0, contentH: 0, contentLeft: 0, contentTop: 0,
    fill: 0, usableW, usableH, exceptionApplied: false,
  };
  if (!entry.assetPath || entry.fallbackMode === 'LOCKUP_ALWAYS') {
    return { ...base, lockupReason: 'no wordmark asset in repository' };
  }

  const [cvW, cvH] = entry.measuredCanvas;
  const cw = cvW * entry.measuredContentWidthRatio;
  const ch = cvH * entry.measuredContentHeightRatio;

  // uniform canvas scale s so the opaque content hits its class target
  let s: number;
  if (entry.aspectClass === 'ULTRA_WIDE') {
    s = usableW / cw; // width-first for ultra-wide marks
  } else {
    s = (usableH * CLASS_HEIGHT_FACTOR[entry.aspectClass]) / ch;
  }
  s *= entry.opticalScale;
  if (cw * s > usableW) s = usableW / cw;          // never exceed usable width
  if (ch * s > usableH) s = usableH / ch;          // never exceed usable height

  const contentW = cw * s;
  const contentH = ch * s;
  if (contentH < MIN_CONTENT_HEIGHT_PX) {
    return {
      ...base,
      lockupReason: `content height ${contentH.toFixed(1)}px < ${MIN_CONTENT_HEIGHT_PX}px floor in ${slot} slot`,
    };
  }

  const fill = (contentW * contentH) / (usableW * usableH);
  const outOfBand = fill < FILL_BAND.min || fill > FILL_BAND.max;
  if (outOfBand && !entry.exceptionNote) {
    // Deterministic guard: an out-of-band render without a documented exception
    // is a registry error — surfaced loudly at build time, never silently.
    throw new Error(
      `[foundation-logo-fit-registry] ${entry.exchangeId}/${slot}: fill ${(fill * 100).toFixed(1)}% ` +
      `outside ${FILL_BAND.min * 100}–${FILL_BAND.max * 100}% band with no exceptionNote`,
    );
  }

  // center the CONTENT (not the canvas) inside the usable area
  const contentLeft = g.padX + (usableW - contentW) / 2 + entry.opticalOffsetX;
  const contentTop = g.padY + (usableH - contentH) / 2 + entry.opticalOffsetY;
  const imgW = cvW * s;
  const imgH = cvH * s;
  const imgLeft = contentLeft - entry.measuredContentOffsetXRatio * imgW;
  const imgTop = contentTop - entry.measuredContentOffsetYRatio * imgH;

  return {
    mode: 'WORDMARK',
    imgW, imgH, imgLeft, imgTop,
    contentW, contentH, contentLeft, contentTop,
    fill, usableW, usableH,
    exceptionApplied: outOfBand,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * SQUARE LOGO SYSTEM V1 (owner direction: square-first specimen language).
 *
 * Every exchange renders in a square tile; three fitting kinds:
 *   PLATE           — full-bleed square brand plate (rendered edge-to-edge,
 *                     rounded tile corners; app-icon treatment);
 *   GLYPH           — transparent symbol (circle/mark) centered on a tile
 *                     background at a normalized inner scale;
 *   WORDMARK_PLAQUE — short wordmark centered on a plate-style tile using its
 *                     measured opaque content box.
 * Measured 2026-07-22 (PIL alpha bbox + corner opacity + mean luminance).
 * Presentation metadata only — no commercial meaning.
 * ════════════════════════════════════════════════════════════════════════ */

export type SquareKind = 'PLATE' | 'GLYPH' | 'WORDMARK_PLAQUE';
/**
 * Card-scale tiers (owner refinement 005): sized for real card surfaces, not
 * decorative icons. HERO_XL → hero/identity blocks · CARD_L → comparison /
 * featured cards · ROW_M → ranking/directory rows · COMPACT_S → bottom offer
 * blocks and compact entries (kept ≥52px so mobile commercial tiles stay
 * prominent).
 */
export type SquareTier = 'HERO_XL' | 'CARD_L' | 'ROW_M' | 'COMPACT_S';
/** plate/tile tone used to pick ring chrome on light vs dark surfaces */
export type PlateTone = 'DARK' | 'LIGHT' | 'COLOR';

export interface SquareLogoEntry {
  exchangeId: string;
  displayName: string;
  assetPath: string;
  kind: SquareKind;
  plateTone: PlateTone;
  /** tile background for GLYPH / WORDMARK_PLAQUE (PLATE brings its own) */
  tileBg: 'LIGHT' | 'NEUTRAL' | 'DARK';
  /**
   * inner scale nudge relative to GLYPH_INNER_SCALE / PLAQUE_WIDTH_SCALE.
   * Normally 0.94–1.06; composed app-icon treatments (symbol isolated from a
   * lockup onto a plate-style tile) may use a documented smaller value.
   */
  opticalScale: number;
  /** measured canvas + opaque content (needed for GLYPH / WORDMARK_PLAQUE fit) */
  measuredCanvas: [number, number];
  measuredContentWidthRatio: number;
  measuredContentHeightRatio: number;
  measuredContentOffsetXRatio: number;
  measuredContentOffsetYRatio: number;
  contentAspectRatio: number;
  accessibleLabel: string;
  note?: string;
}

export const SQUARE_TIERS: Record<SquareTier, { size: number; radius: number }> = {
  HERO_XL:   { size: 96, radius: 20 },
  CARD_L:    { size: 76, radius: 16 },
  ROW_M:     { size: 60, radius: 13 },
  COMPACT_S: { size: 52, radius: 11 },
};

/** minimum rendered primary-mark height per tier (owner rule; no silent breach) */
export const MIN_MARK_HEIGHT: Record<SquareTier, number> = {
  HERO_XL: 48, CARD_L: 40, ROW_M: 32, COMPACT_S: 26,
};

/** GLYPH inner-diameter share of the tile; PLAQUE wordmark width share. */
export const GLYPH_INNER_SCALE = 0.9;
export const PLAQUE_WIDTH_SCALE = 0.76;
/** minimum rendered opaque-content height for WORDMARK_PLAQUE marks */
export const MIN_PLAQUE_CONTENT_HEIGHT_PX = 8;

const sq = (
  exchangeId: string, displayName: string, assetPath: string, kind: SquareKind,
  plateTone: PlateTone, extra: Partial<SquareLogoEntry> = {},
): SquareLogoEntry => ({
  exchangeId, displayName, assetPath, kind, plateTone,
  tileBg: 'LIGHT', opticalScale: 1,
  measuredCanvas: [250, 250],
  measuredContentWidthRatio: 1, measuredContentHeightRatio: 1,
  measuredContentOffsetXRatio: 0, measuredContentOffsetYRatio: 0,
  contentAspectRatio: 1,
  accessibleLabel: `${displayName} (design preview logo)`,
  ...extra,
});

export const SQUARE_LOGO_REGISTRY: Record<string, SquareLogoEntry> = {
  bybit: sq('bybit', 'Bybit', '/logos/bybit.png', 'PLATE', 'DARK', {
    note: 'dark square plate including the Bybit wordmark',
  }),
  okx: sq('okx', 'OKX', '/preview-media/alternatives/okx-logo-slot-512x160-v1.png', 'GLYPH', 'DARK', {
    tileBg: 'DARK',
    // composed app-icon treatment (owner corrections 004/005): the official
    // modular OKX quincunx symbol (measured region x69–181 × y24–135 of the
    // repository lockup) is isolated onto a black plate tile — matching OKX's
    // own white-mark-on-black icon. Symbol side ≈ 74% of the tile (inside the
    // 74–90% glyph band); the lockup wordmark lies fully outside the tile
    // viewport (31px source gap vs 19.9px used) and is never rendered.
    // No new asset was created.
    opticalScale: 0.822,
    measuredCanvas: [512, 160],
    measuredContentWidthRatio: 0.2207, measuredContentHeightRatio: 0.7,
    measuredContentOffsetXRatio: 0.1348, measuredContentOffsetYRatio: 0.15,
    contentAspectRatio: 1.009,
    note: 'official modular symbol composed on a black plate tile (from the repository lockup asset); wordmark stays outside the tile',
  }),
  bitget: sq('bitget', 'Bitget', '/logos/bitget.png', 'PLATE', 'COLOR', {
    measuredCanvas: [250, 248],
    note: 'cyan brand plate; 250×248 source cover-fitted (≤1px edge crop of the plate background only)',
  }),
  kucoin: sq('kucoin', 'KuCoin', '/logos/kucoin.png', 'PLATE', 'LIGHT'),
  bingx: sq('bingx', 'BingX', '/logos/bingx.png', 'PLATE', 'COLOR'),
  binance: sq('binance', 'Binance', '/logos/binance.png', 'PLATE', 'DARK'),
  phemex: sq('phemex', 'Phemex', '/logos/phemex.png', 'GLYPH', 'DARK', {
    note: 'circular dark glyph centered on a light tile',
  }),
  'gate-io': sq('gate-io', 'Gate.io', '/logos/gate-io.png', 'PLATE', 'LIGHT'),
  htx: sq('htx', 'HTX', '/logos/htx.png', 'GLYPH', 'LIGHT', {
    note: 'circular light glyph centered on a light tile',
  }),
  coinex: sq('coinex', 'CoinEx', '/logos/coinex.png', 'PLATE', 'LIGHT'),
  mexc: sq('mexc', 'MEXC', '/logos/mexc.png', 'PLATE', 'LIGHT', {
    note: 'clean MEXC symbol plate — the repository "MEXC Global" wordmark is retired from specimens',
  }),
};

export interface SquareFit {
  kind: SquareKind;
  tile: number;
  radius: number;
  /** rendered img box relative to the tile */
  imgW: number; imgH: number; imgLeft: number; imgTop: number;
  /** rendered opaque-content box relative to the tile (GLYPH/PLAQUE) */
  contentW: number; contentH: number; contentLeft: number; contentTop: number;
}

/** Deterministic square fit: PLATE covers, GLYPH/PLAQUE center measured content. */
export function computeSquareFit(entry: SquareLogoEntry, tier: SquareTier): SquareFit {
  const { size, radius } = SQUARE_TIERS[tier];
  if (entry.kind === 'PLATE') {
    return {
      kind: 'PLATE', tile: size, radius,
      imgW: size, imgH: size, imgLeft: 0, imgTop: 0,
      contentW: size, contentH: size, contentLeft: 0, contentTop: 0,
    };
  }
  const [cvW, cvH] = entry.measuredCanvas;
  const cw = cvW * entry.measuredContentWidthRatio;
  const ch = cvH * entry.measuredContentHeightRatio;
  let s: number;
  if (entry.kind === 'GLYPH') {
    s = (size * GLYPH_INNER_SCALE * entry.opticalScale) / Math.max(cw, ch);
  } else {
    s = (size * PLAQUE_WIDTH_SCALE * entry.opticalScale) / cw;
  }
  const contentW = cw * s;
  const contentH = ch * s;
  if (entry.kind === 'WORDMARK_PLAQUE' && contentH < MIN_PLAQUE_CONTENT_HEIGHT_PX) {
    throw new Error(
      `[square-registry] ${entry.exchangeId}/${tier}: plaque content height ${contentH.toFixed(1)}px < ${MIN_PLAQUE_CONTENT_HEIGHT_PX}px`,
    );
  }
  // per-tier primary-mark floor — build fails loudly rather than shipping a
  // visually tiny mark (no silent exception)
  if (contentH < MIN_MARK_HEIGHT[tier] && !entry.note) {
    throw new Error(
      `[square-registry] ${entry.exchangeId}/${tier}: mark height ${contentH.toFixed(1)}px < ${MIN_MARK_HEIGHT[tier]}px floor with no documenting note`,
    );
  }
  const contentLeft = (size - contentW) / 2;
  const contentTop = (size - contentH) / 2;
  const imgW = cvW * s;
  const imgH = cvH * s;
  return {
    kind: entry.kind, tile: size, radius,
    imgW, imgH,
    imgLeft: contentLeft - entry.measuredContentOffsetXRatio * imgW,
    imgTop: contentTop - entry.measuredContentOffsetYRatio * imgH,
    contentW, contentH, contentLeft, contentTop,
  };
}
