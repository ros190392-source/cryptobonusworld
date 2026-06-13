/**
 * affiliate-snapshot.mjs — Runtime Affiliate Data Snapshot
 * ─────────────────────────────────────────────────────────────────────────────
 * Derived from: src/data/affiliate-links.ts
 * Contains ONLY the fields needed by screenshot capture scripts at runtime.
 *
 * !! Keep in sync with src/data/affiliate-links.ts !!
 * Run `npm run affiliate:inventory` after changing affiliate-links.ts.
 *
 * Used by: harvest-exchange-screenshots.mjs, orchestrate-screenshot-capture.mjs
 */

/**
 * @typedef {Object} AffiliateSnapshot
 * @property {string}   slug
 * @property {string}   affiliateUrl        - affiliateWithCode URL
 * @property {string}   cleanUrl
 * @property {string|null} promoCode        - user-visible promo code
 * @property {string|null} refCode          - URL-embedded ref code (often = promoCode)
 * @property {string[]} refParamNames       - query param names that carry ref/promo code
 * @property {string|null} bonusLabel
 * @property {number|null} maxBonusAmount
 * @property {string|null} bonusCurrency
 * @property {'path'|'query'} codeEmbedding - how the code is embedded in affiliateUrl
 */

export const AFFILIATE_SNAPSHOT = {

  binance: {
    slug: 'binance',
    affiliateUrl: 'https://www.binance.com/join?ref=CRYPTOBONUSW',
    cleanUrl: 'https://www.binance.com/',
    promoCode: 'CRYPTOBONUSW',
    refCode: 'CRYPTOBONUSW',
    refParamNames: ['ref'],
    bonusLabel: 'Up to 19,800 USDT Welcome Bonus',
    maxBonusAmount: 19800,
    bonusCurrency: 'USDT',
    codeEmbedding: 'query',
  },

  okx: {
    slug: 'okx',
    affiliateUrl: 'https://okx.com/join/CRYPTOBONUSW',
    cleanUrl: 'https://www.okx.com/',
    promoCode: 'CRYPTOBONUSW',
    refCode: 'CRYPTOBONUSW',
    refParamNames: [],
    bonusLabel: 'Up to 5,000 USDT Welcome Bonus',
    maxBonusAmount: 5000,
    bonusCurrency: 'USDT',
    codeEmbedding: 'path',
  },

  mexc: {
    slug: 'mexc',
    affiliateUrl: 'https://www.mexc.com/acquisition/custom-sign-up?shareCode=mexc-CryptoBonus',
    cleanUrl: 'https://www.mexc.com/',
    promoCode: 'mexc-CryptoBonus',
    refCode: 'mexc-CryptoBonus',
    refParamNames: ['shareCode', 'inviteCode'],
    bonusLabel: 'Up to 10,000 USDT Signup Bonus',
    maxBonusAmount: 10000,
    bonusCurrency: 'USDT',
    codeEmbedding: 'query',
  },

  bybit: {
    slug: 'bybit',
    affiliateUrl: 'https://partner.bybit.com/b/CRYPTOBONUSW',
    cleanUrl: 'https://www.bybit.com/',
    promoCode: 'CRYPTOBONUSW',
    refCode: 'CRYPTOBONUSW',
    refParamNames: [],
    bonusLabel: 'Up to 30,000 USDT Welcome Package',
    maxBonusAmount: 30000,
    bonusCurrency: 'USDT',
    codeEmbedding: 'path',
  },

  bitget: {
    slug: 'bitget',
    affiliateUrl: 'https://partner.bitget.com/bg/CryptoBonW',
    cleanUrl: 'https://www.bitget.com/',
    promoCode: 'CryptoBonW',
    refCode: 'CryptoBonW',
    refParamNames: [],
    bonusLabel: 'Up to 6,200 USDT Welcome Package',
    maxBonusAmount: 6200,
    bonusCurrency: 'USDT',
    codeEmbedding: 'path',
  },

  bingx: {
    slug: 'bingx',
    affiliateUrl: 'https://bingxdao.com/partner/CRYPTOBONUSWORLD/',
    cleanUrl: 'https://bingx.com/',
    promoCode: 'CRYPTOBONUSWORLD',
    refCode: null,
    refParamNames: [],
    bonusLabel: 'Up to 11,000 USDT Welcome Package',
    maxBonusAmount: 11000,
    bonusCurrency: 'USDT',
    codeEmbedding: 'path',
  },

  'gate-io': {
    slug: 'gate-io',
    affiliateUrl: 'https://www.gate.com/share/BONUSCBW',
    cleanUrl: 'https://www.gate.io/',
    promoCode: 'BONUSCBW',
    refCode: 'BONUSCBW',
    refParamNames: [],
    bonusLabel: 'Up to 10,000 USDT Welcome Rewards',
    maxBonusAmount: 10000,
    bonusCurrency: 'USDT',
    codeEmbedding: 'path',
  },

  kucoin: {
    slug: 'kucoin',
    affiliateUrl: 'https://www.kucoin.com/r/af/CRYPTOBONW',
    cleanUrl: 'https://www.kucoin.com/',
    promoCode: 'CRYPTOBONW',
    refCode: 'CRYPTOBONW',
    refParamNames: [],
    bonusLabel: 'Up to 500 USDT',
    maxBonusAmount: 500,
    bonusCurrency: 'USDT',
    codeEmbedding: 'path',
  },

  coinex: {
    slug: 'coinex',
    affiliateUrl: 'https://www.coinex.com/register?rc=2my4f&channel=Referral',
    cleanUrl: 'https://www.coinex.com/',
    promoCode: '2my4f',
    refCode: '2my4f',
    refParamNames: ['rc'],
    bonusLabel: 'Up to 500 USDT Signup Bonus',
    maxBonusAmount: 500,
    bonusCurrency: 'USDT',
    codeEmbedding: 'query',
  },

  phemex: {
    slug: 'phemex',
    affiliateUrl: 'https://phemex.com/ru/account/referral/invite-friends-entry?referralCode=GJFJA5',
    cleanUrl: 'https://phemex.com/',
    promoCode: 'GJFJA5',
    refCode: 'GJFJA5',
    refParamNames: ['referralCode'],
    bonusLabel: 'Up to 8,800 USDT Bonus',
    maxBonusAmount: 8800,
    bonusCurrency: 'USDT',
    codeEmbedding: 'query',
  },

  bitunix: {
    slug: 'bitunix',
    affiliateUrl: 'https://www.bitunix.com/register?inviteCode=phpZuw',
    cleanUrl: 'https://www.bitunix.com/',
    promoCode: 'phpZuw',
    refCode: 'phpZuw',
    refParamNames: ['inviteCode'],
    bonusLabel: 'Up to 10,000 USDT Welcome Bonus',
    maxBonusAmount: 10000,
    bonusCurrency: 'USDT',
    codeEmbedding: 'query',
  },

  htx: {
    slug: 'htx',
    affiliateUrl: 'https://www.htx.com.ph/invite/ru-ru/1h?invite_code=cryptobonusw',
    cleanUrl: 'https://www.htx.com/',
    promoCode: 'cryptobonusw',
    refCode: 'cryptobonusw',
    refParamNames: ['invite_code', 'inviteCode'],
    bonusLabel: 'Up to 1,500 USDT New User Rewards',
    maxBonusAmount: 1500,
    bonusCurrency: 'USDT',
    codeEmbedding: 'query',
  },
};

