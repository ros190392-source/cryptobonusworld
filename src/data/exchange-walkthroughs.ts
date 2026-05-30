/**
 * exchange-walkthroughs.ts
 *
 * Editorial walkthrough data for key exchange pages.
 * Each exchange has multiple "flows" (account creation, KYC, deposit, P2P, etc.).
 * Steps are written in beginner-friendly editorial tone with real-world warnings.
 *
 * Screenshot fields (src) are initially empty — filled once real screenshots
 * are captured. Until then, WalkthroughStepImage renders a clean placeholder
 * with exact dimensions preserved (no CLS).
 *
 * Maintained by: CryptoBonusWorld Editorial Team
 * Last reviewed: 2026-05
 */

export type WalkthroughDevice = 'desktop' | 'mobile' | 'none';

export interface WalkthroughStep {
  title: string;
  description: string;
  /** Screenshot source path — leave empty until real screenshot is taken */
  src?: string;
  /** Descriptive alt text for SEO + accessibility */
  alt?: string;
  /** Image caption */
  caption?: string;
  /** "YYYY-MM" — shown as "Updated May 2026" badge on screenshot */
  capturedAt?: string;
  device?: WalkthroughDevice;
  aspectRatio?: string;
  /**
   * Pixel width of the screenshot — required for CLS prevention when src is set.
   * Matches MEDIA_DIMENSIONS: desktop=1280, guide-step=800, mobile=390
   */
  width?: number;
  /**
   * Pixel height of the screenshot — required for CLS prevention when src is set.
   * Matches MEDIA_DIMENSIONS: desktop=720, guide-step=500, mobile=844
   */
  height?: number;
  /** Orange callout — critical warning */
  warning?: string;
  /** Green callout — pro tip */
  tip?: string;
  /** Blue callout — regional note */
  region?: string;
  /** Gold bar — what to expect after this step */
  whatHappensNext?: string;
  /** "Where to click" location hint for the screen */
  locationHint?: string;
  /** Media category tag for screenshot captions */
  mediaCategory?: string;
  /** Label shown on placeholder image */
  screenshotLabel?: string;
}

export interface WalkthroughFlow {
  id: string;
  title: string;
  description: string;
  stepCount: number;
  steps: WalkthroughStep[];
  /** "YYYY-MM" — last time editorial team visually verified this flow */
  lastVerified: string;
  /** CTA shown at the end of the flow */
  cta?: {
    body: string;
    label: string;
  };
}

export interface ExchangeWalkthrough {
  slug: string;
  flows: WalkthroughFlow[];
}

// ── BYBIT ──────────────────────────────────────────────────────────────────────

