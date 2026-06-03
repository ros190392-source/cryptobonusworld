import type { RouteMap } from './types.js';

export const routes: RouteMap = {
  registration: {
    url: 'https://www.okx.com/join',
    safety: 'PUBLIC',
    fullPage: false,
    waitForSelector: 'input[type="email"]',
    waitForTimeout: 1000,
    priority: 1,
    annotationPreset: 'registration-flow',
    expectedSelectors: ['input[type="email"]'],
    notes: 'OKX registration page — capture the sign-up form',
  },

  bonus: {
    url: 'https://www.okx.com/campaigns/new-user',
    safety: 'PUBLIC',
    fullPage: false,
    waitForSelector: '[class*="campaign"]',
    waitForTimeout: 1500,
    priority: 1,
    annotationPreset: 'bonus-highlight',
    notes: 'New user bonus/campaign landing page',
  },

  fees: {
    url: 'https://www.okx.com/fees',
    safety: 'PUBLIC',
    fullPage: true,
    waitForSelector: 'table',
    waitForTimeout: 1000,
    priority: 1,
    annotationPreset: 'fee-table',
    expectedSelectors: ['table'],
    notes: 'OKX fee schedule page',
  },

  proof_of_reserves: {
    url: 'https://www.okx.com/proof-of-reserves',
    safety: 'PUBLIC',
    fullPage: false,
    waitForSelector: '[class*="reserve"]',
    waitForTimeout: 2000,
    priority: 2,
    notes: 'OKX proof of reserves public dashboard',
  },

  spot: {
    url: 'https://www.okx.com/trade-spot/btc-usdt',
    safety: 'PUBLIC',
    fullPage: false,
    waitForSelector: '[class*="chart"]',
    waitForTimeout: 3000,
    priority: 2,
    annotationPreset: 'trading-interface',
    notes: 'OKX spot trading interface — wait for chart to render',
  },

  futures: {
    url: 'https://www.okx.com/trade-futures/btc-usdt-swap',
    safety: 'PUBLIC',
    fullPage: false,
    waitForSelector: '[class*="chart"]',
    waitForTimeout: 3000,
    priority: 2,
    annotationPreset: 'futures-interface',
    notes: 'OKX futures/swap trading interface — wait for chart to render',
  },

  deposit: {
    url: 'https://www.okx.com/balance/recharge',
    safety: 'AUTHED',
    requiresAuth: true,
    fullPage: false,
    waitForSelector: '[class*="deposit"]',
    waitForTimeout: 2000,
    blurSelectors: ['[class*="address"]', 'canvas', 'input[readonly]', '[class*="balance"]'],
    priority: 2,
    notes: 'OKX deposit page — requires auth session, blur address and balance',
  },

  mobile_app: {
    url: 'https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470',
    safety: 'PUBLIC',
    fullPage: false,
    waitForSelector: '[class*="app-header"]',
    waitForTimeout: 2000,
    viewport: { width: 390, height: 844 },
    priority: 3,
    notes: 'OKX App Store listing at mobile viewport',
  },

  kyc: {
    safety: 'SKIP',
    skipReason: 'identity_documents',
    notes: 'KYC flow involves identity document upload — never automate',
  },

  p2p: {
    safety: 'MANUAL',
    notes: 'OKX P2P availability varies by region',
  },
};
