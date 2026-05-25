/**
 * mediaConfig.ts — Real Media Support Architecture
 * ==================================================
 *
 * Defines the media infrastructure for CryptoBonusWorld:
 *
 *   Types for all media assets (screenshots, galleries, tutorials, videos)
 *   Path conventions and naming standards
 *   Responsive image config (sizes, formats, breakpoints)
 *   Video embed whitelist and config
 *   Per-exchange media registry
 *   Alt text generation helpers
 *
 * Design philosophy:
 *   - All media is optional — pages degrade gracefully with no images
 *   - Screenshots are versioned by date (exchange UIs change frequently)
 *   - Video embeds are privacy-enhanced (no tracking cookies on load)
 *   - All images have required alt text for accessibility and SEO
 *
 * Directory structure (under /public/media/):
 *   /public/media/exchanges/[slug]/
 *     ui-[YYYY-MM].webp          — Exchange UI screenshot (dated)
 *     bonus-[YYYY-MM].webp       — Bonus offer screenshot (dated)
 *     app-[YYYY-MM].webp         — Mobile app screenshot (dated)
 *     logo.svg                   — Logo (canonical path; also in /logos/)
 *
 *   /public/media/guides/[slug]/
 *     step-[N].webp              — Tutorial step screenshots
 *     hero.webp                  — Guide hero image
 *
 *   /public/media/compare/
 *     [slug-a]-vs-[slug-b].webp  — Side-by-side comparison visual
 *
 *   /public/media/coins/[slug]/
 *     chart.webp                 — Price chart placeholder
 *
 *   /public/media/team/
 *     [reviewer-slug].webp       — Reviewer profile photo
 */

// ── Media asset types ─────────────────────────────────────────────────────────

export type MediaCategory =
  | 'exchange-ui'
  | 'exchange-bonus'
  | 'exchange-app'
  | 'guide-step'
  | 'guide-hero'
  | 'compare-visual'
  | 'coin-chart'
  | 'team-photo'
  | 'infographic'
  | 'video-thumbnail';

export type MediaFormat = 'webp' | 'png' | 'jpg' | 'svg' | 'gif';

export interface MediaAsset {
  /** Path relative to /public, e.g. /media/exchanges/bybit/ui-2026-05.webp */
  src: string;
  /** Full descriptive alt text — required, never empty */
  alt: string;
  width: number;
  height: number;
  format: MediaFormat;
  category: MediaCategory;
  /** ISO date the screenshot was taken — for freshness tracking */
  capturedAt?: string;
  /** True if the asset has been uploaded to the server */
  uploaded: boolean;
  /** Caption text shown below image (optional) */
  caption?: string;
}

// ── Responsive image config ───────────────────────────────────────────────────

/** Standard breakpoints for responsive images */
export const MEDIA_BREAKPOINTS = {
  mobile:  480,
  tablet:  768,
  desktop: 1200,
  wide:    1600,
} as const;

/** Standard sizes attribute for each use-case */
export const MEDIA_SIZES: Record<string, string> = {
  hero:        '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px',
  card:        '(max-width: 480px) 100vw, (max-width: 768px) 50vw, 320px',
  gallery:     '(max-width: 480px) 100vw, (max-width: 768px) 50vw, 400px',
  'guide-step':'(max-width: 768px) 100vw, 720px',
  'team-photo':'96px',
  inline:      '(max-width: 480px) 100vw, 480px',
};

/** Recommended image dimensions by use-case (width × height) */
export const MEDIA_DIMENSIONS: Record<MediaCategory, { w: number; h: number }> = {
  'exchange-ui':    { w: 1280, h: 720  },
  'exchange-bonus': { w: 800,  h: 450  },
  'exchange-app':   { w: 390,  h: 844  },
  'guide-step':     { w: 800,  h: 500  },
  'guide-hero':     { w: 1200, h: 630  },
  'compare-visual': { w: 1200, h: 400  },
  'coin-chart':     { w: 800,  h: 300  },
  'team-photo':     { w: 200,  h: 200  },
  'infographic':    { w: 800,  h: 1000 },
  'video-thumbnail':{ w: 1280, h: 720  },
};

// ── Path builders ─────────────────────────────────────────────────────────────

/**
 * Get the canonical path for an exchange UI screenshot.
 * Returns null if no screenshot exists (page degrades gracefully).
 */
export function getExchangeScreenshotPath(
  exchangeSlug: string,
  type: 'ui' | 'bonus' | 'app',
  dateStr?: string,
): string {
  const date = dateStr ?? new Date().toISOString().slice(0, 7); // YYYY-MM
  return `/media/exchanges/${exchangeSlug}/${type}-${date}.webp`;
}

/**
 * Get path for a guide step image.
 */
export function getGuideStepPath(guideSlug: string, stepNumber: number): string {
  return `/media/guides/${guideSlug}/step-${stepNumber}.webp`;
}

