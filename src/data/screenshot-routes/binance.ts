import type { RouteMap } from './types.js';

export const routes: RouteMap = {
  registration: {
    url: 'https://accounts.binance.com/en/register',
    safety: 'PUBLIC',
    fullPage: false,
    waitForSelector: 'input[name="email"]',
    waitForTimeout: 1000,
    priority: 1,
    annotationPreset: 'registration-flow',
    expectedSelectors: ['input[name="email"]'],
    notes: 'Registration page — capture the email input form',
  },

  bonus: {
    url: 'https://www.binance.com/en/activity/referral-entry',
    safety: 'PUBLIC',
    fullPage: false,
    waitForSelector: '[class*="referral"]',
    waitForTimeout: 1500,
    priority: 1,
    annotationPreset: 'bonus-highlight',
    notes: 'Referral/bonus landing page',
  },

  fees: {
    url: 'https://www.binance.com/en/fee/schedule',
    safety: 'PUBLIC',
    fullPage: true,
    waitForSelector: 'table',
    waitForTimeout: 1000,
    priority: 1,
    annotationPreset: 'fee-table',
    expectedSelectors: ['table'],
    notes: 'Fee schedule page — requires table to be present',
  },

  proof_of_reserves: {
    url: 'https://www.binance.com/en/proof-of-reserves',
    safety: 'PUBLIC',
    fullPage: false,
    waitForSelector: '[class*="reserves"]',
    waitForTimeout: 2000,
    priority: 2,
    notes: 'Proof of reserves public dashboard',
  },

  spot: {
    url: 'https://www.binance.com/en/trade/BTC_USDT',
    safety: 'PUBLIC',
    fullPage: false,
    waitForSelector: '[class*="chart"]',
    waitForTimeout: 3000,
    priority: 2,
    annotationPreset: 'trading-interface',
    notes: 'Spot trading interface — wait for chart to render',
  },

  futures: {
    url: 'https://www.binance.com/en/futures/BTCUSDT',
    safety: 'PUBLIC',
    fullPage: false,
    waitForSelector: '[class*="chart"]',
    waitForTimeout: 3000,
    priority: 2,
    annotationPreset: 'futures-interface',
    notes: 'Futures trading interface — wait for chart to render',
  },

  p2p: {
    url: 'https://p2p.binance.com/en/trade/all-payments/USDT',
    safety: 'PUBLIC',
    fullPage: false,
    waitForSelector: '[class*="merchant"]',
    waitForTimeout: 2000,
    blurSelectors: ['[class*="merchant-name"]', '[class*="nickName"]', '[class*="userName"]'],
    priority: 3,
    notes: 'P2P marketplace — blur merchant names for privacy',
  },

  deposit: {
    url: 'https://www.binance.com/en/my/wallet/account/main/deposit/crypto/BTC',
    safety: 'AUTHED',
    requiresAuth: true,
    fullPage: false,
    waitForSelector: '[class*="deposit"]',
    waitForTimeout: 2000,
    blurSelectors: ['[class*="address"]', 'canvas', 'input[readonly]', '[class*="balance"]', '[class*="amount"]'],
    priority: 2,
    notes: 'Deposit page — requires auth session, blur address and balance fields',
  },

  mobile_app: {
    url: 'https://apps.apple.com/us/app/binance-buy-bitcoin-crypto/id1436799971',
    safety: 'PUBLIC',
    fullPage: false,
    waitForSelector: '[class*="app-header"]',
    waitForTimeout: 2000,
    viewport: { width: 390, height: 844 },
    priority: 3,
    notes: 'App Store listing at mobile viewport',
  },

  kyc: {
    safety: 'SKIP',
    skipReason: 'identity_documents',
    notes: 'KYC flow involves identity document upload — never automate',
  },

  bonus_referral_landing: {
    // URL sourced from AFFILIATE_SNAPSHOT.binance.affiliateUrl at runtime
    url: 'https://www.binance.com/join?ref=CRYPTOBONUSW',
    safety: 'AFFILIATE_PUBLIC',
    fullPage: false,
    waitForSelector: 'h1, [class*="referral"], [class*="bonus"], [class*="register"], input[type="email"]',
    waitForTimeout: 3500,
    priority: 1,
    notes: 'Affiliate referral landing — tracks ref=CRYPTOBONUSW survival and bonus amount visibility (up to 19,800 USDT)',
  },

  kyc_info: {
    url: 'https://www.binance.com/en/support/faq/how-to-complete-identity-verification-360027287111',
    safety: 'PUBLIC',
    fullPage: false,
    waitForSelector: 'article, [class*="article-content"], h1, [class*="faq"]',
    waitForTimeout: 2000,
    priority: 3,
    notes: 'Public Binance support article explaining KYC process — zero personal data',
  },

  kyc_status_safe: {
    url: 'https://www.binance.com/en/my/settings/profile',
    safety: 'AUTH_SAFE',
    requiresAuth: true,
    fullPage: false,
    waitForSelector: '[class*="verification-level"], [class*="identity-verify"], [class*="kyc"]',
    waitForTimeout: 3000,
    blurSelectors: [
      '[class*="email" i]', '[class*="phone" i]', '[class*="real-name" i]',
      '[class*="uid" i]', '[class*="user-info" i]', '[class*="profile-info" i]',
    ],
    forbiddenSelectors: [
      '[class*="document-upload" i]', '[class*="id-upload" i]',
      '[class*="passport" i]:not([class*="support" i])',
      '[class*="driving-license" i]', '[class*="id-card-upload" i]',
    ],
    priority: 2,
    notes: 'KYC verification status (level 1/2/3) — personal fields blurred, document screens abort capture',
  },

  registration_mobile: {
    url: 'https://accounts.binance.com/en/register',
    safety: 'PUBLIC',
    device: 'mobile-web',
    fullPage: false,
    waitForSelector: 'input[name="email"], input[type="email"], h1',
    waitForTimeout: 2000,
    priority: 2,
    notes: 'Binance registration at 390×844 with iPhone Safari UA — mobile-responsive layout',
  },
};
