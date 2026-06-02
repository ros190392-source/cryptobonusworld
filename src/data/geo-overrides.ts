/**
 * GEO Overrides — CryptoBonusWorld
 * =================================
 * Exchange-specific overrides by visitor country/region.
 *
 * Architecture:
 *  - Global exchange data lives in exchanges.json (the default/source of truth)
 *  - Only DIFFERENCES from global are stored here
 *  - Fallback chain: country override → region override → global exchange default
 *  - Client-side: cbw_geo localStorage (set by Analytics.astro) drives personalisation
 *
 * Country codes: ISO 3166-1 alpha-2 (lowercase)
 * Region groups: eea | mena | latam | south-asia | sea | africa | cis | global
 *
 * MVP exchanges: bybit, binance, okx, mexc, bitget, coinbase
 * MVP geos: EEA region, Turkey (tr), India (in), Brazil (br),
 *           UAE (ae), Pakistan (pk), Kenya (ke), Argentina (ar)
 */

// ── Region groups ─────────────────────────────────────────────────────────────

export type RegionGroup =
  | 'eea'          // European Economic Area + EU
  | 'mena'         // Middle East + North Africa
  | 'latam'        // Latin America + Caribbean
  | 'south-asia'   // India, Pakistan, Bangladesh, Sri Lanka, Nepal
  | 'sea'          // Southeast Asia
  | 'africa'       // Sub-Saharan Africa
  | 'cis'          // Former Soviet Union states
  | 'global';      // Default/everywhere else

/**
 * Maps ISO 3166-1 alpha-2 country codes to region groups.
 * Used as the fallback when no exact country override exists.
 */
export const REGION_MAP: Record<string, RegionGroup> = {
  // EEA — EU + Iceland, Liechtenstein, Norway
  at: 'eea', be: 'eea', bg: 'eea', cy: 'eea', cz: 'eea',
  de: 'eea', dk: 'eea', ee: 'eea', es: 'eea', fi: 'eea',
  fr: 'eea', gr: 'eea', hr: 'eea', hu: 'eea', ie: 'eea',
  it: 'eea', lt: 'eea', lu: 'eea', lv: 'eea', mt: 'eea',
  nl: 'eea', pl: 'eea', pt: 'eea', ro: 'eea', se: 'eea',
  si: 'eea', sk: 'eea', is: 'eea', li: 'eea', no: 'eea',

  // MENA
  ae: 'mena', sa: 'mena', kw: 'mena', bh: 'mena', qa: 'mena',
  om: 'mena', jo: 'mena', lb: 'mena', eg: 'mena', ma: 'mena',
  tn: 'mena', dz: 'mena', iq: 'mena',

  // Latin America
  br: 'latam', ar: 'latam', mx: 'latam', co: 'latam', cl: 'latam',
  pe: 'latam', ve: 'latam', ec: 'latam', bo: 'latam', py: 'latam',
  uy: 'latam', cr: 'latam', gt: 'latam', hn: 'latam', sv: 'latam',
  ni: 'latam', pa: 'latam', do: 'latam', cu: 'latam',

  // South Asia
  in: 'south-asia', pk: 'south-asia', bd: 'south-asia',
  lk: 'south-asia', np: 'south-asia',

  // Southeast Asia
  id: 'sea', vn: 'sea', ph: 'sea', th: 'sea', my: 'sea',
  sg: 'sea', mm: 'sea', kh: 'sea', la: 'sea',

  // Africa (Sub-Saharan)
  ng: 'africa', ke: 'africa', gh: 'africa', za: 'africa',
  tz: 'africa', ug: 'africa', et: 'africa', sn: 'africa',
  ci: 'africa', cm: 'africa',

  // CIS
  ru: 'cis', ua: 'cis', kz: 'cis', uz: 'cis', by: 'cis',
  am: 'cis', az: 'cis', ge: 'cis', kg: 'cis', md: 'cis',
  tj: 'cis', tm: 'cis',
};

// ── Availability status ───────────────────────────────────────────────────────

export type GeoAvailabilityStatus =
  | 'available'                     // Fully available — show normal CTA
  | 'limited'                       // Available with restrictions
  | 'restricted'                    // Significant restrictions apply
  | 'unavailable'                   // Not available in this country/region
  | 'redirects-to-regional-version' // Exchange redirects to separate regional site
  | 'requires-kyc'                  // KYC mandatory (no no-KYC access)
  | 'p2p-only-recommended'          // Direct fiat deposit not supported — P2P route advised
  | 'unknown';                      // Not verified for this geo

