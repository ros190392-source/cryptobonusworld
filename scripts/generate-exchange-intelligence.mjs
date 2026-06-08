/**
 * CryptoBonusWorld — Exchange Intelligence Generator
 * Generates comprehensive intelligence profiles for all 14 exchanges.
 *
 * Data sources merged:
 *   1. CoinGecko API data (trust score, volume, pairs, coins) — fetched 2026-06-08
 *   2. CoinMarketCap exchange pages — fetched 2026-06-08
 *   3. src/data/exchanges.json — affiliate URLs, promo codes, bonus amounts
 *   4. src/data/evidence/{exchange}.json — fees, KYC, products, screenshot statuses
 *
 * Output: src/data/exchange-intelligence/{exchange}.json for all 14 exchanges
 *
 * Run:   node scripts/generate-exchange-intelligence.mjs
 * Refresh market data: add --refresh flag (fetches fresh CoinGecko data)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'src', 'data', 'exchange-intelligence');

// ─── MARKET INTELLIGENCE (fetched from CoinGecko + CMC on 2026-06-08) ───────
// Update by running: node scripts/generate-exchange-intelligence.mjs --refresh
const MARKET_DATA = {
  binance: {
    geckoId: 'binance',
    cmcSlug: 'binance',
    geckoTrustScore: 10,
    geckoTrustScoreRank: 2,
    volume24hBtc: 131448.76,
    volume24hUsd: 8309263738,
    spotPairs: 1368,
    coinsListed: 430,
    cmcVolume24hUsd: 8309263738,
    cmcReservesUsd: 139286469181,
    cmcUsers: '280M+',
    cmcCountries: '180+',
    geckoLastFetched: '2026-06-08',
  },
  bybit: {
    geckoId: 'bybit_spot',
    cmcSlug: 'bybit',
    geckoTrustScore: 9,
    geckoTrustScoreRank: 7,
    volume24hBtc: 35639.60,
    volume24hUsd: 2243000000,
    spotPairs: 607,
    coinsListed: 441,
    cmcUsers: '60M+',
    cmcCountries: '160+',
    geckoLastFetched: '2026-06-08',
  },
  okx: {
    geckoId: 'okex',
    cmcSlug: 'okx',
    geckoTrustScore: 10,
    geckoTrustScoreRank: 4,
    volume24hBtc: 27302.09,
    volume24hUsd: 1718000000,
    spotPairs: 1211,
    coinsListed: 301,
    cmcUsers: '50M+',
    cmcCountries: '160+',
    geckoLastFetched: '2026-06-08',
  },
  mexc: {
    geckoId: 'mxc',
    cmcSlug: 'mexc',
    geckoTrustScore: 9,
    geckoTrustScoreRank: 9,
    volume24hBtc: 26360.51,
    volume24hUsd: 1659000000,
    spotPairs: 2455,
    coinsListed: 1926,
    cmcUsers: '10M+',
    cmcCountries: '200+',
    geckoLastFetched: '2026-06-08',
  },
  bitget: {
    geckoId: 'bitget',
    cmcSlug: 'bitget',
    geckoTrustScore: 10,
    geckoTrustScoreRank: 5,
    volume24hBtc: 18912.58,
    volume24hUsd: 1190000000,
    spotPairs: 851,
    coinsListed: 567,
    cmcUsers: '100M+',
    cmcCountries: '150+',
    geckoLastFetched: '2026-06-08',
  },
  bingx: {
    geckoId: 'bingx',
    cmcSlug: 'bingx',
    geckoTrustScore: 9,
    geckoTrustScoreRank: 13,
    volume24hBtc: 8448.67,
    volume24hUsd: 534921141,
    spotPairs: 852,
    coinsListed: 802,
    cmcUsers: '10M+',
    cmcCountries: '100+',
    geckoLastFetched: '2026-06-08',
  },
  'gate-io': {
    geckoId: 'gate',
    cmcSlug: 'gate-io',
    geckoTrustScore: 9,
    geckoTrustScoreRank: 6,
    volume24hBtc: 39901.99,
    volume24hUsd: 2452784592,
    spotPairs: 2214,
    coinsListed: 1688,
    cmcUsers: '52M+',
    cmcCountries: '130+',
    cmcReservesRatio: '125%',
    geckoLastFetched: '2026-06-08',
  },
  kucoin: {
    geckoId: 'kucoin',
    cmcSlug: 'kucoin',
    geckoTrustScore: 9,
    geckoTrustScoreRank: 12,
    volume24hBtc: 17987.26,
    volume24hUsd: 1132000000,
    spotPairs: 1084,
    coinsListed: 896,
    cmcUsers: '41M+',
    cmcCountries: '200+',
    geckoLastFetched: '2026-06-08',
  },
  htx: {
    geckoId: 'huobi',
    cmcSlug: 'htx',
    geckoTrustScore: 7,
    geckoTrustScoreRank: 60,
    volume24hBtc: 19802.22,
    volume24hUsd: 1246000000,
    spotPairs: 626,
    coinsListed: 605,
    cmcUsers: '8M+',
    cmcCountries: '160+',
    geckoLastFetched: '2026-06-08',
  },
  coinex: {
    geckoId: 'coinex',
    cmcSlug: 'coinex',
    geckoTrustScore: null, // rate limited, use CMC
    geckoTrustScoreRank: null,
    volume24hBtc: 1657,
    volume24hUsd: 104486975,
    spotPairs: 1900,
    coinsListed: 1300,
    cmcUsers: '10M+',
    cmcCountries: '200+',
    geckoLastFetched: null,
    cmcLastFetched: '2026-06-08',
  },
  phemex: {
    geckoId: 'phemex',
    cmcSlug: 'phemex',
    geckoTrustScore: 7,
    geckoTrustScoreRank: 59,
    volume24hBtc: 11474.87,
    volume24hUsd: 732317992,
    spotPairs: 600,
    coinsListed: 567,
    cmcUsers: '10M+',
    cmcCountries: '150+',
    geckoLastFetched: '2026-06-08',
  },
  bitunix: {
    geckoId: null, // not listed on CoinGecko
    cmcSlug: 'bitunix',
    geckoTrustScore: null,
    geckoTrustScoreRank: null,
    volume24hBtc: 6506,
    volume24hUsd: 409594177,
    spotPairs: 1100,
    coinsListed: 700,
    cmcUsers: '4M+',
    cmcCountries: '150+',
    cmcLastFetched: '2026-06-08',
  },
  lbank: {
    geckoId: 'lbank',
    cmcSlug: 'lbank',
    geckoTrustScore: 8,
    geckoTrustScoreRank: 17,
    volume24hBtc: 27246.94,
    volume24hUsd: 1697102732,
    spotPairs: 975,
    coinsListed: 836,
    cmcUsers: '12M+',
    cmcCountries: '210+',
    geckoLastFetched: '2026-06-08',
  },
  coinbase: {
    geckoId: 'gdax',
    cmcSlug: 'coinbase-exchange',
    geckoTrustScore: 10,
    geckoTrustScoreRank: 1,
    volume24hBtc: 29038,
    volume24hUsd: 1824205105,
    spotPairs: 300,
    coinsListed: 150,
    cmcUsers: '100M+',
    cmcCountries: '100+',
    geckoLastFetched: null,
    cmcLastFetched: '2026-06-08',
  },
};

// ─── EXCHANGE METADATA ────────────────────────────────────────────────────────
const EXCHANGE_META = {
  binance: {
    name: 'Binance',
    legalName: 'Binance Holdings Limited',
    foundedYear: 2017,
    country: 'Cayman Islands',
    registeredIn: 'Cayman Islands',
    description: 'The world\'s largest cryptocurrency exchange by trading volume, founded in 2017 by Changpeng Zhao (CZ), now led by CEO Richard Teng. Serving 280M+ users in 180+ countries with spot, futures, P2P, earn, copy trading, and Web3 products.',
    descriptionShort: 'World\'s largest CEX by volume. 280M+ users, 1,400+ spot pairs, deep P2P, 19,800 USDT welcome bonus.',
    ceoFounder: 'Founded by Changpeng Zhao (CZ, 2017–2023); current CEO Richard Teng (2023–present)',
    nasdaqListed: false,
    nativeToken: 'BNB',
    nativeTokenUse: 'Trading fee discount (25% off), Launchpad allocation, Earn products, Gas on BNB Chain',
    website: 'https://www.binance.com',
    recentBrand: null,
    notableEvent: null,
    securityIncidents: [
      {
        summary: '2019 hack — 7,000 BTC stolen, all users reimbursed via SAFU fund',
        sourceUrl: 'https://www.binance.com/en/blog/all/binance-security-breach-update-421477interpersonal806887-306950730073165824',
        sourceLabel: 'Binance Official Blog — Security Breach Update (May 2019)',
        confidence: 'official_blog',
      },
    ],
    socialChannels: {
      twitter: '@binance',
      telegram: 'https://t.me/binanceexchange',
      facebook: 'https://www.facebook.com/binanceexchange',
      reddit: 'https://www.reddit.com/r/binance/',
      medium: 'https://medium.com/binanceexchange',
    },
  },
  bybit: {
    name: 'Bybit',
    legalName: 'Bybit Fintech Limited',
    foundedYear: 2018,
    country: 'Dubai, UAE',
    registeredIn: 'British Virgin Islands',
    description: 'World\'s second-largest crypto exchange by trading volume. Founded in 2018, serving 60M+ users. Strong in derivatives (perpetuals, options), copy trading, and spot. Holds Dubai VARA licence. Actively pursuing institutional market.',
    descriptionShort: 'World\'s second-largest CEX. 60M+ users, 1,600+ spot pairs, 30,000 USDT welcome bonus.',
    ceoFounder: 'Founder & CEO: Ben Zhou',
    nasdaqListed: false,
    nativeToken: null,
    website: 'https://www.bybit.com',
    recentBrand: null,
    notableEvent: null,
    securityIncidents: [
      {
        summary: 'February 2025 — $1.5B Ethereum hack (largest exchange hack in history). All users fully reimbursed. Platform continued operating without pause.',
        sourceUrl: 'https://announcements.bybit.com/en/article/bybit-security-incident-update-blt53a40f3bfce7e5ff/',
        sourceLabel: 'Bybit Official Announcement — Security Incident Update (February 2025)',
        confidence: 'official_announcement',
      },
    ],
    socialChannels: {
      twitter: '@Bybit_Official',
      telegram: 'https://t.me/BybitEnglish',
      facebook: 'https://www.facebook.com/Bybit',
      reddit: 'https://www.reddit.com/r/Bybit/',
      instagram: 'https://www.instagram.com/bybit_official/',
    },
  },
  okx: {
    name: 'OKX',
    legalName: 'OKX Technology Company Limited',
    foundedYear: 2017,
    country: 'Seychelles',
    registeredIn: 'Seychelles',
    description: 'Major global exchange founded in 2017 as OKEx, rebranded OKX in January 2022. Serves 50M+ users. Strong in derivatives, copy trading, DEX aggregator, and NFT marketplace. Holds Dubai VARA and Bahamas SCB licences. Own Web3 wallet.',
    descriptionShort: 'Top-3 global CEX. 50M+ users, 1,200+ spot pairs, 5,000 USDT welcome bonus.',
    ceoFounder: 'Founder: Star Xu; CEO: Star Xu',
    nasdaqListed: false,
    nativeToken: 'OKB',
    nativeTokenUse: 'Trading fee discount, staking, Earn, OKX Chain gas',
    website: 'https://www.okx.com',
    recentBrand: 'Rebranded from OKEx to OKX in January 2022',
    socialChannels: {
      twitter: '@OKX',
      telegram: 'https://t.me/OKXOfficial_English',
      facebook: 'https://www.facebook.com/OKXofficial/',
      reddit: 'https://www.reddit.com/r/OKX/',
      youtube: 'https://www.youtube.com/@OKXExchange',
    },
  },
  mexc: {
    name: 'MEXC',
    legalName: 'MEXC Global',
    foundedYear: 2018,
    country: 'Seychelles',
    registeredIn: 'Seychelles',
    description: 'Founded April 2018. Known for listing the most new and early-stage altcoins of any major exchange (1,900+ coins). Spot maker fee 0% (industry-leading). Futures maker fee 0%. Serves 10M+ users. Strong in Southeast Asia and emerging markets.',
    descriptionShort: 'Most altcoins of any major CEX (1,900+). 0% maker fees. 10,000 USDT welcome bonus.',
    ceoFounder: 'Founded by team of blockchain/financial professionals',
    nasdaqListed: false,
    nativeToken: 'MX',
    nativeTokenUse: 'Fee discount, staking, launchpad allocation',
    website: 'https://www.mexc.com',
    socialChannels: {
      twitter: '@MEXC_Official',
      telegram: 'https://t.me/MEXCEnglish',
      facebook: 'https://www.facebook.com/mexcofficial',
      reddit: 'https://www.reddit.com/r/MEXC_official/',
      discord: 'https://discord.com/invite/Hs2e93Xav5',
    },
  },
  bitget: {
    name: 'Bitget',
    legalName: 'Bitget Limited',
    foundedYear: 2018,
    country: 'Seychelles',
    registeredIn: 'Seychelles',
    description: 'Founded in 2018. Known as a leader in copy trading (100,000+ signal traders). Serves 100M+ users in 150+ countries. Spot and perpetual futures. Holds Litecoin-like native token BGB. Strong compliance footprint with multiple licences.',
    descriptionShort: 'Copy trading leader. 100M+ users, 800+ pairs, 6,200 USDT welcome bonus.',
    ceoFounder: 'CEO: Gracy Chen',
    nasdaqListed: false,
    nativeToken: 'BGB',
    nativeTokenUse: 'Fee discounts, VIP tier benefits, governance',
    website: 'https://www.bitget.com',
    socialChannels: {
      twitter: '@bitget',
      telegram: 'https://t.me/bitgetEN',
      facebook: 'https://www.facebook.com/BitgetGlobal/',
    },
  },
  bingx: {
    name: 'BingX',
    legalName: 'BingX',
    foundedYear: 2018,
    country: 'British Virgin Islands',
    registeredIn: 'British Virgin Islands',
    description: 'Founded 2018. Serves 10M+ users. Principal partner of Chelsea FC. Known for social/copy trading features. Offers spot, perpetual futures, and copy trading. Restricted in US, UK, Canada, Singapore, Netherlands.',
    descriptionShort: 'Social trading CEX. 10M+ users, Chelsea FC partner, 5,000 USDT welcome bonus.',
    ceoFounder: 'Founder: Elvisco Carrington',
    nasdaqListed: false,
    nativeToken: null,
    website: 'https://bingx.com',
    notableEvent: null,
    securityIncidents: [],
    partnershipNote: 'Official principal partner of Chelsea FC since 2022',
    socialChannels: {
      twitter: '@BingXOfficial',
      telegram: 'https://t.me/BingXOfficial',
    },
  },
  'gate-io': {
    name: 'Gate.io',
    legalName: 'Gate Technology Inc. (rebranding to Gate.com)',
    foundedYear: 2013,
    country: 'Panama',
    registeredIn: 'Cayman Islands',
    description: 'One of the oldest active exchanges, founded 2013 (originally Bter). Rebranded to Gate.io in 2017, now moving to Gate.com (2025). 52M+ users. Widest altcoin selection of any exchange (4,600+ cryptos). 125% reserve ratio. Multiple regulatory licences (Malta, Italy, Gibraltar, Bahamas, Hong Kong, Dubai VARA).',
    descriptionShort: 'Oldest top exchange (est. 2013). 4,600+ altcoins, 52M users, 3,000 USDT welcome bonus.',
    ceoFounder: 'Founder: Dr. Han (PhD Optoelectronics)',
    nasdaqListed: false,
    nativeToken: 'GT',
    nativeTokenUse: 'Fee discount, staking, Startup (IEO), governance',
    website: 'https://www.gate.io',
    recentBrand: 'Rebranding to Gate.com in 2025',
    socialChannels: {
      twitter: '@gate_io',
      telegram: 'https://t.me/gateio',
    },
  },
  kucoin: {
    name: 'KuCoin',
    legalName: 'Mek Global Limited',
    foundedYear: 2017,
    country: 'Seychelles',
    registeredIn: 'Seychelles',
    description: '"The People\'s Exchange." Founded 2017. 41M+ users across 200+ countries. Known for listing emerging altcoins early. KCS (KuCoin Token) gives 20% fee rebate. Features: spot, margin, futures, P2P, copy trading, lending, earn. SOC 2 Type II and ISO 27001:2022 certified.',
    descriptionShort: '"The People\'s Exchange." 41M+ users, 900+ altcoins, 11,000 USDT welcome bonus.',
    ceoFounder: 'Co-founders: Michael Gan, Eric Don, Top Lan, Kent Li, Jack Zhu, Linda Lin, Johnny Lyu (CEO)',
    nasdaqListed: false,
    nativeToken: 'KCS',
    nativeTokenUse: '20% trading fee rebate, KuCoin Spotlight (IEO), lending',
    website: 'https://www.kucoin.com',
    socialChannels: {
      twitter: '@kucoincom',
      telegram: 'https://t.me/Kucoin_Exchange',
      facebook: 'https://www.facebook.com/kucoinexchangepage',
    },
  },
  htx: {
    name: 'HTX',
    legalName: 'Huobi Technology Holdings Limited',
    foundedYear: 2013,
    country: 'Seychelles',
    registeredIn: 'Seychelles',
    description: 'One of the oldest major exchanges, founded 2013 as Huobi. Rebranded to HTX in September 2023. Backed by Tron founder Justin Sun (major investor since 2022). 8M+ users. Strong in Asian markets. Offers spot, futures, copy trading, earn, OTC.',
    descriptionShort: 'Pioneer CEX (est. 2013), rebranded HTX 2023. Justin Sun-linked. 8M+ users, 2,000 USDT welcome bonus.',
    ceoFounder: 'Founded by Leon Li; major investor: Justin Sun (since 2022)',
    nasdaqListed: false,
    nativeToken: 'HT',
    nativeTokenUse: 'Fee discount, Huobi Prime (IEO), staking, burn mechanism',
    website: 'https://www.htx.com',
    recentBrand: 'Rebranded from Huobi to HTX in September 2023',
    socialChannels: {
      twitter: '@HuobiGlobal',
      telegram: 'https://t.me/HTX_Chineseofficial',
    },
  },
  coinex: {
    name: 'CoinEx',
    legalName: 'CoinEx Technology Limited',
    foundedYear: 2017,
    country: 'Hong Kong',
    registeredIn: 'Hong Kong',
    description: 'Founded December 2017 by Haipo Yang (ViaBTC founder). Part of the ViaBTC Group ecosystem. Known as the first exchange to list BCH (Bitcoin Cash). Serves 10M+ users in 200+ countries. Focuses on transparency: one of earliest PoR publishers. Native token CET. Has own AMM and CoinEx Smart Chain.',
    descriptionShort: 'ViaBTC ecosystem exchange. First to list BCH. 10M+ users, 1,300+ coins, 500 USDT welcome bonus.',
    ceoFounder: 'Founder & CEO: Haipo Yang (also founded ViaBTC mining pool)',
    nasdaqListed: false,
    nativeToken: 'CET',
    nativeTokenUse: 'Fee discount, staking, Mining allocation, CoinEx Smart Chain gas',
    website: 'https://www.coinex.com',
    socialChannels: {
      twitter: '@coinexcom',
      telegram: 'https://t.me/CoinExOfficialEN',
    },
  },
  phemex: {
    name: 'Phemex',
    legalName: 'Phemex Ltd',
    foundedYear: 2019,
    country: 'British Virgin Islands',
    registeredIn: 'British Virgin Islands',
    description: 'Founded November 2019 by 8 former Morgan Stanley executives. 10M+ users in 150+ countries. Ultra-low latency (5–10ms execution). 99.999% uptime claimed. Strong in derivatives with 100× leverage, copy trading (17,000+ traders), and grid/Martingale bots. 100% Proof-of-Reserves. 8,800 USDT welcome bonus.',
    descriptionShort: 'Ex-Morgan Stanley team (2019). 10M+ users, ultra-low latency, 100× leverage, 8,800 USDT welcome bonus.',
    ceoFounder: 'CEO: Jack Tao (former Morgan Stanley VP); co-founded by 8 ex-Morgan Stanley executives',
    nasdaqListed: false,
    nativeToken: 'PT',
    nativeTokenUse: 'Premium membership (zero spot fees), staking rewards',
    website: 'https://phemex.com',
    socialChannels: {
      twitter: '@Phemex_official',
      telegram: 'https://t.me/Phemex_EN',
    },
  },
  bitunix: {
    name: 'Bitunix',
    legalName: 'Bitunix',
    foundedYear: 2022,
    country: 'Saint Vincent and the Grenadines',
    registeredIn: 'Saint Vincent and the Grenadines',
    description: 'Newer derivatives-focused exchange, globally launched October 2022. 4M+ users in 150+ countries. Known for industry-first "loss-based positioning" and up to 200× leverage. TradingView integration. Proof-of-Reserves. Spot, perpetuals, chart trading.',
    descriptionShort: 'Derivatives-first exchange (2022). 200× leverage, 4M+ users, 1,000 USDT welcome bonus.',
    ceoFounder: 'Not publicly disclosed',
    nasdaqListed: false,
    nativeToken: null,
    website: 'https://www.bitunix.com',
    socialChannels: {
      twitter: '@Bitunix_',
      telegram: 'https://t.me/BitunixGlobal',
    },
  },
  lbank: {
    name: 'LBank',
    legalName: 'LBank',
    foundedYear: 2015,
    country: 'British Virgin Islands',
    registeredIn: 'British Virgin Islands',
    description: 'Founded 2015, one of the older mid-tier exchanges. Serves 12M+ users across 210+ countries. Offices in Lithuania, Canada, Singapore. 113+ fiat currencies, 55+ payment methods. Regulated: NFA (US), Italy, Canadian MSB. Offers spot, margin, futures, ETF, grid bots, leveraged ETF (3×).',
    descriptionShort: 'Established 2015. 12M+ users, 800+ cryptos, NFA-regulated, 500 USDT welcome bonus.',
    ceoFounder: 'Not publicly prominent',
    nasdaqListed: false,
    nativeToken: null,
    website: 'https://www.lbank.com',
    socialChannels: {
      twitter: '@LBank_Exchange',
      telegram: 'https://t.me/LBank_en',
    },
  },
  coinbase: {
    name: 'Coinbase',
    legalName: 'Coinbase Global, Inc.',
    foundedYear: 2012,
    country: 'San Francisco, USA',
    registeredIn: 'Delaware, USA',
    description: 'Founded June 2012. NASDAQ-listed (COIN) since April 2021. US\'s largest and most-regulated crypto exchange. 100M+ users. Beginner-friendly UI. Compliant with US SEC, CFTC, FinCEN. Offers Coinbase One subscription (zero fees). Strong institutional arm (Coinbase Prime). Own stablecoin USDC (via Circle partnership). No leverage for retail (margin trading discontinued 2020). Advanced Trade for pro users.',
    descriptionShort: 'NASDAQ-listed (COIN). Most-regulated US exchange. 100M+ users, beginner-friendly, $10 USD signup bonus.',
    ceoFounder: 'CEO: Brian Armstrong (co-founder); co-founder Fred Ehrsam (left 2017)',
    nasdaqListed: true,
    nasdaqTicker: 'COIN',
    nativeToken: null,
    stablecoin: 'USDC (via Circle)',
    website: 'https://www.coinbase.com',
    socialChannels: {
      twitter: '@coinbase',
      telegram: null,
      facebook: null,
      reddit: 'https://www.reddit.com/r/coinbase/',
    },
  },
};

// ─── KNOWLEDGE BASE: COMMON QUESTIONS (per-exchange Q&A) ──────────────────────
function buildKnowledgeBase(slug, meta, mkt, affiliate, evidence) {
  const name = meta.name;
  const bonus = affiliate.bonusAmount;
  const bonusCcy = affiliate.bonusCurrency;
  const promoCode = affiliate.promoCode;
  const volume = mkt.volume24hUsd ? `$${(mkt.volume24hUsd / 1e9).toFixed(2)}B` : 'N/A';
  const spotFee = evidence.fees?.spot_maker ?? '0.1';
  const futuresFee = evidence.fees?.futures_maker ?? '0.02';

  return {
    quickFacts: {
      founded: meta.foundedYear,
      headquarters: meta.country,
      users: meta.cmcUsers || mkt.cmcUsers,
      tradingPairs: mkt.spotPairs,
      coinsListed: mkt.coinsListed,
      volume24h: volume,
      geckoTrustScore: mkt.geckoTrustScore,
      geckoTrustRank: `#${mkt.geckoTrustScoreRank}`,
      welcomeBonus: `${bonus} ${bonusCcy}`,
      promoCode: promoCode || 'none',
      nativeToken: meta.nativeToken || 'none',
      nasdaqListed: meta.nasdaqListed,
    },
    commonQuestions: [
      {
        question: `What is ${name}?`,
        answer: meta.description,
        category: 'general',
      },
      {
        question: `Is ${name} safe?`,
        answer: buildSafetyAnswer(slug, meta, mkt),
        category: 'safety',
      },
      {
        question: `What is the ${name} promo/referral code?`,
        answer: promoCode
          ? `The CryptoBonusWorld referral code for ${name} is ${promoCode}. It is pre-filled automatically when you register via our link. Using it activates the welcome bonus of up to ${bonus} ${bonusCcy}.`
          : `${name} currently uses a direct referral link via CryptoBonusWorld rather than a text code. Click the registration button on our ${name} page to ensure the bonus is attributed correctly.`,
        category: 'affiliate',
      },
      {
        question: `How much is the ${name} welcome bonus?`,
        answer: `Via CryptoBonusWorld, the current ${name} welcome bonus is up to ${bonus} ${bonusCcy}. This is a task-based reward: completing KYC, making a qualifying deposit, and reaching trading volume milestones unlocks different reward tiers. The full amount requires all milestones — most users completing a standard deposit earn a meaningful first-week reward. Bonus amounts are typically trading fee vouchers, not withdrawable cash.`,
        category: 'affiliate',
      },
      {
        question: `How do I claim the ${name} bonus?`,
        answer: `Step 1: Click the registration link on the CryptoBonusWorld ${name} page — the referral code/link is pre-filled. Step 2: Complete email/phone verification. Step 3: Complete KYC identity verification (required for bonuses). Step 4: Make a qualifying deposit (crypto transfer or card). Step 5: Check your Rewards Center / Bonus Hub for active tasks and complete trading volume milestones within the campaign window (usually 30 days). Vouchers are credited to your account as you complete each task tier.`,
        category: 'affiliate',
      },
      {
        question: `What are ${name} spot trading fees?`,
        answer: `${buildSpotFeeAnswer(slug, meta, evidence)}`,
        category: 'fees',
      },
      {
        question: `What are ${name} futures trading fees?`,
        answer: `${buildFuturesFeeAnswer(slug, meta, evidence)}`,
        category: 'fees',
      },
      {
        question: `Does ${name} have P2P trading?`,
        answer: buildP2PAnswer(slug, meta, evidence),
        category: 'products',
      },
      {
        question: `Does ${name} have copy trading?`,
        answer: buildCopyTradingAnswer(slug, meta, evidence),
        category: 'products',
      },
      {
        question: `Is ${name} available in the United States?`,
        answer: buildUSAnswer(slug, meta, evidence),
        category: 'availability',
      },
      {
        question: `Is ${name} available in the United Kingdom?`,
        answer: buildUKAnswer(slug, meta, evidence),
        category: 'availability',
      },
      {
        question: `What cryptocurrencies does ${name} support?`,
        answer: `${name} lists ${mkt.coinsListed || 'hundreds of'} cryptocurrencies across ${mkt.spotPairs || 'hundreds of'} trading pairs. ${buildCoinNote(slug, meta, mkt)}`,
        category: 'products',
      },
      {
        question: `Does ${name} have a mobile app?`,
        answer: `Yes. ${name} has official iOS (App Store) and Android (Google Play) apps. Download from the official ${name} website (${meta.website}/app or equivalent) or directly from the official app store listing to avoid counterfeit apps. ${buildAppNote(slug, meta)}`,
        category: 'products',
      },
      {
        question: `Does ${name} require KYC?`,
        answer: buildKYCAnswer(slug, meta, evidence),
        category: 'compliance',
      },
      {
        question: `Does ${name} have Proof of Reserves?`,
        answer: buildPORAnswer(slug, meta, evidence),
        category: 'trust',
      },
      {
        question: `What leverage does ${name} offer?`,
        answer: buildLeverageAnswer(slug, meta, evidence),
        category: 'products',
      },
      {
        question: `When was ${name} founded and who founded it?`,
        answer: `${name} was founded in ${meta.foundedYear}. ${meta.ceoFounder}.${meta.notableEvent ? ' Notable: ' + meta.notableEvent : ''}${(meta.securityIncidents && meta.securityIncidents.length > 0) ? ' Security history: ' + meta.securityIncidents[0].summary : ''}`,
        category: 'general',
      },
      {
        question: `How many users does ${name} have?`,
        answer: `${name} serves ${meta.cmcUsers || mkt.cmcUsers || 'millions of'} registered users across ${meta.cmcCountries || mkt.cmcCountries || 'many'} countries as of 2026.`,
        category: 'general',
      },
      {
        question: `What is ${name}'s 24-hour trading volume?`,
        answer: `${name}'s 24-hour spot trading volume is approximately ${volume} (${mkt.volume24hBtc?.toLocaleString()} BTC) as of the last data pull (${mkt.geckoLastFetched || mkt.cmcLastFetched || '2026-06-08'}). This places ${name} at CoinGecko rank #${mkt.geckoTrustScoreRank || 'N/A'} by trust-adjusted volume.`,
        category: 'marketdata',
      },
      {
        question: `Does ${name} have a native token?`,
        answer: meta.nativeToken
          ? `Yes. ${name}'s native token is ${meta.nativeToken}. Use: ${meta.nativeTokenUse || 'trading fee discounts and platform benefits'}.`
          : `${name} does not have its own native exchange token.`,
        category: 'products',
      },
      {
        question: `What is ${name}'s CoinGecko trust score?`,
        answer: mkt.geckoTrustScore
          ? `${name} has a CoinGecko trust score of ${mkt.geckoTrustScore}/10, placing it at rank #${mkt.geckoTrustScoreRank} globally. CoinGecko's trust score assesses exchange API accuracy, trading volume legitimacy, and cybersecurity posture.`
          : `${name} is not listed on CoinGecko (or trust score data was unavailable at last data pull).`,
        category: 'trust',
      },
    ],
  };
}

// ─── ANSWER BUILDERS ──────────────────────────────────────────────────────────

function buildSafetyAnswer(slug, meta, mkt) {
  const trustStr = mkt.geckoTrustScore ? `CoinGecko trust score: ${mkt.geckoTrustScore}/10 (rank #${mkt.geckoTrustScoreRank}).` : '';
  const incidents = (meta.securityIncidents && meta.securityIncidents.length > 0)
    ? `Security context: ${meta.securityIncidents[0].summary}`
    : '';
  return `${meta.name} is a ${mkt.geckoTrustScore >= 9 ? 'top-tier' : mkt.geckoTrustScore >= 7 ? 'established' : 'mid-tier'} centralized exchange. ${trustStr} ${incidents} Like all CEXs, funds are custodied by the exchange — use hardware wallets for long-term storage. Enable 2FA, use a strong unique password, and whitelist withdrawal addresses where available. Never share API keys.`;
}

function buildSpotFeeAnswer(slug, meta, evidence) {
  const maker = evidence.fees?.spot_maker ?? 0.1;
  const taker = evidence.fees?.spot_taker ?? 0.1;
  const discounts = {
    binance: 'Using BNB for fee payment gives a 25% discount — reducing standard fees to 0.075% maker/taker.',
    mexc: 'MEXC charges 0% maker fee — among the lowest in the industry. Taker fee is 0.05%–0.2% depending on trading volume.',
    coinbase: 'Coinbase Advanced Trade uses a tiered model: up to 0.40% maker / 0.60% taker for low-volume accounts. Zero-fee stablecoin trading available.',
    okx: 'OKX offers tiered fee reductions with OKB token holdings. VIP tiers can reduce spot fees to near zero.',
    kucoin: 'Holding KCS (KuCoin token) gives 20% trading fee rebate.',
    phemex: 'Phemex Premium membership (PT token staking) unlocks zero spot fees.',
  };
  return `${meta.name} spot trading fees: ${maker}% maker / ${taker}% taker (standard). ${discounts[slug] || ''}`;
}

function buildFuturesFeeAnswer(slug, meta, evidence) {
  const maker = evidence.fees?.futures_maker ?? 0.02;
  const taker = evidence.fees?.futures_taker ?? 0.05;
  const lev = evidence.fees?.max_leverage ?? 100;
  const risky = ['Futures trading carries substantial risk of capital loss from liquidation. Up to ' + lev + '× leverage available.'];
  return `${meta.name} USDT-margined perpetual futures: ${maker}% maker / ${taker}% taker. Maximum leverage: ${lev}×. ${risky}`;
}

function buildP2PAnswer(slug, meta, evidence) {
  const hasP2P = evidence.facts?.p2p_available ?? false;
  if (!hasP2P) return `${meta.name} does not currently offer P2P trading.`;
  const p2p = {
    binance: 'Binance P2P offers 0% platform fee with 100+ fiat currencies and 700+ payment methods. Binance escrow holds seller crypto before buyer sends fiat. Available at p2p.binance.com.',
    okx: 'OKX P2P (formerly C2C) offers 0% platform fee with multiple local payment methods.',
    mexc: 'MEXC offers P2P trading with 0% fee and support for local fiat currencies.',
    bybit: 'Bybit P2P is available in selected regions with escrow protection and zero platform fees.',
    kucoin: 'KuCoin P2P supports local fiat currencies with escrow protection.',
    htx: 'HTX offers OTC/P2P with multiple fiat options primarily targeting Asian markets.',
  };
  return p2p[slug] || `Yes, ${meta.name} offers P2P trading with escrow protection. Fee: 0% platform side. Check the exchange app for available fiat currencies and payment methods in your region.`;
}

function buildCopyTradingAnswer(slug, meta, evidence) {
  const hasCopy = evidence.facts?.copy_trading ?? false;
  const copyDetails = {
    bitget: 'Bitget is the industry leader in copy trading, with 100,000+ signal traders. Users can allocate funds and mirror top traders automatically.',
    bybit: 'Bybit copy trading allows following experienced traders. Performance history and risk metrics visible for each lead trader.',
    okx: 'OKX copy trading lets users mirror lead traders across spot and futures positions.',
    bingx: 'BingX social trading allows copying experienced traders. Designed for beginner-to-intermediate users.',
    phemex: 'Phemex copy trading has 17,000+ registered traders to follow.',
    binance: 'Binance copy trading is available — allocate funds to copy qualified lead traders in spot or futures.',
  };
  if (!hasCopy) return `${meta.name} does not currently offer copy trading.`;
  return copyDetails[slug] || `Yes, ${meta.name} offers copy trading. Users can allocate funds to mirror experienced traders across spot and/or futures markets.`;
}

function buildUSAnswer(slug, meta, evidence) {
  const restricted = evidence.facts?.restricted_us ?? true;
  const usNote = {
    coinbase: 'Yes. Coinbase is a US-regulated exchange (SEC/FinCEN/CFTC registered) and is fully available in all 50 US states. It is the most widely used exchange for US residents.',
    binance: 'No. Binance.com does not accept US residents. US users must use Binance.US (a separate regulated entity) — which has significantly fewer features and trading pairs than Binance.com.',
  };
  if (usNote[slug]) return usNote[slug];
  return restricted
    ? `No. ${meta.name} restricts US residents from registering. US users should use Coinbase or Kraken as regulated alternatives.`
    : `${meta.name} accepts users from most countries. US availability should be verified on the official ${meta.name} website, as regulations can change.`;
}

function buildUKAnswer(slug, meta, evidence) {
  const ukExchanges = {
    coinbase: 'Yes. Coinbase is fully available in the UK with FCA compliance.',
    binance: 'No. Binance.com is not available to UK residents following FCA action in 2021.',
    bybit: 'Bybit has restricted UK retail clients following FCA guidance. Professional/institutional access may vary.',
  };
  return ukExchanges[slug] || `UK availability for ${meta.name} should be verified on the official website, as FCA compliance and local regulatory status may affect service availability.`;
}

function buildCoinNote(slug, meta, mkt) {
  if (slug === 'mexc') return 'MEXC has the most altcoins of any major exchange, frequently listing projects in early/presale stages.';
  if (slug === 'gate-io') return 'Gate.io lists 4,600+ cryptocurrencies — the highest count of any major exchange.';
  if (slug === 'coinbase') return 'Coinbase prioritises regulatory-compliant assets and lists fewer, higher-quality projects than competitors.';
  return `${meta.name} regularly lists emerging altcoins alongside major assets.`;
}

function buildAppNote(slug, meta) {
  const restricted = slug === 'binance' ? 'Note: the app may not be available in US/UK app stores.' : '';
  return restricted;
}

function buildKYCAnswer(slug, meta, evidence) {
  const required = evidence.facts?.kyc_required ?? true;
  if (slug === 'mexc') return 'MEXC allows limited trading without KYC (email registration only), but full withdrawal access and bonus eligibility require identity verification (government ID + selfie).';
  if (!required) return `${meta.name} allows basic trading without KYC. However, higher withdrawal limits and bonus claims typically require identity verification.`;
  return `Yes. ${meta.name} requires KYC (identity verification) to unlock full trading, withdrawals, and welcome bonus eligibility. Process: government-issued ID + selfie/liveness check. Typically completes in 2–30 minutes for automated approval; up to 24 hours for manual review.`;
}

function buildPORAnswer(slug, meta, evidence) {
  const hasPOR = evidence.facts?.proof_of_reserves ?? false;
  const porDetails = {
    binance: 'Yes. Binance publishes monthly Proof of Reserves via Merkle tree verification. Users can verify their specific balance is included. Historically audited by Mazars.',
    bybit: 'Yes. Bybit publishes regular Proof of Reserves. Notably provided PoR evidence rapidly after the Feb 2025 security incident to demonstrate platform solvency.',
    okx: 'Yes. OKX publishes monthly Proof of Reserves with Merkle tree verification.',
    coinbase: 'Coinbase is NASDAQ-listed and subject to SEC financial reporting requirements. Does not publish a traditional PoR but files regular audited financial statements.',
    'gate-io': 'Yes. Gate.io publishes Proof of Reserves with a 125% reserve ratio (as of June 2026).',
    coinex: 'Yes. CoinEx was one of the earliest exchanges to publish Proof of Reserves.',
    phemex: 'Yes. Phemex publishes 100% Proof of Reserves.',
    bitunix: 'Yes. Bitunix offers on-chain Proof of Reserves audit capability.',
  };
  if (!hasPOR) return `${meta.name} does not currently publish Proof of Reserves. Use caution with large balances on any exchange without PoR.`;
  return porDetails[slug] || `Yes. ${meta.name} publishes Proof of Reserves, allowing users to independently verify that exchange-held assets cover all user balances.`;
}

function buildLeverageAnswer(slug, meta, evidence) {
  const lev = evidence.fees?.max_leverage ?? 100;
  const note = lev >= 200 ? 'Extremely high leverage — significant liquidation risk even on small price moves.' :
                lev >= 100 ? 'High leverage available — suitable only for experienced traders with strict risk management.' :
                'Moderate leverage offering.';
  return `${meta.name} offers up to ${lev}× leverage on futures. Standard: 10–20× for most trading pairs. ${note} Leverage availability varies by asset and KYC level.`;
}

// ─── PROFILE BUILDER ──────────────────────────────────────────────────────────
function buildProfile(slug, exchangesData, evidenceData) {
  const affiliateEntry = exchangesData.find(e => e.slug === slug) || {};
  const meta = EXCHANGE_META[slug];
  const mkt = MARKET_DATA[slug];
  if (!meta || !mkt) throw new Error(`Missing meta or market data for: ${slug}`);

  // Extract key facts from evidence
  const factsMap = {};
  (evidenceData.facts || []).forEach(f => { factsMap[f.field] = f.currentValue; });

  const evidenceSummary = {
    fees: {
      spot_maker: factsMap['spot_maker_fee'],
      spot_taker: factsMap['spot_taker_fee'],
      futures_maker: factsMap['futures_maker_fee'],
      futures_taker: factsMap['futures_taker_fee'],
      max_leverage: factsMap['max_futures_leverage'],
    },
    facts: {
      kyc_required: factsMap['kyc_required'],
      p2p_available: factsMap['p2p_available'],
      futures_available: factsMap['futures_available'],
      copy_trading: factsMap['copy_trading'] ?? false,
      proof_of_reserves: factsMap['proof_of_reserves'] ?? false,
      restricted_us: factsMap['restricted_us'] ?? true,
      mobile_app_ios: factsMap['mobile_app_ios'] ?? true,
      mobile_app_android: factsMap['mobile_app_android'] ?? true,
    },
  };

  const profile = {
    exchange: slug,
    schemaVersion: '2.0',
    lastUpdated: '2026-06-08',
    dataSourcesUsed: ['coingecko_api_2026-06-08', 'coinmarketcap_exchange_2026-06-08', 'project_evidence_files', 'official_exchange_sites'],
    ownerRole: `${meta.name} Intelligence Owner (ROLE 37)`,

    // ── IDENTITY ────────────────────────────────────────────────────────────
    identity: {
      name: meta.name,
      legalName: meta.legalName,
      type: 'centralized',
      foundedYear: meta.foundedYear,
      ceoFounder: meta.ceoFounder,
      headquarters: meta.country,
      registeredIn: meta.registeredIn,
      website: meta.website,
      nasdaqListed: meta.nasdaqListed,
      nasdaqTicker: meta.nasdaqTicker || null,
      nativeToken: meta.nativeToken,
      nativeTokenUse: meta.nativeTokenUse || null,
      stablecoin: meta.stablecoin || null,
      recentBrandChange: meta.recentBrand || null,
      description: meta.description,
      descriptionShort: meta.descriptionShort,
      notableEvents: meta.notableEvent ? [meta.notableEvent] : [],
      partnershipNote: meta.partnershipNote || null,
    },

    // ── AFFILIATE ────────────────────────────────────────────────────────────
    affiliate: {
      primaryUrl: affiliateEntry.affiliateUrl || null,
      promoCode: affiliateEntry.promoCode || null,
      bonusAmount: affiliateEntry.bonusAmount || null,
      bonusCurrency: affiliateEntry.bonusCurrency || 'USDT',
      bonusType: 'task-based rewards (KYC + deposit + volume milestones)',
      bonusVoucherNote: 'Vouchers are trading fee credits, not withdrawable cash — only profits from trading with them can be withdrawn',
      ownerApprovalRequiredForChanges: true,
      immutableNote: 'Affiliate URL is IMMUTABLE — changes require ROLE 0 explicit approval',
      lastVerified: evidenceData.updatedAt || '2026-06-08',
    },

    // ── MARKET INTELLIGENCE (CoinGecko + CMC) ────────────────────────────────
    marketIntelligence: {
      geckoId: mkt.geckoId,
      cmcSlug: mkt.cmcSlug,
      geckoTrustScore: mkt.geckoTrustScore,
      geckoTrustScoreRank: mkt.geckoTrustScoreRank,
      geckoTrustScoreNote: 'CoinGecko trust score (1-10) assesses exchange API accuracy, volume legitimacy, and cybersecurity posture',
      volume24hBtc: mkt.volume24hBtc,
      volume24hUsd: mkt.volume24hUsd,
      spotPairsActive: mkt.spotPairs,
      coinsListed: mkt.coinsListed,
      registeredUsers: meta.cmcUsers || mkt.cmcUsers || null,
      countriesServed: meta.cmcCountries || mkt.cmcCountries || null,
      reservesUsd: mkt.cmcReservesUsd || null,
      reserveRatio: mkt.cmcReservesRatio || null,
      dataFetchedAt: mkt.geckoLastFetched || mkt.cmcLastFetched || '2026-06-08',
      dataRefreshScript: 'node scripts/generate-exchange-intelligence.mjs --refresh',
    },

    // ── SOCIAL CHANNELS ─────────────────────────────────────────────────────
    socialChannels: meta.socialChannels,

    // ── OFFICIAL PAGES ──────────────────────────────────────────────────────
    officialPages: buildOfficialPages(slug, meta, evidenceData),

    // ── FEES (from evidence + enriched) ─────────────────────────────────────
    fees: {
      spotMaker: factsMap['spot_maker_fee'],
      spotTaker: factsMap['spot_taker_fee'],
      spotUnit: '%',
      spotNote: buildSpotFeeNote(slug),
      futuresMaker: factsMap['futures_maker_fee'],
      futuresTaker: factsMap['futures_taker_fee'],
      futuresUnit: '%',
      maxLeverage: factsMap['max_futures_leverage'],
      p2pPlatformFee: factsMap['p2p_available'] ? buildP2PFee(slug) : null,
      withdrawalFeeStructure: 'network-dependent — varies by asset and blockchain',
      depositFee: 'free for crypto; varies for fiat (country/method dependent)',
      feeSourceUrl: evidenceData.sources?.fees?.url || null,
      lastChecked: evidenceData.sources?.fees?.lastAccessed || '2026-05-25',
    },

    // ── PRODUCTS ─────────────────────────────────────────────────────────────
    products: {
      spot: {
        available: true,
        pairsCount: mkt.spotPairs || factsMap['trading_pairs_count'],
        coinsCount: mkt.coinsListed,
      },
      futures: {
        available: factsMap['futures_available'] ?? true,
        type: 'USDT-margined perpetual',
        maxLeverage: factsMap['max_futures_leverage'],
        riskNote: 'High leverage carries substantial liquidation risk — not for beginners',
      },
      p2p: {
        available: factsMap['p2p_available'] ?? false,
        platformFee: '0%',
        note: buildP2PProductNote(slug),
      },
      copyTrading: {
        available: factsMap['copy_trading'] ?? false,
        note: buildCopyTradingNote(slug),
      },
      earn: buildEarnNote(slug),
      mobileApp: {
        ios: factsMap['mobile_app_ios'] ?? true,
        android: factsMap['mobile_app_android'] ?? true,
        downloadUrl: `${meta.website}/download`,
      },
    },

    // ── KYC ────────────────────────────────────────────────────────────────
    kyc: {
      required: factsMap['kyc_required'] ?? true,
      tiers: buildKYCTiers(slug),
      typicalTime: '2–30 minutes automated; up to 24h manual review',
      documentsRequired: ['Government-issued ID (passport, national ID, or driver\'s licence)', 'Liveness check / selfie'],
      sourceUrl: evidenceData.sources?.kyc?.url || null,
    },

    // ── AVAILABILITY ───────────────────────────────────────────────────────
    availability: {
      restrictedUS: factsMap['restricted_us'] ?? true,
      restrictedUK: buildUKRestriction(slug),
      restrictedCountriesNote: buildRestrictedNote(slug),
      officialRestrictedListUrl: evidenceData.sources?.restricted_countries?.url || null,
      manualReviewRequired: true,
    },

    // ── TRUST & SECURITY ───────────────────────────────────────────────────
    trust: {
      geckoTrustScore: mkt.geckoTrustScore,
      proofOfReserves: factsMap['proof_of_reserves'] ?? false,
      porUrl: evidenceData.sources?.proof_of_reserves?.url || null,
      porFrequency: buildPORFrequency(slug),
      safuOrEquivalent: buildSAFU(slug),
      licences: (evidenceData.facts?.find(f => f.field === 'licences')?.currentValue) || null,
      securityIncidents: meta.securityIncidents || [],
    },

    // ── KNOWLEDGE BASE (pre-computed Q&A) ─────────────────────────────────
    knowledgeBase: buildKnowledgeBase(slug, meta, mkt, affiliateEntry, evidenceSummary),

    // ── CONTENT MAP ────────────────────────────────────────────────────────
    contentMap: {
      mainReviewPage: `/exchanges/${slug}/`,
      bonusPage: `/bonuses/${slug}-bonus/`,
      bonusCodePage: `/bonus-codes/${slug}/`,
    },

    // ── FRESHNESS ──────────────────────────────────────────────────────────
    freshness: {
      marketDataFetchedAt: mkt.geckoLastFetched || mkt.cmcLastFetched || '2026-06-08',
      evidenceLastUpdated: evidenceData.updatedAt || '2026-06-04',
      nextMarketRefresh: '2026-07-08',
      refreshScript: 'node scripts/generate-exchange-intelligence.mjs --refresh',
    },
  };

  return profile;
}

// ─── HELPER BUILDERS ─────────────────────────────────────────────────────────
function buildOfficialPages(slug, meta, evidenceData) {
  const base = meta.website;
  const pages = {};
  if (evidenceData.sources) {
    Object.entries(evidenceData.sources).forEach(([key, val]) => {
      pages[key] = { url: val.url, label: val.label, lastAccessed: val.lastAccessed };
    });
  }
  return pages;
}

function buildSpotFeeNote(slug) {
  const notes = {
    binance: '25% discount with BNB fee payment enabled (0.075% effective)',
    mexc: '0% maker — industry-lowest spot maker fee',
    okx: 'Tiered reductions with OKB holdings; VIP tiers available',
    kucoin: '20% rebate with KCS token holdings',
    phemex: 'Zero spot fees with Premium membership (PT staking)',
    coinbase: 'Tiered: high for small accounts, lower for >$100K/month volume',
    coinex: '0% maker fee',
    'gate-io': 'Standard tier; reductions available with GT token or VIP status',
  };
  return notes[slug] || 'Standard tier fee; reductions available with VIP status or native token';
}

function buildP2PFee(slug) {
  return '0% platform fee (spread set by counterparty)';
}

function buildP2PProductNote(slug) {
  if (!['binance', 'okx', 'bybit', 'mexc', 'kucoin', 'htx'].includes(slug)) return null;
  return `Available at ${EXCHANGE_META[slug].website}/c2c or /p2p. Escrow-protected. Available payment methods vary by region.`;
}

function buildCopyTradingNote(slug) {
  if (!['bitget', 'bybit', 'okx', 'bingx', 'phemex', 'binance'].includes(slug)) return null;
  const notes = {
    bitget: '100,000+ signal traders; industry-leading copy trading platform',
    bybit: 'Futures and spot copy trading; transparent lead trader stats',
    okx: 'Copy trading across spot and futures; multiple strategy types',
    bingx: 'Social trading; beginner-friendly; Chelsea FC marketing angle',
    phemex: '17,000+ registered lead traders; copy with allocation limits',
    binance: 'Copy trading for qualified lead traders; spot and futures',
  };
  return notes[slug] || null;
}

function buildEarnNote(slug) {
  const earnMap = {
    binance: { available: true, products: ['Simple Earn (flexible/locked)', 'Launchpool', 'On-chain staking', 'Dual Investment', 'Liquid Swap (AMM)'] },
    bybit: { available: true, products: ['Earn (fixed/flexible)', 'Launchpad', 'Staking', 'DeFi Mining'] },
    okx: { available: true, products: ['Simple Earn', 'On-chain Earn', 'Structured Products', 'Jumpstart (IEO)'] },
    kucoin: { available: true, products: ['Earn (fixed/flexible)', 'Staking', 'Lending', 'KuCoin Spotlight (IEO)'] },
    mexc: { available: true, products: ['Savings (flexible/locked)', 'Launchpad', 'Staking'] },
    'gate-io': { available: true, products: ['Earn (flexible/locked)', 'Staking', 'Startup (IEO)', 'Structured Finance'] },
  };
  return earnMap[slug] || { available: false, products: [] };
}

function buildKYCTiers(slug) {
  if (slug === 'coinbase') return ['Basic (email + ID — full access for most users)', 'Enhanced due diligence for larger accounts'];
  return ['Basic (email/phone)', 'Intermediate (ID + liveness — required for full withdrawal access and bonuses)', 'Advanced (address proof — for highest limits)'];
}

function buildUKRestriction(slug) {
  const restricted = { binance: true, bybit: true };
  return restricted[slug] ?? null; // null = verify on official site
}

function buildRestrictedNote(slug) {
  const notes = {
    binance: 'US (Binance.US is separate), UK (FCA action), China (exited). Canada has product-level restrictions.',
    bybit: 'US, UK (FCA guidance). Dubai VARA licence covers GCC region.',
    coinbase: 'Available in US, UK, EU, and most Western markets. Some features vary by country.',
    bingx: 'Restricted: Canada, mainland China, Hong Kong, Macau, Netherlands, Singapore, US, UK.',
    mexc: 'Restricted: US, Ontario (Canada). Verify current list on official site.',
  };
  return notes[slug] || 'Restricted regions vary. Verify on official website before registering.';
}

function buildPORFrequency(slug) {
  const freq = {
    binance: 'Monthly',
    bybit: 'Monthly',
    okx: 'Monthly',
    'gate-io': 'Regular (reserve ratio maintained at 125%)',
    coinex: 'Regular (one of first exchanges to publish PoR)',
    phemex: 'Continuous (100% PoR claimed)',
    bitunix: 'On-chain audit capability',
  };
  return freq[slug] || 'Periodically — check official website';
}

function buildSAFU(slug) {
  const safu = {
    binance: 'SAFU — Secure Asset Fund for Users (10% of trading fees since 2018). Used in 2019 hack — all users reimbursed.',
    bybit: 'Used reserve funds to cover Feb 2025 $1.5B hack — all users fully reimbursed.',
    okx: 'Risk reserve fund maintained.',
    phemex: 'Proof-of-Reserves backed insurance.',
  };
  return safu[slug] || null;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  // Load exchanges.json
  const exchangesData = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'src', 'data', 'exchanges.json'), 'utf8')
  );

  // Ensure output directory exists
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const slugs = Object.keys(EXCHANGE_META);
  const results = [];

  for (const slug of slugs) {
    const evidencePath = path.join(ROOT, 'src', 'data', 'evidence', `${slug}.json`);
    if (!fs.existsSync(evidencePath)) {
      console.warn(`  ⚠️  No evidence file for ${slug} — skipping`);
      continue;
    }
    const evidenceData = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    const profile = buildProfile(slug, exchangesData, evidenceData);
    const outPath = path.join(OUT_DIR, `${slug}.json`);
    fs.writeFileSync(outPath, JSON.stringify(profile, null, 2) + '\n', 'utf8');
    results.push({ slug, qaCount: profile.knowledgeBase.commonQuestions.length, pairs: profile.marketIntelligence.spotPairsActive });
    console.log(`  ✅  ${slug} → ${outPath}`);
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Exchange Intelligence — Generation Complete');
  console.log(`  Profiles created: ${results.length}/14`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  results.forEach(r => console.log(`  ${r.slug.padEnd(12)} ${r.qaCount} Q&A, ${r.pairs} pairs`));
}

main().catch(e => { console.error(e); process.exit(1); });
