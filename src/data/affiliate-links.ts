/**
 * affiliate-links.ts — Canonical Affiliate Link Registry
 *
 * Single source of truth for every outbound exchange URL.
 * exchanges.json.affiliateUrl is derived from this registry.
 *
 * Link types:
 *   clean              — plain domain, no tracking, no code
 *   affiliate          — affiliate tracking embedded (network/partner domain), no user-visible code
 *   affiliate_with_code — tracking + promo/ref code already embedded in URL
 *   clean_with_ref_param — clean URL that accepts a ?param=code suffix
 *
 * Partner statuses:
 *   full     — active affiliate deal; use affiliate links + bonus CTAs
 *   limited  — no active deal; clean links only, no bonus CTA, neutral "Visit" button
 *   pending  — deal in negotiation; treat as limited until confirmed
 *   disabled — no outbound link; render no CTA
 */

export type LinkType =
  | 'clean'
  | 'affiliate'
  | 'affiliate_with_code'
  | 'clean_with_ref_param';

export type PartnerStatus = 'full' | 'limited' | 'pending' | 'disabled';

export type GeoRegion =
  | 'GLOBAL' | 'EU' | 'CIS'
  // Uppercase region codes — used in localizedLinks (preferred for new code)
  | 'PL' | 'TR' | 'IN' | 'ID' | 'NG' | 'BR' | 'VN' | 'PH'
  // Lowercase legacy codes — kept for backwards-compatible geoLinks field
  | 'tr' | 'in' | 'id' | 'ng' | 'br' | 'vn' | 'ph';

export type Locale = 'en' | 'ru' | 'pl' | 'tr' | 'es' | 'pt' | 'id' | 'hi';

export type LinkPurpose =
  | 'registration'           // basic sign-up, no bonus implied
  | 'registration_with_bonus' // sign-up via affiliate link; bonus offered
  | 'fees'                   // official fee schedule page
  | 'bonus_terms'            // bonus/promotion terms or source page
  | 'kyc'                    // identity verification help/flow
  | 'p2p'                    // P2P marketplace
  | 'spot'                   // spot trading page
  | 'futures'                // futures/derivatives trading page
  | 'app'                    // mobile app download
  | 'proof_of_reserves'      // proof-of-reserves page
  | 'support';               // support / help center

export interface LocalizedLinkEntry {
  /** What this URL is used for */
  purpose: LinkPurpose;
  /**
   * Target locale — omit to match any locale (global default).
   * When locale is set, this entry is only returned when the requested locale matches.
   */
  locale?: Locale;
  /**
   * Target geo region — omit to match any geo / act as GLOBAL fallback.
   * When geo is set, this entry is preferred when the visitor's region matches.
   */
  geo?: GeoRegion;
  url: string;
  /** True if this URL contains affiliate/tracking parameters */
  isAffiliate: boolean;
  /** True if following this URL leads to a bonused registration flow */
  hasBonus: boolean;
  /** Promo/referral code embedded in or associated with this URL */
  promoCode?: string | null;
  /**
   * When true, this URL may be used on official evidence/documentation pages
   * even if isAffiliate = true.
   * Use only for official partner program pages that also serve as terms sources.
   */
  allowedForEvidence?: boolean;
  notes?: string;
}

export interface AppendRules {
  /** Can the promo code be appended to the clean URL as a query param? */
  canAppendPromoCode: boolean;
  /** Can the ref code be appended to the clean URL as a query param? */
  canAppendRefCode: boolean;
  /** Query param names the exchange accepts for promo codes */
  promoParamNames: string[];
  /** Query param names the exchange accepts for referral/affiliate IDs */
  refParamNames: string[];
}

export interface AffiliateEntry {
  slug: string;
  name: string;
  partnerStatus: PartnerStatus;

  /**
   * Which link in `links` is used as the primary outbound URL.
   * Determines what getExchangeOutboundUrl() returns for full partners.
   */
  primaryLinkType: LinkType;

  /**
   * Promo code shown to users (entered manually on exchange registration form).
   * null when there is no active promo code.
   */
  promoCode: string | null;

  /**
   * Referral/affiliate code embedded in the affiliate URL (may equal promoCode).
   * null when not applicable.
   */
  refCode: string | null;