// ── Payment methods ───────────────────────────────────────────────────────────

export interface GeoPaymentMethod {
  method: string;
  note: string;
  /** Optional flag — true if this is the primary/recommended method in this geo */
  isPrimary?: boolean;
}

// ── Bonus override ────────────────────────────────────────────────────────────

export interface GeoBonusOverride {
  /** Override bonus amount if it differs from global */
  amount?: number;
  currency?: string;
  title?: string;
  /** Note shown alongside bonus (e.g. "Bonus conditions may vary for EU users") */
  note?: string;
  /** Whether this bonus is verified for this geo */
  verified?: boolean;
  termsUrl?: string;
  lastVerified?: string;
  confidenceScore?: number;
}

// ── Screenshot set ────────────────────────────────────────────────────────────

/**
 * Screenshot set identifier.
 * Maps to /public/media/exchanges/{exchangeSlug}/{screenshotSet}/
 * Fallback chain: country → region → global
 */
export type ScreenshotSet = string; // e.g. 'global', 'eea', 'turkey'

// ── Core override record ──────────────────────────────────────────────────────

export interface GeoOverride {
  /** Exchange this override applies to */
  exchangeSlug: string;

  /**
   * ISO 3166-1 alpha-2 country code this override applies to.
   * Set EITHER countryCode OR regionGroup, not both.
   */
  countryCode?: string;

  /**
   * Region group this override applies to.
   * Used when no exact country override exists.
   */
  regionGroup?: RegionGroup;

  // ── Exchange connectivity ──────────────────────────────────────────────────

  /** Regional exchange domain (e.g. 'https://www.bybit.com/en-EU/') */
  exchangeDomain?: string;

  /** Geo-specific affiliate URL. Falls back to exchange default if absent. */
  affiliateUrl?: string;

  // ── Bonus ──────────────────────────────────────────────────────────────────

  /** Override bonus details for this geo */
  bonusOverride?: GeoBonusOverride;

  /**
   * Short editorial note about bonus applicability in this geo.
   * Shown inline below the bonus amount.
   */
  bonusNote?: string;

  // ── Access rules ───────────────────────────────────────────────────────────

  /** KYC rule for this geo (overrides global exchange default) */
  kycRule?: string;

  /** Features unavailable or restricted in this geo */
  restrictedFeatures?: string[];

  /** Availability status — drives CTA rendering */
  availabilityStatus?: GeoAvailabilityStatus;

  // ── Payment methods ────────────────────────────────────────────────────────

  /** Payment methods available for this exchange in this geo */
  paymentMethods?: GeoPaymentMethod[];

  /** Supported fiat currencies in this geo */
  fiatCurrencies?: string[];

  // ── Recommendations ────────────────────────────────────────────────────────

  /**
   * Short recommended onboarding flow for this geo.
   * Shown as a tip on exchange pages.
   */
  recommendedFlow?: string;

  // ── CTA ────────────────────────────────────────────────────────────────────

  /** Override for the primary CTA button label */
  ctaLabel?: string;

  /**
   * Note displayed below the CTA button for this geo.
   * Use for P2P routing, availability caveats, regulatory notes.
   */
  ctaNote?: string;

  // ── Media ──────────────────────────────────────────────────────────────────

  /** Screenshot set to use for this geo. Defaults to 'global'. */
  screenshotSet?: ScreenshotSet;

  // ── Trust + Legal ──────────────────────────────────────────────────────────

  /** Regulatory status / license note for this exchange in this geo */
  regulatoryNote?: string;

  /** Additional risk note for this geo */
  riskNote?: string;

  // ── P2P specifics ──────────────────────────────────────────────────────────

  /** P2P route recommendation for this geo */
  p2pNote?: string;

  // ── Meta ───────────────────────────────────────────────────────────────────

  lastVerified?: string;
  confidenceScore?: number; // 0–100
}

// ── Local payment method registry ─────────────────────────────────────────────

/**
 * Reusable local payment method definitions.
 * Referenced from GeoOverride.paymentMethods arrays.
 */
