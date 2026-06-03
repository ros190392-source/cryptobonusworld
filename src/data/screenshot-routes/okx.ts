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

  bonus_referral_landing: {
    // URL sourced from AFFILIATE_SNAPSHOT.okx.affiliateUrl at runtime
    url: 'https://okx.com/join/CRYPTOBONUSW',
    safety: 'AFFILIATE_PUBLIC',
    fullPage: false,
    waitForSelector: 'h1, [class*="referral"], [class*="bonus"], [class*="register"], input[type="email"]',
    waitForTimeout: 3500,
    priority: 1,
    notes: 'OKX affiliate referral landing — path-embedded code /CRYPTOBONUSW, tracks survival and bonus visibility (up to 5,000 USDT)',
  },

  kyc_info: {
    url: 'https://www.okx.com/help/section/faq-kyc',
    safety: 'PUBLIC',
    fullPage: false,
    waitForSelector: 'h1, [class*="article"], [class*="faq"], [class*="help"]',
    waitForTimeout: 2000,
    priority: 3,
    notes: 'Public OKX help section for KYC FAQ — zero personal data',
  },

  kyc_status_safe: {
    url: 'https://www.okx.com/account/identity-verification',
    safety: 'AUTH_SAFE',
    requiresAuth: true,
    fullPage: false,
    waitForSelector: '[class*="verification"], [class*="kyc-level"], h1',
    waitForTimeout: 3000,
    blurSelectors: [
      '[class*="email" i]', '[class*="phone" i]', '[class*="uid" i]',
      '[class*="user-name" i]', '[class*="account-info" i]',
    ],
    forbiddenSelectors: [
      '[class*="document" i][class*="upload" i]', '[class*="id-card" i][class*="upload" i]',
      '[class*="passport" i][class*="submit" i]', '[class*="selfie" i]',
    ],
    priority: 2,
    notes: 'OKX KYC verification level — shows tier only, personal fields blurred, document upload screens abort',
  },

  registration_mobile: {
    url: 'https://www.okx.com/join',
    safety: 'PUBLIC',
    device: 'mobile-web',
    fullPage: false,
    waitForSelector: 'input[type="email"], input[type="text"], h1',
    waitForTimeout: 2000,
    priority: 2,
    notes: 'OKX registration at 390×844 with iPhone Safari UA — mobile-responsive layout',
  },
};
