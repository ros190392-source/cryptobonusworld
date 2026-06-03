import type { RouteMap } from './types.js';

export const routes: RouteMap = {
  registration: {
    url: 'https://www.mexc.com/register',
    safety: 'PUBLIC',
    fullPage: false,
    waitForSelector: 'input[type="email"]',
    waitForTimeout: 1000,
    priority: 1,
    annotationPreset: 'registration-flow',
    expectedSelectors: ['input[type="email"]'],
    notes: 'MEXC registration page — capture the sign-up form',
  },

  bonus: {
    url: 'https://www.mexc.com/en-US/activity',
    safety: 'PUBLIC',
    fullPage: false,
    waitForSelector: '[class*="activity"]',
    waitForTimeout: 1500,
    priority: 1,
    annotationPreset: 'bonus-highlight',
    notes: 'MEXC activity/bonus landing page',
  },

  fees: {
    url: 'https://www.mexc.com/fee',
    safety: 'PUBLIC',
    fullPage: true,
    waitForSelector: 'table',
    waitForTimeout: 1000,
    priority: 1,
    annotationPreset: 'fee-table',
    expectedSelectors: ['table'],
    notes: 'MEXC fee schedule page',
  },

  spot: {
    url: 'https://www.mexc.com/exchange/BTC_USDT',
    safety: 'PUBLIC',
    fullPage: false,
    waitForSelector: '[class*="chart"]',
    waitForTimeout: 3000,
    priority: 2,
    annotationPreset: 'trading-interface',
    notes: 'MEXC spot trading interface — wait for chart to render',
  },

  futures: {
    url: 'https://futures.mexc.com/exchange/BTC_USDT',
    safety: 'PUBLIC',
    fullPage: false,
    waitForSelector: '[class*="chart"]',
    waitForTimeout: 3000,
    priority: 2,
    annotationPreset: 'futures-interface',
    notes: 'MEXC futures trading interface — wait for chart to render',
  },

  p2p: {
    url: 'https://www.mexc.com/p2p',
    safety: 'PUBLIC',
    fullPage: false,
    waitForSelector: '[class*="p2p"]',
    waitForTimeout: 2000,
    blurSelectors: ['[class*="user-name"]', '[class*="merchant"]'],
    priority: 3,
    notes: 'MEXC P2P marketplace — blur user/merchant names for privacy',
  },

  deposit: {
    url: 'https://www.mexc.com/assets/deposit',
    safety: 'AUTHED',
    requiresAuth: true,
    fullPage: false,
    waitForSelector: '[class*="deposit"]',
    waitForTimeout: 2000,
    blurSelectors: ['[class*="address"]', 'canvas', 'input[readonly]'],
    priority: 2,
    notes: 'MEXC deposit page — requires auth session, blur address fields',
  },

  mobile_app: {
    url: 'https://apps.apple.com/us/app/mexc-buy-sell-crypto-bitcoin/id1581119500',
    safety: 'PUBLIC',
    fullPage: false,
    waitForSelector: '[class*="app-header"]',
    waitForTimeout: 2000,
    viewport: { width: 390, height: 844 },
    priority: 3,
    notes: 'MEXC App Store listing at mobile viewport',
  },

  kyc: {
    safety: 'SKIP',
    skipReason: 'not_applicable',
    notes: 'KYC not required on MEXC',
  },

  proof_of_reserves: {
    safety: 'SKIP',
    skipReason: 'not_applicable',
    notes: 'PoR not published on MEXC',
  },
};
