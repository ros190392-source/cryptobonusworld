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
  /** Snippet-ready HTML table rendered between description and screenshot */
  tableContent?: string;
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
  /**
   * 1-based step number after which to insert a mid-flow "follow along" CTA.
   * Useful for long flows (8+ steps) to keep users engaged without navigating away.
   */
  midCtaAfterStep?: number;
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
      midCtaAfterStep: 4,
      cta: {
        body: 'Account setup takes under 5 minutes. Once registered, your next step is identity verification (KYC) — it takes around 10 minutes and unlocks full withdrawals, P2P trading and futures. See the KYC walkthrough below.',
        label: 'Create Bybit account',
      },
      steps: [
        {
          title: 'Open the Bybit referral page',
          description: 'Click the registration link from CryptoBonusWorld. You land directly on the Bybit bonus page — the referral code <strong>CRYPTOBONUSW</strong> is already entered and confirmed (green tick). You do not need to type it manually. The bonus table on the left shows rewards from $50 up to $30,000 depending on your deposit and trading volume.',
          src: '/media/walkthroughs/bybit/bybit-step-01.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Bybit referral landing page showing welcome bonus up to $30,000 with registration form and CRYPTOBONUSW referral code pre-filled',
          mediaCategory: 'Sign Up',
          tip: 'Using a referral link is the only way to unlock the full $30,000 welcome bonus. Direct registration without a referral code gives a significantly smaller reward.',
          whatHappensNext: 'Enter your email address in the form on the right, then click Get My Welcome Gifts.',
        },
        {
          title: 'Enter your email and complete the security check',
          description: 'Type your email address in the <strong>Email/Mobile Number</strong> field. The referral code <strong>CRYPTOBONUSW</strong> is already filled in — do not change it. Click <strong>Get My Welcome Gifts</strong>. A puzzle slider overlay appears: drag the arrow piece to the right until the image aligns.',
          src: '/media/walkthroughs/bybit/bybit-step-02.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Bybit registration form with email entered and security puzzle slider overlay requiring drag to complete',
          mediaCategory: 'Sign Up',
          warning: 'Do not change or clear the referral code field. If you accidentally delete it, type <strong>CRYPTOBONUSW</strong> exactly before clicking the button.',
          tip: 'The security puzzle takes 2 seconds — just slide the arrow to the right until the pieces lock. It is not a skill test.',
          whatHappensNext: 'Bybit sends a 6-digit verification code to your email. The code is valid for 5 minutes.',
        },
        {
          title: 'Enter the email verification code',
          description: 'Check your inbox for an email from Bybit with a 6-digit code. Enter the digits one by one in the boxes shown on screen. The code is valid for <strong>5 minutes</strong>. If it expires, use the <strong>Resend</strong> button. A countdown timer is shown next to the Resend link.',
          src: '/media/walkthroughs/bybit/bybit-step-03.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Bybit email verification screen showing 6-digit code input boxes with countdown timer and Resend link',
          mediaCategory: 'Sign Up',
          tip: 'If the email does not arrive within 2 minutes, check your spam folder. You can also click <strong>Modify</strong> next to your email address if you made a typo.',
          whatHappensNext: 'The password creation screen appears immediately after the last digit is entered.',
        },
        {
          title: 'Create your password',
          description: 'Enter a strong password in the <strong>Create Password</strong> field. Bybit requires 8–30 characters with at least one uppercase letter, one lowercase letter, and one number. All four requirements are shown with green checkmarks as you type. Click <strong>Get My Welcome Gifts</strong> to complete registration.',
          src: '/media/walkthroughs/bybit/bybit-step-04.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Bybit Create Password screen showing password input field with four green requirement checkmarks and Get My Welcome Gifts button',
          mediaCategory: 'Sign Up',
          warning: 'Save your password in a password manager (Bitwarden, 1Password) immediately. Bybit account recovery without your password and 2FA can take several days.',
          whatHappensNext: 'Your account is created. You are logged into the Bybit dashboard. Head to Account → Security to protect it before depositing.',
        },
        {
          title: 'Activate your anti-phishing code',
          description: 'Go to <strong>Account → Security</strong> in the left sidebar, then click <strong>Settings</strong> next to Anti-phishing Code. Bybit immediately shows a popup with an auto-generated code (e.g. <em>En8iuf_l</em>). You can use it as-is or click <strong>Customize Code</strong> to set your own memorable phrase. Click <strong>Activate Code</strong>. From this point, every legitimate Bybit email will include this code — any email without it is a phishing attempt.',
          src: '/media/walkthroughs/bybit/bybit-step-05v2.webp',
          alt: 'Bybit Anti-phishing Code popup showing auto-generated code En8iuf_l with Activate Code and Customize Code buttons',
          device: 'desktop',
          aspectRatio: '2/1',
          mediaCategory: 'Security',
          locationHint: 'Left sidebar → Account → Security → Anti-phishing Code → Settings',
          tip: 'Click <strong>Customize Code</strong> and set a short phrase you will recognise — something like "BYBIT26". A code you know by heart is easier to notice when it is missing.',
          whatHappensNext: 'Code activates in seconds. Next step: set up Google 2FA for full account protection.',
        },
        {
          title: 'Set up Google Two-Factor Authentication',
          description: 'Back on the Security page, click <strong>Settings</strong> next to Google Two-Factor Authentication. Download <strong>Authy</strong> or <strong>Google Authenticator</strong> on your phone, scan the QR code Bybit shows, and enter the 6-digit code to confirm. Save your backup key offline — this is the only way to recover 2FA access if you lose your phone.',
          src: '/media/walkthroughs/bybit/bybit-step-06v2.webp',
          alt: 'Bybit Security page with Security Verification popup and arrow pointing to Google Two Factor Authentication',
          device: 'desktop',
          aspectRatio: '2/1',
          mediaCategory: 'Security',
          locationHint: 'Left sidebar → Account → Security → Google Two-Factor Authentication → Settings',
          tip: 'Use <strong>Authy</strong> rather than Google Authenticator — Authy supports encrypted cloud backup so you won\'t lose access if you change phones.',
          warning: 'Write your backup key on paper and store it somewhere safe. Anyone with this key can access your 2FA codes.',
          whatHappensNext: 'Your account is now fully secured. Head to Rewards Hub to start your welcome bonus tasks.',
        },
        {
          title: 'Open Rewards Hub and start your welcome tasks',
          description: 'Click <strong>Rewards Hub</strong> in the top navigation bar. The welcome campaign shows <strong>100 USDT Welcome Gifts + NVDAX</strong> with three tasks: 1) Complete Identity Verification (Earn 20 USDT), 2) Deposit ≥ $100 (Earn 20 USDT), 3) Deposit ≥ $100 and Trade ≥ $10 (Earn 20 USDT). Click each task button to begin.',
          src: '/media/walkthroughs/bybit/bybit-step-07.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Bybit Rewards Hub showing 100 USDT Welcome Gifts campaign with three tasks: Verify, Deposit and Trade, each worth 20 USDT',
          mediaCategory: 'Bonus Center',
          locationHint: 'Top nav → Rewards Hub',
          tip: 'Complete the tasks in order: Identity Verification first, then deposit, then trade. Each task unlocks the next.',
          whatHappensNext: 'Scroll down to see the larger 30,000 USDT tiered deposit rewards and the New Users Zone staking bonus.',
        },
        {
          title: 'Explore the 30,000 USDT deposit rewards',
          description: 'Scroll down in Rewards Hub to see the <strong>30,000 USDT Deposit Blast-Off Rewards</strong> section. This is a tiered bonus: deposit $500+ and trade $100k+ to unlock derivatives bonuses up to 30,000 USDT. The <strong>New Users Zone</strong> below it offers a +300% APR booster for staking ≥ 100 USDT in Savings for 10 days.',
          src: '/media/walkthroughs/bybit/bybit-step-08.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Bybit Rewards Hub showing 30,000 USDT Deposit Blast-Off tiered rewards section and New Users Zone 300% APR staking offer',
          mediaCategory: 'Bonus Center',
          tip: 'The deposit bonuses are cumulative — you do not have to aim for $30,000 immediately. Even a $100 deposit + small trade qualifies for early reward tiers.',
          warning: 'The 30,000 USDT figure is the maximum theoretical bonus and requires very large deposits and trading volumes. Most new users realistically earn $50–$200 in the first month.',
          whatHappensNext: 'Your account is fully set up, secured and bonus tasks are active. Fund your account via P2P, crypto transfer or bank card to start earning rewards.',
        },
      ],
    },
    {
      id: 'bybit-kyc',
      title: 'How to Complete Bybit Identity Verification (KYC)',
      description: 'Identity verification unlocks deposits, withdrawals, P2P trading and futures on Bybit. The process takes 5–10 minutes and requires a government-issued ID and a selfie. Approval is usually automatic within minutes.',
      lastVerified: '2026-05',
      stepCount: 8,
      cta: {
        body: 'Once verified at Level 1, you\'re ready to fund your account. The quickest route for most users is P2P — buy USDT directly with your bank card, zero platform fees. See the P2P walkthrough below.',
        label: 'Start Bybit verification',
      },
      steps: [
        {
          title: 'Find Identity Verification',
          description: 'Bybit shows a <strong>verification banner</strong> at the top of every page: "Complete Identity Verification to continue using Bybit\'s services." Click <strong>Verify Now</strong> in that banner — or click the popup\'s <strong>Get Verified Now</strong> button. Both lead to the same place. You can also reach it any time via the left sidebar: <strong>Account → Identity Verification</strong>.',
          src: '/media/walkthroughs/bybit/bybit-kyc-01-ec66df38.webp',
          alt: 'Bybit dashboard showing identity verification banner at top and verification popup with Get Verified Now button',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          mediaCategory: 'KYC',
          tip: 'Until you complete KYC, Bybit restricts deposits over certain limits, all fiat withdrawals, P2P trading and futures. Verification takes under 10 minutes — do it immediately after registration.',
          whatHappensNext: 'The Identity Verification form opens — starting with your country selection.',
        },
        {
          title: 'What verification actually unlocks',
          description: 'This is the official Bybit withdrawal limits table. <strong>Without verification</strong> — only VIP 5+ users get any meaningful limit (20K USDT/day). For a regular new user, withdrawals are essentially blocked. <strong>After Standard KYC (Level 1)</strong> — your daily limit jumps to <strong>1,000,000 USDT</strong>. That covers virtually every real user. <strong>After Advanced KYC (Level 2)</strong> — 2,000,000 USDT/day. Beyond deposits and withdrawals, verification also unlocks: P2P trading, Futures, full Spot access and participation in Bybit promotions.',
          src: '/media/walkthroughs/bybit/bybit-kyc-limits-a19d5cb3.webp',
          alt: 'Bybit official withdrawal limits table showing No Verification vs Standard KYC vs Advanced KYC daily limits by VIP level — Standard gives 1M USDT daily for regular users',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          mediaCategory: 'KYC',
          tableContent: '<table><thead><tr><th scope="col">Verification Level</th><th scope="col">Daily Withdrawal Limit</th><th scope="col">P2P &amp; Futures</th></tr></thead><tbody><tr><td>No Verification (new account)</td><td>~0 USDT</td><td><span class="tag-blocked">Blocked</span></td></tr><tr class="wsi-row--highlight"><td><strong>Standard KYC — Level 1</strong></td><td><strong>1,000,000 USDT / day</strong></td><td><span class="tag-ok">✓ Fully unlocked</span></td></tr><tr><td>Advanced KYC — Level 2</td><td>2,000,000 USDT / day</td><td><span class="tag-ok">✓ Fully unlocked</span></td></tr></tbody></table>',
          tip: '<strong>Standard KYC (Level 1) is enough for 99% of users.</strong> 1,000,000 USDT per day is far more than any typical trader needs. Level 2 is only relevant if you need to move more than 1,000,000 USDT per day — which applies to very few individual traders.',
          region: 'Source: <a href="https://www.bybit.com/en/help-center/article/Individual-KYC-FAQ/?affiliate_id=75062" target="_blank" rel="noopener noreferrer">official Bybit Help Center — Individual KYC FAQ</a>. Limits are denominated in USDT equivalent and reset daily at 12AM UTC.',
          whatHappensNext: 'Now that you know what\'s at stake, let\'s complete verification in under 10 minutes.',
        },
        {
          title: 'Select your country',
          description: 'The <strong>Proof of Identity</strong> page opens with a <strong>Country/Region of Issue</strong> dropdown. Click it and search for your country — type the first few letters to filter quickly. Select your country from the list. The document types available in the next step depend on your country selection.',
          src: '/media/walkthroughs/bybit/bybit-kyc-02-cc748f2b.webp',
          alt: 'Bybit Identity Verification country dropdown open with Ukraine selected and country search visible',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          mediaCategory: 'KYC',
          tip: 'Select the country that issued your document — not necessarily your country of residence. If your ID was issued in Germany but you live abroad, select Germany.',
          whatHappensNext: 'After selecting your country, the available document types appear below.',
        },
        {
          title: 'Choose your document type',
          description: 'Select which document you will use: <strong>ID card</strong> (recommended — Bybit pre-selects it), <strong>Passport</strong>, <strong>Driver license</strong> or <strong>Residence permit</strong>. An ID card is fastest because it is commonly accepted and scans well. Click <strong>Continue</strong>.',
          src: '/media/walkthroughs/bybit/bybit-kyc-03-7eab684d.webp',
          alt: 'Bybit Proof of Identity form showing four document type options with ID card highlighted as Recommended and Continue button',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          mediaCategory: 'KYC',
          tip: 'If you are using a passport, note that Bybit only accepts <strong>international passports</strong> — domestic-only passports (issued for in-country use) are not accepted.',
          warning: 'Make sure your document is <strong>not expired</strong> before starting. An expired document will be rejected automatically.',
          whatHappensNext: 'Bybit generates a QR code to continue on your phone — the camera scanning must be done on a mobile device.',
        },
        {
          title: 'Scan the QR code with your phone',
          description: 'Bybit shows a <strong>QR code</strong> with the instruction "Continue verification in a browser." Open your phone camera, point it at the QR code and tap the link. Alternatively, click <strong>Copy</strong> to copy the link and paste it into your phone\'s browser manually.',
          src: '/media/walkthroughs/bybit/bybit-kyc-04-f8f239a7.webp',
          alt: 'Bybit Identity Verification QR code screen showing Continue verification in a browser with Copy button and browser instructions',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          mediaCategory: 'KYC',
          warning: 'Open the link in <strong>Chrome or Safari</strong> on your phone — not inside WhatsApp, Instagram, Telegram or any other in-app browser. In-app browsers block the camera access needed for scanning.',
          whatHappensNext: 'The verification continues in your phone\'s browser — you will scan your document and take a selfie there.',
        },
        {
          title: 'Scan your document on your phone',
          description: 'Your phone browser opens the document scanner. Hold your <strong>ID card or passport</strong> flat within the white frame on screen. Keep it steady, ensure good lighting and make sure all four corners are clearly visible. The scanner detects the document automatically — no button to press.',
          src: '/media/walkthroughs/bybit/bybit-kyc-05-ca98bcfe.webp',
          alt: 'Bybit mobile document scanner showing Scan front of your ID with camera viewfinder and document frame',
          capturedAt: '2026-05',
          device: 'mobile',
          aspectRatio: '9/16',
          mediaCategory: 'KYC',
          tip: 'Place your document on a dark, flat surface for best contrast. Turn off the flash — it creates glare. Natural daylight or a lamp nearby gives the clearest scan.',
          warning: 'Make sure the document\'s full text is readable in the frame. Blurry, folded or partially covered documents are the most common reason for KYC rejection.',
          whatHappensNext: 'After scanning the front (and back for ID cards), the face verification screen opens.',
        },
        {
          title: 'Complete the face verification',
          description: 'The liveness check screen shows an oval frame with the instruction: <strong>"Face the screen, put your face in the frame."</strong> Centre your face in the oval and hold still — the system takes an automatic photo. It checks that the face matches your document and that you are a real person (not a photo of a photo).',
          src: '/media/walkthroughs/bybit/bybit-kyc-06-41b58073.webp',
          alt: 'Bybit mobile face verification screen showing oval face frame with Face the screen put your face in the frame instruction',
          capturedAt: '2026-05',
          device: 'mobile',
          aspectRatio: '9/16',
          mediaCategory: 'KYC',
          tip: 'Face a light source (window or lamp) directly — not from behind you. Remove sunglasses or hats. Look straight at the camera. The scan takes about 3 seconds.',
          whatHappensNext: 'Your data is submitted for review. Most accounts are approved automatically within 2–10 minutes.',
        },
        {
          title: 'Verification approved — Level 1 unlocked',
          description: 'Once approved, your account shows <strong>Identity Verification Lv.1</strong> with a green checkmark in <strong>Account Info</strong>. You now have full access to: deposits and withdrawals, P2P trading, Spot and Futures trading. To check your status any time: left sidebar → <strong>Account → Account Info</strong> → look for the green <strong>Verified Lv.1</strong> tag.',
          src: '/media/walkthroughs/bybit/bybit-kyc-07-9691635c.webp',
          alt: 'Bybit Account Info page showing Identity Verification Lv.1 green checkmark badge and Verified Lv.1 status in the verification row',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          mediaCategory: 'KYC',
          tip: 'Level 1 is sufficient for all standard trading including futures. Level 2 is only relevant if you need to move more than 1,000,000 USDT per day — which applies to very few individual traders.',
          whatHappensNext: 'Your account is fully unlocked. You can now deposit funds via P2P or crypto transfer and start trading.',
        },
      ],
    },
    {
      id: 'bybit-p2p-purchase',
      title: 'How to Buy Crypto on Bybit P2P',
      description: 'Step-by-step guide to buying USDT with a bank transfer or mobile payment using Bybit P2P. Zero fees, escrow protection, 100+ payment methods. Screenshots show a real purchase of 55.97 USDT for 2,500 UAH (Ukrainian hryvnia) via Monobank card — the flow is identical for any other currency or payment method.',
      lastVerified: '2026-05',
      stepCount: 8,
      midCtaAfterStep: 4,
      cta: {
        body: 'P2P on Bybit is fee-free. The escrow system locks the seller\'s crypto before you pay — your funds are safe.',
        label: 'Start P2P on Bybit',
      },
      steps: [
        {
          title: 'Open Buy Crypto → P2P Trading',
          description: 'Click <strong>Buy Crypto</strong> in the top navigation bar. A dropdown opens — select <strong>P2P Trading (0 Fees)</strong> at the top of the list. This takes you to the live P2P marketplace with sellers listed by price.',
          src: '/media/walkthroughs/bybit/bybit-p2p-01.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Bybit Buy Crypto dropdown menu showing P2P Trading (0 Fees) option highlighted',
          mediaCategory: 'P2P',
          locationHint: 'Top nav → Buy Crypto → P2P Trading (0 Fees)',
          whatHappensNext: 'The P2P marketplace loads with a list of sellers, their prices, available amounts and payment methods.',
        },
        {
          title: 'Select your currency and browse sellers',
          description: 'On the P2P page, make sure <strong>Buy</strong> and <strong>USDT</strong> are selected. Click the currency dropdown and choose your local currency (USD, EUR, UAH, etc.). The seller list filters automatically. You will see each seller\'s price, available amount and accepted payment methods.',
          src: '/media/walkthroughs/bybit/bybit-p2p-02.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Bybit P2P marketplace showing currency dropdown open with seller list filtered by USD',
          mediaCategory: 'P2P',
          tip: 'Sort by <strong>Best Price</strong> to get the cheapest rate. Stick to sellers with the <strong>Fast Release</strong> badge — they release crypto within minutes of payment confirmation.',
        },
        {
          title: 'Check the seller\'s profile before buying',
          description: 'Click a seller\'s username to open their profile. Check: <strong>Completion Rate</strong> (aim for 95%+), <strong>Total Orders</strong> (200+ is reliable), <strong>Average Release Time</strong> (under 5 minutes is ideal), and their <strong>Good Rating %</strong>. This takes 30 seconds and dramatically reduces your exposure to scams.',
          src: '/media/walkthroughs/bybit/bybit-p2p-03.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Bybit P2P seller profile showing completion rate 95%, 458 total orders, 100% good rating and 4 minute average release time',
          mediaCategory: 'P2P',
          tip: 'A seller with 458 total orders, 95% completion and 4-minute release time (like shown) is highly reliable. New sellers with under 50 trades carry more risk.',
          warning: 'Never communicate with the seller outside the Bybit chat. Bybit cannot protect you from scams conducted through external messaging apps.',
        },
        {
          title: 'Place the order and get payment details',
          description: 'Go back to the seller\'s listing, enter the amount in your local currency, and click <strong>Buy USDT</strong>. The order is created instantly — the seller\'s crypto is locked in Bybit escrow. The screen now shows the exact payment details: bank name, account holder name, card number, and the exact amount to transfer. A <strong>countdown timer</strong> shows your deadline (typically 30 minutes).',
          src: '/media/walkthroughs/bybit/bybit-p2p-04-b2fcdd4f.webp',
          capturedAt: '2026-05',
          device: 'none',
          aspectRatio: '2/1',
          alt: 'Bybit P2P active order showing Pending for Payment status with seller bank details, exact amount in UAH and countdown timer',
          mediaCategory: 'P2P',
          region: 'Example shown: buying 55.97 USDT for 2,500 UAH (Ukrainian hryvnia) via Monobank card. The screen layout is identical for EUR, USD, TRY, INR or any other currency — only the currency symbol and payment method name differ.',
          warning: 'Transfer the <strong>exact amount</strong> shown — do not round up or down. Write nothing in the bank transfer reference/description field. Never mention "crypto", "USDT" or "Bybit".',
          whatHappensNext: 'Open your banking app and complete the transfer to the seller\'s card. Come back to Bybit before clicking anything.',
        },
        {
          title: 'Send the money via your banking app',
          description: 'Open your banking app (Monobank, PrivatBank, Revolut, or any other) and transfer the <strong>exact amount</strong> to the card number shown in the Bybit order. In the example: 2,500 UAH sent to Denys K. via Monobank card transfer at 15:02. The transfer completes instantly. Save the receipt — you may need it as proof of payment.',
          src: '/media/walkthroughs/bybit/monobank-send-2500-griven.webp',
          capturedAt: '2026-05',
          device: 'mobile',
          aspectRatio: '4/5',
          alt: 'Monobank mobile app showing completed card transfer of 2500 UAH to P2P seller Denys K.',
          mediaCategory: 'P2P',
          warning: 'Do not add any notes or descriptions to the bank transfer. Leave the comment/reference field completely empty. Writing "USDT", "crypto" or "Bybit" can trigger a bank compliance block.',
          tip: 'Screenshot the payment confirmation screen from your banking app before going back to Bybit. This is your evidence if any dispute arises.',
          whatHappensNext: 'Go back to the Bybit P2P order page and confirm that you have sent the payment.',
        },
        {
          title: 'Confirm your payment in Bybit',
          description: 'After completing the bank transfer, return to the Bybit order page and click <strong>Payment Completed</strong>. A confirmation popup appears — verify the card number and name match what you paid. Check both confirmation boxes and click <strong>Confirm</strong>. The seller is notified and begins verifying payment in their bank account.',
          src: '/media/walkthroughs/bybit/bybit-p2p-05v2.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Bybit P2P Confirm Payment popup showing seller card details, amount confirmation field and two checkbox confirmations with Confirm button',
          mediaCategory: 'P2P',
          warning: '<strong>Only click Confirm after you have actually sent the money.</strong> Clicking Confirm without paying is a violation of Bybit policy and can result in account suspension.',
          tip: 'Take a screenshot of your bank transfer receipt before confirming. If there is any dispute, this is your proof.',
          whatHappensNext: 'The order status changes to "Pending for Release". The seller verifies your payment and releases the crypto — typically within 2–10 minutes.',
        },
        {
          title: 'Pending for Release — waiting for the seller',
          description: 'After clicking <strong>Payment Completed</strong>, the order switches to <strong>Pending for Release</strong> with a countdown timer. The left panel shows your order summary: 2,500.00 UAH paid, 55.9659 USDT to receive. The chat on the right confirms: <em>"You\'ve completed the payment. Please wait for the seller to release the coins to you."</em> The seller checks their bank account and releases the crypto — usually within 2–10 minutes.',
          src: '/media/walkthroughs/bybit/p2p-10.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Bybit P2P order page showing Pending for Release status with countdown timer, order summary 2500 UAH for 55.9659 USDT, and chat confirmation that payment is complete',
          mediaCategory: 'P2P',
          tip: 'If the seller does not release crypto within 15 minutes, click <strong>Order Dispute</strong>. Bybit support takes over and typically resolves the case within 24 hours.',
          warning: 'Do not open a dispute before 15 minutes have passed unless the seller explicitly asks you to cancel — premature disputes can delay the release.',
          whatHappensNext: 'The seller verifies your payment and releases the USDT. Bybit immediately shows a success popup confirming the purchase.',
        },
        {
          title: 'Review the completed order summary',
          description: 'Bybit confirms the purchase with a <strong>green checkmark and a "Congrats" popup</strong>: 2,500.00 UAH paid, <strong>55.9659 USDT received</strong>. Two buttons appear: <strong>View Order</strong> (opens the full transaction record — order number, timestamp, rate and chat history) and <strong>View My Assets</strong> (jumps directly to your wallet). The USDT has already landed in your account — tap <strong>View My Assets</strong> to confirm.',
          src: '/media/walkthroughs/bybit/bybit-p2p-07v2.webp',
          capturedAt: '2026-05',
          device: 'mobile',
          aspectRatio: '3/4',
          alt: 'Bybit P2P success popup showing green checkmark, 2500.00 UAH paid and Congrats you\'ve bought 55.9659 USDT confirmation with View Order and View My Assets buttons',
          mediaCategory: 'P2P',
          tip: 'Newly received P2P funds may have a short security hold before withdrawal (typically 24 hours). You can trade immediately without waiting.',
          warning: 'If the seller has not released crypto within 30 minutes of your payment confirmation, use the <strong>Order Dispute</strong> link on this page. Bybit support resolves disputes within 24 hours.',
          whatHappensNext: 'Your USDT is in your Funding Account. Transfer it to Unified Trading to start trading Spot or Futures — it takes seconds and is free.',
        },
      ],
    },
    {
      id: 'bybit-first-deposit',
      title: 'How to Deposit Crypto to Bybit',
      description: 'How to fund your Bybit account by transferring cryptocurrency from another wallet or exchange.',
      lastVerified: '2026-05',
      stepCount: 7,
      cta: {
        body: 'Once your USDT is in your Funding Wallet, you can trade Spot directly, or transfer to your Derivatives Wallet to start Futures. The Futures trading walkthrough is below — it covers exactly how to make your first leveraged trade.',
        label: 'Deposit to Bybit',
      },
      steps: [
        {
          title: 'Open the Deposit screen',
          description: 'Bybit gives you two quick ways to get here. <strong>Fastest:</strong> click the orange <strong>Deposit</strong> button in the top-right corner — it appears on every page. <strong>Alternative:</strong> click <strong>Assets</strong> in the top navigation to open the dropdown, then select <strong>Deposit</strong> from the menu. Both routes land you on the exact same deposit page.',
          src: '/media/walkthroughs/bybit/bybit-dep-01-aad722a3.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Bybit top navigation showing orange Deposit button and Assets dropdown menu with Deposit option highlighted',
          mediaCategory: 'Deposit',
          whatHappensNext: 'The deposit screen opens — now choose the coin and network you want to receive.',
        },
        {
          title: 'Select coin, network and copy your deposit address',
          description: 'The deposit page has three numbered sections. <strong>① Choose coin to deposit</strong> — select USDT from the dropdown. <strong>② Choose a Chain</strong> — select TRON (TRC-20) for lowest fees and fastest speed. <strong>③ Confirm deposit details</strong> — your unique deposit address and QR code appear automatically. A TRC-20 address always starts with <strong>T</strong> and looks like this: <code>TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE</code>. Click the copy icon next to the address — do not type it manually.',
          src: '/media/walkthroughs/bybit/bybit-dep-03-b49eed80.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Bybit deposit page showing three steps: coin selection USDT, chain selection TRON TRC20, and deposit address with QR code and copy button',
          mediaCategory: 'Deposit',
          tip: 'After copying, paste the address into a text editor and check the first and last 4 characters match what is shown on screen. This protects against clipboard hijacking malware.',
          warning: '<strong>Network must match on both sides.</strong> Sending USDT on ERC-20 to a TRC-20 address = permanent loss. Always double-check the network before copying the address.',
          whatHappensNext: 'Now go to the exchange where your USDT is stored and initiate a withdrawal to this address.',
        },
        {
          title: 'Fill in the withdrawal form on your exchange',
          description: 'Open your source exchange (example: Binance) and go to <strong>Withdraw Crypto</strong>. Fill in four fields: <strong>① Coin</strong> — USDT. <strong>② Address</strong> — paste the Bybit deposit address from the previous step. <strong>③ Network</strong> — TRX / Tron (TRC-20). <strong>④ Amount</strong> — enter how much to send. The bottom of the screen shows the exact breakdown: sending 51.30 USDT − 1.30 USDT network fee = <strong>50.00 USDT arrives on Bybit</strong>. When ready, click <strong>Withdraw</strong>.',
          src: '/media/walkthroughs/bybit/bybit-dep-04-d0372c42.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Binance Withdraw Crypto page with USDT selected, Bybit TRC-20 address pasted, amount 51.30 USDT, network fee 1.30 USDT, receive amount 50.00 USDT',
          mediaCategory: 'Deposit',
          tip: 'TRC-20 network fee on Binance is a flat 1 USDT — one of the cheapest options. ERC-20 fees can reach $5–15 depending on Ethereum gas.',
          warning: 'Triple-check the network selection. Pasting a TRC-20 address but selecting ERC-20 as network = funds permanently lost. The address field accepts any text without validation.',
          whatHappensNext: 'A confirmation popup appears — review all details before clicking Continue.',
        },
        {
          title: 'Review and confirm the withdrawal',
          description: 'Before the funds leave, Binance shows a final confirmation popup with a full summary: recipient address, network (Tron TRC20), amount sent (51.30 USDT), amount received (50.00 USDT) and fee (1.30 USDT). Read two important warnings shown in the popup: the address must be correct and on the same network, and <strong>transactions cannot be cancelled</strong> once submitted. If everything looks right, click <strong>Continue</strong>. Binance will ask for 2FA or email confirmation.',
          src: '/media/walkthroughs/bybit/bybit-dep-05-6df1d2cf.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Binance withdrawal confirmation popup showing address, Tron TRC20 network, 51.30 USDT sent, 50.00 USDT received, 1.30 fee and Continue button',
          mediaCategory: 'Deposit',
          warning: 'This is your last chance to cancel. Once you click Continue and confirm via 2FA, the transaction is irreversible — crypto transactions on blockchain cannot be reversed by anyone.',
          whatHappensNext: 'After 2FA confirmation, Binance submits the transaction to the blockchain.',
        },
        {
          title: 'Wait for the withdrawal to process',
          description: 'After confirming, Binance may show an <strong>Awaiting Approval</strong> screen — this is normal on first-time withdrawals to a new address. It means Binance\'s security system is doing an automated review, which typically takes a few minutes. Once approved, the withdrawal appears in <strong>Recent Withdrawals</strong> with status <strong>Processing (1/1)</strong> — that means 1 out of 1 required blockchain confirmation is complete. The funds are on their way.',
          src: '/media/walkthroughs/bybit/bybit-dep-07-eae27f4d.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Binance Recent Withdrawals table showing USDT 50.00 TRX transaction with Processing 1/1 status, destination address and TxID',
          mediaCategory: 'Deposit',
          tip: 'Copy the TxID (transaction ID) shown in the withdrawal history. You can paste it into tronscan.org to track the transaction live on the blockchain — useful if the deposit takes longer than expected.',
          whatHappensNext: 'USDT on TRC-20 arrives on Bybit within 1–3 minutes. Switch to Bybit and check your Assets.',
        },
        {
          title: 'Verify the deposit in Funding Account History',
          description: 'For the full deposit record, go to <strong>Assets → Funding Account → History → Deposit tab</strong>. Every incoming deposit is listed here with all details: coin (USDT), network (TRON TRC-20), exact amount received, destination address, blockchain TxID and timestamp. In the example: <strong>50 USDT · TRC-20 · Completed · 2026-05-31 11:57:49</strong>. All addresses and TxID are partially shown for privacy — they are visible in full on your account. This page is your official deposit record.',
          src: '/media/walkthroughs/bybit/bybit-dep-10-ff91b1ad.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Bybit Funding Account History showing deposit tab with 50 USDT TRC-20 Completed status, address and TxID columns',
          mediaCategory: 'Deposit',
          tip: 'If your deposit shows <strong>Processing</strong> instead of Completed, copy the TxID and check it on <strong>tronscan.org</strong>. You can see exactly how many confirmations have been received — Bybit credits after 20 confirmations.',
          whatHappensNext: 'Funds are confirmed in your Funding Account. Depending on your deposit routing setting, they may already be in Unified Trading — check the next step.',
        },
        {
          title: 'Funds are ready — start trading',
          description: 'Click <strong>Unified Trading</strong> in the left sidebar to confirm the funds arrived. You will see your USDT balance: in this example <strong>50.0000 USDT</strong> with a wallet balance of 50.0000 and current USD value of 49.93. From here you can click <strong>Trade</strong> to buy crypto on Spot, or go to <strong>Derivatives</strong> to start futures trading. Your deposit is complete.',
          src: '/media/walkthroughs/bybit/bybit-dep-09-41e38181.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Bybit Unified Trading Account showing 50.0000 USDT balance with Trade and Transfer action buttons, total equity 49.93 USD',
          mediaCategory: 'Deposit',
          tip: 'If your deposit went to the <strong>Funding Account</strong> instead of Unified Trading, click the transfer icon (⇄) next to the Funding Account row and move the funds across — it is instant and free.',
          whatHappensNext: 'You are ready to trade. Head to Spot to buy crypto, or open Derivatives to set up your first futures position.',
        },
      ],
    },
    {
      // ── SCREENSHOT CAPTURE PLAN (bybit-spot-trading) ─────────────────────
      // Status: 6 steps pending screenshots. Capture checklist:
      //   Step 1: bybit-spot-01-{hash}.webp — Trade dropdown open, Spot highlighted
      //           URL: https://www.bybit.com/en — hover Trade → screenshot before Spot click
      //           Viewport: 1440×900, crop to 1280×720
      //   Step 2: bybit-spot-02-{hash}.webp — Pair search panel, "BTC" typed, BTCUSDT visible
      //           URL: https://www.bybit.com/en/trade/spot/BTC/USDT — click pair name first
      //           Viewport: 1440×900, crop: left panel + search overlay
      //   Step 3: bybit-spot-03-{hash}.webp — Full interface overview (chart+OB+panel)
      //           URL: https://www.bybit.com/en/trade/spot/BTC/USDT
      //           Viewport: 1440×900 full-width, crop to 1280×720
      //   Step 4: bybit-spot-04-{hash}.webp — Order panel: Limit selected, price+amount filled
      //           URL: same — crop order panel only (right column), approx 400×720
      //           Note: keep aspect 16/9 — expand to 1280 if needed with padding
      //   Step 5: bybit-spot-05-{hash}.webp — Open Orders tab at bottom, BTCUSDT pending row
      //           URL: https://www.bybit.com/en/trade/spot/BTC/USDT — after placing limit order
      //           Viewport: 1440×900, crop bottom panel + Open Orders tab
      //   Step 6: bybit-spot-06-{hash}.webp — Assets > Unified Trading coin list, BTC balance
      //           URL: https://www.bybit.com/en/finance/overview — Unified Trading section
      //           Viewport: 1280×800, crop to coin list area
      // Rename via: node scripts/media-update.mjs public/media/walkthroughs/bybit/
      // Convert to WebP at quality 82 after capture.
      // ─────────────────────────────────────────────────────────────────────
      id: 'bybit-spot-trading',
      title: 'How to Buy and Sell Crypto on Bybit Spot',
      description: 'Spot trading is the simplest way to buy and sell crypto on Bybit. You own the actual coins — no leverage, no liquidation risk. This walkthrough shows how to buy BTC with USDT using a limit order, monitor the order, and verify your new balance.',
      lastVerified: '2026-05',
      stepCount: 7,
      midCtaAfterStep: 4,
      cta: {
        body: 'Spot trading on Bybit has zero maker fees on select pairs and competitive taker fees. You always own the actual coins — no borrowed funds, no risk of liquidation.',
        label: 'Start Spot Trading on Bybit',
      },
      steps: [
        {
          title: 'Open Trade → Spot',
          description: 'Click <strong>Trade</strong> in the top navigation bar. A dropdown menu appears — select <strong>Spot</strong> at the top of the list. The Bybit Spot trading interface loads with the BTC/USDT pair selected by default.',
          src: '/media/walkthroughs/bybit/bybit-spot-01-20abb8ba.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Bybit Trade dropdown menu with Spot option highlighted',
          mediaCategory: 'Spot Trading',
          locationHint: 'Top nav → Trade → Spot',
          tip: 'Unlike Futures, Spot trading has no leverage and no liquidation risk. You buy real coins and own them outright — the simplest way to hold crypto.',
          whatHappensNext: 'The Spot trading interface loads. You will see the price chart, order book, and order panel.',
        },
        {
          title: 'Select your trading pair',
          description: 'The pair selector is in the top-left corner of the trading interface. ① Click the current pair name (e.g. <strong>BTC/USDT</strong>). ② In the search panel that opens, type <strong>BTC</strong>. ③ Select <strong>BTCUSDT</strong> from the results. The chart and order book reload instantly with BTC data.',
          src: '/media/walkthroughs/bybit/bybit-spot-02-f521b07b.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Bybit Spot pair selector with BTC typed in search showing BTCUSDT in results',
          mediaCategory: 'Spot Trading',
          locationHint: 'Trade > Spot > Pair selector > click pair name > type BTC > select BTCUSDT',
          tip: 'Start with major pairs (BTC/USDT, ETH/USDT, SOL/USDT) — they have the highest liquidity, tightest spreads and most predictable order fills.',
          whatHappensNext: 'BTCUSDT pair is loaded. Now choose your order type and fill in the order panel on the right.',
        },
        {
          title: 'Understand what you\'re looking at',
          description: 'The Spot interface has three main areas: <strong>① Price chart</strong> (top-centre) — shows BTC price history, candlesticks and volume. <strong>② Order book</strong> (right of chart) — red rows are sell orders (asks), green rows are buy orders (bids). The price in the middle is the current market price. <strong>③ Order panel</strong> (far right) — this is where you enter trade details. You only need the order panel to place a trade.',
          src: '/media/walkthroughs/bybit/bybit-spot-03-f185d9bd.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Bybit Spot trading interface with price chart, order book and order panel annotated',
          mediaCategory: 'Spot Trading',
          locationHint: 'Trade > Spot > full interface (BTCUSDT loaded, chart + order book + order panel all visible)',
          tip: 'You do not need to understand the order book or chart to place a basic buy order. Just use the order panel. The chart and order book are useful later when you want to time your entries.',
          whatHappensNext: 'Now set the order type and amount in the order panel.',
        },
        {
          title: 'Set order type, price and amount',
          description: 'In the order panel: ① Select order type — choose <strong>Limit</strong> to set your own price (fills when BTC reaches that price) or <strong>Market</strong> to buy instantly at the current price. ② For a Limit order, enter your <strong>Limit Price</strong> (e.g. slightly below current price). ③ Enter the <strong>Amount</strong> in USDT — or use the percentage slider (25%, 50%, 75%, 100% of your balance). The panel shows exactly how much BTC you will receive.',
          src: '/media/walkthroughs/bybit/bybit-spot-04-a1c69907.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Bybit Spot order panel showing Limit order type selected, price field and USDT amount input with percentage slider',
          mediaCategory: 'Spot Trading',
          locationHint: 'Trade > Spot > order panel (right side) > Buy tab > Limit type > price + amount fields filled',
          tip: '<strong>Limit vs Market:</strong> A Limit order at 1% below current price saves you money and earns a lower taker fee. A Market order fills instantly but you pay the spread. For beginners: use Market for small amounts, Limit for anything over $50.',
          warning: 'Market orders on low-liquidity pairs can execute at a much worse price than shown. Stick to BTC/USDT, ETH/USDT or SOL/USDT when starting out.',
          whatHappensNext: 'Review the order summary and click the Buy button.',
        },
        {
          title: 'Confirm the order and monitor it',
          description: 'Click <strong>Buy BTC</strong>. A confirmation popup appears showing your full order details — price, quantity and total value. Click <strong>Buy</strong> to confirm.',
          src: '/media/walkthroughs/bybit/bybit-spot-05-0bdff223.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '3/2',
          alt: 'Bybit Spot order confirmation popup showing Limit Buy BTC details with Buy button',
          mediaCategory: 'Spot Trading',
          locationHint: 'Trade > Spot > bottom panel > Open Orders tab > BTCUSDT pending order visible',
          tip: 'If the order is not filling and you want to buy now, cancel it and place a Market order instead — it executes immediately at the best available price.',
          whatHappensNext: 'Once filled, the order moves to Order History and your BTC balance increases.',
        },
        {
          title: 'Monitor your order in Open Orders',
          description: 'After confirming, your limit order appears in the <strong>Open Orders</strong> tab at the bottom of the screen. You can see the pair, your limit price, filled quantity and a <strong>Cancel</strong> button. The order fills automatically when BTC price drops to your limit price. While it is pending here, your USDT is reserved — you cannot use it for other trades until the order is filled or cancelled.',
          src: '/media/walkthroughs/bybit/bybit-spot-06-b288d7ea.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Bybit Spot Open Orders tab showing pending BTCUSDT limit buy order with Cancel button',
          mediaCategory: 'Spot Trading',
          locationHint: 'Trade > Spot > bottom panel > Open Orders tab',
          tip: 'If the order is not filling and you need the funds back, click <strong>Cancel</strong>. Your USDT is returned instantly to your available balance.',
          whatHappensNext: 'Once market price drops to your limit, the order fills automatically and moves to Order History.',
        },
        {
          title: 'Order filled — BTC is in your account',
          description: 'Click the <strong>Order History</strong> tab (next to Open Orders). Your filled order is shown with status <strong>Filled</strong> — the entire limit was executed at your price. You can see: the exact fill price, the BTC quantity received, the total USDT spent, and the trading fee charged in BTC. Your new BTC balance is now visible in <strong>Assets → Unified Trading</strong>.',
          src: '/media/walkthroughs/bybit/bybit-spot-07-98ad56e9.webp',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          alt: 'Bybit Order History tab showing BTC/USDT Spot Limit Buy order with Filled status, 0.001358 BTC received at 73,600 USDT',
          mediaCategory: 'Spot Trading',
          locationHint: 'Trade > Spot > bottom panel > Order History tab',
          tip: 'The trading fee is deducted in BTC (the asset you received). To reduce fees further, enable <strong>Use BNB for Fees</strong> — or apply for a fee discount using the referral code <strong>CRYPTOBONUSW</strong>.',
          whatHappensNext: 'You now own BTC on Bybit. You can hold it, set a sell limit order at a higher price to take profit, or transfer it to an external wallet.',
        },
      ],
    },
    {
      id: 'bybit-futures-setup',
      title: 'How to Start Futures Trading on Bybit',
      description: 'A complete walkthrough of your first live futures trade on Bybit — from wallet setup to opening and closing a real position with actual numbers. <strong>Before you start:</strong> Bybit requires Basic Identity Verification (KYC) to enable derivatives trading. Complete it via Account → Identification first. Futures involve leverage and carry a substantial risk of loss.',
      lastVerified: '2026-05',
      stepCount: 12,
      midCtaAfterStep: 7,
      cta: {
        body: 'Bybit offers a testnet where you can practise with virtual funds before risking real money. We strongly recommend this for beginners.',
        label: 'Open Bybit Futures',
      },
      steps: [
        {
          title: 'Understand Bybit\'s wallet structure',
          description: 'Before you trade futures, you need to know where your money lives. Bybit has two main wallets: <strong>① Funding Account</strong> — holds deposits and is used for P2P and fiat operations; <strong>② Unified Trading Account</strong> — the active trading wallet for Spot, Margin, Futures and Options. Money you deposited likely landed in Funding Account. To trade futures you need it in Unified Trading.',
          src: '/media/walkthroughs/bybit/bybit-fut-01-400c4d95.webp',
          alt: 'Bybit Assets page showing Funding Account and Unified Trading Account sections with arrows',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          mediaCategory: 'Futures',
          tip: 'The two arrows on the screenshot point to both wallets. Your total balance = Funding + Unified Trading combined.',
          whatHappensNext: 'Click the transfer icon (⇄) next to Unified Trading, or go to Assets → Transfer to move funds.',
        },
        {
          title: 'Transfer funds to your Unified Trading account',
          description: 'Click <strong>Transfer</strong> in your Assets panel. Set: <strong>From: Funding Account</strong> → <strong>To: Unified Trading</strong>. Select the coin (USDT) and enter the amount. Click <strong>Confirm Transfer</strong> — funds move instantly with no fee.',
          src: '/media/walkthroughs/bybit/bybit-fut-02-3fd1aa1c.webp',
          alt: 'Bybit internal transfer form showing transfer from Funding Account to Unified Trading Account',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          mediaCategory: 'Futures',
          tip: 'Only transfer the amount you plan to trade with. Keeping a buffer in Funding Account is good practice — it can\'t be liquidated.',
          whatHappensNext: 'Funds appear in Unified Trading immediately. Now open the Futures trading interface.',
        },
        {
          title: 'Navigate to the Futures trading section',
          description: 'Click <strong>Trade</strong> in the top navigation bar. A dropdown menu appears — select <strong>Futures</strong> (Trade Perpetual and Futures contracts settled in USDT, USDC or other cryptos). You\'ll land on the USDT Perpetual trading interface.',
          src: '/media/walkthroughs/bybit/bybit-fut-03-fccd4363.webp',
          alt: 'Bybit Trade dropdown menu open with Futures option highlighted and USDT Perpetual pairs visible',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          mediaCategory: 'Futures',
          tip: 'You can also see Spot, Margin Trading, Alpha (on-chain) and Options in this menu. For standard futures, always choose Futures → USDT Perpetual.',
          whatHappensNext: 'The BTCUSDT Perpetual chart opens by default. You can change the pair using the pair selector at the top left.',
        },
        {
          title: 'Select your trading pair',
          description: '① Click the search field and type the pair name — e.g. <strong>BTC</strong>. ② In the results, find <strong>BTCUSDT</strong> under the <strong>Perpetual</strong> section and click it. The chart and order book load instantly. <em>Important: always pick from Perpetual, not from the Spot section below it.</em>',
          src: '/media/walkthroughs/bybit/bybit-fut-04-323c1338.webp',
          alt: 'Bybit futures pair selector with BTC typed in search showing BTCUSDT under Perpetual section',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          mediaCategory: 'Futures',
          tip: 'Stick to major pairs (BTC, ETH, SOL) when starting out — they have the tightest spreads, deepest order books and highest liquidity.',
          whatHappensNext: 'The BTCUSDT Perpetual chart loads. Now set your leverage before placing any order.',
        },
        {
          title: 'Set your leverage',
          description: '① Click the leverage button in the top-right of the Trade panel — it shows <strong>"Isolated 1.00×"</strong> by default. A dropdown appears with preset values: 1×, 3×, <strong>5×</strong>, 10×, 25×, 50×, 100× (BTCUSDT supports up to 125× total, but presets cover the common range). ② Select <strong>5×</strong> — the safe starting point for beginners.',
          src: '/media/walkthroughs/bybit/bybit-fut-05-a09a1a62.webp',
          alt: 'Bybit futures leverage dropdown open with 5x option highlighted in orange',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '3/2',
          mediaCategory: 'Futures',
          warning: '<strong>Leverage multiplies both gains and losses equally.</strong> At 10× a 10% move against you = full liquidation. At 5× you have twice the buffer. Never use 25× or 100× until you fully understand liquidation mechanics.',
          tip: 'After selecting leverage, the <strong>Liq. Price</strong> field in the order panel updates in real time — it shows exactly how far the price can move before your position is force-closed.',
          whatHappensNext: 'Leverage is set. Now enable TP/SL and set your stop-loss before placing the order.',
        },
        {
          title: 'Set your stop-loss before entering',
          description: '① Tick the <strong>TP/SL</strong> checkbox in the order panel — two fields appear: Take Profit and Stop Loss. ② Leave Take Profit empty (optional), fill in <strong>Stop Loss</strong> only. Example: BTC at 73,892 → set SL at <strong>70,838</strong> (≈ −4%). If price drops to that level, your position closes automatically.',
          src: '/media/walkthroughs/bybit/bybit-fut-06-85112c66.webp',
          alt: 'Bybit futures order panel with TP/SL enabled, Stop Loss field set to 70838',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '3/2',
          mediaCategory: 'Futures',
          warning: 'Never skip this step. Without a stop-loss, a sharp price move can close your entire position at a loss before you can react. A stop-loss is your defined exit — set it before pressing Long or Short.',
          tip: 'Take Profit is optional — you can always close manually when you\'re happy with the profit. Stop Loss is not optional.',
          whatHappensNext: 'TP/SL is set. Now fill in your order quantity and place the trade.',
        },
        {
          title: 'Place your order (Long or Short)',
          description: 'Review the order panel one final time: ① order type is <strong>Limit</strong>; ② quantity is set (e.g. <strong>0.001 BTC</strong>); ③ Stop Loss is filled. The <strong>Expected loss</strong> line shows your worst-case result if SL triggers — in this example 2.94 USDT. When ready, click <strong>Long</strong> (price going up) or <strong>Short</strong> (price going down).',
          src: '/media/walkthroughs/bybit/bybit-fut-07-b487f012.webp',
          alt: 'Bybit futures order panel with Limit order, 0.001 BTC quantity, stop loss set, and Long button highlighted',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '3/2',
          mediaCategory: 'Futures',
          tip: '<strong>Limit vs Market:</strong> Limit order fills at your chosen price (or better) — you avoid paying the spread. Market order fills instantly but at whatever price is available. Use Limit when you\'re not in a rush.',
          whatHappensNext: 'A confirmation popup appears with the full order summary. Review it and click Confirm to open the position.',
        },
        {
          title: 'Review and confirm the order',
          description: 'Bybit shows a full order summary before execution. Check: <strong>Order Price</strong> (your entry), <strong>Order Cost</strong> (margin locked — 14.89 USDT here), <strong>Estimated Liq. Price</strong> (59,316 — shown in orange, never let price reach this), <strong>TP/SL Trigger</strong> (70,838 — your stop-loss). If everything looks correct, click <strong>Confirm</strong>.',
          src: '/media/walkthroughs/bybit/bybit-fut-07b-116ee475.webp',
          alt: 'Bybit futures order confirmation popup showing order price, cost, liquidation price, leverage and TP/SL trigger',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '3/2',
          mediaCategory: 'Futures',
          warning: 'The <strong>Estimated Liq. Price</strong> (orange) is not a target — it\'s the price at which Bybit force-closes your position and you lose all margin. Your stop-loss (70,838) must trigger well before the liquidation price (59,316).',
          tip: 'Tick "Do not show confirmation window anymore" only after you are fully comfortable with futures trading. As a beginner, keep this popup on — it\'s your last chance to catch a mistake.',
          whatHappensNext: 'Order is submitted. A Limit order waits in the order book until price reaches your level. Once filled, the position appears in the Positions tab at the bottom of the screen.',
        },
        {
          title: 'Your limit order is waiting to fill',
          description: 'After placing a Limit order, it appears in the <strong>① Open Orders</strong> tab — not in Positions yet. The order sits in the order book waiting for the market to reach your price. ② The order row shows: pair, direction (Buy/Long), your limit price (73,774.90), filled quantity (0.000/0.001 BTC) and your Stop Loss (70,838). On the chart you\'ll see a dashed horizontal line at your order price.',
          src: '/media/walkthroughs/bybit/bybit-fut-08-88033650.webp',
          alt: 'Bybit futures Open Orders tab showing a pending BTCUSDT limit buy order with Chase and Cancel buttons',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          mediaCategory: 'Futures',
          tip: 'If you want to fill the order immediately without waiting, click <strong>Chase</strong> — it updates your limit price to the current best market price. A confirmation popup shows the new price — click Confirm and the order fills within seconds.',
          whatHappensNext: 'Once the price reaches your limit — or immediately if you used Chase — the order disappears from Open Orders and your position appears in the Positions tab.',
        },
        {
          title: 'Monitor your open position',
          description: 'Once the order fills, open the <strong>① Positions</strong> tab. Your position row shows everything you need: Entry Price (73,873.40), Mark Price (live market), <strong>② Liq. Price 59,395</strong> (the price at which Bybit force-closes you — keep it far away), <strong>③ Unrealized P&L</strong> (real-time profit or loss), and your TP/SL trigger. Use the <strong>④ Limit / Market</strong> buttons on the right to close when ready.',
          src: '/media/walkthroughs/bybit/bybit-fut-09-442fd997.webp',
          alt: 'Bybit futures Positions tab with open BTCUSDT long showing entry price, liquidation price, P&L and close buttons',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          mediaCategory: 'Futures',
          tip: 'You can edit your Stop Loss at any time — click the pencil icon next to the TP/SL value in the Positions row. No need to close and re-open the position.',
          whatHappensNext: 'When you\'re ready to exit, click <strong>Market</strong> in the Close By column for an instant close at current price.',
        },
        {
          title: 'Close your position',
          description: 'In the Positions tab, click <strong>③ Market</strong> in the Close By column. The <strong>Market Close</strong> popup appears. It shows: quantity to close (0.001 BTC = 100%), and most importantly — <strong>① expected loss: 0.0577 USDT</strong> including all closing fees. If you\'re happy with the number, click <strong>② Confirm</strong>. The position closes instantly at the current market price.',
          src: '/media/walkthroughs/bybit/bybit-fut-10-b33ebc28.webp',
          alt: 'Bybit futures Market Close popup showing 0.001 BTC close quantity and expected loss of 0.0577 USDT with Confirm button',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '3/2',
          mediaCategory: 'Futures',
          tip: 'If your stop-loss triggers automatically, the position closes on its own — you don\'t need to do anything. The Market Close button is for when you decide to exit manually before SL is hit.',
          whatHappensNext: 'Position is closed. Your Unified Trading balance updates instantly with the result. You can transfer funds back to Funding Account any time via Assets → Transfer.',
        },
        {
          title: 'Trade complete — what you accomplished',
          description: 'The bottom-right panel confirms: <strong>"Your entire order has been filled — Sold 0.001 BTCUSDT contracts at market price."</strong> The <strong>Positions</strong> tab is now empty — <em>No Available Data</em> — the trade is complete. Here is the full breakdown of what this exercise actually cost: <strong>Margin used: 14.89 USDT</strong> — locked during the trade, fully returned to your balance after closing. <strong>Actual P&L: −0.0577 USDT</strong> (~$0.06) — the price barely moved between entry and manual close. <strong>Maximum possible loss (if SL at 70,838 had triggered): 2.94 USDT</strong> — that was your downside limit, and it never fired. Total real cost of this learning exercise: under $0.10. You have just completed a full futures trading cycle on Bybit: funded the account → set 5× leverage → set a stop-loss → placed a limit order → monitored the position → closed it manually. The mechanics are identical whether you trade $15 or $1,500.',
          src: '/media/walkthroughs/bybit/bybit-fut-11-26bb7bac.webp',
          alt: 'Bybit futures interface showing empty Positions tab with No Available Data and Order Submitted Successfully notification confirming 0.001 BTCUSDT sold at market price',
          capturedAt: '2026-05',
          device: 'desktop',
          aspectRatio: '2/1',
          mediaCategory: 'Futures',
          tip: 'Your closed trade appears immediately in <strong>Trade History</strong> (the tab next to Positions). It shows entry price, exit price, P&L, fees and timestamp — a full record of every trade you make.',
          whatHappensNext: 'You are ready to trade futures independently. Everything you learned here applies at any position size — the mechanics are identical whether your trade is $15 or $1,500.',
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
          src: '/screenshots/binance/registration/global-desktop-2026-06.webp',
          capturedAt: '2026-06',
          width: 1280,
          height: 720,
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
          tip: 'Check spam if the email does not arrive. MEXC emails come from noreply [at] mexc.com.',
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