/**
 * Returns the affiliate snapshot for an exchange, or null if not found.
 * @param {string} exchange
 * @returns {AffiliateSnapshot|null}
 */
export function getAffiliate(exchange) {
  return AFFILIATE_SNAPSHOT[exchange] ?? null;
}

/**
 * Checks whether the referral/promo code is still present in the final URL
 * after following all redirects.
 * @param {string} finalUrl
 * @param {AffiliateSnapshot} entry
 * @returns {boolean}
 */
export function checkReferralSurvival(finalUrl, entry) {
  if (!entry) return false;
  const url  = finalUrl.toLowerCase();
  const code = (entry.refCode || entry.promoCode || '').toLowerCase();
  if (!code) return false;

  // Path-embedded code: /join/CODE or /b/CODE or /share/CODE or /partner/CODE
  if (entry.codeEmbedding === 'path') {
    return url.includes(`/${code}`) || url.includes(`/${code}/`);
  }

  // Query-param embedded: ref=CODE, shareCode=CODE, rcode=CODE etc.
  for (const param of entry.refParamNames) {
    const encoded = encodeURIComponent(code);
    if (url.includes(`${param}=${code}`) || url.includes(`${param}=${encoded}`)) return true;
  }
  // Fallback: just check if code appears anywhere in URL
  return url.includes(code);
}
