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
  },
];

// ── Fast lookup map ───────────────────────────────────────────────────────────

export const AFFILIATE_LINKS_MAP = new Map<string, AffiliateEntry>(
  AFFILIATE_LINKS.map(e => [e.slug, e])
);
