/**
 * Exchange Constitution System — CryptoBonusWorld v1.0
 * =====================================================
 * Turns every exchange from a simple review page into a structured,
 * GEO-aware intelligence object.
 *
 * Design principles:
 *  - References exchanges.json via slug — does NOT duplicate exchange data
 *  - Enriches and governs the existing data layer
 *  - Every field has a confidence score + source reference
 *  - Uncertain fields are explicitly marked, never silently assumed
 *  - Build-time only — no backend, no runtime API
 *
 * Public display rules:
 *  - confidence ≥ 0.95 → confident public claim
 *  - confidence 0.80–0.94 → hedged claim ("likely available")
 *  - confidence 0.60–0.79 → uncertain ("availability may vary")
 *  - confidence < 0.60 → do NOT display; show generic disclaimer
 *
 * Usage:
 *   import { EXCHANGE_CONSTITUTIONS, getConstitution } from '../data/exchange-constitution';
 */

// ── Source priority levels ────────────────────────────────────────────────────

export type SourcePriority =
  | 'official'       // Exchange website, ToS, restricted-countries page, KYC page
  | 'trusted-agg'    // CMC, CoinGecko, CCData, SimilarWeb
  | 'manual-review'; // Screenshots, tester notes, redirect observations

export type ConflictStatus =
  | 'none'           // No conflict — single source or agreement
  | 'minor'          // Minor discrepancy between sources
  | 'conflict'       // Contradictory sources — requires manual resolution
  | 'outdated';      // Source is stale, may not reflect current state

// ── Evidence source ───────────────────────────────────────────────────────────

export interface ExchangeEvidenceSource {
  /** Field this evidence supports, e.g. 'geo.in.registrationAllowed' */
  fieldName: string;
  value: string | boolean | number;
  sourceType: SourcePriority;
  sourceUrl?: string;
  sourceLabel: string;
  confidenceScore: number;        // 0.0–1.0
  conflictStatus: ConflictStatus;
  lastVerified: string;           // ISO date
  notes?: string;
}

// ── Conflict record ───────────────────────────────────────────────────────────

export interface ExchangeConflict {
  fieldName: string;
  sourceA: string;
  valueA: string;
  sourceB: string;
  valueB: string;
  detectedAt: string;
  resolvedAt?: string;
  resolution?: string;
  manualReviewRequired: boolean;
}

// ── Identity ──────────────────────────────────────────────────────────────────

export interface ExchangeLicense {
  regulator: string;
  jurisdiction: string;
  licenseType: string;
  licenseNumber?: string;
  issuedAt?: string;
  status: 'active' | 'pending' | 'expired' | 'revoked' | 'unknown';
  sourceUrl?: string;
  confidenceScore: number;
  lastVerified: string;
}

export interface ExchangeLegalEntity {
  name: string;
  jurisdiction: string;
  registrationNumber?: string;
  notes?: string;
}

export interface ExchangeIdentity {
  /** Slug — matches exchanges.json */
  exchangeSlug: string;
  officialName: string;
  brandAliases: string[];
  officialDomains: string[];
  regionalDomains: Partial<Record<string, string>>; // { eea: 'https://...', us: 'https://...' }
  appLinks: {
    ios?: string;
    android?: string;
  };
  legalEntities: ExchangeLegalEntity[];
  headquarters: string;
  licenses: ExchangeLicense[];
  affiliateProgramAvailable: boolean;
  affiliateLinkStructure?: string; // URL template, e.g. 'https://partner.bybit.com/b/{code}'
}

// ── Regional versions ─────────────────────────────────────────────────────────

export type GeoRedirectBehavior =
  | 'none'              // Same domain globally
  | 'auto-redirect'     // Automatically redirects based on IP/browser
  | 'manual-select'     // User must select region
  | 'subdomain'         // Uses subdomain per region
  | 'separate-entity';  // Completely separate legal entity

export interface ExchangeRegionalVersion {
  regionGroup: string;          // eea | us | uk | sea | etc.
  domain: string;
  redirectBehavior: GeoRedirectBehavior;
  requiresSeparateAccount: boolean;
  kycRequired: boolean;
  bonusAvailable: boolean;
  productRestrictions: string[]; // Products not available in this regional version
  regulatoryNote?: string;
  confidenceScore: number;
  lastVerified: string;
}

// ── Product matrix ────────────────────────────────────────────────────────────

export interface ProductAvailability {
  available: boolean;
  confidenceScore: number;
  notes?: string;
  geoRestrictions?: string[]; // List of country codes or region groups where not available
}

export interface ExchangeProductMatrix {
  spotTrading: ProductAvailability;
  futuresPerp: ProductAvailability;
  futuresQuarterly: ProductAvailability;
  marginTrading: ProductAvailability;
  options: ProductAvailability;
  copyTrading: ProductAvailability;
  p2p: ProductAvailability;
  earn: ProductAvailability;
  staking: ProductAvailability;
  launchpool: ProductAvailability;
  launchpad: ProductAvailability;
  tradingBots: ProductAvailability;
  fiatDeposit: ProductAvailability;
  fiatWithdrawal: ProductAvailability;
  cryptoCard: ProductAvailability;
  nft: ProductAvailability;
  institutionalProducts: ProductAvailability;
}

// ── GEO rules matrix ──────────────────────────────────────────────────────────

export type RegistrationStatus =
  | 'allowed'
  | 'restricted'    // Allowed but with limitations
  | 'unavailable'   // Not available
  | 'needs-review'; // Uncertain — do not make public claims

export interface ExchangeGeoRule {
  /** ISO 3166-1 alpha-2 country code OR region group key */
  geoKey: string;
  geoType: 'country' | 'region';

  // Registration + access
  registrationAllowed: RegistrationStatus;
  citizenshipNote?: string;
  residencyNote?: string;
  ipRestricted?: boolean;

  // KYC
  kycRequired: boolean;
  kycLevel: 'none' | 'basic' | 'full' | 'enhanced' | 'unknown';
  kycNote?: string;

  // Products
  futuresAvailable: boolean;
  earnAvailable: boolean;
  p2pAvailable: boolean;
  fiatAvailable: boolean;

  // Payment
  paymentMethodNotes?: string;
  localCurrencySupport: string[]; // e.g. ['TRY', 'USD']

  // Bonus
  bonusAvailable: boolean;
  bonusNote?: string;

  // Affiliate
  affiliateLink?: string;