/**
 * Get path for a compare visual.
 */
export function getCompareVisualPath(slugA: string, slugB: string): string {
  // Always alphabetical for consistency
  const [a, b] = [slugA, slugB].sort();
  return `/media/compare/${a}-vs-${b}.webp`;
}

/**
 * Get path for reviewer team photo.
 */
export function getTeamPhotoPath(reviewerSlug: string): string {
  return `/media/team/${reviewerSlug}.webp`;
}

// ── Alt text generators ───────────────────────────────────────────────────────

/**
 * Generate accessible, SEO-friendly alt text for exchange screenshots.
 */
export function exchangeScreenshotAlt(
  exchangeName: string,
  type: 'ui' | 'bonus' | 'app',
  context?: string,
): string {
  const descriptions: Record<string, string> = {
    ui:    `${exchangeName} trading platform interface${context ? ` — ${context}` : ''}`,
    bonus: `${exchangeName} welcome bonus offer page${context ? ` — ${context}` : ''}`,
    app:   `${exchangeName} mobile app screenshot${context ? ` — ${context}` : ''}`,
  };
  return descriptions[type] ?? `${exchangeName} screenshot`;
}

/**
 * Generate alt text for guide step images.
 */
export function guideStepAlt(guideTitle: string, stepNumber: number, stepDescription: string): string {
  return `Step ${stepNumber}: ${stepDescription} — ${guideTitle}`;
}

// ── Video embed config ────────────────────────────────────────────────────────

export type VideoProvider = 'youtube' | 'vimeo' | 'loom';

export interface VideoEmbed {
  provider: VideoProvider;
  videoId: string;
  title: string;
  /** Thumbnail image path */
  thumbnailSrc?: string;
  /** Duration in seconds */
  durationSeconds?: number;
  /** ISO date uploaded */
  uploadedAt?: string;
  /** Whether to use privacy-enhanced embed (no tracking cookies until play) */
  privacyMode: boolean;
}

/**
 * Build the embed URL for a video.
 * Privacy-mode uses no-cookie variants where available.
 */
export function buildVideoEmbedUrl(embed: VideoEmbed): string {
  switch (embed.provider) {
    case 'youtube':
      const ytBase = embed.privacyMode
        ? 'https://www.youtube-nocookie.com/embed/'
        : 'https://www.youtube.com/embed/';
      return `${ytBase}${embed.videoId}?rel=0&modestbranding=1`;

    case 'vimeo':
      return `https://player.vimeo.com/video/${embed.videoId}?dnt=${embed.privacyMode ? 1 : 0}`;

    case 'loom':
      return `https://www.loom.com/embed/${embed.videoId}`;

    default:
      return '';
  }
}

/**
 * Build schema.org VideoObject for a video embed.
 */
export function buildVideoSchema(embed: VideoEmbed, description: string): object {
  return {
    '@type': 'VideoObject',
    name: embed.title,
    description,
    embedUrl: buildVideoEmbedUrl(embed),
    ...(embed.thumbnailSrc ? { thumbnailUrl: `https://cryptobonusworld.com${embed.thumbnailSrc}` } : {}),
    ...(embed.uploadedAt ? { uploadDate: embed.uploadedAt } : {}),
    ...(embed.durationSeconds ? { duration: `PT${embed.durationSeconds}S` } : {}),
  };
}

// ── Per-exchange media registry ───────────────────────────────────────────────

export interface ExchangeMediaRecord {
  exchangeSlug: string;
  /** Most recent UI screenshot date — null if not yet captured */
  uiScreenshotDate: string | null;
  /** Most recent bonus screenshot date */
  bonusScreenshotDate: string | null;
  /** Mobile app screenshot date */
  appScreenshotDate: string | null;
  /** Video walkthroughs */
  videos: VideoEmbed[];
  /** Gallery images (UI detail screenshots) */
  galleryImages: MediaAsset[];
}

/**
 * Registry of exchanges that have media assets ready.
 *
 * Screenshot status guide:
 *   uiScreenshotDate: null     → /media/exchanges/[slug]/ui-YYYY-MM.webp not yet captured
 *   bonusScreenshotDate: null  → bonus page screenshot not yet captured
 *   appScreenshotDate: null    → mobile app screenshot not yet captured
 *
 * Populate dates as screenshots are captured. Pages degrade gracefully to text-only
 * when dates are null — MediaGallery and ExchangeHero skip missing assets automatically.
 *
 * Directory convention: /public/media/exchanges/[slug]/
 *   ui-YYYY-MM.webp            Exchange UI screenshot (1280×720)
 *   bonus-YYYY-MM.webp         Bonus offer page screenshot (800×450)
 *   app-YYYY-MM.webp           Mobile app screenshot (390×844)
 */
