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

export type GeoRegion = 'GLOBAL' | 'EU' | 'CIS' | 'tr' | 'in' | 'id' | 'ng' | 'br' | 'vn' | 'ph';

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
  },
];

// ── Fast lookup map ───────────────────────────────────────────────────────────

export const AFFILIATE_LINKS_MAP = new Map<string, AffiliateEntry>(
  AFFILIATE_LINKS.map(e => [e.slug, e])
);