export const LOCAL_PAYMENT_METHODS = {
  // Turkey
  try_p2p: { method: 'P2P with TRY', note: 'Buy USDT directly with Turkish Lira via P2P — no bank involvement. Most popular method for Turkish users.', isPrimary: true },
  try_bank: { method: 'Turkish Bank Transfer', note: 'Ziraat, Garanti BBVA, İş Bankası and others supported via P2P counterparties.' },
  try_card: { method: 'Card (TRY/USD)', note: 'Visa/Mastercard debit cards accepted for direct purchases.' },

  // India
  inr_p2p: { method: 'P2P with INR', note: 'Buy USDT with Indian Rupees via P2P desk. Most accessible method.', isPrimary: true },
  upi_p2p: { method: 'UPI via P2P', note: 'UPI transfers accepted by P2P counterparties. Direct UPI deposit to international exchanges is uncommon.' },
  inr_crypto: { method: 'Crypto Transfer', note: 'Transfer from Indian platforms (CoinDCX, WazirX) for instant access.' },

  // Brazil
  brl_pix:  { method: 'PIX', note: 'Instant BRL transfers via PIX are supported by P2P counterparties on major exchanges.', isPrimary: true },
  brl_p2p:  { method: 'P2P with BRL', note: 'Buy USDT with Brazilian Reais via P2P. Widely available with good liquidity.' },
  brl_card: { method: 'Card (BRL)', note: 'Visa/Mastercard accepted; note that Brazilian card networks may add conversion fees.' },

  // Argentina
  ars_p2p:  { method: 'P2P with ARS', note: 'Buy USDT with Pesos Argentinos via P2P. Rates may deviate from official exchange rate.', isPrimary: true },
  ars_usdt: { method: 'USDT / Stablecoins', note: 'USDT acquired locally (e.g. from crypto exchanges or P2P) transferred in — common strategy for ARS users.', isPrimary: true },

  // UAE
  aed_card:   { method: 'Card (AED/USD)', note: 'Visa/Mastercard accepted in AED or USD.', isPrimary: true },
  aed_bank:   { method: 'UAE Bank Transfer', note: 'Supported via third-party on-ramps; some direct bank transfers available.' },
  aed_crypto: { method: 'Crypto Transfer', note: 'Transfer from any wallet or licensed local exchange.' },

  // Pakistan
  pkr_jazzcash:  { method: 'JazzCash via P2P', note: 'JazzCash mobile wallet transfers widely accepted by Pakistani P2P sellers.', isPrimary: true },
  pkr_easypaisa: { method: 'EasyPaisa via P2P', note: 'EasyPaisa widely supported by P2P counterparties for PKR deposits.' },
  pkr_bank:      { method: 'Bank Transfer (PKR)', note: 'Major Pakistani banks (HBL, UBL, MCB, Bank Alfalah) available via P2P.' },

  // Kenya
  kes_mpesa:  { method: 'M-Pesa via P2P', note: 'M-Pesa is the dominant payment method for Kenya-based P2P crypto purchases.', isPrimary: true },
  kes_bank:   { method: 'KES Bank Transfer', note: 'Kenyan bank transfers available via P2P counterparties.' },

  // EEA
  eur_sepa:   { method: 'SEPA Transfer', note: 'EUR bank transfers with next-day settlement. Low fees.', isPrimary: true },
  eur_card:   { method: 'Card (EUR)', note: 'Visa/Mastercard accepted across EEA countries.' },
  eur_crypto: { method: 'Crypto Transfer', note: 'Transfer crypto from any wallet or exchange.' },

  // Global fallbacks
  global_card:   { method: 'Card', note: 'Visa/Mastercard accepted on most major exchanges.' },
  global_p2p:    { method: 'P2P Trading', note: 'Buy crypto using your local currency via P2P desks.' },
  global_crypto: { method: 'Crypto Transfer', note: 'Transfer crypto from any wallet or exchange.' },
} as const;

// ── GEO Overrides — MVP data ──────────────────────────────────────────────────

