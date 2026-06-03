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
};