const bybit: ExchangeWalkthrough = {
  slug: 'bybit',
  flows: [
    {
      id: 'bybit-account-creation',
      title: 'How to Create a Bybit Account',
      description: 'Full account registration walkthrough via referral link. Includes email verification, password setup, security configuration and bonus activation. Takes around 5 minutes.',
      lastVerified: '2026-05',
      stepCount: 8,
      cta: {
        body: 'Account setup takes under 5 minutes. New users qualify for up to $30,000 in welcome rewards immediately after registration via referral link.',
        label: 'Create Bybit account',
      },
      steps: [
        {
          title: 'Open the Bybit referral page',
          description: 'Click the registration link from CryptoBonusWorld. You land directly on the Bybit bonus page — the referral code <strong>CRYPTOBONUSW</strong> is already entered and confirmed (green tick). You do not need to type it manually. The bonus table on the left shows rewards from $50 up to $30,000 depending on your deposit and trading volume.',
          src: '/media/walkthroughs/bybit/bybit-step-01.jpg',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '16/9',
          alt: 'Bybit referral landing page showing welcome bonus up to $30,000 with registration form and CRYPTOBONUSW referral code pre-filled',
          mediaCategory: 'Sign Up',
          tip: 'Using a referral link is the only way to unlock the full $30,000 welcome bonus. Direct registration without a referral code gives a significantly smaller reward.',
          whatHappensNext: 'Enter your email address in the form on the right, then click Get My Welcome Gifts.',
        },
        {
          title: 'Enter your email and complete the security check',
          description: 'Type your email address in the <strong>Email/Mobile Number</strong> field. The referral code <strong>CRYPTOBONUSW</strong> is already filled in — do not change it. Click <strong>Get My Welcome Gifts</strong>. A puzzle slider overlay appears: drag the arrow piece to the right until the image aligns.',
          src: '/media/walkthroughs/bybit/bybit-step-02.jpg',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '16/9',
          alt: 'Bybit registration form with email entered and security puzzle slider overlay requiring drag to complete',
          mediaCategory: 'Sign Up',
          warning: 'Do not change or clear the referral code field. If you accidentally delete it, type <strong>CRYPTOBONUSW</strong> exactly before clicking the button.',
          tip: 'The security puzzle takes 2 seconds — just slide the arrow to the right until the pieces lock. It is not a skill test.',
          whatHappensNext: 'Bybit sends a 6-digit verification code to your email. The code is valid for 5 minutes.',
        },
        {
          title: 'Enter the email verification code',
          description: 'Check your inbox for an email from Bybit with a 6-digit code. Enter the digits one by one in the boxes shown on screen. The code is valid for <strong>5 minutes</strong>. If it expires, use the <strong>Resend</strong> button. A countdown timer is shown next to the Resend link.',
          src: '/media/walkthroughs/bybit/bybit-step-03.jpg',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '16/9',
          alt: 'Bybit email verification screen showing 6-digit code input boxes with countdown timer and Resend link',
          mediaCategory: 'Sign Up',
          tip: 'If the email does not arrive within 2 minutes, check your spam folder. You can also click <strong>Modify</strong> next to your email address if you made a typo.',
          whatHappensNext: 'The password creation screen appears immediately after the last digit is entered.',
        },
        {
          title: 'Create your password',
          description: 'Enter a strong password in the <strong>Create Password</strong> field. Bybit requires 8–30 characters with at least one uppercase letter, one lowercase letter, and one number. All four requirements are shown with green checkmarks as you type. Click <strong>Get My Welcome Gifts</strong> to complete registration.',
          src: '/media/walkthroughs/bybit/bybit-step-04.jpg',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '16/9',
          alt: 'Bybit Create Password screen showing password input field with four green requirement checkmarks and Get My Welcome Gifts button',
          mediaCategory: 'Sign Up',
          warning: 'Save your password in a password manager (Bitwarden, 1Password) immediately. Bybit account recovery without your password and 2FA can take several days.',
          whatHappensNext: 'Your account is created. You are logged into the Bybit dashboard. Head to Account → Security to protect it before depositing.',
        },
        {
          title: 'Activate your anti-phishing code',
          description: 'Go to <strong>Account → Security</strong> in the left sidebar, then click <strong>Settings</strong> next to Anti-phishing Code. Bybit immediately shows a popup with an auto-generated code (e.g. <em>En8iuf_l</em>). You can use it as-is or click <strong>Customize Code</strong> to set your own memorable phrase. Click <strong>Activate Code</strong>. From this point, every legitimate Bybit email will include this code — any email without it is a phishing attempt.',
          src: '/media/walkthroughs/bybit/bybit-step-05v2.jpg',
          alt: 'Bybit Anti-phishing Code popup showing auto-generated code En8iuf_l with Activate Code and Customize Code buttons',
          device: 'desktop',
          aspectRatio: '16/9',
          mediaCategory: 'Security',
          locationHint: 'Left sidebar → Account → Security → Anti-phishing Code → Settings',
          tip: 'Click <strong>Customize Code</strong> and set a short phrase you will recognise — something like "BYBIT26". A code you know by heart is easier to notice when it is missing.',
          whatHappensNext: 'Code activates in seconds. Next step: set up Google 2FA for full account protection.',
        },
        {
          title: 'Set up Google Two-Factor Authentication',
          description: 'Back on the Security page, click <strong>Settings</strong> next to Google Two-Factor Authentication. Download <strong>Authy</strong> or <strong>Google Authenticator</strong> on your phone, scan the QR code Bybit shows, and enter the 6-digit code to confirm. Save your backup key offline — this is the only way to recover 2FA access if you lose your phone.',
          src: '/media/walkthroughs/bybit/bybit-step-06v2.jpg',
          alt: 'Bybit Security page with Security Verification popup and arrow pointing to Google Two Factor Authentication',
          device: 'desktop',
          aspectRatio: '16/9',
          mediaCategory: 'Security',
          locationHint: 'Left sidebar → Account → Security → Google Two-Factor Authentication → Settings',
          tip: 'Use <strong>Authy</strong> rather than Google Authenticator — Authy supports encrypted cloud backup so you won\'t lose access if you change phones.',
          warning: 'Write your backup key on paper and store it somewhere safe. Anyone with this key can access your 2FA codes.',
          whatHappensNext: 'Your account is now fully secured. Head to Rewards Hub to start your welcome bonus tasks.',
        },
        {
          title: 'Open Rewards Hub and start your welcome tasks',
          description: 'Click <strong>Rewards Hub</strong> in the top navigation bar. The welcome campaign shows <strong>100 USDT Welcome Gifts + NVDAX</strong> with three tasks: 1) Complete Identity Verification (Earn 20 USDT), 2) Deposit ≥ $100 (Earn 20 USDT), 3) Deposit ≥ $100 and Trade ≥ $10 (Earn 20 USDT). Click each task button to begin.',
          src: '/media/walkthroughs/bybit/bybit-step-07.jpg',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '16/9',
          alt: 'Bybit Rewards Hub showing 100 USDT Welcome Gifts campaign with three tasks: Verify, Deposit and Trade, each worth 20 USDT',
          mediaCategory: 'Bonus Center',
          locationHint: 'Top nav → Rewards Hub',
          tip: 'Complete the tasks in order: Identity Verification first, then deposit, then trade. Each task unlocks the next.',
          whatHappensNext: 'Scroll down to see the larger 30,000 USDT tiered deposit rewards and the New Users Zone staking bonus.',
        },
        {
          title: 'Explore the 30,000 USDT deposit rewards',
          description: 'Scroll down in Rewards Hub to see the <strong>30,000 USDT Deposit Blast-Off Rewards</strong> section. This is a tiered bonus: deposit $500+ and trade $100k+ to unlock derivatives bonuses up to 30,000 USDT. The <strong>New Users Zone</strong> below it offers a +300% APR booster for staking ≥ 100 USDT in Savings for 10 days.',
          src: '/media/walkthroughs/bybit/bybit-step-08.jpg',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '16/9',
          alt: 'Bybit Rewards Hub showing 30,000 USDT Deposit Blast-Off tiered rewards section and New Users Zone 300% APR staking offer',
          mediaCategory: 'Bonus Center',
          tip: 'The deposit bonuses are cumulative — you do not have to aim for $30,000 immediately. Even a $100 deposit + small trade qualifies for early reward tiers.',
          warning: 'The 30,000 USDT figure is the maximum theoretical bonus and requires very large deposits and trading volumes. Most new users realistically earn $50–$200 in the first month.',
          whatHappensNext: 'Your account is fully set up, secured and bonus tasks are active. Fund your account via P2P, crypto transfer or bank card to start earning rewards.',
        },
      ],
    },
    {
      id: 'bybit-p2p-purchase',
      title: 'How to Buy Crypto on Bybit P2P',
      description: 'Step-by-step guide to buying USDT with a bank transfer or mobile payment using Bybit P2P. Zero fees, escrow protection, 100+ payment methods. Screenshots show a real purchase of 55.97 USDT for 2,500 UAH (Ukrainian hryvnia) via Monobank card — the flow is identical for any other currency or payment method.',
      lastVerified: '2026-05',
      stepCount: 8,
      cta: {
        body: 'P2P on Bybit is fee-free. The escrow system locks the seller\'s crypto before you pay — your funds are safe.',
        label: 'Start P2P on Bybit',
      },
      steps: [
        {
          title: 'Open Buy Crypto → P2P Trading',
          description: 'Click <strong>Buy Crypto</strong> in the top navigation bar. A dropdown opens — select <strong>P2P Trading (0 Fees)</strong> at the top of the list. This takes you to the live P2P marketplace with sellers listed by price.',
          src: '/media/walkthroughs/bybit/bybit-p2p-01.jpg',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '16/9',
          alt: 'Bybit Buy Crypto dropdown menu showing P2P Trading (0 Fees) option highlighted',
          mediaCategory: 'P2P',
          locationHint: 'Top nav → Buy Crypto → P2P Trading (0 Fees)',
          whatHappensNext: 'The P2P marketplace loads with a list of sellers, their prices, available amounts and payment methods.',
        },
        {
          title: 'Select your currency and browse sellers',
          description: 'On the P2P page, make sure <strong>Buy</strong> and <strong>USDT</strong> are selected. Click the currency dropdown and choose your local currency (USD, EUR, UAH, etc.). The seller list filters automatically. You will see each seller\'s price, available amount and accepted payment methods.',
          src: '/media/walkthroughs/bybit/bybit-p2p-02.jpg',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '16/9',
          alt: 'Bybit P2P marketplace showing currency dropdown open with seller list filtered by USD',
          mediaCategory: 'P2P',
          tip: 'Sort by <strong>Best Price</strong> to get the cheapest rate. Stick to sellers with the <strong>Fast Release</strong> badge — they release crypto within minutes of payment confirmation.',
        },
        {
          title: 'Check the seller\'s profile before buying',
          description: 'Click a seller\'s username to open their profile. Check: <strong>Completion Rate</strong> (aim for 95%+), <strong>Total Orders</strong> (200+ is reliable), <strong>Average Release Time</strong> (under 5 minutes is ideal), and their <strong>Good Rating %</strong>. This takes 30 seconds and prevents most scam risk.',
          src: '/media/walkthroughs/bybit/bybit-p2p-03.jpg',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '16/9',
          alt: 'Bybit P2P seller profile showing completion rate 95%, 458 total orders, 100% good rating and 4 minute average release time',
          mediaCategory: 'P2P',
          tip: 'A seller with 458 total orders, 95% completion and 4-minute release time (like shown) is highly reliable. New sellers with under 50 trades carry more risk.',
          warning: 'Never communicate with the seller outside the Bybit chat. Bybit cannot protect you from scams conducted through external messaging apps.',
        },
        {
          title: 'Place the order and get payment details',
          description: 'Go back to the seller\'s listing, enter the amount in your local currency, and click <strong>Buy USDT</strong>. The order is created instantly — the seller\'s crypto is locked in Bybit escrow. The screen now shows the exact payment details: bank name, account holder name, card number, and the exact amount to transfer. A <strong>countdown timer</strong> shows your deadline (typically 30 minutes).',
          src: '/media/walkthroughs/bybit/bybit-p2p-04-b2fcdd4f.png',
          capturedAt: '2026-05',
          device: 'none',
          aspectRatio: '16/9',
          alt: 'Bybit P2P active order showing Pending for Payment status with seller bank details, exact amount in UAH and countdown timer',
          mediaCategory: 'P2P',
          region: 'Example shown: buying 55.97 USDT for 2,500 UAH (Ukrainian hryvnia) via Monobank card. The screen layout is identical for EUR, USD, TRY, INR or any other currency — only the currency symbol and payment method name differ.',
          warning: 'Transfer the <strong>exact amount</strong> shown — do not round up or down. Write nothing in the bank transfer reference/description field. Never mention "crypto", "USDT" or "Bybit".',
          whatHappensNext: 'Open your banking app and complete the transfer to the seller\'s card. Come back to Bybit before clicking anything.',
        },
        {
          title: 'Send the money via your banking app',
          description: 'Open your banking app (Monobank, PrivatBank, Revolut, or any other) and transfer the <strong>exact amount</strong> to the card number shown in the Bybit order. In the example: 2,500 UAH sent to Denys K. via Monobank card transfer at 15:02. The transfer completes instantly. Save the receipt — you may need it as proof of payment.',
          src: '/media/walkthroughs/bybit/monobank-send-2500-griven.jpg',
          capturedAt: '2026-05',
          device: 'mobile',
          aspectRatio: '3/2',
          alt: 'Monobank mobile app showing completed card transfer of 2500 UAH to P2P seller Denys K.',
          mediaCategory: 'P2P',
          warning: 'Do not add any notes or descriptions to the bank transfer. Leave the comment/reference field completely empty. Writing "USDT", "crypto" or "Bybit" can trigger a bank compliance block.',
          tip: 'Screenshot the payment confirmation screen from your banking app before going back to Bybit. This is your evidence if any dispute arises.',
          whatHappensNext: 'Go back to the Bybit P2P order page and confirm that you have sent the payment.',
        },
        {
          title: 'Confirm your payment in Bybit',
          description: 'After completing the bank transfer, return to the Bybit order page and click <strong>Payment Completed</strong>. A confirmation popup appears — verify the card number and name match what you paid. Check both confirmation boxes and click <strong>Confirm</strong>. The seller is notified and begins verifying payment in their bank account.',
          src: '/media/walkthroughs/bybit/bybit-p2p-05v2.png',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '16/9',
          alt: 'Bybit P2P Confirm Payment popup showing seller card details, amount confirmation field and two checkbox confirmations with Confirm button',
          mediaCategory: 'P2P',
          warning: '<strong>Only click Confirm after you have actually sent the money.</strong> Clicking Confirm without paying is a violation of Bybit policy and can result in account suspension.',
          tip: 'Take a screenshot of your bank transfer receipt before confirming. If there is any dispute, this is your proof.',
          whatHappensNext: 'The order status changes to "Pending for Release". The seller verifies your payment and releases the crypto — typically within 2–10 minutes.',
        },
        {
          title: 'Pending for Release — waiting for the seller',
          description: 'After clicking <strong>Payment Completed</strong>, the order switches to <strong>Pending for Release</strong> with a countdown timer. The left panel shows your order summary: 2,500.00 UAH paid, 55.9659 USDT to receive. The chat on the right confirms: <em>"You\'ve completed the payment. Please wait for the seller to release the coins to you."</em> The seller checks their bank account and releases the crypto — usually within 2–10 minutes.',
          src: '/media/walkthroughs/bybit/p2p-10.jpg',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '16/9',
          alt: 'Bybit P2P order page showing Pending for Release status with countdown timer, order summary 2500 UAH for 55.9659 USDT, and chat confirmation that payment is complete',
          mediaCategory: 'P2P',
          tip: 'If the seller does not release crypto within 15 minutes, click <strong>Order Dispute</strong>. Bybit support takes over and typically resolves the case within 24 hours.',
          warning: 'Do not open a dispute before 15 minutes have passed unless the seller explicitly asks you to cancel — premature disputes can delay the release.',
          whatHappensNext: 'The seller verifies your payment and releases the USDT. Bybit immediately shows a success popup confirming the purchase.',
        },
        {
          title: 'Review the completed order summary',
          description: 'The <strong>Order completed</strong> page shows the full transaction record: fiat amount paid (2,500 UAH), price rate (44.67 UAH), USDT received (55.9659 USDT), order number, timestamp, payment method and the complete chat history with the seller. This is your receipt — take a screenshot if needed.',
          src: '/media/walkthroughs/bybit/bybit-p2p-07v2.jpg',
          capturedAt: '2026-05',
          device: 'mobile',
          aspectRatio: '4/5',
          alt: 'Bybit P2P success popup showing green checkmark, 2500.00 UAH paid and Congrats you\'ve bought 55.9659 USDT confirmation with View Order and View My Assets buttons',
          mediaCategory: 'P2P',
          tip: 'Newly received P2P funds may have a short security hold before withdrawal (typically 24 hours). You can trade immediately without waiting.',
          warning: 'If the seller has not released crypto within 30 minutes of your payment confirmation, use the <strong>Order Dispute</strong> link on this page. Bybit support resolves disputes within 24 hours.',
          whatHappensNext: 'Your USDT is in your Funding Account. Transfer it to your Spot wallet to trade, or to Derivatives to start futures trading.',
        },
      ],
    },
    {
      id: 'bybit-first-deposit',
      title: 'How to Deposit Crypto to Bybit',
      description: 'How to fund your Bybit account by transferring cryptocurrency from another wallet or exchange.',
      lastVerified: '2026-05',
      stepCount: 4,
      cta: {
        body: 'Bybit accepts deposits in 200+ cryptocurrencies across all major networks. USDT on TRC-20 has the lowest fees.',
        label: 'Deposit to Bybit',
      },
      steps: [
        {
          title: 'Go to Assets → Deposit',
          description: 'Click <strong>Assets</strong> in the top navigation, then <strong>Deposit</strong>. You can also find the deposit option by clicking your account balance.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'Bybit Assets and Deposit menu',
          alt: 'Bybit Assets page showing Deposit option',
          mediaCategory: 'Deposit',
          locationHint: 'Top nav → Assets → Deposit',
        },
        {
          title: 'Select the coin and network',
          description: 'Choose the cryptocurrency you want to deposit (e.g. USDT) and select the correct network. The most common networks are TRC-20 (Tron — lowest fees), ERC-20 (Ethereum — highest fees) and BEP-20 (BNB Chain).',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'Bybit deposit coin and network selection',
          alt: 'Bybit deposit page showing coin selector and network dropdown',
          mediaCategory: 'Deposit',
          warning: '<strong>Always match the network on both sides.</strong> If you send USDT on ERC-20 to a TRC-20 address, the funds will be lost permanently. Double-check the network before copying the deposit address.',
        },
        {
          title: 'Copy your Bybit deposit address',
          description: 'A unique deposit address is generated for the selected coin and network. Use the <strong>Copy</strong> button — do not type the address manually. Some coins also show a memo/tag — copy this too, it is required.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'Bybit deposit address with copy button',
          alt: 'Bybit deposit address screen with QR code and copy button',
          mediaCategory: 'Deposit',
          tip: 'After copying, paste the address in a text editor to visually confirm the first and last 4 characters match the address shown on screen. This guards against clipboard hijacking malware.',
          warning: 'If the coin requires a memo/tag (e.g. XRP, EOS), you must include both the address AND the memo. Missing the memo means the deposit may not credit to your account.',
        },
        {
          title: 'Send crypto from your source wallet',
          description: 'Go to your other exchange or wallet, initiate a withdrawal, paste the Bybit deposit address and select the same network. Confirm the transaction. Deposit processing time depends on the network: TRC-20 typically takes 1–2 minutes, ERC-20 may take 5–20 minutes.',
          device: 'mobile',
          aspectRatio: '9/16',
          screenshotLabel: 'Sending USDT from external wallet',
          alt: 'External wallet withdrawal screen with Bybit deposit address entered',
          mediaCategory: 'Deposit',
          tip: 'Send a small test amount first (e.g. 1 USDT) to confirm everything is set up correctly before sending a large amount.',
          whatHappensNext: 'The deposit appears in your Bybit Spot wallet after network confirmations. USDT on TRC-20 typically requires 20 confirmations.',
        },
      ],
    },
    {
      id: 'bybit-futures-setup',
      title: 'How to Start Futures Trading on Bybit',
      description: 'Setting up your Bybit futures account, transferring funds and placing your first trade with responsible leverage settings.',
      lastVerified: '2026-05',
      stepCount: 5,
      cta: {
        body: 'Bybit offers a testnet where you can practise with virtual funds before risking real money. We strongly recommend this for beginners.',
        label: 'Open Bybit Futures',
      },
      steps: [
        {
          title: 'Transfer funds to your Futures account',
          description: 'Bybit separates Spot and Futures wallets. Go to <strong>Assets → Transfer</strong> and move funds from your Spot wallet to your <strong>USDT Perpetual</strong> (or COIN-M) account.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'Bybit wallet transfer: Spot to Futures',
          alt: 'Bybit asset transfer page showing Spot to Unified Trading Account transfer',
          mediaCategory: 'Futures',
          locationHint: 'Assets → Transfer → From: Spot, To: Derivatives',
          tip: 'Only transfer the amount you are willing to use for futures trading. Keeping spot funds separate prevents accidental liquidation.',
        },
        {
          title: 'Open the Derivatives trading section',
          description: 'Click <strong>Derivatives</strong> in the top navigation and select <strong>USDT Perpetual</strong>. The futures trading interface opens with a chart, order book and trade panel.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'Bybit Derivatives USDT Perpetual trading page',
          alt: 'Bybit derivatives trading interface showing BTC/USDT perpetual contract',
          mediaCategory: 'Futures',
          locationHint: 'Top nav → Derivatives → USDT Perpetual',
        },
        {
          title: 'Select a trading pair and set leverage',
          description: 'Use the pair selector to choose your contract (e.g. BTCUSDT, ETHUSDT). Click the leverage multiplier button (e.g. "10×") to open the leverage slider. <strong>Beginners should use 2–5× maximum.</strong>',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'Bybit futures leverage slider',
          alt: 'Bybit futures interface showing leverage adjustment slider set to 5x',
          mediaCategory: 'Futures',
          warning: '<strong>Leverage amplifies both gains and losses.</strong> At 10× leverage, a 10% price move against your position causes 100% liquidation of your margin. Start at 2× while learning.',
          tip: 'Bybit shows your estimated liquidation price in real time as you adjust leverage. Check this before confirming any trade.',
        },
        {
          title: 'Set your stop-loss before entering',
          description: 'In the order panel, enable the <strong>TP/SL</strong> (Take Profit / Stop Loss) toggle. Set a stop-loss price that limits your downside to 1–2% of your account balance per trade. This is your risk management — do not skip it.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'Bybit futures TP/SL settings panel',
          alt: 'Bybit futures order form with Take Profit and Stop Loss fields enabled',
          mediaCategory: 'Futures',
          warning: 'Never enter a futures trade without a stop-loss in place. Without it, a sudden price move can wipe your entire futures balance in minutes.',
        },
        {
          title: 'Place your order (Long or Short)',
          description: 'Click <strong>Buy/Long</strong> if you expect the price to rise, or <strong>Sell/Short</strong> if you expect it to fall. Confirm the order size, leverage and stop-loss, then click <strong>Confirm Order</strong>.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'Bybit futures order confirmation',
          alt: 'Bybit futures order confirmation dialog showing position details',
          mediaCategory: 'Futures',
          tip: 'Use <strong>Limit orders</strong> instead of Market orders to get a better entry price. Set your limit slightly above (for longs) or below (for shorts) the current price.',
          whatHappensNext: 'Your position appears under "Positions" at the bottom of the screen. You can monitor P&L, add margin or close the position from there.',
        },
      ],
    },
  ],
};