  links: {
    /** Plain homepage — no tracking, no code */
    clean: string;
    /** Affiliate-tracked URL without user-visible promo code */
    affiliate?: string;
    /** Affiliate URL with promo/ref code already embedded */
    affiliateWithCode?: string;
    /**
     * Fallback used when affiliate URL is unavailable or status is limited/pending.
     * Defaults to `clean` when omitted.
     */
    fallback?: string;
  };

  appendRules: AppendRules;

  /**
   * Region-specific affiliate URLs that override the default for that geography.
   * Uses the same GeoRegion keys as affiliateLinks.geo in exchanges.json.
   */
  geoLinks?: Partial<Record<GeoRegion, string>>;

  /** Free-text internal notes about the partnership */
  notes?: string;

  /** ISO date string of last manual URL check, e.g. "2026-06-02" */
  lastChecked: string;
  /** Where this link was obtained */
  sourceOfLink: 'affiliate_dashboard' | 'official_site' | 'manual' | 'unknown';
  /** Short user-facing bonus label, e.g. "Up to 30,000 USDT Welcome Package" */
  bonusLabel: string | null;
  /** Maximum bonus amount as number */
  maxBonusAmount: number | null;
  /** Bonus currency ISO code, e.g. "USDT" or "USD" */
  bonusCurrency: string | null;
  /** Internal editorial notes about the bonus */
  bonusNotes: string | null;
  /**
   * Locales for which this exchange has content-ready pages.
   * Currently only 'en' is active; others are reserved for future i18n rollout.
   */
  supportedLocales: Locale[];
  /**
   * Purpose-driven, locale/geo-aware link table.
   * Consumed by getExchangeLink() for precise URL resolution.
   * Fallback chain: exact geo+locale → geo only → locale only → global/en → links.clean
   */
  localizedLinks: LocalizedLinkEntry[];
}

// ── Registry ──────────────────────────────────────────────────────────────────

