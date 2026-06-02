/**
 * CryptoBonusWorld — Evidence Registry Schema
 *
 * Every factual claim published on the site must trace back to one of:
 *  1. An official exchange source (primary)
 *  2. A secondary corroborating source (optional, raises confidence)
 *
 * FIELD NAMES: Use the standardized EVIDENCE_FIELDS enum.
 * CONFIDENCE: 0.0–1.0. See calculateConfidence() in evidenceEngine.ts.
 * CONFLICT STATUS: if official and secondary disagree → 'conflict',
 *                  set manualReviewRequired = true.
 */

// ── Enums ─────────────────────────────────────────────────────────────────────

/**
 * Standardized field names for all verifiable claims.
 * Adding a new field here requires a corresponding FACT_CHECK_RULES entry.
 */
export const EVIDENCE_FIELDS = {
  // Bonus
  BONUS_AMOUNT:          'bonus_amount',
  BONUS_CURRENCY:        'bonus_currency',
  BONUS_EXPIRY_DAYS:     'bonus_expiry_days',
  BONUS_REQUIRES_KYC:    'bonus_requires_kyc',
  BONUS_REQUIRES_DEPOSIT:'bonus_requires_deposit',
  BONUS_MIN_DEPOSIT:     'bonus_min_deposit',
  BONUS_PROMO_CODE:      'bonus_promo_code',
  // Fees
  SPOT_MAKER_FEE:        'spot_maker_fee',
  SPOT_TAKER_FEE:        'spot_taker_fee',
  FUTURES_MAKER_FEE:     'futures_maker_fee',
  FUTURES_TAKER_FEE:     'futures_taker_fee',
  MAX_FUTURES_LEVERAGE:  'max_futures_leverage',
  // KYC / Access
  KYC_REQUIRED:          'kyc_required',
  NO_KYC_WITHDRAWAL_LIMIT: 'no_kyc_withdrawal_limit',
  KYC_LEVELS_COUNT:      'kyc_levels_count',
  // Features
  P2P_AVAILABLE:         'p2p_available',
  FUTURES_AVAILABLE:     'futures_available',
  COPY_TRADING:          'copy_trading',
  STAKING_AVAILABLE:     'staking_available',
  // Trust / Compliance
  PROOF_OF_RESERVES:     'proof_of_reserves',
  LICENCES:              'licences',
  HEADQUARTERS:          'headquarters',
  FOUNDED_YEAR:          'founded_year',
  // Geography
  RESTRICTED_US:         'restricted_us',
  RESTRICTED_EU:         'restricted_eu',
  // Deposits / Payments
  FIAT_DEPOSIT_METHODS:  'fiat_deposit_methods',
  MIN_DEPOSIT_USD:       'min_deposit_usd',
  // Platform
  TRADING_PAIRS_COUNT:   'trading_pairs_count',
  MOBILE_APP_IOS:        'mobile_app_ios',
  MOBILE_APP_ANDROID:    'mobile_app_android',
} as const;

export type EvidenceFieldName = typeof EVIDENCE_FIELDS[keyof typeof EVIDENCE_FIELDS];

/** Source type classification — determines source quality multiplier */
export type SourceType =
  | 'official-promo'       // Exchange official promotion/bonus page
  | 'official-fees'        // Exchange official fee schedule
  | 'official-kyc'         // Exchange official KYC/verification page
  | 'official-legal'       // Exchange official ToS / restricted-countries page
  | 'official-reserves'    // Exchange official proof-of-reserves page
  | 'official-p2p'         // Exchange official P2P page
  | 'official-app'         // App store listing (Apple/Google)
  | 'official-blog'        // Exchange official blog/announcement
  | 'official-help'        // Exchange official help center article
  | 'official-affiliate'   // Exchange official affiliate/referral page
  | 'official-other'       // Any other official exchange page
  | 'secondary-news'       // News article (CoinDesk, CoinTelegraph, etc.)
  | 'secondary-review'     // Third-party review site
  | 'secondary-reddit'     // Reddit/community post
  | 'internal-test'        // Our own hands-on testing (registration, deposit, etc.);

/** Conflict status of a specific fact */
export type ConflictStatus = 'ok' | 'conflict' | 'unverified' | 'outdated' | 'needs-check';

/** Frequency at which this field should be re-verified */
export type CheckFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

// ── Source reference ──────────────────────────────────────────────────────────