export const GEO_OVERRIDES: GeoOverride[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // BYBIT
  // ══════════════════════════════════════════════════════════════════════════

  {
    exchangeSlug: 'bybit',
    regionGroup: 'eea',
    exchangeDomain: 'https://www.bybit.com/en-EU/',
    availabilityStatus: 'redirects-to-regional-version',
    ctaLabel: 'Open Bybit EU Version',
    ctaNote: 'EU/EEA users are directed to the Bybit EU platform.',
    regulatoryNote: 'Bybit is accessible in EU/EEA countries. EU users are directed to a regional version of the platform. Bonus terms and product availability may differ from the global offer — verify current conditions on the Bybit website.',
    kycRule: 'KYC verification is required for EU/EEA users.',
    bonusNote: 'Bonus availability and conditions may vary for EU users. Check current terms on the Bybit EU platform.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.eur_card,
      LOCAL_PAYMENT_METHODS.eur_sepa,
      LOCAL_PAYMENT_METHODS.eur_crypto,
    ],
    fiatCurrencies: ['EUR'],
    screenshotSet: 'global',
    lastVerified: '2026-05-28',
    confidenceScore: 80,
  },

  {
    exchangeSlug: 'bybit',
    countryCode: 'ae',
    availabilityStatus: 'available',
    ctaLabel: 'Open Bybit',
    regulatoryNote: 'Bybit holds a Virtual Asset Service Provider (VASP) license from Dubai\'s Virtual Assets Regulatory Authority (VARA). UAE users are on a locally-regulated platform with full product access.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.aed_card,
      LOCAL_PAYMENT_METHODS.aed_crypto,
      LOCAL_PAYMENT_METHODS.aed_bank,
    ],
    fiatCurrencies: ['AED', 'USD'],
    screenshotSet: 'global',
    lastVerified: '2026-05-28',
    confidenceScore: 90,
  },

  {
    exchangeSlug: 'bybit',
    countryCode: 'tr',
    availabilityStatus: 'available',
    recommendedFlow: 'Register on Bybit → open P2P → buy USDT with TRY',
    ctaNote: 'P2P with TRY is the recommended deposit method in Turkey.',
    p2pNote: 'Bybit\'s P2P desk has deep TRY/USDT liquidity. Look for merchants with 1,000+ trades and the Merchant badge for the most reliable experience.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.try_p2p,
      LOCAL_PAYMENT_METHODS.try_bank,
      LOCAL_PAYMENT_METHODS.try_card,
    ],
    fiatCurrencies: ['TRY', 'USD'],
    screenshotSet: 'global',
    lastVerified: '2026-05-28',
    confidenceScore: 88,
  },

  {
    exchangeSlug: 'bybit',
    countryCode: 'in',
    availabilityStatus: 'available',
    recommendedFlow: 'Register on Bybit → P2P → buy USDT with INR or UPI',
    ctaNote: 'P2P with INR/UPI is the most accessible deposit route in India.',
    p2pNote: 'P2P desks on Bybit accept UPI and bank transfers for INR → USDT. No-KYC access available for basic trading.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.inr_p2p,
      LOCAL_PAYMENT_METHODS.upi_p2p,
      LOCAL_PAYMENT_METHODS.inr_crypto,
    ],
    fiatCurrencies: ['INR', 'USD'],
    screenshotSet: 'global',
    lastVerified: '2026-05-28',
    confidenceScore: 85,
  },

  {
    exchangeSlug: 'bybit',
    countryCode: 'br',
    availabilityStatus: 'available',
    recommendedFlow: 'Register on Bybit → P2P → buy USDT with PIX or BRL',
    ctaNote: 'PIX via P2P is the fastest BRL deposit route in Brazil.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.brl_pix,
      LOCAL_PAYMENT_METHODS.brl_p2p,
      LOCAL_PAYMENT_METHODS.brl_card,
    ],
    fiatCurrencies: ['BRL', 'USD'],
    screenshotSet: 'global',
    lastVerified: '2026-05-28',
    confidenceScore: 82,
  },

  {
    exchangeSlug: 'bybit',
    countryCode: 'pk',
    availabilityStatus: 'p2p-only-recommended',
    recommendedFlow: 'Register on Bybit → P2P → buy USDT with JazzCash or EasyPaisa',
    ctaNote: 'P2P with JazzCash or EasyPaisa is the recommended on-ramp in Pakistan.',
    p2pNote: 'Pakistani P2P sellers on Bybit widely accept JazzCash, EasyPaisa and bank transfers. Choose sellers with 500+ trades.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.pkr_jazzcash,
      LOCAL_PAYMENT_METHODS.pkr_easypaisa,
      LOCAL_PAYMENT_METHODS.pkr_bank,
    ],
    fiatCurrencies: ['PKR', 'USD'],
    screenshotSet: 'global',
    lastVerified: '2026-05-28',
    confidenceScore: 80,
  },

  {
    exchangeSlug: 'bybit',
    countryCode: 'ke',
    availabilityStatus: 'p2p-only-recommended',
    recommendedFlow: 'Register on Bybit → P2P → buy USDT with M-Pesa',
    ctaNote: 'M-Pesa via P2P is the standard KES deposit route in Kenya.',
    p2pNote: 'Bybit P2P supports M-Pesa for Kenyan users. M-Pesa is the most reliable local payment method for KES → USDT.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.kes_mpesa,
      LOCAL_PAYMENT_METHODS.kes_bank,
    ],
    fiatCurrencies: ['KES', 'USD'],
    screenshotSet: 'global',
    lastVerified: '2026-05-28',
    confidenceScore: 78,
  },

  {
    exchangeSlug: 'bybit',
    countryCode: 'ar',
    availabilityStatus: 'available',
    recommendedFlow: 'Register on Bybit → P2P → buy USDT with ARS or transfer USDT from local exchange',
    bonusNote: 'USDT-denominated bonuses provide a USD-equivalent store of value — especially relevant given ARS volatility.',
    ctaNote: 'USDT bonuses are valued in USD — useful as an inflation hedge for ARS users.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.ars_p2p,
      LOCAL_PAYMENT_METHODS.ars_usdt,
    ],
    fiatCurrencies: ['ARS', 'USD'],
    screenshotSet: 'global',
    lastVerified: '2026-05-28',
    confidenceScore: 75,
  },

  // ── Bybit — Blocked countries (US, UK, Canada) ────────────────────────────

  {
    exchangeSlug: 'bybit',
    countryCode: 'us',
    availabilityStatus: 'unavailable',
    ctaLabel: 'Bybit Not Available in the US',
    ctaNote: 'Bybit does not accept US residents. Regulated US alternatives include Coinbase, Kraken, or Gemini.',
    regulatoryNote: 'Bybit is not available to residents of the United States. US-regulated alternatives: Coinbase (NASDAQ-listed, FDIC-insured), Kraken (CFTC-registered derivatives), or Gemini (licensed in 50 US states).',
    lastVerified: '2026-05-28',
    confidenceScore: 98,
  },

  {
    exchangeSlug: 'bybit',
    countryCode: 'gb',
    availabilityStatus: 'unavailable',
    ctaLabel: 'Bybit Not Available in the UK',
    ctaNote: 'Bybit does not accept UK residents due to FCA restrictions. Kraken or Coinbase UK are FCA-registered alternatives.',
    regulatoryNote: 'Bybit is not available to UK residents following FCA restrictions. FCA-registered alternatives: Kraken (FCA-registered), Coinbase UK (FCA-authorised), or Gemini (FCA-registered).',
    lastVerified: '2026-05-28',
    confidenceScore: 95,
  },

  {
    exchangeSlug: 'bybit',
    countryCode: 'ca',
    availabilityStatus: 'unavailable',
    ctaLabel: 'Bybit Not Available in Canada',
    ctaNote: 'Bybit does not accept Canadian residents. NDAX, Bitbuy, or Kraken are registered alternatives for Canadian traders.',
    regulatoryNote: 'Bybit is not available to residents of Canada. FINTRAC-registered alternatives: NDAX (regulated, Canada-based), Bitbuy (now WonderFi, TSX-listed), or Kraken (MSB-registered).',
    lastVerified: '2026-05-28',
    confidenceScore: 95,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BINANCE
  // ══════════════════════════════════════════════════════════════════════════

  {
    exchangeSlug: 'binance',
    regionGroup: 'eea',
    availabilityStatus: 'limited',
    ctaNote: 'Binance availability varies by EEA country — check current status for your location.',
    regulatoryNote: 'Binance availability and licensing status vary across EEA member states following regulatory changes in 2023–2024. Some EU countries may have restricted access. Verify current availability on the Binance website before registering.',
    kycRule: 'Full KYC is required. EU AML regulations apply.',
    bonusNote: 'Bonus availability and terms may differ for EU users. Verify current offers on the Binance website.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.eur_sepa,
      LOCAL_PAYMENT_METHODS.eur_card,
      LOCAL_PAYMENT_METHODS.eur_crypto,
    ],
    fiatCurrencies: ['EUR'],
    screenshotSet: 'global',
    lastVerified: '2026-05-28',
    confidenceScore: 65,
  },

  {
    exchangeSlug: 'binance',
    countryCode: 'ae',
    availabilityStatus: 'available',
    regulatoryNote: 'Binance holds a Virtual Asset Service Provider (VASP) license from Dubai\'s Virtual Assets Regulatory Authority (VARA). UAE users have access to the full Binance product suite on a locally-regulated platform.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.aed_card,
      LOCAL_PAYMENT_METHODS.aed_crypto,
      LOCAL_PAYMENT_METHODS.aed_bank,
    ],
    fiatCurrencies: ['AED', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 88,
  },

  {
    exchangeSlug: 'binance',
    countryCode: 'in',
    availabilityStatus: 'available',
    recommendedFlow: 'Register on Binance → P2P → buy USDT with INR or UPI',
    ctaNote: 'P2P with INR/UPI is the primary deposit route for Indian users.',
    bonusNote: 'Note: India applies a 30% capital gains tax and 1% TDS on crypto transactions.',
    riskNote: 'Indian regulations require reporting of crypto gains. The 30% CGT and 1% TDS on transactions apply regardless of which exchange you use.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.inr_p2p,
      LOCAL_PAYMENT_METHODS.upi_p2p,
      LOCAL_PAYMENT_METHODS.inr_crypto,
    ],
    fiatCurrencies: ['INR', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 85,
  },

  {
    exchangeSlug: 'binance',
    countryCode: 'tr',
    availabilityStatus: 'available',
    recommendedFlow: 'Register on Binance → P2P → buy USDT with TRY',
    ctaNote: 'P2P is the standard TRY deposit route on Binance.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.try_p2p,
      LOCAL_PAYMENT_METHODS.try_bank,
      LOCAL_PAYMENT_METHODS.try_card,
    ],
    fiatCurrencies: ['TRY', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 85,
  },

  {
    exchangeSlug: 'binance',
    countryCode: 'br',
    availabilityStatus: 'available',
    recommendedFlow: 'Register on Binance → P2P → buy USDT via PIX',
    ctaNote: 'PIX via P2P is the fastest BRL on-ramp in Brazil.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.brl_pix,
      LOCAL_PAYMENT_METHODS.brl_p2p,
      LOCAL_PAYMENT_METHODS.brl_card,
    ],
    fiatCurrencies: ['BRL', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 85,
  },

  {
    exchangeSlug: 'binance',
    countryCode: 'ar',
    availabilityStatus: 'available',
    bonusNote: 'USDT bonuses act as a USD-equivalent — particularly valuable for users managing ARS inflation exposure.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.ars_p2p,
      LOCAL_PAYMENT_METHODS.ars_usdt,
    ],
    fiatCurrencies: ['ARS', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 78,
  },

  {
    exchangeSlug: 'binance',
    countryCode: 'pk',
    availabilityStatus: 'p2p-only-recommended',
    recommendedFlow: 'Register on Binance → P2P → buy USDT with JazzCash or EasyPaisa',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.pkr_jazzcash,
      LOCAL_PAYMENT_METHODS.pkr_easypaisa,
      LOCAL_PAYMENT_METHODS.pkr_bank,
    ],
    fiatCurrencies: ['PKR', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 78,
  },

  {
    exchangeSlug: 'binance',
    countryCode: 'ke',
    availabilityStatus: 'p2p-only-recommended',
    recommendedFlow: 'Register on Binance → P2P → buy USDT with M-Pesa',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.kes_mpesa,
      LOCAL_PAYMENT_METHODS.kes_bank,
    ],
    fiatCurrencies: ['KES', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 78,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // OKX
  // ══════════════════════════════════════════════════════════════════════════

  {
    exchangeSlug: 'okx',
    countryCode: 'in',
    availabilityStatus: 'unavailable',
    ctaLabel: 'OKX Not Available in India',
    ctaNote: 'OKX does not accept users from India. Bybit or MEXC are strong alternatives with comparable bonuses.',
    regulatoryNote: 'OKX currently does not accept user registrations from India. This may change — verify current availability on the OKX website.',
    lastVerified: '2026-05-28',
    confidenceScore: 92,
  },

  {
    exchangeSlug: 'okx',
    regionGroup: 'eea',
    availabilityStatus: 'available',
    regulatoryNote: 'OKX is available in select EEA countries and is expanding its European regulatory coverage. Check the OKX website for your specific country\'s availability.',
    kycRule: 'Full KYC required for EU users.',
    bonusNote: 'Bonus terms and product availability may vary for EEA users.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.eur_card,
      LOCAL_PAYMENT_METHODS.eur_sepa,
      LOCAL_PAYMENT_METHODS.eur_crypto,
    ],
    fiatCurrencies: ['EUR'],
    lastVerified: '2026-05-28',
    confidenceScore: 75,
  },

  {
    exchangeSlug: 'okx',
    countryCode: 'ae',
    availabilityStatus: 'available',
    regulatoryNote: 'OKX holds a Virtual Asset Service Provider (VASP) license from Dubai\'s Virtual Assets Regulatory Authority (VARA). UAE users are on a locally-regulated platform.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.aed_card,
      LOCAL_PAYMENT_METHODS.aed_crypto,
      LOCAL_PAYMENT_METHODS.aed_bank,
    ],
    fiatCurrencies: ['AED', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 88,
  },

  {
    exchangeSlug: 'okx',
    countryCode: 'tr',
    availabilityStatus: 'available',
    recommendedFlow: 'Register on OKX → P2P → buy USDT with TRY',
    ctaNote: 'P2P with TRY is the primary deposit method in Turkey.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.try_p2p,
      LOCAL_PAYMENT_METHODS.try_bank,
      LOCAL_PAYMENT_METHODS.try_card,
    ],
    fiatCurrencies: ['TRY', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 82,
  },

  {
    exchangeSlug: 'okx',
    countryCode: 'br',
    availabilityStatus: 'available',
    recommendedFlow: 'Register on OKX → P2P → buy USDT via PIX',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.brl_pix,
      LOCAL_PAYMENT_METHODS.brl_p2p,
      LOCAL_PAYMENT_METHODS.brl_card,
    ],
    fiatCurrencies: ['BRL', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 80,
  },

  {
    exchangeSlug: 'okx',
    countryCode: 'pk',
    availabilityStatus: 'p2p-only-recommended',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.pkr_jazzcash,
      LOCAL_PAYMENT_METHODS.pkr_easypaisa,
      LOCAL_PAYMENT_METHODS.pkr_bank,
    ],
    fiatCurrencies: ['PKR', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 75,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // MEXC
  // ══════════════════════════════════════════════════════════════════════════

  {
    exchangeSlug: 'mexc',
    regionGroup: 'eea',
    availabilityStatus: 'available',
    ctaNote: 'MEXC is available in most EEA countries. KYC requirements vary.',
    bonusNote: 'MEXC offers no-KYC access for initial trading; however, EU anti-money laundering regulations may require KYC for higher limits.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.eur_card,
      LOCAL_PAYMENT_METHODS.eur_sepa,
      LOCAL_PAYMENT_METHODS.eur_crypto,
    ],
    fiatCurrencies: ['EUR'],
    lastVerified: '2026-05-28',
    confidenceScore: 78,
  },

  {
    exchangeSlug: 'mexc',
    countryCode: 'in',
    availabilityStatus: 'available',
    recommendedFlow: 'Register on MEXC → P2P → buy USDT with INR or UPI',
    ctaNote: 'No KYC required for basic access. P2P available for INR deposits.',
    p2pNote: 'MEXC P2P supports INR and UPI. No-KYC access is a key advantage for Indian users.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.inr_p2p,
      LOCAL_PAYMENT_METHODS.upi_p2p,
      LOCAL_PAYMENT_METHODS.inr_crypto,
    ],
    fiatCurrencies: ['INR', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 87,
  },

  {
    exchangeSlug: 'mexc',
    countryCode: 'tr',
    availabilityStatus: 'available',
    recommendedFlow: 'Register on MEXC → P2P → buy USDT with TRY',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.try_p2p,
      LOCAL_PAYMENT_METHODS.try_bank,
      LOCAL_PAYMENT_METHODS.try_card,
    ],
    fiatCurrencies: ['TRY', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 85,
  },

  {
    exchangeSlug: 'mexc',
    countryCode: 'ar',
    availabilityStatus: 'available',
    bonusNote: 'USDT bonuses are dollar-denominated — valuable for users managing ARS inflation exposure.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.ars_p2p,
      LOCAL_PAYMENT_METHODS.ars_usdt,
    ],
    fiatCurrencies: ['ARS', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 78,
  },

  {
    exchangeSlug: 'mexc',
    countryCode: 'pk',
    availabilityStatus: 'p2p-only-recommended',
    recommendedFlow: 'Register on MEXC → P2P → buy USDT with JazzCash or EasyPaisa',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.pkr_jazzcash,
      LOCAL_PAYMENT_METHODS.pkr_easypaisa,
      LOCAL_PAYMENT_METHODS.pkr_bank,
    ],
    fiatCurrencies: ['PKR', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 78,
  },

  {
    exchangeSlug: 'mexc',
    countryCode: 'ke',
    availabilityStatus: 'p2p-only-recommended',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.kes_mpesa,
      LOCAL_PAYMENT_METHODS.kes_bank,
    ],
    fiatCurrencies: ['KES', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 75,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BITGET
  // ══════════════════════════════════════════════════════════════════════════

  {
    exchangeSlug: 'bitget',
    regionGroup: 'eea',
    availabilityStatus: 'available',
    ctaNote: 'Bitget is available in most EEA countries. Check current terms on the Bitget website.',
    kycRule: 'KYC required for EU users.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.eur_card,
      LOCAL_PAYMENT_METHODS.eur_sepa,
      LOCAL_PAYMENT_METHODS.eur_crypto,
    ],
    fiatCurrencies: ['EUR'],
    lastVerified: '2026-05-28',
    confidenceScore: 72,
  },

  {
    exchangeSlug: 'bitget',
    countryCode: 'in',
    availabilityStatus: 'available',
    recommendedFlow: 'Register on Bitget → P2P → buy USDT with INR',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.inr_p2p,
      LOCAL_PAYMENT_METHODS.upi_p2p,
      LOCAL_PAYMENT_METHODS.inr_crypto,
    ],
    fiatCurrencies: ['INR', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 80,
  },

  {
    exchangeSlug: 'bitget',
    countryCode: 'tr',
    availabilityStatus: 'available',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.try_p2p,
      LOCAL_PAYMENT_METHODS.try_bank,
      LOCAL_PAYMENT_METHODS.try_card,
    ],
    fiatCurrencies: ['TRY', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 80,
  },

  {
    exchangeSlug: 'bitget',
    countryCode: 'br',
    availabilityStatus: 'available',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.brl_pix,
      LOCAL_PAYMENT_METHODS.brl_p2p,
    ],
    fiatCurrencies: ['BRL', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 78,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // COINBASE
  // ══════════════════════════════════════════════════════════════════════════

  {
    exchangeSlug: 'coinbase',
    regionGroup: 'eea',
    availabilityStatus: 'available',
    regulatoryNote: 'Coinbase Europe Ltd. is authorised by the Central Bank of Ireland and compliant with EU Markets in Crypto-Assets (MiCA) regulations. EU/EEA users are covered by applicable local investor protections.',
    kycRule: 'Full KYC required. EU AML/KYC standards apply.',
    ctaLabel: 'Open Coinbase',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.eur_sepa,
      LOCAL_PAYMENT_METHODS.eur_card,
      LOCAL_PAYMENT_METHODS.eur_crypto,
    ],
    fiatCurrencies: ['EUR'],
    lastVerified: '2026-05-28',
    confidenceScore: 90,
  },

  {
    exchangeSlug: 'coinbase',
    countryCode: 'ae',
    availabilityStatus: 'available',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.aed_card,
      LOCAL_PAYMENT_METHODS.aed_crypto,
    ],
    fiatCurrencies: ['AED', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 78,
  },

  {
    exchangeSlug: 'coinbase',
    countryCode: 'in',
    availabilityStatus: 'limited',
    ctaNote: 'Coinbase is available in India but has limited local payment support. Bybit or MEXC may offer a more seamless experience for INR deposits.',
    bonusNote: 'Coinbase\'s bonus program availability in India may differ from the US/global offer.',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.inr_crypto,
      LOCAL_PAYMENT_METHODS.global_card,
    ],
    fiatCurrencies: ['INR', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 72,
  },

  {
    exchangeSlug: 'coinbase',
    countryCode: 'tr',
    availabilityStatus: 'available',
    paymentMethods: [
      LOCAL_PAYMENT_METHODS.try_card,
      LOCAL_PAYMENT_METHODS.eur_crypto,
    ],
    fiatCurrencies: ['TRY', 'USD'],
    lastVerified: '2026-05-28',
    confidenceScore: 75,
  },
];

// ── Convenience helpers ───────────────────────────────────────────────────────

/**
 * Get all GEO overrides for a specific exchange.
 * Used by geoConfig.ts utility functions.
 */
export function getOverridesForExchange(exchangeSlug: string): GeoOverride[] {
  return GEO_OVERRIDES.filter(o => o.exchangeSlug === exchangeSlug);
}

/**
 * Get the region group for a country code.
 */
export function getRegionForCountry(countryCode: string): RegionGroup {
  return REGION_MAP[countryCode.toLowerCase()] ?? 'global';
}