  // Domain
  preferredDomain?: string;
  preferredCta?: string;
  alternativeExchangeSlugs?: string[];

  // Compliance
  disclaimerRequired: boolean;
  riskWarningRequired: boolean;
  availabilityStatus: RegistrationStatus;

  // Evidence
  confidenceScore: number;       // 0.0–1.0
  lastChecked: string;           // ISO date
  manualReviewRequired: boolean;
  evidenceSources?: Pick<ExchangeEvidenceSource, 'sourceLabel' | 'sourceType' | 'sourceUrl' | 'lastVerified'>[];
}

// ── Bonus rule ────────────────────────────────────────────────────────────────

export interface ExchangeBonusRule {
  geoKey: string;          // 'global' | country code | region group
  bonusAmount?: number;
  bonusCurrency?: string;
  bonusTitle?: string;
  bonusTermsUrl?: string;
  campaignActive: boolean;
  requiresKyc: boolean;
  requiresDeposit: boolean;
  confidenceScore: number;
  lastVerified: string;
  notes?: string;
}

// ── Payment rule ──────────────────────────────────────────────────────────────

export interface ExchangePaymentRule {
  geoKey: string;
  methods: {
    method: string;
    currency: string;
    type: 'fiat' | 'crypto' | 'p2p' | 'card' | 'bank' | 'mobile-wallet' | 'instant-payment';
    isPrimary: boolean;
    note?: string;
    confidenceScore: number;
  }[];
  lastVerified: string;
}

// ── Screenshot rule ───────────────────────────────────────────────────────────

export type ScreenshotCategory = 'desktop' | 'mobile' | 'app' | 'bonus' | 'p2p' | 'kyc' | 'futures';

export interface ExchangeScreenshotRule {
  geoKey: string;
  category: ScreenshotCategory;
  /** Path in /public/media/exchanges/{slug}/{geoKey}/{category}/ */
  basePath?: string;
  capturedAt?: string;
  status: 'captured' | 'pending' | 'outdated' | 'not-required';
  fallbackGeoKey?: string; // Use another geo's screenshots as fallback
  notes?: string;
}

// ── Update schedule ───────────────────────────────────────────────────────────

export type UpdateFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'on-change';

export interface UpdateScheduleItem {
  field: string;
  frequency: UpdateFrequency;
  lastChecked?: string;
  nextDue?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  notes?: string;
}

export interface ExchangeUpdateSchedule {
  exchangeSlug: string;
  items: UpdateScheduleItem[];
  /** ISO date of last full constitution review */
  lastFullReview?: string;
  /** GitHub username or initials of last reviewer */
  reviewedBy?: string;
}

// ── Full constitution record ──────────────────────────────────────────────────

export interface ExchangeConstitution {
  /** Slug — must match exchanges.json */
  exchangeSlug: string;

  /** Overall confidence in this constitution's completeness */
  constitutionConfidence: number;

  /** ISO date this constitution was last fully reviewed */
  lastFullReview: string;

  /** Whether this constitution needs a full manual review */
  manualReviewRequired: boolean;

  /** Any active flags that need attention */
  flags: string[];

  identity: ExchangeIdentity;
  regionalVersions: ExchangeRegionalVersion[];
  products: ExchangeProductMatrix;
  geoRules: ExchangeGeoRule[];
  bonusRules: ExchangeBonusRule[];
  paymentRules: ExchangePaymentRule[];
  screenshotRules: ExchangeScreenshotRule[];
  updateSchedule: ExchangeUpdateSchedule;
  evidenceSources: ExchangeEvidenceSource[];
  conflicts: ExchangeConflict[];
}

// ── Shared defaults ───────────────────────────────────────────────────────────

/** Default product availability — all unknown until verified */
export const DEFAULT_PRODUCT_AVAILABILITY: ProductAvailability = {
  available: false,
  confidenceScore: 0,
  notes: 'Not yet verified',
};

export function makeProductMatrix(overrides: Partial<ExchangeProductMatrix> = {}): ExchangeProductMatrix {
  const d = DEFAULT_PRODUCT_AVAILABILITY;
  return {
    spotTrading: d,
    futuresPerp: d,
    futuresQuarterly: d,
    marginTrading: d,
    options: d,
    copyTrading: d,
    p2p: d,
    earn: d,
    staking: d,
    launchpool: d,
    launchpad: d,
    tradingBots: d,
    fiatDeposit: d,
    fiatWithdrawal: d,
    cryptoCard: d,
    nft: d,
    institutionalProducts: d,
    ...overrides,
  };
}

// ── Helper: make a confirmed product ─────────────────────────────────────────

function yes(notes?: string, geoRestrictions?: string[]): ProductAvailability {
  return { available: true, confidenceScore: 0.90, notes, geoRestrictions };
}
function yesHigh(notes?: string): ProductAvailability {
  return { available: true, confidenceScore: 0.95, notes };
}
function no(notes?: string): ProductAvailability {
  return { available: false, confidenceScore: 0.85, notes };
}
function uncertain(notes?: string): ProductAvailability {
  return { available: false, confidenceScore: 0.55, notes: notes ?? 'Not yet verified' };
}

// ── MVP Constitution data ─────────────────────────────────────────────────────