export interface EvidenceSource {
  /** Full URL to the source page */
  url: string;
  /** Human-readable label */
  label: string;
  /** Classification for quality scoring */
  type: SourceType;
  /** ISO 8601 date this URL was last accessed/verified */
  lastAccessed?: string;
  /** Brief notes about what was found at this URL */
  notes?: string;
}

// ── Fact record ───────────────────────────────────────────────────────────────

export interface EvidenceFact {
  /** Standardized field name — must be one of EVIDENCE_FIELDS values */
  field: EvidenceFieldName;
  /**
   * The current claimed value for this field.
   * Use the same type as the corresponding field in exchanges.json.
   */
  currentValue: string | number | boolean | string[] | null;
  /** Unit of the value (e.g. "USDT", "USD", "%", "days") */
  unit?: string;
  /** Key into the parent exchange's sources object for primary source */
  officialSourceKey?: string;
  /** Direct URL to the official source page (can override officialSourceKey lookup) */
  officialSourceUrl?: string;
  /** Optional secondary/corroborating source URL */
  secondarySourceUrl?: string;
  /** ISO 8601 date this specific fact was last verified */
  lastChecked: string;
  /** Who performed the check */
  checkedBy: 'human' | 'auto' | 'unknown';
  /**
   * Confidence score: 0.0 – 1.0
   * Calculated by calculateConfidence() but stored for fast rendering.
   * Manual override allowed when confidence can't be auto-computed.
   */
  confidenceScore: number;
  /** Conflict or freshness status */
  conflictStatus: ConflictStatus;
  /** Set true when sources conflict or confidence < 0.5 */
  manualReviewRequired: boolean;
  /** Additional editorial notes about this fact */
  notes?: string;
}

// ── Exchange evidence file ────────────────────────────────────────────────────

export interface ExchangeSourceRegistry {
  /** Official fees page */
  fees?: EvidenceSource;
  /** Official KYC/verification guide */
  kyc?: EvidenceSource;
  /** Official bonus/promotion page */
  bonus?: EvidenceSource;
  /** Official restricted-countries / legal page */
  restricted_countries?: EvidenceSource;
  /** Official terms of service */
  terms?: EvidenceSource;
  /** Official proof-of-reserves page */
  proof_of_reserves?: EvidenceSource;
  /** Official P2P marketplace */
  p2p?: EvidenceSource;
  /** Apple App Store listing */
  app_ios?: EvidenceSource;
  /** Google Play Store listing */
  app_android?: EvidenceSource;
  /** Official futures/derivatives page */
  futures?: EvidenceSource;
  /** Official affiliate/referral program */
  affiliate?: EvidenceSource;
  /** Copy-trading feature page */
  copy_trading?: EvidenceSource;
  /** Help center / support hub */
  help_center?: EvidenceSource;
  /** Allow arbitrary extra keys */
  [key: string]: EvidenceSource | undefined;
}

// ── Screenshot registry ───────────────────────────────────────────────────────

/**
 * Lifecycle status of a single screenshot.
 *   missing              — category applies but no screenshot taken yet
 *   available            — real screenshot on disk, path is populated
 *   outdated             — screenshot exists but capturedAt > 90 days old
 *   not_applicable       — feature/category doesn't exist on this exchange
 *   needs_manual_capture — same as missing; signals editorial action required
 */
export type ScreenshotStatus =
  | 'missing'
  | 'available'
  | 'outdated'
  | 'not_applicable'
  | 'needs_manual_capture';

/**
 * The ten canonical screenshot categories every exchange review can have.
 * Naming convention: category = UI surface being captured.
 */
export type ScreenshotCategory =
  | 'registration'
  | 'kyc'
  | 'bonus'
  | 'deposit'
  | 'p2p'
  | 'spot'
  | 'futures'
  | 'fees'
  | 'mobile_app'
  | 'proof_of_reserves';

/**
 * Metadata for a single screenshot slot in the registry.
 * `path` follows the convention:
 *   /screenshots/{exchange}/{category}/{geo}-{device}-{yyyy-mm}.webp
 * e.g. /screenshots/bybit/registration/global-desktop-2026-06.webp
 */
export interface ScreenshotEntry {
  /** Current capture status */
  status: ScreenshotStatus;
  /** Path relative to /public — null until screenshot is on disk */
  path: string | null;
  /** ISO YYYY-MM when this screenshot was captured — null if not yet captured */
  capturedAt: string | null;
  /** Geographic variant tag — "GLOBAL" | "US" | "EU" | "ASIA" etc. */
  geo: string;
  /** Device form factor used for capture */
  device: 'desktop' | 'mobile';
  /** Optional editorial notes (e.g. "only visible after login") */
  notes?: string;
}