// ── BINANCE ────────────────────────────────────────────────────────────────────

const binance: ExchangeWalkthrough = {
  slug: 'binance',
  flows: [
    {
      id: 'binance-account-creation',
      title: 'How to Create a Binance Account',
      description: 'Complete registration walkthrough for new Binance users. Includes email verification and initial security setup.',
      lastVerified: '2026-05',
      stepCount: 5,
      cta: {
        body: 'Binance is the world\'s largest exchange by trading volume. New accounts can trade spot within minutes of registration.',
        label: 'Create Binance account',
      },
      steps: [
        {
          title: 'Visit binance.com and click Register',
          description: 'Go to binance.com and click the <strong>Register</strong> button in the top-right corner. Choose to register with email or mobile number. If registering from a country with restrictions, Binance may redirect you to a regional version.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'Binance homepage with Register button',
          alt: 'Binance homepage showing Register button in top navigation bar',
          mediaCategory: 'Sign Up',
          tip: 'Use a dedicated email address for your Binance account. Avoid using a free temporary email — Binance requires ongoing access for security notifications.',
          region: 'Binance is not available to users in the United States (use Coinbase or Kraken), the UK (use alternative exchanges), and several other countries. Check Binance\'s terms of service for your region.',
        },
        {
          title: 'Enter your email and create a password',
          description: 'Enter a valid email address. Create a password that is at least 8 characters long and includes uppercase letters, lowercase letters, numbers and special characters. Confirm the password and click <strong>Create account</strong>.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'Binance registration form',
          alt: 'Binance account creation form with email and password fields',
          mediaCategory: 'Sign Up',
          warning: 'Binance will never ask for your password via email or support chat. If you receive such a request, it is a phishing attempt.',
        },
        {
          title: 'Complete the email verification',
          description: 'Binance sends a 6-digit verification code to your email. Open the email and enter the code on the verification screen. The code is valid for 30 minutes.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'Binance email verification code entry',
          alt: 'Binance email verification page showing 6-digit code input',
          mediaCategory: 'Sign Up',
          tip: 'If you do not see the email within 2 minutes, check spam/junk. You can also request a new code from the verification page.',
          whatHappensNext: 'You are logged into your Binance account. The platform prompts you to complete identity verification (KYC) to unlock full features.',
        },
        {
          title: 'Enable two-factor authentication',
          description: 'Go to <strong>Profile → Security → Two-Factor Authentication</strong>. Enable Authenticator App (recommended over SMS). Download Google Authenticator or Authy, scan the QR code, and store the backup key offline.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'Binance 2FA authenticator app setup',
          alt: 'Binance security settings page showing authenticator app QR code',
          mediaCategory: 'Security',
          warning: 'SMS-based 2FA is vulnerable to SIM swap attacks. Always use an authenticator app instead. Store your backup key in a safe place — it is the only way to recover access if you lose your phone.',
        },
        {
          title: 'Set up anti-phishing code',
          description: 'In <strong>Security settings</strong>, enable the <strong>Anti-Phishing Code</strong>. This adds a unique phrase to all legitimate Binance emails. If you receive a Binance email without this code, it is phishing.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'Binance anti-phishing code setup',
          alt: 'Binance anti-phishing code configuration screen',
          mediaCategory: 'Security',
          tip: 'Choose a memorable but non-obvious phrase like "MYTOKEN2026". This will appear in the header of every legitimate Binance email.',
          whatHappensNext: 'Your account is secure and ready. Proceed to identity verification (KYC) to unlock full trading and withdrawal limits.',
        },
      ],
    },
    {
      id: 'binance-kyc',
      title: 'Binance Identity Verification (KYC)',
      description: 'How to complete Binance identity verification to unlock higher withdrawal limits and all trading features.',
      lastVerified: '2026-05',
      stepCount: 5,
      cta: {
        body: 'KYC is required for withdrawals above $8,000/day and futures trading on Binance. The process typically takes 5–15 minutes.',
        label: 'Start Binance KYC',
      },
      steps: [
        {
          title: 'Go to Identity Verification',
          description: 'Click on your profile icon and select <strong>Identity Verification</strong>, or go to <strong>Profile → Identification</strong>. Binance shows your current verification level and available limits.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'Binance Identity Verification page',
          alt: 'Binance identity verification page showing current status and verification options',
          mediaCategory: 'KYC',
          locationHint: 'Profile icon → Identity Verification',
        },
        {
          title: 'Select your country and document type',
          description: 'Choose your country of residence from the dropdown. Select your government-issued ID type: passport, national ID card, or driver\'s license. Passport is the easiest as it has a single photo page.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'Binance KYC country and document type selection',
          alt: 'Binance KYC form showing country dropdown and document type selector',
          mediaCategory: 'KYC',
          tip: 'Use a passport if possible — it has a single, clear photo page with no address fields and is fastest to verify.',
          region: 'Some countries require additional documentation or have extended review times. Binance provides specific guidance for your region during the verification flow.',
        },
        {
          title: 'Upload clear photos of your document',
          description: 'Take photos of both sides of your ID (front and back for national ID, photo page only for passport). Requirements: good lighting, all 4 corners visible, no glare, text must be fully readable.',
          device: 'mobile',
          aspectRatio: '9/16',
          screenshotLabel: 'Binance document photo upload screen',
          alt: 'Binance KYC document upload interface on mobile showing camera capture',
          mediaCategory: 'KYC',
          warning: 'Blurry, cropped or glare-affected photos are the most common reason for KYC rejection. Take photos in natural daylight or good indoor lighting. Avoid flash.',
        },
        {
          title: 'Complete the facial recognition check',
          description: 'Binance requires a real-time facial scan. Follow the on-screen instructions: look directly at the camera, slowly turn your head left and right, and blink when prompted. This process takes about 30 seconds.',
          device: 'mobile',
          aspectRatio: '9/16',
          screenshotLabel: 'Binance facial recognition scan',
          alt: 'Binance facial verification screen showing face scan progress indicator',
          mediaCategory: 'KYC',
          tip: 'Use the front camera on your phone for the facial scan. Ensure your face is well-lit and remove glasses if possible.',
        },
        {
          title: 'Wait for verification result',
          description: 'Binance processes identity verification automatically. Most approvals take 2–15 minutes. Complex cases may take up to 24 hours and require manual review. You receive an email notification once verification is complete.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'Binance KYC submitted confirmation screen',
          alt: 'Binance identity verification submitted page showing pending status',
          mediaCategory: 'KYC',
          tip: 'You can continue using your account at the basic level while waiting for verification. Check your email for the result.',
          whatHappensNext: 'After approval, your daily withdrawal limit increases to $8,000+ and you can access all trading features including futures and P2P.',
        },
      ],
    },
    {
      id: 'binance-p2p',
      title: 'How to Buy Crypto on Binance P2P',
      description: 'Using Binance P2P to buy Bitcoin or USDT with your local bank transfer, mobile wallet or cash payment.',
      lastVerified: '2026-05',
      stepCount: 5,
      cta: {
        body: 'Binance P2P is fee-free. Over 700 payment methods are supported globally.',
        label: 'Use Binance P2P',
      },
      steps: [
        {
          title: 'Navigate to Buy Crypto → P2P Trading',
          description: 'Hover over <strong>Buy Crypto</strong> in the top navigation. In the dropdown, click <strong>P2P Trading</strong>. The P2P marketplace opens showing available sellers.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'Binance navigation Buy Crypto P2P dropdown',
          alt: 'Binance top navigation showing Buy Crypto dropdown with P2P Trading option',
          mediaCategory: 'P2P',
          locationHint: 'Top nav → Buy Crypto → P2P Trading',
        },
        {
          title: 'Filter by currency and payment method',
          description: 'Select the coin to buy (USDT recommended for beginners), your local currency, and your preferred payment method. Binance P2P supports over 700 payment methods including bank transfers, PayPal, Revolut, UPI and more.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'Binance P2P filter options',
          alt: 'Binance P2P filter panel showing currency, coin and payment method selection',
          mediaCategory: 'P2P',
          tip: 'Filter by payment method first, then sort by <strong>Price: Low to High</strong> to find the cheapest USDT rate. Focus on sellers with 98%+ completion rate and 200+ trades.',
        },
        {
          title: 'Review seller details and place the order',
          description: 'Click on a seller to see their order limits, payment time and available amount. Enter the amount you want to buy (in your local currency), then click <strong>Buy USDT</strong>.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'Binance P2P order form',
          alt: 'Binance P2P order form showing amount input and seller rating',
          mediaCategory: 'P2P',
          warning: 'Confirm the minimum and maximum order amounts shown in the listing before buying. Orders outside these limits fail automatically.',
        },
        {
          title: 'Send payment to the seller',
          description: 'The seller\'s payment details appear on screen. Complete the payment using your bank, mobile wallet or payment app. Do not add any crypto-related notes in bank transfer descriptions.',
          device: 'mobile',
          aspectRatio: '9/16',
          screenshotLabel: 'Binance P2P order with payment details',
          alt: 'Binance P2P active order page showing seller payment details',
          mediaCategory: 'P2P',
          warning: 'Only mark payment as transferred after you have actually sent the money. Never click "Transferred" before completing the bank payment.',
          tip: 'Screenshot your payment confirmation from your banking app. This is your evidence if the seller disputes receiving payment.',
        },
        {
          title: 'Click Transferred and receive crypto',
          description: 'Return to Binance and click <strong>Transferred, Notify Seller</strong>. The seller verifies payment and releases the crypto. Typical release time: 2–15 minutes.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'Binance P2P transferred button',
          alt: 'Binance P2P order confirmation page with Transferred Notify Seller button',
          mediaCategory: 'P2P',
          tip: 'If the seller has not released crypto after 30 minutes, use the <strong>Appeal</strong> button. Include your payment proof screenshot. Binance mediates within 24 hours.',
          whatHappensNext: 'Your USDT appears in your Spot wallet. You can now trade, invest in Earn products or transfer to another wallet.',
        },
      ],
    },
  ],
};