export const EXCHANGE_MEDIA_REGISTRY: ExchangeMediaRecord[] = [
  {
    exchangeSlug: 'bybit',
    uiScreenshotDate: null,
    bonusScreenshotDate: null,
    appScreenshotDate: null,
    videos: [],
    galleryImages: [],
  },
  {
    exchangeSlug: 'binance',
    uiScreenshotDate: null,
    bonusScreenshotDate: null,
    appScreenshotDate: null,
    videos: [],
    galleryImages: [],
  },
  {
    exchangeSlug: 'okx',
    uiScreenshotDate: null,
    bonusScreenshotDate: null,
    appScreenshotDate: null,
    videos: [],
    galleryImages: [],
  },
  {
    exchangeSlug: 'mexc',
    uiScreenshotDate: null,
    bonusScreenshotDate: null,
    appScreenshotDate: null,
    videos: [],
    galleryImages: [],
  },
  {
    exchangeSlug: 'bitget',
    uiScreenshotDate: null,
    bonusScreenshotDate: null,
    appScreenshotDate: null,
    videos: [],
    galleryImages: [],
  },
  {
    exchangeSlug: 'kucoin',
    uiScreenshotDate: null,
    bonusScreenshotDate: null,
    appScreenshotDate: null,
    videos: [],
    galleryImages: [],
  },
  {
    exchangeSlug: 'bingx',
    uiScreenshotDate: null,
    bonusScreenshotDate: null,
    appScreenshotDate: null,
    videos: [],
    galleryImages: [],
  },
  {
    exchangeSlug: 'gate-io',
    uiScreenshotDate: null,
    bonusScreenshotDate: null,
    appScreenshotDate: null,
    videos: [],
    galleryImages: [],
  },
  {
    exchangeSlug: 'htx',
    uiScreenshotDate: null,
    bonusScreenshotDate: null,
    appScreenshotDate: null,
    videos: [],
    galleryImages: [],
  },
  {
    exchangeSlug: 'coinex',
    uiScreenshotDate: null,
    bonusScreenshotDate: null,
    appScreenshotDate: null,
    videos: [],
    galleryImages: [],
  },
  {
    exchangeSlug: 'phemex',
    uiScreenshotDate: null,
    bonusScreenshotDate: null,
    appScreenshotDate: null,
    videos: [],
    galleryImages: [],
  },
  {
    exchangeSlug: 'bitunix',
    uiScreenshotDate: null,
    bonusScreenshotDate: null,
    appScreenshotDate: null,
    videos: [],
    galleryImages: [],
  },
  {
    exchangeSlug: 'lbank',
    uiScreenshotDate: null,
    bonusScreenshotDate: null,
    appScreenshotDate: null,
    videos: [],
    galleryImages: [],
  },
  {
    exchangeSlug: 'coinbase',
    uiScreenshotDate: null,
    bonusScreenshotDate: null,
    appScreenshotDate: null,
    videos: [],
    galleryImages: [],
  },
];

/**
 * Look up media record for an exchange.
 * Returns null if no media has been captured yet.
 */
export function getExchangeMedia(exchangeSlug: string): ExchangeMediaRecord | null {
  return EXCHANGE_MEDIA_REGISTRY.find(r => r.exchangeSlug === exchangeSlug) ?? null;
}

// ── Gallery config ────────────────────────────────────────────────────────────

export interface GalleryConfig {
  /** Maximum images per gallery */
  maxImages: number;
  /** Show lightbox on click */
  lightbox: boolean;
  /** Lazy-load all images */
  lazyLoad: boolean;
  /** Show captions below images */
  showCaptions: boolean;
}

export const DEFAULT_GALLERY_CONFIG: GalleryConfig = {
  maxImages: 6,
  lightbox: true,
  lazyLoad: true,
  showCaptions: true,
};

// ── Freshness checking ────────────────────────────────────────────────────────

/**
 * Check if a screenshot is stale (older than maxAgeDays).
 * Exchange UIs change regularly — screenshots older than 90 days should be refreshed.
 */
export function isScreenshotStale(
  capturedAt: string | null | undefined,
  maxAgeDays = 90,
): boolean {
  if (!capturedAt) return true;
  try {
    const d = new Date(capturedAt + '-01'); // YYYY-MM → first of month
    const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    return days > maxAgeDays;
  } catch {
    return true;
  }
}

/**
 * Get all exchanges that need new screenshots.
 */
export function getStaleScreenshots(
  registry: ExchangeMediaRecord[],
  maxAgeDays = 90,
): Array<{ exchangeSlug: string; staleFields: string[] }> {
  return registry
    .map(record => {
      const staleFields: string[] = [];
      if (isScreenshotStale(record.uiScreenshotDate, maxAgeDays))    staleFields.push('ui');
      if (isScreenshotStale(record.bonusScreenshotDate, maxAgeDays)) staleFields.push('bonus');
      return { exchangeSlug: record.exchangeSlug, staleFields };
    })
    .filter(r => r.staleFields.length > 0);
}