export const EXCHANGE_CONSTITUTIONS: ExchangeConstitution[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // BYBIT
  // ══════════════════════════════════════════════════════════════════════════
  {
    exchangeSlug: 'bybit',
    constitutionConfidence: 0.87,
    lastFullReview: '2026-05-28',
    manualReviewRequired: false,
    flags: ['verify-eu-license-status', 'verify-russia-availability'],

    identity: {
      exchangeSlug: 'bybit',
      officialName: 'Bybit Fintech Limited',
      brandAliases: ['Bybit', 'ByBit'],
      officialDomains: ['https://www.bybit.com'],
      regionalDomains: {
        eea: 'https://www.bybit.com/en-EU/',
      },
      appLinks: {
        ios: 'https://apps.apple.com/app/bybit-buy-trade-crypto/id1488296980',
        android: 'https://play.google.com/store/apps/details?id=com.bybit.app',
      },
      legalEntities: [
        { name: 'Bybit Fintech Limited', jurisdiction: 'British Virgin Islands', notes: 'Primary operating entity' },
        { name: 'Bybit Middle East FZE', jurisdiction: 'Dubai, UAE', notes: 'VARA-licensed entity' },
      ],
      headquarters: 'Dubai, UAE',
      licenses: [
        {
          regulator: 'Dubai Virtual Assets Regulatory Authority (VARA)',
          jurisdiction: 'UAE',
          licenseType: 'Virtual Asset Service Provider (VASP)',
          status: 'active',
          sourceUrl: 'https://www.vara.ae/en/registry/',
          confidenceScore: 0.92,
          lastVerified: '2026-05-28',
        },
      ],
      affiliateProgramAvailable: true,
      affiliateLinkStructure: 'https://partner.bybit.com/b/{code}',
    },

    regionalVersions: [
      {
        regionGroup: 'eea',
        domain: 'https://www.bybit.com/en-EU/',
        redirectBehavior: 'auto-redirect',
        requiresSeparateAccount: false,
        kycRequired: true,
        bonusAvailable: true,
        productRestrictions: [],
        regulatoryNote: 'Bybit EU users are directed to a regional version. Bonus terms and product scope may differ from the global offer. MiCA-alignment status: verify current state.',
        confidenceScore: 0.80,
        lastVerified: '2026-05-28',
      },
    ],

    products: makeProductMatrix({
      spotTrading:          yesHigh(),
      futuresPerp:          yesHigh('Leading perpetual futures platform'),
      futuresQuarterly:     yes(),
      marginTrading:        yes(),
      options:              yes('Options trading available'),
      copyTrading:          yesHigh('One of the strongest copy trading platforms'),
      p2p:                  yesHigh('Deep P2P liquidity, TRY/INR/NGN pairs'),
      earn:                 yes(),
      staking:              yes(),
      launchpool:           yes(),
      launchpad:            yes(),
      tradingBots:          yes(),
      fiatDeposit:          yes('Via card and third-party providers'),
      fiatWithdrawal:       yes(),
      cryptoCard:           uncertain('Bybit Card available in select regions'),
      nft:                  yes(),
      institutionalProducts: yes('Bybit Institutional available'),
    }),

    geoRules: [
      {
        geoKey: 'global',
        geoType: 'region',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'full',
        kycNote: 'KYC required for full access; limited trading available at lower tiers',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: true,
        localCurrencySupport: ['USD', 'USDT'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.93,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
        evidenceSources: [{ sourceLabel: 'Bybit website', sourceType: 'official', sourceUrl: 'https://www.bybit.com', lastVerified: '2026-05-28' }],
      },
      {
        geoKey: 'eea',
        geoType: 'region',
        registrationAllowed: 'restricted',
        kycRequired: true,
        kycLevel: 'full',
        kycNote: 'Full KYC required for EEA users under AML/MiCA-adjacent rules',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: true,
        localCurrencySupport: ['EUR'],
        bonusAvailable: true,
        bonusNote: 'Bonus terms may differ for EU users. Verify on bybit.com/en-EU/',
        preferredDomain: 'https://www.bybit.com/en-EU/',
        preferredCta: 'Open Bybit EU Version',
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'restricted',
        confidenceScore: 0.80,
        lastChecked: '2026-05-28',
        manualReviewRequired: true,
        evidenceSources: [{ sourceLabel: 'Bybit EU page', sourceType: 'official', sourceUrl: 'https://www.bybit.com/en-EU/', lastVerified: '2026-05-28' }],
      },
      {
        geoKey: 'ae',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'full',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: true,
        localCurrencySupport: ['AED', 'USD'],
        bonusAvailable: true,
        preferredCta: 'Open Bybit',
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.92,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
        evidenceSources: [{ sourceLabel: 'VARA Registry', sourceType: 'official', sourceUrl: 'https://www.vara.ae/en/registry/', lastVerified: '2026-05-28' }],
      },
      {
        geoKey: 'tr',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'basic',
        kycNote: 'Basic KYC for P2P access; full KYC for higher limits',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: false,
        paymentMethodNotes: 'No direct TRY fiat — P2P with TRY is the primary on-ramp',
        localCurrencySupport: ['TRY', 'USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.88,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'in',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: false,
        kycLevel: 'none',
        kycNote: 'No-KYC access available for basic trading; full KYC needed for higher withdrawals',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: false,
        paymentMethodNotes: 'No direct INR fiat — P2P with INR/UPI is the primary on-ramp',
        localCurrencySupport: ['INR', 'USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.88,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'br',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'full',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: true,
        localCurrencySupport: ['BRL', 'USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.85,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'pk',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'basic',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: false,
        paymentMethodNotes: 'JazzCash and EasyPaisa via P2P are primary methods',
        localCurrencySupport: ['PKR', 'USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.80,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'ke',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'basic',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: false,
        paymentMethodNotes: 'M-Pesa via P2P is the primary method',
        localCurrencySupport: ['KES', 'USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.78,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'ar',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'full',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: false,
        paymentMethodNotes: 'P2P with ARS is primary; USDT transfers common',
        localCurrencySupport: ['ARS', 'USD'],
        bonusAvailable: true,
        bonusNote: 'USDT bonuses act as a USD store of value — valuable in high-inflation context',
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.80,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'kz',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'basic',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: false,
        localCurrencySupport: ['KZT', 'USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.72,
        lastChecked: '2026-05-28',
        manualReviewRequired: true,
        evidenceSources: [{ sourceLabel: 'User reports / community', sourceType: 'manual-review', lastVerified: '2026-05-01' }],
      },
    ],

    bonusRules: [
      { geoKey: 'global', bonusAmount: 30000, bonusCurrency: 'USDT', bonusTitle: 'Up to 30,000 USDT Welcome Package', campaignActive: true, requiresKyc: true, requiresDeposit: true, confidenceScore: 0.93, lastVerified: '2026-05-28' },
      { geoKey: 'eea', campaignActive: true, requiresKyc: true, requiresDeposit: true, confidenceScore: 0.78, lastVerified: '2026-05-28', notes: 'EU bonus terms may differ — verify on bybit.com/en-EU/' },
    ],

    paymentRules: [
      { geoKey: 'tr', methods: [{ method: 'P2P with TRY', currency: 'TRY', type: 'p2p', isPrimary: true, note: 'Deep TRY/USDT liquidity', confidenceScore: 0.90 }, { method: 'Visa/Mastercard', currency: 'USD', type: 'card', isPrimary: false, confidenceScore: 0.85 }], lastVerified: '2026-05-28' },
      { geoKey: 'in', methods: [{ method: 'P2P with INR', currency: 'INR', type: 'p2p', isPrimary: true, confidenceScore: 0.88 }, { method: 'UPI via P2P', currency: 'INR', type: 'p2p', isPrimary: false, confidenceScore: 0.82 }], lastVerified: '2026-05-28' },
      { geoKey: 'br', methods: [{ method: 'PIX via P2P', currency: 'BRL', type: 'instant-payment', isPrimary: true, confidenceScore: 0.85 }, { method: 'Visa/Mastercard', currency: 'BRL', type: 'card', isPrimary: false, confidenceScore: 0.82 }], lastVerified: '2026-05-28' },
      { geoKey: 'pk', methods: [{ method: 'JazzCash via P2P', currency: 'PKR', type: 'mobile-wallet', isPrimary: true, confidenceScore: 0.82 }, { method: 'EasyPaisa via P2P', currency: 'PKR', type: 'mobile-wallet', isPrimary: false, confidenceScore: 0.80 }], lastVerified: '2026-05-28' },
      { geoKey: 'ke', methods: [{ method: 'M-Pesa via P2P', currency: 'KES', type: 'mobile-wallet', isPrimary: true, confidenceScore: 0.80 }], lastVerified: '2026-05-28' },
    ],

    screenshotRules: [
      { geoKey: 'global', category: 'desktop', status: 'pending' },
      { geoKey: 'global', category: 'mobile', status: 'pending' },
      { geoKey: 'global', category: 'bonus', status: 'pending' },
      { geoKey: 'global', category: 'p2p', status: 'pending' },
    ],

    updateSchedule: {
      exchangeSlug: 'bybit',
      lastFullReview: '2026-05-28',
      reviewedBy: 'editorial',
      items: [
        { field: 'bonusAmount', frequency: 'weekly', priority: 'critical', lastChecked: '2026-05-28' },
        { field: 'affiliateUrl', frequency: 'weekly', priority: 'critical', lastChecked: '2026-05-28' },
        { field: 'geo.eea.availabilityStatus', frequency: 'weekly', priority: 'high', lastChecked: '2026-05-28', notes: 'EU regulatory situation is evolving' },
        { field: 'geo.kz.registrationAllowed', frequency: 'monthly', priority: 'medium', lastChecked: '2026-05-01' },
        { field: 'licenses', frequency: 'monthly', priority: 'high', lastChecked: '2026-05-28' },
        { field: 'products', frequency: 'monthly', priority: 'medium', lastChecked: '2026-05-28' },
      ],
    },

    evidenceSources: [
      { fieldName: 'geo.ae.registrationAllowed', value: true, sourceType: 'official', sourceUrl: 'https://www.vara.ae/en/registry/', sourceLabel: 'VARA Registry', confidenceScore: 0.92, conflictStatus: 'none', lastVerified: '2026-05-28' },
      { fieldName: 'identity.licenses', value: 'VARA VASP active', sourceType: 'official', sourceUrl: 'https://www.bybit.com/en/about/', sourceLabel: 'Bybit About page', confidenceScore: 0.90, conflictStatus: 'none', lastVerified: '2026-05-28' },
    ],
    conflicts: [],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BINANCE
  // ══════════════════════════════════════════════════════════════════════════
  {
    exchangeSlug: 'binance',
    constitutionConfidence: 0.82,
    lastFullReview: '2026-05-28',
    manualReviewRequired: true,
    flags: ['eea-availability-varies-by-country', 'uk-not-available', 'us-not-available', 'russia-verify-sanctions'],

    identity: {
      exchangeSlug: 'binance',
      officialName: 'Binance Holdings Limited',
      brandAliases: ['Binance', 'BNB Exchange'],
      officialDomains: ['https://www.binance.com'],
      regionalDomains: {
        us: 'https://www.binance.us',
      },
      appLinks: {
        ios: 'https://apps.apple.com/app/binance-buy-bitcoin-crypto/id1436799971',
        android: 'https://play.google.com/store/apps/details?id=com.binance.dev',
      },
      legalEntities: [
        { name: 'Binance Holdings Limited', jurisdiction: 'Cayman Islands', notes: 'Parent entity' },
        { name: 'Binance Middle East & North Africa FZE', jurisdiction: 'Dubai, UAE', notes: 'VARA-licensed entity' },
        { name: 'BAM Trading Services (Binance.US)', jurisdiction: 'United States', notes: 'US-only entity, separate product' },
      ],
      headquarters: 'Cayman Islands (global operations decentralised)',
      licenses: [
        {
          regulator: 'Dubai Virtual Assets Regulatory Authority (VARA)',
          jurisdiction: 'UAE',
          licenseType: 'Virtual Asset Service Provider (VASP)',
          status: 'active',
          sourceUrl: 'https://www.vara.ae/en/registry/',
          confidenceScore: 0.90,
          lastVerified: '2026-05-28',
        },
      ],
      affiliateProgramAvailable: true,
      affiliateLinkStructure: 'https://accounts.binance.com/register?ref={code}',
    },

    regionalVersions: [
      {
        regionGroup: 'us',
        domain: 'https://www.binance.us',
        redirectBehavior: 'separate-entity',
        requiresSeparateAccount: true,
        kycRequired: true,
        bonusAvailable: false,
        productRestrictions: ['futures', 'margin', 'p2p'],
        regulatoryNote: 'US users must use Binance.US — a separate entity with a limited product set. Our affiliate program covers binance.com only.',
        confidenceScore: 0.95,
        lastVerified: '2026-05-28',
      },
    ],

    products: makeProductMatrix({
      spotTrading:           yesHigh('World\'s largest spot trading volume'),
      futuresPerp:           yesHigh(),
      futuresQuarterly:      yesHigh(),
      marginTrading:         yesHigh(),
      options:               yes(),
      copyTrading:           yes(),
      p2p:                   yesHigh('Deep P2P with 30+ fiat currencies'),
      earn:                  yesHigh(),
      staking:               yesHigh(),
      launchpool:            yesHigh('Most established launchpool program'),
      launchpad:             yesHigh(),
      tradingBots:           yes(),
      fiatDeposit:           yes('SEPA, card, 60+ payment methods'),
      fiatWithdrawal:        yes(),
      cryptoCard:            yes('Binance Card available in select EEA countries'),
      nft:                   yes(),
      institutionalProducts: yesHigh('Binance Institutional leading OTC/custody service'),
    }),

    geoRules: [
      {
        geoKey: 'global',
        geoType: 'region',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'full',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: true,
        localCurrencySupport: ['USD', 'USDT'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.90,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'eea',
        geoType: 'region',
        registrationAllowed: 'restricted',
        kycRequired: true,
        kycLevel: 'full',
        kycNote: 'KYC mandatory for all EU users',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: true,
        localCurrencySupport: ['EUR'],
        bonusAvailable: true,
        bonusNote: 'Bonus availability varies by EU country',
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'restricted',
        confidenceScore: 0.65,
        lastChecked: '2026-05-28',
        manualReviewRequired: true,
        evidenceSources: [{ sourceLabel: 'Multiple news reports on EEA licensing changes', sourceType: 'trusted-agg', lastVerified: '2026-04-01' }],
      },
      {
        geoKey: 'ae',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'full',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: true,
        localCurrencySupport: ['AED', 'USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.90,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'in',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'full',
        kycNote: 'KYC required; Indian regulations mandate full identity verification',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: false,
        paymentMethodNotes: 'P2P with INR/UPI is primary; direct fiat deposit limited',
        localCurrencySupport: ['INR', 'USD'],
        bonusAvailable: true,
        bonusNote: 'Note: India applies 30% CGT + 1% TDS on crypto transactions',
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.85,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'tr',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'full',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: false,
        localCurrencySupport: ['TRY', 'USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.88,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'br',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'full',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: true,
        localCurrencySupport: ['BRL', 'USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.87,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'ar',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'full',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: false,
        localCurrencySupport: ['ARS', 'USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.82,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'pk',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'full',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: false,
        localCurrencySupport: ['PKR', 'USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.80,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'ke',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'full',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: false,
        localCurrencySupport: ['KES', 'USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.80,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'kz',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'full',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: false,
        localCurrencySupport: ['KZT', 'USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.72,
        lastChecked: '2026-05-01',
        manualReviewRequired: true,
      },
    ],

    bonusRules: [
      { geoKey: 'global', bonusAmount: 19800, bonusCurrency: 'USDT', bonusTitle: 'Up to 19,800 USDT Welcome Bonus', campaignActive: true, requiresKyc: true, requiresDeposit: true, confidenceScore: 0.90, lastVerified: '2026-05-28' },
    ],

    paymentRules: [
      { geoKey: 'eea', methods: [{ method: 'SEPA Transfer', currency: 'EUR', type: 'bank', isPrimary: true, confidenceScore: 0.88 }, { method: 'Visa/Mastercard', currency: 'EUR', type: 'card', isPrimary: false, confidenceScore: 0.88 }], lastVerified: '2026-05-28' },
      { geoKey: 'in', methods: [{ method: 'P2P with INR', currency: 'INR', type: 'p2p', isPrimary: true, confidenceScore: 0.87 }, { method: 'UPI via P2P', currency: 'INR', type: 'p2p', isPrimary: false, confidenceScore: 0.83 }], lastVerified: '2026-05-28' },
      { geoKey: 'br', methods: [{ method: 'PIX', currency: 'BRL', type: 'instant-payment', isPrimary: true, confidenceScore: 0.87 }], lastVerified: '2026-05-28' },
    ],

    screenshotRules: [
      { geoKey: 'global', category: 'desktop', status: 'pending' },
      { geoKey: 'global', category: 'bonus', status: 'pending' },
    ],

    updateSchedule: {
      exchangeSlug: 'binance',
      lastFullReview: '2026-05-28',
      reviewedBy: 'editorial',
      items: [
        { field: 'bonusAmount', frequency: 'weekly', priority: 'critical', lastChecked: '2026-05-28' },
        { field: 'geo.eea.availabilityStatus', frequency: 'weekly', priority: 'critical', lastChecked: '2026-05-28', notes: 'EEA situation requires close monitoring' },
        { field: 'affiliateUrl', frequency: 'weekly', priority: 'critical', lastChecked: '2026-05-28' },
        { field: 'licenses', frequency: 'monthly', priority: 'high', lastChecked: '2026-05-28' },
      ],
    },

    evidenceSources: [
      { fieldName: 'geo.ae.registrationAllowed', value: true, sourceType: 'official', sourceUrl: 'https://www.vara.ae/en/registry/', sourceLabel: 'VARA Registry', confidenceScore: 0.90, conflictStatus: 'none', lastVerified: '2026-05-28' },
    ],
    conflicts: [
      { fieldName: 'geo.eea.registrationAllowed', sourceA: 'User reports (available)', valueA: 'allowed', sourceB: 'News coverage (some countries restricted)', valueB: 'restricted', detectedAt: '2026-04-01', manualReviewRequired: true },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // OKX
  // ══════════════════════════════════════════════════════════════════════════
  {
    exchangeSlug: 'okx',
    constitutionConfidence: 0.83,
    lastFullReview: '2026-05-28',
    manualReviewRequired: false,
    flags: ['india-unavailable-confirmed', 'us-not-available'],

    identity: {
      exchangeSlug: 'okx',
      officialName: 'OKX',
      brandAliases: ['OKX', 'OKEx', 'OK Exchange'],
      officialDomains: ['https://www.okx.com'],
      regionalDomains: {},
      appLinks: {
        ios: 'https://apps.apple.com/app/okx-buy-bitcoin-btc-crypto/id1327268470',
        android: 'https://play.google.com/store/apps/details?id=com.okinc.okex.gp',
      },
      legalEntities: [
        { name: 'OKX Malta Limited', jurisdiction: 'Malta', notes: 'EU-accessible entity' },
        { name: 'OKX Middle East FZE', jurisdiction: 'Dubai, UAE', notes: 'VARA-licensed entity' },
      ],
      headquarters: 'Seychelles (global); Dubai (MENA)',
      licenses: [
        {
          regulator: 'Dubai Virtual Assets Regulatory Authority (VARA)',
          jurisdiction: 'UAE',
          licenseType: 'Virtual Asset Service Provider (VASP)',
          status: 'active',
          confidenceScore: 0.88,
          lastVerified: '2026-05-28',
        },
      ],
      affiliateProgramAvailable: true,
      affiliateLinkStructure: 'https://www.okx.com/join/{code}',
    },

    regionalVersions: [],

    products: makeProductMatrix({
      spotTrading:       yesHigh(),
      futuresPerp:       yesHigh(),
      futuresQuarterly:  yes(),
      marginTrading:     yes(),
      options:           yes(),
      copyTrading:       yes(),
      p2p:               yes('P2P available in major markets, not India'),
      earn:              yes(),
      staking:           yes(),
      launchpool:        yes(),
      launchpad:         yes(),
      tradingBots:       yes(),
      fiatDeposit:       yes(),
      fiatWithdrawal:    yes(),
      cryptoCard:        uncertain('OKX Card in limited regions'),
      nft:               yes(),
      institutionalProducts: yes(),
    }),

    geoRules: [
      {
        geoKey: 'global',
        geoType: 'region',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'full',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: true,
        localCurrencySupport: ['USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.90,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'in',
        geoType: 'country',
        registrationAllowed: 'unavailable',
        kycRequired: false,
        kycLevel: 'unknown',
        futuresAvailable: false,
        earnAvailable: false,
        p2pAvailable: false,
        fiatAvailable: false,
        localCurrencySupport: [],
        bonusAvailable: false,
        preferredCta: 'OKX Not Available in India',
        alternativeExchangeSlugs: ['bybit', 'mexc', 'binance'],
        disclaimerRequired: true,
        riskWarningRequired: false,
        availabilityStatus: 'unavailable',
        confidenceScore: 0.92,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
        evidenceSources: [{ sourceLabel: 'OKX restricted countries page', sourceType: 'official', sourceUrl: 'https://www.okx.com/help/terms-of-service', lastVerified: '2026-05-28' }],
      },
      {
        geoKey: 'eea',
        geoType: 'region',
        registrationAllowed: 'restricted',
        kycRequired: true,
        kycLevel: 'full',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: true,
        localCurrencySupport: ['EUR'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'restricted',
        confidenceScore: 0.72,
        lastChecked: '2026-05-28',
        manualReviewRequired: true,
      },
      {
        geoKey: 'ae',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'full',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: true,
        localCurrencySupport: ['AED', 'USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.88,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'tr',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'basic',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: false,
        localCurrencySupport: ['TRY', 'USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.82,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'br',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'full',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: true,
        localCurrencySupport: ['BRL', 'USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.80,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'pk',
        geoType: 'country',
        registrationAllowed: 'needs-review',
        kycRequired: true,
        kycLevel: 'unknown',
        futuresAvailable: false,
        earnAvailable: false,
        p2pAvailable: false,
        fiatAvailable: false,
        localCurrencySupport: ['USD'],
        bonusAvailable: false,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'needs-review',
        confidenceScore: 0.58,
        lastChecked: '2026-05-01',
        manualReviewRequired: true,
      },
      {
        geoKey: 'kz',
        geoType: 'country',
        registrationAllowed: 'needs-review',
        kycRequired: true,
        kycLevel: 'unknown',
        futuresAvailable: false,
        earnAvailable: false,
        p2pAvailable: false,
        fiatAvailable: false,
        localCurrencySupport: ['USD'],
        bonusAvailable: false,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'needs-review',
        confidenceScore: 0.55,
        lastChecked: '2026-05-01',
        manualReviewRequired: true,
      },
    ],

    bonusRules: [
      { geoKey: 'global', bonusAmount: 25000, bonusCurrency: 'USDT', campaignActive: true, requiresKyc: true, requiresDeposit: true, confidenceScore: 0.88, lastVerified: '2026-05-28' },
      { geoKey: 'in', campaignActive: false, requiresKyc: false, requiresDeposit: false, confidenceScore: 0.92, lastVerified: '2026-05-28', notes: 'OKX unavailable in India — no bonus applicable' },
    ],

    paymentRules: [],
    screenshotRules: [{ geoKey: 'global', category: 'desktop', status: 'pending' }],

    updateSchedule: {
      exchangeSlug: 'okx',
      lastFullReview: '2026-05-28',
      items: [
        { field: 'geo.in.registrationAllowed', frequency: 'monthly', priority: 'critical', lastChecked: '2026-05-28', notes: 'India unavailability — monitor for change' },
        { field: 'geo.pk.registrationAllowed', frequency: 'weekly', priority: 'high', lastChecked: '2026-05-01' },
        { field: 'bonusAmount', frequency: 'weekly', priority: 'critical', lastChecked: '2026-05-28' },
      ],
    },

    evidenceSources: [
      { fieldName: 'geo.in.registrationAllowed', value: false, sourceType: 'official', sourceLabel: 'OKX Terms of Service / restricted countries', confidenceScore: 0.92, conflictStatus: 'none', lastVerified: '2026-05-28' },
    ],
    conflicts: [],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // MEXC
  // ══════════════════════════════════════════════════════════════════════════
  {
    exchangeSlug: 'mexc',
    constitutionConfidence: 0.80,
    lastFullReview: '2026-05-28',
    manualReviewRequired: false,
    flags: ['verify-us-availability', 'verify-uk-availability'],

    identity: {
      exchangeSlug: 'mexc',
      officialName: 'MEXC Global',
      brandAliases: ['MEXC', 'MXC Exchange'],
      officialDomains: ['https://www.mexc.com'],
      regionalDomains: {},
      appLinks: {
        ios: 'https://apps.apple.com/app/mexc-buy-bitcoin-eth-doge/id1455884353',
        android: 'https://play.google.com/store/apps/details?id=com.mxc.exchange',
      },
      legalEntities: [
        { name: 'MEXC Global Ltd.', jurisdiction: 'Seychelles', notes: 'Primary operating entity' },
      ],
      headquarters: 'Seychelles',
      licenses: [],
      affiliateProgramAvailable: true,
      affiliateLinkStructure: 'https://www.mexc.com/acquisition/custom-sign-up?shareCode={code}',
    },

    regionalVersions: [],

    products: makeProductMatrix({
      spotTrading:     yesHigh('One of the largest altcoin selections'),
      futuresPerp:     yes(),
      marginTrading:   yes(),
      copyTrading:     uncertain('Limited copy trading features'),
      p2p:             yes('P2P available in major markets'),
      earn:            yes(),
      staking:         yes(),
      launchpool:      yes(),
      fiatDeposit:     yes('Card and P2P'),
      fiatWithdrawal:  yes(),
      nft:             uncertain(),
      institutionalProducts: uncertain(),
    }),

    geoRules: [
      {
        geoKey: 'global',
        geoType: 'region',
        registrationAllowed: 'allowed',
        kycRequired: false,
        kycLevel: 'none',
        kycNote: 'No KYC for basic trading — one of MEXC\'s key differentiators',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: true,
        localCurrencySupport: ['USD', 'USDT'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.88,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'in',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: false,
        kycLevel: 'none',
        kycNote: 'No KYC for basic access — popular with Indian users',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: false,
        localCurrencySupport: ['INR', 'USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.87,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'eea',
        geoType: 'region',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'basic',
        kycNote: 'EU AML rules may require KYC at higher volumes',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: true,
        localCurrencySupport: ['EUR'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.75,
        lastChecked: '2026-05-28',
        manualReviewRequired: true,
      },
      {
        geoKey: 'kz',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: false,
        kycLevel: 'none',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: false,
        localCurrencySupport: ['KZT', 'USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.73,
        lastChecked: '2026-05-01',
        manualReviewRequired: true,
      },
    ],

    bonusRules: [
      { geoKey: 'global', bonusAmount: 10000, bonusCurrency: 'USDT', bonusTitle: 'Up to 10,000 USDT Welcome Bonus', campaignActive: true, requiresKyc: false, requiresDeposit: true, confidenceScore: 0.90, lastVerified: '2026-05-27' },
    ],

    paymentRules: [],
    screenshotRules: [{ geoKey: 'global', category: 'desktop', status: 'pending' }],

    updateSchedule: {
      exchangeSlug: 'mexc',
      lastFullReview: '2026-05-28',
      items: [
        { field: 'bonusAmount', frequency: 'weekly', priority: 'critical', lastChecked: '2026-05-27' },
        { field: 'affiliateUrl', frequency: 'weekly', priority: 'critical', lastChecked: '2026-05-27' },
        { field: 'geo.eea.availabilityStatus', frequency: 'monthly', priority: 'medium', lastChecked: '2026-05-28' },
      ],
    },

    evidenceSources: [],
    conflicts: [],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BITGET
  // ══════════════════════════════════════════════════════════════════════════
  {
    exchangeSlug: 'bitget',
    constitutionConfidence: 0.78,
    lastFullReview: '2026-05-28',
    manualReviewRequired: false,
    flags: ['verify-eea-license-details'],

    identity: {
      exchangeSlug: 'bitget',
      officialName: 'Bitget Limited',
      brandAliases: ['Bitget'],
      officialDomains: ['https://www.bitget.com'],
      regionalDomains: {},
      appLinks: {
        ios: 'https://apps.apple.com/app/bitget-buy-crypto-bitcoin/id1560244691',
        android: 'https://play.google.com/store/apps/details?id=com.bitget.exchange',
      },
      legalEntities: [
        { name: 'Bitget Limited', jurisdiction: 'Seychelles', notes: 'Primary entity' },
      ],
      headquarters: 'Seychelles',
      licenses: [],
      affiliateProgramAvailable: true,
      affiliateLinkStructure: 'https://partner.bitget.com/bg/{code}',
    },

    regionalVersions: [],

    products: makeProductMatrix({
      spotTrading:   yesHigh(),
      futuresPerp:   yesHigh(),
      marginTrading: yes(),
      copyTrading:   yesHigh('Copy trading is a flagship Bitget product'),
      p2p:           yes(),
      earn:          yes(),
      staking:       yes(),
      fiatDeposit:   yes(),
      fiatWithdrawal: yes(),
    }),

    geoRules: [
      {
        geoKey: 'global',
        geoType: 'region',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'full',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: true,
        localCurrencySupport: ['USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.83,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'eea',
        geoType: 'region',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'full',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: true,
        localCurrencySupport: ['EUR'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.72,
        lastChecked: '2026-05-28',
        manualReviewRequired: true,
      },
      {
        geoKey: 'kz',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'basic',
        futuresAvailable: true,
        earnAvailable: true,
        p2pAvailable: true,
        fiatAvailable: false,
        localCurrencySupport: ['USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.68,
        lastChecked: '2026-05-01',
        manualReviewRequired: true,
      },
    ],

    bonusRules: [
      { geoKey: 'global', campaignActive: true, requiresKyc: true, requiresDeposit: true, confidenceScore: 0.83, lastVerified: '2026-05-28' },
    ],

    paymentRules: [],
    screenshotRules: [{ geoKey: 'global', category: 'desktop', status: 'pending' }],

    updateSchedule: {
      exchangeSlug: 'bitget',
      lastFullReview: '2026-05-28',
      items: [
        { field: 'bonusAmount', frequency: 'weekly', priority: 'high', lastChecked: '2026-05-28' },
        { field: 'geo.eea.availabilityStatus', frequency: 'monthly', priority: 'medium', lastChecked: '2026-05-28' },
      ],
    },

    evidenceSources: [],
    conflicts: [],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // COINBASE
  // ══════════════════════════════════════════════════════════════════════════
  {
    exchangeSlug: 'coinbase',
    constitutionConfidence: 0.85,
    lastFullReview: '2026-05-28',
    manualReviewRequired: false,
    flags: ['india-limited-support', 'verify-bonus-program-scope'],

    identity: {
      exchangeSlug: 'coinbase',
      officialName: 'Coinbase Global, Inc.',
      brandAliases: ['Coinbase'],
      officialDomains: ['https://www.coinbase.com'],
      regionalDomains: {
        eu: 'https://www.coinbase.com', // Same domain, EU entity
      },
      appLinks: {
        ios: 'https://apps.apple.com/app/coinbase-buy-bitcoin-eth/id886427730',
        android: 'https://play.google.com/store/apps/details?id=com.coinbase.android',
      },
      legalEntities: [
        { name: 'Coinbase Global, Inc.', jurisdiction: 'United States', notes: 'Nasdaq-listed parent' },
        { name: 'Coinbase Europe Ltd.', jurisdiction: 'Ireland', notes: 'EU/EEA-serving entity, authorised by the Central Bank of Ireland' },
      ],
      headquarters: 'San Francisco, CA, USA',
      licenses: [
        {
          regulator: 'Central Bank of Ireland',
          jurisdiction: 'Ireland / EU',
          licenseType: 'Virtual Asset Service Provider',
          status: 'active',
          sourceUrl: 'https://www.centralbank.ie',
          confidenceScore: 0.93,
          lastVerified: '2026-05-28',
        },
        {
          regulator: 'FinCEN',
          jurisdiction: 'United States',
          licenseType: 'Money Services Business',
          status: 'active',
          confidenceScore: 0.95,
          lastVerified: '2026-05-28',
        },
      ],
      affiliateProgramAvailable: true,
      affiliateLinkStructure: 'https://coinbase.com/join/{code}',
    },

    regionalVersions: [
      {
        regionGroup: 'eea',
        domain: 'https://www.coinbase.com',
        redirectBehavior: 'none',
        requiresSeparateAccount: false,
        kycRequired: true,
        bonusAvailable: true,
        productRestrictions: [],
        regulatoryNote: 'Coinbase Europe Ltd. is authorised by the Central Bank of Ireland. EU/EEA users are covered by applicable MiCA-related investor protections.',
        confidenceScore: 0.93,
        lastVerified: '2026-05-28',
      },
    ],

    products: makeProductMatrix({
      spotTrading:     yesHigh('Beginner-friendly spot trading'),
      futuresPerp:     uncertain('Limited futures offering'),
      marginTrading:   uncertain(),
      copyTrading:     no('Not available'),
      p2p:             no('No P2P marketplace'),
      earn:            yesHigh('Coinbase Earn / staking'),
      staking:         yesHigh(),
      fiatDeposit:     yesHigh('Leading fiat on-ramp; SEPA, cards, PayPal'),
      fiatWithdrawal:  yesHigh(),
      cryptoCard:      yes('Coinbase Card in select countries'),
      institutionalProducts: yes('Coinbase Prime institutional platform'),
    }),

    geoRules: [
      {
        geoKey: 'global',
        geoType: 'region',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'full',
        futuresAvailable: false,
        earnAvailable: true,
        p2pAvailable: false,
        fiatAvailable: true,
        localCurrencySupport: ['USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.85,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'eea',
        geoType: 'region',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'full',
        futuresAvailable: false,
        earnAvailable: true,
        p2pAvailable: false,
        fiatAvailable: true,
        localCurrencySupport: ['EUR'],
        bonusAvailable: true,
        preferredCta: 'Open Coinbase',
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.93,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
        evidenceSources: [{ sourceLabel: 'Central Bank of Ireland VASP registry', sourceType: 'official', sourceUrl: 'https://www.centralbank.ie', lastVerified: '2026-05-28' }],
      },
      {
        geoKey: 'in',
        geoType: 'country',
        registrationAllowed: 'restricted',
        kycRequired: true,
        kycLevel: 'full',
        futuresAvailable: false,
        earnAvailable: false,
        p2pAvailable: false,
        fiatAvailable: false,
        localCurrencySupport: ['INR'],
        bonusAvailable: false,
        bonusNote: 'Bonus program availability in India is uncertain',
        preferredCta: 'Open Coinbase',
        alternativeExchangeSlugs: ['bybit', 'mexc'],
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'restricted',
        confidenceScore: 0.72,
        lastChecked: '2026-05-28',
        manualReviewRequired: true,
      },
      {
        geoKey: 'ae',
        geoType: 'country',
        registrationAllowed: 'allowed',
        kycRequired: true,
        kycLevel: 'full',
        futuresAvailable: false,
        earnAvailable: true,
        p2pAvailable: false,
        fiatAvailable: true,
        localCurrencySupport: ['AED', 'USD'],
        bonusAvailable: true,
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'allowed',
        confidenceScore: 0.80,
        lastChecked: '2026-05-28',
        manualReviewRequired: false,
      },
      {
        geoKey: 'kz',
        geoType: 'country',
        registrationAllowed: 'needs-review',
        kycRequired: true,
        kycLevel: 'unknown',
        futuresAvailable: false,
        earnAvailable: false,
        p2pAvailable: false,
        fiatAvailable: false,
        localCurrencySupport: [],
        bonusAvailable: false,
        alternativeExchangeSlugs: ['bybit', 'mexc', 'binance'],
        disclaimerRequired: true,
        riskWarningRequired: true,
        availabilityStatus: 'needs-review',
        confidenceScore: 0.55,
        lastChecked: '2026-05-01',
        manualReviewRequired: true,
      },
    ],

    bonusRules: [
      { geoKey: 'global', campaignActive: true, requiresKyc: true, requiresDeposit: false, confidenceScore: 0.80, lastVerified: '2026-05-28', notes: 'Coinbase bonus/referral program varies by country' },
      { geoKey: 'eea', campaignActive: true, requiresKyc: true, requiresDeposit: false, confidenceScore: 0.85, lastVerified: '2026-05-28' },
    ],

    paymentRules: [
      { geoKey: 'eea', methods: [{ method: 'SEPA Transfer', currency: 'EUR', type: 'bank', isPrimary: true, confidenceScore: 0.92 }, { method: 'Visa/Mastercard', currency: 'EUR', type: 'card', isPrimary: false, confidenceScore: 0.90 }, { method: 'PayPal', currency: 'EUR', type: 'bank', isPrimary: false, note: 'Select EU countries', confidenceScore: 0.78 }], lastVerified: '2026-05-28' },
    ],

    screenshotRules: [{ geoKey: 'global', category: 'desktop', status: 'pending' }],

    updateSchedule: {
      exchangeSlug: 'coinbase',
      lastFullReview: '2026-05-28',
      items: [
        { field: 'geo.in.registrationAllowed', frequency: 'monthly', priority: 'high', lastChecked: '2026-05-28', notes: 'India support is limited — monitor for expansion' },
        { field: 'bonusRules', frequency: 'monthly', priority: 'high', lastChecked: '2026-05-28' },
        { field: 'licenses', frequency: 'monthly', priority: 'high', lastChecked: '2026-05-28' },
      ],
    },

    evidenceSources: [
      { fieldName: 'identity.licenses.eea', value: 'CBI authorised VASP', sourceType: 'official', sourceUrl: 'https://www.centralbank.ie', sourceLabel: 'Central Bank of Ireland', confidenceScore: 0.93, conflictStatus: 'none', lastVerified: '2026-05-28' },
    ],
    conflicts: [],
  },
];

// ── Lookup helpers ─────────────────────────────────────────────────────────────

export function getConstitution(slug: string): ExchangeConstitution | null {
  return EXCHANGE_CONSTITUTIONS.find(c => c.exchangeSlug === slug) ?? null;
}

export function getGeoRule(slug: string, geoKey: string): ExchangeGeoRule | null {
  const c = getConstitution(slug);
  if (!c) return null;
  return c.geoRules.find(r => r.geoKey === geoKey) ?? null;
}

export function getConstitutionFlags(slug: string): string[] {
  return getConstitution(slug)?.flags ?? [];
}