// ── MEXC ────────────────────────────────────────────────────────────────────────

const mexc: ExchangeWalkthrough = {
  slug: 'mexc',
  flows: [
    {
      id: 'mexc-account-creation',
      title: 'How to Create a MEXC Account (No KYC)',
      description: 'MEXC allows trading without identity verification. Account creation takes under 2 minutes and no ID documents are required for spot trading up to 5 BTC/day.',
      lastVerified: '2026-05',
      stepCount: 4,
      cta: {
        body: 'MEXC requires no KYC for spot trading up to 5 BTC equivalent per day — the most permissive limit among major exchanges.',
        label: 'Create MEXC account',
      },
      steps: [
        {
          title: 'Visit mexc.com and click Sign Up',
          description: 'Go to mexc.com and click the <strong>Sign Up</strong> button in the top-right corner. You can register with an email address or mobile phone number.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'MEXC homepage with Sign Up button',
          alt: 'MEXC homepage showing Sign Up button in navigation',
          mediaCategory: 'Sign Up',
          tip: 'Use the signup link from CryptoBonusWorld to ensure your referral bonus is applied. MEXC\'s referral bonus requires a specific invite code.',
        },
        {
          title: 'Enter your email and set a password',
          description: 'Enter your email address. Create a strong password (8+ characters with letters, numbers and symbols). Read and accept MEXC\'s Terms of Service and Privacy Policy, then click <strong>Sign Up</strong>.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'MEXC registration form',
          alt: 'MEXC registration form showing email and password input fields',
          mediaCategory: 'Sign Up',
        },
        {
          title: 'Verify your email address',
          description: 'MEXC sends a verification code to your email. Enter the 6-digit code on the verification screen. The code is valid for 15 minutes.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'MEXC email verification code screen',
          alt: 'MEXC email verification screen with code input field',
          mediaCategory: 'Sign Up',
          tip: 'Check spam if the email does not arrive. MEXC emails come from noreply@mexc.com.',
          whatHappensNext: 'Your account is created. You can start trading immediately — no KYC is required for standard spot trading.',
        },
        {
          title: 'Enable 2FA and receive your welcome bonus',
          description: 'Go to <strong>Account Settings → Security</strong> to enable Google Authenticator. Then check your notifications for the welcome bonus task panel — click <strong>Claim</strong> to activate the onboarding reward tasks.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'MEXC account security settings and bonus panel',
          alt: 'MEXC security settings showing 2FA option and welcome bonus notification',
          mediaCategory: 'Security',
          warning: 'Always enable 2FA before making any deposits. Accounts without 2FA are more vulnerable to unauthorized access.',
          whatHappensNext: 'Your MEXC account is ready. You can deposit crypto, use P2P to buy with local currency, or start spot trading directly.',
        },
      ],
    },
    {
      id: 'mexc-spot-trading',
      title: 'How to Spot Trade on MEXC',
      description: 'A beginner\'s walkthrough for placing your first spot trade on MEXC — choosing a pair, reading the order book and placing a limit order.',
      lastVerified: '2026-05',
      stepCount: 5,
      cta: {
        body: 'MEXC has a 0% maker fee on spot trading — one of the lowest in the industry. Taker fees start at 0.05%.',
        label: 'Start trading on MEXC',
      },
      steps: [
        {
          title: 'Navigate to Spot Trading',
          description: 'Click <strong>Spot</strong> in the top navigation to open the spot trading interface. The default pair is BTC/USDT. You can search for any trading pair using the search bar in the top left.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'MEXC spot trading interface',
          alt: 'MEXC spot trading interface showing BTC/USDT chart and order book',
          mediaCategory: 'Spot Trading',
          locationHint: 'Top nav → Spot',
        },
        {
          title: 'Choose a trading pair',
          description: 'Click the pair name at the top (e.g. BTC/USDT) to open the pair selector. You can browse by category (USDT pairs, BTC pairs, ETH pairs) or search by coin name or symbol.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'MEXC trading pair selector',
          alt: 'MEXC trading pair selection panel with search and category filters',
          mediaCategory: 'Spot Trading',
          tip: 'MEXC lists 2,000+ trading pairs — more than most exchanges. Stick to high-volume pairs (USDT base pairs) for better liquidity and tighter spreads.',
        },
        {
          title: 'Understand the order book and price chart',
          description: 'The order book shows buy orders (green, left) and sell orders (red, right). The gap between the highest buy and lowest sell is the spread. The price chart above uses candlestick patterns. You do not need to understand all of this to place a basic order.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'MEXC order book and price chart',
          alt: 'MEXC trading interface showing order book with buy and sell orders alongside price chart',
          mediaCategory: 'Spot Trading',
        },
        {
          title: 'Select Limit or Market order and enter the amount',
          description: 'In the order panel on the right: choose <strong>Limit</strong> to set your own price, or <strong>Market</strong> to buy at the current price. Enter the amount of USDT to spend. The platform calculates how many coins you receive.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'MEXC spot order form',
          alt: 'MEXC spot trading order panel showing Limit order type and amount input',
          mediaCategory: 'Spot Trading',
          tip: '<strong>Limit orders</strong> are better than market orders for most trades. Set your limit slightly below the current ask price to save on slippage. Your order fills when the price reaches your limit.',
          warning: 'Market orders execute immediately at the best available price, which can be significantly worse than the last traded price during volatile conditions.',
        },
        {
          title: 'Confirm and place the order',
          description: 'Review the order summary: pair, amount, estimated price, and estimated fee. Click <strong>Buy [Coin]</strong> to place the order. For limit orders, the order appears in "Open Orders" until it fills or you cancel it.',
          device: 'desktop',
          aspectRatio: '16/9',
          screenshotLabel: 'MEXC order confirmation',
          alt: 'MEXC order placement confirmation showing order details and Buy button',
          mediaCategory: 'Spot Trading',
          whatHappensNext: 'Filled orders appear in your Spot wallet balance. You can view trade history in "Orders" → "Order History".',
        },
      ],
    },
  ],
};

// ── Registry ───────────────────────────────────────────────────────────────────

export const EXCHANGE_WALKTHROUGHS: ExchangeWalkthrough[] = [
  bybit,
  binance,
  mexc,
];

export function getWalkthroughs(slug: string): ExchangeWalkthrough | undefined {
  return EXCHANGE_WALKTHROUGHS.find(w => w.slug === slug);
}

export function getFlow(slug: string, flowId: string): WalkthroughFlow | undefined {
  return getWalkthroughs(slug)?.flows.find(f => f.id === flowId);
}

export function getFlowsBySlug(slug: string): WalkthroughFlow[] {
  return getWalkthroughs(slug)?.flows ?? [];
}