export const AFFILIATE_LINKS: AffiliateEntry[] = [
  {
    slug: 'bybit',
    name: 'Bybit',
    partnerStatus: 'full',
    primaryLinkType: 'affiliate_with_code',
    promoCode: 'CRYPTOBONUSW',
    refCode: 'CRYPTOBONUSW',
    links: {
      clean: 'https://www.bybit.com/',
      affiliateWithCode: 'https://partner.bybit.com/b/CRYPTOBONUSW',
      fallback: 'https://www.bybit.com/',
    },
    appendRules: {
      canAppendPromoCode: false, // code is a path segment, not a query param
      canAppendRefCode: false,
      promoParamNames: [],
      refParamNames: [],
    },
    geoLinks: {
      // All geo traffic routed to the same global partner link
      GLOBAL: 'https://partner.bybit.com/b/CRYPTOBONUSW',
    },
    notes: 'Partner portal subdomain. Code embedded in path segment /b/{code}.',
    lastChecked: '2026-06-02',
    sourceOfLink: 'affiliate_dashboard',
    bonusLabel: 'Up to 30,000 USDT Welcome Package',
    maxBonusAmount: 30000,
    bonusCurrency: 'USDT',
    bonusNotes: 'Three-tier package: 20 USDT signup + 200 USDT deposit + 29,780 USDT futures milestones. 30-day window.',
    supportedLocales: ['en'],
    localizedLinks: [
      { purpose: 'registration', url: 'https://www.bybit.com/', isAffiliate: false, hasBonus: false },
      { purpose: 'registration_with_bonus', url: 'https://partner.bybit.com/b/CRYPTOBONUSW', isAffiliate: true, hasBonus: true, promoCode: 'CRYPTOBONUSW', notes: 'GLOBAL default; code embedded in path /b/CODE' },
      { purpose: 'bonus_terms', url: 'https://www.bybit.com/en/promo/global/welcome-gifts/', isAffiliate: false, hasBonus: false, allowedForEvidence: true },
      { purpose: 'fees', url: 'https://www.bybit.com/en/help-center/article/Trading-Fee-Structure', isAffiliate: false, hasBonus: false, allowedForEvidence: true },
      { purpose: 'proof_of_reserves', url: 'https://www.bybit.com/en/proof-of-reserves/', isAffiliate: false, hasBonus: false, allowedForEvidence: true },
    ],
  },

  {
    slug: 'binance',
    name: 'Binance',
    partnerStatus: 'full',
    primaryLinkType: 'affiliate_with_code',
    promoCode: 'CRYPTOBONUSW',
    refCode: 'CRYPTOBONUSW',
    links: {
      clean: 'https://www.binance.com/',
      affiliateWithCode: 'https://www.binance.com/join?ref=CRYPTOBONUSW',
      fallback: 'https://www.binance.com/',
    },
    appendRules: {
      canAppendPromoCode: true,
      canAppendRefCode: true,
      promoParamNames: ['ref'],
      refParamNames: ['ref'],
    },
    notes: 'Standard Binance referral link. ref= param carries both promo and referral tracking.',
    lastChecked: '2026-06-02',
    sourceOfLink: 'affiliate_dashboard',
    bonusLabel: 'Up to 19,800 USDT Welcome Bonus',
    maxBonusAmount: 19800,
    bonusCurrency: 'USDT',
    bonusNotes: 'Tiered deposit and trading bonus. ref= param carries both promo and affiliate tracking.',
    supportedLocales: ['en'],
    localizedLinks: [
      { purpose: 'registration', url: 'https://www.binance.com/', isAffiliate: false, hasBonus: false },
      { purpose: 'registration_with_bonus', url: 'https://www.binance.com/join?ref=CRYPTOBONUSW', isAffiliate: true, hasBonus: true, promoCode: 'CRYPTOBONUSW' },
      { purpose: 'bonus_terms', url: 'https://www.binance.com/en/activity/referral', isAffiliate: false, hasBonus: false, allowedForEvidence: true },
      { purpose: 'fees', url: 'https://www.binance.com/en/fee/schedule', isAffiliate: false, hasBonus: false, allowedForEvidence: true },
      { purpose: 'proof_of_reserves', url: 'https://www.binance.com/en/proof-of-reserves', isAffiliate: false, hasBonus: false, allowedForEvidence: true },
    ],
  },

  {
    slug: 'mexc',
    name: 'MEXC',
    partnerStatus: 'full',
    primaryLinkType: 'affiliate_with_code',
    promoCode: 'mexc-CryptoBonus',
    refCode: 'mexc-CryptoBonus',
    links: {
      clean: 'https://www.mexc.com/',
      affiliate: 'https://www.mexc.com/acquisition/custom-sign-up',
      affiliateWithCode: 'https://www.mexc.com/acquisition/custom-sign-up?shareCode=mexc-CryptoBonus',
      fallback: 'https://www.mexc.com/',
    },
    appendRules: {
      canAppendPromoCode: true,
      canAppendRefCode: true,
      promoParamNames: ['shareCode', 'inviteCode'],
      refParamNames: ['shareCode'],
    },
    notes: 'MEXC custom sign-up portal. shareCode= carries both tracking and promo.',
    lastChecked: '2026-06-02',
    sourceOfLink: 'affiliate_dashboard',
    bonusLabel: 'Up to 10,000 USDT Signup Bonus',
    maxBonusAmount: 10000,
    bonusCurrency: 'USDT',
    bonusNotes: 'Custom sign-up portal with shareCode. KYC + deposit required. 30-day task window.',
    supportedLocales: ['en'],
    localizedLinks: [
      { purpose: 'registration', url: 'https://www.mexc.com/', isAffiliate: false, hasBonus: false },
      { purpose: 'registration_with_bonus', url: 'https://www.mexc.com/acquisition/custom-sign-up?shareCode=mexc-CryptoBonus', isAffiliate: true, hasBonus: true, promoCode: 'mexc-CryptoBonus' },
      { purpose: 'fees', url: 'https://www.mexc.com/fee', isAffiliate: false, hasBonus: false, allowedForEvidence: true },
    ],
  },

  {
    slug: 'okx',
    name: 'OKX',
    partnerStatus: 'full',
    primaryLinkType: 'affiliate_with_code',
    promoCode: 'CRYPTOBONUSW',
    refCode: 'CRYPTOBONUSW',
    links: {
      clean: 'https://www.okx.com/',
      affiliateWithCode: 'https://okx.com/join/CRYPTOBONUSW',
      fallback: 'https://www.okx.com/',
    },
    appendRules: {
      canAppendPromoCode: false, // code is a path segment /join/{code}
      canAppendRefCode: false,
      promoParamNames: [],
      refParamNames: [],
    },
    notes: 'OKX /join/ endpoint — code embedded as path segment.',
    lastChecked: '2026-06-02',
    sourceOfLink: 'affiliate_dashboard',
    bonusLabel: 'Up to 5,000 USDT Welcome Bonus',
    maxBonusAmount: 5000,
    bonusCurrency: 'USDT',
    bonusNotes: '/join/ path-segment affiliate URL. No ref query param needed.',
    supportedLocales: ['en'],
    localizedLinks: [
      { purpose: 'registration', url: 'https://www.okx.com/', isAffiliate: false, hasBonus: false },
      { purpose: 'registration_with_bonus', url: 'https://okx.com/join/CRYPTOBONUSW', isAffiliate: true, hasBonus: true, promoCode: 'CRYPTOBONUSW', notes: 'Code embedded in path /join/CODE' },
      { purpose: 'fees', url: 'https://www.okx.com/fees', isAffiliate: false, hasBonus: false, allowedForEvidence: true },
      { purpose: 'proof_of_reserves', url: 'https://www.okx.com/proof-of-reserves', isAffiliate: false, hasBonus: false, allowedForEvidence: true },
    ],
  },

  {
    slug: 'bitget',
    name: 'Bitget',
    partnerStatus: 'full',
    primaryLinkType: 'affiliate_with_code',
    promoCode: 'CryptoBonW',
    refCode: 'CryptoBonW',
    links: {
      clean: 'https://www.bitget.com/',
      affiliateWithCode: 'https://partner.bitget.com/bg/CryptoBonW',
      fallback: 'https://www.bitget.com/',
    },
    appendRules: {
      canAppendPromoCode: false, // partner subdomain, code in path
      canAppendRefCode: false,
      promoParamNames: [],
      refParamNames: [],
    },
    notes: 'Bitget partner portal. Code embedded in path /bg/{code}.',
    lastChecked: '2026-06-02',
    sourceOfLink: 'affiliate_dashboard',
    bonusLabel: 'Up to 6,200 USDT Welcome Package',
    maxBonusAmount: 6200,
    bonusCurrency: 'USDT',
    bonusNotes: 'Partner portal bg/ path code. KYC + futures tasks required for upper tiers.',
    supportedLocales: ['en'],
    localizedLinks: [
      { purpose: 'registration', url: 'https://www.bitget.com/', isAffiliate: false, hasBonus: false },
      { purpose: 'registration_with_bonus', url: 'https://partner.bitget.com/bg/CryptoBonW', isAffiliate: true, hasBonus: true, promoCode: 'CryptoBonW', notes: 'Partner portal; code embedded in path /bg/CODE' },
      { purpose: 'fees', url: 'https://www.bitget.com/fee/index', isAffiliate: false, hasBonus: false, allowedForEvidence: true },
    ],
  },

  {
    slug: 'bingx',
    name: 'BingX',
    partnerStatus: 'full',
    primaryLinkType: 'affiliate',
    promoCode: null,
    refCode: null,
    links: {
      clean: 'https://bingx.com/',
      affiliate: 'https://bingxdao.com/partner/VipClient/',
      fallback: 'https://bingx.com/',
    },
    appendRules: {
      canAppendPromoCode: false,
      canAppendRefCode: false,
      promoParamNames: [],
      refParamNames: [],
    },
    notes: 'BingX VIP partner portal on bingxdao.com. No user-visible promo code — tracking is via partner domain.',
    lastChecked: '2026-06-02',
    sourceOfLink: 'affiliate_dashboard',
    bonusLabel: 'Up to 5,000 USDT Welcome Bonus',
    maxBonusAmount: 5000,
    bonusCurrency: 'USDT',
    bonusNotes: 'Tracking via bingxdao.com partner domain — no user-visible code. 5,000 USDT theoretical max; typical 50–250 USDT.',
    supportedLocales: ['en'],
    localizedLinks: [
      { purpose: 'registration', url: 'https://bingx.com/', isAffiliate: false, hasBonus: false },
      { purpose: 'registration_with_bonus', url: 'https://bingxdao.com/partner/VipClient/', isAffiliate: true, hasBonus: true, promoCode: null, notes: 'Tracking via partner domain only; no user-visible code' },
      { purpose: 'fees', url: 'https://bingx.com/en-us/rate/', isAffiliate: false, hasBonus: false, allowedForEvidence: true },
    ],
  },

  {
    slug: 'gate-io',
    name: 'Gate.io',
    partnerStatus: 'full',
    primaryLinkType: 'affiliate_with_code',
    promoCode: 'BONUSCBW',
    refCode: 'BONUSCBW',
    links: {
      clean: 'https://www.gate.io/',
      affiliateWithCode: 'https://www.gate.com/share/BONUSCBW',
      fallback: 'https://www.gate.io/',
    },
    appendRules: {
      canAppendPromoCode: false, // code is a path segment /share/{code}
      canAppendRefCode: false,
      promoParamNames: [],
      refParamNames: [],
    },
    notes: 'Gate.io referral share link. Code embedded as path segment /share/{code}.',
    lastChecked: '2026-06-02',
    sourceOfLink: 'affiliate_dashboard',
    bonusLabel: 'Up to 3,000 USDT Signup Reward',
    maxBonusAmount: 3000,
    bonusCurrency: 'USDT',
    bonusNotes: 'gate.com /share/ path-code. Deposit + futures tasks required for full amount.',
    supportedLocales: ['en'],
    localizedLinks: [
      { purpose: 'registration', url: 'https://www.gate.io/', isAffiliate: false, hasBonus: false },
      { purpose: 'registration_with_bonus', url: 'https://www.gate.com/share/BONUSCBW', isAffiliate: true, hasBonus: true, promoCode: 'BONUSCBW', notes: 'Code embedded in path /share/CODE on gate.com' },
      { purpose: 'fees', url: 'https://www.gate.io/fee', isAffiliate: false, hasBonus: false, allowedForEvidence: true },
    ],
  },

  {
    slug: 'kucoin',
    name: 'KuCoin',
    partnerStatus: 'full',
    primaryLinkType: 'affiliate_with_code',
    promoCode: 'CRYPTOBONW',
    refCode: 'CRYPTOBONW',
    links: {
      clean: 'https://www.kucoin.com/',
      affiliateWithCode: 'https://www.kucoin.com/?rcode=CRYPTOBONW&utm_medium=U17591',
      fallback: 'https://www.kucoin.com/',
    },
    appendRules: {
      canAppendPromoCode: true,
      canAppendRefCode: true,
      promoParamNames: ['rcode'],
      refParamNames: ['rcode'],
    },
    notes: 'KuCoin rcode= query param. utm_medium=U17591 is the affiliate sub-ID.',
    lastChecked: '2026-06-02',
    sourceOfLink: 'affiliate_dashboard',
    bonusLabel: 'Up to 11,000 USDT Welcome Bonus',
    maxBonusAmount: 11000,
    bonusCurrency: 'USDT',
    bonusNotes: 'rcode= query param + utm_medium sub-ID. Tiered deposit/trading rewards.',
    supportedLocales: ['en'],
    localizedLinks: [
      { purpose: 'registration', url: 'https://www.kucoin.com/', isAffiliate: false, hasBonus: false },
      { purpose: 'registration_with_bonus', url: 'https://www.kucoin.com/?rcode=CRYPTOBONW&utm_medium=U17591', isAffiliate: true, hasBonus: true, promoCode: 'CRYPTOBONW' },
      { purpose: 'fees', url: 'https://www.kucoin.com/vip/privilege', isAffiliate: false, hasBonus: false, allowedForEvidence: true },
      { purpose: 'proof_of_reserves', url: 'https://www.kucoin.com/proof-of-reserves', isAffiliate: false, hasBonus: false, allowedForEvidence: true },
    ],
  },

  {
    slug: 'htx',
    name: 'HTX',
    partnerStatus: 'full',
    primaryLinkType: 'affiliate_with_code',
    promoCode: 'cryptobonusw',
    refCode: 'cryptobonusw',
    links: {
      clean: 'https://www.htx.com/',
      affiliateWithCode: 'https://www.htx.com.ph/invite/ru-ru/1h?invite_code=cryptobonusw',
      fallback: 'https://www.htx.com/',
    },
    appendRules: {
      canAppendPromoCode: true,
      canAppendRefCode: true,
      promoParamNames: ['invite_code', 'inviteCode'],
      refParamNames: ['invite_code'],
    },
    notes: 'HTX invite link. invite_code= carries the referral code.',
    lastChecked: '2026-06-02',
    sourceOfLink: 'official_site',
    bonusLabel: 'Up to 2,000 USDT New User Rewards',
    maxBonusAmount: 2000,
    bonusCurrency: 'USDT',
    bonusNotes: 'htx.com.ph domain invite link. invite_code= param. Verify active promotion on official site.',
    supportedLocales: ['en'],
    localizedLinks: [
      { purpose: 'registration', url: 'https://www.htx.com/', isAffiliate: false, hasBonus: false },
      { purpose: 'registration_with_bonus', url: 'https://www.htx.com.ph/invite/ru-ru/1h?invite_code=cryptobonusw', isAffiliate: true, hasBonus: true, promoCode: 'cryptobonusw' },
      { purpose: 'fees', url: 'https://www.htx.com/en-us/fee/', isAffiliate: false, hasBonus: false, allowedForEvidence: true },
    ],
  },

  {
    slug: 'coinex',
    name: 'CoinEx',
    partnerStatus: 'full',
    primaryLinkType: 'affiliate_with_code',
    promoCode: '2my4f',
    refCode: '2my4f',
    links: {
      clean: 'https://www.coinex.com/',
      affiliateWithCode: 'https://www.coinex.com/register?rc=2my4f&channel=Referral',
      fallback: 'https://www.coinex.com/',
    },
    appendRules: {
      canAppendPromoCode: true,
      canAppendRefCode: true,
      promoParamNames: ['rc', 'referralCode'],
      refParamNames: ['rc'],
    },
    notes: 'CoinEx rc= referral code + channel=Referral tracking param.',
    lastChecked: '2026-06-02',
    sourceOfLink: 'affiliate_dashboard',
    bonusLabel: 'Up to 500 USDT Signup Bonus',
    maxBonusAmount: 500,
    bonusCurrency: 'USDT',
    bonusNotes: 'rc= + channel=Referral params. KYC required.',
    supportedLocales: ['en'],
    localizedLinks: [
      { purpose: 'registration', url: 'https://www.coinex.com/', isAffiliate: false, hasBonus: false },
      { purpose: 'registration_with_bonus', url: 'https://www.coinex.com/register?rc=2my4f&channel=Referral', isAffiliate: true, hasBonus: true, promoCode: '2my4f' },
      { purpose: 'fees', url: 'https://www.coinex.com/fees', isAffiliate: false, hasBonus: false, allowedForEvidence: true },
    ],
  },

  {
    slug: 'phemex',
    name: 'Phemex',
    partnerStatus: 'full',
    primaryLinkType: 'affiliate_with_code',
    promoCode: 'GJFJA5',
    refCode: 'GJFJA5',
    links: {
      clean: 'https://phemex.com/',
      affiliateWithCode: 'https://phemex.com/ru/account/referral/invite-friends-entry?referralCode=GJFJA5',
      fallback: 'https://phemex.com/',
    },
    appendRules: {
      canAppendPromoCode: true,
      canAppendRefCode: true,
      promoParamNames: ['referralCode', 'code'],
      refParamNames: ['referralCode'],
    },
    notes: 'Phemex referral entry page. referralCode= query param.',
    lastChecked: '2026-06-02',
    sourceOfLink: 'affiliate_dashboard',
    bonusLabel: 'Up to 8,800 USDT Welcome Package',
    maxBonusAmount: 8800,
    bonusCurrency: 'USDT',
    bonusNotes: 'referralCode= on /ru/ locale entry page. Verify locale redirect is correct.',
    supportedLocales: ['en'],
    localizedLinks: [
      { purpose: 'registration', url: 'https://phemex.com/', isAffiliate: false, hasBonus: false },
      { purpose: 'registration_with_bonus', url: 'https://phemex.com/ru/account/referral/invite-friends-entry?referralCode=GJFJA5', isAffiliate: true, hasBonus: true, promoCode: 'GJFJA5' },
      { purpose: 'fees', url: 'https://phemex.com/fees/trading-fee', isAffiliate: false, hasBonus: false, allowedForEvidence: true },
    ],
  },

  {
    slug: 'bitunix',
    name: 'Bitunix',
    partnerStatus: 'full',
    primaryLinkType: 'affiliate_with_code',
    promoCode: 'phpZuw',
    refCode: 'phpZuw',
    links: {
      clean: 'https://www.bitunix.com/',
      affiliateWithCode: 'https://www.bitunix.com/register?inviteCode=phpZuw',
      fallback: 'https://www.bitunix.com/',
    },
    appendRules: {
      canAppendPromoCode: true,
      canAppendRefCode: true,
      promoParamNames: ['inviteCode', 'code'],
      refParamNames: ['inviteCode'],
    },
    notes: 'Bitunix register page with inviteCode= query param.',
    lastChecked: '2026-06-02',
    sourceOfLink: 'affiliate_dashboard',
    bonusLabel: 'Up to 1,000 USDT New User Bonus',
    maxBonusAmount: 1000,
    bonusCurrency: 'USDT',
    bonusNotes: 'inviteCode= on /register page. Simple clean affiliate URL.',
    supportedLocales: ['en'],
    localizedLinks: [
      { purpose: 'registration', url: 'https://www.bitunix.com/', isAffiliate: false, hasBonus: false },
      { purpose: 'registration_with_bonus', url: 'https://www.bitunix.com/register?inviteCode=phpZuw', isAffiliate: true, hasBonus: true, promoCode: 'phpZuw' },
    ],
  },

  {
    slug: 'lbank',
    name: 'LBank',
    partnerStatus: 'pending',
    primaryLinkType: 'clean',
    promoCode: null,
    refCode: null,
    links: {
      clean: 'https://www.lbank.com/',
      fallback: 'https://www.lbank.com/',
    },
    appendRules: {
      canAppendPromoCode: false,
      canAppendRefCode: false,
      promoParamNames: [],
      refParamNames: [],
    },
    notes: 'No active affiliate deal. Affiliate link TBD — use clean URL until partnership is confirmed.',
    lastChecked: '2026-06-02',
    sourceOfLink: 'unknown',
    bonusLabel: 'Up to 500 USDT New User Bonus',
    maxBonusAmount: 500,
    bonusCurrency: 'USDT',
    bonusNotes: 'PENDING — no affiliate deal. Bonus listed from official site. Affiliate link TBD.',
    supportedLocales: ['en'],
    localizedLinks: [
      { purpose: 'registration', url: 'https://www.lbank.com/', isAffiliate: false, hasBonus: false, notes: 'PENDING — no affiliate deal; clean URL only until partnership confirmed' },
      { purpose: 'bonus_terms', url: 'https://www.lbank.com/activity/', isAffiliate: false, hasBonus: false, allowedForEvidence: true },
    ],
  },

  {
    slug: 'coinbase',
    name: 'Coinbase',
    partnerStatus: 'limited',
    primaryLinkType: 'clean',
    promoCode: null,
    refCode: null,
    links: {
      clean: 'https://www.coinbase.com/',
      fallback: 'https://www.coinbase.com/',
    },
    appendRules: {
      canAppendPromoCode: false,
      canAppendRefCode: false,
      promoParamNames: [],
      refParamNames: [],
    },
    notes: 'Limited partner — editorial listing only. No referral link, no promo code. Clean URL only.',
    lastChecked: '2026-06-02',
    sourceOfLink: 'official_site',
    bonusLabel: '$10 in Bitcoin',
    maxBonusAmount: 10,
    bonusCurrency: 'USD',
    bonusNotes: 'LIMITED — editorial listing only. $10 BTC after $100 first trade. No referral link used.',
    supportedLocales: ['en'],
    localizedLinks: [
      { purpose: 'registration', url: 'https://www.coinbase.com/', isAffiliate: false, hasBonus: false, notes: 'LIMITED — editorial listing only; no referral link' },
      { purpose: 'fees', url: 'https://www.coinbase.com/legal/user_agreement', isAffiliate: false, hasBonus: false, allowedForEvidence: true },
      { purpose: 'support', url: 'https://help.coinbase.com/', isAffiliate: false, hasBonus: false, allowedForEvidence: true },
    ],
  },
];

// ── Fast lookup map ───────────────────────────────────────────────────────────

export const AFFILIATE_LINKS_MAP = new Map<string, AffiliateEntry>(
  AFFILIATE_LINKS.map(e => [e.slug, e])
);