/**
 * One entry per ScreenshotCategory.
 * Only categories relevant to the exchange need to be present.
 */
export type ScreenshotRegistry = Partial<Record<ScreenshotCategory, ScreenshotEntry>>;

export interface ExchangeEvidence {
  /** Exchange slug — must match exchanges.json */
  exchange: string;
  /** ISO 8601 date this evidence file was last updated */
  updatedAt: string;
  /** Official source URL registry for this exchange */
  sources: ExchangeSourceRegistry;
  /** Verified facts — one entry per EVIDENCE_FIELDS constant */
  facts: EvidenceFact[];
  /**
   * Screenshot registry — one entry per ScreenshotCategory.
   * Set status to 'available' and populate path once a real screenshot is on disk.
   * Set status to 'not_applicable' for features that don't exist on this exchange.
   */
  screenshots: ScreenshotRegistry;
}

// ── Monitoring schedule ───────────────────────────────────────────────────────

/**
 * Check frequency per field — used by the audit script to flag stale facts.
 * These are MAXIMUM allowed ages before the fact is considered outdated.
 */
export const CHECK_SCHEDULE: Record<EvidenceFieldName, { frequency: CheckFrequency; maxAgeDays: number }> = {
  // Bonus fields — change frequently (campaign-driven)
  bonus_amount:           { frequency: 'daily',    maxAgeDays: 1  },
  bonus_currency:         { frequency: 'weekly',   maxAgeDays: 7  },
  bonus_expiry_days:      { frequency: 'daily',    maxAgeDays: 1  },
  bonus_requires_kyc:     { frequency: 'weekly',   maxAgeDays: 7  },
  bonus_requires_deposit: { frequency: 'weekly',   maxAgeDays: 7  },
  bonus_min_deposit:      { frequency: 'weekly',   maxAgeDays: 7  },
  bonus_promo_code:       { frequency: 'weekly',   maxAgeDays: 7  },
  // Fees — change occasionally with protocol upgrades
  spot_maker_fee:         { frequency: 'weekly',   maxAgeDays: 7  },
  spot_taker_fee:         { frequency: 'weekly',   maxAgeDays: 7  },
  futures_maker_fee:      { frequency: 'weekly',   maxAgeDays: 7  },
  futures_taker_fee:      { frequency: 'weekly',   maxAgeDays: 7  },
  max_futures_leverage:   { frequency: 'monthly',  maxAgeDays: 30 },
  // KYC — changes rarely, high impact when it does
  kyc_required:           { frequency: 'weekly',   maxAgeDays: 7  },
  no_kyc_withdrawal_limit:{ frequency: 'weekly',   maxAgeDays: 7  },
  kyc_levels_count:       { frequency: 'monthly',  maxAgeDays: 30 },
  // Features — stable
  p2p_available:          { frequency: 'weekly',   maxAgeDays: 7  },
  futures_available:      { frequency: 'monthly',  maxAgeDays: 30 },
  copy_trading:           { frequency: 'monthly',  maxAgeDays: 30 },
  staking_available:      { frequency: 'monthly',  maxAgeDays: 30 },
  // Trust / Compliance — very stable
  proof_of_reserves:      { frequency: 'monthly',  maxAgeDays: 30 },
  licences:               { frequency: 'quarterly',maxAgeDays: 90 },
  headquarters:           { frequency: 'quarterly',maxAgeDays: 90 },
  founded_year:           { frequency: 'quarterly',maxAgeDays: 365},
  // Geography — changes with regulatory environment
  restricted_us:          { frequency: 'weekly',   maxAgeDays: 7  },
  restricted_eu:          { frequency: 'weekly',   maxAgeDays: 7  },
  // Deposits / Payments
  fiat_deposit_methods:   { frequency: 'weekly',   maxAgeDays: 7  },
  min_deposit_usd:        { frequency: 'weekly',   maxAgeDays: 7  },
  // Platform
  trading_pairs_count:    { frequency: 'monthly',  maxAgeDays: 30 },
  mobile_app_ios:         { frequency: 'monthly',  maxAgeDays: 30 },
  mobile_app_android:     { frequency: 'monthly',  maxAgeDays: 30 },
};
